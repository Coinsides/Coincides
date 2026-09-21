> **状态 (Status)**: blocked（施工与 client 验证完成；server 真 OCR 执行环境阻塞）
> **层 (Layer)**: 审计证据 / Builder receipt
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 否；供 HQ 复核，不替代放行

# T3 第二轮施工与全量验收

依据工单补遗一，上一轮两项口径冲突已解除。最终代码修复和常驻标尺已落地；**不能申报全量绿，工单保持 ready**。server 111 文件零排除、600000ms 文件预算的整跑，最终留下两个 Python/MinerU 启动失败。没有换解释器、改 OCR 绑定、跳过测试或改权限。

## 1. 构成分解与施工落点

- 通用 profile 仍为 15/22，字族不变。纸张默认覆盖层 `pageFrameTypographyService.ts:38` 将物理字号 **11pt→10.75pt**（四分点刻度），`:46` 将纸张行高比 **22/15→1.65**。保持原物理映射与各指标一次小数归一；web 与用户显式覆盖路径未改。
- A4 物理比例仍为 `(210/25.4×96)/904 = 0.8779875966831581`；`10.75×96/72÷比例` 经原归一得到 **16.3px**，行高 **26.9px**。Letter 对应 **15.9/26.2px**。实施中试过10.5pt，但它的 Letter 同尺度值低于下限，最终改为10.75pt并同时验双纸型。
- 阅读档依旧 `baseScale×stepFactor`，纸与正文共用原 transform。未修改阅读缩放、坐标、分页或几何常量。补遗一同尺度公式始终为 **computed 字号÷904×900**；若使用已缩放数值，则分子分母一起乘 displayScale。
- `TableBlockProjection.module.css:10`、`:11`：字号和行高从正文变量减2px，改为各自 **×0.85**；`:15` 至 `:18`：`max-content + min-width:100%` 改为 **fit-content + max-width:100% + margin:0 auto**；`:37`：cell **min-width:8em→0**，避免多列最小内容宽妨碍收敛。原8×10px padding、24em最大cell宽、anywhere换行及横向溢出容器均保留。
- `NoteDetail.module.css:3594` 装订件12px原样；没有新 token、颜色、字体、display_overrides 或 content/metadata 键。

## 2. 逐处断言与夹具申报

以下行号指最终文件；未列出的既有断言保持原样。共有 **4 个既有测试文件调整、1 个新增标尺文件**，没有修改分页算法。

| 文件/行 | 旧值→最终新值 | 合法性与保留的验证 |
|---|---|---|
| `pageFrameTypographyService.test.ts:50` | 测试标题11pt→10.75pt | 标题跟随最终默认刻度 |
| 同文件`:59` | exactFontSize的11→10.75 | 与批准的纸张默认微调一致 |
| 同文件`:62` | exact行高倍率22/15→1.65 | 第一知觉修；`:67`/`:68`单次舍入误差0.05及精确量化断言不变 |
| 同文件`:71` | 物理字号相对误差分子/分母基准11→10.75 | 原0.005阈值不变 |
| 同文件`:82` | 自定义框宽换算的11→10.75 | 原0.05阈值与框几何不变断言保留 |
| `hooks/useNoteCanvasRuntimeController.test.tsx:412` | 标题11pt→10.75pt | 标题跟随实际刻度 |
| 同文件`:435`、`:436` | plain_text及content_json内94字符→96字符 | 新A4/Letter每行容94/97字符；96仍分别2行/1行，原行数、高度大小关系及重渲染/导出/profile同源断言保留 |
| 同文件`:472`、`:473` | A4 16.7→16.3；Letter16.2→15.9 | 最终生产换算结果；未扩大容差 |
| 同文件`:480` | 物理pt误差基准11→10.75 | 原0.005阈值不变 |
| `blocks/TableBlockProjection.test.tsx:45` | 源码字号表达式`-2px`→`*0.85` | 锁定批准的比例档；其它渲染、打印、皮肤断言保留 |
| `hooks/usePaperSize.test.tsx:96` | 3975字符→3800字符 | 行高增加后3975使两种profile都跨页；3800按A4/Letter分别41/40行、约1118.9/1064px，跨越Letter内容高1074px。原`:107`的`custom ? 2 : 1`、文本完整性、undo/redo断言原样保留；只修临界夹具 |
| `paperTypographyRuler.test.tsx:50`（新增） | 无→24个双纸型正文用例 | A4/Letter×fit_width/fit_page/physical×0.5/1/1.5/2；computed÷904×900∈[15.7,16.3]，行高比∈[1.60,1.75]，两种同尺度写法相等 |
| 同文件`:80`（新增） | 无→3列/8列表格计算样式断言 | fit-content、100%上限、双auto外边距、撤满幅最小宽、cell最小宽0、anywhere、档位[0.82,0.88]且精确0.85 |
| 同文件`:103`（新增） | 无→装订件12px与11.94690265归一值 | 读取生产装订CSS，锁定本单不动的部件 |

