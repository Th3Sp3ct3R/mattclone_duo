import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { ContactInquiry } from '@julio/api/models/contact-inquiry';
import { logger } from '@julio/api/logger';

import { requireEditor } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeStatus(value) {
  const status = sanitizeString(value) || 'new';
  return ['new', 'read', 'replied', 'archived'].includes(status) ? status : 'new';
}

function sanitizeInquiry(payload = {}) {
  return {
    name: sanitizeString(payload.name),
    email: sanitizeString(payload.email),
    subject: sanitizeString(payload.subject),
    message: sanitizeString(payload.message),
    status: sanitizeStatus(payload.status),
    internalNotes: sanitizeString(payload.internalNotes)
  };
}

export async function listInquiries(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const inquiries = await ContactInquiry.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, inquiries });
  } catch (err) {
    logger.error('Contact inquiries fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createInquiry(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeInquiry(req.body || {});
    const inquiry = await ContactInquiry.create(payload);
    return res.json({ ok: true, inquiry });
  } catch (err) {
    logger.error('Contact inquiry create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getInquiry(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const inquiry = await ContactInquiry.findById(req.params.id).lean();
    if (!inquiry) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Inquiry not found' });
    }
    return res.json({ ok: true, inquiry });
  } catch (err) {
    logger.error('Contact inquiry fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateInquiry(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeInquiry(req.body || {});
    const inquiry = await ContactInquiry.findByIdAndUpdate(req.params.id, payload, {
      new: true
    }).lean();
    if (!inquiry) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Inquiry not found' });
    }
    return res.json({ ok: true, inquiry });
  } catch (err) {
    logger.error('Contact inquiry update failed', err);
    return sendError(res, err, 'Internal error');
  }
}
