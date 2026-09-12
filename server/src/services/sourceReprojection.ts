import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { getProjectionUserWork, type ProjectionUserWork } from './courseLifecycle.js';
import { parseSourceArtifact, SourceArtifactError } from './sourceArtifact.js';
import { getSourceMaterializationFile } from './sourceFileIntake.js';
import type { SourceMaterializationOptions } from './sourceMaterialization.js';
import { runWithSourceMaterializationConcurrency } from './sourceMaterializationConcurrency.js';
import { publishSourceProjection, type PublishedSourceProjection } from './sourceProjectionMaterializer.js';

interface ReadyProjection {
  id: string;
  projection_note_id: string;
  course_id: string;
}

export interface SourceReprojectionResult extends PublishedSourceProjection {
  receipt_id: string;
  user_work: ProjectionUserWork;
}

// Parsing is asynchronous, but the replacement is a single synchronous write
// transaction. Keep the old materialized row intact until that transaction:
// its CHECK forbids retaining projection_note_id while marking it parsing.
const inFlight = new WeakMap<Database.Database, Set<string>>();

function conflict(code: string, message: string): never {
  throw new AppError(409, message, { code });
}

function readyProjection(db: Database.Database, userId: string, sourceId: string): ReadyProjection {
  const row = db.prepare(`
    SELECT sm.id, sm.status, sm.projection_note_id, n.course_id, n.note_class
    FROM source_materializations sm
    JOIN source_records sr ON sr.id = sm.source_record_id AND sr.user_id = sm.user_id
    LEFT JOIN notes n ON n.id = sm.projection_note_id AND n.user_id = sm.user_id
    WHERE sm.source_record_id = ? AND sm.user_id = ?
  `).get(sourceId, userId) as (ReadyProjection & { status: string; note_class: string | null }) | undefined;
  if (!row) throw new AppError(404, 'Source materialization not found');
  if (row.status === 'parsing' || row.status === 'publishing') {
    conflict('reprojection_in_progress', 'Source processing is already in progress. Try again when it is ready.');
  }
  if (row.status !== 'materialized' || !row.projection_note_id || row.note_class !== 'source_projection') {
    conflict('reprojection_not_ready', 'Only a ready Source projection can be replaced.');
  }
  return row;
}

export function previewSourceReprojection(db: Database.Database, userId: string, sourceId: string) {
  const projection = readyProjection(db, userId, sourceId);
  return { user_work: getProjectionUserWork(db, userId, projection.projection_note_id) };
}

function assertNoExternalReferences(userWork: ProjectionUserWork): void {
  if (userWork.external_block_placement_count > 0) {
    throw new AppError(409, 'This Source is referenced by another note or board. Remove those references before projecting it again.', {
      code: 'reprojection_blocked_external_refs', user_work: userWork,
    });
  }
}

export async function rematerializeSource(
  db: Database.Database,
  userId: string,
  sourceId: string,
  options: SourceMaterializationOptions = {},
): Promise<SourceReprojectionResult> {
  const key = `${userId}:${sourceId}`;
  const running = inFlight.get(db) || new Set<string>();
  if (running.has(key)) conflict('reprojection_in_progress', 'Source projection is already being replaced.');
  const before = readyProjection(db, userId, sourceId);
  assertNoExternalReferences(getProjectionUserWork(db, userId, before.projection_note_id));
  running.add(key);
  inFlight.set(db, running);
  try {
    const source = getSourceMaterializationFile(db, userId, sourceId, { rootDir: options.sourceRootDir });
    // A Source can have several Project placements. Replacement stays in the
    // old projection's Project instead of moving to the first Source placement.
    source.course_id = before.course_id;
    const input = {
      parser_key: source.parser_key, parser_version: source.parser_version,
      file_path: source.file_path, original_filename: source.original_filename, mime_type: source.mime_type,
    };
    const artifact = await runWithSourceMaterializationConcurrency(source.parser_key, () => (
      options.parseArtifact ? options.parseArtifact(input) : parseSourceArtifact(input)
    ));
    if (artifact.schema_version !== 'source-artifact.v1') {
      throw new SourceArtifactError('parser_failure', 'Parser returned an unsupported SourceArtifact version');
    }
    options.hooks?.afterParse?.(artifact);
    return db.transaction(() => {
      // Recheck under the write lock, including references added while parsing.
      // A concurrent connection may have completed a replacement first.
      const current = readyProjection(db, userId, sourceId);
      if (current.projection_note_id !== before.projection_note_id) {
        conflict('reprojection_in_progress', 'Source projection changed during preparation. Refresh and try again.');
      }
      const userWork = getProjectionUserWork(db, userId, current.projection_note_id);
      assertNoExternalReferences(userWork);
      source.course_id = current.course_id;
      const oldNoteId = current.projection_note_id;
      const blocks = db.prepare(`SELECT b.id FROM note_blocks b
        JOIN note_block_placements p ON p.block_id = b.id
        WHERE p.note_id = ? AND b.user_id = ? AND b.source_kind = 'source_projection'`)
        .all(oldNoteId, userId) as Array<{ id: string }>;
      const snapshot = {
        annotation_truths: db.prepare('SELECT * FROM annotation_truths WHERE user_id = ? AND note_id = ? ORDER BY id')
          .all(userId, oldNoteId),
        annotation_ranges: db.prepare(`SELECT * FROM annotation_ranges WHERE user_id = ?
          AND (note_id = ? OR annotation_id IN (SELECT id FROM annotation_truths WHERE user_id = ? AND note_id = ?)) ORDER BY id`)
          .all(userId, oldNoteId, userId, oldNoteId),
      };
      const receiptId = uuidv4();
      const now = (options.now || new Date()).toISOString();
      db.prepare(`INSERT INTO source_reprojection_receipts
        (id, source_record_id, old_note_id, user_work_json, annotation_snapshot_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(receiptId, sourceId, oldNoteId, JSON.stringify(userWork), JSON.stringify(snapshot), now);
      const claim = db.prepare(`UPDATE source_materializations
        SET status = 'publishing', projection_note_id = NULL, updated_at = ?, started_at = ?,
            attempt_count = attempt_count + 1, completed_at = NULL, error_code = NULL, error_message = NULL
        WHERE id = ? AND user_id = ? AND status = 'materialized' AND projection_note_id = ?`)
        .run(now, now, current.id, userId, oldNoteId);
      if (claim.changes !== 1) conflict('reprojection_in_progress', 'Source replacement claim was lost.');
      options.hooks?.afterPublishingState?.();
      db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(oldNoteId, userId);
      // Blocks are standalone truth rows, not children of notes. Their original
      // placements have cascaded; external placements were refused above.
      const deleteBlock = db.prepare('DELETE FROM note_blocks WHERE id = ? AND user_id = ?');
      for (const block of blocks) deleteBlock.run(block.id, userId);
      const published = publishSourceProjection(db, source, artifact, {
        canvasAssetRootDir: options.canvasAssetRootDir, now: options.now, hooks: options.hooks,
      });
      return { ...published, receipt_id: receiptId, user_work: userWork };
    }).immediate();
  } finally {
    running.delete(key);
    if (running.size === 0) inFlight.delete(db);
  }
}
