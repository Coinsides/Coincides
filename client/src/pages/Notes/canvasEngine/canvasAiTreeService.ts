import type {
  CanvasAIReadableNode,
  CanvasAIReadableSnapshot,
  CanvasObject,
  CanvasPlacement,
  CanvasRect,
  ContentMount,
  DocumentTypographyProfile,
  ImageCanvasObject,
  PageFrameExtension,
  PageStackBlockFragmentProjection,
  PageStackBlockFragmentRef,
  PageStackModel,
  StructuredCanvasObject,
  VisualConnector,
} from './types';
import { createCanvasObjectPresentationRef } from './objectStyleService';

export interface CreateCanvasAIReadableSnapshotInput {
  canvasId: string;
  objects: CanvasObject[];
  placements: CanvasPlacement[];
  mounts: ContentMount[];
  pageFrameExtensions?: PageFrameExtension[];
  pageStacks?: PageStackModel[];
  blockFragmentProjections?: PageStackBlockFragmentProjection[];
  primaryPageFrameId?: string | null;
  visualConnectors?: VisualConnector[];
  imageObjects?: ImageCanvasObject[];
  structuredObjects?: StructuredCanvasObject[];
  selectedObjectIds?: string[];
  textByContentTargetId?: Record<string, string>;
}

function placementVisible(placement: CanvasPlacement): boolean {
  return placement.renderVisibility !== 'hidden' && placement.renderVisibility !== 'collapsed';
}

function readingOrderCompare(a: CanvasAIReadableNode, b: CanvasAIReadableNode): number {
  if (a.bbox.y !== b.bbox.y) return a.bbox.y - b.bbox.y;
  if (a.bbox.x !== b.bbox.x) return a.bbox.x - b.bbox.x;
  return a.zIndex - b.zIndex;
}

function createContentBboxFromPageFrameExtension(
  placement: CanvasPlacement,
  pageFrameExtension: PageFrameExtension,
): CanvasRect {
  return {
    x: placement.x + pageFrameExtension.contentInset.left,
    y: placement.y + pageFrameExtension.contentInset.top,
    width: Math.max(
      0,
      placement.width - pageFrameExtension.contentInset.left - pageFrameExtension.contentInset.right,
    ),
    height: Math.max(
      0,
      placement.height - pageFrameExtension.contentInset.top - pageFrameExtension.contentInset.bottom,
    ),
  };
}

function createDocumentTypographyRef(
  profile: DocumentTypographyProfile | undefined,
): DocumentTypographyProfile | undefined {
  if (!profile) return undefined;
  return {
    profileId: profile.profileId,
    fontFamily: profile.fontFamily,
    fontSizePx: profile.fontSizePx,
    lineHeightPx: profile.lineHeightPx,
    paragraphSpacingPx: profile.paragraphSpacingPx,
    averageCharWidthPx: profile.averageCharWidthPx,
  };
}

function toBlockFragmentRefs(
  fragments: PageStackBlockFragmentProjection[] | undefined,
): PageStackBlockFragmentRef[] | undefined {
  if (!fragments?.length) return undefined;
  return fragments.map((fragment) => ({
    pageStackId: fragment.pageStackId,
    pageFrameId: fragment.pageFrameId,
    pageIndex: fragment.pageIndex,
    pageTotal: fragment.pageTotal,
    fragmentIndex: fragment.fragmentIndex,
    fragmentTotal: fragment.fragmentTotal,
    role: fragment.role,
    visibleRect: fragment.visibleRect,
    clippedTop: fragment.clippedTop,
    clippedBottom: fragment.clippedBottom,
  }));
}

