import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  getNoteBlockTemplate,
  inferNoteBlockTemplateMetadata,
  legacyBlockTypeForTemplate,
  listNoteBlockTemplates,
  type NoteBlockLearningRole,
  type NoteBlockSystemType,
  type NoteBlockTemplateDefinition,
} from '../lib/noteBlockTemplates.js';

export const TEMPLATE_RUNTIME_TAXONOMY_VERSION = 'v2.5.0' as const;
export const SYSTEM_TEMPLATE_VERSION = '1.0.0' as const;

type TemplateStatus =
  | 'runtime_resolved'
  | 'legacy_inferred'
  | 'template_missing'
  | 'template_deprecated'
  | 'metadata_conflict'
  | 'unknown_legacy_type'
  | 'manual_review_required';

type TemplateDefinitionStatus = TemplateDefinition['status'];
type TemplateOrigin = TemplateDefinition['origin'];
type TemplateScopeType = TemplateDefinition['scope_type'];
type LegacyBlockType = TemplateDefinition['legacy_block_type'];

type TemplateFieldKind = 'text' | 'textarea' | 'latex' | 'code' | 'checkbox' | 'list';

interface TemplateFieldInput {
  key: string;
  label: string;
  kind: TemplateFieldKind;
  required?: boolean;
}

export interface TemplateDefinitionEditorInput {
  template_key?: string;
  version?: string;
  label?: string;
  description?: string | null;
  system_type?: NoteBlockSystemType;
  learning_role?: NoteBlockLearningRole;
  legacy_block_type?: LegacyBlockType;
  field_schema?: unknown;
  default_content?: Record<string, unknown>;
  render_hints?: Record<string, unknown>;
  source_behavior?: Record<string, unknown>;
  relation_behavior?: Record<string, unknown>;
  proposal_behavior?: Record<string, unknown>;
  summary_for_agent?: string;
  metadata?: Record<string, unknown>;
}

export interface TemplateUsageSummary {
  template_id: string;
  template_key: string;
  template_version: string;
  total_blocks: number;
  runtime_reference_count: number;
  key_version_reference_count: number;
  legacy_template_id_count: number;
}

const SYSTEM_TYPES = new Set<NoteBlockSystemType>([
  'text',
  'latex',
  'code',
  'source_quote',
  'task',
  'media',
  'table',
]);

const LEARNING_ROLES = new Set<NoteBlockLearningRole>([
  'note',
  'concept',
  'definition',
  'theorem',
  'proof',
  'formula',
  'example',
  'exercise',
  'answer',
  'warning',
  'source',
]);

const LEGACY_BLOCK_TYPES = new Set<LegacyBlockType>([
  'heading',
  'paragraph',
  'definition',
  'theorem',
  'proof',
  'formula',
  'example',
  'exercise',
  'answer',
  'sidenote',
]);

const FIELD_KINDS = new Set<TemplateFieldKind>([
  'text',
  'textarea',
  'latex',
  'code',
  'checkbox',
  'list',
]);

const STRUCTURAL_TEMPLATE_FIELDS = new Set<keyof TemplateDefinitionEditorInput>([
  'template_key',
  'version',
  'system_type',
  'learning_role',
  'legacy_block_type',
  'field_schema',
  'default_content',
  'source_behavior',
  'relation_behavior',
  'proposal_behavior',
]);

