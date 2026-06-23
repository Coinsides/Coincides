import {
  buildNoteCanvasRuntimeModel,
  createViewport,
  DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH,
} from '../src/pages/Notes/canvasEngine/engineModel';
import {
  createRuntimeViewport,
  createRuntimeWorld,
  panViewportByViewportDelta,
  scrollViewportByViewportDelta,
  viewportPointToWorldPoint,
  zoomViewportAtViewportPoint,
} from '../src/pages/Notes/canvasEngine/viewportService';
import {
  calculatePageFrameHeight,
  createDefaultDraftLayout,
  createRuntimePageFrame,
} from '../src/pages/Notes/canvasEngine/pageFrameService';
import {
  buildLayoutPayload,
  buildRelationEndpointReserveForPlacement,
  buildRuntimeBlockPlacement,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
  normalizeBlockLayout,
  readStoredLayout,
  writeLayoutOverride,
} from '../src/pages/Notes/canvasEngine/placementService';
import {
  applyMeasuredBlockHeightToLayouts,
} from '../src/pages/Notes/canvasEngine/measurementService';
import {
  createBlankDraftLayout,
  createSurfaceModePolicy,
  createSurfaceModeTransitionPolicy,
  getVisibleBlocksForSurface,
  shouldResolvePageCollisions,
  shouldUseElasticAvoidance,
} from '../src/pages/Notes/canvasEngine/modePolicyService';
import {
  getRuntimeHistoryKeyboardIntent,
} from '../src/pages/Notes/canvasEngine/historyService';
import {
  calculateDraggedBlockLayouts,
} from '../src/pages/Notes/canvasEngine/interactionController';
import {
  contentForEditedBlock,
  contentForTemplate,
  plainTextForBlockContent,
  textFromContent,
} from '../src/pages/Notes/canvasEngine/blockContentService';
import {
  createViewportOverlayAnchor,
  createWorldOverlayAnchor,
  placeAnchoredOverlay,
  placeSelectionToolbar,
  worldRectToViewportRect,
} from '../src/pages/Notes/canvasEngine/overlayService';
import {
  DEFAULT_BLOCK_HEIGHT,
  CANVAS_WORKSPACE_WIDTH,
  DEFAULT_PAGE_CONTENT_WIDTH,
  DEFAULT_PAGE_FRAME_CONTENT_INSET,
  DEFAULT_PAGE_FRAME_HEIGHT,
  MIN_BLOCK_HEIGHT,
  NOTE_LAYOUT_KEY,
  PAGE_FRAME_BOTTOM_PADDING,
  type BlockBoxLayout,
} from '../src/pages/Notes/canvasEngine/runtimeLayout';
import type { NoteBlock } from '../src/pages/Notes/canvasEngine/runtimeDataTypes';
import {
  attachFreshTextFlow,
  createEmptyTextBlockContentV1,
  createTextBlockContentV1,
  createTextFlowFromDroppedText,
  getTextFlowContent,
  projectNoteBlockTextFlow,
  projectTextFlowContent,
  replaceTextUnitText,
  TEXT_FLOW_CONTENT_KEY,
} from '../src/pages/Notes/canvasEngine/textFlowService';
import {
  acceptAnnotationProposal,
  addChildAnnotationLink,
  addRangeToAnnotationTruth,
  createAnnotationProposal,
  createAnnotationTruth,
  createBlockAnnotationRange,
  createTextSpanAnnotationRange,
  createTextUnitAnnotationRange,
  hideAnnotationTruth,
  renameAnnotationTruth,
  restoreAnnotationTruth,
  softDeleteAnnotationTruth,
  updateAnnotationColorToken,
} from '../src/pages/Notes/canvasEngine/annotationTruthService';
import {
  annotationRangeIdentityKey,
  attachChildAnnotation,
  canCreateAnnotationFromRanges,
  createChildAnnotationRangeFromParentRange,
  createAnnotationFromExistingRanges,
  getChildAnnotations,
  normalizeAnnotationHierarchy,
  mergeAnnotationRanges,
  resolveAnnotationInspectorRootIds,
  resolveAnnotationRootId,
} from '../src/pages/Notes/canvasEngine/annotationEditorService';
import {
  acceptContentGroupIdentity,
  addMembersToContentGroup,
  addMembersToPetal,
  addMemberFragmentToPetal,
  addContentGroupFragment,
  addPetalToContentGroup,
  archiveContentGroupIdentity,
  assignFragmentsToPetal,
  auditContentGroupIntegrity,
  compareContentGroupMemberWithSource,
  createContentGroup,
  createContentGroupFragmentFromMember,
  createContentGroupMemberFromAnnotation,
  createContentGroupMemberFromRange,
  markContentGroupMemberIntegrity,
  moveContentGroupToFolder,
  moveContentGroupPetal,
  normalizeContentGroup,
  normalizeContentGroupMember,
  normalizeContentGroupsWithFolders,
  refreshContentGroupMemberPreview,
  refreshContentGroupMemberFromSource,
  refreshContentGroupPreviews,
  removeContentGroupPetal,
  removeContentGroupMember,
  removeContentGroupPetalFragment,
  rejectContentGroupIdentity,
  renameContentGroup,
  renameContentGroupPetal,
  softDeleteContentGroup,
  summarizeContentGroupStability,
  updateContentGroupIdentityDraft,
  validateContentGroupGraph,
} from '../src/pages/Notes/canvasEngine/contentGroupService';
import {
  buildContentGroupIndex,
  filterContentGroupIndex,
} from '../src/pages/Notes/canvasEngine/contentGroupIndexService';
import {
  mergeEntityAndLegacyContentGroups,
  shouldImportLegacyContentGroups,
} from '../src/pages/Notes/canvasEngine/contentGroupEntityCutoverService';
import {
  NOTE_CONTENT_GROUPS_METADATA_KEY,
  NOTE_GROUP_FOLDERS_METADATA_KEY,
  stripLegacyContentGroupMetadata,
  stripLegacyGroupFolderMetadata,
  writeGroupFolderMetadata,
} from '../src/pages/Notes/canvasEngine/contentGroupMetadataService';
import {
  legacyGroupFoldersToImport,
  mergeEntityAndLegacyGroupFolders,
  shouldImportLegacyGroupFolders,
} from '../src/pages/Notes/canvasEngine/groupFolderEntityCutoverService';
import {
  plainTextFromContentGroupDragPayload,
} from '../src/pages/Notes/canvasEngine/contentGroupDragService';
import {
  buildContentGroupRelationCandidates,
} from '../src/pages/Notes/canvasEngine/contentGroupRelationProjectionService';
import {
  CONTENT_GROUP_REUSE_MODES,
  createContentGroupMaterializePlan,
  createContentGroupOpenOriginalDescriptor,
  createContentGroupReferenceDescriptor,
  duplicateContentGroupForContext,
  forkContentGroupForContext,
} from '../src/pages/Notes/canvasEngine/contentGroupReuseService';
import {
  CONTENT_GROUP_SURFACE_ROLES,
  contentGroupSurfaceRoleLabel,
  contentGroupSurfaceRoleList,
} from '../src/pages/Notes/canvasEngine/contentGroupSurfaceRoleService';
import {
  applyContentGroupEditorDraft,
} from '../src/pages/GroupGallery/singleContentGroupEditorService';
import {
  activeGroupFolders,
  canDeleteGroupFolder,
  canMoveGroupFolder,
  createGroupFolder,
  deleteGroupFolder,
  ensureGroupFolderRoots,
  groupFolderDerivedDepth,
  groupFolderChildren,
  groupFolderPath,
  moveGroupFolder,
  systemGroupFolderId,
  validateGroupFolderGraph,
} from '../src/pages/Notes/canvasEngine/groupFolderService';
import {
  createAnnotationRenderSegments,
  summarizeAnnotationsForBlock,
  summarizeAnnotationsForTextUnit,
} from '../src/pages/Notes/canvasEngine/annotationRenderService';
import {
  buildBlockAnnotationCluster,
  buildTextUnitAnnotationCluster,
  visibleAnnotationsForDisplay,
} from '../src/pages/Notes/canvasEngine/annotationDisplayService';
import {
  acceptAnnotationProposalToTruth,
  createReadingAnnotationProposal,
  createReadingInterpretation,
  projectAnnotationsForReading,
  projectContentGroupsForReading,
} from '../src/pages/Notes/canvasEngine/readingInterpretationService';
import {
  activateSelectionDraft,
  appendSelectionDraftRange,
  createSelectionDraftRangeFromCapturedSelection,
  replaceSelectionDraft,
  selectionDraftContainsCapturedSelection,
  selectionDraftRangeIdentityKey,
  selectionDraftRangesToAnnotationRanges,
} from '../src/pages/Notes/canvasEngine/selectionDraftService';
import {
  createAnnotationRangeFromCapturedSelection,
  createTextUnitAnnotationHighlightSegments,
  isFullTextUnitAnnotationRange,
  normalizeSelectionOffsets,
} from '../src/pages/Notes/canvasEngine/selectionRangeService';
import {
  applySourceBackedAnnotationRangeEdit,
  deriveSingleTextEditDelta,
  rebaseAnnotationsForTextUnitEdit,
  rebaseTextUnitAnnotationRanges,
} from '../src/pages/Notes/canvasEngine/rangeRebaseService';
import {
  indentTextUnit,
  mergeTextUnitWithPrevious,
  numberedListOrdinalForUnit,
  outdentTextUnit,
  parseTextUnitsFromPlainText,
  pasteTextIntoTextFlow,
  insertPlainTextIntoTextFlow,
  setTextUnitWritingRole,
  splitTextFlowAtUnit,
  splitTextUnitAtOffset,
  splitTextUnitForEnter,
  textUnitMarkerForDisplay,
  updateTextUnitMetadata,
  mergeTextFlows,
} from '../src/pages/Notes/canvasEngine/textUnitEditorService';
import { NOTE_SLASH_COMMANDS } from '../src/pages/Notes/noteSlashCommands';
import type { TemplateOption } from '../src/services/templateOptions';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertAtLeast(actual: number, expected: number, message: string): void {
  assert(actual >= expected, `${message}: expected at least ${expected}, got ${actual}`);
}

function createContractDomRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect;
}

const TEXT_FLOW_TEMPLATE_FIXTURES: TemplateOption[] = [
  {
    template_id: 'text.paragraph',
    template_key: 'text.paragraph',
    template_version: '1.0.0',
    label: 'Text',
    description: 'Plain paragraph block.',
    system_type: 'text',
    learning_role: 'general',
    legacy_block_type: 'paragraph',
    default_content: {},
    origin: 'contract_fixture',
    status: 'active',
    isRuntime: false,
  },
  {
    template_id: 'code.snippet',
    template_key: 'code.snippet',
    template_version: '1.0.0',
    label: 'Code',
    description: 'Code block.',
    system_type: 'code',
    learning_role: 'technical',
    legacy_block_type: 'code',
    default_content: {},
    origin: 'contract_fixture',
    status: 'active',
    isRuntime: false,
  },
];

function createBlock(id: string, layout?: Partial<BlockBoxLayout>, type = 'paragraph'): NoteBlock {
  return {
    id,
    placement_id: `placement-${id}`,
    display_overrides_json: layout
      ? {
        [NOTE_LAYOUT_KEY]: {
          ...layout,
          version: 'V2.BN.8',
        },
      }
      : {},
    block_type: type,
    title: null,
    content_json: { body: `Block ${id}` },
    plain_text: `Block ${id}`,
    metadata: type === 'formula' ? { template_key: 'formula.math' } : {},
    order_index: Number(id.replace(/\D/g, '')) || 0,
    source_references: [],
  };
}

// historyService is browser-aware. The model contract smoke runs in Node, so provide
// a minimal HTMLElement constructor before calling keyboard-intent helpers.
class RuntimeContractHTMLElement {
  closest(): null {
    return null;
  }
}

(globalThis as typeof globalThis & { HTMLElement: typeof HTMLElement }).HTMLElement =
  RuntimeContractHTMLElement as unknown as typeof HTMLElement;
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    innerWidth: 1280,
    innerHeight: 720,
  },
});

function testViewportAndWorld(): void {
  const pageViewport = createRuntimeViewport('page', 920);
  const canvasViewport = createRuntimeViewport('canvas', 920);
  const pageWorld = createRuntimeWorld('page', 920);
  const canvasWorld = createRuntimeWorld('canvas', 920);

  assertEqual(pageViewport.zoom, 1, 'page viewport keeps seed zoom');
  assertEqual(canvasViewport.zoom, 1, 'canvas viewport keeps seed zoom');
  assert(canvasViewport.x < 0, 'canvas viewport starts with left-side workspace headroom');
  assert(canvasViewport.y < 0, 'canvas viewport starts with top-side workspace headroom');
  assertEqual(pageViewport.width, DEFAULT_PAGE_CONTENT_WIDTH, 'page viewport uses page content width');
  assert(canvasViewport.width > pageViewport.width, 'canvas viewport is wider than the formal page');
  assertEqual(pageWorld.height, 920, 'page world height follows PageFrame height');
  assert(canvasWorld.width > pageWorld.width, 'canvas world is wider than page world');

  const originFromInitialViewport = viewportPointToWorldPoint({ x: 180, y: 64 }, canvasViewport);
  assertEqual(originFromInitialViewport.x, 0, 'initial canvas viewport leaves page-origin headroom on x');
  assertEqual(originFromInitialViewport.y, 0, 'initial canvas viewport leaves page-origin headroom on y');

  const dragged = panViewportByViewportDelta(canvasViewport, { x: 120, y: 80 });
  assert(dragged.x < canvasViewport.x, 'dragging canvas right moves viewport x left');
  assert(dragged.y < canvasViewport.y, 'dragging canvas down moves viewport y up');

  const scrolled = scrollViewportByViewportDelta(canvasViewport, { x: 120, y: 80 });
  assert(scrolled.x > canvasViewport.x, 'wheel scroll right moves viewport x right');
  assert(scrolled.y > canvasViewport.y, 'wheel scroll down moves viewport y down');

  const zoomed = zoomViewportAtViewportPoint({
    viewport: canvasViewport,
    point: { x: 240, y: 160 },
    nextZoom: 1.4,
  });
  assertEqual(Math.round(zoomed.zoom * 10), 14, 'canvas viewport zooms independently from browser zoom');
}

