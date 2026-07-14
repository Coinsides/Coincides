import {
  buildNoteCanvasRuntimeModel,
  createViewport,
  DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH,
} from '../src/pages/Notes/canvasEngine/engineModel';
import {
  createRuntimeViewport,
  createRuntimeWorld,
  focusViewportOnWorldRect,
  panViewportByViewportDelta,
  scrollViewportByViewportDelta,
  worldPointToViewportPoint,
  viewportPointToWorldPoint,
  zoomViewportAtViewportPoint,
} from '../src/pages/Notes/canvasEngine/viewportService';
import {
  buildCanvasSceneRuntime,
  createCanvasDeltaForCommand,
  createMoveCanvasObjectCommand,
  hitTestCanvasScene,
  selectCanvasObjects,
} from '../src/pages/Notes/canvasEngine/canvasRuntimeKernelService';
import {
  applyCanvasCommandToRuntime,
  createCanvasObjectCommand,
  createDeleteCanvasObjectCommand,
  createResizeCanvasObjectCommand,
  createUpdateVisualStyleCommand,
} from '../src/pages/Notes/canvasEngine/canvasCommandService';
import {
  createCanvasAIReadableSnapshot,
} from '../src/pages/Notes/canvasEngine/canvasAiTreeService';
import {
  buildExportPreviewModel,
} from '../src/pages/Notes/canvasEngine/exportPreviewService';
import {
  createParagraphBlockProjection,
  moveBlockProjectionPlacement,
  resizeBlockProjectionPlacement,
  restoreBlockProjectionLayout,
} from '../src/pages/Notes/canvasEngine/blockProjectionService';
import {
  createImageObjectProjection,
  imageObjectSavePayload,
} from '../src/pages/Notes/canvasEngine/imageObjectService';
import {
  addTableColumnRight,
  addTableRowBelow,
  createTableObjectProjection,
  deleteTableColumn,
  deleteTableRow,
  normalizeTablePayload,
  tableObjectSavePayload,
  updateTableCellText,
} from '../src/pages/Notes/canvasEngine/tableObjectService';
import {
  clearBlockBackedShapeText,
  createPureShapeProjection,
  createVisualConnectorProjection,
  fillShapeWithParagraphBlock,
} from '../src/pages/Notes/canvasEngine/shapeProjectionService';
import {
  buildTextByContentTargetId,
  isCanvasObjectBackingBlock,
} from '../src/pages/Notes/canvasEngine/shapeTextMountService';
import {
  STICKY_NOTE_STYLE_PRESET_ID,
  ensureStickyStyleForBlockBackedShape,
  isStickyNoteCanvasObject,
} from '../src/pages/Notes/canvasEngine/objectStyleService';
import {
  createCanvasObjectDuplicateDraft,
  createCanvasObjectInspectorActions,
  createCanvasObjectInspectorModel,
  toggleCanvasPlacementExportVisibility,
} from '../src/pages/Notes/canvasEngine/objectInspectorService';
import {
  calculatePageFrameHeight,
  createPageModeFocusViewport,
  createDefaultDraftLayout,
  createRuntimePageFrame,
  getPageFrameContentRect,
  getPageFrameOuterRect,
  resolvePrimaryPageFrame,
  resolvePrimaryPageFrameAfterDelete,
} from '../src/pages/Notes/canvasEngine/pageFrameService';
import {
  PAGE_FRAME_AFFILIATION_MODE,
  classifyPlacementAgainstPageFrame,
  derivePlacementPageFrameAffiliation,
} from '../src/pages/Notes/canvasEngine/pageFrameAffiliationService';
import {
  deriveLayoutAffiliationsForPageFrame,
  derivePageFrameMoveCohort,
  movePageFrameAffiliatedBlockLayouts,
} from '../src/pages/Notes/canvasEngine/layoutAffiliationService';
import {
  DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY,
  resolvePageFrameCrossingExportDecision,
} from '../src/pages/Notes/canvasEngine/geometry';
import {
  createPageFrameGuides,
  shouldShowPageFrameGuides,
  snapRectToPageFrameGuides,
} from '../src/pages/Notes/canvasEngine/pageFrameGuideService';
import {
  DEFAULT_PAGE_FRAME_PAGE_SIZE,
  createDefaultDocumentTypographyProfile,
  createPageFramePrintProfile,
  documentTypographyToCssVars,
  normalizePageFramePrintBaseline,
} from '../src/pages/Notes/canvasEngine/pageFramePrintScaleService';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  DOCUMENT_FONT_FAMILY_OPTIONS,
  DOCUMENT_TYPOGRAPHY_LIMITS,
  NOTE_TYPOGRAPHY_PROFILE_METADATA_KEY,
  normalizeDocumentTypographyProfile,
  patchDocumentTypographyProfile,
  typographyProfileFromMetadata,
  writeTypographyProfileMetadata,
} from '../src/pages/Notes/canvasEngine/typographyProfileService';
import {
  createDefaultPageFrameSlots,
  formatPageNumber,
  resolvePageFrameSlotRects,
  summarizePageFrameSlotsForAI,
} from '../src/pages/Notes/canvasEngine/pageFrameSlotService';
import {
  DEFAULT_PAGE_FRAME_TEMPLATE_ID,
  PAGE_FRAME_TEMPLATE_PRESETS,
  applyPageFrameTemplate,
  createPageFrameTemplate,
  pageFrameTemplateToCssVars,
} from '../src/pages/Notes/canvasEngine/pageFrameTemplateService';
import {
  createPageFrameCollectionSeed,
  deletePageFrameFromCollection,
  duplicatePageFrame,
  insertPageFrameAfter,
  movePageFrameInCollection,
  normalizePageFrameCollection,
  resizePageFrameInCollection,
  selectPageFrame,
  setPrimaryPageFrame,
  updatePageFrameInCollection,
} from '../src/pages/Notes/canvasEngine/pageFrameCollectionService';
import {
  appendPageFrameToStack,
  createPageStackForFrame,
  createPageStackFromFrame,
  detachPageFrameFromStack,
  mergePageStacks,
  normalizePageStacks,
  resolvePageStackContext,
  setPageStackCollapsed,
  splitPageStackAtFrame,
} from '../src/pages/Notes/canvasEngine/pageStackCollectionService';
import {
  resolvePageStackContentFlowPlan,
} from '../src/pages/Notes/canvasEngine/pageStackContentFlowService';
import {
  derivePageStackBlockFragments,
} from '../src/pages/Notes/canvasEngine/pageStackBlockFragmentService';
import {
  createPageSliceReferenceDescriptor,
  createPageSliceSnapshot,
} from '../src/pages/Notes/canvasEngine/pageSliceService';
import {
  buildCanvasBlankMenu,
  buildCanvasObjectShellMenu,
  buildPageFrameShellMenu,
} from '../src/pages/Notes/canvasEngine/commandSurfaceService';
import {
  normalizeCanvasPersistencePayload,
} from '../src/pages/Notes/canvasEngine/canvasPersistenceNormalizer';
import {
  buildLayoutPayload,
  buildRelationEndpointReserveForPlacement,
  buildRuntimeBlockPlacement,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
  normalizeBlockLayout,
  projectPageFrameLocalLayoutToCanvasLayout,
  readStoredLayout,
  writeLayoutOverride,
} from '../src/pages/Notes/canvasEngine/placementService';
import {
  applyMeasuredBlockHeightToLayouts,
} from '../src/pages/Notes/canvasEngine/measurementService';
import {
  estimatePageFrameLineCapacity,
  estimateTypographyTextBlockHeight,
} from '../src/pages/Notes/canvasEngine/typographyMeasurementService';
import {
  createBlankDraftLayout,
  createSurfaceModePolicy,
  createSurfaceModeTransitionPolicy,
  getVisibleBlocksForSurface,
  shouldResolvePageCollisions,
  shouldUseElasticAvoidance,
} from '../src/pages/Notes/canvasEngine/modePolicyService';
import {
  applyRuntimeHistoryRedo,
  applyRuntimeHistoryUndo,
  getRuntimeHistoryKeyboardIntent,
  type RuntimeHistoryEntry,
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
  TEXT_AVERAGE_CHAR_WIDTH,
  type BlockBoxLayout,
} from '../src/pages/Notes/canvasEngine/runtimeLayout';
import type { NoteBlock } from '../src/pages/Notes/canvasEngine/runtimeDataTypes';
import type {
  CanvasAIReadableNode,
  TableStructuredPayload,
} from '../src/pages/Notes/canvasEngine/types';
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
  archiveContentGroupIdentity,
  auditContentGroupIntegrity,
  compareContentGroupMemberWithSource,
  createContentGroup,
  createContentGroupMemberFromAnnotation,
  createContentGroupMemberFromPageSliceSnapshot,
  createContentGroupMemberFromRange,
  contentGroupMemberIdentityKey,
  markContentGroupMemberIntegrity,
  moveContentGroupToFolder,
  normalizeContentGroup,
  normalizeContentGroupMember,
  normalizeContentGroupsWithFolders,
  refreshContentGroupMemberPreview,
  refreshContentGroupMemberFromSource,
  refreshContentGroupPreviews,
  removeContentGroupMember,
  rejectContentGroupIdentity,
  renameContentGroup,
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
  movePurposeMember,
  normalizePurposeCompiledScope,
  normalizePurposeFrames,
  removePurposeItemMember,
  purposeRoleForContentGroup,
  upsertPurposeItemMember,
  upsertDefaultPurposeRoleForContentGroup,
} from '../src/pages/Notes/canvasEngine/purposeService';
import {
  normalizeRelation,
  normalizeRelations,
  normalizeRelationTypeDefinitions,
  relationOtherEndpoint,
} from '../src/pages/Notes/canvasEngine/relationService';
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
  normalizeGalleryMode,
} from '../src/pages/GroupGallery/groupGalleryModeService';
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
  annotationRangeIsPending,
  annotationRangeIsRenderable,
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

function assertJsonEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(actualJson === expectedJson, `${message}: expected ${expectedJson}, got ${actualJson}`);
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

function testDynamicCanvasWorldAndFocus(): void {
  const baseFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const farPageFrame = {
    ...baseFrame,
    id: 'page-frame-far',
    x: 3600,
    y: 5200,
  };
  const dynamicWorld = createRuntimeWorld('canvas', DEFAULT_PAGE_FRAME_HEIGHT, {
    pageFrames: [baseFrame, farPageFrame],
    blockPlacements: [],
    canvasObjectReserve: [],
  });

  assertAtLeast(
    dynamicWorld.width,
    farPageFrame.x + farPageFrame.width + 800,
    'canvas world expands to include far PageFrame width',
  );
  assertAtLeast(
    dynamicWorld.height,
    farPageFrame.y + farPageFrame.height + 800,
    'canvas world expands to include far PageFrame height',
  );

  const focusViewport = focusViewportOnWorldRect({
    viewport: createViewport({
      x: 0,
      y: 0,
      width: 1200,
      height: 700,
      zoom: 1,
    }),
    world: dynamicWorld,
    rect: farPageFrame,
  });

  assert(focusViewport.x > 3000, 'focus viewport pans near target x');
  assert(focusViewport.y > 4800, 'focus viewport pans near target y');

  const scrolled = scrollViewportByViewportDelta(
    createViewport({
      x: 0,
      y: 0,
      width: 1200,
      height: 700,
      zoom: 1,
    }),
    { x: 0, y: 5000 },
    dynamicWorld,
  );
  assert(scrolled.y > 3000, 'viewport can scroll into expanded world');
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
  assertEqual(
    frameHeight,
    Math.max(DEFAULT_PAGE_FRAME_HEIGHT, 640 + 120 + PAGE_FRAME_BOTTOM_PADDING),
    'PageFrame height follows formal page bottom while keeping print-scale minimum',
  );

  const frame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: frameHeight,
  });
  assertEqual(frame.x, 0, 'PageFrame boundary starts before content inset');
  assertEqual(frame.contentInset.left, DEFAULT_PAGE_FRAME_CONTENT_INSET.left, 'PageFrame keeps content inset');
  assertEqual(frame.exportable, true, 'primary PageFrame remains exportable');
}

function testPageFrameV1Foundation(): void {
  const primaryFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const secondaryFrame = {
    ...primaryFrame,
    id: 'page-frame-secondary',
    x: primaryFrame.x + primaryFrame.width + 96,
  };
  const outerRect = getPageFrameOuterRect(primaryFrame);
  const contentRect = getPageFrameContentRect(primaryFrame);

  assertEqual(outerRect.x, primaryFrame.x, 'PageFrame outer rect starts at frame x');
  assertEqual(outerRect.width, primaryFrame.width, 'PageFrame outer rect uses full frame width');
  assertEqual(contentRect.x, primaryFrame.x + primaryFrame.contentInset.left, 'PageFrame content rect starts after left inset');
  assertEqual(
    contentRect.width,
    primaryFrame.width - primaryFrame.contentInset.left - primaryFrame.contentInset.right,
    'PageFrame content rect removes horizontal insets',
  );

  const requestedPrimary = resolvePrimaryPageFrame({
    pageFrames: [primaryFrame, secondaryFrame],
    requestedPrimaryFrameId: secondaryFrame.id,
  });
  assertEqual(requestedPrimary?.id, secondaryFrame.id, 'requested primary PageFrame wins when it still exists');

  const onlyFrameFallback = resolvePrimaryPageFrame({
    pageFrames: [secondaryFrame],
    requestedPrimaryFrameId: primaryFrame.id,
  });
  assertEqual(onlyFrameFallback?.id, secondaryFrame.id, 'single remaining PageFrame becomes primary fallback');

  const deletePrimaryFallback = resolvePrimaryPageFrameAfterDelete({
    pageFrames: [primaryFrame, secondaryFrame],
    currentPrimaryFrameId: primaryFrame.id,
    deletedFrameId: primaryFrame.id,
  });
  assertEqual(deletePrimaryFallback?.id, secondaryFrame.id, 'deleting primary PageFrame promotes the next remaining frame');

  const focusViewport = createPageModeFocusViewport({
    pageFrame: primaryFrame,
    viewport: createViewport({ x: -400, y: 220, width: 920, height: 680, zoom: 0.5 }),
  });
  assertEqual(focusViewport.x, contentRect.x, 'Page Mode focus starts at primary PageFrame content x');
  assertEqual(focusViewport.y, contentRect.y, 'Page Mode focus starts at primary PageFrame content y');
  assertEqual(focusViewport.zoom, 1, 'Page Mode focus resets to readable zoom');
}

function testPageFrameCollectionManagement(): void {
  const primaryFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const collection = createPageFrameCollectionSeed(primaryFrame);
  assertEqual(collection.pageFrames.length, 1, 'PageFrame collection seed starts with one frame');
  assertEqual(collection.primaryFrameId, primaryFrame.id, 'PageFrame collection seed makes the only frame primary');

  const inserted = insertPageFrameAfter(collection, primaryFrame.id, { id: 'page-frame-2' });
  assertEqual(inserted.pageFrames.length, 2, 'insert should add a second PageFrame');
  assertEqual(inserted.primaryFrameId, primaryFrame.id, 'insert should not steal primary');
  assertEqual(inserted.pageFrames[1]?.role, 'secondary_page_frame', 'inserted PageFrame starts as secondary');
  assert(inserted.pageFrames[1]!.y > primaryFrame.y, 'inserted PageFrame is spatially placed after the source frame');
  assertEqual(
    resolvePrimaryPageFrame({
      pageFrames: inserted.pageFrames,
      requestedPrimaryFrameId: inserted.primaryFrameId,
    })?.id,
    primaryFrame.id,
    'inserted PageFrame collection still resolves original primary',
  );

  const duplicated = duplicatePageFrame(inserted, 'page-frame-2', { id: 'page-frame-3' });
  assertEqual(duplicated.pageFrames.length, 3, 'duplicate should add a copied PageFrame');
  assertEqual(duplicated.pageFrames[2]?.width, inserted.pageFrames[1]?.width, 'duplicate copies PageFrame width');
  assertEqual(duplicated.pageFrames[2]?.contentInset.left, inserted.pageFrames[1]?.contentInset.left, 'duplicate copies content inset');
  assert(duplicated.pageFrames[2]?.id !== inserted.pageFrames[1]?.id, 'duplicate gets a new id');

  const promoted = setPrimaryPageFrame(duplicated, 'page-frame-2');
  assertEqual(promoted.primaryFrameId, 'page-frame-2', 'setPrimaryPageFrame changes the collection primary id');
  assertEqual(promoted.pageFrames.find((frame) => frame.id === 'page-frame-2')?.role, 'primary_page_frame', 'new primary gets primary role');
  assertEqual(promoted.pageFrames.find((frame) => frame.id === primaryFrame.id)?.role, 'secondary_page_frame', 'old primary becomes secondary');

  const selected = selectPageFrame(promoted, 'page-frame-3');
  assertEqual(selected.selectedFrameId, 'page-frame-3', 'selectPageFrame tracks selected frame separately from primary');
  assertEqual(selected.primaryFrameId, 'page-frame-2', 'selectPageFrame does not change primary');

  const afterDeletePrimary = deletePageFrameFromCollection(selected, 'page-frame-2');
  assertEqual(afterDeletePrimary.pageFrames.length, 2, 'delete removes one PageFrame');
  assertEqual(afterDeletePrimary.primaryFrameId, 'page-frame-3', 'deleting primary promotes the next remaining PageFrame');
  assertEqual(afterDeletePrimary.pageFrames.find((frame) => frame.id === 'page-frame-3')?.role, 'primary_page_frame', 'promoted frame gets primary role');

  const freeCanvasCollection = normalizePageFrameCollection({
    pageFrames: [],
    primaryFrameId: null,
    selectedFrameId: null,
  });
  assertEqual(freeCanvasCollection.pageFrames.length, 0, 'zero PageFrames remains valid for a free-canvas note');
  assertEqual(freeCanvasCollection.primaryFrameId, null, 'free-canvas note has no primary PageFrame');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: afterDeletePrimary.pageFrames.find((frame) => frame.id === afterDeletePrimary.primaryFrameId) || null,
    pageFrames: afterDeletePrimary.pageFrames,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [],
  });
  assertEqual(runtime.pageFrames.length, 2, 'runtime model exposes every PageFrame in the collection');
  assertEqual(
    runtime.canvasObjects.filter((object) => object.kind === 'page_frame').length,
    2,
    'runtime model creates a CanvasObject for every PageFrame',
  );
  assertEqual(
    runtime.canvasAIReadableSnapshot.nodes.filter((node) => node.kind === 'page_frame').length,
    2,
    'AI Tree includes every PageFrame node',
  );
  assertEqual(
    runtime.canvasAIReadableSnapshot.nodes.find((node) => node.id === afterDeletePrimary.primaryFrameId)?.pageFrameRef?.primary,
    true,
    'AI Tree marks the promoted PageFrame as primary',
  );
}

function testPageFrameCollectionDoesNotImplyPageStackNumbering(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'primary-page-frame',
  };
  const secondaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'independent-page-frame',
    y: primaryFrame.y + primaryFrame.height + 240,
    role: 'secondary_page_frame' as const,
  };

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: primaryFrame,
    pageFrames: [primaryFrame, secondaryFrame],
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [],
  });
  const pageNumbers = runtime.pageFrameExtensions.map((extension) => extension.slots?.pageNumber?.text);

  assertEqual(runtime.pageFrameExtensions.length, 2, 'runtime still exposes both independent PageFrame extensions');
  assertEqual(pageNumbers[0], '1', 'primary independent PageFrame does not claim collection-global page 1 / 2');
  assertEqual(pageNumbers[1], '1', 'secondary independent PageFrame starts as its own page-number scope until PageStack exists');
}

function assertPageStackCoverage(
  collection: ReturnType<typeof normalizePageFrameCollection>,
  message: string,
): void {
  const coveredFrameIds = new Set((collection.pageStacks || []).flatMap((stack) => stack.frameIds));
  assertEqual(coveredFrameIds.size, collection.pageFrames.length, message);
  collection.pageFrames.forEach((frame) => {
    assert(coveredFrameIds.has(frame.id), `${message}: missing ${frame.id}`);
  });
}

