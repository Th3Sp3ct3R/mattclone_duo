'use client';

import { coerceDateTime, formatTime } from '@julio/shared';

import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

function isSameSlot(slot, selected) {
  if (!slot || !selected) return false;
  const slotStart = coerceDateTime(slot.startAt)?.toMillis() ?? null;
  const selectedStart = coerceDateTime(selected.startAt || selected)?.toMillis() ?? null;
  if (!slotStart || !selectedStart) return false;
  return slotStart === selectedStart;
}

export function TimeSlotPicker({
  slots = [],
  value,
  onChange,
  timezone = 'UTC',
  locale = 'en',
  className = ''
}) {
  if (!slots.length) {
    return <div className={cx('c-TimeSlotPicker', className)}>No available times.</div>;
  }

  return (
    <div className={cx('c-TimeSlotPicker', className)}>
      {slots.map((slot) => {
        const label = `${formatTime(slot.startAt, { zone: timezone, locale })} – ${formatTime(
          slot.endAt,
          { zone: timezone, locale }
        )}`;
        const selected = isSameSlot(slot, value);
        return (
          <Button
            key={`${slot.startAt}-${slot.endAt}`}
            variant={selected ? 'primary' : 'secondary'}
            type="button"
            className={cx('c-TimeSlotPicker__button', selected && 'is-selected')}
            onClick={() => onChange?.(slot)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

