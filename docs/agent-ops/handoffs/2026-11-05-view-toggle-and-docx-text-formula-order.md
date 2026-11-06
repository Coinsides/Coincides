> **from**: Main_Designer
> **to**: 临时工程对话1(builder);核验 Tester(1)
> **status**: ready(Henry 2026-11-05 口令:复现、排查、修复,交 Tester 测试)
> **日期**: 2026-11-05
> **性质**: 第十七轮上岛后 Henry 首次真实使用报告

## 0. Henry 报告

用真实金融 docx,第十七轮:

1. **能看到快照,能从快照切到文本,但文本切不回快照。**
2. **文本视图公式仍然丢失**:`PV = =`,与之前同样的问题。

第 1 件是缺陷。第 2 件的成因早已查明(`sourceArtifact.ts:331` 的 `mammoth.extractRawText` 整棵吞掉 OMML),上一单 §0 曾写「mammoth 文本投影语义⛔动」,**本单解除这条限制**。设计更正:我此前把 docx 公式的文字化归给 1b 云转写,说宽了。docx 的公式是文件里的结构化 OMML,不需要视觉模型;需要 1b 的只有 PDF。

## V1 · 文本切不回原页(缺陷,优先)

先复现再修,⛔凭读码直接改。

- **复现环境**:本机已装真 LibreOffice(`C:\Program Files\LibreOffice\program\soffice.exe`),配 `COINCIDES_DOCX_PDF_COMMAND_JSON` 走真转换;v2 新库;真浏览器真鼠标。用合成 docx 或单据 2026-11-04 的排练文档。⛔碰岛,⛔碰 Henry 账号和文件。
- **要回答**:切回失败时,按钮是不见了、被禁用、点了没反应,还是切过去又被弹回?只在 docx 还是 PDF 也有?只在特定路径(刷新后、滚动后、生成完成后、经默认原页进入后)?
- **线索(只作入口)**:切换控件两处,工具栏 `NoteChromeLayer.tsx:423`(受 `sourcePageView?.available` 控制)与原页头部;D2 默认判决与 P2 都改过 `useSourcePageViewController`。在 scratch 副本对照第十六轮 `0a921892` 与 D2/P2 前后,判明是否本批引入。⛔共享树换码。
- **验收**:Henry 路径文本与原页可来回切;手动选择不被默认判决覆盖;记忆、stale-jump、T-D2-1 回归全绿;回归测试须在未修代码上红。

## F1 · docx 文本层保住公式

**目标**:文本视图不再出现 `PV = =`。公式以文字形式留在原位,Agent 读、制卡、铸 item 都拿得到。

- **形制**:每个 `m:oMath` 转成行内 LaTeX,用 `$…$` 包住,放在原位置:`PV = $\frac{C}{i}$ = …`。常见结构要覆盖:分式、上下标、根号、求和与积分、括号、函数、矩阵、重音。
- **守恒**:遇到不认识的结构,退回拼接其中的 `m:t` 原文,⛔留空。任何 `m:t` 字符不得丢失,测试要钉。
- **接入**:首选在 mammoth 之前预处理 `word/document.xml`,把 OMML 换成文字 run 再交给现有管线,这样分段、`docx_paragraph` 索引、无公式文档的输出都不变。预处理任何失败,回退到原 buffer 走现有路径,**公式处理不能让导入失败**。`assertDocxExpansionSafe` 仍对原文件执行。
- **依赖**:`jszip`、`@xmldom/xmldom` 已是 mammoth 的传递依赖。**仅此两个**允许声明为 server 直接依赖,并更新 `server/package.json` 与 lock(顺带了结 TD-35 的 jszip 一半,回执写明)。其他新依赖⛔。
- **告警**:OMML 不再被吞后,mammoth 对 `oMath` 的告警应消失,其他告警仍触发提示。验证纯公式文档不再出横幅。
- **可选,小才做**:整段只有一个公式时,若投影改出 `formula` 块(KaTeX 渲染)量级小就做,否则保持文本并申报。行内公式渲染本单⛔做。
- **旧文件**:不回填,重投影后生效。回执写明重投影的代价(笔记 ID 变、批注不迁入)。

**验收**:合成 docx(行内、独占一行、嵌套分式、上下标、根号、求和、中文混排)无 `= =`,字符守恒;无公式 docx 的投影与修改前逐块相同;预处理抛错时导入照常成功。

## 交付

红线照旧:⛔git 写操作、⛔真实模型、⛔扩修、⛔碰岛。新 server 测试同批挂载。证据落 `docs/audits/2026-11-05-toggle-formula-builder/`,口径同前,走查当轮落盘。Result 写单尾并短讯 Main_Designer,再由 Main_Designer 交 Tester 核验。量级超出小中型就停件上报。

