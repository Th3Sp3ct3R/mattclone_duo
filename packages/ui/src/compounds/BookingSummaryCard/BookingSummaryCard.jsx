'use client';

import { formatDate, formatTime } from '@julio/shared';

import { Card } from '../../primitives/Card/Card.jsx';
import { cx } from '../../primitives/_utils/cx.js';

function formatPrice({ priceCents = 0, currency = 'USD' }) {
  if (!priceCents) return 'Free';
  const value = priceCents / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency
  }).format(value);
}

export function BookingSummaryCard({
  service,
  date,
  slot,
  className = '',
  timezone = 'UTC',
  locale = 'en'
}) {
  const dateLabel = date
    ? formatDate(date, { zone: timezone, locale })
    : 'Select a date';
  const timeLabel =
    slot?.startAt && slot?.endAt
      ? `${formatTime(slot.startAt, { zone: timezone, locale })} – ${formatTime(slot.endAt, {
          zone: timezone,
          locale
        })}`
      : 'Select a time';
  const priceLabel = service ? formatPrice(service) : '—';

  return (
    <Card className={cx('c-BookingSummaryCard', className)}>
      <div className="c-BookingSummaryCard__title">{service?.name || 'Booking summary'}</div>
      <div className="c-BookingSummaryCard__row">
        <span>Date</span>
        <span>{dateLabel}</span>
      </div>
      <div className="c-BookingSummaryCard__row">
        <span>Time</span>
        <span>{timeLabel}</span>
      </div>
      <div className="c-BookingSummaryCard__row">
        <span>Price</span>
        <span>{priceLabel}</span>
      </div>
    </Card>
  );
}

