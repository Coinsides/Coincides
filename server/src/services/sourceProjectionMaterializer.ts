import type Database from 'better-sqlite3';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { SourceArtifact, SourceArtifactBlock } from './sourceArtifact.js';
import type { SourceMaterializationFile } from './sourceFileIntake.js';
import { readCoordinateContract, type CoordinateContract } from './coordinateContract.js';

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_GAP = 36;
const PAGE_X = 80;
const PAGE_Y = 80;
const CONTENT_LEFT = 72;
const CONTENT_TOP = 96;
const CONTENT_BOTTOM = 96;
const CONTENT_WIDTH = 650;
const BLOCK_GAP = 18;
const SOURCE_ASSET_FOLDER = 'source-materializations';

interface ProjectionFramePlan {
  frameId: string;
  index: number;
  sourcePageIndex: number | null;
  x: number;
  y: number;
}

interface ProjectionBlockPlan {
  blockId: string;
  notePlacementId: string;
  canvasObjectId: string;
  canvasPlacementId: string;
  mountId: string;
  artifact: SourceArtifactBlock;
  orderIndex: number;
  frame: ProjectionFramePlan;
  x: number;
  y: number;
  localX: number;
  localY: number;
  width: number;
  height: number;
}

interface PreparedImageAsset {
  assetId: string;
  storageKey: string;
  finalPath: string;
  extension: string;
}

export interface PublishSourceProjectionHooks {
  insidePublish?: (stage: 'after_note' | 'after_content') => void;
}

export interface PublishSourceProjectionOptions {
  canvasAssetRootDir?: string;
  now?: Date;
  hooks?: PublishSourceProjectionHooks;
}

export interface PublishedSourceProjection {
  projection_note_id: string;
  operation_batch_id: string;
  block_count: number;
  canvas_object_count: number;
}

function canvasAssetRoot(override?: string): string {
  return resolve(override || process.env.CANVAS_ASSET_DIR || join(process.cwd(), 'uploads', 'canvas-assets'));
}

function resolveCanvasAssetPath(rootDir: string, storageKey: string): string {
  if (isAbsolute(storageKey)) throw new Error('Canvas asset storage key must be relative');
  const root = canvasAssetRoot(rootDir);
  const target = resolve(root, storageKey);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error('Canvas asset storage key escaped the managed root');
  }
  return target;
}

function imageExtension(source: SourceMaterializationFile): string {
  const fromName = extname(source.original_filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(fromName)) {
    return fromName === '.jpeg' ? '.jpg' : fromName;
  }
  const byMime: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  };
  const extension = byMime[source.mime_type];
  if (!extension) throw new Error(`Unsupported image projection MIME type: ${source.mime_type}`);
  return extension;
}

