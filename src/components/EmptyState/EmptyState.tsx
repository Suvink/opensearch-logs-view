import styles from './EmptyState.module.css';

interface Props {
  onOpenFileManager: () => void;
}

export default function EmptyState({ onOpenFileManager }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>🔍</div>
      <div className={styles.title}>No file selected</div>
      <div className={styles.subtitle}>
        Upload an OpenSearch JSON export and select a file to explore your logs
        in a Discover-like interface.
      </div>
      <button className={styles.button} onClick={onOpenFileManager}>
        📂 Open File Manager
      </button>
    </div>
  );
}
