import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { Event } from '@julio/api/models/event';
import { logger } from '@julio/api/logger';
import { coerceDateTime, nowInZoneDate } from '@julio/shared';

import { requireEditor } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeDate(value) {
  if (!value) return null;
  const dateTime = coerceDateTime(value, { zone: 'UTC' });
  return dateTime ? dateTime.toJSDate() : null;
}

function sanitizeStatus(value) {
  const status = sanitizeString(value) || 'draft';
  return ['draft', 'scheduled', 'published'].includes(status) ? status : 'draft';
}

function sanitizeEvent(payload = {}) {
  return {
    title: sanitizeString(payload.title),
    slug: sanitizeString(payload.slug),
    summary: sanitizeString(payload.summary),
    descriptionHtml: sanitizeString(payload.descriptionHtml),
    location: sanitizeString(payload.location),
    startAt: sanitizeDate(payload.startAt),
    endAt: sanitizeDate(payload.endAt),
    timezone: sanitizeString(payload.timezone) || 'UTC',
    status: sanitizeStatus(payload.status),
    publishAt: sanitizeDate(payload.publishAt)
  };
}

function buildPublishedFilter(now = nowInZoneDate()) {
  return {
    status: 'published',
    $or: [{ publishAt: null }, { publishAt: { $lte: now } }]
  };
}

export async function getPublishedEvents() {
  if (!env.mongodbUri) return [];
  await connectMongo(env.mongodbUri);
  const now = nowInZoneDate();
  return Event.find(buildPublishedFilter(now)).sort({ startAt: 1, endAt: 1 }).lean();
}

export async function getPublishedEventBySlug(slug) {
  if (!env.mongodbUri) return null;
  await connectMongo(env.mongodbUri);
  const now = nowInZoneDate();
  return Event.findOne({ slug, ...buildPublishedFilter(now) }).lean();
}

export async function listEvents(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const events = await Event.find({}).sort({ startAt: 1 }).lean();
    return res.json({ ok: true, events });
  } catch (err) {
    logger.error('Events fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createEvent(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeEvent(req.body || {});
    const event = await Event.create(payload);
    return res.json({ ok: true, event });
  } catch (err) {
    logger.error('Event create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getEvent(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' });
    return res.json({ ok: true, event });
  } catch (err) {
    logger.error('Event fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateEvent(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeEvent(req.body || {});
    const event = await Event.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!event) return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' });
    return res.json({ ok: true, event });
  } catch (err) {
    logger.error('Event update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deleteEvent(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Event delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listPublicEvents(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const now = nowInZoneDate();
    const events = await Event.find({
      status: 'published',
      $or: [{ publishAt: null }, { publishAt: { $lte: now } }]
    })
      .sort({ startAt: 1, endAt: 1 })
      .lean();
    return res.json({ ok: true, events });
  } catch (err) {
    logger.error('Public events fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getPublicEvent(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const now = nowInZoneDate();
    const event = await Event.findOne({
      slug: req.params.slug,
      status: 'published',
      $or: [{ publishAt: null }, { publishAt: { $lte: now } }]
    }).lean();
    if (!event) return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' });
    return res.json({ ok: true, event });
  } catch (err) {
    logger.error('Public event fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}
