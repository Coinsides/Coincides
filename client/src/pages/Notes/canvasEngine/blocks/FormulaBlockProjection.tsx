import type {
  ClipboardEvent,
  KeyboardEvent,
  Ref,
} from 'react';
import { useRef } from 'react';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import {
  formulaPreviewText,
  normalizeFormulaLatexInput,
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
  const latestFieldsRef = useRef(fields);
  latestFieldsRef.current = fields;

  const updateDraft = (
    patch: Partial<typeof fields>,
    anchorElement?: HTMLElement | null,
  ) => {
    const nextFields = { ...fields, ...patch };
    latestFieldsRef.current = nextFields;
    onTextChange(nextFields.latex_input, nextFields.latex_input.length, anchorElement);
    onFieldDraftChange(nextFields);
  };

  const saveNormalizedDraft = () => {
    const normalizedFields = {
      ...latestFieldsRef.current,
      latex_input: normalizeFormulaLatexInput(latestFieldsRef.current.latex_input),
    };
    latestFieldsRef.current = normalizedFields;
    onTextChange(normalizedFields.latex_input, normalizedFields.latex_input.length);
    onFieldDraftChange(normalizedFields);
    onSave(true, normalizedFields);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    const normalized = normalizeFormulaLatexInput(pastedText);
    if (normalized === pastedText.trim()) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${fields.latex_input.slice(0, start)}${normalized}${fields.latex_input.slice(end)}`;
    updateDraft({ latex_input: nextValue }, textarea);

    window.requestAnimationFrame(() => {
      textarea.selectionStart = start + normalized.length;
      textarea.selectionEnd = start + normalized.length;
      resizeTextareaToContent(textarea);
    });
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
          <span className={styles.formulaInputHeader}>
            LaTeX input
            <span className={styles.formulaHelpWrap}>
              <button
                type="button"
                className={styles.formulaHelpButton}
                aria-label="Formula input help"
              >
                ?
              </button>
              <span className={styles.formulaHelpTooltip} role="tooltip">
                Paste or type pure LaTeX body. Whole-input $...$, $$...$$, \(...\), and \[...\] are accepted and saved as body text.
              </span>
            </span>
          </span>
          <textarea
            ref={textareaRef}
            className={`${styles.pageTextArea} ${styles.formulaInput}`}
            value={fields.latex_input}
            onFocus={onFocused}
            onChange={(event) => {
              resizeTextareaToContent(event.currentTarget);
              updateDraft({ latex_input: event.currentTarget.value }, event.currentTarget);
            }}
            onBlur={saveNormalizedDraft}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            placeholder="\\int_a^b f(x)\\,dx"
            rows={1}
          />
        </label>
      )}
      {fields.explanation && <p className={styles.formulaExplanation}>{fields.explanation}</p>}
    </div>
  );
}
