import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const checks = [];

function projectPath(path) {
  return resolve(root, path);
}

function readProjectFile(path) {
  const absolutePath = projectPath(path);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return readFileSync(absolutePath, 'utf8');
}

function record(name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) {
    throw new Error(`${name}: ${detail}`);
  }
}

function assertContainsAll(name, text, tokens) {
  const missing = tokens.filter((token) => !text.includes(token));
  record(name, missing.length === 0, missing.length ? `Missing: ${missing.join(', ')}` : 'ok');
}

function assertContainsNone(name, text, tokens) {
  const found = tokens.filter((token) => text.includes(token));
  record(name, found.length === 0, found.length ? `Forbidden: ${found.join(', ')}` : 'ok');
}

const noteDetail = readProjectFile('src/pages/Notes/NoteDetail.tsx');
assertContainsAll('NoteDetail shell imports runtime', noteDetail, [
  'useParams',
  'NoteCanvasRuntimeProvider',
  'NoteCanvasRuntime',
]);
assertContainsNone('NoteDetail has no old runtime symbols', noteDetail, [
  'blockLayouts',
  'layoutDrafts',
  'normalizeBlockLayout',
  'beginMoveBlock',
  'beginResizeBlock',
  'getSlashMenuAnchor',
  'SlashMenu',
  'BlockEditor',
  'ResizeObserver',
  'addEventListener',
]);

const runtimeHost = readProjectFile('src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx');
assertContainsAll('NoteCanvasRuntime is a host layer', runtimeHost, [
  'useNoteCanvasRuntimeController',
  'NoteChromeLayer',
  'NoteRuntimeDocumentLayer',
]);
assertContainsNone('NoteCanvasRuntime does not own implementation layers', runtimeHost, [
  'BlockEditorLayer',
  'SlashMenuLayer',
  'ExportPreviewLayer',
  'ResizeObserver',
  'addEventListener',
  'beginMoveBlock',
  'beginResizeBlock',
]);

const rootController = readProjectFile('src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts');
assertContainsAll('Runtime root composes first-level controllers', rootController, [
  'useRuntimeSurfaceStateController',
  'useRuntimeDocumentDataController',
  'useRuntimeLayoutModelController',
  'useRuntimeBlockOperationsController',
  'useRuntimePresentationController',
]);
assertContainsNone('Runtime root does not import lower-level controllers directly', rootController, [
  './useBlockFieldDraftController',
  './useBlockPlacementInteractions',
  './useBlockSelectionController',
  './useCanvasSurfacePointerController',
  './useDraftBlockController',
  './useFloatingOverlayController',
  './useLayoutDraftController',
  './useLayoutInteractionController',
  './useLayoutPersistenceController',
  './useMeasuredBlockReflowController',
  './useNoteCanvasDataAdapter',
  './useNoteCanvasLayoutModel',
  './useNoteLoadResetController',
  './usePlacementHistory',
  './useRuntimeFrameModelController',
  './useRuntimeInteractionController',
  './useSlashCommandController',
  './useSurfaceModeController',
]);

const runtimeTypes = readProjectFile('src/pages/Notes/canvasEngine/types.ts');
assertContainsAll('Runtime model exposes viewport and historical placement contracts', runtimeTypes, [
  'export interface CanvasViewport',
  'zoom: number',
  'export type PageFrameCrossingExportPolicy',
  'export interface PageFrameCrossingExportDecision',
  'clip_to_page_frame',
  'manual_required',
  'export interface DocumentTypographyProfile',
  'export interface PageFramePrintProfile',
  'export type PageFrameTemplateId',
  'export interface PageFrameBackgroundStyle',
  'export interface PageFrameTemplate',
  'export interface PageFrameSlot',
  'export interface PageFrameSlots',
  'export interface NoteCanvas',
  'export interface CanvasObject',
  'export interface CanvasPlacement',
  'export interface ContentMount',
  'export interface PageFrameExtension',
  'templateId: PageFrameTemplateId',
  'background: PageFrameBackgroundStyle',
  'defaultTypographyToken',
  'documentTypography: DocumentTypographyProfile',
  'slots?: PageFrameSlots',
  'export interface VisualConnector',
  'export interface CanvasAIReadableSnapshot',
  'export interface CanvasCommand',
  'export interface CanvasDelta',
  'export interface BlockPlacementModel',
  'selected?: boolean',
  'readingOrder?: number',
  'contentBbox?: CanvasRect',
  'pageFrameRef?:',
  'pageFrameStyle?:',
  'pageFrameSlots?: PageFrameSlots',
  'primary: boolean',
  'connectorRef?:',
  'imageRef?:',
  'structuredRef?:',
  'export interface StructuredCanvasObject',
  'export interface TableStructuredPayload',
  'export interface RelationEndpointReserve',
  'canvasObjects: CanvasObject[]',
  'canvasPlacements: CanvasPlacement[]',
  'contentMounts: ContentMount[]',
  'pageFrameExtensions: PageFrameExtension[]',
  'visualConnectors: VisualConnector[]',
  'imageObjects: ImageCanvasObject[]',
  'structuredObjects: StructuredCanvasObject[]',
  'canvasAIReadableSnapshot: CanvasAIReadableSnapshot',
  'relationEndpointReserve: RelationEndpointReserve[]',
  'export interface PageFrameCollectionModel',
  'pageFrames: PageFrameModel[]',
  'primaryFrameId: string | null',
]);
assertContainsAll('Runtime model exposes PageStack continuity context', runtimeTypes, [
  'export interface PageStackModel',
  'pageStacks: PageStackModel[]',
  'pageStackId',
  'pageStackPageIndex',
  'pageStackPageTotal',
  'pageStackNumberLabel',
]);
assertContainsAll('Runtime model exposes cross-page Block fragment projections', runtimeTypes, [
  'export interface PageStackBlockFragmentProjection',
  'export interface PageStackBlockFragmentRef',
  'blockFragmentProjections: PageStackBlockFragmentProjection[]',
  'pageStackBlockFragments?: PageStackBlockFragmentRef[]',
  "export type PageStackBlockFragmentRole",
]);
assertContainsAll('Runtime model exposes PageSlice snapshot and reference contracts', runtimeTypes, [
  'export interface PageSliceSnapshotV1',
  'export interface PageSliceReferenceDescriptor',
  'export interface PageSliceOpenOriginalTarget',
  "kind: 'page_slice_snapshot'",
  "source: 'page_stack_page'",
  'openOriginal: PageSliceOpenOriginalTarget',
]);

