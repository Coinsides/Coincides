// Offline, dependency-free-to-install estimate; imports only the existing TypeScript compiler.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const require = createRequire(join(root, 'server/package.json'));
const ts = require('typescript');
const beforeSource = readFileSync(join(directory, 'system-prompt.before.ts.txt'), 'utf8');
const afterSource = readFileSync(join(root, 'server/src/agent/system-prompt.ts'), 'utf8');
async function render(source) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  const { buildSystemPrompt } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  // Empty variable-length context, default language, no L1: repeatable static-body proxy.
  return buildSystemPrompt('', {
    userName: '', currentDate: '', courses: [], memories: [], documentSummaries: [], decks: [],
  });
}
function estimate(text) {
  const points = [...text];
  const han = points.filter(character => /\p{Script=Han}/u.test(character)).length;
  const other = points.length - han;
  return {
    characters: points.length, han, other,
    lower: han + Math.ceil(other / 4),
    upper: han * 2 + Math.ceil(other / 4),
  };
}
function section(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = end ? text.indexOf(end, startIndex + start.length) : text.length;
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`Missing section: ${start}`);
  return text.slice(startIndex, endIndex);
}
const before = await render(beforeSource);
const after = await render(afterSource);
const beforeMetrics = estimate(before);
const afterMetrics = estimate(after);
const report = {
  method: 'Static-body proxy: rendered prompt with empty names/date/lists, default language, L1 off. Han 1–2 tokens each; all other Unicode code points / 4 rounded up. Estimate only, not provider token usage.',
  before: beforeMetrics,
  after: afterMetrics,
  netReduction: {
    lower: beforeMetrics.lower - afterMetrics.lower,
    upper: beforeMetrics.upper - afterMetrics.upper,
    lowerPercent: +((beforeMetrics.lower - afterMetrics.lower) / beforeMetrics.lower * 100).toFixed(2),
    upperPercent: +((beforeMetrics.upper - afterMetrics.upper) / beforeMetrics.upper * 100).toFixed(2),
  },
  workflowRegion: {
    note: 'Key Rules through Card Generation, plus the former duplicate document Q&A paragraph. Includes authorized semantic repairs; net reduction is not an isolated causal estimate for item 11.',
    before: estimate(section(before, '## Key Rules', '## Task-Card Linkage') + section(before, 'When the student asks about document content')),
    after: estimate(section(after, '## Key Rules', '## Task-Card Linkage')),
  },
  perception: estimate(section(after, '### 感知能力', '### 提案真话')),
  productManual: estimate(section(after, '## 产品说明', '## Current Context')),
  sourceSha256: {
    before: createHash('sha256').update(beforeSource).digest('hex'),
    after: createHash('sha256').update(afterSource).digest('hex'),
  },
};
writeFileSync(join(directory, 'token-estimates.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
