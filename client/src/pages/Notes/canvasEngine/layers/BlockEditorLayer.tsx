import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Eye,
  EyeOff,
  FileText,
  FileX,
} from 'lucide-react';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import sharedTypes from '@shared/types';
import {
  combinedDefinitionText,
  definitionFieldsFromBlock,
  formulaFieldsFromBlock,
  formulaPreviewText,
  presentationKindForBlock,
  type FieldValueRecord,
} from '../blockContentService';
import {
  measureBlockContentHeight,
  resizeTextareaToContent,
} from '../measurementService';
import {
  getBoundaryKind,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
} from '../placementService';
import {
  DEFAULT_BLOCK_HEIGHT,
  type AIVisibility,
  type BlockBoxLayout,
  type ExportRole,
} from '../runtimeLayout';
import type {
  NoteBlock,
  SourceAnchor,
} from '../runtimeDataTypes';
import { BlockControlBarLayer } from './BlockControlBarLayer';
import { BlockSourceReferenceLayer } from './BlockSourceReferenceLayer';
import styles from '../../NoteDetail.module.css';

const {
  getNoteBlockTemplateLabel,
} = sharedTypes;

interface BlockEditorLayerProps {
  block: NoteBlock;
  text: string;
  layout: BlockBoxLayout;
  fieldDraft?: FieldValueRecord;
  layoutMode: boolean;
  pageOffsetX: number;
  saving: boolean;
  active: boolean;
  autoFocus: boolean;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onFieldDraftChange: (fieldValues: FieldValueRecord) => void;
  onSave: (silent?: boolean, fieldValues?: FieldValueRecord) => void;
  onTrash: () => void;
  onSelect: () => void;
  onBeginMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onBeginResize: (event: ReactPointerEvent<HTMLElement>) => void;
  onToggleExportRole: () => void;
  onToggleAIVisibility: () => void;
  showBlockTypeBadge: boolean;
  showAIStatusBadge: boolean;
  showExportStatusBadge: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onMeasuredHeight: (height: number) => void;
  anchorsBySourceRef: Record<string, SourceAnchor>;
  sourceJumpBusy: string | null;
  onViewSource: (anchorId: string) => void;
}

function exportRoleLabel(role: ExportRole): string {
  if (role === 'included') return 'Export';
  if (role === 'excluded') return 'Excluded';
  return 'Scratch';
}

function aiVisibilityLabel(visibility: AIVisibility): string {
  return visibility === 'visible' ? 'AI visible' : 'AI hidden';
}

