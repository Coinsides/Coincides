#!/usr/bin/env node
// Static necessary-condition gate for the public tool face.
//
// Tool metadata comes only from docs/generated/tool-face-manifest.json. The
// server and client sources below are evidence used to verify those manifest
// declarations; they are never parsed to discover or complete tool entries.
// A green result does NOT prove that a human can reach the declared UI path.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_MANIFEST_PATH = resolve(
  REPO_ROOT,
  'docs',
  'generated',
  'tool-face-manifest.json',
);
export const TOOL_FACE_PARITY_TEST_MANIFEST_PATH_ENV = 'TOOL_FACE_PARITY_TEST_MANIFEST_PATH';

const SERVER_INDEX_RELATIVE_PATH = 'server/src/index.ts';
const CLIENT_SRC_RELATIVE_PATH = 'client/src';
const CLIENT_API_RELATIVE_PATH = 'client/src/services/api.ts';
const ROUTE_PATTERN = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)$/i;
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

const serverRequire = createRequire(resolve(REPO_ROOT, 'server', 'package.json'));
const ts = serverRequire('typescript');

function toPosix(value) {
  return value.split(sep).join('/');
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function parseSourceFile(path) {
  const scriptKind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(
    path,
    readText(path),
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function staticString(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function stringPattern(node) {
  const literal = staticString(node);
  if (literal != null) return literal;
  if (!ts.isTemplateExpression(node)) return null;

  let value = node.head.text;
  for (const span of node.templateSpans) {
    value += ':dynamic';
    value += span.literal.text;
  }
  return value;
}

function normalizePath(pathValue) {
  let value = String(pathValue || '').trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return value;
    }
  }
  value = value.split(/[?#]/, 1)[0] || '/';
  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/{2,}/g, '/');
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  return value;
}

function joinRoutePaths(mountPath, leafPath) {
  const mount = normalizePath(mountPath);
  const leaf = normalizePath(leafPath);
  if (leaf === '/') return mount;
  if (mount === '/') return leaf;
  return normalizePath(`${mount}/${leaf.slice(1)}`);
}

function resolveTypeScriptModule(importerPath, moduleSpecifier) {
  if (!moduleSpecifier.startsWith('.')) return null;
  const unresolved = resolve(dirname(importerPath), moduleSpecifier);
  const withoutRuntimeExtension = unresolved.replace(/\.(?:mjs|cjs|js)$/i, '');
  const candidates = [
    `${withoutRuntimeExtension}.ts`,
    `${withoutRuntimeExtension}.tsx`,
    resolve(withoutRuntimeExtension, 'index.ts'),
    resolve(withoutRuntimeExtension, 'index.tsx'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function routeRecords(method, fullPath, mountedRouterModule, mountPath, leafPath) {
  const methods = method === 'all' ? [...HTTP_METHODS] : [method];
  return methods.map((item) => ({
    method: item.toUpperCase(),
    fullPath: normalizePath(fullPath),
    mountedRouterModule,
    mountPath: normalizePath(mountPath),
    leafPath: normalizePath(leafPath),
  }));
}

function collectRouterLeafRoutes(repoRoot, routerModulePath, mountPath) {
  const sourceFile = parseSourceFile(routerModulePath);
  const routerIdentifiers = new Set();

  walk(sourceFile, (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && ts.isCallExpression(node.initializer)
      && ts.isIdentifier(node.initializer.expression)
      && node.initializer.expression.text === 'Router'
    ) {
      routerIdentifiers.add(node.name.text);
    }
    if (
      ts.isExportAssignment(node)
      && !node.isExportEquals
      && ts.isIdentifier(node.expression)
    ) {
      routerIdentifiers.add(node.expression.text);
    }
  });

  const moduleRelativePath = toPosix(relative(repoRoot, routerModulePath));
  const routes = [];
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const method = node.expression.name.text.toLowerCase();
    if (!HTTP_METHODS.has(method) && method !== 'all') return;

    let routerName = null;
    let leafPath = null;
    const receiver = node.expression.expression;

    if (ts.isIdentifier(receiver) && routerIdentifiers.has(receiver.text)) {
      routerName = receiver.text;
      leafPath = staticString(node.arguments[0]);
    } else if (
      ts.isCallExpression(receiver)
      && ts.isPropertyAccessExpression(receiver.expression)
      && receiver.expression.name.text === 'route'
      && ts.isIdentifier(receiver.expression.expression)
      && routerIdentifiers.has(receiver.expression.expression.text)
    ) {
      routerName = receiver.expression.expression.text;
      leafPath = staticString(receiver.arguments[0]);
    }

    if (!routerName || leafPath == null) return;
    routes.push(...routeRecords(
      method,
      joinRoutePaths(mountPath, leafPath),
      moduleRelativePath,
      mountPath,
      leafPath,
    ));
  });
  return routes;
}

/**
 * Build method-aware full routes by composing index.ts mounts with each
 * imported router module's leaf routes. Direct app.METHOD routes are included
 * with server/src/index.ts as their mounted module.
 */
export function buildServerRouteGraph(repoRoot = REPO_ROOT) {
  const indexPath = resolve(repoRoot, SERVER_INDEX_RELATIVE_PATH);
  if (!existsSync(indexPath)) {
    throw new Error(`server entry missing: ${SERVER_INDEX_RELATIVE_PATH}`);
  }

  const sourceFile = parseSourceFile(indexPath);
  const importedModules = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const moduleSpecifier = staticString(statement.moduleSpecifier);
    const defaultImport = statement.importClause?.name?.text;
    if (!moduleSpecifier || !defaultImport) continue;
    const resolvedModule = resolveTypeScriptModule(indexPath, moduleSpecifier);
    if (resolvedModule) importedModules.set(defaultImport, resolvedModule);
  }

  const routes = [];
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (!ts.isIdentifier(node.expression.expression) || node.expression.expression.text !== 'app') return;

    const method = node.expression.name.text.toLowerCase();
    const declaredPath = staticString(node.arguments[0]);
    if (declaredPath == null) return;

    if (method === 'use') {
      const routerIdentifier = [...node.arguments]
        .reverse()
        .find((argument) => ts.isIdentifier(argument) && importedModules.has(argument.text));
      if (!routerIdentifier || !ts.isIdentifier(routerIdentifier)) return;
      const routerModulePath = importedModules.get(routerIdentifier.text);
      routes.push(...collectRouterLeafRoutes(repoRoot, routerModulePath, declaredPath));
      return;
    }

    if (!HTTP_METHODS.has(method) && method !== 'all') return;
    routes.push(...routeRecords(
      method,
      declaredPath,
      SERVER_INDEX_RELATIVE_PATH,
      '/',
      declaredPath,
    ));
  });

  return routes;
}