---

## Result(builder 2026-11-05)

**执行状态**:V1、F1 完工,未提交。全程零真实模型调用,未碰岛、未碰 Henry 的文件。这次用的是本机真 LibreOffice,走查的原页影像里公式可见。

**闸与全量**(`gates.txt`、`server-full-suite.txt`、`client-full-suite.txt`、`red-files-alone.txt`):
- 服务端全量 1310 过 1309,唯一红是既有 harness,单跑仍红。
- 客户端全量 2588/2588,全绿。
- 两侧 tsc 0 / 0;5 项 check 都过;`check:test-wiring` 仍是既有 9 个未挂载,新文件已挂进 `test:v2`。
- 服务端全量跑在最后两处客户端改动之前,那之后没有再动服务端代码。

### V1 · 文本切不回原页

**答单据的问题**:有两条路径,都在 docx 和 PDF 上成立,和刷新、滚动、生成完成无关。
| 路径 | 症状 | 发现者 |
|---|---|---|
| 窗口宽度 ≤760 CSS 像素 | **按钮不见了**:Text/Pages 所在的「纸的状态」组被折叠,只剩一个写着「纸」的小按钮;原页头部有切换,一到文本就没了 | builder |
| 手写笔记开着 Layout,不刷新切到投影 | **按钮被禁用,点不动**:Pages 和 Layout 都禁用,出不来 | Tester(1),岛上 `b7ebfb5b` |

**没复现的路径**:宽窗口下的直走来回、先点进块、滚动后、刷新后都正常,按钮都在也都能点。「切过去又被弹回」没有出现。

**是否本批引入:不是。**折叠规则来自 `987609c9`(09-20),切换按钮放进该组和 `pagesDisabled={layoutMode}` 都来自 `ad108ef2`(11-02)。scratch 副本跑第十六轮 `0a921892`,700 宽下同样没有按钮。**D2 把它推上了常走的路**:现在默认从原页进来,才会去切文本。P2 无关。

**⚠️ 还不知道 Henry 走的是哪条。**两条都符合他的描述,都已修。请你向 Henry 核对窗口宽度和是否开过 Layout;如果两条都不是,V1 就没有真正解决,请告诉我。

**修法**:
1. 切换按钮搬出工具栏:文本视图里改成右上角粘性悬浮(新增 `.sourceViewFloat`,零高度,不推动正文),位置和原页头部一致。**工具栏里那份已删除**,这是行为变化:宽窗口下工具栏不再有 Text/Pages。
2. Layout 带进只读笔记时自动关闭(`useNoteCanvasRuntimeController` 里的 effect);`pagesDisabled` 整个去掉。**行为变化**:从投影切回手写笔记后,Layout 是关的,不再保持开启。两篇手写笔记之间的保持不变。

**验收**:
- 回归测试:窄窗口这条钉在 `NoteCanvasRuntime.sourceView.test.tsx`(工具栏被 mock,按钮只能来自外面),Layout 这条钉在 `useNoteCanvasRuntimeController.test.tsx`。**都在未修代码上红过**(scratch 副本,`positive-controls.txt`)。
- 手动选择不被默认判决覆盖、记忆、stale-jump、T-D2-1 全绿。
- 真鼠标走查:700 宽文本→原页;1024 宽走完 Tester 那条路径,到投影时 Layout 已关,来回切都通;1280 宽滚到 2500,按钮仍在 y=45。

### F1 · docx 文本层保住公式

新文件 `services/docxOmmlText.ts`。`docxParser` 在 mammoth 之前预处理 `word/document.xml`,把每个 `m:oMath` 换成文字 run;`assertDocxExpansionSafe` 仍对原文件执行。
- **覆盖**:分式(含线性、无线)、上下标、前置上下标、根号、求和积分等、括号、函数、极限、矩阵、方程组、重音、上下划线、上下括号。
- **守恒**:不认识的结构拼接其中的 `m:t`。另有一道兜底:转换结果若丢了任何 `m:t` 字符(忽略空白),整个公式退回原文。
- **无公式文档**:返回同一个 buffer,投影逐块相同。
- **失败回退**:预处理任何异常都走原 buffer,导入照常。
- **告警**:`oMath` 告警消失,纯公式文档不再出横幅,其他告警照旧。
- **依赖**:`jszip`、`@xmldom/xmldom` 转为直接依赖,lock 只多 2 行,版本未变。**TD-35 的 jszip 一半了结**,xmldom 不在 TD-35 里。原生 ESM 导入已验。
- **旧 stopbleed 测试改了**:`stopbleedSourceIntake` 原用公式触发告警,现在公式不再告警,改用未知元素触发。
- **可选的 `formula` 块没做**:独占一行的公式仍是文本。

