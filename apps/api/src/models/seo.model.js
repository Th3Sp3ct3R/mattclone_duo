import mongoose from 'mongoose';

const hreflangSchema = new mongoose.Schema(
  {
    locale: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const routeOverrideSchema = new mongoose.Schema(
  {
    routeKey: { type: String, trim: true, default: '' },
    routePath: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    canonicalUrl: { type: String, trim: true, default: '' },
    ogImageUrl: { type: String, trim: true, default: '' },
    twitterImageUrl: { type: String, trim: true, default: '' },
    indexable: { type: Boolean, default: true },
    structuredDataJson: { type: String, trim: true, default: '' },
    hreflang: [hreflangSchema]
  },
  { _id: false }
);

const seoSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, trim: true, default: 'julio' },
    defaultTitle: { type: String, trim: true, default: '' },
    defaultDescription: { type: String, trim: true, default: '' },
    defaultOgImageUrl: { type: String, trim: true, default: '' },
    defaultTwitterImageUrl: { type: String, trim: true, default: '' },
    defaultCanonicalBase: { type: String, trim: true, default: '' },
    robotsTxt: { type: String, default: '' },
    structuredDataJson: { type: String, default: '' },
    defaultLocale: { type: String, trim: true, default: 'en' },
    hreflangLocales: [{ type: String, trim: true }],
    routeOverrides: [routeOverrideSchema],
    updatedBy: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

export const SeoSettings =
  mongoose.models.SeoSettings || mongoose.model('SeoSettings', seoSettingsSchema);
