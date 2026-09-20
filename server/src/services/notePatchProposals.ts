import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { NotePatchAcceptance, NotePatchProposalData, NotePatchReview } from '../../../shared/types/notePatch.js';
import { AppError } from '../middleware/errorHandler.js';
import { createNotePatchProposalSchema } from '../validators/notePatch.js';
import { createProposal, type ProposalCreationContext } from './proposals.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';
import { sliceGraphemes, snapGraphemeOffset } from './graphemes.js';

type Json = Record<string, any>;
interface BlockRow { id: string; block_type: string; status: string; content_json: string; plain_text: string | null; text_save_revision: number }
interface ProposalRow { id: string; type: string; status: string; data: string }
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const same = (left: unknown, right: unknown) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
function blockHash(block: BlockRow) {
  return createHash('sha256').update(JSON.stringify(canonical({ type: block.block_type, status: block.status,
    content: JSON.parse(block.content_json), plain_text: block.plain_text }))).digest('hex');
}
function readBlock(db: Database.Database, userId: string, noteId: string, blockId: string): BlockRow | undefined {
  return db.prepare(`SELECT DISTINCT nb.id, nb.block_type, nb.status, nb.content_json, nb.plain_text, nb.text_save_revision
    FROM note_blocks nb JOIN note_block_placements p ON p.block_id = nb.id JOIN notes n ON n.id = p.note_id
    WHERE nb.id = ? AND nb.user_id = ? AND p.note_id = ? AND n.user_id = ? AND nb.status = 'active'`)
    .get(blockId, userId, noteId, userId) as BlockRow | undefined;
}
function flowFor(block: BlockRow): Json {
  const flow = JSON.parse(block.content_json).text_flow;
  if (!flow || flow.textflow_version !== 'TextBlockContentV1' || !Array.isArray(flow.units)
    || !Array.isArray(flow.inline_structures)) throw new AppError(400, 'note_patch requires an existing TextFlow unit');
  return flow;
}
function pendingRow(db: Database.Database, userId: string, id: string): ProposalRow {
  const row = db.prepare("SELECT id,type,status,data FROM proposals WHERE id = ? AND user_id = ? AND type = 'note_patch' AND status = 'pending'")
    .get(id, userId) as ProposalRow | undefined;
  if (!row) throw new AppError(404, 'Pending note patch proposal not found');
  return row;
}
function isCurrent(block: BlockRow | undefined, patch: NotePatchReview) {
  return !!block && block.text_save_revision === patch.base_revision && blockHash(block) === patch.base_hash;
}

export function createNotePatchProposal(db: Database.Database, userId: string, value: unknown, context: ProposalCreationContext) {
  const input = createNotePatchProposalSchema.parse(value);
  return db.transaction(() => {
    const note = db.prepare('SELECT title FROM notes WHERE id = ? AND user_id = ?').get(input.note_id, userId) as { title: string } | undefined;
    if (!note) throw new AppError(404, 'Note not found');
    assertSourceProjectionNoteContentWriteAllowed(db, userId, input.note_id, 'update_note_block');
    const targets = new Set<string>();
    const patches: NotePatchReview[] = input.patches.map(patch => {
      const block = readBlock(db, userId, input.note_id, patch.block_id);
      if (!block) throw new AppError(404, 'Note patch block not found');
      const units = flowFor(block).units.filter((unit: Json) => unit.status === 'active');
      if (!patch.unit_id && units.length !== 1) throw new AppError(400, 'unit_id is required for a block with multiple units');
      const unit = units.find((candidate: Json) => candidate.id === patch.unit_id) ?? (!patch.unit_id ? units[0] : undefined);
      if (!unit || typeof unit.text !== 'string') throw new AppError(400, 'Note patch unit not found');
      const target = JSON.stringify([patch.block_id, unit.id]);
      if (targets.has(target)) throw new AppError(400, 'A proposal can replace each unit once');
      targets.add(target);
      return { block_id: patch.block_id, unit_id: unit.id, new_text: patch.new_text, old_text: unit.text,
        base_revision: block.text_save_revision, base_hash: blockHash(block), status: 'pending' };
    });
    return createProposal(db, userId, { type: 'note_patch', context,
      data: { note_id: input.note_id, note_title: note.title, patches } satisfies NotePatchProposalData });
  }).immediate();
}

/** Staleness is a read projection; opening the inbox never mutates a proposal. */
export function projectNotePatchProposal(db: Database.Database, userId: string, data: NotePatchProposalData): NotePatchProposalData {
  return { ...data, patches: data.patches.map(patch => patch.status === 'pending'
    && !isCurrent(readBlock(db, userId, data.note_id, patch.block_id), patch) ? { ...patch, status: 'stale' } : patch) };
}

