import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import type { Server } from 'node:http';
import type { BoardTextRangeV1 } from '../../../shared/types/boardTextRange.js';
import migration057 from '../db/migrations/057_v13_boards.js';
import migration059 from '../db/migrations/059_v13_board_text_ranges.js';
import { createBoardRouter } from '../routes/boards.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoard, deleteBoard, getBoard } from '../services/boards.js';
import { createBoardTextRange, getBoardTextRange, listBoardTextRanges, updateBoardTextRanges } from '../services/boardTextRanges.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

async function fixture(t: TestContext) {
  const db = await createV13BoardsFixture();
  t.after(() => db.close());
  db.exec(`
    INSERT INTO users (id,email,password_hash,name) VALUES ('user','board-range@example.invalid','synthetic','Fixture');
    INSERT INTO courses (id,user_id,name) VALUES ('project','user','Fixture project');
    INSERT INTO notes (id,user_id,course_id,title) VALUES ('note','user','project','Source note');
    INSERT INTO note_blocks (id,user_id,course_id,block_type) VALUES ('block','user','project','text');
    INSERT INTO note_block_placements (id,block_id,note_id,order_index) VALUES ('placement','block','note',0);
  `);
  return db;
}

function flow(text: string) {
  return { textflow_version: 1, units: [{ id: 'unit', text, writing_role: 'paragraph',
    indent_level: 0, order_index: 0, metadata: {}, status: 'active' }], inline_structures: [], metadata: {} };
}

function writeBody(db: Database.Database, textFlow: ReturnType<typeof flow>) {
  db.prepare("UPDATE note_blocks SET content_json = ? WHERE id = 'block'").run(JSON.stringify({ text_flow: textFlow }));
}

function create(db: Database.Database, title = 'Board') {
  return db.transaction(() => {
    const board = createBoard(db, 'user', { title, purpose: { title: `${title} purpose` } }).board;
    const anchor = createBoardTextRange(db, 'user', board.id, { note_id: 'note', block_id: 'block',
      text_flow_id: 'textflow-block', text_unit_id: 'unit', start_offset: 7, end_offset: 13,
      excerpt: 'target', at: '2026-09-09T12:00:00.000Z' });
    // M1 has no public member write door. The fixture inserts a projection directly.
    db.prepare(`INSERT INTO board_members (id, board_id, member_kind, member_id, created_at, updated_at)
      VALUES (?, ?, 'text_range', ?, 'test', 'test')`).run(`member-${anchor.id}`, board.id, anchor.id);
    return { board, anchor };
  })();
}

function patch(db: Database.Database, ranges: BoardTextRangeV1[]) {
  const text_ranges = ranges.map(({ id, block_id, text_flow_id, text_unit_id, start_offset, end_offset,
    excerpt, status, pre_edit_offsets }) => ({ id, block_id, text_flow_id, text_unit_id, start_offset,
    end_offset, excerpt, status, pre_edit_offsets }));
  return db.transaction(() => updateBoardTextRanges(db, 'user', 'note', { text_ranges }))();
}

async function rebaseFunction() {
  // Execute the actual editor algorithm without pulling client files into server's tsc rootDir.
  return (await import(new URL('../../../client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.ts', import.meta.url).href)) as {
    rebaseBoardTextRanges: (input: { ranges: BoardTextRangeV1[]; blockId: string;
      previousTextFlow: ReturnType<typeof flow>; nextTextFlow: ReturnType<typeof flow> }) => BoardTextRangeV1[];
  };
}

test('M1 actual edit rebase + body/range commits + GET keeps two independent board anchors live', async (t) => {
  const { rebaseBoardTextRanges } = await rebaseFunction();
  const db = await fixture(t);
  const before = flow('before target after');
  writeBody(db, before);
  const first = create(db, 'First');
  const second = create(db, 'Second');
  assert.notEqual(first.anchor.id, second.anchor.id);
  const after = flow('insert before target after');
  const updates = rebaseBoardTextRanges({ ranges: listBoardTextRanges(db, 'user', 'note'), blockId: 'block',
    previousTextFlow: before, nextTextFlow: after });
  writeBody(db, after);
  assert.equal(getBoard(db, 'user', first.board.id).members[0].reference.anchor_status, 'drifted');
  patch(db, updates);
  for (const entry of [first, second]) {
    const member = getBoard(db, 'user', entry.board.id).members[0];
    assert.equal(member.reference.anchor_status, 'active');
    assert.equal(member.reference.summary, 'target');
    assert.equal(getBoardTextRange(db, 'user', entry.anchor.id)?.start_offset, 14);
  }
  const changed = flow('insert before revised after');
  const refreshed = rebaseBoardTextRanges({ ranges: listBoardTextRanges(db, 'user', 'note'), blockId: 'block',
    previousTextFlow: after, nextTextFlow: changed });
  writeBody(db, changed);
  patch(db, refreshed);
  assert.equal(getBoard(db, 'user', first.board.id).members[0].reference.summary, 'revised');
  assert.equal(getBoard(db, 'user', second.board.id).members[0].reference.summary, 'revised');
});

