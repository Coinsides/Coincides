import { StrictMode, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Link, MemoryRouter, RouterProvider, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteCanvasRuntimeHandle } from '../NoteCanvasRuntime';
import { NoteRouteSaveBoundary } from './useNoteRouteSaveBoundary';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/stores/uiStore', () => ({ useUIStore: (selector: (value: { addToast: typeof toast }) => unknown) => selector({ addToast: toast }) }));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

let gate: ReturnType<typeof deferred>;
let order: string[];
let durable: Map<string, string>;
let writes: Map<string, Promise<void>>;

function NoteFixture() {
  const { noteId = 'note-a' } = useParams();
  const runtimeRef = useRef<NoteCanvasRuntimeHandle | null>(null);
  const retainRuntime = useCallback((handle: NoteCanvasRuntimeHandle | null) => {
    if (handle) runtimeRef.current = handle;
  }, []);
  const [text, setText] = useState('Original text');
  useImperativeHandle(retainRuntime, () => ({
    dismissTransientUI: () => {
      order.push(`dismiss:${noteId}`);
      queueMicrotask(() => order.push(`settled:${noteId}`));
    },
    flushPendingSaves: async () => {
      order.push(`flush:${noteId}`);
      await writes.get(noteId);
      await gate.promise;
    },
    refreshBoardTextRanges: async () => {},
  }), [noteId]);
  return <>
    <div data-note-host-mode="page">
    <span data-testid="note-id">{noteId}</span>
    <textarea aria-label="Note text" value={text} onChange={(event) => setText(event.target.value)} onBlur={() => {
      order.push(`blur:${noteId}`);
      writes.set(noteId, gate.promise.then(() => { durable.set(noteId, text); }));
    }} />
    </div>
    <Link to="/projects">Navigator projects</Link>
    <Link to="/notes/note-b">Next note</Link>
    <NoteRouteSaveBoundary noteId={noteId} runtimeRef={runtimeRef} />
    {createPortal(<div data-canvas-layer="floating-overlay"><input aria-label="Note popover field" defaultValue="Original portal text" /></div>, document.body)}
  </>;
}

