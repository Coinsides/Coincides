import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import {
  getPurpose,
  markPurposeDraftFailed,
  revisePurposeInterpretation,
  type Purpose,
} from './purposes.js';
import type { PurposeInterpretationDraft } from '../validators/purposes.js';

export type PurposeDrafter = (purpose: Purpose) => Promise<PurposeInterpretationDraft>;

/** Holds the place of the provider call, which arrives with intake capture. */
export const unconnectedPurposeDrafter: PurposeDrafter = async () => {
  throw new Error('purpose_drafter_not_connected');
};

const running = new Map<string, Promise<void>>();

function isLockRefusal(error: unknown): boolean {
  return error instanceof AppError
    && (error.details as { code?: string } | undefined)?.code === 'purpose_interpretation_locked';
}

/** Never rejects and never holds up its caller: a failure only marks the card. */
export function schedulePurposeDraft(
  db: Database.Database,
  userId: string,
  purposeId: string,
  options: { drafter: PurposeDrafter; channel: string; trigger: string },
): Promise<void> {
  const key = `${userId}:${purposeId}`;
  const existing = running.get(key);
  if (existing) return existing;
  const task = new Promise<void>((resolve) => { setImmediate(resolve); })
    .then(async () => {
      const draft = await options.drafter(getPurpose(db, userId, purposeId));
      db.transaction(() => revisePurposeInterpretation(db, userId, purposeId, { ...draft, draft_status: 'ready' }, {
        actor: 'agent:interpreter', channel: options.channel, trigger: options.trigger,
      }))();
    })
    .catch((error) => {
      // A person locked the card while the draft was running: their word stands.
      if (isLockRefusal(error)) return;
      console.warn(`Purpose draft failed: ${purposeId}: ${error instanceof Error ? error.message : String(error)}`);
      try {
        markPurposeDraftFailed(db, userId, purposeId);
      } catch {
        // The purpose or its database is gone; nothing is left to mark.
      }
    })
    .finally(() => { running.delete(key); });
  running.set(key, task);
  return task;
}

export async function waitForScheduledPurposeDrafts(): Promise<void> {
  while (running.size) await Promise.all([...running.values()]);
}
