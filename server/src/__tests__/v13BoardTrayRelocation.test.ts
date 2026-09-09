import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import type Database from 'better-sqlite3';
import migration062 from '../db/migrations/062_v13_board_layers.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import { createBoard } from '../services/boards.js';
import { undoTrayRelocation } from '../services/boardTrayRelocation.js';
import { releaseCourseCanvasAssets } from '../services/canvasAssets.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const USER = 'tray-relocation-user';
const PROJECT = 'tray-relocation-project';
const NOTE = 'tray-relocation-note';
const GROUP = 'tray-relocation-group';
type Row = Record<string, any>;
type Request = (method: string, path: string, body?: unknown, status?: number) => Promise<any>;
const ids = ['shape-p', 'image-p', 'table-p', 'connector-p', 'group-p'];

function rows(db: Database.Database, table: string): Row[] {
  return db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as Row[];
}

function seed(db: Database.Database) {
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Fixture')")
    .run(USER, 'tray-relocation@example.invalid');
  db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(PROJECT, USER, 'Fixture project');
  db.prepare('INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,?)').run(NOTE, USER, PROJECT, 'Fixture tray');
  db.prepare('INSERT INTO content_groups (id,user_id,course_id,note_id,title) VALUES (?,?,?,?,?)')
    .run(GROUP, USER, PROJECT, NOTE, 'Fixture group');
  db.prepare(`INSERT INTO note_blocks (id,user_id,course_id,block_type,plain_text,content_json,metadata)
    VALUES ('shape-text',?,?,'text','Preserved shape text',?,?)`)
    .run(USER, PROJECT, '{ "text": "Preserved shape text", "extra": [1,2] }', '{ "backing": "original" }');
  for (const [index, kind] of ['shape', 'image', 'table', 'visual_connector', 'content_group_projection', 'paragraph_block_projection'].entries()) {
    const name = ['shape', 'image', 'table', 'connector', 'group', 'block'][index];
    db.prepare(`INSERT INTO canvas_objects (id,user_id,course_id,note_id,canvas_id,kind,backing,source_json,metadata)
      VALUES (?,?,?,?,?,?,?, ?, ?)`)
      .run(`${name}-o`, USER, PROJECT, NOTE, NOTE, kind, name === 'shape' ? 'note_block' : 'none',
        '{ "source": "original", "nested": { "kept": true } }', '{ "shape_type": "ellipse", "extra": [1,2,3] }');
    const zero = name === 'image';
    db.prepare(`INSERT INTO canvas_placements
      (id,user_id,course_id,note_id,object_id,canvas_id,x,y,width,height,rotation,surface,z_index,
       order_index,snap_state_json,visibility_state,render_visibility,metadata)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'tray',?,?,?,?,?,?)`)
      .run(`${name}-p`, USER, PROJECT, NOTE, `${name}-o`, NOTE,
        zero ? 0 : -120 + index * 70, zero ? 0 : 80 + index * 20, zero ? 0 : 240, zero ? 0 : 160,
        zero ? 0 : 17 + index, index + 4, index + 9, '{ "state": "free", "opaque": [3] }',
        'ai_hidden', 'visible', '{ "unknown": { "deep": ["keep"] }, "layout_policy": {"coordinate_space":"world"} }');
  }
  for (const [name, targetKind, targetId] of [
    ['shape', 'note_block', 'shape-text'], ['group', 'content_group', GROUP], ['block', 'note_block', 'shape-text'],
  ]) {
    db.prepare(`INSERT INTO content_mounts (id,user_id,course_id,note_id,object_id,target_kind,target_id,metadata)
      VALUES (?,?,?,?,?,?,?,?)`).run(`${name}-m`, USER, PROJECT, NOTE, `${name}-o`, targetKind, targetId,
      '{ "mount_payload": { "kept": [5] } }');
  }
  db.prepare(`INSERT INTO canvas_assets
    (id,user_id,course_id,origin_note_id,kind,storage_kind,storage_key,filename,mime_type)
    VALUES ('fixture-image',?,?,?,'image','local_file','synthetic-not-read.png','synthetic.png','image/png')`)
    .run(USER, PROJECT, NOTE);
  db.prepare(`INSERT INTO image_object_extensions
    (object_id,user_id,course_id,note_id,canvas_id,asset_id,fit,caption,alt_text,metadata)
    VALUES ('image-o',?,?,?,?,'fixture-image','cover','Original caption','Original alt',?)`)
    .run(USER, PROJECT, NOTE, NOTE, '{ "crop": [0.1,0.2,0.8,0.9], "opaque": true }');
  db.prepare(`INSERT INTO structured_object_extensions
    (object_id,user_id,course_id,note_id,canvas_id,structured_kind,schema_version,row_count,column_count,data_json,metadata)
    VALUES ('table-o',?,?,?,?,'table','table.v1',1,1,?,?)`)
    .run(USER, PROJECT, NOTE, NOTE, '{ "rows": [["A"]], "opaque": { "value": 3 } }', '{ "table_extra": true }');
  db.prepare(`INSERT INTO visual_connector_extensions
    (object_id,user_id,course_id,note_id,canvas_id,start_kind,start_x,start_y,end_kind,end_x,end_y,
     line_style,stroke,stroke_width,start_marker,end_marker,metadata)
    VALUES ('connector-o',?,?,?,?,'point',-211,43,'point',540,801,'dashed','#123456',3.25,'circle','arrow',?)`)
    .run(USER, PROJECT, NOTE, NOTE, '{ "connector_extra": { "curve": [7,8] } }');
  // A second placement for the same shape demonstrates placement-only relocation.
  db.exec(`INSERT INTO canvas_placements SELECT 'shape-other-p', user_id, course_id, note_id, object_id, canvas_id,
    x,y,width,height,rotation,frame_id,'formal_page',boundary_role,z_index,snap_state_json,
    visibility_state,render_visibility,metadata,created_at,updated_at,order_index FROM canvas_placements WHERE id='shape-p'`);
  return db.transaction(() => createBoard(db, USER, { title: 'Fixture board', purpose: { title: 'Fixture purpose' } }))().board.id;
}

