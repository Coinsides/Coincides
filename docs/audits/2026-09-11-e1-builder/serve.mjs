import { createServer } from '../../../client/node_modules/vite/dist/node/index.js';
import react from '../../../client/node_modules/@vitejs/plugin-react/dist/index.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const server = await createServer({
  configFile: false, root: audit, plugins: [react()],
  resolve: { alias: {
    '@': resolve(root, 'client/src'),
    '@shared': resolve(root, 'shared'),
    'react-dom': resolve(root, 'client/node_modules/react-dom'),
    react: resolve(root, 'client/node_modules/react'),
    'lucide-react': resolve(root, 'client/node_modules/lucide-react'),
  } },
  server: { host: '127.0.0.1', port: 5187, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
server.printUrls();
