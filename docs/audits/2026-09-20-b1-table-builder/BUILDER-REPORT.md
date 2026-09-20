> **状态 (Status)**: completed（builder 施工交付；两项 Python 环境验证与 HQ 双门待收口，不代表放行）
> **日期**: 2026-09-20
> **范围**: B1 表格块二轮；依据工单补遗一恢复施工。

# B1 二轮施工回执

表格块、编辑器、CSV/TSV 导入、现役撤销、A1 整块分页、打印/Overview/导出同源、纸内检索、九行三列中文阳性样张和操作说明书已落工作树。原先 read_note schema 冲突按补遗一消解：实际 `kind:'table'`，内容只入既有 `text`，零新输出键。真正结构化 rows/headers 投影留 C 波，本单未碰注册表或 executor。

## 实现与逐件入口

以下行号以本轮完成时的工作树为准。服务端完整行号与校验证据另见 [SERVER-TABLE-EVIDENCE.md](./SERVER-TABLE-EVIDENCE.md)，新 UI 的细节见 [UI-TABLE-EVIDENCE.md](./UI-TABLE-EVIDENCE.md)。

| 对象 | 入口与结果 |
|---|---|
| 类型与模板 | `shared/types/index.ts:551,621,631` 的 `legacy_block_type`、`media.table` 和 legacy 映射；`server/src/lib/noteBlockTemplates.ts:125` 同形模板，媒体族、禁止 proposal/source-reference；零依赖变更 |
| 服务端 payload | `server/src/validators/tableBlock.ts`；`validators/index.ts`、`services/noteBlockLifecycle.ts` 的创建与重放、`services/noteBlockContent.ts` 的合并后更新校验；generic hydration 保留 payload |
| Agent 读面 | `server/src/services/tableBlocks.ts` 扁平化；`services/agentReadSurfaces.ts` 既有块读投影，严格 schema 实测通过 |
| 表格内容适配 | `client/src/pages/Notes/canvasEngine/blockContentService.ts:172,191,205,221,233`：纯 payload 与扁平文本；表格不转 TextFlow、不作为空文字丢弃 |
| 数据保存 | `hooks/useNoteCanvasDataAdapter.ts:1768`：走既有普通块 PUT，`content_json` 完整快照，`plain_text:null`；现有写等待与路由世代隔离；`:1418` 新建失败沿媒体回滚，避免孤块 |
| 创建与编辑接线 | `hooks/useNoteCanvasRuntimeController.ts:503,633`、`hooks/useNoteCanvasLayerProps.ts:232`；`layers/NoteWritingSurfaceLayer.tsx:1912,1950` 的 Table 按钮与创建浮层；`layers/BlockEditorLayer.tsx:481,557,637` 双击、投影与保存 |
| 撤销 | `hooks/useTableBlockHistory.ts:17`，接现役 `usePlacementHistory` lane / reversibleEdit；一次成功 Save 对应一次整表 before/after，失败不吞历史，note/generation 切换后不重放旧写；创建沿既有 createdBlock 历史 |
| CSV 与编辑器 | `tableBlockService.ts:15,56,84`；`blocks/TableBlockEditor.tsx:18,83,105`：单元格/caption、增删行列、表头升降、取消/保存/错误保留及解析 |
| 渲染与实测 | `blocks/TableBlockProjection.tsx:6` + 同名 CSS；`measurementService.ts:101` 初始估高，BlockEditor 仅对含 textRange 的片段关闭实测，所以 table 仍走 DOM 高度测量 |
| 分页 | `notePageFlowService.ts:22` 将 table 与 image 同映射为 media；复用既有 A1 原页/整块下移/超高独占页及结构化 overflow；零另造分页器、零坐标契约变更 |
| 打印/总览/导出 | `layers/NoteReadOnlyPageContent.tsx:71` 传 tablePrint；`layers/ExportPreviewLayer.tsx:38,69,131` 同一 TableBlockProjection；同一 flow plan、原生 table 内容与片段几何 |
| 检索 | `noteNavigationSearch.ts:42` 优先读当前 payload 的 caption/header/cell，不读过期 plain_text 或旧文字草稿，保留现役页号与导航逻辑 |
| 阳性件 | `fixtures/xiningReformsTable.ts:4`；[xining-table.html](./xining-table.html) 为实际 React 投影、实际 CSS 和默认/静墨/暖纸三皮的自足静态复刻，非可编辑应用 |
| 说明书 | `docs/agent-ops/current-state/app-operating-manual.md:37` 起五条 B1 操作、API、导入、分页/打印边界和读面说明已更新 |

