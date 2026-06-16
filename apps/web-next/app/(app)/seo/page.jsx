'use client';

import { useEffect, useMemo, useState } from 'react';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import {
  createValidationT,
  flattenValidationErrors,
  seoSettingsSchema
} from '@julio/validation';
import { Button, Card, FormErrorSummary, Input, NestedTabNavigator, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

const DEFAULT_LOCALES = ['en', 'es', 'fr', 'it', 'de', 'he'];

const emptyRouteOverride = () => ({
  routeKey: '',
  routePath: '',
  title: '',
  description: '',
  canonicalUrl: '',
  ogImageUrl: '',
  twitterImageUrl: '',
  indexable: true,
  structuredDataJson: '',
  hreflang: []
});

function HreflangEditor({ value, locales, onChange }) {
  return (
    <div className="layout-stack-gap-8">
      {locales.map((locale) => {
        const item = value.find((entry) => entry.locale === locale);
        return (
          <div key={locale} className="layout-stack-gap-6">
            <label htmlFor={`hreflang-${locale}`}>{locale}</label>
            <Input
              id={`hreflang-${locale}`}
              value={item?.url || ''}
              onChange={(event) => {
                const url = event.target.value;
                const next = value.filter((entry) => entry.locale !== locale);
                if (url.trim()) {
                  next.push({ locale, url });
                }
                onChange(next);
              }}
              placeholder={`https://example.com/${locale}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function SeoAdminPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.seo.getSettings();
        if (active) setInitialValues(data.settings);
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load settings';
        setLoadError(message);
        notifications.notify({ title: 'SEO load failed', message });
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

  const formik = useFormik({
    initialValues:
      initialValues || ({
        siteName: '',
        defaultTitle: '',
        defaultDescription: '',
        defaultOgImageUrl: '',
        defaultTwitterImageUrl: '',
        defaultCanonicalBase: '',
        robotsTxt: '',
        structuredDataJson: '',
        hreflangLocales: DEFAULT_LOCALES,
        defaultLocale: 'en',
        routeOverrides: []
      }),
    enableReinitialize: true,
    validationSchema: seoSettingsSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        const data = await api.seo.updateSettings(values);
        setInitialValues(data.settings);
        notifications.notify({ title: 'SEO updated', message: 'Settings saved.' });
      } catch (err) {
        const message = err?.message || 'Failed to save settings';
        helpers.setStatus(message);
        notifications.notify({ title: 'SEO update failed', message });
      }
    }
  });

  const locales =
    formik.values.hreflangLocales && formik.values.hreflangLocales.length
      ? formik.values.hreflangLocales
      : DEFAULT_LOCALES;
  const defaultLocale = formik.values.defaultLocale || 'en';
  const routeOverrides = formik.values.routeOverrides || [];
  const showErrors = formik.submitCount > 0;
  const summaryMessages = showErrors ? flattenValidationErrors(formik.errors).map(t) : [];
  const getError = (name) => {
    if (!showErrors) return null;
    const error = getIn(formik.errors, name);
    return error ? t(error) : null;
  };

  if (loading) {
    return (
      <div className="page-section-stack" aria-busy="true">
        <div className="page-section-header">
          <h1>SEO</h1>
          <div className="layout-inline-gap-8 layout-inline-center text-muted">
            <Spinner size="sm" label="Loading SEO settings" />
            <span>Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="page-section-stack">
        <div className="page-section-header">
          <h1>SEO</h1>
          <div className="Error">{loadError || 'No settings available.'}</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit} className="page-section-stack layout-stack-gap-20">
      <div className="layout-inline-between layout-inline-center">
        <div className="page-section-header">
          <h1>SEO</h1>
          <p className="Kicker">Control search appearance across the entire site.</p>
        </div>
        <Button type="submit" disabled={formik.isSubmitting}>
          {formik.isSubmitting ? (
            <span className="layout-inline-gap-8 layout-inline-center">
              <Spinner size="sm" label="Saving SEO settings" />
              <span>Saving…</span>
            </span>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>

      <FormErrorSummary
        messages={summaryMessages}
        status={formik.status ? String(formik.status) : null}
      />

      <NestedTabNavigator
        tabs={[
          {
            value: 'defaults',
            label: 'Global defaults',
            content: (
              <Card>
                <h3>Global defaults</h3>
                <div className="grid">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="siteName">Site name</label>
                    <Input
                      id="siteName"
                      name="siteName"
                      value={formik.values.siteName || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(getError('siteName'))}
                    />
                    {getError('siteName') ? <div className="Error">{getError('siteName')}</div> : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="defaultTitle">Default title</label>
                    <Input
                      id="defaultTitle"
                      name="defaultTitle"
                      value={formik.values.defaultTitle || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(getError('defaultTitle'))}
                    />
                    {getError('defaultTitle') ? (
                      <div className="Error">{getError('defaultTitle')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="defaultDescription">Default description</label>
                    <Input
                      id="defaultDescription"
                      name="defaultDescription"
                      value={formik.values.defaultDescription || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(getError('defaultDescription'))}
                    />
                    {getError('defaultDescription') ? (
                      <div className="Error">{getError('defaultDescription')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="defaultCanonicalBase">Canonical base URL</label>
                    <Input
                      id="defaultCanonicalBase"
                      name="defaultCanonicalBase"
                      value={formik.values.defaultCanonicalBase || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="https://example.com"
                      invalid={Boolean(getError('defaultCanonicalBase'))}
                    />
                    {getError('defaultCanonicalBase') ? (
                      <div className="Error">{getError('defaultCanonicalBase')}</div>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          },
          {
            value: 'social',
            label: 'Open Graph + Twitter',
            content: (
              <Card>
                <h3>Open Graph + Twitter</h3>
                <div className="grid">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="defaultOgImageUrl">Default OG image</label>
                    <Input
                      id="defaultOgImageUrl"
                      name="defaultOgImageUrl"
                      value={formik.values.defaultOgImageUrl || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(getError('defaultOgImageUrl'))}
                    />
                    {getError('defaultOgImageUrl') ? (
                      <div className="Error">{getError('defaultOgImageUrl')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="defaultTwitterImageUrl">Default Twitter image</label>
                    <Input
                      id="defaultTwitterImageUrl"
                      name="defaultTwitterImageUrl"
                      value={formik.values.defaultTwitterImageUrl || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(getError('defaultTwitterImageUrl'))}
                    />
                    {getError('defaultTwitterImageUrl') ? (
                      <div className="Error">{getError('defaultTwitterImageUrl')}</div>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          },
          {
            value: 'robots',
            label: 'Robots.txt',
            content: (
              <Card>
                <h3>Robots.txt</h3>
                <div className="layout-stack-gap-6">
                  <label htmlFor="robotsTxt">Robots content</label>
                  <textarea
                    id="robotsTxt"
                    name="robotsTxt"
                    rows={6}
                    value={formik.values.robotsTxt || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="form-textarea"
                  />
                </div>
              </Card>
            )
          },
          {
            value: 'structured',
            label: 'Structured data',
            content: (
              <Card>
                <h3>Structured data (JSON-LD)</h3>
                <div className="layout-stack-gap-6">
                  <label htmlFor="structuredDataJson">Global JSON-LD</label>
                  <textarea
                    id="structuredDataJson"
                    name="structuredDataJson"
                    rows={8}
                    value={formik.values.structuredDataJson || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder='{"@context":"https://schema.org","@type":"Organization"}'
                    className="form-textarea"
                  />
                  {getError('structuredDataJson') ? (
                    <div className="Error">{getError('structuredDataJson')}</div>
                  ) : null}
                </div>
              </Card>
            )
          },
          {
            value: 'locales',
            label: 'Locales',
            content: (
              <Card>
                <h3>Hreflang locales</h3>
                <div className="layout-stack-gap-12">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="hreflangLocales">Locales (comma separated)</label>
                    <Input
                      id="hreflangLocales"
                      value={locales.join(', ')}
                      onChange={(event) =>
                        formik.setFieldValue(
                          'hreflangLocales',
                          event.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean)
                        )
                      }
                      onBlur={() => formik.setFieldTouched('hreflangLocales', true)}
                      invalid={Boolean(getError('hreflangLocales'))}
                    />
                    {getError('hreflangLocales') ? (
                      <div className="Error">{getError('hreflangLocales')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="defaultLocale">Default locale</label>
                    <select
                      id="defaultLocale"
                      value={defaultLocale}
                      onChange={(event) => formik.setFieldValue('defaultLocale', event.target.value)}
                      onBlur={() => formik.setFieldTouched('defaultLocale', true)}
                      className="form-select"
                    >
                      {locales.map((locale) => (
                        <option key={locale} value={locale}>
                          {locale}
                        </option>
                      ))}
                    </select>
                    {getError('defaultLocale') ? (
                      <div className="Error">{getError('defaultLocale')}</div>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          },
          {
            value: 'routes',
            label: 'Route overrides',
            content: (
              <Card>
                <h3>Route overrides</h3>
                <div className="layout-stack-gap-16">
                  {routeOverrides.map((override, index) => (
                    <Card key={`${override.routeKey}-${index}`} className="route-override-card">
                      <div className="layout-stack-gap-12">
                        <div className="layout-stack-gap-6">
                          <label htmlFor={`routeKey-${index}`}>Route key</label>
                          <Input
                            id={`routeKey-${index}`}
                            value={override.routeKey || ''}
                            onChange={(event) => {
                              const next = [...routeOverrides];
                              next[index] = { ...override, routeKey: event.target.value };
                              formik.setFieldValue('routeOverrides', next);
                            }}
                            onBlur={() =>
                              formik.setFieldTouched(`routeOverrides.${index}.routeKey`, true)
                            }
                            invalid={Boolean(getError(`routeOverrides.${index}.routeKey`))}
                            placeholder="home"
                          />
                          {getError(`routeOverrides.${index}.routeKey`) ? (
                            <div className="Error">{getError(`routeOverrides.${index}.routeKey`)}</div>
                          ) : null}
                        </div>
                        <div className="layout-stack-gap-6">
                          <label htmlFor={`routePath-${index}`}>Route path</label>
                          <Input
                            id={`routePath-${index}`}
                            value={override.routePath || ''}
                            onChange={(event) => {
                              const next = [...routeOverrides];
                              next[index] = { ...override, routePath: event.target.value };
                              formik.setFieldValue('routeOverrides', next);
                            }}
                          />
                        </div>
                        <div className="grid">
                          <div className="layout-stack-gap-6">
                            <label htmlFor={`routeTitle-${index}`}>Title</label>
                            <Input
                              id={`routeTitle-${index}`}
                              value={override.title || ''}
                              onChange={(event) => {
                                const next = [...routeOverrides];
                                next[index] = { ...override, title: event.target.value };
                                formik.setFieldValue('routeOverrides', next);
                              }}
                            />
                          </div>
                          <div className="layout-stack-gap-6">
                            <label htmlFor={`routeDescription-${index}`}>Description</label>
                            <Input
                              id={`routeDescription-${index}`}
                              value={override.description || ''}
                              onChange={(event) => {
                                const next = [...routeOverrides];
                                next[index] = { ...override, description: event.target.value };
                                formik.setFieldValue('routeOverrides', next);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid">
                          <div className="layout-stack-gap-6">
                            <label htmlFor={`routeCanonical-${index}`}>Canonical URL</label>
                            <Input
                              id={`routeCanonical-${index}`}
                              value={override.canonicalUrl || ''}
                              onChange={(event) => {
                                const next = [...routeOverrides];
                                next[index] = { ...override, canonicalUrl: event.target.value };
                                formik.setFieldValue('routeOverrides', next);
                              }}
                              onBlur={() =>
                                formik.setFieldTouched(`routeOverrides.${index}.canonicalUrl`, true)
                              }
                              invalid={Boolean(getError(`routeOverrides.${index}.canonicalUrl`))}
                            />
                            {getError(`routeOverrides.${index}.canonicalUrl`) ? (
                              <div className="Error">
                                {getError(`routeOverrides.${index}.canonicalUrl`)}
                              </div>
                            ) : null}
                          </div>
                          <div className="layout-stack-gap-6">
                            <label htmlFor={`routeOg-${index}`}>OG image</label>
                            <Input
                              id={`routeOg-${index}`}
                              value={override.ogImageUrl || ''}
                              onChange={(event) => {
                                const next = [...routeOverrides];
                                next[index] = { ...override, ogImageUrl: event.target.value };
                                formik.setFieldValue('routeOverrides', next);
                              }}
                              onBlur={() =>
                                formik.setFieldTouched(`routeOverrides.${index}.ogImageUrl`, true)
                              }
                              invalid={Boolean(getError(`routeOverrides.${index}.ogImageUrl`))}
                            />
                            {getError(`routeOverrides.${index}.ogImageUrl`) ? (
                              <div className="Error">{getError(`routeOverrides.${index}.ogImageUrl`)}</div>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid">
                          <div className="layout-stack-gap-6">
                            <label htmlFor={`routeTwitter-${index}`}>Twitter image</label>
                            <Input
                              id={`routeTwitter-${index}`}
                              value={override.twitterImageUrl || ''}
                              onChange={(event) => {
                                const next = [...routeOverrides];
                                next[index] = { ...override, twitterImageUrl: event.target.value };
                                formik.setFieldValue('routeOverrides', next);
                              }}
                              onBlur={() =>
                                formik.setFieldTouched(`routeOverrides.${index}.twitterImageUrl`, true)
                              }
                              invalid={Boolean(getError(`routeOverrides.${index}.twitterImageUrl`))}
                            />
                            {getError(`routeOverrides.${index}.twitterImageUrl`) ? (
                              <div className="Error">
                                {getError(`routeOverrides.${index}.twitterImageUrl`)}
                              </div>
                            ) : null}
                          </div>
                          <div className="layout-stack-gap-6">
                            <label htmlFor={`routeIndexable-${index}`}>Indexable</label>
                            <select
                              id={`routeIndexable-${index}`}
                              value={override.indexable ? 'true' : 'false'}
                              onChange={(event) => {
                                const next = [...routeOverrides];
                                next[index] = {
                                  ...override,
                                  indexable: event.target.value === 'true'
                                };
                                formik.setFieldValue('routeOverrides', next);
                              }}
                              className="form-select"
                            >
                              <option value="true">Index</option>
                              <option value="false">No index</option>
                            </select>
                          </div>
                        </div>
                        <div className="layout-stack-gap-6">
                          <label htmlFor={`routeStructured-${index}`}>Structured data (JSON-LD)</label>
                          <textarea
                            id={`routeStructured-${index}`}
                            rows={6}
                            value={override.structuredDataJson || ''}
                            onChange={(event) => {
                              const next = [...routeOverrides];
                              next[index] = { ...override, structuredDataJson: event.target.value };
                              formik.setFieldValue('routeOverrides', next);
                            }}
                            className="form-textarea"
                          />
                          {getError(`routeOverrides.${index}.structuredDataJson`) ? (
                            <div className="Error">
                              {getError(`routeOverrides.${index}.structuredDataJson`)}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <strong>Hreflang overrides</strong>
                          <HreflangEditor
                            value={override.hreflang || []}
                            locales={locales}
                            onChange={(nextHreflang) => {
                              const next = [...routeOverrides];
                              next[index] = { ...override, hreflang: nextHreflang };
                              formik.setFieldValue('routeOverrides', next);
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const next = [...routeOverrides];
                            next.splice(index, 1);
                            formik.setFieldValue('routeOverrides', next);
                          }}
                        >
                          Remove override
                        </Button>
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      formik.setFieldValue('routeOverrides', [...routeOverrides, emptyRouteOverride()])
                    }
                  >
                    Add route override
                  </Button>
                </div>
              </Card>
            )
          }
        ]}
      />
    </form>
  );
}
