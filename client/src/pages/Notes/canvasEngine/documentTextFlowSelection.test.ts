import { describe, expect, it } from 'vitest';
import {
  documentFlowSelectionText,
  orderedDocumentFlowSelection,
  replaceDocumentFlowSelection,
  type DocumentFlowBlock,
  type DocumentFlowPoint,
  type DocumentFlowSelection,
} from './documentTextFlowSelection';
import type { NoteBlock, TextBlockContentV1, TextUnit } from './runtimeDataTypes';

function makeBlock(id: string, texts: string[], overrides: Partial<NoteBlock> = {}): DocumentFlowBlock {
  const flow: TextBlockContentV1 = {
    textflow_version: 'TextBlockContentV1',
    units: texts.map((text, index): TextUnit => ({
      id: `${id}-unit-${index}`,
      text,
      writing_role: index === 0 ? 'todo_item' : 'paragraph',
      indent_level: index + 1,
      order_index: index,
      metadata: { checked: true, nested: { tag: `${id}-${index}` } },
      status: index === 1 ? 'draft' : 'active',
    })),
    inline_structures: [{
      id: `${id}-inline`,
      semantic_kind: 'inline_code',
      parent_text_unit_id: `${id}-unit-0`,
      anchor_text: 'a',
      anchor_range: { start: 0, end: 1 },
      field_values: { language: 'text' },
      metadata: { retained: true },
      status: 'active',
    }],
    metadata: { writing: { language: 'en' } },
  };
  return {
    block: {
      id, placement_id: `placement-${id}`, display_overrides_json: { retained: true },
      canvas_layout: { x: 900 }, block_type: 'paragraph', title: `title-${id}`,
      content_json: { text_flow: flow }, plain_text: texts.join('\n'),
      metadata: { nested: { retained: true } }, order_index: 0, source_kind: 'manual',
      source_references: [{ document_id: 'synthetic-source' }], ...overrides,
    },
    flow,
    editable: true,
  };
}

function point(blockId: string, unitIndex: number, offset: number): DocumentFlowPoint {
  return { blockId, unitId: `${blockId}-unit-${unitIndex}`, offset };
}

const select = (anchor: DocumentFlowPoint, focus: DocumentFlowPoint): DocumentFlowSelection => ({ anchor, focus });

