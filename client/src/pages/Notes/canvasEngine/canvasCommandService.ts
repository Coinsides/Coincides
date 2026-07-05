import type { CanvasSceneRuntime } from './canvasRuntimeKernelService';
import type {
  BlockPlacementModel,
  CanvasCommand,
  CanvasDelta,
  CanvasObject,
  CanvasPlacement,
  ContentMount,
  NoteCanvasRuntimeModel,
  VisualConnector,
  VisualStyle,
} from './types';

export interface CreateCanvasObjectCommandInput {
  canvasId: string;
  actor: CanvasCommand['actor'];
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  contentMount?: ContentMount | null;
  visualStyle?: VisualStyle | null;
  visualConnector?: VisualConnector | null;
}

export interface ResizeCanvasObjectCommandInput {
  canvasId: string;
  objectId: string;
  actor: CanvasCommand['actor'];
  width: number;
  height: number;
}

export interface UpdateVisualStyleCommandInput {
  canvasId: string;
  objectId: string;
  actor: CanvasCommand['actor'];
  style: Partial<Omit<VisualStyle, 'styleId' | 'objectId'>>;
}

export interface DeleteCanvasObjectCommandInput {
  canvasId: string;
  objectId: string;
  actor: CanvasCommand['actor'];
}

export interface CanvasCommandResult {
  model: NoteCanvasRuntimeModel;
  delta: CanvasDelta;
}

