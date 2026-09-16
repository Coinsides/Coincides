import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'node:http';
import type Database from 'better-sqlite3';
import express from 'express';
import migration078 from '../db/migrations/078_v14_board_visuals.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';
import {
  createBoard, getBoard, createBoardLayer, deleteBoardLayer, deleteBoard,
  mountBoardMember, updateBoardMember, unmountBoardMember,
  createBoardSticky, updateBoardSticky, deleteBoardSticky,
  createBoardEdge, updateBoardEdge, rerouteBoardEdge,
} from '../services/boards.js';
import { createBoardRouter } from '../routes/boards.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const USER = 'visual-owner';
function seed(db: Database.Database): void {
  db.exec(`INSERT INTO users (id,email,password_hash,name) VALUES
    ('visual-owner','board-visual-owner@example.invalid','synthetic','Synthetic'),
    ('visual-other','board-visual-other@example.invalid','synthetic','Synthetic');
    INSERT INTO courses (id,user_id,name) VALUES ('visual-project','visual-owner','Synthetic');
    INSERT INTO notes (id,user_id,course_id,title) VALUES ('visual-note','visual-owner','visual-project','Source');`);
}
async function fixture() {
  const db = await createV13BoardsFixture();
  seed(db);
  const board = db.transaction(() => createBoard(db, USER, { title: 'Visual fixture', purpose: { title: 'Think' } }).board)();
  const write = <T>(run: () => T): T => db.transaction(run)();
  return { db, board, write };
}
const point = (x: number, y: number) => ({ kind: 'point' as const, x, y });
const stickyEnd = (id: string, anchor = 'auto') => ({ kind: 'sticky', id, anchor });
function rows(db: Database.Database, table: string) { return db.prepare(`SELECT * FROM ${table} ORDER BY id`).all(); }

test('078 migrates thirteen legacy edges without altering their style, labels or straight geometry; idempotent', async (t) => {
  const db = await createV13BoardsFixture({ beforeBoardVisualMigration: true });
  t.after(() => db.close());
  seed(db);
  const { board } = db.transaction(() => createBoard(db, USER, { title: '13 legacy lines', purpose: { title: 'Keep' } }))();
  const a = db.transaction(() => mountBoardMember(db, USER, board.id, { member_kind: 'note', member_id: 'visual-note' }).member)();
  const b = db.transaction(() => mountBoardMember(db, USER, board.id, { member_kind: 'note', member_id: 'visual-note', x: 600 }).member)();
  const statement = db.prepare('INSERT INTO board_edges(id,board_id,from_member_id,to_member_id,style,label,created_at) VALUES (?,?,?,?,?,?,?)');
  for (let i = 0; i < 13; i++) statement.run(`legacy-${i}`, board.id, a.id, b.id,
    JSON.stringify({ width: i + 1, direction: 'forward', custom: { preserve: true } }), `Legacy ${i}`, 'before');
  const before = rows(db, 'board_edges');
  const domains = ['notes', 'items', 'relations', 'board_visuals'];
  const domainBefore = domains.map((table) => rows(db, table));
  db.transaction(() => migration078.up(db))();
  const after = getBoard(db, USER, board.id).edges;
  assert.equal(after.length, 13);
  for (const edge of after) {
    const prior = before.find((row: any) => row.id === edge.id) as Record<string, unknown>;
    for (const key of Object.keys(prior)) assert.deepEqual(key === 'style' ? JSON.stringify(edge.style) : (edge as any)[key], prior[key]);
    assert.deepEqual([edge.bend, edge.dash, edge.weight, edge.cap_start, edge.cap_end, edge.color_index,
      edge.from_anchor, edge.to_anchor, edge.label_position, edge.visual_version],
    [0, 'solid', 1, 'none', 'none', null, 'auto', 'auto', 0.5, 0]);
  }
  assert.deepEqual(domains.map((table) => rows(db, table)), domainBefore);
  const migrated = rows(db, 'board_edges');
  db.transaction(() => migration078.up(db))();
  assert.deepEqual(rows(db, 'board_edges'), migrated);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('sticky lifecycle is board-owned, fixed-width, neutral by default, and separate from old chalk', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const domains = ['notes', 'items', 'relations', 'board_visuals', 'content_groups'];
  const before = domains.map((table) => rows(db, table));
  const sticky = write(() => createBoardSticky(db, USER, board.id, { text: 'A thought' }));
  assert.deepEqual([sticky.w, sticky.h, sticky.scale, sticky.weight, sticky.color_index], [240, 240, 1, 1, null]);
  const updated = write(() => updateBoardSticky(db, USER, board.id, sticky.id, { text: '中'.repeat(500), w: 416, color_index: 1, weight: 3 }));
  assert.ok(updated.h > 120);
  assert.equal(getBoard(db, USER, board.id).stickies[0].text, updated.text);
  assert.deepEqual(domains.map((table) => rows(db, table)), before);
  assert.equal(write(() => deleteBoardSticky(db, USER, board.id, sticky.id)), true);
  assert.equal(write(() => deleteBoardSticky(db, USER, board.id, sticky.id)), false);
});

test('sticky rejects unknown fields, widths, colors and nonfinite geometry', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  for (const input of [{ w: 300 }, { h: 20 }, { scale: 2 }, { weight: 4 }, { color_index: 2 },
    { text: 'x'.repeat(12001) }, { x: Infinity }, { item_id: 'forbidden' }, { reference: {} }]) {
    assert.throws(() => write(() => createBoardSticky(db, USER, board.id, input)), /invalid_board_input/);
  }
  assert.throws(() => createBoardSticky(db, USER, board.id, {}), /caller-owned transaction/);
});

