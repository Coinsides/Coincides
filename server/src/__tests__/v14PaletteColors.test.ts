import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import type { PaletteColor } from '../../../shared/types/palette.js';
import { closeDb, initDb } from '../db/init.js';
import migration from '../db/migrations/070_v14_palette_colors.js';
import { seedFactoryPaletteColors } from '../db/paletteSeed.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createPaletteColorRouter } from '../routes/paletteColors.js';
import coursesRoutes from '../routes/courses.js';
import notesRoutes from '../routes/notes.js';
import settingsRoutes from '../routes/settings.js';
import { createBoardRouter } from '../routes/boards.js';
import { createPaletteColor, deletePaletteColor, getOwnedPaletteColor, listPaletteColors, updatePaletteColor } from '../services/paletteColors.js';
import { parseStoredSkin } from '../services/skin.js';
import { skinSelectionSchema } from '../validators/skin.js';

const userId = 'b1400000-0000-4000-8000-000000000001';
const expectedFactory = [
  ['暖调/杏黄', '#E8B04B'], ['暖调/赭石', '#B8703F'], ['暖调/绯红', '#C25B4E'], ['暖调/玫瑰', '#C97B8E'], ['暖调/暖棕', '#8A6248'], ['暖调/奶油', '#F2E3C6'],
  ['冷调/墨蓝', '#4A6FA5'], ['冷调/青碧', '#4E8D7C'], ['冷调/黛紫', '#6E5E8E'], ['冷调/湖蓝', '#5B9BB5'], ['冷调/松绿', '#4F7350'], ['冷调/靛蓝', '#3D5273'],
  ['中性/炭黑', '#2B2B2E'], ['中性/石墨', '#55565C'], ['中性/暖灰', '#8C8578'], ['中性/冷灰', '#7E8794'], ['中性/米白', '#EDE8DC'], ['中性/纸白', '#F7F4EC'],
  ['点缀/琥珀', '#E5A33C'], ['点缀/朱砂', '#D14B3A'], ['点缀/苔绿', '#7C9A4E'], ['点缀/天青', '#6BB3C9'], ['点缀/藕荷', '#B48EAD'], ['点缀/金驼', '#C9A15F'],
];

function database() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, settings TEXT);
    CREATE TABLE courses (id TEXT PRIMARY KEY, skin TEXT);
    CREATE TABLE notes (id TEXT PRIMARY KEY, metadata TEXT, deleted_at TEXT);
    CREATE TABLE boards (id TEXT PRIMARY KEY, skin TEXT);
  `);
  db.prepare('INSERT INTO users (id, settings) VALUES (?, ?)').run(userId, '{"language":"zh"}');
  migration.up(db);
  return db;
}

async function fixture() {
  const db = database();
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/palette-colors', createPaletteColorRouter(() => db));
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    db,
    async request(method: string, path = '', body?: unknown, status = 200) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/palette-colors${path}`, {
        method,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      db.close();
    },
  };
}

test('V14 migration 070 seeds exactly 24 named factory colors per existing/new user and is idempotent', () => {
  const db = database();
  try {
    const first = listPaletteColors(db, userId);
    assert.equal(first.length, 24);
    assert.deepEqual(first.map(({ name, value }) => [name, value]), expectedFactory);
    assert.deepEqual(first.map(({ sort }) => sort), expectedFactory.map((_, index) => (index + 1) * 1000));
    assert.ok(first.every(({ origin, id, user_id }) => origin === 'factory' && user_id === userId && /^[0-9a-f-]{36}$/.test(id)));
    const own = createPaletteColor(db, userId, { name: '自选/雨', value: '#12Ab34ef' });
    assert.equal(own.sort, 25000);
    migration.up(db);
    assert.deepEqual(listPaletteColors(db, userId).slice(0, 24), first);
    assert.deepEqual(getOwnedPaletteColor(db, userId, own.id), own);
    const newUser = 'b1400000-0000-4000-8000-000000000002';
    db.prepare('INSERT INTO users (id, settings) VALUES (?, ?)').run(newUser, '{}');
    seedFactoryPaletteColors(db, newUser);
    seedFactoryPaletteColors(db, newUser);
    const second = listPaletteColors(db, newUser);
    assert.deepEqual(second.map(({ name, value }) => [name, value]), expectedFactory);
    assert.equal(new Set([...first, ...second].map(({ id }) => id)).size, 48);
    const columns = db.pragma('table_info(palette_colors)') as Array<{ name: string }>;
    assert.deepEqual(columns.map(({ name }) => name), ['id', 'user_id', 'name', 'value', 'sort', 'origin', 'created_at']);
  } finally { db.close(); }
});

