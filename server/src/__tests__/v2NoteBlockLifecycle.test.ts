import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';

interface Fixture {
  baseUrl: string;
  courseId: string;
  db: Awaited<ReturnType<typeof initDb>>;
  noteId: string;
  userId: string;
}

interface JsonResponse {
  response: Response;
  body: any;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function withHttpDb(run: (fixture: Fixture) => void | Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-note-block-lifecycle-'));
  const dbPath = join(dir, 'test.db');
  let server: Server | null = null;

  try {
    const db = await initDb(dbPath);
    const userId = uuidv4();
    const courseId = uuidv4();
    const noteId = uuidv4();
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
      .run(userId, `${userId}@example.com`, 'hash', 'Lifecycle User');
    db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
      .run(courseId, userId, 'Lifecycle Course');
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(noteId, userId, courseId, 'Lifecycle Note');

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as AuthRequest).userId = userId;
      next();
    });
    app.use('/api/notes', noteRoutes);
    app.use(errorHandler);
    server = app.listen();
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP fixture did not bind a TCP port');

    await run({
      baseUrl: `http://127.0.0.1:${address.port}`,
      courseId,
      db,
      noteId,
      userId,
    });
  } finally {
    if (server) await closeServer(server);
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

async function postJson(baseUrl: string, path: string, body: unknown): Promise<JsonResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

function createPayload(clientCreateKey: string, overrides: Record<string, unknown> = {}) {
  return {
    client_create_key: clientCreateKey,
    block_type: 'paragraph',
    content_json: { body: 'sentinel' },
    plain_text: 'sentinel',
    ...overrides,
  };
}

test('same client create key replays one durable block even when retry payload changes', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const key = 'retry-after-lost-response';
    const first = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    const replay = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key, {
      block_type: 'heading',
      content_json: { body: 'changed retry payload' },
      plain_text: 'changed retry payload',
    }));

    assert.equal(first.response.status, 201);
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.id, first.body.id);
    assert.equal(replay.body.placement_id, first.body.placement_id);
    assert.equal(replay.body.block_type, 'paragraph');
    assert.equal(replay.body.plain_text, 'sentinel');
    assert.equal(first.body.client_create_receipt.reused, false);
    assert.equal(replay.body.client_create_receipt.reused, true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as { count: number }).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_block_placements').get() as { count: number }).count, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'client_note_block_create'").get() as { count: number }).count, 1);
  });
});

test('cancel-before-create writes a tombstone and prevents a late create', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const key = 'cancel-before-create';
    const canceled = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );
    const lateCreate = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));

    assert.equal(canceled.response.status, 200);
    assert.deepEqual(canceled.body, { discarded: false, block_id: null, canceled: true });
    assert.equal(lateCreate.response.status, 409);
    assert.equal(lateCreate.body.status, 'canceled');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as { count: number }).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_block_placements').get() as { count: number }).count, 0);
    const batch = db.prepare("SELECT status FROM operation_batches WHERE source_type = 'client_note_block_create'").get() as { status: string };
    assert.equal(batch.status, 'reverted');
  });
});

test('discard compensates an untouched client create and leaves only the canceled receipt', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const key = 'compensate-after-create';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(created.response.status, 201);
    assert.equal(discarded.response.status, 200);
    assert.deepEqual(discarded.body, {
      discarded: true,
      block_id: created.body.id,
      canceled: true,
    });
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as { count: number }).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_block_placements').get() as { count: number }).count, 0);
    const batch = db.prepare("SELECT status, metadata FROM operation_batches WHERE source_type = 'client_note_block_create'").get() as { status: string; metadata: string };
    assert.equal(batch.status, 'reverted');
    assert.equal(JSON.parse(batch.metadata).block_id, created.body.id);
  });
});

