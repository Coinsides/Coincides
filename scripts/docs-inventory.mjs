#!/usr/bin/env node
// docs-inventory —— 从代码生成 Notebook 对象事实面清单。
//
// 契约依据：docs/contracts/Notebook-Object-Boundary-Contract.md §4
//   「能派生的不手写，手写只留意图与为什么」（2026-07-15 会议卷 §三.1 生成层）
//
// 本脚本是**只读**的：只读源码，只写 docs/generated/object-inventory.md。
// 不碰 client/、不碰数据库、不联网。
//
// 用法：
//   node scripts/docs-inventory.mjs            生成/更新
//   node scripts/docs-inventory.mjs --check    只检查是否过期（过期 exit 1）
//
// ⚠️ 取证纪律（Source-Ladder-Contract.md §9.1）：本脚本对"存在性"一律全量扫描，
//    不做任何 head/截断 —— 截断只可能制造假阴性。

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REL = 'docs/generated/object-inventory.md';

const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

// ---- 表 ---------------------------------------------------------------------
// 架构事实（已核 server/src/db/init.ts:33,156）：**先应用 schema.sql，再跑 migrations**。
// 所以「活表集合」= schema.sql 声明 ∪ migrations 建表 − migrations 落表。
// schema.sql 单独一个数字**不是**活表数 —— 部分晚期表被回填进了 schema.sql
// （如 items / relations），部分没有（如 canvas_objects / purposes / source_records），
// 这只是回填不一致，不是缺陷。

function collectTables() {
  const schema = read('server/src/db/schema.sql');
  const declared = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][\w]*)/g)]
    .map((m) => m[1]);

  const migDir = join(REPO_ROOT, 'server/src/db/migrations');
  const created = new Map(); // table -> [migration ids]
  const dropped = new Map();
  for (const name of readdirSync(migDir).filter((n) => n.endsWith('.ts')).sort()) {
    const text = readFileSync(join(migDir, name), 'utf8');
    const id = basename(name, '.ts');
    for (const m of text.matchAll(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][\w]*)/g)) {
      if (!created.has(m[1])) created.set(m[1], []);
      created.get(m[1]).push(id);
    }
    for (const m of text.matchAll(/DROP TABLE IF EXISTS\s+([A-Za-z_][\w]*)/g)) {
      if (!dropped.has(m[1])) dropped.set(m[1], []);
      dropped.get(m[1]).push(id);
    }
  }

  const declaredSet = new Set(declared);
  const droppedSet = new Set(dropped.keys());
  // 活表 = 两处并集 − 已落表
  const live = [...new Set([...declaredSet, ...created.keys()])]
    .filter((t) => !droppedSet.has(t))
    .sort();
  // ⚠️ 真漂移：migration 已落表，但 schema.sql 仍声明 —— 全新库会建出一张死表
  const droppedButDeclared = [...droppedSet].filter((t) => declaredSet.has(t)).sort();
  // 观察项（非缺陷）：晚期表回填进 schema.sql 的不一致
  const backfilled = [...created.keys()].filter((t) => declaredSet.has(t)).sort();
  const notBackfilled = [...created.keys()]
    .filter((t) => !declaredSet.has(t) && !droppedSet.has(t))
    .sort();

  return {
    declared: [...declaredSet].sort(),
    live,
    created,
    dropped,
    droppedButDeclared,
    backfilled,
    notBackfilled,
  };
}

// ---- 路由 -------------------------------------------------------------------

