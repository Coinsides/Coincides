import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/init.js';
import migration from '../db/migrations/055_v13_tray_order.js';
import { saveCanvasBlockPlacementSchema } from '../validators/index.js';
import { getNoteCanvasPersistence, saveBlockCanvasPlacement } from '../services/canvasObjects.js';
import { splitTrayNote, setTraySplitApplied } from '../services/trayNotes.js';

const layout = { x: 10, y: 80, width: 300, height: 90, surface: 'tray', order_index: 7 };
async function fixture(run: (db: Database.Database) => void) {
  const db = await initDb(':memory:');
  try {
    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES ('tray-user','tray@example.test','fixture','Tray')`).run();
    db.prepare(`INSERT INTO courses (id, user_id, name) VALUES ('tray-course','tray-user','Tray')`).run();
    db.prepare(`INSERT INTO notes (id, user_id, course_id, title) VALUES ('tray-note','tray-user','tray-course','Tray')`).run();
    for (let i = 1; i <= 2; i++) {
      db.prepare(`INSERT INTO note_blocks (id,user_id,course_id,block_type,content_json,plain_text)
        VALUES (?, 'tray-user','tray-course','paragraph', ?, ?)`)
        .run(`block-${i}`, JSON.stringify({ body: `Synthetic content ${i}` }), `Synthetic content ${i}`);
      db.prepare(`INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES (?,'tray-note',?,?)`)
        .run(`placement-${i}`, `block-${i}`, i);
      saveBlockCanvasPlacement(db, 'tray-user', 'tray-note', `placement-${i}`, { block_id: `block-${i}`, layout: { ...layout, order_index: i } });
    }
    run(db);
  } finally { closeDb(); }
}

test('tray validator keeps finite geometry and accepts nullable integer ordering; retired workspace/crossing remains readable', async () => {
  const parsed = saveCanvasBlockPlacementSchema.parse({ block_id: 'block-1', layout });
  assert.equal(parsed.layout.order_index, 7);
  assert.equal(saveCanvasBlockPlacementSchema.safeParse({ block_id: 'b', layout: { ...layout, x: Infinity } }).success, false);
  assert.equal(saveCanvasBlockPlacementSchema.safeParse({ block_id: 'b', layout: { ...layout, order_index: 1.5 } }).success, false);
  await fixture((db) => {
    const saved = saveBlockCanvasPlacement(db, 'tray-user', 'tray-note', 'placement-1', parsed);
    assert.equal(saved.layout.surface, 'tray');
    assert.equal(saved.layout.order_index, 7);
    const row = db.prepare('SELECT * FROM canvas_placements WHERE id = ?').get('placement-1') as any;
    assert.deepEqual([row.x,row.y,row.width,row.height,row.rotation,row.frame_id], [0,0,0,0,0,null]);
    assert.equal(row.order_index, 7);
    const read = getNoteCanvasPersistence(db, 'tray-user', 'tray-note');
    assert.equal(read.canvasPlacements.find((p) => p.placement_id === 'placement-1')?.order_index, 7);
    assert.equal(read.blockLayouts.find((p) => p.placement_id === 'placement-1')?.layout.surface, 'tray');
    assert.throws(() => saveBlockCanvasPlacement(db, 'tray-user', 'tray-note', 'placement-1', {
      block_id: 'block-1', layout: { ...layout, surface: 'canvas_workspace', boundary_role: 'crossing', order_index: null },
    }), { message: 'canvas_workspace_retired' });
    // Historical fixture rows bypass current writers; production history is never rewritten.
    db.exec("UPDATE canvas_placements SET surface='canvas_workspace', boundary_role='crossing', x=10 WHERE id='placement-1'");
    const legacy = getNoteCanvasPersistence(db, 'tray-user', 'tray-note').blockLayouts.find((p) => p.placement_id === 'placement-1')!;
    assert.equal(legacy.layout.surface, 'canvas_workspace');
    assert.equal(legacy.layout.boundary_role, 'crossing');
    assert.equal(legacy.layout.x, 10);
  });
});

test('055 adds the same nullable INTEGER to a legacy Canvas table without rewriting rows', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`CREATE TABLE canvas_placements (id TEXT PRIMARY KEY, surface TEXT, z_index INTEGER);
      INSERT INTO canvas_placements VALUES ('legacy','canvas_workspace',99);`);
    migration.up(db);
    const column = (db.prepare('PRAGMA table_info(canvas_placements)').all() as any[]).find((c) => c.name === 'order_index');
    assert.equal(column.type, 'INTEGER');
    assert.equal(column.notnull, 0);
    assert.deepEqual(db.prepare('SELECT * FROM canvas_placements').get(), { id:'legacy', surface:'canvas_workspace', z_index:99, order_index:null });
  } finally { db.close(); }
});

test('split attaches original block identities and removes source placements atomically, with undo and redo', async () => {
  await fixture((db) => {
    const before = db.prepare('SELECT * FROM note_blocks ORDER BY id').all();
    const placements = db.prepare('SELECT * FROM canvas_placements ORDER BY id').all();
    const mounts = db.prepare('SELECT * FROM content_mounts ORDER BY id').all();
    const result = splitTrayNote(db, 'tray-user', 'tray-note', { placement_ids:['placement-1','placement-2'], title:'Split note' });
    assert.equal((db.prepare('SELECT title FROM notes WHERE id = ?').get(result.note_id) as any).title, 'Split note');
    assert.deepEqual(db.prepare('SELECT block_id FROM note_block_placements WHERE note_id = ? ORDER BY order_index').all(result.note_id), [{block_id:'block-1'},{block_id:'block-2'}]);
    assert.equal(db.prepare('SELECT id FROM canvas_placements WHERE note_id = ?').all('tray-note').length, 0);
    assert.equal(db.prepare('SELECT id FROM note_block_placements WHERE note_id = ?').all('tray-note').length, 0);
    assert.deepEqual(db.prepare('SELECT * FROM note_blocks ORDER BY id').all(), before);
    assert.deepEqual(db.prepare('SELECT * FROM content_mounts ORDER BY id').all(), mounts);
    setTraySplitApplied(db, 'tray-user', 'tray-note', result.batch_id, false);
    assert.deepEqual(db.prepare('SELECT * FROM canvas_placements ORDER BY id').all(), placements);
    assert.equal((db.prepare('SELECT status FROM notes WHERE id = ?').get(result.note_id) as any).status, 'trashed');
    setTraySplitApplied(db, 'tray-user', 'tray-note', result.batch_id, true);
    assert.equal(db.prepare('SELECT id FROM note_block_placements WHERE note_id = ?').all(result.note_id).length, 2);
    assert.deepEqual(db.prepare('SELECT * FROM note_blocks ORDER BY id').all(), before);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as any).n, 0);
  });
});

test('failure during the second membership move rolls back note, batch and the first removed placement', async () => {
  await fixture((db) => {
    const snapshot = () => ['notes','operation_batches','note_block_placements','canvas_placements','canvas_objects','content_mounts']
      .map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
    const before = snapshot();
    db.exec(`CREATE TRIGGER fail_second_split BEFORE UPDATE OF note_id ON note_block_placements
      WHEN OLD.id = 'placement-2' BEGIN SELECT RAISE(ABORT,'synthetic split failure'); END;`);
    assert.throws(() => splitTrayNote(db, 'tray-user', 'tray-note', {placement_ids:['placement-1','placement-2'],title:'Should roll back'}), /synthetic split failure/);
    assert.deepEqual(snapshot(), before);
  });
});
