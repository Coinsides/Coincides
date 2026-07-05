import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useEffect, useRef, useState } from 'react';
import type {
  CanvasObject,
  CanvasPlacement,
  StructuredCanvasObject,
  TableCellModel,
  TableColumnModel,
  TableRowModel,
} from '../types';
import type { TableCellSelection } from '../tableObjectService';
import type { ShapeInteractionPreview } from './ShapeObjectLayer';
import styles from '../../NoteDetail.module.css';

export type PendingTableCellEdit = {
  selection: TableCellSelection;
  text: string;
};

type TableObjectLayerProps = {
  placements: CanvasPlacement[];
  canvasObjectById: Map<string, CanvasObject>;
  structuredObjectById: Map<string, StructuredCanvasObject>;
  selectedObjectId: string | null;
  interactionPreview: ShapeInteractionPreview;
  layoutMode: boolean;
  onTablePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => void;
  onTableResizePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => void;
  onTablePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTablePointerEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTableContextMenu: (
    event: ReactMouseEvent<HTMLElement>,
    canvasObject: CanvasObject,
    selection?: TableCellSelection | null,
    pendingEdit?: PendingTableCellEdit | null,
  ) => void | Promise<void>;
  selectedCell: TableCellSelection | null;
  editingCell: TableCellSelection | null;
  onSelectCell: (selection: TableCellSelection) => void;
  onStartCellEdit: (selection: TableCellSelection) => void;
  onCancelCellEdit: () => void;
  onCommitCellText: (selection: TableCellSelection, text: string) => void | Promise<void>;
};

function sortedRows(rows: TableRowModel[]): TableRowModel[] {
  return [...rows].sort((a, b) => a.index - b.index);
}

function sortedColumns(columns: TableColumnModel[]): TableColumnModel[] {
  return [...columns].sort((a, b) => a.index - b.index);
}

function cellKey(cell: Pick<TableCellModel, 'rowId' | 'columnId'>): string {
  return `${cell.rowId}:${cell.columnId}`;
}

function buildCellMap(cells: TableCellModel[]): Map<string, TableCellModel> {
  return new Map(cells.map((cell) => [cellKey(cell), cell]));
}

