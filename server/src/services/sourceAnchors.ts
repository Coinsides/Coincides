import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

type SourceAnchorTargetType = 'note_block' | 'note_block_source' | 'evidence_set' | 'evidence_item' | 'proposal';

interface GenerateSourceAnchorsInput {
  course_id: string;
  target_type?: SourceAnchorTargetType;
  target_id?: string;
}

interface ListSourceAnchorsInput {
  course_id: string;
  target_type?: SourceAnchorTargetType;
  target_id?: string;
}

interface AnchorCandidate {
  anchor_kind: 'note_block_source' | 'evidence_item';
  course_id: string;
  document_id: string | null;
  document_chunk_id: string | null;
  source_material_id: string | null;
  source_fragment_id: string | null;
  material_segment_id: string | null;
  page_start: number | null;
  page_end: number | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
  links: Array<{
    target_type: SourceAnchorTargetType;
    target_id: string;
    link_role: string;
  }>;
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

function isTargetType(value: unknown): value is SourceAnchorTargetType {
  return ['note_block', 'note_block_source', 'evidence_set', 'evidence_item', 'proposal'].includes(String(value));
}

function metadataString(value: Record<string, unknown>, key: string): string | null {
  const item = value[key];
  return typeof item === 'string' && item.length > 0 ? item : null;
}

function pageNumberForCandidate(db: Database.Database, candidate: AnchorCandidate): number | null {
  if (typeof candidate.page_start === 'number') return candidate.page_start;
  if (!candidate.document_chunk_id) return null;
  const chunk = db.prepare('SELECT page_start FROM document_chunks WHERE id = ?')
    .get(candidate.document_chunk_id) as { page_start: number | null } | undefined;
  return typeof chunk?.page_start === 'number' ? chunk.page_start : null;
}

function pageEndForCandidate(db: Database.Database, candidate: AnchorCandidate, pageStart: number | null): number | null {
  if (typeof candidate.page_end === 'number') return candidate.page_end;
  if (!candidate.document_chunk_id) return pageStart;
  const chunk = db.prepare('SELECT page_end FROM document_chunks WHERE id = ?')
    .get(candidate.document_chunk_id) as { page_end: number | null } | undefined;
  return typeof chunk?.page_end === 'number' ? chunk.page_end : pageStart;
}

function findSnapshot(db: Database.Database, userId: string, candidate: AnchorCandidate) {
  if (!candidate.document_id) return undefined;
  const params: unknown[] = [userId, candidate.course_id, candidate.document_id];
  const sourceMaterialClause = candidate.source_material_id ? ' AND source_material_id = ?' : '';
  if (candidate.source_material_id) params.push(candidate.source_material_id);
  return db.prepare(`
    SELECT *
    FROM source_snapshots
    WHERE user_id = ? AND course_id = ? AND document_id = ?${sourceMaterialClause}
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `).get(...params) as any;
}

function findSnapshotPage(db: Database.Database, userId: string, snapshotId: string, pageStart: number | null) {
  if (typeof pageStart === 'number') {
    const exact = db.prepare(`
      SELECT *
      FROM source_snapshot_pages
      WHERE user_id = ? AND source_snapshot_id = ? AND page_number = ?
    `).get(userId, snapshotId, pageStart) as any;
    if (exact) return exact;
  }
  return db.prepare(`
    SELECT *
    FROM source_snapshot_pages
    WHERE user_id = ? AND source_snapshot_id = ?
    ORDER BY page_number ASC
    LIMIT 1
  `).get(userId, snapshotId) as any;
}

function existingAnchor(db: Database.Database, userId: string, candidate: AnchorCandidate, snapshotId: string, pageId: string | null, pageStart: number | null, pageEnd: number | null) {
  return db.prepare(`
    SELECT *
    FROM source_anchors
    WHERE user_id = ?
      AND course_id = ?
      AND anchor_kind = ?
      AND source_snapshot_id = ?
      AND COALESCE(source_snapshot_page_id, '') = COALESCE(?, '')
      AND COALESCE(document_id, '') = COALESCE(?, '')
      AND COALESCE(document_chunk_id, '') = COALESCE(?, '')
      AND COALESCE(source_material_id, '') = COALESCE(?, '')
      AND COALESCE(source_fragment_id, '') = COALESCE(?, '')
      AND COALESCE(material_segment_id, '') = COALESCE(?, '')
      AND COALESCE(page_start, -1) = COALESCE(?, -1)
      AND COALESCE(page_end, -1) = COALESCE(?, -1)
    LIMIT 1
  `).get(
    userId,
    candidate.course_id,
    candidate.anchor_kind,
    snapshotId,
    pageId,
    candidate.document_id,
    candidate.document_chunk_id,
    candidate.source_material_id,
    candidate.source_fragment_id,
    candidate.material_segment_id,
    pageStart,
    pageEnd,
  ) as any;
}

function upsertLink(
  db: Database.Database,
  userId: string,
  courseId: string,
  anchorId: string,
  link: AnchorCandidate['links'][number],
): boolean {
  const existing = db.prepare(`
    SELECT id FROM source_anchor_links
    WHERE source_anchor_id = ? AND target_type = ? AND target_id = ?
  `).get(anchorId, link.target_type, link.target_id);
  if (existing) return false;
  db.prepare(`
    INSERT INTO source_anchor_links (
      id, user_id, course_id, source_anchor_id, target_type, target_id,
      link_role, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, '{}', datetime('now'), datetime('now'))
  `).run(uuidv4(), userId, courseId, anchorId, link.target_type, link.target_id, link.link_role);
  return true;
}

function insertOrReuseAnchor(
  db: Database.Database,
  userId: string,
  candidate: AnchorCandidate,
  snapshot: any,
  page: any,
  pageStart: number | null,
  pageEnd: number | null,
) {
  const existing = existingAnchor(db, userId, candidate, snapshot.id, page?.id || null, pageStart, pageEnd);
  if (existing) {
    return { anchor: existing, created: false };
  }
  const anchorId = uuidv4();
  db.prepare(`
    INSERT INTO source_anchors (
      id, user_id, course_id, source_snapshot_id, source_snapshot_page_id,
      document_id, document_chunk_id, source_material_id, source_fragment_id,
      material_segment_id, anchor_kind, page_start, page_end,
      text_start_offset, text_end_offset, status, confidence, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'active', ?, ?, datetime('now'), datetime('now'))
  `).run(
    anchorId,
    userId,
    candidate.course_id,
    snapshot.id,
    page?.id || null,
    candidate.document_id,
    candidate.document_chunk_id,
    candidate.source_material_id,
    candidate.source_fragment_id,
    candidate.material_segment_id,
    candidate.anchor_kind,
    pageStart,
    pageEnd,
    candidate.confidence,
    JSON.stringify(candidate.metadata),
  );
  return {
    anchor: db.prepare('SELECT * FROM source_anchors WHERE id = ?').get(anchorId),
    created: true,
  };
}

function noteBlockSourceCandidates(db: Database.Database, userId: string, input: GenerateSourceAnchorsInput): AnchorCandidate[] {
  const conditions = ['nb.user_id = ?', 'nb.course_id = ?'];
  const params: unknown[] = [userId, input.course_id];
  if (input.target_type === 'note_block' && input.target_id) {
    conditions.push('nb.id = ?');
    params.push(input.target_id);
  }
  if (input.target_type === 'note_block_source' && input.target_id) {
    conditions.push('nbs.id = ?');
    params.push(input.target_id);
  }
  if (input.target_type && !['note_block', 'note_block_source'].includes(input.target_type)) return [];
  const rows = db.prepare(`
    SELECT
      nbs.*,
      nb.id AS note_block_id,
      nb.course_id AS course_id,
      nb.user_id AS user_id
    FROM note_block_sources nbs
    JOIN note_blocks nb ON nb.id = nbs.block_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY nbs.created_at ASC
  `).all(...params) as any[];
  return rows.map((row) => {
    const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
    return {
      anchor_kind: 'note_block_source',
      course_id: row.course_id,
      document_id: row.document_id,
      document_chunk_id: row.document_chunk_id,
      source_material_id: metadataString(metadata, 'source_material_id'),
      source_fragment_id: metadataString(metadata, 'source_fragment_id'),
      material_segment_id: metadataString(metadata, 'material_segment_id'),
      page_start: row.source_page_start,
      page_end: row.source_page_end,
      confidence: row.confidence,
      metadata: {
        generated_from: 'note_block_sources',
        note_block_source_id: row.id,
        source_excerpt: row.source_excerpt,
      },
      links: [
        { target_type: 'note_block_source', target_id: row.id, link_role: 'source_reference' },
        { target_type: 'note_block', target_id: row.note_block_id, link_role: 'source_reference' },
      ],
    } satisfies AnchorCandidate;
  });
}

function evidenceItemCandidates(db: Database.Database, userId: string, input: GenerateSourceAnchorsInput): AnchorCandidate[] {
  const conditions = ['ei.user_id = ?', 'ei.course_id = ?'];
  const params: unknown[] = [userId, input.course_id];
  if (input.target_type === 'evidence_set' && input.target_id) {
    conditions.push('ei.evidence_set_id = ?');
    params.push(input.target_id);
  }
  if (input.target_type === 'evidence_item' && input.target_id) {
    conditions.push('ei.id = ?');
    params.push(input.target_id);
  }
  if (input.target_type === 'proposal' && input.target_id) {
    conditions.push('es.source_proposal_id = ?');
    params.push(input.target_id);
  }
  if (input.target_type && !['evidence_set', 'evidence_item', 'proposal'].includes(input.target_type)) return [];
  const rows = db.prepare(`
    SELECT
      ei.*,
      es.source_proposal_id
    FROM evidence_items ei
    JOIN evidence_sets es ON es.id = ei.evidence_set_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ei.created_at ASC
  `).all(...params) as any[];
  return rows.map((row) => ({
    anchor_kind: 'evidence_item',
    course_id: row.course_id,
    document_id: row.document_id,
    document_chunk_id: row.document_chunk_id,
    source_material_id: row.source_material_id,
    source_fragment_id: row.source_fragment_id,
    material_segment_id: row.material_segment_id,
    page_start: row.page_start,
    page_end: row.page_end,
    confidence: row.confidence,
    metadata: {
      generated_from: 'evidence_items',
      evidence_item_id: row.id,
      excerpt: row.excerpt,
      reason: row.reason,
    },
    links: [
      { target_type: 'evidence_item', target_id: row.id, link_role: 'evidence_source' },
      { target_type: 'evidence_set', target_id: row.evidence_set_id, link_role: 'evidence_source' },
      ...(row.source_proposal_id ? [{ target_type: 'proposal' as SourceAnchorTargetType, target_id: row.source_proposal_id, link_role: 'proposal_evidence' }] : []),
    ],
  }));
}

function parseAnchor(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

export function generateSourceAnchors(db: Database.Database, userId: string, input: GenerateSourceAnchorsInput) {
  if (!input.course_id) throw new AppError(400, 'course_id is required');
  if (input.target_type && !isTargetType(input.target_type)) throw new AppError(400, 'Invalid target_type');
  ensureCourse(db, userId, input.course_id);
  const warnings: string[] = [];
  let anchorsCreated = 0;
  let linksCreated = 0;

  const run = db.transaction(() => {
    const candidates = [
      ...noteBlockSourceCandidates(db, userId, input),
      ...evidenceItemCandidates(db, userId, input),
    ];
    for (const candidate of candidates) {
      const snapshot = findSnapshot(db, userId, candidate);
      if (!snapshot) {
        warnings.push(`No source snapshot found for ${candidate.anchor_kind} in document ${candidate.document_id || 'unknown'}.`);
        continue;
      }
      const pageStart = pageNumberForCandidate(db, candidate);
      const pageEnd = pageEndForCandidate(db, candidate, pageStart);
      const page = findSnapshotPage(db, userId, snapshot.id, pageStart);
      if (!page) {
        warnings.push(`No source snapshot page found for ${candidate.anchor_kind} in snapshot ${snapshot.id}.`);
        continue;
      }
      const { anchor, created } = insertOrReuseAnchor(db, userId, candidate, snapshot, page, pageStart, pageEnd);
      if (created) anchorsCreated += 1;
      for (const link of candidate.links) {
        if (upsertLink(db, userId, candidate.course_id, anchor.id, link)) linksCreated += 1;
      }
    }
  });
  run();

  return {
    anchors_created_count: anchorsCreated,
    links_created_count: linksCreated,
    total_anchor_count: (db.prepare('SELECT COUNT(*) AS count FROM source_anchors WHERE user_id = ? AND course_id = ?')
      .get(userId, input.course_id) as any).count,
    warnings,
  };
}

export function listSourceAnchors(db: Database.Database, userId: string, input: ListSourceAnchorsInput) {
  if (!input.course_id) throw new AppError(400, 'course_id query parameter is required');
  if (input.target_type && !isTargetType(input.target_type)) throw new AppError(400, 'Invalid target_type');
  ensureCourse(db, userId, input.course_id);
  const params: unknown[] = [userId, input.course_id];
  let join = '';
  let where = 'sa.user_id = ? AND sa.course_id = ?';
  if (input.target_type || input.target_id) {
    join = 'JOIN source_anchor_links sal ON sal.source_anchor_id = sa.id';
    if (input.target_type) {
      where += ' AND sal.target_type = ?';
      params.push(input.target_type);
    }
    if (input.target_id) {
      where += ' AND sal.target_id = ?';
      params.push(input.target_id);
    }
  }
  return db.prepare(`
    SELECT DISTINCT sa.*
    FROM source_anchors sa
    ${join}
    WHERE ${where}
    ORDER BY sa.updated_at DESC, sa.created_at DESC
  `).all(...params).map(parseAnchor);
}

export function getSourceAnchor(db: Database.Database, userId: string, anchorId: string) {
  const anchor = db.prepare('SELECT * FROM source_anchors WHERE id = ? AND user_id = ?')
    .get(anchorId, userId) as any;
  if (!anchor) throw new AppError(404, 'Source anchor not found');
  return parseAnchor(anchor);
}

export function getSourceAnchorJumpTarget(db: Database.Database, userId: string, anchorId: string) {
  const anchor = getSourceAnchor(db, userId, anchorId) as any;
  const snapshot = db.prepare('SELECT * FROM source_snapshots WHERE id = ? AND user_id = ?')
    .get(anchor.source_snapshot_id, userId) as any;
  if (!snapshot) throw new AppError(404, 'Source snapshot not found');
  const page = anchor.source_snapshot_page_id
    ? db.prepare('SELECT * FROM source_snapshot_pages WHERE id = ? AND user_id = ?').get(anchor.source_snapshot_page_id, userId) as any
    : findSnapshotPage(db, userId, snapshot.id, anchor.page_start);
  if (!page) throw new AppError(404, 'Source snapshot page not found');
  return {
    anchor,
    snapshot: { ...snapshot, metadata: parseJson(snapshot.metadata, {}) },
    page: { ...page, metadata: parseJson(page.metadata, {}) },
    focus: {
      page_start: anchor.page_start,
      page_end: anchor.page_end,
      text_start_offset: anchor.text_start_offset,
      text_end_offset: anchor.text_end_offset,
    },
    warnings: [],
  };
}

export function refreshSourceAnchor(db: Database.Database, userId: string, anchorId: string) {
  const anchor = getSourceAnchor(db, userId, anchorId) as any;
  const page = findSnapshotPage(db, userId, anchor.source_snapshot_id, anchor.page_start);
  if (!page) throw new AppError(404, 'Source snapshot page not found');
  db.prepare(`
    UPDATE source_anchors
    SET source_snapshot_page_id = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(page.id, anchorId, userId);
  return {
    anchor: getSourceAnchor(db, userId, anchorId),
    warnings: [],
  };
}