function commandIdFor(
  canvasId: string,
  kind: CanvasCommand['kind'],
  objectId: string,
): string {
  return `canvas-command:${canvasId}:${kind}:${objectId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readCanvasObject(payload: Record<string, unknown>): CanvasObject | null {
  const value = payload.canvasObject;
  return isRecord(value) && typeof value.objectId === 'string'
    ? value as unknown as CanvasObject
    : null;
}

function readCanvasPlacement(payload: Record<string, unknown>): CanvasPlacement | null {
  const value = payload.placement;
  return isRecord(value) && typeof value.placementId === 'string'
    ? value as unknown as CanvasPlacement
    : null;
}

function readContentMount(payload: Record<string, unknown>): ContentMount | null {
  const value = payload.contentMount;
  return isRecord(value) && typeof value.mountId === 'string'
    ? value as unknown as ContentMount
    : null;
}

function readVisualStyle(payload: Record<string, unknown>): VisualStyle | null {
  const value = payload.visualStyle;
  return isRecord(value) && typeof value.styleId === 'string'
    ? value as unknown as VisualStyle
    : null;
}

function readVisualConnector(payload: Record<string, unknown>): VisualConnector | null {
  const value = payload.visualConnector;
  return isRecord(value) && typeof value.connectorId === 'string'
    ? value as unknown as VisualConnector
    : null;
}

function upsertById<T>(
  items: T[],
  idOf: (item: T) => string,
  nextItem: T,
): { items: T[]; before: T | null } {
  const index = items.findIndex((item) => idOf(item) === idOf(nextItem));
  if (index < 0) {
    return { items: [...items, nextItem], before: null };
  }

  return {
    items: items.map((item, currentIndex) => (currentIndex === index ? nextItem : item)),
    before: items[index] || null,
  };
}

function replacePlacement(
  model: NoteCanvasRuntimeModel,
  before: CanvasPlacement,
  after: CanvasPlacement,
): NoteCanvasRuntimeModel {
  return {
    ...model,
    canvasPlacements: model.canvasPlacements.map((placement) => (
      placement.placementId === before.placementId ? after : placement
    )),
    blockPlacements: model.blockPlacements.map((placement) => (
      placement.placementId === before.placementId ? { ...placement, ...after } as BlockPlacementModel : placement
    )),
  };
}

function emptyResult(scene: CanvasSceneRuntime, command: CanvasCommand): CanvasCommandResult {
  return {
    model: scene.model,
    delta: { commandId: command.commandId },
  };
}

export function createCanvasObjectCommand({
  canvasId,
  actor,
  canvasObject,
  placement,
  contentMount,
  visualStyle,
  visualConnector,
}: CreateCanvasObjectCommandInput): CanvasCommand {
  return {
    commandId: commandIdFor(canvasId, 'create_canvas_object', canvasObject.objectId),
    canvasId,
    kind: 'create_canvas_object',
    actor,
    payload: {
      canvasObject,
      placement,
      contentMount,
      visualStyle,
      visualConnector,
    },
  };
}

export function createResizeCanvasObjectCommand({
  canvasId,
  objectId,
  actor,
  width,
  height,
}: ResizeCanvasObjectCommandInput): CanvasCommand {
  return {
    commandId: commandIdFor(canvasId, 'resize_canvas_object', objectId),
    canvasId,
    kind: 'resize_canvas_object',
    actor,
    payload: {
      objectId,
      width,
      height,
    },
  };
}

export function createUpdateVisualStyleCommand({
  canvasId,
  objectId,
  actor,
  style,
}: UpdateVisualStyleCommandInput): CanvasCommand {
  return {
    commandId: commandIdFor(canvasId, 'update_visual_style', objectId),
    canvasId,
    kind: 'update_visual_style',
    actor,
    payload: {
      objectId,
      style,
    },
  };
}

export function createDeleteCanvasObjectCommand({
  canvasId,
  objectId,
  actor,
}: DeleteCanvasObjectCommandInput): CanvasCommand {
  return {
    commandId: commandIdFor(canvasId, 'delete_canvas_object', objectId),
    canvasId,
    kind: 'delete_canvas_object',
    actor,
    payload: {
      objectId,
    },
  };
}

function applyCreateCanvasObjectCommand(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
  payload: Record<string, unknown>,
): CanvasCommandResult {
  const canvasObject = readCanvasObject(payload);
  const placement = readCanvasPlacement(payload);
  if (!canvasObject || !placement) return emptyResult(scene, command);

  const contentMount = readContentMount(payload);
  const visualStyle = readVisualStyle(payload);
  const visualConnector = readVisualConnector(payload);
  const objectUpsert = upsertById(scene.model.canvasObjects, (item) => item.objectId, canvasObject);
  const placementUpsert = upsertById(scene.model.canvasPlacements, (item) => item.placementId, placement);
  const mountUpsert = contentMount
    ? upsertById(scene.model.contentMounts, (item) => item.mountId, contentMount)
    : { items: scene.model.contentMounts, before: null };
  const styleUpsert = visualStyle
    ? upsertById(scene.model.visualStyles, (item) => item.styleId, visualStyle)
    : { items: scene.model.visualStyles, before: null };
  const connectorUpsert = visualConnector
    ? upsertById(scene.model.visualConnectors, (item) => item.connectorId, visualConnector)
    : { items: scene.model.visualConnectors, before: null };

  const created: NonNullable<CanvasDelta['created']> = [];
  const updated: NonNullable<CanvasDelta['updated']> = [];
  if (objectUpsert.before) {
    updated.push({ kind: 'canvas_object', id: canvasObject.objectId, before: objectUpsert.before, after: canvasObject });
  } else {
    created.push({ kind: 'canvas_object', id: canvasObject.objectId });
  }
  if (placementUpsert.before) {
    updated.push({ kind: 'canvas_placement', id: placement.placementId, before: placementUpsert.before, after: placement });
  } else {
    created.push({ kind: 'canvas_placement', id: placement.placementId });
  }
  if (contentMount) {
    if (mountUpsert.before) {
      updated.push({ kind: 'content_mount', id: contentMount.mountId, before: mountUpsert.before, after: contentMount });
    } else {
      created.push({ kind: 'content_mount', id: contentMount.mountId });
    }
  }
  if (visualStyle) {
    if (styleUpsert.before) {
      updated.push({ kind: 'visual_style', id: visualStyle.styleId, before: styleUpsert.before, after: visualStyle });
    } else {
      created.push({ kind: 'visual_style', id: visualStyle.styleId });
    }
  }
  if (visualConnector) {
    if (connectorUpsert.before) {
      updated.push({ kind: 'visual_connector', id: visualConnector.connectorId, before: connectorUpsert.before, after: visualConnector });
    } else {
      created.push({ kind: 'visual_connector', id: visualConnector.connectorId });
    }
  }

  return {
    model: {
      ...scene.model,
      canvasObjects: objectUpsert.items,
      canvasPlacements: placementUpsert.items,
      contentMounts: mountUpsert.items,
      visualStyles: styleUpsert.items,
      visualConnectors: connectorUpsert.items,
    },
    delta: {
      commandId: command.commandId,
      created: created.length ? created : undefined,
      updated: updated.length ? updated : undefined,
    },
  };
}

function applyMoveCanvasObjectCommand(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
  payload: Record<string, unknown>,
): CanvasCommandResult {
  const objectId = readString(payload, 'objectId');
  const x = readNumber(payload, 'x');
  const y = readNumber(payload, 'y');
  if (!objectId || x === null || y === null) return emptyResult(scene, command);

  const before = scene.placementIndex.byObjectId.get(objectId);
  if (!before) return emptyResult(scene, command);

  const after = { ...before, x, y };
  return {
    model: replacePlacement(scene.model, before, after),
    delta: {
      commandId: command.commandId,
      updated: [{ kind: 'canvas_placement', id: before.placementId, before, after }],
    },
  };
}

function applyResizeCanvasObjectCommand(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
  payload: Record<string, unknown>,
): CanvasCommandResult {
  const objectId = readString(payload, 'objectId');
  const width = readNumber(payload, 'width');
  const height = readNumber(payload, 'height');
  if (!objectId || width === null || height === null) return emptyResult(scene, command);

  const before = scene.placementIndex.byObjectId.get(objectId);
  if (!before) return emptyResult(scene, command);

  const after = { ...before, width, height };
  return {
    model: replacePlacement(scene.model, before, after),
    delta: {
      commandId: command.commandId,
      updated: [{ kind: 'canvas_placement', id: before.placementId, before, after }],
    },
  };
}

function applyUpdateVisualStyleCommand(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
  payload: Record<string, unknown>,
): CanvasCommandResult {
  const objectId = readString(payload, 'objectId');
  const stylePatch = payload.style;
  if (!objectId || !isRecord(stylePatch)) return emptyResult(scene, command);

  const before = scene.model.visualStyles.find((style) => style.objectId === objectId) || null;
  const after: VisualStyle = {
    styleId: before?.styleId || `${objectId}:visual-style`,
    objectId,
    ...before,
    ...stylePatch,
  };
  const styleUpsert = upsertById(scene.model.visualStyles, (style) => style.styleId, after);

  return {
    model: {
      ...scene.model,
      visualStyles: styleUpsert.items,
    },
    delta: {
      commandId: command.commandId,
      created: before ? undefined : [{ kind: 'visual_style', id: after.styleId }],
      updated: before ? [{ kind: 'visual_style', id: after.styleId, before, after }] : undefined,
    },
  };
}

function applyDeleteCanvasObjectCommand(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
  payload: Record<string, unknown>,
): CanvasCommandResult {
  const objectId = readString(payload, 'objectId');
  if (!objectId) return emptyResult(scene, command);

  const deleted: NonNullable<CanvasDelta['deleted']> = [];
  const object = scene.model.canvasObjects.find((item) => item.objectId === objectId) || null;
  if (object) deleted.push({ kind: 'canvas_object', id: object.objectId });

  const placements = scene.model.canvasPlacements.filter((item) => item.objectId === objectId);
  placements.forEach((placement) => deleted.push({ kind: 'canvas_placement', id: placement.placementId }));

  const mounts = scene.model.contentMounts.filter((item) => item.objectId === objectId);
  mounts.forEach((mount) => deleted.push({ kind: 'content_mount', id: mount.mountId }));

  const styles = scene.model.visualStyles.filter((item) => item.objectId === objectId);
  styles.forEach((style) => deleted.push({ kind: 'visual_style', id: style.styleId }));

  const connectors = scene.model.visualConnectors.filter((item) => (
    item.objectId === objectId
    || item.startObjectId === objectId
    || item.endObjectId === objectId
  ));
  connectors.forEach((connector) => deleted.push({ kind: 'visual_connector', id: connector.connectorId }));
  const connectorObjectIds = new Set(connectors.map((connector) => connector.objectId));
  scene.model.canvasObjects
    .filter((item) => connectorObjectIds.has(item.objectId) && item.objectId !== objectId)
    .forEach((item) => deleted.push({ kind: 'canvas_object', id: item.objectId }));
  scene.model.canvasPlacements
    .filter((item) => connectorObjectIds.has(item.objectId) && item.objectId !== objectId)
    .forEach((item) => deleted.push({ kind: 'canvas_placement', id: item.placementId }));

  if (!deleted.length) return emptyResult(scene, command);

  return {
    model: {
      ...scene.model,
      canvasObjects: scene.model.canvasObjects.filter((item) => item.objectId !== objectId && !connectorObjectIds.has(item.objectId)),
      canvasPlacements: scene.model.canvasPlacements.filter((item) => item.objectId !== objectId && !connectorObjectIds.has(item.objectId)),
      blockPlacements: scene.model.blockPlacements.filter((item) => item.objectId !== objectId),
      contentMounts: scene.model.contentMounts.filter((item) => item.objectId !== objectId),
      visualStyles: scene.model.visualStyles.filter((item) => item.objectId !== objectId && !connectorObjectIds.has(item.objectId)),
      visualConnectors: scene.model.visualConnectors.filter((item) => !connectorObjectIds.has(item.objectId)),
    },
    delta: {
      commandId: command.commandId,
      deleted,
    },
  };
}

export function applyCanvasCommandToRuntime(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
): CanvasCommandResult {
  if (!isRecord(command.payload)) return emptyResult(scene, command);

  if (command.kind === 'create_canvas_object') {
    return applyCreateCanvasObjectCommand(scene, command, command.payload);
  }
  if (command.kind === 'move_canvas_object') {
    return applyMoveCanvasObjectCommand(scene, command, command.payload);
  }
  if (command.kind === 'resize_canvas_object') {
    return applyResizeCanvasObjectCommand(scene, command, command.payload);
  }
  if (command.kind === 'update_visual_style') {
    return applyUpdateVisualStyleCommand(scene, command, command.payload);
  }
  if (command.kind === 'delete_canvas_object') {
    return applyDeleteCanvasObjectCommand(scene, command, command.payload);
  }

  return emptyResult(scene, command);
}
