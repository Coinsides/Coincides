// Island check of the F3b card half: the same nine cards in MY island test account, opened on the island's own client
// through the tunnel. Run once before the deploy (expect the old red errors / raw backslashes) and once after.
// Usage: TAG=pre|post node island-f3b-cards.mjs
import fs from 'node:fs';
import { launch, sleep } from './verify-p2/harness/cdp.mjs';
const HERE = '<scratch>';
const API = 'http://127.0.0.1:13002/api';
const TAG = process.env.TAG || 'pre';
const OUT = `${HERE}/island-f3b-runs/cards-${TAG}`;
fs.mkdirSync(OUT, { recursive: true });
const J = { 'Content-Type': 'application/json' };
const cells = fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split(/\r?\n/).find((l) => l.includes('<my-test-account>')).split('|').map((c) => c.trim());
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email: cells[2], password: cells[3] }) })).json();
const auth = { Authorization: `Bearer ${token}`, ...J };
const post = async (path, body, method = 'POST') => { const r = await fetch(`${API}${path}`, { method, headers: auth, body: JSON.stringify(body) }); const t = await r.text(); if (r.status >= 300) throw new Error(`${path} ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : null; };
const stateFile = `${HERE}/island-f3b.json`;
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
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
let deck = state.deckId ? { id: state.deckId } : null;
if (!deck) {
  const course = { id: state.courseId };
  deck = await post('/decks', { name: '实测·F3b卡片组', course_id: course.id });
  const section = await post('/sections', { deck_id: deck.id, name: '公式' });
  for (const [template_type, title, content] of cards) await post('/cards', { deck_id: deck.id, section_id: section.id, template_type, title, content });
  state.deckId = deck.id; fs.writeFileSync(stateFile, JSON.stringify(state, null, 1));
}
console.log('deck', deck.id);
const b = await launch({ port: 9300 + Math.floor(Math.random() * 500), profile: `${OUT}/profile`, width: 1440, height: 1000 });
const report = {};
for (const [label, origin] of [[TAG, 'http://127.0.0.1:13002']]) {
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
  const fonts = await b.ev(`[...document.fonts].filter(f=>/KaTeX/.test(f.family)).map(f=>f.family+':'+f.status).filter((v,i,a)=>a.indexOf(v)===i)`);
  const bundle = await b.ev(`[...document.scripts].map(s=>s.src).filter(s=>/index-/.test(s)).map(s=>s.replace(/^.*\\//,''))`);
  report[label] = { bundle, fonts, grid, opened };
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { gridErrors: v.grid.errors.length, gridRaw: v.grid.rawBackslash.length, cards: v.opened.map((o) => `${o.title.split(' ')[0]}:${o.found ? `${o.after.errors.length}err/${o.after.raw.length}raw/${o.after.katex}k` : 'missing'}`) }]))));
await b.close(); process.exit(0);
