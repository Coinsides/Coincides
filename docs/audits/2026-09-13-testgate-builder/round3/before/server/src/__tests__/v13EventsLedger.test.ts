import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test, { type TestContext } from 'node:test';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { closeDb, initDb } from '../db/init.js';
import { runMigrations, type Migration } from '../db/migrate.js';
import migration054 from '../db/migrations/054_v13_events_ledger.js';
import migration058 from '../db/migrations/058_v13_board_deleted_event.js';
import { EVENT_VERBS, recordEvent, type EventEntry } from '../db/recordEvent.js';

const VERBS_V13 = [
  'migrated', 'rolled_back', 'note_created', 'board_created', 'board_deleted', 'mounted', 'unmounted',
  'purpose_created', 'purpose_amended', 'purpose_sealed', 'proposal_issued',
  'proposal_approved', 'proposal_rejected', 'published',
] as const;

function entry(overrides: Partial<EventEntry> = {}): EventEntry {
  return {
    user_id: 'synthetic-user',
    actor_kind: 'system',
    channel: 'synthetic-v13-migration',
    verb: 'migrated',
    objects: [{ kind: 'note', id: 'synthetic-note' }],
    summary: '  执行者原话：移入托盘。\n保留空白与署名。  ',
    ...overrides,
  };
}

function ledgerDb(t: TestContext): Database.Database {
  const db = new Database(':memory:');
  t.after(() => db.close());
  db.pragma('foreign_keys = ON');
  db.transaction(() => migration054.up(db))();
  db.transaction(() => migration058.up(db))();
  return db;
}

