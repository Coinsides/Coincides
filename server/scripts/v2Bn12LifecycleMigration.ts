import Database from 'better-sqlite3';
import { assertCanvasPlacementWriteAllowed } from '../src/services/canvasWritePolicy.js';
import * as sqliteVec from 'sqlite-vec';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as canvasSurfaceAuthorityNamespace from '../../shared/types/canvasSurfaceAuthority.ts';

type SurfaceClassifier = typeof import('../../shared/types/canvasSurfaceAuthority.ts')['classifyCanvasSurfaceAuthority'];
const surfaceAuthorityModule = canvasSurfaceAuthorityNamespace as unknown as {
  classifyCanvasSurfaceAuthority?: SurfaceClassifier;
  default?: { classifyCanvasSurfaceAuthority?: SurfaceClassifier };
};
const classifyCanvasSurfaceAuthority = surfaceAuthorityModule.classifyCanvasSurfaceAuthority
  ?? surfaceAuthorityModule.default?.classifyCanvasSurfaceAuthority;
if (!classifyCanvasSurfaceAuthority) {
  throw new Error('Shared canvas surface authority classifier is unavailable');
}

type JsonRecord = Record<string, unknown>;

interface CliOptions {
  mode: 'dry-run' | 'apply';
  dbPath: string;
  receiptPath: string;
  expectPlan: string | null;
}

interface BlockRow {
  id: string;
  block_type: string;
  title: string | null;
  content_json: string;
  plain_text: string | null;
  status: string;
  source_kind: string;
  metadata: string;
  operation_batch_id: string | null;
  created_at: string;
  updated_at: string;
  trashed_at: string | null;
}

interface NotePlacementRow {
  id: string;
  note_id: string;
  block_id: string;
  parent_placement_id: string | null;
  display_mode: string;
  display_overrides_json: string;
}

interface ProjectionBundleRow {
  mount_id: string;
  mount_note_id: string;
  target_kind: string;
  target_id: string;
  projection_mode: string;
  sync_policy: string;
  mount_metadata: string;
  object_id: string;
  object_note_id: string;
  object_kind: string;
  object_backing: string;
  object_class: string;
  object_status: string;
  object_source_json: string | null;
  object_metadata: string;
  canvas_placement_id: string | null;
  canvas_placement_note_id: string | null;
  canvas_placement_metadata: string | null;
}

interface OperationBatchRow {
  id: string;
  source_type: string;
  source_id: string | null;
  label: string | null;
  status: string;
  metadata: string;
  reverted_at: string | null;
  referenced_blocks: number;
}

interface ReferenceCount {
  name: string;
  count: number;
}

interface UnexpectedReference {
  table: string;
  column: string;
  entity: 'block' | 'canvas_object' | 'placement';
  count: number;
}

interface GhostDeletePlan {
  blockId: string;
  noteId: string;
  notePlacementId: string;
  canvasObjectId: string;
  canvasPlacementId: string;
  contentMountId: string;
  operationBatch: {
    id: string;
    label: string;
    sourceType: string;
    status: string;
    role: 'birth_receipt_not_edit_history';
  };
  evidence: {
    contentFingerprintSha256: string;
    createdAt: string;
    updatedAt: string;
    updatedAfterCreate: false;
    noteBlockSourceCount: number;
    annotationReferenceCount: number;
    logicalReferenceCounts: ReferenceCount[];
    unexpectedReferences: UnexpectedReference[];
  };
  deleteOrder: readonly ['canvas_objects', 'note_blocks'];
}

interface GhostSkip {
  blockId: string;
  reasons: string[];
}

interface SurfaceUpdatePlan {
  noteId: string;
  blockId: string;
  canvasObjectId: string;
  placementId: string;
  old: {
    surface: string;
    boundaryRole: string;
    frameId: string | null;
    x: number;
    width: number;
    metadata: string;
  };
  next: {
    surface: 'formal_page' | 'canvas_workspace';
    boundaryRole: 'inside' | 'crossing' | 'outside';
    frameId: string | null;
    metadata: string;
  };
  pageBoundary: {
    frameId: string;
    frameObjectId: string;
    left: number;
    right: number;
  } | null;
}

interface SurfaceScan {
  noteId: string;
  blockId: string;
  placementId: string;
  x: number;
  width: number;
  classification: 'inside' | 'crossing' | 'outside' | 'invalid_frame' | 'ambiguous_inside' | 'ambiguous_crossing';
  selectedFrameId: string | null;
  selectedFrameObjectId: string | null;
  decision: 'update' | 'covered_by_ghost_delete' | 'skip';
}

interface LogicalOrphanCheck {
  name: string;
  count: number;
}

interface MigrationPlan {
  version: 'v2bn12-03-d4-v2';
  safeToApply: boolean;
  ghostDeletes: GhostDeletePlan[];
  ghostSkips: GhostSkip[];
  surfaceUpdates: SurfaceUpdatePlan[];
  surfaceScans: SurfaceScan[];
  preflight: {
    foreignKeyViolations: JsonRecord[];
    logicalOrphans: LogicalOrphanCheck[];
    quickCheck: string[];
    integrityCheck: string[];
  };
}

