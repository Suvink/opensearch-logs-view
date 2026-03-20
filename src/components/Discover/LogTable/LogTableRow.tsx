import { format } from 'date-fns';
import styles from './LogTableRow.module.css';
import ExpandedRow from './ExpandedRow';
import type { FlattenedHit } from '../../../types/opensearch';
import { highlightText } from '../../../utils/filterHits';

interface Props {
  hit: FlattenedHit;
  columns: string[];
  isExpanded: boolean;
  searchTerm: string;
  onToggle: () => void;
  onFilterFor: (field: string, value: string) => void;
}

function formatTimestamp(ts: unknown): string {
  if (!ts) return '';
  try {
    return format(new Date(String(ts)), 'MMM d, yyyy @ HH:mm:ss.SSS');
  } catch {
    return String(ts);
  }
}

export default function LogTableRow({ hit, columns, isExpanded, searchTerm, onToggle, onFilterFor }: Props) {
  const colSpan = 1 + columns.length + 1; // toggle + timestamp + columns

  return (
    <>
      <tr className={`${styles.row} ${isExpanded ? styles.expanded : ''}`}>
        <td className={styles.td}>
          <button className={styles.toggleBtn} onClick={onToggle} title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </td>

        <td className={`${styles.td} ${styles.timestamp}`}>
          {formatTimestamp(hit['@timestamp'])}
        </td>

        {columns.filter(c => c !== '@timestamp').map(col => {
          const value = String(hit[col] ?? '');
          const isLog = col === 'log';
          return (
            <td key={col} className={`${styles.td} ${isLog ? styles.logCell : styles.cell}`}>
              {searchTerm ? (
                <span dangerouslySetInnerHTML={{ __html: highlightText(value, searchTerm) }} />
              ) : (
                value
              )}
              {!isLog && (
                <div className={styles.filterBtns}>
                  <button
                    className={styles.filterBtn}
                    title={`Filter for ${col}:${value.slice(0, 40)}`}
                    onClick={e => { e.stopPropagation(); onFilterFor(col, value); }}
                  >+</button>
                </div>
              )}
            </td>
          );
        })}
      </tr>

      {isExpanded && (
        <ExpandedRow
          hit={hit}
          searchTerm={searchTerm}
          colSpan={colSpan}
          onFilterFor={onFilterFor}
        />
      )}
    </>
  );
}
