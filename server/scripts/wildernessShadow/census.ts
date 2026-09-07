import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';
import { buildShadowPlan, type Census } from './model.js';
import type { ShadowReport } from './report.js';

export const CENSUS_SQL = readFileSync(new URL('./census.sql', import.meta.url), 'utf8');

export function readShadowReport(db: Database.Database, scopeUserId: string,
  mode: ShadowReport['mode'], adoptionThreshold = 0.5): ShadowReport {
  if (!scopeUserId.trim()) throw new Error('Explicit user scope required');
  if (!db.readonly) throw new Error('Read-only connection required');
  // This changes connection state only; it does not modify the database.
  db.pragma('query_only = ON');
  const statement = db.prepare(CENSUS_SQL);
  if (!statement.readonly) throw new Error('Census statement must be read-only');
  const changes = () => (db.prepare('SELECT total_changes() AS n').get() as { n: number }).n;
  // One consistent SQLite read snapshot for the complete census.
  return db.transaction((): ShadowReport => {
    const totalChangesBefore = changes();
    const raw = statement.get({ scope_user_id: scopeUserId, adoption_threshold: adoptionThreshold }) as { census_json: string };
    const census = JSON.parse(raw.census_json) as Census;
    const shadow = buildShadowPlan(census, adoptionThreshold);
    const totalChangesAfter = changes();
    if (totalChangesAfter !== totalChangesBefore) throw new Error('Census changed database rows');
    return { version: 'v13.2-s3', mode, scopeUserId,
      evidence: { readonlyConnection: db.readonly, queryOnly: db.pragma('query_only', { simple: true }) === 1,
        statementsReadonly: statement.readonly, totalChangesBefore, totalChangesAfter,
        censusSha256: createHash('sha256').update(raw.census_json).digest('hex') }, census, shadow };
  })();
}
