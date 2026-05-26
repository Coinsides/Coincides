import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  listTemplateDefinitions,
  seedSystemTemplateDefinitions,
  type TemplateDefinition,
} from './templateDefinitions.js';
import {
  listCompositionTemplates,
  seedSystemCompositionTemplates,
  type CompositionTemplate,
} from './compositionTemplates.js';

const DOMAIN_PACKAGE_VERSION = '0.1.0';
const PACKAGE_MANIFEST_VERSION = 'v2.5.3';

type ValidationStatus = 'valid' | 'warning' | 'blocked';
type RuntimeStatus = 'draft' | 'active' | 'deprecated' | 'archived';

interface DomainTemplateSeed {
  template_key: string;
  member_role: string;
  required?: boolean;
}

interface DomainCompositionSeed {
  composition_key: string;
  member_role: string;
  required?: boolean;
}

interface DomainSeed {
  domain_key: string;
  label: string;
  description: string;
  domain_kind: string;
  aliases: string[];
  facets: Record<string, unknown>;
  templates: DomainTemplateSeed[];
  compositions: DomainCompositionSeed[];
  source_behavior: Record<string, unknown>;
  relation_behavior: Record<string, unknown>;
  proposal_behavior: Record<string, unknown>;
  summary_for_agent: string;
}

