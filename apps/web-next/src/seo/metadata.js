import { getSeoSettings } from './settings.js';

function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  if (!b) return path || '';
  return `${b}/${p}`;
}

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getRouteSeoSettings(routeKey) {
  const settings = await getSeoSettings();
  if (!settings) return { settings: null, override: null };
  const override = settings.routeOverrides?.find((entry) => entry.routeKey === routeKey) || null;
  return { settings, override };
}

function normalizeTitle(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Zero Start';
  if (raw.toLowerCase() === 'julio') return 'Zero Start';
  return raw;
}

export function buildRouteMetadata({
  settings,
  override,
  path,
  defaultIndexable = true,
  locale
}) {
  if (!settings) return {};

  const defaultLocale = settings.defaultLocale || 'en';
  const resolvedLocale = locale || defaultLocale;
  const title = normalizeTitle(
    override?.title || settings.defaultTitle || settings.siteName || 'Zero Start'
  );
  const description = override?.description || settings.defaultDescription || '';
  const ogTitle = override?.ogTitle || title;
  const ogDescription = override?.ogDescription || description;
  const localizedPath = path ? buildLocalePath(path, resolvedLocale, defaultLocale) : '';
  const canonical =
    override?.canonicalUrl ||
    (settings.defaultCanonicalBase && localizedPath
      ? joinUrl(settings.defaultCanonicalBase, localizedPath)
      : '') ||
    settings.defaultCanonicalBase ||
    '';
  const ogImage = override?.ogImageUrl || settings.defaultOgImageUrl || '';
  const twitterImage = override?.twitterImageUrl || settings.defaultTwitterImageUrl || '';
  const indexable = override?.indexable ?? defaultIndexable;
  const hreflangAlternates = buildHreflangAlternates({
    defaultLocale,
    hreflang: override?.hreflang || [],
    path,
    canonicalBase: settings.defaultCanonicalBase
  });

  return {
    title,
    description,
    alternates: canonical
      ? { canonical, languages: hreflangAlternates || undefined }
      : hreflangAlternates
        ? { languages: hreflangAlternates }
        : undefined,
    openGraph: ogImage
      ? {
          title: ogTitle,
          description: ogDescription,
          images: [{ url: ogImage }]
        }
      : undefined,
    twitter: twitterImage
      ? {
          card: 'summary_large_image',
          title: ogTitle,
          description: ogDescription,
          images: [twitterImage]
        }
      : undefined,
    robots: { index: indexable, follow: indexable }
  };
}

export function buildJsonLdBlocks(settings, override) {
  const blocks = [];
  const globalJson = safeJsonParse(settings?.structuredDataJson);
  if (globalJson) blocks.push(globalJson);
  const routeJson = safeJsonParse(override?.structuredDataJson);
  if (routeJson) blocks.push(routeJson);
  return blocks;
}

export function resolveRoutePath(override, fallback) {
  const routePath = override?.routePath || '';
  if (routePath) return routePath.startsWith('/') ? routePath : `/${routePath}`;
  return fallback || '';
}

export function buildLocalePath(path, locale, defaultLocale) {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  if (!locale || locale === defaultLocale) return safePath;
  if (safePath === '/') return `/${locale}`;
  return `/${locale}${safePath}`;
}

export function buildHreflangAlternates({ defaultLocale, hreflang, path, canonicalBase }) {
  if (!Array.isArray(hreflang) || hreflang.length === 0) return null;
  const base = canonicalBase || '';
  return hreflang.reduce((acc, item) => {
    if (!item?.locale) return acc;
    const resolvedPath = buildLocalePath(path, item.locale, defaultLocale);
    const resolvedUrl = item.url || joinUrl(base, resolvedPath);
    acc[item.locale] = resolvedUrl;
    return acc;
  }, {});
}