test('sticky fallback height includes border-box padding for full-width CJK wrapping', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const sticky = write(() => createBoardSticky(db, USER, board.id, { text: '中'.repeat(240), w: 416 }));
  // 416 - 2*16 padding - 2*1 border = 382px, fitting 23 full-width glyphs.
  assert.equal(sticky.h, 11 * 24 + 34);
  const square = write(() => updateBoardSticky(db, USER, board.id, sticky.id, { w: 240 }));
  assert.equal(square.h, 20 * 24 + 34);
  const measured = write(() => updateBoardSticky(db, USER, board.id, sticky.id, { w: 416, h: 312 }));
  assert.equal(measured.h, 312, 'client-measured height overrides the server fallback');
});

test('edges bind member or sticky or free point; detach and delete cascade only board projections', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const member = write(() => mountBoardMember(db, USER, board.id, { member_kind: 'note', member_id: 'visual-note', w: 240, h: 240 }).member);
  const sticky = write(() => createBoardSticky(db, USER, board.id, { x: 500 }));
  const edge = write(() => createBoardEdge(db, USER, board.id, { from_member_id: member.id, to: stickyEnd(sticky.id, 'w') }));
  assert.deepEqual(edge.from, { kind: 'member', id: member.id, anchor: 'auto' });
  assert.deepEqual(edge.to, { kind: 'sticky', id: sticky.id, anchor: 'w' });
  assert.equal(edge.to_member_id, null);
  const detached = write(() => updateBoardEdge(db, USER, board.id, edge.id, { to: point(550, 50) }));
  assert.equal(detached.to_sticky_id, null);
  write(() => deleteBoardSticky(db, USER, board.id, sticky.id));
  assert.equal(getBoard(db, USER, board.id).edges.length, 1);
  write(() => unmountBoardMember(db, USER, board.id, member.id));
  assert.equal(getBoard(db, USER, board.id).edges.length, 0);
  assert.ok(db.prepare("SELECT id FROM notes WHERE id='visual-note'").get());
  const a = write(() => createBoardSticky(db, USER, board.id, {}));
  const b = write(() => createBoardSticky(db, USER, board.id, { x: 800 }));
  write(() => createBoardEdge(db, USER, board.id, { from: stickyEnd(a.id), to: stickyEnd(b.id) }));
  write(() => deleteBoardSticky(db, USER, board.id, a.id));
  assert.equal(getBoard(db, USER, board.id).edges.length, 0);
});

