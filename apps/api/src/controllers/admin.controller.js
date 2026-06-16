import { graphql, buildSchema } from 'graphql';

import { coerceDateTime, formatDate, nowInZone, nowInZoneDate } from '@julio/shared';
import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { BookingAvailability } from '@julio/api/models/booking-availability';
import { BookingService } from '@julio/api/models/booking-service';
import { Booking } from '@julio/api/models/booking';
import { User } from '@julio/api/models/user';
import { Post } from '@julio/api/models/post';
import { Author } from '@julio/api/models/author';
import { Category } from '@julio/api/models/category';
import { SeoSettings } from '@julio/api/models/seo';
import { logger } from '@julio/api/logger';

import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

const schema = buildSchema(`
  type DashboardCounts {
    totalBookings: Int!
    upcomingBookings: Int!
    totalUsers: Int!
    totalServices: Int!
    paymentRequiredServices: Int!
    totalPosts: Int!
    totalAuthors: Int!
    totalCategories: Int!
  }

  type DashboardSeo {
    defaultLocale: String!
    updatedAt: String
  }

  type TimeSeriesPoint {
    label: String!
    value: Int!
  }

  type DashboardSeries {
    bookingsLast7Days: [TimeSeriesPoint!]!
    usersLast30Days: [TimeSeriesPoint!]!
  }

  type DashboardSummary {
    meEmail: String!
    counts: DashboardCounts!
    seo: DashboardSeo!
    series: DashboardSeries!
  }

  type Query {
    dashboardSummary: DashboardSummary!
  }
`);

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeWeeklyRules(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((rule) => ({
      dayOfWeek: sanitizeNumber(rule.dayOfWeek, -1),
      startMinutes: sanitizeNumber(rule.startMinutes, 0),
      endMinutes: sanitizeNumber(rule.endMinutes, 0)
    }))
    .filter((rule) => rule.dayOfWeek >= 0 && rule.dayOfWeek <= 6 && rule.endMinutes > rule.startMinutes);
}

function sanitizeWindows(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((window) => ({
      startMinutes: sanitizeNumber(window.startMinutes, 0),
      endMinutes: sanitizeNumber(window.endMinutes, 0)
    }))
    .filter((window) => window.endMinutes > window.startMinutes);
}

function sanitizeDateOverrides(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const date = coerceDateTime(entry.date);
      return {
        date: date ? date.toJSDate() : null,
        isClosed: sanitizeBoolean(entry.isClosed, false),
        windows: sanitizeWindows(entry.windows || [])
      };
    })
    .filter((entry) => entry.date);
}

function sanitizeBlackoutDates(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const date = coerceDateTime(entry);
      return date ? date.toJSDate() : null;
    })
    .filter(Boolean);
}

function sanitizeService(payload = {}) {
  return {
    name: sanitizeString(payload.name),
    slug: sanitizeString(payload.slug),
    description: sanitizeString(payload.description),
    active: sanitizeBoolean(payload.active, true),
    timezone: sanitizeString(payload.timezone) || 'UTC',
    durationMinutes: sanitizeNumber(payload.durationMinutes, 30),
    stepMinutes: sanitizeNumber(payload.stepMinutes, 30),
    bufferMinutes: sanitizeNumber(payload.bufferMinutes, 0),
    minimumNoticeMinutes: sanitizeNumber(payload.minimumNoticeMinutes, 0),
    bookingWindowDays: sanitizeNumber(payload.bookingWindowDays, 60),
    priceCents: sanitizeNumber(payload.priceCents, 0),
    currency: sanitizeString(payload.currency) || 'USD',
    requiresPayment: sanitizeBoolean(payload.requiresPayment, false)
  };
}

function buildBuckets(days, now = nowInZone({ zone: 'UTC' })) {
  const base = coerceDateTime(now, { zone: 'UTC' }) || nowInZone({ zone: 'UTC' });
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = base.minus({ days: i }).startOf('day');
    buckets.push(date);
  }
  return buckets;
}

function formatBucketLabel(date) {
  return formatDate(date, { zone: 'UTC', format: 'MM/dd' });
}

function buildSeries(items, dateSelector, days) {
  const buckets = buildBuckets(days);
  const counts = new Map(buckets.map((bucket) => [bucket.toMillis(), 0]));

  items.forEach((item) => {
    const raw = dateSelector(item);
    if (!raw) return;
    const date = coerceDateTime(raw, { zone: 'UTC' })?.startOf('day');
    if (!date) return;
    const key = date.toMillis();
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });

  return buckets.map((bucket) => ({
    label: formatBucketLabel(bucket),
    value: counts.get(bucket.toMillis()) || 0
  }));
}

