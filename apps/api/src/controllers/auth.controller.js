import bcrypt from 'bcryptjs';

import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { signJwt, verifyJwt } from '@julio/api/auth/jwt';
import { User } from '@julio/api/models/user';
import { connectRabbitmq, publishJson } from '@julio/api/queue/rabbitmq';
import { renderWelcomeEmail } from '@julio/api/email/templates';
import { logger } from '@julio/api/logger';
import { getAuthTokenFromRequest } from '@julio/api/utils/auth';

function cookieOptions({ maxAge } = {}) {
  const isProd = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge
  };
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Missing email/password' });
    }

    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    if (!env.jwtSecret) throw new Error('Missing JWT_SECRET');

    await connectMongo(env.mongodbUri);

    let user = await User.findOne({ email: String(email).toLowerCase() });

    if (!user && env.nodeEnv !== 'production') {
      const anyUser = await User.countDocuments({});
      if (anyUser === 0) {
        user = await User.create({
          email: String(email).toLowerCase(),
          passwordHash: await bcrypt.hash(String(password), 10),
          role: 'su'
        });
      }
    }

    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const token = signJwt(
      { sub: String(user._id), email: user.email, role: user.role },
      env.jwtSecret
    );

    res.cookie(env.authCookieName, token, cookieOptions({ maxAge: 60 * 60 * 24 * 7 * 1000 }));

    if (env.rabbitmqUrl) {
      await connectRabbitmq(env.rabbitmqUrl);
      await publishJson('emails', {
        type: 'welcome',
        to: user.email,
        template: renderWelcomeEmail({ email: user.email })
      });
    }

    return res.json({
      ok: true,
      token,
      user: { id: String(user._id), email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error('Auth login failed', err);
    return res.status(500).json({ code: 'INTERNAL', message: 'Internal error' });
  }
}

export function logout(req, res) {
  res.cookie(env.authCookieName, '', cookieOptions({ maxAge: 0 }));
  return res.json({ ok: true });
}

export function me(req, res) {
  const token = getAuthTokenFromRequest(req);
  if (!token) return res.json({ ok: true, user: null });

  try {
    if (!env.jwtSecret) {
      return res.status(500).json({ code: 'INTERNAL', message: 'Missing JWT secret' });
    }
    const payload = verifyJwt(token, env.jwtSecret);
    return res.json({ ok: true, user: { email: payload.email, role: payload.role } });
  } catch {
    return res.json({ ok: true, user: null });
  }
}
