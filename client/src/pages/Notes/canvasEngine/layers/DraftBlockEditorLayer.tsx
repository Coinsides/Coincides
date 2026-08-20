import type {
  KeyboardEvent,
  RefObject,
} from 'react';
import { useEffect, useRef } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { hasMeaningfulDraftContent, type DraftBlockLifecyclePhase } from '../draftBlockLifecycleReducer';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { TextFocusReceipt } from '../textFocusReceipt';
import styles from '../../NoteDetail.module.css';

interface DraftBlockEditorLayerProps {
  creating: boolean;
  focusReceipt: TextFocusReceipt;
  layout: BlockBoxLayout;
  pageOffsetX: number;
  phase: DraftBlockLifecyclePhase;
  slashTargetActive: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
  text: string;
  onChange: (value: string, caret: number, textarea: HTMLTextAreaElement) => void;
  onClearSlashTarget: () => void;
  onDiscard: () => void;
  onFocused: (receipt: TextFocusReceipt) => void;
  onFocusReleased: (receipt: TextFocusReceipt) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPersist: (text: string) => Promise<void>;
  onResize: (textarea: HTMLTextAreaElement) => void;
}

export function DraftBlockEditorLayer({
  creating,
  focusReceipt,
  layout,
  pageOffsetX,
  phase,
  slashTargetActive,
  textareaRef,
  text,
  onChange,
  onClearSlashTarget,
  onDiscard,
  onFocused,
  onFocusReleased,
  onKeyDown,
  onPersist,
  onResize,
}: DraftBlockEditorLayerProps) {
  const focusedRef = useRef(false);
  const focusReceiptRef = useRef(focusReceipt);
  const onFocusReleasedRef = useRef(onFocusReleased);
  focusReceiptRef.current = focusReceipt;
  onFocusReleasedRef.current = onFocusReleased;

  useEffect(() => () => {
    if (focusedRef.current) onFocusReleasedRef.current(focusReceiptRef.current);
  }, []);

  return (
    <div
      className={`${styles.block} ${styles.blockBox} ${styles.draftBlock}`}
      data-draft-editor="true"
      data-draft-phase={phase}
      style={{
        left: layout.x + pageOffsetX,
        top: layout.y,
        width: layout.width,
        height: layout.height,
      }}
    >
      <textarea
        ref={textareaRef}
        className={styles.pageTextArea}
        value={text}
        onFocus={() => {
          focusedRef.current = true;
          onFocused(focusReceipt);
        }}
        onChange={(event) => {
          onResize(event.currentTarget);
          onChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
        }}
        onBlur={() => {
          focusedRef.current = false;
          onFocusReleased(focusReceipt);
          if (slashTargetActive) return;
          if (hasMeaningfulDraftContent(text)) {
            void onPersist(text);
            return;
          }
          onDiscard();
          onClearSlashTarget();
        }}
        onKeyDown={(event) => {
          onKeyDown(event);
          if (
            event.defaultPrevented
            || event.key !== 'Escape'
            || slashTargetActive
            || hasMeaningfulDraftContent(text)
          ) {
            return;
          }
          event.preventDefault();
          onDiscard();
          onClearSlashTarget();
        }}
        placeholder={creating ? 'Saving block...' : 'Start writing, or type / for blocks'}
        data-block-id={focusReceipt.blockId}
        data-text-flow-id={focusReceipt.textFlowId}
        data-text-unit-id={focusReceipt.textUnitId}
        rows={1}
      />
      <div className={styles.draftHint}>
        <CornerDownLeft size={13} />
        Enter for a new line, Ctrl+Enter for the next block.
      </div>
    </div>
  );
}