function evaluateStaticStrings(node, declarations, seen = new Set()) {
  const literal = staticString(node);
  if (literal != null) return [literal];

  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) return [];
    const initializer = declarations.get(node.text);
    if (!initializer) return [];
    return evaluateStaticStrings(initializer, declarations, new Set([...seen, node.text]));
  }

  if (ts.isConditionalExpression(node)) {
    return [
      ...evaluateStaticStrings(node.whenTrue, declarations, seen),
      ...evaluateStaticStrings(node.whenFalse, declarations, seen),
    ];
  }

  if (ts.isTemplateExpression(node)) {
    let values = [node.head.text];
    for (const span of node.templateSpans) {
      const expressionValues = evaluateStaticStrings(span.expression, declarations, seen);
      if (expressionValues.length === 0) return [];
      values = values.flatMap((prefix) => expressionValues.map(
        (expressionValue) => `${prefix}${expressionValue}${span.literal.text}`,
      ));
    }
    return values;
  }

  if (ts.isParenthesizedExpression(node)) {
    return evaluateStaticStrings(node.expression, declarations, seen);
  }

  return [];
}

function resolveProjectApiBasePath(repoRoot) {
  const apiPath = resolve(repoRoot, CLIENT_API_RELATIVE_PATH);
  if (!existsSync(apiPath)) {
    throw new Error(`client API module missing: ${CLIENT_API_RELATIVE_PATH}`);
  }
  const sourceFile = parseSourceFile(apiPath);
  const declarations = new Map();
  let baseExpression = null;

  walk(sourceFile, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.set(node.name.text, node.initializer);
    }
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (
      !ts.isIdentifier(node.expression.expression)
      || node.expression.expression.text !== 'axios'
      || node.expression.name.text !== 'create'
    ) return;
    const options = node.arguments[0];
    if (!options || !ts.isObjectLiteralExpression(options)) return;
    const baseProperty = options.properties.find((property) => (
      ts.isPropertyAssignment(property)
      && (
        (ts.isIdentifier(property.name) && property.name.text === 'baseURL')
        || (ts.isStringLiteral(property.name) && property.name.text === 'baseURL')
      )
    ));
    if (baseProperty && ts.isPropertyAssignment(baseProperty)) {
      baseExpression = baseProperty.initializer;
    }
  });

  if (!baseExpression) {
    throw new Error(`${CLIENT_API_RELATIVE_PATH} does not declare axios.create({ baseURL })`);
  }

  const values = evaluateStaticStrings(baseExpression, declarations);
  const pathValues = values.map((value) => {
    if (/^https?:\/\//i.test(value)) return new URL(value).pathname;
    const firstSlash = value.indexOf('/');
    return firstSlash >= 0 ? value.slice(firstSlash) : value;
  }).map(normalizePath);
  const uniquePaths = [...new Set(pathValues)];
  if (uniquePaths.length !== 1) {
    throw new Error(`${CLIENT_API_RELATIVE_PATH} has no single static API path base`);
  }
  return uniquePaths[0];
}

