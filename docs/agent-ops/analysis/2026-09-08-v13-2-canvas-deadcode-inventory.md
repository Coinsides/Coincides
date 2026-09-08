> **状态 (Status)**: frozen
> **层 (Layer)**: 分析 / 退役清册
> **日期 (Updated)**: 2026-09-08
> **权威 (Authoritative)**: 否；单 5 工作树的文件/行级收据，13.6 删除前须重新确认引用
> **工单**: `../handoffs/2026-09-08-v13-2-s5-dual-mode-retirement-order.md`

# V13.2 单 5 · canvas 模式死代码清册

本单只断入口与现役新写，不删除实现、枚举成员、列或历史行。以下行号来自本单工作树。`E/` = `client/src/pages/Notes/canvasEngine/`；`CSS` = `client/src/pages/Notes/NoteDetail.module.css`。

活入口的收口点是 `E/canvasRetirementPolicy.ts:4–9` 与 `E/hooks/useSurfaceModeController.ts:48,71,102`：运行态始终 Page；旧自动切换和 toggle 本体仍在早退之后。`E/layers/NoteChromeLayer.tsx:402–414` 不挂载旧按钮，DOM 与可访问树均无切换入口。旧模型词汇和纯计算函数仍可由兼容测试调用；这不代表产品入口仍开放。

## 一 · 失去 canvas 产品入口的实现

| 文件:行 | 保留的本体 / 13.6 候选范围 | 删除边界 |
|---|---|---|
| `E/hooks/useSurfaceModeController.ts:41–47,72–99,103–109` | note-keyed 双模状态、首次 hydration 的 canvas-only 自动切换、toggle transition | 仅旧分支；Page hook、effect 与返回接口仍在使用 |
| `E/layers/NoteChromeLayer.tsx:402–414` | Page/Canvas pill JSX、回调、图标和 pressed 语义 | 被常量门隔离；`modePill` 同时服务 Preview/Layout，不能删样式全族 |
| `E/hooks/useNoteCanvasRuntimeController.ts:83,503`；`E/hooks/useNoteCanvasLayerProps.ts:127` | toggle 从 controller 到 Chrome 的传递 | 只清 toggle 传递，不整删 runtime/props 装配层 |
| `E/NoteCanvasRuntime.tsx:13–19,32` | canvas 模式外层文档 overflow 与 pageCanvas class | Page shell 和 routing 留用 |
| `E/layers/NoteRuntimeDocumentLayer.tsx:40` | documentShellCanvas 条件 class | 文档层、准备区、打印面留用 |
| `E/modePolicyService.ts:81–106,165,173–201` | canvas policy/next-mode、野地宽度、canvas 草稿 snap | Page policy、可见性兼容、page collision/书写留用 |
| `E/viewportService.ts:31,47–56,88–112` | canvas pageOffset、viewport seed、无限 world | 坐标工具仍供 Page、打印、历史诊断，不能整文件删除 |
| `E/hooks/useViewportTransformController.ts:32–87` | viewport state、pan/scroll/zoom/focus/reset 的 canvas 消费面 | 含 Page viewport 尺寸与共用算法；13.6 按调用点拆分 |
| `E/hooks/useCanvasContentWidth.ts:25` | canvas 扣 pageOffset 的宽度分支 | Page resize observer 留用 |
| `E/hooks/useCanvasSurfacePointerController.ts:66` | canvas 双击草稿无需 screen→local 的分支 | Page 点击、双击、选区清理留用 |
| `E/hooks/useBlockPlacementInteractions.ts:157` | workspace drag bounds | Page 布局交互留用 |
| `E/hooks/useRuntimeNaturalWritingController.ts:192–207,235–236,367–369` | canvasWorldSessionAuthority 与非 Page 草稿激活 | Page authority/选帧/自然书写不删；旧恢复收据仍能读 |
| `E/layers/NoteWritingSurfaceLayer.tsx:646–647,1017–1090,1151–1199` | canvas wheel/键盘 zoom、Space+拖动、中键 pan、世界 transform、pan session | Page keyboard、普通编辑和滚动不删 |
| 同文件 `:1213,1250,1866,1904,1975` | canvas page-frame/画物拖动、resize、空白上下文菜单的模式门 | 查各 handler 的共享调用者后才可清本体 |
| 同文件 `:2495–2504,2652,2674,3228–3244` | canvas overlay 锚、zoom handler、野地空白 drop | Page overlay 定位、准备区拖上纸不删 |
| 同文件 `:752–756,3292,3340,3369,3385` | 多帧 canvas 显示、世界尺寸、canvas frame DOM 分支 | Page 纸叠及测量机件留用 |
| 同文件 `:3591,3615,3647,3701` | canvas shape/image/table/connector 渲染分支 | 数据结构、历史读、准备区画物身份不删 |
| 同文件 `:3911–3957,3993` | canvas zoom 控件、canvas 专用 Inspector 注入 | Page reading controls `:3903–3909` 仍用 `canvasZoomButton`，必须保留 |
| `E/writingEntryVisibility.ts:60` | canvas 空白入口可见性 | Page 书写入口仍活 |
| `E/pageFrameTypographyService.ts:62` | canvas 沿用原 typography 的旁路 | Page 物理字号与显式 profile override 留用 |
| `E/placementService.ts:351,410` | canvas workspace 的布局宽度/归一化分支 | 读/坐标语义 v1/v2、Page normalization、几何兼容不删 |
| `E/shapeProjectionService.ts:82,317–318`；`E/imageObjectService.ts:33`；`E/tableObjectService.ts:41`；`E/engineModel.ts:254–273` | 无帧 workspace 生成器和 runtime reserve | 模型可读、纯构造器留存；现役发送统一经过 repository 新写门，不能把纯模型测试改成全 formal 来掩盖旧值 |

