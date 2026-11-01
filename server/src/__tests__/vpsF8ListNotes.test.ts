import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { type TestContext } from 'node:test';
import { initDb, closeDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import { classifyToolEffect } from '../agent/tools/effectClassification.js';
import { AGENT_NOTE_LIST_LIMIT, contextCourseIdForAgent } from '../services/agentNoteList.js';

type Db = Awaited<ReturnType<typeof initDb>>;
const USER = 'f8-user';
const OTHER = 'f8-other';

function seedCourse(db: Db, userId: string, name: string) {
  const id = randomUUID();
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(id, userId, name);
  return id;
}

function seedNote(db: Db, userId: string, courseId: string, title: string, updatedAt: string, extra: {
  status?: string; noteClass?: string; description?: string; body?: string;
} = {}) {
  const id = randomUUID();
  db.prepare(`INSERT INTO notes(id,user_id,course_id,title,description,status,note_class,updated_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(id, userId, courseId, title, extra.description ?? null,
    extra.status ?? 'active', extra.noteClass ?? 'user', updatedAt);
  if (extra.body) {
    const blockId = randomUUID();
    db.prepare('INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,?,?,?,?)')
      .run(blockId, userId, courseId, 'paragraph', JSON.stringify({ text: extra.body }), extra.body);
    db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,0)')
      .run(randomUUID(), id, blockId);
  }
  return id;
}

async function fixture(t: TestContext) {
  // A disposable in-memory database; no application bootstrap, environment loader, or credentials.
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  for (const id of [USER, OTHER]) db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(id, `${id}@example.invalid`, 'synthetic', id);
  return db;
}

const chat = (contextCourseId?: string) => ({
  actor: 'agent' as const, channel: 'chat' as const, conversationId: 'f8-conversation', contextCourseId,
});

async function listNotes(args: Record<string, unknown>, contextCourseId?: string) {
  return JSON.parse(await executeTool('list_notes', args, USER, chat(contextCourseId)));
}

test('list_notes is one provider-facing read tool that says how to read a body', () => {
  const definitions = toolDefinitions.filter(tool => tool.name === 'list_notes');
  assert.equal(definitions.length, 1);
  assert.equal(classifyToolEffect('list_notes'), 'read');
  assert.match(definitions[0].description, /read_note/);
  assert.deepEqual((definitions[0].parameters as { required: string[] }).required, []);
});

test('list_notes returns identities only, newest first, without trashed notes or body text', async t => {
  const db = await fixture(t);
  const courseId = seedCourse(db, USER, 'Reading');
  const older = seedNote(db, USER, courseId, 'Older note', '2026-10-01 08:00:00',
    { description: 'Cover description text', body: 'Synthetic body paragraph' });
  const newer = seedNote(db, USER, courseId, 'Newer note', '2026-10-30 08:00:00', { noteClass: 'system' });
  seedNote(db, USER, courseId, 'Trashed note', '2026-10-31 08:00:00', { status: 'trashed' });
  const before = db.serialize();

  const result = await listNotes({ course_id: courseId });
  assert.deepEqual(result, {
    course_id: courseId, total: 2, truncated: false,
    notes: [
      { id: newer, title: 'Newer note', note_class: 'system', updated_at: '2026-10-30 08:00:00' },
      { id: older, title: 'Older note', note_class: 'user', updated_at: '2026-10-01 08:00:00' },
    ],
  });
  const raw = JSON.stringify(result);
  assert.doesNotMatch(raw, /Synthetic body paragraph|Cover description text/);
  assert.deepEqual(db.serialize(), before, 'list_notes changed database bytes');
});

test('list_notes is scoped to the requested project', async t => {
  const db = await fixture(t);
  const reading = seedCourse(db, USER, 'Reading');
  const research = seedCourse(db, USER, 'Research');
  const readingNote = seedNote(db, USER, reading, 'Reading note', '2026-10-01 08:00:00');
  seedNote(db, USER, research, 'Research note', '2026-10-02 08:00:00');
  const result = await listNotes({ course_id: reading });
  assert.deepEqual(result.notes.map((note: { id: string }) => note.id), [readingNote]);
  assert.equal(result.total, 1);
});

test('list_notes caps at fifty and states the total it did not show', async t => {
  const db = await fixture(t);
  const courseId = seedCourse(db, USER, 'Large');
  for (let index = 0; index < AGENT_NOTE_LIST_LIMIT + 5; index += 1) {
    seedNote(db, USER, courseId, `Note ${index}`, `2026-10-01 08:${String(index).padStart(2, '0')}:00`);
  }
  const result = await listNotes({ course_id: courseId });
  assert.equal(AGENT_NOTE_LIST_LIMIT, 50);
  assert.equal(result.notes.length, 50);
  assert.equal(result.total, 55);
  assert.equal(result.truncated, true);
  assert.match(result.note, /50 most recently updated of 55/);
  assert.equal(result.notes[0].title, 'Note 54');
});

test('list_notes defaults to the project in context and asks for one when there is none', async t => {
  const db = await fixture(t);
  const courseId = seedCourse(db, USER, 'Reading');
  const noteId = seedNote(db, USER, courseId, 'Viewed note', '2026-10-01 08:00:00');
  const deckId = randomUUID();
  db.prepare('INSERT INTO card_decks(id,user_id,course_id,name) VALUES(?,?,?,?)').run(deckId, USER, courseId, 'Cards');

  assert.equal(contextCourseIdForAgent(db, USER, { type: 'note_view', data: { note_id: noteId } }), courseId);
  assert.equal(contextCourseIdForAgent(db, USER, { type: 'deck', data: { deck_id: deckId } }), courseId);
  assert.equal(contextCourseIdForAgent(db, USER, { type: 'calendar', data: { date: '2026-10-01' } }), undefined);

  const inContext = await listNotes({}, courseId);
  assert.deepEqual(inContext.notes.map((note: { id: string }) => note.id), [noteId]);
  const withoutContext = await listNotes({});
  assert.match(withoutContext.error, /course_id is required/);
});

test('list_notes never lists or resolves another user\'s project', async t => {
  const db = await fixture(t);
  const otherCourse = seedCourse(db, OTHER, 'Other');
  const otherNote = seedNote(db, OTHER, otherCourse, 'Private note', '2026-10-01 08:00:00');

  const explicit = await listNotes({ course_id: otherCourse });
  assert.deepEqual(explicit, { error: 'Project not found' });
  assert.equal(contextCourseIdForAgent(db, USER, { type: 'note_view', data: { note_id: otherNote } }), undefined);
  const viaContext = await listNotes({}, otherCourse);
  assert.deepEqual(viaContext, { error: 'Project not found' });
});
