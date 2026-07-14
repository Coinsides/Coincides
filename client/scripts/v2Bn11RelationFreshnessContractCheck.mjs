import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(path) {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(fullPath, 'utf8');
}

function assertContains(name, text, tokens) {
  const missing = tokens.filter((token) => !text.includes(token));
  if (missing.length > 0) throw new Error(`${name}: missing ${missing.join(', ')}`);
}

function assertAbsent(name, text, tokens) {
  const found = tokens.filter((token) => text.includes(token));
  if (found.length > 0) throw new Error(`${name}: forbidden ${found.join(', ')}`);
}

const migration = read('../server/src/db/migrations/047_v2_item_relation_floor.ts');
const relationServer = read('../server/src/services/relations.ts');
const relationClient = read('src/pages/Notes/canvasEngine/relationService.ts');
const relationInspector = read('src/pages/Notes/canvasEngine/relationInspectorService.ts');
const relationPanel = read('src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx');
const activeRelationCode = [relationServer, relationClient, relationInspector, relationPanel].join('\n');
const relationSchema = migration
  .split('CREATE TABLE IF NOT EXISTS relations (')[1]
  ?.split('CREATE UNIQUE INDEX IF NOT EXISTS idx_relations_active')[0] || '';
const assessmentSchema = migration
  .split('CREATE TABLE IF NOT EXISTS relation_assessments (')[1]
  ?.split('CREATE INDEX IF NOT EXISTS idx_relation_assessments_relation_created')[0] || '';

assertContains('Relation freshness is derived on read', relationServer, [
  'deriveRelationFreshness',
  'from_changed',
  'to_changed',
  'both_changed',
  'inspection_checkpoint_at',
]);
assertContains('Item Inspector owns a local Relation maintenance surface', relationPanel, [
  'buildRelationInspectorRows',
  'loadRelations',
  'createRelation',
  'reaffirmRelation',
  'revokeRelation',
]);
assertAbsent('migration 047 does not persist Relation freshness', `${relationSchema}\n${assessmentSchema}`, [
  'freshness TEXT',
  'stale BOOLEAN',
  'sync_status',
  'freshness_status',
]);
assertAbsent('active Relation code has no global freshness pump', activeRelationCode, [
  'setInterval(',
  'setTimeout(',
  'sweepRelationFreshness',
  'enqueueRelationFreshness',
  'relationFreshnessQueue',
  "'/freshness'",
  'RelationGraph',
]);

console.log('V2.BN.11.6 Relation freshness contract passed');
