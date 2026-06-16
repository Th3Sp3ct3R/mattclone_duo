'use client';

import { useMemo, useState } from 'react';

import { formatDate, nowInZone, startOfDay, toJsDate } from '@julio/shared';

import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMonthDays(monthStart) {
  const start = monthStart.startOf('month');
  const offset = start.weekday % 7;
  const gridStart = start.minus({ days: offset });
  return Array.from({ length: 42 }, (_, index) => gridStart.plus({ days: index }));
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.hasSame(b, 'day');
}

export function BookingCalendarDay({
  value,
  onChange,
  timezone = 'UTC',
  locale = 'en',
  minDate,
  maxDate,
  className = ''
}) {
  const selectedDate = useMemo(
    () => (value ? startOfDay(value, { zone: timezone }) : null),
    [value, timezone]
  );

  const resolvedMin = useMemo(
    () => (minDate ? startOfDay(minDate, { zone: timezone }) : null),
    [minDate, timezone]
  );
  const resolvedMax = useMemo(
    () => (maxDate ? startOfDay(maxDate, { zone: timezone }) : null),
    [maxDate, timezone]
  );

  const initialMonth = useMemo(() => {
    const seed = selectedDate || startOfDay(nowInZone({ zone: timezone }), { zone: timezone });
    return seed ? seed.startOf('month') : null;
  }, [selectedDate, timezone]);

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  const months = useMemo(() => {
    if (!visibleMonth) return [];
    return [visibleMonth, visibleMonth.plus({ months: 1 })];
  }, [visibleMonth]);

  function handleDayClick(day) {
    if (!day) return;
    if ((resolvedMin && day < resolvedMin) || (resolvedMax && day > resolvedMax)) return;
    onChange?.(toJsDate(day));
  }

  if (!visibleMonth) return null;

  return (
    <div className={cx('c-BookingCalendarDay', className)}>
      <div className="c-BookingCalendarDay__header">
        <div>
          <div className="c-BookingCalendarDay__title">Select a date</div>
          <div className="c-BookingCalendarDay__subtitle">
            {selectedDate
              ? formatDate(selectedDate, { zone: timezone, locale })
              : 'Choose a date'}
          </div>
        </div>
        <div className="c-BookingCalendarDay__nav">
          <Button
            variant="secondary"
            type="button"
            onClick={() => setVisibleMonth((prev) => prev.minus({ months: 1 }))}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setVisibleMonth((prev) => prev.plus({ months: 1 }))}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="c-BookingCalendarDay__months">
        {months.map((month) => {
          const monthDays = buildMonthDays(month);
          return (
            <div key={month.toISO()} className="c-BookingCalendarDay__month">
              <div className="c-BookingCalendarDay__monthTitle">
                {formatDate(month, { zone: timezone, locale, format: 'LLLL yyyy' })}
              </div>
              <div className="c-BookingCalendarDay__weekdayRow">
                {weekdayLabels.map((label) => (
                  <div key={label} className="c-BookingCalendarDay__weekday">
                    {label}
                  </div>
                ))}
              </div>
              <div className="c-BookingCalendarDay__grid">
                {monthDays.map((day) => {
                  const dayStart = day.startOf('day');
                  const isOutside = !dayStart.hasSame(month, 'month');
                  const isDisabled =
                    (resolvedMin && dayStart < resolvedMin) || (resolvedMax && dayStart > resolvedMax);
                  const isSelected = isSameDay(dayStart, selectedDate);
                  const classes = cx(
                    'c-BookingCalendarDay__day',
                    isOutside && 'is-outside',
                    isDisabled && 'is-disabled',
                    isSelected && 'is-selected'
                  );
                  return (
                    <button
                      key={dayStart.toISO()}
                      type="button"
                      className={classes}
                      onClick={() => handleDayClick(dayStart)}
                      disabled={isDisabled}
                    >
                      {dayStart.day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

