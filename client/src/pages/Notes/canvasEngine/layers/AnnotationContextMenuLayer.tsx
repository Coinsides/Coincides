import {
  Tag,
  X,
} from 'lucide-react';
import {
  useEffect,
  useState,
  type KeyboardEvent,
} from 'react';
import type { CapturedSelectionRange } from '../selectionRangeService';
import styles from '../../NoteDetail.module.css';

export interface AnnotationContextMenuState {
  selection: {
    range: CapturedSelectionRange;
    anchorRect: DOMRect;
  };
  point: {
    x: number;
    y: number;
  };
}

interface AnnotationContextMenuLayerProps {
  menu: AnnotationContextMenuState | null;
  draftRangeCount: number;
  onClose: () => void;
  onCreateAnnotation: (label: string) => void | Promise<void>;
  onAddRangeToDraft: () => void | Promise<void>;
}

export function AnnotationContextMenuLayer({
  menu,
  draftRangeCount,
  onClose,
  onCreateAnnotation,
  onAddRangeToDraft,
}: AnnotationContextMenuLayerProps) {
  const [labelDraft, setLabelDraft] = useState('Label 1');

  useEffect(() => {
    if (!menu) return undefined;
    setLabelDraft('Label 1');
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menu, onClose]);

  if (!menu) return null;

  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const left = Math.min(viewportWidth - 260, Math.max(12, menu.point.x));
  const top = Math.min(viewportHeight - 160, Math.max(12, menu.point.y));

  const label = labelDraft.trim();
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Enter' && label) {
      event.preventDefault();
      void onCreateAnnotation(label);
    }
  };

  return (
    <div
      className={styles.annotationContextMenu}
      style={{ left, top }}
      role="menu"
      aria-label="Annotation context menu"
      data-annotation-context-menu="true"
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className={styles.popoverEyebrow}>Annotation</div>
      <input
        className={styles.annotationContextInput}
        value={labelDraft}
        onChange={(event) => setLabelDraft(event.currentTarget.value)}
        onKeyDown={handleInputKeyDown}
        autoFocus
        aria-label="Label name"
      />
      <button
        type="button"
        className={styles.annotationContextMenuItem}
        disabled={!label}
        onClick={() => void onCreateAnnotation(label)}
      >
        <Tag size={14} />
        Mark selection
      </button>
      <button
        type="button"
        className={styles.annotationContextMenuItem}
        disabled
        onClick={() => void onAddRangeToDraft()}
      >
        <Tag size={14} />
        Range drafted{draftRangeCount > 0 ? ` (${draftRangeCount})` : ''}
      </button>
      <button
        type="button"
        className={styles.annotationContextMenuItem}
        onClick={onClose}
      >
        <X size={14} />
        Cancel
      </button>
    </div>
  );
}
