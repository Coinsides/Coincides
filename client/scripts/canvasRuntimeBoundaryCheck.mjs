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

[
  'src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/FloatingOverlayLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/SlashMenuLayer.tsx',
  'src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx',
  'src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx',
  'src/pages/Notes/canvasEngine/blocks/DefinitionBlockProjection.tsx',
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