function createNode({
  placement,
  object,
  mount,
  connector,
  imageObject,
  structuredObject,
  pageFrameExtension,
  blockFragments,
  primaryPageFrameId,
  selected,
  textByContentTargetId,
}: {
  placement: CanvasPlacement;
  object: CanvasObject | undefined;
  mount: ContentMount | undefined;
  connector: VisualConnector | undefined;
  imageObject: ImageCanvasObject | undefined;
  structuredObject: StructuredCanvasObject | undefined;
  pageFrameExtension: PageFrameExtension | undefined;
  blockFragments: PageStackBlockFragmentProjection[] | undefined;
  primaryPageFrameId: string | null | undefined;
  selected: boolean;
  textByContentTargetId: Record<string, string>;
}): CanvasAIReadableNode {
  const contentRef = mount
    ? {
      kind: mount.targetKind,
      id: mount.targetId,
    }
    : undefined;
  const text = contentRef ? textByContentTargetId[contentRef.id] : undefined;
  const presentationRef = createCanvasObjectPresentationRef(object, Boolean(contentRef));

  return {
    id: placement.objectId,
    kind: object?.kind || 'structured_object',
    bbox: {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    },
    zIndex: placement.zIndex,
    surface: placement.surface,
    frameId: placement.frameId,
    visible: placementVisible(placement),
    selected,
    pageStackId: pageFrameExtension?.pageStackId ?? null,
    pageStackPageIndex: pageFrameExtension?.pageStackPageIndex ?? null,
    pageStackPageTotal: pageFrameExtension?.pageStackPageTotal ?? null,
    pageStackBlockFragments: toBlockFragmentRefs(blockFragments),
    text,
    summary: connector
      ? `visual connector ${connector.startObjectId || 'free'} -> ${connector.endObjectId || 'free'}`
      : imageObject
      ? imageObject.caption || imageObject.altText || imageObject.asset.filename
      : structuredObject
        ? `${structuredObject.structuredKind} ${structuredObject.rowCount}x${structuredObject.columnCount}`
      : undefined,
    presentationRef,
    contentRef,
    connectorRef: connector
      ? {
        startKind: connector.startKind,
        endKind: connector.endKind,
        startObjectId: connector.startObjectId,
        endObjectId: connector.endObjectId,
        startAnchor: connector.startAnchor,
        endAnchor: connector.endAnchor,
        relationKind: connector.relationKind,
        start: connector.start,
        end: connector.end,
      }
      : undefined,
    imageRef: imageObject
      ? {
        assetId: imageObject.assetId,
        filename: imageObject.asset.filename,
        mimeType: imageObject.asset.mimeType,
        width: imageObject.naturalWidth || imageObject.asset.width,
        height: imageObject.naturalHeight || imageObject.asset.height,
        fit: imageObject.fit,
        caption: imageObject.caption,
        altText: imageObject.altText,
      }
      : undefined,
    structuredRef: structuredObject
      ? {
        structuredKind: structuredObject.structuredKind,
        schemaVersion: structuredObject.schemaVersion,
        rowCount: structuredObject.rowCount,
        columnCount: structuredObject.columnCount,
        payload: structuredObject.payload,
      }
      : undefined,
    contentBbox: pageFrameExtension
      ? createContentBboxFromPageFrameExtension(placement, pageFrameExtension)
      : undefined,
    pageFrameRef: pageFrameExtension
      ? {
        role: primaryPageFrameId === placement.objectId ? 'primary_page_frame' : 'secondary_page_frame',
        templateId: pageFrameExtension.templateId,
        pageSize: pageFrameExtension.pageSize,
        exportable: pageFrameExtension.exportable,
        contentInset: pageFrameExtension.contentInset,
        defaultTypographyToken: pageFrameExtension.defaultTypographyToken,
        documentTypography: createDocumentTypographyRef(pageFrameExtension.documentTypography),
        headerFooterEnabled: pageFrameExtension.headerFooterEnabled,
        pageNumberEnabled: pageFrameExtension.pageNumberEnabled,
        stackId: pageFrameExtension.pageStackId,
        stackPageIndex: pageFrameExtension.pageStackPageIndex,
        stackPageTotal: pageFrameExtension.pageStackPageTotal,
        primary: primaryPageFrameId === placement.objectId,
      }
      : undefined,
    pageFrameStyle: pageFrameExtension
      ? {
        background: pageFrameExtension.background,
      }
      : undefined,
    pageFrameSlots: pageFrameExtension?.slots,
  };
}

function createEmptyBbox(): CanvasRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
}