function resolveClientImport(importerPath, moduleSpecifier, repoRoot) {
  if (moduleSpecifier.startsWith('@/')) {
    return resolve(repoRoot, 'client', 'src', moduleSpecifier.slice(2));
  }
  if (moduleSpecifier.startsWith('.')) {
    return resolve(dirname(importerPath), moduleSpecifier);
  }
  return null;
}

function collectApiClientBindings(sourceFile, callSitePath, repoRoot) {
  const apiModuleWithoutExtension = resolve(repoRoot, CLIENT_API_RELATIVE_PATH).replace(/\.tsx?$/i, '');
  const apiBasePath = resolveProjectApiBasePath(repoRoot);
  const bindings = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const moduleSpecifier = staticString(statement.moduleSpecifier);
    const defaultImport = statement.importClause?.name?.text;
    if (!moduleSpecifier || !defaultImport) continue;
    const resolvedImport = resolveClientImport(callSitePath, moduleSpecifier, repoRoot);
    if (!resolvedImport) continue;
    const withoutExtension = resolvedImport.replace(/\.(?:tsx?|jsx?)$/i, '');
    if (withoutExtension === apiModuleWithoutExtension) {
      bindings.set(defaultImport, apiBasePath);
    }
  }
  return bindings;
}

function findSymbolDeclaration(sourceFile, symbol) {
  const matches = [];
  walk(sourceFile, (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === symbol
    ) {
      matches.push(node);
      return;
    }
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isMethodDeclaration(node))
      && node.name
      && ts.isIdentifier(node.name)
      && node.name.text === symbol
    ) {
      matches.push(node);
    }
  });
  if (matches.length === 0) return { error: `symbol missing: ${symbol}` };
  if (matches.length > 1) return { error: `symbol is ambiguous: ${symbol} (${matches.length} declarations)` };
  return { node: matches[0] };
}

function normalizeClientRequestPath(rawPattern, basePath) {
  const requestPath = normalizePath(rawPattern);
  if (requestPath === basePath || requestPath.startsWith(`${basePath}/`)) {
    return requestPath;
  }
  return joinRoutePaths(basePath, requestPath);
}

function requestPatternMatchesRoute(requestPattern, routePath) {
  const requestSegments = normalizePath(requestPattern).split('/').filter(Boolean);
  const routeSegments = normalizePath(routePath).split('/').filter(Boolean);
  if (requestSegments.length !== routeSegments.length) return false;
  return routeSegments.every((routeSegment, index) => {
    const requestSegment = requestSegments[index];
    if (routeSegment.startsWith(':') || routeSegment === '*') return requestSegment.length > 0;
    return routeSegment === requestSegment;
  });
}

function parseCallSite(rawCallSite) {
  const separatorIndex = rawCallSite.lastIndexOf('#');
  if (separatorIndex <= 0 || separatorIndex === rawCallSite.length - 1) return null;
  return {
    filePart: rawCallSite.slice(0, separatorIndex),
    symbolPart: rawCallSite.slice(separatorIndex + 1),
  };
}

function isStrictlyInside(rootPath, candidatePath) {
  const relativePath = relative(rootPath, candidatePath);
  return relativePath.length > 0
    && !relativePath.startsWith(`..${sep}`)
    && relativePath !== '..'
    && !isAbsolute(relativePath);
}

