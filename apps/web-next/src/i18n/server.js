import { cookies, headers } from 'next/headers';

import { DEFAULT_LOCALE, normalizeLocale } from '@julio/shared';

import en from './en.js';
import es from './es.js';
import de from './de.js';
import fr from './fr.js';
import it from './it.js';
import pt from './pt.js';
import he from './he.js';
import { LOCALE_COOKIE_NAME } from './constants.js';

const dictionaries = { en, es, de, fr, it, pt, he };

export async function getRequestLocale() {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get('x-locale');
  if (headerLocale) {
    return normalizeLocale(headerLocale, DEFAULT_LOCALE);
  }
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE_NAME)?.value || DEFAULT_LOCALE;
  return normalizeLocale(raw, DEFAULT_LOCALE);
}

export async function getDictionary(locale) {
  const normalized = normalizeLocale(locale, DEFAULT_LOCALE);
  return dictionaries[normalized] || dictionaries.en;
}
