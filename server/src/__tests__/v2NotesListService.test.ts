import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import express from 'express';
import ts from 'typescript';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_COURSE_ID = '77777777-7777-4777-8777-777777777777';

interface Fixture {
  baseUrl: string;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

async function withNotesHttp(run: (fixture: Fixture) => void | Promise<void>): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-list-notes-service-'));
  let server: Server | null = null;
  try {
    const db = await initDb(join(tempRoot, 'test.db'));
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(USER_ID, 'list-notes@example.com', 'List Notes User', '2026-08-23 08:00:00');
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(OTHER_USER_ID, 'other-list-notes@example.com', 'Other User', '2026-08-23 08:00:00');
    db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(COURSE_ID, USER_ID, 'List Notes Course', '2026-08-23 08:00:00', '2026-08-23 08:00:00');
    db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(OTHER_COURSE_ID, OTHER_USER_ID, 'Other Course', '2026-08-23 08:00:00', '2026-08-23 08:00:00');

    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, user_id, course_id, title, description, status, source_kind,
        page_format, metadata, operation_batch_id, created_at, updated_at,
        trashed_at, note_class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `);
    insertNote.run(
      '33333333-3333-4333-8333-333333333333', USER_ID, COURSE_ID,
      'Older active', null, 'active', 'manual', 'flow',
      '{"marker":"older","nested":{"value":1}}',
      '2026-08-23 08:01:00', '2026-08-23 08:02:00', null, 'user',
    );
    insertNote.run(
      '44444444-4444-4444-8444-444444444444', USER_ID, COURSE_ID,
      'Newest active', 'byte baseline', 'active', 'manual', 'flow',
      '{"marker":"newest","items":["a","b"]}',
      '2026-08-23 08:03:00', '2026-08-23 08:04:00', null, 'user',
    );
    insertNote.run(
      '55555555-5555-4555-8555-555555555555', USER_ID, COURSE_ID,
      'Archived', null, 'archived', 'manual', 'flow',
      '{"marker":"archived"}',
      '2026-08-23 08:05:00', '2026-08-23 08:06:00', null, 'user',
    );

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as AuthRequest).userId = USER_ID;
      next();
    });
    app.use('/api/notes', noteRoutes);
    app.use(errorHandler);
    server = app.listen();
    await new Promise<void>((resolveListen) => server!.once('listening', resolveListen));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP fixture did not bind a TCP port');
    await run({ baseUrl: `http://127.0.0.1:${address.port}` });
  } finally {
    if (server) await closeServer(server);
    closeDb();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function expectedActiveNotesBytes(): Buffer {
  return Buffer.from(JSON.stringify([
    {
      id: '44444444-4444-4444-8444-444444444444',
      user_id: USER_ID,
      course_id: COURSE_ID,
      title: 'Newest active',
      description: 'byte baseline',
      status: 'active',
      source_kind: 'manual',
      page_format: 'flow',
      metadata: { marker: 'newest', items: ['a', 'b'] },
      operation_batch_id: null,
      created_at: '2026-08-23 08:03:00',
      updated_at: '2026-08-23 08:04:00',
      trashed_at: null,
      note_class: 'user',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      user_id: USER_ID,
      course_id: COURSE_ID,
      title: 'Older active',
      description: null,
      status: 'active',
      source_kind: 'manual',
      page_format: 'flow',
      metadata: { marker: 'older', nested: { value: 1 } },
      operation_batch_id: null,
      created_at: '2026-08-23 08:01:00',
      updated_at: '2026-08-23 08:02:00',
      trashed_at: null,
      note_class: 'user',
    },
  ]), 'utf8');
}

function normalizedSourcePath(path: string): string {
  return resolve(path).replace(/\\/g, '/').toLowerCase();
}

function isLexicalBindingIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isImportSpecifier(parent) && parent.name === node)
    || (ts.isImportClause(parent) && parent.name === node)
    || (ts.isNamespaceImport(parent) && parent.name === node)
    || (ts.isImportEqualsDeclaration(parent) && parent.name === node)
    || (ts.isVariableDeclaration(parent) && parent.name === node)
    || (ts.isBindingElement(parent) && parent.name === node)
    || (ts.isParameter(parent) && parent.name === node)
    || (ts.isFunctionDeclaration(parent) && parent.name === node)
    || (ts.isFunctionExpression(parent) && parent.name === node)
    || (ts.isClassDeclaration(parent) && parent.name === node)
    || (ts.isClassExpression(parent) && parent.name === node)
    || (ts.isEnumDeclaration(parent) && parent.name === node)
    || (ts.isTypeAliasDeclaration(parent) && parent.name === node)
    || (ts.isInterfaceDeclaration(parent) && parent.name === node)
  );
}