const engineModel = readProjectFile('src/pages/Notes/canvasEngine/engineModel.ts');
assertContainsAll('Engine model builds viewport world and runtime model seed', engineModel, [
  'NOTE_CANVAS_ENGINE_VERSION',
  'DEFAULT_CANVAS_WORLD',
  'createPageFramePrintProfile',
  'createPageFrameTemplate',
  'resolvePageFrameTemplate',
  'normalizePageFramePrintBaseline',
  'createPrimaryPageFrame',
  'createViewport',
  'buildNoteCanvasRuntimeModel',
  'getVisibleBlockIds',
  'createCanvasAIReadableSnapshot',
  'genericStructuredObjects',
  'structuredObjects',
  'pageFrameExtensions',
  'primaryPageFrameId',
]);
assertContainsAll('Engine model keeps independent PageFrame numbering stack-neutral', engineModel, [
  'pageStackContext: PageStackContext | null = null',
  'totalPages: pageStackContext?.total || 1',
]);
assertContainsAll('Engine model derives PageFrame extension from PageStack context', engineModel, [
  'pageStacks = []',
  'resolvePageStackContext',
  'pageStackNumberLabel',
]);
assertContainsAll('Engine model derives cross-page Block fragments once for runtime consumers', engineModel, [
  'derivePageStackBlockFragments',
  'blockFragmentProjections',
  'blockPlacements.flatMap',
]);
assertContainsNone('Engine model does not use PageFrameCollection total as page-number total', engineModel, [
  'buildPageFrameExtension(pageFrame, index, runtimePageFrames.length)',
  'buildPageFrameExtension(pageFrame,index,runtimePageFrames.length)',
]);
assertContainsAll('Engine model threads document typography into PageFrame extensions', engineModel, [
  'documentTypography = createDefaultDocumentTypographyProfile()',
  'activeDocumentTypography',
  'buildPageFrameExtension(',
  'documentTypography: normalizeDocumentTypographyProfile(documentTypography)',
]);
assertContainsNone('Engine model does not couple document typography to viewport zoom', engineModel, [
  'fontSizePx: viewport.zoom',
  'lineHeightPx: viewport.zoom',
  'averageCharWidthPx: viewport.zoom',
]);

const canvasAiTreeService = readProjectFile('src/pages/Notes/canvasEngine/canvasAiTreeService.ts');
assertContainsAll('Canvas AI tree service owns AI-readable layout snapshot derivation', canvasAiTreeService, [
  'export function createCanvasAIReadableSnapshot',
  'textByContentTargetId',
  'selectedObjectIds',
  'pageFrameExtensions',
  'primaryPageFrameId',
  'contentBbox',
  'pageFrameRef',
  'pageFrameStyle',
  'pageFrameSlots',
  'templateId',
  'defaultTypographyToken',
  'headerFooterEnabled',
  'pageNumberEnabled',
  'readingOrderCompare',
  'connectorRef',
  'relationKind: connector.relationKind',
  'imageObjects',
  'imageRef',
  'assetId: imageObject.assetId',
  'structuredObjects',
  'structuredRef',
  'structuredObject.payload',
  'frameNode.children',
  'readingOrder',
]);
assertContainsAll('Canvas AI tree exposes PageStack continuity context', canvasAiTreeService, [
  "kind: 'page_stack'",
  "kind: 'page_frame_reference'",
  'pageStacks',
  'pageCount',
  'collapsed',
]);
assertContainsAll('Canvas AI tree exposes cross-page Block fragment metadata', canvasAiTreeService, [
  'blockFragmentProjections',
  'blockFragmentsByObjectId',
  'pageStackBlockFragments',
  'toBlockFragmentRefs',
]);
assertContainsAll('Canvas AI tree exposes PageFrame document typography for AI-readable layout', canvasAiTreeService, [
  'createDocumentTypographyRef',
  'pageFrameRef',
  'documentTypography: createDocumentTypographyRef',
  'fontSizePx',
  'lineHeightPx',
  'paragraphSpacingPx',
]);

const viewportService = readProjectFile('src/pages/Notes/canvasEngine/viewportService.ts');
assertContainsAll('Viewport service owns runtime viewport and world seed', viewportService, [
  'getPrimaryPageOffsetX',
  'createRuntimeViewport',
  'createRuntimeWorld',
  'CANVAS_WORLD_PADDING',
  'focusViewportOnWorldRect',
  'pageFrames?: PageFrameModel[]',
  'viewportPointToWorldPoint',
  'worldPointToViewportPoint',
  'zoom: 1',
  'DEFAULT_CANVAS_WORLD',
]);

const viewportTransformController = readProjectFile('src/pages/Notes/canvasEngine/hooks/useViewportTransformController.ts');
assertContainsAll('Viewport transform controller retains Page viewport state and measured size', viewportTransformController, [
  'world?: CanvasWorldModel',
  'viewportTransform',
  'setViewportSize',
  'clampViewportToWorld',
  'world || DEFAULT_CANVAS_WORLD',
]);
assertContainsNone('Viewport transform controller has no retired pan zoom or reset callbacks', viewportTransformController, [
  'panViewportBy', 'scrollViewportBy', 'zoomViewportAt', 'focusViewportOnRect', 'resetViewport',
]);

const runtimeKernelService = readProjectFile('src/pages/Notes/canvasEngine/canvasRuntimeKernelService.ts');
assertContainsAll('Runtime kernel owns scene index hit test selection and command delta seed', runtimeKernelService, [
  'export interface CanvasPlacementIndex',
  'export interface CanvasSceneRuntime',
  'export function buildCanvasPlacementIndex',
  'export function buildCanvasSceneRuntime',
  'export function hitTestCanvasScene',
  'export function selectCanvasObjects',
  'export function createMoveCanvasObjectCommand',
  'export function createCanvasDeltaForCommand',
  "'canvas_placement'",
]);

const canvasCommandService = readProjectFile('src/pages/Notes/canvasEngine/canvasCommandService.ts');
assertContainsAll('Canvas command service owns create move resize style delete dispatcher seed', canvasCommandService, [
  'export function createCanvasObjectCommand',
  'export function createResizeCanvasObjectCommand',
  'export function createUpdateVisualStyleCommand',
  'export function createDeleteCanvasObjectCommand',
  'export function applyCanvasCommandToRuntime',
  "'create_canvas_object'",
  "'move_canvas_object'",
  "'resize_canvas_object'",
  "'update_visual_style'",
  "'delete_canvas_object'",
  "'canvas_placement'",
  "'visual_connector'",
]);

const blockProjectionService = readProjectFile('src/pages/Notes/canvasEngine/blockProjectionService.ts');
assertContainsAll('Block projection service owns TextFlow-backed CanvasObject projection seed', blockProjectionService, [
  'export function createParagraphBlockProjection',
  'createTextBlockContentV1',
  'TEXT_FLOW_CONTENT_KEY',
  'buildRuntimeBlockPlacement',
  'writeLayoutOverride',
  'paragraph_block_projection',
  'export function moveBlockProjectionPlacement',
  'export function resizeBlockProjectionPlacement',
  'export function restoreBlockProjectionLayout',
]);

const shapeProjectionService = readProjectFile('src/pages/Notes/canvasEngine/shapeProjectionService.ts');
assertContainsAll('Shape projection service owns pure shape block-backed shape and visual connector seeds', shapeProjectionService, [
  'export function createPureShapeProjection',
  'export function fillShapeWithParagraphBlock',
  'export function clearBlockBackedShapeText',
  'export function createVisualConnectorProjection',
  'createTextBlockContentV1',
  'TEXT_FLOW_CONTENT_KEY',
  "'visual_only'",
  "'block_backed'",
  "'shape'",
  "'visual_connector'",
]);

const visualConnectorService = readProjectFile('src/pages/Notes/canvasEngine/visualConnectorService.ts');
assertContainsAll('Visual connector service owns endpoint resolution and persistence payload boundary', visualConnectorService, [
  'export function pointForPlacementAnchor',
  'export function resolveVisualConnectorWithPlacements',
  'export function placementForVisualConnector',
  'export function visualConnectorSavePayload',
  "relation_kind: 'visual_only'",
  "kind: 'visual_connector'",
  "object_class: 'pure'",
]);

