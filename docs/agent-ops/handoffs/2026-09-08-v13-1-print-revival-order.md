> **From**: fable
> **To**: codex
> **Status**: done(builder 工程与 3b 第二级机械验证完成;工作树交 HQ,真实笔记人眼验收仍归走查③)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(client,中单——复活停放的打印纸叠投影)

# 13.1 尾款 · 打印通道复活(v2 世界)

## 〇 · 上游(先读,顺序)

1. 停放卷宗:`handoffs/2026-09-07-v13-1-s3-print-channel-order.md`(两停线+补遗一,打印投影草稿现物:NotePrintLayer/pagePrintProjectionService/print fixture,`444af9d` 入库时的已证能力=world 正确输入下裁片重定位);
2. 13.1 段 plan 冻结裁定二第 4 条(3b 降级梯第二级=机械判据+走查人眼);
3. 4a 现物:v2 下 fragments/打印输入已经过 placementContractService 世界投影(4a Result"派生与打印输入"节)。

## 一 · 口径(冻结)

1. **复活验证**:v2 契约下,打印投影吃到的 world fragments 已由语义层保证正确——补齐当年停线未竟的验证:多帧样本(含次帧内容)打印分页归属正确、首字符不缺 72px(当年病灶的对照);
2. **3b 第二级机械判据交付**:单测断言逐帧物理宽高 ±0.5px(physicalScale 映射)/打印页数=帧数/gear 与 stepFactor 不泄漏进 print/纸族物理严格+网页族 fit A4 宽;
3. **打印预览检查页**:print fixture 补"应见/不应见"清单页(走查人眼用);Chrome print-media emulation 冒烟重跑(当年 6/6 FAIL 的那套收据,预期全绿);
4. **⛔ 面**:⛔ 动屏显 DOM/Preview 语义/4a 语义层/执行器;⛔ PDF 引擎⛔ 新依赖;真实笔记打印的人眼验收归走查③顺带(Henry 届时 Ctrl+P 解禁)。

## 二 · 验证(段纪律)

client typecheck/build;§一.2 机械判据单测;一条冒烟:print-media emulation 下多帧样本收据全绿(对照当年 FAIL 收据逐项)。

## 三 · 回执与边界

apply_patch 追加 ## Result(当年 FAIL→今日状态对照表+numstat+验证+未做);⛔ commit;⛔ 读 .env;⛔ 打印 key;⛔ 用户库;不动 3001/5173。现物冲突⇒停线举证。

## Result

2026-09-08 · Codex builder。**13.1 打印复活工程完成，3b 按已冻结的第二级交付机械证据与检查页；不代表 HQ 放行或 Henry 真实笔记人眼验收。** 已按 §〇 顺序读完 09-07 卷宗全文（两次停线、补遗一）、13.1 冻结裁定二第 4 条、4a Result「派生与打印输入」，并核读 Agent 入口、方向宪章、现状与 active ADR。未发现需要改判的新结构冲突。

### 交付内容与边界

- **打印输入复活**：`client/scripts/pageReadingSmoke/mockApi.ts` 仅为 print fixture 补 `/canvas-objects/coordinate-contract` 的内存 v2 响应，让真实加载、hydration、runtime 与 fragments 链运行。`printSpecimen.ts` **零修改**：保留当年的 frame-local 坐标、两帧、22 行代码、次帧页标及排除样本；没有改成手填 world、挪页标、加行数或放宽原归属判据。
- **3b 单测**：`NotePrintLayer.test.tsx` 新增 A4/Letter/web 三项真实 v2 hydrate → runtime placement → engine fragments → print DOM 回归，证明逐帧归属、页标独占、文本首字与 article 零左裁移、跨帧裁片重定位；补齐物理 scale 的宽高映射断言，档位类型使用真实 `physical`。原生命周期、只读快照、可见集合、纸族/网页族、分页与 chrome CSSOM 判据保留。
- **检查页与收据**：`printFixture.tsx` 保留原 10 项检查，收紧末页 `break-after:auto`，新增映射宽、页标唯一归属、两页 P 首字、首片 C 首字检查，共 **14 项/组**。检查页列应见/不应见、无左侧 72px 裁失、无深色代码底，以及下述 web 裁片限制。
- **打印样式收尾**：`NotePrintLayer.tsx` 仅新增 **2 行**、受 `[data-note-print-root]` 限定的代码块/代码内容白背景规则，清掉当年截图中的深色底。屏显 DOM、共享块渲染、Preview、`pagePrintProjectionService`、4a 语义层与执行器均零修改；没有在打印端再次投影坐标。
- **冒烟运行器**：`verifyPrint.mjs` 保留真实 Chrome print-media 路径，断言每份收据的实际 v2/gear/step，比较两档下全部 page/fragment 收据逐项相等；新增每帧独立截图。输出改到 `.codex-tmp/print-revival/`，当年 `.codex-tmp/print-smoke/` 的 FAIL 证据原样保留。