**真转换走查结果**(`browser-walkthrough.md`):
- `永续年金的现值 PV = $\frac{C}{i}$ = 面值的折现结果。`
- `$PV=\sum_{t=1}^{T}{\frac{{C}_{t}}{{(1+i)}^{t}}}$`
- `嵌套分式:$\frac{1}{\frac{1}{1+x}}$ 与根号 $\sqrt{{σ}^{2}}$ 同行。`

文本视图显示的是 LaTeX 源码,不是渲染后的公式,这是单面形制。LaTeX 里有多余的花括号(如 `{C}_{t}`),合法但略啰嗦。

**旧文件**:不回填,重投影后生效,已实测。代价:笔记 ID 变,批注不迁入(旧批注只留快照回执),封面等笔记级设置随旧笔记删除,页影像保留。

**阳性对照**(`positive-controls.txt`):去掉守恒兜底、去掉异常回退、解析器不调用预处理,各自都红。

### 申报项

1. **横幅还会误报,这次有实证**:我的合成文档引用了未定义的 `Heading1` 样式,mammoth 报 `Paragraph style with ID Heading1 was referenced but not defined`,没有丢内容,却出了「未能完整转换」横幅。按单面「其他告警仍触发」没有改。真实 Word 文档一般定义了样式,所以频率未知;但 Henry 公式修好后如果仍看到横幅,先查这个。**要不要过滤样式类告警请你定。**
2. **旧文档重投影后,印记不更新**:`rematerializeSource` 从不写 `source_imprints`(既有行为),所以旧 docx 重投影后,笔记有公式,但印记仍是 `PV = =`。`imprintRetrieval`、`imprintCitations` 读印记,Agent 检索这类文档可能还拿不到公式(读代码得出,未实测)。新上传的文档没这个问题。单面目标写了 Agent 读得到,所以提出来;修它超出本单,未动。
3. **LibreOffice 配置目录路径太深时静默失败**:在本机 112 字符的 scratch 根下,退出码 0、无输出、无 PDF,页影像落 `failed`,报 `no usable PDF`。换短路径即正常,命令和文档都没变。这是 Windows 上的现象,**未在 Linux 验证**;岛上 Henry 能看到快照,说明岛上目前没撞到。P4 的日志对这种情况帮不上忙,因为确实没有输出。
4. **公式只认 `word/document.xml`**:主文档路径不同的非 Word 生成文件走原路径,公式仍丢但导入不受影响。脚注里的公式 mammoth 的纯文本本来就不读。
5. **悬浮按钮的代价**:窄窗口滚动时,它会盖住正文右上角一小块。
6. **没验到**:Henry 的真实文件;岛上环境;Linux 上的 LibreOffice;真实 Tab 键。合成文档覆盖的 Word 结构有限,真实金融文档可能有没覆盖到的结构,那种情况会退回 `m:t` 拼接,不丢字但 LaTeX 不好看。
7. **部署注意**:lock 变了,岛上要重新安装依赖。lock 哈希变化也意味着此后新解析的文档记录新的转写器指纹,这是既有机制。
8. **环境已复原**:`.claude/launch.json` 与备份一致,scratch 副本和短路径数据已删。

**证据**(`docs/audits/2026-11-05-toggle-formula-builder/`):`browser-walkthrough.md`(当轮落盘)、`gates.txt`、`server-full-suite.txt`、`client-full-suite.txt`、`red-files-alone.txt`、`positive-controls.txt`。

## 裁定(Main_Designer 2026-11-05,回 builder 两点待定)

1. **横幅误报:修(F2)**。样式未定义这类告警(如 Heading1)没丢内容,不该提示。在写入点一处过滤:`parserMessagesMetadata`(`sourceProjectionMaterializer.ts:311`)去掉样式类消息,其余照存,读端和客户端不动。用排除法,不认识的消息继续提示,宁可多报不漏报。文案以 mammoth 实际输出为准,测试钉住:只有样式告警的 docx 不出提示,含 `An unrecognised element was ignored` 的仍出。旧笔记重投影后生效。
2. **重投影不写 source_imprints:不修**。核实结果:Agent 的 Source 检索(`agentSourceSearch.ts`)读 `note_blocks`,重投影后拿得到公式,「Agent 可能拿不到」不成立。印记的生产读者只有无人调用的 `/api/imprint-retrieval`。收割时入 tech-debt。
3. **V1 的切换按钮搬到文本视图右上角悬浮**:采纳,超出单面但合理,交 Tester 核验有没有挡字、窄窗口是否可达。

