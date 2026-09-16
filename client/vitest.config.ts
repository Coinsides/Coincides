import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      // Contract tests may inspect source CSS explicitly without enabling styles
      // for ordinary component tests (which retain the existing CSS mocks).
      css: { include: [/\?raw(?:&|$)/] },
    },
  }),
);