async function withRoutes(run: (db: Database.Database, request: Request, path: string) => Promise<void>) {
  const db = await createV13BoardsFixture();
  let server: Server | undefined;
  try {
    const boardId = seed(db);
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
    app.use('/api/boards', createBoardRouter(() => db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err instanceof AppError ? err.statusCode : 500).json({ error: err.message });
    });
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    assert.notEqual(address.port, 3001);
    assert.notEqual(address.port, 5173);
    const request: Request = async (method, path, body, expected = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method,
        ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
      const result = await response.json() as any;
      assert.equal(response.status, expected, `${method} ${path}: ${result.error ?? 'unexpected response'}`);
      return result;
    };
    await run(db, request, `/api/boards/${boardId}`);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
}

// Preserve the pre-062 STOP-1 sample: capture its receipt before adding layer_id.
async function createLegacyRelocationFixture() {
  const db = await createV13BoardsFixture({ beforeLayersMigration: true });
  try {
    db.exec(`
      INSERT INTO users (id,email,password_hash,name) VALUES ('u','layers-repro@example.invalid','synthetic','Synthetic');
      INSERT INTO courses (id,user_id,name) VALUES ('p','u','Synthetic');
      INSERT INTO notes (id,user_id,course_id,title) VALUES ('n','u','p','Synthetic');
      INSERT INTO purposes (id,user_id,title,created_at,updated_at) VALUES ('s','u','Question','before','before');
      INSERT INTO boards (id,user_id,title,soul_id,created_at,updated_at) VALUES ('b','u','Board','s','before','before');
      INSERT INTO canvas_objects (id,user_id,course_id,note_id,canvas_id,kind,backing) VALUES ('o','u','p','n','n','shape','none');
      INSERT INTO canvas_placements (id,user_id,course_id,note_id,object_id,canvas_id,surface) VALUES ('placement','u','p','n','o','n','tray');
      INSERT INTO board_visuals (id,board_id,visual_kind,x,y,w,h,data,created_at,updated_at) VALUES ('v','b','shape',30,40,100,80,'{}','before','before');
    `);
    const source = { object: rows(db, 'canvas_objects')[0], placement: rows(db, 'canvas_placements')[0],
      mounts: [], extensions: { image: null, table: null, connector: null }, backing_blocks: [], endpoint_placements: [] };
    const target = rows(db, 'board_visuals')[0];
    assert.equal(Object.prototype.hasOwnProperty.call(target, 'layer_id'), false);
    const metadata = JSON.stringify({ tray_relocation: { version: 1, board_id: 'b',
      entries: [{ source, target_table: 'board_visuals', target, geometry_mode: 'preserved' }] } });
    db.prepare(`INSERT INTO operation_batches (id,user_id,course_id,source_type,label,status,metadata,applied_at)
      VALUES ('batch','u',NULL,'manual','Relocate tray to board','applied',?,'before')`).run(metadata);
    db.exec("DELETE FROM canvas_placements WHERE id='placement'");
    return { db, source, target, metadata };
  } catch (error) {
    db.close();
    throw error;
  }
}