export interface PackageManifest {
  id: string;
  user_id: string;
  package_key: string;
  version: string;
  manifest_version: string;
  package_kind: string;
  origin: 'system_seed' | 'user' | 'imported' | 'migration';
  scope_type: 'global' | 'course';
  scope_id: string;
  package_name: string;
  description: string | null;
  author: Record<string, unknown>;
  compatibility: Record<string, unknown>;
  contents: Record<string, unknown>;
  trust: Record<string, unknown>;
  license: Record<string, unknown>;
  import_policy: Record<string, unknown>;
  export_policy: Record<string, unknown>;
  graph_migration_hints: Record<string, unknown>;
  validation_status: ValidationStatus;
  status: RuntimeStatus;
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DomainBlockSet {
  id: string;
  user_id: string;
  package_manifest_id: string | null;
  domain_key: string;
  version: string;
  origin: 'system_seed' | 'user' | 'package' | 'migration';
  scope_type: 'global' | 'course' | 'package';
  scope_id: string;
  label: string;
  description: string | null;
  domain_kind: string;
  aliases: string[];
  facets: Record<string, unknown>;
  source_behavior: Record<string, unknown>;
  relation_behavior: Record<string, unknown>;
  proposal_behavior: Record<string, unknown>;
  summary_for_agent: string;
  status: RuntimeStatus;
  is_system: boolean;
  metadata: Record<string, unknown>;
  template_count: number;
  composition_count: number;
  created_at: string;
  updated_at: string;
}

export interface PackagePreview {
  manifest: PackageManifest | Record<string, unknown>;
  domain_sets: DomainBlockSet[];
  template_count: number;
  composition_count: number;
  warnings: string[];
  blockers: string[];
  validation_status: ValidationStatus;
}

export interface DomainCompatibilityReport {
  domain_block_set: DomainBlockSet;
  template_count: number;
  composition_count: number;
  warnings: string[];
  blockers: string[];
  validation_status: ValidationStatus;
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

function hydratePackageManifest(row: any): PackageManifest {
  return {
    ...row,
    author: parseJson(row.author, {}),
    compatibility: parseJson(row.compatibility, {}),
    contents: parseJson(row.contents, {}),
    trust: parseJson(row.trust, {}),
    license: parseJson(row.license, {}),
    import_policy: parseJson(row.import_policy, {}),
    export_policy: parseJson(row.export_policy, {}),
    graph_migration_hints: parseJson(row.graph_migration_hints, {}),
    is_system: Boolean(row.is_system),
    metadata: parseJson(row.metadata, {}),
  };
}

function hydrateDomainBlockSet(row: any): DomainBlockSet {
  return {
    ...row,
    aliases: parseJson(row.aliases, []),
    facets: parseJson(row.facets, {}),
    source_behavior: parseJson(row.source_behavior, {}),
    relation_behavior: parseJson(row.relation_behavior, {}),
    proposal_behavior: parseJson(row.proposal_behavior, {}),
    is_system: Boolean(row.is_system),
    metadata: parseJson(row.metadata, {}),
    template_count: Number(row.template_count || 0),
    composition_count: Number(row.composition_count || 0),
  };
}

function systemDomainSeeds(): DomainSeed[] {
  return [
    {
      domain_key: 'learning.math.basic',
      label: 'Basic Math Learning',
      description: 'Starter domain set for math learning notes, formulas, examples, and exercises.',
      domain_kind: 'learning',
      aliases: ['academic.math.basic', 'mathematics.learning.basic'],
      facets: {
        discipline: 'math',
        use_cases: ['learning_notes', 'formula_sheet', 'problem_practice'],
      },
      templates: [
        { template_key: 'text.heading', member_role: 'heading', required: false },
        { template_key: 'concept.basic', member_role: 'concept' },
        { template_key: 'definition.basic', member_role: 'definition' },
        { template_key: 'theorem.basic', member_role: 'theorem' },
        { template_key: 'proof.basic', member_role: 'proof' },
        { template_key: 'formula.math', member_role: 'formula' },
        { template_key: 'example.general', member_role: 'example' },
        { template_key: 'exercise.general', member_role: 'exercise' },
        { template_key: 'answer.general', member_role: 'answer', required: false },
        { template_key: 'warning.callout', member_role: 'callout', required: false },
      ],
      compositions: [
        { composition_key: 'formula_sheet.basic', member_role: 'formula_sheet' },
        { composition_key: 'theorem_proof_example.basic', member_role: 'theorem_section' },
        { composition_key: 'side_note_cluster.basic', member_role: 'side_notes', required: false },
      ],
      source_behavior: { source_reference_policy: 'recommended' },
      relation_behavior: { relation_preset: 'learning_logic' },
      proposal_behavior: { proposal_preset: 'ai_allowed_with_review' },
      summary_for_agent: 'Use this domain set for math learning notes that need definitions, theorem/proof/example sections, formulas, and exercises.',
    },
    {
      domain_key: 'research.evidence.basic',
      label: 'Basic Research Evidence',
      description: 'Starter domain set for source-grounded evidence comparison and interpretation.',
      domain_kind: 'research',
      aliases: ['evidence.research.basic'],
      facets: {
        discipline: 'general_research',
        use_cases: ['evidence_comparison', 'source_interpretation', 'claim_support'],
      },
      templates: [
        { template_key: 'text.heading', member_role: 'heading', required: false },
        { template_key: 'source.quote', member_role: 'source_quote' },
        { template_key: 'concept.basic', member_role: 'claim' },
        { template_key: 'example.general', member_role: 'evidence_example', required: false },
        { template_key: 'warning.callout', member_role: 'risk_or_conflict', required: false },
      ],
      compositions: [
        { composition_key: 'source_quote_interpretation.basic', member_role: 'source_interpretation' },
        { composition_key: 'evidence_comparison.basic', member_role: 'evidence_comparison' },
      ],
      source_behavior: { source_reference_policy: 'required' },
      relation_behavior: { relation_preset: 'source_evidence' },
      proposal_behavior: { proposal_preset: 'ai_allowed_with_review' },
      summary_for_agent: 'Use this domain set when source trust, evidence grouping, and claim support are more important than a classroom note shape.',
    },
    {
      domain_key: 'briefing.general.basic',
      label: 'Basic Briefing',
      description: 'Starter domain set for concise briefs, quick reports, and action-oriented summaries.',
      domain_kind: 'briefing',
      aliases: ['report.briefing.basic'],
      facets: {
        discipline: 'general_information_work',
        use_cases: ['briefing', 'summary', 'action_items'],
      },
      templates: [
        { template_key: 'text.heading', member_role: 'heading', required: false },
        { template_key: 'text.paragraph', member_role: 'summary' },
        { template_key: 'concept.basic', member_role: 'key_point', required: false },
        { template_key: 'warning.callout', member_role: 'risk_or_attention', required: false },
        { template_key: 'exercise.general', member_role: 'action_item', required: false },
      ],
      compositions: [
        { composition_key: 'briefing_section.basic', member_role: 'briefing_section' },
        { composition_key: 'source_quote_interpretation.basic', member_role: 'grounded_note', required: false },
      ],
      source_behavior: { source_reference_policy: 'allowed' },
      relation_behavior: { relation_preset: 'basic_support' },
      proposal_behavior: { proposal_preset: 'ai_allowed_with_review' },
      summary_for_agent: 'Use this domain set for compact information briefs, quick research summaries, and follow-up action sections.',
    },
  ];
}

function packageContentsForSeeds() {
  const domains = systemDomainSeeds();
  return {
    domain_block_sets: domains.map((domain) => domain.domain_key),
    template_definitions: [...new Set(domains.flatMap((domain) => domain.templates.map((template) => template.template_key)))],
    composition_templates: [...new Set(domains.flatMap((domain) => domain.compositions.map((composition) => composition.composition_key)))],
    style_packs: [],
    relation_presets: ['learning_logic', 'source_evidence', 'basic_support'],
  };
}

function assertKey(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(normalized) || normalized.length > 180) {
    throw new AppError(400, `Invalid ${label}. Use a lowercase dotted key.`);
  }
  return normalized;
}

function containsSecretLikeKey(value: unknown, path = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => containsSecretLikeKey(item, `${path}[${index}]`));
  }

  const secretKeys: string[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (/(api[_-]?key|secret|token|password|credential|provider[_-]?key)/i.test(key)) {
      secretKeys.push(nextPath);
    }
    secretKeys.push(...containsSecretLikeKey(nested, nextPath));
  }
  return secretKeys;
}

