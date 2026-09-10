import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

interface DropTarget { unitId: string; edge: 'before' | 'after' }
interface Options {
  editorRef: RefObject<HTMLDivElement>;
  disabled: boolean;
  isComposing: () => boolean;
  onReorder: (unitId: string, target: DropTarget) => void;
  onExtract?: (unitId: string, point: { x: number; y: number }) => void;
}

/** A pointer gesture belongs to its source editor; other blocks never accept its units. */
export function useTextUnitHandleDrag(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const cleanupRef = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
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
    const targetAt = (x: number, y: number): DropTarget | null => {
      const editor = latest.current.editorRef.current;
      if (!editor) return null;
      const hitEditor = document.elementFromPoint?.(x, y)?.closest('[data-text-unit-editor]');
      if (hitEditor && hitEditor !== editor) return null;
      const bounds = editor.getBoundingClientRect();
      const scale = bounds.width / (editor.offsetWidth || bounds.width || 1);
      // Include the existing gutter and a small end-of-block insertion strip.
      if (x < bounds.left - 24 * scale || x > bounds.right
        || y < bounds.top - 8 * scale || y > bounds.bottom + 8 * scale) return null;
      const rows = Array.from(editor.querySelectorAll<HTMLElement>('[data-text-unit-row]'));
      const next = rows.find((row) => { const rect = row.getBoundingClientRect(); return y < rect.top + rect.height / 2; });
      const row = next ?? rows[rows.length - 1];
      return row ? { unitId: row.dataset.textUnitRow!, edge: next ? 'before' : 'after' } : null;
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
      setDropTarget(targetAt(native.clientX, native.clientY));
    };
    const finish = (native: PointerEvent) => {
      if (native.pointerId !== pointerId) return;
      const canDrop = dragging && !blocked();
      const target = targetAt(native.clientX, native.clientY);
      cleanup();
      if (!canDrop) return;
      native.preventDefault();
      native.stopPropagation();
      if (target) latest.current.onReorder(unitId, target);
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
