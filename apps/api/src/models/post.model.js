import mongoose from 'mongoose';

const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, trim: true, default: '' },
    metaDescription: { type: String, trim: true, default: '' },
    ogTitle: { type: String, trim: true, default: '' },
    ogDescription: { type: String, trim: true, default: '' },
    ogImageUrl: { type: String, trim: true, default: '' },
    twitterImageUrl: { type: String, trim: true, default: '' },
    canonicalUrl: { type: String, trim: true, default: '' },
    indexable: { type: Boolean, default: true },
    structuredDataJson: { type: String, trim: true, default: '' },
    hreflangOverrides: [
      {
        locale: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' }
      }
    ]
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    slug: { type: String, trim: true, index: true },
    excerpt: { type: String, trim: true, default: '' },
    contentHtml: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft', index: true },
    publishAt: { type: Date, default: null, index: true },
    language: { type: String, trim: true, default: 'en', index: true },
    translationKey: { type: String, trim: true, default: '', index: true },
    tags: [{ type: String, trim: true }],
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', default: null },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    coverImageUrl: { type: String, trim: true, default: '' },
    coverImageAlt: { type: String, trim: true, default: '' },
    seo: { type: seoSchema, default: () => ({}) }
  },
  { timestamps: true }
);

postSchema.index({ slug: 1, language: 1 }, { unique: true, sparse: true });
postSchema.index({ status: 1, publishAt: -1 });

export const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
