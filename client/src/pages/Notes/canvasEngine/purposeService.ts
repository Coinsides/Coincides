import type {
  PurposeCreatedBy,
  PurposeFrameV1,
  PurposeMemberKind,
  PurposeMemberV1,
  PurposeStatus,
} from './runtimeDataTypes';

function nowIso(): string {
  return new Date().toISOString();
}

function cleanOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanText(value: unknown, fallback: string): string {
  return cleanOptionalText(value) || fallback;
}

function cloneMetadata(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function normalizeStatus(status: unknown): PurposeStatus {
  return status === 'archived' ? 'archived' : 'active';
}

function normalizeCreatedBy(createdBy: unknown): PurposeCreatedBy {
  if (
    createdBy === 'ai'
    || createdBy === 'system'
    || createdBy === 'ai_proposal'
    || createdBy === 'importer'
  ) {
    return createdBy;
  }
  return 'human';
}

function normalizeMemberKind(kind: unknown): PurposeMemberKind {
  return kind === 'content_group' ? 'content_group' : 'content_group';
}

export function normalizePurposeMember(member: Partial<PurposeMemberV1>): PurposeMemberV1 {
  const timestamp = nowIso();
  return {
    id: cleanText(member.id, `purpose-member-${crypto.randomUUID()}`),
    purpose_id: cleanText(member.purpose_id, ''),
    member_kind: normalizeMemberKind(member.member_kind),
    member_id: cleanText(member.member_id, ''),
    role: cleanOptionalText(member.role),
    fitness: cleanText(member.fitness, 'unknown'),
    order_index: Number.isFinite(member.order_index) ? Math.max(0, Math.floor(member.order_index || 0)) : 0,
    metadata: cloneMetadata(member.metadata),
    created_at: member.created_at || timestamp,
    updated_at: member.updated_at || timestamp,
  };
}

export function normalizePurposeFrame(purpose: Partial<PurposeFrameV1>): PurposeFrameV1 {
  const timestamp = nowIso();
  const id = cleanText(purpose.id, `purpose-${crypto.randomUUID()}`);
  return {
    id,
    project_id: cleanText(purpose.project_id || purpose.course_id, ''),
    course_id: cleanOptionalText(purpose.course_id || purpose.project_id),
    note_id: cleanOptionalText(purpose.note_id),
    title: cleanText(purpose.title, 'Untitled purpose'),
    intent: cleanOptionalText(purpose.intent),
    scope_note: cleanOptionalText(purpose.scope_note),
    status: normalizeStatus(purpose.status),
    is_note_default: purpose.is_note_default === true,
    created_by: normalizeCreatedBy(purpose.created_by),
    members: (Array.isArray(purpose.members) ? purpose.members : [])
      .map((member, index) => ({
        ...normalizePurposeMember(member),
        purpose_id: id,
        order_index: index,
      }))
      .filter((member) => member.member_id.length > 0),
    metadata: cloneMetadata(purpose.metadata),
    created_at: purpose.created_at || timestamp,
    updated_at: purpose.updated_at || timestamp,
  };
}

export function normalizePurposeFrames(purposes: PurposeFrameV1[]): PurposeFrameV1[] {
  return purposes.map(normalizePurposeFrame);
}

export function activePurposeFrames(purposes: PurposeFrameV1[]): PurposeFrameV1[] {
  return normalizePurposeFrames(purposes)
    .filter((purpose) => purpose.status === 'active')
    .sort((left, right) => {
      if (left.is_note_default !== right.is_note_default) return left.is_note_default ? -1 : 1;
      return right.updated_at.localeCompare(left.updated_at) || left.title.localeCompare(right.title);
    });
}

export function purposeMemberForContentGroup(
  purposes: PurposeFrameV1[],
  groupId: string,
): PurposeMemberV1 | null {
  for (const purpose of activePurposeFrames(purposes)) {
    const member = purpose.members.find((candidate) => (
      candidate.member_kind === 'content_group'
      && candidate.member_id === groupId
    ));
    if (member) return member;
  }
  return null;
}

export function purposeRoleForContentGroup(
  purposes: PurposeFrameV1[],
  groupId: string,
): string | null {
  return purposeMemberForContentGroup(purposes, groupId)?.role || null;
}

export function upsertDefaultPurposeRoleForContentGroup(input: {
  purposes: PurposeFrameV1[];
  groupId: string;
  role: string | null;
}): PurposeFrameV1[] {
  const activePurposes = activePurposeFrames(input.purposes);
  const defaultPurpose = activePurposes.find((purpose) => purpose.is_note_default) || activePurposes[0] || null;
  if (!defaultPurpose) return input.purposes.map(normalizePurposeFrame);

  const normalizedRole = cleanOptionalText(input.role);
  const timestamp = nowIso();
  const existingIndex = defaultPurpose.members.findIndex((member) => (
    member.member_kind === 'content_group'
    && member.member_id === input.groupId
  ));
  const nextMembers = existingIndex >= 0
    ? defaultPurpose.members.map((member, index) => (
      index === existingIndex
        ? { ...member, role: normalizedRole, updated_at: timestamp }
        : member
    ))
    : [
      ...defaultPurpose.members,
      {
        id: `purpose-member-${crypto.randomUUID()}`,
        purpose_id: defaultPurpose.id,
        member_kind: 'content_group' as const,
        member_id: input.groupId,
        role: normalizedRole,
        fitness: 'unknown',
        order_index: defaultPurpose.members.length,
        metadata: {},
        created_at: timestamp,
        updated_at: timestamp,
      },
    ];

  return input.purposes.map((purpose) => (
    purpose.id === defaultPurpose.id
      ? normalizePurposeFrame({
        ...purpose,
        members: nextMembers,
        updated_at: timestamp,
      })
      : normalizePurposeFrame(purpose)
  ));
}