function testPageFrameAndWorkspacePolicy(): void {
  const pageBlock = createBlock('page-1', {
    x: 0,
    y: 0,
    width: 320,
    height: 88,
    surface: 'formal_page',
  });
  const workspaceBlock = createBlock('workspace-2', {
    x: DEFAULT_PAGE_CONTENT_WIDTH + 120,
    y: 40,
    width: 220,
    height: 80,
    surface: 'canvas_workspace',
  });

  const pagePolicy = createSurfaceModePolicy('page');
  const canvasPolicy = createSurfaceModePolicy('canvas');
  const pageVisible = getVisibleBlocksForSurface([pageBlock, workspaceBlock], pagePolicy, DEFAULT_PAGE_CONTENT_WIDTH);
  const canvasVisible = getVisibleBlocksForSurface([pageBlock, workspaceBlock], canvasPolicy, DEFAULT_PAGE_CONTENT_WIDTH);

  assertEqual(pagePolicy.showWorkspaceBlocks, false, 'page mode hides workspace blocks');
  assertEqual(pagePolicy.useGlobalPageScroll, true, 'page mode uses natural page scroll');
  assertEqual(canvasPolicy.showWorkspaceBlocks, true, 'canvas mode shows workspace blocks');
  assertEqual(canvasPolicy.useGlobalPageScroll, false, 'canvas mode disables global page scroll');
  assertEqual(pageVisible.length, 1, 'page mode filters workspace block');
  assertEqual(canvasVisible.length, 2, 'canvas mode preserves workspace block');

  const defaultDraft = createDefaultDraftLayout({
    [pageBlock.id]: { x: 0, y: 0, width: 320, height: 88 },
    [workspaceBlock.id]: { x: DEFAULT_PAGE_CONTENT_WIDTH + 120, y: 600, width: 220, height: 160 },
  }, DEFAULT_PAGE_CONTENT_WIDTH);
  assertEqual(defaultDraft.y, 88, 'default draft follows formal page content, not workspace content');

  const frameHeight = calculatePageFrameHeight({
    blockLayouts: {
      [pageBlock.id]: { x: 0, y: 640, width: 320, height: 120 },
      [workspaceBlock.id]: { x: DEFAULT_PAGE_CONTENT_WIDTH + 100, y: 1400, width: 220, height: 160 },
    },
    draftActive: false,
    draftLayout: null,
    defaultDraftLayout: defaultDraft,
  });
  assertEqual(frameHeight, 640 + 120 + PAGE_FRAME_BOTTOM_PADDING, 'PageFrame height follows formal page bottom');

  const frame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: frameHeight,
  });
  assertEqual(frame.x, 0, 'PageFrame boundary starts before content inset');
  assertEqual(frame.contentInset.left, DEFAULT_PAGE_FRAME_CONTENT_INSET.left, 'PageFrame keeps content inset');
  assertEqual(frame.exportable, true, 'primary PageFrame remains exportable');
}

function testPlacementAndRuntimeModel(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const pageBlock = createBlock('page-3');
  const workspaceBlock = createBlock('workspace-4');
  const pageLayout: BlockBoxLayout = { x: 0, y: 0, width: 320, height: 88, rotation: 5 };
  const workspaceLayout: BlockBoxLayout = {
    x: DEFAULT_PAGE_CONTENT_WIDTH + 64,
    y: 80,
    width: 220,
    height: 90,
    export_role: 'scratch',
  };

  const pagePlacement = buildRuntimeBlockPlacement({
    block: pageBlock,
    canvasId: 'contract-canvas',
    layout: pageLayout,
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 3,
  });
  const workspacePlacement = buildRuntimeBlockPlacement({
    block: workspaceBlock,
    canvasId: 'contract-canvas',
    layout: workspaceLayout,
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 4,
  });

  assertEqual(pagePlacement.surface, 'formal_page', 'inside placement belongs to formal page');
  assertEqual(pagePlacement.frameId, pageFrame.id, 'inside placement points to PageFrame');
  assertEqual(pagePlacement.rotation, 5, 'placement preserves rotation seed');
  assertEqual(workspacePlacement.surface, 'canvas_workspace', 'outside placement belongs to workspace');
  assertEqual(workspacePlacement.frameId, undefined, 'workspace placement has no PageFrame id');
  assertEqual(workspacePlacement.visibilityState, 'scratch', 'scratch export role drives visibility state');

  const endpoints = [
    ...buildRelationEndpointReserveForPlacement(pagePlacement),
    ...buildRelationEndpointReserveForPlacement(workspacePlacement),
  ];
  assertEqual(endpoints.length, 4, 'each placement reserves left and right relation endpoints');
  assert(endpoints.some((endpoint) => endpoint.normal?.x === -1), 'left endpoint reserve exists');
  assert(endpoints.some((endpoint) => endpoint.normal?.x === 1), 'right endpoint reserve exists');

  const payload = buildLayoutPayload(workspaceLayout);
  assertEqual(payload.surface, 'canvas_workspace', 'layout payload records workspace surface');
  assertEqual(payload.version, 'V2.BN.8', 'layout payload records version');

  const withOverride = {
    ...workspaceBlock,
    display_overrides_json: writeLayoutOverride(workspaceBlock, workspaceLayout),
  };
  const stored = readStoredLayout(withOverride);
  assert(stored, 'stored layout can be read back');
  assertEqual(stored.surface, 'canvas_workspace', 'stored layout preserves workspace surface');
  assertEqual(getEffectiveExportRole(workspaceLayout), 'scratch', 'effective export role keeps explicit scratch');
  assertEqual(getEffectiveAIVisibility(workspaceLayout), 'hidden', 'workspace scratch defaults to AI hidden');

  const normalizedInPage = normalizeBlockLayout({
    block: withOverride,
    fallback: { x: 0, y: 10, width: 300, height: 70 },
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    surfaceMode: 'page',
    estimateHeight: () => 72,
  });
  assertEqual(normalizedInPage.x, 0, 'page mode does not hard-clamp workspace stored x into PageFrame');
  assertEqual(normalizedInPage.width, 300, 'page mode uses fallback width for hidden workspace block');

  const normalizedInCanvas = normalizeBlockLayout({
    block: withOverride,
    fallback: { x: 0, y: 10, width: 300, height: 70 },
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    surfaceMode: 'canvas',
    estimateHeight: () => 72,
  });
  assertEqual(normalizedInCanvas.x, workspaceLayout.x, 'canvas mode preserves workspace stored x during initial restore');
  assertEqual(normalizedInCanvas.surface, 'canvas_workspace', 'canvas mode preserves workspace surface during initial restore');
  assertAtLeast(normalizedInCanvas.height, workspaceLayout.height, 'canvas mode restore keeps stored measured height');
  assert(normalizedInCanvas.x < CANVAS_WORKSPACE_WIDTH, 'workspace restore remains inside canvas workspace bounds');

  const autoWidthBlock = {
    ...pageBlock,
    display_overrides_json: writeLayoutOverride(pageBlock, {
      x: 0,
      y: 20,
      width: DEFAULT_PAGE_CONTENT_WIDTH,
      height: 80,
      surface: 'formal_page',
    }),
  };
  const responsiveAutoLayout = normalizeBlockLayout({
    block: autoWidthBlock,
    fallback: { x: 0, y: 20, width: 420, height: 80 },
    contentWidth: 420,
    surfaceMode: 'page',
    estimateHeight: () => 80,
  });
  assertEqual(responsiveAutoLayout.width, 420, 'formal page auto-width block follows resized PageFrame width');

  const manualWidthBlock = {
    ...pageBlock,
    display_overrides_json: writeLayoutOverride(pageBlock, {
      x: 0,
      y: 20,
      width: 300,
      height: 80,
      surface: 'formal_page',
      width_mode: 'manual',
    }),
  };
  const responsiveManualLayout = normalizeBlockLayout({
    block: manualWidthBlock,
    fallback: { x: 0, y: 20, width: 420, height: 80 },
    contentWidth: 420,
    surfaceMode: 'page',
    estimateHeight: () => 80,
  });
  assertEqual(responsiveManualLayout.width, 300, 'manual-width block preserves user resize across PageFrame resize');
  assertEqual(responsiveManualLayout.width_mode, 'manual', 'manual-width block keeps width mode');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement, workspacePlacement],
    relationEndpointReserve: endpoints,
  });
  assertEqual(runtime.route, 'self_owned_minimal_hybrid', 'runtime model route remains self-owned hybrid');
  assertEqual(runtime.relationEndpointReserve.length, 4, 'runtime model carries endpoint reserves');
  assert(runtime.visibleBlockIds.length > 0, 'runtime model computes visible blocks');
}

function testOverlayAnchorModel(): void {
  const viewport = createRuntimeViewport('canvas', 920, {
    x: -180,
    y: -64,
    width: 1280,
    height: 720,
    zoom: 1.25,
  });
  const viewportElementRect = {
    left: 20,
    right: 1300,
    top: 50,
    bottom: 770,
  } as DOMRect;
  const worldRect = {
    x: 100,
    y: 80,
    width: 240,
    height: 90,
  };

  const viewportRect = worldRectToViewportRect({
    worldRect,
    viewport,
    viewportElementRect,
    source: 'block',
    ownerId: 'block-1',
  });
  assertEqual(Math.round(viewportRect.left), 370, 'world overlay rect converts left through viewport transform');
  assertEqual(Math.round(viewportRect.top), 230, 'world overlay rect converts top through viewport transform');
  assertEqual(Math.round(viewportRect.right), 670, 'world overlay rect converts right through viewport transform');
  assertEqual(Math.round(viewportRect.bottom), 343, 'world overlay rect converts bottom through viewport transform');

  const worldAnchor = createWorldOverlayAnchor({
    worldRect,
    viewport,
    viewportElementRect,
    source: 'block',
    ownerId: 'block-1',
  });
  assertEqual(worldAnchor.kind, 'viewport_rect', 'world overlay anchor resolves to viewport rect');
  assertEqual(worldAnchor.source, 'block', 'world overlay anchor records source');
  assertEqual(worldAnchor.ownerId, 'block-1', 'world overlay anchor records owner');

  const caretAnchor = createViewportOverlayAnchor({
    left: 40,
    right: 42,
    top: 60,
    bottom: 80,
  } as DOMRect, 'caret');
  const placed = placeAnchoredOverlay({
    anchor: caretAnchor,
    overlayWidth: 320,
    overlayHeight: 240,
    preferredSide: 'below',
  });
  assertEqual(caretAnchor.source, 'caret', 'viewport overlay anchor can record caret source');
  assertAtLeast(placed.x, 16, 'anchored overlay clamps inside viewport x');
  assertAtLeast(placed.y, 16, 'anchored overlay clamps inside viewport y');

  const toolbarNearTop = placeSelectionToolbar({
    anchorRect: {
      left: 80,
      right: 140,
      top: 8,
      bottom: 28,
    } as DOMRect,
    toolbarWidth: 360,
    toolbarHeight: 40,
    topChromeHeight: 56,
  });
  assert(toolbarNearTop.y >= 36, 'selection toolbar near viewport top opens below selection instead of pinning to top chrome');
}

function testMeasurementModeAndHistory(): void {
  const currentLayouts: Record<string, BlockBoxLayout> = {
    a: { x: 0, y: 0, width: 360, height: MIN_BLOCK_HEIGHT },
    b: { x: 0, y: MIN_BLOCK_HEIGHT, width: 360, height: DEFAULT_BLOCK_HEIGHT },
  };
  const reflowed = applyMeasuredBlockHeightToLayouts({
    currentLayouts,
    baseLayouts: currentLayouts,
    blockId: 'a',
    fallbackLayout: currentLayouts.a,
    measuredHeight: 120,
    orderedBlockIds: ['a', 'b'],
    resolveCollisions: true,
  });
  assertAtLeast(reflowed.b.y, 120, 'measured height reflow pushes lower block');

  const snapResolved = calculateDraggedBlockLayouts({
    blockId: 'b',
    startLayouts: {
      a: { x: 0, y: 0, width: 360, height: 96 },
      b: { x: 0, y: 120, width: 360, height: 72 },
    },
    initialLayout: { x: 0, y: 120, width: 360, height: 72 },
    deltaX: 0,
    deltaY: -40,
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    snapEnabled: true,
    orderedBlockIds: ['a', 'b'],
    resolveCollisions: true,
    useElasticAvoidance: false,
  });
  assertAtLeast(snapResolved.layouts.b.y, 96, 'snap-on drag collision keeps lower block below measured upper block');

  const pagePolicy = createSurfaceModePolicy('page');
  const canvasPolicy = createSurfaceModePolicy('canvas');
  const defaultDraft: BlockBoxLayout = { x: 0, y: 120, width: 420, height: 72 };
  const snapDraft = createBlankDraftLayout({
    policy: pagePolicy,
    snapEnabled: true,
    rawX: 300,
    rawY: 300,
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    defaultDraftLayout: defaultDraft,
  });
  const freeDraft = createBlankDraftLayout({
    policy: pagePolicy,
    snapEnabled: false,
    rawX: 300,
    rawY: 300,
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    defaultDraftLayout: defaultDraft,
  });

  assertEqual(snapDraft.y, defaultDraft.y, 'snap-on page draft follows natural writing flow');
  assertEqual(freeDraft.x, 300, 'snap-off page draft uses click x');
  assertEqual(freeDraft.y, 300, 'snap-off page draft uses click y');
  assertEqual(shouldResolvePageCollisions(pagePolicy), true, 'page mode resolves page collisions');
  assertEqual(shouldResolvePageCollisions(canvasPolicy), false, 'canvas mode does not force page collision resolution');
  assertEqual(shouldUseElasticAvoidance({ policy: pagePolicy, snapEnabled: false, deltaY: 12 }), true, 'elastic avoidance is page/snap-off only');
  assertEqual(shouldUseElasticAvoidance({ policy: pagePolicy, snapEnabled: true, deltaY: 12 }), false, 'snap-on disables elastic avoidance');
  assertEqual(shouldUseElasticAvoidance({ policy: canvasPolicy, snapEnabled: false, deltaY: 12 }), false, 'canvas mode disables page elastic avoidance');

  const transition = createSurfaceModeTransitionPolicy('page');
  assertEqual(transition.nextMode, 'canvas', 'page transition targets canvas');
  assertEqual(transition.closeOverlay, true, 'mode transition closes overlay');
  assertEqual(transition.clearBlockSelection, true, 'mode transition clears block selection');

  assertEqual(getRuntimeHistoryKeyboardIntent({
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    key: 'z',
    target: null,
  }), 'undo', 'Ctrl+Z maps to undo');
  assertEqual(getRuntimeHistoryKeyboardIntent({
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    key: 'y',
    target: null,
  }), 'redo', 'Ctrl+Y maps to redo');
  assertEqual(getRuntimeHistoryKeyboardIntent({
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    key: 'z',
    target: null,
  }), 'redo', 'Ctrl+Shift+Z maps to redo');
}

