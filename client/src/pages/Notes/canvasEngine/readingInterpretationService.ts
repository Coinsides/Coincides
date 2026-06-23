import type {
  AnnotationProposalV1,
  AnnotationRangeV1,
  AnnotationTruthV1,
  ContentGroupV1,
  ReadingInterpretationCreatedBy,
  ReadingInterpretationV1,
} from './runtimeDataTypes';
import {
  createAnnotationProposal,
  createAnnotationTruth,
} from './annotationTruthService';
import {
  getChildAnnotations,
  isRootAnnotation,
} from './annotationHierarchyService';
import {
  normalizeContentGroup,
} from './contentGroupService';

function createRuntimeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createReadingInterpretation(input: {
  noteId: string;
  canvasId: string;
  summary: string;
  proposedAnnotationIds?: string[];
  createdBy: ReadingInterpretationCreatedBy;
  status?: ReadingInterpretationV1['status'];
}): ReadingInterpretationV1 {
  const timestamp = nowIso();
  return {
    id: createRuntimeId('reading-interpretation'),
    note_id: input.noteId,
    canvas_id: input.canvasId,
    summary: input.summary.trim(),
    proposed_annotation_ids: [...(input.proposedAnnotationIds || [])],
    status: input.status || 'draft',
    created_by: input.createdBy,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: {},
  };
}

export function createReadingAnnotationProposal(input: {
  interpretation: ReadingInterpretationV1;
  label: string;
  ranges: AnnotationRangeV1[];
  reasoningSummary: string;
  createdBy?: 'ai' | 'importer';
}): AnnotationProposalV1 {
  return createAnnotationProposal({
    noteId: input.interpretation.note_id,
    canvasId: input.interpretation.canvas_id,
    interpretationId: input.interpretation.id,
    label: input.label,
    ranges: input.ranges,
    reasoningSummary: input.reasoningSummary,
    createdBy: input.createdBy || 'ai',
    status: 'pending',
  });
}

export function acceptAnnotationProposalToTruth(input: {
  proposal: AnnotationProposalV1;
  canvasId: string;
}): { proposal: AnnotationProposalV1; annotation: AnnotationTruthV1 } {
  const timestamp = nowIso();
  return {
    proposal: {
      ...input.proposal,
      status: 'accepted',
      updated_at: timestamp,
    },
    annotation: createAnnotationTruth({
      noteId: input.proposal.note_id,
      canvasId: input.proposal.canvas_id || input.canvasId,
      label: input.proposal.proposed_label,
      ranges: input.proposal.proposed_ranges,
      createdBy: 'ai_proposal',
    }),
  };
}

export function rejectAnnotationProposalSeed(proposal: AnnotationProposalV1): AnnotationProposalV1 {
  return {
    ...proposal,
    status: 'rejected',
    updated_at: nowIso(),
  };
}

function rangePreview(range: AnnotationRangeV1): string {
  const preview = range.range_text_cache?.trim();
  if (preview) return preview;
  return `${range.target_kind}:${range.block_id || range.text_unit_id || range.inline_structure_id || range.canvas_object_id || range.source_region_id || 'unknown'}`;
}

function annotationPreview(annotation: AnnotationTruthV1): string {
  return annotation.ranges
    .map(rangePreview)
    .filter(Boolean)
    .join(' | ');
}

function childSummaryForAnnotation(
  annotation: AnnotationTruthV1,
  activeAnnotations: AnnotationTruthV1[],
): string {
  const children = getChildAnnotations({
    parent: annotation,
    annotations: activeAnnotations,
    includeHidden: true,
  });
  return children
    .filter((child) => child.status !== 'deleted')
    .map((child) => `${child.raw_label}: ${annotationPreview(child)}`)
    .join('; ');
}

export function projectAnnotationsForReading(input: {
  annotations: AnnotationTruthV1[];
}): string {
  const activeAnnotations = input.annotations.filter((annotation) => annotation.status !== 'deleted');
  const annotationById = new Map(activeAnnotations.map((annotation) => [annotation.id, annotation]));
  const lines: string[] = [];

  for (const annotation of activeAnnotations.filter(isRootAnnotation)) {
    lines.push(`Annotation: ${annotation.raw_label}`);
    lines.push(`Status: ${annotation.status}`);
    lines.push('Ranges:');
    for (const range of annotation.ranges) {
      lines.push(`- ${rangePreview(range)}`);
    }
    const children = getChildAnnotations({
      parent: annotation,
      annotations: activeAnnotations,
      includeHidden: true,
    }).filter((child) => annotationById.has(child.id));
    if (children.length > 0) {
      lines.push('Children:');
      for (const child of children) {
        lines.push(`- ${child.raw_label}: ${annotationPreview(child)}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export interface ContentGroupReadingIdentityProjection {
  content_group_id: string;
  role: string | null;
  topic: string | null;
  summary: string | null;
  source: 'content_group_identity';
}

export interface ContentGroupReadingProjection {
  knowledge_objects: ContentGroupReadingIdentityProjection[];
  draft_knowledge_candidates: ContentGroupReadingIdentityProjection[];
}

function projectContentGroupIdentity(group: ContentGroupV1): ContentGroupReadingIdentityProjection {
  return {
    content_group_id: group.id,
    role: group.identity.role || null,
    topic: group.identity.topic || null,
    summary: group.identity.summary || null,
    source: 'content_group_identity',
  };
}

export function projectContentGroupsForReading(input: {
  contentGroups: ContentGroupV1[];
}): ContentGroupReadingProjection {
  const activeGroups = input.contentGroups
    .map(normalizeContentGroup)
    .filter((group) => group.status !== 'deleted');

  return {
    knowledge_objects: activeGroups
      .filter((group) => group.identity.status === 'accepted')
      .map(projectContentGroupIdentity),
    draft_knowledge_candidates: activeGroups
      .filter((group) => group.identity.status === 'draft')
      .map(projectContentGroupIdentity),
  };
}
