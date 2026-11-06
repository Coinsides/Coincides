// A THIRD corpus the builder has never seen: neighbours of each F3b fix. Built from the second-corpus script. One formula per paragraph, each with a hand-written meaning.
// Verdicts are the same as the gold check: ok or degraded are clean; anything else is the "third outcome" the order forbids.
// Usage (cwd <tree>/server): node --import tsx <this file> <tree> [outJson]
// The sample is regenerated next to this file on every run.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TREE = process.argv[2];
const HERE = dirname(fileURLToPath(import.meta.url));
const R = createRequire(`${TREE}/server/package.json`);
const JSZip = R('jszip');
const RC = createRequire(`${TREE}/client/package.json`);
const katex = RC('katex');
const { parseSourceArtifact } = await import(pathToFileURL(`${TREE}/server/src/services/sourceArtifact.ts`).href);

const WR = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:i/></w:rPr>';
const CT = `<m:ctrlPr>${WR}</m:ctrlPr>`;
const A = (id) => `w:id="${id}" w:author="a" w:date="2026-01-01T00:00:00Z"`;
const mr = (t, pr = '') => `<m:r>${pr ? `<m:rPr>${pr}</m:rPr>` : ''}${WR}<m:t xml:space="preserve">${t}</m:t></m:r>`;
const nor = (t) => mr(t, '<m:nor/>');
const f = (a, b, type) => `<m:f><m:fPr>${type ? `<m:type m:val="${type}"/>` : ''}${CT}</m:fPr><m:num>${a}</m:num><m:den>${b}</m:den></m:f>`;
const sup = (a, b) => `<m:sSup><m:sSupPr>${CT}</m:sSupPr><m:e>${a}</m:e><m:sup>${b}</m:sup></m:sSup>`;
const sub = (a, b) => `<m:sSub><m:sSubPr>${CT}</m:sSubPr><m:e>${a}</m:e><m:sub>${b}</m:sub></m:sSub>`;
const low = (b, l) => `<m:limLow><m:limLowPr>${CT}</m:limLowPr><m:e>${b}</m:e><m:lim>${l}</m:lim></m:limLow>`;
const upp = (b, l) => `<m:limUpp><m:limUppPr>${CT}</m:limUppPr><m:e>${b}</m:e><m:lim>${l}</m:lim></m:limUpp>`;
const fn = (name, e) => `<m:func><m:funcPr>${CT}</m:funcPr><m:fName>${name}</m:fName><m:e>${e}</m:e></m:func>`;
const grp = (e, chr, pos, vj) => `<m:groupChr><m:groupChrPr>${chr ? `<m:chr m:val="${chr}"/>` : ''}${pos ? `<m:pos m:val="${pos}"/>` : ''}${vj ? `<m:vertJc m:val="${vj}"/>` : ''}${CT}</m:groupChrPr><m:e>${e}</m:e></m:groupChr>`;
const d = (parts, beg, end, sep) => `<m:d><m:dPr>${beg !== undefined ? `<m:begChr m:val="${beg}"/>` : ''}${sep !== undefined ? `<m:sepChr m:val="${sep}"/>` : ''}${end !== undefined ? `<m:endChr m:val="${end}"/>` : ''}${CT}</m:dPr>${parts.map((x) => `<m:e>${x}</m:e>`).join('')}</m:d>`;
const eq = (rows) => `<m:eqArr><m:eqArrPr>${CT}</m:eqArrPr>${rows.map((x) => `<m:e>${x}</m:e>`).join('')}</m:eqArr>`;
const acc = (c, e) => `<m:acc><m:accPr>${c ? `<m:chr m:val="${c}"/>` : ''}${CT}</m:accPr><m:e>${e}</m:e></m:acc>`;
const nary = (c, a, b, e, extra = '') => `<m:nary><m:naryPr>${c ? `<m:chr m:val="${c}"/>` : ''}${extra}${CT}</m:naryPr><m:sub>${a}</m:sub><m:sup>${b}</m:sup><m:e>${e}</m:e></m:nary>`;
const om = (...x) => `<m:oMath>${x.join('')}</m:oMath>`;
const delrun = (t, id = 41) => `<m:r><w:rPr><w:del ${A(id)}/></w:rPr><m:t>${t}</m:t></m:r>`;
const insrun = (t, id = 42) => `<m:r><w:rPr><w:ins ${A(id)}/></w:rPr><m:t>${t}</m:t></m:r>`;

