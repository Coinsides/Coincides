import type Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  getPackageManifest,
  listDomainBlockSets,
  listPackageManifests,
  type DomainBlockSet,
  type PackageManifest,
} from './domainPackages.js';
import { listTemplateDefinitions, type TemplateDefinition } from './templateDefinitions.js';
import { listCompositionTemplates, type CompositionTemplate } from './compositionTemplates.js';

type PackageLevel = 'light' | 'trusted';
type SourceInclusion = 'omit' | 'reference_only' | 'snapshot_text';
type ValidationStatus = 'valid' | 'warning' | 'blocked';
type ImportAction = 'imported' | 'resolved_existing' | 'skipped' | 'blocked' | 'recovery_only';

interface ExportInput {
  package_manifest_id: string;
  package_level?: PackageLevel;
  source_inclusion?: SourceInclusion;
  domain_block_set_ids?: string[];
}

interface ImportPreviewInput {
  bundle: CoincidesPackageBundle | Record<string, unknown> | string;
}

interface ImportItem {
  object_type: string;
  object_key: string;
  object_version: string;
  action: ImportAction;
  status: 'preview' | 'applied' | 'blocked' | 'skipped';
  target_id?: string | null;
  warnings: string[];
  blockers: string[];
  incoming_hash?: string;
  existing_hash?: string | null;
  metadata?: Record<string, unknown>;
}

interface PackageSummary {
  package_key: string;
  package_version: string;
  package_level: PackageLevel;
  source_inclusion: SourceInclusion;
  template_count: number;
  composition_count: number;
  domain_set_count: number;
  source_reference_count: number;
  source_snapshot_count: number;
}

export interface CoincidesPackageBundle {
  package_format: 'coincides.package.bundle';
  bundle_version: 'v2.5.5';
  package_level: PackageLevel;
  source_inclusion: SourceInclusion;
  manifest: Record<string, unknown>;
  contents: {
    template_definitions: Record<string, unknown>[];
    composition_templates: Record<string, unknown>[];
    domain_block_sets: Record<string, unknown>[];
    domain_template_memberships: Record<string, unknown>[];
    domain_composition_memberships: Record<string, unknown>[];
    source_references: Record<string, unknown>[];
    source_snapshots: Array<Record<string, unknown> & { pages?: Record<string, unknown>[] }>;
  };
  integrity: {
    content_hash: string;
    exported_at: string;
  };
}

export interface PackageExportPreview {
  bundle: CoincidesPackageBundle;
  summary: PackageSummary;
  warnings: string[];
  blockers: string[];
  validation_status: ValidationStatus;
}

export interface PackageExportRecord extends PackageExportPreview {
  id: string;
  user_id: string;
  package_manifest_id: string | null;
  status: string;
  bundle_hash: string;
  metadata: Record<string, unknown>;
  created_at: string;
  exported_at: string | null;
}

export interface PackageImportPreview {
  id: string;
  user_id: string;
  package_key: string;
  package_version: string;
  package_level: PackageLevel;
  source_inclusion: SourceInclusion;
  status: string;
  bundle_hash: string;
  bundle: CoincidesPackageBundle;
  validation_status: ValidationStatus;
  conflict_report: { items: ImportItem[] };
  recovery_report: Record<string, unknown>;
  summary: PackageSummary;
  warnings: string[];
  blockers: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  discarded_at: string | null;
}

export interface PackageImportApplyResult {
  message: string;
  package_import_record_id: string;
  operation_batch_id: string;
  imported_count: number;
  resolved_existing_count: number;
  skipped_count: number;
  blocked_count: number;
  recovery_status: string;
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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function assertPackageLevel(value: unknown): PackageLevel {
  if (value === 'trusted') return 'trusted';
  if (value === 'light' || value == null) return 'light';
  throw new AppError(400, 'Unsupported package level');
}

function assertSourceInclusion(value: unknown): SourceInclusion {
  if (value === 'omit' || value == null) return 'omit';
  if (value === 'reference_only' || value === 'snapshot_text') return value;
  throw new AppError(400, 'Unsupported source inclusion mode');
}

function scanForbiddenKeys(value: unknown, path = '$'): string[] {
  const hits: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...scanForbiddenKeys(item, `${path}[${index}]`)));
    return hits;
  }
  if (!value || typeof value !== 'object') return hits;

  const forbiddenExact = new Set([
    'api_key',
    'apikey',
    'provider_key',
    'provider_api_key',
    'secret',
    'token',
    'password',
    'private_key',
    'openai_api_key',
    'anthropic_api_key',
    'voyage_api_key',
    'dashscope_api_key',
  ]);

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, '_');
    if (forbiddenExact.has(normalized) || normalized.endsWith('_api_key')) {
      hits.push(`${path}.${key}`);
    }
    hits.push(...scanForbiddenKeys(nested, `${path}.${key}`));
  }
  return hits;
}

function templateSnapshot(template: TemplateDefinition): Record<string, unknown> {
  return {
    template_key: template.template_key,
    version: template.version,
    label: template.label,
    description: template.description,
    system_type: template.system_type,
    learning_role: template.learning_role,
    legacy_block_type: template.legacy_block_type,
    field_schema: template.field_schema,
    default_content: template.default_content,
    render_hints: template.render_hints,
    source_behavior: template.source_behavior,
    relation_behavior: template.relation_behavior,
    proposal_behavior: template.proposal_behavior,
    summary_for_agent: template.summary_for_agent,
    status: template.status,
    package_object_hash: objectHash('template_definition', template as unknown as Record<string, unknown>),
  };
}

