import type {
  BlockPlacementModel,
  CanvasAIReadableSnapshot,
  CanvasObject,
  CanvasObjectReserve,
  CanvasPlacement,
  CanvasViewport,
  CanvasWorldModel,
  ContentMount,
  DocumentTypographyProfile,
  ImageCanvasObject,
  NoteCanvasMode,
  NoteCanvasRuntimeModel,
  PageFrameExtension,
  PageFrameModel,
  PageStackBlockFragmentProjection,
  PageStackModel,
  RelationEndpointReserve,
  StructuredCanvasObject,
  VisualConnector,
  VisualStyle,
} from './types';
import { getVisibleBlockIds } from './geometry';
import { createCanvasAIReadableSnapshot } from './canvasAiTreeService';
import {
  createPageFramePrintProfile,
  normalizePageFramePrintBaseline,
} from './pageFramePrintScaleService';
import {
  createDefaultDocumentTypographyProfile,
  normalizeDocumentTypographyProfile,
} from './typographyProfileService';
import {
  createDefaultPageFrameSlots,
} from './pageFrameSlotService';
import {
  DEFAULT_PAGE_FRAME_TEMPLATE_ID,
  applyPageFrameTemplate,
  createPageFrameTemplate,
  resolvePageFrameTemplate,
} from './pageFrameTemplateService';
import {
  normalizePageStacks,
  resolvePageStackContext,
  type PageStackContext,
} from './pageStackCollectionService';
import {
  derivePageStackBlockFragments,
} from './pageStackBlockFragmentService';
import {
  placementForVisualConnector,
  resolveVisualConnectorWithPlacements,
} from './visualConnectorService';

export const NOTE_CANVAS_ENGINE_VERSION = 'V2.BN.8-self-owned-minimal-hybrid-0';

export const DEFAULT_CANVAS_WORLD: CanvasWorldModel = {
  origin: { x: 0, y: 0 },
  width: 4096,
  height: 2600,
};

const DEFAULT_PAGE_FRAME_PRINT_PROFILE = createPageFramePrintProfile();
const DEFAULT_PAGE_FRAME_TEMPLATE = createPageFrameTemplate(DEFAULT_PAGE_FRAME_TEMPLATE_ID);

export const DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH = DEFAULT_PAGE_FRAME_PRINT_PROFILE.contentWidth;
export const DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET = DEFAULT_PAGE_FRAME_PRINT_PROFILE.contentInset;

export const DEFAULT_PRIMARY_PAGE_FRAME: PageFrameModel = {
  id: 'primary-page-frame',
  role: 'primary_page_frame',
  templateId: DEFAULT_PAGE_FRAME_TEMPLATE.templateId,
  pageSize: DEFAULT_PAGE_FRAME_PRINT_PROFILE.pageSize,
  background: DEFAULT_PAGE_FRAME_TEMPLATE.background,
  exportable: true,
  x: 0,
  y: 0,
  width: DEFAULT_PAGE_FRAME_PRINT_PROFILE.width,
  height: DEFAULT_PAGE_FRAME_PRINT_PROFILE.height,
  contentInset: DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET,
};

export const CANVAS_PRIMARY_PAGE_OFFSET_X = 96;
export const CANVAS_VIEWPORT_MIN_ZOOM = 0.45;
export const CANVAS_VIEWPORT_MAX_ZOOM = 2.4;

export function createPrimaryPageFrame(options: Partial<PageFrameModel> = {}): PageFrameModel {
  const template = createPageFrameTemplate(options.templateId || DEFAULT_PRIMARY_PAGE_FRAME.templateId);
  const templatedFrame = applyPageFrameTemplate(DEFAULT_PRIMARY_PAGE_FRAME, template);
  return normalizePageFramePrintBaseline({
    ...templatedFrame,
    ...options,
    id: options.id || DEFAULT_PRIMARY_PAGE_FRAME.id,
    role: 'primary_page_frame',
    templateId: options.templateId || template.templateId,
    pageSize: options.pageSize || template.pageSize,
    background: options.background || template.background,
    exportable: options.exportable ?? template.exportable,
    contentInset: options.contentInset || template.contentInset,
  });
}

export function createViewport(options: Partial<CanvasViewport> = {}): CanvasViewport {
  return {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    zoom: 1,
    minZoom: CANVAS_VIEWPORT_MIN_ZOOM,
    maxZoom: CANVAS_VIEWPORT_MAX_ZOOM,
    ...options,
  };
}

function buildPageFrameObject(pageFrame: PageFrameModel, canvasId: string): CanvasObject {
  return {
    objectId: pageFrame.id,
    canvasId,
    kind: 'page_frame',
    backing: 'none',
    objectClass: 'pure',
    status: 'active',
    source: 'runtime_seed',
  };
}