function unionBbox(rects: CanvasRect[]): CanvasRect {
  if (rects.length === 0) return createEmptyBbox();
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function createPageStackNode(
  stack: PageStackModel,
  frameById: Map<string, CanvasAIReadableNode>,
): CanvasAIReadableNode {
  const frameNodes = stack.frameIds
    .map((frameId) => frameById.get(frameId))
    .filter((node): node is CanvasAIReadableNode => Boolean(node));
  return {
    id: stack.id,
    kind: 'page_stack',
    label: stack.displayName,
    bbox: unionBbox(frameNodes.map((node) => node.bbox)),
    zIndex: -120,
    surface: 'formal_page',
    visible: true,
    pageStackId: stack.id,
    pageStackPageTotal: stack.frameIds.length,
    state: {
      collapsed: stack.collapsed,
      pageCount: stack.frameIds.length,
      numberingStart: stack.numbering.startAt,
    },
    children: stack.frameIds.map((frameId, index) => {
      const frameNode = frameById.get(frameId);
      return {
        id: `${stack.id}:${frameId}:reference`,
        kind: 'page_frame_reference',
        label: frameId,
        bbox: frameNode?.bbox || createEmptyBbox(),
        zIndex: -110,
        surface: 'formal_page',
        frameId,
        visible: frameNode?.visible ?? true,
        order: index,
        readingOrder: index,
        pageStackId: stack.id,
        pageStackPageIndex: index,
        pageStackPageTotal: stack.frameIds.length,
      };
    }),
  };
}

export function createCanvasAIReadableSnapshot({
  canvasId,
  objects,
  placements,
  mounts,
  pageFrameExtensions = [],
  pageStacks = [],
  blockFragmentProjections = [],
  primaryPageFrameId = null,
  visualConnectors = [],
  imageObjects = [],
  structuredObjects = [],
  selectedObjectIds = [],
  textByContentTargetId = {},
}: CreateCanvasAIReadableSnapshotInput): CanvasAIReadableSnapshot {
  const objectById = new Map(objects.map((object) => [object.objectId, object]));
  const mountByObjectId = new Map(mounts.map((mount) => [mount.objectId, mount]));
  const pageFrameExtensionByObjectId = new Map(
    pageFrameExtensions.map((extension) => [extension.objectId, extension]),
  );
  const blockFragmentsByObjectId = new Map<string, PageStackBlockFragmentProjection[]>();
  blockFragmentProjections.forEach((fragment) => {
    const existing = blockFragmentsByObjectId.get(fragment.blockId) || [];
    blockFragmentsByObjectId.set(fragment.blockId, [...existing, fragment]);
  });
  const connectorByObjectId = new Map(visualConnectors.map((connector) => [connector.objectId, connector]));
  const imageObjectByObjectId = new Map(imageObjects.map((image) => [image.objectId, image]));
  const structuredObjectByObjectId = new Map(
    structuredObjects.map((structured) => [structured.objectId, structured]),
  );
  const selected = new Set(selectedObjectIds);
  const rawNodes = placements.map((placement) => createNode({
    placement,
    object: objectById.get(placement.objectId),
    mount: mountByObjectId.get(placement.objectId),
    connector: connectorByObjectId.get(placement.objectId),
    imageObject: imageObjectByObjectId.get(placement.objectId),
    structuredObject: structuredObjectByObjectId.get(placement.objectId),
    pageFrameExtension: pageFrameExtensionByObjectId.get(placement.objectId),
    blockFragments: blockFragmentsByObjectId.get(placement.objectId),
    primaryPageFrameId,
    selected: selected.has(placement.objectId),
    textByContentTargetId,
  }));
  const frameNodes = rawNodes
    .filter((node) => node.kind === 'page_frame')
    .map((node) => ({ ...node, children: [] as CanvasAIReadableNode[] }));
  const frameById = new Map(frameNodes.map((node) => [node.id, node]));
  const pageStackNodes = pageStacks.map((stack) => createPageStackNode(stack, frameById));
  const topLevelNodes: CanvasAIReadableNode[] = [...pageStackNodes, ...frameNodes];

  rawNodes
    .filter((node) => node.kind !== 'page_frame')
    .forEach((node) => {
      const frameNode = node.frameId ? frameById.get(node.frameId) : null;
      if (frameNode) {
        frameNode.children = [...(frameNode.children || []), node];
        return;
      }

      topLevelNodes.push(node);
    });

  frameNodes.forEach((frameNode) => {
    const orderedChildren = [...(frameNode.children || [])].sort(readingOrderCompare);
    frameNode.children = orderedChildren.map((child, index) => ({
      ...child,
      readingOrder: index,
    }));
  });

  return {
    snapshotId: `${canvasId}:derived-runtime-snapshot`,
    canvasId,
    source: 'derived_runtime',
    nodes: topLevelNodes,
    selectedObjectIds: [...selected],
  };
}