function testTextFlowSeed(): void {
  const paragraphTemplate = TEXT_FLOW_TEMPLATE_FIXTURES.find((template) => template.template_key === 'text.paragraph');
  const codeTemplate = TEXT_FLOW_TEMPLATE_FIXTURES.find((template) => template.template_key === 'code.snippet');
  assert(paragraphTemplate, 'paragraph template exists for TextFlow seed check');
  assert(codeTemplate, 'code template exists for TextFlow seed check');

  const paragraphContent = contentForTemplate(paragraphTemplate, 'Alpha');
  const paragraphFlow = getTextFlowContent(paragraphContent);
  assert(paragraphFlow, 'fresh paragraph content has TextFlow seed');
  assertEqual(paragraphFlow.units.length, 1, 'fresh paragraph content creates one TextUnit');
  assertEqual(paragraphFlow.units[0].writing_role, 'paragraph', 'fresh paragraph TextUnit uses paragraph role');
  assertEqual(paragraphFlow.units[0].text, 'Alpha', 'fresh paragraph TextUnit keeps body text');

  const emptyTextBlockContent = createEmptyTextBlockContentV1('paragraph');
  const emptyTextBlockProjection = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: emptyTextBlockContent }, '');
  assertEqual(emptyTextBlockContent.units.length, 1, 'empty text block seed creates one editable TextUnit immediately');
  assertEqual(emptyTextBlockContent.units[0].text, '', 'empty text block seed keeps the first TextUnit blank');
  assertEqual(emptyTextBlockContent.units[0].status, 'active', 'empty text block seed creates an active TextUnit');
  assertEqual(emptyTextBlockProjection.text_units.length, 1, 'empty text block projection keeps the blank TextUnit addressable');
  assertEqual(emptyTextBlockProjection.plain_text, '', 'empty text block projection keeps plain text empty');

  const codeContent = contentForTemplate(codeTemplate, 'npm run dev');
  const codeFlow = getTextFlowContent(codeContent);
  assert(codeFlow, 'fresh code content has TextFlow seed');
  assertEqual(codeFlow.units[0].writing_role, 'code_line', 'code command maps to code line writing role');

  const editedBlock = {
    ...createBlock('textflow-1'),
    content_json: paragraphContent,
    plain_text: 'Alpha',
  };
  const editedContent = contentForEditedBlock(editedBlock, 'Beta');
  const editedProjection = projectTextFlowContent(editedContent, '');
  assertEqual(editedProjection.plain_text, 'Beta', 'edited paragraph rebuilds TextFlow projection');
  assertEqual(textFromContent({ ...editedBlock, content_json: editedContent, plain_text: 'Beta' }), 'Beta', 'textFromContent reads edited text');

  const staleBodyContent = {
    ...editedContent,
    body: 'Stale body cache',
  };
  assertEqual(
    textFromContent({ ...editedBlock, content_json: staleBodyContent, plain_text: 'Stale plain text' }),
    'Beta',
    'valid TextFlow is the text-like block content truth before body/plain_text cache',
  );
  assertEqual(
    plainTextForBlockContent('paragraph', staleBodyContent, 'Stale fallback'),
    'Beta',
    'plain text rebuild reads valid TextFlow before body/plain_text cache',
  );

  const projectedTextFlow = projectTextFlowContent({
    body: 'A\nB',
    [TEXT_FLOW_CONTENT_KEY]: attachFreshTextFlow({ body: 'A\nB' }, 'A\nB', 'paragraph')[TEXT_FLOW_CONTENT_KEY],
  }, '');
  assert(
    projectedTextFlow.addressable_objects.every((item) => String(item.kind) !== 'text_unit_group'),
    'retired TextUnitGroup is not projected as an addressable object',
  );

  const fallbackProjection = projectTextFlowContent({ body: 'Fallback', [TEXT_FLOW_CONTENT_KEY]: { units: 'bad' } }, 'Fallback');
  assertEqual(fallbackProjection.plain_text, 'Fallback', 'malformed TextFlow falls back to plain text');
  assertAtLeast(fallbackProjection.debug_warnings.length, 1, 'malformed TextFlow emits debug warning');

  const projectedBlock = projectNoteBlockTextFlow({
    ...editedBlock,
    content_json: editedContent,
    plain_text: 'Beta',
  });
  assert(projectedBlock.addressable_objects.some((item) => item.parent_id === editedBlock.id), 'NoteBlock projection keeps owner block id');
}

function testTextUnitEditorService(): void {
  const textUnitEditorFlow = createTextBlockContentV1('Alpha Beta', 'paragraph');
  const firstUnit = textUnitEditorFlow.units[0];
  const splitResult = splitTextUnitAtOffset(textUnitEditorFlow, firstUnit.id, 5);
  assertEqual(splitResult.units.length, 2, 'splitTextUnitAtOffset creates two TextUnits');
  assertEqual(splitResult.units[0].text, 'Alpha', 'split keeps text before caret');
  assertEqual(splitResult.units[1].text, ' Beta', 'split keeps text after caret');
  assertEqual(splitResult.units[0].order_index, 0, 'split rewrites first order index');
  assertEqual(splitResult.units[1].order_index, 1, 'split rewrites second order index');

  const tailSplit = splitTextUnitAtOffset(textUnitEditorFlow, firstUnit.id, firstUnit.text.length);
  assertEqual(tailSplit.units.length, 2, 'tail split keeps a newly inserted empty TextUnit');
  assertEqual(tailSplit.units[1].text, '', 'tail split empty TextUnit remains addressable');
  const tailProjection = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: tailSplit }, '');
  assertEqual(tailProjection.plain_text, 'Alpha Beta\n', 'tail split projection preserves the trailing empty TextUnit');

  const roleResult = setTextUnitWritingRole(splitResult, splitResult.units[0].id, 'heading');
  assertEqual(roleResult.units[0].writing_role, 'heading', 'setTextUnitWritingRole updates writing role');

  const indented = indentTextUnit(roleResult, roleResult.units[1].id);
  assertEqual(indented.units[1].indent_level, 1, 'indentTextUnit increments indent level');
  const outdented = outdentTextUnit(indented, indented.units[1].id);
  assertEqual(outdented.units[1].indent_level, 0, 'outdentTextUnit decrements indent level');

  const toggledTodo = updateTextUnitMetadata(
    setTextUnitWritingRole(outdented, outdented.units[1].id, 'todo_item'),
    outdented.units[1].id,
    { checked: true },
  );
  assertEqual(toggledTodo.units[1].metadata.checked, true, 'updateTextUnitMetadata stores todo checked state');
  const todoEnterSplit = splitTextUnitForEnter(toggledTodo, toggledTodo.units[1].id, toggledTodo.units[1].text.length);
  assertEqual(todoEnterSplit.units[2].writing_role, 'todo_item', 'Enter after todo creates another todo item');
  assertEqual(todoEnterSplit.units[2].metadata.checked, false, 'Enter after checked todo resets the new todo item');

  const toggleFlow = setTextUnitWritingRole(textUnitEditorFlow, firstUnit.id, 'toggle_item');
  const toggleEnterSplit = splitTextUnitForEnter(toggleFlow, firstUnit.id, firstUnit.text.length);
  assertEqual(toggleEnterSplit.units[1].writing_role, 'paragraph', 'Enter at end of toggle exits toggle mode');

  const merged = mergeTextUnitWithPrevious(outdented, outdented.units[1].id);
  assertEqual(merged.units.length, 1, 'mergeTextUnitWithPrevious merges units');
  assertEqual(merged.units[0].text, 'Alpha Beta', 'merge preserves text order');

  const parsedUnits = parseTextUnitsFromPlainText([
    '# Topic',
    '1. First',
    '   a. Child',
    '- [x] Done',
    '> Quote',
    'Plain paragraph',
  ].join('\n'));
  assertEqual(parsedUnits[0].writing_role, 'heading', 'markdown heading parses to heading role');
  assertEqual(parsedUnits[0].text, 'Topic', 'markdown heading removes heading marker');
  assertEqual(parsedUnits[1].writing_role, 'numbered_item', 'numbered line parses to numbered role');
  assertEqual(parsedUnits[2].indent_level, 1, 'indented child line keeps indent level');
  assertEqual(parsedUnits[3].writing_role, 'todo_item', 'checkbox line parses to todo role');
  assertEqual(parsedUnits[3].metadata.checked, true, 'checked checkbox stores checked metadata');
  assertEqual(parsedUnits[4].writing_role, 'quote', 'quote line parses to quote role');
  assertEqual(parsedUnits[5].writing_role, 'paragraph', 'plain line parses to paragraph role');

  const numberedFlow = {
    ...createTextBlockContentV1('Intro', 'paragraph'),
    units: [
      { ...createTextBlockContentV1('Intro', 'paragraph').units[0], id: 'tu-1', text: 'Intro', writing_role: 'paragraph' as const, indent_level: 0, order_index: 0 },
      { ...createTextBlockContentV1('First', 'paragraph').units[0], id: 'tu-2', text: 'First', writing_role: 'numbered_item' as const, indent_level: 0, order_index: 1 },
      { ...createTextBlockContentV1('Child', 'paragraph').units[0], id: 'tu-3', text: 'Child', writing_role: 'bullet_item' as const, indent_level: 1, order_index: 2 },
      { ...createTextBlockContentV1('Second', 'paragraph').units[0], id: 'tu-4', text: 'Second', writing_role: 'numbered_item' as const, indent_level: 0, order_index: 3 },
      { ...createTextBlockContentV1('Reset', 'paragraph').units[0], id: 'tu-5', text: 'Reset', writing_role: 'numbered_item' as const, indent_level: 0, order_index: 4 },
    ],
  };
  numberedFlow.units[4] = { ...numberedFlow.units[4], writing_role: 'numbered_item', indent_level: 1 };
  assertEqual(numberedListOrdinalForUnit(numberedFlow.units, 1), 1, 'numbered list starts at one after paragraph');
  assertEqual(numberedListOrdinalForUnit(numberedFlow.units, 3), 2, 'numbered list continues across nested child rows');
  assertEqual(numberedListOrdinalForUnit(numberedFlow.units, 4), 1, 'nested numbered list has its own ordinal sequence');
  assertEqual(textUnitMarkerForDisplay(numberedFlow.units, 1), '1.', 'numbered marker display starts at one');

  const pasted = pasteTextIntoTextFlow(createTextBlockContentV1('A C', 'paragraph'), 'tu-1', 1, 'B\n- item');
  assertEqual(pasted.units.length, 3, 'pasteTextIntoTextFlow inserts parsed TextUnits');
  assertEqual(pasted.units[0].text, 'AB', 'paste first unit joins prefix and first pasted line');
  assertEqual(pasted.units[1].writing_role, 'bullet_item', 'paste keeps parsed bullet role');
  assertEqual(pasted.units[2].text, ' C', 'paste keeps suffix after inserted units');
  const dragInserted = insertPlainTextIntoTextFlow(createTextBlockContentV1('Alpha', 'paragraph'), 'tu-1', 2, 'X');
  assertEqual(dragInserted.units[0].text, 'AlXpha', 'insertPlainTextIntoTextFlow copy-inserts into a target unit');
  const droppedProjectionFlow = createTextFlowFromDroppedText('One\nTwo');
  assertEqual(droppedProjectionFlow.metadata.projection_source, 'drag_drop_projection', 'dropped TextFlow records projection source');

  const splitFlow = createTextBlockContentV1('One', 'paragraph');
  const withThreeUnits = {
    ...splitFlow,
    units: [
      { ...splitFlow.units[0], id: 'tu-1', text: 'One', order_index: 0 },
      { ...splitFlow.units[0], id: 'tu-2', text: 'Two', order_index: 1 },
      { ...splitFlow.units[0], id: 'tu-3', text: 'Three', order_index: 2 },
    ],
  };
  const blockSplit = splitTextFlowAtUnit(withThreeUnits, 'tu-2');
  assertEqual(blockSplit.before.units.length, 1, 'splitTextFlowAtUnit keeps units before target in first flow');
  assertEqual(blockSplit.after.units.length, 2, 'splitTextFlowAtUnit moves target and later units into second flow');
  assertEqual(blockSplit.after.units[0].text, 'Two', 'splitTextFlowAtUnit includes target unit in after flow');

  const mergedFlows = mergeTextFlows(blockSplit.before, blockSplit.after);
  assertEqual(mergedFlows.units.length, 3, 'mergeTextFlows combines units');
  assertEqual(projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: mergedFlows }).plain_text, 'One\nTwo\nThree', 'merged TextFlow projection preserves line order');
}

function testSlashCommandFoundation(): void {
  const requiredKinds = new Set(['create_block', 'convert_block', 'insert_structure', 'inline_action', 'annotation_action']);
  for (const command of NOTE_SLASH_COMMANDS) {
    assert(requiredKinds.has(command.commandKind), `${command.id} has command kind metadata`);
    assert(command.objectKind.length > 0, `${command.id} has object kind metadata`);
  }

  const text = NOTE_SLASH_COMMANDS.find((command) => command.id === 'text');
  const heading = NOTE_SLASH_COMMANDS.find((command) => command.id === 'heading');
  const definition = NOTE_SLASH_COMMANDS.find((command) => command.id === 'definition');
  const inlineFormula = NOTE_SLASH_COMMANDS.find((command) => command.id === 'inline-formula');
  const bullet = NOTE_SLASH_COMMANDS.find((command) => command.id === 'bullet-list');
  const numbered = NOTE_SLASH_COMMANDS.find((command) => command.id === 'numbered-list');
  const todo = NOTE_SLASH_COMMANDS.find((command) => command.id === 'todo-list');
  const toggle = NOTE_SLASH_COMMANDS.find((command) => command.id === 'toggle-list');
  assert(text && text.commandKind === 'create_block' && text.writingRole === 'paragraph', 'text command creates paragraph writing seed');
  assert(heading && heading.commandKind === 'convert_block' && heading.writingRole === 'heading', 'heading command is a writing-role conversion seed');
  assert(definition && definition.commandKind === 'annotation_action', 'definition is an annotation action');
  assert(definition && definition.objectKind === 'annotation', 'definition targets AnnotationTruth, not TextUnit role metadata');
  assert(definition && !definition.templateKey, 'definition slash command no longer points at a block template');
  assert(inlineFormula && inlineFormula.commandKind === 'inline_action' && Boolean(inlineFormula.disabledReason), 'inline formula is explicit future inline action');
  assert(bullet && bullet.commandKind === 'insert_structure' && bullet.objectKind === 'writing_role' && bullet.writingRole === 'bullet_item' && !bullet.disabledReason, 'bullet list is an active TextUnit writing role');
  assert(numbered && numbered.commandKind === 'insert_structure' && numbered.objectKind === 'writing_role' && numbered.writingRole === 'numbered_item' && !numbered.disabledReason, 'numbered list is an active TextUnit writing role');
  assert(todo && todo.commandKind === 'insert_structure' && todo.objectKind === 'writing_role' && todo.writingRole === 'todo_item' && !todo.disabledReason, 'todo list is an active TextUnit writing role');
  assert(toggle && toggle.commandKind === 'insert_structure' && toggle.objectKind === 'writing_role' && toggle.writingRole === 'toggle_item' && !toggle.disabledReason, 'toggle list is an active TextUnit writing role');
}

