import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { getProviderFromSettings } from '../agent/providers/index.js';
import { ensureSegmentsForMaterial, listCourseMaterials } from './courseMaterials.js';
import {
  legacyBlockTypeForRuntimeTemplate,
  mergeRuntimeNoteBlockTemplateMetadata,
} from './templateDefinitions.js';
import { resolveSourceBoardForProposal } from './sourceBoards.js';
import { resolveSourceScopesForProposal } from './sourceScopes.js';

interface CreateOrganizedNoteProposalInput {
  course_id: string;
  source_material_ids?: string[];
  segment_ids?: string[];
  document_ids?: string[];
  source_scope_ids?: string[];
  source_board_id?: string;
  note_title?: string;
}

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
}

interface SourceReference {
  document_id: string;
  document_chunk_id: string | null;
  source_page_start: number | null;
  source_page_end: number | null;
  source_excerpt: string;
  reference_type: string;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

interface OrganizedNoteBlock {
  temp_id: string;
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string;
  metadata: Record<string, unknown>;
  order_index: number;
  source_references: SourceReference[];
  confidence: number | null;
  warnings: string[];
}

interface OrganizedNoteData {
  version: string;
  proposal_kind: 'organized_note';
  course_id: string;
  title: string;
  description: string;
  generation_mode: 'ai' | 'deterministic_fallback';
  source_board_id?: string;
  source_material_ids: string[];
  source_scope_ids: string[];
  scope_summary: unknown[];
  segment_ids: string[];
  blocks: OrganizedNoteBlock[];
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

function getOwnedCourse(db: Database.Database, userId: string, courseId: string): { id: string; name: string } {
  const course = db.prepare('SELECT id, name FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as { id: string; name: string } | undefined;
  if (!course) throw new AppError(404, 'Course not found');
  return course;
}

function getUserSettings(db: Database.Database, userId: string): Record<string, unknown> {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId) as { settings: string } | undefined;
  return parseJson<Record<string, unknown>>(user?.settings, {});
}

function hasAiKey(settings: Record<string, unknown>): boolean {
  const activeProvider = settings.active_provider || 'anthropic';
  const providers = settings.ai_providers as Record<string, Record<string, string>> | undefined;
  const configuredKey = providers?.[String(activeProvider)]?.api_key;
  return Boolean(configuredKey || (activeProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY));
}

function scopedSegments(
  db: Database.Database,
  userId: string,
  courseId: string,
  input: CreateOrganizedNoteProposalInput
) {
  listCourseMaterials(db, userId, courseId);

  let where = 'ms.user_id = ? AND ms.course_id = ? AND ms.status != ?';
  const params: unknown[] = [userId, courseId, 'discarded'];
  const segmentIds = new Set(input.segment_ids || []);
  const sourceMaterialIds = new Set(input.source_material_ids || []);
  const documentIds = new Set(input.document_ids || []);

  if (segmentIds.size > 0) {
    where += ` AND ms.id IN (${[...segmentIds].map(() => '?').join(', ')})`;
    params.push(...segmentIds);
  } else if (sourceMaterialIds.size > 0) {
    where += ` AND ms.source_material_id IN (${[...sourceMaterialIds].map(() => '?').join(', ')})`;
    params.push(...sourceMaterialIds);
  } else if (documentIds.size > 0) {
    where += ` AND sm.document_id IN (${[...documentIds].map(() => '?').join(', ')})`;
    params.push(...documentIds);
  } else {
    where += " AND ms.status = 'accepted'";
  }

  let segments = db.prepare(`
    SELECT
      ms.*,
      sm.document_id,
      sm.title AS source_material_title
    FROM material_segments ms
    JOIN source_materials sm ON sm.id = ms.source_material_id
    WHERE ${where}
    ORDER BY ms.order_index ASC, ms.created_at ASC
  `).all(...params) as any[];

  const warnings: string[] = [];
  if (segments.length === 0 && segmentIds.size === 0 && sourceMaterialIds.size === 0 && documentIds.size === 0) {
    const materials = listCourseMaterials(db, userId, courseId) as any[];
    for (const material of materials) {
      ensureSegmentsForMaterial(db, userId, material.id);
    }
    segments = db.prepare(`
      SELECT
        ms.*,
        sm.document_id,
        sm.title AS source_material_title
      FROM material_segments ms
      JOIN source_materials sm ON sm.id = ms.source_material_id
      WHERE ms.user_id = ? AND ms.course_id = ? AND ms.status = 'proposed'
      ORDER BY ms.order_index ASC, ms.created_at ASC
    `).all(userId, courseId) as any[];
    if (segments.length > 0) {
      warnings.push('No accepted material segments were found, so proposed segments were used for this draft.');
    }
  }

  if (segments.length === 0) {
    throw new AppError(400, 'No material segments found for the selected scope');
  }
  return { segments, warnings };
}

function sourceReferencesForSegment(db: Database.Database, segment: any): SourceReference[] {
  const fragments = db.prepare(`
    SELECT sf.*
    FROM material_segment_fragments msf
    JOIN source_fragments sf ON sf.id = msf.fragment_id
    WHERE msf.segment_id = ?
    ORDER BY msf.order_index ASC, sf.order_index ASC
  `).all(segment.id) as any[];

  return fragments.slice(0, 3).map((fragment) => ({
    document_id: fragment.document_id,
    document_chunk_id: fragment.document_chunk_id,
    source_page_start: fragment.page_start,
    source_page_end: fragment.page_end,
    source_excerpt: String(fragment.content || '').slice(0, 500),
    reference_type: fragment.document_chunk_id ? 'chunk' : fragment.fragment_type,
    confidence: fragment.confidence ?? segment.confidence ?? null,
    metadata: {
      source_fragment_id: fragment.id,
      material_segment_id: segment.id,
      source_material_id: segment.source_material_id,
    },
  }));
}

function deterministicBlocks(db: Database.Database, userId: string, segments: any[]): OrganizedNoteBlock[] {
  const blocks: OrganizedNoteBlock[] = [];
  for (const segment of segments) {
    const refs = sourceReferencesForSegment(db, segment);
    const excerpt = refs[0]?.source_excerpt || segment.summary || segment.title;
    const headingText = segment.title || 'Source segment';
    const headingMetadata = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {}, 'heading');
    const paragraphMetadata = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {}, 'paragraph');
    blocks.push({
      temp_id: `block-${blocks.length + 1}`,
      block_type: legacyBlockTypeForRuntimeTemplate(headingMetadata.template),
      title: headingText,
      content_json: { body: headingText },
      plain_text: headingText,
      metadata: headingMetadata.metadata,
      order_index: blocks.length,
      source_references: refs,
      confidence: segment.confidence ?? 0.7,
      warnings: [],
    });
    blocks.push({
      temp_id: `block-${blocks.length + 1}`,
      block_type: legacyBlockTypeForRuntimeTemplate(paragraphMetadata.template),
      title: null,
      content_json: { body: excerpt },
      plain_text: excerpt,
      metadata: paragraphMetadata.metadata,
      order_index: blocks.length,
      source_references: refs,
      confidence: segment.confidence ?? 0.7,
      warnings: [],
    });
  }
  return blocks;
}

