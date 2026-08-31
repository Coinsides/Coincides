import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checks = [];

function readProjectFile(path) {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return readFileSync(fullPath, 'utf8');
}

function record(name, pass, detail = 'ok') {
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

const page = readProjectFile('src/pages/GroupGallery/GroupGallery.tsx');
const css = readProjectFile('src/pages/GroupGallery/GroupGallery.module.css');
const model = readProjectFile('src/pages/GroupGallery/groupGalleryShellModel.ts');
const navigationModel = readProjectFile('src/pages/GroupGallery/groupGalleryNavigationModel.ts');

assertContainsAll('Gallery keeps organize surface role', page, [
  'CONTENT_GROUP_SURFACE_ROLES.gallery',
  'data-content-group-surface',
  'data-content-group-role',
]);

assertContainsAll('Gallery exposes resource manager shell anchors', page, [
  'Group Gallery',
  'Search',
  'New folder',
  'New group',
  'Folder view',
  'Topic view',
  'Type view',
]);

assertContainsAll('Gallery exposes fixed destination navigation and creation targets', page + navigationModel, [
  'aria-label="Pinned destinations"',
  "label: 'All groups'",
  "label: 'Recent'",
  'By project',
  'destinationKey',
  'resolveGalleryCreationTarget',
  'New groups and folders:',
]);

assertContainsAll('Gallery card exposes OpenDesign anatomy', page + model, [
  'typeLabel',
  'topicLabel',
  'originLabel',
  'originColor',
  'originRoute',
  'statusLabel',
  'memberCountLabel',
]);

assertContainsAll('Gallery shell CSS has dedicated destination/card/folder/status language', css, [
  '.galleryShell',
  '.destinationNav',
  '.destinationRow',
  '.folderWorkspace',
  '.modeTabs',
  '.groupCard',
  '.cardRoleTab',
  '.cardOriginBadge',
  '.originDot',
  '.statusChip',
  '.topicDot',
]);

assertContainsAll('Gallery middle pane reserves the conditional folder navigator row', css, [
  'grid-template-rows: 44px auto 42px minmax(0, 1fr);',
  'grid-row: 1;',
  'grid-row: 2;',
  'grid-row: 3;',
  'grid-row: 4;',
]);

assertContainsNone('Gallery does not retain removed left-folder target anchors', page + model, [
  'Current folder',
  'All current-folder groups',
  'New group will be created in current folder.',
  'current folder target',
  'From Untitled note',
  'Untitled note',
  'sourceLabel',
]);

assertContainsNone('Gallery shell does not implement deferred systems', page + model, [
  'CanvasObject',
  'GraphRAG',
  'materialize',
  'forkContentGroup',
  'duplicateContentGroup',
  'petalCountLabel',
  'ContentGroupPetalV1',
]);

console.log(`group gallery shell contract passed (${checks.length} checks)`);
