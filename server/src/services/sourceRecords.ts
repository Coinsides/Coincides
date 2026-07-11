import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

type OriginEntryKind = 'project_upload' | 'library_upload' | 'import';
type StorageState = 'staging' | 'ready';

interface SourceRecordRow {
  id: string;
  user_id: string;
  display_name: string;
  origin_course_id: string | null;
  origin_course_name_snapshot: string | null;
  origin_entry_kind: OriginEntryKind;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface SourceFileRow {
  id: string;
  source_record_id: string;
  user_id: string;
  original_filename: string;
  storage_key: string;
  storage_state: StorageState;
  mime_type: string;
  byte_size: number;
  content_hash: string;
  file_mtime: string | null;
  uploaded_at: string;
  created_at: string;
}

interface SourceMaterializationRow {
  id: string;
  source_record_id: string;
  source_file_id: string;
  user_id: string;
  parser_key: string;
  parser_version: string;
  status: 'received' | 'parsing' | 'publishing' | 'materialized' | 'failed';
  attempt_count: number;
  projection_note_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SourceProjectPlacementRow {
  id: string;
  source_record_id: string;
  course_id: string;
  user_id: string;
  created_at: string;
}

interface CreateSourceIdentityFloorInput {
  course_id: string;
  display_name: string;
  origin_entry_kind?: OriginEntryKind;
  metadata?: Record<string, unknown>;
  file: {
    original_filename: string;
    storage_key: string;
    storage_state?: StorageState;
    mime_type: string;
    byte_size?: number;
    content_hash: string;
    file_mtime?: string | null;
    uploaded_at?: string;
  };
  materialization: {
    parser_key: string;
    parser_version: string;
  };
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, `${label} is required`);
  }
  return value.trim();
}

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function ownedCourse(
  db: Database.Database,
  userId: string,
  courseId: string,
): { id: string; name: string } {
  const course = db.prepare('SELECT id, name FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as { id: string; name: string } | undefined;
  if (!course) throw new AppError(404, 'Project not found');
  return course;
}

function ownedSourceRecord(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): SourceRecordRow {
  const record = db.prepare('SELECT * FROM source_records WHERE id = ? AND user_id = ?')
    .get(sourceRecordId, userId) as SourceRecordRow | undefined;
  if (!record) throw new AppError(404, 'Source not found');
  return record;
}

function hydrateSourceRecord(row: SourceRecordRow) {
  return {
    ...row,
    metadata: parseMetadata(row.metadata),
  };
}

function getSourceIdentityFloor(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
) {
  const sourceRecord = ownedSourceRecord(db, userId, sourceRecordId);
  const sourceFile = db.prepare(`
    SELECT * FROM source_files
    WHERE source_record_id = ? AND user_id = ?
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `).get(sourceRecordId, userId) as SourceFileRow | undefined;
  const materialization = db.prepare(`
    SELECT * FROM source_materializations
    WHERE source_record_id = ? AND user_id = ?
  `).get(sourceRecordId, userId) as SourceMaterializationRow | undefined;
  const placement = db.prepare(`
    SELECT * FROM source_project_placements
    WHERE source_record_id = ? AND user_id = ?
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `).get(sourceRecordId, userId) as SourceProjectPlacementRow | undefined;

  if (!sourceFile || !materialization || !placement) {
    throw new Error(`Incomplete Source identity floor for ${sourceRecordId}`);
  }

  return {
    source_record: hydrateSourceRecord(sourceRecord),
    source_file: sourceFile,
    materialization,
    placement,
  };
}

export function createSourceIdentityFloor(
  db: Database.Database,
  userId: string,
  input: CreateSourceIdentityFloorInput,
) {
  const course = ownedCourse(db, userId, input.course_id);
  const sourceRecordId = uuidv4();
  const sourceFileId = uuidv4();
  const materializationId = uuidv4();
  const placementId = uuidv4();
  const uploadedAt = input.file.uploaded_at || new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO source_records (
        id, user_id, display_name, origin_course_id, origin_course_name_snapshot,
        origin_entry_kind, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sourceRecordId,
      userId,
      requiredText(input.display_name, 'Source display name'),
      course.id,
      course.name,
      input.origin_entry_kind || 'project_upload',
      JSON.stringify(input.metadata || {}),
      uploadedAt,
      uploadedAt,
    );

    db.prepare(`
      INSERT INTO source_files (
        id, source_record_id, user_id, original_filename, storage_key, storage_state,
        mime_type, byte_size, content_hash, file_mtime, uploaded_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sourceFileId,
      sourceRecordId,
      userId,
      requiredText(input.file.original_filename, 'Source filename'),
      requiredText(input.file.storage_key, 'Source storage key'),
      input.file.storage_state || 'staging',
      requiredText(input.file.mime_type, 'Source MIME type'),
      Math.max(0, Math.trunc(input.file.byte_size || 0)),
      requiredText(input.file.content_hash, 'Source content hash'),
      input.file.file_mtime || null,
      uploadedAt,
      uploadedAt,
    );

    db.prepare(`
      INSERT INTO source_materializations (
        id, source_record_id, source_file_id, user_id, parser_key, parser_version,
        status, attempt_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'received', 0, ?, ?)
    `).run(
      materializationId,
      sourceRecordId,
      sourceFileId,
      userId,
      requiredText(input.materialization.parser_key, 'Source parser key'),
      requiredText(input.materialization.parser_version, 'Source parser version'),
      uploadedAt,
      uploadedAt,
    );

    db.prepare(`
      INSERT INTO source_project_placements (
        id, source_record_id, course_id, user_id, created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(placementId, sourceRecordId, course.id, userId, uploadedAt);
  })();

  return getSourceIdentityFloor(db, userId, sourceRecordId);
}

export function findSourceRecordByContentHash(
  db: Database.Database,
  userId: string,
  contentHash: string,
) {
  return (db.prepare(`
    SELECT
      sr.id AS source_record_id,
      sf.id AS source_file_id,
      sf.storage_state
    FROM source_files sf
    JOIN source_records sr
      ON sr.id = sf.source_record_id
      AND sr.user_id = sf.user_id
    WHERE sf.user_id = ? AND sf.content_hash = ?
  `).get(userId, contentHash) as {
    source_record_id: string;
    source_file_id: string;
    storage_state: StorageState;
  } | undefined) || null;
}

export function ensureSourceProjectPlacement(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  courseId: string,
) {
  ownedSourceRecord(db, userId, sourceRecordId);
  ownedCourse(db, userId, courseId);
  const placementId = uuidv4();
  const result = db.prepare(`
    INSERT INTO source_project_placements (
      id, source_record_id, course_id, user_id, created_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source_record_id, course_id) DO NOTHING
  `).run(placementId, sourceRecordId, courseId, userId, new Date().toISOString());

  const placement = db.prepare(`
    SELECT *
    FROM source_project_placements
    WHERE source_record_id = ? AND course_id = ? AND user_id = ?
  `).get(sourceRecordId, courseId, userId) as SourceProjectPlacementRow | undefined;
  if (!placement) throw new Error('Failed to ensure Source Project placement');

  return { placement, created: result.changes > 0 };
}
