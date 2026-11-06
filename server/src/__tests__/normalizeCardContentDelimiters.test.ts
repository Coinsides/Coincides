import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCardContent } from '../agent/tools/normalizeContent.js';

const formula = (value: string) => normalizeCardContent('formula', { formula: value }).formula;

test('a card keeps the bare LaTeX whichever delimiter the formula came with', () => {
  assert.equal(formula('\\(\\frac{C}{i}\\)'), '\\frac{C}{i}');
  assert.equal(formula('\\[x^2\\]'), 'x^2');
  assert.equal(formula('$x$'), 'x');
  assert.equal(formula('$$x$$'), 'x');
  assert.equal(formula('x'), 'x');
});

test('two formulas with text between keep their delimiters', () => {
  assert.equal(formula('\\(a\\) and \\(b\\)'), '\\(a\\) and \\(b\\)');
});
