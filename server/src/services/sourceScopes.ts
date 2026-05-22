import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { getSourceAnchorJumpTarget } from './sourceAnchors.js';

type SourceScopeKind = 'page' | 'page_range' | 'anchor' | 'source_material' | 'material_segment';
type SourceScopeStatus = 'active' | 'archived';

export interface SourceScopeInput {
  course_id: string;
  source_snapshot_id?: string;
  source_snapshot_page_id?: string;
  source_anchor_id?: string;
  source_material_id?: string;
  source_fragment_id?: string;
  material_segment_id?: string;
  document_id?: string;
  document_chunk_id?: string;
  scope_kind: SourceScopeKind;
  label?: string;
  page_start?: number | null;
  page_end?: number | null;
  text_start_offset?: number | null;
  text_end_offset?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ListSourceScopesInput {
  course_id: string;
  status?: SourceScopeStatus;
}

export interface ResolvedSourceScopes {
  source_scope_ids: string[];
  document_ids: string[];
  source_material_ids: string[];
  segment_ids: string[];
  scope_summary: Array<{
    id: string;
    label: string;
    scope_kind: SourceScopeKind;
    page_start: number | null;
    page_end: number | null;
    source_snapshot_id: string | null;
    source_anchor_id: string | null;
    source_material_id: string | null;
    material_segment_id: string | null;
  }>;
  warnings: string[];
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

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function requireKind(value: string): SourceScopeKind {
  if (['page', 'page_range', 'anchor', 'source_material', 'material_segment'].includes(value)) {
    return value as SourceScopeKind;
  }
  throw new AppError(400, 'Invalid source scope kind');
}

function parseScope(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function getSnapshot(db: Database.Database, userId: string, courseId: string, snapshotId: string) {
  return db.prepare('SELECT * FROM source_snapshots WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(snapshotId, userId, courseId) as any;
}

function getSnapshotPage(db: Database.Database, userId: string, courseId: string, pageId: string) {
  return db.prepare('SELECT * FROM source_snapshot_pages WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(pageId, userId, courseId) as any;
}

function getPageByNumber(db: Database.Database, userId: string, snapshotId: string, pageNumber: number | null | undefined) {
  if (typeof pageNumber !== 'number') return undefined;
  return db.prepare('SELECT * FROM source_snapshot_pages WHERE user_id = ? AND source_snapshot_id = ? AND page_number = ?')
    .get(userId, snapshotId, pageNumber) as any;
}

function getAnchor(db: Database.Database, userId: string, courseId: string, anchorId: string) {
  return db.prepare('SELECT * FROM source_anchors WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(anchorId, userId, courseId) as any;
}

function getSourceMaterial(db: Database.Database, userId: string, courseId: string, materialId: string) {
  return db.prepare('SELECT * FROM source_materials WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(materialId, userId, courseId) as any;
}

function getMaterialSegment(db: Database.Database, userId: string, courseId: string, segmentId: string) {
  return db.prepare('SELECT * FROM material_segments WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(segmentId, userId, courseId) as any;
}

function getSourceFragment(db: Database.Database, userId: string, courseId: string, fragmentId: string) {
  return db.prepare('SELECT * FROM source_fragments WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(fragmentId, userId, courseId) as any;
}

function buildScopeFields(db: Database.Database, userId: string, input: SourceScopeInput) {
  const kind = requireKind(input.scope_kind);
  ensureCourse(db, userId, input.course_id);
  let snapshot: any;
  let page: any;
  let anchor: any;
  let material: any;
  let segment: any;
  let fragment: any;

  if (kind === 'page' || kind === 'page_range') {
    if (!input.source_snapshot_id) throw new AppError(400, 'source_snapshot_id is required for page scopes');
    snapshot = getSnapshot(db, userId, input.course_id, input.source_snapshot_id);
    if (!snapshot) throw new AppError(404, 'Source snapshot not found');
    if (input.source_snapshot_page_id) {
      page = getSnapshotPage(db, userId, input.course_id, input.source_snapshot_page_id);
      if (!page || page.source_snapshot_id !== snapshot.id) throw new AppError(404, 'Source snapshot page not found');
    } else {
      page = getPageByNumber(db, userId, snapshot.id, input.page_start);
    }
  } else if (kind === 'anchor') {
    if (!input.source_anchor_id) throw new AppError(400, 'source_anchor_id is required for anchor scopes');
    anchor = getAnchor(db, userId, input.course_id, input.source_anchor_id);
    if (!anchor) throw new AppError(404, 'Source anchor not found');
    snapshot = getSnapshot(db, userId, input.course_id, anchor.source_snapshot_id);
    page = anchor.source_snapshot_page_id ? getSnapshotPage(db, userId, input.course_id, anchor.source_snapshot_page_id) : undefined;
  } else if (kind === 'source_material') {
    if (!input.source_material_id) throw new AppError(400, 'source_material_id is required for source material scopes');
    material = getSourceMaterial(db, userId, input.course_id, input.source_material_id);
    if (!material) throw new AppError(404, 'Source material not found');
  } else if (kind === 'material_segment') {
    if (!input.material_segment_id) throw new AppError(400, 'material_segment_id is required for material segment scopes');
    segment = getMaterialSegment(db, userId, input.course_id, input.material_segment_id);
    if (!segment) throw new AppError(404, 'Material segment not found');
    if (segment.source_material_id) material = getSourceMaterial(db, userId, input.course_id, segment.source_material_id);
  }

  if (input.source_material_id && !material) {
    material = getSourceMaterial(db, userId, input.course_id, input.source_material_id);
    if (!material) throw new AppError(404, 'Source material not found');
  }
  if (input.material_segment_id && !segment) {
    segment = getMaterialSegment(db, userId, input.course_id, input.material_segment_id);
    if (!segment) throw new AppError(404, 'Material segment not found');
  }
  if (input.source_fragment_id) {
    fragment = getSourceFragment(db, userId, input.course_id, input.source_fragment_id);
    if (!fragment) throw new AppError(404, 'Source fragment not found');
  }

  const pageStart = input.page_start ?? anchor?.page_start ?? segment?.page_start ?? fragment?.page_start ?? page?.page_number ?? null;
  const pageEnd = input.page_end ?? anchor?.page_end ?? segment?.page_end ?? fragment?.page_end ?? pageStart;
  const label = input.label
    || (kind === 'page_range' ? `p.${pageStart}-${pageEnd}` : kind.replace(/_/g, ' '));

  return {
    kind,
    snapshot,
    page,
    anchor,
    material,
    segment,
    fragment,
    values: {
      source_snapshot_id: snapshot?.id || input.source_snapshot_id || null,
      source_snapshot_page_id: page?.id || input.source_snapshot_page_id || null,
      source_anchor_id: anchor?.id || input.source_anchor_id || null,
      source_material_id: material?.id || input.source_material_id || anchor?.source_material_id || snapshot?.source_material_id || null,
      source_fragment_id: fragment?.id || input.source_fragment_id || anchor?.source_fragment_id || null,
      material_segment_id: segment?.id || input.material_segment_id || anchor?.material_segment_id || null,
      document_id: input.document_id || snapshot?.document_id || material?.document_id || segment?.document_id || fragment?.document_id || anchor?.document_id || null,
      document_chunk_id: input.document_chunk_id || fragment?.document_chunk_id || anchor?.document_chunk_id || null,
      page_start: pageStart,
      page_end: pageEnd,
      label,
    },
  };
}

export function createSourceScope(db: Database.Database, userId: string, input: SourceScopeInput) {
  const built = buildScopeFields(db, userId, input);
  const id = uuidv4();
  db.prepare(`
    INSERT INTO source_scopes (
      id, user_id, course_id, source_snapshot_id, source_snapshot_page_id,
      source_anchor_id, source_material_id, source_fragment_id, material_segment_id,
      document_id, document_chunk_id, scope_kind, label, page_start, page_end,
      text_start_offset, text_end_offset, status, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    input.course_id,
    built.values.source_snapshot_id,
    built.values.source_snapshot_page_id,
    built.values.source_anchor_id,
    built.values.source_material_id,
    built.values.source_fragment_id,
    built.values.material_segment_id,
    built.values.document_id,
    built.values.document_chunk_id,
    built.kind,
    built.values.label,
    built.values.page_start,
    built.values.page_end,
    input.text_start_offset ?? null,
    input.text_end_offset ?? null,
    JSON.stringify(input.metadata || {}),
  );
  return getSourceScope(db, userId, id);
}

export function listSourceScopes(db: Database.Database, userId: string, input: ListSourceScopesInput) {
  if (!input.course_id) throw new AppError(400, 'course_id query parameter is required');
  ensureCourse(db, userId, input.course_id);
  const params: unknown[] = [userId, input.course_id];
  let where = 'user_id = ? AND course_id = ?';
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid source scope status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM source_scopes
    WHERE ${where}
    ORDER BY updated_at DESC, created_at DESC
  `).all(...params).map(parseScope);
}

export function getSourceScope(db: Database.Database, userId: string, scopeId: string) {
  const scope = db.prepare('SELECT * FROM source_scopes WHERE id = ? AND user_id = ?')
    .get(scopeId, userId) as any;
  if (!scope) throw new AppError(404, 'Source scope not found');
  return parseScope(scope);
}

export function updateSourceScope(db: Database.Database, userId: string, scopeId: string, input: Partial<SourceScopeInput>) {
  const existing = getSourceScope(db, userId, scopeId) as any;
  const merged = {
    course_id: existing.course_id,
    source_snapshot_id: input.source_snapshot_id ?? existing.source_snapshot_id ?? undefined,
    source_snapshot_page_id: input.source_snapshot_page_id ?? existing.source_snapshot_page_id ?? undefined,
    source_anchor_id: input.source_anchor_id ?? existing.source_anchor_id ?? undefined,
    source_material_id: input.source_material_id ?? existing.source_material_id ?? undefined,
    source_fragment_id: input.source_fragment_id ?? existing.source_fragment_id ?? undefined,
    material_segment_id: input.material_segment_id ?? existing.material_segment_id ?? undefined,
    document_id: input.document_id ?? existing.document_id ?? undefined,
    document_chunk_id: input.document_chunk_id ?? existing.document_chunk_id ?? undefined,
    scope_kind: (input.scope_kind ?? existing.scope_kind) as SourceScopeKind,
    label: input.label ?? existing.label,
    page_start: input.page_start ?? existing.page_start,
    page_end: input.page_end ?? existing.page_end,
    text_start_offset: input.text_start_offset ?? existing.text_start_offset,
    text_end_offset: input.text_end_offset ?? existing.text_end_offset,
    metadata: { ...(existing.metadata || {}), ...(input.metadata || {}) },
  };
  const built = buildScopeFields(db, userId, merged);
  db.prepare(`
    UPDATE source_scopes
    SET source_snapshot_id = ?,
        source_snapshot_page_id = ?,
        source_anchor_id = ?,
        source_material_id = ?,
        source_fragment_id = ?,
        material_segment_id = ?,
        document_id = ?,
        document_chunk_id = ?,
        scope_kind = ?,
        label = ?,
        page_start = ?,
        page_end = ?,
        text_start_offset = ?,
        text_end_offset = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    built.values.source_snapshot_id,
    built.values.source_snapshot_page_id,
    built.values.source_anchor_id,
    built.values.source_material_id,
    built.values.source_fragment_id,
    built.values.material_segment_id,
    built.values.document_id,
    built.values.document_chunk_id,
    built.kind,
    built.values.label,
    built.values.page_start,
    built.values.page_end,
    merged.text_start_offset ?? null,
    merged.text_end_offset ?? null,
    JSON.stringify(merged.metadata || {}),
    scopeId,
    userId,
  );
  return getSourceScope(db, userId, scopeId);
}

function setSourceScopeStatus(db: Database.Database, userId: string, scopeId: string, status: SourceScopeStatus) {
  getSourceScope(db, userId, scopeId);
  db.prepare('UPDATE source_scopes SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(status, scopeId, userId);
  return getSourceScope(db, userId, scopeId);
}

export function archiveSourceScope(db: Database.Database, userId: string, scopeId: string) {
  return setSourceScopeStatus(db, userId, scopeId, 'archived');
}

export function restoreSourceScope(db: Database.Database, userId: string, scopeId: string) {
  return setSourceScopeStatus(db, userId, scopeId, 'active');
}

export function getSourceScopeJumpTarget(db: Database.Database, userId: string, scopeId: string) {
  const scope = getSourceScope(db, userId, scopeId) as any;
  if (scope.source_anchor_id) {
    const target = getSourceAnchorJumpTarget(db, userId, scope.source_anchor_id) as any;
    return {
      ...target,
      scope,
      focus: {
        page_start: scope.page_start ?? target.focus.page_start,
        page_end: scope.page_end ?? target.focus.page_end,
        text_start_offset: scope.text_start_offset ?? target.focus.text_start_offset,
        text_end_offset: scope.text_end_offset ?? target.focus.text_end_offset,
      },
    };
  }
  if (!scope.source_snapshot_id) throw new AppError(400, 'Source scope has no jump target');
  const snapshot = db.prepare('SELECT * FROM source_snapshots WHERE id = ? AND user_id = ?')
    .get(scope.source_snapshot_id, userId) as any;
  if (!snapshot) throw new AppError(404, 'Source snapshot not found');
  const pages = db.prepare(`
    SELECT *
    FROM source_snapshot_pages
    WHERE user_id = ?
      AND source_snapshot_id = ?
      AND page_number >= COALESCE(?, page_number)
      AND page_number <= COALESCE(?, page_number)
    ORDER BY page_number ASC
  `).all(userId, snapshot.id, scope.page_start, scope.page_end).map((page: any) => ({
    ...page,
    metadata: parseJson(page.metadata, {}),
  }));
  const fallbackPage = pages[0] || db.prepare(`
    SELECT *
    FROM source_snapshot_pages
    WHERE user_id = ? AND source_snapshot_id = ?
    ORDER BY page_number ASC
    LIMIT 1
  `).get(userId, snapshot.id) as any;
  if (!fallbackPage) throw new AppError(404, 'Source snapshot page not found');
  return {
    scope,
    snapshot: { ...snapshot, metadata: parseJson(snapshot.metadata, {}) },
    page: fallbackPage,
    pages,
    focus: {
      page_start: scope.page_start,
      page_end: scope.page_end,
      text_start_offset: scope.text_start_offset,
      text_end_offset: scope.text_end_offset,
    },
    warnings: [],
  };
}

function segmentIdsForScope(db: Database.Database, userId: string, scope: any): string[] {
  if (scope.material_segment_id) return [scope.material_segment_id];
  const params: unknown[] = [userId, scope.course_id];
  let where = 'user_id = ? AND course_id = ? AND status != \'discarded\'';
  if (scope.source_material_id) {
    where += ' AND source_material_id = ?';
    params.push(scope.source_material_id);
  }
  if (scope.page_start !== null && scope.page_start !== undefined) {
    where += ' AND (page_start IS NOT NULL OR page_end IS NOT NULL)';
    where += ' AND COALESCE(page_end, page_start, 0) >= ?';
    params.push(scope.page_start);
  }
  if (scope.page_end !== null && scope.page_end !== undefined) {
    where += ' AND COALESCE(page_start, page_end, 999999) <= ?';
    params.push(scope.page_end);
  }
  const rows = db.prepare(`SELECT id, segment_type, page_start, page_end FROM material_segments WHERE ${where} ORDER BY order_index ASC`)
    .all(...params) as any[];
  if (scope.scope_kind === 'page_range' && scope.page_start !== null && scope.page_end !== null) {
    const exactPageRange = rows.filter((row) => (
      row.segment_type === 'page_range'
      && row.page_start === scope.page_start
      && row.page_end === scope.page_end
    ));
    if (exactPageRange.length > 0) return exactPageRange.map((row) => row.id);
    const exact = rows.filter((row) => row.page_start === scope.page_start && row.page_end === scope.page_end);
    if (exact.length > 0) return exact.map((row) => row.id);
  }
  return rows.map((row) => row.id);
}

export function resolveSourceScopesForProposal(
  db: Database.Database,
  userId: string,
  courseId: string,
  sourceScopeIds?: string[],
): ResolvedSourceScopes {
  if (!sourceScopeIds || sourceScopeIds.length === 0) {
    return { source_scope_ids: [], document_ids: [], source_material_ids: [], segment_ids: [], scope_summary: [], warnings: [] };
  }
  ensureCourse(db, userId, courseId);
  const scopes = unique(sourceScopeIds).map((scopeId) => getSourceScope(db, userId, scopeId) as any);
  const warnings: string[] = [];
  for (const scope of scopes) {
    if (scope.course_id !== courseId) throw new AppError(400, 'Source scope belongs to a different course');
    if (scope.status === 'archived') throw new AppError(400, 'Source scope is archived');
  }
  const segmentIds = unique(scopes.flatMap((scope) => segmentIdsForScope(db, userId, scope)));
  if (segmentIds.length === 0) {
    warnings.push('Selected source scopes did not resolve to material segments; proposal may use broader source references.');
  }
  return {
    source_scope_ids: scopes.map((scope) => scope.id),
    document_ids: unique(scopes.map((scope) => scope.document_id)),
    source_material_ids: unique(scopes.map((scope) => scope.source_material_id)),
    segment_ids: segmentIds,
    scope_summary: scopes.map((scope) => ({
      id: scope.id,
      label: scope.label,
      scope_kind: scope.scope_kind,
      page_start: scope.page_start,
      page_end: scope.page_end,
      source_snapshot_id: scope.source_snapshot_id,
      source_anchor_id: scope.source_anchor_id,
      source_material_id: scope.source_material_id,
      material_segment_id: scope.material_segment_id,
    })),
    warnings,
  };
}
