import {
  ChevronDown,
  ChevronRight,
  Move,
} from 'lucide-react';
import { flushSync } from 'react-dom';
import {
  useEffect,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import { expandGraphemeRange, nextGraphemeOffset, previousGraphemeOffset, snapGraphemeOffset } from '../../../../../../shared/graphemes';
import type { BlockPresentationKind } from '../blockContentService';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import { resizeTextareaToContent } from '../measurementService';
import { measureTextareaNavigation, textareaBoundaryCaret, textareaCaretAtPoint, textareaLineCaret } from '../textareaNavigation';
import { TextFlowSelectionLayer } from './TextFlowSelectionLayer';
import { DocumentTextFlowSelectionContext } from '../hooks/useDocumentTextFlowSelection';
import { flowSelectionText, orderedFlowSelection, replaceFlowSelection, type FlowPoint, type FlowSelection } from '../textFlowSelection';
import { deriveSingleTextEditDelta } from '../rangeRebaseService';
import type { TextFlowBoundaryNavigationRequest, TextFlowNavigationTarget } from '../textFlowBlockNavigation';
import { getPageDisplayScale } from '../overlayService';
import type {
  AnnotationTruthV1,
  AnnotationRangeV1,
  TextBlockContentV1,
  TextUnit,
  TextUnitWritingRole,
} from '../runtimeDataTypes';
import {
  TEXT_FLOW_CONTENT_KEY,
  projectTextFlowContent,
  replaceTextUnitText,
} from '../textFlowService';
import type { CapturedSelectionRange } from '../selectionRangeService';
import {
  createAnnotationRenderSegments,
} from '../annotationRenderService';
import {
  annotationColorForToken,
} from '../annotationColorService';
import {
  annotationRangeIsRenderable,
  visibleAnnotationsForDisplay,
} from '../annotationDisplayService';
import {
  buildTextUnitHandleMenu,
  WRITING_ROLE_BY_COMMAND,
  type CommandActionId,
  type CommandSurfaceMenu,
} from '../commandSurfaceService';
import { ContextMenuLayer } from '../layers/ContextMenuLayer';
import {
  indentTextUnit,
  insertPlainTextIntoTextFlow,
  mergeTextUnitWithPrevious,
  outdentTextUnit,
  parseTextUnitsFromPlainText,
  pasteTextIntoTextFlow,
  setTextUnitWritingRole,
  splitTextUnitForEnter,
  textUnitMarkerForDisplay,
  updateTextUnitMetadata,
} from '../textUnitEditorService';
import { TextUnitGutterLayer } from '../layers/TextUnitGutterLayer';
import { useTextUnitHandleDrag, type CrossBlockUnitDropTarget, type TextUnitDropTarget } from '../hooks/useTextUnitHandleDrag';
import { reorderTextUnit } from '../textUnitOrderService';
import {
  hasContentGroupDragPayloadType,
  plainTextFromContentGroupDragPayload,
  readContentGroupDragPayload,
  writeContentGroupDragPayload,
} from '../contentGroupDragService';
import styles from '../../NoteDetail.module.css';
import type { TextFocusReceipt } from '../textFocusReceipt';
import type {
  TextFlowEditBoundary,
  TextFlowEditMetadata,
  TextFlowEditSelection,
} from '../textFlowEditSession';

interface TextBlockProjectionProps {
  blockId: string;
  readOnly: boolean;
  text: string;
  textFlow: TextBlockContentV1 | null;
  presentationKind: BlockPresentationKind;
  annotations: AnnotationTruthV1[];
  draftAnnotationRanges?: AnnotationRangeV1[];
  selectedAnnotationIds: string[];
  showLabelOverlay: boolean;
  layoutMode?: boolean;
  textareaRef: Ref<HTMLTextAreaElement>;
  onFocused: (receipt: TextFocusReceipt) => void;
  onAnnotationSelect: (annotationId: string) => void;
  onAnnotationContextMenu: (annotationId: string, point: { x: number; y: number }) => void;
  onTextUnitSelection: (selection: CapturedSelectionRange, anchorRect: DOMRect, options?: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean }) => void;
  onTextUnitContextMenu: (selection: CapturedSelectionRange, anchorRect: DOMRect, point: { x: number; y: number }) => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onTextFlowChange: (textFlow: TextBlockContentV1, edit?: TextFlowEditMetadata, previousTextFlow?: TextBlockContentV1) => void;
  onTextEditBoundary?: (reason: TextFlowEditBoundary, selection?: TextFlowEditSelection) => void;
  onSave: (
    silent?: boolean,
    fieldValues?: undefined,
    textFlow?: TextBlockContentV1,
  ) => Promise<BlockSaveOutcome>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBoundaryNavigate?: (request: TextFlowBoundaryNavigationRequest) => boolean;
  onNavigationTarget?: (target: TextFlowNavigationTarget | null) => void;
  onFlowSelectionStart?: () => void;
  onExtractTextUnit?: (unitId: string, point: { x: number; y: number }) => void;
  onMoveTextUnit?: (unitId: string, target: CrossBlockUnitDropTarget) => void;
  onUnitDropTargetChange?: (target: CrossBlockUnitDropTarget | null) => void;
  unitDropTarget?: TextUnitDropTarget | null;
}

function plainTextForFlow(flow: TextBlockContentV1): string {
  return flow.units.map((unit) => unit.text).join('\n');
}

function roleForPresentationKind(kind: BlockPresentationKind): TextUnitWritingRole {
  if (kind === 'code') return 'code_line';
  return 'paragraph';
}

function flowFromText(text: string, kind: BlockPresentationKind): TextBlockContentV1 {
  const units = parseTextUnitsFromPlainText(text || '');
  const defaultRole = roleForPresentationKind(kind);
  return {
    textflow_version: 'TextBlockContentV1',
    units: units.map((unit, index) => ({
      ...unit,
      writing_role: unit.writing_role === 'paragraph' ? defaultRole : unit.writing_role,
      order_index: index,
    })),
    inline_structures: [],
    metadata: {},
  };
}

