import { useRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteNavigationResults, type NoteNavigationSearchInput } from '../noteNavigationSearch';
import { NoteNavigationPane, NOTE_NAVIGATION_SEARCH_DELAY } from '../layers/NoteNavigationPane';
import type { NoteWritingSurfaceLayerProps } from '../layers/NoteWritingSurfaceLayer';
import type { PageFrameModel } from '../types';
import { useNoteNavigationController } from './useNoteNavigationController';

// This suite exercises header result navigation, independently of page thumbnails.
vi.mock('../layers/NoteNavigationPages', () => ({ NoteNavigationPages: () => null }));

const page: PageFrameModel = {
  id: 'page-1', role: 'primary_page_frame', x: 0, y: 0, width: 700, height: 900,
  contentInset: { top: 30, bottom: 40, left: 50, right: 50 }, exportable: true,
};
const frames = [page];

function searchInput(noteId = 'note-1'): NoteNavigationSearchInput {
  return {
    noteId, visibleBlocks: [], blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {},
    paperHeader: { titleDraft: 'Fresh cover', descriptionDraft: 'Loaded description' },
    noteCanvasRuntime: { pageFrames: frames, blockFragmentProjections: [], coordinateContract: 'v2' },
  };
}

function ControllerHarness({ noteId = 'note-1' }: { noteId?: string }) {
  const blockListRef = useRef<HTMLDivElement>(null);
  const controller = useNoteNavigationController({ noteId, enabled: true, blockListRef, pageFrames: frames });
  const result = buildNoteNavigationResults(searchInput(noteId), 'Fresh')[0]!;
  return <div data-app-main-scroll="true">
    <div key={noteId} data-note-overview-active="false">
      <header data-note-paper-header="true">Fresh cover for {noteId}</header>
      <div data-page-display-scale="0.5"><div ref={blockListRef} data-testid="block-list">
        <div data-note-block-shell="true" data-block-id="body">Body text</div>
      </div></div>
    </div>
    <button type="button" onClick={() => controller.selectResult(result.blockId, result.frameId, result.rect)}>
      Read header result
    </button>
    <output>{controller.currentFrameId}</output>
  </div>;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('navigation header destinations', () => {
  it('scrolls a model header result to the actual header DOM and highlights it for 2.2 seconds', () => {
    const view = render(<ControllerHarness />);
    const main = view.container.querySelector<HTMLElement>('[data-app-main-scroll]')!;
    const header = view.container.querySelector<HTMLElement>('[data-note-paper-header]')!;
    const body = view.container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    main.scrollTop = 400;
    main.scrollTo = vi.fn();
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 250 } as DOMRect);
    // The header is outside this scaled block origin; a block-rect jump would land elsewhere.
    vi.spyOn(view.getByTestId('block-list'), 'getBoundingClientRect').mockReturnValue({ top: 700 } as DOMRect);
    fireEvent.click(view.getByRole('button', { name: 'Read header result' }));
    expect(main.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 526, left: 0, behavior: 'auto' });
    expect(header.dataset.noteNavigationHit).toBe('true');
    expect(body.dataset.noteNavigationHit).toBeUndefined();
    expect(view.getByText('page-1')).not.toBeNull();
    act(() => vi.advanceTimersByTime(2199));
    expect(header.dataset.noteNavigationHit).toBe('true');
    act(() => vi.advanceTimersByTime(1));
    expect(header.dataset.noteNavigationHit).toBeUndefined();
  });

  it('cleans the previous note header and its timer before highlighting a result in another note', () => {
    const view = render(<ControllerHarness />);
    const main = view.container.querySelector<HTMLElement>('[data-app-main-scroll]')!;
    main.scrollTo = vi.fn();
    const previousHeader = view.container.querySelector<HTMLElement>('[data-note-paper-header]')!;
    fireEvent.click(view.getByRole('button', { name: 'Read header result' }));
    act(() => vi.advanceTimersByTime(1000));
    view.rerender(<ControllerHarness noteId="note-2" />);
    const nextHeader = view.container.querySelector<HTMLElement>('[data-note-paper-header]')!;
    expect(previousHeader.isConnected).toBe(false);
    expect(previousHeader.dataset.noteNavigationHit).toBeUndefined();
    expect(nextHeader.dataset.noteNavigationHit).toBeUndefined();
    fireEvent.click(view.getByRole('button', { name: 'Read header result' }));
    act(() => vi.advanceTimersByTime(1200));
    expect(nextHeader.dataset.noteNavigationHit).toBe('true');
    act(() => vi.advanceTimersByTime(1000));
    expect(nextHeader.dataset.noteNavigationHit).toBeUndefined();
  });

  it('updates an existing pane search when live title and description drafts change', () => {
    const input = searchInput();
    const selectResult = vi.fn();
    const pane = (next: NoteNavigationSearchInput) => <NoteNavigationPane
      writingSurfaceProps={next as NoteWritingSurfaceLayerProps} tab="results" onTabChange={vi.fn()}
      currentPageFrameId="page-1" onSelectPage={vi.fn()} onSelectResult={selectResult} onClose={vi.fn()} />;
    const view = render(pane(input));
    fireEvent.change(view.getByRole('searchbox', { name: 'Search this note' }), { target: { value: 'Fresh' } });
    act(() => vi.advanceTimersByTime(NOTE_NAVIGATION_SEARCH_DELAY));
    expect(view.getByText('1 result')).not.toBeNull();
    // All block/runtime references stay unchanged, so only header draft dependencies can refresh this result.
    view.rerender(pane({ ...input, paperHeader: { titleDraft: 'Renamed cover', descriptionDraft: 'Fresh summary' } }));
    const result = view.getByRole('button', { name: 'Page 1 Renamed cover Fresh summary' });
    fireEvent.click(result);
    expect(selectResult).toHaveBeenCalledWith(expect.objectContaining({
      target: 'header', blockId: null, before: 'Renamed cover\n', match: 'Fresh', after: ' summary',
    }));
    view.rerender(pane({ ...input, paperHeader: { titleDraft: 'Renamed cover', descriptionDraft: 'New summary' } }));
    expect(view.getByText('No results in this note.')).not.toBeNull();
    expect(view.queryByRole('button', { name: /Page 1/ })).toBeNull();
  });
});
