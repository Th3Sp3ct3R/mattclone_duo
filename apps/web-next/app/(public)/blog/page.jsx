import Link from 'next/link';

import { buildLocalePath, formatDate } from '@julio/shared';
import { Card, PostCard, Section, SectionBand } from '@julio/ui';
import { getPublicPosts } from '@/src/server/blog.js';
import { buildRouteMetadata, getRouteSeoSettings } from '@/src/seo/metadata.js';
import { getDictionary, getRequestLocale } from '@/src/i18n/server.js';

export async function generateMetadata() {
  const locale = await getRequestLocale();
  const { settings, override } = await getRouteSeoSettings('blog');
  return buildRouteMetadata({ settings, override, path: '/blog', locale });
}

export default async function BlogIndexPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const posts = await getPublicPosts();
  const [featured, ...rest] = posts;

  return (
    <div>
      <main>
        <SectionBand tone="light">
          <div className="container content-container">
            <Section
              eyebrow={dict.blog.eyebrow}
              title={dict.blog.title}
              description={dict.blog.description}
            >
              {featured ? (
                <div className="BlogHero">
                  <PostCard
                    featured
                    imageUrl={featured.coverImageUrl}
                    imageAlt={featured.coverImageAlt || featured.title}
                    title={featured.title}
                    excerpt={featured.excerpt}
                    meta={featured.publishAt ? formatDate(featured.publishAt) : 'Recent'}
                    href={buildLocalePath(`/blog/${featured.slug}`, locale)}
                    renderLink={({ href, className, children }) => (
                      <Link href={href} className={className}>
                        {children}
                      </Link>
                    )}
                  />
                  <Card className="BlogSidebarCard">
                    <div className="layout-stack-gap-8">
                      <strong>Topics</strong>
                      <div className="Kicker">Product updates</div>
                      <div className="Kicker">Engineering</div>
                      <div className="Kicker">Design systems</div>
                      <div className="Kicker">Company news</div>
                    </div>
                  </Card>
                </div>
              ) : null}
            </Section>
          </div>
        </SectionBand>

        <SectionBand tone="dark">
          <div className="container content-container">
            <Section
              eyebrow={dict.blog.allPostsEyebrow}
              title={dict.blog.allPostsTitle}
              description={dict.blog.allPostsDescription}
            >
              <div className="BlogGrid">
                {rest.map((post) => (
                  <PostCard
                    key={post._id}
                    imageUrl={post.coverImageUrl}
                    imageAlt={post.coverImageAlt || post.title}
                    title={post.title}
                    excerpt={post.excerpt}
                    meta={post.publishAt ? formatDate(post.publishAt) : 'Recent'}
                    href={buildLocalePath(`/blog/${post.slug}`, locale)}
                    renderLink={({ href, className, children }) => (
                      <Link href={href} className={className}>
                        {children}
                      </Link>
                    )}
                  />
                ))}
              </div>
            </Section>
          </div>
        </SectionBand>
      </main>
    </div>
  );
}