function testPageStackContinuityRelation(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'page-stack-primary-frame',
  };
  const independentFrame = {
    ...primaryFrame,
    id: 'page-stack-independent-frame',
    y: primaryFrame.y + primaryFrame.height + 180,
    role: 'secondary_page_frame' as const,
  };

  const legacyCollection = normalizePageFrameCollection({
    pageFrames: [primaryFrame, independentFrame],
    primaryFrameId: primaryFrame.id,
    selectedFrameId: independentFrame.id,
  });
  assertEqual(legacyCollection.pageStacks?.length || 0, 2, 'legacy multi-PageFrame collection is repaired into two single-page PageStacks');
  assertPageStackCoverage(legacyCollection, 'normalized PageFrame collection covers every PageFrame with a PageStack');
  assertEqual(
    resolvePageStackContext(legacyCollection, independentFrame.id)?.pageNumberLabel,
    '1 / 1',
    'single-page PageStack keeps its own local numbering',
  );

  const seed = createPageFrameCollectionSeed(primaryFrame);
  assertEqual(seed.pageStacks?.length, 1, 'new PageFrame seed creates one explicit continuous PageStack');
  assertEqual(seed.pageStacks?.[0]?.frameIds.join(','), primaryFrame.id, 'seed PageStack starts with the primary PageFrame only');
  assertEqual(seed.primaryStackId, seed.pageStacks?.[0]?.id, 'new seed records the primary PageStack separately from primary PageFrame');

  const stackFromFrame = createPageStackFromFrame(primaryFrame, {
    id: 'manual-stack',
    displayName: 'Manual stack',
    createdFrom: 'user_created',
  });
  assertEqual(stackFromFrame.frameIds.join(','), primaryFrame.id, 'createPageStackFromFrame can describe a single-frame continuity relation');

  const normalizedStacks = normalizePageStacks({
    ...seed,
    pageStacks: [
      ...(seed.pageStacks || []),
      {
        ...stackFromFrame,
        id: 'invalid-stack',
        frameIds: ['missing-frame'],
        primaryFrameId: 'missing-frame',
        selectedFrameId: 'missing-frame',
      },
    ],
  });
  assertEqual(normalizedStacks.length, 1, 'normalizePageStacks removes stacks that no longer point to existing PageFrames');

  const stackId = seed.pageStacks![0]!.id;
  const appended = appendPageFrameToStack(seed, stackId, primaryFrame.id, { id: 'page-stack-page-2' });
  const appendedContext = resolvePageStackContext(appended, 'page-stack-page-2');
  assertEqual(appended.pageFrames.length, 2, 'appendPageFrameToStack creates one new physical PageFrame slice');
  assertEqual(appendedContext?.pageNumberLabel, '2 / 2', 'PageStack numbering is local to the stack, not the whole PageFrame collection');
  assertEqual(appendedContext?.stack.primaryFrameId, primaryFrame.id, 'PageStack primary frame is separate from collection primary frame');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: appended.pageFrames.find((frame) => frame.id === appended.primaryFrameId) || null,
    pageFrames: appended.pageFrames,
    pageStacks: appended.pageStacks,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [],
  });
  assertEqual(runtime.pageStacks.length, 1, 'runtime model exposes explicit PageStack continuity context');
  assertEqual(
    runtime.pageFrameExtensions.find((extension) => extension.frameId === 'page-stack-page-2')?.pageStackNumberLabel,
    '2 / 2',
    'PageFrame extension carries stack-local page number label',
  );
  assert(
    runtime.canvasAIReadableSnapshot.nodes.some((node) => node.kind === 'page_stack' && node.id === stackId),
    'AI-readable snapshot exposes PageStack container node',
  );

  const exportPreview = buildExportPreviewModel([], {}, {
    pageFrames: appended.pageFrames,
    pageStacks: appended.pageStacks,
    primaryPageFrameId: appended.primaryFrameId,
  });
  assertEqual(
    exportPreview.pageStacks[0]?.pageFrameIds.join(','),
    `${primaryFrame.id},page-stack-page-2`,
    'Export Preview exposes PageStack frame order metadata',
  );

  const collapsed = setPageStackCollapsed(appended, stackId, true);
  assertEqual(resolvePageStackContext(collapsed, primaryFrame.id)?.stack.collapsed, true, 'PageStack collapsed state belongs to the stack relation');

  const detached = detachPageFrameFromStack(appended, 'page-stack-page-2');
  assertEqual(detached.pageStacks?.length, 2, 'detached PageFrame becomes a new single-page PageStack');
  assertEqual(resolvePageStackContext(detached, 'page-stack-page-2')?.pageNumberLabel, '1 / 1', 'detached PageFrame keeps user-facing PageStack coverage');
  assertPageStackCoverage(detached, 'detach preserves PageStack coverage for every PageFrame');
  assertEqual(detached.pageFrames.length, 2, 'detaching does not delete the physical PageFrame');

  const secondStackCollection = createPageStackForFrame(detached, 'page-stack-page-2', {
    id: 'second-stack',
    displayName: 'Second stack',
    createdFrom: 'user_created',
  });
  assertEqual(secondStackCollection.pageStacks?.length, 2, 'createPageStackForFrame leaves an already-covered PageFrame in its existing stack');

  const detachedStackId = secondStackCollection.pageStacks?.find((stack) => stack.frameIds.includes('page-stack-page-2'))?.id;
  assert(detachedStackId, 'detached PageFrame stack exists before merge');
  const merged = mergePageStacks(secondStackCollection, stackId, detachedStackId);
  assertEqual(merged.pageStacks?.length, 1, 'mergePageStacks combines two explicit continuity relations');
  assertEqual(resolvePageStackContext(merged, 'page-stack-page-2')?.pageNumberLabel, '2 / 2', 'merged PageStack keeps stack-local numbering');
}

function testPageStackNavigatorOperations(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'navigator-primary-page',
  };
  const seed = createPageFrameCollectionSeed(primaryFrame);
  const inserted = insertPageFrameAfter(seed, primaryFrame.id, { id: 'navigator-inserted-page' });
  assertPageStackCoverage(inserted, 'insertPageFrameAfter creates a user-facing single-page PageStack for the inserted page');
  assertEqual(
    resolvePageStackContext(inserted, 'navigator-inserted-page')?.pageNumberLabel,
    '1 / 1',
    'inserted page starts as a single-page PageStack',
  );

  const duplicated = duplicatePageFrame(inserted, 'navigator-inserted-page', { id: 'navigator-duplicated-page' });
  assertPageStackCoverage(duplicated, 'duplicatePageFrame creates a user-facing single-page PageStack for the duplicate');
  assertEqual(
    resolvePageStackContext(duplicated, 'navigator-duplicated-page')?.pageNumberLabel,
    '1 / 1',
    'duplicated page starts as a single-page PageStack',
  );

  const stackId = seed.pageStacks![0]!.id;
  const twoPageStack = appendPageFrameToStack(seed, stackId, primaryFrame.id, { id: 'navigator-stack-page-2' });
  const threePageStack = appendPageFrameToStack(twoPageStack, stackId, 'navigator-stack-page-2', { id: 'navigator-stack-page-3' });
  const split = splitPageStackAtFrame(threePageStack, 'navigator-stack-page-2');
  assertEqual(split.pageStacks?.length, 2, 'splitPageStackAtFrame creates two PageStacks');
  assertPageStackCoverage(split, 'splitPageStackAtFrame preserves PageStack coverage');
  assertEqual(
    resolvePageStackContext(split, 'navigator-stack-page-2')?.pageNumberLabel,
    '1 / 2',
    'split stack restarts local numbering on the new PageStack',
  );

  const splitStackId = split.pageStacks?.find((stack) => stack.frameIds.includes('navigator-stack-page-2'))?.id;
  assert(splitStackId, 'split PageStack exists before merge');
  const merged = mergePageStacks(split, stackId, splitStackId);
  assertEqual(merged.pageStacks?.length, 1, 'mergePageStacks restores one PageStack after split');
  assertEqual(
    resolvePageStackContext(merged, 'navigator-stack-page-3')?.pageNumberLabel,
    '3 / 3',
    'merged PageStack keeps restored local order',
  );
}

function testPageStackContentFlowV1(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'content-flow-page-1',
  };
  const seed = createPageFrameCollectionSeed(primaryFrame);
  const stackId = seed.pageStacks![0]!.id;
  const twoPageStack = appendPageFrameToStack(seed, stackId, primaryFrame.id, {
    id: 'content-flow-page-2',
  });
  const firstContentRect = getPageFrameContentRect(primaryFrame);
  const secondFrame = twoPageStack.pageFrames.find((frame) => frame.id === 'content-flow-page-2');
  assert(secondFrame, 'content flow fixture has a second PageFrame');
  const secondContentRect = getPageFrameContentRect(secondFrame);

  const fittingPlan = resolvePageStackContentFlowPlan({
    collection: twoPageStack,
    currentFrameId: primaryFrame.id,
    draftLayout: {
      x: firstContentRect.x,
      y: firstContentRect.y + 40,
      width: 540,
      height: 80,
    },
  });
  assertEqual(fittingPlan.kind, 'stay_on_current_page', 'content flow keeps a fitting draft on the current PageFrame');
  assertEqual(fittingPlan.targetFrameId, primaryFrame.id, 'fitting draft target remains current frame');

  const nextExistingPlan = resolvePageStackContentFlowPlan({
    collection: twoPageStack,
    currentFrameId: primaryFrame.id,
    draftLayout: {
      x: firstContentRect.x,
      y: firstContentRect.y + firstContentRect.height + 8,
      width: 540,
      height: 80,
    },
  });
  assertEqual(nextExistingPlan.kind, 'move_to_existing_next_page', 'content flow routes overflow to existing next PageFrame');
  assertEqual(nextExistingPlan.targetFrameId, secondFrame.id, 'existing next page becomes the target frame');
  assertEqual(nextExistingPlan.targetLayout.y, secondContentRect.y, 'next page draft starts at next content top');

  const appendPlan = resolvePageStackContentFlowPlan({
    collection: twoPageStack,
    currentFrameId: secondFrame.id,
    draftLayout: {
      x: secondContentRect.x,
      y: secondContentRect.y + secondContentRect.height + 8,
      width: 540,
      height: 80,
    },
  });
  assertEqual(appendPlan.kind, 'append_next_page', 'content flow appends a new page when the current frame is the stack tail');
  if (appendPlan.kind === 'append_next_page') {
    assertEqual(appendPlan.afterFrameId, secondFrame.id, 'append plan inserts after the overflowing tail frame');
    assertEqual(appendPlan.stackId, stackId, 'append plan stays inside the current PageStack');
  }
}

function testPageStackContentFlowUsesTypographyFit(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'typography-flow-page-1',
  };
  const seed = createPageFrameCollectionSeed(primaryFrame);
  const defaultProfile = createDefaultDocumentTypographyProfile();
  const largeProfile = patchDocumentTypographyProfile(defaultProfile, {
    fontSizePx: 24,
    lineHeightPx: 36,
  });
  const contentRect = getPageFrameContentRect(primaryFrame);
  const draftLayout = {
    x: contentRect.x,
    y: contentRect.y + contentRect.height - 80,
    width: 320,
    height: 40,
  };

  const stayPlan = resolvePageStackContentFlowPlan({
    collection: seed,
    currentFrameId: primaryFrame.id,
    draftLayout,
    draftText: 'short',
    documentTypography: defaultProfile,
  });
  assertEqual(stayPlan.kind, 'stay_on_current_page', 'short draft still fits current PageFrame');

  const movePlan = resolvePageStackContentFlowPlan({
    collection: seed,
    currentFrameId: primaryFrame.id,
    draftLayout,
    draftText: 'large typography line '.repeat(20),
    documentTypography: largeProfile,
  });
  assert(
    movePlan.kind === 'append_next_page' || movePlan.kind === 'move_to_existing_next_page',
    'large typography-aware draft moves to the next PageStack page instead of overflowing current PageFrame',
  );
}

function testCrossPageBlockFragmentV1(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'fragment-page-1',
  };
  const seed = createPageFrameCollectionSeed(primaryFrame);
  const stackId = seed.pageStacks![0]!.id;
  const twoPageStack = appendPageFrameToStack(seed, stackId, primaryFrame.id, {
    id: 'fragment-page-2',
  });
  const firstContentRect = getPageFrameContentRect(primaryFrame);
  const secondFrame = twoPageStack.pageFrames.find((frame) => frame.id === 'fragment-page-2');
  assert(secondFrame, 'cross-page fragment fixture has a second PageFrame');
  const secondContentRect = getPageFrameContentRect(secondFrame);

  const crossingLayout: BlockBoxLayout = {
    x: firstContentRect.x + 24,
    y: firstContentRect.y + firstContentRect.height - 28,
    width: Math.min(420, firstContentRect.width - 48),
    height: (secondContentRect.y + 72) - (firstContentRect.y + firstContentRect.height - 28),
  };
  const fragments = derivePageStackBlockFragments({
    collection: twoPageStack,
    blockId: 'cross-page-block',
    layout: crossingLayout,
  });
  assertEqual(fragments.length, 2, 'cross-page block yields two visual fragments without splitting the logical block');
  assertEqual(fragments.map((fragment) => fragment.blockId).join(','), 'cross-page-block,cross-page-block', 'fragments preserve one logical block id');
  assertEqual(fragments.map((fragment) => fragment.pageFrameId).join(','), 'fragment-page-1,fragment-page-2', 'fragments preserve PageFrame order');
  assertEqual(fragments.map((fragment) => fragment.pageStackId).join(','), `${stackId},${stackId}`, 'fragments stay inside the same PageStack');
  assertEqual(fragments.map((fragment) => fragment.role).join(','), 'start,end', 'two-fragment crossing is marked start/end');
  assertEqual(fragments[0]?.pageIndex, 0, 'first fragment keeps zero-based page index');
  assertEqual(fragments[1]?.pageIndex, 1, 'second fragment keeps zero-based page index');
  assertEqual(fragments[0]?.pageTotal, 2, 'fragment records PageStack page total');
  assertEqual(fragments[0]?.fragmentTotal, 2, 'fragment records local fragment total');
  assertEqual(fragments[0]?.clippedBottom, true, 'first fragment knows it continues below');
  assertEqual(fragments[1]?.clippedTop, true, 'second fragment knows it continues from above');

  const fittingFragments = derivePageStackBlockFragments({
    collection: twoPageStack,
    blockId: 'single-page-block',
    layout: {
      x: firstContentRect.x + 24,
      y: firstContentRect.y + 64,
      width: 420,
      height: 96,
    },
  });
  assertEqual(fittingFragments.length, 1, 'single-page block yields one fragment');
  assertEqual(fittingFragments[0]?.role, 'single', 'single-page block fragment is marked single');
  assertEqual(fittingFragments[0]?.pageFrameId, primaryFrame.id, 'single-page block stays on the intersected PageFrame');

  const workspaceFragments = derivePageStackBlockFragments({
    collection: twoPageStack,
    blockId: 'workspace-block',
    layout: {
      x: firstContentRect.x + firstContentRect.width + 80,
      y: firstContentRect.y + 64,
      width: 220,
      height: 96,
    },
  });
  assertEqual(workspaceFragments.length, 0, 'workspace-only block does not claim PageStack fragments');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: primaryFrame,
    pageFrames: twoPageStack.pageFrames,
    pageStacks: twoPageStack.pageStacks,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [{
      blockId: 'cross-page-block',
      objectKind: 'note_block',
      placementId: 'placement:cross-page-block',
      objectId: 'cross-page-block',
      canvasId: 'primary-note-canvas',
      frameId: primaryFrame.id,
      x: crossingLayout.x,
      y: crossingLayout.y,
      width: crossingLayout.width,
      height: crossingLayout.height,
      surface: 'formal_page',
      boundaryRole: 'crossing',
      zIndex: 1,
      snapState: 'free',
      visibilityState: 'normal',
      rotation: 0,
    }],
  });
  assertEqual(runtime.blockFragmentProjections.length, 2, 'runtime model exposes derived cross-page block fragments');
  const flattenAiNodes = (nodes: CanvasAIReadableNode[]): CanvasAIReadableNode[] => (
    nodes.flatMap((node) => [node, ...flattenAiNodes(node.children || [])])
  );
  const blockNode = flattenAiNodes(runtime.canvasAIReadableSnapshot.nodes)
    .find((node) => node.id === 'cross-page-block');
  assertEqual(blockNode?.pageStackBlockFragments?.length, 2, 'AI-readable block node exposes cross-page fragment metadata');
}

function testPageStackFragmentsRespectMeasuredLayoutHeight(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'fragment-typography-page-1',
  };
  const seed = createPageFrameCollectionSeed(primaryFrame);
  const stackId = seed.pageStacks![0]!.id;
  const twoPageCollection = appendPageFrameToStack(seed, stackId, primaryFrame.id, {
    id: 'fragment-typography-page-2',
  });
  const firstFrame = twoPageCollection.pageFrames[0]!;
  const firstContentRect = getPageFrameContentRect(firstFrame);
  const fragments = derivePageStackBlockFragments({
    collection: twoPageCollection,
    blockId: 'fragment-typography-block',
    layout: {
      x: firstContentRect.x,
      y: firstContentRect.y,
      width: 300,
      height: firstFrame.height + 120,
    },
  });

  assert(fragments.length >= 2, 'measured tall block can project fragments across PageStack pages');
  assertEqual(fragments[0]?.role, 'start', 'first fragment is marked as start');
  assertEqual(fragments[fragments.length - 1]?.role, 'end', 'last fragment is marked as end');
}

function testPageSliceSnapshotAndReferenceV1(): void {
  const primaryFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    }),
    id: 'slice-page-1',
  };
  const seed = createPageFrameCollectionSeed(primaryFrame);
  const stackId = seed.pageStacks![0]!.id;
  const twoPageStack = appendPageFrameToStack(seed, stackId, primaryFrame.id, {
    id: 'slice-page-2',
  });

  const snapshot = createPageSliceSnapshot({
    collection: twoPageStack,
    noteId: 'note-page-slice-contract',
    pageFrameId: 'slice-page-2',
    blockIds: ['block-on-page-2-a', 'block-on-page-2-b'],
    snapshotText: 'A whole-page PageSlice snapshot for page 2.',
    capturedAt: '2026-06-27T12:00:00.000Z',
    id: 'page-slice-contract-snapshot',
  });

  assert(snapshot, 'PageSlice snapshot can be created for a PageFrame inside a PageStack');
  assertEqual(snapshot.kind, 'page_slice_snapshot', 'PageSlice snapshot records its snapshot kind');
  assertEqual(snapshot.source, 'page_stack_page', 'PageSlice snapshot source is a PageStack page');
  assertEqual(snapshot.noteId, 'note-page-slice-contract', 'PageSlice snapshot records source note id');
  assertEqual(snapshot.pageStackId, stackId, 'PageSlice snapshot records source PageStack');
  assertEqual(snapshot.pageFrameId, 'slice-page-2', 'PageSlice snapshot records source PageFrame');
  assertEqual(snapshot.pageIndex, 1, 'PageSlice snapshot keeps zero-based page index');
  assertEqual(snapshot.pageTotal, 2, 'PageSlice snapshot records PageStack total pages');
  assertEqual(snapshot.label, 'Page 2 / 2', 'PageSlice snapshot gets a human-readable page label');
  assertEqual(snapshot.blockIds.join(','), 'block-on-page-2-a,block-on-page-2-b', 'PageSlice snapshot preserves whole-page block ids');
  assertEqual(snapshot.openOriginal.pageFrameId, 'slice-page-2', 'PageSlice snapshot keeps open-original PageFrame target');
  assert(snapshot.snapshotHash?.startsWith('fnv1a:'), 'PageSlice snapshot records deterministic text hash');

  const reference = createPageSliceReferenceDescriptor(snapshot);
  assertEqual(reference.mode, 'reference', 'PageSlice reference descriptor is explicitly a reference');
  assertEqual(reference.snapshotId, snapshot.id, 'PageSlice reference points back to the snapshot descriptor');
  assertEqual(reference.previewText, snapshot.snapshotText, 'PageSlice reference keeps preview text only');
  assertEqual(reference.openOriginal.pageStackId, stackId, 'PageSlice reference can open original PageStack');

  const member = createContentGroupMemberFromPageSliceSnapshot(snapshot, 3);
  assertEqual(member.kind, 'page_slice', 'PageSlice snapshot becomes a page_slice ContentGroup member candidate');
  assertEqual(member.target_id, snapshot.id, 'PageSlice member target is the snapshot id');
  assertEqual(member.label, snapshot.label, 'PageSlice member label uses page label');
  assertEqual(member.current_content, snapshot.snapshotText, 'PageSlice member current content stores snapshot text');
  assertEqual(member.preview_text, snapshot.snapshotText, 'PageSlice member preview stores snapshot text');
  assertEqual(member.order_index, 3, 'PageSlice member preserves requested order');
  assertEqual(member.source_ref?.metadata?.page_stack_id, stackId, 'PageSlice member source_ref metadata records PageStack');
  assertEqual(member.source_ref?.metadata?.page_frame_id, 'slice-page-2', 'PageSlice member source_ref metadata records PageFrame');
  assertEqual(member.metadata?.page_slice_snapshot_id, snapshot.id, 'PageSlice member metadata records snapshot id');

  const missing = createPageSliceSnapshot({
    collection: twoPageStack,
    noteId: 'note-page-slice-contract',
    pageFrameId: 'missing-page-frame',
  });
  assertEqual(missing, null, 'missing PageFrame does not create a fake PageSlice snapshot');
}

function testPageFrameOperableObjectGeometryUpdates(): void {
  const primaryFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const collection = insertPageFrameAfter(
    createPageFrameCollectionSeed(primaryFrame),
    primaryFrame.id,
    { id: 'page-frame-2' },
  );
  const original = collection.pageFrames.find((frame) => frame.id === 'page-frame-2');
  assert(original, 'inserted PageFrame exists for operable-object geometry checks');

  const moved = movePageFrameInCollection(collection, 'page-frame-2', { dx: 120, dy: 80 });
  const movedFrame = moved.pageFrames.find((frame) => frame.id === 'page-frame-2');
  assertEqual(movedFrame?.x, original.x + 120, 'move updates PageFrame x');
  assertEqual(movedFrame?.y, original.y + 80, 'move updates PageFrame y');
  assertEqual(moved.primaryFrameId, collection.primaryFrameId, 'move preserves primary PageFrame id');
  assertEqual(moved.selectedFrameId, 'page-frame-2', 'move selects operated PageFrame');

  const resized = resizePageFrameInCollection(moved, 'page-frame-2', {
    width: original.width + 160,
    height: original.height + 120,
  });
  const resizedFrame = resized.pageFrames.find((frame) => frame.id === 'page-frame-2');
  assertEqual(resizedFrame?.width, original.width + 160, 'resize updates PageFrame width');
  assertEqual(resizedFrame?.height, original.height + 120, 'resize updates PageFrame height');
  assertEqual(resized.primaryFrameId, collection.primaryFrameId, 'resize preserves primary PageFrame id');
  assertEqual(resized.selectedFrameId, 'page-frame-2', 'resize selects operated PageFrame');

  const configured = updatePageFrameInCollection(resized, 'page-frame-2', { exportable: false });
  assertEqual(
    configured.pageFrames.find((frame) => frame.id === 'page-frame-2')?.exportable,
    false,
    'updatePageFrameInCollection can patch safe PageFrame config fields',
  );
}

