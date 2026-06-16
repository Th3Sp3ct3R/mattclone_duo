import bcrypt from 'bcryptjs';

import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { User } from '@julio/api/models/user';
import { logger } from '@julio/api/logger';

import { requireDon, requireUser } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

const ROLES = ['su', 'admin', 'contributor', 'user'];

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeRole(value) {
  const raw = sanitizeString(value);
  return ROLES.includes(raw) ? raw : null;
}

function hasOwnField(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

export async function listUsers(req, res) {
  try {
    requireDon(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, users });
  } catch (err) {
    logger.error('Users fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createUser(req, res) {
  try {
    requireDon(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const name = sanitizeString(req.body?.name);
    const email = sanitizeString(req.body?.email).toLowerCase();
    const password = sanitizeString(req.body?.password);
    const role = sanitizeRole(req.body?.role) || 'user';
    const avatarUrl = sanitizeString(req.body?.avatarUrl);

    if (!email || !password) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ code: 'CONFLICT', message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role, avatarUrl });
    return res.json({
      ok: true,
      user: { id: String(user._id), email: user.email, role: user.role, createdAt: user.createdAt }
    });
  } catch (err) {
    logger.error('User create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getMe(req, res) {
  try {
    const payload = requireUser(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const user = await User.findById(payload.sub).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    return res.json({ ok: true, user });
  } catch (err) {
    logger.error('User self fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateMe(req, res) {
  try {
    const payload = requireUser(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const name = sanitizeString(req.body?.name);
    const email = sanitizeString(req.body?.email).toLowerCase();
    const currentPassword = sanitizeString(req.body?.currentPassword);
    const newPassword = sanitizeString(req.body?.newPassword);
    const avatarUrl = sanitizeString(req.body?.avatarUrl);

    const update = {};
    if (name) update.name = name;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: payload.sub } });
      if (existing) {
        return res.status(409).json({ code: 'CONFLICT', message: 'Email already exists' });
      }
      update.email = email;
    }
    if (hasOwnField(req.body, 'avatarUrl')) {
      update.avatarUrl = avatarUrl;
    }

    if (newPassword) {
      const user = await User.findById(payload.sub);
      if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return res
          .status(401)
          .json({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
      }
      update.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await User.findByIdAndUpdate(payload.sub, update, { new: true }).select(
      '-passwordHash'
    );
    return res.json({ ok: true, user: updated });
  } catch (err) {
    logger.error('User self update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getUser(req, res) {
  try {
    requireDon(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const user = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    return res.json({ ok: true, user });
  } catch (err) {
    logger.error('User fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateUser(req, res) {
  try {
    const actor = requireDon(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const name = sanitizeString(req.body?.name);
    const email = sanitizeString(req.body?.email).toLowerCase();
    const role = sanitizeRole(req.body?.role);
    const password = sanitizeString(req.body?.password);
    const avatarUrl = sanitizeString(req.body?.avatarUrl);

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (hasOwnField(req.body, 'avatarUrl')) update.avatarUrl = avatarUrl;
    if (role) update.role = role;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);

    if (String(actor?.sub) === String(req.params.id) && role && role !== 'su') {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: 'Cannot downgrade your own role' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select(
      '-passwordHash'
    );
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    return res.json({ ok: true, user });
  } catch (err) {
    logger.error('User update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deleteUser(req, res) {
  try {
    const actor = requireDon(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);

    if (String(actor?.sub) === String(req.params.id)) {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    return res.json({ ok: true, user });
  } catch (err) {
    logger.error('User delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}