function sanitizeAiBlock(
  db: Database.Database,
  userId: string,
  block: any,
  fallbackRefs: SourceReference[],
  orderIndex: number,
): OrganizedNoteBlock | null {
  const allowedTypes = new Set([
    'heading',
    'paragraph',
    'definition',
    'theorem',
    'proof',
    'formula',
    'example',
    'exercise',
    'answer',
    'sidenote',
  ]);
  const blockType = typeof block?.block_type === 'string' && allowedTypes.has(block.block_type)
    ? block.block_type
    : 'paragraph';
  const inputMetadata = typeof block?.metadata === 'object' && block.metadata !== null
    ? block.metadata as Record<string, unknown>
    : {};
  const requestedTemplateId = typeof block?.template_id === 'string'
    ? block.template_id
    : typeof inputMetadata.template_id === 'string'
      ? inputMetadata.template_id
      : undefined;
  const requestedRole = typeof block?.learning_role === 'string'
    ? block.learning_role
    : typeof inputMetadata.learning_role === 'string'
      ? inputMetadata.learning_role
      : undefined;
  const resolved = mergeRuntimeNoteBlockTemplateMetadata(
    db,
    userId,
    requestedTemplateId ? { ...inputMetadata, template_id: requestedTemplateId } : inputMetadata,
    blockType,
    { allowUnknownTemplateFallback: true },
  );
  const metadata = resolved.metadata;
  const normalizedBlockType = legacyBlockTypeForRuntimeTemplate(resolved.template);
  const plainText = String(block?.plain_text || block?.content_json?.body || block?.title || '').trim();
  if (!plainText) return null;
  const warnings = [
    ...(Array.isArray(block?.warnings) ? block.warnings.map(String) : []),
    ...resolved.warnings,
  ];
  if (requestedTemplateId && resolved.resolution_status === 'template_missing') {
    warnings.push(`Unknown template_id "${requestedTemplateId}" was mapped to ${metadata.template_id}.`);
  } else if (requestedRole && requestedRole !== metadata.learning_role) {
    warnings.push(`Unsupported learning_role "${requestedRole}" was mapped to ${metadata.learning_role}.`);
  }
  return {
    temp_id: String(block?.temp_id || `ai-block-${orderIndex + 1}`),
    block_type: normalizedBlockType,
    title: typeof block?.title === 'string' ? block.title : null,
    content_json: typeof block?.content_json === 'object' && block.content_json !== null
      ? block.content_json
      : { body: plainText },
    plain_text: plainText,
    metadata,
    order_index: orderIndex,
    source_references: fallbackRefs,
    confidence: typeof block?.confidence === 'number' ? block.confidence : 0.7,
    warnings,
  };
}