const imageObjectService = readProjectFile('src/pages/Notes/canvasEngine/imageObjectService.ts');
const tableObjectService = readProjectFile('src/pages/Notes/canvasEngine/tableObjectService.ts');
const canvasAssetRepository = readProjectFile('src/pages/Notes/canvasEngine/canvasAssetRepository.ts');
assertContainsAll('Image object service owns asset-backed CanvasObject projection boundary', imageObjectService, [
  'export function createImageObjectProjection',
  'export function imageObjectSavePayload',
  "kind: 'image'",
  "backing: 'asset'",
  "objectClass: 'media'",
  'contentMount: null',
  'asset_id: imageObject.assetId',
  'alt_text: imageObject.altText',
]);
assertContainsAll('Canvas asset repository owns image upload boundary', canvasAssetRepository, [
  'export async function uploadCanvasImageAsset',
  'export async function loadCanvasImageAssetBlobUrl',
  "form.append('note_id'",
  "api.post('/canvas-assets/images'",
  "api.get(`/canvas-assets/${assetId}/blob`",
  "responseType: 'blob'",
  'normalizeCanvasImageAsset',
  'blobUrl',
]);
assertContainsAll('Table object service owns structured CanvasObject projection boundary', tableObjectService, [
  'export function createTableObjectProjection',
  'export function tableObjectSavePayload',
  'export function createDefaultTablePayload',
  'export function updateTableCellText',
  'export function addTableRowBelow',
  'export function addTableColumnRight',
  'export function deleteTableRow',
  'export function deleteTableColumn',
  "kind: 'table'",
  "backing: 'structured_object'",
  "objectClass: 'structured'",
  'contentMount: null',
  'schema_version: structuredObject.schemaVersion',
  'rows: structuredObject.payload.rows',
  'cells: structuredObject.payload.cells',
]);

const pageFrameService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameService.ts');
assertContainsAll('PageFrame service owns formal frame sizing boundary', pageFrameService, [
  'createDefaultDraftLayout',
  'calculatePageFrameHeight',
  'createRuntimePageFrame',
  'getPageFrameOuterRect',
  'getPageFrameContentRect',
  'resolvePrimaryPageFrame',
  'resolvePrimaryPageFrameAfterDelete',
  'createPageModeFocusViewport',
  'DEFAULT_PAGE_FRAME_CONTENT_INSET',
  'PAGE_FRAME_BOTTOM_PADDING',
]);

const pageFrameCollectionService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameCollectionService.ts');
assertContainsAll('PageFrame collection service owns multi-frame management boundary', pageFrameCollectionService, [
  'NOTE_PAGE_FRAME_COLLECTION_METADATA_KEY',
  'createPageFrameCollectionSeed',
  'normalizePageFrameCollection',
  'insertPageFrameAfter',
  'duplicatePageFrame',
  'setPrimaryPageFrame',
  'deletePageFrameFromCollection',
  'updatePageFrameInCollection',
  'movePageFrameInCollection',
  'resizePageFrameInCollection',
  'pageFrameCollectionFromMetadata',
  'writePageFrameCollectionMetadata',
]);
assertContainsAll('PageFrame collection persists explicit PageStack coverage metadata', pageFrameCollectionService, [
  'PAGE_FRAME_COLLECTION_VERSION',
  'V2.BN.8.9.14',
  'pageStacks',
  'primaryStackId',
  'selectedStackId',
  'normalizePageStacksWithFrameCoverage',
]);

const courseDetail = readProjectFile('src/pages/Courses/CourseDetail.tsx');
assertContainsAll('Course detail New Note seeds explicit PageStack entity persistence', courseDetail, [
  'createNotePagePresetSeed',
  'savePageFrameCollectionForNote',
  'page_format: preset',
  'collection: createNotePagePresetSeed(preset)',
]);
const notePagePresetService = readProjectFile('src/pages/Notes/canvasEngine/notePagePresetService.ts');
assertContainsAll('New paper preset delegates geometry and stack ownership to the existing seed', notePagePresetService, [
  "DEFAULT_NOTE_PAGE_PRESET: NotePagePreset = 'a4_portrait'",
  'createPageFrameCollectionSeed(createPrimaryPageFrame({ templateId: preset }))',
]);

const pageStackCollectionService = readProjectFile('src/pages/Notes/canvasEngine/pageStackCollectionService.ts');
assertContainsAll('PageStack service owns continuous PageFrame relation boundary', pageStackCollectionService, [
  'export function normalizePageStacks',
  'export function createPageStackFromFrame',
  'export function createPageStackForFrame',
  'export function appendPageFrameToStack',
  'export function detachPageFrameFromStack',
  'export function splitPageStackAtFrame',
  'export function mergePageStacks',
  'export function resolvePageStackContext',
  'export function setPageStackCollapsed',
]);

const pageStackContentFlowService = readProjectFile('src/pages/Notes/canvasEngine/pageStackContentFlowService.ts');
assertContainsAll('PageStack content flow service owns default writing continuation boundary', pageStackContentFlowService, [
  'export type PageStackContentFlowPlan',
  'export function resolvePageStackContentFlowPlan',
  'documentTypography?: DocumentTypographyProfile',
  'draftText?: string',
  'estimateTypographyTextBlockHeight',
  "kind: 'stay_on_current_page'",
  "kind: 'move_to_existing_next_page'",
  "kind: 'append_next_page'",
  'appendPageFrameToStack',
  'resolvePageStackContext',
]);

const pageStackBlockFragmentService = readProjectFile('src/pages/Notes/canvasEngine/pageStackBlockFragmentService.ts');
assertContainsAll('PageStack Block fragment service owns cross-page fragment projection boundary', pageStackBlockFragmentService, [
  'export function derivePageStackBlockFragments',
  'PageStackBlockFragmentProjection',
  'intersectRects',
  'fragmentRole',
  'resolvePageStackContext',
  'getPageFrameContentRect',
  'candidatesByStack.size !== 1',
]);

const pageSliceService = readProjectFile('src/pages/Notes/canvasEngine/pageSliceService.ts');
assertContainsAll('PageSlice service owns whole-page snapshot and reference boundary', pageSliceService, [
  'export function createPageSliceSnapshot',
  'export function createPageSliceReferenceDescriptor',
  'PageSliceSnapshotV1',
  'PageSliceReferenceDescriptor',
  'resolvePageStackContext',
  'pageSliceSnapshotHash',
  'openOriginal',
]);

const layoutAffiliationService = readProjectFile('src/pages/Notes/canvasEngine/layoutAffiliationService.ts');
assertContainsAll('Layout affiliation service owns sparse PageFrame move cohort', layoutAffiliationService, [
  'export interface LayoutAffiliation',
  'deriveLayoutAffiliationsForPageFrame',
  'derivePageFrameMoveCohort',
  'movePageFrameAffiliatedBlockLayouts',
  "relation: 'fully_contained'",
]);

const runtimePresentationController = readProjectFile('src/pages/Notes/canvasEngine/hooks/useRuntimePresentationController.ts');
assertContainsAll('Runtime presentation controller can create a PageFrame from an empty collection', runtimePresentationController, [
  'createPageFrameCollectionSeed',
  'if (!afterFrameId)',
  'seedCollection',
]);
assertContainsAll('Runtime presentation controller retains live PageFrame collection actions', runtimePresentationController, [
  'handleCreatePageStack',
  'handleAddPageBelow',
  'handleDetachPageFromStack',
  'handleSplitPageStackAtFrame',
  'handleMergePageStackWithPrevious',
  'handleTogglePageStackCollapse',
]);
assertContainsNone('Runtime presentation controller has no retired Canvas frame drag handlers', runtimePresentationController, [
  'handleMovePageFrame', 'handleResizePageFrame', 'onMovePageFrame', 'onResizePageFrame',
]);

