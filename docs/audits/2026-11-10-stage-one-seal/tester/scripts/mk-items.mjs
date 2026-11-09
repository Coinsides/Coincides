// Tester(1) 2026-11-10, Main_Designer ruling (e): the HL / HL2 / N-b2 rules gain a fourth place - "offered by a recovery
// item with Apply" (the A-20+ receipt path; the rules predate it). Makes copies acc10i / acc11i / acc13i that record the
// recovery queue items at every reopen (row field itemsAtReopen). Originals untouched. The judging stays in the probe's
// old rule (kept as a reading); reread-items.mjs applies the new rule to the rows.
import fs from 'node:fs';
const D = '<scratch>/a20reg';
const ROW = "const row = (name, id, data, ok) => { add({ arm: 'RV', name, id, ...data, storedHere: lastStoredHere, net: [...net], ok }); lastStoredHere = null; };";
const ROW2 = [
  "const ITEMSR = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const out=[];for(const x of document.querySelectorAll('[role=status],[role=alert]')){if(!vis(x))continue;if(x.parentElement&&x.parentElement.closest('[role=status],[role=alert]'))continue;const t=(x.innerText||'').replace(/\\s+/g,' ').trim().slice(0,400);if(!t)continue;out.push({t,buttons:[...x.querySelectorAll('button')].filter(vis).map((y)=>y.textContent.trim())})}return out})()`;",
  'let lastItemsR = null;',
  "const row = (name, id, data, ok) => { add({ arm: 'RV', name, id, ...data, itemsAtReopen: lastItemsR, storedHere: lastStoredHere, net: [...net], ok }); lastStoredHere = null; lastItemsR = null; };",
].join('\n');
const RE = 'const reopened = await win();';
const RE2 = 'const reopened = await win(); lastItemsR = await b.ev(ITEMSR).catch(() => null);';
for (const f of ['acc10', 'acc11', 'acc13']) {
  let s = fs.readFileSync(`${D}/${f}_probe.mjs`, 'utf8');
  if (s.split(ROW).length !== 2) throw new Error(`${f}: row line not found exactly once`);
  s = s.replace(ROW, ROW2).split(RE).join(RE2);
  fs.writeFileSync(`${D}/${f}i_probe.mjs`, s); console.log(`${f}i_probe.mjs written (${s.split(RE2).length - 1} reopen reads)`);
}
