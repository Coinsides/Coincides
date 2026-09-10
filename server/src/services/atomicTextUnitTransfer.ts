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

/** B10 extraction/replay only. Both bodies and the unchanged unit's anchor ownership move together. */
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
    const sourceUnits = flowEntries(sourceBody, 'units').filter((unit) => unit.id === input.text_unit_id);
    const targetUnits = flowEntries(input.target_block.content_json, 'units').filter((unit) => unit.id === input.text_unit_id);
    if (sourceUnits.length !== 1 || sourceUnits[0].status === 'deleted' || targetUnits.length !== 1
      || flowEntries(input.source_block.content_json, 'units').some((unit) => unit.id === input.text_unit_id)
      || flowEntries(targetBody, 'units').some((unit) => unit.id === input.text_unit_id)
      || !isDeepStrictEqual(unitIdentity(sourceUnits[0]), unitIdentity(targetUnits[0]))) {
      throw new AppError(409, 'Unit transfer must preserve the existing unit');
    }
    const unitInline = (body: RecordValue) => flowEntries(body, 'inline_structures')
      .filter((inline) => inline.parent_text_unit_id === input.text_unit_id)
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const inlineStructures = unitInline(sourceBody);
    if (unitInline(input.source_block.content_json).length > 0
      || !isDeepStrictEqual(inlineStructures, unitInline(input.target_block.content_json))) {
      throw new AppError(409, 'Unit transfer must preserve its inline structures');
    }
    const sourceBlock = updateNoteBlockContent(db, userId, input.source_block_id, input.source_block, input.source_base_revision);
    const targetBlock = updateNoteBlockContent(db, userId, targetBlockId, input.target_block, input.target_base_revision);
    const targetFlowId = textFlowIdForBlock(targetBlockId);
    // No re-anchoring, offset adjustment, status reconciliation, metadata rewrite or new IDs.
    db.prepare(`UPDATE annotation_ranges SET block_id = ?,
      text_flow_id = CASE WHEN text_flow_id IS NULL THEN NULL ELSE ? END
      WHERE user_id = ? AND note_id = ? AND block_id = ? AND text_unit_id = ?`)
      .run(targetBlockId, targetFlowId, userId, input.note_id, input.source_block_id, input.text_unit_id);
    const moveInlineAnchor = db.prepare(`UPDATE annotation_ranges
      SET block_id = CASE WHEN block_id IS NULL THEN NULL ELSE ? END,
      text_flow_id = CASE WHEN text_flow_id IS NULL THEN NULL ELSE ? END
      WHERE user_id = ? AND note_id = ? AND (block_id = ? OR block_id IS NULL) AND inline_structure_id = ?`);
    for (const inline of inlineStructures) {
      moveInlineAnchor.run(targetBlockId, targetFlowId, userId, input.note_id, input.source_block_id, inline.id);
    }
    db.prepare(`UPDATE board_text_ranges SET block_id = ?, text_flow_id = ?
      WHERE user_id = ? AND note_id = ? AND block_id = ? AND text_unit_id = ?`)
      .run(targetBlockId, targetFlowId, userId, input.note_id, input.source_block_id, input.text_unit_id);
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
