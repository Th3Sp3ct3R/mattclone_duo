'use client';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@julio/api-client';
import { AnalyticsEvents, trackEvent } from '@julio/analytics';
import { nowInZoneDate, formatDate, toJsDate } from '@julio/shared';
import {
  BookingCalendarDay,
  BookingSummaryCard,
  Button,
  Card,
  Field,
  Input,
  Spinner,
  TimeSlotPicker
} from '@julio/ui';
import { analytics } from '@/src/analytics/client.js';
import { notifications } from '@/src/notifications/client.js';
import { useDictionary } from '@/src/i18n/index.js';

export default function BookingPage() {
  const dict = useDictionary();
  const [services, setServices] = useState([]);
  const [activeServiceId, setActiveServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => nowInZoneDate());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', notes: '' });

  const activeService = useMemo(
    () => services.find((service) => String(service._id) === String(activeServiceId)),
    [services, activeServiceId]
  );

  useEffect(() => {
    let active = true;
    trackEvent(analytics, AnalyticsEvents.PageViewed, { page: 'booking', platform: 'web' });
    async function loadServices() {
      setStatus(null);
      try {
        const data = await api.booking.getServices();
        if (!active) return;
        const list = data.services || [];
        setServices(list);
        if (list.length && !activeServiceId) {
          setActiveServiceId(String(list[0]._id));
        }
      } catch (err) {
        if (!active) return;
        const message = err?.message || dict.booking.errorLoadServices;
        setStatus(message);
        notifications.notify({ title: dict.booking.notificationServicesUnavailable, message });
      }
    }
    loadServices();
    return () => {
      active = false;
    };
  }, [activeServiceId]);

  useEffect(() => {
    let active = true;
    async function loadAvailability() {
      if (!activeServiceId || !selectedDate) return;
      setLoadingSlots(true);
      setStatus(null);
      try {
        const data = await api.booking.getAvailability({
          serviceId: activeServiceId,
          date: selectedDate.toISOString()
        });
        if (!active) return;
        const rawSlots = data.slots || [];
        setSlots(
          rawSlots.map((slot) => ({
            ...slot,
            startAt: toJsDate(slot.startAt),
            endAt: toJsDate(slot.endAt)
          }))
        );
        setSelectedSlot(null);
      } catch (err) {
        if (!active) return;
        const message = err?.message || dict.booking.errorAvailability;
        setStatus(message);
        notifications.notify({ title: dict.booking.notificationAvailabilityError, message });
      } finally {
        if (active) setLoadingSlots(false);
      }
    }
    loadAvailability();
    return () => {
      active = false;
    };
  }, [activeServiceId, selectedDate]);

  async function submitBooking(event) {
    event.preventDefault();
    setStatus(null);
    if (!activeServiceId || !selectedSlot) {
      setStatus(dict.booking.errorMissingSlot);
      return;
    }
    if (!form.customerName || !form.customerEmail) {
      setStatus(dict.booking.errorMissingContact);
      return;
    }
    setSubmitting(true);
    try {
      await api.booking.createBooking({
        serviceId: activeServiceId,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        notes: form.notes
      });
      setStatus(dict.booking.successMessage);
      trackEvent(analytics, AnalyticsEvents.BookingSubmitted, {
        platform: 'web',
        status: 'success'
      });
      setForm({ customerName: '', customerEmail: '', notes: '' });
      setSelectedSlot(null);
    } catch (err) {
      const message = err?.message || dict.booking.notificationFailedMessage;
      setStatus(message);
      notifications.notify({ title: dict.booking.notificationBookingError, message });
      trackEvent(analytics, AnalyticsEvents.BookingSubmitted, {
        platform: 'web',
        status: 'failed'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <main className="container content-container booking-page">
      <div className="layout-stack-gap-24">
        <div className="layout-stack-gap-8">
          <h1>{dict.booking.title}</h1>
          <p className="Kicker">
            {selectedDate
              ? `${dict.booking.availabilityPrefix} ${formatDate(selectedDate, {
                  zone: activeService?.timezone || 'UTC'
                })}`
              : dict.booking.availabilityFallback}
          </p>
        </div>

        {status ? <div className="Error">{String(status)}</div> : null}

        <div className="booking-grid">
          <div className="booking-column">
            <Card>
              <div className="layout-stack-gap-12">
                <label htmlFor="serviceSelect">{dict.booking.serviceLabel}</label>
                <select
                  id="serviceSelect"
                  value={activeServiceId}
                  onChange={(event) => setActiveServiceId(event.target.value)}
                  className="form-select"
                >
                  {services.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <Card>
              <BookingCalendarDay
                value={selectedDate}
                onChange={setSelectedDate}
                timezone={activeService?.timezone || 'UTC'}
              />
            </Card>

            <Card>
              <h3>{dict.booking.availableTimes}</h3>
              {loadingSlots ? (
                <div className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label={dict.booking.loadingAvailabilityLabel} />
                  <span>{dict.booking.loadingAvailabilityCopy}</span>
                </div>
              ) : (
                <TimeSlotPicker
                  slots={slots}
                  value={selectedSlot}
                  onChange={setSelectedSlot}
                  timezone={activeService?.timezone || 'UTC'}
                />
              )}
            </Card>
          </div>

          <div className="layout-stack-gap-16">
            <BookingSummaryCard
              service={activeService}
              date={selectedDate}
              slot={selectedSlot}
              timezone={activeService?.timezone || 'UTC'}
            />
            <Card>
              <h3>{dict.booking.detailsTitle}</h3>
              <form onSubmit={submitBooking} className="layout-stack-gap-12">
                <Field.Root>
                  <Field.Label htmlFor="customerName">{dict.booking.nameLabel}</Field.Label>
                  <Field.Control>
                    <Input
                      id="customerName"
                      value={form.customerName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, customerName: event.target.value }))
                      }
                      placeholder={dict.booking.namePlaceholder}
                    />
                  </Field.Control>
                </Field.Root>
                <Field.Root>
                  <Field.Label htmlFor="customerEmail">{dict.booking.emailLabel}</Field.Label>
                  <Field.Control>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={form.customerEmail}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, customerEmail: event.target.value }))
                      }
                      placeholder={dict.booking.emailPlaceholder}
                    />
                  </Field.Control>
                </Field.Root>
                <Field.Root>
                  <Field.Label htmlFor="bookingNotes">{dict.booking.notesLabel}</Field.Label>
                  <Field.Control>
                    <Input
                      id="bookingNotes"
                      value={form.notes}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder={dict.booking.notesPlaceholder}
                    />
                  </Field.Control>
                </Field.Root>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <span className="layout-inline-gap-8 layout-inline-center">
                      <Spinner size="sm" label={dict.booking.submittingLabel} />
                      <span>{dict.booking.submittingCopy}</span>
                    </span>
                  ) : (
                    dict.booking.submitLabel
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
      </main>
  );
}

