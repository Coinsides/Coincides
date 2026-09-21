import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COVER_PRESETS } from '../../../../../shared/types/notePresets';
import { applyCoverPreset, type CoverPresetHost } from './applyCoverPreset';
import { coverPresetPlacements } from './noteCoverPresets';
import { createPrimaryPageFrame } from './engineModel';
import { NoteTruthBindingProvider } from './NoteTruthBindingContext';
import { NoteRefBlockProjection } from './blocks/NoteRefBlockProjection';
import type { NoteBlock } from './runtimeDataTypes';
import type { RuntimeHistoryEntry } from './historyService';

function fixture() {
  const frame = createPrimaryPageFrame({ id: 'cover' });
  let entry: RuntimeHistoryEntry | undefined;
  const host: CoverPresetHost = {
    frame, blocks: [], layouts: {}, current: () => true,
    create: vi.fn(async (field, layout) => {
      const block: NoteBlock = { id: field, placement_id: `p-${field}`, block_type: 'note_ref', content_json: { field },
        plain_text: null, title: null, metadata: {}, display_overrides_json: {}, source_references: [], order_index: host.blocks.length };
      host.blocks.push(block); host.layouts[block.id] = structuredClone(layout); return block;
    }),
    place: vi.fn(async (block, layout) => { host.layouts[block.id] = structuredClone(layout); return true; }),
    trash: vi.fn(async (id) => { host.blocks = host.blocks.filter((block) => block.id !== id); return true; }),
    restore: vi.fn(async (block) => { host.blocks.push(block); return block; }),
    remember: vi.fn((next) => { entry = next; return true; }),
  };
  return { host, history: () => { if (entry?.type !== 'reversibleEdit') throw new Error('Missing history'); return entry; } };
}

describe('T7 cover presets', () => {
  it.each(COVER_PRESETS)('$name places two ordinary live references inside the actual cover content box', async (preset) => {
    const { host } = fixture();
    host.frame = { ...host.frame, width: 1100, height: 1500, contentInset: { left: 90, right: 110, top: 100, bottom: 120 } };
    expect(await applyCoverPreset(preset.id, host)).toBe('title');
    expect(host.blocks.map((block) => block.content_json)).toEqual([{ field: 'title' }, { field: 'description' }]);
    expect(host.blocks.every((block) => block.block_type === 'note_ref' && block.plain_text === null)).toBe(true);
    for (const layout of Object.values(host.layouts)) {
      expect(layout).toMatchObject({ frame_id: 'cover', width_mode: 'manual', coordinate_space: 'page_frame_local', surface: 'formal_page' });
      expect(layout.x).toBeGreaterThanOrEqual(0); expect(layout.y).toBeGreaterThanOrEqual(0);
      expect(layout.x + layout.width).toBeLessThanOrEqual(900);
      expect(layout.y + layout.height).toBeLessThanOrEqual(1280);
    }
    const title = host.layouts.title;
    if (preset.id === 'manual') { expect(title.x + title.width / 2).toBe(450); expect(title.width).toBeLessThan(100); }
    else { expect(title.x).toBe(0); expect(title.width).toBe(900); }
  });

  it('switches and repeats without duplicating bindings or changing other content, and can undo/redo', async () => {
    const { host, history } = fixture();
    await applyCoverPreset('manual', host);
    const manual = structuredClone(host.layouts);
    const unrelated = { ...host.blocks[0], id: 'body', content_json: { field: 'title' } };
    host.blocks.unshift(unrelated);
    host.layouts.body = { ...host.layouts.title, frame_id: 'body-page' };
    const bodyBefore = structuredClone(host.layouts.body);
    await applyCoverPreset('concise', host);
    expect(host.blocks).toHaveLength(3);
    expect(host.layouts.title.width).toBeGreaterThan(manual.title.width);
    expect(host.layouts.body).toEqual(bodyBefore);
    const saved = history();
    expect(await saved.undo()).toBe(true);
    expect(host.layouts.title).toEqual(manual.title);
    expect(await saved.redo()).toBe(true);
    expect(host.layouts.title.width).toBeGreaterThan(manual.title.width);
    await applyCoverPreset('concise', host);
    expect(host.create).toHaveBeenCalledTimes(2);
  });

  it('undoes newly created references without touching note truth, and restores the same ordinary blocks', async () => {
    const { host, history } = fixture();
    await applyCoverPreset('manual', host);
    const refs = structuredClone(host.blocks);
    expect(await history().undo()).toBe(true); expect(host.blocks).toHaveLength(0);
    expect(await history().redo()).toBe(true); expect(host.blocks).toEqual(refs);
  });

  it('rolls back a partial creation and retains an existing edited placement when the next write fails', async () => {
    const { host } = fixture();
    const create = host.create;
    host.create = vi.fn(async (field, layout) => field === 'description' ? null : create(field, layout));
    await expect(applyCoverPreset('manual', host)).rejects.toThrow('未添加');
    expect(host.blocks).toHaveLength(0); expect(host.remember).not.toHaveBeenCalled();
    host.create = create;
    await applyCoverPreset('manual', host);
    const before = structuredClone(host.layouts);
    vi.mocked(host.place).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(applyCoverPreset('concise', host)).rejects.toThrow('未保存');
    expect(host.layouts).toEqual(before);
  });

  it('stops the remaining writes when the note context changes', async () => {
    const { host } = fixture();
    let current = true;
    host.current = () => current;
    const create = host.create;
    host.create = async (...args) => { const block = await create(...args); current = false; return block; };
    await expect(applyCoverPreset('manual', host)).rejects.toThrow('已切换');
    expect(host.blocks).toHaveLength(1); expect(host.remember).not.toHaveBeenCalled();
    expect(host.trash).not.toHaveBeenCalled();
  });

  it.each(COVER_PRESETS)('$name references remain editable and follow current note fields after application', async (preset) => {
    const { host } = fixture();
    await applyCoverPreset(preset.id, host);
    const save = vi.fn();
    function Editor() {
      const [truth, setTruth] = useState({ title: '原题名', description: '原述名' });
      return <NoteTruthBindingProvider value={{ ...truth, onSave: save,
        onChange: (field, value) => setTruth((old) => ({ ...old, [field]: value })) }}>
        {host.blocks.map((block) => <NoteRefBlockProjection key={block.id} field={block.content_json.field as 'title' | 'description'} />)}
      </NoteTruthBindingProvider>;
    }
    render(<Editor />);
    fireEvent.change(screen.getByLabelText('封面题名'), { target: { value: '套用后改题' } });
    fireEvent.blur(screen.getByLabelText('封面题名'));
    fireEvent.change(screen.getByLabelText('封面述名'), { target: { value: '套用后改述' } });
    fireEvent.blur(screen.getByLabelText('封面述名'));
    await waitFor(() => expect(save.mock.calls).toEqual([['title'], ['description']]));
    expect((screen.getByLabelText('封面题名') as HTMLTextAreaElement).value).toBe('套用后改题');
    expect(host.blocks.map((block) => block.content_json)).toEqual([{ field: 'title' }, { field: 'description' }]);
    expect(host.layouts).toEqual(coverPresetPlacements(preset.id, host.frame));
  });
});