function collectRoutes() {
  const index = read('server/src/index.ts');
  const imports = [...index.matchAll(/^import\s+(\w+)\s+from\s+'\.\/routes\/([\w.-]+)\.js';/gm)]
    .map((m) => ({ binding: m[1], module: m[2] }));
  const mounts = new Map(
    [...index.matchAll(/app\.use\(\s*'([^']+)'\s*,\s*(?:[\w.]+\s*,\s*)*(\w+)\s*\)/g)]
      .map((m) => [m[2], m[1]]),
  );
  return imports
    .map((r) => ({ ...r, path: mounts.get(r.binding) || '(未在 index.ts 直接 app.use)' }))
    .sort((a, b) => a.module.localeCompare(b.module));
}

// ---- canvas object kinds ----------------------------------------------------

function collectKinds() {
  const text = read('server/src/services/canvasObjects.ts');
  const at = text.indexOf('const KIND_HANDLERS');
  if (at < 0) return { kinds: [], line: null };
  const line = text.slice(0, at).split('\n').length;
  // 取 KIND_HANDLERS 字面量块（到该行起首个独立 "};"）
  const rest = text.slice(at);
  const end = rest.search(/\n};/);
  const block = end < 0 ? rest : rest.slice(0, end);
  const kinds = [...block.matchAll(/^\s{2}(?:'([\w.]+)'|([a-z_]\w*)):\s*\{/gm)]
    .map((m) => m[1] || m[2])
    .filter(Boolean);
  return { kinds: [...new Set(kinds)].sort(), line };
}

// ---- npm scripts ------------------------------------------------------------

function collectScripts() {
  const pkg = JSON.parse(read('package.json'));
  const s = pkg.scripts || {};
  const gate = s['verify:v2-bn8-runtime'] || '';
  const inGate = Object.keys(s).filter((k) => gate.includes(`npm run ${k}`));
  const checks = Object.keys(s).filter((k) => /^(check|smoke|test):/.test(k)).sort();
  return { all: s, gate, inGate, checks, notInGate: checks.filter((k) => !inGate.includes(k)) };
}

// ---- 渲染 -------------------------------------------------------------------

function render() {
  const t = collectTables();
  const routes = collectRoutes();
  const k = collectKinds();
  const sc = collectScripts();

  const drift = [];
  if (t.droppedButDeclared.length) {
    drift.push(
      `- ⚠️ **真漂移：migration 已落表，但 \`schema.sql\` 仍声明**（${t.droppedButDeclared.length}）` +
        ` —— 全新库会据 \`schema.sql\` 建出一张随即被落掉/或根本不该存在的表：` +
        t.droppedButDeclared.map((x) => `\`${x}\`（落于 ${t.dropped.get(x).join(', ')}）`).join('、'),
    );
  }
  if (!k.kinds.length) drift.push('- ⚠️ 未能从 `KIND_HANDLERS` 解析出任何 kind —— 解析器可能已与代码形状脱节。');
  if (!drift.length) drift.push('- ✅ 未发现漂移。');

  const L = [];
  L.push('> **状态 (Status)**: active');
  L.push('> **层 (Layer)**: 生成 / Generated');
  L.push('> **权威 (Authoritative)**: 是（事实面；意图与边界见契约）');
  L.push('> **生成自 (Generated by)**: `scripts/docs-inventory.mjs`');
  L.push('> **契约 (Contract)**: [`../contracts/Notebook-Object-Boundary-Contract.md`](../contracts/Notebook-Object-Boundary-Contract.md) §4');
  L.push('');
  L.push('# 对象事实面清单（生成物）');
  L.push('');
  L.push('⚙️ **本文件由 `node scripts/docs-inventory.mjs` 生成，请勿手改。**');
  L.push('');
  L.push('> **本文件过期 = 脚本没跑，不是文档写错了。** 这正是它优于手写清单的地方 ——');
  L.push('> 手写事实面的半衰期约等于下一次 migration（前身 `Notebook-Object-Inventory-Contract.md`');
  L.push('> 859 行、两层横幅、正文停在 V8，即为反例）。');
  L.push('>');
  L.push('> **这里只有「是什么」。「为什么 / 边界 / 不变式」在契约里，不在这。**');
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 0. 漂移检测');
  L.push('');
  L.push(...drift);
  L.push('');
  L.push('---');
  L.push('');
  L.push(`## 1. 数据表（活表 ${t.live.length} 张）`);
  L.push('');
  L.push('> **口径**：已核 `server/src/db/init.ts:33,156` —— **先应用 `schema.sql`，再跑 migrations**。');
  L.push('> 故 **活表 = `schema.sql` 声明 ∪ migrations 建表 − migrations 落表**。');
  L.push(`> \`schema.sql\` 单独声明 ${t.declared.length} 张，**那不是活表数** ——`);
  L.push(`> 部分晚期表被回填进 \`schema.sql\`（${t.backfilled.length} 张），部分没有（${t.notBackfilled.length} 张）。`);
  L.push('> 这是回填不一致，不是缺陷；但它意味着**任何"数一下 schema.sql"得出的数字都是错的**。');
  L.push('');
  L.push('| # | 表 | 首次建于 | 在 `schema.sql` |');
  L.push('|---|---|---|---|');
  t.live.forEach((name, i) => {
    const origin = t.created.has(name) ? t.created.get(name)[0] : '`schema.sql`（基线）';
    const inSchema = t.declared.includes(name) ? '✅' : '—';
    L.push(`| ${i + 1} | \`${name}\` | ${origin} | ${inSchema} |`);
  });
  L.push('');
  if (t.dropped.size) {
    L.push(`### 1.1 已由 migration 落表（${t.dropped.size}）`);
    L.push('');
    for (const [name, ids] of [...t.dropped.entries()].sort()) {
      L.push(`- \`${name}\` —— ${ids.join(', ')}`);
    }
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push(`## 2. HTTP 路由模块（${routes.length}）`);
  L.push('');
  L.push('| 模块 | 挂载路径 |');
  L.push('|---|---|');
  routes.forEach((r) => L.push(`| \`routes/${r.module}.ts\` | \`${r.path}\` |`));
  L.push('');
  L.push('---');
  L.push('');
  L.push(`## 3. Canvas object kinds（${k.kinds.length}）`);
  L.push('');
  L.push(`来源：\`server/src/services/canvasObjects.ts\` 的 \`KIND_HANDLERS\`${k.line ? `（第 ${k.line} 行）` : ''}。`);
  L.push('');
  L.push('> 契约 I-8：**新增 kind ＝ 注册一个三元组，核心零 if-kind。**');
  L.push('');
  k.kinds.forEach((x) => L.push(`- \`${x}\``));
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 4. 验证门');
  L.push('');
  L.push('`verify:v2-bn8-runtime` 链中的步骤：');
  L.push('');
  sc.inGate.forEach((x) => L.push(`- ✅ \`${x}\``));
  L.push('');
  if (sc.notInGate.length) {
    L.push(`**存在但不在该门内的 check / smoke / test 脚本（${sc.notInGate.length}）**：`);
    L.push('');
    sc.notInGate.forEach((x) => L.push(`- ⚠️ \`${x}\``));
    L.push('');
    L.push('> 不在门内 ≠ 错误（可能是刻意的），但**没有门跑的护栏等于没有护栏** —— 逐个应有明确归属。');
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push('## 5. 本清单不回答什么');
  L.push('');
  L.push('- 每个对象**拥有哪种真相** → 契约 §2');
  L.push('- 跨对象**不变式** → 契约 §3');
  L.push('- 表活性（**代码可达 ≠ 有真实数据流入**）→ 须做数据活性盘点，见 `Source-Ladder-Contract.md` §9.1');
  L.push('');
  return L.join('\n') + '\n';
}

// ---- 主流程 -----------------------------------------------------------------

const content = render();
const outAbs = join(REPO_ROOT, OUT_REL);
const checkOnly = process.argv.includes('--check');
const current = existsSync(outAbs) ? readFileSync(outAbs, 'utf8') : '';

if (checkOnly) {
  if (current !== content) {
    console.error(`过期: ${OUT_REL}\n请运行: node scripts/docs-inventory.mjs`);
    process.exit(1);
  }
  console.log(`最新: ${OUT_REL}`);
} else if (current !== content) {
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, content, 'utf8');
  console.log(`已写: ${OUT_REL}`);
} else {
  console.log(`无变化: ${OUT_REL}`);
}