/** Validate the declared method and URL construction inside file#symbol. */
export function validateClientCallConstruction({
  repoRoot = REPO_ROOT,
  method,
  routePath,
  callSite,
}) {
  const parsedCallSite = parseCallSite(String(callSite || '').trim());
  if (!parsedCallSite) {
    return { ok: false, error: 'client_call_site must be <file>#<symbol>', candidates: [] };
  }

  const clientSrcRoot = resolve(repoRoot, CLIENT_SRC_RELATIVE_PATH);
  const callSitePath = resolve(repoRoot, parsedCallSite.filePart);
  if (!isStrictlyInside(clientSrcRoot, callSitePath)) {
    return {
      ok: false,
      error: `client_call_site is outside client/src: ${parsedCallSite.filePart}`,
      candidates: [],
    };
  }
  if (!existsSync(callSitePath)) {
    return {
      ok: false,
      error: `client_call_site file missing: ${parsedCallSite.filePart}`,
      candidates: [],
    };
  }

  const sourceFile = parseSourceFile(callSitePath);
  const symbolResult = findSymbolDeclaration(sourceFile, parsedCallSite.symbolPart);
  if (!symbolResult.node) {
    return { ok: false, error: symbolResult.error, candidates: [] };
  }

  const apiBindings = collectApiClientBindings(sourceFile, callSitePath, repoRoot);
  const candidates = [];
  walk(symbolResult.node, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (!ts.isIdentifier(node.expression.expression)) return;
    const basePath = apiBindings.get(node.expression.expression.text);
    if (!basePath) return;
    const callMethod = node.expression.name.text.toLowerCase();
    if (!HTTP_METHODS.has(callMethod)) return;
    const rawPattern = node.arguments[0] ? stringPattern(node.arguments[0]) : null;
    if (rawPattern == null) return;
    candidates.push({
      method: callMethod.toUpperCase(),
      path: normalizeClientRequestPath(rawPattern, basePath),
      rawPattern,
      apiBinding: node.expression.expression.text,
    });
  });

  const normalizedMethod = String(method || '').toUpperCase();
  const normalizedRoutePath = normalizePath(routePath);
  const match = candidates.find((candidate) => (
    candidate.method === normalizedMethod
    && requestPatternMatchesRoute(candidate.path, normalizedRoutePath)
  ));
  if (!match) {
    const seen = candidates.length
      ? candidates.map((candidate) => `${candidate.method} ${candidate.path}`).join(', ')
      : 'none';
    return {
      ok: false,
      error: `client symbol does not construct ${normalizedMethod} ${normalizedRoutePath}; saw: ${seen}`,
      candidates,
    };
  }
  return { ok: true, match, candidates };
}

export function selectPublicEntries(manifest) {
  return manifest.filter((entry) => entry.exposure === 'public');
}

/**
 * Independently validates the derived public face. Keeping this separate from
 * selectPublicEntries makes a leaking selector observable instead of letting
 * it define its own truth.
 */
export function validatePublicProjection(manifest, publicEntries) {
  const errors = [];
  const manifestNames = new Set(manifest.map((entry) => entry.name));
  const selectedCounts = new Map();

  for (const entry of publicEntries) {
    selectedCounts.set(entry.name, (selectedCounts.get(entry.name) || 0) + 1);
    if (!manifestNames.has(entry.name)) {
      errors.push(`public projection contains an entry absent from manifest: ${entry.name}`);
    }
    if (entry.exposure !== 'public') {
      errors.push(`non-public entry leaked into public projection: ${entry.name} (exposure=${entry.exposure})`);
    }
    if (String(entry.name || '').startsWith('__')) {
      errors.push(`reserved __ entry entered public projection: ${entry.name}`);
    }
  }

  for (const entry of manifest) {
    if (entry.exposure !== 'public') continue;
    const selectedCount = selectedCounts.get(entry.name) || 0;
    if (selectedCount === 0) {
      errors.push(`public manifest entry missing from public projection: ${entry.name}`);
    } else if (selectedCount > 1) {
      errors.push(`public manifest entry projected more than once: ${entry.name}`);
    }
  }
  return errors;
}