## 二 · 样式行级候选

| 文件:行 | 选择器 / 范围 | 13.6 注意 |
|---|---|---|
| `CSS:6–9,67–72,93–98,112–115` | `.pageCanvas` 及后代、`.documentShellCanvas` | 只清 canvas selector；合并规则中的 Page selector 留用 |
| `CSS:903–910,950–957` | `.pageCanvas .pageToolRail`、`.pageToolRailCanvas`、`.pageCanvas .insertPanel`、`.insertPanelCanvas` | 先对实际引用；普通 rail/panel 留用 |
| `CSS:1046–1050,1078–1085` | `.writingSurfaceCanvas`、`.canvasPanReady`、`.canvasPanning` | `.writingSurface` / `.pageReadingSurface` 留用 |
| `CSS:1139–1145`、`:1104–1137` 中 reset 专属 selector | `.canvasZoomSlider`、`.canvasZoomReset` | `.canvasZoomControl` (`:1087–1102`) 与 `.canvasZoomButton` 有 Page 复用 (`NoteWritingSurfaceLayer.tsx:3891,3903–3907`)，不得删；合并 hover/focus 规则只可拆 canvas 专属部分 |
| `CSS:1207–1215,1590–1600` | `.blockListCanvas`、`.scratchWorkspaceLabel` | Page block list 不删；最终行尾以 selector 花括号为界 |
| `client/src/styles/global.css:29–36` | `body.canvas-runtime-lock` 下两条应用滚动/外壳锁定规则 | class 由 `E/NoteCanvasRuntime.tsx:12–21` 管理；普通 app shell 样式留用 |

## 三 · 明确保留面

`E/types.ts:1–12`、`E/runtimeLayout.ts`、`shared/types/canvasSurfaceAuthority.ts` 的旧 mode/surface/boundary/export-policy union 保留。surface 分类器的 crossing 是几何事实；本单只在写 DTO / server 写门拒收，不改其读取/诊断语义。

`E/canvasPersistenceNormalizer.ts:124–178`、`E/placementService.ts:94–126`、`E/draftBlockPersistence.ts:192–315`、server Canvas mapper、历史 035、055/056、13.2 执行器/回滚/旗标、Source materializer、events、准备区及其 undo/redo 均不清理。`shape/image/table/connector` 类型、结构扩展与 CSS（如 `CSS:1310–1588`）不能仅凭名称含 canvas 宣判死亡。

`E/geometry.ts`、`pageFrameAffiliationService.ts`、`layoutAffiliationService.ts`、`exportPreviewService.ts`、`layers/ExportPreviewLayer.tsx`、AI tree、badge、Inspector 的历史识别/几何消费仍在，旧导出策略词不是新写 surface。清册不是授权删除这些活机件。

旧恢复队列仍完整读取、保留原收据；尝试恢复到 workspace/crossing 时，最终 placement repository 拒绝发送，现有失败保留逻辑继续负责待处理状态。没有静默挪入准备区、clamp 或改写旧收据。

验证中的历史模型样本仍保有 workspace/crossing；运行态切换预期按单 5 改为 Page。13.6 清理前须重跑 Page、准备区、坐标和 Source 回归，不能按本清册整文件批删。
