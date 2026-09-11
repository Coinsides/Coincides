import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clipPaperInkPoint, createPaperFreehand, hitTestPaperInk, paperFreehandPath, paperFreehandSavePayload, paperFreehandStyle, type PaperInkTool } from '../freehandService';
import type { CanvasObject, CanvasPlacement, CanvasPoint, PageFrameModel } from '../types';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import { PaperInkSvg } from './PaperInkSvg';
import styles from '../../NoteDetail.module.css';

type Gesture = { pointerId: number; tool: 'pen'; points: CanvasPoint[] }
  | { pointerId: number; tool: 'eraser'; ids: Set<string>; previous: CanvasPoint }
  | { pointerId: number; tool: 'selection'; start: CanvasPoint; placement: CanvasPlacement; next: CanvasPlacement };

/** A sheet owns its captured gesture until release; adjacent sheets cannot adopt it. */
export function PaperInkLayer({ frame, displayFrame, objects, placements, canvasId, tool, onCreate, onDelete,
  enabled = true, selectedObjectId = null, onSelect = () => {} }: {
  frame: PageFrameModel; displayFrame: PageFrameModel; objects: CanvasObject[]; placements: CanvasPlacement[];
  canvasId: string; tool: PaperInkTool;
  onCreate: NoteWritingSurfaceLayerProps['onPersistCanvasObject'];
  onDelete: NoteWritingSurfaceLayerProps['onDeleteCanvasObject'];
  enabled?: boolean;
  selectedObjectId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [ink, setInk] = useState<CanvasPoint[]>([]);
  const [erased, setErased] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [movePreview, setMovePreview] = useState<CanvasPlacement | null>(null);
  const style = paperFreehandStyle({});

  const cancel = () => {
    const current = gesture.current;
    gesture.current = null;
    if (current && host.current?.hasPointerCapture?.(current.pointerId)) host.current.releasePointerCapture(current.pointerId);
    setInk([]);
    setErased(new Set());
    setMovePreview(null);
  };
  useEffect(() => { cancel(); }, [tool, enabled, frame.id, frame.width, frame.height]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) { event.preventDefault(); cancel(); }
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('keydown', escape); window.removeEventListener('blur', cancel); };
  }, []);

  // Ink stays transparent to pointer routing. Only background hits are claimed;
  // the actual text/media/editor targets keep their existing event semantics.
  useEffect(() => {
    if (!enabled || tool !== 'selection') return;
    const surface = host.current?.closest('[data-text-unit-move-scope]') || host.current?.parentElement;
    if (!surface) return;
    const select = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.defaultPrevented || pointer.button !== 0 || pointer.isPrimary === false || busy.current || gesture.current) return;
      const clearOwnSelection = () => {
        if (placements.some((p) => p.frameId === frame.id && p.objectId === selectedObjectId)) onSelect(null);
      };
      const target = pointer.target;
      if (!(target instanceof Element)) return;
      const blocked = target.closest([
        '[data-note-block-shell="true"]', '[data-draft-editor="true"]', '[data-page-frame-wall]',
        '[data-note-header-band]', '[data-canvas-shape="true"]', '[data-canvas-image="true"]',
        '[data-canvas-table="true"]', '[data-canvas-visual-connector="true"]',
        'textarea', 'input', 'select', 'button', 'a', '[role="button"]', '[role="dialog"]', '[contenteditable]',
      ].join(','));
      // A board may host this whole surface in a dialog; only nested controls
      // are excluded, never the containing note modal itself.
      if (blocked && surface.contains(blocked)) { clearOwnSelection(); return; }
      const objectId = hitTestPaperInk(host.current!, pointer);
      const placement = placements.find((p) => p.objectId === objectId && p.frameId === frame.id);
      if (!placement) { clearOwnSelection(); return; }
      pointer.preventDefault(); pointer.stopImmediatePropagation();
      setError(null);
      onSelect(placement.objectId);
      host.current!.focus({ preventScroll: true });
      gesture.current = { pointerId: pointer.pointerId, tool: 'selection',
        start: { x: pointer.clientX, y: pointer.clientY }, placement, next: placement };
      host.current!.setPointerCapture?.(pointer.pointerId);
    };
    surface.addEventListener('pointerdown', select, true);
    return () => surface.removeEventListener('pointerdown', select, true);
  }, [tool, enabled, frame.id, placements, selectedObjectId, onSelect]);

  function moveSelection(event: { clientX: number; clientY: number }) {
    const current = gesture.current;
    if (current?.tool !== 'selection') return;
    const rect = host.current!.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = event.clientX - current.start.x; const dy = event.clientY - current.start.y;
    // A click does not create a placement edit. Deltas, like canvas object moves,
    // are applied in world space; the existing repository owns local conversion.
    if (current.next === current.placement && Math.hypot(dx, dy) < 3) return;
    current.next = { ...current.placement,
      x: Math.max(frame.x, Math.min(frame.x + frame.width - current.placement.width,
        current.placement.x + dx * frame.width / rect.width)),
      y: Math.max(frame.y, Math.min(frame.y + frame.height - current.placement.height,
        current.placement.y + dy * frame.height / rect.height)) };
    setMovePreview(current.next);
  }

  async function deleteSelection() {
    if (!enabled || tool !== 'selection' || !selectedObjectId || busy.current || gesture.current) return;
    busy.current = true; setSaving(true); setError(null);
    try {
      if (!await onDelete(selectedObjectId)) throw new Error('delete');
      onSelect(null);
    } catch { setError('Stroke could not be deleted. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }

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
    if (!enabled || tool === 'selection' || busy.current || gesture.current || event.button !== 0 || event.isPrimary === false) return;
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
    if (gesture.current.tool === 'selection') moveSelection(event);
    else if (gesture.current.tool === 'pen') append(event); else erase(event);
  }

  async function end(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    if (current.tool === 'selection') moveSelection(event);
    else if (current.tool === 'pen') append(event); else erase(event);
    gesture.current = null;
    if (host.current?.hasPointerCapture?.(event.pointerId)) host.current.releasePointerCapture(event.pointerId);
    busy.current = true; setSaving(true);
    try {
      if (current.tool === 'selection') {
        if (current.next.x !== current.placement.x || current.next.y !== current.placement.y) {
          const canvasObject = objects.find((object) => object.objectId === current.placement.objectId);
          if (!canvasObject || !await onCreate({ canvasObject, placement: current.next, contentMounts: [],
            payload: paperFreehandSavePayload(canvasObject, current.next) })) throw new Error('move');
        }
      } else if (current.tool === 'pen') {
        const projection = createPaperFreehand({ frame, points: current.points, canvasId,
          objectId: `paper-ink:${crypto.randomUUID()}`, zIndex: Math.max(0, ...placements.map((p) => p.zIndex)) + 1 });
        if (!await onCreate({ ...projection, contentMounts: [] })) throw new Error('save');
      } else {
        for (const id of current.ids) if (!await onDelete(id)) throw new Error('erase');
      }
    } catch {
      setError(current.tool === 'selection' ? 'Stroke could not be moved. Please try again.'
        : current.tool === 'pen' ? 'Stroke could not be saved. Please draw it again.' : 'Stroke could not be erased. Please try again.');
    } finally {
      setInk([]); setErased(new Set()); setMovePreview(null); busy.current = false; setSaving(false);
    }
  }

  return <div ref={host} data-paper-ink-layer={frame.id} data-paper-ink-tool={tool}
    tabIndex={-1} className={styles.paperInkLayer} role="group" aria-label="Paper ink"
    style={{ left: displayFrame.x, top: displayFrame.y, width: frame.width, height: frame.height,
      pointerEvents: !enabled || tool === 'selection' ? 'none' : 'auto', touchAction: 'none',
      cursor: saving ? 'wait' : tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'cell' : undefined }}
    onPointerDown={begin} onPointerMove={move} onPointerUp={(event) => { void end(event); }}
    onPointerCancel={cancel} onLostPointerCapture={() => { if (gesture.current) cancel(); }}
    onKeyDown={(event) => {
      if (event.target !== host.current || !enabled || tool !== 'selection') return;
      if (event.key === 'Escape') { event.preventDefault(); cancel(); onSelect(null); }
      if (event.key === 'Delete' && !event.ctrlKey && !event.metaKey && !event.altKey && selectedObjectId) {
        event.preventDefault(); event.stopPropagation(); void deleteSelection();
      }
    }}
    onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
    onDoubleClick={(event) => event.stopPropagation()}
    onContextMenu={(event) => { if (tool !== 'selection') { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
    <PaperInkSvg frame={frame} objects={objects.filter((object) => !erased.has(object.objectId))}
      placements={movePreview ? placements.map((p) => p.placementId === movePreview.placementId ? movePreview : p) : placements}
      selectedObjectId={enabled && tool === 'selection' ? selectedObjectId : null}
      hitTest={enabled && tool !== 'pen'} />
    {ink.length > 0 && <svg data-paper-ink-preview="true" viewBox={`0 0 ${frame.width} ${frame.height}`}
      width={frame.width} height={frame.height} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <path d={paperFreehandPath({ points: ink })} fill="none" stroke={style.color} strokeWidth={style.width}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>}
    {error && <p role="alert" className={styles.paperInkError}>{error}</p>}
  </div>;
}
