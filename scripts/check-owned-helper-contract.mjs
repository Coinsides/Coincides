import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOTS = ['server/src', 'server/scripts', 'client/src', 'client/scripts', 'shared', 'scripts'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const requireFromServer = createRequire(new URL('../server/package.json', import.meta.url));
const ts = requireFromServer('typescript');
const isOwnedName = (name) => /^(get|find)Owned\w*$/.test(name ?? '');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Cannot inspect linked source: ${path}`);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function unwrap(expression) {
  while (expression && (ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isParenthesizedExpression(expression)
    || ts.isNonNullExpression(expression))) expression = expression.expression;
  return expression;
}

function declarationName(node) {
  const name = node.name;
  if (name && (ts.isIdentifier(name) || ts.isStringLiteralLike(name))) return name.text;
  if (name && ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) return name.expression.text;
  return undefined;
}

// Discover definitions, including private/local functions. A hand-maintained
// export list would let the next unexported duplicate escape this contract.
export function inspectOwnedSource(sourceText, file = 'ownership.ts') {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const definitions = [];
  const violations = source.parseDiagnostics.map((diagnostic) => ({
    file,
    line: source.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  }));
  function inspect(node, fn, name) {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const fail = (message) => violations.push({ file, line, name, message });
    if (!fn?.body || !ts.isFunctionDeclaration(node)) {
      fail('Ownership implementations must be named function declarations so every implementation is contract-tested.');
      return;
    }
    const parameters = fn.parameters;
    const parameterNames = parameters.map((parameter) => parameter.name.getText(source));
    if (parameters.length !== 3 || parameterNames[0] !== 'db' || parameterNames[1] !== 'userId'
      || !/^[a-zA-Z]\w*Id$/.test(parameterNames[2] ?? '')
      || parameters.some((parameter) => parameter.questionToken || parameter.dotDotDotToken || parameter.initializer)
      || parameters[0]?.type?.getText(source) !== 'Database.Database'
      || parameters.slice(1).some((parameter) => parameter.type?.kind !== ts.SyntaxKind.StringKeyword)) {
      fail('Expected exactly (db: Database.Database, userId: string, xId: string), without optional/default/rest parameters.');
    }
    if (fn.asteriskToken || fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) {
      fail('Ownership readers must return the row synchronously.');
    }

    const queries = [];
    const returns = [];
    const throws = [];
    const bindings = new Map();
    function visitBody(child) {
      if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression)
        && child.expression.name.text === 'get') {
        const prepare = child.expression.expression;
        if (ts.isCallExpression(prepare) && ts.isPropertyAccessExpression(prepare.expression)
          && prepare.expression.name.text === 'prepare'
          && ts.isIdentifier(prepare.expression.expression) && prepare.expression.expression.text === 'db') {
          const sql = prepare.arguments[0];
          queries.push({ node: child, sql: sql && ts.isStringLiteralLike(sql) ? sql.text : null });
        }
      }
      if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name)) bindings.set(child.name.text, unwrap(child.initializer));
      if (ts.isReturnStatement(child)) returns.push(unwrap(child.expression));
      if (ts.isThrowStatement(child)) throws.push(unwrap(child.expression));
      ts.forEachChild(child, visitBody);
    }
    visitBody(fn.body);
    // A direct whole-row read is the current resource-service form. More complex
    // readers must extend the contract runner before entering this namespace.
    const query = queries[0];
    const queryMatch = queries.length === 1 && query.sql?.match(/^\s*SELECT\s+\*\s+FROM\s+([a-zA-Z_]\w*)\s+WHERE\s+/i);
    if (!queryMatch) fail('Expected one literal SELECT * FROM <resource> WHERE ... read through the supplied db.');
    const isRow = (expression) => expression === query?.node
      || (expression && ts.isIdentifier(expression) && bindings.get(expression.text) === query?.node);
    if (returns.length !== 1 || !isRow(returns[0])) fail('Return the complete queried row unchanged; projections/hydration belong outside getOwned*/findOwned*.');
    const family = name.startsWith('get') ? 'get' : 'find';
    if (family === 'get') {
      if (throws.length !== 1 || !ts.isNewExpression(throws[0])
        || !ts.isIdentifier(throws[0].expression) || throws[0].expression.text !== 'AppError'
        || throws[0].arguments?.[0]?.getText(source) !== '404') {
        fail('getOwned* must throw AppError(404, ...) when the owned row is absent.');
      }
    } else if (throws.length !== 0) {
      fail('findOwned* must return undefined for an absent row, without throwing.');
    }
    definitions.push({
      file, line, name, family, table: queryMatch ? queryMatch[1] : null,
      source: fn.getText(source).replace(/^(?:export\s+)?(?:default\s+)?/, ''),
    });
  }
  function visit(node) {
    if (ts.isExportSpecifier(node) && isOwnedName(node.name.text)
      && node.propertyName && node.propertyName.text !== node.name.text) {
      violations.push({
        file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        name: node.name.text,
        message: 'Export ownership readers by their declared name so family and implementation remain discoverable.',
      });
    }
    const name = declarationName(node);
    if (isOwnedName(name)) {
      if (ts.isFunctionDeclaration(node)) inspect(node, node, name);
      else if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) inspect(node, node, name);
      else if (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isPropertyAssignment(node)) inspect(node, unwrap(node.initializer), name);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (definitions.length) {
    function checkRouteDependency(node) {
      const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? node.arguments[0] : undefined;
      if (specifier && ts.isStringLiteralLike(specifier) && /(?:^|\/)routes\//.test(specifier.text)) {
        violations.push({
          file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          message: 'Ownership resource services must not depend on route modules (TD-16).',
        });
      }
      ts.forEachChild(node, checkRouteDependency);
    }
    checkRouteDependency(source);
  }
  return { definitions, violations };
}

export function collectOwnedContracts() {
  const files = SOURCE_ROOTS.flatMap((directory) => sourceFiles(resolve(REPO_ROOT, directory))).sort();
  const definitions = [];
  const violations = [];
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    if (!/(?:get|find)Owned/.test(text)) continue;
    const file = relative(REPO_ROOT, path).split(sep).join('/');
    const result = inspectOwnedSource(text, file);
    definitions.push(...result.definitions);
    violations.push(...result.violations);
  }
  return { scannedFileCount: files.length, definitions, violations };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inventory = collectOwnedContracts();
  for (const violation of inventory.violations) {
    console.error(`[FAIL] ${violation.file}:${violation.line} ${violation.name ?? ''}: ${violation.message}`);
  }
  if (!inventory.definitions.length) console.error('[FAIL] No ownership reader implementations were found.');
  process.exitCode = inventory.violations.length || !inventory.definitions.length ? 1 : 0;
  const getCount = inventory.definitions.filter((definition) => definition.family === 'get').length;
  const findCount = inventory.definitions.length - getCount;
  console.log(`[${process.exitCode ? 'FAIL' : 'PASS'}] owned-helper contract: ${getCount} getOwned* / ${findCount} findOwned*, including unexported helpers, across ${inventory.scannedFileCount} first-party source files.`);
}
