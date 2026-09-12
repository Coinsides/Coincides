// Reproducible synthetic Chrome/CDP component test. Requires serve.mjs on 5187.
// A fresh headless test profile is isolated from the user's Chrome profile.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const chromePath = process.env.E1_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(chromePath)) throw new Error('Set E1_CHROME_PATH to a Chrome executable.');
const port = 9341;
const profile = resolve(root, '.codex-tmp/b1a-synthetic-chrome');
mkdirSync(profile, { recursive: true });
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--in-process-gpu', '--no-sandbox', '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
let chromeLog = '';
chrome.stderr.on('data', data => { chromeLog += data.toString(); });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
const evidence = { status: 'running', syntheticOnly: true, persistenceCoverage: false, browser: null, assertions: [], borders: [], screenshots: [], errors: [], callbacks: [] };
let seq = 0;
const pending = new Map();
const events = [];
async function send(method, params = {}) {
  const id = ++seq;
  return new Promise((res, rej) => { const timer=setTimeout(()=>rej(new Error('CDP timeout: '+method)),10000); pending.set(id, { res:(value)=>{clearTimeout(timer);res(value);}, rej:(error)=>{clearTimeout(timer);rej(error);} }); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function assert(name, expression) {
  const detail = await evaluate(expression);
  const pass = typeof detail === 'boolean' ? detail : Boolean(detail?.pass);
  evidence.assertions.push({ name, pass, detail });
  if (!pass) throw new Error(`Assertion failed: ${name}: ${JSON.stringify(detail)}`);
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve(audit, `${name}.png`), Buffer.from(r.data, 'base64'));
  evidence.screenshots.push(`${name}.png`);
}
async function click(selector, text) {
  const point = await evaluate(`(() => { const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})]; const el = nodes.find(n => ${text ? `[n.getAttribute('aria-label'),n.getAttribute('title'),n.textContent.trim(),...([...n.children].filter(c=>c.tagName==='SPAN').map(c=>c.textContent.trim()))].includes(${JSON.stringify(text)})` : 'true'}); if (!el) throw new Error('Missing target ' + ${JSON.stringify(text || selector)}); if(el.disabled) throw new Error('Disabled target'); el.scrollIntoView({block:'nearest'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  await pause(90);
}
async function key(key, code = key, modifiers = 0) {
  const windowsVirtualKeyCode = ({Tab:9,Escape:27,ArrowUp:38,ArrowDown:40,Home:36,End:35,Enter:13})[key] || key.toUpperCase().charCodeAt(0);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode });
  await pause(70);
}
const state = `JSON.parse(document.querySelector('[data-smoke-state]').textContent)`;
const popover = '[data-note-toolbar-popover] > [data-note-overlay]';
async function inspectStyles(name, selector, mode, forcedHoverTargets = 0) {
  const r = await evaluate(`(() => {
    const root=document.querySelector(${JSON.stringify(selector)}); if(!root) throw new Error('Missing overlay');
    const sides=['Top','Right','Bottom','Left'];
    const rootRect=root.getBoundingClientRect();
    const result={overlay:${JSON.stringify(name)},state:${JSON.stringify(mode)},forcedHoverTargets:${forcedHoverTargets},selector:${JSON.stringify(selector)},descendants:root.querySelectorAll('*').length,nestedBorders:[],hairlineSeparators:[],shadows:[],roundedDescendants:[],staticBackgrounds:[],geometry:{clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,width:rootRect.width,overflowing:[],tooltips:[]}};
    for(const el of root.querySelectorAll('*')) {
      const cs=getComputedStyle(el); const widths=sides.map(side=>parseFloat(cs['border'+side+'Width']));
      const radius=[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomLeftRadius,cs.borderBottomRightRadius];
      if(radius.some(r=>parseFloat(r)>0))result.roundedDescendants.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',radius});
      if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&!el.matches(':hover,:focus,:focus-visible'))result.staticBackgrounds.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',background:cs.backgroundColor});
      const rect=el.getBoundingClientRect();
      if(rect.width&&rect.right>rootRect.right+1)result.geometry.overflowing.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',left:rect.left,right:rect.right,width:rect.width});
      if(el.hasAttribute('data-tip')){const after=getComputedStyle(el,'::after');result.geometry.tooltips.push({left:rect.left,right:rect.right,width:after.width,pseudoLeft:after.left,pseudoRight:after.right,transform:after.transform,visibility:after.visibility});}
      if(cs.boxShadow !== 'none') result.shadows.push({tag:el.tagName,class:el.className,shadow:cs.boxShadow});
      if(!widths.some(w=>w>0)) continue;
      const entry={tag:el.tagName,class:typeof el.className==='string'?el.className:el.className.baseVal,text:el.textContent.trim().slice(0,85),widths};
      // A single horizontal 1px rule is a separator. Two/four sides or vertical rules are boxes.
      if(widths.filter(w=>w>0).length===1 && widths.every(w=>w<=1) && (widths[0]>0 || widths[2]>0)) result.hairlineSeparators.push(entry);
      else result.nestedBorders.push(entry);
    }
    result.pass=result.nestedBorders.length===0 && result.shadows.length===0 && result.roundedDescendants.length===0 && result.staticBackgrounds.length===0; return result;
  })()`);
  evidence.borders.push(r);
  evidence.assertions.push({ name: `${name} (${mode}): zero nested borders, shadows, rounded boxes and static card backgrounds`, pass: r.pass, detail: { nestedBorders: r.nestedBorders.length, hairlineSeparators: r.hairlineSeparators.length, shadows: r.shadows.length,roundedDescendants:r.roundedDescendants.length,staticBackgrounds:r.staticBackgrounds.length } });
  if (!r.pass) throw new Error(`${name} nested borders: ${JSON.stringify(r)}`);
}
async function borders(name,selector){
  await inspectStyles(name,selector,'rest');
  const {root:documentRoot}=await send('DOM.getDocument');
  const {nodeId}=await send('DOM.querySelector',{nodeId:documentRoot.nodeId,selector});
  const {nodeIds}=await send('DOM.querySelectorAll',{nodeId,selector:'button:not(:disabled), [role="button"], summary, input:not(:disabled), select:not(:disabled)'});
  await Promise.all(nodeIds.map(nodeId=>send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']})));
  try { await inspectStyles(name,selector,'hover',nodeIds.length); }
  finally { await Promise.all(nodeIds.map(nodeId=>send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]}))); }
}
async function more() { await click('button', 'More note actions'); }
async function close() { await click(`${popover} button`, 'Close'); }
const ready = async (selector) => { for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))return;await pause(100);}throw new Error('Not ready: '+selector); };
async function choose(selector,value){
  await ready(selector);
  await evaluate(`(() => {const s=document.querySelector(${JSON.stringify(selector)});s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(250);
}
async function navigate(path){
  const loaded=await evaluate(`typeof window.__b1aSynthetic !== 'undefined'`);
  if(loaded)await evaluate(`window.__b1aSynthetic.navigate(${JSON.stringify(path)})`);
  else await send('Page.navigate',{url:'http://127.0.0.1:5191/#'+path});
  await pause(600);
  await assert('Router reaches '+path,`location.hash===${JSON.stringify('#'+path)}`);
}
const rootSelector='[data-note-host-mode="page"]';
async function skin(preset){await ready(rootSelector);await assert('Paper resolves '+preset,`document.querySelector('${rootSelector}').dataset.noteSkinPreset===${JSON.stringify(preset)}`);}
async function paperChoice(value){await click('button','More note actions');await click('[data-paper-appearance] summary');await choose('[data-paper-appearance] select',value);await click('[data-note-overlay="more"] button[title="Close"]');}
try {
  let targets;
  for(let i=0;i<50;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());break;}catch{await pause(100);}}
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  ws.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.rej(new Error(JSON.stringify(msg.error))):p?.res(msg.result);}else events.push(msg);};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate('/notes/d2-existing');
  await evaluate(`localStorage.removeItem('coincides-b1a-synthetic-browser-v1')`);
  await send('Page.reload');await pause(600);
  await navigate('/notes/d2-existing');
  await skin('default');
  await assert('Nine CSS tokens injected into current runtime',`['desk','paper','ink','ink-muted','accent','annotation','hairline','danger','wall'].every(k=>document.querySelector('${rootSelector}').style.getPropertyValue('--sk-'+k))`);
  const baseline=await evaluate(`JSON.parse(localStorage.getItem('coincides-b1a-synthetic-browser-v1'))`);
  const baselineSidebar=await evaluate(`getComputedStyle(document.querySelector('aside')).backgroundColor`);
  const baselineFont=await evaluate(`getComputedStyle(document.querySelector('[data-note-paper-header] textarea')||document.querySelector('h1')).fontFamily`);
  await click('button','View options');await click('[role=menuitemradio]','Fit page');await pause(300);
  await shot('01-default-full');
  for(const preset of ['quiet-ink','warm-paper','workbench','default']){
    await paperChoice(preset);await skin(preset);
    await assert('Sidebar stays unchanged in '+preset,`getComputedStyle(document.querySelector('aside')).backgroundColor===${JSON.stringify(baselineSidebar)}`);
    await assert('Title stays system font in '+preset,`getComputedStyle(document.querySelector('[data-note-paper-header] textarea')||document.querySelector('h1')).fontFamily===${JSON.stringify(baselineFont)}`);
    await shot('02-'+preset+'-full');
  }
  await paperChoice('');await skin('default');
  await navigate('/settings');await ready('[aria-label="纸面外观"] select');
  await choose('[aria-label="纸面外观"] select','warm-paper');
  await navigate('/notes/d2-existing');await skin('warm-paper');await shot('03-global-warm');
  await navigate('/projects');await click('button','Edit project appearance');
  await choose('[data-skin-controls] select','workbench');await click('button','Update');
  await navigate('/notes/d2-existing');await skin('workbench');await shot('04-project-workbench');
  await paperChoice('quiet-ink');await skin('quiet-ink');
  await send('Page.reload');await pause(600);await skin('quiet-ink');await shot('05-paper-refresh');
  await paperChoice('');await skin('workbench');
  await navigate('/projects');await click('button','Edit project appearance');await choose('[data-skin-controls] select','');await click('button','Update');
  await navigate('/notes/d2-existing');await skin('warm-paper');await shot('06-clear-inherits');
  await navigate('/settings');await click('[aria-label="纸面外观"] summary');
  await evaluate(`(() => {const input=document.querySelector('input[aria-label="纸面"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'#EEE8DA');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(300);await shot('07-advanced');
  await navigate('/notes/d2-existing');await skin('warm-paper');
  await assert('Advanced single token persisted and applied',`getComputedStyle(document.querySelector('${rootSelector}')).getPropertyValue('--sk-paper').trim()==='#EEE8DA'`);
  await shot('08-overridden-paper');
  await evaluate(`window.dispatchEvent(new Event('beforeprint'))`);await ready('[data-note-print-page]');
  await send('Emulation.setEmulatedMedia',{media:'print'});await pause(250);
  await assert('Print uses composed paper and ink',`getComputedStyle(document.querySelector('[data-note-print-page]')).backgroundColor==='rgb(238, 232, 218)' && getComputedStyle(document.querySelector('[data-note-print-root]')).color==='rgb(43, 38, 32)'`);
  await shot('09-print-preview');
  const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});writeFileSync(resolve(audit,'warm-paper-print.pdf'),Buffer.from(pdf.data,'base64'));
  await send('Emulation.setEmulatedMedia',{media:''});await evaluate(`window.dispatchEvent(new Event('afterprint'))`);
  const final=await evaluate(`JSON.parse(localStorage.getItem('coincides-b1a-synthetic-browser-v1'))`);
  evidence.requestDiagnostics=await evaluate(`window.__b1aSynthetic.diagnostics()`);
  await assert('No failed requests or save-error toasts',`(() => {const d=window.__b1aSynthetic.diagnostics();return {pass:d.failures.length===0&&d.errorToasts.length===0,failures:d.failures,errorToasts:d.errorToasts};})()`);
  evidence.persistence={global:final.settings.skin,project:final.projectSkin,paper:final.notes.find(n=>n.id==='d2-existing').metadata.skin};
  evidence.assertions.push({name:'Skin never changes content, placements or typography',pass:JSON.stringify(baseline.blocks)===JSON.stringify(final.blocks)&&JSON.stringify(baseline.collections)===JSON.stringify(final.collections),detail:{blocks:baseline.blocks.length}});
  evidence.errors=events.filter(e=>e.method==='Runtime.exceptionThrown');
  evidence.assertions.push({name:'No browser runtime exceptions',pass:evidence.errors.length===0,detail:evidence.errors});
  evidence.status=evidence.assertions.every(a=>a.pass)?'passed':'failed';
  if(evidence.status==='failed')process.exitCode=1;} catch(error) {
  evidence.status='failed'; evidence.failure=String(error.stack||error);
  if(ws?.readyState===WebSocket.OPEN){try{await shot('failure');}catch{}}
  process.exitCode=1;
} finally {
  evidence.counts={passed:evidence.assertions.filter(a=>a.pass).length,failed:evidence.assertions.filter(a=>!a.pass).length,overlays:new Set(evidence.borders.map(b=>b.overlay)).size,inspectionSamples:evidence.borders.length,
    nestedBorders:evidence.borders.reduce((n,b)=>n+b.nestedBorders.length,0),hairlineSeparators:evidence.borders.filter(b=>b.state==='rest').reduce((n,b)=>n+b.hairlineSeparators.length,0),forcedHoverTargets:evidence.borders.filter(b=>b.state==='hover').reduce((n,b)=>n+b.forcedHoverTargets,0)};
  writeFileSync(resolve(audit,'skin-smoke-report.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:evidence.status,counts:evidence.counts,failure:evidence.failure},null,2));
  ws?.close(); chrome.kill();
}
