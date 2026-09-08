import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { resolveWorldRect, resolveScreenRect } from '../../client/src/pages/Notes/canvasEngine/placementContractService.js';
import { readCoordinateContract } from '../src/services/coordinateContract.js';
import { readShadowReport } from './wildernessShadow/census.js';
import { createSyntheticBuffer } from './wildernessShadow/synthetic.js';
import { createExecutorSyntheticBuffer, createMultiUserSyntheticBuffer } from './wildernessExecutor/synthetic.js';
import { solveCoordinates, readFrame, type Row } from './wildernessExecutor/coordinates.js';
import { execute, rollback, TABLES, BACKUP_SUFFIX, tableHash, json, encode, type Stage } from './wildernessExecutor/executor.js';
import { parseArgs, run, readPreview, renderPreview, renderExecution } from './v13WildernessExecute.js';

const user = 's0-user';
function fixture(foreignFormal = false) {
  const db = new Database(createExecutorSyntheticBuffer(foreignFormal));
  db.pragma('foreign_keys = ON');
  return db;
}
function get(db: Database.Database, id: string): Row {
  return db.prepare('SELECT * FROM canvas_placements WHERE id=?').get(id) as Row;
}
function census(db: Database.Database) {
  const ro = new Database(db.serialize(), { readonly: true });
  try { return readShadowReport(ro, user, 'synthetic'); } finally { ro.close(); }
}
function hashes(db: Database.Database) {
  return TABLES.map(t => tableHash(db, t));
}
test('4a equations: exact negative local, no simultaneous solution, missing frame, nonfinite and metadata exceptions', () => {
  const db = fixture();
  try {
    const originalS3 = new Database(createSyntheticBuffer(), { readonly: true });
    try {
      for (const id of ['local', 'cross-note']) assert.deepEqual(get(db, id), { ...get(originalS3, id), order_index: null });
    } finally { originalS3.close(); }
    for (const id of ['local', 'cross-note', 'mixed', 'second']) {
      const row = get(db, id);
      const s = solveCoordinates(row, readFrame(db, row));
      assert.equal(s.status, 'exception');
      if (s.status === 'exception') assert.equal(s.reason, 'no_exact_solution');
    }
    const row = get(db, 's4-exact-0');
    const solution = solveCoordinates(row, readFrame(db, row));
    assert.equal(solution.status, 'normalized');
    if (solution.status !== 'normalized') throw new Error('expected exact solution');
    assert.equal(solution.candidate.x, -5);
    assert.equal(solution.candidate.y, -219.75);
    assert.deepEqual(resolveWorldRect(solution.candidate, solution.frame, 'v2', 0), solution.beforeWorld);
    assert.deepEqual(resolveScreenRect(solution.candidate, solution.frame, 'v2', 0), solution.beforeScreen);
    assert.equal(JSON.parse(solution.metadata).layout_policy.retained, true);
    for (const id of ['missing-frame', 'invalid-inset', 'duplicate-frame', 'infinite-x', 'invalid-meta']) {
      const row = get(db, id);
      const solution = solveCoordinates(row, readFrame(db, row));
      assert.equal(solution.status, 'exception');
      if (solution.status === 'exception') assert.deepEqual(solution.original, row);
    }
    assert.equal(json(get(db, 'infinite-x')).includes('"$sqliteNumber":"Infinity"'), true);
    const imprecise = { ...row, y: 0.1 };
    const s = solveCoordinates(imprecise, readFrame(db, imprecise));
    assert.equal(s.status, 'exception', 'strict double-ruler comparison must catch cancellation, not round it away');
  } finally { db.close(); }
});

