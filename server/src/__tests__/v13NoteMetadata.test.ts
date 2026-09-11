import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import { createNoteMetadataRouter } from '../routes/noteMetadata.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import migration from '../db/migrations/064_v13_note_tags.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';
import { seedNoteMetadataFixture } from './helpers/v13NoteMetadataFixture.js';
import { getProjectionUserWork } from '../services/courseLifecycle.js';
import { assertCourseLifecyclePolicyCoverage } from '../services/courseLifecyclePolicies.js';

async function fixture() {
  const db = await createV13BoardsFixture();
  const userId = 'e5-synthetic';
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')")
    .run(userId, 'e5@example.invalid');
  const data = seedNoteMetadataFixture(db, userId);
  const app = express();
  app.use(express.json());
  // Post-auth contracts only: no credentials, JWT, application startup or real data.
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/notes', createNoteMetadataRouter(() => db));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err instanceof AppError ? err.statusCode : 500).json({ error: err.message });
  });
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  assert.notEqual(address.port, 3001);
  assert.notEqual(address.port, 5173);
  return { ...data, db,
    async request(method: string, path: string, body?: unknown, status = 200) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/notes/${path}`, {
        method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
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

test('E5 tags: trim, persist across reads, exact-label uniqueness and delete', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const path = `${f.noteId}/tags`;
  assert.deepEqual(await f.request('GET', path), { tags: [] });
  const { tag } = await f.request('POST', path, { label: '  Calculus  ' }, 201);
  assert.equal(tag.label, 'Calculus');
  assert.equal(tag.actor, 'user');
  assert.equal(tag.note_id, f.noteId);
  assert.equal(tag.user_id, f.userId);
  assert.ok(!Number.isNaN(Date.parse(tag.created_at)));
  assert.deepEqual(await f.request('GET', path), { tags: [tag] });
  await f.request('POST', path, { label: 'Calculus ' }, 409);
  await f.request('POST', `${f.emptyNoteId}/tags`, { label: 'Calculus' }, 201);
  await f.request('DELETE', `${path}/${tag.id}`);
  assert.deepEqual(await f.request('GET', path), { tags: [] });
  assert.equal((await f.request('GET', `${f.emptyNoteId}/tags`)).tags.length, 1);
});

test('E5 tag label validates trimmed 1–48 characters without hierarchy fields', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  for (const label of ['', ' \n\t ', 'x'.repeat(49), null, 42]) {
    await f.request('POST', `${f.noteId}/tags`, { label }, 400);
  }
  const { tag } = await f.request('POST', `${f.noteId}/tags`, { label: ` ${'x'.repeat(48)} ` }, 201);
  assert.equal(tag.label.length, 48);
  assert.equal((await f.request('GET', `${f.noteId}/tags`)).tags.length, 1);
});

test('E5 migration is repeatable, reserves actor enum, enforces uniqueness and cascades with note', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  f.db.exec('DROP TABLE note_tags');
  migration.up(f.db); migration.up(f.db);
  assertCourseLifecyclePolicyCoverage(f.db);
  const insert = f.db.prepare('INSERT INTO note_tags (id,note_id,user_id,label,actor,created_at) VALUES (?,?,?,?,?,?)');
  insert.run('tag-one', f.noteId, f.userId, 'Label', 'user', 'now');
  insert.run('reserved-provenance', f.noteId, f.userId, 'Future provenance', 'agent', 'now');
  assert.throws(() => insert.run('duplicate', f.noteId, f.userId, 'Label', 'user', 'now'), /UNIQUE/);
  assert.throws(() => insert.run('bad-actor', f.noteId, f.userId, 'Other', 'other', 'now'), /CHECK/);
  f.db.prepare('DELETE FROM notes WHERE id = ?').run(f.noteId);
  assert.equal((f.db.prepare('SELECT COUNT(*) AS count FROM note_tags').get() as { count: number }).count, 0);
});

test('E5 labels count as retained user work for Source projection deletion decisions', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  f.db.prepare("UPDATE notes SET note_class = 'source_projection' WHERE id = ?").run(f.emptyNoteId);
  assert.equal(getProjectionUserWork(f.db, f.userId, f.emptyNoteId).has_user_work, false);
  await f.request('POST', `${f.emptyNoteId}/tags`, { label: 'Keep my source context' }, 201);
  const work = getProjectionUserWork(f.db, f.userId, f.emptyNoteId);
  assert.equal(work.note_tag_count, 1);
  assert.equal(work.has_user_work, true);
});

test('E5 metadata groups source receipts, follows Item birth/anchor notes and deduplicates downstream cards/items', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const before = f.db.prepare('SELECT total_changes() AS changes').get();
  const result = await f.request('GET', `${f.noteId}/metadata`);
  assert.equal(result.upstream.count, 4);
  assert.deepEqual(result.upstream.sources.map((source: any) => [source.title, source.count]), [
    ['E5 global source', 1], ['E5 source document.txt', 2],
  ]);
  assert.equal(result.upstream.sources[0].source_record_id, f.id('source'));
  assert.equal(result.upstream.sources[0].document_id, null);
  assert.equal(result.upstream.sources[1].document_id, f.id('document'));
  assert.equal(result.upstream.sources[1].block_id, f.id('body'));
  assert.ok(result.upstream.sources[1].reference_id);
  assert.deepEqual(result.upstream.notes.map((note: any) => [note.note_id, note.count]), [
    [f.id('anchor-origin'), 1], [f.id('origin'), 1],
  ]);
  assert.equal(result.downstream.count, 3);
  assert.deepEqual(result.downstream.boards.map((board: any) => [board.board_id, board.count]), [
    [f.id('board'), 4], [f.id('staged-board'), 1],
  ]);
  assert.deepEqual(result.downstream.content_groups, [{ content_group_id: f.id('group'), note_id: f.id('origin'),
    course_id: f.courseId, title: 'E5 downstream group', count: 2 }]);
  assert.deepEqual(f.db.prepare('SELECT total_changes() AS changes').get(), before, 'the GET must not write projection state');
});

test('E5 metadata reads existing edge edits immediately and keeps the empty paper quiet', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  assert.deepEqual(await f.request('GET', `${f.emptyNoteId}/metadata`), {
    upstream: { sources: [], notes: [], count: 0 }, downstream: { boards: [], content_groups: [], count: 0 },
  });
  const first = await f.request('GET', `${f.noteId}/metadata`);
  f.db.prepare('DELETE FROM board_members WHERE id = ?').run(f.id('staged-card'));
  f.db.prepare('DELETE FROM note_block_sources WHERE id = ?').run(f.id('reference-chunk'));
  f.db.prepare('UPDATE note_blocks SET status = ? WHERE id = ?').run('trashed', f.id('ref'));
  const second = await f.request('GET', `${f.noteId}/metadata`);
  assert.equal(second.downstream.count, first.downstream.count - 1);
  assert.equal(second.upstream.sources.find((source: any) => source.document_id)?.count, 1);
  assert.deepEqual(second.upstream.notes, []);
  assert.equal(second.upstream.count, 2);
});

test('E5 source receipts sharing an explicit document/Source identity bridge aggregate once', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  f.db.prepare('UPDATE note_block_sources SET document_id = ? WHERE id = ?')
    .run(f.id('document'), f.id('reference-source'));
  const result = await f.request('GET', `${f.noteId}/metadata`);
  assert.equal(result.upstream.count, 3);
  assert.equal(result.upstream.sources.length, 1);
  assert.equal(result.upstream.sources[0].source_record_id, f.id('source'));
  assert.equal(result.upstream.sources[0].document_id, f.id('document'));
  assert.equal(result.upstream.sources[0].title, 'E5 global source');
  assert.equal(result.upstream.sources[0].count, 3);
});
