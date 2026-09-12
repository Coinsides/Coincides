// Isolated Chrome, actual React page and human HTTP routes. Run after serve.mjs.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const audit=dirname(fileURLToPath(import.meta.url));
const root=resolve(audit,'../../../..');
const base='http://127.0.0.1:5200';
const bootstrap=await fetch(base+'/__fixture/bootstrap').then(r=>r.json());
const profiles=resolve(root,'.codex-tmp/b1d-chrome'); mkdirSync(profiles,{recursive:true});
const profile=mkdtempSync(resolve(profiles,'run-'));
const chrome=spawn(process.env.E1_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--disable-gpu','--in-process-gpu','--no-sandbox','--disable-background-networking','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=9380',`--user-data-dir=${profile}`,'about:blank',
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const report={status:'running',syntheticOnly:true,databaseSharedBetweenModes:true,profile,assertions:[],screenshots:[],presets:{},errors:[]};
let chromeLog='',ws,seq=0,navigation=0; const pending=new Map(),events=[];
chrome.stderr.on('data',chunk=>chromeLog+=chunk.toString());
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}) {return new Promise((res,rej)=>{const id=++seq;const t=setTimeout(()=>rej(new Error('CDP timeout '+method)),20000);pending.set(id,{res:r=>{clearTimeout(t);res(r)},rej:e=>{clearTimeout(t);rej(e)}});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await pause(100);}throw new Error('Timed out: '+expression);}
function check(name,pass,detail){report.assertions.push({name,pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));}
async function request(method,path,body){const r=await fetch(base+path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});if(!r.ok)throw new Error(path+': '+await r.text());return r.json();}
async function away(){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2});await pause(220);}
async function shot(name,moveAway=true){if(moveAway)await away();await evaluate('document.fonts.ready.then(()=>true)');const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(audit,name+'.png'),Buffer.from(r.data,'base64'));report.screenshots.push(name+'.png');}
async function navigate(port,preset){await send('Page.navigate',{url:`http://127.0.0.1:${port}/?mount=${++navigation}#/notes/${bootstrap.legacyNoteId}`});await until(`document.querySelector('[data-note-host-mode]')?.dataset.noteSkinPreset===${JSON.stringify(preset)} && document.querySelectorAll('[data-page-frame-wall]').length===2 && !!document.querySelector('[data-note-paper-header]')`);await evaluate('document.fonts.ready.then(()=>true)');await pause(1000);await away();}
async function clickButton(label){const point=await evaluate(`(() => {const el=[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.trim()===${JSON.stringify(label)});if(!el)throw new Error('Missing '+${JSON.stringify(label)});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await pause(300);}
async function metrics(){return evaluate(`(() => {
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
 const pick=(el,pseudo)=>{const s=getComputedStyle(el,pseudo);return {background:s.background,backgroundImage:s.backgroundImage,boxShadow:s.boxShadow,border:s.border,outline:s.outline,opacity:s.opacity,maskImage:s.maskImage,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,height:s.height,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,marginTop:s.marginTop,top:s.top,pointerEvents:s.pointerEvents,cursor:s.cursor,overflowClipMargin:s.overflowClipMargin,contain:s.contain,willChange:s.willChange}};
 const header=document.querySelector('[data-note-paper-header]'),title=header.querySelector('textarea[aria-label="Note title"]'),description=header.querySelector('textarea[aria-label="Note description"]');
 const row=header.querySelector('[class*="_row_"]'),host=document.querySelector('[data-note-host-mode]');
 const walls=[...document.querySelectorAll('[data-page-frame-wall]')].map(el=>({side:el.dataset.pageFrameWall,active:el.dataset.pageFrameWallActive,interactive:el.dataset.pageFrameWallInteractive??'true',role:el.getAttribute('role'),rect:rect(el),wall:pick(el),line:pick(el.querySelector('span')),idle:pick(el,'::before'),ticks:pick(el,'::after')}));
 const classProbe=[...document.querySelectorAll('[class]')].filter(el=>typeof el.className==='string'&&/pageReading|readingPage|paperSurface|paperPage|writingSurface|paperHeader/.test(el.className)).map(el=>({class:el.className,inline:el.getAttribute('style'),rect:rect(el),style:pick(el)}));
 return {header:{rect:rect(header),style:pick(header)},title:{rect:rect(title),style:pick(title)},description:{rect:rect(description),style:pick(description)},metadata:row?{rect:rect(row),style:pick(row)}:null,walls,hostVars:Object.fromEntries(['--sk-wall-idle','--sk-paper-title-weight','--paper-material-background','--paper-material-shadow'].map(k=>[k,getComputedStyle(host).getPropertyValue(k)])),classProbe};
})()`);}
async function pointerWall(side,phase){
 const walls=await metrics();const wall=walls.walls.find(w=>w.side===side);
 const x=wall.rect.x+wall.rect.width/2,y=Math.min(740,Math.max(420,wall.rect.y+80));
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await pause(220);
 if(phase==='active'){await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+12,y,button:'left',buttons:1});await pause(200);}
 const measured=await metrics(); const hit=await evaluate(`(() => {const el=document.elementFromPoint(${x},${y});return {tag:el?.tagName,wall:el?.closest('[data-page-frame-wall]')?.dataset.pageFrameWall??null}})()`);
 if(phase==='active'){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await pause(300);}
 return {point:{x,y},hit,measured};
}
function visualSnapshot(state){const row=state.notes.find(n=>n.note.id===bootstrap.legacyNoteId);return {canvas:row.canvas,title:row.note.title,description:row.note.description};}
try {
 let targets;for(let i=0;i<80;i++){try{targets=await fetch('http://127.0.0.1:9380/json/list').then(r=>r.json());break}catch{await pause(100)}}
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.rej(new Error(JSON.stringify(m.error))):p?.res(m.result)}else events.push(m)};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1800,deviceScaleFactor:1,mobile:false});
 report.browser=await send('Browser.getVersion');
 for(const preset of (process.env.B1D_PRESETS||'default,quiet-ink,warm-paper,workbench').split(',')){
  await request('PUT','/api/settings',{settings:{skin:{preset}}});
  const entry=report.presets[preset]={};
  for(const [mode,port] of [['baseline',5202],['current',5200],['header-baseline',5203]]){
   await navigate(port,preset);
   if(!report.initial){report.initial=visualSnapshot(await request('GET','/__fixture/state'));report.initialBlocks=await request('GET',`/api/notes/${bootstrap.legacyNoteId}/blocks`);}
   await shot(`${preset}-${mode}`);entry[mode]={idle:await metrics()};
   if(process.env.B1D_CSS_PROBE && mode==='header-baseline'){
    await evaluate(`(() => {const s=document.createElement('style');s.dataset.auditProbe='wall-pseudo-disable';s.textContent='[data-page-frame-wall]::before,[data-page-frame-wall]::after{display:none!important;content:none!important}';document.head.append(s);})()`);
    await shot(`${preset}-header-baseline-no-idle-pseudo`);
    await evaluate(`document.querySelector('[data-audit-probe="wall-pseudo-disable"]').remove()`);
   }
   if(mode!=='header-baseline'){
    entry[mode].hover=await pointerWall('right','hover');await shot(`${preset}-${mode}-right-hover`,false);
    entry[mode].active=await pointerWall('right','active');await away();
    // Re-read after pointer leaves; a hover-only line must disappear on the baseline.
    entry[mode].after=await metrics();
   }
  }
  const a=entry.baseline,b=entry.current;
  const header=b.idle,scale=header.header.rect.width/904;
  const proportions={titleHeight:parseFloat(header.title.style.height),lineHeight:parseFloat(header.title.style.lineHeight),titleSize:parseFloat(header.title.style.fontSize),titleWeight:header.title.style.fontWeight,paperTop:parseFloat(header.header.style.paddingTop),titleToDescription:(header.description.rect.y-header.title.rect.bottom)/scale,descriptionToMetadata:(header.metadata.rect.y-header.description.rect.bottom)/scale,metadataToBody:(header.header.rect.bottom-header.metadata.rect.bottom)/scale};
  entry.proportions=proportions;
  check(`${preset}: title is exactly one complete line with specified size/weight`,Math.abs(proportions.titleHeight-proportions.lineHeight)<.03&&proportions.titleSize===(preset==='warm-paper'?36:34)&&proportions.titleWeight===(preset==='warm-paper'?'600':'650'),proportions);
  check(`${preset}: 56 / 10 / 12 / 28 header proportion chain`,proportions.paperTop===56&&Math.abs(proportions.titleToDescription-10)<.03&&Math.abs(proportions.descriptionToMetadata-12)<.03&&Math.abs(proportions.metadataToBody-28)<.03,proportions);
  for(const phase of ['hover','active']){
   const old=a[phase].measured.walls.find(w=>w.side==='right'),now=b[phase].measured.walls.find(w=>w.side==='right');
   check(`${preset}: ${phase} line paint remains incumbent`,isDeepStrictEqual(old.line,now.line),{baseline:old.line,current:now.line});
   check(`${preset}: ${phase} current idle/tick paint is suppressed`,now.idle.opacity==='0'&&now.ticks.opacity==='0',{idle:now.idle.opacity,ticks:now.ticks.opacity});
  }
  const expected=preset==='warm-paper'?'0.55':preset==='workbench'?'1':'0';
  check(`${preset}: both idle walls have prescribed visibility`,b.idle.walls.every(w=>w.idle.opacity===expected),b.idle.walls.map(w=>({side:w.side,opacity:w.idle.opacity})));
  check(`${preset}: both original live walls are invisible without hover`,a.idle.walls.every(w=>w.line.opacity==='0')&&a.after.walls.every(w=>w.line.opacity==='0'));
  check(`${preset}: original right-only line reproduced by right hit strip`,a.hover.hit.wall==='right'&&a.hover.measured.walls.find(w=>w.side==='right').line.opacity==='1'&&a.hover.measured.walls.find(w=>w.side==='left').line.opacity==='0',a.hover.hit);
 }
 report.final=visualSnapshot(await request('GET','/__fixture/state'));report.finalBlocks=await request('GET',`/api/notes/${bootstrap.legacyNoteId}/blocks`);
 check('Source block content remains byte-for-byte equal through skin switches and wall drag out/back',isDeepStrictEqual(report.initialBlocks,report.finalBlocks));
 // Wall zero-distance final writes may update timestamps; retain the raw documents and compare geometry separately.
 const geometry=c=>({canvasPlacements:c.canvasPlacements,pageFrameCollection:c.pageFrameCollection,blockLayouts:c.blockLayouts,contentMounts:c.contentMounts});
 report.geometryBefore=geometry(report.initial.canvas);report.geometryAfter=geometry(report.final.canvas);
 check('Stored canvas source data/placement geometry remains unchanged',isDeepStrictEqual(report.initial.canvas,report.final.canvas),{before:report.initial.canvas,after:report.final.canvas});
 await request('PUT','/api/settings',{settings:{skin:{preset:'warm-paper'}}});await navigate(5200,'warm-paper');await shot('warm-paper-current-final');
 await clickButton('Pen');await away();report.warmPen=await metrics();await shot('warm-paper-pen-inert-walls');
 check('Warm paper keeps paint-only idle walls in Pen mode',report.warmPen.walls.length===2&&report.warmPen.walls.every(w=>w.interactive==='false'&&w.role===null&&w.wall.pointerEvents==='none'&&w.idle.opacity==='0.55'));
 await clickButton('Selection');
 await request('PUT','/api/settings',{settings:{skin:{preset:'workbench'}}});await navigate(5200,'workbench');await clickButton('Overview');await until(`!!document.querySelector('[data-note-overview-root]')`);await away();await shot('workbench-overview');
 report.workbenchOverview=await evaluate(`(() => {const el=document.querySelector('[data-note-overview-root]');const s=getComputedStyle(el);return {class:el.className,backgroundImage:s.backgroundImage,backgroundSize:s.backgroundSize};})()`);
 check('Workbench overview retains its 24px engineering grid',report.workbenchOverview.backgroundImage.includes('linear-gradient')&&report.workbenchOverview.backgroundSize.includes('24px'),report.workbenchOverview);
 const requests=(await request('GET','/__fixture/state')).requests;
 report.failedHttpRequests=requests.filter(r=>r.status>=400);
 check('Actual human routes complete without failed requests',report.failedHttpRequests.length===0,report.failedHttpRequests);
 report.clipSupport=await evaluate(`({literal:CSS.supports('overflow-clip-margin','32px'),calc:CSS.supports('overflow-clip-margin','calc(32px * 1.08)'),variable:CSS.supports('overflow-clip-margin','calc(var(--paper-material-clip-margin, 32px) * 1.08)')})`);
 const ref=resolve(audit,'../reference-a.html');if(existsSync(ref)){
  await send('Page.navigate',{url:'http://127.0.0.1:5200/@fs/'+ref.replaceAll('\\','/')});await pause(700);await shot('reference-a');
  writeFileSync(resolve(audit,'comparison.html'),`<!doctype html><meta charset="utf-8"><title>B1d material comparison</title><style>*{box-sizing:border-box}body{margin:0;background:#191714;color:#e8e0d2;font:18px/1.5 Arial,sans-serif}header{height:100px;padding:18px 26px}main{display:flex;gap:20px;padding:0 20px}figure{margin:0;width:1440px}figcaption{height:50px;padding:10px;background:#25211c}img{display:block;width:1440px;height:1800px}</style><header><strong>B1d · 暖纸材质与表头比例对照</strong><br>左：按 token spec §八原值复原，非原 Artifact；右：真实 React / HTTP / SQLite 合成夹具。比例缩放保留各自截图。</header><main><figure><figcaption>A 案参数复原（source: ../reference-a.html）</figcaption><img src="reference-a.png"></figure><figure><figcaption>当前实现 · Warm paper · Fit width 108%</figcaption><img src="warm-paper-current-final.png"></figure></main>`);
  await send('Emulation.setDeviceMetricsOverride',{width:2940,height:1950,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5200/comparison.html'});await until(`document.images.length===2&&[...document.images].every(i=>i.complete&&i.naturalWidth)`);await pause(350);await shot('warm-paper-comparison-two-column');
 }
 report.status='passed';
} catch(error){report.status='failed';report.failure=String(error.stack||error);if(ws?.readyState===WebSocket.OPEN){try{await shot('failure')}catch{}}}
finally{
 report.errors=events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Runtime.consoleAPICalled'&&e.params.type==='error');
 if(report.errors.length)report.status='failed';report.counts={passed:report.assertions.filter(a=>a.pass).length,failed:report.assertions.filter(a=>!a.pass).length};
 writeFileSync(resolve(audit,'browser-report.json'),JSON.stringify(report,null,2));writeFileSync(resolve(audit,'chrome.log'),chromeLog);
 if(ws?.readyState===WebSocket.OPEN){try{await send('Browser.close')}catch{}}chrome.kill();
 console.log(JSON.stringify({status:report.status,counts:report.counts,failure:report.failure,errors:report.errors.length}));if(report.status!=='passed')process.exitCode=1;
}
