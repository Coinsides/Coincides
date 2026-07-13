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
  'Current folder',
]);

assertContainsAll('Gallery card exposes OpenDesign anatomy', page + model, [
  'typeLabel',
  'topicLabel',
  'sourceLabel',
  'statusLabel',
  'memberCountLabel',
]);

assertContainsAll('Gallery shell CSS has dedicated card/folder/status language', css, [
  '.galleryShell',
  '.folderPane',
  '.modeTabs',
  '.groupCard',
  '.cardRoleTab',
  '.statusChip',
  '.topicDot',
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
