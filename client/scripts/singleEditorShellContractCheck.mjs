import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readProjectFile(path) {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(fullPath, 'utf8');
}

function assertContainsAll(name, text, tokens) {
  const missing = tokens.filter((token) => !text.includes(token));
  if (missing.length > 0) throw new Error(`${name}: Missing ${missing.join(', ')}`);
}

function assertContainsNone(name, text, tokens) {
  const found = tokens.filter((token) => text.includes(token));
  if (found.length > 0) throw new Error(`${name}: Forbidden ${found.join(', ')}`);
}

const editor = readProjectFile('src/pages/GroupGallery/SingleContentGroupEditor.tsx');
const model = readProjectFile('src/pages/GroupGallery/singleContentGroupEditorShellModel.ts');
const css = readProjectFile('src/pages/GroupGallery/GroupGallery.module.css');

assertContainsAll('Single Editor keeps refine surface role', editor, [
  'CONTENT_GROUP_SURFACE_ROLES.editor',
  'data-content-group-surface',
  'data-content-group-role',
]);

assertContainsAll('Single Editor exposes non-canvas refine anchors', editor + model + css, [
  'singleEditorShell',
  'singleEditorTopbar',
  'singleEditorSummaryBar',
  'singleEditorMaterialShelf',
  'singleEditorPetalDock',
  'singleEditorSourceDrawer',
  'buildSingleEditorShellView',
]);

assertContainsNone('Single Editor does not implement deferred systems', editor + model, [
  'CanvasObject',
  'GraphRAG',
  'materialize',
  'forkContentGroup',
  'duplicateContentGroup',
  'single-group-workbench',
]);

console.log('single editor shell contract passed');
