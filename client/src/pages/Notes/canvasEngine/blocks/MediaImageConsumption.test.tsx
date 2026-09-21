import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { MediaBlockProjection } from './MediaBlockProjection';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import { buildNoteCanvasRuntimeModel, createPrimaryPageFrame } from '../engineModel';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { NoteReadOnlyPageContent } from '../layers/NoteReadOnlyPageContent';
import { NotePageThumbnail, type NotePageThumbnailInput } from '../layers/NotePageThumbnail';
import { NoteOverviewLayer } from '../layers/NoteOverviewLayer';
import { NotePrintLayer } from '../layers/NotePrintLayer';
import type { NoteBlock } from '../runtimeDataTypes';

// Leave every consuming layer and projection real; only the asset transport is stubbed.
vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));
const load = vi.mocked(loadCanvasImageAssetBlobUrl);
const revoke = vi.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

function withAsset(source: NoteBlock, assetId: string): NoteBlock {
  return { ...source, metadata: { media: {
    asset_id: assetId, naturalWidth: 400, naturalHeight: 200, alt: assetId,
  } } };
}

function fixture() {
  const frame = createPrimaryPageFrame({ id: 'image-page' });
  const source: NoteBlock = { id: 'edited-media', placement_id: 'media-placement', block_type: 'media',
    title: null, content_json: {}, plain_text: '', order_index: 0, display_overrides_json: {},
    canvas_layout: null, source_references: [], metadata: { media: {
      asset_id: 'shared-image', naturalWidth: 1200, naturalHeight: 800, alt: 'Shared edited image',
      edit_v1: { crop: { x: 10, y: 20, w: 50, h: 40 }, zoom: 2, rotation: 90 },
    } } };
  const typography = createDefaultDocumentTypographyProfile();
  const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: frame, pageFrames: [frame],
    pageStacks: [createPageStackFromFrame(frame)],
    documentTypography: typography, viewport: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 },
    blockPlacements: [{ blockId: source.id, placementId: source.placement_id, objectId: source.id,
      objectKind: 'note_block', canvasId: 'image-canvas', x: frame.x + frame.contentInset.left,
      y: frame.y + frame.contentInset.top, width: 400, height: 80, rotation: 0, surface: 'formal_page',
      boundaryRole: 'inside', zIndex: 0, snapState: 'free', visibilityState: 'normal' }],
  });
  const input: NotePageThumbnailInput = { noteId: 'image-note', noteCanvasRuntime: runtime,
    visibleBlocks: [source], blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {},
    anchorsBySourceRef: {}, documentTypographyProfile: typography, selectedPageFrameId: frame.id };
  return { frame, input, runtime, source };
}

beforeEach(() => {
  load.mockReset().mockResolvedValue('blob:shared-image');
  revoke.mockClear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = revoke; });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(async () => { await act(async () => cleanup()); vi.unstubAllGlobals(); });

