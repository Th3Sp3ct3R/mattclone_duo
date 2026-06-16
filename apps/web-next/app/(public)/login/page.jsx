'use client';

import { useEffect, useMemo } from 'react';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import { AnalyticsEvents, trackEvent } from '@julio/analytics';
import { buildLocalePath } from '@julio/shared';
import { createValidationT, flattenValidationErrors, loginSchema } from '@julio/validation';
import { Button, Card, Field, FormErrorSummary, Input, Spinner } from '@julio/ui';
import { analytics } from '@/src/analytics/client.js';
import { notifications } from '@/src/notifications/client.js';
import { getLocaleFromDocument, useDictionary } from '@/src/i18n/index.js';

export default function LoginPage() {
  const locale = getLocaleFromDocument();
  const dict = useDictionary();
  const t = useMemo(() => createValidationT(locale), [locale]);

  useEffect(() => {
    trackEvent(analytics, AnalyticsEvents.PageViewed, { page: 'login', platform: 'web' });
  }, []);

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        await api.auth.login(values);
        trackEvent(analytics, AnalyticsEvents.LoginSucceeded, { platform: 'web' });
        window.location.href = buildLocalePath('/dashboard', locale);
      } catch (err) {
        const message = err?.message || dict.login.errorFailed;
        helpers.setStatus(message);
        trackEvent(analytics, AnalyticsEvents.LoginFailed, { platform: 'web' });
        notifications.notify({ title: dict.login.notificationFailedTitle, message });
      }
    }
  });

  const summaryMessages =
    formik.submitCount > 0 ? flattenValidationErrors(formik.errors).map(t) : [];
  const fieldError = (name) => {
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    if (!error) return null;
    if (!touched && formik.submitCount === 0) return null;
    return error;
  };

  return (
    <main className="container content-container layout-center-screen">
        <div className="login-panel">
          <h1>{dict.login.title}</h1>
          <p className="Kicker">{dict.login.subtitle}</p>

          <Card>
            <form className="layout-stack-gap-12" onSubmit={formik.handleSubmit}>
              <FormErrorSummary
                messages={summaryMessages}
                status={formik.status ? String(formik.status) : null}
              />
              <Field.Root>
                <Field.Label htmlFor="email">{dict.login.emailLabel}</Field.Label>
                <Field.Control>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder={dict.login.emailPlaceholder}
                    invalid={Boolean(fieldError('email'))}
                  />
                </Field.Control>
                {fieldError('email') ? <Field.Error>{t(fieldError('email'))}</Field.Error> : null}
              </Field.Root>

              <Field.Root>
                <Field.Label htmlFor="password">{dict.login.passwordLabel}</Field.Label>
                <Field.Control>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder={dict.login.passwordPlaceholder}
                    invalid={Boolean(fieldError('password'))}
                  />
                </Field.Control>
                {fieldError('password') ? (
                  <Field.Error>{t(fieldError('password'))}</Field.Error>
                ) : null}
              </Field.Root>

              <div className="layout-inline-end">
                <Button type="submit" disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? (
                    <span className="layout-inline-gap-8 layout-inline-center">
                      <Spinner size="sm" label={dict.login.submittingLabel} />
                      <span>{dict.login.submittingCopy}</span>
                    </span>
                  ) : (
                    dict.login.submitLabel
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
  );
}


