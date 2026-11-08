#!/usr/bin/env node
// pre-harvest-scan.mjs — 收割前的「进公开仓」扫描
//
// 本仓库是公开仓。收割(把 builder / Tester / Reviewer 的工作成果 commit 进来)之前,
// 要确认将要进库的文件里没有:
//   ⛔ 本机路径(Windows 用户名、<home>\AppData\Local\Temp 下的临时目录、Claude 会话目录)
//   ⛔ 公网 IP、邮箱
//   ⛔ 口令 / 密钥 / 令牌字面量(含 JWT、Bearer、各家 API key 形)
//   ⚠️ 盘符绝对路径、内网 IP、没有地址语境的公网四段数(多半是版本号)、
//      AppData 非 Temp 路径、测试文件里的口令 / Bearer 字面量(人工过目)
//   ℹ️ 0.0.0.0 监听地址出现处(只列,不判)
//
// 为什么另写一条而不扩 changedFileSecretScan.mjs:那条是提交期的「密钥闸」,阈值
// 24 字符、跳过含 NUL 的文件,射程是密钥;本条是收割期的「进公开仓」闸,射程是
// 「任何不该出现在公开仓里的本机 / 个人信息」。2026-11-08 事故:8 个脚本里的
// `const password = 'a18-scratch-pass'`(16 字符)被密钥闸放过、人工 grep 也漏了,
// Tester 事后发现。规则在这里机械化(claude-log §333 承诺)。
//
// 用法(在仓库根运行;零依赖):
//   node scripts/pre-harvest-scan.mjs                       # 扫已暂存(git add 过)的文件 —— 收割前的默认姿势
//   node scripts/pre-harvest-scan.mjs --changed             # 暂存 + 未暂存 + 未跟踪
//   node scripts/pre-harvest-scan.mjs --tracked             # 全部已跟踪文件(全仓审计 / 校准)
//   node scripts/pre-harvest-scan.mjs --paths <路径>...      # 指定文件或目录(目录按 git 可见文件递归,尊重 .gitignore)
//   选项: --max-mb N 单文件上限(默认 2MB;大日志要扫就调高)
//         --strict   ⚠️ 也算失败
//         --show     完整打印匹配文本(默认遮住口令中段、IP 后两段、邮箱用户名)
//
// 退出码:有 ⛔ 则 1;只有 ⚠️ / ℹ️ 则 0(--strict 时 ⚠️ 也 1)。
//
// 射程边界(照实写,别高估它):
//   1. 只看文件内容,不看文件名;不看 git 历史(历史里已有的东西它不知道)。
//   2. 含 NUL 字节的文件(数据库、图片、docx 等)跳过并列出;请人工确认它们该不该进库。
//   3. 用户名只认 Windows 路径形(`Users\<名>`、`/c/Users/<名>`、`/home/<名>/`);
//      文中单独出现的人名不算路径,不报。
//   4. 口令规则只认「键 = '字面量'」这一形;拼接、编码、放在数组里的看不见。
//   5. IP 只认 IPv4;IPv6 不在射程。

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const root = process.cwd();
const maxMbArg = process.argv.indexOf('--max-mb');
const MAX_BYTES = (maxMbArg > -1 ? Number(process.argv[maxMbArg + 1]) || 2 : 2) * 1024 * 1024;
const BINARY_EXT = /\.(png|jpe?g|webp|gif|ico|bmp|pdf|docx?|xlsx?|pptx?|zip|7z|gz|tar|db|sqlite3?|woff2?|ttf|otf|eot|wasm|mp[34]|mov|avi)$/i;
const TEST_PATH = /(^|[\\/])(__tests__|fixtures?|seeds?|__mocks__|[A-Za-z]*[Ss]moke[A-Za-z]*)([\\/]|$)|\.(test|spec)\.[cm]?[jt]sx?$/i;
const LOCKFILE = /(^|[\\/])(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|uv\.lock|Cargo\.lock|poetry\.lock)$/;

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
// --max-mb 的数值参数不是路径
const argvNoMax = argv.filter((a, i) => !(i > 0 && argv[i - 1] === '--max-mb'));
const strict = flags.has('--strict');
const show = flags.has('--show');