export function TableObjectLayer({
  placements,
  canvasObjectById,
  structuredObjectById,
  selectedObjectId,
  interactionPreview,
  layoutMode,
  onTablePointerDown,
  onTableResizePointerDown,
  onTablePointerMove,
  onTablePointerEnd,
  onTableContextMenu,
  selectedCell,
  editingCell,
  onSelectCell,
  onStartCellEdit,
  onCancelCellEdit,
  onCommitCellText,
}: TableObjectLayerProps) {
  const [draftText, setDraftText] = useState('');
  const cancelledEditRef = useRef(false);

  useEffect(() => {
    if (!editingCell) {
      setDraftText('');
      return;
    }
    cancelledEditRef.current = false;
    const structuredObject = structuredObjectById.get(editingCell.objectId);
    const cell = structuredObject?.payload.cells.find((item) => item.cellId === editingCell.cellId);
    setDraftText(cell?.text || '');
  }, [editingCell, structuredObjectById]);

  const commitEditingCell = () => {
    if (cancelledEditRef.current) {
      cancelledEditRef.current = false;
      return;
    }
    if (!editingCell) return;
    onCommitCellText(editingCell, draftText);
  };

  const pendingEdit = (): PendingTableCellEdit | null => (
    editingCell
      ? { selection: editingCell, text: draftText }
      : null
  );

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelledEditRef.current = true;
      onCancelCellEdit();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitEditingCell();
    }
  };

  return (
    <>
      {placements.map((placement) => {
        const canvasObject = canvasObjectById.get(placement.objectId);
        const structuredObject = structuredObjectById.get(placement.objectId);
        if (!canvasObject || !structuredObject) return null;
        const selected = selectedObjectId === canvasObject.objectId;
        const preview = interactionPreview?.objectId === canvasObject.objectId ? interactionPreview : null;
        const rows = sortedRows(structuredObject.payload.rows);
        const columns = sortedColumns(structuredObject.payload.columns);
        const cellsByKey = buildCellMap(structuredObject.payload.cells);
        return (
          <div
            key={canvasObject.objectId}
            className={`${styles.canvasTableObject} ${selected ? styles.canvasTableSelected : ''} ${layoutMode ? styles.canvasTableOperable : ''}`}
            data-canvas-table="true"
            data-canvas-table-object="true"
            data-canvas-structured-object="table"
            data-canvas-object-id={canvasObject.objectId}
            data-canvas-object-kind="table"
            data-canvas-object-backing="structured_object"
            data-canvas-object-presentation="table"
            data-canvas-table-schema={structuredObject.schemaVersion}
            data-canvas-table-rows={structuredObject.rowCount}
            data-canvas-table-columns={structuredObject.columnCount}
            data-canvas-table-selected={selected ? 'true' : 'false'}
            onPointerDown={(event) => onTablePointerDown(event, canvasObject, placement)}
            onPointerMove={onTablePointerMove}
            onPointerUp={onTablePointerEnd}
            onPointerCancel={onTablePointerEnd}
            onContextMenu={(event) => onTableContextMenu(event, canvasObject, null, pendingEdit())}
            style={{
              left: preview?.x ?? placement.x,
              top: preview?.y ?? placement.y,
              width: preview?.width ?? placement.width,
              height: preview?.height ?? placement.height,
              transform: `rotate(${placement.rotation || 0}deg)`,
              zIndex: Math.max(4, placement.zIndex),
            }}
          >
            <div className={styles.canvasTableHeader}>
              <span>Table</span>
              <span>{structuredObject.rowCount} x {structuredObject.columnCount}</span>
            </div>
            <div className={styles.canvasTableGridWrap}>
              <table className={styles.canvasTableGrid}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.columnId}
                        data-canvas-table-column={column.columnId}
                        style={{ width: column.width }}
                      >
                        {column.label || column.index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowId} data-canvas-table-row={row.rowId}>
                      {columns.map((column) => {
                        const cell = cellsByKey.get(`${row.rowId}:${column.columnId}`);
                        const selection = cell ? {
                          objectId: canvasObject.objectId,
                          cellId: cell.cellId,
                          rowId: row.rowId,
                          columnId: column.columnId,
                        } : null;
                        const cellSelected = Boolean(
                          selection
                          && selectedCell?.objectId === selection.objectId
                          && selectedCell.cellId === selection.cellId,
                        );
                        const cellEditing = Boolean(
                          selection
                          && editingCell?.objectId === selection.objectId
                          && editingCell.cellId === selection.cellId,
                        );
                        return (
                          <td
                            key={`${row.rowId}:${column.columnId}`}
                            className={cellSelected ? styles.canvasTableCellSelected : ''}
                            data-canvas-table-cell={`row-${row.index}:col-${column.index}`}
                            data-canvas-table-cell-id={cell?.cellId || ''}
                            data-canvas-table-cell-selected={cellSelected ? 'true' : 'false'}
                            onPointerDown={(event) => {
                              if (!selection) return;
                              event.stopPropagation();
                              onSelectCell(selection);
                            }}
                            onDoubleClick={(event) => {
                              if (!selection) return;
                              event.preventDefault();
                              event.stopPropagation();
                              onStartCellEdit(selection);
                            }}
                            onContextMenu={(event) => {
                              if (!selection) return;
                              event.preventDefault();
                              event.stopPropagation();
                              onSelectCell(selection);
                              onTableContextMenu(event, canvasObject, selection, pendingEdit());
                            }}
                          >
                            {cellEditing && selection ? (
                              <textarea
                                className={styles.canvasTableCellEditor}
                                value={draftText}
                                autoFocus
                                onPointerDown={(event) => event.stopPropagation()}
                                onChange={(event) => setDraftText(event.target.value)}
                                onKeyDown={handleEditorKeyDown}
                                onBlur={commitEditingCell}
                              />
                            ) : (
                              <span className={styles.canvasTableCellText}>{cell?.text || ''}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected && layoutMode && (
              <div
                className={styles.canvasTableResizeHandle}
                data-canvas-table-resize-handle="true"
                onPointerDown={(event) => onTableResizePointerDown(event, canvasObject, placement)}
                onPointerMove={onTablePointerMove}
                onPointerUp={onTablePointerEnd}
                onPointerCancel={onTablePointerEnd}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
