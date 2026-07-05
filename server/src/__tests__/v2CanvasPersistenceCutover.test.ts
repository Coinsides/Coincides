import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import { runMigrations } from '../db/migrate.js';
import annotationTruthMigration from '../db/migrations/036_v2_annotation_truths.js';
import courseRoutes from '../routes/courses.js';
import {
  deleteCanvasObject,
  getNoteCanvasPersistence,
  saveCanvasObject,
  saveBlockCanvasPlacement,
  savePageFrameCollection,
  assertNoteBlockStatusChangeAllowed,
  restoreNoteBlockForCanvasLifecycle,
} from '../services/canvasObjects.js';
import {
  listAnnotationTruths,
  replaceNoteAnnotationTruths,
} from '../services/annotationTruths.js';
import {
  saveCanvasObjectSchema,
} from '../validators/index.js';

const CANVAS_ASSET_DIR = process.env.CANVAS_ASSET_DIR || join(process.cwd(), 'uploads', 'canvas-assets');

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-canvas-persistence-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUserCourseNote(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  const noteId = uuidv4();

  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'Canvas Persistence User');
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'AMATH 231');
  db.prepare('INSERT INTO notes (id, user_id, course_id, title, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(noteId, userId, courseId, 'Power Series note', '{}');

  return { userId, courseId, noteId };
}

function seedNote(
  db: Awaited<ReturnType<typeof initDb>>,
  ids: { userId: string; courseId: string },
  title = 'Power Series note',
) {
  const noteId = uuidv4();
  db.prepare('INSERT INTO notes (id, user_id, course_id, title, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(noteId, ids.userId, ids.courseId, title, '{}');
  return noteId;
}

function seedCourseNoteForUser(
  db: Awaited<ReturnType<typeof initDb>>,
  userId: string,
  title = 'Cross course note',
) {
  const courseId = uuidv4();
  const noteId = uuidv4();
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'Cross Course');
  db.prepare('INSERT INTO notes (id, user_id, course_id, title, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(noteId, userId, courseId, title, '{}');
  return { courseId, noteId };
}

async function deleteCourseThroughRoute(userId: string, courseId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).userId = userId;
    next();
  });
  app.use('/api/courses', courseRoutes);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode || err.status || 500).json({ error: err.message });
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const running = app.listen(0, () => resolve(running));
  });
  try {
    const address = server.address();
    assert.equal(typeof address, 'object');
    assert.notEqual(address, null);
    const response = await fetch(`http://127.0.0.1:${(address as any).port}/api/courses/${courseId}`, {
      method: 'DELETE',
    });
    const body = await response.text();
    assert.equal(response.status, 200, body);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

function seedCanvasImageAsset(
  db: Awaited<ReturnType<typeof initDb>>,
  ids: { userId: string; courseId: string; noteId: string },
  options: { writeBlob?: boolean } = {},
) {
  const assetId = uuidv4();
  const storageKey = `${ids.userId}/${assetId}.png`;
  if (options.writeBlob) {
    mkdirSync(join(CANVAS_ASSET_DIR, ids.userId), { recursive: true });
    writeFileSync(join(CANVAS_ASSET_DIR, storageKey), Buffer.from('canvas-image-asset-lifecycle-test'));
  }
  db.prepare(`
    INSERT INTO canvas_assets (
      id, user_id, course_id, origin_note_id, kind, storage_kind, storage_key,
      filename, mime_type, byte_size, width, height, sha256, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'image', 'local_file', ?, 'power-series.png', 'image/png', 1280, 640, 360, ?, '{}', datetime('now'), datetime('now'))
  `).run(
    assetId,
    ids.userId,
    ids.courseId,
    ids.noteId,
    storageKey,
    'sha256-test-image',
  );
  return assetId;
}

function canvasAssetBlobPath(userId: string, assetId: string) {
  return join(CANVAS_ASSET_DIR, userId, `${assetId}.png`);
}

function cleanupCanvasAssetBlobDir(userId: string) {
  rmSync(join(CANVAS_ASSET_DIR, userId), { recursive: true, force: true });
}

function makeImageCanvasObjectPayload(objectId: string, assetId: string) {
  return {
    kind: 'image',
    backing: 'asset',
    object_class: 'media',
    placement: {
      placement_id: `${objectId}:placement`,
      x: 240,
      y: 320,
      width: 320,
      height: 180,
      rotation: 0,
      surface: 'canvas_workspace',
      boundary_role: 'outside',
      z_index: 12,
      visibility_state: 'normal',
      render_visibility: 'visible',
    },
    extension: {
      asset_id: assetId,
      fit: 'contain',
      caption: 'Power series convergence diagram',
      alt_text: 'A graph illustrating the convergence interval of a power series.',
      natural_width: 640,
      natural_height: 360,
    },
    metadata: {
      asset_kind: 'image',
    },
    source: {
      source: 'canvas_image_asset',
    },
  };
}

function makeTableCanvasObjectPayload(objectId = 'table-object-power-series') {
  return {
    kind: 'table',
    backing: 'structured_object',
    object_class: 'structured',
    placement: {
      placement_id: `${objectId}:placement`,
      x: 180,
      y: 120,
      width: 360,
      height: 108,
      rotation: 0,
      surface: 'canvas_workspace',
      boundary_role: 'outside',
      z_index: 25,
      visibility_state: 'normal',
      render_visibility: 'visible',
    },
    extension: {
      structured_kind: 'table',
      schema_version: 'table.v1',
      rows: [
        { rowId: 'row-1', index: 0 },
        { rowId: 'row-2', index: 1 },
      ],
      columns: [
        { columnId: 'col-1', index: 0 },
        { columnId: 'col-2', index: 1 },
      ],
      cells: [
        {
          cellId: 'cell-row-1-col-1',
          rowId: 'row-1',
          columnId: 'col-1',
          rowIndex: 0,
          columnIndex: 0,
          text: 'Definition',
          valueType: 'text',
        },
        {
          cellId: 'cell-row-1-col-2',
          rowId: 'row-1',
          columnId: 'col-2',
          rowIndex: 0,
          columnIndex: 1,
          text: 'Power series',
          valueType: 'text',
        },
        {
          cellId: 'cell-row-2-col-1',
          rowId: 'row-2',
          columnId: 'col-1',
          rowIndex: 1,
          columnIndex: 0,
          text: 'Example',
          valueType: 'text',
        },
        {
          cellId: 'cell-row-2-col-2',
          rowId: 'row-2',
          columnId: 'col-2',
          rowIndex: 1,
          columnIndex: 1,
          text: 'Taylor polynomial',
          valueType: 'text',
        },
      ],
      metadata: {},
    },
    metadata: {
      structured_kind: 'table',
    },
    source: {
      source: 'structured_table',
    },
  };
}

function seedBlockPlacement(
  db: Awaited<ReturnType<typeof initDb>>,
  ids: { userId: string; courseId: string; noteId: string },
) {
  const blockId = uuidv4();
  const placementId = uuidv4();
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, 'paragraph', '{}', 'A power series is an infinite series.', '{}', datetime('now'), datetime('now'))
  `).run(blockId, ids.userId, ids.courseId);
  db.prepare(`
    INSERT INTO note_block_placements (
      id, note_id, block_id, order_index, display_overrides_json, created_at, updated_at
    )
    VALUES (?, ?, ?, 0, ?, datetime('now'), datetime('now'))
  `).run(
    placementId,
    ids.noteId,
    blockId,
    JSON.stringify({
      better_notebook_layout: {
        x: 10,
        y: 20,
        width: 300,
        height: 120,
      },
      unrelated: true,
    }),
  );
  return { blockId, placementId };
}

function rangeMetadata(range: { metadata?: unknown } | undefined): Record<string, unknown> {
  return range?.metadata && typeof range.metadata === 'object' && !Array.isArray(range.metadata)
    ? range.metadata as Record<string, unknown>
    : {};
}

function storedAnnotationRangeMetadata(
  db: Awaited<ReturnType<typeof initDb>>,
  rangeId: string,
): Record<string, unknown> {
  const row = db.prepare('SELECT metadata FROM annotation_ranges WHERE id = ?')
    .get(rangeId) as { metadata: string | null } | undefined;
  return row?.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
}

function seedShapeBackingBlock(
  db: Awaited<ReturnType<typeof initDb>>,
  ids: { userId: string; courseId: string; noteId: string },
  shapeObjectId: string,
) {
  const blockId = uuidv4();
  const placementId = uuidv4();
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, 'paragraph', ?, 'Shape text lives in TextFlow', ?, datetime('now'), datetime('now'))
  `).run(
    blockId,
    ids.userId,
    ids.courseId,
    JSON.stringify({
      text_flow_content_v1: {
        version: 'TextBlockContentV1',
        block_kind: 'paragraph',
        units: [{
          id: `${blockId}:unit:0`,
          text: 'Shape text lives in TextFlow',
          writing_role: 'paragraph',
          indent_level: 0,
          order_index: 0,
          metadata: {},
          status: 'active',
        }],
        inline_objects: [],
        metadata: {},
      },
    }),
    JSON.stringify({
      projection_kind: 'block_backed_shape',
      shape_object_id: shapeObjectId,
      render_scope: 'canvas_object_backing',
    }),
  );
  db.prepare(`
    INSERT INTO note_block_placements (
      id, note_id, block_id, order_index, display_overrides_json, created_at, updated_at
    )
    VALUES (?, ?, ?, 0, '{}', datetime('now'), datetime('now'))
  `).run(placementId, ids.noteId, blockId);
  return { blockId, placementId };
}

function blockBackedShapePayload(
  ids: { noteId: string },
  objectId: string,
  blockId: string,
  suffix = 'a',
) {
  return saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'note_block',
    object_class: 'block_backed',
    metadata: { shape_type: 'rectangle' },
    extension: { block_id: blockId },
    mount: {
      mount_id: `${objectId}:mount:shape-text`,
      target_id: blockId,
      projection_mode: 'owned',
    },
    placement: {
      placement_id: `canvas-placement:${ids.noteId}:shape-backed-${suffix}`,
      x: 260,
      y: 180,
      width: 220,
      height: 120,
      surface: 'canvas_workspace',
    },
  });
}

function pureShapePayload(
  ids: { noteId: string },
  objectId: string,
  suffix = 'a',
) {
  return saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'none',
    object_class: 'pure',
    metadata: { shape_type: 'rectangle' },
    placement: {
      placement_id: `canvas-placement:${ids.noteId}:shape-backed-${suffix}`,
      x: 260,
      y: 180,
      width: 220,
      height: 120,
      surface: 'canvas_workspace',
    },
  });
}

