import {
  ChevronDown,
  ChevronRight,
  Move,
} from 'lucide-react';
import { flushSync } from 'react-dom';
import {
  useEffect,
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
import type { BlockPresentationKind } from '../blockContentService';
import { resizeTextareaToContent } from '../measurementService';
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
  textFlowIdForBlock,
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
  splitTextUnitAtOffset,
  splitTextUnitForEnter,
  textUnitMarkerForDisplay,
  updateTextUnitMetadata,
} from '../textUnitEditorService';
import { TextUnitGutterLayer } from '../layers/TextUnitGutterLayer';
import {
  hasContentGroupDragPayloadType,
  plainTextFromContentGroupDragPayload,
  readContentGroupDragPayload,
  writeContentGroupDragPayload,
} from '../contentGroupDragService';
import styles from '../../NoteDetail.module.css';

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
  onFocused: () => void;
  onAnnotationSelect: (annotationId: string) => void;
  onAnnotationContextMenu: (annotationId: string, point: { x: number; y: number }) => void;
  onTextUnitSelection: (selection: CapturedSelectionRange, anchorRect: DOMRect, options?: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean }) => void;
  onTextUnitContextMenu: (selection: CapturedSelectionRange, anchorRect: DOMRect, point: { x: number; y: number }) => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onTextFlowChange: (textFlow: TextBlockContentV1) => void;
  onSave: (silent?: boolean, fieldValues?: undefined, textFlow?: TextBlockContentV1) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
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
  const safeOffset = clampNumber(offset, 0, textarea.value.length);
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

  const characters = textarea.value.split('');
  const markers: HTMLSpanElement[] = [];
  characters.forEach((character, index) => {
    const marker = document.createElement('span');
    marker.textContent = character || '\u200b';
    marker.dataset.offset = String(index);
    mirror.appendChild(marker);
    markers.push(marker);
  });
  const endMarker = document.createElement('span');
  endMarker.textContent = '\u200b';
  endMarker.dataset.offset = String(characters.length);
  mirror.appendChild(endMarker);
  markers.push(endMarker);

  document.body.appendChild(mirror);
  const textareaRect = textarea.getBoundingClientRect();
  const localPoint = {
    x: point.x - textareaRect.left + textarea.scrollLeft,
    y: point.y - textareaRect.top + textarea.scrollTop,
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
  return clampNumber(bestOffset, 0, textarea.value.length);
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
  onSave,
  onKeyDown,
}: TextBlockProjectionProps) {
  const unitRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingFocusRef = useRef<{ unitId: string; caret: number } | null>(null);
  const latestFlowRef = useRef<TextBlockContentV1 | null>(null);
  const additiveSelectionSessionRef = useRef(false);
  const [annotationBadgeAnchors, setAnnotationBadgeAnchors] = useState<Record<string, { left: number; top: number }>>({});
  const [childAnnotationBadgeAnchors, setChildAnnotationBadgeAnchors] = useState<Record<string, { left: number; top: number }>>({});
  const [draftRangeBadgeAnchors, setDraftRangeBadgeAnchors] = useState<Record<string, { left: number; top: number }>>({});
  const [textUnitContextMenu, setTextUnitContextMenu] = useState<{
    unitId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [selectedTextUnitIds, setSelectedTextUnitIds] = useState<string[]>([]);
  const editableFlow = useMemo(
    () => alignFlowWithText(text, textFlow, presentationKind),
    [presentationKind, text, textFlow],
  );
  const textFlowId = textFlowIdForBlock(blockId);
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

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedTextUnitIds([]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const focusTextUnit = (unitId: string, caret: number) => {
    const node = unitRefs.current[unitId];
    if (!node) return;
    const nextCaret = Math.min(caret, node.value.length);
    node.focus({ preventScroll: true });
    node.selectionStart = nextCaret;
    node.selectionEnd = nextCaret;
    resizeTextareaToContent(node);
  };

  useLayoutEffect(() => {
    latestFlowRef.current = editableFlow;
    const focusTarget = pendingFocusRef.current;
    Object.values(unitRefs.current).forEach(resizeTextareaToContent);
    if (!focusTarget) return;
    pendingFocusRef.current = null;

    const focusTextarea = () => focusTextUnit(focusTarget.unitId, focusTarget.caret);

    focusTextarea();
    const animationFrameId = window.requestAnimationFrame(focusTextarea);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [editableFlow]);

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
    options: { sync?: boolean } = {},
  ) => {
    latestFlowRef.current = nextFlow;
    const projection = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: nextFlow }, text);
    const publish = () => {
      onTextFlowChange(nextFlow);
      onTextChange(projection.plain_text, globalCaretForUnit(nextFlow.units, unitId, caret), anchorElement);
    };
    if (options.sync) {
      flushSync(publish);
      return;
    }
    publish();
  };

  const handleUnitTextChange = (unit: TextUnit, value: string, caret: number, textarea: HTMLTextAreaElement) => {
    resizeTextareaToContent(textarea);
    const nextFlow = {
      ...editableFlow,
      units: editableFlow.units.map((item) => (
        item.id === unit.id ? { ...item, text: value } : item
      )),
    };
    emitFlowChange(nextFlow, unit.id, caret, textarea);
  };

  const handleTextUnitSelection = (
    unit: TextUnit,
    textarea: HTMLTextAreaElement,
    options: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean } = {},
  ) => {
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

  const handleToggleTextUnitRowSelection = (unit: TextUnit) => {
    setSelectedTextUnitIds((current) => {
      if (current.includes(unit.id)) return current.filter((id) => id !== unit.id);
      return [...current, unit.id];
    });
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

  const handleInsertBelow = (unit: TextUnit) => {
    const split = splitTextUnitAtOffset(editableFlow, unit.id, unit.text.length);
    const inserted = split.units[split.units.findIndex((item) => item.id === unit.id) + 1];
    const nextFlow = setTextUnitWritingRole(split, inserted.id, 'paragraph');
    pendingFocusRef.current = { unitId: inserted.id, caret: 0 };
    emitFlowChange(nextFlow, inserted.id, 0, unitRefs.current[unit.id], { sync: true });
    focusTextUnit(inserted.id, 0);
  };

  const handleSetRole = (unit: TextUnit, role: TextUnitWritingRole) => {
    const nextFlow = setTextUnitWritingRole(editableFlow, unit.id, role);
    pendingFocusRef.current = { unitId: unit.id, caret: unit.text.length };
    emitFlowChange(nextFlow, unit.id, unit.text.length, unitRefs.current[unit.id]);
  };

  const handleTextUnitMenuAction = (actionId: CommandActionId) => {
    const unit = editableFlow.units.find((item) => item.id === textUnitContextMenu?.unitId);
    if (!unit) return;
    const role = WRITING_ROLE_BY_COMMAND[actionId];
    if (role) {
      handleSetRole(unit, role);
      return;
    }
    if (actionId === 'label_text_unit') {
      handleAnnotateTextUnit(unit);
    }
  };

  const handleToggleTodo = (unit: TextUnit) => {
    const textarea = unitRefs.current[unit.id];
    const caret = textarea?.selectionStart ?? unit.text.length;
    const nextFlow = updateTextUnitMetadata(editableFlow, unit.id, {
      checked: unit.metadata.checked !== true,
    });
    pendingFocusRef.current = { unitId: unit.id, caret };
    emitFlowChange(nextFlow, unit.id, caret, textarea);
  };

  const handleToggleCollapsed = (unit: TextUnit) => {
    const textarea = unitRefs.current[unit.id];
    const caret = textarea?.selectionStart ?? unit.text.length;
    const nextFlow = updateTextUnitMetadata(editableFlow, unit.id, {
      collapsed: unit.metadata.collapsed !== true,
    });
    pendingFocusRef.current = { unitId: unit.id, caret };
    emitFlowChange(nextFlow, unit.id, caret, textarea);
  };

  const handleUnitKeyDown = (unit: TextUnit, event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown(event);
    if (event.defaultPrevented) return;

    const textarea = event.currentTarget;
    const hasSelection = textarea.selectionStart !== textarea.selectionEnd;

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const nextFlow = splitTextUnitForEnter(editableFlow, unit.id, textarea.selectionStart);
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
    if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Alt' || event.key === 'Shift') return;
    handleTextUnitSelection(unit, event.currentTarget);
  };

  const handleUnitMouseDown = (event: MouseEvent<HTMLTextAreaElement>) => {
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
    const pastedText = event.clipboardData.getData('text/plain');
    if (!pastedText) return;
    if (!pastedText.includes('\n') && !/^(#{1,6}\s|[-*]\s|\d+[.)]\s|>\s?|\[ ?x? ?\])/i.test(pastedText.trim())) return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const nextFlow = pasteTextIntoTextFlow(editableFlow, unit.id, textarea.selectionStart, pastedText);
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
    const droppedText = droppedTextFromEvent(event);
    if (!droppedText) return;
    event.preventDefault();
    event.stopPropagation();
    const textarea = event.currentTarget;
    const offset = textareaOffsetFromPoint(textarea, { x: event.clientX, y: event.clientY });
    const nextFlow = insertPlainTextIntoTextFlow(editableFlow, unit.id, offset, droppedText);
    const targetUnit = nextFlow.units.find((item) => item.id === unit.id) || nextFlow.units[0];
    const nextCaret = Math.min(offset + droppedText.length, targetUnit?.text.length || 0);
    if (targetUnit) {
      pendingFocusRef.current = { unitId: targetUnit.id, caret: nextCaret };
      emitFlowChange(nextFlow, targetUnit.id, nextCaret, textarea, { sync: true });
      focusTextUnit(targetUnit.id, nextCaret);
    }
    window.setTimeout(() => onSave(true, undefined, nextFlow), 0);
  };

  const textUnitMenu: CommandSurfaceMenu | null = textUnitContextMenu && !readOnly ? {
    id: `text-unit-menu-${textUnitContextMenu.unitId}`,
    kind: 'text_unit_handle',
    point: textUnitContextMenu.point,
    title: 'Text unit',
    items: buildTextUnitHandleMenu(),
  } : null;

  return (
    <>
    <div className={styles.textUnitEditor}>
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
            className={[
              styles.textUnitRow,
              unit.writing_role === 'heading' ? styles.textUnitHeadingRow : '',
              hasFullUnitAnnotation ? styles.textUnitAnnotated : '',
              hasSelectedFullUnitAnnotation ? styles.textUnitAnnotationSelected : '',
              hasDraftRange ? styles.textUnitDraftRange : '',
              selectedTextUnitIds.includes(unit.id) ? styles.textUnitRowSelected : '',
              parentAnnotationBadges.length > 0 || childAnnotationBadges.length > 0 ? styles.textUnitRowWithAnnotationBadge : '',
            ].filter(Boolean).join(' ')}
            style={{ '--text-unit-indent': unit.indent_level } as CSSProperties}
          >
            <TextUnitGutterLayer
              role={unit.writing_role}
              selected={selectedTextUnitIds.includes(unit.id)}
              onToggleRowSelection={() => handleToggleTextUnitRowSelection(unit)}
              onInsertBelow={() => handleInsertBelow(unit)}
              onSetRole={(role) => handleSetRole(unit, role)}
              onAnnotateUnit={() => handleAnnotateTextUnit(unit)}
              onOpenMenu={layoutMode ? undefined : (point) => setTextUnitContextMenu({ unitId: unit.id, point })}
            />
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
                  onFocus={onFocused}
                  onChange={readOnly
                    ? undefined
                    : (event) => handleUnitTextChange(unit, event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget)}
                  onSelect={(event) => handleTextUnitSelection(unit, event.currentTarget, {
                    preserveDraft: additiveSelectionSessionRef.current,
                  })}
                  onMouseDown={handleUnitMouseDown}
                  onMouseUp={(event) => handleUnitMouseUp(unit, event)}
                  onKeyUp={(event) => handleUnitKeyUp(unit, event)}
                  onContextMenu={(event) => handleTextUnitContextMenu(unit, event)}
                  onBlur={readOnly ? undefined : () => onSave(true, undefined, latestFlowRef.current || editableFlow)}
                  onKeyDown={readOnly ? undefined : (event) => handleUnitKeyDown(unit, event)}
                  onPaste={readOnly ? undefined : (event) => handleUnitPaste(unit, event)}
                  onDragOver={readOnly ? undefined : handleUnitDragOver}
                  onDrop={readOnly ? undefined : (event) => handleUnitDrop(unit, event)}
                  data-block-id={blockId}
                  data-text-flow-id={textFlowId}
                  data-text-unit-id={unit.id}
                  data-text-unit-text={unit.text}
                  rows={1}
                />
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
