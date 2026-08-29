#!/usr/bin/env node

import {
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptPath = fileURLToPath(import.meta.url);
const defaultGlossaryPath = fileURLToPath(new URL('./glossary.md', import.meta.url));
const forbiddenStatePhrases = ['已 live', '已接入', '已打通', '已可用', '已上线'];
const terms = [
  '原始文档库(散沙层)',
  '转写(带锚)',
  '碎片(可寻址单元)',
  '引用源(拓印件)',
];

function extractEntry(source, term) {
  const heading = `**${term}**`;
  const start = source.indexOf(heading);
  if (start < 0) throw new Error(`[structure][${term}] 词条不存在`);

  const remainder = source.slice(start + heading.length);
  const nextHeading = remainder.search(/^\*\*[^*\r\n]+\*\*\s*$/m);
  return nextHeading < 0
    ? source.slice(start)
    : source.slice(start, start + heading.length + nextHeading);
}

function extractCurrentStateFields(entry) {
  const lines = entry.split(/\r?\n/);
  const fields = [];
  for (let start = 0; start < lines.length; start += 1) {
    if (!/^- 现状\s*:/.test(lines[start])) continue;
    let end = start + 1;
    while (end < lines.length && !/^- /.test(lines[end])) end += 1;
    fields.push(lines.slice(start, end).join('\n'));
    start = end - 1;
  }
  return fields;
}

function validate(source) {
  const failures = [];
  const entries = new Map();

  for (const term of terms) {
    try {
      entries.set(term, extractEntry(source, term));
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const term of terms) {
    const entry = entries.get(term);
    if (!entry) continue;
    const currentStates = extractCurrentStateFields(entry);
    const found = forbiddenStatePhrases.filter((phrase) => (
      currentStates.some((currentState) => currentState.includes(phrase))
    ));
    if (found.length > 0) {
      failures.push(`[K-1][${term}] 现状栏含禁词: ${found.join(' / ')}`);
    }
  }

  const transcriptionEntry = entries.get('转写(带锚)');
  if (transcriptionEntry && !transcriptionEntry.includes('平铺文本+页级锚')) {
    failures.push('[K-2][转写(带锚)] 必须保留原文「平铺文本+页级锚」');
  }

  const imprintEntry = entries.get('引用源(拓印件)');
  if (imprintEntry && !imprintEntry.includes('原始但活')) {
    failures.push('[K-2][引用源(拓印件)] 必须保留原文「原始但活」');
  }

  for (const term of ['碎片(可寻址单元)', '原始文档库(散沙层)']) {
    const entry = entries.get(term);
    if (entry && extractCurrentStateFields(entry).length === 0) {
      failures.push(`[K-3][${term}] 缺少独立「现状」栏`);
    }
  }

  return failures;
}

function runK1SelfTest() {
  const original = readFileSync(defaultGlossaryPath, 'utf8');
  const targetHeading = '**原始文档库(散沙层)**';
  const mutated = original.replace(
    targetHeading,
    `${targetHeading}\n- 现状:测试用临时副本已 live。`,
  );
  if (mutated === original) throw new Error('K-1 self-test could not inject its probe');

  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-glossary-k1-'));
  const tempGlossary = join(tempRoot, basename(defaultGlossaryPath));
  try {
    writeFileSync(tempGlossary, mutated, 'utf8');
    const result = spawnSync(process.execPath, [scriptPath, tempGlossary], {
      cwd: dirname(scriptPath),
      encoding: 'utf8',
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    const expected = '[K-1][原始文档库(散沙层)] 现状栏含禁词: 已 live';
    if (result.status === 0 || !output.includes(expected)) {
      throw new Error(`K-1 self-test did not produce its expected red failure:\n${output}`);
    }
    console.log(`EXPECTED RED: ${expected}`);
    console.log('K-1 temporary-copy mutation was caught; temporary probe removed.');
  } finally {
    if (readFileSafe(tempGlossary) !== null) unlinkSync(tempGlossary);
    rmdirSync(tempRoot);
  }
}

function runK2SelfTest() {
  const original = readFileSync(defaultGlossaryPath, 'utf8');
  const mutated = original
    .replace('平铺文本+页级锚', '测试用临时副本已移除转写护栏句')
    .replace('原始但活', '测试用临时副本已移除拓印护栏句');
  if (mutated === original) throw new Error('K-2 self-test could not remove its guard phrases');

  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-glossary-k2-'));
  const tempGlossary = join(tempRoot, basename(defaultGlossaryPath));
  try {
    writeFileSync(tempGlossary, mutated, 'utf8');
    const result = spawnSync(process.execPath, [scriptPath, tempGlossary], {
      cwd: dirname(scriptPath),
      encoding: 'utf8',
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    const expected = [
      '[K-2][转写(带锚)] 必须保留原文「平铺文本+页级锚」',
      '[K-2][引用源(拓印件)] 必须保留原文「原始但活」',
    ];
    if (result.status === 0 || expected.some((message) => !output.includes(message))) {
      throw new Error(`K-2 self-test did not produce both expected red failures:\n${output}`);
    }
    for (const message of expected) console.log(`EXPECTED RED: ${message}`);
    console.log('K-2 temporary-copy mutations were caught; temporary probe removed.');
  } finally {
    if (readFileSafe(tempGlossary) !== null) unlinkSync(tempGlossary);
    rmdirSync(tempRoot);
  }
}

function readFileSafe(path) {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

if (process.argv[2] === '--self-test-k1') {
  runK1SelfTest();
  process.exit(0);
}

if (process.argv[2] === '--self-test-k2') {
  runK2SelfTest();
  process.exit(0);
}

const glossaryPath = process.argv[2] || defaultGlossaryPath;
const failures = validate(readFileSync(glossaryPath, 'utf8'));
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log('Glossary shape-vs-capability assertions passed (K-1 through K-3).');
