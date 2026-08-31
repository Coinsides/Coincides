import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { mergeRuntimeNoteBlockTemplateMetadata } from './templateDefinitions.js';

const CLIENT_CREATE_SOURCE_TYPE = 'client_note_block_create';
const CLIENT_CREATE_CLEANUP_CONFLICT_SOURCE_TYPE = 'client_note_block_cleanup_conflict';
const LEGACY_PLACEMENT_CONFLICT_CODE = 'legacy_receipt_missing_initial_placement';

interface SourceReferenceInput {
  document_id?: string;
  document_chunk_id?: string;
  source_page_start?: number;
  source_page_end?: number;
  source_excerpt?: string;
  reference_type?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface ClientNoteBlockCreateInput {
  client_create_key: string;
  block_type: string;
  title?: string;
  content_json?: Record<string, unknown>;
  plain_text?: string;
  metadata?: Record<string, unknown>;
  display_overrides_json?: Record<string, unknown>;
  source_references?: SourceReferenceInput[];
}

interface ClientCreateReceiptMetadata {
  note_id: string;
  block_id?: string;
  placement_id?: string;
  initial_block?: {
    block_type: string;
    title: string | null;
    content_json: string;
    plain_text: string | null;
    metadata: string;
  };
  initial_placement?: {
    note_id: string;
    parent_placement_id: string | null;
    order_index: number;
    display_mode: string;
    display_overrides_json: string;
  };
  canceled_without_create?: boolean;
  discarded_at?: string;
}

interface ClientCreateCleanupConflictMetadata {
  schema_version: 'client-note-block-cleanup-conflict.v1';
  conflict_code: typeof LEGACY_PLACEMENT_CONFLICT_CODE;
  client_create_operation_batch_id: string;
  client_create_key: string;
  note_id: string;
  block_id: string;
  placement_id: string;
  detected_at: string;
}

interface OperationBatchRow {
  id: string;
  user_id: string;
  course_id: string | null;
  source_type: string;
  source_id: string | null;
  status: string;
  metadata: string;
}

interface NoteBlockRow {
  id: string;
  user_id: string;
  course_id: string;
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
  placement_id: string;
  note_id: string;
  parent_placement_id: string | null;
  order_index: number;
  display_mode: string;
  display_overrides_json: string;
  placement_created_at: string;
  placement_updated_at: string;
}

interface CanvasPlacementSideEffect {
  object_id: string;
  note_id: string;
  kind: string;
  backing: string;
  object_class: string;
}

export type CreateClientNoteBlockResult =
  | { status: 'applied'; created: boolean; block: Record<string, unknown> }
  | { status: 'canceled'; created: false; client_create_key: string };

export interface DiscardClientCreateResult {
  discarded: boolean;
  block_id: string | null;
  canceled: true;
}

interface CleanupConflictResult {
  cleanup_conflict: ClientCreateCleanupConflictMetadata;
  operation_batch_id: string;
}

interface CleanupConflictBatchRow {
  user_id: string;
  course_id: string | null;
  source_type: string;
  source_id: string | null;
  status: string;
  metadata: string;
  reverted_at: string | null;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function stripLegacyLayoutOverride(value: Record<string, unknown> | undefined): Record<string, unknown> {
  const next = { ...(value || {}) };
  delete next.better_notebook_layout;
  return next;
}

export function clientNoteBlockCreateReceiptId(
  userId: string,
  noteId: string,
  clientCreateKey: string,
): string {
  const digest = createHash('sha256')
    .update(userId)
    .update('\0')
    .update(noteId)
    .update('\0')
    .update(clientCreateKey)
    .digest('hex');
  return `client-note-block-create:${digest}`;
}

function clientNoteBlockCleanupConflictReceiptId(
  createBatchId: string,
  conflictCode: string,
): string {
  const digest = createHash('sha256')
    .update(createBatchId)
    .update('\0')
    .update(conflictCode)
    .digest('hex');
  return `client-note-block-cleanup-conflict:${digest}`;
}

function recordLegacyPlacementCleanupConflict(
  db: Database.Database,
  input: {
    userId: string;
    courseId: string;
    noteId: string;
    clientCreateKey: string;
    createBatchId: string;
    blockId: string;
    placementId: string;
    detectedAt: string;
  },
): CleanupConflictResult {
  const operationBatchId = clientNoteBlockCleanupConflictReceiptId(
    input.createBatchId,
    LEGACY_PLACEMENT_CONFLICT_CODE,
  );
  const cleanupConflict: ClientCreateCleanupConflictMetadata = {
    schema_version: 'client-note-block-cleanup-conflict.v1',
    conflict_code: LEGACY_PLACEMENT_CONFLICT_CODE,
    client_create_operation_batch_id: input.createBatchId,
    client_create_key: input.clientCreateKey,
    note_id: input.noteId,
    block_id: input.blockId,
    placement_id: input.placementId,
    detected_at: input.detectedAt,
  };
  db.prepare(`
    INSERT INTO operation_batches (
      id, user_id, course_id, source_type, source_id, label, status,
      metadata, applied_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'applied', ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(
    operationBatchId,
    input.userId,
    input.courseId,
    CLIENT_CREATE_CLEANUP_CONFLICT_SOURCE_TYPE,
    input.createBatchId,
    'Client note block cleanup conflict',
    stringifyJson(cleanupConflict, {}),
    input.detectedAt,
  );
  const persistedBatch = db.prepare(`
    SELECT user_id, course_id, source_type, source_id, status, metadata, reverted_at
    FROM operation_batches
    WHERE id = ?
  `).get(operationBatchId) as CleanupConflictBatchRow | undefined;
  if (persistedBatch) {
    assertNoteBlockLifecycleBatchSource(
      persistedBatch,
      CLIENT_CREATE_CLEANUP_CONFLICT_SOURCE_TYPE,
    );
  }
  const persistedMetadata = persistedBatch
    ? parseJson<Partial<ClientCreateCleanupConflictMetadata>>(persistedBatch.metadata, {})
    : null;
  if (
    !persistedBatch
    || persistedBatch.user_id !== input.userId
    || persistedBatch.course_id !== input.courseId
    || persistedBatch.source_type !== CLIENT_CREATE_CLEANUP_CONFLICT_SOURCE_TYPE
    || persistedBatch.source_id !== input.createBatchId
    || persistedBatch.status !== 'applied'
    || persistedBatch.reverted_at !== null
    || persistedMetadata?.schema_version !== cleanupConflict.schema_version
    || persistedMetadata.conflict_code !== cleanupConflict.conflict_code
    || persistedMetadata.client_create_operation_batch_id !== input.createBatchId
    || persistedMetadata.client_create_key !== input.clientCreateKey
    || persistedMetadata.note_id !== input.noteId
    || persistedMetadata.block_id !== input.blockId
    || persistedMetadata.placement_id !== input.placementId
    || typeof persistedMetadata.detected_at !== 'string'
  ) {
    throw new AppError(409, 'Cleanup conflict receipt identity mismatch');
  }
  return {
    cleanup_conflict: persistedMetadata as ClientCreateCleanupConflictMetadata,
    operation_batch_id: operationBatchId,
  };
}

function assertNoteBlockLifecycleBatchSource(
  batch: Pick<OperationBatchRow, 'source_type'>,
  expectedSourceType: typeof CLIENT_CREATE_SOURCE_TYPE | typeof CLIENT_CREATE_CLEANUP_CONFLICT_SOURCE_TYPE,
): void {
  if (batch.source_type === expectedSourceType) return;
  throw new AppError(409, 'Operation batch source type is not valid for note block lifecycle', {
    code: 'note_block_lifecycle_batch_source_mismatch',
    expected_source_type: expectedSourceType,
    actual_source_type: batch.source_type,
  });
}

function readBatch(
  db: Database.Database,
  batchId: string,
): OperationBatchRow | undefined {
  const batch = db.prepare(`
    SELECT id, user_id, course_id, source_type, source_id, status, metadata
    FROM operation_batches
    WHERE id = ?
  `).get(batchId) as OperationBatchRow | undefined;
  if (batch) assertNoteBlockLifecycleBatchSource(batch, CLIENT_CREATE_SOURCE_TYPE);
  return batch;
}

function assertOwnedNote(
  db: Database.Database,
  userId: string,
  noteId: string,
  courseId: string,
): void {
  const note = db.prepare(`
    SELECT id
    FROM notes
    WHERE id = ? AND user_id = ? AND course_id = ?
  `).get(noteId, userId, courseId);
  if (!note) throw new AppError(404, 'Note not found');
}

function assertReceiptIdentity(
  batch: OperationBatchRow,
  userId: string,
  noteId: string,
  clientCreateKey: string,
): ClientCreateReceiptMetadata {
  const metadata = parseJson<ClientCreateReceiptMetadata>(batch.metadata, { note_id: '' });
  if (
    batch.user_id !== userId
    || batch.source_type !== CLIENT_CREATE_SOURCE_TYPE
    || batch.source_id !== clientCreateKey
    || metadata.note_id !== noteId
  ) {
    throw new AppError(409, 'Client create receipt identity mismatch');
  }
  return metadata;
}

function readBlockForReceipt(
  db: Database.Database,
  userId: string,
  noteId: string,
  blockId: string,
  placementId: string,
): NoteBlockRow | undefined {
  return db.prepare(`
    SELECT
      nb.*,
      nbp.id AS placement_id,
      nbp.note_id,
      nbp.parent_placement_id,
      nbp.order_index,
      nbp.display_mode,
      nbp.display_overrides_json,
      nbp.created_at AS placement_created_at,
      nbp.updated_at AS placement_updated_at
    FROM note_blocks nb
    JOIN note_block_placements nbp ON nbp.block_id = nb.id
    WHERE nb.id = ?
      AND nb.user_id = ?
      AND nbp.id = ?
      AND nbp.note_id = ?
  `).get(blockId, userId, placementId, noteId) as NoteBlockRow | undefined;
}

function readHydratableBlock(
  db: Database.Database,
  row: NoteBlockRow,
): Record<string, unknown> {
  const sources = db.prepare(`
    SELECT
      id, document_id, document_chunk_id, source_page_start, source_page_end,
      source_excerpt, reference_type, confidence, metadata
    FROM note_block_sources
    WHERE block_id = ?
    ORDER BY created_at, id
  `).all(row.id);
  return {
    ...row,
    source_references: stringifyJson(sources, []),
  };
}

function validateSourceReferences(
  db: Database.Database,
  userId: string,
  courseId: string,
  refs: SourceReferenceInput[],
): void {
  for (const ref of refs) {
    if (ref.document_id) {
      const document = db.prepare(
        'SELECT id FROM documents WHERE id = ? AND user_id = ? AND course_id = ?',
      ).get(ref.document_id, userId, courseId);
      if (!document) throw new AppError(400, 'Source document not found in this course');
    }
    if (ref.document_chunk_id) {
      const chunk = db.prepare(`
        SELECT dc.id
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE dc.id = ? AND d.user_id = ? AND d.course_id = ?
      `).get(ref.document_chunk_id, userId, courseId);
      if (!chunk) throw new AppError(400, 'Source document chunk not found in this course');
    }
  }
}

export function createClientNoteBlock(
  db: Database.Database,
  userId: string,
  noteId: string,
  courseId: string,
  data: ClientNoteBlockCreateInput,
): CreateClientNoteBlockResult {
  const batchId = clientNoteBlockCreateReceiptId(userId, noteId, data.client_create_key);

  return db.transaction((): CreateClientNoteBlockResult => {
    assertOwnedNote(db, userId, noteId, courseId);
    const existingBatch = readBatch(db, batchId);
    if (existingBatch) {
      const receipt = assertReceiptIdentity(existingBatch, userId, noteId, data.client_create_key);
      if (existingBatch.status === 'reverted') {
        return {
          status: 'canceled',
          created: false,
          client_create_key: data.client_create_key,
        };
      }
      if (existingBatch.status !== 'applied' || !receipt.block_id || !receipt.placement_id) {
        throw new AppError(409, 'Client create receipt is incomplete');
      }
      const existingBlock = readBlockForReceipt(
        db,
        userId,
        noteId,
        receipt.block_id,
        receipt.placement_id,
      );
      if (!existingBlock || existingBlock.operation_batch_id !== batchId) {
        throw new AppError(409, 'Client create receipt durable target is missing');
      }
      return {
        status: 'applied',
        created: false,
        block: readHydratableBlock(db, existingBlock),
      };
    }

    const blockId = uuidv4();
    const placementId = uuidv4();
    const now = new Date().toISOString();
    const contentJson = stringifyJson(data.content_json, {});
    const title = data.title || null;
    const plainText = data.plain_text || null;
    const metadata = stringifyJson(
      mergeRuntimeNoteBlockTemplateMetadata(
        db,
        userId,
        data.metadata,
        data.block_type,
      ).metadata,
      {},
    );
    const displayOverrides = stringifyJson(stripLegacyLayoutOverride(data.display_overrides_json), {});
    const sourceReferences = data.source_references || [];
    validateSourceReferences(db, userId, courseId, sourceReferences);

    const nextOrder = (db.prepare(`
      SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
      FROM note_block_placements
      WHERE note_id = ?
    `).get(noteId) as { next_order: number }).next_order;
    const receipt: ClientCreateReceiptMetadata = {
      note_id: noteId,
      block_id: blockId,
      placement_id: placementId,
      initial_block: {
        block_type: data.block_type,
        title,
        content_json: contentJson,
        plain_text: plainText,
        metadata,
      },
      initial_placement: {
        note_id: noteId,
        parent_placement_id: null,
        order_index: nextOrder,
        display_mode: 'default',
        display_overrides_json: displayOverrides,
      },
    };

  db.prepare(`
    INSERT INTO operation_batches (
      id, user_id, course_id, source_type, source_id, label, status,
      metadata, applied_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'applied', ?, ?)
  `).run(
    batchId,
      userId,
      courseId,
      CLIENT_CREATE_SOURCE_TYPE,
      data.client_create_key,
      `Client create ${data.block_type} block`,
      stringifyJson(receipt, {}),
      now,
    );

    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, title, content_json, plain_text,
        metadata, operation_batch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      blockId,
      userId,
      courseId,
      data.block_type,
      title,
      contentJson,
      plainText,
      metadata,
      batchId,
      now,
      now,
    );

    db.prepare(`
      INSERT INTO note_block_placements (
        id, note_id, block_id, order_index, display_overrides_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(placementId, noteId, blockId, nextOrder, displayOverrides, now, now);

    for (const ref of sourceReferences) {
      db.prepare(`
        INSERT INTO note_block_sources (
          id, block_id, document_id, document_chunk_id, source_page_start,
          source_page_end, source_excerpt, reference_type, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        blockId,
        ref.document_id || null,
        ref.document_chunk_id || null,
        ref.source_page_start || null,
        ref.source_page_end || null,
        ref.source_excerpt || null,
        ref.reference_type || 'page',
        ref.confidence ?? null,
        stringifyJson(ref.metadata, {}),
      );
    }

    const createdBlock = readBlockForReceipt(db, userId, noteId, blockId, placementId);
    if (!createdBlock) throw new AppError(500, 'Created note block receipt could not be read');
    return {
      status: 'applied',
      created: true,
      block: readHydratableBlock(db, createdBlock),
    };
  })();
}

function hasMeaningfulJson(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulJson);
  if (typeof value === 'object') return Object.values(value).some(hasMeaningfulJson);
  return false;
}

function matchesReceiptPlacementSnapshot(
  block: NoteBlockRow,
  receipt: ClientCreateReceiptMetadata,
): boolean {
  const initial = receipt.initial_placement;
  if (!initial) return false;
  return block.placement_id === receipt.placement_id
    && block.note_id === initial.note_id
    && block.parent_placement_id === initial.parent_placement_id
    && block.order_index === initial.order_index
    && block.display_mode === initial.display_mode
    && block.display_overrides_json === initial.display_overrides_json;
}

function isProvenEmptyBlock(
  block: NoteBlockRow,
  receipt: ClientCreateReceiptMetadata,
): boolean {
  const initial = receipt.initial_block;
  if (
    !initial
    || block.block_type !== initial.block_type
    || block.metadata !== initial.metadata
    || !matchesReceiptPlacementSnapshot(block, receipt)
  ) return false;
  if ((block.title || '').trim() || (block.plain_text || '').trim()) return false;
  const content = parseJson<Record<string, unknown>>(block.content_json, {});
  if (typeof content.body === 'string' && content.body.trim()) return false;
  if (hasMeaningfulJson(content.field_values) || hasMeaningfulJson(content.structured_fields)) return false;
  const rawFlow = content.text_flow;
  if (rawFlow && typeof rawFlow === 'object' && !Array.isArray(rawFlow)) {
    const flow = rawFlow as Record<string, unknown>;
    if (Array.isArray(flow.units) && flow.units.some((unit) => {
      if (!unit || typeof unit !== 'object' || Array.isArray(unit)) return hasMeaningfulJson(unit);
      const text = (unit as Record<string, unknown>).text;
      return typeof text === 'string' ? text.trim().length > 0 : hasMeaningfulJson(text);
    })) return false;
    if (Array.isArray(flow.inline_structures) && flow.inline_structures.length > 0) return false;
  }
  const remaining = { ...content };
  delete remaining.body;
  delete remaining.field_values;
  delete remaining.structured_fields;
  delete remaining.text_flow;
  return !hasMeaningfulJson(remaining);
}

function isUntouchedInitialBlock(
  block: NoteBlockRow,
  receipt: ClientCreateReceiptMetadata,
): boolean {
  const initial = receipt.initial_block;
  if (!initial || block.created_at !== block.updated_at) return false;
  return block.block_type === initial.block_type
    && block.title === initial.title
    && block.content_json === initial.content_json
    && block.plain_text === initial.plain_text
    && block.metadata === initial.metadata;
}

function textAddressIds(
  block: NoteBlockRow,
  receipt: ClientCreateReceiptMetadata,
): { flowIds: string[]; unitIds: string[] } {
  const flowIds = new Set<string>([`textflow-${block.id}`]);
  const unitIds = new Set<string>();
  const contents = [
    block.content_json,
    receipt.initial_block?.content_json,
  ];
  for (const contentJson of contents) {
    const content = parseJson<Record<string, unknown>>(contentJson, {});
    const rawFlow = content.text_flow;
    const flow = rawFlow && typeof rawFlow === 'object' && !Array.isArray(rawFlow)
      ? rawFlow as Record<string, unknown>
      : null;
    if (!flow) continue;
    for (const candidate of [flow.id, flow.text_flow_id]) {
      if (typeof candidate === 'string' && candidate.trim()) flowIds.add(candidate.trim());
    }
    if (Array.isArray(flow.units)) {
      for (const unit of flow.units) {
        if (!unit || typeof unit !== 'object' || Array.isArray(unit)) continue;
        const id = (unit as Record<string, unknown>).id;
        if (typeof id === 'string' && id.trim()) unitIds.add(id.trim());
      }
    }
  }
  return { flowIds: [...flowIds], unitIds: [...unitIds] };
}

function exists(db: Database.Database, sql: string, ...params: unknown[]): boolean {
  return Boolean(db.prepare(sql).get(...params));
}

function assertReceiptPlacementIsUnique(
  db: Database.Database,
  block: NoteBlockRow,
  receipt: ClientCreateReceiptMetadata,
): void {
  const placements = db.prepare(`
    SELECT id, note_id
    FROM note_block_placements
    WHERE block_id = ?
  `).all(block.id) as Array<{ id: string; note_id: string }>;
  if (
    placements.length !== 1
    || placements[0].id !== receipt.placement_id
    || placements[0].note_id !== receipt.note_id
  ) {
    throw new AppError(409, 'Client-created block has additional placements', {
      blockers: ['additional_placement'],
    });
  }
}

function collectReferenceBlockers(
  db: Database.Database,
  userId: string,
  block: NoteBlockRow,
  receipt: ClientCreateReceiptMetadata,
  canvasObjectIds: string[],
): string[] {
  const blockers: string[] = [];
  const blockId = block.id;
  const targetIds = [blockId, ...canvasObjectIds];
  if (exists(db, 'SELECT 1 FROM note_block_sources WHERE block_id = ? LIMIT 1', blockId)) {
    blockers.push('source_reference');
  }
  const textIds = textAddressIds(block, receipt);
  const hasTextAddressAnnotation = textIds.flowIds.some((flowId) => exists(
    db,
    'SELECT 1 FROM annotation_ranges WHERE user_id = ? AND text_flow_id = ? LIMIT 1',
    userId,
    flowId,
  )) || textIds.unitIds.some((unitId) => exists(
    db,
    'SELECT 1 FROM annotation_ranges WHERE user_id = ? AND text_unit_id = ? LIMIT 1',
    userId,
    unitId,
  ));
  if (hasTextAddressAnnotation || exists(
    db,
    'SELECT 1 FROM annotation_ranges WHERE user_id = ? AND block_id = ? LIMIT 1',
    userId,
    blockId,
  )) {
    blockers.push('annotation');
  }
  if (targetIds.some((targetId) => exists(
    db,
    'SELECT 1 FROM content_group_members WHERE user_id = ? AND target_id = ? LIMIT 1',
    userId,
    targetId,
  ))) {
    blockers.push('content_group');
  }
  if (targetIds.some((targetId) => exists(
    db,
    `SELECT 1
     FROM item_anchors ia
     JOIN relations r ON r.user_id = ia.user_id
       AND (r.from_item_id = ia.item_id OR r.to_item_id = ia.item_id)
     WHERE ia.user_id = ? AND ia.target_id = ?
     LIMIT 1`,
    userId,
    targetId,
  ))) {
    blockers.push('relation');
  }
  if (targetIds.some((targetId) => exists(
    db,
    'SELECT 1 FROM item_anchors WHERE user_id = ? AND target_id = ? LIMIT 1',
    userId,
    targetId,
  ))) {
    blockers.push('item_anchor');
  }
  if (targetIds.some((targetId) => exists(
    db,
    `SELECT 1 FROM source_anchor_links
     WHERE user_id = ? AND target_id = ? LIMIT 1`,
    userId,
    targetId,
  ))) {
    blockers.push('source_anchor');
  }
  // 12.10-b 裁 4:Template Studio 已退役,历史引用不再阻止删除(保护对象已亡,枷锁不留);见 handoffs/2026-08-31-v12-10-b-*.md
  if (exists(db, 'SELECT 1 FROM source_board_nodes WHERE user_id = ? AND note_block_id = ? LIMIT 1', userId, blockId)
    || targetIds.some((targetId) => exists(
      db,
      'SELECT 1 FROM source_board_nodes WHERE user_id = ? AND target_id = ? LIMIT 1',
      userId,
      targetId,
    ))) {
    blockers.push('source_board');
  }
  if (exists(db, 'SELECT 1 FROM canvas_nodes WHERE user_id = ? AND note_block_id = ? LIMIT 1', userId, blockId)
    || targetIds.some((targetId) => exists(
      db,
      'SELECT 1 FROM canvas_nodes WHERE user_id = ? AND target_id = ? LIMIT 1',
      userId,
      targetId,
    ))) {
    blockers.push('learning_canvas');
  }
  if (targetIds.some((targetId) => exists(
    db,
    `SELECT 1 FROM reconciliation_recovery_events
     WHERE user_id = ? AND target_id = ? LIMIT 1`,
    userId,
    targetId,
  ))) {
    blockers.push('reconciliation_history');
  }
  if (targetIds.some((targetId) => exists(
    db,
    `SELECT 1 FROM study_activity_log
     WHERE user_id = ? AND entity_id = ? LIMIT 1`,
    userId,
    targetId,
  ))) {
    blockers.push('study_activity_history');
  }
  return blockers;
}

function collectCanvasPlacementSideEffects(
  db: Database.Database,
  userId: string,
  blockId: string,
): CanvasPlacementSideEffect[] {
  return db.prepare(`
    SELECT DISTINCT co.id AS object_id, co.note_id, co.kind, co.backing, co.object_class
    FROM canvas_objects co
    LEFT JOIN content_mounts cm ON cm.object_id = co.id
    WHERE co.user_id = ?
      AND (
        (cm.target_kind = 'note_block' AND cm.target_id = ?)
        OR json_extract(co.metadata, '$.block_id') = ?
      )
  `).all(userId, blockId, blockId) as CanvasPlacementSideEffect[];
}

function assertCanvasSideEffectsAreDisposable(
  db: Database.Database,
  userId: string,
  noteId: string,
  blockId: string,
  objects: CanvasPlacementSideEffect[],
): void {
  const blockers: string[] = [];
  for (const object of objects) {
    if (
      object.note_id !== noteId
      || object.kind !== 'paragraph_block_projection'
      || object.backing !== 'note_block'
      || object.object_class !== 'block_backed'
    ) {
      blockers.push(`canvas_object:${object.object_id}`);
      continue;
    }
    if (exists(
      db,
      `SELECT 1 FROM content_mounts
       WHERE object_id = ?
         AND NOT (user_id = ? AND note_id = ? AND target_kind = 'note_block' AND target_id = ?)
       LIMIT 1`,
      object.object_id,
      userId,
      noteId,
      blockId,
    )) {
      blockers.push(`canvas_mount:${object.object_id}`);
    }
    if (exists(
      db,
      `SELECT 1 FROM canvas_placements
       WHERE object_id = ?
         AND NOT (user_id = ? AND note_id = ?)
       LIMIT 1`,
      object.object_id,
      userId,
      noteId,
    )) {
      blockers.push(`canvas_placement:${object.object_id}`);
    }
    if (exists(
      db,
      `SELECT 1 FROM visual_connector_extensions
       WHERE user_id = ?
         AND (object_id = ? OR start_object_id = ? OR end_object_id = ?)
       LIMIT 1`,
      userId,
      object.object_id,
      object.object_id,
      object.object_id,
    )) {
      blockers.push(`visual_connector:${object.object_id}`);
    }
    if (exists(
      db,
      `SELECT 1 FROM annotation_ranges
       WHERE user_id = ? AND canvas_object_id = ? LIMIT 1`,
      userId,
      object.object_id,
    )) {
      blockers.push(`canvas_annotation:${object.object_id}`);
    }
    if (exists(
      db,
      'SELECT 1 FROM page_frame_extensions WHERE user_id = ? AND object_id = ? LIMIT 1',
      userId,
      object.object_id,
    )) {
      blockers.push(`page_frame_extension:${object.object_id}`);
    }
    if (exists(
      db,
      'SELECT 1 FROM image_object_extensions WHERE user_id = ? AND object_id = ? LIMIT 1',
      userId,
      object.object_id,
    )) {
      blockers.push(`image_extension:${object.object_id}`);
    }
    if (exists(
      db,
      'SELECT 1 FROM structured_object_extensions WHERE user_id = ? AND object_id = ? LIMIT 1',
      userId,
      object.object_id,
    )) {
      blockers.push(`structured_extension:${object.object_id}`);
    }
  }
  if (blockers.length) {
    throw new AppError(409, 'Client-created block has non-disposable canvas references', { blockers });
  }
}

export function discardClientNoteBlockCreate(
  db: Database.Database,
  userId: string,
  noteId: string,
  courseId: string,
  clientCreateKey: string,
): DiscardClientCreateResult {
  const batchId = clientNoteBlockCreateReceiptId(userId, noteId, clientCreateKey);

  const transactionResult = db.transaction((): DiscardClientCreateResult | CleanupConflictResult => {
    assertOwnedNote(db, userId, noteId, courseId);
    const now = new Date().toISOString();
    const existingBatch = readBatch(db, batchId);
    if (!existingBatch) {
      const receipt: ClientCreateReceiptMetadata = {
        note_id: noteId,
        canceled_without_create: true,
        discarded_at: now,
      };
  db.prepare(`
    INSERT INTO operation_batches (
      id, user_id, course_id, source_type, source_id, label, status,
      metadata, reverted_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'reverted', ?, ?)
  `).run(
    batchId,
        userId,
        courseId,
        CLIENT_CREATE_SOURCE_TYPE,
        clientCreateKey,
        'Cancel client note block create',
        stringifyJson(receipt, {}),
        now,
      );
      return { discarded: false, block_id: null, canceled: true };
    }

    const receipt = assertReceiptIdentity(existingBatch, userId, noteId, clientCreateKey);
    if (existingBatch.status === 'reverted') {
      if (receipt.block_id && exists(db, 'SELECT 1 FROM note_blocks WHERE id = ? LIMIT 1', receipt.block_id)) {
        throw new AppError(409, 'Canceled client create receipt still has a durable block');
      }
      return { discarded: false, block_id: receipt.block_id || null, canceled: true };
    }
    if (existingBatch.status !== 'applied' || !receipt.block_id || !receipt.placement_id) {
      throw new AppError(409, 'Client create receipt is incomplete');
    }

    const block = readBlockForReceipt(
      db,
      userId,
      noteId,
      receipt.block_id,
      receipt.placement_id,
    );
    if (!block || block.operation_batch_id !== batchId) {
      throw new AppError(409, 'Client create receipt durable target is missing');
    }
    if (block.status !== 'active' || block.source_kind !== 'manual') {
      throw new AppError(409, 'Client-created block is no longer active manual content');
    }

    if (!receipt.initial_placement) {
      return recordLegacyPlacementCleanupConflict(db, {
        userId,
        courseId,
        noteId,
        clientCreateKey,
        createBatchId: batchId,
        blockId: block.id,
        placementId: block.placement_id,
        detectedAt: now,
      });
    }

    assertReceiptPlacementIsUnique(db, block, receipt);
    if (!matchesReceiptPlacementSnapshot(block, receipt)) {
      throw new AppError(409, 'Client-created block placement has changed');
    }

    const canvasObjects = collectCanvasPlacementSideEffects(db, userId, block.id);
    const referenceBlockers = collectReferenceBlockers(
      db,
      userId,
      block,
      receipt,
      canvasObjects.map((object) => object.object_id),
    );
    if (referenceBlockers.length) {
      throw new AppError(409, 'Client-created block has durable references', { blockers: referenceBlockers });
    }
    if (!isUntouchedInitialBlock(block, receipt) && !isProvenEmptyBlock(block, receipt)) {
      throw new AppError(409, 'Client-created block has been meaningfully changed');
    }

    assertCanvasSideEffectsAreDisposable(db, userId, noteId, block.id, canvasObjects);

    db.prepare(`
      DELETE FROM content_mounts
      WHERE user_id = ? AND note_id = ? AND target_kind = 'note_block' AND target_id = ?
    `).run(userId, noteId, block.id);
    const deleteCanvasObject = db.prepare(
      'DELETE FROM canvas_objects WHERE id = ? AND user_id = ? AND note_id = ?',
    );
    for (const object of canvasObjects) {
      deleteCanvasObject.run(object.object_id, userId, noteId);
    }
    db.prepare('DELETE FROM note_block_placements WHERE id = ? AND note_id = ? AND block_id = ?')
      .run(block.placement_id, noteId, block.id);
    db.prepare(`
      DELETE FROM note_blocks
      WHERE id = ? AND user_id = ? AND operation_batch_id = ?
    `).run(block.id, userId, batchId);

    const revertedReceipt: ClientCreateReceiptMetadata = {
      ...receipt,
      discarded_at: now,
    };
    db.prepare(`
      UPDATE operation_batches
      SET status = 'reverted', metadata = ?, reverted_at = ?
      WHERE id = ? AND user_id = ?
    `).run(stringifyJson(revertedReceipt, {}), now, batchId, userId);
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, noteId, userId);

    return { discarded: true, block_id: block.id, canceled: true };
  })();

  if ('cleanup_conflict' in transactionResult) {
    throw new AppError(409, 'Legacy client create receipt cannot prove placement ownership', {
      code: 'client_note_block_cleanup_conflict',
      conflict_code: transactionResult.cleanup_conflict.conflict_code,
      operation_batch_id: transactionResult.operation_batch_id,
    });
  }
  return transactionResult;
}