function testAnnotationTruthSeed(): void {
  const range = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 5,
    text: 'Power',
  });
  const annotation = createAnnotationTruth({
    noteId: 'note-test',
    canvasId: 'canvas-test',
    label: 'definition',
    ranges: [range],
  });

  assertEqual(annotation.raw_label, 'definition', 'AnnotationTruth stores raw label');
  assertEqual(annotation.ranges.length, 1, 'AnnotationTruth stores ranges');
  assertEqual(annotation.ranges[0].target_kind, 'text_span', 'text span range keeps target kind');
  assertEqual(annotation.parent_annotation_id, null, 'AnnotationTruth defaults to root annotation');
  assertEqual(annotation.status, 'active', 'AnnotationTruth defaults to active');

  const unitRange = createTextUnitAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    text: 'Power series',
  });
  assertEqual(unitRange.target_kind, 'text_unit', 'TextUnit annotation range keeps target kind');

  const blockRange = createBlockAnnotationRange({
    blockId: 'block-a',
    text: 'Whole block',
  });
  assertEqual(blockRange.target_kind, 'block', 'block annotation range keeps target kind');

  const renamed = renameAnnotationTruth(annotation, 'Power series note');
  assertEqual(renamed.raw_label, 'Power series note', 'renameAnnotationTruth updates raw label');
  assertEqual(annotation.raw_label, 'definition', 'renameAnnotationTruth does not mutate original annotation');

  const recolored = updateAnnotationColorToken(annotation, 'annotation-teal');
  assertEqual(recolored.visual_style.color_token, 'annotation-teal', 'updateAnnotationColorToken updates visual color token');
  assertEqual(annotation.visual_style.color_token, 'annotation-yellow', 'updateAnnotationColorToken does not mutate original annotation');

  const deleted = softDeleteAnnotationTruth(renamed);
  assertEqual(deleted.status, 'deleted', 'softDeleteAnnotationTruth marks annotation deleted');

  const normalized = normalizeSelectionOffsets({ startOffset: 8, endOffset: 2, textLength: 10 });
  assertEqual(normalized.startOffset, 2, 'selection offset start is normalized');
  assertEqual(normalized.endOffset, 8, 'selection offset end is normalized');

  const selectionRange = createAnnotationRangeFromCapturedSelection({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 1,
    endOffset: 4,
    text: 'abc',
  });
  assertEqual(selectionRange.target_kind, 'text_span', 'captured selection creates text span range');
  assertEqual(selectionRange.range_text_cache, 'bc', 'captured selection cache does not expand past selected text');
  assertEqual(isFullTextUnitAnnotationRange(selectionRange, 'abc'), false, 'partial text span must not render as a full TextUnit mark');

  const partialHighlightSegments = createTextUnitAnnotationHighlightSegments({
    text: '1233213',
    ranges: [{
      range: createTextSpanAnnotationRange({
        blockId: 'block-a',
        textFlowId: 'flow-a',
        textUnitId: 'unit-a',
        startOffset: 3,
        endOffset: 7,
        text: '3213',
      }),
    }],
  });
  assertEqual(partialHighlightSegments.length, 2, 'partial annotation splits TextUnit into plain and highlighted segments');
  assertEqual(partialHighlightSegments[0]?.text, '123', 'partial annotation keeps leading plain text');
  assertEqual(partialHighlightSegments[0]?.highlighted, false, 'leading text remains unhighlighted');
  assertEqual(partialHighlightSegments[1]?.text, '3213', 'partial annotation keeps selected text as highlighted segment');
  assertEqual(partialHighlightSegments[1]?.highlighted, true, 'selected partial text is highlighted');

  const fullTextHighlightSegments = createTextUnitAnnotationHighlightSegments({
    text: 'Yes',
    ranges: [{
      range: createTextSpanAnnotationRange({
        blockId: 'block-a',
        textFlowId: 'flow-a',
        textUnitId: 'unit-a',
        startOffset: 0,
        endOffset: 3,
        text: 'Yes',
      }),
      selected: true,
    }],
  });
  assertEqual(fullTextHighlightSegments.length, 1, 'full text span remains one highlighted segment');
  assertEqual(fullTextHighlightSegments[0]?.text, 'Yes', 'full text span keeps exact text');
  assertEqual(fullTextHighlightSegments[0]?.highlighted, true, 'full text span is highlighted');
  assertEqual(fullTextHighlightSegments[0]?.selected, true, 'selected annotation segment is marked selected');

  const fullSpanRange = createAnnotationRangeFromCapturedSelection({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 3,
    text: 'abc',
  });
  assertEqual(isFullTextUnitAnnotationRange(fullSpanRange, 'abc'), true, 'full-length text span can render as a full TextUnit mark');
  assertEqual(isFullTextUnitAnnotationRange(unitRange, 'Power series'), true, 'TextUnit annotation range renders as a full TextUnit mark');

  const collapsedSelectionRange = createAnnotationRangeFromCapturedSelection({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 2,
    endOffset: 2,
    text: 'abc',
  });
  assertEqual(collapsedSelectionRange.range_text_cache, '', 'collapsed selection cache must not expand to whole text');

  const proposal = createAnnotationProposal({
    noteId: 'note-test',
    label: 'definition',
    ranges: [selectionRange],
    reasoningSummary: 'The selected text defines a term.',
    createdBy: 'ai',
  });
  assertEqual(proposal.status, 'pending', 'proposal starts pending');

  const accepted = acceptAnnotationProposal({ proposal, canvasId: 'canvas-test' });
  assertEqual(accepted.proposal.status, 'accepted', 'accept marks proposal accepted');
  assertEqual(accepted.annotation.created_by, 'ai_proposal', 'accepted proposal creates ai_proposal annotation');

  const overlappingGameRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 4,
    text: 'CSGO',
  });
  const overlappingDefinitionRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 32,
    text: "CSGO is Henry's favourite game",
  });
  const gameAnnotation = createAnnotationTruth({
    noteId: 'note-test',
    canvasId: 'canvas-test',
    label: 'game',
    ranges: [overlappingGameRange],
  });
  const definitionAnnotation = createAnnotationTruth({
    noteId: 'note-test',
    canvasId: 'canvas-test',
    label: 'definition',
    ranges: [overlappingDefinitionRange],
  });
  const overlapSegments = createAnnotationRenderSegments({
    text: "CSGO is Henry's favourite game",
    annotations: [gameAnnotation, definitionAnnotation],
    blockId: 'block-a',
    textUnitId: 'unit-a',
    selectedAnnotationIds: [gameAnnotation.id],
  });
  assertEqual(overlapSegments[0]?.text, 'CSGO', 'overlap render keeps first word segment');
  assertEqual(overlapSegments[0]?.annotationIds.length, 2, 'overlap render records both annotations');
  assertEqual(overlapSegments[0]?.selected, true, 'overlap render marks selected annotation segment');
  assertEqual(overlapSegments[1]?.annotationIds.length, 1, 'overlap render keeps remaining definition segment');

  const unitSummary = summarizeAnnotationsForTextUnit({
    annotations: [gameAnnotation, definitionAnnotation],
    blockId: 'block-a',
    textUnitId: 'unit-a',
    selectedAnnotationIds: [gameAnnotation.id],
  });
  assertEqual(unitSummary.count, 2, 'TextUnit summary counts overlapping annotations');
  assertEqual(unitSummary.primary?.id, gameAnnotation.id, 'selected annotation wins TextUnit primary summary');

  const sameRangeLabel = createAnnotationFromExistingRanges({
    sourceAnnotation: gameAnnotation,
    label: 'suspicious claim',
  });
  assertEqual(sameRangeLabel.ranges.length, 1, 'same-range label copies source ranges');
  assertEqual(sameRangeLabel.ranges[0].range_text_cache, 'CSGO', 'same-range label keeps exact range cache');
  assert(sameRangeLabel.id !== gameAnnotation.id, 'same-range label creates a separate AnnotationTruth');

  const multiRangeAnnotation = createAnnotationTruth({
    noteId: 'note-test',
    canvasId: 'canvas-test',
    label: 'game statement',
    ranges: [overlappingGameRange, createTextSpanAnnotationRange({
      blockId: 'block-a',
      textFlowId: 'flow-a',
      textUnitId: 'unit-b',
      startOffset: 0,
      endOffset: 14,
      text: 'favourite game',
    })],
  });
  assertEqual(canCreateAnnotationFromRanges(multiRangeAnnotation.ranges), true, 'multi-range draft can create annotation');
  assertEqual(multiRangeAnnotation.ranges.length, 2, 'multi-range annotation stores both ranges');
  assertEqual(multiRangeAnnotation.ranges[0]?.range_text_cache, 'CSGO', 'first multi-range cache is exact');
  assertEqual(multiRangeAnnotation.ranges[1]?.range_text_cache, 'favourite game', 'second multi-range cache is exact');
  assertEqual(canCreateAnnotationFromRanges([]), false, 'empty annotation draft cannot create annotation');
  assertEqual(annotationRangeIdentityKey(overlappingGameRange), annotationRangeIdentityKey({ ...overlappingGameRange, id: 'annotation-range-copy' }), 'range identity ignores runtime range id');
  const mergedDraftRanges = mergeAnnotationRanges([overlappingGameRange, { ...overlappingGameRange, id: 'annotation-range-copy' }, overlappingDefinitionRange]);
  assertEqual(mergedDraftRanges.length, 2, 'multi-range draft merge deduplicates repeated selected ranges');
  assertEqual(mergedDraftRanges[0]?.range_text_cache, 'CSGO', 'multi-range draft merge keeps first selected range');
  assertEqual(mergedDraftRanges[1]?.range_text_cache, "CSGO is Henry's favourite game", 'multi-range draft merge keeps distinct second range');

  const attachedHierarchy = attachChildAnnotation({
    parent: definitionAnnotation,
    child: gameAnnotation,
  });
  const parentWithChild = attachedHierarchy.parent;
  const childWithParent = attachedHierarchy.child;
  assertEqual(parentWithChild.child_annotation_ids.length, 1, 'child annotation link is attached');
  assertEqual(childWithParent.parent_annotation_id, parentWithChild.id, 'child annotation stores parent truth');
  assertEqual(definitionAnnotation.child_annotation_ids.length, 0, 'child annotation helper does not mutate parent');
  assertEqual(gameAnnotation.parent_annotation_id, null, 'child annotation helper does not mutate child');
  assertEqual(resolveAnnotationRootId({
    annotationId: childWithParent.id,
    annotations: [parentWithChild, childWithParent],
  }), parentWithChild.id, 'root resolver follows child parent_annotation_id');
  const childrenFromParentTruth = getChildAnnotations({
    parent: parentWithChild,
    annotations: [parentWithChild, childWithParent],
  });
  assertEqual(childrenFromParentTruth.length, 1, 'child lookup reads parent_annotation_id truth');
  assertEqual(childrenFromParentTruth[0]?.id, childWithParent.id, 'child lookup returns the child annotation');
  const linkedThroughService = addChildAnnotationLink(definitionAnnotation, gameAnnotation.id);
  assertEqual(linkedThroughService.child_annotation_ids[0], gameAnnotation.id, 'annotationTruthService can add child link');
  const inspectorRootsFromChildSelection = resolveAnnotationInspectorRootIds({
    annotations: [parentWithChild, childWithParent],
    selectedAnnotationIds: [gameAnnotation.id],
  });
  assertEqual(inspectorRootsFromChildSelection.length, 1, 'inspector resolves child-only selection to one root card');
  assertEqual(inspectorRootsFromChildSelection[0], parentWithChild.id, 'inspector renders the parent card for a selected child annotation');
  const inspectorRootsFromParentAndChildSelection = resolveAnnotationInspectorRootIds({
    annotations: [parentWithChild, childWithParent],
    selectedAnnotationIds: [parentWithChild.id, childWithParent.id],
  });
  assertEqual(inspectorRootsFromParentAndChildSelection.length, 1, 'inspector does not render parent and child as sibling cards');
  assertEqual(inspectorRootsFromParentAndChildSelection[0], parentWithChild.id, 'inspector keeps the parent as the only top-level card');
  const legacyHierarchy = normalizeAnnotationHierarchy({
    annotations: [linkedThroughService, gameAnnotation],
  });
  const normalizedLegacyChild = legacyHierarchy.annotations.find((item) => item.id === gameAnnotation.id);
  assertEqual(normalizedLegacyChild?.parent_annotation_id, linkedThroughService.id, 'legacy parent child ids normalize into child parent truth');
  const deletedParent = softDeleteAnnotationTruth(parentWithChild);
  assertEqual(resolveAnnotationInspectorRootIds({
    annotations: [deletedParent, childWithParent],
    selectedAnnotationIds: [childWithParent.id],
  }).length, 0, 'deleted parent prevents child from rendering as a root ghost');

  const childRangeFromParentSpan = createChildAnnotationRangeFromParentRange({
    parentRange: overlappingDefinitionRange,
    selectionStartOffset: 0,
    selectionEndOffset: 4,
    selectedText: 'CSGO',
  });
  assert(childRangeFromParentSpan, 'child range can be created from a parent text-span preview selection');
  assertEqual(childRangeFromParentSpan.target_kind, 'text_span', 'child range from parent span remains text_span');
  assertEqual(childRangeFromParentSpan.start_offset, overlappingDefinitionRange.start_offset, 'child range preserves parent absolute start offset');
  assertEqual(childRangeFromParentSpan.end_offset, (overlappingDefinitionRange.start_offset || 0) + 4, 'child range maps preview offsets back to source offsets');
  assertEqual(childRangeFromParentSpan.range_text_cache, 'CSGO', 'child range keeps selected preview text cache');

  const shiftedParentRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 10,
    endOffset: 20,
    text: 'abcdefghij',
  });
  const shiftedChildRange = createChildAnnotationRangeFromParentRange({
    parentRange: shiftedParentRange,
    selectionStartOffset: 2,
    selectionEndOffset: 5,
    selectedText: 'cde',
  });
  assert(shiftedChildRange, 'child range can be created from a shifted parent span');
  assertEqual(shiftedChildRange.start_offset, 12, 'child preview local start offset is translated to source offset');
  assertEqual(shiftedChildRange.end_offset, 15, 'child preview local end offset is translated to source offset');

  const childRangeFromTextUnit = createChildAnnotationRangeFromParentRange({
    parentRange: unitRange,
    selectionStartOffset: 0,
    selectionEndOffset: 5,
    selectedText: 'Power',
  });
  assert(childRangeFromTextUnit, 'child range can be created from a parent TextUnit preview selection');
  assertEqual(childRangeFromTextUnit.start_offset, 0, 'child range from TextUnit starts at local offset');
  assertEqual(childRangeFromTextUnit.end_offset, 5, 'child range from TextUnit ends at local offset');

  const childRangeFromBlock = createChildAnnotationRangeFromParentRange({
    parentRange: blockRange,
    selectionStartOffset: 0,
    selectionEndOffset: 5,
    selectedText: 'Whole',
  });
  assertEqual(childRangeFromBlock, null, 'block range previews are not converted into text-span child ranges without TextFlow coordinates');

  const rangeExtended = addRangeToAnnotationTruth(gameAnnotation, overlappingDefinitionRange);
  assertEqual(rangeExtended.ranges.length, 2, 'annotationTruthService can add a range');
  assertEqual(hideAnnotationTruth(gameAnnotation).status, 'hidden', 'annotationTruthService can hide annotation');
  assertEqual(restoreAnnotationTruth(hideAnnotationTruth(gameAnnotation)).status, 'active', 'annotationTruthService can restore annotation');

  const blockSummary = summarizeAnnotationsForBlock({
    annotations: [createAnnotationTruth({
      noteId: 'note-test',
      canvasId: 'canvas-test',
      label: 'important block',
      ranges: [blockRange],
    })],
    blockId: 'block-a',
  });
  assertEqual(blockSummary.count, 1, 'block summary counts block-level annotation');

  const rangeMember = createContentGroupMemberFromRange(overlappingDefinitionRange);
  const annotationMember = createContentGroupMemberFromAnnotation(definitionAnnotation);
  const labelDragText = plainTextFromContentGroupDragPayload({
    kind: 'label',
    annotation_id: definitionAnnotation.id,
    label: definitionAnnotation.raw_label,
    ranges: [overlappingDefinitionRange, overlappingGameRange],
    text_preview: 'fallback label preview',
  });
  assert(
    labelDragText.includes('\n'),
    'Label drag payload with multiple ranges projects into multiline plain text',
  );
  assertEqual(
    plainTextFromContentGroupDragPayload({
      kind: 'draft_range',
      ranges: [overlappingDefinitionRange],
      label: 'Draft range',
    }),
    overlappingDefinitionRange.range_text_cache || '',
    'Draft Range drag payload projects source range text',
  );
  const noteRootFolderId = systemGroupFolderId({
    kind: 'note',
    project_id: 'project-test',
    note_id: 'note-test',
    label: null,
  });
  const folders = ensureGroupFolderRoots({
    folders: [],
    projectId: 'project-test',
    noteId: 'note-test',
  });
  assert(folders.some((folder) => folder.id === noteRootFolderId), 'GroupFolder roots include note root');
  const chapterFolder = createGroupFolder({
    title: 'Chapter 1',
    scope: { kind: 'note', project_id: 'project-test', note_id: 'note-test', label: null },
    parentFolderId: noteRootFolderId,
  });
  const sectionFolder = createGroupFolder({
    title: 'Power Series',
    scope: chapterFolder.scope,
    parentFolderId: chapterFolder.id,
  });
  const folderTree = [...folders, chapterFolder, sectionFolder];
  assertEqual(groupFolderPath(folderTree, sectionFolder.id).map((folder) => folder.title).join(' / '), 'Note groups / Chapter 1 / Power Series', 'GroupFolder path describes nested folder position');
  assertEqual(moveGroupFolder({ folders: folderTree, folderId: noteRootFolderId, nextParentFolderId: sectionFolder.id })[0].parent_folder_id, null, 'system GroupFolder root cannot be moved');
  assertEqual(canMoveGroupFolder({
    folders: folderTree,
    folderId: chapterFolder.id,
    nextParentFolderId: 'missing-folder',
  }), false, 'GroupFolder cannot move under a missing parent');
  assertEqual(canMoveGroupFolder({
    folders: [
      ...folderTree,
      { ...createGroupFolder({
        title: 'Archived references',
        scope: chapterFolder.scope,
        parentFolderId: noteRootFolderId,
      }), id: 'deleted-folder', status: 'deleted' },
    ],
    folderId: chapterFolder.id,
    nextParentFolderId: 'deleted-folder',
  }), false, 'GroupFolder cannot move under a deleted parent');
  const contentGroup = createContentGroup({
    projectId: 'project-test',
    noteId: 'note-test',
    canvasId: 'canvas-test',
    title: 'Power Series Definition',
    members: [rangeMember, annotationMember, annotationMember],
    folderId: sectionFolder.id,
    depth: 3,
  });
  assertEqual(contentGroup.members.length, 2, 'ContentGroup deduplicates member references');
  assertEqual(contentGroup.folder_id, sectionFolder.id, 'ContentGroup stores folder placement id');
  assertEqual(contentGroup.placements?.[0]?.folder_id, sectionFolder.id, 'ContentGroup mirrors folder placement into placements');
  assertEqual(contentGroup.depth, 3, 'ContentGroup stores depth');
  assertEqual(
    deleteGroupFolder({
      folders: folderTree,
      groups: [contentGroup],
      folderId: sectionFolder.id,
      allowNonEmpty: false,
    }).find((folder) => folder.id === sectionFolder.id)?.status,
    'active',
    'GroupFolder delete is blocked when active ContentGroups are placed inside',
  );
  const emptyDeletedFolders = deleteGroupFolder({
    folders: folderTree,
    groups: [contentGroup],
    folderId: chapterFolder.id,
    allowNonEmpty: true,
  });
  assertEqual(
    emptyDeletedFolders.find((folder) => folder.id === chapterFolder.id)?.status,
    'deleted',
    'GroupFolder can be deleted when caller explicitly allows non-empty cleanup',
  );
  assertEqual(contentGroup.identity.status, 'none', 'ContentGroup starts without forced identity');
  assertEqual(contentGroup.identity.topic, null, 'ContentGroup starts without forced topic');
  const staleInterpretationContentGroup = normalizeContentGroup({
    ...contentGroup,
    identity: undefined,
    interpretation: {
      role: 'definition',
      topic: 'Power Series',
      brief: 'Legacy local interpretation',
    },
  });
  assertEqual(staleInterpretationContentGroup.identity.status, 'draft', 'stale ContentGroup interpretation normalizes into draft identity');
  assertEqual(staleInterpretationContentGroup.identity.summary, 'Legacy local interpretation', 'stale ContentGroup interpretation brief normalizes into identity summary');
  const orphanedMember = markContentGroupMemberIntegrity(rangeMember, 'orphaned', 'missing range');
  assertEqual(orphanedMember.id, rangeMember.id, 'ContentGroup integrity marking preserves member identity');
  assertEqual(orphanedMember.metadata?.integrity_status, 'orphaned', 'ContentGroup integrity marking writes status');
  assertEqual(orphanedMember.metadata?.integrity_reason, 'missing range', 'ContentGroup integrity marking writes reason');
  const refreshedMember = refreshContentGroupMemberPreview(rangeMember, {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'Updated source-backed preview',
  }, '2026-06-18T00:00:00.000Z');
  assertEqual(refreshedMember.preview_text, 'Updated source-backed preview', 'ContentGroup preview refresh updates cache from source');
  assertEqual(refreshedMember.metadata?.integrity_status, 'valid', 'ContentGroup preview refresh marks resolved member valid');
  assertEqual(refreshedMember.metadata?.preview_refreshed_at, '2026-06-18T00:00:00.000Z', 'ContentGroup preview refresh stores refresh timestamp');
  const missingMember = refreshContentGroupMemberPreview(rangeMember, {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => null,
  });
  assertEqual(missingMember.metadata?.integrity_status, 'orphaned', 'ContentGroup preview refresh marks missing source orphaned');
  const renamedContentGroup = renameContentGroup({
    group: contentGroup,
    title: 'Renamed knowledge bundle',
  });
  assertEqual(renamedContentGroup.title, 'Renamed knowledge bundle', 'ContentGroup can rename');
  const draftIdentityGroup = updateContentGroupIdentityDraft({
    group: renamedContentGroup,
    role: 'definition',
    topic: 'Power Series',
    summary: 'A proposed identity for review.',
  });
  assertEqual(draftIdentityGroup.identity.status, 'draft', 'ContentGroup identity can be drafted');
  assertEqual(draftIdentityGroup.identity.role, 'definition', 'ContentGroup identity stores role');
  const acceptedIdentityGroup = acceptContentGroupIdentity(draftIdentityGroup);
  assertEqual(acceptedIdentityGroup.identity.status, 'accepted', 'draft ContentGroup identity can be accepted');
  assert(Boolean(acceptedIdentityGroup.identity.accepted_at), 'accepted ContentGroup identity records accepted timestamp');
  const acceptedRenamedGroup = renameContentGroup({
    group: acceptedIdentityGroup,
    title: 'Renamed after acceptance',
  });
  assertEqual(acceptedRenamedGroup.identity.status, 'accepted', 'renaming title does not invalidate accepted identity');
  const invalidatedGroup = addMembersToContentGroup(acceptedRenamedGroup, [createContentGroupMemberFromRange(overlappingGameRange)]);
  assertEqual(invalidatedGroup.identity.status, 'draft', 'accepted identity becomes draft after member add');
  assertEqual(invalidatedGroup.identity.accepted_at, null, 'invalidated identity clears accepted timestamp');
  const rejectedIdentityGroup = rejectContentGroupIdentity(draftIdentityGroup);
  assertEqual(rejectedIdentityGroup.identity.status, 'rejected', 'draft ContentGroup identity can be rejected');
  assertEqual(updateContentGroupIdentityDraft({ group: rejectedIdentityGroup }).identity.status, 'draft', 'rejected identity can return to draft');
  const archivedIdentityGroup = archiveContentGroupIdentity(acceptedIdentityGroup);
  assertEqual(archivedIdentityGroup.identity.status, 'archived', 'accepted ContentGroup identity can be archived');
  assertEqual(updateContentGroupIdentityDraft({ group: archivedIdentityGroup }).identity.status, 'draft', 'archived identity can return to draft');
  const trimmedContentGroup = removeContentGroupMember(renamedContentGroup, renamedContentGroup.members[0].id);
  assertEqual(trimmedContentGroup.members.length, 1, 'ContentGroup can remove a member');
  const cascadeGroup = createContentGroup({
    projectId: 'project-a',
    noteId: 'note-a',
    canvasId: 'canvas-a',
    title: 'Cascade group',
    members: [
      { id: 'member-a', kind: 'block', current_content: 'A', preview_text: 'A', order_index: 0 },
      { id: 'member-b', kind: 'block', current_content: 'B', preview_text: 'B', order_index: 1 },
    ],
  });
  const cascadeWithPetal = normalizeContentGroup({
    ...cascadeGroup,
    fragments: [{
      id: 'fragment-a',
      source_member_id: 'member-a',
      content_range: null,
      preview_text: 'A fragment',
      order_index: 0,
      status: 'active',
      created_at: cascadeGroup.created_at,
      updated_at: cascadeGroup.updated_at,
    }, {
      id: 'fragment-b',
      source_member_id: 'member-b',
      content_range: null,
      preview_text: 'B fragment',
      order_index: 1,
      status: 'active',
      created_at: cascadeGroup.created_at,
      updated_at: cascadeGroup.updated_at,
    }],
    petals: [{
      id: 'petal-a',
      label: 'Dependent',
      members: [],
      fragment_ids: ['fragment-a'],
      order_index: 0,
      status: 'active',
      created_at: cascadeGroup.created_at,
      updated_at: cascadeGroup.updated_at,
    }, {
      id: 'petal-b',
      label: 'Independent',
      members: [],
      fragment_ids: ['fragment-b'],
      order_index: 1,
      status: 'active',
      created_at: cascadeGroup.created_at,
      updated_at: cascadeGroup.updated_at,
    }],
  });
  const afterHardDelete = removeContentGroupMember(cascadeWithPetal, 'member-a');
  assertEqual((afterHardDelete.fragments || []).length, 1, 'member hard delete removes dependent fragments');
  assertEqual((afterHardDelete.fragments || [])[0]?.id, 'fragment-b', 'member hard delete keeps independent fragments');
  assertEqual(afterHardDelete.petals.length, 1, 'member hard delete removes dependent petals');
  assertEqual(afterHardDelete.petals[0].id, 'petal-b', 'member hard delete keeps independent petals');
  assertEqual(afterHardDelete.petals[0].order_index, 0, 'member hard delete reindexes remaining petals');
  const restoredContentGroup = addMembersToContentGroup(trimmedContentGroup, [rangeMember]);
  assertEqual(restoredContentGroup.members.length, 2, 'ContentGroup can add a member back');
  const groupWithPetal = addPetalToContentGroup(restoredContentGroup, 'Statement');
  assertEqual(groupWithPetal.petals.length, 1, 'ContentGroup can create a petal');
  const fragmentFromMember = createContentGroupFragmentFromMember({
    member: groupWithPetal.members[0],
    contentRange: overlappingDefinitionRange,
    label: 'concept name',
  });
  assertEqual(fragmentFromMember.source_member_id, groupWithPetal.members[0].id, 'ContentGroup fragment keeps source member id');
  const petalWithHelperFragment = addMemberFragmentToPetal({
    group: groupWithPetal,
    petalId: groupWithPetal.petals[0].id,
    memberId: groupWithPetal.members[0].id,
    contentRange: overlappingDefinitionRange,
    label: 'concept name',
  });
  assertEqual(petalWithHelperFragment.fragments?.length, 1, 'ContentGroup can create a member fragment for a Petal');
  assertEqual(petalWithHelperFragment.petals[0].fragment_ids?.length, 1, 'ContentGroup Petal stores fragment references');
  const petalAfterFragmentRemove = removeContentGroupPetalFragment({
    group: petalWithHelperFragment,
    petalId: petalWithHelperFragment.petals[0].id,
    fragmentId: petalWithHelperFragment.fragments?.[0]?.id || '',
  });
  assertEqual(petalAfterFragmentRemove.members.length, groupWithPetal.members.length, 'Removing a Petal fragment keeps top-level members');
  assertEqual(petalAfterFragmentRemove.petals[0].fragment_ids?.length || 0, 0, 'Removing a Petal fragment only clears the Petal reference');
  const renamedPetalGroup = renameContentGroupPetal({
    group: groupWithPetal,
    petalId: groupWithPetal.petals[0].id,
    label: 'Condition',
  });
  assertEqual(renamedPetalGroup.petals[0].label, 'Condition', 'ContentGroup petal can rename');
  const petalWithMember = addMembersToPetal({
    group: renamedPetalGroup,
    petalId: renamedPetalGroup.petals[0].id,
    members: [annotationMember],
  });
  assertEqual(petalWithMember.petals[0].members.length, 1, 'ContentGroup petal can hold members');
  const groupWithFragment = addContentGroupFragment({
    group: petalWithMember,
    sourceMemberId: petalWithMember.members[0].id,
    contentRange: overlappingDefinitionRange,
    label: 'concept name',
  });
  assertEqual(groupWithFragment.fragments?.length, 1, 'ContentGroup can split a member into a fragment');
  const petalWithFragment = assignFragmentsToPetal({
    group: groupWithFragment,
    petalId: groupWithFragment.petals[0].id,
    fragmentIds: [groupWithFragment.fragments?.[0]?.id || ''],
  });
  assertEqual(petalWithFragment.petals[0].fragment_ids?.length, 1, 'ContentGroup petal can reference fragments');
  assertEqual(normalizeContentGroup(petalWithMember).members.length, 2, 'ContentGroup normalization preserves members');
  const refreshedContentGroup = refreshContentGroupPreviews(petalWithMember, {
    resolveAnnotationPreview: () => 'annotation source preview',
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'range source preview',
  });
  assertEqual(refreshedContentGroup.members[0].metadata?.integrity_status, 'valid', 'ContentGroup preview refresh resolves top-level members');
  assertEqual(refreshedContentGroup.petals[0].members[0].preview_text, 'annotation source preview', 'ContentGroup preview refresh resolves Petal members');
  const auditedContentGroup = auditContentGroupIntegrity(refreshedContentGroup, {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'range source preview',
  });
  assertEqual(auditedContentGroup.issues.length, 2, 'ContentGroup integrity audit reports broken top-level and Petal member references');
  assertEqual(auditedContentGroup.issues[0].status, 'orphaned', 'ContentGroup integrity audit classifies missing source');
  assertEqual(softDeleteContentGroup(petalWithMember).status, 'deleted', 'ContentGroup can soft delete');

  const interpretation = createReadingInterpretation({
    noteId: 'note-test',
    canvasId: 'canvas-test',
    summary: 'The sentence defines a game preference.',
    proposedAnnotationIds: [definitionAnnotation.id],
    createdBy: 'human_debug',
  });
  assertEqual(interpretation.status, 'draft', 'ReadingInterpretation starts as draft');
  const readingProposal = createReadingAnnotationProposal({
    interpretation,
    label: 'definition',
    ranges: [overlappingDefinitionRange],
    reasoningSummary: 'Full sentence is a local definition.',
  });
  assertEqual(readingProposal.interpretation_id, interpretation.id, 'Reading proposal links to interpretation');
  const acceptedReadingProposal = acceptAnnotationProposalToTruth({
    proposal: readingProposal,
    canvasId: 'canvas-test',
  });
  assertEqual(acceptedReadingProposal.proposal.status, 'accepted', 'Reading proposal can be accepted');
  assertEqual(acceptedReadingProposal.annotation.raw_label, 'definition', 'Accepted Reading proposal creates AnnotationTruth');
  const readingProjection = projectAnnotationsForReading({
    annotations: [parentWithChild, childWithParent, gameAnnotation, definitionAnnotation],
  });
  assert(readingProjection.includes('Annotation: definition'), 'reading projection contains annotation label');
  assert(readingProjection.includes("CSGO is Henry's favourite game"), 'reading projection contains exact range cache');
  assert(readingProjection.includes('Children:'), 'reading projection contains child annotations');
  assert(!readingProjection.includes('Annotation Sets:'), 'reading projection does not revive retired AnnotationSet output');
  const contentGroupProjection = projectContentGroupsForReading({
    contentGroups: [
      acceptedIdentityGroup,
      draftIdentityGroup,
      contentGroup,
      softDeleteContentGroup(acceptedIdentityGroup),
    ],
  });
  assertEqual(contentGroupProjection.knowledge_objects.length, 1, 'accepted ContentGroup identity projects as a knowledge object alias');
  assertEqual(contentGroupProjection.knowledge_objects[0].source, 'content_group_identity', 'accepted ContentGroup projection marks identity source');
  assertEqual(contentGroupProjection.draft_knowledge_candidates.length, 1, 'draft ContentGroup identity projects as a draft candidate');
  const groupIndex = buildContentGroupIndex({
    groups: [acceptedIdentityGroup, draftIdentityGroup, contentGroup],
    folders: folderTree,
  });
  assert(groupIndex.some((entry) => entry.folder_path.includes('Power Series')), 'ContentGroup index records folder path');
  assertEqual(filterContentGroupIndex({ entries: groupIndex, folderId: sectionFolder.id }).length, 3, 'ContentGroup index can filter by selected folder');
  const relationCandidates = buildContentGroupRelationCandidates([acceptedIdentityGroup, draftIdentityGroup]);
  assert(relationCandidates.some((candidate) => candidate.kind === 'group' && candidate.accepted), 'accepted ContentGroup projects as relation candidate');
  assert(relationCandidates.some((candidate) => candidate.kind === 'member'), 'ContentGroup members project as relation candidate leaves');

  const definition = NOTE_SLASH_COMMANDS.find((command) => command.id === 'definition');
  assert(definition, '/definition command exists');
  assertEqual(definition.commandKind, 'annotation_action', '/definition is an annotation action');
  assertEqual(definition.annotationLabel, 'definition', '/definition carries default annotation label');
  assertEqual(definition.templateKey, undefined, '/definition does not create a block template');
}

