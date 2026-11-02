import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createPurposeRouter } from '../routes/purposes.js';
import sourceRoutes from '../routes/sources.js';
import { capturePurposeForIntake, type PurposeCaptureOptions } from '../services/purposeCapture.js';
import {
  createProviderPurposeDrafter,
  providerPurposeDrafter,
  resumePurposeDrafts,
  waitForScheduledPurposeDrafts,
  type PurposeDrafter,
} from '../services/purposeDrafting.js';
import { createPurpose, getPurpose, listPurposes } from '../services/purposes.js';
import { intakeSourceTempFile, precheckSourceHash } from '../services/sourceFileIntake.js';
import { ensureHomeCourse } from '../services/systemCourses.js';

type Db = Awaited<ReturnType<typeof initDb>>;

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries: Array<[string, string]>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const nameBytes = Buffer.from(name);
    const body = Buffer.from(text);
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

interface Fixture {
  db: Db;
  userId: string;
  courseId: string;
  otherCourseId: string;
  rootDir: string;
  drafted: string[];
  capture: PurposeCaptureOptions;
  upload: (name: string, body: string | Buffer, options?: { courseId?: string; kind?: 'project_upload' | 'library_upload'; capture?: PurposeCaptureOptions; failRename?: boolean }) => Promise<string>;
  cards: (courseId?: string) => ReturnType<typeof listPurposes>;
  members: (purposeId: string) => Array<Record<string, any>>;
  events: (verb?: string) => Array<Record<string, any>>;
}

async function fixture(t: TestContext, drafter?: PurposeDrafter): Promise<Fixture> {
  const db = await initDb(':memory:');
  const userId = uuidv4();
  const courseId = uuidv4();
  const otherCourseId = uuidv4();
  const rootDir = mkdtempSync(join(tmpdir(), 'coincides-capture-'));
  mkdirSync(join(rootDir, '.tmp'), { recursive: true });
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(userId, `${userId}@example.test`);
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Economics')").run(courseId, userId);
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'History')").run(otherCourseId, userId);
  t.after(async () => {
    await waitForScheduledPurposeDrafts();
    closeDb();
    rmSync(rootDir, { recursive: true, force: true });
  });
  const drafted: string[] = [];
  const capture: PurposeCaptureOptions = {
    channel: 'POST /api/sources/upload',
    drafter: drafter ?? (async (purpose) => {
      drafted.push(purpose.id);
      return { true_goal: `Goal for ${purpose.title}` };
    }),
  };
  return {
    db, userId, courseId, otherCourseId, rootDir, drafted, capture,
    upload: async (name, body, options = {}) => {
      const path = join(rootDir, '.tmp', `${uuidv4()}.upload`);
      const bytes = Buffer.from(body);
      writeFileSync(path, bytes);
      const kind = options.kind ?? 'project_upload';
      const result = await intakeSourceTempFile(db, userId, {
        course_id: kind === 'library_upload' ? undefined : options.courseId ?? courseId,
        origin_entry_kind: kind,
        file: { path, originalname: name, mimetype: name.endsWith('.zip') ? 'application/zip' : 'text/plain', size: bytes.length },
      }, {
        rootDir,
        purposeCapture: options.capture ?? capture,
        ...(options.failRename ? { renameFile: () => { throw new Error('synthetic rename failure'); } } : {}),
      });
      return result.source.id;
    },
    cards: (target = courseId) => listPurposes(db, userId, { project_id: target, status: 'all' }),
    members: (purposeId) => (db.prepare('SELECT * FROM purpose_members WHERE purpose_id = ? ORDER BY order_index').all(purposeId) as Array<Record<string, any>>)
      .map((row) => ({ ...row, metadata: JSON.parse(row.metadata) })),
    events: (verb) => (db.prepare(`SELECT * FROM events ${verb ? 'WHERE verb = ?' : ''} ORDER BY seq`).all(...(verb ? [verb] : [])) as Array<Record<string, any>>)
      .map((row) => ({ ...row, objects: JSON.parse(row.objects), meta: JSON.parse(row.meta) })),
  };
}

const existingCard = (db: Db, userId: string, courseId: string, title = 'My reason') =>
  db.transaction(() => createPurpose(db, userId, { title, project_id: courseId }))();

