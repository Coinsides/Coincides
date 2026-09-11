import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/');
const audit = fileURLToPath(new URL('./', import.meta.url)).replace(/\\/g, '/');

export default {
  root: `${repo}client`,
  envDir: `${audit}isolated-env`,
  cacheDir: `${audit}.vite`,
  resolve: { alias: { '@': `${repo}client/src`, '@shared': `${repo}shared` } },
  test: {
    environment: 'jsdom',
    setupFiles: [`${repo}client/test/setup.ts`],
    include: [
      `${audit}wall-width-conflict.test.ts`,
      `${repo}client/src/pages/Notes/canvasEngine/boundaryAccount.test.tsx`,
      `${repo}client/src/pages/Notes/canvasEngine/placementAutoWidth.test.ts`,
      `${repo}client/src/pages/Notes/canvasEngine/hooks/autoWidthFrameSave.test.tsx`,
    ],
    reporters: ['default', 'json'],
    outputFile: `${audit}width-test-results.json`,
  },
};