export interface TemplateDefinition {
  id: string;
  user_id: string;
  template_key: string;
  version: string;
  origin: 'system_seed' | 'user' | 'package' | 'migration';
  scope_type: 'global' | 'course' | 'package';
  scope_id: string;
  label: string;
  description: string | null;
  system_type: NoteBlockSystemType;
  learning_role: NoteBlockLearningRole;
  legacy_block_type: ReturnType<typeof legacyBlockTypeForTemplate>;
  field_schema: unknown[];
  default_content: Record<string, unknown>;
  render_hints: Record<string, unknown>;
  source_behavior: Record<string, unknown>;
  relation_behavior: Record<string, unknown>;
  proposal_behavior: Record<string, unknown>;
  summary_for_agent: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TemplateCompatibilityReport {
  user_id: string;
  course_id: string | null;
  totals: Record<TemplateStatus | 'total_blocks', number>;
  warnings: string[];
  details: Array<{
    block_id: string;
    course_id: string;
    block_type: string;
    status: TemplateStatus;
    template_key: string | null;
    template_definition_id: string | null;
    warnings: string[];
  }>;
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

function assertTemplateKey(templateKey: string): string {
  const normalized = templateKey.trim();
  if (!/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(normalized) || normalized.length > 140) {
    throw new AppError(400, 'Invalid template_key. Use a lowercase dotted key such as definition.custom.');
  }
  return normalized;
}

function assertVersion(version: string | undefined): string {
  const normalized = (version || SYSTEM_TEMPLATE_VERSION).trim();
  if (!/^[0-9]+(\.[0-9]+){0,2}([_-][a-z0-9]+)?$/i.test(normalized) || normalized.length > 32) {
    throw new AppError(400, 'Invalid template version.');
  }
  return normalized;
}

function assertLabel(label: string | undefined): string {
  const normalized = (label || '').trim();
  if (!normalized || normalized.length > 120) {
    throw new AppError(400, 'Template label is required and must be 120 characters or fewer.');
  }
  return normalized;
}

function assertSystemType(systemType: unknown): NoteBlockSystemType {
  if (typeof systemType !== 'string' || !SYSTEM_TYPES.has(systemType as NoteBlockSystemType)) {
    throw new AppError(400, 'Invalid system_type.');
  }
  return systemType as NoteBlockSystemType;
}

function assertLearningRole(learningRole: unknown): NoteBlockLearningRole {
  if (typeof learningRole !== 'string' || !LEARNING_ROLES.has(learningRole as NoteBlockLearningRole)) {
    throw new AppError(400, 'Invalid learning_role.');
  }
  return learningRole as NoteBlockLearningRole;
}

function assertLegacyBlockType(legacyBlockType: unknown, systemType: NoteBlockSystemType, learningRole: NoteBlockLearningRole): LegacyBlockType {
  if (typeof legacyBlockType === 'string' && LEGACY_BLOCK_TYPES.has(legacyBlockType as LegacyBlockType)) {
    return legacyBlockType as LegacyBlockType;
  }
  if (systemType === 'latex' || learningRole === 'formula') return 'formula';
  if (systemType === 'task' || learningRole === 'exercise') return 'exercise';
  if (learningRole === 'definition') return 'definition';
  if (learningRole === 'theorem') return 'theorem';
  if (learningRole === 'proof') return 'proof';
  if (learningRole === 'example') return 'example';
  if (learningRole === 'answer') return 'answer';
  if (learningRole === 'warning') return 'sidenote';
  return 'paragraph';
}

function normalizeFieldSchema(raw: unknown): TemplateFieldInput[] {
  if (raw === undefined || raw === null) return [{ key: 'body', label: 'Body', kind: 'textarea', required: true }];
  if (!Array.isArray(raw)) {
    throw new AppError(400, 'field_schema must be an array.');
  }
  if (raw.length > 8) {
    throw new AppError(400, 'field_schema supports at most 8 fields in v2.5.1.');
  }
  if (raw.length === 0) {
    throw new AppError(400, 'field_schema must include at least one field.');
  }

  const keys = new Set<string>();
  return raw.map((field) => {
    if (!field || typeof field !== 'object') {
      throw new AppError(400, 'Each field_schema item must be an object.');
    }
    const input = field as Record<string, unknown>;
    const key = typeof input.key === 'string' ? input.key.trim() : '';
    const label = typeof input.label === 'string' ? input.label.trim() : '';
    const kind = input.kind;
    if (!/^[a-z][a-z0-9_]*$/.test(key) || key.length > 64) {
      throw new AppError(400, 'Each field key must be a lowercase identifier.');
    }
    if (keys.has(key)) {
      throw new AppError(400, `Duplicate field key: ${key}`);
    }
    keys.add(key);
    if (!label || label.length > 80) {
      throw new AppError(400, 'Each field label is required and must be 80 characters or fewer.');
    }
    if (typeof kind !== 'string' || !FIELD_KINDS.has(kind as TemplateFieldKind)) {
      throw new AppError(400, `Invalid field kind for ${key}.`);
    }
    return {
      key,
      label,
      kind: kind as TemplateFieldKind,
      required: Boolean(input.required),
    };
  });
}

function normalizeRecord(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (value === undefined) return fallback;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'Template object fields must be JSON objects.');
  }
  return value as Record<string, unknown>;
}

function templateHasStructuralChange(input: TemplateDefinitionEditorInput): boolean {
  return Object.keys(input).some((key) => STRUCTURAL_TEMPLATE_FIELDS.has(key as keyof TemplateDefinitionEditorInput));
}

function assertEditableTemplate(template: TemplateDefinition): void {
  if (template.is_system || template.origin === 'system_seed') {
    throw new AppError(403, 'System templates are read-only; copy the template before editing.');
  }
}

function sourceBehaviorForTemplate(template: NoteBlockTemplateDefinition): Record<string, unknown> {
  const policy = template.template_id === 'source.quote'
    ? 'required'
    : template.source_reference_allowed
      ? 'recommended'
      : 'forbidden';
  return {
    source_reference_policy: policy,
    source_truth_owner: 'note_block_sources/source_anchors/source_scopes',
    missing_source_warning: policy === 'required',
  };
}

