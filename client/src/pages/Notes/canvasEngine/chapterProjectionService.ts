import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import { getTextFlowContent } from './textFlowService';

export interface ChapterAgendaEntry {
  /** A read-side anchor made from existing block and unit identities. */
  id: string;
  blockId: string;
  unitId: string;
  level: 1 | 2 | 3;
  title: string;
  parentId: string | null;
  number: number[];
}

export interface ChapterNode extends ChapterAgendaEntry {
  children: ChapterNode[];
  /** Half-open positions in the original input sequence, never stored ownership. */
  startIndex: number;
  endIndex: number;
  blockIds: string[];
}

export interface ChapterProjection {
  roots: ChapterNode[];
  chapters: ChapterNode[];
  agenda: ChapterAgendaEntry[];
}

function headingLevel(role: string): ChapterNode['level'] | null {
  if (role === 'heading' || role === 'heading_1') return 1;
  if (role === 'heading_2') return 2;
  if (role === 'heading_3') return 3;
  return null;
}

/** Chapters are ranges derived from the current block sequence and TextFlow.
 * A skipped level creates no synthetic heading; the nearest smaller level owns
 * the branch. Callers supply exclusions without introducing page semantics here.
 */
export function deriveChapterProjection(
  blocks: readonly NoteBlock[],
  flowDrafts: Record<string, TextBlockContentV1> = {},
  excludedBlockIds: ReadonlySet<string> = new Set(),
): ChapterProjection {
  const roots: ChapterNode[] = [];
  const chapters: ChapterNode[] = [];
  const ancestors: ChapterNode[] = [];

  blocks.forEach((block, index) => {
    if (excludedBlockIds.has(block.id)) return;
    const flow = flowDrafts[block.id] ?? getTextFlowContent(block.content_json);
    // The editing boundary produces one heading unit per heading block. Legacy
    // content is read without rewriting it; the first heading names its block.
    const unit = flow?.units.find((entry) => entry.status !== 'deleted' && headingLevel(entry.writing_role) !== null);
    const level = unit && headingLevel(unit.writing_role);
    if (!unit || !level) return;

    while (ancestors.length && ancestors[ancestors.length - 1]!.level >= level) {
      ancestors.pop()!.endIndex = index;
    }
    const parent = ancestors[ancestors.length - 1];
    const siblings = parent?.children ?? roots;
    const node: ChapterNode = {
      id: `chapter:${encodeURIComponent(block.id)}:${encodeURIComponent(unit.id)}`,
      blockId: block.id,
      unitId: unit.id,
      level,
      title: unit.text,
      parentId: parent?.id ?? null,
      number: [...(parent?.number ?? []), siblings.length + 1],
      children: [],
      startIndex: index,
      endIndex: blocks.length,
      blockIds: [],
    };
    siblings.push(node);
    chapters.push(node);
    ancestors.push(node);
  });

  for (const chapter of chapters) {
    chapter.blockIds = blocks.slice(chapter.startIndex, chapter.endIndex)
      .filter((block) => !excludedBlockIds.has(block.id)).map((block) => block.id);
  }
  return {
    roots,
    chapters,
    agenda: chapters.map(({ id, blockId, unitId, level, title, parentId, number }) => ({
      id, blockId, unitId, level, title, parentId, number: [...number],
    })),
  };
}

/** Presentation-only hiding. An ancestor may hide a nested chapter's heading. */
export function getCollapsedChapterBlockIds(
  projection: ChapterProjection,
  collapsedIds: ReadonlySet<string>,
): Set<string> {
  const hidden = new Set<string>();
  for (const chapter of projection.chapters) {
    if (!collapsedIds.has(chapter.id)) continue;
    for (const blockId of chapter.blockIds) if (blockId !== chapter.blockId) hidden.add(blockId);
  }
  return hidden;
}

/** Expand chapter movement into a plain block order for the existing reorder
 * command and its undo stack. This function performs no writes or agent calls.
 */
export function moveChapterBlocks(
  blocks: readonly NoteBlock[],
  chapter: ChapterNode,
  targetBlockId: string,
  edge: 'before' | 'after',
): string[] | null {
  const previous = blocks.map((block) => block.id);
  const moving = new Set(chapter.blockIds);
  if (!moving.has(chapter.blockId) || moving.has(targetBlockId)
    || !previous.includes(targetBlockId) || chapter.blockIds.some((id) => !previous.includes(id))) return null;
  const retained = previous.filter((id) => !moving.has(id));
  const insertion = retained.indexOf(targetBlockId) + (edge === 'after' ? 1 : 0);
  const orderedMoving = previous.filter((id) => moving.has(id));
  const next = [...retained.slice(0, insertion), ...orderedMoving, ...retained.slice(insertion)];
  return next.every((id, index) => id === previous[index]) ? null : next;
}
