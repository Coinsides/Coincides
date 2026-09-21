import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultNoteBindingSettings } from '../../../../../../shared/types/noteBinding';
import type { NoteCoverEditorProps } from '../../../Courses/noteCover/NoteCoverEditor';
import { createPrimaryPageFrame } from '../engineModel';
import { createPageFrameCollectionSeed } from '../pageFrameCollectionService';
import { addNoteCoverPage } from '../noteCoverPageCollection';
import { loadCanvasImageAssetBlobUrl, uploadCanvasImageAsset } from '../canvasAssetRepository';
import { NoteCoverPageControls, type NoteCoverPageControlsProps } from './NoteCoverPageControls';

const capture = vi.hoisted(() => ({ editor: null as NoteCoverEditorProps | null }));
const pageCrop = { crop: { x: 25, y: 0, width: 50, height: 100 }, zoom: 1 };
const cardCrop = { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 };
const revokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn(), uploadCanvasImageAsset: vi.fn() }));
vi.mock('../../../Courses/noteCover/NoteCoverEditor', () => ({
  NoteCoverEditor: (props: NoteCoverEditorProps) => {
    capture.editor = props;
    return <div role="dialog" aria-label="取景测试">
      <button type="button" onClick={props.onCancel}>取消取景</button>
      <button type="button" onClick={() => { props.onImageLoaded?.({ width: 1000, height: 1000 }); props.onSave(pageCrop); }}>确认取景</button>
    </div>;
  },
}));

function props(withCover = true): NoteCoverPageControlsProps {
  const value = createDefaultNoteBindingSettings();
  const content = createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'content-page' }));
  if (withCover) { value.coverPage.frameId = 'cover-page'; value.cover = { assetId: 'original-image', card: cardCrop, page: pageCrop }; }
  return { noteId: 'cover-note', value, collection: withCover ? addNoteCoverPage(content, 'cover-page') : content,
    onChange: vi.fn(), onSave: vi.fn().mockResolvedValue(undefined), onAddBinding: vi.fn().mockResolvedValue(undefined) };
}

