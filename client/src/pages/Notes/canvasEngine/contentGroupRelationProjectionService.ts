import type {
  ContentGroupMemberV1,
  ContentGroupPetalV1,
  ContentGroupV1,
} from './runtimeDataTypes';
import {
  normalizeContentGroup,
} from './contentGroupService';

export type ContentGroupRelationEndpointKind = 'group' | 'petal' | 'member';

export interface ContentGroupRelationEndpointCandidate {
  id: string;
  kind: ContentGroupRelationEndpointKind;
  group_id: string;
  petal_id?: string;
  member_id?: string;
  label: string;
  role?: string | null;
  topic?: string | null;
  preview_text?: string | null;
  accepted: boolean;
  target_ref: {
    kind: ContentGroupMemberV1['kind'] | 'content_group' | 'content_petal';
    target_id?: string | null;
    content_range_id?: string | null;
  };
}

function memberPreview(member: ContentGroupMemberV1): string | null {
  return member.preview_text || member.label || member.target_id || null;
}

function memberCandidate(input: {
  group: ContentGroupV1;
  member: ContentGroupMemberV1;
  petal?: ContentGroupPetalV1;
}): ContentGroupRelationEndpointCandidate {
  return {
    id: input.petal
      ? `group:${input.group.id}:petal:${input.petal.id}:member:${input.member.id}`
      : `group:${input.group.id}:member:${input.member.id}`,
    kind: 'member',
    group_id: input.group.id,
    petal_id: input.petal?.id,
    member_id: input.member.id,
    label: input.member.label || input.group.title,
    role: input.group.identity.role || null,
    topic: input.group.identity.topic || null,
    preview_text: memberPreview(input.member),
    accepted: input.group.identity.status === 'accepted',
    target_ref: {
      kind: input.member.kind,
      target_id: input.member.target_id,
      content_range_id: input.member.content_range?.id || null,
    },
  };
}

export function buildContentGroupRelationCandidates(groups: ContentGroupV1[]): ContentGroupRelationEndpointCandidate[] {
  return groups
    .map(normalizeContentGroup)
    .filter((group) => group.status !== 'deleted')
    .flatMap((group) => {
      const groupCandidate: ContentGroupRelationEndpointCandidate = {
        id: `group:${group.id}`,
        kind: 'group',
        group_id: group.id,
        label: group.title,
        role: group.identity.role || null,
        topic: group.identity.topic || null,
        preview_text: group.identity.summary || group.members.map(memberPreview).filter(Boolean).slice(0, 2).join(' | '),
        accepted: group.identity.status === 'accepted',
        target_ref: {
          kind: 'content_group',
          target_id: group.id,
        },
      };
      const petalCandidates = group.petals
        .filter((petal) => petal.status !== 'deleted')
        .map((petal): ContentGroupRelationEndpointCandidate => ({
          id: `group:${group.id}:petal:${petal.id}`,
          kind: 'petal',
          group_id: group.id,
          petal_id: petal.id,
          label: petal.label,
          role: group.identity.role || null,
          topic: group.identity.topic || null,
          preview_text: petal.members.map(memberPreview).filter(Boolean).slice(0, 2).join(' | '),
          accepted: group.identity.status === 'accepted',
          target_ref: {
            kind: 'content_petal',
            target_id: petal.id,
          },
        }));
      const memberCandidates = [
        ...group.members.map((member) => memberCandidate({ group, member })),
        ...group.petals.flatMap((petal) => petal.members.map((member) => memberCandidate({ group, petal, member }))),
      ];
      return [groupCandidate, ...petalCandidates, ...memberCandidates];
    });
}
