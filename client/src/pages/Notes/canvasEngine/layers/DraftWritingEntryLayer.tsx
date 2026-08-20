import type {
  KeyboardEvent,
  RefObject,
} from 'react';
import { shouldShowEmptyPagePrompt } from '../draftBlockLifecycleReducer';
import type { DraftBlockLifecyclePhase } from '../draftBlockLifecycleReducer';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { TextFocusReceipt } from '../textFocusReceipt';
import { DraftBlockEditorLayer } from './DraftBlockEditorLayer';
import styles from '../../NoteDetail.module.css';

export interface DraftWritingEntryLayerProps {
  contentReadOnly: boolean;
  creating: boolean;
  draftActive: boolean;
  focusReceipt: TextFocusReceipt;
  hasMeaningfulRenderableContent: boolean;
  hasPendingDurableEditor: boolean;
  layout: BlockBoxLayout;
  pageOffsetX: number;
  phase: DraftBlockLifecyclePhase;
  placementPending: boolean;
  slashTargetActive: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
  text: string;
  onActivate: (layout: BlockBoxLayout) => void;
  onChange: (value: string, caret: number, textarea: HTMLTextAreaElement) => void;
  onClearSlashTarget: () => void;
  onDiscard: () => void;
  onFocused: (receipt: TextFocusReceipt) => void;
  onFocusReleased: (receipt: TextFocusReceipt) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPersist: (text: string) => Promise<void>;
  onResize: (textarea: HTMLTextAreaElement) => void;
}

export function DraftWritingEntryLayer({
  contentReadOnly,
  creating,
  draftActive,
  focusReceipt,
  hasMeaningfulRenderableContent,
  hasPendingDurableEditor,
  layout,
  pageOffsetX,
  phase,
  placementPending,
  slashTargetActive,
  textareaRef,
  text,
  onActivate,
  onChange,
  onClearSlashTarget,
  onDiscard,
  onFocused,
  onFocusReleased,
  onKeyDown,
  onPersist,
  onResize,
}: DraftWritingEntryLayerProps) {
  const hasPendingEditor = draftActive
    || creating
    || placementPending
    || hasPendingDurableEditor;

  return (
    <>
      {draftActive && !contentReadOnly && (
        <DraftBlockEditorLayer
          creating={creating}
          focusReceipt={focusReceipt}
          layout={layout}
          pageOffsetX={pageOffsetX}
          phase={phase}
          slashTargetActive={slashTargetActive}
          textareaRef={textareaRef}
          text={text}
          onChange={onChange}
          onClearSlashTarget={onClearSlashTarget}
          onDiscard={onDiscard}
          onFocused={onFocused}
          onFocusReleased={onFocusReleased}
          onKeyDown={onKeyDown}
          onPersist={onPersist}
          onResize={onResize}
        />
      )}
      {shouldShowEmptyPagePrompt({
        contentReadOnly,
        hasMeaningfulRenderableContent,
        hasPendingEditor,
      }) && (
        <button
          type="button"
          className={styles.emptyPagePrompt}
          onDoubleClick={() => onActivate(layout)}
        >
          Double-click to start writing
        </button>
      )}
    </>
  );
}
