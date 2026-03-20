import { format } from 'date-fns';
import type { FlattenedHit, HistogramBucket } from '../types/opensearch';

function getBucketSizeMs(spanMs: number): { sizeMs: number; formatStr: string } {
  const min = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (spanMs < 5 * min) return { sizeMs: 10_000, formatStr: 'HH:mm:ss' };
  if (spanMs < hour) return { sizeMs: min, formatStr: 'HH:mm' };
  if (spanMs < day) return { sizeMs: hour, formatStr: 'HH:mm' };
  return { sizeMs: day, formatStr: 'MMM d' };
}

export function buildHistogramBuckets(hits: FlattenedHit[]): HistogramBucket[] {
  if (hits.length === 0) return [];

  const timestamps = hits.map(h => h._sortMs as number).filter(t => !isNaN(t));
  if (timestamps.length === 0) return [];

  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spanMs = maxTs - minTs || 1;

  const { sizeMs, formatStr } = getBucketSizeMs(spanMs);

  const bucketMap = new Map<number, number>();
  for (const ts of timestamps) {
    const bucketStart = Math.floor(ts / sizeMs) * sizeMs;
    bucketMap.set(bucketStart, (bucketMap.get(bucketStart) ?? 0) + 1);
  }

  // Fill empty buckets between min and max
  const firstBucket = Math.floor(minTs / sizeMs) * sizeMs;
  const lastBucket = Math.floor(maxTs / sizeMs) * sizeMs;
  for (let b = firstBucket; b <= lastBucket; b += sizeMs) {
    if (!bucketMap.has(b)) bucketMap.set(b, 0);
  }

  return Array.from(bucketMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucketStart, count]) => ({
      time: format(new Date(bucketStart), formatStr),
      count,
      bucketStart,
    }));
}