function testPageFrameLayoutAffiliationAndMoveCohort(): void {
  const pageFrame = {
    ...createRuntimePageFrame({
      contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
      height: 700,
    }),
    id: 'page-frame-layout-container',
    x: 100,
    y: 80,
    width: 500,
    height: 700,
  };
  const pageLocalLayout: BlockBoxLayout = { x: 0, y: 32, width: 240, height: 120, surface: 'formal_page' };
  const projectedLayout = projectPageFrameLocalLayoutToCanvasLayout({
    layout: pageLocalLayout,
    pageFrame,
    pageOffsetX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
  });
  const projectedPlacement = buildRuntimeBlockPlacement({
    block: createBlock('projected-page-mode-block'),
    canvasId: 'contract-canvas',
    layout: projectedLayout,
    pageOffsetX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    pageFrame,
    zIndex: 1,
  });
  assertEqual(
    projectedLayout.x,
    pageFrame.x,
    'Page Mode-created block layout stores the PageFrame canvas x offset',
  );
  assertEqual(
    projectedLayout.y,
    pageFrame.y + pageLocalLayout.y,
    'Page Mode-created block layout stores the PageFrame canvas y offset',
  );
  assertEqual(
    projectedPlacement.x,
    pageFrame.x + pageFrame.contentInset.left,
    'Page Mode-created block renders inside the moved PageFrame content x',
  );
  assertEqual(
    projectedPlacement.y,
    pageFrame.y + pageLocalLayout.y,
    'Page Mode-created block renders inside the moved PageFrame y',
  );
  const blockLayouts: Record<string, BlockBoxLayout> = {
    inside: { x: 160, y: 140, width: 240, height: 120 },
    crossing: { x: 520, y: 720, width: 180, height: 120 },
    outside: { x: 720, y: 120, width: 160, height: 100 },
  };

  const affiliations = deriveLayoutAffiliationsForPageFrame({ pageFrame, blockLayouts });
  assertEqual(affiliations.inside?.containerKind, 'page_frame', 'inside block gets PageFrame layout container');
  assertEqual(affiliations.inside?.containerId, pageFrame.id, 'inside block records the PageFrame container id');
  assertEqual(affiliations.inside?.relation, 'fully_contained', 'inside block is fully contained');
  assertEqual(affiliations.crossing?.relation, 'crossing', 'crossing block is not treated as movable page content');
  assertEqual(affiliations.outside?.containerKind, 'workspace', 'outside block remains workspace-affiliated');

  const cohort = derivePageFrameMoveCohort({ pageFrame, blockLayouts });
  assertEqual(cohort.join(','), 'inside', 'PageFrame move cohort includes only fully-contained blocks');

  const movedLayouts = movePageFrameAffiliatedBlockLayouts({
    pageFrame,
    blockLayouts,
    delta: { x: 40, y: -20 },
  });
  assertEqual(movedLayouts.inside?.x, 200, 'PageFrame move shifts fully-contained block x');
  assertEqual(movedLayouts.inside?.y, 120, 'PageFrame move shifts fully-contained block y');
  assertEqual(movedLayouts.crossing, undefined, 'PageFrame move does not shift crossing block');
  assertEqual(movedLayouts.outside, undefined, 'PageFrame move does not shift workspace block');
}

function testPageFrameObjectContractAndAffiliationDecision(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    world: createRuntimeWorld('canvas', DEFAULT_PAGE_FRAME_HEIGHT),
    primaryPageFrame: pageFrame,
    pageFrames: [pageFrame],
    viewport: createRuntimeViewport('canvas', DEFAULT_PAGE_FRAME_HEIGHT),
    blockPlacements: [],
  });
  const pageFrameObject = runtime.canvasObjects.find((object) => object.objectId === pageFrame.id);
  const pageFramePlacement = runtime.canvasPlacements.find((placement) => placement.objectId === pageFrame.id);
  const pageFrameExtension = runtime.pageFrameExtensions.find((extension) => extension.objectId === pageFrame.id);

  assertEqual(pageFrameObject?.kind, 'page_frame', 'PageFrame is represented as a CanvasObject');
  assertEqual(pageFrameObject?.backing, 'none', 'PageFrame CanvasObject does not pretend to be TextFlow content');
  assertEqual(pageFramePlacement?.objectId, pageFrame.id, 'PageFrame has a generic CanvasPlacement');
  assertEqual(pageFramePlacement?.frameId, pageFrame.id, 'PageFrame placement points to its own frame boundary');
  assertEqual(pageFrameExtension?.objectId, pageFrame.id, 'PageFrame semantics live in PageFrameExtension');

  const insidePlacement = {
    x: pageFrame.x + pageFrame.contentInset.left + 20,
    y: pageFrame.y + pageFrame.contentInset.top + 20,
    width: 120,
    height: 60,
  };
  const crossingPlacement = {
    x: pageFrame.x + pageFrame.contentInset.left - 50,
    y: pageFrame.y + pageFrame.contentInset.top + 20,
    width: 80,
    height: 60,
  };
  const workspacePlacement = {
    x: pageFrame.x + pageFrame.width + 200,
    y: pageFrame.y + 40,
    width: 120,
    height: 60,
  };

  const insideAffiliation = classifyPlacementAgainstPageFrame({
    placement: insidePlacement,
    pageFrame,
  });
  assertEqual(insideAffiliation.mode, PAGE_FRAME_AFFILIATION_MODE, 'PageFrame affiliation uses geometry-derived mode');
  assertEqual(insideAffiliation.kind, 'inside', 'center-inside placement is affiliated with PageFrame');
  assertEqual(insideAffiliation.pageFrameId, pageFrame.id, 'inside affiliation records the candidate PageFrame');
  assertEqual(insideAffiliation.ownership, 'none', 'inside affiliation does not create PageFrame ownership');
  assertEqual(insideAffiliation.exportCandidate, true, 'inside affiliation is an export candidate');

  const crossingAffiliation = derivePlacementPageFrameAffiliation({
    placement: crossingPlacement,
    pageFrames: [pageFrame],
  });
  assertEqual(crossingAffiliation.kind, 'crossing', 'intersecting placement is crossing, not owned');
  assertEqual(crossingAffiliation.ownership, 'none', 'crossing affiliation does not create PageFrame ownership');

  const workspaceAffiliation = derivePlacementPageFrameAffiliation({
    placement: workspacePlacement,
    pageFrames: [pageFrame],
  });
  assertEqual(workspaceAffiliation.kind, 'workspace_only', 'outside placement stays workspace-only');
  assertEqual(workspaceAffiliation.pageFrameId, null, 'workspace-only placement has no PageFrame candidate');
  assertEqual(workspaceAffiliation.exportCandidate, false, 'workspace-only placement is not a default export candidate');
}

function testPageFrameGuideAndSnapWall(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const contentRect = getPageFrameContentRect(pageFrame);
  const guides = createPageFrameGuides(pageFrame);

  assertEqual(guides.leftMargin.x, contentRect.x, 'left guide aligns to PageFrame content rect');
  assertEqual(
    guides.rightMargin.x,
    contentRect.x + contentRect.width,
    'right guide aligns to PageFrame content rect',
  );
  assertEqual(
    guides.centerLine.x,
    contentRect.x + contentRect.width / 2,
    'center guide aligns to PageFrame content center',
  );
  assertEqual(guides.topRuler.y, contentRect.y, 'top ruler aligns to PageFrame content top');

  const nearLeft = snapRectToPageFrameGuides({
    rect: {
      x: contentRect.x + 4,
      y: contentRect.y + 24,
      width: 120,
      height: 60,
    },
    pageFrame,
  });
  assertEqual(nearLeft.rect.x, contentRect.x, 'near-left placement snaps to left margin');
  assertEqual(nearLeft.guide?.x, contentRect.x, 'near-left snap guide points to left margin');
  assertEqual(nearLeft.snapState, 'snapped', 'near-left snap reports snapped state');

  const nearRight = snapRectToPageFrameGuides({
    rect: {
      x: contentRect.x + contentRect.width - 120 + 5,
      y: contentRect.y + 24,
      width: 120,
      height: 60,
    },
    pageFrame,
  });
  assertEqual(
    nearRight.rect.x,
    contentRect.x + contentRect.width - 120,
    'near-right placement snaps its right edge to right margin',
  );
  assertEqual(nearRight.guide?.x, contentRect.x + contentRect.width, 'near-right snap guide points to right margin');

  const nearCenter = snapRectToPageFrameGuides({
    rect: {
      x: contentRect.x + contentRect.width / 2 - 50 + 3,
      y: contentRect.y + 24,
      width: 100,
      height: 60,
    },
    pageFrame,
  });
  assertEqual(
    nearCenter.rect.x,
    contentRect.x + contentRect.width / 2 - 50,
    'near-center placement snaps its center to PageFrame center guide',
  );
  assertEqual(nearCenter.guide?.x, contentRect.x + contentRect.width / 2, 'center snap guide points to center line');

  const farOutside = snapRectToPageFrameGuides({
    rect: {
      x: contentRect.x + contentRect.width + 80,
      y: contentRect.y + 24,
      width: 120,
      height: 60,
    },
    pageFrame,
  });
  assertEqual(farOutside.rect.x, contentRect.x + contentRect.width + 80, 'far outside placement is not hard-clipped');
  assertEqual(farOutside.snapState, 'free', 'far outside placement remains free');

  const snapOff = snapRectToPageFrameGuides({
    rect: {
      x: contentRect.x + 4,
      y: contentRect.y + 24,
      width: 120,
      height: 60,
    },
    pageFrame,
    snapEnabled: false,
  });
  assertEqual(snapOff.rect.x, contentRect.x + 4, 'snap disabled keeps free placement');
  assertEqual(snapOff.guide, null, 'snap disabled emits no guide');

  assertEqual(
    shouldShowPageFrameGuides({ surfaceMode: 'page', layoutMode: false, interactionMode: 'idle' }).leftRight,
    false,
    'idle Page Mode hides left/right writing guides',
  );
  assertEqual(
    shouldShowPageFrameGuides({ surfaceMode: 'page', layoutMode: false, interactionMode: 'idle' }).topRuler,
    false,
    'idle Page Mode hides top ruler guide',
  );
  assertEqual(
    shouldShowPageFrameGuides({ surfaceMode: 'page', layoutMode: false, interactionMode: 'idle' }).center,
    false,
    'idle Page Mode hides center guide',
  );
  assertEqual(
    shouldShowPageFrameGuides({ surfaceMode: 'page', layoutMode: true, interactionMode: 'idle' }).leftRight,
    true,
    'Layout mode shows left/right writing guides',
  );
  assertEqual(
    shouldShowPageFrameGuides({ surfaceMode: 'canvas', layoutMode: true, interactionMode: 'idle' }).center,
    true,
    'Layout mode shows center guide',
  );
  assertEqual(
    shouldShowPageFrameGuides({ surfaceMode: 'canvas', layoutMode: false, interactionMode: 'draggingBlock' }).center,
    true,
    'dragging shows center guide',
  );
}

function testPageFramePrintScaleAndTypographyBaseline(): void {
  const profile = createPageFramePrintProfile();
  const typography = createDefaultDocumentTypographyProfile();

  assertEqual(profile.pageSize, DEFAULT_PAGE_FRAME_PAGE_SIZE, 'default PageFrame print profile uses named A4 baseline');
  assertEqual(profile.width, DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH + profile.contentInset.left + profile.contentInset.right, 'A4 profile width includes content width plus margins');
  assertEqual(profile.contentWidth, DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH, 'A4 profile preserves current writing content width');
  assertAtLeast(profile.height, 1200, 'A4 profile gives PageFrame a paper-like height instead of a squat content box');
  assert(
    Math.abs(profile.height / profile.width - Math.SQRT2) < 0.003,
    'A4 profile keeps a paper-like aspect ratio',
  );
  assertEqual(DEFAULT_PAGE_FRAME_HEIGHT, profile.height, 'runtime PageFrame default height follows print profile');

  assertEqual(typography.profileId, 'default-document', 'document typography has a stable default profile id');
  assertEqual(typography.fontSizePx, 15, 'default document typography uses readable document-scale font size');
  assertEqual(typography.lineHeightPx, 22, 'default document typography uses document-scale line height');
  assert(typography.lineHeightPx > typography.fontSizePx, 'line height must leave readable text leading');
  assert(typography.averageCharWidthPx < 8.2, 'document typography estimate should not inherit oversized UI text metrics');
  assertEqual(TEXT_AVERAGE_CHAR_WIDTH, typography.averageCharWidthPx, 'runtime text measurement uses document typography estimate');

  const cssVars = documentTypographyToCssVars(typography);
  assertEqual(cssVars['--document-font-size'], '15px', 'document typography exposes font size CSS variable');
  assertEqual(cssVars['--document-line-height'], '22px', 'document typography exposes line height CSS variable');

  const shortFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: 400,
  });
  assertEqual(shortFrame.pageSize, 'A4', 'runtime PageFrame carries page size');
  assertEqual(shortFrame.height, DEFAULT_PAGE_FRAME_HEIGHT, 'runtime PageFrame clamps short requests to the print baseline height');

  const legacyFrame = {
    ...shortFrame,
    pageSize: undefined,
    height: 580,
  };
  const normalizedLegacyFrame = normalizePageFramePrintBaseline(legacyFrame);
  assertEqual(normalizedLegacyFrame.pageSize, 'A4', 'legacy PageFrame without page size is upgraded to the active default');
  assertEqual(normalizedLegacyFrame.height, DEFAULT_PAGE_FRAME_HEIGHT, 'legacy squat PageFrame is upgraded to print-scale height');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'page',
    primaryPageFrame: shortFrame,
    pageFrames: [shortFrame],
    viewport: createViewport(),
    blockPlacements: [],
  });
  assertEqual(runtime.pageFrameExtensions[0]?.pageSize, 'A4', 'PageFrameExtension exposes page size');
  assertEqual(
    runtime.pageFrameExtensions[0]?.documentTypography.fontSizePx,
    typography.fontSizePx,
    'PageFrameExtension exposes document typography baseline',
  );
}

function testTextFlowTypographyProfileMetadataAndRuntimeContract(): void {
  const missingProfile = typographyProfileFromMetadata({});
  assertEqual(missingProfile.profileId, 'default-document', 'missing typography metadata falls back to default profile');
  assertEqual(missingProfile.fontSizePx, 15, 'missing typography metadata preserves default font size');
  assertEqual(missingProfile.lineHeightPx, 22, 'missing typography metadata preserves default line height');
  assertEqual(missingProfile.paragraphSpacingPx, 0, 'missing typography metadata preserves default paragraph spacing');
  const fontFamilyValues = DOCUMENT_FONT_FAMILY_OPTIONS.map((option) => option.value);
  assert(
    fontFamilyValues.includes(DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily),
    'document font family controls include default font family',
  );
  assert(fontFamilyValues.includes('Georgia, serif'), 'document font family controls include Georgia');

  const clampedProfile = normalizeDocumentTypographyProfile({
    profileId: '',
    fontFamily: '',
    fontSizePx: 2,
    lineHeightPx: 3,
    paragraphSpacingPx: 100,
    averageCharWidthPx: -1,
  });
  assertEqual(clampedProfile.profileId, 'default-document', 'empty typography profile id normalizes to default profile id');
  assertEqual(clampedProfile.fontSizePx, 10, 'font size clamps upward');
  assertEqual(clampedProfile.lineHeightPx, 14, 'line height clamps to document minimum');
  assertEqual(clampedProfile.paragraphSpacingPx, 32, 'paragraph spacing clamps downward');
  assertEqual(clampedProfile.averageCharWidthPx, 4.8, 'average char width derives from clamped font size');

  const largeProfile = normalizeDocumentTypographyProfile({
    profileId: 'large-document',
    fontFamily: 'Georgia, serif',
    fontSizePx: 99,
    lineHeightPx: 99,
    paragraphSpacingPx: 12,
  });
  assertEqual(largeProfile.profileId, 'large-document', 'valid typography profile id is preserved');
  assertEqual(largeProfile.fontSizePx, 28, 'font size clamps downward');
  assertEqual(largeProfile.lineHeightPx, 48, 'line height clamps downward');
  assertEqual(largeProfile.paragraphSpacingPx, 12, 'valid paragraph spacing is preserved');
  assertEqual(largeProfile.averageCharWidthPx, 13.4, 'average char width derives from clamped large font size');

  const patchedFontSize = patchDocumentTypographyProfile(missingProfile, { fontSizePx: 18 });
  assertEqual(patchedFontSize.fontSizePx, 18, 'patch helper updates font size');
  assert(
    patchedFontSize.lineHeightPx >= patchedFontSize.fontSizePx + 2,
    'patch helper keeps line height compatible with font size',
  );
  assert(
    patchedFontSize.averageCharWidthPx >= DOCUMENT_TYPOGRAPHY_LIMITS.minAverageCharWidthPx
      && patchedFontSize.averageCharWidthPx <= DOCUMENT_TYPOGRAPHY_LIMITS.maxAverageCharWidthPx,
    'patch helper keeps average char width inside typography limits',
  );
  assertEqual(patchedFontSize.averageCharWidthPx, 8.6, 'patch helper derives average char width when font size changes');
  const patchedFontFamily = patchDocumentTypographyProfile(missingProfile, { fontFamily: 'Georgia, serif' });
  assertEqual(patchedFontFamily.fontFamily, 'Georgia, serif', 'patch helper accepts listed font family option');
  const patchedInvalidFontFamily = patchDocumentTypographyProfile(missingProfile, { fontFamily: 'Papyrus, fantasy' });
  assertEqual(
    patchedInvalidFontFamily.fontFamily,
    DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily,
    'patch helper rejects unlisted font family values',
  );
  const patchedLineHeight = patchDocumentTypographyProfile(missingProfile, { lineHeightPx: 24 });
  assertEqual(patchedLineHeight.lineHeightPx, 24, 'patch helper updates line height');
  const patchedSmallLineHeight = patchDocumentTypographyProfile(missingProfile, { lineHeightPx: 3 });
  assertEqual(
    patchedSmallLineHeight.lineHeightPx,
    Math.max(patchedSmallLineHeight.fontSizePx + 2, DOCUMENT_TYPOGRAPHY_LIMITS.minLineHeightPx),
    'patch helper clamps line height to document minimum',
  );
  const patchedParagraphSpacing = patchDocumentTypographyProfile(missingProfile, { paragraphSpacingPx: 12 });
  assertEqual(patchedParagraphSpacing.paragraphSpacingPx, 12, 'patch helper updates paragraph spacing');
  const patchedNegativeParagraphSpacing = patchDocumentTypographyProfile(missingProfile, { paragraphSpacingPx: -8 });
  assertEqual(
    patchedNegativeParagraphSpacing.paragraphSpacingPx,
    DOCUMENT_TYPOGRAPHY_LIMITS.minParagraphSpacingPx,
    'patch helper clamps paragraph spacing upward',
  );
  const patchedLargeParagraphSpacing = patchDocumentTypographyProfile(missingProfile, { paragraphSpacingPx: 88 });
  assertEqual(
    patchedLargeParagraphSpacing.paragraphSpacingPx,
    DOCUMENT_TYPOGRAPHY_LIMITS.maxParagraphSpacingPx,
    'patch helper clamps paragraph spacing downward',
  );
  const patchedExplicitAverage = patchDocumentTypographyProfile(missingProfile, {
    fontSizePx: 18,
    averageCharWidthPx: 9,
  });
  assertEqual(patchedExplicitAverage.averageCharWidthPx, 9, 'patch helper preserves explicit valid average char width');

  const metadata = writeTypographyProfileMetadata({}, largeProfile);
  assert(metadata[NOTE_TYPOGRAPHY_PROFILE_METADATA_KEY], 'typography metadata key is written');
  assertEqual(
    typographyProfileFromMetadata(metadata).fontFamily,
    largeProfile.fontFamily,
    'typography metadata round-trips font family',
  );
  assertEqual(
    typographyProfileFromMetadata(metadata).fontSizePx,
    largeProfile.fontSizePx,
    'typography metadata round-trips font size',
  );

  const textFlow = createTextBlockContentV1('Typography changes must not rewrite TextFlow content.');
  const textBefore = textFlow.units[0]?.text || '';
  writeTypographyProfileMetadata({}, largeProfile);
  assertEqual(
    textFlow.units[0]?.text,
    textBefore,
    'writing typography metadata does not mutate TextFlow unit text',
  );

  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'page',
    primaryPageFrame: pageFrame,
    pageFrames: [pageFrame],
    viewport: createViewport({ zoom: 1.8 }),
    blockPlacements: [],
    documentTypography: largeProfile,
  });
  assertEqual(
    runtime.pageFrameExtensions[0]?.documentTypography.profileId,
    'large-document',
    'PageFrameExtension exposes active note typography profile id',
  );
  assertEqual(
    runtime.pageFrameExtensions[0]?.documentTypography.fontSizePx,
    28,
    'PageFrameExtension exposes active note font size',
  );
  assertEqual(
    runtime.viewport.zoom,
    1.8,
    'Canvas zoom remains viewport state',
  );
  assertEqual(
    runtime.pageFrameExtensions[0]?.documentTypography.fontSizePx,
    28,
    'Canvas zoom does not mutate document typography',
  );
}