test('pre-062 receipt still undoes after migration when the added layer column remains NULL', async () => {
  const { db, source, target, metadata } = await createLegacyRelocationFixture();
  try {
    const rollback = Symbol('rollback pre-062 baseline');
    assert.throws(() => db.transaction(() => {
      assert.equal(undoTrayRelocation(db, 'u', 'b', 'batch').value.applied, false);
      throw rollback;
    })(), (error: unknown) => error === rollback);
    db.transaction(() => migration062.up(db))();
    assert.deepEqual(rows(db, 'board_visuals'), [{ ...target, layer_id: null }]);
    assert.equal(rows(db, 'operation_batches')[0].metadata, metadata);

    const undone = db.transaction(() => undoTrayRelocation(db, 'u', 'b', 'batch'))();
    assert.equal(undone.value.applied, false);
    assert.deepEqual(undone.value.visual_ids, [target.id]);
    assert.deepEqual(rows(db, 'board_visuals'), []);
    assert.deepEqual(rows(db, 'canvas_placements'), [source.placement]);
    assert.equal(rows(db, 'operation_batches')[0].status, 'reverted');
    assert.equal(rows(db, 'operation_batches')[0].metadata, metadata);
  } finally { db.close(); }
});

test('pre-062 receipt still rejects undo with tray_relocation_target_changed after assignment to a layer', async () => {
  const { db, target, metadata } = await createLegacyRelocationFixture();
  try {
    db.transaction(() => migration062.up(db))();
    db.exec(`INSERT INTO board_layers (id,board_id,user_id,name,order_index) VALUES ('layer','b','u','Layer',0);
      UPDATE board_visuals SET layer_id='layer' WHERE id='v'`);
    const batch = rows(db, 'operation_batches')[0];
    assert.equal(batch.metadata, metadata);

    assert.throws(() => db.transaction(() => undoTrayRelocation(db, 'u', 'b', 'batch'))(),
      (error: unknown) => error instanceof AppError && error.statusCode === 409
        && error.message === 'tray_relocation_target_changed');
    assert.deepEqual(rows(db, 'board_visuals'), [{ ...target, layer_id: 'layer' }]);
    assert.deepEqual(rows(db, 'canvas_placements'), []);
    assert.equal(batch.status, 'applied');
    assert.deepEqual(rows(db, 'operation_batches'), [batch]);
  } finally { db.close(); }
});

