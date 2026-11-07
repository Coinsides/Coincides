// Review repro J (handoff finding 2): the draft handoff's focus receipt names a unit on line 2; later the slash
// command "Text" replaces the block's flow with one fresh unit, so that unit is gone. Does the caret come back?
const ACTIVE = `(()=>{const a=document.activeElement;return {tag:a?.tagName,editor:Boolean(a?.dataset?.runtimeTextflowEditor),unit:a?.dataset?.textUnitId||null,value:a?.value!==undefined?a.value.slice(0,60):null,menu:[...document.querySelectorAll('[role=listbox],[role=menu],[class*=lash]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.innerText.replace(/\\s+/g,' ').slice(0,80)).slice(0,2)}})()`;
const active = () => b.ev(ACTIVE);
const typeText = async (t, gap = 90) => { for (const c of t) { if (c === ' ') await key(' ', 'Space', 32, ' '); else if (c === '/') await key('/', 'Slash', 191, '/'); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(gap); } };
const ONLY_RV = process.env.ONLY ? process.env.ONLY.split(',') : null;
const REPS = Number(process.env.REPS || 2); const WHERE = (process.env.WHERE || 'line2,line3').split(',');
for (const where of WHERE) for (let i = 0; i < REPS; i += 1) {
  const name = `J-slashText-${where}-${i}`;
  if (ONLY_RV && !ONLY_RV.some((p) => name.startsWith(p))) continue;
  console.log('---', name);
  try {
    const id = await newNote(`R slash text ${where} ${i}`); await open(id); await clickTa(0); await sleep(800);
    // One continuous run in the draft, so the handoff lands with the caret on line 2.
    await typeText('one', 60); await enter(); await sleep(60); await typeText('two', 60);
    await sleep(3500);
    const afterHandoff = await active();
    const blocks0 = (await serverBlocks(id)).map((x) => ({ units: x.units, ids: x.ids }));
    if (where === 'line3') { await enter(); await sleep(800); }
    await typeText('/', 60); await sleep(700);
    const menu = await active();
    await enter(); await sleep(2500);
    const afterText = await active();
    await typeText('zz', 120); await sleep(2500);
    const afterKeys = await active();
    const st = await state();
    await blurOutside(); await sleep(2500);
    const blocks = (await serverBlocks(id)).map((x) => ({ units: x.units, ids: x.ids }));
    add({ arm: 'RV', name, id, afterHandoff, blocks0, menu, afterText, afterKeys, dom: st.tas.map((t) => t.v), blocks, ok: afterText.editor === true && JSON.stringify(blocks).includes('zz') });
  } catch (e) { add({ arm: 'RV', name, ok: false, error: String(e).slice(0, 300) }); }
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
