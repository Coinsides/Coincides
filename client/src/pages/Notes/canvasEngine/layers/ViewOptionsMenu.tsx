import { Check, Scan } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { PageReadingGear } from '../pageReadingViewportService';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import noteStyles from '../../NoteDetail.module.css';
import styles from './ViewOptionsMenu.module.css';

export interface ViewOptionsMenuProps {
  open: boolean;
  disabled?: boolean;
  activeGear: PageReadingGear;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (gear: PageReadingGear) => void;
}

const OPTIONS = [
  ['fit_width', 'Fit width'],
  ['fit_page', 'Fit page'],
  ['physical', '100% physical'],
] as const;

export function ViewOptionsMenu({ open, disabled = false, activeGear, onToggle, onClose, onSelect }: ViewOptionsMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ right: 12, bottom: 64 });

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const measure = () => {
      const rect = trigger?.getBoundingClientRect();
      if (rect) setAnchor({
        right: Math.max(12, Math.min(window.innerWidth - 212, window.innerWidth - rect.right)),
        bottom: Math.max(12, window.innerHeight - rect.top + 8),
      });
    };
    measure();
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (trigger) observer?.observe(trigger);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)
        && !triggerRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [open, onClose]);

  useEffect(() => {
    if (open && disabled) onClose();
  }, [disabled, onClose, open]);

  const closeAndFocusTrigger = () => {
    onClose();
    triggerRef.current?.focus();
  };
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocusTrigger();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  return <>
    <button ref={triggerRef} type="button"
      className={`${noteStyles.canvasZoomReset} ${styles.trigger}`}
      title="View options" aria-label="View options" aria-haspopup="menu"
      aria-expanded={open} aria-controls={open ? menuId : undefined}
      data-page-reading-view-options="true" disabled={disabled}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        if (!open) onToggle();
        else menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
      }}>
      <Scan size={16} aria-hidden="true" />
    </button>
    <FloatingOverlayLayer open={open && !disabled} placement="free">
      <div ref={menuRef} id={menuId} className={styles.menu} role="menu" aria-label="View options"
        data-page-reading-view-menu="true"
        style={{ ...anchor, maxHeight: Math.max(80, window.innerHeight - anchor.bottom - 12) }}
        onKeyDown={handleMenuKeyDown}
        onBlur={(event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)
            && !triggerRef.current?.contains(event.relatedTarget)) onClose();
        }}>
        {OPTIONS.map(([gear, label]) => <button key={gear} type="button" className={styles.option}
          role="menuitemradio" aria-checked={activeGear === gear} data-page-reading-select={gear}
          onClick={() => { onSelect(gear); closeAndFocusTrigger(); }}>
          <span className={styles.check} aria-hidden="true">{activeGear === gear && <Check size={14} />}</span>
          <span>{label}</span>
        </button>)}
      </div>
    </FloatingOverlayLayer>
  </>;
}
