import api from '../../../services/api';
import {
  groupFoldersFromNoteMetadata,
  NOTE_GROUP_FOLDERS_METADATA_KEY,
  stripLegacyGroupFolderMetadata,
} from './contentGroupMetadataService';
import {
  normalizeGroupFolder,
  normalizeGroupFolders,
} from './groupFolderService';
import {
  normalizeContentGroup,
} from './contentGroupService';
export {
  legacyGroupFoldersToImport,
  mergeEntityAndLegacyGroupFolders,
  shouldImportLegacyGroupFolders,
} from './groupFolderEntityCutoverService';
import {
  legacyGroupFoldersToImport,
  mergeEntityAndLegacyGroupFolders,
  shouldImportLegacyGroupFolders,
} from './groupFolderEntityCutoverService';
import type {
  ContentGroupV1,
  GroupFolderV1,
  Note,
} from './runtimeDataTypes';

function hasLegacyGroupFolderMetadata(note: Note): boolean {
  return Boolean(
    note.metadata
    && Object.prototype.hasOwnProperty.call(note.metadata, NOTE_GROUP_FOLDERS_METADATA_KEY),
  );
}

async function stripImportedLegacyGroupFolderMetadata(note: Note): Promise<void> {
  if (!hasLegacyGroupFolderMetadata(note)) return;
  await api.put<Note>(`/notes/${note.id}`, {
    metadata: stripLegacyGroupFolderMetadata(note.metadata),
  });
}

export async function loadGroupFoldersForNote(input: {
  note: Note;
  importLegacy?: boolean;
}): Promise<GroupFolderV1[]> {
  const response = await api.get<GroupFolderV1[]>('/group-folders', {
    params: {
      course_id: input.note.course_id,
      note_id: input.note.id,
    },
  });
  const entityFolders = normalizeGroupFolders(response.data);
  const legacyFolders = groupFoldersFromNoteMetadata({
    metadata: input.note.metadata,
    projectId: input.note.course_id,
    noteId: input.note.id,
  });

  const legacyFoldersToImport = legacyGroupFoldersToImport({ entityFolders, legacyFolders });
  if (input.importLegacy !== false && shouldImportLegacyGroupFolders({ entityFolders, legacyFolders })) {
    const imported = await api.post<GroupFolderV1[]>('/group-folders/import-note-metadata', {
      note_id: input.note.id,
      folders: legacyFoldersToImport,
    });
    await stripImportedLegacyGroupFolderMetadata(input.note);
    return normalizeGroupFolders(imported.data);
  }

  if (input.importLegacy !== false) {
    await stripImportedLegacyGroupFolderMetadata(input.note);
  }

  return mergeEntityAndLegacyGroupFolders({ entityFolders, legacyFolders });
}

export async function saveGroupFoldersForNote(input: {
  noteId: string;
  folders: GroupFolderV1[];
}): Promise<GroupFolderV1[]> {
  const response = await api.put<GroupFolderV1[]>(`/group-folders/by-note/${input.noteId}`, {
    folders: normalizeGroupFolders(input.folders),
  });
  return normalizeGroupFolders(response.data);
}

export async function loadGroupFoldersForProject(input: {
  courseId: string;
  includeArchived?: boolean;
}): Promise<GroupFolderV1[]> {
  const response = await api.get<GroupFolderV1[]>('/group-folders', {
    params: {
      course_id: input.courseId,
      include_archived: input.includeArchived ? 'true' : undefined,
    },
  });
  return normalizeGroupFolders(response.data);
}

export async function saveGroupFolder(folder: GroupFolderV1): Promise<GroupFolderV1> {
  const response = await api.put<GroupFolderV1>(`/group-folders/${folder.id}`, normalizeGroupFolder(folder));
  return normalizeGroupFolder(response.data);
}

export async function moveContentGroupFolderPlacement(input: {
  groupId: string;
  folderId: string | null;
  orderIndex?: number;
}): Promise<ContentGroupV1> {
  const response = await api.put<ContentGroupV1>(`/content-groups/${input.groupId}/folder-placement`, {
    folder_id: input.folderId,
    order_index: input.orderIndex,
    added_by: 'human',
  });
  return normalizeContentGroup(response.data);
}
