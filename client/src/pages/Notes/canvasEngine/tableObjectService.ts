import type { BlockBoxLayout } from './runtimeLayout';
import type {
  CanvasObject,
  CanvasPlacement,
  CanvasSurface,
  StructuredCanvasObject,
  TableCellModel,
  TableColumnModel,
  TableRowModel,
  TableStructuredPayload,
  VisualStyle,
} from './types';

export interface CreateTableObjectProjectionInput {
  objectId: string;
  canvasId: string;
  layout: BlockBoxLayout;
  zIndex: number;
  frameId?: string;
  rowCount?: number;
  columnCount?: number;
  visualStyle?: VisualStyle | null;
}

export interface TableObjectProjection {
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  structuredObject: StructuredCanvasObject;
  contentMount: null;
  visualStyle: VisualStyle | null;
}

export interface TableCellSelection {
  objectId: string;
  cellId: string;
  rowId: string;
  columnId: string;
}

function surfaceForLayout(layout: BlockBoxLayout): CanvasSurface {
  return layout.surface === 'tray' ? 'tray' : 'formal_page';
}

function columnLabel(index: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[index] || `C${index + 1}`;
}

export function createDefaultTablePayload(
  objectId: string,
  rowCount = 3,
  columnCount = 3,
): TableStructuredPayload {
  const rows: TableRowModel[] = Array.from({ length: rowCount }, (_, index) => ({
    rowId: `${objectId}:row:${index}`,
    index,
  }));
  const columns: TableColumnModel[] = Array.from({ length: columnCount }, (_, index) => ({
    columnId: `${objectId}:column:${index}`,
    index,
    label: columnLabel(index),
  }));
  const cells: TableCellModel[] = rows.flatMap((row) => (
    columns.map((column) => ({
      cellId: `${objectId}:cell:${row.index}:${column.index}`,
      rowId: row.rowId,
      columnId: column.columnId,
      rowIndex: row.index,
      columnIndex: column.index,
      text: '',
      valueType: 'text' as const,
    }))
  ));

  return {
    version: 'table.v1',
    rows,
    columns,
    cells,
  };
}

function tableObjectIdFromPayload(payload: TableStructuredPayload): string {
  const rowId = payload.rows[0]?.rowId || '';
  const rowMarker = rowId.indexOf(':row:');
  if (rowMarker > 0) return rowId.slice(0, rowMarker);
  const columnId = payload.columns[0]?.columnId || '';
  const columnMarker = columnId.indexOf(':column:');
  if (columnMarker > 0) return columnId.slice(0, columnMarker);
  const cellId = payload.cells[0]?.cellId || 'table';
  const cellMarker = cellId.indexOf(':cell:');
  return cellMarker > 0 ? cellId.slice(0, cellMarker) : 'table';
}

