import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { SeoSettings } from '@julio/api/models/seo';
import { logger } from '@julio/api/logger';
import { SUPPORTED_LOCALES } from '@julio/shared';

import { requireAdmin } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

const ALLOWED_LOCALES = SUPPORTED_LOCALES;

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeUrl(value) {
  const raw = sanitizeString(value);
  if (!raw) return '';
  return raw;
}

function sanitizePath(value) {
  const raw = sanitizeString(value);
  if (!raw) return '';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function sanitizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function sanitizeRouteOverrides(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => ({
      routeKey: sanitizeString(entry.routeKey),
      routePath: sanitizePath(entry.routePath),
      title: sanitizeString(entry.title),
      description: sanitizeString(entry.description),
      canonicalUrl: sanitizeUrl(entry.canonicalUrl),
      ogImageUrl: sanitizeUrl(entry.ogImageUrl),
      twitterImageUrl: sanitizeUrl(entry.twitterImageUrl),
      indexable: sanitizeBoolean(entry.indexable, true),
      structuredDataJson: sanitizeString(entry.structuredDataJson),
      hreflang: Array.isArray(entry.hreflang)
        ? entry.hreflang
            .map((item) => ({
              locale: sanitizeString(item.locale),
              url: sanitizeUrl(item.url)
            }))
            .filter((item) => ALLOWED_LOCALES.includes(item.locale) && item.url)
        : []
    }))
    .filter((entry) => entry.routeKey);
}

function sanitizeSettings(input, userEmail) {
  const hreflangLocales = Array.isArray(input.hreflangLocales)
    ? input.hreflangLocales.filter((entry) => ALLOWED_LOCALES.includes(entry))
    : ALLOWED_LOCALES;
  const defaultLocale = ALLOWED_LOCALES.includes(input.defaultLocale) ? input.defaultLocale : 'en';

  return {
    siteName: sanitizeString(input.siteName),
    defaultTitle: sanitizeString(input.defaultTitle),
    defaultDescription: sanitizeString(input.defaultDescription),
    defaultOgImageUrl: sanitizeUrl(input.defaultOgImageUrl),
    defaultTwitterImageUrl: sanitizeUrl(input.defaultTwitterImageUrl),
    defaultCanonicalBase: sanitizeUrl(input.defaultCanonicalBase),
    robotsTxt: sanitizeString(input.robotsTxt),
    structuredDataJson: sanitizeString(input.structuredDataJson),
    defaultLocale,
    hreflangLocales,
    routeOverrides: sanitizeRouteOverrides(input.routeOverrides || []),
    updatedBy: userEmail || ''
  };
}

async function loadSettings() {
  const existing = await SeoSettings.findOne({});
  if (existing) return existing;
  return SeoSettings.create({});
}

export async function getPublicSettings(req, res) {
  try {
    if (!env.mongodbUri) {
      return res.json({ ok: true, settings: null });
    }
    await connectMongo(env.mongodbUri);
    const settings = await loadSettings();
    return res.json({ ok: true, settings });
  } catch (err) {
    logger.error('Public SEO settings fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getSettings(req, res) {
  try {
    requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const settings = await loadSettings();
    return res.json({ ok: true, settings });
  } catch (err) {
    logger.error('SEO settings fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateSettings(req, res) {
  try {
    const user = requireAdmin(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizeSettings(req.body || {}, user?.email);
    const updated = await SeoSettings.findOneAndUpdate({}, payload, { new: true, upsert: true });
    return res.json({ ok: true, settings: updated });
  } catch (err) {
    logger.error('SEO settings update failed', err);
    return sendError(res, err, 'Internal error');
  }
}
