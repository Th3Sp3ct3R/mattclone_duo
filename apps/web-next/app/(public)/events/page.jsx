'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api } from '@julio/api-client';
import { filterUpcomingEvents, formatEventDateTime, sortEventsByStart } from '@julio/events';
import { buildLocalePath, nowInZoneDate } from '@julio/shared';
import {
  Card,
  EventCalendar,
  EventCard,
  Section,
  SectionBand,
  Button
} from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { getLocaleFromDocument, useDictionary } from '@/src/i18n/index.js';

const CALENDAR_TIMEZONE = 'UTC';

export default function EventsIndexPage() {
  const dict = useDictionary();
  const locale = getLocaleFromDocument();
  const CALENDAR_VIEWS = [
    { value: 'week', label: dict.events.week },
    { value: 'month', label: dict.events.month }
  ];
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => nowInZoneDate({ zone: CALENDAR_TIMEZONE }));
  const [view, setView] = useState('month');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus(null);
      setLoading(true);
      try {
        const data = await api.events.public.getEvents();
        if (active) setEvents(data.events || []);
      } catch (err) {
        if (!active) return;
        const message = err?.message || dict.events.loadError;
        setStatus(message);
        notifications.notify({ title: dict.events.unavailableTitle, message });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const upcomingEvents = useMemo(
    () => sortEventsByStart(filterUpcomingEvents(events)),
    [events]
  );

  return (
    <div>
      <main>
        <SectionBand tone="light">
          <div className="container content-container">
            <Section
              eyebrow={dict.events.eyebrow}
              title={dict.events.title}
              description={dict.events.description}
            >
              {status ? <div className="Error">{String(status)}</div> : null}
              <div className="EventsCalendarToolbar">
                <div className="layout-inline-gap-8">
                  {CALENDAR_VIEWS.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      variant={view === item.value ? 'primary' : 'secondary'}
                      onClick={() => setView(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Card className="EventsCalendarCard" aria-busy={loading}>
                <EventCalendar
                  events={events}
                  value={selectedDate}
                  onChange={setSelectedDate}
                  view={view}
                  timezone={CALENDAR_TIMEZONE}
                  renderEventLink={({ event, className, children }) => (
                    <Link href={buildLocalePath(`/events/${event.slug}`, locale)} className={className}>
                      {children}
                    </Link>
                  )}
                />
              </Card>
            </Section>
          </div>
        </SectionBand>

        <SectionBand tone="dark">
          <div className="container content-container">
            <Section
              eyebrow={dict.events.upcomingEyebrow}
              title={dict.events.upcomingTitle}
              description={dict.events.upcomingDescription}
            >
              <div className="EventsList">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event._id}
                    title={event.title}
                    summary={event.summary}
                    meta={formatEventDateTime(event)}
                    location={event.location}
                    href={buildLocalePath(`/events/${event.slug}`, locale)}
                    renderLink={({ href, className, children }) => (
                      <Link href={href} className={className}>
                        {children}
                      </Link>
                    )}
                  />
                ))}
                {!upcomingEvents.length && !loading ? (
                  <Card className="EventsEmptyCard">
                    <strong>{dict.events.emptyTitle}</strong>
                    <div className="Kicker">{dict.events.emptyDescription}</div>
                  </Card>
                ) : null}
              </div>
            </Section>
          </div>
        </SectionBand>
      </main>
    </div>
  );
}
