import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemSummary } from '@shared/types/itemSummary';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockPlacementModel, CanvasObject, CanvasPlacement, PageFrameModel } from '../types';
import { NoteNavigationPages } from './NoteNavigationPages';
import type { NotePageThumbnailInput } from './NotePageThumbnail';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
// Keep thumbnail, read-only fragment, block projections and both readers real.
// Only the HTTP transport and browser object-URL lifecycle are synthetic.
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, setToken: vi.fn() }));

const ASSET = 'asset-nav';
const ITEM = 'item-nav';
const BLOB = 'blob:nav-media';
const item: ItemSummary = {
  id: ITEM, summary: 'Current referenced item', plain_text: 'Current referenced item body.',
  status: 'active', item_type: null, topic: null, origin_note_id: null,
  origin_course_id: null, origin_board_id: null, origin_board_title: null,
};
const revoke = vi.fn();

function block(id: string, kind: NoteBlock['block_type']): NoteBlock {
  return {
    id, placement_id: `placement-${id}`, block_type: kind, title: null,
    content_json: kind === 'item_ref' ? { item_id: ITEM } : { body: 'Already loaded paper text.' },
    plain_text: kind === 'paragraph' ? 'Already loaded paper text.' : '',
    metadata: kind === 'media' ? { media: { asset_id: ASSET, naturalWidth: 540, naturalHeight: 80, alt: 'Navigation diagram' } } : {},
    order_index: 0, display_overrides_json: {}, canvas_layout: null, source_references: [],
  };
}

function inputFor(blocks: NoteBlock[], withInk = false): NotePageThumbnailInput {
  const frames: PageFrameModel[] = Array.from({ length: 12 }, (_, index) => ({
    id: `page-${index + 1}`, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
    exportable: true, x: 100, y: index * 1358, width: 904, height: 1278,
    contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
  }));
  const stack = createPageStackFromFrame(frames[0], { id: 'navigation-stack' });
  stack.frameIds = frames.map((frame) => frame.id);
  const placements: BlockPlacementModel[] = blocks.map((entry, index) => ({
    blockId: entry.id, placementId: entry.placement_id, objectId: entry.id, objectKind: 'note_block',
    canvasId: 'navigation-canvas', x: 172, y: 30 + index * 130, width: 540, height: 80,
    rotation: 0, surface: 'formal_page', boundaryRole: 'inside', zIndex: 0,
    snapState: 'free', visibilityState: 'normal',
  }));
  const objects: CanvasObject[] = withInk ? [{
    objectId: 'ink-nav', canvasId: 'navigation-canvas', kind: 'freehand', backing: 'none',
    objectClass: 'pure', status: 'active', metadata: { freehand: {
      path: 'M 0 0 L 120 80', style: { color_token: 'ink', width: 2.5 },
    } },
  }] : [];
  const canvasPlacements: CanvasPlacement[] = withInk ? [{
    placementId: 'ink-placement', objectId: 'ink-nav', canvasId: 'navigation-canvas', frameId: frames[0].id,
    surface: 'formal_page', boundaryRole: 'inside', rotation: 0, zIndex: 4,
    x: 140, y: 400, width: 120, height: 80, renderVisibility: 'visible', visibilityState: 'normal',
  }] : [];
  const documentTypographyProfile = createDefaultDocumentTypographyProfile();
  return {
    noteId: 'navigation-note', selectedPageFrameId: frames[0].id, visibleBlocks: blocks,
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {},
    documentTypographyProfile,
    noteCanvasRuntime: buildNoteCanvasRuntimeModel({
      mode: 'page', primaryPageFrame: frames[0], pageFrames: frames, pageStacks: [stack],
      viewport: { x: 0, y: 0, width: 1000, height: 720, zoom: 1 }, blockPlacements: placements,
      genericCanvasObjects: objects, genericCanvasPlacements: canvasPlacements,
      documentTypography: documentTypographyProfile,
    }),
  };
}

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
  revoke.mockClear();
  http.get.mockImplementation(async (url: string) => {
    if (url !== `/canvas-assets/${ASSET}/blob`) throw new Error(`Unexpected fixture GET: ${url}`);
    return { data: new Blob(['synthetic image'], { type: 'image/png' }) };
  });
  http.post.mockImplementation(async (url: string, body: unknown) => {
    if (url !== '/items/summaries' || JSON.stringify(body) !== JSON.stringify({ item_ids: [ITEM] })) {
      throw new Error(`Unexpected fixture POST: ${url}`);
    }
    return { data: [item] };
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(256);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => BLOB);
    static revokeObjectURL = revoke;
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('navigation thumbnails existing mount-time reads', () => {
  it('uses the existing asset and ItemSummary readers once per visible projection mount, including lazy remounts', async () => {
    const input = inputFor([block('media-nav', 'media'), block('reference-nav', 'item_ref')]);
    const selectPage = vi.fn();
    const { container, rerender, unmount } = render(<NoteNavigationPages writingSurfaceProps={input} onSelectPage={selectPage} />);
    const viewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;
    await waitFor(() => expect(container.querySelector('[data-media-block-state="loaded"]')).not.toBeNull());
    await waitFor(() => expect(container.querySelector('[data-item-ref]')?.textContent).toContain(item.plain_text));
    expect(http.get.mock.calls).toEqual([[`/canvas-assets/${ASSET}/blob`, { responseType: 'blob' }]]);
    expect(http.post.mock.calls).toEqual([['/items/summaries', { item_ids: [ITEM] }]]);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(BLOB);

    rerender(<NoteNavigationPages writingSurfaceProps={{ ...input }} onSelectPage={selectPage} />);
    fireEvent.click(container.querySelector('[data-note-overview-page]')!);
    expect(selectPage).toHaveBeenCalledExactlyOnceWith('page-1');
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledTimes(1);
    fireEvent.scroll(viewport, { target: { scrollTop: 3500 } });
    expect(container.querySelector('[data-media-block-state="loaded"]')).toBeNull();
    expect(revoke).toHaveBeenCalledExactlyOnceWith(BLOB);
    fireEvent.scroll(viewport, { target: { scrollTop: 0 } });
    await waitFor(() => expect(container.querySelector('[data-media-block-state="loaded"]')).not.toBeNull());
    await waitFor(() => expect(container.querySelector('[data-item-ref]')?.textContent).toContain(item.plain_text));
    expect(http.get.mock.calls).toEqual(Array.from({ length: 2 }, () => [`/canvas-assets/${ASSET}/blob`, { responseType: 'blob' }]));
    expect(http.post.mock.calls).toEqual(Array.from({ length: 2 }, () => ['/items/summaries', { item_ids: [ITEM] }]));
    unmount();
    expect(revoke.mock.calls).toEqual([[BLOB], [BLOB]]);
  });

  it('renders loaded text and paper ink with no additional HTTP reads', () => {
    const input = inputFor([block('text-nav', 'paragraph')], true);
    const { container } = render(<NoteNavigationPages writingSurfaceProps={input} onSelectPage={vi.fn()} />);
    expect(container.textContent).toContain('Already loaded paper text.');
    expect(container.querySelector('[data-paper-ink-id="ink-nav"]')?.getAttribute('d')).toBe('M 0 0 L 120 80');
    expect(container.querySelector('[data-note-readonly-fragment]')).not.toBeNull();
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
