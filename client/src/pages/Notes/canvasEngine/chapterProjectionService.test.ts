import { describe, expect, it } from 'vitest';
import {
  deriveChapterProjection, getCollapsedChapterBlockIds, moveChapterBlocks,
} from './chapterProjectionService';
import type { NoteBlock, TextBlockContentV1, TextUnitWritingRole } from './runtimeDataTypes';

function flow(text: string, role: TextUnitWritingRole = 'paragraph', unitId = 'tu-1'): TextBlockContentV1 {
  return { textflow_version: 'TextBlockContentV1', units: [{
    id: unitId, text, writing_role: role, indent_level: 0, order_index: 0, metadata: {}, status: 'active',
  }], inline_structures: [], metadata: {} };
}

function block(id: string, role: TextUnitWritingRole = 'paragraph', text = id): NoteBlock {
  return { id, placement_id: `p-${id}`, block_type: 'paragraph', title: null,
    content_json: { text_flow: flow(text, role) }, plain_text: text, metadata: {},
    order_index: 0, display_overrides_json: {}, source_references: [] };
}

describe('A4 derived chapter projection', () => {
  it('keeps preface outside chapters and infers nested half-open ranges through the next same or smaller level', () => {
    const blocks = [block('preface'), block('one', 'heading_1'), block('body'),
      block('two', 'heading_2'), block('three', 'heading_3'), block('detail'),
      block('next-two', 'heading_2'), block('next-one', 'heading_1'), block('tail')];
    const before = structuredClone(blocks);
    const result = deriveChapterProjection(blocks);
    expect(result.chapters.map(({ blockId, level, startIndex, endIndex, number }) => (
      { blockId, level, startIndex, endIndex, number }
    ))).toEqual([
      { blockId: 'one', level: 1, startIndex: 1, endIndex: 7, number: [1] },
      { blockId: 'two', level: 2, startIndex: 3, endIndex: 6, number: [1, 1] },
      { blockId: 'three', level: 3, startIndex: 4, endIndex: 6, number: [1, 1, 1] },
      { blockId: 'next-two', level: 2, startIndex: 6, endIndex: 7, number: [1, 2] },
      { blockId: 'next-one', level: 1, startIndex: 7, endIndex: 9, number: [2] },
    ]);
    expect(result.roots.map((chapter) => chapter.blockId)).toEqual(['one', 'next-one']);
    expect(result.roots[0]!.children.map((chapter) => chapter.blockId)).toEqual(['two', 'next-two']);
    expect(result.chapters[2]!.parentId).toBe(result.chapters[1]!.id);
    expect(result.chapters[0]!.blockIds).toEqual(['one', 'body', 'two', 'three', 'detail', 'next-two']);
    expect(blocks).toEqual(before);
  });

  it('does not synthesize missing levels or sort the caller sequence by placement order', () => {
    const blocks = [block('first-three', 'heading_3'), block('one', 'heading_1'),
      block('nested-three', 'heading_3'), block('two', 'heading_2')];
    blocks.forEach((entry, index) => { entry.order_index = blocks.length - index; });
    const result = deriveChapterProjection(blocks);
    expect(result.chapters.map((chapter) => [chapter.blockId, chapter.number])).toEqual([
      ['first-three', [1]], ['one', [2]], ['nested-three', [2, 1]], ['two', [2, 2]],
    ]);
    expect(result.chapters[0]!.parentId).toBeNull();
    expect(result.chapters[2]!.parentId).toBe(result.chapters[1]!.id);
    expect(result.chapters[2]!.endIndex).toBe(3);
  });

  it('has no virtual chapter for empty content or an all-paragraph document', () => {
    expect(deriveChapterProjection([])).toEqual({ roots: [], chapters: [], agenda: [] });
    expect(deriveChapterProjection([block('intro'), block('body')]).chapters).toEqual([]);
  });

  it('reads live roles and titles from drafts, preserves the legacy heading role and stable unit anchors', () => {
    const blocks = [block('legacy', 'heading', 'Old heading'), block('new', 'paragraph', 'Original')];
    const draft = flow('Edited chapter', 'heading_2', 'current-unit');
    const result = deriveChapterProjection(blocks, { new: draft });
    expect(result.chapters.map((chapter) => [chapter.level, chapter.title])).toEqual([[1, 'Old heading'], [2, 'Edited chapter']]);
    expect(result.chapters[1]!.unitId).toBe('current-unit');
    expect(result.chapters[1]!.id).toBe('chapter:new:current-unit');
    expect(deriveChapterProjection(blocks, { new: { ...draft, units: [{ ...draft.units[0]!, text: 'Renamed' }] } })
      .chapters[1]!.id).toBe(result.chapters[1]!.id);
    expect(deriveChapterProjection(blocks, { legacy: flow('Restored body') }).chapters).toEqual([]);
  });

  it('uses the existing TextFlow visible-status rule and makes different blocks with tu-1 distinct anchors', () => {
    const blocks = [block('deleted', 'heading_1'), block('draft', 'heading_2'), block('deprecated', 'heading_3')];
    const drafts = Object.fromEntries(blocks.map((entry) => [entry.id, flow(entry.id, 'heading_1')]));
    drafts.deleted!.units[0]!.status = 'deleted';
    drafts.draft!.units[0]!.status = 'draft';
    drafts.deprecated!.units[0]!.status = 'deprecated';
    const result = deriveChapterProjection(blocks, drafts);
    expect(result.chapters.map((chapter) => chapter.blockId)).toEqual(['draft', 'deprecated']);
    expect(new Set(result.chapters.map((chapter) => chapter.id)).size).toBe(2);
  });

  it('excludes caller-supplied residents without assigning page semantics or changing input indices', () => {
    const blocks = [block('excluded-title', 'heading_1'), block('one', 'heading_1'),
      block('excluded-body'), block('body'), block('next', 'heading_1')];
    const result = deriveChapterProjection(blocks, {}, new Set(['excluded-title', 'excluded-body']));
    expect(result.chapters.map((chapter) => chapter.blockId)).toEqual(['one', 'next']);
    expect(result.chapters[0]).toMatchObject({ startIndex: 1, endIndex: 4, blockIds: ['one', 'body'] });
  });

  it('dissolves a removed heading into its parent and retains every content block', () => {
    const blocks = [block('one', 'heading_1'), block('section', 'heading_2'), block('body'),
      block('next', 'heading_1'), block('tail')];
    const result = deriveChapterProjection(blocks.filter((entry) => entry.id !== 'section'));
    expect(result.chapters.map((chapter) => chapter.blockId)).toEqual(['one', 'next']);
    expect(result.chapters[0]!.blockIds).toEqual(['one', 'body']);
    expect(result.chapters[1]!.blockIds).toEqual(['next', 'tail']);
    expect(blocks.map((entry) => entry.id)).toEqual(['one', 'section', 'body', 'next', 'tail']);
  });

  it('aggregates agenda directly from heading units without content containers', () => {
    const result = deriveChapterProjection([block('one', 'heading_1', 'Intro'), block('body'), block('two', 'heading_2', 'Detail')]);
    expect(result.agenda).toEqual(result.chapters.map(({ id, blockId, unitId, level, title, parentId, number }) => (
      { id, blockId, unitId, level, title, parentId, number }
    )));
    expect(result.agenda[1]!.number).not.toBe(result.chapters[1]!.number);
    expect(result.agenda[0]).not.toHaveProperty('blockIds');
  });

  it('folds only descendants while a folded parent hides nested headings and expansion restores visibility', () => {
    const blocks = [block('one', 'heading_1'), block('body'), block('two', 'heading_2'),
      block('detail'), block('next', 'heading_1')];
    const result = deriveChapterProjection(blocks);
    const before = structuredClone(result);
    expect([...getCollapsedChapterBlockIds(result, new Set([result.chapters[1]!.id]))]).toEqual(['detail']);
    expect([...getCollapsedChapterBlockIds(result, new Set([result.chapters[0]!.id, result.chapters[1]!.id]))])
      .toEqual(['body', 'two', 'detail']);
    expect([...getCollapsedChapterBlockIds(result, new Set())]).toEqual([]);
    expect(result).toEqual(before);
  });

  it('expands moving a whole chapter into one stable block order, including nested chapters', () => {
    const blocks = [block('preface'), block('one', 'heading_1'), block('body'),
      block('two', 'heading_2'), block('detail'), block('next', 'heading_1'), block('tail')];
    const chapter = deriveChapterProjection(blocks).chapters[0]!;
    expect(moveChapterBlocks(blocks, chapter, 'tail', 'after'))
      .toEqual(['preface', 'next', 'tail', 'one', 'body', 'two', 'detail']);
    expect(moveChapterBlocks(blocks, chapter, 'preface', 'before'))
      .toEqual(['one', 'body', 'two', 'detail', 'preface', 'next', 'tail']);
    expect(blocks.map((entry) => entry.id)).toEqual(['preface', 'one', 'body', 'two', 'detail', 'next', 'tail']);
  });

  it('returns no move for a drop inside the chapter, its unchanged edge, or a removed target', () => {
    const blocks = [block('one', 'heading_1'), block('body'), block('next', 'heading_1')];
    const chapter = deriveChapterProjection(blocks).chapters[0]!;
    expect(moveChapterBlocks(blocks, chapter, 'body', 'after')).toBeNull();
    expect(moveChapterBlocks(blocks, chapter, 'one', 'before')).toBeNull();
    expect(moveChapterBlocks(blocks, chapter, 'next', 'before')).toBeNull();
    expect(moveChapterBlocks(blocks, chapter, 'removed', 'before')).toBeNull();
  });
});
