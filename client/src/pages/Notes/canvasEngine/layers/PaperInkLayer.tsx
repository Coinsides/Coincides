import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clipPaperInkPoint, createPaperFreehand, paperFreehandPath, paperFreehandStyle, type PaperInkTool } from '../freehandService';
import type { CanvasObject, CanvasPlacement, CanvasPoint, PageFrameModel } from '../types';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import { PaperInkSvg } from './PaperInkSvg';
import styles from '../../NoteDetail.module.css';

type Gesture = { pointerId: number; tool: 'pen'; points: CanvasPoint[] }
  | { pointerId: number; tool: 'eraser'; ids: Set<string>; previous: CanvasPoint };

/** A sheet owns its captured gesture until release; adjacent sheets cannot adopt it. */
export function PaperInkLayer({ frame, displayFrame, objects, placements, canvasId, tool, onCreate, onDelete }: {
  frame: PageFrameModel; displayFrame: PageFrameModel; objects: CanvasObject[]; placements: CanvasPlacement[];
  canvasId: string; tool: PaperInkTool;
  onCreate: NoteWritingSurfaceLayerProps['onPersistCanvasObject'];
  onDelete: NoteWritingSurfaceLayerProps['onDeleteCanvasObject'];
}) {
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [ink, setInk] = useState<CanvasPoint[]>([]);
  const [erased, setErased] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const style = paperFreehandStyle({});

  const cancel = () => {
    const current = gesture.current;
    gesture.current = null;
    if (current && host.current?.hasPointerCapture?.(current.pointerId)) host.current.releasePointerCapture(current.pointerId);
    setInk([]);
    setErased(new Set());
  };
  useEffect(() => { cancel(); }, [tool, frame.id, frame.width, frame.height]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) { event.preventDefault(); cancel(); }
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('keydown', escape); window.removeEventListener('blur', cancel); };
  }, []);

  function point(event: { clientX: number; clientY: number }): CanvasPoint {
    const rect = host.current!.getBoundingClientRect();
    return clipPaperInkPoint({ x: (event.clientX - rect.left) * frame.width / rect.width,
      y: (event.clientY - rect.top) * frame.height / rect.height }, frame);
  }

  function append(event: { clientX: number; clientY: number }) {
    const current = gesture.current;
    if (current?.tool !== 'pen') return;
    const next = point(event);
    const previous = current.points[current.points.length - 1];
    if (next.x !== previous.x || next.y !== previous.y) current.points.push(next);
    setInk([...current.points]);
  }

  function erase(event: { clientX: number; clientY: number }) {
    const current = gesture.current;
    if (current?.tool !== 'eraser') return;
    const previous = current.previous;
    const dx = event.clientX - previous.x; const dy = event.clientY - previous.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
    const rect = host.current!.getBoundingClientRect();
    // Like board ink: test the stroke, including captured pointer sweeps, not its bounding box.
    host.current?.querySelectorAll<SVGPathElement>('[data-paper-ink-hit]').forEach((path) => {
      if (current.ids.has(path.dataset.paperInkHit!) || !path.isPointInStroke || !path.getScreenCTM) return;
      const matrix = path.getScreenCTM();
      if (!matrix) return;
      const inverse = matrix.inverse();
      for (let step = 0; step <= steps; step += 1) {
        const x = previous.x + dx * step / steps; const y = previous.y + dy * step / steps;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
        if (path.isPointInStroke(new DOMPoint(x, y).matrixTransform(inverse))) {
          current.ids.add(path.dataset.paperInkHit!); break;
        }
      }
    });
    current.previous = { x: event.clientX, y: event.clientY };
    setErased(new Set(current.ids));
  }

  function begin(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool === 'write' || busy.current || gesture.current || event.button !== 0 || event.isPrimary === false) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.preventDefault(); event.stopPropagation();
    setError(null);
    event.currentTarget.focus({ preventScroll: true });
    gesture.current = tool === 'pen'
      ? { pointerId: event.pointerId, tool, points: [point(event)] }
      : { pointerId: event.pointerId, tool, ids: new Set(), previous: { x: event.clientX, y: event.clientY } };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (tool === 'pen') setInk([point(event)]); else erase(event);
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    if (gesture.current.tool === 'pen') append(event); else erase(event);
  }

  async function end(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    if (current.tool === 'pen') append(event); else erase(event);
    gesture.current = null;
    if (host.current?.hasPointerCapture?.(event.pointerId)) host.current.releasePointerCapture(event.pointerId);
    busy.current = true; setSaving(true);
    try {
      if (current.tool === 'pen') {
        const projection = createPaperFreehand({ frame, points: current.points, canvasId,
          objectId: `paper-ink:${crypto.randomUUID()}`, zIndex: Math.max(0, ...placements.map((p) => p.zIndex)) + 1 });
        if (!await onCreate({ ...projection, contentMounts: [] })) throw new Error('save');
      } else {
        for (const id of current.ids) if (!await onDelete(id)) throw new Error('erase');
      }
    } catch {
      setError(current.tool === 'pen' ? 'Stroke could not be saved. Please draw it again.' : 'Stroke could not be erased. Please try again.');
    } finally {
      setInk([]); setErased(new Set()); busy.current = false; setSaving(false);
    }
  }

  return <div ref={host} data-paper-ink-layer={frame.id} data-paper-ink-tool={tool}
    tabIndex={-1} className={styles.paperInkLayer}
    style={{ left: displayFrame.x, top: displayFrame.y, width: frame.width, height: frame.height,
      pointerEvents: tool === 'write' ? 'none' : 'auto', touchAction: tool === 'write' ? 'auto' : 'none',
      cursor: saving ? 'wait' : tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'cell' : undefined }}
    onPointerDown={begin} onPointerMove={move} onPointerUp={(event) => { void end(event); }}
    onPointerCancel={cancel} onLostPointerCapture={() => { if (gesture.current) cancel(); }}
    onMouseDown={(event) => { if (tool !== 'write') { event.preventDefault(); event.stopPropagation(); } }}
    onDoubleClick={(event) => { if (tool !== 'write') event.stopPropagation(); }}
    onContextMenu={(event) => { if (tool !== 'write') { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
    <PaperInkSvg frame={frame} objects={objects.filter((object) => !erased.has(object.objectId))}
      placements={placements} hitTest={tool === 'eraser'} />
    {ink.length > 0 && <svg data-paper-ink-preview="true" viewBox={`0 0 ${frame.width} ${frame.height}`}
      width={frame.width} height={frame.height} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <path d={paperFreehandPath({ points: ink })} fill="none" stroke={style.color} strokeWidth={style.width}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>}
    {error && <p role="alert" className={styles.paperInkError}>{error}</p>}
  </div>;
}
