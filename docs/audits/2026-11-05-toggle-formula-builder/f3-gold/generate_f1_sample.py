# F1 verification corpus: every OMML construct the order names, in the shapes Word writes, plus the awkward placements.
import importlib.util, os, zipfile

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('g', os.path.join(base, 'gen_docx_r04.py'))
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
NS, r, p = g.NS, g.r, g.p
OUT = os.path.join(base, 'verify-v1f1', 'docs')
os.makedirs(OUT, exist_ok=True)
WRPR = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:i/></w:rPr>'
CTRL = f'<m:ctrlPr>{WRPR}</m:ctrlPr>'
A = 'w:id="{}" w:author="a" w:date="2026-01-01T00:00:00Z"'


def mr(t, nor=False):
    rp = '<m:rPr><m:nor/></m:rPr>' if nor else ''
    return f'<m:r>{rp}{WRPR}<m:t xml:space="preserve">{t}</m:t></m:r>'


def f(a, b, typ=None):
    t = f'<m:type m:val="{typ}"/>' if typ else ''
    return f'<m:f><m:fPr>{t}{CTRL}</m:fPr><m:num>{a}</m:num><m:den>{b}</m:den></m:f>'


def sup(a, b):
    return f'<m:sSup><m:sSupPr>{CTRL}</m:sSupPr><m:e>{a}</m:e><m:sup>{b}</m:sup></m:sSup>'


def sub(a, b):
    return f'<m:sSub><m:sSubPr>{CTRL}</m:sSubPr><m:e>{a}</m:e><m:sub>{b}</m:sub></m:sSub>'


def subsup(a, b, c):
    return f'<m:sSubSup><m:sSubSupPr>{CTRL}</m:sSubSupPr><m:e>{a}</m:e><m:sub>{b}</m:sub><m:sup>{c}</m:sup></m:sSubSup>'


def pre(a, b, c):
    return f'<m:sPre><m:sPrePr>{CTRL}</m:sPrePr><m:sub>{b}</m:sub><m:sup>{c}</m:sup><m:e>{a}</m:e></m:sPre>'


def rad(e, deg=None):
    if deg is None:
        return f'<m:rad><m:radPr><m:degHide m:val="1"/>{CTRL}</m:radPr><m:deg/><m:e>{e}</m:e></m:rad>'
    return f'<m:rad><m:radPr>{CTRL}</m:radPr><m:deg>{deg}</m:deg><m:e>{e}</m:e></m:rad>'


def nary(ch, a, b, e):
    c = f'<m:chr m:val="{ch}"/>' if ch else ''
    return f'<m:nary><m:naryPr>{c}<m:limLoc m:val="undOvr"/>{CTRL}</m:naryPr><m:sub>{a}</m:sub><m:sup>{b}</m:sup><m:e>{e}</m:e></m:nary>'


def d(parts, beg=None, end=None, sep=None):
    pr = ''.join([
        f'<m:begChr m:val="{beg}"/>' if beg is not None else '',
        f'<m:sepChr m:val="{sep}"/>' if sep is not None else '',
        f'<m:endChr m:val="{end}"/>' if end is not None else '',
    ])
    return f'<m:d><m:dPr>{pr}{CTRL}</m:dPr>' + ''.join(f'<m:e>{x}</m:e>' for x in parts) + '</m:d>'


def func(n, e):
    return f'<m:func><m:funcPr>{CTRL}</m:funcPr><m:fName>{mr(n)}</m:fName><m:e>{e}</m:e></m:func>'


def lim(n, low, e, up=False):
    t = 'limUpp' if up else 'limLow'
    return f'<m:func><m:funcPr>{CTRL}</m:funcPr><m:fName><m:{t}><m:{t}Pr>{CTRL}</m:{t}Pr><m:e>{mr(n)}</m:e><m:lim>{low}</m:lim></m:{t}></m:fName><m:e>{e}</m:e></m:func>'


def mat(rows):
    b = ''.join('<m:mr>' + ''.join(f'<m:e>{c}</m:e>' for c in row) + '</m:mr>' for row in rows)
    return f'<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="{len(rows[0])}"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs>{CTRL}</m:mPr>{b}</m:m>'


def eq(rows):
    return f'<m:eqArr><m:eqArrPr>{CTRL}</m:eqArrPr>' + ''.join(f'<m:e>{x}</m:e>' for x in rows) + '</m:eqArr>'


def acc(c, e):
    x = f'<m:chr m:val="{c}"/>' if c else ''
    return f'<m:acc><m:accPr>{x}{CTRL}</m:accPr><m:e>{e}</m:e></m:acc>'


