import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from '../../NoteDetail.module.css';

export function NoteToolbarGroup({ name, label, children }: {
  name: 'paper' | 'pen' | 'insert' | 'view'; label: string; children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-canvas-layer="floating-overlay"]')) return;
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [expanded]);
  return <div ref={ref} className={styles.noteToolbarGroup} role="group" aria-label={label}
    data-note-toolbar-group={name} data-expanded={expanded} onKeyDown={(event) => {
      if (event.key === 'Escape' && expanded) {
        event.preventDefault(); event.stopPropagation(); setExpanded(false);
        ref.current?.querySelector<HTMLButtonElement>('[data-toolbar-disclosure]')?.focus();
      }
    }}>
    {(name === 'paper' || name === 'view') && <button type="button" className={styles.toolbarGroupDisclosure}
      data-toolbar-disclosure="true" aria-label={label} title={label} aria-expanded={expanded}
      onClick={() => setExpanded((value) => !value)}>{name === 'paper' ? '纸' : '看'}</button>}
    <div className={styles.noteToolbarGroupContent}>{children}</div>
  </div>;
}
