import type {
  ContentGroupV1,
  GroupFolderV1,
} from './runtimeDataTypes';
import {
  groupFolderPath,
} from './groupFolderService';
import {
  normalizeContentGroup,
  summarizeContentGroupStability,
  type ContentGroupStabilitySummary,
} from './contentGroupService';

export interface ContentGroupIndexEntry {
  group: ContentGroupV1;
  folder_id: string | null;
  folder_path: string[];
  topic: string | null;
  type: string | null;
  identity_status: ContentGroupV1['identity']['status'];
  member_count: number;
  petal_count: number;
  has_integrity_issue: boolean;
  stability: ContentGroupStabilitySummary;
}

export function buildContentGroupIndex(input: {
  groups: ContentGroupV1[];
  folders: GroupFolderV1[];
  includeHidden?: boolean;
}): ContentGroupIndexEntry[] {
  return input.groups
    .map(normalizeContentGroup)
    .filter((group) => group.status !== 'deleted')
    .filter((group) => input.includeHidden || group.status !== 'hidden')
    .map((group) => {
      const folderId = group.folder_id || group.placements?.[0]?.folder_id || null;
      const folder = input.folders.find((item) => item.id === folderId) || null;
      const folderPath = groupFolderPath(input.folders, folderId).map((folder) => folder.title);
      const allMembers = [
        ...group.members,
        ...group.petals.flatMap((petal) => petal.members),
      ];
      const stability = summarizeContentGroupStability({ group, folder });
      return {
        group,
        folder_id: folderId,
        folder_path: folderPath,
        topic: group.identity.topic || null,
        type: group.identity.type || group.identity.role || null,
        identity_status: group.identity.status,
        member_count: group.members.length,
        petal_count: group.petals.filter((petal) => petal.status !== 'deleted').length,
        has_integrity_issue: allMembers.some((member) => (
          member.metadata?.integrity_status
          && member.metadata.integrity_status !== 'valid'
        )) || stability.member_issue_count > 0,
        stability,
      };
    })
    .sort((a, b) => {
      const folderCompare = a.folder_path.join('/').localeCompare(b.folder_path.join('/'));
      if (folderCompare !== 0) return folderCompare;
      const updatedCompare = b.group.updated_at.localeCompare(a.group.updated_at);
      if (updatedCompare !== 0) return updatedCompare;
      return a.group.title.localeCompare(b.group.title);
    });
}

export function filterContentGroupIndex(input: {
  entries: ContentGroupIndexEntry[];
  query?: string;
  folderId?: string | null;
  type?: string | null;
  topic?: string | null;
}): ContentGroupIndexEntry[] {
  const query = (input.query || '').trim().toLowerCase();
  const type = (input.type || '').trim().toLowerCase();
  const topic = (input.topic || '').trim().toLowerCase();
  return input.entries.filter((entry) => {
    if (input.folderId && entry.folder_id !== input.folderId) return false;
    if (type && (entry.type || '').toLowerCase() !== type) return false;
    if (topic && !(entry.topic || '').toLowerCase().includes(topic)) return false;
    if (!query) return true;
    return [
      entry.group.title,
      entry.topic || '',
      entry.type || '',
      entry.folder_path.join(' / '),
      entry.group.identity.summary || '',
    ].join(' ').toLowerCase().includes(query);
  });
}
