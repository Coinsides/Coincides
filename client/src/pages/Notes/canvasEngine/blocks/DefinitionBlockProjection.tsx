import type {
  KeyboardEvent,
  Ref,
} from 'react';
import { useRef } from 'react';
import {
  combinedDefinitionText,
  type FieldValueRecord,
} from '../blockContentService';
import { resizeTextareaToContent } from '../measurementService';
import styles from '../../NoteDetail.module.css';

interface DefinitionBlockProjectionProps {
  active: boolean;
  blockTitle: string | null;
  fields: {
    concept_name: string;
    description: string;
  };
  textareaRef: Ref<HTMLTextAreaElement>;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onFieldDraftChange: (fieldValues: FieldValueRecord) => void;
  onSave: (silent?: boolean, fieldValues?: FieldValueRecord) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function DefinitionBlockProjection({
  active,
  blockTitle,
  fields,
  textareaRef,
  onFocused,
  onTextChange,
  onFieldDraftChange,
  onSave,
  onKeyDown,
}: DefinitionBlockProjectionProps) {
  const latestFieldsRef = useRef(fields);
  latestFieldsRef.current = fields;

  const updateDraft = (
    patch: Partial<typeof fields>,
    anchorElement?: HTMLElement | null,
  ) => {
    const nextFields = { ...fields, ...patch };
    latestFieldsRef.current = nextFields;
    const nextText = combinedDefinitionText(nextFields.concept_name, nextFields.description);
    onTextChange(nextText, nextText.length, anchorElement);
    onFieldDraftChange(nextFields);
  };

  return (
    <div className={styles.definitionBlock}>
      {active ? (
        <>
          <label className={styles.fieldLabel}>
            Concept name
            <input
              className={styles.fieldInput}
              value={fields.concept_name}
              onFocus={onFocused}
              onChange={(event) => updateDraft({ concept_name: event.currentTarget.value }, event.currentTarget)}
              onBlur={() => onSave(true, latestFieldsRef.current)}
              placeholder="Concept name"
            />
          </label>
          <label className={styles.fieldLabel}>
            Description
            <textarea
              ref={textareaRef}
              className={`${styles.pageTextArea} ${styles.definitionDescriptionInput}`}
              value={fields.description}
              onFocus={onFocused}
              onChange={(event) => {
                resizeTextareaToContent(event.currentTarget);
                updateDraft({ description: event.currentTarget.value }, event.currentTarget);
              }}
              onBlur={() => onSave(true, latestFieldsRef.current)}
              onKeyDown={onKeyDown}
              placeholder="Write the definition..."
              rows={1}
            />
          </label>
        </>
      ) : (
        <>
          <div className={styles.structuredEyebrow}>Definition</div>
          <div className={styles.definitionName}>
            {fields.concept_name || blockTitle || 'Untitled concept'}
          </div>
          <div className={styles.definitionDescription}>
            {fields.description || 'No definition written yet.'}
          </div>
        </>
      )}
    </div>
  );
}