test('discard compensates a changed block only when its durable content is provably empty', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const key = 'changed-to-empty';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    db.prepare(`
      UPDATE note_blocks
      SET title = NULL, plain_text = NULL, content_json = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify({
      body: '',
      text_flow: {
        id: `textflow-${created.body.id}`,
        textflow_version: 'TextBlockContentV1',
        units: [{ id: 'tu-1', text: '', status: 'active', metadata: {} }],
        inline_structures: [],
        metadata: {},
      },
    }), '2099-01-01T00:00:00.000Z', created.body.id);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 200);
    assert.equal(discarded.body.discarded, true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 0);
  });
});

test('discard rejects provably-empty content when block type or metadata changed', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const cases = [
      {
        key: 'empty-with-changed-metadata',
        mutation: "metadata = '{\"user_semantic\":\"keep\"}'",
      },
      {
        key: 'empty-with-changed-type',
        mutation: "block_type = 'heading'",
      },
    ];

    for (const item of cases) {
      const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(item.key));
      db.prepare(`
        UPDATE note_blocks
        SET title = NULL,
            plain_text = NULL,
            content_json = '{"body":""}',
            ${item.mutation},
            updated_at = '2099-01-01T00:00:00.000Z'
        WHERE id = ?
      `).run(created.body.id);

      const discarded = await postJson(
        baseUrl,
        `/api/notes/${noteId}/blocks/discard-client-create`,
        { client_create_key: item.key },
      );

      assert.equal(discarded.response.status, 409);
      assert.equal(discarded.body.error, 'Client-created block has been meaningfully changed');
      assert.equal(
        (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count,
        1,
      );
      assert.equal(
        (db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE block_id = ?').get(created.body.id) as { count: number }).count,
        1,
      );
      assert.equal(
        (db.prepare('SELECT status FROM operation_batches WHERE source_id = ?').get(item.key) as { status: string }).status,
        'applied',
      );
    }
  });
});

test('discard rejects provably-empty content when the receipt placement snapshot changed', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const key = 'empty-with-changed-placement';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    db.prepare(`
      UPDATE note_blocks
      SET title = NULL,
          plain_text = NULL,
          content_json = '{"body":""}',
          updated_at = '2099-01-01T00:00:00.000Z'
      WHERE id = ?
    `).run(created.body.id);
    db.prepare(`
      UPDATE note_block_placements
      SET display_overrides_json = '{"user_layout":{"x":144}}',
          updated_at = '2099-01-01T00:00:00.000Z'
      WHERE id = ?
    `).run(created.body.placement_id);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 409);
    assert.equal(discarded.body.error, 'Client-created block placement has changed');
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE id = ?').get(created.body.placement_id) as { count: number }).count,
      1,
    );
  });
});

test('legacy empty cleanup conflict keeps rows and writes one immutable operation receipt', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const key = 'legacy-empty-cleanup-conflict';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    assert.equal(created.response.status, 201);

    const originalBatch = db.prepare(`
      SELECT ob.id, ob.source_type, ob.source_id, ob.status, ob.metadata, ob.reverted_at
      FROM operation_batches ob
      JOIN note_blocks nb ON nb.operation_batch_id = ob.id
      WHERE nb.id = ?
    `).get(created.body.id) as {
      id: string;
      source_type: string;
      source_id: string;
      status: string;
      metadata: string;
      reverted_at: string | null;
    };
    db.prepare(`
      UPDATE note_blocks
      SET title = NULL,
          plain_text = NULL,
          content_json = '{"body":""}',
          updated_at = '2099-01-01T00:00:00.000Z'
      WHERE id = ?
    `).run(created.body.id);
    db.prepare('UPDATE operation_batches SET metadata = ? WHERE id = ?').run(JSON.stringify({
      note_id: noteId,
      block_id: created.body.id,
      placement_id: created.body.placement_id,
    }), originalBatch.id);

    const firstConflict = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );
    const firstReceipt = db.prepare(`
      SELECT id, user_id, course_id, source_type, source_id, status, metadata,
             created_at, applied_at, reverted_at
      FROM operation_batches
      WHERE source_type = 'client_note_block_cleanup_conflict'
    `).get() as {
      id: string;
      user_id: string;
      course_id: string;
      source_type: string;
      source_id: string;
      status: string;
      metadata: string;
      created_at: string;
      applied_at: string;
      reverted_at: string | null;
    };
    const secondConflict = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    for (const conflict of [firstConflict, secondConflict]) {
      assert.equal(conflict.response.status, 409);
      assert.equal(conflict.body.details.code, 'client_note_block_cleanup_conflict');
      assert.equal(conflict.body.details.conflict_code, 'legacy_receipt_missing_initial_placement');
      assert.equal(conflict.body.details.operation_batch_id, firstReceipt.id);
    }
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE id = ? AND block_id = ?')
        .get(created.body.placement_id, created.body.id) as { count: number }).count,
      1,
    );
    const originalAfter = db.prepare(`
      SELECT source_type, source_id, status, metadata, reverted_at
      FROM operation_batches
      WHERE id = ?
    `).get(originalBatch.id) as Omit<typeof originalBatch, 'id'>;
    assert.deepEqual(originalAfter, {
      source_type: 'client_note_block_create',
      source_id: key,
      status: 'applied',
      metadata: JSON.stringify({
        note_id: noteId,
        block_id: created.body.id,
        placement_id: created.body.placement_id,
      }),
      reverted_at: null,
    });
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'client_note_block_cleanup_conflict'")
        .get() as { count: number }).count,
      1,
    );
    const receiptAfterRetry = db.prepare(`
      SELECT id, user_id, course_id, source_type, source_id, status, metadata,
             created_at, applied_at, reverted_at
      FROM operation_batches
      WHERE id = ?
    `).get(firstReceipt.id) as typeof firstReceipt;
    assert.deepEqual(receiptAfterRetry, firstReceipt);
    assert.equal(firstReceipt.user_id, userId);
    assert.equal(firstReceipt.course_id, courseId);
    assert.equal(firstReceipt.source_type, 'client_note_block_cleanup_conflict');
    assert.equal(firstReceipt.source_id, originalBatch.id);
    assert.equal(firstReceipt.status, 'applied');
    assert.ok(firstReceipt.applied_at);
    assert.equal(firstReceipt.created_at, firstReceipt.applied_at);
    assert.equal(firstReceipt.reverted_at, null);
    assert.deepEqual(JSON.parse(firstReceipt.metadata), {
      schema_version: 'client-note-block-cleanup-conflict.v1',
      conflict_code: 'legacy_receipt_missing_initial_placement',
      client_create_operation_batch_id: originalBatch.id,
      client_create_key: key,
      note_id: noteId,
      block_id: created.body.id,
      placement_id: created.body.placement_id,
      detected_at: firstReceipt.created_at,
    });
  });
});

test('discard rejects a receipt block with a placement in a second note', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const key = 'second-note-placement';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    const secondNoteId = uuidv4();
    const secondPlacementId = uuidv4();
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(secondNoteId, userId, courseId, 'Second lifecycle note');
    db.prepare(`
      INSERT INTO note_block_placements (
        id, note_id, block_id, order_index, display_overrides_json
      ) VALUES (?, ?, ?, 0, '{}')
    `).run(secondPlacementId, secondNoteId, created.body.id);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 409);
    assert.deepEqual(discarded.body.details.blockers, ['additional_placement']);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE block_id = ?').get(created.body.id) as { count: number }).count,
      2,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_block_placements WHERE id = ?').get(secondPlacementId) as { count: number }).count,
      1,
    );
  });
});

test('discard rejects second-note annotations by block, TextFlow, and TextUnit identity', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const secondNoteId = uuidv4();
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(secondNoteId, userId, courseId, 'Second annotation note');
    const cases = ['block', 'text_flow', 'text_unit'] as const;

    for (const identity of cases) {
      const key = `second-note-${identity}-annotation`;
      const flowId = `flow-${identity}`;
      const unitId = `unit-${identity}`;
      const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key, {
        content_json: {
          body: 'sentinel',
          text_flow: {
            id: flowId,
            textflow_version: 'TextBlockContentV1',
            units: [{ id: unitId, text: 'sentinel' }],
            inline_structures: [],
          },
        },
      }));
      if (identity !== 'block') {
        db.prepare(`
          UPDATE note_blocks
          SET title = NULL, plain_text = NULL, content_json = ?, updated_at = ?
          WHERE id = ?
        `).run(JSON.stringify({
          body: '',
          text_flow: {
            id: `replacement-${flowId}`,
            textflow_version: 'TextBlockContentV1',
            units: [{ id: `replacement-${unitId}`, text: '' }],
            inline_structures: [],
          },
        }), '2099-01-01T00:00:00.000Z', created.body.id);
      }
      const annotationId = uuidv4();
      const rangeId = uuidv4();
      db.prepare(`
        INSERT INTO annotation_truths (
          id, user_id, course_id, note_id, canvas_id, raw_label
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(annotationId, userId, courseId, secondNoteId, secondNoteId, 'Cross-note annotation');
      db.prepare(`
        INSERT INTO annotation_ranges (
          id, user_id, annotation_id, course_id, note_id, target_kind,
          block_id, text_flow_id, text_unit_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rangeId,
        userId,
        annotationId,
        courseId,
        secondNoteId,
        identity === 'block' ? 'block' : 'text_span',
        identity === 'block' ? created.body.id : null,
        identity === 'text_flow' ? flowId : null,
        identity === 'text_unit' ? unitId : null,
      );

      const discarded = await postJson(
        baseUrl,
        `/api/notes/${noteId}/blocks/discard-client-create`,
        { client_create_key: key },
      );

      assert.equal(discarded.response.status, 409);
      assert.equal(discarded.body.details.blockers.includes('annotation'), true);
      assert.equal(
        (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count,
        1,
      );
      assert.equal(
        (db.prepare('SELECT COUNT(*) AS count FROM annotation_ranges WHERE id = ?').get(rangeId) as { count: number }).count,
        1,
      );
    }
  });
});

test('discard rejects a second-note mount and annotation that reference its Canvas object', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const key = 'second-note-object-references';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    const secondNoteId = uuidv4();
    const objectId = uuidv4();
    const mountId = uuidv4();
    const annotationId = uuidv4();
    const rangeId = uuidv4();
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(secondNoteId, userId, courseId, 'Second object-reference note');
    db.prepare(`
      INSERT INTO canvas_objects (
        id, user_id, course_id, note_id, canvas_id, kind, backing, object_class, metadata
      ) VALUES (?, ?, ?, ?, ?, 'paragraph_block_projection', 'note_block', 'block_backed', ?)
    `).run(
      objectId,
      userId,
      courseId,
      noteId,
      noteId,
      JSON.stringify({ block_id: created.body.id, placement_id: created.body.placement_id }),
    );
    db.prepare(`
      INSERT INTO content_mounts (
        id, user_id, course_id, note_id, object_id, target_kind, target_id
      ) VALUES (?, ?, ?, ?, ?, 'note_block', ?)
    `).run(mountId, userId, courseId, secondNoteId, objectId, created.body.id);
    db.prepare(`
      INSERT INTO annotation_truths (
        id, user_id, course_id, note_id, canvas_id, raw_label
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(annotationId, userId, courseId, secondNoteId, secondNoteId, 'Cross-note object annotation');
    db.prepare(`
      INSERT INTO annotation_ranges (
        id, user_id, annotation_id, course_id, note_id, target_kind, canvas_object_id
      ) VALUES (?, ?, ?, ?, ?, 'canvas_object', ?)
    `).run(rangeId, userId, annotationId, courseId, secondNoteId, objectId);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 409);
    assert.equal(discarded.body.details.blockers.includes(`canvas_mount:${objectId}`), true);
    assert.equal(discarded.body.details.blockers.includes(`canvas_annotation:${objectId}`), true);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM canvas_objects WHERE id = ?').get(objectId) as { count: number }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM content_mounts WHERE id = ?').get(mountId) as { count: number }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM annotation_ranges WHERE id = ?').get(rangeId) as { count: number }).count,
      1,
    );
  });
});