describe('NoteCoverPageControls', () => {
  it.each(['手册式', '简明式'])('T7 applies %s only in cover context and keeps all existing controls available', async (name) => {
    const input = props();
    input.onApplyPreset = vi.fn().mockResolvedValue(undefined);
    const view = render(<NoteCoverPageControls {...input} />);
    fireEvent.click(screen.getByRole('button', { name: `套用${name}封面` }));
    await screen.findByText(`已套用${name}，可继续编辑或撤销。`);
    expect(input.onApplyPreset).toHaveBeenCalledExactlyOnceWith(name === '手册式' ? 'manual' : 'concise');
    expect(screen.getByRole('button', { name: '添加题名件' }).matches(':disabled')).toBe(false);
    expect(input.onSave).not.toHaveBeenCalled();
    view.rerender(<NoteCoverPageControls {...props(false)} onApplyPreset={input.onApplyPreset} />);
    expect(screen.queryByRole('group', { name: '封面版式预设' })).toBeNull();
  });

  beforeEach(() => {
    capture.editor = null;
    vi.mocked(loadCanvasImageAssetBlobUrl).mockReset();
    vi.mocked(loadCanvasImageAssetBlobUrl).mockImplementation(async (id) => `blob:${id}`);
    vi.mocked(uploadCanvasImageAsset).mockReset();
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });
  afterEach(() => {
    cleanup();
    if (revokeUrl) Object.defineProperty(URL, 'revokeObjectURL', revokeUrl);
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('saves the new cover identity and page collection together before updating the local draft', async () => {
    const input = props(false);
    input.onBusyChange = vi.fn();
    let finish: () => void = () => {};
    vi.mocked(input.onSave).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<NoteCoverPageControls {...input} />);
    const button = screen.getByRole('button', { name: '添加封面页' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(input.onSave).toHaveBeenCalledTimes(1);
    const [saved, collection] = vi.mocked(input.onSave).mock.calls[0];
    expect(saved).toMatchObject({ version: 2, dropFolioOnCover: true, coverPage: { exportIncluded: true } });
    if (saved.version !== 2) throw new Error('Expected binding settings v2');
    expect(collection?.pageFrames[0].id).toBe(saved.coverPage.frameId);
    expect(collection?.primaryFrameId).toBe('content-page');
    expect(input.onChange).not.toHaveBeenCalled();
    expect(input.onBusyChange).toHaveBeenCalledExactlyOnceWith(true);
    await act(async () => { finish(); });
    expect(input.onChange).toHaveBeenCalledExactlyOnceWith(saved);
    expect(vi.mocked(input.onBusyChange).mock.calls).toEqual([[true], [false]]);
  });

  it('releases the parent busy state on unmount and ignores late completion', async () => {
    const input = props(false);
    input.onBusyChange = vi.fn();
    let finish: () => void = () => {};
    vi.mocked(input.onSave).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<NoteCoverPageControls {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '添加封面页' }));
    view.unmount();
    expect(vi.mocked(input.onBusyChange).mock.calls).toEqual([[true], [false]]);
    await act(async () => { finish(); });
    expect(input.onChange).not.toHaveBeenCalled();
    expect(input.onBusyChange).toHaveBeenCalledTimes(2);
  });

  it('keeps the cover and edited binding text after removal fails, and allows a retry', async () => {
    const input = props();
    input.value.sections[0].slots['header-left'].text = '待保存的手填文字';
    vi.mocked(input.onSave).mockRejectedValueOnce(new Error('封面未保存，请重试。'));
    render(<NoteCoverPageControls {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '移除封面页' }));
    await screen.findByRole('alert');
    expect(input.onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '调整封面取景' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '移除封面页' }));
    await waitFor(() => expect(input.onChange).toHaveBeenCalledTimes(1));
    const [saved, collection] = vi.mocked(input.onSave).mock.calls[1];
    expect(saved).toMatchObject({ coverPage: { frameId: null }, cover: { assetId: 'original-image', page: pageCrop } });
    expect(saved.sections[0].slots['header-left'].text).toBe('待保存的手填文字');
    expect(collection?.pageFrames.map((frame) => frame.id)).toEqual(['content-page']);
  });

  it('routes title and description actions to the note binding creation handler', async () => {
    const input = props();
    render(<NoteCoverPageControls {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '添加题名件' }));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: '添加述名件' }));
    await waitFor(() => expect(input.onAddBinding).toHaveBeenCalledTimes(2));
    expect(vi.mocked(input.onAddBinding).mock.calls).toEqual([['title'], ['description']]);
    expect(input.onSave).not.toHaveBeenCalled();
  });

  it('keeps the original asset and viewport when cancelling a replacement image', async () => {
    const input = props();
    const before = structuredClone(input.value);
    vi.mocked(uploadCanvasImageAsset).mockResolvedValue({ assetId: 'replacement-image' } as Awaited<ReturnType<typeof uploadCanvasImageAsset>>);
    render(<NoteCoverPageControls {...input} />);
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('选择纸页封面图'), { target: { files: [file] } });
    await screen.findByRole('dialog', { name: '取景测试' });
    expect(uploadCanvasImageAsset).toHaveBeenCalledExactlyOnceWith({ noteId: 'cover-note', file, source: 'note_cover_upload' });
    expect(capture.editor).toMatchObject({ imageUrl: 'blob:replacement-image', frameKind: 'page' });
    expect(capture.editor?.aspectRatio).toBe(input.collection.pageFrames[0].width / input.collection.pageFrames[0].height);
    fireEvent.click(screen.getByRole('button', { name: '取消取景' }));
    expect(input.value).toEqual(before);
    expect(input.onChange).not.toHaveBeenCalled();
    expect(input.onSave).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:replacement-image');
  });

  it('reopens the page viewport and changes only the draft on crop confirmation', async () => {
    const input = props();
    render(<NoteCoverPageControls {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '调整封面取景' }));
    await screen.findByRole('dialog', { name: '取景测试' });
    expect(capture.editor?.initialFrame).toBe(pageCrop);
    fireEvent.click(screen.getByRole('button', { name: '确认取景' }));
    expect(input.onChange).toHaveBeenCalledExactlyOnceWith({ ...input.value, cover: { assetId: 'original-image', card: cardCrop, page: pageCrop } });
    expect(input.onSave).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:original-image');
  });

  it('uses the existing canonical asset when it only has a card frame and preserves that viewport', async () => {
    const input = props();
    const cardFrame = { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 };
    if (input.value.version !== 2) throw new Error('Expected binding settings v2');
    input.value.cover = { assetId: 'card-image', card: cardFrame };
    const before = structuredClone(input.value);
    render(<NoteCoverPageControls {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '调整封面取景' }));
    await screen.findByRole('dialog', { name: '取景测试' });
    expect(loadCanvasImageAssetBlobUrl).toHaveBeenCalledExactlyOnceWith('card-image');
    expect(capture.editor?.initialFrame).toBeUndefined();
    expect(uploadCanvasImageAsset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '确认取景' }));
    expect(input.onChange).toHaveBeenCalledExactlyOnceWith({ ...input.value, cover: { assetId: 'card-image', card: cardFrame, page: pageCrop } });
    expect(input.value).toEqual(before);
  });

  it('keeps export inclusion and cover-image removal in the binding settings draft', () => {
    const input = props();
    render(<NoteCoverPageControls {...input} />);
    const exportToggle = screen.getByRole('checkbox', { name: '导出包含封面' }) as HTMLInputElement;
    expect(exportToggle.checked).toBe(true);
    fireEvent.click(exportToggle);
    expect(input.onChange).toHaveBeenCalledWith({ ...input.value, coverPage: { frameId: 'cover-page', exportIncluded: false } });
    fireEvent.click(screen.getByRole('button', { name: '移除封面图' }));
    expect(input.onChange).toHaveBeenLastCalledWith({ ...input.value, cover: null });
    expect(input.onSave).not.toHaveBeenCalled();
  });

  it('initializes the card viewport from the same original when the first image is uploaded on the page', async () => {
    const input = props();
    if (input.value.version !== 2) throw new Error('Expected binding settings v2');
    input.value.cover = null;
    vi.mocked(uploadCanvasImageAsset).mockResolvedValue({ assetId: 'first-image' } as Awaited<ReturnType<typeof uploadCanvasImageAsset>>);
    render(<NoteCoverPageControls {...input} />);
    fireEvent.change(screen.getByLabelText('选择纸页封面图'), { target: { files: [new File(['image'], 'first.png', { type: 'image/png' })] } });
    await screen.findByRole('dialog', { name: '取景测试' });
    fireEvent.click(screen.getByRole('button', { name: '确认取景' }));
    expect(input.onChange).toHaveBeenCalledExactlyOnceWith({ ...input.value,
      cover: { assetId: 'first-image', card: cardCrop, page: pageCrop } });
    expect(uploadCanvasImageAsset).toHaveBeenCalledTimes(1);
  });
});
