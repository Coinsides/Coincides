#!/usr/bin/env node
// 说明: 机械门为「必要非充分」口径，仅检查 Tool Registry 入口元数据的静态可达性，不代表运行期路由鉴权覆盖完整性。
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL_REGISTRY_PATH = resolve(REPO_ROOT, 'shared', 'types', 'toolRegistry.ts');
const SERVER_INDEX_PATH = resolve(REPO_ROOT, 'server', 'src', 'index.ts');
const CLIENT_ROOT = resolve(REPO_ROOT, 'client');

const ROUTE_RE = /\bapp\.(?:use|get|post|put|delete|patch|options|head|all)\s*\(\s*(['"`])([^'"`]+)\1/g;
const ROUTE_PATTERN = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)$/i;
const HUMAN_ENTRY_RE = /^([^#]+)#(.+)$/;

function readText(path) {
  return readFileSync(path, 'utf8');
}

function findBalancedBracketRange(text, startIndex) {
  let depth = 0;
  let i = startIndex;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let escaped = false;

  for (; i < text.length; i += 1) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inSingleQuote) {
      if (ch === "'") inSingleQuote = false;
      continue;
    }

    if (inDoubleQuote) {
      if (ch === '"') inDoubleQuote = false;
      continue;
    }

    if (inBacktick) {
      if (ch === '`') inBacktick = false;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (ch === '`') {
      inBacktick = true;
      continue;
    }

    if (ch === '[') {
      depth += 1;
      if (depth === 1) {
        continue;
      }
    }

    if (ch === ']' && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        return { start: startIndex, end: i };
      }
    }
  }

  return null;
}

function parseArrayLiteral(source, name) {
  const marker = `export const ${name}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`无法找到 ${name} 导出声明`);
  }

  const assignIndex = source.indexOf('=', markerIndex);
  if (assignIndex < 0) {
    throw new Error(`无法找到 ${name} 的赋值符号`);
  }

  const openIndex = source.indexOf('[', assignIndex);
  if (openIndex < 0) {
    throw new Error(`无法在 ${name} 中提取数组文本`);
  }

  const range = findBalancedBracketRange(source, openIndex);
  if (!range) {
    throw new Error(`无法平衡 ${name} 的数组括号`);
  }

  const arrayText = source.slice(range.start, range.end + 1);
  const evaluator = new Function(`return (${arrayText});`);
  const value = evaluator();

  if (!Array.isArray(value)) {
    throw new Error(`${name} 解析结果不是数组`);
  }

  return value;
}

function collectToolEntries() {
  const source = readText(TOOL_REGISTRY_PATH);
  const toolRegistry = parseArrayLiteral(source, 'TOOL_REGISTRY');
  return { toolRegistry };
}

function collectRoutes() {
  const source = readText(SERVER_INDEX_PATH);
  const routes = new Set();

  for (const m of source.matchAll(ROUTE_RE)) {
    routes.add(m[2]);
  }

  return routes;
}

function normalizeRoute(route) {
  if (route.endsWith('/') && route.length > 1) return route.slice(0, -1);
  return route;
}

function routeMounted(routes, routePath) {
  const normalized = normalizeRoute(routePath);
  if (routes.has(normalized)) return true;
  for (const mount of routes) {
    const normalizedMount = normalizeRoute(mount);
    if (normalized === normalizedMount) return true;
    if (normalizedMount.endsWith('/*')) {
      const prefix = normalizedMount.slice(0, -2);
      if (normalized.startsWith(prefix)) return true;
    } else if (normalized.startsWith(normalizedMount + '/')) {
      return true;
    }
  }
  return false;
}

function symbolPattern(symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    [
      `\\b(?:export\\s+)?async\\s+function\\s+${escaped}\\s*\\(`,
      `\\bfunction\\s+${escaped}\\s*\\(`,
      `\\b(?:export\\s+)?class\\s+${escaped}\\b`,
      `\\b(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\s*[:=]`,
      `\\bexport\\s+default\\s+(?:function\\s+)?${escaped}\\b`,
    ].join('|'),
    'm',
  );
}

function hasSymbol(fileText, symbol) {
  return symbolPattern(symbol).test(fileText);
}

function validateToolEntry(entry, routes) {
  const result = { name: entry.name, errors: [] };
  const isPublic = entry.exposure === 'public';
  const isProbe = entry.name.startsWith('__') || entry.exposure === 'test';

  if (isPublic && isProbe) {
    result.errors.push('exposure 为 public 的条目不允许 __ 前缀或 test 条目标记');
  }

  if (!isPublic) return result;

  const routeMatch = String(entry.human_entry?.route || '').trim().match(ROUTE_PATTERN);
  if (!routeMatch) {
    result.errors.push('public 条目缺少或格式非法的 human_entry.route（应为 METHOD /path）');
    return result;
  }

  const rawMethod = routeMatch[1];
  const routePath = routeMatch[2];
  if (!routeMounted(routes, routePath)) {
    result.errors.push(`human_entry.route 挂载不存在：${rawMethod} ${routePath} 不在 server/src/index.ts routes 中`);
  }

  const callSite = String(entry.human_entry?.client_call_site || '').trim();
  const callSiteMatch = callSite.match(HUMAN_ENTRY_RE);
  if (!callSiteMatch) {
    result.errors.push('public 条目缺少或格式非法的 client_call_site（应为 <file>#<symbol>）');
    return result;
  }

  const filePart = callSiteMatch[1];
  const symbolPart = callSiteMatch[2];
  if (!symbolPart || !filePart) {
    result.errors.push('public 条目 client_call_site 缺少文件或 symbol');
    return result;
  }

  const filePath = resolve(REPO_ROOT, filePart);
  if (!existsSync(filePath)) {
    result.errors.push(`public 条目 client_call_site 文件不存在：${filePart}`);
    return result;
  }

  if (!filePath.startsWith(CLIENT_ROOT)) {
    result.errors.push(`public 条目 client_call_site 必须落在 client/src 下：${filePart}`);
    return result;
  }

  const fileSource = readText(filePath);
  if (!hasSymbol(fileSource, symbolPart)) {
    result.errors.push(`public 条目 client_call_site symbol 缺失：${symbolPart}（${filePart}）`);
  }

  return result;
}

function validateToolRegistry(toolRegistry, routes) {
  const reports = toolRegistry.map((entry) => validateToolEntry(entry, routes));
  const failures = reports.filter((report) => report.errors.length > 0);
  return { reports, failures };
}

function printSummary(reports) {
  const total = reports.length;
  const failures = reports.filter((report) => report.errors.length > 0);

  for (const report of reports) {
    const result = report.errors.length > 0 ? 'FAIL' : 'OK';
    const suffix = report.errors.length > 0 ? `\n  - ${report.errors.join('\n  - ')}` : '';
    console.log(`[${result}] ${report.name}${suffix}`);
  }

  console.log(`\n${reports.length} examples, ${total - failures.length} pass`);
  return failures.length === 0;
}

function runSelfTests() {
  const routes = collectRoutes();
  const tests = [
    {
      name: 'public_pass',
      description: '合法通过样例',
      entries: [
        {
          name: 'parity_public_pass',
          description: 'public parity pass',
          input_schema: {},
          output_schema: {},
          truth: 'content',
          tier: 'immediate',
          human_entry: {
            route: 'GET /api/health',
            client_call_site: 'client/src/App.tsx#App',
          },
          exposure: 'public',
          scopes: ['tool'],
        },
      ],
      expectedPass: true,
    },
    {
      name: 'route_missing',
      description: 'route 缺失红',
      entries: [
        {
          name: 'parity_route_missing',
          description: 'public route missing',
          input_schema: {},
          output_schema: {},
          truth: 'content',
          tier: 'immediate',
          human_entry: {
            route: 'GET /api/does-not-exist',
            client_call_site: 'client/src/App.tsx#App',
          },
          exposure: 'public',
          scopes: ['tool'],
        },
      ],
      expectedPass: false,
    },
    {
      name: 'call_site_missing',
      description: 'call_site 缺失红',
      entries: [
        {
          name: 'parity_callsite_missing',
          description: 'public call_site missing',
          input_schema: {},
          output_schema: {},
          truth: 'content',
          tier: 'immediate',
          human_entry: {
            route: 'GET /api/health',
            client_call_site: 'client/src/App.tsx#DefinitelyNotExists',
          },
          exposure: 'public',
          scopes: ['tool'],
        },
      ],
      expectedPass: false,
    },
    {
      name: 'probe_public',
      description: '__probe 标 public 红',
      entries: [
        {
          name: '__probe_tool_face_parity_public',
          description: 'probe entry marked public',
          input_schema: {},
          output_schema: {},
          truth: 'content',
          tier: 'immediate',
          human_entry: {
            route: 'GET /api/health',
            client_call_site: 'client/src/App.tsx#App',
          },
          exposure: 'public',
          scopes: ['tool'],
        },
      ],
      expectedPass: false,
    },
  ];

  let passed = 0;
  let failed = 0;
  for (const test of tests) {
  const routes = collectRoutes();
  const { failures, reports } = validateToolRegistry(test.entries, routes);
    const ok = failures.length === 0;
    if (ok === test.expectedPass) {
      console.log(`PASS [self-test:${test.name}]`);
      passed += 1;
    } else {
      console.log(`FAIL [self-test:${test.name}] - ${test.description}`);
      failed += 1;
    }
    printSummary(reports);
  }

  console.log(`\nself-test 总数: ${tests.length}, 通过: ${passed}, 未通过: ${failed}`);
  return failed === 0;
}

function main() {
  if (!existsSync(TOOL_REGISTRY_PATH)) {
    console.error(`未找到 ToolRegistry 文件：${TOOL_REGISTRY_PATH}`);
    process.exit(1);
  }
  if (!existsSync(SERVER_INDEX_PATH)) {
    console.error(`未找到服务端入口：${SERVER_INDEX_PATH}`);
    process.exit(1);
  }

  const { toolRegistry } = collectToolEntries();
  if (process.argv.includes('--self-test')) {
    if (!runSelfTests()) {
      process.exit(1);
    }
    return;
  }

  const routes = collectRoutes();
  const { failures } = validateToolRegistry(toolRegistry, routes);
  if (failures.length > 0) {
    console.error('[FAIL] tool face parity');
    for (const report of failures) {
      for (const error of report.errors) {
        console.error(`- ${report.name}: ${error}`);
      }
    }
    process.exit(1);
  }

  console.log('[PASS] tool face parity');
}

main();