// ---------------------------------------------------------------- the three rules

test('a Project with no purpose gets an importer card asking nothing, and its draft follows', async (t) => {
  const f = await fixture(t);
  const sourceId = await f.upload('宏观经济学 期末.txt', 'Body one');
  const [card] = f.cards();
  assert.equal(f.cards().length, 1);
  assert.equal(card.title, '研读《宏观经济学 期末》');
  assert.equal(card.created_by, 'importer');
  assert.equal(card.user_verbatim, null, 'the machine never writes the original words');
  assert.equal(card.status, 'active');
  assert.deepEqual(card.interpretation, { draft_status: 'pending' });

  const members = f.members(card.id);
  assert.equal(members.length, 1);
  assert.equal(members[0].member_kind, 'source');
  assert.equal(members[0].member_id, sourceId);
  assert.deepEqual(members[0].metadata, { attached_by: 'importer', nature: 'hypothesis' });

  const [anchor] = f.events('purpose_created');
  assert.equal(anchor.actor_kind, 'human');
  assert.equal(anchor.channel, 'POST /api/sources/upload');
  assert.deepEqual(anchor.meta, { via: 'intake', source_record_id: sourceId });
  assert.deepEqual(anchor.objects[0], { kind: 'purpose', id: card.id });

  await waitForScheduledPurposeDrafts();
  const drafted = getPurpose(f.db, f.userId, card.id);
  assert.equal(drafted.interpretation.draft_status, 'ready');
  assert.equal(drafted.interpretation.true_goal, `Goal for ${card.title}`);
  assert.equal(drafted.interpretation.drafted_by, 'agent:interpreter');
  const [revision] = f.events('purpose_amended');
  assert.equal(revision.actor_kind, 'agent:interpreter');
  assert.equal(revision.channel, 'POST /api/sources/upload');
  assert.equal(revision.meta.field, 'interpretation');
  assert.equal(revision.meta.trigger, 'intake_draft');
});

test('exactly one active purpose takes the file with no new card and no event', async (t) => {
  const f = await fixture(t);
  const mine = existingCard(f.db, f.userId, f.courseId);
  const sourceId = await f.upload('notes.txt', 'Body');
  assert.equal(f.cards().length, 1);
  assert.deepEqual(f.members(mine.id).map((member) => [member.member_id, member.metadata]), [
    [sourceId, { attached_by: 'importer', nature: 'hypothesis' }],
  ]);
  assert.deepEqual(f.events(), [], 'the member metadata is the trace');
  await waitForScheduledPurposeDrafts();
  assert.deepEqual(f.drafted, []);
  assert.deepEqual(getPurpose(f.db, f.userId, mine.id).interpretation, {}, 'a person\'s card is not drafted over');
});

test('several active purposes are not guessed among: a new card opens', async (t) => {
  const f = await fixture(t);
  const first = existingCard(f.db, f.userId, f.courseId, 'First');
  const second = existingCard(f.db, f.userId, f.courseId, 'Second');
  await f.upload('notes.txt', 'Body');
  assert.equal(f.cards().length, 3);
  assert.deepEqual(f.members(first.id), []);
  assert.deepEqual(f.members(second.id), []);
});

test('a retired note-bound purpose does not count as a card for the Project', async (t) => {
  const f = await fixture(t);
  const noteId = uuidv4();
  f.db.prepare("INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,'Note')").run(noteId, f.userId, f.courseId);
  f.db.exec('DROP TRIGGER purposes_note_writer_retired_insert');
  f.db.prepare(`INSERT INTO purposes (id,user_id,course_id,note_id,title,created_at,updated_at)
    VALUES ('legacy-soul',?,?,?,'Legacy','now','now')`).run(f.userId, f.courseId, noteId);
  await f.upload('notes.txt', 'Body');
  assert.deepEqual(f.members('legacy-soul'), []);
  assert.equal(f.cards().filter((card) => card.created_by === 'importer').length, 1);
});

