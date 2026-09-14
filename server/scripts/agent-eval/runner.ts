import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverScenarios } from './discovery.js';
import { cleanEnvironment } from './isolation.js';
import { parseOptions } from './options.js';
import { markdownScoreboard, readScoreboard } from './scoreboard.js';
import type { ScenarioResult } from './types.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = fileURLToPath(new URL('../../', import.meta.url));

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const discovered = discoverScenarios();
  const requested = options.selected;
  for (const id of requested) {
    if (!discovered.some(path => basename(path, '.ts') === id)) throw new Error(`Unknown scenario: ${id}`);
  }
  const selected = discovered.filter(path => !requested.length || requested.includes(basename(path, '.ts')));
  const plan = { schemaVersion: 1, mode: options.mode, dryRun: options.dryRun,
    scenarioAssertionsEvaluated: options.mode === 'scripted',
    provider: options.mode === 'live' ? 'dashscope' : 'scripted OpenAIProvider.chat',
    credentials: options.mode === 'live' ? 'existing machine store (not read by dry-run)' : 'short synthetic only',
    database: ':memory: per scenario worker', dotenv: 'empty file', assets: 'exclusive temporary directories',
    collection: { sse: 'existing agent POST route bytes', api: ['history', 'proposals', 'memories', 'receipts'],
      events: 'isolated SQLite events ledger (no existing HTTP read endpoint)' },
    scenarios: selected.map(path => basename(path, '.ts')) };
  if (options.dryRun || options.list) { console.log(JSON.stringify(plan, null, 2)); return; }
  const runId = `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${randomUUID().slice(0, 8)}`;
  const outputDirectory = join(root, '.eval-runs', runId);
  const logDirectory = join(root, '.codex-tmp', 'agent-eval-builder', runId);
  mkdirSync(outputDirectory, { recursive: true });
  mkdirSync(logDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, 'run.json'), JSON.stringify({ ...plan, runId }, null, 2) + '\n');
  const results: ScenarioResult[] = [];
  for (const path of selected) {
    const id = basename(path, '.ts');
    const resultPath = join(outputDirectory, `${id}.json`);
    const env = cleanEnvironment(process.env);
    if (options.mode === 'live' && process.env.COINCIDES_APP_DATA_DIR) env.COINCIDES_APP_DATA_DIR = process.env.COINCIDES_APP_DATA_DIR;
    const log = createWriteStream(join(logDirectory, `${id}.log`));
    let code: number | null = null;
    try {
      code = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./worker.ts', import.meta.url)),
          path, resultPath, options.mode], { cwd: server, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        child.stdout.pipe(log, { end: false });
        child.stderr.pipe(log, { end: false });
        child.once('error', reject);
        child.once('close', code => resolve(code));
      });
      const result = JSON.parse(readFileSync(resultPath, 'utf8')) as ScenarioResult;
      if (!result.assertions?.length || !Array.isArray(result.turns)) throw new Error('Incomplete worker result');
      if (code !== 0 && !result.assertions.some(assertion => !assertion.passed)) throw new Error(`Worker exit ${code} without a recorded failure`);
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed: ScenarioResult = { name: id, mode: options.mode, scenarioAssertionsEvaluated: options.mode === 'scripted', dimensions: [], assertions: [
        { name: 'worker-execution', passed: false, error: message }], turns: [], durationMs: 0, finalTables: {}, executionError: message };
      results.push(failed);
      writeFileSync(resultPath, JSON.stringify(failed, null, 2) + '\n');
    } finally {
      await new Promise<void>(resolve => log.end(resolve));
    }
    const last = results.at(-1)!;
    console.log(`${id}: ${last.assertions.filter(assertion => assertion.passed).length}/${last.assertions.length}`);
  }
  const names = results.map(result => result.name);
  if (new Set(names).size !== names.length) throw new Error('Scenario names must be unique');
  const score = readScoreboard(runId, results);
  writeFileSync(join(outputDirectory, 'scoreboard.json'), JSON.stringify(score, null, 2) + '\n');
  writeFileSync(join(outputDirectory, 'scoreboard.md'), markdownScoreboard(score));
  console.log(`Scoreboard: ${outputDirectory}`);
  if ((options.mode === 'scripted' && score.taskCompletion.total === 0)
    || score.taskCompletion.passed !== score.taskCompletion.total
    || results.some(result => result.executionError || result.assertions.some(assertion => !assertion.passed))) process.exitCode = 1;
}

main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