function testTypographyMeasurementService(): void {
  const defaultProfile = createDefaultDocumentTypographyProfile();
  const largerProfile = patchDocumentTypographyProfile(defaultProfile, {
    fontSizePx: 20,
    lineHeightPx: 30,
    paragraphSpacingPx: 8,
  });
  const text = 'Power series convergence '.repeat(18);
  const base = estimateTypographyTextBlockHeight({
    text,
    width: 220,
    typography: defaultProfile,
  });
  const larger = estimateTypographyTextBlockHeight({
    text,
    width: 220,
    typography: largerProfile,
  });
  const paragraphSpaced = estimateTypographyTextBlockHeight({
    text: 'Definition line\nExample line\nPractice line',
    width: 220,
    typography: largerProfile,
  });

  assert(base.heightPx >= 52, 'typography measurement returns a usable block height');
  assert(larger.heightPx > base.heightPx, 'larger font and line height produce a taller estimate');
  assert(paragraphSpaced.paragraphSpacingPx === 8, 'paragraph spacing is exposed in measurement result');
  assert(paragraphSpaced.heightPx >= 30 * 3 + 8 * 2, 'paragraph spacing contributes to text height');
  assertEqual(
    estimatePageFrameLineCapacity({ contentHeight: 220, typography: defaultProfile }),
    10,
    'PageFrame line capacity uses normalized line height',
  );
}

function testAIReadablePageFrameTypography(): void {
  const profile = patchDocumentTypographyProfile(createDefaultDocumentTypographyProfile(), {
    fontSizePx: 19,
    lineHeightPx: 29,
    paragraphSpacingPx: 7,
  });
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'page',
    primaryPageFrame: pageFrame,
    pageFrames: [pageFrame],
    viewport: createViewport(),
    blockPlacements: [],
    documentTypography: profile,
  });
  const pageFrameNode = runtime.canvasAIReadableSnapshot.nodes.find((node) => node.kind === 'page_frame');

  assert(pageFrameNode?.pageFrameRef?.documentTypography, 'AI-readable PageFrame exposes document typography');
  assertEqual(
    pageFrameNode?.pageFrameRef?.documentTypography?.fontSizePx,
    19,
    'AI-readable PageFrame reads active font size',
  );
  assertEqual(
    pageFrameNode?.pageFrameRef?.documentTypography?.lineHeightPx,
    29,
    'AI-readable PageFrame reads active line height',
  );
  assertEqual(
    pageFrameNode?.pageFrameRef?.documentTypography?.paragraphSpacingPx,
    7,
    'AI-readable PageFrame reads active paragraph spacing',
  );
}

function testPageFrameHeaderFooterAndPageNumberSlots(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const slotRects = resolvePageFrameSlotRects(pageFrame);
  assertEqual(slotRects.header.width, DEFAULT_PAGE_CONTENT_WIDTH, 'header slot follows PageFrame content width');
  assertEqual(slotRects.footer.width, DEFAULT_PAGE_CONTENT_WIDTH, 'footer slot follows PageFrame content width');
  assert(slotRects.header.y < slotRects.footer.y, 'header slot is above footer slot');
  assert(slotRects.pageNumber.y > slotRects.footer.y, 'page-number slot is placed below footer slot');

  const slots = createDefaultPageFrameSlots({
    pageFrame,
    pageIndex: 1,
    totalPages: 3,
  });
  assertEqual(slots.header?.kind, 'header', 'default PageFrame slots include a header slot');
  assertEqual(slots.footer?.kind, 'footer', 'default PageFrame slots include a footer slot');
  assertEqual(slots.pageNumber?.kind, 'page_number', 'default PageFrame slots include a page-number slot');
  assertEqual(slots.header?.textSource, 'empty', 'empty header slot does not create hidden TextFlow content');
  assertEqual(slots.footer?.textSource, 'empty', 'empty footer slot does not create hidden TextFlow content');
  assertEqual(slots.pageNumber?.textSource, 'generated', 'page number is generated PageFrame state');
  assertEqual(slots.pageNumber?.text, '2 / 3', 'page number formats from PageFrame page index');
  assertEqual(formatPageNumber({ pageIndex: 0, totalPages: 1 }), '1', 'single-page number formats as a simple number');
  assert(
    summarizePageFrameSlotsForAI(slots).some((line) => line.includes('page_number: 2 / 3')),
    'AI slot summary includes generated page-number state',
  );

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'page',
    primaryPageFrame: pageFrame,
    pageFrames: [pageFrame],
    viewport: createViewport(),
    blockPlacements: [],
  });
  const extension = runtime.pageFrameExtensions[0];
  assertEqual(extension?.headerFooterEnabled, true, 'PageFrameExtension enables header/footer slot chrome');
  assertEqual(extension?.pageNumberEnabled, true, 'PageFrameExtension enables generated page number');
  assertEqual(extension?.slots?.header?.kind, 'header', 'PageFrameExtension exposes header slot');
  assertEqual(extension?.slots?.footer?.kind, 'footer', 'PageFrameExtension exposes footer slot');
  assertEqual(extension?.slots?.pageNumber?.text, '1', 'PageFrameExtension exposes generated page number text');

  const pageFrameNode = runtime.canvasAIReadableSnapshot.nodes.find((node) => node.id === pageFrame.id);
  assertEqual(pageFrameNode?.pageFrameRef?.headerFooterEnabled, true, 'AI Tree exposes header/footer slot state');
  assertEqual(pageFrameNode?.pageFrameRef?.pageNumberEnabled, true, 'AI Tree exposes page-number slot state');
  assertEqual(pageFrameNode?.pageFrameSlots?.pageNumber?.textSource, 'generated', 'AI Tree exposes generated page-number slot');
  assertEqual(pageFrameNode?.pageFrameSlots?.header?.textSource, 'empty', 'AI Tree exposes empty header as non-TextFlow slot state');
}

function testPageFrameTemplateBackgroundAndStyle(): void {
  const templateIds = PAGE_FRAME_TEMPLATE_PRESETS.map((template) => template.templateId);
  assert(templateIds.includes('a4_portrait'), 'PageFrame template presets include A4 portrait');
  assert(templateIds.includes('letter_portrait'), 'PageFrame template presets include Letter portrait');
  assert(templateIds.includes('screen_note'), 'PageFrame template presets include Screen note');
  assert(templateIds.includes('custom'), 'PageFrame template presets include Custom');
  assertEqual(DEFAULT_PAGE_FRAME_TEMPLATE_ID, 'a4_portrait', 'default PageFrame template is A4 portrait');

  const a4Template = createPageFrameTemplate('a4_portrait');
  assertEqual(a4Template.pageSize, 'A4', 'A4 template carries A4 page size');
  assertEqual(a4Template.defaultTypographyToken, 'default-document', 'A4 template points at the document typography token');
  assertEqual(a4Template.exportable, true, 'A4 template is exportable');
  assert(a4Template.background.fill.length > 0, 'A4 template carries a background fill token');

  const screenTemplate = createPageFrameTemplate('screen_note');
  assertEqual(screenTemplate.pageSize, 'Custom', 'Screen note template is a custom page size');
  assertEqual(screenTemplate.exportable, false, 'Screen note template is not exportable by default');
  assertEqual(screenTemplate.background.kind, 'screen', 'Screen note template carries a screen background kind');

  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const sourceBlock = createBlock('template-source-block');
  const sourceTextBefore = projectNoteBlockTextFlow(sourceBlock).plain_text;
  const letterFrame = applyPageFrameTemplate(pageFrame, createPageFrameTemplate('letter_portrait'));
  assertEqual(letterFrame.templateId, 'letter_portrait', 'applying a template stamps the PageFrame template id');
  assertEqual(letterFrame.pageSize, 'Letter', 'applying a template updates PageFrame page size');
  assertEqual(letterFrame.exportable, true, 'applying a print template keeps PageFrame exportable');
  assertEqual(letterFrame.id, pageFrame.id, 'applying a template preserves PageFrame identity');
  assertEqual(letterFrame.role, pageFrame.role, 'applying a template preserves PageFrame role');
  assertEqual(letterFrame.x, pageFrame.x, 'applying a template preserves PageFrame x position');
  assertEqual(projectNoteBlockTextFlow(sourceBlock).plain_text, sourceTextBefore, 'applying a PageFrame template does not mutate TextFlow');

  const cssVars = pageFrameTemplateToCssVars(a4Template);
  assertEqual(cssVars['--page-frame-background'], a4Template.background.fill, 'template exposes PageFrame background CSS variable');
  assertEqual(cssVars['--page-frame-border-color'], a4Template.background.borderColor, 'template exposes PageFrame border CSS variable');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'page',
    primaryPageFrame: letterFrame,
    pageFrames: [letterFrame],
    viewport: createViewport(),
    blockPlacements: [],
  });
  const extension = runtime.pageFrameExtensions[0];
  assertEqual(extension?.templateId, 'letter_portrait', 'PageFrameExtension exposes active template id');
  assertEqual(extension?.background.kind, 'paper', 'PageFrameExtension exposes template background kind');
  assertEqual(extension?.defaultTypographyToken, 'default-document', 'PageFrameExtension exposes template typography token');
  assertEqual(extension?.documentTypography.fontSizePx, 15, 'PageFrame template does not resize document typography');

  const pageFrameNode = runtime.canvasAIReadableSnapshot.nodes.find((node) => node.id === letterFrame.id);
  assertEqual(pageFrameNode?.pageFrameRef?.templateId, 'letter_portrait', 'AI Tree exposes PageFrame template id');
  assertEqual(pageFrameNode?.pageFrameRef?.defaultTypographyToken, 'default-document', 'AI Tree exposes PageFrame template typography token');
  assertEqual(pageFrameNode?.pageFrameStyle?.background.fill, extension?.background.fill, 'AI Tree exposes PageFrame background style');
}

function testPageFrameAwareExportPreview(): void {
  const primaryPageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const secondaryPageFrame = {
    ...primaryPageFrame,
    id: 'export-preview-secondary-frame',
    role: 'secondary_page_frame' as const,
    x: primaryPageFrame.x + primaryPageFrame.width + 96,
  };
  const blocks = [
    createBlock('preview-1'),
    createBlock('preview-2'),
    createBlock('preview-3'),
    createBlock('preview-4'),
    createBlock('preview-5'),
    createBlock('preview-6'),
  ];
  const layouts: Record<string, BlockBoxLayout> = {
    [blocks[0].id]: {
      x: primaryPageFrame.contentInset.left + 16,
      y: 24,
      width: 220,
      height: 72,
    },
    [blocks[1].id]: {
      x: secondaryPageFrame.x + secondaryPageFrame.contentInset.left,
      y: 40,
      width: 220,
      height: 72,
    },
    [blocks[2].id]: {
      x: -100,
      y: 128,
      width: 120,
      height: 72,
    },
    [blocks[3].id]: {
      x: secondaryPageFrame.x + secondaryPageFrame.width + 300,
      y: 64,
      width: 180,
      height: 72,
    },
    [blocks[4].id]: {
      x: primaryPageFrame.contentInset.left + 20,
      y: 230,
      width: 180,
      height: 72,
      export_role: 'excluded',
    },
    [blocks[5].id]: {
      x: primaryPageFrame.contentInset.left + 20,
      y: 330,
      width: 180,
      height: 72,
      ai_visibility: 'hidden',
    },
  };
  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame,
    pageFrames: [primaryPageFrame, secondaryPageFrame],
    viewport: createViewport(),
    blockPlacements: blocks.map((block, index) => buildRuntimeBlockPlacement({
      block,
      canvasId: 'export-preview-canvas',
      layout: layouts[block.id],
      pageOffsetX: primaryPageFrame.contentInset.left,
      pageFrame: primaryPageFrame,
      zIndex: index,
    })),
  });

  const preview = buildExportPreviewModel(blocks, layouts, {
    pageFrames: runtime.pageFrames,
    blockPlacements: runtime.blockPlacements,
    primaryPageFrameId: runtime.primaryPageFrame?.id || null,
  });
  assertEqual(preview.pageFrames.length, 2, 'Export Preview groups rows by PageFrame');
  assertEqual(preview.pageFrames[0]?.pageFrameId, primaryPageFrame.id, 'Export Preview includes primary PageFrame group');
  assertEqual(preview.pageFrames[0]?.role, 'primary_page_frame', 'Export Preview marks primary PageFrame group');
  assertEqual(preview.pageFrames[0]?.includedRows.length, 2, 'primary PageFrame group tracks included rows');
  assertEqual(preview.pageFrames[0]?.excludedRows.length, 1, 'primary PageFrame group tracks excluded rows');
  assertEqual(preview.pageFrames[0]?.aiHiddenRows.length, 1, 'primary PageFrame group tracks AI hidden rows');
  assertEqual(preview.pageFrames[1]?.pageFrameId, secondaryPageFrame.id, 'Export Preview includes secondary PageFrame group');
  assertEqual(preview.pageFrames[1]?.role, 'secondary_page_frame', 'Export Preview marks secondary PageFrame group');
  assertEqual(preview.crossingObjects.length, 1, 'Export Preview separates crossing objects');
  assertEqual(preview.crossingObjects[0]?.block.id, blocks[2].id, 'crossing object row keeps block identity');
  assertEqual(
    preview.crossingExportPolicy,
    DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY,
    'Export Preview uses conservative default crossing policy',
  );
  assertEqual(
    preview.crossingObjects[0]?.exportPolicy?.decision,
    'excluded',
    'default crossing export policy excludes center-outside crossing objects',
  );
  assertEqual(
    preview.includedRows.some((row) => row.block.id === blocks[2].id),
    false,
    'policy-excluded crossing object is not counted as included',
  );
  assertEqual(
    preview.excludedRows.some((row) => row.block.id === blocks[2].id),
    true,
    'policy-excluded crossing object is counted as excluded',
  );
  assertEqual(preview.workspaceOnlyObjects.length, 1, 'Export Preview separates workspace-only objects');
  assertEqual(preview.workspaceOnlyObjects[0]?.block.id, blocks[3].id, 'workspace-only row keeps block identity');

  const clipPreview = buildExportPreviewModel(blocks, layouts, {
    pageFrames: runtime.pageFrames,
    blockPlacements: runtime.blockPlacements,
    primaryPageFrameId: runtime.primaryPageFrame?.id || null,
    crossingExportPolicy: 'clip_to_page_frame',
  });
  assertEqual(
    clipPreview.crossingObjects[0]?.exportPolicy?.decision,
    'clipped',
    'clip policy records that crossing object needs PageFrame clipping',
  );
  assertEqual(
    clipPreview.crossingObjects[0]?.exportPolicy?.exportCandidate,
    true,
    'clip policy keeps intersecting crossing object as an export candidate',
  );
  assert(
    Boolean(clipPreview.crossingObjects[0]?.exportPolicy?.clippedRect),
    'clip policy exposes a clipped rect without mutating placement geometry',
  );
  assertEqual(
    clipPreview.crossingObjects[0]?.placement?.x,
    runtime.blockPlacements[2]?.x,
    'clip policy does not move the original placement bbox',
  );
}

function testExportPreviewExposesTypography(): void {
  const profile = patchDocumentTypographyProfile(createDefaultDocumentTypographyProfile(), {
    fontSizePx: 18,
    lineHeightPx: 27,
    paragraphSpacingPx: 6,
  });
  const primaryPageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const collection = createPageFrameCollectionSeed(primaryPageFrame);
  const preview = buildExportPreviewModel([], {}, {
    pageFrames: collection.pageFrames,
    pageStacks: collection.pageStacks,
    primaryPageFrameId: collection.primaryFrameId,
    documentTypography: profile,
  });
  const pageFramePreview = preview.pageFrames[0]!;

  assertEqual(pageFramePreview.documentTypography.fontSizePx, 18, 'Export Preview exposes active font size');
  assertEqual(pageFramePreview.documentTypography.lineHeightPx, 27, 'Export Preview exposes active line height');
  assertEqual(pageFramePreview.documentTypography.paragraphSpacingPx, 6, 'Export Preview exposes paragraph spacing');
  assert(pageFramePreview.estimatedLineCapacity > 0, 'Export Preview exposes PageFrame line capacity');
}

function testPageFrameCrossingExportPolicy(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const contentRect = getPageFrameContentRect(pageFrame);
  const centerInsideCrossing = {
    x: contentRect.x - 80,
    y: contentRect.y + 40,
    width: 180,
    height: 80,
  };
  const centerOutsideCrossing = {
    x: contentRect.x - 120,
    y: contentRect.y + 140,
    width: 130,
    height: 80,
  };
  const workspaceOnly = {
    x: contentRect.x + contentRect.width + 240,
    y: contentRect.y + 80,
    width: 160,
    height: 80,
  };

  const defaultCenterInside = resolvePageFrameCrossingExportDecision({
    rect: centerInsideCrossing,
    pageFrame,
  });
  assertEqual(defaultCenterInside.policy, 'include_if_center_inside', 'default crossing policy is center-inside');
  assertEqual(defaultCenterInside.decision, 'included', 'center-inside crossing object is included by default');
  assertEqual(defaultCenterInside.exportCandidate, true, 'center-inside crossing object is an export candidate');
  assertEqual(defaultCenterInside.requiresManualDecision, false, 'center-inside default policy is automatic');

  const defaultCenterOutside = resolvePageFrameCrossingExportDecision({
    rect: centerOutsideCrossing,
    pageFrame,
  });
  assertEqual(defaultCenterOutside.decision, 'excluded', 'center-outside crossing object is excluded by default');
  assertEqual(defaultCenterOutside.exportCandidate, false, 'center-outside crossing object is not a default export candidate');

  const includeIfIntersects = resolvePageFrameCrossingExportDecision({
    rect: centerOutsideCrossing,
    pageFrame,
    policy: 'include_if_intersects',
  });
  assertEqual(includeIfIntersects.decision, 'included', 'intersects policy includes any PageFrame intersection');
  assertEqual(includeIfIntersects.exportCandidate, true, 'intersects policy keeps crossing object exportable');

  const excludeWorkspace = resolvePageFrameCrossingExportDecision({
    rect: centerInsideCrossing,
    pageFrame,
    policy: 'exclude_workspace',
  });
  assertEqual(excludeWorkspace.decision, 'excluded', 'exclude_workspace policy excludes crossing objects from export');
  assertEqual(excludeWorkspace.exportCandidate, false, 'exclude_workspace policy is not an export candidate');

  const clipped = resolvePageFrameCrossingExportDecision({
    rect: centerOutsideCrossing,
    pageFrame,
    policy: 'clip_to_page_frame',
  });
  assertEqual(clipped.decision, 'clipped', 'clip policy reports a clipped export interpretation');
  assertEqual(clipped.exportCandidate, true, 'clip policy remains exportable when object intersects PageFrame');
  assert(clipped.clippedRect, 'clip policy exposes clipped rect');
  assertEqual(clipped.clippedRect?.x, contentRect.x, 'clipped rect starts at PageFrame content edge');
  assertEqual(centerOutsideCrossing.x, contentRect.x - 120, 'clip policy does not mutate source rect');

  const manual = resolvePageFrameCrossingExportDecision({
    rect: centerOutsideCrossing,
    pageFrame,
    policy: 'manual',
  });
  assertEqual(manual.decision, 'manual_required', 'manual policy defers export decision');
  assertEqual(manual.requiresManualDecision, true, 'manual policy exposes manual decision requirement');
  assertEqual(manual.exportCandidate, false, 'manual policy does not silently export before user decision');

  const workspaceDecision = resolvePageFrameCrossingExportDecision({
    rect: workspaceOnly,
    pageFrame,
    policy: 'include_if_intersects',
  });
  assertEqual(workspaceDecision.reason, 'outside_page_frame', 'workspace-only object is recognized outside PageFrame');
  assertEqual(workspaceDecision.exportCandidate, false, 'workspace-only object is not exported by crossing policy');
}

