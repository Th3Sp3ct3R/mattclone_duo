'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api } from '@julio/api-client';
import { formatEventDateTime } from '@julio/events';
import { buildLocalePath } from '@julio/shared';
import { Button, Card, ConfirmDialog, DataTable, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { getLocaleFromDocument } from '@/src/i18n/index.js';

export default function EventsAdminListPage() {
  const locale = getLocaleFromDocument();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    setStatus(null);
    setLoading(true);
    try {
      const data = await api.events.getEvents();
      setEvents(data.events || []);
    } catch (err) {
      const message = err?.message || 'Failed to load events';
      setStatus(message);
      notifications.notify({ title: 'Event load failed', message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents().catch(() => {});
  }, [loadEvents]);

  async function removeEvent(eventId) {
    if (!eventId) return;
    setStatus(null);
    try {
      await api.events.deleteEvent(eventId);
      await loadEvents();
      notifications.notify({ title: 'Event deleted', message: 'The event was removed.' });
    } catch (err) {
      const message = err?.message || 'Failed to delete event';
      setStatus(message);
      notifications.notify({ title: 'Delete failed', message });
    }
  }

  const publishEvent = useCallback(async (event) => {
    const eventId = event?._id || event?.id;
    if (!eventId) return;
    setStatus(null);
    setPublishingId(eventId);
    try {
      const payload = {
        ...event,
        status: 'published',
        publishAt: new Date().toISOString()
      };
      await api.events.updateEvent(eventId, payload);
      await loadEvents();
      notifications.notify({ title: 'Event published', message: 'The event is now live.' });
    } catch (err) {
      const message = err?.message || 'Failed to publish event';
      setStatus(message);
      notifications.notify({ title: 'Publish failed', message });
    } finally {
      setPublishingId(null);
    }
  }, [loadEvents]);

  const columns = useMemo(
    () => [
      {
        header: 'Event',
        accessorKey: 'title',
        cell: ({ row }) => (
          <div>
            <strong>{row.original.title}</strong>
            <div className="Kicker">
              {row.original.location || 'No location'} · {row.original.slug || 'No slug'}
            </div>
          </div>
        )
      },
      {
        header: 'When',
        accessorKey: 'startAt',
        cell: ({ row }) => formatEventDateTime(row.original) || '—'
      },
      {
        header: 'Status',
        accessorKey: 'status'
      },
      {
        header: 'Actions',
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="layout-inline-gap-8">
            <Link href={buildLocalePath(`/admin/events/${row.original._id}`, locale)}>
              <Button variant="secondary">Edit</Button>
            </Link>
            {row.original.status === 'draft' ? (
              <Button
                loading={publishingId === row.original._id}
                loadingLabel="Publishing"
                onClick={() => publishEvent(row.original)}
              >
                Publish
              </Button>
            ) : null}
            <Button
              variant="danger"
              onClick={() => {
                setPendingDeleteEvent(row.original);
                setConfirmOpen(true);
              }}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    [locale, publishEvent, publishingId]
  );

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete event"
        description="This action cannot be undone."
        confirmLabel="Delete event"
        onConfirm={() => {
          const eventId = pendingDeleteEvent?._id || pendingDeleteEvent?.id;
          if (eventId) removeEvent(eventId);
          setPendingDeleteEvent(null);
        }}
      />
      <div className="layout-inline-between layout-inline-center">
        <div className="page-section-header">
          <h1>Events</h1>
          <p className="Kicker">Manage and publish events for the public calendar.</p>
        </div>
        <Link href={buildLocalePath('/admin/events/new', locale)}>
          <Button>New event</Button>
        </Link>
      </div>

      {status ? <div className="Error">{String(status)}</div> : null}

      <Card className="layout-stack-gap-12">
        <div className="layout-inline-gap-8 layout-inline-center">
          <strong>All events</strong>
          {loading ? (
            <span className="layout-inline-gap-8 layout-inline-center text-muted">
              <Spinner size="sm" label="Loading events" />
              <span>Loading events…</span>
            </span>
          ) : null}
        </div>
        <DataTable columns={columns} data={events} emptyMessage="No events yet." />
      </Card>
    </div>
  );
}