test('the merge window gathers a burst, only into an active importer card, and expires', async (t) => {
  const f = await fixture(t);
  existingCard(f.db, f.userId, f.courseId, 'First');
  existingCard(f.db, f.userId, f.courseId, 'Second');
  const a = await f.upload('a.txt', 'Body a');
  const b = await f.upload('b.txt', 'Body b');
  const importers = () => f.cards().filter((card) => card.created_by === 'importer');
  assert.equal(importers().length, 1, 'inside the window');
  assert.deepEqual(f.members(importers()[0].id).map((member) => member.member_id), [a, b]);
  assert.equal(f.events('purpose_created').length, 1);

  // Put away: an archived card takes nothing, even inside the window.
  f.db.prepare("UPDATE purposes SET status = 'archived' WHERE id = ?").run(importers()[0].id);
  await f.upload('c.txt', 'Body c');
  assert.equal(importers().length, 2);
  const open = importers().find((card) => card.status === 'active')!;

  // Old enough: the window has closed.
  f.db.prepare('UPDATE purposes SET created_at = ? WHERE id = ?').run(new Date(Date.now() - 11 * 60 * 1000).toISOString(), open.id);
  await f.upload('d.txt', 'Body d');
  assert.equal(importers().length, 3);
  const inside = new Date(Date.now() - 9 * 60 * 1000).toISOString();
  const newest = importers().filter((card) => card.status === 'active').find((card) => card.id !== open.id)!;
  f.db.prepare('UPDATE purposes SET created_at = ? WHERE id = ?').run(inside, newest.id);
  await f.upload('e.txt', 'Body e');
  assert.equal(importers().length, 3, 'nine minutes is still inside');
});

test('an untouched importer card stops attracting once its window closes', async (t) => {
  const f = await fixture(t);
  const a = await f.upload('a.txt', 'Body a');
  const b = await f.upload('b.txt', 'Body b');
  const [card] = f.cards();
  assert.equal(f.cards().length, 1, 'inside the window it gathers');
  assert.deepEqual(f.members(card.id).map((member) => member.member_id), [a, b]);

  f.db.prepare('UPDATE purposes SET created_at = ? WHERE id = ?').run(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), card.id);
  const later = await f.upload('a-week-later.txt', 'Body later');
  assert.equal(f.cards().length, 2, 'a week later it opens a new card');
  assert.deepEqual(f.members(card.id).map((member) => member.member_id), [a, b]);
  const fresh = f.cards().find((entry) => entry.id !== card.id)!;
  assert.deepEqual(f.members(fresh.id).map((member) => member.member_id), [later]);
});

test('a person\'s card beats an untouched importer card sitting beside it', async (t) => {
  const f = await fixture(t);
  const staleImporter = await f.upload('old.txt', 'Body old');
  const importerCard = f.cards()[0];
  f.db.prepare('UPDATE purposes SET created_at = ? WHERE id = ?').run(new Date(Date.now() - 60 * 60 * 1000).toISOString(), importerCard.id);
  const mine = existingCard(f.db, f.userId, f.courseId);
  const sourceId = await f.upload('new.txt', 'Body new');
  assert.deepEqual(f.members(mine.id).map((member) => member.member_id), [sourceId]);
  assert.deepEqual(f.members(importerCard.id).map((member) => member.member_id), [staleImporter]);
  assert.equal(f.cards().length, 2);

  // Also inside the window: the person's card is the one stated reason.
  f.db.prepare('UPDATE purposes SET created_at = ? WHERE id = ?').run(new Date().toISOString(), importerCard.id);
  const second = await f.upload('newer.txt', 'Body newer');
  assert.deepEqual(f.members(mine.id).map((member) => member.member_id), [sourceId, second]);
});

test('an importer card a person has adopted attracts like any card of theirs', async (t) => {
  for (const adopt of [
    (db: Db, id: string) => db.prepare("UPDATE purposes SET user_verbatim = '我要考过' WHERE id = ?").run(id),
    (db: Db, id: string) => db.prepare('UPDATE purposes SET interpretation_locked = 1 WHERE id = ?').run(id),
  ]) {
    const f = await fixture(t);
    await f.upload('first.txt', 'Body first');
    const [card] = f.cards();
    f.db.prepare('UPDATE purposes SET created_at = ? WHERE id = ?').run(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), card.id);
    adopt(f.db, card.id);
    await f.upload('later.txt', 'Body later');
    assert.equal(f.cards().length, 1);
    assert.equal(f.members(card.id).length, 2);
  }
});

