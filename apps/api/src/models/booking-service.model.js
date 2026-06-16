import mongoose from 'mongoose';

const bookingServiceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, required: true, unique: true },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true, index: true },
    timezone: { type: String, trim: true, default: 'UTC' },
    durationMinutes: { type: Number, default: 30 },
    stepMinutes: { type: Number, default: 30 },
    bufferMinutes: { type: Number, default: 0 },
    minimumNoticeMinutes: { type: Number, default: 0 },
    bookingWindowDays: { type: Number, default: 60 },
    priceCents: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: 'USD' },
    requiresPayment: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export const BookingService =
  mongoose.models.BookingService || mongoose.model('BookingService', bookingServiceSchema);
