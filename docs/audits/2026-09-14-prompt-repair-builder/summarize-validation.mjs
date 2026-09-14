import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const runs = readdirSync(directory, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^(?:targeted|gates|server-full|server-full-serial|typechecks|closeout)-20/.test(entry.name))
  .map(entry => {
    const path = join(entry.name, 'summary.json');
    return { path: path.replaceAll('\\', '/'), ...JSON.parse(readFileSync(join(directory, path), 'utf8')) };
  });
const latest = mode => runs.filter(run => run.mode === mode).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
const serial = latest('server-full-serial');
assert.ok(serial?.finishedAt, 'Wait for the serial full-suite run to finish');
const testSteps = serial.steps.filter(step => step.label.endsWith('.test.ts'));
assert.deepEqual(testSteps.map(step => step.label).sort(), [...serial.selectedTestFiles].sort());
assert.deepEqual([...serial.selectedTestFiles].sort(), [...serial.serverDiscoveredTestFiles].sort());
assert.equal(new Set(testSteps.map(step => step.label)).size, testSteps.length);
const counts = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
  .map(key => [key, testSteps.reduce((sum, step) => sum + (step.counts[key] ?? 0), 0)]));
const promptRuns = runs.filter(run => run.mode === 'targeted'
  && run.selectedTestFiles.length === 1 && run.selectedTestFiles[0].endsWith('/v14ContextHint.test.ts'));
const prompt = promptRuns.sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
const report = {
  finalPrompt: { summary: prompt.path, ...prompt.steps.at(-1).counts, exitCode: prompt.steps.at(-1).exitCode },
  typechecks: { summary: latest('typechecks').path, passed: latest('typechecks').steps.filter(step => step.exitCode === 0).length, total: latest('typechecks').steps.length },
  runtimeGates: { summary: latest('gates').path, passed: latest('gates').steps.filter(step => step.exitCode === 0).length - 1, total: latest('gates').steps.length - 1, extra: 'shared build also passed', hqPending: latest('gates').hqPending },
  client: latest('gates').steps.find(step => step.label === 'test:unit').counts,
  finalServer: {
    summary: serial.path, completeFileCoverage: true, discoveredFiles: serial.serverDiscoveredTestFiles.length,
    executedFiles: testSteps.length, passingFiles: testSteps.filter(step => step.exitCode === 0).length,
    counts, failedFiles: testSteps.filter(step => step.exitCode !== 0).map(step => ({ file: step.label, log: step.log, counts: step.counts })),
    note: 'Counts are observed TAP results; a module-load failure does not enumerate that file\'s child tests. No tests excluded. Root scripts/generate-tool-face-manifest.test.ts ran separately in runtime gates (10/10).',
  },
  priorAggregateFailures: runs.filter(run => run.mode === 'server-full').map(run => ({ summary: run.path, ...run.steps.at(-1).counts })),
  finalCloseout: latest('closeout') ? { summary: latest('closeout').path, passed: latest('closeout').executedStepsPassed } : null,
};
writeFileSync(join(directory, 'validation-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
