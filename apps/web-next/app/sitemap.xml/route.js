import { DEFAULT_LOCALE, normalizeLocale, nowInZoneDate } from '@julio/shared';
import { getSeoSettings } from '@/src/seo/settings.js';
import { buildLocalePath, resolveRoutePath } from '@/src/seo/metadata.js';
import { getPublicPosts } from '@/src/server/blog.js';

const defaultRoutes = [
  { routeKey: 'home', path: '/' }
];

function toAbsoluteUrl(origin, path) {
  const base = origin.replace(/\/+$/, '');
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${safePath}`;
}

function buildXml(urls) {
  const entries = urls
    .map(
      (url) => `
  <url>
    <loc>${url}</loc>
  </url>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}\n</urlset>`;
}

export async function GET(request) {
  const settings = await getSeoSettings();
  const defaultLocale = normalizeLocale(settings?.defaultLocale || DEFAULT_LOCALE, DEFAULT_LOCALE);
  const hreflangLocales = settings?.hreflangLocales || [defaultLocale];
  const origin = settings?.defaultCanonicalBase || new URL(request.url).origin;
  const routeOverrides = settings?.routeOverrides || [];
  let blogRoutes = [];

  const posts = await getPublicPosts();
  blogRoutes = posts
    .filter((post) => {
      const publishAt = post.publishAt ? new Date(post.publishAt) : null;
      return post.status === 'published' && (!publishAt || publishAt <= nowInZoneDate());
    })
    .map((post) => ({
      routeKey: `blog-${post._id}`,
      path: `/blog/${post.slug}`,
      language: post.language,
      translationKey: post.translationKey
    }));

  const urls = defaultRoutes.map((route) => {
    const override = routeOverrides.find((item) => item.routeKey === route.routeKey);
    const path = resolveRoutePath(override, route.path);
    const localized = buildLocalePath(path, defaultLocale, defaultLocale);
    return toAbsoluteUrl(origin, localized);
  });

  const extraRoutes = routeOverrides
    .filter((override) => override.routeKey && override.indexable)
    .map((override) => resolveRoutePath(override, ''))
    .filter(Boolean)
    .map((path) => toAbsoluteUrl(origin, buildLocalePath(path, defaultLocale, defaultLocale)));

  const blogUrls = blogRoutes.map((route) =>
    toAbsoluteUrl(origin, buildLocalePath(route.path, defaultLocale, defaultLocale))
  );

  const localeVariants = hreflangLocales
    .filter((locale) => locale && locale !== defaultLocale)
    .flatMap((locale) =>
      [...urls, ...extraRoutes, ...blogUrls].map((url) => {
        const basePath = url.replace(origin, '');
        const localizedPath = buildLocalePath(basePath, locale, defaultLocale);
        return toAbsoluteUrl(origin, localizedPath);
      })
    );

  const uniqueUrls = Array.from(new Set([...urls, ...extraRoutes, ...blogUrls, ...localeVariants]));

  return new Response(buildXml(uniqueUrls), {
    status: 200,
    headers: { 'Content-Type': 'application/xml' }
  });
}

