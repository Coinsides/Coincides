import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const before = readFileSync(join(directory, 'orchestrator.before.ts.txt'), 'utf8');
const after = readFileSync(join(root, 'server/src/agent/orchestrator.ts'), 'utf8');
const expected = before
  .replace(/interface EnergyRow \{\r?\n  energy_level: string;\r?\n\}\r?\n\r?\n/, '')
  .replace(/  const energyStatus = db.prepare\(\r?\n    'SELECT energy_level FROM daily_statuses WHERE user_id = \? AND date = \?',\r?\n  \).get\(userId, today\) as EnergyRow \| undefined;\r?\n/, '')
  .replace(/    energyLevel: energyStatus\?\.energy_level,\r?\n/, '');
assert.equal(after, expected, 'orchestrator changes must be exactly the ordered dead-context deletions');
const prompt = readFileSync(join(root, 'server/src/agent/system-prompt.ts'), 'utf8');
assert.doesNotMatch(prompt, /week_of|extra_notes|energyLevel|MANDATORY — no exceptions|v1\.7\.3/);
for (const name of ['from_date', 'to_date', 'read_note', 'read_board', 'read_content_groups', 'read_annotations_relations', 'next_page_index', 'truncated', 'has_more']) {
  assert.ok(prompt.includes(name), `required prompt term: ${name}`);
}
const report = {
  status: 'PASS',
  orchestrator: 'Byte comparison against the pre-edit snapshot matches exactly: EnergyRow + unused SELECT + energyLevel argument removed; no loop or tool machinery changes.',
  prompt: 'Required dates, readers and pagination/truncation terms present; ordered obsolete terms absent. Behavioral wording assertions live in v14ContextHint.test.ts.',
  sha256: Object.fromEntries([
    ['server/src/agent/system-prompt.ts', prompt],
    ['server/src/agent/orchestrator.ts', after],
    ['server/src/__tests__/v14ContextHint.test.ts', readFileSync(join(root, 'server/src/__tests__/v14ContextHint.test.ts'), 'utf8')],
  ].map(([path, text]) => [path, createHash('sha256').update(text).digest('hex')])),
};
writeFileSync(join(directory, 'scope-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
