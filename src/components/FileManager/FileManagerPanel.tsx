import styles from './FileManagerPanel.module.css';
import { useFiles } from '../../context/FileContext';
import { useDiscover } from '../../context/DiscoverContext';
import UploadArea from './UploadArea';
import SavedFileItem from './SavedFileItem';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FileManagerPanel({ open, onClose }: Props) {
  const { files, selectedFileId, selectFile, deleteFile, storageWarning, clearWarning } = useFiles();
  const { resetForFile } = useDiscover();

  const handleSelect = (id: string) => {
    selectFile(id);
    const file = files.find(f => f.id === id);
    if (file) resetForFile(file.allFields);
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.visible : ''}`}
        onClick={onClose}
      />
      <div className={`${styles.panel} ${open ? styles.open : ''}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>File Manager</span>
          <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <div className={styles.panelBody}>
          {storageWarning && (
            <div className={styles.storageWarning}>
              ⚠ {storageWarning}
              <button className={styles.dismissBtn} onClick={clearWarning}>✕</button>
            </div>
          )}

          <div className={styles.sectionTitle}>Upload New File</div>
          <UploadArea />

          <div className={styles.sectionTitle}>Saved Files</div>

          {files.length === 0 ? (
            <div className={styles.emptyFiles}>No files uploaded yet.</div>
          ) : (
            <div className={styles.fileList}>
              {files.map(file => (
                <SavedFileItem
                  key={file.id}
                  file={file}
                  isSelected={file.id === selectedFileId}
                  onSelect={() => handleSelect(file.id)}
                  onDelete={() => deleteFile(file.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
