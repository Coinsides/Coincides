import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_SRC_ROOT = resolve(REPO_ROOT, 'server', 'src');
const SERVER_TEST_ROOT = resolve(SERVER_SRC_ROOT, '__tests__');
const SHARED_ROOT = resolve(REPO_ROOT, 'shared');
const SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);

const requireFromServer = createRequire(
  new URL('../server/package.json', import.meta.url),
);
const ts = requireFromServer('typescript');

function isWithin(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === ''
    || (!isAbsolute(pathFromRoot)
      && pathFromRoot !== '..'
      && !pathFromRoot.startsWith(`..${sep}`));
}

function repoRelativePath(filePath) {
  return relative(REPO_ROOT, filePath).split(sep).join('/');
}

function collectSourceFiles(directory) {
  const files = [];
  const entries = readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      // Contract tests must statically import shared: that is the A1′ cross-end
      // equality lock itself, and the tsx test world is already known to support
      // it. This gate blocks product-code crossings, not test crossings.
      if (entryPath === SERVER_TEST_ROOT) continue;
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function isSharedSpecifier(importingFile, specifier) {
  if (specifier === '@shared' || specifier.startsWith('@shared/')) return true;
  if (!/^\.\.?[\\/]/.test(specifier)) return false;

  return isWithin(SHARED_ROOT, resolve(dirname(importingFile), specifier));
}

function sourceLocation(sourceFile, position) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
  return { line: line + 1, column: character + 1 };
}

function inspectSourceFile(filePath) {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const parseFailures = sourceFile.parseDiagnostics.map((diagnostic) => ({
    filePath,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    ...sourceLocation(sourceFile, diagnostic.start ?? 0),
  }));
  const violations = [];
  let typeOnlySharedImportCount = 0;

  function recordSharedImport(node, specifier, isTypeOnly) {
    if (!isSharedSpecifier(filePath, specifier)) return;

    // Only declaration-level `import type` is accepted. The current baseline
    // has zero mixed clauses. Strictness may cause one future false positive,
    // while leniency can admit a dev/production runtime crash; the costs are
    // asymmetric, so mixed clauses such as `import { type A, b }` are rejected.
    if (isTypeOnly) {
      typeOnlySharedImportCount += 1;
      return;
    }

    violations.push({
      filePath,
      specifier,
      ...sourceLocation(sourceFile, node.getStart(sourceFile)),
    });
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      recordSharedImport(
        node,
        node.moduleSpecifier.text,
        node.importClause?.isTypeOnly === true,
      );
    } else if (ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression
      && ts.isStringLiteralLike(node.moduleReference.expression)) {
      recordSharedImport(
        node,
        node.moduleReference.expression.text,
        node.isTypeOnly,
      );
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { parseFailures, typeOnlySharedImportCount, violations };
}

const sourceFiles = collectSourceFiles(SERVER_SRC_ROOT);
const parseFailures = [];
const violations = [];
let typeOnlySharedImportCount = 0;

for (const filePath of sourceFiles) {
  const result = inspectSourceFile(filePath);
  parseFailures.push(...result.parseFailures);
  violations.push(...result.violations);
  typeOnlySharedImportCount += result.typeOnlySharedImportCount;
}

if (parseFailures.length > 0) {
  console.error('[FAIL] server shared runtime-import gate could not parse every product source file:');
  for (const failure of parseFailures) {
    console.error(
      `- ${repoRelativePath(failure.filePath)}:${failure.line}:${failure.column} ${failure.message}`,
    );
  }
  process.exitCode = 1;
} else if (violations.length > 0) {
  console.error(`[FAIL] server product code has ${violations.length} non-import-type shared import(s):`);
  for (const violation of violations) {
    console.error(
      `- ${repoRelativePath(violation.filePath)}:${violation.line}:${violation.column} imports ${violation.specifier}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `[PASS] server shared runtime-import gate: 0 violations across ${sourceFiles.length} product source file(s); ${typeOnlySharedImportCount} import-type shared import(s) allowed; server/src/__tests__ excluded.`,
  );
}
