'use client';

import { useEffect, useState } from 'react';

import { NOTIFICATION_EVENT } from '@julio/notifications/web';

const MAXIMUM_RECENT_EVENTS = 6;

function detectLevel({ title, message }) {
  const text = `${title || ''} ${message || ''}`.toLowerCase();
  if (text.includes('fail') || text.includes('error')) return 'error';
  if (text.includes('warn')) return 'warning';
  return 'info';
}

function buildNotificationEntry(payload) {
  if (!payload) return null;
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();
  if (!title && !message) return null;
  return {
    title,
    message,
    level: detectLevel({ title, message }),
    timestamp: new Date().toISOString()
  };
}

export function useRecentNotifications() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const handleNotify = (event) => {
      const entry = buildNotificationEntry(event?.detail);
      if (!entry) return;
      setEvents((prev) => [entry, ...prev].slice(0, MAXIMUM_RECENT_EVENTS));
    };

    window.addEventListener(NOTIFICATION_EVENT, handleNotify);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotify);
  }, []);

  return events;
}
