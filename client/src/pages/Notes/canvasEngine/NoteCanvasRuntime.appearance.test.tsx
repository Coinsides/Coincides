import { forwardRef, useState, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkinSelection } from '@shared/types';
import { usePaletteStore } from '@/hooks/usePaletteColors';
import { useSkinSuiteStore } from '@/hooks/useSkinSuites';
import NoteCanvasRuntime from './NoteCanvasRuntime';
import { NoteCanvasRuntimeProvider } from './NoteCanvasRuntimeProvider';
import type { NoteChromeLayerProps } from './layers/NoteChromeLayer';

const mocks = vi.hoisted(() => ({ loading: false, noteId: 'paper-a', save: vi.fn(), preview: vi.fn(), controller: vi.fn() }));
vi.mock('@/services/api', () => ({ getToken: () => null, setToken: vi.fn(), default: { get: vi.fn(async () => ({ data: [] })) } }));
vi.mock('./hooks/useNoteCanvasRuntimeController', () => ({ useNoteCanvasRuntimeController: () => mocks.controller() }));
vi.mock('./layers/NoteChromeLayer', () => ({ NoteChromeLayer: ({ appearanceAnchorRef, onToggleAppearancePanel, mountAppearanceCard }: NoteChromeLayerProps) =>
  <button type="button" ref={appearanceAnchorRef} onClick={onToggleAppearancePanel} data-inline-card={mountAppearanceCard}>笔记外观</button>,
}));
vi.mock('./layers/NoteRuntimeDocumentLayer', () => ({ NoteRuntimeDocumentLayer: forwardRef(function Document({ writingSurfaceProps }: { writingSurfaceProps: { noteTools: ReactNode } }, _ref) {
  return <div>{writingSurfaceProps.noteTools}</div>;
}) }));

beforeEach(() => {
  mocks.loading = false; mocks.noteId = 'paper-a'; mocks.save.mockReset(); mocks.save.mockResolvedValue(undefined); mocks.preview.mockReset();
  localStorage.clear();
  usePaletteStore.setState({ owner: undefined, loaded: false, loading: false, colors: [], values: {}, detached: {}, error: null });
  useSkinSuiteStore.setState({ owner: undefined, loaded: false, loading: false, suites: [], values: {}, detached: {}, error: null });
  mocks.controller.mockImplementation(() => {
    const [open, setOpen] = useState(false);
    const noteId = mocks.noteId;
    const toggle = () => setOpen((value) => !value);
    return {
      loading: mocks.loading, loadError: null, note: mocks.loading ? null : { id: noteId },
      showAppearancePanel: open, toggleAppearancePanel: toggle,
      skin: { preset: 'default', style: {}, selection: { preset: 'default' }, error: null, retry: vi.fn(),
        preview: mocks.preview, save: (selection: SkinSelection | null) => mocks.save(noteId, selection) },
      layerProps: mocks.loading ? null : { chromeProps: { onToggleAppearancePanel: toggle }, documentLayerProps: { writingSurfaceProps: {} } },
      dismissTransientUI: vi.fn(), flushPendingSaves: vi.fn(), refreshBoardTextRanges: vi.fn(),
    };
  });
});

describe('runtime float card ownership', () => {
  it('retains its exact portal node during route loading and binds the next hydrated paper', async () => {
    const view = (noteId: string) => <NoteCanvasRuntimeProvider noteId={noteId}><NoteCanvasRuntime /></NoteCanvasRuntimeProvider>;
    const subject = render(view('paper-a'));
    fireEvent.click(screen.getByRole('button', { name: '笔记外观' }));
    const card = screen.getByRole('dialog', { name: '笔记外观浮卡' });
    const location = card.getAttribute('style');
    mocks.loading = true; mocks.noteId = 'paper-b';
    subject.rerender(view('paper-b'));
    expect(screen.getByRole('dialog', { name: '笔记外观浮卡' })).toBe(card);
    expect(screen.getByText('正在读取当前笔记…')).toBeTruthy();
    expect(card.querySelector('[data-skin-float-content]')).toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.loading = false;
    subject.rerender(view('paper-b'));
    expect(screen.getAllByRole('dialog', { name: '笔记外观浮卡' })).toEqual([card]);
    expect(card.getAttribute('style')).toBe(location);
    expect(card.querySelector('[data-skin-float-content]')?.getAttribute('data-skin-float-content')).toBe('paper-b');
    fireEvent.click(screen.getByRole('button', { name: '暖纸' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledExactlyOnceWith('paper-b', { preset: 'warm-paper' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭外观' }));
    expect(screen.queryByRole('dialog', { name: '笔记外观浮卡' })).toBeNull();
  });
});
