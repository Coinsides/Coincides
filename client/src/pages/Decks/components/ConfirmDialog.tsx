import styles from '../DeckDetail.module.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmTitle}>{title}</div>
        <div className={styles.confirmMessage}>{message}</div>
        <div className={styles.confirmActions}>
          <button className={styles.confirmCancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmDeleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
