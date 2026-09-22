import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSpec } from './extract.mjs';
import { loadProductGrid } from './productGrid.mjs';
import { renderReport } from './report.mjs';

const args = process.argv.slice(2);
const input = args.shift();
if (!input || input === '--help') {
  console.log('npm run spec:extract -- <specimen.html> [--out-dir <directory>] [--paper-selector <selector>]');
  if (!input) process.exitCode = 1;
} else {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  let outDir = resolve(repoRoot, '.codex-tmp/spec-extractor'); let paperSelector;
  while (args.length) {
    const option = args.shift(); const value = args.shift();
    if (!value || !['--out-dir', '--paper-selector'].includes(option)) throw new Error(`Unknown or incomplete option: ${option}`);
    if (option === '--out-dir') outDir = resolve(value); else paperSelector = value;
  }
  const sourcePath = resolve(input);
  const html = await readFile(sourcePath, 'utf8');
  const product = await loadProductGrid();
  const report = extractSpec(html, { sourcePath: relative(repoRoot, sourcePath).replaceAll('\\', '/'), product, paperSelector });
  const stem = basename(sourcePath).replace(/\.html?$/i, '') + '.spec';
  await mkdir(outDir, { recursive: true });
  for (const [extension, contents] of [['json', JSON.stringify(report, null, 2) + '\n'], ['md', renderReport(report)]]) {
    const destination = resolve(outDir, `${stem}.${extension}`);
    if (destination.toLowerCase() === sourcePath.toLowerCase()) throw new Error('Output must not overwrite specimen');
    await writeFile(destination, contents, 'utf8');
    console.log(destination);
  }
  console.log(JSON.stringify({ sha256: report.source.sha256, paperWidthPx: report.normalization.specimenWidthPx, factor: report.normalization.factor, roleSamples: report.coverage.roleSampleCount, palette: report.palette.length, spacing: report.spacing.length, comparisons: report.comparisons.length, diagnostics: report.diagnostics.length }));
}