interface BackupReceipt {
  path: string;
  bytes: number;
  sha256: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(SCRIPT_DIR, '..');
const REPO_DIR = resolve(SERVER_DIR, '..');
const PLAN_VERSION = 'v2bn12-03-d4-v2' as const;

const REQUIRED_SCHEMA: Record<string, readonly string[]> = {
  annotation_ranges: ['block_id', 'text_flow_id', 'text_unit_id', 'canvas_object_id'],
  canvas_objects: ['id', 'note_id', 'kind', 'backing', 'object_class', 'status', 'source_json', 'metadata'],
  canvas_placements: ['id', 'note_id', 'object_id', 'x', 'width', 'frame_id', 'surface', 'boundary_role', 'metadata'],
  canvas_nodes: ['target_id', 'note_block_id'],
  composition_instance_slots: ['note_block_id'],
  content_group_members: ['kind', 'target_id'],
  content_mounts: [
    'id', 'note_id', 'object_id', 'target_kind', 'target_id',
    'projection_mode', 'sync_policy', 'metadata',
  ],
  db_migrations: ['id', 'description', 'applied_at'],
  domain_object_classifications: ['target_type', 'target_id'],
  domain_refinement_record_items: ['object_type', 'object_id'],
  item_anchors: ['target_kind', 'target_id'],
  note_block_placements: [
    'id', 'note_id', 'block_id', 'parent_placement_id', 'display_mode', 'display_overrides_json',
  ],
  note_block_sources: ['block_id'],
  note_blocks: [
    'id', 'block_type', 'title', 'content_json', 'plain_text', 'status', 'source_kind',
    'metadata', 'operation_batch_id', 'created_at', 'updated_at', 'trashed_at',
  ],
  operation_batches: ['id', 'source_type', 'source_id', 'label', 'status', 'metadata', 'reverted_at'],
  package_import_record_items: ['object_type', 'target_id'],
  page_frame_extensions: ['frame_id', 'note_id', 'object_id', 'content_inset_json'],
  reconciliation_recovery_events: ['target_type', 'target_id'],
  source_anchor_links: ['target_type', 'target_id'],
  source_board_nodes: ['target_id', 'note_block_id'],
  study_activity_log: ['entity_type', 'entity_id'],
  template_migration_record_items: ['note_block_id'],
};

const LOGICAL_ORPHAN_QUERIES: ReadonlyArray<{ name: string; sql: string }> = [
  {
    name: 'annotation_ranges.block_id',
    sql: `SELECT COUNT(*) AS count FROM annotation_ranges r
          WHERE r.block_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = r.block_id)`,
  },
  {
    name: 'annotation_ranges.canvas_object_id',
    sql: `SELECT COUNT(*) AS count FROM annotation_ranges r
          WHERE r.canvas_object_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM canvas_objects o WHERE o.id = r.canvas_object_id)`,
  },
  {
    name: 'content_mounts.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM content_mounts m
          WHERE m.target_kind = 'note_block'
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = m.target_id)`,
  },
  {
    name: 'content_group_members.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM content_group_members m
          WHERE lower(m.kind) IN ('note_block', 'block') AND m.target_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = m.target_id)`,
  },
  {
    name: 'item_anchors.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM item_anchors a
          WHERE lower(a.target_kind) IN ('note_block', 'block')
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = a.target_id)`,
  },
  {
    name: 'source_anchor_links.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM source_anchor_links l
          WHERE lower(l.target_type) IN ('note_block', 'block')
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = l.target_id)`,
  },
  {
    name: 'domain_object_classifications.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM domain_object_classifications c
          WHERE lower(c.target_type) IN ('note_block', 'block')
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = c.target_id)`,
  },
  {
    name: 'domain_refinement_record_items.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM domain_refinement_record_items i
          WHERE lower(i.object_type) IN ('note_block', 'block') AND i.object_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = i.object_id)`,
  },
  {
    name: 'package_import_record_items.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM package_import_record_items i
          WHERE lower(i.object_type) IN ('note_block', 'block') AND i.target_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = i.target_id)`,
  },
  {
    name: 'study_activity_log.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM study_activity_log l
          WHERE lower(l.entity_type) IN ('note_block', 'block') AND l.entity_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = l.entity_id)`,
  },
  {
    name: 'reconciliation_recovery_events.note_block_target',
    sql: `SELECT COUNT(*) AS count FROM reconciliation_recovery_events e
          WHERE lower(e.target_type) IN ('note_block', 'block')
            AND NOT EXISTS (SELECT 1 FROM note_blocks b WHERE b.id = e.target_id)`,
  },
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  const result: JsonRecord = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) result[key] = canonicalize(value[key]);
  }
  return result;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value), null, 2) + '\n';
}

function canonicalCompactJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function tableColumns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all() as Array<{ name: string }>)
    .map((row) => row.name);
}

function assertRequiredSchema(db: Database.Database): void {
  for (const [table, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
    const columns = new Set(tableColumns(db, table));
    if (columns.size === 0) throw new Error(`Required table is missing: ${table}`);
    for (const column of requiredColumns) {
      if (!columns.has(column)) throw new Error(`Required column is missing: ${table}.${column}`);
    }
  }
}

function count(db: Database.Database, sql: string, ...params: unknown[]): number {
  return Number((db.prepare(sql).get(...params) as { count: number }).count);
}

export function canonicalImmediateEmptyTextUnit(content: unknown): { matches: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!isRecord(content)) return { matches: false, reasons: ['invalid_content_json'] };
  if (Object.keys(content).sort().join(',') !== 'body,text_flow') reasons.push('noncanonical_content_keys');
  if (typeof content.body !== 'string' || content.body.trim() !== '') reasons.push('meaningful_body');

  const flow = content.text_flow;
  if (!isRecord(flow)) return { matches: false, reasons: [...reasons, 'missing_text_flow'] };
  if (Object.keys(flow).sort().join(',') !== 'inline_structures,metadata,textflow_version,units') {
    reasons.push('noncanonical_text_flow_keys');
  }
  if (flow.textflow_version !== 'TextBlockContentV1') reasons.push('unexpected_text_flow_version');
  if (!Array.isArray(flow.inline_structures) || flow.inline_structures.length !== 0) {
    reasons.push('inline_structures_present');
  }
  if (!isRecord(flow.metadata) || Object.keys(flow.metadata).sort().join(',') !== 'creation_mode'
      || flow.metadata.creation_mode !== 'immediate_text_unit') {
    reasons.push('not_immediate_text_unit');
  }
  if (!Array.isArray(flow.units) || flow.units.length !== 1) {
    reasons.push('noncanonical_text_unit_count');
  } else {
    const unit = flow.units[0];
    if (!isRecord(unit)) {
      reasons.push('invalid_text_unit');
    } else {
      const expectedKeys = 'id,indent_level,metadata,order_index,status,text,writing_role';
      if (Object.keys(unit).sort().join(',') !== expectedKeys) reasons.push('noncanonical_text_unit_keys');
      if (unit.id !== 'tu-1' || unit.text !== '' || unit.writing_role !== 'paragraph'
          || unit.indent_level !== 0 || unit.order_index !== 0 || unit.status !== 'active'
          || !isRecord(unit.metadata) || Object.keys(unit.metadata).length !== 0) {
        reasons.push('noncanonical_empty_text_unit');
      }
    }
  }
  return { matches: reasons.length === 0, reasons };
}

