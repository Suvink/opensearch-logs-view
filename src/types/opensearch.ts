export interface KubernetesLabels {
  [key: string]: string;
}

export interface KubernetesAnnotations {
  [key: string]: string;
}

export interface KubernetesMetadata {
  pod_name?: string;
  namespace_name?: string;
  pod_id?: string;
  labels?: KubernetesLabels;
  annotations?: KubernetesAnnotations;
  host?: string;
  pod_ip?: string;
  container_name?: string;
  docker_id?: string;
  container_hash?: string;
  container_image?: string;
}

export interface LogSource {
  '@timestamp': string;
  time?: string;
  stream?: string;
  _p?: string;
  log?: string;
  kubernetes?: KubernetesMetadata;
  [key: string]: unknown;
}

export interface OpenSearchHit {
  _index: string;
  _id: string;
  _score: number | null;
  _source: LogSource;
  sort?: number[];
}

export interface OpenSearchHitsTotal {
  value: number;
  relation: 'eq' | 'gte';
}

export interface OpenSearchHits {
  total: OpenSearchHitsTotal;
  max_score: number | null;
  hits: OpenSearchHit[];
}

export interface OpenSearchResponse {
  took: number;
  timed_out: boolean;
  hits: OpenSearchHits;
  _shards?: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
}

export interface TimeRange {
  from: string;
  to: string;
}

export interface FileRecord {
  id: string;
  name: string;
  uploadedAt: string;
  sizeBytes: number;
  totalHits: number;
  hitsRelation: 'eq' | 'gte';
  hitsStored: number;
  timeRange: TimeRange | null;
  allFields: string[];
  data: OpenSearchResponse;
}

export interface HistogramBucket {
  time: string;
  count: number;
  bucketStart: number;
}

export type FlattenedHit = {
  _id: string;
  _index: string;
  _sortMs: number;
  [key: string]: unknown;
};
