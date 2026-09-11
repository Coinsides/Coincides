import type { PointerEvent } from 'react';
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
  activeWall?: ActivePageFrameWall | null;
  onPointerDown: (event: PointerEvent<HTMLElement>, frameId: string, side: PageFrameWallSide) => void;
}

export function PageFrameWallLayer({ frame, activeWall, onPointerDown }: PageFrameWallLayerProps) {
  const guides = createPageFrameGuides(frame);
  return <>{(['left', 'right'] as const).map((side) => {
    const guide = side === 'left' ? guides.leftMargin : guides.rightMargin;
    const active = activeWall?.frameId === frame.id && activeWall.side === side;
    return (
      <div
        key={side}
        role="separator"
        aria-label={`${side === 'left' ? 'Left' : 'Right'} page margin`}
        aria-orientation="vertical"
        className={styles.wall}
        data-page-frame-wall={side}
        data-page-frame-wall-frame={frame.id}
        data-page-frame-wall-active={active ? 'true' : 'false'}
        style={{ left: guide.x, top: guide.y, height: guide.length }}
        onPointerDown={(event) => onPointerDown(event, frame.id, side)}
        onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
      >
        <span className={styles.line} aria-hidden="true" />
      </div>
    );
  })}</>;
}