export function canonicalParagraphTemplateMetadata(metadata: unknown): boolean {
  if (!isRecord(metadata)) return false;
  const expectedKeys = [
    'learning_role',
    'system_type',
    'taxonomy_version',
    'template_definition_id',
    'template_id',
    'template_key',
    'template_resolution_status',
    'template_version',
  ];
  if (Object.keys(metadata).sort().join(',') !== expectedKeys.join(',')) return false;
  return typeof metadata.template_definition_id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(metadata.template_definition_id)
    && metadata.template_key === 'text.paragraph'
    && metadata.template_id === 'text.paragraph'
    && metadata.template_version === '1.0.0'
    && metadata.system_type === 'text'
    && metadata.learning_role === 'note'
    && metadata.template_resolution_status === 'runtime_resolved'
    && metadata.taxonomy_version === 'v2.5.0';
}

function isEmptyJsonObject(value: string | null): boolean {
  const parsed = parseJson(value);
  return isRecord(parsed) && Object.keys(parsed).length === 0;
}

function isCanonicalLegacyPlacementMetadata(value: string | null): boolean {
  const metadata = parseJson(value);
  if (!isRecord(metadata) || Object.keys(metadata).join(',') !== 'layout_policy') return false;
  const policy = metadata.layout_policy;
  return isRecord(policy)
    && Object.keys(policy).sort().join(',') === 'ai_visibility,export_role,width_mode'
    && policy.ai_visibility === null
    && policy.export_role === null
    && policy.width_mode === null;
}

function logicalReferenceCounts(
  db: Database.Database,
  blockId: string,
  noteId: string,
  canvasObjectId: string,
): ReferenceCount[] {
  const textFlowId = `textflow-${blockId}`;
  const checks: Array<[string, string, unknown[]]> = [
    ['note_block_sources', 'SELECT COUNT(*) AS count FROM note_block_sources WHERE block_id = ?', [blockId]],
    [
      'annotation_ranges',
      `SELECT COUNT(*) AS count FROM annotation_ranges
       WHERE note_id = ? AND (
         block_id = ? OR text_flow_id = ? OR canvas_object_id = ?
         OR (block_id IS NULL AND text_flow_id IS NULL AND text_unit_id = 'tu-1')
       )`,
      [noteId, blockId, textFlowId, canvasObjectId],
    ],
    ['template_migration_record_items', 'SELECT COUNT(*) AS count FROM template_migration_record_items WHERE note_block_id = ?', [blockId]],
    ['reconciliation_recovery_events', 'SELECT COUNT(*) AS count FROM reconciliation_recovery_events WHERE target_id IN (?, ?)', [blockId, canvasObjectId]],
    ['composition_instance_slots', 'SELECT COUNT(*) AS count FROM composition_instance_slots WHERE note_block_id = ?', [blockId]],
    ['canvas_nodes', 'SELECT COUNT(*) AS count FROM canvas_nodes WHERE note_block_id = ? OR target_id IN (?, ?)', [blockId, blockId, canvasObjectId]],
    ['source_board_nodes', 'SELECT COUNT(*) AS count FROM source_board_nodes WHERE note_block_id = ? OR target_id IN (?, ?)', [blockId, blockId, canvasObjectId]],
    ['content_group_members', 'SELECT COUNT(*) AS count FROM content_group_members WHERE target_id IN (?, ?)', [blockId, canvasObjectId]],
    ['item_anchors', 'SELECT COUNT(*) AS count FROM item_anchors WHERE target_id IN (?, ?)', [blockId, canvasObjectId]],
    ['source_anchor_links', 'SELECT COUNT(*) AS count FROM source_anchor_links WHERE target_id IN (?, ?)', [blockId, canvasObjectId]],
    ['domain_object_classifications', 'SELECT COUNT(*) AS count FROM domain_object_classifications WHERE target_id IN (?, ?)', [blockId, canvasObjectId]],
    ['domain_refinement_record_items', 'SELECT COUNT(*) AS count FROM domain_refinement_record_items WHERE object_id IN (?, ?)', [blockId, canvasObjectId]],
    ['package_import_record_items', 'SELECT COUNT(*) AS count FROM package_import_record_items WHERE target_id IN (?, ?)', [blockId, canvasObjectId]],
    ['study_activity_log', 'SELECT COUNT(*) AS count FROM study_activity_log WHERE entity_id IN (?, ?)', [blockId, canvasObjectId]],
  ];
  return checks.map(([name, sql, params]) => ({ name, count: count(db, sql, ...params) }));
}