function testContentGroupAndGroupFolderContract(): void {
  const noteRootFolderId = systemGroupFolderId({
    kind: 'note',
    project_id: 'project-contract',
    note_id: 'note-contract',
    label: null,
  });
  const roots = ensureGroupFolderRoots({
    folders: [],
    projectId: 'project-contract',
    noteId: 'note-contract',
  });
  const chapterFolder = createGroupFolder({
    title: 'Chapter 1',
    scope: { kind: 'note', project_id: 'project-contract', note_id: 'note-contract', label: null },
    parentFolderId: noteRootFolderId,
  });
  const topicFolder = createGroupFolder({
    title: 'Power Series',
    scope: chapterFolder.scope,
    parentFolderId: chapterFolder.id,
  });
  const folders = [...roots, chapterFolder, topicFolder];
  const definitionRange = createTextSpanAnnotationRange({
    blockId: 'block-contract',
    textFlowId: 'flow-contract',
    textUnitId: 'unit-contract',
    startOffset: 0,
    endOffset: 12,
    text: 'Power series',
  });
  const theoremRange = createTextSpanAnnotationRange({
    blockId: 'block-contract',
    textFlowId: 'flow-contract',
    textUnitId: 'unit-contract',
    startOffset: 24,
    endOffset: 41,
    text: 'convergence radius',
  });
  const group = createContentGroup({
    projectId: 'project-contract',
    noteId: 'note-contract',
    canvasId: 'canvas-contract',
    title: 'Power Series Definition',
    members: [createContentGroupMemberFromRange(definitionRange)],
    folderId: topicFolder.id,
    folders,
  });

  assertEqual(group.depth, groupFolderDerivedDepth(folders, topicFolder.id), 'ContentGroup derives depth from GroupFolder path');
  const normalized = normalizeContentGroupsWithFolders({
    groups: [{ ...group, depth: 99 }],
    folders,
  });
  assertEqual(normalized[0].depth, groupFolderDerivedDepth(folders, topicFolder.id), 'ContentGroup normalization re-derives stale depth');

  const movedGroup = moveContentGroupToFolder({ group, folderId: chapterFolder.id });
  assertEqual(movedGroup.folder_id, chapterFolder.id, 'moving a ContentGroup changes folder placement');
  assertEqual(movedGroup.members[0].current_content, group.members[0].current_content, 'moving a group preserves member-local content');
  assertEqual(
    movedGroup.members[0].source_ref?.snapshot_text,
    group.members[0].source_ref?.snapshot_text,
    'moving a group preserves member source snapshot',
  );

  const archivedFolder = {
    ...createGroupFolder({
      title: 'Archived references',
      scope: chapterFolder.scope,
      parentFolderId: chapterFolder.id,
    }),
    status: 'archived' as const,
  };
  const foldersWithArchive = [...folders, archivedFolder];
  assert(
    !activeGroupFolders(foldersWithArchive).some((folder) => folder.id === archivedFolder.id),
    'archived folders are excluded from active resource-manager folders',
  );
  assert(
    !groupFolderChildren(foldersWithArchive, chapterFolder.id).some((folder) => folder.id === archivedFolder.id),
    'default folder children exclude archived folders',
  );
  assert(
    groupFolderChildren(foldersWithArchive, chapterFolder.id, { includeArchived: true }).some((folder) => folder.id === archivedFolder.id),
    'folder children can include archived folders for management checks',
  );
  assertEqual(
    canDeleteGroupFolder({ folders: foldersWithArchive, groups: [], folderId: chapterFolder.id }),
    false,
    'folder delete guard treats archived children as non-empty',
  );
  const blockedDeleteWithArchivedChild = deleteGroupFolder({
    folders: foldersWithArchive,
    groups: [],
    folderId: chapterFolder.id,
  });
  assertEqual(
    blockedDeleteWithArchivedChild.find((folder) => folder.id === chapterFolder.id)?.status,
    'active',
    'deleteGroupFolder leaves a folder active when archived children remain',
  );
  const groupInChapterFolder = moveContentGroupToFolder({ group, folderId: chapterFolder.id });
  assertEqual(
    canDeleteGroupFolder({ folders, groups: [groupInChapterFolder], folderId: chapterFolder.id }),
    false,
    'folder delete guard blocks folders that still contain groups',
  );

  const missingFolderIssues = validateContentGroupGraph({
    groups: [{ ...group, folder_id: 'missing-folder', placements: [{ folder_id: 'missing-folder', order_index: 0, added_at: group.created_at, added_by: 'human' }] }],
    folders,
  });
  assert(missingFolderIssues.some((issue) => issue.status === 'missing_folder'), 'ContentGroup graph validation catches missing folder placement');

  const groupWithPetal = addPetalToContentGroup(group, 'Condition');
  const petalWithForeignMember = {
    ...groupWithPetal,
    petals: [{
      ...groupWithPetal.petals[0],
      members: [createContentGroupMemberFromRange(theoremRange)],
    }],
  };
  const petalIssues = validateContentGroupGraph({ groups: [petalWithForeignMember], folders });
  assert(petalIssues.some((issue) => issue.status === 'petal_member_not_in_group'), 'ContentGroup graph validation catches petal member outside parent group');

  const acceptedWithStaleMember = acceptContentGroupIdentity(updateContentGroupIdentityDraft({
    group: {
      ...group,
      members: [markContentGroupMemberIntegrity(group.members[0], 'orphaned', 'range removed')],
    },
    role: 'definition',
    topic: 'Power Series',
  }));
  const acceptedIssues = validateContentGroupGraph({ groups: [acceptedWithStaleMember], folders });
  assert(acceptedIssues.some((issue) => issue.status === 'accepted_group_has_issue'), 'ContentGroup graph validation blocks accepted group with stale members');

  const missingParentIssues = validateGroupFolderGraph([
    ...folders,
    { ...topicFolder, id: 'folder-with-missing-parent', parent_folder_id: 'missing-parent' },
  ]);
  assert(missingParentIssues.some((issue) => issue.status === 'missing_parent'), 'GroupFolder validation catches missing parent');

  const cycleIssues = validateGroupFolderGraph([
    ...roots,
    { ...chapterFolder, id: 'cycle-a', parent_folder_id: 'cycle-b', system_root: false },
    { ...topicFolder, id: 'cycle-b', parent_folder_id: 'cycle-a', system_root: false },
  ]);
  assert(cycleIssues.some((issue) => issue.status === 'cycle'), 'GroupFolder validation catches parent cycles');
}

