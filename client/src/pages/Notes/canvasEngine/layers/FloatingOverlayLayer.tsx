import { type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../NoteDetail.module.css';
import { usePaperSkin } from '../PaperSkinContext';

interface FloatingOverlayLayerProps {
  children: ReactNode;
  open: boolean;
  placement?: 'topRight' | 'free';
  portalClassName?: string;
  portalStyle?: CSSProperties;
}

export function FloatingOverlayLayer({
  children,
  open,
  placement = 'topRight',
  portalClassName,
  portalStyle,
}: FloatingOverlayLayerProps) {
  const skin = usePaperSkin();
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={[styles.floatingOverlayPortal, portalClassName].filter(Boolean).join(' ')}
      data-canvas-layer="floating-overlay"
      data-note-skin-preset={skin?.materialPreset ?? skin?.preset}
      style={{ ...skin?.style, ...portalStyle }}
    >
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
