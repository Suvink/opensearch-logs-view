import { useState } from 'react';
import { format } from 'date-fns';
import styles from './SavedFileItem.module.css';
import type { FileRecord } from '../../types/opensearch';

interface Props {
  file: FileRecord;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function SavedFileItem({ file, isSelected, onSelect, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className={`${styles.item} ${isSelected ? styles.selected : ''}`}
      onClick={() => { if (!confirming) onSelect(); }}
    >
      <div className={styles.fileIcon}>📄</div>

      <div className={styles.info}>
        <div className={styles.name} title={file.name}>{file.name}</div>
        <div className={styles.meta}>
          <span className={styles.metaTag}>
            {file.hitsStored.toLocaleString()}{file.hitsRelation === 'gte' ? '+' : ''} hits
          </span>
          <span className={styles.metaTag}>{formatBytes(file.sizeBytes)}</span>
          <span className={styles.metaTag}>
            {format(new Date(file.uploadedAt), 'MMM d, HH:mm')}
          </span>
        </div>
      </div>

      <div className={styles.actions} onClick={e => e.stopPropagation()}>
        {confirming ? (
          <div className={styles.confirmDelete}>
            <span>Delete?</span>
            <button className={styles.confirmBtn} onClick={() => { onDelete(); setConfirming(false); }}>
              Yes
            </button>
            <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>
              No
            </button>
          </div>
        ) : (
          <button
            className={styles.deleteBtn}
            onClick={() => setConfirming(true)}
            title="Delete file"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
