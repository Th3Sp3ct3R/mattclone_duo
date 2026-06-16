import mongoose from 'mongoose';

const timeWindowSchema = new mongoose.Schema(
  {
    startMinutes: { type: Number, required: true },
    endMinutes: { type: Number, required: true }
  },
  { _id: false }
);

const weeklyRuleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startMinutes: { type: Number, required: true },
    endMinutes: { type: Number, required: true }
  },
  { _id: false }
);

const dateOverrideSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    isClosed: { type: Boolean, default: false },
    windows: [timeWindowSchema]
  },
  { _id: false }
);

const bookingAvailabilitySchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingService',
      required: true,
      unique: true,
      index: true
    },
    weeklyRules: [weeklyRuleSchema],
    dateOverrides: [dateOverrideSchema],
    blackoutDates: [{ type: Date }]
  },
  { timestamps: true }
);

export const BookingAvailability =
  mongoose.models.BookingAvailability ||
  mongoose.model('BookingAvailability', bookingAvailabilitySchema);