test('V14 human palette routes create/read/edit/reorder/delete user colors and return readable 409 for every factory edit', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const factory: PaletteColor[] = await f.request('GET');
  const created: PaletteColor = await f.request('POST', '', { name: '自选/清晨', value: '#aBcDEF80' }, 201);
  assert.equal(created.origin, 'user');
  assert.equal(created.name, '自选/清晨');
  assert.equal(created.value, '#aBcDEF80');
  const changed = await f.request('PATCH', `/${created.id}`, { name: '冷调/清晨', value: '#123456', sort: 1500 });
  assert.deepEqual(changed, { ...created, name: '冷调/清晨', value: '#123456', sort: 1500 });
  assert.equal((await f.request('GET'))[1].id, created.id);
  for (const body of [{ name: 'Changed' }, { value: '#111111' }, { sort: 5 }, {}]) {
    const error = await f.request('PATCH', `/${factory[0].id}`, body, 409);
    assert.equal(error.details.code, 'PALETTE_FACTORY_IMMUTABLE');
    assert.match(error.error, /Factory palette colors/);
  }
  assert.equal((await f.request('DELETE', `/${factory[0].id}`, undefined, 409)).details.code, 'PALETTE_FACTORY_IMMUTABLE');
  assert.deepEqual(await f.request('DELETE', `/${created.id}`), { id: created.id, value: '#123456' });
  assert.deepEqual(await f.request('GET'), factory);
});

test('V14 palette names and hex values validate at the human route, including alpha and the 64-character boundary', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  for (const body of [{ name: '', value: '#123456' }, { name: '  ', value: '#123456' }, { name: 'x'.repeat(65), value: '#123456' }, { name: 'Color', value: '#123' }]) {
    await f.request('POST', '', body, 400);
  }
  const row = await f.request('POST', '', { name: 'x'.repeat(64), value: '#12345678' }, 201);
  assert.equal(row.name.length, 64);
  assert.equal(row.value, '#12345678');
});

test('V14 all existing skin token keys accept and preserve palette references through the stored skin parser', () => {
  const reference = `palette:${userId}`;
  const tokenNames = ['desk', 'paper', 'ink', 'ink-muted', 'accent', 'annotation', 'hairline', 'danger', 'wall', 'board-desk', 'card', 'edge', 'chalk'];
  const skin = { preset: 'warm-paper', overrides: Object.fromEntries(tokenNames.map((token) => [token, reference])), components: { headerRule: 'hidden' } };
  assert.deepEqual(skinSelectionSchema.parse(skin), skin);
  assert.deepEqual(parseStoredSkin(JSON.stringify(skin)), skin);
});

function seedConsumers(db: Database.Database, color: PaletteColor) {
  const skin = { preset: 'warm-paper', overrides: { paper: `palette:${color.id}`, accent: `palette:${color.id}`, ink: '#AAbbCC' }, components: { titleFont: 'serif' } };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify({ language: 'zh', skin }), userId);
  db.prepare('INSERT INTO courses VALUES (?, ?)').run('course', JSON.stringify(skin));
  db.prepare('INSERT INTO notes VALUES (?, ?, ?)').run('active', JSON.stringify({ typography: { fontSize: 18 }, skin }), null);
  db.prepare('INSERT INTO notes VALUES (?, ?, ?)').run('trashed', JSON.stringify({ layout: 'flow', skin }), '2026-09-13');
  db.prepare('INSERT INTO boards VALUES (?, ?)').run('board', JSON.stringify({ ...skin, overrides: { 'board-desk': `palette:${color.id}`, chalk: '#112233' } }));
}

function storedConsumers(db: Database.Database) {
  return [
    ...(db.prepare('SELECT settings AS json FROM users').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json).skin),
    ...(db.prepare('SELECT skin AS json FROM courses').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json)),
    ...(db.prepare('SELECT metadata AS json FROM notes ORDER BY id').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json).skin),
    ...(db.prepare('SELECT skin AS json FROM boards').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json)),
  ];
}

