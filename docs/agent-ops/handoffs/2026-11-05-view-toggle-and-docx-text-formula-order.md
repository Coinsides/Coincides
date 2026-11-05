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
