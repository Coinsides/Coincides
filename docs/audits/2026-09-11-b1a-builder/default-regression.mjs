// Reproducible synthetic Chrome/CDP component test. Requires current serve.mjs on 5191; original D2 fixture, current injected skin.
// A fresh headless test profile is isolated from the user's Chrome profile.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const chromePath = process.env.E1_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(chromePath)) throw new Error('Set E1_CHROME_PATH to a Chrome executable.');
const port = 9343;
const profile = resolve(root, '.codex-tmp/b1a-default-regression-chrome');
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

function decodePng(bytes) {
 let p=8,w,h,color; const chunks=[];
 while(p<bytes.length){const n=bytes.readUInt32BE(p),t=bytes.toString('ascii',p+4,p+8),data=bytes.subarray(p+8,p+8+n); if(t==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);color=data[9];if(data[8]!==8||data[12]!==0)throw new Error('Unexpected PNG format');} if(t==='IDAT')chunks.push(data);p+=12+n;}
 const bpp=color===6?4:color===2?3:0;if(!bpp)throw new Error('Unexpected PNG color '+color);
 const packed=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(w*h*bpp);let cursor=0;
 const paeth=(a,b,c)=>{const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=packed[cursor++];for(let x=0;x<w*bpp;x++){const a=x>=bpp?pixels[y*w*bpp+x-bpp]:0,b=y?pixels[(y-1)*w*bpp+x]:0,c=y&&x>=bpp?pixels[(y-1)*w*bpp+x-bpp]:0;pixels[y*w*bpp+x]=(packed[cursor++]+([0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]))&255;}}
 return {w,h,bpp,pixels};
}
function compareDefaultPng() {
 const before=readFileSync(resolve(audit,'baseline-paper.png')),after=readFileSync(resolve(audit,'default-regression.png'));
 const a=decodePng(before),b=decodePng(after);if(a.w!==b.w||a.h!==b.h||a.bpp!==b.bpp)throw new Error('Screenshot geometry differs');
 let changed=0,maxDelta=0,left=a.w,top=a.h,right=0,bottom=0;
 for(let i=0;i<a.w*a.h;i++){let different=false;for(let c=0;c<a.bpp;c++){const delta=Math.abs(a.pixels[i*a.bpp+c]-b.pixels[i*a.bpp+c]);maxDelta=Math.max(maxDelta,delta);different ||=delta>0;}if(different){changed++;const x=i%a.w,y=Math.floor(i/a.w);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}}
 return {baseline:'baseline-paper.png',current:'default-regression.png',width:a.w,height:a.h,pixels:a.w*a.h,changedPixels:changed,maxChannelDelta:maxDelta,bounds:changed?{left,top,right,bottom}:null,baselineSha256:createHash('sha256').update(before).digest('hex'),currentSha256:createHash('sha256').update(after).digest('hex'),pass:changed===0};
}

try {
  let targets;
  for(let i=0;i<50;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());break;}catch{await pause(100);}}
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  ws.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.rej(new Error(JSON.stringify(msg.error))):p?.res(msg.result);}else events.push(msg);};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear(); sessionStorage.clear();'});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5191/default-regression.html#/notes/d2-existing'});
  for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[data-note-host-mode]')`))break;await pause(150);}
  await pause(700);
  await assert('Current runtime actually injects default skin variables', `(() => {const el=document.querySelector('[data-note-host-mode]');return {pass:el?.dataset.noteSkinPreset==='default'&&el.style.getPropertyValue('--sk-paper')==='#101114'&&getComputedStyle(el).getPropertyValue('--sk-paper').trim()==='#101114',preset:el?.dataset.noteSkinPreset,inline:el?.style.getPropertyValue('--sk-paper'),resolved:el&&getComputedStyle(el).getPropertyValue('--sk-paper')};})()`);
  await shot('default-regression');
  evidence.pixelComparison=compareDefaultPng();
  evidence.assertions.push({name:'Default screenshot matches the pre-change fixture pixel for pixel',pass:evidence.pixelComparison.pass,detail:evidence.pixelComparison});
  evidence.errors=events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Runtime.consoleAPICalled'&&e.params.type==='error');
  if(!evidence.pixelComparison.pass)throw new Error('Default screenshot changed '+evidence.pixelComparison.changedPixels+' pixels');
  evidence.styles=await evaluate(`Array.from(document.querySelectorAll('[data-note-host-mode] *')).filter(e=>e.getBoundingClientRect().width).map(e=>({tag:e.tagName,class:e.className,color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor}))`);
  evidence.status='passed';} catch(error) {
  evidence.status='failed'; evidence.failure=String(error.stack||error);
  if(ws?.readyState===WebSocket.OPEN){try{await shot('default-regression-failure');}catch{}}
  process.exitCode=1;
} finally {
  evidence.counts={passed:evidence.assertions.filter(a=>a.pass).length,failed:evidence.assertions.filter(a=>!a.pass).length,overlays:new Set(evidence.borders.map(b=>b.overlay)).size,inspectionSamples:evidence.borders.length,
    nestedBorders:evidence.borders.reduce((n,b)=>n+b.nestedBorders.length,0),hairlineSeparators:evidence.borders.filter(b=>b.state==='rest').reduce((n,b)=>n+b.hairlineSeparators.length,0),forcedHoverTargets:evidence.borders.filter(b=>b.state==='hover').reduce((n,b)=>n+b.forcedHoverTargets,0)};
  writeFileSync(resolve(audit,'default-regression.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:evidence.status,counts:evidence.counts,failure:evidence.failure},null,2));
  ws?.close(); chrome.kill();
}
