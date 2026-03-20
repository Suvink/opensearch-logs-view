import { useMemo } from 'react';
import styles from './LogTable.module.css';
import LogTableRow from './LogTableRow';
import type { FlattenedHit } from '../../../types/opensearch';
import { useDiscover, PAGE_SIZE } from '../../../context/DiscoverContext';

interface Props {
  hits: FlattenedHit[];
  columns: string[];
  totalHits: number;
  hitsStored: number;
  hitsRelation: 'eq' | 'gte';
}

export default function LogTable({ hits, columns, totalHits, hitsStored, hitsRelation }: Props) {
  const { expandedRowIds, toggleRow, sortField, sortDirection, setSort, setSearch, searchTerm, currentPage, setPage } = useDiscover();

  const displayColumns = columns.filter(c => c !== '@timestamp');

  const sorted = useMemo(() => {
    return [...hits].sort((a, b) => {
      if (sortField === '@timestamp') {
        const aMs = a._sortMs as number;
        const bMs = b._sortMs as number;
        return sortDirection === 'desc' ? bMs - aMs : aMs - bMs;
      }
      const aVal = String(a[sortField] ?? '');
      const bVal = String(b[sortField] ?? '');
      return sortDirection === 'desc'
        ? bVal.localeCompare(aVal)
        : aVal.localeCompare(bVal);
    });
  }, [hits, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginated = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSort(field, sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(field, 'desc');
    }
  };

  const handleFilterFor = (_field: string, value: string) => {
    setSearch(value);
  };

  if (hits.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.noResults}>
          No log entries match your search criteria.
        </div>
      </div>
    );
  }

  const allColumns = ['@timestamp', ...displayColumns];

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th} />
            {allColumns.map(col => {
              const isActive = sortField === col;
              return (
                <th
                  key={col}
                  className={`${styles.th} ${isActive ? styles.thActive : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <div className={styles.thInner}>
                    {col}
                    <span className={styles.sortIcon}>
                      {isActive ? (sortDirection === 'desc' ? '↓' : '↑') : '↕'}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {paginated.map(hit => (
            <LogTableRow
              key={hit._id as string}
              hit={hit}
              columns={allColumns}
              isExpanded={expandedRowIds.has(hit._id as string)}
              searchTerm={searchTerm}
              onToggle={() => toggleRow(hit._id as string)}
              onFilterFor={handleFilterFor}
            />
          ))}
        </tbody>
      </table>

      <div className={styles.paginationBar}>
        <div className={styles.paginationInfo}>
          Rows {(pageStart + 1).toLocaleString()}–{Math.min(pageStart + PAGE_SIZE, sorted.length).toLocaleString()} of{' '}
          <strong>{sorted.length.toLocaleString()}</strong> filtered
          {hitsStored < totalHits && (
            <span className={styles.totalNote}>
              {' '}(stored {hitsStored.toLocaleString()} of {totalHits.toLocaleString()}{hitsRelation === 'gte' ? '+' : ''} total)
            </span>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.paginationControls}>
            <button
              className={styles.pageBtn}
              disabled={safePage === 1}
              onClick={() => setPage(1)}
              title="First page"
            >«</button>
            <button
              className={styles.pageBtn}
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              title="Previous page"
            >‹</button>

            {/* Page number pills */}
            {getPaginationRange(safePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ''}`}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              )
            )}

            <button
              className={styles.pageBtn}
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              title="Next page"
            >›</button>
            <button
              className={styles.pageBtn}
              disabled={safePage === totalPages}
              onClick={() => setPage(totalPages)}
              title="Last page"
            >»</button>
          </div>
        )}
      </div>
    </div>
  );
}

function getPaginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: (number | '...')[] = [];
  result.push(1);
  if (current > 3) result.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) result.push(p);
  if (current < total - 2) result.push('...');
  result.push(total);
  return result;
}