const pageFrameAffiliationService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameAffiliationService.ts');
assertContainsAll('PageFrame affiliation service owns geometry-derived no-ownership boundary', pageFrameAffiliationService, [
  'PAGE_FRAME_AFFILIATION_MODE',
  'geometry_derived_no_ownership',
  'PageFrameAffiliation',
  'classifyPlacementAgainstPageFrame',
  'derivePlacementPageFrameAffiliation',
  "ownership: 'none'",
  "'inside'",
  "'crossing'",
  "'workspace_only'",
]);

const geometryService = readProjectFile('src/pages/Notes/canvasEngine/geometry.ts');
assertContainsAll('Geometry service owns PageFrame crossing export policy interpretation', geometryService, [
  'DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY',
  'resolvePageFrameCrossingExportDecision',
  'getPageFrameContentGeometryRect',
  'intersectRects',
  'include_if_center_inside',
  'include_if_intersects',
  'clip_to_page_frame',
  'manual_required',
]);

const pageFrameGuideService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameGuideService.ts');
assertContainsAll('PageFrame guide service owns ruler margin guide and snap wall boundary', pageFrameGuideService, [
  'createPageFrameGuides',
  'snapRectToPageFrameGuides',
  'shouldShowPageFrameGuides',
  "'left_margin'",
  "'right_margin'",
  "'center_line'",
  "'top_ruler'",
  "snapState: 'snapped'",
  "snapState: 'free'",
]);

const pageFramePrintScaleService = readProjectFile('src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts');
const typographyProfileService = readProjectFile('src/pages/Notes/canvasEngine/typographyProfileService.ts');
const typographyMeasurementService = readProjectFile('src/pages/Notes/canvasEngine/typographyMeasurementService.ts');
assertContainsAll('Typography profile service owns note-level typography truth', typographyProfileService, [
  'NOTE_TYPOGRAPHY_PROFILE_METADATA_KEY',
  'text_flow_typography_profile_v1',
  'DocumentTypographyMetadataV1',
  'DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE',
  'DOCUMENT_FONT_FAMILY_OPTIONS',
  'DOCUMENT_TYPOGRAPHY_LIMITS',
  'normalizeDocumentTypographyProfile',
  'patchDocumentTypographyProfile',
  'typographyProfileFromMetadata',
  'writeTypographyProfileMetadata',
  'documentTypographyToCssVars',
]);
assertContainsAll('PageFrame print scale service owns page size and typography compatibility exports', pageFramePrintScaleService, [
  'DEFAULT_PAGE_FRAME_PAGE_SIZE',
  'createPageFramePrintProfile',
  'createDefaultDocumentTypographyProfile',
  'normalizePageFramePrintBaseline',
  'documentTypographyToCssVars',
  'A4',
]);
assertContainsNone('PageFrame print scale service does not inline document typography truth', pageFramePrintScaleService, [
  'DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE: DocumentTypographyProfile = {',
]);
assertContainsAll('Typography measurement service owns pure estimate helpers', typographyMeasurementService, [
  'export interface TypographyMeasurementInput',
  'export interface TypographyTextBlockMeasurement',
  'export function estimateTypographyTextBlockHeight',
  'export function estimatePageFrameLineCapacity',
  'normalizeDocumentTypographyProfile',
  'averageCharWidthPx',
  'paragraphSpacingPx',
]);
assertContainsNone('Typography measurement service does not use DOM layout reads', typographyMeasurementService, [
  'getBoundingClientRect',
  'scrollHeight',
  'ResizeObserver',
  'document.',
  'window.',
]);

const pageFrameSlotService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameSlotService.ts');
assertContainsAll('PageFrame slot service owns header footer and generated page number boundary', pageFrameSlotService, [
  'createDefaultPageFrameSlots',
  'resolvePageFrameSlotRects',
  'formatPageNumber',
  'summarizePageFrameSlotsForAI',
  "'header'",
  "'footer'",
  "'page_number'",
  "'generated'",
  "'empty'",
]);

const pageFrameTemplateService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameTemplateService.ts');
assertContainsAll('PageFrame template service owns template background and style boundary', pageFrameTemplateService, [
  'DEFAULT_PAGE_FRAME_TEMPLATE_ID',
  'PAGE_FRAME_TEMPLATE_PRESETS',
  'createPageFrameTemplate',
  'resolvePageFrameTemplate',
  'applyPageFrameTemplate',
  'pageFrameTemplateToCssVars',
  "'a4_portrait'",
  "'letter_portrait'",
  "'screen_note'",
  "'custom'",
  "'--page-frame-background'",
  "'--page-frame-border-color'",
]);

const exportPreviewService = readProjectFile('src/pages/Notes/canvasEngine/exportPreviewService.ts');
assertContainsAll('Export preview service owns PageFrame-aware preview model', exportPreviewService, [
  'export interface PageFrameExportPreview',
  'export interface ExportPreviewTypography',
  'documentTypography: ExportPreviewTypography',
  'estimatedLineCapacity',
  'pageFrames: PageFrameExportPreview[]',
  'crossingExportPolicy: PageFrameCrossingExportPolicy',
  'crossingObjects: ExportPreviewRow[]',
  'workspaceOnlyObjects: ExportPreviewRow[]',
  'exportPolicy?: PageFrameCrossingExportDecision',
  'resolvePageFrameCrossingExportDecision',
  'isRowIncludedInExport',
  'derivePlacementPageFrameAffiliation',
  'BuildExportPreviewModelOptions',
  'blockPlacements?: BlockPlacementModel[]',
  'primaryPageFrameId?: string | null',
  'documentTypography?: DocumentTypographyProfile',
  'crossingExportPolicy?: PageFrameCrossingExportPolicy',
]);
assertContainsNone('Runtime types do not define hard PageFrame ownership for blocks', runtimeTypes, [
  'page_frame_id',
  'pageFrameOwnerId',
  'ownerPageFrameId',
  'ownedPageFrameId',
]);

const noteCanvasLayoutModel = readProjectFile('src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.ts');
assertContainsAll('Note canvas layout model focuses Page Mode on primary PageFrame', noteCanvasLayoutModel, [
  'createPageModeFocusViewport',
  "surfaceMode === 'page'",
  'pageFrame: primaryPageFrame',
  'viewport: seedViewport',
  'runtimePageFrameCollection',
  'pageFrames: runtimePageFrameCollection.pageFrames',
]);
assertContainsAll('Note canvas layout model derives the Page world from runtime content', noteCanvasLayoutModel, [
  'createRuntimeWorld(surfaceMode, resolvedPageContentHeight, {',
  'measurePresetPageContentHeight(runtimePageFrameCollection, presetContentLayouts, coordinateContract)',
  'pageFrames: runtimePageFrameCollection.pageFrames',
  'blockPlacements: canvasBlockPlacements',
]);
assertContainsNone('Runtime types have no retired workspace reserve generator', runtimeTypes, [
  'export interface CanvasObjectReserve',
]);
assertContainsNone('Layout assembly has no retired workspace reserve input', noteCanvasLayoutModel, [
  'canvasObjectReserve',
]);
assertContainsAll('Note canvas layout model feeds runtime PageFrame context into Export Preview', noteCanvasLayoutModel, [
  'buildExportPreviewModel(visibleBlocks, blockLayouts, {',
  'pageFrames: noteCanvasRuntime.pageFrames',
  'blockPlacements: noteCanvasRuntime.blockPlacements',
  'primaryPageFrameId: noteCanvasRuntime.primaryPageFrame?.id || null',
  'documentTypography: documentTypographyProfile',
]);

