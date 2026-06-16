"use client";

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { Card } from '../../primitives/Card/Card.jsx';
import { cx } from '../../primitives/_utils/cx.js';

const fallbackColors = ['#7c3aed', '#0ea5e9', '#22c55e', '#f97316', '#e11d48', '#64748b'];

function resolveColor(color, index) {
  return color || fallbackColors[index % fallbackColors.length];
}

export function ChartCard({
  title,
  subtitle,
  data = [],
  type = 'line',
  series = [],
  xKey = 'name',
  size = 'md',
  showLegend = true,
  showGrid = true,
  valueKey = 'value',
  nameKey = 'name',
  innerRadius = 60,
  outerRadius = 90,
  className = ''
}) {
  const resolvedSeries = useMemo(
    () =>
      (series || []).map((item, index) => ({
        ...item,
        color: resolveColor(item.color, index)
      })),
    [series]
  );

  return (
    <Card className={cx('c-ChartCard', className)}>
      {(title || subtitle) && (
        <div className="c-ChartCard__header">
          {title ? <h3 className="c-ChartCard__title">{title}</h3> : null}
          {subtitle ? <div className="c-ChartCard__subtitle">{subtitle}</div> : null}
        </div>
      )}

      <div className={cx('c-ChartCard__body', `c-ChartCard__body--${size}`)}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data}>
              {showGrid ? <CartesianGrid strokeDasharray="3 3" /> : null}
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              {showLegend ? <Legend /> : null}
              {resolvedSeries.map((item) => (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : null}

          {type === 'bar' ? (
            <BarChart data={data}>
              {showGrid ? <CartesianGrid strokeDasharray="3 3" /> : null}
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              {showLegend ? <Legend /> : null}
              {resolvedSeries.map((item) => (
                <Bar key={item.key} dataKey={item.key} fill={item.color} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          ) : null}

          {type === 'area' ? (
            <AreaChart data={data}>
              {showGrid ? <CartesianGrid strokeDasharray="3 3" /> : null}
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              {showLegend ? <Legend /> : null}
              {resolvedSeries.map((item) => (
                <Area
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          ) : null}

          {type === 'pie' || type === 'donut' ? (
            <PieChart>
              <Tooltip />
              {showLegend ? <Legend /> : null}
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                innerRadius={type === 'donut' ? innerRadius : 0}
                outerRadius={outerRadius}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={resolveColor(entry.color, index)} />
                ))}
              </Pie>
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