## F2 Result(builder 2026-11-05)

**执行状态**:完工,未提交。按裁定只跑定向测试,没有重跑全量。

**改动**:只动 `parserMessagesMetadata` 一处写入点。用排除法去掉形如 `<类型> style with ID <id> was referenced but not defined in the document` 的消息,其余照存,读端和客户端未动。过滤后为空就不写键。文案取自 mammoth 源码 `body-reader.js:661-663`,类型是 Paragraph、Run、Table。

**测试**(`stopbleedSourceIntake.test.ts`,已挂载):
- 只有段落和字符样式告警:不出提示,metadata 不带键。
- 样式告警和 `An unrecognised element was ignored` 并存:仍出提示,且只留后者。

**阳性对照**(scratch 副本,`positive-controls.txt`):去掉过滤,两条新测试都红;把消息全滤掉,第二条和两条既有告警测试红。定向结果在 `f2-targeted.txt`。

**申报**:
1. **Table 样式没有端到端测试**:正则覆盖了它,但没有 `styles.xml` 的文档里出现 `w:tblStyle` 时,mammoth 自身会抛错(`Cannot read properties of undefined (reading 'Grid')`),导入失败为 `DOCX could not be parsed`,所以用现有夹具测不到。真实 Word 文档都带 `styles.xml`,一般撞不到,但这个抛错不是本单引入,也没修。
2. **`Unrecognised paragraph/run style` 没有过滤**:它们只在转 HTML 时产生,`extractRawText` 走不到。
3. **旧笔记**:已存的 `parser_messages` 不改,重投影后才生效。

上面 Result 申报 1 的误报已由本节处理;申报 2 的「Agent 检索可能拿不到」按裁定不成立,我当时读错了消费方。

## 终局判语(Main_Designer 2026-11-05)

Tester 核验放行(`review-tester.md`),15 个文件哈希与其快照一致后收割。6 条小问题不阻部署,前两条(非法 LaTeX、`m:bar` 语义)本可一行修,但不为它们再开一轮:Henry 的金融文档用不太到,入 TD-49 随下次带上。**V1 未闭环**:Henry 走的是哪条路径尚未确认,上岛后请他本人再试。

## F3 · 公式定界符与两处小错(Main_Designer 2026-11-05 补单,排在 A-18 之后)

Tester 第十八轮核验 T-F1-5:正文 `$` 不转义,与 `$…$` 有歧义,`美元 $100 和式子 $x$` 会被误读。Henry 的是金融文档,`$` 很常见,Agent 读取和以后渲染都会撞上。公式形式写入投影后要重投影才能更正,所以趁早改,收回「不为小问题再开一轮」的判语。

- **定界符改为 `(…)`**,如 `PV = (rac{C}{i})`。正文 `$` 原样保留,不转义。
- **修 TD-49 中两条**:`leftlangle`、`lfloor`、`lceil` 后紧跟字母时的非法 LaTeX;`m:bar` 无 `pos` 按规范默认处理。
- **验收**:Tester 那组 65 式无回归、字符守恒;`美元 $100 和式子 x` 这类混排能被 `(…)` 无歧义地剥出公式;全部产物过 KaTeX 解析(client 已有 katex,可作测试手段)。只动 `docxOmmlText.ts` 及其测试。

Henry 已被告知:现在 Rebuild 的文档,F3 后要再 Rebuild 才是新格式。

## F3 升级为 🅰(Main_Designer 2026-11-05,回 Tester 更正)

上一节的 F3 作废优先级,范围按本节。Tester 独立复核发现 F1 **静默写出错误公式**:修前公式丢失但有横幅,修后公式错且无横幅,这一类变差了。

**已复现(本地,与 51370281 一致的解析器)**:`m:limLow`/`m:limUpp` 基底非 lim、max 等时整式退回 `m:t` 拼接,`θ = arg min_w (1/n)e²` 变 `$θ=arg minw1ne2$`,`1/2` 读成 `12`。根因:`limitBase` 输出顺序与源相反,守恒检查按序比,误判丢字。另有公式内修订 `x=` 删 2 改 3 变 `$x=23$`;`w:sym` 丢失且无横幅;式内换行粘连;方程组对齐符变字面量;斜分式丢分组。

