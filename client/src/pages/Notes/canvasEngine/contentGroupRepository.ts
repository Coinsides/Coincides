import api from '@/services/api';
import {
  legacyContentGroupsFromNoteMetadata,
} from './contentGroupMetadataService';
import {
  normalizeContentGroup,
} from './contentGroupService';
import {
  mergeEntityAndLegacyContentGroups,
  shouldImportLegacyContentGroups,
} from './contentGroupEntityCutoverService';
import type {
  ContentGroupV1,
  Note,
} from './runtimeDataTypes';

type ContentGroupStatusFilter = ContentGroupV1['status'] | 'all';

export async function loadContentGroupsForNote(input: {
  note: Note;
  importLegacy?: boolean;
}): Promise<ContentGroupV1[]> {
  const response = await api.get<ContentGroupV1[]>('/content-groups', {
    params: {
      course_id: input.note.course_id,
      note_id: input.note.id,
    },
  });
  const entityGroups = response.data.map(normalizeContentGroup);
  const legacyGroups = legacyContentGroupsFromNoteMetadata(input.note.metadata);

  if (input.importLegacy !== false && shouldImportLegacyContentGroups({ entityGroups, legacyGroups })) {
    const imported = await api.post<ContentGroupV1[]>('/content-groups/import-note-metadata', {
      note_id: input.note.id,
      groups: legacyGroups,
    });
    return imported.data.map(normalizeContentGroup);
  }

  return mergeEntityAndLegacyContentGroups({ entityGroups, legacyGroups });
}

export async function saveContentGroupsForNote(input: {
  noteId: string;
  groups: ContentGroupV1[];
}): Promise<ContentGroupV1[]> {
  const response = await api.put<ContentGroupV1[]>(`/content-groups/by-note/${input.noteId}`, {
    groups: input.groups.map(normalizeContentGroup),
  });
  return response.data.map(normalizeContentGroup);
}

export async function loadContentGroupsForProject(input: {
  courseId: string;
  status?: ContentGroupStatusFilter;
}): Promise<ContentGroupV1[]> {
  const response = await api.get<ContentGroupV1[]>('/content-groups', {
    params: {
      course_id: input.courseId,
      status: input.status,
    },
  });
  return response.data.map(normalizeContentGroup);
}
