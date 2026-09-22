import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from 'react';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import { nextGraphemeOffset, previousGraphemeOffset, snapGraphemeOffset } from '../../../../../../shared/graphemes';
import type { TextBlockProjectionProps } from './TextBlockProjection';
import type { DocumentTypographyProfile } from '../types';
import type { TextBlockContentV1, AnnotationTruthV1 } from '../runtimeDataTypes';
import type { TextFlowEditMetadata, TextFlowEditSelection } from '../textFlowEditSession';
import type { FlowPoint, FlowSelection } from '../textFlowSelection';
import { flowSelectionText, orderedFlowSelection, replaceFlowSelection } from '../textFlowSelection';
import { DocumentTextFlowSelectionContext } from '../hooks/useDocumentTextFlowSelection';
import { logicalSliceSelection, pageSliceForCaret, paginateTextFlowSlices, replaceSliceText, type PaginatedTextSlice, type PositionedPageFlowFragment } from '../paginationEditingService';
import { typographyTextCssProperties, typographyTextMetrics } from '../typographyMeasurementService';
import { measureTextareaNavigation, textareaBoundaryCaret, textareaCaretAtPoint, textareaLineCaret } from '../textareaNavigation';
import { replaceTextUnitText } from '../textFlowService';
import { deriveSingleTextEditDelta } from '../rangeRebaseService';
import { indentTextUnit, mergeTextUnitWithPrevious, outdentTextUnit, parseTextUnitsFromPlainText, pasteTextIntoTextFlow, setTextUnitWritingRole, splitTextUnitForEnter, textUnitMarkerForDisplay, updateTextUnitMetadata } from '../textUnitEditorService';
import { TextFlowSelectionLayer } from './TextFlowSelectionLayer';
import { InlineLinkTextLayer } from './InlineLinkTextLayer';
import { inlineLinksForUnit } from '../inlineLinkService';
import { TextUnitGutterLayer } from '../layers/TextUnitGutterLayer';
import { useTextUnitHandleDrag } from '../hooks/useTextUnitHandleDrag';
import { reorderTextUnit } from '../textUnitOrderService';
import { buildTextUnitHandleMenu, WRITING_ROLE_BY_COMMAND, type CommandActionId } from '../commandSurfaceService';
import { ContextMenuLayer } from '../layers/ContextMenuLayer';
import { createAnnotationRenderSegments } from '../annotationRenderService';
import { annotationColorForToken } from '../annotationColorService';
import { useAnnotationStampLayout } from '../annotationStampLayout';
import { imageOnlyClipboardFile } from '../mediaBlockPasteService';
import { hasContentGroupDragPayloadType, plainTextFromContentGroupDragPayload, readContentGroupDragPayload, writeContentGroupDragPayload } from '../contentGroupDragService';
import type { TextFlowBoundaryNavigationRequest } from '../textFlowBlockNavigation';
import styles from '../../NoteDetail.module.css';
import { headingLevelForRole, type HeadingTextFlowStructureRequest } from '../headingRoleService';
import { applyHeadingInputAtLine, headingStructureRequestForEdit, normalizeHeadingTextFlow } from '../headingInputService';

export interface PaginatedTextBlockProjectionProps extends TextBlockProjectionProps {
  fragments: PositionedPageFlowFragment[];
  typography: DocumentTypographyProfile;
}

