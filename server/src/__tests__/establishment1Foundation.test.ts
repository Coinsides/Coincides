import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test, { type TestContext } from 'node:test';
import Database from 'better-sqlite3';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import migration054 from '../db/migrations/054_v13_events_ledger.js';
import migration058 from '../db/migrations/058_v13_board_deleted_event.js';
import migration073 from '../db/migrations/073_v14_agent_goal_event.js';
import migration074 from '../db/migrations/074_v14_agent_planning_events.js';
import migration076 from '../db/migrations/076_v14_claim_without_receipt_event.js';
import migration081 from '../db/migrations/081_v14_board_agent_staging.js';
import migration086 from '../db/migrations/086_v2_purpose_card_ink_verbs.js';
import { EVENT_VERBS, recordEvent } from '../db/recordEvent.js';
import { errorHandler } from '../middleware/errorHandler.js';
import contentGroupRoutes from '../routes/contentGroups.js';
import { createItemRouter } from '../routes/items.js';
import noteRoutes from '../routes/notes.js';
import { createPurposeRouter } from '../routes/purposes.js';
import reviewRoutes from '../routes/review.js';
import { listEventsForObjects } from '../services/eventsLedger.js';
import { createItem } from '../services/items.js';
import { unconnectedPurposeDrafter, waitForScheduledPurposeDrafts, type PurposeDrafter } from '../services/purposeDrafting.js';
import {
  addPurposeMember,
  amendPurpose,
  createPurpose,
  getPurpose,
  listPurposes,
  revisePurposeInterpretation,
  setPurposeLock,
} from '../services/purposes.js';
import { purposeMemberKindSchema } from '../validators/purposes.js';

type Db = Awaited<ReturnType<typeof initDb>>;

interface Fixture {
  db: Db;
  userId: string;
  otherUserId: string;
  courseId: string;
  deckId: string;
  cardId: string;
  noteId: string;
  purposeId: string;
  request: (method: string, path: string, body?: unknown, as?: string) => Promise<{ status: number; body: any }>;
}

async function fixture(t: TestContext, drafter: PurposeDrafter = unconnectedPurposeDrafter): Promise<Fixture> {
  const db = await initDb(':memory:');
  const userId = uuidv4();
  const otherUserId = uuidv4();
  const courseId = uuidv4();
  const deckId = uuidv4();
  const cardId = uuidv4();
  const noteId = uuidv4();
  for (const id of [userId, otherUserId]) {
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(id, `${id}@example.test`);
  }
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Project')").run(courseId, userId);
  db.prepare("INSERT INTO card_decks (id,user_id,course_id,name) VALUES (?,?,?,'Deck')").run(deckId, userId, courseId);
  db.prepare("INSERT INTO cards (id,user_id,deck_id,title,content) VALUES (?,?,?,'Card','{}')").run(cardId, userId, deckId);
  db.prepare("INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,'Note')").run(noteId, userId, courseId);
  const purposeId = db.transaction(() => createPurpose(db, userId, { title: 'Pass the exam', project_id: courseId }))().id;

  let currentUser = userId;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = currentUser; next(); });
  app.use('/api/purposes', createPurposeRouter(() => db, drafter));
  app.use('/api/review', reviewRoutes);
  app.use('/api/items', createItemRouter(() => db));
  app.use('/api/content-groups', contentGroupRoutes);
  app.use('/api/notes', noteRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => {
    await waitForScheduledPurposeDrafts();
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });
  return {
    db, userId, otherUserId, courseId, deckId, cardId, noteId, purposeId,
    request: async (method, path, body, as) => {
      currentUser = as ?? userId;
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    },
  };
}

const ledger = (db: Database.Database, verb?: string): Array<Record<string, any>> => (db.prepare(
  `SELECT * FROM events ${verb ? 'WHERE verb = ?' : ''} ORDER BY seq`,
).all(...(verb ? [verb] : [])) as Array<Record<string, any>>).map((row) => ({
  ...row, objects: JSON.parse(row.objects), meta: JSON.parse(row.meta),
}));

function assertAppendOnly(db: Database.Database): void {
  assert.throws(() => db.exec("UPDATE events SET summary = 'changed'"), /events_append_only/);
  assert.throws(() => db.exec('DELETE FROM events'), /events_append_only/);
}

const triggers = (db: Database.Database) => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all() as Array<{ name: string }>)
  .map((row) => row.name);

// ---------------------------------------------------------------- migration

