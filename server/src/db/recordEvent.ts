import type Database from 'better-sqlite3';
import { z } from 'zod';

// Keep this closed set aligned with the database CHECK. Additions need a migration.
export const EVENT_VERBS = [
  'migrated',
  'rolled_back',
  'note_created',
  'board_created',
  'mounted',
  'unmounted',
  'purpose_created',
  'purpose_amended',
  'purpose_sealed',
  'proposal_issued',
  'proposal_approved',
  'proposal_rejected',
  'published',
] as const;

export type EventVerb = typeof EVENT_VERBS[number];
export type EventActorKind = 'human' | 'system' | `agent:${string}`;
export type EventJson = null | boolean | number | string | EventJson[] | { [name: string]: EventJson };

const jsonSchema: z.ZodType<EventJson> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(),
  z.array(jsonSchema), z.record(jsonSchema),
]));

const entrySchema = z.object({
  user_id: z.string().regex(/\S/),
  actor_kind: z.custom<EventActorKind>((value) => (
    value === 'human' || value === 'system'
    || (typeof value === 'string' && /^agent:\S.*$/.test(value))
  )),
  channel: z.string().regex(/\S/),
  verb: z.enum(EVENT_VERBS),
  objects: z.array(z.object({
    kind: z.string().regex(/\S/),
    id: z.string().regex(/\S/),
  }).strict()),
  summary: z.string(),
  meta: jsonSchema.optional(),
}).strict();

export type EventEntry = z.input<typeof entrySchema>;

/**
 * Append through the caller's already-open SQLite transaction. No getDb, BEGIN,
 * nested transaction, COMMIT or error swallowing: failures must escape the caller's
 * transaction callback so the action and its event roll back together.
 *
 * V0 callers are controlled migration/rollback scripts; channel is the script name.
 * For future route use, middleware MUST derive actor_kind/channel from authenticated
 * state and the actual entry point. Business code/request payloads must not self-report
 * that identity. This low-level helper neither authenticates nor exposes a route/tool.
 * summary is the executor's quoted handoff text, stored without rewriting it.
 * The returned seq is provisional until the caller commits.
 */
export function recordEvent(db: Database.Database, entry: EventEntry): number | bigint {
  if (!db.inTransaction) {
    throw new Error('events_transaction_required');
  }

  const parsed = entrySchema.safeParse(entry);
  if (!parsed.success) {
    // Do not echo the supplied entry into diagnostics.
    throw new TypeError('events_invalid_entry');
  }
  const value = parsed.data;
  return db.prepare(`
    INSERT INTO events (user_id, actor_kind, channel, verb, objects, summary, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    value.user_id,
    value.actor_kind,
    value.channel,
    value.verb,
    JSON.stringify(value.objects),
    value.summary,
    JSON.stringify(value.meta === undefined ? {} : value.meta),
  ).lastInsertRowid;
}
