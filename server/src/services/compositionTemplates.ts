import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  getTemplateDefinition,
  legacyBlockTypeForRuntimeTemplate,
  listTemplateDefinitions,
  mergeRuntimeNoteBlockTemplateMetadata,
  seedSystemTemplateDefinitions,
  type TemplateDefinition,
} from './templateDefinitions.js';
import {
  createCanvasNode,
  getLearningCanvas,
} from './learningCanvases.js';

const COMPOSITION_VERSION = '1.0.0';

type CompositionStatus = 'active' | 'deprecated' | 'archived';
type SlotStatus = 'filled' | 'skipped';

interface CompositionSlotDefinition {
  slot_key: string;
  label: string;
  description?: string;
  template_keys: string[];
  default_template_key: string;
  required?: boolean;
  repeatable?: boolean;
}

interface RelationBlueprint {
  source_slot: string;
  target_slot: string;
  relation_type: string;
  layer_key?: string;
  label?: string;
}

interface CompositionTemplateSeed {
  composition_key: string;
  label: string;
  description: string;
  composition_kind: string;
  slot_schema: CompositionSlotDefinition[];
  layout_behavior: Record<string, unknown>;
  source_behavior: Record<string, unknown>;
  relation_blueprint: RelationBlueprint[];
  proposal_behavior: Record<string, unknown>;
  summary_for_agent: string;
  metadata?: Record<string, unknown>;
}

