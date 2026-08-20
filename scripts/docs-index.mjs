#!/usr/bin/env node
// docs-index.mjs — 自动生成文档层的 INDEX.md
//
// 规格见 docs/agent-ops/DOCUMENTATION-SYSTEM.md 第四节:
//   - 扫描指定文档层目录里的 .md 文件;
//   - 从每个文件顶部的"状态头"(leading blockquote block)提取元信息;
//   - 在该目录写出 INDEX.md(只放元信息、不复制正文);
//   - INDEX 由本脚本生成,不手写 —— 目录因此永不说谎,并反向强制大家写好状态头。
//
// 用法:
//   node scripts/docs-index.mjs            # 生成所有目标层的 INDEX.md
//   node scripts/docs-index.mjs --check    # 只检查,不写;若 INDEX 过期则以非 0 退出(可用于 CI)
//
// 零依赖,使用 Node 内置模块。

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 目标文档层目录(相对 repo root)。每个目录会生成一个 INDEX.md。
// 条目可以是字符串(递归扫描),或 { dir, recursive: false }(只扫本层,不下钻)。
// 2026-08-19 扩容:补入 docs 根级 + internal / workflow / continuity —— 此前这四处
// 不受"看状态头再信"纪律覆盖(29 份文档无状态头、不进任何 INDEX)。
// `docs` 必须非递归:它下面挂着 brainstorm(164)/releases(450),递归会生成 733 行的巨表。
const TARGET_DIRS = [
  { dir: 'docs', recursive: false },
  'docs/agent-ops',
  'docs/agent-ops/decisions',
  'docs/agent-ops/current-state',
  'docs/contracts',
  'docs/brainstorm',
  'docs/internal',
  'docs/workflow',
  'docs/continuity',
];

// 把 TARGET_DIRS 条目归一为 { dir, recursive }。
function normalizeTarget(entry) {
  if (typeof entry === 'string') return { dir: entry, recursive: true };
  return { dir: entry.dir, recursive: entry.recursive !== false };
}

const KNOWN_STATUSES = ['draft', 'active', 'frozen', 'deferred', 'superseded', 'archived'];
const SKIP_FILES = new Set(['INDEX.md']);

// ---- 解析状态头 ----------------------------------------------------------

// 抓取文件顶部连续的 blockquote 区块(状态头一定在最前)。
function leadingBlockquote(text) {
  const lines = text.split(/\r?\n/);
  const block = [];
  for (const line of lines) {
    if (line.startsWith('>')) block.push(line);
    else if (block.length === 0 && line.trim() === '') continue; // 容忍开头空行
    else break;
  }
  return block.join('\n');
}

// 从状态头里按"英文字段名"提取值,例如 field='Status' 匹配 `**状态 (Status)**: active`。
function field(headerBlock, englishKey) {
  const re = new RegExp(
    '^>\\s*\\*\\*[^*]*\\(' + englishKey + '\\)\\*\\*\\s*[:：]\\s*(.+?)\\s*$',
    'mi'
  );
  const m = headerBlock.match(re);
  return m ? m[1].trim() : '';
}

function firstHeading(text) {
  const m = text.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : '(无标题)';
}

function normalizeStatus(raw) {
  if (!raw) return '(缺状态头)';
  const lower = raw.toLowerCase();
  const hit = KNOWN_STATUSES.find((s) => new RegExp('\\b' + s + '\\b').test(lower));
  return hit || raw;
}

function parseDoc(absPath) {
  const text = readFileSync(absPath, 'utf8');
  const header = leadingBlockquote(text);
  return {
    title: firstHeading(text),
    status: normalizeStatus(field(header, 'Status')),
    layer: field(header, 'Layer') || '—',
    updated: field(header, 'Updated') || '—',
    supersedes: field(header, 'Supersedes') || '—',
    supersededBy: field(header, 'Superseded by') || '—',
    hasHeader: header.length > 0,
  };
}

// ---- 扫描目录(递归)-----------------------------------------------------

function listMarkdown(dirAbs, recursive = true) {
  const out = [];
  for (const name of readdirSync(dirAbs)) {
    const abs = join(dirAbs, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (recursive) out.push(...listMarkdown(abs, true));
    } else if (name.endsWith('.md') && !SKIP_FILES.has(name)) out.push(abs);
  }
  return out;
}

// ---- 生成 INDEX.md -------------------------------------------------------

function shorten(s, n = 60) {
  if (!s || s === '—') return '—';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function buildIndex(dirRel, recursive = true) {
  const dirAbs = join(REPO_ROOT, dirRel);
  const files = listMarkdown(dirAbs, recursive).sort();
  const rows = files.map((abs) => {
    const d = parseDoc(abs);
    const rel = relative(dirAbs, abs).split(sep).join('/');
    const link = `[${rel}](${rel})`;
    const supLink = d.supersededBy !== '—' ? '⚠️ ' + shorten(d.supersededBy) : '—';
    return `| ${link} | ${shorten(d.title)} | \`${d.status}\` | ${d.updated} | ${supLink} |`;
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return [
    '> **状态 (Status)**: active',
    '> **层 (Layer)**: 现状 / Current-State(自动生成索引)',
    `> **日期 (Updated)**: ${stamp}`,
    '> **权威 (Authoritative)**: 是 / Yes',
    '',
    `# INDEX — \`${dirRel}\``,
    '',
    '⚙️ **本文件由 `scripts/docs-index.mjs` 自动生成,请勿手改。**',
    '修改任何文档的状态头后,重新运行 `node scripts/docs-index.mjs` 即可更新。',
    '',
    `共 ${files.length} 份文档${recursive ? '' : '(仅本层,不含子目录)'}。`,
    '',
    '| 文件 | 标题 | 状态 | 更新 | 被取代 |',
    '|------|------|------|------|--------|',
    ...rows,
    '',
  ].join('\n');
}

// ---- 主流程 --------------------------------------------------------------

const checkOnly = process.argv.includes('--check');
let stale = 0;
let written = 0;

for (const entry of TARGET_DIRS) {
  const { dir: dirRel, recursive } = normalizeTarget(entry);
  const dirAbs = join(REPO_ROOT, dirRel);
  if (!existsSync(dirAbs)) {
    console.warn(`skip (不存在): ${dirRel}`);
    continue;
  }
  const content = buildIndex(dirRel, recursive);
  const indexPath = join(dirAbs, 'INDEX.md');
  const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  // 比较时忽略"日期"行,避免每天都判为过期。
  const strip = (s) => s.replace(/^> \*\*日期 \(Updated\)\*\*:.*$/m, '');
  const changed = strip(current) !== strip(content);

  if (checkOnly) {
    if (changed) {
      stale++;
      console.error(`过期: ${dirRel}/INDEX.md`);
    }
  } else if (changed) {
    writeFileSync(indexPath, content, 'utf8');
    written++;
    console.log(`已写: ${dirRel}/INDEX.md`);
  } else {
    console.log(`无变化: ${dirRel}/INDEX.md`);
  }
}

if (checkOnly && stale > 0) {
  console.error(`\n${stale} 个 INDEX 过期。请运行: node scripts/docs-index.mjs`);
  process.exit(1);
}
if (!checkOnly) console.log(`\n完成。写入 ${written} 个 INDEX.md。`);
