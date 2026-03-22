/**
 * CJS loader that uses jiti to run the TypeScript server entry point.
 * 
 * jiti v2 only exposes ESM for its "register" hook, which can't be used
 * with --require in CJS mode. We use jiti's async import() to properly
 * handle ESM features like top-level await and import.meta.url.
 */
const path = require('path');

// Resolve paths relative to this file's location
const serverDir = path.resolve(__dirname, '..', 'server');
const jitiPath = path.join(serverDir, 'node_modules', 'jiti', 'lib', 'jiti.cjs');
const serverEntry = path.join(serverDir, 'src', 'index.ts');

// Create jiti instance and load the server via async import
const { createJiti } = require(jitiPath);
const jiti = createJiti(__filename, { interopDefault: true });

jiti.import(serverEntry).catch((err) => {
  console.error('[server-loader] Failed to load server:', err);
  process.exit(1);
});