function seedSharedBlockPlacement(
  db: Awaited<ReturnType<typeof initDb>>,
  ids: { userId: string; courseId: string; noteId: string; blockId: string },
  orderIndex: number,
) {
  const placementId = uuidv4();
  db.prepare(`
    INSERT INTO note_block_placements (
      id, note_id, block_id, order_index, display_overrides_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, '{}', datetime('now'), datetime('now'))
  `).run(placementId, ids.noteId, ids.blockId, orderIndex);
  return placementId;
}

function resetCutoverTablesForBackfill(db: Awaited<ReturnType<typeof initDb>>) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS annotation_ranges;
    DROP TABLE IF EXISTS annotation_truths;
    DROP TABLE IF EXISTS page_frame_extensions;
    DROP TABLE IF EXISTS canvas_page_collections;
    DROP TABLE IF EXISTS content_mounts;
    DROP TABLE IF EXISTS canvas_placements;
    DROP TABLE IF EXISTS canvas_objects;
    PRAGMA foreign_keys = ON;
  `);
  db.prepare(`
    DELETE FROM db_migrations
    WHERE id IN (
      '035_v2_canvas_objects',
      '036_v2_annotation_truths',
      '037_v2_canvas_object_block_identity_hardening',
      '038_v2_canvas_note_block_mount_uniqueness',
      '039_v2_page_frame_extension_note_scope',
      '040_v2_visual_connector_extensions',
      '041_v2_canvas_image_assets',
      '042_v2_structured_object_extensions',
      '043_v2_page_frame_extension_repair'
    )
  `).run();
}

function legacyPageFrameCollection(frame: Record<string, unknown>, stackId = 'legacy-stack') {
  const frameId = String(frame.id);
  return {
    version: 1,
    pageFrames: [frame],
    pageStacks: [{
      id: stackId,
      frameIds: [frameId],
      primaryFrameId: frameId,
      selectedFrameId: frameId,
    }],
    primaryFrameId: frameId,
    selectedFrameId: frameId,
    primaryStackId: stackId,
    selectedStackId: stackId,
  };
}

function writeLegacyPageFrameMetadata(
  db: Awaited<ReturnType<typeof initDb>>,
  noteId: string,
  collection: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  db.prepare('UPDATE notes SET metadata = ? WHERE id = ?').run(JSON.stringify({
    ...extra,
    canvas_engine_page_frames_v1: collection,
  }), noteId);
}

test('Canvas persistence migration creates durable entity tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('canvas_objects'), true);
    assert.equal(tableNames.includes('canvas_placements'), true);
    assert.equal(tableNames.includes('content_mounts'), true);
    assert.equal(tableNames.includes('page_frame_extensions'), true);
    assert.equal(tableNames.includes('canvas_page_collections'), true);
    assert.equal(tableNames.includes('visual_connector_extensions'), true);
    assert.equal(tableNames.includes('canvas_assets'), true);
    assert.equal(tableNames.includes('image_object_extensions'), true);
    assert.equal(tableNames.includes('structured_object_extensions'), true);
    assert.equal(tableNames.includes('annotation_truths'), true);
    assert.equal(tableNames.includes('annotation_ranges'), true);
  });
});

test('Block CanvasObject identity stays per placement when the same block is reused across notes', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const noteAId = ids.noteId;
    const noteBId = seedNote(db, ids, 'Shared block target note');
    const { blockId, placementId: placementAId } = seedBlockPlacement(db, ids);
    const placementBId = seedSharedBlockPlacement(db, {
      userId: ids.userId,
      courseId: ids.courseId,
      noteId: noteBId,
      blockId,
    }, 0);

    saveBlockCanvasPlacement(db, ids.userId, noteAId, placementAId, {
      block_id: blockId,
      layout: { x: 20, y: 30, width: 320, height: 140, surface: 'formal_page' },
    });
    saveBlockCanvasPlacement(db, ids.userId, noteBId, placementBId, {
      block_id: blockId,
      layout: { x: 420, y: 30, width: 300, height: 110, surface: 'canvas_workspace' },
    });

    const noteA = getNoteCanvasPersistence(db, ids.userId, noteAId);
    const noteB = getNoteCanvasPersistence(db, ids.userId, noteBId);

    assert.equal(noteA.blockLayouts.length, 1);
    assert.equal(noteA.blockLayouts[0]?.placement_id, placementAId);
    assert.equal(noteA.blockLayouts[0]?.layout.x, 20);
    assert.equal(noteB.blockLayouts.length, 1);
    assert.equal(noteB.blockLayouts[0]?.placement_id, placementBId);
    assert.equal(noteB.blockLayouts[0]?.layout.x, 420);

    const objects = db.prepare(`
      SELECT id, note_id
      FROM canvas_objects
      WHERE kind = 'paragraph_block_projection'
      ORDER BY note_id ASC
    `).all() as Array<{ id: string; note_id: string }>;
    assert.equal(objects.length, 2);
    assert.notEqual(objects[0]?.id, blockId);
    assert.notEqual(objects[1]?.id, blockId);
  });
});

test('Image CanvasObject saves as asset-backed media without becoming text content truth', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const assetId = seedCanvasImageAsset(db, ids, { writeBlob: true });
    const assetBlobPath = canvasAssetBlobPath(ids.userId, assetId);
    const objectId = 'image-object-power-series';
    const payload = makeImageCanvasObjectPayload(objectId, assetId);

    try {
      assert.equal(existsSync(assetBlobPath), true);
      assert.doesNotThrow(() => saveCanvasObjectSchema.parse(payload));
      const saved = saveCanvasObject(db, ids.userId, ids.noteId, objectId, payload) as any;

      assert.equal(saved.canvasObject.kind, 'image');
      assert.equal(saved.canvasObject.backing, 'asset');
      assert.equal(saved.canvasObject.object_class, 'media');
      assert.equal(saved.imageObject.object_id, objectId);
      assert.equal(saved.imageObject.asset_id, assetId);
      assert.equal(saved.imageObject.fit, 'contain');
      assert.equal(saved.imageObject.caption, 'Power series convergence diagram');
      assert.equal(saved.contentMounts.length, 0);

      const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId) as any;
      assert.equal(persistence.imageObjects.length, 1);
      assert.equal(persistence.imageObjects[0]?.asset_id, assetId);
      assert.equal(persistence.contentMounts.some((mount: any) => mount.object_id === objectId), false);

      const deleted = deleteCanvasObject(db, ids.userId, ids.noteId, objectId);
      assert.equal(deleted.deleted, true);
      const extensionAfterDelete = db.prepare('SELECT object_id FROM image_object_extensions WHERE object_id = ?')
        .get(objectId);
      assert.equal(extensionAfterDelete, undefined);
      const assetAfterDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterDelete, undefined);
      assert.equal(existsSync(assetBlobPath), false);
    } finally {
      cleanupCanvasAssetBlobDir(ids.userId);
    }
  });
});

test('Image asset lifecycle keeps shared duplicate blobs until the final reference is deleted', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const assetId = seedCanvasImageAsset(db, ids, { writeBlob: true });
    const assetBlobPath = canvasAssetBlobPath(ids.userId, assetId);
    const originalObjectId = 'image-object-shared-original';
    const duplicateObjectId = 'image-object-shared-duplicate';

    try {
      saveCanvasObject(db, ids.userId, ids.noteId, originalObjectId, makeImageCanvasObjectPayload(originalObjectId, assetId));
      saveCanvasObject(db, ids.userId, ids.noteId, duplicateObjectId, makeImageCanvasObjectPayload(duplicateObjectId, assetId));

      assert.equal(existsSync(assetBlobPath), true);
      const extensionCountBeforeDelete = db.prepare(`
        SELECT COUNT(*) AS count
        FROM image_object_extensions
        WHERE user_id = ? AND asset_id = ?
      `).get(ids.userId, assetId) as { count: number };
      assert.equal(extensionCountBeforeDelete.count, 2);

      deleteCanvasObject(db, ids.userId, ids.noteId, originalObjectId);
      const assetAfterFirstDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterFirstDelete?.id, assetId);
      assert.equal(existsSync(assetBlobPath), true);

      deleteCanvasObject(db, ids.userId, ids.noteId, duplicateObjectId);
      const assetAfterFinalDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterFinalDelete, undefined);
      assert.equal(existsSync(assetBlobPath), false);
    } finally {
      cleanupCanvasAssetBlobDir(ids.userId);
    }
  });
});

test('Course delete releases exclusive image assets before cascade removes extensions', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const assetId = seedCanvasImageAsset(db, ids, { writeBlob: true });
    const assetBlobPath = canvasAssetBlobPath(ids.userId, assetId);
    const objectId = 'image-object-course-exclusive';

    try {
      saveCanvasObject(db, ids.userId, ids.noteId, objectId, makeImageCanvasObjectPayload(objectId, assetId));
      assert.equal(existsSync(assetBlobPath), true);

      await deleteCourseThroughRoute(ids.userId, ids.courseId);

      const extensionAfterDelete = db.prepare('SELECT object_id FROM image_object_extensions WHERE object_id = ?')
        .get(objectId);
      assert.equal(extensionAfterDelete, undefined);
      const assetAfterDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterDelete, undefined);
      assert.equal(existsSync(assetBlobPath), false);
    } finally {
      cleanupCanvasAssetBlobDir(ids.userId);
    }
  });
});

test('Course delete keeps cross-course shared image assets until the final course reference is deleted', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const other = seedCourseNoteForUser(db, ids.userId, 'Cross course shared asset note');
    const assetId = seedCanvasImageAsset(db, ids, { writeBlob: true });
    const assetBlobPath = canvasAssetBlobPath(ids.userId, assetId);
    const courseAObjectId = 'image-object-course-a-shared';
    const courseBObjectId = 'image-object-course-b-shared';

    try {
      saveCanvasObject(db, ids.userId, ids.noteId, courseAObjectId, makeImageCanvasObjectPayload(courseAObjectId, assetId));
      saveCanvasObject(db, ids.userId, other.noteId, courseBObjectId, makeImageCanvasObjectPayload(courseBObjectId, assetId));
      assert.equal(existsSync(assetBlobPath), true);

      await deleteCourseThroughRoute(ids.userId, ids.courseId);

      const assetAfterFirstCourseDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterFirstCourseDelete?.id, assetId);
      assert.equal(existsSync(assetBlobPath), true);
      const remainingExtension = db.prepare('SELECT object_id FROM image_object_extensions WHERE object_id = ?')
        .get(courseBObjectId) as { object_id: string } | undefined;
      assert.equal(remainingExtension?.object_id, courseBObjectId);

      await deleteCourseThroughRoute(ids.userId, other.courseId);

      const assetAfterFinalCourseDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterFinalCourseDelete, undefined);
      assert.equal(existsSync(assetBlobPath), false);
    } finally {
      cleanupCanvasAssetBlobDir(ids.userId);
    }
  });
});

test('Course delete releases same-course shared image assets only after all course references are removed', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const assetId = seedCanvasImageAsset(db, ids, { writeBlob: true });
    const assetBlobPath = canvasAssetBlobPath(ids.userId, assetId);
    const firstObjectId = 'image-object-same-course-shared-a';
    const secondObjectId = 'image-object-same-course-shared-b';

    try {
      saveCanvasObject(db, ids.userId, ids.noteId, firstObjectId, makeImageCanvasObjectPayload(firstObjectId, assetId));
      saveCanvasObject(db, ids.userId, ids.noteId, secondObjectId, makeImageCanvasObjectPayload(secondObjectId, assetId));
      assert.equal(existsSync(assetBlobPath), true);

      await deleteCourseThroughRoute(ids.userId, ids.courseId);

      const extensionCountAfterDelete = db.prepare(`
        SELECT COUNT(*) AS count
        FROM image_object_extensions
        WHERE user_id = ? AND asset_id = ?
      `).get(ids.userId, assetId) as { count: number };
      assert.equal(extensionCountAfterDelete.count, 0);
      const assetAfterDelete = db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
        .get(assetId, ids.userId) as { id: string } | undefined;
      assert.equal(assetAfterDelete, undefined);
      assert.equal(existsSync(assetBlobPath), false);
    } finally {
      cleanupCanvasAssetBlobDir(ids.userId);
    }
  });
});

test('Table CanvasObject saves structured rows columns and cells without becoming TextFlow content truth', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = 'table-object-power-series';
    const payload = makeTableCanvasObjectPayload(objectId);

    assert.doesNotThrow(() => saveCanvasObjectSchema.parse(payload));
    const saved = saveCanvasObject(db, ids.userId, ids.noteId, objectId, payload) as any;

    assert.equal(saved.canvasObject.kind, 'table');
    assert.equal(saved.canvasObject.backing, 'structured_object');
    assert.equal(saved.canvasObject.object_class, 'structured');
    assert.equal(saved.structuredObject.object_id, objectId);
    assert.equal(saved.structuredObject.structured_kind, 'table');
    assert.equal(saved.structuredObject.schema_version, 'table.v1');
    assert.equal(saved.structuredObject.row_count, 2);
    assert.equal(saved.structuredObject.column_count, 2);
    assert.equal(saved.structuredObject.payload.cells[1]?.text, 'Power series');
    assert.equal(saved.contentMounts.length, 0);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId) as any;
    assert.equal(persistence.structuredObjects.length, 1);
    assert.equal(persistence.structuredObjects[0]?.object_id, objectId);
    assert.equal(persistence.structuredObjects[0]?.payload.cells[3]?.text, 'Taylor polynomial');
    assert.equal(persistence.contentMounts.some((mount: any) => mount.object_id === objectId), false);

    const deleted = deleteCanvasObject(db, ids.userId, ids.noteId, objectId);
    assert.equal(deleted.deleted, true);
    const extensionAfterDelete = db.prepare('SELECT object_id FROM structured_object_extensions WHERE object_id = ?')
      .get(objectId);
    assert.equal(extensionAfterDelete, undefined);
  });
});

test('Table CanvasObject validator rejects malformed structured object payloads', () => {
  const validPayload = makeTableCanvasObjectPayload('table-object-validator');
  assert.doesNotThrow(() => saveCanvasObjectSchema.parse(validPayload));

  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    backing: 'none',
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    object_class: 'pure',
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    extension: undefined,
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    extension: {
      ...validPayload.extension,
      rows: [],
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    extension: {
      ...validPayload.extension,
      columns: [],
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    extension: {
      ...validPayload.extension,
      cells: validPayload.extension.cells.slice(0, 3),
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    extension: {
      ...validPayload.extension,
      cells: [
        ...validPayload.extension.cells,
        { ...validPayload.extension.cells[0], cellId: 'duplicate-cell-id' },
      ],
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    ...validPayload,
    contentMount: { target_id: 'not-allowed' },
  }));
});

test('PageFrame collection saves to CanvasObject tables', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);
    const collection = savePageFrameCollection(db, userId, noteId, {
      pageFrames: [{
        id: 'page-frame-1',
        role: 'primary_page_frame',
        x: 100,
        y: 160,
        width: 794,
        height: 1123,
        exportable: true,
        contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
      }],
      pageStacks: [{
        id: 'page-stack-1',
        displayName: 'Main stack',
        frameIds: ['page-frame-1'],
        primaryFrameId: 'page-frame-1',
        selectedFrameId: 'page-frame-1',
        collapsed: false,
        numbering: { enabled: true, startAt: 1 },
        layout: { direction: 'vertical', gap: 36, collapsedPreviewPages: 1 },
        createdFrom: 'a4_note_seed',
      }],
      primaryFrameId: 'page-frame-1',
      primaryStackId: 'page-stack-1',
      selectedFrameId: 'page-frame-1',
      selectedStackId: 'page-stack-1',
    });

    assert.equal(collection?.pageFrames.length, 1);
    const count = db.prepare("SELECT COUNT(*) AS count FROM canvas_objects WHERE note_id = ? AND kind = 'page_frame'")
      .get(noteId) as { count: number };
    assert.equal(count.count, 1);

    const persistence = getNoteCanvasPersistence(db, userId, noteId);
    assert.equal(persistence.pageFrameCollection?.primaryFrameId, 'page-frame-1');
    const pageStacks = persistence.pageFrameCollection?.pageStacks as Array<{ id: string }> | undefined;
    assert.equal(pageStacks?.[0]?.id, 'page-stack-1');
  });
});

test('PageFrame hydration survives a missing extension row when CanvasObject placement remains', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);
    savePageFrameCollection(db, userId, noteId, {
      pageFrames: [{
        id: 'page-frame-1',
        role: 'primary_page_frame',
        x: 100,
        y: 160,
        width: 794,
        height: 1123,
        exportable: true,
        contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
      }],
      pageStacks: [{
        id: 'page-stack-1',
        displayName: 'Main stack',
        frameIds: ['page-frame-1'],
        primaryFrameId: 'page-frame-1',
        selectedFrameId: 'page-frame-1',
        collapsed: false,
        numbering: { enabled: true, startAt: 1 },
        layout: { direction: 'vertical', gap: 36, collapsedPreviewPages: 1 },
        createdFrom: 'a4_note_seed',
      }],
      primaryFrameId: 'page-frame-1',
      primaryStackId: 'page-stack-1',
      selectedFrameId: 'page-frame-1',
      selectedStackId: 'page-stack-1',
    });

    db.prepare('DELETE FROM page_frame_extensions WHERE note_id = ? AND frame_id = ?')
      .run(noteId, 'page-frame-1');

    const persistence = getNoteCanvasPersistence(db, userId, noteId);
    assert.equal(persistence.pageFrameCollection?.pageFrames.length, 1);
    assert.equal(persistence.pageFrameCollection?.primaryFrameId, 'page-frame-1');
    assert.equal(persistence.pageFrameCollection?.pageFrames[0]?.x, 100);
    assert.equal(persistence.pageFrameCollection?.pageFrames[0]?.width, 794);
    const metadata = persistence.pageFrameCollection?.pageFrames[0]?.metadata as Record<string, unknown> | undefined;
    assert.equal(metadata?.recovered, true);
    assert.equal(metadata?.degraded, true);
    assert.equal(metadata?.recovered_reason, 'missing_extension_at_read');
  });
});

test('PageFrame extensions are scoped by note instead of globally unique frame ids', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const secondNoteId = seedNote(db, ids, 'Second A4 note');
    const sharedFrameId = 'primary-page-frame';

    const collection = (label: string) => ({
      pageFrames: [{
        id: sharedFrameId,
        role: 'primary_page_frame',
        x: 100,
        y: 160,
        width: 794,
        height: 1123,
        exportable: true,
        contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
      }],
      pageStacks: [{
        id: `${label}-stack`,
        displayName: label,
        frameIds: [sharedFrameId],
        primaryFrameId: sharedFrameId,
        selectedFrameId: sharedFrameId,
        collapsed: false,
        numbering: { enabled: true, startAt: 1 },
        layout: { direction: 'vertical', gap: 36, collapsedPreviewPages: 1 },
        createdFrom: 'a4_note_seed',
      }],
      primaryFrameId: sharedFrameId,
      primaryStackId: `${label}-stack`,
      selectedFrameId: sharedFrameId,
      selectedStackId: `${label}-stack`,
    });

    savePageFrameCollection(db, ids.userId, ids.noteId, collection('first'));
    savePageFrameCollection(db, ids.userId, secondNoteId, collection('second'));

    const rows = db.prepare(`
      SELECT note_id, frame_id
      FROM page_frame_extensions
      WHERE frame_id = ?
      ORDER BY note_id ASC
    `).all(sharedFrameId) as Array<{ note_id: string; frame_id: string }>;
    assert.equal(rows.length, 2);
    assert.deepEqual(new Set(rows.map((row) => row.note_id)), new Set([ids.noteId, secondNoteId]));
  });
});

test('PageFrame repair migration restores note-scoped extension rows after legacy frame-id collapse', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const secondNoteId = seedNote(db, ids, 'Second legacy A4 note');
    const sharedFrameId = 'primary-page-frame';

    writeLegacyPageFrameMetadata(db, ids.noteId, legacyPageFrameCollection({
      id: sharedFrameId,
      role: 'primary_page_frame',
      x: 100,
      y: 160,
      width: 794,
      height: 1123,
      pageSize: 'LETTER',
      contentInset: { top: 101, right: 81, bottom: 102, left: 82 },
      background: { kind: 'solid', color: '#fefefe' },
      exportable: true,
    }, 'first-stack'), { sibling_key: { keep: true } });
    writeLegacyPageFrameMetadata(db, secondNoteId, legacyPageFrameCollection({
      id: sharedFrameId,
      role: 'primary_page_frame',
      x: 220,
      y: 260,
      width: 794,
      height: 1123,
      pageSize: 'A4',
      contentInset: { top: 131, right: 91, bottom: 132, left: 92 },
      background: { kind: 'solid', color: '#ffffff' },
      exportable: true,
    }, 'second-stack'));

    resetCutoverTablesForBackfill(db);
    await runMigrations(db);

    const rows = db.prepare(`
      SELECT note_id, frame_id, content_inset_json, metadata
      FROM page_frame_extensions
      WHERE frame_id = ?
      ORDER BY note_id ASC
    `).all(sharedFrameId) as Array<{
      note_id: string;
      frame_id: string;
      content_inset_json: string;
      metadata: string;
    }>;
    assert.equal(rows.length, 2);
    assert.deepEqual(new Set(rows.map((row) => row.note_id)), new Set([ids.noteId, secondNoteId]));

    const recoveredRows = rows.filter((row) => JSON.parse(row.metadata).recovered === true);
    assert.equal(recoveredRows.length, 1);
    assert.deepEqual(JSON.parse(recoveredRows[0].content_inset_json), {
      top: 96,
      right: 72,
      bottom: 96,
      left: 72,
    });
  });
});

test('PageFrame repair migration restores missing extension from live legacy metadata', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const frameId = 'page-frame-legacy-repair';
    savePageFrameCollection(db, ids.userId, ids.noteId, {
      pageFrames: [{
        id: frameId,
        role: 'primary_page_frame',
        x: 100,
        y: 160,
        width: 794,
        height: 1123,
        pageSize: 'A4',
        contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
      }],
      pageStacks: [{
        id: 'repair-stack',
        frameIds: [frameId],
        primaryFrameId: frameId,
        selectedFrameId: frameId,
      }],
      primaryFrameId: frameId,
      primaryStackId: 'repair-stack',
      selectedFrameId: frameId,
      selectedStackId: 'repair-stack',
    });

    db.prepare('DELETE FROM page_frame_extensions WHERE note_id = ? AND frame_id = ?')
      .run(ids.noteId, frameId);
    writeLegacyPageFrameMetadata(db, ids.noteId, legacyPageFrameCollection({
      id: frameId,
      role: 'primary_page_frame',
      x: 100,
      y: 160,
      width: 794,
      height: 1123,
      pageSize: 'LETTER',
      contentInset: { top: 120, right: 88, bottom: 121, left: 89 },
      background: { kind: 'solid', color: '#f6f7fb' },
      templateId: 'letter-template',
      template: { name: 'Letter repair template' },
      slots: { header: { enabled: true } },
      exportable: false,
    }, 'repair-stack'));
    db.prepare("DELETE FROM db_migrations WHERE id = '043_v2_page_frame_extension_repair'").run();

    await runMigrations(db);

    const row = db.prepare(`
      SELECT page_size, content_inset_json, background_json, template_id, template_json, slots_json, exportable, metadata
      FROM page_frame_extensions
      WHERE note_id = ? AND frame_id = ?
    `).get(ids.noteId, frameId) as {
      page_size: string;
      content_inset_json: string;
      background_json: string;
      template_id: string;
      template_json: string;
      slots_json: string;
      exportable: number;
      metadata: string;
    } | undefined;

    assert.ok(row);
    assert.equal(row.page_size, 'LETTER');
    assert.deepEqual(JSON.parse(row.content_inset_json), { top: 120, right: 88, bottom: 121, left: 89 });
    assert.deepEqual(JSON.parse(row.background_json), { kind: 'solid', color: '#f6f7fb' });
    assert.equal(row.template_id, 'letter-template');
    assert.equal(JSON.parse(row.template_json).name, 'Letter repair template');
    assert.equal(JSON.parse(row.slots_json).header.enabled, true);
    assert.equal(row.exportable, 0);
    assert.equal(JSON.parse(row.metadata).recovered, undefined);
  });
});

test('Recovered PageFrame extension marker survives a load-save pass', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const frameId = 'page-frame-recovered-marker';
    savePageFrameCollection(db, ids.userId, ids.noteId, {
      pageFrames: [{
        id: frameId,
        role: 'primary_page_frame',
        x: 120,
        y: 180,
        width: 794,
        height: 1123,
      }],
      pageStacks: [{
        id: 'recovered-stack',
        frameIds: [frameId],
        primaryFrameId: frameId,
        selectedFrameId: frameId,
      }],
      primaryFrameId: frameId,
      primaryStackId: 'recovered-stack',
      selectedFrameId: frameId,
      selectedStackId: 'recovered-stack',
    });
    db.prepare('DELETE FROM page_frame_extensions WHERE note_id = ? AND frame_id = ?')
      .run(ids.noteId, frameId);
    db.prepare("DELETE FROM db_migrations WHERE id = '043_v2_page_frame_extension_repair'").run();

    await runMigrations(db);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    const frame = persistence.pageFrameCollection?.pageFrames[0] as any;
    assert.equal(frame?.metadata?.recovered, true);

    savePageFrameCollection(db, ids.userId, ids.noteId, persistence.pageFrameCollection as any);
    const row = db.prepare(`
      SELECT metadata
      FROM page_frame_extensions
      WHERE note_id = ? AND frame_id = ?
    `).get(ids.noteId, frameId) as { metadata: string } | undefined;
    assert.equal(JSON.parse(row?.metadata || '{}').recovered, true);
  });
});

test('Cutover migrations backfill legacy PageFrame, block layout, and AnnotationTruth data', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const { placementId } = seedBlockPlacement(db, ids);
    resetCutoverTablesForBackfill(db);

    db.prepare('UPDATE notes SET metadata = ? WHERE id = ?').run(JSON.stringify({
      canvas_engine_page_frames_v1: {
        version: 1,
        pageFrames: [{
          id: 'frame-a',
          role: 'primary_page_frame',
          x: 100,
          y: 160,
          width: 794,
          height: 1123,
          pageSize: 'A4',
          exportable: true,
          contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
          documentTypography: {
            fontFamily: 'Aptos',
            fontSize: 12,
            lineHeight: 1.45,
            paragraphSpacing: 8,
          },
          background: { kind: 'solid', color: '#ffffff' },
        }],
        pageStacks: [{
          id: 'stack-a',
          frameIds: ['frame-a'],
          primaryFrameId: 'frame-a',
          selectedFrameId: 'frame-a',
        }],
        primaryFrameId: 'frame-a',
        selectedFrameId: 'frame-a',
        primaryStackId: 'stack-a',
        selectedStackId: 'stack-a',
      },
      canvas_engine_annotations_v1: [{
        id: 'annotation-parent',
        raw_label: 'definition',
        ranges: [{
          id: 'annotation-parent-range',
          target_kind: 'text_span',
          block_id: 'block-a',
          start_offset: 0,
          end_offset: 12,
          range_text_cache: 'Power series',
          metadata: {
            anchor_status: 'pending',
            anchor_reason: 'legacy_stale',
            durable_note: 'keep me',
          },
        }],
        parent_annotation_id: null,
        child_annotation_ids: ['annotation-child'],
        visual_style: { color_token: 'blue', marker_kind: 'highlight' },
        created_by: 'human',
        status: 'active',
        metadata: { role: 'parent' },
      }, {
        id: 'annotation-child',
        raw_label: 'formula',
        ranges: [{
          id: 'annotation-child-range',
          target_kind: 'text_span',
          block_id: 'block-a',
          start_offset: 2,
          end_offset: 8,
          range_text_cache: 'series',
        }],
        parent_annotation_id: 'annotation-parent',
        child_annotation_ids: [],
        visual_style: { color_token: 'green', marker_kind: 'underline' },
        created_by: 'human',
        status: 'active',
        metadata: { role: 'child' },
      }],
      sibling_key: { keep: true },
    }), ids.noteId);

    await runMigrations(db);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    assert.equal(persistence.pageFrameCollection?.primaryFrameId, 'frame-a');
    assert.equal(persistence.blockLayouts.length, 1);
    assert.equal(persistence.blockLayouts[0]?.placement_id, placementId);

    const extension = db.prepare('SELECT typography_json FROM page_frame_extensions WHERE note_id = ? AND frame_id = ?')
      .get(ids.noteId, 'frame-a') as { typography_json: string };
    assert.equal(JSON.parse(extension.typography_json).fontFamily, 'Aptos');
    assert.equal(JSON.parse(extension.typography_json).fontSize, 12);

    const annotations = listAnnotationTruths(db, ids.userId, ids.noteId);
    assert.equal(annotations.length, 2);
    assert.equal(annotations.find((annotation) => annotation.id === 'annotation-parent')?.child_annotation_ids[0], 'annotation-child');
    assert.equal(annotations.find((annotation) => annotation.id === 'annotation-child')?.parent_annotation_id, 'annotation-parent');
    const migratedRange = db.prepare('SELECT metadata FROM annotation_ranges WHERE id = ?')
      .get('annotation-parent-range') as { metadata: string };
    const migratedRangeMetadata = JSON.parse(migratedRange.metadata);
    assert.equal(migratedRangeMetadata.anchor_status, undefined);
    assert.equal(migratedRangeMetadata.anchor_reason, undefined);
    assert.equal(migratedRangeMetadata.durable_note, 'keep me');

    const note = db.prepare('SELECT metadata FROM notes WHERE id = ?').get(ids.noteId) as { metadata: string };
    const metadata = JSON.parse(note.metadata);
    assert.equal(metadata.canvas_engine_page_frames_v1, undefined);
    assert.equal(metadata.canvas_engine_annotations_v1, undefined);
    assert.equal(metadata.sibling_key.keep, true);

    const placement = db.prepare('SELECT display_overrides_json FROM note_block_placements WHERE id = ?')
      .get(placementId) as { display_overrides_json: string };
    const overrides = JSON.parse(placement.display_overrides_json);
    assert.equal(overrides.better_notebook_layout, undefined);
    assert.equal(overrides.unrelated, true);
  });
});

test('AnnotationTruth legacy migration rejects duplicate ids before stripping note metadata', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const noteBId = seedNote(db, ids, 'Duplicate legacy annotation note');
    resetCutoverTablesForBackfill(db);

    db.prepare('UPDATE notes SET metadata = ? WHERE id = ?').run(JSON.stringify({
      canvas_engine_annotations_v1: [{
        id: 'legacy-duplicate-annotation',
        raw_label: 'definition',
        ranges: [],
        child_annotation_ids: [],
      }],
      note_marker: 'first',
    }), ids.noteId);
    db.prepare('UPDATE notes SET metadata = ? WHERE id = ?').run(JSON.stringify({
      canvas_engine_annotations_v1: [{
        id: 'legacy-duplicate-annotation',
        raw_label: 'theorem',
        ranges: [],
        child_annotation_ids: [],
      }],
      note_marker: 'second',
    }), noteBId);

    assert.throws(
      () => db.transaction(() => annotationTruthMigration.up(db))(),
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, /Duplicate legacy annotation id legacy-duplicate-annotation/);
        assert.match(message, new RegExp(ids.noteId));
        assert.match(message, new RegExp(noteBId));
        return true;
      },
    );

    const noteA = db.prepare('SELECT metadata FROM notes WHERE id = ?')
      .get(ids.noteId) as { metadata: string };
    const noteB = db.prepare('SELECT metadata FROM notes WHERE id = ?')
      .get(noteBId) as { metadata: string };
    assert.equal(JSON.parse(noteA.metadata).canvas_engine_annotations_v1.length, 1);
    assert.equal(JSON.parse(noteB.metadata).canvas_engine_annotations_v1.length, 1);

    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'annotation_truths'")
      .get() as { name: string } | undefined;
    if (table) {
      const rows = db.prepare('SELECT COUNT(*) AS count FROM annotation_truths')
        .get() as { count: number };
      assert.equal(rows.count, 0);
    }
  });
});

test('Block identity hardening migration repairs old block-id CanvasObject rows', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const noteAId = ids.noteId;
    const noteBId = seedNote(db, ids, 'Old bad projection target note');
    const { blockId, placementId: placementAId } = seedBlockPlacement(db, ids);
    const placementBId = seedSharedBlockPlacement(db, {
      userId: ids.userId,
      courseId: ids.courseId,
      noteId: noteBId,
      blockId,
    }, 0);
    db.prepare("DELETE FROM db_migrations WHERE id IN ('037_v2_canvas_object_block_identity_hardening', '038_v2_canvas_note_block_mount_uniqueness')").run();
    db.exec('DROP INDEX IF EXISTS idx_content_mounts_one_note_block_per_object');

    db.prepare(`
      INSERT INTO canvas_objects (
        id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
        status, source_json, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'paragraph_block_projection', 'note_block', 'block_backed',
        'active', '{}', ?, datetime('now'), datetime('now'))
    `).run(blockId, ids.userId, ids.courseId, noteBId, noteBId, JSON.stringify({ block_id: blockId }));

    const insertPlacement = db.prepare(`
      INSERT INTO canvas_placements (
        id, user_id, course_id, note_id, object_id, canvas_id,
        x, y, width, height, rotation, frame_id, surface, boundary_role,
        z_index, snap_state_json, visibility_state, render_visibility, metadata,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 300, 120, 0, NULL, ?, ?, 0, '{}', 'normal', 'visible', '{}',
        datetime('now'), datetime('now'))
    `);
    insertPlacement.run(placementAId, ids.userId, ids.courseId, noteAId, blockId, noteAId, 20, 30, 'formal_page', 'inside');
    insertPlacement.run(placementBId, ids.userId, ids.courseId, noteBId, blockId, noteBId, 420, 30, 'canvas_workspace', 'outside');

    const insertMount = db.prepare(`
      INSERT INTO content_mounts (
        id, user_id, course_id, note_id, object_id, target_kind, target_id,
        projection_mode, sync_policy, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'note_block', ?, 'owned', 'manual', '{}', datetime('now'), datetime('now'))
    `);
    insertMount.run(`content-mount:${placementAId}`, ids.userId, ids.courseId, noteAId, blockId, blockId);
    insertMount.run(`content-mount:${placementBId}`, ids.userId, ids.courseId, noteBId, blockId, blockId);

    await runMigrations(db);

    const noteA = getNoteCanvasPersistence(db, ids.userId, noteAId);
    const noteB = getNoteCanvasPersistence(db, ids.userId, noteBId);
    assert.equal(noteA.blockLayouts.length, 1);
    assert.equal(noteA.blockLayouts[0]?.placement_id, placementAId);
    assert.equal(noteB.blockLayouts.length, 1);
    assert.equal(noteB.blockLayouts[0]?.placement_id, placementBId);

    const placements = db.prepare(`
      SELECT id, object_id
      FROM canvas_placements
      WHERE id IN (?, ?)
      ORDER BY id ASC
    `).all(placementAId, placementBId) as Array<{ id: string; object_id: string }>;
    assert.equal(placements.length, 2);
    assert.notEqual(placements[0]?.object_id, blockId);
    assert.notEqual(placements[1]?.object_id, blockId);
    assert.notEqual(placements[0]?.object_id, placements[1]?.object_id);

    const oldObject = db.prepare('SELECT id FROM canvas_objects WHERE id = ?').get(blockId);
    assert.equal(oldObject, undefined);
  });
});

test('Generic CanvasObject pipeline round-trips and hard-deletes a test-only probe kind', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:probe-a`;
    const placementId = `canvas-placement:${ids.noteId}:probe-a`;
    const parsed = saveCanvasObjectSchema.parse({
      kind: '__test_probe',
      placement: {
        placement_id: placementId,
        x: 120,
        y: 180,
        width: 240,
        height: 96,
        surface: 'canvas_workspace',
        z_index: 12,
      },
      metadata: { role: 'pipeline-proof' },
    });

    const saved = saveCanvasObject(db, ids.userId, ids.noteId, objectId, parsed);
    assert.equal((saved.canvasObject as any).kind, '__test_probe');
    assert.equal((saved.canvasObject as any).metadata.role, 'pipeline-proof');
    assert.equal((saved.placement as any).placement_id, placementId);
    assert.equal((saved.placement as any).surface, 'canvas_workspace');
    assert.equal((saved.placement as any).z_index, 12);
    assert.equal((saved.placement as any).width, 240);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    assert.equal(persistence.canvasObjects.some((object) => object.object_id === objectId), true);
    assert.equal(persistence.canvasPlacements.some((placement) => placement.placement_id === placementId), true);

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, [{
      id: 'annotation-probe',
      note_id: ids.noteId,
      canvas_id: ids.noteId,
      raw_label: 'note',
      ranges: [{
        id: 'annotation-probe-range',
        target_kind: 'canvas_object',
        canvas_object_id: objectId,
        range_text_cache: 'probe',
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-28T00:00:00.000Z',
      updated_at: '2026-06-28T00:00:00.000Z',
      metadata: {},
    }]);

    const deleted = deleteCanvasObject(db, ids.userId, ids.noteId, objectId);
    assert.equal(deleted.deleted, true);
    assert.equal(db.prepare('SELECT id FROM canvas_objects WHERE id = ?').get(objectId), undefined);
    assert.equal(db.prepare('SELECT id FROM canvas_placements WHERE object_id = ?').get(objectId), undefined);
    const annotationRange = db.prepare('SELECT canvas_object_id FROM annotation_ranges WHERE id = ?')
      .get('annotation-probe-range') as { canvas_object_id: string | null };
    assert.equal(annotationRange.canvas_object_id, null);
  });
});