function unexpectedReferences(
  db: Database.Database,
  blockId: string,
  canvasObjectId: string,
  placementId: string,
): UnexpectedReference[] {
  const tableRows = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string }>;
  const targets = [
    { entity: 'block' as const, value: blockId },
    { entity: 'canvas_object' as const, value: canvasObjectId },
    { entity: 'placement' as const, value: placementId },
  ];
  const allowed = new Set([
    `note_block_placements|block_id|block`,
    `content_mounts|target_id|block`,
    `canvas_placements|object_id|canvas_object`,
    `content_mounts|object_id|canvas_object`,
  ]);
  const results: UnexpectedReference[] = [];
  for (const { name: table } of tableRows) {
    for (const column of tableColumns(db, table)) {
      if (!(
        column === 'target_id'
        || column === 'entity_id'
        || column === 'source_id'
        || /_(?:block|object|placement)_id$/.test(column)
      )) continue;
      for (const target of targets) {
        if (allowed.has(`${table}|${column}|${target.entity}`)) continue;
        const quotedTable = `"${table.replaceAll('"', '""')}"`;
        const quotedColumn = `"${column.replaceAll('"', '""')}"`;
        const matches = count(db, `SELECT COUNT(*) AS count FROM ${quotedTable} WHERE ${quotedColumn} = ?`, target.value);
        if (matches > 0) results.push({ table, column, entity: target.entity, count: matches });
      }
    }
  }
  return results.sort((a, b) => `${a.table}.${a.column}.${a.entity}`.localeCompare(`${b.table}.${b.column}.${b.entity}`));
}

function inspectGhost(db: Database.Database, block: BlockRow): GhostDeletePlan | GhostSkip {
  const reasons: string[] = [];
  if (block.block_type !== 'paragraph') reasons.push('not_paragraph');
  if ((block.title ?? '').trim() !== '') reasons.push('meaningful_title');
  if ((block.plain_text ?? '').trim() !== '') reasons.push('meaningful_plain_text');
  if (block.status !== 'active' || block.trashed_at !== null) reasons.push('not_active');
  if (block.source_kind !== 'manual') reasons.push('non_manual_source_kind');
  if (block.updated_at !== block.created_at) reasons.push('unprovable_content_history');

  const content = parseJson(block.content_json);
  const canonicalContent = canonicalImmediateEmptyTextUnit(content);
  reasons.push(...canonicalContent.reasons);
  const metadata = parseJson(block.metadata);
  if (!canonicalParagraphTemplateMetadata(metadata)) reasons.push('noncanonical_block_metadata');

  const placements = db.prepare(`
    SELECT id, note_id, block_id, parent_placement_id, display_mode, display_overrides_json
    FROM note_block_placements WHERE block_id = ? ORDER BY id
  `).all(block.id) as NotePlacementRow[];
  if (placements.length !== 1) reasons.push(`note_placement_count:${placements.length}`);
  const noteId = placements[0]?.note_id ?? '';
  const placementId = placements[0]?.id ?? '';
  if (placements[0] && (placements[0].parent_placement_id !== null
      || placements[0].display_mode !== 'default'
      || !isEmptyJsonObject(placements[0].display_overrides_json))) {
    reasons.push('noncanonical_note_placement');
  }

  const bundles = db.prepare(`
    SELECT
      cm.id AS mount_id,
      cm.note_id AS mount_note_id,
      cm.target_kind,
      cm.target_id,
      cm.projection_mode,
      cm.sync_policy,
      cm.metadata AS mount_metadata,
      co.id AS object_id,
      co.note_id AS object_note_id,
      co.kind AS object_kind,
      co.backing AS object_backing,
      co.object_class AS object_class,
      co.status AS object_status,
      co.source_json AS object_source_json,
      co.metadata AS object_metadata,
      cp.id AS canvas_placement_id,
      cp.note_id AS canvas_placement_note_id,
      cp.metadata AS canvas_placement_metadata
    FROM content_mounts cm
    JOIN canvas_objects co ON co.id = cm.object_id
    LEFT JOIN canvas_placements cp ON cp.object_id = co.id
    WHERE cm.target_kind = 'note_block' AND cm.target_id = ?
    ORDER BY cm.id, cp.id
  `).all(block.id) as ProjectionBundleRow[];
  if (bundles.length !== 1) reasons.push(`projection_bundle_count:${bundles.length}`);
  const bundle = bundles[0];
  if (bundle) {
    if (bundle.mount_note_id !== noteId || bundle.object_note_id !== noteId
        || bundle.canvas_placement_note_id !== noteId) reasons.push('projection_note_mismatch');
    if (bundle.object_kind !== 'paragraph_block_projection' || bundle.object_backing !== 'note_block'
        || bundle.object_class !== 'block_backed' || bundle.object_status !== 'active') {
      reasons.push('noncanonical_projection_object');
    }
    if (bundle.projection_mode !== 'owned' || bundle.sync_policy !== 'manual') {
      reasons.push('noncanonical_content_mount');
    }
    const mountMetadata = parseJson(bundle.mount_metadata);
    const objectMetadata = parseJson(bundle.object_metadata);
    if (!isRecord(mountMetadata) || Object.keys(mountMetadata).join(',') !== 'source'
        || mountMetadata.source !== 'note_block_layout'
        || !isRecord(objectMetadata) || Object.keys(objectMetadata).length !== 0) {
      reasons.push('projection_metadata_present');
    }
    const objectSource = parseJson(bundle.object_source_json);
    if (!isRecord(objectSource) || Object.keys(objectSource).join(',') !== 'source'
        || objectSource.source !== 'note_block_layout') {
      reasons.push('unexpected_projection_source');
    }
    if (!bundle.canvas_placement_id) reasons.push('missing_canvas_placement');
    if (!isCanonicalLegacyPlacementMetadata(bundle.canvas_placement_metadata)) {
      reasons.push('noncanonical_canvas_placement_metadata');
    }
    const objectMountCount = count(db, 'SELECT COUNT(*) AS count FROM content_mounts WHERE object_id = ?', bundle.object_id);
    if (objectMountCount !== 1) reasons.push(`canvas_object_mount_count:${objectMountCount}`);
  }
  const blockTargetMountCount = count(db, 'SELECT COUNT(*) AS count FROM content_mounts WHERE target_id = ?', block.id);
  if (blockTargetMountCount !== 1) reasons.push(`block_target_mount_count:${blockTargetMountCount}`);

  const batch = block.operation_batch_id
    ? db.prepare(`
        SELECT ob.id, ob.source_type, ob.source_id, ob.label, ob.status, ob.metadata, ob.reverted_at,
               (SELECT COUNT(*) FROM note_blocks b2 WHERE b2.operation_batch_id = ob.id) AS referenced_blocks
        FROM operation_batches ob WHERE ob.id = ?
      `).get(block.operation_batch_id) as OperationBatchRow | undefined
    : undefined;
  if (!batch) {
    reasons.push('missing_birth_receipt');
  } else if (batch.source_type !== 'manual' || batch.source_id !== null
      || batch.label !== `Create ${block.block_type} block` || batch.status !== 'applied'
      || !isEmptyJsonObject(batch.metadata) || batch.reverted_at !== null
      || batch.referenced_blocks !== 1) {
    reasons.push('noncanonical_birth_receipt');
  }

  const canvasObjectId = bundle?.object_id ?? '';
  const refs = noteId && canvasObjectId
    ? logicalReferenceCounts(db, block.id, noteId, canvasObjectId)
    : [];
  if (refs.some((entry) => entry.count !== 0)) reasons.push('source_annotation_or_history_reference_present');
  const unexpected = canvasObjectId && placementId
    ? unexpectedReferences(db, block.id, canvasObjectId, placementId)
    : [];
  if (unexpected.length > 0) reasons.push('unexpected_logical_reference_present');

  const uniqueReasons = [...new Set(reasons)].sort();
  if (uniqueReasons.length > 0 || !bundle || !batch || !noteId || !placementId || !bundle.canvas_placement_id) {
    return { blockId: block.id, reasons: uniqueReasons.length ? uniqueReasons : ['incomplete_delete_identity'] };
  }

  const noteBlockSourceCount = refs.find((entry) => entry.name === 'note_block_sources')?.count ?? -1;
  const annotationReferenceCount = refs.find((entry) => entry.name === 'annotation_ranges')?.count ?? -1;
  return {
    blockId: block.id,
    noteId,
    notePlacementId: placementId,
    canvasObjectId,
    canvasPlacementId: bundle.canvas_placement_id,
    contentMountId: bundle.mount_id,
    operationBatch: {
      id: batch.id,
      label: batch.label!,
      sourceType: batch.source_type,
      status: batch.status,
      role: 'birth_receipt_not_edit_history',
    },
    evidence: {
      contentFingerprintSha256: sha256Text(canonicalCompactJson(content)),
      createdAt: block.created_at,
      updatedAt: block.updated_at,
      updatedAfterCreate: false,
      noteBlockSourceCount,
      annotationReferenceCount,
      logicalReferenceCounts: refs,
      unexpectedReferences: unexpected,
    },
    deleteOrder: ['canvas_objects', 'note_blocks'],
  };
}

