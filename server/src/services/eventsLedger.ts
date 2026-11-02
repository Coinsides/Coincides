import type Database from 'better-sqlite3';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface EventObjectRef {
  kind: string;
  id: string;
}

interface EventRow {
  seq: number;
  ts: string;
  actor_kind: string;
  channel: string;
  verb: string;
  objects: string;
  summary: string;
  meta: string;
}

/** Read-only and newest first. Reports what happened; it draws no conclusion from it. */
export function listEventsForObjects(
  db: Database.Database,
  userId: string,
  refs: readonly EventObjectRef[],
  options: { verbs?: readonly string[]; limit?: number; beforeSeq?: number } = {},
) {
  if (!refs.length) return [];
  const verbs = options.verbs ?? null;
  if (verbs && !verbs.length) return [];
  const limit = Math.min(Math.max(1, Math.trunc(options.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
  const rows = db.prepare(`
    WITH refs(kind, id) AS (VALUES ${refs.map(() => '(?, ?)').join(', ')})
    SELECT e.seq, e.ts, e.actor_kind, e.channel, e.verb, e.objects, e.summary, e.meta
    FROM events e
    WHERE e.user_id = ?
      ${options.beforeSeq === undefined ? '' : 'AND e.seq < ?'}
      ${verbs ? `AND e.verb IN (${verbs.map(() => '?').join(', ')})` : ''}
      AND EXISTS (
        SELECT 1 FROM json_each(e.objects) object
        JOIN refs ON refs.kind = json_extract(object.value, '$.kind')
          AND refs.id = json_extract(object.value, '$.id')
      )
    ORDER BY e.seq DESC
    LIMIT ?
  `).all(
    ...refs.flatMap((ref) => [ref.kind, ref.id]),
    userId,
    ...(options.beforeSeq === undefined ? [] : [options.beforeSeq]),
    ...(verbs ?? []),
    limit,
  ) as EventRow[];
  return rows.map((row) => ({
    ...row,
    objects: JSON.parse(row.objects) as EventObjectRef[],
    meta: JSON.parse(row.meta) as Record<string, unknown>,
  }));
}
