import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { BoardSticky } from './boardTypes';
import styles from './Boards.module.css';

/** Measure at the requested width before storing geometry; offsetHeight ignores board zoom. */
export function measureStickyWidth(card: HTMLElement | null, width: number): number | undefined {
  const body = card?.querySelector('p');
  if (!card?.parentElement || !body) return undefined;
  const probe = card.cloneNode(false) as HTMLElement;
  probe.removeAttribute('data-testid');
  probe.removeAttribute('id');
  Object.assign(probe.style, { width: `${width}px`, minHeight: `${width === 240 ? 240 : 120}px`, visibility: 'hidden', pointerEvents: 'none' });
  probe.append(body.cloneNode(true));
  card.parentElement.append(probe);
  try { return probe.offsetHeight || undefined; } finally { probe.remove(); }
}

/** A board resident, with no note, Item, or casting action. */
export function BoardStickyCard({ sticky, selected, editing, pending, binding, emphasis, children,
  onSelect, onPointerDown, onEdit, onSave, onCancel, onMeasure }: {
  sticky: BoardSticky; selected: boolean; editing: boolean; pending: boolean; binding: boolean;
  emphasis: Record<string, unknown> & { className: string }; children?: ReactNode;
  onSelect: () => void; onPointerDown: (event: PointerEvent) => void; onEdit: () => void;
  onSave: (text: string, height: number) => Promise<boolean>; onCancel: () => void;
  onMeasure: (sticky: BoardSticky, height: number) => void;
}) {
  const [text, setText] = useState(sticky.text);
  const [height, setHeight] = useState(sticky.h);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const composing = useRef(false);
  useLayoutEffect(() => { if (editing) { setText(sticky.text); setFailed(false); } }, [editing, sticky.id]);
  useLayoutEffect(() => {
    if (!editing || !input.current) return;
    input.current.style.height = '0px';
    const next = Math.max(sticky.w === 240 ? 240 : 120, input.current.scrollHeight + 34);
    input.current.style.height = `${next - 34}px`;
    setHeight(next);
  }, [text, editing, sticky.w]);
  useLayoutEffect(() => {
    const node = body.current;
    if (editing || !node) return;
    const measure = () => {
      if (node.offsetHeight) onMeasure(sticky, Math.max(sticky.w === 240 ? 240 : 120, node.offsetHeight + 34));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [editing, sticky.id, sticky.text, sticky.w, onMeasure]);
  async function save() {
    if (pending || composing.current) return;
    setFailed(!await onSave(text, height));
  }
  return <article {...emphasis} data-testid={`board-sticky-${sticky.id}`} data-board-sticky="true"
    data-weight={sticky.weight} data-accent={sticky.color_index === 1 ? 'primary' : 'neutral'}
    data-binding-preview={binding || undefined}
    className={`${styles.stickyCard} ${selected ? styles.selected : ''} ${emphasis.className}`}
    style={{ left: sticky.x, top: sticky.y, width: sticky.w, minHeight: editing ? height : sticky.h, zIndex: sticky.z_index }}
    tabIndex={editing ? undefined : 0} aria-label={`Sticky: ${sticky.text.split('\n')[0] || 'Empty sticky'}`}
    onFocus={() => { if (!editing) onSelect(); }}
    onPointerDown={(event) => { if (editing) event.stopPropagation(); else onPointerDown(event); }}
    onDoubleClick={(event) => { event.stopPropagation(); if (!editing) onEdit(); }}>
    {editing ? <>
      <textarea ref={input} aria-label="Sticky text" autoFocus value={text} readOnly={pending} maxLength={12000}
        onChange={(event) => { setText(event.currentTarget.value); setFailed(false); }}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing || composing.current) return;
          if (event.key === 'Escape') { event.preventDefault(); if (!pending) onCancel(); }
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void save(); }
        }} />
      <div className={styles.stickyEditActions}>
        {failed && <span role="alert">Could not save. Your draft is still here.</span>}
        <button className={styles.button} disabled={pending} onClick={() => { void save(); }}>Save sticky</button>
        <button className={styles.button} disabled={pending} onClick={onCancel}>Cancel</button>
      </div>
    </> : <><p ref={body}>{sticky.text || 'Double-click to write'}</p>{children}</>}
  </article>;
}
