import { useRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectAgentContextHint, useUIStore } from '@/stores/uiStore';
import { NoteAgentContextRoute } from '../../NoteAgentContextRoute';
import type { PageFrameModel } from '../types';
import { useNoteAmbientAgentContextHint } from './useNoteAmbientAgentContextHint';

const frame = (id: string, y: number): PageFrameModel => ({
  id, y, x: 0, width: 700, height: 900, role: 'primary_page_frame', exportable: true,
  contentInset: { top: 30, bottom: 40, left: 50, right: 50 },
});
// Persisted collection order is deliberately different from read_note's paper order.
const frames = [frame('page-3', 2000), frame('page-1', 0), frame('page-2', 1000)];
let blockTop = 100;
const resizeCallbacks: Array<() => void> = [];

function Reader({ noteId = 'note-1', surfaceMode = 'page', pageFrames = frames,
  overviewOpen = false, overviewFrameId = null, scale = 1 }: {
  noteId?: string; surfaceMode?: 'page' | 'canvas'; pageFrames?: PageFrameModel[];
  overviewOpen?: boolean; overviewFrameId?: string | null; scale?: number;
}) {
  const blockListRef = useRef<HTMLDivElement>(null);
  useNoteAmbientAgentContextHint({ noteId, surfaceMode, pageFrames, blockListRef, overviewOpen, overviewFrameId });
  return <div data-app-main-scroll="true" data-testid="main">
    <div data-page-display-scale={scale}><div ref={blockListRef} data-testid="blocks" /></div>
  </div>;
}

function NoteRoute(props: Parameters<typeof Reader>[0]) {
  return <NoteAgentContextRoute.Provider value={true}><Reader {...props} /></NoteAgentContextRoute.Provider>;
}

const hint = () => selectAgentContextHint(useUIStore.getState());
const expectedNote = (noteId: string, pageIndex?: number) => ({ type: 'note_view', data: {
  note_id: noteId, ...(pageIndex === undefined ? {} : { page_index: pageIndex }),
} });
const flushFrame = () => act(() => vi.advanceTimersByTime(20));

beforeEach(() => {
  vi.useFakeTimers();
  blockTop = 100;
  resizeCallbacks.length = 0;
  useUIStore.setState({ agentPanelOpen: false, agentContextHint: null,
    ambientAgentContextHint: null, ambientAgentContextOwner: null, ambientAgentContextDismissed: false });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { top: this.dataset.testid === 'blocks' ? blockTop : 100, height: 600 } as DOMRect;
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resizeCallbacks.push(callback); }
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('passive note route context', () => {
  it('registers only with the panel open and remeasures when it reopens', () => {
    const view = render(<NoteRoute />);
    expect(useUIStore.getState().ambientAgentContextHint).toBeNull();
    act(() => useUIStore.getState().setAgentPanelOpen(true));
    expect(hint()).toEqual(expectedNote('note-1', 0));
    act(() => useUIStore.getState().setAgentPanelOpen(false));
    expect(useUIStore.getState().ambientAgentContextHint).toBeNull();
    blockTop = -1000;
    fireEvent.scroll(view.getByTestId('main'));
    flushFrame();
    expect(hint()).toBeNull();
    act(() => useUIStore.getState().setAgentPanelOpen(true));
    expect(hint()).toEqual(expectedNote('note-1', 1));
  });

  it('follows scrolling in zero-based paper order using the display scale', () => {
    useUIStore.getState().setAgentPanelOpen(true);
    const view = render(<NoteRoute scale={0.5} />);
    expect(hint()).toEqual(expectedNote('note-1', 0));
    blockTop = -400;
    fireEvent.scroll(view.getByTestId('main'));
    flushFrame();
    expect(hint()).toEqual(expectedNote('note-1', 1));
    blockTop = -950;
    fireEvent.scroll(view.getByTestId('main'));
    flushFrame();
    expect(hint()).toEqual(expectedNote('note-1', 2));
  });

  it('uses the nearest page between papers and responds to window and layout resize', () => {
    useUIStore.getState().setAgentPanelOpen(true);
    const view = render(<NoteRoute />);
    blockTop = -790; // readingY = 970, closer to the second paper than the first.
    fireEvent(window, new Event('resize'));
    flushFrame();
    expect(hint()).toEqual(expectedNote('note-1', 1));
    blockTop = -1900;
    act(() => resizeCallbacks[0]());
    flushFrame();
    expect(hint()).toEqual(expectedNote('note-1', 2));
    view.rerender(<NoteRoute pageFrames={[frame('only-page', 0)]} />);
    expect(hint()).toEqual(expectedNote('note-1', 0));
  });

  it('replaces the previous note on route changes and clears its registration on departure', () => {
    useUIStore.getState().setAgentPanelOpen(true);
    const view = render(<NoteRoute />);
    blockTop = -1900;
    view.rerender(<NoteRoute noteId="note-2" />);
    expect(hint()).toEqual(expectedNote('note-2', 2));
    fireEvent.scroll(view.getByTestId('main'));
    view.unmount();
    expect(useUIStore.getState().ambientAgentContextHint).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps an explicit hint ahead of the live reading context', () => {
    const explicit = { type: 'deck' as const, data: { deck_id: 'deck-1', deck_name: 'Revision' } };
    useUIStore.getState().openAgentWithContext(explicit);
    const view = render(<NoteRoute />);
    blockTop = -1000;
    fireEvent.scroll(view.getByTestId('main'));
    flushFrame();
    expect(hint()).toEqual(explicit);
    expect(useUIStore.getState().ambientAgentContextHint).toEqual(expectedNote('note-1', 1));
    act(() => useUIStore.getState().dismissAgentContextHint());
    expect(hint()).toEqual(expectedNote('note-1', 1));
  });

  it('uses the frozen reading page during overview and resumes measuring after it closes', () => {
    useUIStore.getState().setAgentPanelOpen(true);
    const view = render(<NoteRoute />);
    view.rerender(<NoteRoute overviewOpen overviewFrameId="page-3" />);
    expect(hint()).toEqual(expectedNote('note-1', 2));
    blockTop = -1000;
    fireEvent.scroll(view.getByTestId('main'));
    flushFrame();
    expect(hint()).toEqual(expectedNote('note-1', 2));
    view.rerender(<NoteRoute />);
    expect(hint()).toEqual(expectedNote('note-1', 1));
  });

  it('leaves board context with its owner when the note runtime is embedded outside NoteDetail', () => {
    useUIStore.getState().setAgentPanelOpen(true);
    const boardHint = { type: 'board_view' as const, data: { board_id: 'board-1' } };
    useUIStore.getState().setAmbientAgentContextHint(Symbol('board'), boardHint);
    const view = render(<Reader />);
    expect(hint()).toEqual(boardHint);
    view.unmount();
    expect(hint()).toEqual(boardHint);
  });

  it('omits a page index when there is no paper reading position', () => {
    useUIStore.getState().setAgentPanelOpen(true);
    const view = render(<NoteRoute surfaceMode="canvas" />);
    expect(hint()).toEqual(expectedNote('note-1'));
    view.rerender(<NoteRoute pageFrames={[]} />);
    expect(hint()).toEqual(expectedNote('note-1'));
    view.rerender(<NoteRoute />);
    expect(hint()).toEqual(expectedNote('note-1', 0));
  });
});
