import type Database from 'better-sqlite3';
import { extname } from 'node:path';
import { recordEvent } from '../db/recordEvent.js';
import { providerPurposeDrafter, schedulePurposeDraft, type PurposeDrafter } from './purposeDrafting.js';
import { addPurposeMember, createPurpose, markPurposeDraftPending } from './purposes.js';
import { HOME_SYSTEM_KIND } from './systemCourses.js';

// Several files sent together, or a zip's entries, land on one card.
const MERGE_WINDOW_MS = 10 * 60 * 1000;
const IMPORTER_MEMBER_METADATA = { attached_by: 'importer', nature: 'hypothesis' };

export interface PurposeCaptureOptions {
  /** The real entry route. It is passed down because business code may not name itself. */
  channel: string;
  now?: Date;
  drafter?: PurposeDrafter;
  /** The caller will schedule the draft itself, once a zip's entries have all arrived. */
  deferDraft?: boolean;
}

export type PurposeCaptureOutcome =
  | { outcome: 'skipped'; reason: 'home' | 'already_on_card' }
  | { outcome: 'attached'; purpose_id: string }
  | { outcome: 'created'; purpose_id: string };

function importerCardTitle(displayName: string): string {
  const extension = extname(displayName);
  const stem = (extension ? displayName.slice(0, -extension.length) : displayName).trim() || displayName;
  // The wrapper takes 4 characters of the 300 a title allows.
  return `研读《${stem.slice(0, 296)}》`;
}

function targetCard(db: Database.Database, userId: string, courseId: string, now: Date): string | null {
  // Note-bound purposes are retired relics of the old note chain, not cards for this Project.
  const active = db.prepare(`
    SELECT id, created_by, created_at, user_verbatim, interpretation_locked FROM purposes
    WHERE user_id = ? AND course_id = ? AND status = 'active' AND note_id IS NULL
    ORDER BY created_at DESC, id ASC
  `).all(userId, courseId) as Array<{
    id: string; created_by: string; created_at: string; user_verbatim: string | null; interpretation_locked: number;
  }>;
  // Only a card a person has stood behind states a standing reason. An untouched
  // machine card would otherwise pull in every later import in the Project.
  const adopted = active.filter((card) => card.created_by !== 'importer'
    || card.user_verbatim !== null || card.interpretation_locked === 1);
  if (adopted.length === 1) return adopted[0].id;
  // Guessing among several costs more than one extra card the user can put away.
  // A card this import just opened is not a guess.
  const recent = active.find((card) => card.created_by === 'importer');
  if (recent && now.getTime() - Date.parse(recent.created_at) < MERGE_WINDOW_MS) return recent.id;
  return null;
}

/**
 * Asks the user nothing. Decides by where the file landed: Home is a shelf with no
 * stated reason, so inventing a purpose there is forbidden; a real Project gets one.
 * Opens its own transaction because no intake transaction surrounds these call sites.
 */
export function capturePurposeForIntake(
  db: Database.Database,
  userId: string,
  input: { courseId: string; sourceRecordId: string },
  options: PurposeCaptureOptions,
): PurposeCaptureOutcome {
  const result = db.transaction((): PurposeCaptureOutcome => {
    const course = db.prepare('SELECT system_kind FROM courses WHERE id = ? AND user_id = ?')
      .get(input.courseId, userId) as { system_kind: string | null } | undefined;
    if (!course || course.system_kind === HOME_SYSTEM_KIND) return { outcome: 'skipped', reason: 'home' };
    // Sending the same file again must not open a card or undo a card put away.
    const placed = db.prepare(`
      SELECT 1 FROM purpose_members m
      JOIN purposes p ON p.id = m.purpose_id AND p.user_id = m.user_id
      WHERE m.user_id = ? AND m.member_kind = 'source' AND m.member_id = ? AND p.course_id = ?
      LIMIT 1
    `).get(userId, input.sourceRecordId, input.courseId);
    if (placed) return { outcome: 'skipped', reason: 'already_on_card' };

    const existing = targetCard(db, userId, input.courseId, options.now ?? new Date());
    if (existing) {
      addPurposeMember(db, userId, existing, {
        member_kind: 'source', member_id: input.sourceRecordId, metadata: IMPORTER_MEMBER_METADATA,
      });
      return { outcome: 'attached', purpose_id: existing };
    }

    const source = db.prepare('SELECT display_name FROM source_records WHERE id = ? AND user_id = ?')
      .get(input.sourceRecordId, userId) as { display_name: string };
    const card = createPurpose(db, userId, {
      title: importerCardTitle(source.display_name),
      project_id: input.courseId,
      created_by: 'importer',
    });
    markPurposeDraftPending(db, userId, card.id);
    addPurposeMember(db, userId, card.id, {
      member_kind: 'source', member_id: input.sourceRecordId, metadata: IMPORTER_MEMBER_METADATA,
    });
    // Importing is the person's own act; the card derives from it.
    recordEvent(db, {
      user_id: userId,
      actor_kind: 'human',
      channel: options.channel,
      verb: 'purpose_created',
      objects: [{ kind: 'purpose', id: card.id }, { kind: 'source', id: input.sourceRecordId }],
      summary: `Opened purpose card for import: ${card.title}`,
      meta: { via: 'intake', source_record_id: input.sourceRecordId },
    });
    return { outcome: 'created', purpose_id: card.id };
  })();

  if (result.outcome === 'created' && !options.deferDraft) schedulePurposeIntakeDraft(db, userId, result.purpose_id, options);
  return result;
}

export function schedulePurposeIntakeDraft(
  db: Database.Database,
  userId: string,
  purposeId: string,
  options: PurposeCaptureOptions,
): void {
  void schedulePurposeDraft(db, userId, purposeId, {
    drafter: options.drafter ?? providerPurposeDrafter,
    channel: options.channel,
    trigger: 'intake_draft',
  });
}

/** The file is already safely stored: a capture failure must never fail the import. */
export function capturePurposeAfterIntake(
  db: Database.Database,
  userId: string,
  input: { courseId: string; sourceRecordId: string },
  options: PurposeCaptureOptions,
): PurposeCaptureOutcome | null {
  try {
    return capturePurposeForIntake(db, userId, input, options);
  } catch (error) {
    console.warn(`Purpose capture failed for Source ${input.sourceRecordId}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
