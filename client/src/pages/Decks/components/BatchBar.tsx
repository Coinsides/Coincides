import { Trash2 } from 'lucide-react';
import styles from '../DeckDetail.module.css';

interface BatchBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BatchBar({ selectedCount, onDelete, onCancel }: BatchBarProps) {
  return (
    <div className={styles.batchBar}>
      <span className={styles.batchCount}>{selectedCount} selected</span>
      <button className={styles.batchDeleteBtn} onClick={onDelete}>
        <Trash2 size={14} />
        Delete
      </button>
      <button className={styles.batchCancelBtn} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