test('M1 deleting a selected range and splitting its unit degrade with snapshot and original offsets', async (t) => {
  const { rebaseBoardTextRanges } = await rebaseFunction();
  const db = await fixture(t);
  const before = flow('before target after');
  writeBody(db, before);
  const first = create(db);
  const after = flow('before  after');
  const updates = rebaseBoardTextRanges({ ranges: [first.anchor], blockId: 'block', previousTextFlow: before, nextTextFlow: after });
  writeBody(db, after);
  patch(db, updates);
  const reference = getBoard(db, 'user', first.board.id).members[0].reference;
  assert.equal(reference.anchor_status, 'drifted');
  assert.equal(reference.summary, 'target');
  assert.equal(reference.note_id, 'note');
  assert.deepEqual(getBoardTextRange(db, 'user', first.anchor.id)?.pre_edit_offsets, { start_offset: 7, end_offset: 13 });
  writeBody(db, before);
  assert.equal(getBoard(db, 'user', first.board.id).members[0].reference.anchor_status, 'drifted');
  const second = create(db, 'Split');
  const split = flow('before tar');
  split.units.push({ ...split.units[0], id: 'split-unit', text: 'get after', order_index: 1 });
  const splitUpdates = rebaseBoardTextRanges({ ranges: [second.anchor], blockId: 'block', previousTextFlow: before, nextTextFlow: split });
  writeBody(db, split);
  db.prepare("UPDATE notes SET status = 'trashed' WHERE id = 'note'").run();
  patch(db, splitUpdates);
  assert.equal(getBoard(db, 'user', second.board.id).members[0].reference.anchor_status, 'lost');
  db.prepare("UPDATE notes SET status = 'active' WHERE id = 'note'").run();
  assert.equal(getBoard(db, 'user', second.board.id).members[0].reference.anchor_status, 'drifted');
  assert.equal(getBoard(db, 'user', second.board.id).members[0].reference.summary, 'target');
});

test('F17 ordinary board range saves cannot revive drift or replace its original evidence', async (t) => {
  const { rebaseBoardTextRanges } = await rebaseFunction();
  const db = await fixture(t);
  const before = flow('before target after');
  writeBody(db, before);
  const { board, anchor } = create(db);
  const after = flow('before  after');
  const updates = rebaseBoardTextRanges({ ranges: [anchor], blockId: 'block', previousTextFlow: before, nextTextFlow: after });
  writeBody(db, after);
  patch(db, updates);
  writeBody(db, before);
  patch(db, [{ ...anchor, excerpt: 'replacement evidence', pre_edit_offsets: null }]);
  const stored = getBoardTextRange(db, 'user', anchor.id)!;
  assert.equal(stored.status, 'drifted');
  assert.equal(stored.excerpt, 'target');
  assert.deepEqual(stored.pre_edit_offsets, { start_offset: 7, end_offset: 13 });
  assert.equal(getBoard(db, 'user', board.id).members[0].reference.anchor_status, 'drifted');
  const { id, block_id, text_flow_id, text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets } = anchor;
  assert.throws(() => db.transaction(() => updateBoardTextRanges(db, 'user', 'note', {
    text_ranges: [{ id, block_id, text_flow_id, text_unit_id, start_offset, end_offset,
      excerpt, status, pre_edit_offsets, history_restore: true }],
  }))(), /history_restore/);
  assert.deepEqual(getBoardTextRange(db, 'user', anchor.id), stored);
});

test('M1 source trash/restore revives active anchors, hard deletion retains snapshots, board deletion owns cleanup', async (t) => {
  const db = await fixture(t);
  writeBody(db, flow('before target after'));
  const { board, anchor } = create(db);
  const reference = () => getBoard(db, 'user', board.id).members[0].reference;
  db.prepare("UPDATE note_blocks SET status = 'trashed' WHERE id = 'block'").run();
  assert.equal(reference().anchor_status, 'lost');
  assert.equal(reference().summary, 'target');
  db.prepare("UPDATE note_blocks SET status = 'active' WHERE id = 'block'").run();
  assert.equal(reference().anchor_status, 'active');
  db.prepare("UPDATE notes SET status = 'trashed' WHERE id = 'note'").run();
  assert.equal(reference().anchor_status, 'lost');
  db.prepare("UPDATE notes SET status = 'active' WHERE id = 'note'").run();
  assert.equal(reference().anchor_status, 'active');
  db.prepare("DELETE FROM note_blocks WHERE id = 'block'").run();
  assert.equal(reference().anchor_status, 'lost');
  assert.equal(reference().summary, 'target');
  db.prepare("DELETE FROM notes WHERE id = 'note'").run();
  assert.equal(reference().anchor_status, 'lost');
  assert.equal(reference().note_id, 'note');
  assert.ok(getBoardTextRange(db, 'user', anchor.id));
  db.transaction(() => deleteBoard(db, 'user', board.id))();
  assert.equal(getBoardTextRange(db, 'user', anchor.id), null);
});