function assertListNotesRouteUsesCanonicalService(): void {
  const configPath = resolve(REPO_ROOT, 'server/tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    assert.fail(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  }
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(configPath),
    undefined,
    configPath,
  );
  assert.deepEqual(
    parsedConfig.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')),
    [],
    'server tsconfig must parse before checking the route binding',
  );

  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  const checker = program.getTypeChecker();
  const routePath = resolve(REPO_ROOT, 'server/src/routes/notes.ts');
  const canonicalServicePath = resolve(REPO_ROOT, 'server/src/services/notes.ts');
  const routeSource = program.getSourceFiles().find(
    (sourceFile) => normalizedSourcePath(sourceFile.fileName) === normalizedSourcePath(routePath),
  );
  const canonicalServiceSource = program.getSourceFiles().find(
    (sourceFile) => normalizedSourcePath(sourceFile.fileName) === normalizedSourcePath(canonicalServicePath),
  );
  assert.ok(routeSource, 'routes/notes.ts must be part of the server TypeScript program');
  assert.ok(canonicalServiceSource, 'services/notes.ts must be part of the server TypeScript program');

  const canonicalModuleSymbol = checker.getSymbolAtLocation(canonicalServiceSource);
  assert.ok(canonicalModuleSymbol, 'canonical notes service module symbol must resolve');
  const canonicalExportSymbol = checker
    .getExportsOfModule(canonicalModuleSymbol)
    .find((symbol) => symbol.getName() === 'listNotes');
  assert.ok(canonicalExportSymbol, 'canonical notes service must export listNotes');

  const listNotesImports: Array<{
    declaration: ts.ImportDeclaration;
    specifier: ts.ImportSpecifier;
  }> = [];
  for (const statement of routeSource.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
    if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;
    for (const specifier of statement.importClause.namedBindings.elements) {
      const importedName = specifier.propertyName?.text ?? specifier.name.text;
      if (importedName === 'listNotes') {
        listNotesImports.push({ declaration: statement, specifier });
      }
    }
  }
  assert.equal(
    listNotesImports.length,
    1,
    'routes/notes.ts must import the listNotes export exactly once',
  );

  const [{ declaration: listNotesImport, specifier: listNotesSpecifier }] = listNotesImports;
  assert.ok(ts.isStringLiteral(listNotesImport.moduleSpecifier), 'listNotes import source must be a string literal');
  const resolvedImport = ts.resolveModuleName(
    listNotesImport.moduleSpecifier.text,
    routePath,
    parsedConfig.options,
    ts.sys,
  ).resolvedModule;
  assert.ok(resolvedImport, 'listNotes import source must resolve');
  assert.equal(
    normalizedSourcePath(resolvedImport.resolvedFileName),
    normalizedSourcePath(canonicalServicePath),
    'listNotes import must resolve directly to services/notes.ts',
  );

  const importedBindingSymbol = checker.getSymbolAtLocation(listNotesSpecifier.name);
  assert.ok(importedBindingSymbol, 'listNotes import binding symbol must resolve');
  assert.equal(
    checker.getAliasedSymbol(importedBindingSymbol),
    canonicalExportSymbol,
    'listNotes import binding must alias the canonical service export',
  );

  const lexicalBindings: ts.Identifier[] = [];
  const findLexicalBindings = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && isLexicalBindingIdentifier(node)) {
      lexicalBindings.push(node);
    }
    ts.forEachChild(node, findLexicalBindings);
  };
  findLexicalBindings(routeSource);
  assert.ok(
    lexicalBindings.includes(listNotesSpecifier.name),
    'lexical binding probe must see the canonical listNotes import',
  );
  const extraListNotesBindings = lexicalBindings.filter(
    (binding) => binding.text === 'listNotes'
      && checker.getSymbolAtLocation(binding) !== importedBindingSymbol,
  );
  assert.equal(
    extraListNotesBindings.length,
    0,
    'routes/notes.ts must not declare a second listNotes lexical binding',
  );

  const routerDeclaration = routeSource.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'router');
  assert.ok(routerDeclaration && ts.isIdentifier(routerDeclaration.name), 'top-level router binding must exist');
  const routerSymbol = checker.getSymbolAtLocation(routerDeclaration.name);
  assert.ok(routerSymbol, 'top-level router binding symbol must resolve');

  const rootGetHandlers: Array<ts.ArrowFunction | ts.FunctionExpression> = [];
  const findRootGetHandler = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && checker.getSymbolAtLocation(node.expression.expression) === routerSymbol
      && node.expression.name.text === 'get'
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === '/'
    ) {
      for (const argument of node.arguments.slice(1)) {
        if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
          rootGetHandlers.push(argument);
        }
      }
    }
    ts.forEachChild(node, findRootGetHandler);
  };
  findRootGetHandler(routeSource);
  assert.equal(rootGetHandlers.length, 1, 'GET / route callback must exist exactly once');

  const responseCalls: ts.CallExpression[] = [];
  const handler = rootGetHandlers[0];
  const responseParameter = handler.parameters[1]?.name;
  assert.ok(responseParameter && ts.isIdentifier(responseParameter), 'GET / handler response parameter must be an identifier');
  const responseSymbol = checker.getSymbolAtLocation(responseParameter);
  assert.ok(responseSymbol, 'GET / handler response binding symbol must resolve');
  const findResponseCall = (node: ts.Node): void => {
    if (node !== handler && ts.isFunctionLike(node)) return;
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && checker.getSymbolAtLocation(node.expression.expression) === responseSymbol
      && node.expression.name.text === 'json'
    ) {
      responseCalls.push(node);
    }
    ts.forEachChild(node, findResponseCall);
  };
  findResponseCall(handler);
  assert.equal(responseCalls.length, 1, 'GET / handler must call res.json exactly once');

  const responseValue = responseCalls[0].arguments[0];
  assert.ok(ts.isCallExpression(responseValue), 'GET / response must come from a service call');
  assert.ok(ts.isIdentifier(responseValue.expression), 'GET / response service callee must be an imported identifier');
  assert.equal(
    checker.getSymbolAtLocation(responseValue.expression),
    importedBindingSymbol,
    'GET / response must call the canonical listNotes import binding',
  );
}