test('Shape CanvasObject round-trips through generic persistence without content mounts', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-rectangle-a`;
    const placementId = `canvas-placement:${ids.noteId}:shape-rectangle-a`;
    const parsed = saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'none',
      object_class: 'pure',
      metadata: { shape_type: 'rectangle' },
      source: { source: 'user_created' },
      placement: {
        placement_id: placementId,
        x: 160,
        y: 140,
        width: 180,
        height: 110,
        rotation: 0,
        surface: 'canvas_workspace',
        z_index: 30,
      },
    });

    const saved = saveCanvasObject(db, ids.userId, ids.noteId, objectId, parsed);
    assert.equal((saved.canvasObject as any).kind, 'shape');
    assert.equal((saved.canvasObject as any).backing, 'none');
    assert.equal((saved.canvasObject as any).object_class, 'pure');
    assert.equal((saved.canvasObject as any).metadata.shape_type, 'rectangle');
    assert.equal((saved.placement as any).placement_id, placementId);
    assert.equal((saved.placement as any).surface, 'canvas_workspace');
    assert.equal((saved.placement as any).z_index, 30);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    const persistedShape = persistence.canvasObjects.find((object) => object.object_id === objectId);
    const persistedPlacement = persistence.canvasPlacements.find((placement) => placement.placement_id === placementId);
    assert.equal(persistedShape?.kind, 'shape');
    assert.equal(persistedShape?.metadata.shape_type, 'rectangle');
    assert.equal(persistedPlacement?.object_id, objectId);
    assert.equal(persistedPlacement?.width, 180);
    assert.equal(persistence.contentMounts.some((mount) => mount.object_id === objectId), false);
  });
});

test('Shape CanvasObject delete cascades placement rows', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-delete-a`;
    const placementId = `canvas-placement:${ids.noteId}:shape-delete-a`;
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'none',
      object_class: 'pure',
      metadata: { shape_type: 'ellipse' },
      placement: {
        placement_id: placementId,
        x: 220,
        y: 180,
        width: 160,
        height: 110,
        surface: 'canvas_workspace',
      },
    }));

    const deleted = deleteCanvasObject(db, ids.userId, ids.noteId, objectId);

    assert.equal(deleted.deleted, true);
    assert.equal(db.prepare('SELECT id FROM canvas_objects WHERE id = ?').get(objectId), undefined);
    assert.equal(db.prepare('SELECT id FROM canvas_placements WHERE object_id = ?').get(objectId), undefined);
  });
});

