'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { api } from '@julio/api-client';
import { Button, Card, DataTable, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { buildLocalePath } from '@julio/shared';
import { getLocaleFromDocument } from '@/src/i18n/index.js';

export default function BlogAdminListPage() {
  const locale = getLocaleFromDocument();
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus(null);
      setLoading(true);
      try {
        const data = await api.blog.getPosts();
        if (active) setPosts(data.posts || []);
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load posts';
        setStatus(message);
        notifications.notify({ title: 'Post load failed', message });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const columns = [
    {
      header: 'Post',
      accessorKey: 'title',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.title}</strong>
          <div className="Kicker">
            {row.original.language} · {row.original.status} · {row.original.slug}
          </div>
        </div>
      )
    },
    {
      header: 'Actions',
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={buildLocalePath(`/admin/blog/${row.original._id}`, locale)}>
          <Button variant="secondary">Edit</Button>
        </Link>
      )
    }
  ];

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <div className="layout-inline-between layout-inline-center">
        <div className="page-section-header">
          <h1>Posts</h1>
          <p className="Kicker">Browse, create, and edit blog posts.</p>
        </div>
        <Link href={buildLocalePath('/admin/blog/new', locale)}>
          <Button>New post</Button>
        </Link>
      </div>

      {status ? <div className="Error">{String(status)}</div> : null}

      {loading ? (
        <Card className="layout-stack-gap-12">
          <div className="layout-inline-gap-8 layout-inline-center text-muted">
            <Spinner size="sm" label="Loading posts" />
            <span>Loading posts…</span>
          </div>
        </Card>
      ) : (
        <DataTable columns={columns} data={posts} emptyMessage="No posts yet." />
      )}
    </div>
  );
}

