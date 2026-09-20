import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import test from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import { createSkinSuiteRouter } from '../routes/skinSuites.js';
import suiteMigration from '../db/migrations/071_v14_skin_suites.js';
import materialMigration from '../db/migrations/072_v14_skin_suite_material.js';
import silkMigration from '../db/migrations/080_v14_silk_skin_material.js';

const key = 'paragraph_furniture_v1';
const text = '以天下之财，供天下之费。';
const content = { text_flow: { textflow_version: 1, units: [{
  id: 'furniture-unit', text, writing_role: 'paragraph', indent_level: 0,
  order_index: 0, metadata: {}, status: 'active',
}], inline_structures: [], metadata: {} } };
const retained = { emphasis: 'quiet', retained: { appearance: 'existing' } };

test('B3 silk material migration preserves all four incumbent lineages, null rows, columns, index and foreign key', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec("CREATE TABLE users (id TEXT PRIMARY KEY); INSERT INTO users VALUES ('suite-owner')");
    suiteMigration.up(db);
    materialMigration.up(db);
    const insert = db.prepare(`INSERT INTO skin_suites (rowid, id, user_id, name, tokens_json, components_json, created_at, material_preset)
      VALUES (?, ?, 'suite-owner', ?, ?, ?, '2026-09-20', ?)`);
    for (const [index, preset] of [null, 'default', 'quiet-ink', 'warm-paper', 'workbench'].entries()) {
      insert.run(index * 3 + 1, `suite-${index}`, `Appearance ${index}`, JSON.stringify({ paper: `paper-${index}` }), JSON.stringify({ headerRule: 'visible' }), preset);
    }
    const rows = db.prepare('SELECT rowid, * FROM skin_suites ORDER BY rowid').all();
    const columns = db.pragma('table_info(skin_suites)');
    const foreignKeys = db.pragma('foreign_key_list(skin_suites)');
    const indexes = db.prepare("SELECT name, sql FROM sqlite_schema WHERE type = 'index' AND tbl_name = 'skin_suites' ORDER BY name").all();
    const beforeSchema = (db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'skin_suites'").get() as { sql: string }).sql;
    silkMigration.up(db);
    silkMigration.up(db);
    assert.deepEqual(db.prepare('SELECT rowid, * FROM skin_suites ORDER BY rowid').all(), rows);
    assert.deepEqual(db.pragma('table_info(skin_suites)'), columns);
    assert.deepEqual(db.pragma('foreign_key_list(skin_suites)'), foreignKeys);
    assert.deepEqual(db.prepare("SELECT name, sql FROM sqlite_schema WHERE type = 'index' AND tbl_name = 'skin_suites' ORDER BY name").all(), indexes);
    const afterSchema = (db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'skin_suites'").get() as { sql: string }).sql;
    assert.equal(afterSchema.replace('"skin_suites"', 'skin_suites').replace(", 'silk'", ''), beforeSchema);
    insert.run(20, 'silk-suite', '绢本', '{}', '{}', 'silk');
    assert.equal((db.prepare("SELECT material_preset FROM skin_suites WHERE id = 'silk-suite'").get() as { material_preset: string }).material_preset, 'silk');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").all(), [{ name: 'skin_suites' }, { name: 'users' }]);
  } finally { db.close(); }
});

