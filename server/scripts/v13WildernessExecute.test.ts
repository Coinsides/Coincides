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
import { createExecutorSyntheticBuffer } from './wildernessExecutor/synthetic.js';
import { solveCoordinates, readFrame, type Row } from './wildernessExecutor/coordinates.js';
import { execute, rollback, TABLES, BACKUP_SUFFIX, tableHash, json, encode, type Stage } from './wildernessExecutor/executor.js';
import { parseArgs, run } from './v13WildernessExecute.js';

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
    const result = execute(db, user);
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
    assert.equal(undone.after.censusSha256, preview.evidence.censusSha256);
    for (const t of undone.backups) assert.throws(() => db.exec(`DELETE FROM ${t}`), /executor_backup_readonly/);
    const second = execute(db, user);
    assert.equal(second.after.censusSha256, result.after.censusSha256);
    assert.deepEqual(second.hashes.after, result.hashes.after);
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
    assert.ok(json(result.exceptions.find(c => c.id === 'local')!.original).includes('9007199254740993'));
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
