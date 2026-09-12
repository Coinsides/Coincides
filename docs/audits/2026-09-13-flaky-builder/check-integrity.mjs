import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import ts from '../../../client/node_modules/typescript/lib/typescript.js';

const root = resolve(import.meta.dirname, '../../..');
const files = [
  'client/src/pages/Boards/BoardPage.unboxing.test.tsx',
  'client/src/pages/Boards/BoardPage.selection.test.tsx',
  'client/src/pages/GroupGallery/groupGalleryPurposeRetirement.test.tsx',
  'server/src/__tests__/v2DevQuickLogin.test.ts',
  'server/src/__tests__/v2ImprintEmbedding.test.ts',
  'server/src/agent/providers/index.test.ts',
];
const hash = (value) => createHash('sha256').update(value).digest('hex');
function assertions(source, file) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const expressions = [];
  function visit(node) {
    if (ts.isCallExpression(node) && /^(expect\(|assert\.)/.test(node.getText(parsed))) {
      // Capture the full matcher expression, not its nested expect call.
      expressions.push(node.getText(parsed).replace(/\s+/g, ' '));
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return expressions;
}
const results = files.map((file) => {
  const before = readFileSync(join(import.meta.dirname, 'before', file.split('/').at(-1)), 'utf8');
  const after = readFileSync(join(root, file), 'utf8');
  const remaining = assertions(after, file);
  for (const assertion of assertions(before, file)) {
    const index = remaining.indexOf(assertion);
    assert.notEqual(index, -1, `${file}: removed/changed original assertion ${assertion}`);
    remaining.splice(index, 1);
  }
  const beforeCases = [...before.matchAll(/\b(?:it|test)\(/g)].length;
  const afterCases = [...after.matchAll(/\b(?:it|test)\(/g)].length;
  assert.equal(afterCases, beforeCases, `${file}: test declaration count changed`);
  if (file.startsWith('server/')) assert.equal(after, before, `${file}: server fixture changed while scope is pending`);
  return { file, beforeHash: hash(before), afterHash: hash(after), unchanged: before === after,
    originalAssertions: assertions(before, file).length, originalAssertionsPreserved: true,
    extraAssertions: remaining.length, directTestDeclarations: afterCases };
});
writeFileSync(join(import.meta.dirname, 'integrity.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