test('a zip\'s draft sees every entry', async (t) => {
  const seen: string[][] = [];
  const f = await fixture(t, async (purpose, { db }) => {
    seen.push((db.prepare("SELECT member_id FROM purpose_members WHERE purpose_id = ? AND member_kind = 'source'").all(purpose.id) as Array<{ member_id: string }>).map((row) => row.member_id));
    return { true_goal: 'Goal' };
  });
  const entries = Array.from({ length: 12 }, (_, index): [string, string] => [`entry-${index}.txt`, `Entry body ${index}`]);
  await f.upload('pack.zip', storedZip(entries));
  await waitForScheduledPurposeDrafts();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].length, 13, 'the zip and all twelve entries');
});

test('a zip that cannot expand keeps its card and still gets a draft', async (t) => {
  const f = await fixture(t);
  await f.upload('broken.zip', Buffer.from('not really a zip')).catch(() => undefined);
  await waitForScheduledPurposeDrafts();
  const cards = f.cards();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].interpretation.draft_status, 'ready');
  assert.equal(f.drafted.length, 1);
});

test('a zip makes one card, named for the zip, holding the zip and every entry', async (t) => {
  const f = await fixture(t);
  const zipId = await f.upload('期中资料.zip', storedZip([['one.txt', 'Entry one'], ['two.txt', 'Entry two'], ['three.txt', 'Entry three']]));
  const cards = f.cards();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, '研读《期中资料》');
  const members = f.members(cards[0].id);
  assert.equal(members.length, 4);
  assert.equal(members[0].member_id, zipId);
  assert.ok(members.every((member) => member.member_kind === 'source'));
  await waitForScheduledPurposeDrafts();
  assert.equal(f.drafted.length, 1, 'one card, one model call');
});

// ---------------------------------------------------------------- the three doors

test('the library shelf opens no card and attaches to nothing', async (t) => {
  const f = await fixture(t);
  const homeId = f.db.transaction(() => ensureHomeCourse(f.db, f.userId))().id;
  existingCard(f.db, f.userId, homeId, 'A purpose on Home');
  const sourceId = await f.upload('shelf.txt', 'Body', { kind: 'library_upload' });
  assert.equal(f.cards(homeId).length, 1);
  assert.deepEqual(f.db.prepare('SELECT * FROM purpose_members WHERE member_id = ?').all(sourceId), []);
  assert.deepEqual(f.events(), []);
  await waitForScheduledPurposeDrafts();
  assert.deepEqual(f.drafted, []);

  // Decided by where it lands, not by the entry-kind word.
  const direct = await f.upload('home-direct.txt', 'Other body', { courseId: homeId });
  assert.deepEqual(f.db.prepare('SELECT * FROM purpose_members WHERE member_id = ?').all(direct), []);
});

test('a duplicate upload captures in the new Project, and repeating it captures nothing', async (t) => {
  const f = await fixture(t);
  const first = await f.upload('same.txt', 'Same body');
  const again = await f.upload('same.txt', 'Same body');
  assert.equal(again, first);
  assert.equal(f.cards().length, 1, 'same Project: already on its card');
  assert.equal(f.members(f.cards()[0].id).length, 1);

  const inOther = await f.upload('same.txt', 'Same body', { courseId: f.otherCourseId });
  assert.equal(inOther, first);
  const [card] = f.cards(f.otherCourseId);
  assert.equal(card.created_by, 'importer');
  assert.deepEqual(f.members(card.id).map((member) => member.member_id), [first]);
  await f.upload('same.txt', 'Same body', { courseId: f.otherCourseId });
  assert.equal(f.cards(f.otherCourseId).length, 1);

  // A card put away stays away when the file comes again.
  f.db.prepare("UPDATE purposes SET status = 'archived' WHERE id = ?").run(card.id);
  await f.upload('same.txt', 'Same body', { courseId: f.otherCourseId });
  assert.deepEqual(f.cards(f.otherCourseId).map((entry) => entry.status), ['archived']);
});