test('Visual Connector CanvasObject round-trips with visual-only endpoints', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const startShapeId = `canvas-object:${ids.noteId}:connector-start-shape`;
    const endShapeId = `canvas-object:${ids.noteId}:connector-end-shape`;
    saveCanvasObject(db, ids.userId, ids.noteId, startShapeId, saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'none',
      object_class: 'pure',
      metadata: { shape_type: 'rectangle' },
      placement: {
        placement_id: `${startShapeId}:placement`,
        x: 120,
        y: 160,
        width: 160,
        height: 100,
        surface: 'canvas_workspace',
      },
    }));
    saveCanvasObject(db, ids.userId, ids.noteId, endShapeId, saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'none',
      object_class: 'pure',
      metadata: { shape_type: 'ellipse' },
      placement: {
        placement_id: `${endShapeId}:placement`,
        x: 420,
        y: 260,
        width: 140,
        height: 140,
        surface: 'canvas_workspace',
      },
    }));

    const connectorId = `canvas-object:${ids.noteId}:visual-connector-a`;
    const saved = saveCanvasObject(db, ids.userId, ids.noteId, connectorId, saveCanvasObjectSchema.parse({
      kind: 'visual_connector',
      backing: 'none',
      object_class: 'pure',
      metadata: { connector_type: 'straight' },
      placement: {
        placement_id: `${connectorId}:placement`,
        x: 200,
        y: 210,
        width: 290,
        height: 120,
        surface: 'canvas_workspace',
        z_index: 44,
      },
      extension: {
        start: { kind: 'object', object_id: startShapeId, anchor: 'center' },
        end: { kind: 'object', object_id: endShapeId, anchor: 'center' },
        line_style: 'solid',
        stroke: '#94a3b8',
        stroke_width: 1.5,
        start_marker: 'none',
        end_marker: 'arrow',
        relation_kind: 'visual_only',
      },
    }));

    assert.equal((saved.canvasObject as any).kind, 'visual_connector');
    assert.equal((saved.canvasObject as any).backing, 'none');
    assert.equal((saved.canvasObject as any).object_class, 'pure');
    assert.equal((saved.visualConnector as any).relation_kind, 'visual_only');
    assert.equal((saved.visualConnector as any).start_object_id, startShapeId);
    assert.equal((saved.visualConnector as any).end_object_id, endShapeId);
    assert.equal((saved.visualConnector as any).end_marker, 'arrow');
    assert.equal((saved.contentMounts as any[]).length, 0);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    const persistedConnector = persistence.visualConnectors.find((connector: any) => connector.object_id === connectorId);
    assert.equal(persistedConnector?.relation_kind, 'visual_only');
    assert.equal(persistedConnector?.start_object_id, startShapeId);
    assert.equal(persistedConnector?.end_object_id, endShapeId);
    assert.equal(persistence.contentMounts.some((mount) => mount.object_id === connectorId), false);
  });
});

