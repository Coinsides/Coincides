import { Plus } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { NOTE_INSERT_COMMANDS, type NoteInsertAction } from '../../noteSlashCommands';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import noteStyles from '../../NoteDetail.module.css';
import styles from './ViewOptionsMenu.module.css';

export function NoteInsertMenu({ disabledReason, onSelect }: {
  disabledReason: (action: NoteInsertAction) => string | undefined;
  onSelect: (action: NoteInsertAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ right: 12, bottom: 64 });
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setAnchor({ right: Math.max(12, Math.min(window.innerWidth - 212, window.innerWidth - rect.right)),
        bottom: Math.max(12, window.innerHeight - rect.top + 8) });
    };
    measure();
    (menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? menuRef.current)?.focus();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)
        && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <>
    <button type="button" ref={triggerRef} className={noteStyles.canvasZoomReset} aria-label="插入" title="插入"
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      }}><Plus size={14} aria-hidden="true" /><span>插入</span></button>
    <FloatingOverlayLayer open={open} placement="free">
      <div ref={menuRef} id={menuId} className={styles.menu} role="menu" aria-label="插入" tabIndex={-1}
        data-note-insert-menu="true" style={{ ...anchor, maxHeight: Math.max(80, window.innerHeight - anchor.bottom - 12) }}
        onBlur={(event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)
            && !triggerRef.current?.contains(event.relatedTarget)) close();
        }} onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }}>
        {NOTE_INSERT_COMMANDS.map((command) => {
          const reason = disabledReason(command.insertAction!);
          return <button key={command.id} type="button" className={styles.option} role="menuitem"
            disabled={Boolean(reason)} title={reason ?? command.tooltip ?? command.label} data-note-insert-command={command.id}
            onClick={() => { close(true); onSelect(command.insertAction!); }}>{command.label}</button>;
        })}
      </div>
    </FloatingOverlayLayer>
  </>;
}
