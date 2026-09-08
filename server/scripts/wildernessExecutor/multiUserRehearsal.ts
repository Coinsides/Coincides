import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { createMultiUserSyntheticBuffer, PRODUCTION_POSITIVE_IDS } from './synthetic.js';
import { readCoordinateContract } from '../../src/services/coordinateContract.js';
import { encode, TABLES, tableHash, type ExecutionReport } from './executor.js';
import type { readPreview } from '../v13WildernessExecute.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = process.argv[2];
assert.ok(output && path.basename(output).includes('合成'), 'Explicit synthetic audit basename required');
assert.equal(process.argv.length, 3, 'Rehearsal accepts only an audit basename, never a database path');
const base = path.resolve(root, output);
assert.equal(path.dirname(base), path.join(root, 'docs', 'audits'));
assert.ok(!existsSync(base + '.json') && !existsSync(base + '.md'));
const folder = mkdtempSync(path.join(tmpdir(), 'coincides-s4b-multi-rehearsal-'));
const database = path.join(folder, 'synthetic.sqlite');
const poisonDatabase = path.join(folder, 'synthetic-poison.sqlite');
writeFileSync(database, createMultiUserSyntheticBuffer());
const intermediate: string[] = [];
const childEnv = { ...process.env };
delete childEnv.NODE_OPTIONS;
let sequence = 0;
type Preview = ReturnType<typeof readPreview>;
const users = ['s0-other', 's0-user'];
function invoke(action: 'preview' | 'execute' | 'rollback', scope: string[], reject = false,
  target = database, expectedError?: string) {
  const name = `docs/audits/s4b-合成-multi-${path.basename(folder)}-${sequence++}`;
  const files = [path.join(root, name + '.json'), path.join(root, name + '.md')];
  intermediate.push(...files);
  const before = readFileSync(target);
  // Exercise both repeated flags and comma lists, and reverse the rollback arguments.
  const scopeArgs = action === 'rollback' ? ['--user', [...scope].reverse().join(',')]
    : scope.flatMap(user => ['--user', user]);
  let status = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/v13WildernessExecute.ts', '--db', target,
      ...scopeArgs, '--out', name, ...(action === 'preview' ? [] : [`--${action}`])],
    { cwd: path.join(root, 'server'), env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).toString();
  } catch (error) {
    status = (error as { status: number }).status;
    stderr = (error as { stderr: Buffer }).stderr.toString();
  }
  assert.equal(status, reject ? 1 : 0);
  if (expectedError) assert.ok(stderr.includes(expectedError));
  if (action === 'preview' || reject) assert.deepEqual(readFileSync(target), before);
  if (reject) return undefined;
  const markdown = readFileSync(files[1], 'utf8');
  for (const user of scope) assert.ok(markdown.includes(`## 用户 ${user}`));
  const report = JSON.parse(readFileSync(files[0], 'utf8'));
  if (action === 'execute') {
    const summary = report.users.reduce((s: number[], u: ExecutionReport['users'][number]) =>
      [s[0] + u.invariants.checked, s[1] + u.changes.filter(c => c.destination === 'tray').length, s[2] + u.exceptions.length], [0, 0, 0]);
    assert.equal(stdout.trim().split(/\r?\n/).at(-1), `normalized=${summary[0]}; tray=${summary[1]}; exceptions=${summary[2]}`);
  }
  return report;
}
try {
  invoke('execute', ['s0-user'], true);
  const preview = invoke('preview', users) as Preview;
  const first = invoke('execute', users) as ExecutionReport;
  const post = invoke('preview', users) as Preview;
  invoke('rollback', ['s0-user'], true);
  const undone = invoke('rollback', users) as ExecutionReport;
  const restored = invoke('preview', users) as Preview;
  const second = invoke('execute', users) as ExecutionReport;
  assert.deepEqual(first.hashes.before, undone.hashes.after);
  assert.deepEqual(first.hashes.after, second.hashes.after);
  for (const [i, user] of users.entries()) {
    const r = first.users[i];
    assert.equal(r.scopeUserId, user);
    assert.equal(preview.users[i].evidence.censusSha256, restored.users[i].evidence.censusSha256);
    assert.equal(r.after.censusSha256, post.users[i].evidence.censusSha256);
    assert.equal(r.after.censusSha256, second.users[i].after.censusSha256);
    assert.equal(undone.users[i].after.censusSha256, r.before.censusSha256);
    assert.ok(r.conservation.every(c => c.ok));
    assert.ok(r.changes.every(c => c.original.user_id === user));
    assert.equal(r.invariants.formalExceptions, 0);
  }
  assert.equal(first.users[0].invariants.checked, 1);
  assert.equal(first.users[0].changes[0].destination, 'normalized');
  assert.ok(first.users[1].invariants.checked >= 20);
  const positives = first.users[1].changes.filter(c => ['local', 'cross-note', ...PRODUCTION_POSITIVE_IDS].includes(c.id));
  assert.equal(positives.length, 5);
  for (const c of positives) {
    assert.equal(c.solution?.status, 'normalized');
    if (c.solution?.status !== 'normalized') throw new Error('positive rejected');
    assert.deepEqual(c.solution.beforeHydrated, c.solution.afterHydrated);
    assert.equal(c.solution.afterHydrated.surface, 'formal_page');
    if (c.id === 'production-source-x152') {
      assert.equal(c.solution.candidate.x, 0);
      assert.equal(c.solution.candidate.y, 0);
      assert.equal(c.solution.candidate.width, 650);
      assert.deepEqual(c.solution.beforeHydrated.screen, { x: 0, y: 176, width: 650, height: 72 });
    }
  }
  const db = new Database(database, { readonly: true });
  let finalHashes: Record<string, string>;
  let events: unknown[];
  try {
    assert.equal(readCoordinateContract(db), 'v2');
    events = db.prepare('SELECT user_id,verb,seq FROM events ORDER BY seq').all();
    for (const user of users) assert.deepEqual(db.prepare('SELECT verb FROM events WHERE user_id=? ORDER BY seq').all(user),
      [{ verb: 'migrated' }, { verb: 'rolled_back' }, { verb: 'migrated' }]);
    assert.deepEqual(db.prepare("SELECT surface,y FROM canvas_placements WHERE id='foreign-placement'").get(), { surface: 'formal_page', y: 10 });
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    finalHashes = Object.fromEntries(TABLES.map(t => [t, tableHash(db, t)]));
    assert.deepEqual(finalHashes, second.hashes.after);
  } finally { db.close(); }
  // Poison a COPY of the restored synthetic generation. It carries real rehearsal
  // events and archived backups; a failed fresh generation must preserve all bytes.
  writeFileSync(poisonDatabase, readFileSync(database));
  invoke('rollback', users, false, poisonDatabase);
  const poison = new Database(poisonDatabase);
  try {
    poison.exec(`UPDATE canvas_placements SET x=10000,metadata='{}'
      WHERE surface='formal_page' AND user_id='s0-user'
        AND object_id IN (SELECT id FROM canvas_objects WHERE kind<>'page_frame')`);
  } finally { poison.close(); }
  invoke('execute', users, true, poisonDatabase, 'FAILED: normalization_rate_anomaly');
  const summary = (report: ExecutionReport, details = false) => ({ action: report.action, scopeUserIds: report.scopeUserIds,
    hashes: report.hashes, backups: report.backups, users: report.users.map(u => ({ scopeUserId: u.scopeUserId,
      beforeCensus: u.before.censusSha256, afterCensus: u.after.censusSha256, conservation: u.conservation,
      invariants: u.invariants, eventSeq: u.eventSeq,
      ...(details ? { changes: u.changes, exceptions: u.exceptions } : {}) })) });
  const artifact = { version: 'v13.2-s4b-addendum4-synthetic-rehearsal', synthetic: true, result: 'PASS',
    fixture: 'S3 full spectrum + 24 negative-local controls (explicit Custom frames) + 3 A4 production positives; second user has one formal paragraph and one structural frame, frame_id=f1 scoped by user/note',
    actions: ['single-user execute refused', 'two-user preview', 'execute', 'preview', 'single-user rollback refused', 'rollback', 'preview', 'execute'],
    incompleteExecuteZeroWrite: true, incompleteRollbackZeroWrite: true, previewsByteIdentical: true,
    rollbackCensusAndTablesExact: true, repeatExecutionExact: true, finalContract: 'v2', finalHashes, events,
    productionPositives: positives, fuse: { error: 'FAILED: normalization_rate_anomaly', zeroWrite: true,
      fixture: 'copy of synthetic generation after rollback; all main-user formal rows become untagged x=10000; raw screen candidates can pass while hydrated surface changes',
      priorEventsAndArchivedBackupsByteIdentical: true },
    executions: [summary(first, true), summary(undone), summary(second)] };
  writeFileSync(base + '.json', JSON.stringify(encode(artifact), null, 2) + '\n', { flag: 'wx' });
  const lines = [
    '> **状态 (Status)**: frozen', '> **层 (Layer)**: 审计 / 合成双用户演练', '> **日期 (Updated)**: 2026-09-08',
    '> **权威 (Authoritative)**: 否；合成机械验证，不是用户库迁移放行', '',
    '# V13.2 单 4b 补遗四 · 合成双用户全链、生产阳性与保险丝', '',
    '**PASS**：独立 CLI 子进程实跑。主户 S3 全谱 + 24 行负 local 对照 + 三条 A4 生产同构阳性；S3/S4 小帧显式声明 Custom，保持既定几何。副户 1 条 formal 正文 + 1 条 page_frame 结构行，未预置 tray。',
    '单用户 execute 拒绝且库文件逐字节不变 → 双用户预览 → 执行 → 复测 → 单用户 rollback 拒绝且库文件逐字节不变 → 双用户回滚 → 复测还原 → 再执行。',
    '全部预览零写；多用户共用单事务、一套三表只读备份和一次翻旗，各户各记事件。执行使用重复 --user，回滚使用反序逗号列表。', '',
    ...first.users.flatMap((u, i) => [`## 用户 ${u.scopeUserId}`, '',
      `逐 note 三表守恒 ${u.conservation.length}/${u.conservation.length}；hydration 屏显/归属复验 normalized=${u.invariants.checked}；tray=${u.changes.filter(c => c.destination === 'tray').length}；exceptions=${u.exceptions.length}；formal 例外 0；成功率=${u.invariants.checked}/${u.invariants.formalCandidates}。`,
      `事件：${u.eventSeq} migrated → ${undone.users[i].eventSeq} rolled_back → ${second.users[i].eventSeq} migrated。`,
      `回滚 census 与执行前全等；再执行 census 与首次执行后全等。before=${u.before.censusSha256}；after=${u.after.censusSha256}。`,
      '| note | unit | before | after | exact |', '| --- | --- | --- | --- | --- |',
      ...u.conservation.map(c => `| ${c.note} | ${c.unit} | ${c.before} | ${c.after} | ${c.ok} |`), '',
    ]),
    '## 全库核验与复跑', '',
    '回滚后三表 SHA-256 全等，再执行终态全等；终态 v2、每户各三条事件、foreign_key_check 为空。local/cross-note 分别为 y=-210/-2010 并保留 formal，副户正文按自身帧归一 y=10。',
    'Source 生产同构 canvas_world (152,176,650,72) → (0,0,650,72)，hydration 屏显保持 (0,176,650,72)，formal 保持；普通非零原点两例也逐位相等。全部成功数来自 hydration 后裁尺，world/raw screen 不作为终审。',
    '正文重放先复用生产存储投影（含现役读侧四轴取整），再接旧探针的真实 hydration→4a screen 链；候选落库不取整。generic 使用自己的现役投影→渲染 rect；同用户/同 note 完整帧上下文及 print baseline 同步重放。边界标签保留诊断，不额外要求不变。',
    '保险丝在另一个自产合成副本中实跑：回滚后把主户 formal 行改成无标签 x=10000；新候选导致 hydration 表面变化。CLI exit=1，明确 FAILED: normalization_rate_anomaly；整个库文件逐字节不变，含之前的 events、归档备份、旗标和本次所有改写。',
    '所有变更原值、例外原因、hydration 裁尺证据、各户 census 指纹及三表指纹见同名 JSON。旧备份归档保留，不覆盖；CLI 末行 normalized/tray/exceptions 已逐数断言。',
    '`cd server` 后运行 `node --import tsx scripts/wildernessExecutor/multiUserRehearsal.ts docs/audits/<新名称-合成双用户>`。只自产临时合成库，不接受用户库参数。',
    '未接触用户库、未读 .env、未打印 key、未调用网络服务或操作 3001/5173；不代表真实迁移或主观放行。', '',
  ];
  writeFileSync(base + '.md', lines.join('\n'), { flag: 'wx' });
  console.log(JSON.stringify({ result: 'PASS', synthetic: true, users: users.length,
    conserved: first.users.map(u => u.conservation.length), checked: first.users.map(u => u.invariants.checked),
    exceptions: first.users.map(u => u.exceptions.length), incompleteScopeZeroWrite: true, rollbackExact: true, repeatExact: true }));
} finally {
  for (const file of intermediate) if (existsSync(file)) unlinkSync(file);
  if (existsSync(poisonDatabase)) unlinkSync(poisonDatabase);
  unlinkSync(database); rmdirSync(folder);
}