function testPageFrameCommandSurfaceAndCreation(): void {
  const blankMenu = buildCanvasBlankMenu();
  const newPageFrameItem = blankMenu.find((item) => item.actionId === 'create_page_frame');
  const newPageStackItem = blankMenu.find((item) => item.actionId === 'create_page_stack');
  const newRectangleItem = blankMenu.find((item) => item.actionId === 'create_shape_rectangle');
  const newEllipseItem = blankMenu.find((item) => item.actionId === 'create_shape_ellipse');
  assert(!newPageFrameItem, 'blank Canvas menu does not expose standalone PageFrame creation');
  assert(newPageStackItem && !newPageStackItem.disabled, 'blank Canvas menu can create PageStack');
  assert(newRectangleItem && !newRectangleItem.disabled, 'blank Canvas menu can create rectangle shape');
  assert(newEllipseItem && !newEllipseItem.disabled, 'blank Canvas menu can create ellipse shape');
  assert(
    !blankMenu.some((item) => item.label === 'New PageFrame'),
    'blank Canvas menu visible vocabulary does not call a user-facing page New PageFrame',
  );

  const pageFrameMenu = buildPageFrameShellMenu({
    primary: false,
    inPageStack: true,
    stackCollapsed: false,
  });
  assert(
    pageFrameMenu.some((item) => item.actionId === 'add_page_below'),
    'PageFrame shell menu can add a page below inside a PageStack',
  );
  assert(
    pageFrameMenu.some((item) => item.actionId === 'detach_page_from_stack'),
    'PageFrame shell menu can detach a page from PageStack',
  );
  assert(
    pageFrameMenu.some((item) => item.actionId === 'toggle_page_stack_collapse'),
    'PageFrame shell menu can collapse or expand PageStack',
  );
  assert(
    pageFrameMenu.some((item) => item.actionId === 'duplicate_page_frame'),
    'PageFrame shell menu can duplicate',
  );
  assert(
    pageFrameMenu.some((item) => item.actionId === 'set_primary_page_frame'),
    'PageFrame shell menu can set primary',
  );
  assert(
    pageFrameMenu.some((item) => item.actionId === 'delete_page_frame'),
    'PageFrame shell menu can delete',
  );

  const primaryPageFrameMenu = buildPageFrameShellMenu({
    primary: true,
    inPageStack: false,
    stackCollapsed: false,
  });
  const setPrimaryCommand = primaryPageFrameMenu.find((item) => item.actionId === 'set_primary_page_frame');
  assertEqual(
    setPrimaryCommand?.disabled,
    true,
    'primary PageFrame shell menu disables set-primary command',
  );
  const independentDetachCommand = primaryPageFrameMenu.find((item) => item.actionId === 'detach_page_from_stack');
  assertEqual(
    independentDetachCommand?.disabled,
    true,
    'independent PageFrame disables detach-from-stack command',
  );

  const shapeMenu = buildCanvasObjectShellMenu();
  assert(
    shapeMenu.some((item) => item.actionId === 'start_visual_connector_from_object'),
    'CanvasObject shell menu can start a visual connector',
  );
  const connectorTargetMenu = buildCanvasObjectShellMenu({ connectorDraftState: 'ready' });
  assert(
    connectorTargetMenu.some((item) => item.actionId === 'finish_visual_connector_to_object'),
    'CanvasObject shell menu can finish a visual connector when draft exists',
  );
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
  assert(
    runtime.canvasObjects.some((object) => object.kind === 'page_frame'),
    'runtime model exposes PageFrame as a formal CanvasObject',
  );
  assert(
    runtime.canvasObjects.some((object) => object.kind === 'paragraph_block_projection' && object.backing === 'note_block'),
    'runtime model exposes paragraph blocks as note-block-backed CanvasObjects',
  );
  assert(
    runtime.canvasPlacements.some((placement) => placement.objectId === pagePlacement.objectId),
    'runtime model exposes generic CanvasPlacement records for block placements',
  );
  assert(
    runtime.contentMounts.some((mount) => mount.targetKind === 'note_block' && mount.targetId === pageBlock.id),
    'runtime model exposes ContentMount records for block-backed objects',
  );
  assertEqual(
    runtime.pageFrameExtensions[0]?.objectId,
    pageFrame.id,
    'runtime model exposes PageFrame extension records keyed by PageFrame object',
  );
  assertEqual(
    runtime.canvasAIReadableSnapshot.source,
    'derived_runtime',
    'runtime model exposes Canvas AI Tree as a derived snapshot',
  );
  assert(
    runtime.canvasAIReadableSnapshot.nodes.some((node) => node.kind === 'page_frame'),
    'Canvas AI Tree includes a PageFrame node',
  );
  const pageFrameNode = runtime.canvasAIReadableSnapshot.nodes.find((node) => node.id === pageFrame.id);
  assertEqual(pageFrameNode?.kind, 'page_frame', 'PageFrame node must exist as a PageFrame node');
  assert(pageFrameNode?.contentBbox, 'PageFrame node must expose content bbox');
  assertEqual(
    pageFrameNode.contentBbox.x,
    pageFrame.x + pageFrame.contentInset.left,
    'PageFrame content bbox starts after left inset',
  );
  assertEqual(
    pageFrameNode.contentBbox.width,
    DEFAULT_PAGE_CONTENT_WIDTH,
    'PageFrame content bbox uses formal page content width',
  );
  assertEqual(
    pageFrameNode.pageFrameRef?.role,
    'primary_page_frame',
    'PageFrame node must expose primary role',
  );
  assertEqual(pageFrameNode.pageFrameRef?.exportable, true, 'PageFrame node must expose exportable state');
  assertEqual(pageFrameNode.pageFrameRef?.primary, true, 'PageFrame node must expose primary flag');
  assertEqual(
    pageFrameNode.pageFrameRef?.contentInset.left,
    pageFrame.contentInset.left,
    'PageFrame node must expose content inset',
  );
  assert(
    pageFrameNode?.children?.some((node) => node.id === pagePlacement.objectId),
    'Canvas AI Tree exposes PageFrame as a container for formal-page objects',
  );
  assertEqual(runtime.visualConnectors.length, 0, 'visual connector contract starts empty and separate from relation endpoints');

  const genericShapeRuntime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement],
    genericCanvasObjects: [{
      objectId: 'shape-generic-persisted-1',
      canvasId: 'primary-note-canvas',
      kind: 'shape',
      backing: 'none',
      objectClass: 'pure',
      status: 'active',
      source: 'entity',
    }],
    genericCanvasPlacements: [{
      placementId: 'placement-shape-generic-persisted-1',
      objectId: 'shape-generic-persisted-1',
      canvasId: 'primary-note-canvas',
      x: pageFrame.x + pageFrame.contentInset.left + 48,
      y: pageFrame.y + pageFrame.contentInset.top + 48,
      width: 144,
      height: 88,
      surface: 'formal_page',
      boundaryRole: 'inside',
      zIndex: 8,
      rotation: 0,
    }],
  });
  assert(
    genericShapeRuntime.canvasObjects.some((object) => object.objectId === 'shape-generic-persisted-1'),
    'runtime model accepts persisted generic CanvasObject records',
  );
  assert(
    genericShapeRuntime.canvasPlacements.some((placement) => placement.objectId === 'shape-generic-persisted-1'),
    'runtime model accepts persisted generic CanvasPlacement records',
  );
  assert(
    genericShapeRuntime.canvasAIReadableSnapshot.nodes.some((node) => node.id === 'shape-generic-persisted-1'),
    'Canvas AI Tree includes persisted generic CanvasObjects',
  );
  const genericConnectorRuntime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement],
    genericCanvasObjects: [
      {
        objectId: 'shape-generic-persisted-1',
        canvasId: 'primary-note-canvas',
        kind: 'shape',
        backing: 'none',
        objectClass: 'pure',
        status: 'active',
        source: 'entity',
      },
      {
        objectId: 'connector-generic-persisted-1',
        canvasId: 'primary-note-canvas',
        kind: 'visual_connector',
        backing: 'none',
        objectClass: 'pure',
        status: 'active',
        source: 'entity',
      },
    ],
    genericCanvasPlacements: [
      {
        placementId: 'placement-shape-generic-persisted-1',
        objectId: 'shape-generic-persisted-1',
        canvasId: 'primary-note-canvas',
        x: pageFrame.x + pageFrame.contentInset.left + 48,
        y: pageFrame.y + pageFrame.contentInset.top + 48,
        width: 144,
        height: 88,
        surface: 'formal_page',
        boundaryRole: 'inside',
        zIndex: 8,
        rotation: 0,
      },
      {
        placementId: 'placement-connector-generic-persisted-1',
        objectId: 'connector-generic-persisted-1',
        canvasId: 'primary-note-canvas',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        surface: 'canvas_workspace',
        boundaryRole: 'outside',
        zIndex: 9,
        rotation: 0,
      },
    ],
    genericVisualConnectors: [{
      connectorId: 'connector-generic-persisted-1',
      objectId: 'connector-generic-persisted-1',
      canvasId: 'primary-note-canvas',
      startKind: 'object',
      endKind: 'object',
      startObjectId: 'shape-generic-persisted-1',
      endObjectId: pagePlacement.objectId,
      startAnchor: 'center',
      endAnchor: 'center',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      relationKind: 'visual_only',
    }],
  });
  assertEqual(
    genericConnectorRuntime.visualConnectors[0]?.start.x,
    pageFrame.x + pageFrame.contentInset.left + 48 + 72,
    'runtime resolves persisted connector start point from endpoint object placement',
  );
  assert(
    genericConnectorRuntime.canvasAIReadableSnapshot.nodes.some((node) => (
      node.id === 'connector-generic-persisted-1'
      && node.connectorRef?.relationKind === 'visual_only'
      && node.connectorRef?.startObjectId === 'shape-generic-persisted-1'
    )),
    'Canvas AI Tree includes persisted visual connector with visual-only endpoint refs',
  );

  const imageProjection = createImageObjectProjection({
    objectId: 'image-generic-persisted-1',
    canvasId: 'primary-note-canvas',
    asset: {
      assetId: 'asset-image-1',
      kind: 'image',
      filename: 'power-series.png',
      mimeType: 'image/png',
      byteSize: 2048,
      width: 640,
      height: 360,
      blobUrl: '/api/canvas-assets/asset-image-1/blob',
    },
    layout: {
      x: pageFrame.x + pageFrame.contentInset.left + 240,
      y: pageFrame.y + pageFrame.contentInset.top + 160,
      width: 320,
      height: 180,
      surface: 'formal_page',
    },
    frameId: pageFrame.id,
    zIndex: 10,
    caption: 'Power series convergence diagram',
    altText: 'A diagram showing a convergence interval for a power series.',
  });
  assertEqual(imageProjection.canvasObject.kind, 'image', 'image projection creates an image CanvasObject');
  assertEqual(imageProjection.canvasObject.backing, 'asset', 'image projection is asset-backed');
  assertEqual(imageProjection.canvasObject.objectClass, 'media', 'image projection uses the media object class');
  assertEqual(imageProjection.contentMount, null, 'image projection does not create a TextFlow content mount');

  const imageRuntime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement],
    genericCanvasObjects: [imageProjection.canvasObject],
    genericCanvasPlacements: [imageProjection.placement],
    genericImageObjects: [imageProjection.imageObject],
  });
  assertEqual(imageRuntime.imageObjects[0]?.assetId, 'asset-image-1', 'runtime exposes persisted image extension records');
  const flattenImageAiNodes = (nodes: CanvasAIReadableNode[]): CanvasAIReadableNode[] => (
    nodes.flatMap((node) => [node, ...flattenImageAiNodes(node.children || [])])
  );
  const imageNode = flattenImageAiNodes(imageRuntime.canvasAIReadableSnapshot.nodes)
    .find((node) => node.id === imageProjection.canvasObject.objectId);
  assertEqual(imageNode?.kind, 'image', 'Canvas AI Tree includes image nodes');
  assertEqual(imageNode?.imageRef?.assetId, 'asset-image-1', 'Canvas AI Tree exposes image asset identity');
  assertEqual(imageNode?.imageRef?.caption, 'Power series convergence diagram', 'Canvas AI Tree exposes image caption');
  assertEqual(imageNode?.imageRef?.altText, 'A diagram showing a convergence interval for a power series.', 'Canvas AI Tree exposes image alt text');

  const imagePayload = imageObjectSavePayload(
    imageProjection.canvasObject,
    imageProjection.placement,
    imageProjection.imageObject,
    imageProjection.visualStyle,
  );
  assertEqual(imagePayload.kind, 'image', 'image save payload keeps kind=image');
  assertEqual(imagePayload.backing, 'asset', 'image save payload keeps backing=asset');
  assertEqual(imagePayload.object_class, 'media', 'image save payload keeps object_class=media');
  assertEqual((imagePayload.extension as Record<string, unknown>).asset_id, 'asset-image-1', 'image save payload writes extension.asset_id');
  assertEqual((imagePayload.extension as Record<string, unknown>).fit, 'contain', 'image save payload writes fit mode');

  const tableProjection = createTableObjectProjection({
    objectId: 'table-generic-persisted-1',
    canvasId: 'primary-note-canvas',
    layout: {
      x: pageFrame.x + pageFrame.contentInset.left + 80,
      y: pageFrame.y + pageFrame.contentInset.top + 380,
      width: 420,
      height: 220,
      surface: 'formal_page',
    },
    frameId: pageFrame.id,
    zIndex: 11,
  });
  assertEqual(tableProjection.canvasObject.kind, 'table', 'table projection creates a table CanvasObject');
  assertEqual(tableProjection.canvasObject.backing, 'structured_object', 'table projection is structured-object-backed');
  assertEqual(tableProjection.canvasObject.objectClass, 'structured', 'table projection uses the structured object class');
  assertEqual(tableProjection.contentMount, null, 'table projection does not create a TextFlow content mount');
  assertEqual(tableProjection.structuredObject.payload.cells.length, 9, 'table projection creates a complete default cell matrix');
  const firstTableCell = tableProjection.structuredObject.payload.cells[0];
  assert(firstTableCell, 'table projection exposes a first editable cell');
  const editedTablePayload = updateTableCellText(
    tableProjection.structuredObject.payload,
    firstTableCell.cellId,
    'Power series',
  );
  assertEqual(editedTablePayload.cells[0]?.text, 'Power series', 'table cell text mutation preserves structured payload shape');
  const rowAddedTablePayload = addTableRowBelow(editedTablePayload, {
    rowId: firstTableCell.rowId,
  });
  assertEqual(rowAddedTablePayload.rows.length, 4, 'table row mutation adds one row');
  assertEqual(
    rowAddedTablePayload.cells.find((cell) => cell.cellId === firstTableCell.cellId)?.text,
    'Power series',
    'table row mutation preserves existing cell text',
  );
  const columnAddedTablePayload = addTableColumnRight(rowAddedTablePayload, {
    columnId: firstTableCell.columnId,
  });
  assertEqual(columnAddedTablePayload.columns.length, 4, 'table column mutation adds one column');
  assertEqual(columnAddedTablePayload.cells.length, 16, 'table column mutation keeps a complete cell matrix');
  const rowDeletedTablePayload = deleteTableRow(columnAddedTablePayload, {
    rowId: firstTableCell.rowId,
  });
  assertEqual(rowDeletedTablePayload.rows.length, 3, 'table row deletion removes one row');
  const columnDeletedTablePayload = deleteTableColumn(rowDeletedTablePayload, null);
  assertEqual(columnDeletedTablePayload.columns.length, 3, 'table column deletion removes one column');
  assertEqual(columnDeletedTablePayload.cells.length, 9, 'table deletion keeps cells aligned to rows and columns');

  const tableRuntime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement],
    genericCanvasObjects: [tableProjection.canvasObject],
    genericCanvasPlacements: [tableProjection.placement],
    genericStructuredObjects: [tableProjection.structuredObject],
  });
  assertEqual(tableRuntime.structuredObjects[0]?.structuredKind, 'table', 'runtime exposes persisted structured table records');
  const tableNode = flattenImageAiNodes(tableRuntime.canvasAIReadableSnapshot.nodes)
    .find((node) => node.id === tableProjection.canvasObject.objectId);
  assertEqual(tableNode?.kind, 'table', 'Canvas AI Tree includes table nodes');
  assertEqual(tableNode?.structuredRef?.schemaVersion, 'table.v1', 'Canvas AI Tree exposes table schema version');
  assertEqual(tableNode?.structuredRef?.rowCount, 3, 'Canvas AI Tree exposes table row count');
  assertEqual(tableNode?.structuredRef?.payload.cells.length, 9, 'Canvas AI Tree exposes table cell payload');

  const tablePayload = tableObjectSavePayload(
    tableProjection.canvasObject,
    tableProjection.placement,
    tableProjection.structuredObject,
    tableProjection.visualStyle,
  );
  assertEqual(tablePayload.kind, 'table', 'table save payload keeps kind=table');
  assertEqual(tablePayload.backing, 'structured_object', 'table save payload keeps backing=structured_object');
  assertEqual(tablePayload.object_class, 'structured', 'table save payload keeps object_class=structured');
  assertEqual((tablePayload.extension as Record<string, unknown>).structured_kind, 'table', 'table save payload writes structured kind');
  assertEqual((tablePayload.extension as Record<string, unknown>).schema_version, 'table.v1', 'table save payload writes schema version');
}

function testTableObjectMutationMath(): void {
  const projection = createTableObjectProjection({
    objectId: 'table-mutation-contract-1',
    canvasId: 'primary-note-canvas',
    layout: {
      x: 120,
      y: 160,
      width: 420,
      height: 220,
      surface: 'canvas_workspace',
    },
    zIndex: 1,
  });
  const base = projection.structuredObject.payload;
  const firstCell = base.cells[0];
  const secondColumnCell = base.cells.find((cell) => cell.rowId === firstCell?.rowId && cell.columnId !== firstCell.columnId);
  assert(firstCell && secondColumnCell, 'table mutation contract needs at least two cells');

  const withText = updateTableCellText(
    updateTableCellText(base, firstCell.cellId, 'keep first'),
    secondColumnCell.cellId,
    'keep second column',
  );
  const rowAdded = addTableRowBelow(withText, { rowId: firstCell.rowId });
  assertEqual(rowAdded.rows.length, base.rows.length + 1, 'add row below increases row count by one');
  const insertedRow = rowAdded.rows.find((row) => !base.rows.some((item) => item.rowId === row.rowId));
  assert(insertedRow, 'add row below creates a new stable row id');
  assert(
    rowAdded.cells
      .filter((cell) => cell.rowId === insertedRow.rowId)
      .every((cell) => cell.text === ''),
    'add row below fills the new row with empty cells',
  );

  const columnDeleted = deleteTableColumn(withText, { columnId: firstCell.columnId });
  assertEqual(columnDeleted.columns.length, base.columns.length - 1, 'delete column removes one column');
  assertEqual(
    columnDeleted.cells.find((cell) => cell.cellId === secondColumnCell.cellId)?.text,
    'keep second column',
    'delete column preserves text from remaining columns',
  );
  assert(
    columnDeleted.columns.every((column, index) => column.index === index),
    'delete column renumbers column indices continuously',
  );
  assert(
    columnDeleted.cells.every((cell) => cell.columnIndex >= 0 && cell.columnIndex < columnDeleted.columns.length),
    'delete column renumbers cell column indices inside the surviving range',
  );

  const updated = updateTableCellText(withText, secondColumnCell.cellId, 'only this cell changed');
  assertEqual(
    updated.cells.find((cell) => cell.cellId === secondColumnCell.cellId)?.text,
    'only this cell changed',
    'update cell changes the selected cell',
  );
  assertEqual(
    updated.cells.find((cell) => cell.cellId === firstCell.cellId)?.text,
    'keep first',
    'update cell does not mutate neighboring cells',
  );

  const oneByOne: TableStructuredPayload = {
    version: 'table.v1',
    rows: [{ rowId: 'one-row', index: 0 }],
    columns: [{ columnId: 'one-column', index: 0, label: 'A' }],
    cells: [{
      cellId: 'one-cell',
      rowId: 'one-row',
      columnId: 'one-column',
      rowIndex: 0,
      columnIndex: 0,
      text: 'floor',
      valueType: 'text',
    }],
  };
  assertJsonEqual(deleteTableRow(oneByOne, { rowId: 'one-row' }), oneByOne, 'delete row keeps 1x1 table floor');
  assertJsonEqual(deleteTableColumn(oneByOne, { columnId: 'one-column' }), oneByOne, 'delete column keeps 1x1 table floor');

  const jagged = normalizeTablePayload({
    version: 'table.v1',
    rows: [{ rowId: 'row-b', index: 3 }, { rowId: 'row-a', index: 1 }],
    columns: [{ columnId: 'col-b', index: 7 }, { columnId: 'col-a', index: 2 }],
    cells: [{
      cellId: 'duplicate-loser',
      rowId: 'row-a',
      columnId: 'col-a',
      rowIndex: 99,
      columnIndex: 99,
      text: 'old',
      valueType: 'text',
    }, {
      cellId: 'duplicate-winner',
      rowId: 'row-a',
      columnId: 'col-a',
      rowIndex: 99,
      columnIndex: 99,
      text: 'new',
      valueType: 'text',
    }],
  });
  assertEqual(jagged.rows[0]?.index, 0, 'normalize table payload reindexes rows from zero');
  assertEqual(jagged.columns[0]?.index, 0, 'normalize table payload reindexes columns from zero');
  assertEqual(jagged.cells.length, 4, 'normalize table payload fills jagged payload to a complete cell matrix');
  assertEqual(
    jagged.cells.find((cell) => cell.rowId === 'row-a' && cell.columnId === 'col-a')?.text,
    'new',
    'normalize table payload keeps the latest duplicate cell by row/column key',
  );
}