async function tryGenerateAiBlocks(
  db: Database.Database,
  userId: string,
  settings: Record<string, unknown>,
  title: string,
  segments: any[]
): Promise<OrganizedNoteBlock[] | null> {
  if (!hasAiKey(settings)) return null;

  try {
    const { provider } = getProviderFromSettings(settings);
    const sourceBrief = segments.map((segment) => {
      const refs = sourceReferencesForSegment(db, segment);
      const excerpt = refs.map((ref) => ref.source_excerpt).join('\n');
      return `Segment: ${segment.title}\nPages: ${segment.page_start || '?'}-${segment.page_end || '?'}\nExcerpt:\n${excerpt}`;
    }).join('\n\n---\n\n').slice(0, 12000);
    const systemPrompt = [
      'You create factual, source-aware study note proposals.',
      'Return only JSON. Do not diagnose the learner. Do not claim complete course understanding.',
      'Prefer these template_id values: text.paragraph, formula.math, code.snippet.',
      'Use legacy block_type values only for compatibility: heading, paragraph, definition, theorem, proof, formula, example, exercise, answer, sidenote.',
      'JSON shape: {"blocks":[{"block_type":"paragraph","template_id":"text.paragraph","learning_role":"note","title":"...","content_json":{"body":"..."},"plain_text":"...","confidence":0.7,"warnings":[]}]}',
    ].join('\n');
    let text = '';
    for await (const chunk of provider.chat(
      [{ role: 'user', content: `Draft organized note proposal blocks for "${title}" from these source ranges:\n\n${sourceBrief}` }],
      [],
      systemPrompt
    )) {
      if (chunk.type === 'text') text += chunk.text;
      if (chunk.type === 'error') return null;
    }
    const parsed = JSON.parse(text) as { blocks?: any[] };
    if (!Array.isArray(parsed.blocks)) return null;

    const fallbackRefs = segments.flatMap((segment) => sourceReferencesForSegment(db, segment)).slice(0, 3);
    const blocks = parsed.blocks
      .map((block, index) => sanitizeAiBlock(db, userId, block, fallbackRefs, index))
      .filter((block): block is OrganizedNoteBlock => Boolean(block));
    return blocks.length > 0 ? blocks : null;
  } catch {
    return null;
  }
}

