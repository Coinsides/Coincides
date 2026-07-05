import {
  createCanvasObjectPresentationRef,
  isStickyNoteCanvasObject,
} from './objectStyleService';
import type {
  CanvasAIReadableNode,
  CanvasObject,
  CanvasPlacement,
  ContentMount,
  ImageCanvasObject,
  StructuredCanvasObject,
  TableCellModel,
  TableColumnModel,
  TableRowModel,
  TableStructuredPayload,
  VisualConnector,
} from './types';

export type CanvasObjectInspectorActionId =
  | 'open_original'
  | 'duplicate_canvas_object'
  | 'delete_canvas_object'
  | 'toggle_export_visibility'
  | 'toggle_shape_style'
  | 'toggle_image_fit';

export interface CanvasObjectInspectorAction {
  actionId: CanvasObjectInspectorActionId;
  label: string;
  enabled: boolean;
  disabledReason?: string;
  danger?: boolean;
}

export interface CanvasObjectInspectorModel {
  objectId: string;
  title: string;
  subtitle: string;
  kind: CanvasObject['kind'];
  backing: CanvasObject['backing'];
  objectClass: CanvasObject['objectClass'];
  surface: CanvasPlacement['surface'];
  frameId?: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
  };
  visibilityState: CanvasPlacement['visibilityState'];
  renderVisibility: CanvasPlacement['renderVisibility'];
  exportVisible: boolean;
  aiReadable: boolean;
  summary?: string;
  contentRef?: CanvasAIReadableNode['contentRef'];
  connectorRef?: CanvasAIReadableNode['connectorRef'];
  imageRef?: CanvasAIReadableNode['imageRef'];
  structuredRef?: CanvasAIReadableNode['structuredRef'];
  presentationRef?: CanvasAIReadableNode['presentationRef'];
  actions: CanvasObjectInspectorAction[];
}

export interface CanvasObjectInspectorInput {
  canvasObject?: CanvasObject | null;
  placement?: CanvasPlacement | null;
  contentMount?: ContentMount | null;
  aiNode?: CanvasAIReadableNode | null;
  visualConnector?: VisualConnector | null;
  imageObject?: ImageCanvasObject | null;
  structuredObject?: StructuredCanvasObject | null;
}

export interface CanvasObjectDuplicateDraft {
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  contentMounts: ContentMount[];
  imageObject?: ImageCanvasObject;
  structuredObject?: StructuredCanvasObject;
}

export interface CreateCanvasObjectDuplicateDraftInput extends CanvasObjectInspectorInput {
  nextObjectId: string;
  nextPlacementId?: string;
}

