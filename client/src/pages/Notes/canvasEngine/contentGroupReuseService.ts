import {
  createContentGroup,
  normalizeContentGroup,
  normalizeContentGroupMember,
} from './contentGroupService';
import type {
  ContentGroupMemberSourceRefV1,
  ContentGroupV1,
  GroupFolderV1,
} from './runtimeDataTypes';

export type ContentGroupReuseMode =
  | 'reference'
  | 'duplicate'
  | 'fork'
  | 'materialize'
  | 'open_original';

export const CONTENT_GROUP_REUSE_MODES: ContentGroupReuseMode[] = [
  'reference',
  'duplicate',
  'fork',
  'materialize',
  'open_original',
];

export interface ContentGroupReferenceDescriptor {
  mode: 'reference';
  group_id: string;
  title: string;
  note_id: string;
  folder_id: string | null;
}

export interface ContentGroupOpenOriginalDescriptor {
  mode: 'open_original';
  group_id: string;
  note_id: string;
  folder_id: string | null;
}

export interface ContentGroupMaterializeBlockPlan {
  source_member_id: string;
  order_index: number;
  text: string;
  source_ref: ContentGroupMemberSourceRefV1 | null;
  metadata: Record<string, unknown>;
}

export interface ContentGroupMaterializePlan {
  mode: 'materialize';
  group_id: string;
  target_note_id: string;
  moves_source: false;
  blocks: ContentGroupMaterializeBlockPlan[];
}

function groupFolderId(group: ContentGroupV1): string | null {
  return group.folder_id || group.placements?.[0]?.folder_id || null;
}

function memberText(member: ContentGroupV1['members'][number]): string {
  return member.current_content || member.preview_text || member.label || member.target_id || '';
}

function cloneSourceRef(sourceRef: ContentGroupMemberSourceRefV1 | null | undefined): ContentGroupMemberSourceRefV1 | null {
  if (!sourceRef) return null;
  return {
    ...sourceRef,
    range: sourceRef.range ? { ...sourceRef.range } : null,
    metadata: sourceRef.metadata ? { ...sourceRef.metadata } : {},
  };
}

function copyGroupForContext(input: {
  group: ContentGroupV1;
  projectId: string;
  noteId: string;
  canvasId: string;
  folderId?: string | null;
  folders?: GroupFolderV1[];
  mode: 'duplicate' | 'fork';
}): ContentGroupV1 {
  const group = normalizeContentGroup(input.group);
  const copiedMembers = group.members.map(normalizeContentGroupMember);
  const nextGroup = createContentGroup({
    projectId: input.projectId,
    noteId: input.noteId,
    canvasId: input.canvasId,
    title: group.title,
    members: copiedMembers,
    folderId: input.folderId ?? groupFolderId(group),
    folders: input.folders,
    createdBy: group.created_by,
  });
  return {
    ...nextGroup,
    fragments: (group.fragments || []).map((fragment) => ({
      ...fragment,
      content_range: fragment.content_range ? { ...fragment.content_range } : null,
      metadata: fragment.metadata ? { ...fragment.metadata } : {},
    })),
    petals: group.petals.map((petal) => ({
      ...petal,
      members: petal.members.map(normalizeContentGroupMember),
      fragment_ids: [...(petal.fragment_ids || [])],
      metadata: petal.metadata ? { ...petal.metadata } : {},
    })),
    identity: {
      ...group.identity,
      metadata: group.identity.metadata ? { ...group.identity.metadata } : {},
    },
    metadata: {
      ...(group.metadata || {}),
      reuse_mode: input.mode,
      duplicated_from_group_id: input.mode === 'duplicate' ? group.id : undefined,
      forked_from_group_id: input.mode === 'fork' ? group.id : undefined,
      lineage_group_ids: input.mode === 'fork'
        ? [group.id, ...((group.metadata?.lineage_group_ids as string[] | undefined) || [])]
        : undefined,
    },
  };
}

export function createContentGroupReferenceDescriptor(group: ContentGroupV1): ContentGroupReferenceDescriptor {
  const normalized = normalizeContentGroup(group);
  return {
    mode: 'reference',
    group_id: normalized.id,
    title: normalized.title,
    note_id: normalized.note_id,
    folder_id: groupFolderId(normalized),
  };
}

export function createContentGroupOpenOriginalDescriptor(group: ContentGroupV1): ContentGroupOpenOriginalDescriptor {
  const normalized = normalizeContentGroup(group);
  return {
    mode: 'open_original',
    group_id: normalized.id,
    note_id: normalized.note_id,
    folder_id: groupFolderId(normalized),
  };
}

export function duplicateContentGroupForContext(input: {
  group: ContentGroupV1;
  projectId: string;
  noteId: string;
  canvasId: string;
  folderId?: string | null;
  folders?: GroupFolderV1[];
}): ContentGroupV1 {
  return copyGroupForContext({ ...input, mode: 'duplicate' });
}

export function forkContentGroupForContext(input: {
  group: ContentGroupV1;
  projectId: string;
  noteId: string;
  canvasId: string;
  folderId?: string | null;
  folders?: GroupFolderV1[];
}): ContentGroupV1 {
  return copyGroupForContext({ ...input, mode: 'fork' });
}

export function createContentGroupMaterializePlan(input: {
  group: ContentGroupV1;
  targetNoteId: string;
}): ContentGroupMaterializePlan {
  const group = normalizeContentGroup(input.group);
  return {
    mode: 'materialize',
    group_id: group.id,
    target_note_id: input.targetNoteId,
    moves_source: false,
    blocks: group.members.map((member, index) => {
      const normalized = normalizeContentGroupMember(member);
      return {
        source_member_id: normalized.id,
        order_index: index,
        text: memberText(normalized),
        source_ref: cloneSourceRef(normalized.source_ref),
        metadata: {
          member_kind: normalized.kind,
          content_group_id: group.id,
        },
      };
    }),
  };
}