test('edge enums, anchors, points, and label positions are closed and validated', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const a = write(() => createBoardSticky(db, USER, board.id, {}));
  for (const anchor of ['auto', 'n', 'e', 's', 'w']) {
    const edge = write(() => createBoardEdge(db, USER, board.id, { from: stickyEnd(a.id, anchor), to: point(800, 100),
      bend: 0, dash: 'dashed', weight: 3, cap_start: 'dot', cap_end: 'arrow', label_position: 0.2 }));
    assert.equal(edge.from_anchor, anchor); assert.equal(edge.bend, 0); assert.equal(edge.label_position, 0.2);
  }
  const base = { from: point(0, 0), to: point(100, 100) };
  for (const bad of [{ dash: 'dotted' }, { weight: 4 }, { cap_start: 'diamond' }, { cap_end: 'triangle' },
    { label_position: -1 }, { label_position: 1.01 }, { bend: NaN }, { color_index: 2 },
    { from: stickyEnd(a.id, 'north') }, { from_member_id: 'mixed' }, { from: { kind: 'relation', id: 'x' } }]) {
    assert.throws(() => write(() => createBoardEdge(db, USER, board.id, { ...base, ...bad })), /invalid_board_input/);
  }
});

test('cross-board and cross-user references fail both service ownership and endpoint database foreign keys', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const other = write(() => createBoard(db, 'visual-other', { title: 'Other', purpose: { title: 'Other' } }).board);
  const sticky = write(() => createBoardSticky(db, 'visual-other', other.id, {}));
  assert.throws(() => write(() => createBoardSticky(db, USER, other.id, {})), /board_not_found/);
  assert.throws(() => write(() => createBoardEdge(db, USER, board.id, { from: stickyEnd(sticky.id), to: point(1, 1) })), /board_edge_sticky_not_found/);
  assert.throws(() => db.prepare(`INSERT INTO board_edges(id,board_id,from_sticky_id,to_x,to_y,created_at)
    VALUES ('bad',?,?,1,1,'now')`).run(board.id, sticky.id), /FOREIGN KEY/);
  assert.throws(() => db.prepare(`INSERT INTO board_edges(id,board_id,from_x,to_x,to_y,created_at)
    VALUES ('bad',?,1,1,1,'now')`).run(board.id), /CHECK/);
});

test('new edges route once around blockers, persist through moves, and reroute only explicitly', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const a = write(() => createBoardSticky(db, USER, board.id, { x: 0, y: 0 }));
  const b = write(() => createBoardSticky(db, USER, board.id, { x: 900, y: 0 }));
  const blocker = write(() => createBoardSticky(db, USER, board.id, { x: 450, y: 0 }));
  const edge = write(() => createBoardEdge(db, USER, board.id, { from: stickyEnd(a.id), to: stickyEnd(b.id) }));
  assert.notEqual(edge.bend, 0);
  write(() => updateBoardSticky(db, USER, board.id, blocker.id, { y: 1000 }));
  assert.equal(getBoard(db, USER, board.id).edges[0].bend, edge.bend);
  const rerouted = write(() => rerouteBoardEdge(db, USER, board.id, edge.id));
  assert.notEqual(rerouted.bend, 0); assert.notEqual(rerouted.bend, edge.bend);
  write(() => updateBoardSticky(db, USER, board.id, a.id, { x: -100 }));
  assert.equal(getBoard(db, USER, board.id).edges[0].bend, rerouted.bend);
});

test('legacy label and style edits preserve renderer version; visual edits upgrade and undo may restore', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const edge = write(() => createBoardEdge(db, USER, board.id, { from: point(0, 0), to: point(500, 0), visual_version: 0, style: { direction: 'forward' } }));
  assert.equal(edge.bend, 0);
  const label = write(() => updateBoardEdge(db, USER, board.id, edge.id, { label: 'still straight', label_position: 0.8 }));
  assert.equal(label.visual_version, 0); assert.equal(label.bend, 0);
  assert.equal(write(() => updateBoardEdge(db, USER, board.id, edge.id, { style: { width: 3 } })).visual_version, 0);
  assert.equal(write(() => updateBoardEdge(db, USER, board.id, edge.id, { weight: 3 })).visual_version, 1);
  assert.equal(write(() => updateBoardEdge(db, USER, board.id, edge.id, { weight: 1, visual_version: 0 })).visual_version, 0);
});

