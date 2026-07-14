import type {
  PurposeCompiledItemPathV1,
  PurposeCompiledItemV1,
  PurposeCompiledMembershipKind,
  PurposeCompiledScopeV1,
  PurposeCreatedBy,
  PurposeFrameV1,
  PurposeMemberKind,
  PurposeMemberV1,
  PurposeScopedItemV1,
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
  return kind === 'item' ? 'item' : 'content_group';
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

function purposeWithOrderedMembers(
  purpose: PurposeFrameV1,
  members: PurposeMemberV1[],
): PurposeFrameV1 {
  const timestamp = nowIso();
  return normalizePurposeFrame({
    ...purpose,
    members: members.map((member, index) => ({
      ...member,
      purpose_id: purpose.id,
      order_index: index,
      updated_at: member.updated_at || timestamp,
    })),
    updated_at: timestamp,
  });
}

export function upsertPurposeItemMember(input: {
  purpose: PurposeFrameV1;
  itemId: string;
  role?: string | null;
  fitness?: string;
}): PurposeFrameV1 {
  const purpose = normalizePurposeFrame(input.purpose);
  const itemId = cleanText(input.itemId, '');
  if (!itemId) return purpose;
  const timestamp = nowIso();
  const existingIndex = purpose.members.findIndex((member) => (
    member.member_kind === 'item' && member.member_id === itemId
  ));
  const nextMember: PurposeMemberV1 = existingIndex >= 0
    ? {
        ...purpose.members[existingIndex]!,
        role: input.role === undefined
          ? purpose.members[existingIndex]!.role || null
          : cleanOptionalText(input.role),
        fitness: input.fitness === undefined
          ? purpose.members[existingIndex]!.fitness
          : cleanText(input.fitness, 'unknown'),
        updated_at: timestamp,
      }
    : {
        id: `purpose-member-${crypto.randomUUID()}`,
        purpose_id: purpose.id,
        member_kind: 'item',
        member_id: itemId,
        role: cleanOptionalText(input.role),
        fitness: cleanText(input.fitness, 'unknown'),
        order_index: purpose.members.length,
        metadata: {},
        created_at: timestamp,
        updated_at: timestamp,
      };
  const members = existingIndex >= 0
    ? purpose.members.map((member, index) => index === existingIndex ? nextMember : member)
    : [...purpose.members, nextMember];
  return purposeWithOrderedMembers(purpose, members);
}

export function removePurposeItemMember(input: {
  purpose: PurposeFrameV1;
  itemId: string;
}): PurposeFrameV1 {
  const purpose = normalizePurposeFrame(input.purpose);
  return purposeWithOrderedMembers(
    purpose,
    purpose.members.filter((member) => !(
      member.member_kind === 'item' && member.member_id === input.itemId
    )),
  );
}

export function movePurposeMember(input: {
  purpose: PurposeFrameV1;
  memberId: string;
  direction: 'up' | 'down';
}): PurposeFrameV1 {
  const purpose = normalizePurposeFrame(input.purpose);
  const currentIndex = purpose.members.findIndex((member) => (
    member.id === input.memberId || member.member_id === input.memberId
  ));
  if (currentIndex < 0) return purpose;
  const targetIndex = input.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= purpose.members.length) return purpose;
  const members = [...purpose.members];
  [members[currentIndex], members[targetIndex]] = [members[targetIndex]!, members[currentIndex]!];
  return purposeWithOrderedMembers(purpose, members);
}

function normalizeCompiledMembershipKind(value: unknown): PurposeCompiledMembershipKind {
  if (value === 'direct_and_derived' || value === 'derived') return value;
  return 'direct';
}

function normalizePurposeCompiledPath(value: Partial<PurposeCompiledItemPathV1>): PurposeCompiledItemPathV1 {
  return {
    kind: value.kind === 'content_group' ? 'content_group' : 'direct',
    purpose_member_id: cleanText(value.purpose_member_id, ''),
    role: cleanOptionalText(value.role),
    fitness: cleanText(value.fitness, 'unknown'),
    order_index: Number.isFinite(value.order_index) ? Math.max(0, Math.floor(value.order_index || 0)) : 0,
    content_group_id: cleanOptionalText(value.content_group_id),
    content_group_title: cleanOptionalText(value.content_group_title),
    content_group_member_id: cleanOptionalText(value.content_group_member_id),
    content_group_order_index: Number.isFinite(value.content_group_order_index)
      ? Math.max(0, Math.floor(value.content_group_order_index || 0))
      : null,
  };
}

function normalizePurposeScopedItem(value: Partial<PurposeScopedItemV1>): PurposeScopedItemV1 {
  return {
    id: cleanText(value.id, ''),
    body_json: cloneMetadata(value.body_json),
    plain_text: typeof value.plain_text === 'string' ? value.plain_text : '',
    item_type: cleanOptionalText(value.item_type),
    topic: cleanOptionalText(value.topic),
    status: value.status === 'retired' ? 'retired' : 'active',
    retired_into_item_id: cleanOptionalText(value.retired_into_item_id),
    origin_course_id: cleanOptionalText(value.origin_course_id),
    origin_note_id: cleanOptionalText(value.origin_note_id),
    created_by: cleanText(value.created_by, 'human'),
    metadata: cloneMetadata(value.metadata),
    created_at: cleanText(value.created_at, ''),
    updated_at: cleanText(value.updated_at, ''),
  };
}

export function normalizePurposeCompiledScope(
  value: Partial<PurposeCompiledScopeV1>,
): PurposeCompiledScopeV1 {
  const items = (Array.isArray(value.items) ? value.items : [])
    .map((entry): PurposeCompiledItemV1 => {
      const candidate = entry as Partial<PurposeCompiledItemV1>;
      const direct = candidate.direct === true;
      const derived = candidate.derived === true;
      return {
        item: normalizePurposeScopedItem(candidate.item || {}),
        direct,
        derived,
        membership_kind: direct && derived
          ? 'direct_and_derived'
          : direct ? 'direct' : derived ? 'derived' : normalizeCompiledMembershipKind(candidate.membership_kind),
        paths: (Array.isArray(candidate.paths) ? candidate.paths : [])
          .map((path) => normalizePurposeCompiledPath(path)),
      };
    })
    .filter((entry) => entry.item.id.length > 0 && entry.item.status === 'active');
  return {
    purpose_id: cleanText(value.purpose_id, ''),
    note_id: cleanOptionalText(value.note_id),
    project_id: cleanOptionalText(value.project_id),
    query: typeof value.query === 'string' ? value.query : undefined,
    items,
    total: Number.isFinite(value.total) ? Math.max(0, Math.floor(value.total || 0)) : items.length,
  };
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
