import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = dirname(fileURLToPath(import.meta.url));
const presets = ['default', 'quiet-ink', 'warm-paper', 'workbench'];
const runs = presets.map(preset => {
  const report = JSON.parse(readFileSync(resolve(directory, preset, 'smoke-report.json'), 'utf8'));
  return {
    preset, status: report.status, report: `${preset}/smoke-report.json`,
    counts: report.counts, browserErrors: report.errors.length,
    consoleErrors: report.consoleErrors.length,
    appearanceInk: report.assertions.find(item => item.name === 'Paper appearance text uses the effective skin ink'),
  };
});
const totals = Object.fromEntries(['passed', 'failed', 'inspectionSamples', 'nestedBorders', 'hairlineSeparators', 'forcedHoverTargets']
  .map(key => [key, runs.reduce((sum, run) => sum + run.counts[key], 0)]));
const summary = {
  status: runs.every(run => run.status === 'passed' && run.appearanceInk?.pass && run.browserErrors === 0 && run.consoleErrors === 0) ? 'passed' : 'failed',
  syntheticOnly: true, persistenceCoverage: false, presets: runs.length,
  uniqueOverlayTypes: 8, runs, totals,
};
writeFileSync(resolve(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ status: summary.status, totals }, null, 2));
if (summary.status !== 'passed') process.exitCode = 1;
