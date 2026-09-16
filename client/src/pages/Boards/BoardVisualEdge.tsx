import { useLayoutEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { boardArcPathOutsideRect, boardLabelRect, pointOnBoardArc, type BoardRect } from '../../../../shared/boardVisualGeometry';
import { boardEdgeArc, edgeEndpoint, endpointCard, type BoardCard } from './boardEdgeView';
import type { BoardEdge } from './boardTypes';
import styles from './Boards.module.css';

export type EdgeDragPart = 'from' | 'to' | 'bend' | 'label';
export function BoardVisualEdge({ edge, cards, selected, selectable, zoom, legacyMarker, emphasis, draft, pending,
  onSelect, onFocus, onEdit, onDrag, onDraft, onSave, onCancel }: {
  edge: BoardEdge; cards: BoardCard[]; selected: boolean; selectable: boolean; zoom: number; legacyMarker: string;
  emphasis: Record<string, unknown> & { className: string }; draft?: string; pending: boolean;
  onSelect: (event: PointerEvent | KeyboardEvent) => void; onFocus: () => void; onEdit: () => void;
  onDrag: (event: PointerEvent, part: EdgeDragPart) => void; onDraft: (text: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const arc = boardEdgeArc(edge, cards);
  const legacy = edge.visual_version !== 1;
  const center = arc ? pointOnBoardArc(arc, edge.label_position ?? .5) : { x: 0, y: 0 };
  const estimate = boardLabelRect(edge.label || '', center);
  const labelRef = useRef<SVGTextElement>(null);
  const [measured, setMeasured] = useState<BoardRect | null>(null);
  useLayoutEffect(() => {
    if (!labelRef.current?.getBBox) return;
    const box = labelRef.current.getBBox();
    if (box.width && box.height) setMeasured({ x: box.x, y: box.y, w: box.width, h: box.height });
  }, [edge.label, center.x, center.y, legacy]);
  if (!arc) return null;
  const from = endpointCard(edgeEndpoint(edge, 'from'), cards);
  const to = endpointCard(edgeEndpoint(edge, 'to'), cards);
  const title = (card?: BoardCard) => card ? 'member_kind' in card ? card.reference.title || 'note' : card.text.split('\n')[0] || 'sticky' : 'free point';
  const weight = edge.weight || 1;
  const color = legacy ? undefined : `var(--board-line-${weight})`;
  const capStart = legacy ? edge.style.direction === 'both' ? 'arrow' : 'none' : edge.cap_start || 'none';
  const capEnd = legacy ? ['forward', 'both'].includes(String(edge.style.direction)) ? 'arrow' : 'none' : edge.cap_end || 'none';
  const marker = (side: string, cap: string) => cap === 'none' ? undefined : `url(#${legacy ? legacyMarker : `board-${edge.id}-${side}-${cap}`})`;
  const path = !legacy && edge.label ? boardArcPathOutsideRect(arc, measured || estimate, 4) : arc.path;
  return <g {...emphasis} data-edge-version={legacy ? 'legacy' : '1'}>
    {!legacy && <defs>{(['start', 'end'] as const).flatMap((side) => [
      <marker key={`${side}-arrow`} id={`board-${edge.id}-${side}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
      </marker>,
      <marker key={`${side}-dot`} id={`board-${edge.id}-${side}-dot`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5">
        <circle cx="5" cy="5" r="4" fill={color} />
      </marker>,
    ])}</defs>}
    <path d={path} data-testid={`board-edge-${edge.id}`} markerStart={legacy ? marker('start', capStart) : undefined} markerEnd={legacy ? marker('end', capEnd) : undefined}
      className={legacy ? selected ? styles.selectedLine : styles.edgeLine : styles.arcLine}
      style={legacy ? undefined : { stroke: color, strokeWidth: `var(--board-line-width-${weight})`, strokeDasharray: edge.dash === 'dashed' ? '7 5' : undefined }} />
    {!legacy && <path d={arc.path} fill="none" stroke="none" style={{ strokeWidth: `var(--board-line-width-${weight})` }}
      markerStart={marker('start', capStart)} markerEnd={marker('end', capEnd)} />}
    {selectable && <path d={arc.path} className={styles.lineHit} role="button" tabIndex={0}
      aria-label={`Connection ${title(from)} to ${title(to)}`} onFocus={onFocus}
      onPointerDown={(event) => onSelect(event)} onDoubleClick={(event) => { event.stopPropagation(); onEdit(); }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(event); } }} />}
    {draft !== undefined ? <foreignObject x={center.x - 140} y={center.y - 36} width="280" height="130" className={styles.edgeEditor}
      onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
      <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <textarea aria-label="Connection label" autoFocus maxLength={4000} value={draft} disabled={pending}
          onChange={(event) => onDraft(event.currentTarget.value)} onKeyDown={(event) => {
            event.stopPropagation(); if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape') onCancel();
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); onSave(); }
          }} />
        <button className={styles.button} disabled={pending} type="submit">Save label</button>
        <button className={styles.button} disabled={pending} type="button" onClick={onCancel}>Cancel</button>
      </form>
    </foreignObject> : edge.label && (legacy
      ? <text x={center.x} y={center.y - 8} className={styles.edgeLabel}
        onPointerDown={selectable ? (event) => onDrag(event, 'label') : undefined}
        onDoubleClick={(event) => { event.stopPropagation(); onEdit(); }}>{edge.label}</text>
      : <text ref={labelRef} x={center.x} className={styles.arcLabel} data-testid={`board-edge-label-${edge.id}`}
        onPointerDown={selectable ? (event) => onDrag(event, 'label') : undefined}
        onDoubleClick={(event) => { event.stopPropagation(); onEdit(); }}>
        {estimate.lines.map((line, index) => <tspan key={index} x={center.x} y={center.y + (index - (estimate.lines.length - 1) / 2) * 16 + 4}>{line || ' '}</tspan>)}
      </text>)}
    {selected && selectable && draft === undefined && <>
      {(['from', 'to', 'bend'] as const).map((part) => {
        const point = part === 'from' ? arc.start : part === 'to' ? arc.end : pointOnBoardArc(arc, .5);
        return <circle key={part} className={styles.edgeHandle} cx={point.x} cy={point.y} r={5 / zoom}
          role="button" tabIndex={0} aria-label={`Drag connection ${part}`} onPointerDown={(event) => onDrag(event, part)} />;
      })}
    </>}
  </g>;
}