async function testStructuredMutationHistory(): Promise<void> {
  const projection = createTableObjectProjection({
    objectId: 'history-table-1',
    canvasId: 'primary-note-canvas',
    layout: {
      x: 10,
      y: 10,
      width: 320,
      height: 180,
      surface: 'canvas_workspace',
    },
    zIndex: 1,
  });
  const before = projection.structuredObject.payload;
  const after = deleteTableRow(before, { rowId: before.rows[0]!.rowId });
  const entry: RuntimeHistoryEntry = {
    type: 'structuredMutation',
    objectId: projection.canvasObject.objectId,
    before,
    after,
  };
  const persisted: Array<{ objectId: string; payload: TableStructuredPayload }> = [];
  let restoreCalls = 0;
  let trashCalls = 0;
  const handlers = {
    applyLayoutDrafts: () => undefined,
    persistLayoutSnapshot: () => undefined,
    persistStructuredObject: async (objectId: string, payload: TableStructuredPayload) => {
      persisted.push({ objectId, payload });
      return true;
    },
    restoreBlockForHistory: async () => {
      restoreCalls += 1;
      return null;
    },
    trashBlockForHistory: async () => {
      trashCalls += 1;
      return false;
    },
  };

  const undoRedoEntry = await applyRuntimeHistoryUndo(entry, handlers);
  assertEqual(undoRedoEntry?.type, 'structuredMutation', 'structured mutation undo returns the same history kind for redo');
  assertEqual(persisted[0]?.objectId, projection.canvasObject.objectId, 'structured mutation undo persists the target object id');
  assertJsonEqual(persisted[0]?.payload, before, 'structured mutation undo persists the before payload by value');
  assertEqual(restoreCalls, 0, 'structured mutation undo does not fall into restore-block history branch');
  assertEqual(trashCalls, 0, 'structured mutation undo does not fall into trash-block history branch');

  const redoUndoEntry = await applyRuntimeHistoryRedo(entry, handlers);
  assertEqual(redoUndoEntry?.type, 'structuredMutation', 'structured mutation redo returns the same history kind for undo');
  assertJsonEqual(persisted[1]?.payload, after, 'structured mutation redo persists the after payload by value');
  assertEqual(restoreCalls, 0, 'structured mutation redo does not fall into restore-block history branch');
  assertEqual(trashCalls, 0, 'structured mutation redo does not fall into trash-block history branch');
}

function testCanvasObjectPersistencePayloadNormalization(): void {
  const normalized = normalizeCanvasPersistencePayload({
    canvasObjects: [{
      object_id: 'shape-persisted-snake-1',
      canvas_id: 'note-canvas-snake',
      kind: 'shape',
      backing: 'none',
      object_class: 'pure',
      status: 'active',
      source_json: { source: 'shape_object' },
      metadata: { shape_type: 'rectangle' },
    }],
    canvasPlacements: [{
      placement_id: 'placement-shape-persisted-snake-1',
      object_id: 'shape-persisted-snake-1',
      canvas_id: 'note-canvas-snake',
      x: 128,
      y: 160,
      width: 220,
      height: 120,
      rotation: 0,
      surface: 'canvas_workspace',
      boundary_role: 'outside',
      z_index: 17,
      snap_state: 'free',
      visibility_state: 'normal',
      render_visibility: 'visible',
      metadata: {},
    }],
    contentMounts: [],
    visualConnectors: [{
      object_id: 'connector-persisted-snake-1',
      canvas_id: 'note-canvas-snake',
      start_kind: 'object',
      start_object_id: 'shape-persisted-snake-1',
      start_anchor: 'center',
      end_kind: 'point',
      end_x: 360,
      end_y: 240,
      line_style: 'straight',
      stroke: '#8aa4c2',
      stroke_width: 2,
      start_marker: 'none',
      end_marker: 'arrow',
      relation_kind: 'visual_only',
      metadata: { source: 'test' },
    }],
    structuredObjects: [{
      object_id: 'table-persisted-snake-1',
      canvas_id: 'note-canvas-snake',
      structured_kind: 'table',
      schema_version: 'table.v1',
      row_count: 1,
      column_count: 1,
      payload: {
        version: 'table.v1',
        rows: [{ row_id: 'row-0', index: 0 }],
        columns: [{ column_id: 'column-0', index: 0, label: 'A' }],
        cells: [{
          cell_id: 'cell-0-0',
          row_id: 'row-0',
          column_id: 'column-0',
          row_index: 0,
          column_index: 0,
          text: 'Power series',
          value_type: 'text',
        }],
      },
      metadata: {},
    }],
    pageFrameCollection: null,
    blockLayouts: [],
  });

  const object = normalized.canvasObjects[0];
  const placement = normalized.canvasPlacements[0];
  assertEqual(object?.objectId, 'shape-persisted-snake-1', 'CanvasObject payload normalizes object_id to objectId');
  assertEqual(object?.objectClass, 'pure', 'CanvasObject payload normalizes object_class to objectClass');
  assertEqual(object?.metadata?.shapeType, 'rectangle', 'shape metadata normalizes shape_type to shapeType');
  assertEqual(placement?.placementId, 'placement-shape-persisted-snake-1', 'CanvasPlacement payload normalizes placement_id');
  assertEqual(placement?.objectId, object?.objectId, 'CanvasPlacement payload normalizes object_id');
  assertEqual(placement?.boundaryRole, 'outside', 'CanvasPlacement payload normalizes boundary_role');
  assertEqual(placement?.zIndex, 17, 'CanvasPlacement payload normalizes z_index');
  const connector = normalized.visualConnectors[0];
  assertEqual(connector?.objectId, 'connector-persisted-snake-1', 'VisualConnector payload normalizes object_id');
  assertEqual(connector?.startKind, 'object', 'VisualConnector payload normalizes start_kind');
  assertEqual(connector?.startObjectId, 'shape-persisted-snake-1', 'VisualConnector payload normalizes start_object_id');
  assertEqual(connector?.end.x, 360, 'VisualConnector payload normalizes point endpoint coordinates');
  assertEqual(connector?.relationKind, 'visual_only', 'VisualConnector payload keeps visual-only semantics');
  const structured = normalized.structuredObjects[0];
  assertEqual(structured?.objectId, 'table-persisted-snake-1', 'StructuredObject payload normalizes object_id to objectId');
  assertEqual(structured?.structuredKind, 'table', 'StructuredObject payload normalizes structured_kind');
  assertEqual(structured?.schemaVersion, 'table.v1', 'StructuredObject payload normalizes schema_version');
  assertEqual(structured?.payload.cells[0]?.text, 'Power series', 'StructuredObject payload preserves table cell text');
}

function testGenericPersistenceExcludesSpecialPageAndBlockKinds(): void {
  const noteId = 'note-special-kind-filter';
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const pageBlock = createBlock('special-kind-page-block');
  const pagePlacement = buildRuntimeBlockPlacement({
    block: pageBlock,
    canvasId: noteId,
    layout: { x: 0, y: 0, width: 320, height: 88 },
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 3,
  });
  const persistedPageFrameObjectId = `canvas-object:${noteId}:page-frame:${pageFrame.id}`;
  const persistedPageBlockObjectId = `canvas-object:${noteId}:block-placement:${pagePlacement.placementId}`;
  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    pageFrames: [pageFrame],
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement],
    genericCanvasObjects: [{
      objectId: persistedPageFrameObjectId,
      canvasId: noteId,
      kind: 'page_frame',
      backing: 'none',
      objectClass: 'pure',
      status: 'active',
      source: 'entity',
    }, {
      objectId: persistedPageBlockObjectId,
      canvasId: noteId,
      kind: 'paragraph_block_projection',
      backing: 'note_block',
      objectClass: 'block_backed',
      status: 'active',
      source: 'entity',
    }],
    genericCanvasPlacements: [{
      placementId: `${persistedPageFrameObjectId}:placement`,
      objectId: persistedPageFrameObjectId,
      canvasId: noteId,
      frameId: pageFrame.id,
      x: pageFrame.x,
      y: pageFrame.y,
      width: pageFrame.width,
      height: pageFrame.height,
      rotation: 0,
      surface: 'formal_page',
      boundaryRole: 'inside',
      zIndex: 0,
    }, {
      placementId: `${persistedPageBlockObjectId}:placement`,
      objectId: persistedPageBlockObjectId,
      canvasId: noteId,
      frameId: pageFrame.id,
      x: pagePlacement.x,
      y: pagePlacement.y,
      width: pagePlacement.width,
      height: pagePlacement.height,
      rotation: 0,
      surface: 'formal_page',
      boundaryRole: 'inside',
      zIndex: 3,
    }],
    genericContentMounts: [{
      mountId: `${persistedPageBlockObjectId}:mount`,
      objectId: persistedPageBlockObjectId,
      targetKind: 'note_block',
      targetId: pageBlock.id,
      projectionMode: 'owned',
      syncPolicy: 'manual',
    }],
  });

  assertEqual(
    runtime.canvasObjects.filter((object) => object.kind === 'page_frame').length,
    1,
    'persisted generic page_frame records must not duplicate runtime PageFrame truth',
  );
  assertEqual(
    runtime.canvasObjects.filter((object) => object.kind === 'paragraph_block_projection').length,
    1,
    'persisted generic paragraph_block_projection records must not duplicate runtime block truth',
  );
  assertEqual(
    runtime.canvasAIReadableSnapshot.nodes.filter((node) => node.kind === 'page_frame').length,
    1,
    'AI tree keeps one PageFrame node when generic persistence echoes special kinds',
  );
  const flattenAiNodes = (nodes: CanvasAIReadableNode[]): CanvasAIReadableNode[] => (
    nodes.flatMap((node) => [node, ...flattenAiNodes(node.children || [])])
  );
  assertEqual(
    flattenAiNodes(runtime.canvasAIReadableSnapshot.nodes)
      .filter((node) => node.contentRef?.id === pageBlock.id).length,
    1,
    'AI tree keeps one block content node when generic persistence echoes paragraph projections',
  );
}

function testCanvasRuntimeKernelSeed(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const pageBlock = createBlock('page-8');
  const workspaceBlock = createBlock('workspace-9');
  const pagePlacement = buildRuntimeBlockPlacement({
    block: pageBlock,
    canvasId: 'kernel-canvas',
    layout: { x: 0, y: 0, width: 320, height: 88 },
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 3,
  });
  const workspacePlacement = buildRuntimeBlockPlacement({
    block: workspaceBlock,
    canvasId: 'kernel-canvas',
    layout: {
      x: DEFAULT_PAGE_CONTENT_WIDTH + 64,
      y: 140,
      width: 260,
      height: 90,
      export_role: 'scratch',
      surface: 'canvas_workspace',
    },
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 4,
  });
  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ x: 48, y: 32, width: 900, height: 640, zoom: 1.5 }),
    blockPlacements: [pagePlacement, workspacePlacement],
    canvasObjectReserve: [{
      id: 'shape-kernel-1',
      kind: 'shape',
      x: 620,
      y: 180,
      width: 120,
      height: 80,
    }],
  });

  const scene = buildCanvasSceneRuntime(runtime);
  assertEqual(scene.canvasId, 'kernel-canvas', 'scene runtime keeps canvas id from runtime model');
  assertEqual(scene.placementIndex.all.length, 4, 'scene index includes PageFrame, two blocks, and shape seed');
  assert(scene.placementIndex.byObjectId.has(pageFrame.id), 'scene index includes PageFrame placement');
  assert(scene.placementIndex.byObjectId.has(workspacePlacement.objectId), 'scene index includes workspace block placement');
  assert(scene.placementIndex.byObjectId.has('shape-kernel-1'), 'scene index includes shape placement');

  const shapeScreenPoint = worldPointToViewportPoint({ x: 650, y: 200 }, runtime.viewport);
  const hit = hitTestCanvasScene(scene, shapeScreenPoint);
  assertEqual(hit?.objectId, 'shape-kernel-1', 'hit test stays stable after pan/zoom through viewport-to-world transform');

  const selection = selectCanvasObjects(scene, ['shape-kernel-1', workspacePlacement.objectId, 'missing-object']);
  assertEqual(selection.selectedObjectIds.length, 2, 'selection ignores object ids not present in scene');
  assertEqual(selection.primaryObjectId, 'shape-kernel-1', 'selection keeps first valid object as primary');

  const moveCommand = createMoveCanvasObjectCommand({
    canvasId: scene.canvasId,
    objectId: workspacePlacement.objectId,
    actor: 'user',
    x: workspacePlacement.x + 24,
    y: workspacePlacement.y + 16,
  });
  const delta = createCanvasDeltaForCommand(scene, moveCommand);
  assertEqual(delta.commandId, moveCommand.commandId, 'command delta is keyed by command id');
  assertEqual(delta.updated?.[0]?.kind, 'canvas_placement', 'move command only updates placement records');
}

function testBlockProjectionV1Foundation(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const pageProjection = createParagraphBlockProjection({
    blockId: 'projection-page-1',
    canvasId: 'projection-canvas',
    text: 'Projected paragraph',
    layout: { x: 0, y: 24, width: 320, height: 88, surface: 'formal_page' },
    pageFrame,
    pageOffsetX: pageFrame.contentInset.left,
    zIndex: 5,
    orderIndex: 2,
    style: {
      fill: '#ffffff',
      stroke: '#38bdf8',
      borderRadius: 4,
    },
  });

  assertEqual(pageProjection.block.block_type, 'paragraph', 'paragraph block projection creates a paragraph block');
  assertEqual(pageProjection.block.order_index, 2, 'paragraph block projection preserves order index');
  assert(getTextFlowContent(pageProjection.block.content_json), 'paragraph block projection creates TextFlow content');
  assertEqual(
    projectNoteBlockTextFlow(pageProjection.block).plain_text,
    'Projected paragraph',
    'paragraph block projection keeps text in TextFlow content truth',
  );
  assertEqual(
    pageProjection.canvasObject.kind,
    'paragraph_block_projection',
    'paragraph block projection creates a paragraph CanvasObject',
  );
  assertEqual(pageProjection.canvasObject.backing, 'note_block', 'paragraph CanvasObject is note-block-backed');
  assertEqual(pageProjection.placement.frameId, pageFrame.id, 'PageFrame block projection is mounted inside the frame');
  assertEqual(pageProjection.contentMount.targetId, pageProjection.block.id, 'ContentMount points back to the note block');
  assertEqual(pageProjection.visualStyle?.objectId, pageProjection.canvasObject.objectId, 'VisualStyle attaches to CanvasObject only');

  const moved = moveBlockProjectionPlacement({
    placement: pageProjection.placement,
    x: pageProjection.placement.x + 64,
    y: pageProjection.placement.y + 32,
  });
  const resized = resizeBlockProjectionPlacement({
    placement: moved,
    width: 420,
    height: 120,
  });
  assertEqual(resized.x, pageProjection.placement.x + 64, 'move changes placement x');
  assertEqual(resized.width, 420, 'resize changes placement width');
  assertEqual(
    projectNoteBlockTextFlow(pageProjection.block).plain_text,
    'Projected paragraph',
    'move/resize does not mutate TextFlow content',
  );

  const restoredPageLayout = restoreBlockProjectionLayout({
    block: pageProjection.block,
    fallback: { x: 0, y: 0, width: 200, height: 60 },
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    surfaceMode: 'page',
    estimateHeight: () => 88,
  });
  assertEqual(restoredPageLayout.y, 24, 'refresh restores PageFrame block y from stored layout');

  const workspaceProjection = createParagraphBlockProjection({
    blockId: 'projection-workspace-2',
    canvasId: 'projection-canvas',
    text: 'Workspace paragraph',
    layout: {
      x: DEFAULT_PAGE_CONTENT_WIDTH + 120,
      y: 180,
      width: 260,
      height: 90,
      surface: 'canvas_workspace',
      export_role: 'scratch',
    },
    pageFrame,
    pageOffsetX: pageFrame.contentInset.left,
    zIndex: 6,
  });
  assertEqual(workspaceProjection.placement.surface, 'canvas_workspace', 'workspace projection stays on workspace surface');
  assertEqual(workspaceProjection.placement.frameId, undefined, 'workspace projection is not mounted into PageFrame');
  const restoredWorkspaceLayout = restoreBlockProjectionLayout({
    block: workspaceProjection.block,
    fallback: { x: 0, y: 0, width: 200, height: 60 },
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    surfaceMode: 'canvas',
    estimateHeight: () => 90,
  });
  assertEqual(
    restoredWorkspaceLayout.x,
    DEFAULT_PAGE_CONTENT_WIDTH + 120,
    'refresh restores workspace block x from stored layout',
  );
}

function testShapeAndVisualConnectorFoundation(): void {
  const pureShape = createPureShapeProjection({
    objectId: 'shape-object-1',
    canvasId: 'shape-canvas',
    layout: {
      x: DEFAULT_PAGE_CONTENT_WIDTH + 240,
      y: 120,
      width: 180,
      height: 96,
      rotation: 8,
      surface: 'canvas_workspace',
    },
    zIndex: 8,
    style: {
      fill: '#0f172a',
      stroke: '#38bdf8',
      strokeWidth: 2,
      borderRadius: 6,
    },
  });

  assertEqual(pureShape.canvasObject.kind, 'shape', 'pure shape creates a shape CanvasObject');
  assertEqual(pureShape.canvasObject.backing, 'none', 'pure shape does not create a NoteBlock backing');
  assertEqual(pureShape.canvasObject.objectClass, 'pure', 'pure shape remains pure object class');
  assertEqual(pureShape.contentMount, null, 'pure shape has no ContentMount');
  assertEqual(pureShape.placement.rotation, 8, 'pure shape placement preserves rotation');
  assertEqual(pureShape.visualStyle?.objectId, pureShape.canvasObject.objectId, 'pure shape style attaches to CanvasObject');

  const filledShape = fillShapeWithParagraphBlock({
    shape: pureShape,
    blockId: 'shape-text-block-1',
    text: 'Shape text lives in TextFlow',
    orderIndex: 4,
  });

  assertEqual(filledShape.canvasObject.kind, 'shape', 'block-backed shape keeps shape kind');
  assertEqual(filledShape.canvasObject.backing, 'note_block', 'filled shape becomes note-block-backed');
  assertEqual(filledShape.canvasObject.objectClass, 'block_backed', 'filled shape becomes block-backed object class');
  assertEqual(filledShape.contentMount?.targetId, filledShape.block?.id, 'filled shape ContentMount points to paragraph block');
  assert(getTextFlowContent(filledShape.block?.content_json || {}), 'filled shape creates TextFlow content');
  assertEqual(
    projectNoteBlockTextFlow(filledShape.block!).plain_text,
    'Shape text lives in TextFlow',
    'filled shape text is stored in TextFlow content truth',
  );
  assert(
    isCanvasObjectBackingBlock(filledShape.block),
    'filled shape backing block is classified as canvas-object backing content',
  );
  const visibleBlocksAfterBackingFilter = getVisibleBlocksForSurface(
    [filledShape.block],
    createSurfaceModePolicy('canvas'),
    DEFAULT_PAGE_CONTENT_WIDTH,
  );
  assertEqual(
    visibleBlocksAfterBackingFilter.length,
    0,
    'shape backing paragraph block is hidden from ordinary block rendering',
  );
  const blockBackedRuntime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: null,
    viewport: createViewport(),
    blockPlacements: [],
    genericCanvasObjects: [filledShape.canvasObject],
    genericCanvasPlacements: [filledShape.placement],
    genericContentMounts: [filledShape.contentMount],
    textByContentTargetId: buildTextByContentTargetId([filledShape.block]),
  });
  const blockBackedShapeNode = blockBackedRuntime.canvasAIReadableSnapshot.nodes
    .find((node) => node.id === filledShape.canvasObject.objectId);
  assert(blockBackedShapeNode, 'block-backed shape appears in runtime AI tree');
  assertEqual(
    blockBackedShapeNode.contentRef?.id,
    filledShape.block.id,
    'block-backed shape AI node keeps ContentMount target id',
  );
  assertEqual(
    blockBackedShapeNode.text,
    'Shape text lives in TextFlow',
    'block-backed shape AI node reads text from backing paragraph block',
  );
  const stickyShapeObject = {
    ...filledShape.canvasObject,
    metadata: ensureStickyStyleForBlockBackedShape({
      ...(filledShape.canvasObject.metadata || {}),
      shape_type: 'rectangle',
    }),
  };
  assert(isStickyNoteCanvasObject(stickyShapeObject), 'sticky note is a styled block-backed shape, not a new kind');
  const stickyRuntime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: null,
    viewport: createViewport(),
    blockPlacements: [],
    genericCanvasObjects: [stickyShapeObject],
    genericCanvasPlacements: [filledShape.placement],
    genericContentMounts: [filledShape.contentMount],
    textByContentTargetId: buildTextByContentTargetId([filledShape.block]),
  });
  const stickyNode = stickyRuntime.canvasAIReadableSnapshot.nodes
    .find((node) => node.id === stickyShapeObject.objectId);
  assert(stickyNode, 'sticky note appears as a normal CanvasObject in the AI tree');
  assertEqual(stickyNode.kind, 'shape', 'sticky note keeps shape kind');
  assertEqual(stickyNode.presentationRef?.presetId, STICKY_NOTE_STYLE_PRESET_ID, 'sticky note AI node exposes style preset');
  assertEqual(stickyNode.contentRef?.id, filledShape.block.id, 'sticky note AI node remains backed by paragraph block');
  assertEqual(stickyNode.text, 'Shape text lives in TextFlow', 'sticky note AI node reads TextFlow truth');
  assertEqual(filledShape.placement.objectId, pureShape.placement.objectId, 'filled shape keeps the same CanvasObject identity');
  assertEqual(filledShape.placement.x, pureShape.placement.x, 'filled shape keeps placement');

  const demotedShape = clearBlockBackedShapeText(filledShape);
  assertEqual(demotedShape.canvasObject.kind, 'shape', 'demoted shape keeps shape kind');
  assertEqual(demotedShape.canvasObject.backing, 'none', 'clearing text removes NoteBlock backing');
  assertEqual(demotedShape.canvasObject.objectClass, 'pure', 'clearing text demotes shape back to pure');
  assertEqual(demotedShape.contentMount, null, 'clearing text removes ContentMount');
  assertEqual(demotedShape.deletedBlockId, 'shape-text-block-1', 'clearing text reports the block to delete');
  assertEqual(demotedShape.placement.x, pureShape.placement.x, 'demoted shape keeps placement');

  const connector = createVisualConnectorProjection({
    connectorId: 'connector-1',
    canvasId: 'shape-canvas',
    start: { x: pureShape.placement.x, y: pureShape.placement.y },
    end: { x: pureShape.placement.x + 240, y: pureShape.placement.y + 80 },
    startObjectId: pureShape.canvasObject.objectId,
    endObjectId: filledShape.canvasObject.objectId,
    zIndex: 12,
    style: {
      stroke: '#94a3b8',
      strokeWidth: 1.5,
    },
  });

  assertEqual(connector.canvasObject.kind, 'visual_connector', 'visual connector creates connector CanvasObject');
  assertEqual(connector.canvasObject.backing, 'none', 'visual connector has no content backing');
  assertEqual(connector.visualConnector.relationKind, 'visual_only', 'visual connector never creates KnowledgeRelation semantics');
  assertEqual(connector.contentMount, null, 'visual connector has no ContentMount');
  assertEqual(connector.placement.width, 240, 'visual connector placement covers connector bbox width');
  assertEqual(connector.visualStyle?.objectId, connector.canvasObject.objectId, 'connector style attaches to CanvasObject');
}

