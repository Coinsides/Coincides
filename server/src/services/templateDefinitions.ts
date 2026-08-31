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
  | 'template_deprecated';

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

function sourceBehaviorForTemplate(template: NoteBlockTemplateDefinition): Record<string, unknown> {
  const policy = template.system_type === 'source_quote'
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
    definition: ['depends_on', 'equivalent_to'],
    formula: ['derives_to', 'depends_on'],
    example: ['supports', 'analogous_to'],
    exercise: ['depends_on'],
    answer: ['supports'],
    source: ['supports'],
    proof: ['supports', 'derives_to'],
    theorem: ['depends_on', 'supports'],
    concept: ['analogous_to', 'equivalent_to'],
    warning: ['contradicts', 'depends_on'],
    note: ['supports', 'analogous_to'],
  };
  return {
    can_be_relation_source: false,
    can_be_relation_target: false,
    relation_endpoint_requires_item: true,
    suggested_item_relation_types: roleRelations[template.learning_role] || ['supports'],
    relation_truth_owner: 'items/relations',
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

export function legacyBlockTypeForRuntimeTemplate(template: TemplateDefinition): ReturnType<typeof legacyBlockTypeForTemplate> {
  return getNoteBlockTemplate(template.template_key)?.legacy_block_type || template.legacy_block_type || 'paragraph';
}
