import { createStorage } from '@julio/storage';
import { createWebStorage } from '@julio/storage/web';

const THEME_STORAGE_KEY = 'theme-preference';

function normalizeThemePreference(value) {
  return value === 'dark' ? 'dark' : value === 'light' ? 'light' : null;
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return createStorage(createWebStorage());
  } catch {
    return null;
  }
}

export async function loadThemePreference() {
  const storage = getStorage();
  if (!storage) return null;
  const stored = await storage.get(THEME_STORAGE_KEY);
  return normalizeThemePreference(stored);
}

export async function saveThemePreference(next) {
  const storage = getStorage();
  if (!storage) return;
  const normalized = normalizeThemePreference(next);
  if (!normalized) return;
  await storage.set(THEME_STORAGE_KEY, normalized);
}

export function resolveSystemThemePreference() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemePreference(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