function relationBehaviorForTemplate(template: NoteBlockTemplateDefinition): Record<string, unknown> {
  const roleRelations: Record<string, string[]> = {
    definition: ['uses_definition'],
    formula: ['uses_formula', 'derives_to'],
    example: ['example_of', 'supports'],
    exercise: ['answers', 'read_before'],
    answer: ['answers'],
    source: ['source_supports', 'supports'],
    proof: ['supports', 'derives_to'],
    theorem: ['uses_definition', 'uses_formula', 'read_before'],
    concept: ['supports', 'read_before'],
    warning: ['read_before'],
    note: ['read_before', 'supports'],
  };
  return {
    can_be_relation_source: true,
    can_be_relation_target: true,
    allowed_relation_types: roleRelations[template.learning_role] || ['supports'],
    relation_truth_owner: 'object_relations',
  };
}

function proposalBehaviorForTemplate(template: NoteBlockTemplateDefinition): Record<string, unknown> {
  return {
    proposal_allowed: template.proposal_allowed,
    ai_generation: template.proposal_allowed ? 'allowed_with_review' : 'forbidden',
    direct_manual_create: 'allowed',
    bulk_migration_requires_proposal: true,
    source_or_relation_mutation_requires_proposal: true,
  };
}

function renderHintsForTemplate(template: NoteBlockTemplateDefinition): Record<string, unknown> {
  return {
    reading: { display: template.render_hint, type_label: 'contextual' },
    editing: { display: template.render_hint, type_label: 'visible' },
    canvas: { display: template.render_hint, type_label: 'hover_or_selected' },
    debug: { display: template.render_hint, type_label: 'always' },
    proposal: { display: template.render_hint, type_label: 'visible' },
    export_aware: { display: template.render_hint },
  };
}

function summaryForAgent(template: NoteBlockTemplateDefinition): string {
  return [
    `${template.label} (${template.template_id}) is a ${template.system_type} block used for ${template.learning_role} content.`,
    `Use it when source material clearly asks for: ${template.description}`,
    `Required fields: ${template.fields.filter((field) => field.required).map((field) => field.key).join(', ') || 'none'}.`,
    'If the source evidence or role is unclear, fall back to text.paragraph and add a warning.',
    'Do not use this template to bypass proposal-first review for source, relation, migration, or bulk content changes.',
  ].join(' ');
}

function hydrateTemplate(row: any): TemplateDefinition {
  return {
    ...row,
    field_schema: parseJson(row.field_schema, []),
    default_content: parseJson(row.default_content, {}),
    render_hints: parseJson(row.render_hints, {}),
    source_behavior: parseJson(row.source_behavior, {}),
    relation_behavior: parseJson(row.relation_behavior, {}),
    proposal_behavior: parseJson(row.proposal_behavior, {}),
    is_system: Boolean(row.is_system),
    metadata: parseJson(row.metadata, {}),
  };
}

function seedInput(template: NoteBlockTemplateDefinition) {
  return {
    id: uuidv4(),
    template_key: template.template_id,
    version: SYSTEM_TEMPLATE_VERSION,
    origin: 'system_seed',
    scope_type: 'global',
    scope_id: '',
    label: template.label,
    description: template.description,
    system_type: template.system_type,
    learning_role: template.learning_role,
    legacy_block_type: template.legacy_block_type,
    field_schema: template.fields,
    default_content: template.default_content,
    render_hints: renderHintsForTemplate(template),
    source_behavior: sourceBehaviorForTemplate(template),
    relation_behavior: relationBehaviorForTemplate(template),
    proposal_behavior: proposalBehaviorForTemplate(template),
    summary_for_agent: summaryForAgent(template),
    status: 'active',
    is_system: 1,
    metadata: {
      seeded_from: 'v2.1.1_static_registry',
      static_template_id: template.template_id,
      static_render_hint: template.render_hint,
      graph_native_candidate: 'graph_adjacent_capability_node',
    },
  };
}