export interface CompositionTemplate {
  id: string;
  user_id: string;
  composition_key: string;
  version: string;
  origin: 'system_seed' | 'user' | 'package' | 'migration';
  scope_type: 'global' | 'course' | 'package';
  scope_id: string;
  label: string;
  description: string | null;
  composition_kind: string;
  slot_schema: CompositionSlotDefinition[];
  layout_behavior: Record<string, unknown>;
  source_behavior: Record<string, unknown>;
  relation_blueprint: RelationBlueprint[];
  proposal_behavior: Record<string, unknown>;
  summary_for_agent: string;
  status: CompositionStatus;
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SlotInput {
  slot_key: string;
  template_definition_id?: string;
  template_key?: string;
  title?: string;
  plain_text?: string;
  content_json?: Record<string, unknown>;
  source_references?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

interface CreateCompositionProposalInput {
  course_id: string;
  canvas_id: string;
  composition_template_id?: string;
  composition_key?: string;
  source_scope_ids?: string[];
  source_board_id?: string;
  slot_inputs?: SlotInput[];
  partial_slot_keys?: string[];
  layout_goal?: 'a4_section' | 'canvas_cluster';
}

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
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

function ensureCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function hydrateCompositionTemplate(row: any): CompositionTemplate {
  return {
    ...row,
    slot_schema: parseJson(row.slot_schema, []),
    layout_behavior: parseJson(row.layout_behavior, {}),
    source_behavior: parseJson(row.source_behavior, {}),
    relation_blueprint: parseJson(row.relation_blueprint, []),
    proposal_behavior: parseJson(row.proposal_behavior, {}),
    is_system: Boolean(row.is_system),
    metadata: parseJson(row.metadata, {}),
  };
}

function unique(values: string[] = []): string[] {
  return [...new Set(values.filter(Boolean))];
}

function systemCompositionSeeds(): CompositionTemplateSeed[] {
  return [
    {
      composition_key: 'formula_sheet.basic',
      label: 'Formula Sheet',
      description: 'A compact reference section for formulas, short notes, and examples.',
      composition_kind: 'section',
      slot_schema: [
        { slot_key: 'heading', label: 'Heading', template_keys: ['text.heading'], default_template_key: 'text.heading', required: false },
        { slot_key: 'formula', label: 'Formula', template_keys: ['formula.math'], default_template_key: 'formula.math', required: true, repeatable: true },
        { slot_key: 'note', label: 'Note', template_keys: ['text.paragraph', 'concept.basic'], default_template_key: 'text.paragraph', required: false, repeatable: true },
        { slot_key: 'example', label: 'Example', template_keys: ['example.general'], default_template_key: 'example.general', required: false, repeatable: true },
      ],
      layout_behavior: { frame: true, orientation: 'compact_vertical', default_width: 620 },
      source_behavior: { source_reference_policy: 'allowed' },
      relation_blueprint: [
        { source_slot: 'formula', target_slot: 'example', relation_type: 'example_of', layer_key: 'learning_logic' },
      ],
      proposal_behavior: { proposal_first_apply: true, creates_new_content_only: true },
      summary_for_agent: 'Use Formula Sheet when multiple formulas should be presented as a compact reusable reference section.',
    },
    {
      composition_key: 'theorem_proof_example.basic',
      label: 'Theorem / Proof / Example',
      description: 'A learning section that states a theorem, explains the proof, and gives an example.',
      composition_kind: 'section',
      slot_schema: [
        { slot_key: 'theorem', label: 'Theorem', template_keys: ['theorem.basic'], default_template_key: 'theorem.basic', required: true },
        { slot_key: 'proof', label: 'Proof', template_keys: ['proof.basic'], default_template_key: 'proof.basic', required: true },
        { slot_key: 'example', label: 'Example', template_keys: ['example.general'], default_template_key: 'example.general', required: true },
      ],
      layout_behavior: { frame: true, orientation: 'vertical_reading', default_width: 640 },
      source_behavior: { source_reference_policy: 'recommended' },
      relation_blueprint: [
        { source_slot: 'theorem', target_slot: 'proof', relation_type: 'supports', layer_key: 'learning_logic', label: 'Proof supports theorem' },
        { source_slot: 'theorem', target_slot: 'example', relation_type: 'example_of', layer_key: 'learning_logic', label: 'Example illustrates theorem' },
      ],
      proposal_behavior: { proposal_first_apply: true, creates_new_content_only: true },
      summary_for_agent: 'Use Theorem / Proof / Example for math or engineering concepts where a statement needs support and concrete illustration.',
    },
    {
      composition_key: 'source_quote_interpretation.basic',
      label: 'Source Quote + Interpretation',
      description: 'A grounded source quote followed by a plain-language interpretation.',
      composition_kind: 'section',
      slot_schema: [
        { slot_key: 'source_quote', label: 'Source Quote', template_keys: ['source.quote'], default_template_key: 'source.quote', required: true },
        { slot_key: 'interpretation', label: 'Interpretation', template_keys: ['text.paragraph', 'concept.basic'], default_template_key: 'text.paragraph', required: true },
      ],
      layout_behavior: { frame: true, orientation: 'quote_then_note', default_width: 640 },
      source_behavior: { source_reference_policy: 'required' },
      relation_blueprint: [
        { source_slot: 'source_quote', target_slot: 'interpretation', relation_type: 'source_supports', layer_key: 'source_evidence' },
      ],
      proposal_behavior: { proposal_first_apply: true, creates_new_content_only: true },
      summary_for_agent: 'Use Source Quote + Interpretation when user trust depends on visibly separating source text from interpretation.',
    },
    {
      composition_key: 'evidence_comparison.basic',
      label: 'Evidence Comparison',
      description: 'A source-grounded comparison section for two or more pieces of evidence.',
      composition_kind: 'section',
      slot_schema: [
        { slot_key: 'claim', label: 'Claim', template_keys: ['concept.basic', 'text.paragraph'], default_template_key: 'concept.basic', required: true },
        { slot_key: 'evidence', label: 'Evidence', template_keys: ['source.quote', 'example.general'], default_template_key: 'source.quote', required: true, repeatable: true },
        { slot_key: 'warning', label: 'Warning', template_keys: ['warning.callout'], default_template_key: 'warning.callout', required: false },
      ],
      layout_behavior: { frame: true, orientation: 'comparison_grid', default_width: 700 },
      source_behavior: { source_reference_policy: 'recommended' },
      relation_blueprint: [
        { source_slot: 'evidence', target_slot: 'claim', relation_type: 'supports', layer_key: 'source_evidence' },
      ],
      proposal_behavior: { proposal_first_apply: true, creates_new_content_only: true },
      summary_for_agent: 'Use Evidence Comparison when source ranges support, overlap, or challenge the same claim.',
    },
    {
      composition_key: 'briefing_section.basic',
      label: 'Briefing Section',
      description: 'A short information-processing section with summary, key points, and follow-up actions.',
      composition_kind: 'section',
      slot_schema: [
        { slot_key: 'summary', label: 'Summary', template_keys: ['text.paragraph', 'concept.basic'], default_template_key: 'text.paragraph', required: true },
        { slot_key: 'key_point', label: 'Key Point', template_keys: ['text.paragraph', 'warning.callout'], default_template_key: 'text.paragraph', required: false, repeatable: true },
        { slot_key: 'task', label: 'Task', template_keys: ['exercise.general'], default_template_key: 'exercise.general', required: false, repeatable: true },
      ],
      layout_behavior: { frame: true, orientation: 'briefing_stack', default_width: 640 },
      source_behavior: { source_reference_policy: 'allowed' },
      relation_blueprint: [
        { source_slot: 'summary', target_slot: 'key_point', relation_type: 'read_before', layer_key: 'learning_logic' },
      ],
      proposal_behavior: { proposal_first_apply: true, creates_new_content_only: true },
      summary_for_agent: 'Use Briefing Section for concise reports, quick summaries, and action-oriented information work.',
    },
    {
      composition_key: 'side_note_cluster.basic',
      label: 'Side Note Cluster',
      description: 'A small cluster of callouts or side notes attached to surrounding content.',
      composition_kind: 'section',
      slot_schema: [
        { slot_key: 'anchor_note', label: 'Anchor Note', template_keys: ['text.paragraph', 'concept.basic'], default_template_key: 'text.paragraph', required: false },
        { slot_key: 'side_note', label: 'Side Note', template_keys: ['warning.callout', 'text.paragraph'], default_template_key: 'warning.callout', required: true, repeatable: true },
      ],
      layout_behavior: { frame: true, orientation: 'side_cluster', default_width: 520 },
      source_behavior: { source_reference_policy: 'allowed' },
      relation_blueprint: [
        { source_slot: 'side_note', target_slot: 'anchor_note', relation_type: 'supports', layer_key: 'visual' },
      ],
      proposal_behavior: { proposal_first_apply: true, creates_new_content_only: true },
      summary_for_agent: 'Use Side Note Cluster for contextual notes that should stay grouped but not dominate the main reading flow.',
    },
  ];
}

export function seedSystemCompositionTemplates(db: Database.Database, userId: string): CompositionTemplate[] {
  seedSystemTemplateDefinitions(db, userId);
  const insert = db.prepare(`
    INSERT INTO composition_templates (
      id, user_id, composition_key, version, origin, scope_type, scope_id, label,
      description, composition_kind, slot_schema, layout_behavior, source_behavior,
      relation_blueprint, proposal_behavior, summary_for_agent, status, is_system,
      metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'system_seed', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, composition_key, version, scope_type, scope_id) DO UPDATE SET
      label = excluded.label,
      description = excluded.description,
      composition_kind = excluded.composition_kind,
      slot_schema = excluded.slot_schema,
      layout_behavior = excluded.layout_behavior,
      source_behavior = excluded.source_behavior,
      relation_blueprint = excluded.relation_blueprint,
      proposal_behavior = excluded.proposal_behavior,
      summary_for_agent = excluded.summary_for_agent,
      status = 'active',
      is_system = 1,
      metadata = excluded.metadata,
      updated_at = datetime('now')
  `);
  const run = db.transaction(() => {
    for (const seed of systemCompositionSeeds()) {
      insert.run(
        uuidv4(),
        userId,
        seed.composition_key,
        COMPOSITION_VERSION,
        seed.label,
        seed.description,
        seed.composition_kind,
        stringifyJson(seed.slot_schema),
        stringifyJson(seed.layout_behavior),
        stringifyJson(seed.source_behavior),
        stringifyJson(seed.relation_blueprint),
        stringifyJson(seed.proposal_behavior),
        seed.summary_for_agent,
        stringifyJson({
          ...(seed.metadata || {}),
          seeded_from: 'v2.5.2_system_composition_seed',
          graph_native_candidate: 'composition_template_node',
        }),
      );
    }
  });
  run();
  return listCompositionTemplates(db, userId, { status: 'active' });
}

export function listCompositionTemplates(
  db: Database.Database,
  userId: string,
  filters: { status?: string; composition_key?: string } = {},
): CompositionTemplate[] {
  const params: unknown[] = [userId];
  const where = ['user_id = ?'];
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.composition_key) {
    where.push('composition_key = ?');
    params.push(filters.composition_key);
  }
  return db.prepare(`
    SELECT *
    FROM composition_templates
    WHERE ${where.join(' AND ')}
    ORDER BY is_system DESC, composition_key ASC, version ASC
  `).all(...params).map(hydrateCompositionTemplate);
}

export function getCompositionTemplate(db: Database.Database, userId: string, id: string): CompositionTemplate {
  seedSystemCompositionTemplates(db, userId);
  const row = db.prepare('SELECT * FROM composition_templates WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!row) throw new AppError(404, 'Composition template not found');
  return hydrateCompositionTemplate(row);
}

function resolveCompositionTemplate(db: Database.Database, userId: string, input: CreateCompositionProposalInput): CompositionTemplate {
  if (input.composition_template_id) {
    const template = getCompositionTemplate(db, userId, input.composition_template_id);
    if (template.status !== 'active') throw new AppError(400, 'Composition template is not active');
    return template;
  }
  if (input.composition_key) {
    const template = listCompositionTemplates(db, userId, {
      status: 'active',
      composition_key: input.composition_key,
    })[0];
    if (!template) throw new AppError(404, 'Composition template not found');
    return template;
  }
  throw new AppError(400, 'composition_template_id or composition_key is required');
}

function resolveTemplateByKey(db: Database.Database, userId: string, templateKey: string): TemplateDefinition {
  const template = listTemplateDefinitions(db, userId, {
    status: 'active',
    template_key: templateKey,
  })[0];
  if (!template) throw new AppError(400, `TemplateDefinition ${templateKey} is not available`);
  return template;
}

function resolveSlotTemplate(db: Database.Database, userId: string, slot: CompositionSlotDefinition, input?: SlotInput): TemplateDefinition {
  let template: TemplateDefinition;
  if (input?.template_definition_id) {
    template = getTemplateDefinition(db, userId, input.template_definition_id);
  } else {
    template = resolveTemplateByKey(db, userId, input?.template_key || slot.default_template_key);
  }
  if (!slot.template_keys.includes(template.template_key)) {
    throw new AppError(400, `Template ${template.template_key} is not allowed for slot ${slot.slot_key}`);
  }
  return template;
}

function defaultPlainText(slot: CompositionSlotDefinition): string {
  return `${slot.label} content`;
}

function textFromContent(content: Record<string, unknown>): string {
  const body = content.body;
  if (typeof body === 'string' && body.trim()) return body;
  return Object.values(content).find((value) => typeof value === 'string' && value.trim()) as string || '';
}

function layoutForSlots(canvas: any, slotPlans: any[], template: CompositionTemplate) {
  const filledSlots = slotPlans.filter((slot) => slot.status === 'filled');
  const marginX = 72;
  const marginY = 92;
  const gapY = 28;
  const width = Number(template.layout_behavior.default_width || 620);
  const nodeWidth = Math.min(width, Math.max(360, (canvas.width || 794) - marginX * 2));
  let y = marginY;
  const nodeLayouts = filledSlots.map((slot, index) => {
    const height = slot.template_key === 'formula.math' ? 140 : 170;
    const layout = {
      slot_key: slot.slot_key,
      slot_index: slot.slot_index,
      x: marginX,
      y,
      width: nodeWidth,
      height,
      z_index: index + 1,
    };
    y += height + gapY;
    return layout;
  });
  const frame = {
    temp_id: 'composition-frame-1',
    title: template.label,
    x: marginX - 24,
    y: marginY - 48,
    width: nodeWidth + 48,
    height: Math.max(220, y - marginY + 48),
    metadata: {
      created_from: 'composition_template_proposal',
      composition_key: template.composition_key,
    },
  };
  return {
    frame,
    node_layouts: nodeLayouts,
    proposed_canvas: {
      width: canvas.width || 794,
      height: Math.max(canvas.height || 1123, y + marginY),
    },
  };
}

function planSlots(
  db: Database.Database,
  userId: string,
  composition: CompositionTemplate,
  slotInputs: SlotInput[] = [],
  partialSlotKeys: string[] = [],
) {
  const inputMap = new Map<string, SlotInput[]>();
  for (const input of slotInputs) {
    const key = String(input.slot_key || '').trim();
    if (!key) throw new AppError(400, 'Each slot input must include slot_key');
    inputMap.set(key, [...(inputMap.get(key) || []), input]);
  }
  const partialSet = new Set(partialSlotKeys);
  const slotPlans: any[] = [];
  const warnings: string[] = [];
  let slotIndex = 0;

  for (const slot of composition.slot_schema) {
    if (partialSet.has(slot.slot_key)) {
      warnings.push(`Slot ${slot.slot_key} is intentionally skipped for partial composition use.`);
      slotPlans.push({
        slot_key: slot.slot_key,
        slot_index: slotIndex++,
        label: slot.label,
        status: 'skipped',
        warnings: [`Slot ${slot.slot_key} skipped by partial_slot_keys.`],
      });
      continue;
    }

    const inputs = inputMap.get(slot.slot_key) || [];
    if (inputs.length === 0 && !slot.required) {
      slotPlans.push({
        slot_key: slot.slot_key,
        slot_index: slotIndex++,
        label: slot.label,
        status: 'skipped',
        warnings: [`Optional slot ${slot.slot_key} was not filled.`],
      });
      continue;
    }

    const usableInputs = inputs.length > 0 ? inputs : [{} as SlotInput];
    if (!slot.repeatable && usableInputs.length > 1) {
      throw new AppError(400, `Slot ${slot.slot_key} is not repeatable`);
    }

    for (const input of usableInputs) {
      const template = resolveSlotTemplate(db, userId, slot, input);
      const contentJson = input.content_json || template.default_content || { body: defaultPlainText(slot) };
      const bodyText = input.plain_text || textFromContent(contentJson) || defaultPlainText(slot);
      const blockType = legacyBlockTypeForRuntimeTemplate(template);
      const metadata = mergeRuntimeNoteBlockTemplateMetadata(
        db,
        userId,
        {
          ...(input.metadata || {}),
          template_definition_id: template.id,
          template_key: template.template_key,
          template_version: template.version,
          template_id: template.template_key,
          composition_template_id: composition.id,
          composition_key: composition.composition_key,
          composition_slot_key: slot.slot_key,
        },
        blockType,
      ).metadata;

      slotPlans.push({
        slot_key: slot.slot_key,
        slot_index: slotIndex++,
        label: slot.label,
        status: 'filled',
        template_definition_id: template.id,
        template_key: template.template_key,
        template_version: template.version,
        block_type: blockType,
        title: input.title || slot.label,
        plain_text: bodyText,
        content_json: contentJson,
        metadata,
        source_references: input.source_references || [],
        warnings: inputs.length === 0 ? [`Slot ${slot.slot_key} used default placeholder content.`] : [],
      });
      if (inputs.length === 0) {
        warnings.push(`Required slot ${slot.slot_key} used default placeholder content.`);
      }
    }
  }

  for (const key of inputMap.keys()) {
    if (!composition.slot_schema.some((slot) => slot.slot_key === key)) {
      throw new AppError(400, `Unknown composition slot ${key}`);
    }
  }

  return { slotPlans, warnings };
}

function relationSuggestions(composition: CompositionTemplate, slotPlans: any[]) {
  const filledKeys = new Set(slotPlans.filter((slot) => slot.status === 'filled').map((slot) => slot.slot_key));
  return composition.relation_blueprint
    .filter((relation) => filledKeys.has(relation.source_slot) && filledKeys.has(relation.target_slot))
    .map((relation, index) => ({
      temp_id: `relation-blueprint-${index + 1}`,
      ...relation,
      status: 'suggested_only',
      graph_truth: false,
    }));
}

export function getCompositionTemplateCompatibilityReport(db: Database.Database, userId: string) {
  seedSystemCompositionTemplates(db, userId);
  const runtimeKeys = new Set(listTemplateDefinitions(db, userId, { status: 'active' }).map((template) => template.template_key));
  const templates = listCompositionTemplates(db, userId, {});
  const invalidReferences: Array<{ composition_key: string; slot_key: string; template_key: string }> = [];
  for (const composition of templates) {
    for (const slot of composition.slot_schema) {
      for (const templateKey of slot.template_keys || []) {
        if (!runtimeKeys.has(templateKey)) {
          invalidReferences.push({
            composition_key: composition.composition_key,
            slot_key: slot.slot_key,
            template_key: templateKey,
          });
        }
      }
      if (!runtimeKeys.has(slot.default_template_key)) {
        invalidReferences.push({
          composition_key: composition.composition_key,
          slot_key: slot.slot_key,
          template_key: slot.default_template_key,
        });
      }
    }
  }
  return {
    user_id: userId,
    templates_checked: templates.length,
    invalid_slot_reference_count: invalidReferences.length,
    invalid_slot_references: invalidReferences,
    warnings: invalidReferences.map((item) => `${item.composition_key}.${item.slot_key} references missing ${item.template_key}`),
  };
}

export function createCompositionTemplateProposal(
  db: Database.Database,
  userId: string,
  input: CreateCompositionProposalInput,
) {
  ensureCourse(db, userId, input.course_id);
  seedSystemCompositionTemplates(db, userId);
  const canvas = getLearningCanvas(db, userId, input.canvas_id) as any;
  if (canvas.course_id !== input.course_id) throw new AppError(400, 'Canvas belongs to a different course');
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');
  const composition = resolveCompositionTemplate(db, userId, input);
  const { slotPlans, warnings } = planSlots(db, userId, composition, input.slot_inputs || [], input.partial_slot_keys || []);
  const layoutPlan = layoutForSlots(canvas, slotPlans, composition);
  const relationBlueprintSuggestions = relationSuggestions(composition, slotPlans);
  const proposalId = uuidv4();
  const now = new Date().toISOString();
  const data = {
    version: 'v2.5.2',
    proposal_kind: 'composition_template',
    course_id: input.course_id,
    canvas_id: canvas.id,
    composition_template_id: composition.id,
    composition_key: composition.composition_key,
    composition_version: composition.version,
    composition_label: composition.label,
    source_scope_ids: unique(input.source_scope_ids || []),
    source_board_id: input.source_board_id || null,
    partial_slot_keys: unique(input.partial_slot_keys || []),
    layout_goal: input.layout_goal || 'a4_section',
    title: `${composition.label} proposal`,
    description: 'Review this composition section before applying. Apply creates new content and projection records only.',
    slot_plan: slotPlans,
    layout_plan: layoutPlan,
    relation_blueprint_suggestions: relationBlueprintSuggestions,
    warnings,
    confidence: 0.74,
    generation_mode: 'deterministic',
    apply_behavior: 'create_new_content_and_projection_records_only',
  };

  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'composition_template', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  return {
    id: proposalId,
    user_id: userId,
    type: 'composition_template',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

function noteTitleForCanvas(canvas: any): string {
  return `${String(canvas.title || 'Canvas Document').trim() || 'Canvas Document'} Blocks`;
}

function findCanvasBackingNote(db: Database.Database, userId: string, courseId: string, canvasId: string) {
  const rows = db.prepare(`
    SELECT *
    FROM notes
    WHERE user_id = ? AND course_id = ? AND status = 'active' AND page_format = 'canvas_backing'
    ORDER BY created_at ASC
  `).all(userId, courseId) as any[];
  return rows.find((row) => {
    const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
    return metadata.purpose === 'canvas_backing_note' && metadata.canvas_id === canvasId;
  });
}

function getOrCreateCanvasBackingNote(
  db: Database.Database,
  userId: string,
  canvas: any,
  operationBatchId: string,
) {
  const existing = findCanvasBackingNote(db, userId, canvas.course_id, canvas.id);
  if (existing) return existing;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO notes (
      id, user_id, course_id, title, description, source_kind, page_format,
      metadata, operation_batch_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'proposal', 'canvas_backing', ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    canvas.course_id,
    noteTitleForCanvas(canvas),
    'Canvas-owned backing note for NoteBlocks created by CompositionTemplate proposals.',
    JSON.stringify({
      purpose: 'canvas_backing_note',
      canvas_id: canvas.id,
      canvas_title: canvas.title,
      created_from: 'composition_template_proposal',
    }),
    operationBatchId,
  );
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
}

function nextPlacementOrder(db: Database.Database, noteId: string): number {
  return (db.prepare(`
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
    FROM note_block_placements
    WHERE note_id = ?
  `).get(noteId) as { next_order: number }).next_order;
}

export function applyCompositionTemplateProposal(db: Database.Database, userId: string, proposal: ProposalRow) {
  if (proposal.type !== 'composition_template') {
    throw new AppError(400, 'Proposal is not a composition template proposal');
  }
  const data = parseJson<any>(proposal.data, {});
  if (!data || data.proposal_kind !== 'composition_template' || !data.course_id || !data.canvas_id || !Array.isArray(data.slot_plan)) {
    throw new AppError(400, 'Composition template proposal is malformed');
  }

  const canvas = getLearningCanvas(db, userId, data.canvas_id) as any;
  if (canvas.course_id !== data.course_id) throw new AppError(400, 'Composition proposal course mismatch');
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');

  const now = new Date().toISOString();
  const operationBatchId = uuidv4();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply composition template proposal', 'applied', ?, ?)
  `).run(
    operationBatchId,
    userId,
    data.course_id,
    proposal.id,
    JSON.stringify({
      proposal_type: 'composition_template',
      apply_behavior: 'create_new_content_and_projection_records_only',
    }),
    now,
  );

  const note = getOrCreateCanvasBackingNote(db, userId, canvas, operationBatchId);
  const frame = data.layout_plan?.frame || {
    title: data.composition_label || 'Composition Section',
    x: 48,
    y: 48,
    width: 640,
    height: 480,
  };
  const canvasFrameId = uuidv4();
  db.prepare(`
    INSERT INTO canvas_frames (
      id, user_id, course_id, canvas_id, title, status, x, y, width, height, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    canvasFrameId,
    userId,
    data.course_id,
    data.canvas_id,
    String(frame.title || data.composition_label || 'Composition Section'),
    Number(frame.x || 0),
    Number(frame.y || 0),
    Number(frame.width || 640),
    Number(frame.height || 480),
    JSON.stringify({
      ...(frame.metadata || {}),
      created_from: 'composition_template_proposal',
      composition_template_proposal: proposal.id,
      composition_key: data.composition_key,
    }),
  );

  const compositionInstanceId = uuidv4();
  db.prepare(`
    INSERT INTO composition_instances (
      id, user_id, course_id, canvas_id, note_id, composition_template_id,
      composition_key, composition_version, title, status, source_proposal_id,
      operation_batch_id, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    compositionInstanceId,
    userId,
    data.course_id,
    data.canvas_id,
    note.id,
    data.composition_template_id || null,
    data.composition_key,
    data.composition_version || COMPOSITION_VERSION,
    data.composition_label || data.title || 'Composition Section',
    proposal.id,
    operationBatchId,
    JSON.stringify({
      created_from: 'composition_template_proposal',
      relation_blueprint_suggestions: data.relation_blueprint_suggestions || [],
      graph_native_candidate: 'composition_instance_node',
    }),
  );

  const layoutBySlot = new Map<string, any>();
  for (const layout of data.layout_plan?.node_layouts || []) {
    layoutBySlot.set(`${layout.slot_key}:${layout.slot_index}`, layout);
  }

  const insertBlock = db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, title, content_json, plain_text,
      source_kind, metadata, operation_batch_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'proposal', ?, ?, ?, ?)
  `);
  const insertPlacement = db.prepare(`
    INSERT INTO note_block_placements (id, note_id, block_id, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertSource = db.prepare(`
    INSERT INTO note_block_sources (
      id, block_id, document_id, document_chunk_id, source_page_start,
      source_page_end, source_excerpt, reference_type, confidence, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSlot = db.prepare(`
    INSERT INTO composition_instance_slots (
      id, user_id, course_id, composition_instance_id, slot_key, slot_index,
      status, note_block_id, canvas_node_id, canvas_frame_id, title, warnings,
      metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  let blocksCreated = 0;
  let canvasNodesCreated = 0;
  for (const slot of data.slot_plan) {
    if (slot.status !== 'filled') {
      insertSlot.run(
        uuidv4(),
        userId,
        data.course_id,
        compositionInstanceId,
        slot.slot_key,
        slot.slot_index,
        'skipped',
        null,
        null,
        canvasFrameId,
        slot.label || null,
        JSON.stringify(slot.warnings || []),
        JSON.stringify({ created_from: 'composition_template_proposal' }),
      );
      continue;
    }

    const blockId = uuidv4();
    const layout = layoutBySlot.get(`${slot.slot_key}:${slot.slot_index}`) || {};
    const blockMetadata = {
      ...(slot.metadata || {}),
      proposal_id: proposal.id,
      composition_template_id: data.composition_template_id,
      composition_key: data.composition_key,
      composition_instance_id: compositionInstanceId,
      composition_slot_key: slot.slot_key,
      composition_slot_index: slot.slot_index,
    };
    insertBlock.run(
      blockId,
      userId,
      data.course_id,
      slot.block_type || 'paragraph',
      slot.title || null,
      JSON.stringify(slot.content_json || {}),
      slot.plain_text || null,
      JSON.stringify(blockMetadata),
      operationBatchId,
      now,
      now,
    );
    insertPlacement.run(uuidv4(), note.id, blockId, nextPlacementOrder(db, note.id), now, now);
    for (const ref of Array.isArray(slot.source_references) ? slot.source_references : []) {
      insertSource.run(
        uuidv4(),
        blockId,
        ref.document_id || null,
        ref.document_chunk_id || null,
        ref.source_page_start ?? null,
        ref.source_page_end ?? null,
        ref.source_excerpt || null,
        ref.reference_type || 'page',
        ref.confidence ?? null,
        JSON.stringify(ref.metadata || {}),
      );
    }

    const node = createCanvasNode(db, userId, data.canvas_id, {
      node_type: 'note_block',
      note_block_id: blockId,
      title: slot.title || slot.label || slot.template_key || 'Composition block',
      summary: slot.plain_text || null,
      x: Number(layout.x || 0),
      y: Number(layout.y || 0),
      width: Number(layout.width || 300),
      height: Number(layout.height || 170),
      z_index: Number(layout.z_index || blocksCreated + 1),
      metadata: {
        created_from: 'composition_template_proposal',
        composition_instance_id: compositionInstanceId,
        composition_template_id: data.composition_template_id,
        composition_slot_key: slot.slot_key,
        canvas_frame_id: canvasFrameId,
      },
    }) as any;
    blocksCreated += 1;
    canvasNodesCreated += 1;
    insertSlot.run(
      uuidv4(),
      userId,
      data.course_id,
      compositionInstanceId,
      slot.slot_key,
      slot.slot_index,
      'filled',
      blockId,
      node.id,
      canvasFrameId,
      slot.title || slot.label || null,
      JSON.stringify(slot.warnings || []),
      JSON.stringify({
        template_key: slot.template_key,
        template_definition_id: slot.template_definition_id,
        graph_native_candidate: 'composition_slot_usage_edge_or_property',
      }),
    );
  }

  db.prepare('UPDATE notes SET updated_at = datetime(\'now\') WHERE id = ?').run(note.id);
  db.prepare('UPDATE learning_canvases SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(data.canvas_id, userId);

  return {
    message: 'Composition template proposal applied successfully',
    operation_batch_id: operationBatchId,
    note_id: note.id,
    canvas_frame_id: canvasFrameId,
    composition_instance_id: compositionInstanceId,
    blocks_created_count: blocksCreated,
    canvas_nodes_created_count: canvasNodesCreated,
  };
}
