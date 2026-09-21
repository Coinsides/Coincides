import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test, { type TestContext } from 'node:test';
import { discoverScenarios, loadScenario } from './discovery.js';
import { runScenario } from './harness.js';
import { cleanEnvironment, createIsolation } from './isolation.js';
import { parseOptions } from './options.js';
import { RecordedResponse } from './routes.js';
import { markdownScoreboard, readScoreboard, summarizeScenario } from './scoreboard.js';
import emptyClaim from './scenarios/02-empty-claim.js';
import type { AssertionResult, Row, ScenarioResult, TurnRecord } from './types.js';

const execFileAsync = promisify(execFile);
const serverDirectory = fileURLToPath(new URL('../../', import.meta.url));

function temporaryDirectory(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'agent-eval-selftest-'));
  const actual = realpathSync(directory);
  const within = relative(realpathSync(tmpdir()), actual);
  assert.ok(within && !isAbsolute(within) && within !== '..' && !within.startsWith(`..${sep}`));
  t.after(() => {
    assert.equal(realpathSync(directory), actual, 'cleanup targets only the allocated fixture');
    rmSync(actual, { recursive: true, force: true });
  });
  return directory;
}

const validModule = `export default {
  name: 'synthetic-registration', dimensions: ['task_completion'], setup() {},
  turns: [{ user: 'synthetic', script() { return []; } }], assertions() {}
};`;

test('scenario discovery sees the six shipped files and registers an added file without an index edit', async t => {
  const shipped = discoverScenarios();
  assert.ok(shipped.length >= 6);
  const names = await Promise.all(shipped.map(async path => (await loadScenario(path)).name));
  assert.equal(new Set(names).size, shipped.length);
  const prefixes = shipped.map(path => basename(path).slice(0, 2));
  for (const prefix of ['01', '02', '03', '04', '05', '06']) assert.ok(prefixes.includes(prefix));
  const directory = temporaryDirectory(t);
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
  writeFileSync(join(directory, 'README.md'), 'Not a scenario');
  mkdirSync(join(directory, 'nested.ts'));
  assert.throws(() => discoverScenarios(directory), /No scenarios discovered/);
  const first = join(directory, '20-first.ts');
  writeFileSync(first, validModule);
  assert.deepEqual(discoverScenarios(directory), [first]);
  assert.equal((await loadScenario(first)).name, 'synthetic-registration');
  const added = join(directory, '10-added.ts');
  writeFileSync(added, validModule.replace('synthetic-registration', 'added-without-registry'));
  assert.deepEqual(discoverScenarios(directory), [added, first]);
  assert.equal((await loadScenario(added)).name, 'added-without-registry');
});

test('malformed scenario modules are rejected before execution', async t => {
  const directory = temporaryDirectory(t);
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
  const invalid = [
    'export default null;',
    validModule.replace("name: 'synthetic-registration'", "name: ' '"),
    validModule.replace("dimensions: ['task_completion']", 'dimensions: []'),
    validModule.replace('setup() {}', 'setup: null'),
    validModule.replace("turns: [{ user: 'synthetic', script() { return []; } }]", 'turns: []'),
    validModule.replace("user: 'synthetic'", 'user: 42'),
    validModule.replace('script() { return []; }', 'script: null'),
    validModule.replace('assertions() {}', 'assertions: null'),
  ];
  for (const [index, source] of invalid.entries()) {
    const path = join(directory, `invalid-${index}.ts`);
    writeFileSync(path, source);
    await assert.rejects(loadScenario(path), /Invalid scenario module/);
  }
});

test('explicit scripted-only fixture scenarios permit zero provider turns', async t => {
  const directory = temporaryDirectory(t);
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
  const file = join(directory, 'zero-turns.ts');
  writeFileSync(file, validModule.replace("turns: [{ user: 'synthetic', script() { return []; } }]", 'scriptedOnly: true, turns: []'));
  const scenario = await loadScenario(file);
  assert.deepEqual(scenario.turns, []);
  assert.equal(scenario.scriptedOnly, true);
});

