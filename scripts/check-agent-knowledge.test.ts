import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  MANUAL_PATH,
  buildKnowledgeFingerprint,
  canonicalizeKnowledgeFacts,
  collectKnowledgeFacts,
  diffKnowledgeFacts,
  hashKnowledgeFacts,
  parseKnowledgeFingerprint,
  readManualStamp,
  type KnowledgeFacts,
} from './check-agent-knowledge.js';
import { TOOL_REGISTRY } from '../server/src/toolFace/registry.js';
import { DOOR_WRITE_TOOLS, CHANNEL_WRITE_TOOLS, READ_TOOLS } from '../server/src/agent/tools/effectClassification.js';
import { toolDefinitions } from '../server/src/agent/tools/definitions.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_ROOT = resolve(REPO_ROOT, '.codex-tmp/2026-09-14-knowledge-version-builder/gate');
mkdirSync(RAW_ROOT, { recursive: true });
// Four distinct synthetic tool names in this suite; zero credentials or database users.
const FACTS: KnowledgeFacts = {
  registryNames: ['probe_write', 'probe_read'],
  effects: { doorWrite: ['probe_write'], channelWrite: ['probe_channel'], read: ['probe_read'] },
  toolDefinitionNames: ['probe_write', 'probe_read', 'probe_channel'],
};
const STAMP = { path: MANUAL_PATH, version: 'v1', updated: '2026-09-14' } as const;
const ORIGINAL_MANUAL = '> **状态 (Status)**: active(v1,2026-09-14 Henry 令建;操作应用前必读)\n> **层 (Layer)**: 现状\n\n# 说明书 v1\n\n正文。\n';

function cloneFacts(): KnowledgeFacts {
  return JSON.parse(JSON.stringify(FACTS));
}

function fixture(label: string, initialize = true) {
  const root = mkdtempSync(join(RAW_ROOT, `${label}-`));
  const manualPath = join(root, 'manual.md');
  const fingerprintPath = join(root, 'fingerprint.json');
  const factsPath = join(root, 'facts.json');
  const runnerPath = join(root, 'runner.mjs');
  writeFileSync(manualPath, ORIGINAL_MANUAL, 'utf8');
  writeFileSync(factsPath, JSON.stringify(FACTS), 'utf8');
  if (initialize) writeFileSync(fingerprintPath, JSON.stringify(buildKnowledgeFingerprint(FACTS, STAMP), null, 2), 'utf8');
  // Invoke the production parser and exact file gate in a separate process;
  // authority/path injection is only through the exported test seam, never CLI flags.
  writeFileSync(runnerPath, [
    "import { readFileSync } from 'node:fs';",
    `import * as gate from ${JSON.stringify(pathToFileURL(resolve(REPO_ROOT, 'scripts/check-agent-knowledge.ts')).href)};`,
    'const runAgentKnowledgeCli = gate.runAgentKnowledgeCli ?? gate.default.runAgentKnowledgeCli;',
    'const [manualPath, fingerprintPath, factsPath, ...args] = process.argv.slice(2);',
    'process.exitCode = await runAgentKnowledgeCli(args, { manualPath, fingerprintPath, loadFacts: () => JSON.parse(readFileSync(factsPath, "utf8")) });',
    '',
  ].join('\n'), 'utf8');
  let commandCount = 0;
  return {
    manualPath,
    fingerprintPath,
    setFacts: (facts: KnowledgeFacts) => writeFileSync(factsPath, JSON.stringify(facts), 'utf8'),
    run: (...args: string[]) => {
      const result = spawnSync(process.execPath, ['--import', 'tsx', runnerPath, manualPath, fingerprintPath, factsPath, ...args], {
        cwd: resolve(REPO_ROOT, 'server'), encoding: 'utf8', timeout: 30_000,
      });
      writeFileSync(join(root, `cli-${++commandCount}.log`), `args=${JSON.stringify(args)}\nexit=${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`, 'utf8');
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      return { code: result.status, output: `${result.stdout}${result.stderr}` };
    },
  };
}

test('stable hash ignores name order, repeated set members, and property insertion order', () => {
  const reordered = {
    toolDefinitionNames: ['probe_channel', 'probe_write', 'probe_read', 'probe_read'],
    effects: { read: ['probe_read'], channelWrite: ['probe_channel'], doorWrite: ['probe_write'] },
    registryNames: ['probe_read', 'probe_write', 'probe_write'],
  };
  assert.deepEqual(canonicalizeKnowledgeFacts(reordered), canonicalizeKnowledgeFacts(FACTS));
  assert.equal(hashKnowledgeFacts(reordered), hashKnowledgeFacts(FACTS));
  assert.match(hashKnowledgeFacts(FACTS), /^[a-f0-9]{64}$/);
});