表中未带前缀的客户端路径均相对 `client/src/pages/Notes/canvasEngine/`。

## Payload、格式与用户可见边界

`block_type:'table'`；`content_json:{caption?:string,headers:string[],rows:string[][]}`。1–64 列、0–64 **数据行**，另可有一表头；无表头时至少一数据行。所有行矩形，单元格是纯字符串，允许空字符串与换行。caption+headers+rows 的 UTF-16 code units 合计 ≤65,536；仅允许这三个 payload 键。无公式、合并格、列类型或格内 TextFlow。

read_note 的 text 格式：非空 caption 一行；存在表头则 TAB 分隔一行；rows 每行以 TAB 分隔，以 LF 接行。caption/单元格内 CRLF、TAB、CR、LF 换成空格。这是明确的有损检阅投影，不宣称结构化读取。检索同样从当前 payload 派生文本。

CSV/TSV 支持引号内分隔符/换行、双引号转义、BOM、CRLF/CR 归一；引号外 TAB 优先，否则逗号；短行补空串。多行分隔文本粘贴自动替换网格并保留 caption，单列/单行可显式 Import grid。错误或超限保留原表。表头开关升/降首行，64 数据行已有表头时拒绝关闭，避免暗丢行。保存前修改属于浮层草稿；一次保存将全部结构/单元格编辑归为一次现役撤销。

字体比文档正文小 2px；表头加重底纹，行界 1px token 发丝线，隔行轻底纹，自动列宽。宽表只在块内横滚。打印/导出从左边缘按块宽裁切，不打印滚动条；超高表格沿 A1 保留高度与 overflow 声明，不跨页断行。用户需在成品前调整内容或纸型并检查裁切。

## 已执行验证

新增功能测试合计 **客户端 43 项、服务端 9 项**，均为功能边界/行为回归，没有新设计安全对抗测试。

| 执行 | 实际结果与原始证据 |
|---|---|
| UI helper / editor / projection | 3 文件 **26/26**；[ui-targeted.log](../../../.codex-tmp/b1-table/ui-targeted.log) |
| 表格集成 + 新历史 hook + 既有历史 lane | 3 文件 **22/22**，含分页三态、真实 Overview/NotePrintLayer、搜索与实际 BlockEditor 双击；[client-table-integration-typefix.log](../../../.codex-tmp/b1-table/client-table-integration-typefix.log) |
| 客户端最终全库 | **209 文件、2109/2109**，包括 adapter 111 项与新增创建回滚；[client-all.log](../../../.codex-tmp/b1-table/client-all.log)、[退出回执](../../../.codex-tmp/b1-table/client-results.json) |
| 客户端生产构建 | `tsc -b && vite build`，exit 0；[build-client-final-node.log](../../../.codex-tmp/b1-table/build-client-final-node.log)、[退出回执](../../../.codex-tmp/b1-table/build-client-final-node-result.json)；保留既有包体/动态导入警告 |
| 文档最终检查 | 索引同步后 `docs:check` exit 0；[docs-check-final-node.log](../../../.codex-tmp/b1-table/docs-check-final-node.log)、[退出回执](../../../.codex-tmp/b1-table/docs-check-final-node-result.json) |
| 服务端 B1 / 模板回归 | B1 **9/9**；全量发现模板库存预期缺 table，修复后该文件 **59/59**；详见服务端证据 |
| 服务端首次全量 | **101 文件、1038 项：1035 pass / 3 fail**，零跳过、零 flaky retry；模板项已定向修复，另两项 Python 环境仍阻塞。未把分次结果拼成全量通过，未重跑服务端全量 |
| runtime 非 git/secrets 组件 | **23 组件全部执行、分次补验后 23 项均有通过回执**。首轮 20 绿/3 红，首轮结果保存在 [gate-results.json](../../../.codex-tmp/b1-table/gate-results.json)；其中客户端初次并发负载下单项 5s timeout，后来原样全库 2109/2109；新集成测试漏 `selectedPageFrameId` 已修复，最终 build exit 0；最终 docs:check exit 0。未宣称一次串行全绿 |

