import { act, cleanup, createEvent, fireEvent, render, within } from '@testing-library/react';
// @ts-expect-error Vitest runs in Node; the browser client has no @types/node dependency.
import { readFileSync } from 'node:fs';
// @ts-expect-error Read the production stylesheet without adding a client dependency.
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { NoteNavigationPages, type NoteNavigationPagesProps } from './NoteNavigationPages';
import { NoteOverviewLayer } from './NoteOverviewLayer';
import type { NoteReadOnlyPageContentProps } from './NoteReadOnlyPageContent';

const contentLifecycle = vi.hoisted(() => ({ mount: vi.fn(), unmount: vi.fn() }));

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

const css = ['./NoteNavigationPages.css', './NotePageThumbnail.css'].map((path) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')).join('\n');
let viewportWidth: number;
let viewportHeight: number;
let stylesheet: HTMLStyleElement;

function propsFor(pageCount: number): NoteNavigationPagesProps {
  const frames: PageFrameModel[] = Array.from({ length: pageCount }, (_, index) => ({
    id: `page-${index + 1}`, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
    templateId: 'a4_portrait', pageSize: 'A4', exportable: true,
    x: 100, y: index * 1358, width: 904, height: 1278,
    contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
  }));
  const documentTypographyProfile = createDefaultDocumentTypographyProfile({ fontSizePx: 19, lineHeightPx: 28 });
  return {
    writingSurfaceProps: {
      noteId: 'navigation-note', selectedPageFrameId: frames[0]?.id ?? null,
      visibleBlocks: frames.map((frame, index) => ({
        id: frame.id, placement_id: `placement-${frame.id}`, display_overrides_json: {},
        block_type: 'paragraph', title: null, content_json: {}, metadata: {},
        plain_text: `Source paragraph on page ${index + 1}.`, order_index: index,
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
    onSelectPage: vi.fn(),
  };
}

beforeEach(() => {
  viewportWidth = 280;
  viewportHeight = 600;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => viewportWidth);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => viewportHeight);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  contentLifecycle.mount.mockClear();
  contentLifecycle.unmount.mockClear();
  stylesheet = document.createElement('style');
  stylesheet.textContent = css;
  document.head.appendChild(stylesheet);
});

afterEach(() => {
  cleanup();
  stylesheet.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('navigation pages', () => {
  it('shares Overview thumbnails, read-only content and typography in a single scrolling column', () => {
    const props = propsFor(3);
    props.writingSurfaceProps.blockTextDrafts = { 'page-1': 'Current page draft.' };
    const before = JSON.stringify(props.writingSurfaceProps);
    const { container } = render(<>
      <div data-testid="navigation"><NoteNavigationPages {...props} /></div>
      <div data-testid="overview"><NoteOverviewLayer {...props} onClose={vi.fn()} /></div>
    </>);
    for (const surface of container.querySelectorAll<HTMLElement>('[data-testid]')) {
      const thumbnail = surface.querySelector<HTMLElement>('[data-note-page-thumbnail]')!;
      const preview = thumbnail.querySelector<HTMLElement>('[data-note-overview-preview]')!;
      const canvas = thumbnail.querySelector<HTMLElement>('[data-note-overview-canvas]')!;
      expect(within(thumbnail).getByText('Current page draft.')).not.toBeNull();
      expect(preview.getAttribute('inert')).toBe('');
      expect(preview.getAttribute('aria-hidden')).toBe('true');
      expect(canvas.style.width).toBe('904px');
      expect(canvas.style.height).toBe('1278px');
      expect(canvas.style.getPropertyValue('--document-font-size')).toBe('19px');
      expect(Number.parseFloat(preview.style.height) / Number.parseFloat(preview.style.width)).toBeCloseTo(1278 / 904);
    }
    const viewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;
    const list = container.querySelector<HTMLElement>('[data-note-navigation-page-list]')!;
    expect(getComputedStyle(viewport).overflow).toBe('auto');
    expect(getComputedStyle(list).gridTemplateColumns).toBe('var(--navigation-page-width)');
    expect(list.style.getPropertyValue('--navigation-page-width')).toBe('248px');
    expect(viewport.querySelectorAll('[data-note-page-thumbnail]')).toHaveLength(3);
    expect(JSON.stringify(props.writingSurfaceProps)).toBe(before);
  });

  it('keeps distant page content unmounted and lazily loads it when this pane scrolls', () => {
    const props = propsFor(120);
    const { container, getByText, queryByText, getByRole } = render(<NoteNavigationPages {...props} />);
    const viewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;
    const preview = viewport.querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const rowHeight = Number.parseFloat(preview.style.height) + 24 + 16;
    expect(viewport.querySelectorAll('[data-note-page-thumbnail]')).toHaveLength(120);
    expect(viewport.querySelectorAll('[data-note-overview-canvas]').length).toBeLessThan(10);
    expect(queryByText('Source paragraph on page 81.')).toBeNull();
    expect(contentLifecycle.mount).not.toHaveBeenCalledWith('page-81');

    fireEvent.scroll(viewport, { target: { scrollTop: 80 * rowHeight } });

    expect(getByText('Source paragraph on page 81.')).not.toBeNull();
    expect(queryByText('Source paragraph on page 1.')).toBeNull();
    expect(contentLifecycle.unmount).toHaveBeenCalledWith('page-1');
    expect(getByRole('button', { name: 'Read page 1' }).getAttribute('aria-current')).toBe('page');
    expect(props.onSelectPage).not.toHaveBeenCalled();
    expect(viewport.querySelectorAll('[data-note-overview-canvas]').length).toBeLessThan(10);
  });

  it('follows the current reading page in its own viewport without moving or focusing the document', () => {
    const props = propsFor(120);
    const view = (currentPageFrameId: string) => <div data-testid="document-scroll">
      <input aria-label="Writing" defaultValue="Continue writing" />
      <NoteNavigationPages {...props} currentPageFrameId={currentPageFrameId} />
    </div>;
    const { container, rerender, getByRole, getByText, getByTestId } = render(view('page-1'));
    const editor = getByRole('textbox', { name: 'Writing' });
    editor.focus();
    const documentViewport = getByTestId('document-scroll');
    documentViewport.scrollTop = 432;
    const viewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;

    rerender(view('page-90'));

    expect(viewport.scrollTop).toBeGreaterThan(30000);
    expect(documentViewport.scrollTop).toBe(432);
    expect(document.activeElement).toBe(editor);
    expect(getByRole('button', { name: 'Read page 90' }).getAttribute('aria-current')).toBe('page');
    expect(getByRole('button', { name: 'Read page 1' }).hasAttribute('aria-current')).toBe(false);
    expect(getByText('Source paragraph on page 90.')).not.toBeNull();
    expect(props.onSelectPage).not.toHaveBeenCalled();

    viewportWidth = 240;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(getByText('Source paragraph on page 90.')).not.toBeNull();
    expect(documentViewport.scrollTop).toBe(432);
    expect(document.activeElement).toBe(editor);
  });

  it('preserves thumbnail browsing through rebuilt runtime projections and follows only a changed reading page', () => {
    const props = propsFor(120);
    const { container, rerender, getByText, queryByText, getByRole } = render(
      <NoteNavigationPages {...props} currentPageFrameId="page-1" />,
    );
    const viewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;
    const preview = viewport.querySelector<HTMLElement>('[data-note-overview-preview]')!;
    const browseOffset = 80 * (Number.parseFloat(preview.style.height) + 24 + 16);
    fireEvent.scroll(viewport, { target: { scrollTop: browseOffset } });
    expect(getByText('Source paragraph on page 81.')).not.toBeNull();

    for (let index = 0; index < 3; index += 1) {
      const rebuilt = { ...props.writingSurfaceProps, noteCanvasRuntime: {
        ...props.writingSurfaceProps.noteCanvasRuntime,
        pageFrames: props.writingSurfaceProps.noteCanvasRuntime.pageFrames.map((frame) => ({ ...frame })),
      } };
      rerender(<NoteNavigationPages {...props} writingSurfaceProps={rebuilt} currentPageFrameId="page-1" />);
      expect(viewport.scrollTop).toBe(browseOffset);
      expect(getByText('Source paragraph on page 81.')).not.toBeNull();
      expect(queryByText('Source paragraph on page 1.')).toBeNull();
    }
    expect(getByRole('button', { name: 'Read page 1' }).getAttribute('aria-current')).toBe('page');

    rerender(<NoteNavigationPages {...props} currentPageFrameId="page-90" />);

    expect(viewport.scrollTop).toBeGreaterThan(browseOffset);
    expect(getByText('Source paragraph on page 90.')).not.toBeNull();
    expect(getByRole('button', { name: 'Read page 90' }).getAttribute('aria-current')).toBe('page');
    expect(props.onSelectPage).not.toHaveBeenCalled();
  });

  it('jumps on thumbnail click while preserving editor focus and leaving Escape to the editor', () => {
    const props = propsFor(4);
    const parentKeyDown = vi.fn();
    const { getByRole } = render(<div onKeyDown={parentKeyDown}>
      <input aria-label="Writing" />
      <NoteNavigationPages {...props} />
    </div>);
    const editor = getByRole('textbox', { name: 'Writing' });
    editor.focus();
    const button = getByRole('button', { name: 'Read page 3' });
    const mouseDown = createEvent.mouseDown(button);
    fireEvent(button, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);
    fireEvent.click(button);
    expect(props.onSelectPage).toHaveBeenCalledExactlyOnceWith('page-3');
    expect(document.activeElement).toBe(editor);
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(parentKeyDown).toHaveBeenCalledTimes(1);
  });

  it('resets the lazy window for another note and handles an empty page collection', () => {
    const props = propsFor(120);
    const { container, rerender, getByText } = render(<NoteNavigationPages {...props} currentPageFrameId="page-90" />);
    const oldViewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;
    expect(oldViewport.scrollTop).toBeGreaterThan(30000);
    rerender(<NoteNavigationPages {...props} writingSurfaceProps={{ ...props.writingSurfaceProps, noteId: 'another-note' }} />);
    const newViewport = container.querySelector<HTMLElement>('[data-note-navigation-pages]')!;
    expect(newViewport).not.toBe(oldViewport);
    expect(newViewport.scrollTop).toBe(0);
    expect(getByText('Source paragraph on page 1.')).not.toBeNull();

    rerender(<NoteNavigationPages {...propsFor(0)} />);
    expect(getByText('No pages to preview.')).not.toBeNull();
    expect(container.querySelector('[data-note-page-thumbnail]')).toBeNull();
  });
});