test('every authoritative set participates in the hash', async t => {
  for (const source of ['registryNames', 'doorWrite', 'channelWrite', 'read', 'toolDefinitionNames'] as const) {
    await t.test(source, () => {
      const modified = cloneFacts();
      if (source === 'registryNames' || source === 'toolDefinitionNames') modified[source] = [...modified[source], 'probe_new'];
      else modified.effects[source] = [...modified.effects[source], 'probe_new'];
      assert.notEqual(hashKnowledgeFacts(modified), hashKnowledgeFacts(FACTS));
      assert.deepEqual(diffKnowledgeFacts(FACTS, modified).map(change => change.added), [['probe_new']]);
    });
  }
});

test('moving a name across effect groups changes the hash even when the union is unchanged', () => {
  const modified = cloneFacts();
  modified.effects.read = [];
  modified.effects.channelWrite = ['probe_channel', 'probe_read'];
  assert.notEqual(hashKnowledgeFacts(modified), hashKnowledgeFacts(FACTS));
  assert.deepEqual(diffKnowledgeFacts(FACTS, modified).map(({ added, removed }) => ({ added, removed })), [
    { added: ['probe_read'], removed: [] }, { added: [], removed: ['probe_read'] },
  ]);
});

test('deletion and simultaneous replacement report exits as well as entries', () => {
  const modified = cloneFacts();
  modified.registryNames = ['probe_read', 'probe_new'];
  assert.deepEqual(diffKnowledgeFacts(FACTS, modified), [
    { source: '注册表 TOOL_REGISTRY', added: ['probe_new'], removed: ['probe_write'] },
  ]);
  assert.notEqual(hashKnowledgeFacts(modified), hashKnowledgeFacts(FACTS));
});

test('manual snapshot reads the current active status header, including BOM/CRLF', () => {
  assert.deepEqual(readManualStamp(`\uFEFF${ORIGINAL_MANUAL.replaceAll('\n', '\r\n')}`), STAMP);
  assert.deepEqual(readManualStamp('> **状态 (Status)**: active\n> **版本 (Version)**: v2.1\n> **日期 (Updated)**: 2026-09-15\n\n# 说明书\n'), {
    path: MANUAL_PATH, version: 'v2.1', updated: '2026-09-15',
  });
});

test('body edits cannot supply or advance the manual status stamp', () => {
  assert.deepEqual(readManualStamp(`${ORIGINAL_MANUAL}\n> **版本 (Version)**: v2\n> **日期 (Updated)**: 2026-09-15\n`), STAMP);
  assert.throws(() => readManualStamp('> **状态 (Status)**: active\n\n# v2\n2026-09-15'), /说明书快照/);
});

test('inactive, missing, duplicate, or invalid-date status headers fail closed', () => {
  for (const text of [
    ORIGINAL_MANUAL.replace('active(', 'draft('),
    ORIGINAL_MANUAL.replace('状态 (Status)', '其他'),
    ORIGINAL_MANUAL.replace('2026-09-14', '2026-02-30'),
    `> **状态 (Status)**: active(v2,2026-09-15)\n${ORIGINAL_MANUAL}`,
  ]) assert.throws(() => readManualStamp(text));
});

test('snapshot stores readable facts and manual stamp but hashes facts independently of the stamp', () => {
  const baseline = buildKnowledgeFingerprint(FACTS, STAMP);
  const newer = buildKnowledgeFingerprint(FACTS, { ...STAMP, version: 'v2' });
  assert.equal(baseline.hash, newer.hash);
  assert.deepEqual(Object.keys(baseline), ['schemaVersion', 'algorithm', 'hash', 'facts', 'manual']);
  assert.deepEqual(parseKnowledgeFingerprint(JSON.stringify(baseline)), baseline);
});

test('actual authority collection equals imported registry, effect classes and exposed definitions', async () => {
  const facts = await collectKnowledgeFacts();
  assert.deepEqual(facts, canonicalizeKnowledgeFacts({
    registryNames: TOOL_REGISTRY.map(tool => tool.name),
    effects: { doorWrite: [...DOOR_WRITE_TOOLS], channelWrite: [...CHANNEL_WRITE_TOOLS], read: [...READ_TOOLS] },
    toolDefinitionNames: toolDefinitions.map(tool => tool.name),
  }));
});