test('discard rejects a meaningfully changed durable block', async () => {
  await withHttpDb(async ({ baseUrl, db, noteId }) => {
    const key = 'changed-meaningfully';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    db.prepare(`
      UPDATE note_blocks
      SET plain_text = 'delivered edit', content_json = '{"body":"delivered edit"}', updated_at = ?
      WHERE id = ?
    `).run('2099-01-01T00:00:00.000Z', created.body.id);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 409);
    assert.equal(discarded.body.error, 'Client-created block has been meaningfully changed');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 1);
  });
});

test('discard removes only the receipt-owned Canvas placement side effects', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const key = 'compensate-canvas-placement';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    const objectId = uuidv4();
    const canvasPlacementId = uuidv4();
    const mountId = uuidv4();
    db.prepare(`
      INSERT INTO canvas_objects (
        id, user_id, course_id, note_id, canvas_id, kind, backing, object_class, metadata
      ) VALUES (?, ?, ?, ?, ?, 'paragraph_block_projection', 'note_block', 'block_backed', ?)
    `).run(
      objectId,
      userId,
      courseId,
      noteId,
      noteId,
      JSON.stringify({ block_id: created.body.id, placement_id: created.body.placement_id }),
    );
    db.prepare(`
      INSERT INTO canvas_placements (
        id, user_id, course_id, note_id, object_id, canvas_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(canvasPlacementId, userId, courseId, noteId, objectId, noteId);
    db.prepare(`
      INSERT INTO content_mounts (
        id, user_id, course_id, note_id, object_id, target_kind, target_id
      ) VALUES (?, ?, ?, ?, ?, 'note_block', ?)
    `).run(mountId, userId, courseId, noteId, objectId, created.body.id);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 200);
    assert.equal(discarded.body.discarded, true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM content_mounts WHERE id = ?').get(mountId) as { count: number }).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_placements WHERE id = ?').get(canvasPlacementId) as { count: number }).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_objects WHERE id = ?').get(objectId) as { count: number }).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 0);
  });
});

test('discard keeps a Canvas placement when its object has an external audit footprint', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const key = 'canvas-placement-with-history';
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
    const objectId = uuidv4();
    db.prepare(`
      INSERT INTO canvas_objects (
        id, user_id, course_id, note_id, canvas_id, kind, backing, object_class, metadata
      ) VALUES (?, ?, ?, ?, ?, 'paragraph_block_projection', 'note_block', 'block_backed', ?)
    `).run(
      objectId,
      userId,
      courseId,
      noteId,
      noteId,
      JSON.stringify({ block_id: created.body.id, placement_id: created.body.placement_id }),
    );
    db.prepare(`
      INSERT INTO canvas_placements (id, user_id, course_id, note_id, object_id, canvas_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, courseId, noteId, objectId, noteId);
    db.prepare(`
      INSERT INTO content_mounts (
        id, user_id, course_id, note_id, object_id, target_kind, target_id
      ) VALUES (?, ?, ?, ?, ?, 'note_block', ?)
    `).run(uuidv4(), userId, courseId, noteId, objectId, created.body.id);
    db.prepare(`
      INSERT INTO study_activity_log (id, user_id, date, activity_type, entity_id, entity_type)
      VALUES (?, ?, '2026-08-20', 'canvas_edit', ?, 'canvas_object')
    `).run(uuidv4(), userId, objectId);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: key },
    );

    assert.equal(discarded.response.status, 409);
    assert.equal(discarded.body.details.blockers.includes('study_activity_history'), true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_objects WHERE id = ?').get(objectId) as { count: number }).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 1);
  });
});

