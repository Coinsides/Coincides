// One-off read-only client module-mock census. Run from the repository root.
// The only write is mock-census.json beside this evidence script.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../../../client/node_modules/typescript');
const root = process.cwd();
const normalize = (value) => path.resolve(value).replaceAll('\\', '/');
const relative = (value) => path.relative(root, value).replaceAll('\\', '/');
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.vite', 'coverage'].includes(entry.name)) walk(path.join(directory, entry.name));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(normalize(path.join(directory, entry.name)));
  }
}
walk('client');
const config = ts.readConfigFile('client/tsconfig.json', ts.sys.readFile);
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, path.resolve('client')).options;
const resolve = (specifier, owner) => {
  const resolved = ts.resolveModuleName(specifier, owner, options, ts.sys).resolvedModule;
  if (!resolved || resolved.isExternalLibraryImport || resolved.resolvedFileName.endsWith('.d.ts')) return null;
  return normalize(resolved.resolvedFileName);
};
const apiPath = normalize('client/src/services/api.ts');
const authPath = normalize('client/src/stores/authStore.ts');
const agentPath = normalize('client/src/stores/agentStore.ts');
const skinPath = normalize('client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.ts');
const boardSkinPath = normalize('client/src/pages/Boards/useBoardSkin.ts');
const modules = new Map();
const allMocks = [];
const unresolvedMocks = [];
function parse(file) {
  if (modules.has(file)) return modules.get(file);
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const mocks = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ['mock', 'doMock', 'unmock', 'doUnmock'].includes(node.expression.name.text)) {
      const arg = node.arguments[0];
      const specifier = arg && ts.isStringLiteralLike(arg) ? arg.text : null;
      const factory = node.arguments[1];
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const exported = new Set();
      const collect = (child) => {
        if (ts.isObjectLiteralExpression(child)) for (const property of child.properties) {
          if (property.name) exported.add(property.name.getText(sf));
        }
        ts.forEachChild(child, collect);
      };
      if (factory) collect(factory);
      const mock = {
        file: relative(file), line, call: node.expression.getText(sf), specifier,
        target: specifier ? resolve(specifier, file) : null,
        importsOriginal: Boolean(factory && /importOriginal|importActual/.test(factory.getText(sf))),
        exports: ['default', 'getToken', 'setToken', 'API_BASE'].filter((name) => exported.has(name)),
      };
      mocks.push(mock);
      allMocks.push(mock);
      if (!specifier) unresolvedMocks.push(mock);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  // Transpilation removes type-only imports, including ordinary imports used only as types.
  const output = ts.transpileModule(source, { compilerOptions: { ...options, noEmit: false } }).outputText;
  const js = ts.createSourceFile(file + '.js', output, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const dependencies = [];
  const apiImports = new Set();
  const add = (specifier) => {
    const target = resolve(specifier, file);
    if (target) dependencies.push(target);
    return target;
  };
  function visitRuntime(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const target = add(node.moduleSpecifier.text);
      if (target === apiPath && ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (clause?.name) apiImports.add('default');
        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) apiImports.add(element.propertyName?.text || element.name.text);
        } else if (clause?.namedBindings) apiImports.add('*');
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
        && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) add(node.arguments[0].text);
    ts.forEachChild(node, visitRuntime);
  }
  visitRuntime(js);
  const record = { file, mocks, dependencies: [...new Set(dependencies)], apiImports: [...apiImports] };
  modules.set(file, record);
  return record;
}
for (const file of files) parse(file);
const rows = [];
for (const mock of allMocks.filter((entry) => entry.target === apiPath)) {
  const test = normalize(mock.file);
  const overridden = new Set(parse(test).mocks.filter((entry) => entry.target && !entry.importsOriginal).map((entry) => entry.target));
  const paths = new Map([[test, [test]]]);
  const queue = [test];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const next of parse(current).dependencies) {
      if (overridden.has(next) || paths.has(next)) continue;
      paths.set(next, [...paths.get(current), next]);
      queue.push(next);
    }
  }
  const consumers = queue.filter((file) => parse(file).apiImports.some((name) => name !== 'default'))
    .map((file) => ({ file: relative(file), imports: parse(file).apiImports, path: paths.get(file).map(relative) }));
  const consumed = [...new Set(consumers.flatMap((consumer) => consumer.imports))].sort();
  const missing = mock.importsOriginal ? [] : consumed.filter((name) => !mock.exports.includes(name));
  rows.push({ ...mock, target: relative(mock.target),
    reachesBoardSkin: paths.has(boardSkinPath), reachesNoteSkin: paths.has(skinPath), reachesAuth: paths.has(authPath), reachesAgent: paths.has(agentPath),
    effectiveExports: mock.importsOriginal ? ['default', 'getToken', 'setToken', 'API_BASE'] : mock.exports,
    missingConsumedExports: missing,
    classification: missing.length ? 'reachable-missing-named-exports' : consumers.length ? 'reachable-named-exports-present' : 'no-real-named-api-consumer',
    consumers,
  });
}
const browserHelpers = files.filter((file) => /\/scripts\/.*mockapi\.[cm]?[jt]sx?$/i.test(file)).map((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const exports = ['default', 'getToken', 'setToken', 'API_BASE'].filter((name) => name === 'default'
    ? /export\s+default\b/.test(source) : new RegExp(`export\\s+(?:const|function|let|var)\\s+${name}\\b`).test(source));
  return { file: relative(file), exports, missingApiExports: ['default', 'getToken', 'setToken', 'API_BASE'].filter((name) => !exports.includes(name)) };
});
const report = {
  status: 'B1b final current-tree census; no historical export assumptions',
  scope: 'All client .ts/.tsx/.js/.jsx/.mts/.cts/.mjs/.cjs source files; exclude node_modules, dist, .vite and coverage',
  method: 'TypeScript AST mock inventory; transpiled value-import graph; respect full test-local mocks; include literal dynamic imports conservatively',
  caveat: 'Static reachability identifies imported consumers; full Vitest run determines actual execution. Runtime dynamic imports in uncalled branches may overapproximate.',
  sourceFileCount: files.length,
  testFileCount: files.filter((file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)).length,
  mockCallCount: allMocks.length,
  mockedFileCount: new Set(allMocks.map((mock) => mock.file)).size,
  apiMockCount: rows.length,
  doMockCount: allMocks.filter((mock) => mock.call.endsWith('.doMock')).length,
  nonliteralMockCount: unresolvedMocks.length,
  relativeApiMockCount: rows.filter((mock) => mock.specifier.startsWith('.')).length,
  manualMockFiles: files.filter((file) => /\/__mocks__\//.test(file)).map(relative),
  classificationCounts: rows.reduce((counts, row) => { counts[row.classification] = (counts[row.classification] || 0) + 1; return counts; }, {}),
  browserHelpers,
  apiNamedConsumers: [...modules.values()].filter((record) => record.apiImports.some((name) => name !== 'default')).map((record) => ({ file: relative(record.file), imports: record.apiImports })),
  rows,
};
fs.writeFileSync(path.join(__dirname, 'mock-census.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, rows: rows.filter(row => row.missingConsumedExports.length) }, null, 2));
