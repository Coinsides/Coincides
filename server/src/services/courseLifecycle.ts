import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  finalizeCanvasAssetCleanup,
  releaseCourseCanvasAssets,
  releaseNoteCanvasAssets,
} from './canvasAssets.js';
import { assertCourseLifecyclePolicyCoverage } from './courseLifecyclePolicies.js';
import type { ManagedFileCleanupOptions, ManagedFileTask } from './managedFileCleanup.js';
import { assertCourseCanDelete, ensureHomeCourse } from './systemCourses.js';

export type ProjectProjectionAction = 'delete_projection' | 'move_to_home';

interface ProjectionRow {
  source_record_id: string;
  display_name: string;
  materialization_id: string;
  projection_note_id: string;
  other_placement_count: number;
}

export interface ProjectionUserWork {
  annotation_count: number;
  content_group_count: number;
  purpose_count: number;
  display_override_count: number;
  external_block_placement_count: number;
  has_user_work: boolean;
}

export interface ProjectDeletionImpact {
  project: { id: string; name: string };
  source_placement_count: number;
  source_projection_count: number;
  projection_user_work_count: number;
  other_placement_source_count: number;
  recommended_action: ProjectProjectionAction;
  projections: Array<ProjectionRow & { user_work: ProjectionUserWork }>;
}

function count(db: Database.Database, sql: string, ...params: unknown[]): number {
  return Number((db.prepare(sql).get(...params) as { count?: number } | undefined)?.count || 0);
}

function ownedCourse(db: Database.Database, userId: string, courseId: string) {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as { id: string; user_id: string; name: string; system_kind: string | null } | undefined;
  if (!course) throw new AppError(404, 'Project not found');
  return course;
}

export function getProjectionUserWork(
  db: Database.Database,
  userId: string,
  noteId: string,
): ProjectionUserWork {
  const annotationCount = count(
    db,
    "SELECT COUNT(*) AS count FROM annotation_truths WHERE user_id = ? AND note_id = ? AND status = 'active'",
    userId,
    noteId,
  );
  const contentGroupCount = count(
    db,
    "SELECT COUNT(*) AS count FROM content_groups WHERE user_id = ? AND note_id = ? AND status = 'active'",
    userId,
    noteId,
  );
  const purposeCount = count(db, `
    SELECT COUNT(*) AS count
    FROM purposes p
    WHERE p.user_id = ? AND p.note_id = ? AND p.status = 'active'
      AND NOT (
        p.is_note_default = 1
        AND p.created_by = 'system'
        AND NOT EXISTS (SELECT 1 FROM purpose_members pm WHERE pm.purpose_id = p.id)
      )
  `, userId, noteId);
  const displayOverrideCount = count(db, `
    SELECT (
      (SELECT COUNT(*) FROM note_block_placements nbp
       WHERE nbp.note_id = ? AND nbp.display_overrides_json NOT IN ('{}', '', 'null'))
      +
      (SELECT COUNT(*) FROM canvas_placements cp
       WHERE cp.user_id = ? AND cp.note_id = ? AND cp.updated_at > cp.created_at)
      +
      (SELECT COUNT(*) FROM page_frame_extensions pfe
       WHERE pfe.user_id = ? AND pfe.note_id = ? AND pfe.updated_at > pfe.created_at)
    ) AS count
  `, noteId, userId, noteId, userId, noteId);
  const externalBlockPlacementCount = count(db, `
    SELECT COUNT(*) AS count
    FROM note_block_placements external
    WHERE external.note_id != ?
      AND external.block_id IN (
        SELECT block_id FROM note_block_placements WHERE note_id = ?
      )
  `, noteId, noteId);
  return {
    annotation_count: annotationCount,
    content_group_count: contentGroupCount,
    purpose_count: purposeCount,
    display_override_count: displayOverrideCount,
    external_block_placement_count: externalBlockPlacementCount,
    has_user_work: annotationCount
      + contentGroupCount
      + purposeCount
      + displayOverrideCount
      + externalBlockPlacementCount > 0,
  };
}

