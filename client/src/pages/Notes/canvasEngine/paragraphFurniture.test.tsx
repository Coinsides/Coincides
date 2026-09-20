import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error Vitest runs in Node; this browser client intentionally has no @types/node dependency.
import { readFileSync } from 'node:fs';
// @ts-expect-error Use Node's file URL conversion without adding a dependency to the client.
import { fileURLToPath } from 'node:url';
import { PARAGRAPH_FURNITURE_KEY, readParagraphFurniture, writeParagraphFurniture, paragraphFurnitureGeometry, type ParagraphFurniture } from './paragraphFurniture';
import { ParagraphFurnitureEditor } from './blocks/ParagraphFurnitureEditor';
import { ParagraphFurnitureDecoration } from './blocks/ParagraphFurnitureDecoration';
import { createTextBlockContentV1 } from './textFlowService';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import { useParagraphFurnitureHistory } from './hooks/useParagraphFurnitureHistory';
import { usePlacementHistory } from './hooks/usePlacementHistory';
import { createPrimaryPageFrame } from './engineModel';
import { createPageStackFromFrame } from './pageStackCollectionService';
import { noteBlocksToPageFlow } from './notePageFlowService';
import { resolveDocumentPageFlowPlan } from './documentPageFlowService';

function paragraph(text = '稍夺其权，制其钱谷。'): NoteBlock {
  return { id: 'body', placement_id: 'placement', block_type: 'paragraph', title: null,
    content_json: { text_flow: createTextBlockContentV1(text) }, plain_text: text, order_index: 0,
    metadata: {}, display_overrides_json: { keep: 'present' }, source_references: [] };
}
const variants: ParagraphFurniture[] = [{ variant: 'quote', source: '《续资治通鉴长编》卷二' }, { variant: 'callout', label: '冷知识' }];

