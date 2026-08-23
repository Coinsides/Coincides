import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import express from 'express';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import { restoreNote, trashNote } from '../services/notes.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const DELETE_NOTE_ID = '33333333-3333-4333-8333-333333333333';
const RESTORE_NOTE_ID = '44444444-4444-4444-8444-444444444444';
const MIXED_NOTE_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_USER_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_COURSE_ID = '77777777-7777-4777-8777-777777777777';
const OTHER_NOTE_ID = '88888888-8888-4888-8888-888888888888';
const MISSING_NOTE_ID = '99999999-9999-4999-8999-999999999999';

interface NoteRow {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
  source_kind: string;
  page_format: string;
  metadata: string;
  operation_batch_id: string | null;
  created_at: string;
  updated_at: string;
  trashed_at: string | null;
  note_class: string;
}

interface Fixture {
  baseUrl: string;
  db: Database.Database;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

function insertNote(
  db: Database.Database,
  input: {
    id: string;
    userId: string;
    courseId: string;
    title: string;
    status: 'active' | 'trashed';
    updatedAt: string;
    trashedAt: string | null;
    marker: string;
  },
): void {
  db.prepare(`
    INSERT INTO notes (
      id, user_id, course_id, title, description, status, source_kind,
      page_format, metadata, operation_batch_id, created_at, updated_at,
      trashed_at, note_class
    ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 'flow', ?, NULL, ?, ?, ?, 'user')
  `).run(
    input.id,
    input.userId,
    input.courseId,
    input.title,
    `${input.marker} description`,
    input.status,
    JSON.stringify({ marker: input.marker }),
    '2026-08-23 08:00:00',
    input.updatedAt,
    input.trashedAt,
  );
}

async function withNotesHttp(run: (fixture: Fixture) => void | Promise<void>): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-notes-lifecycle-'));
  let server: Server | null = null;
  try {
    const db = await initDb(join(tempRoot, 'test.db'));
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(USER_ID, 'notes-lifecycle@example.com', 'Notes Lifecycle User', '2026-08-23 08:00:00');
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(OTHER_USER_ID, 'other-notes-lifecycle@example.com', 'Other User', '2026-08-23 08:00:00');
    db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(COURSE_ID, USER_ID, 'Notes Lifecycle Course', '2026-08-23 08:00:00', '2026-08-23 08:00:00');
    db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(OTHER_COURSE_ID, OTHER_USER_ID, 'Other Course', '2026-08-23 08:00:00', '2026-08-23 08:00:00');

    insertNote(db, {
      id: DELETE_NOTE_ID,
      userId: USER_ID,
      courseId: COURSE_ID,
      title: 'Delete me',
      status: 'active',
      updatedAt: '2026-08-23 08:01:00',
      trashedAt: null,
      marker: 'delete',
    });
    insertNote(db, {
      id: RESTORE_NOTE_ID,
      userId: USER_ID,
      courseId: COURSE_ID,
      title: 'Restore me',
      status: 'trashed',
      updatedAt: '2026-08-23 08:02:00',
      trashedAt: '2026-08-23 08:02:00',
      marker: 'restore',
    });
    insertNote(db, {
      id: MIXED_NOTE_ID,
      userId: USER_ID,
      courseId: COURSE_ID,
      title: 'Mixed patch original',
      status: 'active',
      updatedAt: '2026-08-23 08:03:00',
      trashedAt: null,
      marker: 'mixed',
    });
    insertNote(db, {
      id: OTHER_NOTE_ID,
      userId: OTHER_USER_ID,
      courseId: OTHER_COURSE_ID,
      title: 'Other user note',
      status: 'active',
      updatedAt: '2026-08-23 08:04:00',
      trashedAt: null,
      marker: 'other',
    });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as AuthRequest).userId = USER_ID;
      next();
    });
    app.use('/api/notes', noteRoutes);
    app.use(errorHandler);
    server = app.listen();
    await new Promise<void>((resolveListen) => server!.once('listening', resolveListen));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP fixture did not bind a TCP port');
    await run({ baseUrl: `http://127.0.0.1:${address.port}`, db });
  } finally {
    if (server) await closeServer(server);
    closeDb();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function selectNote(db: Database.Database, noteId: string): NoteRow {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as NoteRow | undefined;
  assert.ok(note, `Expected note ${noteId} to exist`);
  return note;
}

function expectedHydratedNoteBytes(note: NoteRow): Buffer {
  return Buffer.from(JSON.stringify({
    id: note.id,
    user_id: note.user_id,
    course_id: note.course_id,
    title: note.title,
    description: note.description,
    status: note.status,
    source_kind: note.source_kind,
    page_format: note.page_format,
    metadata: JSON.parse(note.metadata),
    operation_batch_id: note.operation_batch_id,
    created_at: note.created_at,
    updated_at: note.updated_at,
    trashed_at: note.trashed_at,
    note_class: note.note_class,
  }), 'utf8');
}

function assertIsoTimestamp(value: string | null): asserts value is string {
  if (value === null) assert.fail('Expected an ISO timestamp, received null');
  assert.equal(new Date(value).toISOString(), value);
}

test('DELETE /api/notes/:id pre-extraction golden keeps response bytes and lifecycle write shape', async () => {
  await withNotesHttp(async ({ baseUrl, db }) => {
    const response = await fetch(`${baseUrl}/api/notes/${DELETE_NOTE_ID}`, { method: 'DELETE' });
    const actualBytes = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(actualBytes, Buffer.from('{"message":"Note moved to trash"}', 'utf8'));

    const note = selectNote(db, DELETE_NOTE_ID);
    assert.equal(note.status, 'trashed');
    assertIsoTimestamp(note.trashed_at);
    assertIsoTimestamp(note.updated_at);
    assert.equal(note.trashed_at, note.updated_at);
  });
});

test('DELETE /api/notes/:id unmatched golden returns the same 404 for missing and foreign notes', async () => {
  await withNotesHttp(async ({ baseUrl, db }) => {
    const foreignBefore = selectNote(db, OTHER_NOTE_ID);

    for (const noteId of [MISSING_NOTE_ID, OTHER_NOTE_ID]) {
      const response = await fetch(`${baseUrl}/api/notes/${noteId}`, { method: 'DELETE' });
      const actualBytes = Buffer.from(await response.arrayBuffer());

      assert.equal(response.status, 404);
      assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
      assert.deepEqual(actualBytes, Buffer.from('{"error":"Note not found"}', 'utf8'));
    }

    assert.deepEqual(selectNote(db, OTHER_NOTE_ID), foreignBefore);
  });
});

test('POST /api/notes/:id/restore restores through HTTP and clears trashed_at', async () => {
  await withNotesHttp(async ({ baseUrl, db }) => {
    const trashResponse = await fetch(`${baseUrl}/api/notes/${DELETE_NOTE_ID}`, { method: 'DELETE' });
    assert.equal(trashResponse.status, 200);
    await trashResponse.arrayBuffer();
    assert.equal(selectNote(db, DELETE_NOTE_ID).status, 'trashed');

    const response = await fetch(`${baseUrl}/api/notes/${DELETE_NOTE_ID}/restore`, { method: 'POST' });
    const actualBytes = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(actualBytes, Buffer.from('{"message":"Note restored"}', 'utf8'));

    const note = selectNote(db, DELETE_NOTE_ID);
    assert.equal(note.status, 'active');
    assert.equal(note.trashed_at, null);
    assertIsoTimestamp(note.updated_at);
  });
});

test('POST /api/notes/:id/restore unmatched behavior matches DELETE for missing and foreign notes', async () => {
  await withNotesHttp(async ({ baseUrl, db }) => {
    const foreignBefore = selectNote(db, OTHER_NOTE_ID);

    for (const noteId of [MISSING_NOTE_ID, OTHER_NOTE_ID]) {
      const deleteResponse = await fetch(`${baseUrl}/api/notes/${noteId}`, { method: 'DELETE' });
      const deleteBytes = Buffer.from(await deleteResponse.arrayBuffer());
      const restoreResponse = await fetch(`${baseUrl}/api/notes/${noteId}/restore`, { method: 'POST' });
      const restoreBytes = Buffer.from(await restoreResponse.arrayBuffer());

      assert.equal(restoreResponse.status, deleteResponse.status);
      assert.equal(restoreResponse.headers.get('content-type'), deleteResponse.headers.get('content-type'));
      assert.deepEqual(restoreBytes, deleteBytes);
    }

    assert.deepEqual(selectNote(db, OTHER_NOTE_ID), foreignBefore);
  });
});

test('DELETE /api/notes/:id delegates the lifecycle write only through trashNote', () => {
  const routeSource = readFileSync(resolve(REPO_ROOT, 'server/src/routes/notes.ts'), 'utf8')
    .replace(/\r\n?/g, '\n');
  const start = routeSource.indexOf("router.delete('/:id'");
  const end = routeSource.indexOf('// GET /api/notes/:id/blocks', start);
  assert.notEqual(start, -1, 'DELETE /:id route must exist');
  assert.notEqual(end, -1, 'GET /:id/blocks boundary must exist after DELETE');
  const deleteRoute = routeSource.slice(start, end);

  assert.match(
    routeSource,
    /import\s+\{[^}]*\btrashNote\b[^}]*\}\s+from\s+'\.\.\/services\/notes\.js';/,
  );
  assert.match(
    deleteRoute,
    /trashNote\(\{\s*userId:\s*req\.userId!,\s*noteId,?\s*\}\);/,
  );
  assert.doesNotMatch(deleteRoute, /UPDATE\s+notes/i);
  assert.doesNotMatch(deleteRoute, /\.prepare\s*\(/);
});