interface ProjectionPlacementRow {
  note_id: string;
  block_id: string;
  object_id: string;
  placement_id: string;
  x: number;
  width: number;
  surface: string;
  boundary_role: string;
  frame_id: string | null;
  metadata: string;
}

interface PageFrameRow {
  frame_id: string | null;
  frame_object_id: string;
  x: number;
  width: number;
  content_inset_json: string | null;
}

export function planSurfaceUpdates(db: Database.Database, ghostIds: Set<string>): {
  updates: SurfaceUpdatePlan[];
  scans: SurfaceScan[];
} {
  const rows = db.prepare(`
    SELECT
      cp.note_id,
      b.id AS block_id,
      co.id AS object_id,
      cp.id AS placement_id,
      cp.x,
      cp.width,
      cp.surface,
      cp.boundary_role,
      cp.frame_id,
      cp.metadata
    FROM canvas_placements cp
    JOIN canvas_objects co
      ON co.id = cp.object_id AND co.note_id = cp.note_id
    JOIN content_mounts cm
      ON cm.object_id = co.id AND cm.note_id = cp.note_id
      AND cm.target_kind = 'note_block'
    JOIN note_blocks b ON b.id = cm.target_id
    WHERE cp.surface IN ('canvas_workspace', 'formal_page')
      AND co.kind = 'paragraph_block_projection'
      AND co.status = 'active'
      AND b.status = 'active'
    ORDER BY cp.note_id, cp.id
  `).all() as ProjectionPlacementRow[];
  const frameStatement = db.prepare(`
    SELECT
      COALESCE(pfe.frame_id, cp.frame_id) AS frame_id,
      co.id AS frame_object_id,
      cp.x,
      cp.width,
      pfe.content_inset_json
    FROM canvas_objects co
    JOIN canvas_placements cp
      ON cp.object_id = co.id AND cp.note_id = co.note_id
    LEFT JOIN page_frame_extensions pfe
      ON pfe.object_id = co.id AND pfe.note_id = co.note_id
    WHERE co.note_id = ? AND co.kind = 'page_frame' AND co.status = 'active'
    ORDER BY co.id, cp.id
  `);
  const updates: SurfaceUpdatePlan[] = [];
  const scans: SurfaceScan[] = [];
  for (const row of rows) {
    const storedMetadata = parseJson(row.metadata);
    const storedLayoutPolicy = isRecord(storedMetadata?.layout_policy)
      ? storedMetadata.layout_policy
      : null;
    const isCanvasWorldReceipt = storedLayoutPolicy?.coordinate_space === 'canvas_world';
    if (row.surface !== 'canvas_workspace' && !isCanvasWorldReceipt) continue;

    const frames = frameStatement.all(row.note_id) as PageFrameRow[];
    const classified = frames.flatMap((frame) => {
      const inset = parseJson(frame.content_inset_json);
      const leftInset = isRecord(inset) && typeof inset.left === 'number' && Number.isFinite(inset.left)
        ? inset.left : null;
      const rightInset = isRecord(inset) && typeof inset.right === 'number' && Number.isFinite(inset.right)
        ? inset.right : null;
      if (!frame.frame_id || !Number.isFinite(frame.x) || !Number.isFinite(frame.width)
          || leftInset === null || rightInset === null) return [];
      const left = frame.x + leftInset;
      const right = frame.x + frame.width - rightInset;
      if (!(right > left)) return [];
      return [{
        frame,
        left,
        right,
        result: classifyCanvasSurfaceAuthority({
          coordinateSpace: 'canvas_world',
          box: { x: row.x, width: row.width },
          pageBoundary: { left, right, frameId: frame.frame_id },
        }),
      }];
    });
    const inside = classified.filter((entry) => entry.result.boundaryRole === 'inside');
    const crossing = classified.filter((entry) => entry.result.boundaryRole === 'crossing');
    const selectedInside = inside.length === 1 ? inside[0] : null;
    const selectedCrossing = inside.length === 0 && crossing.length === 1 ? crossing[0] : null;
    const selected = selectedInside ?? selectedCrossing;
    const classification: SurfaceScan['classification'] = inside.length > 1
      ? 'ambiguous_inside'
      : selectedInside
        ? 'inside'
        : crossing.length > 1
          ? 'ambiguous_crossing'
          : selectedCrossing
          ? 'crossing'
          : classified.length > 0
            ? 'outside'
            : 'invalid_frame';
    const metadata = isRecord(storedMetadata) ? storedMetadata : {};
    const oldLayoutPolicy = isRecord(metadata.layout_policy) ? metadata.layout_policy : {};
    const nextMetadata = canonicalCompactJson({
      ...metadata,
      layout_policy: {
        ...oldLayoutPolicy,
        coordinate_space: 'canvas_world',
      },
    });
    const desired = selected
      ? selected.result
      : classification === 'outside'
        ? { surface: 'canvas_workspace' as const, boundaryRole: 'outside' as const, frameId: null }
        : {
            surface: row.surface as 'formal_page' | 'canvas_workspace',
            boundaryRole: row.boundary_role as 'inside' | 'crossing' | 'outside',
            frameId: row.frame_id,
          };
    const alreadyDesired = row.surface === desired.surface
      && row.boundary_role === desired.boundaryRole
      && row.frame_id === desired.frameId
      && row.metadata === nextMetadata;
    const covered = ghostIds.has(row.block_id);
    const decision: SurfaceScan['decision'] = covered
      ? 'covered_by_ghost_delete'
      : classification !== 'invalid_frame' && !alreadyDesired
        ? 'update'
        : 'skip';
    scans.push({
      noteId: row.note_id,
      blockId: row.block_id,
      placementId: row.placement_id,
      x: row.x,
      width: row.width,
      classification,
      selectedFrameId: selected?.frame.frame_id ?? null,
      selectedFrameObjectId: selected?.frame.frame_object_id ?? null,
      decision,
    });
    if (decision === 'update') {
      updates.push({
        noteId: row.note_id,
        blockId: row.block_id,
        canvasObjectId: row.object_id,
        placementId: row.placement_id,
        old: {
          surface: row.surface,
          boundaryRole: row.boundary_role,
          frameId: row.frame_id,
          x: row.x,
          width: row.width,
          metadata: row.metadata,
        },
        next: {
          surface: desired.surface,
          boundaryRole: desired.boundaryRole,
          frameId: desired.frameId,
          metadata: nextMetadata,
        },
        pageBoundary: selected
          ? {
              frameId: selected.frame.frame_id!,
              frameObjectId: selected.frame.frame_object_id,
              left: selected.left,
              right: selected.right,
            }
          : null,
      });
    }
  }
  return {
    updates: updates.sort((a, b) => a.placementId.localeCompare(b.placementId)),
    scans: scans.sort((a, b) => a.placementId.localeCompare(b.placementId)),
  };
}