describe('paragraph furniture appearance', () => {
  it.each(variants)('round-trips $variant without altering content, identity or unrelated overrides', (value) => {
    const block = paragraph(); const before = structuredClone(block);
    const saved = { ...block, display_overrides_json: JSON.parse(JSON.stringify(writeParagraphFurniture(block, value))) };
    expect(readParagraphFurniture(saved)).toEqual(value);
    expect(writeParagraphFurniture(saved, null)).toEqual(before.display_overrides_json);
    expect(saved.content_json).toBe(block.content_json);
    expect(block).toEqual(before);
  });
  it('defaults the callout label to 注 and leaves non-paragraph blocks alone', () => {
    const block = paragraph(); block.display_overrides_json[PARAGRAPH_FURNITURE_KEY] = { variant: 'callout', label: '' };
    expect(readParagraphFurniture(block)).toEqual({ variant: 'callout', label: '注' });
    expect(readParagraphFurniture({ ...block, block_type: 'table' })).toBeNull();
  });
  it.each(variants)('keeps every original character and coordinate while paginating $variant', (value) => {
    const block = paragraph('制度与日常，'.repeat(120)); block.display_overrides_json = writeParagraphFurniture(block, value);
    const before = structuredClone(block);
    const frame = { ...createPrimaryPageFrame({ id: 'page' }), width: 240, height: 190,
      contentInset: { top: 10, right: 10, bottom: 10, left: 10 } };
    const layout: BlockBoxLayout = { x: 0, y: 45, width: 800, height: 42, frame_id: 'page', coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
    const result = resolveDocumentPageFlowPlan({ collection: { pageFrames: [frame], primaryFrameId: frame.id,
      pageStacks: [createPageStackFromFrame(frame)] }, blocks: noteBlocksToPageFlow([block], { body: layout }, {}, {}) });
    expect(result.fragments.length).toBeGreaterThan(1);
    expect(result.fragments.map((part) => block.plain_text!.slice(part.textRange!.start, part.textRange!.end)).join('')).toBe(block.plain_text);
    expect(result.overflows).toEqual([]);
    for (const part of result.fragments) expect(part.layout.height).toBe(16 + part.lines.reduce((n, line) => n + line.heightPx, 0)
      + paragraphFurnitureGeometry(value, part.layout.width).extraHeight);
    expect(layout).toMatchObject({ x: 0, y: 45, width: 800 });
    expect(block).toEqual(before);
  });
  it('renders the seal once, the citation on the last fragment, and uses palette tokens in print', () => {
    const { container } = render(<ParagraphFurnitureDecoration value={variants[0]} fragments={[
      { id: 'a', left: 0, top: 0, width: 300, height: 100, first: true, last: false },
      { id: 'b', left: 0, top: 150, width: 250, height: 100, first: false, last: true },
    ]} />);
    expect(screen.getAllByText('引')).toHaveLength(1);
    expect(container.querySelectorAll('[data-paragraph-furniture="quote"]')).toHaveLength(2);
    expect(container.lastElementChild?.textContent).toContain('《续资治通鉴长编》卷二');
    const css = readFileSync(fileURLToPath(import.meta.url).replace(/paragraphFurniture\.test\.tsx$/, 'blocks/ParagraphFurniture.module.css'), 'utf8');
    for (const token of ['--sk-paper', '--sk-accent', '--sk-annotation', '--sk-danger', '--sk-hairline', '--sk-ink-muted']) expect(css).toContain(`var(${token})`);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toContain('border: 1px dashed');
    expect(css).toContain('text-align: right');
    expect(css).toContain('print-color-adjust: exact');
  });
  it('exposes both variants, editable pure-text fields and a reset to body', async () => {
    const save = vi.fn(async () => true); const close = vi.fn();
    const { unmount } = render(<ParagraphFurnitureEditor value={null} onSave={save} onClose={close} />);
    fireEvent.change(screen.getByRole('combobox', { name: '段落样式' }), { target: { value: 'quote' } });
    fireEvent.change(screen.getByLabelText('引文出处'), { target: { value: '《宋史》' } });
    await act(async () => { fireEvent.click(screen.getByText('保存样式')); });
    expect(save).toHaveBeenLastCalledWith({ variant: 'quote', source: '《宋史》' }); unmount();
    const second = render(<ParagraphFurnitureEditor value={null} onSave={save} onClose={close} />);
    fireEvent.change(screen.getByRole('combobox', { name: '段落样式' }), { target: { value: 'callout' } });
    expect((screen.getByLabelText('提示标签') as HTMLInputElement).value).toBe('注');
    fireEvent.change(screen.getByLabelText('提示标签'), { target: { value: '冷知识' } });
    await act(async () => { fireEvent.click(screen.getByText('保存样式')); });
    expect(save).toHaveBeenLastCalledWith({ variant: 'callout', label: '冷知识' }); second.unmount();
    render(<ParagraphFurnitureEditor value={variants[0]} onSave={save} onClose={close} />);
    fireEvent.change(screen.getByRole('combobox', { name: '段落样式' }), { target: { value: 'plain' } });
    await act(async () => { fireEvent.click(screen.getByText('保存样式')); });
    expect(save).toHaveBeenLastCalledWith(null);
  });
  it('preserves the open draft after a failed save and cancels without writing', async () => {
    const save = vi.fn(async () => false); const close = vi.fn();
    render(<ParagraphFurnitureEditor value={variants[1]} onSave={save} onClose={close} />);
    fireEvent.change(screen.getByLabelText('提示标签'), { target: { value: '备忘' } });
    await act(async () => { fireEvent.click(screen.getByText('保存样式')); });
    expect(screen.getByRole('alert').textContent).toContain('未能保存');
    expect((screen.getByLabelText('提示标签') as HTMLInputElement).value).toBe('备忘');
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('取消')); expect(close).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledTimes(1);
  });
  it('uses one runtime history entry and replays both directions without changing TextFlow', async () => {
    const initial = paragraph();
    const { result } = renderHook(() => {
      const [blocks, setBlocks] = useState([initial]);
      const history = usePlacementHistory({ noteId: 'note', generation: 1, applyLayoutDrafts: () => {}, persistLayoutSnapshot: () => {}, target: null });
      const editor = useParagraphFurnitureHistory({ noteId: 'note', generation: 1, blocks, history, boundary: () => true,
        saveParagraphFurniture: async (block, value) => { setBlocks((list) => list.map((entry) => entry.id === block.id
          ? { ...entry, display_overrides_json: writeParagraphFurniture(entry, value) } : entry)); return true; } });
      return { blocks, history, editor };
    });
    await act(async () => { expect(await result.current.editor.save(initial, variants[0])).toBe(true); });
    expect(readParagraphFurniture(result.current.blocks[0])).toEqual(variants[0]);
    await act(async () => { await result.current.history.undoRuntimeHistory(); });
    expect(readParagraphFurniture(result.current.blocks[0])).toBeNull();
    await act(async () => { await result.current.history.redoRuntimeHistory(); });
    expect(readParagraphFurniture(result.current.blocks[0])).toEqual(variants[0]);
    expect(result.current.blocks[0].content_json).toBe(initial.content_json);
  });
});
