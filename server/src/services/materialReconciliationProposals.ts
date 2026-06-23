import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { listCourseMaterials, listSourceFragments } from './courseMaterials.js';
import { getNoteBlockTemplate } from '../lib/noteBlockTemplates.js';
import { resolveSourceBoardForProposal } from './sourceBoards.js';
import { resolveSourceScopesForProposal } from './sourceScopes.js';

export const RECONCILIATION_GROUP_KINDS = [
  'DUPLICATE',
  'OVERLAP',
  'SAME_CONCEPT_EVIDENCE',
  'CONFLICT',
] as const;

export const RECONCILIATION_SUGGESTED_ACTIONS = [
  'review',
  'keep_separate',
  'defer',
  'future_merge_candidate',
  'mark_conflict',
] as const;

type GroupKind = typeof RECONCILIATION_GROUP_KINDS[number];

interface CreateMaterialReconciliationProposalInput {
  course_id: string;
  document_ids?: string[];
  source_material_ids?: string[];
  segment_ids?: string[];
  source_scope_ids?: string[];
  source_board_id?: string;
}

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
}

const MATERIAL_RECONCILIATION_DECISIONS = [
  'accepted_evidence_set',
  'kept_separate',
  'deferred',
  'excluded',
  'mark_conflict',
] as const;

type MaterialReconciliationDecision = typeof MATERIAL_RECONCILIATION_DECISIONS[number];

interface ApplyMaterialReconciliationInput {
  group_decisions?: Array<{
    group_id: string;
    decision: MaterialReconciliationDecision;
  }>;
}

interface FragmentEvidence {
  source_material_id: string;
  source_fragment_id: string;
  material_segment_id: string | null;
  document_id: string;
  document_chunk_id: string | null;
  title: string | null;
  page_start: number | null;
  page_end: number | null;
  excerpt: string;
  reason: string;
}

interface LearningRoleCandidate {
  learning_role: string;
  confidence: number;
  reason: string;
  source_fragment_ids: string[];
}

interface TemplateCandidate {
  template_id: string;
  label: string;
  confidence: number;
  reason: string;
}

interface ReconciliationCandidateGroup {
  group_id: string;
  group_kind: GroupKind;
  confidence: number | null;
  suggested_action: string;
  title: string;
  evidence: FragmentEvidence[];
  warnings: string[];
  learning_role_candidates: LearningRoleCandidate[];
  template_candidates: TemplateCandidate[];
  role_confidence: number;
  role_warnings: string[];
  blocked_by_safety: boolean;
  safety_reasons: string[];
}

