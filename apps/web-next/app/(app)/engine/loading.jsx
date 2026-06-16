import { Card, Spinner } from '@julio/ui';

export default function EngineLoading() {
  return (
    <div className="page-section-stack">
      <div className="page-section-header">
        <h1>Engine</h1>
        <p className="Kicker">Loading operator console.</p>
      </div>
      <Card>
        <div className="layout-inline-gap-8 layout-inline-center text-muted">
          <Spinner size="sm" label="Loading engine console" />
          <span>Loading engine data...</span>
        </div>
      </Card>
    </div>
  );
}
