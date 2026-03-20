import type { OpenSearchResponse, FileRecord, TimeRange, FlattenedHit } from '../types/opensearch';
import { flattenObject, getAllFields } from './flattenSource';

const MAX_HITS = 5000;

export function parseOpenSearchResponse(
  raw: unknown,
  fileName: string,
  fileSizeBytes: number
): { record: FileRecord; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON: expected an object');
  }

  const data = raw as Record<string, unknown>;

  if (!data.hits || typeof data.hits !== 'object') {
    throw new Error('Invalid OpenSearch response: missing "hits" field');
  }

  const hitsObj = data.hits as Record<string, unknown>;

  if (!Array.isArray(hitsObj.hits)) {
    throw new Error('Invalid OpenSearch response: "hits.hits" must be an array');
  }

  const allHits = hitsObj.hits as OpenSearchResponse['hits']['hits'];
  const totalHits = (hitsObj.total as { value: number; relation: string })?.value ?? allHits.length;
  const hitsRelation = ((hitsObj.total as { value: number; relation: string })?.relation ?? 'eq') as 'eq' | 'gte';

  let cappedHits = allHits;
  if (allHits.length > MAX_HITS) {
    cappedHits = allHits.slice(0, MAX_HITS);
    warnings.push(`Storing first ${MAX_HITS.toLocaleString()} of ${allHits.length.toLocaleString()} hits. Use pagination to browse results.`);
  }

  // Compute time range
  let timeRange: TimeRange | null = null;
  const timestamps = cappedHits
    .map(h => h._source?.['@timestamp'])
    .filter((t): t is string => typeof t === 'string')
    .map(t => new Date(t).getTime())
    .filter(t => !isNaN(t));

  if (timestamps.length > 0) {
    timeRange = {
      from: new Date(Math.min(...timestamps)).toISOString(),
      to: new Date(Math.max(...timestamps)).toISOString(),
    };
  }

  // Discover all fields
  const flattenedSources = cappedHits.map(h => flattenObject(h._source as Record<string, unknown>));
  const allFields = getAllFields(flattenedSources);

  const cappedData: OpenSearchResponse = {
    ...(raw as OpenSearchResponse),
    hits: {
      ...(data.hits as OpenSearchResponse['hits']),
      hits: cappedHits,
    },
  };

  const record: FileRecord = {
    id: crypto.randomUUID(),
    name: fileName,
    uploadedAt: new Date().toISOString(),
    sizeBytes: fileSizeBytes,
    totalHits,
    hitsRelation,
    hitsStored: cappedHits.length,
    timeRange,
    allFields,
    data: cappedData,
  };

  return { record, warnings };
}

export function getFlattenedHits(record: FileRecord): FlattenedHit[] {
  return record.data.hits.hits.map(hit => {
    const flat = flattenObject(hit._source as Record<string, unknown>);
    return {
      _id: hit._id,
      _index: hit._index,
      _sortMs: hit.sort?.[0] ?? new Date(hit._source['@timestamp']).getTime(),
      ...flat,
    } as FlattenedHit;
  });
}
