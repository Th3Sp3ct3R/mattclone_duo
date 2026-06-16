 'use client';
 
 import { useMemo, useState } from 'react';
 import { getIn, useFormik } from 'formik';
 
 import { api } from '@julio/api-client';
import { contactInquirySchema, createValidationT } from '@julio/validation';
import { Button, Field, FormErrorSummary, Input, Section, SectionBand, Spinner } from '@julio/ui';
 import { notifications } from '@/src/notifications/client.js';
 import { getLocaleFromDocument, useDictionary } from '@/src/i18n/index.js';
 
 const emptyInquiry = {
   name: '',
   email: '',
   subject: '',
   message: '',
   status: 'new',
   internalNotes: ''
 };
 
 export function ContactSection({ anchorId = 'contact' }) {
   const locale = getLocaleFromDocument();
   const t = useMemo(() => createValidationT(locale), [locale]);
   const dict = useDictionary();
   const [successMessage, setSuccessMessage] = useState('');
 
   const formik = useFormik({
     initialValues: emptyInquiry,
     validationSchema: contactInquirySchema,
     onSubmit: async (values, helpers) => {
       helpers.setStatus(null);
       setSuccessMessage('');
       try {
         await api.contact.createInquiry(values);
         helpers.resetForm();
         setSuccessMessage(dict.contact.success);
         notifications.notify({
           title: dict.contact.notificationTitle,
           message: dict.contact.notificationMessage
         });
       } catch (err) {
         const message = err?.message || dict.contact.notificationFailedMessage;
         helpers.setStatus(message);
         notifications.notify({ title: dict.contact.notificationFailedTitle, message });
       }
     }
   });
 
   const showErrors = formik.submitCount > 0;
  const summaryMessages =
    showErrors && Object.keys(formik.errors).length ? [dict.contact.errorSummary] : [];
   const fieldError = (name) => {
     const error = getIn(formik.errors, name);
     const touched = getIn(formik.touched, name);
     if (!error) return null;
     if (!touched && formik.submitCount === 0) return null;
     return t(error);
   };
 
   return (
     <SectionBand tone="light" id={anchorId} className="HomePageAnchor">
       <div className="container content-container">
        <Section
          eyebrow={dict.contact.eyebrow}
          title={dict.contact.title}
          description={dict.contact.description}
        >
          <div className="ContactSplit">
            <div className="ContactSplit__form">
              <form onSubmit={formik.handleSubmit} className="page-section-stack-tight">
                <FormErrorSummary
                  messages={summaryMessages}
                  status={formik.status ? String(formik.status) : null}
                />
                {successMessage ? <div className="Success">{successMessage}</div> : null}
                <div className="grid">
                  <Field.Root>
                    <Field.Label htmlFor="contactName">{dict.contact.name}</Field.Label>
                    <Field.Control>
                      <Input
                        id="contactName"
                        name="name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        invalid={Boolean(fieldError('name'))}
                      />
                    </Field.Control>
                    {fieldError('name') ? <div className="Error">{fieldError('name')}</div> : null}
                  </Field.Root>
                  <Field.Root>
                    <Field.Label htmlFor="contactEmail">{dict.contact.email}</Field.Label>
                    <Field.Control>
                      <Input
                        id="contactEmail"
                        name="email"
                        type="email"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        invalid={Boolean(fieldError('email'))}
                      />
                    </Field.Control>
                    {fieldError('email') ? <div className="Error">{fieldError('email')}</div> : null}
                  </Field.Root>
                </div>
                <Field.Root>
                  <Field.Label htmlFor="contactSubject">{dict.contact.subject}</Field.Label>
                  <Field.Control>
                    <Input
                      id="contactSubject"
                      name="subject"
                      value={formik.values.subject}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      invalid={Boolean(fieldError('subject'))}
                    />
                  </Field.Control>
                  {fieldError('subject') ? <div className="Error">{fieldError('subject')}</div> : null}
                </Field.Root>
                <div className="layout-stack-gap-6">
                  <label htmlFor="contactMessage">{dict.contact.message}</label>
                  <textarea
                    id="contactMessage"
                    name="message"
                    rows={6}
                    value={formik.values.message}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="ui-Textarea"
                  />
                  {fieldError('message') ? <div className="Error">{fieldError('message')}</div> : null}
                </div>
                <Button type="submit" disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? (
                    <span className="layout-inline-gap-8 layout-inline-center">
                      <Spinner size="sm" label={dict.contact.sendingLabel} />
                      <span>{dict.contact.sendingCopy}</span>
                    </span>
                  ) : (
                    dict.contact.send
                  )}
                </Button>
              </form>
            </div>
            <div className="ContactSplit__image" aria-hidden="true">
              <img src="/images/skyline.avif" alt="" loading="lazy" />
            </div>
          </div>
        </Section>
       </div>
     </SectionBand>
   );
 }