const placementService = readProjectFile('src/pages/Notes/canvasEngine/placementService.ts');
assertContainsAll('Placement service owns layout seed write and runtime placement records', placementService, [
  'readStoredLayout',
  'normalizeBlockLayout',
  'buildRuntimeBlockPlacement',
  'buildRelationEndpointReserveForPlacement',
  'buildLayoutPayload',
  'writeLayoutOverride',
  'canvas_layout',
  'rotation: layout.rotation || 0',
  'visibilityState',
]);
assertContainsAll('Placement service routes move snapping through PageFrame guide service', placementService, [
  'snapRectToPageFrameGuides',
  'applyMoveSnap',
  'localContentPageFrame',
]);

const measurementService = readProjectFile('src/pages/Notes/canvasEngine/measurementService.ts');
assertContainsAll('Measurement service owns measured height and reflow boundary', measurementService, [
  'measureBlockContentHeight',
  'estimateBlockHeight',
  'estimateTypographyTextBlockHeight',
  'typography?: DocumentTypographyProfile',
  'applyMeasuredBlockLayoutToLayouts',
  'applyMeasuredBlockHeightToLayouts',
  'reflowLayoutsAfterHeightChange',
  'resolveStackedLayoutCollisions',
]);

const modePolicyService = readProjectFile('src/pages/Notes/canvasEngine/modePolicyService.ts');
assertContainsAll("Page policy owns visibility and blank draft placement", modePolicyService, [
  "createSurfaceModePolicy",
  "getVisibleBlocksForSurface",
  "shouldResolvePageCollisions",
  "shouldUseElasticAvoidance",
  "createBlankDraftLayout",
  "showWorkspaceBlocks: false",
  "useGlobalPageScroll: true",
]);
assertContainsAll("Page draft placement retains snap and content-width bounds", modePolicyService, [
  "snapEnabled && policy.isPageMode",
  "const maxPlacementWidth = contentWidth",
  "Math.max(0, rawY)",
]);

const historyService = readProjectFile('src/pages/Notes/canvasEngine/historyService.ts');
assertContainsAll('History service owns runtime undo redo keyboard intent contract', historyService, [
  'export type RuntimeHistoryEntry',
  'RuntimeHistoryKeyboardIntent',
  'isEditableDomTarget',
  'getRuntimeHistoryKeyboardIntent',
  "'undo'",
  "'redo'",
]);

const commandSurfaceService = readProjectFile('src/pages/Notes/canvasEngine/commandSurfaceService.ts');
assertContainsAll('Command surface service exposes PageFrame and blank Canvas menus', commandSurfaceService, [
  "'canvas_blank'",
  "'page_frame_shell'",
  "'create_page_frame'",
  "'create_page_stack'",
  "'create_shape_rectangle'",
  "'create_shape_ellipse'",
  "'start_visual_connector_from_object'",
  "'finish_visual_connector_to_object'",
  "'delete_canvas_object'",
  "'inspect_canvas_object'",
  "'open_original'",
  "'duplicate_canvas_object'",
  "'toggle_export_visibility'",
  "'add_page_below'",
  "'detach_page_from_stack'",
  "'toggle_page_stack_collapse'",
  "'duplicate_page_frame'",
  'buildCanvasBlankMenu',
  'buildCanvasObjectShellMenu',
  'buildImageObjectShellMenu',
  'buildTableObjectShellMenu',
  'buildVisualConnectorShellMenu',
  'buildPageFrameShellMenu',
]);

const objectInspectorService = readProjectFile('src/pages/Notes/canvasEngine/objectInspectorService.ts');
assertContainsAll('Object inspector service centralizes ordinary CanvasObject safe actions', objectInspectorService, [
  'createCanvasObjectInspectorModel',
  'createCanvasObjectInspectorActions',
  'createCanvasObjectDuplicateDraft',
  'toggleCanvasPlacementExportVisibility',
  "'open_original'",
  "'duplicate_canvas_object'",
  "'toggle_export_visibility'",
  "'delete_canvas_object'",
  "object.kind === 'shape' && object.backing === 'none'",
  "object.kind === 'image'",
  "object.kind === 'table'",
  "object.kind === 'visual_connector'",
]);

const noteCanvasDataAdapter = readProjectFile('src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts');
assertContainsAll('Note canvas adapter uses entity GroupFolder repository', noteCanvasDataAdapter, [
  'loadGroupFoldersForNote',
  'saveGroupFoldersForNote',
  '../groupFolderRepository',
]);
assertContainsAll('Note canvas adapter persists Canvas entities through repository cutover', noteCanvasDataAdapter, [
  'loadCanvasPersistenceForNote',
  'persistedCanvasObjects',
  'persistedCanvasPlacements',
  'persistedContentMounts',
  'persistedVisualConnectors',
  'savePageFrameCollectionForNote',
  'saveBlockCanvasPlacementForNote',
  'saveGenericCanvasObjectForNote',
  'deleteGenericCanvasObjectForNote',
  'loadAnnotationTruthsForNote',
  'saveAnnotationTruthsForNote',
  'persistCanvasObject',
  'deleteCanvasObject',
  'savePageFrameCollection',
  'setPageFrameCollection',
]);
assertContainsNone('Note canvas adapter no longer writes PageFrame or block layout legacy seeds', noteCanvasDataAdapter, [
  'writePageFrameCollectionMetadata',
  'writeLayoutOverride',
  'NOTE_LAYOUT_KEY',
  '[NOTE_ANNOTATIONS_METADATA_KEY]: nextAnnotations',
]);
assertContainsAll('Note canvas adapter persists document typography metadata', noteCanvasDataAdapter, [
  'typographyProfileFromMetadata',
  'writeTypographyProfileMetadata',
  'documentTypographyProfile',
  'saveDocumentTypographyProfile',
]);
assertContainsNone('Note canvas adapter does not write GroupFolder metadata', noteCanvasDataAdapter, [
  'writeGroupFolderMetadata',
  'NOTE_GROUP_FOLDERS_METADATA_KEY',
]);
const textFlowService = readProjectFile('src/pages/Notes/canvasEngine/textFlowService.ts');
assertContainsNone('TextFlow service does not own document typography profile', textFlowService, [
  'text_flow_typography_profile_v1',
  'fontSizePx',
  'lineHeightPx',
  'paragraphSpacingPx',
  'averageCharWidthPx',
]);

const groupGalleryData = readProjectFile('src/pages/GroupGallery/groupGalleryData.ts');
assertContainsAll('Group Gallery uses entity GroupFolder repository', groupGalleryData, [
  'loadGroupFoldersForNote',
  'saveGroupFoldersForNote',
  '@/pages/Notes/canvasEngine/groupFolderRepository',
]);
const groupGalleryPage = readProjectFile('src/pages/GroupGallery/GroupGallery.tsx');
assertContainsAll('Group Gallery moves groups through placement route', groupGalleryPage, [
  'moveContentGroupFolderPlacement',
  '@/pages/Notes/canvasEngine/groupFolderRepository',
]);
assertContainsNone('Group Gallery does not write GroupFolder metadata', groupGalleryData, [
  'writeGroupFolderMetadata',
  'NOTE_GROUP_FOLDERS_METADATA_KEY',
]);

