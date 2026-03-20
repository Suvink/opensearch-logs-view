import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import styles from './UploadArea.module.css';
import { parseOpenSearchResponse } from '../../utils/parseOpenSearchResponse';
import { useFiles } from '../../context/FileContext';

export default function UploadArea() {
  const { addFile } = useFiles();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Please upload a .json file (OpenSearch export).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — maximum allowed is 10 MB.`);
      return;
    }

    setLoading(true);
    setError(null);
    setWarnings([]);

    const reader = new FileReader();
    reader.onload = () => {
      setTimeout(() => {
        try {
          const raw = JSON.parse(reader.result as string);
          const { record, warnings: w } = parseOpenSearchResponse(raw, file.name, file.size);
          const result = addFile(record);
          if (!result.ok) {
            setError(result.error ?? 'Failed to save file.');
          } else {
            setWarnings(w);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to parse JSON file.');
        } finally {
          setLoading(false);
        }
      }, 0);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0] ?? e.dataTransfer.items[0]?.getAsFile();
    if (file) processFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div>
      <div
        className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Parsing file...
          </div>
        ) : (
          <>
            <div className={styles.icon}>📂</div>
            <div className={styles.title}>Drop an OpenSearch JSON export here</div>
            <div className={styles.subtitle}>
              or <span className={styles.browseLink}>browse to upload</span>
              <br />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Max 10 MB · .json OpenSearch export</span>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className={styles.hiddenInput}
        onChange={onChange}
      />

      {error && <div className={styles.error}>⚠ {error}</div>}
      {warnings.map((w, i) => (
        <div key={i} className={styles.warning}>ℹ {w}</div>
      ))}
    </div>
  );
}
