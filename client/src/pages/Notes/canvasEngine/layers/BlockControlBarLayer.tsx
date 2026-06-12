import {
  Eye,
  FileText,
  GripVertical,
  Save,
  Trash2,
} from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  aiVisibilityLabel,
  exportRoleLabel,
} from '../exportPreviewService';
import type {
  AIVisibility,
  ExportRole,
} from '../runtimeLayout';
import styles from '../../NoteDetail.module.css';

interface BlockControlBarLayerProps {
  exportRole: ExportRole;
  aiVisibility: AIVisibility;
  saving: boolean;
  onBeginMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onToggleExportRole: () => void;
  onToggleAIVisibility: () => void;
  onSaveBlock: () => void;
  onTrash: () => void;
}

export function BlockControlBarLayer({
  exportRole,
  aiVisibility,
  saving,
  onBeginMove,
  onToggleExportRole,
  onToggleAIVisibility,
  onSaveBlock,
  onTrash,
}: BlockControlBarLayerProps) {
  return (
    <div className={styles.blockToolbar}>
      <div className={styles.blockActions}>
        <button
          className={`${styles.iconBtn} ${styles.dragHandle}`}
          onPointerDown={onBeginMove}
          title="Move block"
          aria-label="Move block"
        >
          <GripVertical size={15} />
        </button>
        <button
          className={`${styles.iconBtn} ${exportRole === 'included' ? styles.policyBtnOn : ''}`}
          onClick={onToggleExportRole}
          title={exportRole === 'included' ? 'Exclude from export' : 'Include in export'}
          aria-label={exportRole === 'included' ? 'Exclude from export' : 'Include in export'}
        >
          <FileText size={15} />
        </button>
        <button
          className={`${styles.iconBtn} ${aiVisibility === 'visible' ? styles.policyBtnOn : ''}`}
          onClick={onToggleAIVisibility}
          title={aiVisibility === 'visible' ? 'Hide from AI context' : 'Allow AI context'}
          aria-label={aiVisibility === 'visible' ? 'Hide from AI context' : 'Allow AI context'}
        >
          <Eye size={15} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={onSaveBlock}
          disabled={saving}
          title="Save block"
        >
          <Save size={16} />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.dangerBtn}`}
          onClick={onTrash}
          title="Move to trash"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