const groupFolderRepository = readProjectFile('src/pages/Notes/canvasEngine/groupFolderRepository.ts');
assertContainsAll('GroupFolder repository strips legacy metadata after successful import', groupFolderRepository, [
  'stripLegacyGroupFolderMetadata',
  '/group-folders/import-note-metadata',
  "api.put<Note>(`/notes/${note.id}`",
]);

const contentGroupRepository = readProjectFile('src/pages/Notes/canvasEngine/contentGroupRepository.ts');
assertContainsAll('ContentGroup repository saves entity groups with hydrated members', contentGroupRepository, [
  'saveContentGroupsForNote',
  'groups: input.groups.map(normalizeContentGroup)',
  '/content-groups/by-note/',
]);
assertContainsNone('ContentGroup repository does not write note metadata for members', contentGroupRepository, [
  'writeContentGroupMetadata',
  'canvas_engine_content_groups_v1',
]);
const runtimeDataTypes = readProjectFile('src/pages/Notes/canvasEngine/runtimeDataTypes.ts');
const contentGroupService = readProjectFile('src/pages/Notes/canvasEngine/contentGroupService.ts');
const serverContentGroupService = readProjectFile('../server/src/services/contentGroups.ts');
assertContainsAll('ContentGroup member contract supports PageSlice snapshots', runtimeDataTypes, [
  "'page_slice'",
  'ContentGroupMemberKind',
]);
assertContainsAll('ContentGroup service creates PageSlice snapshot members', contentGroupService, [
  'createContentGroupMemberFromPageSliceSnapshot',
  "kind: 'page_slice'",
  'page_slice_snapshot_id',
  'page_stack_id',
  'page_frame_id',
  'open_original',
]);
assertContainsAll('Server ContentGroup service preserves page_slice member kind', serverContentGroupService, [
  "'page_slice'",
  'normalizeMemberKind',
]);
[
  ['ContentGroup repository does not know Petal/Fragment DB fields', contentGroupRepository],
  ['ContentGroup service does not know Petal/Fragment DB fields', contentGroupService],
].forEach(([name, text]) => {
  assertContainsNone(name, text, [
    'fragments_json',
    'petals_json',
    'content_group_fragments',
    'content_group_petals',
    'content_group_petal_fragments',
  ]);
});

[
  'src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/FloatingOverlayLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/SlashMenuLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx',
  'src/pages/Notes/canvasEngine/canvasAiTreeService.ts',
  'src/pages/Notes/canvasEngine/canvasCommandService.ts',
  'src/pages/Notes/canvasEngine/blockProjectionService.ts',
  'src/pages/Notes/canvasEngine/shapeProjectionService.ts',
  'src/pages/Notes/canvasEngine/imageObjectService.ts',
  'src/pages/Notes/canvasEngine/tableObjectService.ts',
  'src/pages/Notes/canvasEngine/objectInspectorService.ts',
  'src/pages/Notes/canvasEngine/canvasAssetRepository.ts',
  'src/pages/Notes/canvasEngine/visualConnectorService.ts',
  'src/pages/Notes/canvasEngine/canvasRuntimeKernelService.ts',
  'src/pages/Notes/canvasEngine/pageFrameAffiliationService.ts',
  'src/pages/Notes/canvasEngine/pageFrameCollectionService.ts',
  'src/pages/Notes/canvasEngine/pageStackCollectionService.ts',
  'src/pages/Notes/canvasEngine/pageStackContentFlowService.ts',
  'src/pages/Notes/canvasEngine/pageStackBlockFragmentService.ts',
  'src/pages/Notes/canvasEngine/pageSliceService.ts',
  'src/pages/Notes/canvasEngine/pageFrameGuideService.ts',
  'src/pages/Notes/canvasEngine/pageFrameSlotService.ts',
  'src/pages/Notes/canvasEngine/pageFrameTemplateService.ts',
  'src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx',
  'src/pages/Notes/canvasEngine/blocks/FormulaBlockProjection.tsx',
  'src/pages/Notes/canvasEngine/blocks/CodeBlockProjection.tsx',
].forEach((path) => {
  record(`Required runtime file exists: ${path}`, existsSync(projectPath(path)), 'ok');
});

const writingSurfaceLayer = readProjectFile('src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx');
const selectionTypographyToolbarLayer = readProjectFile('src/pages/Notes/canvasEngine/layers/SelectionTypographyToolbarLayer.tsx');
const noteCanvasLayerProps = readProjectFile('src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps.ts');
assertContainsAll('Writing surface exposes runtime smoke attributes', writingSurfaceLayer, [
  'data-canvas-engine-version',
  'data-canvas-engine-route',
  'data-canvas-visible-blocks',
  'data-canvas-world-width',
  'data-canvas-world-height',
  'data-canvas-page-frame',
  'data-canvas-object-id',
  'data-page-frame-id',
  'data-page-frame-role',
  'data-page-frame-primary',
  'data-page-frame-exportable',
  'data-canvas-surface-mode',
  'data-canvas-interaction-mode',
  'data-canvas-interaction-target',
  'data-canvas-interaction-block',
]);
assertContainsAll('Writing surface renders PageFrame ruler and margin guide markers', writingSurfaceLayer, [
  'createPageFrameGuides',
  'shouldShowPageFrameGuides',
  'data-page-frame-guide="top-ruler"',
  'data-page-frame-guide="left-margin"',
  'data-page-frame-guide="right-margin"',
  'data-page-frame-guide="center-line"',
]);
assertContainsAll('Writing surface exposes PageFrame print scale and document typography markers', writingSurfaceLayer, [
  'documentTypographyToCssVars',
  'data-page-frame-page-size',
  'data-document-typography-profile',
  'data-document-font-size',
  'data-document-line-height',
  'documentTypographyStyle',
]);
assertContainsAll("Writing surface exposes Page template background and style markers", writingSurfaceLayer, [
  "data-page-frame-template",
  "data-page-frame-background",
  "primaryPageFrameTemplateStyle",
]);
assertContainsAll('Writing surface renders PageFrame slot markers', writingSurfaceLayer, [
  'pageFrameSlotEntries',
  'data-page-frame-slot',
  'data-page-frame-slot-frame',
  'data-page-frame-slot-source',
  'pageFrameHeaderSlot',
  'pageFrameFooterSlot',
  'pageFramePageNumberSlot',
]);
assertContainsNone("Writing surface has no retired Canvas frame collection", writingSurfaceLayer, [
  "data-page-frame-index",
  "formalPageBoundaryPrimary",
  "formalPageBoundarySecondary",
]);
assertContainsNone("Writing surface has no retired Canvas frame context menus", writingSurfaceLayer, [
  "buildCanvasBlankMenu",
  "buildPageFrameShellMenu",
  "canvasBlankContextMenu",
  "pageFrameContextMenu",
  "handleBlankSurfaceContextMenu",
]);
assertContainsNone("Writing surface has no retired generic shape layer or handlers", writingSurfaceLayer, [
  "ShapeObjectLayer",
  "createPureShapeProjection",
  "shapePlacements",
  "shapeSavePayload",
  "handleShapePointerDown",
  "handleShapeResizePointerDown",
  "buildCanvasObjectShellMenu",
]);
assertContainsNone("Writing surface has no retired connector layer or commands", writingSurfaceLayer, [
  "VisualConnectorLayer",
  "createVisualConnectorProjection",
  "visualConnectorSavePayload",
  "visualConnectorDraft",
  "start_visual_connector_from_object",
  "finish_visual_connector_to_object",
]);
assertContainsNone("Writing surface has no retired generic image layer or commands", writingSurfaceLayer, [
  "ImageObjectLayer",
  "createImageObjectProjection",
  "uploadCanvasImageAsset",
  "imageObjectSavePayload",
  "imagePlacements",
  "imageObjectById",
  "buildImageObjectShellMenu",
  "edit_image_caption",
  "edit_image_alt_text",
  "toggle_image_fit",
]);
assertContainsNone("Writing surface has no retired table layer or mutations", writingSurfaceLayer, [
  "TableObjectLayer",
  "createTableObjectProjection",
  "tableObjectSavePayload",
  "persistTableMutationPayload",
  "confirmDeleteNonEmptyTablePart",
  "tableRowHasText",
  "tableColumnHasText",
  "create_table_object",
  "tablePlacements",
  "structuredObjectById",
  "buildTableObjectShellMenu",
]);
assertContainsNone("Writing surface has no retired table editor context menu", writingSurfaceLayer, [
  "PendingTableCellEdit",
  "handleTableCellTextCommit",
  "setTableContextMenu",
]);
assertContainsNone("Writing surface has no retired generic Object Inspector injection", writingSurfaceLayer, [
  "ObjectInspectorLayer",
  "selectedCanvasObjectInspectorModel",
  "flattenCanvasAIReadableNodes",
  "createCanvasObjectInspectorModel",
  "createCanvasObjectInspectorActions",
  "createCanvasObjectDuplicateDraft",
  "toggleCanvasPlacementExportVisibility",
  "objectContextActionsForObject",
  "handleCanvasObjectContextAction",
  "deleteCanvasObjectWithBacking",
  "persistCanvasObjectDuplicateDraft",
]);