function buildPageFramePlacement(pageFrame: PageFrameModel, canvasId: string): CanvasPlacement {
  const normalizedFrame = normalizePageFramePrintBaseline(pageFrame);
  return {
    placementId: `${normalizedFrame.id}:placement`,
    objectId: normalizedFrame.id,
    canvasId,
    frameId: normalizedFrame.id,
    surface: 'formal_page',
    boundaryRole: 'inside',
    x: normalizedFrame.x,
    y: normalizedFrame.y,
    width: normalizedFrame.width,
    height: normalizedFrame.height,
    rotation: 0,
    zIndex: -100,
    snapState: 'snapped',
    visibilityState: 'normal',
    renderVisibility: 'visible',
  };
}

function buildPageFrameExtension(
  pageFrame: PageFrameModel,
  pageStackContext: PageStackContext | null = null,
  documentTypography = createDefaultDocumentTypographyProfile(),
): PageFrameExtension {
  const normalizedFrame = normalizePageFramePrintBaseline(pageFrame);
  const template = resolvePageFrameTemplate(normalizedFrame);
  const slots = createDefaultPageFrameSlots({
    pageFrame: normalizedFrame,
    pageIndex: pageStackContext?.index || 0,
    totalPages: pageStackContext?.total || 1,
  });
  const pageStackNumberLabel = pageStackContext?.pageNumberLabel || null;
  const normalizedSlots = slots.pageNumber && pageStackNumberLabel
    ? {
      ...slots,
      pageNumber: {
        ...slots.pageNumber,
        text: pageStackNumberLabel,
      },
    }
    : slots;
  return {
    frameId: normalizedFrame.id,
    objectId: normalizedFrame.id,
    pageStackId: pageStackContext?.stack.id || null,
    pageStackPageIndex: pageStackContext?.index ?? null,
    pageStackPageTotal: pageStackContext?.total ?? null,
    pageStackCollapsed: pageStackContext?.stack.collapsed || false,
    pageStackCollapsedPreviewPages: pageStackContext?.stack.layout.collapsedPreviewPages ?? null,
    pageStackNumberLabel,
    templateId: template.templateId,
    pageSize: normalizedFrame.pageSize || DEFAULT_PAGE_FRAME_PRINT_PROFILE.pageSize,
    width: normalizedFrame.width,
    height: normalizedFrame.height,
    contentInset: normalizedFrame.contentInset,
    background: template.background,
    defaultTypographyToken: template.defaultTypographyToken,
    documentTypography: normalizeDocumentTypographyProfile(documentTypography),
    rulerEnabled: false,
    snapEnabled: true,
    headerFooterEnabled: true,
    pageNumberEnabled: true,
    slots: normalizedSlots,
    exportable: normalizedFrame.exportable,
  };
}

function buildBlockCanvasObject(placement: BlockPlacementModel): CanvasObject {
  return {
    objectId: placement.objectId,
    canvasId: placement.canvasId,
    kind: 'paragraph_block_projection',
    backing: 'note_block',
    objectClass: 'block_backed',
    status: 'active',
    source: 'runtime_seed',
  };
}

function buildContentMountForBlockPlacement(placement: BlockPlacementModel): ContentMount {
  return {
    mountId: `${placement.objectId}:mount:note-block`,
    objectId: placement.objectId,
    targetKind: 'note_block',
    targetId: placement.blockId,
    projectionMode: 'owned',
    syncPolicy: 'manual',
  };
}

function buildCanvasPlacementFromBlockPlacement(placement: BlockPlacementModel): CanvasPlacement {
  return {
    placementId: placement.placementId,
    objectId: placement.objectId,
    canvasId: placement.canvasId,
    frameId: placement.frameId,
    surface: placement.surface,
    boundaryRole: placement.boundaryRole,
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    rotation: placement.rotation,
    zIndex: placement.zIndex,
    snapState: placement.snapState,
    visibilityState: placement.visibilityState,
    renderVisibility: placement.visibilityState === 'ai_hidden' || placement.visibilityState === 'export_hidden'
      ? 'hidden'
      : 'visible',
  };
}

function buildCanvasObjectFromReserve(reserve: CanvasObjectReserve, canvasId: string): CanvasObject {
  return {
    objectId: reserve.id,
    canvasId,
    kind: reserve.kind === 'image' ? 'image' : 'shape',
    backing: 'none',
    objectClass: 'pure',
    status: 'active',
    source: 'runtime_seed',
  };
}