function olderLedger(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE board_stickies (id TEXT PRIMARY KEY);
    CREATE TABLE purposes (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE purpose_members (id TEXT PRIMARY KEY, role TEXT);
    INSERT INTO purposes (id, title) VALUES ('existing', 'Existing');
    CREATE TRIGGER purpose_members_writer_retired_insert BEFORE INSERT ON purpose_members
      BEGIN SELECT RAISE(ABORT, 'purpose_members_writer_retired'); END;
    CREATE TRIGGER purpose_members_writer_retired_update BEFORE UPDATE ON purpose_members
      BEGIN SELECT RAISE(ABORT, 'purpose_members_writer_retired'); END;
  `);
  for (const migration of [migration054, migration058, migration073, migration074, migration076, migration081]) {
    db.transaction(() => migration.up(db))();
  }
  return db;
}

test('an older database rebuilds the ledger and keeps every row, the sequence and append-only', (t) => {
  const db = olderLedger();
  t.after(() => db.close());
  const seed = (verb: 'migrated' | 'published') => db.transaction(() => recordEvent(db, {
    user_id: 'u', actor_kind: 'system', channel: 'synthetic', verb, objects: [{ kind: 'note', id: 'n' }], summary: verb,
  }))();
  seed('migrated');
  seed('published');
  seed('migrated');
  const insert = () => db.prepare(`INSERT INTO events (user_id, actor_kind, channel, verb, objects, summary)
    VALUES ('u', 'human', 'synthetic', 'card_reviewed', '[]', 'synthetic')`).run();
  assert.throws(insert, /constraint failed/i, 'the older CHECK refuses the new word');
  const before = db.prepare('SELECT * FROM events ORDER BY seq').all();
  const sequence = () => (db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'").get() as { seq: number }).seq;
  const high = sequence();

  db.transaction(() => migration086.up(db))();

  assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY seq').all(), before);
  assert.equal(sequence(), high);
  assert.equal(before.length, 3);
  assertAppendOnly(db);
  for (const verb of ['card_reviewed', 'item_cited', 'item_edited'] as const) {
    db.transaction(() => recordEvent(db, { user_id: 'u', actor_kind: 'human', channel: 'synthetic', verb, objects: [], summary: verb }))();
  }
  assert.equal((db.prepare('SELECT MAX(seq) AS seq FROM events').get() as { seq: number }).seq, high + 3);

  // Existing purposes take the column defaults.
  assert.deepEqual({ ...db.prepare("SELECT user_verbatim, interpretation_json, interpretation_locked, locked_at FROM purposes WHERE id = 'existing'").get() as object }, {
    user_verbatim: null, interpretation_json: '{}', interpretation_locked: 0, locked_at: null,
  });
  assert.deepEqual(triggers(db).filter((name) => name.startsWith('purpose_members_writer')), []);
  db.exec("INSERT INTO purpose_members (id) VALUES ('m'); UPDATE purpose_members SET role = 'r' WHERE id = 'm'");

  // Running it again changes nothing.
  const settled = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'events'").get();
  db.transaction(() => migration086.up(db))();
  assert.deepEqual(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'events'").get(), settled);
});

test('a fresh database has all twenty-eight words from schema.sql, and the migration skips the rebuild', async (t) => {
  const { db } = await fixture(t);
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'events'").get() as { sql: string }).sql;
  assert.match(sql, /^CREATE TABLE events \(/, 'still the schema.sql table: no rebuild renamed it');
  for (const verb of EVENT_VERBS) assert.ok(sql.includes(`'${verb}'`), verb);
  assert.equal(EVENT_VERBS.length, 28);
  db.transaction(() => recordEvent(db, { user_id: 'u', actor_kind: 'human', channel: 'synthetic', verb: 'item_edited', objects: [], summary: 'seed' }))();
  assertAppendOnly(db);
});

test('the note-purpose triggers stay, while the roster triggers are gone', async (t) => {
  const { db, request, noteId, purposeId } = await fixture(t);
  const names = triggers(db);
  assert.ok(names.includes('purposes_note_writer_retired_insert'));
  assert.ok(names.includes('purposes_note_writer_retired_update'));
  assert.ok(!names.includes('purpose_members_writer_retired_insert'));
  assert.ok(!names.includes('purpose_members_writer_retired_update'));
  assert.throws(() => db.prepare('UPDATE purposes SET note_id = ? WHERE id = ?').run(noteId, purposeId), /note_purpose_writer_retired/);
  assert.equal((await request('PUT', `/api/purposes/by-note/${noteId}`, {})).status, 410);
  assert.equal((await request('GET', `/api/purposes/${purposeId}/compiled-scope`)).status, 410);
});

// ---------------------------------------------------------------- purpose writes

test('every purpose write requires the caller transaction', async (t) => {
  const { db, userId, purposeId } = await fixture(t);
  assert.throws(() => amendPurpose(db, userId, purposeId, { title: 'x' }), /purpose_transaction_required/);
  assert.throws(() => setPurposeLock(db, userId, purposeId, true), /purpose_transaction_required/);
  assert.throws(() => revisePurposeInterpretation(db, userId, purposeId, {}, {
    actor: 'agent:interpreter', channel: 'synthetic', trigger: 'synthetic',
  }), /purpose_transaction_required/);
  assert.throws(() => addPurposeMember(db, userId, purposeId, { member_kind: 'item', member_id: 'x' }), /purpose_transaction_required/);
});

test('the words a person types are stored byte for byte', async (t) => {
  const { request, purposeId } = await fixture(t);
  const words = '  我想考过，\n  但其实是想搞懂。  ';
  const { status, body } = await request('PATCH', `/api/purposes/${purposeId}`, { user_verbatim: words });
  assert.equal(status, 200);
  assert.equal(body.purpose.user_verbatim, words);
  assert.equal(body.purpose.interpretation_locked, false, 'the original words do not touch the lock');
});

test('a person editing the interpretation locks it in the same write and the machine is refused', async (t) => {
  const { db, userId, request, purposeId } = await fixture(t);
  const { body } = await request('PATCH', `/api/purposes/${purposeId}`, { interpretation: { true_goal: 'Understand it' } });
  assert.equal(body.purpose.interpretation.true_goal, 'Understand it');
  assert.equal(body.purpose.interpretation_locked, true);
  assert.ok(body.purpose.locked_at);
  const [event] = ledger(db, 'purpose_amended');
  assert.equal(event.actor_kind, 'human');
  assert.equal(event.channel, 'PATCH /api/purposes/:purposeId');
  assert.deepEqual(event.meta, { fields: ['interpretation'], lock: 'locked' });

  const before = ledger(db).length;
  assert.throws(
    () => db.transaction(() => revisePurposeInterpretation(db, userId, purposeId, { true_goal: 'Machine words' }, {
      actor: 'agent:interpreter', channel: 'synthetic', trigger: 'synthetic',
    }))(),
    (error: any) => error.statusCode === 409 && error.details.code === 'purpose_interpretation_locked',
  );
  assert.equal(getPurpose(db, userId, purposeId).interpretation.true_goal, 'Understand it');
  assert.equal(ledger(db).length, before, 'a refused revision records nothing');

  const human = await request('PATCH', `/api/purposes/${purposeId}`, { title: 'Still mine', user_verbatim: 'mine' });
  assert.equal(human.status, 200, 'a person keeps every right under the lock');
  assert.equal(human.body.purpose.title, 'Still mine');
  assert.equal(human.body.purpose.interpretation_locked, true);
});

test('locking and unlocking are recorded, repeat as no-ops, and unlocking hands the card back', async (t) => {
  const { db, userId, request, purposeId } = await fixture(t);
  const lock = await request('PATCH', `/api/purposes/${purposeId}`, { interpretation_locked: true });
  assert.equal(lock.body.purpose.interpretation_locked, true);
  assert.deepEqual(ledger(db, 'purpose_amended').map((event) => event.meta), [{ fields: [], lock: 'locked' }]);
  await request('PATCH', `/api/purposes/${purposeId}`, { interpretation_locked: true });
  assert.equal(ledger(db, 'purpose_amended').length, 1, 'no change, no entry');
  assert.equal(ledger(db, 'purpose_sealed').length, 0, 'the lock never borrows the sealed word');

  const unlock = await request('PATCH', `/api/purposes/${purposeId}`, { interpretation_locked: false });
  assert.equal(unlock.body.purpose.interpretation_locked, false);
  assert.equal(unlock.body.purpose.locked_at, null);
  const revised = db.transaction(() => revisePurposeInterpretation(db, userId, purposeId, { true_goal: 'Draft' }, {
    actor: 'agent:interpreter', channel: 'synthetic', trigger: 'synthetic',
  }))();
  assert.equal(revised.interpretation.true_goal, 'Draft');
  assert.equal(revised.interpretation.drafted_by, 'agent:interpreter');
  assert.equal(revised.interpretation.revision, 1);
  const last = ledger(db, 'purpose_amended').at(-1)!;
  assert.equal(last.actor_kind, 'agent:interpreter');
  assert.deepEqual(last.meta, { field: 'interpretation', trigger: 'synthetic', revision: 1 });
});

test('a person can clear an interpretation field, and their edit settles a waiting draft', async (t) => {
  const { db, userId, request, purposeId } = await fixture(t);
  db.transaction(() => revisePurposeInterpretation(db, userId, purposeId, { true_goal: 'Draft', territory: 'Ch 1', draft_status: 'failed' }, {
    actor: 'agent:interpreter', channel: 'synthetic', trigger: 'synthetic',
  }))();
  const { body } = await request('PATCH', `/api/purposes/${purposeId}`, { interpretation: { territory: null, true_goal: 'Mine' } });
  assert.equal(body.purpose.interpretation.territory, undefined);
  assert.equal(body.purpose.interpretation.true_goal, 'Mine');
  assert.equal(body.purpose.interpretation.draft_status, 'ready');
});

test('status only flips between active and archived, with nothing else attached', async (t) => {
  const { db, userId, courseId, request, purposeId } = await fixture(t);
  const active = () => listPurposes(db, userId, { project_id: courseId, status: 'active' }).map((purpose) => purpose.id);
  assert.deepEqual(active(), [purposeId]);
  await request('PATCH', `/api/purposes/${purposeId}`, { status: 'archived' });
  assert.deepEqual(active(), []);
  await request('PATCH', `/api/purposes/${purposeId}`, { status: 'active' });
  assert.deepEqual(active(), [purposeId]);
  assert.deepEqual(ledger(db, 'purpose_amended').map((event) => event.meta.fields), [['status'], ['status']]);

  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, { status: 'sealed' })).status, 400);
  db.prepare("UPDATE purposes SET status = 'sealed' WHERE id = ?").run(purposeId);
  const refused = await request('PATCH', `/api/purposes/${purposeId}`, { status: 'active' });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.details.code, 'purpose_status_transition_forbidden');
});

test('the amend route validates its body and answers only the owner', async (t) => {
  const { request, otherUserId, purposeId } = await fixture(t);
  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, {})).status, 400);
  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, { summary: 'only prose' })).status, 400);
  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, { note_id: 'x' })).status, 400);
  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, { interpretation: { draft_status: 'ready' } })).status, 400, 'bookkeeping is not a person\'s field');
  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, { interpretation: { true_goal: 'x' }, interpretation_locked: false })).status, 400);
  assert.equal((await request('PATCH', `/api/purposes/${purposeId}`, { title: 'x' }, otherUserId)).status, 404);
  assert.equal((await request('PATCH', '/api/purposes/missing', { title: 'x' })).status, 404);
});

// ---------------------------------------------------------------- redraft

test('redraft stores the stub draft under the machine name', async (t) => {
  const drafter: PurposeDrafter = async (purpose) => ({ true_goal: `Goal for ${purpose.title}` });
  const { db, request, purposeId } = await fixture(t, drafter);
  const { status, body } = await request('POST', `/api/purposes/${purposeId}/redraft`);
  assert.equal(status, 202);
  assert.equal(body.purpose.interpretation.draft_status, 'pending');
  await waitForScheduledPurposeDrafts();
  const { body: after } = await request('GET', `/api/purposes/${purposeId}`);
  assert.equal(after.purpose.interpretation.true_goal, 'Goal for Pass the exam');
  assert.equal(after.purpose.interpretation.draft_status, 'ready');
  assert.deepEqual(ledger(db, 'purpose_amended').map((event) => [event.actor_kind, event.meta.trigger]), [
    ['human', 'redraft_requested'],
    ['agent:interpreter', 'redraft'],
  ]);
});

test('redraft is refused on a locked card', async (t) => {
  let called = 0;
  const { request, purposeId } = await fixture(t, async () => { called += 1; return {}; });
  await request('PATCH', `/api/purposes/${purposeId}`, { interpretation_locked: true });
  const refused = await request('POST', `/api/purposes/${purposeId}/redraft`);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.details.code, 'purpose_interpretation_locked');
  await waitForScheduledPurposeDrafts();
  assert.equal(called, 0);
});

test('without a connected drafter the card reports failed and nothing else breaks', async (t) => {
  const { db, userId, request, purposeId } = await fixture(t);
  assert.equal((await request('POST', `/api/purposes/${purposeId}/redraft`)).status, 202);
  await waitForScheduledPurposeDrafts();
  assert.equal(getPurpose(db, userId, purposeId).interpretation.draft_status, 'failed');
});

test('a lock placed while a draft is running wins over the draft and over its failure', async (t) => {
  for (const outcome of ['returns', 'throws'] as const) {
    for (const lockedBy of ['edit', 'icon'] as const) {
      const label = `${outcome}, locked by ${lockedBy}`;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const { db, userId, request, purposeId } = await fixture(t, async () => {
        await gate;
        if (outcome === 'throws') throw new Error('synthetic draft failure');
        return { true_goal: 'Late machine words' };
      });
      await request('POST', `/api/purposes/${purposeId}/redraft`);
      assert.equal(getPurpose(db, userId, purposeId).interpretation.draft_status, 'pending', label);
      await request('PATCH', `/api/purposes/${purposeId}`,
        lockedBy === 'edit' ? { interpretation: { true_goal: 'Mine' } } : { interpretation_locked: true });
      assert.equal(getPurpose(db, userId, purposeId).interpretation.draft_status, 'ready', label);
      await new Promise((resolve) => setImmediate(resolve));
      release();
      await waitForScheduledPurposeDrafts();
      const purpose = getPurpose(db, userId, purposeId);
      assert.equal(purpose.interpretation.true_goal, lockedBy === 'edit' ? 'Mine' : undefined, label);
      assert.equal(purpose.interpretation.draft_status, 'ready', label);
      assert.equal(purpose.interpretation_locked, true, label);
    }
  }
});

test('locking a card with no draft under way writes no draft status', async (t) => {
  const { db, userId, purposeId } = await fixture(t);
  db.transaction(() => setPurposeLock(db, userId, purposeId, true))();
  assert.deepEqual(getPurpose(db, userId, purposeId).interpretation, {});
});

// ---------------------------------------------------------------- members

test('members accept the three kinds, repeat without duplicating, and stay within the owner', async (t) => {
  const { db, userId, otherUserId, courseId, purposeId } = await fixture(t);
  const item = createItem(db, userId, { plain_text: 'Item body' });
  const groupId = uuidv4();
  db.prepare("INSERT INTO content_groups (id,user_id,course_id,title,created_at,updated_at) VALUES (?,?,?,'Group','now','now')").run(groupId, userId, courseId);
  const sourceId = uuidv4();
  db.prepare("INSERT INTO source_records (id,user_id,display_name,origin_entry_kind,created_at,updated_at) VALUES (?,?,'Source','project_upload','now','now')").run(sourceId, userId);

  const add = (input: Parameters<typeof addPurposeMember>[3], owner = userId) => db.transaction(() => addPurposeMember(db, owner, purposeId, input))();
  const first = add({ member_kind: 'source', member_id: sourceId, metadata: { attached_by: 'importer', nature: 'hypothesis' } });
  assert.equal(first.created, true);
  assert.deepEqual(first.member.metadata, { attached_by: 'importer', nature: 'hypothesis' });
  assert.equal(first.member.fitness, 'unknown', 'fitness is untouched');
  assert.equal(add({ member_kind: 'item', member_id: item.id }).member.order_index, 1);
  assert.equal(add({ member_kind: 'content_group', member_id: groupId }).member.order_index, 2);

  const again = add({ member_kind: 'source', member_id: sourceId, metadata: { attached_by: 'someone-else' } });
  assert.equal(again.created, false);
  assert.equal(again.member.id, first.member.id);
  assert.deepEqual(again.member.metadata, first.member.metadata, 'the first provenance stands');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM purpose_members').get() as { n: number }).n, 3);

  assert.deepEqual(purposeMemberKindSchema.options, ['content_group', 'item', 'source']);
  assert.throws(() => add({ member_kind: 'note' as never, member_id: 'x' }), /invalid_enum_value|Invalid enum/);
  assert.throws(() => add({ member_kind: 'item', member_id: uuidv4() }), (error: any) => error.statusCode === 404);
  assert.throws(() => add({ member_kind: 'item', member_id: item.id }, otherUserId), (error: any) => error.statusCode === 404);
});

// ---------------------------------------------------------------- rating

test('rating writes the card, the activity row and one complete ledger entry', async (t) => {
  const { db, userId, cardId, deckId, courseId, request } = await fixture(t);
  const { status, body } = await request('POST', `/api/review/${cardId}/rate`, { rating: 3 });
  assert.equal(status, 200);
  assert.equal(body.review_log.rating, 3);
  assert.equal(body.card.fsrs_reps, 1);
  const [event] = ledger(db, 'card_reviewed');
  assert.equal(event.actor_kind, 'human');
  assert.equal(event.channel, 'POST /api/review/:cardId/rate');
  assert.deepEqual(event.objects, [{ kind: 'card', id: cardId }, { kind: 'deck', id: deckId }, { kind: 'course', id: courseId }]);
  assert.equal(event.meta.rating, 3);
  assert.equal(event.meta.before.reps, 0);
  assert.equal(event.meta.reps, 1);
  assert.equal(event.meta.stability, body.card.fsrs_stability);
  assert.equal(event.meta.difficulty, body.card.fsrs_difficulty);
  assert.equal(event.meta.next_review, body.card.fsrs_next_review);
  assert.equal(typeof event.meta.state, 'number');
  assert.equal(typeof event.meta.elapsed_days, 'number');
  assert.ok(Date.parse(event.meta.review_ts));
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM study_activity_log WHERE user_id = ? AND activity_type = 'card_reviewed'").get(userId) as { n: number }).n, 1);

  const second = await request('POST', `/api/review/${cardId}/rate`, { rating: 1 });
  assert.equal(second.status, 200);
  const later = ledger(db, 'card_reviewed')[1];
  assert.equal(later.meta.rating, 1, 'Again is carried by the same word');
  assert.equal(later.meta.before.reps, 1);
  assert.equal(later.meta.before.stability, event.meta.stability);
});

test('the three rating writes commit or fail together', async (t) => {
  const { db, cardId, request } = await fixture(t);
  const state = () => ({
    card: (db.prepare('SELECT fsrs_reps FROM cards WHERE id = ?').get(cardId) as { fsrs_reps: number }).fsrs_reps,
    activity: (db.prepare('SELECT COUNT(*) AS n FROM study_activity_log').get() as { n: number }).n,
    events: ledger(db, 'card_reviewed').length,
  });
  const before = state();
  for (const [name, table] of [['fail_activity', 'study_activity_log'], ['fail_event', 'events']] as const) {
    db.exec(`CREATE TRIGGER ${name} BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'synthetic_failure'); END`);
    assert.equal((await request('POST', `/api/review/${cardId}/rate`, { rating: 3 })).status, 500, name);
    assert.deepEqual(state(), before, name);
    db.exec(`DROP TRIGGER ${name}`);
  }
  assert.equal((await request('POST', `/api/review/${cardId}/rate`, { rating: 3 })).status, 200);
  assert.deepEqual(state(), { card: 1, activity: 1, events: 1 });
});

test('rating another user\'s card changes nothing', async (t) => {
  const { db, cardId, otherUserId, request } = await fixture(t);
  assert.equal((await request('POST', `/api/review/${cardId}/rate`, { rating: 3 }, otherUserId)).status, 404);
  assert.equal(ledger(db, 'card_reviewed').length, 0);
  assert.equal((db.prepare('SELECT fsrs_reps FROM cards WHERE id = ?').get(cardId) as { fsrs_reps: number }).fsrs_reps, 0);
});

// ---------------------------------------------------------------- items

test('editing and retiring an item are recorded; a refused edit is not', async (t) => {
  const { db, userId, request } = await fixture(t);
  const item = createItem(db, userId, { plain_text: 'Body' });
  assert.equal((await request('PUT', `/api/items/${item.id}`, { plain_text: 'New body' })).status, 200);
  assert.equal((await request('POST', `/api/items/${item.id}/retire`, {})).status, 200);
  assert.equal((await request('PUT', `/api/items/${item.id}`, { plain_text: 'After retire' })).status, 409);
  const events = ledger(db, 'item_edited');
  assert.deepEqual(events.map((event) => [event.actor_kind, event.channel, event.meta.action]), [
    ['human', 'PUT /api/items/:itemId', 'update'],
    ['human', 'POST /api/items/:itemId/retire', 'retire'],
  ]);
  assert.deepEqual(events[0].objects, [{ kind: 'item', id: item.id }]);
  assert.deepEqual(events[0].meta.fields, ['plain_text']);
});

test('an item reference block cites its item once, on both creation paths', async (t) => {
  const { db, userId, noteId, request } = await fixture(t);
  const item = createItem(db, userId, { plain_text: 'Cited' });
  const direct = await request('POST', `/api/notes/${noteId}/blocks`, { block_type: 'item_ref', content_json: { item_id: item.id } });
  assert.equal(direct.status, 201);
  const payload = { block_type: 'item_ref', content_json: { item_id: item.id }, client_create_key: 'synthetic-key-1' };
  assert.equal((await request('POST', `/api/notes/${noteId}/blocks`, payload)).status, 201);
  assert.equal((await request('POST', `/api/notes/${noteId}/blocks`, payload)).status, 200, 'a replay');
  const events = ledger(db, 'item_cited');
  assert.equal(events.length, 2, 'the replayed key does not cite again');
  assert.deepEqual(events[0].objects.slice(0, 2), [{ kind: 'item', id: item.id }, { kind: 'note', id: noteId }]);
  assert.equal(events[0].objects[2].id, direct.body.id);
  assert.equal(events[0].meta.via, 'item_ref');

  await request('POST', `/api/notes/${noteId}/blocks`, { block_type: 'paragraph', plain_text: 'plain' });
  assert.equal(ledger(db, 'item_cited').length, 2, 'other blocks cite nothing');
});

test('saving a group cites only items new to it', async (t) => {
  const { db, userId, courseId, noteId, request } = await fixture(t);
  const first = createItem(db, userId, { plain_text: 'First' });
  const second = createItem(db, userId, { plain_text: 'Second' });
  const member = (id: string, itemId: string) => ({ id, kind: 'item', item_id: itemId });
  const created = await request('POST', '/api/content-groups', { course_id: courseId, title: 'Group', members: [member('m1', first.id)] });
  assert.equal(created.status, 201);
  const groupId = created.body.id;
  const cited = () => ledger(db, 'item_cited').map((event) => event.objects[0].id);
  assert.deepEqual(cited(), [first.id]);
  assert.deepEqual(ledger(db, 'item_cited')[0].objects[1], { kind: 'content_group', id: groupId });

  const save = (members: unknown[]) => request('PUT', `/api/content-groups/${groupId}`, { course_id: courseId, title: 'Group', members });
  assert.equal((await save([member('m1', first.id)])).status, 200);
  assert.deepEqual(cited(), [first.id], 'saving again adds nothing');
  await save([member('m1-renamed', first.id)]);
  assert.deepEqual(cited(), [first.id], 'a new member row for the same item is not a new citation');
  await save([member('m1-renamed', first.id), member('m2', second.id)]);
  assert.deepEqual(cited(), [first.id, second.id]);
  await save([{ id: 'loose', kind: 'note_block', target_id: 'block' }, member('m2', second.id)]);
  assert.deepEqual(cited(), [first.id, second.id], 'removing and non-item members cite nothing');

  const byNote = await request('PUT', `/api/content-groups/by-note/${noteId}`, {
    groups: [{ id: 'note-group', course_id: courseId, note_id: noteId, title: 'Note group', members: [member('m3', first.id)] }],
  });
  assert.equal(byNote.status, 200, JSON.stringify(byNote.body));
  assert.deepEqual(cited(), [first.id, second.id, first.id], 'the first citation in a different group');
  assert.equal(ledger(db, 'item_cited')[2].channel, 'PUT /api/content-groups/by-note/:noteId');
});

test('moving legacy metadata records nothing, and later real edits cite against it', async (t) => {
  const { db, userId, courseId, noteId, request } = await fixture(t);
  const legacy = createItem(db, userId, { plain_text: 'Legacy', created_by: 'ai_proposal' });
  const added = createItem(db, userId, { plain_text: 'Added' });
  const group = (members: unknown[]) => ({ id: 'legacy-group', course_id: courseId, note_id: noteId, title: 'Legacy', members });
  const member = (id: string, itemId: string) => ({ id, kind: 'item', item_id: itemId });
  const moved = await request('POST', '/api/content-groups/import-note-metadata', {
    note_id: noteId, groups: [group([member('legacy-member', legacy.id)])],
  });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM content_group_members WHERE item_id = ?').get(legacy.id) as { n: number }).n, 1, 'the move still happens');
  assert.equal(ledger(db, 'item_cited').length, 0);

  await request('PUT', '/api/content-groups/legacy-group', group([member('legacy-member', legacy.id)]));
  assert.equal(ledger(db, 'item_cited').length, 0, 'the moved row is the baseline');
  await request('PUT', '/api/content-groups/legacy-group', group([member('legacy-member', legacy.id), member('new-member', added.id)]));
  assert.deepEqual(ledger(db, 'item_cited').map((event) => event.objects[0].id), [added.id]);
});

test('casting cites the item once, and the group save that follows does not repeat it', async (t) => {
  const { db, userId, courseId, noteId, request } = await fixture(t);
  const created = await request('POST', '/api/content-groups', { course_id: courseId, note_id: noteId, title: 'Group', members: [] });
  const groupId = created.body.id;
  const block = await request('POST', `/api/notes/${noteId}/blocks`, { block_type: 'paragraph', plain_text: 'Excerpt' });
  const anchor = await request('POST', '/api/items/anchors', {
    pool_scope_kind: 'content_group', pool_scope_id: groupId, target_kind: 'block', target_id: block.body.id, excerpt: 'Excerpt',
  });
  assert.equal(anchor.status, 201, JSON.stringify(anchor.body));
  const cast = await request('POST', '/api/items/cast', {
    anchor_ids: [anchor.body.id], plain_text: 'Cast body', created_by: 'human', claimed_by: 'human',
  });
  assert.equal(cast.status, 201, JSON.stringify(cast.body));
  const events = ledger(db, 'item_cited');
  assert.equal(events.length, 1);
  assert.equal(events[0].actor_kind, 'human');
  assert.equal(events[0].channel, 'POST /api/items/cast');
  assert.deepEqual(events[0].objects, [{ kind: 'item', id: cast.body.id }, { kind: 'content_group', id: groupId }]);
  assert.deepEqual(events[0].meta, { via: 'cast' });

  // The panel follows a cast with a roster save under a new member id.
  const saved = await request('PUT', `/api/content-groups/${groupId}`, {
    course_id: courseId, note_id: noteId, title: 'Group', members: [{ id: 'panel-member', kind: 'item', item_id: cast.body.id }],
  });
  assert.equal(saved.status, 200);
  assert.equal(ledger(db, 'item_cited').length, 1);
  assert.equal(listEventsForObjects(db, userId, [{ kind: 'item', id: cast.body.id }], { verbs: ['item_cited'] }).length, 1);

  const refused = await request('POST', '/api/items/cast', { anchor_ids: [anchor.body.id], plain_text: 'Again' });
  assert.ok(refused.status >= 400, 'a claimed anchor cannot be cast again');
  assert.equal(ledger(db, 'item_cited').length, 1);
});

// ---------------------------------------------------------------- reader

test('the ledger reader matches objects, filters, pages and stays within the owner', async (t) => {
  const { db, userId, otherUserId, purposeId, request } = await fixture(t);
  const item = createItem(db, userId, { plain_text: 'Body' });
  await request('PUT', `/api/items/${item.id}`, { plain_text: 'One' });
  await request('PUT', `/api/items/${item.id}`, { plain_text: 'Two' });
  await request('PATCH', `/api/purposes/${purposeId}`, { title: 'Renamed' });

  const refs = [{ kind: 'item', id: item.id }, { kind: 'purpose', id: purposeId }];
  const all = listEventsForObjects(db, userId, refs);
  assert.deepEqual(all.map((event) => event.verb), ['purpose_amended', 'item_edited', 'item_edited']);
  assert.ok(all[0].seq > all[1].seq);
  assert.deepEqual(all[0].objects, [{ kind: 'purpose', id: purposeId }]);
  assert.deepEqual(all[0].meta, { fields: ['title'], lock: null });

  assert.equal(listEventsForObjects(db, userId, refs, { verbs: ['item_edited'] }).length, 2);
  assert.equal(listEventsForObjects(db, userId, refs, { limit: 1 }).length, 1);
  assert.deepEqual(listEventsForObjects(db, userId, refs, { beforeSeq: all[1].seq }).map((event) => event.seq), [all[2].seq]);
  assert.deepEqual(listEventsForObjects(db, userId, []), []);
  assert.deepEqual(listEventsForObjects(db, userId, refs, { verbs: [] }), []);
  assert.deepEqual(listEventsForObjects(db, otherUserId, refs), []);
  assert.deepEqual(listEventsForObjects(db, userId, [{ kind: 'note', id: item.id }]), [], 'the kind has to match too');
  const before = db.prepare('SELECT COUNT(*) AS n FROM events').get();
  listEventsForObjects(db, userId, refs);
  assert.deepEqual(db.prepare('SELECT COUNT(*) AS n FROM events').get(), before);
});
