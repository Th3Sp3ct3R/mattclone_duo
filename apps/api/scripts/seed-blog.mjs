import { loadRootEnv } from '@julio/config/env';
import { connectMongo, disconnectMongo } from '@julio/api/db/mongo';
import { Author } from '@julio/api/models/author';
import { Category } from '@julio/api/models/category';
import { Post } from '@julio/api/models/post';

loadRootEnv();

const seedDomain = process.env.SEED_DOMAIN || 'julio.com';

const authorsSeed = [
  {
    name: 'Editor One',
    slug: 'editor-one',
    bio: 'Lead editor focused on long-form stories.',
    avatarUrl: ''
  },
  {
    name: 'Editor Two',
    slug: 'editor-two',
    bio: 'Writes product updates and announcements.',
    avatarUrl: ''
  }
];

const categoriesSeed = [
  { name: 'Development', slug: 'development', description: 'Web, mobile, and platform builds.' },
  { name: 'SEO', slug: 'seo', description: 'Search optimization and content strategy.' },
  { name: 'Marketing', slug: 'marketing', description: 'Campaigns, positioning, and messaging.' },
  { name: 'Advertising', slug: 'advertising', description: 'Paid media, targeting, and performance.' },
  { name: 'Strategy', slug: 'strategy', description: 'Planning, discovery, and growth roadmaps.' }
];

function buildPostSeed({
  title,
  slug,
  excerpt,
  contentHtml,
  authorId,
  categoryIds,
  language,
  publishAt = new Date(Date.now() - 1000 * 60 * 60 * 24),
  tags = ['seed', 'blog']
}) {
  return {
    title,
    slug,
    excerpt,
    contentHtml,
    status: 'published',
    publishAt,
    language,
    translationKey: `${slug}-key`,
    tags,
    authorId,
    categoryIds,
    coverImageUrl: '',
    coverImageAlt: '',
    seo: {
      metaTitle: `${title} | ${seedDomain}`,
      metaDescription: excerpt,
      ogTitle: title,
      ogDescription: excerpt,
      ogImageUrl: '',
      twitterImageUrl: '',
      canonicalUrl: `https://${seedDomain}/blog/${slug}`,
      indexable: true,
      structuredDataJson: '',
      hreflangOverrides: []
    }
  };
}

