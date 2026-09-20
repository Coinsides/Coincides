import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area, CropperProps } from 'react-easy-crop';
import type { MediaImageEditV1 } from '@shared/types';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import type { NoteBlock } from '../runtimeDataTypes';
import { MediaImageEditor } from './MediaImageEditor';

const captured = vi.hoisted(() => ({ props: null as CropperProps | null, keyboard: vi.fn() }));
vi.mock('react-easy-crop', () => ({ default: (props: CropperProps) => {
  captured.props = props;
  return <div data-testid="cropper" tabIndex={0} aria-label="Image crop area" onKeyDown={captured.keyboard} />;
} }));
vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));
const load = vi.mocked(loadCanvasImageAssetBlobUrl);
const revoke = vi.fn();
const block: NoteBlock = {
  id: 'media-editor', placement_id: 'placement-editor', block_type: 'media', title: null,
  content_json: {}, plain_text: '', order_index: 0, display_overrides_json: {}, canvas_layout: null,
  source_references: [], metadata: { media: { asset_id: 'asset-one', naturalWidth: 1200, naturalHeight: 800 } },
};
const editedBlock = (edit: MediaImageEditV1 | null): NoteBlock => ({ ...block,
  metadata: { media: { ...(block.metadata!.media as object), edit_v1: edit } },
});
function cropper() { if (!captured.props) throw new Error('Missing cropper'); return captured.props; }
async function loadMedia() {
  await screen.findByTestId('cropper');
  act(() => {
    cropper().onCropSizeChange?.({ width: 600, height: 400 });
    cropper().onMediaLoaded?.({ width: 600, height: 400, naturalWidth: 1200, naturalHeight: 800 });
    const area = cropper().initialCroppedAreaPercentages!;
    cropper().onCropComplete?.(area, area);
  });
}