function buildPlacementFromReserve(reserve: CanvasObjectReserve, canvasId: string, zIndex: number): CanvasPlacement {
  return {
    placementId: `${reserve.id}:placement`,
    objectId: reserve.id,
    canvasId,
    surface: 'canvas_workspace',
    boundaryRole: 'outside',
    x: reserve.x,
    y: reserve.y,
    width: reserve.width,
    height: reserve.height,
    rotation: reserve.rotation || 0,
    zIndex,
    snapState: 'free',
    visibilityState: 'normal',
    renderVisibility: 'visible',
  };
}

function buildCanvasAIReadableSnapshot({
  canvasId,
  objects,
  placements,
  mounts,
  pageFrameExtensions,
  pageStacks,
  blockFragmentProjections,
  primaryPageFrameId,
  visualConnectors,
  imageObjects,
  structuredObjects,
  textByContentTargetId,
}: {
  canvasId: string;
  objects: CanvasObject[];
  placements: CanvasPlacement[];
  mounts: ContentMount[];
  pageFrameExtensions: PageFrameExtension[];
  pageStacks: PageStackModel[];
  blockFragmentProjections: PageStackBlockFragmentProjection[];
  primaryPageFrameId: string | null;
  visualConnectors?: VisualConnector[];
  imageObjects?: ImageCanvasObject[];
  structuredObjects?: StructuredCanvasObject[];
  textByContentTargetId?: Record<string, string>;
}): CanvasAIReadableSnapshot {
  return createCanvasAIReadableSnapshot({
    canvasId,
    objects,
    placements,
    mounts,
    pageFrameExtensions,
    pageStacks,
    blockFragmentProjections,
    primaryPageFrameId,
    visualConnectors,
    imageObjects,
    structuredObjects,
    textByContentTargetId,
  });
}

