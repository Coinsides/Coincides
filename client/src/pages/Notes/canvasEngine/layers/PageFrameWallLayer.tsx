import type { CSSProperties, PointerEvent } from 'react';
import type { PageFrameModel } from '../types';
import { createPageFrameGuides } from '../pageFrameGuideService';
import styles from './PageFrameWallLayer.module.css';

export type PageFrameWallSide = 'left' | 'right';
export interface ActivePageFrameWall {
  frameId: string;
  side: PageFrameWallSide;
}

interface PageFrameWallLayerProps {
  /** Already projected into the writing surface's content coordinate space. */
  frame: PageFrameModel;
  /** Cover height affects idle paint only; the live margin target stays put. */
  idleHeaderHeight?: number;
  activeWall?: ActivePageFrameWall | null;
  interactive?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLElement>, frameId: string, side: PageFrameWallSide) => void;
}

export function PageFrameWallLayer({ frame, idleHeaderHeight = 0, activeWall, interactive = true, onPointerDown }: PageFrameWallLayerProps) {
  const guides = createPageFrameGuides(frame);
  return <>{(['left', 'right'] as const).map((side) => {
    const guide = side === 'left' ? guides.leftMargin : guides.rightMargin;
    const active = interactive && activeWall?.frameId === frame.id && activeWall.side === side;
    return (
      <div
        key={side}
        role={interactive ? 'separator' : undefined}
        aria-label={interactive ? `${side === 'left' ? 'Left' : 'Right'} page margin` : undefined}
        aria-orientation={interactive ? 'vertical' : undefined}
        aria-hidden={interactive ? undefined : true}
        className={styles.wall}
        data-page-frame-wall-interactive={interactive ? 'true' : 'false'}
        data-page-frame-wall={side}
        data-page-frame-wall-frame={frame.id}
        data-page-frame-wall-active={active ? 'true' : 'false'}
        style={{ left: guide.x, top: guide.y, height: guide.length,
          '--paper-wall-idle-top': `${-frame.contentInset.top - idleHeaderHeight}px`,
        } as CSSProperties}
        onPointerDown={interactive ? (event) => onPointerDown?.(event, frame.id, side) : undefined}
        onMouseDown={interactive ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined}
        onDoubleClick={interactive ? (event) => event.stopPropagation() : undefined}
        onContextMenu={interactive ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined}
      >
        <span className={styles.line} aria-hidden="true" />
      </div>
    );
  })}</>;
}