function cloneRecord(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function labelForKind(object: CanvasObject, imageObject?: ImageCanvasObject | null, structuredObject?: StructuredCanvasObject | null): string {
  if (isStickyNoteCanvasObject(object)) return 'Sticky note';
  if (object.kind === 'shape') return 'Shape';
  if (object.kind === 'visual_connector') return 'Visual connector';
  if (object.kind === 'image') return imageObject?.caption ? 'Image with caption' : 'Image';
  if (object.kind === 'table') {
    const rowCount = structuredObject?.rowCount || 0;
    const columnCount = structuredObject?.columnCount || 0;
    return rowCount && columnCount ? `Table ${rowCount} x ${columnCount}` : 'Table';
  }
  if (object.kind === 'paragraph_block_projection') return 'Paragraph block projection';
  if (object.kind === 'content_group_projection') return 'ContentGroup projection';
  return object.kind;
}

function subtitleForObject(object: CanvasObject, mount?: ContentMount | null): string {
  if (mount?.targetKind === 'note_block') return 'Block-backed canvas object';
  if (object.kind === 'visual_connector') return 'Visual-only connector';
  if (object.kind === 'image') return 'Asset-backed media object';
  if (object.kind === 'table') return 'Structured canvas object';
  if (object.backing === 'none') return 'Pure canvas object';
  return `${object.backing} backed object`;
}

function isExportVisible(placement: CanvasPlacement): boolean {
  return (placement.visibilityState || 'normal') !== 'export_hidden'
    && (placement.renderVisibility || 'visible') === 'visible';
}

function canDuplicateObject(input: CanvasObjectInspectorInput): { enabled: boolean; reason?: string } {
  const object = input.canvasObject;
  if (!object) return { enabled: false, reason: 'Missing object.' };
  if (object.kind === 'shape' && object.backing === 'none' && object.objectClass === 'pure') {
    return { enabled: true };
  }
  if (object.kind === 'image' && input.imageObject) return { enabled: true };
  if (object.kind === 'table' && input.structuredObject) return { enabled: true };
  if (object.kind === 'shape' && object.backing === 'note_block') {
    return { enabled: false, reason: 'Block-backed objects need explicit copy semantics first.' };
  }
  if (object.kind === 'visual_connector') {
    return { enabled: false, reason: 'Connectors should be recreated from endpoints.' };
  }
  if (object.kind === 'page_frame') {
    return { enabled: false, reason: 'PageFrame duplication uses the PageStack tools.' };
  }
  return { enabled: false, reason: 'This object kind is not safely duplicable yet.' };
}

export function createCanvasObjectInspectorActions(input: CanvasObjectInspectorInput): CanvasObjectInspectorAction[] {
  const object = input.canvasObject;
  const placement = input.placement;
  const mount = input.contentMount;
  const duplicateState = canDuplicateObject(input);
  const openOriginalEnabled = mount?.targetKind === 'note_block' && Boolean(mount.targetId);
  const isImage = object?.kind === 'image' && Boolean(input.imageObject);
  const shapeStyleAllowed = object?.kind === 'shape' && object.backing === 'note_block';

  const actions: CanvasObjectInspectorAction[] = [
    {
      actionId: 'open_original',
      label: 'Open original',
      enabled: openOriginalEnabled,
      disabledReason: openOriginalEnabled ? undefined : 'Only note-block-backed objects have an original block.',
    },
    {
      actionId: 'duplicate_canvas_object',
      label: 'Duplicate object',
      enabled: duplicateState.enabled,
      disabledReason: duplicateState.reason,
    },
    {
      actionId: 'toggle_export_visibility',
      label: placement && isExportVisible(placement) ? 'Hide from export' : 'Show in export',
      enabled: Boolean(placement),
      disabledReason: placement ? undefined : 'Missing placement.',
    },
  ];

  if (object?.kind === 'shape') {
    actions.push({
      actionId: 'toggle_shape_style',
      label: isStickyNoteCanvasObject(object) ? 'Use plain shape style' : 'Use sticky note style',
      enabled: Boolean(shapeStyleAllowed),
      disabledReason: shapeStyleAllowed ? undefined : 'Shape style switching is only for block-backed shapes.',
    });
  }

  if (object?.kind === 'image') {
    actions.push({
      actionId: 'toggle_image_fit',
      label: input.imageObject?.fit === 'cover' ? 'Fit: contain' : 'Fit: cover',
      enabled: Boolean(isImage),
      disabledReason: isImage ? undefined : 'Only image objects have fit mode.',
    });
  }

  actions.push(
    {
      actionId: 'delete_canvas_object',
      label: 'Delete object',
      enabled: Boolean(object && object.kind !== 'page_frame'),
      disabledReason: object?.kind === 'page_frame' ? 'PageFrame deletion uses PageFrame tools.' : undefined,
      danger: true,
    },
  );

  return actions;
}

export function createCanvasObjectInspectorModel(input: CanvasObjectInspectorInput): CanvasObjectInspectorModel | null {
  const object = input.canvasObject;
  const placement = input.placement;
  if (!object || !placement || object.kind === 'page_frame') return null;

  const textBacked = input.contentMount?.targetKind === 'note_block';
  return {
    objectId: object.objectId,
    title: labelForKind(object, input.imageObject, input.structuredObject),
    subtitle: subtitleForObject(object, input.contentMount),
    kind: object.kind,
    backing: object.backing,
    objectClass: object.objectClass,
    surface: placement.surface,
    frameId: placement.frameId,
    bbox: {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
      zIndex: placement.zIndex,
    },
    visibilityState: placement.visibilityState || 'normal',
    renderVisibility: placement.renderVisibility || 'visible',
    exportVisible: isExportVisible(placement),
    aiReadable: Boolean(input.aiNode),
    summary: input.aiNode?.summary || input.aiNode?.text,
    contentRef: input.aiNode?.contentRef,
    connectorRef: input.aiNode?.connectorRef,
    imageRef: input.aiNode?.imageRef,
    structuredRef: input.aiNode?.structuredRef,
    presentationRef: input.aiNode?.presentationRef || createCanvasObjectPresentationRef(object, Boolean(textBacked)),
    actions: createCanvasObjectInspectorActions(input),
  };
}

export function toggleCanvasPlacementExportVisibility(placement: CanvasPlacement): CanvasPlacement {
  return {
    ...placement,
    visibilityState: (placement.visibilityState || 'normal') === 'export_hidden' ? 'normal' : 'export_hidden',
    renderVisibility: placement.renderVisibility || 'visible',
  };
}

function offsetPlacement(placement: CanvasPlacement, nextObjectId: string, nextPlacementId?: string): CanvasPlacement {
  return {
    ...placement,
    placementId: nextPlacementId || `${nextObjectId}:placement`,
    objectId: nextObjectId,
    x: placement.x + 32,
    y: placement.y + 32,
    zIndex: placement.zIndex + 1,
    visibilityState: placement.visibilityState || 'normal',
    renderVisibility: placement.renderVisibility || 'visible',
  };
}

function duplicateCanvasObjectIdentity(object: CanvasObject, nextObjectId: string): CanvasObject {
  return {
    ...object,
    objectId: nextObjectId,
    status: 'active',
    metadata: {
      ...(cloneRecord(object.metadata) || {}),
      duplicated_from: object.objectId,
    },
    createdAt: undefined,
    updatedAt: undefined,
  };
}

function cloneTablePayloadForObject(payload: TableStructuredPayload, nextObjectId: string): TableStructuredPayload {
  const rows: TableRowModel[] = payload.rows
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((row, index) => ({
      rowId: `${nextObjectId}:row:${index}`,
      index,
      height: row.height,
    }));
  const columns: TableColumnModel[] = payload.columns
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((column, index) => ({
      columnId: `${nextObjectId}:column:${index}`,
      index,
      width: column.width,
      label: column.label,
    }));
  const sourceCellByIndex = new Map(payload.cells.map((cell) => [`${cell.rowIndex}:${cell.columnIndex}`, cell]));
  const cells: TableCellModel[] = rows.flatMap((row) => (
    columns.map((column) => {
      const sourceCell = sourceCellByIndex.get(`${row.index}:${column.index}`);
      return {
        cellId: `${nextObjectId}:cell:${row.index}:${column.index}`,
        rowId: row.rowId,
        columnId: column.columnId,
        rowIndex: row.index,
        columnIndex: column.index,
        text: sourceCell?.text || '',
        valueType: 'text' as const,
      };
    })
  ));

  return {
    version: 'table.v1',
    rows,
    columns,
    cells,
  };
}

export function createCanvasObjectDuplicateDraft(
  input: CreateCanvasObjectDuplicateDraftInput,
): CanvasObjectDuplicateDraft | null {
  const object = input.canvasObject;
  const placement = input.placement;
  if (!object || !placement) return null;
  if (!canDuplicateObject(input).enabled) return null;

  const canvasObject = duplicateCanvasObjectIdentity(object, input.nextObjectId);
  const nextPlacement = offsetPlacement(placement, input.nextObjectId, input.nextPlacementId);

  if (object.kind === 'shape') {
    return {
      canvasObject,
      placement: nextPlacement,
      contentMounts: [],
    };
  }

  if (object.kind === 'image' && input.imageObject) {
    return {
      canvasObject,
      placement: nextPlacement,
      contentMounts: [],
      imageObject: {
        // Image duplicate intentionally shares the same asset blob; the server
        // releases it by live image-object reference count.
        ...input.imageObject,
        imageObjectId: input.nextObjectId,
        objectId: input.nextObjectId,
        metadata: {
          ...(cloneRecord(input.imageObject.metadata) || {}),
          duplicated_from: input.imageObject.objectId,
        },
      },
    };
  }

  if (object.kind === 'table' && input.structuredObject) {
    const payload = cloneTablePayloadForObject(input.structuredObject.payload, input.nextObjectId);
    return {
      canvasObject,
      placement: nextPlacement,
      contentMounts: [],
      structuredObject: {
        ...input.structuredObject,
        objectId: input.nextObjectId,
        rowCount: payload.rows.length,
        columnCount: payload.columns.length,
        payload,
        metadata: {
          ...(cloneRecord(input.structuredObject.metadata) || {}),
          duplicated_from: input.structuredObject.objectId,
        },
      },
    };
  }

  return null;
}
