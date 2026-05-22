import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

interface DocumentRow {
  id: string;
  user_id: string;
  course_id: string;
  filename: string;
  parse_status: string;
  extracted_text: string | null;
  page_count: number | null;
  document_type: string | null;
  chunk_count: number | null;
  error_message: string | null;
}

interface SourceMaterialRow {
  id: string;
  user_id: string;
  course_id: string;
  document_id: string;
  title: string;
  parse_status: string;
  fragment_status: string;
  segment_status: string;
  proposal_status: string;
  used_in_note_count: number;
  warnings_json: string;
  metadata: string;
}

interface DocumentChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
  heading: string | null;
}

interface SourceFragmentRow {
  id: string;
  user_id: string;
  course_id: string;
  source_material_id: string;
  document_id: string;
  document_chunk_id: string | null;
  fragment_type: string;
  title: string | null;
  content: string;
  page_start: number | null;
  page_end: number | null;
  order_index: number;
  confidence: number | null;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function warningsForDocument(document: DocumentRow): string[] {
  const warnings: string[] = [];
  if (document.parse_status === 'failed') {
    warnings.push(document.error_message || 'Document parsing failed.');
  }
  if (document.parse_status === 'pending' || document.parse_status === 'parsing') {
    warnings.push('Document is not fully parsed yet.');
  }
  if (document.parse_status === 'completed' && !document.extracted_text && (document.chunk_count || 0) === 0) {
    warnings.push('Document has no extracted text or chunks.');
  }
  return warnings;
}

function materialFragmentStatus(document: DocumentRow, fragmentCount: number): string {
  if (document.parse_status === 'failed') return 'failed';
  if (document.parse_status !== 'completed') return 'not_started';
  return fragmentCount > 0 || document.extracted_text ? 'ready' : 'needs_review';
}

function hydrateMaterial(row: any) {
  return {
    ...row,
    warnings: parseJson<string[]>(row.warnings_json, []),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function hydrateFragment(row: any) {
  return {
    ...row,
    warnings: parseJson<string[]>(row.warnings_json, []),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function hydrateSegment(row: any) {
  return {
    ...row,
    warnings: parseJson<string[]>(row.warnings_json, []),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

export function syncCourseMaterials(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) return;

  const documents = db.prepare('SELECT * FROM documents WHERE user_id = ? AND course_id = ? ORDER BY created_at ASC')
    .all(userId, courseId) as DocumentRow[];

  const insertMaterial = db.prepare(`
    INSERT INTO source_materials (
      id, user_id, course_id, document_id, title, parse_status, fragment_status,
      warnings_json, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateMaterial = db.prepare(`
    UPDATE source_materials
    SET title = ?, parse_status = ?, fragment_status = ?, warnings_json = ?, updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  for (const document of documents) {
    const existing = db.prepare('SELECT * FROM source_materials WHERE user_id = ? AND document_id = ?')
      .get(userId, document.id) as SourceMaterialRow | undefined;
    const warnings = warningsForDocument(document);
    const fragmentCount = existing
      ? (db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE source_material_id = ?')
        .get(existing.id) as { count: number }).count
      : 0;
    const fragmentStatus = materialFragmentStatus(document, fragmentCount);

    if (existing) {
      updateMaterial.run(document.filename, document.parse_status, fragmentStatus, JSON.stringify(warnings), now, existing.id);
      ensureFragmentsForMaterial(db, userId, courseId, existing.id, document);
    } else {
      const materialId = uuidv4();
      insertMaterial.run(
        materialId,
        userId,
        courseId,
        document.id,
        document.filename,
        document.parse_status,
        fragmentStatus,
        JSON.stringify(warnings),
        JSON.stringify({ document_type: document.document_type, page_count: document.page_count }),
        now,
        now
      );
      ensureFragmentsForMaterial(db, userId, courseId, materialId, document);
    }
  }
}

export function ensureFragmentsForMaterial(
  db: Database.Database,
  userId: string,
  courseId: string,
  sourceMaterialId: string,
  document: DocumentRow
): void {
  if (document.parse_status !== 'completed') return;

  const chunks = db.prepare('SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC')
    .all(document.id) as DocumentChunkRow[];
  const insertFragment = db.prepare(`
    INSERT INTO source_fragments (
      id, user_id, course_id, source_material_id, document_id, document_chunk_id,
      fragment_type, title, content, page_start, page_end, order_index, confidence,
      warnings_json, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  if (chunks.length > 0) {
    for (const chunk of chunks) {
      const exists = db.prepare('SELECT id FROM source_fragments WHERE document_chunk_id = ?').get(chunk.id);
      if (exists) continue;
      const fragmentType = chunk.heading ? 'heading' : (chunk.page_start || chunk.page_end ? 'page_range' : 'chunk');
      insertFragment.run(
        uuidv4(),
        userId,
        courseId,
        sourceMaterialId,
        document.id,
        chunk.id,
        fragmentType,
        chunk.heading,
        chunk.content,
        chunk.page_start,
        chunk.page_end,
        chunk.chunk_index,
        0.8,
        JSON.stringify([]),
        JSON.stringify({ chunk_index: chunk.chunk_index }),
        now,
        now
      );
    }
  } else if (document.extracted_text) {
    const exists = db.prepare(
      "SELECT id FROM source_fragments WHERE source_material_id = ? AND document_id = ? AND document_chunk_id IS NULL AND fragment_type = 'document'"
    ).get(sourceMaterialId, document.id);
    if (!exists) {
      insertFragment.run(
        uuidv4(),
        userId,
        courseId,
        sourceMaterialId,
        document.id,
        null,
        'document',
        document.filename,
        document.extracted_text,
        null,
        document.page_count,
        0,
        0.6,
        JSON.stringify([]),
        JSON.stringify({ document_type: document.document_type }),
        now,
        now
      );
    }
  }

  const count = (db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE source_material_id = ?')
    .get(sourceMaterialId) as { count: number }).count;
  const status = materialFragmentStatus(document, count);
  db.prepare('UPDATE source_materials SET fragment_status = ?, updated_at = ? WHERE id = ?')
    .run(status, now, sourceMaterialId);
}

export function listCourseMaterials(db: Database.Database, userId: string, courseId: string) {
  syncCourseMaterials(db, userId, courseId);
  return db.prepare(`
    SELECT
      sm.*,
      d.file_type,
      d.file_size,
      d.page_count,
      d.document_type,
      d.chunk_count,
      d.error_message,
      (SELECT COUNT(*) FROM source_fragments sf WHERE sf.source_material_id = sm.id) AS fragment_count,
      (SELECT COUNT(*) FROM material_segments ms WHERE ms.source_material_id = sm.id) AS segment_count
    FROM source_materials sm
    JOIN documents d ON d.id = sm.document_id
    WHERE sm.user_id = ? AND sm.course_id = ?
    ORDER BY d.created_at DESC
  `).all(userId, courseId).map(hydrateMaterial);
}

export function getOwnedSourceMaterial(db: Database.Database, userId: string, sourceMaterialId: string) {
  return db.prepare('SELECT * FROM source_materials WHERE id = ? AND user_id = ?')
    .get(sourceMaterialId, userId) as SourceMaterialRow | undefined;
}

export function listSourceFragments(db: Database.Database, userId: string, sourceMaterialId: string) {
  const material = getOwnedSourceMaterial(db, userId, sourceMaterialId);
  if (!material) return null;
  const document = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(material.document_id, userId) as DocumentRow | undefined;
  if (document) ensureFragmentsForMaterial(db, userId, material.course_id, material.id, document);

  return db.prepare(`
    SELECT * FROM source_fragments
    WHERE user_id = ? AND source_material_id = ?
    ORDER BY order_index ASC
  `).all(userId, sourceMaterialId).map(hydrateFragment);
}

function segmentExists(db: Database.Database, sourceMaterialId: string, segmentType: string, title: string): boolean {
  const existing = db.prepare(`
    SELECT id FROM material_segments
    WHERE source_material_id = ? AND segment_type = ? AND title = ? AND status != 'discarded'
  `).get(sourceMaterialId, segmentType, title);
  return Boolean(existing);
}

function createSegment(
  db: Database.Database,
  material: SourceMaterialRow,
  segmentType: string,
  title: string,
  fragments: SourceFragmentRow[],
  orderIndex: number,
  summary: string | null,
  confidence: number
): void {
  if (segmentExists(db, material.id, segmentType, title)) return;

  const segmentId = uuidv4();
  const now = new Date().toISOString();
  const pageStarts = fragments
    .map((fragment) => fragment.page_start)
    .filter((page): page is number => typeof page === 'number');
  const pageEnds = fragments
    .map((fragment) => fragment.page_end)
    .filter((page): page is number => typeof page === 'number');

  db.prepare(`
    INSERT INTO material_segments (
      id, user_id, course_id, source_material_id, segment_type, title, summary,
      status, order_index, page_start, page_end, confidence, warnings_json,
      metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    segmentId,
    material.user_id,
    material.course_id,
    material.id,
    segmentType,
    title,
    summary,
    orderIndex,
    pageStarts.length > 0 ? Math.min(...pageStarts) : null,
    pageEnds.length > 0 ? Math.max(...pageEnds) : null,
    confidence,
    JSON.stringify([]),
    JSON.stringify({ fragment_count: fragments.length }),
    now,
    now
  );

  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO material_segment_fragments (segment_id, fragment_id, order_index)
    VALUES (?, ?, ?)
  `);
  fragments.forEach((fragment, index) => {
    insertLink.run(segmentId, fragment.id, index);
  });
}

export function ensureSegmentsForMaterial(db: Database.Database, userId: string, sourceMaterialId: string): void {
  const material = getOwnedSourceMaterial(db, userId, sourceMaterialId);
  if (!material || material.fragment_status !== 'ready') return;

  const fragments = listSourceFragments(db, userId, sourceMaterialId) as SourceFragmentRow[] | null;
  if (!fragments || fragments.length === 0) return;

  let orderIndex = (db.prepare(`
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
    FROM material_segments
    WHERE source_material_id = ?
  `).get(sourceMaterialId) as { next_order: number }).next_order;

  createSegment(
    db,
    material,
    'document',
    material.title,
    fragments,
    orderIndex++,
    `Full source material: ${material.title}`,
    0.65
  );

  const headingGroups = new Map<string, SourceFragmentRow[]>();
  for (const fragment of fragments) {
    if (fragment.title && fragment.title.trim()) {
      const title = fragment.title.trim();
      headingGroups.set(title, [...(headingGroups.get(title) || []), fragment]);
    }
  }
  for (const [title, group] of headingGroups) {
    createSegment(db, material, 'heading', title, group, orderIndex++, null, 0.8);
  }

  const pageRangeFragments = fragments.filter((fragment) => fragment.page_start || fragment.page_end);
  for (const fragment of pageRangeFragments) {
    const start = fragment.page_start;
    const end = fragment.page_end;
    const title = start && end && start !== end
      ? `Pages ${start}-${end}`
      : `Page ${start || end}`;
    createSegment(db, material, 'page_range', title, [fragment], orderIndex++, null, 0.75);
  }

  for (let i = 0; i < fragments.length; i += 5) {
    const group = fragments.slice(i, i + 5);
    const title = group.length === 1
      ? `Fragment ${group[0].order_index + 1}`
      : `Fragments ${group[0].order_index + 1}-${group[group.length - 1].order_index + 1}`;
    createSegment(db, material, 'chunk_group', title, group, orderIndex++, null, 0.7);
  }

  const segmentCount = (db.prepare('SELECT COUNT(*) AS count FROM material_segments WHERE source_material_id = ?')
    .get(sourceMaterialId) as { count: number }).count;
  if (segmentCount > 0) {
    db.prepare("UPDATE source_materials SET segment_status = 'proposed', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), sourceMaterialId);
  }
}

export function listMaterialSegments(db: Database.Database, userId: string, sourceMaterialId: string) {
  const material = getOwnedSourceMaterial(db, userId, sourceMaterialId);
  if (!material) return null;
  ensureSegmentsForMaterial(db, userId, sourceMaterialId);
  return db.prepare(`
    SELECT * FROM material_segments
    WHERE user_id = ? AND source_material_id = ?
    ORDER BY order_index ASC
  `).all(userId, sourceMaterialId).map(hydrateSegment);
}
