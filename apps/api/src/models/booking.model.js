import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingService',
      required: true,
      index: true
    },
    serviceName: { type: String, trim: true, default: '' },
    timezone: { type: String, trim: true, default: 'UTC' },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    customerName: { type: String, trim: true, default: '' },
    customerEmail: { type: String, trim: true, lowercase: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    priceCents: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: 'USD' },
    requiresPayment: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
      index: true
    },
    source: { type: String, trim: true, default: 'public' },
    paymentProvider: { type: String, trim: true, default: '' },
    paymentIntentId: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

bookingSchema.index({ serviceId: 1, startAt: 1, status: 1 });
bookingSchema.index({ customerEmail: 1, createdAt: -1 });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
