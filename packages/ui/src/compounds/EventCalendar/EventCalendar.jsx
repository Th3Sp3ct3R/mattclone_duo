'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  formatDate,
  formatDateRange,
  formatTime,
  nowInZone,
  resolveDateOnlyKey,
  startOfDay,
  toJsDate
} from '@julio/shared';
import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildMonthDays(monthStart) {
  const start = monthStart.startOf('month');
  const offset = (start.weekday + 6) % 7;
  const gridStart = start.minus({ days: offset });
  return Array.from({ length: 42 }, (_, index) => gridStart.plus({ days: index }));
}

function resolveEventLink({ event, renderEventLink, className, children }) {
  if (typeof renderEventLink === 'function') {
    return renderEventLink({ event, className, children });
  }
  return <span className={className}>{children}</span>;
}

export function EventCalendar({
  events = [],
  value,
  onChange,
  view = 'month',
  timezone = 'UTC',
  locale = 'en',
  className = '',
  renderEventLink
}) {
  const selectedDate = useMemo(
    () => (value ? startOfDay(value, { zone: timezone }) : null),
    [value, timezone]
  );

  const initialMonth = useMemo(() => {
    const seed = selectedDate || startOfDay(nowInZone({ zone: timezone }), { zone: timezone });
    return seed ? seed.startOf('month') : null;
  }, [selectedDate, timezone]);

  const initialWeekStart = useMemo(() => {
    const seed = selectedDate || startOfDay(nowInZone({ zone: timezone }), { zone: timezone });
    return seed ? seed.startOf('week') : null;
  }, [selectedDate, timezone]);

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [visibleWeekStart, setVisibleWeekStart] = useState(initialWeekStart);

  useEffect(() => {
    if (!selectedDate) return;
    if (view === 'month') {
      setVisibleMonth(selectedDate.startOf('month'));
    } else {
      setVisibleWeekStart(selectedDate.startOf('week'));
    }
  }, [selectedDate, view]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = resolveDateOnlyKey(event?.startAt, { zone: timezone });
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [events, timezone]);

  function handleDayClick(day) {
    if (!day) return;
    onChange?.(toJsDate(day));
  }

  const monthDays = useMemo(() => {
    if (!visibleMonth) return [];
    return buildMonthDays(visibleMonth);
  }, [visibleMonth]);

  const weekDays = useMemo(() => {
    if (!visibleWeekStart) return [];
    return Array.from({ length: 7 }, (_, index) => visibleWeekStart.plus({ days: index }));
  }, [visibleWeekStart]);

  const periodLabel = useMemo(() => {
    if (view === 'week') {
      const end = visibleWeekStart ? visibleWeekStart.plus({ days: 6 }) : null;
      if (!visibleWeekStart || !end) return '';
      return formatDateRange({
        startDate: visibleWeekStart,
        endDate: end,
        zone: timezone,
        locale
      });
    }
    return visibleMonth ? formatDate(visibleMonth, { zone: timezone, locale, format: 'LLLL yyyy' }) : '';
  }, [view, visibleWeekStart, visibleMonth, timezone, locale]);

  return (
    <div className={cx('c-EventCalendar', className)}>
      <div className="c-EventCalendar__header">
        <div>
          <div className="c-EventCalendar__title">
            {view === 'week' ? 'Week view' : 'Month view'}
          </div>
          <div className="c-EventCalendar__subtitle">{periodLabel}</div>
        </div>
        <div className="c-EventCalendar__nav">
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              if (view === 'workweek') {
                setVisibleWeekStart((prev) => prev.minus({ weeks: 1 }));
                return;
              }
              setVisibleMonth((prev) => prev.minus({ months: 1 }));
            }}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              if (view === 'workweek') {
                setVisibleWeekStart((prev) => prev.plus({ weeks: 1 }));
                return;
              }
              setVisibleMonth((prev) => prev.plus({ months: 1 }));
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {view === 'week' ? (
        <div className="c-EventCalendar__week">
          <div className="c-EventCalendar__weekdayRow">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="c-EventCalendar__weekday">
                {label}
              </div>
            ))}
          </div>
          <div className="c-EventCalendar__weekGrid">
            {weekDays.map((day) => {
              const dayKey = resolveDateOnlyKey(day, { zone: timezone });
              const dayEvents = eventsByDate.get(dayKey) || [];
              const isSelected = selectedDate ? day.hasSame(selectedDate, 'day') : false;
              const displayEvents = dayEvents.slice(0, 5);
              const moreCount = dayEvents.length - displayEvents.length;
              return (
                <button
                  key={day.toISO()}
                  type="button"
                  className={cx('c-EventCalendar__cell', isSelected && 'is-selected')}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="c-EventCalendar__cellHeader">
                    <span className="c-EventCalendar__dayNumber">{day.day}</span>
                    <span className="c-EventCalendar__dayLabel">
                      {formatDate(day, { zone: timezone, locale, format: 'ccc' })}
                    </span>
                  </div>
                  <div className="c-EventCalendar__cellEvents">
                    {displayEvents.map((event) => (
                      <div key={event._id || event.slug} className="c-EventCalendar__event">
                        {resolveEventLink({
                          event,
                          renderEventLink,
                          className: 'c-EventCalendar__eventLink',
                          children: (
                            <>
                              <span className="c-EventCalendar__eventTime">
                                {formatTime(event.startAt, { zone: timezone, locale })}
                              </span>
                              <span className="c-EventCalendar__eventTitle">{event.title}</span>
                            </>
                          )
                        })}
                      </div>
                    ))}
                    {moreCount > 0 ? (
                      <div className="c-EventCalendar__eventMore">+{moreCount} more</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="c-EventCalendar__month">
          <div className="c-EventCalendar__weekdayRow">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="c-EventCalendar__weekday">
                {label}
              </div>
            ))}
          </div>
          <div className="c-EventCalendar__monthGrid">
            {monthDays.map((day) => {
              const dayStart = day.startOf('day');
              const dayKey = resolveDateOnlyKey(dayStart, { zone: timezone });
              const dayEvents = eventsByDate.get(dayKey) || [];
              const isOutside = !dayStart.hasSame(visibleMonth, 'month');
              const isSelected = selectedDate ? dayStart.hasSame(selectedDate, 'day') : false;
              const displayEvents = dayEvents.slice(0, 2);
              const moreCount = dayEvents.length - displayEvents.length;
              return (
                <button
                  key={dayStart.toISO()}
                  type="button"
                  className={cx(
                    'c-EventCalendar__cell',
                    isOutside && 'is-outside',
                    isSelected && 'is-selected'
                  )}
                  onClick={() => handleDayClick(dayStart)}
                >
                  <div className="c-EventCalendar__cellHeader">
                    <span className="c-EventCalendar__dayNumber">{dayStart.day}</span>
                  </div>
                  <div className="c-EventCalendar__cellEvents">
                    {displayEvents.map((event) => (
                      <div key={event._id || event.slug} className="c-EventCalendar__event">
                        {resolveEventLink({
                          event,
                          renderEventLink,
                          className: 'c-EventCalendar__eventLink',
                          children: (
                            <>
                              <span className="c-EventCalendar__eventTime">
                                {formatTime(event.startAt, { zone: timezone, locale })}
                              </span>
                              <span className="c-EventCalendar__eventTitle">{event.title}</span>
                            </>
                          )
                        })}
                      </div>
                    ))}
                    {moreCount > 0 ? (
                      <div className="c-EventCalendar__eventMore">+{moreCount} more</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
