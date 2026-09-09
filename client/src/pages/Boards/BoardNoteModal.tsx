import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import NoteCanvasRuntime, { type NoteCanvasRuntimeHandle } from '../Notes/canvasEngine/NoteCanvasRuntime';
import { NoteCanvasRuntimeProvider } from '../Notes/canvasEngine/NoteCanvasRuntimeProvider';
import styles from './BoardNoteModal.module.css';

export type NoteCloseDestination = { kind: 'note' | 'page'; noteId: string };
export interface BoardNoteModalHandle {
  requestClose: (destination?: NoteCloseDestination) => Promise<boolean>;
}
interface BoardNoteModalProps {
  noteId: string;
  onClosed: () => void;
  onOpenFullPage: (noteId: string) => void;
  onSwitchNote: (noteId: string) => void;
}

const BoardNoteModal = forwardRef<BoardNoteModalHandle, BoardNoteModalProps>(function BoardNoteModal({
  noteId, onClosed, onOpenFullPage, onSwitchNote,
}, ref) {
  const runtime = useRef<NoteCanvasRuntimeHandle>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const pending = useRef<Promise<boolean> | null>(null);
  const failedDestination = useRef<NoteCloseDestination>();
  const alive = useRef(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const complete = useCallback((destination?: NoteCloseDestination) => {
    if (!alive.current) return;
    if (destination?.kind === 'note') onSwitchNote(destination.noteId);
    else if (destination?.kind === 'page') onOpenFullPage(destination.noteId);
    else onClosed();
  }, [onClosed, onOpenFullPage, onSwitchNote]);

  const requestClose = useCallback((destination?: NoteCloseDestination): Promise<boolean> => {
    if (pending.current) return pending.current;
    const activeRuntime = runtime.current;
    if (!activeRuntime) return Promise.resolve(false);
    setSaving(true);
    setFailed(false);
    const run = async () => {
      try {
        // Reuse Escape's existing menu/selection cleanup. Flush its React update
        // before blur so a slash-owned draft no longer suppresses persistence.
        flushSync(() => {
          activeRuntime.dismissTransientUI();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        });
        // Slash rollback restores the owner's focus in a microtask; let that exact
        // continuation finish before releasing focus (no save timeout or polling).
        await Promise.resolve();
        flushSync(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        await activeRuntime.flushPendingSaves();
        complete(destination);
        return true;
      } catch {
        if (alive.current) {
          failedDestination.current = destination;
          setFailed(true);
        }
        return false;
      } finally {
        pending.current = null;
        if (alive.current) setSaving(false);
      }
    };
    // Install the guard before dispatching Escape, which reaches this host too.
    const task = Promise.resolve().then(run);
    pending.current = task;
    return task;
  }, [complete]);
  useImperativeHandle(ref, () => ({ requestClose }), [requestClose]);

  useEffect(() => {
    alive.current = true;
    const priorFocus = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus({ preventScroll: true });
    return () => {
      alive.current = false;
      document.body.style.overflow = priorOverflow;
      if (priorFocus instanceof HTMLElement && priorFocus.isConnected) priorFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Native Escape first reaches the editor and its existing window listeners.
        // A microtask starts host teardown only after that dispatch has completed.
        if (!pending.current) queueMicrotask(() => { void requestClose(); });
        return;
      }
      if (pending.current) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (event.key !== 'Tab') return;
      const roots = [dialog.current, ...document.querySelectorAll<HTMLElement>('[data-canvas-layer="floating-overlay"]')];
      const focusable = roots.flatMap((root) => root ? Array.from(root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
      )) : []).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
      const current = document.activeElement;
      if (!focusable.includes(current as HTMLElement) || (!event.shiftKey && current === last) || (event.shiftKey && current === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    const pointerDown = (event: PointerEvent) => {
      const target = event.target;
      const inRuntime = target instanceof Element && (
        dialog.current?.contains(target) || target.closest('[data-canvas-layer="floating-overlay"]')
      );
      const switchesNote = target instanceof Element && target.closest('[data-board-note-switch="true"]');
      if (!pending.current && (inRuntime || switchesNote)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    };
    const click = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && (dialog.current?.contains(target)
        || target.closest('[data-canvas-layer="floating-overlay"], [data-board-note-switch="true"]'))) return;
      event.preventDefault(); event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('pointerdown', pointerDown, true);
    window.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('pointerdown', pointerDown, true);
      window.removeEventListener('click', click, true);
    };
  }, [requestClose]);

  return createPortal(<div className={styles.backdrop}>
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Open note" tabIndex={-1} ref={dialog}>
      <header className={styles.header}>
        <span>Open note</span>
        <span className={styles.status} role="status">{saving ? 'Saving…' : ''}</span>
        <button type="button" disabled={saving} onMouseDown={(event) => event.preventDefault()}
          onClick={() => { void requestClose({ kind: 'page', noteId }); }}><ExternalLink size={16} />Open full page</button>
        <button type="button" aria-label="Close note" disabled={saving} onMouseDown={(event) => event.preventDefault()}
          onClick={() => { void requestClose(); }}><X size={18} /></button>
      </header>
      {failed && <div className={styles.error} role="alert">
        <span>Changes could not be saved. Review the save error and try again, or close anyway.</span>
        <button type="button" onClick={() => complete(failedDestination.current)}>Close anyway</button>
      </div>}
      <div className={styles.content} aria-busy={saving}>
        <NoteCanvasRuntimeProvider noteId={noteId} hostMode="modal">
          <NoteCanvasRuntime ref={runtime} onRequestClose={() => { void requestClose(); }} />
        </NoteCanvasRuntimeProvider>
      </div>
    </div>
  </div>, document.body);
});

export default BoardNoteModal;
