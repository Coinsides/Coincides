import {
  ensureGroupFolderRoots,
  normalizeGroupFolders,
} from './groupFolderService';
import {
  normalizeContentGroup,
  normalizeContentGroupsWithFolders,
} from './contentGroupService';
import type {
  ContentGroupV1,
  GroupFolderV1,
} from './runtimeDataTypes';

export const NOTE_CONTENT_GROUPS_METADATA_KEY = 'canvas_engine_content_groups_v1';
export const NOTE_GROUP_FOLDERS_METADATA_KEY = 'canvas_engine_group_folders_v1';
export const NOTE_ANNOTATIONS_METADATA_KEY = 'canvas_engine_annotations_v1';
export const NOTE_READING_INTERPRETATIONS_METADATA_KEY = 'canvas_engine_reading_interpretations_v1';
export const NOTE_ANNOTATION_PROPOSALS_METADATA_KEY = 'canvas_engine_annotation_proposals_v1';

export function legacyContentGroupsFromNoteMetadata(metadata: Record<string, unknown> | undefined): ContentGroupV1[] {
  const groups = metadata?.[NOTE_CONTENT_GROUPS_METADATA_KEY];
  if (!Array.isArray(groups)) return [];
  return groups.filter((item): item is ContentGroupV1 => (
    Boolean(item)
    && typeof item === 'object'
    && typeof (item as ContentGroupV1).id === 'string'
    && typeof (item as ContentGroupV1).title === 'string'
    && Array.isArray((item as ContentGroupV1).members)
  )).map(normalizeContentGroup);
}

export function contentGroupsFromNoteMetadata(metadata: Record<string, unknown> | undefined): ContentGroupV1[] {
  return legacyContentGroupsFromNoteMetadata(metadata);
}

export function groupFoldersFromNoteMetadata(input: {
  metadata: Record<string, unknown> | undefined;
  projectId?: string | null;
  noteId?: string | null;
}): GroupFolderV1[] {
  return ensureGroupFolderRoots({
    folders: normalizeGroupFolders(input.metadata?.[NOTE_GROUP_FOLDERS_METADATA_KEY]),
    projectId: input.projectId,
    noteId: input.noteId,
  });
}

export function stripLegacyContentGroupMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(metadata || {}) };
  delete next[NOTE_CONTENT_GROUPS_METADATA_KEY];
  return next;
}

export function stripLegacyGroupFolderMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(metadata || {}) };
  delete next[NOTE_GROUP_FOLDERS_METADATA_KEY];
  return next;
}

/**
 * Legacy helper for pre-8.7.2 GroupFolder metadata snapshots.
 * New GroupFolder writes must use groupFolderRepository.ts and /api/group-folders.
 */
export function writeGroupFolderMetadata(input: {
  metadata: Record<string, unknown> | undefined;
  folders: GroupFolderV1[];
}): Record<string, unknown> {
  return {
    ...stripLegacyContentGroupMetadata(input.metadata),
    [NOTE_GROUP_FOLDERS_METADATA_KEY]: normalizeGroupFolders(input.folders),
  };
}

export function writeContentGroupMetadata(input: {
  metadata: Record<string, unknown> | undefined;
  groups: ContentGroupV1[];
  folders: GroupFolderV1[];
}): Record<string, unknown> {
  return {
    ...(input.metadata || {}),
    [NOTE_CONTENT_GROUPS_METADATA_KEY]: normalizeContentGroupsWithFolders({
      groups: input.groups.map(normalizeContentGroup),
      folders: input.folders,
    }),
    [NOTE_GROUP_FOLDERS_METADATA_KEY]: normalizeGroupFolders(input.folders),
  };
}