function compositionSnapshot(composition: CompositionTemplate): Record<string, unknown> {
  return {
    composition_key: composition.composition_key,
    version: composition.version,
    label: composition.label,
    description: composition.description,
    composition_kind: composition.composition_kind,
    slot_schema: composition.slot_schema,
    layout_behavior: composition.layout_behavior,
    source_behavior: composition.source_behavior,
    relation_blueprint: composition.relation_blueprint,
    proposal_behavior: composition.proposal_behavior,
    summary_for_agent: composition.summary_for_agent,
    status: composition.status,
    package_object_hash: objectHash('composition_template', composition as unknown as Record<string, unknown>),
  };
}

function domainSnapshot(domain: DomainBlockSet): Record<string, unknown> {
  return {
    domain_key: domain.domain_key,
    version: domain.version,
    label: domain.label,
    description: domain.description,
    domain_kind: domain.domain_kind,
    aliases: domain.aliases,
    facets: domain.facets,
    source_behavior: domain.source_behavior,
    relation_behavior: domain.relation_behavior,
    proposal_behavior: domain.proposal_behavior,
    summary_for_agent: domain.summary_for_agent,
    status: domain.status,
    package_object_hash: objectHash('domain_block_set', domain as unknown as Record<string, unknown>),
  };
}

function manifestSnapshot(manifest: PackageManifest): Record<string, unknown> {
  return {
    package_key: manifest.package_key,
    version: manifest.version,
    manifest_version: 'v2.5.5',
    package_kind: manifest.package_kind,
    package_name: manifest.package_name,
    description: manifest.description,
    author: manifest.author,
    compatibility: manifest.compatibility,
    contents: manifest.contents,
    trust: {
      ...manifest.trust,
      contains_executable_code: false,
    },
    license: manifest.license,
    import_policy: manifest.import_policy,
    export_policy: manifest.export_policy,
    graph_migration_hints: manifest.graph_migration_hints,
    validation_status: manifest.validation_status,
    status: manifest.status,
    package_object_hash: objectHash('package_manifest', manifest as unknown as Record<string, unknown>),
  };
}

function objectComparable(type: string, object: Record<string, unknown>): Record<string, unknown> {
  if (type === 'template_definition') {
    return {
      template_key: object.template_key,
      version: object.version,
      label: object.label,
      description: object.description,
      system_type: object.system_type,
      learning_role: object.learning_role,
      legacy_block_type: object.legacy_block_type,
      field_schema: object.field_schema,
      default_content: object.default_content,
      render_hints: object.render_hints,
      source_behavior: object.source_behavior,
      relation_behavior: object.relation_behavior,
      proposal_behavior: object.proposal_behavior,
      summary_for_agent: object.summary_for_agent,
    };
  }
  if (type === 'composition_template') {
    return {
      composition_key: object.composition_key,
      version: object.version,
      label: object.label,
      description: object.description,
      composition_kind: object.composition_kind,
      slot_schema: object.slot_schema,
      layout_behavior: object.layout_behavior,
      source_behavior: object.source_behavior,
      relation_blueprint: object.relation_blueprint,
      proposal_behavior: object.proposal_behavior,
      summary_for_agent: object.summary_for_agent,
    };
  }
  if (type === 'domain_block_set') {
    return {
      domain_key: object.domain_key,
      version: object.version,
      label: object.label,
      description: object.description,
      domain_kind: object.domain_kind,
      aliases: object.aliases,
      facets: object.facets,
      source_behavior: object.source_behavior,
      relation_behavior: object.relation_behavior,
      proposal_behavior: object.proposal_behavior,
      summary_for_agent: object.summary_for_agent,
    };
  }
  if (type === 'package_manifest') {
    return {
      package_key: object.package_key,
      version: object.version,
      package_kind: object.package_kind,
      package_name: object.package_name,
      description: object.description,
      author: object.author,
      compatibility: object.compatibility,
      contents: object.contents,
      trust: object.trust,
      license: object.license,
      import_policy: object.import_policy,
      export_policy: object.export_policy,
      graph_migration_hints: object.graph_migration_hints,
    };
  }
  return object;
}

function objectHash(type: string, object: Record<string, unknown>): string {
  return sha256(objectComparable(type, object));
}

function bundleHash(bundle: CoincidesPackageBundle): string {
  return sha256({
    ...bundle,
    integrity: {
      exported_at: bundle.integrity.exported_at,
      content_hash: null,
    },
  });
}

function bundleSummary(bundle: CoincidesPackageBundle): PackageSummary {
  return {
    package_key: String(bundle.manifest.package_key || ''),
    package_version: String(bundle.manifest.version || ''),
    package_level: bundle.package_level,
    source_inclusion: bundle.source_inclusion,
    template_count: bundle.contents.template_definitions.length,
    composition_count: bundle.contents.composition_templates.length,
    domain_set_count: bundle.contents.domain_block_sets.length,
    source_reference_count: bundle.contents.source_references.length,
    source_snapshot_count: bundle.contents.source_snapshots.length,
  };
}

function hydrateExport(row: any): PackageExportRecord {
  const bundle = parseJson<CoincidesPackageBundle>(row.bundle_json, emptyBundle());
  return {
    id: row.id,
    user_id: row.user_id,
    package_manifest_id: row.package_manifest_id,
    status: row.status,
    bundle_hash: row.bundle_hash,
    bundle,
    summary: parseJson(row.summary, bundleSummary(bundle)),
    warnings: parseJson(row.warnings, []),
    blockers: parseJson(row.blockers, []),
    validation_status: parseJson<string[]>(row.blockers, []).length > 0 ? 'blocked' : parseJson<string[]>(row.warnings, []).length > 0 ? 'warning' : 'valid',
    metadata: parseJson(row.metadata, {}),
    created_at: row.created_at,
    exported_at: row.exported_at,
  };
}