test('mixed tray relocation preserves raw rows, historical geometry and zero-geometry grid; undo restores placements', async () => {
  await withRoutes(async (db, request, path) => {
    const before = { placements: rows(db, 'canvas_placements'), objects: rows(db, 'canvas_objects'),
      mounts: rows(db, 'content_mounts'), blocks: rows(db, 'note_blocks'), notes: rows(db, 'notes'), groups: rows(db, 'content_groups') };
    const transfer = await request('POST', `${path}/relocate-tray`, { placement_ids: ids }, 201);
    assert.equal(transfer.applied, true);
    assert.deepEqual(transfer.geometry, { preserved_placement_ids: ids.filter((id) => id !== 'image-p'), default_grid_placement_ids: ['image-p'] });
    assert.deepEqual(rows(db, 'canvas_placements').map((p) => p.id), ['block-p', 'shape-other-p']);
    const board = await request('GET', path);
    assert.equal(board.visuals.length, 4);
    assert.equal(board.members.length, 1);
    assert.deepEqual(rows(db, 'purpose_members'), []);
    for (const visual of board.visuals) {
      const source = visual.data.tray_source;
      assert.deepEqual(source.placement, before.placements.find((p) => p.id === source.placement.id));
      assert.deepEqual(source.object, before.objects.find((o) => o.id === source.object.id));
      assert.deepEqual(source.mounts, before.mounts.filter((m) => m.object_id === source.object.id));
      if (visual.visual_kind !== 'image') {
        assert.deepEqual([visual.x, visual.y, visual.w, visual.h, visual.rotation],
          [source.placement.x, source.placement.y, source.placement.width, source.placement.height, source.placement.rotation]);
      }
    }
    const shape = board.visuals.find((v: Row) => v.visual_kind === 'shape');
    assert.deepEqual(shape.data.tray_source.backing_blocks, before.blocks);
    const image = board.visuals.find((v: Row) => v.visual_kind === 'image');
    assert.deepEqual([image.x, image.y, image.w, image.h, image.rotation], [40, 40, 280, 180, 0]);
    assert.deepEqual(image.data.tray_source.extensions.image, db.prepare('SELECT * FROM image_object_extensions').get());
    const table = board.visuals.find((v: Row) => v.visual_kind === 'table');
    assert.deepEqual(table.data.tray_source.extensions.table, db.prepare('SELECT * FROM structured_object_extensions').get());
    const connector = board.visuals.find((v: Row) => v.visual_kind === 'connector');
    assert.deepEqual(connector.data.tray_source.extensions.connector, db.prepare('SELECT * FROM visual_connector_extensions').get());
    assert.deepEqual(connector.data.connector_points, { start: { x: -301, y: -97 }, end: { x: 450, y: 661 } });
    assert.equal(board.members[0].member_id, GROUP);
    assert.equal(board.members[0].metadata.tray_source.placement.rotation, 21);
    const batch = rows(db, 'operation_batches')[0];
    assert.equal(batch.course_id, null);
    const receipt = JSON.parse(batch.metadata).tray_relocation;
    assert.equal(receipt.entries.length, 5);
    assert.deepEqual(receipt.entries.filter((entry: Row) => entry.target_table === 'board_visuals').map((entry: Row) => entry.target.id).sort(), transfer.visual_ids.slice().sort());
    assert.deepEqual(db.prepare('SELECT verb FROM events ORDER BY seq').all(), [{ verb: 'mounted' }]);
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {});
    assert.deepEqual(rows(db, 'canvas_placements'), before.placements);
    assert.deepEqual({ objects: rows(db, 'canvas_objects'), mounts: rows(db, 'content_mounts'), blocks: rows(db, 'note_blocks'),
      notes: rows(db, 'notes'), groups: rows(db, 'content_groups') },
    { objects: before.objects, mounts: before.mounts, blocks: before.blocks, notes: before.notes, groups: before.groups });
    assert.equal((await request('GET', path)).visuals.length, 0);
    assert.equal((await request('GET', path)).members.length, 0);
    assert.deepEqual(db.prepare('SELECT verb FROM events ORDER BY seq').all(), [{ verb: 'mounted' }, { verb: 'unmounted' }]);
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {});
    assert.equal((db.prepare('SELECT count(*) AS n FROM events').get() as Row).n, 2);
    console.log('V13_S3_TRAY_MEMORY_PASS mixed=5 visuals=4 cg=1 raw_rows=PASS geometry=preserved+default_grid undo=PASS ledger=mounted+unmounted');
  });
});