def bar(e, pos=None):
    x = f'<m:pos m:val="{pos}"/>' if pos else ''
    return f'<m:bar><m:barPr>{x}{CTRL}</m:barPr><m:e>{e}</m:e></m:bar>'


def grp(e, c=None, pos=None):
    x = (f'<m:chr m:val="{c}"/>' if c else '') + (f'<m:pos m:val="{pos}"/>' if pos else '')
    return f'<m:groupChr><m:groupChrPr>{x}{CTRL}</m:groupChrPr><m:e>{e}</m:e></m:groupChr>'


def box(e, t='box'):
    return f'<m:{t}><m:{t}Pr>{CTRL}</m:{t}Pr><m:e>{e}</m:e></m:{t}>'


def om(*x):
    return '<m:oMath>' + ''.join(x) + '</m:oMath>'


def para(*x):
    return '<m:oMathPara><m:oMathParaPr><m:jc m:val="centerGroup"/></m:oMathParaPr>' + ''.join(om(i) for i in x) + '</m:oMathPara>'


def text(t):
    return f'<w:r><w:t xml:space="preserve">{t}</w:t></w:r>'


def line(label, *x):
    return f'<w:p>{text(label + "：")}{om(*x)}{text(" 句尾。")}</w:p>'


x, y, n, i = mr('x'), mr('y'), mr('n'), mr('i')
rows = [
    ('分式', f(mr('C'), mr('i'))),
    ('嵌套分式', f(mr('1'), f(mr('1'), mr('1+x')))),
    ('线性分式', f(x, y, 'lin')),
    ('斜分式', f(x, y, 'skw')),
    ('无线分式', f(x, y, 'noBar')),
    ('上标', sup(x, mr('2'))),
    ('下标', sub(x, i)),
    ('上下标', subsup(x, i, mr('2'))),
    ('前置', pre(x, i, n)),
    ('根号', rad(sup(mr('σ'), mr('2')))),
    ('n次根', rad(x, n)),
    ('求和', nary('∑', mr('t=1'), mr('T'), f(sub(mr('C'), mr('t')), sup(d([mr('1+i')]), mr('t'))))),
    ('默认积分', nary(None, mr('0'), mr('1'), mr('x dx'))),
    ('连乘', nary('∏', i, n, x)),
    ('环积分', nary('∮', mr('C'), mr(''), x)),
    ('圆括号', d([x])),
    ('方括号', d([x], '[', ']')),
    ('花括号', d([x], '{', '}')),
    ('绝对值', d([x], '|', '|')),
    ('条件概率', d([x, y], '(', ')', '|')),
    ('尖括号', d([x], '⟨', '⟩')),
    ('单边', d([mr('x²,x≥0')], '{', '')),
    ('函数', func('sin', mr('θ'))),
    ('对数', func('ln', x)),
    ('自定义函数', func('Var', x)),
    ('极限', lim('lim', mr('n→∞'), sup(d([mr('1+') + f(mr('1'), n)]), n))),
    ('上极限', lim('max', mr('x'), y, True)),
    ('矩阵', d([mat([[mr('σ₁²'), mr('ρσ₁σ₂')], [mr('ρσ₁σ₂'), mr('σ₂²')]])], '[', ']')),
    ('方程组', d([eq([mr('x+y=1'), mr('x−y=0')])], '{', '')),
    ('帽', acc('̂', mr('β'))),
    ('默认帽', acc(None, mr('β'))),
    ('波浪', acc('̃', mr('θ'))),
    ('上横线acc', acc('̅', x)),
    ('向量', acc('⃗', mr('v'))),
    ('箭头acc', acc('→', mr('v'))),
    ('点', acc('̇', x)),
    ('上横线bar', bar(x, 'top')),
    ('下横线bar显式', bar(x, 'bot')),
    ('下横线bar无pos', bar(x)),
    ('下括号组', grp(mr('a+b'))),
    ('上括号组', grp(mr('a+b'), '⏞', 'top')),
    ('箭头组', grp(mr('a'), '→', 'top')),
    ('box', box(x)),
    ('borderBox', box(x, 'borderBox')),
    ('phant', box(x, 'phant')),
    ('普通文本', mr('收益率', True), mr('='), f(mr('净利润', True), mr('总资产', True))),
    ('希腊与符号', mr('α β γ ≤ ≥ ≠ ≈ ∈ ∉ ⊂ ∪ ∩ ∞ ∇ ∂ ∀ ∃ ⇒ ⇔')),
    ('特殊字符', mr('50% + $100 &amp; a_b #1 {c} \\d &lt;e&gt; ^f ~g')),
    ('空底', sup(mr(''), mr('2'))),
]
body = [p(r('F1 全结构'))]
for row in rows:
    body.append(line(row[0], *row[1:]))
