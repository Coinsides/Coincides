import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { createExecutorSyntheticBuffer } from './synthetic.js';
import { readCoordinateContract } from '../../src/services/coordinateContract.js';
import { encode, TABLES, tableHash, type ExecutionReport, type UserExecutionReport } from './executor.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = process.argv[2];
assert.ok(output && path.basename(output).includes('合成'), 'Explicit synthetic audit basename required');
const base = path.resolve(root, output);
assert.equal(path.dirname(base), path.join(root, 'docs', 'audits'));
assert.ok(!existsSync(base + '.json') && !existsSync(base + '.md'));
const folder = mkdtempSync(path.join(tmpdir(), 'coincides-s4b-rehearsal-'));
const database = path.join(folder, 'synthetic.sqlite');
writeFileSync(database, createExecutorSyntheticBuffer());
const intermediate: string[] = [];
const childEnv = { ...process.env };
delete childEnv.NODE_OPTIONS;
const reports: Array<Record<string, any>> = [];
try {
  for (const [i, action] of ['preview', 'execute', 'preview', 'rollback', 'preview', 'execute'].entries()) {
    const name = `docs/audits/s4b-合成-rehearsal-${path.basename(folder)}-${i}`;
    intermediate.push(path.join(root, name + '.json'), path.join(root, name + '.md'));
    const before = action === 'preview' ? readFileSync(database) : undefined;
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/v13WildernessExecute.ts', '--db', database,
      '--user', 's0-user', '--out', name, ...(action === 'preview' ? [] : [`--${action}`])],
    { cwd: path.join(root, 'server'), env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    if (before) assert.deepEqual(readFileSync(database), before);
    const report = JSON.parse(readFileSync(path.join(root, name + '.json'), 'utf8'));
    reports.push({ ...report, ...report.users[0] });
  }
  const [preview, first, post, undone, restored, second] = reports;
  assert.equal(preview.evidence.censusSha256, restored.evidence.censusSha256);
  assert.equal(first.after.censusSha256, post.evidence.censusSha256);
  assert.equal(first.after.censusSha256, second.after.censusSha256);
  assert.deepEqual(first.hashes.before, undone.hashes.after);
  assert.deepEqual(first.hashes.after, second.hashes.after);
  assert.ok(first.invariants.checked >= 20);
  for (const id of ['local', 'cross-note', 'production-source-x152', 'production-local-72-96', 'production-local-54-112']) {
    const change = first.changes.find((c: { id: string }) => c.id === id);
    assert.equal(change.destination, 'normalized');
    assert.deepEqual(change.solution.beforeHydrated, change.solution.afterHydrated);
    assert.equal(change.solution.afterHydrated.surface, 'formal_page');
  }
  assert.equal(first.changes.find((c: { id: string }) => c.id === 'production-source-x152').solution.candidate.x, 0);
  const db = new Database(database, { readonly: true });
  let finalHashes: Record<string, string>;
  try {
    assert.equal(readCoordinateContract(db), 'v2');
    assert.deepEqual(db.prepare('SELECT verb FROM events ORDER BY seq').all(),
      [{ verb: 'migrated' }, { verb: 'rolled_back' }, { verb: 'migrated' }]);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    finalHashes = Object.fromEntries(TABLES.map(t => [t, tableHash(db, t)]));
  } finally { db.close(); }
  type SingleReport = UserExecutionReport & Pick<ExecutionReport, 'action' | 'hashes' | 'backups'>;
  const summary = (r: SingleReport) => ({ action: r.action, beforeCensus: r.before.censusSha256,
    afterCensus: r.after.censusSha256, hashes: r.hashes, conservation: r.conservation,
    invariants: r.invariants, eventSeq: r.eventSeq, backups: r.backups,
    exceptions: r.exceptions, normalized: r.changes.filter(c => c.solution?.status === 'normalized') });
  const artifact = { version: 'v13.2-s4b-addendum4-synthetic-rehearsal', synthetic: true,
    result: 'PASS', actions: ['preview', 'execute', 'preview', 'rollback', 'preview', 'execute'],
    previewUnchanged: true, rollbackCensusExact: true, repeatExecutionExact: true, finalContract: 'v2', finalHashes,
    fixture: { source: 'S3 createSyntheticBuffer (all original cases retained)',
      additions: '054/055/056 + real 040/041/042 dependencies + 24 exact controls O=(0,220), explicit Custom geometry for S3/S4 frames, and 3 production A4 positives including full-width Source',
      scopedExecutionAdjustment: 'foreign-placement starts in tray; unchanged original foreign formal/workspace are tested as preflight refusal',
      localAndCrossNote: 'original S3 placement rows unchanged; normalized y=-210/-2010, formal and hydrated screen preserved' },
    executions: [summary(first as SingleReport), summary(undone as SingleReport), summary(second as SingleReport)] };
  writeFileSync(base + '.json', JSON.stringify(encode(artifact), null, 2) + '\n', { flag: 'wx' });
  const lines = [
    '> **状态 (Status)**: frozen', '> **层 (Layer)**: 审计 / 合成全谱演练', '> **日期 (Updated)**: 2026-09-08',
    '> **权威 (Authoritative)**: 否；合成机械验证，不是用户库迁移放行', '',
    '# V13.2 单 4b · 合成全谱迁移与回滚核对单', '',
    '**PASS**：独立 CLI 子进程实跑预览→执行→复测→回滚→复测→再执行；每次均明确 --db/--user/--out。',
    `预览文件字节不变；${first.conservation.length} 项逐 note 三表身份守恒全部全等；${first.invariants.checked} 行归一后 hydration 屏显与归属逐位复验；formal 例外=0。`,
    `执行事件=${first.eventSeq} migrated；回滚事件=${undone.eventSeq} rolled_back；再执行事件=${second.eventSeq} migrated。终态 v2，foreign_key_check 无问题。`, '',
    '## 样本射程与处置', '',
    'S3 全谱保留：world/local/mixed/second、cross-note、inside/crossing/outside、各类画物与 mount、mixed-surface/unplaced、legacy-only/dual、缺帧/坏帧/重复帧、多栈、无标签、非法 JSON、文本/Infinity 坐标。另加 24 行 O=(0,220) 对照及真实扩展表依赖；S3/S4 小帧显式声明 Custom 保留既定几何。新增三条 A4 生产同构阳性（两种非零原点 local、Source canvas_world）。',
    '多用户范围前置测试使用原 S3 foreign formal 行，验证拒绝全库翻旗；本执行 fixture 仅将该外用户行预置 tray。该差异是合成造样，不是执行器越界改写；原 local/cross-note 两行完整保留。',
    'pageOffsetX=0 来自现役 getPrimaryPageOffsetX(page)。旧停线探针的 offset=O.x 只用于隔离纵轴，不用于本次归一裁判。', '',
    '正文先复用生产存储投影（含现役读侧四轴取整），再重放 hydration→4a screen；候选落库不取整。generic 对象复用自己的现役投影与渲染 rect。完整同 note/user 帧上下文和 print baseline 参与重放。', '',
    '| 原行 | 内容原点 | 结果 | 原因 |', '| --- | --- | --- | --- |',
    '| local (10,10) | (110,220) | (10,-210), formal | hydration 屏显与归属全等 |',
    '| cross-note (10,10) | (1010,2020) | (10,-2010), formal | 按 note 绑定各自 frame，未串帧 |',
    '| Source (152,176), width=650 | (152,176) | (0,0), formal | canvas_world 候选通过完整 hydration 裁尺 |',
    '| s4-exact-0 (-5,0.25) | (0,220) | local=(-5,-219.75) | 负 x/y 不 clamp、不取整，hydration 屏显与归属全等 |', '',
    `normalized=${first.invariants.checked}；tray=${first.changes.filter((c: { destination: string }) => c.destination === 'tray').length}；exceptions=${first.exceptions.length}；formal candidates=${first.invariants.formalCandidates}；成功率=${first.invariants.normalizationRate}。全部原值、异常原因、hydration 前后证据、守恒明细与三表 SHA-256 见同名 JSON（Infinity 使用 $sqliteNumber 保真编码）。`,
    'tray 在同 note 既有 order_index 后追尾；画物/mount 由关联 placement 承载去处，object/mount 原始行保持不变。', '',
    '## 回滚与再执行', '',
    '三表原位全列恢复，使用 SQLite 内部取值，避免 64 位整数经 JS 舍入；不 DELETE/REPLACE object，不触发扩展表级联删除。回滚前拒绝提交后数据/扩展表漂移。',
    '回滚后三表 SHA-256 与首次执行前完全相等，S3 同 SQL census 全等；只读备份按 rolled_back 事件 seq 归档保留。再执行创建新一代固定名备份，旧备份不覆盖。',
    `执行前 census SHA-256：${preview.evidence.censusSha256}`, `执行后/再执行 census SHA-256：${first.after.censusSha256}`, '',
    '## 复跑', '',
    '`cd server` 后运行 `node --import tsx scripts/wildernessExecutor/rehearsal.ts docs/audits/<新名称-合成>`。仅自产临时合成库，不接受用户库参数。',
    '验证范围不含用户库、UI 主观走查或扳机日放行；未读取 .env、未调用网络服务或操作 3001/5173。', '',
  ];
  writeFileSync(base + '.md', lines.join('\n'), { flag: 'wx' });
  console.log(JSON.stringify({ result: artifact.result, synthetic: true, conserved: first.conservation.length,
    checked: first.invariants.checked, exceptions: first.exceptions.length, rollbackExact: true, repeatExact: true }));
} finally {
  for (const file of intermediate) if (existsSync(file)) unlinkSync(file);
  unlinkSync(database); rmdirSync(folder);
}
