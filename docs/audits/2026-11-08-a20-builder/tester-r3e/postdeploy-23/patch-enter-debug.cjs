// DEBUGENTER=1 (Tester 11-09, island post-deploy 23): enterThroughApp records what the click hit (element at the point, link
// rect, viewport, scroll) and screenshots before / after the click. Off by default; behaviour unchanged without the env var.
const fs = require('fs');
const f = 'a20m_body.mjs'; let s = fs.readFileSync(f, 'utf8');
if (s.includes('DEBUGENTER')) { console.log('already'); process.exit(0); }
fs.writeFileSync('a20m_body.v-pre-enterdebug.mjs', s);
const a = "  await sleep(300); await b.click(link.x, link.y);\n  for (let k = 0; k < 60; k += 1) { await sleep(250); const h = await b.ev('location.hash').catch(() => ''); if (h.includes(id) && (await edsM()).length) break; }";
if (s.split(a).length !== 2) throw new Error('anchor');
const b2 = "  await sleep(300);\n  let dbg = null;\n  if (process.env.DEBUGENTER) { await shot(`enter-before-${Date.now() % 100000}`); dbg = await b.ev(`(()=>{const e=document.elementFromPoint(${link.x},${link.y});const chain=[];let p=e;for(let i=0;i<6&&p;i++){chain.push(p.tagName+(p.getAttribute&&p.getAttribute('role')?'[role='+p.getAttribute('role')+']':'')+(p.className&&typeof p.className==='string'?'.'+p.className.split(' ').slice(0,2).join('.'):'')+(p.getAttribute&&p.getAttribute('href')?' href='+p.getAttribute('href').replace(/[0-9a-f-]{36}/g,':id'):''));p=p.parentElement}return {at:[${link.x},${link.y}],vw:innerWidth,vh:innerHeight,scrollY,chain,text:(e&&e.innerText||'').slice(0,80)}})()`).catch((e) => ({ err: String(e) })); console.log('DEBUGENTER before', JSON.stringify({ link, dbg })); }\n  await b.click(link.x, link.y);\n  for (let k = 0; k < 60; k += 1) { await sleep(250); const h = await b.ev('location.hash').catch(() => ''); if (h.includes(id) && (await edsM()).length) break; }\n  if (process.env.DEBUGENTER) { await shot(`enter-after-${Date.now() % 100000}`); console.log('DEBUGENTER after', JSON.stringify({ hash: (await b.ev('location.hash').catch(() => '')).replace(/[0-9a-f-]{36}/g, ':id'), eds: await edsM() })); }";
s = s.replace(a, b2);
fs.writeFileSync(f, s); console.log('enterThroughApp debug added');