describe('document TextFlow selection ranges', () => {
  it('uses visible block order in both directions, independent of IDs, geometry and order_index', () => {
    const blocks = [makeBlock('z-first', ['alpha', 'beta']), makeBlock('a-last', ['gamma', 'delta'])];
    blocks[0].block.order_index = 90;
    blocks[1].block.order_index = 2;
    blocks[0].flow.units[0].order_index = 100;
    const start = point('z-first', 0, 2);
    const end = point('a-last', 1, 3);
    for (const selection of [select(start, end), select(end, start)]) {
      const original = structuredClone(selection);
      const range = orderedDocumentFlowSelection(blocks, selection);
      expect(range).toMatchObject({ start, end, startIndex: 0, endIndex: 1 });
      expect(range?.blocks.map(({ block, selection: clipped }) => [block.id, clipped])).toEqual([
        ['z-first', { anchor: { unitId: 'z-first-unit-0', offset: 2 }, focus: { unitId: 'z-first-unit-1', offset: 4 } }],
        ['a-last', { anchor: { unitId: 'a-last-unit-0', offset: 0 }, focus: { unitId: 'a-last-unit-1', offset: 3 } }],
      ]);
      expect(documentFlowSelectionText(blocks, selection)).toBe('pha\nbeta\n\ngamma\ndel');
      expect(selection).toEqual(original);
    }
  });

  it('includes every intermediate block and separates units and blocks with distinct newlines', () => {
    const blocks = [makeBlock('first', ['alpha']), makeBlock('middle', ['beta', '', 'gamma']), makeBlock('last', ['delta'])];
    expect(documentFlowSelectionText(blocks, select(point('first', 0, 2), point('last', 0, 3))))
      .toBe('pha\n\nbeta\n\ngamma\n\ndel');
    expect(documentFlowSelectionText(blocks, select(point('first', 0, 5), point('middle', 0, 0))))
      .toBe('\n\n');
  });

  it('keeps block-local B6 unit ordering and clamps textarea UTF-16 offsets', () => {
    const blocks = [makeBlock('one', ['A😀B', 'tail'])];
    expect(documentFlowSelectionText(blocks, select(point('one', 0, 3), point('one', 0, 1))))
      .toBe('😀');
    expect(orderedDocumentFlowSelection(blocks, select(point('one', 1, Infinity), point('one', 0, -2))))
      .toMatchObject({ start: point('one', 0, 0), end: point('one', 1, 4) });
    expect(orderedDocumentFlowSelection(blocks, select(point('one', 0, 2.8), point('one', 0, NaN))))
      .toMatchObject({ start: point('one', 0, 0), end: point('one', 0, 2) });
  });

  it('rejects crossing or selecting an item, media, projection, read-only or unsupported editor', () => {
    const barriers = [
      makeBlock('barrier', ['item'], { block_type: 'item_ref' }),
      makeBlock('barrier', ['image'], { block_type: 'image' }),
      makeBlock('barrier', ['projection'], { source_kind: 'source_projection' }),
      makeBlock('barrier', ['code'], { content_json: { language: 'typescript' } }),
      { ...makeBlock('barrier', ['read-only']), editable: false },
      makeBlock('barrier', []),
    ];
    for (const barrier of barriers) {
      const blocks = [makeBlock('first', ['alpha']), barrier, makeBlock('last', ['omega'])];
      for (const selection of [
        select(point('first', 0, 1), point('last', 0, 3)),
        select(point('last', 0, 3), point('first', 0, 1)),
        select(point('first', 0, 1), point('barrier', 0, 0)),
        select(point('barrier', 0, 0), point('barrier', 0, 0)),
      ]) {
        expect(orderedDocumentFlowSelection(blocks, selection)).toBeNull();
        expect(documentFlowSelectionText(blocks, selection)).toBe('');
        expect(replaceDocumentFlowSelection(blocks, selection, 'replacement')).toBeNull();
      }
      expect(documentFlowSelectionText(blocks, select(point('last', 0, 0), point('last', 0, 5)))).toBe('omega');
    }
  });

  it('rejects missing endpoint identities without mutating any block', () => {
    const blocks = [makeBlock('first', ['alpha']), makeBlock('last', ['omega'])];
    const before = structuredClone(blocks);
    for (const selection of [
      select(point('missing', 0, 0), point('last', 0, 3)),
      select(point('first', 0, 0), point('missing', 0, 3)),
      select(point('first', 8, 0), point('last', 0, 3)),
      select(point('first', 0, 0), point('last', 8, 3)),
    ]) {
      expect(orderedDocumentFlowSelection(blocks, selection)).toBeNull();
      expect(replaceDocumentFlowSelection(blocks, selection, 'replacement')).toBeNull();
    }
    expect(blocks).toEqual(before);
    expect(orderedDocumentFlowSelection([], select(point('first', 0, 0), point('last', 0, 0)))).toBeNull();
  });
});

