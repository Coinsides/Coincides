import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const root = process.cwd();
const audit = 'docs/audits/2026-09-11-b1a-builder';
const require = createRequire(import.meta.url);
const { createTwoFilesPatch, diffLines } = require('C:/Program Files/nodejs/node_modules/npm/node_modules/diff');
const entries = new Map();
const slash = (s) => s.replaceAll('\\', '/');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const addSnapshotTree = (directory, basis) => {
  for (const file of walk(directory)) {
    const relative = slash(path.relative(directory, file));
    if (!/^(client|server|shared|docs)\//.test(relative)) continue;
    entries.set(relative, { before: slash(path.relative(root, file)), basis });
  }
};
addSnapshotTree(`${audit}/baseline`, 'captured before implementation');
addSnapshotTree(`${audit}/baseline/root`, 'captured before implementation');
addSnapshotTree(`${audit}/baseline-code`, 'captured before implementation');

for (const directory of ['.codex-tmp/b1a-review-before', '.codex-tmp/b1a-fixture-reconstructed-before']) {
  const reconstructed = directory.includes('reconstructed');
  for (const source of walk(directory)) {
    const relative = slash(path.relative(directory, source));
    const target = `${audit}/baseline/${reconstructed ? 'reconstructed' : 'review'}/${relative}`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    entries.set(relative, { before: target, basis: reconstructed ? 'reconstructed by reversing exact B1a additions; see fixture-edit-provenance.json' : 'captured before review fix' });
  }
}

const printFile = 'client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx';
let printBefore = fs.readFileSync(printFile, 'utf8');
for (const [after, before] of [
  ["import { usePaperSkin } from '../PaperSkinContext';\n", ''],
  ["'anchorsBySourceRef'> & { skinStyle?: CSSProperties; skinPreset?: string };", "'anchorsBySourceRef'>;"],
  [' data-note-id={input.noteId} style={input.skinStyle} data-note-skin-preset={input.skinPreset}', ' data-note-id={input.noteId}'],
  ['  const skin = usePaperSkin();\n', ''],
  ['  latest.current = { ...input, skinStyle: skin?.style, skinPreset: skin?.preset };', '  latest.current = input;'],
]) {
  if (!printBefore.includes(after)) throw new Error(`Missing known print change: ${after}`);
  printBefore = printBefore.replace(after, before);
}
const printTarget = `${audit}/baseline/reconstructed/${printFile}`;
fs.mkdirSync(path.dirname(printTarget), { recursive: true });
fs.writeFileSync(printTarget, printBefore);
entries.set(printFile, { before: printTarget, basis: 'reconstructed by reversing the five exact B1a print integration edits in this script' });

const added = [
  'shared/types/skin.ts',
  'server/src/services/skin.ts',
  'server/src/validators/skin.ts',
  'server/src/db/migrations/067_v13_paper_skin.ts',
  'server/src/__tests__/v13PaperSkin.test.ts',
  'client/src/styles/skinPresets.ts',
  'client/src/styles/skinPresets.test.ts',
  'client/src/components/Skin/SkinControls.tsx',
  'client/src/components/Skin/SkinControls.module.css',
  'client/src/components/Skin/SkinEditor.tsx',
  'client/src/components/Skin/SkinEditor.test.tsx',
  'client/src/pages/Settings/AppearanceSection.tsx',
  'client/src/pages/Notes/canvasEngine/PaperSkinContext.tsx',
  'client/src/pages/Notes/canvasEngine/paperSkinStyles.ts',
  'client/src/pages/Notes/canvasEngine/paperSkinStyles.test.ts',
  'client/src/pages/Notes/canvasEngine/paperSkinDefaults.css',
  'client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.ts',
  'client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts',
  'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.skin.test.tsx',
];
for (const file of added) entries.set(file, { before: null, basis: 'new B1a file' });
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
let patch = '';
const files = [];
for (const [file, meta] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
  const previous = meta.before ? fs.readFileSync(meta.before) : Buffer.alloc(0);
  const current = fs.readFileSync(file);
  if (previous.equals(current)) continue;
  const lines = diffLines(previous.toString('utf8'), current.toString('utf8'));
  files.push({ path: file, ...meta, change: meta.before ? 'modified' : 'added', beforeSha256: meta.before ? sha(previous) : null, afterSha256: sha(current), addedLines: lines.filter((x) => x.added).reduce((n, x) => n + x.count, 0), removedLines: lines.filter((x) => x.removed).reduce((n, x) => n + x.count, 0) });
  patch += createTwoFilesPatch(meta.before ? `a/${file}` : '/dev/null', `b/${file}`, previous.toString('utf8'), current.toString('utf8'), meta.basis, 'B1a final working copy', { context: 3 });
}
fs.writeFileSync(`${audit}/delivery.diff`, patch);
fs.writeFileSync(`${audit}/delivery-manifest.json`, JSON.stringify({ basis: 'Explicit B1a ownership inventory and source snapshots, not git diff. Reconstructed bases are individually declared. Evidence files and handoff Result are indexed separately.', files, totals: { files: files.length, added: files.filter((f) => f.change === 'added').length, modified: files.filter((f) => f.change === 'modified').length, addedLines: files.reduce((n, f) => n + f.addedLines, 0), removedLines: files.reduce((n, f) => n + f.removedLines, 0) } }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ files: files.length, diffBytes: Buffer.byteLength(patch) }) + '\n');

const indexFile = 'docs/agent-ops/INDEX.md';
const indexBefore = `${audit}/baseline/documentation/${indexFile}`;
fs.mkdirSync(path.dirname(indexBefore), { recursive: true });
if (!fs.existsSync(indexBefore)) fs.copyFileSync(indexFile, indexBefore);
const handoffFile = 'docs/agent-ops/handoffs/2026-09-11-v13-5-b1a-skin-engine-order.md';
const handoff = fs.readFileSync(handoffFile, 'utf8');
const handoffBefore = handoff.slice(0, handoff.indexOf('\n## Result')).trimEnd().replace(
  '> **状态 (Status)**: done（builder 已交付；待 HQ 复核 / 主观验收）',
  '> **状态 (Status)**: ready(候 B4v 收口后派发;B1 三分拆之一)',
) + '\n';
let docPatch = createTwoFilesPatch(`a/${handoffFile}`, `b/${handoffFile}`, handoffBefore, handoff, 'reconstructed by reversing Result append and ready-to-done header', 'B1a receipt', { context: 3 });
docPatch += createTwoFilesPatch(`a/${indexFile}`, `b/${indexFile}`, fs.readFileSync(indexBefore, 'utf8'), fs.readFileSync(indexFile, 'utf8'), 'captured before generated index refresh', 'generated by the unchanged docs-index script', { context: 3 });
fs.writeFileSync(`${audit}/documentation.diff`, docPatch);