test('V14 deletion atomically detaches every persistent skin mount including trash, retaining the exact latest resolved hex', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const color: PaletteColor = await f.request('POST', '', { name: '自选/薄雾', value: '#abcDEF' }, 201);
  seedConsumers(f.db, color);
  await f.request('PATCH', `/${color.id}`, { value: '#aBcDeF80' });
  const current = getOwnedPaletteColor(f.db, userId, color.id);
  const before = storedConsumers(f.db).map((skin) => ({ ...skin, overrides: Object.fromEntries(
    Object.entries(skin.overrides).map(([token, value]) => [token, value === `palette:${color.id}` ? current.value : value]),
  ) }));
  const result = await f.request('DELETE', `/${color.id}`);
  assert.deepEqual(result, { id: color.id, value: '#aBcDeF80' });
  const after = storedConsumers(f.db);
  assert.deepEqual(after, before, 'Consumer values must remain byte-for-byte unchanged after detachment');
  assert.equal(JSON.stringify(after).includes(`palette:${color.id}`), false);
  assert.equal(f.db.prepare('SELECT id FROM palette_colors WHERE id = ?').get(color.id), undefined);
  assert.deepEqual(JSON.parse((f.db.prepare("SELECT metadata FROM notes WHERE id = 'active'").get() as { metadata: string }).metadata).typography, { fontSize: 18 });
  assert.equal((f.db.prepare("SELECT deleted_at FROM notes WHERE id = 'trashed'").get() as { deleted_at: string }).deleted_at, '2026-09-13');
});

test('V14 detach failure rolls back prior mount rewrites and retains the color in the same transaction', () => {
  const db = database();
  try {
    const color = createPaletteColor(db, userId, { name: '自选/回滚', value: '#12Ab34ef' });
    seedConsumers(db, color);
    const before = storedConsumers(db);
    db.exec("CREATE TRIGGER fail_board_detach BEFORE UPDATE OF skin ON boards BEGIN SELECT RAISE(ABORT, 'synthetic detach failure'); END");
    assert.throws(() => deletePaletteColor(db, userId, color.id), /synthetic detach failure/);
    assert.deepEqual(storedConsumers(db), before);
    assert.deepEqual(getOwnedPaletteColor(db, userId, color.id), color);
    db.exec('DROP TRIGGER fail_board_detach');
    updatePaletteColor(db, userId, color.id, { value: '#123456' });
    assert.deepEqual(deletePaletteColor(db, userId, color.id), { id: color.id, value: '#123456' });
  } finally { db.close(); }
});

test('V14 palette references round-trip through every existing human skin route and detach to the current value', async (t) => {
  const db = await initDb(':memory:');
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','Palette route fixture','{}')")
    .run(userId, 'palette-route@example.invalid');
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/settings', settingsRoutes);
  app.use('/api/courses', coursesRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/boards', createBoardRouter(() => db));
  app.use('/api/palette-colors', createPaletteColorRouter(() => db));
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    closeDb();
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  async function request(method: string, path: string, body?: unknown, status = 200) {
    const response = await fetch(`http://127.0.0.1:${port}/api/${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const result = await response.json() as any;
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  }
  const color = await request('POST', 'palette-colors', { name: '自选/纸色', value: '#12ab34' }, 201);
  const skin = { preset: 'warm-paper', overrides: { paper: `palette:${color.id}`, 'board-desk': `palette:${color.id}`, ink: '#112233' } };
  const project = await request('POST', 'courses', { name: 'Palette project', skin }, 201);
  const note = await request('POST', 'notes', { course_id: project.id, title: 'Palette note', skin }, 201);
  const { board } = await request('POST', 'boards', { title: 'Palette board', project_id: project.id, purpose: { title: 'Palette route fixture' } }, 201);
  assert.deepEqual((await request('PUT', 'settings', { settings: { skin } })).skin, skin);
  assert.deepEqual((await request('PUT', `courses/${project.id}`, { skin })).skin, skin);
  assert.deepEqual((await request('PUT', `notes/${note.id}`, { skin })).metadata.skin, skin);
  assert.deepEqual((await request('PATCH', `boards/${board.id}`, { skin })).board.skin, skin);
  async function readSkins() {
    return [
      (await request('GET', 'settings')).skin,
      (await request('GET', `courses/${project.id}/summary`)).course.skin,
      (await request('GET', `notes/${note.id}`)).metadata.skin,
      (await request('GET', `boards/${board.id}`)).board.skin,
    ];
  }
  assert.deepEqual(await readSkins(), Array.from({ length: 4 }, () => skin));
  await request('PATCH', `palette-colors/${color.id}`, { value: '#aBcD1234' });
  assert.deepEqual(await readSkins(), Array.from({ length: 4 }, () => skin));
  await request('DELETE', `palette-colors/${color.id}`);
  const detached = { ...skin, overrides: { ...skin.overrides, paper: '#aBcD1234', 'board-desk': '#aBcD1234' } };
  assert.deepEqual(await readSkins(), Array.from({ length: 4 }, () => detached));
});
