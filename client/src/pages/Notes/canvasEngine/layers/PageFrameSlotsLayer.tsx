import type { CSSProperties } from 'react';
import { listPageFrameSlots } from '../pageFrameSlotService';
import type { PageFrameSlots } from '../types';
import styles from '../../NoteDetail.module.css';

/** One renderer for reading, thumbnails and print; positions are already projected. */
export function PageFrameSlotsLayer({ slots, offsetX = 0, offsetY = 0 }: {
  slots?: PageFrameSlots; offsetX?: number; offsetY?: number;
}) {
  return <>{listPageFrameSlots(slots).filter((slot) => slot.enabled).map((slot) => {
    const override = slot.style;
    const families = { skin: 'var(--sk-label-font, var(--document-font-family, sans-serif))',
      serif: 'Georgia, serif', sans: 'Arial, sans-serif', mono: 'monospace' };
    const style: CSSProperties = { left: slot.rect.x + offsetX, top: slot.rect.y + offsetY,
      width: slot.rect.width, height: slot.rect.height, textAlign: slot.align,
      justifyContent: slot.align === 'left' ? 'flex-start' : slot.align === 'right' ? 'flex-end' : 'center',
      fontFamily: families[override?.fontFamily ?? 'skin'],
      fontSize: override?.fontSize, fontWeight: override?.fontWeight,
      fontStyle: override?.italic ? 'italic' : undefined,
      color: override?.colorToken ? `var(--sk-${override.colorToken})` : undefined };
    const kindClass = slot.kind === 'header' ? styles.pageFrameHeaderSlot
      : slot.kind === 'footer' ? styles.pageFrameFooterSlot : styles.pageFramePageNumberSlot;
    return <div key={slot.slotId} className={`${styles.pageFrameSlot} ${kindClass}`}
      data-page-frame-slot={slot.kind === 'page_number' ? 'page-number' : slot.kind}
      data-page-frame-slot-position={slot.position} data-page-frame-slot-frame={slot.frameId}
      data-page-frame-slot-source={slot.textSource} data-page-frame-slot-enabled="true"
      data-binding-section={slot.bindingSectionId} data-mechanical-page={slot.mechanicalPageNumber}
      style={style}>{slot.text ? <span>{slot.text}</span> : null}</div>;
  })}</>;
}