test('CLI defaults to scripted and distinguishes live, dry-run, list and selected scenarios', () => {
  assert.deepEqual(parseOptions([]), { mode: 'scripted', dryRun: false, list: false, selected: [] });
  assert.deepEqual(parseOptions(['--dry-run', '--scenario', '02-empty-claim']),
    { mode: 'scripted', dryRun: true, list: false, selected: ['02-empty-claim'] });
  assert.deepEqual(parseOptions(['--live', '--dry-run', '--scenario', '01-goal-task-journey', '--scenario', '03-proposal-journey']),
    { mode: 'live', dryRun: true, list: false, selected: ['01-goal-task-journey', '03-proposal-journey'] });
  assert.equal(parseOptions(['--list']).list, true);
  for (const args of [['--scenario'], ['--scenario', '--live'], ['--unknown']]) {
    assert.throws(() => parseOptions(args), /Unknown or incomplete option/);
  }
});

test('live dry-run and list never spawn a worker, fetch, or read the machine credential store', async t => {
  const directory = temporaryDirectory(t);
  const sentinel = join(directory, 'forbidden-machine-store');
  const guard = join(directory, 'dry-run-guard.mjs');
  writeFileSync(guard, `
    import fs from 'node:fs';
    import childProcess from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    const forbiddenStore = ${JSON.stringify(sentinel)};
    const originalRead = fs.readFileSync;
    fs.readFileSync = function(path, ...args) {
      if (String(path).includes(forbiddenStore) || String(path).includes('provider-credentials.json')) {
        throw new Error('dry-run attempted credential access');
      }
      return originalRead.call(this, path, ...args);
    };
    childProcess.spawn = () => { throw new Error('dry-run attempted worker execution'); };
    globalThis.fetch = async () => { throw new Error('dry-run attempted network'); };
    syncBuiltinESMExports();
  `);
  for (const flag of ['--dry-run', '--list']) {
    const { stdout } = await execFileAsync(process.execPath, ['--import', 'tsx', '--import', pathToFileURL(guard).href,
      fileURLToPath(new URL('./runner.ts', import.meta.url)), '--live', flag, '--scenario', '02-empty-claim'],
    { cwd: serverDirectory, windowsHide: true,
      env: { ...cleanEnvironment(process.env), COINCIDES_APP_DATA_DIR: sentinel } });
    const plan = JSON.parse(stdout);
    assert.equal(plan.mode, 'live');
    assert.equal(plan.dryRun, flag === '--dry-run');
    assert.equal(plan.provider, 'dashscope');
    assert.deepEqual(plan.scenarios, ['02-empty-claim']);
    assert.match(plan.credentials, /not read by dry-run/);
    assert.equal(existsSync(sentinel), false);
  }
});

test('environment allowlist retains OS essentials but drops inherited keys, loaders and database paths', () => {
  const source = { Path: 'synthetic-path', SystemRoot: 'synthetic-windows', TEMP: 'synthetic-temp', TZ: 'UTC',
    OPENAI_API_KEY: 'old-key', ANTHROPIC_AUTH_TOKEN: 'old-key', DASHSCOPE_API_KEY: 'old-key',
    NODE_OPTIONS: '--require forbidden', DB_PATH: 'forbidden-user.db', DOTENV_CONFIG_PATH: 'forbidden.env',
    COINCIDES_APP_DATA_DIR: 'forbidden-store', SOURCE_BLOB_DIR: 'forbidden-blobs', RANDOM_SECRET: 'old-secret' };
  assert.deepEqual(cleanEnvironment(source), {
    Path: 'synthetic-path', SystemRoot: 'synthetic-windows', TEMP: 'synthetic-temp', TZ: 'UTC',
  });
  assert.equal(source.OPENAI_API_KEY, 'old-key', 'scrubbing does not mutate its caller');
});

