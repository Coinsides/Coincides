/**
 * Patch jiti-hooks.mjs to fix Windows path resolution.
 * 
 * jiti v2's ESM hooks resolve() returns raw Windows paths (e.g. D:\foo\bar.ts)
 * instead of file:// URLs, which causes ERR_UNSUPPORTED_ESM_URL_SCHEME on Windows.
 * 
 * This script patches the resolve() function to convert paths to file:// URLs.
 * Run automatically via postinstall in server/package.json.
 */
const fs = require('fs');
const path = require('path');

const hooksPath = path.join(__dirname, '..', 'server', 'node_modules', 'jiti', 'lib', 'jiti-hooks.mjs');

if (!fs.existsSync(hooksPath)) {
  console.log('[patch-jiti] jiti-hooks.mjs not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(hooksPath, 'utf-8');

// Check if already patched
if (content.includes('pathToFileURL')) {
  console.log('[patch-jiti] Already patched, skipping');
  process.exit(0);
}

// Add pathToFileURL import
content = content.replace(
  'import { fileURLToPath } from "node:url";',
  'import { fileURLToPath, pathToFileURL } from "node:url";'
);

// Patch resolve() to convert raw paths to file:// URLs
content = content.replace(
  `  return {
    url: resolvedPath,
    shortCircuit: true,
  };`,
  `  // [PATCH] Convert raw Windows paths to file:// URLs
  const resolvedURL = resolvedPath.startsWith("file://") ? resolvedPath : pathToFileURL(resolvedPath).href;
  return {
    url: resolvedURL,
    shortCircuit: true,
  };`
);

fs.writeFileSync(hooksPath, content, 'utf-8');
console.log('[patch-jiti] Patched jiti-hooks.mjs for Windows file:// URL compatibility');
