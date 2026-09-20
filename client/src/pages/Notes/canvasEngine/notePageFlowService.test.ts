import { describe, expect, it } from 'vitest';
import { createPrimaryPageFrame } from './engineModel';
import { resolveDocumentPageFlowPlan } from './documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts, pageFlowFragmentProjections } from './notePageFlowService';
import { createPageStackFromFrame } from './pageStackCollectionService';
import type { NoteBlock, TextBlockContentV1, TextUnit } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import { PAGINATED_SOURCE_REFERENCE_HEIGHT_PX } from './pageFlowSourceReferenceService';

const layout: BlockBoxLayout = { x: 0, y: 123, width: 999, height: 42, frame_id: 'p1',
  coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };

function unit(text: string, index: number, patch: Partial<TextUnit> = {}): TextUnit {
  return { id: `unit-${index}`, text, order_index: index, indent_level: 0,
    writing_role: 'paragraph', metadata: {}, status: 'active', ...patch };
}

function block(units: TextUnit[]): NoteBlock {
  const flow: TextBlockContentV1 = { textflow_version: 'TextBlockContentV1', units, inline_structures: [], metadata: {} };
  return { id: 'body', placement_id: 'placement', display_overrides_json: {}, block_type: 'paragraph',
    title: null, content_json: { text_flow: flow }, plain_text: units.map((entry) => entry.text).join('\n'),
    metadata: {}, order_index: 0, source_references: [] };
}

function paginate(source: NoteBlock, drafts: Record<string, string> = {}) {
  const first = { ...createPrimaryPageFrame({ id: 'p1' }), width: 200, height: 120,
    contentInset: { top: 10, right: 10, bottom: 10, left: 10 } };
  return resolveDocumentPageFlowPlan({ collection: { pageFrames: [first], primaryFrameId: first.id,
    pageStacks: [createPageStackFromFrame(first)] },
  blocks: noteBlocksToPageFlow([source], { body: layout }, drafts, {}) });
}

describe('note content to shared page flow integration', () => {
  it('measures a newer plain-text draft through its end while keeping existing unit indentation', () => {
    const source = block([unit('旧文', 0, { indent_level: 2 })]);
    const text = '新文'.repeat(70);
    const adapted = noteBlocksToPageFlow([source], { body: layout }, { body: text }, {});
    expect(adapted[0]!.units).toEqual([expect.objectContaining({ startOffset: 0, endOffset: text.length, indentLevel: 2 })]);
    const result = paginate(source, { body: text });
    expect(result.fragments[result.fragments.length - 1]!.textRange!.end).toBe(text.length);
    expect(result.fragments.map((fragment) => text.slice(fragment.textRange!.start, fragment.textRange!.end)).join('')).toBe(text);
  });

  it('hides folded descendants without changing canonical offsets or losing following visible text', () => {
    const source = block([
      unit('折叠标题', 0, { writing_role: 'toggle_item', metadata: { collapsed: true } }),
      unit('不显示但仍保存在真相层'.repeat(40), 1, { indent_level: 1 }),
      unit('同级后文'.repeat(40), 2),
    ]);
    const before = structuredClone(source);
    const adapted = noteBlocksToPageFlow([source], { body: layout }, {}, {});
    expect(adapted[0]!.units!.map((entry) => entry.hidden)).toEqual([false, true, false]);
    const hidden = adapted[0]!.units![1]!;
    const result = paginate(source);
    expect(result.fragments.flatMap((fragment) => fragment.lines)
      .every((line) => line.endOffset <= hidden.startOffset || line.startOffset >= hidden.endOffset)).toBe(true);
    expect(result.fragments[result.fragments.length - 1]!.textRange!.end).toBe(source.plain_text!.length);
    expect(source).toEqual(before);
  });

  it('reserves the source-reference furniture on the first fragment only', () => {
    const source = block([unit('有出处的正文'.repeat(70), 0)]);
    source.source_references = [{ id: 'source', source_page_start: 1 }];
    const result = paginate(source);
    expect(result.fragments.length).toBeGreaterThan(1);
    for (const fragment of result.fragments) {
      const rows = fragment.lines.reduce((sum, line) => sum + line.heightPx, 0);
      expect(fragment.layout.height).toBe(Math.max(42, rows + 16 + (fragment.isFirst ? PAGINATED_SOURCE_REFERENCE_HEIGHT_PX : 0)));
    }
  });

  it('uses the same exact fragments in the canvas/Overview projection and first-layout consumers', () => {
    const source = block([unit('共用分页'.repeat(70), 0)]);
    const result = paginate(source);
    const projections = pageFlowFragmentProjections(result);
    expect(projections).toHaveLength(result.fragments.length);
    for (let index = 0; index < projections.length; index += 1) {
      const projection = projections[index]!;
      expect(projection.flowFragment).toBe(result.fragments[index]);
      expect(projection.pageFrameId).toBe(result.fragments[index]!.frameId);
      expect(projection.blockRect.width).toBe(result.fragments[index]!.layout.width);
    }
    expect(pageFlowFirstLayouts(result, { body: layout }).body).toBe(result.fragments[0]!.layout);
    expect(layout.y).toBe(123);
  });

  it('keeps trailing empty units addressable across a page boundary', () => {
    const source = block([unit('尾部空行'.repeat(9), 0), unit('', 1)]);
    const result = paginate(source);
    const rows = result.fragments.flatMap((fragment) => fragment.lines);
    expect(rows[rows.length - 1]).toMatchObject({ startOffset: source.plain_text!.length, endOffset: source.plain_text!.length });
    expect(result.frames.length).toBeLessThan(10);
  });
});
