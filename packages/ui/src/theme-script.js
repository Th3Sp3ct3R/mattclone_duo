export function buildThemeBootstrapScript({ storageKey = 'theme-preference' } = {}) {
  return `
(() => {
  try {
    const stored = localStorage.getItem('${storageKey}');
    let normalized = stored;
    if (stored && stored.startsWith('"')) {
      try {
        normalized = JSON.parse(stored);
      } catch {}
    }
    const pathname = window.location && window.location.pathname ? window.location.pathname : '/';
    const localeMatch = pathname.match(/^\\/([a-zA-Z-]+)(\\/|$)/);
    const stripped = localeMatch ? pathname.replace(/^\\/[a-zA-Z-]+/, '') || '/' : pathname;
    const protectedPrefixes = ['/admin', '/dashboard', '/seo'];
    const isProtected = protectedPrefixes.some((prefix) =>
      stripped === prefix || stripped.startsWith(prefix + '/')
    );
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = !isProtected
      ? 'light'
      : (normalized === 'light' || normalized === 'dark'
          ? normalized
          : (prefersDark ? 'dark' : 'light'));
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
`.trim();
}