async function loadSummary(user) {
  if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
  await connectMongo(env.mongodbUri);

  const now = nowInZoneDate({ zone: 'UTC' });

  const [
    totalBookings,
    upcomingBookings,
    totalUsers,
    totalServices,
    paymentRequiredServices,
    totalPosts,
    totalAuthors,
    totalCategories,
    bookings,
    users,
    seo
  ] = await Promise.all([
    Booking.countDocuments({}),
    Booking.countDocuments({ startAt: { $gte: now } }),
    User.countDocuments({}),
    BookingService.countDocuments({}),
    BookingService.countDocuments({ requiresPayment: true }),
    Post.countDocuments({}),
    Author.countDocuments({}),
    Category.countDocuments({}),
    Booking.find({}).select('createdAt startAt').lean(),
    User.find({}).select('createdAt').lean(),
    SeoSettings.findOne({}).lean()
  ]);

  const counts = {
    totalBookings,
    upcomingBookings,
    totalUsers,
    totalServices,
    paymentRequiredServices,
    totalPosts,
    totalAuthors,
    totalCategories
  };

  const series = {
    bookingsLast7Days: buildSeries(
      bookings,
      (booking) => booking?.createdAt || booking?.startAt,
      7
    ),
    usersLast30Days: buildSeries(users, (entry) => entry?.createdAt, 30)
  };

  return {
    meEmail: user?.email || '',
    counts,
    seo: {
      defaultLocale: seo?.defaultLocale || 'en',
      updatedAt: seo?.updatedAt ? coerceDateTime(seo.updatedAt, { zone: 'UTC' })?.toISO() : null
    },
    series
  };
}

export async function listBookingServices(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const services = await BookingService.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, services });
  } catch (err) {
    logger.error('Booking services fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createBookingService(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeService(req.body || {});
    if (!payload.name || !payload.slug) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Name and slug are required' });
    }
    const existing = await BookingService.findOne({ slug: payload.slug });
    if (existing) {
      return res.status(409).json({ code: 'CONFLICT', message: 'Service slug already exists' });
    }
    const service = await BookingService.create(payload);
    return res.json({ ok: true, service });
  } catch (err) {
    logger.error('Booking service create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getBookingService(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const service = await BookingService.findById(req.params.id).lean();
    if (!service) return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    return res.json({ ok: true, service });
  } catch (err) {
    logger.error('Booking service fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateBookingService(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeService(req.body || {});
    if (!payload.name || !payload.slug) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Name and slug are required' });
    }
    const existingSlug = await BookingService.findOne({ slug: payload.slug, _id: { $ne: req.params.id } });
    if (existingSlug) {
      return res.status(409).json({ code: 'CONFLICT', message: 'Service slug already exists' });
    }
    const service = await BookingService.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!service) return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    return res.json({ ok: true, service });
  } catch (err) {
    logger.error('Booking service update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deleteBookingService(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const service = await BookingService.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Booking service delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getBookingAvailability(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const serviceId = sanitizeString(req.query?.serviceId);
    if (!serviceId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Service is required' });
    }
    const service = await BookingService.findById(serviceId).lean();
    if (!service) return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    const availability = await BookingAvailability.findOne({ serviceId: service._id }).lean();
    return res.json({ ok: true, availability: availability || null });
  } catch (err) {
    logger.error('Booking availability fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateBookingAvailability(req, res) {
  try {
    const user = requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const serviceId = sanitizeString(req.body?.serviceId);
    if (!serviceId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Service is required' });
    }
    const service = await BookingService.findById(serviceId).lean();
    if (!service) return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    const payload = {
      serviceId: service._id,
      timezone: sanitizeString(req.body?.timezone) || service.timezone || 'UTC',
      weeklyRules: sanitizeWeeklyRules(req.body?.weeklyRules || []),
      dateOverrides: sanitizeDateOverrides(req.body?.dateOverrides || []),
      blackoutDates: sanitizeBlackoutDates(req.body?.blackoutDates || []),
      updatedBy: user?.email || ''
    };
    const availability = await BookingAvailability.findOneAndUpdate(
      { serviceId: service._id },
      payload,
      { new: true, upsert: true }
    );
    return res.json({ ok: true, availability });
  } catch (err) {
    logger.error('Booking availability update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listBookings(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const status = sanitizeString(req.query?.status);
    const serviceId = sanitizeString(req.query?.serviceId);
    const query = {};
    if (status) query.status = status;
    if (serviceId) query.serviceId = serviceId;
    const bookings = await Booking.find(query).sort({ startAt: -1 }).lean();
    return res.json({ ok: true, bookings });
  } catch (err) {
    logger.error('Bookings fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getBooking(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ code: 'NOT_FOUND', message: 'Booking not found' });
    return res.json({ ok: true, booking });
  } catch (err) {
    logger.error('Booking fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateBooking(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const status = sanitizeString(req.body?.status);
    const notes = sanitizeString(req.body?.notes);
    const payload = {};
    if (status) payload.status = status;
    if (notes) payload.notes = notes;
    const booking = await Booking.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!booking) return res.status(404).json({ code: 'NOT_FOUND', message: 'Booking not found' });
    return res.json({ ok: true, booking });
  } catch (err) {
    logger.error('Booking update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deleteBooking(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ code: 'NOT_FOUND', message: 'Booking not found' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Booking delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getDashboardSummary(req, res) {
  try {
    const user = requireAdmin(req);
    const query = req.body?.query || '';
    const variables = req.body?.variables || {};
    if (!query) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Query is required' });
    }
    const rootValue = { dashboardSummary: () => loadSummary(user) };
    const result = await graphql({ schema, source: query, variableValues: variables, rootValue });
    if (result?.errors?.length) {
      const message = result.errors.map((error) => error.message).join('; ');
      return res.status(500).json({ code: 'DASHBOARD_QUERY_FAILED', message });
    }
    return res.json({ ok: true, data: result.data });
  } catch (err) {
    logger.error('Dashboard GraphQL failed', err);
    return sendError(res, err, err?.message || 'Dashboard query failed');
  }
}