function gitLines(args) {
  const out = execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function collectFiles() {
  if (flags.has('--paths')) {
    const i = argvNoMax.indexOf('--paths');
    const targets = argvNoMax.slice(i + 1).filter((a) => !a.startsWith('--'));
    if (targets.length === 0) throw new Error('--paths 后面要跟至少一个路径');
    return [...new Set(gitLines(['ls-files', '--cached', '--others', '--exclude-standard', '--', ...targets]))].sort();
  }
  if (flags.has('--tracked')) return gitLines(['ls-files']);
  if (flags.has('--changed')) {
    return [...new Set([
      ...gitLines(['diff', '--name-only', '--diff-filter=ACMRTUXB']),
      ...gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']),
      ...gitLines(['ls-files', '--others', '--exclude-standard']),
    ])].sort();
  }
  return gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']);
}

// ---------- 规则 ----------
// 每条: { id, level: 'block'|'warn'|'info', re, mask, accept?(match, line, file) → true 表示放过 }
const BLOCK = 'block', WARN = 'warn', INFO = 'info';

const ADDRESS_CONTEXT = /\bssh\b|\bscp\b|rsync|https?:\/\/\d|\bhost(?:name)?\b|\bIP\b|\baddr(?:ess)?\b|\bcurl\b|\bping\b|\bufw\b|iptables|nginx|\d\.\d+\.\d+\.\d+:\d{2,5}|地址|云机|\b岛|公网|内网|防火墙/;
// UI 标签 / 文案形:Title Case 单词、带空格的短语、含中文 —— 是界面文字不是口令
const UI_LABEL = /^(?:[A-Z][a-z]+(?:\s+[A-Za-z]+)*|.*\s.*|.*[\u4e00-\u9fff].*)$/;
const SECRET_PLACEHOLDER = /synthetic-key-not-real|process\.env|REDACTED|\*\*\*|<[^>]+>|\$\{|placeholder|your[-_ ]|changeme|example/i;

const RULES = [
  { id: 'private-key-block', level: BLOCK, mask: 'secret',
    re: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { id: 'windows-user-path', level: BLOCK, mask: 'none',
    // C:\Users\<名>、/c/Users/<名>、Users\<名> …;占位符 <home>/<user>/$HOME 不算
    re: /(?:\b[A-Za-z]:[\\/]+|\/[a-z][\\/]+|^|[\s"'`(=])Users[\\/]+([A-Za-z0-9][A-Za-z0-9._-]*)/g,
    accept: (m) => /^(?:Public|Default|All Users|Shared)$/i.test(m[1]) },
  { id: 'unix-home-path', level: WARN, mask: 'none',
    re: /\/home\/(?!<)[A-Za-z0-9._-]+\//g,
    accept: (m) => /\/home\/(?:runner|user|node|app|ubuntu|ci)\//.test(m[0]) },
  { id: 'appdata-temp', level: BLOCK, mask: 'none',
    re: /AppData[\\/]+Local[\\/]+Temp/gi,
    // 行里已用占位符的是在描述洗法;后面紧跟引号 / 括号的是裸提名词,不是路径
    accept: (m, line) => /<(?:home|tmp|session|ops|用户名)>/.test(line) || /^[`'"」）)、，,]/.test(line.slice(m.index + m[0].length)) },
  { id: 'appdata-other', level: WARN, mask: 'none',
    re: /AppData[\\/]+(?:Local|Roaming)[\\/]+(?!Temp)[A-Za-z0-9._-]+/gi },
  { id: 'claude-session-dir', level: BLOCK, mask: 'none',
    re: /[0-9a-f]{16}[\\/]+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\.claude[\\/]+projects[\\/]+[A-Za-z0-9][A-Za-z0-9-]{3,}/g },
  { id: 'drive-absolute-path', level: WARN, mask: 'none',
    re: /\b[A-Za-z]:[\\/](?:[^\s"'`<>|*?]{2,})/g,
    // 已被 windows-user-path 覆盖的不重复报
    accept: (m) => /Users[\\/]/.test(m[0]) },
  { id: 'ipv4-public', level: BLOCK, mask: 'ip',
    // 公网四段数 + 行内有地址语境(ssh/http/host/ip/端口/地址/服务器…)
    re: /(?<![\d.\w-])(?:\d{1,3}\.){3}\d{1,3}(?![\d.\w-])/g,
    accept: (m, line) => !isPublicIp(m[0]) || !ADDRESS_CONTEXT.test(line) },
  { id: 'ipv4-public-no-context', level: WARN, mask: 'ip',
    // 公网四段数但行里没有地址语境:多半是版本号(13.0.1.x)或章节号(8.11.1.x),人看一眼
    re: /(?<![\d.\w-])(?:\d{1,3}\.){3}\d{1,3}(?![\d.\w-])/g,
    accept: (m, line) => !isPublicIp(m[0]) || ADDRESS_CONTEXT.test(line) },
  { id: 'ipv4-private', level: WARN, mask: 'ip',
    re: /(?<![\d.\w-])(?:\d{1,3}\.){3}\d{1,3}(?![\d.\w-])/g,
    accept: (m) => !isPrivateIp(m[0]) },
  { id: 'email', level: BLOCK, mask: 'email',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![A-Za-z0-9.-])/g,
    accept: (m) => /@(?:example\.(?:com|org|net|test)|localhost|test\.local|users\.noreply\.github\.com|noreply\.anthropic\.com|anthropic\.com)$/i.test(m[0])
      || /\.(?:invalid|test|example|localhost)$/i.test(m[0])
      || /^(?:noreply|no-reply|test|user|someone|you|name)@/i.test(m[0]) },
  { id: 'jwt', level: BLOCK, mask: 'secret',
    re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}/g },
  { id: 'bearer-token', level: BLOCK, mask: 'secret',
    re: /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g,
    accept: (m, line, file) => SECRET_PLACEHOLDER.test(m[0]) || TEST_PATH.test(file) },
  { id: 'bearer-token-in-test', level: WARN, mask: 'secret',
    re: /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g,
    accept: (m, line, file) => SECRET_PLACEHOLDER.test(m[0]) || !TEST_PATH.test(file) },
  { id: 'vendor-key-shape', level: BLOCK, mask: 'secret',
    re: /(?<!-)sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}/g,
    accept: (m) => SECRET_PLACEHOLDER.test(m[0]) },
  { id: 'password-literal', level: BLOCK, mask: 'secret',
    // password = 'xxx' / "password": "xxx" / passwd: 'xxx' / secret = "xxx" / token: 'xxx' / api_key = 'xxx'
    re: /\b(?:password|passwd|pwd|passphrase|secret|api[_-]?key|access[_-]?key|private[_-]?key)\b\s*[:=]\s*(["'])([^"'\r\n]{4,})\1/gi,
    accept: (m, line, file) => SECRET_PLACEHOLDER.test(m[2]) || UI_LABEL.test(m[2]) || /^\s*(?:\/\/|#|\*)/.test(line) },
  { id: 'password-literal-in-test', level: WARN, mask: 'secret',
    re: /\b(?:password|passwd|pwd|passphrase|secret|api[_-]?key|access[_-]?key|private[_-]?key)\b\s*[:=]\s*(["'])([^"'\r\n]{4,})\1/gi,
    accept: (m, line, file) => true },
  { id: 'token-literal', level: BLOCK, mask: 'secret',
    // token = '…':值要像令牌(≥20 字符、字母数字混杂、含数字),设计令牌 'color-ink-strong' 这类不算
    re: /\btokens?\b\s*[:=]\s*["'`]([A-Za-z0-9._\/+=-]{20,})["'`]/gi,
    accept: (m, line) => SECRET_PLACEHOLDER.test(m[1]) || !/\d/.test(m[1]) || !/[A-Za-z]/.test(m[1]) || /^\s*(?:\/\/|#|\*)/.test(line) },
  { id: 'listen-any-address', level: INFO, mask: 'none',
    re: /0\.0\.0\.0/g },
];

// 测试文件里的口令字面量降为 ⚠️:把 block 规则在测试路径下让给 warn 规则。
function activeRules(file) {
  const isTest = TEST_PATH.test(file);
  return RULES.filter((r) => {
    if (r.id === 'password-literal') return !isTest;
    if (r.id === 'password-literal-in-test') return isTest;
    return true;
  }).map((r) => (r.id === 'password-literal-in-test'
    ? { ...r, accept: (m, line) => SECRET_PLACEHOLDER.test(m[2]) || UI_LABEL.test(m[2]) || /^\s*(?:\/\/|#|\*)/.test(line) }
    : r));
}

function octets(ip) {
  const o = ip.split('.').map(Number);
  return o.length === 4 && o.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? o : null;
}
function isLoopbackOrAny(o) { return o[0] === 127 || (o[0] === 0 && o[1] === 0 && o[2] === 0 && o[3] === 0); }
function isPrivateIp(ip) {
  const o = octets(ip); if (!o) return false;
  return o[0] === 10 || (o[0] === 192 && o[1] === 168) || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 169 && o[1] === 254);
}
function isPublicIp(ip) {
  const o = octets(ip); if (!o) return false;
  if (isLoopbackOrAny(o) || isPrivateIp(o.join('.'))) return false;
  if (o[0] === 255 || (o[0] === 0)) return false; // 广播 / 0.x 不算
  return true;
}

function maskValue(kind, text) {
  if (show || kind === 'none') return text;
  if (kind === 'ip') { const p = text.split('.'); return `${p[0]}.${p[1]}.x.x`; }
  if (kind === 'email') { const [u, d] = text.split('@'); return `${u.slice(0, 1)}…@${d}`; }
  // secret
  return text.length <= 8 ? '…' : `${text.slice(0, 4)}…(${text.length} 字符)`;
}

// ---------- 扫 ----------
let files;
try { files = collectFiles(); } catch (e) { console.error(`pre-harvest-scan: ${e.message}`); process.exit(2); }

const findings = { block: [], warn: [], info: [] };
const skipped = [];
let scanned = 0;

for (const file of files) {
  const abs = resolve(root, file);
  if (!existsSync(abs)) continue;
  const st = statSync(abs);
  if (!st.isFile()) continue;
  if (BINARY_EXT.test(file)) { skipped.push(`${file} (二进制扩展名)`); continue; }
  if (LOCKFILE.test(file)) { skipped.push(`${file} (锁文件,版本号成片;锁文件改动另有「⛔ 动依赖锁」纪律)`); continue; }
  if (st.size > MAX_BYTES) { skipped.push(`${file} (超过 ${MAX_BYTES / 1024 / 1024}MB)`); continue; }
  const buf = readFileSync(abs);
  if (buf.includes(0)) { skipped.push(`${file} (含 NUL,按二进制跳过)`); continue; }
  scanned += 1;
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/);
  const rules = activeRules(file);
  lines.forEach((line, idx) => {
    for (const rule of rules) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.accept && rule.accept(m, line, file)) continue;
        findings[rule.level].push({ file, line: idx + 1, rule: rule.id, text: maskValue(rule.mask, m[0]) });
        if (m[0].length === 0) rule.re.lastIndex += 1;
      }
    }
  });
}

// ---------- 报 ----------
function printGroup(label, list) {
  if (list.length === 0) return;
  console.log(`\n${label} ${list.length} 处`);
  const byRule = new Map();
  for (const f of list) { if (!byRule.has(f.rule)) byRule.set(f.rule, []); byRule.get(f.rule).push(f); }
  for (const [rule, items] of byRule) {
    console.log(`  [${rule}] ${items.length}`);
    const cap = 40;
    items.slice(0, cap).forEach((f) => console.log(`    ${f.file}:${f.line}  ${f.text}`));
    if (items.length > cap) console.log(`    … 还有 ${items.length - cap} 处(同规则)`);
  }
}

console.log(`pre-harvest-scan: 候选 ${files.length} 个文件,扫了 ${scanned} 个,跳过 ${skipped.length} 个。`);
printGroup('⛔ 拦下(不得进公开仓)', findings.block);
printGroup('⚠️ 过目(多半是测试夹具 / 盘符路径 / 内网地址;人看一眼)', findings.warn);
printGroup('ℹ️ 0.0.0.0 出现处(只列)', findings.info);
if (skipped.length > 0) {
  console.log(`\n跳过的文件(请人工确认该不该进库):`);
  skipped.slice(0, 60).forEach((s) => console.log(`  - ${s}`));
  if (skipped.length > 60) console.log(`  … 还有 ${skipped.length - 60} 个`);
}

const failed = findings.block.length > 0 || (strict && findings.warn.length > 0);
console.log(failed ? '\n结论:⛔ 未通过。' : '\n结论:通过(⛔ 0 处)。');
process.exit(failed ? 1 : 0);
