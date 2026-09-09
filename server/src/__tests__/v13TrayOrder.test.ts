import assert from 'node:assert/strict';
import test from 'node:test';
import type Database from 'better-sqlite3';
import { getNoteCanvasPersistence, saveBlockCanvasPlacement } from '../services/canvasObjects.js';
import { reorderNoteTray } from '../services/trayOrder.js';
import { reorderNoteTraySchema } from '../validators/trayOrder.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const USER = 'tray-order-user';
const NOTE = 'tray-order-note';
const PROJECT = 'tray-order-project';
const ORDER = ['group-p', 'table-p', 'block-p', 'shape-p'];
type Row = Record<string, unknown>;

function rows(db: Database.Database, table: string): Row[] {
  // These table names are fixed test literals, never client input.
  return db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all() as Row[];
}

async function fixture(run: (db: Database.Database) => void): Promise<void> {
  // Disposable memory connection; no application startup, env loader or user DB.
  const db = await createV13BoardsFixture();
  try {
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Fixture')")
      .run(USER, 'tray-order@example.invalid');
    db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(PROJECT, USER, 'Fixture');
    db.prepare('INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,?)').run(NOTE, USER, PROJECT, 'Fixture');
    db.prepare(`INSERT INTO note_blocks (id,user_id,course_id,block_type,content_json,plain_text)
      VALUES ('block',?,?,'paragraph','{"text":"Synthetic block"}','Synthetic block')`).run(USER, PROJECT);
    db.prepare(`INSERT INTO note_block_placements (id,note_id,block_id,order_index)
      VALUES ('block-p',?,'block',19)`).run(NOTE);
    saveBlockCanvasPlacement(db, USER, NOTE, 'block-p', {
      block_id: 'block', layout: { surface: 'tray', x: 0, y: 0, width: 0, height: 0, order_index: 8 },
    });
    for (const [name, kind, index] of [
      ['shape', 'shape', 3], ['table', 'table', 12], ['group', 'content_group_projection', 22],
    ] as const) {
      db.prepare(`INSERT INTO canvas_objects (id,user_id,course_id,note_id,canvas_id,kind,metadata)
        VALUES (?,?,?,?,?,?,?)`).run(`${name}-o`, USER, PROJECT, NOTE, NOTE, kind, '{ "opaque": [1,2] }');
      db.prepare(`INSERT INTO canvas_placements
        (id,user_id,course_id,note_id,object_id,canvas_id,surface,order_index,z_index,metadata)
        VALUES (?,?,?,?,?,?,'tray',?,31,?)`)
        .run(`${name}-p`, USER, PROJECT, NOTE, `${name}-o`, NOTE, index, '{ "keep": true }');
    }
    db.prepare(`INSERT INTO content_mounts (id,user_id,course_id,note_id,object_id,target_kind,target_id,metadata)
      VALUES ('group-m',?,?,?,'group-o','content_group','synthetic-group','{ "mount": "original" }')`)
      .run(USER, PROJECT, NOTE);
    db.prepare(`INSERT INTO structured_object_extensions
      (object_id,user_id,course_id,note_id,canvas_id,structured_kind,schema_version,row_count,column_count,data_json,metadata)
      VALUES ('table-o',?,?,?,?,'table','table.v1',1,1,?,?)`)
      .run(USER, PROJECT, NOTE, NOTE, '{ "rows": [["A"]], "opaque": 3 }', '{ "extra": true }');
    db.prepare(`INSERT INTO canvas_placements
      (id,user_id,course_id,note_id,object_id,canvas_id,surface,x,y,width,height,order_index)
      VALUES ('paper-p',?,?,?,'shape-o',?,'formal_page',10,20,300,100,45)`)
      .run(USER, PROJECT, NOTE, NOTE);
    run(db);
  } finally { db.close(); }
}

