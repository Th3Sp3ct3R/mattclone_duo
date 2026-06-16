import { buildTimeSlots } from '@julio/booking';
import { coerceDateTime, nowInZoneDate, resolveDateOnlyKey, startOfDay } from '@julio/shared';
import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { BookingAvailability } from '@julio/api/models/booking-availability';
import { BookingService } from '@julio/api/models/booking-service';
import { Booking } from '@julio/api/models/booking';
import { logger } from '@julio/api/logger';

import { sendError } from '@julio/api/utils/response';

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeEmail(value) {
  return sanitizeString(value).toLowerCase();
}

function normalizeMillis(value) {
  if (value instanceof Date) return value.getTime();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSameSlot(slot, startAt, endAt) {
  return normalizeMillis(slot.startAt) === startAt && normalizeMillis(slot.endAt) === endAt;
}

async function resolveService({ serviceId, serviceSlug }) {
  if (serviceId) return BookingService.findById(serviceId).lean();
  if (serviceSlug) return BookingService.findOne({ slug: serviceSlug }).lean();
  return null;
}

export async function listServices(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);

    const slug = sanitizeString(req.query?.slug);
    if (slug) {
      const service = await BookingService.findOne({ slug, active: true }).lean();
      if (!service) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
      }
      return res.json({ ok: true, service });
    }

    const services = await BookingService.find({ active: true }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, services });
  } catch (err) {
    logger.error('Booking services fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getAvailability(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);

    const serviceId = sanitizeString(req.query?.serviceId);
    const serviceSlug = sanitizeString(req.query?.serviceSlug);
    const date = sanitizeString(req.query?.date);

    if (!serviceId && !serviceSlug) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Service is required' });
    }

    const service = serviceId
      ? await BookingService.findById(serviceId).lean()
      : await BookingService.findOne({ slug: serviceSlug }).lean();

    if (!service || !service.active) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const timezone = service.timezone || 'UTC';
    const rangeStart = startOfDay(date || nowInZoneDate({ zone: timezone }), { zone: timezone });
    const rangeEnd = rangeStart;

    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid date range' });
    }

    const availability =
      (await BookingAvailability.findOne({ serviceId: service._id }).lean()) || {};
    const blackoutDateKeys = Array.isArray(availability.blackoutDates)
      ? availability.blackoutDates
          .map((entry) => resolveDateOnlyKey(entry, { zone: timezone }))
          .filter(Boolean)
      : [];

    const existingBookings = await Booking.find({
      serviceId: service._id,
      status: { $ne: 'cancelled' },
      startAt: {
        $gte: rangeStart.toJSDate(),
        $lte: rangeEnd.endOf('day').toJSDate()
      }
    }).lean();

    const slots = buildTimeSlots({
      startDate: rangeStart,
      endDate: rangeEnd,
      timezone,
      durationMinutes: service.durationMinutes,
      stepMinutes: service.stepMinutes,
      bufferMinutes: service.bufferMinutes,
      minimumNoticeMinutes: service.minimumNoticeMinutes,
      weeklyRules: availability.weeklyRules || [],
      dateOverrides: availability.dateOverrides || [],
      blackoutDates: blackoutDateKeys,
      existingBookings
    });

    return res.json({ ok: true, timezone, date: rangeStart.toISODate(), slots });
  } catch (err) {
    logger.error('Booking availability fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createBooking(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);

    const serviceId = sanitizeString(req.body?.serviceId);
    const serviceSlug = sanitizeString(req.body?.serviceSlug);
    const customerName = sanitizeString(req.body?.customerName);
    const customerEmail = sanitizeEmail(req.body?.customerEmail);
    const notes = sanitizeString(req.body?.notes);
    const startAtInput = req.body?.startAt;
    const endAtInput = req.body?.endAt;

    if (!serviceId && !serviceSlug) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Service is required' });
    }

    const service = await resolveService({ serviceId, serviceSlug });
    if (!service || !service.active) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const timezone = service.timezone || 'UTC';
    const startAt = coerceDateTime(startAtInput, { zone: timezone });
    const endAt = coerceDateTime(endAtInput, { zone: timezone });

    if (!startAt || !endAt || endAt <= startAt) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid time slot' });
    }

    const availability =
      (await BookingAvailability.findOne({ serviceId: service._id }).lean()) || {};
    const blackoutDateKeys = Array.isArray(availability.blackoutDates)
      ? availability.blackoutDates
          .map((entry) => resolveDateOnlyKey(entry, { zone: timezone }))
          .filter(Boolean)
      : [];

    const rangeStart = startOfDay(startAt, { zone: timezone });
    const rangeEnd = startOfDay(endAt, { zone: timezone });

    const existingBookings = await Booking.find({
      serviceId: service._id,
      status: { $ne: 'cancelled' },
      startAt: {
        $gte: rangeStart.toJSDate(),
        $lte: rangeEnd.endOf('day').toJSDate()
      }
    }).lean();

    const slots = buildTimeSlots({
      startDate: rangeStart,
      endDate: rangeEnd,
      timezone,
      durationMinutes: service.durationMinutes,
      stepMinutes: service.stepMinutes,
      bufferMinutes: service.bufferMinutes,
      minimumNoticeMinutes: service.minimumNoticeMinutes,
      weeklyRules: availability.weeklyRules || [],
      dateOverrides: availability.dateOverrides || [],
      blackoutDates: blackoutDateKeys,
      existingBookings
    });

    const requestedStartMs = startAt.toMillis();
    const requestedEndMs = endAt.toMillis();
    const matchingSlot = slots.find((slot) => isSameSlot(slot, requestedStartMs, requestedEndMs));

    if (!matchingSlot) {
      return res
        .status(409)
        .json({ code: 'SLOT_UNAVAILABLE', message: 'Selected slot is no longer available' });
    }

    const booking = await Booking.create({
      serviceId: service._id,
      serviceName: service.name,
      timezone,
      startAt: matchingSlot.startAt,
      endAt: matchingSlot.endAt,
      customerName,
      customerEmail,
      notes,
      priceCents: service.priceCents,
      currency: service.currency,
      requiresPayment: service.requiresPayment,
      status: service.requiresPayment ? 'pending' : 'confirmed',
      source: 'public'
    });

    return res.json({ ok: true, booking });
  } catch (err) {
    logger.error('Booking create failed', err);
    return sendError(res, err, 'Internal error');
  }
}
