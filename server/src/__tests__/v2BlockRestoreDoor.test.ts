import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';
import type Database from 'better-sqlite3';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import noteRoutes from '../routes/notes.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const NOTE_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVE_BLOCK_ID = '44444444-4444-4444-8444-444444444444';
const TRASHED_BLOCK_ID = '55555555-5555-4555-8555-555555555555';
const ACTIVE_PLACEMENT_ID = '66666666-6666-4666-8666-666666666666';
const TRASHED_PLACEMENT_ID = '77777777-7777-4777-8777-777777777777';

interface Fixture {
  baseUrl: string;
  db: Database.Database;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

async function withBlockRestoreHttp(
  run: (fixture: Fixture) => void | Promise<void>,
): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-block-restore-door-'));
  let server: Server | null = null;
  try {
    const db = await initDb(':memory:');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, 'hash', ?, ?)
    `).run(USER_ID, 'block-restore@example.com', 'Block Restore User', '2026-08-28 08:00:00');
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      COURSE_ID,
      USER_ID,
      'Block Restore Course',
      '2026-08-28 08:00:00',
      '2026-08-28 08:00:00',
    );
    db.prepare(`
      INSERT INTO notes (
        id, user_id, course_id, title, description, status, source_kind,
        page_format, metadata, operation_batch_id, created_at, updated_at,
        trashed_at, note_class
      ) VALUES (?, ?, ?, ?, NULL, 'active', 'manual', 'flow', '{}', NULL, ?, ?, NULL, 'user')
    `).run(
      NOTE_ID,
      USER_ID,
      COURSE_ID,
      'Block Restore Note',
      '2026-08-28 08:00:00',
      '2026-08-28 08:00:00',
    );

    const insertBlock = db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, title, content_json, plain_text,
        status, source_kind, metadata, operation_batch_id, created_at,
        updated_at, trashed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, NULL, ?, ?, ?)
    `);
    insertBlock.run(
      ACTIVE_BLOCK_ID,
      USER_ID,
      COURSE_ID,
      'paragraph',
      'Still here',
      '{"body":"active sentinel","nested":{"n":1}}',
      'active sentinel',
      'active',
      '{"marker":"active","tags":["kept"]}',
      '2026-08-28 08:01:00',
      '2026-08-28 08:02:00',
      null,
    );
    insertBlock.run(
      TRASHED_BLOCK_ID,
      USER_ID,
      COURSE_ID,
      'quote',
      'Bring me back',
      '{"body":"trashed sentinel","nested":{"n":2}}',
      'trashed sentinel',
      'trashed',
      '{"marker":"trashed","tags":["recover"]}',
      '2026-08-28 08:03:00',
      '2026-08-28 08:04:00',
      '2026-08-28 08:05:00',
    );

    const insertPlacement = db.prepare(`
      INSERT INTO note_block_placements (
        id, note_id, block_id, parent_placement_id, order_index, display_mode,
        display_overrides_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPlacement.run(
      ACTIVE_PLACEMENT_ID,
      NOTE_ID,
      ACTIVE_BLOCK_ID,
      null,
      3,
      'default',
      '{"width":640,"locked":false}',
      '2026-08-28 08:01:00',
      '2026-08-28 08:02:00',
    );
    insertPlacement.run(
      TRASHED_PLACEMENT_ID,
      NOTE_ID,
      TRASHED_BLOCK_ID,
      ACTIVE_PLACEMENT_ID,
      9,
      'inline',
      '{"width":320,"accent":"muted"}',
      '2026-08-28 08:03:00',
      '2026-08-28 08:04:00',
    );

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as AuthRequest).userId = USER_ID;
      next();
    });
    app.use('/api/notes', noteRoutes);
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use(errorHandler);
    server = app.listen();
    await new Promise<void>((resolveListen) => server!.once('listening', resolveListen));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP fixture did not bind a TCP port');

    await run({
      baseUrl: `http://127.0.0.1:${address.port}`,
      db,
    });
  } finally {
    if (server) await closeServer(server);
    closeDb();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

// Literal captured from the default REST response at pre-TD-28
// HEAD 6f6870778a502cdb0dd4f1d78a500c88de9c85bc. It must not be derived from current code.
const PRE_TD28_DEFAULT_JSON = '[{"placement_id":"66666666-6666-4666-8666-666666666666","note_id":"33333333-3333-4333-8333-333333333333","block_id":"44444444-4444-4444-8444-444444444444","parent_placement_id":null,"order_index":3,"display_mode":"default","display_overrides_json":{"width":640,"locked":false},"id":"44444444-4444-4444-8444-444444444444","user_id":"11111111-1111-4111-8111-111111111111","course_id":"22222222-2222-4222-8222-222222222222","block_type":"paragraph","title":"Still here","content_json":{"body":"active sentinel","nested":{"n":1}},"plain_text":"active sentinel","status":"active","source_kind":"manual","metadata":{"marker":"active","tags":["kept"]},"operation_batch_id":null,"created_at":"2026-08-28 08:01:00","updated_at":"2026-08-28 08:02:00","trashed_at":null,"source_references":[]}]';

async function readJson(baseUrl: string, path: string): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() };
}

