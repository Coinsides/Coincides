// One-time preparation from the completed B1c fixture. Does not change product code.
import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url);
let source=readFileSync(new URL('../../2026-09-11-b1c-builder/serve.mjs',here),'utf8');
source=source.replaceAll("'../../../", "'../../../../").replaceAll('`../../../','`../../../../')
  .replace("resolve(audit, '../../..')", "resolve(audit, '../../../..')")
  .replaceAll('b1c','b1d').replaceAll('B1c','B1d').replaceAll('5197','5200')
  .replace('left: 88, right: 56, top: 24, bottom: 110','left: 72, right: 72, top: 0, bottom: 96')
  .replace('Legacy A4 · asymmetric walls','Power series & the champion')
  .replace('Paper preset audit','Material study')
  .replace('Historical A4 keeps its original frame, asymmetric walls, and legacy flow field.',
    'POWER SERIES — A working definition. A power series is a sum of powers centred at a fixed point. Its interval of convergence describes where the series settles to a finite value.')
  .replace("import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';", "import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';\nimport { baselinePlugin } from './sourceModes.mjs';");
source=source.replace('legacyBaseline = structuredClone(readNote(seeded.legacyNoteId));', `
for (const plain_text of [
  'Inside the radius, the series converges absolutely. Outside it, the terms cannot settle. Check each endpoint separately.',
  'THE CHAMPION PRINCIPLE — Find the term that governs the limit. Divide by that term, then let the smaller contributions disappear.',
  'A useful question: what remains unchanged when the representation changes? The content and its coordinates stay fixed while the paper takes on a different material.',
]) {
  const response = await fetch('http://127.0.0.1:5200/api/notes/' + seeded.legacyNoteId + '/blocks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block_type: 'paragraph', plain_text }),
  });
  if (!response.ok) throw new Error(await response.text());
}
const description = await fetch('http://127.0.0.1:5200/api/notes/' + seeded.legacyNoteId, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: 'A quiet place for definitions, useful tests, and the ideas worth keeping.' }),
});
if (!description.ok) throw new Error(await description.text());
legacyBaseline = structuredClone(readNote(seeded.legacyNoteId));`);
source+=`
for (const [mode, port] of [['baseline', 5202], ['header-baseline', 5203]]) {
  const companion = await createServer({
    configFile: false, envFile: false, root: audit,
    plugins: [baselinePlugin(root, audit, mode), react()],
    resolve: { alias: {
      '@': resolve(root, 'client/src'), '@shared': resolve(root, 'shared'),
      'react-dom': resolve(root, 'client/node_modules/react-dom'),
      'react-router-dom': resolve(root, 'client/node_modules/react-router-dom'),
      react: resolve(root, 'client/node_modules/react'), 'lucide-react': resolve(root, 'client/node_modules/lucide-react'),
    } },
    server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [root] },
      proxy: { '/api': 'http://127.0.0.1:5200', '/__fixture': 'http://127.0.0.1:5200' } },
  });
  await companion.listen();
  console.log(mode + ': http://127.0.0.1:' + port);
}
`;
writeFileSync(new URL('serve.mjs',here),source);
writeFileSync(new URL('index.html',here),'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B1d isolated material audit</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
