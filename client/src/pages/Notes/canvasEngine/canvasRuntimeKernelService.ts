import { viewportPointToWorldPoint } from './viewportService';
import type {
  CanvasCommand,
  CanvasDelta,
  CanvasObject,
  CanvasPlacement,
  CanvasPoint,
  ContentMount,
  NoteCanvasRuntimeModel,
} from './types';

export interface CanvasPlacementIndex {
  all: CanvasPlacement[];
  visible: CanvasPlacement[];
  zOrdered: CanvasPlacement[];
  byObjectId: Map<string, CanvasPlacement>;
  byPlacementId: Map<string, CanvasPlacement>;
}

export interface CanvasSceneRuntime {
  canvasId: string;
  model: NoteCanvasRuntimeModel;
  objects: CanvasObject[];
  mounts: ContentMount[];
  placementIndex: CanvasPlacementIndex;
  objectById: Map<string, CanvasObject>;
  mountByObjectId: Map<string, ContentMount>;
}

export interface CanvasHitResult {
  objectId: string;
  placementId: string;
  object: CanvasObject | null;
  placement: CanvasPlacement;
}

export interface CanvasSelectionState {
  selectedObjectIds: string[];
  primaryObjectId: string | null;
}

export interface MoveCanvasObjectCommandInput {
  canvasId: string;
  objectId: string;
  actor: CanvasCommand['actor'];
  x: number;
  y: number;
}

function isPlacementVisible(placement: CanvasPlacement): boolean {
  return placement.renderVisibility !== 'hidden' && placement.renderVisibility !== 'collapsed';
}

function pointInPlacement(point: CanvasPoint, placement: CanvasPlacement): boolean {
  return point.x >= placement.x
    && point.x <= placement.x + placement.width
    && point.y >= placement.y
    && point.y <= placement.y + placement.height;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readNumber(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function buildCanvasPlacementIndex(placements: CanvasPlacement[]): CanvasPlacementIndex {
  const all = [...placements];
  const visible = all.filter(isPlacementVisible);
  const zOrdered = [...visible].sort((a, b) => a.zIndex - b.zIndex);
  const byObjectId = new Map<string, CanvasPlacement>();
  const byPlacementId = new Map<string, CanvasPlacement>();

  all.forEach((placement) => {
    byObjectId.set(placement.objectId, placement);
    byPlacementId.set(placement.placementId, placement);
  });

  return {
    all,
    visible,
    zOrdered,
    byObjectId,
    byPlacementId,
  };
}

export function buildCanvasSceneRuntime(model: NoteCanvasRuntimeModel): CanvasSceneRuntime {
  return {
    canvasId: model.canvasPlacements[0]?.canvasId || 'primary-note-canvas',
    model,
    objects: [...model.canvasObjects],
    mounts: [...model.contentMounts],
    placementIndex: buildCanvasPlacementIndex(model.canvasPlacements),
    objectById: new Map(model.canvasObjects.map((object) => [object.objectId, object])),
    mountByObjectId: new Map(model.contentMounts.map((mount) => [mount.objectId, mount])),
  };
}

export function hitTestCanvasScene(
  scene: CanvasSceneRuntime,
  viewportPoint: CanvasPoint,
): CanvasHitResult | null {
  const worldPoint = viewportPointToWorldPoint(viewportPoint, scene.model.viewport);
  const candidates = [...scene.placementIndex.zOrdered].reverse();
  const placement = candidates.find((candidate) => pointInPlacement(worldPoint, candidate));
  if (!placement) return null;

  return {
    objectId: placement.objectId,
    placementId: placement.placementId,
    object: scene.objectById.get(placement.objectId) || null,
    placement,
  };
}

export function selectCanvasObjects(
  scene: CanvasSceneRuntime,
  objectIds: string[],
): CanvasSelectionState {
  const selectedObjectIds = objectIds.filter((objectId) => scene.objectById.has(objectId));
  return {
    selectedObjectIds,
    primaryObjectId: selectedObjectIds[0] || null,
  };
}

export function createMoveCanvasObjectCommand({
  canvasId,
  objectId,
  actor,
  x,
  y,
}: MoveCanvasObjectCommandInput): CanvasCommand {
  return {
    commandId: `canvas-command:${canvasId}:move:${objectId}:${Math.round(x)}:${Math.round(y)}`,
    canvasId,
    kind: 'move_canvas_object',
    actor,
    payload: {
      objectId,
      x,
      y,
    },
  };
}

export function createCanvasDeltaForCommand(
  scene: CanvasSceneRuntime,
  command: CanvasCommand,
): CanvasDelta {
  if (command.kind !== 'move_canvas_object' || !isRecord(command.payload)) {
    return { commandId: command.commandId };
  }

  const objectId = readString(command.payload, 'objectId');
  const x = readNumber(command.payload, 'x');
  const y = readNumber(command.payload, 'y');
  if (!objectId || x === null || y === null) return { commandId: command.commandId };

  const placement = scene.placementIndex.byObjectId.get(objectId);
  if (!placement) return { commandId: command.commandId };

  return {
    commandId: command.commandId,
    updated: [{
      kind: 'canvas_placement',
      id: placement.placementId,
      before: placement,
      after: {
        ...placement,
        x,
        y,
      },
    }],
  };
}
