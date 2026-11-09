
// geo-se (Tester 11-09): does one unit 'abc\nd' render like two units ['abc','d']? (Main_Designer's reason (1) for not blocking
// r3e on SHIFTENTER-typed-close.) Opens each note in IDS (env, comma-separated), reads every visible editor line: its rect, its
// value, computed line-height / padding / margin; the y of the 'abc' text and of the 'd' text (Range rects inside a mirror of
// the textarea are not available, so for a one-unit line the second visual line is taken as top + padding + one line-height);
// screenshots of the note. Read only: nothing is typed.
const IDS = String(process.env.IDS || '').split(',').filter(Boolean);
const GEO_SE = `(()=>{const out=[];for(const e of document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')){const r=e.getBoundingClientRect();if(r.width<=0)continue;const cs=getComputedStyle(e);const host=e.parentElement;const hr=host?host.getBoundingClientRect():null;const hcs=host?getComputedStyle(host):null;out.push({v:e.value,top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,h:Math.round(r.height*10)/10,left:Math.round(r.left),lh:cs.lineHeight,fs:cs.fontSize,pt:cs.paddingTop,pb:cs.paddingBottom,mt:cs.marginTop,mb:cs.marginBottom,hostTop:hr?Math.round(hr.top*10)/10:null,hostH:hr?Math.round(hr.height*10)/10:null,hostMt:hcs?hcs.marginTop:null,hostMb:hcs?hcs.marginBottom:null,hostPt:hcs?hcs.paddingTop:null,hostPb:hcs?hcs.paddingBottom:null})}return out})()`;
const results = [];
for (const id of IDS) {
  await open(id); await sleep(3000);
  const lines = await b.ev(GEO_SE).catch((e) => ({ err: String(e) }));
  await shot(`note-${id.slice(0, 8)}`);
  // y of the 'abc' text and of the 'd' text, page coordinates of the textarea tops (+ one line-height for a second visual line)
  let abcY = null; let dY = null;
  if (Array.isArray(lines)) {
    const px = (x) => parseFloat(x) || 0;
    for (const l of lines) {
      if (l.v === 'abc\nd') { abcY = l.top + px(l.pt); dY = l.top + px(l.pt) + px(l.lh); }
      if (l.v === 'abc') abcY = l.top + px(l.pt);
      if (l.v === 'd') dY = l.top + px(l.pt);
    }
  }
  results.push({ id, lines, abcY, dY, gap: abcY != null && dY != null ? Math.round((dY - abcY) * 10) / 10 : null });
}
fs.writeFileSync(`${OUT}/geo-se.json`, JSON.stringify(results, null, 1));
for (const r of results) console.log(JSON.stringify({ id: r.id.slice(0, 8), gap: r.gap, lines: Array.isArray(r.lines) ? r.lines.map((l) => ({ v: l.v, top: l.top, h: l.h, lh: l.lh, mt: l.mt, mb: l.mb, hostH: l.hostH, hostMt: l.hostMt, hostMb: l.hostMb })) : r.lines }));
console.log(`DONE ${LABEL}`);
await b.close(); process.exit(0);
