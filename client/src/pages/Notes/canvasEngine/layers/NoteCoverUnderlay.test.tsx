import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import { NoteCoverUnderlay } from './NoteCoverUnderlay';

vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));

const frame = { crop: { x: 25, y: 0, width: 50, height: 100 }, zoom: 1 };
const revokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

describe('NoteCoverUnderlay', () => {
  beforeEach(() => {
    vi.mocked(loadCanvasImageAssetBlobUrl).mockReset();
    vi.mocked(loadCanvasImageAssetBlobUrl).mockImplementation(async (assetId) => `blob:${assetId}`);
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });
  afterEach(() => {
    cleanup();
    if (revokeUrl) Object.defineProperty(URL, 'revokeObjectURL', revokeUrl);
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('renders the original image full bleed with the saved page crop and scales with the page', async () => {
    const view = render(<NoteCoverUnderlay assetId="page-image" frame={frame} width={500} height={1000} />);
    await waitFor(() => expect(view.container.querySelector('img')).not.toBeNull());
    const underlay = view.container.querySelector<HTMLElement>('[data-note-cover-underlay]')!;
    const image = view.container.querySelector('img')!;
    expect(loadCanvasImageAssetBlobUrl).toHaveBeenCalledExactlyOnceWith('page-image');
    expect(underlay.style.width).toBe('500px');
    expect(underlay.style.height).toBe('1000px');
    expect(underlay.style.left).toBe('0px');
    expect(underlay.style.top).toBe('0px');
    expect(underlay.style.overflow).toBe('hidden');
    expect(underlay.style.pointerEvents).toBe('none');
    expect(image.style.width).toBe('200%');
    expect(image.style.left).toBe('-50%');
    Object.defineProperties(image, { naturalWidth: { value: 1000 }, naturalHeight: { value: 1000 } });
    fireEvent.load(image);
    view.rerender(<NoteCoverUnderlay assetId="page-image" frame={frame} width={1000} height={2000} />);
    expect(image.style.width).toBe('200%');
    expect(image.style.left).toBe('-50%');
    expect(loadCanvasImageAssetBlobUrl).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:page-image');
  });

  it('adapts paper shape without stretching or changing the persisted frame', async () => {
    const view = render(<NoteCoverUnderlay assetId="page-image" frame={frame} width={500} height={1000} />);
    await waitFor(() => expect(view.container.querySelector('img')).not.toBeNull());
    const image = view.container.querySelector('img')!;
    Object.defineProperties(image, { naturalWidth: { value: 1000 }, naturalHeight: { value: 1000 } });
    fireEvent.load(image);
    view.rerender(<NoteCoverUnderlay assetId="page-image" frame={frame} width={1000} height={500} />);
    expect(image.style.width).toBe('100%');
    expect(image.style.height).toBe('200%');
    expect(image.style.top).toBe('-50%');
    expect(frame.crop).toEqual({ x: 25, y: 0, width: 50, height: 100 });
  });

  it('derives a centered page viewport from the sole original asset when no page frame was saved', async () => {
    const view = render(<NoteCoverUnderlay assetId="shared-image" width={500} height={1000} />);
    await waitFor(() => expect(view.container.querySelector('img')).not.toBeNull());
    const image = view.container.querySelector('img')!;
    Object.defineProperties(image, { naturalWidth: { value: 1000 }, naturalHeight: { value: 1000 } });
    fireEvent.load(image);
    expect(image.style.width).toBe('200%');
    expect(image.style.height).toBe('100%');
    expect(image.style.left).toBe('-50%');
    expect(image.style.top).toBe('0%');
    expect(loadCanvasImageAssetBlobUrl).toHaveBeenCalledExactlyOnceWith('shared-image');
  });

  it('releases a replaced asset even when its blob arrives after the new asset', async () => {
    let finishFirst: (url: string) => void = () => {};
    vi.mocked(loadCanvasImageAssetBlobUrl).mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    const view = render(<NoteCoverUnderlay assetId="first-image" frame={frame} width={500} height={1000} />);
    view.rerender(<NoteCoverUnderlay assetId="next-image" frame={frame} width={500} height={1000} />);
    await waitFor(() => expect(view.container.querySelector('img')?.src).toBe('blob:next-image'));
    await act(async () => { finishFirst('blob:first-image'); });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first-image');
    expect(view.container.querySelector('img')?.src).toBe('blob:next-image');
  });
});
