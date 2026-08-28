#!/usr/bin/env node
/**
 * 发单前第七查(机械):凡工单「必红判据 / killer」段点名【需要触碰】的文件,必须 ∈「允许面」段。
 *
 * 立此闸的原因:「判据与边界打架」在派单人手上【第二次独立出现】
 *   ① TD-12 单:killer 写成「repo uploads 必须变」,与债的原文不符;
 *   ② 行首控件单:允许面只列两个生产文件,判据却要求新建测试文件。
 * 两次都由 builder 交白卷兜住,每次烧掉一轮。
 * ⚠️ 第二次重发现 = 未机械化的证据 ⇒ 文档会被忘,门不会。
 *
 * ⚠️ 本闸自身的三个已知陷阱(都是跑阳性对照时才现形的,记此免得后人重踩):
 *   (a) 只按「正文提到允许面」选段 -> builder 的 ## Result 段会被误当成允许面,自己把漏洞补上;
 *       故切在 ## Result 之前。
 *   (b) 把「含 ⛔ 的行」整行跳过 -> 允许面里带 ⛔ 附注的正当条目被误杀。⛔ 附注 ≠ 禁区。
 *   (c) 判据点名却【要求它不变】的文件(零 diff / 仍绿),不该被要求进允许面 —— 那正是禁区的断言方式。
 *
 * 用法: node scripts/check-handoff-surface.mjs docs/agent-ops/handoffs/<单>.md
 * 退出: 0 通过 / 1 判据与边界打架(改单,不要派发) / 2 用法错
 */
import { readFileSync } from 'node:fs';

const HEADING = /^#{1,4}\s+.*$/;
const ALLOW_HINT = /允许面|允许触碰|允许新建/;
const KILLER_HINT = /必红|killer|判据/i;
const FORBID_LINE = /禁区|不许触碰/;
const ASSERT_UNCHANGED = /零\s*diff|零改动|字节不变|逐字节相同|一个字不动|不变|仍绿/;
const DECLARES = /^\s*(?:\*\*)?(?:允许面|允许触碰|允许新建)/m;
const PATHLIKE = /`([^`\s]*\/[^`\s]*?(?:\.[a-z0-9]+|\/\*\*))`/gi;

function sections(md) {
  const out = [];
  let cur = { title: '(preamble)', body: [] };
  for (const line of md.split(/\r?\n/)) {
    if (HEADING.test(line)) { out.push(cur); cur = { title: line, body: [] }; }
    else cur.body.push(line);
  }
  out.push(cur);
  return out.map((s) => ({ title: s.title, text: s.body.join('\n') }));
}

function covered(target, allowed) {
  for (const a of allowed) {
    if (a === target) return true;
    if (a.endsWith('/**') && target.startsWith(a.slice(0, -2))) return true;
  }
  return false;
}

const file = process.argv[2];
if (!file) { console.error('用法: node scripts/check-handoff-surface.mjs <handoff.md>'); process.exit(2); }
const md = readFileSync(file, 'utf8');

const cutAt = md.search(/^#{1,4}\s+Result/mi);
const secs = sections(cutAt >= 0 ? md.slice(0, cutAt) : md);

const allowSecs = secs.filter((s) => ALLOW_HINT.test(s.title) || DECLARES.test(s.text));
const killerSecs = secs.filter((s) => KILLER_HINT.test(s.title));

console.log(`单: ${file}${cutAt < 0 ? '  (尚无 ## Result 段,全文按工单正文处理)' : ''}`);
if (!allowSecs.length) { console.error('⛔ 找不到「允许面」段 —— 无边界的单不许派发。'); process.exit(1); }
if (!killerSecs.length) { console.error('⛔ 找不到「必红判据」段 —— 无刀的单不许派发。'); process.exit(1); }

const allowed = new Set();
for (const s of allowSecs) {
  for (const line of s.text.split('\n')) {
    if (FORBID_LINE.test(line)) continue;
    for (const m of line.matchAll(PATHLIKE)) allowed.add(m[1]);
  }
}

const needed = new Set();
const exempt = new Set();
for (const s of killerSecs) {
  for (const line of s.text.split('\n')) {
    const unchanged = ASSERT_UNCHANGED.test(line);
    for (const m of line.matchAll(PATHLIKE)) (unchanged ? exempt : needed).add(m[1]);
  }
}
for (const p of exempt) needed.delete(p);

console.log(`  允许面 ${allowed.size} 项: ${[...allowed].join(' , ') || '(空)'}`);
if (exempt.size) console.log(`  判据要求【其不变】${exempt.size} 项(豁免): ${[...exempt].join(' , ')}`);
console.log(`  判据要求【触碰】${needed.size} 项: ${[...needed].join(' , ') || '(无,判据靠命令而非文件表达)'}`);

const missing = [...needed].filter((p) => !covered(p, allowed));
if (missing.length) {
  console.error('\n⛔ 判据与边界打架 —— 下列文件在判据段被点名要触碰,却不在允许面:');
  for (const p of missing) console.error(`   · ${p}`);
  console.error('\n改单,⛔ 不要派发。');
  process.exit(1);
}
console.log('\n✅ 第七查通过。');
