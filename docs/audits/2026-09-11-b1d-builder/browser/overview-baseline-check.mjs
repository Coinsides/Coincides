// Read-only follow-up: baseline/current Overview over the same stored fixture.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const audit=dirname(fileURLToPath(import.meta.url)),root=resolve(audit,'../../../..');
const get=path=>fetch('http://127.0.0.1:5200'+path).then(r=>r.json());
const boot=await get('/__fixture/bootstrap');const state=await get('/__fixture/state');
const before=state.notes.find(n=>n.note.id===boot.legacyNoteId).canvas;
const profiles=resolve(root,'.codex-tmp/b1d-overview-check');mkdirSync(profiles,{recursive:true});
const profile=mkdtempSync(resolve(profiles,'run-'));
const chrome=spawn(process.env.E1_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--disable-gpu','--in-process-gpu','--no-sandbox','--disable-background-networking','--no-first-run','--no-default-browser-check',
 '--remote-debugging-port=9382',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const report={status:'running',syntheticOnly:true,readOnly:true,source:'Same note/canvas; auditPreset changes fixture memory only, no HTTP writes',screenshots:[],modes:{},errors:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));let ws,seq=0;const pending=new Map(),events=[];
function send(method,params={}){return new Promise((res,rej)=>{const id=++seq;pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(expression){for(let n=0;n<150;n++){if(await evaluate(expression))return;await pause(100);}throw new Error('Timeout '+expression);}
try{
 let targets;for(let n=0;n<60;n++){try{targets=await fetch('http://127.0.0.1:9382/json/list').then(r=>r.json());break}catch{await pause(100)}}
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.rej(new Error(JSON.stringify(m.error))):p?.res(m.result)}else events.push(m)};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1800,deviceScaleFactor:1,mobile:false});
 for(const [mode,port] of [['baseline',5202],['current',5200]]){
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/?auditPreset=workbench&overviewCheck=${mode}#/notes/${boot.legacyNoteId}`});
  await until(`document.querySelector('[data-note-host-mode]')?.dataset.noteSkinPreset==='workbench'&&!!document.querySelector('[data-note-paper-header]')`);await evaluate('document.fonts.ready.then(()=>true)');await pause(900);
  const point=await evaluate(`(() => {const el=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Overview');if(!el)throw new Error('No Overview control');const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  for(const type of ['mouseMoved','mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...point,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});
  await until(`!!document.querySelector('[data-note-overview-root]')`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2});await pause(450);
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=`workbench-overview-${mode}-same-fixture.png`;writeFileSync(resolve(audit,file),Buffer.from(screenshot.data,'base64'));report.screenshots.push(file);
  report.modes[mode]=await evaluate(`(() => {
   const root=document.querySelector('[data-note-overview-root]');const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
   return {rootRect:rect(root),text:root.innerText,descendants:[...root.querySelectorAll('*')].filter(el=>typeof el.className==='string'&&/fragment|Preview|Page|paper|block|Text/i.test(el.className)).map(el=>{const s=getComputedStyle(el);return {tag:el.tagName,class:el.className,rect:rect(el),text:el.childElementCount?null:el.textContent,overflow:s.overflow,clipPath:s.clipPath,transform:s.transform,padding:s.padding}})};
  })()`);
 }
 const final=await get('/__fixture/state');report.before=before;report.after=final.notes.find(n=>n.note.id===boot.legacyNoteId).canvas;
 report.storedCanvasUnchanged=isDeepStrictEqual(report.before,report.after);
 const geometries=mode=>report.modes[mode].descendants.map(({tag,rect,text,overflow,clipPath,transform,padding})=>({tag,rect,text,overflow,clipPath,transform,padding}));
 report.projectedGeometryEqual=isDeepStrictEqual(geometries('baseline'),geometries('current'));
 report.textEqual=report.modes.baseline.text===report.modes.current.text;
 report.observation='Both screenshots visibly reproduce left-side clipping of the same text. Grid paint differs as intended; the projected descendant geometry and text are compared independently of CSS class hashes.';
 report.status=report.storedCanvasUnchanged&&report.projectedGeometryEqual&&report.textEqual?'passed':'failed';
}catch(error){report.status='failed';report.failure=String(error.stack||error)}finally{
 report.errors=events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Runtime.consoleAPICalled'&&e.params.type==='error');if(report.errors.length)report.status='failed';
 writeFileSync(resolve(audit,'overview-baseline-check.json'),JSON.stringify(report,null,2));
 if(ws?.readyState===WebSocket.OPEN){try{await send('Browser.close')}catch{}}chrome.kill();console.log(JSON.stringify({status:report.status,storedCanvasUnchanged:report.storedCanvasUnchanged,projectedGeometryEqual:report.projectedGeometryEqual,textEqual:report.textEqual,errors:report.errors.length,failure:report.failure}));if(report.status!=='passed')process.exitCode=1;
}
