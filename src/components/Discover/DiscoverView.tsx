import { useMemo } from 'react';
import styles from './DiscoverView.module.css';
import FieldSidebar from './FieldSidebar/FieldSidebar';
import Histogram from './Histogram/Histogram';
import LogTable from './LogTable/LogTable';
import DiscoverToolbar from './DiscoverToolbar';
import type { FileRecord } from '../../types/opensearch';
import { useDiscover } from '../../context/DiscoverContext';
import { getFlattenedHits } from '../../utils/parseOpenSearchResponse';
import { filterHits } from '../../utils/filterHits';

interface Props {
  file: FileRecord;
}

export default function DiscoverView({ file }: Props) {
  const { searchTerm, selectedColumns, timeFrom, timeTo } = useDiscover();

  const allHits = useMemo(() => getFlattenedHits(file), [file]);

  // 1. Apply time filter
  const timeFilteredHits = useMemo(() => {
    if (!timeFrom && !timeTo) return allHits;
    const fromMs = timeFrom ? new Date(timeFrom).getTime() : -Infinity;
    const toMs = timeTo ? new Date(timeTo).getTime() : Infinity;
    return allHits.filter(h => {
      const ms = h._sortMs as number;
      return ms >= fromMs && ms <= toMs;
    });
  }, [allHits, timeFrom, timeTo]);

  // 2. Apply text/Lucene search
  const filteredHits = useMemo(() => filterHits(timeFilteredHits, searchTerm), [timeFilteredHits, searchTerm]);

  return (
    <div className={styles.view}>
      <DiscoverToolbar
        filteredCount={filteredHits.length}
        totalStored={file.hitsStored}
        fileTimeRange={file.timeRange}
      />

      <div className={styles.layout}>
        <FieldSidebar allFields={file.allFields} />

        <div className={styles.main}>
          <Histogram
            hits={filteredHits}
            totalHits={file.totalHits}
            hitsRelation={file.hitsRelation}
          />
          <LogTable
            hits={filteredHits}
            columns={selectedColumns}
            totalHits={file.totalHits}
            hitsStored={file.hitsStored}
            hitsRelation={file.hitsRelation}
          />
        </div>
      </div>
    </div>
  );
}
