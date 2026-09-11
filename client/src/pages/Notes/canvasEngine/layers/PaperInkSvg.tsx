import { Fragment } from 'react';
import { PAPER_INK_HIT_WIDTH, paperFreehandPath, paperFreehandStyle, readPaperFreehandData } from '../freehandService';
import type { CanvasObject, CanvasPlacement, PageFrameModel } from '../types';

export interface PaperInkSvgProps {
  frame: PageFrameModel;
  objects: readonly CanvasObject[];
  placements: readonly CanvasPlacement[];
  print?: boolean;
  hitTest?: boolean;
  selectedObjectId?: string | null;
}

/** The same page-local ink geometry is used by writing, overview and print. */
export function PaperInkSvg({ frame, objects, placements, print = false, hitTest = false, selectedObjectId }: PaperInkSvgProps) {
  const objectsById = new Map(objects.filter((object) => object.kind === 'freehand' && object.status === 'active')
    .map((object) => [object.objectId, object]));
  const strokes = placements
    .filter((placement) => placement.frameId === frame.id && placement.surface === 'formal_page'
      && placement.renderVisibility !== 'hidden' && placement.renderVisibility !== 'collapsed'
      && (!print || placement.visibilityState !== 'export_hidden'))
    .map((placement) => {
      const object = objectsById.get(placement.objectId);
      const data = object ? readPaperFreehandData(object) : null;
      return data ? { placement, data } : null;
    })
    .filter((stroke) => stroke !== null)
    .sort((first, second) => first.placement.zIndex - second.placement.zIndex);

  if (strokes.length === 0) return null;

  return <svg
    data-paper-ink-svg="true"
    data-page-frame-id={frame.id}
    data-note-print-ink={print ? 'true' : undefined}
    aria-hidden="true"
    focusable="false"
    width={frame.width}
    height={frame.height}
    viewBox={`0 0 ${frame.width} ${frame.height}`}
    style={{ position: 'absolute', left: 0, top: 0, width: frame.width, height: frame.height, overflow: 'hidden', pointerEvents: 'none', zIndex: 4 }}
  >
    {strokes.map(({ placement, data }) => {
      const style = paperFreehandStyle(data);
      const path = paperFreehandPath(data);
      const transform = `translate(${placement.x - frame.x} ${placement.y - frame.y}) rotate(${placement.rotation || 0} ${placement.width / 2} ${placement.height / 2})`;
      return <Fragment key={placement.placementId}>
        {!print && selectedObjectId === placement.objectId && <path
          data-paper-ink-selected={placement.objectId} d={path} transform={transform}
          fill="none" stroke="var(--accent-primary)" strokeWidth={style.width + 6}
          strokeOpacity={0.8} strokeLinecap="round" strokeLinejoin="round" />}
        <path
          data-paper-ink-id={placement.objectId}
          d={path}
          transform={transform}
          fill="none"
          stroke={style.color}
          strokeWidth={style.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hitTest && !print && <path
          data-paper-ink-hit={placement.objectId}
          data-paper-ink-width={style.width}
          d={path}
          transform={transform}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(PAPER_INK_HIT_WIDTH, style.width)}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />}
      </Fragment>;
    })}
  </svg>;
}
