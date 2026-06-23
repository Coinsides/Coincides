import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getNoteBlockTemplateLabel } from '@shared/types';
import {
  formulaFieldsFromBlock,
  presentationKindForBlock,
  type FieldValueRecord,
} from '../blockContentService';
import {
  resizeTextareaToContent,
} from '../measurementService';
import {
  getBoundaryKind,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
} from '../placementService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type {
  AnnotationTruthV1,
  AnnotationRangeV1,
  NoteBlock,
  SourceAnchor,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import type { CapturedSelectionRange } from '../selectionRangeService';
import {
  getTextFlowContent,
} from '../textFlowService';
import {
  buildBlockAnnotationCluster,
} from '../annotationDisplayService';
import {
  writeContentGroupDragPayload,
} from '../contentGroupDragService';
import { FormulaBlockProjection } from '../blocks/FormulaBlockProjection';
import { TextBlockProjection } from '../blocks/TextBlockProjection';
import { CodeBlockProjection } from '../blocks/CodeBlockProjection';
import { useBlockMeasurement } from '../hooks/useBlockMeasurement';
import { BlockControlBarLayer } from './BlockControlBarLayer';
import { BlockResizeHandleLayer } from './BlockResizeHandleLayer';
import { BlockSourceReferenceLayer } from './BlockSourceReferenceLayer';
import { BlockStatusBadgeLayer } from './BlockStatusBadgeLayer';
import styles from '../../NoteDetail.module.css';

interface BlockEditorLayerProps {
  block: NoteBlock;
  text: string;
  textFlowDraft?: TextBlockContentV1;
  annotations: AnnotationTruthV1[];
  draftAnnotationRanges?: AnnotationRangeV1[];
  selectedAnnotationIds: string[];
  layout: BlockBoxLayout;
  blockControlAnchor: { x: number; y: number } | null;
  fieldDraft?: FieldValueRecord;
  layoutMode: boolean;
  pageOffsetX: number;
  saving: boolean;
  active: boolean;
  autoFocus: boolean;
  onFocused: () => void;
  onAnnotationSelect: (annotationId: string) => void;
  onAnnotationContextMenu: (annotationId: string, point: { x: number; y: number }) => void;
  onAnnotationStackSelect: (annotationIds: string[]) => void;
  onTextUnitSelection: (selection: CapturedSelectionRange, anchorRect: DOMRect, options?: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean }) => void;
  onTextUnitContextMenu: (selection: CapturedSelectionRange, anchorRect: DOMRect, point: { x: number; y: number }) => void;
  onBlockContextMenu: (point: { x: number; y: number }) => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onTextFlowChange: (textFlow: TextBlockContentV1) => void;
  onFieldDraftChange: (fieldValues: FieldValueRecord) => void;
  onSave: (silent?: boolean, fieldValues?: FieldValueRecord, textFlow?: TextBlockContentV1) => void;
  onTrash: () => void;
  onSelect: () => void;
  onBeginMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onBeginResize: (event: ReactPointerEvent<HTMLElement>) => void;
  onToggleExportRole: () => void;
  onToggleAIVisibility: () => void;
  onAnnotateBlock: () => void;
  showBlockTypeBadge: boolean;
  showAIStatusBadge: boolean;
  showExportStatusBadge: boolean;
  showLabelOverlay: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onMeasuredHeight: (height: number) => void;
  anchorsBySourceRef: Record<string, SourceAnchor>;
  sourceJumpBusy: string | null;
  onViewSource: (anchorId: string) => void;
}

function shouldKeepNativeFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('textarea, input, button, select, a, [role="button"]'));
}