test('synthetic preview -> execute -> exact census/invariants -> rollback -> full restore -> execute', () => {
  const db = fixture();
  try {
    const bytes = db.serialize();
    const preview = census(db);
    assert.deepEqual(db.serialize(), bytes);
    const beforeHashes = hashes(db);
    const foreign = get(db, 'foreign-placement');
    const original = new Map(['local', 'cross-note', 'infinite-x'].map(id => [id, get(db, id)]));
    const execution = execute(db, user);
    const result = execution.users[0];
    assert.equal(readCoordinateContract(db), 'v2');
    assert.equal(result.conservation.length, 24);
    assert.equal(result.conservation.every(c => c.ok), true);
    assert.ok(result.invariants.checked >= 20);
    assert.equal(result.invariants.formalExceptions, 0);
    assert.equal(census(db).evidence.censusSha256, result.after.censusSha256);
    for (const [id, before] of original) {
      assert.equal(get(db, id).surface, 'tray');
      assert.deepEqual(get(db, id), { ...before, surface: 'tray', order_index: get(db, id).order_index });
      assert.deepEqual(result.exceptions.find(c => c.id === id)?.original, before);
    }
    assert.equal((encode(result.exceptions.find(c => c.id === 'infinite-x')!.original) as Record<string, unknown>).x instanceof Object, true);
    for (const id of ['half', 'quarter', 'three-quarter', 'outside', 'p-shape', 'p-image', 'p-table', 'p-visual_connector', 'p-future_kind', 'all-wilderness-p1', 'all-wilderness-p2']) {
      assert.equal(get(db, id).surface, 'tray');
      assert.ok(Number(get(db, id).order_index) > 40);
    }
    assert.equal(get(db, 's4-exact-0').y, -219.75);
    assert.deepEqual(get(db, 'foreign-placement'), foreign);
    assert.equal(tableHash(db, 'canvas_objects'), beforeHashes[1]);
    assert.equal(tableHash(db, 'content_mounts'), beforeHashes[2]);
    const receipt = db.prepare('SELECT verb,objects FROM events').get() as { verb: string; objects: string };
    assert.equal(receipt.verb, 'migrated');
    for (const id of ['local', 'cross-note', 'object-shape', 'mount-shape']) assert.ok(JSON.parse(receipt.objects).some((r: { id: string }) => r.id === id));
    for (const t of TABLES) assert.throws(() => db.exec(`UPDATE ${t + BACKUP_SUFFIX} SET id=id`), /executor_backup_readonly/);
    const undone = rollback(db, user);
    assert.equal(readCoordinateContract(db), 'v1');
    assert.deepEqual(hashes(db), beforeHashes);
    assert.deepEqual(census(db).census, preview.census);
    assert.equal(undone.users[0].after.censusSha256, preview.evidence.censusSha256);
    for (const t of undone.backups) assert.throws(() => db.exec(`DELETE FROM ${t}`), /executor_backup_readonly/);
    const second = execute(db, user);
    assert.equal(second.users[0].after.censusSha256, result.after.censusSha256);
    assert.deepEqual(second.hashes.after, execution.hashes.after);
    assert.deepEqual(db.prepare('SELECT verb FROM events ORDER BY seq').all(), [{ verb: 'migrated' }, { verb: 'rolled_back' }, { verb: 'migrated' }]);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    for (const t of TABLES) assert.throws(() => db.exec(`DELETE FROM ${t + BACKUP_SUFFIX}`), /executor_backup_readonly/);
  } finally { db.close(); }
});

test('existing backup refused without overwrite; out-of-scope formal/workspace rows refuse the global flip', () => {
  for (const table of TABLES) {
    const db = fixture();
    try {
      db.exec(`CREATE TABLE ${table + BACKUP_SUFFIX}(sentinel TEXT); INSERT INTO ${table + BACKUP_SUFFIX} VALUES('preserve')`);
      const before = db.serialize();
      assert.throws(() => execute(db, user), /executor_backup_exists/);
      assert.deepEqual(db.serialize(), before);
    } finally { db.close(); }
  }
  for (const surface of ['formal_page', 'canvas_workspace']) {
    const db = fixture(true);
    try {
      db.prepare('UPDATE canvas_placements SET surface=? WHERE id=?').run(surface, 'foreign-placement');
      const before = db.serialize();
      assert.throws(() => execute(db, user), /executor_out_of_scope_nontray_rows/);
      assert.deepEqual(db.serialize(), before);
    } finally { db.close(); }
  }
});