test('M1 059 fresh/base schema and legacy migration converge without annotation foreign keys', async (t) => {
  const fresh = await createV13BoardsFixture();
  t.after(() => fresh.close());
  const upgraded = await createV13BoardsFixture({ beforeBoardsMigration: true });
  t.after(() => upgraded.close());
  upgraded.transaction(() => { migration057.up(upgraded); migration059.up(upgraded); })();
  const shape = (db: Database.Database) => db.prepare(`SELECT type, name, sql FROM sqlite_master
    WHERE tbl_name = 'board_text_ranges' ORDER BY name`).all().map((row: any) => ({ ...row,
    sql: row.sql?.replace(/\s+/g, ' ').trim() ?? null }));
  assert.deepEqual(shape(fresh), shape(upgraded));
  migration059.up(upgraded);
  assert.deepEqual(shape(fresh), shape(upgraded));
  const foreignKeys = fresh.pragma('foreign_key_list(board_text_ranges)') as { table: string }[];
  assert.deepEqual(foreignKeys.map((row) => row.table).sort(), ['boards', 'users']);
});

test('M2 HTTP paste mints independent durable anchors with mounted/unmounted receipts in one transaction', async (t) => {
  const db = await fixture(t);
  writeBody(db, flow('before target after'));
  const board = db.transaction(() => createBoard(db, 'user', { title: 'Paste', purpose: { title: 'Question' } }))().board;
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = 'user'; next(); });
  app.use('/api/boards', createBoardRouter(() => db));
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error.message });
  });
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const request = async (method: string, path: string, body?: unknown, expected = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/boards${path}`, {
        method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, expected, JSON.stringify(result));
      return result;
    };
    const selection = { note_id: 'note', block_id: 'block', text_flow_id: 'textflow-block', text_unit_id: 'unit',
      start_offset: 7, end_offset: 13, excerpt: 'target', at: '2026-09-09T12:00:00.000Z' };
    const first = await request('POST', `/${board.id}/text-ranges`, { text_range: selection, x: 80, y: 40, w: 300 }, 201);
    const second = await request('POST', `/${board.id}/text-ranges`, { text_range: selection }, 201);
    assert.notEqual(first.member.member_id, second.member.member_id);
    assert.equal(first.member.member_kind, 'text_range');
    assert.equal(first.member.reference.anchor_status, 'active');
    const reopened = await request('GET', `/${board.id}`);
    assert.equal(reopened.members.length, 2);
    assert.equal(reopened.members.find((entry: any) => entry.id === first.member.id).x, 80);
    const ranges = await request('GET', '/text-ranges/by-note/note');
    assert.equal(ranges.text_ranges.length, 2);
    // A stale editor submits one dirty anchor; the later paste is retained.
    const existing = ranges.text_ranges.find((range: BoardTextRangeV1) => range.id === first.member.member_id) as BoardTextRangeV1;
    const { id, block_id, text_flow_id, text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets } = existing;
    const saved = await request('PUT', '/text-ranges/by-note/note', { text_ranges: [{ id, block_id, text_flow_id,
      text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets }] });
    assert.equal(saved.text_ranges.length, 2);
    const events = db.prepare('SELECT verb, objects FROM events ORDER BY seq').all() as { verb: string; objects: string }[];
    assert.deepEqual(events.map((event) => event.verb), ['mounted', 'mounted']);
    assert.deepEqual(JSON.parse(events[0].objects), [{ kind: 'board', id: board.id },
      { kind: 'board_member', id: first.member.id }, { kind: 'text_range', id: first.member.member_id }]);
    // A receipt write failure must also roll back the newly minted anchor and mount.
    db.exec(`CREATE TRIGGER synthetic_receipt_failure BEFORE INSERT ON events
      WHEN NEW.verb = 'mounted' BEGIN SELECT RAISE(ABORT, 'synthetic_receipt_failure'); END`);
    await request('POST', `/${board.id}/text-ranges`, { text_range: selection }, 500);
    assert.equal((await request('GET', '/text-ranges/by-note/note')).text_ranges.length, 2);
    assert.equal((await request('GET', `/${board.id}`)).members.length, 2);
    db.exec('DROP TRIGGER synthetic_receipt_failure');
    await request('DELETE', `/${board.id}/members/${first.member.id}`, {});
    assert.equal(getBoardTextRange(db, 'user', first.member.member_id), null);
    assert.deepEqual((db.prepare('SELECT verb FROM events ORDER BY seq').all() as { verb: string }[])
      .map((event) => event.verb), ['mounted', 'mounted', 'unmounted']);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
