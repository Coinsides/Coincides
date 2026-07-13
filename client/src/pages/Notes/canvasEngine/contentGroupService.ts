import {
  textFromContent,
} from './blockContentService';
import type {
  PageSliceSnapshotV1,
} from './types';
import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
  ContentGroupCreatedBy,
  ContentGroupIdentityCreatedBy,
  ContentGroupIdentityStatus,
  ContentGroupIdentityV1,
  ContentGroupMemberKind,
  ContentGroupMemberIntegrityStatus,
  ContentGroupMemberSourceRefV1,
  ContentGroupMemberSourceSyncStatus,
  ContentGroupMemberV1,
  ContentGroupStatus,
  ContentGroupV1,
  GroupFolderV1,
  NoteBlock,
} from './runtimeDataTypes';
import {
  getTextFlowContent,
} from './textFlowService';
import {
  groupFolderDerivedDepth,
} from './groupFolderService';
import {
  annotationRangeIsRenderable,
} from './annotationDisplayService';
import type {
  ContentGroupDragPayload,
} from './contentGroupDragService';

function createRuntimeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanTitle(title: string | null | undefined): string {
  const trimmed = (title || '').trim();
  return trimmed || 'Untitled group';
}

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();
  return trimmed || null;
}

function normalizeStatus(status: unknown): ContentGroupStatus {
  if (status === 'hidden' || status === 'deleted') return status;
  return 'active';
}

function normalizeCreatedBy(createdBy: unknown): ContentGroupCreatedBy {
  if (createdBy === 'ai_proposal' || createdBy === 'importer') return createdBy;
  return 'human';
}

function normalizeIdentityStatus(status: unknown): ContentGroupIdentityStatus {
  if (status === 'draft' || status === 'accepted' || status === 'rejected' || status === 'archived') return status;
  return 'none';
}

function normalizeIdentityCreatedBy(createdBy: unknown): ContentGroupIdentityCreatedBy {
  if (createdBy === 'ai' || createdBy === 'system') return createdBy;
  return 'human';
}

function normalizeMemberKind(kind: unknown): ContentGroupMemberKind {
  if (
    kind === 'annotation'
    || kind === 'block'
    || kind === 'content_group'
    || kind === 'page_slice'
    || kind === 'canvas_object'
    || kind === 'table_region'
    || kind === 'image_region'
    || kind === 'future_object'
    || kind === 'item'
  ) return kind;
  return 'content_range';
}

function cloneRange(range: AnnotationRangeV1): AnnotationRangeV1 {
  return { ...range };
}

function cloneMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object'
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

function rangePreview(range: AnnotationRangeV1 | null | undefined): string | null {
  if (range && !annotationRangeIsRenderable(range)) return null;
  return cleanOptionalText(range?.range_text_cache);
}

function annotationPreview(annotation: AnnotationTruthV1): string | null {
  return cleanOptionalText(
    annotation.ranges
      .filter(annotationRangeIsRenderable)
      .map((range) => range.range_text_cache?.trim())
      .filter((text): text is string => Boolean(text))
      .join(' | '),
  );
}

function blockPreview(block: NoteBlock): string | null {
  return cleanOptionalText(textFromContent(block));
}

export interface ContentGroupIntegrityIssue {
  group_id: string;
  member_id: string;
  status: ContentGroupMemberIntegrityStatus;
  reason: string;
}

export interface ContentGroupGraphIntegrityIssue {
  group_id: string;
  member_id?: string;
  status:
    | 'missing_folder'
    | 'missing_member_source'
    | 'accepted_group_has_issue';
  reason: string;
}

export interface ContentGroupPreviewResolver {
  resolveAnnotationPreview(annotationId: string): string | null;
  resolveBlockPreview(blockId: string): string | null;
  resolveRangePreview(range: AnnotationRangeV1): string | null;
}

export type ContentGroupStabilityState =
  | 'stable'
  | 'deleted_group'
  | 'empty_group'
  | 'stale_member_source'
  | 'orphaned_member'
  | 'deleted_source_note'
  | 'archived_folder'
  | 'accepted_identity_with_stale_member'
  | 'materialize_target_unavailable';

export type ContentGroupStabilitySeverity = 'ok' | 'muted' | 'warning' | 'danger';

export interface ContentGroupStabilitySummary {
  primary_state: ContentGroupStabilityState;
  states: ContentGroupStabilityState[];
  label: string;
  reason: string;
  severity: ContentGroupStabilitySeverity;
  member_issue_count: number;
  can_materialize: boolean;
  materialize_disabled_reason: string | null;
  accept_disabled_reason: string | null;
}

const STABILITY_PRIORITY: ContentGroupStabilityState[] = [
  'deleted_group',
  'deleted_source_note',
  'orphaned_member',
  'accepted_identity_with_stale_member',
  'stale_member_source',
  'materialize_target_unavailable',
  'archived_folder',
  'empty_group',
  'stable',
];

const STABILITY_LABELS: Record<ContentGroupStabilityState, { label: string; reason: string; severity: ContentGroupStabilitySeverity }> = {
  stable: {
    label: 'Ready',
    reason: 'No blocking ContentGroup stability issue is known.',
    severity: 'ok',
  },
  deleted_group: {
    label: 'Deleted',
    reason: 'This ContentGroup is deleted and should not be edited as active content.',
    severity: 'danger',
  },
  empty_group: {
    label: 'Empty group',
    reason: 'This ContentGroup has no members yet.',
    severity: 'muted',
  },
  stale_member_source: {
    label: 'Source changed',
    reason: 'At least one member differs from its source snapshot.',
    severity: 'warning',
  },
  orphaned_member: {
    label: 'Source missing',
    reason: 'At least one member source no longer resolves.',
    severity: 'danger',
  },
  deleted_source_note: {
    label: 'Source note missing',
    reason: 'The source note is unavailable for this ContentGroup.',
    severity: 'danger',
  },
  archived_folder: {
    label: 'Archived folder',
    reason: 'This ContentGroup is placed in an archived folder context.',
    severity: 'warning',
  },
  accepted_identity_with_stale_member: {
    label: 'Accepted but stale',
    reason: 'The accepted identity should be reviewed because member/source state changed.',
    severity: 'warning',
  },
  materialize_target_unavailable: {
    label: 'Materialize blocked',
    reason: 'No safe target is available for materializing this ContentGroup.',
    severity: 'warning',
  },
};

