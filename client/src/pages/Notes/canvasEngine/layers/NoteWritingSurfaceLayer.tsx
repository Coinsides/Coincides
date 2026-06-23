import {
  CornerDownLeft,
  Boxes,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
  type WheelEvent,
} from 'react';
import type { NoteSlashCommand } from '../../noteSlashCommands';
import {
  textFromContent,
  type FieldValueRecord,
} from '../blockContentService';
import type { RuntimeInteractionState } from '../interactionController';
import type { SlashTarget } from '../hooks/useSlashCommandController';
import type {
  AnnotationTruthV1,
  ContentGroupV1,
  GroupFolderV1,
  SourceAnchor,
  NoteBlock,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import {
  createBlockAnnotationRange,
  createAnnotationTruth,
  hideAnnotationTruth,
  renameAnnotationTruth,
  restoreAnnotationTruth,
  softDeleteAnnotationTruth,
  updateAnnotationColorToken,
} from '../annotationTruthService';
import {
  getChildAnnotations,
  getParentAnnotation,
} from '../annotationEditorService';
import {
  applySourceBackedAnnotationRangeEdit,
  rebaseAnnotationsForTextUnitEdit,
} from '../rangeRebaseService';
import type { CapturedSelectionRange } from '../selectionRangeService';
import { useSelectionDraftController } from '../hooks/useSelectionDraftController';
import {
  selectionDraftContainsCapturedSelection,
  selectionDraftRangesToAnnotationRanges,
} from '../selectionDraftService';
import {
  createTextFlowFromDroppedText,
  getTextFlowContent,
  replaceTextUnitText,
  textFlowIdForBlock,
} from '../textFlowService';
import {
  setTextUnitWritingRole,
} from '../textUnitEditorService';
import {
  createContentGroup,
  createContentGroupMemberFromAnnotation,
  createContentGroupMemberFromBlock,
  createContentGroupMemberFromRange,
} from '../contentGroupService';
import {
  hasContentGroupDragPayloadType,
  plainTextFromContentGroupDragPayload,
  readContentGroupDragPayload,
} from '../contentGroupDragService';
import {
  systemGroupFolderId,
} from '../groupFolderService';
import {
  buildAnnotationHighlightMenu,
  buildBlockShellMenu,
  buildTextSelectionMenu,
  WRITING_ROLE_BY_COMMAND,
  type CommandActionId,
  type CommandSurfaceMenu,
} from '../commandSurfaceService';
import {
  DEFAULT_BLOCK_HEIGHT,
  type BlockBoxLayout,
} from '../runtimeLayout';
import type { NoteCanvasRuntimeModel } from '../types';
import type {
  CanvasPoint,
  CanvasViewport,
} from '../types';
import {
  getBlockControlAnchorFromRect,
  worldRectToViewportRect,
} from '../overlayService';
import {
  viewportPointToWorldPoint,
} from '../viewportService';
import { AnnotationInspectorPanel } from '../panels/AnnotationInspectorPanel';
import { ContentGroupPanel } from '../panels/ContentGroupPanel';
import {
  type AnnotationContextMenuState,
} from './AnnotationContextMenuLayer';
import { AnnotationOverlayLayer } from './AnnotationOverlayLayer';
import { BlockEditorLayer } from './BlockEditorLayer';
import { ContextMenuLayer } from './ContextMenuLayer';
import { InlineNamePromptLayer } from './InlineNamePromptLayer';
import { SelectionToolbarLayer } from './SelectionToolbarLayer';
import { SlashMenuLayer } from './SlashMenuLayer';
import styles from '../../NoteDetail.module.css';

export interface NoteWritingSurfaceLayerProps {
  activeBlockId: string | null;
  activeSlashCommandId: string | null;
  anchorsBySourceRef: Record<string, SourceAnchor>;
  annotationTruths: AnnotationTruthV1[];
  contentGroups: ContentGroupV1[];
  groupFolders: GroupFolderV1[];
  blockFieldDrafts: Record<string, FieldValueRecord>;
  blockLayouts: Record<string, BlockBoxLayout>;
  blockListRef: RefObject<HTMLDivElement>;
  blockTextDrafts: Record<string, string>;
  blockTextFlowDrafts: Record<string, TextBlockContentV1>;
  creatingDraft: boolean;
  defaultDraftLayout: BlockBoxLayout;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  draftRef: RefObject<HTMLTextAreaElement>;
  draftText: string;
  focusBlockId: string | null;
  interactionState: RuntimeInteractionState;
  layoutMode: boolean;
  noteCanvasRuntime: NoteCanvasRuntimeModel;
  noteId: string;
  projectId: string;
  pageContentHeight: number;
  pageOffsetX: number;
  primaryPageFrameX: number;
  primaryPageFrameWidth: number;
  savingBlockId: string | null;
  selectedBlockId: string | null;
  showPreviewAIVisibility: boolean;
  showPreviewBlockTypes: boolean;
  showPreviewExportStatus: boolean;
  showPreviewLabelOverlay: boolean;
  slashCommands: NoteSlashCommand[];
  slashTarget: SlashTarget | null;
  snapGuide: { x?: number; y?: number } | null;
  sortedBlockCount: number;
  sourceJumpBusy: string | null;
  surfaceMode: 'page' | 'canvas';
  surfacePolicyMode: string;
  viewportTransform: CanvasViewport;
  visibleBlocks: NoteBlock[];
  onSaveAnnotationTruths: (annotations: AnnotationTruthV1[]) => Promise<void>;
  onSaveContentGroups: (groups: ContentGroupV1[]) => Promise<void>;
  onSaveGroupFolders: (folders: GroupFolderV1[]) => Promise<void>;
  onActivateDraft: (layout?: BlockBoxLayout) => void;
  onBeginMoveBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, layout: BlockBoxLayout) => void;
  onBeginResizeBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, text: string, layout: BlockBoxLayout) => void;
  onBlockKeyDown: (block: NoteBlock, text: string, event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlockListMouseDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBlockTextChange: (blockId: string, value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onBlockTextFlowChange: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
  onClearSlashTarget: () => void;
  onDiscardDraft: () => void;
  onDraftChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFieldDraftChange: (block: NoteBlock, text: string, fieldValues: FieldValueRecord) => void;
  onFocusBlock: (blockId: string) => void;
  onMeasuredBlockHeight: (block: NoteBlock, layout: BlockBoxLayout, isActive: boolean, height: number) => void;
  onPageSpaceDoubleClick: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPanViewportBy: (delta: CanvasPoint) => void;
  onPersistDraft: (text: string, options?: { textFlow?: TextBlockContentV1; layout?: BlockBoxLayout }) => Promise<void>;
  onResizeDraftFromTextarea: (textarea: HTMLTextAreaElement) => void;
  onResetViewport: () => void;
  onSaveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 },
  ) => Promise<NoteBlock | null>;
  onScrollViewportBy: (delta: CanvasPoint) => void;
  onSelectBlock: (blockId: string) => void;
  onSelectSlashCommand: (command: NoteSlashCommand) => void;
  onToggleAIVisibility: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onToggleExportRole: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onTrashBlock: (blockId: string) => void;
  onViewportSizeChange: (width: number, height: number) => void;
  onViewSource: (anchorId: string) => void;
  onZoomViewportAt: (point: CanvasPoint, nextZoom: number) => void;
}

