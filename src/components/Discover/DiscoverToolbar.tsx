import { useRef, useEffect, useState } from 'react';
import styles from './DiscoverToolbar.module.css';
import { useDiscover } from '../../context/DiscoverContext';
import type { TimeRange } from '../../types/opensearch';
import TimePicker from './TimePicker/TimePicker';

interface Props {
  filteredCount: number;
  totalStored: number;
  fileTimeRange: TimeRange | null;
}

export default function DiscoverToolbar({ filteredCount, totalStored, fileTimeRange }: Props) {
  const { searchTerm, setSearch } = useDiscover();
  const [inputValue, setInputValue] = useState(searchTerm);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const handleChange = (val: string) => {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 200);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.099zm-5.242 1.156a5.5 5.5 0 110-11 5.5 5.5 0 010 11z"/>
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder='Lucene: field:value  "exact phrase"  field:val*  AND  OR  NOT'
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
        />
        {inputValue && (
          <button className={styles.clearBtn} onClick={() => handleChange('')} title="Clear search">✕</button>
        )}
      </div>

      <TimePicker fileTimeRange={fileTimeRange} />

      <div className={styles.resultCount}>
        <strong>{filteredCount.toLocaleString()}</strong>
        <span> / {totalStored.toLocaleString()} hits</span>
      </div>
    </div>
  );
}
