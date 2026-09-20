import { useAnnotationStampLayout } from '../annotationStampLayout';
import { resolveScreenRect, type CoordinateContract } from '../placementContractService';
import type { PageFrameModel, DocumentTypographyProfile } from '../types';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import { PaginatedTextBlockProjection } from '../blocks/PaginatedTextBlockProjection';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getNoteBlockTemplateLabel } from '@shared/types';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import {
  formulaFieldsFromBlock,
  presentationKindForBlock,
  type FieldValueRecord,
} from '../blockContentService';
import type { BlockAffiliationOutlineState } from '../blockAffiliationOutlineService';
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
import type {
  PageStackBlockFragmentProjection,
} from '../types';
import type { CapturedSelectionRange } from '../selectionRangeService';
import {
  createTextBlockContentV1,
  getTextFlowContent,
  projectTextFlowContent,
  TEXT_FLOW_CONTENT_KEY,
} from '../textFlowService';
import {
  setTextUnitWritingRole,
  splitTextUnitAtOffset,
} from '../textUnitEditorService';
import type { TextFocusReceipt } from '../textFocusReceipt';
import {
  buildBlockAnnotationCluster,
} from '../annotationDisplayService';
import {
  writeContentGroupDragPayload,
} from '../contentGroupDragService';
import { FormulaBlockProjection } from '../blocks/FormulaBlockProjection';
import { TextBlockProjection } from '../blocks/TextBlockProjection';
import { ChapterHeadingFurniture, type ChapterHeadingFurnitureProps } from './ChapterHeadingFurniture';
import { headingLevelForRole } from '../headingRoleService';
import { CodeBlockProjection } from '../blocks/CodeBlockProjection';
import { ItemRefBlockProjection } from '../blocks/ItemRefBlockProjection';
import { NoteRefBlockProjection } from '../blocks/NoteRefBlockProjection';
import { MediaBlockProjection, MediaBlockPlaceholder } from '../blocks/MediaBlockProjection';
import { TableBlockProjection } from '../blocks/TableBlockProjection';
import { TableBlockEditor } from '../blocks/TableBlockEditor';
import { readTableBlockPayload, type TableBlockPayload } from '../tableBlockService';
import { ComponentBlockProjection } from '../blocks/ComponentBlockProjection';
import { ComponentBlockEditor } from '../blocks/ComponentBlockEditor';
import { isBuiltinComponentKind, readComponentBlockPayload, type ComponentBlockPayload } from '../componentBlockService';
import { useBlockMeasurement } from '../hooks/useBlockMeasurement';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import type { CrossBlockUnitDropTarget, TextUnitDropTarget } from '../hooks/useTextUnitHandleDrag';
import type { TextFlowEditBoundary, TextFlowEditMetadata, TextFlowEditSelection } from '../textFlowEditSession';
import {
  supportsTextFlowBlockNavigation,
  type TextFlowBoundaryNavigationRequest,
  type TextFlowNavigationTarget,
} from '../textFlowBlockNavigation';
import { BlockControlBarLayer } from './BlockControlBarLayer';
import { BlockResizeHandleLayer } from './BlockResizeHandleLayer';
import { BlockSourceReferenceLayer } from './BlockSourceReferenceLayer';
import { PAGINATED_SOURCE_REFERENCE_HEIGHT_PX } from '../pageFlowSourceReferenceService';
import { BlockStatusBadgeLayer } from './BlockStatusBadgeLayer';
import styles from '../../NoteDetail.module.css';

