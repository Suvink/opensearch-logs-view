import styles from './GlobalHeader.module.css';
import { useFiles } from '../../context/FileContext';

interface Props {
  panelOpen: boolean;
  onTogglePanel: () => void;
}

export default function GlobalHeader({ panelOpen, onTogglePanel }: Props) {
  const { files, selectedFile } = useFiles();

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>OS</div>
      </div>

      <button
        className={`${styles.filesButton} ${panelOpen ? styles.active : ''}`}
        onClick={onTogglePanel}
        title="Manage uploaded files"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 3A1.5 1.5 0 013 1.5h4.586a1.5 1.5 0 011.06.44l.915.914A1.5 1.5 0 0010.62 3.5H13A1.5 1.5 0 0114.5 5v7a1.5 1.5 0 01-1.5 1.5H3A1.5 1.5 0 011.5 12V3z"/>
        </svg>
        Files
        {files.length > 0 && <span className={styles.badge}>{files.length}</span>}
      </button>

      <span className={styles.title}>OpenSearch Logs Viewer</span>

      {selectedFile && (
        <span className={styles.selectedFile} title={selectedFile.name}>
          {selectedFile.name}
        </span>
      )}
    </header>
  );
}