describe('media edit consumption through actual page layers', () => {
  it('shares the same rotated crop in paper, Overview and standalone thumbnails without editor entry points', async () => {
    const { frame, input, runtime, source } = fixture();
    const before = structuredClone(source);
    const view = render(<>
      <section data-image-consumer="paper"><NoteReadOnlyPageContent frame={frame}
        fragments={runtime.blockFragmentProjections} visibleBlocks={input.visibleBlocks}
        blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}} anchorsBySourceRef={{}} /></section>
      <section data-image-consumer="overview"><NoteOverviewLayer writingSurfaceProps={input}
        onSelectPage={vi.fn()} onClose={vi.fn()} /></section>
      <section data-image-consumer="thumbnail"><NotePageThumbnail input={input} frame={frame} pageNumber={1}
        width={200} height={280} scale={0.2} selected={false} renderContent onSelectPage={vi.fn()} /></section>
    </>);
    await waitFor(() => expect(view.container.querySelectorAll('svg[data-media-block-asset="shared-image"]')).toHaveLength(3));
    for (const consumer of ['paper', 'overview', 'thumbnail']) {
      const host = view.container.querySelector(`[data-image-consumer="${consumer}"]`)!;
      const image = host.querySelector('svg[data-media-block-asset]')!;
      expect(image.getAttribute('viewBox')).toBe('80 240 400 480');
      expect(image.getAttribute('data-media-image-rotation')).toBe('90');
      expect(image.querySelector('image')?.getAttribute('transform')).toBe('translate(800 0) rotate(90)');
      expect(image.querySelector('clipPath rect')?.getAttribute('width')).toBe('400');
      expect(host.querySelector('button[aria-label="编辑图片"]')).toBeNull();
      expect(host.querySelector('[role="dialog"]')).toBeNull();
    }
    expect(load.mock.calls).toEqual([['shared-image']]);
    expect(source).toEqual(before);
  });

  it('prints the same prepared rotated crop synchronously without a second asset read', async () => {
    const { input } = fixture();
    render(<NotePrintLayer {...input} surfaceMode="page" />);
    await waitFor(() => expect(document.querySelector('[data-note-print-media-preload] svg')).not.toBeNull());
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printed = document.querySelector('[data-note-print-root]')!;
    const image = printed.querySelector('svg[data-media-block-asset]')!;
    expect(image.getAttribute('aria-label')).toBe('Shared edited image');
    expect(image.getAttribute('viewBox')).toBe('80 240 400 480');
    expect(image.querySelector('image')?.getAttribute('transform')).toBe('translate(800 0) rotate(90)');
    expect(printed.querySelector('[data-media-block-placeholder]')).toBeNull();
    expect(printed.querySelector('button[aria-label="编辑图片"]')).toBeNull();
    expect(load).toHaveBeenCalledExactlyOnceWith('shared-image');
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('keeps early printing in a loading state and prepares one decoded resource for the next synchronous job', async () => {
    const decoding = deferred<void>();
    const decode = vi.fn(() => decoding.promise);
    const resources: { src: string }[] = [];
    vi.stubGlobal('Image', class {
      src = '';
      decode = decode;
      constructor() { resources.push(this); }
    });
    const { input } = fixture();
    render(<NotePrintLayer {...input} surfaceMode="page" />);
    await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    expect(resources.map((resource) => resource.src)).toEqual(['blob:shared-image']);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(document.querySelector('[data-note-print-root] [data-media-block-state="loading"]')).not.toBeNull();
    expect(document.querySelector('[data-note-print-root] [data-media-block-state="loaded"]')).toBeNull();
    act(() => window.dispatchEvent(new Event('afterprint')));
    await act(async () => decoding.resolve());
    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(document.querySelector('[data-note-print-root] svg image')?.getAttribute('href')).toBe('blob:shared-image');
    expect(load).toHaveBeenCalledExactlyOnceWith('shared-image');
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('shares decode failures with the real print portal and releases the failed resource once', async () => {
    const decoding = deferred<void>();
    const decode = vi.fn(() => decoding.promise);
    vi.stubGlobal('Image', class { src = ''; decode = decode; });
    const { input } = fixture();
    const view = render(<NotePrintLayer {...input} surfaceMode="page" />);
    await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    act(() => window.dispatchEvent(new Event('beforeprint')));
    await act(async () => decoding.reject(new Error('Synthetic image decode failure')));
    expect(document.querySelectorAll('[data-media-block-state="failed"]')).toHaveLength(2);
    expect(document.querySelector('[data-note-print-root] [role="status"]')?.textContent).toContain('Image could not be loaded');
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => view.unmount());
    expect(revoke.mock.calls).toEqual([['blob:shared-image']]);
  });

  it('retains one shared read through StrictMode and a consumer handoff, then releases the last owner', async () => {
    const { source } = fixture();
    const tree = (paper: boolean) => <StrictMode>
      {paper && <MediaBlockProjection key="paper" block={source} />}
      <MediaBlockProjection key="preview" block={source} />
    </StrictMode>;
    const view = render(tree(true));
    await waitFor(() => expect(view.container.querySelectorAll('svg')).toHaveLength(2));
    expect(load).toHaveBeenCalledExactlyOnceWith('shared-image');
    await act(async () => view.rerender(tree(false)));
    expect(view.container.querySelectorAll('svg')).toHaveLength(1);
    expect(revoke).not.toHaveBeenCalled();
    await act(async () => view.unmount());
    expect(revoke.mock.calls).toEqual([['blob:shared-image']]);
  });

  it('releases a resource unmounted during decode exactly once even when decode settles later', async () => {
    const decoding = deferred<void>();
    const decode = vi.fn(() => decoding.promise);
    vi.stubGlobal('Image', class { src = ''; decode = decode; });
    const { source } = fixture();
    const view = render(<MediaBlockProjection block={source} />);
    await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    await act(async () => view.unmount());
    expect(revoke.mock.calls).toEqual([['blob:shared-image']]);
    await act(async () => decoding.resolve());
    expect(revoke.mock.calls).toEqual([['blob:shared-image']]);
    expect(document.querySelector('[data-media-block-state]')).toBeNull();
  });

  it('discards an old note job and releases its late asset without exposing it in the new note', async () => {
    const pending = deferred<string>();
    load.mockReturnValueOnce(pending.promise).mockResolvedValueOnce('blob:new-image');
    const { input, source } = fixture();
    const view = render(<NotePrintLayer {...input} surfaceMode="page" />);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    view.rerender(<NotePrintLayer {...input} noteId="new-note" surfaceMode="page"
      visibleBlocks={[withAsset(source, 'new-image')]} />);
    expect(document.querySelector('[data-note-print-root]')).toBeNull();
    await waitFor(() => expect(document.querySelector('[data-note-print-media-preload] img')?.getAttribute('src')).toBe('blob:new-image'));
    await act(async () => pending.resolve('blob:old-image'));
    expect(revoke.mock.calls).toEqual([['blob:old-image']]);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(document.querySelector('[data-note-print-root] img')?.getAttribute('src')).toBe('blob:new-image');
    expect(document.querySelector('[data-media-block-asset="shared-image"]')).toBeNull();
    await act(async () => view.unmount());
    expect(revoke.mock.calls).toEqual([['blob:old-image'], ['blob:new-image']]);
  });

  it('retains the frozen job asset across an edit and prepares the replacement only after printing ends', async () => {
    load.mockImplementation(async (assetId) => `blob:${assetId}`);
    const { input, source } = fixture();
    const view = render(<NotePrintLayer {...input} surfaceMode="page" />);
    await waitFor(() => expect(document.querySelector('[data-note-print-media-preload] svg')).not.toBeNull());
    act(() => window.dispatchEvent(new Event('beforeprint')));
    view.rerender(<NotePrintLayer {...input} surfaceMode="page" visibleBlocks={[withAsset(source, 'replacement')]} />);
    expect(document.querySelector('[data-note-print-root] svg image')?.getAttribute('href')).toBe('blob:shared-image');
    expect(load).toHaveBeenCalledExactlyOnceWith('shared-image');
    expect(revoke).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event('afterprint')));
    await waitFor(() => expect(document.querySelector('[data-note-print-media-preload] img')?.getAttribute('src')).toBe('blob:replacement'));
    expect(revoke.mock.calls).toEqual([['blob:shared-image']]);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(document.querySelector('[data-note-print-root] img')?.getAttribute('src')).toBe('blob:replacement');
    expect(load.mock.calls).toEqual([['shared-image'], ['replacement']]);
  });
});
