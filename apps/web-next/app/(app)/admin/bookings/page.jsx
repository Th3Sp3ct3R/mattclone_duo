'use client';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@julio/api-client';
import { formatDate, formatTime, resolveTimezone } from '@julio/shared';
import {
  Button,
  Card,
  DataTable,
  Field,
  Input,
  NestedTabNavigator,
  Spinner,
  Switch,
  TimezoneSelect
} from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function minutesToTime(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return '';
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function buildDefaultWeeklyRules() {
  return DAY_LABELS.map((label, index) => ({
    dayOfWeek: index,
    label,
    isClosed: index === 0 || index === 6,
    startTime: '09:00',
    endTime: '17:00'
  }));
}

function mapAvailabilityToState(availability) {
  const base = buildDefaultWeeklyRules();
  const rules = availability?.weeklyRules || [];
  rules.forEach((rule) => {
    const entry = base.find((item) => item.dayOfWeek === rule.dayOfWeek);
    if (!entry) return;
    entry.isClosed = false;
    entry.startTime = minutesToTime(rule.startMinutes);
    entry.endTime = minutesToTime(rule.endMinutes);
  });

  const dateOverrides = (availability?.dateOverrides || []).map((entry) => ({
    date: entry.date ? formatDate(entry.date, { format: 'yyyy-LL-dd' }) : '',
    isClosed: entry.isClosed || false,
    startTime: entry.windows?.[0] ? minutesToTime(entry.windows[0].startMinutes) : '09:00',
    endTime: entry.windows?.[0] ? minutesToTime(entry.windows[0].endMinutes) : '17:00'
  }));

  const blackoutDates = (availability?.blackoutDates || []).map((date) =>
    formatDate(date, { format: 'yyyy-LL-dd' })
  );

  return {
    timezone: resolveTimezone(availability?.timezone),
    weeklyRules: base,
    dateOverrides,
    blackoutDates,
    newBlackoutDate: ''
  };
}

const emptyServiceForm = {
  name: '',
  slug: '',
  description: '',
  timezone: 'UTC',
  durationMinutes: 30,
  stepMinutes: 30,
  bufferMinutes: 0,
  minimumNoticeMinutes: 0,
  bookingWindowDays: 60,
  priceCents: 0,
  currency: 'USD',
  active: true,
  requiresPayment: false
};

export default function AdminBookingsPage() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [activeServiceId, setActiveServiceId] = useState('');
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [availabilityForm, setAvailabilityForm] = useState(mapAvailabilityToState(null));
  const [status, setStatus] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadBookings() {
    setLoadingBookings(true);
    setStatus(null);
    try {
      const data = await api.admin.getBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      const message = err?.message || 'Failed to load bookings';
      setStatus(message);
      notifications.notify({ title: 'Bookings load failed', message });
    } finally {
      setLoadingBookings(false);
    }
  }

  async function loadServices() {
    setLoadingServices(true);
    setStatus(null);
    try {
      const data = await api.admin.getBookingServices();
      const list = data.services || [];
      setServices(list);
      if (list.length && !activeServiceId) {
        setActiveServiceId(String(list[0]._id));
      }
    } catch (err) {
      const message = err?.message || 'Failed to load services';
      setStatus(message);
      notifications.notify({ title: 'Services load failed', message });
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadAvailability(serviceId) {
    if (!serviceId) return;
    setLoadingAvailability(true);
    setStatus(null);
    try {
      const data = await api.admin.getBookingAvailability(serviceId);
      setAvailabilityForm(mapAvailabilityToState(data.availability));
    } catch (err) {
      const message = err?.message || 'Failed to load availability';
      setStatus(message);
      notifications.notify({ title: 'Availability load failed', message });
    } finally {
      setLoadingAvailability(false);
    }
  }

  useEffect(() => {
    loadBookings().catch(() => {});
    loadServices().catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeServiceId) {
      setServiceForm(emptyServiceForm);
      setAvailabilityForm(mapAvailabilityToState(null));
      return;
    }
    const selected = services.find((service) => String(service._id) === String(activeServiceId));
    if (selected) {
      setServiceForm({
        name: selected.name || '',
        slug: selected.slug || '',
        description: selected.description || '',
        timezone: resolveTimezone(selected.timezone),
        durationMinutes: selected.durationMinutes || 30,
        stepMinutes: selected.stepMinutes || 30,
        bufferMinutes: selected.bufferMinutes || 0,
        minimumNoticeMinutes: selected.minimumNoticeMinutes || 0,
        bookingWindowDays: selected.bookingWindowDays || 60,
        priceCents: selected.priceCents || 0,
        currency: selected.currency || 'USD',
        active: Boolean(selected.active),
        requiresPayment: Boolean(selected.requiresPayment)
      });
    }
    loadAvailability(activeServiceId).catch(() => {});
  }, [activeServiceId, services]);

  const bookingColumns = useMemo(
    () => [
      {
        header: 'Customer',
        accessorKey: 'customerName',
        cell: ({ row }) => (
          <div>
            <strong>{row.original.customerName || '—'}</strong>
            <div className="Kicker">{row.original.customerEmail || '—'}</div>
          </div>
        )
      },
      {
        header: 'Service',
        accessorKey: 'serviceName'
      },
      {
        header: 'Date',
        accessorKey: 'startAt',
        cell: ({ row }) =>
          row.original.startAt ? formatDate(row.original.startAt, { format: 'DDD' }) : '—'
      },
      {
        header: 'Time',
        id: 'time',
        cell: ({ row }) => {
          if (!row.original.startAt || !row.original.endAt) return '—';
          return `${formatTime(row.original.startAt)} – ${formatTime(row.original.endAt)}`;
        }
      },
      {
        header: 'Status',
        accessorKey: 'status'
      }
    ],
    []
  );

  const serviceColumns = useMemo(
    () => [
      {
        header: 'Service',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <strong>{row.original.name}</strong>
            <div className="Kicker">{row.original.slug}</div>
          </div>
        )
      },
      {
        header: 'Active',
        accessorKey: 'active',
        cell: ({ row }) => (row.original.active ? 'Yes' : 'No')
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant="secondary"
            onClick={() => {
              setActiveTab('services');
              setActiveServiceId(String(row.original._id));
            }}
          >
            Edit
          </Button>
        )
      }
    ],
    []
  );

  async function saveService(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      if (!serviceForm.name || !serviceForm.slug) {
        setStatus('Service name and slug are required.');
        return;
      }
      if (activeServiceId) {
        await api.admin.updateBookingService(activeServiceId, serviceForm);
        notifications.notify({ title: 'Service updated', message: 'Service saved.' });
      } else {
        const data = await api.admin.createBookingService(serviceForm);
        if (data.service?._id) {
          setActiveServiceId(String(data.service._id));
        }
        notifications.notify({ title: 'Service created', message: 'Service saved.' });
      }
      await loadServices();
      setStatus('Service saved.');
    } catch (err) {
      const message = err?.message || 'Failed to save service';
      setStatus(message);
      notifications.notify({ title: 'Service save failed', message });
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailability(event) {
    event.preventDefault();
    if (!activeServiceId) return;
    setSaving(true);
    setStatus(null);
    try {
      const weeklyRules = availabilityForm.weeklyRules
        .filter((rule) => !rule.isClosed)
        .map((rule) => ({
          dayOfWeek: rule.dayOfWeek,
          startMinutes: timeToMinutes(rule.startTime),
          endMinutes: timeToMinutes(rule.endTime)
        }))
        .filter((rule) => Number.isFinite(rule.startMinutes) && Number.isFinite(rule.endMinutes));

      const dateOverrides = availabilityForm.dateOverrides.map((entry) => ({
        date: entry.date,
        isClosed: entry.isClosed,
        windows: entry.isClosed
          ? []
          : [
              {
                startMinutes: timeToMinutes(entry.startTime),
                endMinutes: timeToMinutes(entry.endTime)
              }
            ]
      }));

      const payload = {
        serviceId: activeServiceId,
        timezone: availabilityForm.timezone,
        weeklyRules,
        dateOverrides,
        blackoutDates: availabilityForm.blackoutDates
      };

      await api.admin.updateBookingAvailability(payload);
      setStatus('Availability saved.');
      notifications.notify({
        title: 'Availability updated',
        message: 'Booking availability saved.'
      });
    } catch (err) {
      const message = err?.message || 'Failed to save availability';
      setStatus(message);
      notifications.notify({ title: 'Availability save failed', message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-section-stack" aria-busy={loadingBookings || loadingServices || loadingAvailability}>
      <div className="page-section-header">
        <h1>Bookings</h1>
        <p className="Kicker">Manage appointments, services, and availability.</p>
      </div>

      {status ? <div className="Error">{String(status)}</div> : null}

      <NestedTabNavigator
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          {
            value: 'bookings',
            label: 'Bookings',
            content: (
              loadingBookings ? (
                <Card className="layout-stack-gap-12">
                  <div className="layout-inline-gap-8 layout-inline-center text-muted">
                    <Spinner size="sm" label="Loading bookings" />
                    <span>Loading bookings…</span>
                  </div>
                </Card>
              ) : (
                <DataTable columns={bookingColumns} data={bookings} emptyMessage="No bookings yet." />
              )
            )
          },
          {
            value: 'services',
            label: 'Services',
            content: (
              <div className="layout-stack-gap-16">
                {loadingServices ? (
                  <Card className="layout-stack-gap-12">
                    <div className="layout-inline-gap-8 layout-inline-center text-muted">
                      <Spinner size="sm" label="Loading services" />
                      <span>Loading services…</span>
                    </div>
                  </Card>
                ) : (
                  <DataTable columns={serviceColumns} data={services} emptyMessage="No services yet." />
                )}
                <Card>
                  <h3>Edit service</h3>
                  <form onSubmit={saveService} className="layout-stack-gap-12">
                    <div className="layout-stack-gap-6">
                      <label htmlFor="serviceSelect">Active service</label>
                      <select
                        id="serviceSelect"
                        value={activeServiceId}
                        onChange={(event) => setActiveServiceId(event.target.value)}
                        className="form-select"
                      >
                        <option value="">Create new</option>
                        {services.map((service) => (
                          <option key={service._id} value={service._id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid">
                      <Field.Root>
                        <Field.Label htmlFor="serviceName">Name</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceName"
                            value={serviceForm.name}
                            onChange={(event) =>
                              setServiceForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceSlug">Slug</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceSlug"
                            value={serviceForm.slug}
                            onChange={(event) =>
                              setServiceForm((prev) => ({ ...prev, slug: event.target.value }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceTimezone">Timezone</Field.Label>
                        <Field.Control>
                          <TimezoneSelect
                            id="serviceTimezone"
                            value={serviceForm.timezone}
                            onChange={(event) =>
                              setServiceForm((prev) => ({ ...prev, timezone: event.target.value }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceDuration">Duration (minutes)</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceDuration"
                            type="number"
                            value={serviceForm.durationMinutes}
                            onChange={(event) =>
                              setServiceForm((prev) => ({
                                ...prev,
                                durationMinutes: Number(event.target.value)
                              }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceStep">Step (minutes)</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceStep"
                            type="number"
                            value={serviceForm.stepMinutes}
                            onChange={(event) =>
                              setServiceForm((prev) => ({
                                ...prev,
                                stepMinutes: Number(event.target.value)
                              }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceBuffer">Buffer (minutes)</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceBuffer"
                            type="number"
                            value={serviceForm.bufferMinutes}
                            onChange={(event) =>
                              setServiceForm((prev) => ({
                                ...prev,
                                bufferMinutes: Number(event.target.value)
                              }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceNotice">Minimum notice (minutes)</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceNotice"
                            type="number"
                            value={serviceForm.minimumNoticeMinutes}
                            onChange={(event) =>
                              setServiceForm((prev) => ({
                                ...prev,
                                minimumNoticeMinutes: Number(event.target.value)
                              }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceWindow">Booking window (days)</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceWindow"
                            type="number"
                            value={serviceForm.bookingWindowDays}
                            onChange={(event) =>
                              setServiceForm((prev) => ({
                                ...prev,
                                bookingWindowDays: Number(event.target.value)
                              }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="servicePrice">Price (cents)</Field.Label>
                        <Field.Control>
                          <Input
                            id="servicePrice"
                            type="number"
                            value={serviceForm.priceCents}
                            onChange={(event) =>
                              setServiceForm((prev) => ({
                                ...prev,
                                priceCents: Number(event.target.value)
                              }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceCurrency">Currency</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceCurrency"
                            value={serviceForm.currency}
                            onChange={(event) =>
                              setServiceForm((prev) => ({ ...prev, currency: event.target.value }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label htmlFor="serviceDescription">Description</Field.Label>
                        <Field.Control>
                          <Input
                            id="serviceDescription"
                            value={serviceForm.description}
                            onChange={(event) =>
                              setServiceForm((prev) => ({ ...prev, description: event.target.value }))
                            }
                          />
                        </Field.Control>
                      </Field.Root>
                    </div>

                    <div className="layout-inline-gap-16 layout-inline-center">
                      <label className="layout-inline-gap-8 layout-inline-center">
                        <Switch.Root
                          checked={serviceForm.active}
                          onCheckedChange={(checked) =>
                            setServiceForm((prev) => ({ ...prev, active: checked }))
                          }
                        >
                          <Switch.Thumb />
                        </Switch.Root>
                        Active
                      </label>
                      <label className="layout-inline-gap-8 layout-inline-center">
                        <Switch.Root
                          checked={serviceForm.requiresPayment}
                          onCheckedChange={(checked) =>
                            setServiceForm((prev) => ({ ...prev, requiresPayment: checked }))
                          }
                        >
                          <Switch.Thumb />
                        </Switch.Root>
                        Requires payment
                      </label>
                    </div>

                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <span className="layout-inline-gap-8 layout-inline-center">
                          <Spinner size="sm" label="Saving service" />
                          <span>Saving…</span>
                        </span>
                      ) : (
                        'Save service'
                      )}
                    </Button>
                  </form>
                </Card>
              </div>
            )
          },
          {
            value: 'availability',
            label: 'Availability',
            content: (
              <Card>
                <h3>Availability rules</h3>
                {loadingAvailability ? (
                  <div className="layout-inline-gap-8 layout-inline-center text-muted layout-top-space-8">
                    <Spinner size="sm" label="Loading availability rules" />
                    <span>Loading availability…</span>
                  </div>
                ) : null}
                <form onSubmit={saveAvailability} className="layout-stack-gap-16">
                  <Field.Root>
                    <Field.Label htmlFor="availabilityTimezone">Timezone</Field.Label>
                    <Field.Control>
                      <TimezoneSelect
                        id="availabilityTimezone"
                        value={availabilityForm.timezone}
                        onChange={(event) =>
                          setAvailabilityForm((prev) => ({
                            ...prev,
                            timezone: event.target.value
                          }))
                        }
                      />
                    </Field.Control>
                  </Field.Root>

                  <div className="layout-stack-gap-12">
                    <h4>Weekly schedule</h4>
                    {availabilityForm.weeklyRules.map((rule) => (
                      <div
                        key={rule.dayOfWeek}
                        className="availability-week-grid"
                      >
                        <div className="layout-inline-center">{rule.label}</div>
                        <Input
                          type="time"
                          value={rule.startTime}
                          onChange={(event) =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              weeklyRules: prev.weeklyRules.map((item) =>
                                item.dayOfWeek === rule.dayOfWeek
                                  ? { ...item, startTime: event.target.value }
                                  : item
                              )
                            }))
                          }
                          disabled={rule.isClosed}
                        />
                        <Input
                          type="time"
                          value={rule.endTime}
                          onChange={(event) =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              weeklyRules: prev.weeklyRules.map((item) =>
                                item.dayOfWeek === rule.dayOfWeek
                                  ? { ...item, endTime: event.target.value }
                                  : item
                              )
                            }))
                          }
                          disabled={rule.isClosed}
                        />
                        <label className="layout-inline-gap-8 layout-inline-center">
                          <Switch.Root
                            checked={rule.isClosed}
                            onCheckedChange={(checked) =>
                              setAvailabilityForm((prev) => ({
                                ...prev,
                                weeklyRules: prev.weeklyRules.map((item) =>
                                  item.dayOfWeek === rule.dayOfWeek
                                    ? { ...item, isClosed: checked }
                                    : item
                                )
                              }))
                            }
                          >
                            <Switch.Thumb />
                          </Switch.Root>
                          Closed
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="layout-stack-gap-12">
                    <h4>Date overrides</h4>
                    {availabilityForm.dateOverrides.map((entry, index) => (
                      <div
                        key={`${entry.date}-${index}`}
                        className="availability-date-grid"
                      >
                        <Input
                          type="date"
                          value={entry.date}
                          onChange={(event) =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              dateOverrides: prev.dateOverrides.map((item, idx) =>
                                idx === index ? { ...item, date: event.target.value } : item
                              )
                            }))
                          }
                        />
                        <Input
                          type="time"
                          value={entry.startTime}
                          onChange={(event) =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              dateOverrides: prev.dateOverrides.map((item, idx) =>
                                idx === index ? { ...item, startTime: event.target.value } : item
                              )
                            }))
                          }
                          disabled={entry.isClosed}
                        />
                        <Input
                          type="time"
                          value={entry.endTime}
                          onChange={(event) =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              dateOverrides: prev.dateOverrides.map((item, idx) =>
                                idx === index ? { ...item, endTime: event.target.value } : item
                              )
                            }))
                          }
                          disabled={entry.isClosed}
                        />
                        <label className="layout-inline-gap-8 layout-inline-center">
                          <Switch.Root
                            checked={entry.isClosed}
                            onCheckedChange={(checked) =>
                              setAvailabilityForm((prev) => ({
                                ...prev,
                                dateOverrides: prev.dateOverrides.map((item, idx) =>
                                  idx === index ? { ...item, isClosed: checked } : item
                                )
                              }))
                            }
                          >
                            <Switch.Thumb />
                          </Switch.Root>
                          Closed
                        </label>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() =>
                        setAvailabilityForm((prev) => ({
                          ...prev,
                          dateOverrides: [
                            ...prev.dateOverrides,
                            { date: '', isClosed: false, startTime: '09:00', endTime: '17:00' }
                          ]
                        }))
                      }
                    >
                      Add date override
                    </Button>
                  </div>

                  <div className="layout-stack-gap-12">
                    <h4>Blackout dates</h4>
                    <div className="layout-inline-gap-8 layout-inline-wrap">
                      {availabilityForm.blackoutDates.map((date, index) => (
                        <Button
                          key={`${date}-${index}`}
                          variant="secondary"
                          type="button"
                          onClick={() =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              blackoutDates: prev.blackoutDates.filter((_, idx) => idx !== index)
                            }))
                          }
                        >
                          {date} ✕
                        </Button>
                      ))}
                    </div>
                    <div className="layout-inline-gap-8">
                      <Input
                        type="date"
                        value={availabilityForm.newBlackoutDate || ''}
                        onChange={(event) =>
                          setAvailabilityForm((prev) => ({
                            ...prev,
                            newBlackoutDate: event.target.value
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() =>
                          setAvailabilityForm((prev) => ({
                            ...prev,
                            blackoutDates: prev.newBlackoutDate
                              ? [...prev.blackoutDates, prev.newBlackoutDate]
                              : prev.blackoutDates,
                            newBlackoutDate: ''
                          }))
                        }
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <span className="layout-inline-gap-8 layout-inline-center">
                        <Spinner size="sm" label="Saving availability" />
                        <span>Saving…</span>
                      </span>
                    ) : (
                      'Save availability'
                    )}
                  </Button>
                </form>
              </Card>
            )
          }
        ]}
      />
    </div>
  );
}

