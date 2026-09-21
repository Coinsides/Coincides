import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import type { NoteBlock } from '../runtimeDataTypes';
import { MediaBlockPlaceholder, MediaBlockProjection } from './MediaBlockProjection';

vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));
const load = vi.mocked(loadCanvasImageAssetBlobUrl);
const revoke = vi.fn();
const block: NoteBlock = {
  id: 'media-render', placement_id: 'placement-media-render', block_type: 'media', title: null, content_json: {}, plain_text: '', order_index: 0,
  display_overrides_json: {}, canvas_layout: null, source_references: [],
  metadata: { media: { asset_id: 'asset-one', naturalWidth: 400, naturalHeight: 20, alt: 'Lecture diagram' } },
};

beforeEach(() => {
  load.mockReset();
  revoke.mockClear();
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = revoke; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('MediaBlockProjection', () => {
  it('loads the asset lazily, keeps an accessible image and releases its object URL on unmount', async () => {
    let finish!: (url: string) => void;
    load.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = render(<MediaBlockProjection block={block} />);
    expect(screen.getByRole('status').textContent).toContain('Loading Lecture diagram');
    expect(load).toHaveBeenCalledExactlyOnceWith('asset-one');
    await act(async () => { finish('blob:media-one'); });
    const image = screen.getByRole('img', { name: 'Lecture diagram' }) as HTMLImageElement;
    expect(image.src).toBe('blob:media-one');
    expect(image.draggable).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    await act(async () => view.unmount());
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:media-one');
  });

  it('renders readable load and image decode failures without text editors', async () => {
    load.mockRejectedValueOnce(new Error('Synthetic unavailable asset'));
    const view = render(<MediaBlockProjection block={block} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Image could not be loaded'));
    expect(view.container.querySelector('textarea')).toBeNull();
    await act(async () => view.unmount());
    load.mockResolvedValueOnce('blob:bad-image');
    render(<MediaBlockProjection block={block} />);
    const image = await screen.findByRole('img');
    fireEvent.error(image);
    expect(screen.getByRole('status').textContent).toContain('Image could not be loaded');
  });

  it('releases late responses and asset replacements without exposing the previous asset', async () => {
    let finish!: (url: string) => void;
    load.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce('blob:media-two');
    const view = render(<MediaBlockProjection block={block} />);
    view.rerender(<MediaBlockProjection block={{ ...block, metadata: { media: {
      asset_id: 'asset-two', naturalWidth: 300, naturalHeight: 30,
    } } }} />);
    expect((await screen.findByRole('img', { name: 'Image' })).getAttribute('src')).toBe('blob:media-two');
    await act(async () => { finish('blob:media-one'); });
    expect(revoke).toHaveBeenCalledWith('blob:media-one');
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:media-two');
    await act(async () => view.unmount());
    expect(revoke.mock.calls).toEqual([['blob:media-one'], ['blob:media-two']]);
  });

  it('does not request malformed metadata and gives print/export a labelled rectangle without loading assets', () => {
    const view = render(<MediaBlockProjection block={{ ...block, metadata: {} }} />);
    expect(screen.getByRole('status').textContent).toContain('Image could not be loaded');
    expect(load).not.toHaveBeenCalled();
    view.unmount();
    render(<MediaBlockPlaceholder block={block} style={{ width: 400, height: 20 }} />);
    const placeholder = screen.getByRole('img', { name: 'Lecture diagram' });
    expect(placeholder.style.width).toBe('400px');
    expect(placeholder.style.height).toBe('20px');
    expect(placeholder.textContent).toBe('Lecture diagram');
    expect(load).not.toHaveBeenCalled();
  });

  it.each([0, 90, 180, 270] as const)('renders the shared %d° crop and clips its window independently from the block aspect ratio', async (rotation) => {
    load.mockResolvedValue('blob:edited-image');
    const edit = { crop: { x: 10, y: 20, w: 50, h: 40 }, zoom: 2, rotation };
    const edited = { ...block, metadata: { media: {
      asset_id: 'asset-one', naturalWidth: 1200, naturalHeight: 800, alt: 'Lecture diagram', edit_v1: edit,
    } } };
    const view = render(<div style={{ width: 500, height: 80 }}><MediaBlockProjection block={edited} /></div>);
    const image = await screen.findByRole('img', { name: 'Lecture diagram' });
    const viewBox = rotation === 90 || rotation === 270 ? '80 240 400 480' : '120 160 600 320';
    expect(image.tagName.toLowerCase()).toBe('svg');
    expect(image.getAttribute('viewBox')).toBe(viewBox);
    expect(image.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    const clip = view.container.querySelector('clipPath')!;
    const rect = clip.querySelector('rect')!;
    expect(clip.getAttribute('clipPathUnits')).toBe('userSpaceOnUse');
    expect(['x', 'y', 'width', 'height'].map((name) => rect.getAttribute(name)).join(' ')).toBe(viewBox);
    expect(view.container.querySelector('g')?.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
    const source = view.container.querySelector('image')!;
    expect(source.getAttribute('href')).toBe('blob:edited-image');
    expect(source.getAttribute('width')).toBe('1200');
    expect(source.getAttribute('height')).toBe('800');
    const transforms = { 0: null, 90: 'translate(800 0) rotate(90)', 180: 'translate(1200 800) rotate(180)', 270: 'translate(0 1200) rotate(270)' };
    expect(source.getAttribute('transform')).toBe(transforms[rotation]);
  });
});