function testCanvasObjectInspectorAndSafeActions(): void {
  const pureShape = createPureShapeProjection({
    objectId: 'inspector-shape-1',
    canvasId: 'inspector-canvas',
    layout: {
      x: 120,
      y: 80,
      width: 160,
      height: 90,
      rotation: 0,
      surface: 'canvas_workspace',
    },
    zIndex: 4,
  });
  const pureShapeModel = createCanvasObjectInspectorModel({
    canvasObject: pureShape.canvasObject,
    placement: pureShape.placement,
  });
  assert(pureShapeModel, 'pure shape creates an inspector model');
  assertEqual(pureShapeModel.title, 'Shape', 'pure shape inspector uses object role label');
  assertEqual(
    pureShapeModel.actions.find((action) => action.actionId === 'duplicate_canvas_object')?.enabled,
    true,
    'pure shape can be safely duplicated',
  );
  assertEqual(
    pureShapeModel.actions.find((action) => action.actionId === 'open_original')?.enabled,
    false,
    'pure shape has no original block to open',
  );

  const duplicatedShape = createCanvasObjectDuplicateDraft({
    canvasObject: pureShape.canvasObject,
    placement: pureShape.placement,
    nextObjectId: 'inspector-shape-copy',
  });
  assert(duplicatedShape, 'pure shape duplicate draft is created');
  assertEqual(duplicatedShape.canvasObject.objectId, 'inspector-shape-copy', 'shape duplicate gets a new object id');
  assertEqual(duplicatedShape.placement.x, pureShape.placement.x + 32, 'shape duplicate is offset on x');
  assertEqual(duplicatedShape.placement.y, pureShape.placement.y + 32, 'shape duplicate is offset on y');

  const filledShape = fillShapeWithParagraphBlock({
    shape: pureShape,
    blockId: 'inspector-shape-block',
    text: 'Block-backed object should not duplicate implicitly.',
    orderIndex: 1,
  });
  const filledShapeActions = createCanvasObjectInspectorActions({
    canvasObject: filledShape.canvasObject,
    placement: filledShape.placement,
    contentMount: filledShape.contentMount,
  });
  assertEqual(
    filledShapeActions.find((action) => action.actionId === 'open_original')?.enabled,
    true,
    'block-backed shape exposes open original',
  );
  assertEqual(
    filledShapeActions.find((action) => action.actionId === 'duplicate_canvas_object')?.enabled,
    false,
    'block-backed shape duplicate is disabled until copy semantics are explicit',
  );

  const exportHidden = toggleCanvasPlacementExportVisibility(pureShape.placement);
  assertEqual(exportHidden.visibilityState, 'export_hidden', 'export visibility toggle hides object from export');
  assertEqual(
    toggleCanvasPlacementExportVisibility(exportHidden).visibilityState,
    'normal',
    'export visibility toggle restores normal visibility',
  );

  const imageProjection = createImageObjectProjection({
    objectId: 'inspector-image-1',
    canvasId: 'inspector-canvas',
    asset: {
      assetId: 'asset-image-1',
      kind: 'image',
      filename: 'figure.png',
      mimeType: 'image/png',
      byteSize: 128,
      width: 320,
      height: 180,
      blobUrl: '/assets/figure.png',
    },
    layout: { x: 220, y: 140, width: 320, height: 180, surface: 'canvas_workspace' },
    zIndex: 5,
    caption: 'Figure one',
  });
  const duplicatedImage = createCanvasObjectDuplicateDraft({
    canvasObject: imageProjection.canvasObject,
    placement: imageProjection.placement,
    imageObject: imageProjection.imageObject,
    nextObjectId: 'inspector-image-copy',
  });
  assert(duplicatedImage?.imageObject, 'image duplicate draft carries image extension');
  assertEqual(duplicatedImage.canvasObject.objectId, 'inspector-image-copy', 'image duplicate gets a new CanvasObject identity');
  assertEqual(duplicatedImage.imageObject.objectId, 'inspector-image-copy', 'image duplicate extension follows the new CanvasObject identity');
  assertEqual(duplicatedImage.imageObject.assetId, imageProjection.imageObject.assetId, 'image duplicate reuses the same asset');
  assertEqual(duplicatedImage.imageObject.caption, 'Figure one', 'image duplicate preserves caption');

  const tableProjection = createTableObjectProjection({
    objectId: 'inspector-table-1',
    canvasId: 'inspector-canvas',
    layout: { x: 260, y: 220, width: 360, height: 180, surface: 'canvas_workspace' },
    zIndex: 6,
    rowCount: 2,
    columnCount: 2,
  });
  const tablePayload = updateTableCellText(
    tableProjection.structuredObject.payload,
    tableProjection.structuredObject.payload.cells[0]!.cellId,
    'Power series',
  );
  const duplicatedTable = createCanvasObjectDuplicateDraft({
    canvasObject: tableProjection.canvasObject,
    placement: tableProjection.placement,
    structuredObject: {
      ...tableProjection.structuredObject,
      payload: tablePayload,
    },
    nextObjectId: 'inspector-table-copy',
  });
  assert(duplicatedTable?.structuredObject, 'table duplicate draft carries structured extension');
  assert(
    duplicatedTable.structuredObject.payload.rows.every((row) => row.rowId.startsWith('inspector-table-copy')),
    'table duplicate regenerates row ids for the new object',
  );
  assert(
    duplicatedTable.structuredObject.payload.cells.every((cell) => cell.cellId.startsWith('inspector-table-copy')),
    'table duplicate regenerates cell ids for the new object',
  );
  assertEqual(
    duplicatedTable.structuredObject.payload.cells[0]?.text,
    'Power series',
    'table duplicate preserves cell text',
  );
}

function testCanvasCommandDispatcherFoundation(): void {
  const canvasId = 'command-canvas';
  const baseModel = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: null,
    viewport: createViewport(),
    blockPlacements: [],
  });
  const shape = createPureShapeProjection({
    objectId: 'command-shape-1',
    canvasId,
    layout: { x: 120, y: 80, width: 160, height: 96, surface: 'canvas_workspace' },
    zIndex: 3,
    style: { fill: '#111827', stroke: '#38bdf8' },
  });

  const createShapeResult = applyCanvasCommandToRuntime(
    buildCanvasSceneRuntime(baseModel),
    createCanvasObjectCommand({
      canvasId,
      actor: 'user',
      canvasObject: shape.canvasObject,
      placement: shape.placement,
      visualStyle: shape.visualStyle,
    }),
  );
  assert(createShapeResult.model.canvasObjects.some((object) => object.objectId === shape.canvasObject.objectId), 'create command adds CanvasObject');
  assert(createShapeResult.model.canvasPlacements.some((placement) => placement.objectId === shape.canvasObject.objectId), 'create command adds placement');
  assert(createShapeResult.delta.created?.some((item) => item.kind === 'canvas_object' && item.id === shape.canvasObject.objectId), 'create command reports created CanvasObject');

  const moveCommand = createMoveCanvasObjectCommand({
    canvasId,
    objectId: shape.canvasObject.objectId,
    actor: 'user',
    x: 260,
    y: 180,
  });
  const moveResult = applyCanvasCommandToRuntime(buildCanvasSceneRuntime(createShapeResult.model), moveCommand);
  const movedPlacement = moveResult.model.canvasPlacements.find((placement) => placement.objectId === shape.canvasObject.objectId);
  assertEqual(movedPlacement?.x, 260, 'move command updates placement x');
  assertEqual(movedPlacement?.y, 180, 'move command updates placement y');
  assert(moveResult.delta.updated?.some((item) => item.kind === 'canvas_placement'), 'move command reports placement delta');

  const resizeResult = applyCanvasCommandToRuntime(
    buildCanvasSceneRuntime(moveResult.model),
    createResizeCanvasObjectCommand({
      canvasId,
      objectId: shape.canvasObject.objectId,
      actor: 'user',
      width: 240,
      height: 128,
    }),
  );
  const resizedPlacement = resizeResult.model.canvasPlacements.find((placement) => placement.objectId === shape.canvasObject.objectId);
  assertEqual(resizedPlacement?.width, 240, 'resize command updates placement width');
  assertEqual(resizedPlacement?.height, 128, 'resize command updates placement height');

  const styleResult = applyCanvasCommandToRuntime(
    buildCanvasSceneRuntime(resizeResult.model),
    createUpdateVisualStyleCommand({
      canvasId,
      objectId: shape.canvasObject.objectId,
      actor: 'user',
      style: { fill: '#f8fafc', strokeWidth: 3 },
    }),
  );
  const updatedStyle = styleResult.model.visualStyles.find((style) => style.objectId === shape.canvasObject.objectId);
  assertEqual(updatedStyle?.fill, '#f8fafc', 'style command updates VisualStyle fill');
  assertEqual(updatedStyle?.strokeWidth, 3, 'style command updates VisualStyle stroke width');

  const connector = createVisualConnectorProjection({
    connectorId: 'command-connector-1',
    canvasId,
    start: { x: 260, y: 180 },
    end: { x: 420, y: 240 },
    startObjectId: shape.canvasObject.objectId,
    zIndex: 12,
    style: { stroke: '#94a3b8' },
  });
  const createConnectorResult = applyCanvasCommandToRuntime(
    buildCanvasSceneRuntime(styleResult.model),
    createCanvasObjectCommand({
      canvasId,
      actor: 'user',
      canvasObject: connector.canvasObject,
      placement: connector.placement,
      visualStyle: connector.visualStyle,
      visualConnector: connector.visualConnector,
    }),
  );
  assert(
    createConnectorResult.model.visualConnectors.some((item) => item.relationKind === 'visual_only'),
    'create connector command keeps visual_only relation kind',
  );
  assertEqual(createConnectorResult.model.contentMounts.length, 0, 'visual connector create command does not create ContentMount');
  const deleteConnectorEndpointResult = applyCanvasCommandToRuntime(
    buildCanvasSceneRuntime(createConnectorResult.model),
    createDeleteCanvasObjectCommand({
      canvasId,
      objectId: shape.canvasObject.objectId,
      actor: 'user',
    }),
  );
  assertEqual(
    deleteConnectorEndpointResult.model.visualConnectors.some((item) => item.objectId === connector.canvasObject.objectId),
    false,
    'delete command removes connector record when its endpoint object is deleted',
  );
  assertEqual(
    deleteConnectorEndpointResult.model.canvasObjects.some((item) => item.objectId === connector.canvasObject.objectId),
    false,
    'delete command removes connector CanvasObject when its endpoint object is deleted',
  );

  const deleteConnectorResult = applyCanvasCommandToRuntime(
    buildCanvasSceneRuntime(createConnectorResult.model),
    createDeleteCanvasObjectCommand({
      canvasId,
      objectId: connector.canvasObject.objectId,
      actor: 'user',
    }),
  );
  assertEqual(
    deleteConnectorResult.model.visualConnectors.some((item) => item.objectId === connector.canvasObject.objectId),
    false,
    'delete command removes connector record for deleted connector object',
  );
  assert(deleteConnectorResult.delta.deleted?.some((item) => item.kind === 'visual_connector'), 'delete command reports deleted visual connector');
}

function testCanvasAIReadableTreeFoundation(): void {
  const canvasId = 'ai-tree-canvas';
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const blockProjection = createParagraphBlockProjection({
    blockId: 'ai-tree-block-1',
    canvasId,
    text: 'Readable paragraph for AI tree',
    layout: { x: 0, y: 48, width: 360, height: 96, surface: 'formal_page' },
    pageFrame,
    pageOffsetX: pageFrame.contentInset.left,
    zIndex: 4,
  });
  const baseModel = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport(),
    blockPlacements: [blockProjection.placement],
  });
  const shape = createPureShapeProjection({
    objectId: 'ai-tree-shape-1',
    canvasId,
    layout: { x: DEFAULT_PAGE_CONTENT_WIDTH + 180, y: 96, width: 160, height: 100, surface: 'canvas_workspace' },
    zIndex: 8,
  });
  const connector = createVisualConnectorProjection({
    connectorId: 'ai-tree-connector-1',
    canvasId,
    start: { x: shape.placement.x, y: shape.placement.y },
    end: { x: shape.placement.x + 220, y: shape.placement.y + 40 },
    startObjectId: shape.canvasObject.objectId,
    endObjectId: blockProjection.canvasObject.objectId,
    zIndex: 12,
  });

  const snapshot = createCanvasAIReadableSnapshot({
    canvasId,
    objects: [
      ...baseModel.canvasObjects,
      shape.canvasObject,
      connector.canvasObject,
    ],
    placements: [
      ...baseModel.canvasPlacements,
      shape.placement,
      connector.placement,
    ],
    mounts: baseModel.contentMounts,
    pageFrameExtensions: baseModel.pageFrameExtensions,
    primaryPageFrameId: pageFrame.id,
    visualConnectors: [connector.visualConnector],
    selectedObjectIds: [shape.canvasObject.objectId, connector.canvasObject.objectId],
    textByContentTargetId: {
      [blockProjection.block.id]: 'Readable paragraph for AI tree',
    },
  });

  const frameNode = snapshot.nodes.find((node) => node.kind === 'page_frame');
  assert(frameNode, 'AI tree contains PageFrame container node');
  assert(frameNode.contentBbox, 'AI tree PageFrame node exposes content bbox through direct service input');
  assertEqual(frameNode.pageFrameRef?.primary, true, 'AI tree PageFrame node exposes primary flag through direct service input');
  const blockNode = frameNode.children?.find((node) => node.id === blockProjection.canvasObject.objectId);
  assert(blockNode, 'AI tree nests PageFrame block under frame node');
  assertEqual(blockNode.text, 'Readable paragraph for AI tree', 'AI tree exposes block-backed text');
  assertEqual(blockNode.readingOrder, 0, 'AI tree assigns PageFrame reading order');
  assertEqual(blockNode.contentRef?.id, blockProjection.block.id, 'AI tree preserves block contentRef');

  const shapeNode = snapshot.nodes.find((node) => node.id === shape.canvasObject.objectId);
  assert(shapeNode, 'AI tree keeps workspace shape as top-level node');
  assertEqual(shapeNode.selected, true, 'AI tree marks selected workspace shape');
  assertEqual(shapeNode.frameId, undefined, 'workspace shape has no PageFrame id');

  const connectorNode = snapshot.nodes.find((node) => node.id === connector.canvasObject.objectId);
  assert(connectorNode, 'AI tree includes visual connector node');
  assertEqual(connectorNode.kind, 'visual_connector', 'AI tree keeps connector kind');
  assertEqual(connectorNode.selected, true, 'AI tree marks selected connector');
  assertEqual(connectorNode.connectorRef?.relationKind, 'visual_only', 'AI tree exposes visual-only connector semantics');
  assertEqual(connectorNode.connectorRef?.endObjectId, blockProjection.canvasObject.objectId, 'AI tree exposes connector endpoint');
  assertEqual(connectorNode.bbox.width, connector.placement.width, 'AI tree connector bbox follows placement');
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

