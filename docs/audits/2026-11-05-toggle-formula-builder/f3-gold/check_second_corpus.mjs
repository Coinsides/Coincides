// A second corpus the builder has never seen, aimed at overfitting. One formula per paragraph, each with a hand-written meaning.
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

// [label, source as a person reads it, formula xml, gold readings, refuseOnly?]
const C = [
  // Limits and stacks: the family that flattened.
  ['max文本基底', 'max over x of f, with max set as normal text', om(fn(low(nor('max'), mr('x')), mr('f'))), [['\\underset{x}{max}f']]],
  ['argmax集合', 'argmax over x∈X of f(x)', om(fn(low(mr('argmax'), mr('x∈X')), mr('f(x)'))), [['\\underset{x∈X}{argmax}f(x)']]],
  ['基底带下标', 'x_i with y stacked below', om(low(sub(mr('x'), mr('i')), mr('y'))), [['\\underset{y}{x_{i}}']]],
  ['上下都堆', 'A with a below and b above', om(upp(low(mr('A'), mr('a')), mr('b'))), [['\\overset{b}{\\underset{a}{A}}']]],
  ['箭头标注', 'an arrow with r stacked above, between x and y (groupChr chr is the arrow, base is r)', om(mr('x'), grp(mr('r'), '→', 'top', 'bot'), mr('y')), [['x\\overset{r}{→}y'], ['x\\xrightarrow{r}y']]],
  ['约等标注', '≈ with n→∞ stacked below', om(mr('a'), low(mr('≈'), mr('n→∞')), mr('b')), [['a\\underset{n→∞}{≈}b']]],
  ['期望下标', 'E with x∼p stacked below, of f', om(low(mr('E'), mr('x∼p')), d([mr('f')], '[', ']')), [['\\underset{x∼p}{E}[f]']]],
  ['上括号标签', 'a+b over a brace labelled n', om(upp(grp(mr('a+b'), '⏞', 'top'), mr('n'))), [['\\overbrace{a+b}^{n}'], ['\\overset{n}{\\overbrace{a+b}}']]],
  ['下括号带字', 'a+b under a brace labelled 共n项', om(low(grp(mr('a+b'), '⏟', 'bot'), nor('共n项'))), [['\\underbrace{a+b}_{\\text{共n项}}'], ['\\underset{\\text{共n项}}{\\underbrace{a+b}}']]],
  // Tracked changes, in the shape where the mark sits inside the run's properties.
  ['修订在rPr', 'x= then run 2 marked deleted in its own w:rPr, then run 3 marked inserted: final x=3', om(mr('x='), delrun('2'), insrun('3')), [['x=3']]],
  ['分母修订rPr', '1 over 3, a run 2 in the denominator is marked deleted in w:rPr', om(f(mr('1'), delrun('2', 43) + insrun('3', 44))), [['\\frac{1}{3}']]],
  ['修订Word形状', 'x= then a run holding w:del around its text, then a run holding w:ins: final x=3 (shape reported from Word Compare)', om(mr('x='), `<m:r><w:del ${A(61)}><w:rPr/><m:t>2</m:t></w:del></m:r>`, `<m:r><w:ins ${A(62)}><w:rPr/><m:t>3</m:t></w:ins></m:r>`), [['x=3']]],
  ['修订Word形状分母', '1 over 3, the 2 in the denominator deleted in that shape', om(f(mr('1'), `<m:r><w:del ${A(63)}><w:rPr/><m:t>2</m:t></w:del></m:r><m:r><w:ins ${A(64)}><w:rPr/><m:t>3</m:t></w:ins></m:r>`)), [['\\frac{1}{3}']]],
  ['修订标记空元素', 'x= then a run with an empty w:del marker before its text', om(mr('x='), `<m:r><w:del ${A(65)}/><m:t>2</m:t></m:r>`, mr('3')), [['x=3'], ['x=23']]],
  ['修订delText', 'x= then a deleted run stored as w:delText, then 3', om(mr('x='), '<m:r><w:delText>2</w:delText></m:r>', mr('3')), [['x=3']]],
  ['结构删除真形状', 'a, then a fraction deleted: its ctrlPr holds w:del and its runs sit in w:del wrappers: final a', om(mr('a'), `<m:f><m:fPr><m:ctrlPr><w:del ${A(66)}><w:rPr/></w:del></m:ctrlPr></m:fPr><m:num><w:del ${A(67)}>${mr('1')}</w:del></m:num><m:den><w:del ${A(68)}>${mr('2')}</w:del></m:den></m:f>`), [['a']]],
  ['结构插入真形状', 'a, then a fraction inserted with ctrlPr w:ins: final a and 1/2', om(mr('a'), `<m:f><m:fPr><m:ctrlPr><w:ins ${A(69)}><w:rPr/></w:ins></m:ctrlPr></m:fPr><m:num><w:ins ${A(70)}>${mr('1')}</w:ins></m:num><m:den><w:ins ${A(71)}>${mr('2')}</w:ins></m:den></m:f>`), [['a\\frac{1}{2}']]],
  ['根号内被删', 'root of x, with the x tracked deleted and y inserted: root of y', om(`<m:rad><m:radPr><m:degHide m:val="1"/>${CT}</m:radPr><m:deg/><m:e><w:del ${A(72)}>${mr('x')}</w:del><w:ins ${A(73)}>${mr('y')}</w:ins></m:e></m:rad>`), [['\\sqrt{y}']]],
  ['整个分式删除', 'a, then a whole fraction tracked deleted: final a', om(mr('a'), `<w:del ${A(45)}>${f(mr('1'), mr('2'))}</w:del>`), [['a']]],
  ['结构标记删除', 'a, then a fraction whose control and runs are all marked deleted in rPr: final a', om(mr('a'), `<m:f><m:fPr><m:ctrlPr><w:rPr><w:del ${A(46)}/></w:rPr></m:ctrlPr></m:fPr><m:num>${delrun('1', 47)}</m:num><m:den>${delrun('2', 48)}</m:den></m:f>`), [['a']]],
  ['移走移入', 'moved-away b and moved-in c: final ac', om(mr('a'), `<w:moveFrom ${A(49)}>${mr('b')}</w:moveFrom>`, `<w:moveTo ${A(50)}>${mr('c')}</w:moveTo>`), [['ac']]],
  // w:sym beyond the sample's one symbol.
  ['符号alpha', 'α then x', om('<m:r><w:sym w:font="Symbol" w:char="F061"/></m:r>', mr('x')), [['αx']]],
  ['符号加减', 'a ± b', om(mr('a'), '<m:r><w:sym w:font="Symbol" w:char="F0B1"/></m:r>', mr('b')), [['a±b']]],
  ['符号求和', '∑ then x', om('<m:r><w:sym w:font="Symbol" w:char="F0E5"/></m:r>', mr('x')), [['∑x'], ['\\sum x']]],
  ['符号无F0前缀', 'Δx with w:char 0044', om('<m:r><w:sym w:font="Symbol" w:char="0044"/></m:r>', mr('x')), [['Δx']]],
  ['符号Wingdings', 'a symbol from Wingdings then x: cannot be known', om('<m:r><w:sym w:font="Wingdings" w:char="F0E0"/></m:r>', mr('x')), []],
  ['符号MTExtra', 'a symbol from MT Extra then x: cannot be known', om('<m:r><w:sym w:font="MT Extra" w:char="F025"/></m:r>', mr('x')), []],
  ['式内不换行连字符', 'a, a no-break hyphen, b', om(`<m:r><m:t>a</m:t><w:noBreakHyphen/><m:t>b</m:t></m:r>`), [['a-b'], ['a‑b']]],
  ['式内图片', 'x with a picture in the run: the picture cannot be text', om(`<m:r><w:drawing/><m:t>x</m:t></m:r>`), []],
  // Line breaks and alignment, in Word's own marks.
  ['同run换行', 'a=b, a break, c=d inside one run', om('<m:r><m:t>a=b</m:t><w:br/><m:t>c=d</m:t></m:r>'), [['a=b', 'c=d'], ['\\begin{aligned}a=b\\\\c=d\\end{aligned}']]],
  ['分子里换行', 'a break inside a numerator: a then b over c', om(f('<m:r><m:t>a</m:t><w:br/><m:t>b</m:t></m:r>', mr('c'))), []],
  ['算符断行brk', 'a=b with m:brk on the =: same formula', om(mr('a'), mr('=', '<m:brk/>'), mr('b')), [['a=b'], ['a', '=b']]],
  ['对齐aln', 'two rows aligned with m:aln on =', om(eq([mr('x') + mr('=', '<m:aln/>') + mr('1'), mr('y') + mr('=', '<m:aln/>') + mr('2')])), [['\\begin{aligned}x=1\\\\y=2\\end{aligned}'], ['\\begin{aligned}x&=1\\\\y&=2\\end{aligned}']]],
  ['三行方程组', 'open brace over 3 rows', om(d([eq([mr('x=1'), mr('y=2'), mr('z=3')])], '{', '')), [['\\left\\{\\begin{aligned}x=1\\\\y=2\\\\z=3\\end{aligned}\\right.'], ['\\begin{cases}x=1\\\\y=2\\\\z=3\\end{cases}']]],
  ['普通与号', 'a literal & outside any array: a&b', om(mr('a&amp;b')), [['a\\&b']]],
  // Fractions.
  ['线性单字', 'a/b linear, single atoms', om(f(mr('a'), mr('b'), 'lin')), [['a/b'], ['\\frac{a}{b}']]],
  ['线性带前缀', '2 then (a+b)/c linear', om(mr('2'), f(mr('a+b'), mr('c'), 'lin')), [['2(a+b)/c'], ['2\\frac{a+b}{c}']]],
  ['斜分式含分式', 'skewed fraction of (1/2) over x', om(f(f(mr('1'), mr('2')), mr('x'), 'skw')), [['\\frac{\\frac{1}{2}}{x}'], ['\\frac{1}{2}/x'], ['(\\frac{1}{2})/x']]],
  ['二项式', 'n choose k, parenthesised no-bar', om(d([f(mr('n'), mr('k'), 'noBar')])), [['({n \\atop k})'], ['\\binom{n}{k}']]],
  // Functions.
  ['三角平方', 'sin² x', om(fn(sup(mr('sin'), mr('2')), mr('x'))), [['{\\sin}^{2}x'], ['\\sin^{2}x']]],
  ['函数含分式', 'ln of (a/b)', om(fn(mr('ln'), d([f(mr('a'), mr('b'))]))), [['\\ln(\\frac{a}{b})']]],
  ['大写函数', 'Cov(x,y)', om(fn(mr('Cov'), d([mr('x'), mr('y')], '(', ')', ','))), [['\\operatorname{Cov}(x,y)']]],
  // N-ary.
  ['隐藏上限', 'sum over i of x_i, sup hidden', om(`<m:nary><m:naryPr><m:chr m:val="∑"/><m:supHide m:val="1"/>${CT}</m:naryPr><m:sub>${mr('i')}</m:sub><m:sup/><m:e>${sub(mr('x'), mr('i'))}</m:e></m:nary>`), [['\\sum_{i}x_{i}']]],
  ['并集', 'union i..n of A', om(nary('⋃', mr('i'), mr('n'), mr('A'))), [['\\bigcup_{i}^{n}A']]],
  ['直和', 'direct sum i..n of A, chr not common', om(nary('⨁', mr('i'), mr('n'), mr('A'))), [['\\bigoplus_{i}^{n}A'], ['⨁_{i}^{n}A']]],
  // Accents.
  ['撇号', 'x prime as sup', om(sup(mr('x'), mr('′'))), [['x^{′}'], ["x'"]]],
  ['间隔上横', 'x with U+00AF', om(acc('¯', mr('x'))), [['\\bar{x}'], ['\\overline{x}']]],
  ['宽帽', 'x+y with a hat', om(acc('̂', mr('x+y'))), [['\\hat{x+y}'], ['\\widehat{x+y}']]],
  ['未知重音', 'x with U+0361 above: unusual', om(acc('͡', mr('x'))), []],
  // Delimiters.
  ['取整', '⌊x⌋', om(d([mr('x')], '⌊', '⌋')), [['\\lfloor x\\rfloor']]],
  ['上取整后接字母', '⌈x⌉y', om(d([mr('x')], '⌈', '⌉'), mr('y')), [['\\lceil x\\rceil y']]],
  ['半开区间', '(a,b]', om(d([mr('a'), mr('b')], '(', ']', ',')), [['(a,b]']]],
  ['范数', '‖x‖', om(d([mr('x')], '‖', '‖')), [['\\|x\\|']]],
  ['分号分隔', '(a;b)', om(d([mr('a'), mr('b')], '(', ')', ';')), [['(a;b)']]],
  ['双括号', '⟦x⟧', om(d([mr('x')], '⟦', '⟧')), [['\\llbracket x\\rrbracket']]],
  // Style that carries meaning.
  ['双线体', 'R in double-struck: the reals', om(mr('R', '<m:scr m:val="double-struck"/>')), [['\\mathbb{R}'], ['ℝ']]],
  ['花体', 'L in script', om(mr('L', '<m:scr m:val="script"/>')), [['\\mathcal{L}'], ['\\mathscr{L}'], ['ℒ']]],
  ['黑体向量', 'x bold', om(mr('x', '<m:sty m:val="b"/>')), [['\\mathbf{x}'], ['\\boldsymbol{x}'], ['x']]],
  ['实数符号', 'x ∈ ℝ', om(mr('x∈ℝ')), [['x∈ℝ'], ['x\\in\\mathbb{R}']]],
  ['数学斜体字符', 'U+1D465 math italic x squared', om(sup(mr('𝑥'), mr('2'))), [['𝑥^{2}'], ['x^{2}']]],
  // Text inside formulas.
  ['文本百分号', 'the normal-text run 收益率%', om(nor('收益率%')), [['\\text{收益率\\%}']]],
  ['文本下划线', 'the normal-text run a_b', om(nor('a_b')), [['\\text{a\\_b}']]],
  ['文本反斜杠', 'the normal-text run a\\b', om(nor('a\\b')), [['\\text{a\\textbackslash b}']]],
  ['文本尖帽', 'the normal-text run a^b', om(nor('a^b')), [['\\text{a\\textasciicircum b}']]],
  ['连续两帽', 'literal characters a^^b', om(mr('a^^b')), [['a\\text{\\textasciicircum}\\text{\\textasciicircum}b']]],
  ['结尾尖帽', 'literal characters x^', om(mr('x^')), [['x\\text{\\textasciicircum}']]],
  // Flags that decide what is visible.
  ['幻影off', 'matrix rows: an invisible minus then 1, and -1. Reads 1 over -1', om(`<m:m><m:mPr>${CT}</m:mPr><m:mr><m:e><m:phant><m:phantPr><m:show m:val="off"/></m:phantPr><m:e>${mr('-')}</m:e></m:phant>${mr('1')}</m:e></m:mr><m:mr><m:e>${mr('-1')}</m:e></m:mr></m:m>`), [['\\begin{matrix}\\phantom{-}1\\\\-1\\end{matrix}'], ['\\begin{matrix}1\\\\-1\\end{matrix}']]],
  ['幻影false', 'x+ then y invisible (show=false). Reads x+', om(mr('x+'), `<m:phant><m:phantPr><m:show m:val="false"/></m:phantPr><m:e>${mr('y')}</m:e></m:phant>`), [['x+\\phantom{y}'], ['x+']]],
  ['根号隐藏次数', 'degHide on, with 3 still in deg. Reads root of x', om(`<m:rad><m:radPr><m:degHide m:val="1"/>${CT}</m:radPr><m:deg>${mr('3')}</m:deg><m:e>${mr('x')}</m:e></m:rad>`), [['\\sqrt{x}']]],
  ['求和隐藏上限有内容', 'supHide on, with n still in sup. Reads sum over i of x', om(`<m:nary><m:naryPr><m:chr m:val="∑"/><m:supHide m:val="1"/>${CT}</m:naryPr><m:sub>${mr('i')}</m:sub><m:sup>${mr('n')}</m:sup><m:e>${mr('x')}</m:e></m:nary>`), [['\\sum_{i}x']]],
  ['Symbol字体文本', 'a normal-text run in Symbol font holding a+b. Reads α+β', om(`<m:r><m:rPr><m:nor/></m:rPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr><m:t>a+b</m:t></m:r>`), [['α+β']]],
  ['符号非F0码', 'a, w:sym Symbol 2264, b. The code means ≤', om(mr('a'), '<m:r><w:sym w:font="Symbol" w:char="2264"/></m:r>', mr('b')), [['a≤b']]],
  ['分式结构删除求和', 'y= then a sum tracked deleted through ctrlPr, then x inserted. Reads y=x', om(mr('y='), `<m:nary><m:naryPr><m:chr m:val="∑"/><m:ctrlPr><w:del ${A(81)}><w:rPr/></w:del></m:ctrlPr></m:naryPr><m:sub><w:del ${A(82)}>${mr('i')}</w:del></m:sub><m:sup/><m:e><w:del ${A(83)}>${mr('x')}</w:del></m:e></m:nary>`, `<w:ins ${A(84)}>${mr('x')}</w:ins>`), [['y=x']]],
  ['公式编号', 'E=mc² with a right-flushed (1): the # is the numbering mark and is not visible', om(`<m:eqArr><m:eqArrPr><m:maxDist m:val="1"/>${CT}</m:eqArrPr><m:e>${mr('E=mc²#')}${mr('(1)')}</m:e></m:eqArr>`), [['\\begin{aligned}E=mc²(1)\\end{aligned}'], ['E=mc²(1)']]],
  ['粗体大写', 'bold X then X: two different symbols', om(mr('X', '<m:sty m:val="b"/>'), mr('=X')), [['\\mathbf{X}=X'], ['\\boldsymbol{X}=X']]],
  ['期望双线', 'E in double-struck then [x]', om(mr('E', '<m:scr m:val="double-struck"/>'), d([mr('x')], '[', ']')), [['\\mathbb{E}[x]'], ['𝔼[x]']]],
  // Empty slots.
  ['空分母', '1 over nothing', om(f(mr('1'), '')), [['\\frac{1}{}']]],
  ['空根号', 'root of nothing', om(`<m:rad><m:radPr><m:degHide m:val="1"/>${CT}</m:radPr><m:deg/><m:e/></m:rad>`), [['\\sqrt{}']]],
  // Not in OMML at all: unknown must speak.
  ['未知结构', 'an element nobody knows, holding q', om('<m:zzz><m:r><m:t>q</m:t></m:r></m:zzz>'), []],
  ['未知结构带值', 'a fraction with an unknown child holding z', om(`<m:f><m:zzz><m:r><m:t>z</m:t></m:r></m:zzz><m:num>${mr('1')}</m:num><m:den>${mr('2')}</m:den></m:f>`), []],
  ['式内替代内容', 'mc:AlternateContent inside a formula with the same text in both branches', om(mr('a'), `<mc:AlternateContent><mc:Choice Requires="w14">${mr('b')}</mc:Choice><mc:Fallback>${mr('b')}</mc:Fallback></mc:AlternateContent>`), [['ab']]],
];
const text = (s) => `<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`;
const body = C.map(([label, , xml]) => `<w:p>${text(`${label}：`)}${xml}${text(' 句尾')}</w:p>`).join('');
const seed = await JSZip.loadAsync(fs.readFileSync(`${HERE}/seed.docx`));
const xml0 = await seed.file('word/document.xml').async('string');
const root = xml0.match(/<w:document[^>]*>/)[0];
const decl = root.replace('>', `${root.includes('xmlns:mc=') ? '' : ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'}${root.includes('xmlns:w14=') ? '' : ' xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"'}>`);
const sect = xml0.match(/<w:sectPr.*<\/w:sectPr>/s)?.[0] ?? '';
seed.file('word/document.xml', xml0.replace(root, decl).replace(/<w:body>.*<\/w:body>/s, `<w:body>${body}${sect}</w:body>`));
const out = `${HERE}/F3-新样本.docx`;
fs.writeFileSync(out, await seed.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

// Same reading as the gold check.
const NAMES = { '\\Delta': 'Δ', '\\alpha': 'α', '\\sigma': 'σ', '\\theta': 'θ', '\\sim': '∼', '\\to': '→', '\\rightarrow': '→', '\\infty': '∞', '\\in': '∈', '\\approx': '≈', '\\pm': '±', '\\langle': '⟨', '\\rangle': '⟩', '\\{': '{', '\\}': '}', '\\lbrace': '{', '\\rbrace': '}', '\\vert': '|', '\\lvert': '|', '\\rvert': '|', '\\mid': '|', '\\backslash': '\\', '\\textbackslash': '\\', '\\textasciicircum': '^', '\\textasciitilde': '~', '\\%': '%', '\\$': '$', '\\&': '&', '\\_': '_', '\\#': '#', '−': '-', '\\ge': '≥', '\\le': '≤', '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉', '\\|': '‖', '\\Vert': '‖', '\\lVert': '‖', '\\rVert': '‖', '\\sum': '∑', '\\llbracket': '⟦', '\\rrbracket': '⟧', '\\prime': '′' };
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
      return ['mathbb', 'mathcal', 'mathscr', 'mathbf', 'boldsymbol', 'mathfrak'].includes(n.font) ? `${n.font}(${canon(n.body)})` : canon(n.body);
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