test('precheck captures only when it creates the placement', async (t) => {
  const f = await fixture(t);
  const sourceId = await f.upload('same.txt', 'Same body');
  const content_hash = createHash('sha256').update('Same body').digest('hex');
  const capture = { ...f.capture, channel: 'POST /api/sources/precheck' };
  const miss = precheckSourceHash(f.db, f.userId, { course_id: f.otherCourseId, content_hash: 'a'.repeat(64) }, { rootDir: f.rootDir, purposeCapture: capture });
  assert.equal(miss.exists, false);
  assert.deepEqual(f.cards(f.otherCourseId), []);

  const hit = precheckSourceHash(f.db, f.userId, { course_id: f.otherCourseId, content_hash }, { rootDir: f.rootDir, purposeCapture: capture });
  assert.equal(hit.placement_created, true);
  const [card] = f.cards(f.otherCourseId);
  assert.deepEqual(f.members(card.id).map((member) => member.member_id), [sourceId]);
  assert.equal(f.events('purpose_created').at(-1)!.channel, 'POST /api/sources/precheck');

  const repeat = precheckSourceHash(f.db, f.userId, { course_id: f.otherCourseId, content_hash }, { rootDir: f.rootDir, purposeCapture: capture });
  assert.equal(repeat.placement_created, false);
  assert.equal(f.cards(f.otherCourseId).length, 1);
  assert.equal(f.members(card.id).length, 1);
  assert.equal(f.events('purpose_created').length, 2);
});

test('a failed rename leaves no card, no member and no event', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.upload('broken.txt', 'Body', { failRename: true }));
  assert.deepEqual(f.cards(), []);
  assert.deepEqual(f.db.prepare('SELECT * FROM purpose_members').all(), []);
  assert.deepEqual(f.events(), []);
});

test('an intake without the route option captures nothing', async (t) => {
  const f = await fixture(t);
  const path = join(f.rootDir, '.tmp', 'plain.upload');
  writeFileSync(path, 'Quiet body');
  await intakeSourceTempFile(f.db, f.userId, {
    course_id: f.courseId, origin_entry_kind: 'project_upload',
    file: { path, originalname: 'quiet.txt', mimetype: 'text/plain', size: 10 },
  }, { rootDir: f.rootDir });
  assert.deepEqual(f.cards(), []);
});

