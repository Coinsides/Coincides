> **状态 (Status)**: active
> **层 (Layer)**: audit / builder evidence
> **日期 (Updated)**: 2026-09-19
> **权威 (Authoritative)**: 否；施工依据为 A2 工单和 note-page-design

# A2 装订实现与考古记录

开工读取 AGENT_CONTEXT、方向宪章、current-state、active ADR 与 A2 工单，再对照 `design/note-page-design.md` §〇、§2.3、§四.1。工作树基准 HEAD 为 `6e69af099da16e296d350fe5f488a3a015636dbc`。仓库有 `.codegraph`，但当前 shell 无 `codegraph` 命令、工具目录无可调用 CodeGraph；`rg` 也不可用，采用限定目录的 PowerShell 文件读取和 Select-String。没有重新索引。

## 先考古，再接线

- `documentPageFlowService.ts:114` 的 `resolveDocumentPageFlowPlan` 是 A1 内容流到页序列的投影；`hooks/useNotePageFlow.ts:11` 管理现役测量 / 分页接线。两文件零修改。A1 生成的当前机械序列进入 engineModel 后，装订按序重投影，不向 TextFlow 或页帧写显示页码。
- `pageFrameSlotService.ts` 原有 header/footer/page_number 槽族与几何函数继续使用。新增六位置 `entries`，旧 header/footer/pageNumber 为同一槽对象的兼容别名；唯一枚举函数去除别名重复渲染。不是第二套槽引擎。
- 原 header 槽顶距 18、高 30；A2 页脚六位置中的下排复用原页码底距 38、高 22，各行按版心宽分三栏。默认脚中页码基线不变。旧低层无 binding 参数的调用继续保留 legacy 三槽行为，正常笔记 runtime 显式传入 null / 设置以启用 A2 默认六槽。
- A1 会保留已有持久页帧；测试只声明在 A1 当前返回页序列上的自动重投影，不声明本单新增了空页清理或分页删除策略。

## 逐件实现定位

以下路径省略共同前缀 `client/src/pages/Notes/canvasEngine/`；数据库、API 完整字段表见 [server-model.md](./server-model.md)。

| 工单项 | 实现位置 | 行为 |
|---|---|---|
| 笔记级设置、默认段、封面钩子 | `shared/types/noteBinding.ts:36`, `:46`, `:54`, `:67` | version 1；SQL null 按需投影施工默认，整体/手填/页码分别可关；不创建封面 |
| 段界与显示计数器 | `pageFrameSlotService.ts:59`, `:78`, `:191` | 1 基机械页号；段首含、下一段首不含；显示计数器可重启，阿拉伯/大小写罗马，前缀+N+后缀 |
| 六槽复用及统一投影 | `pageFrameSlotService.ts:191`, `:249`, `:262`; `types.ts` 的 PageFrameSlot / PageFrameSlots | 页码占用所选槽，关闭/换槽后恢复原手填值；偏移和样式留在段级设置 |
| 接 A1 runtime | `engineModel.ts:195`, `:363`; `hooks/useRuntimeFrameModelController.ts`; `hooks/useNoteCanvasLayoutModel.ts` | 每个机械页按当前几何生成装订槽；设置变化进入 memo 依赖 |
| 独立读与读失败重试 | `hooks/useNoteBinding.ts:9`; `hooks/useNoteCanvasRuntimeController.ts:203`, `:497`, `:596` | 独立人用子资源，不扩通用 Note/Agent 响应；载入中和失败时不显示错误默认装订，不允许保存覆盖 |
| 保存生命周期与顺序 | `hooks/useNoteCanvasDataAdapter.ts:910` | 复用现役 writeRegistry.hold；同笔记串行 HTTP 保存，旧 route / hydration 响应不覆盖新笔记；hook 另用 generation 与序号防迟到 UI 响应 |
| 人用设置面 | `layers/NoteChromeLayer.tsx:450`, `:759`; `layers/NoteBindingPanel.tsx:11` | 工具条「装订」；增删段、起始页、不可删除 N、换槽、六槽手填、微调与样式；失败保留草稿；已关闭实例的保存回包不会关闭新面板 |
| 默认皮+槽覆写 | `layers/PageFrameSlotsLayer.tsx:7`; `../NoteDetail.module.css` 的 pageFrameSlot | 默认 label-font / ink-muted；字族、字号、字重、语义色、斜体逐槽覆写；恢复皮清空 style |
| 阅读 / 打印 / Overview 同槽 | `layers/NoteReadOnlyPageContent.tsx:44`; `layers/NotePrintLayer.tsx:52`; `layers/NotePageThumbnail.tsx:40` | 三面共用 PageFrameSlotsLayer；只读页减去 frame 原点，阅读投影再接折缝显示位置，打印和缩略图用原始页几何 |
| 折缝 | [fold-evidence.md](./fold-evidence.md) | 仅压缩正页间距；保留页高 / 墙；页间件+视图菜单；Web 隐藏；打印/缩略图不折 |
| 操作说明 | `docs/agent-ops/current-state/app-operating-manual.md:31` | 六条使用与 API 说明：入口、段界、页码、槽样式、封面预留、折缝 |

`useNoteBinding` 只是该人用子资源的加载/重试状态；保存仍由原 data adapter 与既有 writeRegistry 承载。同笔记保存队列沿用相邻皮设置保存的现役模式，没有另造写门、事务门或持久化恢复仓。`PageFrameSlotsLayer` 是已有槽数据的共用 renderer，没有另存槽真相。折缝副本和开关仅是临时阅读呈现。

## 验证覆盖与边界

`pageFrameSlotService.test.ts` 18 例涵盖默认六槽、段界/重启、三制式、前后缀、六个换槽目标、异形几何、覆写、开关、封面静默、别名枚举，以及直接调用 A1 plan 后长文/短文/窄纸重投影。`BindingProjection.test.tsx` 使用真实 engineModel 和 React renderer 验证阅读、打印、Overview 六槽与样式。`NoteBindingPanel.test.tsx` 覆盖保存参数、失败重试、关闭竞态和小数输入的浏览器原生有效性；`useNoteBinding.test.tsx` 覆盖异步读写、跨笔记迟到和重试；data adapter 既有皮测试文件增加装订保存串行回归。未增加安全对抗测试。

静态 `canvasRuntimeBoundaryCheck.mjs` 原先要求写入层直接出现三槽 DOM，现改为追踪到被抽出的统一 renderer，同时检查 writing surface 的 map / renderer 接线；不是删掉槽契约断言。`BoardPage.unboxing.test.tsx` 严格请求账本仅补明确的装订 GET 响应，没有放宽未知请求检查。`server/package.json` 仅将新增 A2 功能测试接入原测试清单，无新增依赖。

本次没有修改 Relation 域、Agent 能力/注册表、写门实现、TextFlow 真相 schema、page_frame_local 九条或分页计算。实际 React/jsdom 和源代码测试不是浏览器像素/主观验收。完整测试数字及未绿项以 [verification.md](./verification.md) 为准。