function projectionsOwnedByCourse(
  db: Database.Database,
  userId: string,
  courseId: string,
): ProjectionRow[] {
  return db.prepare(`
    SELECT
      sr.id AS source_record_id,
      sr.display_name,
      sm.id AS materialization_id,
      sm.projection_note_id,
      (
        SELECT COUNT(*)
        FROM source_project_placements other
        WHERE other.source_record_id = sr.id
          AND other.user_id = sr.user_id
          AND other.course_id != ?
      ) AS other_placement_count
    FROM source_records sr
    JOIN source_materializations sm
      ON sm.source_record_id = sr.id AND sm.user_id = sr.user_id
    JOIN notes n
      ON n.id = sm.projection_note_id AND n.user_id = sm.user_id
    WHERE sr.user_id = ?
      AND n.course_id = ?
      AND n.note_class = 'source_projection'
    ORDER BY sr.created_at ASC, sr.id ASC
  `).all(courseId, userId, courseId) as ProjectionRow[];
}

export function getProjectDeletionImpact(
  db: Database.Database,
  userId: string,
  courseId: string,
): ProjectDeletionImpact {
  const course = ownedCourse(db, userId, courseId);
  assertCourseCanDelete(course);
  const projections = projectionsOwnedByCourse(db, userId, courseId).map((projection) => ({
    ...projection,
    other_placement_count: Number(projection.other_placement_count || 0),
    user_work: getProjectionUserWork(db, userId, projection.projection_note_id),
  }));
  const sourcePlacementCount = count(
    db,
    'SELECT COUNT(*) AS count FROM source_project_placements WHERE user_id = ? AND course_id = ?',
    userId,
    courseId,
  );
  const protectedProjection = projections.some((projection) => (
    projection.user_work.has_user_work || projection.other_placement_count > 0
  ));
  return {
    project: { id: course.id, name: course.name },
    source_placement_count: sourcePlacementCount,
    source_projection_count: projections.length,
    projection_user_work_count: projections.filter((projection) => projection.user_work.has_user_work).length,
    other_placement_source_count: projections.filter((projection) => projection.other_placement_count > 0).length,
    recommended_action: protectedProjection ? 'move_to_home' : 'delete_projection',
    projections,
  };
}

function projectionGroupIds(db: Database.Database, userId: string, noteId: string): string[] {
  return (db.prepare(`
    WITH RECURSIVE group_tree(id) AS (
      SELECT id FROM content_groups WHERE user_id = ? AND note_id = ?
      UNION
      SELECT child.id
      FROM content_groups child
      JOIN group_tree parent ON child.parent_group_id = parent.id
      WHERE child.user_id = ?
    )
    SELECT id FROM group_tree
  `).all(userId, noteId, userId) as Array<{ id: string }>).map((row) => row.id);
}

function updateByIds(
  db: Database.Database,
  table: string,
  idColumn: string,
  ids: string[],
  homeCourseId: string,
): void {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(', ');
  db.prepare(`UPDATE ${table} SET course_id = ? WHERE ${idColumn} IN (${placeholders})`)
    .run(homeCourseId, ...ids);
}

