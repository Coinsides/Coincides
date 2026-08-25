import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// @ts-ignore TS6305 -- shared composite output is not emitted by server --noEmit
import { textFlowIdForBlock as sharedTextFlowIdForBlock } from '@shared/types/textFlow';
import { textFlowIdForBlock as serverTextFlowIdForBlock } from '../services/textFlowIdentity.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SHARED_IMPLEMENTATION = resolve(REPO_ROOT, 'shared/types/textFlow.ts');
const SERVER_IMPLEMENTATION = resolve(REPO_ROOT, 'server/src/services/textFlowIdentity.ts');
const CLIENT_SOURCE_ROOT = resolve(REPO_ROOT, 'client/src');
const SHARED_SOURCE_ROOT = resolve(REPO_ROOT, 'shared');
const SERVER_SOURCE_ROOT = resolve(REPO_ROOT, 'server/src');
const CLIENT_CALL_SITES = [
  'client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx',
  'client/src/pages/Notes/canvasEngine/hooks/useBlockTextFlowEditController.ts',
  'client/src/pages/Notes/canvasEngine/hooks/useSlashBlockRollbackController.ts',
  'client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx',
  'client/src/pages/Notes/canvasEngine/layers/ShapeObjectLayer.tsx',
] as const;

function normalizedPath(path: string): string {
  return resolve(path).replace(/\\/g, '/').toLowerCase();
}

function repoRelativePath(path: string): string {
  return relative(REPO_ROOT, path).replace(/\\/g, '/');
}

interface ClientTypeScriptContext {
  program: ts.Program;
  checker: ts.TypeChecker;
  compilerOptions: ts.CompilerOptions;
}

let clientTypeScriptContext: ClientTypeScriptContext | undefined;

function getClientTypeScriptContext(): ClientTypeScriptContext {
  if (clientTypeScriptContext) return clientTypeScriptContext;

  const configPath = resolve(REPO_ROOT, 'client/tsconfig.json');
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
    'client tsconfig must parse before checking TextFlow identity ownership',
  );

  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  clientTypeScriptContext = {
    program,
    checker: program.getTypeChecker(),
    compilerOptions: parsedConfig.options,
  };
  return clientTypeScriptContext;
}

function sourceFileFor(program: ts.Program, file: string): ts.SourceFile {
  const expectedPath = normalizedPath(resolve(REPO_ROOT, file));
  const sourceFile = program.getSourceFiles().find(
    (candidate) => normalizedPath(candidate.fileName) === expectedPath,
  );
  assert.ok(sourceFile, `${file} must be present in the client TypeScript program`);
  return sourceFile;
}

function definitionLocations(sourceFiles: readonly ts.SourceFile[]): string[] {
  const locations: string[] = [];

  for (const sourceFile of sourceFiles) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isFunctionDeclaration(node)
        && node.name?.text === 'textFlowIdForBlock'
      ) {
        locations.push(repoRelativePath(sourceFile.fileName));
      }
      if (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.name.text === 'textFlowIdForBlock'
      ) {
        locations.push(repoRelativePath(sourceFile.fileName));
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return locations.sort();
}

