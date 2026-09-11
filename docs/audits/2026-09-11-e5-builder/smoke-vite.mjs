import { createServer } from '../../../client/node_modules/vite/dist/node/index.js';
import { resolve } from 'node:path';
const server = await createServer({
  root: resolve('client'), configFile: resolve('client/vite.config.ts'),
  plugins: [{ name: 'e5-local-smoke-controls', transformIndexHtml: {
    order: 'post', handler(html, context) {
      if (!context.originalUrl?.includes('e5-smoke=1')) return html;
      return html.replace('</body>', `<script type="module">
        const audit = document.createElement('aside');
        audit.id = 'e5-print-audit';
        audit.style.cssText = 'position:fixed;top:4px;right:4px;z-index:10000;background:white;color:black;padding:6px;font:12px sans-serif';
        const button = document.createElement('button'); button.textContent = 'Apply E5 print stylesheet';
        button.onclick = () => {
          window.dispatchEvent(new Event('beforeprint'));
          const rules = [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]).filter(rule =>
            rule instanceof CSSMediaRule && rule.conditionText === 'print');
          const projection = document.createElement('style'); projection.textContent = rules.map(rule =>
            [...rule.cssRules].map(child => child.cssText).join(' ')).join(' ');
          document.head.append(projection);
          const row = document.querySelector('[data-note-cover-metadata]');
          audit.dataset.result = JSON.stringify({mode:'synthetic application of production print media rules',
            ruleCount:rules.length,rowDisplay:getComputedStyle(row).display,
            appDisplay:getComputedStyle(document.querySelector('#root')).display,
            printPageCount:document.querySelectorAll('[data-note-print-page]').length,
            printMetadataCount:document.querySelector('[data-note-print-root]').querySelectorAll('[data-note-cover-metadata],[data-note-paper-header]').length,
            printVisibility:getComputedStyle(document.querySelector('[data-note-print-root]')).visibility});
          audit.textContent = 'Print stylesheet audit: ' + audit.dataset.result;
        }; audit.append(button); document.body.append(audit);
      </script></body>`);
    },
  } }],
  server: { host: '127.0.0.1', port: 5185, strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3105', changeOrigin: true } } },
});
await server.listen();
server.printUrls();
