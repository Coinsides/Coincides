import api from '@/services/api';
import type { Course } from '@shared/types';
import {
  loadContentGroupsForNote,
  saveContentGroupsForNote,
} from '@/pages/Notes/canvasEngine/contentGroupRepository';
import {
  loadGroupFoldersForNote,
  saveGroupFoldersForNote,
} from '@/pages/Notes/canvasEngine/groupFolderRepository';
import {
  loadPurposeFramesForNote,
  savePurposeFramesForNote,
} from '@/pages/Notes/canvasEngine/purposeRepository';
import {
  activeGroupFolders,
  groupFolderPath,
} from '@/pages/Notes/canvasEngine/groupFolderService';
import {
  normalizeContentGroup,
} from '@/pages/Notes/canvasEngine/contentGroupService';
import type {
  ContentGroupV1,
  GroupFolderV1,
  Note,
  PurposeFrameV1,
} from '@/pages/Notes/canvasEngine/runtimeDataTypes';

export type GalleryMode = 'folder' | 'topic' | 'type';

export interface GalleryRecord {
  project: Course;
  note: Note;
  folders: GroupFolderV1[];
  groups: ContentGroupV1[];
  purposes: PurposeFrameV1[];
}

export interface GroupRef {
  record: GalleryRecord;
  group: ContentGroupV1;
}

export function makeGroupKey(noteId: string, groupId: string): string {
  return `${noteId}::${groupId}`;
}

export function makeFolderKey(noteId: string, folderId: string): string {
  return `${noteId}::${folderId}`;
}

export function splitKey(key: string | null): { noteId: string; itemId: string } | null {
  if (!key) return null;
  const [noteId, itemId] = key.split('::');
  if (!noteId || !itemId) return null;
  return { noteId, itemId };
}

export function cleanLabel(value: string | null | undefined, fallback: string): string {
  const text = (value || '').trim();
  return text || fallback;
}

export function groupPreview(group: ContentGroupV1): string {
  const memberText = group.members
    .map((member) => member.current_content || member.preview_text || member.label || member.target_id || '')
    .filter(Boolean)
    .join(' / ');
  return cleanLabel(memberText || group.identity.summary, 'No preview yet.');
}

export function memberPreview(member: ContentGroupV1['members'][number]): string {
  return cleanLabel(member.current_content || member.preview_text || member.label || member.target_id, 'No preview');
}

export function memberLabel(member: ContentGroupV1['members'][number]): string {
  if (member.kind === 'content_range') return member.label || 'Draft range';
  if (member.kind === 'annotation') return member.label || 'Label';
  if (member.kind === 'block') return member.label || 'Block';
  if (member.kind === 'content_group') return member.label || 'Content group';
  return member.label || member.kind;
}

export function folderPathText(folders: GroupFolderV1[], folderId: string | null | undefined): string {
  const path = groupFolderPath(folders, folderId);
  return path.length > 0 ? path.map((folder) => folder.title).join(' / ') : 'No folder';
}

export function activeGroups(groups: ContentGroupV1[]): ContentGroupV1[] {
  return groups
    .map(normalizeContentGroup)
    .filter((group) => group.status !== 'deleted')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function activeFolders(folders: GroupFolderV1[]): GroupFolderV1[] {
  return activeGroupFolders(folders)
    .sort((a, b) => {
      const depth = groupFolderPath(folders, a.id).length - groupFolderPath(folders, b.id).length;
      if (depth !== 0) return depth;
      return a.order_index - b.order_index || a.title.localeCompare(b.title);
    });
}

export function flattenGroups(records: GalleryRecord[]): GroupRef[] {
  return records.flatMap((record) => (
    activeGroups(record.groups).map((group) => ({ record, group }))
  ));
}

export async function loadGroupGalleryRecords(): Promise<GalleryRecord[]> {
  const courseResponse = await api.get<Course[]>('/courses');
  const projects = courseResponse.data || [];
  const noteResponses = await Promise.all(
    projects.map(async (project) => {
      const noteResponse = await api.get<Note[]>(`/notes?course_id=${project.id}`);
      return Promise.all((noteResponse.data || []).map(async (note) => {
        const groups = await loadContentGroupsForNote({ note });
        const [folders, purposes] = await Promise.all([
          loadGroupFoldersForNote({ note }),
          loadPurposeFramesForNote({ note }),
        ]);
        return {
          project,
          note,
          folders,
          groups,
          purposes,
        };
      }));
    }),
  );
  return noteResponses.flat();
}

export async function saveGalleryRecord(
  record: GalleryRecord,
  groups: ContentGroupV1[],
  folders: GroupFolderV1[],
  purposes?: PurposeFrameV1[],
): Promise<GalleryRecord> {
  const [savedGroups, savedFolders, savedPurposes] = await Promise.all([
    saveContentGroupsForNote({
      noteId: record.note.id,
      groups,
    }),
    saveGroupFoldersForNote({
      noteId: record.note.id,
      folders,
    }),
    purposes === undefined
      ? Promise.resolve(record.purposes)
      : savePurposeFramesForNote({
        noteId: record.note.id,
        purposes,
      }),
  ]);
  return {
    ...record,
    folders: savedFolders,
    groups: savedGroups,
    purposes: savedPurposes,
  };
}

export function replaceRecord(records: GalleryRecord[], nextRecord: GalleryRecord): GalleryRecord[] {
  return records.map((record) => (
    record.note.id === nextRecord.note.id ? nextRecord : record
  ));
}
