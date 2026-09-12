#!/usr/bin/env node
/**
 * tech-debt.md 表格结构闸(2026-08-29 立)。
 *
 * 立它的理由:同一会话内,同一种损坏发生了【两次】——
 *   ① TD-30 在 0873f68 丢了两列(处置/状态),状态列静默移位;
 *   ② TD-36 因插入文本里含 `UPDATE|DEFAULT|RENAME` 的裸 `|` 而多出两列。
 * 危害形状:⚠️ 表格坏了不会报错,而【状态】那一列会静默移位 ——
 * 巡检读到的是另一列的内容,而它看起来仍像一句合理的话。
 * ⇒「看起来对的错东西」在文档里的形态。
 */
import { readFileSync } from 'node:fs';

const FILE = 'docs/agent-ops/current-state/tech-debt.md';
const EXPECTED = 7; // '' + 5 真列 + ''
// 会话前既有、非本闸引入的历史损坏;⛔ 只许缩短不许延长
const GRANDFATHERED = new Set(['TD-6', 'TD-12', 'TD-28']);

const lines = readFileSync(FILE, 'utf8').split('\n');
const bad = [];
const grandfathered = [];
for (const line of lines) {
  const m = /^\| (TD-\d+) \|/.exec(line);
  if (!m) continue;
  const n = line.split('|').length;
  if (n === EXPECTED) continue;
  (GRANDFATHERED.has(m[1]) ? grandfathered : bad).push(`${m[1]} 字段=${n}(应为 ${EXPECTED})`);
}

if (grandfathered.length) {
  console.log(`⚠️ 历史遗留(已豁免,⛔ 不许新增): ${grandfathered.join(' · ')}`);
}
if (bad.length) {
  console.error('❌ tech-debt 表格结构损坏 —— 状态列会静默移位:');
  for (const b of bad) console.error(`   · ${b}`);
  console.error('   常见成因:插入文本里含裸 `|`(即使在反引号里也会分列)。改写成 ` / ` 或转义 \|。');
  process.exit(1);
}
console.log('✅ tech-debt 表格结构完好(状态列可信)。');