interface BlockEditorLayerProps {
  coordinateContract?: CoordinateContract;
  pageFrame?: PageFrameModel | null;
  /** Content-space x of the paper's left wall; only paper has a margin lane. */
  textUnitGutterLaneX?: number;
  block: NoteBlock;
  contentReadOnly: boolean;
  mediaPlaceholder?: boolean;
  tablePrint?: boolean;
  onSaveTable?: (payload: TableBlockPayload) => Promise<boolean>;
  componentPrint?: boolean;
  onSaveComponent?: (payload: ComponentBlockPayload) => Promise<boolean>;
  allowSaveRecovery?: boolean;
  text: string;
  textFlowDraft?: TextBlockContentV1;
  annotations: AnnotationTruthV1[];
  draftAnnotationRanges?: AnnotationRangeV1[];
  selectedAnnotationIds: string[];
  layout: BlockBoxLayout;
  blockFragments?: PageStackBlockFragmentProjection[];
  documentTypography?: DocumentTypographyProfile;
  blockControlAnchor: { x: number; y: number } | null;
  affiliationOutline: BlockAffiliationOutlineState | null;
  fieldDraft?: FieldValueRecord;
  layoutMode: boolean;
  pageOffsetX: number;
  saving: boolean;
  active: boolean;
  autoFocus: boolean;
  autoFocusReceipt?: TextFocusReceipt | null;
  autoFocusSelection?: { start: number; end: number } | null;
  onFocused: (receipt: TextFocusReceipt) => void;
  onFocusReleased: (receipt: TextFocusReceipt) => void;
  onAnnotationSelect: (annotationId: string) => void;
  onAnnotationContextMenu: (annotationId: string, point: { x: number; y: number }) => void;
  onAnnotationStackSelect: (annotationIds: string[]) => void;
  onTextUnitSelection: (selection: CapturedSelectionRange, anchorRect: DOMRect, options?: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean }) => void;
  onTextUnitContextMenu: (selection: CapturedSelectionRange, anchorRect: DOMRect, point: { x: number; y: number }) => void;
  onBlockContextMenu: (point: { x: number; y: number }) => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onTextFlowChange: (textFlow: TextBlockContentV1, metadata?: TextFlowEditMetadata, previousTextFlow?: TextBlockContentV1) => void;
  onTextEditBoundary?: (reason: TextFlowEditBoundary, selection?: TextFlowEditSelection) => void;
  onPasteImage?: (file: File) => Promise<void> | void;
  onExtractTextUnit?: (unitId: string, point: { x: number; y: number }) => void;
  allowHeading?: boolean;
  chapter?: ChapterHeadingFurnitureProps;
  onHeadingStructure?: (request: import('../headingRoleService').HeadingTextFlowStructureRequest) => Promise<boolean>;
  onMoveTextUnit?: (unitId: string, target: CrossBlockUnitDropTarget) => void;
  onUnitDropTargetChange?: (target: CrossBlockUnitDropTarget | null) => void;
  unitDropTarget?: TextUnitDropTarget | null;
  onBoundaryNavigate?: (request: TextFlowBoundaryNavigationRequest) => boolean;
  onNavigationTarget?: (target: TextFlowNavigationTarget | null) => void;
  onFlowSelectionStart?: () => void;
  onFieldDraftChange: (fieldValues: FieldValueRecord) => void;
  onSave: (
    silent?: boolean,
    fieldValues?: FieldValueRecord,
    textFlow?: TextBlockContentV1,
  ) => Promise<BlockSaveOutcome>;
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
  onFlowSelectionStart,
  coordinateContract,
  pageFrame,
  textUnitGutterLaneX,
  contentReadOnly,
  mediaPlaceholder = false,
  tablePrint = false,
  onSaveTable,
  componentPrint = false,
  onSaveComponent,
  allowSaveRecovery = false,
  text,
  textFlowDraft,
  annotations,
  draftAnnotationRanges,
  selectedAnnotationIds,
  layout,
  blockFragments = [],
  documentTypography = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  blockControlAnchor,
  affiliationOutline,
  fieldDraft,
  layoutMode,
  pageOffsetX,
  saving,
  active,
  autoFocus,
  autoFocusReceipt,
  autoFocusSelection,
  onFocused,
  onFocusReleased,
  onAnnotationSelect,
  onAnnotationContextMenu,
  onAnnotationStackSelect,
  onTextUnitSelection,
  onTextUnitContextMenu,
  onBlockContextMenu,
  onTextChange,
  onTextFlowChange,
  onTextEditBoundary,
  onPasteImage,
  onExtractTextUnit,
  allowHeading,
  chapter,
  onHeadingStructure,
  onMoveTextUnit,
  onUnitDropTargetChange,
  unitDropTarget,
  onBoundaryNavigate,
  onNavigationTarget,
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
  const screenRect = resolveScreenRect(layout, pageFrame, coordinateContract, pageOffsetX);
  const flowFragments = blockFragments.flatMap((fragment) => fragment.flowFragment?.textRange ? [{
    ...fragment.flowFragment,
    left: fragment.flowFragment.layout.x - (blockFragments[0]?.flowFragment?.layout.x ?? layout.x),
    top: fragment.blockRect.y - (blockFragments[0]?.blockRect.y ?? screenRect.y),
  }] : []);
  const paginated = flowFragments.length > 0;
  const TextProjection = paginated ? PaginatedTextBlockProjection : TextBlockProjection;
  const blockContentRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  useAnnotationStampLayout(shellRef);
  const navigationColumnRef = useRef<number | null>(null);
  const focusedReceiptRef = useRef<TextFocusReceipt | null>(null);
  const onFocusReleasedRef = useRef(onFocusReleased);
  onFocusReleasedRef.current = onFocusReleased;
  const boundary = getBoundaryKind(layout);
  const exportRole = getEffectiveExportRole(layout);
  const aiVisibility = getEffectiveAIVisibility(layout);
  const presentationKind = presentationKindForBlock(block);
  const itemReference = block.block_type === 'item_ref';
  const noteReference = block.block_type === 'note_ref';
  const mediaBlock = block.block_type === 'media';
  const tableBlock = block.block_type === 'table';
  const [editingTable, setEditingTable] = useState(false);
  const tablePayload = tableBlock ? readTableBlockPayload(block) : null;
  const componentBlock = block.block_type === 'component';
  const [editingComponent, setEditingComponent] = useState(false);
  const componentPayload = componentBlock ? readComponentBlockPayload(block) : null;
  const allowTextNavigation = !contentReadOnly && !layoutMode && supportsTextFlowBlockNavigation(block);
  useLayoutEffect(() => {
    if (allowTextNavigation || contentReadOnly || layoutMode) return;
    onNavigationTarget?.((request) => {
      if (request.selectionAnchor || !shellRef.current) return false;
      navigationColumnRef.current = request.columnX;
      onSelect();
      shellRef.current.focus({ preventScroll: true });
      shellRef.current.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      return true;
    });
    return () => onNavigationTarget?.(null);
  }, [allowTextNavigation, contentReadOnly, layoutMode, onNavigationTarget, onSelect]);
  const fragmentTotal = blockFragments[0]?.fragmentTotal || blockFragments.length;
  const crossPageFragment = fragmentTotal > 1;
  const fragmentRoles = blockFragments.map((fragment) => fragment.role).join(',');
  const fragmentRole = blockFragments.find((fragment) => fragment.role !== 'single')?.role || blockFragments[0]?.role || 'single';
  const fragmentContinuesFromPrevious = blockFragments.some((fragment) => fragment.clippedTop);
  const fragmentContinuesToNext = blockFragments.some((fragment) => fragment.clippedBottom);
  const fragmentContinuationLabel = [
    fragmentContinuesFromPrevious ? 'From previous' : null,
    fragmentContinuesToNext ? 'To next' : null,
  ].filter(Boolean).join(' / ');
  const textFlow = textFlowDraft || getTextFlowContent(block.content_json);
  const fallbackFocusReceipt: TextFocusReceipt = {
    blockId: block.id,
    textFlowId: textFlowIdForBlock(block.id),
    textUnitId: textFlow?.units[0]?.id || 'tu-1',
  };
  const formulaFields = presentationKind === 'formula'
    ? formulaFieldsFromBlock(block, fieldDraft ? text : undefined, fieldDraft)
    : null;
  const blockTypeLabel = noteReference ? (block.content_json.field === 'description' ? '述名件' : '题名件') : itemReference ? 'REFERENCED ITEM' : presentationKind === 'code'
    ? 'CODE'
    : getNoteBlockTemplateLabel(block.metadata, block.block_type);
  const showContextualTypeBadge = active || showBlockTypeBadge;
  const blockAnnotationCluster = buildBlockAnnotationCluster({
    annotations,
    displayState: { labelsVisible: showLabelOverlay },
    blockId: block.id,
    selectedAnnotationIds,
  });

  const handleFocused = (receipt: TextFocusReceipt) => {
    focusedReceiptRef.current = receipt;
    onFocused(receipt);
  };

  useEffect(() => () => {
    const receipt = focusedReceiptRef.current;
    if (receipt) onFocusReleasedRef.current(receipt);
  }, []);

  const handleBlockItemDragStart = (event: ReactDragEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    writeContentGroupDragPayload(event.dataTransfer, {
      kind: 'block',
      block_id: block.id,
      label: block.title || block.block_type || 'Block',
      text_preview: text,
    });
  };

  const handleInsertTextUnitBelow = () => {
    if (contentReadOnly || presentationKind !== 'paragraph') return;
    if (textareaRef.current?.dataset.runtimeTextflowComposing === 'true') return;
    const currentFlow = textFlow || createTextBlockContentV1(text);
    const targetUnit = currentFlow.units[currentFlow.units.length - 1];
    if (!targetUnit) return;

    const splitFlow = splitTextUnitAtOffset(currentFlow, targetUnit.id, targetUnit.text.length);
    const insertedIndex = splitFlow.units.findIndex((unit) => unit.id === targetUnit.id) + 1;
    const insertedUnit = splitFlow.units[insertedIndex];
    if (!insertedUnit) return;

    const nextFlow = setTextUnitWritingRole(splitFlow, insertedUnit.id, 'paragraph');
    if (headingLevelForRole(targetUnit.writing_role) && onHeadingStructure) {
      void onHeadingStructure({ previousTextFlow: currentFlow, nextTextFlow: nextFlow,
        headingUnitId: targetUnit.id, focus: { unitId: insertedUnit.id, caret: 0 }, inputType: 'insertParagraphAfterHeading' });
      return;
    }
    const projection = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: nextFlow }, text);
    onTextFlowChange(nextFlow, {
      unitId: targetUnit.id, inputType: 'insertParagraph', kind: 'structural', isComposing: false,
      beforeSelection: { unitId: targetUnit.id, start: targetUnit.text.length, end: targetUnit.text.length },
      afterSelection: { unitId: insertedUnit.id, start: 0, end: 0 },
    }, currentFlow);
    onTextChange(projection.plain_text, projection.plain_text.length, textareaRef.current);
  };

  useBlockMeasurement({
    enabled: !mediaBlock && !paginated,
    blockContentRef,
    textareaRef,
    text,
    width: layout.width,
    active,
    onMeasuredHeight,
  });

  useLayoutEffect(() => {
    if (!autoFocus || contentReadOnly) return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && blockContentRef.current?.contains(activeElement)) {
      if (activeElement instanceof HTMLTextAreaElement) {
        resizeTextareaToContent(activeElement);
      }
      return;
    }
    const textareas = Array.from(
      blockContentRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea') || [],
    );
    const textarea = autoFocusReceipt
      ? textareas.find((candidate) => candidate.dataset.textUnitId === autoFocusReceipt.textUnitId)
        || textareaRef.current
      : textareaRef.current;
    if (!textarea) return;
    textarea.focus({ preventScroll: true });
    const start = Math.max(0, Math.min(textarea.value.length, autoFocusSelection?.start ?? textarea.value.length));
    const end = Math.max(start, Math.min(textarea.value.length, autoFocusSelection?.end ?? start));
    textarea.setSelectionRange(start, end);
    resizeTextareaToContent(textarea);
  }, [autoFocus, autoFocusReceipt, autoFocusSelection, contentReadOnly]);

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
    if (contentReadOnly) return;
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
      ref={shellRef}
      tabIndex={-1}
      data-block-id={block.id}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || contentReadOnly || layoutMode
          || event.ctrlKey || event.metaKey || event.altKey
          || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229
          || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        if (!event.shiftKey) onBoundaryNavigate?.({ direction: event.key === 'ArrowDown' ? 'down' : 'up',
          columnX: navigationColumnRef.current });
      }}
      data-note-block-shell="true"
      data-note-flow-block={paginated ? 'true' : undefined}
      data-paper-block-border={!contentReadOnly && !active && !affiliationOutline && !crossPageFragment
        && boundary === 'inside' && layout.surface === 'formal_page' ? 'quiet' : undefined}
      data-cross-page-block-fragment={crossPageFragment ? 'true' : undefined}
      data-cross-page-fragment-count={crossPageFragment ? fragmentTotal : undefined}
      data-cross-page-fragment-role={crossPageFragment ? fragmentRole : undefined}
      data-cross-page-fragment-roles={crossPageFragment ? fragmentRoles : undefined}
      className={`${styles.block} ${styles.blockBox} ${presentationKind === 'code' ? styles.codeBlockBox : ''} ${layoutMode ? styles.blockBoxLayoutMode : ''} ${active ? styles.blockActive : ''} ${boundary !== 'inside' ? styles.blockScratch : ''} ${crossPageFragment ? styles.blockCrossPageFragment : ''}`}
      style={{
        left: screenRect.x,
        top: screenRect.y,
        width: layout.width,
        minHeight: layout.height,
        ...(paginated ? { height: layout.height, overflow: 'visible', minWidth: 0 } : {}),
        ...(mediaBlock ? { height: layout.height, minWidth: 0, padding: 0 } : {}),
        ...(tableBlock || componentBlock ? { minWidth: 0 } : {}),
        borderColor: affiliationOutline?.colorToken,
        borderStyle: affiliationOutline ? 'dashed' : undefined,
        ...(textUnitGutterLaneX !== undefined ? {
          // Row starts 10px inside the shell (border + padding). Cancel it and
          // the shell's x, then keep a 7px wall gap (4px is the gutter default).
          '--text-unit-gutter-lane-offset': `${screenRect.x - textUnitGutterLaneX + 13}px`,
          '--text-unit-gutter-cancel-indent': 1,
        } : {}),
      } as CSSProperties}
      onMouseDown={handleBlockMouseDown}
      onContextMenu={handleBlockContextMenu}
      onDoubleClick={tableBlock || componentBlock ? (event) => {
        event.stopPropagation();
        if (!contentReadOnly && !layoutMode) {
          if (tableBlock && onSaveTable) setEditingTable(true);
          if (componentBlock && onSaveComponent && componentPayload && isBuiltinComponentKind(componentPayload.component_kind)) setEditingComponent(true);
        }
      } : undefined}
    >
      {chapter && <ChapterHeadingFurniture {...chapter} />}
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
        contentReadOnly={contentReadOnly}
        allowSaveRecovery={allowSaveRecovery}
        bodyReadOnly={itemReference || noteReference || mediaBlock || tableBlock || componentBlock}
        onBeginMove={onBeginMove}
        onInsertTextUnitBelow={!itemReference && !noteReference && !mediaBlock && !tableBlock && !componentBlock && presentationKind === 'paragraph' ? handleInsertTextUnitBelow : undefined}
        onToggleExportRole={onToggleExportRole}
        onToggleAIVisibility={onToggleAIVisibility}
        onSaveBlock={() => onSave(false)}
        onAnnotateBlock={onAnnotateBlock}
        onBlockItemDragStart={handleBlockItemDragStart}
        onTrash={onTrash}
      />
      {crossPageFragment && fragmentContinuationLabel && (
        <div
          className={styles.blockFragmentContinuationBadge}
          data-cross-page-continuation-marker="true"
        >
          {fragmentContinuationLabel}
        </div>
      )}
      {blockAnnotationCluster && (
        <button
          type="button"
          className={styles.blockAnnotationBadge}
          data-annotation-stamp={blockAnnotationCluster.annotation_ids[0]}
          data-annotation-stamp-kind="block"
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

      <div
        ref={blockContentRef}
        data-annotation-stamp-block-content="true"
        style={mediaBlock ? { position: 'absolute', inset: 0 } : paginated ? { position: 'relative' } : undefined}
        onBlurCapture={() => {
          const receipt = focusedReceiptRef.current;
          if (!receipt) return;
          focusedReceiptRef.current = null;
          onFocusReleased(receipt);
        }}
      >
          {componentBlock ? (
            <ComponentBlockProjection block={block} print={componentPrint} />
          ) : tableBlock ? (
            <TableBlockProjection block={block} print={tablePrint} />
          ) : noteReference ? (
            <NoteRefBlockProjection field={block.content_json.field === 'description' ? 'description' : 'title'} readOnly={contentReadOnly || layoutMode} />
          ) : mediaBlock ? (
          mediaPlaceholder ? <MediaBlockPlaceholder block={block} /> : <MediaBlockProjection block={block} />
        ) : itemReference ? (
          <ItemRefBlockProjection itemId={typeof block.content_json.item_id === 'string' ? block.content_json.item_id : ''} />
        ) : presentationKind === 'formula' && formulaFields ? (
          <FormulaBlockProjection
            active={active}
            readOnly={contentReadOnly}
            fields={formulaFields}
            textareaRef={textareaRef}
            onFocused={() => handleFocused(fallbackFocusReceipt)}
            onTextChange={onTextChange}
            onFieldDraftChange={onFieldDraftChange}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        ) : presentationKind === 'code' ? (
          <CodeBlockProjection
            text={text}
            readOnly={contentReadOnly}
            textareaRef={textareaRef}
            onFocused={() => handleFocused(fallbackFocusReceipt)}
            onTextChange={onTextChange}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        ) : (
          <TextProjection
            fragments={flowFragments}
            typography={documentTypography}
            onFlowSelectionStart={onFlowSelectionStart}
            blockId={block.id}
            readOnly={contentReadOnly}
            text={text}
            textFlow={textFlow}
            presentationKind={presentationKind}
            annotations={annotations}
            draftAnnotationRanges={draftAnnotationRanges}
            selectedAnnotationIds={selectedAnnotationIds}
            showLabelOverlay={showLabelOverlay}
            layoutMode={layoutMode}
            textareaRef={textareaRef}
            onFocused={handleFocused}
              onAnnotationSelect={onAnnotationSelect}
              onAnnotationContextMenu={onAnnotationContextMenu}
              onTextUnitSelection={onTextUnitSelection}
            onTextUnitContextMenu={onTextUnitContextMenu}
            onTextChange={onTextChange}
            onTextFlowChange={onTextFlowChange}
            onTextEditBoundary={onTextEditBoundary}
            onPasteImage={onPasteImage}
            onExtractTextUnit={onExtractTextUnit}
            allowHeading={allowHeading}
            onHeadingStructure={onHeadingStructure}
            onBeginHeadingMove={onBeginMove}
            onMoveTextUnit={onMoveTextUnit}
            onUnitDropTargetChange={onUnitDropTargetChange}
            unitDropTarget={unitDropTarget}
            onBoundaryNavigate={allowTextNavigation ? onBoundaryNavigate : undefined}
            onNavigationTarget={allowTextNavigation ? onNavigationTarget : undefined}
            onSave={onSave}
            onKeyDown={onKeyDown}
          />
        )}

        {(!paginated || blockFragments[0]?.flowFragment?.isFirst) && <div
          style={paginated ? { position: 'absolute', top: layout.height - 16 - PAGINATED_SOURCE_REFERENCE_HEIGHT_PX, left: 0, right: 0 } : undefined}>
          <BlockSourceReferenceLayer
            paginated={paginated}
          sourceReferences={block.source_references}
          anchorsBySourceRef={anchorsBySourceRef}
          sourceJumpBusy={sourceJumpBusy}
          onViewSource={onViewSource}
        />
        </div>}
      </div>

      {editingComponent && componentPayload && onSaveComponent && !contentReadOnly && <ComponentBlockEditor
        initialPayload={componentPayload} onCancel={() => setEditingComponent(false)} onSave={async (payload) => {
          if (!await onSaveComponent(payload)) throw new Error('Component could not be saved. Please retry.');
          setEditingComponent(false);
        }} />}
      {editingTable && tablePayload && onSaveTable && !contentReadOnly && <TableBlockEditor
        initialPayload={tablePayload} onCancel={() => setEditingTable(false)} onSave={async (payload) => {
          if (!await onSaveTable(payload)) throw new Error('Table could not be saved. Please retry.');
          setEditingTable(false);
        }} />}
      {!contentReadOnly && !mediaBlock && <BlockResizeHandleLayer onBeginResize={onBeginResize} />}
    </article>
  );
}
