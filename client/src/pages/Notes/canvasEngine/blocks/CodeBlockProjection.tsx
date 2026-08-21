import type {
  KeyboardEvent,
  Ref,
} from 'react';
import { resizeTextareaToContent } from '../measurementService';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import styles from '../../NoteDetail.module.css';

interface CodeBlockProjectionProps {
  text: string;
  readOnly: boolean;
  textareaRef: Ref<HTMLTextAreaElement>;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onSave: (silent?: boolean) => Promise<BlockSaveOutcome>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

function lineCountFor(text: string): number {
  return Math.max(1, text.split('\n').length);
}

export function CodeBlockProjection({
  text,
  readOnly,
  textareaRef,
  onFocused,
  onTextChange,
  onSave,
  onKeyDown,
}: CodeBlockProjectionProps) {
  const lineCount = lineCountFor(text);

  return (
    <div className={styles.codeBlockProjection}>
      <div className={styles.codeLineGutter} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className={`${styles.pageTextArea} ${styles.codeTextArea}`}
        value={text}
        readOnly={readOnly}
        onFocus={onFocused}
        onChange={(event) => {
          resizeTextareaToContent(event.currentTarget);
          onTextChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
        }}
        onBlur={readOnly ? undefined : async () => {
          const outcome = await onSave(true);
          if (outcome.status !== 'saved') return;
        }}
        onKeyDown={readOnly ? undefined : onKeyDown}
        spellCheck={false}
        rows={1}
      />
    </div>
  );
}
