import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import type { SkinComponents, SkinSelection, SkinSuite, SkinTokens } from '../../../shared/types/skin.js';
import { closeDb, initDb } from '../db/init.js';
import migration from '../db/migrations/071_v14_skin_suites.js';
import materialMigration from '../db/migrations/072_v14_skin_suite_material.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createSkinSuiteRouter } from '../routes/skinSuites.js';
import coursesRoutes from '../routes/courses.js';
import notesRoutes from '../routes/notes.js';
import settingsRoutes from '../routes/settings.js';
import { createBoardRouter } from '../routes/boards.js';
import { createSkinSuite, deleteSkinSuite, getOwnedSkinSuite, listSkinSuites, updateSkinSuite } from '../services/skinSuites.js';
import { parseStoredSkin } from '../services/skin.js';
import { skinSelectionSchema } from '../validators/skin.js';

const userId = 'b1420000-0000-4000-8000-000000000001';
const colorId = 'b1420000-0000-4000-8000-000000000002';
const missingColorId = 'b1420000-0000-4000-8000-000000000003';
const tokens: SkinTokens = {
  desk: '#1D1A17', paper: '#F7F3EA', ink: '#2B2620', 'ink-muted': '#837A6C', accent: '#33604F',
  annotation: '#B8912E', hairline: '#E6DECE', danger: '#A04A38', wall: '#D8CFBC80',
  'board-desk': '#211D19', card: '#F7F3EA', edge: '#837A6C', chalk: '#F2EDE1',
};
const components: SkinComponents = {
  titleFont: 'serif', labelFont: 'system', menuDensity: 'comfortable', handleStyle: 'capsule', headerRule: 'visible',
};

