import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export interface TextUnitDropTarget { unitId: string; edge: 'before' | 'after' }
export interface CrossBlockUnitDropTarget extends TextUnitDropTarget { blockId: string }
interface Options {
  editorRef: RefObject<HTMLDivElement>;
  disabled: boolean;
  isComposing: () => boolean;
  onReorder: (unitId: string, target: TextUnitDropTarget) => void;
  onExtract?: (unitId: string, point: { x: number; y: number }) => void;
  onMove?: (unitId: string, target: CrossBlockUnitDropTarget) => void;
  onCrossBlockTargetChange?: (target: CrossBlockUnitDropTarget | null) => void;
}

/** The source owns the gesture; the writing surface owns cross-block feedback. */
export function useTextUnitHandleDrag(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const cleanupRef = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const [dropTarget, setDropTarget] = useState<TextUnitDropTarget | null>(null);
  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
  const blocked = () => latest.current.disabled || latest.current.isComposing()
    || Boolean(document.querySelector('[data-runtime-textflow-composing="true"]'));

  useEffect(() => () => cleanupRef.current?.(), []);
  useEffect(() => { if (options.disabled) cleanupRef.current?.(); }, [options.disabled]);

  const start = (unitId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    event.stopPropagation();
    cleanupRef.current?.();
    suppressClick.current = false;
    if (blocked()) return;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    const targetAt = (x: number, y: number): CrossBlockUnitDropTarget | null => {
      const editor = latest.current.editorRef.current;
      if (!editor) return null;
      const hit = document.elementFromPoint?.(x, y);
      const hitEditor = hit?.closest<HTMLElement>('[data-text-unit-editor]');
      const destination = hitEditor ?? editor;
      if (destination !== editor) {
        const surface = editor.closest('[data-text-unit-move-scope]');
        if (!latest.current.onMove || !surface || destination.closest('[data-text-unit-move-scope]') !== surface
          || destination.dataset.textUnitMoveEnabled !== 'true') return null;
      }
      const bounds = destination.getBoundingClientRect();
      const scale = bounds.width / (destination.offsetWidth || bounds.width || 1);
      // Include the existing gutter and a small end-of-block insertion strip.
      if (x < bounds.left - 24 * scale || x > bounds.right
        || y < bounds.top - 8 * scale || y > bounds.bottom + 8 * scale) return null;
      const rows = Array.from(destination.querySelectorAll<HTMLElement>('[data-text-unit-row]'));
      const next = rows.find((row) => { const rect = row.getBoundingClientRect(); return y < rect.top + rect.height / 2; });
      const row = next ?? rows[rows.length - 1];
      return row ? { blockId: destination.dataset.textUnitEditor!, unitId: row.dataset.textUnitRow!, edge: next ? 'before' : 'after' } : null;
    };
    const cleanup = () => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', finish, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('compositionstart', cancel, true);
      window.removeEventListener('blur', cancel);
      cleanupRef.current = null;
      setDropTarget(null);
      latest.current.onCrossBlockTargetChange?.(null);
      setDraggingUnitId(null);
    };
    const cancel = () => { suppressClick.current = true; cleanup(); };
    const keydown = (native: KeyboardEvent) => { if (native.key === 'Escape') { native.preventDefault(); cancel(); } };
    const move = (native: PointerEvent) => {
      if (native.pointerId !== pointerId) return;
      if (blocked()) { cancel(); return; }
      if (!dragging && Math.hypot(native.clientX - startX, native.clientY - startY) < 5) return;
      dragging = true;
      suppressClick.current = true;
      native.preventDefault();
      native.stopPropagation();
      setDraggingUnitId(unitId);
      const target = targetAt(native.clientX, native.clientY);
      const crossBlock = target && target.blockId !== latest.current.editorRef.current?.dataset.textUnitEditor;
      setDropTarget(crossBlock ? null : target);
      latest.current.onCrossBlockTargetChange?.(crossBlock ? target : null);
    };
    const finish = (native: PointerEvent) => {
      if (native.pointerId !== pointerId) return;
      const canDrop = dragging && !blocked();
      const target = targetAt(native.clientX, native.clientY);
      cleanup();
      if (!canDrop) return;
      native.preventDefault();
      native.stopPropagation();
      if (target && target.blockId !== latest.current.editorRef.current?.dataset.textUnitEditor) latest.current.onMove?.(unitId, target);
      else if (target) latest.current.onReorder(unitId, target);
      else latest.current.onExtract?.(unitId, { x: native.clientX, y: native.clientY });
    };
    cleanupRef.current = cleanup;
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', finish, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('compositionstart', cancel, true);
    window.addEventListener('blur', cancel);
  };
  return { start, dropTarget, draggingUnitId, canOpenMenu: () => {
    const suppressed = suppressClick.current;
    suppressClick.current = false;
    return !blocked() && !suppressed;
  } };
}