function nextStableId(prefix: string, existingIds: Set<string>): string {
  for (let index = 0; index < 10000; index += 1) {
    const candidate = `${prefix}:${index}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return `${prefix}:${Date.now().toString(36)}`;
}

function sortedRows(rows: TableRowModel[]): TableRowModel[] {
  return [...rows].sort((a, b) => a.index - b.index);
}

function sortedColumns(columns: TableColumnModel[]): TableColumnModel[] {
  return [...columns].sort((a, b) => a.index - b.index);
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`;
}

export function normalizeTablePayload(payload: TableStructuredPayload): TableStructuredPayload {
  const rows = sortedRows(payload.rows).map((row, index) => ({
    ...row,
    index,
  }));
  const columns = sortedColumns(payload.columns).map((column, index) => ({
    ...column,
    index,
  }));
  const cellsByKey = new Map(payload.cells.map((cell) => [cellKey(cell.rowId, cell.columnId), cell]));
  const existingCellIds = new Set(payload.cells.map((cell) => cell.cellId));
  const objectId = tableObjectIdFromPayload(payload);
  const cells: TableCellModel[] = [];

  rows.forEach((row) => {
    columns.forEach((column) => {
      const existing = cellsByKey.get(cellKey(row.rowId, column.columnId));
      if (existing) {
        cells.push({
          ...existing,
          rowId: row.rowId,
          columnId: column.columnId,
          rowIndex: row.index,
          columnIndex: column.index,
          valueType: 'text',
        });
        return;
      }

      const cellId = nextStableId(`${objectId}:cell:${row.rowId}:${column.columnId}`, existingCellIds);
      existingCellIds.add(cellId);
      cells.push({
        cellId,
        rowId: row.rowId,
        columnId: column.columnId,
        rowIndex: row.index,
        columnIndex: column.index,
        text: '',
        valueType: 'text',
      });
    });
  });

  return {
    version: 'table.v1',
    rows,
    columns,
    cells,
  };
}

export function updateTableCellText(
  payload: TableStructuredPayload,
  cellId: string,
  text: string,
): TableStructuredPayload {
  return normalizeTablePayload({
    ...payload,
    cells: payload.cells.map((cell) => (
      cell.cellId === cellId
        ? { ...cell, text, valueType: 'text' }
        : cell
    )),
  });
}

export function addTableRowBelow(
  payload: TableStructuredPayload,
  selection: Pick<TableCellSelection, 'rowId'> | null = null,
): TableStructuredPayload {
  const normalized = normalizeTablePayload(payload);
  const selectedRow = selection
    ? normalized.rows.find((row) => row.rowId === selection.rowId)
    : null;
  const insertIndex = selectedRow ? selectedRow.index + 1 : normalized.rows.length;
  const objectId = tableObjectIdFromPayload(normalized);
  const existingRowIds = new Set(normalized.rows.map((row) => row.rowId));
  const rowId = nextStableId(`${objectId}:row`, existingRowIds);
  const rows = [
    ...normalized.rows.map((row) => ({
      ...row,
      index: row.index >= insertIndex ? row.index + 1 : row.index,
    })),
    { rowId, index: insertIndex },
  ];
  const existingCellIds = new Set(normalized.cells.map((cell) => cell.cellId));
  const newCells = normalized.columns.map((column) => {
    const cellId = nextStableId(`${objectId}:cell:${rowId}:${column.columnId}`, existingCellIds);
    existingCellIds.add(cellId);
    return {
      cellId,
      rowId,
      columnId: column.columnId,
      rowIndex: insertIndex,
      columnIndex: column.index,
      text: '',
      valueType: 'text' as const,
    };
  });

  return normalizeTablePayload({
    ...normalized,
    rows,
    cells: [...normalized.cells, ...newCells],
  });
}

export function addTableColumnRight(
  payload: TableStructuredPayload,
  selection: Pick<TableCellSelection, 'columnId'> | null = null,
): TableStructuredPayload {
  const normalized = normalizeTablePayload(payload);
  const selectedColumn = selection
    ? normalized.columns.find((column) => column.columnId === selection.columnId)
    : null;
  const insertIndex = selectedColumn ? selectedColumn.index + 1 : normalized.columns.length;
  const objectId = tableObjectIdFromPayload(normalized);
  const existingColumnIds = new Set(normalized.columns.map((column) => column.columnId));
  const columnId = nextStableId(`${objectId}:column`, existingColumnIds);
  const columns = [
    ...normalized.columns.map((column) => ({
      ...column,
      index: column.index >= insertIndex ? column.index + 1 : column.index,
    })),
    { columnId, index: insertIndex, label: columnLabel(insertIndex) },
  ];
  const existingCellIds = new Set(normalized.cells.map((cell) => cell.cellId));
  const newCells = normalized.rows.map((row) => {
    const cellId = nextStableId(`${objectId}:cell:${row.rowId}:${columnId}`, existingCellIds);
    existingCellIds.add(cellId);
    return {
      cellId,
      rowId: row.rowId,
      columnId,
      rowIndex: row.index,
      columnIndex: insertIndex,
      text: '',
      valueType: 'text' as const,
    };
  });

  return normalizeTablePayload({
    ...normalized,
    columns,
    cells: [...normalized.cells, ...newCells],
  });
}

export function deleteTableRow(
  payload: TableStructuredPayload,
  selection: Pick<TableCellSelection, 'rowId'> | null = null,
): TableStructuredPayload {
  const normalized = normalizeTablePayload(payload);
  if (normalized.rows.length <= 1) return normalized;
  const selectedRow = selection
    ? normalized.rows.find((row) => row.rowId === selection.rowId)
    : null;
  const rowId = selectedRow?.rowId || normalized.rows[normalized.rows.length - 1]?.rowId;
  return normalizeTablePayload({
    ...normalized,
    rows: normalized.rows.filter((row) => row.rowId !== rowId),
    cells: normalized.cells.filter((cell) => cell.rowId !== rowId),
  });
}

export function deleteTableColumn(
  payload: TableStructuredPayload,
  selection: Pick<TableCellSelection, 'columnId'> | null = null,
): TableStructuredPayload {
  const normalized = normalizeTablePayload(payload);
  if (normalized.columns.length <= 1) return normalized;
  const selectedColumn = selection
    ? normalized.columns.find((column) => column.columnId === selection.columnId)
    : null;
  const columnId = selectedColumn?.columnId || normalized.columns[normalized.columns.length - 1]?.columnId;
  return normalizeTablePayload({
    ...normalized,
    columns: normalized.columns.filter((column) => column.columnId !== columnId),
    cells: normalized.cells.filter((cell) => cell.columnId !== columnId),
  });
}

function createTablePlacement({
  objectId,
  canvasId,
  layout,
  zIndex,
  frameId,
}: {
  objectId: string;
  canvasId: string;
  layout: BlockBoxLayout;
  zIndex: number;
  frameId?: string;
}): CanvasPlacement {
  const surface = surfaceForLayout(layout);
  return {
    placementId: `${objectId}:placement`,
    objectId,
    canvasId,
    frameId: surface === 'formal_page' ? frameId : undefined,
    surface,
    boundaryRole: surface === 'formal_page' ? 'inside' : 'outside',
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    rotation: layout.rotation || 0,
    zIndex,
    orderIndex: layout.order_index,
    snapState: surface === 'formal_page' ? 'snapped' : 'free',
    visibilityState: 'normal',
    renderVisibility: 'visible',
  };
}

export function createTableObjectProjection({
  objectId,
  canvasId,
  layout,
  zIndex,
  frameId,
  rowCount = 3,
  columnCount = 3,
  visualStyle = null,
}: CreateTableObjectProjectionInput): TableObjectProjection {
  const payload = createDefaultTablePayload(objectId, rowCount, columnCount);
  const placement = createTablePlacement({
    objectId,
    canvasId,
    layout,
    zIndex,
    frameId,
  });
  const canvasObject: CanvasObject = {
    objectId,
    canvasId,
    kind: 'table',
    backing: 'structured_object',
    objectClass: 'structured',
    status: 'active',
    source: 'runtime_seed',
    metadata: {
      structuredKind: 'table',
      structured_kind: 'table',
      schemaVersion: 'table.v1',
      schema_version: 'table.v1',
    },
  };
  const structuredObject: StructuredCanvasObject = {
    objectId,
    canvasId,
    structuredKind: 'table',
    schemaVersion: 'table.v1',
    rowCount: payload.rows.length,
    columnCount: payload.columns.length,
    payload,
    metadata: {
      source: 'canvas_table_object',
    },
  };

  return {
    canvasObject,
    placement,
    structuredObject,
    contentMount: null,
    visualStyle,
  };
}

export function tableObjectSavePayload(
  canvasObject: CanvasObject,
  placement: CanvasPlacement,
  structuredObject: StructuredCanvasObject,
  style?: VisualStyle | null,
): Record<string, unknown> {
  return {
    kind: 'table',
    backing: 'structured_object',
    object_class: 'structured',
    placement: {
      placement_id: placement.placementId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
      frame_id: placement.frameId || null,
      surface: placement.surface,
      boundary_role: placement.boundaryRole,
      z_index: placement.zIndex,
      order_index: placement.orderIndex ?? null,
      visibility_state: placement.visibilityState || 'normal',
      render_visibility: placement.renderVisibility || 'visible',
    },
    extension: {
      structured_kind: structuredObject.structuredKind,
      schema_version: structuredObject.schemaVersion,
      rows: structuredObject.payload.rows,
      columns: structuredObject.payload.columns,
      cells: structuredObject.payload.cells,
      metadata: structuredObject.metadata || {},
    },
    metadata: {
      ...(canvasObject.metadata || {}),
      structured_kind: structuredObject.structuredKind,
      schema_version: structuredObject.schemaVersion,
      style_id: style?.styleId,
    },
    source: {
      source: 'canvas_structured_object',
    },
  };
}
