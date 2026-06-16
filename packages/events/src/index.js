import { coerceDateTime, formatDate, formatDateRange, formatTime, nowInZone } from '@julio/shared';

function resolveEventZone(event, fallback = 'UTC') {
  return String(event?.timezone || fallback);
}

function toDateTime(value, zone = 'UTC') {
  return coerceDateTime(value, { zone });
}

export function sortEventsByStart(events = [], direction = 'asc') {
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...events].sort((a, b) => {
    const aDate = toDateTime(a?.startAt, resolveEventZone(a));
    const bDate = toDateTime(b?.startAt, resolveEventZone(b));
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1 * multiplier;
    if (!bDate) return -1 * multiplier;
    return (aDate.toMillis() - bDate.toMillis()) * multiplier;
  });
}

export function filterPublishedEvents(events = [], now = nowInZone()) {
  const nowDateTime = coerceDateTime(now) || nowInZone();
  return events.filter((event) => {
    if (event?.status !== 'published') return false;
    if (!event?.publishAt) return true;
    const publishAt = toDateTime(event.publishAt, resolveEventZone(event));
    return publishAt ? publishAt <= nowDateTime : true;
  });
}

export function filterUpcomingEvents(events = [], now = nowInZone()) {
  const nowDateTime = coerceDateTime(now) || nowInZone();
  return events.filter((event) => {
    const zone = resolveEventZone(event);
    const startAt = toDateTime(event?.startAt, zone);
    const endAt = toDateTime(event?.endAt, zone);
    if (!startAt && !endAt) return false;
    if (endAt) return endAt >= nowDateTime;
    return startAt >= nowDateTime;
  });
}

export function formatEventDateTime(event, { locale = 'en', timezone = 'UTC' } = {}) {
  const zone = timezone || resolveEventZone(event);
  const startAt = toDateTime(event?.startAt, zone);
  const endAt = toDateTime(event?.endAt, zone);
  if (!startAt) return '';
  if (!endAt || startAt.hasSame(endAt, 'day')) {
    const date = formatDate(startAt, { locale, zone });
    const startTime = formatTime(startAt, { locale, zone });
    const endTime = endAt ? formatTime(endAt, { locale, zone }) : null;
    return endTime ? `${date} · ${startTime} – ${endTime}` : `${date} · ${startTime}`;
  }
  const range = formatDateRange({ startDate: startAt, endDate: endAt, locale, zone });
  return range;
}