test('POST /api/notes/:id/restore delegates the lifecycle write only through restoreNote', () => {
  const routeSource = readFileSync(resolve(REPO_ROOT, 'server/src/routes/notes.ts'), 'utf8')
    .replace(/\r\n?/g, '\n');
  const start = routeSource.indexOf("router.post('/:id/restore'");
  const end = routeSource.indexOf('// GET /api/notes/:id/blocks', start);
  assert.notEqual(start, -1, 'POST /:id/restore route must exist');
  assert.notEqual(end, -1, 'GET /:id/blocks boundary must exist after restore');
  const restoreRoute = routeSource.slice(start, end);

  assert.match(
    routeSource,
    /import\s+\{[^}]*\brestoreNote\b[^}]*\}\s+from\s+'\.\.\/services\/notes\.js';/,
  );
  assert.match(
    restoreRoute,
    /restoreNote\(\{\s*userId:\s*req\.userId!,\s*noteId,?\s*\}\);/,
  );
  assert.doesNotMatch(restoreRoute, /UPDATE\s+notes/i);
  assert.doesNotMatch(restoreRoute, /\.prepare\s*\(/);
});

test('trashNote preserves the extracted DELETE lifecycle write and void return shape', async () => {
  await withNotesHttp(({ db }) => {
    const result = trashNote({ userId: USER_ID, noteId: DELETE_NOTE_ID });
    const note = selectNote(db, DELETE_NOTE_ID);

    assert.equal(result, undefined);
    assert.equal(note.status, 'trashed');
    assertIsoTimestamp(note.trashed_at);
    assertIsoTimestamp(note.updated_at);
    assert.equal(note.trashed_at, note.updated_at);
  });
});

