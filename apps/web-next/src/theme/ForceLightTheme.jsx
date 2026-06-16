'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { stripLocalePrefix } from '@julio/shared';
import { applyThemePreference } from '@julio/ui';

const PROTECTED_PREFIXES = ['/admin', '/dashboard', '/seo'];

function isProtectedPath(pathname) {
  const { pathname: stripped } = stripLocalePrefix(pathname || '/');
  return PROTECTED_PREFIXES.some((prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`));
}

export function ForceLightTheme() {
  const pathname = usePathname();

  useEffect(() => {
    if (isProtectedPath(pathname)) return;
    applyThemePreference('light');
  }, [pathname]);

  return null;
}
