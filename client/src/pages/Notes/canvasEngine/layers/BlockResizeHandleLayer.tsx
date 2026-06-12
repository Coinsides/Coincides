import type { PointerEvent as ReactPointerEvent } from 'react';
import styles from '../../NoteDetail.module.css';

interface BlockResizeHandleLayerProps {
  onBeginResize: (event: ReactPointerEvent<HTMLElement>) => void;
}

export function BlockResizeHandleLayer({
  onBeginResize,
}: BlockResizeHandleLayerProps) {
  return (
    <div
      className={styles.resizeHandleRight}
      onPointerDown={onBeginResize}
      title="Resize block"
      aria-label="Resize block"
    />
  );
}