test('two scripted isolations have short synthetic keys, empty dotenv and exclusive assets without cross-contamination', () => {
  const source = { ...cleanEnvironment(process.env), OPENAI_API_KEY: 'inherited-key', NODE_OPTIONS: '--require forbidden',
    COINCIDES_APP_DATA_DIR: 'forbidden-store', DB_PATH: 'forbidden-user.db' };
  const first = createIsolation('scripted', source);
  const second = createIsolation('scripted', source);
  try {
    assert.notEqual(first.directory, second.directory);
    for (const isolation of [first, second]) {
      assert.equal(isolation.env.DB_PATH, ':memory:');
      assert.equal(isolation.env.NODE_OPTIONS, undefined);
      assert.ok(isolation.env.OPENAI_API_KEY && isolation.env.OPENAI_API_KEY.length <= 20);
      assert.notEqual(isolation.env.OPENAI_API_KEY, source.OPENAI_API_KEY);
      assert.equal(readFileSync(isolation.env.DOTENV_CONFIG_PATH!, 'utf8'), '');
      for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'VOYAGE_API_KEY', 'GENERIC_API_KEY', 'DEEPSEEK_API_KEY', 'DASHSCOPE_API_KEY']) {
        assert.equal(isolation.env[key], '');
      }
      const directories = ['CANVAS_ASSET_DIR', 'SOURCE_BLOB_DIR', 'UPLOAD_DIR', 'DOCUMENT_UPLOAD_DIR', 'COINCIDES_APP_DATA_DIR']
        .map(key => isolation.env[key]!);
      assert.equal(new Set(directories).size, directories.length);
      for (const path of directories) {
        const within = relative(isolation.directory, path);
        assert.ok(within && !isAbsolute(within) && !within.startsWith('..'));
        assert.equal(existsSync(path), true);
      }
    }
    writeFileSync(join(first.env.CANVAS_ASSET_DIR!, 'marker'), 'first only');
    assert.equal(existsSync(join(second.env.CANVAS_ASSET_DIR!, 'marker')), false);
    assert.equal(source.DB_PATH, 'forbidden-user.db');
  } finally {
    first.cleanup();
    second.cleanup();
  }
  assert.equal(existsSync(first.directory), false);
  assert.equal(existsSync(second.directory), false);
});

test('live isolation only preserves the configured store path and never reads it during setup', () => {
  const isolation = createIsolation('live', { COINCIDES_APP_DATA_DIR: 'synthetic-nonexistent-store',
    DASHSCOPE_API_KEY: 'inherited-key', OPENAI_API_KEY: 'inherited-key' });
  try {
    assert.equal(isolation.env.COINCIDES_APP_DATA_DIR, 'synthetic-nonexistent-store');
    assert.equal(isolation.env.DASHSCOPE_API_KEY, '');
    assert.equal(isolation.env.OPENAI_API_KEY, '');
    assert.equal(isolation.env.DB_PATH, ':memory:');
    assert.equal(readFileSync(isolation.env.DOTENV_CONFIG_PATH!, 'utf8'), '');
  } finally { isolation.cleanup(); }
});

test('SSE recording preserves raw chunks and decodes fragmented and multiple frames without losing fields', () => {
  const receipt = { write_calls: [{ name: 'save_memory', ok: true }], read_calls: [], write_ok_count: 1, write_fail_count: 0 };
  const raw = `event: text\ndata: {"content":"中文段落"}\n\nevent: tool_end\ndata: {"id":"call-1","name":"save_memory","ok":true}\n\nevent: turn_receipt\ndata: ${JSON.stringify(receipt)}\n\nevent: done\ndata: {}\n\n`;
  const response = new RecordedResponse();
  const chunks = [raw.slice(0, 15), raw.slice(15, 55), raw.slice(55)];
  for (const chunk of chunks) response.write(chunk);
  response.end();
  assert.deepEqual(response.writes, chunks);
  assert.equal(response.writes.join(''), raw);
  assert.deepEqual(response.events.map(({ type, data }) => ({ type, data })), [
    { type: 'text', data: { content: '中文段落' } },
    { type: 'tool_end', data: { id: 'call-1', name: 'save_memory', ok: true } },
    { type: 'turn_receipt', data: receipt }, { type: 'done', data: {} },
  ]);
  assert.ok(response.events.every((event, index, events) => event.elapsedMs >= 0
    && (index === 0 || event.elapsedMs >= events[index - 1].elapsedMs)));
  assert.throws(() => response.write('late'), /cannot write after close/);
});

test('SSE recording rejects an incomplete frame instead of silently discarding evidence', () => {
  const response = new RecordedResponse();
  response.write('event: tool_end\ndata: {"id":"unfinished"}');
  assert.throws(() => response.end(), /complete frames/);
});