function productProductionSources(program: ts.Program): ts.SourceFile[] {
  const clientRoot = `${normalizedPath(CLIENT_SOURCE_ROOT)}/`;
  const sharedRoot = `${normalizedPath(SHARED_SOURCE_ROOT)}/`;
  const serverRoot = `${normalizedPath(SERVER_SOURCE_ROOT)}/`;
  const serverSources = ts.sys.readDirectory(
    SERVER_SOURCE_ROOT,
    ['.ts', '.tsx'],
  )
    .filter((file) => !normalizedPath(file).includes('/__tests__/'))
    .map(parseSourceFile);
  const seenPaths = new Set<string>();

  return [...program.getSourceFiles(), ...serverSources].filter((sourceFile) => {
    if (sourceFile.isDeclarationFile) return false;
    const path = normalizedPath(sourceFile.fileName);
    if (!path.endsWith('.ts') && !path.endsWith('.tsx')) return false;
    if (path.includes('/__tests__/')) return false;
    if (!path.startsWith(clientRoot) && !path.startsWith(sharedRoot) && !path.startsWith(serverRoot)) {
      return false;
    }
    if (seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
}

function assertSharedClientImport(file: typeof CLIENT_CALL_SITES[number]): void {
  const { program, checker, compilerOptions } = getClientTypeScriptContext();
  const sourceFile = sourceFileFor(program, file);
  const matchingImports: Array<{
    declaration: ts.ImportDeclaration;
    specifier: ts.ImportSpecifier;
  }> = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
    if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;
    for (const specifier of statement.importClause.namedBindings.elements) {
      const importedName = specifier.propertyName?.text ?? specifier.name.text;
      if (importedName === 'textFlowIdForBlock' || specifier.name.text === 'textFlowIdForBlock') {
        matchingImports.push({ declaration: statement, specifier });
      }
    }
  }

  assert.equal(
    matchingImports.length,
    1,
    `${file} must have exactly one named import for textFlowIdForBlock`,
  );
  const [{ declaration, specifier }] = matchingImports;
  assert.equal(
    specifier.propertyName,
    undefined,
    `${file} must import textFlowIdForBlock without an alias`,
  );
  assert.equal(
    specifier.name.text,
    'textFlowIdForBlock',
    `${file} must bind the canonical textFlowIdForBlock name`,
  );
  assert.ok(
    ts.isStringLiteral(declaration.moduleSpecifier),
    `${file} textFlowIdForBlock import source must be a string literal`,
  );

  const resolvedImport = ts.resolveModuleName(
    declaration.moduleSpecifier.text,
    sourceFile.fileName,
    compilerOptions,
    ts.sys,
  ).resolvedModule;
  assert.ok(resolvedImport, `${file} textFlowIdForBlock import source must resolve`);
  assert.equal(
    normalizedPath(resolvedImport.resolvedFileName),
    normalizedPath(SHARED_IMPLEMENTATION),
    `${file} must import textFlowIdForBlock directly from shared/types/textFlow.ts`,
  );

  const importBinding = checker.getSymbolAtLocation(specifier.name);
  assert.ok(importBinding, `${file} textFlowIdForBlock import binding must resolve`);
  const canonicalCalls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'textFlowIdForBlock'
      && checker.getSymbolAtLocation(node.expression) === importBinding
    ) {
      canonicalCalls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assert.ok(
    canonicalCalls.length >= 1,
    `${file} must call its canonical shared textFlowIdForBlock import`,
  );
}

function parseSourceFile(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.toLowerCase().endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

test('textFlowIdForBlock implementations stay byte-for-byte equal', () => {
  const inputs = [
    '',
    'block-id-with-dashes',
    '含中文的区块-id',
    `long-${'x'.repeat(1024)}`,
  ];

  for (const blockId of inputs) {
    const expected = `textflow-${blockId}`;
    assert.equal(sharedTextFlowIdForBlock(blockId), expected);
    assert.equal(serverTextFlowIdForBlock(blockId), sharedTextFlowIdForBlock(blockId));
  }
});

test('textFlowIdForBlock has exactly the canonical product definitions', () => {
  const { program } = getClientTypeScriptContext();
  const sourceFiles = productProductionSources(program);
  assert.ok(
    sourceFiles.some((sourceFile) => normalizedPath(sourceFile.fileName) === normalizedPath(SHARED_IMPLEMENTATION)),
    'shared/types/textFlow.ts must be present before enumerating definitions',
  );
  assert.ok(
    sourceFiles.some((sourceFile) => (
      normalizedPath(sourceFile.fileName)
        === normalizedPath(resolve(REPO_ROOT, 'client/src/pages/Notes/canvasEngine/textFlowService.ts'))
    )),
    'client textFlowService.ts must be present before enumerating definitions',
  );
  assert.ok(
    sourceFiles.some((sourceFile) => (
      normalizedPath(sourceFile.fileName)
        === normalizedPath(resolve(REPO_ROOT, 'server/src/services/textFlowUnits.ts'))
    )),
    'server textFlowUnits.ts must be present before enumerating definitions',
  );
  assert.deepEqual(
    definitionLocations(sourceFiles),
    [
      'server/src/services/textFlowIdentity.ts',
      'shared/types/textFlow.ts',
    ],
    'product TS/TSX sources must define textFlowIdForBlock exactly in the canonical shared and server files',
  );
});

test('textFlowIdForBlock client call sites all use the canonical shared import', () => {
  for (const file of CLIENT_CALL_SITES) {
    assertSharedClientImport(file);
  }
});

test('textFlowIdForBlock server implementation remains local', () => {
  const sourceFile = parseSourceFile(SERVER_IMPLEMENTATION);
  assert.deepEqual(
    definitionLocations([sourceFile]),
    ['server/src/services/textFlowIdentity.ts'],
    'server must keep exactly one local textFlowIdForBlock implementation',
  );
  const runtimeImports = sourceFile.statements.filter((statement): statement is ts.ImportDeclaration => (
    ts.isImportDeclaration(statement)
      && (!statement.importClause || !statement.importClause.isTypeOnly)
  ));
  assert.deepEqual(
    runtimeImports,
    [],
    'server textFlowIdentity.ts must not import a shared runtime value',
  );
});
