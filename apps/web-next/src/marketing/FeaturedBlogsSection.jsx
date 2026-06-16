import Link from 'next/link';

import { buildLocalePath, formatDate } from '@julio/shared';
import { Icon } from '@julio/icons';
import { Carousel, CarouselItem, PostCard, Section, SectionBand } from '@julio/ui';
import { getPublicPosts } from '@/src/server/blog.js';

const defaultLimit = 10;

export async function FeaturedBlogsSection({ locale, dict, limit = defaultLimit, anchorId = null }) {
  const posts = await getPublicPosts();
  if (!posts?.length) return null;

  const featuredPosts = posts.slice(0, limit);

  return (
    <SectionBand
      tone="light"
      id={anchorId || undefined}
      className={anchorId ? 'HomeBlogSection HomePageAnchor' : 'HomeBlogSection'}
    >
      <div className="container content-container">
        <Section
          eyebrow={dict.blog.eyebrow}
          title={dict.blog.title}
          description={dict.blog.description}
        >
          <Carousel
            className="HomeBlogCarousel"
            label={dict.blog.title}
            prevLabel={dict.blog.carouselPrevLabel}
            nextLabel={dict.blog.carouselNextLabel}
            prevControl={<Icon name="chevronLeft" size={18} />}
            nextControl={<Icon name="chevronRight" size={18} />}
          >
            {featuredPosts.map((post) => (
              <CarouselItem key={post._id} className="HomeBlogCard">
                <PostCard
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
              </CarouselItem>
            ))}
          </Carousel>
        </Section>
      </div>
    </SectionBand>
  );
}