assertContainsAll("Writing surface retains Page wall editing and ink persistence", writingSurfaceLayer, [
  "PageFrameWallLayer",
  "onPageFrameWallPointerDown",
  "interactive={layoutMode && !contentReadOnly",
  "PaperInkLayer",
  "onCreate={onPersistCanvasObject} onDelete={onDeleteCanvasObject}",
]);
assertContainsNone("Writing surface has no retired Canvas PageStack controls", writingSurfaceLayer, [
  "data-page-stack-id",
  "data-page-stack-page-index",
  "data-page-stack-page-total",
  "data-page-stack-collapsed",
  "data-page-stack-tail",
  "data-page-stack-number-label",
  "data-page-frame-selected",
  "data-page-frame-resize-handle",
]);
assertContainsAll('Writing surface passes cross-page Block fragments to Block shells', writingSurfaceLayer, [
  'blockFragmentsByBlockId',
  'noteCanvasRuntime.blockFragmentProjections',
  'blockFragments={blockFragmentsByBlockId.get(block.id)}',
]);
assertContainsAll("Writing surface exposes the active Page reading controls", writingSurfaceLayer, [
  "data-page-reading-control=\"true\"",
  "pageReading.displayScale",
  "onPageReadingStep",
  "canvasZoomControl",
  "canvasZoomButton",
  "canvasZoomReset",
]);
assertContainsAll('Writing surface renders selection typography toolbar from TextFlow selection draft', writingSurfaceLayer, [
  'SelectionTypographyToolbarLayer',
  'documentTypographyProfile',
  'onSaveDocumentTypographyProfile',
  'draftRangeCount === 1',
  '!annotationContextMenu',
]);
assertContainsAll('Layer props pass document typography into writing surface', noteCanvasLayerProps, [
  'documentTypographyProfile: input.documentTypographyProfile',
  'onSaveDocumentTypographyProfile: input.onSaveDocumentTypographyProfile',
]);
assertContainsAll('Layer props pass generic CanvasObject persistence into writing surface', noteCanvasLayerProps, [
  'onPersistCanvasObject: input.onPersistCanvasObject',
  'onDeleteCanvasObject: input.onDeleteCanvasObject',
]);
assertContainsAll('Selection typography toolbar edits note-level typography profile', selectionTypographyToolbarLayer, [
  'data-selection-typography-toolbar',
  'data-selection-typography-scope',
  'Document typography',
  'DOCUMENT_FONT_FAMILY_OPTIONS',
  'DOCUMENT_TYPOGRAPHY_LIMITS',
  'DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE',
  'patchDocumentTypographyProfile',
  'placeSelectionToolbar',
  'onMouseDown',
  'preventDefault',
]);
assertContainsNone('Selection typography toolbar does not create rich text span truth', selectionTypographyToolbarLayer, [
  'text_span_style',
  'richTextSpan',
  'inlineStyle',
  'fontWeight',
  'fontStyle',
  'textDecoration',
]);

const blockEditorLayer = readProjectFile('src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx');
assertContainsAll('Block editor shell exposes cross-page fragment markers', blockEditorLayer, [
  'blockFragments',
  'data-cross-page-block-fragment',
  'data-cross-page-fragment-count',
  'data-cross-page-fragment-role',
  'data-cross-page-continuation-marker',
  'blockCrossPageFragment',
  'blockFragmentContinuationBadge',
]);

const textBlockProjection = readProjectFile('src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx');
const annotationStampLayout = readProjectFile('src/pages/Notes/canvasEngine/annotationStampLayout.ts');
const annotationStampPlacement = readProjectFile('src/pages/Notes/canvasEngine/annotationStampPlacement.ts');
assertContainsAll('Text annotation stamps register with the shared painted-range layout', textBlockProjection, [
  'useAnnotationStampLayout(editorRef)',
  'data-annotation-highlight-ids={JSON.stringify(segment.annotationIds)}',
  'data-annotation-stamp={annotation.id}',
]);
record('Both parent and child annotation stamps participate in shared avoidance',
  (textBlockProjection.match(/data-annotation-stamp=\{annotation\.id\}/g) || []).length >= 2,
  'Parent and child stamps must each register their annotation identity');
assertContainsAll('Whole-block annotation stamps share the surface coordinator', blockEditorLayer, [
  'useAnnotationStampLayout(shellRef)',
  'data-annotation-stamp-kind="block"',
  'data-annotation-stamp-block-content',
]);
assertContainsAll('Stamp layout measures painted ranges, body text, peers and both page surfaces', annotationStampLayout, [
  'data-canvas-engine-version',
  'data-annotation-highlight-ids',
  'data-page-frame-index',
  'data-paper-ink-layer',
  'annotationStampTextRects',
  'placeAnnotationStamp',
  'obstacles',
  'occupied',
]);
assertContainsAll('Stamp placement receives page bounds and independent text and peer obstacles', annotationStampPlacement, [
  'placeAnnotationStamp',
  'anchor: StampRect',
  'bounds: StampRect',
  'obstacles: readonly StampRect[]',
  'occupied: readonly StampRect[]',
]);
assertContainsNone('Stamp geometry stays outside persisted annotation and DOM truth', annotationStampPlacement, [
  'annotationTruthRepository',
  'annotationTruthService',
  'runtimeDataTypes',
  'document.',
  'window.',
]);
assertContainsNone('Text annotation stamps do not restore fixed first-line or alternating offsets', textBlockProjection, [
  'badgeIndex % 2',
  'Math.max(0, measured.top - 15)',
  'Math.max(12, measured.top - 2)',
]);

const noteDetailStyles = readProjectFile('src/pages/Notes/NoteDetail.module.css');
record('Unmeasured annotation stamps remain hidden until an unobscured side is placed',
  /\[data-annotation-stamp\]:not\(\[data-stamp-side\]\)\s*\{[^}]*\bvisibility\s*:\s*hidden\s*;/.test(noteDetailStyles),
  'The unplaced stamp rule must hide its pixels while preserving measurable geometry');
