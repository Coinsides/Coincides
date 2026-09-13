import { act, cleanup, createEvent, fireEvent, render } from '@testing-library/react';
// @ts-expect-error Vitest runs in Node; the browser client has no @types/node dependency.
import { readFileSync } from 'node:fs';
// @ts-expect-error Read the production stylesheet without adding a client dependency.
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { NoteOverviewLayer, type NoteOverviewLayerProps } from './NoteOverviewLayer';
import type { NoteReadOnlyPageContentProps } from './NoteReadOnlyPageContent';

const contentLifecycle = vi.hoisted(() => ({ mount: vi.fn(), unmount: vi.fn() }));

// These tests isolate layout and mount cost. The print/alignment/ink suites
// exercise the real shared fragment renderer; retain its input text here so
// lazy rendering is observed through visible content, not just data markers.
vi.mock('./NoteReadOnlyPageContent', async () => {
  const { useEffect } = await import('react');
  return {
    NoteReadOnlyPageContent: ({ frame, visibleBlocks, blockTextDrafts }: NoteReadOnlyPageContentProps) => {
      useEffect(() => {
        contentLifecycle.mount(frame.id);
        return () => contentLifecycle.unmount(frame.id);
      }, [frame.id]);
      const block = visibleBlocks.find((item) => item.id === frame.id)!;
      return <p>{blockTextDrafts[block.id] ?? block.plain_text}</p>;
    },
  };
});

const overviewCss = readFileSync(fileURLToPath(import.meta.url).replace(/\.test\.tsx$/, '.css'), 'utf8')
  + readFileSync(fileURLToPath(import.meta.url).replace('NoteOverviewLayer.test.tsx', 'NotePageThumbnail.css'), 'utf8');
const ROOT = '[data-note-overview-root]';
const VIEWPORT = '[data-note-overview-viewport]';
const GRID = '[data-note-overview-grid]';
const SHEET = '[data-note-overview-sheet]';
const CANVAS = '[data-note-overview-canvas]';
let viewportWidth: number;
let viewportHeight: number;
let stylesheet: HTMLStyleElement;

function page(index: number, overrides: Partial<PageFrameModel> = {}): PageFrameModel {
  return {
    id: `page-${index + 1}`, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
    templateId: 'a4_portrait', pageSize: 'A4', exportable: true,
    x: 100, y: index * 1358, width: 904, height: 1278,
    contentInset: { left: 72, right: 72, top: 0, bottom: 96 }, ...overrides,
  };
}

function propsFor(pageCount: number, frames = Array.from({ length: pageCount }, (_, index) => page(index))): NoteOverviewLayerProps {
  const documentTypographyProfile = createDefaultDocumentTypographyProfile({ fontSizePx: 19, lineHeightPx: 28 });
  return {
    writingSurfaceProps: {
      noteId: 'overview-layout-note', selectedPageFrameId: frames[0]?.id ?? null,
      visibleBlocks: frames.map((frame, index) => ({
        id: frame.id, placement_id: `placement-${frame.id}`, display_overrides_json: {},
        block_type: 'paragraph', title: null, content_json: {}, metadata: {},
        plain_text: `Readable source paragraph for sheet ${index + 1}.`, order_index: index,
        source_references: [],
      })),
      blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {},
      documentTypographyProfile,
      noteCanvasRuntime: buildNoteCanvasRuntimeModel({
        mode: 'page', primaryPageFrame: frames[0] ?? null, pageFrames: frames,
        viewport: { x: 0, y: 0, width: 1000, height: 720, zoom: 1 },
        blockPlacements: [], documentTypography: documentTypographyProfile,
      }),
    },
    onSelectPage: vi.fn(), onClose: vi.fn(),
  };
}

function resize(width: number, height = viewportHeight) {
  viewportWidth = width;
  viewportHeight = height;
  act(() => window.dispatchEvent(new Event('resize')));
}

function sheetAt(container: HTMLElement, number: number) {
  return container.querySelector<HTMLElement>(`${SHEET}[data-page-frame-id="page-${number}"]`)!;
}

