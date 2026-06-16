import { NextResponse } from 'next/server';

import {
  buildLocalePath,
  DEFAULT_LOCALE,
  normalizeLocale,
  stripLocalePrefix,
  SUPPORTED_LOCALES
} from '@julio/shared';
import { LOCALE_COOKIE_NAME } from './src/i18n/constants.js';

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const { locale: pathLocale, pathname: strippedPath } = stripLocalePrefix(pathname);
  const cookieLocale = normalizeLocale(req.cookies.get(LOCALE_COOKIE_NAME)?.value || DEFAULT_LOCALE);

  if (pathLocale) {
    if (pathLocale === DEFAULT_LOCALE) {
      const url = req.nextUrl.clone();
      url.pathname = strippedPath;
      const res = NextResponse.redirect(url);
      res.cookies.set(LOCALE_COOKIE_NAME, pathLocale, { path: '/' });
      return res;
    }
    const headers = new Headers(req.headers);
    headers.set('x-locale', pathLocale);
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(LOCALE_COOKIE_NAME, pathLocale, { path: '/' });
    return res;
  }

  if (SUPPORTED_LOCALES.includes(cookieLocale) && cookieLocale !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = buildLocalePath(pathname, cookieLocale, DEFAULT_LOCALE);
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE_NAME, cookieLocale, { path: '/' });
    return res;
  }

  const headers = new Headers(req.headers);
  headers.set('x-locale', DEFAULT_LOCALE);
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_LOCALE, { path: '/' });
  return res;
}

export const config = {
  matcher: ['/((?!_next|api|robots.txt|sitemap.xml|favicon.ico).*)']
};