beforeEach(() => {
  captured.props = null;
  captured.keyboard.mockClear();
  load.mockReset().mockResolvedValue('blob:media-editor');
  revoke.mockClear();
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = revoke; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('MediaImageEditor', () => {
  it('opens the whole original, leaves old metadata null on unchanged save and releases the asset', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const view = render(<MediaImageEditor block={block} aspectRatio={1} onSave={onSave} onCancel={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    await loadMedia();
    expect(cropper().aspect).toBe(1.5);
    expect(cropper().objectFit).toBe('contain');
    expect(cropper().initialCroppedAreaPercentages).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith(null));
    view.unmount();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:media-editor');
  });

  it('roundtrips a saved crop and nullable zoom exactly despite cropper initialization noise', async () => {
    const edit: MediaImageEditV1 = { crop: { x: 12.123456789, y: 20, w: 50, h: 40 }, zoom: null, rotation: 270 };
    const onSave = vi.fn().mockResolvedValue(true);
    render(<MediaImageEditor block={editedBlock(edit)} onSave={onSave} onCancel={vi.fn()} />);
    await screen.findByTestId('cropper');
    act(() => { cropper().onZoomChange?.(2); });
    await loadMedia();
    act(() => { cropper().onCropComplete?.({ x: 12.12345678901, y: 20, width: 50, height: 40 }, {} as Area); });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith(edit));
    expect(onSave.mock.calls[0][0]).toBe(edit);
  });

  it('saves drag and zoom percentages without baking or replacing the source asset', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<MediaImageEditor block={block} onSave={onSave} onCancel={vi.fn()} />);
    await loadMedia();
    act(() => {
      cropper().onInteractionStart?.({ source: 'mouse' });
      cropper().onCropChange({ x: 20, y: 10 });
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '2' } });
    const area = { x: 20, y: 25, width: 50, height: 50 };
    act(() => { cropper().onCropAreaChange?.(area, {} as Area); });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({
      crop: { x: 20, y: 25, w: 50, h: 50 }, zoom: 2, rotation: 0,
    }));
    expect(load).toHaveBeenCalledExactlyOnceWith('asset-one');
    expect(cropper().image).toBe('blob:media-editor');
  });

  it('turns through four rotations without introducing a crop or reloading the asset', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<MediaImageEditor block={block} onSave={onSave} onCancel={vi.fn()} />);
    await loadMedia();
    for (const rotation of [90, 180, 270, 0]) {
      fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));
      await loadMedia();
      expect(cropper().rotation).toBe(rotation);
      expect(cropper().aspect).toBe(rotation === 90 || rotation === 270 ? 2 / 3 : 1.5);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith(null));
    expect(load).toHaveBeenCalledExactlyOnceWith('asset-one');
  });

  it('rotates a cropped window and Reset explicitly restores null parameters', async () => {
    const edit: MediaImageEditV1 = { crop: { x: 10, y: 20, w: 50, h: 40 }, zoom: 2, rotation: 0 };
    const onSave = vi.fn().mockResolvedValue(true);
    render(<MediaImageEditor block={editedBlock(edit)} onSave={onSave} onCancel={vi.fn()} />);
    await loadMedia();
    fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));
    await loadMedia();
    expect(cropper().initialCroppedAreaPercentages).toEqual({ x: 40, y: 10, width: 40, height: 50 });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ crop: { x: 40, y: 10, w: 40, h: 50 }, zoom: 2, rotation: 90 }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Reset' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await loadMedia();
    expect(cropper().zoom).toBe(1);
    expect(cropper().rotation).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(null));
  });

  it('keeps the edit and error after a failed save, prevents duplicate saves and allows retry', async () => {
    let finish!: (value: boolean) => void;
    const onSave = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
    const onCancel = vi.fn();
    render(<MediaImageEditor block={block} onSave={onSave} onCancel={onCancel} />);
    await loadMedia();
    fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));
    await loadMedia();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => { finish(false); });
    expect(screen.getByRole('alert').textContent).toContain('Your edits are kept');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1][0]).toEqual({ crop: null, zoom: null, rotation: 90 });
  });

  it('cancels with Escape without saving and traps/restores focus', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const view = render(<MediaImageEditor block={block} onSave={onSave} onCancel={onCancel} />);
    await loadMedia();
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('cropper'));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
    fireEvent.keyDown(save, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    view.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('keeps modal undo/redo and crop keyboard events away from the underlying note', async () => {
    const noteHistory = vi.fn();
    const noteKeyboard = vi.fn();
    window.addEventListener('keydown', noteHistory);
    const view = render(<div onKeyDown={noteKeyboard}>
      <MediaImageEditor block={block} onSave={vi.fn()} onCancel={vi.fn()} />
    </div>);
    try {
      await loadMedia();
      for (const target of [screen.getByRole('button', { name: 'Rotate 90°' }), screen.getByRole('button', { name: 'Save' }), screen.getByTestId('cropper')]) {
        expect(fireEvent.keyDown(target, { key: 'z', ctrlKey: true })).toBe(false);
        expect(fireEvent.keyDown(target, { key: 'z', metaKey: true, shiftKey: true })).toBe(false);
        expect(fireEvent.keyDown(target, { key: 'y', ctrlKey: true })).toBe(false);
      }
      expect(captured.keyboard).not.toHaveBeenCalled();
      fireEvent.keyDown(screen.getByTestId('cropper'), { key: 'ArrowLeft' });
      expect(captured.keyboard).toHaveBeenCalledOnce();
      fireEvent.keyDown(screen.getByRole('button', { name: 'Rotate 90°' }), { key: 'Delete' });
      expect(noteHistory).not.toHaveBeenCalled();
      expect(noteKeyboard).not.toHaveBeenCalled();
      view.unmount();
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
      expect(noteHistory).toHaveBeenCalledOnce();
    } finally {
      view.unmount();
      window.removeEventListener('keydown', noteHistory);
    }
  });

  it.each(['asset', 'decode'])('disables Save after %s load failure and leaves Cancel available', async (failure) => {
    if (failure === 'asset') load.mockRejectedValueOnce(new Error('Unavailable image'));
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<MediaImageEditor block={block} onSave={onSave} onCancel={onCancel} />);
    if (failure === 'decode') {
      await screen.findByTestId('cropper');
      act(() => { cropper().mediaProps.onError?.({} as never); });
    }
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load the image');
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
