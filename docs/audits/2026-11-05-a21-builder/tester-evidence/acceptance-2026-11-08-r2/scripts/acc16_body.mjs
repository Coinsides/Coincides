// F4 (Reviewer finding, Main_Designer's 30-second check): does the global `textarea { transition: all 150ms }` reach the
// kept box, so that the self-check reads a rectangle that is still sliding? A box is left on screen (acc12 shape), its
// computed transition is read, then the page is scrolled 120 px and the box's top is sampled every ~20 ms for 500 ms
// against its unit's top. Repeated after a viewport resize.
const REP16 = Number(process.env.REP16 || 2);
const STYLE = `(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const n=document.querySelector('[data-structure-typing-notice]');const s=(e)=>{if(!e)return null;const c=getComputedStyle(e);return {transition:c.transition,duration:c.transitionDuration,property:c.transitionProperty,inline:e.style.transition||null,boxSizing:c.boxSizing}};return {box:s(t),notice:s(n)}})()`;
const SAMPLE = `(async()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');if(!t)return null;const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0);const r0=t.getBoundingClientRect();const own=eds.find(e=>Math.abs(e.getBoundingClientRect().top-r0.top)<4)||null;const out=[];const T0=performance.now();window.scrollBy?0:0;const sc=document.scrollingElement;const target=[...document.querySelectorAll('*')].find(e=>{const cs=getComputedStyle(e);return (cs.overflowY==='auto'||cs.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+50&&e.contains(eds[0]||document.body)})||sc;target.scrollTop+=120;while(performance.now()-T0<500){await new Promise(r=>setTimeout(r,20));const b=t.getBoundingClientRect();const o=own?own.getBoundingClientRect():null;out.push([Math.round(performance.now()-T0),Math.round(b.top),o?Math.round(o.top):null,Math.round(b.left)])}target.scrollTop-=120;return {ownV:own?own.value:null,scroller:target===sc?'document':target.className.slice(0,40),samples:out}})()`;
for (let i = 0; i < REP16; i += 1) {
  const name = `F4-transition-${i}`;
  await scenario(name, async () => {
    const id = await newNote(`R f4 ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    let n = 0;
    rule = ({ u }) => { if (/text-save/.test(u) && n++ === 0) return 'hold'; return 'continue'; };
    await typeHash(); await typeText('kept'); await enter(); await sleep(40); await typeText('body', 50);
    await goHash(other); await sleep(3000);
    rule = () => 'continue'; await release(); await sleep(4000);
    await goHash(id); await sleep(5000);
    await open(id); await sleep(4500);
    const style = await b.ev(STYLE);
    const g = await b.ev(GEO);
    const slide = await b.ev(SAMPLE);
    await sleep(800);
    await b.cdp('Emulation.setDeviceMetricsOverride', { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false });
    const afterResize = [];
    for (let k = 0; k < 15; k += 1) { const s = await b.ev(`(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');if(!t)return null;const r=t.getBoundingClientRect();return [Math.round(r.top),Math.round(r.left),Math.round(r.width)]})()`); afterResize.push([k * 40, s]); await sleep(40); }
    await b.cdp('Emulation.clearDeviceMetricsOverride'); await sleep(800);
    lastStoredHere = await storedFor(id);
    row(name, id, { style, boxes: g.boxes.map((x) => ({ top: x.top, left: x.left, right: x.right, own: x.own })), lines: g.lines.map((l) => [l.v, l.top, l.left]), slide, afterResize }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