test('CLI three states: synthetic new registry name red; stamp plus explicit update green; unchanged green', () => {
  const state = fixture('three-state');
  const original = readFileSync(state.fingerprintPath, 'utf8');
  const modified = cloneFacts();
  modified.registryNames = [...modified.registryNames, 'probe_new'];
  state.setFacts(modified);

  const red = state.run();
  assert.equal(red.code, 1);
  assert.match(red.output, /注册表 TOOL_REGISTRY: 进入 \[probe_new\]; 退出 \[无\]/);
  assert.match(red.output, /版本\/日期戳未更新/);
  assert.match(red.output, /补说明书条目或申报无涉后更新指纹/);
  assert.equal(readFileSync(state.fingerprintPath, 'utf8'), original);

  const deniedUpdate = state.run('--update');
  assert.equal(deniedUpdate.code, 1);
  assert.match(deniedUpdate.output, /--update 不能绕过/);
  assert.equal(readFileSync(state.fingerprintPath, 'utf8'), original);

  writeFileSync(state.manualPath, ORIGINAL_MANUAL.replace('active(v1,2026-09-14', 'active(v2,2026-09-15'), 'utf8');
  const stillNeedsExplicitUpdate = state.run();
  assert.equal(stillNeedsExplicitUpdate.code, 1);
  assert.match(stillNeedsExplicitUpdate.output, /说明书戳已更新, 但知识指纹仍旧/);
  assert.equal(readFileSync(state.fingerprintPath, 'utf8'), original);

  const greenUpdate = state.run('--update');
  assert.equal(greenUpdate.code, 0);
  assert.match(greenUpdate.output, /\[PASS\] 知识指纹已显式更新/);
  const updated = readFileSync(state.fingerprintPath, 'utf8');
  const snapshot = parseKnowledgeFingerprint(updated);
  assert.equal(snapshot.manual.version, 'v2');
  assert.equal(snapshot.manual.updated, '2026-09-15');
  assert.equal(snapshot.hash, hashKnowledgeFacts(modified));

  const greenCheck = state.run();
  assert.equal(greenCheck.code, 0);
  assert.match(greenCheck.output, /\[PASS\] Agent 知识事实无漂移/);
  assert.equal(readFileSync(state.fingerprintPath, 'utf8'), updated);
});

test('CLI accepts either a version or date stamp advance with explicit update', () => {
  for (const [label, manual] of [
    ['version-only', ORIGINAL_MANUAL.replace('active(v1,', 'active(v2,')],
    ['date-only', ORIGINAL_MANUAL.replace('2026-09-14', '2026-09-15')],
  ]) {
    const state = fixture(label);
    const modified = cloneFacts();
    modified.registryNames = ['probe_read'];
    state.setFacts(modified);
    writeFileSync(state.manualPath, manual, 'utf8');
    const result = state.run('--update');
    assert.equal(result.code, 0);
    assert.match(result.output, /进入 \[无\]; 退出 \[probe_write\]/);
  }
});

test('CLI initializes missing baseline only through explicit update', () => {
  const state = fixture('missing', false);
  assert.equal(state.run().code, 1);
  assert.equal(existsSync(state.fingerprintPath), false);
  assert.equal(state.run('--update').code, 0);
  assert.equal(parseKnowledgeFingerprint(readFileSync(state.fingerprintPath, 'utf8')).hash, hashKnowledgeFacts(FACTS));
});

test('CLI rejects corrupt baseline even during explicit update', () => {
  const state = fixture('corrupt');
  const corrupt = JSON.stringify({ ...buildKnowledgeFingerprint(FACTS, STAMP), hash: '0'.repeat(64) });
  writeFileSync(state.fingerprintPath, corrupt, 'utf8');
  const result = state.run('--update');
  assert.equal(result.code, 1);
  assert.match(result.output, /hash 与已存事实不符/);
  assert.equal(readFileSync(state.fingerprintPath, 'utf8'), corrupt);
});

test('CLI rejects unknown arguments and cannot choose alternate CLI facts or paths', () => {
  const state = fixture('arguments');
  const original = readFileSync(state.fingerprintPath, 'utf8');
  for (const args of [['--fixture'], ['--update', '--update'], ['--manual', state.manualPath]]) {
    const result = state.run(...args);
    assert.equal(result.code, 1);
    assert.match(result.output, /用法:/);
    assert.equal(readFileSync(state.fingerprintPath, 'utf8'), original);
  }
});

test('CLI leaves baseline bytes untouched when only the manual body or stamp changes', () => {
  const state = fixture('manual-only');
  const original = readFileSync(state.fingerprintPath, 'utf8');
  writeFileSync(state.manualPath, `${ORIGINAL_MANUAL.replace('active(v1,', 'active(v2,')}\n正文更新。\n`, 'utf8');
  assert.equal(state.run().code, 0);
  assert.equal(readFileSync(state.fingerprintPath, 'utf8'), original);
});