function hydrateImportPreview(row: any): PackageImportPreview {
  const bundle = parseJson<CoincidesPackageBundle>(row.bundle_json, emptyBundle());
  return {
    id: row.id,
    user_id: row.user_id,
    package_key: row.package_key,
    package_version: row.package_version,
    package_level: row.package_level,
    source_inclusion: row.source_inclusion,
    status: row.status,
    bundle_hash: row.bundle_hash,
    bundle,
    validation_status: row.validation_status,
    conflict_report: parseJson(row.conflict_report, { items: [] }),
    recovery_report: parseJson(row.recovery_report, {}),
    summary: parseJson(row.summary, bundleSummary(bundle)),
    warnings: parseJson(row.warnings, []),
    blockers: parseJson(row.blockers, []),
    metadata: parseJson(row.metadata, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
    discarded_at: row.discarded_at,
  };
}

function emptyBundle(): CoincidesPackageBundle {
  return {
    package_format: 'coincides.package.bundle',
    bundle_version: 'v2.5.5',
    package_level: 'light',
    source_inclusion: 'omit',
    manifest: {},
    contents: {
      template_definitions: [],
      composition_templates: [],
      domain_block_sets: [],
      domain_template_memberships: [],
      domain_composition_memberships: [],
      source_references: [],
      source_snapshots: [],
    },
    integrity: {
      content_hash: '',
      exported_at: '',
    },
  };
}

function getMembershipRows(db: Database.Database, domainIds: string[]) {
  if (domainIds.length === 0) return { templateRows: [], compositionRows: [] };
  const placeholders = domainIds.map(() => '?').join(',');
  const templateRows = db.prepare(`
    SELECT domain.domain_key, domain.version AS domain_version, member.template_key,
      member.template_version, member.member_role, member.required, member.order_index, member.metadata
    FROM domain_block_set_templates member
    JOIN domain_block_sets domain ON domain.id = member.domain_block_set_id
    WHERE member.domain_block_set_id IN (${placeholders})
    ORDER BY domain.domain_key ASC, member.order_index ASC
  `).all(...domainIds) as any[];
  const compositionRows = db.prepare(`
    SELECT domain.domain_key, domain.version AS domain_version, member.composition_key,
      member.composition_version, member.member_role, member.required, member.order_index, member.metadata
    FROM domain_block_set_compositions member
    JOIN domain_block_sets domain ON domain.id = member.domain_block_set_id
    WHERE member.domain_block_set_id IN (${placeholders})
    ORDER BY domain.domain_key ASC, member.order_index ASC
  `).all(...domainIds) as any[];
  return { templateRows, compositionRows };
}

function sourceContent(db: Database.Database, userId: string, inclusion: SourceInclusion) {
  if (inclusion === 'omit') return { references: [], snapshots: [], warnings: [] };

  const snapshots = db.prepare(`
    SELECT id, course_id, document_id, source_material_id, snapshot_kind, status, title,
      source_filename, page_count, chunk_count, metadata
    FROM source_snapshots
    WHERE user_id = ? AND status = 'ready'
    ORDER BY created_at ASC
  `).all(userId) as any[];

  const references = snapshots.map((snapshot) => ({
    source_snapshot_id: snapshot.id,
    course_id: snapshot.course_id,
    document_id: snapshot.document_id,
    source_material_id: snapshot.source_material_id,
    title: snapshot.title,
    source_filename: snapshot.source_filename,
    page_count: snapshot.page_count,
    chunk_count: snapshot.chunk_count,
    snapshot_kind: snapshot.snapshot_kind,
    metadata: parseJson(snapshot.metadata, {}),
  }));

  if (inclusion === 'reference_only') {
    return { references, snapshots: [], warnings: ['Trusted package includes source references only; live source rows are not recreated by import.'] };
  }

  const snapshotPayload = snapshots.map((snapshot) => {
    const pages = db.prepare(`
      SELECT page_number, page_label, text_content, chunk_ids, metadata
      FROM source_snapshot_pages
      WHERE user_id = ? AND source_snapshot_id = ?
      ORDER BY page_number ASC
    `).all(userId, snapshot.id).map((page: any) => ({
      page_number: page.page_number,
      page_label: page.page_label,
      text_content: page.text_content,
      chunk_ids: parseJson(page.chunk_ids, []),
      metadata: parseJson(page.metadata, {}),
    }));
    return {
      ...references.find((reference) => reference.source_snapshot_id === snapshot.id),
      pages,
    };
  });

  return {
    references,
    snapshots: snapshotPayload,
    warnings: ['Trusted package includes source snapshot text as recovery material only; import will not recreate live source rows in v2.5.5.'],
  };
}

function validateBundleShape(input: CoincidesPackageBundle | Record<string, unknown>) {
  const warnings: string[] = [];
  const blockers: string[] = [];
  if (!input || typeof input !== 'object') {
    blockers.push('Package bundle must be a JSON object.');
    return { warnings, blockers };
  }
  if ((input as any).package_format !== 'coincides.package.bundle') {
    blockers.push('Unsupported package_format; expected coincides.package.bundle.');
  }
  if ((input as any).bundle_version !== 'v2.5.5') {
    blockers.push('Unsupported bundle_version; expected v2.5.5.');
  }
  if (!['light', 'trusted'].includes(String((input as any).package_level))) {
    blockers.push('Unsupported package_level; v2.5.5 supports light and trusted.');
  }
  if (!['omit', 'reference_only', 'snapshot_text'].includes(String((input as any).source_inclusion))) {
    blockers.push('Unsupported source_inclusion; v2.5.5 supports omit, reference_only, and snapshot_text.');
  }
  if (!(input as any).manifest || typeof (input as any).manifest !== 'object') {
    blockers.push('Package bundle is missing manifest.');
  }
  if (!(input as any).contents || typeof (input as any).contents !== 'object') {
    blockers.push('Package bundle is missing contents.');
  }
  if ((input as any).manifest?.trust?.contains_executable_code === true) {
    blockers.push('Executable package content is blocked.');
  }
  const secretHits = scanForbiddenKeys(input);
  if (secretHits.length > 0) {
    blockers.push(`Package contains secret-like keys: ${secretHits.slice(0, 5).join(', ')}`);
  }
  const declaredHash = (input as any).integrity?.content_hash;
  if (declaredHash && typeof declaredHash === 'string') {
    const recomputed = bundleHash(input as CoincidesPackageBundle);
    if (declaredHash !== recomputed) {
      warnings.push('Package content hash does not match the bundle payload.');
    }
  }
  return { warnings, blockers };
}

export function validateCoincidesBundle(input: CoincidesPackageBundle | Record<string, unknown>) {
  const validation = validateBundleShape(input);
  return {
    ...validation,
    validation_status: validation.blockers.length > 0 ? 'blocked' : validation.warnings.length > 0 ? 'warning' : 'valid' as ValidationStatus,
  };
}

function coerceBundle(input: ImportPreviewInput['bundle']): CoincidesPackageBundle {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const contents = (parsed as any).contents || {};
  return {
    package_format: (parsed as any).package_format,
    bundle_version: (parsed as any).bundle_version,
    package_level: assertPackageLevel((parsed as any).package_level),
    source_inclusion: assertSourceInclusion((parsed as any).source_inclusion),
    manifest: (parsed as any).manifest || {},
    contents: {
      template_definitions: Array.isArray(contents.template_definitions) ? contents.template_definitions : [],
      composition_templates: Array.isArray(contents.composition_templates) ? contents.composition_templates : [],
      domain_block_sets: Array.isArray(contents.domain_block_sets) ? contents.domain_block_sets : [],
      domain_template_memberships: Array.isArray(contents.domain_template_memberships) ? contents.domain_template_memberships : [],
      domain_composition_memberships: Array.isArray(contents.domain_composition_memberships) ? contents.domain_composition_memberships : [],
      source_references: Array.isArray(contents.source_references) ? contents.source_references : [],
      source_snapshots: Array.isArray(contents.source_snapshots) ? contents.source_snapshots : [],
    },
    integrity: {
      content_hash: String((parsed as any).integrity?.content_hash || ''),
      exported_at: String((parsed as any).integrity?.exported_at || ''),
    },
  } as CoincidesPackageBundle;
}

export function buildPackageExportPreview(db: Database.Database, userId: string, input: ExportInput): PackageExportPreview {
  const manifest = getPackageManifest(db, userId, input.package_manifest_id);
  const packageLevel = assertPackageLevel(input.package_level);
  const sourceInclusion = assertSourceInclusion(input.source_inclusion);
  if (packageLevel === 'light' && sourceInclusion !== 'omit') {
    throw new AppError(400, 'Light packages must use omit source inclusion.');
  }

  const warnings: string[] = [];
  const blockers: string[] = [];
  const domains = listDomainBlockSets(db, userId, { package_manifest_id: manifest.id })
    .filter((domain) => !input.domain_block_set_ids || input.domain_block_set_ids.includes(domain.id));
  const domainIds = domains.map((domain) => domain.id);
  const { templateRows, compositionRows } = getMembershipRows(db, domainIds);
  const templateKeys = new Set(templateRows.map((row) => row.template_key));
  const compositionKeys = new Set(compositionRows.map((row) => row.composition_key));
  const templates = listTemplateDefinitions(db, userId, {})
    .filter((template) => templateKeys.has(template.template_key))
    .map(templateSnapshot);
  const compositions = listCompositionTemplates(db, userId, {})
    .filter((composition) => compositionKeys.has(composition.composition_key))
    .map(compositionSnapshot);
  const sources = packageLevel === 'trusted'
    ? sourceContent(db, userId, sourceInclusion)
    : { references: [], snapshots: [], warnings: [] };
  warnings.push(...sources.warnings);

  const bundle: CoincidesPackageBundle = {
    package_format: 'coincides.package.bundle',
    bundle_version: 'v2.5.5',
    package_level: packageLevel,
    source_inclusion: sourceInclusion,
    manifest: manifestSnapshot(manifest),
    contents: {
      template_definitions: templates,
      composition_templates: compositions,
      domain_block_sets: domains.map(domainSnapshot),
      domain_template_memberships: templateRows.map((row) => ({
        domain_key: row.domain_key,
        domain_version: row.domain_version,
        template_key: row.template_key,
        template_version: row.template_version,
        member_role: row.member_role,
        required: Boolean(row.required),
        order_index: row.order_index,
        metadata: parseJson(row.metadata, {}),
      })),
      domain_composition_memberships: compositionRows.map((row) => ({
        domain_key: row.domain_key,
        domain_version: row.domain_version,
        composition_key: row.composition_key,
        composition_version: row.composition_version,
        member_role: row.member_role,
        required: Boolean(row.required),
        order_index: row.order_index,
        metadata: parseJson(row.metadata, {}),
      })),
      source_references: sources.references,
      source_snapshots: sources.snapshots,
    },
    integrity: {
      content_hash: '',
      exported_at: new Date().toISOString(),
    },
  };
  bundle.integrity.content_hash = bundleHash(bundle);

  const secretHits = scanForbiddenKeys(bundle);
  if (secretHits.length > 0) {
    blockers.push(`Export bundle contains secret-like keys: ${secretHits.slice(0, 5).join(', ')}`);
  }
  if (packageLevel === 'trusted' && sourceInclusion === 'snapshot_text') {
    warnings.push('Source snapshot text is recovery material only and will not recreate live source rows on import.');
  }

  return {
    bundle,
    summary: bundleSummary(bundle),
    warnings,
    blockers,
    validation_status: blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'valid',
  };
}

export function createPackageExport(db: Database.Database, userId: string, input: ExportInput): PackageExportRecord {
  const preview = buildPackageExportPreview(db, userId, input);
  if (preview.blockers.length > 0) {
    throw new AppError(400, 'Package export is blocked', { blockers: preview.blockers });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO package_exports (
      id, user_id, package_manifest_id, package_key, package_version, package_level,
      source_inclusion, status, bundle_hash, bundle_json, summary, warnings, blockers,
      metadata, created_at, exported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'exported', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    input.package_manifest_id,
    String(preview.bundle.manifest.package_key || ''),
    String(preview.bundle.manifest.version || ''),
    preview.bundle.package_level,
    preview.bundle.source_inclusion,
    preview.bundle.integrity.content_hash,
    stringifyJson(preview.bundle),
    stringifyJson(preview.summary),
    stringifyJson(preview.warnings),
    stringifyJson(preview.blockers),
    stringifyJson({ created_from: 'v2.5.5_package_export', graph_native_candidate: 'package_export_operation_node' }),
    now,
    now,
  );
  return getPackageExport(db, userId, id);
}

export function listPackageExports(db: Database.Database, userId: string): PackageExportRecord[] {
  return db.prepare(`
    SELECT * FROM package_exports
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId).map(hydrateExport);
}

export function getPackageExport(db: Database.Database, userId: string, id: string): PackageExportRecord {
  const row = db.prepare('SELECT * FROM package_exports WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) throw new AppError(404, 'Package export not found');
  return hydrateExport(row);
}

function existingTemplate(db: Database.Database, userId: string, key: string, version: string) {
  return listTemplateDefinitions(db, userId, { template_key: key }).find((template) => template.version === version);
}

function existingComposition(db: Database.Database, userId: string, key: string, version: string) {
  return listCompositionTemplates(db, userId, { composition_key: key }).find((composition) => composition.version === version);
}

function existingDomain(db: Database.Database, userId: string, key: string, version: string) {
  return listDomainBlockSets(db, userId, { domain_key: key }).find((domain) => domain.version === version);
}

function existingManifest(db: Database.Database, userId: string, key: string, version: string) {
  return listPackageManifests(db, userId, { package_key: key }).find((manifest) => manifest.version === version);
}

function itemForObject(
  type: string,
  key: string,
  version: string,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
): ImportItem {
  const incomingHash = objectHash(type, incoming);
  if (!existing) {
    return { object_type: type, object_key: key, object_version: version, action: 'imported', status: 'preview', warnings: [], blockers: [], incoming_hash: incomingHash };
  }
  const existingHash = objectHash(type, existing);
  if (incomingHash === existingHash) {
    return { object_type: type, object_key: key, object_version: version, action: 'resolved_existing', status: 'preview', target_id: String(existing.id || ''), warnings: [], blockers: [], incoming_hash: incomingHash, existing_hash: existingHash };
  }
  return {
    object_type: type,
    object_key: key,
    object_version: version,
    action: 'blocked',
    status: 'blocked',
    target_id: String(existing.id || ''),
    warnings: [],
    blockers: [`${type} ${key}@${version} conflicts with existing ${type}`],
    incoming_hash: incomingHash,
    existing_hash: existingHash,
  };
}

export function detectPackageConflicts(db: Database.Database, userId: string, bundle: CoincidesPackageBundle): { items: ImportItem[]; warnings: string[]; blockers: string[] } {
  const items: ImportItem[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  const manifest = bundle.manifest;
  items.push(itemForObject(
    'package_manifest',
    String(manifest.package_key || ''),
    String(manifest.version || ''),
    manifest,
    existingManifest(db, userId, String(manifest.package_key || ''), String(manifest.version || '')) as any,
  ));

  for (const template of bundle.contents.template_definitions) {
    items.push(itemForObject(
      'template_definition',
      String(template.template_key || ''),
      String(template.version || ''),
      template,
      existingTemplate(db, userId, String(template.template_key || ''), String(template.version || '')) as any,
    ));
  }
  for (const composition of bundle.contents.composition_templates) {
    items.push(itemForObject(
      'composition_template',
      String(composition.composition_key || ''),
      String(composition.version || ''),
      composition,
      existingComposition(db, userId, String(composition.composition_key || ''), String(composition.version || '')) as any,
    ));
  }
  for (const domain of bundle.contents.domain_block_sets) {
    items.push(itemForObject(
      'domain_block_set',
      String(domain.domain_key || ''),
      String(domain.version || ''),
      domain,
      existingDomain(db, userId, String(domain.domain_key || ''), String(domain.version || '')) as any,
    ));
  }

  const incomingTemplateKeys = new Set(bundle.contents.template_definitions.map((template) => `${template.template_key}@${template.version}`));
  const incomingCompositionKeys = new Set(bundle.contents.composition_templates.map((composition) => `${composition.composition_key}@${composition.version}`));
  for (const membership of bundle.contents.domain_template_memberships) {
    const templateKey = `${membership.template_key}@${membership.template_version}`;
    const exists = incomingTemplateKeys.has(templateKey) || Boolean(existingTemplate(db, userId, String(membership.template_key || ''), String(membership.template_version || '')));
    if (!exists && membership.required !== false) {
      blockers.push(`Required template membership ${templateKey} is missing.`);
    } else if (!exists) {
      warnings.push(`Optional template membership ${templateKey} is missing.`);
    }
  }
  for (const membership of bundle.contents.domain_composition_memberships) {
    const compositionKey = `${membership.composition_key}@${membership.composition_version}`;
    const exists = incomingCompositionKeys.has(compositionKey) || Boolean(existingComposition(db, userId, String(membership.composition_key || ''), String(membership.composition_version || '')));
    if (!exists && membership.required !== false) {
      blockers.push(`Required composition membership ${compositionKey} is missing.`);
    } else if (!exists) {
      warnings.push(`Optional composition membership ${compositionKey} is missing.`);
    }
  }

  if (bundle.contents.source_references.length > 0 || bundle.contents.source_snapshots.length > 0) {
    warnings.push('Source metadata in v2.5.5 imports is recovery-only and does not recreate live source rows.');
    for (const source of bundle.contents.source_references) {
      items.push({
        object_type: 'source_reference',
        object_key: String(source.source_filename || source.document_id || source.source_snapshot_id || 'source'),
        object_version: '',
        action: 'recovery_only',
        status: 'preview',
        warnings: ['Source reference is preserved as recovery metadata only.'],
        blockers: [],
      });
    }
    for (const source of bundle.contents.source_snapshots) {
      items.push({
        object_type: 'source_snapshot',
        object_key: String(source.source_filename || source.document_id || source.source_snapshot_id || 'snapshot'),
        object_version: '',
        action: 'recovery_only',
        status: 'preview',
        warnings: ['Source snapshot text is preserved as recovery metadata only.'],
        blockers: [],
      });
    }
  }

  for (const item of items) {
    blockers.push(...item.blockers);
    warnings.push(...item.warnings);
  }
  return { items, warnings: [...new Set(warnings)], blockers: [...new Set(blockers)] };
}

export function buildPackageImportPreview(db: Database.Database, userId: string, input: ImportPreviewInput): PackageImportPreview {
  const bundle = coerceBundle(input.bundle);
  const validation = validateCoincidesBundle(bundle);
  const conflicts = detectPackageConflicts(db, userId, bundle);
  const warnings = [...new Set([...validation.warnings, ...conflicts.warnings])];
  const blockers = [...new Set([...validation.blockers, ...conflicts.blockers])];
  const id = uuidv4();
  const now = new Date().toISOString();
  const status: ValidationStatus = blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'valid';
  const summary = bundleSummary(bundle);
  db.prepare(`
    INSERT INTO package_import_previews (
      id, user_id, package_key, package_version, package_level, source_inclusion,
      status, bundle_hash, bundle_json, validation_status, conflict_report, recovery_report,
      summary, warnings, blockers, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'preview', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    summary.package_key,
    summary.package_version,
    summary.package_level,
    summary.source_inclusion,
    bundle.integrity.content_hash || bundleHash(bundle),
    stringifyJson(bundle),
    status,
    stringifyJson({ items: conflicts.items }),
    stringifyJson({
      source_references: bundle.contents.source_references.length,
      source_snapshots: bundle.contents.source_snapshots.length,
      live_source_recreation: false,
    }),
    stringifyJson(summary),
    stringifyJson(warnings),
    stringifyJson(blockers),
    stringifyJson({ created_from: 'v2.5.5_package_import_preview' }),
    now,
    now,
  );
  return getPackageImportPreview(db, userId, id);
}

export function listPackageImportPreviews(db: Database.Database, userId: string): PackageImportPreview[] {
  return db.prepare(`
    SELECT * FROM package_import_previews
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId).map(hydrateImportPreview);
}

export function getPackageImportPreview(db: Database.Database, userId: string, id: string): PackageImportPreview {
  const row = db.prepare('SELECT * FROM package_import_previews WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) throw new AppError(404, 'Package import preview not found');
  return hydrateImportPreview(row);
}

function insertOperationBatch(db: Database.Database, userId: string, previewId: string, id = uuidv4()): string {
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, 'package_import', ?, 'Apply package import', 'applied', ?, ?)
  `).run(
    id,
    userId,
    previewId,
    stringifyJson({ package_import_preview_id: previewId, graph_native_candidate: 'package_import_operation_node' }),
    new Date().toISOString(),
  );
  return id;
}

function insertTemplate(db: Database.Database, userId: string, template: Record<string, unknown>): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO template_definitions (
      id, user_id, template_key, version, origin, scope_type, scope_id, label,
      description, system_type, learning_role, legacy_block_type, field_schema,
      default_content, render_hints, source_behavior, relation_behavior,
      proposal_behavior, summary_for_agent, status, is_system, metadata,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'package', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    template.template_key,
    template.version || '1.0.0',
    template.label || template.template_key,
    template.description || null,
    template.system_type || 'text',
    template.learning_role || 'note',
    template.legacy_block_type || 'paragraph',
    stringifyJson(template.field_schema || []),
    stringifyJson(template.default_content || {}),
    stringifyJson(template.render_hints || {}),
    stringifyJson(template.source_behavior || {}),
    stringifyJson(template.relation_behavior || {}),
    stringifyJson(template.proposal_behavior || {}),
    template.summary_for_agent || '',
    stringifyJson({
      imported_from_package: true,
      package_object_hash: template.package_object_hash || objectHash('template_definition', template),
      graph_native_candidate: 'imported_template_definition_node',
    }),
  );
  return id;
}

function insertComposition(db: Database.Database, userId: string, composition: Record<string, unknown>): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO composition_templates (
      id, user_id, composition_key, version, origin, scope_type, scope_id,
      label, description, composition_kind, slot_schema, layout_behavior,
      source_behavior, relation_blueprint, proposal_behavior, summary_for_agent,
      status, is_system, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'package', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    composition.composition_key,
    composition.version || '1.0.0',
    composition.label || composition.composition_key,
    composition.description || null,
    composition.composition_kind || 'section',
    stringifyJson(composition.slot_schema || []),
    stringifyJson(composition.layout_behavior || {}),
    stringifyJson(composition.source_behavior || {}),
    stringifyJson(composition.relation_blueprint || []),
    stringifyJson(composition.proposal_behavior || {}),
    composition.summary_for_agent || '',
    stringifyJson({
      imported_from_package: true,
      package_object_hash: composition.package_object_hash || objectHash('composition_template', composition),
      graph_native_candidate: 'imported_composition_template_node',
    }),
  );
  return id;
}

function insertPackageManifest(db: Database.Database, userId: string, manifest: Record<string, unknown>): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO package_manifests (
      id, user_id, package_key, version, manifest_version, package_kind, origin,
      scope_type, scope_id, package_name, description, author, compatibility,
      contents, trust, license, import_policy, export_policy, graph_migration_hints,
      validation_status, status, is_system, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'imported', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', 'active', 0, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    manifest.package_key,
    manifest.version || '0.1.0',
    manifest.manifest_version || 'v2.5.5',
    manifest.package_kind || 'domain_block_set',
    manifest.package_name || manifest.package_key,
    manifest.description || null,
    stringifyJson(manifest.author || {}),
    stringifyJson(manifest.compatibility || {}),
    stringifyJson(manifest.contents || {}),
    stringifyJson(manifest.trust || {}),
    stringifyJson(manifest.license || {}),
    stringifyJson(manifest.import_policy || {}),
    stringifyJson(manifest.export_policy || {}),
    stringifyJson(manifest.graph_migration_hints || {}),
    stringifyJson({
      imported_from_package: true,
      package_object_hash: manifest.package_object_hash || objectHash('package_manifest', manifest),
      graph_native_candidate: 'imported_package_manifest_node',
    }),
  );
  return id;
}

