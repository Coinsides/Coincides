import {
  createAnnotationRangeFromCapturedSelection,
  normalizeSelectionOffsets,
  type CapturedSelectionRange,
} from './selectionRangeService';
import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
} from './runtimeDataTypes';
import { reconcileCapturedSelectionTextOwner } from './selectionRangeService';
import type { TextOwnerReconciliation } from './textFocusReceipt';

export type SelectionDraftMode = 'replace' | 'additive';
export type SelectionDraftPhase = 'capturing' | 'draft' | 'active';

export interface SelectionDraftRangeV1 extends CapturedSelectionRange {
  id: string;
}

export interface SelectionDraftV1 {
  id: string;
  phase: SelectionDraftPhase;
  mode: SelectionDraftMode;
  ranges: SelectionDraftRangeV1[];
  anchorRect: DOMRect;
  parentAnnotationId?: string;
  createdAt: string;
  updatedAt: string;
}

export function reconcileSelectionDraftTextOwner(
  draft: SelectionDraftV1 | null,
  reconciliation: TextOwnerReconciliation,
): SelectionDraftV1 | null {
  if (!draft) return null;
  let changed = false;
  const ranges = draft.ranges.map((range) => {
    const reconciled = reconcileCapturedSelectionTextOwner(range, reconciliation);
    if (reconciled === range) return range;
    changed = true;
    return { ...range, ...reconciled };
  });
  return changed
    ? { ...draft, ranges, updatedAt: nowIso() }
    : draft;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createRuntimeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function selectionDraftRangeIdentityKey(range: SelectionDraftRangeV1): string {
  return [
    range.blockId,
    range.textFlowId,
    range.textUnitId,
    range.startOffset,
    range.endOffset,
  ].join('|');
}

export function createSelectionDraftRangeFromCapturedSelection(
  selection: CapturedSelectionRange,
): SelectionDraftRangeV1 | null {
  const normalized = normalizeSelectionOffsets({
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
    textLength: selection.text.length,
  });
  if (normalized.startOffset === normalized.endOffset) return null;
  return {
    ...selection,
    id: createRuntimeId('selection-draft-range'),
    startOffset: normalized.startOffset,
    endOffset: normalized.endOffset,
  };
}

export function mergeSelectionDraftRanges(
  ranges: SelectionDraftRangeV1[],
): SelectionDraftRangeV1[] {
  const seen = new Set<string>();
  const merged: SelectionDraftRangeV1[] = [];
  ranges.forEach((range) => {
    const key = selectionDraftRangeIdentityKey(range);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(range);
  });
  return merged;
}

export function createSelectionDraft(input: {
  range: SelectionDraftRangeV1;
  anchorRect: DOMRect;
  mode?: SelectionDraftMode;
  parentAnnotationId?: string;
}): SelectionDraftV1 {
  const timestamp = nowIso();
  return {
    id: createRuntimeId('selection-draft'),
    phase: 'draft',
    mode: input.mode || 'replace',
    ranges: [input.range],
    anchorRect: input.anchorRect,
    parentAnnotationId: input.parentAnnotationId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function replaceSelectionDraft(input: {
  range: SelectionDraftRangeV1;
  anchorRect: DOMRect;
  parentAnnotationId?: string;
}): SelectionDraftV1 {
  return createSelectionDraft({
    range: input.range,
    anchorRect: input.anchorRect,
    mode: 'replace',
    parentAnnotationId: input.parentAnnotationId,
  });
}

export function appendSelectionDraftRange(input: {
  draft: SelectionDraftV1 | null;
  range: SelectionDraftRangeV1;
  anchorRect: DOMRect;
  parentAnnotationId?: string;
}): SelectionDraftV1 {
  if (!input.draft) {
    return createSelectionDraft({
      range: input.range,
      anchorRect: input.anchorRect,
      mode: 'additive',
      parentAnnotationId: input.parentAnnotationId,
    });
  }

  return {
    ...input.draft,
    phase: 'draft',
    mode: 'additive',
    ranges: mergeSelectionDraftRanges([...input.draft.ranges, input.range]),
    anchorRect: input.anchorRect,
    parentAnnotationId: input.parentAnnotationId ?? input.draft.parentAnnotationId,
    updatedAt: nowIso(),
  };
}

export function activateSelectionDraft(draft: SelectionDraftV1): SelectionDraftV1 {
  return {
    ...draft,
    phase: 'active',
    updatedAt: nowIso(),
  };
}

export function selectionDraftRangesToAnnotationRanges(
  ranges: SelectionDraftRangeV1[],
): AnnotationRangeV1[] {
  return ranges.map(createAnnotationRangeFromCapturedSelection);
}

export function selectionDraftContainsCapturedSelection(
  draft: SelectionDraftV1 | null,
  selection: CapturedSelectionRange,
): boolean {
  if (!draft) return false;
  const normalized = normalizeSelectionOffsets({
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
    textLength: selection.text.length,
  });
  return draft.ranges.some((range) => {
    if (
      range.blockId !== selection.blockId
      || range.textFlowId !== selection.textFlowId
      || range.textUnitId !== selection.textUnitId
    ) {
      return false;
    }
    const rangeStart = Math.min(range.startOffset, range.endOffset);
    const rangeEnd = Math.max(range.startOffset, range.endOffset);
    if (normalized.startOffset === normalized.endOffset) {
      return rangeStart <= normalized.startOffset && normalized.startOffset <= rangeEnd;
    }
    return rangeStart <= normalized.startOffset && normalized.endOffset <= rangeEnd;
  });
}

function textSpanContains(parent: AnnotationRangeV1, child: AnnotationRangeV1): boolean {
  if (child.target_kind !== 'text_span') return false;
  if (parent.block_id !== child.block_id || parent.text_unit_id !== child.text_unit_id) return false;

  if (parent.target_kind === 'text_unit') return true;
  if (parent.target_kind === 'block') return parent.block_id === child.block_id;
  if (parent.target_kind !== 'text_span') return false;

  const parentStart = parent.start_offset ?? 0;
  const parentEnd = parent.end_offset ?? parentStart;
  const childStart = child.start_offset ?? 0;
  const childEnd = child.end_offset ?? childStart;
  return parentStart <= childStart && parentEnd >= childEnd;
}

export function annotationContainsDraftRanges(input: {
  annotation: AnnotationTruthV1;
  ranges: SelectionDraftRangeV1[];
}): boolean {
  if (input.ranges.length === 0) return false;
  const annotationRanges = selectionDraftRangesToAnnotationRanges(input.ranges);
  return annotationRanges.every((draftRange) => (
    input.annotation.ranges.some((parentRange) => textSpanContains(parentRange, draftRange))
  ));
}
