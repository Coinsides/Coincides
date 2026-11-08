// J1 positive control: in a PDF note's Text view, select part of a line inside the read-only text area by keyboard
// (click, Home, Shift+End) and by a slow mouse drag inside one line; does the selection toolbar (Label) or the
// group-drag handle appear? Same on the image note (pages only) as the negative arm.
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const { upload, waitReg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const pdf = await upload(token, courseId, 'sel.pdf', 'application/pdf', await makePdf('Sel', 2));
await waitReg(token, pdf.note, (r) => r.status === 'complete', 90000).catch(() => null);
const b = await launch({ port: 9633, profile: `<tmp>/a19acc/prof-${LABEL}`, width: 1280, height: 900 });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(300);
await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${pdf.note}` });
for (let i = 0; i < 100; i += 1) { if (await b.ev(`[...document.querySelectorAll('[data-source-view-toggle] button')].some((x)=>x.offsetParent!==null&&/text/i.test(x.textContent))`)) break; await sleep(300); }
await sleep(1000);
const tp = await b.ev(`(()=>{const x=[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent));const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
await b.click(tp.x, tp.y); await sleep(2500);
const SEEN = String.raw`(()=>{const tb=document.querySelector('[data-selection-toolbar="true"]');const a=document.activeElement;
return {toolbar:!!tb&&tb.offsetParent!==null,buttons:tb?[...tb.querySelectorAll('button')].map((x)=>x.textContent.trim()||x.getAttribute('aria-label')):[],
group:[...document.querySelectorAll('[title="Drag selected range into a content group"],[aria-label="Drag selected range"]')].filter((x)=>x.offsetParent!==null).length,
active:a?a.tagName+(a.readOnly?'(ro)':''):null,taSel:a&&a.tagName==='TEXTAREA'?[a.selectionStart,a.selectionEnd]:null}})()`;
const line = await b.ev(String.raw`(()=>{const ta=[...document.querySelectorAll('[data-note-host-mode] textarea[data-text-unit-id]')][0];const r=ta.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()`);
const k = async (key, code, vk, mod = 0) => { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, modifiers: mod }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers: mod }); await sleep(120); };
const y = line.y + 70; // third visual line of the first unit
await b.click(line.x + 40, y); await sleep(400);
await k('Home', 'Home', 36); await k('End', 'End', 35, 8); await sleep(1200);
const viaKeys = await b.ev(SEEN);
await b.click(line.x + 600, line.y - 120); await sleep(500);
// slow drag inside one visual line
await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: line.x + 20, y, button: 'left', clickCount: 1, buttons: 1 });
for (let i = 1; i <= 20; i += 1) { await b.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: line.x + 20 + i * 15, y, button: 'left', buttons: 1 }); await sleep(40); }
await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: line.x + 320, y, button: 'left', clickCount: 1 }); await sleep(1200);
const viaDrag = await b.ev(SEEN);
const s = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); fs.writeFileSync(new URL('pdf-text-select.jpg', OUT), Buffer.from(s.result.data, 'base64'));
console.log('keys:', JSON.stringify(viaKeys)); console.log('drag:', JSON.stringify(viaDrag));
fs.writeFileSync(new URL('rows.jsonl', OUT), JSON.stringify({ viaKeys, viaDrag }) + '\n');
await b.close(); process.exit(0);
