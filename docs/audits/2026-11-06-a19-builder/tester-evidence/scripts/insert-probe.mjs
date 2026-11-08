// J1 follow-up: the toolbar's "+ 插入" in three states (image note pages-only, PDF Pages, PDF Text): does it open,
// what does it offer, and does choosing the first text-like entry add a block (POST /notes/:id/blocks, block count)?
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const { api, upload, waitReg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const img = await upload(token, courseId, 'ins.png', 'image/png', fs.readFileSync(new URL('./fixtures/png-alpha-600x600.png', import.meta.url)));
const pdf = await upload(token, courseId, 'ins.pdf', 'application/pdf', await makePdf('Ins', 2));
await waitReg(token, pdf.note, (r) => r.status === 'complete', 90000).catch(() => null);
const b = await launch({ port: 9633, profile: `<tmp>/a19acc/prof-${LABEL}`, width: 1280, height: 900 });
const net = []; b.on('Network.requestWillBeSent', (p) => { if (/\/api\//.test(p.request.url) && p.request.method !== 'GET') net.push(`${p.request.method} ${p.request.url.replace(/^.*\/api/, '').replace(/[0-9a-f-]{36}/g, ':id')}`); });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const open = async (note) => { await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(300); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${note}` }); for (let i = 0; i < 100; i += 1) { if (await b.ev(`!!document.querySelector('[data-note-host-mode]')`)) break; await sleep(300); } await sleep(3500); };
const clickWhere = async (expr) => { const p = await b.ev(`(()=>{const e=${expr};if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:e.textContent.trim().slice(0,30),disabled:!!e.disabled}})()`); if (p && !p.disabled) await b.click(p.x, p.y); return p; };
const blocksOf = async (note) => { try { const r = await api(`/notes/${note}/blocks`, {}, token); return (Array.isArray(r) ? r : r.blocks || []).length; } catch (e) { return 'ERR ' + String(e.message).slice(0, 60); } };
async function state(name, note) {
  const row = { state: name, blocksBefore: await blocksOf(note) };
  net.length = 0;
  row.insertBtn = await clickWhere(`[...document.querySelectorAll('button')].find((x)=>x.offsetParent!==null&&/插入|insert/i.test(x.textContent))`);
  await sleep(900);
  row.menu = await b.ev(`[...document.querySelectorAll('[role=menu] [role=menuitem],[role=menuitem],[role=menu] button,[role=listbox] [role=option]')].filter((x)=>x.offsetParent!==null).map((x)=>x.textContent.trim().slice(0,30)).slice(0,20)`);
  row.picked = row.menu.length ? await clickWhere(`[...document.querySelectorAll('[role=menu] [role=menuitem],[role=menuitem],[role=menu] button,[role=listbox] [role=option]')].filter((x)=>x.offsetParent!==null).find((x)=>/paragraph|text|段落|正文|文本|表格|table/i.test(x.textContent))||null`) : null;
  await sleep(1500);
  row.overlayButtons = await b.ev(`[...document.querySelectorAll('[role=dialog] button,[class*=overlay] button,[class*=Overlay] button,[class*=modal] button')].filter((x)=>x.offsetParent!==null).map((x)=>x.textContent.trim().slice(0,20)).filter(Boolean).slice(0,15)`);
  row.saved = row.picked ? await clickWhere(`[...document.querySelectorAll('[role=dialog] button,[class*=overlay] button,[class*=Overlay] button,[class*=modal] button')].filter((x)=>x.offsetParent!==null).find((x)=>/^(保存|save|insert|插入|done|完成)$/i.test(x.textContent.trim()))||null`) : null;
  await sleep(2500);
  row.notice = await b.ev(`[...document.querySelectorAll('[role=alert],[role=status],[class*=toast]')].filter((x)=>x.offsetParent!==null).map((x)=>x.innerText.replace(/\s+/g,' ').slice(0,100))`);
  row.requests = [...net]; row.blocksAfter = await blocksOf(note);
  const s = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); fs.writeFileSync(new URL(`${name}.jpg`, OUT), Buffer.from(s.result.data, 'base64'));
  fs.appendFileSync(new URL('rows.jsonl', OUT), JSON.stringify(row) + '\n');
  console.log(`${name.padEnd(16)} insert=${JSON.stringify(row.insertBtn)} menu=${JSON.stringify(row.menu)} picked=${row.picked ? row.picked.t : '-'} overlay=${JSON.stringify(row.overlayButtons || [])} saved=${row.saved ? row.saved.t : '-'} blocks ${row.blocksBefore}->${row.blocksAfter} req=${JSON.stringify(row.requests)} notice=${JSON.stringify(row.notice)}`);
  for (let i = 0; i < 2; i += 1) { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(200); }
}
await open(img.note); await state('image-pagesOnly', img.note);
await open(pdf.note); await state('pdf-pages', pdf.note);
await open(pdf.note); await clickWhere(`[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent))`); await sleep(2000); await state('pdf-text', pdf.note);
console.log('DONE'); await b.close(); process.exit(0);
