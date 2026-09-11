import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { saveBlockCanvasPlacement, savePageFrameCollection } from '../services/canvasObjects.js';
import { savePageFrameCollectionSchema } from '../validators/index.js';

function writeEvidence(name: string, evidence: unknown) {
  const directory = process.env.D1_WALL_BATCH_EVIDENCE_DIR;
  if (directory) writeFileSync(join(directory, name), `${JSON.stringify(evidence, null, 2)}\n`);
}

// This is an isolated functional fixture. No initDb(), migrations, application
// database path, asset files or network are involved.
function createFixture() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE notes (id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, updated_at TEXT);
    CREATE TABLE note_blocks (id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, status TEXT);
    CREATE TABLE note_block_placements (
      id TEXT PRIMARY KEY, note_id TEXT, block_id TEXT, display_overrides_json TEXT, updated_at TEXT
    );
    CREATE TABLE canvas_objects (
      id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, note_id TEXT, canvas_id TEXT,
      kind TEXT, backing TEXT, object_class TEXT, status TEXT, source_json TEXT, metadata TEXT,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE canvas_placements (
      id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, note_id TEXT,
      object_id TEXT REFERENCES canvas_objects(id) ON DELETE CASCADE, canvas_id TEXT,
      x REAL, y REAL, width REAL, height REAL, rotation REAL, frame_id TEXT,
      surface TEXT, boundary_role TEXT, z_index INTEGER, order_index INTEGER,
      snap_state_json TEXT, visibility_state TEXT, render_visibility TEXT, metadata TEXT,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE content_mounts (
      id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, note_id TEXT,
      object_id TEXT REFERENCES canvas_objects(id) ON DELETE CASCADE,
      target_kind TEXT, target_id TEXT, projection_mode TEXT, sync_policy TEXT,
      metadata TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE canvas_page_collections (
      note_id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, canvas_id TEXT,
      primary_frame_id TEXT, selected_frame_id TEXT, primary_stack_id TEXT, selected_stack_id TEXT,
      page_stacks_json TEXT, metadata TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE page_frame_extensions (
      frame_id TEXT PRIMARY KEY, user_id TEXT, course_id TEXT, note_id TEXT,
      object_id TEXT REFERENCES canvas_objects(id) ON DELETE CASCADE, canvas_id TEXT,
      page_stack_id TEXT, page_index INTEGER, page_size TEXT, content_inset_json TEXT,
      typography_json TEXT, background_json TEXT, template_id TEXT, template_json TEXT,
      slots_json TEXT, exportable INTEGER, metadata TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE visual_connector_extensions (object_id TEXT, user_id TEXT, note_id TEXT);
    CREATE TABLE structured_object_extensions (object_id TEXT, user_id TEXT, note_id TEXT);
    CREATE TABLE image_object_extensions (
      object_id TEXT, user_id TEXT, note_id TEXT, asset_id TEXT, canvas_id TEXT,
      fit TEXT, caption TEXT, alt_text TEXT, natural_width REAL, natural_height REAL, metadata TEXT
    );
    CREATE TABLE canvas_assets (
      id TEXT, user_id TEXT, kind TEXT, storage_kind TEXT, storage_key TEXT,
      filename TEXT, mime_type TEXT, byte_size INTEGER, width REAL, height REAL, sha256 TEXT, metadata TEXT
    );
    INSERT INTO notes VALUES ('note', 'user', 'course', 'before');
    INSERT INTO note_blocks VALUES ('manual', 'user', 'course', 'active'), ('auto', 'user', 'course', 'active');
    INSERT INTO note_block_placements VALUES
      ('manual-placement', 'note', 'manual', '{}', 'before'),
      ('auto-placement', 'note', 'auto', '{}', 'before');
  `);
  const collection = {
    pageFrames: ['frame-1', 'frame-2'].map((id, index) => ({
      id, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
      x: 0, y: index * 1300, width: 904, height: 1280, pageSize: 'A4', exportable: true,
      contentInset: { top: 0, right: 72, bottom: 96, left: 72 },
    })),
    pageStacks: [], primaryFrameId: 'frame-1', selectedFrameId: 'frame-1',
  };
  savePageFrameCollection(db, 'user', 'note', collection);
  const layout = {
    x: 260, y: 40, width: 500, height: 100, frame_id: 'frame-1',
    surface: 'formal_page', boundary_role: 'inside', width_mode: 'manual',
    coordinate_space: 'page_frame_local', z_index: 3, order_index: 2,
  };
  saveBlockCanvasPlacement(db, 'user', 'note', 'manual-placement', { block_id: 'manual', layout });
  saveBlockCanvasPlacement(db, 'user', 'note', 'auto-placement', {
    block_id: 'auto', layout: { ...layout, x: 0, width: 760, width_mode: 'auto' },
  });
  db.prepare(`INSERT INTO canvas_objects VALUES (
    'image', 'user', 'course', 'note', 'note', 'image', 'asset', 'media',
    'active', '{"source":"synthetic-image"}', '{"caption":"untouched"}', 'before', 'before'
  )`).run();
  db.prepare(`INSERT INTO canvas_placements VALUES (
    'image-placement', 'user', 'course', 'note', 'image', 'note',
    200, 60, 560, 300, 0, 'frame-2', 'formal_page', 'inside', 8, 7,
    '{"state":"custom-snap"}', 'normal', 'visible', ?, 'before', 'before'
  )`).run(JSON.stringify({
    custom: 'preserved', layout_policy: { coordinate_space: 'page_frame_local', width_mode: 'manual' },
  }));
  db.prepare(`INSERT INTO image_object_extensions VALUES (
    'image', 'user', 'note', 'asset', 'note', 'contain', 'caption', 'alt', 560, 300, '{}'
  )`).run();
  db.prepare(`INSERT INTO canvas_assets VALUES (
    'asset', 'user', 'image', 'local_file', 'synthetic-no-file', 'synthetic.png',
    'image/png', 0, 560, 300, NULL, '{}'
  )`).run();
  return { db, collection, layout };
}

function snapshot(db: Database.Database) {
  return Object.fromEntries([
    'notes', 'canvas_page_collections', 'page_frame_extensions', 'canvas_objects',
    'canvas_placements', 'content_mounts', 'note_blocks', 'note_block_placements',
    'image_object_extensions', 'canvas_assets',
  ].map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
}

test('one collection payload atomically saves every inset and both manual placement batches', () => {
  const { db, collection, layout } = createFixture();
  try {
    const before = snapshot(db);
    const request = savePageFrameCollectionSchema.parse({
      collection: {
        ...collection,
        pageFrames: collection.pageFrames.map((frame) => ({
          ...frame, contentInset: { ...frame.contentInset, right: 240 },
        })),
      },
      layout_updates: [{ placement_id: 'manual-placement', block_id: 'manual', layout: { ...layout, x: 92 } }],
      object_layout_updates: [{
        placement_id: 'image-placement', object_id: 'image',
        layout: {
          x: 32, y: 60, width: 560, height: 300, frame_id: 'frame-2',
          coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside', width_mode: 'manual',
        },
      }],
    });
    const saved = savePageFrameCollection(
      db, 'user', 'note', request.collection, request.layout_updates, request.object_layout_updates,
    );
    assert.deepEqual(saved?.pageFrames.map((frame) => frame.contentInset), [
      { top: 0, right: 240, bottom: 96, left: 72 }, { top: 0, right: 240, bottom: 96, left: 72 },
    ]);
    const after = snapshot(db);
    const findPlacement = (rows: unknown[], id: string) => rows.find((row: any) => row.id === id) as any;
    assert.deepEqual(findPlacement(after.canvas_placements, 'auto-placement'), findPlacement(before.canvas_placements, 'auto-placement'));
    assert.equal(findPlacement(after.canvas_placements, 'manual-placement').x, 92);
    const image = findPlacement(after.canvas_placements, 'image-placement');
    assert.equal(image.x, 32);
    assert.equal(image.z_index, 8);
    assert.equal(image.order_index, 7);
    assert.equal(image.metadata, findPlacement(before.canvas_placements, 'image-placement').metadata);
    assert.equal(image.snap_state_json, '{"state":"custom-snap"}');
    assert.deepEqual(after.image_object_extensions, before.image_object_extensions);
    assert.deepEqual(after.canvas_assets, before.canvas_assets);
    assert.deepEqual(after.note_blocks, before.note_blocks);
    assert.deepEqual(
      after.canvas_objects.filter((row: any) => row.id === 'image'),
      before.canvas_objects.filter((row: any) => row.id === 'image'),
    );
    writeEvidence('result-3-wall-batch-success.json', {
      fixture: ':memory: SQLite, hand-created schema, real service and validator',
      migrations: false, httpRequest: false, request, saved, before, after,
      assertions: { allInsetsCommitted: true, bothClampBatchesCommitted: true, autoUnwritten: true, mediaContentUntouched: true },
    });
  } finally { db.close(); }
});

test('a storage fault after earlier clamp writes rolls back insets and the complete placement batch', () => {
  const { db, collection, layout } = createFixture();
  try {
    // Inject an ordinary storage failure, not a policy or ownership rejection.
    // This fires after frames and the first nested block save have succeeded.
    db.exec(`CREATE TRIGGER fail_image_update BEFORE UPDATE ON canvas_placements
      WHEN NEW.id = 'image-placement' AND NEW.x = 32
      BEGIN SELECT RAISE(ABORT, 'synthetic layout write failure'); END;`);
    const before = snapshot(db);
    assert.throws(() => savePageFrameCollection(db, 'user', 'note', {
      ...collection,
      pageFrames: collection.pageFrames.map((frame) => ({
        ...frame, contentInset: { ...frame.contentInset, right: 240 },
      })),
    }, [{ placement_id: 'manual-placement', block_id: 'manual', layout: { ...layout, x: 92 } }], [{
      placement_id: 'image-placement', object_id: 'image',
      layout: { ...layout, frame_id: 'frame-2', x: 32, y: 60, width: 560, height: 300 },
    }]), /synthetic layout write failure/);
    assert.deepEqual(snapshot(db), before);
    assert.equal(db.inTransaction, false);
    writeEvidence('result-3-wall-batch-rollback.json', {
      fixture: ':memory: SQLite, hand-created schema, real service',
      fault: 'BEFORE UPDATE trigger on final image placement raises ABORT',
      migrations: false, before, after: snapshot(db),
      assertions: { allInsetsRolledBack: true, earlierBlockWriteRolledBack: true, transactionClosed: true },
    });
  } finally { db.close(); }
});