export async function seedBlog() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  await connectMongo(process.env.MONGODB_URI);

  await Post.deleteMany({});
  await Author.deleteMany({});
  await Category.deleteMany({});

  const authors = await Author.insertMany(authorsSeed);
  const categories = await Category.insertMany(categoriesSeed);

  const postSeeds = [
    buildPostSeed({
      title: 'From brief to launch: the Zero Start delivery process',
      slug: 'brief-to-launch-zero-start-process',
      excerpt: 'How we move from discovery to launch with clear milestones and shared accountability.',
      contentHtml:
        '<p>Every engagement starts with discovery, where we align on goals, audiences, and success metrics.</p><p>Next, we move into design and development sprints with frequent reviews and measurable outcomes.</p><p>Launch includes QA, performance tuning, and a growth plan so we keep improving after go live.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[4]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
      tags: ['strategy', 'delivery']
    }),
    buildPostSeed({
      title: 'SEO checklist for modern service businesses',
      slug: 'seo-checklist-modern-service-businesses',
      excerpt: 'Technical, content, and local SEO improvements that drive qualified leads.',
      contentHtml:
        '<p>Start with technical foundations: page speed, structured data, and clean information architecture.</p><p>Then align content around search intent with focused service pages and supporting articles.</p><p>Finally, build local authority with consistent listings, reviews, and location signals.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[1]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
      tags: ['seo', 'content']
    }),
    buildPostSeed({
      title: 'Building a mobile MVP that converts',
      slug: 'building-a-mobile-mvp-that-converts',
      excerpt: 'A practical approach to mobile MVPs that focuses on outcomes, not just features.',
      contentHtml:
        '<p>Define one core action your users must complete and remove everything that distracts from it.</p><p>Design flows that minimize friction, then validate early with analytics and user feedback.</p><p>Ship quickly, learn from real usage, and iterate with data-backed priorities.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[0]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
      tags: ['mobile', 'product']
    }),
    buildPostSeed({
      title: 'Paid search vs. paid social: allocating your budget',
      slug: 'paid-search-vs-paid-social-budget',
      excerpt: 'When to invest in intent-driven search versus awareness-focused social campaigns.',
      contentHtml:
        '<p>Paid search captures demand that already exists, so it works best for high-intent services.</p><p>Paid social is ideal for audience expansion, brand lift, and remarketing.</p><p>Allocate budget based on funnel stage, then rebalance monthly using conversion data.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[3]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
      tags: ['advertising', 'media']
    }),
    buildPostSeed({
      title: 'Website performance tuning for higher conversions',
      slug: 'website-performance-tuning-conversions',
      excerpt: 'Improve load times, UX, and content hierarchy to lift conversion rates.',
      contentHtml:
        '<p>Start with Core Web Vitals and eliminate heavy scripts that block rendering.</p><p>Refine your above-the-fold messaging so visitors understand the value fast.</p><p>Test calls to action and layout changes using analytics to validate impact.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[0]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      tags: ['web', 'performance']
    }),
    buildPostSeed({
      title: 'Campaign planning for one-stop growth teams',
      slug: 'campaign-planning-one-stop-growth',
      excerpt: 'How to align product, content, and paid media around a single growth plan.',
      contentHtml:
        '<p>Start with one measurable goal and define the message that supports it.</p><p>Plan content and ads together so every channel reinforces the same narrative.</p><p>Review results weekly and optimize toward the goal, not vanity metrics.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[2]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18),
      tags: ['marketing', 'growth']
    }),
    buildPostSeed({
      title: 'Local SEO in 2026: signal stacking that works',
      slug: 'local-seo-2026-signal-stacking',
      excerpt: 'Practical local SEO moves that build trust across maps, reviews, and citations.',
      contentHtml:
        '<p>Start with consistent NAP data across your website, Google Business Profile, and major directories.</p><p>Collect reviews on a cadence and respond to every one with location-specific context.</p><p>Use location pages that answer local intent and include structured data for business details.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[1]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
      tags: ['seo', 'local']
    }),
    buildPostSeed({
      title: 'AI search changes: update your content strategy',
      slug: 'ai-search-content-strategy-update',
      excerpt: 'How to write content that performs in AI-driven search and classic rankings.',
      contentHtml:
        '<p>Prioritize real answers: short definitions, clear steps, and credible sources.</p><p>Build topic clusters so AI summaries have context and users can explore deeper.</p><p>Measure performance with query-level intent, not just page-level traffic.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[1]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 24),
      tags: ['seo', 'content']
    }),
    buildPostSeed({
      title: 'Founder-led marketing: the first 90 days',
      slug: 'founder-led-marketing-first-90-days',
      excerpt: 'A repeatable plan for founder-led marketing that builds trust fast.',
      contentHtml:
        '<p>Open with your point of view on the customer problem and share it consistently.</p><p>Publish weekly: one story, one lesson, and one product update.</p><p>Turn each response into a lead follow-up to keep momentum measurable.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[2]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 27),
      tags: ['marketing', 'founder']
    }),
    buildPostSeed({
      title: 'Productized services: pricing without guesswork',
      slug: 'productized-services-pricing-without-guesswork',
      excerpt: 'A framework for packaging services with clear scope and profitable margins.',
      contentHtml:
        '<p>Define the outcome, the deliverables, and what is explicitly excluded.</p><p>Price based on value and capacity, then add a fast-track option for urgency.</p><p>Use a simple intake form to keep projects aligned from day one.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[4]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      tags: ['strategy', 'pricing']
    }),
    buildPostSeed({
      title: 'Brand messaging that survives a homepage rewrite',
      slug: 'brand-messaging-homepage-rewrite',
      excerpt: 'Build a message hierarchy that stays clear through redesigns.',
      contentHtml:
        '<p>Write one core promise, three proof points, and one differentiator.</p><p>Validate the message with real objections from sales and support calls.</p><p>Use the hierarchy across hero copy, section headers, and CTAs.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[2]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 33),
      tags: ['marketing', 'positioning']
    }),
    buildPostSeed({
      title: 'Modern analytics: events you actually need',
      slug: 'modern-analytics-events-you-need',
      excerpt: 'A minimal event plan that answers what matters without data overload.',
      contentHtml:
        '<p>Track the primary conversion, the key activation step, and one retention signal.</p><p>Name events clearly so reporting stays consistent across teams.</p><p>Review events monthly and remove metrics that do not drive decisions.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[4]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 36),
      tags: ['strategy', 'analytics']
    }),
    buildPostSeed({
      title: 'Conversion-focused landing pages in 2026',
      slug: 'conversion-focused-landing-pages-2026',
      excerpt: 'Layouts, copy patterns, and social proof that raise conversion rates.',
      contentHtml:
        '<p>Lead with a bold value statement, then show proof in the first scroll.</p><p>Use short forms and emphasize response time to reduce friction.</p><p>Test one variable at a time so learnings are clean and repeatable.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[0]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 39),
      tags: ['web', 'conversion']
    }),
    buildPostSeed({
      title: 'Paid media creative: a system for rapid testing',
      slug: 'paid-media-creative-rapid-testing',
      excerpt: 'How to structure creative tests so wins are clear and scalable.',
      contentHtml:
        '<p>Start with three angles and two formats so you can isolate what works.</p><p>Run short tests, then scale only the winners with a clean budget split.</p><p>Document learnings so the next campaign starts stronger.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[3]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42),
      tags: ['advertising', 'creative']
    }),
    buildPostSeed({
      title: 'Service funnels that close high-intent leads',
      slug: 'service-funnels-close-high-intent-leads',
      excerpt: 'A funnel structure that qualifies, nurtures, and converts without waste.',
      contentHtml:
        '<p>Use a short qualification step before scheduling so sales time stays focused.</p><p>Send a proof-driven email sequence that answers top objections.</p><p>Close with a clear next step and a defined timeline.</p>',
      authorId: authors[0]._id,
      categoryIds: [categories[4]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
      tags: ['strategy', 'sales']
    }),
    buildPostSeed({
      title: 'Platform migration without losing SEO',
      slug: 'platform-migration-without-losing-seo',
      excerpt: 'A migration checklist that protects rankings and keeps traffic stable.',
      contentHtml:
        '<p>Map every URL and ship a complete 301 redirect file on day one.</p><p>Keep metadata and structured data intact during the move.</p><p>Monitor crawl errors daily until traffic stabilizes.</p>',
      authorId: authors[1]._id,
      categoryIds: [categories[1]._id],
      language: 'en',
      publishAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 48),
      tags: ['seo', 'migration']
    })
  ];

  await Post.insertMany(postSeeds);

  await disconnectMongo();
  console.log('[seed] blog seeded: authors, categories, posts');
}

const isDirect = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirect) {
  seedBlog().catch(async (err) => {
    console.error(err);
    try {
      await disconnectMongo();
    } catch {}
    process.exit(1);
  });
}