export function seedSystemTemplateDefinitions(db: Database.Database, userId: string): TemplateDefinition[] {
  const insert = db.prepare(`
    INSERT INTO template_definitions (
      id, user_id, template_key, version, origin, scope_type, scope_id, label,
      description, system_type, learning_role, legacy_block_type, field_schema,
      default_content, render_hints, source_behavior, relation_behavior,
      proposal_behavior, summary_for_agent, status, is_system, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, template_key, version, scope_type, scope_id) DO UPDATE SET
      label = excluded.label,
      description = excluded.description,
      system_type = excluded.system_type,
      learning_role = excluded.learning_role,
      legacy_block_type = excluded.legacy_block_type,
      field_schema = excluded.field_schema,
      default_content = excluded.default_content,
      render_hints = excluded.render_hints,
      source_behavior = excluded.source_behavior,
      relation_behavior = excluded.relation_behavior,
      proposal_behavior = excluded.proposal_behavior,
      summary_for_agent = excluded.summary_for_agent,
      status = 'active',
      is_system = 1,
      metadata = excluded.metadata,
      updated_at = datetime('now')
  `);

  const run = db.transaction(() => {
    for (const template of listNoteBlockTemplates()) {
      const input = seedInput(template);
      insert.run(
        input.id,
        userId,
        input.template_key,
        input.version,
        input.origin,
        input.scope_type,
        input.scope_id,
        input.label,
        input.description,
        input.system_type,
        input.learning_role,
        input.legacy_block_type,
        stringifyJson(input.field_schema),
        stringifyJson(input.default_content),
        stringifyJson(input.render_hints),
        stringifyJson(input.source_behavior),
        stringifyJson(input.relation_behavior),
        stringifyJson(input.proposal_behavior),
        input.summary_for_agent,
        input.status,
        input.is_system,
        stringifyJson(input.metadata),
      );
    }
  });

  run();
  return listTemplateDefinitions(db, userId, { status: 'active' });
}

export function listTemplateDefinitions(
  db: Database.Database,
  userId: string,
  filters: {
    status?: string;
    template_key?: string;
    system_type?: string;
    learning_role?: string;
  } = {},
): TemplateDefinition[] {
  const params: unknown[] = [userId];
  const where = ['user_id = ?'];
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.template_key) {
    where.push('template_key = ?');
    params.push(filters.template_key);
  }
  if (filters.system_type) {
    where.push('system_type = ?');
    params.push(filters.system_type);
  }
  if (filters.learning_role) {
    where.push('learning_role = ?');
    params.push(filters.learning_role);
  }

  return db.prepare(`
    SELECT *
    FROM template_definitions
    WHERE ${where.join(' AND ')}
    ORDER BY is_system DESC, template_key ASC, version ASC
  `).all(...params).map(hydrateTemplate);
}

