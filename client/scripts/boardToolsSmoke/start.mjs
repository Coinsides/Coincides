import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const clientRoot = fileURLToPath(new URL('../../', import.meta.url));
const realApi = path.resolve(clientRoot, 'src/services/api.ts').replaceAll('\\', '/');
const mockApi = fileURLToPath(new URL('./mockApi.ts', import.meta.url));
const server = await createServer({
  configFile: false, envFile: false, root: clientRoot,
  plugins: [{
    name: 'board-tools-smoke-memory-api', enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!/(?:^|\/)api(?:\.ts)?$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved?.id.replaceAll('\\', '/') === realApi ? mockApi : null;
    },
    configureServer(vite) {
      vite.middlewares.use('/api', (_request, response) => {
        response.statusCode = 503;
        response.end('Synthetic browser fixture: no backend is attached.');
      });
    },
  }, react()],
  resolve: { alias: {
    '@': path.resolve(clientRoot, 'src'),
    '@shared/types': path.resolve(clientRoot, '../shared/types/index.ts'),
    '@shared': path.resolve(clientRoot, '../shared'),
  } },
  server: { host: '127.0.0.1', port: 5188, strictPort: true },
});
await server.listen();
console.log('Board tools fixture: http://127.0.0.1:5188/scripts/boardToolsSmoke/index.html#/boards/tools-smoke');
const stop = async () => { await server.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
