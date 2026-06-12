import type {
  KeyboardEvent,
  Ref,
} from 'react';
import type { BlockPresentationKind } from '../blockContentService';
import { resizeTextareaToContent } from '../measurementService';
import styles from '../../NoteDetail.module.css';

interface TextBlockProjectionProps {
  text: string;
  presentationKind: BlockPresentationKind;
  textareaRef: Ref<HTMLTextAreaElement>;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onSave: (silent?: boolean) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function TextBlockProjection({
  text,
  presentationKind,
  textareaRef,
  onFocused,
  onTextChange,
  onSave,
  onKeyDown,
}: TextBlockProjectionProps) {
  return (
    <textarea
      ref={textareaRef}
      className={`${styles.pageTextArea} ${presentationKind === 'code' ? styles.codeTextArea : ''} ${presentationKind === 'heading' ? styles.headingTextArea : ''} ${presentationKind === 'sourceQuote' ? styles.quoteTextArea : ''}`}
      value={text}
      onFocus={onFocused}
      onChange={(event) => {
        resizeTextareaToContent(event.currentTarget);
        onTextChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
      }}
      onBlur={() => onSave(true)}
      onKeyDown={onKeyDown}
      rows={1}
    />
  );
}