test('Visual Connector accepts point endpoints but rejects semantic or content-backed payloads', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const connectorId = `canvas-object:${ids.noteId}:visual-connector-point`;
    const placement = {
      placement_id: `${connectorId}:placement`,
      x: 20,
      y: 40,
      width: 260,
      height: 160,
      surface: 'canvas_workspace',
    };

    const parsed = saveCanvasObjectSchema.parse({
      kind: 'visual_connector',
      backing: 'none',
      object_class: 'pure',
      metadata: { connector_type: 'straight' },
      placement,
      extension: {
        start: { kind: 'point', x: 20, y: 40 },
        end: { kind: 'point', x: 280, y: 200 },
        relation_kind: 'visual_only',
      },
    });
    const saved = saveCanvasObject(db, ids.userId, ids.noteId, connectorId, parsed);
    assert.equal((saved.visualConnector as any).start_kind, 'point');
    assert.equal((saved.visualConnector as any).start_x, 20);
    assert.equal((saved.visualConnector as any).end_y, 200);

    assert.throws(() => saveCanvasObjectSchema.parse({
      kind: 'visual_connector',
      backing: 'none',
      object_class: 'pure',
      placement,
      extension: {
        start: { kind: 'point', x: 0, y: 0 },
        end: { kind: 'point', x: 100, y: 100 },
        relation_kind: 'derives_to',
      },
    }));
    assert.throws(() => saveCanvasObjectSchema.parse({
      kind: 'visual_connector',
      backing: 'note_block',
      object_class: 'block_backed',
      placement,
      extension: {
        start: { kind: 'point', x: 0, y: 0 },
        end: { kind: 'point', x: 100, y: 100 },
        relation_kind: 'visual_only',
      },
    }));
    assert.throws(() => saveCanvasObjectSchema.parse({
      kind: 'visual_connector',
      backing: 'none',
      object_class: 'pure',
      placement,
      extension: {
        start: { kind: 'point', x: 0, y: 0 },
        end: { kind: 'point', x: 100, y: 100 },
        relation_kind: 'visual_only',
      },
      mount: { target_id: 'not-allowed' },
    }));
  });
});

