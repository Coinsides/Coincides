import type {
  KeyboardEvent,
  Ref,
} from 'react';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import {
  formulaPreviewText,
  type FieldValueRecord,
} from '../blockContentService';
import { resizeTextareaToContent } from '../measurementService';
import styles from '../../NoteDetail.module.css';

interface FormulaBlockProjectionProps {
  active: boolean;
  fields: {
    latex_input: string;
    formula_name: string;
    explanation: string;
  };
  textareaRef: Ref<HTMLTextAreaElement>;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onFieldDraftChange: (fieldValues: FieldValueRecord) => void;
  onSave: (silent?: boolean, fieldValues?: FieldValueRecord) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function FormulaBlockProjection({
  active,
  fields,
  textareaRef,
  onFocused,
  onTextChange,
  onFieldDraftChange,
  onSave,
  onKeyDown,
}: FormulaBlockProjectionProps) {
  const updateDraft = (
    patch: Partial<typeof fields>,
    anchorElement?: HTMLElement | null,
  ) => {
    const nextFields = { ...fields, ...patch };
    onTextChange(nextFields.latex_input, nextFields.latex_input.length, anchorElement);
    onFieldDraftChange(nextFields);
  };

  return (
    <div className={styles.formulaBlock}>
      {fields.formula_name && <div className={styles.formulaName}>{fields.formula_name}</div>}
      <div className={styles.formulaPreview}>
        {fields.latex_input.trim() ? (
          <KaTeXRenderer text={formulaPreviewText(fields.latex_input)} />
        ) : (
          <span className={styles.emptyStructuredField}>Empty formula</span>
        )}
      </div>
      {active && (
        <label className={styles.fieldLabel}>
          LaTeX input
          <textarea
            ref={textareaRef}
            className={`${styles.pageTextArea} ${styles.formulaInput}`}
            value={fields.latex_input}
            onFocus={onFocused}
            onChange={(event) => {
              resizeTextareaToContent(event.currentTarget);
              updateDraft({ latex_input: event.currentTarget.value }, event.currentTarget);
            }}
            onBlur={() => onSave(true, fields)}
            onKeyDown={onKeyDown}
            placeholder="\\int_a^b f(x)\\,dx"
            rows={1}
          />
        </label>
      )}
      {fields.explanation && <p className={styles.formulaExplanation}>{fields.explanation}</p>}
    </div>
  );
}
