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
assertContainsAll('Runtime model exposes viewport placement and reserve contracts', runtimeTypes, [
  'export interface CanvasViewport',
  'zoom: number',
  'export interface BlockPlacementModel',
  'rotation?: number',
  'export interface CanvasObjectReserve',
  'export interface RelationEndpointReserve',
  'relationEndpointReserve: RelationEndpointReserve[]',
]);

const engineModel = readProjectFile('src/pages/Notes/canvasEngine/engineModel.ts');
assertContainsAll('Engine model builds viewport world and runtime model seed', engineModel, [
  'NOTE_CANVAS_ENGINE_VERSION',
  'DEFAULT_CANVAS_WORLD',
  'createPrimaryPageFrame',
  'createViewport',
  'buildNoteCanvasRuntimeModel',
  'getVisibleBlockIds',
]);

const viewportService = readProjectFile('src/pages/Notes/canvasEngine/viewportService.ts');
assertContainsAll('Viewport service owns runtime viewport and world seed', viewportService, [
  'getPrimaryPageOffsetX',
  'createRuntimeViewport',
  'createRuntimeWorld',
  'zoom: 1',
  'DEFAULT_CANVAS_WORLD',
]);

const pageFrameService = readProjectFile('src/pages/Notes/canvasEngine/pageFrameService.ts');
assertContainsAll('PageFrame service owns formal frame sizing boundary', pageFrameService, [
  'createDefaultDraftLayout',
  'calculatePageFrameHeight',
  'createRuntimePageFrame',
  'DEFAULT_PAGE_FRAME_CONTENT_INSET',
  'PAGE_FRAME_BOTTOM_PADDING',
]);

const placementService = readProjectFile('src/pages/Notes/canvasEngine/placementService.ts');
assertContainsAll('Placement service owns layout seed write and runtime placement records', placementService, [
  'readStoredLayout',
  'normalizeBlockLayout',
  'buildRuntimeBlockPlacement',
  'buildRelationEndpointReserveForPlacement',
  'buildLayoutPayload',
  'writeLayoutOverride',
  'rotation: layout.rotation || 0',
  'visibilityState',
]);

const measurementService = readProjectFile('src/pages/Notes/canvasEngine/measurementService.ts');
assertContainsAll('Measurement service owns measured height and reflow boundary', measurementService, [
  'measureBlockContentHeight',
  'estimateBlockHeight',
  'applyMeasuredBlockLayoutToLayouts',
  'applyMeasuredBlockHeightToLayouts',
  'reflowLayoutsAfterHeightChange',
  'resolveStackedLayoutCollisions',
]);

const modePolicyService = readProjectFile('src/pages/Notes/canvasEngine/modePolicyService.ts');
assertContainsAll('Mode policy service owns page canvas visibility and blank draft policy', modePolicyService, [
  'createSurfaceModePolicy',
  'createSurfaceModeTransitionPolicy',
  'getVisibleBlocksForSurface',
  'shouldResolvePageCollisions',
  'shouldUseElasticAvoidance',
  'createBlankDraftLayout',
  'showWorkspaceBlocks',
  'useGlobalPageScroll',
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

const noteCanvasDataAdapter = readProjectFile('src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts');
assertContainsAll('Note canvas adapter uses entity GroupFolder repository', noteCanvasDataAdapter, [
  'loadGroupFoldersForNote',
  'saveGroupFoldersForNote',
  '../groupFolderRepository',
]);
assertContainsNone('Note canvas adapter does not write GroupFolder metadata', noteCanvasDataAdapter, [
  'writeGroupFolderMetadata',
  'NOTE_GROUP_FOLDERS_METADATA_KEY',
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
[
  ['ContentGroup repository does not know Petal/Fragment DB fields', contentGroupRepository],
  ['ContentGroup service does not know Petal/Fragment DB fields', readProjectFile('src/pages/Notes/canvasEngine/contentGroupService.ts')],
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
  'src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx',
  'src/pages/Notes/canvasEngine/blocks/FormulaBlockProjection.tsx',
  'src/pages/Notes/canvasEngine/blocks/CodeBlockProjection.tsx',
].forEach((path) => {
  record(`Required runtime file exists: ${path}`, existsSync(projectPath(path)), 'ok');
});

const writingSurfaceLayer = readProjectFile('src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx');
assertContainsAll('Writing surface exposes runtime smoke attributes', writingSurfaceLayer, [
  'data-canvas-engine-version',
  'data-canvas-engine-route',
  'data-canvas-visible-blocks',
  'data-canvas-page-frame',
  'data-canvas-surface-mode',
  'data-canvas-interaction-mode',
  'data-canvas-interaction-target',
  'data-canvas-interaction-block',
]);

console.table(checks.map(({ name, pass }) => ({ check: name, status: pass ? 'passed' : 'failed' })));
console.log(`Canvas runtime boundary check passed (${checks.length} checks).`);