function normalizeSourceSyncStatus(status: unknown): ContentGroupMemberSourceSyncStatus {
  if (
    status === 'fresh'
    || status === 'changed'
    || status === 'missing'
    || status === 'detached'
    || status === 'unsupported'
  ) {
    return status;
  }
  return 'fresh';
}

function textSnapshotHash(text: string | null | undefined): string | null {
  const value = cleanOptionalText(text);
  if (!value) return null;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16)}:${value.length}`;
}

function metadataText(metadata: Record<string, unknown> | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' ? cleanOptionalText(value) : null;
}

export function normalizeContentGroupMemberSourceRef(
  sourceRef: ContentGroupMemberSourceRefV1 | null | undefined,
): ContentGroupMemberSourceRefV1 | null {
  if (!sourceRef || typeof sourceRef !== 'object') return null;
  const snapshotText = cleanOptionalText(sourceRef.snapshot_text);
  return {
    source_artifact_id: cleanOptionalText(sourceRef.source_artifact_id),
    note_id: cleanOptionalText(sourceRef.note_id),
    block_id: cleanOptionalText(sourceRef.block_id || sourceRef.range?.block_id),
    range: sourceRef.range && typeof sourceRef.range === 'object' ? cloneRange(sourceRef.range) : null,
    snapshot_text: snapshotText,
    snapshot_hash: cleanOptionalText(sourceRef.snapshot_hash) || textSnapshotHash(snapshotText),
    status: normalizeSourceSyncStatus(sourceRef.status),
    updated_at: cleanOptionalText(sourceRef.updated_at),
    metadata: cloneMetadata(sourceRef.metadata),
  };
}

function createContentGroupMemberSourceRef(input: {
  kind: ContentGroupMemberKind;
  targetId?: string | null;
  range?: AnnotationRangeV1 | null;
  snapshotText?: string | null;
  metadata?: Record<string, unknown>;
  status?: ContentGroupMemberSourceSyncStatus;
  now?: string;
}): ContentGroupMemberSourceRefV1 | null {
  const targetId = cleanOptionalText(input.targetId);
  const range = input.range ? cloneRange(input.range) : null;
  const snapshotText = cleanOptionalText(input.snapshotText) || rangePreview(range);
  const sourceArtifactId = input.kind === 'block' ? null : targetId || range?.id || null;
  const blockId = input.kind === 'block' ? targetId : range?.block_id || null;
  const noteId = metadataText(input.metadata, 'source_note_id');
  if (!sourceArtifactId && !blockId && !range && !snapshotText && !noteId) return null;
  return {
    source_artifact_id: sourceArtifactId,
    note_id: noteId,
    block_id: blockId,
    range,
    snapshot_text: snapshotText,
    snapshot_hash: textSnapshotHash(snapshotText),
    status: input.status || 'fresh',
    updated_at: input.now || nowIso(),
    metadata: {
      member_kind: input.kind,
      target_id: targetId,
      ...(input.metadata || {}),
    },
  };
}

function sourcePreviewForMember(
  member: ContentGroupMemberV1,
  resolver: ContentGroupPreviewResolver,
): string | null {
  if (member.kind === 'annotation' && member.target_id) {
    return resolver.resolveAnnotationPreview(member.target_id);
  }
  if (member.kind === 'block' && member.target_id) {
    return resolver.resolveBlockPreview(member.target_id);
  }
  if (member.kind === 'content_range' && member.content_range) {
    return resolver.resolveRangePreview(member.content_range);
  }
  if (member.kind === 'content_group') {
    return cleanOptionalText(member.current_content) || cleanOptionalText(member.preview_text) || member.label || member.target_id || null;
  }
  return null;
}

type LegacyContentGroupInterpretation = {
  role?: string | null;
  topic?: string | null;
  brief?: string | null;
};

type ContentGroupNormalizationInput = Partial<Omit<ContentGroupV1, 'identity'>> & {
  identity?: Partial<ContentGroupIdentityV1> | null;
  interpretation?: LegacyContentGroupInterpretation | null;
};

export function contentGroupMemberIdentityKey(member: ContentGroupMemberV1): string {
  if (member.kind === 'item') return `item|${member.item_id || member.id}`;
  if (member.kind === 'annotation') return `annotation|${member.target_id || ''}`;
  if (member.kind === 'block') return `block|${member.target_id || ''}`;
  if (member.kind === 'content_group') return `content_group|${member.target_id || ''}`;
  if (member.kind === 'page_slice') return `page_slice|${member.target_id || ''}`;
  if (member.kind === 'canvas_object') return `canvas_object|${member.target_id || ''}`;
  if (member.kind === 'table_region') return `table_region|${member.target_id || ''}`;
  if (member.kind === 'image_region') return `image_region|${member.target_id || ''}`;
  if (member.kind === 'future_object') return `future_object|${member.target_id || ''}`;
  const range = member.content_range;
  if (!range) return `content_range|${member.target_id || member.id}`;
  return [
    'content_range',
    range.target_kind,
    range.block_id || '',
    range.text_flow_id || '',
    range.text_unit_id || '',
    range.inline_structure_id || '',
    range.canvas_object_id || '',
    range.source_region_id || '',
    range.start_offset ?? '',
    range.end_offset ?? '',
  ].join('|');
}

function uniqueMembers(members: ContentGroupMemberV1[]): ContentGroupMemberV1[] {
  const seen = new Set<string>();
  const next: ContentGroupMemberV1[] = [];
  members.forEach((member) => {
    const key = contentGroupMemberIdentityKey(member);
    if (seen.has(key)) return;
    seen.add(key);
    next.push({
      ...member,
      order_index: next.length,
    });
  });
  return next;
}

export function createContentGroupMemberFromRange(
  range: AnnotationRangeV1,
  orderIndex = 0,
): ContentGroupMemberV1 {
  const previewText = rangePreview(range);
  return {
    id: createRuntimeId('content-member'),
    kind: 'content_range',
    target_id: range.id,
    content_range: cloneRange(range),
    label: null,
    current_content: previewText,
    source_ref: createContentGroupMemberSourceRef({
      kind: 'content_range',
      targetId: range.id,
      range,
      snapshotText: previewText,
    }),
    source_sync_status: 'fresh',
    preview_text: previewText,
    order_index: orderIndex,
    metadata: {},
  };
}

export function createContentGroupMemberFromAnnotation(
  annotation: AnnotationTruthV1,
  orderIndex = 0,
): ContentGroupMemberV1 {
  const previewText = annotationPreview(annotation);
  const activeRanges = annotation.ranges.filter(annotationRangeIsRenderable);
  return {
    id: createRuntimeId('content-member'),
    kind: 'annotation',
    target_id: annotation.id,
    content_range: null,
    label: annotation.raw_label,
    current_content: previewText,
    source_ref: createContentGroupMemberSourceRef({
      kind: 'annotation',
      targetId: annotation.id,
      range: activeRanges[0] || null,
      snapshotText: previewText,
    }),
    source_sync_status: 'fresh',
    preview_text: previewText,
    order_index: orderIndex,
    metadata: {
      source_ranges: activeRanges.map(cloneRange),
    },
  };
}

export function createContentGroupMemberFromBlock(
  block: NoteBlock,
  orderIndex = 0,
): ContentGroupMemberV1 {
  const previewText = blockPreview(block);
  return {
    id: createRuntimeId('content-member'),
    kind: 'block',
    target_id: block.id,
    content_range: null,
    label: block.block_type || 'Block',
    current_content: previewText,
    source_ref: createContentGroupMemberSourceRef({
      kind: 'block',
      targetId: block.id,
      snapshotText: previewText,
    }),
    source_sync_status: 'fresh',
    preview_text: previewText,
    order_index: orderIndex,
    metadata: {},
  };
}

export function createContentGroupMemberFromBlockReference(input: {
  blockId: string;
  label?: string | null;
  previewText?: string | null;
  sourceNoteId?: string | null;
  orderIndex?: number;
}): ContentGroupMemberV1 {
  const previewText = cleanOptionalText(input.previewText);
  const metadata = {
    source_note_id: cleanOptionalText(input.sourceNoteId) || undefined,
  };
  return {
    id: createRuntimeId('content-member'),
    kind: 'block',
    target_id: input.blockId,
    content_range: null,
    label: cleanOptionalText(input.label) || 'Block',
    current_content: previewText,
    source_ref: createContentGroupMemberSourceRef({
      kind: 'block',
      targetId: input.blockId,
      snapshotText: previewText,
      metadata,
    }),
    source_sync_status: 'fresh',
    preview_text: previewText,
    order_index: input.orderIndex ?? 0,
    metadata,
  };
}

export function createContentGroupMembersFromDragPayload(
  payload: ContentGroupDragPayload,
  options: {
    annotations?: AnnotationTruthV1[];
    blocks?: NoteBlock[];
  } = {},
): ContentGroupMemberV1[] {
  if (payload.kind === 'draft_range' || payload.kind === 'draft_ranges') {
    return payload.ranges.map((range, index) => {
      const previewText = cleanOptionalText(payload.text_preview) || rangePreview(range);
      const metadata = {
        source_note_id: cleanOptionalText(payload.source_note_id) || undefined,
      };
      return {
        ...createContentGroupMemberFromRange(range, index),
        label: cleanOptionalText(payload.label) || 'Draft range',
        current_content: previewText,
        source_ref: createContentGroupMemberSourceRef({
          kind: 'content_range',
          targetId: range.id,
          range,
          snapshotText: previewText,
          metadata,
        }),
        source_sync_status: 'fresh' as const,
        preview_text: previewText,
        metadata,
      };
    });
  }

  if (payload.kind === 'label') {
    const annotation = (options.annotations || []).find((item) => item.id === payload.annotation_id);
    if (annotation) return [createContentGroupMemberFromAnnotation(annotation, 0)];
    if (payload.ranges?.length) {
      return payload.ranges.filter(annotationRangeIsRenderable).map((range, index) => {
        const previewText = cleanOptionalText(payload.text_preview) || rangePreview(range);
        const metadata = {
          annotation_id: payload.annotation_id,
          source_note_id: cleanOptionalText(payload.source_note_id) || undefined,
        };
        return {
          ...createContentGroupMemberFromRange(range, index),
          label: cleanOptionalText(payload.label) || 'Label',
          current_content: previewText,
          source_ref: createContentGroupMemberSourceRef({
            kind: 'content_range',
            targetId: range.id,
            range,
            snapshotText: previewText,
            metadata,
          }),
          source_sync_status: 'fresh' as const,
          preview_text: previewText,
          metadata,
        };
      });
    }
    return [];
  }

  if (payload.kind === 'block') {
    const block = (options.blocks || []).find((item) => item.id === payload.block_id);
    if (block) return [createContentGroupMemberFromBlock(block, 0)];
    return [createContentGroupMemberFromBlockReference({
      blockId: payload.block_id,
      label: payload.label,
      previewText: payload.text_preview,
      sourceNoteId: payload.source_note_id,
      orderIndex: 0,
    })];
  }

  return [];
}

export function createContentGroupMemberFromContentGroup(
  group: ContentGroupV1,
  orderIndex = 0,
): ContentGroupMemberV1 {
  const previewText = group.identity.topic || group.identity.summary || group.title;
  return {
    id: createRuntimeId('content-member'),
    kind: 'content_group',
    target_id: group.id,
    content_range: null,
    label: group.title,
    current_content: previewText,
    source_ref: createContentGroupMemberSourceRef({
      kind: 'content_group',
      targetId: group.id,
      snapshotText: previewText,
    }),
    source_sync_status: 'fresh',
    preview_text: previewText,
    order_index: orderIndex,
    metadata: {},
  };
}

export function createContentGroupMemberFromPageSliceSnapshot(
  snapshot: PageSliceSnapshotV1,
  orderIndex = 0,
): ContentGroupMemberV1 {
  const previewText = cleanOptionalText(snapshot.snapshotText) || snapshot.label;
  const metadata = {
    source_note_id: snapshot.noteId,
    page_slice_snapshot_id: snapshot.id,
    page_stack_id: snapshot.pageStackId,
    page_frame_id: snapshot.pageFrameId,
    page_index: snapshot.pageIndex,
    page_total: snapshot.pageTotal,
    page_label: snapshot.label,
    block_ids: snapshot.blockIds,
    snapshot_hash: snapshot.snapshotHash,
    captured_at: snapshot.capturedAt,
    open_original: { ...snapshot.openOriginal },
  };
  return {
    id: createRuntimeId('content-member'),
    kind: 'page_slice',
    target_id: snapshot.id,
    content_range: null,
    label: snapshot.label,
    current_content: previewText,
    source_ref: createContentGroupMemberSourceRef({
      kind: 'page_slice',
      targetId: snapshot.id,
      snapshotText: previewText,
      metadata,
    }),
    source_sync_status: 'fresh',
    preview_text: previewText,
    order_index: orderIndex,
    metadata,
  };
}

export function normalizeContentGroupMember(member: ContentGroupMemberV1): ContentGroupMemberV1 {
  const kind = normalizeMemberKind(member.kind);
  const itemId = kind === 'item' ? cleanOptionalText(member.item_id) : null;
  const missingItem = kind === 'item' && !itemId;
  const range = member.content_range && typeof member.content_range === 'object'
    ? cloneRange(member.content_range)
    : null;
  const preview = cleanOptionalText(member.preview_text) || rangePreview(range);
  const metadata = cloneMetadata(member.metadata);
  const currentContent = cleanOptionalText(member.current_content) || preview;
  const sourceRef = normalizeContentGroupMemberSourceRef(member.source_ref)
    || (kind === 'item' ? null : createContentGroupMemberSourceRef({
      kind,
      targetId: typeof member.target_id === 'string' ? member.target_id : null,
      range: kind === 'content_range' ? range : null,
      snapshotText: currentContent || preview,
      metadata,
    }));
  const sourceStatus = missingItem
    ? 'missing'
    : normalizeSourceSyncStatus(
      member.source_sync_status || sourceRef?.status || (kind === 'item' ? 'fresh' : sourceRef ? 'fresh' : 'detached'),
    );
  return {
    id: typeof member.id === 'string' && member.id ? member.id : createRuntimeId('content-member'),
    kind,
    target_id: kind === 'item' ? null : typeof member.target_id === 'string' ? member.target_id : null,
    item_id: itemId,
    content_range: kind === 'content_range' ? range : null,
    label: cleanOptionalText(member.label),
    current_content: currentContent,
    source_ref: sourceRef ? { ...sourceRef, status: sourceStatus } : null,
    source_sync_status: sourceStatus,
    preview_text: preview,
    order_index: Number.isFinite(member.order_index) ? member.order_index : 0,
    metadata: missingItem
      ? {
          ...metadata,
          integrity_status: 'orphaned',
          integrity_reason: 'missing_item_reference',
        }
      : metadata,
  };
}

export function markContentGroupMemberIntegrity(
  member: ContentGroupMemberV1,
  status: ContentGroupMemberIntegrityStatus,
  reason: string,
): ContentGroupMemberV1 {
  const normalized = normalizeContentGroupMember(member);
  return {
    ...normalized,
    metadata: {
      ...(normalized.metadata || {}),
      integrity_status: status,
      integrity_reason: reason,
    },
  };
}

export function refreshContentGroupMemberPreview(
  member: ContentGroupMemberV1,
  resolver: ContentGroupPreviewResolver,
  now = nowIso(),
): ContentGroupMemberV1 {
  const normalized = normalizeContentGroupMember(member);
  let nextPreview: string | null = null;

  if (normalized.kind === 'annotation' && normalized.target_id) {
    nextPreview = resolver.resolveAnnotationPreview(normalized.target_id);
  } else if (normalized.kind === 'block' && normalized.target_id) {
    nextPreview = resolver.resolveBlockPreview(normalized.target_id);
  } else if (normalized.kind === 'content_range' && normalized.content_range) {
    nextPreview = resolver.resolveRangePreview(normalized.content_range);
  } else if (normalized.kind === 'content_group') {
    nextPreview = cleanOptionalText(normalized.preview_text) || normalized.label || normalized.target_id || null;
  } else if (
    normalized.kind === 'canvas_object'
    || normalized.kind === 'table_region'
    || normalized.kind === 'image_region'
    || normalized.kind === 'future_object'
  ) {
    return markContentGroupMemberIntegrity(normalized, 'unsupported', 'future object members are not supported yet');
  }

  if (nextPreview === null) {
    return markContentGroupMemberIntegrity(normalized, 'orphaned', 'preview source no longer resolves');
  }

  return {
    ...normalized,
    preview_text: nextPreview,
    metadata: {
      ...(normalized.metadata || {}),
      integrity_status: 'valid',
      integrity_reason: null,
      preview_refreshed_at: now,
    },
  };
}

function unsupportedSourceMember(member: ContentGroupMemberV1): boolean {
  return member.kind === 'canvas_object'
    || member.kind === 'table_region'
    || member.kind === 'image_region'
    || member.kind === 'future_object';
}

function withContentGroupMemberSourceStatus(
  member: ContentGroupMemberV1,
  status: ContentGroupMemberSourceSyncStatus,
  now: string,
): ContentGroupMemberV1 {
  const normalized = normalizeContentGroupMember(member);
  const sourceRef = normalized.source_ref
    || createContentGroupMemberSourceRef({
      kind: normalized.kind,
      targetId: normalized.target_id,
      range: normalized.content_range,
      snapshotText: normalized.current_content || normalized.preview_text,
      metadata: normalized.metadata,
      status,
      now,
    });
  return {
    ...normalized,
    source_ref: sourceRef ? { ...sourceRef, status, updated_at: now } : null,
    source_sync_status: status,
  };
}

export function compareContentGroupMemberWithSource(
  member: ContentGroupMemberV1,
  resolver: ContentGroupPreviewResolver,
  now = nowIso(),
): ContentGroupMemberV1 {
  const normalized = normalizeContentGroupMember(member);
  if (unsupportedSourceMember(normalized)) {
    return withContentGroupMemberSourceStatus(normalized, 'unsupported', now);
  }
  const sourcePreview = sourcePreviewForMember(normalized, resolver);
  if (sourcePreview === null) {
    return withContentGroupMemberSourceStatus(normalized, 'missing', now);
  }
  const snapshotText = cleanOptionalText(normalized.source_ref?.snapshot_text);
  const status = sourcePreview === snapshotText ? 'fresh' : 'changed';
  return withContentGroupMemberSourceStatus(normalized, status, now);
}

export function refreshContentGroupMemberFromSource(
  member: ContentGroupMemberV1,
  resolver: ContentGroupPreviewResolver,
  now = nowIso(),
): ContentGroupMemberV1 {
  const normalized = normalizeContentGroupMember(member);
  if (unsupportedSourceMember(normalized)) {
    return withContentGroupMemberSourceStatus(normalized, 'unsupported', now);
  }
  const sourcePreview = sourcePreviewForMember(normalized, resolver);
  if (sourcePreview === null) {
    return withContentGroupMemberSourceStatus(normalized, 'missing', now);
  }
  const sourceRef = normalizeContentGroupMemberSourceRef(normalized.source_ref)
    || createContentGroupMemberSourceRef({
      kind: normalized.kind,
      targetId: normalized.target_id,
      range: normalized.content_range,
      snapshotText: sourcePreview,
      metadata: normalized.metadata,
      now,
    });
  return {
    ...normalized,
    current_content: sourcePreview,
    preview_text: sourcePreview,
    source_ref: sourceRef ? {
      ...sourceRef,
      snapshot_text: sourcePreview,
      snapshot_hash: textSnapshotHash(sourcePreview),
      status: 'fresh',
      updated_at: now,
    } : null,
    source_sync_status: 'fresh',
    metadata: {
      ...(normalized.metadata || {}),
      integrity_status: 'valid',
      integrity_reason: null,
      preview_refreshed_at: now,
    },
  };
}

export function auditContentGroupMemberIntegrity(
  member: ContentGroupMemberV1,
  resolver: ContentGroupPreviewResolver,
): ContentGroupMemberV1 {
  const normalized = normalizeContentGroupMember(member);
  let sourcePreview: string | null = null;

  if (normalized.kind === 'annotation' && normalized.target_id) {
    sourcePreview = resolver.resolveAnnotationPreview(normalized.target_id);
  } else if (normalized.kind === 'block' && normalized.target_id) {
    sourcePreview = resolver.resolveBlockPreview(normalized.target_id);
  } else if (normalized.kind === 'content_range' && normalized.content_range) {
    sourcePreview = resolver.resolveRangePreview(normalized.content_range);
  } else if (normalized.kind === 'content_group') {
    sourcePreview = cleanOptionalText(normalized.preview_text) || normalized.label || normalized.target_id || null;
  } else if (
    normalized.kind === 'canvas_object'
    || normalized.kind === 'table_region'
    || normalized.kind === 'image_region'
    || normalized.kind === 'future_object'
  ) {
    return markContentGroupMemberIntegrity(normalized, 'unsupported', 'future object members are not supported yet');
  }

  if (sourcePreview === null) {
    return markContentGroupMemberIntegrity(normalized, 'orphaned', 'preview source no longer resolves');
  }

  if ((normalized.preview_text || '') !== sourcePreview) {
    return markContentGroupMemberIntegrity(normalized, 'stale', 'preview cache differs from source');
  }

  return markContentGroupMemberIntegrity(normalized, 'valid', 'preview source resolves');
}

export function refreshContentGroupPreviews(
  group: ContentGroupV1,
  resolver: ContentGroupPreviewResolver,
): ContentGroupV1 {
  const normalized = normalizeContentGroup(group);
  const members = normalized.members.map((member) => refreshContentGroupMemberPreview(member, resolver));
  const hasIssue = members.some((member) => (
    member.metadata?.integrity_status && member.metadata.integrity_status !== 'valid'
  ));
  const nextGroup = {
    ...normalized,
    members,
    updated_at: nowIso(),
  };
  return hasIssue ? downgradeAcceptedContentGroupIdentity(nextGroup, 'member preview refresh found unresolved content') : nextGroup;
}

export function auditContentGroupIntegrity(
  group: ContentGroupV1,
  resolver: ContentGroupPreviewResolver,
): {
  group: ContentGroupV1;
  issues: ContentGroupIntegrityIssue[];
} {
  const normalized = normalizeContentGroup(group);
  const members = normalized.members.map((member) => auditContentGroupMemberIntegrity(member, resolver));
  const issues: ContentGroupIntegrityIssue[] = [];

  members.forEach((member) => {
    const status = member.metadata?.integrity_status;
    if (!status || status === 'valid') return;
    issues.push({
      group_id: normalized.id,
      member_id: member.id,
      status,
      reason: String(member.metadata?.integrity_reason || status),
    });
  });
  return {
    group: {
      ...normalized,
      members,
    },
    issues,
  };
}

export function resolveRangePreviewFromBlocks(
  range: AnnotationRangeV1,
  blocks: NoteBlock[],
): string | null {
  if (range.target_kind === 'block' && range.block_id) {
    const block = blocks.find((item) => item.id === range.block_id);
    return block ? blockPreview(block) : null;
  }

  if (!range.block_id) return rangePreview(range);
  const block = blocks.find((item) => item.id === range.block_id);
  if (!block) return null;
  const textFlow = getTextFlowContent(block.content_json || {});
  if (!textFlow) return rangePreview(range);

  if (range.target_kind === 'text_unit' && range.text_unit_id) {
    return cleanOptionalText(textFlow.units.find((unit) => unit.id === range.text_unit_id)?.text);
  }

  if (range.target_kind === 'text_span' && range.text_unit_id) {
    const unitText = textFlow.units.find((unit) => unit.id === range.text_unit_id)?.text;
    if (typeof unitText !== 'string') return null;
    const start = Math.max(0, Math.min(unitText.length, range.start_offset ?? 0));
    const end = Math.max(start, Math.min(unitText.length, range.end_offset ?? unitText.length));
    return cleanOptionalText(unitText.slice(start, end));
  }

  return rangePreview(range);
}

export function createContentGroupPreviewResolver(input: {
  annotations: AnnotationTruthV1[];
  blocks: NoteBlock[];
}): ContentGroupPreviewResolver {
  const annotationById = new Map(input.annotations
    .filter((annotation) => annotation.status !== 'deleted')
    .map((annotation) => [annotation.id, annotation]));
  const blockById = new Map(input.blocks.map((block) => [block.id, block]));

  return {
    resolveAnnotationPreview(annotationId: string): string | null {
      const annotation = annotationById.get(annotationId);
      if (!annotation) return null;
      return annotationPreview(annotation);
    },
    resolveBlockPreview(blockId: string): string | null {
      const block = blockById.get(blockId);
      return block ? blockPreview(block) : null;
    },
    resolveRangePreview(range: AnnotationRangeV1): string | null {
      return resolveRangePreviewFromBlocks(range, input.blocks);
    },
  };
}

export function createContentGroup(input: {
  projectId: string;
  noteId: string;
  canvasId: string;
  title: string;
  members?: ContentGroupMemberV1[];
  folderId?: string | null;
  depth?: number;
  folders?: GroupFolderV1[];
  createdBy?: ContentGroupCreatedBy;
}): ContentGroupV1 {
  const timestamp = nowIso();
  const folderId = cleanOptionalText(input.folderId);
  const derivedDepth = input.folders ? groupFolderDerivedDepth(input.folders, folderId) : null;
  return {
    id: createRuntimeId('content-group'),
    project_id: input.projectId,
    note_id: input.noteId,
    canvas_id: input.canvasId,
    folder_id: folderId,
    parent_group_id: null,
    placements: folderId
      ? [{
        folder_id: folderId,
        order_index: 0,
        added_at: timestamp,
        added_by: input.createdBy || 'human',
      }]
      : [],
    depth: derivedDepth ?? (Number.isFinite(input.depth) ? Math.max(0, Math.floor(input.depth || 0)) : 0),
    title: cleanTitle(input.title),
    status: 'active',
    created_by: input.createdBy || 'human',
    created_at: timestamp,
    updated_at: timestamp,
    members: uniqueMembers((input.members || []).map(normalizeContentGroupMember)),
    identity: createEmptyContentGroupIdentity(timestamp),
    view_state: {},
    metadata: {},
  };
}

export function createEmptyContentGroupIdentity(timestamp = nowIso()): ContentGroupIdentityV1 {
  return {
    status: 'none',
    type: null,
    role: null,
    topic: null,
    summary: null,
    created_by: 'human',
    reviewed_by: null,
    confidence: null,
    updated_at: timestamp,
    accepted_at: null,
    metadata: {},
  };
}

function normalizeContentGroupIdentity(group: ContentGroupNormalizationInput): ContentGroupIdentityV1 {
  const existing = group.identity;
  const oldInterpretation = group.interpretation;
  const now = nowIso();
  const normalizedStatus = normalizeIdentityStatus(existing?.status);
  const status = normalizedStatus !== 'none'
    ? normalizedStatus
    : oldInterpretation
      ? 'draft'
      : 'none';
  const identityType = cleanOptionalText(existing?.type ?? existing?.role ?? oldInterpretation?.role);

  return {
    status,
    type: identityType,
    role: identityType,
    topic: cleanOptionalText(existing?.topic ?? oldInterpretation?.topic),
    summary: cleanOptionalText(existing?.summary ?? oldInterpretation?.brief),
    created_by: normalizeIdentityCreatedBy(existing?.created_by),
    reviewed_by: existing?.reviewed_by === 'ai' || existing?.reviewed_by === 'system' || existing?.reviewed_by === 'human'
      ? existing.reviewed_by
      : null,
    confidence: typeof existing?.confidence === 'number' ? existing.confidence : null,
    updated_at: existing?.updated_at || now,
    accepted_at: status === 'accepted' ? existing?.accepted_at || null : null,
    metadata: cloneMetadata(existing?.metadata),
  };
}

export function downgradeAcceptedContentGroupIdentity(
  group: ContentGroupV1,
  reason = 'content package changed after acceptance',
): ContentGroupV1 {
  if (group.identity.status !== 'accepted') return group;
  return {
    ...group,
    identity: {
      ...group.identity,
      status: 'draft',
      reviewed_by: null,
      accepted_at: null,
      updated_at: nowIso(),
      metadata: {
        ...(group.identity.metadata || {}),
        invalidated_reason: reason,
      },
    },
  };
}

function invalidateAcceptedIdentity(group: ContentGroupV1): ContentGroupV1 {
  return downgradeAcceptedContentGroupIdentity(group);
}

export function normalizeContentGroup(group: ContentGroupNormalizationInput): ContentGroupV1 {
  const createdAt = group.created_at || nowIso();
  const folderId = typeof group.folder_id === 'string' ? group.folder_id : null;
  return {
    id: typeof group.id === 'string' && group.id ? group.id : createRuntimeId('content-group'),
    project_id: typeof group.project_id === 'string' ? group.project_id : '',
    note_id: typeof group.note_id === 'string' ? group.note_id : '',
    canvas_id: typeof group.canvas_id === 'string' ? group.canvas_id : '',
    folder_id: folderId,
    parent_group_id: typeof group.parent_group_id === 'string' ? group.parent_group_id : null,
    placements: Array.isArray(group.placements)
      ? group.placements.filter((placement) => (
        placement
        && typeof placement === 'object'
        && typeof placement.folder_id === 'string'
      )).map((placement, index) => ({
        folder_id: placement.folder_id,
        order_index: Number.isFinite(placement.order_index) ? placement.order_index : index,
        added_at: placement.added_at || createdAt,
        added_by: normalizeCreatedBy(placement.added_by),
      }))
      : folderId
        ? [{
          folder_id: folderId,
          order_index: 0,
          added_at: createdAt,
          added_by: normalizeCreatedBy(group.created_by),
        }]
        : [],
    depth: typeof group.depth === 'number' && Number.isFinite(group.depth) ? Math.max(0, Math.floor(group.depth)) : 2,
    title: cleanTitle(group.title),
    status: normalizeStatus(group.status),
    created_by: normalizeCreatedBy(group.created_by),
    created_at: createdAt,
    updated_at: group.updated_at || createdAt,
    members: uniqueMembers(Array.isArray(group.members) ? group.members.map(normalizeContentGroupMember) : []),
    identity: normalizeContentGroupIdentity(group),
    view_state: cloneMetadata(group.view_state),
    metadata: cloneMetadata(group.metadata),
  };
}

export function summarizeContentGroupStability(input: {
  group: ContentGroupV1;
  folder?: GroupFolderV1 | null;
  sourceNoteAvailable?: boolean;
  materializeTargetAvailable?: boolean;
}): ContentGroupStabilitySummary {
  const group = normalizeContentGroup(input.group);
  const allMembers = group.members;
  const memberHasChangedSource = (member: ContentGroupMemberV1) => (
    member.source_sync_status === 'changed'
    || member.metadata?.integrity_status === 'stale'
  );
  const memberHasMissingSource = (member: ContentGroupMemberV1) => (
    member.source_sync_status === 'missing'
    || member.source_sync_status === 'unsupported'
    || member.metadata?.integrity_status === 'orphaned'
    || member.metadata?.integrity_status === 'unsupported'
  );
  const changedMemberCount = allMembers.filter(memberHasChangedSource).length;
  const missingMemberCount = allMembers.filter(memberHasMissingSource).length;

  const states = new Set<ContentGroupStabilityState>();
  if (group.status === 'deleted') states.add('deleted_group');
  if (group.members.length === 0) states.add('empty_group');
  if (changedMemberCount > 0) states.add('stale_member_source');
  if (missingMemberCount > 0) states.add('orphaned_member');
  if (input.sourceNoteAvailable === false) states.add('deleted_source_note');
  if (input.folder?.status === 'archived') states.add('archived_folder');
  if (input.materializeTargetAvailable === false) states.add('materialize_target_unavailable');
  if (
    group.identity.status === 'accepted'
    && (
      changedMemberCount > 0
      || missingMemberCount > 0
      || input.sourceNoteAvailable === false
    )
  ) {
    states.add('accepted_identity_with_stale_member');
  }
  if (states.size === 0) states.add('stable');

  const stateList = STABILITY_PRIORITY.filter((state) => states.has(state));
  const primaryState = stateList[0] || 'stable';
  const descriptor = STABILITY_LABELS[primaryState];
  const memberIssueCount = changedMemberCount + missingMemberCount;
  const canMaterialize = !states.has('deleted_group')
    && !states.has('empty_group')
    && !states.has('orphaned_member')
    && !states.has('deleted_source_note')
    && !states.has('materialize_target_unavailable');
  const materializeDisabledReason = canMaterialize
    ? null
    : states.has('materialize_target_unavailable')
      ? STABILITY_LABELS.materialize_target_unavailable.reason
      : states.has('empty_group')
        ? STABILITY_LABELS.empty_group.reason
        : states.has('deleted_group')
          ? STABILITY_LABELS.deleted_group.reason
          : states.has('deleted_source_note')
            ? STABILITY_LABELS.deleted_source_note.reason
            : STABILITY_LABELS.orphaned_member.reason;
  const acceptDisabledReason = group.status === 'deleted'
    ? STABILITY_LABELS.deleted_group.reason
    : group.members.length === 0
      ? 'Add at least one member before accepting identity.'
      : memberIssueCount > 0 || input.sourceNoteAvailable === false
        ? 'Resolve member/source stability before accepting identity.'
        : null;

  return {
    primary_state: primaryState,
    states: stateList,
    label: descriptor.label,
    reason: descriptor.reason,
    severity: descriptor.severity,
    member_issue_count: memberIssueCount,
    can_materialize: canMaterialize,
    materialize_disabled_reason: materializeDisabledReason,
    accept_disabled_reason: acceptDisabledReason,
  };
}

export function normalizeContentGroupsWithFolders(input: {
  groups: ContentGroupV1[];
  folders: GroupFolderV1[];
}): ContentGroupV1[] {
  return input.groups.map((group) => {
    const normalized = normalizeContentGroup(group);
    const folderId = normalized.folder_id || normalized.placements?.[0]?.folder_id || null;
    return {
      ...normalized,
      folder_id: folderId,
      depth: groupFolderDerivedDepth(input.folders, folderId),
    };
  });
}

export function renameContentGroup(input: {
  group: ContentGroupV1;
  title: string;
}): ContentGroupV1 {
  return {
    ...normalizeContentGroup(input.group),
    title: cleanTitle(input.title),
    updated_at: nowIso(),
  };
}

export function updateContentGroupIdentityDraft(input: {
  group: ContentGroupV1;
  type?: string | null;
  role?: string | null;
  topic?: string | null;
  summary?: string | null;
  createdBy?: ContentGroupIdentityCreatedBy;
}): ContentGroupV1 {
  const group = normalizeContentGroup(input.group);
  const identityType = cleanOptionalText(input.type ?? input.role ?? group.identity.type ?? group.identity.role);
  return {
    ...group,
    identity: {
      ...group.identity,
      status: 'draft',
      type: identityType,
      role: identityType,
      topic: cleanOptionalText(input.topic ?? group.identity.topic),
      summary: cleanOptionalText(input.summary ?? group.identity.summary),
      created_by: input.createdBy || group.identity.created_by || 'human',
      reviewed_by: null,
      accepted_at: null,
      updated_at: nowIso(),
    },
    updated_at: nowIso(),
  };
}

export function acceptContentGroupIdentity(
  group: ContentGroupV1,
  reviewedBy: ContentGroupIdentityCreatedBy = 'human',
): ContentGroupV1 {
  const normalized = normalizeContentGroup(group);
  const timestamp = nowIso();
  return {
    ...normalized,
    identity: {
      ...normalized.identity,
      status: 'accepted',
      reviewed_by: reviewedBy,
      updated_at: timestamp,
      accepted_at: timestamp,
    },
    updated_at: timestamp,
  };
}

export function rejectContentGroupIdentity(
  group: ContentGroupV1,
  reviewedBy: ContentGroupIdentityCreatedBy = 'human',
): ContentGroupV1 {
  const normalized = normalizeContentGroup(group);
  const timestamp = nowIso();
  return {
    ...normalized,
    identity: {
      ...normalized.identity,
      status: 'rejected',
      reviewed_by: reviewedBy,
      updated_at: timestamp,
      accepted_at: null,
    },
    updated_at: timestamp,
  };
}

export function archiveContentGroupIdentity(
  group: ContentGroupV1,
  reviewedBy: ContentGroupIdentityCreatedBy = 'human',
): ContentGroupV1 {
  const normalized = normalizeContentGroup(group);
  const timestamp = nowIso();
  return {
    ...normalized,
    identity: {
      ...normalized.identity,
      status: 'archived',
      reviewed_by: reviewedBy,
      updated_at: timestamp,
    },
    updated_at: timestamp,
  };
}

export function addMembersToContentGroup(
  group: ContentGroupV1,
  members: ContentGroupMemberV1[],
): ContentGroupV1 {
  const normalized = normalizeContentGroup(group);
  return invalidateAcceptedIdentity({
    ...normalized,
    members: uniqueMembers([...normalized.members, ...members.map(normalizeContentGroupMember)]),
    updated_at: nowIso(),
  });
}

export function moveContentGroupToFolder(input: {
  group: ContentGroupV1;
  folderId: string | null;
}): ContentGroupV1 {
  const normalized = normalizeContentGroup(input.group);
  const folderId = cleanOptionalText(input.folderId);
  const timestamp = nowIso();
  return {
    ...normalized,
    folder_id: folderId,
    placements: folderId
      ? [{
        folder_id: folderId,
        order_index: 0,
        added_at: timestamp,
        added_by: normalized.created_by,
      }]
      : [],
    updated_at: timestamp,
  };
}

export function removeContentGroupMember(
  group: ContentGroupV1,
  memberId: string,
): ContentGroupV1 {
  const normalized = normalizeContentGroup(group);
  return invalidateAcceptedIdentity({
    ...normalized,
    members: normalized.members
      .filter((member) => member.id !== memberId)
      .map((member, index) => ({ ...member, order_index: index })),
    updated_at: nowIso(),
  });
}

export function softDeleteContentGroup(group: ContentGroupV1): ContentGroupV1 {
  return {
    ...normalizeContentGroup(group),
    status: 'deleted',
    updated_at: nowIso(),
  };
}

export function validateContentGroupGraph(input: {
  groups: ContentGroupV1[];
  folders: GroupFolderV1[];
}): ContentGroupGraphIntegrityIssue[] {
  const activeFolderIds = new Set(input.folders
    .filter((folder) => folder.status !== 'deleted')
    .map((folder) => folder.id));
  const issues: ContentGroupGraphIntegrityIssue[] = [];

  input.groups.map(normalizeContentGroup).forEach((group) => {
    if (group.status === 'deleted') return;
    const folderId = group.folder_id || group.placements?.[0]?.folder_id || null;
    if (!folderId || !activeFolderIds.has(folderId)) {
      issues.push({
        group_id: group.id,
        status: 'missing_folder',
        reason: 'content group has no active folder placement',
      });
    }

    const allMembers = group.members;
    allMembers.forEach((member) => {
      const hasSource = Boolean(member.target_id || member.content_range);
      if (!hasSource) {
        issues.push({
          group_id: group.id,
          member_id: member.id,
          status: 'missing_member_source',
          reason: 'content group member must keep a traceable source pointer',
        });
      }
    });

    const hasMemberIssue = allMembers.some((member) => (
      member.metadata?.integrity_status
      && member.metadata.integrity_status !== 'valid'
    ));
    if (group.identity.status === 'accepted' && hasMemberIssue) {
      issues.push({
        group_id: group.id,
        status: 'accepted_group_has_issue',
        reason: 'accepted content group contains stale, unsupported, or orphaned members',
      });
    }
  });

  return issues;
}
