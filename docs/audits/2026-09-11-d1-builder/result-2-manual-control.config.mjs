import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/');
const audit = fileURLToPath(new URL('./', import.meta.url)).replace(/\\/g, '/');

export default {
  root: `${repo}client`,
  envDir: `${audit}isolated-env`,
  cacheDir: `${audit}.vite-result-2-manual-control`,
  resolve: { alias: { '@': `${repo}client/src`, '@shared': `${repo}shared` } },
  test: {
    environment: 'jsdom',
    setupFiles: [`${repo}client/test/setup.ts`],
    include: [`${audit}result-2-manual-control.test.ts`],
    reporters: ['default', 'json'],
    outputFile: `${audit}result-2-manual-control-results.json`,
  },
};
