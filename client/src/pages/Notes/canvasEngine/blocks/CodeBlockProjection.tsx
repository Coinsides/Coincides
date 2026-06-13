import type {
  KeyboardEvent,
  Ref,
} from 'react';
import { resizeTextareaToContent } from '../measurementService';
import styles from '../../NoteDetail.module.css';

interface CodeBlockProjectionProps {
  text: string;
  textareaRef: Ref<HTMLTextAreaElement>;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onSave: (silent?: boolean) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

function lineCountFor(text: string): number {
  return Math.max(1, text.split('\n').length);
}

export function CodeBlockProjection({
  text,
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
        onFocus={onFocused}
        onChange={(event) => {
          resizeTextareaToContent(event.currentTarget);
          onTextChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
        }}
        onBlur={() => onSave(true)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        rows={1}
      />
    </div>
  );
}
