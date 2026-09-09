import type Database from 'better-sqlite3';
import { recordEvent, type EventEntry } from '../db/recordEvent.js';
import type { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';

export const RECORDED_ACTION_VERBS = [
  'purpose_created', 'board_created', 'board_deleted', 'mounted', 'unmounted',
] as const;

export type RecordedActionEvent = Pick<EventEntry, 'objects' | 'summary' | 'meta'> & {
  verb: typeof RECORDED_ACTION_VERBS[number];
};

export interface RecordedActionResult<T> {
  value: T;
  events: RecordedActionEvent[];
}

/**
 * Called by authenticated human routes with a literal method + route template.
 * Services receive only this connection, user ID and their domain inputs. They
 * return settled object identities; this wrapper owns the stamp and the commit.
 *
 * The callback must be synchronous: no await, Express next(), finish listener or
 * response writes inside it. Return to the route only after action AND events
 * commit. A mechanical fallback summary belongs to the route's action contract;
 * an explicitly supplied summary reaches recordEvent without rewriting.
 */
export function runRecordedAction<T>(
  db: Database.Database,
  req: AuthRequest,
  channel: string,
  action: (connection: Database.Database, userId: string) => RecordedActionResult<T>,
): T {
  const userId = req.userId;
  if (!userId) throw new AppError(401, 'Authentication required');

  return db.transaction(() => {
    const result = action(db, userId);
    if (result && typeof (result as unknown as { then?: unknown }).then === 'function') {
      throw new TypeError('recorded_action_must_be_synchronous');
    }
    for (const event of result.events) {
      if (!RECORDED_ACTION_VERBS.includes(event.verb)) {
        throw new TypeError('recorded_action_verb_not_enabled');
      }
      recordEvent(db, {
        user_id: userId,
        actor_kind: 'human',
        channel,
        verb: event.verb,
        objects: event.objects,
        summary: event.summary,
        ...(event.meta !== undefined && { meta: event.meta }),
      });
    }
    return result.value;
  })();
}
