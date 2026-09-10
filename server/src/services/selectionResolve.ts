import { getDb } from '../db/init.js';
import { textFlowIdForBlock } from './textFlowIdentity.js';
import { validTextFlowUnits } from './textFlowUnits.js';
import { sliceGraphemes } from './graphemes.js';

export interface SelectionReceiptRefInput {
  blockId: string;
  textFlowId: string;
  textUnitId: string;
}

export interface SelectionReceiptTextRangeInput extends SelectionReceiptRefInput {
  startOffset: number;
  endOffset: number;
  excerpt: string;
}

export interface ResolveSelectionInput {
  note_id: string;
  refs: SelectionReceiptRefInput[];
  text_ranges: SelectionReceiptTextRangeInput[];
  at: string;
}

export type ResolveSelectionOutcome = 'found' | 'text_drifted' | 'missing';

export type ResolveSelectionRangeResult =
  | ({ outcome: 'found' | 'text_drifted' } & SelectionReceiptRefInput)
  | { outcome: 'missing' };

export interface ResolveSelectionOutput {
  results: ResolveSelectionRangeResult[];
}

interface OwnedBlockRow {
  content_json: string;
}

function missingRange(): ResolveSelectionRangeResult {
  return { outcome: 'missing' };
}

function identifiedRange(
  range: SelectionReceiptTextRangeInput,
  outcome: Extract<ResolveSelectionOutcome, 'found' | 'text_drifted'>,
): ResolveSelectionRangeResult {
  return {
    outcome,
    blockId: range.blockId,
    textFlowId: range.textFlowId,
    textUnitId: range.textUnitId,
  };
}

function parseBlockBody(contentJson: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function resolveTextRange(
  userId: string,
  range: SelectionReceiptTextRangeInput,
): ResolveSelectionRangeResult {
  if (range.textFlowId !== textFlowIdForBlock(range.blockId)) return missingRange();

  const row = getDb().prepare(`
    SELECT content_json
    FROM note_blocks
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).get(range.blockId, userId) as OwnedBlockRow | undefined;
  if (!row) return missingRange();

  const body = parseBlockBody(row.content_json);
  if (!body) return missingRange();
  const unit = validTextFlowUnits(body)?.find((candidate) => candidate.id === range.textUnitId);
  if (!unit) return missingRange();

  const currentExcerpt = sliceGraphemes(unit.text, range.startOffset, range.endOffset);
  // Pre-B9 receipts may have cached a partial cluster. Preserve their read compatibility.
  const legacyExcerpt = unit.text.slice(range.startOffset, range.endOffset);
  return identifiedRange(
    range,
    range.excerpt === currentExcerpt || range.excerpt === legacyExcerpt ? 'found' : 'text_drifted',
  );
}

export function resolveSelection(
  userId: string,
  input: ResolveSelectionInput,
): ResolveSelectionOutput {
  return {
    results: input.text_ranges.map((range) => resolveTextRange(userId, range)),
  };
}
