import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import type Database from 'better-sqlite3';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import { createPurposeRouter } from '../routes/purposes.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const USER = 'board-route-user';
const PROJECT = 'board-route-project';
const OTHER_PROJECT = 'board-route-other-project';
const NOTE = 'board-route-note';
const GROUP = 'board-route-group';

async function withRoutes(run: (db: Database.Database, request: Request) => Promise<void>): Promise<void> {
  const db = await createV13BoardsFixture();
  let server: Server | undefined;
  try {
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')")
      .run(USER, 'synthetic-board-route@example.invalid');
    for (const id of [PROJECT, OTHER_PROJECT]) {
      db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(id, USER, id);
    }
    db.prepare('INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,?)')
      .run(NOTE, USER, OTHER_PROJECT, 'Cross-project paper');
    db.prepare('INSERT INTO content_groups (id,user_id,course_id,note_id,title) VALUES (?,?,?,?,?)')
      .run(GROUP, USER, OTHER_PROJECT, NOTE, 'A group');
    const app = express();
    app.use(express.json());
    // This is the post-auth route contract. No JWT generation, auth server, env
    // loader or application startup is involved in this disposable fixture.
    app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
    app.use('/api/boards', createBoardRouter(() => db));
    app.use('/api/purposes', createPurposeRouter(() => db));
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
    const request: Request = async (method, path, body, status = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        method,
        ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    };
    await run(db, request);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
}

type Request = (method: string, path: string, body?: unknown, status?: number) => Promise<any>;
function rows(db: Database.Database, table: string) {
  // Table names are test literals, never request inputs.
  return db.prepare(`SELECT * FROM ${table} ORDER BY id`).all();
}

test('13.3 synthetic HTTP smoke: create soul/board, two projections, edge, visuals and all four verbs', async () => {
  await withRoutes(async (db, request) => {
    const contentBefore = { notes: rows(db, 'notes'), groups: rows(db, 'content_groups') };
    assert.deepEqual(await request('GET', `/api/purposes/by-note/${NOTE}`), { purposes: [] });
    assert.deepEqual(rows(db, 'purposes'), []);
    assert.deepEqual(await request('PUT', `/api/purposes/by-note/${NOTE}`, { purposes: [] }, 410), {
      error: 'note_purpose_writer_retired',
    });

    const { purpose: unattached } = await request('POST', '/api/purposes', { title: 'Independent question' }, 201);
    assert.equal(unattached.project_id, null);
    assert.equal(unattached.note_id, null);
    const { board: attached } = await request('POST', '/api/boards', { title: 'Attached', soul_id: unattached.id }, 201);
    assert.equal(attached.soul_id, unattached.id);
    await request('POST', '/api/boards', { title: 'Occupied', soul_id: unattached.id }, 409);

    const quote = '  开板原话。\n保留空白。  ';
    const { board } = await request('POST', '/api/boards', {
      title: 'A line of thought', project_id: PROJECT, purpose: { title: 'Why does this fit?' },
      summary: quote, purpose_summary: '  立魂原话  ',
    }, 201);
    const path = `/api/boards/${board.id}`;
    const noteInput = { id: 'board-route-note-mount', member_kind: 'note', member_id: NOTE, x: 10, y: 20, w: 300, h: 200 };
    const { member: note } = await request('POST', `${path}/members`, noteInput, 201);
    const retry = await request('POST', `${path}/members`, { ...noteInput, x: 999 });
    assert.equal(retry.created, false);
    assert.equal(retry.member.x, 10);
    const { member: group } = await request('POST', `${path}/members`, {
      member_kind: 'content_group', member_id: GROUP, x: 400, y: 20,
    }, 201);
    const { edge } = await request('POST', `${path}/edges`, {
      from_member_id: note.id, to_member_id: group.id, label: 'supports a question', style: { dash: [3, 2] },
    }, 201);
    const { visual } = await request('POST', `${path}/visuals`, {
      visual_kind: 'freehand', rotation: 13,
      data: { points: [{ x: 1, y: 2, pressure: 0.4 }, { x: 3, y: 8 }], style: { color: 'ink' } },
    }, 201);
    const ledgerBeforePolish = db.prepare('SELECT * FROM events ORDER BY seq').all();
    await request('PATCH', path, { title: 'Renamed', viewport: { x: -12000, y: 48000, zoom: 3.5 } });
    await request('PATCH', `${path}/members/${note.id}`, { x: -80, scale: 0.5, pinned: true });
    await request('PATCH', `${path}/edges/${edge.id}`, { label: 'amended' });
    await request('PATCH', `${path}/visuals/${visual.id}`, { rotation: 27 });
    assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY seq').all(), ledgerBeforePolish);
    const reopened = await request('GET', path);
    assert.deepEqual(reopened.board.viewport, { x: -12000, y: 48000, zoom: 3.5 });
    assert.equal(reopened.members.length, 2);
    assert.equal(reopened.visuals[0].rotation, 27);
    assert.equal(reopened.edges[0].label, 'amended');
    assert.equal((await request('GET', '/api/boards')).boards.length, 2);
    await request('DELETE', `${path}/members/${group.id}`, { summary: 'Unmounted in the smoke' });
    assert.deepEqual((await request('GET', path)).edges, []);
    const beforeRepeat = db.prepare('SELECT * FROM events ORDER BY seq').all();
    assert.equal((await request('DELETE', `${path}/members/${group.id}`)).removed, false);
    assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY seq').all(), beforeRepeat);

    const events = db.prepare('SELECT * FROM events ORDER BY seq').all() as Array<{
      user_id: string; actor_kind: string; channel: string; verb: string; objects: string; summary: string;
    }>;
    assert.deepEqual(events.map((event) => event.verb), [
      'purpose_created', 'board_created', 'purpose_created', 'board_created', 'mounted', 'mounted', 'unmounted',
    ]);
    assert.ok(events.every((event) => event.user_id === USER && event.actor_kind === 'human'));
    assert.deepEqual(events.map((event) => event.channel), [
      'POST /api/purposes', 'POST /api/boards', 'POST /api/boards', 'POST /api/boards',
      'POST /api/boards/:boardId/members', 'POST /api/boards/:boardId/members',
      'DELETE /api/boards/:boardId/members/:memberId',
    ]);
    assert.deepEqual(JSON.parse(events[1].objects), [{ kind: 'board', id: attached.id }, { kind: 'purpose', id: unattached.id }]);
    assert.equal(events[3].summary, quote);
    assert.equal(events[2].summary, '  立魂原话  ');
    assert.deepEqual(rows(db, 'purpose_members'), []);
    assert.deepEqual({ notes: rows(db, 'notes'), groups: rows(db, 'content_groups') }, contentBefore);
    assert.deepEqual(await request('GET', `/api/purposes/${board.soul_id}/compiled-scope`, undefined, 410), {
      error: 'purpose_compiled_scope_deferred',
    });
    console.log('V13_S1_BOARD_SMOKE_PASS db=:memory: verbs=4 events=7 note_and_group=PASS edge=PASS visual=PASS no_content_writes=PASS');
  });
});

test('real route event failures roll back create, mount, unmount and board deletion with owned rows', async () => {
  await withRoutes(async (db, request) => {
    const failVerb = (verb: string) => {
      db.exec('DROP TRIGGER IF EXISTS synthetic_event_failure');
      db.exec(`CREATE TRIGGER synthetic_event_failure BEFORE INSERT ON events
        WHEN NEW.verb = '${verb}' BEGIN SELECT RAISE(ABORT, 'synthetic_event_failed'); END`);
    };
    failVerb('board_created');
    await request('POST', '/api/boards', { title: 'Rolls back', purpose: { title: 'Also rolls back' } }, 500);
    assert.deepEqual(rows(db, 'purposes'), []);
    assert.deepEqual(rows(db, 'boards'), []);
    assert.deepEqual(db.prepare('SELECT * FROM events').all(), []);
    db.exec('DROP TRIGGER synthetic_event_failure');
    const { board } = await request('POST', '/api/boards', { title: 'Keep', purpose: { title: 'Keep soul' } }, 201);
    const path = `/api/boards/${board.id}`;
    failVerb('mounted');
    const stateBeforeMount = rows(db, 'boards');
    await request('POST', `${path}/members`, { member_kind: 'note', member_id: NOTE }, 500);
    assert.deepEqual(rows(db, 'board_members'), []);
    assert.deepEqual(rows(db, 'boards'), stateBeforeMount);
    db.exec('DROP TRIGGER synthetic_event_failure');
    const { member: first } = await request('POST', `${path}/members`, { member_kind: 'note', member_id: NOTE }, 201);
    const { member: second } = await request('POST', `${path}/members`, { member_kind: 'content_group', member_id: GROUP }, 201);
    await request('POST', `${path}/edges`, { from_member_id: first.id, to_member_id: second.id }, 201);
    const before = { boards: rows(db, 'boards'), members: rows(db, 'board_members'), edges: rows(db, 'board_edges'),
      events: db.prepare('SELECT * FROM events ORDER BY seq').all() };
    failVerb('unmounted');
    await request('DELETE', `${path}/members/${first.id}`, undefined, 500);
    assert.deepEqual({ boards: rows(db, 'boards'), members: rows(db, 'board_members'), edges: rows(db, 'board_edges'),
      events: db.prepare('SELECT * FROM events ORDER BY seq').all() }, before);
    await request('POST', `${path}/visuals`, { visual_kind: 'shape', w: 100, h: 80, data: {} }, 201);
    const beforeDelete = {
      boards: rows(db, 'boards'), members: rows(db, 'board_members'), edges: rows(db, 'board_edges'),
      visuals: rows(db, 'board_visuals'), purposes: rows(db, 'purposes'),
      events: db.prepare('SELECT * FROM events ORDER BY seq').all(),
    };
    failVerb('board_deleted');
    await request('DELETE', path, undefined, 500);
    assert.deepEqual({
      boards: rows(db, 'boards'), members: rows(db, 'board_members'), edges: rows(db, 'board_edges'),
      visuals: rows(db, 'board_visuals'), purposes: rows(db, 'purposes'),
      events: db.prepare('SELECT * FROM events ORDER BY seq').all(),
    }, beforeDelete);
    console.log('V13_S1_BOARD_ATOMICITY_PASS create_with_soul=PASS mount=PASS unmount_with_edges=PASS delete_board=PASS');
  });
});