**设计原则,比逐条修更重要:宁可说转不了,不可写错。** 无法确信结构时,**绝不输出压平结果冒充公式**:
1. **诚实降级**:任一公式走了回退,原位保留可辨认的占位(如 `[公式未能转换,见原页]`,保留 `m:t` 原文可作附注,但不进定界符内),并向 `parser_messages` 写一条非样式告警,让横幅出现。这是本单第一件事。
2. **修守恒检查**:改为不依赖顺序的比较,让极限结构不再误退。退回只因真的不认识结构。
3. **修结构**:极限类(argmin、argmax、下括号、堆叠关系符)、`w:del`/`w:ins` 修订(只取最终文字)、`w:sym`、式内换行、方程组对齐、斜分式分组。不能确信的进第 1 条,不硬猜。
4. **定界符改 `(…)`** 及上节两处小错。
5. **OLE/MathType**:F1 碰不到,确认横幅仍出,文案不误导。

**验收**:Tester 的压平样本全部语义正确或走诚实降级,没有第三种;产物过 KaTeX;语义比对要用人工金标准(源公式对 LaTeX),⛔只比字符守恒,上一轮「65 式守恒」没有挡住这类错误,因为字符确实没丢。

**排序**:与 A-18 同为 🅰。只动 `docxOmmlText.ts`、其测试及告警写入点,与 A-18 无文件重叠,可先于 A-18 收口单独交付。
**部署**:不回滚第十八轮(原页正确,回滚也要走一轮部署,已提醒 Henry 不要 Rebuild),F3 过 Tester 后尽快上岛。脚注静默丢失(既有)入 TD-49,本单不做。

**F3 补充(2026-11-05)**:①验收直接用 Tester 金标准 `docs/audits/2026-11-05-toggle-formula-builder/f3-gold/`(比 KaTeX 解析树,只有 ok 和诚实降级算过关,基线已上线版本 54 对、16 错、1 非法);占位符措辞若另选,改脚本一处并在回执写明;金标准有异议提给 Main_Designer,⛔直接改。②并入 `V-未闭合`:`w:body` 未闭合且含公式时入库 0 块的空笔记且无提示,xmldom 警告要让预处理失败回退,回退后走现有路径。

## F3 Result(builder 2026-11-05)

**执行状态**:完工,未提交。未碰岛和 Henry 的文件,零真实模型,无新依赖。

### 本单文件清单(收割用,和 A-18 分开)
- `server/src/services/docxOmmlText.ts`
- `server/src/services/sourceArtifact.ts`(只改告警写入点)
- `server/src/__tests__/docxOmmlText.test.ts`
- `docs/audits/2026-11-05-toggle-formula-builder/f3-*`(新:`f3-gold-after.txt`、`f3-positive-controls.txt`、`f3-server-full-suite.txt`、`f3-red-files-alone.txt`、`f3-gates.txt`)

### 金标准(未改 `gold.json`,占位符措辞在脚本认可范围内,脚本也未改)

| 版本 | ok | 诚实降级 | 待目检 | 错 | 非法 | 缺失 |
|---|---|---|---|---|---|---|
| 已上线 51370281 | 54 | | | 16 | 1 | |
| F3 | 70 | 0 | 1 | **0** | **0** | **0** |

**这条待目检请 Tester 或你看一眼**:`特殊字符`,产物 `\(50\% + \$100 \& a\_b \#1 \{c\} \backslash d <e> \text{\textasciicircum}f \text{\textasciitilde}g\)`,读出来和金标准同串。我判对,但这条按脚本设计要人看。

**金标准里的降级数是 0**:样本里的公式现在都能转,所以诚实降级这条路金标准没走到,只有下面的合成用例在测它。

横幅:F3 样本出(OLE 警告仍在);F1 全结构样本不出,因为 71 式全部转对。

### 改了什么
1. **诚实降级**:不认识的结构、字体、定界符、算符、重音,和够不到的式内换行,都拒绝转换,**不再压平**。原位写 `[公式未能转换,见原页;原文字符:…]`,在定界符外。同时写一条非样式 `parser_messages`(`N formula(s) could not be converted to text`),横幅由此出现。
2. **守恒检查**改为不看顺序的字符计数,极限结构不再误退。`^` `~` 不参与计数,因为它们变成了命名命令。它只能抓丢字,**抓不到结构错**,结构错靠拒绝未知和金标准。
3. **结构**:argmin 类、堆叠关系符、带标签括号、修订只取最终文字(`w:del` 不读)、`w:sym`(只认 Symbol 字体,其他降级)、顶层式内换行拆成两式、方程组 `&` 对齐、斜/线性分式保分组、无线分式。
4. **定界符改 `\(…\)`**,正文 `$` 不动。`永续年金 $100 的 PV = \(\frac{C}{i}\)` 有用例钉住,产物过 KaTeX。
5. **TD-49 两条**:`\langle`、`\lfloor`、`\lceil` 后紧跟字母不再非法;`m:bar` 无 `pos` 按规范在下方。
6. **OLE/MathType**:确认仍出横幅,文案「本件有内容未能完整转换(含公式/嵌入对象),请以原件为准」不误导,没改。

