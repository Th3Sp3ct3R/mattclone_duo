'use client';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@julio/api-client';
import { AnalyticsEvents, trackEvent } from '@julio/analytics';
import { formatDate } from '@julio/shared';
import { Card, ChartCard, Spinner } from '@julio/ui';
import { analytics } from '@/src/analytics/client.js';
import { notifications } from '@/src/notifications/client.js';

const emptyEngineSummary = {
  devices: 0,
  accounts: 0,
  activePosts: 0,
  proxies: 0
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [engineSummary, setEngineSummary] = useState(emptyEngineSummary);
  const [summary, setSummary] = useState({
    meEmail: '',
    counts: {
      totalBookings: 0,
      upcomingBookings: 0,
      totalUsers: 0,
      totalServices: 0,
      paymentRequiredServices: 0,
      totalPosts: 0,
      totalAuthors: 0,
      totalCategories: 0
    },
    seo: {
      defaultLocale: 'en',
      updatedAt: null
    },
    series: {
      bookingsLast7Days: [],
      usersLast30Days: []
    }
  });

  useEffect(() => {
    let active = true;
    trackEvent(analytics, AnalyticsEvents.DashboardViewed, { platform: 'web' });
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [data, engineData] = await Promise.all([
          api.admin.getDashboardSummary(),
          api.engine.getFleetSummary()
        ]);
        if (!active) return;

        setSummary({
          meEmail: data.meEmail || '',
          counts: data.counts,
          seo: {
            defaultLocale: data.seo?.defaultLocale || 'en',
            updatedAt: data.seo?.updatedAt || null
          },
          series: data.series
        });
        setEngineSummary(engineData.summary || emptyEngineSummary);
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load dashboard data.';
        setError(message);
        notifications.notify({ title: 'Dashboard error', message });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const bookingSeries = useMemo(
    () =>
      summary.series.bookingsLast7Days.map((point) => ({
        name: point.label,
        bookings: point.value
      })),
    [summary.series.bookingsLast7Days]
  );

  const userSeries = useMemo(
    () =>
      summary.series.usersLast30Days.map((point) => ({
        name: point.label,
        users: point.value
      })),
    [summary.series.usersLast30Days]
  );

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <div className="page-section-header">
        <h1>Dashboard</h1>
        <p className="Kicker">Admin snapshot across bookings, users, payments, and content.</p>
      </div>

      {error ? <div className="Error">{error}</div> : null}

      <div className="HomeFeatureGrid">
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Total bookings</div>
            <strong className="text-stat">
              {loading ? (
                <span className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label="Loading total bookings" />
                  <span>Loading</span>
                </span>
              ) : (
                summary.counts.totalBookings
              )}
            </strong>
            <div className="Kicker">{loading ? 'Loading…' : 'All time'}</div>
          </div>
        </Card>
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Upcoming bookings</div>
            <strong className="text-stat">
              {loading ? (
                <span className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label="Loading upcoming bookings" />
                  <span>Loading</span>
                </span>
              ) : (
                summary.counts.upcomingBookings
              )}
            </strong>
            <div className="Kicker">{loading ? 'Loading…' : 'Next scheduled'}</div>
          </div>
        </Card>
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Total users</div>
            <strong className="text-stat">
              {loading ? (
                <span className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label="Loading total users" />
                  <span>Loading</span>
                </span>
              ) : (
                summary.counts.totalUsers
              )}
            </strong>
            <div className="Kicker">{loading ? 'Loading…' : 'Across all roles'}</div>
          </div>
        </Card>
      </div>

      <div className="HomeFeatureGrid">
        {[
          ['Engine devices', engineSummary.devices, 'VMOS pads in inventory'],
          ['Engine accounts', engineSummary.accounts, 'TikTok and Instagram accounts'],
          ['Active engine posts', engineSummary.activePosts, 'Currently queued or in flight'],
          ['Engine proxies', engineSummary.proxies, 'Available proxy inventory']
        ].map(([label, value, meta]) => (
          <Card key={label}>
            <div className="layout-stack-gap-6">
              <div className="Kicker">{label}</div>
              <strong className="text-stat">
                {loading ? (
                  <span className="layout-inline-gap-8 layout-inline-center text-muted">
                    <Spinner size="sm" label={`Loading ${label}`} />
                    <span>Loading</span>
                  </span>
                ) : (
                  value
                )}
              </strong>
              <div className="Kicker">{loading ? 'Loading…' : meta}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="HomeFeatureGrid">
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Services</div>
            <strong className="text-stat">
              {loading ? (
                <span className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label="Loading services" />
                  <span>Loading</span>
                </span>
              ) : (
                summary.counts.totalServices
              )}
            </strong>
            <div className="Kicker">
              {loading
                ? 'Loading…'
                : `${summary.counts.paymentRequiredServices} require payment`}
            </div>
          </div>
        </Card>
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Content</div>
            <strong className="text-stat">
              {loading ? (
                <span className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label="Loading content totals" />
                  <span>Loading</span>
                </span>
              ) : (
                summary.counts.totalPosts
              )}
            </strong>
            <div className="Kicker">
              {loading
                ? 'Loading…'
                : `${summary.counts.totalAuthors} authors · ${summary.counts.totalCategories} categories`}
            </div>
          </div>
        </Card>
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">SEO</div>
            <strong className="text-stat">
              {loading ? (
                <span className="layout-inline-gap-8 layout-inline-center text-muted">
                  <Spinner size="sm" label="Loading SEO settings" />
                  <span>Loading</span>
                </span>
              ) : (
                summary.seo.defaultLocale
              )}
            </strong>
            <div className="Kicker">
              {loading
                ? 'Loading…'
                : summary.seo.updatedAt
                ? `Updated ${formatDate(summary.seo.updatedAt, { format: 'DDD' })}`
                : 'No updates yet'}
            </div>
          </div>
        </Card>
      </div>

      <div className="HomeFeatureGrid">
        <Card>
          <h3>Auth</h3>
          <div className="text-muted">
            Signed in as <strong>{summary.meEmail || '—'}</strong>
          </div>
        </Card>
        <Card>
          <h3>Payments</h3>
          <div className="text-muted">
            {summary.counts.paymentRequiredServices
              ? `${summary.counts.paymentRequiredServices} services require payment.`
              : 'No paid services configured yet.'}
          </div>
        </Card>
      </div>

      <div className="HomeFeatureGrid">
        {loading ? (
          <Card className="layout-stack-gap-12">
            <div className="layout-inline-gap-8 layout-inline-center text-muted">
              <Spinner size="sm" label="Loading bookings chart" />
              <span>Loading chart…</span>
            </div>
          </Card>
        ) : (
          <ChartCard
            title="Bookings"
            subtitle="Last 7 days"
            type="line"
            data={bookingSeries}
            xKey="name"
            series={[{ key: 'bookings', label: 'Bookings' }]}
          />
        )}
        {loading ? (
          <Card className="layout-stack-gap-12">
            <div className="layout-inline-gap-8 layout-inline-center text-muted">
              <Spinner size="sm" label="Loading users chart" />
              <span>Loading chart…</span>
            </div>
          </Card>
        ) : (
          <ChartCard
            title="Users"
            subtitle="Last 30 days"
            type="area"
            data={userSeries}
            xKey="name"
            series={[{ key: 'users', label: 'Users' }]}
          />
        )}
      </div>
    </div>
  );
}

