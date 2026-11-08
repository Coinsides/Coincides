// J1 premise check (Main_Designer 11-08): in the original-page view a person cannot write, annotate or make a group.
// States: image note (pages only), PDF note in Pages, the same PDF in Text (positive control: all three should work).
// Per state: (write) click into the middle of the note body, type 'zqx', look for 'zqx' in the note and for save
// requests; (annotate) double-click a word / drag across the middle, look for the selection toolbar and its Label
// button; (group) look for the 'Drag selected range into a content group' handle. Built dist + local backend.
// usage: node cap-probe.mjs <label> <frontOrigin> <backendPort>
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const rowsFile = new URL('rows.jsonl', OUT);
const { upload, waitReg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const FIX = new URL('./fixtures/', import.meta.url);
const img = await upload(token, courseId, 'cap-land.png', 'image/png', fs.readFileSync(new URL('png-land-800x600.png', FIX)));
const pdf = await upload(token, courseId, 'cap.pdf', 'application/pdf', await makePdf('Cap', 4));
await waitReg(token, pdf.note, (r) => r.status === 'complete', 90000).catch(() => null);
const prof = new URL(`./profiles/${LABEL}`, import.meta.url).pathname.replace(/^\//, '');
const b = await launch({ port: 9631, profile: prof, width: 1280, height: 900 });
const net = [];
b.on('Network.requestWillBeSent', (p) => { const u = p.request.url; if (/\/api\//.test(u) && p.request.method !== 'GET') net.push(`${p.request.method} ${u.replace(/^.*\/api/, '').replace(/[0-9a-f-]{36}/g, ':id')}`); });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const waitFor = async (expr, ms = 30000) => { const s = Date.now(); for (;;) { if (await b.ev(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(150); } };
const open = async (note) => { await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(200); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${note}` }); await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 30000); await sleep(3000); };
const key = async (c) => { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: c, code: `Key${c.toUpperCase()}`, windowsVirtualKeyCode: c.toUpperCase().charCodeAt(0), text: c }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: c, code: `Key${c.toUpperCase()}`, windowsVirtualKeyCode: c.toUpperCase().charCodeAt(0) }); await sleep(90); };
const STATE = String.raw`(()=>{const pressed=[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].find((x)=>x.offsetParent!==null);
const host=document.querySelector('[data-note-host-mode]');const a=document.activeElement;
const tb=document.querySelector('[data-selection-toolbar="true"]');
return {mode:pressed?pressed.textContent.trim():null,pagesActive:!!document.querySelector('[data-note-source-pages-active="true"]'),
hostMode:host?host.dataset.noteHostMode:null,editors:document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]').length,
writing:!!document.querySelector('[aria-label="Writing"]'),zqx:(host?host.innerText:'').includes('zqx')||[...document.querySelectorAll('textarea')].some((t)=>t.value.includes('zqx')),
active:a?a.tagName+(a.getAttribute('aria-label')?':'+a.getAttribute('aria-label'):''):null,
selection:String(getSelection()).slice(0,30),toolbar:!!tb&&tb.offsetParent!==null,toolbarButtons:tb?[...tb.querySelectorAll('button')].map((x)=>x.textContent.trim()||x.getAttribute('aria-label')).slice(0,6):[],
groupHandle:[...document.querySelectorAll('[title="Drag selected range into a content group"],[aria-label="Drag selected range"]')].filter((x)=>x.offsetParent!==null).length,
labelHandles:[...document.querySelectorAll('[aria-label="Text unit handle"],[aria-label="Text unit tools"]')].filter((x)=>x.offsetParent!==null).length}})()`;
const bodyPoint = () => b.ev(String.raw`(()=>{const vp=document.querySelector('[data-note-source-pages-active="true"] [data-source-page-number]')||document.querySelector('[data-note-source-pages-viewport]');
if(vp&&document.querySelector('[data-note-source-pages-active="true"]')){const r=vp.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+Math.min(r.height/2,300)),where:'page'}}
const ed=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].find((e)=>{const r=e.getBoundingClientRect();return r.top>120&&r.top<700&&r.width>100});
if(ed){const r=ed.getBoundingClientRect();return {x:Math.round(r.left+40),y:Math.round(r.top+Math.min(r.height,24)/2),where:'editor'}}
const host=document.querySelector('[data-note-host-mode]');
const leaf=host?[...host.querySelectorAll('*')].find((e)=>e.children.length===0&&/line 3:/.test(e.textContent)&&e.getBoundingClientRect().width>100&&e.getBoundingClientRect().top>150&&e.getBoundingClientRect().top<760):null;
if(leaf){const r=leaf.getBoundingClientRect();return {x:Math.round(r.left+70),y:Math.round(r.top+r.height/2),where:'text:'+leaf.tagName}}
const m=document.querySelector('[data-app-main-scroll="true"]').getBoundingClientRect();return {x:Math.round(m.left+m.width/2),y:Math.round(m.top+300),where:'main'}})()`);
const lockState = () => b.ev(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.offsetParent!==null&&/source (locked|unlocked)/i.test(e.textContent));return x?{text:x.textContent.trim(),pressed:x.getAttribute('aria-pressed'),disabled:x.disabled,title:x.title||null}:null})()`);
async function tryAll(name) {
  const row = { label: LABEL, state: name };
  row.before = await b.ev(STATE);
  row.lock = await lockState();
  // write
  net.length = 0;
  const p = await bodyPoint(); row.point = p;
  await b.click(p.x, p.y); await sleep(300);
  for (const c of 'zqx') await key(c);
  await sleep(2500);
  row.afterType = await b.ev(STATE); row.writeRequests = [...net];
  // annotate: double-click a word at the same point, then a drag across it
  await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 2 });
  await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 2 });
  await sleep(900);
  row.afterDblClick = await b.ev(STATE);
  await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x - 60, y: p.y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 8; i += 1) { await b.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x - 60 + i * 25, y: p.y, button: 'left', buttons: 1 }); await sleep(30); }
  await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x + 140, y: p.y, button: 'left', clickCount: 1 });
  await sleep(900);
  row.afterDrag = await b.ev(STATE);
  const shot = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
  fs.writeFileSync(new URL(`${name}.jpg`, OUT), Buffer.from(shot.result.data, 'base64'));
  // The text unit handle: is the first visible one reachable (topmost at its centre)? Click it and read the menu.
  await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);
  row.handle = await b.ev(String.raw`(()=>{const hs=[...document.querySelectorAll('[aria-label="Text unit handle"]')].filter((x)=>{const r=x.getBoundingClientRect();return x.offsetParent!==null&&r.width>0&&r.top>120&&r.top<760});
const h=hs[0];if(!h)return {count:0};const r=h.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;const top=document.elementFromPoint(cx,cy);
return {count:hs.length,x:Math.round(cx),y:Math.round(cy),reachable:!!top&&(top===h||h.contains(top)),topIs:top?top.tagName+'.'+String(top.className).slice(0,30)+(top.getAttribute('aria-label')?'['+top.getAttribute('aria-label')+']':''):null}})()`);
  if (row.handle.count) {
    await b.click(row.handle.x, row.handle.y); await sleep(900);
    row.handleMenu = await b.ev(String.raw`(()=>{const items=[...document.querySelectorAll('[role=menu] [role=menuitem],[role=menu] button,[role=menuitem]')].filter((x)=>x.offsetParent!==null).map((x)=>x.textContent.trim().slice(0,40));return [...new Set(items)].slice(0,16)})()`);
    await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);
  }
  row.canWrite = row.afterType.zqx;
  row.canAnnotate = row.afterDblClick.toolbar || row.afterDrag.toolbar || (row.handleMenu || []).some((t) => /label|annot|标注|批注/i.test(t));
  row.canGroup = row.afterDblClick.groupHandle > 0 || row.afterDrag.groupHandle > 0 || (row.handleMenu || []).some((t) => /group|组/i.test(t));
  fs.appendFileSync(rowsFile, JSON.stringify(row) + '\n');
  console.log(`${name.padEnd(22)} mode=${row.before.mode}/${row.before.pagesActive} at=${p.where} write=${row.canWrite} (${row.writeRequests.length} req) annotate=${row.canAnnotate} group=${row.canGroup} toolbar=[${row.afterDrag.toolbarButtons.join('|') || row.afterDblClick.toolbarButtons.join('|')}] handle=${JSON.stringify({ n: row.handle.count, reach: row.handle.reachable, top: row.handle.topIs })} menu=${JSON.stringify(row.handleMenu || null)}`);
}
await open(img.note); await tryAll('image-pagesOnly');
await open(pdf.note); await tryAll('pdf-pages');
await open(pdf.note);
const tp = await b.ev(`(()=>{const x=[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent));if(!x)return null;const r=x.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`);
if (tp) { await b.click(tp.x, tp.y); await sleep(2000); }
await tryAll('pdf-text-control');
console.log(`DONE ${LABEL}`);
await b.close(); process.exit(0);
