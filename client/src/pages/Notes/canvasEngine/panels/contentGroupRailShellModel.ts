import { summarizeContentGroupStability } from '../contentGroupService';
import { groupFolderPath } from '../groupFolderService';
import { annotationRangeIsRenderable } from '../annotationDisplayService';
import type {
  AnnotationTruthV1,
  ContentGroupIdentityStatus,
  ContentGroupMemberV1,
  ContentGroupV1,
  GroupFolderV1,
} from '../runtimeDataTypes';

const RAIL_TOPIC_COLORS = [
  '#22d3ee',
  '#34d399',
  '#facc15',
  '#fb7185',
  '#a78bfa',
  '#38bdf8',
  '#f59e0b',
];

export interface RailGroupRowView {
  title: string;
  roleLabel: string;
  topicLabel: string;
  statusLabel: ContentGroupIdentityStatus | 'draft';
  stabilityReason: string;
  memberCountLabel: string;
  sourceLabel: string;
  topicColor: string;
}

export function cleanRailLabel(value: string | null | undefined, fallback: string): string {
  const text = value?.trim();
  return text ? text : fallback;
}

export function railFolderPathText(folders: GroupFolderV1[], folderId: string | null | undefined): string {
  const parts = groupFolderPath(folders, folderId).map((folder) => folder.title);
  return parts.length > 0 ? parts.join(' / ') : 'Note groups';
}

export function railSelectionLabel(count: number): string {
  if (count === 0) return 'No active selection';
  return `${count} selected item${count === 1 ? '' : 's'}`;
}

export function railTopicColor(topic: string | null | undefined): string {
  const label = cleanRailLabel(topic, 'No topic');
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) % RAIL_TOPIC_COLORS.length;
  }
  return RAIL_TOPIC_COLORS[Math.abs(hash) % RAIL_TOPIC_COLORS.length];
}

export function buildRailGroupRowView(input: {
  group: ContentGroupV1;
  folder: GroupFolderV1 | null;
  sourceNoteTitle: string;
}): RailGroupRowView {
  const { group, folder, sourceNoteTitle } = input;
  const stability = summarizeContentGroupStability({ group, folder });
  const status = group.identity.status === 'none' ? 'draft' : group.identity.status;
  return {
    title: cleanRailLabel(group.title, 'Untitled group'),
    roleLabel: cleanRailLabel(group.identity.role, 'no role'),
    topicLabel: cleanRailLabel(group.identity.topic, 'No topic'),
    statusLabel: status,
    stabilityReason: stability.reason,
    memberCountLabel: `${group.members.length} member${group.members.length === 1 ? '' : 's'}`,
    sourceLabel: cleanRailLabel(sourceNoteTitle, 'Current note'),
    topicColor: railTopicColor(group.identity.topic),
  };
}

export function railMemberPreview(
  member: ContentGroupMemberV1,
  annotationById: Map<string, AnnotationTruthV1>,
): string {
  if (member.current_content) return member.current_content;
  if (member.kind === 'annotation' && member.target_id) {
    const annotation = annotationById.get(member.target_id);
    if (annotation) {
      const rangePreview = annotation.ranges
        .filter(annotationRangeIsRenderable)
        .map((range) => range.range_text_cache?.trim())
        .filter((text): text is string => Boolean(text))
        .join(' | ');
      return rangePreview || annotation.raw_label;
    }
  }
  return member.preview_text || member.label || member.target_id || 'No preview';
}

export function railGroupMatchesQuery(input: {
  group: ContentGroupV1;
  row: RailGroupRowView;
  query: string;
}): boolean {
  const query = input.query.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    input.row.title,
    input.row.topicLabel,
    input.row.roleLabel,
    input.row.statusLabel,
    input.group.identity.summary,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}
