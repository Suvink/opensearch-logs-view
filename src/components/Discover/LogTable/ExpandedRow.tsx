import { useState } from 'react';
import styles from './ExpandedRow.module.css';
import type { FlattenedHit } from '../../../types/opensearch';
import { highlightText } from '../../../utils/filterHits';

interface Props {
  hit: FlattenedHit;
  searchTerm: string;
  colSpan: number;
  onFilterFor: (field: string, value: string) => void;
}

const SKIP_KEYS = new Set(['_id', '_index', '_sortMs']);
const TOP_FIELDS = new Set(['log', '@timestamp', 'time', 'stream', '_p']);

export default function ExpandedRow({ hit, searchTerm, colSpan, onFilterFor }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const logValue = String(hit['log'] ?? '');
  const highlighted = searchTerm && logValue ? highlightText(logValue, searchTerm) : null;

  // Other fields (not log, not internal)
  const otherEntries = Object.entries(hit).filter(([k]) => !SKIP_KEYS.has(k) && k !== 'log');
  const topEntries = otherEntries.filter(([k]) => TOP_FIELDS.has(k));
  const detailEntries = otherEntries.filter(([k]) => !TOP_FIELDS.has(k));

  return (
    <tr className={styles.expandedTr}>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div className={styles.wrapper}>

          {/* Log message — prominent block at top */}
          {logValue ? (
            <div className={styles.logBlock}>
              <div className={styles.logLabel}>
                <span>log</span>
                <button
                  className={styles.filterBtn}
                  onClick={() => onFilterFor('log', logValue)}
                  title="Filter for this log value"
                >
                  + filter
                </button>
              </div>
              <pre
                className={styles.logMessage}
                dangerouslySetInnerHTML={{ __html: highlighted ?? escapeHtml(logValue) }}
              />
            </div>
          ) : null}

          {/* Top-level meta fields in a small pill row */}
          {topEntries.length > 0 && (
            <div className={styles.metaRow}>
              {topEntries.map(([key, value]) => {
                const strVal = String(value ?? '');
                return (
                  <div key={key} className={styles.metaPill}>
                    <span className={styles.metaKey}>{key}:</span>
                    <span className={styles.metaValue}>{strVal}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Collapsible details */}
          {detailEntries.length > 0 && (
            <div className={styles.detailsSection}>
              <button
                className={styles.detailsToggle}
                onClick={() => setDetailsOpen(o => !o)}
              >
                <span className={styles.detailsChevron}>{detailsOpen ? '▾' : '▸'}</span>
                Details
                <span className={styles.detailsCount}>({detailEntries.length} fields)</span>
              </button>

              {detailsOpen && (
                <div className={styles.grid}>
                  {detailEntries.map(([key, value]) => {
                    const strVal = String(value ?? '');
                    const highlightedVal = searchTerm ? highlightText(strVal, searchTerm) : null;
                    return (
                      <div key={key} className={styles.row}>
                        <div className={styles.key}>{key}</div>
                        <div className={styles.value}>
                          <span dangerouslySetInnerHTML={{ __html: highlightedVal ?? escapeHtml(strVal) }} />
                          {strVal && (
                            <button
                              className={styles.filterBtnInline}
                              onClick={() => onFilterFor(key, strVal)}
                              title={`Filter for ${key}`}
                            >
                              + filter
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