### V-未闭合
xmldom 警告现在让预处理失败,回退原文件,mammoth 自己拒绝。只缺 `</w:body>`、只缺 `</w:p>` 两种,走真实入库后都是 `failed / invalid_or_corrupt`,没有笔记,和同样损坏但不含公式的结果逐字段相同。修前是 `materialized`、0 块、无横幅(Tester T-R-12)。

**未用 Tester 原文件**:`V-未闭合.docx` 和 `f1_extra.mjs` 在 Tester 的 scratch 里,仓库和本机搜不到。我按描述自造了样本。请 Tester 用原样本复核。

### 验证
- 目标测试 50/50,tsc 0。
- **阳性对照 8 组**,全在 scratch 副本(`f3-positive-controls.txt`):去守恒、未知结构压平、忽略 xmldom 警告、不写告警、定界符改回 `$`、读入 `w:del`、定界符贴字母、bar 默认在上,各自红在对应用例。
- 闸:`source-experience`、`changed-file-secrets`、`agent-knowledge` 过。没跑 `canvas-runtime-boundary`,本单没动 client。
- **服务端全量 1330 过 1327**(`f3-server-full-suite.txt`):`harness real empty-claim journey` 既有红;`K-4`、`K-5/K-7-on/K-2` 全量红,`v2SourceMineruWiring` 单跑 5/5(`f3-red-files-alone.txt`)。K-4 在已知载荷敏感族。**K-5 这条的载荷敏感是我按同文件单跑全绿推断的,没查根因**,报错是 `internal_interrupted` 对 `parser_failure`。

### 我自己踩到的,照实记
第一轮对照有两个假象,都已修正后重跑:
- scratch 副本缺 `package-lock.json` 和 `uv.lock`,未改动的基线就红 3 条,「不写告警」那组因此是假红。脚本现在要求基线全绿才开始。
- 「忽略 xmldom 警告」补好环境后 **0 红**,说明我写的未闭合测试没测到东西:我的样本把 `</w:document>` 也删了,走的是 error 而不是 warning。按 Tester 描述的坏法重写后才红在目标用例上。

### 行为变化
- **旧文档要 Rebuild 才是新格式**(你已告知 Henry)。此前上线版本写的 `$…$` 和错误公式不会自己变。
- 产物是字面文本 `\(\frac{C}{i}\)`,和之前的 `$…$` 一样靠以后的渲染。**我没有在浏览器里看文本视图**,也没查客户端现在是否解析这种定界符。本单没动客户端。

### 没验到
1. **真实的降级文档**:没有哪份真实 docx 走到过降级路径,只有合成用例和真实发布链路的合成件。
2. **Tester 原样本**:见上。
3. **岛上**:只在本地。
4. `\operatorname*{arg min}` 的空格:KaTeX 解析树和金标准判等,**渲染后是否显示空格没看**。

### 未做(未扩修)
- 脚注里的公式仍静默丢失,按单留在 TD-49。页眉、页脚等 `word/document.xml` 之外的 part 也不处理。
- `w:sym` 只映射 Symbol 字体常用码位,其余诚实降级。

## F3 判语与 F3b(Main_Designer 2026-11-05,依 Tester review-tester.md 第十一节)

Tester 判 F3 作为终版阻断:压平已修,但金标准外第二语料 81 条里仍有第三种结果,且换定界符带来卡片回归。**裁:F3 先上线止血,不是放行为终版。** 线上正把新导入公式压平写错且不提示,这比 `ℝ` 写成 `R` 严重得多;卡片回归可接受,Henry 现有 0 张卡片、不用 Agent。Rebuild 继续压住,F3b 后一次到位。

**F3b(builder,小修,排在手上矩阵之后、编辑器交付之前)**:
1. `m:scr`、`m:sty`:`ℝ` 变 `R`、`𝔼[x]` 变 `E[x]`、粗体 `X=X` 合成一个符号。ISO 29500 标准存法,econ 和金融常见。
2. 修订删除的结构残留:`y=` 删求和再插 `x` 变 `(y=sum{}x)`。修订只取最终内容,含结构。
3. `m:phant` 的 `show=off`、`false`:隐形减号变真减号,`1` 变 `-1`。
4. **卡片回归(要动客户端)**:formula 卡片 `(rac{C}{i})` 显示红色 KaTeX 错误,definition 卡片显示原始反斜杠。卡片要认 `(…)`。
5. 报告中其余确认项:`w:sym` 低字节、公式编号 `#`、花体。Tester 反驳否掉的 3 类别修。