function host(initialEntries = ['/notes/note-a']) {
  const router = createMemoryRouter([
    { path: '/notes/:noteId', element: <NoteFixture /> },
    { path: '/projects', element: <><span>Project list</span><input aria-label="Project field" /></> },
  ], { initialEntries, initialIndex: initialEntries.length - 1 });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

function typeImmediatelyBeforeLeaving() {
  const editor = screen.getByRole('textbox', { name: 'Note text' });
  editor.focus();
  fireEvent.change(editor, { target: { value: 'Typed immediately before leaving' } });
}

beforeEach(() => {
  gate = deferred();
  order = [];
  durable = new Map();
  writes = new Map();
  toast.mockReset();
});
afterEach(async () => {
  gate.resolve();
  cleanup();
  await act(async () => {});
});

describe('note route save boundary', () => {
  it('keeps navigator departure on the note until dismiss, focus restoration, blur and pending writes finish', async () => {
    const { router } = host();
    typeImmediatelyBeforeLeaving();
    fireEvent.click(screen.getByRole('link', { name: 'Navigator projects' }));
    await waitFor(() => expect(order).toEqual(['dismiss:note-a', 'settled:note-a', 'blur:note-a', 'flush:note-a']));
    expect(router.state.location.pathname).toBe('/notes/note-a');
    expect(durable.has('note-a')).toBe(false);
    await act(async () => gate.resolve());
    await screen.findByText('Project list');
    expect(durable.get('note-a')).toBe('Typed immediately before leaving');
    expect(toast).not.toHaveBeenCalled();
  });

  it('keeps the old runtime generation while a note-to-note transition is saving', async () => {
    const { router } = host();
    typeImmediatelyBeforeLeaving();
    fireEvent.click(screen.getByRole('link', { name: 'Next note' }));
    await waitFor(() => expect(order).toContain('flush:note-a'));
    expect(screen.getByTestId('note-id').textContent).toBe('note-a');
    expect(router.state.location.pathname).toBe('/notes/note-a');
    await act(async () => gate.resolve());
    await waitFor(() => expect(screen.getByTestId('note-id').textContent).toBe('note-b'));
    expect(durable.get('note-a')).toBe('Typed immediately before leaving');
    expect(durable.has('note-b')).toBe(false);
    expect(order.filter((entry) => entry.startsWith('flush:'))).toEqual(['flush:note-a']);
  });

  it('holds a failed save on the current route and permits a later successful retry', async () => {
    const { router } = host();
    typeImmediatelyBeforeLeaving();
    fireEvent.click(screen.getByRole('link', { name: 'Navigator projects' }));
    await waitFor(() => expect(order).toContain('flush:note-a'));
    await act(async () => gate.reject(new Error('Synthetic write failure')));
    expect(router.state.location.pathname).toBe('/notes/note-a');
    expect(toast).toHaveBeenCalledWith('error', expect.stringContaining('Please retry before leaving'));
    expect(screen.getByRole('textbox', { name: 'Note text' })).toHaveProperty('value', 'Typed immediately before leaving');
    gate = deferred();
    typeImmediatelyBeforeLeaving();
    fireEvent.click(screen.getByRole('link', { name: 'Navigator projects' }));
    await waitFor(() => expect(order.filter((entry) => entry === 'flush:note-a')).toHaveLength(2));
    await act(async () => gate.resolve());
    await screen.findByText('Project list');
    expect(durable.get('note-a')).toBe('Typed immediately before leaving');
  });

  it('waits for pending writes before browser-history back leaves the note', async () => {
    const { router } = host(['/projects', '/notes/note-a']);
    typeImmediatelyBeforeLeaving();
    await act(async () => { await router.navigate(-1); });
    await waitFor(() => expect(order).toContain('flush:note-a'));
    expect(router.state.location.pathname).toBe('/notes/note-a');
    await act(async () => gate.resolve());
    await screen.findByText('Project list');
    expect(durable.get('note-a')).toBe('Typed immediately before leaving');
  });

  it('shares an in-flight drain while a newer navigation replaces the pending destination', async () => {
    const { router } = host();
    typeImmediatelyBeforeLeaving();
    fireEvent.click(screen.getByRole('link', { name: 'Next note' }));
    await waitFor(() => expect(order).toContain('flush:note-a'));
    await act(async () => { await router.navigate('/projects', { replace: true }); });
    expect(router.state.location.pathname).toBe('/notes/note-a');
    expect(order.filter((entry) => entry === 'flush:note-a')).toHaveLength(1);
    await act(async () => gate.resolve());
    await screen.findByText('Project list');
    expect(durable.get('note-a')).toBe('Typed immediately before leaving');
    expect(order.filter((entry) => entry === 'flush:note-a')).toHaveLength(1);
  });

  it('holds page and portaled input during saving, restores it after failure, and releases the next route', async () => {
    host();
    typeImmediatelyBeforeLeaving();
    fireEvent.click(screen.getByRole('link', { name: 'Navigator projects' }));
    await waitFor(() => expect(order).toContain('flush:note-a'));
    const editor = screen.getByRole('textbox', { name: 'Note text' }) as HTMLTextAreaElement;
    const portal = screen.getByRole('textbox', { name: 'Note popover field' }) as HTMLInputElement;
    const attemptInput = (field: HTMLInputElement | HTMLTextAreaElement, value: string) => {
      const event = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value });
      // Model the browser's default edit: beforeinput cancellation prevents the
      // edit and subsequent input/change. fireEvent.change alone bypasses it.
      if (field.dispatchEvent(event)) fireEvent.change(field, { target: { value } });
      return event;
    };
    expect(editor.closest('[data-note-host-mode]')?.hasAttribute('inert')).toBe(true);
    expect(attemptInput(editor, 'Lost while leaving').defaultPrevented).toBe(true);
    expect(attemptInput(portal, 'Lost portal edit').defaultPrevented).toBe(true);
    expect(editor.value).toBe('Typed immediately before leaving');
    expect(portal.value).toBe('Original portal text');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    portal.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    await act(async () => gate.reject(new Error('Synthetic write failure')));
    expect(editor.closest('[data-note-host-mode]')?.hasAttribute('inert')).toBe(false);
    expect(attemptInput(editor, 'Retry text').defaultPrevented).toBe(false);
    expect(attemptInput(portal, 'Retry portal text').defaultPrevented).toBe(false);
    expect(editor.value).toBe('Retry text');
    gate = deferred();
    editor.focus();
    fireEvent.click(screen.getByRole('link', { name: 'Navigator projects' }));
    await waitFor(() => expect(order.filter((entry) => entry === 'flush:note-a')).toHaveLength(2));
    await act(async () => gate.resolve());
    const projectField = await screen.findByRole('textbox', { name: 'Project field' }) as HTMLInputElement;
    expect(attemptInput(projectField, 'Next route accepts input').defaultPrevented).toBe(false);
    const key = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    projectField.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    expect(projectField.value).toBe('Next route accepts input');
    expect(durable.get('note-a')).toBe('Retry text');
  });

  it('starts best-effort refresh flushing synchronously without unconditional browser confirmation', async () => {
    host();
    typeImmediatelyBeforeLeaving();
    const event = new Event('beforeunload', { cancelable: true });
    await act(async () => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(false);
    expect(order.slice(0, 3)).toEqual(['dismiss:note-a', 'blur:note-a', 'flush:note-a']);
    expect(durable.has('note-a')).toBe(false);
    await act(async () => gate.resolve());
    expect(durable.get('note-a')).toBe('Typed immediately before leaving');
  });

  it('does not flush StrictMode mount probes and drains a forced unmount best-effort', async () => {
    const router = createMemoryRouter([{ path: '/notes/:noteId', element: <NoteFixture /> }], { initialEntries: ['/notes/note-a'] });
    const view = render(<StrictMode><RouterProvider router={router} /></StrictMode>);
    await act(async () => {});
    expect(order).toEqual([]);
    view.unmount();
    await act(async () => {});
    expect(order).toEqual(['flush:note-a']);
  });

  it('can render isolated legacy MemoryRouter fixtures without changing production router requirements', () => {
    render(<MemoryRouter><NoteFixture /></MemoryRouter>);
    expect(screen.getByRole('textbox', { name: 'Note text' })).toBeTruthy();
    expect(order).toEqual([]);
  });
});