**jsdom证据范围**：27个新用例调用真实生产profile/metrics/CSS。jsdom26不展开custom properties，因此测试仅将生产document变量代入原CSS表达式，calc仍交给CSSOM化简；继承字体沿实际computed父链读取。没有mock getComputedStyle或回填期望矩形。表格宽度断言属于计算样式声明契约，步进用例是合成DOM同尺度验证；不冒充完整应用布局集成。未经展开的原生CSS与实际表格几何另由Chrome复测。

## 3. 最终原生DOM复测

Chrome 153，隔离合成页，只导入生产纯函数和CSS；未连接应用后端、未读取用户笔记、无截图。A4/Letter×3/8列×0.5/1/1.5/2 fit-width步进，共16个组合；详细摘录见 [chrome-dom-observed.json](round2/chrome-dom-observed.json)。

| 纸型 | computed正文/行高 | 正文同尺度 | 行高比 | cell computed/同尺度 | cell比例 | 装订件同尺度 |
|---|---:|---:|---:|---:|---:|---:|
| A4 | 16.3 / 26.9 | 16.227876 | 1.650307 | 13.855 / 13.793695 | 0.85 | 11.946903 |
| Letter | 15.9 / 26.2 | 15.829646 | 1.647799 | 13.515 / 13.455199 | 0.85 | 11.946903 |

3列短表实际布局宽A4约101.578、Letter约100.547，内容宽760；两侧空白差最多0.015654px（像素舍入）。8列长词表收敛至760；16例最大溢出0。这里只声称覆盖这些合成组合；极端列数仍由原横向溢出容器承接，不把CSS max-width当成任意内容的几何证明。

## 4. 全量验证与停线证据

- 最终定向：4文件64测试通过；分页夹具追加定向17/17通过。
- 最终 **client全库231文件、2368测试通过**，零文件排除。日志 `.codex-tmp/t3-typo/round2/client-final-full.log`。此前最终参数整跑曾抓到上述3975分页夹具失败，原失败日志保存在`gate-final/gate-test-unit.log`；未覆盖失败证据。
- 验证门 **非git/secrets 25组件均已通过**：最终参数批次24项直接通过；test:unit经合法夹具更新后全库重新通过。详见 [verification-summary.json](round2/verification-summary.json)。没有运行完整root串接命令以免触及HQ保留的两项；不是跳过其余验证门。client/server build、静态边界、模型契约、性能smoke及docs等均实际执行。
- **server全量111文件 = 84主集+27补集**，动态枚举`server/src`及`server/scripts`全部`.test.ts`，零排除，含`v13WildernessExecute`及真OCR测试。两次均`--test-timeout=600000 --test-concurrency=4`；现有wrapper隔离资产，DB为内存或测试自身临时库。最终 **1118 tests / 1116 pass / 2 fail / 0 skipped / 0 cancelled / 0 flaky retries**，耗时约101秒。所有文件纳入调度，但MineruWiring模块加载失败，不能称其内部所有用例均已运行。
- 初次整跑13红：10项来自本轮临时runner将app-data设在仓内（生产明确拒绝）、1项缺npm_execpath、1项PATH无Python、1项真OCR launcher失败。仅修临时runner：独占系统临时app-data、正确npm_execpath、PATH指向已固定的基础Python，未改产品/测试；重跑降为上述2红。两次原始日志均保留。

**剩余阻塞（未绕过）**：

1. `server/src/__tests__/v2SourceMineruWiring.test.ts:60` 模块载入调用`python.exe`。第二次原始日志`server-rerun/server-all.log:61783`为 **spawnSync python.exe EPERM**；模块文件失败位于`:61806`。
2. `server/src/__tests__/v2SourceRegionCells.test.ts:203` 已实际进入真MinerU解析调用，约1937ms即返回 **code101 / Unable to create process**（同日志`:62646`、`:62652`），固定venv无法启动它绑定的`C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`。直接执行该基础解释器`--version`也收到“拒绝访问”。此处不能声称OCR已成功运行。

这不是120秒/600秒预算耗尽；未改产品现有MINERU_TIMEOUT_MS=120000，也未增加文件排除、mock、skip、换模型/解释器或改权限。当前会话不能提权，**到此保留环境失败，待HQ在可执行该固定Python的环境复验server全量**。代码与client可以复核，但全量验收缺口尚在，header不翻done。

## 5. 证据与禁区申报

`round2/`含源码行号、SHA256、tracked diff、生产profile与夹具测量、server111文件清单、两类结果清单、浏览器摘录及runner副本。原始日志都在`.codex-tmp/t3-typo/round2/`。runner副本供审计；`diagnostic-round2.mjs`的相对导入按原位置`.codex-tmp/t3-typo/`解析，复现请用原文件，server cwd执行`node --import tsx ../.codex-tmp/t3-typo/diagnostic-round2.mjs`后打开`http://127.0.0.1:5193`。

未做项：server全量绿、HQ保留的git检查与secrets、原用户笔记/heading补种、主观签收、push/PR/merge。无git写、.git或agent指令修改；无用户库操作、远程LLM/API调用或凭据消耗；无新依赖、工具面、prompt、Relation/判定域、schema/内容键、坐标/分页机制、字族/颜色/token或新安全对抗用例。本地OCR仅按补遗一运行原回归，保留真路径失败。辅助agent均只读零测试零写，施工和测试由单builder执行。
