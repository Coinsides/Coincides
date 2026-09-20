import type { PointerEvent } from 'react';
import type { PageFrameModel } from '../types';
import { getPagePaperDimensions } from '../paperSizeService';
import styles from './PagePaperSizeHandle.module.css';

export function PagePaperSizeHandle({ frame, onPointerDown }: {
  frame: PageFrameModel;
  onPointerDown: (event: PointerEvent<HTMLElement>, frameId: string) => void;
}) {
  const size = getPagePaperDimensions(frame, 'cm');
  return <button type="button" className={styles.handle} data-page-paper-resize={frame.id}
    aria-label="拖调此页尺寸" title={`${size.width.toFixed(2)} × ${size.height.toFixed(2)} 厘米；也可在笔记外观中输入尺寸`}
    style={{ left: frame.x + frame.width - 18, top: frame.y + frame.height - 18 }}
    onPointerDown={(event) => onPointerDown(event, frame.id)}
    onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
    onDoubleClick={(event) => event.stopPropagation()}>
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 11 11 3M7 11h4V7" fill="none" stroke="currentColor" /></svg>
  </button>;
}
