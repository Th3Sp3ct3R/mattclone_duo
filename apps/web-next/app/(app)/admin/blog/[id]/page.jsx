'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import { coerceDateTime, formatDateTime } from '@julio/shared';
import {
  createValidationT,
  flattenValidationErrors,
  postSchema
} from '@julio/validation';
import {
  Button,
  Card,
  FormErrorSummary,
  ImageUpload,
  Input,
  NestedTabNavigator,
  PromptDialog,
  Spinner
} from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { buildLocalePath } from '@julio/shared';
import { getLocaleFromDocument } from '@/src/i18n/index.js';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

const LOCALES = ['en', 'es', 'fr', 'it', 'de', 'he'];

function formatDateTimeInput(value, timezone = 'UTC') {
  if (!value) return '';
  return formatDateTime(value, { zone: timezone, format: "yyyy-LL-dd'T'HH:mm" });
}

const emptyPost = {
  title: '',
  slug: '',
  excerpt: '',
  contentHtml: '',
  status: 'draft',
  publishAt: '',
  language: 'en',
  translationKey: '',
  tags: [],
  authorId: '',
  categoryIds: [],
  coverImageUrl: '',
  coverImageAlt: '',
  seo: {
    metaTitle: '',
    metaDescription: '',
    ogTitle: '',
    ogDescription: '',
    ogImageUrl: '',
    twitterImageUrl: '',
    canonicalUrl: '',
    indexable: true,
    structuredDataJson: '',
    hreflangOverrides: []
  }
};