function moveProjectionToHome(
  db: Database.Database,
  userId: string,
  projection: ProjectionRow,
  homeCourseId: string,
): void {
  const noteId = projection.projection_note_id;
  const sourceCourseId = (db.prepare('SELECT course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { course_id: string }).course_id;
  const blockIds = (db.prepare(`
    SELECT block_id FROM note_block_placements WHERE note_id = ?
  `).all(noteId) as Array<{ block_id: string }>).map((row) => row.block_id);
  const groupIds = projectionGroupIds(db, userId, noteId);
  const operationBatchIds = new Set<string>((db.prepare(`
    SELECT operation_batch_id AS id FROM notes WHERE id = ? AND operation_batch_id IS NOT NULL
    UNION
    SELECT operation_batch_id AS id FROM note_blocks
    WHERE id IN (SELECT block_id FROM note_block_placements WHERE note_id = ?)
      AND operation_batch_id IS NOT NULL
    UNION
    SELECT id FROM operation_batches
    WHERE user_id = ? AND source_type = 'source_materialization' AND source_id = ?
  `).all(noteId, noteId, userId, projection.materialization_id) as Array<{ id: string }>).map((row) => row.id));

  for (const table of [
    'annotation_truths',
    'annotation_ranges',
    'canvas_objects',
    'canvas_placements',
    'canvas_page_collections',
    'content_mounts',
    'page_frame_extensions',
    'image_object_extensions',
    'structured_object_extensions',
    'visual_connector_extensions',
    'purposes',
  ]) {
    db.prepare(`UPDATE ${table} SET course_id = ? WHERE user_id = ? AND note_id = ?`)
      .run(homeCourseId, userId, noteId);
  }
  db.prepare('UPDATE canvas_viewport_states SET course_id = ? WHERE user_id = ? AND canvas_id = ?')
    .run(homeCourseId, userId, noteId);
  db.prepare(`
    UPDATE group_folders
    SET course_id = ?,
        scope_project_id = CASE WHEN scope_project_id = ? THEN ? ELSE scope_project_id END
    WHERE user_id = ? AND (note_id = ? OR scope_note_id = ?)
  `).run(homeCourseId, sourceCourseId, homeCourseId, userId, noteId, noteId);
  db.prepare('UPDATE canvas_assets SET course_id = ? WHERE user_id = ? AND origin_note_id = ?')
    .run(homeCourseId, userId, noteId);

  updateByIds(db, 'note_blocks', 'id', blockIds, homeCourseId);
  updateByIds(db, 'content_groups', 'id', groupIds, homeCourseId);
  updateByIds(db, 'content_group_members', 'content_group_id', groupIds, homeCourseId);
  updateByIds(db, 'content_group_fragments', 'content_group_id', groupIds, homeCourseId);
  updateByIds(db, 'content_group_petals', 'content_group_id', groupIds, homeCourseId);
  updateByIds(db, 'operation_batches', 'id', [...operationBatchIds], homeCourseId);
  db.prepare('UPDATE notes SET course_id = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(homeCourseId, noteId, userId);
  db.prepare(`
    INSERT INTO source_project_placements (id, source_record_id, course_id, user_id, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(source_record_id, course_id) DO NOTHING
  `).run(uuidv4(), projection.source_record_id, homeCourseId, userId);
}

export function deleteProjectWithSourcePolicy(
  db: Database.Database,
  userId: string,
  courseId: string,
  requestedAction?: ProjectProjectionAction,
  cleanupOptions: ManagedFileCleanupOptions = {},
) {
  assertCourseLifecyclePolicyCoverage(db);
  const impact = getProjectDeletionImpact(db, userId, courseId);
  const action = requestedAction || impact.recommended_action;
  if (!['delete_projection', 'move_to_home'].includes(action)) {
    throw new AppError(400, 'Invalid Source projection action');
  }

  const cleanupTasks: ManagedFileTask[] = [];
  let homeCourseId: string | null = null;
  db.transaction(() => {
    if (action === 'move_to_home' && impact.projections.length) {
      homeCourseId = ensureHomeCourse(db, userId).id;
      for (const projection of impact.projections) {
        moveProjectionToHome(db, userId, projection, homeCourseId);
      }
    } else if (action === 'delete_projection') {
      for (const projection of impact.projections) {
        cleanupTasks.push(...releaseNoteCanvasAssets(db, userId, projection.projection_note_id));
        db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ? AND note_class = \'source_projection\'')
          .run(projection.projection_note_id, userId);
      }
    }

    const courseAssetDecision = releaseCourseCanvasAssets(db, userId, courseId);
    cleanupTasks.push(...courseAssetDecision.cleanup_tasks);
    db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(courseId, userId);
  })();

  const cleanup = finalizeCanvasAssetCleanup(db, cleanupTasks, cleanupOptions);
  return {
    project_id: courseId,
    action,
    home_course_id: homeCourseId,
    moved_projection_count: action === 'move_to_home' ? impact.projections.length : 0,
    deleted_projection_count: action === 'delete_projection' ? impact.projections.length : 0,
    source_records_deleted: 0,
    cleanup_jobs_created: cleanup.filter((result) => !result.completed).length,
  };
}
