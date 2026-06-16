import Link from 'next/link';

import { buildLocalePath } from '@julio/shared';
import { AppHeader, ScrollRevealHeader } from '@julio/ui';
import { LocaleSwitcher } from '@/src/i18n/LocaleSwitcher.jsx';
import { getRequestLocale } from '@/src/i18n/server.js';

export default async function PublicLayout({ children }) {
  const locale = await getRequestLocale();
  return (
    <div>
      <ScrollRevealHeader className="AppShellHeader" threshold={-1}>
        <div className="container AppShellHeaderInner">
          <AppHeader
            brand={
              <Link
                href={buildLocalePath('/', locale)}
                className="c-AppHeaderBrand AppHeaderBrandLogo"
                role="banner"
              >
                <img
                  className="AppHeaderLogo"
                  src="/blackjuliologo.png"
                  alt="julio"
                  loading="eager"
                />
                <span className="AppHeaderLogoWordmark ui-BrandWordmark">
                  <span>zero</span>
                  <span>start</span>
                </span>
              </Link>
            }
            actions={<LocaleSwitcher />}
          />
        </div>
      </ScrollRevealHeader>
      {children}
    </div>
  );
}