test('event failure rolls back the complete mixed migration and the complete undo', async () => {
  await withRoutes(async (db, request, path) => {
    const state = () => ({ placements: rows(db, 'canvas_placements'), visuals: rows(db, 'board_visuals'),
      members: rows(db, 'board_members'), boards: rows(db, 'boards'), batches: rows(db, 'operation_batches'),
      events: db.prepare('SELECT * FROM events ORDER BY seq').all() });
    db.exec(`CREATE TRIGGER synthetic_relocation_failure BEFORE INSERT ON events
      WHEN NEW.verb = 'mounted' BEGIN SELECT RAISE(ABORT, 'synthetic_event_failed'); END`);
    const initial = state();
    await request('POST', `${path}/relocate-tray`, { placement_ids: ids }, 500);
    assert.deepEqual(state(), initial);
    db.exec('DROP TRIGGER synthetic_relocation_failure');
    const transfer = await request('POST', `${path}/relocate-tray`, { placement_ids: ids }, 201);
    const applied = state();
    db.exec(`CREATE TRIGGER synthetic_relocation_failure BEFORE INSERT ON events
      WHEN NEW.verb = 'unmounted' BEGIN SELECT RAISE(ABORT, 'synthetic_event_failed'); END`);
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {}, 500);
    assert.deepEqual(state(), applied);
  });
});

test('a block in a mixed batch rejects the entire move; undo refuses subsequent geometry or edges', async () => {
  await withRoutes(async (db, request, path) => {
    const before = rows(db, 'canvas_placements');
    await request('POST', `${path}/relocate-tray`, { placement_ids: ['shape-p', 'block-p'] }, 409);
    assert.deepEqual(rows(db, 'canvas_placements'), before);
    assert.deepEqual(rows(db, 'board_visuals'), []);
    assert.deepEqual(rows(db, 'operation_batches'), []);
    const transfer = await request('POST', `${path}/relocate-tray`, { placement_ids: ['shape-p', 'group-p'] }, 201);
    const target = rows(db, 'board_visuals')[0];
    db.prepare('UPDATE board_visuals SET x = x + 1 WHERE id = ?').run(target.id);
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {}, 409);
    db.prepare('UPDATE board_visuals SET x = ? WHERE id = ?').run(target.x, target.id);
    const extra = await request('POST', `${path}/members`, { member_kind: 'content_group', member_id: GROUP }, 201);
    await request('POST', `${path}/edges`, { from_member_id: transfer.member_ids[0], to_member_id: extra.member.id }, 201);
    const edges = rows(db, 'board_edges');
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {}, 409);
    assert.deepEqual(rows(db, 'board_edges'), edges);
    assert.equal(rows(db, 'operation_batches')[0].status, 'applied');
  });
});

test('object-bound connector retains the selected endpoint evidence; ambiguous instances do not move', async () => {
  await withRoutes(async (db, request, path) => {
    db.exec(`UPDATE visual_connector_extensions SET start_kind='object',start_object_id='shape-o',
      start_anchor='east',start_x=NULL,start_y=NULL WHERE object_id='connector-o'`);
    await request('POST', `${path}/relocate-tray`, { placement_ids: ['connector-p'] }, 409);
    assert.deepEqual(rows(db, 'board_visuals'), []);
    const moved = await request('POST', `${path}/relocate-tray`, { placement_ids: ['connector-p', 'shape-p'] }, 201);
    const board = await request('GET', path);
    const connector = board.visuals.find((v: Row) => v.visual_kind === 'connector');
    assert.deepEqual(connector.data.connector_points.start, { x: 30, y: 20 });
    assert.equal(connector.data.tray_source.extensions.connector.start_object_id, 'shape-o');
    assert.equal(connector.data.tray_source.endpoint_placements.length, 2);
    await request('POST', `${path}/relocate-tray/${moved.batch_id}/undo`, {});
  });
});

test('board image and the library operation receipt survive source project asset cleanup', async () => {
  await withRoutes(async (db, request, path) => {
    const transfer = await request('POST', `${path}/relocate-tray`, { placement_ids: ['image-p'] }, 201);
    db.transaction(() => {
      const cleanup = releaseCourseCanvasAssets(db, USER, PROJECT);
      assert.equal(cleanup.released, 0);
      assert.deepEqual(cleanup.cleanup_tasks, []);
      db.prepare('DELETE FROM courses WHERE id = ?').run(PROJECT);
    })();
    assert.equal((db.prepare('SELECT count(*) AS n FROM canvas_assets').get() as Row).n, 1);
    assert.equal(rows(db, 'operation_batches')[0].id, transfer.batch_id);
    assert.equal((await request('GET', path)).visuals[0].data.tray_source.extensions.image.asset_id, 'fixture-image');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.deepEqual(db.prepare('SELECT verb FROM events').all(), []);
  });
});