del_a, del_b, ins_a = A.format(2), A.format(3), A.format(5)
body += [
    f'<w:p>{text("一段两式：")}{om(x)}{text(" 与 ")}{om(y)}{text("。")}</w:p>',
    f'<w:p>{text("Henry 路径：PV = ")}{om(f(mr("C"), mr("i")))}{text(" = 面值。")}</w:p>',
    f'<w:p>{para(f(mr("a"), mr("b")), mr("c=d"))}</w:p>',
    f'<w:p>{text("段内独立式前：")}{para(mr("E=mc²"))}{text("段内独立式后。")}</w:p>',
    om(mr('正文直挂式')),
    para(mr('正文直挂独立式')),
    f'<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr><w:p>{text("表内：")}{om(mr("tableformula"))}</w:p></w:tc></w:tr></w:tbl>',
    f'<w:p><w:hyperlink r:id="rIdLink">{text("链接内：")}{om(mr("linkformula"))}</w:hyperlink></w:p>',
    f'<w:p><w:sdt><w:sdtPr/><w:sdtContent>{text("控件内：")}{om(mr("sdtformula"))}</w:sdtContent></w:sdt></w:p>',
    f'<w:p><w:ins {A.format(1)}>{om(mr("insertedformula"))}</w:ins></w:p>',
    f'<w:p>{text("删除的式子不应出现：")}<w:del {del_a}>{om(mr("deletedformula"))}</w:del>{text("。")}</w:p>',
    f'<w:p>{text("式内修订：")}<m:oMath>{mr("keep")}<w:del {del_b}><m:r><m:t>gone</m:t></m:r></w:del><w:ins {ins_a}>{mr("added")}</w:ins></m:oMath></w:p>',
    f'<w:p>{text("空公式：")}<m:oMath/>{text("。")}</w:p>',
    f'<w:p>{text("正文里的美元 $100 和式子 ")}{om(x)}{text(" 同行。")}</w:p>',
    p(r('末句：全结构到此。')),
    g.PORTRAIT,
]
rels = g.DOC_RELS.replace('</Relationships>', '<Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/" TargetMode="External"/></Relationships>')


def write(name, parts):
    out = os.path.join(OUT, name)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', g.CT)
        z.writestr('_rels/.rels', g.RELS)
        z.writestr('word/_rels/document.xml.rels', rels)
        z.writestr('word/styles.xml', g.STYLES)
        z.writestr('word/numbering.xml', g.NUMBERING)
        z.writestr('word/footer1.xml', g.FOOTER)
        z.write(g.PNG, 'word/media/image1.png')
        z.writestr('word/document.xml', f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {NS}><w:body>{"".join(parts)}</w:body></w:document>')
    print(name, os.path.getsize(out))


write('F1-全结构.docx', body)
# Banner matrix (F2): style-only messages must go quiet, lost content must still speak.
write('F2-仅样式告警.docx', [
    p(r('样式告警样本')),
    '<w:p><w:pPr><w:pStyle w:val="NoSuchPara"/></w:pPr><w:r><w:rPr><w:rStyle w:val="NoSuchRun"/></w:rPr><w:t>段落与字符样式都未定义。</w:t></w:r></w:p>',
    '<w:tbl><w:tblPr><w:tblStyle w:val="NoSuchTable"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>表样式未定义。</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    p(r('末句。')),
    g.PORTRAIT,
])
write('F2-纯公式.docx', [
    p(r('纯公式样本')),
    f'<w:p>{text("PV = ")}{om(f(mr("C"), mr("i")))}{text(" = 面值")}</w:p>',
    f'<w:p>{para(nary("∑", mr("t=1"), mr("T"), x))}</w:p>',
    g.PORTRAIT,
])
write('F2-公式加丢字.docx', [
    p(r('公式和真丢字并存')),
    '<w:p><w:fldSimple w:instr="AUTHOR"><w:r><w:t>域里的字</w:t></w:r></w:fldSimple></w:p>',
    f'<w:p>{om(x)}</w:p>',
    g.PORTRAIT,
])
write('F2-样式加丢字.docx', [
    p(r('样式和真丢字并存')),
    '<w:p><w:pPr><w:pStyle w:val="NoSuchPara"/></w:pPr><w:r><w:t>未定义样式段。</w:t></w:r></w:p>',
    '<w:p><w:r><w:ruby><w:rubyPr/><w:rt><w:r><w:t>zhu</w:t></w:r></w:rt><w:rubyBase><w:r><w:t>注</w:t></w:r></w:rubyBase></w:ruby></w:r></w:p>',
    g.PORTRAIT,
])
