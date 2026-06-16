import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, required: true, unique: true },
    bio: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

export const Author = mongoose.models.Author || mongoose.model('Author', authorSchema);
