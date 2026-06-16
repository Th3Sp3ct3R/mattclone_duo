import { Card, ChartCard } from '@julio/ui';

const trafficData = [
  { name: 'Mon', visits: 120, signups: 24 },
  { name: 'Tue', visits: 180, signups: 32 },
  { name: 'Wed', visits: 140, signups: 28 },
  { name: 'Thu', visits: 220, signups: 44 },
  { name: 'Fri', visits: 200, signups: 38 },
  { name: 'Sat', visits: 160, signups: 26 },
  { name: 'Sun', visits: 190, signups: 34 }
];

const retentionData = [
  { name: 'Week 1', active: 100, retained: 72 },
  { name: 'Week 2', active: 84, retained: 60 },
  { name: 'Week 3', active: 70, retained: 49 },
  { name: 'Week 4', active: 58, retained: 38 }
];

const revenueData = [
  { name: 'Q1', revenue: 42 },
  { name: 'Q2', revenue: 56 },
  { name: 'Q3', revenue: 61 },
  { name: 'Q4', revenue: 74 }
];

const platformSplit = [
  { name: 'Web', value: 58 },
  { name: 'Mobile', value: 32 },
  { name: 'API', value: 10 }
];

const conversionMix = [
  { name: 'Free', value: 72 },
  { name: 'Pro', value: 21 },
  { name: 'Enterprise', value: 7 }
];

export default function AnalyticsPage() {
  return (
    <div className="page-section-stack">
      <div className="page-section-header">
        <h1>Analytics</h1>
        <p className="Kicker">Preview analytics widgets and chart styles.</p>
      </div>

      <div className="HomeFeatureGrid">
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Weekly visits</div>
            <strong className="text-stat">1,240</strong>
            <div className="Kicker">+12% vs last week</div>
          </div>
        </Card>
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Active teams</div>
            <strong className="text-stat">148</strong>
            <div className="Kicker">+5% in 30 days</div>
          </div>
        </Card>
        <Card>
          <div className="layout-stack-gap-6">
            <div className="Kicker">Conversion</div>
            <strong className="text-stat">4.6%</strong>
            <div className="Kicker">Stable week over week</div>
          </div>
        </Card>
      </div>

      <div className="HomeFeatureGrid">
        <ChartCard
          title="Traffic"
          subtitle="Visits and signups"
          type="line"
          data={trafficData}
          xKey="name"
          series={[
            { key: 'visits', label: 'Visits' },
            { key: 'signups', label: 'Signups' }
          ]}
        />
        <ChartCard
          title="Retention"
          subtitle="Active vs retained"
          type="area"
          data={retentionData}
          xKey="name"
          series={[
            { key: 'active', label: 'Active' },
            { key: 'retained', label: 'Retained' }
          ]}
        />
      </div>

      <div className="HomeFeatureGrid">
        <ChartCard
          title="Revenue"
          subtitle="Quarterly"
          type="bar"
          data={revenueData}
          xKey="name"
          series={[{ key: 'revenue', label: 'Revenue' }]}
        />
        <ChartCard
          title="Platform split"
          subtitle="Traffic source"
          type="pie"
          data={platformSplit}
          valueKey="value"
          nameKey="name"
        />
        <ChartCard
          title="Plan mix"
          subtitle="Conversion breakdown"
          type="donut"
          data={conversionMix}
          valueKey="value"
          nameKey="name"
        />
      </div>
    </div>
  );
}