test('tray order validator requires unique placement IDs and accepts only the order payload', () => {
  assert.deepEqual(reorderNoteTraySchema.parse({ placementIds: ORDER }), { placementIds: ORDER });
  for (const input of [
    {}, { placementIds: ['same', 'same'] }, { placementIds: [''] }, { placementIds: [4] },
    { placementIds: ORDER, layout: {} }, { placementIds: ORDER, extensions: {} },
  ]) assert.equal(reorderNoteTraySchema.safeParse(input).success, false);
});

test('mixed block, object and mount order survives a fresh runtime read and changes only placement ordering', async () => {
  await fixture((db) => {
    const unchangedTables = ['canvas_objects', 'content_mounts', 'note_blocks', 'note_block_placements', 'structured_object_extensions'];
    const contentBefore = unchangedTables.map((table) => rows(db, table));
    const placementBefore = rows(db, 'canvas_placements');
    assert.deepEqual(reorderNoteTray(db, USER, NOTE, { placementIds: ORDER }), { placementIds: ORDER });
    const loaded = getNoteCanvasPersistence(db, USER, NOTE).canvasPlacements
      .filter((placement) => placement.surface === 'tray')
      .sort((a, b) => a.order_index! - b.order_index!);
    assert.deepEqual(loaded.map((placement) => placement.placement_id), ORDER);
    assert.deepEqual(loaded.map((placement) => placement.order_index), [0, 1, 2, 3]);
    assert.deepEqual(unchangedTables.map((table) => rows(db, table)), contentBefore);
    for (const current of rows(db, 'canvas_placements')) {
      const before = placementBefore.find((placement) => placement.id === current.id)!;
      assert.deepEqual(current.surface === 'tray' ? { ...current, order_index: before.order_index, updated_at: before.updated_at } : current, before);
    }
  });
});

test('an incomplete or stale tray list rejects the complete reorder and leaves all rows unchanged', async () => {
  await fixture((db) => {
    const snapshot = () => [rows(db, 'canvas_placements'), rows(db, 'notes')];
    const before = snapshot();
    for (const placementIds of [ORDER.slice(0, 2), [...ORDER, 'paper-p'], ['gone', ...ORDER.slice(1)], [ORDER[0], ORDER[0], ...ORDER.slice(2)]]) {
      assert.throws(() => reorderNoteTray(db, USER, NOTE, { placementIds }), { statusCode: 409 });
      assert.deepEqual(snapshot(), before);
    }
  });
});

test('a mid-batch write failure rolls back earlier order writes and note timestamp together', async () => {
  await fixture((db) => {
    const before = [rows(db, 'canvas_placements'), rows(db, 'notes')];
    db.exec(`CREATE TRIGGER fail_tray_order BEFORE UPDATE OF order_index ON canvas_placements
      WHEN OLD.id = 'table-p' BEGIN SELECT RAISE(ABORT, 'synthetic order failure'); END;`);
    assert.throws(() => reorderNoteTray(db, USER, NOTE, { placementIds: ORDER }), /synthetic order failure/);
    assert.deepEqual([rows(db, 'canvas_placements'), rows(db, 'notes')], before);
  });
});

test('hidden inactive block placements do not obstruct ordering the remaining visible entries', async () => {
  await fixture((db) => {
    db.prepare("UPDATE note_blocks SET status = 'trashed' WHERE id = 'block'").run();
    const hiddenBefore = db.prepare("SELECT * FROM canvas_placements WHERE id = 'block-p'").get();
    const visibleIds = ORDER.filter((id) => id !== 'block-p');
    const visibleRead = getNoteCanvasPersistence(db, USER, NOTE).canvasPlacements
      .filter((placement) => placement.surface === 'tray').map((placement) => placement.placement_id);
    assert.deepEqual([...visibleRead].sort(), [...visibleIds].sort());
    reorderNoteTray(db, USER, NOTE, { placementIds: visibleIds });
    assert.deepEqual(db.prepare("SELECT * FROM canvas_placements WHERE id = 'block-p'").get(), hiddenBefore);
  });
});
