import { forwardRef } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { documentKey, useDocumentTabsStore } from '@/stores/documentTabsStore';
import NoteCanvasRuntime from './NoteCanvasRuntime';
import { NoteCanvasRuntimeProvider } from './NoteCanvasRuntimeProvider';
import type { SourcePageViewController } from './hooks/useSourcePageViewController';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  note: { id: 'a', note_class: 'source_projection', metadata: {} } as Record<string, unknown>,
  view: null as SourcePageViewController | null,
}));

vi.mock('@/services/api', () => ({ getToken: () => null, setToken: vi.fn(), default: { get: vi.fn(async () => ({ data: [] })) } }));
vi.mock('@/pages/Sources/sourceApi', () => ({ getSourcePagesByProjectionNote: mocks.read, generateSourcePages: vi.fn() }));
vi.mock('./hooks/useNoteCanvasRuntimeController', () => ({
  useNoteCanvasRuntimeController: () => ({
    loading: false, loadError: null, note: mocks.note, showAppearancePanel: false, toggleAppearancePanel: vi.fn(),
    skin: { preset: 'default', style: {}, selection: { preset: 'default' }, error: null, retry: vi.fn(), preview: vi.fn(), save: vi.fn() },
    layerProps: { chromeProps: {}, documentLayerProps: { writingSurfaceProps: {} } },
    dismissTransientUI: vi.fn(), flushPendingSaves: vi.fn(), refreshBoardTextRanges: vi.fn(),
  }),
}));
vi.mock('./layers/NoteChromeLayer', () => ({ NoteChromeLayer: () => null }));
vi.mock('./layers/NoteRuntimeDocumentLayer', () => ({
  NoteRuntimeDocumentLayer: forwardRef(function Document({ sourcePageView }: { sourcePageView: SourcePageViewController }, _ref) {
    mocks.view = sourcePageView;
    return null;
  }),
}));

const pages = (noteId: string) => ({
  source_id: `source-${noteId}`, supported: true, status: 'complete', expected: 1, completed: 1, failed_pages: [],
  pages: [{ page_number: 1, asset_id: 'asset', image_width: 1240, image_height: 1754, pdf_width: 595, pdf_height: 842 }],
});
const runtime = (noteId: string) => <NoteCanvasRuntimeProvider noteId={noteId}><NoteCanvasRuntime /></NoteCanvasRuntimeProvider>;
const memory = (noteId: string) => useDocumentTabsStore.getState().tabs.find((tab) => tab.key === documentKey('note', noteId))?.sourceView;

beforeEach(() => {
  useDocumentTabsStore.getState().reset();
  mocks.read.mockReset();
  mocks.read.mockImplementation(async (noteId: string) => pages(noteId));
  mocks.view = null;
  mocks.note = { id: 'a', note_class: 'source_projection', metadata: {} };
});
afterEach(cleanup);

describe('source view while the route moves between projections', () => {
  it('waits for the next note to hydrate, so its default lands in a tab that exists', async () => {
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'a', title: 'A' });
    const view = render(runtime('a'));
    await waitFor(() => expect(mocks.view?.active).toBe(true));
    expect(memory('a')?.mode).toBe('pages');

    // The route is on b, with no tab yet, and the note state still holds a.
    mocks.read.mockClear();
    view.rerender(runtime('b'));
    await act(async () => { await Promise.resolve(); });
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.view?.active).toBe(false);

    useDocumentTabsStore.getState().open({ kind: 'note', id: 'b', title: 'B' });
    mocks.note = { id: 'b', note_class: 'source_projection', metadata: {} };
    view.rerender(runtime('b'));
    await waitFor(() => expect(mocks.view?.active).toBe(true));
    expect(mocks.read).toHaveBeenCalledWith('b');
    expect(memory('b')).toEqual({ mode: 'pages', page: 1 });
    act(() => mocks.view?.rememberPage(4));
    expect(memory('b')).toEqual({ mode: 'pages', page: 4 });
  });
});

describe('conversion notice', () => {
  const withMessages = { id: 'a', note_class: 'source_projection', metadata: { parser_messages: [{ type: 'warning', message: 'synthetic' }] } };

  it('shows over the text and not over the original pages', async () => {
    mocks.note = withMessages;
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'a', title: 'A' });
    render(runtime('a'));
    await waitFor(() => expect(mocks.view?.active).toBe(true));
    expect(screen.queryByRole('note')).toBeNull();
    act(() => mocks.view?.setMode('text'));
    expect(screen.getByRole('note')).toBeTruthy();
    act(() => mocks.view?.setMode('pages'));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('shows where the Source has no pages', async () => {
    mocks.note = withMessages;
    mocks.read.mockResolvedValue({ ...pages('a'), supported: false, status: 'none', expected: 0, completed: 0, pages: [] });
    useDocumentTabsStore.getState().open({ kind: 'note', id: 'a', title: 'A' });
    render(runtime('a'));
    await waitFor(() => expect(mocks.read).toHaveBeenCalled());
    expect(screen.getByRole('note')).toBeTruthy();
  });
});