function maxTextUnitNumericSuffix(units: TextUnit[]): number {
  return units.reduce((max, unit) => {
    if (!unit.id.startsWith('tu-')) return max;
    const parsed = Number.parseInt(unit.id.slice(3), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
}

function createAlignedUnitId(existingIds: Set<string>, nextNumericId: { current: number }): string {
  let id = `tu-${nextNumericId.current}`;
  while (existingIds.has(id)) {
    nextNumericId.current += 1;
    id = `tu-${nextNumericId.current}`;
  }
  existingIds.add(id);
  nextNumericId.current += 1;
  return id;
}

function alignExistingFlowWithLines(
  textFlow: TextBlockContentV1,
  lines: string[],
  kind: BlockPresentationKind,
): TextBlockContentV1 {
  const existingIds = new Set(textFlow.units.map((unit) => unit.id));
  const nextNumericId = { current: maxTextUnitNumericSuffix(textFlow.units) + 1 };
  const defaultRole = roleForPresentationKind(kind);
  const units = lines.map((line, index) => {
    const existing = textFlow.units[index];
    if (existing) {
      return {
        ...existing,
        text: line,
        order_index: index,
      };
    }

    const parsed = parseTextUnitsFromPlainText(line)[0] || null;
    return {
      ...(parsed || {
        id: '',
        text: line,
        writing_role: defaultRole,
        indent_level: 0,
        order_index: index,
        metadata: {},
        status: 'active' as const,
      }),
      id: createAlignedUnitId(existingIds, nextNumericId),
      writing_role: parsed?.writing_role === 'paragraph' ? defaultRole : (parsed?.writing_role || defaultRole),
      order_index: index,
    };
  });

  return {
    ...textFlow,
    units,
    inline_structures: textFlow.inline_structures,
  };
}

function alignFlowWithText(
  text: string,
  textFlow: TextBlockContentV1 | null,
  kind: BlockPresentationKind,
): TextBlockContentV1 {
  if (!textFlow || textFlow.units.length === 0) return flowFromText(text, kind);
  const flowText = plainTextForFlow(textFlow);
  if (flowText === text) return textFlow;
  if (flowText.trimEnd() === text.trimEnd()) return textFlow;

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return alignExistingFlowWithLines(textFlow, lines, kind);
}

function globalCaretForUnit(units: TextUnit[], unitId: string, unitCaret: number): number {
  let offset = 0;
  for (const unit of units) {
    if (unit.id === unitId) return offset + unitCaret;
    offset += unit.text.length + 1;
  }
  return unitCaret;
}

function assignRef(ref: Ref<HTMLTextAreaElement>, node: HTMLTextAreaElement | null): void {
  if (typeof ref === 'function') {
    ref(node);
    return;
  }
  if (ref && 'current' in ref) {
    (ref as { current: HTMLTextAreaElement | null }).current = node;
  }
}

function visibleUnitEntries(units: TextUnit[]): Array<{ unit: TextUnit; index: number }> {
  const entries: Array<{ unit: TextUnit; index: number }> = [];
  let collapsedIndent: number | null = null;

  units.forEach((unit, index) => {
    if (collapsedIndent !== null) {
      if (unit.indent_level > collapsedIndent) return;
      collapsedIndent = null;
    }

    entries.push({ unit, index });
    if (unit.writing_role === 'toggle_item' && unit.metadata.collapsed === true) {
      collapsedIndent = unit.indent_level;
    }
  });

  return entries;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isChildAnnotation(annotation: AnnotationTruthV1, annotations: AnnotationTruthV1[]): boolean {
  if (annotation.parent_annotation_id) return true;
  return annotations.some((candidate) => candidate.child_annotation_ids.includes(annotation.id));
}

function rangeContainsTextOffset(range: AnnotationRangeV1, input: {
  blockId: string;
  textUnitId: string;
  offset: number;
  textLength: number;
}): boolean {
  if (!annotationRangeIsRenderable(range)) return false;
  if (
    range.block_id !== input.blockId
    || range.text_unit_id !== input.textUnitId
    || (range.target_kind !== 'text_span' && range.target_kind !== 'text_unit')
  ) {
    return false;
  }
  if (range.target_kind === 'text_unit') return true;
  const normalized = {
    start: Math.max(0, Math.min(input.textLength, range.start_offset ?? 0)),
    end: Math.max(0, Math.min(input.textLength, range.end_offset ?? range.start_offset ?? 0)),
  };
  const start = Math.min(normalized.start, normalized.end);
  const end = Math.max(normalized.start, normalized.end);
  return start <= input.offset && input.offset <= end;
}

function annotationRangesForTextUnit(input: {
  annotation: AnnotationTruthV1;
  blockId: string;
  textUnitId: string;
}): AnnotationRangeV1[] {
  return input.annotation.ranges.filter((range) => (
    annotationRangeIsRenderable(range)
    && range.block_id === input.blockId
    && range.text_unit_id === input.textUnitId
    && (range.target_kind === 'text_span' || range.target_kind === 'text_unit')
  ));
}

function previewFromRanges(ranges: AnnotationRangeV1[]): string {
  return ranges
    .filter(annotationRangeIsRenderable)
    .map((range) => range.range_text_cache?.trim())
    .filter((text): text is string => Boolean(text))
    .join(' | ');
}

function annotationStartOffsetInTextUnit(input: {
  annotation: AnnotationTruthV1;
  blockId: string;
  textUnitId: string;
}): number | null {
  const offsets = annotationRangesForTextUnit(input).map((range) => (
    range.target_kind === 'text_span' ? range.start_offset ?? 0 : 0
  ));
  if (offsets.length === 0) return null;
  return Math.min(...offsets);
}

function childAnnotationBadgesForTextUnit(input: {
  annotations: AnnotationTruthV1[];
  blockId: string;
  textUnitId: string;
}): Array<{ annotation: AnnotationTruthV1; startOffset: number }> {
  return input.annotations
    .filter((annotation) => isChildAnnotation(annotation, input.annotations))
    .flatMap((annotation) => {
      const startOffset = annotationStartOffsetInTextUnit({
        annotation,
        blockId: input.blockId,
        textUnitId: input.textUnitId,
      });
      if (startOffset === null) return [];
      return [{ annotation, startOffset }];
    })
    .sort((a, b) => a.startOffset - b.startOffset);
}

function parentAnnotationBadgesForTextUnit(input: {
  annotations: AnnotationTruthV1[];
  blockId: string;
  textUnitId: string;
}): Array<{ annotation: AnnotationTruthV1; startOffset: number }> {
  return input.annotations
    .filter((annotation) => !isChildAnnotation(annotation, input.annotations))
    .flatMap((annotation) => {
      const startOffset = annotationStartOffsetInTextUnit({
        annotation,
        blockId: input.blockId,
        textUnitId: input.textUnitId,
      });
      if (startOffset === null) return [];
      return [{ annotation, startOffset }];
    })
    .sort((a, b) => a.startOffset - b.startOffset);
}

function measureTextareaTextOffset(textarea: HTMLTextAreaElement, offset: number): { left: number; top: number } {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const marker = document.createElement('span');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.left = '-10000px';
  mirror.style.top = '0';
  mirror.style.boxSizing = 'border-box';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.minHeight = '0';
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.style.font = computed.font;
  mirror.style.fontSize = computed.fontSize;
  mirror.style.fontFamily = computed.fontFamily;
  mirror.style.fontWeight = computed.fontWeight;
  mirror.style.letterSpacing = computed.letterSpacing;
  mirror.style.lineHeight = computed.lineHeight;
  mirror.style.textTransform = computed.textTransform;
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.wordBreak = computed.wordBreak;
  const safeOffset = snapGraphemeOffset(textarea.value, offset);
  mirror.appendChild(document.createTextNode(textarea.value.slice(0, safeOffset) || '\u200b'));
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const position = {
    left: marker.offsetLeft,
    top: marker.offsetTop,
  };
  document.body.removeChild(mirror);
  return position;
}

function textareaOffsetFromPoint(
  textarea: HTMLTextAreaElement,
  point: { x: number; y: number },
): number {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.left = '-10000px';
  mirror.style.top = '0';
  mirror.style.boxSizing = 'border-box';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.minHeight = '0';
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.style.font = computed.font;
  mirror.style.fontSize = computed.fontSize;
  mirror.style.fontFamily = computed.fontFamily;
  mirror.style.fontWeight = computed.fontWeight;
  mirror.style.letterSpacing = computed.letterSpacing;
  mirror.style.lineHeight = computed.lineHeight;
  mirror.style.textTransform = computed.textTransform;
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.wordBreak = computed.wordBreak;
  mirror.style.pointerEvents = 'none';

  const characters = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(textarea.value);
  const markers: HTMLSpanElement[] = [];
  for (const { segment, index } of characters) {
    const marker = document.createElement('span');
    marker.textContent = segment || '\u200b';
    marker.dataset.offset = String(index);
    mirror.appendChild(marker);
    markers.push(marker);
  }
  const endMarker = document.createElement('span');
  endMarker.textContent = '\u200b';
  endMarker.dataset.offset = String(textarea.value.length);
  mirror.appendChild(endMarker);
  markers.push(endMarker);

  document.body.appendChild(mirror);
  const textareaRect = textarea.getBoundingClientRect();
  const pageScale = getPageDisplayScale(textarea);
  const localPoint = {
    x: (point.x - textareaRect.left) / pageScale + textarea.scrollLeft,
    y: (point.y - textareaRect.top) / pageScale + textarea.scrollTop,
  };
  let bestOffset = textarea.selectionStart;
  let bestDistance = Number.POSITIVE_INFINITY;
  markers.forEach((marker) => {
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    const markerCenter = {
      x: markerRect.left - mirrorRect.left + markerRect.width / 2,
      y: markerRect.top - mirrorRect.top + markerRect.height / 2,
    };
    const distance = Math.hypot(markerCenter.x - localPoint.x, markerCenter.y - localPoint.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = Number(marker.dataset.offset || 0);
    }
  });
  document.body.removeChild(mirror);
  return snapGraphemeOffset(textarea.value, bestOffset);
}

/** DOM selections use UTF-16 too; normalize only outside an active composition. */
function snapTextareaSelection(textarea: HTMLTextAreaElement) {
  const range = expandGraphemeRange(textarea.value, textarea.selectionStart, textarea.selectionEnd);
  if (range.start !== textarea.selectionStart || range.end !== textarea.selectionEnd) {
    textarea.setSelectionRange(range.start, range.end, textarea.selectionDirection);
  }
}

function badgeAnchorStateEqual(
  a: Record<string, { left: number; top: number }>,
  b: Record<string, { left: number; top: number }>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key]?.left === b[key]?.left && a[key]?.top === b[key]?.top);
}

export function TextBlockProjection({
  blockId,
  readOnly,
  text,
  textFlow,
  presentationKind,
  annotations,
  draftAnnotationRanges = [],
  selectedAnnotationIds,
  showLabelOverlay,
  layoutMode = false,
  textareaRef,
  onFocused,
  onAnnotationSelect,
  onAnnotationContextMenu,
  onTextUnitSelection,
  onTextUnitContextMenu,
  onTextChange,
  onTextFlowChange,
  onTextEditBoundary,
  onSave,
  onKeyDown,
  onBoundaryNavigate,
  onNavigationTarget,
  onFlowSelectionStart,
  onExtractTextUnit,
  onMoveTextUnit,
  onUnitDropTargetChange,
  unitDropTarget,
}: TextBlockProjectionProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const documentSelection = useContext(DocumentTextFlowSelectionContext);
  const unitRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingFocusRef = useRef<{ unitId: string; caret: number } | null>(null);
  const latestFlowRef = useRef<TextBlockContentV1 | null>(null);
  const compositionRef = useRef(false);
  const verticalColumnRef = useRef<number | null>(null);
  const traversingRef = useRef(false);
  const caretLineRef = useRef<{ unitId: string; offset: number; y: number } | null>(null);
  const nativeLineTargetRef = useRef<{ unitId: string; y: number } | null>(null);
  const deferredBlurRef = useRef(false);
  const selectionRef = useRef<TextFlowEditSelection | null>(null);
  const flowSelectionRef = useRef<FlowSelection | null>(null);
  const [flowSelection, setFlowSelection] = useState<FlowSelection | null>(null);
  const beforeInputRef = useRef<{ selection: TextFlowEditSelection; inputType: string; data?: string | null } | null>(null);
  const additiveSelectionSessionRef = useRef(false);
  const flowShiftClickRef = useRef(false);
  const [annotationBadgeAnchors, setAnnotationBadgeAnchors] = useState<Record<string, { left: number; top: number }>>({});
  const [childAnnotationBadgeAnchors, setChildAnnotationBadgeAnchors] = useState<Record<string, { left: number; top: number }>>({});
  const [draftRangeBadgeAnchors, setDraftRangeBadgeAnchors] = useState<Record<string, { left: number; top: number }>>({});
  const [textUnitContextMenu, setTextUnitContextMenu] = useState<{
    unitId: string;
    point: { x: number; y: number };
  } | null>(null);
  const editableFlow = useMemo(
    () => alignFlowWithText(text, textFlow, presentationKind),
    [presentationKind, text, textFlow],
  );
  const textFlowId = textFlowIdForBlock(blockId);
  const readSelection = (unitId: string, textarea: HTMLTextAreaElement): TextFlowEditSelection => ({
    unitId, start: textarea.selectionStart, end: textarea.selectionEnd,
  });

  const captureSelectionBoundary = (unitId: string, textarea: HTMLTextAreaElement) => {
    if (!compositionRef.current) snapTextareaSelection(textarea);
    const selection = readSelection(unitId, textarea);
    const previous = selectionRef.current;
    if (!readOnly && !compositionRef.current && previous && (
      previous.unitId !== selection.unitId || previous.start !== selection.start || previous.end !== selection.end
    )) onTextEditBoundary?.('selection', selection);
    selectionRef.current = selection;
  };

  const captureNativeCaretLine = (unitId: string, textarea: HTMLTextAreaElement) => {
    if (!compositionRef.current) snapTextareaSelection(textarea);
    const target = nativeLineTargetRef.current;
    if (target?.unitId !== unitId) return;
    const measured = measureTextareaNavigation(textarea, textarea.selectionStart, target.y);
    if (measured) caretLineRef.current = { unitId, offset: textarea.selectionStart, y: measured.y };
  };

  // Native beforeinput preserves the actual pre-edit selection for typing,
  // replacement, deletion and paste (React's beforeinput is a polyfill).
  useEffect(() => {
    const listeners = Object.entries(unitRefs.current).flatMap(([unitId, node]) => {
      if (!node || readOnly) return [];
      const capture = (event: Event) => {
        const input = event as InputEvent;
        if (!compositionRef.current && !input.isComposing) snapTextareaSelection(node);
        if (event.cancelable && (flowSelectionRef.current || documentSelection?.read()) && !compositionRef.current && !input.isComposing) {
          if (input.inputType.startsWith('delete') || input.data !== null
            || input.inputType === 'insertLineBreak' || input.inputType === 'insertParagraph') {
            event.preventDefault();
            replaceSelection(input.inputType.startsWith('delete') ? '' : input.data ?? '\n', node);
            return;
          }
        }
        beforeInputRef.current = {
          selection: readSelection(unitId, node),
          inputType: (event as InputEvent).inputType || 'insertText',
          data: input.data,
        };
      };
      node.addEventListener('beforeinput', capture);
      return [() => node.removeEventListener('beforeinput', capture)];
    });
    return () => listeners.forEach((remove) => remove());
  }, [editableFlow.units, readOnly, documentSelection]);
  const labelDisplayState = useMemo(() => ({
    labelsVisible: showLabelOverlay,
  }), [showLabelOverlay]);
  const activeAnnotations = useMemo(
    () => visibleAnnotationsForDisplay({
      annotations,
      displayState: labelDisplayState,
    }),
    [annotations, labelDisplayState],
  );

  const focusTextUnit = (unitId: string, caret: number) => {
    const node = unitRefs.current[unitId];
    if (!node) return;
    const nextCaret = snapGraphemeOffset(node.value, caret);
    node.focus({ preventScroll: true });
    node.selectionStart = nextCaret;
    node.selectionEnd = nextCaret;
    selectionRef.current = readSelection(unitId, node);
    resizeTextareaToContent(node);
  };

  const clearFlowSelection = () => {
    flowSelectionRef.current = null;
    setFlowSelection(null);
  };

  const availableUnits = () => visibleUnitEntries(editableFlow.units).filter(({ unit }) => {
    const target = unitRefs.current[unit.id];
    if (!target || target.disabled || target.readOnly || target.hidden || target.closest('[hidden], [inert]')) return false;
    if (typeof target.checkVisibility === 'function' && !target.checkVisibility()) return false;
    const style = window.getComputedStyle(target);
    return style.display !== 'none' && style.visibility === 'visible';
  });

  const focusBoundary = (targetUnit: TextUnit, request: TextFlowBoundaryNavigationRequest) => {
    const target = unitRefs.current[targetUnit.id];
    if (!target) return false;
    const forward = request.direction === 'down' || request.direction === 'right';
    const vertical = request.direction === 'up' || request.direction === 'down';
    const caret = vertical && request.columnX !== null
      ? textareaBoundaryCaret(target, forward ? 'first' : 'last', request.columnX)
      : { offset: forward ? 0 : target.value.length, y: undefined, nativeLineEndFrom: undefined, nativeColumnSeed: undefined };
    if (!caret) return false;
    if (request.selectionAnchor) {
      const starting = !documentSelection?.read();
      if (!documentSelection?.select(request.selectionAnchor, { blockId, unitId: targetUnit.id, offset: caret.offset })) return false;
      if (starting) onFlowSelectionStart?.();
      verticalColumnRef.current = vertical ? request.columnX : null;
      caretLineRef.current = caret.y === undefined ? null : { unitId: targetUnit.id, offset: caret.offset, y: caret.y };
      return true;
    }
    traversingRef.current = true;
    try {
      clearFlowSelection();
      const nativeSelection = target.ownerDocument.getSelection();
      const canMoveNatively = typeof nativeSelection?.modify === 'function';
      focusTextUnit(targetUnit.id, (canMoveNatively ? caret.nativeColumnSeed?.offset : undefined)
        ?? caret.nativeLineEndFrom ?? caret.offset);
      if (canMoveNatively && caret.nativeColumnSeed) {
        for (let step = 0; step < caret.nativeColumnSeed.steps; step += 1) {
          nativeSelection.modify('move', caret.nativeColumnSeed.direction, 'line');
        }
      } else if (canMoveNatively && caret.nativeLineEndFrom !== undefined) nativeSelection.modify('move', 'forward', 'lineboundary');
      snapTextareaSelection(target);
      selectionRef.current = readSelection(targetUnit.id, target);
      verticalColumnRef.current = vertical ? request.columnX : null;
      caretLineRef.current = caret.y === undefined ? null : { unitId: targetUnit.id, offset: target.selectionStart, y: caret.y };
      nativeLineTargetRef.current = null;
      target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      return true;
    } finally { traversingRef.current = false; }
  };

  useLayoutEffect(() => {
    onNavigationTarget?.(readOnly ? null : (request) => {
      if (compositionRef.current) return false;
      const entries = availableUnits();
      const forward = request.direction === 'down' || request.direction === 'right';
      const target = forward ? entries[0] : entries[entries.length - 1];
      return target ? focusBoundary(target.unit, request) : false;
    });
    return () => onNavigationTarget?.(null);
  }, [onNavigationTarget, readOnly, editableFlow, documentSelection, onFlowSelectionStart]);

  useLayoutEffect(() => {
    documentSelection?.register(blockId, { flow: editableFlow, editable: !readOnly,
      anchor: () => flowSelectionRef.current?.anchor ?? null,
      focus: (point) => {
        clearFlowSelection();
        focusTextUnit(point.unitId, point.offset);
        unitRefs.current[point.unitId]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      },
    });
    return () => documentSelection?.register(blockId, null);
  }, [blockId, editableFlow, readOnly, documentSelection?.register]);

  const selectFlowRange = (anchor: FlowPoint, focus: FlowPoint) => {
    const snap = (point: FlowPoint) => {
      const unit = editableFlow.units.find((entry) => entry.id === point.unitId);
      return unit ? { ...point, offset: snapGraphemeOffset(unit.text, point.offset) } : point;
    };
    anchor = snap(anchor);
    focus = snap(focus);
    const documentRange = documentSelection?.read();
    if (documentRange) {
      documentSelection?.select(documentRange.anchor, { blockId, ...focus });
      return;
    }
    // Capture both endpoints before clearing the native annotation preview.
    if (!flowSelectionRef.current && anchor.unitId !== focus.unitId) onFlowSelectionStart?.();
    traversingRef.current = true;
    try {
      // Native selection still owns a range that has contracted to one textarea.
      // Keep its direction so the next Shift boundary step retains the anchor.
      if (anchor.unitId === focus.unitId) {
        clearFlowSelection();
        focusTextUnit(focus.unitId, focus.offset);
        unitRefs.current[focus.unitId]?.setSelectionRange(Math.min(anchor.offset, focus.offset),
          Math.max(anchor.offset, focus.offset), focus.offset < anchor.offset ? 'backward' : 'forward');
      } else {
        const selection = { anchor, focus };
        flowSelectionRef.current = selection;
        setFlowSelection(selection);
        focusTextUnit(focus.unitId, focus.offset);
      }
    } finally { traversingRef.current = false; }
  };

  const replaceSelection = (replacement: string, textarea: HTMLTextAreaElement) => {
    if (documentSelection?.read()) {
      if (readOnly || compositionRef.current) return false;
      beforeInputRef.current = null;
      return documentSelection.replace(replacement, 'replaceDocumentSelection');
    }
    const selection = flowSelectionRef.current;
    if (!selection || readOnly || compositionRef.current) return false;
    const currentFlow = latestFlowRef.current || editableFlow;
    const result = replaceFlowSelection(currentFlow, selection, replacement);
    if (!result) { clearFlowSelection(); return false; }
    clearFlowSelection();
    beforeInputRef.current = null;
    pendingFocusRef.current = { unitId: result.caret.unitId, caret: result.caret.offset };
    // B4's full-flow and touched-range snapshots own undo. The anchor is the
    // native caret to restore; this operation is one isolated structural group.
    emitFlowChange(result.flow, result.caret.unitId, result.caret.offset, textarea, { sync: true, edit: {
      unitId: selection.anchor.unitId, inputType: 'replaceFlowSelection', kind: 'structural', isComposing: false,
      beforeSelection: { unitId: selection.anchor.unitId, start: selection.anchor.offset, end: selection.anchor.offset },
      afterSelection: { unitId: result.caret.unitId, start: result.caret.offset, end: result.caret.offset },
    } });
    focusTextUnit(result.caret.unitId, result.caret.offset);
    return true;
  };

  const copyFlowRange = (event: ClipboardEvent<HTMLTextAreaElement>, cut: boolean) => {
    if (!compositionRef.current) snapTextareaSelection(event.currentTarget);
    if (documentSelection?.read()) {
      event.preventDefault();
      if (compositionRef.current || readOnly) return;
      event.clipboardData.setData('text/plain', documentSelection.text());
      if (cut) replaceSelection('', event.currentTarget);
      return;
    }
    const selection = flowSelectionRef.current;
    if (!selection) return;
    event.preventDefault();
    if (compositionRef.current || readOnly) return;
    event.clipboardData.setData('text/plain', flowSelectionText(latestFlowRef.current || editableFlow, selection));
    if (cut) replaceSelection('', event.currentTarget);
  };

  useLayoutEffect(() => {
    const previous = latestFlowRef.current;
    if (documentSelection?.ordered()?.blocks.some((entry) => entry.block.id === blockId) && (readOnly || (previous && (
      previous.units.length !== editableFlow.units.length || previous.units.some((unit, index) =>
        unit.id !== editableFlow.units[index].id || unit.text !== editableFlow.units[index].text)
    )))) documentSelection.clear();
    if (flowSelectionRef.current && (readOnly || !previous || previous.units.length !== editableFlow.units.length
      || previous.units.some((unit, index) => unit.id !== editableFlow.units[index].id || unit.text !== editableFlow.units[index].text))) clearFlowSelection();
    latestFlowRef.current = editableFlow;
    const focusTarget = pendingFocusRef.current;
    Object.values(unitRefs.current).forEach(resizeTextareaToContent);
    if (!focusTarget) return;
    pendingFocusRef.current = null;

    const focusTextarea = () => focusTextUnit(focusTarget.unitId, focusTarget.caret);

    focusTextarea();
    const animationFrameId = window.requestAnimationFrame(focusTextarea);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [editableFlow, readOnly]);

  useLayoutEffect(() => {
    if (!showLabelOverlay) {
      setAnnotationBadgeAnchors((current) => (Object.keys(current).length === 0 ? current : {}));
      setChildAnnotationBadgeAnchors((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    const nextAnchors: Record<string, { left: number; top: number }> = {};
    const nextChildAnchors: Record<string, { left: number; top: number }> = {};
    for (const unit of editableFlow.units) {
      const textarea = unitRefs.current[unit.id];
      if (!textarea) continue;

      parentAnnotationBadgesForTextUnit({
        annotations: activeAnnotations,
        blockId,
        textUnitId: unit.id,
      }).forEach(({ annotation, startOffset }) => {
        const measured = measureTextareaTextOffset(textarea, startOffset);
        nextAnchors[annotation.id] = {
          left: Math.round(clampNumber(measured.left, 0, Math.max(0, textarea.clientWidth - 96))),
          top: Math.round(Math.max(0, measured.top - 15)),
        };
      });

      childAnnotationBadgesForTextUnit({
        annotations: activeAnnotations,
        blockId,
        textUnitId: unit.id,
      }).forEach(({ annotation, startOffset: childStartOffset }) => {
        const measured = measureTextareaTextOffset(textarea, childStartOffset);
        nextChildAnchors[annotation.id] = {
          left: Math.round(clampNumber(measured.left, 0, Math.max(0, textarea.clientWidth - 96))),
          top: Math.round(Math.max(12, measured.top - 2)),
        };
      });
    }

    setAnnotationBadgeAnchors((current) => (
      badgeAnchorStateEqual(current, nextAnchors) ? current : nextAnchors
    ));
    setChildAnnotationBadgeAnchors((current) => (
      badgeAnchorStateEqual(current, nextChildAnchors) ? current : nextChildAnchors
    ));
  }, [activeAnnotations, blockId, editableFlow, showLabelOverlay]);

  useLayoutEffect(() => {
    if (draftAnnotationRanges.length === 0) {
      setDraftRangeBadgeAnchors((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    const nextAnchors: Record<string, { left: number; top: number }> = {};
    for (const unit of editableFlow.units) {
      const range = draftAnnotationRanges.find((item) => (
        item.block_id === blockId
        && item.text_unit_id === unit.id
        && (item.target_kind === 'text_span' || item.target_kind === 'text_unit')
      ));
      const textarea = unitRefs.current[unit.id];
      if (!range || !textarea) continue;

      const measured = measureTextareaTextOffset(textarea, range.start_offset ?? 0);
      nextAnchors[unit.id] = {
        left: Math.round(clampNumber(measured.left, 0, Math.max(0, textarea.clientWidth - 28))),
        top: Math.round(Math.max(-22, measured.top - 22)),
      };
    }

    setDraftRangeBadgeAnchors((current) => (
      badgeAnchorStateEqual(current, nextAnchors) ? current : nextAnchors
    ));
  }, [blockId, draftAnnotationRanges, editableFlow.units]);

  const emitFlowChange = (
    nextFlow: TextBlockContentV1,
    unitId: string,
    caret: number,
    anchorElement?: HTMLTextAreaElement | null,
    options: { sync?: boolean; edit?: TextFlowEditMetadata } = {},
  ) => {
    clearFlowSelection();
    verticalColumnRef.current = null;
    caretLineRef.current = null;
    nativeLineTargetRef.current = null;
    const previousTextFlow = latestFlowRef.current || editableFlow;
    const sourceUnitId = anchorElement?.dataset.textUnitId || unitId;
    const beforeSelection = anchorElement
      ? readSelection(sourceUnitId, anchorElement)
      : selectionRef.current || { unitId: sourceUnitId, start: caret, end: caret };
    const edit = options.edit || {
      unitId: sourceUnitId,
      inputType: 'structure',
      beforeSelection,
      afterSelection: { unitId, start: caret, end: caret },
      isComposing: false,
      kind: 'structural' as const,
    };
    selectionRef.current = edit.afterSelection;
    latestFlowRef.current = nextFlow;
    const projection = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: nextFlow }, text);
    const publish = () => {
      onTextFlowChange(nextFlow, edit, previousTextFlow);
      onTextChange(projection.plain_text, globalCaretForUnit(nextFlow.units, unitId, caret), anchorElement);
    };
    if (options.sync) {
      flushSync(publish);
      return;
    }
    publish();
  };

  const handleUnitTextChange = (
    unit: TextUnit,
    value: string,
    textarea: HTMLTextAreaElement,
    nativeInputType?: string,
    nativeIsComposing = false,
    nativeInputData?: string | null,
  ) => {
    resizeTextareaToContent(textarea);
    const currentFlow = latestFlowRef.current || editableFlow;
    const currentUnit = currentFlow.units.find((item) => item.id === unit.id) || unit;
    const afterSelection = readSelection(unit.id, textarea);
    const captured = beforeInputRef.current;
    beforeInputRef.current = null;
    if (currentUnit.text === value) {
      selectionRef.current = afterSelection;
      return;
    }
    let prefix = 0;
    while (prefix < currentUnit.text.length && prefix < value.length && currentUnit.text[prefix] === value[prefix]) prefix += 1;
    let suffix = 0;
    while (suffix < currentUnit.text.length - prefix && suffix < value.length - prefix
      && currentUnit.text[currentUnit.text.length - 1 - suffix] === value[value.length - 1 - suffix]) suffix += 1;
    if ((flowSelectionRef.current || documentSelection?.read()) && !compositionRef.current && !nativeIsComposing) {
      // Fallback for input methods that deliver input without cancelable beforeinput.
      // A grapheme diff may include the base that an inserted combining mark or
      // ZWJ joins. Preserve the actual insertion bytes before falling back to it.
      const inputType = nativeInputType || captured?.inputType || '';
      const data = nativeInputData ?? captured?.data;
      const focus = (documentSelection?.read() ?? flowSelectionRef.current)?.focus;
      const localSelection = captured?.selection.unitId === unit.id ? captured.selection
        : focus?.unitId === unit.id ? { start: focus.offset, end: focus.offset } : null;
      let replacement: string | undefined;
      if (inputType.startsWith('delete')) replacement = '';
      else if (typeof data === 'string') replacement = data;
      else if (localSelection) {
        const insertedLength = value.length - currentUnit.text.length + localSelection.end - localSelection.start;
        if (insertedLength >= 0) {
          const inserted = value.slice(localSelection.start, localSelection.start + insertedLength);
          if (currentUnit.text.slice(0, localSelection.start) + inserted + currentUnit.text.slice(localSelection.end) === value) {
            replacement = inserted;
          }
        }
      }
      replaceSelection(replacement ?? deriveSingleTextEditDelta(currentUnit.text, value).replacementText, textarea);
      return;
    }
    const beforeSelection = captured?.selection.unitId === unit.id
      ? captured.selection
      : selectionRef.current?.unitId === unit.id
        ? selectionRef.current
        : { unitId: unit.id, start: prefix, end: currentUnit.text.length - suffix };
    const isComposing = compositionRef.current || nativeIsComposing;
    let editStart = beforeSelection.start;
    let editEnd = beforeSelection.end;
    if (editStart === editEnd && value.length < currentUnit.text.length) {
      editStart = afterSelection.start;
      editEnd = editStart + currentUnit.text.length - value.length;
    }
    const replacementLength = value.length - currentUnit.text.length + editEnd - editStart;
    const nextFlow = replaceTextUnitText({
      textFlow: currentFlow, textUnitId: unit.id, nextText: value,
      // Use the native selection when it reconstructs this edit; a text diff
      // alone cannot locate an insertion among repeated characters.
      edit: replacementLength >= 0 ? {
        editedStartOffset: editStart, editedEndOffset: editEnd,
        replacementText: value.slice(editStart, editStart + replacementLength),
      } : undefined,
    });
    emitFlowChange(nextFlow, unit.id, afterSelection.start, textarea, { edit: {
      unitId: unit.id,
      inputType: isComposing ? 'insertCompositionText' : nativeInputType || captured?.inputType || 'insertText',
      beforeSelection,
      afterSelection,
      isComposing,
      kind: 'typing',
    } });
  };

  const saveAfterBlur = (selection: TextFlowEditSelection) => {
    onTextEditBoundary?.('blur', selection);
    void onSave(true, undefined, latestFlowRef.current || editableFlow);
  };

  const handleTextUnitSelection = (
    unit: TextUnit,
    textarea: HTMLTextAreaElement,
    options: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean } = {},
  ) => {
    if (flowSelectionRef.current || documentSelection?.read()) return;
    const startOffset = textarea.selectionStart;
    const endOffset = textarea.selectionEnd;
    if (startOffset === endOffset && !options.hitTestOnly) return;
    onTextUnitSelection({
      blockId,
      textFlowId,
      textUnitId: unit.id,
      startOffset,
      endOffset,
      text: unit.text,
    }, textarea.getBoundingClientRect(), options);
  };

  const clearNativeTextareaSelection = (textarea: HTMLTextAreaElement) => {
    const caret = Math.max(textarea.selectionStart, textarea.selectionEnd);
    textarea.selectionStart = caret;
    textarea.selectionEnd = caret;
    window.getSelection()?.removeAllRanges();
  };

  const selectionRangeForTextUnit = (unit: TextUnit): CapturedSelectionRange => ({
    blockId,
    textFlowId,
    textUnitId: unit.id,
    startOffset: 0,
    endOffset: unit.text.length,
    text: unit.text,
  });

  const handleAnnotateTextUnit = (unit: TextUnit) => {
    const textarea = unitRefs.current[unit.id];
    const anchorRect = textarea?.getBoundingClientRect();
    if (!anchorRect) return;
    onTextUnitSelection(selectionRangeForTextUnit(unit), anchorRect);
  };

  const handleTextUnitContextMenu = (unit: TextUnit, event: MouseEvent<HTMLTextAreaElement>) => {
    if (layoutMode) return;

    const textarea = event.currentTarget;
    const startOffset = textarea.selectionStart;
    const endOffset = textarea.selectionEnd;
    const point = {
      x: event.clientX,
      y: event.clientY,
    };
    const pointOffset = textareaOffsetFromPoint(textarea, point);

    if (startOffset !== endOffset) {
      event.preventDefault();
      onTextUnitContextMenu({
        blockId,
        textFlowId,
        textUnitId: unit.id,
        startOffset,
        endOffset,
        text: unit.text,
      }, textarea.getBoundingClientRect(), point);
      return;
    }

    const draftRangeAtPoint = draftAnnotationRanges.find((range) => rangeContainsTextOffset(range, {
      blockId,
      textUnitId: unit.id,
      offset: pointOffset,
      textLength: unit.text.length,
    })) || draftAnnotationRanges.find((range) => (
      range.block_id === blockId
      && range.text_unit_id === unit.id
      && (range.target_kind === 'text_span' || range.target_kind === 'text_unit')
    ));
    if (draftRangeAtPoint) {
      event.preventDefault();
      onTextUnitContextMenu({
        blockId,
        textFlowId,
        textUnitId: unit.id,
        startOffset: draftRangeAtPoint.start_offset ?? 0,
        endOffset: draftRangeAtPoint.end_offset ?? unit.text.length,
        text: unit.text,
      }, textarea.getBoundingClientRect(), point);
      return;
    }

    const targetAnnotation = activeAnnotations.find((annotation) => (
      annotation.ranges.some((range) => rangeContainsTextOffset(range, {
        blockId,
        textUnitId: unit.id,
        offset: pointOffset,
        textLength: unit.text.length,
      }))
    )) || activeAnnotations.find((annotation) => (
      selectedAnnotationIds.includes(annotation.id)
      && annotation.ranges.some((range) => rangeContainsTextOffset(range, {
        blockId,
        textUnitId: unit.id,
        offset: pointOffset,
        textLength: unit.text.length,
      }))
    ));
    if (!targetAnnotation) {
      event.preventDefault();
      setTextUnitContextMenu({
        unitId: unit.id,
        point,
      });
      return;
    }
    event.preventDefault();
    onAnnotationContextMenu(targetAnnotation.id, point);
  };

  const handleSetRole = (unit: TextUnit, role: TextUnitWritingRole) => {
    if (readOnly || compositionRef.current) return;
    const nextFlow = setTextUnitWritingRole(editableFlow, unit.id, role);
    pendingFocusRef.current = { unitId: unit.id, caret: unit.text.length };
    emitFlowChange(nextFlow, unit.id, unit.text.length, unitRefs.current[unit.id]);
  };

  const handleTextUnitMenuAction = (actionId: CommandActionId) => {
    const unit = editableFlow.units.find((item) => item.id === textUnitContextMenu?.unitId);
    if (!unit) return;
    const role = actionId === 'turn_unit_into_code_line' ? 'code_line' : WRITING_ROLE_BY_COMMAND[actionId];
    if (role) {
      handleSetRole(unit, role);
      return;
    }
    if (actionId === 'label_text_unit') {
      handleAnnotateTextUnit(unit);
    }
  };

  const handleToggleTodo = (unit: TextUnit) => {
    if (readOnly || compositionRef.current) return;
    const textarea = unitRefs.current[unit.id];
    const caret = textarea?.selectionStart ?? unit.text.length;
    const nextFlow = updateTextUnitMetadata(editableFlow, unit.id, {
      checked: unit.metadata.checked !== true,
    });
    pendingFocusRef.current = { unitId: unit.id, caret };
    emitFlowChange(nextFlow, unit.id, caret, textarea);
  };

  const handleToggleCollapsed = (unit: TextUnit) => {
    if (readOnly || compositionRef.current) return;
    const textarea = unitRefs.current[unit.id];
    const caret = textarea?.selectionStart ?? unit.text.length;
    const nextFlow = updateTextUnitMetadata(editableFlow, unit.id, {
      collapsed: unit.metadata.collapsed !== true,
    });
    pendingFocusRef.current = { unitId: unit.id, caret };
    emitFlowChange(nextFlow, unit.id, caret, textarea);
  };

  const handleUnitKeyDown = (unit: TextUnit, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (compositionRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    const documentRange = documentSelection?.read();
    const arrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
    if (documentRange && (event.key === 'Escape' || (arrow && !event.shiftKey))) {
      event.preventDefault();
      const ordered = documentSelection!.ordered();
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const point = event.key === 'Escape' ? documentRange.focus : ordered ? (forward ? ordered.end : ordered.start) : documentRange.focus;
      documentSelection!.clear();
      documentSelection!.focus(point);
      verticalColumnRef.current = null;
      return;
    }
    if (documentRange && ['Delete', 'Backspace', 'Enter'].includes(event.key)) {
      event.preventDefault();
      replaceSelection(event.key === 'Enter' ? '\n' : '', event.currentTarget);
      return;
    }
    if (documentRange && (['Tab', 'Home', 'End'].includes(event.key)
      || (arrow && (event.ctrlKey || event.metaKey || event.altKey))
      || ((event.ctrlKey || event.metaKey) && ['z', 'y', 'a'].includes(event.key.toLowerCase())))) documentSelection!.clear();
    captureNativeCaretLine(unit.id, event.currentTarget);
    nativeLineTargetRef.current = null;
    selectionRef.current = readSelection(unit.id, event.currentTarget);
    onKeyDown(event);
    if (event.defaultPrevented) {
      verticalColumnRef.current = null;
      caretLineRef.current = null;
      return;
    }

    const textarea = event.currentTarget;
    const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
    const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const activeRange = documentSelection?.read() ?? flowSelectionRef.current;
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    if (activeRange && (event.key === 'Escape' || ((vertical || horizontal) && !event.shiftKey))) {
      event.preventDefault();
      const ordered = orderedFlowSelection(editableFlow, activeRange);
      const point = event.key === 'Escape' ? activeRange.focus : ordered ? (forward ? ordered.end : ordered.start) : activeRange.focus;
      clearFlowSelection();
      focusTextUnit(point.unitId, point.offset);
      verticalColumnRef.current = null;
      return;
    }
    if (activeRange && (event.key === 'Delete' || event.key === 'Backspace' || event.key === 'Enter')) {
      event.preventDefault();
      replaceSelection(event.key === 'Enter' ? '\n' : '', textarea);
      return;
    }
    if (activeRange && (event.key === 'Tab' || event.key === 'Home' || event.key === 'End'
      || ((vertical || horizontal) && event.shiftKey && (event.ctrlKey || event.metaKey || event.altKey))
      || ((event.ctrlKey || event.metaKey) && ['z', 'y', 'a'].includes(event.key.toLowerCase())))) clearFlowSelection();

    if ((vertical || horizontal) && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const focusOffset = activeRange?.focus.offset
        ?? (textarea.selectionDirection === 'backward' ? textarea.selectionStart : textarea.selectionEnd);
      const anchor = activeRange?.anchor ?? { unitId: unit.id,
        offset: textarea.selectionDirection === 'backward' ? textarea.selectionEnd : textarea.selectionStart };
      const line = caretLineRef.current;
      const preferredY = line?.unitId === unit.id && line.offset === focusOffset ? line.y : undefined;
      const measured = vertical ? measureTextareaNavigation(textarea, focusOffset, preferredY) : null;
      if (vertical && measured && verticalColumnRef.current === null) verticalColumnRef.current = measured.x;
      if (!vertical) verticalColumnRef.current = null;
      const atBoundary = vertical ? (forward ? measured?.atLastLine : measured?.atFirstLine)
        : focusOffset === (forward ? textarea.value.length : 0);
      let focus: FlowPoint | null = null;
      let focusY: number | undefined;
      if (atBoundary) {
        const entries = availableUnits();
        const index = entries.findIndex((entry) => entry.unit.id === unit.id);
        const next = entries[index + (forward ? 1 : -1)]?.unit;
        if (next) {
          const target = unitRefs.current[next.id]!;
          const caret = vertical ? textareaBoundaryCaret(target, forward ? 'first' : 'last', verticalColumnRef.current!)
            : { offset: forward ? 0 : target.value.length, y: undefined };
          if (caret) { focus = { unitId: next.id, offset: caret.offset }; focusY = caret.y; }
        } else if (documentSelection && onBoundaryNavigate) {
          const selectionAnchor = documentSelection.read()?.anchor ?? { blockId, ...anchor };
          if (onBoundaryNavigate({ direction: event.key === 'ArrowDown' ? 'down' : event.key === 'ArrowUp' ? 'up'
            : event.key === 'ArrowRight' ? 'right' : 'left', columnX: vertical ? verticalColumnRef.current : null, selectionAnchor })) {
            event.preventDefault();
            return;
          }
        }
      } else if (activeRange || horizontal) {
        if (vertical && measured) {
          const caret = textareaLineCaret(textarea, focusOffset, forward ? 'down' : 'up', verticalColumnRef.current!, preferredY);
          if (caret) { focus = { unitId: unit.id, offset: caret.offset }; focusY = caret.y; }
        } else if (horizontal) {
          const offset = forward ? nextGraphemeOffset(textarea.value, focusOffset) : previousGraphemeOffset(textarea.value, focusOffset);
          if (offset !== focusOffset && (activeRange || Math.abs(offset - focusOffset) > 1)) {
            focus = { unitId: unit.id, offset };
          }
        }
      }
      if (focus) {
        event.preventDefault();
        selectFlowRange(anchor, focus);
        caretLineRef.current = focusY === undefined ? null : { unitId: focus.unitId, offset: focus.offset, y: focusY };
        nativeLineTargetRef.current = null;
        return;
      }
      // At a document obstacle, keep the logical range inside its text segment.
      if (activeRange) { event.preventDefault(); return; }
      if (vertical && measured) nativeLineTargetRef.current = { unitId: unit.id, y: measured.y + (forward ? 1 : -1) * measured.lineHeight };
      return;
    }
    const plainArrow = (vertical || horizontal) && !hasSelection
      && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (!plainArrow || !vertical) verticalColumnRef.current = null;
    if (plainArrow && horizontal) {
      const offset = forward ? nextGraphemeOffset(textarea.value, textarea.selectionStart)
        : previousGraphemeOffset(textarea.value, textarea.selectionStart);
      if (Math.abs(offset - textarea.selectionStart) > 1) {
        event.preventDefault();
        focusTextUnit(unit.id, offset);
        caretLineRef.current = null;
        nativeLineTargetRef.current = null;
        return;
      }
    }
    const previousLine = caretLineRef.current;
    const measurement = (plainArrow || event.key === 'Home' || event.key === 'End')
      ? measureTextareaNavigation(textarea, textarea.selectionStart,
        previousLine?.unitId === unit.id && previousLine.offset === textarea.selectionStart ? previousLine.y : undefined)
      : null;
    if (measurement) nativeLineTargetRef.current = {
      unitId: unit.id,
      y: measurement.y + (plainArrow && vertical ? (event.key === 'ArrowDown' ? 1 : -1) * measurement.lineHeight : 0),
    };

    if (plainArrow) {
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      if (vertical && measurement && verticalColumnRef.current === null) verticalColumnRef.current = measurement.x;
      const atBoundary = vertical
        ? (forward ? measurement?.atLastLine : measurement?.atFirstLine)
        : textarea.selectionStart === (forward ? textarea.value.length : 0);
      if (atBoundary) {
        const entries = visibleUnitEntries(editableFlow.units);
        const sourceIndex = entries.findIndex((entry) => entry.unit.id === unit.id);
        for (let index = sourceIndex + (forward ? 1 : -1);
          index >= 0 && index < entries.length; index += forward ? 1 : -1) {
          const targetUnit = entries[index].unit;
          const target = unitRefs.current[targetUnit.id];
          if (!target || target.disabled || target.readOnly || target.hidden
            || target.closest('[hidden], [inert]')) continue;
          if (typeof target.checkVisibility === 'function' && !target.checkVisibility()) continue;
          const targetStyle = window.getComputedStyle(target);
          if (targetStyle.display === 'none' || targetStyle.visibility !== 'visible') continue;
          const caret = vertical
            ? textareaBoundaryCaret(target, forward ? 'first' : 'last', verticalColumnRef.current!)
            : { offset: forward ? 0 : target.value.length, y: undefined, nativeLineEndFrom: undefined, nativeColumnSeed: undefined };
          if (caret === null) break;
          event.preventDefault();
          caretLineRef.current = null;
          nativeLineTargetRef.current = null;
          traversingRef.current = true;
          try {
            const nativeSelection = target.ownerDocument.getSelection();
            const canMoveNatively = typeof nativeSelection?.modify === 'function';
            focusTextUnit(targetUnit.id, (canMoveNatively ? caret.nativeColumnSeed?.offset : undefined)
              ?? caret.nativeLineEndFrom ?? caret.offset);
            // setSelectionRange at a soft wrap selects the next line's start.
            // Native line-end motion preserves the first line's end affinity.
            if (canMoveNatively && caret.nativeColumnSeed) {
              for (let step = 0; step < caret.nativeColumnSeed.steps; step += 1) {
                nativeSelection?.modify('move', caret.nativeColumnSeed.direction, 'line');
              }
            } else if (canMoveNatively && caret.nativeLineEndFrom !== undefined) nativeSelection.modify('move', 'forward', 'lineboundary');
            snapTextareaSelection(target);
            selectionRef.current = readSelection(targetUnit.id, target);
            if (caret.y !== undefined) caretLineRef.current = { unitId: targetUnit.id, offset: target.selectionStart, y: caret.y };
          } finally { traversingRef.current = false; }
          return;
        }
        if (onBoundaryNavigate?.({ direction: event.key === 'ArrowDown' ? 'down' : event.key === 'ArrowUp' ? 'up'
          : event.key === 'ArrowRight' ? 'right' : 'left', columnX: vertical ? verticalColumnRef.current : null })) {
          event.preventDefault();
          caretLineRef.current = null;
          nativeLineTargetRef.current = null;
          return;
        }
      }
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const nextFlow = splitTextUnitForEnter(editableFlow, unit.id, textarea.selectionStart, textarea.selectionEnd);
      const currentIndex = nextFlow.units.findIndex((item) => item.id === unit.id);
      const nextUnit = nextFlow.units[currentIndex + 1];
      if (nextUnit) {
        pendingFocusRef.current = { unitId: nextUnit.id, caret: 0 };
        emitFlowChange(nextFlow, nextUnit.id, 0, textarea, { sync: true });
        focusTextUnit(nextUnit.id, 0);
      }
      return;
    }

    if (event.key === 'Backspace' && textarea.selectionStart === 0 && !hasSelection) {
      const currentIndex = editableFlow.units.findIndex((item) => item.id === unit.id);
      const previousUnit = editableFlow.units[currentIndex - 1];
      if (!previousUnit) return;
      event.preventDefault();
      const nextFlow = mergeTextUnitWithPrevious(editableFlow, unit.id);
      pendingFocusRef.current = { unitId: previousUnit.id, caret: previousUnit.text.length };
      emitFlowChange(nextFlow, previousUnit.id, previousUnit.text.length, textarea, { sync: true });
      focusTextUnit(previousUnit.id, previousUnit.text.length);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const nextFlow = event.shiftKey
        ? outdentTextUnit(editableFlow, unit.id)
        : indentTextUnit(editableFlow, unit.id);
      pendingFocusRef.current = { unitId: unit.id, caret: textarea.selectionStart };
      emitFlowChange(nextFlow, unit.id, textarea.selectionStart, textarea, { sync: true });
      focusTextUnit(unit.id, textarea.selectionStart);
    }
  };

  const handleUnitKeyUp = (unit: TextUnit, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (compositionRef.current || event.nativeEvent.isComposing) return;
    if (flowSelectionRef.current || documentSelection?.read()) return;
    if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Alt' || event.key === 'Shift') return;
    captureNativeCaretLine(unit.id, event.currentTarget);
    captureSelectionBoundary(unit.id, event.currentTarget);
    handleTextUnitSelection(unit, event.currentTarget);
  };

  const handleUnitMouseDown = (event: MouseEvent<HTMLTextAreaElement>) => {
    flowShiftClickRef.current = false;
    if (compositionRef.current) {
      if (event.shiftKey) event.preventDefault();
      return;
    }
    if (event.shiftKey && !readOnly) {
      const current = document.activeElement as HTMLTextAreaElement | null;
      if (current?.dataset.runtimeTextflowComposing === 'true') { event.preventDefault(); return; }
      const documentRange = documentSelection?.read();
      if (documentSelection && (documentRange || (current?.dataset.blockId && current.dataset.blockId !== blockId))) {
        const caret = textareaCaretAtPoint(event.currentTarget, event.clientX, event.clientY);
        const localAnchor = documentSelection.anchorFor(current?.dataset.blockId ?? '');
        const anchor = documentRange?.anchor ?? { blockId: current!.dataset.blockId!, ...(localAnchor ?? {
          unitId: current!.dataset.textUnitId!, offset: current!.selectionDirection === 'backward' ? current!.selectionEnd : current!.selectionStart }) };
        event.preventDefault();
        if (caret && documentSelection.select(anchor, { blockId, unitId: event.currentTarget.dataset.textUnitId!, offset: caret.offset })) onFlowSelectionStart?.();
        flowShiftClickRef.current = true;
        return;
      }
      const existing = flowSelectionRef.current;
      const sourceId = current?.dataset?.textUnitId;
      const targetId = event.currentTarget.dataset.textUnitId!;
      if (existing || (sourceId && current?.dataset.blockId === blockId && sourceId !== targetId)) {
        const offset = textareaCaretAtPoint(event.currentTarget, event.clientX, event.clientY);
        if (offset !== null) {
          event.preventDefault();
          const anchor = existing?.anchor ?? { unitId: sourceId!, offset: current!.selectionDirection === 'backward'
            ? current!.selectionEnd : current!.selectionStart };
          selectFlowRange(anchor, { unitId: targetId, offset: offset.offset });
          flowShiftClickRef.current = true;
          caretLineRef.current = { unitId: targetId, offset: offset.offset, y: offset.y };
          nativeLineTargetRef.current = null;
          verticalColumnRef.current = null;
          return;
        }
      }
    }
    documentSelection?.clear();
    clearFlowSelection();
    verticalColumnRef.current = null;
    caretLineRef.current = null;
    nativeLineTargetRef.current = { unitId: event.currentTarget.dataset.textUnitId!,
      y: (event.clientY - event.currentTarget.getBoundingClientRect().top) / getPageDisplayScale(event.currentTarget)
        + event.currentTarget.scrollTop };
    additiveSelectionSessionRef.current = event.ctrlKey || event.metaKey;
  };

  const handleAnnotationBadgeDragStart = (
    event: DragEvent<HTMLElement>,
    annotation: AnnotationTruthV1,
  ) => {
    event.stopPropagation();
    writeContentGroupDragPayload(event.dataTransfer, {
      kind: 'label',
      annotation_id: annotation.id,
      label: annotation.raw_label,
      ranges: annotation.ranges,
      text_preview: previewFromRanges(annotation.ranges),
      source_note_id: annotation.note_id,
    });
  };

  const handleDraftRangeDragStart = (event: DragEvent<HTMLElement>) => {
    event.stopPropagation();
    writeContentGroupDragPayload(event.dataTransfer, {
      kind: 'draft_range',
      ranges: draftAnnotationRanges,
      label: 'Draft range',
      text_preview: previewFromRanges(draftAnnotationRanges),
    });
  };

  const handleUnitMouseUp = (unit: TextUnit, event: MouseEvent<HTMLTextAreaElement>) => {
    if (compositionRef.current) return;
    if (flowSelectionRef.current || documentSelection?.read() || flowShiftClickRef.current) return;
    captureSelectionBoundary(unit.id, event.currentTarget);
    const additive = event.ctrlKey || event.metaKey || additiveSelectionSessionRef.current;
    const hasSelection = event.currentTarget.selectionStart !== event.currentTarget.selectionEnd;
    if (!hasSelection && draftAnnotationRanges.length === 0) {
      additiveSelectionSessionRef.current = false;
      return;
    }
    handleTextUnitSelection(unit, event.currentTarget, {
      additive: hasSelection ? additive : false,
      hitTestOnly: !hasSelection,
    });
    if (hasSelection) {
      clearNativeTextareaSelection(event.currentTarget);
    }
    additiveSelectionSessionRef.current = false;
  };

  const handleUnitPaste = (unit: TextUnit, event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (compositionRef.current) return;
    snapTextareaSelection(event.currentTarget);
    const pastedText = event.clipboardData.getData('text/plain');
    if (!pastedText) return;
    if (flowSelectionRef.current || documentSelection?.read()) {
      event.preventDefault();
      replaceSelection(pastedText, event.currentTarget);
      return;
    }
    if (!pastedText.includes('\n') && !/^(#{1,6}\s|[-*]\s|\d+[.)]\s|>\s?|\[ ?x? ?\])/i.test(pastedText.trim())) return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const nextFlow = pasteTextIntoTextFlow(editableFlow, unit.id, textarea.selectionStart, pastedText, textarea.selectionEnd);
    const pastedUnit = nextFlow.units[Math.min(nextFlow.units.length - 1, editableFlow.units.findIndex((item) => item.id === unit.id) + 1)]
      || nextFlow.units[0];
    pendingFocusRef.current = { unitId: pastedUnit.id, caret: pastedUnit.text.length };
    emitFlowChange(nextFlow, pastedUnit.id, pastedUnit.text.length, textarea);
  };

  const droppedTextFromEvent = (event: DragEvent<HTMLTextAreaElement>): string | null => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    if (!payload) return null;
    const text = plainTextFromContentGroupDragPayload(payload).trimEnd();
    return text.trim() ? text : null;
  };

  const handleUnitDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    if (!hasContentGroupDragPayloadType(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleUnitDrop = (unit: TextUnit, event: DragEvent<HTMLTextAreaElement>) => {
    if (compositionRef.current) return;
    const droppedText = droppedTextFromEvent(event);
    if (!droppedText) return;
    event.preventDefault();
    event.stopPropagation();
    const textarea = event.currentTarget;
    const offset = textareaOffsetFromPoint(textarea, { x: event.clientX, y: event.clientY });
    const nextFlow = insertPlainTextIntoTextFlow(editableFlow, unit.id, offset, droppedText);
    const targetUnit = nextFlow.units.find((item) => item.id === unit.id) || nextFlow.units[0];
    const nextCaret = snapGraphemeOffset(targetUnit?.text ?? '', offset + droppedText.length);
    if (targetUnit) {
      pendingFocusRef.current = { unitId: targetUnit.id, caret: nextCaret };
      emitFlowChange(nextFlow, targetUnit.id, nextCaret, textarea, { sync: true });
      focusTextUnit(targetUnit.id, nextCaret);
    }
          window.setTimeout(async () => {
            const outcome = await onSave(true, undefined, nextFlow);
            if (outcome.status !== 'saved') return;
          }, 0);
  };

  const textUnitMenu: CommandSurfaceMenu | null = textUnitContextMenu && !readOnly ? {
    id: `text-unit-menu-${textUnitContextMenu.unitId}`,
    kind: 'text_unit_handle',
    point: textUnitContextMenu.point,
    title: 'Text unit',
    items: buildTextUnitHandleMenu(),
  } : null;
  const unitHandleDrag = useTextUnitHandleDrag({
    editorRef,
    disabled: readOnly || layoutMode,
    isComposing: () => compositionRef.current,
    onExtract: onExtractTextUnit,
    onMove: onMoveTextUnit,
    onCrossBlockTargetChange: onUnitDropTargetChange,
    onReorder: (unitId, target) => {
      const current = latestFlowRef.current || editableFlow;
      const next = reorderTextUnit(current, unitId, target.unitId, target.edge);
      if (next === current) return;
      documentSelection?.clear();
      setTextUnitContextMenu(null);
      const textarea = unitRefs.current[unitId];
      const caret = textarea?.selectionStart ?? 0;
      pendingFocusRef.current = { unitId, caret };
      emitFlowChange(next, unitId, caret, textarea, { sync: true });
    },
  });
  const documentRangeForDisplay = documentSelection?.ordered();
  const handleDropTarget = unitDropTarget ?? unitHandleDrag.dropTarget;
  const documentBlockForDisplay = documentRangeForDisplay?.blocks.find((entry) => entry.block.id === blockId);

  return (
    <>
    <div ref={editorRef} className={styles.textUnitEditor} data-text-unit-editor={blockId}
      data-text-unit-move-enabled={Boolean(onMoveTextUnit) && !readOnly && !layoutMode}>
      {visibleUnitEntries(editableFlow.units).map(({ unit, index }) => {
        const marker = textUnitMarkerForDisplay(editableFlow.units, index);
        const hasMarker = marker.length > 0;
        const unitAnnotations = activeAnnotations.filter((annotation) => (
          annotationRangesForTextUnit({
            annotation,
            blockId,
            textUnitId: unit.id,
          }).length > 0
        ));
        const draftAnnotation: AnnotationTruthV1 | null = draftAnnotationRanges.some((range) => (
          annotationRangeIsRenderable(range)
          && range.block_id === blockId
          && range.text_unit_id === unit.id
          && (range.target_kind === 'text_span' || range.target_kind === 'text_unit')
        )) ? {
            id: 'annotation-draft-preview',
            note_id: '',
            canvas_id: '',
            raw_label: 'Draft',
            ranges: draftAnnotationRanges,
            parent_annotation_id: null,
            child_annotation_ids: [],
            visual_style: {
              color_token: 'annotation-draft',
              marker_kind: 'highlight',
            },
            created_by: 'human',
            status: 'active',
            created_at: '',
            updated_at: '',
          } : null;
        const highlightAnnotations = draftAnnotation
          ? [...(showLabelOverlay ? annotations : []), draftAnnotation]
          : (showLabelOverlay ? annotations : []);
        const highlightSelectedAnnotationIds = draftAnnotation
          ? [...selectedAnnotationIds, draftAnnotation.id]
          : selectedAnnotationIds;
        const parentAnnotationBadges = parentAnnotationBadgesForTextUnit({
          annotations: activeAnnotations,
          blockId,
          textUnitId: unit.id,
        });
        const annotationById = new Map(activeAnnotations.map((annotation) => [annotation.id, annotation]));
        const childAnnotationBadges = childAnnotationBadgesForTextUnit({
          annotations: activeAnnotations,
          blockId,
          textUnitId: unit.id,
        });
        const highlightSegments = createAnnotationRenderSegments({
          text: unit.text,
          annotations: highlightAnnotations,
          blockId,
          textUnitId: unit.id,
          selectedAnnotationIds: highlightSelectedAnnotationIds,
        });
        const hasInlineHighlights = highlightSegments.some((segment) => segment.annotationIds.length > 0);
        const hasFullUnitAnnotation = unitAnnotations.some((annotation) => (
          annotationRangesForTextUnit({
            annotation,
            blockId,
            textUnitId: unit.id,
          }).some((range) => range.target_kind === 'text_unit')
        ));
        const hasSelectedFullUnitAnnotation = selectedAnnotationIds.some((id) => (
          unitAnnotations.some((annotation) => (
            annotation.id === id
            && annotationRangesForTextUnit({
              annotation,
              blockId,
              textUnitId: unit.id,
            }).some((range) => range.target_kind === 'text_unit')
          ))
        ));
        const roleTextClassNames = [
          unit.writing_role === 'heading' ? styles.headingTextArea : '',
          unit.writing_role === 'quote' ? styles.quoteTextArea : '',
          unit.writing_role === 'code_line' ? styles.codeTextArea : '',
        ].filter(Boolean);
        const hasDraftRange = Boolean(draftAnnotation);
        return (
          <div
            key={unit.id}
            data-text-unit-row={unit.id}
            data-text-unit-dragging={unitHandleDrag.draggingUnitId === unit.id || undefined}
            className={[
              styles.textUnitRow,
              unit.writing_role === 'heading' ? styles.textUnitHeadingRow : '',
              hasFullUnitAnnotation ? styles.textUnitAnnotated : '',
              hasSelectedFullUnitAnnotation ? styles.textUnitAnnotationSelected : '',
              hasDraftRange ? styles.textUnitDraftRange : '',
              parentAnnotationBadges.length > 0 || childAnnotationBadges.length > 0 ? styles.textUnitRowWithAnnotationBadge : '',
            ].filter(Boolean).join(' ')}
            style={{ '--text-unit-indent': unit.indent_level } as CSSProperties}
          >
            <TextUnitGutterLayer
              unitId={unit.id}
              role={unit.writing_role}
              disabled={readOnly || layoutMode}
              menuOpen={textUnitContextMenu?.unitId === unit.id}
              onPointerDown={(event) => unitHandleDrag.start(unit.id, event)}
              onClickMenu={(point) => {
                if (unitHandleDrag.canOpenMenu()) setTextUnitContextMenu({ unitId: unit.id, point });
              }}
              onOpenMenu={layoutMode ? undefined : (point) => setTextUnitContextMenu({ unitId: unit.id, point })}
            />
            {handleDropTarget?.unitId === unit.id && (
              <div
                className={styles.textUnitDropIndicator}
                data-text-unit-drop-indicator={unit.id}
                data-drop-edge={handleDropTarget.edge}
                aria-hidden="true"
              />
            )}
            <div className={styles.textUnitLine}>
              {unit.writing_role === 'todo_item' && (
                <input
                  type="checkbox"
                  className={styles.textUnitTodoCheckbox}
                  checked={unit.metadata.checked === true}
                  onMouseDown={(event) => event.preventDefault()}
                  onChange={() => handleToggleTodo(unit)}
                  aria-label="Toggle todo item"
                />
              )}
              {unit.writing_role === 'toggle_item' && (
                <button
                  type="button"
                  className={styles.textUnitMarkerButton}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToggleCollapsed(unit)}
                  aria-label={unit.metadata.collapsed === true ? 'Expand toggle item' : 'Collapse toggle item'}
                >
                  {unit.metadata.collapsed === true ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              {hasMarker && unit.writing_role !== 'todo_item' && unit.writing_role !== 'toggle_item' && (
                <span className={styles.textUnitMarker}>{marker}</span>
              )}
              <div
                className={[
                  styles.textUnitTextAreaWrap,
                  hasMarker ? styles.textUnitTextAreaWrapWithMarker : '',
                ].filter(Boolean).join(' ')}
              >
                {hasInlineHighlights && (
                  <div
                    className={[
                      styles.pageTextArea,
                      styles.textUnitAnnotationTextLayer,
                      ...roleTextClassNames,
                    ].filter(Boolean).join(' ')}
                    aria-hidden="true"
                  >
                    {highlightSegments.map((segment, segmentIndex) => (
                      segment.annotationIds.length > 0 ? (() => {
                        const segmentAnnotations = segment.annotationIds
                          .map((annotationId) => annotationById.get(annotationId))
                          .filter((annotation): annotation is AnnotationTruthV1 => Boolean(annotation));
                        const childAnnotations = segment.childAnnotationIds
                          .map((annotationId) => annotationById.get(annotationId))
                          .filter((annotation): annotation is AnnotationTruthV1 => Boolean(annotation));
                        const parentAnnotations = segmentAnnotations.filter((annotation) => (
                          !isChildAnnotation(annotation, activeAnnotations)
                          && annotation.id !== 'annotation-draft-preview'
                        ));
                        const parentColor = annotationColorForToken(
                          (parentAnnotations[0] || childAnnotations[0])?.visual_style.color_token,
                        );
                        const childColor = annotationColorForToken(childAnnotations[0]?.visual_style.color_token);
                        return (
                        <mark
                          key={`${unit.id}-annotation-highlight-${segmentIndex}`}
                          className={[
                            styles.textUnitAnnotationSpan,
                            segment.annotationIds.length > 1 ? styles.textUnitAnnotationSpanStacked : '',
                            segment.childAnnotationIds.length > 0 ? styles.textUnitAnnotationSpanChild : '',
                            segment.selected ? styles.textUnitAnnotationSpanSelected : '',
                            segment.annotationIds.includes('annotation-draft-preview') ? styles.textUnitAnnotationSpanDraft : '',
                          ].filter(Boolean).join(' ')}
                          style={{
                            '--annotation-parent-bg': parentColor.background,
                            '--annotation-parent-accent': parentColor.accent,
                            '--annotation-child-bg': childColor.background,
                            '--annotation-child-accent': childColor.accent,
                          } as CSSProperties}
                          data-child-label={segment.childLabels[0] || undefined}
                        >
                          {segment.text}
                        </mark>
                        );
                      })() : (
                        <span key={`${unit.id}-annotation-plain-${segmentIndex}`}>{segment.text}</span>
                      )
                    ))}
                  </div>
                )}
                <textarea
                  ref={(node) => {
                    unitRefs.current[unit.id] = node;
                    if (index === 0) assignRef(textareaRef, node);
                  }}
                  className={[
                    styles.pageTextArea,
                    styles.textUnitTextArea,
                    ...roleTextClassNames,
                  ].filter(Boolean).join(' ')}
                  value={unit.text}
                  readOnly={readOnly}
                  onFocus={(event) => {
                    if (!traversingRef.current) {
                      verticalColumnRef.current = null;
                      caretLineRef.current = null;
                    }
                    selectionRef.current = readSelection(unit.id, event.currentTarget);
                    if (!readOnly && !compositionRef.current) onTextEditBoundary?.('focus', selectionRef.current);
                    onFocused({ blockId, textFlowId, textUnitId: unit.id });
                  }}
                  onChange={readOnly
                    ? undefined
                    : (event) => handleUnitTextChange(unit, event.currentTarget.value, event.currentTarget,
                      (event.nativeEvent as InputEvent).inputType, (event.nativeEvent as InputEvent).isComposing,
                      (event.nativeEvent as InputEvent).data)}
                  onSelect={(event) => {
                    if (compositionRef.current || flowSelectionRef.current || documentSelection?.read()) return;
                    captureNativeCaretLine(unit.id, event.currentTarget);
                    captureSelectionBoundary(unit.id, event.currentTarget);
                    handleTextUnitSelection(unit, event.currentTarget, {
                      preserveDraft: additiveSelectionSessionRef.current,
                    });
                  }}
                  onCompositionStart={readOnly ? undefined : (event) => {
                    documentSelection?.clear();
                    clearFlowSelection();
                    verticalColumnRef.current = null;
                    caretLineRef.current = null;
                    nativeLineTargetRef.current = null;
                    const selection = readSelection(unit.id, event.currentTarget);
                    selectionRef.current = selection;
                    beforeInputRef.current = { selection, inputType: 'insertCompositionText' };
                    compositionRef.current = true;
                    event.currentTarget.dataset.runtimeTextflowComposing = 'true';
                    onTextEditBoundary?.('compositionStart', selection);
                  }}
                  onCompositionEnd={readOnly ? undefined : (event) => {
                    // Browser engines may deliver the final input on either side of
                    // compositionend. Publish its complete DOM value before sealing;
                    // an identical trailing input is ignored by handleUnitTextChange.
                    handleUnitTextChange(unit, event.currentTarget.value, event.currentTarget, 'insertCompositionText', true);
                    compositionRef.current = false;
                    event.currentTarget.dataset.runtimeTextflowComposing = 'false';
                    snapTextareaSelection(event.currentTarget);
                    const selection = readSelection(unit.id, event.currentTarget);
                    onTextEditBoundary?.('compositionEnd', selection);
                    if (deferredBlurRef.current) {
                      deferredBlurRef.current = false;
                      saveAfterBlur(selection);
                    }
                  }}
                  onMouseDown={handleUnitMouseDown}
                  onMouseUp={(event) => handleUnitMouseUp(unit, event)}
                  onKeyUp={(event) => handleUnitKeyUp(unit, event)}
                  onContextMenu={(event) => handleTextUnitContextMenu(unit, event)}
                  onBlur={readOnly ? undefined : (event) => {
                    if (!documentSelection?.traversing.current) documentSelection?.clear();
                    if (!traversingRef.current) verticalColumnRef.current = null;
                    if (!traversingRef.current) clearFlowSelection();
                    if (compositionRef.current) {
                      deferredBlurRef.current = true;
                      return;
                    }
                    saveAfterBlur(readSelection(unit.id, event.currentTarget));
                  }}
                  onKeyDown={readOnly ? undefined : (event) => handleUnitKeyDown(unit, event)}
                  onPaste={readOnly ? undefined : (event) => handleUnitPaste(unit, event)}
                  onCopy={(event) => copyFlowRange(event, false)}
                  onCut={(event) => copyFlowRange(event, true)}
                  onDragOver={readOnly ? undefined : handleUnitDragOver}
                  onDrop={readOnly ? undefined : (event) => handleUnitDrop(unit, event)}
                  data-block-id={blockId}
                  data-text-flow-id={textFlowId}
                  data-text-unit-id={unit.id}
                  data-text-unit-text={unit.text}
                  data-runtime-textflow-editor={!readOnly || onTextEditBoundary ? 'true' : undefined}
                  rows={1}
                />
                {(flowSelection || documentSelection?.selection) && (() => {
                  const selection = documentBlockForDisplay?.selection ?? flowSelection;
                  if (!selection) return null;
                  const ordered = orderedFlowSelection(editableFlow, selection);
                  if (!ordered || index < ordered.startIndex || index > ordered.endIndex) return null;
                  return <TextFlowSelectionLayer textarea={unitRefs.current[unit.id]}
                    start={index === ordered.startIndex ? ordered.start.offset : 0}
                    end={index === ordered.endIndex ? ordered.end.offset : unit.text.length}
                    includeBreak={index < ordered.endIndex || Boolean(documentBlockForDisplay && documentRangeForDisplay?.end.blockId !== blockId)} />;
                })()}
                {parentAnnotationBadges.map(({ annotation }, badgeIndex) => {
                  const annotationBadgeAnchor = annotationBadgeAnchors[annotation.id];
                  const annotationColor = annotationColorForToken(annotation.visual_style.color_token);
                  return (
                    <button
                      key={annotation.id}
                      type="button"
                      draggable
                      className={[
                        styles.textUnitAnnotationBadge,
                        selectedAnnotationIds.includes(annotation.id) ? styles.textUnitAnnotationBadgeSelected : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        '--annotation-badge-left': `${annotationBadgeAnchor?.left ?? 0}px`,
                        '--annotation-badge-top': `${(annotationBadgeAnchor?.top ?? -13) + (badgeIndex % 2) * 11}px`,
                        '--annotation-badge-accent': annotationColor.accent,
                        '--annotation-badge-bg': annotationColor.badgeBackground,
                        '--annotation-badge-text': annotationColor.text,
                      } as CSSProperties}
                      onMouseDown={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleAnnotationBadgeDragStart(event, annotation)}
                      onClick={() => onAnnotationSelect(annotation.id)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onAnnotationContextMenu(annotation.id, { x: event.clientX, y: event.clientY });
                      }}
                      title={annotation.raw_label}
                      aria-label={`Inspect annotation ${annotation.raw_label}`}
                    >
                      {annotation.raw_label}
                    </button>
                  );
                })}
                {childAnnotationBadges.map(({ annotation }) => {
                  const childAnchor = childAnnotationBadgeAnchors[annotation.id];
                  const childColor = annotationColorForToken(annotation.visual_style.color_token);
                  return (
                    <button
                      key={annotation.id}
                      type="button"
                      draggable
                      className={[
                        styles.textUnitChildAnnotationBadge,
                        selectedAnnotationIds.includes(annotation.id) ? styles.textUnitChildAnnotationBadgeSelected : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        '--annotation-badge-left': `${childAnchor?.left ?? 0}px`,
                        '--annotation-badge-top': `${childAnchor?.top ?? -13}px`,
                        '--annotation-badge-accent': childColor.accent,
                        '--annotation-badge-bg': childColor.badgeBackground,
                        '--annotation-badge-text': childColor.text,
                      } as CSSProperties}
                      onMouseDown={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleAnnotationBadgeDragStart(event, annotation)}
                      onClick={() => onAnnotationSelect(annotation.id)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onAnnotationContextMenu(annotation.id, { x: event.clientX, y: event.clientY });
                      }}
                      title={annotation.raw_label}
                      aria-label={`Inspect child annotation ${annotation.raw_label}`}
                    >
                      {annotation.raw_label}
                    </button>
                  );
                })}
                {hasDraftRange && (
                  <div
                    role="button"
                    tabIndex={0}
                    className={styles.textUnitDraftRangeBadge}
                    data-selection-draft-handle="true"
                    draggable
                    onPointerDownCapture={(event) => {
                      event.stopPropagation();
                    }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                    onMouseUp={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDragStart={handleDraftRangeDragStart}
                    style={{
                      '--draft-range-badge-left': `${draftRangeBadgeAnchors[unit.id]?.left ?? 0}px`,
                      '--draft-range-badge-top': `${draftRangeBadgeAnchors[unit.id]?.top ?? -20}px`,
                    } as CSSProperties}
                    title="Drag selected range into a content group"
                    aria-label="Drag selected range"
                    >
                    <span className={styles.textUnitDraftRangeBadgeIcon}>
                      <Move size={11} aria-hidden="true" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    <ContextMenuLayer
      menu={textUnitMenu}
      onClose={() => setTextUnitContextMenu(null)}
      onAction={(actionId) => handleTextUnitMenuAction(actionId)}
    />
    </>
  );
}