test('layer removal relocates stickies; board deletion owns their lifecycle', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  const layer = write(() => createBoardLayer(db, USER, board.id, { name: 'Thoughts' }));
  const sticky = write(() => createBoardSticky(db, USER, board.id, { layer_id: layer.id }));
  assert.equal(write(() => deleteBoardLayer(db, USER, board.id, layer.id)).moved_count, 1);
  assert.equal(getBoard(db, USER, board.id).stickies[0].layer_id, null);
  write(() => createBoardEdge(db, USER, board.id, { from: stickyEnd(sticky.id), to: point(800, 0) }));
  assert.equal(write(() => deleteBoard(db, USER, board.id)).sticky_count, 1);
  assert.deepEqual(rows(db, 'board_stickies'), []); assert.deepEqual(rows(db, 'board_edges'), []);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('rerouting legacy lines retains old direction arrows and existing v1 endpoint caps', async (t) => {
  const { db, board, write } = await fixture(); t.after(() => db.close());
  for (const [direction, expected] of [
    ['none', ['none', 'none']], ['forward', ['none', 'arrow']], ['both', ['arrow', 'arrow']],
  ] as const) {
    const edge = write(() => createBoardEdge(db, USER, board.id, {
      from: point(0, 0), to: point(500, 0), visual_version: 0, style: { direction }, label: 'Retained',
    }));
    const rerouted = write(() => rerouteBoardEdge(db, USER, board.id, edge.id));
    assert.equal(rerouted.visual_version, 1);
    assert.deepEqual([rerouted.cap_start, rerouted.cap_end], expected);
    assert.deepEqual(rerouted.style, { direction });
    assert.equal(rerouted.label, 'Retained');
  }
  const current = write(() => createBoardEdge(db, USER, board.id, {
    from: point(0, 0), to: point(500, 0), cap_start: 'dot', cap_end: 'none', style: { direction: 'both' },
  }));
  const rerouted = write(() => rerouteBoardEdge(db, USER, board.id, current.id));
  assert.deepEqual([rerouted.cap_start, rerouted.cap_end], ['dot', 'none']);
});

test('HTTP sticky lifecycle, edge patch and explicit reroute use board routes without semantic events', async (t) => {
  const { db, board } = await fixture(); t.after(() => db.close());
  const app = express(); app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
  app.use('/api/boards', createBoardRouter(() => db));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err instanceof AppError ? err.statusCode : 500).json({ error: err.message });
  });
  const server = await new Promise<Server>((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}/api/boards/${board.id}`;
  async function request(method: string, path: string, body?: unknown, status = 200) {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, status); return await response.json() as any;
  }
  const eventsBefore = db.prepare('SELECT * FROM events').all();
  const { sticky } = await request('POST', '/stickies', { text: 'Visual thought', w: 416 }, 201);
  assert.equal(sticky.h, 120);
  await request('PATCH', `/stickies/${sticky.id}`, { weight: 2 });
  const { edge } = await request('POST', '/edges', { from: stickyEnd(sticky.id), to: point(900, 0), label: 'Label' }, 201);
  await request('PATCH', `/edges/${edge.id}`, { dash: 'dashed', label_position: 0.3 });
  const rerouted = await request('POST', `/edges/${edge.id}/reroute`, {}); assert.equal(rerouted.edge.id, edge.id);
  assert.equal((await request('GET', '')).stickies.length, 1);
  await request('POST', `/edges/${edge.id}/reroute`, { continuous: true }, 400);
  await request('DELETE', `/stickies/${sticky.id}`, {});
  assert.equal((await request('GET', '')).edges.length, 0);
  assert.deepEqual(db.prepare('SELECT * FROM events').all(), eventsBefore);
});