function foreignKeyViolations(db: Database.Database): JsonRecord[] {
  return (db.pragma('foreign_key_check') as JsonRecord[])
    .map((row) => canonicalize(row) as JsonRecord)
    .sort((a, b) => canonicalCompactJson(a).localeCompare(canonicalCompactJson(b)));
}

function logicalOrphans(db: Database.Database): LogicalOrphanCheck[] {
  return LOGICAL_ORPHAN_QUERIES.map(({ name, sql }) => ({ name, count: count(db, sql) }));
}

function pragmaCheck(db: Database.Database, pragma: 'quick_check' | 'integrity_check'): string[] {
  return (db.pragma(pragma) as JsonRecord[]).map((row) => String(Object.values(row)[0]));
}

export function buildPlan(db: Database.Database): MigrationPlan {
  assertRequiredSchema(db);
  const blocks = db.prepare(`
    SELECT id, block_type, title, content_json, plain_text, status, source_kind,
           metadata, operation_batch_id, created_at, updated_at, trashed_at
    FROM note_blocks
    WHERE status = 'active'
      AND trim(coalesce(title, '')) = ''
      AND trim(coalesce(plain_text, '')) = ''
    ORDER BY id
  `).all() as BlockRow[];
  const ghostDeletes: GhostDeletePlan[] = [];
  const ghostSkips: GhostSkip[] = [];
  for (const block of blocks) {
    const inspection = inspectGhost(db, block);
    if ('noteId' in inspection) ghostDeletes.push(inspection);
    else ghostSkips.push(inspection);
  }
  ghostDeletes.sort((a, b) => a.blockId.localeCompare(b.blockId));
  ghostSkips.sort((a, b) => a.blockId.localeCompare(b.blockId));
  const surfaces = planSurfaceUpdates(db, new Set(ghostDeletes.map((item) => item.blockId)));
  const fk = foreignKeyViolations(db);
  const orphans = logicalOrphans(db);
  const quickCheck = pragmaCheck(db, 'quick_check');
  const integrityCheck = pragmaCheck(db, 'integrity_check');
  return {
    version: PLAN_VERSION,
    safeToApply: fk.length === 0
      && orphans.every((entry) => entry.count === 0)
      && quickCheck.length === 1 && quickCheck[0] === 'ok'
      && integrityCheck.length === 1 && integrityCheck[0] === 'ok',
    ghostDeletes,
    ghostSkips,
    surfaceUpdates: surfaces.updates,
    surfaceScans: surfaces.scans,
    preflight: {
      foreignKeyViolations: fk,
      logicalOrphans: orphans,
      quickCheck,
      integrityCheck,
    },
  };
}

