'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import { formatDateTime } from '@julio/shared';
import {
  contactInquirySchema,
  createValidationT,
  flattenValidationErrors
} from '@julio/validation';
import { Button, Card, FormErrorSummary, Input, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { buildLocalePath } from '@julio/shared';
import { getLocaleFromDocument } from '@/src/i18n/index.js';

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' }
];

function getRouteId(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ContactInquiryPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const router = useRouter();
  const params = useParams();
  const inquiryId = getRouteId(params?.id);
  const locale = getLocaleFromDocument();
  const [initialValues, setInitialValues] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    status: 'new',
    internalNotes: ''
  });
  const [loadedAt, setLoadedAt] = useState('');

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: contactInquirySchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        if (!inquiryId) {
          throw new Error('Missing inquiry id');
        }
        await api.contact.updateInquiry(inquiryId, values);
        notifications.notify({
          title: 'Inquiry updated',
          message: 'Changes saved.'
        });
      } catch (err) {
        const message = err?.message || 'Failed to update inquiry';
        helpers.setStatus(message);
        notifications.notify({ title: 'Save failed', message });
      }
    }
  });

  useEffect(() => {
    let active = true;
    async function loadInquiry() {
      try {
        if (!inquiryId) return;
        const data = await api.contact.getInquiry(inquiryId);
        if (!active) return;
        setInitialValues({
          name: data.inquiry.name || '',
          email: data.inquiry.email || '',
          subject: data.inquiry.subject || '',
          message: data.inquiry.message || '',
          status: data.inquiry.status || 'new',
          internalNotes: data.inquiry.internalNotes || ''
        });
        setLoadedAt(data.inquiry.createdAt ? formatDateTime(data.inquiry.createdAt) : '');
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load inquiry';
        formik.setStatus(message);
        notifications.notify({ title: 'Load failed', message });
        router.replace(buildLocalePath('/admin/contact', locale));
      }
    }
    loadInquiry();
    return () => {
      active = false;
    };
  }, [inquiryId]);

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
          <h1>Inquiry</h1>
          <p className="Kicker">{loadedAt ? `Received ${loadedAt}` : 'Inquiry details'}</p>
        </div>
        <div className="layout-inline-gap-8">
          <Link href={buildLocalePath('/admin/contact', locale)}>
            <Button type="button" variant="secondary">Back</Button>
          </Link>
          <Button type="submit" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? (
              <span className="layout-inline-gap-8 layout-inline-center">
                <Spinner size="sm" label="Saving inquiry" />
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

      <div className="grid">
        <Card className="layout-stack-gap-12">
          <div className="layout-stack-gap-6">
            <label htmlFor="contactName">Name</label>
            <Input id="contactName" value={formik.values.name} readOnly />
          </div>
          <div className="layout-stack-gap-6">
            <label htmlFor="contactEmail">Email</label>
            <Input id="contactEmail" value={formik.values.email} readOnly />
          </div>
          <div className="layout-stack-gap-6">
            <label htmlFor="contactSubject">Subject</label>
            <Input id="contactSubject" value={formik.values.subject} readOnly />
          </div>
          <div className="layout-stack-gap-6">
            <label htmlFor="contactMessage">Message</label>
            <textarea
              id="contactMessage"
              rows={8}
              value={formik.values.message}
              readOnly
              className="form-textarea"
            />
          </div>
        </Card>

        <Card className="layout-stack-gap-12">
          <h3>Status</h3>
          <div className="layout-stack-gap-6">
            <label htmlFor="contactStatus">Status</label>
            <select
              id="contactStatus"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="form-select"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldError('status') ? <div className="Error">{fieldError('status')}</div> : null}
          </div>
          <div className="layout-stack-gap-6">
            <label htmlFor="internalNotes">Internal notes</label>
            <textarea
              id="internalNotes"
              name="internalNotes"
              rows={10}
              value={formik.values.internalNotes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="form-textarea"
            />
          </div>
        </Card>
      </div>
    </form>
  );
}