test('discard rejects a client-created block referenced by a ContentGroup', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload('content-group-ref'));
    const groupId = uuidv4();
    db.prepare(`
      INSERT INTO content_groups (id, user_id, course_id, note_id, title)
      VALUES (?, ?, ?, ?, ?)
    `).run(groupId, userId, courseId, noteId, 'Referenced group');
    db.prepare(`
      INSERT INTO content_group_members (
        id, user_id, content_group_id, course_id, note_id, kind, target_id
      ) VALUES (?, ?, ?, ?, ?, 'block', ?)
    `).run(uuidv4(), userId, groupId, courseId, noteId, created.body.id);

    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { client_create_key: 'content-group-ref' },
    );

    assert.equal(discarded.response.status, 409);
    assert.deepEqual(discarded.body.details.blockers, ['content_group']);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 1);
  });
});

test('discard rejects TextFlow and TextUnit annotation identities even without block_id', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const cases = [
      { key: 'flow-annotation', flowId: 'flow-receipt', unitId: 'tu-flow', target: 'flow' },
      { key: 'unit-annotation', flowId: 'flow-unit', unitId: 'tu-receipt', target: 'unit' },
    ];
    for (const item of cases) {
      const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(item.key, {
        content_json: {
          body: 'sentinel',
          text_flow: {
            id: item.flowId,
            textflow_version: 'TextBlockContentV1',
            units: [{ id: item.unitId, text: 'sentinel' }],
            inline_structures: [],
          },
        },
      }));
      const annotationId = uuidv4();
      db.prepare(`
        INSERT INTO annotation_truths (
          id, user_id, course_id, note_id, canvas_id, raw_label
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(annotationId, userId, courseId, noteId, noteId, 'Receipt annotation');
      db.prepare(`
        INSERT INTO annotation_ranges (
          id, user_id, annotation_id, course_id, note_id, target_kind,
          block_id, text_flow_id, text_unit_id
        ) VALUES (?, ?, ?, ?, ?, 'text_span', NULL, ?, ?)
      `).run(
        uuidv4(),
        userId,
        annotationId,
        courseId,
        noteId,
        item.target === 'flow' ? item.flowId : null,
        item.target === 'unit' ? item.unitId : null,
      );

      const discarded = await postJson(
        baseUrl,
        `/api/notes/${noteId}/blocks/discard-client-create`,
        { client_create_key: item.key },
      );
      assert.equal(discarded.response.status, 409);
      assert.equal(discarded.body.details.blockers.includes('annotation'), true);
      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 1);
    }
  });
});

test('discard rejects reconciliation and study activity footprints', async () => {
  await withHttpDb(async ({ baseUrl, courseId, db, noteId, userId }) => {
    const cases = ['reconciliation', 'study'] as const;
    for (const kind of cases) {
      const key = `${kind}-history`;
      const created = await postJson(baseUrl, `/api/notes/${noteId}/blocks`, createPayload(key));
      if (kind === 'reconciliation') {
        db.prepare(`
          INSERT INTO reconciliation_recovery_events (
            id, user_id, course_id, event_type, target_type, target_id
          ) VALUES (?, ?, ?, 'recovery', 'note_block', ?)
        `).run(uuidv4(), userId, courseId, created.body.id);
      } else {
        db.prepare(`
          INSERT INTO study_activity_log (id, user_id, date, activity_type, entity_id, entity_type)
          VALUES (?, ?, '2026-08-20', 'note_edit', ?, 'note_block')
        `).run(uuidv4(), userId, created.body.id);
      }

      const discarded = await postJson(
        baseUrl,
        `/api/notes/${noteId}/blocks/discard-client-create`,
        { client_create_key: key },
      );
      assert.equal(discarded.response.status, 409);
      assert.equal(
        discarded.body.details.blockers.includes(
          kind === 'reconciliation' ? 'reconciliation_history' : 'study_activity_history',
        ),
        true,
      );
      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?').get(created.body.id) as { count: number }).count, 1);
    }
  });
});

test('discard endpoint rejects a generalized block id without a client create key', async () => {
  await withHttpDb(async ({ baseUrl, noteId }) => {
    const discarded = await postJson(
      baseUrl,
      `/api/notes/${noteId}/blocks/discard-client-create`,
      { block_id: uuidv4() },
    );
    assert.equal(discarded.response.status, 400);
  });
});