function database(includeMaterial = true) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, settings TEXT);
    CREATE TABLE courses (id TEXT PRIMARY KEY, user_id TEXT, skin TEXT);
    CREATE TABLE notes (id TEXT PRIMARY KEY, user_id TEXT, metadata TEXT, trashed_at TEXT);
    CREATE TABLE boards (id TEXT PRIMARY KEY, user_id TEXT, skin TEXT);
    CREATE TABLE palette_colors (id TEXT PRIMARY KEY, user_id TEXT, value TEXT);
  `);
  db.prepare('INSERT INTO users (id, settings) VALUES (?, ?)').run(userId, '{"language":"zh"}');
  db.prepare('INSERT INTO palette_colors VALUES (?, ?, ?)').run(colorId, userId, '#aBcDeF80');
  migration.up(db);
  if (includeMaterial) materialMigration.up(db);
  return db;
}

async function serve(db: Database.Database, fullRoutes = false) {
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/skin-suites', createSkinSuiteRouter(() => db));
  if (fullRoutes) {
    app.use('/api/settings', settingsRoutes);
    app.use('/api/courses', coursesRoutes);
    app.use('/api/notes', notesRoutes);
    app.use('/api/boards', createBoardRouter(() => db));
  }
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    async request(method: string, path = 'skin-suites', body?: unknown, status = 200) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
        method,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

test('V14 migrations preserve existing 071 suites and add optional material lineage idempotently', () => {
  const db = database(false);
  try {
    assert.deepEqual((db.pragma('table_info(skin_suites)') as Array<{ name: string }>).map(({ name }) => name),
      ['id', 'user_id', 'name', 'tokens_json', 'components_json', 'created_at']);
    assert.deepEqual(db.prepare('SELECT * FROM skin_suites').all(), []);
    db.prepare('INSERT INTO skin_suites VALUES (?, ?, ?, ?, ?, ?)')
      .run(colorId, userId, 'My paper', JSON.stringify(tokens), JSON.stringify(components), '2026-09-13');
    const original = db.prepare('SELECT * FROM skin_suites').get();
    materialMigration.up(db);
    migration.up(db);
    materialMigration.up(db);
    assert.deepEqual(db.prepare('SELECT * FROM skin_suites').get(), { ...original as object, material_preset: null });
    assert.deepEqual(listSkinSuites(db, userId), [{ id: colorId, user_id: userId, name: 'My paper', tokens, components, created_at: '2026-09-13' }]);
    assert.equal((db.pragma('table_info(skin_suites)') as Array<{ name: string; notnull: number }>).find(({ name }) => name === 'material_preset')?.notnull, 0);
    const writeMaterial = db.prepare('UPDATE skin_suites SET material_preset = ? WHERE id = ?');
    for (const preset of ['default', 'quiet-ink', 'warm-paper', 'workbench']) {
      writeMaterial.run(preset, colorId);
      assert.equal(getOwnedSkinSuite(db, userId, colorId).materialPreset, preset);
    }
    assert.throws(() => writeMaterial.run('custom', colorId), /CHECK constraint/);
    const foreignKeys = db.pragma('foreign_key_list(skin_suites)') as Array<{ table: string; from: string; on_delete: string }>;
    assert.ok(foreignKeys.some((key) => key.table === 'users' && key.from === 'user_id' && key.on_delete === 'CASCADE'));
  } finally { db.close(); }
});

test('V14 suite routes create, list, rename and replace the complete appearance without changing identity', async (t) => {
  const db = database(); const f = await serve(db);
  t.after(async () => { await f.close(); db.close(); });
  const suite: SkinSuite = await f.request('POST', 'skin-suites', { name: '  Morning  ', tokens, components, materialPreset: 'warm-paper' }, 201);
  assert.equal(suite.name, 'Morning');
  assert.deepEqual(suite.tokens, tokens);
  assert.deepEqual(suite.components, components);
  assert.equal(suite.materialPreset, 'warm-paper');
  assert.deepEqual(await f.request('GET'), [suite]);
  const renamed = await f.request('PATCH', `skin-suites/${suite.id}`, { name: 'Evening' });
  assert.deepEqual(renamed, { ...suite, name: 'Evening' });
  const nextTokens = { ...tokens, paper: '#abcDEF80', chalk: '#192837' };
  const nextComponents = { ...components, headerRule: 'hidden' };
  const updated = await f.request('PATCH', `skin-suites/${suite.id}`, { tokens: nextTokens, components: nextComponents, materialPreset: 'quiet-ink' });
  assert.deepEqual(updated, { ...renamed, tokens: nextTokens, components: nextComponents, materialPreset: 'quiet-ink' });
  assert.deepEqual(await f.request('PATCH', `skin-suites/${suite.id}`, { tokens: nextTokens, components: nextComponents }), updated);
  assert.deepEqual(await f.request('DELETE', `skin-suites/${suite.id}`), { id: suite.id, tokens: nextTokens, components: nextComponents, materialPreset: 'quiet-ink', palette: { [colorId]: '#aBcDeF80' } });
  assert.deepEqual(await f.request('GET'), []);
});

test('V14 suite routes reject empty names and color-only or component-only snapshots', async (t) => {
  const db = database(); const f = await serve(db);
  t.after(async () => { await f.close(); db.close(); });
  for (const name of ['', ' ']) {
    await f.request('POST', 'skin-suites', { name, tokens, components }, 400);
  }
  for (const payload of [
    { name: 'Partial', tokens }, { name: 'Partial', components },
    { name: 'Partial', tokens: { paper: '#112233' }, components },
    { name: 'Partial', tokens, components: { titleFont: 'serif' } },
    { name: 'Reference', tokens: { ...tokens, paper: `palette:${colorId}` }, components },
  ]) await f.request('POST', 'skin-suites', payload, 400);
  const suite = await f.request('POST', 'skin-suites', { name: 'Short name', tokens, components }, 201);
  assert.equal(suite.name, 'Short name');
  for (const payload of [{}, { tokens }, { components }, { name: 'Half', tokens }]) {
    await f.request('PATCH', `skin-suites/${suite.id}`, payload, 400);
  }
  assert.deepEqual(await f.request('GET'), [suite], 'Rejected partial writes must preserve the complete snapshot');
});

test('V14 suite references preserve full selections through the shared server skin contract', () => {
  const selection = { preset: `suite:${userId}`, materialPreset: 'warm-paper', overrides: { paper: `palette:${colorId}`, ink: '#abcdef80' }, components: { headerRule: 'hidden' } };
  assert.deepEqual(skinSelectionSchema.parse(selection), selection);
  assert.deepEqual(parseStoredSkin(JSON.stringify(selection)), selection);
  assert.equal(skinSelectionSchema.safeParse({ preset: 'suite:unknown' }).success, false);
  assert.equal(skinSelectionSchema.safeParse({ preset: 'default' }).success, true);
  for (const materialPreset of ['default', 'quiet-ink', 'warm-paper', 'workbench']) {
    assert.equal(skinSelectionSchema.safeParse({ ...selection, materialPreset }).success, true);
  }
  for (const materialPreset of ['custom', 'suite:unknown', null, {}, 1]) {
    assert.equal(skinSelectionSchema.safeParse({ ...selection, materialPreset }).success, false);
  }
});

test('V14 suite routes accept only factory material IDs within complete appearance snapshots', async (t) => {
  const db = database(); const f = await serve(db);
  t.after(async () => { await f.close(); db.close(); });
  for (const materialPreset of ['default', 'quiet-ink', 'warm-paper', 'workbench']) {
    const suite = await f.request('POST', 'skin-suites', { name: 'Paper', tokens, components, materialPreset }, 201);
    assert.equal(suite.materialPreset, materialPreset);
  }
  const suite = await f.request('POST', 'skin-suites', { name: 'Plain', tokens, components }, 201);
  assert.equal(suite.materialPreset, undefined);
  for (const materialPreset of ['custom', 'suite:unknown', null, {}, 1]) {
    await f.request('POST', 'skin-suites', { name: 'Paper', tokens, components, materialPreset }, 400);
    await f.request('PATCH', `skin-suites/${suite.id}`, { tokens, components, materialPreset }, 400);
  }
  await f.request('PATCH', `skin-suites/${suite.id}`, { materialPreset: 'warm-paper' }, 400);
  await f.request('PATCH', `skin-suites/${suite.id}`, { name: 'Paper', materialPreset: 'warm-paper' }, 400);
  assert.deepEqual(getOwnedSkinSuite(db, userId, suite.id), suite);
});

function seedConsumers(db: Database.Database, suite: SkinSuite) {
  const skin: SkinSelection = {
    preset: `suite:${suite.id}`,
    overrides: { paper: `palette:${colorId}`, ink: '#ABCdef', annotation: `palette:${missingColorId}` },
    components: { headerRule: 'hidden' },
  };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify({ language: 'zh', skin }), userId);
  db.prepare('INSERT INTO courses VALUES (?, ?, ?)').run('course', userId, JSON.stringify(skin));
  db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?)').run('active', userId, JSON.stringify({ typography: { fontSize: 18 }, skin }), null);
  db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?)').run('trashed', userId, JSON.stringify({ layout: 'flow', skin }), '2026-09-13');
  db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?)').run('inherited', userId, JSON.stringify({ typography: { fontSize: 20 } }), null);
  db.prepare('INSERT INTO boards VALUES (?, ?, ?)').run('board', userId, JSON.stringify(skin));
  return skin;
}

function storedConsumers(db: Database.Database) {
  return [
    ...(db.prepare('SELECT settings AS json FROM users').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json).skin),
    ...(db.prepare('SELECT skin AS json FROM courses').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json)),
    ...(db.prepare("SELECT metadata AS json FROM notes WHERE id != 'inherited' ORDER BY id").all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json).skin),
    ...(db.prepare('SELECT skin AS json FROM boards').all() as Array<{ json: string }>).map(({ json }) => JSON.parse(json)),
  ];
}

test('V14 delete suite atomically freezes all mounts including trash, material, merged overrides, palette values and all components', () => {
  const db = database();
  try {
    const suite = createSkinSuite(db, userId, { name: 'Reading', tokens, components, materialPreset: 'quiet-ink' });
    seedConsumers(db, suite);
    const newTokens = { ...tokens, paper: '#010203', accent: '#a1B2c3D4' };
    const newComponents = { ...components, labelFont: 'mono' } as SkinComponents;
    updateSkinSuite(db, userId, suite.id, { tokens: newTokens, components: newComponents, materialPreset: 'warm-paper' });
    db.prepare('UPDATE palette_colors SET value = ? WHERE id = ?').run('#123AbC80', colorId);
    const expectedTokens = { ...newTokens, paper: '#123AbC80', ink: '#ABCdef' };
    const expectedComponents = { ...newComponents, headerRule: 'hidden' };
    const deletion = deleteSkinSuite(db, userId, suite.id);
    assert.deepEqual(deletion, { id: suite.id, tokens: newTokens, components: newComponents, materialPreset: 'warm-paper', palette: { [colorId]: '#123AbC80' } });
    for (const selection of storedConsumers(db)) {
      assert.equal(selection.preset, 'default');
      assert.equal(selection.materialPreset, 'warm-paper');
      assert.deepEqual(selection.overrides, expectedTokens);
      assert.deepEqual(selection.components, expectedComponents);
      assert.equal(JSON.stringify(selection).includes('palette:'), false);
    }
    db.prepare('UPDATE palette_colors SET value = ? WHERE id = ?').run('#998877', colorId);
    assert.equal(deletion.palette[colorId], '#123AbC80', 'The receipt must freeze the transaction-time palette for still-mounted readers');
    assert.ok(storedConsumers(db).every((selection) => selection.overrides.paper === deletion.palette[colorId]));
    assert.deepEqual(listSkinSuites(db, userId), []);
    assert.deepEqual(JSON.parse((db.prepare("SELECT metadata FROM notes WHERE id = 'inherited'").get() as { metadata: string }).metadata), { typography: { fontSize: 20 } });
    assert.deepEqual(JSON.parse((db.prepare("SELECT metadata FROM notes WHERE id = 'active'").get() as { metadata: string }).metadata).typography, { fontSize: 18 });
    assert.equal((db.prepare("SELECT trashed_at FROM notes WHERE id = 'trashed'").get() as { trashed_at: string }).trashed_at, '2026-09-13');
  } finally { db.close(); }
});

test('V14 update-to-match keeps every binding and its deviations; detachment rollback retains both the suite and all consumers', () => {
  const db = database();
  try {
    const suite = createSkinSuite(db, userId, { name: 'Reading', tokens, components, materialPreset: 'warm-paper' });
    const selection = seedConsumers(db, suite);
    const nextTokens = { ...tokens, accent: '#102030', paper: '#506070', ink: '#808080' };
    const nextComponents = { ...components, labelFont: 'mono', titleFont: 'sans' } as SkinComponents;
    const updated = updateSkinSuite(db, userId, suite.id, { tokens: nextTokens, components: nextComponents, materialPreset: 'workbench' });
    assert.deepEqual(storedConsumers(db), Array.from({ length: 5 }, () => selection));
    assert.equal(updated.tokens.accent, '#102030', 'Unmodified bound tokens follow the newly stored snapshot');
    assert.equal(selection.overrides?.ink, '#ABCdef', 'Manual deviations remain on the consumer');
    const before = storedConsumers(db);
    db.exec("CREATE TRIGGER fail_suite_detach BEFORE UPDATE OF skin ON boards BEGIN SELECT RAISE(ABORT, 'detach failure'); END");
    assert.throws(() => deleteSkinSuite(db, userId, suite.id), /detach failure/);
    assert.deepEqual(storedConsumers(db), before);
    assert.deepEqual(getOwnedSkinSuite(db, userId, suite.id), updated);
  } finally { db.close(); }
});

test('V14 legacy suites without lineage detach with their default material intact', () => {
  const db = database();
  try {
    const suite = createSkinSuite(db, userId, { name: 'Plain', tokens, components });
    seedConsumers(db, suite);
    const deletion = deleteSkinSuite(db, userId, suite.id);
    assert.equal(deletion.materialPreset, undefined);
    for (const selection of storedConsumers(db)) {
      assert.equal(selection.materialPreset, 'default');
      assert.equal(parseStoredSkin(selection)?.materialPreset, 'default');
    }
  } finally { db.close(); }
});

test('V14 suite selections round-trip through every existing human skin route and retain exact paper appearance on delete', async (t) => {
  const db = await initDb(':memory:');
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','Suite fixture','{}')")
    .run(userId, 'suite@test.invalid');
  const f = await serve(db, true);
  t.after(async () => { await f.close(); closeDb(); });
  const suite: SkinSuite = await f.request('POST', 'skin-suites', { name: 'Paper', tokens, components, materialPreset: 'warm-paper' }, 201);
  const skin = { preset: `suite:${suite.id}`, materialPreset: 'workbench', overrides: { ink: '#123aBc' }, components: { headerRule: 'hidden' } };
  const project = await f.request('POST', 'courses', { name: 'Suite project', skin }, 201);
  const note = await f.request('POST', 'notes', { course_id: project.id, title: 'Suite note', skin }, 201);
  const { board } = await f.request('POST', 'boards', { title: 'Suite board', project_id: project.id, purpose: { title: 'Suite fixture' } }, 201);
  assert.deepEqual((await f.request('PUT', 'settings', { settings: { skin } })).skin, skin);
  assert.deepEqual((await f.request('PUT', `courses/${project.id}`, { skin })).skin, skin);
  assert.deepEqual((await f.request('PUT', `notes/${note.id}`, { skin })).metadata.skin, skin);
  assert.deepEqual((await f.request('PATCH', `boards/${board.id}`, { skin })).board.skin, skin);
  async function readSkins() {
    return [
      (await f.request('GET', 'settings')).skin,
      (await f.request('GET', `courses/${project.id}/summary`)).course.skin,
      (await f.request('GET', `notes/${note.id}`)).metadata.skin,
      (await f.request('GET', `boards/${board.id}`)).board.skin,
    ];
  }
  assert.deepEqual(await readSkins(), Array.from({ length: 4 }, () => skin));
  const nextTokens = { ...tokens, accent: '#456aBC' };
  const nextComponents = { ...components, titleFont: 'sans' };
  await f.request('PATCH', `skin-suites/${suite.id}`, { tokens: nextTokens, components: nextComponents });
  assert.deepEqual(await readSkins(), Array.from({ length: 4 }, () => skin));
  await f.request('DELETE', `skin-suites/${suite.id}`);
  const detached = { preset: 'default', materialPreset: 'workbench', overrides: { ...nextTokens, ...skin.overrides }, components: { ...nextComponents, ...skin.components } };
  assert.deepEqual(await readSkins(), Array.from({ length: 4 }, () => detached));
});