// [label, source as a person reads it, formula xml, gold readings]. Third corpus: neighbours of every F3b fix, unseen by the builder.
const text = (s) => `<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`;
const DS = '<m:scr m:val="double-struck"/>';
const C = [
  // Style: new positions and combinations.
  ['示性函数', 'double-struck 1 (indicator) then x', om(mr('1', DS), mr('x')), [['\\mathbb{1}x'], ['𝟙x']]],
  ['期望作底带下标', 'double-struck E with subscript x, then [f]', om(sub(mr('E', DS), mr('x')), d([mr('f')], '[', ']')), [['\\mathbb{E}_{x}[f]'], ['𝔼_{x}[f]']]],
  ['实数上标', 'R double-struck to the n', om(sup(mr('R', DS), mr('n'))), [['\\mathbb{R}^{n}'], ['ℝ^{n}']]],
  ['粗体希腊', 'beta in bold (sty b): a bold Greek symbol', om(mr('β', '<m:sty m:val="b"/>')), [['\\boldsymbol{β}'], ['\\mathbf{β}']]],
  ['粗斜体', 'x in bold italic (sty bi)', om(mr('x', '<m:sty m:val="bi"/>')), [['\\boldsymbol{x}']]],
  ['粗体两字母', 'AB in one bold run', om(mr('AB', '<m:sty m:val="b"/>')), [['\\mathbf{AB}'], ['\\mathbf{A}\\mathbf{B}']]],
  ['粗体带运算符', 'a+b in one bold run: letters bold, operator plain', om(mr('a+b', '<m:sty m:val="b"/>')), [['\\mathbf{a}+\\mathbf{b}'], ['\\mathbf{a+b}']]],
  ['无衬线', 'x in sans-serif', om(mr('x', '<m:scr m:val="sans-serif"/>')), [['\\mathsf{x}']]],
  ['等宽', 'x in monospace', om(mr('x', '<m:scr m:val="monospace"/>')), [['\\mathtt{x}']]],
  ['函数名sty p', 'sin with sty p as the function name, of x', om(fn(mr('sin', '<m:sty m:val="p"/>'), mr('x'))), [['\\sin x']]],
  ['花体作下标', 'x with script L as subscript', om(sub(mr('x'), mr('L', '<m:scr m:val="script"/>'))), [['x_{\\mathcal{L}}'], ['x_{\\mathscr{L}}'], ['x_{ℒ}']]],
  ['哥特体', 'g in fraktur', om(mr('g', '<m:scr m:val="fraktur"/>')), [['\\mathfrak{g}']]],
  ['双线体分式', 'double-struck P over n', om(f(mr('P', DS), mr('n'))), [['\\frac{\\mathbb{P}}{n}'], ['\\frac{ℙ}{n}']]],
  ['scr roman', 'x with scr roman: no style', om(mr('x', '<m:scr m:val="roman"/>')), [['x']]],
  // Tracked changes inside nested structures (Word's own shape: ctrlPr w:del plus runs in w:del).
  ['上标里分式删除', 'x to the power of a deleted fraction 1/2, with 2 inserted: x squared', om(sup(mr('x'), `<m:f><m:fPr><m:ctrlPr><w:del ${A(101)}><w:rPr/></w:del></m:ctrlPr></m:fPr><m:num><w:del ${A(102)}>${mr('1')}</w:del></m:num><m:den><w:del ${A(103)}>${mr('2')}</w:del></m:den></m:f><w:ins ${A(104)}>${mr('2')}</w:ins>`)), [['x^{2}']]],
  ['插入分式内删字', 'an inserted fraction whose numerator had a deleted then b inserted: b over c', om(`<m:f><m:fPr><m:ctrlPr><w:ins ${A(105)}><w:rPr/></w:ins></m:ctrlPr></m:fPr><m:num><w:del ${A(106)}>${mr('a')}</w:del><w:ins ${A(107)}>${mr('b')}</w:ins></m:num><m:den><w:ins ${A(108)}>${mr('c')}</w:ins></m:den></m:f>`), [['\\frac{b}{c}']]],
  ['函数结构删除', 'y= then sin x tracked deleted as a structure, then x inserted: y=x', om(mr('y='), `<m:func><m:funcPr><m:ctrlPr><w:del ${A(109)}><w:rPr/></w:del></m:ctrlPr></m:funcPr><m:fName><w:del ${A(110)}>${mr('sin')}</w:del></m:fName><m:e><w:del ${A(111)}>${mr('x')}</w:del></m:e></m:func>`, `<w:ins ${A(112)}>${mr('x')}</w:ins>`), [['y=x']]],
  ['根号结构删除', 'a then root of b tracked deleted as a structure: a', om(mr('a'), `<m:rad><m:radPr><m:degHide m:val="1"/><m:ctrlPr><w:del ${A(113)}><w:rPr/></w:del></m:ctrlPr></m:radPr><m:deg/><m:e><w:del ${A(114)}>${mr('b')}</w:del></m:e></m:rad>`), [['a']]],
  ['移走整个分式', 'a, a fraction 1/2 moved away, b, the same fraction moved in: a b 1/2', om(mr('a'), `<w:moveFrom ${A(115)}>${f(mr('1'), mr('2'))}</w:moveFrom>`, mr('b'), `<w:moveTo ${A(116)}>${f(mr('1'), mr('2'))}</w:moveTo>`), [['ab\\frac{1}{2}']]],
  ['上下标结构删除', 'x_i tracked deleted as a structure, then y inserted: y', om(`<m:sSub><m:sSubPr><m:ctrlPr><w:del ${A(117)}><w:rPr/></w:del></m:ctrlPr></m:sSubPr><m:e><w:del ${A(118)}>${mr('x')}</w:del></m:e><m:sub><w:del ${A(119)}>${mr('i')}</w:del></m:sub></m:sSub>`, `<w:ins ${A(120)}>${mr('y')}</w:ins>`), [['y']]],
  // Phantom flag values.
  ['幻影0', 'x+ then y invisible (show=0)', om(mr('x+'), `<m:phant><m:phantPr><m:show m:val="0"/></m:phantPr><m:e>${mr('y')}</m:e></m:phant>`), [['x+\\phantom{y}'], ['x+']]],
  ['幻影on', 'x+ then y shown (show=on): x+y', om(mr('x+'), `<m:phant><m:phantPr><m:show m:val="on"/></m:phantPr><m:e>${mr('y')}</m:e></m:phant>`), [['x+y']]],
  ['幻影1', 'x+ then y shown (show=1): x+y', om(mr('x+'), `<m:phant><m:phantPr><m:show m:val="1"/></m:phantPr><m:e>${mr('y')}</m:e></m:phant>`), [['x+y']]],
  ['幻影true', 'x+ then y shown (show=true): x+y', om(mr('x+'), `<m:phant><m:phantPr><m:show m:val="true"/></m:phantPr><m:e>${mr('y')}</m:e></m:phant>`), [['x+y']]],
  ['幻影矩阵0', 'matrix rows: invisible minus (show=0) then 1, and -1', om(`<m:m><m:mPr>${CT}</m:mPr><m:mr><m:e><m:phant><m:phantPr><m:show m:val="0"/></m:phantPr><m:e>${mr('-')}</m:e></m:phant>${mr('1')}</m:e></m:mr><m:mr><m:e>${mr('-1')}</m:e></m:mr></m:m>`), [['\\begin{matrix}\\phantom{-}1\\\\-1\\end{matrix}'], ['\\begin{matrix}1\\\\-1\\end{matrix}']]],
  // w:sym: other codes and spellings.
  ['符号小于等于', 'a, Symbol F0A3 (≤ in the Symbol font), b', om(mr('a'), '<m:r><w:sym w:font="Symbol" w:char="F0A3"/></m:r>', mr('b')), [['a≤b']]],
  ['符号pi', 'Symbol F070 (π) then r', om('<m:r><w:sym w:font="Symbol" w:char="F070"/></m:r>', mr('r')), [['πr']]],
  ['符号小写字体名', 'font name written in lower case: symbol F061 (α) then x', om('<m:r><w:sym w:font="symbol" w:char="F061"/></m:r>', mr('x')), [['αx']]],
  ['符号Wingdings2', 'a Wingdings 2 symbol then x: cannot be known', om('<m:r><w:sym w:font="Wingdings 2" w:char="F050"/></m:r>', mr('x')), []],
  ['符号缺码', 'w:sym in Symbol with no w:char, then x: cannot be known', om('<m:r><w:sym w:font="Symbol"/></m:r>', mr('x')), []],
  // The number sign outside an equation array is just a character.
  ['普通井号', 'the literal characters a#b in an ordinary formula', om(mr('a#b')), [['a\\#b']]],
  // A placeholder whose original characters hold a backslash-paren must not break the next real formula.
  ['占位后接公式', 'an unknown element holding \\(q\\), then the real formula x', om(`<m:zzz><m:r><m:t>\\(q\\)</m:t></m:r></m:zzz>`) + text('，然后 ') + om(mr('x')), [['x']]],
  // Boxes.
  ['方框', 'x in a plain border box', om(`<m:borderBox><m:borderBoxPr>${CT}</m:borderBoxPr><m:e>${mr('x')}</m:e></m:borderBox>`), [['\\boxed{x}']]],
  ['方框斜删', 'x in a box struck through bottom-left to top-right: cancelled', om(`<m:borderBox><m:borderBoxPr><m:strikeBLTR m:val="1"/>${CT}</m:borderBoxPr><m:e>${mr('x')}</m:e></m:borderBox>`), [['\\cancel{x}']]],
];
const body = C.map(([label, , xml]) => `<w:p>${text(`${label}：`)}${xml}${text(' 句尾')}</w:p>`).join('');
const seed = await JSZip.loadAsync(fs.readFileSync(`${HERE}/seed.docx`));
const xml0 = await seed.file('word/document.xml').async('string');
const root = xml0.match(/<w:document[^>]*>/)[0];
const decl = root.replace('>', `${root.includes('xmlns:mc=') ? '' : ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'}${root.includes('xmlns:w14=') ? '' : ' xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"'}>`);
const sect = xml0.match(/<w:sectPr.*<\/w:sectPr>/s)?.[0] ?? '';
seed.file('word/document.xml', xml0.replace(root, decl).replace(/<w:body>.*<\/w:body>/s, `<w:body>${body}${sect}</w:body>`));
const out = `${HERE}/F3-第三样本.docx`;
fs.writeFileSync(out, await seed.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

// Same reading as the gold check.
const NAMES = { '\\Delta': 'Δ', '\\alpha': 'α', '\\sigma': 'σ', '\\theta': 'θ', '\\sim': '∼', '\\to': '→', '\\rightarrow': '→', '\\infty': '∞', '\\in': '∈', '\\approx': '≈', '\\pm': '±', '\\langle': '⟨', '\\rangle': '⟩', '\\{': '{', '\\}': '}', '\\lbrace': '{', '\\rbrace': '}', '\\vert': '|', '\\lvert': '|', '\\rvert': '|', '\\mid': '|', '\\backslash': '\\', '\\textbackslash': '\\', '\\textasciicircum': '^', '\\textasciitilde': '~', '\\%': '%', '\\$': '$', '\\&': '&', '\\_': '_', '\\#': '#', '−': '-', '\\ge': '≥', '\\le': '≤', '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉', '\\|': '‖', '\\Vert': '‖', '\\lVert': '‖', '\\rVert': '‖', '\\sum': '∑', '\\llbracket': '⟦', '\\rrbracket': '⟧', '\\prime': '′', '\\beta': 'β', '\\pi': 'π', '\\leq': '≤' };
const norm = (s) => (NAMES[s] ?? s).replace(/\s+/g, '');
function canon(n) {
  if (Array.isArray(n)) return n.map(canon).join('');
  if (!n) return '';
  switch (n.type) {
    case 'phantom': case 'hphantom': case 'vphantom':
      return '';
    case 'ordgroup': case 'styling': case 'sizing': case 'text': case 'mclass': case 'color': case 'lap': case 'hbox': case 'enclose': case 'operatorname':
      return canon(n.body);
    case 'font':
      return ['mathbb', 'mathcal', 'mathscr', 'mathbf', 'boldsymbol', 'mathfrak', 'mathsf', 'mathtt'].includes(n.font) ? `${n.font}(${canon(n.body)})` : canon(n.body);
    case 'mathord': case 'textord': case 'atom': return norm(n.text);
    case 'op': return n.symbol ? norm(n.name) : n.name ? norm(n.name.replace(/^\\/, '')) : canon(n.body);
    case 'supsub': return `S[${canon(n.base)}|${canon(n.sub)}|${canon(n.sup)}]`;
    case 'genfrac': return `${n.hasBarLine ? 'F' : 'K'}[${canon(n.numer)}|${canon(n.denom)}]`;
    case 'sqrt': return `R[${canon(n.index)}|${canon(n.body)}]`;
    case 'leftright': return `${n.left === '.' ? '' : norm(n.left)}${canon(n.body)}${n.right === '.' ? '' : norm(n.right)}`;
    case 'accent': return `A[${String(n.label).replace(/^\\/, '').replace('widehat', 'hat').replace('overrightarrow', 'vec').replace('bar', 'overline')}|${canon(n.base)}]`;
    case 'overline': return `A[overline|${canon(n.body)}]`;
    case 'underline': return `U[${canon(n.body)}]`;
    case 'horizBrace': return `B[${n.isOver ? 'over' : 'under'}|${canon(n.base)}]`;
    case 'array': return `M[${n.body.map((row) => row.map(canon).join('')).join(';')}]`;
    case 'spacing': case 'kern': return '';
    default: return `${n.type}[${canon(n.body)}]`;
  }
}
const reading = (l) => canon(katex.__parse(l, { throwOnError: true, strict: 'ignore', displayMode: true }));
const a = await parseSourceArtifact({ parser_key: 'native-docx', parser_version: 'x', file_path: out, original_filename: 'x.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
const speaks = (a.metadata.parser_messages || []).length > 0;
const tally = { ok: 0, degraded: 0, EYE: 0, WRONG: 0, INVALID: 0, MISSING: 0 };
const rows = [];
for (const [label, source, , gold] of C) {
  const block = a.blocks.find((b) => b.text.startsWith(`${label}：`));
  let verdict; let note = '';
  if (!block) verdict = 'MISSING';
  else {
    const t = block.text.slice(label.length + 1);
    const segs = [...t.matchAll(/\\\(([\s\S]*?)\\\)/g)].map((m) => m[1]);
    if (/未能转换/.test(t) && !segs.length) verdict = speaks ? 'degraded' : 'WRONG';
    else {
      try {
        const mine = segs.map(reading);
        const golds = gold.map((g) => g.map(reading));
        const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
        const shape = (s) => [...s].sort().join('');
        const exact = golds.some((g) => same(mine, g));
        const close = golds.some((g) => g.length === mine.length && g.every((v, i) => shape(v) === shape(mine[i])));
        verdict = exact ? 'ok' : close ? 'EYE' : 'WRONG';
        if (verdict !== 'ok') note = `reads ${JSON.stringify(mine)}${golds[0] ? `; gold ${JSON.stringify(golds[0])}` : '; should have said it could not convert'}`;
      } catch (e) { verdict = 'INVALID'; note = String(e.message).slice(0, 90); }
    }
  }
  tally[verdict] += 1;
  rows.push({ label, source, verdict, text: block?.text, note });
  if (!['ok', 'degraded'].includes(verdict)) console.log(`${verdict.padEnd(8)} ${label}: ${block?.text?.slice(0, 120) ?? ''}\n         source: ${source}\n         ${note}`);
}
console.log('\nmessages:', JSON.stringify((a.metadata.parser_messages || []).map((m) => m.message.slice(0, 80))));
console.log('degraded:', rows.filter((r) => r.verdict === 'degraded').map((r) => `${r.label}=${r.text}`).join(' | ').slice(0, 1400));
console.log('\n', JSON.stringify(tally));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ tally, rows, messages: a.metadata.parser_messages }, null, 1));
