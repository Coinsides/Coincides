# V2.BN.8 Review

## 负责什么

本文负责 V2.BN.8 / V2.BN.8.x 的工程质量 review：

- 当前实现状态；
- 已完成验证；
- 失败和风险；
- benchmark 结果；
- fallback trigger；
- Henry 必须拍板事项。

## 不负责什么

- 不替代 `Experience-Review.md`；
- 不替代 `CHANGELOG.md`；
- 不替代 acceptance。

## 当前状态

```text
Status: Research / route lock completed; first engine seed implemented
Code implementation: Minimal Canvas Engine model and NoteDetail bridge added
Canvas Engine branch: codex/v2-bn-canvas-engine
Recommended route: Self-owned Minimal Hybrid NoteCanvas Engine
```

## Review Checklist

- [x] Clean branch status recorded；
- [x] Canvas Engine Research R0-R9/Summary completed；
- [x] Engineering Spec updated；
- [x] Architecture Spec updated；
- [x] Interaction Contract updated；
- [x] State/Data Contract updated；
- [x] Spike/Benchmark Plan updated；
- [x] Fallback Strategy updated；
- [x] First Canvas Engine seed implemented；
- [x] Client build completed；
- [ ] Browser smoke completed when needed；
- [ ] Benchmark completed when needed；
- [x] Experience Review updated；
- [x] CHANGELOG updated；
- [ ] Document promotion / merge review completed at release close。

## 验证记录

```text
client build: passed
server build: passed
git diff --check: passed with CRLF conversion warnings only
changed-file secret scan: passed
browser smoke: blocked
  - browser-harness: Chrome remote debugging Allow prompt not accepted
  - bundled Playwright fallback: playwright-core package missing from runtime bundle
benchmark: not run yet
```

本次 browser-harness 连接 Chrome 时被 remote debugging 握手卡住，需要 Henry 在 Chrome 提示中允许远程调试后重试。随后尝试 bundled Playwright fallback，但本地 bundled runtime 中 `playwright` 缺少 `playwright-core`，无法启动。没有把浏览器验证伪装成通过。

## V2.BN.8.1 Runtime Replacement Progress

### L0 - Startup Gate And Baseline

```text
status: completed
branch: codex/v2-bn-canvas-engine
baseline commit before replacement work: 150fd28
client build: passed
server build: passed
```

L0 结论：

- 当前 branch 正确；
- `V2.BN.8` 局部文档区完整；
- `Open-Issue-And-Brainstorm-Checklist.md` 已经能作为 V2.BN.8.1 验收输入；
- `NoteDetail.tsx` 仍然承担旧 runtime 主体职责，包括 layout、measurement、selection、drag/resize、slash anchor、preview/overlay、Page/Canvas mode；
- `canvasEngine/` 仍是 seed，不是真正 runtime root。

### L1 - Local Test Data Reset

```text
status: completed
backup location: .codex-tmp/local-db-backups/20260612-155215
users: 1
courses/projects: 1
notes: 1
note_blocks: 0
documents: 0
source_snapshots: 0
uploads: cleared
```

L1 结论：

- 已停止本地 `3001` dev server 后备份旧 `server/coincides.db*`；
- 已备份并清空本地 `server/uploads` 测试文件；
- 已删除旧 dev database 并通过 `initDb()` 重建 schema；
- 已创建本地 smoke 账户、Project 和 Note；
- 后续 V2.BN.8.1 smoke 应从干净 note 开始，避免旧 `better_notebook_layout` payload 干扰。

### L2 - Runtime Root

```text
status: in progress
client build: passed
```

L2 已完成部分：

