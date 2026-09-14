#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MANUAL_PATH = 'docs/agent-ops/current-state/app-operating-manual.md';
export const FINGERPRINT_PATH = 'docs/agent-ops/current-state/agent-knowledge-fingerprint.json';

export interface KnowledgeFacts {
  registryNames: readonly string[];
  effects: {
    doorWrite: readonly string[];
    channelWrite: readonly string[];
    read: readonly string[];
  };
  toolDefinitionNames: readonly string[];
}

export interface ManualStamp {
  path: typeof MANUAL_PATH;
  version: string;
  updated: string;
}

export interface KnowledgeFingerprint {
  schemaVersion: 1;
  algorithm: 'sha256';
  hash: string;
  facts: KnowledgeFacts;
  manual: ManualStamp;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必须为对象`);
  }
  return value as Record<string, unknown>;
}

function nameSet(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(name => typeof name !== 'string'
    || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
    throw new Error(`${label} 必须为工具名数组`);
  }
  return [...new Set(value as string[])].sort();
}

/** Hash name sets, never object order, descriptions, timestamps, or schemas. */
export function canonicalizeKnowledgeFacts(value: unknown): KnowledgeFacts {
  const facts = record(value, 'facts');
  const effects = record(facts.effects, 'facts.effects');
  return {
    registryNames: nameSet(facts.registryNames, 'facts.registryNames'),
    effects: {
      doorWrite: nameSet(effects.doorWrite, 'facts.effects.doorWrite'),
      channelWrite: nameSet(effects.channelWrite, 'facts.effects.channelWrite'),
      read: nameSet(effects.read, 'facts.effects.read'),
    },
    toolDefinitionNames: nameSet(facts.toolDefinitionNames, 'facts.toolDefinitionNames'),
  };
}

export function hashKnowledgeFacts(facts: KnowledgeFacts): string {
  return createHash('sha256').update(JSON.stringify(canonicalizeKnowledgeFacts(facts)), 'utf8').digest('hex');
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateManualStamp(value: unknown): ManualStamp {
  const stamp = record(value, 'manual');
  if (stamp.path !== MANUAL_PATH || typeof stamp.version !== 'string'
    || !/^v\d+(?:\.\d+)*$/.test(stamp.version) || !validDate(stamp.updated)) {
    throw new Error('说明书快照须含固定路径、vN 版本和有效 YYYY-MM-DD 日期');
  }
  return { path: MANUAL_PATH, version: stamp.version, updated: stamp.updated };
}

/** Only the front status header counts; a version/date in body text cannot acknowledge drift. */
export function readManualStamp(text: string): ManualStamp {
  const header = text.replace(/^\uFEFF/, '').split(/^#{1,6}\s/m, 1)[0];
  const statusLines = [...header.matchAll(/^>\s*\*\*(?:状态(?:\s*\(Status\))?|Status)\*\*\s*[:：]\s*(.+)$/gmi)];
  if (statusLines.length !== 1 || !/^active(?=$|[\s(（])/.test(statusLines[0][1])) {
    throw new Error('说明书状态头必须且只能含一条 active 状态');
  }
  const status = statusLines[0][1];
  const versionLine = header.match(/^>\s*\*\*(?:版本(?:\s*\(Version\))?|Version)\*\*\s*[:：]\s*(v\d+(?:\.\d+)*)\b/mi);
  const dateLine = header.match(/^>\s*\*\*(?:日期(?:\s*\(Updated\))?|Updated)\*\*\s*[:：]\s*(\d{4}-\d{2}-\d{2})\b/mi);
  return validateManualStamp({
    path: MANUAL_PATH,
    version: versionLine?.[1] ?? status.match(/\bv\d+(?:\.\d+)*\b/)?.[0],
    updated: dateLine?.[1] ?? status.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0],
  });
}

export function buildKnowledgeFingerprint(facts: KnowledgeFacts, manual: ManualStamp): KnowledgeFingerprint {
  const canonicalFacts = canonicalizeKnowledgeFacts(facts);
  return {
    schemaVersion: 1,
    algorithm: 'sha256',
    hash: hashKnowledgeFacts(canonicalFacts),
    facts: canonicalFacts,
    manual: validateManualStamp(manual),
  };
}

export function parseKnowledgeFingerprint(text: string): KnowledgeFingerprint {
  const parsed = record(JSON.parse(text), '指纹');
  if (parsed.schemaVersion !== 1 || parsed.algorithm !== 'sha256') {
    throw new Error('不支持的知识指纹格式; 请保留对照物并由维护者核查');
  }
  const expected = buildKnowledgeFingerprint(canonicalizeKnowledgeFacts(parsed.facts), validateManualStamp(parsed.manual));
  if (parsed.hash !== expected.hash) throw new Error('知识指纹 hash 与已存事实不符; 拒绝自动覆盖对照物');
  return expected;
}

export interface KnowledgeDifference {
  source: string;
  added: string[];
  removed: string[];
}

export function diffKnowledgeFacts(before: KnowledgeFacts, after: KnowledgeFacts): KnowledgeDifference[] {
  const previous = canonicalizeKnowledgeFacts(before);
  const current = canonicalizeKnowledgeFacts(after);
  const groups: Array<[string, readonly string[], readonly string[]]> = [
    ['注册表 TOOL_REGISTRY', previous.registryNames, current.registryNames],
    ['门内写 effectClassification.doorWrite', previous.effects.doorWrite, current.effects.doorWrite],
    ['信道写 effectClassification.channelWrite', previous.effects.channelWrite, current.effects.channelWrite],
    ['读器 effectClassification.read', previous.effects.read, current.effects.read],
    ['暴露 toolDefinitions', previous.toolDefinitionNames, current.toolDefinitionNames],
  ];
  return groups.map(([source, oldNames, newNames]) => ({
    source,
    added: newNames.filter(name => !oldNames.includes(name)),
    removed: oldNames.filter(name => !newNames.includes(name)),
  })).filter(change => change.added.length > 0 || change.removed.length > 0);
}

/** Import current authorities. No registry parsing, copied inventory, DB, or provider calls. */
export async function collectKnowledgeFacts(): Promise<KnowledgeFacts> {
  const [{ TOOL_REGISTRY }, effects, { toolDefinitions }] = await Promise.all([
    import('../server/src/toolFace/registry.js'),
    import('../server/src/agent/tools/effectClassification.js'),
    import('../server/src/agent/tools/definitions.js'),
  ]);
  effects.assertToolEffectCoverage(toolDefinitions);
  return canonicalizeKnowledgeFacts({
    registryNames: TOOL_REGISTRY.map(tool => tool.name),
    effects: {
      doorWrite: [...effects.DOOR_WRITE_TOOLS],
      channelWrite: [...effects.CHANNEL_WRITE_TOOLS],
      read: [...effects.READ_TOOLS],
    },
    toolDefinitionNames: toolDefinitions.map(tool => tool.name),
  });
}

export interface KnowledgeCheckOptions {
  manualPath?: string;
  fingerprintPath?: string;
  loadFacts?: () => KnowledgeFacts | Promise<KnowledgeFacts>;
  log?: (message: string) => void;
  error?: (message: string) => void;
}

/** CLI and tests share this exact file gate. The production CLI has no fixture/path override. */
export async function runAgentKnowledgeCli(args: readonly string[], options: KnowledgeCheckOptions = {}): Promise<number> {
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  try {
    if (args.length > 1 || (args.length === 1 && args[0] !== '--update')) {
      throw new Error('用法: npm run check:agent-knowledge [-- --update]');
    }
    const update = args[0] === '--update';
    const manualPath = options.manualPath ?? resolve(REPO_ROOT, MANUAL_PATH);
    const fingerprintPath = options.fingerprintPath ?? resolve(REPO_ROOT, FINGERPRINT_PATH);
    const manual = readManualStamp(readFileSync(manualPath, 'utf8'));
    const current = buildKnowledgeFingerprint(await (options.loadFacts ?? collectKnowledgeFacts)(), manual);
    const baseline = existsSync(fingerprintPath)
      ? parseKnowledgeFingerprint(readFileSync(fingerprintPath, 'utf8'))
      : undefined;

    if (!baseline) {
      if (!update) throw new Error('知识指纹缺失; 核对说明书后显式运行 npm run check:agent-knowledge -- --update 建立基线');
      writeFileSync(fingerprintPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
      log(`[PASS] 知识指纹已显式建立: ${current.hash}; 说明书 ${manual.version} / ${manual.updated}`);
      return 0;
    }

    const changes = diffKnowledgeFacts(baseline.facts, current.facts);
    const stampChanged = baseline.manual.version !== manual.version || baseline.manual.updated !== manual.updated;
    if (changes.length > 0) {
      for (const change of changes) {
        log(`[DIFF] ${change.source}: 进入 [${change.added.join(', ') || '无'}]; 退出 [${change.removed.join(', ') || '无'}]`);
      }
      if (!stampChanged) {
        throw new Error(`能力事实已漂移, 说明书状态头版本/日期戳未更新 (${manual.version} / ${manual.updated}); 补说明书条目或申报无涉后更新指纹。--update 不能绕过未更新的戳。`);
      }
      if (!update) throw new Error('说明书戳已更新, 但知识指纹仍旧; 补说明书条目或申报无涉后更新指纹: npm run check:agent-knowledge -- --update');
    }

    if (update) {
      writeFileSync(fingerprintPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
      log(`[PASS] 知识指纹已显式更新: ${current.hash}; 说明书 ${manual.version} / ${manual.updated}`);
    } else {
      log(`[PASS] Agent 知识事实无漂移: ${current.hash}; 说明书 ${manual.version} / ${manual.updated}`);
    }
    return 0;
  } catch (cause) {
    error(`[FAIL] ${cause instanceof Error ? cause.message : String(cause)}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAgentKnowledgeCli(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
