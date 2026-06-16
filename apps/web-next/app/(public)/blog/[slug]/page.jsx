import Link from 'next/link';
import { notFound } from 'next/navigation';

import { buildLocalePath, formatDate } from '@julio/shared';
import { AppFooter, SectionBand } from '@julio/ui';
import { getPublicPostBySlug, getPublicTranslations } from '@/src/server/blog.js';
import { getRouteSeoSettings, buildRouteMetadata, buildHreflangAlternates } from '@/src/seo/metadata.js';
import { getDictionary, getRequestLocale } from '@/src/i18n/server.js';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const post = await getPublicPostBySlug(resolvedParams.slug);
  if (!post) return {};
  const locale = await getRequestLocale();

  const { settings } = await getRouteSeoSettings('blog-detail');
  if (!settings) return {};

  const override = {
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt,
    ogTitle: post.seo?.ogTitle || post.seo?.metaTitle || post.title,
    ogDescription: post.seo?.ogDescription || post.seo?.metaDescription || post.excerpt,
    canonicalUrl: post.seo?.canonicalUrl || '',
    ogImageUrl: post.seo?.ogImageUrl || post.coverImageUrl || '',
    twitterImageUrl: post.seo?.twitterImageUrl || post.coverImageUrl || '',
    indexable: post.seo?.indexable ?? true,
    hreflang: post.seo?.hreflangOverrides || [],
    structuredDataJson: post.seo?.structuredDataJson || ''
  };

  const metadata = buildRouteMetadata({
    settings,
    override,
    path: `/blog/${post.slug}`,
    locale
  });

  if (settings.defaultCanonicalBase) {
    const translations = await getPublicTranslations(post.translationKey);
    const hreflang = translations.map((item) => ({
      locale: item.language,
      url: `${settings.defaultCanonicalBase.replace(/\/+$/, '')}/blog/${item.slug}`
    }));
    metadata.alternates = {
      ...(metadata.alternates || {}),
      languages: buildHreflangAlternates({
        defaultLocale: settings.defaultLocale || 'en',
        hreflang,
        path: `/blog/${post.slug}`,
        canonicalBase: settings.defaultCanonicalBase
      })
    };
  }

  return metadata;
}

export default async function BlogPostPage({ params }) {
  const resolvedParams = await params;
  const post = await getPublicPostBySlug(resolvedParams.slug);
  if (!post) return notFound();
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const currentYear = new Date().getFullYear();
  const footerColumns = [
    {
      title: dict.home.footerCompanyTitle,
      links: [
        { label: dict.nav.contact, href: buildLocalePath('/contact', locale) },
        { label: dict.nav.login, href: buildLocalePath('/login', locale) }
      ]
    },
    {
      title: dict.home.footerResourcesTitle,
      links: [
        { label: dict.nav.blog, href: buildLocalePath('/blog', locale) },
        { label: dict.home.footerSeo, href: buildLocalePath('/seo', locale) }
      ]
    }
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishAt || post.createdAt,
    dateModified: post.updatedAt,
    image: post.coverImageUrl || undefined
  };

  return (
    <div>
      <main className="BlogPostPage">
        <SectionBand tone="light">
          <div className="container content-container">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="BlogPostHeader">
              <div className="BlogPostMeta">
                {post.publishAt ? formatDate(post.publishAt) : dict.blog.recentLabel}
              </div>
              <h1>{post.title}</h1>
              <p className="Kicker">{post.excerpt}</p>
            </div>
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                className="BlogPostCover"
              />
            ) : null}
          </div>
        </SectionBand>

        <SectionBand tone="light">
          <div className="container content-container">
            <div
              className="BlogPostBody"
              dangerouslySetInnerHTML={{ __html: post.contentHtml || '' }}
            />
          </div>
        </SectionBand>
      </main>
      <AppFooter
        containerClassName="container content-container"
        brand={
          <div className="AppFooterBrand">
            <img className="AppFooterLogo" src="/whitejuliologo.png" alt="julio" />
          </div>
        }
        tagline={dict.home.footerTagline}
        columns={footerColumns}
        copyright={`© ${currentYear} julio. ${dict.home.footerRights}`}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />
    </div>
  );
}

