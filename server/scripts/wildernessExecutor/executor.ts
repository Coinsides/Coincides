import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { recordEvent } from '../../src/db/recordEvent.js';
import { readCoordinateContract } from '../../src/services/coordinateContract.js';
import { CENSUS_SQL } from '../wildernessShadow/census.js';
import { buildShadowPlan, validateConservation, type Census, type PlannedRow } from '../wildernessShadow/model.js';
import { readFrame, readFrames, solveCoordinates, verifySolution, type Row, type Solution } from './coordinates.js';

export const TABLES = ['canvas_placements', 'canvas_objects', 'content_mounts'] as const;
const DEPENDENCIES = ['page_frame_extensions', 'canvas_page_collections', 'visual_connector_extensions',
  'image_object_extensions', 'structured_object_extensions', 'note_block_placements'] as const;
export const BACKUP_SUFFIX = '_backup_pre13_2';
const JOURNAL = 'v13_2_wilderness_executor';
export const CHANNEL = 'v13WildernessExecute';
const quote = (name: string) => '"' + name.replace(/"/g, '""') + '"';
const requireThat: (condition: unknown, code: string) => asserts condition = (condition, code) => {
  if (!condition) throw new Error(code);
};

// Lossless SQLite values in reports AND hashes. Ordinary JSON would turn Infinity into null.
export function encode(value: unknown): unknown {
  if (typeof value === 'number' && !Number.isFinite(value)) return { $sqliteNumber: String(value) };
  if (typeof value === 'bigint') return { $sqliteInteger: value.toString() };
  if (Buffer.isBuffer(value)) return { $sqliteBlob: value.toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  return value;
}
export const json = (value: unknown): string => JSON.stringify(encode(value));
const digest = (value: unknown): string => createHash('sha256').update(json(value)).digest('hex');
const exists = (db: Database.Database, table: string): boolean => Boolean(db.prepare(
  "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
export function rows(db: Database.Database, table: string): Row[] {
  const all = db.prepare(`SELECT * FROM ${quote(table)} ORDER BY id`).safeIntegers(true).all() as Row[];
  return all.map(row => Object.fromEntries(Object.entries(row).map(([column, value]) => [column,
    typeof value === 'bigint' && value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value) : value])) as Row);
}
export function tableHash(db: Database.Database, table: string): string {
  // Column order and complete values are kept, independent of physical row insertion order.
  const all = db.prepare(`SELECT * FROM ${quote(table)}`).safeIntegers(true).all();
  return digest(all.map(json).sort());
}
function fingerprints(db: Database.Database, tables: readonly string[]) {
  return Object.fromEntries(tables.filter(t => exists(db, t)).map(t => [t, tableHash(db, t)]));
}
function snapshot(db: Database.Database, user: string) {
  const statement = db.prepare(CENSUS_SQL);
  requireThat(statement.readonly, 'executor_census_not_readonly');
  const raw = statement.get({ scope_user_id: user, adoption_threshold: 0.5 }) as { census_json: string };
  const census = JSON.parse(raw.census_json) as Census;
  const shadow = buildShadowPlan(census);
  requireThat(shadow.conservationOk, 'executor_census_invalid');
  return { census, shadow, censusSha256: createHash('sha256').update(raw.census_json).digest('hex') };
}
type Snapshot = ReturnType<typeof snapshot>;
export type Stage = 'backup' | 'normalize' | 'relocate' | 'event' | 'flag' | 'restore' | 'rollback_event' | 'archive';
export interface Hooks { afterStep?: (stage: Stage, user?: string) => void }
interface Change { id: string; note: string; destination: string; reason: string; original: Row; solution?: Solution }
interface Journal {
  version: 2; users: string[]; generation: string; beforeCensus: Record<string, string>;
  before: Record<string, string>; after: Record<string, string>; dependencies: Record<string, string>;
}
export interface UserExecutionReport {
  scopeUserId: string;
  before: Snapshot; after: Snapshot; changes: Change[]; exceptions: Change[];
  conservation: ReturnType<typeof validateConservation>[];
  invariants: { checked: number; formalExceptions: number; pageOffsetX: number;
    formalCandidates: number; normalizationRate: number | null; ruler: 'hydrated_screen_and_surface' };
  eventSeq: number;
}
export interface ExecutionReport {
  version: 'v13.2-s4b-multi-user'; action: 'executed' | 'rolled_back'; scopeUserIds: string[];
  users: UserExecutionReport[]; backups: string[];
  hashes: { before: Record<string, string>; after: Record<string, string> };
}
export function normalizeUsers(scope: string | readonly string[]): string[] {
  const values = (typeof scope === 'string' ? [scope] : scope).flatMap(value => value.split(',').map(user => user.trim()));
  requireThat(values.length > 0 && values.every(Boolean), 'executor_explicit_scope_required');
  return [...new Set(values)].sort();
}
function preflight(db: Database.Database) {
  requireThat(!db.readonly && !db.inTransaction, 'executor_explicit_writable_scope_required');
  requireThat(db.pragma('foreign_keys', { simple: true }) === 1, 'executor_foreign_keys_required');
  for (const t of [...TABLES, 'events', 'database_meta', 'page_frame_extensions']) requireThat(exists(db, t), 'executor_schema_missing');
  requireThat(db.prepare('PRAGMA table_info(canvas_placements)').all().some(c => (c as { name: string }).name === 'order_index'), 'executor_order_schema_missing');
}
function assertScope(db: Database.Database, users: string[]) {
  for (const user of users) requireThat(db.prepare('SELECT 1 FROM notes WHERE user_id=?').get(user), 'executor_unknown_scope');
  // The flag is database-wide. Never silently migrate someone outside --user.
  // Even workspace local rows can change under 4a, so only structural/tray rows are exempt.
  requireThat(!db.prepare(`SELECT 1 FROM canvas_placements p LEFT JOIN canvas_objects o
    ON o.id=p.object_id AND o.user_id=p.user_id AND o.note_id=p.note_id
    WHERE p.user_id NOT IN (${users.map(() => '?').join(',')}) AND p.surface<>'tray'
      AND (o.kind IS NULL OR o.kind<>'page_frame') LIMIT 1`).get(...users),
  'executor_out_of_scope_nontray_rows');
}
function conservation(before: Snapshot, after: Snapshot, changes: Change[]) {
  const changed = new Map(changes.map(c => [c.id, c]));
  const actual: PlannedRow[] = after.shadow.rows.map(r => {
    const change = r.unit === 'placement' ? changed.get(r.id) : undefined;
    // Object/mount destinations are derived from their associated placements in S3.
    const planned = before.shadow.rows.find(b => b.unit === r.unit && b.note === r.note && b.id === r.id)!;
    return { ...r, route: change?.destination === 'tray'
      ? { destination: 'tray_block', reason: change.reason, reviewRequired: false } : planned.route };
  });
  const result = before.census.denominators.flatMap(d => (['placement', 'object', 'mount'] as const).map(unit =>
    validateConservation(d.note, unit, d[unit], before.census[`${unit}_inventory`], actual)));
  requireThat(result.every(c => c.ok), 'executor_conservation_failed');
  return result;
}
function recordMigration(db: Database.Database, user: string, verb: 'migrated' | 'rolled_back', changes: Change[], before: Snapshot) {
  const touchedObjects = new Set(changes.map(c => String(c.original.object_id)));
  const objects = [
    ...changes.map(c => ({ kind: 'canvas_placement', id: c.id })),
    ...before.census.object_inventory.filter(o => touchedObjects.has(o.id)).map(o => ({ kind: 'canvas_object', id: o.id })),
    ...before.census.mount_inventory.filter(m => touchedObjects.has(m.object)).map(m => ({ kind: 'content_mount', id: m.id })),
  ];
  const normalized = changes.filter(c => c.destination === 'normalized').length;
  const tray = changes.filter(c => c.destination === 'tray').length;
  return Number(recordEvent(db, { user_id: user, actor_kind: 'human', channel: CHANNEL, verb, objects,
    summary: `${verb}: placements=${changes.length}; normalized=${normalized}; tray=${tray}; exceptions=${changes.filter(c => c.solution?.status === 'exception').length}`,
    meta: { census_before_sha256: before.censusSha256, normalized, tray } }));
}
function journal(db: Database.Database): Journal {
  const row = db.prepare('SELECT value FROM database_meta WHERE key=?').get(JOURNAL) as { value: string } | undefined;
  requireThat(row, 'executor_journal_missing');
  const value = JSON.parse(row.value) as Journal | (Omit<Journal, 'version' | 'users' | 'beforeCensus'>
    & { version: 1; user: string; beforeCensus: string });
  // Existing single-user executions keep their original rollback path; no journal rewrite.
  if (value.version === 1) {
    requireThat(typeof value.user === 'string' && typeof value.beforeCensus === 'string', 'executor_journal_invalid');
    return { ...value, version: 2, users: [value.user], beforeCensus: { [value.user]: value.beforeCensus } };
  }
  requireThat(value.version === 2 && Array.isArray(value.users) && value.users.every(u => typeof u === 'string')
    && json(normalizeUsers(value.users)) === json(value.users)
    && value.beforeCensus && json(Object.keys(value.beforeCensus).sort()) === json(value.users)
    && Object.values(value.beforeCensus).every(hash => typeof hash === 'string'), 'executor_journal_invalid');
  return value;
}

export function execute(db: Database.Database, scope: string | readonly string[], hooks: Hooks = {}): ExecutionReport {
  const users = normalizeUsers(scope);
  preflight(db);
  return db.transaction(() => {
    assertScope(db, users);
    for (const t of TABLES) requireThat(!exists(db, t + BACKUP_SUFFIX), 'executor_backup_exists');
    requireThat(readCoordinateContract(db) === 'v1', 'executor_requires_v1');
    requireThat(!db.prepare('SELECT 1 FROM database_meta WHERE key=?').get(JOURNAL), 'executor_journal_exists');
    const before = new Map(users.map(user => [user, snapshot(db, user)]));
    const beforeHashes = fingerprints(db, TABLES);
    const dependencies = fingerprints(db, DEPENDENCIES);
    const generation = randomUUID().replaceAll('-', '');
    // 1. Full three-table snapshots; never replace an earlier backup.
    for (const t of TABLES) {
      const backup = t + BACKUP_SUFFIX;
      db.exec(`CREATE TABLE ${quote(backup)} AS SELECT * FROM ${quote(t)}`);
      for (const operation of ['INSERT', 'UPDATE', 'DELETE']) db.exec(`CREATE TRIGGER ${quote(`${backup}_${generation}_${operation}`)}
        BEFORE ${operation} ON ${quote(backup)} BEGIN SELECT RAISE(ABORT, 'executor_backup_readonly'); END`);
      requireThat(tableHash(db, backup) === beforeHashes[t], 'executor_backup_mismatch');
    }
    hooks.afterStep?.('backup');
    const reports = users.map(user => migrateUser(db, user, before.get(user)!, hooks));
    requireThat(json(dependencies) === json(fingerprints(db, DEPENDENCIES)), 'executor_dependency_changed');
    // Every user's work and receipt belongs to this same transaction. Flip just once.
    for (const report of reports) {
      report.eventSeq = recordMigration(db, report.scopeUserId, 'migrated', report.changes, report.before);
      hooks.afterStep?.('event', report.scopeUserId);
    }
    db.prepare("INSERT INTO database_meta(key,value) VALUES('coordinate_contract','v2') ON CONFLICT(key) DO UPDATE SET value='v2'").run();
    hooks.afterStep?.('flag');
    const afterHashes = fingerprints(db, TABLES);
    const state: Journal = { version: 2, users, generation,
      beforeCensus: Object.fromEntries(reports.map(r => [r.scopeUserId, r.before.censusSha256])),
      before: beforeHashes, after: afterHashes, dependencies };
    db.prepare('INSERT INTO database_meta(key,value) VALUES(?,?)').run(JOURNAL, JSON.stringify(state));
    return { version: 'v13.2-s4b-multi-user', action: 'executed', scopeUserIds: users, users: reports,
      backups: TABLES.map(t => t + BACKUP_SUFFIX), hashes: { before: beforeHashes, after: afterHashes } };
  }).immediate() as ExecutionReport;
}

function migrateUser(db: Database.Database, user: string, before: Snapshot, hooks: Hooks): UserExecutionReport {
    const changes: Change[] = [];
    const source = rows(db, 'canvas_placements').filter(r => r.user_id === user);
    const inventory = new Map(before.census.placement_inventory.map(p => [p.id, p]));
    // 2. Normalize every non-structural formal row, including inactive/unresolved identities.
    for (const row of source) {
      if (row.surface !== 'formal_page' || inventory.get(row.id)?.kind === 'page_frame') continue;
      const solution = solveCoordinates(row, readFrame(db, row), readFrames(db, row), inventory.get(row.id)?.kind ?? null);
      changes.push({ id: row.id, note: row.note_id, original: row, solution,
        destination: solution.status === 'normalized' ? 'normalized' : 'tray',
        reason: solution.status === 'normalized' ? 'exact_hydrated_screen_and_surface' : solution.reason });
      if (solution.status === 'normalized') db.prepare('UPDATE canvas_placements SET x=?, y=?, metadata=? WHERE id=?')
        .run(solution.candidate.x, solution.candidate.y, solution.metadata, row.id);
    }
    hooks.afterStep?.('normalize', user);
    // 3. S3 is the sole wilderness routing authority. Destinations live on placements;
    // objects/mounts have no surface column and retain their entire identity/content rows.
    const changedIds = new Set(changes.map(c => c.id));
    for (const planned of before.shadow.rows) {
      if (planned.unit !== 'placement' || !planned.route.destination.startsWith('tray_') || changedIds.has(planned.id)) continue;
      const row = source.find(r => r.id === planned.id)!;
      changes.push({ id: row.id, note: row.note_id, original: row, destination: 'tray', reason: planned.route.reason });
    }
    const tails = new Map<string, number>();
    for (const c of changes.filter(c => c.destination === 'tray')) {
      if (!tails.has(c.note)) {
        const values = source.filter(r => r.note_id === c.note && r.surface === 'tray' && r.order_index !== null).map(r => r.order_index);
        requireThat(values.every(v => typeof v === 'number' && Number.isSafeInteger(v)), 'executor_invalid_tray_order');
        tails.set(c.note, Math.max(-1, ...values as number[]));
      }
      const order = tails.get(c.note)! + 1;
      requireThat(Number.isSafeInteger(order), 'executor_tray_order_overflow');
      tails.set(c.note, order);
      db.prepare("UPDATE canvas_placements SET surface='tray', order_index=? WHERE id=?").run(order, c.id);
    }
    hooks.afterStep?.('relocate', user);
    const actual = new Map(rows(db, 'canvas_placements').map(r => [r.id, r]));
    let checked = 0;
    for (const c of changes) {
      const row = actual.get(c.id)!;
      if (c.solution?.status === 'normalized') {
        requireThat(verifySolution(row, c.solution), 'executor_invariant_failed');
        checked++;
      } else requireThat(row.surface === 'tray', 'executor_destination_failed');
    }
    const formal = source.filter(r => r.surface === 'formal_page' && inventory.get(r.id)?.kind !== 'page_frame');
    // The denominator includes ALL formal candidates, including malformed rows.
    // Count only persisted rows that passed the same live hydration replay above.
    // Each user's cohort must pass: another user's positives cannot hide a disaster.
    const normalizationRate = formal.length ? checked / formal.length : null;
    requireThat(normalizationRate === null || normalizationRate >= 0.5, 'normalization_rate_anomaly');
    requireThat(formal.every(r => changes.some(c => c.id === r.id
      && (c.solution?.status === 'normalized' || actual.get(c.id)?.surface === 'tray'))), 'executor_formal_exception_remaining');
    const after = snapshot(db, user);
    const conserved = conservation(before, after, changes);
    return { scopeUserId: user, before, after, changes,
      exceptions: changes.filter(c => c.solution?.status === 'exception'), conservation: conserved,
      invariants: { checked, formalExceptions: 0, pageOffsetX: 0, formalCandidates: formal.length,
        normalizationRate, ruler: 'hydrated_screen_and_surface' }, eventSeq: 0 };
}

export function rollback(db: Database.Database, scope: string | readonly string[], hooks: Hooks = {}): ExecutionReport {
  const users = normalizeUsers(scope);
  preflight(db);
  return db.transaction(() => {
    const state = journal(db);
    requireThat(json(state.users) === json(users) && readCoordinateContract(db) === 'v2', 'executor_rollback_scope_or_contract');
    requireThat(json(state.after) === json(fingerprints(db, TABLES)), 'executor_post_execution_drift');
    requireThat(json(state.dependencies) === json(fingerprints(db, DEPENDENCIES)), 'executor_dependency_drift');
    const before = new Map(users.map(user => [user, snapshot(db, user)]));
    const changes: Change[] = [];
    for (const t of TABLES) {
      const backup = t + BACKUP_SUFFIX;
      requireThat(exists(db, backup) && tableHash(db, backup) === state.before[t], 'executor_backup_damaged');
      const saved = rows(db, backup);
      const current = rows(db, t);
      requireThat(json(saved.map(r => r.id)) === json(current.map(r => r.id)), 'executor_restore_identity_mismatch');
      const columns = (db.prepare(`PRAGMA table_info(${quote(t)})`).all() as { name: string }[]).map(c => c.name).filter(c => c !== 'id');
      const restore = db.prepare(`UPDATE ${quote(t)} SET ${columns.map(c =>
        `${quote(c)}=(SELECT b.${quote(c)} FROM ${quote(backup)} b WHERE b.id=${quote(t)}.id)`).join(',')} WHERE id=?`);
      // Full-table value restoration without DELETE/REPLACE and their cascading side effects.
      saved.forEach((row, index) => {
        if (json(row) === json(current[index])) return;
        if (t === 'canvas_placements') changes.push({ id: row.id, note: row.note_id, original: current[index],
          destination: 'restored', reason: 'backup_full_row' });
        // Restore SQLite values within SQLite: never round a 64-bit INTEGER through JS.
        restore.run(row.id);
      });
      requireThat(tableHash(db, t) === state.before[t], 'executor_restore_hash_mismatch');
    }
    hooks.afterStep?.('restore');
    db.prepare("UPDATE database_meta SET value='v1' WHERE key='coordinate_contract'").run();
    requireThat(json(state.dependencies) === json(fingerprints(db, DEPENDENCIES)), 'executor_restore_dependency_changed');
    const reports = users.map((user): UserExecutionReport => {
      const after = snapshot(db, user);
      requireThat(after.censusSha256 === state.beforeCensus[user], 'executor_restore_census_mismatch');
      const scopedChanges = changes.filter(c => c.original.user_id === user);
      const eventSeq = recordMigration(db, user, 'rolled_back', scopedChanges, before.get(user)!);
      hooks.afterStep?.('rollback_event', user);
      return { scopeUserId: user, before: before.get(user)!, after, changes: scopedChanges, exceptions: [],
        conservation: conservation(before.get(user)!, after, []),
        invariants: { checked: 0, formalExceptions: 0, pageOffsetX: 0, formalCandidates: 0,
          normalizationRate: null, ruler: 'hydrated_screen_and_surface' }, eventSeq };
    });
    // Preserve immutable generations, release only their fixed active names after a verified rollback.
    const backups = TABLES.map(t => t + BACKUP_SUFFIX + '_rolled_back_' + reports.at(-1)!.eventSeq);
    TABLES.forEach((t, i) => db.exec(`ALTER TABLE ${quote(t + BACKUP_SUFFIX)} RENAME TO ${quote(backups[i])}`));
    db.prepare('DELETE FROM database_meta WHERE key=?').run(JOURNAL);
    hooks.afterStep?.('archive');
    return { version: 'v13.2-s4b-multi-user', action: 'rolled_back', scopeUserIds: users, users: reports,
      backups, hashes: { before: state.after, after: fingerprints(db, TABLES) } };
  }).immediate() as ExecutionReport;
}
