import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_ROOTS = ['server/src', 'server/scripts'];
const PACKAGE_FILES = ['package.json', 'server/package.json'];
const TEST_WRAPPER = resolve(REPO_ROOT, 'scripts/run-server-test-suite.mjs');

// Exact repo-relative paths only. Every exemption must explain why the suite
// cannot run and name its follow-up. Empty/stale/redundant exemptions fail.
const EXEMPTIONS = {
  // 'server/src/__tests__/example.test.ts': 'Reason; follow-up order.',
};

function repoPath(path) {
  return relative(REPO_ROOT, path).split(sep).join('/');
}

function collectTests(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Cannot inventory linked entry: ${repoPath(path)}`);
    }
    if (entry.isDirectory()) files.push(...collectTests(path));
    else if (entry.isFile() && entry.name.endsWith('.test.ts')) files.push(repoPath(path));
  }
  return files;
}

// Deliberately bounded shell grammar: literal words, single/double quotes, and
// sequential && segments. No expansion, escaping, pipes, redirection, compound
// commands, or execution. Unsupported syntax yields no references (fail closed).
function commandSegments(command) {
  const segments = [];
  let words = [];
  let word = '';
  let started = false;
  let quote = null;
  const finishWord = () => {
    if (started) words.push(word);
    word = '';
    started = false;
  };
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (/[$`%^\r\n]/.test(char)) return null;
    if (char === '\\' && /["'\s]/.test(command[index + 1] ?? '')) return null;
    if (quote) {
      if (char === quote) quote = null;
      else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (char === '&' && command[index + 1] === '&') {
      finishWord();
      if (!words.length) return null;
      segments.push(words);
      words = [];
      index += 1;
    } else if (/[&|;<>()[\]]/.test(char)) {
      return null;
    } else if (/\s/.test(char)) {
      finishWord();
    } else {
      word += char;
      started = true;
    }
  }
  if (quote) return null;
  finishWord();
  if (!words.length) return null;
  segments.push(words);
  return segments;
}

const VALUE_OPTIONS = new Set([
  '--import', '--require', '-r',
  '--test-concurrency', '--test-reporter', '--test-reporter-destination', '--test-timeout',
]);

// Consume options before file operands, including their values. In particular,
// a reporter/import value ending in .test.ts is never a suite reference. Unknown
// options (including eval/print and test filtering/sharding) are unsupported.
function nodeOptions(words, start, testMode = false) {
  let index = start;
  for (; index < words.length && words[index].startsWith('-'); index += 1) {
    const word = words[index];
    if (word === '--') return { index: index + 1, testMode };
    if (word === '--test') {
      testMode = true;
      continue;
    }
    if (word === '--no-warnings') continue;
    const equals = word.indexOf('=');
    const option = equals < 0 ? word : word.slice(0, equals);
    if (!VALUE_OPTIONS.has(option)) return null;
    const value = equals < 0 ? words[++index] : word.slice(equals + 1);
    if (!value || value.startsWith('-')) return null;
  }
  return { index, testMode };
}

function literalPath(word) {
  return Boolean(word) && !/[*?{}\[\]$`%]/.test(word);
}

function testOperands(words, cwd) {
  if (!['node', 'node.exe'].includes(words[0])) return [];
  let options = nodeOptions(words, 1);
  if (!options) return [];
  if (!options.testMode) {
    const program = words[options.index];
    if (!literalPath(program)
      || resolve(cwd, program.replaceAll('\\', '/')) !== TEST_WRAPPER) return [];
    options = nodeOptions(words, options.index + 1, true);
    if (!options) return [];
  }
  const operands = words.slice(options.index);
  // Options after operands and glob/variable paths are outside this grammar.
  if (operands.some((word) => word.startsWith('-') || !literalPath(word))) return [];
  return operands.filter((word) => word.endsWith('.test.ts'));
}

function collectReferences() {
  const references = new Map();
  for (const packageFile of PACKAGE_FILES) {
    const packagePath = resolve(REPO_ROOT, packageFile);
    const { scripts = {} } = JSON.parse(readFileSync(packagePath, 'utf8'));
    for (const [name, command] of Object.entries(scripts)) {
      let cwd = dirname(packagePath);
      for (const words of commandSegments(command) ?? []) {
        if (words[0] === 'cd') {
          if (words.length !== 2 || !literalPath(words[1])) break;
          cwd = resolve(cwd, words[1].replaceAll('\\', '/'));
          continue;
        }
        // These shell builtins also change the parent directory, but their
        // directory-stack semantics are deliberately outside the grammar.
        if (['pushd', 'popd'].includes(words[0])) break;
        for (const operand of testOperands(words, cwd)) {
          const file = repoPath(resolve(cwd, operand.replaceAll('\\', '/')));
          if (!references.has(file)) references.set(file, []);
          references.get(file).push(`${packageFile}#${name}`);
        }
      }
    }
  }
  return references;
}

try {
  const tests = TEST_ROOTS.flatMap((root) => collectTests(resolve(REPO_ROOT, root))).sort();
  const references = collectReferences();
  const errors = [];
  for (const [file, reason] of Object.entries(EXEMPTIONS)) {
    if (typeof reason !== 'string' || !reason.trim()) errors.push(`Exemption needs a reason: ${file}`);
    if (!tests.includes(file)) errors.push(`Exemption does not name an existing test: ${file}`);
    if (references.has(file)) errors.push(`Remove exemption for wired test: ${file}`);
  }
  const missing = tests.filter((file) => !references.has(file) && !Object.hasOwn(EXEMPTIONS, file));
  const exempted = tests.filter((file) => Object.hasOwn(EXEMPTIONS, file));
  const wired = tests.filter((file) => references.has(file));
  console.log(`[test-wiring] ${tests.length} test files; ${wired.length} wired; ${exempted.length} exempted; ${missing.length} unwired.`);
  for (const file of exempted) console.log(`[EXEMPT] ${file}: ${EXEMPTIONS[file]}`);
  for (const error of errors) console.error(`[FAIL] ${error}`);
  if (missing.length) {
    console.error('[FAIL] Tests missing an explicit package.json script reference:');
    for (const file of missing) console.error(`- ${file}`);
    console.error('Wire each suite into its curated test script, or add an exact exemption with a reason and follow-up.');
  }
  if (errors.length || missing.length) process.exitCode = 1;
  else console.log('[PASS] Every server test is explicitly wired or explained.');
} catch (error) {
  console.error(`[FAIL] Test-wiring inventory failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
