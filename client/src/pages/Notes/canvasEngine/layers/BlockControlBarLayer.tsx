import {
  Eye,
  FileText,
  GripVertical,
  Save,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  useEffect,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  AIVisibility,
  ExportRole,
  SlashMenuAnchor,
} from '../runtimeLayout';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';

const DEFAULT_TOP_BAR_SAFE_TOP = 90;

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
  onAnnotateBlock: () => void;
  onBlockItemDragStart?: (event: ReactDragEvent<HTMLButtonElement>) => void;
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
  onAnnotateBlock,
  onBlockItemDragStart,
  onTrash,
}: BlockControlBarLayerProps) {
  const [topBarSafeTop, setTopBarSafeTop] = useState(DEFAULT_TOP_BAR_SAFE_TOP);

  useEffect(() => {
    if (!open) return;

    const updateSafeTop = () => {
      const chrome = document.querySelector<HTMLElement>('[data-note-chrome="true"]');
      const chromeBottom = chrome?.getBoundingClientRect().bottom ?? DEFAULT_TOP_BAR_SAFE_TOP;
      setTopBarSafeTop(Math.ceil(Math.max(DEFAULT_TOP_BAR_SAFE_TOP, chromeBottom + 2)));
    };

    updateSafeTop();
    document.addEventListener('scroll', updateSafeTop, true);
    window.addEventListener('resize', updateSafeTop);

    return () => {
      document.removeEventListener('scroll', updateSafeTop, true);
      window.removeEventListener('resize', updateSafeTop);
    };
  }, [anchor?.x, anchor?.y, open]);

  if (!open || !anchor) return null;

  return (
    <FloatingOverlayLayer
      open
      placement="free"
      portalClassName={styles.blockToolbarPortal}
      portalStyle={{ clipPath: `inset(${topBarSafeTop}px 0 0 0)` }}
    >
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
            className={styles.iconBtn}
            onClick={onAnnotateBlock}
            draggable={Boolean(onBlockItemDragStart)}
            onDragStart={onBlockItemDragStart}
            title="Label block; drag to use this block as a group item"
            aria-label="Label block"
          >
            <Tag size={15} />
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
