import {
  Eye,
  FileText,
  GripVertical,
  Save,
  Trash2,
} from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  AIVisibility,
  ExportRole,
  SlashMenuAnchor,
} from '../runtimeLayout';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';

interface BlockControlBarLayerProps {
  anchor: SlashMenuAnchor | null;
  exportRole: ExportRole;
  aiVisibility: AIVisibility;
  open: boolean;
  saving: boolean;
  onBeginMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onToggleExportRole: () => void;
  onToggleAIVisibility: () => void;
  onSaveBlock: () => void;
  onTrash: () => void;
}

export function BlockControlBarLayer({
  anchor,
  exportRole,
  aiVisibility,
  open,
  saving,
  onBeginMove,
  onToggleExportRole,
  onToggleAIVisibility,
  onSaveBlock,
  onTrash,
}: BlockControlBarLayerProps) {
  if (!open || !anchor) return null;

  return (
    <FloatingOverlayLayer open placement="free">
      <div
        className={`${styles.blockToolbar} ${styles.blockToolbarFloating}`}
        style={{ left: anchor.x, top: anchor.y }}
      >
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
    </FloatingOverlayLayer>
  );
}