interface FragmentCandidate {
  id: string;
  source_material_id: string;
  document_id: string;
  document_chunk_id: string | null;
  title: string | null;
  content: string;
  page_start: number | null;
  page_end: number | null;
  order_index: number;
  material_segment_id: string | null;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function roleSourceText(group: Pick<ReconciliationCandidateGroup, 'title' | 'evidence'>): string {
  return normalizeText([
    group.title,
    ...(group.evidence || []).flatMap((evidence) => [
      evidence.title || '',
      evidence.excerpt || '',
      evidence.reason || '',
    ]),
  ].join(' '));
}

const ROLE_TEMPLATE_BY_ROLE: Record<string, string> = {
  definition: 'text.paragraph',
  theorem: 'text.paragraph',
  proof: 'text.paragraph',
  formula: 'formula.math',
  example: 'text.paragraph',
  exercise: 'text.paragraph',
  answer: 'text.paragraph',
  warning: 'text.paragraph',
  concept: 'text.paragraph',
  note: 'text.paragraph',
};

function inferLearningRole(group: Pick<ReconciliationCandidateGroup, 'title' | 'evidence'>): {
  role: string;
  confidence: number;
  reason: string;
  warnings: string[];
} {
  const text = roleSourceText(group);
  const checks: Array<{ role: string; confidence: number; reason: string; pattern: RegExp }> = [
    { role: 'definition', confidence: 0.82, reason: 'heading/content uses definition language', pattern: /\bdefinition\b|\bdefine\b|\bis called\b|\bmeans\b/ },
    { role: 'theorem', confidence: 0.82, reason: 'heading/content uses theorem language', pattern: /\btheorem\b|\blemma\b|\bproposition\b|\bcorollary\b/ },
    { role: 'proof', confidence: 0.82, reason: 'heading/content uses proof language', pattern: /\bproof\b|\bprove\b|\bshown by\b|\btherefore\b/ },
    { role: 'formula', confidence: 0.78, reason: 'content appears to describe a formula or equation', pattern: /\bformula\b|\bequation\b|\bsolve for\b|\\frac|\\sum|[=<>]\s*[a-z0-9]/ },
    { role: 'example', confidence: 0.76, reason: 'heading/content uses example language', pattern: /\bexample\b|\be g\b|\bfor instance\b/ },
    { role: 'exercise', confidence: 0.76, reason: 'heading/content uses exercise or problem language', pattern: /\bexercise\b|\bproblem\b|\bquestion\b|\bpractice\b/ },
    { role: 'answer', confidence: 0.72, reason: 'heading/content uses answer or solution language', pattern: /\banswer\b|\bsolution\b|\bsolved\b/ },
    { role: 'warning', confidence: 0.72, reason: 'heading/content uses warning language', pattern: /\bwarning\b|\bcaution\b|\bnote that\b|\bcommon mistake\b/ },
    { role: 'concept', confidence: 0.68, reason: 'heading/content appears concept-like', pattern: /\bconcept\b|\bprinciple\b|\bidea\b/ },
  ];
  const match = checks.find((check) => check.pattern.test(text));
  if (match) {
    return {
      role: match.role,
      confidence: match.confidence,
      reason: match.reason,
      warnings: [],
    };
  }
  return {
    role: 'note',
    confidence: 0.42,
    reason: 'fallback role for weak or generic learning material',
    warnings: ['No strong learning role signal found; defaulted to note.'],
  };
}

function roleMetadataForGroup(group: Pick<ReconciliationCandidateGroup, 'title' | 'evidence'>) {
  const inferred = inferLearningRole(group);
  const templateId = ROLE_TEMPLATE_BY_ROLE[inferred.role] || 'text.paragraph';
  const template = getNoteBlockTemplate(templateId);
  const sourceFragmentIds = uniqueStrings((group.evidence || [])
    .map((evidence) => evidence.source_fragment_id)
    .filter(Boolean));
  return {
    learning_role_candidates: [{
      learning_role: inferred.role,
      confidence: inferred.confidence,
      reason: inferred.reason,
      source_fragment_ids: sourceFragmentIds,
    }],
    template_candidates: [{
      template_id: templateId,
      label: template?.label || 'Paragraph',
      confidence: inferred.confidence,
      reason: `best template for learning role ${inferred.role}`,
    }],
    role_confidence: inferred.confidence,
    role_warnings: inferred.warnings,
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function excerpt(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}

function getOwnedCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function firstSegmentForFragment(db: Database.Database, fragmentId: string): string | null {
  const row = db.prepare(`
    SELECT segment_id
    FROM material_segment_fragments
    WHERE fragment_id = ?
    ORDER BY order_index ASC
    LIMIT 1
  `).get(fragmentId) as { segment_id: string } | undefined;
  return row?.segment_id || null;
}

function toEvidence(fragment: FragmentCandidate, reason: string): FragmentEvidence {
  return {
    source_material_id: fragment.source_material_id,
    source_fragment_id: fragment.id,
    material_segment_id: fragment.material_segment_id,
    document_id: fragment.document_id,
    document_chunk_id: fragment.document_chunk_id,
    title: fragment.title,
    page_start: fragment.page_start,
    page_end: fragment.page_end,
    excerpt: excerpt(fragment.content),
    reason,
  };
}

function overlap(a: FragmentCandidate, b: FragmentCandidate): boolean {
  if (typeof a.page_start !== 'number' || typeof a.page_end !== 'number') return false;
  if (typeof b.page_start !== 'number' || typeof b.page_end !== 'number') return false;
  return a.page_start <= b.page_end && b.page_start <= a.page_end;
}

function looksConflictPair(fragments: FragmentCandidate[]): boolean {
  const texts = fragments.map((fragment) => normalizeText(fragment.content));
  return texts.some((text) => /\bnot\b|\bexcept\b|\bunless\b|不是|不连续|除非/.test(text))
    && texts.some((text) => !(/\bnot\b|\bexcept\b|\bunless\b|不是|不连续|除非/.test(text)));
}

function uniqueByFragment(fragments: FragmentCandidate[]): FragmentCandidate[] {
  const seen = new Set<string>();
  const result: FragmentCandidate[] = [];
  for (const fragment of fragments) {
    if (seen.has(fragment.id)) continue;
    seen.add(fragment.id);
    result.push(fragment);
  }
  return result;
}

function candidateGroup(
  kind: GroupKind,
  title: string,
  fragments: FragmentCandidate[],
  confidence: number,
  reason: string,
): ReconciliationCandidateGroup {
  const groupId = uuidv4();
  const base = {
    group_id: groupId,
    group_kind: kind,
    confidence,
    suggested_action: 'review',
    title,
    evidence: uniqueByFragment(fragments).map((fragment) => toEvidence(fragment, reason)),
    warnings: [
      'Review-only candidate. v2.2.0 does not merge, delete, or hide source material.',
    ],
  };
  return {
    ...base,
    ...roleMetadataForGroup(base),
    blocked_by_safety: false,
    safety_reasons: [],
  };
}

function isMaterialReconciliationDecision(value: unknown): value is MaterialReconciliationDecision {
  return typeof value === 'string'
    && (MATERIAL_RECONCILIATION_DECISIONS as readonly string[]).includes(value);
}

function evidenceKindForGroup(kind: GroupKind): string {
  switch (kind) {
    case 'DUPLICATE':
      return 'duplicate';
    case 'OVERLAP':
      return 'overlap';
    case 'SAME_CONCEPT_EVIDENCE':
      return 'same_concept';
    case 'CONFLICT':
      return 'conflict';
    default:
      return 'same_concept';
  }
}

function collectScopedFragments(
  db: Database.Database,
  userId: string,
  input: CreateMaterialReconciliationProposalInput,
): FragmentCandidate[] {
  const documentIds = new Set(input.document_ids || []);
  const materialIds = new Set(input.source_material_ids || []);
  const segmentIds = new Set(input.segment_ids || []);
  const materials = (listCourseMaterials(db, userId, input.course_id) as any[])
    .filter((material) => {
      if (documentIds.size === 0 && materialIds.size === 0) return true;
      return documentIds.has(material.document_id) || materialIds.has(material.id);
    });

  const fragments: FragmentCandidate[] = [];
  for (const material of materials) {
    const sourceFragments = listSourceFragments(db, userId, material.id) as any[] | null;
    for (const fragment of sourceFragments || []) {
      const materialSegmentId = firstSegmentForFragment(db, fragment.id);
      if (segmentIds.size > 0 && (!materialSegmentId || !segmentIds.has(materialSegmentId))) {
        continue;
      }
      fragments.push({
        id: fragment.id,
        source_material_id: fragment.source_material_id,
        document_id: fragment.document_id,
        document_chunk_id: fragment.document_chunk_id,
        title: fragment.title,
        content: fragment.content,
        page_start: fragment.page_start,
        page_end: fragment.page_end,
        order_index: fragment.order_index,
        material_segment_id: materialSegmentId,
      });
    }
  }
  return fragments;
}

function buildCandidateGroups(fragments: FragmentCandidate[]) {
  const groups: ReturnType<typeof candidateGroup>[] = [];
  const exactContent = new Map<string, FragmentCandidate[]>();
  const byTitle = new Map<string, FragmentCandidate[]>();

  for (const fragment of fragments) {
    const contentKey = normalizeText(fragment.content);
    if (contentKey.length >= 24) {
      exactContent.set(contentKey, [...(exactContent.get(contentKey) || []), fragment]);
    }
    const titleKey = normalizeText(fragment.title || '');
    if (titleKey.length > 0) {
      byTitle.set(titleKey, [...(byTitle.get(titleKey) || []), fragment]);
    }
  }

  for (const [key, matches] of exactContent) {
    const sourceCount = new Set(matches.map((match) => match.source_material_id)).size;
    if (matches.length >= 2 && sourceCount >= 2) {
      groups.push(candidateGroup(
        'DUPLICATE',
        `Possible duplicate: ${matches[0].title || key.slice(0, 48)}`,
        matches,
        0.92,
        'normalized source text appears identical across multiple materials',
      ));
    }
  }

  for (const [key, matches] of byTitle) {
    if (matches.length < 2) continue;
    const contentKeys = new Set(matches.map((match) => normalizeText(match.content)));
    if (contentKeys.size === 1) continue;
    if (looksConflictPair(matches)) {
      groups.push(candidateGroup(
        'CONFLICT',
        `Possible conflict: ${matches[0].title || key}`,
        matches,
        0.58,
        'same heading with potentially incompatible wording',
      ));
    } else {
      groups.push(candidateGroup(
        'SAME_CONCEPT_EVIDENCE',
        `Same concept evidence: ${matches[0].title || key}`,
        matches,
        0.68,
        'same heading with different source wording',
      ));
    }
  }

  for (let i = 0; i < fragments.length; i += 1) {
    for (let j = i + 1; j < fragments.length; j += 1) {
      const left = fragments[i];
      const right = fragments[j];
      if (left.document_id !== right.document_id || left.id === right.id) continue;
      if (!overlap(left, right)) continue;
      groups.push(candidateGroup(
        'OVERLAP',
        `Possible overlap: ${left.title || 'source range'}`,
        [left, right],
        0.6,
        'page ranges overlap within the same source document',
      ));
    }
  }

  return groups.slice(0, 30);
}

function parseMetadata(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return {};
  }
}

function groupEvidenceIds(group: ReconciliationCandidateGroup) {
  return {
    sourceMaterialIds: new Set(group.evidence.map((evidence) => evidence.source_material_id).filter(isString)),
    sourceFragmentIds: new Set(group.evidence.map((evidence) => evidence.source_fragment_id).filter(isString)),
    materialSegmentIds: new Set(group.evidence.map((evidence) => evidence.material_segment_id).filter(isString)),
    documentIds: new Set(group.evidence.map((evidence) => evidence.document_id).filter(isString)),
    documentChunkIds: new Set(group.evidence.map((evidence) => evidence.document_chunk_id).filter(isString)),
  };
}

function metadataArray(metadata: Record<string, any>, key: string): string[] {
  const value = metadata[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function intersects(values: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => values.has(candidate));
}

function safetyReasonsForGroup(db: Database.Database, userId: string, courseId: string, group: ReconciliationCandidateGroup): string[] {
  const ids = groupEvidenceIds(group);
  const reasons: string[] = [];
  const exclusions = db.prepare(`
    SELECT *
    FROM excluded_material_scopes
    WHERE user_id = ? AND course_id = ? AND status = 'active'
  `).all(userId, courseId) as any[];
  for (const exclusion of exclusions) {
    const metadata = parseMetadata(exclusion.metadata);
    const matchesGroup = exclusion.group_id === group.group_id;
    const matchesScope = Boolean(
      (exclusion.source_material_id && ids.sourceMaterialIds.has(exclusion.source_material_id))
      || (exclusion.source_fragment_id && ids.sourceFragmentIds.has(exclusion.source_fragment_id))
      || (exclusion.material_segment_id && ids.materialSegmentIds.has(exclusion.material_segment_id))
      || intersects(ids.sourceMaterialIds, metadataArray(metadata, 'source_material_ids'))
      || intersects(ids.sourceFragmentIds, metadataArray(metadata, 'source_fragment_ids'))
      || intersects(ids.materialSegmentIds, metadataArray(metadata, 'material_segment_ids'))
      || intersects(ids.documentIds, metadataArray(metadata, 'document_ids'))
      || intersects(ids.documentChunkIds, metadataArray(metadata, 'document_chunk_ids'))
    );
    if (matchesGroup || matchesScope) {
      reasons.push('Blocked by active exclusion covering this candidate evidence.');
      break;
    }
  }

  const conflicts = db.prepare(`
    SELECT *
    FROM conflict_review_items
    WHERE user_id = ? AND course_id = ? AND status = 'open'
  `).all(userId, courseId) as any[];
  for (const conflict of conflicts) {
    const metadata = parseMetadata(conflict.metadata);
    const matchesGroup = conflict.group_id === group.group_id;
    const matchesScope = Boolean(
      intersects(ids.sourceMaterialIds, metadataArray(metadata, 'source_material_ids'))
      || intersects(ids.sourceFragmentIds, metadataArray(metadata, 'source_fragment_ids'))
      || intersects(ids.materialSegmentIds, metadataArray(metadata, 'material_segment_ids'))
      || intersects(ids.documentIds, metadataArray(metadata, 'document_ids'))
      || intersects(ids.documentChunkIds, metadataArray(metadata, 'document_chunk_ids'))
    );
    if (matchesGroup || matchesScope) {
      reasons.push('Blocked by open conflict covering this candidate evidence.');
      break;
    }
  }
  return reasons;
}

function applySafetyContext(
  db: Database.Database,
  userId: string,
  courseId: string,
  groups: ReconciliationCandidateGroup[],
): ReconciliationCandidateGroup[] {
  return groups.map((group) => {
    const safetyReasons = safetyReasonsForGroup(db, userId, courseId, group);
    if (safetyReasons.length === 0) return group;
    return {
      ...group,
      suggested_action: 'defer',
      blocked_by_safety: true,
      safety_reasons: safetyReasons,
      warnings: uniqueStrings([
        ...group.warnings,
        'Safety blocker present. Review active exclusions or open conflicts before accepting this evidence set.',
      ]),
      role_warnings: uniqueStrings([
        ...group.role_warnings,
        'Role hint is safety-blocked by existing reconciliation state.',
      ]),
    };
  });
}

function roleAwareMetadataForGroup(group: ReconciliationCandidateGroup) {
  return {
    learning_role_candidates: group.learning_role_candidates || [],
    template_candidates: group.template_candidates || [],
    role_confidence: group.role_confidence ?? null,
    role_warnings: group.role_warnings || [],
    blocked_by_safety: Boolean(group.blocked_by_safety),
    safety_reasons: group.safety_reasons || [],
  };
}

function evidenceScopeMetadata(group: ReconciliationCandidateGroup) {
  return {
    source_material_ids: uniqueStrings(group.evidence.map((evidence) => evidence.source_material_id).filter(isString)),
    source_fragment_ids: uniqueStrings(group.evidence.map((evidence) => evidence.source_fragment_id).filter(isString)),
    material_segment_ids: uniqueStrings(group.evidence.map((evidence) => evidence.material_segment_id).filter(isString)),
    document_ids: uniqueStrings(group.evidence.map((evidence) => evidence.document_id).filter(isString)),
    document_chunk_ids: uniqueStrings(group.evidence.map((evidence) => evidence.document_chunk_id).filter(isString)),
  };
}

export function createMaterialReconciliationProposal(
  db: Database.Database,
  userId: string,
  input: CreateMaterialReconciliationProposalInput,
) {
  getOwnedCourse(db, userId, input.course_id);
  const resolvedBoard = resolveSourceBoardForProposal(db, userId, input.course_id, input.source_board_id);
  const requestedScopeIds = [...new Set([...(input.source_scope_ids || []), ...resolvedBoard.source_scope_ids])];
  const resolvedScopes = resolveSourceScopesForProposal(db, userId, input.course_id, requestedScopeIds);
  const scopedInput = {
    ...input,
    document_ids: input.document_ids || resolvedScopes.document_ids,
    source_material_ids: input.source_material_ids || resolvedScopes.source_material_ids,
    segment_ids: input.segment_ids || resolvedScopes.segment_ids,
  };
  const fragments = collectScopedFragments(db, userId, scopedInput);
  if (fragments.length === 0) {
    throw new AppError(400, 'No proposal-ready source fragments found for reconciliation');
  }

  const candidateGroups = applySafetyContext(db, userId, input.course_id, buildCandidateGroups(fragments));
  if (candidateGroups.length === 0) {
    throw new AppError(400, 'No reconciliation candidates found for the selected scope');
  }

  const proposalId = uuidv4();
  const now = new Date().toISOString();
  const data = {
    version: 'v2.2.3',
    proposal_kind: 'material_reconciliation',
    course_id: input.course_id,
    title: 'Material reconciliation proposal',
    description: 'Review-only candidate groups for duplicate, overlapping, same-concept, or conflicting source material.',
    scope: {
      document_ids: input.document_ids || [],
      source_material_ids: input.source_material_ids || [],
      segment_ids: input.segment_ids || [],
      source_board_id: resolvedBoard.source_board_id,
      source_scope_ids: resolvedScopes.source_scope_ids,
      scope_summary: resolvedScopes.scope_summary,
    },
    candidate_groups: candidateGroups,
    warnings: [
      ...resolvedBoard.warnings,
      ...resolvedScopes.warnings,
      'v2.2.0 creates review-only reconciliation proposals. Real merge apply is deferred to v2.2.1.',
      'v2.2.3 adds role-aware hints only. These hints are not canonical truth.',
    ],
    apply_behavior: 'review_shell_only',
  };

  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'material_reconciliation', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  return {
    id: proposalId,
    user_id: userId,
    type: 'material_reconciliation',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

export function applyMaterialReconciliationProposal(
  db: Database.Database,
  userId: string,
  proposal: ProposalRow,
  input: ApplyMaterialReconciliationInput = {},
) {
  if (proposal.type !== 'material_reconciliation') {
    throw new AppError(400, 'Proposal is not a material reconciliation proposal');
  }

  const data = parseJson<{ course_id: string; candidate_groups: ReconciliationCandidateGroup[] }>(
    proposal.data,
    { course_id: '', candidate_groups: [] },
  );
  if (!data.course_id || !Array.isArray(data.candidate_groups)) {
    throw new AppError(400, 'Material reconciliation proposal is malformed');
  }

  const now = new Date().toISOString();
  const requestedDecisions = Array.isArray(input.group_decisions) ? input.group_decisions : [];
  const groupsById = new Map(data.candidate_groups.map((group) => [group.group_id, group]));

  for (const groupDecision of requestedDecisions) {
    if (!groupDecision?.group_id || !groupsById.has(groupDecision.group_id)) {
      throw new AppError(400, `Unknown reconciliation group id: ${groupDecision?.group_id || 'missing'}`);
    }
    if (!isMaterialReconciliationDecision(groupDecision.decision)) {
      throw new AppError(400, `Unsupported reconciliation decision: ${String(groupDecision.decision)}`);
    }
  }

  const batchId = uuidv4();
  if (requestedDecisions.length === 0) {
    db.prepare(`
      INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
      VALUES (?, ?, ?, 'proposal', ?, 'Review material reconciliation proposal shell', 'applied', ?, ?)
    `).run(
      batchId,
      userId,
      data.course_id,
      proposal.id,
      JSON.stringify({ proposal_type: 'material_reconciliation', apply_behavior: 'review_shell_only' }),
      now,
    );

    return {
      message: 'Material reconciliation proposal reviewed without merging source material',
      operation_batch_id: batchId,
      reviewed_groups_count: data.candidate_groups.length,
      review_shell_only: true,
      evidence_sets_created_count: 0,
      evidence_items_created_count: 0,
      decisions_count: 0,
    };
  }

  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply material reconciliation evidence decisions', 'applied', ?, ?)
  `).run(
    batchId,
    userId,
    data.course_id,
    proposal.id,
    JSON.stringify({ proposal_type: 'material_reconciliation', apply_behavior: 'evidence_set_decisions' }),
    now,
  );

  let evidenceSetsCreated = 0;
  let evidenceItemsCreated = 0;
  let exclusionsCreated = 0;
  let conflictsCreated = 0;
  for (const groupDecision of requestedDecisions) {
    const group = groupsById.get(groupDecision.group_id)!;
    let evidenceSetId: string | null = null;
    const decisionId = uuidv4();

    if (groupDecision.decision === 'accepted_evidence_set') {
      evidenceSetId = uuidv4();
      db.prepare(`
        INSERT INTO evidence_sets (
          id, user_id, course_id, title, evidence_kind, status, confidence,
          source_proposal_id, source_group_id, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
      `).run(
        evidenceSetId,
        userId,
        data.course_id,
        group.title,
        evidenceKindForGroup(group.group_kind),
        group.confidence,
        proposal.id,
        group.group_id,
        JSON.stringify({
          group_kind: group.group_kind,
          suggested_action: group.suggested_action,
          warnings: group.warnings || [],
          ...roleAwareMetadataForGroup(group),
        }),
        now,
        now,
      );
      evidenceSetsCreated += 1;

      for (const evidence of group.evidence || []) {
        db.prepare(`
          INSERT INTO evidence_items (
            id, evidence_set_id, user_id, course_id, source_material_id,
            source_fragment_id, material_segment_id, document_id, document_chunk_id,
            page_start, page_end, excerpt, reason, confidence, metadata, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          evidenceSetId,
          userId,
          data.course_id,
          evidence.source_material_id || null,
          evidence.source_fragment_id || null,
          evidence.material_segment_id || null,
          evidence.document_id || null,
          evidence.document_chunk_id || null,
          evidence.page_start ?? null,
          evidence.page_end ?? null,
          evidence.excerpt || null,
          evidence.reason || null,
          group.confidence,
          JSON.stringify({
            source_group_id: group.group_id,
            group_kind: group.group_kind,
            title: evidence.title || null,
            ...roleAwareMetadataForGroup(group),
          }),
          now,
          now,
        );
        evidenceItemsCreated += 1;
      }
    }

    db.prepare(`
      INSERT INTO material_reconciliation_decisions (
        id, user_id, course_id, proposal_id, group_id, decision,
        evidence_set_id, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decisionId,
      userId,
      data.course_id,
      proposal.id,
      group.group_id,
      groupDecision.decision,
      evidenceSetId,
      JSON.stringify({
        group_kind: group.group_kind,
        group_title: group.title,
        ...roleAwareMetadataForGroup(group),
      }),
      now,
      now,
    );

    if (groupDecision.decision === 'excluded') {
      db.prepare(`
        INSERT INTO excluded_material_scopes (
          id, user_id, course_id, scope_type, proposal_id, group_id, reason,
          status, source_proposal_id, source_decision_id, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, 'candidate_group', ?, ?, ?, 'active', ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        userId,
        data.course_id,
        proposal.id,
        group.group_id,
        `Excluded reconciliation group: ${group.title}`,
        proposal.id,
        decisionId,
        JSON.stringify({
          group_kind: group.group_kind,
          group_title: group.title,
          evidence_count: group.evidence?.length || 0,
          ...evidenceScopeMetadata(group),
          ...roleAwareMetadataForGroup(group),
        }),
        now,
        now,
      );
      exclusionsCreated += 1;
    }

    if (groupDecision.decision === 'mark_conflict') {
      db.prepare(`
        INSERT INTO conflict_review_items (
          id, user_id, course_id, proposal_id, group_id, evidence_set_id,
          conflict_kind, status, title, summary, severity, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        userId,
        data.course_id,
        proposal.id,
        group.group_id,
        evidenceSetId,
        group.group_kind === 'CONFLICT' ? 'contradiction' : 'source_disagreement',
        group.title,
        `Marked for conflict review from ${group.group_kind.replace(/_/g, ' ').toLowerCase()} candidate group.`,
        group.group_kind === 'CONFLICT' ? 'high' : 'medium',
        JSON.stringify({
          group_kind: group.group_kind,
          suggested_action: group.suggested_action,
          warnings: group.warnings || [],
          evidence_count: group.evidence?.length || 0,
          ...evidenceScopeMetadata(group),
          ...roleAwareMetadataForGroup(group),
        }),
        now,
        now,
      );
      conflictsCreated += 1;
    }
  }

  return {
    message: 'Material reconciliation evidence decisions applied',
    operation_batch_id: batchId,
    review_shell_only: false,
    evidence_sets_created_count: evidenceSetsCreated,
    evidence_items_created_count: evidenceItemsCreated,
    exclusions_created_count: exclusionsCreated,
    conflicts_created_count: conflictsCreated,
    decisions_count: requestedDecisions.length,
  };
}
