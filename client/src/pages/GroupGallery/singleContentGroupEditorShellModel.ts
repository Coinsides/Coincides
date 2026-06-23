import {
  summarizeContentGroupStability,
} from '@/pages/Notes/canvasEngine/contentGroupService';
import type {
  ContentGroupIdentityStatus,
  ContentGroupMemberV1,
  ContentGroupV1,
  GroupFolderV1,
  Note,
} from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import {
  cleanLabel,
  folderPathText,
  memberLabel,
  memberPreview,
} from './groupGalleryData';

export interface SingleEditorShellView {
  title: string;
  statusLabel: ContentGroupIdentityStatus | 'draft';
  statusKind: ContentGroupIdentityStatus | 'draft';
  topicLabel: string;
  roleLabel: string;
  summaryPreview: string;
  sourceNoteTitle: string;
  folderPath: string;
  memberCountLabel: string;
  petalCountLabel: string;
  stabilityLabel: string;
  stabilityReason: string;
  canAccept: boolean;
  acceptReason: string | null;
}

export interface SingleEditorMemberShellRow {
  id: string;
  label: string;
  kindLabel: string;
  preview: string;
  sourceStatusLabel: string;
}

export function singleEditorGroupFolderId(group: ContentGroupV1): string | null {
  return group.folder_id || group.placements?.[0]?.folder_id || null;
}

export function buildSingleEditorShellView(input: {
  group: ContentGroupV1;
  note: Note;
  folders: GroupFolderV1[];
  folder: GroupFolderV1 | null;
}): SingleEditorShellView {
  const stability = summarizeContentGroupStability({
    group: input.group,
    folder: input.folder,
  });
  const activePetals = input.group.petals.filter((petal) => petal.status !== 'deleted');
  const statusKind = input.group.identity.status === 'none' ? 'draft' : input.group.identity.status;
  const folderId = singleEditorGroupFolderId(input.group);

  return {
    title: cleanLabel(input.group.title, 'Untitled group'),
    statusLabel: statusKind,
    statusKind,
    topicLabel: cleanLabel(input.group.identity.topic, 'No topic'),
    roleLabel: cleanLabel(input.group.identity.role, 'No role'),
    summaryPreview: cleanLabel(input.group.identity.summary, 'No summary yet.'),
    sourceNoteTitle: cleanLabel(input.note.title, 'Untitled note'),
    folderPath: folderPathText(input.folders, folderId),
    memberCountLabel: `${input.group.members.length} members`,
    petalCountLabel: `${activePetals.length} petals`,
    stabilityLabel: stability.label,
    stabilityReason: stability.reason,
    canAccept: !stability.accept_disabled_reason,
    acceptReason: stability.accept_disabled_reason,
  };
}

export function buildSingleEditorMemberRows(group: ContentGroupV1): SingleEditorMemberShellRow[] {
  return group.members.map((member) => ({
    id: member.id,
    label: memberLabel(member),
    kindLabel: member.kind,
    preview: memberPreview(member),
    sourceStatusLabel: sourceStatusLabel(member),
  }));
}

export function buildSingleEditorMemberHint(group: ContentGroupV1, memberId: string): string {
  const member = group.members.find((item) => item.id === memberId);
  if (!member) return 'Source member missing';
  return `${memberLabel(member)} / ${memberPreview(member)}`;
}

function sourceStatusLabel(member: ContentGroupMemberV1): string {
  if (member.source_sync_status === 'changed') return 'source changed';
  if (member.source_sync_status === 'missing') return 'source missing';
  if (member.source_sync_status === 'unsupported') return 'source unsupported';
  if (member.source_sync_status === 'fresh') return 'source fresh';
  if (member.source_ref) return 'source linked';
  return 'local member';
}