**验收**:`f3-gold/` 金标准与 `check_second_corpus.mjs` 第二语料都只有 ok 或诚实降级;拿不准的走占位符,⛔再硬猜。Tester 复核后上线。

## F3b Result(builder 2026-11-06)

**执行状态**:完工,未提交。未碰岛和 Henry 的文件,零真实模型,无新依赖。按 Henry 定的方向手写,没引入 pandoc。texmath 的 `OMML.hs` 只取了元素名单作结构核对,没看实现。

**一句话**:金标准 70 ok、0 错;第二语料剩下的 6 条 WRONG 正好是 Tester 反驳否决、裁定「别修」的 6 条,和「只有 ok 或诚实降级」字面冲突,**请你裁**。

### 文件清单(收割用,与编辑器组分开)
- 服务端:`server/src/services/docxOmmlText.ts`、`server/src/__tests__/docxOmmlText.test.ts`、`server/src/agent/tools/normalizeContent.ts`、`server/package.json`(新测试挂进 `test:v2`)
- 服务端新测试:`server/src/__tests__/normalizeCardContentDelimiters.test.ts`
- 客户端:`client/src/components/KaTeX/KaTeXRenderer.tsx`、`client/src/components/CardFlip/CardTemplateContent.tsx`
- 客户端新测试:`client/src/components/KaTeX/KaTeXRenderer.test.tsx`、`client/src/components/CardFlip/CardTemplateContent.test.tsx`
- 证据:`docs/audits/2026-11-05-toggle-formula-builder/f3b/`
- **别收**:`f3-gold/F3-新样本.docx` 显示已修改,是 Tester 的 `check_second_corpus.mjs` 每次运行都重新生成样本造成的,不是我的改动。根目录 `package-lock.json`(未跟踪)是 10-06 的旧文件,不是我产生的。

### 改了什么
1. **`m:scr`、`m:sty`**:double-struck、script、fraktur、sans-serif、monospace 分别写成 `\mathbb`、`\mathcal`、`\mathfrak`、`\mathsf`、`\mathtt`;`b` 写 `\mathbf`,`bi` 和非拉丁字母的粗体写 `\boldsymbol`。只给字母数字段加样式,同一 run 里的运算符照旧。`sty p`、`scr roman` 不加样式,不拒绝。未知字体或拉丁以外的字母配这些字体,诚实降级。式内换行那条路径改成和普通路径共用同一个 run 处理(Tester 指出的第二处)。
2. **修订删除的结构**:结构的 `ctrlPr` 里有 `w:del` 或 `moveFrom` 时,整个结构连壳一起去掉,字符守恒的原文也不算它。
3. **`m:phant`**:`show` 按开关值读,`0`、`off`、`false` 都是隐形。
4. **卡片**:服务端 `normalizeContent` 和客户端 `CardTemplateContent` 都认单个 `\(…\)`、`\[…\]` 并剥掉;两个公式中间有文字时不剥。`KaTeXRenderer` 先认 `$$…$$`、`\[…\]`、`\(…\)`,再认 `$…$`,所以 `\(` 里的 `\$` 不会被当成美元公式的开头。
5. **`w:sym`**:只认 `F0xx` 和 `00xx`,`2264` 这类诚实降级。
6. **公式编号 `#`**:方程组里的 `#` 诚实降级。你说过形状没有 Word 验证,所以不猜。
7. **占位符**:原文字符里的 `\(`、`\)` 去掉反斜杠,不会打断后面的真公式。
8. **核对名单补的一处**:`borderBox` 带 `strikeH`、`strikeV`、`strikeBLTR` 或 `strikeTLBR` 时诚实降级。删除线表示「抵消」,写成普通方框意思会反。

### 验收
| | ok | 诚实降级 | 待目检 | 错 | 非法 | 缺失 |
|---|---|---|---|---|---|---|
| 金标准 `f3-gold` | 70 | 0 | 1 | 0 | 0 | 0 |
| 第二语料,改前 | 46 | 18 | 1 | 16 | 0 | 0 |
| 第二语料,改后 | 54 | 20 | 1 | **6** | 0 | 0 |

- 金标准待目检仍是 `特殊字符`,读法和上一轮相同。第二语料待目检是 `箭头标注`,Tester 核过,符合规范。
- **剩下的 6 条 WRONG 就是 Tester 否决的那 6 条**:`修订在rPr`、`分母修订rPr`、`结构标记删除`(都是 `w:rPr` 里放 `w:del` 的形状,反驳认为没有真实生产者)、`根号隐藏次数`、`求和隐藏上限有内容`、`Symbol字体文本`。按「被否的 3 类别修」没动。请裁:是认它们不算,还是改成诚实降级(改的话很小)。
- 20 条诚实降级的清单在 `f3b/second-corpus.txt`。其中 `修订Word形状` 这类真实 Word 修订形状走的是降级不是 ok,本单没扩修。

