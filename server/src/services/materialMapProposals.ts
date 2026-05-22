import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  ensureSegmentsForMaterial,
  getOwnedSourceMaterial,
  listCourseMaterials,
  listMaterialSegments,
} from './courseMaterials.js';
import { resolveSourceBoardForProposal } from './sourceBoards.js';
import { resolveSourceScopesForProposal } from './sourceScopes.js';

interface CreateMaterialMapProposalInput {
  course_id: string;
  document_ids?: string[];
  source_material_ids?: string[];
  source_scope_ids?: string[];
  source_board_id?: string;
}

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
}

interface SegmentSnapshot {
  segment_id: string;
  source_material_id: string;
  segment_type: string;
  title: string;
  summary: string | null;
  order_index: number;
  page_start: number | null;
  page_end: number | null;
  fragment_ids: string[];
  confidence: number | null;
  warnings: string[];
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getOwnedCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function scopedSourceMaterials(
  db: Database.Database,
  userId: string,
  courseId: string,
  input: CreateMaterialMapProposalInput
) {
  const allMaterials = listCourseMaterials(db, userId, courseId) as any[];
  const documentIds = new Set(input.document_ids || []);
  const sourceMaterialIds = new Set(input.source_material_ids || []);

  return allMaterials.filter((material) => {
    if (documentIds.size === 0 && sourceMaterialIds.size === 0) return true;
    return documentIds.has(material.document_id) || sourceMaterialIds.has(material.id);
  });
}

function segmentSnapshot(db: Database.Database, segment: any): SegmentSnapshot {
  const fragmentIds = db.prepare(`
    SELECT fragment_id FROM material_segment_fragments
    WHERE segment_id = ?
    ORDER BY order_index ASC
  `).all(segment.id).map((row: any) => row.fragment_id);

  return {
    segment_id: segment.id,
    source_material_id: segment.source_material_id,
    segment_type: segment.segment_type,
    title: segment.title,
    summary: segment.summary,
    order_index: segment.order_index,
    page_start: segment.page_start,
    page_end: segment.page_end,
    fragment_ids: fragmentIds,
    confidence: segment.confidence,
    warnings: segment.warnings || [],
  };
}

export function createMaterialMapProposal(
  db: Database.Database,
  userId: string,
  input: CreateMaterialMapProposalInput
) {
  getOwnedCourse(db, userId, input.course_id);
  const resolvedBoard = resolveSourceBoardForProposal(db, userId, input.course_id, input.source_board_id);
  const requestedScopeIds = [...new Set([...(input.source_scope_ids || []), ...resolvedBoard.source_scope_ids])];
  const resolvedScopes = resolveSourceScopesForProposal(db, userId, input.course_id, requestedScopeIds);
  const scopedInput = {
    ...input,
    document_ids: input.document_ids || resolvedScopes.document_ids,
    source_material_ids: input.source_material_ids || resolvedScopes.source_material_ids,
  };

  const materials = scopedSourceMaterials(db, userId, input.course_id, scopedInput);
  if (materials.length === 0) {
    throw new AppError(400, 'No course materials found for the selected scope');
  }

  const warnings: string[] = [...resolvedBoard.warnings, ...resolvedScopes.warnings];
  const segmentSnapshots: SegmentSnapshot[] = [];
  for (const material of materials) {
    if (material.parse_status !== 'completed') {
      warnings.push(`"${material.title}" is ${material.parse_status} and cannot produce complete segments yet.`);
    }
    ensureSegmentsForMaterial(db, userId, material.id);
    const segments = listMaterialSegments(db, userId, material.id) as any[] | null;
    for (const segment of segments || []) {
      if (segment.status !== 'discarded') {
        segmentSnapshots.push(segmentSnapshot(db, segment));
      }
    }
  }

  if (segmentSnapshots.length === 0) {
    throw new AppError(400, 'No proposal-ready material segments found for the selected scope');
  }

  const proposalId = uuidv4();
  const now = new Date().toISOString();
  const data = {
    version: 'v2.1',
    proposal_kind: 'material_map',
    course_id: input.course_id,
    title: 'Material map proposal',
    description: 'Detected material structure from course sources.',
    source_board_id: resolvedBoard.source_board_id,
    source_material_ids: materials.map((material) => material.id),
    source_scope_ids: resolvedScopes.source_scope_ids,
    scope_summary: resolvedScopes.scope_summary,
    segments: segmentSnapshots,
    warnings,
  };

  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'material_map', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  db.prepare(`
    UPDATE source_materials
    SET proposal_status = 'map_proposed', updated_at = ?
    WHERE user_id = ? AND id IN (${materials.map(() => '?').join(', ')})
  `).run(now, userId, ...materials.map((material) => material.id));

  return {
    id: proposalId,
    user_id: userId,
    type: 'material_map',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

export function applyMaterialMapProposal(db: Database.Database, userId: string, proposal: ProposalRow) {
  if (proposal.type !== 'material_map') {
    throw new AppError(400, 'Proposal is not a material map proposal');
  }

  const data = parseJson<{ course_id: string; source_material_ids: string[]; segments: SegmentSnapshot[] }>(
    proposal.data,
    { course_id: '', source_material_ids: [], segments: [] }
  );
  if (!data.course_id || !Array.isArray(data.segments) || data.segments.length === 0) {
    throw new AppError(400, 'Material map proposal is malformed');
  }

  const now = new Date().toISOString();
  const batchId = uuidv4();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply material map proposal', 'applied', ?, ?)
  `).run(batchId, userId, data.course_id, proposal.id, JSON.stringify({ proposal_type: 'material_map' }), now);

  const updateSegment = db.prepare(`
    UPDATE material_segments
    SET status = 'accepted', accepted_at = COALESCE(accepted_at, ?), updated_at = ?
    WHERE id = ? AND user_id = ?
  `);
  let acceptedCount = 0;
  for (const segment of data.segments) {
    const result = updateSegment.run(now, now, segment.segment_id, userId);
    acceptedCount += result.changes;
  }

  const materialIds = [...new Set(data.source_material_ids || data.segments.map((segment) => segment.source_material_id))]
    .filter((id) => Boolean(getOwnedSourceMaterial(db, userId, id)));
  if (materialIds.length > 0) {
    db.prepare(`
      UPDATE source_materials
      SET segment_status = 'accepted', proposal_status = 'map_accepted', updated_at = ?
      WHERE user_id = ? AND id IN (${materialIds.map(() => '?').join(', ')})
    `).run(now, userId, ...materialIds);
  }

  return {
    message: 'Material map proposal applied successfully',
    operation_batch_id: batchId,
    accepted_segments_count: acceptedCount,
  };
}
