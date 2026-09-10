import type Database from 'better-sqlite3';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { updateNoteBlockSchema } from '../validators/index.js';
import { listAnnotationTruths } from './annotationTruths.js';
import { listBoardTextRanges } from './boardTextRanges.js';
import { updateNoteBlockContent } from './noteBlockContent.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';
import { textFlowIdForBlock } from './textFlowIdentity.js';

const id = z.string().trim().min(1).max(180);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const blockPayload = updateNoteBlockSchema.omit({ status: true })
  .extend({ content_json: updateNoteBlockSchema.shape.content_json.unwrap() }).strict();
const transferSchema = z.object({
  note_id: id,
  source_block_id: id,
  text_unit_id: id,
  id_mapping: z.object({ unit_id: id, inline_ids: z.record(id, id) }).strict().optional(),
  source_base_revision: revision,
  target_base_revision: revision,
  source_block: blockPayload,
  target_block: blockPayload,
}).strict();

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null;
}
function flowEntries(body: RecordValue, field: 'units' | 'inline_structures'): RecordValue[] {
  const entries = record(body.text_flow)?.[field];
  return Array.isArray(entries) ? entries.map(record).filter((entry): entry is RecordValue => entry !== null) : [];
}
function unitIdentity(unit: RecordValue): RecordValue {
  const { order_index: _order, ...identity } = unit;
  return identity;
}
interface StoredBlock {
  content_json: string;
  text_save_revision: number;
}
interface AnnotationAddress {
  id: string;
  block_id: string | null;
  text_flow_id: string | null;
  text_unit_id: string | null;
  inline_structure_id: string | null;
}