for (const stage of ['backup', 'normalize', 'relocate', 'event', 'flag'] as Stage[]) test(`execute atomic rollback after ${stage}, including event and DDL`, () => {
  const db = fixture();
  try {
    const before = db.serialize();
    assert.throws(() => execute(db, user, { afterStep(s) { if (s === stage) throw new Error('injected'); } }), /injected/);
    assert.deepEqual(db.serialize(), before);
    assert.equal(readCoordinateContract(db), 'v1');
    assert.deepEqual(db.prepare('SELECT * FROM events').all(), []);
  } finally { db.close(); }
});
for (const stage of ['restore', 'rollback_event', 'archive'] as Stage[]) test(`rollback atomic after ${stage}`, () => {
  const db = fixture();
  try {
    execute(db, user);
    const before = db.serialize();
    assert.throws(() => rollback(db, user, { afterStep(s) { if (s === stage) throw new Error('injected'); } }), /injected/);
    assert.deepEqual(db.serialize(), before);
    assert.equal(readCoordinateContract(db), 'v2');
  } finally { db.close(); }
});
test('rollback refuses subsequent writes and extension drift without discarding either', () => {
  for (const sql of ["UPDATE canvas_placements SET x=999 WHERE id='local'", "UPDATE structured_object_extensions SET data_json='{}'"]) {
    const db = fixture();
    try {
      execute(db, user);
      db.exec(sql);
      const before = db.serialize();
      assert.throws(() => rollback(db, user), /executor_(post_execution|dependency)_drift/);
      assert.deepEqual(db.serialize(), before);
    } finally { db.close(); }
  }
});
test('SQLite 64-bit integers survive backup, full-row rollback and exception reports exactly', () => {
  const db = fixture();
  try {
    db.exec("UPDATE canvas_placements SET z_index=9007199254740993 WHERE id IN ('local','s4-exact-1')");
    const result = execute(db, user);
    assert.ok(json(result.users[0].exceptions.find(c => c.id === 'local')!.original).includes('9007199254740993'));
    rollback(db, user);
    assert.deepEqual(db.prepare("SELECT z_index FROM canvas_placements WHERE id IN ('local','s4-exact-1')").safeIntegers(true).all(),
      [{ z_index: 9007199254740993n }, { z_index: 9007199254740993n }]);
  } finally { db.close(); }
});
test('untagged formal row whose hydration changes surface is an exception, not a false positive', () => {
  const db = fixture();
  try {
    const original = { ...get(db, 's4-exact-0'), metadata: '{}' };
    const result = solveCoordinates(original, readFrame(db, original));
    assert.equal(result.status, 'exception');
    if (result.status === 'exception') assert.equal(result.reason, 'hydration_mismatch');
  } finally { db.close(); }
});
test('independent CLI entry and explicit arguments: full on-disk synthetic flow', () => {
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(['--db', 'x', '--user', user, '--out', 'x', '--execute', '--rollback']));
  const folder = mkdtempSync(path.join(tmpdir(), 'coincides-s4b-synthetic-'));
  const database = path.join(folder, 'synthetic.sqlite');
  writeFileSync(database, createExecutorSyntheticBuffer());
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const reports: string[] = [];
  try {
    for (const [i, action] of (['preview', 'execute', 'rollback', 'execute'] as const).entries()) {
      const output = `docs/audits/s4b-合成-cli-${path.basename(folder)}-${i}`;
      reports.push(path.join(root, output + '.json'), path.join(root, output + '.md'));
      const before = action === 'preview' ? readFileSync(database) : undefined;
      const args = ['--db', database, '--user', user, '--out', output, ...(action === 'preview' ? [] : [`--${action}`])];
      const result = run(parseArgs(args));
      assert.equal(result.conservation, true);
      if (before) assert.deepEqual(readFileSync(database), before);
      assert.ok(readFileSync(reports[reports.length - 1], 'utf8').length > 100);
    }
    const db = new Database(database, { readonly: true });
    try {
      assert.equal(readCoordinateContract(db), 'v2');
      assert.equal(get(db, 'local').surface, 'tray');
      assert.equal(get(db, 'cross-note').surface, 'tray');
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n, 3);
    } finally { db.close(); }
  } finally {
    // Exact generated files only; no recursive deletion, no existing database paths.
    for (const file of reports) { try { unlinkSync(file); } catch { /* failed before output creation */ } }
    unlinkSync(database); rmdirSync(folder);
  }
});