function testSelectionTypographyToolbarPlacement(): void {
  const toolbarNearTop = placeSelectionToolbar({
    anchorRect: {
      left: 180,
      right: 320,
      top: 42,
      bottom: 62,
    } as DOMRect,
    toolbarWidth: 520,
    toolbarHeight: 44,
  });
  assert(toolbarNearTop.y >= 36, 'selection typography toolbar near viewport top opens below or inside safe viewport');
  assert(toolbarNearTop.x >= 12, 'selection typography toolbar x is clamped inside viewport');
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
  assertEqual(staleInterpretationContentGroup.identity.type, 'definition', 'stale ContentGroup interpretation role normalizes into identity type');
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
    type: 'definition',
    topic: 'Power Series',
    summary: 'A proposed identity for review.',
  });
  assertEqual(draftIdentityGroup.identity.status, 'draft', 'ContentGroup identity can be drafted');
  assertEqual(draftIdentityGroup.identity.type, 'definition', 'ContentGroup identity stores type');
  assertEqual(draftIdentityGroup.identity.role, 'definition', 'ContentGroup identity mirrors type into transitional role');
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
      { id: 'member-a', kind: 'block', target_id: 'block-a', current_content: 'A', preview_text: 'A', order_index: 0 },
      { id: 'member-b', kind: 'block', target_id: 'block-b', current_content: 'B', preview_text: 'B', order_index: 1 },
    ],
  });
  const afterHardDelete = removeContentGroupMember(cascadeGroup, 'member-a');
  assertEqual(afterHardDelete.members.length, 1, 'member hard delete removes only the selected member');
  assertEqual(afterHardDelete.members[0].id, 'member-b', 'member hard delete preserves the remaining member');
  assertEqual(afterHardDelete.members[0].order_index, 0, 'member hard delete reindexes remaining members');
  const restoredContentGroup = addMembersToContentGroup(trimmedContentGroup, [rangeMember]);
  assertEqual(restoredContentGroup.members.length, 2, 'ContentGroup can add a member back');
  assertEqual(normalizeContentGroup(restoredContentGroup).members.length, 2, 'ContentGroup normalization preserves members');
  const refreshedContentGroup = refreshContentGroupPreviews(restoredContentGroup, {
    resolveAnnotationPreview: () => 'annotation source preview',
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'range source preview',
  });
  assert(refreshedContentGroup.members.every((member) => member.metadata?.integrity_status === 'valid'), 'ContentGroup preview refresh resolves all members');
  const auditedContentGroup = auditContentGroupIntegrity(refreshedContentGroup, {
    resolveAnnotationPreview: () => null,
    resolveBlockPreview: () => null,
    resolveRangePreview: () => 'range source preview',
  });
  assertEqual(auditedContentGroup.issues.length, 1, 'ContentGroup integrity audit reports a broken member reference once');
  assertEqual(auditedContentGroup.issues[0].status, 'orphaned', 'ContentGroup integrity audit classifies missing source');
  assertEqual(softDeleteContentGroup(restoredContentGroup).status, 'deleted', 'ContentGroup can soft delete');

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

  const acceptedWithStaleMember = acceptContentGroupIdentity(updateContentGroupIdentityDraft({
    group: {
      ...group,
      members: [markContentGroupMemberIntegrity(group.members[0], 'orphaned', 'range removed')],
    },
    type: 'definition',
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

function testPurposeFrameContract(): void {
  assertEqual(normalizeGalleryMode('role'), 'type', 'legacy role Gallery mode maps to type view');
  assertEqual(normalizeGalleryMode('topic'), 'topic', 'Gallery topic mode remains stable');
  assertEqual(normalizeGalleryMode(null), 'folder', 'Gallery unknown mode falls back to folder view');

  const group = updateContentGroupIdentityDraft({
    group: createContentGroup({
      projectId: 'project-purpose',
      noteId: 'note-purpose',
      canvasId: 'canvas-purpose',
      title: 'Purpose group',
      members: [],
    }),
    type: 'definition',
    topic: 'Power Series',
  });
  const purposes = normalizePurposeFrames([{
    id: 'purpose-contract-default',
    project_id: 'project-purpose',
    course_id: 'project-purpose',
    note_id: 'note-purpose',
    title: 'Default purpose',
    status: 'active',
    is_note_default: true,
    created_by: 'human',
    members: [],
    metadata: {},
    created_at: '2026-07-05T00:00:00.000Z',
    updated_at: '2026-07-05T00:00:00.000Z',
  }]);
  const rolePurposes = upsertDefaultPurposeRoleForContentGroup({
    purposes,
    groupId: group.id,
    role: 'exam_review',
  });

  assertEqual(group.identity.type, 'definition', 'ContentGroup identity type stays on group identity');
  assertEqual(purposeRoleForContentGroup(rolePurposes, group.id), 'exam_review', 'purpose role lives on Purpose member edge');
  assertEqual(
    projectContentGroupsForReading({
      contentGroups: [group],
      purposes: rolePurposes,
    }).draft_knowledge_candidates[0]?.role,
    'exam_review',
    'AI-readable ContentGroup projection reads role from Purpose edge',
  );

  const itemPurpose = normalizePurposeFrames([{
    ...purposes[0],
    members: [{
      id: 'purpose-contract-item-edge',
      purpose_id: purposes[0]!.id,
      member_kind: 'item',
      member_id: 'item-purpose-contract',
      role: 'direct_evidence',
      fitness: 'high',
      order_index: 0,
      metadata: {},
      created_at: '2026-07-13T00:00:00.000Z',
      updated_at: '2026-07-13T00:00:00.000Z',
    }],
  }]);
  assertEqual(
    itemPurpose[0]?.members[0]?.member_kind,
    'item',
    'Purpose client normalizer preserves Item membership kind',
  );

  const withSecondItem = upsertPurposeItemMember({
    purpose: itemPurpose[0]!,
    itemId: 'item-purpose-contract-2',
    role: 'exam_example',
    fitness: 'medium',
  });
  const updatedFirstItem = upsertPurposeItemMember({
    purpose: withSecondItem,
    itemId: 'item-purpose-contract',
    role: 'core_definition',
    fitness: 'essential',
  });
  assertEqual(updatedFirstItem.members.length, 2, 'Purpose Item upsert does not duplicate existing Item edges');
  assertEqual(updatedFirstItem.members[0]?.role, 'core_definition', 'Purpose Item role updates on the direct edge');
  assertEqual(updatedFirstItem.members[0]?.fitness, 'essential', 'Purpose Item fitness updates on the direct edge');

  const moved = movePurposeMember({
    purpose: updatedFirstItem,
    memberId: 'item-purpose-contract-2',
    direction: 'up',
  });
  assertEqual(moved.members[0]?.member_id, 'item-purpose-contract-2', 'Purpose member reorder updates edge order');
  assertEqual(moved.members[0]?.order_index, 0, 'Purpose member reorder normalizes first order index');
  assertEqual(moved.members[1]?.order_index, 1, 'Purpose member reorder normalizes second order index');

  const removed = removePurposeItemMember({
    purpose: moved,
    itemId: 'item-purpose-contract',
  });
  assertEqual(removed.members.length, 1, 'Purpose Item removal deletes only the selected direct edge');
  assertEqual(removed.members[0]?.member_id, 'item-purpose-contract-2', 'Purpose Item removal preserves other members');

  const compiled = normalizePurposeCompiledScope({
    purpose_id: purposes[0]!.id,
    note_id: 'note-purpose',
    project_id: 'project-purpose',
    items: [{
      item: {
        id: 'item-purpose-contract',
        body_json: { type: 'text', text: 'Compiled Item' },
        plain_text: 'Compiled Item',
        item_type: 'definition',
        topic: 'Power Series',
        status: 'active',
        retired_into_item_id: null,
        origin_course_id: 'project-purpose',
        origin_note_id: 'note-purpose',
        created_by: 'human',
        metadata: {},
        created_at: '2026-07-13T00:00:00.000Z',
        updated_at: '2026-07-13T00:00:00.000Z',
      },
      direct: true,
      derived: true,
      membership_kind: 'direct',
      paths: [{
        kind: 'direct',
        purpose_member_id: 'purpose-contract-item-edge',
        role: 'core_definition',
        fitness: 'essential',
        order_index: 0,
        content_group_id: null,
        content_group_title: null,
        content_group_member_id: null,
        content_group_order_index: null,
      }],
    }, {
      item: {
        id: 'item-purpose-retired',
        body_json: {},
        plain_text: 'Retired Item',
        item_type: null,
        topic: null,
        status: 'retired',
        retired_into_item_id: null,
        origin_course_id: null,
        origin_note_id: null,
        created_by: 'human',
        metadata: {},
        created_at: '2026-07-13T00:00:00.000Z',
        updated_at: '2026-07-13T00:00:00.000Z',
      },
      direct: true,
      derived: false,
      membership_kind: 'direct',
      paths: [],
    }],
    total: 2,
  });
  assertEqual(compiled.items.length, 1, 'Purpose compiled client scope excludes retired Items defensively');
  assertEqual(
    compiled.items[0]?.membership_kind,
    'direct_and_derived',
    'Purpose compiled membership kind follows direct and derived path facts',
  );
}

function testRelationTruthContract(): void {
  const definitions = normalizeRelationTypeDefinitions([
    { id: 'supports', directionality: 'directed' },
    { id: 'equivalent_to', directionality: 'undirected' },
    { id: 'supports', directionality: 'undirected' },
    { id: 'custom_relation', directionality: 'directed' },
  ]);
  assertJsonEqual(definitions, [
    { id: 'supports', directionality: 'directed' },
    { id: 'equivalent_to', directionality: 'undirected' },
  ], 'Relation type registry keeps server-owned seed definitions and removes duplicates');

  const payload = {
    id: 'relation-a',
    user_id: 'user-a',
    from_item_id: 'item-a',
    to_item_id: 'item-b',
    relation_type: 'equivalent_to',
    directionality: 'undirected',
    from_snapshot_id: 'snapshot-a',
    to_snapshot_id: 'snapshot-b',
    note: 'Same structure under this purpose.',
    created_by: 'human',
    origin_purpose_id: 'purpose-a',
    status: 'revoked',
    created_at: '2026-07-13T01:00:00.000Z',
    updated_at: '2026-07-13T02:00:00.000Z',
    affirmed_at: '2026-07-13T01:30:00.000Z',
    from_snapshot: {
      id: 'snapshot-a',
      item_id: 'item-a',
      user_id: 'user-a',
      content: 'First judgment receipt',
      content_hash: 'hash-a',
      created_at: '2026-07-13T01:00:00.000Z',
    },
    to_snapshot: {
      id: 'snapshot-b',
      item_id: 'item-b',
      user_id: 'user-a',
      content: 'Second judgment receipt',
      content_hash: 'hash-b',
      created_at: '2026-07-13T01:00:00.000Z',
    },
    from_item: {
      id: 'item-a',
      plain_text: 'Current first Item',
      item_type: 'definition',
      topic: 'Power series',
      status: 'active',
      retired_into_item_id: null,
      updated_at: '2026-07-13T02:00:00.000Z',
    },
    to_item: {
      id: 'item-b',
      plain_text: 'Current second Item',
      item_type: null,
      topic: null,
      status: 'retired',
      retired_into_item_id: 'item-c',
      updated_at: '2026-07-13T02:00:00.000Z',
    },
  };
  const relation = normalizeRelation(payload);
  assert(relation, 'Relation normalizer accepts a complete truth payload');
  assertEqual(relation.directionality, 'undirected', 'Relation normalizer preserves server directionality');
  assertEqual(relation.status, 'revoked', 'Relation normalizer preserves lifecycle status');
  assertEqual(relation.origin_purpose_id, 'purpose-a', 'Relation normalizer preserves origin receipt');
  assertEqual(relation.from_snapshot.content, 'First judgment receipt', 'Relation keeps the first judgment receipt');
  assertEqual(relation.to_snapshot.content, 'Second judgment receipt', 'Relation keeps the second judgment receipt');
  assertEqual(relation.to_item.status, 'retired', 'Relation endpoint projection preserves current Item status');
  assertEqual(relationOtherEndpoint(relation, 'item-a')?.id, 'item-b', 'Relation resolves the opposite Item endpoint');
  assertEqual(relationOtherEndpoint(relation, 'outside-item'), null, 'Relation rejects an unrelated endpoint lookup');

  const malformed = { ...payload, to_snapshot: null };
  assertEqual(normalizeRelation(malformed), null, 'Relation normalizer rejects a missing judgment receipt');
  const crossWiredReceipt = {
    ...payload,
    to_snapshot: { ...payload.to_snapshot, item_id: 'item-a' },
  };
  assertEqual(normalizeRelation(crossWiredReceipt), null, 'Relation normalizer rejects a receipt wired to the wrong Item');
  assertEqual(
    normalizeRelations([payload, malformed, crossWiredReceipt]).length,
    1,
    'Relation list normalization filters malformed and cross-wired rows',
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

  const itemMember = normalizeContentGroupMember({
    id: 'item-member-boundary',
    kind: 'item',
    item_id: 'item-boundary',
    target_id: 'legacy-target-must-not-survive',
    preview_text: 'Durable Item preview',
    order_index: 0,
    metadata: { receipt: 'kept' },
  });
  assertEqual(itemMember.kind, 'item', 'Item membership kind survives client normalization');
  assertEqual(itemMember.item_id, 'item-boundary', 'Item membership identity survives client normalization');
  assertEqual(itemMember.target_id, null, 'Item membership never reuses the legacy target_id coordinate');
  assertEqual(itemMember.metadata?.receipt, 'kept', 'Item membership metadata survives client normalization');
  assertEqual(contentGroupMemberIdentityKey(itemMember), 'item|item-boundary', 'Item membership dedupes by durable Item identity');

  const malformedItemMember = normalizeContentGroupMember({
    id: 'missing-item-member-boundary',
    kind: 'item',
    item_id: null,
    target_id: null,
    preview_text: 'Cached Item preview',
    order_index: 1,
  });
  assertEqual(malformedItemMember.kind, 'item', 'missing Item edge is not coerced to content_range');
  assertEqual(malformedItemMember.source_sync_status, 'missing', 'missing Item edge is exposed as missing');
  assertEqual(malformedItemMember.metadata?.integrity_status, 'orphaned', 'missing Item edge is exposed as orphaned');
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

function testContentGroupEditorDraftBoundary(): void {
  const sourceRange = createTextSpanAnnotationRange({
    blockId: 'block-editor-source',
    textFlowId: 'flow-editor-source',
    textUnitId: 'unit-editor-source',
    startOffset: 0,
    endOffset: 19,
    text: 'Editor source truth',
  });
  const member = createContentGroupMemberFromRange(sourceRange);
  const group = createContentGroup({
    projectId: 'project-editor',
    noteId: 'note-editor',
    canvasId: 'canvas-editor',
    title: 'Editor group',
    members: [member],
  });
  const editorSavedGroup = applyContentGroupEditorDraft({
    group,
    draft: {
      title: 'Saved editor draft',
      topic: 'Editor topic',
      type: 'definition',
      summary: 'Identity draft keeps member source truth intact.',
    },
  });
  assertEqual(editorSavedGroup.title, 'Saved editor draft', 'Single Editor draft save updates group title');
  assertEqual(editorSavedGroup.identity.topic, 'Editor topic', 'Single Editor draft save updates identity topic');
  assertEqual(editorSavedGroup.identity.type, 'definition', 'Single Editor draft save updates identity type');
  assertEqual(editorSavedGroup.identity.summary, 'Identity draft keeps member source truth intact.', 'Single Editor draft save updates identity summary');
  assertEqual(editorSavedGroup.members.length, 1, 'Single Editor draft save preserves members');
  assertEqual(editorSavedGroup.members[0].source_ref?.snapshot_text, member.source_ref?.snapshot_text, 'Single Editor draft save preserves member source snapshot');
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
    type: 'definition',
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
  assertEqual(partialOverlapResult.next_ranges[0]?.start_offset, undefined, 'invalidated overlap range clears stale start offset');
  assertEqual(partialOverlapResult.next_ranges[0]?.end_offset, undefined, 'invalidated overlap range clears stale end offset');
  const invalidatedMetadata = partialOverlapResult.next_ranges[0]?.metadata as Record<string, unknown> | undefined;
  const preEditOffsets = invalidatedMetadata?.pre_edit_offsets as Record<string, unknown> | undefined;
  assertEqual(preEditOffsets?.start_offset, 4, 'invalidated overlap range keeps pre-edit start offset for future re-anchor');
  assertEqual(preEditOffsets?.end_offset, 12, 'invalidated overlap range keeps pre-edit end offset for future re-anchor');
  assertEqual(preEditOffsets?.range_text_cache, 'e drives', 'invalidated overlap range keeps pre-edit text cache for future re-anchor');
  assertEqual(partialOverlapResult.next_ranges[0]?.range_text_cache, 'e drives', 'invalidated overlap range preserves last known text cache');
  const invalidatedAnnotation = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'definition',
    ranges: partialOverlapResult.next_ranges,
  });
  const invalidatedSegments = createAnnotationRenderSegments({
    text: partialOverlapResult.next_text,
    annotations: [invalidatedAnnotation],
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(
    invalidatedSegments.some((segment) => segment.annotationIds.includes(invalidatedAnnotation.id)),
    false,
    'invalidated overlap range is not rendered at stale coordinates',
  );
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
  const pendingDefinitionRange = {
    ...definitionRange,
    metadata: {
      anchor_status: 'pending',
      anchor_reason: 'block_not_active',
    },
  };
  const pendingDefinition = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'definition',
    ranges: [pendingDefinitionRange],
  });
  const nullOffsetDefinitionRange = {
    ...definitionRange,
    id: `${definitionRange.id}-null-offset`,
    start_offset: null as unknown as number,
    end_offset: null as unknown as number,
    range_text_cache: "CSGO is Henry's favourite game",
    metadata: {
      pre_edit_offsets: {
        text_unit_id: 'unit-a',
        start_offset: 0,
        end_offset: 32,
        range_text_cache: "CSGO is Henry's favourite game",
      },
    },
  };
  const nullOffsetDefinition = createAnnotationTruth({
    noteId: 'note-a',
    canvasId: 'canvas-a',
    label: 'definition',
    ranges: [nullOffsetDefinitionRange],
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
  assertEqual(annotationRangeIsPending(pendingDefinitionRange), true, 'pending anchor status is recognized as read-time range state');
  assertEqual(buildTextUnitAnnotationCluster({
    annotations: [pendingDefinition],
    displayState: { labelsVisible: true },
    blockId: 'block-a',
    textUnitId: 'unit-a',
  }), null, 'pending text range does not create a text-unit badge cluster');
  const pendingSegments = createAnnotationRenderSegments({
    text: "CSGO is Henry's favourite game",
    annotations: [pendingDefinition],
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(
    pendingSegments.some((segment) => segment.annotationIds.includes(pendingDefinition.id)),
    false,
    'pending text range does not create inline highlight segments',
  );
  const pendingReadingProjection = projectAnnotationsForReading({
    annotations: [pendingDefinition],
  });
  assertEqual(
    pendingReadingProjection.includes("CSGO is Henry's favourite game"),
    false,
    'pending text range does not enter AI-readable annotation projection',
  );
  assertEqual(annotationRangeIsPending(nullOffsetDefinitionRange), false, 'null-offset text range is not pending by anchor status alone');
  assertEqual(annotationRangeIsRenderable(nullOffsetDefinitionRange), false, 'null-offset text range is not renderable');
  assertEqual(annotationRangeIsRenderable(definitionRange), true, 'healthy text range remains renderable');
  assertEqual(buildTextUnitAnnotationCluster({
    annotations: [nullOffsetDefinition],
    displayState: { labelsVisible: true },
    blockId: 'block-a',
    textUnitId: 'unit-a',
  }), null, 'null-offset text range does not create a text-unit badge cluster');
  const nullOffsetSegments = createAnnotationRenderSegments({
    text: "CSGO is Henry's favourite game",
    annotations: [nullOffsetDefinition],
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(
    nullOffsetSegments.some((segment) => segment.annotationIds.includes(nullOffsetDefinition.id)),
    false,
    'null-offset text range does not create inline highlight segments',
  );
  const nullOffsetSummary = summarizeAnnotationsForTextUnit({
    annotations: [nullOffsetDefinition],
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(nullOffsetSummary.count, 0, 'null-offset text range does not enter TextUnit annotation summary');
  const validOffsetSummary = summarizeAnnotationsForTextUnit({
    annotations: [definition],
    blockId: 'block-a',
    textUnitId: 'unit-a',
  });
  assertEqual(validOffsetSummary.count, 1, 'valid-offset text range still enters TextUnit annotation summary');
  const nullOffsetReadingProjection = projectAnnotationsForReading({
    annotations: [nullOffsetDefinition],
  });
  assertEqual(
    nullOffsetReadingProjection.includes("CSGO is Henry's favourite game"),
    false,
    'null-offset text range does not enter AI-readable annotation projection',
  );
  const nullOffsetDragText = plainTextFromContentGroupDragPayload({
    kind: 'label',
    annotation_id: nullOffsetDefinition.id,
    label: 'definition',
    ranges: [nullOffsetDefinitionRange],
    text_preview: 'fallback label preview',
  });
  assertEqual(
    nullOffsetDragText.includes("CSGO is Henry's favourite game"),
    false,
    'null-offset label drag payload does not expose stale range cache',
  );
  assertEqual(nullOffsetDragText, 'fallback label preview', 'null-offset label drag payload falls back to safe preview text');

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

const checks: Array<readonly [string, () => void | Promise<void>]> = [
  ['viewport and world seed', testViewportAndWorld],
  ['dynamic Canvas world and PageFrame focus', testDynamicCanvasWorldAndFocus],
  ['PageFrame and workspace policy', testPageFrameAndWorkspacePolicy],
  ['PageFrame v1 foundation', testPageFrameV1Foundation],
  ['PageFrame collection management', testPageFrameCollectionManagement],
  ['PageFrame collection does not imply PageStack numbering', testPageFrameCollectionDoesNotImplyPageStackNumbering],
  ['PageStack continuity relation', testPageStackContinuityRelation],
  ['PageStack navigator operations', testPageStackNavigatorOperations],
  ['PageStack content flow v1', testPageStackContentFlowV1],
  ['PageStack content flow typography fit', testPageStackContentFlowUsesTypographyFit],
  ['Cross-page Block fragment v1', testCrossPageBlockFragmentV1],
  ['Cross-page Block fragment measured height', testPageStackFragmentsRespectMeasuredLayoutHeight],
  ['PageSlice snapshot and reference v1', testPageSliceSnapshotAndReferenceV1],
  ['PageFrame operable object geometry updates', testPageFrameOperableObjectGeometryUpdates],
  ['PageFrame layout affiliation and move cohort', testPageFrameLayoutAffiliationAndMoveCohort],
  ['PageFrame object contract and affiliation decision', testPageFrameObjectContractAndAffiliationDecision],
  ['PageFrame guide and snap wall', testPageFrameGuideAndSnapWall],
  ['PageFrame print scale and typography baseline', testPageFramePrintScaleAndTypographyBaseline],
  ['TextFlow typography profile metadata and runtime contract', testTextFlowTypographyProfileMetadataAndRuntimeContract],
  ['Typography measurement service', testTypographyMeasurementService],
  ['AI-readable PageFrame typography', testAIReadablePageFrameTypography],
  ['PageFrame header footer and page number slots', testPageFrameHeaderFooterAndPageNumberSlots],
  ['PageFrame template background and style', testPageFrameTemplateBackgroundAndStyle],
  ['PageFrame-aware export preview', testPageFrameAwareExportPreview],
  ['Export Preview typography metadata', testExportPreviewExposesTypography],
  ['PageFrame crossing export policy', testPageFrameCrossingExportPolicy],
  ['PageFrame command surface and creation', testPageFrameCommandSurfaceAndCreation],
  ['CanvasObject persistence payload normalization', testCanvasObjectPersistencePayloadNormalization],
  ['CanvasObject special-kind persistence filter', testGenericPersistenceExcludesSpecialPageAndBlockKinds],
  ['placement and runtime model', testPlacementAndRuntimeModel],
  ['Canvas runtime kernel seed', testCanvasRuntimeKernelSeed],
  ['Block Projection v1 foundation', testBlockProjectionV1Foundation],
  ['Shape and visual connector foundation', testShapeAndVisualConnectorFoundation],
  ['Table object mutation math', testTableObjectMutationMath],
  ['Structured mutation runtime history', testStructuredMutationHistory],
  ['CanvasObject inspector and safe actions', testCanvasObjectInspectorAndSafeActions],
  ['Canvas command dispatcher foundation', testCanvasCommandDispatcherFoundation],
  ['Canvas AI-readable tree foundation', testCanvasAIReadableTreeFoundation],
  ['overlay anchor model', testOverlayAnchorModel],
  ['Selection typography toolbar placement', testSelectionTypographyToolbarPlacement],
  ['measurement mode and history', testMeasurementModeAndHistory],
  ['TextFlow seed', testTextFlowSeed],
  ['TextUnit editor service', testTextUnitEditorService],
  ['slash command foundation', testSlashCommandFoundation],
  ['AnnotationTruth seed', testAnnotationTruthSeed],
  ['ContentGroup and GroupFolder contract', testContentGroupAndGroupFolderContract],
  ['ContentGroup surface roles', testContentGroupSurfaceRoles],
  ['PurposeFrame contract', testPurposeFrameContract],
  ['Relation truth and judgment receipts', testRelationTruthContract],
  ['ContentGroup entity cutover boundary', testContentGroupEntityCutoverBoundary],
  ['GroupFolder entity cutover boundary', testGroupFolderEntityCutoverBoundary],
  ['ContentGroup member source boundary', testContentGroupMemberSourceBoundary],
  ['ContentGroup reuse boundary', testContentGroupReuseBoundary],
  ['ContentGroup editor draft boundary', testContentGroupEditorDraftBoundary],
  ['ContentGroup stability summary', testContentGroupStabilitySummary],
  ['SelectionDraft engine', testSelectionDraftEngine],
  ['Range rebase service', testRangeRebaseService],
  ['Source-backed annotation range editing', testSourceBackedAnnotationRangeEditing],
  ['Annotation display service', testAnnotationDisplayService],
] as const;

async function runChecks(): Promise<void> {
  for (const [, run] of checks) {
    await run();
  }

  console.table(checks.map(([check]) => ({ check, status: 'passed' })));
  console.log(`Canvas engine model contract check passed (${checks.length} groups).`);
}

void runChecks();