function validationStatus(warnings: string[], blockers: string[]): ValidationStatus {
  if (blockers.length > 0) return 'blocked';
  if (warnings.length > 0) return 'warning';
  return 'valid';
}

function validatePackageManifestShape(input: Record<string, unknown>) {
  const warnings: string[] = [];
  const blockers: string[] = [];

  const packageKey = typeof input.package_key === 'string' ? input.package_key.trim() : '';
  const version = typeof input.version === 'string' ? input.version.trim() : '';
  const manifestVersion = typeof input.manifest_version === 'string' ? input.manifest_version.trim() : PACKAGE_MANIFEST_VERSION;
  const packageKind = typeof input.package_kind === 'string' ? input.package_kind.trim() : '';
  const packageName = typeof input.package_name === 'string' ? input.package_name.trim() : '';

  if (!packageKey) blockers.push('Package key is required.');
  if (!version) blockers.push('Package version is required.');
  if (!packageKind) blockers.push('Package kind is required.');
  if (!packageName) blockers.push('Package name is required.');

  try {
    if (packageKey) assertKey(packageKey, 'package_key');
  } catch (err) {
    blockers.push(err instanceof Error ? err.message : 'Invalid package_key.');
  }

  if (manifestVersion !== PACKAGE_MANIFEST_VERSION) {
    warnings.push(`Manifest version ${manifestVersion} differs from ${PACKAGE_MANIFEST_VERSION}.`);
  }

  const trust = input.trust && typeof input.trust === 'object' ? input.trust as Record<string, unknown> : {};
  const contents = input.contents && typeof input.contents === 'object' ? input.contents as Record<string, unknown> : {};

  if (trust.contains_executable_code === true || contents.contains_executable_code === true) {
    blockers.push('Executable code is not allowed in v2.5.3 package manifests.');
  }
  if (trust.contains_private_sources === true) {
    warnings.push('Package manifest declares private sources; v2.5.3 can preview it but should not import it.');
  }

  const secretPaths = containsSecretLikeKey({ contents, trust, metadata: input.metadata });
  if (secretPaths.length > 0) {
    blockers.push(`Package manifest contains secret-like fields: ${secretPaths.join(', ')}.`);
  }

  return {
    warnings,
    blockers,
    validation_status: validationStatus(warnings, blockers),
  };
}