test('Deleting a Visual Connector endpoint object hard-deletes the connector', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const startShapeId = `canvas-object:${ids.noteId}:endpoint-cleanup-start`;
    const endShapeId = `canvas-object:${ids.noteId}:endpoint-cleanup-end`;
    for (const [objectId, x] of [[startShapeId, 100], [endShapeId, 420]] as const) {
      saveCanvasObject(db, ids.userId, ids.noteId, objectId, saveCanvasObjectSchema.parse({
        kind: 'shape',
        backing: 'none',
        object_class: 'pure',
        metadata: { shape_type: 'rectangle' },
        placement: {
          placement_id: `${objectId}:placement`,
          x,
          y: 160,
          width: 160,
          height: 100,
          surface: 'canvas_workspace',
        },
      }));
    }
    const connectorId = `canvas-object:${ids.noteId}:endpoint-cleanup-connector`;
    saveCanvasObject(db, ids.userId, ids.noteId, connectorId, saveCanvasObjectSchema.parse({
      kind: 'visual_connector',
      backing: 'none',
      object_class: 'pure',
      placement: {
        placement_id: `${connectorId}:placement`,
        x: 180,
        y: 210,
        width: 320,
        height: 0,
        surface: 'canvas_workspace',
      },
      extension: {
        start: { kind: 'object', object_id: startShapeId, anchor: 'center' },
        end: { kind: 'object', object_id: endShapeId, anchor: 'center' },
        relation_kind: 'visual_only',
      },
    }));

    deleteCanvasObject(db, ids.userId, ids.noteId, startShapeId);

    assert.equal(db.prepare('SELECT id FROM canvas_objects WHERE id = ?').get(startShapeId), undefined);
    assert.equal(db.prepare('SELECT id FROM canvas_objects WHERE id = ?').get(connectorId), undefined);
    assert.equal(db.prepare('SELECT object_id FROM visual_connector_extensions WHERE object_id = ?').get(connectorId), undefined);
  });
});

test('Block-backed Shape CanvasObject round-trips with an owned note_block mount', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-block-backed-a`;
    const placementId = `canvas-placement:${ids.noteId}:shape-block-backed-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);

    const saved = saveCanvasObject(db, ids.userId, ids.noteId, objectId, saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'note_block',
      object_class: 'block_backed',
      metadata: {
        shape_type: 'rectangle',
        object_style: {
          preset_id: 'shape.sticky_note',
          family: 'shape',
          variant: 'yellow',
          text_inset: 12,
        },
      },
      extension: { block_id: blockId },
      mount: {
        mount_id: `${objectId}:mount:shape-text`,
        target_id: blockId,
        projection_mode: 'owned',
        sync_policy: 'manual',
      },
      placement: {
        placement_id: placementId,
        x: 260,
        y: 180,
        width: 220,
        height: 120,
        rotation: 0,
        surface: 'canvas_workspace',
        z_index: 35,
      },
    }));

    assert.equal((saved.canvasObject as any).kind, 'shape');
    assert.equal((saved.canvasObject as any).backing, 'note_block');
    assert.equal((saved.canvasObject as any).object_class, 'block_backed');
    assert.equal((saved.contentMount as any).target_id, blockId);
    assert.equal((saved.contentMount as any).projection_mode, 'owned');

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    const persistedShape = persistence.canvasObjects.find((object) => object.object_id === objectId);
    const persistedMount = persistence.contentMounts.find((mount) => mount.object_id === objectId);
    assert.equal(persistedShape?.backing, 'note_block');
    assert.equal(persistedShape?.object_class, 'block_backed');
    assert.equal((persistedShape?.metadata as any)?.object_style?.preset_id, 'shape.sticky_note');
    assert.equal((persistedShape?.metadata as any)?.object_style?.text_inset, 12);
    assert.equal(persistedMount?.target_kind, 'note_block');
    assert.equal(persistedMount?.target_id, blockId);
  });
});

test('Projection snapshot excludes canvas object backing blocks', async () => {
  await withDb(async (db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-snapshot-backed-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    const { blockId: normalBlockId } = seedBlockPlacement(db, ids);
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, blockBackedShapePayload(ids, objectId, blockId, 'snapshot-backed-a'));

    const projectionsModule = await import('../routes/projections.js');
    const buildSnapshotFromNote = (projectionsModule as any).__testBuildSnapshotFromNote;
    assert.equal(typeof buildSnapshotFromNote, 'function');

    const built = buildSnapshotFromNote(ids.noteId, ids.userId, ids.courseId);
    assert.equal(
      built.snapshot.blocks.some((block: { id: string }) => block.id === blockId),
      false,
    );
    assert.equal(
      built.snapshot.blocks.some((block: { id: string }) => block.id === normalBlockId),
      true,
    );
  });
});

test('Canvas persistence keeps block-backed shape geometry when backing block is trashed', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-trashed-backed-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, blockBackedShapePayload(ids, objectId, blockId, 'trashed-backed-a'));

    db.prepare("UPDATE note_blocks SET status = 'trashed' WHERE id = ?").run(blockId);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    assert.equal(persistence.canvasObjects.some((object) => object.object_id === objectId), true);
    assert.equal(persistence.canvasPlacements.some((placement) => placement.object_id === objectId), true);
    assert.equal(persistence.contentMounts.some((mount) => mount.object_id === objectId), false);
  });
});

test('Paragraph block projection still disappears when its backing block is trashed', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId, placementId } = seedBlockPlacement(db, ids);
    saveBlockCanvasPlacement(db, ids.userId, ids.noteId, placementId, {
      block_id: blockId,
      layout: {
        x: 120,
        y: 140,
        width: 360,
        height: 120,
        surface: 'canvas_workspace',
      },
    });
    const objectId = `canvas-object:${ids.noteId}:block-placement:${placementId}`;

    db.prepare("UPDATE note_blocks SET status = 'trashed' WHERE id = ?").run(blockId);

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    assert.equal(persistence.canvasObjects.some((object) => object.object_id === objectId), false);
    assert.equal(persistence.canvasPlacements.some((placement) => placement.object_id === objectId), false);
    assert.equal(persistence.blockLayouts.some((layout) => layout.block_id === blockId), false);
  });
});

test('Live shape backing block cannot be independently trashed but demoted shape releases it', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-live-backing-guard-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, blockBackedShapePayload(ids, objectId, blockId, 'live-backing-guard-a'));

    assert.throws(
      () => assertNoteBlockStatusChangeAllowed(db, ids.userId, blockId, 'trashed'),
      /managed by a live Canvas shape/,
    );

    saveCanvasObject(db, ids.userId, ids.noteId, objectId, pureShapePayload(ids, objectId, 'live-backing-guard-a'));
    assert.doesNotThrow(() => assertNoteBlockStatusChangeAllowed(db, ids.userId, blockId, 'trashed'));
  });
});

test('Demoting block-backed shape clears its content mount and note block placement without hard-deleting the block', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-demote-cleanup-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, blockBackedShapePayload(ids, objectId, blockId, 'demote-cleanup-a'));

    saveCanvasObject(db, ids.userId, ids.noteId, objectId, pureShapePayload(ids, objectId, 'demote-cleanup-a'));

    const block = db.prepare('SELECT status FROM note_blocks WHERE id = ?').get(blockId) as { status: string };
    const placementCount = db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE block_id = ?')
      .get(blockId) as { count: number };
    const mountCount = db.prepare('SELECT COUNT(*) AS count FROM content_mounts WHERE target_id = ?')
      .get(blockId) as { count: number };
    assert.equal(block.status, 'trashed');
    assert.equal(placementCount.count, 0);
    assert.equal(mountCount.count, 0);
  });
});

test('Restoring an orphaned canvas-object backing block strips backing metadata and recreates an ordinary note placement', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-restore-orphan-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, blockBackedShapePayload(ids, objectId, blockId, 'restore-orphan-a'));
    deleteCanvasObject(db, ids.userId, ids.noteId, objectId);

    const restored = restoreNoteBlockForCanvasLifecycle(db, ids.userId, blockId) as { metadata: Record<string, unknown> };

    const placementCount = db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE note_id = ? AND block_id = ?')
      .get(ids.noteId, blockId) as { count: number };
    assert.equal(restored.metadata.render_scope, undefined);
    assert.equal(restored.metadata.projection_kind, undefined);
    assert.equal(restored.metadata.shape_object_id, undefined);
    assert.equal(placementCount.count, 1);
  });
});

