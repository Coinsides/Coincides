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

## Result(builder 回执区,候填)
