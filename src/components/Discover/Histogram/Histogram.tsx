import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import styles from './Histogram.module.css';
import type { FlattenedHit } from '../../../types/opensearch';
import { buildHistogramBuckets } from '../../../utils/buildHistogramBuckets';

interface Props {
  hits: FlattenedHit[];
  totalHits: number;
  hitsRelation: 'eq' | 'gte';
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { time: string; count: number; bucketStart: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div>{format(new Date(d.bucketStart), 'MMM d, HH:mm:ss')}</div>
      <div><span className={styles.tooltipCount}>{d.count}</span> log entries</div>
    </div>
  );
}

export default function Histogram({ hits, totalHits, hitsRelation }: Props) {
  const buckets = useMemo(() => buildHistogramBuckets(hits), [hits]);

  if (buckets.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.empty}>No data for histogram</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.note}>
        {hits.length.toLocaleString()} stored / {totalHits.toLocaleString()}{hitsRelation === 'gte' ? '+' : ''} total
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="10%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(7, 130, 126, 0.08)' }} />
          <Bar dataKey="count" fill="#07827e" radius={[2, 2, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
