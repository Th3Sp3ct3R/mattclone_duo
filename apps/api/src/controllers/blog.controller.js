import { env } from '@julio/api/config/env';
import { connectMongo } from '@julio/api/db/mongo';
import { Post } from '@julio/api/models/post';
import { Author } from '@julio/api/models/author';
import { Category } from '@julio/api/models/category';
import { logger } from '@julio/api/logger';
import { coerceDateTime, nowInZoneDate } from '@julio/shared';

import { requireEditor } from '@julio/api/utils/auth';
import { sendError } from '@julio/api/utils/response';

function sanitizeString(value) {
  return String(value || '').trim();
}

function sanitizeArray(list) {
  return Array.isArray(list) ? list.map((item) => sanitizeString(item)).filter(Boolean) : [];
}

function sanitizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function sanitizePost(payload = {}) {
  return {
    title: sanitizeString(payload.title),
    slug: sanitizeString(payload.slug),
    excerpt: sanitizeString(payload.excerpt),
    contentHtml: sanitizeString(payload.contentHtml),
    status: sanitizeString(payload.status) || 'draft',
    publishAt: payload.publishAt ? coerceDateTime(payload.publishAt, { zone: 'UTC' })?.toJSDate() : null,
    language: sanitizeString(payload.language) || 'en',
    translationKey: sanitizeString(payload.translationKey),
    tags: sanitizeArray(payload.tags),
    authorId: payload.authorId || null,
    categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds : [],
    coverImageUrl: sanitizeString(payload.coverImageUrl),
    coverImageAlt: sanitizeString(payload.coverImageAlt),
    seo: {
      metaTitle: sanitizeString(payload.seo?.metaTitle),
      metaDescription: sanitizeString(payload.seo?.metaDescription),
      ogTitle: sanitizeString(payload.seo?.ogTitle),
      ogDescription: sanitizeString(payload.seo?.ogDescription),
      ogImageUrl: sanitizeString(payload.seo?.ogImageUrl),
      twitterImageUrl: sanitizeString(payload.seo?.twitterImageUrl),
      canonicalUrl: sanitizeString(payload.seo?.canonicalUrl),
      indexable: sanitizeBoolean(payload.seo?.indexable, true),
      structuredDataJson: sanitizeString(payload.seo?.structuredDataJson),
      hreflangOverrides: Array.isArray(payload.seo?.hreflangOverrides)
        ? payload.seo.hreflangOverrides
            .map((entry) => ({
              locale: sanitizeString(entry.locale),
              url: sanitizeString(entry.url)
            }))
            .filter((entry) => entry.locale && entry.url)
        : []
    }
  };
}

function buildPublishedFilter(now = nowInZoneDate()) {
  return {
    status: 'published',
    $or: [{ publishAt: null }, { publishAt: { $lte: now } }]
  };
}

export async function getPublishedPosts() {
  if (!env.mongodbUri) return [];
  await connectMongo(env.mongodbUri);
  const now = nowInZoneDate();
  return Post.find(buildPublishedFilter(now)).sort({ publishAt: -1, updatedAt: -1 }).lean();
}

export async function getPublishedPostBySlug(slug) {
  if (!env.mongodbUri) return null;
  await connectMongo(env.mongodbUri);
  const now = nowInZoneDate();
  return Post.findOne({ slug, ...buildPublishedFilter(now) }).lean();
}

export async function getPublishedTranslations(translationKey) {
  if (!translationKey) return [];
  if (!env.mongodbUri) return [];
  await connectMongo(env.mongodbUri);
  const now = nowInZoneDate();
  return Post.find({ translationKey, ...buildPublishedFilter(now) }).lean();
}

export async function listPosts(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const posts = await Post.find({}).sort({ updatedAt: -1 }).lean();
    return res.json({ ok: true, posts });
  } catch (err) {
    logger.error('Blog posts fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createPost(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizePost(req.body || {});
    const post = await Post.create(payload);
    return res.json({ ok: true, post });
  } catch (err) {
    logger.error('Blog post create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getPost(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ code: 'NOT_FOUND', message: 'Post not found' });
    return res.json({ ok: true, post });
  } catch (err) {
    logger.error('Blog post fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updatePost(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const payload = sanitizePost(req.body || {});
    const post = await Post.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!post) return res.status(404).json({ code: 'NOT_FOUND', message: 'Post not found' });
    return res.json({ ok: true, post });
  } catch (err) {
    logger.error('Blog post update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deletePost(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ code: 'NOT_FOUND', message: 'Post not found' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Blog post delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listPublicPosts(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const now = nowInZoneDate();
    const posts = await Post.find({
      status: 'published',
      $or: [{ publishAt: null }, { publishAt: { $lte: now } }]
    })
      .sort({ publishAt: -1, updatedAt: -1 })
      .lean();
    return res.json({ ok: true, posts });
  } catch (err) {
    logger.error('Public blog posts fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function getPublicPost(req, res) {
  try {
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const now = nowInZoneDate();
    const post = await Post.findOne({
      slug: req.params.slug,
      status: 'published',
      $or: [{ publishAt: null }, { publishAt: { $lte: now } }]
    }).lean();
    if (!post) return res.status(404).json({ code: 'NOT_FOUND', message: 'Post not found' });
    return res.json({ ok: true, post });
  } catch (err) {
    logger.error('Public blog post fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listAuthors(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const authors = await Author.find({}).sort({ name: 1 }).lean();
    return res.json({ ok: true, authors });
  } catch (err) {
    logger.error('Authors fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createAuthor(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const author = await Author.create({
      name: sanitizeString(req.body?.name),
      slug: sanitizeString(req.body?.slug),
      bio: sanitizeString(req.body?.bio),
      avatarUrl: sanitizeString(req.body?.avatarUrl)
    });
    return res.json({ ok: true, author });
  } catch (err) {
    logger.error('Author create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateAuthor(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      {
        name: sanitizeString(req.body?.name),
        slug: sanitizeString(req.body?.slug),
        bio: sanitizeString(req.body?.bio),
        avatarUrl: sanitizeString(req.body?.avatarUrl)
      },
      { new: true }
    );
    if (!author) return res.status(404).json({ code: 'NOT_FOUND', message: 'Author not found' });
    return res.json({ ok: true, author });
  } catch (err) {
    logger.error('Author update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deleteAuthor(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) return res.status(404).json({ code: 'NOT_FOUND', message: 'Author not found' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Author delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function listCategories(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    return res.json({ ok: true, categories });
  } catch (err) {
    logger.error('Categories fetch failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function createCategory(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const category = await Category.create({
      name: sanitizeString(req.body?.name),
      slug: sanitizeString(req.body?.slug),
      description: sanitizeString(req.body?.description)
    });
    return res.json({ ok: true, category });
  } catch (err) {
    logger.error('Category create failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function updateCategory(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: sanitizeString(req.body?.name),
        slug: sanitizeString(req.body?.slug),
        description: sanitizeString(req.body?.description)
      },
      { new: true }
    );
    if (!category) return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' });
    return res.json({ ok: true, category });
  } catch (err) {
    logger.error('Category update failed', err);
    return sendError(res, err, 'Internal error');
  }
}

export async function deleteCategory(req, res) {
  try {
    requireEditor(req);
    if (!env.mongodbUri) throw new Error('Missing MONGODB_URI');
    await connectMongo(env.mongodbUri);
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('Category delete failed', err);
    return sendError(res, err, 'Internal error');
  }
}
