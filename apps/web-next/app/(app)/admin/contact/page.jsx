'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { api } from '@julio/api-client';
import { formatDateTime } from '@julio/shared';
import { Button, Card, DataTable, Spinner } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';
import { buildLocalePath } from '@julio/shared';
import { getLocaleFromDocument } from '@/src/i18n/index.js';

export default function ContactAdminListPage() {
  const locale = getLocaleFromDocument();
  const [inquiries, setInquiries] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus(null);
      setLoading(true);
      try {
        const data = await api.contact.getInquiries();
        if (active) setInquiries(data.inquiries || []);
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load inquiries';
        setStatus(message);
        notifications.notify({ title: 'Inquiry load failed', message });
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
      header: 'Contact',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.name}</strong>
          <div className="Kicker">{row.original.email}</div>
        </div>
      )
    },
    {
      header: 'Subject',
      accessorKey: 'subject'
    },
    {
      header: 'Status',
      accessorKey: 'status'
    },
    {
      header: 'Received',
      accessorKey: 'createdAt',
      cell: ({ row }) => (row.original.createdAt ? formatDateTime(row.original.createdAt) : '—')
    },
    {
      header: 'Actions',
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={buildLocalePath(`/admin/contact/${row.original._id}`, locale)}>
          <Button variant="secondary">View</Button>
        </Link>
      )
    }
  ];

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <div className="layout-inline-between layout-inline-center">
        <div className="page-section-header">
          <h1>Contact inbox</h1>
          <p className="Kicker">Track and respond to inbound inquiries.</p>
        </div>
      </div>

      {status ? <div className="Error">{String(status)}</div> : null}

      <Card className="layout-stack-gap-12">
        <div className="layout-inline-gap-8 layout-inline-center">
          <strong>All inquiries</strong>
          {loading ? (
            <span className="layout-inline-gap-8 layout-inline-center text-muted">
              <Spinner size="sm" label="Loading inquiries" />
              <span>Loading inquiries…</span>
            </span>
          ) : null}
        </div>
        <DataTable columns={columns} data={inquiries} emptyMessage="No inquiries yet." />
      </Card>
    </div>
  );
}