type AnnotationNamePromptState = {
  kind: 'label';
  point: { x: number; y: number };
  initialValue: string;
} | null;

function nextNeutralLabelName(annotations: AnnotationTruthV1[]): string {
  const existingLabels = new Set(
    annotations
      .map((annotation) => annotation.raw_label.trim().toLowerCase())
      .filter(Boolean),
  );
  let index = 1;
  while (existingLabels.has(`label ${index}`)) {
    index += 1;
  }
  return `Label ${index}`;
}

export function NoteWritingSurfaceLayer({
  activeBlockId,
  activeSlashCommandId,
  anchorsBySourceRef,
  annotationTruths,
  contentGroups,
  groupFolders,
  blockFieldDrafts,
  blockLayouts,
  blockListRef,
  blockTextDrafts,
  blockTextFlowDrafts,
  creatingDraft,
  defaultDraftLayout,
  draftActive,
  draftLayout,
  draftRef,
  draftText,
  focusBlockId,
  interactionState,
  layoutMode,
  noteCanvasRuntime,
  noteId,
  projectId,
  pageContentHeight,
  pageOffsetX,
  primaryPageFrameX,
  primaryPageFrameWidth,
  savingBlockId,
  selectedBlockId,
  showPreviewAIVisibility,
  showPreviewBlockTypes,
  showPreviewExportStatus,
  showPreviewLabelOverlay,
  slashCommands,
  slashTarget,
  snapGuide,
  sortedBlockCount,
  sourceJumpBusy,
  surfaceMode,
  surfacePolicyMode,
  viewportTransform,
  visibleBlocks,
  onSaveAnnotationTruths,
  onSaveContentGroups,
  onSaveGroupFolders,
  onActivateDraft,
  onBeginMoveBlock,
  onBeginResizeBlock,
  onBlockKeyDown,
  onBlockListMouseDown,
  onBlockTextChange,
  onBlockTextFlowChange,
  onClearSlashTarget,
  onDiscardDraft,
  onDraftChange,
  onDraftKeyDown,
  onFieldDraftChange,
  onFocusBlock,
  onMeasuredBlockHeight,
  onPageSpaceDoubleClick,
  onPanViewportBy,
  onPersistDraft,
  onResizeDraftFromTextarea,
  onResetViewport,
  onSaveBlock,
  onScrollViewportBy,
  onSelectBlock,
  onSelectSlashCommand,
  onToggleAIVisibility,
  onToggleExportRole,
  onTrashBlock,
  onViewportSizeChange,
  onViewSource,
  onZoomViewportAt,
}: NoteWritingSurfaceLayerProps) {
  const surfaceRef = useRef<HTMLElement | null>(null);
  const panSessionRef = useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null);
  const [spacePanReady, setSpacePanReady] = useState(false);
  const [canvasPanning, setCanvasPanning] = useState(false);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [annotationContextMenu, setAnnotationContextMenu] = useState<AnnotationContextMenuState | null>(null);
  const [annotationHighlightContextMenu, setAnnotationHighlightContextMenu] = useState<{
    annotationId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [blockContextMenu, setBlockContextMenu] = useState<{
    blockId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [contentGroupPanelOpen, setContentGroupPanelOpen] = useState(false);
  const [annotationNamePrompt, setAnnotationNamePrompt] = useState<AnnotationNamePromptState>(null);
  const [, setOverlayPositionRevision] = useState(0);
  const selectedAnnotationId = selectedAnnotationIds[0] || null;
  const noteRootGroupFolderId = useMemo(() => systemGroupFolderId({
    kind: 'note',
    project_id: projectId,
    note_id: noteId,
    label: null,
  }), [noteId, projectId]);
  const {
    selectionDraft,
    draftAnnotationRanges,
    draftRangeCount,
    latestDraftRange,
    replaceDraft,
    appendDraftRange,
    activateDraft,
    clearDraft,
  } = useSelectionDraftController();
  const suggestedLabelName = useMemo(
    () => nextNeutralLabelName(annotationTruths),
    [annotationTruths],
  );

  const getCurrentTextFlowForBlock = (blockId: string): TextBlockContentV1 | null => {
    const block = visibleBlocks.find((item) => item.id === blockId);
    if (!block) return null;
    return blockTextFlowDrafts[blockId] || getTextFlowContent(block.content_json);
  };

  const plainTextFromTextFlow = (textFlow: TextBlockContentV1): string => (
    textFlow.units.map((unit) => unit.text).join('\n')
  );

  useEffect(() => {
    if (!surfaceRef.current || surfaceMode !== 'canvas') return undefined;
    const target = surfaceRef.current;
    const observer = new ResizeObserver(([entry]) => {
      onViewportSizeChange(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [onViewportSizeChange, surfaceMode]);

  useEffect(() => {
    if (surfaceMode !== 'canvas') {
      setSpacePanReady(false);
      setCanvasPanning(false);
      panSessionRef.current = null;
      return undefined;
    }

    const isTextEditingTarget = (target: EventTarget | null) => (
      target instanceof HTMLElement
      && Boolean(target.closest('textarea, input, select, [contenteditable="true"], [role="dialog"]'))
    );
    const isPanBlockedTarget = (target: EventTarget | null) => (
      target instanceof HTMLElement
      && Boolean(target.closest('textarea, input, select, button, [contenteditable="true"], [role="dialog"]'))
    );
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !isTextEditingTarget(event.target)) {
        const isZoomIn = event.key === '=' || event.key === '+';
        const isZoomOut = event.key === '-';
        const isZoomReset = event.key === '0';
        if (isZoomIn || isZoomOut || isZoomReset) {
          event.preventDefault();
          if (isZoomReset) {
            onResetViewport();
            return;
          }

          const rect = surfaceRef.current?.getBoundingClientRect();
          onZoomViewportAt({
            x: rect ? rect.width / 2 : 0,
            y: rect ? rect.height / 2 : 0,
          }, viewportTransform.zoom * (isZoomIn ? 1.12 : 0.88));
          return;
        }
      }

      if (event.code !== 'Space' || isPanBlockedTarget(event.target)) return;
      event.preventDefault();
      setSpacePanReady(true);
    };
    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.code !== 'Space') return;
      setSpacePanReady(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onResetViewport, onZoomViewportAt, surfaceMode, viewportTransform.zoom]);

  useEffect(() => {
    if (!selectedBlockId) return undefined;
    const refreshOverlayPosition = () => setOverlayPositionRevision((value) => value + 1);
    window.addEventListener('resize', refreshOverlayPosition);
    window.addEventListener('scroll', refreshOverlayPosition, true);
    return () => {
      window.removeEventListener('resize', refreshOverlayPosition);
      window.removeEventListener('scroll', refreshOverlayPosition, true);
    };
  }, [selectedBlockId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const annotationPanelOpen = selectedAnnotationIds.length > 0 || contentGroupPanelOpen;
    if (annotationPanelOpen) {
      document.body.setAttribute('data-coincides-annotation-panel-open', 'true');
    } else {
      document.body.removeAttribute('data-coincides-annotation-panel-open');
    }
    return () => {
      document.body.removeAttribute('data-coincides-annotation-panel-open');
    };
  }, [contentGroupPanelOpen, selectedAnnotationIds.length]);

  useEffect(() => {
    if (!selectionDraft) return undefined;

    const handleGlobalMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-selection-toolbar="true"], [data-selection-draft-handle="true"], [data-annotation-context-menu="true"], [data-command-context-menu="true"], [data-inline-name-prompt="true"], [role="dialog"]')) return;
      if (target.closest('textarea, input, select, [contenteditable="true"]')) return;
      if (target.closest('[data-text-unit-id][data-text-flow-id][data-block-id]')) return;
      clearDraft();
      setAnnotationContextMenu(null);
    };

    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearDraft();
      setAnnotationContextMenu(null);
      setAnnotationHighlightContextMenu(null);
      setBlockContextMenu(null);
    };

    window.addEventListener('mousedown', handleGlobalMouseDown, true);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [clearDraft, selectionDraft]);

  const transformedWorldStyle = useMemo(() => {
    if (surfaceMode !== 'canvas') return {};
    return {
      transform: `translate(${-viewportTransform.x * viewportTransform.zoom}px, ${-viewportTransform.y * viewportTransform.zoom}px) scale(${viewportTransform.zoom})`,
      transformOrigin: '0 0',
    } satisfies CSSProperties;
  }, [surfaceMode, viewportTransform.x, viewportTransform.y, viewportTransform.zoom]);

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (surfaceMode !== 'canvas') return;
    const target = event.target as HTMLElement;
    const isPanIntent = event.button === 1 || spacePanReady;
    if (!isPanIntent) return;
    if (target.closest('textarea, input, select, button, [role="dialog"]')) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panSessionRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setCanvasPanning(true);
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (surfaceMode !== 'canvas' || !panSessionRef.current) return;
    const session = panSessionRef.current;
    if (session.pointerId !== event.pointerId) return;
    const delta = {
      x: event.clientX - session.clientX,
      y: event.clientY - session.clientY,
    };
    panSessionRef.current = {
      ...session,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    onPanViewportBy(delta);
  };

  const endCanvasPan = (event: ReactPointerEvent<HTMLElement>) => {
    if (panSessionRef.current?.pointerId === event.pointerId) {
      panSessionRef.current = null;
      setCanvasPanning(false);
    }
  };

  const handleCanvasWheel = (event: WheelEvent<HTMLElement>) => {
    if (surfaceMode !== 'canvas') return;
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
      onZoomViewportAt({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }, viewportTransform.zoom * zoomFactor);
      return;
    }

    onScrollViewportBy({
      x: event.shiftKey ? event.deltaY : event.deltaX,
      y: event.shiftKey ? 0 : event.deltaY,
    });
  };

  const handleBlockListMouseDownForDraft = (event: ReactPointerEvent<HTMLDivElement>) => {
    onBlockListMouseDown(event);
    if (event.target !== event.currentTarget) return;
    clearDraft();
    setAnnotationContextMenu(null);
    setAnnotationHighlightContextMenu(null);
    setBlockContextMenu(null);
    setSelectedAnnotationIds([]);
    if (!draftActive || draftText.trim()) return;
    onDiscardDraft();
    onClearSlashTarget();
  };

  const handleTextUnitSelection = (
    range: CapturedSelectionRange,
    anchorRect: DOMRect,
    options: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean } = {},
  ) => {
    if (options.hitTestOnly) {
      if (selectionDraftContainsCapturedSelection(selectionDraft, range)) {
        activateDraft();
      } else {
        clearDraft();
        setAnnotationContextMenu(null);
      }
      return;
    }
    if (options.preserveDraft && !options.additive) return;
    if (options.additive) {
      appendDraftRange({
        range,
        anchorRect,
      });
      setAnnotationContextMenu(null);
      return;
    }
    replaceDraft({
      range,
      anchorRect,
    });
    setAnnotationContextMenu(null);
  };

  const handleTextUnitContextMenu = (
    range: CapturedSelectionRange,
    anchorRect: DOMRect,
    point: { x: number; y: number },
  ) => {
    const selection = { range, anchorRect };
    if (!selectionDraftContainsCapturedSelection(selectionDraft, range)) {
      replaceDraft({
        range,
        anchorRect,
      });
    }
    setBlockContextMenu(null);
    setAnnotationHighlightContextMenu(null);
    setAnnotationContextMenu({ selection, point });
  };

  const handleCreateAnnotation = async (label: string) => {
    if (!selectionDraft || selectionDraft.ranges.length === 0) return;
    const ranges = selectionDraftRangesToAnnotationRanges(selectionDraft.ranges);
    const annotation = createAnnotationTruth({
      noteId,
      canvasId: `note-canvas-${noteId}`,
      label: label.trim() || suggestedLabelName,
      ranges,
    });
    const nextAnnotations = [...annotationTruths, annotation];
    await onSaveAnnotationTruths(nextAnnotations);
    setSelectedAnnotationIds([annotation.id]);
    setAnnotationContextMenu(null);
    clearDraft();
  };

  const handleAddRangeToDraft = async () => {
    setAnnotationContextMenu(null);
  };

  const textFromSelectionDraft = () => (
    selectionDraft?.ranges.map((range) => {
      const start = Math.max(0, Math.min(range.text.length, range.startOffset));
      const end = Math.max(0, Math.min(range.text.length, range.endOffset));
      return range.text.slice(Math.min(start, end), Math.max(start, end));
    }).filter(Boolean).join('\n') || ''
  );

  const copyTextToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Browser clipboard can be unavailable in some test contexts.
    }
  };

  const handleCommitAnnotationDraft = async (label: string) => {
    const ranges = selectionDraftRangesToAnnotationRanges(selectionDraft?.ranges || []);
    if (ranges.length === 0) return;
    const annotation = createAnnotationTruth({
      noteId,
      canvasId: `note-canvas-${noteId}`,
      label: label.trim() || suggestedLabelName,
      ranges,
    });
    await onSaveAnnotationTruths([...annotationTruths, annotation]);
    setSelectedAnnotationIds([annotation.id]);
    setAnnotationContextMenu(null);
    clearDraft();
  };

  const handleRenameAnnotation = async (annotationId: string, nextLabel: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? renameAnnotationTruth(annotation, nextLabel) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleUpdateAnnotationColor = async (annotationId: string, colorToken: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? updateAnnotationColorToken(annotation, colorToken) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    const target = annotationTruths.find((annotation) => annotation.id === annotationId);
    const childIdsToDelete = new Set<string>();
    const collectDescendants = (annotation: AnnotationTruthV1) => {
      getChildAnnotations({ parent: annotation, annotations: annotationTruths, includeHidden: true }).forEach((child) => {
        if (childIdsToDelete.has(child.id)) return;
        childIdsToDelete.add(child.id);
        collectDescendants(child);
      });
    };
    if (target) collectDescendants(target);
    const parent = target ? getParentAnnotation({ annotation: target, annotations: annotationTruths, includeHidden: true }) : null;
    const nextAnnotations = annotationTruths.map((annotation) => {
      if (annotation.id === annotationId || childIdsToDelete.has(annotation.id)) {
        return softDeleteAnnotationTruth(annotation);
      }
      if (parent && annotation.id === parent.id) {
        return {
          ...annotation,
          child_annotation_ids: annotation.child_annotation_ids.filter((id) => id !== annotationId),
        };
      }
      return annotation;
    });
    await onSaveAnnotationTruths(nextAnnotations);
    setSelectedAnnotationIds((current) => current.filter((id) => id !== annotationId && !childIdsToDelete.has(id)));
  };

  const handleHideAnnotation = async (annotationId: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? hideAnnotationTruth(annotation) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleRestoreAnnotation = async (annotationId: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? restoreAnnotationTruth(annotation) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleCreateBlockAnnotation = async (block: NoteBlock, text: string) => {
    const annotation = createAnnotationTruth({
      noteId,
      canvasId: `note-canvas-${noteId}`,
      label: 'block',
      ranges: [createBlockAnnotationRange({
        blockId: block.id,
        text,
      })],
    });
    await onSaveAnnotationTruths([...annotationTruths, annotation]);
    setSelectedAnnotationIds([annotation.id]);
  };

  const handleEditAnnotationRangeText = async (input: {
    annotationId: string;
    rangeId: string;
    nextText: string;
  }) => {
    const annotation = annotationTruths.find((item) => item.id === input.annotationId);
    const range = annotation?.ranges.find((item) => item.id === input.rangeId);
    if (!annotation || !range || !range.block_id || !range.text_unit_id) return;

    const block = visibleBlocks.find((item) => item.id === range.block_id);
    const currentTextFlow = getCurrentTextFlowForBlock(range.block_id);
    const currentUnit = currentTextFlow?.units.find((unit) => unit.id === range.text_unit_id);
    if (!block || !currentTextFlow || !currentUnit) return;

    const editResult = applySourceBackedAnnotationRangeEdit({
      annotations: annotationTruths,
      annotationId: input.annotationId,
      rangeId: input.rangeId,
      currentText: currentUnit.text,
      replacementText: input.nextText,
    });
    if (!editResult) return;

    const nextTextFlow = replaceTextUnitText({
      textFlow: currentTextFlow,
      textUnitId: range.text_unit_id,
      nextText: editResult.next_text,
    });
    const nextPlainText = plainTextFromTextFlow(nextTextFlow);

    onBlockTextFlowChange((current) => ({
      ...current,
      [range.block_id as string]: nextTextFlow,
    }));
    onBlockTextChange(range.block_id, nextPlainText, nextPlainText.length, null);
    await onSaveBlock(block, nextPlainText, {
      silent: true,
      textFlow: nextTextFlow,
    });
    await onSaveAnnotationTruths(editResult.next_annotations);
  };

  const handleBlockTextFlowChange = async (
    block: NoteBlock,
    nextTextFlow: TextBlockContentV1,
  ) => {
    const previousTextFlow = blockTextFlowDrafts[block.id] || getTextFlowContent(block.content_json);
    onBlockTextFlowChange((current) => ({
      ...current,
      [block.id]: nextTextFlow,
    }));
    if (!previousTextFlow) return;

    let nextAnnotations = annotationTruths;
    previousTextFlow.units.forEach((previousUnit) => {
      const nextUnit = nextTextFlow.units.find((unit) => unit.id === previousUnit.id);
      if (!nextUnit || nextUnit.text === previousUnit.text) return;
      const rebase = rebaseAnnotationsForTextUnitEdit({
        annotations: nextAnnotations,
        blockId: block.id,
        textFlowId: textFlowIdForBlock(block.id),
        textUnitId: previousUnit.id,
        oldText: previousUnit.text,
        newText: nextUnit.text,
      });
      nextAnnotations = rebase.next_annotations;
    });

    if (nextAnnotations !== annotationTruths) {
      await onSaveAnnotationTruths(nextAnnotations);
    }
  };

  const applyWritingRoleToSelection = async (actionId: CommandActionId) => {
    const role = WRITING_ROLE_BY_COMMAND[actionId];
    if (!role || !selectionDraft) return;

    const blockIds = Array.from(new Set(selectionDraft.ranges.map((range) => range.blockId)));
    for (const blockId of blockIds) {
      const block = visibleBlocks.find((item) => item.id === blockId);
      const currentTextFlow = getCurrentTextFlowForBlock(blockId);
      if (!block || !currentTextFlow) continue;

      const unitIds = new Set(
        selectionDraft.ranges
          .filter((range) => range.blockId === blockId)
          .map((range) => range.textUnitId),
      );
      let nextTextFlow = currentTextFlow;
      unitIds.forEach((unitId) => {
        nextTextFlow = setTextUnitWritingRole(nextTextFlow, unitId, role);
      });

      const nextPlainText = plainTextFromTextFlow(nextTextFlow);
      await handleBlockTextFlowChange(block, nextTextFlow);
      onBlockTextChange(block.id, nextPlainText, nextPlainText.length, null);
      await onSaveBlock(block, nextPlainText, {
        silent: true,
        textFlow: nextTextFlow,
      });
    }

    clearDraft();
    setAnnotationContextMenu(null);
  };

  const openAnnotationNamePrompt = (input: Exclude<AnnotationNamePromptState, null>) => {
    setAnnotationNamePrompt(input);
    setAnnotationContextMenu(null);
    setAnnotationHighlightContextMenu(null);
  };

  const createContentGroupFromMembers = async (input: {
    title: string;
    members: ReturnType<typeof createContentGroupMemberFromRange>[];
  }) => {
    if (input.members.length === 0) {
      setContentGroupPanelOpen(true);
      return;
    }
    const nextGroup = createContentGroup({
      projectId,
      noteId,
      canvasId: `note-canvas-${noteId}`,
      title: input.title,
      members: input.members,
      folderId: noteRootGroupFolderId,
      folders: groupFolders,
    });
    await onSaveContentGroups([...contentGroups, nextGroup]);
    setContentGroupPanelOpen(true);
  };

  const createContentGroupFromSelection = async () => {
    const ranges = selectionDraftRangesToAnnotationRanges(selectionDraft?.ranges || []);
    await createContentGroupFromMembers({
      title: 'New content group',
      members: ranges.map((range, index) => createContentGroupMemberFromRange(range, index)),
    });
    clearDraft();
    setAnnotationContextMenu(null);
  };

  const handleAnnotationNamePromptCommit = async (value: string) => {
    const prompt = annotationNamePrompt;
    if (!prompt) return;
    const label = value.trim();
    if (!label) return;
    setAnnotationNamePrompt(null);

    if (prompt.kind === 'label') {
      await handleCreateAnnotation(label);
      return;
    }
  };

  const handleSelectionContextAction = async (actionId: CommandActionId) => {
    if (actionId === 'copy') {
      await copyTextToClipboard(textFromSelectionDraft());
      return;
    }
    if (actionId === 'label') {
      openAnnotationNamePrompt({
        kind: 'label',
        point: annotationContextMenu?.point || { x: 24, y: 120 },
        initialValue: suggestedLabelName,
      });
      return;
    }
    if (actionId === 'add_selection_to_content_group') {
      await createContentGroupFromSelection();
      return;
    }
    if (actionId === 'open_content_groups') {
      setContentGroupPanelOpen(true);
      return;
    }
    if (WRITING_ROLE_BY_COMMAND[actionId]) {
      await applyWritingRoleToSelection(actionId);
    }
  };

  const handleAnnotationContextMenu = (annotationId: string, point: { x: number; y: number }) => {
    setSelectedAnnotationIds([annotationId]);
    setAnnotationContextMenu(null);
    setBlockContextMenu(null);
    setAnnotationHighlightContextMenu({ annotationId, point });
  };

  const handleAnnotationHighlightContextAction = async (actionId: CommandActionId) => {
    const annotationId = annotationHighlightContextMenu?.annotationId;
    if (!annotationId) return;
    const annotation = annotationTruths.find((item) => item.id === annotationId);
    if (!annotation) return;

    if (actionId === 'open_label') {
      setSelectedAnnotationIds([annotationId]);
      return;
    }
    if (actionId === 'add_label_to_content_group') {
      await createContentGroupFromMembers({
        title: annotation.raw_label || 'New content group',
        members: [createContentGroupMemberFromAnnotation(annotation, 0)],
      });
      setSelectedAnnotationIds([annotationId]);
      setAnnotationHighlightContextMenu(null);
      setContentGroupPanelOpen(true);
      return;
    }
    if (actionId === 'hide_label') {
      await handleHideAnnotation(annotationId);
      return;
    }
    if (actionId === 'copy') {
      await copyTextToClipboard(
        annotation.ranges
          .map((range) => range.range_text_cache || '')
          .filter(Boolean)
          .join('\n'),
      );
    }
  };

  const handleBlockContextAction = async (actionId: CommandActionId) => {
    const blockId = blockContextMenu?.blockId;
    if (!blockId) return;
    const block = visibleBlocks.find((item) => item.id === blockId);
    const layout = blockLayouts[blockId];
    if (!block || !layout) return;
    const text = blockTextDrafts[block.id] ?? textFromContent(block);

    if (actionId === 'save_block') {
      await onSaveBlock(block, text, { silent: false, textFlow: blockTextFlowDrafts[block.id] });
      return;
    }
    if (actionId === 'label_block') {
      await handleCreateBlockAnnotation(block, text);
      return;
    }
    if (actionId === 'add_block_to_content_group') {
      clearDraft();
      setSelectedAnnotationIds([]);
      await createContentGroupFromMembers({
        title: block.title || block.block_type || 'New content group',
        members: [createContentGroupMemberFromBlock(block, 0)],
      });
      onSelectBlock(block.id);
      setBlockContextMenu(null);
      setContentGroupPanelOpen(true);
      return;
    }
    if (actionId === 'toggle_block_export') {
      onToggleExportRole(block, layout);
      return;
    }
    if (actionId === 'toggle_block_ai_visibility') {
      onToggleAIVisibility(block, layout);
      return;
    }
    if (actionId === 'trash_block') {
      onTrashBlock(block.id);
    }
  };

  const getBlockControlAnchorForLayout = (layout: BlockBoxLayout) => {
    const worldRect = {
      x: layout.x + pageOffsetX,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    };

    if (surfaceMode === 'canvas') {
      const surfaceRect = surfaceRef.current?.getBoundingClientRect();
      if (!surfaceRect) return null;
      return getBlockControlAnchorFromRect(worldRectToViewportRect({
        worldRect,
        viewport: viewportTransform,
        viewportElementRect: surfaceRect,
        source: 'block',
      }));
    }

    const blockListRect = blockListRef.current?.getBoundingClientRect();
    if (!blockListRect) return null;
    return getBlockControlAnchorFromRect({
      left: blockListRect.left + worldRect.x,
      right: blockListRect.left + worldRect.x + worldRect.width,
      top: blockListRect.top + worldRect.y,
      bottom: blockListRect.top + worldRect.y + worldRect.height,
    });
  };

  const textSelectionContextMenu: CommandSurfaceMenu | null = annotationContextMenu ? {
    id: 'text-selection-context-menu',
    kind: 'text_selection',
    point: annotationContextMenu.point,
    title: 'Selection',
    items: buildTextSelectionMenu(),
  } : null;

  const annotationHighlightMenu: CommandSurfaceMenu | null = annotationHighlightContextMenu ? {
    id: `annotation-highlight-menu-${annotationHighlightContextMenu.annotationId}`,
    kind: 'annotation_highlight',
    point: annotationHighlightContextMenu.point,
    title: 'Label',
    items: buildAnnotationHighlightMenu(),
  } : null;

  const blockShellMenu: CommandSurfaceMenu | null = blockContextMenu ? {
    id: `block-shell-menu-${blockContextMenu.blockId}`,
    kind: 'block_shell',
    point: blockContextMenu.point,
    title: 'Block',
    items: buildBlockShellMenu(),
  } : null;

  const blankDropTextFromEvent = (event: DragEvent<HTMLElement>): string | null => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    if (!payload) return null;
    const text = plainTextFromContentGroupDragPayload(payload).trimEnd();
    return text.trim() ? text : null;
  };

  const isBlankSurfaceDropTarget = (event: DragEvent<HTMLElement>): boolean => {
    const target = event.target;
    if (!(target instanceof Element)) return true;
    return !target.closest([
      '[data-note-block-shell="true"]',
      '[data-command-context-menu="true"]',
      '[data-content-group-panel="true"]',
      'textarea',
      'input',
      'select',
      'button',
      'a',
      '[role="button"]',
    ].join(','));
  };

  const layoutForBlankDrop = (event: DragEvent<HTMLElement>): BlockBoxLayout | null => {
    const height = Math.max(DEFAULT_BLOCK_HEIGHT, defaultDraftLayout.height);
    if (surfaceMode === 'canvas') {
      const surfaceRect = surfaceRef.current?.getBoundingClientRect();
      if (!surfaceRect) return null;
      const worldPoint = viewportPointToWorldPoint({
        x: event.clientX - surfaceRect.left,
        y: event.clientY - surfaceRect.top,
      }, viewportTransform);
      return {
        ...defaultDraftLayout,
        x: Math.max(0, worldPoint.x - pageOffsetX),
        y: Math.max(0, worldPoint.y),
        height,
        surface: 'canvas_workspace',
      };
    }

    const blockListRect = blockListRef.current?.getBoundingClientRect();
    if (!blockListRect) return null;
    return {
      ...defaultDraftLayout,
      y: Math.max(0, event.clientY - blockListRect.top),
      height,
      surface: 'formal_page',
    };
  };

  const handleBlankSurfaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isBlankSurfaceDropTarget(event)) return;
    if (!hasContentGroupDragPayloadType(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleBlankSurfaceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isBlankSurfaceDropTarget(event)) return;
    const droppedText = blankDropTextFromEvent(event);
    if (!droppedText) return;
    const layout = layoutForBlankDrop(event);
    if (!layout) return;
    event.preventDefault();
    event.stopPropagation();
    void onPersistDraft(droppedText, {
      layout,
      textFlow: createTextFlowFromDroppedText(droppedText),
    });
  };

  return (
    <section
      ref={surfaceRef}
      className={`${styles.writingSurface} ${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.writingSurfacePage} ${spacePanReady ? styles.canvasPanReady : ''} ${canvasPanning ? styles.canvasPanning : ''}`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={endCanvasPan}
      onPointerCancel={endCanvasPan}
      onWheel={handleCanvasWheel}
    >
      <div
        ref={blockListRef}
        className={`${styles.blockList} ${surfaceMode === 'canvas' ? styles.blockListCanvas : styles.blockListPage} ${layoutMode ? styles.layoutMode : ''}`}
        data-canvas-engine-version={noteCanvasRuntime.version}
        data-canvas-engine-route={noteCanvasRuntime.route}
        data-canvas-visible-blocks={noteCanvasRuntime.visibleBlockIds.length}
        data-canvas-page-frame={noteCanvasRuntime.primaryPageFrame?.id || 'none'}
        data-canvas-surface-mode={surfacePolicyMode}
        data-canvas-interaction-mode={interactionState.mode}
        data-canvas-interaction-target={interactionState.target}
        data-canvas-interaction-block={interactionState.blockId || ''}
        data-canvas-viewport-x={Math.round(noteCanvasRuntime.viewport.x)}
        data-canvas-viewport-y={Math.round(noteCanvasRuntime.viewport.y)}
        data-canvas-viewport-zoom={noteCanvasRuntime.viewport.zoom.toFixed(3)}
        data-page-frame-inset-left={noteCanvasRuntime.primaryPageFrame?.contentInset.left || 0}
        data-page-frame-inset-right={noteCanvasRuntime.primaryPageFrame?.contentInset.right || 0}
        style={{
          minHeight: surfaceMode === 'canvas' ? noteCanvasRuntime.world.height : pageContentHeight,
          ...transformedWorldStyle,
          '--formal-page-offset-x': `${primaryPageFrameX}px`,
          '--formal-page-width': `${primaryPageFrameWidth}px`,
          '--canvas-world-width': `${noteCanvasRuntime.world.width}px`,
          '--canvas-world-height': `${noteCanvasRuntime.world.height}px`,
        } as CSSProperties & Record<string, string | number>}
        onMouseDown={handleBlockListMouseDownForDraft}
        onDoubleClick={onPageSpaceDoubleClick}
        onDragOver={handleBlankSurfaceDragOver}
        onDrop={handleBlankSurfaceDrop}
      >
        {surfaceMode === 'canvas' && (
          <>
            <div className={styles.formalPageBoundary} style={{ minHeight: pageContentHeight }} />
            <div className={styles.scratchWorkspaceLabel}>Scratch workspace</div>
          </>
        )}
        {snapGuide?.x !== undefined && (
          <div className={styles.snapGuideVertical} style={{ left: snapGuide.x + pageOffsetX }} />
        )}
        {snapGuide?.y !== undefined && (
          <div className={styles.snapGuideHorizontal} style={{ top: snapGuide.y }} />
        )}
        {visibleBlocks.map((block) => {
          const text = blockTextDrafts[block.id] ?? textFromContent(block);
          const isActive = activeBlockId === block.id || focusBlockId === block.id || selectedBlockId === block.id;
          const layout = blockLayouts[block.id];
          const blockControlAnchor = isActive ? getBlockControlAnchorForLayout(layout) : null;
          return (
            <BlockEditorLayer
              key={block.id}
              block={block}
              text={text}
              layout={layout}
              blockControlAnchor={blockControlAnchor}
              textFlowDraft={blockTextFlowDrafts[block.id]}
              annotations={annotationTruths}
              draftAnnotationRanges={draftAnnotationRanges}
              selectedAnnotationIds={selectedAnnotationIds}
              fieldDraft={blockFieldDrafts[block.id]}
              layoutMode={layoutMode}
              saving={savingBlockId === block.id}
              active={isActive}
              autoFocus={focusBlockId === block.id}
              onFocused={() => onFocusBlock(block.id)}
              onAnnotationSelect={(annotationId) => setSelectedAnnotationIds([annotationId])}
              onAnnotationContextMenu={handleAnnotationContextMenu}
              onAnnotationStackSelect={setSelectedAnnotationIds}
              onTextUnitSelection={handleTextUnitSelection}
              onTextUnitContextMenu={handleTextUnitContextMenu}
              onBlockContextMenu={(point) => {
                setAnnotationContextMenu(null);
                setAnnotationHighlightContextMenu(null);
                setBlockContextMenu({ blockId: block.id, point });
              }}
              onTextChange={(value, caret, anchorElement) => onBlockTextChange(block.id, value, caret, anchorElement)}
              onTextFlowChange={(textFlow) => void handleBlockTextFlowChange(block, textFlow)}
              onFieldDraftChange={(fieldValues) => onFieldDraftChange(block, text, fieldValues)}
              onSave={(silent, fieldValues, textFlow) => onSaveBlock(block, text, { silent, fieldValues, textFlow })}
              onTrash={() => onTrashBlock(block.id)}
              onSelect={() => onSelectBlock(block.id)}
              onBeginMove={(event) => onBeginMoveBlock(event, block, layout)}
              onBeginResize={(event) => onBeginResizeBlock(event, block, text, layout)}
              onToggleExportRole={() => onToggleExportRole(block, layout)}
              onToggleAIVisibility={() => onToggleAIVisibility(block, layout)}
              onAnnotateBlock={() => void handleCreateBlockAnnotation(block, text)}
              showBlockTypeBadge={showPreviewBlockTypes}
              showAIStatusBadge={showPreviewAIVisibility}
              showExportStatusBadge={showPreviewExportStatus}
              showLabelOverlay={showPreviewLabelOverlay}
              onKeyDown={(event) => onBlockKeyDown(block, text, event)}
              onMeasuredHeight={(height) => onMeasuredBlockHeight(block, layout, isActive, height)}
              pageOffsetX={pageOffsetX}
              anchorsBySourceRef={anchorsBySourceRef}
              sourceJumpBusy={sourceJumpBusy}
              onViewSource={onViewSource}
            />
          );
        })}

        {draftActive && (
          <div
            className={`${styles.block} ${styles.blockBox} ${styles.draftBlock}`}
            style={{
              left: (draftLayout || defaultDraftLayout).x + pageOffsetX,
              top: (draftLayout || defaultDraftLayout).y,
              width: (draftLayout || defaultDraftLayout).width,
              height: (draftLayout || defaultDraftLayout).height,
            }}
          >
            <textarea
              ref={draftRef}
              className={styles.pageTextArea}
              value={draftText}
              onChange={(event) => {
                onResizeDraftFromTextarea(event.currentTarget);
                onDraftChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
              }}
              onBlur={() => {
                if (slashTarget?.target === 'draft') return;
                if (draftText.trim()) {
                  void onPersistDraft(draftText);
                } else {
                  onDiscardDraft();
                  onClearSlashTarget();
                }
              }}
              onKeyDown={onDraftKeyDown}
              placeholder={creatingDraft ? 'Saving block...' : 'Start writing, or type / for blocks'}
              rows={1}
            />
            <div className={styles.draftHint}>
              <CornerDownLeft size={13} />
              Enter for a new line, Ctrl+Enter for the next block.
            </div>
          </div>
        )}

        {slashTarget && (
          <SlashMenuLayer
            activeCommandId={activeSlashCommandId}
            commands={slashCommands}
            onSelect={onSelectSlashCommand}
            anchor={slashTarget.anchor}
          />
        )}

        {!draftActive && sortedBlockCount === 0 && (
          <button className={styles.emptyPagePrompt} onDoubleClick={() => onActivateDraft(defaultDraftLayout)}>
            Double-click to start writing
          </button>
        )}
      </div>
      <AnnotationOverlayLayer
        annotations={annotationTruths}
        selectedAnnotationId={selectedAnnotationId}
        showLabelOverlay={showPreviewLabelOverlay}
      />
      {!contentGroupPanelOpen && (
        <button
          type="button"
          className={styles.contentGroupLauncher}
          onClick={() => setContentGroupPanelOpen(true)}
          aria-label="Open content groups"
        >
          <Boxes size={16} />
          <span>Groups</span>
        </button>
      )}
      <SelectionToolbarLayer
        selection={selectionDraft && latestDraftRange ? {
          range: latestDraftRange,
          anchorRect: selectionDraft.anchorRect,
        } : null}
        onCancel={clearDraft}
        onCreateAnnotation={handleCreateAnnotation}
        suggestedLabelName={suggestedLabelName}
        draftRangeCount={draftRangeCount}
        onCommitDraft={handleCommitAnnotationDraft}
        onCancelDraft={clearDraft}
      />
      <ContextMenuLayer
        menu={textSelectionContextMenu}
        onClose={() => setAnnotationContextMenu(null)}
        onAction={(actionId) => handleSelectionContextAction(actionId)}
      />
      <ContextMenuLayer
        menu={annotationHighlightMenu}
        onClose={() => setAnnotationHighlightContextMenu(null)}
        onAction={(actionId) => handleAnnotationHighlightContextAction(actionId)}
      />
      <ContextMenuLayer
        menu={blockShellMenu}
        onClose={() => setBlockContextMenu(null)}
        onAction={(actionId) => handleBlockContextAction(actionId)}
      />
      <InlineNamePromptLayer
        prompt={annotationNamePrompt ? {
          point: annotationNamePrompt.point,
          title: 'Label',
          initialValue: annotationNamePrompt.initialValue,
          confirmLabel: 'Save',
        } : null}
        onCancel={() => setAnnotationNamePrompt(null)}
        onCommit={handleAnnotationNamePromptCommit}
      />
      {!contentGroupPanelOpen && selectedAnnotationIds.length > 0 && (
        <AnnotationInspectorPanel
          annotations={annotationTruths}
          selectedAnnotationIds={selectedAnnotationIds}
          onClose={() => setSelectedAnnotationIds([])}
          onDelete={handleDeleteAnnotation}
          onRename={handleRenameAnnotation}
          onUpdateColor={handleUpdateAnnotationColor}
          onHide={handleHideAnnotation}
          onRestore={handleRestoreAnnotation}
          onEditRangeText={handleEditAnnotationRangeText}
        />
      )}
      {contentGroupPanelOpen && (
        <ContentGroupPanel
          annotations={annotationTruths}
          contentGroups={contentGroups}
          groupFolders={groupFolders}
          blocks={visibleBlocks}
          selectedAnnotationIds={selectedAnnotationIds}
          draftRanges={draftAnnotationRanges}
          selectedBlockId={selectedBlockId}
          projectId={projectId}
          noteId={noteId}
          canvasId={`note-canvas-${noteId}`}
          onClose={() => setContentGroupPanelOpen(false)}
          onSaveContentGroups={onSaveContentGroups}
          onSaveGroupFolders={onSaveGroupFolders}
        />
      )}
    </section>
  );
}
