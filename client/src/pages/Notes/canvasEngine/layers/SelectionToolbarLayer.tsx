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
import { placeSelectionToolbar } from '../overlayService';
import styles from '../../NoteDetail.module.css';

interface SelectionToolbarLayerProps {
  selection: {
    range: CapturedSelectionRange;
    anchorRect: DOMRect;
  } | null;
  draftRangeCount: number;
  onCancel: () => void;
  onCreateAnnotation: (label: string) => void | Promise<void>;
  onCommitDraft: (label: string) => void | Promise<void>;
  onCancelDraft: () => void;
  suggestedLabelName: string;
}

export function SelectionToolbarLayer({
  selection,
  draftRangeCount,
  onCancel,
  onCreateAnnotation,
  onCommitDraft,
  onCancelDraft,
  suggestedLabelName,
}: SelectionToolbarLayerProps) {
  const [labelDraft, setLabelDraft] = useState(suggestedLabelName);
  const [editingLabel, setEditingLabel] = useState(false);

  useEffect(() => {
    if (!selection) {
      setEditingLabel(false);
      return;
    }
    setLabelDraft(suggestedLabelName);
  }, [selection, suggestedLabelName]);

  useEffect(() => {
    if (!selection) return undefined;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onCancelDraft();
      onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onCancelDraft, selection]);

  if (!selection) return null;
  if (draftRangeCount <= 1) return null;

  const toolbarPlacement = placeSelectionToolbar({
    anchorRect: selection.anchorRect,
  });

  const handleCommit = async () => {
    const label = labelDraft.trim();
    if (!label) return;
    await onCreateAnnotation(label);
  };

  const handleCommitDraft = async () => {
    const label = labelDraft.trim();
    if (!label) return;
    await onCommitDraft(label);
  };

  const handleApplyLabel = async () => {
    if (draftRangeCount > 1) {
      await handleCommitDraft();
      return;
    }
    await handleCommit();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleApplyLabel();
    }
  };

  return (
    <div
      className={styles.selectionToolbar}
      style={{ left: toolbarPlacement.x, top: toolbarPlacement.y }}
      role="toolbar"
      aria-label="Selection label toolbar"
      data-selection-toolbar="true"
      onMouseDown={(event) => event.preventDefault()}
    >
      {editingLabel ? (
        <>
          <input
            className={styles.selectionToolbarInput}
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.currentTarget.value)}
            onKeyDown={handleInputKeyDown}
            autoFocus
            aria-label="Label name"
          />
          <button type="button" className={styles.selectionToolbarButton} onClick={() => void handleApplyLabel()}>
            <Tag size={14} />
            Mark
          </button>
          {draftRangeCount > 0 && (
            <span className={styles.selectionToolbarStatus}>
              {draftRangeCount} {draftRangeCount === 1 ? 'range' : 'ranges'}
            </span>
          )}
        </>
      ) : (
        <button type="button" className={styles.selectionToolbarButton} onClick={() => setEditingLabel(true)}>
          <Tag size={14} />
          Label
        </button>
      )}
      {draftRangeCount > 1 && !editingLabel && (
        <span className={styles.selectionToolbarStatus}>
          {draftRangeCount} ranges
        </span>
      )}
      <button
        type="button"
        className={styles.selectionToolbarButton}
        onClick={() => {
          if (draftRangeCount > 0) onCancelDraft();
          onCancel();
        }}
        aria-label="Close label toolbar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
