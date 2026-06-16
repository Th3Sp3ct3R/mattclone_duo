'use client';

import { Card, Spinner } from '@julio/ui';

export function EngineStatGrid({ summary, loading }) {
  return (
    <div className="HomeFeatureGrid">
      {[
        ['Devices', summary.devices],
        ['Accounts', summary.accounts],
        ['Active posts', summary.activePosts],
        ['Proxies', summary.proxies]
      ].map(([label, value]) => (
        <Card key={label}>
          <div className="layout-stack-gap-6">
            <div className="Kicker">{label}</div>
            <strong className="text-stat">{loading ? <Spinner size="sm" label={`Loading ${label}`} /> : value}</strong>
          </div>
        </Card>
      ))}
    </div>
  );
}
