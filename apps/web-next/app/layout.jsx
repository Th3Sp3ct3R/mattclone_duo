import './globals.scss';

import { cookies } from 'next/headers';

import { DEFAULT_LOCALE, isRtlLocale, normalizeLocale } from '@julio/shared';
import { buildThemeBootstrapScript } from '@julio/ui';
import { LOCALE_COOKIE_NAME } from '@/src/i18n/constants.js';
import { getSeoSettings } from '@/src/seo/settings.js';
import { ToastHost } from '@/src/notifications/ToastHost.jsx';
import { ChatContextProvider } from '@/src/chat/ChatContextProvider.jsx';
import { ChatWidgetWithContext } from '@/src/chat/ChatWidgetWithContext.jsx';
import { ForceLightTheme } from '@/src/theme/ForceLightTheme.jsx';

export async function generateMetadata() {
  const settings = await getSeoSettings();
  if (!settings) {
    return {
      title: 'Zero Start',
      description: '',
      icons: {
        icon: '/whitejuliologo.png'
      },
      robots: { index: true, follow: true }
    };
  }

  const rawTitle = settings.defaultTitle || settings.siteName || 'Zero Start';
  const title =
    String(rawTitle || '').trim().toLowerCase() === 'julio' ? 'Zero Start' : rawTitle;
  const description = settings.defaultDescription || '';
  const ogImage = settings.defaultOgImageUrl || null;
  const twitterImage = settings.defaultTwitterImageUrl || null;
  const canonicalBase = settings.defaultCanonicalBase || '';

  return {
    title,
    description,
    icons: {
      icon: '/whitejuliologo.png'
    },
    alternates: canonicalBase ? { canonical: canonicalBase } : undefined,
    openGraph: ogImage
      ? {
          title,
          description,
          images: [{ url: ogImage }]
        }
      : undefined,
    twitter: twitterImage
      ? {
          card: 'summary_large_image',
          title,
          description,
          images: [twitterImage]
        }
      : undefined,
    robots: { index: true, follow: true }
  };
}

const themeScript = buildThemeBootstrapScript();

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value || DEFAULT_LOCALE;
  const locale = normalizeLocale(rawLocale, DEFAULT_LOCALE);
  const direction = isRtlLocale(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ChatContextProvider>
          <ForceLightTheme />
          {children}
          <ToastHost />
          <ChatWidgetWithContext />
        </ChatContextProvider>
      </body>
    </html>
  );
}