export async function createOrganizedNoteProposal(
  db: Database.Database,
  userId: string,
  input: CreateOrganizedNoteProposalInput
) {
  const course = getOwnedCourse(db, userId, input.course_id);
  const resolvedBoard = resolveSourceBoardForProposal(db, userId, input.course_id, input.source_board_id);
  const requestedScopeIds = [...new Set([...(input.source_scope_ids || []), ...resolvedBoard.source_scope_ids])];
  const resolvedScopes = resolveSourceScopesForProposal(db, userId, input.course_id, requestedScopeIds);
  const scopedInput = {
    ...input,
    document_ids: input.document_ids || resolvedScopes.document_ids,
    source_material_ids: input.source_material_ids || resolvedScopes.source_material_ids,
    segment_ids: input.segment_ids || resolvedScopes.segment_ids,
  };
  const { segments, warnings } = scopedSegments(db, userId, input.course_id, scopedInput);
  const sourceMaterialIds = [...new Set(segments.map((segment) => segment.source_material_id).filter(Boolean))];
  const segmentIds = segments.map((segment) => segment.id);
  const title = input.note_title || `${course.name} Organized Notes`;
  const settings = getUserSettings(db, userId);
  const aiBlocks = await tryGenerateAiBlocks(db, userId, settings, title, segments);
  const blocks = aiBlocks || deterministicBlocks(db, userId, segments);
  const generationMode = aiBlocks ? 'ai' as const : 'deterministic_fallback' as const;
  const allWarnings = aiBlocks
    ? [...resolvedBoard.warnings, ...resolvedScopes.warnings, ...warnings]
    : [
      ...resolvedBoard.warnings,
      ...resolvedScopes.warnings,
      ...warnings,
      hasAiKey(settings)
        ? 'AI generation failed or returned invalid output; deterministic fallback created the proposal.'
        : 'AI generation was not used because no AI key is configured; deterministic fallback created the proposal.',
    ];

  if (blocks.length === 0) {
    throw new AppError(400, 'No source-backed blocks could be generated for this proposal');
  }

  const now = new Date().toISOString();
  const proposalId = uuidv4();
  const data: OrganizedNoteData = {
    version: 'v2.1',
    proposal_kind: 'organized_note',
    course_id: input.course_id,
    title,
    description: 'Candidate note generated from selected source material.',
    generation_mode: generationMode,
    source_board_id: resolvedBoard.source_board_id,
    source_material_ids: sourceMaterialIds,
    source_scope_ids: resolvedScopes.source_scope_ids,
    scope_summary: resolvedScopes.scope_summary,
    segment_ids: segmentIds,
    blocks,
    warnings: allWarnings,
  };

  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'organized_note', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  db.prepare(`
    UPDATE source_materials
    SET proposal_status = 'note_proposed', updated_at = ?
    WHERE user_id = ? AND id IN (${sourceMaterialIds.map(() => '?').join(', ')})
  `).run(now, userId, ...sourceMaterialIds);

  return {
    id: proposalId,
    user_id: userId,
    type: 'organized_note',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

export function applyOrganizedNoteProposal(db: Database.Database, userId: string, proposal: ProposalRow) {
  if (proposal.type !== 'organized_note') {
    throw new AppError(400, 'Proposal is not an organized note proposal');
  }

  const data = parseJson<OrganizedNoteData | null>(proposal.data, null);
  if (!data || data.proposal_kind !== 'organized_note' || !Array.isArray(data.blocks) || data.blocks.length === 0) {
    throw new AppError(400, 'Organized note proposal is malformed');
  }
  getOwnedCourse(db, userId, data.course_id);

  const now = new Date().toISOString();
  const batchId = uuidv4();
  const noteId = uuidv4();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply organized note proposal', 'applied', ?, ?)
  `).run(batchId, userId, data.course_id, proposal.id, JSON.stringify({ proposal_type: 'organized_note' }), now);

  db.prepare(`
    INSERT INTO notes (
      id, user_id, course_id, title, description, source_kind, metadata,
      operation_batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'proposal', ?, ?, ?, ?)
  `).run(
    noteId,
    userId,
    data.course_id,
    data.title,
    data.description,
    JSON.stringify({ proposal_id: proposal.id, generation_mode: data.generation_mode }),
    batchId,
    now,
    now
  );

  const insertBlock = db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, title, content_json, plain_text,
      source_kind, metadata, operation_batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'proposal', ?, ?, ?, ?)
  `);
  const insertPlacement = db.prepare(`
    INSERT INTO note_block_placements (id, note_id, block_id, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertSource = db.prepare(`
    INSERT INTO note_block_sources (
      id, block_id, document_id, document_chunk_id, source_page_start,
      source_page_end, source_excerpt, reference_type, confidence, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const block of data.blocks.sort((a, b) => a.order_index - b.order_index)) {
    const blockId = uuidv4();
    insertBlock.run(
      blockId,
      userId,
      data.course_id,
      block.block_type,
      block.title,
      JSON.stringify(block.content_json || {}),
      block.plain_text || null,
      JSON.stringify({
        ...mergeRuntimeNoteBlockTemplateMetadata(
          db,
          userId,
          block.metadata || {},
          block.block_type,
          { allowUnknownTemplateFallback: true },
        ).metadata,
        proposal_id: proposal.id,
        temp_id: block.temp_id,
      }),
      batchId,
      now,
      now
    );
    insertPlacement.run(uuidv4(), noteId, blockId, block.order_index, now, now);

    for (const ref of block.source_references || []) {
      insertSource.run(
        uuidv4(),
        blockId,
        ref.document_id || null,
        ref.document_chunk_id || null,
        ref.source_page_start ?? null,
        ref.source_page_end ?? null,
        ref.source_excerpt || null,
        ref.reference_type || 'chunk',
        ref.confidence ?? null,
        JSON.stringify(ref.metadata || {})
      );
    }
  }

  if (data.source_material_ids.length > 0) {
    db.prepare(`
      UPDATE source_materials
      SET proposal_status = 'note_applied',
          used_in_note_count = used_in_note_count + 1,
          updated_at = ?
      WHERE user_id = ? AND id IN (${data.source_material_ids.map(() => '?').join(', ')})
    `).run(now, userId, ...data.source_material_ids);
  }

  return {
    message: 'Organized note proposal applied successfully',
    note_id: noteId,
    operation_batch_id: batchId,
    blocks_count: data.blocks.length,
  };
}