beforeEach(() => {
  viewportWidth = 1000;
  viewportHeight = 720;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => viewportWidth);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => viewportHeight);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  contentLifecycle.mount.mockClear();
  contentLifecycle.unmount.mockClear();
  stylesheet = document.createElement('style');
  stylesheet.textContent = overviewCss;
  document.head.appendChild(stylesheet);
});

afterEach(() => {
  cleanup();
  stylesheet.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('E4 Overview continuous page grid', () => {
  it.each([[360, 1], [700, 2], [1000, 3], [1360, 4], [2400, 4]])(
    'fills a %i px viewport with %i proportional page columns', (width, expectedColumns) => {
      viewportWidth = width;
      const props = propsFor(12);
      const before = JSON.stringify(props.writingSurfaceProps);
      const { container, getByText } = render(<NoteOverviewLayer {...props} />);
      const grid = container.querySelector<HTMLElement>(GRID)!;
      const preview = sheetAt(container, 1).querySelector<HTMLElement>('[data-note-overview-preview]')!;
      const canvas = preview.querySelector<HTMLElement>(CANVAS)!;
      const pageWidth = Number.parseFloat(preview.style.width);
      expect(grid.dataset.columns).toBe(String(expectedColumns));
      expect(pageWidth * expectedColumns + (expectedColumns - 1) * 24).toBeCloseTo(width - 48);
      expect(Number.parseFloat(preview.style.height) / pageWidth).toBeCloseTo(1278 / 904);
      expect(canvas.style.width).toBe('904px');
      expect(canvas.style.height).toBe('1278px');
      expect(canvas.style.transform).toBe(`scale(${pageWidth / 904})`);
      expect(canvas.style.getPropertyValue('--document-font-size')).toBe('19px');
      expect(getByText('Readable source paragraph for sheet 1.')).not.toBeNull();
      expect(container.querySelectorAll('[data-note-overview-page]')).toHaveLength(12);
      expect(getComputedStyle(container.querySelector(VIEWPORT)!).overflow).toBe('auto');
      expect(container.querySelector('[data-note-overview-next], [data-note-overview-previous]')).toBeNull();
      expect(JSON.stringify(props.writingSurfaceProps)).toBe(before);
    },
  );

  it('reflows the live grid across narrow and wide resizes without replacing page identities', () => {
    const props = propsFor(9);
    const { container } = render(<NoteOverviewLayer {...props} />);
    const firstButton = container.querySelector('[data-note-overview-page]');
    const columns = () => container.querySelector<HTMLElement>(GRID)!.dataset.columns;
    expect(columns()).toBe('3');
    resize(360);
    expect(columns()).toBe('1');
    resize(700);
    expect(columns()).toBe('2');
    resize(1360);
    expect(columns()).toBe('4');
    expect(container.querySelector('[data-note-overview-page]')).toBe(firstButton);
    expect(props.onSelectPage).not.toHaveBeenCalled();
  });

  it('centers one complete page at the available height and puts its number below the paper', () => {
    const { container, getByRole } = render(<NoteOverviewLayer {...propsFor(1)} />);
    const grid = container.querySelector<HTMLElement>(GRID)!;
    const preview = sheetAt(container, 1).querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const canvas = preview.querySelector<HTMLElement>(CANVAS)!;
    const label = getByRole('button', { name: 'Read page 1' }).querySelector<HTMLElement>('.noteOverviewPageLabel')!;
    expect(grid.dataset.columns).toBe('1');
    expect(getComputedStyle(grid).justifyContent).toBe('center');
    expect(getComputedStyle(grid).alignContent).toBe('center');
    expect(getComputedStyle(grid).minHeight).toBe('100%');
    expect(Number.parseFloat(preview.style.height)).toBeCloseTo(720 - 48 - 24);
    expect(Number.parseFloat(preview.style.width)).toBeGreaterThan(400);
    expect(Number.parseFloat(preview.style.width)).toBeCloseTo(648 * 904 / 1278);
    expect(canvas.style.height).toBe('1278px');
    expect(label.textContent).toBe('1');
    expect(getComputedStyle(label).textAlign).toBe('center');
    expect(getComputedStyle(label).height).toBe('24px');
    expect(getComputedStyle(sheetAt(container, 1)).paddingBottom).toBe('24px');
    expect(getComputedStyle(getByRole('button', { name: 'Read page 1' })).inset).toBe('0');
    expect(preview.getAttribute('inert')).toBe('');
    expect(preview.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the full height of a long page instead of cropping a thumbnail', () => {
    const props = propsFor(2, [page(0, { height: 6000 }), page(1)]);
    const before = JSON.stringify(props.writingSurfaceProps.noteCanvasRuntime);
    const { container, getByRole } = render(<NoteOverviewLayer {...props} />);
    const preview = sheetAt(container, 1).querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const canvas = preview.querySelector<HTMLElement>(CANVAS)!;
    const scale = Number.parseFloat(preview.style.width) / 904;
    expect(Number.parseFloat(preview.style.height)).toBeCloseTo(6000 * scale);
    expect(Number.parseFloat(preview.style.height)).toBeGreaterThan(viewportHeight);
    expect(canvas.style.height).toBe('6000px');
    expect(canvas.style.transform).toBe(`scale(${scale})`);
    expect(getByRole('button', { name: 'Read page 1' }).getAttribute('aria-label')).toBe('Read page 1');
    expect(container.textContent).not.toContain('Long page');
    expect(JSON.stringify(props.writingSurfaceProps.noteCanvasRuntime)).toBe(before);
  });

  it('mounts only nearby content among 240 page shells and unloads distant content after scrolling', () => {
    viewportWidth = 1360;
    const { container, getByText, queryByText } = render(<NoteOverviewLayer {...propsFor(240)} />);
    const viewport = container.querySelector<HTMLElement>(VIEWPORT)!;
    const preview = sheetAt(container, 1).querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const rowHeight = Number.parseFloat(preview.style.height) + 24 + 24;
    expect(container.querySelectorAll(SHEET)).toHaveLength(240);
    expect(container.querySelectorAll(CANVAS).length).toBeGreaterThan(4);
    expect(container.querySelectorAll(CANVAS).length).toBeLessThan(32);
    expect(getByText('Readable source paragraph for sheet 1.')).not.toBeNull();
    expect(queryByText('Readable source paragraph for sheet 201.')).toBeNull();
    expect(contentLifecycle.mount).not.toHaveBeenCalledWith('page-201');

    fireEvent.scroll(viewport, { target: { scrollTop: 50 * rowHeight } });
    expect(getByText('Readable source paragraph for sheet 201.')).not.toBeNull();
    expect(queryByText('Readable source paragraph for sheet 1.')).toBeNull();
    expect(contentLifecycle.mount).toHaveBeenCalledWith('page-201');
    expect(contentLifecycle.unmount).toHaveBeenCalledWith('page-1');
    expect(container.querySelectorAll(CANVAS).length).toBeLessThan(32);
    expect(container.querySelectorAll('[data-note-overview-page]')).toHaveLength(240);
  });

  it('opens at the current reading page row and highlights it independently of the selected frame', () => {
    viewportWidth = 1360;
    const props = { ...propsFor(240), currentPageFrameId: 'page-201' };
    const before = JSON.stringify(props.writingSurfaceProps);
    const { container, getByText, queryByText, getByRole } = render(<NoteOverviewLayer {...props} />);
    const viewport = container.querySelector<HTMLElement>(VIEWPORT)!;
    const preview = sheetAt(container, 201).querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const rowHeight = Number.parseFloat(preview.style.height) + 24 + 24;
    expect(viewport.scrollTop).toBeCloseTo(50 * rowHeight - 24);
    expect(getByRole('button', { name: 'Read page 201' }).getAttribute('aria-current')).toBe('page');
    expect(getByRole('button', { name: 'Read page 1' }).hasAttribute('aria-current')).toBe(false);
    expect(getByText('Readable source paragraph for sheet 201.')).not.toBeNull();
    expect(queryByText('Readable source paragraph for sheet 1.')).toBeNull();
    expect(JSON.stringify(props.writingSurfaceProps)).toBe(before);
    expect(props.onSelectPage).not.toHaveBeenCalled();
  });

  it('keeps the same page and page-local reading offset when a scrolled grid changes from four columns to one', () => {
    viewportWidth = 1360;
    const props = propsFor(240);
    const { container, getByText, queryByText } = render(<NoteOverviewLayer {...props} />);
    const viewport = container.querySelector<HTMLElement>(VIEWPORT)!;
    const preview = sheetAt(container, 201).querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const oldScale = Number.parseFloat(preview.style.width) / 904;
    const oldRowHeight = Number.parseFloat(preview.style.height) + 24 + 24;
    const pageLocalOffset = 128;
    const oldScrollTop = 50 * oldRowHeight + 24 + pageLocalOffset * oldScale;
    fireEvent.scroll(viewport, { target: { scrollTop: oldScrollTop } });
    expect(getByText('Readable source paragraph for sheet 201.')).not.toBeNull();

    resize(360);

    const newScale = Number.parseFloat(preview.style.width) / 904;
    const newRowHeight = Number.parseFloat(preview.style.height) + 24 + 24;
    expect(container.querySelector<HTMLElement>(GRID)!.dataset.columns).toBe('1');
    expect(viewport.scrollTop).toBeCloseTo(200 * newRowHeight + 24 + pageLocalOffset * newScale);
    expect(viewport.scrollTop).toBeGreaterThan(oldScrollTop * 3);
    expect(getByText('Readable source paragraph for sheet 201.')).not.toBeNull();
    expect(queryByText('Readable source paragraph for sheet 1.')).toBeNull();
    expect(props.onSelectPage).not.toHaveBeenCalled();
  });

  it('exposes full-page click targets and close controls while keeping preview content inert', () => {
    const props = propsFor(4);
    const parentKeyDown = vi.fn();
    const { container, getByRole } = render(<div onKeyDown={parentKeyDown}><NoteOverviewLayer {...props} /></div>);
    const root = container.querySelector<HTMLElement>(ROOT)!;
    expect(document.activeElement).toBe(root);
    fireEvent.click(getByRole('button', { name: 'Read page 3' }));
    expect(props.onSelectPage).toHaveBeenCalledExactlyOnceWith('page-3');
    const escape = createEvent.keyDown(root, { key: 'Escape' });
    fireEvent(root, escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(parentKeyDown).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(getByRole('button', { name: 'Close page overview' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('discards the scroll window when changing notes and renders the new note first page', () => {
    viewportWidth = 1360;
    const props = propsFor(240);
    const { container, rerender, getByText, queryByText } = render(<NoteOverviewLayer {...props} />);
    const oldViewport = container.querySelector<HTMLElement>(VIEWPORT)!;
    fireEvent.scroll(oldViewport, { target: { scrollTop: 24000 } });
    expect(queryByText('Readable source paragraph for sheet 1.')).toBeNull();
    rerender(<NoteOverviewLayer {...props} writingSurfaceProps={{ ...props.writingSurfaceProps,
      noteId: 'another-overview-note', blockTextDrafts: { 'page-1': 'New note first page draft.' } }} />);
    const newViewport = container.querySelector<HTMLElement>(VIEWPORT)!;
    expect(newViewport).not.toBe(oldViewport);
    expect(newViewport.scrollTop).toBe(0);
    expect(getByText('New note first page draft.')).not.toBeNull();
    expect(queryByText('Readable source paragraph for sheet 201.')).toBeNull();
    expect(container.querySelector<HTMLElement>(ROOT)!.dataset.noteId).toBe('another-overview-note');
  });

  it('shows a quiet empty state without creating a phantom page', () => {
    const { container, getByText, getByRole } = render(<NoteOverviewLayer {...propsFor(0)} />);
    expect(getByText('No pages to preview.')).not.toBeNull();
    expect(container.querySelector(GRID)).toBeNull();
    expect(contentLifecycle.mount).not.toHaveBeenCalled();
    expect(getByRole('button', { name: 'Close page overview' })).not.toBeNull();
  });
});