function testContentGroupSurfaceRoles(): void {
  const roles = contentGroupSurfaceRoleList();
  assertEqual(roles.length, 3, 'ContentGroup System exposes exactly three primary surfaces');
  assertEqual(contentGroupSurfaceRoleLabel('rail'), 'Collect', 'Groups Rail role label is stable');
  assertEqual(contentGroupSurfaceRoleLabel('gallery'), 'Organize', 'Group Gallery role label is stable');
  assertEqual(contentGroupSurfaceRoleLabel('editor'), 'Refine', 'Single ContentGroup Editor role label is stable');

  const verbs = new Set(roles.map((role) => role.verb));
  assertEqual(verbs.size, 3, 'ContentGroup surface verbs stay distinct');
  assertEqual(CONTENT_GROUP_SURFACE_ROLES.rail.verb, 'collect', 'Rail remains the collect surface');
  assertEqual(CONTENT_GROUP_SURFACE_ROLES.gallery.verb, 'organize', 'Gallery remains the organize surface');
  assertEqual(CONTENT_GROUP_SURFACE_ROLES.editor.verb, 'refine', 'Single Editor remains the refine surface');
  assert(
    CONTENT_GROUP_SURFACE_ROLES.rail.boundary.includes('Single Editor'),
    'Rail boundary sends deep refinement to Single Editor',
  );
  assert(
    CONTENT_GROUP_SURFACE_ROLES.gallery.boundary.includes('source'),
    'Gallery boundary documents that organization does not move source truth',
  );
}

function testContentGroupEntityCutoverBoundary(): void {
  const entityGroup = createContentGroup({
    projectId: 'project-a',
    noteId: 'note-a',
    canvasId: 'canvas-a',
    title: 'Entity group',
    members: [],
  });
  const legacyGroup = {
    ...entityGroup,
    id: 'content-group-legacy-id',
    title: 'Legacy group',
  };

  assertEqual(
    shouldImportLegacyContentGroups({ entityGroups: [entityGroup], legacyGroups: [legacyGroup] }),
    false,
    'legacy metadata groups are not imported when entity groups already exist',
  );
  assertEqual(
    shouldImportLegacyContentGroups({ entityGroups: [], legacyGroups: [legacyGroup] }),
    true,
    'legacy metadata groups can import when entity table has no groups for the note',
  );

  const merged = mergeEntityAndLegacyContentGroups({
    entityGroups: [entityGroup],
    legacyGroups: [legacyGroup],
  });
  assertEqual(merged.length, 1, 'entity groups win over legacy metadata groups');
  assertEqual(merged[0]?.id, entityGroup.id, 'entity group remains the returned truth');

  const strippedMetadata = stripLegacyContentGroupMetadata({
    [NOTE_CONTENT_GROUPS_METADATA_KEY]: [legacyGroup],
    unrelated: true,
  });
  assertEqual(strippedMetadata[NOTE_CONTENT_GROUPS_METADATA_KEY], undefined, 'legacy ContentGroup metadata is removable after import');
  assertEqual(strippedMetadata.unrelated, true, 'stripping legacy ContentGroups preserves unrelated metadata');

  const folderOnlyMetadata = writeGroupFolderMetadata({
    metadata: {
      [NOTE_CONTENT_GROUPS_METADATA_KEY]: [legacyGroup],
      unrelated: true,
    },
    folders: [],
  });
  assertEqual(folderOnlyMetadata[NOTE_CONTENT_GROUPS_METADATA_KEY], undefined, 'folder metadata writer does not persist ContentGroups');
  assert(Array.isArray(folderOnlyMetadata[NOTE_GROUP_FOLDERS_METADATA_KEY]), 'folder metadata writer keeps GroupFolders');
}