export function getTemplateDefinition(db: Database.Database, userId: string, id: string): TemplateDefinition {
  seedSystemTemplateDefinitions(db, userId);
  const row = db.prepare('SELECT * FROM template_definitions WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!row) throw new AppError(404, 'Template definition not found');
  return hydrateTemplate(row);
}

function ensureTemplateKeyAvailable(
  db: Database.Database,
  userId: string,
  templateKey: string,
  version: string,
  scopeType: TemplateScopeType = 'global',
  scopeId: string = '',
  excludeId?: string,
): void {
  const existing = db.prepare(`
    SELECT id
    FROM template_definitions
    WHERE user_id = ?
      AND template_key = ?
      AND version = ?
      AND scope_type = ?
      AND scope_id = ?
      ${excludeId ? 'AND id != ?' : ''}
  `).get(...([userId, templateKey, version, scopeType, scopeId, ...(excludeId ? [excludeId] : [])]));
  if (existing) {
    throw new AppError(409, `Template ${templateKey} v${version} already exists.`);
  }
}

function insertTemplateDefinition(
  db: Database.Database,
  userId: string,
  input: {
    id?: string;
    template_key: string;
    version?: string;
    origin: TemplateOrigin;
    scope_type?: TemplateScopeType;
    scope_id?: string;
    label: string;
    description?: string | null;
    system_type: NoteBlockSystemType;
    learning_role: NoteBlockLearningRole;
    legacy_block_type?: LegacyBlockType;
    field_schema?: unknown;
    default_content?: Record<string, unknown>;
    render_hints?: Record<string, unknown>;
    source_behavior?: Record<string, unknown>;
    relation_behavior?: Record<string, unknown>;
    proposal_behavior?: Record<string, unknown>;
    summary_for_agent?: string;
    status?: TemplateDefinitionStatus;
    is_system?: boolean;
    metadata?: Record<string, unknown>;
  },
): TemplateDefinition {
  const id = input.id || uuidv4();
  const templateKey = assertTemplateKey(input.template_key);
  const version = assertVersion(input.version);
  const scopeType = input.scope_type || 'global';
  const scopeId = input.scope_id || '';
  const label = assertLabel(input.label);
  const systemType = assertSystemType(input.system_type);
  const learningRole = assertLearningRole(input.learning_role);
  const legacyBlockType = assertLegacyBlockType(input.legacy_block_type, systemType, learningRole);
  const fieldSchema = normalizeFieldSchema(input.field_schema);
  const defaultContent = normalizeRecord(input.default_content, { body: '' });
  const renderHints = normalizeRecord(input.render_hints, { reading: { intent: legacyBlockType } });
  const sourceBehavior = normalizeRecord(input.source_behavior, { source_reference_policy: 'allowed' });
  const relationBehavior = normalizeRecord(input.relation_behavior, { relation_preset: 'none' });
  const proposalBehavior = normalizeRecord(input.proposal_behavior, { proposal_preset: 'manual_only' });
  const metadata = normalizeRecord(input.metadata, {});

  ensureTemplateKeyAvailable(db, userId, templateKey, version, scopeType, scopeId);
  db.prepare(`
    INSERT INTO template_definitions (
      id, user_id, template_key, version, origin, scope_type, scope_id, label,
      description, system_type, learning_role, legacy_block_type, field_schema,
      default_content, render_hints, source_behavior, relation_behavior,
      proposal_behavior, summary_for_agent, status, is_system, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    templateKey,
    version,
    input.origin,
    scopeType,
    scopeId,
    label,
    input.description || null,
    systemType,
    learningRole,
    legacyBlockType,
    stringifyJson(fieldSchema),
    stringifyJson(defaultContent),
    stringifyJson(renderHints),
    stringifyJson(sourceBehavior),
    stringifyJson(relationBehavior),
    stringifyJson(proposalBehavior),
    input.summary_for_agent || '',
    input.status || 'draft',
    input.is_system ? 1 : 0,
    stringifyJson(metadata),
  );

  return getTemplateDefinition(db, userId, id);
}

export function createUserTemplateDefinition(
  db: Database.Database,
  userId: string,
  input: TemplateDefinitionEditorInput & {
    template_key: string;
    label: string;
    system_type: NoteBlockSystemType;
    learning_role: NoteBlockLearningRole;
  },
): TemplateDefinition {
  seedSystemTemplateDefinitions(db, userId);
  return insertTemplateDefinition(db, userId, {
    ...input,
    origin: 'user',
    scope_type: 'global',
    scope_id: '',
    status: 'draft',
    is_system: false,
    metadata: {
      ...(input.metadata || {}),
      created_from: 'v2.5.1_template_studio',
      graph_native_candidate: 'user_template_definition_node',
    },
  });
}

export function copyTemplateDefinition(
  db: Database.Database,
  userId: string,
  sourceTemplateId: string,
  input: Pick<TemplateDefinitionEditorInput, 'template_key' | 'label' | 'description' | 'summary_for_agent' | 'metadata'>,
): TemplateDefinition {
  seedSystemTemplateDefinitions(db, userId);
  const source = getTemplateDefinition(db, userId, sourceTemplateId);
  const templateKey = input.template_key
    ? assertTemplateKey(input.template_key)
    : assertTemplateKey(`${source.template_key}.copy`);
  const label = input.label || `${source.label} Copy`;

  return insertTemplateDefinition(db, userId, {
    template_key: templateKey,
    version: SYSTEM_TEMPLATE_VERSION,
    origin: 'user',
    scope_type: 'global',
    scope_id: '',
    label,
    description: input.description !== undefined ? input.description : source.description,
    system_type: source.system_type,
    learning_role: source.learning_role,
    legacy_block_type: source.legacy_block_type,
    field_schema: source.field_schema,
    default_content: source.default_content,
    render_hints: source.render_hints,
    source_behavior: source.source_behavior,
    relation_behavior: source.relation_behavior,
    proposal_behavior: source.proposal_behavior,
    summary_for_agent: input.summary_for_agent || source.summary_for_agent,
    status: 'draft',
    is_system: false,
    metadata: {
      ...source.metadata,
      ...(input.metadata || {}),
      copied_from_template_definition_id: source.id,
      copied_from_template_key: source.template_key,
      created_from: 'v2.5.1_template_studio_copy',
      graph_native_candidate: 'forked_template_definition_node',
    },
  });
}

export function getTemplateUsage(db: Database.Database, userId: string, templateId: string): TemplateUsageSummary {
  const template = getTemplateDefinition(db, userId, templateId);
  const rows = db.prepare(`
    SELECT metadata
    FROM note_blocks
    WHERE user_id = ?
  `).all(userId) as Array<{ metadata: string | null }>;

  let runtimeReferenceCount = 0;
  let keyVersionReferenceCount = 0;
  let legacyTemplateIdCount = 0;

  for (const row of rows) {
    const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
    const byDefinitionId = metadata.template_definition_id === template.id;
    const byKeyVersion = metadata.template_key === template.template_key
      && (metadata.template_version === template.version || (!metadata.template_version && template.version === SYSTEM_TEMPLATE_VERSION));
    const byLegacyTemplateId = metadata.template_id === template.template_key;

    if (byDefinitionId) runtimeReferenceCount += 1;
    if (byDefinitionId || byKeyVersion) keyVersionReferenceCount += 1;
    if (byLegacyTemplateId) legacyTemplateIdCount += 1;
  }

  return {
    template_id: template.id,
    template_key: template.template_key,
    template_version: template.version,
    total_blocks: runtimeReferenceCount + (keyVersionReferenceCount - runtimeReferenceCount) + legacyTemplateIdCount,
    runtime_reference_count: runtimeReferenceCount,
    key_version_reference_count: keyVersionReferenceCount,
    legacy_template_id_count: legacyTemplateIdCount,
  };
}

export function updateTemplateDefinition(
  db: Database.Database,
  userId: string,
  id: string,
  input: TemplateDefinitionEditorInput,
): TemplateDefinition {
  const current = getTemplateDefinition(db, userId, id);
  assertEditableTemplate(current);
  const hasStructuralChange = templateHasStructuralChange(input);
  const usage = getTemplateUsage(db, userId, id);

  if (hasStructuralChange && current.status !== 'draft') {
    if (usage.total_blocks > 0) {
      throw new AppError(409, 'proposal_required: Template migration proposal required for structural edits on active templates with usage.');
    }
    throw new AppError(409, 'Structural template edits are allowed only on draft user templates.');
  }

  const nextTemplateKey = input.template_key !== undefined ? assertTemplateKey(input.template_key) : current.template_key;
  const nextVersion = input.version !== undefined ? assertVersion(input.version) : current.version;
  if (nextTemplateKey !== current.template_key || nextVersion !== current.version) {
    ensureTemplateKeyAvailable(db, userId, nextTemplateKey, nextVersion, current.scope_type, current.scope_id, current.id);
  }

  const nextSystemType = input.system_type !== undefined ? assertSystemType(input.system_type) : current.system_type;
  const nextLearningRole = input.learning_role !== undefined ? assertLearningRole(input.learning_role) : current.learning_role;
  const nextLegacyBlockType = input.legacy_block_type !== undefined
    ? assertLegacyBlockType(input.legacy_block_type, nextSystemType, nextLearningRole)
    : current.legacy_block_type;
  const nextFieldSchema = input.field_schema !== undefined ? normalizeFieldSchema(input.field_schema) : current.field_schema;
  const nextDefaultContent = input.default_content !== undefined ? normalizeRecord(input.default_content) : current.default_content;
  const nextRenderHints = input.render_hints !== undefined ? normalizeRecord(input.render_hints) : current.render_hints;
  const nextSourceBehavior = input.source_behavior !== undefined ? normalizeRecord(input.source_behavior) : current.source_behavior;
  const nextRelationBehavior = input.relation_behavior !== undefined ? normalizeRecord(input.relation_behavior) : current.relation_behavior;
  const nextProposalBehavior = input.proposal_behavior !== undefined ? normalizeRecord(input.proposal_behavior) : current.proposal_behavior;
  const nextMetadata = input.metadata !== undefined ? normalizeRecord(input.metadata) : current.metadata;

  db.prepare(`
    UPDATE template_definitions
    SET template_key = ?,
        version = ?,
        label = ?,
        description = ?,
        system_type = ?,
        learning_role = ?,
        legacy_block_type = ?,
        field_schema = ?,
        default_content = ?,
        render_hints = ?,
        source_behavior = ?,
        relation_behavior = ?,
        proposal_behavior = ?,
        summary_for_agent = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    nextTemplateKey,
    nextVersion,
    input.label !== undefined ? assertLabel(input.label) : current.label,
    input.description !== undefined ? input.description : current.description,
    nextSystemType,
    nextLearningRole,
    nextLegacyBlockType,
    stringifyJson(nextFieldSchema),
    stringifyJson(nextDefaultContent),
    stringifyJson(nextRenderHints),
    stringifyJson(nextSourceBehavior),
    stringifyJson(nextRelationBehavior),
    stringifyJson(nextProposalBehavior),
    input.summary_for_agent !== undefined ? input.summary_for_agent : current.summary_for_agent,
    stringifyJson(nextMetadata),
    id,
    userId,
  );

  return getTemplateDefinition(db, userId, id);
}

function setTemplateStatus(
  db: Database.Database,
  userId: string,
  id: string,
  status: TemplateDefinitionStatus,
): TemplateDefinition {
  const template = getTemplateDefinition(db, userId, id);
  assertEditableTemplate(template);
  db.prepare(`
    UPDATE template_definitions
    SET status = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(status, id, userId);
  return getTemplateDefinition(db, userId, id);
}

export function activateTemplateDefinition(db: Database.Database, userId: string, id: string): TemplateDefinition {
  const template = getTemplateDefinition(db, userId, id);
  if (template.status === 'archived') {
    throw new AppError(409, 'Archived templates must be restored before activation.');
  }
  return setTemplateStatus(db, userId, id, 'active');
}

export function deprecateTemplateDefinition(db: Database.Database, userId: string, id: string): TemplateDefinition {
  return setTemplateStatus(db, userId, id, 'deprecated');
}

export function archiveTemplateDefinition(db: Database.Database, userId: string, id: string): TemplateDefinition {
  const usage = getTemplateUsage(db, userId, id);
  if (usage.total_blocks > 0) {
    throw new AppError(409, 'Cannot archive template with existing usage; deprecate it instead.');
  }
  return setTemplateStatus(db, userId, id, 'archived');
}

export function restoreTemplateDefinition(db: Database.Database, userId: string, id: string): TemplateDefinition {
  const template = getTemplateDefinition(db, userId, id);
  assertEditableTemplate(template);
  if (template.status !== 'archived') return template;
  return setTemplateStatus(db, userId, id, 'draft');
}

function findTemplateById(db: Database.Database, userId: string, id: string): TemplateDefinition | null {
  const row = db.prepare('SELECT * FROM template_definitions WHERE id = ? AND user_id = ? AND status != ?')
    .get(id, userId, 'archived');
  return row ? hydrateTemplate(row) : null;
}

function findTemplateByKey(
  db: Database.Database,
  userId: string,
  templateKey: string,
  version: string = SYSTEM_TEMPLATE_VERSION,
): TemplateDefinition | null {
  const row = db.prepare(`
    SELECT *
    FROM template_definitions
    WHERE user_id = ?
      AND template_key = ?
      AND version = ?
      AND scope_type = 'global'
      AND scope_id = ''
      AND status != 'archived'
    ORDER BY is_system DESC, updated_at DESC
    LIMIT 1
  `).get(userId, templateKey, version);
  return row ? hydrateTemplate(row) : null;
}

function explicitTemplateKey(metadata: Record<string, unknown>): string | null {
  if (typeof metadata.template_key === 'string' && metadata.template_key.trim()) return metadata.template_key.trim();
  if (typeof metadata.template_id === 'string' && metadata.template_id.trim()) return metadata.template_id.trim();
  return null;
}

function resolveRuntimeTemplate(
  db: Database.Database,
  userId: string,
  metadata: Record<string, unknown> | null | undefined,
  fallbackBlockType?: string | null,
): {
  template: TemplateDefinition;
  status: TemplateStatus;
  requested_template_key: string | null;
  explicit_template_missing: boolean;
  warnings: string[];
} {
  seedSystemTemplateDefinitions(db, userId);
  const raw = metadata || {};
  const warnings: string[] = [];
  const requestedId = typeof raw.template_definition_id === 'string' ? raw.template_definition_id : null;
  const requestedKey = explicitTemplateKey(raw);
  const requestedVersion = typeof raw.template_version === 'string' ? raw.template_version : SYSTEM_TEMPLATE_VERSION;

  if (requestedId) {
    const byId = findTemplateById(db, userId, requestedId);
    if (byId) {
      return {
        template: byId,
        status: byId.status === 'deprecated' ? 'template_deprecated' : 'runtime_resolved',
        requested_template_key: byId.template_key,
        explicit_template_missing: false,
        warnings: byId.status === 'deprecated' ? [`Template ${byId.template_key} is deprecated.`] : [],
      };
    }
    warnings.push(`Template definition "${requestedId}" was not found.`);
  }

  if (requestedKey) {
    const byKey = findTemplateByKey(db, userId, requestedKey, requestedVersion);
    if (byKey) {
      return {
        template: byKey,
        status: byKey.status === 'deprecated' ? 'template_deprecated' : 'runtime_resolved',
        requested_template_key: requestedKey,
        explicit_template_missing: false,
        warnings: byKey.status === 'deprecated' ? [`Template ${byKey.template_key} is deprecated.`] : warnings,
      };
    }
    warnings.push(`Template "${requestedKey}" v${requestedVersion} was not found.`);
  }

  const inferred = inferNoteBlockTemplateMetadata(fallbackBlockType);
  const inferredTemplate = findTemplateByKey(db, userId, inferred.template_id, SYSTEM_TEMPLATE_VERSION)
    || findTemplateByKey(db, userId, 'text.paragraph', SYSTEM_TEMPLATE_VERSION);
  if (!inferredTemplate) {
    throw new AppError(500, 'System template seed is unavailable');
  }

  return {
    template: inferredTemplate,
    status: requestedKey || requestedId ? 'template_missing' : 'legacy_inferred',
    requested_template_key: requestedKey,
    explicit_template_missing: Boolean(requestedKey || requestedId),
    warnings,
  };
}

export function mergeRuntimeNoteBlockTemplateMetadata(
  db: Database.Database,
  userId: string,
  metadata: Record<string, unknown> | null | undefined,
  fallbackBlockType?: string | null,
  options: { allowUnknownTemplateFallback?: boolean } = {},
): {
  metadata: Record<string, unknown>;
  template: TemplateDefinition;
  resolution_status: TemplateStatus;
  warnings: string[];
} {
  const resolved = resolveRuntimeTemplate(db, userId, metadata, fallbackBlockType);
  if (resolved.explicit_template_missing && !options.allowUnknownTemplateFallback) {
    throw new AppError(400, 'Unknown NoteBlock template', {
      requested_template_key: resolved.requested_template_key,
      warnings: resolved.warnings,
    });
  }

  const resolutionStatus = resolved.explicit_template_missing
    ? 'template_missing'
    : resolved.status;
  const merged = {
    ...(metadata || {}),
    system_type: resolved.template.system_type,
    learning_role: resolved.template.learning_role,
    template_id: resolved.template.template_key,
    template_key: resolved.template.template_key,
    template_definition_id: resolved.template.id,
    template_version: resolved.template.version,
    template_resolution_status: resolutionStatus,
    taxonomy_version: TEMPLATE_RUNTIME_TAXONOMY_VERSION,
  };

  return {
    metadata: merged,
    template: resolved.template,
    resolution_status: resolutionStatus,
    warnings: resolved.warnings,
  };
}

function hasMetadataConflict(metadata: Record<string, unknown>, template: TemplateDefinition): boolean {
  return (typeof metadata.system_type === 'string' && metadata.system_type !== template.system_type)
    || (typeof metadata.learning_role === 'string' && metadata.learning_role !== template.learning_role)
    || (typeof metadata.template_key === 'string' && metadata.template_key !== template.template_key)
    || (typeof metadata.template_version === 'string' && metadata.template_version !== template.version);
}

function emptyTotals(): Record<TemplateStatus | 'total_blocks', number> {
  return {
    total_blocks: 0,
    runtime_resolved: 0,
    legacy_inferred: 0,
    template_missing: 0,
    template_deprecated: 0,
    metadata_conflict: 0,
    unknown_legacy_type: 0,
    manual_review_required: 0,
  };
}

export function getTemplateCompatibilityReport(
  db: Database.Database,
  userId: string,
  filters: { course_id?: string } = {},
): TemplateCompatibilityReport {
  seedSystemTemplateDefinitions(db, userId);
  const params: unknown[] = [userId];
  let where = 'user_id = ?';
  if (filters.course_id) {
    where += ' AND course_id = ?';
    params.push(filters.course_id);
  }

  const rows = db.prepare(`
    SELECT id, course_id, block_type, metadata
    FROM note_blocks
    WHERE ${where}
    ORDER BY created_at ASC
  `).all(...params) as Array<{ id: string; course_id: string; block_type: string; metadata: string }>;

  const totals = emptyTotals();
  const details: TemplateCompatibilityReport['details'] = [];
  const warnings: string[] = [];
  totals.total_blocks = rows.length;

  for (const row of rows) {
    const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
    const resolved = resolveRuntimeTemplate(db, userId, metadata, row.block_type);
    let status = resolved.status;
    const rowWarnings = [...resolved.warnings];

    if (status !== 'template_missing' && hasMetadataConflict(metadata, resolved.template)) {
      status = 'metadata_conflict';
      rowWarnings.push(`Block metadata conflicts with runtime template ${resolved.template.template_key}.`);
    }
    if (status === 'template_missing') {
      totals.manual_review_required += 1;
      rowWarnings.push('Block used an unknown template and was only mapped to a safe fallback.');
    }

    totals[status] += 1;
    warnings.push(...rowWarnings.map((warning) => `${row.id}: ${warning}`));
    details.push({
      block_id: row.id,
      course_id: row.course_id,
      block_type: row.block_type,
      status,
      template_key: resolved.template.template_key,
      template_definition_id: resolved.template.id,
      warnings: rowWarnings,
    });
  }

  return {
    user_id: userId,
    course_id: filters.course_id || null,
    totals,
    warnings,
    details,
  };
}

export function legacyBlockTypeForRuntimeTemplate(template: TemplateDefinition): ReturnType<typeof legacyBlockTypeForTemplate> {
  return getNoteBlockTemplate(template.template_key)?.legacy_block_type || template.legacy_block_type || 'paragraph';
}