async function fixture() {
  const temporaryRoot = resolve(tmpdir());
  const directory = mkdtempSync(join(temporaryRoot, 'coincides-b3-furniture-'));
  const dbPath = join(directory, 'furniture.sqlite');
  let db = await initDb(dbPath);
  const userId = 'furniture-user';
  const courseId = randomUUID();
  const noteId = randomUUID();
  db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(userId, 'b3@local.invalid', 'synthetic', 'Furniture test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, '宋史');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(noteId, userId, courseId, '财用摘录');
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/notes', noteRoutes);
  app.use('/api/skin-suites', createSkinSuiteRouter(() => db));
  app.use(errorHandler);
  const server = await new Promise<Server>((resolveServer) => {
    const listener = app.listen(0, '127.0.0.1', () => resolveServer(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const requestApi = async (method: string, path: string, body?: unknown, expected = 200) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
      method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const result = await response.json() as any;
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
  };
  return {
    noteId,
    get db() { return db; },
    async reopen() { closeDb(); db = await initDb(dbPath); },
    request: (method: string, path: string, body?: unknown, expected = 200) => requestApi(method, `/notes/${noteId}${path}`, body, expected),
    requestApi,
    async close() {
      await new Promise<void>((resolveServer, reject) => server.close((error) => error ? reject(error) : resolveServer()));
      closeDb();
      assert.ok(resolve(directory).startsWith(`${temporaryRoot}${sep}coincides-b3-furniture-`));
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test('B3 header rule switches persist in note skin and a complete silk suite across database reopen', async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const rule = { headerRule: 'hidden', headerRuleLength: 'short', headerRuleStyle: 'dashed' };
  const skin = { preset: 'silk', components: rule };
  const note = await f.request('PUT', '', { skin });
  assert.deepEqual(note.metadata.skin, skin);
  await f.reopen();
  assert.deepEqual((await f.request('GET', '')).metadata.skin, skin);

  const tokens = {
    desk: '#17130e', paper: '#f2ead7', ink: '#2d2418', 'ink-muted': '#6a5c46', accent: '#5f8f81',
    annotation: '#9a7016', hairline: '#d2c4a2', danger: '#a63b2a', wall: '#d2c4a2',
    'board-desk': '#17130e', card: '#f2ead7', edge: '#5f8f81', chalk: '#f2ead7',
  };
  const components = { titleFont: 'serif', labelFont: 'system', menuDensity: 'comfortable', handleStyle: 'capsule', ...rule };
  const created = await f.requestApi('POST', '/skin-suites', { name: '绢本短虚线', tokens, components, materialPreset: 'silk' }, 201);
  assert.deepEqual(created.components, components);
  assert.equal(created.materialPreset, 'silk');
  await f.reopen();
  assert.deepEqual(await f.requestApi('GET', '/skin-suites'), [created]);
  const updatedComponents = { ...components, headerRule: 'visible', headerRuleLength: 'full', headerRuleStyle: 'dotted' };
  const updated = await f.requestApi('PATCH', `/skin-suites/${created.id}`, { tokens, components: updatedComponents, materialPreset: 'silk' });
  assert.deepEqual(updated, { ...created, components: updatedComponents });
  await f.reopen();
  assert.deepEqual(await f.requestApi('GET', '/skin-suites'), [updated]);
  assert.deepEqual((await f.request('GET', '')).metadata.skin, skin);
});

for (const specimen of [
  { name: 'quote', initial: { variant: 'quote', source: '《宋史·食货志》' }, edited: { variant: 'quote', source: '宋史读书札记' } },
  { name: 'callout', initial: { variant: 'callout', label: '注' }, edited: { variant: 'callout', label: '冷知识' } },
]) {
  test(`B3 ${specimen.name} appearance creates, updates and clears through existing placement routes across database reopen`, async (t) => {
    const f = await fixture();
    t.after(() => f.close());
    const originalNote = await f.request('GET', '');
    const created = await f.request('POST', '/blocks', {
      block_type: 'paragraph', content_json: content, plain_text: text,
      display_overrides_json: { ...retained, [key]: specimen.initial },
    }, 201);
    assert.equal(created.block_type, 'paragraph');
    assert.deepEqual(created.content_json, content);
    const blockTruth = f.db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(created.id);
    const placementIdentity = f.db.prepare(`SELECT id, note_id, block_id, parent_placement_id, order_index, display_mode, created_at
      FROM note_block_placements WHERE id = ?`).get(created.placement_id);

    const assertReopened = async (overrides: Record<string, unknown>) => {
      await f.reopen();
      const note = await f.request('GET', '');
      assert.equal(note.id, originalNote.id);
      assert.equal(note.title, originalNote.title);
      assert.deepEqual(note.metadata, originalNote.metadata);
      const blocks = await f.request('GET', '/blocks');
      assert.equal(blocks.length, 1);
      const block = blocks[0];
      assert.equal(block.id, created.id);
      assert.equal(block.placement_id, created.placement_id);
      assert.equal(block.block_type, 'paragraph');
      assert.deepEqual(block.display_overrides_json, overrides);
      assert.deepEqual(block.content_json, content);
      assert.equal(block.plain_text, text);
      assert.deepEqual(f.db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(created.id), blockTruth);
      assert.deepEqual(f.db.prepare(`SELECT id, note_id, block_id, parent_placement_id, order_index, display_mode, created_at
        FROM note_block_placements WHERE id = ?`).get(created.placement_id), placementIdentity);
      return block;
    };

    await assertReopened({ ...retained, [key]: specimen.initial });
    const updated = await f.request('PUT', `/block-placements/${created.placement_id}`, {
      display_overrides_json: { ...retained, [key]: specimen.edited },
    });
    assert.equal(updated.id, created.placement_id);
    assert.equal(updated.block_id, created.id);
    const read = await assertReopened({ ...retained, [key]: specimen.edited });
    // The existing placement endpoint replaces its complete display object.
    // Removing this presentation key must carry the unrelated overrides forward.
    const cleared = { ...read.display_overrides_json };
    delete cleared[key];
    await f.request('PUT', `/block-placements/${created.placement_id}`, { display_overrides_json: cleared });
    const reopened = await assertReopened(retained);
    assert.equal(Object.prototype.hasOwnProperty.call(reopened.display_overrides_json, key), false);
  });
}