function prepareImageAssetCopy(
  db: Database.Database,
  source: SourceMaterializationFile,
  rootDir: string,
): PreparedImageAsset {
  const extension = imageExtension(source);
  const assetId = `source-materialization-asset:${source.materialization_id}`;
  const storageKey = `${source.user_id}/${SOURCE_ASSET_FOLDER}/${source.materialization_id}${extension}`;
  const finalPath = resolveCanvasAssetPath(rootDir, storageKey);
  mkdirSync(dirname(finalPath), { recursive: true });

  const existing = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
    .get(assetId, source.user_id) as { id: string } | undefined;
  if (existing) {
    return { assetId, storageKey, finalPath, extension };
  }

  const tempPath = `${finalPath}.tmp-${uuidv4()}`;
  try {
    copyFileSync(source.file_path, tempPath);
    rmSync(finalPath, { force: true });
    renameSync(tempPath, finalPath);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
  return { assetId, storageKey, finalPath, extension };
}

function cleanupPreparedImageAsset(
  db: Database.Database,
  userId: string,
  prepared: PreparedImageAsset | null,
): void {
  if (!prepared) return;
  const row = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
    .get(prepared.assetId, userId);
  if (!row) rmSync(prepared.finalPath, { force: true });
}

function estimateBlockHeight(block: SourceArtifactBlock): number {
  const explicitLines = Math.max(1, block.text.split('\n').length);
  const wrappedLines = Math.max(explicitLines, Math.ceil(block.text.length / 78));
  return Math.min(900, Math.max(72, wrappedLines * 23 + 34));
}

function buildProjectionLayout(blocks: SourceArtifactBlock[]): {
  frames: ProjectionFramePlan[];
  blocks: ProjectionBlockPlan[];
} {
  const frames: ProjectionFramePlan[] = [];
  const plannedBlocks: ProjectionBlockPlan[] = [];
  let currentFrame: ProjectionFramePlan | null = null;
  let currentPageIndex: number | null = null;
  let localY = CONTENT_TOP;

  const addFrame = (sourcePageIndex: number | null) => {
    const index = frames.length;
    const frame: ProjectionFramePlan = {
      frameId: `source-page-${index + 1}`,
      index,
      sourcePageIndex,
      x: PAGE_X,
      y: PAGE_Y + index * (PAGE_HEIGHT + PAGE_GAP),
    };
    frames.push(frame);
    currentFrame = frame;
    currentPageIndex = sourcePageIndex;
    localY = CONTENT_TOP;
    return frame;
  };

  for (const [index, block] of blocks.entries()) {
    const height = estimateBlockHeight(block);
    const sourcePageChanged = block.page_index !== null
      && currentFrame !== null
      && currentPageIndex !== block.page_index;
    if (
      !currentFrame
      || sourcePageChanged
      || localY + height > PAGE_HEIGHT - CONTENT_BOTTOM
    ) {
      addFrame(block.page_index);
    }
    const frame = currentFrame!;
    const notePlacementId = uuidv4();
    const blockId = uuidv4();
    const canvasObjectId = `canvas-object:${frame.frameId}:${notePlacementId}`;
    plannedBlocks.push({
      blockId,
      notePlacementId,
      canvasObjectId,
      canvasPlacementId: `canvas-placement:${notePlacementId}`,
      mountId: `content-mount:${notePlacementId}`,
      artifact: block,
      orderIndex: index,
      frame,
      x: frame.x + CONTENT_LEFT,
      y: frame.y + localY,
      localX: 0,
      localY: localY - CONTENT_TOP,
      width: CONTENT_WIDTH,
      height,
    });
    localY += height + BLOCK_GAP;
  }

  if (frames.length === 0) addFrame(null);
  return { frames, blocks: plannedBlocks };
}

function resolveProjectionBlockCoordinates(block: ProjectionBlockPlan, contract: CoordinateContract) {
  return contract === 'v2'
    ? { x: block.localX, y: block.localY, coordinateSpace: 'page_frame_local' }
    : { x: block.x, y: block.y, coordinateSpace: 'canvas_world' };
}

function resolveProjectionImagePlacement(frame: ProjectionFramePlan, contract: CoordinateContract) {
  return contract === 'v2'
    ? {
      x: 0,
      y: 0,
      metadata: { placement_kind: 'source_image', layout_policy: { coordinate_space: 'page_frame_local' } },
    }
    : {
      x: frame.x + CONTENT_LEFT,
      y: frame.y + CONTENT_TOP,
      metadata: { placement_kind: 'source_image' },
    };
}

function textFlowContent(block: SourceArtifactBlock): Record<string, unknown> {
  return {
    body: block.text,
    text_flow: {
      textflow_version: 'TextBlockContentV1',
      units: [{
        id: 'tu-1',
        text: block.text,
        writing_role: block.writing_role,
        indent_level: 0,
        order_index: 0,
        metadata: {
          source_locator: block.locator,
          source_page_index: block.page_index,
        },
        status: 'active',
      }],
      inline_structures: [],
      metadata: {
        projection_source: 'source_materialization',
      },
    },
  };
}

function receiptExcerpt(text: string): string {
  const normalized = text.trim();
  return normalized.length <= 2000 ? normalized : `${normalized.slice(0, 1997)}...`;
}

function pageStackPayload(frames: ProjectionFramePlan[]) {
  const frameIds = frames.map((frame) => frame.frameId);
  return [{
    id: 'source-page-stack-1',
    displayName: 'Source projection',
    frameIds,
    primaryFrameId: frameIds[0],
    selectedFrameId: frameIds[0],
    collapsed: frames.length > 1,
    numbering: { enabled: true, startAt: 1 },
    layout: { direction: 'vertical', gap: PAGE_GAP, collapsedPreviewPages: 1 },
    createdFrom: 'source_materialization',
  }];
}

export function publishSourceProjection(
  db: Database.Database,
  source: SourceMaterializationFile,
  artifact: SourceArtifact,
  options: PublishSourceProjectionOptions = {},
): PublishedSourceProjection {
  const now = (options.now || new Date()).toISOString();
  const noteId = uuidv4();
  const operationBatchId = uuidv4();
  const canvasId = noteId;
  const layout = buildProjectionLayout(artifact.blocks);
  const rootDir = canvasAssetRoot(options.canvasAssetRootDir);
  const preparedImage = artifact.artifact_kind === 'image'
    ? prepareImageAssetCopy(db, source, rootDir)
    : null;

  try {
    return db.transaction(() => {
      const run = db.prepare(`
        SELECT status, projection_note_id
        FROM source_materializations
        WHERE id = ? AND source_record_id = ? AND user_id = ?
      `).get(source.materialization_id, source.source_record_id, source.user_id) as {
        status: string;
        projection_note_id: string | null;
      } | undefined;
      if (!run || run.status !== 'publishing' || run.projection_note_id) {
        throw new Error('Materialization run is not publishable');
      }
      // One database snapshot governs every block in this publication.
      const coordinateContract = readCoordinateContract(db);

      db.prepare(`
        INSERT INTO operation_batches (
          id, user_id, course_id, source_type, source_id, label, status, metadata,
           applied_at
        )
        VALUES (?, ?, ?, 'source_materialization', ?, ?, 'applied', ?, ?)
      `).run(
        operationBatchId,
        source.user_id,
        source.course_id,
        source.materialization_id,
        `Materialize Source: ${source.display_name}`,
        JSON.stringify({
          source_record_id: source.source_record_id,
          source_file_id: source.source_file_id,
          parser_key: source.parser_key,
          parser_version: source.parser_version,
          artifact_schema_version: artifact.schema_version,
        }),
        now,
      );

      db.prepare(`
        INSERT INTO notes (
          id, user_id, course_id, title, description, status, source_kind,
          page_format, note_class, metadata, operation_batch_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, NULL, 'active', 'source_projection', 'flow',
          'source_projection', ?, ?, ?, ?)
      `).run(
        noteId,
        source.user_id,
        source.course_id,
        source.display_name,
        JSON.stringify({
          source_projection_version: 'v1',
          source_record_id: source.source_record_id,
          source_file_id: source.source_file_id,
          source_materialization_id: source.materialization_id,
          parser_key: source.parser_key,
          parser_version: source.parser_version,
          content_policy: 'source_locked',
        }),
        operationBatchId,
        now,
        now,
      );
      options.hooks?.insidePublish?.('after_note');

      const stackId = 'source-page-stack-1';
      const primaryFrameId = layout.frames[0].frameId;
      db.prepare(`
        INSERT INTO canvas_page_collections (
          note_id, user_id, course_id, canvas_id, primary_frame_id, selected_frame_id,
          primary_stack_id, selected_stack_id, page_stacks_json, metadata,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        noteId,
        source.user_id,
        source.course_id,
        canvasId,
        primaryFrameId,
        primaryFrameId,
        stackId,
        stackId,
        JSON.stringify(pageStackPayload(layout.frames)),
        JSON.stringify({ source_materialization_id: source.materialization_id }),
        now,
        now,
      );

      const insertCanvasObject = db.prepare(`
        INSERT INTO canvas_objects (
          id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
          status, source_json, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `);
      const insertCanvasPlacement = db.prepare(`
        INSERT INTO canvas_placements (
          id, user_id, course_id, note_id, object_id, canvas_id,
          x, y, width, height, rotation, frame_id, surface, boundary_role,
          z_index, snap_state_json, visibility_state, render_visibility, metadata,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'formal_page', 'inside',
          ?, '{}', 'normal', 'visible', ?, ?, ?)
      `);

      for (const frame of layout.frames) {
        const frameObjectId = `canvas-object:${noteId}:page-frame:${frame.frameId}`;
        insertCanvasObject.run(
          frameObjectId,
          source.user_id,
          source.course_id,
          noteId,
          canvasId,
          'page_frame',
          'none',
          'pure',
          JSON.stringify({ source: 'source_materialization' }),
          JSON.stringify({ frame_id: frame.frameId, source_page_index: frame.sourcePageIndex }),
          now,
          now,
        );
        insertCanvasPlacement.run(
          `canvas-placement:${noteId}:page-frame:${frame.frameId}`,
          source.user_id,
          source.course_id,
          noteId,
          frameObjectId,
          canvasId,
          frame.x,
          frame.y,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          frame.frameId,
          frame.index,
          JSON.stringify({ placement_kind: 'page_frame' }),
          now,
          now,
        );
        db.prepare(`
          INSERT INTO page_frame_extensions (
            frame_id, user_id, course_id, note_id, object_id, canvas_id,
            page_stack_id, page_index, page_size, content_inset_json,
            typography_json, background_json, template_id, template_json,
            slots_json, exportable, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'A4', ?, '{}', '{}',
            'a4_portrait', '{}', '{}', 1, ?, ?, ?)
        `).run(
          frame.frameId,
          source.user_id,
          source.course_id,
          noteId,
          frameObjectId,
          canvasId,
          stackId,
          frame.index,
          JSON.stringify({ top: CONTENT_TOP, right: 72, bottom: CONTENT_BOTTOM, left: CONTENT_LEFT }),
          JSON.stringify({
            role: frame.index === 0 ? 'primary_page_frame' : 'page_frame',
            source_page_index: frame.sourcePageIndex,
          }),
          now,
          now,
        );
      }

      const insertBlock = db.prepare(`
        INSERT INTO note_blocks (
          id, user_id, course_id, block_type, title, content_json, plain_text,
          status, source_kind, metadata, operation_batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, 'paragraph', NULL, ?, ?, 'active', 'source_projection', ?, ?, ?, ?)
      `);
      const insertNotePlacement = db.prepare(`
        INSERT INTO note_block_placements (
          id, note_id, block_id, order_index, display_mode, display_overrides_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'default', '{}', ?, ?)
      `);
      const insertReceipt = db.prepare(`
        INSERT INTO note_block_sources (
          id, block_id, document_id, document_chunk_id, source_page_start,
          source_page_end, source_excerpt, reference_type, confidence, metadata,
          source_record_id, source_materialization_id, created_at
        ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `);
      const insertMount = db.prepare(`
        INSERT INTO content_mounts (
          id, user_id, course_id, note_id, object_id, target_kind, target_id,
          projection_mode, sync_policy, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'note_block', ?, 'owned', 'manual', ?, ?, ?)
      `);

      for (const block of layout.blocks) {
        const coordinates = resolveProjectionBlockCoordinates(block, coordinateContract);
        const metadata = {
          projection_kind: 'source_text_projection',
          source_record_id: source.source_record_id,
          source_file_id: source.source_file_id,
          source_materialization_id: source.materialization_id,
          source_page_index: block.artifact.page_index,
          source_locator: block.artifact.locator,
          artifact_block_id: block.artifact.artifact_block_id,
          parser_key: source.parser_key,
          parser_version: source.parser_version,
        };
        insertBlock.run(
          block.blockId,
          source.user_id,
          source.course_id,
          JSON.stringify(textFlowContent(block.artifact)),
          block.artifact.text,
          JSON.stringify(metadata),
          operationBatchId,
          now,
          now,
        );
        insertNotePlacement.run(
          block.notePlacementId,
          noteId,
          block.blockId,
          block.orderIndex,
          now,
          now,
        );
        insertReceipt.run(
          uuidv4(),
          block.blockId,
          block.artifact.page_index,
          block.artifact.page_index,
          receiptExcerpt(block.artifact.text),
          block.artifact.page_index === null ? 'document' : 'page',
          JSON.stringify({
            locator: block.artifact.locator,
            artifact_block_id: block.artifact.artifact_block_id,
            parser_key: source.parser_key,
            parser_version: source.parser_version,
          }),
          source.source_record_id,
          source.materialization_id,
          now,
        );
        insertCanvasObject.run(
          block.canvasObjectId,
          source.user_id,
          source.course_id,
          noteId,
          canvasId,
          'paragraph_block_projection',
          'note_block',
          'block_backed',
          JSON.stringify({
            source: 'source_materialization',
            source_record_id: source.source_record_id,
            source_materialization_id: source.materialization_id,
          }),
          JSON.stringify({ note_block_id: block.blockId }),
          now,
          now,
        );
        insertCanvasPlacement.run(
          block.canvasPlacementId,
          source.user_id,
          source.course_id,
          noteId,
          block.canvasObjectId,
          canvasId,
          coordinates.x,
          coordinates.y,
          block.width,
          block.height,
          block.frame.frameId,
          block.orderIndex + 10,
          JSON.stringify({
            placement_kind: 'source_block',
            source_page_index: block.artifact.page_index,
            layout_policy: {
              coordinate_space: coordinates.coordinateSpace,
            },
          }),
          now,
          now,
        );
        insertMount.run(
          block.mountId,
          source.user_id,
          source.course_id,
          noteId,
          block.canvasObjectId,
          block.blockId,
          JSON.stringify({ source_materialization_id: source.materialization_id }),
          now,
          now,
        );
      }

      if (preparedImage) {
        db.prepare(`
          INSERT INTO canvas_assets (
            id, user_id, course_id, origin_note_id, kind, storage_kind, storage_key,
            filename, mime_type, byte_size, width, height, sha256, metadata,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'image', 'local_file', ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
        `).run(
          preparedImage.assetId,
          source.user_id,
          source.course_id,
          noteId,
          preparedImage.storageKey,
          source.original_filename,
          source.mime_type,
          source.byte_size,
          source.content_hash,
          JSON.stringify({
            managed_by: 'source_materialization',
            source_record_id: source.source_record_id,
            source_file_id: source.source_file_id,
            source_materialization_id: source.materialization_id,
          }),
          now,
          now,
        );
        const frame = layout.frames[0];
        const imagePlacement = resolveProjectionImagePlacement(frame, coordinateContract);
        const objectId = `canvas-object:${noteId}:source-image:${source.materialization_id}`;
        insertCanvasObject.run(
          objectId,
          source.user_id,
          source.course_id,
          noteId,
          canvasId,
          'image',
          'asset',
          'asset_backed',
          JSON.stringify({
            source: 'source_materialization',
            source_record_id: source.source_record_id,
            source_materialization_id: source.materialization_id,
          }),
          JSON.stringify({ content_policy: 'source_locked' }),
          now,
          now,
        );
        insertCanvasPlacement.run(
          `${objectId}:placement`,
          source.user_id,
          source.course_id,
          noteId,
          objectId,
          canvasId,
          imagePlacement.x,
          imagePlacement.y,
          CONTENT_WIDTH,
          PAGE_HEIGHT - CONTENT_TOP - CONTENT_BOTTOM,
          frame.frameId,
          10,
          JSON.stringify(imagePlacement.metadata),
          now,
          now,
        );
        db.prepare(`
          INSERT INTO image_object_extensions (
            object_id, user_id, course_id, note_id, canvas_id, asset_id,
            fit, caption, alt_text, natural_width, natural_height, metadata,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'contain', NULL, ?, NULL, NULL, ?, ?, ?)
        `).run(
          objectId,
          source.user_id,
          source.course_id,
          noteId,
          canvasId,
          preparedImage.assetId,
          source.display_name,
          JSON.stringify({
            source_record_id: source.source_record_id,
            source_materialization_id: source.materialization_id,
          }),
          now,
          now,
        );
      }

      options.hooks?.insidePublish?.('after_content');
      const updated = db.prepare(`
        UPDATE source_materializations
        SET status = 'materialized', projection_note_id = ?, error_code = NULL,
            error_message = NULL, completed_at = ?, updated_at = ?
        WHERE id = ? AND source_record_id = ? AND user_id = ?
          AND status = 'publishing' AND projection_note_id IS NULL
      `).run(
        noteId,
        now,
        now,
        source.materialization_id,
        source.source_record_id,
        source.user_id,
      );
      if (updated.changes !== 1) throw new Error('Materialization final flip lost its publish claim');

      return {
        projection_note_id: noteId,
        operation_batch_id: operationBatchId,
        block_count: layout.blocks.length,
        canvas_object_count: layout.frames.length + layout.blocks.length + (preparedImage ? 1 : 0),
      };
    })();
  } catch (error) {
    cleanupPreparedImageAsset(db, source.user_id, preparedImage);
    throw error;
  }
}

export function sweepOrphanSourceProjectionAssets(
  db: Database.Database,
  options: { canvasAssetRootDir?: string; now?: Date; staleAfterMs?: number } = {},
): number {
  const root = canvasAssetRoot(options.canvasAssetRootDir);
  const now = options.now || new Date();
  const staleAfterMs = options.staleAfterMs ?? 10 * 60 * 1000;
  if (!existsSync(root)) return 0;

  const referenced = new Set((db.prepare(`
    SELECT storage_key FROM canvas_assets
    WHERE json_extract(metadata, '$.managed_by') = 'source_materialization'
  `).all() as Array<{ storage_key: string }>).map((row) => row.storage_key.replace(/\\/g, '/')));
  let removed = 0;

  for (const userEntry of readdirSync(root, { withFileTypes: true })) {
    if (!userEntry.isDirectory()) continue;
    const folder = join(root, userEntry.name, SOURCE_ASSET_FOLDER);
    if (!existsSync(folder)) continue;
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const filePath = join(folder, entry.name);
      const storageKey = relative(root, filePath).split(sep).join('/');
      if (referenced.has(storageKey)) continue;
      const age = now.getTime() - statSync(filePath).mtimeMs;
      if (age <= staleAfterMs) continue;
      rmSync(filePath, { force: true });
      removed += 1;
    }
  }
  return removed;
}
