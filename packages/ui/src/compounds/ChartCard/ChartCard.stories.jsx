import { ChartCard } from './ChartCard.jsx';

export default { title: 'Compounds/ChartCard' };

const trendData = [
  { name: 'Mon', visits: 120, signups: 24 },
  { name: 'Tue', visits: 180, signups: 32 },
  { name: 'Wed', visits: 140, signups: 28 },
  { name: 'Thu', visits: 220, signups: 44 },
  { name: 'Fri', visits: 200, signups: 38 }
];

const breakdownData = [
  { name: 'Web', value: 58 },
  { name: 'Mobile', value: 28 },
  { name: 'API', value: 14 }
];

export const Line = {
  render: () => (
    <ChartCard
      title="Weekly traffic"
      subtitle="Visits and signups"
      type="line"
      data={trendData}
      xKey="name"
      series={[
        { key: 'visits', label: 'Visits' },
        { key: 'signups', label: 'Signups' }
      ]}
    />
  )
};

export const Bar = {
  render: () => (
    <ChartCard
      title="Weekly traffic"
      subtitle="Bar view"
      type="bar"
      data={trendData}
      xKey="name"
      series={[
        { key: 'visits', label: 'Visits' },
        { key: 'signups', label: 'Signups' }
      ]}
    />
  )
};

export const Area = {
  render: () => (
    <ChartCard
      title="Weekly traffic"
      subtitle="Area view"
      type="area"
      data={trendData}
      xKey="name"
      series={[
        { key: 'visits', label: 'Visits' },
        { key: 'signups', label: 'Signups' }
      ]}
    />
  )
};

export const Donut = {
  render: () => (
    <ChartCard
      title="Traffic split"
      subtitle="By platform"
      type="donut"
      data={breakdownData}
      valueKey="value"
      nameKey="name"
    />
  )
};