test('both real routes pass their own channel', async (t) => {
  const f = await fixture(t);
  const previous = process.env.SOURCE_BLOB_DIR;
  process.env.SOURCE_BLOB_DIR = f.rootDir;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = f.userId; next(); });
  app.use('/api/sources', sourceRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.SOURCE_BLOB_DIR;
    else process.env.SOURCE_BLOB_DIR = previous;
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources`;
  const form = new FormData();
  form.set('file', new Blob(['Route body'], { type: 'text/plain' }), 'route.txt');
  form.set('course_id', f.courseId);
  assert.equal((await fetch(`${base}/upload`, { method: 'POST', body: form })).status, 201);
  assert.equal(f.events('purpose_created')[0].channel, 'POST /api/sources/upload');

  const response = await fetch(`${base}/precheck`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ course_id: f.otherCourseId, content_hash: createHash('sha256').update('Route body').digest('hex') }),
  });
  assert.equal(response.status, 200);
  assert.equal(f.events('purpose_created')[1].channel, 'POST /api/sources/precheck');

  // These routes use the real drafter, which the test guard stops before any model.
  await waitForScheduledPurposeDrafts();
  assert.deepEqual(f.cards().map((card) => card.interpretation.draft_status), ['failed']);
});

// ---------------------------------------------------------------- all or nothing

test('the card, the member and the event commit or fail together', async (t) => {
  const f = await fixture(t);
  const sourceId = await f.upload('plain.txt', 'Body', { kind: 'library_upload' });
  const state = () => ({
    cards: f.db.prepare('SELECT COUNT(*) AS n FROM purposes').get(),
    members: f.db.prepare('SELECT COUNT(*) AS n FROM purpose_members').get(),
    events: f.db.prepare('SELECT COUNT(*) AS n FROM events').get(),
  });
  const before = state();
  for (const [name, table] of [['fail_member', 'purpose_members'], ['fail_event', 'events']] as const) {
    f.db.exec(`CREATE TRIGGER ${name} BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'synthetic_failure'); END`);
    assert.throws(() => capturePurposeForIntake(f.db, f.userId, { courseId: f.courseId, sourceRecordId: sourceId }, f.capture), /synthetic_failure/, name);
    assert.deepEqual(state(), before, name);
    f.db.exec(`DROP TRIGGER ${name}`);
  }
  await waitForScheduledPurposeDrafts();
  assert.deepEqual(f.drafted, [], 'a rolled-back capture schedules no draft');
  assert.equal(capturePurposeForIntake(f.db, f.userId, { courseId: f.courseId, sourceRecordId: sourceId }, f.capture).outcome, 'created');
});

test('a capture failure does not fail the import', async (t) => {
  const f = await fixture(t);
  f.db.exec("CREATE TRIGGER fail_member BEFORE INSERT ON purpose_members BEGIN SELECT RAISE(ABORT, 'synthetic_failure'); END");
  const sourceId = await f.upload('kept.txt', 'Body');
  assert.ok(f.db.prepare('SELECT 1 FROM source_records WHERE id = ?').get(sourceId));
  assert.deepEqual(f.cards(), []);
});

// ---------------------------------------------------------------- drafting

test('a failed draft marks the card and blocks nothing', async (t) => {
  const f = await fixture(t, async () => { throw new Error('synthetic provider failure'); });
  const sourceId = await f.upload('notes.txt', 'Body');
  assert.ok(f.db.prepare('SELECT 1 FROM source_records WHERE id = ?').get(sourceId));
  await waitForScheduledPurposeDrafts();
  const [card] = f.cards();
  assert.equal(card.interpretation.draft_status, 'failed');
  assert.deepEqual(f.events('purpose_amended'), []);
});

function stubProvider(chunks: Array<Record<string, unknown>>, seen?: Array<{ messages: any[]; tools: unknown[]; prompt: string; signal?: AbortSignal }>) {
  return {
    async *chat(messages: any[], tools: unknown[], prompt: string, options?: { signal?: AbortSignal }) {
      seen?.push({ messages, tools, prompt, signal: options?.signal });
      for (const chunk of chunks) yield chunk;
    },
  } as never;
}

test('the real drafter sends a short brief with no tools and takes back only the known fields', async (t) => {
  const seen: Array<{ messages: any[]; tools: unknown[]; prompt: string; signal?: AbortSignal }> = [];
  const reply = '```json\n{"true_goal": " 期末复习 ", "territory": "宏观", "smuggled": "ignored", "behavior_pattern": 7}\n```';
  const drafter = createProviderPurposeDrafter(() => stubProvider([{ type: 'text', text: reply }, { type: 'done' }], seen));
  const f = await fixture(t, drafter);
  existingCard(f.db, f.userId, f.courseId, 'First');
  existingCard(f.db, f.userId, f.courseId, 'Second');
  await f.upload('宏观.pdf.txt', 'Body');
  await waitForScheduledPurposeDrafts();
  const card = f.cards().find((entry) => entry.created_by === 'importer')!;
  assert.equal(card.interpretation.true_goal, '期末复习');
  assert.equal(card.interpretation.territory, '宏观');
  assert.equal(card.interpretation.behavior_pattern, undefined);
  assert.equal(card.interpretation.smuggled, undefined);
  assert.equal(card.interpretation.draft_status, 'ready');

  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0].tools, []);
  assert.ok(seen[0].signal, 'the call can time out');
  const brief = JSON.parse(seen[0].messages[0].content);
  assert.deepEqual(brief.files, ['宏观.pdf.txt']);
  assert.equal(brief.project, 'Economics');
  assert.deepEqual(brief.other_purposes_in_project.sort(), ['First', 'Second']);
  assert.ok(seen[0].messages[0].content.length < 2000);
});

test('an unusable model reply fails the draft', async (t) => {
  for (const chunks of [
    [{ type: 'text', text: 'Sorry, I cannot.' }],
    [{ type: 'text', text: '{"unknown": "field"}' }],
    [{ type: 'error', error: 'synthetic' }],
  ]) {
    const f = await fixture(t, createProviderPurposeDrafter(() => stubProvider(chunks)));
    await f.upload('notes.txt', 'Body');
    await waitForScheduledPurposeDrafts();
    assert.equal(f.cards()[0].interpretation.draft_status, 'failed');
  }
});

test('a provider that never answers times out, fails the card and frees the queue', async (t) => {
  const hung = createProviderPurposeDrafter(() => ({
    // eslint-disable-next-line require-yield
    async *chat() { await new Promise(() => undefined); },
  }) as never, 20);
  const f = await fixture(t, hung);
  await f.upload('hung.txt', 'Body');
  await waitForScheduledPurposeDrafts();
  assert.equal(f.cards()[0].interpretation.draft_status, 'failed');
  const next = await fixture(t, async () => ({ true_goal: 'After the hang' }));
  await next.upload('next.txt', 'Body two');
  await waitForScheduledPurposeDrafts();
  assert.equal(next.cards()[0].interpretation.true_goal, 'After the hang');
});

test('under test the default drafter stops before reaching any provider', async (t) => {
  const f = await fixture(t);
  const card = existingCard(f.db, f.userId, f.courseId);
  await assert.rejects(providerPurposeDrafter(card, { db: f.db, userId: f.userId }), /purpose_drafter_disabled_under_test/);
});

test('drafts run one at a time', async (t) => {
  let active = 0;
  let peak = 0;
  const f = await fixture(t, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return { true_goal: 'Goal' };
  });
  await f.upload('a.txt', 'Body a');
  await f.upload('b.txt', 'Body b', { courseId: f.otherCourseId });
  await waitForScheduledPurposeDrafts();
  assert.equal(peak, 1);
  assert.deepEqual([f.cards()[0].interpretation.draft_status, f.cards(f.otherCourseId)[0].interpretation.draft_status], ['ready', 'ready']);
});

// ---------------------------------------------------------------- restart

test('a restart resumes a draft left pending, and skips locked, settled and failed cards', async (t) => {
  const f = await fixture(t);
  const make = (title: string, interpretation: object, locked = 0) => {
    const card = existingCard(f.db, f.userId, f.courseId, title);
    f.db.prepare('UPDATE purposes SET interpretation_json = ?, interpretation_locked = ? WHERE id = ?').run(JSON.stringify(interpretation), locked, card.id);
    return card.id;
  };
  const stuck = make('Stuck', { draft_status: 'pending' });
  const locked = make('Locked', { draft_status: 'pending' }, 1);
  const ready = make('Ready', { draft_status: 'ready' });
  const failed = make('Failed', { draft_status: 'failed' });
  const plain = make('Plain', {});
  const called: string[] = [];
  assert.equal(resumePurposeDrafts(f.db, async (purpose) => { called.push(purpose.id); return { true_goal: 'Recovered' }; }), 1);
  await waitForScheduledPurposeDrafts();
  assert.deepEqual(called, [stuck]);
  const after = getPurpose(f.db, f.userId, stuck);
  assert.equal(after.interpretation.draft_status, 'ready');
  assert.equal(after.interpretation.true_goal, 'Recovered');
  const [event] = f.events('purpose_amended');
  assert.equal(event.actor_kind, 'agent:interpreter');
  assert.equal(event.channel, 'startup:purpose-draft-resume');
  assert.equal(event.meta.trigger, 'resume');
  assert.equal(getPurpose(f.db, f.userId, locked).interpretation.true_goal, undefined);
  assert.equal(getPurpose(f.db, f.userId, ready).interpretation.draft_status, 'ready');
  assert.equal(getPurpose(f.db, f.userId, failed).interpretation.draft_status, 'failed');
  assert.deepEqual(getPurpose(f.db, f.userId, plain).interpretation, {});
  assert.equal(resumePurposeDrafts(f.db, async () => ({ true_goal: 'Again' })), 0);
});

test('redraft on an importer card reuses the drafter passed to the router', async (t) => {
  let called = 0;
  const f = await fixture(t);
  const sourceId = await f.upload('plain.txt', 'Body');
  await waitForScheduledPurposeDrafts();
  const [card] = f.cards();
  assert.ok(sourceId);
  const app = express();
  app.use((req, _res, next) => { (req as any).userId = f.userId; next(); });
  app.use('/api/purposes', createPurposeRouter(() => f.db, async () => { called += 1; return { true_goal: 'Second draft' }; }));
  app.use(errorHandler);
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/purposes/${card.id}/redraft`, { method: 'POST' });
  assert.equal(response.status, 202);
  await waitForScheduledPurposeDrafts();
  assert.equal(called, 1);
  const after = getPurpose(f.db, f.userId, card.id);
  assert.equal(after.interpretation.true_goal, 'Second draft');
  assert.equal(after.interpretation.revision, 2);
});