function testGroupFolderEntityCutoverBoundary(): void {
  const entityFolder = createGroupFolder({
    title: 'Entity Note groups',
    scope: { kind: 'note', project_id: 'project-a', note_id: 'note-a' },
    origin: 'system',
    systemRoot: true,
    orderIndex: 0,
  });
  const legacyFolder = {
    ...entityFolder,
    id: 'legacy-folder',
    title: 'Legacy Note groups',
  };
  const legacyCustomFolder = createGroupFolder({
    title: 'Legacy custom folder',
    scope: { kind: 'note', project_id: 'project-a', note_id: 'note-a' },
    parentFolderId: entityFolder.id,
    origin: 'human',
    orderIndex: 1,
  });

  assertEqual(
    shouldImportLegacyGroupFolders({ entityFolders: [entityFolder], legacyFolders: [legacyFolder] }),
    false,
    'legacy folder metadata is not imported when entity folders already exist',
  );
  assertEqual(
    shouldImportLegacyGroupFolders({ entityFolders: [], legacyFolders: [legacyFolder] }),
    false,
    'legacy system root folders are not imported as entity roots',
  );
  assertEqual(
    shouldImportLegacyGroupFolders({ entityFolders: [entityFolder], legacyFolders: [legacyFolder, legacyCustomFolder] }),
    true,
    'legacy custom folders import when entity table only has system roots',
  );
  const legacyFolderImportPayload = legacyGroupFoldersToImport({
    entityFolders: [entityFolder],
    legacyFolders: [legacyFolder, legacyCustomFolder],
  });
  assertEqual(legacyFolderImportPayload.length, 1, 'legacy import payload keeps only custom folders');
  assertEqual(legacyFolderImportPayload[0]?.id, legacyCustomFolder.id, 'legacy import payload preserves custom folder id');
  assertEqual(legacyFolderImportPayload[0]?.parent_folder_id, entityFolder.id, 'legacy import payload remaps root parent to entity root');

  const merged = mergeEntityAndLegacyGroupFolders({
    entityFolders: [entityFolder],
    legacyFolders: [legacyFolder],
  });
  assertEqual(merged.length, 1, 'entity folders win over legacy folder metadata');
  assertEqual(merged[0]?.id, entityFolder.id, 'entity folder remains the returned truth');

  const stripped = stripLegacyGroupFolderMetadata({
    [NOTE_CONTENT_GROUPS_METADATA_KEY]: [{ id: 'legacy-group' }],
    [NOTE_GROUP_FOLDERS_METADATA_KEY]: [legacyFolder],
    unrelated: true,
  });
  assertEqual(NOTE_GROUP_FOLDERS_METADATA_KEY in stripped, false, 'legacy folder metadata key is absent after strip');
  assertEqual(NOTE_CONTENT_GROUPS_METADATA_KEY in stripped, true, 'legacy content group metadata remains after folder strip');
  assertEqual(stripped[NOTE_GROUP_FOLDERS_METADATA_KEY], undefined, 'legacy GroupFolder metadata is removable after import');
  assert(Array.isArray(stripped[NOTE_CONTENT_GROUPS_METADATA_KEY]), 'folder metadata strip does not touch legacy ContentGroups');
  assertEqual(stripped.unrelated, true, 'stripping legacy GroupFolders preserves unrelated metadata');
}

function testContentGroupMemberSourceBoundary(): void {
  const range = createTextSpanAnnotationRange({
    blockId: 'block-source-boundary',
    textFlowId: 'flow-source-boundary',
    textUnitId: 'unit-source-boundary',
    startOffset: 0,
    endOffset: 12,
    text: 'Power series',
  });
  const member = createContentGroupMemberFromRange(range);
  assertEqual(member.current_content, 'Power series', 'new range member stores group-local current content');
  assert(member.source_ref?.range, 'new range member stores a source reference range');
  assertEqual(member.source_ref?.snapshot_text, 'Power series', 'source ref keeps source snapshot text');
  assertEqual(member.source_sync_status, 'fresh', 'new range member starts fresh against source');

  const divergent = normalizeContentGroupMember({
    ...member,
    current_content: 'Edited local content',
    preview_text: 'display cache only',
    source_ref: {
      ...member.source_ref,
      snapshot_text: 'Power series',
      status: 'fresh',
    },
    source_sync_status: 'fresh',
  });
  assertEqual(divergent.current_content, 'Edited local content', 'preview_text does not override member truth');
  assertEqual(divergent.preview_text, 'display cache only', 'preview_text remains a display cache');

  const changedResolver = {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'Power series updated',
  };
  const compared = compareContentGroupMemberWithSource(divergent, changedResolver, '2026-06-22T00:00:00.000Z');
  assertEqual(compared.current_content, 'Edited local content', 'compare-with-source does not rewrite member truth');
  assertEqual(compared.source_sync_status, 'changed', 'compare-with-source marks changed source');
  assertEqual(compared.source_ref?.status, 'changed', 'source ref mirrors changed source status');

  const refreshed = refreshContentGroupMemberFromSource(compared, changedResolver, '2026-06-22T00:01:00.000Z');
  assertEqual(refreshed.current_content, 'Power series updated', 'explicit refresh updates member truth from source');
  assertEqual(refreshed.preview_text, 'Power series updated', 'explicit refresh updates display cache');
  assertEqual(refreshed.source_sync_status, 'fresh', 'explicit refresh returns member to fresh status');
  assertEqual(refreshed.source_ref?.snapshot_text, 'Power series updated', 'explicit refresh updates source snapshot');

  const missingResolver = {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => null,
  };
  const missing = compareContentGroupMemberWithSource(refreshed, missingResolver, '2026-06-22T00:02:00.000Z');
  assertEqual(missing.source_sync_status, 'missing', 'compare-with-source marks missing source');
  assertEqual(missing.current_content, 'Power series updated', 'missing source keeps member truth intact');
}

function testContentGroupReuseBoundary(): void {
  assertEqual(CONTENT_GROUP_REUSE_MODES.length, 5, 'ContentGroup reuse vocabulary has five modes');
  assert(CONTENT_GROUP_REUSE_MODES.includes('reference'), 'reuse vocabulary includes reference');
  assert(CONTENT_GROUP_REUSE_MODES.includes('duplicate'), 'reuse vocabulary includes duplicate');
  assert(CONTENT_GROUP_REUSE_MODES.includes('fork'), 'reuse vocabulary includes fork');
  assert(CONTENT_GROUP_REUSE_MODES.includes('materialize'), 'reuse vocabulary includes materialize');
  assert(CONTENT_GROUP_REUSE_MODES.includes('open_original'), 'reuse vocabulary includes open original');

  const folderId = systemGroupFolderId({
    kind: 'note',
    project_id: 'project-reuse',
    note_id: 'note-reuse',
    label: null,
  });
  const folders = ensureGroupFolderRoots({
    folders: [],
    projectId: 'project-reuse',
    noteId: 'note-reuse',
  });
  const sourceRange = createTextSpanAnnotationRange({
    blockId: 'block-reuse',
    textFlowId: 'flow-reuse',
    textUnitId: 'unit-reuse',
    startOffset: 0,
    endOffset: 12,
    text: 'Power series',
  });
  const group = createContentGroup({
    projectId: 'project-reuse',
    noteId: 'note-reuse',
    canvasId: 'canvas-reuse',
    title: 'Reusable group',
    folderId,
    folders,
    members: [createContentGroupMemberFromRange(sourceRange)],
  });

  const reference = createContentGroupReferenceDescriptor(group);
  assertEqual(reference.mode, 'reference', 'reference descriptor keeps mode');
  assertEqual(reference.group_id, group.id, 'reference descriptor points to original group');
  assert(!('members' in reference), 'reference descriptor does not copy group body data');

  const duplicate = duplicateContentGroupForContext({
    group,
    projectId: 'project-copy',
    noteId: 'note-copy',
    canvasId: 'canvas-copy',
    folderId: 'folder-copy',
    folders,
  });
  assert(duplicate.id !== group.id, 'duplicate creates a new group identity');
  assertEqual(duplicate.project_id, 'project-copy', 'duplicate writes current project context');
  assertEqual(duplicate.members.length, group.members.length, 'duplicate copies members into new group');
  assertEqual(duplicate.metadata?.reuse_mode, 'duplicate', 'duplicate records reuse mode');

  const fork = forkContentGroupForContext({
    group,
    projectId: 'project-fork',
    noteId: 'note-fork',
    canvasId: 'canvas-fork',
    folderId: 'folder-fork',
    folders,
  });
  assert(fork.id !== group.id, 'fork creates a new group identity');
  assertEqual(fork.metadata?.reuse_mode, 'fork', 'fork records reuse mode');
  assertEqual(fork.metadata?.forked_from_group_id, group.id, 'fork preserves original group lineage');

  const materializePlan = createContentGroupMaterializePlan({
    group,
    targetNoteId: 'note-target',
  });
  assertEqual(materializePlan.mode, 'materialize', 'materialize plan keeps mode');
  assertEqual(materializePlan.moves_source, false, 'materialize plan never moves original source');
  assertEqual(materializePlan.blocks.length, group.members.length, 'materialize plan uses one block per member');
  assertEqual(materializePlan.blocks[0].text, 'Power series', 'materialize block text comes from member content');
  assertEqual(materializePlan.blocks[0].source_ref?.snapshot_text, 'Power series', 'materialize block preserves source snapshot');

  const openOriginal = createContentGroupOpenOriginalDescriptor(group);
  assertEqual(openOriginal.mode, 'open_original', 'open-original descriptor keeps mode');
  assertEqual(openOriginal.group_id, group.id, 'open-original descriptor points to group');
  assertEqual(openOriginal.note_id, group.note_id, 'open-original descriptor keeps source note');
}

function testContentGroupPetalRefinementBoundary(): void {
  const sourceRange = createTextSpanAnnotationRange({
    blockId: 'block-petal-source',
    textFlowId: 'flow-petal-source',
    textUnitId: 'unit-petal-source',
    startOffset: 0,
    endOffset: 18,
    text: 'Petal source truth',
  });
  const member = createContentGroupMemberFromRange(sourceRange);
  const group = addPetalToContentGroup(
    addPetalToContentGroup(
      addPetalToContentGroup(createContentGroup({
        projectId: 'project-petal',
        noteId: 'note-petal',
        canvasId: 'canvas-petal',
        title: 'Petal refinement group',
        members: [member],
      }), 'Definition'),
      'Example',
    ),
    'Practice',
  );
  const groupWithFragment = addMemberFragmentToPetal({
    group,
    petalId: group.petals[2].id,
    memberId: member.id,
    contentRange: sourceRange,
    label: 'practice slice',
  });
  const movedGroup = moveContentGroupPetal({
    group: groupWithFragment,
    petalId: groupWithFragment.petals[2].id,
    targetPetalId: groupWithFragment.petals[0].id,
  });
  assertEqual(movedGroup.petals.map((petal) => petal.label).join(' > '), 'Practice > Definition > Example', 'Petal reorder changes local structure order');
  assertEqual(movedGroup.petals.map((petal) => petal.order_index).join(','), '0,1,2', 'Petal reorder reindexes active petals');
  assertEqual(movedGroup.members[0].current_content, member.current_content, 'Petal reorder preserves member-local content truth');
  assertEqual(movedGroup.members[0].source_ref?.snapshot_text, member.source_ref?.snapshot_text, 'Petal reorder preserves source anchor snapshot');
  assertEqual(movedGroup.fragments?.length, 1, 'Petal reorder preserves group fragments');
  assertEqual(movedGroup.petals[0].fragment_ids?.length, 1, 'Petal reorder moves fragment ownership with the Petal');
  assertEqual(movedGroup.metadata?.source_projection, undefined, 'Petal reorder does not create a source-text label projection');

  const afterPetalRemove = removeContentGroupPetal({
    group: movedGroup,
    petalId: movedGroup.petals[0].id,
  });
  assertEqual(afterPetalRemove.petals.length, 2, 'Petal delete is hard DTO removal');
  assertEqual(afterPetalRemove.members.length, 1, 'Petal delete preserves top-level members');
  assertEqual(afterPetalRemove.members[0].current_content, member.current_content, 'Petal delete preserves member-local content truth');
  assertEqual(afterPetalRemove.fragments?.length, 1, 'Petal delete does not delete group fragments directly');
  assertEqual(afterPetalRemove.petals.map((petal) => petal.order_index).join(','), '0,1', 'Petal delete reindexes remaining petals');

  const editorSavedGroup = applyContentGroupEditorDraft({
    group: movedGroup,
    draft: {
      title: 'Saved editor draft',
      topic: 'Editor topic',
      role: 'definition',
      summary: 'Identity draft should not overwrite local Petal labels.',
    },
    petalLabelDrafts: {
      [movedGroup.petals[0].id]: 'Practice saved locally',
    },
  });
  assertEqual(editorSavedGroup.title, 'Saved editor draft', 'Single Editor draft save updates group title');
  assertEqual(editorSavedGroup.identity.topic, 'Editor topic', 'Single Editor draft save updates identity topic');
  assertEqual(editorSavedGroup.petals[0].label, 'Practice saved locally', 'Single Editor draft save preserves current Petal label draft');
  assertEqual(editorSavedGroup.petals[0].fragment_ids?.length, 1, 'Single Editor draft save preserves Petal fragment references');
}

function testContentGroupStabilitySummary(): void {
  const sourceRange = createTextSpanAnnotationRange({
    blockId: 'block-stability',
    textFlowId: 'flow-stability',
    textUnitId: 'unit-stability',
    startOffset: 0,
    endOffset: 12,
    text: 'Power series',
  });
  const member = createContentGroupMemberFromRange(sourceRange);
  const baseGroup = createContentGroup({
    projectId: 'project-stability',
    noteId: 'note-stability',
    canvasId: 'canvas-stability',
    title: 'Stability group',
    members: [member],
  });

  const emptySummary = summarizeContentGroupStability({
    group: createContentGroup({
      projectId: 'project-stability',
      noteId: 'note-stability',
      canvasId: 'canvas-stability',
      title: 'Empty group',
      members: [],
    }),
  });
  assert(emptySummary.states.includes('empty_group'), 'stability summary catches empty groups');
  assert(Boolean(emptySummary.accept_disabled_reason), 'empty groups cannot be accepted as stable identity');

  const changedMember = compareContentGroupMemberWithSource(member, {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'Power series changed',
  });
  const acceptedWithStaleMember = acceptContentGroupIdentity(updateContentGroupIdentityDraft({
    group: {
      ...baseGroup,
      members: [changedMember],
    },
    role: 'definition',
    topic: 'Power Series',
  }));
  const staleSummary = summarizeContentGroupStability({ group: acceptedWithStaleMember });
  assert(staleSummary.states.includes('stale_member_source'), 'stability summary catches changed source members');
  assert(staleSummary.states.includes('accepted_identity_with_stale_member'), 'stability summary catches accepted identity with stale member');
  assertEqual(staleSummary.severity, 'warning', 'changed source is warning severity');

  const orphanSummary = summarizeContentGroupStability({
    group: {
      ...baseGroup,
      members: [markContentGroupMemberIntegrity(member, 'orphaned', 'range removed')],
    },
  });
  assert(orphanSummary.states.includes('orphaned_member'), 'stability summary catches orphaned members');
  assertEqual(orphanSummary.can_materialize, false, 'orphaned member blocks materialize');

  const emptyPetalSummary = summarizeContentGroupStability({
    group: addPetalToContentGroup(baseGroup, 'Empty role'),
  });
  assert(emptyPetalSummary.states.includes('empty_petal'), 'stability summary catches empty petals');

  const deletedSourceSummary = summarizeContentGroupStability({
    group: baseGroup,
    sourceNoteAvailable: false,
  });
  assert(deletedSourceSummary.states.includes('deleted_source_note'), 'stability summary catches deleted source note context');

  const archivedFolder = createGroupFolder({
    title: 'Archived folder',
    scope: { kind: 'note', project_id: 'project-stability', note_id: 'note-stability' },
    parentFolderId: null,
  });
  const archivedFolderSummary = summarizeContentGroupStability({
    group: baseGroup,
    folder: { ...archivedFolder, status: 'archived' },
  });
  assert(archivedFolderSummary.states.includes('archived_folder'), 'stability summary catches archived folder context');

  const materializeUnavailableSummary = summarizeContentGroupStability({
    group: baseGroup,
    materializeTargetAvailable: false,
  });
  assert(materializeUnavailableSummary.states.includes('materialize_target_unavailable'), 'stability summary catches unavailable materialize target');
  assertEqual(materializeUnavailableSummary.can_materialize, false, 'unavailable target blocks materialize');

  const deletedSummary = summarizeContentGroupStability({ group: softDeleteContentGroup(baseGroup) });
  assert(deletedSummary.states.includes('deleted_group'), 'stability summary catches deleted group');
  assertEqual(deletedSummary.severity, 'danger', 'deleted group is danger severity');
}

