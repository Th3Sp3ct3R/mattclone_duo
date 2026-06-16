'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  buildLocalePath,
  DEFAULT_LOCALE,
  normalizeLocale,
  stripLocalePrefix,
  SUPPORTED_LOCALES
} from '@julio/shared';
import { LocaleSelect } from '@julio/ui';

import { LOCALE_COOKIE_NAME, LOCALE_FLAG_ASSETS } from './constants.js';
import { getLocaleFromDocument, setClientLocale } from './index.js';

function getLocaleFromCookie() {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((entry) => entry.trim());
  const prefix = `${LOCALE_COOKIE_NAME}=`;
  const match = parts.find((entry) => entry.startsWith(prefix));
  if (!match) return null;
  return match.slice(prefix.length);
}

function buildLocaleOptions() {
  return SUPPORTED_LOCALES.map((locale) => {
    const flagAsset = LOCALE_FLAG_ASSETS[locale] || locale;
    return { value: locale, label: locale.toUpperCase(), flag: flagAsset };
  });
}

export function LocaleSwitcher({ className = '' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { pathname: strippedPath, locale: pathLocale } = useMemo(
    () => stripLocalePrefix(pathname || '/'),
    [pathname]
  );

  const currentLocale = normalizeLocale(
    pathLocale || getLocaleFromCookie() || getLocaleFromDocument(),
    DEFAULT_LOCALE
  );
  const options = useMemo(() => buildLocaleOptions(), []);

  function handleChange(nextLocale) {
    const normalizedLocale = normalizeLocale(nextLocale, DEFAULT_LOCALE);
    const nextPath = buildLocalePath(strippedPath, normalizedLocale, DEFAULT_LOCALE);
    const query = searchParams?.toString();
    const url = query ? `${nextPath}?${query}` : nextPath;
    const currentQuery = searchParams?.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname || '/';

    document.cookie = `${LOCALE_COOKIE_NAME}=${normalizedLocale}; path=/`;
    setClientLocale(normalizedLocale);

    if (url === currentUrl) {
      router.refresh();
      return;
    }

    router.push(url);
  }

  return (
    <LocaleSelect
      className={className}
      value={currentLocale}
      options={options}
      ariaLabel={`Language ${currentLocale.toUpperCase()}`}
      onChange={handleChange}
    />
  );
}
