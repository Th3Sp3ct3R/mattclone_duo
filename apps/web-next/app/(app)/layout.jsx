import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { buildLocalePath } from '@julio/shared';
import { AppSidebar, Button, PageLayout } from '@julio/ui';
import { Icon } from '@julio/icons';
import { getUserFromRequestCookies } from '@/src/server/auth.js';
import Link from 'next/link';
import { getRequestLocale } from '@/src/i18n/server.js';
import { AUTH_COOKIE_NAME } from '@/src/config/auth.js';
import { ApplyStoredTheme } from '@/src/theme/ApplyStoredTheme.jsx';

const navItems = (locale) => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: buildLocalePath('/dashboard', locale),
    icon: <Icon name="dashboard" size={16} />
  },
  {
    id: 'engine',
    label: 'Engine',
    href: buildLocalePath('/engine', locale),
    icon: <Icon name="settings" size={16} />
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: <Icon name="blog" size={16} />,
    items: [
      {
        id: 'posts',
        label: 'Posts',
        href: buildLocalePath('/admin/blog', locale),
        icon: <Icon name="posts" size={16} />
      },
      {
        id: 'categories',
        label: 'Categories',
        href: buildLocalePath('/admin/blog/categories', locale),
        icon: <Icon name="categories" size={16} />
      },
      {
        id: 'authors',
        label: 'Authors',
        href: buildLocalePath('/admin/blog/authors', locale),
        icon: <Icon name="authors" size={16} />
      }
    ]
  },
  {
    id: 'bookings',
    label: 'Bookings',
    href: buildLocalePath('/admin/bookings', locale),
    icon: <Icon name="bookings" size={16} />
  },
  {
    id: 'events',
    label: 'Events',
    href: buildLocalePath('/admin/events', locale),
    icon: <Icon name="calendar" size={16} />
  },
  {
    id: 'contact',
    label: 'Contact',
    href: buildLocalePath('/admin/contact', locale),
    icon: <Icon name="email" size={16} />
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: buildLocalePath('/admin/analytics', locale),
    icon: <Icon name="analytics" size={16} />
  },
  {
    id: 'payments',
    label: 'Payments',
    href: buildLocalePath('/admin/payments', locale),
    icon: <Icon name="payments" size={16} />
  },
  {
    id: 'seo',
    label: 'SEO',
    href: buildLocalePath('/seo', locale),
    icon: <Icon name="seo" size={16} />
  }
];

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 0
  };
}

export default async function AppLayout({ children }) {
  const user = await getUserFromRequestCookies();
  const locale = await getRequestLocale();
  if (!user?.email) redirect(buildLocalePath('/login', locale));

  async function logout() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, '', cookieOptions());
    redirect(buildLocalePath('/login', locale));
  }

  const roleItems = user.role === 'su'
    ? [
        ...navItems(locale).slice(0, 3),
        {
          id: 'users',
          label: 'Users',
          href: buildLocalePath('/admin/users', locale),
          icon: <Icon name="users" size={16} />
        },
        ...navItems(locale).slice(3)
      ]
    : navItems(locale);

  return (
    <div className="AppShell AppShell--noHeader">
      <ApplyStoredTheme />
      <main className="AppShellMain">
        <PageLayout
          sidebar={
            <AppSidebar
              items={roleItems}
              brand={
                <div className="AppSidebarBrand">
                  <Link
                    href={buildLocalePath('/', locale)}
                    className="c-AppHeaderBrand AppHeaderBrandLogo"
                    role="banner"
                  >
                    <img
                      className="AppHeaderLogo AppHeaderLogo--dark"
                      src="/blackjuliologo.png"
                      alt="julio"
                      loading="eager"
                    />
                    <span className="AppHeaderLogoWordmark ui-BrandWordmark">
                      <span>zero</span>
                      <span>start</span>
                    </span>
                  </Link>
                </div>
              }
              footer={
                <div className="AppSidebarUser">
                  <Link className="c-NavLink" href={buildLocalePath('/admin/settings', locale)}>
                    <div className="AppSidebarUserMeta">
                      <div className="AppSidebarUserEmail">{user.email}</div>
                      <div className="AppSidebarUserRole">{user.role}</div>
                    </div>
                  </Link>
                  <div className="AppSidebarUserActions">
                    <form action={logout}>
                      <Button type="submit" block>
                        Logout
                      </Button>
                    </form>
                  </div>
                </div>
              }
            />
          }
        >
          <div className="container content-container AppShellPage">{children}</div>
        </PageLayout>
      </main>
    </div>
  );
}