上述全库含现役 A1–A5、image、墙九条回归，未排除原有测试。23 组件精确名单与排除项见 [verification-inventory.json](../../../.codex-tmp/b1-table/verification-inventory.json)；分次退出码汇总见 [final-evidence-check.json](../../../.codex-tmp/b1-table/final-evidence-check.json)，该汇总不替代原始运行回执。服务端完整编译、工具面契约/parity、canvas 静态边界与性能等组件均在首轮通过。HQ 指定留后的 `git diff --check` / changed-file-secrets 不作为本轮完整门申报。额外一次 PowerShell 重定向构建虽然 Vite 完成，却因 stderr 警告被 shell 包装成 exit 1；最终用 Node 子进程记录真实 exit 0，上表引用后者，前者日志亦保留。

## 浏览器与样张

真实本地应用采用隔离 SQLite/assets，未动用户数据。已执行 Table 入口→九行三列 TSV→Ctrl+Enter 保存→双击编辑→撤销/重做与刷新；v2 夹具再验完整 Overview、搜索“将兵法”命中 Page 1、加到十列仅块内滚动、一次撤销回三列、重载仍九行三列。宽表 DOM 数据为 viewport 740 / scrollWidth 1240，document 1920 / scrollWidth 1920。v2 总览 clip left72/width760，内部 block left0；截图可见全部 caption/第一列。

首个新测试库未显式置 v2，默认 v1 造成总览左侧 72px 裁切；校正测试夹具后上述实测通过，没有借机改坐标九条。详见 [browser-journey.log](../../../.codex-tmp/b1-table/browser-journey.log)。该文件是工具观察的转录记录，不冒充自动化浏览器脚本日志。

阳性 HTML 的三张同源表均 9×3，七项生成结构检查全 true。实际应用渲染已视觉检查；HTML 的 @fs 浏览器打开被客户端拦下，未绕过；未另宣称静态文件独立视觉验收。原生打印预览/PDF 未亲跑，打印同源依据实际 NotePrintLayer 事件/DOM/几何集成测试与裁切 CSS。

## 未完成的验证与交接边界

1. `v2SourceMineruWiring.test.ts` 初始化 `python.exe` 为 ENOENT；`v2SourceRegionCells.test.ts` 固定 MinerU venv 的 uv 基座拒绝访问，exit 101。直接路径与 uv 离线诊断均证实访问受限；未改测试跳过、未装依赖/改权限。两项留 HQ 环境恢复后验证，完整日志与位置见服务端证据。
2. HQ 的 git/secrets 两组件与主观验收/放行仍待收口；本回执只报告 builder 工作树，**不宣称完整 runtime gate 或服务端全量全绿**。
3. C 波结构化 table 输出槽本单未做；没有新 Agent 写动词。注册表/executor、Relation、写门机制、TextFlow schema、page_frame_local 九条与依赖均未修改。现有普通块写入口的表格校验与客户端等待/历史接线属于本单内容实现。
4. git 写操作与 commit 均为 **0**。原始日志留 `.codex-tmp/b1-table/`，蒸馏件在本目录；既有一轮 STOP-REPORT 与工单 Result 原样保留。`docs/agent-ops/INDEX.md` 仅由生成器同步已有 A5/B1 头状态。
