// HQ addendum two: regenerate the existing manifest and prove the sole tool delta.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const evidence = resolve(root, 'docs/audits/2026-09-13-testgate-builder/round3');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-testgate-round3-manifest-'));
for (const directory of ['env', 'app-data', 'assets', 'blobs', 'uploads']) {
  mkdirSync(join(temporaryRoot, directory));
}
writeFileSync(join(temporaryRoot, 'empty.env'), '');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|^NODE_OPTIONS$|^DOTENV_|^VITE_|^TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH$/i.test(key)));
Object.assign(env, {
  DB_PATH: ':memory:',
  DOTENV_CONFIG_PATH: join(temporaryRoot, 'empty.env'),
  COINCIDES_VALIDATION_ENV_DIR: join(temporaryRoot, 'env'),
  COINCIDES_APP_DATA_DIR: join(temporaryRoot, 'app-data'),
  CANVAS_ASSET_DIR: join(temporaryRoot, 'assets'),
  SOURCE_BLOB_DIR: join(temporaryRoot, 'blobs'),
  UPLOAD_DIR: join(temporaryRoot, 'uploads'),
  ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GENERIC_API_KEY: '',
  DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
});

const args = ['--import', 'tsx', '../scripts/generate-tool-face-manifest.ts'];
const generated = spawnSync(process.execPath, args, {
  cwd: join(root, 'server'), env, windowsHide: true, encoding: 'utf8',
});
writeFileSync(join(evidence, 'generate-mcp-manifest.log'),
  JSON.stringify({ command: [process.execPath, ...args], cwd: 'server', temporaryRoot,
    isolation: 'empty dotenv/Vite env; memory DB; temporary app-data/assets/blobs/uploads; provider keys cleared' }) + '\n'
  + generated.stdout + generated.stderr + `\nexitCode=${generated.status}\n`);
assert.equal(generated.status, 0, 'Existing manifest generator must succeed');

const path = 'docs/generated/tool-face-manifest.json';
const before = JSON.parse(readFileSync(join(evidence, 'before', path), 'utf8'));
const after = JSON.parse(readFileSync(join(root, path), 'utf8'));
assert.deepEqual(after.map((entry) => entry.name), before.map((entry) => entry.name));
const changes = after.filter((entry, index) => JSON.stringify(entry) !== JSON.stringify(before[index]));
assert.deepEqual(changes.map((entry) => entry.name), ['list_note_blocks']);
const repaired = structuredClone(changes[0]);
assert.deepEqual(repaired.output_schema.items.properties.text_save_revision, { type: 'integer', minimum: 0 });
assert.equal(repaired.output_schema.items.required.filter((field) => field === 'text_save_revision').length, 1);
delete repaired.output_schema.items.properties.text_save_revision;
repaired.output_schema.items.required = repaired.output_schema.items.required.filter((field) => field !== 'text_save_revision');
assert.deepEqual(repaired, before.find((entry) => entry.name === 'list_note_blocks'));

const sha256 = (relativePath) => createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex');
const result = {
  changedTools: ['list_note_blocks'],
  unchangedTools: after.filter((entry) => entry.name !== 'list_note_blocks').length,
  soleChange: 'Required output item property text_save_revision: integer, minimum 0',
  schemaOtherFieldsIdentical: true,
  manifestSha256: sha256(path),
  registrySha256: sha256('server/src/toolFace/registry.ts'),
};
writeFileSync(join(evidence, 'mcp-manifest-delta.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