- 新增 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx`；
- 新增 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider.tsx`；
- 新增 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntime.ts`；
- `NoteDetail.tsx` 已退化为薄 route shell：
  - 读取 `noteId` route param；
  - 注入 `NoteCanvasRuntimeProvider`；
  - 渲染 `NoteCanvasRuntime`。

L2 尚未完成部分：

- `NoteCanvasRuntime.tsx` 内部仍保留 note/project API loading、navigation、save title 等页面级数据逻辑；
- 下一步需要继续抽出 data adapter，使 `NoteCanvasRuntime` 更接近纯 runtime root。

### L3 / L4 - Viewport, World, PageFrame And Workspace

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `viewportService.ts`：
  - `getPrimaryPageOffsetX(surfaceMode)`；
  - `createRuntimeViewport(surfaceMode, pageFrameHeight)`；
  - `createRuntimeWorld(surfaceMode, pageFrameHeight)`。
- 新增 `pageFrameService.ts`：
  - `createDefaultDraftLayout(...)`；
  - `calculatePageFrameHeight(...)`；
  - `createRuntimePageFrame(...)`。
- `NoteCanvasRuntime.tsx` 不再直接手写 viewport/world/PageFrame 构造。
- PageFrame 高度不再在 Canvas mode 下直接使用 `CANVAS_WORKSPACE_HEIGHT`。
- PageFrame 高度现在按正式页面内容计算：

```text
max(default page frame height, bottom-most in-frame block bottom + bottom padding)
```

仍需验收：

- Canvas mode 是否仍存在双滚动条；
- Canvas mode 是否保留 PageFrame boundary / margin；
- workspace block 是否不再撑高 formal PageFrame；
- sidebar 收起后 workspace 是否自动填充。

### L5 - Placement Service

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `placementService.ts`；
- 迁出 `NoteCanvasRuntime.tsx` 中的 placement 周边逻辑：
  - stored layout read；
  - workspace block 判断；
  - default block layout；
  - normalized block layout；
  - layout payload writer；
  - boundary kind；
  - export role / AI visibility effective state；
  - layout equality；
  - layout history entry；
  - stacked collision resolve；
  - measured-height reflow；
  - snap target / move snap。
- `placementService.ts` 使用泛型 `PlacementSeedBlock`，不直接绑定 `NoteBlock`，为后续 CanvasObject / image / shape placement 留入口。

仍需验收：

- 移动后 reload 位置是否保持；
- resize 后 reload 宽高是否保持；
- Page/Canvas 切换是否仍把 workspace block 夹回 PageFrame；
- snap on/off 是否只影响 placement 计算，不污染 content truth。

### L7 - Measurement And Reflow Service

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `measurementService.ts`；
- 迁出第一批 measurement seed：
  - textarea auto-height；
  - DOM content height measurement；
  - text block estimated height。
- `NoteCanvasRuntime.tsx` 仍保留 block-specific height wrapper，但不再直接写文本高度估算公式。

仍需验收：

- Formula input expanded/collapsed 是否触发稳定 measurement；
- Definition fields active/editing 是否稳定推开下方 block；
- resize width 后 text reflow 是否仍然稳定；
- measurement registry 尚未完成，当前仍是 service seed。

### L6 - Block Projection Layer

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `blockContentService.ts`；
- 新增 `layers/BlockEditorLayer.tsx`；
- 新增 `runtimeDataTypes.ts`；
- 从 `NoteCanvasRuntime.tsx` 迁出第一批 block content truth / projection helper：
  - `FieldValueRecord`；
  - `BlockPresentationKind`；
  - structured field reader；
  - definition / formula field extraction；
  - definition / formula save payload builder；
  - plain text projection；
  - block presentation kind detection；
  - formula preview text wrapper。
- `BlockEditor` 组件本体已从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine DOM projection layer。
- `NoteCanvasRuntime.tsx` 现在只负责把 block 的 runtime state 和 callbacks 传给 `BlockEditorLayer`。

仍需验收：

- `BlockEditorLayer` 内部仍包含 Source badge、policy badge、structured field editor、measurement callback；
- 下一轮可以继续把 block toolbar、structured field editor、source badge 拆成更小 projection sublayers；
- 需要 browser smoke 验证 definition / formula / code / source badge 的表现没有回归。

### L9 - Overlay Layer Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `layers/SlashMenuLayer.tsx`；
- 新增 `SlashMenuAnchor` runtime layout type；
- `NoteCanvasRuntime.tsx` 不再内联 `SlashMenu` 渲染函数；
- 新增 `overlayService.ts`；
- slash menu anchor 计算已从 `NoteCanvasRuntime.tsx` 迁入 overlay service；
- 主 runtime 只保留 slash trigger 和 command selection；
- slash menu rendering 进入 floating overlay layer seed；
- 新增 `exportPreviewService.ts`；
- 新增 `layers/ExportPreviewLayer.tsx`；
- export preview 的 model、row label、group rendering 已从 runtime 主文件迁出；
- `NoteCanvasRuntime.tsx` 现在只负责控制 preview 开关与 preview overlay callbacks。

仍需验收：

- overlay portal / z-index service 尚未建立；
- block control bar、note info、more actions、insert panel、source jump 等浮层尚未迁出；
- formula help tooltip 仍未进入统一 overlay layer。

### L8 - Interaction Controller Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `interactionController.ts`；
- 建立第一版 runtime interaction state：
  - `idle`；
  - `hoveringBlock`；
  - `selectedBlock`；
  - `editingText`；
  - `draggingBlock`；
  - `resizingBlock`；
  - `panningCanvas`；
  - `openingMenu`；
  - `previewing`。
- `NoteCanvasRuntime.tsx` 已开始在这些入口写入 interaction state：
  - block focus / select；
  - block drag start / drag end；
  - block resize start / resize end；
  - draft editing；
  - slash menu；
  - preview / note info / more actions / insert panel。
- canvas root 现在输出 debug data attributes：
  - `data-canvas-interaction-mode`；
  - `data-canvas-interaction-target`；
  - `data-canvas-interaction-block`。

仍需验收：

- 目前 interaction controller 仍是 state boundary seed，真正的 drag/resize pointer math 仍在 `NoteCanvasRuntime.tsx`；
- 后续需要继续把 begin move / begin resize / blank click / keyboard undo 的 controller 行为迁出；
- 需要 browser smoke 验证 interaction debug state 不影响现有手感。

### L10 - Page / Canvas Mode Policy Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `modePolicyService.ts`；
- 集中处理第一批 Page/Canvas policy：
  - mode label / next mode label；
  - primary page offset；
  - Page mode 是否隐藏 workspace blocks；
  - Page mode 是否允许 page collision resolve；
  - elastic avoidance 触发条件；
  - blank double-click draft placement。
- `visibleBlocks` 不再在 runtime 主文件里直接判断 `surfaceMode === 'page'`；
- 双击空白创建 block 的规则进入 mode policy：

```text
snap on + Page mode -> 使用自然写作流的 default draft layout
snap off 或 Canvas mode -> 使用双击位置创建 draft
```

仍需验收：

- Canvas mode 的全局 scroll / workspace fill / PageFrame boundary 仍需要浏览器验证；
- mode policy 还没有接管完整 pan / zoom / viewport scroll 行为；
- Page mode 和 Canvas mode 的 toolbar / shell CSS 仍在主 runtime JSX 内。

## Henry Must Decide

- 是否确认第一版主路线为 self-owned minimal hybrid NoteCanvas Engine；
- PageFrame 外 workspace block 是否第一版就允许真实创建和保存；
- V2.BN.8.1 是否接受先以 engine shell 稳定为第一优先级，视觉细节随后补齐；
- 如果自研 Canvas Engine 失败，是否先回退有限大画布，还是重新评估 BlockSuite / tldraw 局部接入。

## 同步规则

- 每个小版本收口时更新本文。
- Benchmark 或 browser smoke 失败时更新本文。
- 工程风险变成体验风险时同步 `Experience-Review.md`。
- 路线风险触发时同步 `Canvas-Engine-Fallback-Strategy.md`。
