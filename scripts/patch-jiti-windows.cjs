/**
 * Patch jiti-hooks.mjs to fix Windows path resolution.
 * 
 * jiti v2's ESM hooks return raw Windows paths (e.g. D:\foo\bar.ts)
 * instead of file:// URLs in multiple places, causing ERR_UNSUPPORTED_ESM_URL_SCHEME.
 * 
 * This script patches:
 *   1. resolve() — convert esmResolve output to file:// URL
 *   2. load() — sanitize incoming URL before passing to nextLoad()
 *   3. _shouldSkip() — handle raw Windows paths correctly
 * 
 * Run automatically via npm run patch:jiti (called by electron:dev/dist).
 * Idempotent — safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');

const hooksPath = path.join(__dirname, '..', 'server', 'node_modules', 'jiti', 'lib', 'jiti-hooks.mjs');

if (!fs.existsSync(hooksPath)) {
  console.log('[patch-jiti] jiti-hooks.mjs not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(hooksPath, 'utf-8');

// Check if already patched (use a unique marker)
if (content.includes('[PATCH-WIN]')) {
  console.log('[patch-jiti] Already patched, skipping');
  process.exit(0);
}

// --- 1. Add pathToFileURL import ---
content = content.replace(
  'import { fileURLToPath } from "node:url";',
  'import { fileURLToPath, pathToFileURL } from "node:url";'
);

// --- 2. Add helper function to convert Windows paths to file:// URLs ---
const helperFn = `
// [PATCH-WIN] Convert raw Windows paths to file:// URLs
function _toFileURL(urlOrPath) {
  if (!urlOrPath || urlOrPath.startsWith("file://") || urlOrPath.startsWith("data:") || urlOrPath.startsWith("node:")) {
    return urlOrPath;
  }
  // Raw Windows absolute path like D:\\foo or D:/foo
  if (/^[a-zA-Z]:[\\\\/]/.test(urlOrPath)) {
    return pathToFileURL(urlOrPath).href;
  }
  return urlOrPath;
}
`;

// Insert helper after the imports (before "let jiti;")
content = content.replace('let jiti;', helperFn + '\nlet jiti;');

// --- 3. Patch resolve() to convert resolved paths ---
content = content.replace(
  `  return {
    url: resolvedPath,
    shortCircuit: true,
  };`,
  `  return {
    url: _toFileURL(resolvedPath),
    shortCircuit: true,
  };`
);

// --- 4. Patch load() to sanitize URL before any use ---
content = content.replace(
  'export async function load(url, context, nextLoad) {',
  'export async function load(url, context, nextLoad) {\n  url = _toFileURL(url);'
);

// --- 5. Patch _shouldSkip to handle Windows paths ---
// The original _shouldSkip checks !url.startsWith("file://") which makes raw
// Windows paths skip to nextLoad where they crash. After our url = _toFileURL(url)
// in load(), this should be handled, but let's also fix _shouldSkip for safety.
content = content.replace(
  '(!url.startsWith("./") && !url.startsWith("file://"))',
  '(!url.startsWith("./") && !url.startsWith("file://") && !/^[a-zA-Z]:[\\\\\\/]/.test(url))'
);

fs.writeFileSync(hooksPath, content, 'utf-8');
console.log('[patch-jiti] Patched jiti-hooks.mjs for Windows file:// URL compatibility');