function turn(overrides: Partial<TurnRecord> = {}): TurnRecord {
  return { user: 'synthetic', events: [], rawSse: '', durationMs: 0, providerRounds: 999,
    messages: [], tables: {}, ledger: [], api: { history: [], proposals: [], memories: [], receipts: [] }, ...overrides };
}
function scoreFixture(): ScenarioResult {
  const claim = { seq: 1, verb: 'claim_without_receipt' };
  const otherEvent = { seq: 2, verb: 'goal_created' };
  const assistant = (ids: string[]): Row => ({ role: 'assistant', tool_calls: JSON.stringify(ids.map(id => ({ id, name: 'create_goal' }))) });
  return { name: 'synthetic|score', mode: 'scripted', dimensions: ['task_completion'],
    assertions: [{ name: 'passed-1', passed: true }, { name: 'passed-2', passed: true },
      { name: 'missing|evidence', passed: false, error: 'missing\nrow' }],
    durationMs: 42.125, finalTables: { events: [claim, otherEvent] },
    turns: [
      turn({ durationMs: 12.25, ledger: [claim], tables: { events: [claim] },
        messages: [assistant(['a', 'b']), { role: 'assistant', content: 'text only' }],
        events: [{ type: 'tool_start', data: { name: 'ignored', ok: false }, elapsedMs: 120000 },
          { type: 'tool_end', data: { id: 'a', name: 'create_goal', ok: false }, elapsedMs: 120000 },
          { type: 'tool_end', data: { id: 'b', name: 'create_goal', ok: true }, elapsedMs: 120000 }] }),
      turn({ durationMs: 18.5, ledger: [claim, otherEvent], tables: { events: [claim, otherEvent] },
        messages: [assistant(['c']), { role: 'user', tool_results: '[]' }, assistant(['d'])],
        events: [{ type: 'tool_end', data: { id: 'c', name: 'search_documents', ok: false }, elapsedMs: 120000 },
          { type: 'tool_end', data: { id: 'd', name: 'create_goal', ok: true }, elapsedMs: 120000 }] }),
    ] };
}

test('scoreboard uses final ledger once, groups failed tool_end, and separates actual durations and tool/user rounds', () => {
  const result = scoreFixture();
  const summary = summarizeScenario(result);
  assert.deepEqual(summary.taskCompletion, { passed: 2, total: 3, rate: 2 / 3 });
  assert.equal(summary.claimWithoutReceiptCount, 1, 'cumulative per-turn ledger snapshots are not summed');
  assert.deepEqual(summary.toolMisuse, { count: 2, byTool: { create_goal: 1, search_documents: 1 } });
  assert.deepEqual(summary.timing, { userTurns: 2, toolRounds: 3, durationMs: 42.125,
    turns: [{ durationMs: 12.25, toolRounds: 1 }, { durationMs: 18.5, toolRounds: 2 }] });
  const second = scoreFixture();
  second.name = 'second';
  second.assertions = [{ name: 'passed', passed: true }];
  second.finalTables.events = [];
  second.turns = [result.turns[0]];
  second.durationMs = 7.875;
  const scoreboard = readScoreboard('synthetic-run', [result, second]);
  assert.deepEqual(Object.keys(scoreboard).sort(), ['schemaVersion', 'runId', 'scenarios', 'taskCompletion', 'claimWithoutReceiptCount', 'toolMisuse', 'timing'].sort());
  assert.equal(scoreboard.schemaVersion, 1);
  assert.deepEqual(scoreboard.taskCompletion, { passed: 3, total: 4, rate: 0.75 });
  assert.equal(scoreboard.claimWithoutReceiptCount, 1);
  assert.deepEqual(scoreboard.toolMisuse, { count: 3, byTool: { create_goal: 2, search_documents: 1 } });
  assert.deepEqual(scoreboard.timing, { userTurns: 3, toolRounds: 4, durationMs: 50 });
  assert.equal(JSON.stringify(scoreboard).includes('hallucination'), false);
  const markdown = markdownScoreboard(scoreboard);
  assert.ok(markdown.includes('synthetic\\|score'));
  assert.ok(markdown.includes('missing\\|evidence'));
  assert.ok(markdown.includes('missing row'));
  assert.match(markdown, /3\/4/);
});

test('empty assertion populations have null rates and execution failures remain visible', () => {
  const empty = readScoreboard('empty', []);
  assert.deepEqual(empty.taskCompletion, { passed: 0, total: 0, rate: null });
  assert.deepEqual(empty.timing, { userTurns: 0, toolRounds: 0, durationMs: 0 });
  const result = scoreFixture();
  result.assertions = [];
  assert.equal(summarizeScenario(result).taskCompletion.rate, null);
  result.assertions = [{ name: 'scenario-execution', passed: false, error: 'corrupt evidence' }];
  result.executionError = 'corrupt evidence';
  const failed = readScoreboard('failed', [result]);
  assert.equal(failed.taskCompletion.rate, 0);
  assert.equal(failed.scenarios[0].executionError, 'corrupt evidence');
  assert.equal(failed.scenarios[0].failures.length, 1);
  assert.match(markdownScoreboard(failed), /corrupt evidence/);
});