/** B10 extraction and C3 moves/replays commit both bodies and every anchor address together. */
export function saveAtomicTextUnitTransfer(db: Database.Database, userId: string, targetBlockId: string, value: unknown) {
  const input = transferSchema.parse(value);
  if (input.source_block_id === targetBlockId) throw new AppError(400, 'Unit transfer requires two blocks');
  return db.transaction(() => {
    const ownedBlock = (blockId: string, baseRevision: number): StoredBlock => {
      const current = db.prepare(`SELECT nb.content_json, nb.text_save_revision FROM note_blocks nb
        JOIN note_block_placements p ON p.block_id = nb.id
        JOIN notes n ON n.id = p.note_id
        WHERE nb.id = ? AND nb.user_id = ? AND nb.status = 'active' AND n.id = ? AND n.user_id = ?`)
        .get(blockId, userId, input.note_id, userId) as StoredBlock | undefined;
      if (!current) throw new AppError(404, 'Note block not found');
      if (current.text_save_revision !== baseRevision) {
        throw new AppError(409, 'stale_revision', {
          code: 'stale_revision', block_id: blockId, current_revision: current.text_save_revision,
        });
      }
      return current;
    };
    const source = ownedBlock(input.source_block_id, input.source_base_revision);
    const target = ownedBlock(targetBlockId, input.target_base_revision);
    assertSourceProjectionNoteContentWriteAllowed(db, userId, input.note_id, 'update_note_block');
    const sourceBody = record(JSON.parse(source.content_json)) ?? {};
    const targetBody = record(JSON.parse(target.content_json)) ?? {};
    const targetUnitId = input.id_mapping?.unit_id ?? input.text_unit_id;
    const inlineIdMapping = new Map(Object.entries(input.id_mapping?.inline_ids ?? {}));
    const sourceUnits = flowEntries(sourceBody, 'units').filter((unit) => unit.id === input.text_unit_id);
    const targetUnits = flowEntries(input.target_block.content_json, 'units').filter((unit) => unit.id === targetUnitId);
    if (sourceUnits.length !== 1 || sourceUnits[0].status === 'deleted' || targetUnits.length !== 1
      || flowEntries(input.source_block.content_json, 'units').some((unit) => unit.id === input.text_unit_id)
      || flowEntries(targetBody, 'units').some((unit) => unit.id === targetUnitId)
      || !isDeepStrictEqual({ ...unitIdentity(sourceUnits[0]), id: targetUnitId }, unitIdentity(targetUnits[0]))) {
      throw new AppError(409, 'Unit transfer must preserve the existing unit');
    }
    const sortedInline = (entries: RecordValue[]) => [...entries]
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const inlineStructures = flowEntries(sourceBody, 'inline_structures')
      .filter((inline) => inline.parent_text_unit_id === input.text_unit_id);
    const originalInlineIds = new Set(inlineStructures.map((inline) => String(inline.id)));
    const mappedInline = inlineStructures.map((inline) => ({ ...inline,
      id: inlineIdMapping.get(String(inline.id)) ?? inline.id, parent_text_unit_id: targetUnitId,
    }));
    const mappedInlineIds = new Set(mappedInline.map((inline) => String(inline.id)));
    const targetInline = flowEntries(input.target_block.content_json, 'inline_structures');
    if (originalInlineIds.size !== inlineStructures.length || mappedInlineIds.size !== inlineStructures.length
      || [...inlineIdMapping.keys()].some((inlineId) => !originalInlineIds.has(inlineId))
      || flowEntries(targetBody, 'inline_structures').some((inline) => mappedInlineIds.has(String(inline.id)))
      || flowEntries(input.source_block.content_json, 'inline_structures').some((inline) =>
        inline.parent_text_unit_id === input.text_unit_id || originalInlineIds.has(String(inline.id)))
      || targetInline.filter((inline) => mappedInlineIds.has(String(inline.id))).length !== inlineStructures.length
      || !isDeepStrictEqual(sortedInline(mappedInline), sortedInline(targetInline
        .filter((inline) => inline.parent_text_unit_id === targetUnitId)))) {
      throw new AppError(409, 'Unit transfer must preserve its inline structures');
    }
    const sourceFlowId = textFlowIdForBlock(input.source_block_id);
    const targetFlowId = textFlowIdForBlock(targetBlockId);
    const ranges = db.prepare(`SELECT id, block_id, text_flow_id, text_unit_id, inline_structure_id
      FROM annotation_ranges WHERE user_id = ? AND note_id = ?`).all(userId, input.note_id) as AnnotationAddress[];
    // Older inline-only anchors may omit both ownership columns. They are usable only when
    // the inline ID identifies one block in this note; a collision cannot guess ownership.
    const unscopedInline = ranges.filter((range) => range.block_id === null && range.text_flow_id === null
      && range.inline_structure_id !== null && originalInlineIds.has(range.inline_structure_id));
    if (unscopedInline.length > 0) {
      const otherBlocks = db.prepare(`SELECT nb.content_json FROM note_blocks nb
        JOIN note_block_placements p ON p.block_id = nb.id
        WHERE p.note_id = ? AND nb.user_id = ? AND nb.id <> ?`).all(input.note_id, userId, input.source_block_id) as StoredBlock[];
      const otherInlineIds = new Set(otherBlocks.flatMap((block) =>
        flowEntries(record(JSON.parse(block.content_json)) ?? {}, 'inline_structures').map((inline) => String(inline.id))));
      if (unscopedInline.some((range) => otherInlineIds.has(range.inline_structure_id!))) {
        throw new AppError(409, 'Unit transfer cannot resolve inline anchor ownership');
      }
    }
    const movedRanges = ranges.filter((range) => {
      const belongsToSource = range.block_id === input.source_block_id
        || (range.block_id === null && (range.text_flow_id === sourceFlowId || range.text_flow_id === null));
      return belongsToSource && ((range.text_unit_id === input.text_unit_id
        && (range.block_id !== null || range.text_flow_id === sourceFlowId))
        || (range.inline_structure_id !== null && originalInlineIds.has(range.inline_structure_id)));
    });
    const sourceBlock = updateNoteBlockContent(db, userId, input.source_block_id, input.source_block, input.source_base_revision);
    const targetBlock = updateNoteBlockContent(db, userId, targetBlockId, input.target_block, input.target_base_revision);
    // Update each address once, including ranges that carry both unit and inline IDs.
    // Offsets, excerpts, statuses, timestamps and every other field are untouched.
    const moveAnnotation = db.prepare(`UPDATE annotation_ranges
      SET block_id = ?, text_flow_id = ?, text_unit_id = ?, inline_structure_id = ?
      WHERE id = ? AND user_id = ? AND note_id = ?`);
    for (const range of movedRanges) {
      moveAnnotation.run(range.block_id === null ? null : targetBlockId,
        range.text_flow_id === null ? null : targetFlowId,
        range.text_unit_id === input.text_unit_id ? targetUnitId : range.text_unit_id,
        inlineIdMapping.get(range.inline_structure_id ?? '') ?? range.inline_structure_id,
        range.id, userId, input.note_id);
    }
    db.prepare(`UPDATE board_text_ranges SET block_id = ?, text_flow_id = ?, text_unit_id = ?
      WHERE user_id = ? AND note_id = ? AND block_id = ? AND text_unit_id = ?`)
      .run(targetBlockId, targetFlowId, targetUnitId, userId, input.note_id, input.source_block_id, input.text_unit_id);
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ? AND user_id = ?')
      .run(new Date().toISOString(), input.note_id, userId);
    return {
      source_block: sourceBlock, target_block: targetBlock,
      annotations: listAnnotationTruths(db, userId, input.note_id),
      text_ranges: listBoardTextRanges(db, userId, input.note_id),
      source_revision: sourceBlock.text_save_revision as number,
      target_revision: targetBlock.text_save_revision as number,
    };
  })();
}
