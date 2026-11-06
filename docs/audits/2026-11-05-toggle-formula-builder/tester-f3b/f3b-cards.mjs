// F3b real chain, local only: cards whose fields hold the new \( \) and \[ \] delimiters, opened in the browser on the
// F3b client (13161, dev server from the frozen F3b copy) and on the current client (13162, HEAD static build).
// Both talk to the same local F3b server (13151) with a throwaway account. No island, no real model.
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { launch, sleep } from './verify-p2/harness/cdp.mjs';

const API = 'http://127.0.0.1:13151/api';
const OUT = '<tester-scratch>/f3b-runs/cards';
fs.mkdirSync(OUT, { recursive: true });
const J = { 'Content-Type': 'application/json' };
const credPath = '<temp>/f3bdata/cred.json';
if (!fs.existsSync(credPath)) {
  const c = { email: '<local-throwaway-account>', password: randomBytes(12).toString('hex'), name: 'F3b Local' };
  const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: J, body: JSON.stringify(c) });
  console.log('register', r.status);
  fs.writeFileSync(credPath, JSON.stringify(c));
}
const cred = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email: cred.email, password: cred.password }) })).json();
const auth = { Authorization: `Bearer ${token}`, ...J };
const post = async (path, body, method = 'POST') => { const r = await fetch(`${API}${path}`, { method, headers: auth, body: JSON.stringify(body) }); const t = await r.text(); if (r.status >= 300) throw new Error(`${path} ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : null; };
await fetch(`${API}/settings/onboarding-complete`, { method: 'PUT', headers: auth, body: '{}' });
const course = await post('/courses', { name: 'F3b 卡片', code: 'F3B', semester: 'local' });
const deck = await post('/decks', { name: 'F3b 卡片组', course_id: course.id });
const section = await post('/sections', { deck_id: deck.id, name: '公式' });
const cards = [
  ['formula', 'F1 新定界符公式', { formula: '\\(\\frac{C}{i}\\)', variables: 'C 是每期现金流，\\(i\\) 是利率' }],
  ['formula', 'F2 新定界符陈列公式', { formula: '\\[PV=\\sum_{t=1}^{n}\\frac{C}{(1+i)^{t}}\\]' }],
  ['definition', 'D1 定义含行内公式', { definition: '永续年金的现值是 \\(\\frac{C}{i}\\)，其中 \\(i>0\\)。' }],
  ['definition', 'D2 定义含F3b样式', { definition: '期望 \\({\\mathbb{E}}_{x}\\left[f\\right]\\) 与 \\({\\mathbb{R}}^{n}\\)，向量 \\(\\mathbf{a}+\\mathbf{b}\\)' }],
  ['theorem', 'T1 定理', { statement: '若 \\(a>0\\) 则 \\(\\sqrt{a}\\) 存在' }],
  ['general', 'G1 两式夹文字', { body: '\\(x\\) 和 \\(y\\) 之间的文字' }],
  ['formula', 'C1 旧格式公式', { formula: '$\\frac{C}{i}$' }],
  ['definition', 'C2 旧格式定义', { definition: '旧格式 $x^2$ 的定义' }],
  ['definition', 'C3 美元金额', { definition: '债券售价 $100，每年付 $5。' }],
];
const ids = [];
for (const [template_type, title, content] of cards) ids.push((await post('/cards', { deck_id: deck.id, section_id: section.id, template_type, title, content })).id);
console.log('deck', deck.id, 'cards', ids.length);

const b = await launch({ port: 9300 + Math.floor(Math.random() * 500), profile: `${OUT}/profile`, width: 1440, height: 1000 });
const report = {};
for (const [label, origin] of [['f3b', 'http://localhost:13161'], ['base', 'http://127.0.0.1:13162']]) {
  await b.cdp('Page.navigate', { url: `${origin}/#/login` }); await sleep(4000);
  await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);
  await b.cdp('Page.navigate', { url: `${origin}/?r=${Date.now()}#/decks/${deck.id}` }); await sleep(6000);
  const SCAN = `(()=>{const root=document.querySelector('[class*=overlay]')||document;const errs=[...root.querySelectorAll('.katex-error')].map(e=>(e.getAttribute('title')||e.textContent).slice(0,80));const raw=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&/\\\\\\(|\\\\\\[|\\\\frac/.test(e.textContent)).map(e=>e.textContent.slice(0,80));return {katex:root.querySelectorAll('.katex').length,errors:errs,rawBackslash:raw.slice(0,12),text:(root===document?(document.querySelector('main')||document.body):root).innerText.slice(0,1600)}})()`;
  const grid = await b.ev(SCAN);
  const shot = async (name) => { const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(`${OUT}/${label}-${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
  await shot('deck');
  const opened = [];
  for (const [, title] of cards) {
    const c = await b.ev(`(()=>{const e=[...document.querySelectorAll('body *')].find(x=>x.children.length===0&&x.textContent.trim()===${JSON.stringify(title)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!c) { opened.push({ title, found: false }); continue; }
    await b.click(c.x, c.y); await sleep(1200);
    // Flip to the back if the card shows a flip affordance.
    const before = await b.ev(SCAN);
    const flip = await b.ev(`(()=>{const m=document.querySelector('[class*=overlay] [class*=card], [class*=Modal] [class*=card], [class*=flip]');if(!m)return null;const r=m.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (flip) { await b.click(flip.x, flip.y); await sleep(900); }
    const after = await b.ev(SCAN);
    await shot(`card-${title.split(' ')[0]}`);
    opened.push({ title, found: true, before: { katex: before.katex, errors: before.errors, raw: before.rawBackslash }, after: { katex: after.katex, errors: after.errors, raw: after.rawBackslash, text: after.text.slice(0, 400) } });
    for (let k = 0; k < 3; k += 1) { const still = await b.ev(`Boolean(document.querySelector('[class*=overlay]'))`); if (!still) break; await b.click(1300, 860); await sleep(600); }
    opened[opened.length - 1].closed = !(await b.ev(`Boolean(document.querySelector('[class*=overlay]'))`));
  }
  report[label] = { grid, opened };
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { gridErrors: v.grid.errors.length, gridRaw: v.grid.rawBackslash.length, cards: v.opened.map((o) => `${o.title.split(' ')[0]}:${o.found ? `${o.after.errors.length}err/${o.after.raw.length}raw/${o.after.katex}k` : 'missing'}`) }]))));
await b.close(); process.exit(0);
