import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_ROOTS = ['server/src', 'server/scripts'];
const PACKAGE_FILES = ['package.json', 'server/package.json'];

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

function collectReferences() {
  const references = new Map();
  for (const packageFile of PACKAGE_FILES) {
    const packagePath = resolve(REPO_ROOT, packageFile);
    const { scripts = {} } = JSON.parse(readFileSync(packagePath, 'utf8'));
    for (const [name, command] of Object.entries(scripts)) {
      let cwd = dirname(packagePath);
      // Read explicit shell words, including quoted paths and `cd server &&`.
      // This is discovery only: no command execution or glob expansion.
      const words = command.match(/"[^"]*"|'[^']*'|&&|\|\||[^\s;&|]+|[;&|]/g) ?? [];
      for (let index = 0; index < words.length; index += 1) {
        const word = words[index].replace(/^("|')(.*)\1$/, '$2');
        if (word === 'cd' && words[index + 1]) {
          cwd = resolve(cwd, words[++index].replace(/^("|')(.*)\1$/, '$2').replaceAll('\\', '/'));
          continue;
        }
        if (!word.endsWith('.test.ts') || /[*?{}\[\]$`]/.test(word)) continue;
        const file = repoPath(resolve(cwd, word.replaceAll('\\', '/')));
        if (!references.has(file)) references.set(file, []);
        references.get(file).push(`${packageFile}#${name}`);
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
