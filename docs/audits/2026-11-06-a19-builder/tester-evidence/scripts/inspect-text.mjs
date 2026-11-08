// One-off: open a PDF projection note on the post build, switch to Text, and describe the line elements.
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const { upload, waitReg, setup } = client(3592);
const { token, courseId } = await setup();
const pdf = await upload(token, courseId, 'insp.pdf', 'application/pdf', await makePdf('Insp', 2));
await waitReg(token, pdf.note, (r) => r.status === 'complete', 90000).catch(() => null);
const b = await launch({ port: 9632, profile: '<tmp>/a19acc/prof-inspect', width: 1280, height: 900 });
await b.cdp('Page.navigate', { url: 'http://127.0.0.1:5592/' }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(300);
await b.cdp('Page.navigate', { url: `http://127.0.0.1:5592/#/notes/${pdf.note}` });
for (let i = 0; i < 100; i += 1) { if (await b.ev(`[...document.querySelectorAll('[data-source-view-toggle] button')].some((x)=>x.offsetParent!==null&&/text/i.test(x.textContent))`)) break; await sleep(300); }
await sleep(800);
console.log('page:', JSON.stringify(await b.ev(`({hash:location.hash,toggles:document.querySelectorAll('[data-source-view-toggle]').length,host:!!document.querySelector('[data-note-host-mode]'),text:document.body.innerText.slice(0,300)})`)));
{ const s = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 50 }); fs.writeFileSync('<tmp>/a19acc/inspect.jpg', Buffer.from(s.result.data, 'base64')); }
const t = await b.ev(`(()=>{const x=[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent));const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
await b.click(t.x, t.y); await sleep(2500);
const visSet = () => b.ev(String.raw`(()=>{const out=[];for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect();if(r.width<4||r.height<4||e.offsetParent===null)continue;const lab=(e.getAttribute('aria-label')||e.getAttribute('role')||e.getAttribute('title')||'');const d=[...e.attributes].filter((a)=>a.name.startsWith('data-')&&!/^data-(text|block|base|sk)/.test(a.name)).map((a)=>a.name).join(',');if(lab||d)out.push(e.tagName+'|'+lab+'|'+d+'|'+(e.children.length===0?e.textContent.trim().slice(0,24):''));}return [...new Set(out)]})()`);
const before = new Set(await visSet());
const h = await b.ev(`(()=>{const x=[...document.querySelectorAll('[aria-label="Text unit handle"]')].find((x)=>{const r=x.getBoundingClientRect();return x.offsetParent!==null&&r.top>120&&r.top<760});const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
await b.click(h.x, h.y); await sleep(1200);
const after1 = (await visSet()).filter((s) => !before.has(s));
console.log('NEW after handle click:', JSON.stringify(after1, null, 0));
{ const s = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); fs.writeFileSync('<tmp>/a19acc/inspect-handle.jpg', Buffer.from(s.result.data, 'base64')); }
// Right-click the handle (context menu), and select text inside the readonly line by drag.
await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: h.x, y: h.y, button: 'right', clickCount: 1 }); await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: h.x, y: h.y, button: 'right', clickCount: 1 }); await sleep(1000);
const after2 = (await visSet()).filter((s) => !before.has(s));
console.log('NEW after right-click:', JSON.stringify(after2.filter((s) => !after1.includes(s)), null, 0));
await b.close(); process.exit(0);