export function planHash(plan: MigrationPlan): string {
  return sha256Text(canonicalCompactJson(plan));
}

/** Dry-run remains a historical diagnostic; apply cannot regenerate retired values. */
export function assertRetiredSurfaceUpdatesAllowed(plan: Pick<MigrationPlan, 'surfaceUpdates'>): void {
  for (const update of plan.surfaceUpdates) {
    assertCanvasPlacementWriteAllowed({ surface: update.next.surface, boundary_role: update.next.boundaryRole });
  }
}

function applyLockedPlan(db: Database.Database, plan: MigrationPlan): {
  surfaceUpdates: number;
  canvasObjectsDeleted: number;
  noteBlocksDeleted: number;
  postflight: MigrationPlan['preflight'];
} {
  assertRetiredSurfaceUpdatesAllowed(plan);
  let surfaceUpdates = 0;
  let canvasObjectsDeleted = 0;
  let noteBlocksDeleted = 0;
  for (const update of plan.surfaceUpdates) {
    const result = db.prepare(`
      UPDATE canvas_placements
      SET surface = ?, boundary_role = ?, frame_id = ?, metadata = ?, updated_at = datetime('now')
      WHERE id = ? AND note_id = ? AND object_id = ?
        AND surface = ? AND boundary_role = ? AND frame_id IS ?
        AND x = ? AND width = ? AND metadata = ?
    `).run(
      update.next.surface,
      update.next.boundaryRole,
      update.next.frameId,
      update.next.metadata,
      update.placementId,
      update.noteId,
      update.canvasObjectId,
      update.old.surface,
      update.old.boundaryRole,
      update.old.frameId,
      update.old.x,
      update.old.width,
      update.old.metadata,
    );
    if (result.changes !== 1) throw new Error(`Surface update drifted: ${update.placementId}`);
    surfaceUpdates += result.changes;
  }
  for (const ghost of plan.ghostDeletes) {
    const objectDelete = db.prepare(`
      DELETE FROM canvas_objects
      WHERE id = ? AND note_id = ? AND kind = 'paragraph_block_projection'
        AND backing = 'note_block' AND object_class = 'block_backed' AND status = 'active'
    `).run(ghost.canvasObjectId, ghost.noteId);
    if (objectDelete.changes !== 1) throw new Error(`Canvas object delete drifted: ${ghost.canvasObjectId}`);
    canvasObjectsDeleted += objectDelete.changes;

    const blockDelete = db.prepare(`
      DELETE FROM note_blocks
      WHERE id = ? AND status = 'active' AND source_kind = 'manual'
        AND updated_at = created_at
    `).run(ghost.blockId);
    if (blockDelete.changes !== 1) throw new Error(`Note block delete drifted: ${ghost.blockId}`);
    noteBlocksDeleted += blockDelete.changes;

    const residue = count(db, `
      SELECT
        (SELECT COUNT(*) FROM note_blocks WHERE id = ?)
        + (SELECT COUNT(*) FROM note_block_placements WHERE block_id = ?)
        + (SELECT COUNT(*) FROM canvas_objects WHERE id = ?)
        + (SELECT COUNT(*) FROM canvas_placements WHERE object_id = ?)
        + (SELECT COUNT(*) FROM content_mounts WHERE object_id = ? OR (target_kind = 'note_block' AND target_id = ?))
        AS count
    `, ghost.blockId, ghost.blockId, ghost.canvasObjectId, ghost.canvasObjectId,
    ghost.canvasObjectId, ghost.blockId);
    if (residue !== 0) throw new Error(`Delete left physical residue for block: ${ghost.blockId}`);
  }
  const postflight = {
    foreignKeyViolations: foreignKeyViolations(db),
    logicalOrphans: logicalOrphans(db),
    quickCheck: pragmaCheck(db, 'quick_check'),
    integrityCheck: pragmaCheck(db, 'integrity_check'),
  };
  if (postflight.foreignKeyViolations.length > 0
      || postflight.logicalOrphans.some((entry) => entry.count !== 0)
      || postflight.quickCheck.length !== 1 || postflight.quickCheck[0] !== 'ok'
      || postflight.integrityCheck.length !== 1 || postflight.integrityCheck[0] !== 'ok') {
    throw new Error('Postflight FK/logical-orphan check failed');
  }
  return { surfaceUpdates, canvasObjectsDeleted, noteBlocksDeleted, postflight };
}

function resolveFromServer(value: string): string {
  return resolve(SERVER_DIR, value);
}

export function parseCliOptions(args: string[]): CliOptions {
  let mode: CliOptions['mode'] = 'dry-run';
  let sawDryRun = false;
  let sawApply = false;
  let dbPath = join(SERVER_DIR, 'coincides.db');
  let receiptPath: string | null = null;
  let expectPlan: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') {
      sawDryRun = true;
      mode = 'dry-run';
    } else if (arg === '--apply') {
      sawApply = true;
      mode = 'apply';
    } else if (arg === '--db' || arg === '--receipt' || arg === '--expect-plan') {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      index += 1;
      if (arg === '--db') dbPath = resolveFromServer(value);
      if (arg === '--receipt') receiptPath = resolveFromServer(value);
      if (arg === '--expect-plan') expectPlan = value.toLowerCase();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (sawDryRun && sawApply) throw new Error('Choose exactly one of --dry-run or --apply');
  if (mode === 'apply' && !expectPlan) throw new Error('--apply requires --expect-plan <sha256>');
  if (expectPlan && !/^[a-f0-9]{64}$/.test(expectPlan)) throw new Error('--expect-plan must be a 64-character SHA-256 hex digest');
  return {
    mode,
    dbPath,
    receiptPath: receiptPath ?? join(REPO_DIR, '.codex-tmp', `v2bn12-03-${mode}-receipt.json`),
    expectPlan,
  };
}

