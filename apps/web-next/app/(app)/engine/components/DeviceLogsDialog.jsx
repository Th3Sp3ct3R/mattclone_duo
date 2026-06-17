'use client';

import { useEffect, useRef, useState } from 'react';

import { api } from '@julio/api-client';
import { Button, Card, Dialog, ScrollArea } from '@julio/ui';

function formatTimestamp(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString();
}

function levelLabel(level = 'info') {
  return String(level || 'info').toUpperCase();
}

function eventKey(event, index) {
  return event.id || `${event.createdAt || 'event'}:${index}`;
}

function appendEvent(events, event) {
  if (event.id && events.some((item) => item.id === event.id)) return events;
  return [...events.slice(-249), event];
}

export function DeviceLogsDialog({ device, open, onOpenChange }) {
  const [events, setEvents] = useState([]);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('idle');
  const viewportRef = useRef(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!open || !device?._id) return undefined;
    let closed = false;
    setStatus('connecting');

    api.engine
      .getDeviceEvents(device._id, { limit: 100 })
      .then((response) => {
        if (closed) return;
        setEvents(response.events || []);
      })
      .catch(() => {});

    const source = new EventSource(api.engine.deviceEventsStreamUrl(device._id, { limit: 50 }));
    source.addEventListener('open', () => {
      if (!closed) setStatus('live');
    });
    source.addEventListener('device-event', (message) => {
      if (closed || pausedRef.current) return;
      try {
        const event = JSON.parse(message.data || '{}');
        setEvents((current) => appendEvent(current, event));
      } catch {
        // Ignore malformed stream messages; the EventSource will keep the live connection.
      }
    });
    source.addEventListener('error', () => {
      if (!closed) setStatus('reconnecting');
    });

    return () => {
      closed = true;
      source.close();
      setStatus('idle');
    };
  }, [device?._id, open]);

  useEffect(() => {
    if (paused) return;
    viewportRef.current?.scrollTo?.({ top: viewportRef.current.scrollHeight });
  }, [events, paused]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Card>
            <div className="layout-stack-gap-12">
              <div className="layout-inline-gap-8">
                <Dialog.Title>Device Logs</Dialog.Title>
                <span className="Kicker">{device?.name || device?.providerDeviceId || 'Device'}</span>
                <span className="Kicker">{status}</span>
              </div>
              <Dialog.Description>
                Significant engine events only. Raw device logcat is intentionally excluded.
              </Dialog.Description>
              <div className="layout-inline-gap-8">
                <Button size="sm" variant="secondary" onClick={() => setPaused((value) => !value)}>
                  {paused ? 'resume' : 'pause'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEvents([])}>
                  clear
                </Button>
                <Dialog.Close>
                  <Button size="sm" variant="secondary">close</Button>
                </Dialog.Close>
              </div>
              <ScrollArea.Root className="EngineDeviceLogs">
                <ScrollArea.Viewport ref={viewportRef}>
                  <ScrollArea.Content>
                    <div className="layout-stack-gap-8">
                      {events.length ? (
                        events.map((event, index) => (
                          <Card key={eventKey(event, index)}>
                            <div className="layout-stack-gap-8">
                              <div className="layout-inline-gap-8">
                                <span className="Kicker">{formatTimestamp(event.createdAt)}</span>
                                <span className="Kicker">{levelLabel(event.level)}</span>
                                <span className="Kicker">{event.source || 'system'}</span>
                                {event.jobName ? <span className="Kicker">{event.jobName}</span> : null}
                              </div>
                              <div>{event.message}</div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="Kicker">No significant events for this device yet.</div>
                      )}
                    </div>
                  </ScrollArea.Content>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical">
                  <ScrollArea.Thumb />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </div>
          </Card>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
