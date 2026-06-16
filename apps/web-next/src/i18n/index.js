'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import { DEFAULT_LOCALE, normalizeLocale, stripLocalePrefix } from '@julio/shared';

import { LOCALE_COOKIE_NAME } from './constants.js';

import en from './en.js';
import es from './es.js';
import de from './de.js';
import fr from './fr.js';
import it from './it.js';
import pt from './pt.js';
import he from './he.js';

const dictionaries = { en, es, de, fr, it, pt, he };
const localeListeners = new Set();
let clientLocale = null;

function notifyLocaleListeners() {
  localeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors to keep notifications flowing
    }
  });
}

export function getClientLocale() {
  return clientLocale;
}

export function setClientLocale(locale) {
  clientLocale = normalizeLocale(locale, DEFAULT_LOCALE);
  notifyLocaleListeners();
}

function subscribeLocale(listener) {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}

export function getDictionary(locale) {
  const normalized = normalizeLocale(locale, DEFAULT_LOCALE);
  return dictionaries[normalized] || dictionaries.en;
}

export function getLocaleFromDocument() {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  return normalizeLocale(document.documentElement.lang || DEFAULT_LOCALE, DEFAULT_LOCALE);
}

function getLocaleFromCookie() {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((entry) => entry.trim());
  const prefix = `${LOCALE_COOKIE_NAME}=`;
  const match = parts.find((entry) => entry.startsWith(prefix));
  if (!match) return null;
  return match.slice(prefix.length);
}

export function useDictionary() {
  const pathname = usePathname();
  const storeLocale = useSyncExternalStore(subscribeLocale, getClientLocale, getClientLocale);
  const [locale, setLocale] = useState(getLocaleFromDocument());

  useEffect(() => {
    const pathLocale = stripLocalePrefix(pathname || '/').locale;
    const cookieLocale = getLocaleFromCookie();
    const nextLocale = normalizeLocale(
      pathLocale || cookieLocale || storeLocale || getLocaleFromDocument(),
      DEFAULT_LOCALE
    );
    setClientLocale(nextLocale);
    setLocale(nextLocale);
  }, [pathname, storeLocale]);

  useEffect(() => {
    const nextLocale = normalizeLocale(storeLocale || getLocaleFromDocument(), DEFAULT_LOCALE);
    setLocale(nextLocale);
  }, []);

  return useMemo(() => getDictionary(locale), [locale]);
}
