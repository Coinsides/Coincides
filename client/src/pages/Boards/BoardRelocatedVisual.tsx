import { useEffect, useState, type CSSProperties } from 'react';
import { loadCanvasImageAssetBlobUrl } from '@/pages/Notes/canvasEngine/canvasAssetRepository';
import { readCanvasObjectStyleMetadata } from '@/pages/Notes/canvasEngine/objectStyleService';
import type { BoardVisual } from './boardTypes';
import styles from './Boards.module.css';

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  if (typeof value === 'string') {
    try { return record(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.map(record) : []; }
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function ImageContent({ extension }: { extension: Row }) {
  const assetId = text(extension.asset_id);
  const [media, setMedia] = useState<{ id: string; url: string | null; failed: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (assetId) void loadCanvasImageAssetBlobUrl(assetId).then((url) => {
      if (!active) { URL.revokeObjectURL(url); return; }
      objectUrl = url;
      setMedia({ id: assetId, url, failed: false });
    }).catch(() => { if (active) setMedia({ id: assetId, url: null, failed: true }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);
  const current = media?.id === assetId ? media : null;
  const alt = text(extension.alt_text) || text(extension.caption) || 'Moved image';
  return <>
    {current?.url && !current.failed
      ? <img src={current.url} alt={alt} draggable={false}
        onError={() => setMedia({ id: assetId, url: null, failed: true })}
        style={{ objectFit: extension.fit === 'cover' ? 'cover' : extension.fit === 'fill' ? 'fill' : 'contain' }} />
      : <span>{!assetId || current?.failed ? 'Image unavailable' : 'Loading image…'}</span>}
    {text(extension.caption) && <small className={styles.visualCaption}>{text(extension.caption)}</small>}
  </>;
}

function TableContent({ extension }: { extension: Row }) {
  const payload = record(extension.data_json);
  const tableRows = rows(payload.rows).sort((a, b) => number(a.index) - number(b.index));
  const columns = rows(payload.columns).sort((a, b) => number(a.index) - number(b.index));
  const cellMap = new Map(rows(payload.cells).map((cell) => [
    JSON.stringify([cell.rowId ?? cell.row_id, cell.columnId ?? cell.column_id]), cell,
  ]));
  if (!tableRows.length || !columns.length) return <span>Table preview unavailable</span>;
  return <div className={styles.visualTableScroll}><table aria-label="Moved table"><tbody>
    {tableRows.map((row, index) => <tr key={text(row.rowId ?? row.row_id) || index}>
      {columns.map((column, columnIndex) => {
        const cell = cellMap.get(JSON.stringify([row.rowId ?? row.row_id, column.columnId ?? column.column_id]));
        return <td key={text(column.columnId ?? column.column_id) || columnIndex}>{text(cell?.text)}</td>;
      })}
    </tr>)}
  </tbody></table></div>;
}

/** Read the server's original rows without normalizing or saving them back through the paper writer. */
export function BoardRelocatedVisual({ visual, selected, selectable, onSelect, onPointerDown, onResize }: {
  visual: BoardVisual;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onResize?: (event: React.PointerEvent) => void;
}) {
  const source = record(visual.data.tray_source);
  const object = record(source.object);
  const metadata = record(object.metadata);
  const extensions = record(source.extensions);
  const style: CSSProperties = {
    left: visual.x, top: visual.y, width: visual.w, height: visual.h, zIndex: visual.z_index,
    transform: `scale(${visual.scale})`,
  };
  const select = (event: React.SyntheticEvent) => {
    if (!selectable) return;
    event.stopPropagation();
    onSelect();
  };
  const label = `Select moved ${visual.visual_kind}`;
  if (visual.visual_kind === 'connector') {
    const extension = record(extensions.connector);
    const points = record(visual.data.connector_points);
    const start = record(points.start);
    const end = record(points.end);
    const markerId = `board-arrow-${visual.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const stroke = text(extension.stroke) || 'var(--text-secondary)';
    const marker = (value: unknown) => value === 'arrow' ? `url(#${markerId})`
      : value === 'dot' || value === 'circle' ? `url(#${markerId}-dot)` : undefined;
    const path = `M ${number(start.x)} ${number(start.y)} L ${number(end.x)} ${number(end.y)}`;
    const width = number(extension.stroke_width, 1.5);
    return <svg className={styles.relocatedConnector} style={style} data-testid={`board-visual-${visual.id}`}
      data-visual-kind="connector" aria-label="Moved connector">
      <defs><marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
      </marker><marker id={`${markerId}-dot`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
        <circle cx="5" cy="5" r="4" fill={stroke} />
      </marker></defs>
      <g transform={`rotate(${visual.rotation} ${visual.w / 2} ${visual.h / 2})`}>
        <path d={path} fill="none" stroke={stroke} strokeWidth={width}
          strokeDasharray={extension.line_style === 'dashed' ? '8 5' : extension.line_style === 'dotted' ? '2 4' : undefined}
          markerStart={marker(extension.start_marker)} markerEnd={marker(extension.end_marker)} />
        {selected && <path d={path} className={styles.selectedLine} />}
        {selectable && <path d={path} className={styles.lineHit} role="button" tabIndex={0} aria-label={label}
          onPointerDown={onPointerDown || select} onFocus={select} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(event); }
          }} />}
      </g>
    </svg>;
  }
  const preset = readCanvasObjectStyleMetadata(metadata);
  const ellipse = metadata.shape_type === 'ellipse' || metadata.shapeType === 'ellipse';
  const shapeStyle: CSSProperties = visual.visual_kind === 'shape' ? {
    borderRadius: ellipse ? '50%' : preset.presetId === 'shape.sticky_note' ? 7 : 8,
    padding: preset.textInset,
    background: preset.presetId === 'shape.sticky_note'
      ? 'var(--canvas-sticky-note-fill, #2f2817)' : 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
    borderColor: preset.presetId === 'shape.sticky_note'
      ? 'var(--canvas-sticky-note-stroke, #d8a429)' : 'var(--accent-primary)',
  } : {};
  const shapeText = rows(source.backing_blocks).map((block) => text(block.plain_text)).filter(Boolean).join('\n');
  return <div className={styles.relocatedVisual} style={style} data-testid={`board-visual-${visual.id}`}
    data-visual-kind={visual.visual_kind}>
    <div className={`${styles.visualContent} ${selected ? styles.selected : ''}`}
      style={{ ...shapeStyle, transform: `rotate(${visual.rotation}deg)` }}
      role={selectable ? 'button' : undefined} tabIndex={selectable ? 0 : undefined} aria-label={label}
      onPointerDown={selectable ? onPointerDown || select : undefined} onFocus={select} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(event); }
      }}>
      {visual.visual_kind === 'shape' && <span className={styles.visualShapeText}>{shapeText}</span>}
      {visual.visual_kind === 'image' && <ImageContent extension={record(extensions.image)} />}
      {visual.visual_kind === 'table' && <TableContent extension={record(extensions.table)} />}
    </div>
    {selectable && selected && !visual.pinned && onResize && <button className={`${styles.resizeHandle} ${styles.visualResizeHandle}`}
      aria-label={`Resize moved ${visual.visual_kind}`} onPointerDown={onResize} onDoubleClick={(event) => event.stopPropagation()} />}
  </div>;
}