**对照**:12 组变异都在 scratch 副本里,全部 [APPLIED],各自红在目标用例上(`positive-controls.txt`)。

**全量**
- 服务端 **1358 过 1354**(`server-full-suite.txt`)。4 红:
  - `real empty-claim journey`:TD-50。
  - `K-4`:TD-45,单跑也红,Tester 在不含 F3 的基线上见过同签名。
  - `vpsF11SourcePageImages`:运行器 IPC 抖动,重试后 18/18。
  - `fidelity1a2DocxPages` 第 203 条:报错是「Windows process tree remained alive after termination」,单跑两遍都 18/18(`red-files-alone.txt`)。
- 第一次全量被运行器 `Unexpected end of JSON input` 在第 1212 条打断,没有总计,不算数。
- 客户端 **2618/2618**。
- 闸:tsc 两侧 0;`source-experience`、`changed-file-secrets`、`agent-knowledge`、`canvas-runtime-boundary` 过(`gates.txt`)。

### 没验到 / 没做
1. 卡片只有组件测试,**没在浏览器里打开一张真卡片看**。
2. 已有笔记要 Rebuild 才会变成新格式;卡片里存的旧 `$…$` 照常。
3. Tester 列为「建议一起修」的「整个公式在 `w:del` 里时有假横幅」没做,它的方向是多报。
4. 「`m:t` 里的空格渲染时消失」按 Tester 建议留在 TD-49。
5. 正文里本来就有字面 `\(不是公式\)` 时仍有歧义(Tester 第 4 项),未处理。
### F3b 补充(builder 2026-11-06,依「6 条改成诚实降级」裁定)

- **第二语料 0 WRONG**:54 ok、26 诚实降级、1 待目检(`箭头标注`,Tester 已核)。金标准不变,70 ok、0 错。
- 6 条的降级规则:run 自己的 `w:rPr` 里带 `w:del` 或 `moveFrom`;run 用 Symbol、Wingdings、Webdings、MT Extra 这类字形编码字体;根号的次数隐藏但还有内容;求和上下限隐藏但还有内容。
- **只是降级,没有转对。** `w:rPr` 里的 `w:ins` 照常保留文字;隐藏且为空的次数仍是普通根号。
- 只动了 F3b 清单内的 `docxOmmlText.ts` 和它的测试。
- **对照 16 组**(原 12 组 + 新 4 组),全部 [APPLIED] 并红在目标上。
- **服务端全量 1328 过 1322**,只算最终版本这一轮,以前的作废。6 红:TD-50 harness、TD-45 K-4,另外 4 个文件是运行器 IPC 抖动,重试后全部恢复(`recovered 4/4`)。这一轮文件数比上一轮少,是抖动文件按文件级计数造成的。
- **只有本节的数字算最终数字**:对照 16 组、全量 1328/1322、0 WRONG。上面 F3b Result 里的 12 组对照、1358/1354、6 WRONG 都是降级之前的版本。

## F3b 判语:放行(Main_Designer 2026-11-07,依 Tester review-tester.md 第十二节)

- **验的对象**:HEAD `4b1f1852` 加 F3b 清单 8 个文件的冻结副本,哈希在 `docs/audits/2026-11-05-toggle-formula-builder/tester-f3b/snapshot-hashes.txt`;收割时共享树 8/8 一致。
- **结果(Tester)**:金标准 70 对 0 错;第二语料 54 对、26 诚实降级、0 错;第三语料(34 条,builder 没见过,专测每条修复的相邻情形)30 对、4 降级、0 错,线上 F3 跑同一语料错 16 条;卡片真页面上 `\(…\)`、`\[…\]`、行内多式、`\mathbb`、`\mathbf` 渲染正确,0 个 KaTeX 错误;客户端全量 2596 条全绿;服务端 `test:v2` 只红 K-4(TD-45,线上同红)。
- **收割范围**:清单 8 个文件,加 `server/package.json` 里 F3b 那一处(`normalizeCardContentDelimiters.test.ts` 进 `test:v2`)。同一行里 A-19 的 `a19SourceImagePages.test.ts` 不收,留在工作树。不收 `f3-gold/F3-新样本.docx`。
- **四条小尾巴**记 TD-52,不挡上线。
- **上岛**:客户端有改动,要重建;上岛后旧 docx 可以 Rebuild 一次拿到新文本层。