async function writeJson(
  baseUrl: string,
  method: 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('K-1 explicit trashed status returns the deleted block rather than the active sibling', async () => {
  await withBlockRestoreHttp(async ({ baseUrl, db }) => {
    db.prepare(`
      UPDATE note_blocks
      SET status = 'active', trashed_at = NULL
      WHERE id = ?
    `).run(TRASHED_BLOCK_ID);
    const trashed = await writeJson(baseUrl, 'DELETE', `/api/note-blocks/${TRASHED_BLOCK_ID}`);
    assert.equal(trashed.response.status, 200);

    const result = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks?status=trashed`);

    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.map((block: { id: string }) => block.id), [TRASHED_BLOCK_ID]);
    assert.equal(result.body[0].status, 'trashed');
  });
});

test('K-2 omitted status preserves the pre-change default response bytes', async () => {
  await withBlockRestoreHttp(async ({ baseUrl }) => {
    const result = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks`);

    assert.equal(result.response.status, 200);
    // B7 adds only the OCC token. Preserve the original byte contract for every legacy field.
    const historicalResponse = result.body.map(({ text_save_revision, ...legacy }: Record<string, unknown>) => {
      assert.equal(text_save_revision, 0);
      return legacy;
    });
    assert.deepEqual(
      Buffer.from(JSON.stringify(historicalResponse), 'utf8'),
      Buffer.from(PRE_TD28_DEFAULT_JSON, 'utf8'),
      'the human trash door must not change the default active-block response by one byte',
    );
  });
});

test('explicit active status matches omitted status and invalid status shapes are rejected', async () => {
  await withBlockRestoreHttp(async ({ baseUrl }) => {
    const omitted = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks`);
    const explicit = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks?status=active`);
    assert.deepEqual(
      Buffer.from(JSON.stringify(explicit.body), 'utf8'),
      Buffer.from(JSON.stringify(omitted.body), 'utf8'),
    );

    for (const query of [
      'status=',
      'status=archived',
      'status=TRASHED',
      'status=trashed&status=active',
      'status%5B%5D=trashed',
    ]) {
      const invalid = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks?${query}`);
      assert.equal(invalid.response.status, 400, query);
      assert.deepEqual(invalid.body, { error: 'Unsupported note block status' }, query);
    }
  });
});

test('K-4 restoring a trashed block preserves its placement identity and layout fields', async () => {
  await withBlockRestoreHttp(async ({ baseUrl, db }) => {
    db.prepare(`
      UPDATE note_blocks
      SET status = 'active', trashed_at = NULL
      WHERE id = ?
    `).run(TRASHED_BLOCK_ID);

    const beforeTrash = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks`);
    const before = beforeTrash.body.find((block: { id: string }) => block.id === TRASHED_BLOCK_ID);
    assert.ok(before);
    const placementBefore = {
      order_index: before.order_index,
      parent_placement_id: before.parent_placement_id,
      display_mode: before.display_mode,
    };

    const trashed = await writeJson(baseUrl, 'DELETE', `/api/note-blocks/${TRASHED_BLOCK_ID}`);
    assert.equal(trashed.response.status, 200);
    const hidden = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks`);
    assert.equal(hidden.body.some((block: { id: string }) => block.id === TRASHED_BLOCK_ID), false);

    const restored = await writeJson(
      baseUrl,
      'PUT',
      `/api/note-blocks/${TRASHED_BLOCK_ID}`,
      { status: 'active' },
    );
    assert.equal(restored.response.status, 200);

    const afterRestore = await readJson(baseUrl, `/api/notes/${NOTE_ID}/blocks`);
    const after = afterRestore.body.find((block: { id: string }) => block.id === TRASHED_BLOCK_ID);
    assert.ok(after);
    assert.deepEqual(
      {
        order_index: after.order_index,
        parent_placement_id: after.parent_placement_id,
        display_mode: after.display_mode,
      },
      placementBefore,
    );
  });
});