function testSelectionDraftEngine(): void {
  const firstRange = createSelectionDraftRangeFromCapturedSelection({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 5,
    text: 'Price drives demand',
  });
  const secondRange = createSelectionDraftRangeFromCapturedSelection({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-b',
    startOffset: 0,
    endOffset: 6,
    text: 'Income shifts demand',
  });
  assert(firstRange, 'first selection draft range is created');
  assert(secondRange, 'second selection draft range is created');

  const draft = replaceSelectionDraft({
    range: firstRange,
    anchorRect: createContractDomRect(0, 0, 100, 20),
  });
  const appendedDraft = appendSelectionDraftRange({
    draft,
    range: secondRange,
    anchorRect: createContractDomRect(0, 24, 100, 20),
  });
  assertEqual(appendedDraft.ranges.length, 2, 'additive selection keeps the previous draft range');
  assertEqual(selectionDraftRangeIdentityKey(appendedDraft.ranges[0]), selectionDraftRangeIdentityKey(firstRange), 'first additive draft range remains first');
  assertEqual(selectionDraftRangeIdentityKey(appendedDraft.ranges[1]), selectionDraftRangeIdentityKey(secondRange), 'second additive draft range is appended');

  const activeDraft = activateSelectionDraft(appendedDraft);
  assertEqual(activeDraft.phase, 'active', 'clicking inside a draft can activate it for follow-up actions');
  assertEqual(selectionDraftContainsCapturedSelection(activeDraft, {
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 1,
    endOffset: 3,
    text: 'Price drives demand',
  }), true, 'draft hit-testing recognizes selection inside an existing draft range');
  assertEqual(selectionDraftContainsCapturedSelection(activeDraft, {
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-c',
    startOffset: 0,
    endOffset: 4,
    text: 'Info',
  }), false, 'draft hit-testing rejects unrelated text');
  assertEqual(selectionDraftRangesToAnnotationRanges(activeDraft.ranges).length, 2, 'annotation commit still receives every drafted range');
}

function testRangeRebaseService(): void {
  const beforeRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 5,
    text: 'Price',
  });
  const afterRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 20,
    endOffset: 26,
    text: 'demand',
  });
  const crossingRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 4,
    endOffset: 12,
    text: 'e drives',
  });
  const fullUnitRange = createTextUnitAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    text: 'Price drives demand',
  });
  const result = rebaseTextUnitAnnotationRanges({
    textUnitId: 'unit-a',
    oldText: 'Price drives demand because supply moves.',
    newText: 'Price strongly drives demand because supply moves.',
    editedStartOffset: 6,
    editedEndOffset: 6,
    replacementText: 'strongly ',
    ranges: [beforeRange, afterRange, crossingRange, fullUnitRange],
  });

  assertEqual(result.next_ranges[0]?.start_offset, 0, 'range before edit keeps start offset');
  assertEqual(result.next_ranges[0]?.end_offset, 5, 'range before edit keeps end offset');
  assertEqual(result.next_ranges[1]?.start_offset, 29, 'range after edit shifts start by delta');
  assertEqual(result.next_ranges[1]?.end_offset, 35, 'range after edit shifts end by delta');
  assertEqual(result.invalidated_range_ids.includes(crossingRange.id), false, 'range containing insertion point is safely rebased');
  assertEqual(result.next_ranges[2]?.range_text_cache, 'e strongly drives', 'range containing insertion point refreshes selected cache');
  assertEqual(result.next_ranges[3]?.range_text_cache, result.next_text, 'full TextUnit range cache follows new text');

  const partialOverlapResult = rebaseTextUnitAnnotationRanges({
    textUnitId: 'unit-a',
    oldText: 'Price drives demand because supply moves.',
    newText: 'Price reshapes demand because supply moves.',
    editedStartOffset: 6,
    editedEndOffset: 16,
    replacementText: 'reshapes demand',
    ranges: [crossingRange],
  });
  assertEqual(partialOverlapResult.invalidated_range_ids.includes(crossingRange.id), true, 'range crossing edit boundary is invalidated');
}

function testSourceBackedAnnotationRangeEditing(): void {
  const delta = deriveSingleTextEditDelta('Price drives demand', 'Price drives market demand');
  assertEqual(delta.editedStartOffset, 13, 'single text diff starts at changed range');
  assertEqual(delta.editedEndOffset, 13, 'single text diff ends at insertion point');
  assertEqual(delta.replacementText, 'market ', 'single text diff captures inserted text');

  const flow = createTextBlockContentV1('Price drives demand');
  const unit = flow.units[0];
  assert(unit, 'source-backed range edit needs a TextUnit');
  const range = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'textflow-block-a',
    textUnitId: unit.id,
    startOffset: 13,
    endOffset: 19,
    text: 'demand',
  });
  const annotation = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'definition',
    ranges: [range],
  });
  const result = applySourceBackedAnnotationRangeEdit({
    annotations: [annotation],
    annotationId: annotation.id,
    rangeId: range.id,
    currentText: unit.text,
    replacementText: 'market demand',
  });
  assert(result, 'source-backed preview edit returns an edit result');
  assertEqual(result.next_text, 'Price drives market demand', 'range preview edit writes back to TextUnit source text');
  assertEqual(result.next_annotations[0]?.ranges[0]?.range_text_cache, 'market demand', 'edited annotation cache follows replacement text');
  assertEqual(result.next_annotations[0]?.ranges[0]?.end_offset, 26, 'edited annotation range expands to replacement length');

  const editedFlow = replaceTextUnitText({
    textFlow: flow,
    textUnitId: unit.id,
    nextText: result.next_text,
  });
  assertEqual(editedFlow.units[0]?.text, 'Price drives market demand', 'replaceTextUnitText updates one TextUnit source');

  const rebased = rebaseAnnotationsForTextUnitEdit({
    annotations: [annotation],
    blockId: 'block-a',
    textFlowId: 'textflow-block-a',
    textUnitId: unit.id,
    oldText: 'Price drives demand',
    newText: 'Price strongly drives demand',
  });
  assertEqual(rebased.next_annotations[0]?.ranges[0]?.range_text_cache, 'demand', 'normal TextUnit edit refreshes annotation range cache');
  assertEqual(rebased.next_annotations[0]?.ranges[0]?.start_offset, 22, 'normal TextUnit edit shifts range start after inserted text');

  const innerEditRebased = rebaseAnnotationsForTextUnitEdit({
    annotations: [annotation],
    blockId: 'block-a',
    textFlowId: 'textflow-block-a',
    textUnitId: unit.id,
    oldText: 'Price drives demand',
    newText: 'Price drives dem0and',
  });
  assertEqual(innerEditRebased.next_annotations[0]?.ranges[0]?.range_text_cache, 'dem0and', 'TextUnit edit inside annotation range refreshes range cache');
  assertEqual(innerEditRebased.next_annotations[0]?.ranges[0]?.end_offset, 20, 'TextUnit edit inside annotation range expands end offset');

  const childRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'textflow-block-a',
    textUnitId: unit.id,
    startOffset: 14,
    endOffset: 17,
    text: 'ema',
  });
  const childAnnotation = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'child',
    ranges: [childRange],
  });
  const overlappingResult = applySourceBackedAnnotationRangeEdit({
    annotations: [annotation, childAnnotation],
    annotationId: annotation.id,
    rangeId: range.id,
    currentText: unit.text,
    replacementText: 'consumer demand',
  });
  assert(overlappingResult, 'overlapping source-backed edit returns an edit result');
  assertEqual(overlappingResult.next_annotations.length, 2, 'overlapping source edit preserves annotations');
  assertEqual(overlappingResult.invalidated_range_ids.includes(childRange.id), true, 'overlapping child range is marked for review');
}

function testAnnotationDisplayService(): void {
  const gameRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 4,
    text: 'CSGO',
  });
  const definitionRange = createTextSpanAnnotationRange({
    blockId: 'block-a',
    textFlowId: 'flow-a',
    textUnitId: 'unit-a',
    startOffset: 0,
    endOffset: 32,
    text: "CSGO is Henry's favourite game",
  });
  const game = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'game',
    ranges: [gameRange],
  });
  const definition = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'definition',
    ranges: [definitionRange],
  });

  const visible = visibleAnnotationsForDisplay({
    annotations: [game, hideAnnotationTruth(definition)],
  });
  assertEqual(visible.length, 1, 'display service filters hidden annotations');
  assertEqual(visible[0]?.id, game.id, 'display service keeps visible annotation');

  const hiddenByOverlay = visibleAnnotationsForDisplay({
    annotations: [game, definition],
    displayState: { labelsVisible: false },
  });
  assertEqual(hiddenByOverlay.length, 0, 'label overlay off hides display annotations without mutating truth');

  const textUnitCluster = buildTextUnitAnnotationCluster({
    annotations: [game, definition],
    displayState: { labelsVisible: true },
    blockId: 'block-a',
    textUnitId: 'unit-a',
    selectedAnnotationIds: [definition.id],
  });
  assert(textUnitCluster, 'text-unit cluster is created for visible text annotations');
  assertEqual(textUnitCluster.annotation_ids.length, 2, 'text-unit cluster groups multiple labels on the same local area');
  assertEqual(textUnitCluster.primary_label, 'definition', 'selected label wins cluster primary label');
  assertEqual(textUnitCluster.extra_count, 1, 'text-unit cluster exposes extra label count');
  assertEqual(textUnitCluster.selected, true, 'text-unit cluster tracks selected state');

  const linkedDefinition = attachChildAnnotation({
    parent: definition,
    child: game,
  });
  const parentChildCluster = buildTextUnitAnnotationCluster({
    annotations: [linkedDefinition.parent, linkedDefinition.child],
    displayState: { labelsVisible: true },
    blockId: 'block-a',
    textUnitId: 'unit-a',
    selectedAnnotationIds: [linkedDefinition.parent.id],
  });
  assert(parentChildCluster, 'text-unit cluster is created for parent annotation with child labels');
  assertEqual(parentChildCluster.annotation_ids.length, 1, 'child labels do not inflate parent badge cluster');
  assertEqual(parentChildCluster.extra_count, 0, 'child labels do not render as parent badge extra count');
  const parentChildSegments = createAnnotationRenderSegments({
    text: "CSGO is Henry's favourite game",
    annotations: [linkedDefinition.parent, linkedDefinition.child],
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  const childSegment = parentChildSegments.find((segment) => segment.childAnnotationIds.includes(linkedDefinition.child.id));
  assert(childSegment, 'child label range is exposed to the render segment');
  assertEqual(childSegment.childLabels[0], 'game', 'child label keeps its own local badge text');

  const suppressedCluster = buildTextUnitAnnotationCluster({
    annotations: [game, definition],
    displayState: { labelsVisible: false },
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(suppressedCluster, null, 'label overlay off suppresses text-unit badge cluster');

  const blockAnnotation = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'whole block',
    ranges: [createBlockAnnotationRange({
      blockId: 'block-a',
      text: 'Whole block',
    })],
  });
  const blockCluster = buildBlockAnnotationCluster({
    annotations: [game, blockAnnotation],
    displayState: { labelsVisible: true },
    blockId: 'block-a',
  });
  assert(blockCluster, 'block cluster is created for block-level annotation');
  assertEqual(blockCluster.annotation_ids.length, 1, 'block cluster ignores text-span annotations');
  assertEqual(blockCluster.primary_label, 'whole block', 'block cluster keeps block annotation label');

  const textClusterWithBlock = buildTextUnitAnnotationCluster({
    annotations: [blockAnnotation],
    displayState: { labelsVisible: true },
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(textClusterWithBlock, null, 'text-unit cluster ignores block-level annotation fallback');
}

const checks = [
  ['viewport and world seed', testViewportAndWorld],
  ['PageFrame and workspace policy', testPageFrameAndWorkspacePolicy],
  ['placement and runtime model', testPlacementAndRuntimeModel],
  ['overlay anchor model', testOverlayAnchorModel],
  ['measurement mode and history', testMeasurementModeAndHistory],
  ['TextFlow seed', testTextFlowSeed],
  ['TextUnit editor service', testTextUnitEditorService],
  ['slash command foundation', testSlashCommandFoundation],
  ['AnnotationTruth seed', testAnnotationTruthSeed],
  ['ContentGroup and GroupFolder contract', testContentGroupAndGroupFolderContract],
  ['ContentGroup surface roles', testContentGroupSurfaceRoles],
  ['ContentGroup entity cutover boundary', testContentGroupEntityCutoverBoundary],
  ['GroupFolder entity cutover boundary', testGroupFolderEntityCutoverBoundary],
  ['ContentGroup member source boundary', testContentGroupMemberSourceBoundary],
  ['ContentGroup reuse boundary', testContentGroupReuseBoundary],
  ['ContentGroup Petal refinement boundary', testContentGroupPetalRefinementBoundary],
  ['ContentGroup stability summary', testContentGroupStabilitySummary],
  ['SelectionDraft engine', testSelectionDraftEngine],
  ['Range rebase service', testRangeRebaseService],
  ['Source-backed annotation range editing', testSourceBackedAnnotationRangeEditing],
  ['Annotation display service', testAnnotationDisplayService],
] as const;

checks.forEach(([, run]) => run());

console.table(checks.map(([check]) => ({ check, status: 'passed' })));
console.log(`Canvas engine model contract check passed (${checks.length} groups).`);
