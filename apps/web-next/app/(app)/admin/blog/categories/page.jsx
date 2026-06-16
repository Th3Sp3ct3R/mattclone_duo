'use client';

import { useEffect, useMemo, useState } from 'react';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import {
  categorySchema,
  createValidationT,
  flattenValidationErrors
} from '@julio/validation';
import { Button, Card, DataTable, FormErrorSummary, Input, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

const emptyForm = { name: '', slug: '', description: '' };

export default function BlogCategoriesPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    setLoading(true);
    setStatus(null);
    try {
      const data = await api.blog.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      const message = err?.message || 'Failed to load categories';
      setStatus(message);
      notifications.notify({ title: 'Category load failed', message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories().catch(() => {});
  }, []);

  const formik = useFormik({
    initialValues: emptyForm,
    validationSchema: categorySchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        await api.blog.createCategory(values);
        notifications.notify({ title: 'Category created', message: 'New category added.' });
      } catch (err) {
        const message = err?.message || 'Failed to create category';
        helpers.setStatus(message);
        notifications.notify({ title: 'Category create failed', message });
        return;
      }
      helpers.resetForm();
      await loadCategories();
    }
  });

  const showErrors = formik.submitCount > 0;
  const summaryMessages = showErrors ? flattenValidationErrors(formik.errors).map(t) : [];
  const fieldError = (name) => {
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    if (!error) return null;
    if (!touched && formik.submitCount === 0) return null;
    return t(error);
  };

  const columns = [
    {
      header: 'Category',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.name}</strong>
          <div className="Kicker">{row.original.slug}</div>
        </div>
      )
    }
  ];

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <div className="page-section-header">
        <h1>Categories</h1>
        <p className="Kicker">Manage blog categories.</p>
      </div>

      {status ? <div className="Error">{String(status)}</div> : null}

      <Card>
        <h3>New category</h3>
        <form onSubmit={formik.handleSubmit} className="layout-stack-gap-12">
          <FormErrorSummary
            messages={summaryMessages}
            status={formik.status ? String(formik.status) : null}
          />
          <div className="grid">
            <div className="layout-stack-gap-6">
              <label htmlFor="categoryName">Name</label>
              <Input
                id="categoryName"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                invalid={Boolean(fieldError('name'))}
              />
              {fieldError('name') ? <div className="Error">{fieldError('name')}</div> : null}
            </div>
            <div className="layout-stack-gap-6">
              <label htmlFor="categorySlug">Slug</label>
              <Input
                id="categorySlug"
                name="slug"
                value={formik.values.slug}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                invalid={Boolean(fieldError('slug'))}
              />
              {fieldError('slug') ? <div className="Error">{fieldError('slug')}</div> : null}
            </div>
            <div className="layout-stack-gap-6">
              <label htmlFor="categoryDescription">Description</label>
              <Input
                id="categoryDescription"
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>
          </div>
          <Button type="submit">Create category</Button>
        </form>
      </Card>

      {loading ? (
        <Card className="layout-stack-gap-12">
          <div className="layout-inline-gap-8 layout-inline-center text-muted">
            <Spinner size="sm" label="Loading categories" />
            <span>Loading categories…</span>
          </div>
        </Card>
      ) : (
        <DataTable columns={columns} data={categories} emptyMessage="No categories yet." />
      )}
    </div>
  );
}
