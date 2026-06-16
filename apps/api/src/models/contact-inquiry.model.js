import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new', index: true },
    internalNotes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

contactInquirySchema.index({ status: 1, createdAt: -1 });

export const ContactInquiry =
  mongoose.models.ContactInquiry || mongoose.model('ContactInquiry', contactInquirySchema);