test('restoreNote activates an owned note and both executors leave another user note unchanged', async () => {
  await withNotesHttp(({ db }) => {
    const restoreResult = restoreNote({ userId: USER_ID, noteId: RESTORE_NOTE_ID });
    const restored = selectNote(db, RESTORE_NOTE_ID);

    assert.equal(restoreResult, undefined);
    assert.equal(restored.status, 'active');
    assert.equal(restored.trashed_at, null);
    assertIsoTimestamp(restored.updated_at);

    const foreignBefore = selectNote(db, OTHER_NOTE_ID);
    assert.equal(trashNote({ userId: USER_ID, noteId: OTHER_NOTE_ID }), undefined);
    assert.equal(restoreNote({ userId: USER_ID, noteId: OTHER_NOTE_ID }), undefined);
    assert.deepEqual(selectNote(db, OTHER_NOTE_ID), foreignBefore);
  });
});

test('PUT /api/notes/:id active restore keeps its current response and row behavior', async () => {
  await withNotesHttp(async ({ baseUrl, db }) => {
    const response = await fetch(`${baseUrl}/api/notes/${RESTORE_NOTE_ID}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    const actualBytes = Buffer.from(await response.arrayBuffer());
    const note = selectNote(db, RESTORE_NOTE_ID);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(actualBytes, expectedHydratedNoteBytes(note));
    assert.equal(note.status, 'active');
    assert.equal(note.trashed_at, null);
    assertIsoTimestamp(note.updated_at);
  });
});

test('PUT /api/notes/:id keeps status plus title in one mixed patch response', async () => {
  await withNotesHttp(async ({ baseUrl, db }) => {
    const response = await fetch(`${baseUrl}/api/notes/${MIXED_NOTE_ID}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'trashed', title: 'Renamed in same PUT' }),
    });
    const actualBytes = Buffer.from(await response.arrayBuffer());
    const note = selectNote(db, MIXED_NOTE_ID);

    assert.equal(response.status, 200);
    assert.deepEqual(actualBytes, expectedHydratedNoteBytes(note));
    assert.equal(note.title, 'Renamed in same PUT');
    assert.equal(note.status, 'trashed');
    assertIsoTimestamp(note.trashed_at);
    assertIsoTimestamp(note.updated_at);
  });
});

test('PUT /api/notes/:id handler remains byte-for-byte unchanged apart from line endings', () => {
  const routeSource = readFileSync(resolve(REPO_ROOT, 'server/src/routes/notes.ts'), 'utf8')
    .replace(/\r\n?/g, '\n');
  const start = routeSource.indexOf("router.put('/:id'");
  const end = routeSource.indexOf('// DELETE /api/notes/:id', start);
  assert.notEqual(start, -1, 'PUT /:id route must exist');
  assert.notEqual(end, -1, 'DELETE /:id boundary must exist after PUT');
  const putRoute = routeSource.slice(start, end).trimEnd();

  assert.equal(
    createHash('sha256').update(putRoute).digest('hex'),
    '6140c7351e061a18a6db23753c98ec3c7bbf146e1c97ddacf88b658387b23c61',
  );
});