describe('document TextFlow selection replacement', () => {
  it('replaces a reverse three-block range only at its first endpoint, retaining independent blocks', () => {
    const blocks = [makeBlock('first', ['before', 'alpha']), makeBlock('middle', ['beta', 'gamma']), makeBlock('last', ['delta', 'after'])];
    const result = replaceDocumentFlowSelection(blocks, select(point('last', 0, 2), point('first', 1, 2)), 'X\nY', 'insertFromPaste');
    expect(result?.changes.map(({ block, nextTextFlow }) => [block.id, nextTextFlow.units.map(({ text }) => text)])).toEqual([
      ['first', ['before', 'alX\nY']], ['middle', ['']], ['last', ['lta', 'after']],
    ]);
    expect(result?.caret).toEqual(point('first', 1, 5));
    expect(result?.changes.map(({ metadata }) => metadata.inputType)).toEqual(['insertFromPaste', 'insertFromPaste', 'insertFromPaste']);
    expect(result?.changes[0].metadata).toEqual({
      unitId: 'first-unit-1', inputType: 'insertFromPaste', kind: 'structural', isComposing: false,
      beforeSelection: { unitId: 'first-unit-1', start: 2, end: 5 },
      afterSelection: { unitId: 'first-unit-1', start: 5, end: 5 },
    });
  });

  it('deletes every selected block to its own empty unit without removing or merging block identities', () => {
    const blocks = [makeBlock('first', ['alpha', 'beta']), makeBlock('last', ['gamma', 'delta'])];
    const result = replaceDocumentFlowSelection(blocks, select(point('first', 0, 0), point('last', 1, 5)), '', 'deleteContentForward');
    expect(result?.changes.map(({ block, nextTextFlow }) => [block.id, nextTextFlow.units])).toEqual([
      ['first', [{ ...blocks[0].flow.units[0], text: '' }]],
      ['last', [{ ...blocks[1].flow.units[0], text: '' }]],
    ]);
    expect(result?.caret).toEqual(point('first', 0, 0));
  });

  it('preserves full before/after flow fields, inline objects, first-unit fields and untouched units', () => {
    const blocks = [makeBlock('first', ['before', 'alpha', 'beta']), makeBlock('last', ['gamma', 'delta', 'after'])];
    const before = structuredClone(blocks);
    const result = replaceDocumentFlowSelection(blocks, select(point('first', 1, 2), point('last', 1, 3)), 'new');
    expect(result?.changes[0].previousTextFlow).toEqual(before[0].flow);
    expect(result?.changes[1].previousTextFlow).toEqual(before[1].flow);
    expect(result?.changes[0].nextTextFlow).toEqual({
      ...before[0].flow,
      units: [before[0].flow.units[0], { ...before[0].flow.units[1], text: 'alnew' }],
    });
    expect(result?.changes[1].nextTextFlow).toEqual({
      ...before[1].flow,
      units: [{ ...before[1].flow.units[0], text: 'ta' }, { ...before[1].flow.units[2], order_index: 1 }],
      inline_structures: [{
        ...before[1].flow.inline_structures[0], anchor_range: null,
        metadata: {
          ...before[1].flow.inline_structures[0].metadata,
          pre_edit_offsets: { text_unit_id: 'last-unit-0', start_offset: 0, end_offset: 1, range_text_cache: 'a' },
        },
      }],
    });
    expect(result?.changes.map(({ block }) => block)).toEqual(before.map(({ block }) => block));
    expect(blocks).toEqual(before);
  });

  it('retains B6 replacement semantics for a range wholly within a block, including pasted newlines', () => {
    const blocks = [makeBlock('only', ['alpha', 'beta', 'gamma'])];
    const result = replaceDocumentFlowSelection(blocks, select(point('only', 2, 2), point('only', 0, 2)), 'X\nY', 'insertFromPaste');
    expect(result?.changes).toHaveLength(1);
    expect(result?.changes[0].nextTextFlow.units).toEqual([{ ...blocks[0].flow.units[0], text: 'alX\nYmma' }]);
    expect(result?.caret).toEqual(point('only', 0, 5));
  });

  it('supports a collapsed caret in an empty block', () => {
    const blocks = [makeBlock('empty', [''])];
    const selection = select(point('empty', 0, 0), point('empty', 0, 0));
    expect(documentFlowSelectionText(blocks, selection)).toBe('');
    const result = replaceDocumentFlowSelection(blocks, selection, 'text');
    expect(result?.changes[0].nextTextFlow.units[0].text).toBe('text');
    expect(result?.caret).toEqual(point('empty', 0, 4));
  });
});
