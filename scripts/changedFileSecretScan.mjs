import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const maxBytes = 1024 * 1024;

function gitLines(args) {
  const output = execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueChangedFiles() {
  const paths = new Set([
    ...gitLines(['diff', '--name-only', '--diff-filter=ACMRTUXB']),
    ...gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ]);

  return [...paths].sort();
}

function isProbablyBinary(buffer) {
  return buffer.includes(0);
}

const patterns = [
  ['private key block', /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['openai-style api key', /sk-[A-Za-z0-9_-]{20,}/],
  ['github classic token', /ghp_[A-Za-z0-9]{20,}/],
  ['github fine-grained token', /github_pat_[A-Za-z0-9_]{20,}/],
  ['slack token', /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ['aws access key id', /AKIA[0-9A-Z]{16}/],
  ['bearer token', /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/],
  [
    'assigned secret-like value',
    // (?!\() excludes bare function-call assignments like
    // `apiKey = resolveProviderCredential(...)` — a long identifier followed
    // by `(` is code, not a literal credential.
    /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{24,}(?![(\w./+=-])/i,
  ],
];

const files = uniqueChangedFiles();
const findings = [];
const skipped = [];

for (const file of files) {
  const absolute = resolve(root, file);
  if (!existsSync(absolute)) continue;

  const stat = statSync(absolute);
  if (!stat.isFile()) continue;

  if (stat.size > maxBytes) {
    skipped.push(`${file} (too large)`);
    continue;
  }

  const buffer = readFileSync(absolute);
  if (isProbablyBinary(buffer)) {
    skipped.push(`${file} (binary)`);
    continue;
  }

  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    patterns.forEach(([name, pattern]) => {
      if (pattern.test(line)) {
        findings.push({
          file,
          line: index + 1,
          pattern: name,
        });
      }
    });
  });
}

if (findings.length > 0) {
  console.error('Changed-file secret scan failed:');
  findings.forEach((finding) => {
    console.error(`- ${finding.file}:${finding.line} matched ${finding.pattern}`);
  });
  process.exit(1);
}

if (files.length === 0) {
  console.log('Changed-file secret scan passed: no changed files.');
} else {
  console.log(`Changed-file secret scan passed: ${files.length} changed file(s) scanned.`);
}

if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length} file(s):`);
  skipped.forEach((item) => console.log(`- ${item}`));
}