function templateByKey(templates: TemplateDefinition[]): Map<string, TemplateDefinition> {
  return new Map(templates.map((template) => [template.template_key, template]));
}

function compositionByKey(compositions: CompositionTemplate[]): Map<string, CompositionTemplate> {
  return new Map(compositions.map((composition) => [composition.composition_key, composition]));
}

function getTemplateOrThrow(templates: Map<string, TemplateDefinition>, key: string): TemplateDefinition {
  const template = templates.get(key);
  if (!template) throw new AppError(500, `System seed template ${key} is missing.`);
  return template;
}

function getCompositionOrThrow(compositions: Map<string, CompositionTemplate>, key: string): CompositionTemplate {
  const composition = compositions.get(key);
  if (!composition) throw new AppError(500, `System seed composition ${key} is missing.`);
  return composition;
}

function upsertPackageManifest(db: Database.Database, userId: string): PackageManifest {
  const manifest = {
    package_key: 'coincides.core.domain-seeds',
    version: DOMAIN_PACKAGE_VERSION,
    manifest_version: PACKAGE_MANIFEST_VERSION,
    package_kind: 'domain_block_set',
    package_name: 'Coincides Core Domain Seeds',
    description: 'Starter domain block sets for learning, research evidence, and briefing workflows.',
    author: { name: 'Coincides' },
    compatibility: {
      min_app_version: '2.5.3',
      requires_features: ['template_definitions', 'composition_templates', 'domain_block_sets'],
    },
    contents: packageContentsForSeeds(),
    trust: {
      level: 'system_seed',
      contains_executable_code: false,
      contains_private_sources: false,
    },
    license: { type: 'project_internal' },
    import_policy: {
      default_mode: 'preview_required',
      allow_overwrite: false,
      namespace_strategy: 'preserve_with_conflict_suffix',
    },
    export_policy: {
      exportable: true,
      include_private_sources: false,
    },
    graph_migration_hints: {
      node_candidate: 'PackageManifest',
      contains_edges: ['CONTAINS_DOMAIN_BLOCK_SET', 'CONTAINS_TEMPLATE', 'CONTAINS_COMPOSITION'],
    },
    metadata: {
      seeded_from: 'v2.5.3_system_domain_seed',
    },
  };
  const validation = validatePackageManifestShape(manifest);

  db.prepare(`
    INSERT INTO package_manifests (
      id, user_id, package_key, version, manifest_version, package_kind, origin,
      scope_type, scope_id, package_name, description, author, compatibility,
      contents, trust, license, import_policy, export_policy, graph_migration_hints,
      validation_status, status, is_system, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'system_seed', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, package_key, version, scope_type, scope_id) DO UPDATE SET
      manifest_version = excluded.manifest_version,
      package_kind = excluded.package_kind,
      package_name = excluded.package_name,
      description = excluded.description,
      author = excluded.author,
      compatibility = excluded.compatibility,
      contents = excluded.contents,
      trust = excluded.trust,
      license = excluded.license,
      import_policy = excluded.import_policy,
      export_policy = excluded.export_policy,
      graph_migration_hints = excluded.graph_migration_hints,
      validation_status = excluded.validation_status,
      status = 'active',
      is_system = 1,
      metadata = excluded.metadata,
      updated_at = datetime('now')
  `).run(
    uuidv4(),
    userId,
    manifest.package_key,
    manifest.version,
    manifest.manifest_version,
    manifest.package_kind,
    manifest.package_name,
    manifest.description,
    stringifyJson(manifest.author),
    stringifyJson(manifest.compatibility),
    stringifyJson(manifest.contents),
    stringifyJson(manifest.trust),
    stringifyJson(manifest.license),
    stringifyJson(manifest.import_policy),
    stringifyJson(manifest.export_policy),
    stringifyJson(manifest.graph_migration_hints),
    validation.validation_status,
    stringifyJson(manifest.metadata),
  );

  return listPackageManifests(db, userId, { package_key: manifest.package_key })[0];
}