function getRouteId(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function BlogEditorPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const router = useRouter();
  const params = useParams();
  const postId = getRouteId(params?.id);
  const locale = getLocaleFromDocument();
  const isNew = postId === 'new';
  const [initialValues, setInitialValues] = useState(emptyPost);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState('');
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const lastEditorHtmlRef = useRef('');
  const applyingContentRef = useRef(false);

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: postSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        if (!isNew && !postId) {
          throw new Error('Missing post id');
        }
        const payload = {
          ...values,
          publishAt: values.publishAt ? coerceDateTime(values.publishAt, { zone: 'UTC' })?.toISO() : null,
          tags: values.tags || []
        };
        const data = isNew
          ? await api.blog.createPost(payload)
          : await api.blog.updatePost(postId, payload);
        if (isNew) {
          router.replace(buildLocalePath(`/admin/blog/${data.post._id}`, locale));
        } else {
          setInitialValues({
            ...data.post,
            publishAt: formatDateTimeInput(data.post.publishAt)
          });
        }
        notifications.notify({
          title: isNew ? 'Post created' : 'Post updated',
          message: 'Changes saved.'
        });
      } catch (err) {
        const message = err?.message || 'Failed to save post';
        helpers.setStatus(message);
        notifications.notify({ title: 'Save failed', message });
      }
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true
      }),
      Image
    ],
    immediatelyRender: false,
    content: initialValues.contentHtml || '<p></p>',
    onUpdate({ editor: editorInstance }) {
      if (applyingContentRef.current) return;
      const nextHtml = editorInstance.getHTML();
      lastEditorHtmlRef.current = nextHtml;
      formik.setFieldValue('contentHtml', nextHtml, false);
    }
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [authorRes, categoryRes] = await Promise.all([
          api.blog.getAuthors(),
          api.blog.getCategories()
        ]);
        if (active) {
          setAuthors(authorRes.authors || []);
          setCategories(categoryRes.categories || []);
        }
      } catch {}
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPost() {
      if (!postId || isNew) return;
      try {
        const data = await api.blog.getPost(postId);
        if (active) {
          setInitialValues({
            ...data.post,
            publishAt: formatDateTimeInput(data.post.publishAt)
          });
        }
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load post';
        formik.setStatus(message);
        notifications.notify({ title: 'Load failed', message });
      }
    }
    loadPost();
    return () => {
      active = false;
    };
  }, [isNew, postId]);

  useEffect(() => {
    if (!editor || showHtmlEditor) return;
    const incoming = formik.values.contentHtml || '';
    if (incoming === lastEditorHtmlRef.current) return;
    applyingContentRef.current = true;
    editor.commands.setContent(incoming || '<p></p>', false);
    lastEditorHtmlRef.current = editor.getHTML();
    applyingContentRef.current = false;
  }, [editor, formik.values.contentHtml, showHtmlEditor]);

  useEffect(() => {
    if (!editor || !showHtmlEditor) return;
    setHtmlDraft(editor.getHTML());
  }, [editor, showHtmlEditor]);

  const tagsValue = useMemo(() => (formik.values.tags || []).join(', '), [formik.values.tags]);
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
      <PromptDialog
        open={linkPromptOpen}
        onOpenChange={setLinkPromptOpen}
        title="Insert link"
        description="Add a URL to link the selected text."
        label="Link URL"
        placeholder="https://example.com"
        confirmLabel="Insert link"
        onConfirm={(value) => {
          if (!editor) return;
          const url = String(value || '').trim();
          if (!url) return;
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
      />
      <PromptDialog
        open={imagePromptOpen}
        onOpenChange={setImagePromptOpen}
        title="Insert image"
        description="Add an image URL to embed in the post."
        label="Image URL"
        placeholder="https://example.com/image.jpg"
        confirmLabel="Insert image"
        onConfirm={(value) => {
          if (!editor) return;
          const url = String(value || '').trim();
          if (!url) return;
          editor.chain().focus().setImage({ src: url }).run();
        }}
      />
      <div className="layout-inline-between layout-inline-center">
        <div className="page-section-header">
          <h1>{isNew ? 'New post' : 'Post editor'}</h1>
          <p className="Kicker">Create and manage blog content.</p>
        </div>
        <div className="layout-inline-gap-8">
          <Link href={buildLocalePath('/admin/blog', locale)}>
            <Button type="button" variant="secondary">Back</Button>
          </Link>
          <Button type="submit" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? (
              <span className="layout-inline-gap-8 layout-inline-center">
                <Spinner size="sm" label="Saving post" />
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
            value: 'content',
            label: 'Content',
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
                  <label htmlFor="excerpt">Excerpt</label>
                  <textarea
                    id="excerpt"
                    name="excerpt"
                    rows={3}
                    value={formik.values.excerpt || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="form-textarea"
                  />
                </div>
                <div className="layout-stack-gap-6 layout-top-space-12">
                  <label>Content</label>
                  <div className="EditorShell">
                    <div className="EditorToolbar">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        disabled={!editor}
                      >
                        Bold
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        disabled={!editor}
                      >
                        Italic
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        disabled={!editor}
                      >
                        H2
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        disabled={!editor}
                      >
                        Bullets
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        disabled={!editor}
                      >
                        Numbered
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (!editor) return;
                          setLinkPromptOpen(true);
                        }}
                        disabled={!editor}
                      >
                        Link
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (!editor) return;
                          setImagePromptOpen(true);
                        }}
                        disabled={!editor}
                      >
                        Insert image
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowHtmlEditor((prev) => !prev)}
                        disabled={!editor}
                      >
                        {showHtmlEditor ? 'Visual' : 'HTML'}
                      </Button>
                    </div>
                    {showHtmlEditor ? (
                      <div className="EditorHtmlPane">
                        <textarea
                          rows={12}
                          value={htmlDraft}
                          onChange={(event) => setHtmlDraft(event.target.value)}
                          className="form-textarea"
                        />
                        <div className="layout-inline-end layout-top-space-8">
                          <Button
                            type="button"
                            onClick={() => {
                              formik.setFieldValue('contentHtml', htmlDraft);
                              setShowHtmlEditor(false);
                            }}
                          >
                            Apply HTML
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <EditorContent editor={editor} className="EditorContent" />
                    )}
                  </div>
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
                  <div className="layout-stack-gap-6">
                    <label htmlFor="language">Language</label>
                    <select
                      id="language"
                      name="language"
                      value={formik.values.language || 'en'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="form-select"
                    >
                      {LOCALES.map((locale) => (
                        <option key={locale} value={locale}>
                          {locale}
                        </option>
                      ))}
                    </select>
                    {fieldError('language') ? <div className="Error">{fieldError('language')}</div> : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="translationKey">Translation key</label>
                    <Input
                      id="translationKey"
                      name="translationKey"
                      value={formik.values.translationKey || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                </div>
              </Card>
            )
          },
          {
            value: 'metadata',
            label: 'Metadata',
            content: (
              <div className="layout-stack-gap-16">
                <Card>
                <h3>Metadata</h3>
                <div className="grid">
                  <div className="layout-stack-gap-6">
                      <label htmlFor="tags">Tags (comma separated)</label>
                      <Input
                        id="tags"
                        value={tagsValue}
                        onChange={(event) =>
                          formik.setFieldValue(
                            'tags',
                            event.target.value
                              .split(',')
                              .map((item) => item.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                    </div>
                  <div className="layout-stack-gap-6">
                      <label htmlFor="authorId">Author</label>
                      <select
                        id="authorId"
                        name="authorId"
                        value={formik.values.authorId || ''}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      className="form-select"
                      >
                        <option value="">No author</option>
                        {authors.map((author) => (
                          <option key={author._id} value={author._id}>
                            {author.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  <div className="layout-stack-gap-6">
                      <label htmlFor="categoryIds">Categories</label>
                      <select
                        id="categoryIds"
                        multiple
                        value={formik.values.categoryIds || []}
                        onChange={(event) =>
                          formik.setFieldValue(
                            'categoryIds',
                            Array.from(event.target.selectedOptions).map((opt) => opt.value)
                          )
                        }
                      className="form-select"
                      >
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Card>
                <Card>
                <h3>Cover image</h3>
                  <div className="grid">
                  <div className="layout-stack-gap-6">
                      <label htmlFor="coverImageUrl">Cover image URL</label>
                      <Input
                        id="coverImageUrl"
                        name="coverImageUrl"
                        value={formik.values.coverImageUrl || ''}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        invalid={Boolean(fieldError('coverImageUrl'))}
                      />
                      {fieldError('coverImageUrl') ? (
                        <div className="Error">{fieldError('coverImageUrl')}</div>
                      ) : null}
                    </div>
                  <div className="layout-stack-gap-6">
                      <label htmlFor="coverImageAlt">Cover image alt text</label>
                      <Input
                        id="coverImageAlt"
                        name="coverImageAlt"
                        value={formik.values.coverImageAlt || ''}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                    </div>
                  <div className="layout-stack-gap-6">
                    <ImageUpload
                      label="Cover image"
                      description="Upload and crop a cover image."
                      value={formik.values.coverImageUrl || ''}
                      onChange={(nextUrl) => formik.setFieldValue('coverImageUrl', nextUrl)}
                      variant="cover"
                      onUpload={({ file, onProgress }) =>
                        api.assets.uploadWithPresign({ file, category: 'images', onProgress })
                      }
                    />
                  </div>
                  </div>
                </Card>
              </div>
            )
          },
          {
            value: 'seo',
            label: 'SEO',
            content: (
              <Card>
                <h3>SEO</h3>
                <div className="grid">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="metaTitle">Meta title</label>
                    <Input
                      id="metaTitle"
                      value={formik.values.seo?.metaTitle || ''}
                      onChange={(event) =>
                        formik.setFieldValue('seo.metaTitle', event.target.value)
                      }
                    />
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="metaDescription">Meta description</label>
                    <Input
                      id="metaDescription"
                      value={formik.values.seo?.metaDescription || ''}
                      onChange={(event) =>
                        formik.setFieldValue('seo.metaDescription', event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid layout-top-space-12">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="ogTitle">OG title</label>
                    <Input
                      id="ogTitle"
                      value={formik.values.seo?.ogTitle || ''}
                      onChange={(event) => formik.setFieldValue('seo.ogTitle', event.target.value)}
                    />
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="ogDescription">OG description</label>
                    <Input
                      id="ogDescription"
                      value={formik.values.seo?.ogDescription || ''}
                      onChange={(event) =>
                        formik.setFieldValue('seo.ogDescription', event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid layout-top-space-12">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="ogImageUrl">OG image URL</label>
                    <Input
                      id="ogImageUrl"
                      value={formik.values.seo?.ogImageUrl || ''}
                      onChange={(event) => formik.setFieldValue('seo.ogImageUrl', event.target.value)}
                      invalid={Boolean(fieldError('seo.ogImageUrl'))}
                    />
                    {fieldError('seo.ogImageUrl') ? (
                      <div className="Error">{fieldError('seo.ogImageUrl')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="twitterImageUrl">Twitter image URL</label>
                    <Input
                      id="twitterImageUrl"
                      value={formik.values.seo?.twitterImageUrl || ''}
                      onChange={(event) =>
                        formik.setFieldValue('seo.twitterImageUrl', event.target.value)
                      }
                      invalid={Boolean(fieldError('seo.twitterImageUrl'))}
                    />
                    {fieldError('seo.twitterImageUrl') ? (
                      <div className="Error">{fieldError('seo.twitterImageUrl')}</div>
                    ) : null}
                  </div>
                </div>
                <div className="grid layout-top-space-12">
                  <div className="layout-stack-gap-6">
                    <label htmlFor="canonicalUrl">Canonical URL</label>
                    <Input
                      id="canonicalUrl"
                      value={formik.values.seo?.canonicalUrl || ''}
                      onChange={(event) =>
                        formik.setFieldValue('seo.canonicalUrl', event.target.value)
                      }
                      invalid={Boolean(fieldError('seo.canonicalUrl'))}
                    />
                    {fieldError('seo.canonicalUrl') ? (
                      <div className="Error">{fieldError('seo.canonicalUrl')}</div>
                    ) : null}
                  </div>
                  <div className="layout-stack-gap-6">
                    <label htmlFor="indexable">Indexable</label>
                    <select
                      id="indexable"
                      value={formik.values.seo?.indexable ? 'true' : 'false'}
                      onChange={(event) =>
                        formik.setFieldValue('seo.indexable', event.target.value === 'true')
                      }
                      className="form-select"
                    >
                      <option value="true">Index</option>
                      <option value="false">No index</option>
                    </select>
                  </div>
                </div>
                <div className="layout-stack-gap-6 layout-top-space-12">
                  <label htmlFor="structuredDataJson">Structured data (JSON-LD)</label>
                  <textarea
                    id="structuredDataJson"
                    rows={6}
                    value={formik.values.seo?.structuredDataJson || ''}
                    onChange={(event) =>
                      formik.setFieldValue('seo.structuredDataJson', event.target.value)
                    }
                    className="form-textarea"
                  />
                  {fieldError('seo.structuredDataJson') ? (
                    <div className="Error">{fieldError('seo.structuredDataJson')}</div>
                  ) : null}
                </div>
                <div className="layout-stack-gap-6 layout-top-space-12">
                  <label>Hreflang overrides</label>
                  <div className="grid">
                    {LOCALES.map((locale) => {
                      const entry = formik.values.seo?.hreflangOverrides?.find(
                        (item) => item.locale === locale
                      );
                      return (
                        <div key={locale} className="layout-stack-gap-6">
                          <label htmlFor={`hreflang-${locale}`}>{locale}</label>
                          <Input
                            id={`hreflang-${locale}`}
                            value={entry?.url || ''}
                            onChange={(event) => {
                              const url = event.target.value;
                              const current = formik.values.seo?.hreflangOverrides || [];
                              const next = current.filter((item) => item.locale !== locale);
                              if (url.trim()) {
                                next.push({ locale, url });
                              }
                              formik.setFieldValue('seo.hreflangOverrides', next);
                            }}
                          />
                        </div>
                      );
                    })}
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
