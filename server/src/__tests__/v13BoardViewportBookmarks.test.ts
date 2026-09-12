import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import { readFileSync } from 'node:fs';
import migration066 from '../db/migrations/066_v13_board_viewport_bookmarks.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import { createBoard } from '../services/boards.js';
import {
  BOARD_VIEWPORT_BOOKMARK_LIMIT,
  BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT,
} from '../validators/boardViewportBookmarks.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const USER = 'viewport-bookmark-user';
const SNAPSHOT = { x: -1320.125, y: 4800.75, zoom: 0.625 };
type Request = (method: string, path: string, body?: unknown, status?: number) => Promise<any>;

function seedOwner(db: Database.Database): void {
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')")
    .run(USER, 'synthetic-viewport-bookmark@example.invalid');
}

function makeBoard(db: Database.Database): string {
  return db.transaction(() => createBoard(db, USER, {
    title: 'Named viewpoints', purpose: { title: 'Synthetic camera snapshots' },
  }))().board.id;
}

async function withRoutes(run: (db: Database.Database, request: Request, boardId: string) => Promise<void>): Promise<void> {
  const db = await createV13BoardsFixture();
  let server: Server | undefined;
  try {
    seedOwner(db);
    const boardId = makeBoard(db);
    const app = express();
    app.use(express.json());
    // Exercise only the post-auth boards contract in a disposable database.
    app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
    app.use('/api/boards', createBoardRouter(() => db));
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const request: Request = async (method, path, body, status = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/boards${path}`, {
        method,
        ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json();
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    };
    await run(db, request, boardId);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
}

function boardState(db: Database.Database) {
  return ['boards', 'board_layers', 'board_members', 'board_edges', 'board_visuals', 'items', 'events']
    .map((table) => db.prepare(`SELECT * FROM ${table}`).all());
}

test('066 creates the same fresh and upgrade bookmark schema without changing existing board rows', async (t) => {
  const fresh = await createV13BoardsFixture();
  t.after(() => fresh.close());
  const upgrade = await createV13BoardsFixture();
  t.after(() => upgrade.close());
  seedOwner(upgrade);
  makeBoard(upgrade);
  // The exact pre-066 boundary: current board tables exist and this new table does not.
  upgrade.exec('DROP TABLE board_viewport_bookmarks');
  const before = boardState(upgrade);
  upgrade.transaction(() => migration066.up(upgrade))();
  upgrade.transaction(() => migration066.up(upgrade))();
  const shape = (db: Database.Database) => db.prepare(`SELECT type, name, sql FROM sqlite_master
    WHERE tbl_name = 'board_viewport_bookmarks' ORDER BY name`).all().map((row: any) => ({
    ...row, sql: row.sql?.replace(/\s+/g, ' ').trim() ?? null,
  }));
  assert.deepEqual(shape(upgrade), shape(fresh));
  assert.deepEqual(boardState(upgrade), before);
  assert.deepEqual((fresh.pragma('table_info(board_viewport_bookmarks)') as Array<{ name: string }>).map((column) => column.name),
    ['id', 'board_id', 'user_id', 'name', 'x', 'y', 'zoom', 'created_at']);
  assert.equal((fresh.pragma('foreign_key_list(board_viewport_bookmarks)') as Array<{ table: string; on_delete: string }>)
    .find((fk) => fk.table === 'boards')?.on_delete, 'CASCADE');
});

test('bookmark HTTP list/create/rename/delete preserves exact camera snapshot and all board structure', async () => {
  await withRoutes(async (db, request, boardId) => {
    const path = `/${boardId}/viewport-bookmarks`;
    await request('POST', `/${boardId}/layers`, { name: 'Existing layer' }, 201);
    await request('POST', `/${boardId}/visuals`, {
      visual_kind: 'shape', x: 140, y: -85, z_index: 7, data: { shape: 'rectangle' },
    }, 201);
    const before = boardState(db);
    assert.deepEqual(await request('GET', path), { bookmarks: [] });
    const { bookmark } = await request('POST', path, { name: '  第二章  ', ...SNAPSHOT }, 201);
    assert.deepEqual(bookmark, { id: bookmark.id, board_id: boardId, user_id: USER,
      name: '第二章', ...SNAPSHOT, created_at: bookmark.created_at });
    assert.ok(Number.isFinite(Date.parse(bookmark.created_at)));
    assert.deepEqual((await request('GET', path)).bookmarks, [bookmark]);
    const renamed = (await request('PATCH', `${path}/${bookmark.id}`, { name: '  时间线区 ' })).bookmark;
    assert.deepEqual(renamed, { ...bookmark, name: '时间线区' });
    assert.deepEqual(await request('DELETE', `${path}/${bookmark.id}`), { deleted: true });
    assert.deepEqual(await request('DELETE', `${path}/${bookmark.id}`), { deleted: false });
    assert.deepEqual(await request('GET', path), { bookmarks: [] });
    assert.deepEqual(boardState(db), before);
  });
});

test('bookmark list uses creation order for equal timestamps and rename never moves a row', async () => {
  await withRoutes(async (db, request, boardId) => {
    const insert = db.prepare(`INSERT INTO board_viewport_bookmarks (id, board_id, user_id, name, x, y, zoom, created_at)
      VALUES (?, ?, ?, ?, 1, 2, 1, '2026-09-11T00:00:00.000Z')`);
    insert.run('z-first', boardId, USER, 'First');
    insert.run('a-second', boardId, USER, 'Second');
    const path = `/${boardId}/viewport-bookmarks`;
    await request('PATCH', `${path}/z-first`, { name: 'Renamed first' });
    assert.deepEqual((await request('GET', path)).bookmarks.map((bookmark: { id: string }) => bookmark.id), ['z-first', 'a-second']);
  });
});

test('bookmark names trim to 1–32 and viewport input follows the existing finite positive zoom contract', async () => {
  await withRoutes(async (_db, request, boardId) => {
    const path = `/${boardId}/viewport-bookmarks`;
    for (const name of ['', '   ', '章'.repeat(33)]) {
      await request('POST', path, { name, ...SNAPSHOT }, 400);
    }
    const { bookmark } = await request('POST', path, { name: ` ${'章'.repeat(32)} `, ...SNAPSHOT }, 201);
    assert.equal(bookmark.name.length, 32);
    for (const name of ['', '  ', 'x'.repeat(33)]) {
      await request('PATCH', `${path}/${bookmark.id}`, { name }, 400);
    }
    for (const input of [{ ...SNAPSHOT, zoom: 0 }, { ...SNAPSHOT, zoom: -1 }, { ...SNAPSHOT, x: null }]) {
      await request('POST', path, { name: 'Snapshot', ...input }, 400);
    }
    await request('PATCH', `${path}/${bookmark.id}`, { name: 'Changed', x: 999 }, 400);
    assert.equal((await request('GET', path)).bookmarks[0].name, '章'.repeat(32));
    const shared = readFileSync(new URL('../../../shared/types/boardViewportBookmarks.ts', import.meta.url), 'utf8');
    assert.match(shared, new RegExp(`BOARD_VIEWPORT_BOOKMARK_LIMIT = ${BOARD_VIEWPORT_BOOKMARK_LIMIT};`));
    assert.match(shared, new RegExp(`BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT = ${BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT};`));
  });
});

test('bookmark 24 limit returns a readable reason, is per board, and a deleted slot can be reused', async () => {
  await withRoutes(async (db, request, boardId) => {
    const path = `/${boardId}/viewport-bookmarks`;
    const ids: string[] = [];
    for (let index = 0; index < BOARD_VIEWPORT_BOOKMARK_LIMIT; index += 1) {
      const { bookmark } = await request('POST', path, { name: `View ${index + 1}`, ...SNAPSHOT }, 201);
      ids.push(bookmark.id);
    }
    assert.deepEqual(await request('POST', path, { name: 'Overflow', ...SNAPSHOT }, 409), {
      error: 'board_viewport_bookmark_limit_reached', details: { limit: 24 },
    });
    await request('PATCH', `${path}/${ids[0]}`, { name: 'Rename at capacity' });
    assert.equal((await request('GET', path)).bookmarks.length, 24);
    const anotherBoard = makeBoard(db);
    await request('POST', `/${anotherBoard}/viewport-bookmarks`, { name: 'Other board', ...SNAPSHOT }, 201);
    await request('DELETE', `${path}/${ids[0]}`);
    const { bookmark: replacement } = await request('POST', path, { name: 'Replacement', ...SNAPSHOT }, 201);
    assert.deepEqual((await request('GET', path)).bookmarks.map((bookmark: { id: string }) => bookmark.id),
      [...ids.slice(1), replacement.id]);
  });
});

test('existing board delete cascades its bookmarks and retains the other board snapshot', async () => {
  await withRoutes(async (db, request, boardId) => {
    const otherBoardId = makeBoard(db);
    await request('POST', `/${boardId}/viewport-bookmarks`, { name: 'Gone with board', ...SNAPSHOT }, 201);
    const { bookmark: retained } = await request('POST', `/${otherBoardId}/viewport-bookmarks`, { name: 'Retained', ...SNAPSHOT }, 201);
    await request('DELETE', `/${boardId}`);
    assert.deepEqual(db.prepare('SELECT * FROM board_viewport_bookmarks').all(), [retained]);
    assert.deepEqual((await request('GET', `/${otherBoardId}/viewport-bookmarks`)).bookmarks, [retained]);
    await request('GET', `/${boardId}/viewport-bookmarks`, undefined, 404);
  });
});