assertContainsAll('Note detail styles apply document typography variables to writing text areas', noteDetailStyles, [
  '--document-font-family',
  '--document-font-size',
  '--document-line-height',
  '--document-paragraph-spacing',
  '.pageTextArea',
  '.definitionDescription',
]);
assertContainsAll('Note detail styles render selection typography mini toolbar', noteDetailStyles, [
  '.selectionTypographyToolbar',
  '.selectionTypographyScope',
  '.selectionTypographySelect',
  '.selectionTypographyNumber',
  '.selectionTypographyButton',
]);
assertContainsAll("Note detail styles apply Page template background variables", noteDetailStyles, [
  "--page-frame-background",
  "--page-frame-border-color",
  "--page-frame-shadow",
  ".pageReadingPaper",
]);
assertContainsAll('Note detail styles render PageFrame slots as quiet page chrome', noteDetailStyles, [
  '.pageFrameSlot',
  '.pageFrameHeaderSlot',
  '.pageFrameFooterSlot',
  '.pageFramePageNumberSlot',
]);
assertContainsAll('Note detail styles render cross-page Block fragment markers', noteDetailStyles, [
  '.blockCrossPageFragment',
  '.blockFragmentContinuationBadge',
]);
assertContainsAll('Note detail styles render PageFrame-aware Export Preview groups', noteDetailStyles, [
  // E1 uses the shared group class; require rule heads, not near-name prefixes.
  '.exportPreviewGroup {',
  '.exportPreviewPageFrameMeta {',
  '.exportPreviewPageFrameTypography {',
]);
assertContainsAll("Note detail styles retain the active PageFrame panel controls", noteDetailStyles, [
  ".pageFramePanelStackRow",
  ".pageFramePanelChildRow",
  ".pageFramePanelSectionLabel",
]);
assertContainsNone("Note detail styles exclude retired basic shape CanvasObjects", noteDetailStyles, [
  ".canvasShapeObject",
  ".canvasShapeRectangle",
  ".canvasShapeEllipse",
  ".canvasShapeSelected",
  ".canvasShapeResizeHandle",
]);
assertContainsNone("Note detail styles exclude retired asset-backed image CanvasObjects", noteDetailStyles, [
  ".canvasImageObject",
  ".canvasImageOperable",
  ".canvasImageSelected",
  ".canvasImageMedia",
  ".canvasImageCaption",
  ".canvasImageResizeHandle",
]);
assertContainsNone("Note detail styles exclude retired structured table CanvasObjects", noteDetailStyles, [
  ".canvasTableObject",
  ".canvasTableSelected",
  ".canvasTableHeader",
  ".canvasTableGrid",
  ".canvasTableResizeHandle",
]);
assertContainsNone("Note detail styles exclude retired Object Inspector panel", noteDetailStyles, [
  ".canvasObjectInspector",
  ".canvasObjectInspectorHeader",
  ".canvasObjectInspectorGrid",
  ".canvasObjectInspectorBadge",
  ".canvasObjectInspectorActions",
  ".canvasObjectInspectorAction",
]);

const exportPreviewLayer = readProjectFile('src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx');
assertContainsAll('Export Preview layer renders PageFrame groups and workspace warnings', exportPreviewLayer, [
  'ExportPreviewPageFrameGroup',
  'exportPolicyLabel',
  'data-export-preview-page-frame',
  'data-export-preview-page-frame-role',
  'data-export-preview-typography',
  'data-export-preview-line-capacity',
  'data-export-preview-crossing',
  'data-export-preview-crossing-policy',
  'data-export-preview-workspace-only',
  'preview.pageFrames.map',
  'preview.crossingObjects',
  'preview.workspaceOnlyObjects',
]);
assertContainsAll('Export preview exposes PageStack grouping metadata', exportPreviewService, [
  'pageStacks:',
  'pageFrameIds:',
  'collapsedInCanvas',
]);

const noteChromeLayer = readProjectFile('src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx');
assertContainsAll('Chrome More panel exposes document typography controls', noteChromeLayer, [
  'documentTypographyProfile',
  'onSaveDocumentTypographyProfile',
  'DOCUMENT_FONT_FAMILY_OPTIONS',
  'patchDocumentTypographyProfile',
  'data-typography-controls',
  'data-typography-font-family',
  'data-typography-font-size',
  'data-typography-line-height',
  'data-typography-paragraph-spacing',
]);
assertContainsAll('Chrome Layout panel exposes PageStack navigator controls', noteChromeLayer, [
  'pageFramePanel',
  'data-page-frame-panel',
  'data-page-frame-row',
  'data-page-stack-panel-row',
  'data-page-stack-panel-frame',
  'data-page-stack-create-toolbar',
  'onSelectPageFrame',
  'event.stopPropagation()',
  'onCreatePageStack',
  'onAddPageBelow',
  'onTogglePageStackCollapse',
  'onSplitPageStackAtFrame',
  'onMergePageStackWithPrevious',
  'onDuplicatePageFrame',
  'onSetPrimaryPageFrame',
  'onDeletePageFrame',
]);

console.table(checks.map(({ name, pass }) => ({ check: name, status: pass ? 'passed' : 'failed' })));

assertContainsAll('Shape placement generator defaults to Page or tray', shapeProjectionService, [
  "return layout.surface === 'tray' ? 'tray' : 'formal_page';",
]);
assertContainsAll('Image placement generator defaults to Page or tray', imageObjectService, [
  "return layout.surface === 'tray' ? 'tray' : 'formal_page';",
]);
assertContainsAll('Table placement generator defaults to Page or tray', tableObjectService, [
  "return layout.surface === 'tray' ? 'tray' : 'formal_page';",
]);
// 13.6: historical object services remain readable; the retired UI cannot return.
for (const name of ["ShapeObjectLayer","ImageObjectLayer","TableObjectLayer","VisualConnectorLayer","ObjectInspectorLayer"]) {
  const file = `src/pages/Notes/canvasEngine/layers/${name}.tsx`;
  record(`Retired Canvas layer is absent: ${name}`, !existsSync(projectPath(file)), file);
}
assertContainsNone('Page policy has no retired transition or workspace generator', modePolicyService, [
  'createSurfaceModeTransitionPolicy', 'getNextSurfaceMode', 'CANVAS_WORKSPACE_WIDTH', 'snapRectToPageFrameGuides',
]);
assertContainsNone('Writing surface has no retired pan zoom or Canvas DOM branch', writingSurfaceLayer, [
  "surfaceMode === 'canvas'", 'panSessionRef', 'onPanViewportBy', 'onScrollViewportBy', 'onZoomViewportAt', 'onResetViewport',
  'data-canvas-zoom-control', 'data-canvas-zoom-slider', 'data-canvas-zoom-reset',
]);
assertContainsNone('Note detail styles have no retired Canvas host or pan controls', noteDetailStyles, [
  '.pageCanvas', '.writingSurfaceCanvas', '.canvasPanReady', '.canvasPanning', '.canvasZoomSlider',
  '.formalPageBoundary', '.pageStackNumberBadge', '.pageStackCollapsedTail', '.pageFrameResizeHandle',
]);
assertContainsAll('Page reading styles retain the shared reading control classes', noteDetailStyles, [
  '.canvasZoomControl', '.canvasZoomButton', '.canvasZoomReset', '.pageReadingControl',
]);
console.log(`Canvas runtime boundary check passed (${checks.length} checks).`);
