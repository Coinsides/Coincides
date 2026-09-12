import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import NoteCanvasRuntime, { type NoteCanvasRuntimeHandle } from '@/pages/Notes/canvasEngine/NoteCanvasRuntime';
import { NoteCanvasRuntimeProvider } from '@/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';
import styles from './BoardNoteModal.module.css';
import type { StagingItemDrop } from './boardStagingDrag';

export type NoteCloseDestination = { kind: 'note' | 'page'; noteId: string };
export interface BoardNoteModalHandle {
  requestClose: (destination?: NoteCloseDestination) => Promise<boolean>;
}
interface BoardNoteModalProps {
  noteId: string;
  onClosed: () => void;
  onOpenFullPage: (noteId: string) => void;
  onSwitchNote: (noteId: string) => void;
  stagingOpen?: boolean;
  stagingItemDrop?: StagingItemDrop;
  onSendToStaging?: (selection: BoardTextRangeSelection) => Promise<boolean>;
}

type DialogPosition = { left: number; top: number };
// This belongs to the current app session, never to a note or persisted UI state.
let sessionPosition: DialogPosition | null = null;

const BoardNoteModal = forwardRef<BoardNoteModalHandle, BoardNoteModalProps>(function BoardNoteModal({
  noteId, onClosed, onOpenFullPage, onSwitchNote, stagingOpen = false, onSendToStaging, stagingItemDrop,
}, ref) {
  const runtime = useRef<NoteCanvasRuntimeHandle>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const pending = useRef<Promise<boolean> | null>(null);
  const stagingPending = useRef<Promise<boolean> | null>(null);
  const failedDestination = useRef<NoteCloseDestination>();
  const alive = useRef(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState<DialogPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; position: DialogPosition; handle: HTMLElement } | null>(null);

  const fitPosition = useCallback((preferred: DialogPosition | null) => {
    const element = dialog.current;
    const available = element?.parentElement?.getBoundingClientRect();
    if (!element || !available) return null;
    const box = element.getBoundingClientRect();
    const marginX = Math.min(16, Math.max(0, (available.width - box.width) / 2));
    const marginY = Math.min(16, Math.max(0, (available.height - box.height) / 2));
    return {
      left: Math.max(marginX, Math.min(preferred?.left ?? (available.width - box.width) / 2, available.width - box.width - marginX)),
      top: Math.max(marginY, Math.min(preferred?.top ?? (available.height - box.height) / 2, available.height - box.height - marginY)),
    };
  }, []);

  useLayoutEffect(() => {
    const reposition = () => {
      const next = fitPosition(sessionPosition);
      if (next) setPosition((previous) => previous?.left === next.left && previous.top === next.top ? previous : next);
    };
    // The backdrop's existing dock reservation owns the available rectangle.
    // Clamp the displayed window without overwriting the user's remembered place.
    reposition();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reposition);
    if (dialog.current) observer?.observe(dialog.current);
    if (dialog.current?.parentElement) observer?.observe(dialog.current.parentElement);
    window.addEventListener('resize', reposition);
    return () => { observer?.disconnect(); window.removeEventListener('resize', reposition); };
  }, [fitPosition, stagingOpen]);

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || pending.current || stagingPending.current || drag.current
      || (event.target instanceof Element && event.target.closest('button, a, input, textarea, select'))) return;
    const start = position ?? fitPosition(sessionPosition);
    if (!start) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, position: start, handle: event.currentTarget };
    setDragging(true);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const next = fitPosition({
      left: current.position.left + event.clientX - current.x,
      top: current.position.top + event.clientY - current.y,
    });
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    sessionPosition = next;
    setPosition(next);
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (current.handle.hasPointerCapture?.(event.pointerId)) current.handle.releasePointerCapture(event.pointerId);
  };

  const complete = useCallback((destination?: NoteCloseDestination) => {
    if (!alive.current) return;
    if (destination?.kind === 'note') onSwitchNote(destination.noteId);
    else if (destination?.kind === 'page') onOpenFullPage(destination.noteId);
    else onClosed();
  }, [onClosed, onOpenFullPage, onSwitchNote]);

  const requestClose = useCallback((destination?: NoteCloseDestination): Promise<boolean> => {
    if (pending.current) return pending.current;
    if (stagingPending.current) return Promise.resolve(false);
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

  const sendToStaging = useCallback((selection: BoardTextRangeSelection): Promise<boolean> => {
    if (stagingPending.current) return stagingPending.current;
    const activeRuntime = runtime.current;
    if (!onSendToStaging || !activeRuntime || pending.current) return Promise.resolve(false);
    setSaving(true);
    const task = Promise.resolve().then(async () => {
      try {
        // The receipt was captured before blur. Persist the current text through
        // the existing runtime barrier before the mount endpoint mints its anchor.
        flushSync(() => {
          if (document.activeElement instanceof HTMLElement && dialog.current?.contains(document.activeElement)) {
            document.activeElement.blur();
          }
        });
        await activeRuntime.flushPendingSaves();
        if (!alive.current || !await onSendToStaging(selection)) return false;
        // Keep the same editing session and the staging input barrier until its
        // newly minted anchors can participate in the next ordinary text edit.
        await activeRuntime.refreshBoardTextRanges();
        return true;
      } finally {
        stagingPending.current = null;
        if (alive.current) setSaving(false);
      }
    });
    stagingPending.current = task;
    return task;
  }, [onSendToStaging]);

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
      const inStaging = event.target instanceof Element
        && event.target.closest('[data-board-staging="true"], [data-board-staging-control="true"]');
      if (inStaging && event.key !== 'Tab' && !pending.current && !stagingPending.current) {
        // Dock keyboard input must not reach the note's document-level shortcuts.
        event.stopImmediatePropagation();
        return;
      }
      if (event.key === 'Escape') {
        // Native Escape first reaches the editor and its existing window listeners.
        // A microtask starts host teardown only after that dispatch has completed.
        if (!pending.current && !stagingPending.current) queueMicrotask(() => { void requestClose(); });
        return;
      }
      if (pending.current || stagingPending.current) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (event.key !== 'Tab') return;
      const selector = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';
      const roots = [dialog.current, ...document.querySelectorAll<HTMLElement>(
        `[data-canvas-layer="floating-overlay"], [data-board-staging-control="true"]${stagingOpen ? ', [data-board-staging="true"]' : ''}`,
      )];
      const focusable = [...new Set(roots.flatMap((root) => root
        ? [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll<HTMLElement>(selector)] : []))]
        .filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
      // The note is portaled after the board in DOM order. Traverse the complete
      // allowed ring explicitly so native Tab cannot cross into the paused board.
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = currentIndex < 0 ? (event.shiftKey ? focusable.length - 1 : 0)
        : (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[nextIndex].focus();
    };
    const pointerDown = (event: PointerEvent) => {
      const target = event.target;
      const inRuntime = target instanceof Element && (
        dialog.current?.contains(target) || target.closest('[data-canvas-layer="floating-overlay"]')
      );
      const switchesNote = target instanceof Element && target.closest('[data-board-note-switch="true"]');
      const inStaging = target instanceof Element
        && target.closest('[data-board-staging="true"], [data-board-staging-control="true"]');
      if (!pending.current && !stagingPending.current && (inRuntime || switchesNote || inStaging)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    };
    const click = (event: MouseEvent) => {
      const target = event.target;
      if (stagingPending.current) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (target instanceof Element && (dialog.current?.contains(target)
        || target.closest('[data-canvas-layer="floating-overlay"], [data-board-note-switch="true"], [data-board-staging="true"], [data-board-staging-control="true"]'))) return;
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
  }, [requestClose, stagingOpen]);

  return createPortal(<div className={`${styles.backdrop} ${stagingOpen ? styles.withStaging : ''}`} data-board-note-staging-open={stagingOpen}>
    <div className={styles.dialog} role="dialog" aria-modal={!stagingOpen} aria-label="Open note" tabIndex={-1} ref={dialog}
      style={position ? { left: position.left, top: position.top } : undefined}>
      <header className={`${styles.header} ${dragging ? styles.dragging : ''}`} data-note-dialog-drag-handle="true"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
        <span>Open note</span>
        <span className={styles.status} role="status">{saving ? 'Saving…' : ''}</span>
        <button type="button" disabled={saving} onMouseDown={(event) => event.preventDefault()}
          onClick={() => { void requestClose({ kind: 'page', noteId }); }}><ExternalLink size={16} />Open full page</button>
        <button type="button" className={styles.closeNote} aria-label="Close note" disabled={saving} onMouseDown={(event) => event.preventDefault()}
          onClick={() => { void requestClose(); }}><X size={18} /></button>
      </header>
      {failed && <div className={styles.error} role="alert">
        <span>Changes could not be saved. Review the save error and try again, or close anyway.</span>
        <button type="button" onClick={() => complete(failedDestination.current)}>Close anyway</button>
      </div>}
      <div className={styles.content} aria-busy={saving} data-app-main-scroll="true">
        <NoteCanvasRuntimeProvider noteId={noteId} hostMode="modal" onSendToStaging={onSendToStaging ? sendToStaging : undefined}
          stagingItemDrop={saving ? undefined : stagingItemDrop}>
          <NoteCanvasRuntime ref={runtime} onRequestClose={() => { void requestClose(); }} />
        </NoteCanvasRuntimeProvider>
      </div>
    </div>
  </div>, document.body);
});

export default BoardNoteModal;
