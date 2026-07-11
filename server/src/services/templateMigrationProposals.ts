import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { legacyScannerBlockPredicate } from './sourceProjectionPolicy.js';
import {
  getTemplateDefinition,
  legacyBlockTypeForRuntimeTemplate,
  type TemplateDefinition,
} from './templateDefinitions.js';

type MigrationMode = 'alias_mapping' | 'soft_migration' | 'hard_cascade';

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
  created_at: string;
  resolved_at: string | null;
}

export interface CreateTemplateMigrationProposalInput {
  source_template_id: string;
  target_template_id?: string;
  target_template_patch?: Record<string, unknown>;
  migration_mode: MigrationMode;
  course_id?: string;
  reason?: string;
}

interface NoteBlockRow {
  id: string;
  user_id: string;
  course_id: string;
  block_type: string;
  title: string | null;
  content_json: string;
  plain_text: string | null;
  metadata: string;
}

interface TargetPreview {
  template: TemplateDefinition | Record<string, unknown>;
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

function assertMode(mode: string): MigrationMode {
  if (!['alias_mapping', 'soft_migration', 'hard_cascade'].includes(mode)) {
    throw new AppError(400, 'Invalid template migration mode.');
  }
  return mode as MigrationMode;
}

function ensureCourseAccess(db: Database.Database, userId: string, courseId?: string): void {
  if (!courseId) return;
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function templateSnapshot(template: TemplateDefinition | Record<string, unknown>) {
  return {
    id: template.id || null,
    template_key: template.template_key,
    version: template.version,
    label: template.label,
    system_type: template.system_type,
    learning_role: template.learning_role,
    legacy_block_type: template.legacy_block_type,
    field_schema: template.field_schema || [],
    default_content: template.default_content || {},
    render_hints: template.render_hints || {},
    source_behavior: template.source_behavior || {},
    relation_behavior: template.relation_behavior || {},
    proposal_behavior: template.proposal_behavior || {},
    status: template.status || 'preview',
  };
}

function resolveTarget(
  db: Database.Database,
  userId: string,
  source: TemplateDefinition,
  input: CreateTemplateMigrationProposalInput,
): TargetPreview {
  if (input.target_template_id) {
    return {
      template: getTemplateDefinition(db, userId, input.target_template_id),
      persisted: true,
    };
  }
  if (input.target_template_patch && Object.keys(input.target_template_patch).length > 0) {
    return {
      template: {
        ...source,
        ...input.target_template_patch,
        id: null,
        status: 'preview',
      },
      persisted: false,
    };
  }
  throw new AppError(400, 'Template migration requires a target_template_id or target_template_patch.');
}

function metadataMatchesSource(metadata: Record<string, unknown>, blockType: string, source: TemplateDefinition): boolean {
  if (metadata.template_definition_id === source.id) return true;
  if (metadata.template_key === source.template_key && (!metadata.template_version || metadata.template_version === source.version)) return true;
  if (metadata.template_id === source.template_key) return true;
  const hasExplicitTemplate = Boolean(metadata.template_definition_id || metadata.template_key || metadata.template_id);
  return !hasExplicitTemplate && source.origin === 'system_seed' && blockType === source.legacy_block_type;
}

function findAffectedBlocks(
  db: Database.Database,
  userId: string,
  source: TemplateDefinition,
  courseId?: string,
): NoteBlockRow[] {
  const params: unknown[] = [userId];
  let where = `user_id = ? AND status != 'trashed' AND ${legacyScannerBlockPredicate()}`;
  if (courseId) {
    where += ' AND course_id = ?';
    params.push(courseId);
  }
  const rows = db.prepare(`
    SELECT id, user_id, course_id, block_type, title, content_json, plain_text, metadata
    FROM note_blocks
    WHERE ${where}
    ORDER BY created_at ASC
  `).all(...params) as NoteBlockRow[];
  return rows.filter((row) => metadataMatchesSource(parseJson(row.metadata, {}), row.block_type, source));
}

function fieldKeys(fields: unknown): Set<string> {
  if (!Array.isArray(fields)) return new Set();
  return new Set(fields.map((field) => field && typeof field === 'object' ? (field as any).key : null).filter(Boolean));
}

function requiredFields(fields: unknown): Array<{ key: string }> {
  if (!Array.isArray(fields)) return [];
  return fields.filter((field) => field && typeof field === 'object' && (field as any).required && typeof (field as any).key === 'string')
    .map((field) => ({ key: (field as any).key }));
}

function migrationDiff(source: TemplateDefinition, target: TemplateDefinition | Record<string, unknown>) {
  const fields = [
    'template_key',
    'version',
    'label',
    'system_type',
    'learning_role',
    'legacy_block_type',
    'field_schema',
    'default_content',
    'render_hints',
    'source_behavior',
    'relation_behavior',
    'proposal_behavior',
  ];
  return fields
    .filter((field) => JSON.stringify((source as any)[field] ?? null) !== JSON.stringify((target as any)[field] ?? null))
    .map((field) => ({
      field,
      before: (source as any)[field] ?? null,
      after: (target as any)[field] ?? null,
    }));
}

function hardCascadeBlockers(source: TemplateDefinition, target: TemplateDefinition | Record<string, unknown>): string[] {
  const blockers: string[] = [];
  const sourceKeys = fieldKeys(source.field_schema);
  const targetKeys = fieldKeys(target.field_schema);
  for (const key of sourceKeys) {
    if (!targetKeys.has(key)) {
      blockers.push(`Hard cascade would remove existing field "${key}".`);
    }
  }
  const targetDefaults = target.default_content && typeof target.default_content === 'object'
    ? target.default_content as Record<string, unknown>
    : {};
  for (const field of requiredFields(target.field_schema)) {
    if (!sourceKeys.has(field.key) && targetDefaults[field.key] === undefined) {
      blockers.push(`Hard cascade cannot add required field "${field.key}" without a default value.`);
    }
  }
  return blockers;
}

function afterMetadataForMode(
  before: Record<string, unknown>,
  source: TemplateDefinition,
  target: TemplateDefinition,
  proposalId: string,
  recordId: string | null,
  mode: MigrationMode,
) {
  const history = Array.isArray(before.template_migration_history)
    ? [...before.template_migration_history]
    : [];
  history.push({
    proposal_id: proposalId,
    record_id: recordId,
    mode,
    source_template_definition_id: source.id,
    source_template_key: source.template_key,
    source_template_version: source.version,
    target_template_definition_id: target.id,
    target_template_key: target.template_key,
    target_template_version: target.version,
    applied_at: new Date().toISOString(),
  });

  return {
    ...before,
    created_with_template_definition_id: before.created_with_template_definition_id || source.id,
    created_with_template_key: before.created_with_template_key || source.template_key,
    created_with_template_version: before.created_with_template_version || source.version,
    template_definition_id: target.id,
    template_key: target.template_key,
    template_id: target.template_key,
    template_version: target.version,
    system_type: target.system_type,
    learning_role: target.learning_role,
    template_resolution_status: 'runtime_resolved',
    taxonomy_version: 'v2.5.4',
    template_migration_history: history,
  };
}

function hardCascadeContent(beforeContent: Record<string, unknown>, target: TemplateDefinition): Record<string, unknown> {
  const next = { ...beforeContent };
  const targetDefaults = target.default_content || {};
  for (const field of requiredFields(target.field_schema)) {
    if (next[field.key] === undefined) {
      next[field.key] = targetDefaults[field.key] ?? '';
    }
  }
  return next;
}

function sampleBeforeAfter(
  blocks: NoteBlockRow[],
  source: TemplateDefinition,
  target: TemplateDefinition | Record<string, unknown>,
  proposalId: string,
  mode: MigrationMode,
) {
  return blocks.slice(0, 5).map((block) => {
    const beforeMetadata = parseJson<Record<string, unknown>>(block.metadata, {});
    const afterMetadata = target.id
      ? afterMetadataForMode(beforeMetadata, source, target as TemplateDefinition, proposalId, null, mode)
      : beforeMetadata;
    return {
      note_block_id: block.id,
      title: block.title,
      before: {
        block_type: block.block_type,
        template_key: beforeMetadata.template_key || beforeMetadata.template_id || null,
        metadata: beforeMetadata,
      },
      after: {
        block_type: mode === 'hard_cascade' && target.id ? legacyBlockTypeForRuntimeTemplate(target as TemplateDefinition) : block.block_type,
        template_key: (target as any).template_key || null,
        metadata: afterMetadata,
      },
    };
  });
}

export function createTemplateMigrationProposal(
  db: Database.Database,
  userId: string,
  input: CreateTemplateMigrationProposalInput,
) {
  const migrationMode = assertMode(input.migration_mode);
  ensureCourseAccess(db, userId, input.course_id);
  const source = getTemplateDefinition(db, userId, input.source_template_id);
  const targetPreview = resolveTarget(db, userId, source, input);
  const target = targetPreview.template;
  const affectedBlocks = findAffectedBlocks(db, userId, source, input.course_id);
  const proposalId = uuidv4();
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!targetPreview.persisted) {
    blockers.push('Target template patch preview is not persisted; create or copy a target template before applying migration.');
  }
  if (migrationMode === 'hard_cascade') {
    blockers.push(...hardCascadeBlockers(source, target));
  }
  if (affectedBlocks.length === 0) {
    warnings.push('No NoteBlocks currently resolve to the source template.');
  }
  if (source.id === target.id) {
    blockers.push('Source and target templates are identical.');
  }

  const data = {
    proposal_kind: 'template_migration',
    source_template_id: source.id,
    source_template: templateSnapshot(source),
    target_template_id: target.id || null,
    target_template: templateSnapshot(target),
    target_is_persisted: targetPreview.persisted,
    migration_mode: migrationMode,
    direct_safe: false,
    proposal_required: true,
    diff: migrationDiff(source, target),
    affected_object_count: affectedBlocks.length,
    samples: sampleBeforeAfter(affectedBlocks, source, target, proposalId, migrationMode),
    source_impact: {
      course_id: input.course_id || null,
      existing_blocks: affectedBlocks.length,
    },
    relation_impact: {
      object_relations_modified: 0,
      note: 'Template migration does not create or rewrite ObjectRelations in v2.5.4.',
    },
    render_impact: {
      legacy_block_type_before: source.legacy_block_type,
      legacy_block_type_after: target.legacy_block_type || source.legacy_block_type,
      hard_cascade_updates_block_type: migrationMode === 'hard_cascade',
    },
    warnings,
    blockers,
    recovery_plan: {
      record_items: true,
      before_metadata_captured: true,
      before_content_captured_for_hard_cascade: true,
      rollback_is_manual_for_v2_5_4: true,
    },
    reason: input.reason || null,
    apply_behavior: 'template_migration_records_only_or_metadata_updates',
  };
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'template_migration', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  return {
    id: proposalId,
    user_id: userId,
    type: 'template_migration',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

function insertOperationBatch(db: Database.Database, userId: string, courseId: string | null, proposalId: string, mode: MigrationMode): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply template migration proposal', 'applied', ?, ?)
  `).run(
    id,
    userId,
    courseId,
    proposalId,
    stringifyJson({
      proposal_type: 'template_migration',
      migration_mode: mode,
    }),
    new Date().toISOString(),
  );
  return id;
}

function insertRecord(
  db: Database.Database,
  userId: string,
  proposalId: string,
  operationBatchId: string,
  data: any,
  affectedCount: number,
): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO template_migration_records (
      id, user_id, course_id, source_proposal_id, operation_batch_id, migration_mode,
      source_template_definition_id, source_template_key, source_template_version,
      target_template_definition_id, target_template_key, target_template_version,
      affected_count, mutated_count, mapping_count, status, warnings, blockers,
      recovery_metadata, metadata, applied_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'applied', ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.source_impact?.course_id || null,
    proposalId,
    operationBatchId,
    data.migration_mode,
    data.source_template_id,
    data.source_template?.template_key,
    data.source_template?.version,
    data.target_template_id || null,
    data.target_template?.template_key || null,
    data.target_template?.version || null,
    affectedCount,
    stringifyJson(data.warnings || []),
    stringifyJson(data.blockers || []),
    stringifyJson(data.recovery_plan || {}),
    stringifyJson({
      diff: data.diff || [],
      graph_native_evidence: 'template_migration_operation_history_candidate',
    }),
    new Date().toISOString(),
  );
  return id;
}

function insertRecordItem(
  db: Database.Database,
  userId: string,
  recordId: string,
  block: NoteBlockRow,
  action: string,
  beforeMetadata: Record<string, unknown>,
  afterMetadata: Record<string, unknown>,
  beforeContent: Record<string, unknown>,
  afterContent: Record<string, unknown>,
  afterBlockType: string,
  warnings: string[] = [],
): void {
  db.prepare(`
    INSERT INTO template_migration_record_items (
      id, user_id, course_id, template_migration_record_id, note_block_id,
      action, status, before_block_type, after_block_type, before_metadata,
      after_metadata, before_content_json, after_content_json, warnings,
      metadata, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    uuidv4(),
    userId,
    block.course_id,
    recordId,
    block.id,
    action,
    block.block_type,
    afterBlockType,
    stringifyJson(beforeMetadata),
    stringifyJson(afterMetadata),
    stringifyJson(beforeContent),
    stringifyJson(afterContent),
    stringifyJson(warnings),
    stringifyJson({ graph_native_evidence: 'per_block_template_migration_item' }),
  );
}

function updateRecordCounts(db: Database.Database, recordId: string, mutatedCount: number, mappingCount: number): void {
  db.prepare(`
    UPDATE template_migration_records
    SET mutated_count = ?, mapping_count = ?
    WHERE id = ?
  `).run(mutatedCount, mappingCount, recordId);
}

export function applyTemplateMigrationProposal(db: Database.Database, userId: string, proposal: ProposalRow) {
  if (proposal.type !== 'template_migration') {
    throw new AppError(400, 'Proposal is not a template migration proposal');
  }
  const data = parseJson<any>(proposal.data, {});
  if (!data || data.proposal_kind !== 'template_migration') {
    throw new AppError(400, 'Template migration proposal is malformed');
  }
  if (Array.isArray(data.blockers) && data.blockers.length > 0) {
    throw new AppError(400, 'Template migration proposal is blocked', { blockers: data.blockers });
  }

  const migrationMode = assertMode(data.migration_mode);
  const source = getTemplateDefinition(db, userId, data.source_template_id);
  if (!data.target_template_id) {
    throw new AppError(400, 'Template migration target must be a persisted template.');
  }
  const target = getTemplateDefinition(db, userId, data.target_template_id);
  const affectedBlocks = findAffectedBlocks(db, userId, source, data.source_impact?.course_id || undefined);
  if (migrationMode === 'hard_cascade') {
    const blockers = hardCascadeBlockers(source, target);
    if (blockers.length > 0) {
      throw new AppError(400, 'Template migration proposal is blocked', { blockers });
    }
  }

  const operationBatchId = insertOperationBatch(db, userId, data.source_impact?.course_id || null, proposal.id, migrationMode);
  const recordId = insertRecord(db, userId, proposal.id, operationBatchId, data, affectedBlocks.length);
  let mutatedCount = 0;
  let mappingCount = 0;

  if (migrationMode === 'alias_mapping') {
    const result = db.prepare(`
      INSERT OR IGNORE INTO template_migration_mappings (
        id, user_id, source_template_definition_id, target_template_definition_id,
        source_template_key, source_template_version, target_template_key,
        target_template_version, mapping_kind, status, source_proposal_id,
        operation_batch_id, reason, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'alias_mapping', 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      source.id,
      target.id,
      source.template_key,
      source.version,
      target.template_key,
      target.version,
      proposal.id,
      operationBatchId,
      data.reason || null,
      stringifyJson({ graph_native_candidate: 'template_compatibility_edge' }),
    );
    mappingCount = result.changes;
  }

  for (const block of affectedBlocks) {
    const beforeMetadata = parseJson<Record<string, unknown>>(block.metadata, {});
    const beforeContent = parseJson<Record<string, unknown>>(block.content_json, {});
    let afterMetadata = beforeMetadata;
    let afterContent = beforeContent;
    let afterBlockType = block.block_type;
    const action = migrationMode;

    if (migrationMode === 'soft_migration' || migrationMode === 'hard_cascade') {
      afterMetadata = afterMetadataForMode(beforeMetadata, source, target, proposal.id, recordId, migrationMode);
      if (migrationMode === 'hard_cascade') {
        afterBlockType = legacyBlockTypeForRuntimeTemplate(target);
        afterContent = hardCascadeContent(beforeContent, target);
      }
      db.prepare(`
        UPDATE note_blocks
        SET block_type = ?, metadata = ?, content_json = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(
        afterBlockType,
        stringifyJson(afterMetadata),
        stringifyJson(afterContent),
        block.id,
        userId,
      );
      mutatedCount += 1;
    }

    insertRecordItem(
      db,
      userId,
      recordId,
      block,
      action,
      beforeMetadata,
      afterMetadata,
      beforeContent,
      afterContent,
      afterBlockType,
    );
  }

  updateRecordCounts(db, recordId, mutatedCount, mappingCount);

  return {
    message: 'Template migration proposal applied',
    operation_batch_id: operationBatchId,
    template_migration_record_id: recordId,
    affected_blocks_count: affectedBlocks.length,
    blocks_mutated_count: mutatedCount,
    mappings_created_count: mappingCount,
    migration_mode: migrationMode,
  };
}