function ledgerSchema(db: Database.Database) {
  return (db.prepare(`
    SELECT type, name, sql FROM sqlite_master
    WHERE tbl_name = 'events' ORDER BY type, name
  `).all() as Array<{ type: string; name: string; sql: string }>).map((row) => ({
    // 058's ALTER TABLE rename quotes this identifier; keep all other SQL exact.
    ...row, sql: row.sql.replace(/\s+/g, ' ').trim()
      .replace(/^CREATE TABLE "events" \(/, 'CREATE TABLE events ('),
  }));
}

function assertAppendOnly(db: Database.Database): void {
  const before = db.prepare('SELECT * FROM events ORDER BY seq').all();
  assert.ok(before.length > 0);
  for (const sql of [
    "UPDATE events SET summary = 'changed'",
    'DELETE FROM events',
  ]) {
    assert.throws(() => db.exec(sql), {
      code: 'SQLITE_CONSTRAINT_TRIGGER', message: 'events_append_only',
    });
    assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY seq').all(), before);
  }
}

test('054 fresh startup and an actual pre-054 migration fixture converge and rerun without changes', async () => {
  const legacy = new Database(':memory:');
  let fresh: Database.Database | undefined;
  try {
    legacy.pragma('foreign_keys = ON');
    sqliteVec.load(legacy);
    legacy.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    // Only this disposable fixture: remove the new base table to reconstruct pre-054.
    legacy.exec(`
      DROP TABLE events;
      CREATE TABLE db_migrations (
        id TEXT PRIMARY KEY, description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE synthetic_existing (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO synthetic_existing VALUES (1, 'preserve-existing-row');
    `);
    const migrationsDir = new URL('../db/migrations/', import.meta.url);
    const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.ts')).sort();
    assert.ok(files.includes(`${migration054.id}.ts`));
    for (const file of files) {
      if (file >= `${migration054.id}.ts`) continue;
      const { default: migration } = await import(new URL(file, migrationsDir).href) as { default: Migration };
      legacy.transaction(() => {
        migration.up(legacy);
        legacy.prepare('INSERT INTO db_migrations (id, description) VALUES (?, ?)')
          .run(migration.id, migration.description);
      })();
    }
    assert.equal(legacy.prepare("SELECT 1 FROM sqlite_master WHERE name = 'events'").get(), undefined);
    const existingSchema = legacy.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all();
    // Preserve 054's original no-change guard before later migrations alter their own tables.
    legacy.transaction(() => migration054.up(legacy))();
    for (const row of existingSchema as Array<{ type: string; name: string; sql: string | null }>) {
      assert.deepEqual(legacy.prepare('SELECT type, name, sql FROM sqlite_master WHERE name = ?').get(row.name), row);
    }
    // Exercise the real semicolon-splitting startup, extension loading and runner.
    fresh = await initDb(':memory:');
    const priorMigrationIds = new Set((legacy.prepare('SELECT id FROM db_migrations').all() as Array<{ id: string }>)
      .map(({ id }) => id));
    const pendingMigrations = (fresh.prepare('SELECT id FROM db_migrations').all() as Array<{ id: string }>)
      .filter(({ id }) => !priorMigrationIds.has(id));
    assert.equal(await runMigrations(legacy), pendingMigrations.length);
    assert.deepEqual(legacy.prepare('SELECT * FROM synthetic_existing').all(), [
      { id: 1, value: 'preserve-existing-row' },
    ]);

    assert.deepEqual(ledgerSchema(fresh), ledgerSchema(legacy));
    assert.equal(ledgerSchema(fresh).length, 5); // table, two indexes, two triggers
    assert.deepEqual(fresh.pragma('table_info(events)'), legacy.pragma('table_info(events)'));
    assert.deepEqual(fresh.pragma('foreign_key_list(events)'), []);
    assert.deepEqual((fresh.pragma('index_info(idx_events_user_ts)') as Array<{ name: string }>).map((row) => row.name), ['user_id', 'ts']);
    assert.deepEqual((fresh.pragma('index_info(idx_events_verb)') as Array<{ name: string }>).map((row) => row.name), ['verb']);
    for (const db of [fresh, legacy]) {
      db.transaction(() => recordEvent(db, entry()))();
      assertAppendOnly(db);
      const before = db.prepare('SELECT * FROM events').all();
      assert.equal(await runMigrations(db), 0);
      db.transaction(() => migration054.up(db))();
      assert.deepEqual(db.prepare('SELECT * FROM events').all(), before);
      assertAppendOnly(db);
    }
  } finally {
    legacy.close();
    if (fresh) closeDb();
  }
});

test('recordEvent preserves the quoted summary, object order and JSON metadata, with generated seq/ts', (t) => {
  const db = ledgerDb(t);
  const input = entry({
    objects: [{ kind: 'note', id: 'n' }, { kind: 'canvas_object', id: 'o' }],
    meta: { count: 2, restored: false, detail: [null, '原样'] },
  });
  const seq = db.transaction(() => recordEvent(db, input))();
  const row = db.prepare('SELECT * FROM events WHERE seq = ?').get(seq) as Record<string, unknown>;
  assert.equal(seq, 1);
  assert.match(row.ts as string, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual(row, {
    seq, ts: row.ts, ...input,
    objects: JSON.stringify(input.objects), meta: JSON.stringify(input.meta),
  });
  const next = db.transaction(() => recordEvent(db, entry({ objects: [] })))();
  assert.equal(next, 2);
  assert.deepEqual(db.prepare('SELECT objects, meta FROM events WHERE seq = ?').get(next), { objects: '[]', meta: '{}' });
});

test('UPDATE and DELETE failures propagate through the action transaction and roll it back', (t) => {
  const db = ledgerDb(t);
  db.exec('CREATE TABLE synthetic_actions (id INTEGER PRIMARY KEY)');
  db.transaction(() => recordEvent(db, entry()))();
  assertAppendOnly(db);
  for (const sql of ["UPDATE events SET summary = 'changed'", 'DELETE FROM events']) {
    assert.throws(() => db.transaction(() => {
      db.exec('INSERT INTO synthetic_actions VALUES (1)');
      db.exec(sql);
    })(), /events_append_only/);
    assert.deepEqual(db.prepare('SELECT * FROM synthetic_actions').all(), []);
  }
});

test('recordEvent requires the caller transaction and does not commit or replace it', (t) => {
  const db = ledgerDb(t);
  assert.throws(() => recordEvent(db, entry()), /events_transaction_required/);
  assert.equal(db.inTransaction, false);
  db.exec('BEGIN IMMEDIATE');
  recordEvent(db, entry());
  assert.equal(db.inTransaction, true);
  db.exec('ROLLBACK');
  assert.deepEqual(db.prepare('SELECT * FROM events').all(), []);
});

test('all fourteen V13 verbs work and unknown verbs are rejected by both helper and SQL', (t) => {
  const db = ledgerDb(t);
  assert.deepEqual(EVENT_VERBS, VERBS_V13);
  for (const verb of VERBS_V13) db.transaction(() => recordEvent(db, entry({ verb })))();
  assert.deepEqual(db.prepare('SELECT verb FROM events ORDER BY seq').all(), VERBS_V13.map((verb) => ({ verb })));
  for (const verb of ['unknown', '', 'MIGRATED', null, 7]) {
    assert.throws(() => db.transaction(() => recordEvent(db, { ...entry(), verb } as unknown as EventEntry))(), /events_invalid_entry/);
    assert.throws(() => db.prepare(`
      INSERT INTO events (user_id, actor_kind, channel, verb, objects, summary)
      VALUES ('synthetic-user', 'system', 'synthetic', ?, '[]', 'synthetic')
    `).run(verb), /constraint failed/i);
  }
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n, 14);
});

test('objects must be an array of kind/id string pairs; invalid input rolls back the action', (t) => {
  const db = ledgerDb(t);
  db.exec('CREATE TABLE synthetic_actions (id INTEGER PRIMARY KEY)');
  const invalid = [
    undefined, null, {}, '[]', [null], ['note'], [{}], [{ kind: 'note' }],
    [{ id: 'n' }], [{ kind: 1, id: 'n' }], [{ kind: 'note', id: 1 }],
    [{ kind: '', id: 'n' }], [{ kind: 'note', id: ' ' }],
    [{ kind: 'note', id: 'n', extra: true }],
  ];
  for (const objects of invalid) {
    assert.throws(() => db.transaction(() => {
      db.exec('INSERT INTO synthetic_actions VALUES (1)');
      recordEvent(db, { ...entry(), objects } as unknown as EventEntry);
    })(), /events_invalid_entry/);
    assert.deepEqual(db.prepare('SELECT * FROM synthetic_actions').all(), []);
    assert.deepEqual(db.prepare('SELECT * FROM events').all(), []);
  }
});

test('synthetic smoke: a row update and event commit together, then both attempted changes roll back', (t) => {
  const db = ledgerDb(t);
  db.exec("CREATE TABLE synthetic_state (id INTEGER PRIMARY KEY, value TEXT); INSERT INTO synthetic_state VALUES (1, 'before')");
  db.transaction(() => {
    db.prepare('UPDATE synthetic_state SET value = ? WHERE id = 1').run('committed');
    recordEvent(db, entry());
  })();
  const committedState = db.prepare('SELECT * FROM synthetic_state').all();
  const committedEvents = db.prepare('SELECT * FROM events').all();
  assert.deepEqual(committedState, [{ id: 1, value: 'committed' }]);
  assert.equal(committedEvents.length, 1);
  assert.throws(() => db.transaction(() => {
    db.prepare('UPDATE synthetic_state SET value = ? WHERE id = 1').run('must-roll-back');
    recordEvent(db, entry({ verb: 'rolled_back' }));
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n, 2);
    throw new Error('synthetic-action-failed');
  })(), /synthetic-action-failed/);
  assert.deepEqual(db.prepare('SELECT * FROM synthetic_state').all(), committedState);
  assert.deepEqual(db.prepare('SELECT * FROM events').all(), committedEvents);
  console.log('S1_EVENTS_SMOKE_PASS commit_action=1 commit_event=1 rollback_action_absent=1 rollback_event_absent=1 db=:memory:');
});
