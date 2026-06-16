'use client';

import { Button, Card } from '@julio/ui';

export default function EngineError({ error, reset }) {
  return (
    <div className="page-section-stack">
      <div className="page-section-header">
        <h1>Engine</h1>
        <p className="Kicker">The operator console could not load.</p>
      </div>
      <Card>
        <div className="layout-stack-gap-12">
          <div className="Error">{error?.message || 'Unknown engine console error.'}</div>
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        </div>
      </Card>
    </div>
  );
}
