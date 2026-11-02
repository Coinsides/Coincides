import type Database from 'better-sqlite3';
import { getProviderFromSettings, type AIProvider } from '../agent/providers/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getPurpose,
  markPurposeDraftFailed,
  revisePurposeInterpretation,
  type Purpose,
} from './purposes.js';
import type { PurposeInterpretationDraft } from '../validators/purposes.js';

export type PurposeDrafter = (
  purpose: Purpose,
  context: { db: Database.Database; userId: string },
) => Promise<PurposeInterpretationDraft>;

const DRAFT_TIMEOUT_MS = 60_000;
const DRAFT_FIELD_MAX = 4000;
const DRAFT_FIELDS = ['true_goal', 'territory', 'behavior_pattern', 'time_window'] as const;
const STARTUP_RESUME_CHANNEL = 'startup:purpose-draft-resume';

const PURPOSE_DRAFT_PROMPT = `You draft a hypothesis about why a person is studying some material.
It is shown as a guess they can correct or lock. Infer only from what you are given.
Reply with one JSON object and nothing else. Every key is optional; leave out what you cannot infer:
{"true_goal": "what they are probably trying to achieve", "territory": "what the material covers", "behavior_pattern": "how they will probably use it", "time_window": "any deadline the names imply"}
Each value is one short sentence, in the language of the file name.`;

function draftBrief(db: Database.Database, userId: string, purpose: Purpose): string {
  const sources = db.prepare(`
    SELECT sr.display_name FROM purpose_members m
    JOIN source_records sr ON sr.id = m.member_id AND sr.user_id = m.user_id
    WHERE m.user_id = ? AND m.purpose_id = ? AND m.member_kind = 'source'
    ORDER BY m.order_index ASC LIMIT 20
  `).all(userId, purpose.id) as Array<{ display_name: string }>;
  const course = purpose.course_id
    ? db.prepare('SELECT name FROM courses WHERE id = ? AND user_id = ?').get(purpose.course_id, userId) as { name: string } | undefined
    : undefined;
  const others = purpose.course_id
    ? db.prepare(`
        SELECT title FROM purposes
        WHERE user_id = ? AND course_id = ? AND status = 'active' AND id != ?
        ORDER BY updated_at DESC LIMIT 20
      `).all(userId, purpose.course_id, purpose.id) as Array<{ title: string }>
    : [];
  return JSON.stringify({
    card_title: purpose.title,
    user_own_words: purpose.user_verbatim,
    intent: purpose.intent,
    files: sources.map((source) => source.display_name),
    project: course?.name ?? null,
    other_purposes_in_project: others.map((other) => other.title),
  });
}

function parseDraft(text: string): PurposeInterpretationDraft {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('purpose_draft_not_json');
  const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  const draft: PurposeInterpretationDraft = {};
  for (const field of DRAFT_FIELDS) {
    const value = parsed[field];
    if (typeof value === 'string' && value.trim()) draft[field] = value.trim().slice(0, DRAFT_FIELD_MAX);
  }
  if (Object.keys(draft).length === 0) throw new Error('purpose_draft_empty');
  return draft;
}

function configuredProvider(db: Database.Database, userId: string): AIProvider {
  // Some test suites reach these routes, and this machine's stored keys are real.
  // A test must never be able to reach a model, whichever fixture it forgot.
  if (process.env.NODE_TEST_CONTEXT) throw new Error('purpose_drafter_disabled_under_test');
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId) as { settings: string | null } | undefined;
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(user?.settings || '{}') as Record<string, unknown>;
  } catch {
    settings = {};
  }
  return getProviderFromSettings(settings).provider;
}

/** One short call with no tools. `resolveProvider` is where a stub replaces the model. */
export function createProviderPurposeDrafter(
  resolveProvider: (db: Database.Database, userId: string) => AIProvider = configuredProvider,
  timeoutMs = DRAFT_TIMEOUT_MS,
): PurposeDrafter {
  return async (purpose, { db, userId }) => {
    const provider = resolveProvider(db, userId);
    const controller = new AbortController();
    const read = async () => {
      let text = '';
      const stream = provider.chat(
        [{ role: 'user', content: draftBrief(db, userId, purpose) }],
        [],
        PURPOSE_DRAFT_PROMPT,
        { signal: controller.signal },
      );
      for await (const chunk of stream) {
        if (chunk.type === 'text') text += chunk.text ?? '';
        if (chunk.type === 'error') throw new Error('purpose_draft_provider_error');
      }
      return parseDraft(text);
    };
    // Rejects even if a provider ignores the signal: drafts share one queue, and
    // one hung call must not hold every later card at pending.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('purpose_draft_timeout'));
      }, timeoutMs);
    });
    try {
      return await Promise.race([read(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}

export const providerPurposeDrafter = createProviderPurposeDrafter();

const running = new Map<string, Promise<void>>();
let queueTail: Promise<void> = Promise.resolve();

function isLockRefusal(error: unknown): boolean {
  return error instanceof AppError
    && (error.details as { code?: string } | undefined)?.code === 'purpose_interpretation_locked';
}

/**
 * Never rejects and never holds up its caller: a failure only marks the card.
 * One draft at a time, so a burst of imports or a restart cannot fan out model calls.
 */
export function schedulePurposeDraft(
  db: Database.Database,
  userId: string,
  purposeId: string,
  options: { drafter: PurposeDrafter; channel: string; trigger: string },
): Promise<void> {
  const key = `${userId}:${purposeId}`;
  const existing = running.get(key);
  if (existing) return existing;
  const task = queueTail
    .then(() => new Promise<void>((resolve) => { setImmediate(resolve); }))
    .then(async () => {
      const draft = await options.drafter(getPurpose(db, userId, purposeId), { db, userId });
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
  queueTail = task;
  running.set(key, task);
  return task;
}

/** A restart loses the running draft, and nothing else would ever settle its card. */
export function resumePurposeDrafts(
  db: Database.Database,
  drafter: PurposeDrafter = providerPurposeDrafter,
): number {
  const rows = db.prepare(`
    SELECT id, user_id FROM purposes
    WHERE interpretation_locked = 0 AND json_valid(interpretation_json)
      AND json_extract(interpretation_json, '$.draft_status') = 'pending'
    ORDER BY updated_at ASC, id ASC
  `).all() as Array<{ id: string; user_id: string }>;
  for (const row of rows) {
    void schedulePurposeDraft(db, row.user_id, row.id, { drafter, channel: STARTUP_RESUME_CHANNEL, trigger: 'resume' });
  }
  return rows.length;
}

export async function waitForScheduledPurposeDrafts(): Promise<void> {
  while (running.size) await Promise.all([...running.values()]);
}