function validateManifestShape(manifest) {
  if (!Array.isArray(manifest)) return ['manifest root must be an array'];
  const errors = [];
  const names = new Set();
  manifest.forEach((entry, index) => {
    const label = `manifest[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (typeof entry.name !== 'string' || entry.name.length === 0) {
      errors.push(`${label}.name must be a non-empty string`);
    } else if (names.has(entry.name)) {
      errors.push(`manifest contains duplicate tool name: ${entry.name}`);
    } else {
      names.add(entry.name);
    }
    if (!['public', 'internal', 'test'].includes(entry.exposure)) {
      errors.push(`${label}.exposure is invalid: ${String(entry.exposure)}`);
    }
    if (!entry.human_entry || typeof entry.human_entry !== 'object') {
      errors.push(`${label}.human_entry must be an object`);
    }
  });
  return errors;
}

function validatePublicEntry(entry, routeGraph, repoRoot) {
  const errors = [];
  const routeMatch = String(entry.human_entry?.route || '').trim().match(ROUTE_PATTERN);
  if (!routeMatch) {
    return {
      name: entry.name,
      errors: ['human_entry.route must be METHOD /path'],
      routeEvidence: null,
      clientEvidence: null,
    };
  }

  const method = routeMatch[1].toUpperCase();
  const routePath = normalizePath(routeMatch[2]);
  const routeEvidence = routeGraph.find((route) => (
    route.method === method && route.fullPath === routePath
  )) || null;
  if (!routeEvidence) {
    errors.push(`server route not found: ${method} ${routePath} (method + full path required)`);
  }

  const clientEvidence = validateClientCallConstruction({
    repoRoot,
    method,
    routePath,
    callSite: entry.human_entry?.client_call_site,
  });
  if (!clientEvidence.ok) errors.push(clientEvidence.error);

  return {
    name: entry.name,
    errors,
    routeEvidence,
    clientEvidence,
  };
}

/** Run the production parity predicate against a manifest-shaped value. */
export function evaluateToolFaceParity({
  manifest,
  repoRoot = REPO_ROOT,
  publicSelector = selectPublicEntries,
  projectionValidator = validatePublicProjection,
} = {}) {
  const manifestErrors = validateManifestShape(manifest);
  if (manifestErrors.length > 0) {
    return { publicCount: 0, errors: manifestErrors, reports: [] };
  }

  const publicEntries = publicSelector(manifest);
  if (!Array.isArray(publicEntries)) {
    return { publicCount: 0, errors: ['public selector must return an array'], reports: [] };
  }

  const projectionErrors = projectionValidator(manifest, publicEntries);
  if (projectionErrors.length > 0) {
    return {
      publicCount: publicEntries.length,
      errors: projectionErrors,
      reports: [],
    };
  }

  if (publicEntries.length === 0) {
    return { publicCount: 0, errors: [], reports: [] };
  }

  const routeGraph = buildServerRouteGraph(repoRoot);
  const reports = publicEntries.map((entry) => validatePublicEntry(entry, routeGraph, repoRoot));
  return {
    publicCount: publicEntries.length,
    errors: reports.flatMap((report) => report.errors.map((error) => `${report.name}: ${error}`)),
    reports,
  };
}

export function formatParityResult(result) {
  const boundary = 'human reachability NOT VERIFIED; journey pending';
  if (result.errors.length > 0) {
    return [
      `[FAIL] tool-face necessary-condition gate: ${result.publicCount} public entries checked; ${boundary}`,
      ...result.errors.map((error) => `- ${error}`),
    ].join('\n');
  }
  if (result.publicCount === 0) {
    return `[INFO] tool-face necessary-condition gate: 0 public entries checked; 0 条 public 条目受检，未证明任何 parity; ${boundary}`;
  }
  return `[PASS] tool-face necessary-condition gate: ${result.publicCount} public entries checked; ${boundary}`;
}

export function readManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  if (!existsSync(manifestPath)) throw new Error(`manifest missing: ${manifestPath}`);
  return JSON.parse(readText(manifestPath));
}

export function runParityGate({ manifestPath = DEFAULT_MANIFEST_PATH, ...options } = {}) {
  try {
    const manifest = readManifest(manifestPath);
    const result = evaluateToolFaceParity({ manifest, ...options });
    return {
      exitCode: result.errors.length > 0 ? 1 : 0,
      output: formatParityResult(result),
      result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = { publicCount: 0, errors: [message], reports: [] };
    return { exitCode: 1, output: formatParityResult(result), result };
  }
}

function manifestPathForProcess() {
  const overridePath = process.env[TOOL_FACE_PARITY_TEST_MANIFEST_PATH_ENV];
  if (!overridePath) return DEFAULT_MANIFEST_PATH;
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`${TOOL_FACE_PARITY_TEST_MANIFEST_PATH_ENV} is test-only`);
  }
  return resolve(overridePath);
}

function main() {
  let receipt;
  try {
    receipt = runParityGate({ manifestPath: manifestPathForProcess() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    receipt = {
      exitCode: 1,
      output: formatParityResult({ publicCount: 0, errors: [message], reports: [] }),
    };
  }
  if (receipt.exitCode === 0) console.log(receipt.output);
  else console.error(receipt.output);
  process.exitCode = receipt.exitCode;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