test('tool failure aggregation treats prototype property names as ordinary tool names', () => {
  const result = scoreFixture();
  result.turns = [turn({ events: ['__proto__', 'constructor', 'toString', '__proto__'].map((name, index) => ({
    type: 'tool_end', data: { id: `odd-${index}`, name, ok: false }, elapsedMs: index,
  })) })];
  const summary = summarizeScenario(result);
  assert.equal(summary.toolMisuse.count, 4);
  assert.deepEqual(summary.toolMisuse.byTool, Object.fromEntries([
    ['__proto__', 2], ['constructor', 1], ['toString', 1],
  ]));
  assert.equal(Object.getPrototypeOf(summary.toolMisuse.byTool), Object.prototype);
  assert.equal(Object.hasOwn(summary.toolMisuse.byTool, '__proto__'), true);
  const combined = readScoreboard('unusual-tool-names', [result, { ...result, name: 'second' }]);
  assert.equal(combined.toolMisuse.count, 8);
  assert.deepEqual(combined.toolMisuse.byTool, Object.fromEntries([
    ['__proto__', 4], ['constructor', 2], ['toString', 2],
  ]));
  assert.deepEqual(JSON.parse(JSON.stringify(combined)).toolMisuse, combined.toolMisuse);
});

test('unevaluated live evidence keeps null task rate while preserving observed events and transport failures', () => {
  // This is a reader fixture only: no live provider, credential lookup or harness invocation.
  const result: ScenarioResult = { ...scoreFixture(), mode: 'live', scenarioAssertionsEvaluated: false,
    assertions: [{ name: 'transport receipt', passed: true },
      { name: 'transport incomplete', passed: false, error: 'incomplete SSE' }] };
  const score = readScoreboard('live-readout-only', [result]);
  assert.deepEqual(score.taskCompletion, { passed: 0, total: 0, rate: null });
  const summary = score.scenarios[0];
  assert.equal(summary.scenarioAssertionsEvaluated, false);
  assert.deepEqual(summary.taskCompletion, { passed: 0, total: 0, rate: null });
  assert.match(summary.notEvaluatedReason!, /controlled scenario assertions require scripted mode/);
  assert.equal(score.claimWithoutReceiptCount, 1);
  assert.equal(score.toolMisuse.count, 2);
  assert.equal(score.timing.userTurns, 2);
  assert.equal(score.timing.toolRounds, 3);
  assert.deepEqual(summary.failures, [result.assertions[1]]);
  assert.match(markdownScoreboard(score), /场景断言未评估，完成率为 null/);
  assert.match(markdownScoreboard(score), /incomplete SSE/);
  const mixed = readScoreboard('mixed-readout', [result, scoreFixture()]);
  assert.deepEqual(mixed.taskCompletion, { passed: 2, total: 3, rate: 2 / 3 });
});

test('real empty-claim journey turns red when its collected claim event is removed', async () => {
  const mutated: AssertionResult[] = [];
  const result = await runScenario({ ...emptyClaim, async assertions(ctx) {
    await emptyClaim.assertions(ctx);
    const damagedTurns = structuredClone(ctx.turns);
    damagedTurns[0].tables.events = [];
    damagedTurns[0].ledger = [];
    await emptyClaim.assertions({ ...ctx, turns: damagedTurns, async check(name, assertion) {
      try { await assertion(); mutated.push({ name, passed: true }); }
      catch (error) { mutated.push({ name, passed: false, error: String(error) }); }
    } });
  } });
  assert.equal(result.executionError, undefined);
  assert.ok(result.assertions.length > 0 && result.assertions.every(assertion => assertion.passed),
    JSON.stringify(result.assertions.filter(assertion => !assertion.passed)));
  assert.equal(mutated.filter(assertion => !assertion.passed).length, 1);
  assert.equal(mutated.find(assertion => !assertion.passed)?.name, 'one anchored claim_without_receipt ledger event');
  const damaged = readScoreboard('missing-claim', [{ ...result, assertions: mutated, finalTables: { ...result.finalTables, events: [] } }]);
  assert.ok(damaged.taskCompletion.rate! < 1);
  assert.equal(damaged.claimWithoutReceiptCount, 0);
  assert.equal(damaged.scenarios[0].failures.length, 1);
});
