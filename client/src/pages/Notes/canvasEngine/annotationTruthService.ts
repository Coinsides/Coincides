import type {
  AnnotationCreatedBy,
  AnnotationMarkerKind,
  AnnotationProposalV1,
  AnnotationRangeV1,
  AnnotationTruthV1,
} from './runtimeDataTypes';
import { textFocusReceiptsEqual, type TextOwnerReconciliation } from './textFocusReceipt';

const DEFAULT_LABEL = 'Untitled label';
const DEFAULT_COLOR_TOKEN = 'annotation-yellow';
const DEFAULT_MARKER_KIND: AnnotationMarkerKind = 'highlight';

function createRuntimeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanLabel(label: string): string {
  const trimmed = label.trim();
  return trimmed || DEFAULT_LABEL;
}

export function reconcileAnnotationTruthTextOwner(
  annotations: AnnotationTruthV1[],
  reconciliation: TextOwnerReconciliation,
): AnnotationTruthV1[] {
  const updatedAt = nowIso();
  let changed = false;
  const next = annotations.map((annotation) => {
    let annotationChanged = false;
    const ranges = annotation.ranges.map((range) => {
      if (!textFocusReceiptsEqual({
        blockId: range.block_id || '',
        textFlowId: range.text_flow_id || '',
        textUnitId: range.text_unit_id || '',
      }, reconciliation.from)) {
        return range;
      }
      changed = true;
      annotationChanged = true;
      return {
        ...range,
        block_id: reconciliation.to.blockId,
        text_flow_id: reconciliation.to.textFlowId,
        text_unit_id: reconciliation.to.textUnitId,
      };
    });
    return annotationChanged ? { ...annotation, ranges, updated_at: updatedAt } : annotation;
  });
  return changed ? next : annotations;
}

function normalizeOffsets(startOffset: number, endOffset: number): {
  startOffset: number;
  endOffset: number;
} {
  const start = Math.max(0, Number.isFinite(startOffset) ? startOffset : 0);
  const end = Math.max(0, Number.isFinite(endOffset) ? endOffset : start);
  return start <= end
    ? { startOffset: start, endOffset: end }
    : { startOffset: end, endOffset: start };
}

export function createTextSpanAnnotationRange(input: {
  blockId: string;
  textFlowId: string;
  textUnitId: string;
  startOffset: number;
  endOffset: number;
  text: string;
}): AnnotationRangeV1 {
  const normalized = normalizeOffsets(input.startOffset, input.endOffset);
  return {
    id: createRuntimeId('annotation-range'),
    target_kind: 'text_span',
    block_id: input.blockId,
    text_flow_id: input.textFlowId,
    text_unit_id: input.textUnitId,
    start_offset: normalized.startOffset,
    end_offset: normalized.endOffset,
    range_text_cache: input.text,
  };
}

export function createTextUnitAnnotationRange(input: {
  blockId: string;
  textFlowId: string;
  textUnitId: string;
  text: string;
}): AnnotationRangeV1 {
  return {
    id: createRuntimeId('annotation-range'),
    target_kind: 'text_unit',
    block_id: input.blockId,
    text_flow_id: input.textFlowId,
    text_unit_id: input.textUnitId,
    range_text_cache: input.text,
  };
}

export function createBlockAnnotationRange(input: {
  blockId: string;
  text: string;
}): AnnotationRangeV1 {
  return {
    id: createRuntimeId('annotation-range'),
    target_kind: 'block',
    block_id: input.blockId,
    range_text_cache: input.text,
  };
}