function upsertDomainBlockSet(
  db: Database.Database,
  userId: string,
  packageManifest: PackageManifest,
  seed: DomainSeed,
  templates: Map<string, TemplateDefinition>,
  compositions: Map<string, CompositionTemplate>,
): DomainBlockSet {
  db.prepare(`
    INSERT INTO domain_block_sets (
      id, user_id, package_manifest_id, domain_key, version, origin, scope_type,
      scope_id, label, description, domain_kind, aliases, facets, source_behavior,
      relation_behavior, proposal_behavior, summary_for_agent, status, is_system,
      metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'system_seed', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, domain_key, version, scope_type, scope_id) DO UPDATE SET
      package_manifest_id = excluded.package_manifest_id,
      label = excluded.label,
      description = excluded.description,
      domain_kind = excluded.domain_kind,
      aliases = excluded.aliases,
      facets = excluded.facets,
      source_behavior = excluded.source_behavior,
      relation_behavior = excluded.relation_behavior,
      proposal_behavior = excluded.proposal_behavior,
      summary_for_agent = excluded.summary_for_agent,
      status = 'active',
      is_system = 1,
      metadata = excluded.metadata,
      updated_at = datetime('now')
  `).run(
    uuidv4(),
    userId,
    packageManifest.id,
    seed.domain_key,
    DOMAIN_PACKAGE_VERSION,
    seed.label,
    seed.description,
    seed.domain_kind,
    stringifyJson(seed.aliases),
    stringifyJson(seed.facets),
    stringifyJson(seed.source_behavior),
    stringifyJson(seed.relation_behavior),
    stringifyJson(seed.proposal_behavior),
    seed.summary_for_agent,
    stringifyJson({
      seeded_from: 'v2.5.3_system_domain_seed',
      graph_native_candidate: 'domain_block_set_node',
    }),
  );

  const domain = listDomainBlockSets(db, userId, { domain_key: seed.domain_key })[0];

  db.prepare('DELETE FROM domain_block_set_templates WHERE domain_block_set_id = ?').run(domain.id);
  db.prepare('DELETE FROM domain_block_set_compositions WHERE domain_block_set_id = ?').run(domain.id);

  const insertTemplate = db.prepare(`
    INSERT INTO domain_block_set_templates (
      id, user_id, domain_block_set_id, template_definition_id, template_key,
      template_version, member_role, required, order_index, metadata,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  seed.templates.forEach((templateSeed, index) => {
    const template = getTemplateOrThrow(templates, templateSeed.template_key);
    insertTemplate.run(
      uuidv4(),
      userId,
      domain.id,
      template.id,
      template.template_key,
      template.version,
      templateSeed.member_role,
      templateSeed.required === false ? 0 : 1,
      index,
      stringifyJson({ graph_edge_candidate: 'DOMAIN_INCLUDES_TEMPLATE' }),
    );
  });

  const insertComposition = db.prepare(`
    INSERT INTO domain_block_set_compositions (
      id, user_id, domain_block_set_id, composition_template_id, composition_key,
      composition_version, member_role, required, order_index, metadata,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  seed.compositions.forEach((compositionSeed, index) => {
    const composition = getCompositionOrThrow(compositions, compositionSeed.composition_key);
    insertComposition.run(
      uuidv4(),
      userId,
      domain.id,
      composition.id,
      composition.composition_key,
      composition.version,
      compositionSeed.member_role,
      compositionSeed.required === false ? 0 : 1,
      index,
      stringifyJson({ graph_edge_candidate: 'DOMAIN_INCLUDES_COMPOSITION' }),
    );
  });

  return listDomainBlockSets(db, userId, { domain_key: seed.domain_key })[0];
}

export function seedSystemDomainPackages(db: Database.Database, userId: string) {
  seedSystemTemplateDefinitions(db, userId);
  seedSystemCompositionTemplates(db, userId);

  const run = db.transaction(() => {
    const templates = templateByKey(listTemplateDefinitions(db, userId, { status: 'active' }));
    const compositions = compositionByKey(listCompositionTemplates(db, userId, { status: 'active' }));
    const packageManifest = upsertPackageManifest(db, userId);
    for (const seed of systemDomainSeeds()) {
      upsertDomainBlockSet(db, userId, packageManifest, seed, templates, compositions);
    }
  });
  run();

  return {
    package_manifests: listPackageManifests(db, userId, { package_key: 'coincides.core.domain-seeds' }),
    domain_block_sets: listDomainBlockSets(db, userId, {}),
  };
}

export function listPackageManifests(
  db: Database.Database,
  userId: string,
  filters: { status?: string; package_key?: string } = {},
): PackageManifest[] {
  const params: unknown[] = [userId];
  const where = ['user_id = ?'];
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.package_key) {
    where.push('package_key = ?');
    params.push(filters.package_key);
  }
  return db.prepare(`
    SELECT *
    FROM package_manifests
    WHERE ${where.join(' AND ')}
    ORDER BY is_system DESC, package_key ASC, version ASC
  `).all(...params).map(hydratePackageManifest);
}

export function getPackageManifest(db: Database.Database, userId: string, id: string): PackageManifest {
  const row = db.prepare('SELECT * FROM package_manifests WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!row) throw new AppError(404, 'Package manifest not found');
  return hydratePackageManifest(row);
}

export function listDomainBlockSets(
  db: Database.Database,
  userId: string,
  filters: { status?: string; domain_key?: string; package_manifest_id?: string } = {},
): DomainBlockSet[] {
  const params: unknown[] = [userId];
  const where = ['domain.user_id = ?'];
  if (filters.status) {
    where.push('domain.status = ?');
    params.push(filters.status);
  }
  if (filters.domain_key) {
    where.push('domain.domain_key = ?');
    params.push(filters.domain_key);
  }
  if (filters.package_manifest_id) {
    where.push('domain.package_manifest_id = ?');
    params.push(filters.package_manifest_id);
  }
  return db.prepare(`
    SELECT
      domain.*,
      (SELECT COUNT(*) FROM domain_block_set_templates WHERE domain_block_set_id = domain.id) AS template_count,
      (SELECT COUNT(*) FROM domain_block_set_compositions WHERE domain_block_set_id = domain.id) AS composition_count
    FROM domain_block_sets domain
    WHERE ${where.join(' AND ')}
    ORDER BY domain.is_system DESC, domain.domain_key ASC, domain.version ASC
  `).all(...params).map(hydrateDomainBlockSet);
}

export function getDomainBlockSet(db: Database.Database, userId: string, id: string): DomainBlockSet {
  const domain = listDomainBlockSets(db, userId, {}).find((item) => item.id === id);
  if (!domain) throw new AppError(404, 'Domain block set not found');
  return domain;
}

export function previewPackageManifestInput(
  db: Database.Database,
  userId: string,
  input: Record<string, unknown>,
): PackagePreview {
  const validation = validatePackageManifestShape(input);
  const domainKeys: string[] = Array.isArray((input.contents as any)?.domain_block_sets)
    ? (input.contents as any).domain_block_sets.filter((key: unknown) => typeof key === 'string')
    : [];
  const domains: DomainBlockSet[] = domainKeys.flatMap((domainKey: string) => listDomainBlockSets(db, userId, { domain_key: domainKey }));
  const templateCount = Array.isArray((input.contents as any)?.template_definitions)
    ? (input.contents as any).template_definitions.length
    : domains.reduce((sum, domain) => sum + domain.template_count, 0);
  const compositionCount = Array.isArray((input.contents as any)?.composition_templates)
    ? (input.contents as any).composition_templates.length
    : domains.reduce((sum, domain) => sum + domain.composition_count, 0);

  return {
    manifest: input,
    domain_sets: domains,
    template_count: templateCount,
    composition_count: compositionCount,
    warnings: validation.warnings,
    blockers: validation.blockers,
    validation_status: validation.validation_status,
  };
}

export function getPackageManifestPreview(db: Database.Database, userId: string, id: string): PackagePreview {
  const manifest = getPackageManifest(db, userId, id);
  const validation = validatePackageManifestShape({
    package_key: manifest.package_key,
    version: manifest.version,
    manifest_version: manifest.manifest_version,
    package_kind: manifest.package_kind,
    package_name: manifest.package_name,
    trust: manifest.trust,
    contents: manifest.contents,
    metadata: manifest.metadata,
  });
  const domains = listDomainBlockSets(db, userId, { package_manifest_id: manifest.id });
  return {
    manifest,
    domain_sets: domains,
    template_count: domains.reduce((sum, domain) => sum + domain.template_count, 0),
    composition_count: domains.reduce((sum, domain) => sum + domain.composition_count, 0),
    warnings: validation.warnings,
    blockers: validation.blockers,
    validation_status: validation.validation_status,
  };
}

export function getDomainBlockSetCompatibilityReport(
  db: Database.Database,
  userId: string,
  domainId: string,
): DomainCompatibilityReport {
  const domain = getDomainBlockSet(db, userId, domainId);
  const warnings: string[] = [];
  const blockers: string[] = [];

  const templateRows = db.prepare(`
    SELECT template_key, template_version, required, template_definition_id
    FROM domain_block_set_templates
    WHERE domain_block_set_id = ?
    ORDER BY order_index ASC
  `).all(domain.id) as any[];
  for (const row of templateRows) {
    const resolved = row.template_definition_id
      ? db.prepare('SELECT id, status FROM template_definitions WHERE id = ? AND user_id = ?').get(row.template_definition_id, userId) as any
      : null;
    if (!resolved && row.required) {
      blockers.push(`Required template ${row.template_key} is missing.`);
    } else if (!resolved) {
      warnings.push(`Optional template ${row.template_key} is missing.`);
    } else if (resolved.status === 'archived') {
      warnings.push(`Template ${row.template_key} is archived.`);
    }
  }

  const compositionRows = db.prepare(`
    SELECT composition_key, composition_version, required, composition_template_id
    FROM domain_block_set_compositions
    WHERE domain_block_set_id = ?
    ORDER BY order_index ASC
  `).all(domain.id) as any[];
  for (const row of compositionRows) {
    const resolved = row.composition_template_id
      ? db.prepare('SELECT id, status FROM composition_templates WHERE id = ? AND user_id = ?').get(row.composition_template_id, userId) as any
      : null;
    if (!resolved && row.required) {
      blockers.push(`Required composition ${row.composition_key} is missing.`);
    } else if (!resolved) {
      warnings.push(`Optional composition ${row.composition_key} is missing.`);
    } else if (resolved.status === 'archived') {
      warnings.push(`Composition ${row.composition_key} is archived.`);
    }
  }

  return {
    domain_block_set: domain,
    template_count: templateRows.length,
    composition_count: compositionRows.length,
    warnings,
    blockers,
    validation_status: validationStatus(warnings, blockers),
  };
}
