import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = vi.fn(); });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
    expect(load.mock.calls).toEqual([['shared-image'], ['shared-image'], ['shared-image']]);
    expect(source).toEqual(before);
  });

  it('keeps real beforeprint rendering as an accessible placeholder without fetching the original', () => {
    const { input } = fixture();
    render(<NotePrintLayer {...input} surfaceMode="page" />);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printed = document.querySelector('[data-note-print-root]')!;
    const placeholder = printed.querySelector('[data-media-block-placeholder="true"]');
    expect(placeholder?.getAttribute('aria-label')).toBe('Shared edited image');
    expect(printed.querySelector('svg[data-media-block-asset]')).toBeNull();
    expect(printed.querySelector('button[aria-label="编辑图片"]')).toBeNull();
    expect(load).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event('afterprint')));
  });
});