export function buildNoteCanvasRuntimeModel({
  mode,
  world = DEFAULT_CANVAS_WORLD,
  primaryPageFrame,
  pageFrames,
  pageStacks = [],
  viewport,
  blockPlacements: inputBlockPlacements,
  documentTypography = createDefaultDocumentTypographyProfile(),
  canvasObjectReserve = [],
  relationEndpointReserve = [],
  genericCanvasObjects = [],
  genericCanvasPlacements = [],
  genericContentMounts = [],
  genericVisualConnectors = [],
  genericImageObjects = [],
  genericStructuredObjects = [],
  textByContentTargetId = {},
}: {
  mode: NoteCanvasMode;
  world?: CanvasWorldModel;
  primaryPageFrame: PageFrameModel | null;
  pageFrames?: PageFrameModel[];
  pageStacks?: PageStackModel[];
  viewport: CanvasViewport;
  blockPlacements: BlockPlacementModel[];
  documentTypography?: DocumentTypographyProfile;
  canvasObjectReserve?: CanvasObjectReserve[];
  relationEndpointReserve?: RelationEndpointReserve[];
  genericCanvasObjects?: CanvasObject[];
  genericCanvasPlacements?: CanvasPlacement[];
  genericContentMounts?: ContentMount[];
  genericVisualConnectors?: VisualConnector[];
  genericImageObjects?: ImageCanvasObject[];
  genericStructuredObjects?: StructuredCanvasObject[];
  textByContentTargetId?: Record<string, string>;
}): NoteCanvasRuntimeModel {
  const trayPlacementIds = new Set(genericCanvasPlacements
    .filter((placement) => placement.surface === 'tray').map((placement) => placement.placementId));
  const trayObjectIds = new Set(genericCanvasPlacements
    .filter((placement) => placement.surface === 'tray').map((placement) => placement.objectId));
  const placedObjectIds = new Set(genericCanvasPlacements
    .filter((placement) => placement.surface !== 'tray').map((placement) => placement.objectId));
  const blockPlacements = inputBlockPlacements.filter((placement) => placement.surface !== 'tray'
    && !trayPlacementIds.has(placement.placementId));
  const canvasId = blockPlacements[0]?.canvasId || 'primary-note-canvas';
  const runtimePageFrames = (pageFrames || (primaryPageFrame ? [primaryPageFrame] : []))
    .map(normalizePageFramePrintBaseline);
  const runtimePageStacks = normalizePageStacks({
    pageFrames: runtimePageFrames,
    pageStacks,
    primaryFrameId: primaryPageFrame?.id ?? runtimePageFrames[0]?.id ?? null,
    selectedFrameId: primaryPageFrame?.id ?? runtimePageFrames[0]?.id ?? null,
  });
  const pageStackCollectionContext = {
    pageFrames: runtimePageFrames,
    pageStacks: runtimePageStacks,
    primaryFrameId: primaryPageFrame?.id ?? runtimePageFrames[0]?.id ?? null,
  };
  const blockFragmentProjections = blockPlacements.flatMap((placement) => (
    derivePageStackBlockFragments({
      collection: pageStackCollectionContext,
      blockId: placement.blockId,
      layout: placement,
    })
  ));
  const pageFrameObjects = runtimePageFrames.map((pageFrame) => buildPageFrameObject(pageFrame, canvasId));
  const pageFramePlacements = runtimePageFrames.map((pageFrame) => buildPageFramePlacement(pageFrame, canvasId));
  const activeDocumentTypography = normalizeDocumentTypographyProfile(documentTypography);
  const pageFrameExtensions = runtimePageFrames.map((pageFrame) => buildPageFrameExtension(
    pageFrame,
    resolvePageStackContext(pageStackCollectionContext, pageFrame.id),
    activeDocumentTypography,
  ));
  const blockCanvasObjects = blockPlacements.map(buildBlockCanvasObject);
  const blockCanvasPlacements = blockPlacements.map(buildCanvasPlacementFromBlockPlacement);
  const reserveObjects = canvasObjectReserve.map((reserve) => buildCanvasObjectFromReserve(reserve, canvasId));
  const reservePlacements = canvasObjectReserve.map((reserve, index) => (
    buildPlacementFromReserve(reserve, canvasId, blockPlacements.length + index)
  ));
  const builtObjectIds = new Set([
    ...pageFrameObjects,
    ...blockCanvasObjects,
    ...reserveObjects,
  ].map((object) => object.objectId));
  const runtimeGenericObjects = genericCanvasObjects.filter((object) => (
    object.kind !== 'page_frame'
    && object.kind !== 'paragraph_block_projection'
    && (!trayObjectIds.has(object.objectId) || placedObjectIds.has(object.objectId))
    && !builtObjectIds.has(object.objectId)
  ));
  const runtimeGenericObjectIds = new Set(runtimeGenericObjects.map((object) => object.objectId));
  const runtimeGenericPlacements = genericCanvasPlacements.filter((placement) => (
    runtimeGenericObjectIds.has(placement.objectId)
    && placement.surface !== 'tray'
  ));
  const runtimeGenericContentMounts = genericContentMounts.filter((mount) => (
    runtimeGenericObjectIds.has(mount.objectId)
  ));
  const canvasObjects: CanvasObject[] = [
    ...pageFrameObjects,
    ...blockCanvasObjects,
    ...reserveObjects,
    ...runtimeGenericObjects,
  ];
  const baseCanvasPlacements: CanvasPlacement[] = [
    ...pageFramePlacements,
    ...blockCanvasPlacements,
    ...reservePlacements,
    ...runtimeGenericPlacements,
  ];
  const contentMounts = [
    ...blockPlacements.map(buildContentMountForBlockPlacement),
    ...runtimeGenericContentMounts,
  ];
  const visualConnectors = genericVisualConnectors
    .filter((connector) => runtimeGenericObjectIds.has(connector.objectId))
    .map((connector) => resolveVisualConnectorWithPlacements(connector, baseCanvasPlacements));
  const imageObjects = genericImageObjects.filter((image) => runtimeGenericObjectIds.has(image.objectId));
  const structuredObjects = genericStructuredObjects.filter((structured) => (
    runtimeGenericObjectIds.has(structured.objectId)
  ));
  const connectorByObjectId = new Map(visualConnectors.map((connector) => [connector.objectId, connector]));
  const canvasPlacements = baseCanvasPlacements.map((placement) => {
    const connector = connectorByObjectId.get(placement.objectId);
    return connector ? placementForVisualConnector(placement, connector) : placement;
  });
  const visualStyles: VisualStyle[] = [];
  const canvasAIReadableSnapshot = buildCanvasAIReadableSnapshot({
    canvasId,
    objects: canvasObjects,
    placements: canvasPlacements,
    mounts: contentMounts,
    pageFrameExtensions,
    pageStacks: runtimePageStacks,
    blockFragmentProjections,
    primaryPageFrameId: primaryPageFrame?.id ?? null,
    visualConnectors,
    imageObjects,
    structuredObjects,
    textByContentTargetId,
  });

  return {
    version: NOTE_CANVAS_ENGINE_VERSION,
    route: 'self_owned_minimal_hybrid',
    mode,
    world,
    viewport,
    primaryPageFrame,
    pageFrames: runtimePageFrames,
    pageStacks: runtimePageStacks,
    blockPlacements,
    canvasObjects,
    canvasPlacements,
    contentMounts,
    pageFrameExtensions,
    blockFragmentProjections,
    visualStyles,
    visualConnectors,
    imageObjects,
    structuredObjects,
    canvasAIReadableSnapshot,
    visibleBlockIds: getVisibleBlockIds(blockPlacements, viewport),
    canvasObjectReserve,
    relationEndpointReserve,
  };
}
