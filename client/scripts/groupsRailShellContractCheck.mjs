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

const panel = readProjectFile('src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx');
const model = readProjectFile('src/pages/Notes/canvasEngine/panels/contentGroupRailShellModel.ts');
const css = readProjectFile('src/pages/Notes/NoteDetail.module.css');

assertContainsAll('Rail keeps collect surface role', panel, [
  'CONTENT_GROUP_SURFACE_ROLES.rail',
  'data-content-group-surface',
  'data-content-group-role',
]);

assertContainsAll('Rail exposes collect shell anchors', panel + model, [
  'Groups',
  'New group',
  'Search',
  'Drop selected content here',
  'Open editor',
  'railSelectionLabel',
  'buildRailGroupRowView',
]);

assertContainsAll('Rail CSS keeps OpenDesign anatomy', css, [
  '.contentGroupPanel',
  '.contentGroupHeader',
  '.contentGroupFolderLine',
  '.contentGroupToolRow',
  '.contentGroupSearchRow',
  '.contentGroupViewTabs',
  '.contentGroupRow',
  '.contentGroupTopicStrip',
  '.contentGroupRoleBadge',
  '.contentGroupStatusChip',
  '.contentGroupDropZone',
  '.contentGroupStatusBar',
]);

assertContainsNone('Rail does not implement deferred systems', panel + model, [
  'CanvasObject',
  'GraphRAG',
  'materialize',
  'forkContentGroup',
  'duplicateContentGroup',
]);

console.log('groups rail shell contract passed');
