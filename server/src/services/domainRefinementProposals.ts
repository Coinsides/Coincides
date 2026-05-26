import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  getDomainBlockSet,
  type DomainBlockSet,
} from './domainPackages.js';

type RefinementAction = 'rename' | 'promote' | 'split' | 'merge' | 'fork' | 'deprecate' | 'reclassify';
type MigrationMode = 'alias_mapping' | 'soft_migration' | 'hard_cascade';
type DomainTargetType = 'note_block' | 'template_definition' | 'composition_template';
type MembershipChangeAction = 'add' | 'remove' | 'update';

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
  created_at: string;
  resolved_at: string | null;
}

interface MembershipChange {
  change_action: MembershipChangeAction;
  template_definition_id?: string;
  template_key?: string;
  template_version?: string;
  composition_template_id?: string;
  composition_key?: string;
  composition_version?: string;
  member_role?: string;
  required?: boolean;
  order_index?: number;
  metadata?: Record<string, unknown>;
}

interface ObjectReclassificationInput {
  target_type: DomainTargetType;
  target_id: string;
  target_domain_id?: string;
  target_domain_key?: string;
  classification_role?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateDomainRefinementProposalInput {
  source_domain_id: string;
  target_domain_id?: string;
  target_domain_patch?: Record<string, unknown>;
  refinement_action: RefinementAction;
  migration_mode: MigrationMode;
  course_id?: string;
  template_membership_changes?: MembershipChange[];
  composition_membership_changes?: MembershipChange[];
  object_reclassifications?: ObjectReclassificationInput[];
  reason?: string;
}

interface TargetPreview {
  domain: DomainBlockSet | Record<string, unknown> | null;
  persisted: boolean;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function assertAction(action: string): RefinementAction {
  if (!['rename', 'promote', 'split', 'merge', 'fork', 'deprecate', 'reclassify'].includes(action)) {
    throw new AppError(400, 'Invalid domain refinement action.');
  }
  return action as RefinementAction;
}

function assertMode(mode: string): MigrationMode {
  if (!['alias_mapping', 'soft_migration', 'hard_cascade'].includes(mode)) {
    throw new AppError(400, 'Invalid domain refinement migration mode.');
  }
  return mode as MigrationMode;
}

function ensureCourseAccess(db: Database.Database, userId: string, courseId?: string): void {
  if (!courseId) return;
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function domainSnapshot(domain: DomainBlockSet | Record<string, unknown> | null) {
  if (!domain) return null;
  return {
    id: domain.id || null,
    package_manifest_id: domain.package_manifest_id || null,
    domain_key: domain.domain_key,
    version: domain.version || '0.1.0',
    origin: domain.origin || 'migration',
    scope_type: domain.scope_type || 'global',
    scope_id: domain.scope_id || '',
    label: domain.label,
    description: domain.description || null,
    domain_kind: domain.domain_kind || 'learning',
    aliases: domain.aliases || [],
    facets: domain.facets || {},
    source_behavior: domain.source_behavior || {},
    relation_behavior: domain.relation_behavior || {},
    proposal_behavior: domain.proposal_behavior || {},
    summary_for_agent: domain.summary_for_agent || '',
    status: domain.status || 'preview',
    is_system: Boolean(domain.is_system),
  };
}

function resolveTarget(
  db: Database.Database,
  userId: string,
  source: DomainBlockSet,
  input: CreateDomainRefinementProposalInput,
): TargetPreview {
  if (input.target_domain_id) {
    return {
      domain: getDomainBlockSet(db, userId, input.target_domain_id),
      persisted: true,
    };
  }
  if (input.target_domain_patch && Object.keys(input.target_domain_patch).length > 0) {
    return {
      domain: {
        ...source,
        ...input.target_domain_patch,
        id: null,
        package_manifest_id: input.target_domain_patch.package_manifest_id ?? source.package_manifest_id,
        version: input.target_domain_patch.version ?? source.version,
        origin: 'migration',
        status: 'preview',
        is_system: false,
      },
      persisted: false,
    };
  }
  if (input.refinement_action === 'deprecate') {
    return { domain: null, persisted: false };
  }
  throw new AppError(400, 'Domain refinement requires a target_domain_id, target_domain_patch, or deprecate action.');
}

function domainDiff(source: DomainBlockSet, target: DomainBlockSet | Record<string, unknown> | null) {
  if (!target) {
    return [{
      field: 'status',
      before: source.status,
      after: 'deprecated',
    }];
  }
  const fields = [
    'domain_key',
    'version',
    'label',
    'description',
    'domain_kind',
    'aliases',
    'facets',
    'source_behavior',
    'relation_behavior',
    'proposal_behavior',
    'summary_for_agent',
    'status',
  ];
  return fields
    .filter((field) => JSON.stringify((source as any)[field] ?? null) !== JSON.stringify((target as any)[field] ?? null))
    .map((field) => ({
      field,
      before: (source as any)[field] ?? null,
      after: (target as any)[field] ?? null,
    }));
}

function listMemberships(db: Database.Database, source: DomainBlockSet) {
  const templates = db.prepare(`
    SELECT *
    FROM domain_block_set_templates
    WHERE domain_block_set_id = ?
    ORDER BY order_index ASC
  `).all(source.id) as any[];
  const compositions = db.prepare(`
    SELECT *
    FROM domain_block_set_compositions
    WHERE domain_block_set_id = ?
    ORDER BY order_index ASC
  `).all(source.id) as any[];
  return { templates, compositions };
}

function packageImpact(db: Database.Database, userId: string, source: DomainBlockSet, target: DomainBlockSet | Record<string, unknown> | null) {
  const affectedPackages = source.package_manifest_id
    ? db.prepare('SELECT id, package_key, version, contents FROM package_manifests WHERE id = ? AND user_id = ?')
      .all(source.package_manifest_id, userId)
    : [];
  return {
    affected_package_count: affectedPackages.length,
    packages: affectedPackages.map((row: any) => ({
      id: row.id,
      package_key: row.package_key,
      version: row.version,
      source_domain_key: source.domain_key,
      target_domain_key: target ? (target as any).domain_key || null : null,
    })),
    note: 'Soft migration does not remove old package membership; hard cascade may update package contents only for explicit safe changes.',
  };
}

function noteBlockMatchesDomain(row: any, source: DomainBlockSet): boolean {
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  return metadata.current_domain_block_set_id === source.id
    || metadata.current_domain_key === source.domain_key
    || metadata.created_with_domain_key === source.domain_key;
}

function findAffectedNoteBlocks(
  db: Database.Database,
  userId: string,
  source: DomainBlockSet,
  courseId?: string,
) {
  const params: unknown[] = [userId];
  let where = "user_id = ? AND status != 'trashed'";
  if (courseId) {
    where += ' AND course_id = ?';
    params.push(courseId);
  }
  const rows = db.prepare(`
    SELECT id, user_id, course_id, block_type, title, content_json, plain_text, metadata
    FROM note_blocks
    WHERE ${where}
  `).all(...params) as any[];
  return rows.filter((row) => noteBlockMatchesDomain(row, source));
}

function affectedObjectIds(input: CreateDomainRefinementProposalInput, targetType: DomainTargetType) {
  return new Set((input.object_reclassifications || [])
    .filter((item) => item.target_type === targetType)
    .map((item) => item.target_id));
}

function sampleBeforeAfter(
  source: DomainBlockSet,
  target: DomainBlockSet | Record<string, unknown> | null,
  explicitObjects: ObjectReclassificationInput[],
  affectedBlocks: any[],
) {
  const targetSnapshot = domainSnapshot(target);
  return [
    ...explicitObjects.slice(0, 3).map((item) => ({
      target_type: item.target_type,
      target_id: item.target_id,
      before: {
        domain_key: source.domain_key,
        domain_version: source.version,
      },
      after: targetSnapshot
        ? {
            domain_key: targetSnapshot.domain_key,
            domain_version: targetSnapshot.version,
            classification_role: item.classification_role || 'current',
          }
        : {
            status: 'deprecated',
          },
    })),
    ...affectedBlocks.slice(0, Math.max(0, 3 - explicitObjects.length)).map((block) => ({
      target_type: 'note_block',
      target_id: block.id,
      before: parseJson(block.metadata, {}),
      after: targetSnapshot
        ? {
            current_domain_key: targetSnapshot.domain_key,
            current_domain_version: targetSnapshot.version,
          }
        : {
            current_domain_status: 'deprecated',
          },
    })),
  ];
}

function hardCascadeBlockers(
  action: RefinementAction,
  input: CreateDomainRefinementProposalInput,
  source: DomainBlockSet,
  target: DomainBlockSet | Record<string, unknown> | null,
) {
  const blockers: string[] = [];
  const explicitObjectCount = (input.object_reclassifications || []).length;
  const explicitMembershipCount = (input.template_membership_changes || []).length + (input.composition_membership_changes || []).length;
  if (['split', 'merge', 'reclassify'].includes(action) && explicitObjectCount === 0 && explicitMembershipCount === 0) {
    blockers.push('Hard cascade for split, merge, or reclassify requires explicit object or membership mappings.');
  }
  if (source.is_system && action === 'deprecate') {
    blockers.push('System seed domains cannot be destructively deprecated by hard cascade; use alias or soft migration records.');
  }
  if (!target && action !== 'deprecate') {
    blockers.push('Hard cascade requires a persisted or preview target domain except for deprecate.');
  }
  return blockers;
}

function findDomainKeyConflict(
  db: Database.Database,
  userId: string,
  source: DomainBlockSet,
  target: DomainBlockSet | Record<string, unknown> | null,
) {
  if (!target || (target as any).id) return null;
  const row = db.prepare(`
    SELECT id
    FROM domain_block_sets
    WHERE user_id = ? AND domain_key = ? AND version = ? AND scope_type = ? AND scope_id = ?
  `).get(
    userId,
    (target as any).domain_key,
    (target as any).version || '0.1.0',
    (target as any).scope_type || source.scope_type,
    (target as any).scope_id || source.scope_id || '',
  ) as any;
  return row?.id || null;
}

function buildProposalData(
  db: Database.Database,
  userId: string,
  input: CreateDomainRefinementProposalInput,
  proposalId: string,
) {
  const action = assertAction(input.refinement_action);
  const migrationMode = assertMode(input.migration_mode);
  ensureCourseAccess(db, userId, input.course_id);
  const source = getDomainBlockSet(db, userId, input.source_domain_id);
  const targetPreview = resolveTarget(db, userId, source, input);
  const target = targetPreview.domain;
  const memberships = listMemberships(db, source);
  const explicitReclassifications = input.object_reclassifications || [];
  const explicitNoteBlockIds = affectedObjectIds(input, 'note_block');
  const domainTaggedBlocks = findAffectedNoteBlocks(db, userId, source, input.course_id);
  const affectedBlocks = domainTaggedBlocks.filter((block) => explicitNoteBlockIds.size === 0 || explicitNoteBlockIds.has(block.id));
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (target && (target as any).id === source.id) {
    blockers.push('Source and target domains are identical.');
  }
  const conflictId = findDomainKeyConflict(db, userId, source, target);
  if (conflictId) {
    blockers.push(`Target domain key/version already exists (${conflictId}).`);
  }
  if (migrationMode === 'hard_cascade') {
    blockers.push(...hardCascadeBlockers(action, input, source, target));
  }
  if (explicitReclassifications.length === 0 && affectedBlocks.length === 0) {
    warnings.push('No explicit objects are selected for domain reclassification.');
  }
  if (source.is_system && migrationMode !== 'alias_mapping') {
    warnings.push('Source domain is a system seed; v2.5.6 will preserve historical identity and avoid destructive edits.');
  }

  return {
    proposal_kind: 'domain_refinement',
    source_domain_id: source.id,
    source_domain: domainSnapshot(source),
    target_domain_id: target && (target as any).id ? (target as any).id : null,
    target_domain: domainSnapshot(target),
    target_is_persisted: targetPreview.persisted,
    target_domain_patch: input.target_domain_patch || null,
    refinement_action: action,
    migration_mode: migrationMode,
    domain_diff: domainDiff(source, target),
    membership_diff: {
      existing_template_memberships: memberships.templates.map((row) => ({
        template_definition_id: row.template_definition_id,
        template_key: row.template_key,
        template_version: row.template_version,
        member_role: row.member_role,
        required: Boolean(row.required),
      })),
      existing_composition_memberships: memberships.compositions.map((row) => ({
        composition_template_id: row.composition_template_id,
        composition_key: row.composition_key,
        composition_version: row.composition_version,
        member_role: row.member_role,
        required: Boolean(row.required),
      })),
      template_membership_changes: input.template_membership_changes || [],
      composition_membership_changes: input.composition_membership_changes || [],
    },
    package_impact: packageImpact(db, userId, source, target),
    affected_counts: {
      domains: target ? 2 : 1,
      templates: new Set([
        ...memberships.templates.map((row) => row.template_definition_id || row.template_key),
        ...(input.template_membership_changes || []).map((row) => row.template_definition_id || row.template_key),
      ].filter(Boolean)).size,
      compositions: new Set([
        ...memberships.compositions.map((row) => row.composition_template_id || row.composition_key),
        ...(input.composition_membership_changes || []).map((row) => row.composition_template_id || row.composition_key),
      ].filter(Boolean)).size,
      note_blocks: explicitNoteBlockIds.size || affectedBlocks.length,
      packages: source.package_manifest_id ? 1 : 0,
    },
    object_reclassifications: explicitReclassifications,
    samples: sampleBeforeAfter(source, target, explicitReclassifications, affectedBlocks),
    warnings,
    blockers,
    recovery_plan: {
      record_items: true,
      before_after_snapshots: true,
      mapping_records: true,
      classification_history: true,
      rollback_is_manual_for_v2_5_6: true,
    },
    reason: input.reason || null,
    apply_behavior: 'domain_refinement_records_and_classification_updates',
    created_by_proposal_id: proposalId,
  };
}

export function createDomainRefinementProposal(
  db: Database.Database,
  userId: string,
  input: CreateDomainRefinementProposalInput,
) {
  const proposalId = uuidv4();
  const data = buildProposalData(db, userId, input, proposalId);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'domain_refinement', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  return {
    id: proposalId,
    user_id: userId,
    type: 'domain_refinement',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

function insertOperationBatch(
  db: Database.Database,
  userId: string,
  courseId: string | null,
  proposalId: string,
  action: RefinementAction,
  mode: MigrationMode,
): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply domain refinement proposal', 'applied', ?, ?)
  `).run(
    id,
    userId,
    courseId,
    proposalId,
    stringifyJson({
      proposal_type: 'domain_refinement',
      refinement_action: action,
      migration_mode: mode,
    }),
    new Date().toISOString(),
  );
  return id;
}

function createTargetDomainIfNeeded(
  db: Database.Database,
  userId: string,
  source: DomainBlockSet,
  targetSnapshot: any,
  proposalId: string,
): DomainBlockSet | null {
  if (!targetSnapshot) return null;
  if (targetSnapshot.id) {
    return getDomainBlockSet(db, userId, targetSnapshot.id);
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO domain_block_sets (
      id, user_id, package_manifest_id, domain_key, version, origin, scope_type,
      scope_id, label, description, domain_kind, aliases, facets, source_behavior,
      relation_behavior, proposal_behavior, summary_for_agent, status, is_system,
      metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'migration', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    targetSnapshot.package_manifest_id || source.package_manifest_id || null,
    targetSnapshot.domain_key,
    targetSnapshot.version || source.version,
    targetSnapshot.scope_type || source.scope_type,
    targetSnapshot.scope_id || source.scope_id || '',
    targetSnapshot.label || source.label,
    targetSnapshot.description || source.description || null,
    targetSnapshot.domain_kind || source.domain_kind,
    stringifyJson(targetSnapshot.aliases || source.aliases || []),
    stringifyJson(targetSnapshot.facets || source.facets || {}),
    stringifyJson(targetSnapshot.source_behavior || source.source_behavior || {}),
    stringifyJson(targetSnapshot.relation_behavior || source.relation_behavior || {}),
    stringifyJson(targetSnapshot.proposal_behavior || source.proposal_behavior || {}),
    targetSnapshot.summary_for_agent || source.summary_for_agent || '',
    stringifyJson({
      created_from_domain_refinement_proposal_id: proposalId,
      source_domain_block_set_id: source.id,
      source_domain_key: source.domain_key,
      graph_native_evidence: 'domain_successor_node_candidate',
    }),
  );
  copyMemberships(db, userId, source.id, id);
  return getDomainBlockSet(db, userId, id);
}

function copyMemberships(db: Database.Database, userId: string, sourceDomainId: string, targetDomainId: string): void {
  const templates = db.prepare('SELECT * FROM domain_block_set_templates WHERE domain_block_set_id = ? ORDER BY order_index ASC')
    .all(sourceDomainId) as any[];
  for (const row of templates) {
    db.prepare(`
      INSERT OR IGNORE INTO domain_block_set_templates (
        id, user_id, domain_block_set_id, template_definition_id, template_key,
        template_version, member_role, required, order_index, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      targetDomainId,
      row.template_definition_id,
      row.template_key,
      row.template_version,
      row.member_role,
      row.required,
      row.order_index,
      row.metadata,
    );
  }
  const compositions = db.prepare('SELECT * FROM domain_block_set_compositions WHERE domain_block_set_id = ? ORDER BY order_index ASC')
    .all(sourceDomainId) as any[];
  for (const row of compositions) {
    db.prepare(`
      INSERT OR IGNORE INTO domain_block_set_compositions (
        id, user_id, domain_block_set_id, composition_template_id, composition_key,
        composition_version, member_role, required, order_index, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      targetDomainId,
      row.composition_template_id,
      row.composition_key,
      row.composition_version,
      row.member_role,
      row.required,
      row.order_index,
      row.metadata,
    );
  }
}

function applyTemplateMembershipChanges(
  db: Database.Database,
  userId: string,
  targetDomainId: string | null,
  changes: MembershipChange[],
  hard: boolean,
): void {
  if (!targetDomainId) return;
  for (const change of changes) {
    const action = change.change_action || 'add';
    const templateKey = change.template_key || '';
    const templateVersion = change.template_version || '1.0.0';
    const role = change.member_role || 'member';
    if (action === 'remove') {
      if (hard) {
        db.prepare(`
          DELETE FROM domain_block_set_templates
          WHERE domain_block_set_id = ? AND (template_definition_id = ? OR template_key = ?) AND member_role = ?
        `).run(targetDomainId, change.template_definition_id || '', templateKey, role);
      }
      continue;
    }
    db.prepare(`
      INSERT OR REPLACE INTO domain_block_set_templates (
        id, user_id, domain_block_set_id, template_definition_id, template_key,
        template_version, member_role, required, order_index, metadata, created_at, updated_at
      )
      VALUES (
        COALESCE((SELECT id FROM domain_block_set_templates WHERE domain_block_set_id = ? AND template_key = ? AND template_version = ? AND member_role = ?), ?),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
    `).run(
      targetDomainId,
      templateKey,
      templateVersion,
      role,
      uuidv4(),
      userId,
      targetDomainId,
      change.template_definition_id || null,
      templateKey,
      templateVersion,
      role,
      change.required === false ? 0 : 1,
      change.order_index ?? 0,
      stringifyJson(change.metadata || {}),
    );
  }
}

function applyCompositionMembershipChanges(
  db: Database.Database,
  userId: string,
  targetDomainId: string | null,
  changes: MembershipChange[],
  hard: boolean,
): void {
  if (!targetDomainId) return;
  for (const change of changes) {
    const action = change.change_action || 'add';
    const compositionKey = change.composition_key || '';
    const compositionVersion = change.composition_version || '1.0.0';
    const role = change.member_role || 'member';
    if (action === 'remove') {
      if (hard) {
        db.prepare(`
          DELETE FROM domain_block_set_compositions
          WHERE domain_block_set_id = ? AND (composition_template_id = ? OR composition_key = ?) AND member_role = ?
        `).run(targetDomainId, change.composition_template_id || '', compositionKey, role);
      }
      continue;
    }
    db.prepare(`
      INSERT OR REPLACE INTO domain_block_set_compositions (
        id, user_id, domain_block_set_id, composition_template_id, composition_key,
        composition_version, member_role, required, order_index, metadata, created_at, updated_at
      )
      VALUES (
        COALESCE((SELECT id FROM domain_block_set_compositions WHERE domain_block_set_id = ? AND composition_key = ? AND composition_version = ? AND member_role = ?), ?),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
    `).run(
      targetDomainId,
      compositionKey,
      compositionVersion,
      role,
      uuidv4(),
      userId,
      targetDomainId,
      change.composition_template_id || null,
      compositionKey,
      compositionVersion,
      role,
      change.required === false ? 0 : 1,
      change.order_index ?? 0,
      stringifyJson(change.metadata || {}),
    );
  }
}

function insertRecord(
  db: Database.Database,
  userId: string,
  proposalId: string,
  operationBatchId: string,
  source: DomainBlockSet,
  target: DomainBlockSet | null,
  data: any,
) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO domain_refinement_records (
      id, user_id, course_id, source_proposal_id, operation_batch_id,
      source_domain_block_set_id, target_domain_block_set_ids, refinement_action,
      migration_mode, affected_domain_count, affected_template_count,
      affected_composition_count, affected_note_block_count, affected_package_count,
      source_snapshot, target_snapshot, recovery_metadata, metadata, status,
      applied_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, datetime('now'))
  `).run(
    id,
    userId,
    data.course_id || null,
    proposalId,
    operationBatchId,
    source.id,
    stringifyJson(target ? [target.id] : []),
    data.refinement_action,
    data.migration_mode,
    data.affected_counts?.domains || 1,
    data.affected_counts?.templates || 0,
    data.affected_counts?.compositions || 0,
    data.affected_counts?.note_blocks || 0,
    data.affected_counts?.packages || 0,
    stringifyJson(data.source_domain || {}),
    stringifyJson(target ? domainSnapshot(target) : data.target_domain || {}),
    stringifyJson(data.recovery_plan || {}),
    stringifyJson({
      graph_native_evidence: 'domain_refinement_operation_candidate',
      package_impact: data.package_impact || {},
      domain_diff: data.domain_diff || [],
    }),
    new Date().toISOString(),
  );
  return id;
}

function insertRecordItem(
  db: Database.Database,
  userId: string,
  recordId: string,
  objectType: string,
  objectId: string | null,
  objectKey: string | null,
  action: string,
  beforeSnapshot: unknown,
  afterSnapshot: unknown,
  warnings: string[] = [],
) {
  db.prepare(`
    INSERT INTO domain_refinement_record_items (
      id, user_id, domain_refinement_record_id, object_type, object_id,
      object_key, action, status, before_snapshot, after_snapshot,
      warnings, metadata, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?, ?, datetime('now'))
  `).run(
    uuidv4(),
    userId,
    recordId,
    objectType,
    objectId,
    objectKey,
    action,
    stringifyJson(beforeSnapshot),
    stringifyJson(afterSnapshot),
    stringifyJson(warnings),
    stringifyJson({ graph_native_evidence: 'domain_refinement_item_provenance' }),
  );
}

function classificationTargetExists(db: Database.Database, userId: string, item: ObjectReclassificationInput): boolean {
  const table = item.target_type === 'note_block'
    ? 'note_blocks'
    : item.target_type === 'template_definition'
      ? 'template_definitions'
      : 'composition_templates';
  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`).get(item.target_id, userId);
  return Boolean(row);
}

function metadataForNoteBlockClassification(
  before: Record<string, unknown>,
  source: DomainBlockSet,
  target: DomainBlockSet,
  proposalId: string,
  recordId: string,
  mode: MigrationMode,
  action: RefinementAction,
) {
  const history = Array.isArray(before.domain_classification_history)
    ? [...before.domain_classification_history]
    : [];
  history.push({
    proposal_id: proposalId,
    record_id: recordId,
    mode,
    action,
    source_domain_block_set_id: source.id,
    source_domain_key: source.domain_key,
    source_domain_version: source.version,
    target_domain_block_set_id: target.id,
    target_domain_key: target.domain_key,
    target_domain_version: target.version,
    applied_at: new Date().toISOString(),
  });

  return {
    ...before,
    created_with_domain_block_set_id: before.created_with_domain_block_set_id || before.current_domain_block_set_id || source.id,
    created_with_domain_key: before.created_with_domain_key || before.current_domain_key || source.domain_key,
    created_with_domain_version: before.created_with_domain_version || before.current_domain_version || source.version,
    current_domain_block_set_id: target.id,
    current_domain_key: target.domain_key,
    current_domain_version: target.version,
    domain_classification_history: history,
  };
}

function applyObjectReclassifications(
  db: Database.Database,
  userId: string,
  courseId: string | null,
  proposalId: string,
  recordId: string,
  source: DomainBlockSet,
  target: DomainBlockSet | null,
  items: ObjectReclassificationInput[],
  mode: MigrationMode,
  action: RefinementAction,
) {
  if (!target) return 0;
  let count = 0;
  for (const item of items) {
    if (!classificationTargetExists(db, userId, item)) {
      throw new AppError(400, `Cannot reclassify missing ${item.target_type} ${item.target_id}.`);
    }
    let beforeSnapshot: Record<string, unknown> = {};
    let afterSnapshot: Record<string, unknown> = {};
    if (item.target_type === 'note_block') {
      const row = db.prepare('SELECT course_id, metadata FROM note_blocks WHERE id = ? AND user_id = ?').get(item.target_id, userId) as any;
      beforeSnapshot = parseJson(row.metadata, {});
      afterSnapshot = metadataForNoteBlockClassification(beforeSnapshot, source, target, proposalId, recordId, mode, action);
      db.prepare(`
        UPDATE note_blocks
        SET metadata = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(stringifyJson(afterSnapshot), item.target_id, userId);
      courseId = courseId || row.course_id || null;
    } else {
      beforeSnapshot = {
        target_type: item.target_type,
        target_id: item.target_id,
        previous_domain_key: source.domain_key,
      };
      afterSnapshot = {
        target_type: item.target_type,
        target_id: item.target_id,
        current_domain_key: target.domain_key,
      };
    }

    const history = [{
      proposal_id: proposalId,
      record_id: recordId,
      mode,
      action,
      source_domain_key: source.domain_key,
      target_domain_key: target.domain_key,
      applied_at: new Date().toISOString(),
    }];
    db.prepare(`
      INSERT INTO domain_object_classifications (
        id, user_id, course_id, target_type, target_id, domain_block_set_id,
        domain_key, domain_version, classification_role, status,
        created_with_domain_block_set_id, created_with_domain_key,
        created_with_domain_version, current_domain_block_set_id,
        current_domain_key, current_domain_version, source_proposal_id,
        source_record_id, confidence, history, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      courseId,
      item.target_type,
      item.target_id,
      target.id,
      target.domain_key,
      target.version,
      item.classification_role || 'current',
      source.id,
      source.domain_key,
      source.version,
      target.id,
      target.domain_key,
      target.version,
      proposalId,
      recordId,
      item.confidence ?? null,
      stringifyJson(history),
      stringifyJson(item.metadata || {}),
    );
    insertRecordItem(db, userId, recordId, item.target_type, item.target_id, null, 'reclassify', beforeSnapshot, afterSnapshot);
    count += 1;
  }
  return count;
}

function applyPackageHardCascade(
  db: Database.Database,
  userId: string,
  source: DomainBlockSet,
  target: DomainBlockSet | null,
): number {
  if (!target || !source.package_manifest_id) return 0;
  const row = db.prepare('SELECT id, contents, metadata FROM package_manifests WHERE id = ? AND user_id = ?')
    .get(source.package_manifest_id, userId) as any;
  if (!row) return 0;
  const contents = parseJson<Record<string, unknown>>(row.contents, {});
  const domainKeys = Array.isArray(contents.domain_block_sets) ? contents.domain_block_sets as unknown[] : [];
  const nextDomainKeys = [...new Set(domainKeys.map((key) => key === source.domain_key ? target.domain_key : key))];
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  const history = Array.isArray(metadata.domain_refinement_history) ? metadata.domain_refinement_history : [];
  history.push({
    source_domain_key: source.domain_key,
    target_domain_key: target.domain_key,
    applied_at: new Date().toISOString(),
  });
  db.prepare(`
    UPDATE package_manifests
    SET contents = ?, metadata = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    stringifyJson({ ...contents, domain_block_sets: nextDomainKeys }),
    stringifyJson({ ...metadata, domain_refinement_history: history }),
    row.id,
    userId,
  );
  return 1;
}

export function applyDomainRefinementProposal(db: Database.Database, userId: string, proposal: ProposalRow) {
  if (proposal.type !== 'domain_refinement') {
    throw new AppError(400, 'Proposal is not a domain refinement proposal');
  }
  const data = parseJson<any>(proposal.data, {});
  if (!data || data.proposal_kind !== 'domain_refinement') {
    throw new AppError(400, 'Domain refinement proposal is malformed');
  }
  if (Array.isArray(data.blockers) && data.blockers.length > 0) {
    throw new AppError(400, 'Domain refinement proposal is blocked', { blockers: data.blockers });
  }
  const action = assertAction(data.refinement_action);
  const migrationMode = assertMode(data.migration_mode);
  const source = getDomainBlockSet(db, userId, data.source_domain_id);
  const target = migrationMode === 'alias_mapping'
    ? (data.target_domain_id ? getDomainBlockSet(db, userId, data.target_domain_id) : null)
    : createTargetDomainIfNeeded(db, userId, source, data.target_domain, proposal.id);

  const operationBatchId = insertOperationBatch(db, userId, data.course_id || null, proposal.id, action, migrationMode);
  const recordId = insertRecord(db, userId, proposal.id, operationBatchId, source, target, data);
  let mappingCount = 0;
  let classificationCount = 0;
  let packageMutationCount = 0;

  if (migrationMode === 'alias_mapping') {
    const result = db.prepare(`
      INSERT INTO domain_refinement_mappings (
        id, user_id, source_domain_block_set_id, target_domain_block_set_id,
        source_domain_key, source_domain_version, target_domain_key,
        target_domain_version, refinement_action, migration_mode, mapping_kind,
        status, source_proposal_id, source_record_id, reason, metadata,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'alias_mapping', 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      source.id,
      target?.id || null,
      source.domain_key,
      source.version,
      target?.domain_key || data.target_domain?.domain_key || null,
      target?.version || data.target_domain?.version || null,
      action,
      migrationMode,
      proposal.id,
      recordId,
      data.reason || null,
      stringifyJson({ graph_native_candidate: 'domain_compatibility_edge' }),
    );
    mappingCount = result.changes;
    insertRecordItem(db, userId, recordId, 'domain_refinement_mapping', null, `${source.domain_key}->${target?.domain_key || 'none'}`, 'alias_mapping', data.source_domain, data.target_domain || {});
  }

  if (migrationMode === 'soft_migration' || migrationMode === 'hard_cascade') {
    applyTemplateMembershipChanges(db, userId, target?.id || null, data.membership_diff?.template_membership_changes || [], migrationMode === 'hard_cascade');
    applyCompositionMembershipChanges(db, userId, target?.id || null, data.membership_diff?.composition_membership_changes || [], migrationMode === 'hard_cascade');
    classificationCount = applyObjectReclassifications(
      db,
      userId,
      data.course_id || null,
      proposal.id,
      recordId,
      source,
      target,
      data.object_reclassifications || [],
      migrationMode,
      action,
    );
    if (migrationMode === 'hard_cascade') {
      packageMutationCount = applyPackageHardCascade(db, userId, source, target);
    }
    if (['deprecate', 'merge'].includes(action) && !source.is_system) {
      db.prepare(`
        UPDATE domain_block_sets
        SET status = 'deprecated', updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(source.id, userId);
    }
    insertRecordItem(db, userId, recordId, 'domain_block_set', source.id, source.domain_key, action, data.source_domain, target ? domainSnapshot(target) : { status: 'deprecated' });
  }

  db.prepare(`
    UPDATE domain_refinement_records
    SET mapping_count = ?, classification_count = ?, affected_package_count = ?
    WHERE id = ?
  `).run(mappingCount, classificationCount, Math.max(data.affected_counts?.packages || 0, packageMutationCount), recordId);

  return {
    message: 'Domain refinement proposal applied',
    operation_batch_id: operationBatchId,
    domain_refinement_record_id: recordId,
    mappings_created_count: mappingCount,
    classifications_created_count: classificationCount,
    package_mutation_count: packageMutationCount,
    migration_mode: migrationMode,
    refinement_action: action,
    target_domain_id: target?.id || null,
  };
}

export function listDomainRefinementRecords(
  db: Database.Database,
  userId: string,
  filters: { source_domain_id?: string } = {},
) {
  const params: unknown[] = [userId];
  const where = ['user_id = ?'];
  if (filters.source_domain_id) {
    where.push('source_domain_block_set_id = ?');
    params.push(filters.source_domain_id);
  }
  return db.prepare(`
    SELECT *
    FROM domain_refinement_records
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
  `).all(...params).map((row: any) => ({
    ...row,
    target_domain_block_set_ids: parseJson(row.target_domain_block_set_ids, []),
    source_snapshot: parseJson(row.source_snapshot, {}),
    target_snapshot: parseJson(row.target_snapshot, {}),
    recovery_metadata: parseJson(row.recovery_metadata, {}),
    metadata: parseJson(row.metadata, {}),
  }));
}

export function listDomainObjectClassifications(
  db: Database.Database,
  userId: string,
  filters: { target_type?: string; target_id?: string; domain_id?: string } = {},
) {
  const params: unknown[] = [userId];
  const where = ['user_id = ?'];
  if (filters.target_type) {
    where.push('target_type = ?');
    params.push(filters.target_type);
  }
  if (filters.target_id) {
    where.push('target_id = ?');
    params.push(filters.target_id);
  }
  if (filters.domain_id) {
    where.push('domain_block_set_id = ?');
    params.push(filters.domain_id);
  }
  return db.prepare(`
    SELECT *
    FROM domain_object_classifications
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
  `).all(...params).map((row: any) => ({
    ...row,
    history: parseJson(row.history, []),
    metadata: parseJson(row.metadata, {}),
  }));
}
