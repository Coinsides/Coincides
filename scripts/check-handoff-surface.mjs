#!/usr/bin/env node
/**
 * 发单前第七查(机械):工单点名之物,树上必须成立。
 *
 * 两面(同一个病的两副面孔,都由 builder 交白卷兜住过,各烧一轮):
 *   面 1 —— 判据段点名【需要触碰】的文件,必须 ∈ 允许面。
 *           (TD-12 单 killer 与债原文不符;行首控件单允许面缺测试文件)
 *   面 2 —— 工单点名的 npm script,必须在对应 package.json 里存在。
 *           (行首控件单 §6 写 `npm --prefix client run test`,而 client 只有 `test:unit`)
 *
 * ⚠️ 本闸自身的已知陷阱(都是跑阳性对照才现形的,记此免得后人重踩):
 *   (a) 只按「正文提到允许面」选段 -> builder 的 ## Result 段会被误当成允许面,自己把漏洞补上;
 *       故切在 ## Result 之前。
 *   (b) 把「含 ⛔ 的行」整行跳过 -> 允许面里带 ⛔ 附注的正当条目被误杀。⛔ 附注 ≠ 禁区。
 *   (c) 判据点名却【要求它不变】(零 diff / 仍绿)的文件,不该被要求进允许面 —— 那正是禁区的断言方式。
 *   (d) ⭐ 改坏过一次导致脚本语法错误,而它照样退出 1,阳性对照因此显示"抓住了"。
 *       ⇒ 用本闸前先 `node --check scripts/check-handoff-surface.mjs`:
 *          先证明量具能编译,再认它的红。【只看退出码,会把崩溃读成成功。】
 *
 * 用法: node scripts/check-handoff-surface.mjs docs/agent-ops/handoffs/<单>.md
 * 退出: 0 通过 / 1 工单有病(改单,不要派发) / 2 用法错
 */
import { readFileSync, existsSync } from 'node:fs';

const HEADING = /^#{1,4}\s+.*$/;
const ALLOW_HINT = /允许面|允许触碰|允许新建/;
const KILLER_HINT = /必红|killer|判据/i;
const FORBID_LINE = /禁区|不许触碰/;
const ASSERT_UNCHANGED = /零\s*diff|零改动|字节不变|逐字节相同|一个字不动|不变|仍绿/;
const DECLARES = /^\s*(?:\*\*)?(?:允许面|允许触碰|允许新建)/m;
const PATHLIKE = /`([^`\s]*\/[^`\s]*?(?:\.[a-z0-9]+|\/\*\*))`/gi;
const NPM_CMD = /npm\s+(?:--prefix\s+(\S+)\s+)?run\s+([A-Za-z0-9:_-]+)/g;

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
const order = cutAt >= 0 ? md.slice(0, cutAt) : md;
const secs = sections(order);

const allowSecs = secs.filter((s) => ALLOW_HINT.test(s.title) || DECLARES.test(s.text));
const killerSecs = secs.filter((s) => KILLER_HINT.test(s.title));

console.log('单: ' + file + (cutAt < 0 ? '  (尚无 ## Result 段,全文按工单正文处理)' : ''));
const fail = (msg, items) => {
  console.error('');
  console.error(msg);
  for (const i of (items || [])) console.error('   · ' + i);
  console.error('');
  console.error('改单,⛔ 不要派发。');
  process.exit(1);
};

if (!allowSecs.length) fail('⛔ 找不到「允许面」段 —— 无边界的单不许派发。');
if (!killerSecs.length) fail('⛔ 找不到「必红判据」段 —— 无刀的单不许派发。');

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

console.log('  允许面 ' + allowed.size + ' 项: ' + ([...allowed].join(' , ') || '(空)'));
if (exempt.size) console.log('  判据要求【其不变】' + exempt.size + ' 项(豁免): ' + [...exempt].join(' , '));
console.log('  判据要求【触碰】' + needed.size + ' 项: ' + ([...needed].join(' , ') || '(无,判据靠命令而非文件表达)'));

const pkgCache = new Map();
function scriptsOf(prefix) {
  const f = prefix ? prefix + '/package.json' : 'package.json';
  if (!pkgCache.has(f)) {
    pkgCache.set(f, existsSync(f) ? Object.keys(JSON.parse(readFileSync(f, 'utf8')).scripts || {}) : null);
  }
  return pkgCache.get(f);
}
const badCmds = [];
const seenCmd = new Set();
for (const m of order.matchAll(NPM_CMD)) {
  if (seenCmd.has(m[0])) continue;
  seenCmd.add(m[0]);
  const list = scriptsOf(m[1]);
  if (list === null) badCmds.push(m[0] + '  -> 找不到 ' + (m[1] ? m[1] + '/' : '') + 'package.json');
  else if (!list.includes(m[2])) badCmds.push(m[0] + '  -> 该 package.json 无 "' + m[2] + '" script');
}
console.log('  npm 命令 ' + seenCmd.size + ' 条,不存在的 ' + badCmds.length + ' 条');
if (badCmds.length) fail('⛔ 工单点名了树上不存在的 npm script:', badCmds);

const missing = [...needed].filter((p) => !covered(p, allowed));
if (missing.length) fail('⛔ 判据与边界打架 —— 下列文件在判据段被点名要触碰,却不在允许面:', missing);

console.log('');
console.log('✅ 第七查通过(文件面 + 命令面)。');