function insertDomain(db: Database.Database, userId: string, domain: Record<string, unknown>, packageManifestId: string | null): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO domain_block_sets (
      id, user_id, package_manifest_id, domain_key, version, origin, scope_type,
      scope_id, label, description, domain_kind, aliases, facets, source_behavior,
      relation_behavior, proposal_behavior, summary_for_agent, status, is_system,
      metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'package', 'global', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    packageManifestId,
    domain.domain_key,
    domain.version || '0.1.0',
    domain.label || domain.domain_key,
    domain.description || null,
    domain.domain_kind || 'learning',
    stringifyJson(domain.aliases || []),
    stringifyJson(domain.facets || {}),
    stringifyJson(domain.source_behavior || {}),
    stringifyJson(domain.relation_behavior || {}),
    stringifyJson(domain.proposal_behavior || {}),
    domain.summary_for_agent || '',
    stringifyJson({
      imported_from_package: true,
      package_object_hash: domain.package_object_hash || objectHash('domain_block_set', domain),
      graph_native_candidate: 'imported_domain_block_set_node',
    }),
  );
  return id;
}

export function applyPackageImport(db: Database.Database, userId: string, previewId: string): PackageImportApplyResult {
  const preview = getPackageImportPreview(db, userId, previewId);
  if (preview.status !== 'preview') throw new AppError(409, 'Package import preview is not active.');
  if (preview.blockers.length > 0 || preview.validation_status === 'blocked') {
    throw new AppError(400, 'Package import preview has blockers', { blockers: preview.blockers });
  }

  const operationBatchId = uuidv4();
  const recordId = uuidv4();
  const now = new Date().toISOString();
  const items = preview.conflict_report.items || [];
  let importedCount = 0;
  let resolvedExistingCount = 0;
  let skippedCount = 0;
  let blockedCount = 0;
  const targetIds = new Map<string, string>();

  const run = db.transaction(() => {
    insertOperationBatch(db, userId, preview.id, operationBatchId);

    for (const item of items) {
      if (item.action === 'blocked') blockedCount += 1;
      if (item.action === 'resolved_existing') {
        resolvedExistingCount += 1;
        if (item.target_id) targetIds.set(`${item.object_type}:${item.object_key}@${item.object_version}`, item.target_id);
      }
      if (item.action === 'skipped' || item.action === 'recovery_only') skippedCount += 1;
    }

    let packageManifestId = targetIds.get(`package_manifest:${preview.bundle.manifest.package_key}@${preview.bundle.manifest.version}`) || null;
    const manifestItem = items.find((item) => item.object_type === 'package_manifest');
    if (manifestItem?.action === 'imported') {
      packageManifestId = insertPackageManifest(db, userId, preview.bundle.manifest);
      targetIds.set(`package_manifest:${preview.bundle.manifest.package_key}@${preview.bundle.manifest.version}`, packageManifestId);
      importedCount += 1;
    }

    for (const template of preview.bundle.contents.template_definitions) {
      const item = items.find((candidate) => candidate.object_type === 'template_definition' && candidate.object_key === template.template_key && candidate.object_version === template.version);
      if (item?.action === 'imported') {
        const id = insertTemplate(db, userId, template);
        targetIds.set(`template_definition:${template.template_key}@${template.version}`, id);
        importedCount += 1;
      }
    }
    for (const composition of preview.bundle.contents.composition_templates) {
      const item = items.find((candidate) => candidate.object_type === 'composition_template' && candidate.object_key === composition.composition_key && candidate.object_version === composition.version);
      if (item?.action === 'imported') {
        const id = insertComposition(db, userId, composition);
        targetIds.set(`composition_template:${composition.composition_key}@${composition.version}`, id);
        importedCount += 1;
      }
    }
    for (const domain of preview.bundle.contents.domain_block_sets) {
      const item = items.find((candidate) => candidate.object_type === 'domain_block_set' && candidate.object_key === domain.domain_key && candidate.object_version === domain.version);
      if (item?.action === 'imported') {
        const id = insertDomain(db, userId, domain, packageManifestId);
        targetIds.set(`domain_block_set:${domain.domain_key}@${domain.version}`, id);
        importedCount += 1;
      }
    }

    const insertTemplateMember = db.prepare(`
      INSERT OR IGNORE INTO domain_block_set_templates (
        id, user_id, domain_block_set_id, template_definition_id, template_key,
        template_version, member_role, required, order_index, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    for (const membership of preview.bundle.contents.domain_template_memberships) {
      const domainId = targetIds.get(`domain_block_set:${membership.domain_key}@${membership.domain_version}`)
        || existingDomain(db, userId, String(membership.domain_key), String(membership.domain_version))?.id;
      const templateId = targetIds.get(`template_definition:${membership.template_key}@${membership.template_version}`)
        || existingTemplate(db, userId, String(membership.template_key), String(membership.template_version))?.id;
      if (!domainId || !templateId) continue;
      const result = insertTemplateMember.run(
        uuidv4(),
        userId,
        domainId,
        templateId,
        membership.template_key,
        membership.template_version,
        membership.member_role || 'member',
        membership.required === false ? 0 : 1,
        Number(membership.order_index || 0),
        stringifyJson({ ...(membership.metadata || {}), imported_from_package: true }),
      );
      if (result.changes > 0) importedCount += 1;
    }

    const insertCompositionMember = db.prepare(`
      INSERT OR IGNORE INTO domain_block_set_compositions (
        id, user_id, domain_block_set_id, composition_template_id, composition_key,
        composition_version, member_role, required, order_index, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    for (const membership of preview.bundle.contents.domain_composition_memberships) {
      const domainId = targetIds.get(`domain_block_set:${membership.domain_key}@${membership.domain_version}`)
        || existingDomain(db, userId, String(membership.domain_key), String(membership.domain_version))?.id;
      const compositionId = targetIds.get(`composition_template:${membership.composition_key}@${membership.composition_version}`)
        || existingComposition(db, userId, String(membership.composition_key), String(membership.composition_version))?.id;
      if (!domainId || !compositionId) continue;
      const result = insertCompositionMember.run(
        uuidv4(),
        userId,
        domainId,
        compositionId,
        membership.composition_key,
        membership.composition_version,
        membership.member_role || 'member',
        membership.required === false ? 0 : 1,
        Number(membership.order_index || 0),
        stringifyJson({ ...(membership.metadata || {}), imported_from_package: true }),
      );
      if (result.changes > 0) importedCount += 1;
    }

    db.prepare(`
      INSERT INTO package_import_records (
        id, user_id, source_preview_id, operation_batch_id, package_key, package_version,
        package_level, imported_count, resolved_existing_count, skipped_count, blocked_count,
        recovery_status, status, metadata, created_at, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?)
    `).run(
      recordId,
      userId,
      preview.id,
      operationBatchId,
      preview.package_key,
      preview.package_version,
      preview.package_level,
      importedCount,
      resolvedExistingCount,
      skippedCount,
      blockedCount,
      skippedCount > 0 ? 'partial_recovery_metadata' : 'complete',
      stringifyJson({ graph_native_candidate: 'package_import_operation_node' }),
      now,
      now,
    );

    const insertItem = db.prepare(`
      INSERT INTO package_import_record_items (
        id, user_id, package_import_record_id, object_type, object_key, object_version,
        target_id, action, status, warnings, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const item of items) {
      const targetId = item.target_id || targetIds.get(`${item.object_type}:${item.object_key}@${item.object_version}`) || null;
      insertItem.run(
        uuidv4(),
        userId,
        recordId,
        item.object_type,
        item.object_key,
        item.object_version,
        targetId,
        item.action,
        item.action === 'blocked' ? 'blocked' : 'applied',
        stringifyJson(item.warnings || []),
        stringifyJson({
          incoming_hash: item.incoming_hash || null,
          existing_hash: item.existing_hash || null,
          graph_native_evidence: 'package_import_record_item',
        }),
      );
    }

    db.prepare(`
      UPDATE package_import_previews
      SET status = 'applied', updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(now, preview.id, userId);
  });
  run();

  return {
    message: 'Package import applied',
    package_import_record_id: recordId,
    operation_batch_id: operationBatchId,
    imported_count: importedCount,
    resolved_existing_count: resolvedExistingCount,
    skipped_count: skippedCount,
    blocked_count: blockedCount,
    recovery_status: skippedCount > 0 ? 'partial_recovery_metadata' : 'complete',
  };
}

export function discardPackageImportPreview(db: Database.Database, userId: string, previewId: string): PackageImportPreview {
  const preview = getPackageImportPreview(db, userId, previewId);
  if (preview.status !== 'preview') return preview;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE package_import_previews
    SET status = 'discarded', updated_at = ?, discarded_at = ?
    WHERE id = ? AND user_id = ?
  `).run(now, now, previewId, userId);
  return getPackageImportPreview(db, userId, previewId);
}
