'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { applyThemePreference, loadThemePreference, resolveSystemThemePreference } from '@julio/ui';

export function ApplyStoredTheme() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    async function applyTheme() {
      const stored = await loadThemePreference();
      const preferred = stored || resolveSystemThemePreference();
      if (!active) return;
      applyThemePreference(preferred);
    }
    applyTheme();
    return () => {
      active = false;
    };
  }, [pathname]);

  return null;
}
