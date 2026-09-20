import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveChapterProjection } from '../chapterProjectionService';
import { currentChapterAtReadingY } from '../hooks/useNoteNavigationController';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { NoteBlock, TextUnitWritingRole } from '../runtimeDataTypes';
import type { PageFrameModel, PageStackBlockFragmentProjection } from '../types';
import { NoteNavigationPane } from './NoteNavigationPane';
import { chapterNavigationAnchors, chapterProjectionForNavigation, NoteNavigationHeadings } from './NoteNavigationHeadings';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';

vi.mock('./NoteNavigationPages', () => ({ NoteNavigationPages: () => null }));
afterEach(cleanup);

function heading(id: string, title: string, role: TextUnitWritingRole = 'heading', frameId = 'page-1'): NoteBlock {
  const flow = createTextBlockContentV1(title);
  flow.units[0].id = `${id}-unit`;
  flow.units[0].writing_role = role;
  return { id, placement_id: `p-${id}`, block_type: 'paragraph', title: null,
    plain_text: title, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, metadata: {},
    display_overrides_json: {}, order_index: 0, source_references: [],
    canvas_layout: { x: 0, y: 0, width: 540, height: 44, coordinate_space: 'page_frame_local',
      frame_id: frameId, surface: 'formal_page', width_mode: 'auto' } };
}

function inputFor(blocks: NoteBlock[]): NoteWritingSurfaceLayerProps {
  const frames: PageFrameModel[] = Array.from({ length: 3 }, (_, index) => ({
    id: `page-${index + 1}`, role: index ? 'secondary_page_frame' : 'primary_page_frame',
    x: 100, y: index * 1358, width: 904, height: 1278, exportable: true,
    contentInset: { top: 0, bottom: 96, left: 72, right: 72 },
  }));
  const fragments: PageStackBlockFragmentProjection[] = blocks.map((block, index) => {
    const rect = { x: 172, y: 40 + index * 180, width: 540, height: 44 };
    return { blockId: block.id, pageStackId: 'stack', pageFrameId: 'page-1', pageIndex: 0, pageTotal: 3,
      fragmentIndex: 0, fragmentTotal: 1, role: 'single', clippedTop: false, clippedBottom: false,
      blockRect: rect, visibleRect: rect, pageContentRect: rect };
  });
  return { noteId: 'nav-note', visibleBlocks: blocks, blockTextDrafts: {}, blockTextFlowDrafts: {},
    blockFieldDrafts: {}, pageOffsetX: 0,
    noteCanvasRuntime: { pageFrames: frames, blockFragmentProjections: fragments,
      pageFrameExtensions: [], coordinateContract: 'v2' },
  } as unknown as NoteWritingSurfaceLayerProps;
}