export function BlockEditorLayer({
  block,
  text,
  textFlowDraft,
  annotations,
  draftAnnotationRanges,
  selectedAnnotationIds,
  layout,
  blockControlAnchor,
  fieldDraft,
  layoutMode,
  pageOffsetX,
  saving,
  active,
  autoFocus,
  onFocused,
  onAnnotationSelect,
  onAnnotationContextMenu,
  onAnnotationStackSelect,
  onTextUnitSelection,
  onTextUnitContextMenu,
  onBlockContextMenu,
  onTextChange,
  onTextFlowChange,
  onFieldDraftChange,
  onSave,
  onTrash,
  onSelect,
  onBeginMove,
  onBeginResize,
  onToggleExportRole,
  onToggleAIVisibility,
  onAnnotateBlock,
  showBlockTypeBadge,
  showAIStatusBadge,
  showExportStatusBadge,
  showLabelOverlay,
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
  const textFlow = textFlowDraft || getTextFlowContent(block.content_json);
  const formulaFields = presentationKind === 'formula'
    ? formulaFieldsFromBlock(block, fieldDraft ? text : undefined, fieldDraft)
    : null;
  const blockTypeLabel = presentationKind === 'code'
    ? 'CODE'
    : getNoteBlockTemplateLabel(block.metadata, block.block_type);
  const showContextualTypeBadge = active || showBlockTypeBadge;
  const blockAnnotationCluster = buildBlockAnnotationCluster({
    annotations,
    displayState: { labelsVisible: showLabelOverlay },
    blockId: block.id,
    selectedAnnotationIds,
  });

  const handleBlockItemDragStart = (event: ReactDragEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    writeContentGroupDragPayload(event.dataTransfer, {
      kind: 'block',
      block_id: block.id,
      label: block.title || block.block_type || 'Block',
      text_preview: text,
    });
  };

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
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && blockContentRef.current?.contains(activeElement)) {
        if (activeElement instanceof HTMLTextAreaElement) {
          resizeTextareaToContent(activeElement);
        }
        return;
      }
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
      resizeTextareaToContent(textarea);
    }, 0);
  }, [autoFocus]);

  const focusNearestTextArea = (clientY: number) => {
    const textareas = Array.from(
      blockContentRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-block-id]') || [],
    );
    const fallback = textareaRef.current;
    const textarea = textareas.reduce<HTMLTextAreaElement | null>((nearest, candidate) => {
      if (!nearest) return candidate;
      const nearestRect = nearest.getBoundingClientRect();
      const candidateRect = candidate.getBoundingClientRect();
      const nearestDistance = Math.abs((nearestRect.top + nearestRect.height / 2) - clientY);
      const candidateDistance = Math.abs((candidateRect.top + candidateRect.height / 2) - clientY);
      return candidateDistance < nearestDistance ? candidate : nearest;
    }, fallback);

    if (!textarea) return;
    window.requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
      const caret = textarea.value.length;
      textarea.selectionStart = caret;
      textarea.selectionEnd = caret;
      resizeTextareaToContent(textarea);
    });
  };

  const handleBlockMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (shouldKeepNativeFocusTarget(event.target)) return;
    onSelect();
    if (layoutMode) return;
    focusNearestTextArea(event.clientY);
  };

  const handleBlockContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof Element) {
      if (target.closest('[data-command-context-menu="true"], input, select, a')) {
        return;
      }
      if (!layoutMode && target.closest('textarea, button, [role="button"]')) {
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onBlockContextMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <article
      data-note-block-shell="true"
      className={`${styles.block} ${styles.blockBox} ${presentationKind === 'code' ? styles.codeBlockBox : ''} ${layoutMode ? styles.blockBoxLayoutMode : ''} ${active ? styles.blockActive : ''} ${boundary !== 'inside' ? styles.blockScratch : ''}`}
      style={{
        left: layout.x + pageOffsetX,
        top: layout.y,
        width: layout.width,
        minHeight: layout.height,
      }}
      onMouseDown={handleBlockMouseDown}
      onContextMenu={handleBlockContextMenu}
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
        onAnnotateBlock={onAnnotateBlock}
        onBlockItemDragStart={handleBlockItemDragStart}
        onTrash={onTrash}
      />
      {blockAnnotationCluster && (
        <button
          type="button"
          className={styles.blockAnnotationBadge}
          onMouseDown={(event) => event.preventDefault()}
          onContextMenu={(event) => {
            event.preventDefault();
            const annotationId = blockAnnotationCluster.annotation_ids[0];
            if (annotationId) onAnnotationContextMenu(annotationId, { x: event.clientX, y: event.clientY });
          }}
          onClick={() => {
            if (blockAnnotationCluster.annotation_ids.length > 1) {
              onAnnotationStackSelect(blockAnnotationCluster.annotation_ids);
            } else {
              const annotationId = blockAnnotationCluster.annotation_ids[0];
              if (annotationId) onAnnotationSelect(annotationId);
            }
          }}
        >
          {blockAnnotationCluster.primary_label}
        </button>
      )}

      <div ref={blockContentRef}>
        {presentationKind === 'formula' && formulaFields ? (
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
            blockId={block.id}
            text={text}
            textFlow={textFlow}
            presentationKind={presentationKind}
            annotations={annotations}
            draftAnnotationRanges={draftAnnotationRanges}
            selectedAnnotationIds={selectedAnnotationIds}
            showLabelOverlay={showLabelOverlay}
            layoutMode={layoutMode}
            textareaRef={textareaRef}
            onFocused={onFocused}
              onAnnotationSelect={onAnnotationSelect}
              onAnnotationContextMenu={onAnnotationContextMenu}
              onTextUnitSelection={onTextUnitSelection}
            onTextUnitContextMenu={onTextUnitContextMenu}
            onTextChange={onTextChange}
            onTextFlowChange={onTextFlowChange}
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