### 当年 FAIL → 今日对照

直接读取当年 `.codex-tmp/print-smoke/receipts.json` 的六份收据，与今日 `.codex-tmp/print-revival/receipts.json` 对照；不是把旧单测结果当浏览器证据。今日六份均记录 `coordinateContract=v2`、`printMedia=true`、两张固定打印页、两个跨帧裁片、14/14 PASS、原屏显节点/几何保全，浏览器运行时错误为 0。

| 样本 / 请求档位 | 当年实跑（09-07） | 今日实跑（09-08） |
| --- | --- | --- |
| A4 / fit_width | FAIL：次帧页标归属错误；实际 fit_width/1 | **PASS**：两页页标各出现一次且只在自己的页；实际 fit_width/1 |
| A4 / physical | FAIL：次帧页标归属错误；实际 physical/1.1 | **PASS**：相同归属，实际 physical/1.1；全页/裁片几何与 fit_width 严格相等 |
| Letter / fit_width | FAIL：次帧页标归属错误；实际 fit_width/1 | **PASS**：两页页标独占正确；实际 fit_width/1 |
| Letter / physical | FAIL：次帧页标归属错误；**实际仍 fit_width/1，不算 physical 覆盖** | **PASS**：实际 **physical/1.1** 已等待并断言；全页/裁片几何与 fit_width 严格相等 |
| web / fit_width | FAIL：跨帧块仅 1 个 fragment | **PASS**：两个真实 world 裁片，PAGE TWO 在第二页；实际 fit_width/1。第二代码裁片仅框尾，非连续正文分页证据 |
| web / physical | FAIL：跨帧块仅 1 个 fragment；实际 physical/1.1 | **PASS**：同上；实际 physical/1.1，全部页/裁片几何与 fit_width 严格相等 |
| 左侧首字符 | 卷宗/截图证实 A4/Letter 左侧少 72px；旧收据无独立首字断言 | **PASS**：六组两页 P 与首片 C 均未被裁；P 文本起点距裁片左缘为 A4 **8.780px**、Letter **9.027px**、web **7.087px**，均在裁片内 |
| 物理尺寸、scale、分页、隐藏 chrome、排除野地块、屏显保持 | 六份整体 FAIL 中这些内部检查已绿，不能记成当年全红 | **保持 PASS**，另补映射宽与末页规则；每组打印页数 2=帧数 2 |
| 代码深色背景 | 当年截图尚有深色底，视觉检查未收尾 | **已清除**：仅打印投影白底；三族逐帧截图已检查 |

物理采样：A4/web 每页 **793.688 × 1122.52px**，Letter **816 × 1056px**，均在纸型 mm@96dpi 的 ±0.5px 内。声明的全精度 scale 分别为 A4 **0.8779875966831581**、Letter **0.9026548672566371**、web **0.7086614173228347**；纸族同源 physicalScale，网页族 fit A4 宽。档位变化不进入打印缩放或裁片几何。

