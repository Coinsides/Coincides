import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const logDir = new URL('./', import.meta.url);
const evidenceDir = new URL('docs/audits/2026-09-21-t3-typography-builder/', root);
fs.mkdirSync(evidenceDir, { recursive: true });
const sources = [
  ['client/src/pages/Notes/canvasEngine/typographyProfileService.ts', [[19, 27], [107, 135], [216, 226]]],
  ['client/src/pages/Notes/canvasEngine/pageFrameTypographyService.ts', [[22, 50], [60, 68]]],
  ['client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts', [[74, 100]]],
  ['client/src/pages/Notes/canvasEngine/pageReadingViewportService.ts', [[57, 79]]],
  ['client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx', [[1690, 1708], [1738, 1748]]],
  ['client/src/pages/Notes/canvasEngine/blocks/TableBlockProjection.module.css', [[1, 47]]],
  ['client/src/pages/Notes/NoteDetail.module.css', [[3582, 3609]]],
  ['server/src/__tests__/v2SourceRegionCells.test.ts', [[183, 215]]],
  ['server/src/services/sourceMineruParser.ts', [[147, 165], [266, 277], [765, 795]]],
];
const hashes = [];
let sourceLog = '';
for (const [path, ranges] of sources) {
  const bytes = fs.readFileSync(new URL(path, root));
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  hashes.push({ path, sha256: hash });
  const lines = bytes.toString('utf8').split(/\r?\n/);
  sourceLog += `\nFILE ${path}\nSHA256 ${hash}\n`;
  for (const [start, end] of ranges) for (let line = start; line <= end; line++) {
    sourceLog += `${line}: ${lines[line - 1]}\n`;
  }
}
fs.writeFileSync(new URL('source-evidence.log', logDir), sourceLog, 'utf8');
fs.writeFileSync(new URL('source-evidence.txt', evidenceDir), sourceLog, 'utf8');
fs.writeFileSync(new URL('source-hashes.json', evidenceDir), JSON.stringify(hashes, null, 2) + '\n');
const packageJson = JSON.parse(fs.readFileSync(new URL('package.json', root)));
const commands = packageJson.scripts['verify:v2-bn8-runtime'].split(' && ');
const status = execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' });
const diff = execFileSync('git', ['diff', '--stat'], { cwd: root, encoding: 'utf8' });
fs.writeFileSync(new URL('readonly-git-before-receipt.log', logDir), `${status}\nTRACKED DIFF BEFORE RECEIPT\n${diff}`);
fs.writeFileSync(new URL('verification-inventory.json', evidenceDir), JSON.stringify({
  status: 'NOT RUN: stopped at diagnostic conflicts',
  nonGitSecretsComponentCount: commands.length - 2,
  nonGitSecretsCommands: commands.slice(0, -2),
  reservedForHQ: commands.slice(-2),
  serverExpectedFiles: 111, serverMainFiles: 84, serverComplementFiles: 27,
  serverRequiredFileTimeoutMs: 600000,
}, null, 2) + '\n');
console.log(JSON.stringify({ files: hashes.length, nonGitSecretsComponentCount: commands.length - 2, trackedDiffBeforeReceipt: diff }));
