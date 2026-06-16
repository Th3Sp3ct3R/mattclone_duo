import mongoose from 'mongoose';

const ROLES = ['su', 'admin', 'contributor', 'user'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    avatarUrl: { type: String, trim: true, default: '' },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