test('Block-backed Shape CanvasObject rejects missing or mismatched backing block payloads', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-invalid-backed-a`;
    const placement = {
      placement_id: `canvas-placement:${ids.noteId}:shape-invalid-backed-a`,
      x: 0,
      y: 0,
      width: 120,
      height: 90,
      surface: 'canvas_workspace',
    };
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    const otherBlock = seedShapeBackingBlock(db, ids, `${objectId}:other`);

    assert.throws(() => saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'note_block',
      object_class: 'block_backed',
      metadata: { shape_type: 'rectangle' },
      placement,
    }));
    assert.throws(() => saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'note_block',
      object_class: 'block_backed',
      metadata: { shape_type: 'rectangle' },
      extension: { block_id: blockId },
      mount: { target_id: otherBlock.blockId },
      placement,
    }));
    assert.throws(() => saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'none',
      object_class: 'pure',
      metadata: { shape_type: 'rectangle' },
      extension: { block_id: blockId },
      placement,
    }));
  });
});

test('Deleting a block-backed Shape CanvasObject removes its owned backing block from active note content', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:shape-delete-backed-a`;
    const { blockId } = seedShapeBackingBlock(db, ids, objectId);
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, saveCanvasObjectSchema.parse({
      kind: 'shape',
      backing: 'note_block',
      object_class: 'block_backed',
      metadata: { shape_type: 'ellipse' },
      extension: { block_id: blockId },
      mount: {
        mount_id: `${objectId}:mount:shape-text`,
        target_id: blockId,
        projection_mode: 'owned',
      },
      placement: {
        placement_id: `canvas-placement:${ids.noteId}:shape-delete-backed-a`,
        x: 200,
        y: 180,
        width: 180,
        height: 120,
        surface: 'canvas_workspace',
      },
    }));

    const deleted = deleteCanvasObject(db, ids.userId, ids.noteId, objectId);

    assert.equal(deleted.deleted, true);
    assert.equal(db.prepare('SELECT id FROM content_mounts WHERE object_id = ?').get(objectId), undefined);
    const backing = db.prepare('SELECT status FROM note_blocks WHERE id = ?')
      .get(blockId) as { status: string } | undefined;
    assert.notEqual(backing?.status, 'active');
  });
});

