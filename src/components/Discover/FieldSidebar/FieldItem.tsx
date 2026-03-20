import styles from './FieldItem.module.css';

interface Props {
  field: string;
  isSelected: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

function getFieldType(field: string): string {
  if (field === '@timestamp' || field === 'time') return 'date';
  if (field.includes('_count') || field.includes('_size') || field.includes('_ms')) return 'num';
  return 'str';
}

function getTypeColor(type: string): string {
  if (type === 'date') return '#07827e';
  if (type === 'num') return '#006DE4';
  return '#5a6875';
}

export default function FieldItem({ field, isSelected, onAdd, onRemove }: Props) {
  const type = getFieldType(field);

  return (
    <div className={`${styles.item} ${isSelected ? styles.selected : ''}`}>
      <span className={styles.typeTag} style={{ color: getTypeColor(type) }}>
        {type}
      </span>
      <span className={styles.name} title={field}>{field}</span>
      <div className={styles.actions}>
        {isSelected ? (
          <button className={styles.actionBtn} onClick={onRemove} title="Remove column">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        ) : (
          <button className={styles.actionBtn} onClick={onAdd} title="Add as column">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 1v10M1 6h10"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
