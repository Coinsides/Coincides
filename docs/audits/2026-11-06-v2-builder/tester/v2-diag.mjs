// Why does the Gallery fail or hang, and why is Source Library blank? Failed requests and console errors, both builds.
import fs from 'node:fs';
import { launch, sleep } from './verify-p2/harness/cdp.mjs';
const HERE = '<tester-scratch>';
const API = 'http://127.0.0.1:13002/api';
const cells = fs.readFileSync('<ops-accounts-file>', 'utf8').split('\n').find((l) => l.includes('<tester-account>')).split('|').map((c) => c.trim());
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cells[2], password: cells[3] }) })).json();
const b = await launch({ port: 9850 + Math.floor(Math.random() * 100), profile: `${HERE}/v2-runs/profile-diag`, width: 1440, height: 900 });
const reqs = new Map(); const bad = []; const errs = [];
b.on('Network.requestWillBeSent', (p) => reqs.set(p.requestId, { url: p.request.url.replace(/^.*\/api/, '/api').replace(/[0-9a-f-]{36}/g, ':id'), t: Date.now() }));
b.on('Network.responseReceived', (p) => { const r = reqs.get(p.requestId); if (r && p.response.status >= 400) bad.push(`${p.response.status} ${r.url}`); });
b.on('Network.loadingFailed', (p) => { const r = reqs.get(p.requestId); if (r) bad.push(`FAILED ${p.errorText} ${r.url}`); });
b.on('Runtime.exceptionThrown', (p) => errs.push(p.exceptionDetails?.exception?.description?.slice(0, 200) || p.exceptionDetails?.text));
b.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') errs.push(p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)); });
for (const [label, origin] of [['pre', 'http://localhost:13141'], ['post', 'http://localhost:13145']]) {
  await b.cdp('Page.navigate', { url: `${origin}/#/login` }); await sleep(3000);
  await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);
  for (const hash of ['/group-gallery', '/sources']) {
    bad.length = 0; errs.length = 0; reqs.clear();
    const t0 = Date.now();
    await b.cdp('Page.navigate', { url: `${origin}/?r=${Date.now()}#${hash}` });
    let txt = '';
    for (let i = 0; i < 40; i += 1) { await sleep(1000); txt = await b.ev(`(document.querySelector('main')||document.body).innerText`).catch(() => ''); if (txt && !/Loading/.test(txt) && txt.length > 80) break; }
    const apiCount = [...reqs.values()].filter((r) => r.url.startsWith('/api')).length;
    console.log(JSON.stringify({ build: label, page: hash, secs: Math.round((Date.now() - t0) / 1000), apiRequests: apiCount, bad: [...new Set(bad)].slice(0, 12), errors: [...new Set(errs)].slice(0, 6), text: txt.replace(/\s+/g, ' ').slice(0, 300) }));
  }
}
await b.close(); process.exit(0);
