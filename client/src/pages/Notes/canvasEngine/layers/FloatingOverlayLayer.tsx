import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../NoteDetail.module.css';

interface FloatingOverlayLayerProps {
  children: ReactNode;
  open: boolean;
  placement?: 'topRight' | 'free';
}

export function FloatingOverlayLayer({
  children,
  open,
  placement = 'topRight',
}: FloatingOverlayLayerProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.floatingOverlayPortal} data-canvas-layer="floating-overlay">
      {placement === 'free' ? (
        children
      ) : (
        <div className={styles.floatingOverlayStack}>
          {children}
        </div>
      )}
    </div>,
    document.body,
  );
}