export function createAnnotationTruth(input: {
  noteId: string;
  canvasId: string;
  label: string;
  ranges: AnnotationRangeV1[];
  parentAnnotationId?: string | null;
  createdBy?: AnnotationCreatedBy;
  markerKind?: AnnotationMarkerKind;
  colorToken?: string;
}): AnnotationTruthV1 {
  const timestamp = nowIso();
  return {
    id: createRuntimeId('annotation'),
    note_id: input.noteId,
    canvas_id: input.canvasId,
    raw_label: cleanLabel(input.label),
    ranges: [...input.ranges],
    parent_annotation_id: input.parentAnnotationId || null,
    child_annotation_ids: [],
    visual_style: {
      color_token: input.colorToken || DEFAULT_COLOR_TOKEN,
      marker_kind: input.markerKind || DEFAULT_MARKER_KIND,
    },
    created_by: input.createdBy || 'human',
    status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function renameAnnotationTruth(
  annotation: AnnotationTruthV1,
  nextLabel: string,
): AnnotationTruthV1 {
  return {
    ...annotation,
    raw_label: cleanLabel(nextLabel),
    updated_at: nowIso(),
  };
}

export function updateAnnotationColorToken(
  annotation: AnnotationTruthV1,
  colorToken: string,
): AnnotationTruthV1 {
  return {
    ...annotation,
    visual_style: {
      ...annotation.visual_style,
      color_token: colorToken,
    },
    updated_at: nowIso(),
  };
}

export function softDeleteAnnotationTruth(annotation: AnnotationTruthV1): AnnotationTruthV1 {
  return {
    ...annotation,
    status: 'deleted',
    updated_at: nowIso(),
  };
}

export function hideAnnotationTruth(annotation: AnnotationTruthV1): AnnotationTruthV1 {
  return {
    ...annotation,
    status: 'hidden',
    updated_at: nowIso(),
  };
}

export function restoreAnnotationTruth(annotation: AnnotationTruthV1): AnnotationTruthV1 {
  return {
    ...annotation,
    status: 'active',
    updated_at: nowIso(),
  };
}

export function addRangeToAnnotationTruth(
  annotation: AnnotationTruthV1,
  range: AnnotationRangeV1,
): AnnotationTruthV1 {
  return {
    ...annotation,
    ranges: [...annotation.ranges, range],
    updated_at: nowIso(),
  };
}

export function addChildAnnotationLink(
  annotation: AnnotationTruthV1,
  childAnnotationId: string,
): AnnotationTruthV1 {
  if (annotation.child_annotation_ids.includes(childAnnotationId)) return annotation;
  return {
    ...annotation,
    child_annotation_ids: [...annotation.child_annotation_ids, childAnnotationId],
    updated_at: nowIso(),
  };
}

export function removeChildAnnotationLink(
  annotation: AnnotationTruthV1,
  childAnnotationId: string,
): AnnotationTruthV1 {
  return {
    ...annotation,
    child_annotation_ids: annotation.child_annotation_ids.filter((id) => id !== childAnnotationId),
    updated_at: nowIso(),
  };
}

export function createAnnotationProposal(input: {
  noteId: string;
  canvasId?: string;
  interpretationId?: string;
  label: string;
  ranges: AnnotationRangeV1[];
  reasoningSummary: string;
  createdBy: 'ai' | 'importer';
  status?: AnnotationProposalV1['status'];
}): AnnotationProposalV1 {
  const timestamp = nowIso();
  return {
    id: createRuntimeId('annotation-proposal'),
    note_id: input.noteId,
    canvas_id: input.canvasId,
    interpretation_id: input.interpretationId,
    proposed_label: cleanLabel(input.label),
    proposed_ranges: [...input.ranges],
    reasoning_summary: input.reasoningSummary,
    status: input.status || 'pending',
    created_by: input.createdBy,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: {},
  };
}

export function acceptAnnotationProposal(input: {
  proposal: AnnotationProposalV1;
  canvasId: string;
}): { proposal: AnnotationProposalV1; annotation: AnnotationTruthV1 } {
  const timestamp = nowIso();
  const proposal = {
    ...input.proposal,
    status: 'accepted' as const,
    updated_at: timestamp,
  };
  return {
    proposal,
    annotation: createAnnotationTruth({
      noteId: input.proposal.note_id,
      canvasId: input.canvasId,
      label: input.proposal.proposed_label,
      ranges: input.proposal.proposed_ranges,
      createdBy: 'ai_proposal',
    }),
  };
}

export function rejectAnnotationProposal(proposal: AnnotationProposalV1): AnnotationProposalV1 {
  return {
    ...proposal,
    status: 'rejected',
    updated_at: nowIso(),
  };
}