test('zero-geometry bound connector resolves against the final board grid', async () => {
  await withRoutes(async (db, request, path) => {
    db.exec(`UPDATE canvas_placements SET x=0,y=0,width=0,height=0,rotation=0 WHERE id IN ('shape-p','table-p','connector-p');
      UPDATE visual_connector_extensions SET start_kind='object',start_object_id='shape-o',start_anchor='east',
      start_x=NULL,start_y=NULL,end_kind='object',end_object_id='table-o',end_anchor='west',end_x=NULL,end_y=NULL
      WHERE object_id='connector-o'`);
    const transfer = await request('POST', `${path}/relocate-tray`, { placement_ids: ['connector-p', 'shape-p', 'table-p'] }, 201);
    const board = await request('GET', path);
    const connector = board.visuals.find((v: Row) => v.visual_kind === 'connector');
    const shape = board.visuals.find((v: Row) => v.visual_kind === 'shape');
    const table = board.visuals.find((v: Row) => v.visual_kind === 'table');
    assert.deepEqual(connector.data.connector_points, {
      start: { x: shape.x + shape.w - connector.x, y: shape.y + shape.h / 2 - connector.y },
      end: { x: table.x - connector.x, y: table.y + table.h / 2 - connector.y },
    });
    assert.notDeepEqual(connector.data.connector_points.start, connector.data.connector_points.end);
    assert.equal(connector.data.tray_source.placement.width, 0);
    assert.equal(connector.data.tray_source.extensions.connector.start_x, null);
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {});
    db.exec(`UPDATE visual_connector_extensions SET start_kind='point',start_object_id=NULL,start_x=-200,start_y=20,
      end_kind='point',end_object_id=NULL,end_x=400,end_y=900 WHERE object_id='connector-o'`);
    await request('POST', `${path}/relocate-tray`, { placement_ids: ['connector-p'] }, 201);
    const bare = (await request('GET', path)).visuals[0];
    assert.deepEqual([bare.x, bare.y, bare.w, bare.h], [40, 40, 280, 180]);
    assert.deepEqual(bare.data.connector_points, { start: { x: -200, y: 20 }, end: { x: 400, y: 900 } });
    assert.equal(bare.data.tray_source.extensions.connector.start_x, -200);
  });
});

test('undo preserves later source extension or backing-text edits by refusing to remove the board snapshot', async () => {
  await withRoutes(async (db, request, path) => {
    const transfer = await request('POST', `${path}/relocate-tray`, { placement_ids: ['shape-p', 'table-p'] }, 201);
    const visualBefore = rows(db, 'board_visuals');
    const tableBefore = db.prepare('SELECT data_json FROM structured_object_extensions WHERE object_id = ?').get('table-o') as Row;
    db.prepare('UPDATE structured_object_extensions SET data_json = ? WHERE object_id = ?').run('{"later":true}', 'table-o');
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {}, 409);
    assert.deepEqual(rows(db, 'board_visuals'), visualBefore);
    assert.equal((db.prepare('SELECT data_json FROM structured_object_extensions WHERE object_id = ?').get('table-o') as Row).data_json, '{"later":true}');
    db.prepare('UPDATE structured_object_extensions SET data_json = ? WHERE object_id = ?').run(tableBefore.data_json, 'table-o');
    db.prepare('UPDATE note_blocks SET plain_text = ? WHERE id = ?').run('Later source text', 'shape-text');
    await request('POST', `${path}/relocate-tray/${transfer.batch_id}/undo`, {}, 409);
    assert.deepEqual(rows(db, 'board_visuals'), visualBefore);
    assert.equal((db.prepare('SELECT plain_text FROM note_blocks WHERE id = ?').get('shape-text') as Row).plain_text, 'Later source text');
    assert.equal(db.prepare('SELECT 1 FROM canvas_placements WHERE id = ?').get('shape-p'), undefined);
  });
});