const multiUsers = ['s0-other', user];
function multiFixture() {
  const db = new Database(createMultiUserSyntheticBuffer());
  db.pragma('foreign_keys = ON');
  return db;
}
test('repeat/comma user arguments form one nonempty canonical scope; singleton options still refuse duplicates', () => {
  const args = ['--db', 'synthetic.sqlite', '--out', 'docs/audits/合成'];
  assert.deepEqual(parseArgs([...args, '--user', `${user}, s0-other`, '--user', user]).users, multiUsers);
  for (const values of [[], ['--user', ''], ['--user', 's0-other,'], ['--user', ',s0-other'], ['--user', 's0-other,,s0-user']]) {
    assert.throws(() => parseArgs([...args, ...values]));
  }
  assert.throws(() => parseArgs([...args, '--user', user, '--db', 'again']));
  assert.throws(() => parseArgs([...args, '--user', user, '--out', 'again']));
});
test('two-user scope: incomplete execute/rollback refuse zero-write; all users migrate, restore and repeat exactly', () => {
  const db = multiFixture();
  try {
    const initial = db.serialize();
    const beforeHashes = hashes(db);
    for (const scope of [user, 's0-other', [user, 'unknown'], []]) {
      assert.throws(() => execute(db, scope), /executor_(out_of_scope_nontray_rows|unknown_scope|explicit_scope_required)/);
      assert.deepEqual(db.serialize(), initial);
    }
    const reader = new Database(initial, { readonly: true });
    const preview = (() => { try { return readPreview(reader, [user, 's0-other']); } finally { reader.close(); } })();
    assert.deepEqual(db.serialize(), initial);
    for (const id of multiUsers) assert.ok(renderPreview(preview).includes(`## 用户 ${id}`));
    assert.equal(preview.users.find(u => u.scopeUserId === 's0-other')!.census.placement_inventory.length, 2);
    const originalForeign = get(db, 'foreign-placement');
    let flips = 0;
    const result = execute(db, [user, 's0-other', user], { afterStep(stage) { if (stage === 'flag') flips++; } });
    assert.equal(flips, 1);
    assert.deepEqual(result.scopeUserIds, multiUsers);
    assert.equal(result.backups.length, 3, 'one immutable full-table generation covers both users');
    assert.equal(readCoordinateContract(db), 'v2');
    for (const u of result.users) {
      assert.ok(u.conservation.every(c => c.ok));
      assert.equal(u.invariants.formalExceptions, 0);
      assert.ok(u.changes.every(c => c.original.user_id === u.scopeUserId));
      assert.ok(renderExecution(result).includes(`## 用户 ${u.scopeUserId}`));
      const receipt = db.prepare('SELECT user_id,objects FROM events WHERE seq=?').get(u.eventSeq) as { user_id: string; objects: string };
      assert.equal(receipt.user_id, u.scopeUserId);
      for (const object of JSON.parse(receipt.objects) as { kind: string; id: string }[]) {
        const table = object.kind === 'canvas_placement' ? 'canvas_placements' : object.kind === 'canvas_object' ? 'canvas_objects' : 'content_mounts';
        assert.equal((db.prepare(`SELECT user_id FROM ${table} WHERE id=?`).get(object.id) as { user_id: string }).user_id, u.scopeUserId);
      }
    }
    assert.equal(result.users.find(u => u.scopeUserId === 's0-other')!.invariants.checked, 1);
    assert.ok(result.users.find(u => u.scopeUserId === user)!.invariants.checked >= 20);
    assert.equal(get(db, 'foreign-placement').surface, 'formal_page');
    assert.equal(get(db, 'foreign-placement').y, 10);
    const committed = db.serialize();
    for (const scope of [user, 's0-other', [...multiUsers, 'extra']]) {
      assert.throws(() => rollback(db, scope), /executor_rollback_scope_or_contract/);
      assert.deepEqual(db.serialize(), committed);
    }
    const restored = rollback(db, [user, 's0-other']);
    assert.equal(readCoordinateContract(db), 'v1');
    assert.deepEqual(get(db, 'foreign-placement'), originalForeign);
    assert.deepEqual(hashes(db), beforeHashes);
    restored.users.forEach((u, i) => assert.equal(u.after.censusSha256, preview.users[i].evidence.censusSha256));
    const repeated = execute(db, multiUsers);
    assert.deepEqual(repeated.hashes.after, result.hashes.after);
    repeated.users.forEach((u, i) => assert.equal(u.after.censusSha256, result.users[i].after.censusSha256));
    for (const id of multiUsers) assert.deepEqual(db.prepare('SELECT verb FROM events WHERE user_id=? ORDER BY seq').all(id),
      [{ verb: 'migrated' }, { verb: 'rolled_back' }, { verb: 'migrated' }]);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  } finally { db.close(); }
});
test('second user failure undoes both users, backup DDL, receipts and flag in execute and rollback', () => {
  for (const stage of ['normalize', 'relocate', 'event', 'rollback_event'] as Stage[]) {
    const db = multiFixture();
    try {
      if (stage === 'rollback_event') execute(db, multiUsers);
      const before = db.serialize();
      const operation = stage === 'rollback_event' ? rollback : execute;
      assert.throws(() => operation(db, multiUsers, { afterStep(s, scope) {
        if (s === stage && scope === user) {
          if (stage === 'event' || stage === 'rollback_event') {
            assert.equal((db.prepare('SELECT count(*) AS n FROM events WHERE verb=?').get(
              stage === 'event' ? 'migrated' : 'rolled_back') as { n: number }).n, 2);
          }
          throw new Error('second_user_failure');
        }
      } }), /second_user_failure/);
      assert.deepEqual(db.serialize(), before);
    } finally { db.close(); }
  }
});
test('legacy version-1 single-user journal still rolls back with the exact original scope', () => {
  const db = fixture();
  try {
    const original = hashes(db);
    execute(db, user);
    const entry = db.prepare("SELECT value FROM database_meta WHERE key='v13_2_wilderness_executor'").get() as { value: string };
    const state = JSON.parse(entry.value);
    const { users, beforeCensus, ...common } = state;
    db.prepare("UPDATE database_meta SET value=? WHERE key='v13_2_wilderness_executor'").run(
      JSON.stringify({ ...common, version: 1, user: users[0], beforeCensus: beforeCensus[user] }));
    assert.throws(() => rollback(db, multiUsers), /executor_rollback_scope_or_contract/);
    rollback(db, user);
    assert.deepEqual(hashes(db), original);
    assert.equal(readCoordinateContract(db), 'v1');
  } finally { db.close(); }
});
