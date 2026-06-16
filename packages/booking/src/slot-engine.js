import {
  buildDateTime,
  coerceDateTime,
  nowInZoneDate,
  resolveDateOnlyKey,
  startOfDay,
  toJsDate
} from '@julio/shared';

export { resolveDateOnlyKey };

export function toDateOnly(value, options) {
  return startOfDay(value, options);
}

export function normalizeDateRange({ startDate, endDate, timezone = 'UTC' }) {
  const start = toDateOnly(startDate, { zone: timezone });
  const end = toDateOnly(endDate, { zone: timezone });
  if (!start || !end) return { startDate: null, endDate: null };
  if (start.toMillis() <= end.toMillis()) return { startDate: start, endDate: end };
  return { startDate: end, endDate: start };
}

export function normalizeDurationMinutes(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}

export function normalizeAvailabilityRules(rules = {}) {
  return {
    timezone: String(rules.timezone || 'UTC'),
    weeklyRules: Array.isArray(rules.weeklyRules) ? rules.weeklyRules : [],
    dateOverrides: Array.isArray(rules.dateOverrides) ? rules.dateOverrides : [],
    blackoutDates: Array.isArray(rules.blackoutDates) ? rules.blackoutDates : []
  };
}

function buildDateRangeDays(startDate, endDate) {
  const days = [];
  if (!startDate || !endDate) return days;
  let cursor = startDate;
  while (cursor.toMillis() <= endDate.toMillis()) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 }).startOf('day');
  }
  return days;
}

function minutesToDate(dateTime, minutesFromMidnight) {
  const minutes = normalizeDurationMinutes(minutesFromMidnight, 0);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return buildDateTime({
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour,
    minute,
    second: 0,
    millisecond: 0,
    zone: dateTime.zoneName
  });
}

function resolveDailyWindows({ dateOnlyKey, dayOfWeek, weeklyRules, dateOverrides, blackoutDates }) {
  if (blackoutDates.includes(dateOnlyKey)) return [];
  const override = dateOverrides.find((entry) => resolveDateOnlyKey(entry.date) === dateOnlyKey);
  if (override?.isClosed) return [];
  if (override?.windows?.length) return override.windows;
  return weeklyRules
    .filter((rule) => rule.dayOfWeek === dayOfWeek)
    .map((rule) => ({
      startMinutes: rule.startMinutes,
      endMinutes: rule.endMinutes
    }));
}

function isSlotOverlapping(slotStart, slotEnd, bookedStart, bookedEnd, bufferMinutes) {
  const bufferMs = normalizeDurationMinutes(bufferMinutes, 0) * 60 * 1000;
  const bookedStartMs = bookedStart.toMillis() - bufferMs;
  const bookedEndMs = bookedEnd.toMillis() + bufferMs;
  return slotStart.toMillis() < bookedEndMs && slotEnd.toMillis() > bookedStartMs;
}

function filterConflictingSlots(slots, existingBookings, bufferMinutes) {
  if (!Array.isArray(existingBookings) || existingBookings.length === 0) return slots;
  return slots.filter((slot) => {
    return !existingBookings.some((booking) => {
      const bookedStart = coerceDateTime(booking.startAt, { zone: slot.zoneName });
      const bookedEnd = coerceDateTime(booking.endAt, { zone: slot.zoneName });
      if (!bookedStart || !bookedEnd) return false;
      return isSlotOverlapping(slot.startAt, slot.endAt, bookedStart, bookedEnd, bufferMinutes);
    });
  });
}

export function buildTimeSlots({
  startDate,
  endDate,
  durationMinutes = 30,
  stepMinutes,
  bufferMinutes = 0,
  weeklyRules = [],
  dateOverrides = [],
  blackoutDates = [],
  existingBookings = [],
  minimumNoticeMinutes = 0,
  timezone = 'UTC',
  now = null
}) {
  const normalizedDuration = normalizeDurationMinutes(durationMinutes, 30);
  const normalizedBuffer = normalizeDurationMinutes(bufferMinutes, 0);
  const normalizedStep = normalizeDurationMinutes(stepMinutes || durationMinutes, normalizedDuration);
  const slotBlockMinutes = normalizedDuration + normalizedBuffer;
  const effectiveStep = Math.max(normalizedStep, slotBlockMinutes);
  const normalizedNotice = normalizeDurationMinutes(minimumNoticeMinutes, 0);
  const { startDate: rangeStart, endDate: rangeEnd } = normalizeDateRange({
    startDate,
    endDate,
    timezone
  });
  const days = buildDateRangeDays(rangeStart, rangeEnd);
  const slots = [];
  const resolvedNow = now || nowInZoneDate({ zone: timezone });
  const nowDateTime = coerceDateTime(resolvedNow, { zone: timezone });
  const noticeCutoff = nowDateTime.toMillis() + normalizedNotice * 60 * 1000;

  days.forEach((day) => {
    const dateOnlyKey = resolveDateOnlyKey(day, { zone: timezone });
    const windows = resolveDailyWindows({
      dateOnlyKey,
      dayOfWeek: day.weekday % 7,
      weeklyRules,
      dateOverrides,
      blackoutDates
    });
    windows.forEach((window) => {
      const windowStart = normalizeDurationMinutes(window.startMinutes, 0);
      const windowEnd = normalizeDurationMinutes(window.endMinutes, 0);
      let cursorMinutes = windowStart;
      while (cursorMinutes + slotBlockMinutes <= windowEnd) {
        const startAt = minutesToDate(day, cursorMinutes);
        const endAt = minutesToDate(day, cursorMinutes + normalizedDuration);
        if (startAt.toMillis() >= noticeCutoff) {
          slots.push({
            startAt,
            endAt,
            dateOnlyKey,
            startMinutes: cursorMinutes,
            endMinutes: cursorMinutes + normalizedDuration
          });
        }
        cursorMinutes += effectiveStep;
      }
    });
  });

  const availableSlots = filterConflictingSlots(slots, existingBookings, normalizedBuffer);
  return availableSlots.map((slot) => ({
    startAt: toJsDate(slot.startAt),
    endAt: toJsDate(slot.endAt),
    dateOnlyKey: slot.dateOnlyKey,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes
  }));
}

