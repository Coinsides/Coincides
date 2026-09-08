import { closeSync, existsSync, openSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { readShadowReport } from './wildernessShadow/census.js';
import { renderMarkdown } from './wildernessShadow/report.js';
import { execute, rollback, encode, normalizeUsers, type ExecutionReport } from './wildernessExecutor/executor.js';

export interface Options { database: string; users: string[]; output: string; action: 'preview' | 'execute' | 'rollback' }
export function parseArgs(args: string[]): Options {
  const values = new Map<string, string>();
  const users: string[] = [];
  let action: Options['action'] = 'preview';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--execute' || arg === '--rollback') && action === 'preview') {
      action = arg === '--execute' ? 'execute' : 'rollback'; continue;
    }
    if (!['--db', '--user', '--out'].includes(arg) || values.has(arg) || !args[i + 1]?.trim()
      || args[i + 1].startsWith('--')) throw new Error('executor_invalid_arguments');
    if (arg === '--user') users.push(args[++i]);
    else values.set(arg, args[++i]);
  }
  if (!values.get('--db') || !users.length || !values.get('--out')) throw new Error('executor_explicit_arguments_required');
  return { database: values.get('--db')!, users: normalizeUsers(users), output: values.get('--out')!, action };
}
function outputPaths(output: string) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const audits = path.join(root, 'docs', 'audits');
  const base = path.resolve(root, output);
  if (path.dirname(base) !== audits || path.basename(base).startsWith('.') || /\.(md|json|db|sqlite)$/i.test(base)
    || realpathSync(audits) !== path.join(realpathSync(root), 'docs', 'audits')) throw new Error('executor_invalid_output');
  const files = { json: base + '.json', markdown: base + '.md' };
  if (Object.values(files).some(existsSync)) throw new Error('executor_output_exists');
  return files;
}
const cell = (value: unknown) => String(value).replace(/[|\r\n]/g, ' ');
export function renderExecution(report: ExecutionReport): string {
  return [
    '> **状态 (Status)**: frozen', '> **层 (Layer)**: 审计 / 显式执行收据',
    '> **权威 (Authoritative)**: 否；机械核对单，不是用户迁移放行', '',
    `# V13.2 单 4b · ${report.action} 核对单`, '',
    `scopes=${report.scopeUserIds.map(cell).join(', ')}；全部用户共用一次事务、一套全表备份与一次旗标切换。`,
    '归一以现役 page offset=0 的 4a world/screen 双尺严格相等为准。没有 ε、clamp 或取整。负 local 合法。',
    '三表分别计数；object/mount 去处由 placement 承载，内容与身份行不改写。原始值全量见同名 JSON；非有限数以 $sqliteNumber 保真编码。', '',
    ...report.users.flatMap(user => [
      `## 用户 ${cell(user.scopeUserId)}`, '', `event seq=${user.eventSeq}。`,
      `三表逐 note 身份守恒=${user.conservation.every(c => c.ok)}；复验=${user.invariants.checked}；formal 例外=${user.invariants.formalExceptions}。`, '',
      '| note | unit | before | after | original | tray | exact |', '| --- | --- | --- | --- | --- | --- | --- |',
      ...user.conservation.map(c => `| ${cell(c.note)} | ${c.unit} | ${c.before} | ${c.after} | ${c.original} | ${c.tray} | ${c.ok} |`), '',
      '| placement | destination | reason |', '| --- | --- | --- |',
      ...user.changes.map(c => `| ${cell(c.id)} | ${c.destination} | ${c.reason} |`), '',
      `before census: ${user.before.censusSha256}`, `after census: ${user.after.censusSha256}`, '',
    ]),
    '## 共享备份', '',
    '备份（回滚后归档保留，固定名仅在回滚核验成功后释放）：', ...report.backups.map(b => `- ${b}`), '',
  ].join('\n');
}
export function readPreview(db: Database.Database, scope: string | readonly string[]) {
  const scopeUserIds = normalizeUsers(scope);
  // Outer transaction keeps all users on one read snapshot; S3 retains its own read-only guard.
  return db.transaction(() => ({ version: 'v13.2-s4b-multi-user-preview', scopeUserIds,
    users: scopeUserIds.map(user => readShadowReport(db, user, 'explicit_readonly_database')) }))();
}
export function renderPreview(report: ReturnType<typeof readPreview>) {
  return ['> **状态 (Status)**: frozen', '> **层 (Layer)**: 审计 / 只读多用户预览',
    '> **权威 (Authoritative)**: 否；机械核对单，不是用户迁移放行', '',
    '# V13.2 单 4b · 预览核对单', '', `scopes=${report.scopeUserIds.map(cell).join(', ')}。`, '',
    ...report.users.flatMap(user => [`## 用户 ${cell(user.scopeUserId)}`, '',
      renderMarkdown(user).replace(/^#/gm, '###'), '']),
  ].join('\n');
}
export function run(options: Options) {
  const users = normalizeUsers(options.users);
  const files = outputPaths(options.output);
  // Reserve NEW report files before touching the explicitly supplied DB. No default path,
  // dotenv, initDb, migration runner, server, or listener is reachable from this entry point.
  for (const file of Object.values(files)) closeSync(openSync(file, 'wx'));
  const db = new Database(options.database, { readonly: options.action === 'preview', fileMustExist: true });
  try {
    if (options.action === 'preview') {
      const report = readPreview(db, users);
      writeFileSync(files.json, JSON.stringify(report, null, 2) + '\n');
      writeFileSync(files.markdown, renderPreview(report));
      return { action: 'preview', scopeUserIds: users, conservation: report.users.every(u => u.shadow.conservationOk) };
    }
    db.pragma('foreign_keys = ON');
    const report = options.action === 'execute' ? execute(db, users) : rollback(db, users);
    writeFileSync(files.json, JSON.stringify(encode(report), null, 2) + '\n');
    writeFileSync(files.markdown, renderExecution(report));
    // Independent read-only connection reruns the same S3 census after COMMIT.
    const reader = new Database(options.database, { readonly: true, fileMustExist: true });
    try {
      const actual = readPreview(reader, users);
      if (actual.users.some((user, index) => user.evidence.censusSha256 !== report.users[index].after.censusSha256)) {
        throw new Error('executor_post_commit_census_changed');
      }
    } finally { reader.close(); }
    return { action: report.action, scopeUserIds: users, conservation: report.users.every(u => u.conservation.every(c => c.ok)),
      checked: report.users.reduce((n, u) => n + u.invariants.checked, 0),
      exceptions: report.users.reduce((n, u) => n + u.exceptions.length, 0),
      events: report.users.map(u => ({ user: u.scopeUserId, seq: u.eventSeq })) };
  } finally { db.close(); }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.slice(2).join(' ') === '--help') {
    console.log('Usage: node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope[,scope...]> [--user <scope> ...] --out docs/audits/<new-basename> [--execute | --rollback]');
    console.log('Default: read-only S3 preview. Real database execution belongs to Henry. Rollback requires unchanged post-execution data.');
  } else {
    try { console.log(JSON.stringify({ result: 'WILDERNESS_EXECUTOR_PASS', ...run(parseArgs(process.argv.slice(2))) })); }
    catch {
      console.error('WILDERNESS_EXECUTOR_FAILED: check explicit arguments/schema/scope/backup state. If report I/O or post-commit verification failed, inspect coordinate_contract and events before retrying.');
      process.exitCode = 1;
    }
  }
}
