import { createRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardNoteModal, { type BoardNoteModalHandle } from './BoardNoteModal';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';

const runtime = vi.hoisted(() => ({
  dismiss: vi.fn(), idle: vi.fn(), refreshRanges: vi.fn(), order: [] as string[], mounts: [] as string[], live: 0, peakLive: 0,
  sendToStaging: undefined as ((selection: BoardTextRangeSelection) => Promise<boolean>) | undefined,
}));
vi.mock('../Notes/canvasEngine/NoteCanvasRuntimeProvider', () => ({
  NoteCanvasRuntimeProvider: ({ noteId, hostMode, onSendToStaging, children }: any) => {
    runtime.sendToStaging = onSendToStaging;
    return <section data-testid="runtime-provider" data-note-id={noteId} data-host-mode={hostMode}>{children}</section>;
  },
}));
vi.mock('../Notes/canvasEngine/NoteCanvasRuntime', async () => {
  const React = await import('react');
  return { default: React.forwardRef(function RuntimeProbe(_props: unknown, ref: any) {
    const element = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => ({ dismissTransientUI: runtime.dismiss, flushPendingSaves: runtime.idle, refreshBoardTextRanges: runtime.refreshRanges }));
    React.useEffect(() => {
      runtime.live += 1; runtime.peakLive = Math.max(runtime.peakLive, runtime.live);
      runtime.mounts.push(element.current!.closest('[data-note-id]')!.getAttribute('data-note-id')!);
      return () => { runtime.live -= 1; };
    }, []);
    return <textarea ref={element} aria-label="Runtime editor" defaultValue="Synthetic note text"
      onBlur={() => runtime.order.push('blur')} />;
  }) };
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
type ClosePath = 'X' | 'Escape' | 'switch' | 'full page';
function renderHost(options: { stagingOpen?: boolean; onSendToStaging?: (selection: BoardTextRangeSelection) => Promise<boolean> } = {}) {
  const handle = createRef<BoardNoteModalHandle>();
  const closed = vi.fn();
  const switched = vi.fn();
  const page = vi.fn();
  function Host() {
    const [noteId, setNoteId] = useState<string | null>('note-a');
    return <>
      <span>Board remains mounted</span>
      {noteId && <BoardNoteModal key={noteId} ref={handle} noteId={noteId}
        {...options}
        onClosed={() => { closed(); setNoteId(null); }}
        onSwitchNote={(next) => { switched(next); setNoteId(next); }}
        onOpenFullPage={(next) => { page(next); setNoteId(null); }} />}
    </>;
  }
  return { ...render(<Host />), handle, closed, switched, page };
}
type Host = ReturnType<typeof renderHost>;
function request(path: ClosePath, host: Host) {
  if (path === 'X') fireEvent.click(screen.getByRole('button', { name: 'Close note' }));
  else if (path === 'Escape') fireEvent.keyDown(screen.getByRole('textbox', { name: 'Runtime editor' }), { key: 'Escape' });
  else if (path === 'full page') fireEvent.click(screen.getByRole('button', { name: 'Open full page' }));
  else void host.handle.current!.requestClose({ kind: 'note', noteId: 'note-b' });
}
function expectDestination(path: ClosePath, host: Host) {
  expect(host.closed.mock.calls).toEqual(path === 'X' || path === 'Escape' ? [[]] : []);
  expect(host.switched.mock.calls).toEqual(path === 'switch' ? [['note-b']] : []);
  expect(host.page.mock.calls).toEqual(path === 'full page' ? [['note-a']] : []);
  if (path === 'switch') {
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('runtime-provider').getAttribute('data-note-id')).toBe('note-b');
    expect(runtime.mounts).toEqual(['note-a', 'note-b']);
    expect(runtime.peakLive).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
  } else {
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  runtime.order = []; runtime.mounts = []; runtime.live = 0; runtime.peakLive = 0;
  runtime.sendToStaging = undefined;
  runtime.dismiss.mockImplementation(() => { runtime.order.push('dismiss'); });
  runtime.idle.mockImplementation(async () => { runtime.order.push('idle'); });
  runtime.refreshRanges.mockImplementation(async () => { runtime.order.push('refresh ranges'); });
  document.body.style.overflow = 'scroll';
});

describe('Open note staging dock', () => {
  const passage: BoardTextRangeSelection = {
    note_id: 'note-a', block_id: 'block-a', text_flow_id: 'flow-a', text_unit_id: 'unit-a',
    start_offset: 0, end_offset: 9, excerpt: 'Synthetic', at: '2026-09-09T00:00:00.000Z',
  };

  it('flushes pending text before sending the captured range and leaves the note open', async () => {
    const saving = deferred();
    runtime.idle.mockImplementation(() => { runtime.order.push('idle'); return saving.promise; });
    const mount = vi.fn(async () => { runtime.order.push('mount'); return true; });
    const host = renderHost({ onSendToStaging: mount });
    screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
    let sent!: Promise<boolean>;
    await act(async () => { sent = runtime.sendToStaging!(passage); });
    expect(runtime.order).toEqual(['blur', 'idle']);
    expect(mount).not.toHaveBeenCalled();
    expect(runtime.dismiss).not.toHaveBeenCalled();
    expect(await host.handle.current!.requestClose()).toBe(false);
    await act(async () => { saving.resolve(); expect(await sent).toBe(true); });
    expect(runtime.order).toEqual(['blur', 'idle', 'mount', 'refresh ranges']);
    expect(mount).toHaveBeenCalledExactlyOnceWith(passage);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(host.closed).not.toHaveBeenCalled();
    expect(runtime.mounts).toEqual(['note-a']);
  });

  it('does not mount a range if flushing fails and allows a later retry', async () => {
    runtime.idle.mockRejectedValueOnce(new Error('Synthetic save failed')).mockResolvedValue(undefined);
    const mount = vi.fn(async () => true);
    renderHost({ onSendToStaging: mount });
    await act(async () => { await expect(runtime.sendToStaging!(passage)).rejects.toThrow('Synthetic save failed'); });
    expect(mount).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { expect(await runtime.sendToStaging!(passage)).toBe(true); });
    expect(mount).toHaveBeenCalledExactlyOnceWith(passage);
  });

  it('allows dock controls and includes them in focus traversal while keeping board interactions paused', () => {
    const stageClick = vi.fn();
    const placeClick = vi.fn();
    const boardClick = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [new DOMRect(0, 0, 80, 30)] as unknown as DOMRectList);
    const props = { noteId: 'note-a', onClosed: vi.fn(), onSwitchNote: vi.fn(), onOpenFullPage: vi.fn() };
    const scene = (open: boolean) => <>
      <button data-board-staging-control="true" onClick={stageClick}>Staging (1)</button>
      {open && <aside data-board-staging="true"><button onClick={placeClick}>Place on board</button></aside>}
      <button onClick={boardClick}>Ordinary board control</button>
      <BoardNoteModal {...props} stagingOpen={open} />
    </>;
    const host = render(scene(true));
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false');
    expect(screen.getByRole('dialog').parentElement?.getAttribute('data-board-note-staging-open')).toBe('true');
    const place = screen.getByRole('button', { name: 'Place on board' });
    expect(fireEvent.pointerDown(place)).toBe(true);
    fireEvent.click(place);
    fireEvent.click(screen.getByRole('button', { name: 'Staging (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ordinary board control' }));
    expect(placeClick).toHaveBeenCalledOnce();
    expect(stageClick).toHaveBeenCalledOnce();
    expect(boardClick).not.toHaveBeenCalled();

    const editor = screen.getByRole('textbox', { name: 'Runtime editor' });
    const toggle = screen.getByRole('button', { name: 'Staging (1)' });
    editor.focus();
    fireEvent.keyDown(editor, { key: 'Tab' });
    expect(document.activeElement).toBe(toggle);
    fireEvent.keyDown(toggle, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(editor);
    place.focus();
    fireEvent.keyDown(place, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open full page' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(place);
    const noteShortcut = vi.fn();
    window.addEventListener('keydown', noteShortcut);
    fireEvent.keyDown(place, { key: 'Delete' });
    expect(noteShortcut).not.toHaveBeenCalled();
    window.removeEventListener('keydown', noteShortcut);

    host.rerender(scene(false));
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('dialog').parentElement?.getAttribute('data-board-note-staging-open')).toBe('false');
    expect(runtime.mounts).toEqual(['note-a']);
  });
});
afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('Open note modal close protocol', () => {
  it.each<ClosePath>(['X', 'Escape', 'switch', 'full page'])('%s waits for runtime writes before completing its destination', async (path) => {
    const saving = deferred();
    runtime.idle.mockImplementation(() => { runtime.order.push('idle'); return saving.promise; });
    const host = renderHost();
    expect(screen.getByTestId('runtime-provider').getAttribute('data-host-mode')).toBe('modal');
    expect(document.body.style.overflow).toBe('hidden');
    const readingScroll = screen.getByRole('textbox', { name: 'Runtime editor' }).closest('[data-app-main-scroll="true"]');
    expect(readingScroll).not.toBeNull();
    expect(screen.getByRole('dialog').contains(readingScroll)).toBe(true);
    screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
    await act(async () => { request(path, host); });

    expect(runtime.order).toEqual(['dismiss', 'blur', 'idle']);
    expect(runtime.dismiss).toHaveBeenCalledOnce();
    expect(runtime.idle).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toContain('Saving');
    expect((screen.getByRole('button', { name: 'Close note' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Open full page' }) as HTMLButtonElement).disabled).toBe(true);
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
    expect(host.page).not.toHaveBeenCalled();
    expect(runtime.mounts).toEqual(['note-a']);

    await act(async () => { saving.resolve(); await saving.promise; });
    expectDestination(path, host);
    host.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it.each<ClosePath>(['X', 'Escape', 'switch', 'full page'])('%s preserves the failed editor until Close anyway uses that same destination', async (path) => {
    const saving = deferred();
    runtime.idle.mockReturnValue(saving.promise);
    const host = renderHost();
    screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
    await act(async () => { request(path, host); });
    await act(async () => { saving.reject(new Error('Synthetic save rejected')); });

    expect(screen.getByRole('alert').textContent).toContain('Changes could not be saved');
    expect((screen.getByRole('textbox', { name: 'Runtime editor' }) as HTMLTextAreaElement).value).toBe('Synthetic note text');
    expect(screen.getByRole('status').textContent).not.toContain('Saving');
    expect(document.body.style.overflow).toBe('hidden');
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
    expect(host.page).not.toHaveBeenCalled();
    expect(runtime.mounts).toEqual(['note-a']);

    fireEvent.click(screen.getByRole('button', { name: 'Close anyway' }));
    expectDestination(path, host);
    expect(runtime.idle).toHaveBeenCalledOnce();
  });

  it('shares one request promise and keeps the first destination through nested Escape and duplicate requests', async () => {
    const saving = deferred();
    runtime.idle.mockReturnValue(saving.promise);
    const host = renderHost();
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    await act(async () => {
      first = host.handle.current!.requestClose();
      second = host.handle.current!.requestClose({ kind: 'page', noteId: 'note-b' });
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(first).toBe(second);
    expect(runtime.dismiss).toHaveBeenCalledOnce();
    expect(runtime.idle).toHaveBeenCalledOnce();
    await act(async () => { saving.resolve(); expect(await first).toBe(true); });
    expect(host.closed).toHaveBeenCalledOnce();
    expect(host.page).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
  });

  it('waits for slash focus restoration before blur and waits for the write that blur starts', async () => {
    const saving = deferred();
    runtime.dismiss.mockImplementation(() => {
      runtime.order.push('dismiss');
      queueMicrotask(() => {
        runtime.order.push('slash focus restored');
        screen.getByRole('textbox', { name: 'Runtime editor' }).focus();
      });
    });
    runtime.idle.mockImplementation(() => { runtime.order.push('idle'); return saving.promise; });
    const host = renderHost();
    await act(async () => { request('X', host); });
    expect(runtime.order).toEqual(['dismiss', 'slash focus restored', 'blur', 'idle']);
    expect(host.closed).not.toHaveBeenCalled();
    await act(async () => { saving.resolve(); await saving.promise; });
    expect(host.closed).toHaveBeenCalledOnce();
  });

  it('retries after a failed save and clears the explicit discard exit on success', async () => {
    runtime.idle.mockRejectedValueOnce(new Error('Synthetic initial failure')).mockResolvedValueOnce(undefined);
    const host = renderHost();
    await act(async () => { request('X', host); });
    expect(screen.getByRole('button', { name: 'Close anyway' })).toBeTruthy();
    await act(async () => { request('X', host); });
    expect(runtime.idle).toHaveBeenCalledTimes(2);
    expect(host.closed).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('restores original focus and overflow and removes host listeners when unmounted during a save', async () => {
    const origin = document.createElement('button');
    document.body.appendChild(origin); origin.focus();
    const saving = deferred();
    runtime.idle.mockReturnValue(saving.promise);
    const host = renderHost();
    await act(async () => { request('X', host); });
    host.unmount();
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.activeElement).toBe(origin);
    fireEvent.keyDown(window, { key: 'Escape' });
    const key = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    window.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    const pointer = new Event('pointerdown', { bubbles: true, cancelable: true });
    window.dispatchEvent(pointer);
    expect(pointer.defaultPrevented).toBe(false);
    await act(async () => { saving.resolve(); await saving.promise; });
    expect(runtime.idle).toHaveBeenCalledOnce();
    expect(host.closed).not.toHaveBeenCalled();
    expect(host.page).not.toHaveBeenCalled();
    expect(host.switched).not.toHaveBeenCalled();
    origin.remove();
  });
});
