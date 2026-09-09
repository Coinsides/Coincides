import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { Server } from 'node:http';
import Database from 'better-sqlite3';
import express from 'express';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import { createItemRouter } from '../routes/items.js';
import { createNoteBlockSchema } from '../validators/index.js';
import { assertItemRefBlockContent } from '../services/itemRefBlocks.js';
import { createClientNoteBlock, discardClientNoteBlockCreate } from '../services/noteBlockLifecycle.js';
import { listItemSummaries } from '../services/itemSummaries.js';
import canvasObjectsMigration from '../db/migrations/035_v2_canvas_objects.js';
import annotationTruthsMigration from '../db/migrations/036_v2_annotation_truths.js';

function fixture() {
  // Explicit memory-only database; no app startup, environment files or migration executor.
  const db = new Database(':memory:');
  db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  canvasObjectsMigration.up(db);
  annotationTruthsMigration.up(db);
  const userId = randomUUID();
  const courseId = randomUUID();
  const noteId = randomUUID();
  const itemId = randomUUID();
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
    .run(userId, `${userId}@example.com`, 'unused-test-placeholder', 'Item Ref Test');
  db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)')
    .run(courseId, userId, 'Project');
  db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
    .run(noteId, userId, courseId, 'Draft');
  db.prepare('INSERT INTO items (id, user_id, plain_text, body_json) VALUES (?, ?, ?, ?)')
    .run(itemId, userId, 'Current item body', '{"body":"Current item body"}');
  return { db, userId, courseId, noteId, itemId };
}

test('item_ref create accepts only an Item identity and no cached body', () => {
  const itemId = randomUUID();
  const payload = { block_type: 'item_ref', content_json: { item_id: itemId } };
  assert.deepEqual(createNoteBlockSchema.parse(payload).content_json, { item_id: itemId });
  for (const content_json of [{}, { item_id: itemId, body: 'copy' }, { item_id: itemId, summary: 'copy' }]) {
    assert.equal(createNoteBlockSchema.safeParse({ ...payload, content_json }).success, false);
  }
  assert.equal(createNoteBlockSchema.safeParse({ ...payload, plain_text: 'copy' }).success, false);
  assert.equal(createNoteBlockSchema.safeParse({ block_type: 'paragraph', content_json: { body: 'ordinary text' } }).success, true);
});

test('item_ref persists identity, reuses the existing client receipt and reads the current Item summary', () => {
  const { db, userId, courseId, noteId, itemId } = fixture();
  try {
    const payload = {
      client_create_key: 'item-ref-one', block_type: 'item_ref', content_json: { item_id: itemId },
    };
    const created = createClientNoteBlock(db, userId, noteId, courseId, payload);
    assert.equal(created.status, 'applied');
    if (created.status !== 'applied') return;
    assert.equal(created.created, true);
    assert.deepEqual(JSON.parse(created.block.content_json as string), { item_id: itemId });
    assert.equal(created.block.plain_text, null);
    assert.deepEqual(JSON.parse(created.block.metadata as string), {});
    const repeated = createClientNoteBlock(db, userId, noteId, courseId, payload);
    assert.equal(repeated.status, 'applied');
    if (repeated.status !== 'applied') return;
    assert.equal(repeated.created, false);
    assert.equal(repeated.block.id, created.block.id);

    assert.equal(listItemSummaries(db, userId, [itemId])[0].summary, 'Current item body');
    db.prepare('UPDATE items SET plain_text = ?, body_json = ? WHERE id = ?')
      .run('Revised item body', '{"body":"Revised item body"}', itemId);
    assert.equal(listItemSummaries(db, userId, [itemId])[0].summary, 'Revised item body');
    const reloaded = db.prepare('SELECT content_json, plain_text FROM note_blocks WHERE id = ?')
      .get(created.block.id) as { content_json: string; plain_text: string | null };
    assert.deepEqual(JSON.parse(reloaded.content_json), { item_id: itemId });
    assert.equal(reloaded.plain_text, null);
    assert.deepEqual(db.prepare('SELECT COUNT(*) AS count FROM template_definitions').get(), { count: 0 });
  } finally {
    db.close();
  }
});