**证据限度**：textarea 无可直接读取的 glyph Range；新增首字机械检查使用真实 textarea 的内容、计算字体/内边距/滚动值、字符测量宽及全部裁剪祖先的实际布局盒，辅以逐页截图，不冒称像素差分。A4/Letter 次页截图能见最后代码行；**web 次页代码裁片仅有盒尾，没有完整代码行**，但次帧 PAGE TWO 全字可见。这符合冻结的 visibleRect 世界裁剪：页边距/帧间空隙中的内容会被裁，不承诺连续文本重排。原样本未改；本项已写进检查页，独立复核未判为新结构冲突。页数是打印 DOM 容器数，非 PDF 页数。

### §二验证实跑

| 命令 / 验证 | 输出摘要 |
| --- | --- |
| `node scripts/run-isolated-coordinate-validation.mjs --cwd client -- npm run test:unit -- src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx` | **PASS，exit 0**；2 files / **18 tests**（打印 15 + document layer 3），1.90s |
| `node client/scripts/pageReadingSmoke/start.mjs`，再运行 `node client/scripts/pageReadingSmoke/verifyPrint.mjs --isolated-chrome-no-sandbox` | **PASS，exit 0**；A4/Letter/web × fit_width/1、physical/1.1 = **6/6**；每组 14 项全绿；真实 `Emulation.setEmulatedMedia('print')`，返回 screen 后打印 portal 清除且屏显几何保持 |
| `node .codex-tmp/print-revival/checkFixture.mjs`（临时 TS program，沿用 client tsconfig 检查 fixture 入口） | **PASS，exit 0，0 diagnostics** |
| `node scripts/run-isolated-coordinate-validation.mjs`（完整执行原 `npm run verify:v2-bn8-runtime`） | **PASS，exit 0，45s**；client **51 files / 473 tests**；registry 5、manifest 10、parity 10 全绿；client `tsc -b`/Vite build、server build，以及运行时、shell、Source experience、model/performance smoke、docs、diff、changed-file 检查全部实跑通过，未替换或跳过主门 |
| `git diff --check` | **PASS，exit 0**；Git 的 LF/CRLF 与全局 ignore 读取受限提示不影响检查结果 |

构建/测试沿用已交付的隔离包装器：Vite 使用临时空 env 目录，默认 DB 指向内存，assets 使用临时目录，原始输出只在内存汇总。浏览器使用专用临时 Chrome profile、无后端 5181 fixture；上述 Windows 开关仅沿用当年隔离 renderer 的启动方式，没有改用户浏览器配置。六组 API 收据无非白名单写请求，唯一白名单 POST `/source-anchors/generate` 仍只返回内存空对象。早期加强收据时误从 writing props 取契约值，runner 拒收 undefined；修正为实际 runtime 字段后重跑上述六组全绿，没有改产品契约或放宽断言。

取证目录含 `receipts.json`、三张 screen/checklist 截图、六张 print-media 视口截图及 **12 张逐帧截图**；这些是忽略的工作区证据，不是产品资产。当年收据与两次停线正文均未回改。检查页复跑入口：`http://127.0.0.1:5181/scripts/pageReadingSmoke/print.html?paper=A4`（启动上表 fixture 后），页面可切 Letter/web；真实笔记 Ctrl+P 仍归走查③。

### numstat 与未做

- 本单代码/fixture/测试 **5 文件，+152/-8**：mockApi **+2/-1**、printFixture **+39/-3**、verifyPrint **+19/-2**、NotePrintLayer.test **+90/-2**、NotePrintLayer **+2/-0**。本工单回执/状态头 **+54/-1**；最终合计 **6 文件，+206/-9**。无新增依赖或产品文件。
- 未动屏显 DOM、Preview、4a 语义层、执行器、server、用户库或用户数据；未读取 `.env`，未打印密钥；未占用或操作 3001/5173，未修改 agent 指令/权限配置。
- 未生成 PDF、未引入 PDF 引擎或新依赖；未验证原生打印模态完整流程、物理纸张输出或真实笔记，也未代 Henry 作人眼主观验收。**3b 交付停在第二级，真实验收归走查③。**
- 本次专用 5181 fixture 已结束，回连验证端口关闭；隔离 Chrome profile 已清理。未 commit / push / PR / merge；开工已有未跟踪的 `.claude/settings.local.json`、用户走查/扳机审计与会议材料保持原状。工作树交 HQ。