describe('A4 heading tree navigation projection', () => {
  it('uses hierarchy, current chapter and a presentation-only number switch with keyboard navigation', () => {
    const blocks = [heading('intro', 'Introduction', 'heading_1'), heading('detail', 'Detail', 'heading_3'),
      heading('next', 'Next chapter', 'heading_1')];
    const projection = deriveChapterProjection(blocks);
    const select = vi.fn();
    const toggle = vi.fn();
    const view = render(<NoteNavigationHeadings projection={projection} currentChapterId={projection.chapters[1].id}
      onSelectChapter={select} numbered onToggleNumbering={toggle} />);
    const items = view.getAllByRole('treeitem');
    expect(items.map((item) => item.getAttribute('aria-level'))).toEqual(['1', '2', '1']);
    expect(items[1].getAttribute('aria-current')).toBe('location');
    expect(items[1].textContent).toBe('1.1Detail');
    fireEvent.click(items[1]);
    expect(select).toHaveBeenCalledExactlyOnceWith(projection.chapters[1].id);
    items[0].focus();
    fireEvent.keyDown(items[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'End' });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.click(view.getByRole('button', { name: 'Chapter numbers' }));
    expect(toggle).toHaveBeenCalledOnce();
    view.rerender(<NoteNavigationHeadings projection={projection} numbered={false} onToggleNumbering={toggle} />);
    expect(view.container.querySelector('.noteNavigationHeadingNumber')).toBeNull();
    expect(projection.chapters[1].number).toEqual([1, 1]);
  });

  it('refreshes the open heading tab from live flow drafts without polling or changing stored blocks', () => {
    const block = heading('intro', 'Introduction');
    const input = inputFor([block]);
    const before = JSON.stringify(block);
    const props = { tab: 'headings' as const, onTabChange: vi.fn(), currentPageFrameId: 'page-1',
      onSelectPage: vi.fn(), onSelectResult: vi.fn(), onClose: vi.fn() };
    const view = render(<NoteNavigationPane writingSurfaceProps={input} {...props} />);
    expect(view.getByRole('treeitem').textContent).toBe('1Introduction');
    const draft = createTextBlockContentV1('Renamed heading');
    draft.units[0].id = 'intro-unit';
    draft.units[0].writing_role = 'heading_2';
    view.rerender(<NoteNavigationPane writingSurfaceProps={{ ...input,
      blockTextFlowDrafts: { intro: draft } }} {...props} />);
    expect(view.getByRole('treeitem').textContent).toBe('1Renamed heading');
    draft.units[0].writing_role = 'paragraph';
    view.rerender(<NoteNavigationPane writingSurfaceProps={{ ...input,
      blockTextFlowDrafts: { intro: { ...draft, units: [...draft.units] } } }} {...props} />);
    expect(view.queryByRole('tree')).toBeNull();
    expect(view.getByText('Add a heading to start the chapter tree.')).not.toBeNull();
    expect(JSON.stringify(block)).toBe(before);
  });

  it('excludes cover and tray residents, but consumes the complete shared projection when content is folded', () => {
    const body = heading('body', 'Body');
    const cover = heading('cover', 'Cover', 'heading', 'cover-page');
    const tray = heading('tray', 'Tray');
    tray.canvas_layout!.surface = 'tray';
    const input = inputFor([cover, body, tray]);
    input.noteCanvasRuntime.pageFrameExtensions = [{ frameId: 'cover-page', isCover: true }] as never;
    expect(chapterProjectionForNavigation(input).agenda.map((entry) => entry.title)).toEqual(['Body']);
    const projection = deriveChapterProjection([body, heading('child', 'Child', 'heading_2')]);
    const complete = { ...input, visibleBlocks: [body], chapterPresentation: { projection,
      collapsedChapterIds: new Set([projection.roots[0].id]), numbered: true,
      onRevealChapter: vi.fn(), onToggleChapter: vi.fn(), onToggleNumbering: vi.fn() } };
    expect(chapterProjectionForNavigation(complete)).toBe(projection);
    expect(chapterProjectionForNavigation(complete).chapters).toHaveLength(2);
  });

  it('anchors to the first A1 fragment after repagination and applies the existing folded page gap offset', () => {
    const block = heading('intro', 'Introduction');
    const input = inputFor([block]);
    const original = input.noteCanvasRuntime.blockFragmentProjections[0];
    const first = { ...original, pageFrameId: 'page-2', pageIndex: 1,
      visibleRect: { ...original.visibleRect, y: 1382 } };
    input.noteCanvasRuntime.blockFragmentProjections = [
      { ...original, pageFrameId: 'page-3', pageIndex: 2, fragmentIndex: 1,
        visibleRect: { ...original.visibleRect, y: 2740 } }, first,
    ];
    const projection = deriveChapterProjection([block]);
    const before = JSON.stringify({ projection, runtime: input.noteCanvasRuntime });
    const anchors = chapterNavigationAnchors(projection, input, new Map([['page-2', -80]]));
    expect(anchors).toEqual([{ chapterId: projection.roots[0].id, blockId: 'intro', frameId: 'page-2',
      rect: { x: 0, y: 1302, width: 540, height: 44 } }]);
    expect(JSON.stringify({ projection, runtime: input.noteCanvasRuntime })).toBe(before);
  });

  it('tracks multiple chapters on one page from reading position, including leading body text', () => {
    const input = inputFor([heading('first', 'First'), heading('second', 'Second')]);
    const projection = deriveChapterProjection(input.visibleBlocks);
    const anchors = chapterNavigationAnchors(projection, input, new Map());
    expect(currentChapterAtReadingY(anchors, 0)).toBeNull();
    expect(currentChapterAtReadingY(anchors, 100)).toBe(projection.chapters[0].id);
    expect(currentChapterAtReadingY(anchors, 220)).toBe(projection.chapters[1].id);
    expect(anchors[0].frameId).toBe(anchors[1].frameId);
  });
});
