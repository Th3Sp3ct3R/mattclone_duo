'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import { coerceDateTime, formatDateTime, resolveTimezone } from '@julio/shared';
import { createValidationT, eventSchema, flattenValidationErrors } from '@julio/validation';
import {
  Button,
  Card,
  FormErrorSummary,
  Input,
  NestedTabNavigator,
  Spinner,
  TimezoneSelect
} from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { buildLocalePath } from '@julio/shared';
import { getLocaleFromDocument } from '@/src/i18n/index.js';

function formatDateTimeInput(value, timezone = 'UTC') {
  const resolvedTimezone = resolveTimezone(timezone);
  if (!value) return '';
  return formatDateTime(value, { zone: resolvedTimezone, format: "yyyy-LL-dd'T'HH:mm" });
}

const emptyEvent = {
  title: '',
  slug: '',
  summary: '',
  descriptionHtml: '',
  location: '',
  startAt: '',
  endAt: '',
  timezone: 'UTC',
  status: 'draft',
  publishAt: ''
};

function getRouteId(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function EventEditorPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const router = useRouter();
  const params = useParams();
  const eventId = getRouteId(params?.id);
  const locale = getLocaleFromDocument();
  const isNew = eventId === 'new';
  const [initialValues, setInitialValues] = useState(emptyEvent);

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: eventSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        if (!isNew && !eventId) {
          throw new Error('Missing event id');
        }
        const zone = resolveTimezone(values.timezone);
        const payload = {
          ...values,
          startAt: values.startAt ? coerceDateTime(values.startAt, { zone })?.toISO() : null,
          endAt: values.endAt ? coerceDateTime(values.endAt, { zone })?.toISO() : null,
          publishAt: values.publishAt ? coerceDateTime(values.publishAt, { zone })?.toISO() : null
        };
        const data = isNew
          ? await api.events.createEvent(payload)
          : await api.events.updateEvent(eventId, payload);
        if (isNew) {
          router.replace(buildLocalePath(`/admin/events/${data.event._id}`, locale));
        } else {
          const zone = resolveTimezone(data.event.timezone);
          setInitialValues({
            ...data.event,
            timezone: zone,
            startAt: formatDateTimeInput(data.event.startAt, zone),
            endAt: formatDateTimeInput(data.event.endAt, zone),
            publishAt: formatDateTimeInput(data.event.publishAt, zone)
          });
        }
        notifications.notify({
          title: isNew ? 'Event created' : 'Event updated',
          message: 'Changes saved.'
        });
      } catch (err) {
        const message = err?.message || 'Failed to save event';
        helpers.setStatus(message);
        notifications.notify({ title: 'Save failed', message });
      }
    }
  });

  useEffect(() => {
    let active = true;
    async function loadEvent() {
      if (!eventId || isNew) return;
      try {
        const data = await api.events.getEvent(eventId);
        if (active) {
          setInitialValues({
            ...data.event,
            timezone: resolveTimezone(data.event.timezone),
            startAt: formatDateTimeInput(data.event.startAt, data.event.timezone),
            endAt: formatDateTimeInput(data.event.endAt, data.event.timezone),
            publishAt: formatDateTimeInput(data.event.publishAt, data.event.timezone)
          });
        }
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load event';
        formik.setStatus(message);
        notifications.notify({ title: 'Load failed', message });
      }
    }
    loadEvent();
    return () => {
      active = false;
    };
  }, [isNew, eventId]);

  const showErrors = formik.submitCount > 0;
  const summaryMessages = showErrors ? flattenValidationErrors(formik.errors).map(t) : [];
  const fieldError = (name) => {
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    if (!error) return null;
    if (!touched && formik.submitCount === 0) return null;
    return t(error);
  };

  return (
    <form onSubmit={formik.handleSubmit} className="page-section-stack">
      <div className="layout-inline-between layout-inline-center">
        <div className="page-section-header">
          <h1>{isNew ? 'New event' : 'Event editor'}</h1>
          <p className="Kicker">Create and publish events for the public calendar.</p>
        </div>
        <div className="layout-inline-gap-8">
          <Link href={buildLocalePath('/admin/events', locale)}>
            <Button type="button" variant="secondary">Back</Button>
          </Link>
          <Button type="submit" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? (
              <span className="layout-inline-gap-8 layout-inline-center">
                <Spinner size="sm" label="Saving event" />
                <span>Saving…</span>
              </span>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      <FormErrorSummary
        messages={summaryMessages}
        status={formik.status ? String(formik.status) : null}
      />

      <NestedTabNavigator
        tabs={[
          {
            value: 'details',
            label: 'Details',
            content: (
              <Card>
                <div className="grid">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="title">Title</label>
                    <Input
                      id="title"
                      name="title"
                      value={formik.values.title || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(fieldError('title'))}
                    />
                    {fieldError('title') ? <div className="Error">{fieldError('title')}</div> : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="slug">Slug</label>
                    <Input
                      id="slug"
                      name="slug"
                      value={formik.values.slug || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(fieldError('slug'))}
                    />
                    {fieldError('slug') ? <div className="Error">{fieldError('slug')}</div> : null}
                  </div>
                </div>

                <div className="layout-stack-gap-6 layout-top-space-12">
                  <label htmlFor="summary">Summary</label>
                  <textarea
                    id="summary"
                    name="summary"
                    rows={3}
                    value={formik.values.summary || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="form-textarea"
                  />
                </div>

                <div className="grid layout-top-space-12">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="location">Location</label>
                    <Input
                      id="location"
                      name="location"
                      value={formik.values.location || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="timezone">Timezone</label>
                    <TimezoneSelect
                      id="timezone"
                      name="timezone"
                      value={formik.values.timezone || 'UTC'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                </div>

                <div className="grid layout-top-space-12">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="startAt">Start time</label>
                    <Input
                      id="startAt"
                      name="startAt"
                      type="datetime-local"
                      value={formik.values.startAt || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(fieldError('startAt'))}
                    />
                    {fieldError('startAt') ? (
                      <div className="Error">{fieldError('startAt')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="endAt">End time</label>
                    <Input
                      id="endAt"
                      name="endAt"
                      type="datetime-local"
                      value={formik.values.endAt || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(fieldError('endAt'))}
                    />
                    {fieldError('endAt') ? <div className="Error">{fieldError('endAt')}</div> : null}
                  </div>
                </div>

                <div className="layout-stack-gap-6 layout-top-space-12">
                  <label htmlFor="descriptionHtml">Description</label>
                  <textarea
                    id="descriptionHtml"
                    name="descriptionHtml"
                    rows={8}
                    value={formik.values.descriptionHtml || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="form-textarea"
                  />
                </div>
              </Card>
            )
          },
          {
            value: 'publishing',
            label: 'Publishing',
            content: (
              <Card>
                <h3>Publishing</h3>
                <div className="grid">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formik.values.status || 'draft'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="form-select"
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </select>
                    {fieldError('status') ? <div className="Error">{fieldError('status')}</div> : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="publishAt">Publish at</label>
                    <Input
                      id="publishAt"
                      name="publishAt"
                      type="datetime-local"
                      value={formik.values.publishAt || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(fieldError('publishAt'))}
                    />
                    {fieldError('publishAt') ? (
                      <div className="Error">{fieldError('publishAt')}</div>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          }
        ]}
      />
    </form>
  );
}