test('Shape CanvasObject validator rejects malformed payloads', () => {
  assert.throws(() => saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'none',
    object_class: 'pure',
    metadata: { shape_type: 'triangle' },
    placement: {
      placement_id: 'shape-placement-invalid-type',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'none',
    object_class: 'pure',
    metadata: { shape_type: 'rectangle' },
    placement: {
      placement_id: 'shape-placement-invalid-width',
      x: 0,
      y: 0,
      width: -1,
      height: 100,
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'note_block',
    object_class: 'pure',
    metadata: { shape_type: 'rectangle' },
    placement: {
      placement_id: 'shape-placement-invalid-backing',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'none',
    object_class: 'block_backed',
    metadata: { shape_type: 'rectangle' },
    placement: {
      placement_id: 'shape-placement-invalid-class',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  }));
  assert.throws(() => saveCanvasObjectSchema.parse({
    kind: 'shape',
    backing: 'none',
    object_class: 'pure',
    metadata: {
      shape_type: 'rectangle',
      object_style: {
        preset_id: 'shape.sticky_note',
        family: 'shape',
        variant: 'yellow',
      },
    },
    placement: {
      placement_id: 'shape-placement-invalid-sticky-pure',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  }));
});

test('Block projection rejects duplicate note_block mounts and never fans out blockLayouts', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId, placementId } = seedBlockPlacement(db, ids);
    saveBlockCanvasPlacement(db, ids.userId, ids.noteId, placementId, {
      block_id: blockId,
      layout: {
        x: 24,
        y: 48,
        width: 360,
        height: 160,
        surface: 'formal_page',
      },
    });
    const objectId = `canvas-object:${ids.noteId}:block-placement:${placementId}`;
    const secondBlockId = uuidv4();
    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, 'paragraph', '{}', 'Second duplicate mount target.', '{}', datetime('now'), datetime('now'))
    `).run(secondBlockId, ids.userId, ids.courseId);
    assert.throws(() => {
      db.prepare(`
        INSERT INTO content_mounts (
          id, user_id, course_id, note_id, object_id, target_kind, target_id,
          projection_mode, sync_policy, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'note_block', ?, 'owned', 'manual', '{}', datetime('now'), datetime('now'))
      `).run(`content-mount:${placementId}:duplicate`, ids.userId, ids.courseId, ids.noteId, objectId, secondBlockId);
    });

    const persistence = getNoteCanvasPersistence(db, ids.userId, ids.noteId);
    assert.equal(persistence.blockLayouts.length, 1);
    assert.equal(persistence.blockLayouts[0]?.placement_id, placementId);
    assert.equal(persistence.blockLayouts[0]?.block_id, blockId);
  });
});

test('Block projection delete cascades placement and content mount rows', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId, placementId } = seedBlockPlacement(db, ids);
    saveBlockCanvasPlacement(db, ids.userId, ids.noteId, placementId, {
      block_id: blockId,
      layout: {
        x: 24,
        y: 48,
        width: 360,
        height: 160,
        surface: 'formal_page',
      },
    });
    const objectId = `canvas-object:${ids.noteId}:block-placement:${placementId}`;

    deleteCanvasObject(db, ids.userId, ids.noteId, objectId);

    const placementCount = db.prepare('SELECT COUNT(*) AS count FROM canvas_placements WHERE object_id = ?')
      .get(objectId) as { count: number };
    const mountCount = db.prepare('SELECT COUNT(*) AS count FROM content_mounts WHERE object_id = ?')
      .get(objectId) as { count: number };
    assert.equal(placementCount.count, 0);
    assert.equal(mountCount.count, 0);
  });
});

test('Generic CanvasObject delete clears ContentGroupMember soft pointers', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const objectId = `canvas-object:${ids.noteId}:probe-member`;
    saveCanvasObject(db, ids.userId, ids.noteId, objectId, saveCanvasObjectSchema.parse({
      kind: '__test_probe',
      placement: {
        placement_id: `canvas-placement:${ids.noteId}:probe-member`,
        x: 120,
        y: 180,
        width: 240,
        height: 96,
        surface: 'canvas_workspace',
      },
    }));
    const groupId = uuidv4();
    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO content_groups (
        id, user_id, course_id, note_id, canvas_id, title, status, created_by,
        placements_json, members_json, fragments_json, petals_json, view_state_json, metadata,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'Canvas object member group', 'active', 'human',
        '[]', '[]', '[]', '[]', '{}', '{}', datetime('now'), datetime('now'))
    `).run(groupId, ids.userId, ids.courseId, ids.noteId, ids.noteId);
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, note_id,
        kind, target_id, label, current_content, preview_text,
        content_range_json, source_ref_json, source_sync_status,
        order_index, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'canvas_object', ?, 'Probe object', NULL, NULL,
        NULL, NULL, 'fresh', 0, '{}', datetime('now'), datetime('now'))
    `).run(memberId, ids.userId, groupId, ids.courseId, ids.noteId, objectId);

    deleteCanvasObject(db, ids.userId, ids.noteId, objectId);

    const member = db.prepare('SELECT target_id, source_sync_status FROM content_group_members WHERE id = ?')
      .get(memberId) as { target_id: string | null; source_sync_status: string };
    assert.equal(member.target_id, null);
    assert.equal(member.source_sync_status, 'stale');
  });
});

test('Generic CanvasObject validator rejects malformed probe payloads', () => {
  assert.throws(() => saveCanvasObjectSchema.parse({
    kind: '__test_probe',
    placement: {
      placement_id: 'probe-placement',
      x: '120',
      y: 180,
      width: 240,
      height: 96,
    },
  }));
});

test('Generic CanvasObject delete refuses PageFrame collection objects', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);
    savePageFrameCollection(db, userId, noteId, {
      pageFrames: [{
        id: 'page-frame-delete-guard',
        role: 'primary_page_frame',
        x: 0,
        y: 0,
        width: 794,
        height: 1123,
      }],
      pageStacks: [],
      primaryFrameId: 'page-frame-delete-guard',
      selectedFrameId: 'page-frame-delete-guard',
    });

    assert.throws(
      () => deleteCanvasObject(db, userId, noteId, `canvas-object:${noteId}:page-frame:page-frame-delete-guard`),
      /PageFrame objects must be deleted through page-frame-collection/,
    );
  });
});

test('Generic CanvasObject save refuses PageFrame kind-flip by existing object id', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);
    savePageFrameCollection(db, userId, noteId, {
      pageFrames: [{
        id: 'page-frame-save-guard',
        role: 'primary_page_frame',
        x: 0,
        y: 0,
        width: 794,
        height: 1123,
      }],
      pageStacks: [],
      primaryFrameId: 'page-frame-save-guard',
      selectedFrameId: 'page-frame-save-guard',
    });

    assert.throws(
      () => saveCanvasObject(
        db,
        userId,
        noteId,
        `canvas-object:${noteId}:page-frame:page-frame-save-guard`,
        saveCanvasObjectSchema.parse({
          kind: '__test_probe',
          placement: {
            placement_id: `canvas-object:${noteId}:page-frame:page-frame-save-guard:probe-placement`,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            surface: 'canvas_workspace',
          },
        }),
      ),
      /PageFrame objects must be saved through page-frame-collection/,
    );
  });
});

test('Block layout saves to canvas_placements and strips legacy placement override', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId, placementId } = seedBlockPlacement(db, ids);

    const saved = saveBlockCanvasPlacement(db, ids.userId, ids.noteId, placementId, {
      block_id: blockId,
      layout: {
        x: 24,
        y: 48,
        width: 360,
        height: 160,
        surface: 'formal_page',
        export_role: 'included',
        ai_visibility: 'visible',
      },
    });

    assert.equal(saved.block_id, blockId);
    assert.equal(saved.layout.x, 24);
    const placement = db.prepare('SELECT x, width FROM canvas_placements WHERE id = ?')
      .get(placementId) as { x: number; width: number };
    assert.equal(placement.x, 24);
    assert.equal(placement.width, 360);

    const legacy = db.prepare('SELECT display_overrides_json FROM note_block_placements WHERE id = ?')
      .get(placementId) as { display_overrides_json: string };
    const parsed = JSON.parse(legacy.display_overrides_json);
    assert.equal(parsed.better_notebook_layout, undefined);
    assert.equal(parsed.unrelated, true);
  });
});

test('AnnotationTruth saves as root records with child ranges', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);

    const saved = replaceNoteAnnotationTruths(db, userId, noteId, [{
      id: 'annotation-a',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'definition',
      ranges: [{
        id: 'annotation-a-range-1',
        target_kind: 'text_span',
        block_id: 'block-a',
        start_offset: 0,
        end_offset: 12,
        range_text_cache: 'Power series',
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }]);

    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.ranges.length, 1);

    const listed = listAnnotationTruths(db, userId, noteId);
    assert.equal(listed[0]?.raw_label, 'definition');
    assert.equal(listed[0]?.ranges[0]?.range_text_cache, 'Power series');
  });
});

test('AnnotationTruth pending anchor status is read-time only across trash save restore', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId } = seedBlockPlacement(db, ids);

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, [{
      id: 'annotation-live-anchor',
      note_id: ids.noteId,
      canvas_id: ids.noteId,
      raw_label: 'definition',
      ranges: [{
        id: 'annotation-live-anchor-range',
        target_kind: 'text_span',
        block_id: blockId,
        start_offset: 2,
        end_offset: 7,
        range_text_cache: 'power',
        metadata: { reviewer_note: 'durable-user-metadata' },
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      metadata: {},
    }]);

    const active = listAnnotationTruths(db, ids.userId, ids.noteId);
    assert.equal(rangeMetadata(active[0]?.ranges[0]).anchor_status, undefined);
    assert.equal(storedAnnotationRangeMetadata(db, 'annotation-live-anchor-range').anchor_status, undefined);

    db.prepare("UPDATE note_blocks SET status = 'trashed' WHERE id = ?").run(blockId);
    const pending = listAnnotationTruths(db, ids.userId, ids.noteId);
    assert.equal(rangeMetadata(pending[0]?.ranges[0]).anchor_status, 'pending');
    assert.equal(rangeMetadata(pending[0]?.ranges[0]).anchor_reason, 'block_not_active');

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, pending as any);
    const storedDuringPending = storedAnnotationRangeMetadata(db, 'annotation-live-anchor-range');
    assert.equal(storedDuringPending.anchor_status, undefined);
    assert.equal(storedDuringPending.anchor_reason, undefined);
    assert.equal(storedDuringPending.reviewer_note, 'durable-user-metadata');

    db.prepare("UPDATE note_blocks SET status = 'active' WHERE id = ?").run(blockId);
    const restored = listAnnotationTruths(db, ids.userId, ids.noteId);
    const restoredRange = restored[0]?.ranges[0];
    assert.equal(rangeMetadata(restoredRange).anchor_status, undefined);
    assert.equal(rangeMetadata(restoredRange).anchor_reason, undefined);
    assert.equal(restoredRange?.start_offset, 2);
    assert.equal(restoredRange?.end_offset, 7);

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, restored as any);
    const storedAfterRoundTrip = storedAnnotationRangeMetadata(db, 'annotation-live-anchor-range');
    assert.equal(storedAfterRoundTrip.anchor_status, undefined);
    assert.equal(storedAfterRoundTrip.anchor_reason, undefined);
    assert.equal(storedAfterRoundTrip.reviewer_note, 'durable-user-metadata');
  });
});

test('AnnotationTruth read side strips stale durable anchor status from healthy ranges', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId } = seedBlockPlacement(db, ids);

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, [{
      id: 'annotation-stale-durable-anchor',
      note_id: ids.noteId,
      canvas_id: ids.noteId,
      raw_label: 'definition',
      ranges: [{
        id: 'annotation-stale-durable-anchor-range',
        target_kind: 'text_span',
        block_id: blockId,
        start_offset: 1,
        end_offset: 5,
        range_text_cache: 'ower',
        metadata: { durable_note: 'keep' },
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      metadata: {},
    }]);

    db.prepare('UPDATE annotation_ranges SET metadata = ? WHERE id = ?')
      .run(JSON.stringify({
        anchor_status: 'pending',
        anchor_reason: 'legacy_stale',
        durable_note: 'keep',
      }), 'annotation-stale-durable-anchor-range');

    const listed = listAnnotationTruths(db, ids.userId, ids.noteId);
    const listedRange = listed[0]?.ranges[0];
    assert.equal(rangeMetadata(listedRange).anchor_status, undefined);
    assert.equal(rangeMetadata(listedRange).anchor_reason, undefined);
    assert.equal(rangeMetadata(listedRange).durable_note, 'keep');
    assert.equal(listedRange?.start_offset, 1);
    assert.equal(listedRange?.end_offset, 5);
  });
});

test('AnnotationTruth offset_out_of_bounds pending state recomputes when source text grows', async () => {
  await withDb((db) => {
    const ids = seedUserCourseNote(db);
    const { blockId } = seedBlockPlacement(db, ids);

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, [{
      id: 'annotation-oob-anchor',
      note_id: ids.noteId,
      canvas_id: ids.noteId,
      raw_label: 'example',
      ranges: [{
        id: 'annotation-oob-anchor-range',
        target_kind: 'text_span',
        block_id: blockId,
        start_offset: 4,
        end_offset: 72,
        range_text_cache: 'long future source quote',
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'yellow', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      metadata: {},
    }]);

    const pending = listAnnotationTruths(db, ids.userId, ids.noteId);
    assert.equal(rangeMetadata(pending[0]?.ranges[0]).anchor_status, 'pending');
    assert.equal(rangeMetadata(pending[0]?.ranges[0]).anchor_reason, 'offset_out_of_bounds');

    replaceNoteAnnotationTruths(db, ids.userId, ids.noteId, pending as any);
    const storedDuringPending = storedAnnotationRangeMetadata(db, 'annotation-oob-anchor-range');
    assert.equal(storedDuringPending.anchor_status, undefined);
    assert.equal(storedDuringPending.anchor_reason, undefined);

    db.prepare('UPDATE note_blocks SET plain_text = ? WHERE id = ?')
      .run('A power series is an infinite series with enough restored context to cover the old offsets.', blockId);

    const restored = listAnnotationTruths(db, ids.userId, ids.noteId);
    assert.equal(rangeMetadata(restored[0]?.ranges[0]).anchor_status, undefined);
    assert.equal(rangeMetadata(restored[0]?.ranges[0]).anchor_reason, undefined);
    assert.equal(restored[0]?.ranges[0]?.start_offset, 4);
    assert.equal(restored[0]?.ranges[0]?.end_offset, 72);
  });
});

test('AnnotationTruth round-trips parent and child hierarchy', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);

    replaceNoteAnnotationTruths(db, userId, noteId, [{
      id: 'annotation-parent',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'definition',
      ranges: [],
      parent_annotation_id: null,
      child_annotation_ids: ['annotation-child'],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }, {
      id: 'annotation-child',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'formula',
      ranges: [{
        id: 'annotation-child-range',
        target_kind: 'text_span',
        block_id: 'block-a',
        start_offset: 2,
        end_offset: 8,
        range_text_cache: 'series',
      }],
      parent_annotation_id: 'annotation-parent',
      child_annotation_ids: [],
      visual_style: { color_token: 'green', marker_kind: 'underline' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }]);

    const listed = listAnnotationTruths(db, userId, noteId);
    const parent = listed.find((annotation) => annotation.id === 'annotation-parent');
    const child = listed.find((annotation) => annotation.id === 'annotation-child');

    assert.equal(parent?.parent_annotation_id, null);
    assert.deepEqual(parent?.child_annotation_ids, ['annotation-child']);
    assert.equal(child?.parent_annotation_id, 'annotation-parent');
    assert.deepEqual(child?.child_annotation_ids, []);
    assert.equal(child?.ranges[0]?.range_text_cache, 'series');
  });
});

test('AnnotationTruth service repairs hierarchy pointers and rejects incomplete range targets', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);

    const firstSave = replaceNoteAnnotationTruths(db, userId, noteId, [{
      id: 'annotation-parent',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'definition',
      ranges: [],
      parent_annotation_id: null,
      child_annotation_ids: ['annotation-child', 'annotation-missing'],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }, {
      id: 'annotation-child',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'example',
      ranges: [],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'green', marker_kind: 'underline' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }, {
      id: 'annotation-orphan',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'orphan',
      ranges: [],
      parent_annotation_id: 'annotation-missing',
      child_annotation_ids: [],
      visual_style: { color_token: 'yellow', marker_kind: 'badge' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }, {
      id: 'annotation-cycle-a',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'cycle a',
      ranges: [],
      parent_annotation_id: 'annotation-cycle-b',
      child_annotation_ids: [],
      visual_style: { color_token: 'red', marker_kind: 'quiet' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }, {
      id: 'annotation-cycle-b',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'cycle b',
      ranges: [],
      parent_annotation_id: 'annotation-cycle-a',
      child_annotation_ids: [],
      visual_style: { color_token: 'red', marker_kind: 'quiet' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
      metadata: {},
    }]);

    assert.equal(firstSave.length, 5);

    const parent = firstSave.find((annotation) => annotation.id === 'annotation-parent');
    const child = firstSave.find((annotation) => annotation.id === 'annotation-child');
    const orphan = firstSave.find((annotation) => annotation.id === 'annotation-orphan');
    const cycleA = firstSave.find((annotation) => annotation.id === 'annotation-cycle-a');
    const cycleB = firstSave.find((annotation) => annotation.id === 'annotation-cycle-b');

    assert.deepEqual(parent?.child_annotation_ids, ['annotation-child']);
    assert.equal(child?.parent_annotation_id, 'annotation-parent');
    assert.equal(orphan?.parent_annotation_id, null);
    assert.notDeepEqual(
      [cycleA?.parent_annotation_id, cycleB?.parent_annotation_id],
      ['annotation-cycle-b', 'annotation-cycle-a'],
    );

    const stableShape = firstSave.map((annotation) => ({
      id: annotation.id,
      parent_annotation_id: annotation.parent_annotation_id,
      child_annotation_ids: annotation.child_annotation_ids,
    }));
    const secondSave = replaceNoteAnnotationTruths(db, userId, noteId, firstSave as any);
    assert.deepEqual(secondSave.map((annotation) => ({
      id: annotation.id,
      parent_annotation_id: annotation.parent_annotation_id,
      child_annotation_ids: annotation.child_annotation_ids,
    })), stableShape);

    assert.throws(() => replaceNoteAnnotationTruths(db, userId, noteId, [{
      id: 'annotation-bad-range',
      note_id: noteId,
      canvas_id: noteId,
      raw_label: 'bad range',
      ranges: [{
        id: 'annotation-bad-range:range',
        target_kind: 'text_span',
        start_offset: 0,
        end_offset: 4,
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      metadata: {},
    }]), /requires block_id/);
  });
});