/** One logical editor owns all page projections, selection and composition. */
export function PaginatedTextBlockProjection(props: PaginatedTextBlockProjectionProps) {
  const { blockId, readOnly, textFlow, text, fragments, typography, textareaRef, layoutMode = false } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  useAnnotationStampLayout(editorRef);
  const documentSelection = useContext(DocumentTextFlowSelectionContext);
  const flow = useMemo<TextBlockContentV1>(() => textFlow ?? ({ textflow_version: 'TextBlockContentV1',
    units: parseTextUnitsFromPlainText(text), inline_structures: [], metadata: {} }), [textFlow, text]);
  const latestFlow = useRef(flow);
  const renderedFlow = useRef(flow);
  const focused = useRef(false);
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const selectionRef = useRef<TextFlowEditSelection | null>(null);
  const pendingFocus = useRef<FlowPoint | null>(null);
  const traversing = useRef(false);
  const column = useRef<number | null>(null);
  const caretLine = useRef<{ key: string; offset: number; y: number } | null>(null);
  const nativeLineTarget = useRef<{ key: string; y: number } | null>(null);
  const localRangeRef = useRef<FlowSelection | null>(null);
  const [localRange, setLocalRange] = useState<FlowSelection | null>(null);
  const composition = useRef<{ key: string; slices: PaginatedTextSlice[]; originalText: string; value: string } | null>(null);
  const compositionTail = useRef<{ unitId: string; value: string; selection: TextFlowEditSelection } | null>(null);
  const deferredBlur = useRef(false);
  const [compositionRevision, renderComposition] = useState(0);
  const beforeInput = useRef<{ selection: TextFlowEditSelection; inputType: string; data: string | null } | null>(null);
  const [menu, setMenu] = useState<{ unitId: string; point: { x: number; y: number } } | null>(null);
  const derivedSlices = useMemo(() => paginateTextFlowSlices(flow, fragments), [flow, fragments]);
  const slices = composition.current?.slices ?? derivedSlices;
  const geometrySignature = slices.map((slice) => `${slice.key}:${slice.start}:${slice.end}:${slice.displayEnd}:${slice.left}:${slice.top}:${slice.width}:${slice.height}`).join('|');
  const renderedGeometry = useRef(geometrySignature);
  const textFlowId = textFlowIdForBlock(blockId);
  const clearRange = () => { localRangeRef.current = null; setLocalRange(null); };
  const readSelection = (slice: PaginatedTextSlice, node: HTMLTextAreaElement) => logicalSliceSelection(slice, node.selectionStart, node.selectionEnd);
  const capture = (slice: PaginatedTextSlice, node: HTMLTextAreaElement) => {
    if (!composition.current && nativeLineTarget.current?.key === slice.key) {
      const measured = measureTextareaNavigation(node, node.selectionStart, nativeLineTarget.current.y);
      if (measured) caretLine.current = { key: slice.key, offset: node.selectionStart, y: measured.y };
    }
    const selection = readSelection(slice, node);
    if (!readOnly && !composition.current && selectionRef.current && JSON.stringify(selectionRef.current) !== JSON.stringify(selection)) {
      props.onTextEditBoundary?.('selection', selection);
    }
    selectionRef.current = selection;
    return selection;
  };
  const focusPoint = (point: FlowPoint, preferredKey?: string) => {
    const preferred = slices.find((slice) => slice.key === preferredKey && slice.unit.id === point.unitId && point.offset >= slice.start && point.offset <= slice.end);
    const slice = preferred ?? pageSliceForCaret(slices, point);
    const node = slice && refs.current.get(slice.key);
    if (!slice || !node) return false;
    const unit = latestFlow.current.units.find((candidate) => candidate.id === point.unitId);
    const offset = snapGraphemeOffset(unit?.text ?? slice.unit.text, point.offset);
    traversing.current = true;
    caretLine.current = null;
    nativeLineTarget.current = null;
    try {
      node.focus({ preventScroll: true });
      node.setSelectionRange(Math.max(0, offset - slice.start), Math.max(0, offset - slice.start));
      selectionRef.current = { unitId: point.unitId, start: offset, end: offset };
      node.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    } finally { traversing.current = false; }
    return true;
  };
  const focusVisualPoint = (slice: PaginatedTextSlice, point: FlowPoint, visual: ReturnType<typeof textareaBoundaryCaret>) => {
    const node = refs.current.get(slice.key);
    if (!node) return false;
    const native = node.ownerDocument.getSelection();
    const canMove = typeof native?.modify === 'function';
    const seed = (canMove ? visual?.nativeColumnSeed?.offset : undefined) ?? (canMove ? visual?.nativeLineEndFrom : undefined);
    if (!focusPoint(seed === undefined ? point : { unitId: point.unitId, offset: slice.start + seed }, slice.key)) return false;
    traversing.current = true;
    try {
      if (canMove && visual?.nativeColumnSeed) {
        for (let step = 0; step < visual.nativeColumnSeed.steps; step += 1) native.modify('move', visual.nativeColumnSeed.direction, 'line');
      } else if (canMove && visual?.nativeLineEndFrom !== undefined) native.modify('move', 'forward', 'lineboundary');
      selectionRef.current = readSelection(slice, node);
      if (visual) caretLine.current = { key: slice.key, offset: node.selectionStart, y: visual.y };
      return true;
    } finally { traversing.current = false; }
  };
  const selectRange = (anchor: FlowPoint, focus: FlowPoint, key?: string) => {
    if (documentSelection?.read()) {
      documentSelection.select(documentSelection.read()!.anchor, { blockId, ...focus });
      return;
    }
    const range = { anchor, focus };
    if (!localRangeRef.current) props.onFlowSelectionStart?.();
    localRangeRef.current = range;
    setLocalRange(range);
    focusPoint(focus, key);
  };
  const emit = (next: TextBlockContentV1, caret: FlowPoint, node: HTMLTextAreaElement | undefined,
    metadata?: TextFlowEditMetadata) => {
    const previous = latestFlow.current;
    const headingRequest = props.onHeadingStructure && props.allowHeading !== false && !composition.current
      ? headingStructureRequestForEdit(previous, next, { unitId: caret.unitId, caret: caret.offset }) : null;
    if (headingRequest) { emitHeadingStructure(headingRequest, node); return; }
    caretLine.current = null; nativeLineTarget.current = null; column.current = null;
    const before = selectionRef.current ?? { unitId: caret.unitId, start: caret.offset, end: caret.offset };
    const edit = metadata ?? { unitId: before.unitId, inputType: 'structure', beforeSelection: before,
      afterSelection: { unitId: caret.unitId, start: caret.offset, end: caret.offset }, isComposing: false, kind: 'structural' };
    clearRange();
    latestFlow.current = next;
    selectionRef.current = edit.afterSelection;
    if (!composition.current) pendingFocus.current = caret;
    props.onTextFlowChange(next, edit, previous);
    let globalOffset = caret.offset;
    for (const unit of next.units) { if (unit.id === caret.unitId) break; globalOffset += unit.text.length + 1; }
    props.onTextChange(next.units.map((unit) => unit.text).join('\n'), globalOffset, node);
  };
  const emitHeadingStructure = (request: HeadingTextFlowStructureRequest, node?: HTMLTextAreaElement) => {
    const normalized = normalizeHeadingTextFlow(request.nextTextFlow, request.focus);
    request = { ...request, nextTextFlow: normalized.flow, focus: normalized.focus };
    if (props.onHeadingStructure) {
      clearRange();
      latestFlow.current = request.nextTextFlow;
      pendingFocus.current = { unitId: request.focus.unitId, offset: request.focus.caret };
      void props.onHeadingStructure(request);
    } else emit(request.nextTextFlow, { unitId: request.focus.unitId, offset: request.focus.caret }, node);
  };
  const replaceRange = (value: string, node?: HTMLTextAreaElement, inputType = 'replaceFlowSelection') => {
    if (readOnly || composition.current) return false;
    if (documentSelection?.read()) return documentSelection.replace(value, inputType);
    const selection = localRangeRef.current;
    if (!selection) return false;
    const result = replaceFlowSelection(latestFlow.current, selection, value);
    if (!result) { clearRange(); return false; }
    emit(result.flow, result.caret, node, { unitId: selection.anchor.unitId, inputType, kind: 'structural', isComposing: false,
      beforeSelection: { unitId: selection.anchor.unitId, start: selection.anchor.offset, end: selection.anchor.offset },
      afterSelection: { unitId: result.caret.unitId, start: result.caret.offset, end: result.caret.offset } });
    return true;
  };
  const boundaryTarget = (request: TextFlowBoundaryNavigationRequest) => {
    if (readOnly || composition.current || !slices.length) return false;
    const forward = request.direction === 'down' || request.direction === 'right';
    const slice = forward ? slices[0] : slices[slices.length - 1];
    const node = refs.current.get(slice.key);
    if (!node) return false;
    const vertical = request.direction === 'down' || request.direction === 'up';
    const caret = vertical && request.columnX !== null ? textareaBoundaryCaret(node, forward ? 'first' : 'last', request.columnX) : null;
    const point = { unitId: slice.unit.id, offset: slice.start + (caret?.offset ?? (forward ? 0 : node.value.length)) };
    column.current = request.columnX;
    if (request.selectionAnchor) {
      const selected = documentSelection?.select(request.selectionAnchor, { blockId, ...point }) ?? false;
      if (selected) { props.onFlowSelectionStart?.(); focusVisualPoint(slice, point, caret); }
      return selected;
    }
    clearRange();
    return focusVisualPoint(slice, point, caret);
  };
  useLayoutEffect(() => {
    documentSelection?.register(blockId, { flow, editable: !readOnly,
      anchor: () => {
        const node = document.activeElement;
        const native = node instanceof HTMLTextAreaElement && node.dataset.blockId === blockId && node.dataset.textUnitId
          ? { unitId: node.dataset.textUnitId, offset: Number(node.dataset.textStart ?? 0) + (node.selectionDirection === 'backward' ? node.selectionEnd : node.selectionStart) } : null;
        return localRangeRef.current?.anchor ?? native ?? (selectionRef.current ? { unitId: selectionRef.current.unitId, offset: selectionRef.current.start } : null);
      },
      focus: (point) => { clearRange(); focusPoint(point); },
    });
    return () => documentSelection?.register(blockId, null);
  }, [blockId, flow, readOnly, documentSelection?.register, slices]);
  useLayoutEffect(() => {
    props.onNavigationTarget?.(readOnly ? null : boundaryTarget);
    return () => props.onNavigationTarget?.(null);
  }, [props.onNavigationTarget, readOnly, slices, documentSelection]);
  useLayoutEffect(() => {
    const previous = renderedFlow.current;
    const changed = previous.units.length !== flow.units.length || previous.units.some((unit, index) => unit.id !== flow.units[index]?.id || unit.text !== flow.units[index]?.text);
    if (changed && !composition.current) { clearRange(); if (documentSelection?.read()) documentSelection.clear(); }
    renderedFlow.current = flow;
    latestFlow.current = flow;
    const geometryChanged = renderedGeometry.current !== geometrySignature;
    renderedGeometry.current = geometrySignature;
    if (!composition.current) {
      // The history owner restores its caret after this child's layout effect.
      // Mere new array identities (focus/selection/parent state renders) must not
      // replay our older caret over that authoritative restoration.
      const point = pendingFocus.current ?? (geometryChanged && focused.current && selectionRef.current
        ? { unitId: selectionRef.current.unitId, offset: selectionRef.current.start } : null);
      if (point && focusPoint(point)) pendingFocus.current = null;
      else if (!geometryChanged && document.activeElement instanceof HTMLTextAreaElement && document.activeElement.dataset.blockId === blockId) {
        const node = document.activeElement;
        selectionRef.current = { unitId: node.dataset.textUnitId!, start: Number(node.dataset.textStart ?? 0) + node.selectionStart,
          end: Number(node.dataset.textStart ?? 0) + node.selectionEnd };
      }
    }
  }, [flow, slices, geometrySignature, compositionRevision]);
  useEffect(() => {
    const removers = slices.flatMap((slice) => {
      const node = refs.current.get(slice.key);
      if (!node || readOnly) return [];
      const listener = (event: Event) => {
        const input = event as InputEvent;
        if (input.cancelable && !composition.current && !input.isComposing && (localRangeRef.current || documentSelection?.read())
          && (input.inputType.startsWith('delete') || input.data !== null || ['insertLineBreak', 'insertParagraph'].includes(input.inputType))) {
          event.preventDefault();
          replaceRange(input.inputType.startsWith('delete') ? '' : input.data ?? '\n', node, input.inputType);
          return;
        }
        beforeInput.current = { selection: readSelection(slice, node), inputType: input.inputType || 'insertText', data: input.data };
      };
      node.addEventListener('beforeinput', listener);
      return [() => node.removeEventListener('beforeinput', listener)];
    });
    return () => removers.forEach((remove) => remove());
  }, [slices, readOnly, documentSelection]);

  const change = (slice: PaginatedTextSlice, node: HTMLTextAreaElement, inputType = 'insertText', isComposing = false, data?: string | null) => {
    const tail = compositionTail.current;
    if (!composition.current && tail?.unitId === slice.unit.id && inputType === 'insertCompositionText' && node.value === tail.value) {
      selectionRef.current = tail.selection; pendingFocus.current = { unitId: tail.unitId, offset: tail.selection.start };
      compositionTail.current = null; renderComposition((revision) => revision + 1); return;
    }
    if (!composition.current) compositionTail.current = null;
    const current = latestFlow.current;
    const unit = current.units.find((entry) => entry.id === slice.unit.id);
    if (!unit) return;
    const captured = beforeInput.current;
    beforeInput.current = null;
    if (!composition.current && !isComposing && (localRangeRef.current || documentSelection?.read())) {
      const delta = deriveSingleTextEditDelta(unit.text.slice(slice.start, slice.displayEnd), node.value);
      replaceRange(inputType.startsWith('delete') ? '' : data ?? captured?.data ?? delta.replacementText, node, inputType);
      return;
    }
    const composing = composition.current?.key === slice.key ? composition.current : null;
    const nextText = replaceSliceText(composing?.originalText ?? unit.text, slice, node.value);
    if (composing) composing.value = node.value;
    const afterSelection = readSelection(slice, node);
    if (nextText === unit.text) { selectionRef.current = afterSelection; return; }
    const heading = !composing && !isComposing && props.allowHeading !== false ? applyHeadingInputAtLine(current, unit.id, nextText, afterSelection.start) : null;
    if (heading) {
      emitHeadingStructure(heading, node);
      return;
    }
    let delta = deriveSingleTextEditDelta(unit.text, nextText);
    if (captured?.selection.unitId === unit.id) {
      let start = captured.selection.start;
      let end = captured.selection.end;
      if (start === end && nextText.length < unit.text.length) { start = afterSelection.start; end = start + unit.text.length - nextText.length; }
      const length = nextText.length - unit.text.length + end - start;
      if (length >= 0) {
        const value = nextText.slice(start, start + length);
        if (unit.text.slice(0, start) + value + unit.text.slice(end) === nextText) delta = { editedStartOffset: start, editedEndOffset: end, replacementText: value };
      }
    }
    const beforeSelection = captured?.selection ?? selectionRef.current ?? { unitId: unit.id, start: delta.editedStartOffset, end: delta.editedEndOffset };
    emit(replaceTextUnitText({ textFlow: current, textUnitId: unit.id, nextText, edit: delta }), { unitId: unit.id, offset: afterSelection.start }, node,
      { unitId: unit.id, inputType: composing || isComposing ? 'insertCompositionText' : inputType || captured?.inputType || 'insertText',
        beforeSelection, afterSelection, isComposing: Boolean(composing || isComposing), kind: 'typing' });
  };
  const nativeRange = (slice: PaginatedTextSlice, node: HTMLTextAreaElement): FlowSelection => ({
    anchor: { unitId: slice.unit.id, offset: slice.start + (node.selectionDirection === 'backward' ? node.selectionEnd : node.selectionStart) },
    focus: { unitId: slice.unit.id, offset: slice.start + (node.selectionDirection === 'backward' ? node.selectionStart : node.selectionEnd) },
  });
  const keyDown = (slice: PaginatedTextSlice, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composition.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    const node = event.currentTarget;
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as Record<string, TextFlowBoundaryNavigationRequest['direction'] | undefined>)[event.key];
    const forward = direction === 'right' || direction === 'down';
    const currentRange = documentSelection?.read() ?? localRangeRef.current;
    if (currentRange && (event.key === 'Escape' || (direction && !event.shiftKey))) {
      event.preventDefault();
      if (documentSelection?.read()) {
        const ordered = documentSelection.ordered();
        const point = event.key === 'Escape' ? documentSelection.read()!.focus : ordered ? (forward ? ordered.end : ordered.start) : documentSelection.read()!.focus;
        documentSelection.clear(); documentSelection.focus(point);
      } else {
        const ordered = orderedFlowSelection(latestFlow.current, localRangeRef.current!);
        const point = event.key === 'Escape' ? localRangeRef.current!.focus : ordered ? (forward ? ordered.end : ordered.start) : localRangeRef.current!.focus;
        clearRange(); focusPoint(point);
      }
      return;
    }
    if (currentRange && ['Backspace', 'Delete', 'Enter'].includes(event.key)) {
      event.preventDefault(); replaceRange(event.key === 'Enter' ? '\n' : '', node); return;
    }
    capture(slice, node);
    props.onKeyDown(event);
    if (event.defaultPrevented) return;
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) { clearRange(); documentSelection?.clear(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const unit = latestFlow.current.units.find((entry) => entry.id === slice.unit.id)!;
      selectRange({ unitId: unit.id, offset: 0 }, { unitId: unit.id, offset: unit.text.length }); return;
    }
    if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const vertical = direction === 'up' || direction === 'down';
      const base = nativeRange(slice, node);
      const anchor = currentRange?.anchor ?? base.anchor;
      const focus = currentRange?.focus ?? base.focus;
      const localOffset = Math.min(node.value.length, Math.max(0, focus.offset - slice.start));
      const previousLine = caretLine.current;
      const preferredY = previousLine?.key === slice.key && previousLine.offset === localOffset ? previousLine.y : undefined;
      const measured = vertical ? measureTextareaNavigation(node, localOffset, preferredY) : null;
      if (vertical && column.current === null) column.current = measured?.x ?? node.getBoundingClientRect().left;
      if (!vertical) { column.current = null; caretLine.current = null; nativeLineTarget.current = null; }
      const edge = vertical ? (forward ? measured?.atLastLine : measured?.atFirstLine)
        : localOffset === (forward ? node.value.length : 0);
      if (edge) {
        const index = slices.findIndex((entry) => entry.key === slice.key);
        const next = slices[index + (forward ? 1 : -1)];
        if (next) {
          const target = refs.current.get(next.key);
          if (target) {
            const position = vertical ? textareaBoundaryCaret(target, forward ? 'first' : 'last', column.current!) : null;
            // A soft seam consumes no logical character; crossing units keeps B5 behavior.
            const point = { unitId: next.unit.id, offset: next.start + (position?.offset ?? (forward ? 0 : target.value.length)) };
            event.preventDefault();
            if (event.shiftKey) selectRange(anchor, point, next.key);
            focusVisualPoint(next, point, position);
            return;
          }
        } else if (props.onBoundaryNavigate?.({ direction, columnX: vertical ? column.current : null,
          selectionAnchor: event.shiftKey ? { blockId: documentSelection?.read()?.anchor.blockId ?? blockId, unitId: anchor.unitId, offset: anchor.offset } : undefined })) {
          event.preventDefault(); return;
        }
      }
      if (event.shiftKey && currentRange) {
        const position = vertical ? textareaLineCaret(node, localOffset, forward ? 'down' : 'up', column.current!, preferredY) : null;
        const offset = vertical ? position?.offset : forward ? nextGraphemeOffset(node.value, localOffset) : previousGraphemeOffset(node.value, localOffset);
        event.preventDefault();
        if (offset !== undefined) {
          selectRange(anchor, { unitId: slice.unit.id, offset: slice.start + offset }, slice.key);
          if (position) caretLine.current = { key: slice.key, offset, y: position.y };
        }
      } else if (vertical && measured) {
        nativeLineTarget.current = { key: slice.key, y: measured.y + (forward ? 1 : -1) * measured.lineHeight };
      }
      return;
    }
    column.current = null;
    caretLine.current = null; nativeLineTarget.current = null;
    const selection = readSelection(slice, node);
    const current = latestFlow.current;
    const unitIndex = current.units.findIndex((entry) => entry.id === slice.unit.id);
    const unit = current.units[unitIndex];
    if (!unit) return;
    if (event.key === 'Enter' && (!event.shiftKey || headingLevelForRole(unit.writing_role)) && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const next = splitTextUnitForEnter(current, unit.id, selection.start, selection.end);
      const target = next.units[unitIndex + 1];
      if (target && headingLevelForRole(unit.writing_role)) {
        emitHeadingStructure({ previousTextFlow: current, nextTextFlow: next, headingUnitId: unit.id,
          focus: { unitId: target.id, caret: 0 }, inputType: 'insertParagraphAfterHeading' }, node);
      } else if (target) emit(next, { unitId: target.id, offset: 0 }, node);
    } else if (event.key === 'Tab') {
      event.preventDefault(); emit(event.shiftKey ? outdentTextUnit(current, unit.id) : indentTextUnit(current, unit.id), { unitId: unit.id, offset: selection.start }, node);
    } else if (event.key === 'Backspace' && selection.start === selection.end && node.selectionStart === 0) {
      if (selection.start > 0) {
        event.preventDefault();
        const start = previousGraphemeOffset(unit.text, selection.start);
        const result = replaceFlowSelection(current, { anchor: { unitId: unit.id, offset: start }, focus: { unitId: unit.id, offset: selection.start } }, '');
        if (result) emit(result.flow, result.caret, node);
      } else if (unitIndex > 0) {
        event.preventDefault(); const previous = current.units[unitIndex - 1];
        emit(mergeTextUnitWithPrevious(current, unit.id), { unitId: previous.id, offset: previous.text.length }, node);
      }
    } else if (event.key === 'Delete' && selection.start === selection.end && node.selectionEnd === node.value.length && selection.end < unit.text.length) {
      event.preventDefault();
      const result = replaceFlowSelection(current, { anchor: { unitId: unit.id, offset: selection.start },
        focus: { unitId: unit.id, offset: nextGraphemeOffset(unit.text, selection.start) } }, '');
      if (result) emit(result.flow, result.caret, node);
    }
  };
  const clipboard = (event: ClipboardEvent<HTMLTextAreaElement>, cut: boolean) => {
    if (composition.current) return;
    const selected = documentSelection?.read() ? documentSelection.text() : localRangeRef.current ? flowSelectionText(latestFlow.current, localRangeRef.current) : null;
    if (selected === null) return;
    event.preventDefault(); event.clipboardData.setData('text/plain', selected);
    if (cut && !readOnly) replaceRange('', event.currentTarget, 'deleteByCut');
  };
  const captureRange = (slice: PaginatedTextSlice, node: HTMLTextAreaElement) => ({
    blockId, textFlowId, textUnitId: slice.unit.id, startOffset: slice.start + node.selectionStart,
    endOffset: slice.start + node.selectionEnd, text: latestFlow.current.units.find((unit) => unit.id === slice.unit.id)?.text ?? slice.unit.text,
  });
  const unitHandleDrag = useTextUnitHandleDrag({ editorRef, disabled: readOnly || layoutMode,
    isComposing: () => Boolean(composition.current), onExtract: props.onExtractTextUnit, onMove: props.onMoveTextUnit,
    onCrossBlockTargetChange: props.onUnitDropTargetChange,
    onReorder: (unitId, target) => {
      const next = reorderTextUnit(latestFlow.current, unitId, target.unitId, target.edge);
      if (next !== latestFlow.current) { documentSelection?.clear(); emit(next, { unitId, offset: 0 }, undefined); }
    },
  });
  const menuAction = (action: CommandActionId) => {
    const unit = latestFlow.current.units.find((entry) => entry.id === menu?.unitId);
    if (!unit || readOnly || composition.current) return;
    const role = action === 'turn_unit_into_code_line' ? 'code_line' : action === 'turn_into_heading' ? 'heading_1' : WRITING_ROLE_BY_COMMAND[action];
    if (role && headingLevelForRole(role)) {
      if (props.allowHeading === false) { setMenu(null); return; }
      emitHeadingStructure({ previousTextFlow: latestFlow.current, nextTextFlow: setTextUnitWritingRole(latestFlow.current, unit.id, role),
        headingUnitId: unit.id, focus: { unitId: unit.id, caret: unit.text.length }, inputType: 'formatHeading' });
    } else if (role) emit(setTextUnitWritingRole(latestFlow.current, unit.id, role), { unitId: unit.id, offset: unit.text.length }, undefined);
    else if (action === 'label_text_unit') {
      const slice = slices.find((entry) => entry.unit.id === unit.id);
      const node = slice && refs.current.get(slice.key);
      if (node) props.onTextUnitSelection({ blockId, textFlowId, textUnitId: unit.id, startOffset: 0, endOffset: unit.text.length, text: unit.text }, node.getBoundingClientRect());
    }
    setMenu(null);
  };
  const documentRange = documentSelection?.ordered();
  const handleDropTarget = props.unitDropTarget ?? unitHandleDrag.dropTarget;
  const rangeForDisplay = documentRange?.blocks.find((entry) => entry.block.id === blockId)?.selection ?? localRange;
  const ordered = rangeForDisplay && orderedFlowSelection(flow, rangeForDisplay);
  return <>
    <div ref={editorRef} data-text-unit-editor={blockId} data-paginated-text-editor="true"
      data-text-unit-move-enabled={Boolean(props.onMoveTextUnit) && !readOnly && !layoutMode}
      style={{ position: 'relative', overflow: 'visible', minHeight: 26 }}>
      {slices.map((slice, index) => {
        const { unit } = slice;
        const metrics = typographyTextMetrics({ text: unit.text, width: slice.width, typography }, {
          startOffset: 0, endOffset: unit.text.length, indentLevel: unit.indent_level, writingRole: unit.writing_role,
        });
        const marker = textUnitMarkerForDisplay(flow.units, slice.unitIndex);
        const markerWidth = marker ? 29 : 0;
        const quoteInset = unit.writing_role === 'quote' ? 14 : 0;
        const left = metrics.indentLevel * 24 + markerWidth + quoteInset;
        const value = composition.current?.key === slice.key ? composition.current.value : unit.text.slice(slice.start, slice.displayEnd);
        const hasDraft = props.draftAnnotationRanges?.some((range) => range.block_id === blockId && range.text_unit_id === unit.id);
        const draft: AnnotationTruthV1 | null = hasDraft ? { id: 'annotation-draft-preview', note_id: '', canvas_id: '', raw_label: 'Draft',
          ranges: props.draftAnnotationRanges!, parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'annotation-draft', marker_kind: 'highlight' },
          created_by: 'human', status: 'active', created_at: '', updated_at: '' } : null;
        const annotationSegments = createAnnotationRenderSegments({ text: unit.text,
          annotations: [...(props.showLabelOverlay ? props.annotations : []), ...(draft ? [draft] : [])], blockId, textUnitId: unit.id,
          selectedAnnotationIds: draft ? [...props.selectedAnnotationIds, draft.id] : props.selectedAnnotationIds });
        let annotationOffset = 0;
        const highlights = annotationSegments.flatMap((segment) => {
          const start = annotationOffset; annotationOffset += segment.text.length;
          const low = Math.max(start, slice.start), high = Math.min(annotationOffset, slice.displayEnd);
          return low < high ? [{ ...segment, text: unit.text.slice(low, high) }] : [];
        });
        const badges = slice.first && props.showLabelOverlay ? props.annotations.filter((annotation) => annotation.status === 'active'
          && slices.find((candidate) => annotation.ranges.some((range) => range.block_id === blockId && range.text_unit_id === candidate.unit.id))?.key === slice.key) : [];
        const textStyle: CSSProperties = { ...typographyTextCssProperties(metrics), padding: 0, margin: 0, border: 0,
          borderRadius: 0, boxSizing: 'border-box', width: metrics.textWidth, minHeight: 0, height: slice.textHeight ?? slice.lineCount * metrics.lineHeightPx,
          resize: 'none', overflow: 'hidden', background: 'transparent', outline: 'none' };
        const selectionStart = ordered && slice.unitIndex >= ordered.startIndex && slice.unitIndex <= ordered.endIndex
          ? Math.max(slice.start, slice.unitIndex === ordered.startIndex ? ordered.start.offset : 0) : slice.end;
        const selectionEnd = ordered && slice.unitIndex >= ordered.startIndex && slice.unitIndex <= ordered.endIndex
          ? Math.min(slice.end, slice.unitIndex === ordered.endIndex ? ordered.end.offset : unit.text.length) : slice.start;
        return <div key={slice.key} data-page-flow-fragment-id={slice.fragmentId} data-page-flow-frame-id={slice.frameId}
          data-text-unit-row={slice.first ? unit.id : undefined} data-text-unit-continuation={!slice.first || undefined}
          data-heading-unit={headingLevelForRole(unit.writing_role) ? 'true' : undefined}
          data-text-unit-dragging={unitHandleDrag.draggingUnitId === unit.id || undefined}
          style={{ position: 'absolute', left: slice.left, top: slice.top, width: slice.width - 20, height: slice.height,
            '--text-unit-indent': 0 } as CSSProperties}>
          {slice.first && <TextUnitGutterLayer unitId={unit.id} role={unit.writing_role} disabled={readOnly || layoutMode} layoutMode={layoutMode}
            menuOpen={menu?.unitId === unit.id} onPointerDown={(event) => {
              if (readOnly || layoutMode || composition.current) return;
              if (headingLevelForRole(unit.writing_role)) props.onBeginHeadingMove?.(event);
              else unitHandleDrag.start(unit.id, event);
            }}
            onClickMenu={(point) => { if (unitHandleDrag.canOpenMenu()) setMenu({ unitId: unit.id, point }); }}
            onOpenMenu={layoutMode ? undefined : (point) => setMenu({ unitId: unit.id, point })} />}
          {slice.first && handleDropTarget?.unitId === unit.id && <div className={styles.textUnitDropIndicator}
            data-text-unit-drop-indicator={unit.id} data-drop-edge={handleDropTarget.edge} aria-hidden="true" />}
          {slice.first && marker && <span className={styles.paginatedTextMarker} style={{ position: 'absolute', left: metrics.indentLevel * 24, top: 0, lineHeight: `${metrics.lineHeightPx}px` }}>
            {unit.writing_role === 'todo_item' ? <input type="checkbox" aria-label="Toggle todo item" checked={unit.metadata.checked === true} disabled={readOnly}
              onChange={() => emit(updateTextUnitMetadata(latestFlow.current, unit.id, { checked: unit.metadata.checked !== true }), { unitId: unit.id, offset: 0 }, undefined)} />
              : unit.writing_role === 'toggle_item' ? <button type="button" aria-label={unit.metadata.collapsed ? 'Expand toggle item' : 'Collapse toggle item'} disabled={readOnly}
                onClick={() => emit(updateTextUnitMetadata(latestFlow.current, unit.id, { collapsed: unit.metadata.collapsed !== true }), { unitId: unit.id, offset: 0 }, undefined)}>{marker}</button> : marker}
          </span>}
          <div style={{ position: 'relative', left, width: metrics.textWidth }}>
            {highlights.some((segment) => segment.annotationIds.length) && <div aria-hidden="true" className={styles.textUnitAnnotationTextLayer} style={textStyle}>
              {highlights.map((segment, highlightIndex) => segment.annotationIds.length ? <mark key={highlightIndex} className={styles.textUnitAnnotationSpan}
                data-annotation-highlight-ids={JSON.stringify(segment.annotationIds)}>{segment.text}</mark> : <span key={highlightIndex}>{segment.text}</span>)}
            </div>}
            {!props.inlineLinkPrint && <InlineLinkTextLayer flow={flow} unit={unit} start={slice.start} end={slice.displayEnd}
              style={textStyle} layoutMode={layoutMode} />}
            <textarea ref={(node) => {
              if (node) refs.current.set(slice.key, node); else refs.current.delete(slice.key);
              if (index === 0) { if (typeof textareaRef === 'function') textareaRef(node); else if (textareaRef) (textareaRef as { current: HTMLTextAreaElement | null }).current = node; }
            }} value={value} readOnly={readOnly} rows={1}
              className={`${styles.pageTextArea} ${!props.inlineLinkPrint && inlineLinksForUnit(flow, unit.id).length ? styles.inlineLinkEditor : ''}`} style={textStyle}
              data-block-id={blockId} data-text-flow-id={textFlowId} data-text-unit-id={unit.id} data-text-unit-text={unit.text}
              data-text-start={slice.start} data-text-end={slice.end} data-text-display-end={slice.displayEnd} data-runtime-textflow-editor={!readOnly || props.onTextEditBoundary ? 'true' : undefined}
              onFocus={(event) => { focused.current = true; if (!traversing.current) capture(slice, event.currentTarget); if (!traversing.current && !composition.current) props.onTextEditBoundary?.('focus', readSelection(slice, event.currentTarget)); props.onFocused({ blockId, textFlowId, textUnitId: unit.id }); }}
              onChange={readOnly ? undefined : (event) => change(slice, event.currentTarget, (event.nativeEvent as InputEvent).inputType, (event.nativeEvent as InputEvent).isComposing, (event.nativeEvent as InputEvent).data)}
              onSelect={(event) => { if (!composition.current && !localRangeRef.current && !documentSelection?.read()) capture(slice, event.currentTarget); }}
              onKeyDown={readOnly ? undefined : (event) => keyDown(slice, event)}
              onKeyUp={(event) => { if (!composition.current && !localRangeRef.current && !documentSelection?.read()) capture(slice, event.currentTarget); }}
              onBlur={readOnly ? undefined : (event) => {
                focused.current = event.relatedTarget instanceof HTMLTextAreaElement && event.relatedTarget.dataset.blockId === blockId;
                if (composition.current) { deferredBlur.current = true; return; }
                if (!traversing.current && !documentSelection?.traversing.current) { focused.current = false; clearRange(); documentSelection?.clear(); }
                props.onTextEditBoundary?.('blur', readSelection(slice, event.currentTarget)); void props.onSave(true, undefined, latestFlow.current);
              }}
              onCompositionStart={readOnly ? undefined : (event) => {
                clearRange(); documentSelection?.clear(); column.current = null;
                caretLine.current = null; nativeLineTarget.current = null;
                compositionTail.current = null;
                const selection = readSelection(slice, event.currentTarget); selectionRef.current = selection;
                composition.current = { key: slice.key, slices, originalText: unit.text, value: event.currentTarget.value };
                event.currentTarget.dataset.runtimeTextflowComposing = 'true'; props.onTextEditBoundary?.('compositionStart', selection);
              }}
              onCompositionEnd={readOnly ? undefined : (event) => {
                change(slice, event.currentTarget, 'insertCompositionText', true);
                const selection = readSelection(slice, event.currentTarget); composition.current = null;
                compositionTail.current = { unitId: unit.id, value: event.currentTarget.value, selection };
                event.currentTarget.dataset.runtimeTextflowComposing = 'false'; pendingFocus.current = { unitId: unit.id, offset: selection.start };
                props.onTextEditBoundary?.('compositionEnd', selection); renderComposition((revision) => revision + 1);
                if (deferredBlur.current) { deferredBlur.current = false; props.onTextEditBoundary?.('blur', selection); void props.onSave(true, undefined, latestFlow.current); }
              }}
              onMouseDown={(event) => {
                if (composition.current) { if (event.shiftKey) event.preventDefault(); return; }
                const source = document.activeElement as HTMLTextAreaElement | null;
                if (event.shiftKey && source?.dataset.textUnitId && source !== event.currentTarget) {
                  const target = textareaCaretAtPoint(event.currentTarget, event.clientX, event.clientY);
                  if (!target) return;
                  event.preventDefault();
                  const existing = documentSelection?.read();
                  const sourceBlock = source.dataset.blockId!;
                  const localAnchor = documentSelection?.anchorFor(sourceBlock);
                  const anchor = existing?.anchor ?? { blockId: sourceBlock, ...(localRangeRef.current?.anchor ?? localAnchor ?? {
                    unitId: source.dataset.textUnitId, offset: Number(source.dataset.textStart ?? 0) + (source.selectionDirection === 'backward' ? source.selectionEnd : source.selectionStart) }) };
                  const point = { unitId: unit.id, offset: slice.start + target.offset };
                  if (sourceBlock === blockId && !existing) selectRange(anchor, point, slice.key);
                  else if (documentSelection?.select(anchor, { blockId, ...point })) props.onFlowSelectionStart?.();
                  return;
                }
                clearRange(); documentSelection?.clear(); column.current = null; caretLine.current = null; nativeLineTarget.current = null;
              }}
              onMouseUp={(event) => {
                if (composition.current || localRangeRef.current || documentSelection?.read()) return;
                const range = captureRange(slice, event.currentTarget);
                if (range.startOffset !== range.endOffset) props.onTextUnitSelection(range, event.currentTarget.getBoundingClientRect(), { additive: event.ctrlKey || event.metaKey });
              }}
              onContextMenu={(event) => {
                if (layoutMode) return;
                const range = captureRange(slice, event.currentTarget);
                if (range.startOffset !== range.endOffset) { event.preventDefault(); props.onTextUnitContextMenu(range, event.currentTarget.getBoundingClientRect(), { x: event.clientX, y: event.clientY }); }
              }}
              onCopy={(event) => clipboard(event, false)} onCut={(event) => clipboard(event, true)}
              onPaste={readOnly ? undefined : (event) => {
                if (composition.current) return;
                const image = props.onPasteImage ? imageOnlyClipboardFile(event.clipboardData) : null;
                if (image) { event.preventDefault(); void props.onPasteImage?.(image); return; }
                const pasted = event.clipboardData.getData('text/plain');
                if (!pasted) return;
                event.preventDefault();
                if (replaceRange(pasted, event.currentTarget, 'insertFromPaste')) return;
                const selection = readSelection(slice, event.currentTarget); selectionRef.current = selection;
                if (props.allowHeading === false && /^#{1,3} /m.test(pasted)) {
                  const result = replaceFlowSelection(latestFlow.current, { anchor: { unitId: unit.id, offset: selection.start },
                    focus: { unitId: unit.id, offset: selection.end } }, pasted);
                  if (result) emit(result.flow, result.caret, event.currentTarget);
                  return;
                }
                if (!pasted.includes('\n') && !/^(#{1,6}\s|[-*]\s|\d+[.)]\s|>\s?|\[ ?x? ?\])/i.test(pasted.trim())) {
                  const result = replaceFlowSelection(latestFlow.current, { anchor: { unitId: unit.id, offset: selection.start }, focus: { unitId: unit.id, offset: selection.end } }, pasted);
                  if (result) emit(result.flow, result.caret, event.currentTarget);
                  return;
                }
                const next = pasteTextIntoTextFlow(latestFlow.current, unit.id, selection.start, pasted, selection.end);
                const sourceIndex = latestFlow.current.units.findIndex((entry) => entry.id === unit.id);
                const added = next.units.length - latestFlow.current.units.length;
                const target = next.units[sourceIndex + added] ?? next.units[sourceIndex];
                const suffixLength = unit.text.length - selection.end;
                const pastedHeading = props.allowHeading !== false && next.units.find((candidate) => headingLevelForRole(candidate.writing_role));
                if (pastedHeading) {
                  emitHeadingStructure({ previousTextFlow: latestFlow.current, nextTextFlow: next, headingUnitId: pastedHeading.id,
                    focus: { unitId: target.id, caret: Math.max(0, target.text.length - suffixLength) }, inputType: 'insertHeading' }, event.currentTarget);
                } else emit(next, { unitId: target.id, offset: Math.max(0, target.text.length - suffixLength) }, event.currentTarget);
              }}
              onDragOver={readOnly ? undefined : (event) => { if (hasContentGroupDragPayloadType(event.dataTransfer)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
              onDrop={readOnly ? undefined : (event) => {
                if (composition.current) return;
                const payload = readContentGroupDragPayload(event.dataTransfer); if (!payload) return;
                const value = plainTextFromContentGroupDragPayload(payload); if (!value) return;
                event.preventDefault(); event.stopPropagation();
                const caret = textareaCaretAtPoint(event.currentTarget, event.clientX, event.clientY);
                const offset = slice.start + (caret?.offset ?? event.currentTarget.selectionStart);
                const result = replaceFlowSelection(latestFlow.current, { anchor: { unitId: unit.id, offset }, focus: { unitId: unit.id, offset } }, value);
                if (result) emit(result.flow, result.caret, event.currentTarget);
              }} />
            {selectionEnd > selectionStart && <TextFlowSelectionLayer textarea={refs.current.get(slice.key) ?? null}
              start={selectionStart - slice.start} end={selectionEnd - slice.start}
              includeBreak={Boolean((slice.displayEnd < slice.end && selectionEnd >= slice.end) || (ordered && slice.unitIndex < ordered.endIndex && slice.end === unit.text.length))} />}
            {badges.map((annotation) => {
              const color = annotationColorForToken(annotation.visual_style.color_token);
              return <button key={annotation.id} type="button" data-annotation-stamp={annotation.id} draggable
                className={styles.textUnitAnnotationBadge} aria-label={`Inspect annotation ${annotation.raw_label}`} title={annotation.raw_label}
                style={{ '--annotation-badge-accent': color.accent, '--annotation-badge-bg': color.badgeBackground, '--annotation-badge-text': color.text } as CSSProperties}
                onMouseDown={(event) => event.stopPropagation()} onClick={() => props.onAnnotationSelect(annotation.id)}
                onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); props.onAnnotationContextMenu(annotation.id, { x: event.clientX, y: event.clientY }); }}
                onDragStart={(event) => { event.stopPropagation(); writeContentGroupDragPayload(event.dataTransfer, { kind: 'label', annotation_id: annotation.id,
                  label: annotation.raw_label, ranges: annotation.ranges, text_preview: annotation.ranges.map((range) => range.range_text_cache ?? '').join(' | '), source_note_id: annotation.note_id }); }}>
                {annotation.raw_label}</button>;
            })}
            {hasDraft && slice.first && <div role="button" tabIndex={0} data-selection-draft-handle="true" draggable className={styles.textUnitDraftRangeBadge}
              title="Drag selected range into a content group" aria-label="Drag selected range"
              onPointerDownCapture={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
              onDragStart={(event) => { event.stopPropagation(); writeContentGroupDragPayload(event.dataTransfer, { kind: 'draft_range', label: 'Draft range',
                ranges: props.draftAnnotationRanges!, text_preview: props.draftAnnotationRanges!.map((range) => range.range_text_cache ?? '').join(' | ') }); }}>
              <span className={styles.textUnitDraftRangeBadgeIcon}>↗</span>
            </div>}
          </div>
        </div>;
      })}
    </div>
    <ContextMenuLayer menu={menu && !readOnly ? { id: `text-unit-menu-${menu.unitId}`, kind: 'text_unit_handle', point: menu.point, title: 'Text unit', items: buildTextUnitHandleMenu() } : null}
      onClose={() => setMenu(null)} onAction={menuAction} />
  </>;
}