test('A-1 route and MCP binding both call the same listNotes service export', () => {
  assertListNotesRouteUsesCanonicalService();

  const bindingSource = readFileSync(resolve(REPO_ROOT, 'server/src/mcp/bindings.ts'), 'utf8');
  assert.match(bindingSource, /import\s+\{[^}]*\blistNotes\b[^}]*\}\s+from\s+'\.\.\/services\/notes\.js';/);
  const listBinding = bindingSource.match(/const listNotesBinding[\s\S]*?\n\};/)?.[0];
  assert.ok(listBinding, 'list_notes binding initializer must exist');
  assert.match(listBinding, /listNotes\(\{/);
});

test('A-3 GET /api/notes keeps the pre-extraction response bytes, default status, hydrate mapping, and DESC order', async () => {
  await withNotesHttp(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/notes?course_id=${COURSE_ID}`);
    const actualBytes = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(actualBytes, expectedActiveNotesBytes());

    const emptyStatusResponse = await fetch(`${baseUrl}/api/notes?course_id=${COURSE_ID}&status=`);
    assert.equal(emptyStatusResponse.status, 200);
    assert.deepEqual(
      Buffer.from(await emptyStatusResponse.arrayBuffer()),
      expectedActiveNotesBytes(),
    );
  });
});

test('list notes HTTP validation and ownership semantics remain unchanged', async () => {
  await withNotesHttp(async ({ baseUrl }) => {
    const missingCourse = await fetch(`${baseUrl}/api/notes`);
    assert.equal(missingCourse.status, 400);
    assert.deepEqual(Buffer.from(await missingCourse.arrayBuffer()), Buffer.from(
      '{"error":"course_id query parameter is required"}',
      'utf8',
    ));

    const invalidStatus = await fetch(`${baseUrl}/api/notes?course_id=${COURSE_ID}&status=deleted`);
    assert.equal(invalidStatus.status, 400);
    assert.deepEqual(Buffer.from(await invalidStatus.arrayBuffer()), Buffer.from(
      '{"error":"Invalid status"}',
      'utf8',
    ));

    const notOwned = await fetch(`${baseUrl}/api/notes?course_id=${OTHER_COURSE_ID}`);
    assert.equal(notOwned.status, 404);
    assert.deepEqual(Buffer.from(await notOwned.arrayBuffer()), Buffer.from(
      '{"error":"Course not found"}',
      'utf8',
    ));

    const archived = await fetch(`${baseUrl}/api/notes?course_id=${COURSE_ID}&status=archived`);
    assert.equal(archived.status, 200);
    const archivedBody = JSON.parse(Buffer.from(await archived.arrayBuffer()).toString('utf8')) as Array<{ title: string }>;
    assert.deepEqual(archivedBody.map((note) => note.title), ['Archived']);
  });
});
