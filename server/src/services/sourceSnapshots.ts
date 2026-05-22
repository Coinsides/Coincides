import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { listCourseMaterials } from './courseMaterials.js';

interface GenerateSourceSnapshotsInput {
  course_id: string;
  document_id?: string;
  source_material_id?: string;
}

interface SourceMaterialRow {
  id: string;
  user_id: string;
  course_id: string;
  document_id: string;
  title: string | null;
  status: string;
}

interface DocumentRow {
  id: string;
  user_id: string;
  course_id: string;
  filename: string;
  parse_status: string;
  page_count: number | null;
  chunk_count: number | null;
  extracted_text: string | null;
}

interface DocumentChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  heading: string | null;
  page_start: number | null;
  page_end: number | null;
}

function ensureCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function pageNumberForChunk(chunk: DocumentChunkRow, index: number): number {
  return typeof chunk.page_start === 'number' ? chunk.page_start : index + 1;
}

function pageLabelForChunk(chunk: DocumentChunkRow, pageNumber: number): string {
  if (typeof chunk.page_start === 'number' && typeof chunk.page_end === 'number' && chunk.page_end !== chunk.page_start) {
    return `p.${chunk.page_start}-${chunk.page_end}`;
  }
  return `p.${pageNumber}`;
}

function textForChunkGroup(chunks: DocumentChunkRow[]): string {
  return chunks
    .map((chunk) => {
      const heading = chunk.heading ? `${chunk.heading}\n` : '';
      return `${heading}${chunk.content || ''}`.trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

function getDocument(db: Database.Database, userId: string, courseId: string, documentId: string): DocumentRow | undefined {
  return db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(documentId, userId, courseId) as DocumentRow | undefined;
}

function chunksForDocument(db: Database.Database, documentId: string): DocumentChunkRow[] {
  return db.prepare('SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC')
    .all(documentId) as DocumentChunkRow[];
}

function snapshotRowsForCourse(
  db: Database.Database,
  userId: string,
  input: GenerateSourceSnapshotsInput,
): SourceMaterialRow[] {
  listCourseMaterials(db, userId, input.course_id);
  const conditions = ['sm.user_id = ?', 'sm.course_id = ?'];
  const params: unknown[] = [userId, input.course_id];
  if (input.document_id) {
    conditions.push('sm.document_id = ?');
    params.push(input.document_id);
  }
  if (input.source_material_id) {
    conditions.push('sm.id = ?');
    params.push(input.source_material_id);
  }
  return db.prepare(`
    SELECT sm.*
    FROM source_materials sm
    WHERE ${conditions.join(' AND ')}
    ORDER BY sm.created_at ASC
  `).all(...params) as SourceMaterialRow[];
}

function existingSnapshot(db: Database.Database, userId: string, sourceMaterialId: string): { id: string } | undefined {
  return db.prepare('SELECT id FROM source_snapshots WHERE user_id = ? AND source_material_id = ?')
    .get(userId, sourceMaterialId) as { id: string } | undefined;
}

function upsertSnapshot(
  db: Database.Database,
  userId: string,
  material: SourceMaterialRow,
  document: DocumentRow,
  chunkCount: number,
): string {
  const now = new Date().toISOString();
  const existing = existingSnapshot(db, userId, material.id);
  const snapshotId = existing?.id || uuidv4();
  const metadata = {
    source_material_status: material.status,
    parse_status: document.parse_status,
    generated_from: 'documents_and_document_chunks',
  };
  if (existing) {
    db.prepare(`
      UPDATE source_snapshots
      SET snapshot_kind = 'parsed_pages',
          status = 'ready',
          title = ?,
          source_filename = ?,
          page_count = ?,
          chunk_count = ?,
          metadata = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      material.title || document.filename,
      document.filename,
      document.page_count,
      chunkCount,
      JSON.stringify(metadata),
      now,
      snapshotId,
      userId,
    );
  } else {
    db.prepare(`
      INSERT INTO source_snapshots (
        id, user_id, course_id, source_material_id, document_id, snapshot_kind,
        status, title, source_filename, page_count, chunk_count, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'parsed_pages', 'ready', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshotId,
      userId,
      material.course_id,
      material.id,
      document.id,
      material.title || document.filename,
      document.filename,
      document.page_count,
      chunkCount,
      JSON.stringify(metadata),
      now,
      now,
    );
  }
  db.prepare('DELETE FROM source_snapshot_pages WHERE source_snapshot_id = ? AND user_id = ?')
    .run(snapshotId, userId);
  return snapshotId;
}

function insertSnapshotPages(
  db: Database.Database,
  userId: string,
  courseId: string,
  snapshotId: string,
  document: DocumentRow,
  chunks: DocumentChunkRow[],
): number {
  const now = new Date().toISOString();
  const groups = new Map<number, DocumentChunkRow[]>();
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      const pageNumber = pageNumberForChunk(chunk, index);
      groups.set(pageNumber, [...(groups.get(pageNumber) || []), chunk]);
    });
  } else if (document.extracted_text?.trim()) {
    groups.set(1, [{
      id: document.id,
      document_id: document.id,
      chunk_index: 0,
      content: document.extracted_text,
      heading: null,
      page_start: 1,
      page_end: document.page_count || 1,
    }]);
  }

  const insert = db.prepare(`
    INSERT INTO source_snapshot_pages (
      id, user_id, course_id, source_snapshot_id, document_id, page_number,
      page_label, text_content, chunk_ids, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const [pageNumber, pageChunks] of Array.from(groups.entries()).sort(([a], [b]) => a - b)) {
    const pageEnd = pageChunks.reduce<number | null>((max, chunk) => {
      if (typeof chunk.page_end !== 'number') return max;
      return max === null ? chunk.page_end : Math.max(max, chunk.page_end);
    }, null);
    const metadata = {
      chunk_indexes: pageChunks.map((chunk) => chunk.chunk_index),
      page_start: pageNumber,
      page_end: pageEnd || pageNumber,
    };
    insert.run(
      uuidv4(),
      userId,
      courseId,
      snapshotId,
      document.id,
      pageNumber,
      pageLabelForChunk(pageChunks[0], pageNumber),
      textForChunkGroup(pageChunks),
      JSON.stringify(pageChunks.map((chunk) => chunk.id)),
      JSON.stringify(metadata),
      now,
      now,
    );
    count += 1;
  }
  return count;
}

export function generateSourceSnapshots(
  db: Database.Database,
  userId: string,
  input: GenerateSourceSnapshotsInput,
) {
  if (!input.course_id) throw new AppError(400, 'course_id is required');
  ensureCourse(db, userId, input.course_id);
  const materials = snapshotRowsForCourse(db, userId, input);
  const warnings: string[] = [];
  let generatedCount = 0;
  let pagesGenerated = 0;

  const generate = db.transaction(() => {
    for (const material of materials) {
      const document = getDocument(db, userId, input.course_id, material.document_id);
      if (!document) {
        warnings.push(`Source material ${material.id} has no accessible document.`);
        continue;
      }
      if (document.parse_status !== 'completed') {
        warnings.push(`${document.filename} is ${document.parse_status}; snapshot generation skipped.`);
        continue;
      }
      const chunks = chunksForDocument(db, document.id);
      if (chunks.length === 0 && !document.extracted_text?.trim()) {
        warnings.push(`${document.filename} has no parsed text available for snapshot generation.`);
        continue;
      }
      const snapshotId = upsertSnapshot(db, userId, material, document, chunks.length);
      pagesGenerated += insertSnapshotPages(db, userId, input.course_id, snapshotId, document, chunks);
      generatedCount += 1;
    }
  });
  generate();

  return {
    generated_count: generatedCount,
    pages_generated_count: pagesGenerated,
    warnings,
  };
}

export function listSourceSnapshots(db: Database.Database, userId: string, courseId: string) {
  if (!courseId) throw new AppError(400, 'course_id query parameter is required');
  ensureCourse(db, userId, courseId);
  return db.prepare(`
    SELECT *
    FROM source_snapshots
    WHERE user_id = ? AND course_id = ?
    ORDER BY updated_at DESC, created_at DESC
  `).all(userId, courseId);
}

export function getSourceSnapshot(db: Database.Database, userId: string, snapshotId: string) {
  const snapshot = db.prepare('SELECT * FROM source_snapshots WHERE id = ? AND user_id = ?')
    .get(snapshotId, userId) as any;
  if (!snapshot) throw new AppError(404, 'Source snapshot not found');
  const snapshotMetadata = parseJson<{ warnings?: string[] }>(snapshot.metadata, {});
  const pages = db.prepare(`
    SELECT *
    FROM source_snapshot_pages
    WHERE source_snapshot_id = ? AND user_id = ?
    ORDER BY page_number ASC
  `).all(snapshotId, userId).map((page: any) => ({
    ...page,
    metadata: parseJson(page.metadata, {}),
  }));
  return {
    snapshot: {
      ...snapshot,
      metadata: snapshotMetadata,
    },
    pages,
    warnings: snapshotMetadata.warnings || [],
  };
}

export function listSourceSnapshotPages(db: Database.Database, userId: string, snapshotId: string) {
  const detail = getSourceSnapshot(db, userId, snapshotId);
  return {
    pages: detail.pages,
    warnings: detail.warnings,
  };
}
