import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, required: true, unique: true },
    summary: { type: String, trim: true, default: '' },
    descriptionHtml: { type: String, default: '' },
    location: { type: String, trim: true, default: '' },
    startAt: { type: Date, default: null, index: true },
    endAt: { type: Date, default: null },
    timezone: { type: String, trim: true, default: 'UTC' },
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft', index: true },
    publishAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, publishAt: 1, startAt: 1 });

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