function databaseReceipt(db: Database.Database, dbPath: string): JsonRecord {
  const stats = statSync(dbPath);
  const walPath = `${dbPath}-wal`;
  const migrations = db.prepare(`
    SELECT id, description, applied_at FROM db_migrations ORDER BY id
  `).all() as JsonRecord[];
  return {
    path: dbPath,
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    journalMode: db.pragma('journal_mode', { simple: true }),
    wal: existsSync(walPath)
      ? { path: walPath, bytes: statSync(walPath).size }
      : null,
    appliedMigrations: {
      count: migrations.length,
      maxId: migrations.at(-1)?.id ?? null,
    },
  };
}

function writeReceipt(path: string, receipt: JsonRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalJson(receipt), 'utf8');
}

async function createPreApplyBackup(db: Database.Database): Promise<BackupReceipt> {
  const timestamp = new Date().toISOString().replaceAll(/[-:.]/g, '');
  const path = join(REPO_DIR, '.codex-tmp', `v2bn12-03-pre-apply-${timestamp}.db`);
  mkdirSync(dirname(path), { recursive: true });
  await db.backup(path);
  return { path, bytes: statSync(path).size, sha256: sha256File(path) };
}

async function run(options: CliOptions): Promise<void> {
  if (!existsSync(options.dbPath)) throw new Error(`Database does not exist: ${options.dbPath}`);
  const db = new Database(options.dbPath, {
    readonly: options.mode === 'dry-run',
    fileMustExist: true,
  });
  let backup: BackupReceipt | null = null;
  try {
    sqliteVec.load(db);
    if (options.mode === 'dry-run') db.pragma('query_only = ON');
    else {
      db.pragma('foreign_keys = ON');
      db.pragma('busy_timeout = 5000');
    }
    let initialPlan: MigrationPlan;
    let database: JsonRecord;
    db.exec('BEGIN');
    try {
      initialPlan = buildPlan(db);
      database = databaseReceipt(db, options.dbPath);
      db.exec('COMMIT');
    } catch (error) {
      if (db.inTransaction) db.exec('ROLLBACK');
      throw error;
    }
    const initialHash = planHash(initialPlan);

    if (options.mode === 'dry-run') {
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'dry-run',
        database,
        planSha256: initialHash,
        plan: initialPlan,
        backup: null,
        execution: { status: 'not_applied' },
      });
      printSummary(options, initialPlan, initialHash, null);
      return;
    }

    assertRetiredSurfaceUpdatesAllowed(initialPlan);
    if (initialHash !== options.expectPlan) {
      const error = `Plan hash mismatch before backup: expected ${options.expectPlan}, got ${initialHash}`;
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        database,
        planSha256: initialHash,
        plan: initialPlan,
        backup: null,
        execution: { status: 'refused', error },
      });
      throw new Error(error);
    }
    if (!initialPlan.safeToApply) {
      const error = 'Plan preflight is not safe to apply';
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        database,
        planSha256: initialHash,
        plan: initialPlan,
        backup: null,
        execution: { status: 'refused', error },
      });
      throw new Error(error);
    }
    try {
      backup = await createPreApplyBackup(db);
    } catch (error) {
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        database,
        planSha256: initialHash,
        plan: initialPlan,
        backup: null,
        execution: {
          status: 'backup_failed',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }

    try {
      db.exec('BEGIN IMMEDIATE');
    } catch (error) {
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        database,
        planSha256: initialHash,
        plan: initialPlan,
        backup,
        execution: {
          status: 'lock_failed',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
    try {
      const lockedPlan = buildPlan(db);
      const lockedHash = planHash(lockedPlan);
      if (lockedHash !== options.expectPlan) {
        throw new Error(`Plan hash mismatch inside BEGIN IMMEDIATE: expected ${options.expectPlan}, got ${lockedHash}`);
      }
      if (!lockedPlan.safeToApply) throw new Error('Locked plan preflight is not safe to apply');
      const execution = applyLockedPlan(db, lockedPlan);
      db.exec('COMMIT');
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        database,
        planSha256: lockedHash,
        plan: lockedPlan,
        backup,
        execution: { status: 'applied', ...execution },
      });
      printSummary(options, lockedPlan, lockedHash, backup);
    } catch (error) {
      if (db.inTransaction) db.exec('ROLLBACK');
      writeReceipt(options.receiptPath, {
        format: PLAN_VERSION,
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        database,
        planSha256: initialHash,
        plan: initialPlan,
        backup,
        execution: { status: 'rolled_back', error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  } finally {
    db.close();
  }
}

function printSummary(options: CliOptions, plan: MigrationPlan, hash: string, backup: BackupReceipt | null): void {
  const lines = [
    `mode=${options.mode}`,
    `db=${options.dbPath}`,
    `receipt=${options.receiptPath}`,
    `plan_sha256=${hash}`,
    `safe_to_apply=${plan.safeToApply}`,
    `ghost_deletes=${plan.ghostDeletes.length}`,
    `ghost_skips=${plan.ghostSkips.length}`,
    `surface_updates=${plan.surfaceUpdates.length}`,
    `surface_scans=${plan.surfaceScans.length}`,
  ];
  if (backup) lines.push(`backup=${backup.path}`, `backup_sha256=${backup.sha256}`);
  console.log(lines.join('\n'));
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isMainModule()) {
  run(parseCliOptions(process.argv.slice(2))).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
