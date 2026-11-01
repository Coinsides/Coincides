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

export interface SourceMaterialRow {
  id: string;
  user_id: string;
  course_id: string;
  document_id: string | null;
  source_record_id: string | null;
  source_placement_id: string | null;
  source_type: string;
  title: string;
  status: string;
  parse_status: string;
  fragment_status: string;
  segment_status: string;
  proposal_status: string;
  used_in_note_count: number;
  confidence: number | null;
  warnings_json: string;
  metadata: string;
  created_at: string | null;
  updated_at: string | null;
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
  document_id: string | null;
  document_chunk_id: string | null;
  source_record_id: string | null;
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

  syncSourceMaterials(db, userId, courseId);
}

interface SourcePlacementRow {
  placement_id: string;
  source_record_id: string;
  display_name: string;
  materialization_status: string;
  projection_note_id: string | null;
  attempt_count: number;
  error_message: string | null;
}

interface ProjectionBlockRow {
  id: string;
  block_type: string;
  title: string | null;
  plain_text: string | null;
  metadata: string | null;
}

// A Source placed in a Project is that Project's material once extraction is ready.
function sourceParseStatus(row: SourcePlacementRow): string {
  if (row.materialization_status === 'materialized') return 'completed';
  if (row.materialization_status === 'failed') return 'failed';
  return 'pending';
}

function sourceWarnings(row: SourcePlacementRow): string[] {
  if (row.materialization_status === 'failed') return [row.error_message || 'Source extraction failed.'];
  if (row.materialization_status !== 'materialized') return ['Source is not fully extracted yet.'];
  return [];
}

// The projection a material's fragments were built from; a rebuilt projection
// (new attempt) makes them stale.
function projectionStamp(row: SourcePlacementRow): string | null {
  return row.projection_note_id ? `${row.projection_note_id}:${row.attempt_count}` : null;
}

function syncSourceMaterials(db: Database.Database, userId: string, courseId: string): void {
  const placements = db.prepare(`
    SELECT
      spp.id AS placement_id,
      sr.id AS source_record_id,
      sr.display_name,
      sm.status AS materialization_status,
      sm.projection_note_id,
      sm.attempt_count,
      sm.error_message
    FROM source_project_placements spp
    JOIN source_records sr ON sr.id = spp.source_record_id AND sr.user_id = spp.user_id
    JOIN source_materializations sm ON sm.source_record_id = sr.id AND sm.user_id = sr.user_id
    WHERE spp.user_id = ? AND spp.course_id = ?
    ORDER BY spp.created_at ASC
  `).all(userId, courseId) as SourcePlacementRow[];

  const now = new Date().toISOString();
  for (const placement of placements) {
    const existing = db.prepare('SELECT * FROM source_materials WHERE user_id = ? AND source_placement_id = ?')
      .get(userId, placement.placement_id) as SourceMaterialRow | undefined;
    const parseStatus = sourceParseStatus(placement);
    const warnings = JSON.stringify(sourceWarnings(placement));
    let materialId = existing?.id;
    if (existing) {
      db.prepare(`
        UPDATE source_materials SET title = ?, parse_status = ?, warnings_json = ?, updated_at = ? WHERE id = ?
      `).run(placement.display_name, parseStatus, warnings, now, existing.id);
    } else {
      materialId = uuidv4();
      db.prepare(`
        INSERT INTO source_materials (
          id, user_id, course_id, source_record_id, source_placement_id, source_type, title,
          parse_status, fragment_status, warnings_json, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'source', ?, ?, 'not_started', ?, '{}', ?, ?)
      `).run(materialId, userId, courseId, placement.source_record_id, placement.placement_id,
        placement.display_name, parseStatus, warnings, now, now);
    }
    ensureSourceFragmentsForMaterial(db, userId, courseId, materialId!, placement);
  }
}

