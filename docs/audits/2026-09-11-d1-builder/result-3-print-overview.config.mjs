import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/');
const audit = fileURLToPath(new URL('./', import.meta.url)).replace(/\\/g, '/');
export default {
  root: `${repo}client`,
  envDir: `${audit}isolated-env`,
  cacheDir: `${audit}.vite-result-3-print-overview`,
  resolve: { alias: {
    '@': `${repo}client/src`, '@shared': `${repo}shared`,
    'react': `${repo}client/node_modules/react`,
    'react-dom': `${repo}client/node_modules/react-dom`,
    'react-router-dom': `${repo}client/node_modules/react-router-dom`,
    '@testing-library/react': `${repo}client/node_modules/@testing-library/react`,
  } },
  test: {
    environment: 'jsdom',
    setupFiles: [`${repo}client/test/setup.ts`],
    include: [`${audit}result-3-print-overview.test.tsx`],
    reporters: ['default', 'json'],
    outputFile: `${audit}result-3-print-overview-results.json`,
  },
};