function storeResolution(db: Database.Database, proposalId: string, data: NotePatchProposalData) {
  const unresolved = data.patches.some(patch => patch.status === 'pending');
  const status = unresolved ? 'pending' : data.patches.some(patch => patch.status === 'applied') ? 'applied' : 'discarded';
  db.prepare('UPDATE proposals SET data = ?, status = ?, resolved_at = ? WHERE id = ?')
    .run(JSON.stringify(data), status, unresolved ? null : new Date().toISOString(), proposalId);
}
export function discardNotePatch(db: Database.Database, userId: string, proposalId: string, patchIndex: number) {
  return db.transaction(() => {
    const row = pendingRow(db, userId, proposalId);
    const data = JSON.parse(row.data) as NotePatchProposalData;
    const patch = data.patches[patchIndex];
    if (!patch || patch.status !== 'pending') throw new AppError(409, 'Patch is already resolved');
    patch.status = 'discarded';
    storeResolution(db, proposalId, data);
    return projectNotePatchProposal(db, userId, data);
  }).immediate();
}

/** Same retained-prefix/suffix inline remapping as the existing human TextFlow edit. */
function replacementContent(block: BlockRow, patch: NotePatchReview) {
  const content = JSON.parse(block.content_json);
  const flow = flowFor(block);
  const unit = flow.units.find((entry: Json) => entry.id === patch.unit_id);
  if (!unit || unit.text !== patch.old_text) throw new AppError(409, 'stale_revision');
  const oldText = unit.text as string;
  const newText = patch.new_text;
  let prefix = 0;
  while (prefix < oldText.length && prefix < newText.length && oldText[prefix] === newText[prefix]) prefix++;
  while (true) {
    const aligned = Math.min(snapGraphemeOffset(oldText, prefix, 'backward'), snapGraphemeOffset(newText, prefix, 'backward'));
    if (aligned === prefix) break;
    prefix = aligned;
  }
  let suffix = 0;
  while (suffix < oldText.length - prefix && suffix < newText.length - prefix
    && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix++;
  while (suffix > 0) {
    const aligned = Math.min(oldText.length - snapGraphemeOffset(oldText, oldText.length - suffix, 'forward'),
      newText.length - snapGraphemeOffset(newText, newText.length - suffix, 'forward'));
    if (aligned === suffix) break;
    suffix = aligned;
  }
  const inline = oldText === newText ? flow.inline_structures : flow.inline_structures.map((item: Json) => {
    if (item.parent_text_unit_id !== unit.id || !item.anchor_range) return item;
    const range = item.anchor_range;
    const valid = Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end >= range.start && range.end <= oldText.length;
    if (valid && range.end <= prefix) return item;
    if (valid && range.start >= oldText.length - suffix) return { ...item,
      anchor_range: { start: range.start + newText.length - oldText.length, end: range.end + newText.length - oldText.length } };
    return { ...item, anchor_range: null, metadata: { ...item.metadata,
      pre_edit_offsets: item.metadata?.pre_edit_offsets ?? { text_unit_id: unit.id, start_offset: range.start,
        end_offset: range.end, range_text_cache: item.anchor_text ?? sliceGraphemes(oldText, range.start, range.end) } } };
  });
  const nextFlow = { ...flow, inline_structures: inline,
    units: flow.units.map((entry: Json) => entry.id === unit.id ? { ...entry, text: newText } : entry) };
  // Match the human editor projection: draft/deprecated siblings still render;
  // only deleted units are absent. Their status and content remain unchanged.
  const plainText = nextFlow.units.filter((entry: Json) => entry.status !== 'deleted')
    .slice().sort((left: Json, right: Json) => left.order_index - right.order_index).map((entry: Json) => entry.text).join('\n');
  return { content_json: { ...content, body: plainText, text_flow: nextFlow }, plain_text: plainText };
}

/** Runs only inside the human text-save transaction; it never saves block content itself. */
export function prepareNotePatchAcceptance(db: Database.Database, userId: string, noteId: string, blockId: string,
  baseRevision: number, candidate: Json, acceptance: NotePatchAcceptance) {
  const row = pendingRow(db, userId, acceptance.proposal_id);
  const data = JSON.parse(row.data) as NotePatchProposalData;
  const patch = data.patches[acceptance.patch_index];
  const block = readBlock(db, userId, noteId, blockId);
  if (data.note_id !== noteId || !patch || patch.block_id !== blockId || patch.status !== 'pending') {
    throw new AppError(409, 'Patch is not pending for this block');
  }
  if (!isCurrent(block, patch) || baseRevision !== patch.base_revision) throw new AppError(409, 'stale_revision', { code: 'stale_revision' });
  const expected = replacementContent(block!, patch);
  // Acknowledgement cannot smuggle a structural edit or a change to another unit.
  if (!same(candidate, expected)) throw new AppError(400, 'Accepted patch must save only the reviewed unit replacement');
  return (savedBlock: BlockRow) => {
    patch.status = 'applied';
    // Only this transaction's known edit advances sibling baselines. Human edits never do.
    const saved = readBlock(db, userId, noteId, savedBlock.id)!;
    for (const sibling of data.patches) if (sibling.status === 'pending' && sibling.block_id === blockId) {
      sibling.base_revision = saved.text_save_revision;
      sibling.base_hash = blockHash(saved);
    }
    storeResolution(db, row.id, data);
  };
}