test('item_ref uses ordinary placement and deletion without changing its Item', () => {
  const { db, userId, courseId, noteId, itemId } = fixture();
  try {
    const before = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    const created = createClientNoteBlock(db, userId, noteId, courseId, {
      client_create_key: 'item-ref-discard', block_type: 'item_ref', content_json: { item_id: itemId },
    });
    assert.equal(created.status, 'applied');
    if (created.status !== 'applied') return;
    db.prepare('UPDATE note_block_placements SET order_index = 3 WHERE id = ?').run(created.block.placement_id);
    assert.deepEqual(db.prepare('SELECT order_index FROM note_block_placements WHERE id = ?')
      .get(created.block.placement_id), { order_index: 3 });
    // Return to the initial placement before exercising the existing create-undo door.
    db.prepare('UPDATE note_block_placements SET order_index = 0 WHERE id = ?').run(created.block.placement_id);
    const removed = discardClientNoteBlockCreate(db, userId, noteId, courseId, 'item-ref-discard');
    assert.equal(removed.discarded, true);
    assert.equal(db.prepare('SELECT id FROM note_blocks WHERE id = ?').get(created.block.id), undefined);
    assert.deepEqual(db.prepare('SELECT * FROM items WHERE id = ?').get(itemId), before);
  } finally {
    db.close();
  }
});

test('item_ref content check also enforces the pointer-only contract on updates', () => {
  const { db, userId, itemId } = fixture();
  try {
    const block = { block_type: 'item_ref', content_json: { item_id: itemId }, plain_text: null };
    assert.doesNotThrow(() => assertItemRefBlockContent(db, userId, block));
    assert.throws(() => assertItemRefBlockContent(db, userId, { ...block, content_json: { item_id: itemId, body: 'copy' } }));
    assert.throws(() => assertItemRefBlockContent(db, userId, { ...block, plain_text: 'copy' }));
    assert.throws(() => assertItemRefBlockContent(db, userId, { ...block, content_json: { item_id: randomUUID() } }), /Referenced Item not found/);
  } finally {
    db.close();
  }
});

test('item_ref direct HTTP create reopens and deletes through ordinary note routes without changing the Item', async () => {
  // The legacy notes router uses getDb, so initialize that singleton with an
  // explicit in-memory path. No app bootstrap, environment loader or real user is involved.
  const db = await initDb(':memory:');
  let server: Server | undefined;
  try {
    const userId = randomUUID();
    const courseId = randomUUID();
    const itemId = randomUUID();
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
      .run(userId, `${userId}@example.invalid`, 'unused-test-placeholder', 'HTTP Item Ref Test');
    db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)').run(courseId, userId, 'HTTP Project');
    db.prepare('INSERT INTO items (id, user_id, plain_text, body_json) VALUES (?, ?, ?, ?)')
      .run(itemId, userId, 'HTTP item body', '{"body":"HTTP item body"}');
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
    app.use('/api/notes', noteRoutes);
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use('/api/items', createItemRouter(() => db));
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    async function request(method: string, path: string, body?: unknown, status = 200) {
      const response = await fetch(`http://127.0.0.1:${(address as { port: number }).port}${path}`, {
        method,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    }
    const note = await request('POST', '/api/notes', { course_id: courseId, title: 'HTTP draft' }, 201);
    assert.equal(note.course_id, courseId);
    const created = await request('POST', `/api/notes/${note.id}/blocks`, {
      block_type: 'item_ref', content_json: { item_id: itemId }, plain_text: '', metadata: {},
    }, 201);
    assert.deepEqual(created.content_json, { item_id: itemId });
    assert.equal(created.plain_text, null);
    assert.equal(created.client_create_receipt, undefined);
    assert.deepEqual(created.metadata, {});
    const reopened = await request('GET', `/api/notes/${note.id}/blocks`);
    assert.equal(reopened.length, 1);
    assert.equal(reopened[0].id, created.id);
    assert.deepEqual(reopened[0].content_json, { item_id: itemId });
    assert.equal((await request('POST', '/api/items/summaries', { item_ids: [itemId] }))[0].summary, 'HTTP item body');
    const updated = await request('PUT', `/api/items/${itemId}`, { plain_text: 'Revised through Item API' });
    assert.equal(updated.plain_text, 'Revised through Item API');
    assert.equal((await request('POST', '/api/items/summaries', { item_ids: [itemId] }))[0].summary, 'Revised through Item API');
    const afterEdit = await request('GET', `/api/notes/${note.id}/blocks`);
    assert.deepEqual(afterEdit[0].content_json, { item_id: itemId });
    assert.equal(afterEdit[0].plain_text, null);
    const itemBeforeDelete = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    await request('PUT', `/api/note-blocks/${created.id}`, { content_json: { item_id: itemId, body: 'copy' } }, 400);
    await request('DELETE', `/api/note-blocks/${created.id}`);
    assert.deepEqual(await request('GET', `/api/notes/${note.id}/blocks`), []);
    assert.deepEqual(db.prepare('SELECT * FROM items WHERE id = ?').get(itemId), itemBeforeDelete);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    closeDb();
  }
});
