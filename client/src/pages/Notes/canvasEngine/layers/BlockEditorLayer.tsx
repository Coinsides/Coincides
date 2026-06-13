import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import sharedTypes from '@shared/types';
import {
  definitionFieldsFromBlock,
  formulaFieldsFromBlock,
  presentationKindForBlock,
  type FieldValueRecord,
} from '../blockContentService';
import {
  resizeTextareaToContent,
} from '../measurementService';
import { getBlockControlAnchor } from '../overlayService';
import {
  getBoundaryKind,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
} from '../placementService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type {
  NoteBlock,
  SourceAnchor,
} from '../runtimeDataTypes';
import { DefinitionBlockProjection } from '../blocks/DefinitionBlockProjection';
import { FormulaBlockProjection } from '../blocks/FormulaBlockProjection';
import { TextBlockProjection } from '../blocks/TextBlockProjection';
import { CodeBlockProjection } from '../blocks/CodeBlockProjection';
import { useBlockMeasurement } from '../hooks/useBlockMeasurement';
import { BlockControlBarLayer } from './BlockControlBarLayer';
import { BlockResizeHandleLayer } from './BlockResizeHandleLayer';
import { BlockSourceReferenceLayer } from './BlockSourceReferenceLayer';
import { BlockStatusBadgeLayer } from './BlockStatusBadgeLayer';
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
  const articleRef = useRef<HTMLElement | null>(null);
  const blockContentRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [blockControlAnchor, setBlockControlAnchor] = useState<{ x: number; y: number } | null>(null);
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
  const blockTypeLabel = presentationKind === 'code'
    ? 'CODE'
    : getNoteBlockTemplateLabel(block.metadata, block.block_type);
  const showContextualTypeBadge = active || showBlockTypeBadge;

  useBlockMeasurement({
    blockContentRef,
    textareaRef,
    text,
    width: layout.width,
    active,
    onMeasuredHeight,
  });

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

  useLayoutEffect(() => {
    if (!active) {
      setBlockControlAnchor(null);
      return undefined;
    }

    const updateAnchor = () => {
      setBlockControlAnchor(getBlockControlAnchor(articleRef.current));
    };

    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);

    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
    };
  }, [
    active,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    pageOffsetX,
  ]);

  return (
    <article
      ref={articleRef}
      className={`${styles.block} ${styles.blockBox} ${presentationKind === 'code' ? styles.codeBlockBox : ''} ${layoutMode ? styles.blockBoxLayoutMode : ''} ${active ? styles.blockActive : ''} ${boundary !== 'inside' ? styles.blockScratch : ''}`}
      style={{
        left: layout.x + pageOffsetX,
        top: layout.y,
        width: layout.width,
        minHeight: layout.height,
      }}
      onMouseDown={onSelect}
    >
      <BlockStatusBadgeLayer
        blockTypeLabel={blockTypeLabel}
        boundary={boundary}
        exportRole={exportRole}
        aiVisibility={aiVisibility}
        showContextualTypeBadge={showContextualTypeBadge}
        showAIStatusBadge={showAIStatusBadge}
        showExportStatusBadge={showExportStatusBadge}
      />
      <BlockControlBarLayer
        anchor={blockControlAnchor}
        exportRole={exportRole}
        aiVisibility={aiVisibility}
        open={active}
        saving={saving}
        onBeginMove={onBeginMove}
        onToggleExportRole={onToggleExportRole}
        onToggleAIVisibility={onToggleAIVisibility}
        onSaveBlock={() => onSave(false)}
        onTrash={onTrash}
      />

      <div ref={blockContentRef}>
        {presentationKind === 'definition' && definitionFields ? (
          <DefinitionBlockProjection
            active={active}
            blockTitle={block.title}
            fields={definitionFields}
            textareaRef={textareaRef}
            onFocused={onFocused}
            onTextChange={onTextChange}
            onFieldDraftChange={onFieldDraftChange}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        ) : presentationKind === 'formula' && formulaFields ? (
          <FormulaBlockProjection
            active={active}
            fields={formulaFields}
            textareaRef={textareaRef}
            onFocused={onFocused}
            onTextChange={onTextChange}
            onFieldDraftChange={onFieldDraftChange}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        ) : presentationKind === 'code' ? (
          <CodeBlockProjection
            text={text}
            textareaRef={textareaRef}
            onFocused={onFocused}
            onTextChange={onTextChange}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        ) : (
          <TextBlockProjection
            text={text}
            presentationKind={presentationKind}
            textareaRef={textareaRef}
            onFocused={onFocused}
            onTextChange={onTextChange}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        )}

        <BlockSourceReferenceLayer
          sourceReferences={block.source_references}
          anchorsBySourceRef={anchorsBySourceRef}
          sourceJumpBusy={sourceJumpBusy}
          onViewSource={onViewSource}
        />
      </div>

      <BlockResizeHandleLayer onBeginResize={onBeginResize} />
    </article>
  );
}