function ensureSourceFragmentsForMaterial(
  db: Database.Database,
  userId: string,
  courseId: string,
  sourceMaterialId: string,
  placement: SourcePlacementRow,
): void {
  const now = new Date().toISOString();
  const stamp = projectionStamp(placement);
  const material = db.prepare('SELECT metadata FROM source_materials WHERE id = ?').get(sourceMaterialId) as { metadata: string };
  const builtFrom = parseJson<Record<string, unknown>>(material.metadata, {}).projection_stamp ?? null;
  if (stamp !== null && builtFrom === stamp) return;

  // Rebuilding the projection replaces its blocks, so fragments and the segments
  // grouped from them are rebuilt as well; accepted segment state does not carry over.
  db.prepare('DELETE FROM material_segments WHERE source_material_id = ?').run(sourceMaterialId);
  db.prepare('DELETE FROM source_fragments WHERE source_material_id = ?').run(sourceMaterialId);

  if (stamp && placement.materialization_status === 'materialized') {
    const blocks = db.prepare(`
      SELECT b.id, b.block_type, b.title, b.plain_text, b.metadata
      FROM note_block_placements p
      JOIN note_blocks b ON b.id = p.block_id
      WHERE p.note_id = ? AND b.user_id = ? AND b.status = 'active'
      ORDER BY p.order_index ASC
    `).all(placement.projection_note_id, userId) as ProjectionBlockRow[];
    const insertFragment = db.prepare(`
      INSERT INTO source_fragments (
        id, user_id, course_id, source_material_id, source_record_id, note_block_id,
        fragment_type, title, content, page_start, page_end, order_index, confidence,
        warnings_json, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.8, '[]', ?, ?, ?)
    `);
    // One fragment per projection block; headings title the blocks under them.
    let heading: string | null = null;
    let orderIndex = 0;
    for (const block of blocks) {
      const text = (block.plain_text || '').trim();
      if (!text) continue;
      if (block.block_type === 'heading') heading = (block.title || text).trim();
      const metadata = parseJson<Record<string, unknown>>(block.metadata, {});
      const page = typeof metadata.source_page_index === 'number' ? metadata.source_page_index : null;
      insertFragment.run(
        uuidv4(), userId, courseId, sourceMaterialId, placement.source_record_id, block.id,
        page === null ? 'chunk' : 'page_range', heading, text, page, page, orderIndex++,
        JSON.stringify({ source_locator: metadata.source_locator ?? null, artifact_block_id: metadata.artifact_block_id ?? null }),
        now, now,
      );
    }
  }

  const count = (db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE source_material_id = ?')
    .get(sourceMaterialId) as { count: number }).count;
  const fragmentStatus = placement.materialization_status === 'failed'
    ? 'failed'
    : placement.materialization_status !== 'materialized'
      ? 'not_started'
      : count > 0 ? 'ready' : 'needs_review';
  db.prepare(`
    UPDATE source_materials
    SET fragment_status = ?, segment_status = 'not_started', metadata = json_set(metadata, '$.projection_stamp', ?), updated_at = ?
    WHERE id = ?
  `).run(fragmentStatus, stamp, now, sourceMaterialId);
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
    LEFT JOIN documents d ON d.id = sm.document_id
    WHERE sm.user_id = ? AND sm.course_id = ?
    ORDER BY COALESCE(d.created_at, sm.created_at) DESC
  `).all(userId, courseId).map(hydrateMaterial);
}

export function findOwnedSourceMaterial(db: Database.Database, userId: string, sourceMaterialId: string): SourceMaterialRow | undefined {
  return db.prepare('SELECT * FROM source_materials WHERE id = ? AND user_id = ?')
    .get(sourceMaterialId, userId) as SourceMaterialRow | undefined;
}

export function listSourceFragments(db: Database.Database, userId: string, sourceMaterialId: string) {
  const material = findOwnedSourceMaterial(db, userId, sourceMaterialId);
  if (!material) return null;
  if (material.document_id) {
    const document = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
      .get(material.document_id, userId) as DocumentRow | undefined;
    if (document) ensureFragmentsForMaterial(db, userId, material.course_id, material.id, document);
  } else {
    syncSourceMaterials(db, userId, material.course_id);
  }

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
  const material = findOwnedSourceMaterial(db, userId, sourceMaterialId);
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
  const material = findOwnedSourceMaterial(db, userId, sourceMaterialId);
  if (!material) return null;
  ensureSegmentsForMaterial(db, userId, sourceMaterialId);
  return db.prepare(`
    SELECT * FROM material_segments
    WHERE user_id = ? AND source_material_id = ?
    ORDER BY order_index ASC
  `).all(userId, sourceMaterialId).map(hydrateSegment);
}
