import { useState, useRef, useCallback } from 'react';
import styles from './FieldSidebar.module.css';
import FieldItem from './FieldItem';
import { useDiscover } from '../../../context/DiscoverContext';

interface Props {
  allFields: string[];
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 260;

export default function FieldSidebar({ allFields }: Props) {
  const { selectedColumns, addColumn, removeColumn, sidebarCollapsed, toggleSidebar } = useDiscover();
  const [search, setSearch] = useState('');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);

  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + delta)));
    };

    const onMouseUp = () => {
      setResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [width]);

  const filtered = search.trim()
    ? allFields.filter(f => f.toLowerCase().includes(search.toLowerCase()))
    : allFields;

  const selectedFields = filtered.filter(f => selectedColumns.includes(f));
  const availableFields = filtered.filter(f => !selectedColumns.includes(f));

  if (sidebarCollapsed) {
    return (
      <div className={`${styles.sidebar} ${styles.collapsed}`} onClick={toggleSidebar} title="Expand sidebar">
        <div className={styles.collapsedToggle}>▶ Fields</div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.sidebar} ${resizing ? styles.resizing : ''}`}
      style={{ width }}
    >
      <button className={styles.toggleBtn} onClick={toggleSidebar} title="Collapse sidebar">
        ◀
      </button>

      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search fields..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.fieldList}>
          {selectedFields.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Selected fields</div>
              {selectedFields.map(f => (
                <FieldItem
                  key={f}
                  field={f}
                  isSelected
                  onAdd={() => addColumn(f)}
                  onRemove={() => removeColumn(f)}
                />
              ))}
            </div>
          )}

          {availableFields.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Available fields</div>
              {availableFields.map(f => (
                <FieldItem
                  key={f}
                  field={f}
                  isSelected={false}
                  onAdd={() => addColumn(f)}
                  onRemove={() => removeColumn(f)}
                />
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              No fields match "{search}"
            </div>
          )}
        </div>
      </div>

      {/* Drag handle — sits on the right edge */}
      <div
        className={styles.resizeHandle}
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />
    </div>
  );
}