export function BlockEditorLayer({
  block,
  text,
  layout,
  fieldDraft,
  layoutMode,
  pageOffsetX,
  saving,
  active,
  autoFocus,
  onFocused,
  onTextChange,
  onFieldDraftChange,
  onSave,
  onTrash,
  onSelect,
  onBeginMove,
  onBeginResize,
  onToggleExportRole,
  onToggleAIVisibility,
  showBlockTypeBadge,
  showAIStatusBadge,
  showExportStatusBadge,
  onKeyDown,
  onMeasuredHeight,
  anchorsBySourceRef,
  sourceJumpBusy,
  onViewSource,
}: BlockEditorLayerProps) {
  const blockContentRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const boundary = getBoundaryKind(layout);
  const exportRole = getEffectiveExportRole(layout);
  const aiVisibility = getEffectiveAIVisibility(layout);
  const presentationKind = presentationKindForBlock(block);
  const definitionFields = presentationKind === 'definition'
    ? definitionFieldsFromBlock(block, fieldDraft ? text : undefined, fieldDraft)
    : null;
  const formulaFields = presentationKind === 'formula'
    ? formulaFieldsFromBlock(block, fieldDraft ? text : undefined, fieldDraft)
    : null;
  const blockTypeLabel = getNoteBlockTemplateLabel(block.metadata, block.block_type);
  const showContextualTypeBadge = active || showBlockTypeBadge;
  const showStatusBadges = showContextualTypeBadge || showAIStatusBadge || showExportStatusBadge;

  const updateDefinitionDraft = (
    patch: Partial<{ concept_name: string; description: string }>,
    anchorElement?: HTMLElement | null,
  ) => {
    if (!definitionFields) return;
    const nextFields = { ...definitionFields, ...patch };
    const nextText = combinedDefinitionText(nextFields.concept_name, nextFields.description);
    onTextChange(nextText, nextText.length, anchorElement);
    onFieldDraftChange(nextFields);
  };

  const updateFormulaDraft = (
    patch: Partial<{ latex_input: string; formula_name: string; explanation: string }>,
    anchorElement?: HTMLElement | null,
  ) => {
    if (!formulaFields) return;
    const nextFields = { ...formulaFields, ...patch };
    onTextChange(nextFields.latex_input, nextFields.latex_input.length, anchorElement);
    onFieldDraftChange(nextFields);
  };

  useLayoutEffect(() => {
    resizeTextareaToContent(textareaRef.current);
    const element = blockContentRef.current;
    if (!element) {
      onMeasuredHeight(DEFAULT_BLOCK_HEIGHT);
      return undefined;
    }

    const measure = () => onMeasuredHeight(measureBlockContentHeight(element));
    measure();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, layout.width, active, onMeasuredHeight]);

  useEffect(() => {
    if (!autoFocus) return;
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
      resizeTextareaToContent(textarea);
    }, 0);
  }, [autoFocus]);

  return (
    <article
      className={`${styles.block} ${styles.blockBox} ${layoutMode ? styles.blockBoxLayoutMode : ''} ${active ? styles.blockActive : ''} ${boundary !== 'inside' ? styles.blockScratch : ''}`}
      style={{
        left: layout.x + pageOffsetX,
        top: layout.y,
        width: layout.width,
        minHeight: layout.height,
      }}
      onMouseDown={onSelect}
    >
      {showStatusBadges && (
        <div className={styles.blockStatusBadges}>
          {showContextualTypeBadge && (
            <span className={styles.blockStatusBadge}>{blockTypeLabel}</span>
          )}
          {showAIStatusBadge && (
            <span
              className={`${styles.blockStatusBadge} ${aiVisibility === 'visible' ? styles.blockStatusBadgeOn : styles.blockStatusBadgeMuted}`}
              title={aiVisibilityLabel(aiVisibility)}
            >
              {aiVisibility === 'visible' ? <Eye size={12} /> : <EyeOff size={12} />}
              {aiVisibility === 'visible' ? 'AI' : 'AI hidden'}
            </span>
          )}
          {showExportStatusBadge && (
            <span
              className={`${styles.blockStatusBadge} ${exportRole === 'included' ? styles.blockStatusBadgeOn : styles.blockStatusBadgeMuted}`}
              title={exportRoleLabel(exportRole)}
            >
              {exportRole === 'included' ? <FileText size={12} /> : <FileX size={12} />}
              {exportRoleLabel(exportRole)}
            </span>
          )}
          {showExportStatusBadge && boundary === 'crossing' && (
            <span className={`${styles.blockStatusBadge} ${styles.blockStatusBadgeWarning}`}>Crosses page</span>
          )}
          {showExportStatusBadge && boundary === 'outside' && (
            <span className={`${styles.blockStatusBadge} ${styles.blockStatusBadgeMuted}`}>Page outside</span>
          )}
        </div>
      )}
      <BlockControlBarLayer
        exportRole={exportRole}
        aiVisibility={aiVisibility}
        saving={saving}
        onBeginMove={onBeginMove}
        onToggleExportRole={onToggleExportRole}
        onToggleAIVisibility={onToggleAIVisibility}
        onSaveBlock={() => onSave(false)}
        onTrash={onTrash}
      />

      <div ref={blockContentRef}>
        {presentationKind === 'definition' && definitionFields ? (
          <div className={styles.definitionBlock}>
            {active ? (
              <>
                <label className={styles.fieldLabel}>
                  Concept name
                  <input
                    className={styles.fieldInput}
                    value={definitionFields.concept_name}
                    onFocus={onFocused}
                    onChange={(event) => updateDefinitionDraft({ concept_name: event.currentTarget.value }, event.currentTarget)}
                    onBlur={() => onSave(true, definitionFields)}
                    placeholder="Concept name"
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Description
                  <textarea
                    ref={textareaRef}
                    className={`${styles.pageTextArea} ${styles.definitionDescriptionInput}`}
                    value={definitionFields.description}
                    onFocus={onFocused}
                    onChange={(event) => {
                      resizeTextareaToContent(event.currentTarget);
                      updateDefinitionDraft({ description: event.currentTarget.value }, event.currentTarget);
                    }}
                    onBlur={() => onSave(true, definitionFields)}
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
                  {definitionFields.concept_name || block.title || 'Untitled concept'}
                </div>
                <div className={styles.definitionDescription}>
                  {definitionFields.description || 'No definition written yet.'}
                </div>
              </>
            )}
          </div>
        ) : presentationKind === 'formula' && formulaFields ? (
          <div className={styles.formulaBlock}>
            {formulaFields.formula_name && <div className={styles.formulaName}>{formulaFields.formula_name}</div>}
            <div className={styles.formulaPreview}>
              {formulaFields.latex_input.trim() ? (
                <KaTeXRenderer text={formulaPreviewText(formulaFields.latex_input)} />
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
                  value={formulaFields.latex_input}
                  onFocus={onFocused}
                  onChange={(event) => {
                    resizeTextareaToContent(event.currentTarget);
                    updateFormulaDraft({ latex_input: event.currentTarget.value }, event.currentTarget);
                  }}
                  onBlur={() => onSave(true, formulaFields)}
                  onKeyDown={onKeyDown}
                  placeholder="\\int_a^b f(x)\\,dx"
                  rows={1}
                />
              </label>
            )}
            {formulaFields.explanation && <p className={styles.formulaExplanation}>{formulaFields.explanation}</p>}
          </div>
        ) : (
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
        )}

        <BlockSourceReferenceLayer
          sourceReferences={block.source_references}
          anchorsBySourceRef={anchorsBySourceRef}
          sourceJumpBusy={sourceJumpBusy}
          onViewSource={onViewSource}
        />
      </div>

      <div
        className={styles.resizeHandleRight}
        onPointerDown={onBeginResize}
        title="Resize block"
        aria-label="Resize block"
      />
    </article>
  );
}
