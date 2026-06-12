# V2.BN.8 Review

## V2.BN.8.1 L5/L7 Layout Draft Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useLayoutDraftController.ts`。
- `layoutDrafts` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `resetLayoutDrafts()` 已迁入 hook，并继续在 note loaded 时调用。
- `clearLayoutDraftForBlock()` / `setLayoutDraftForBlock()` 已迁入 hook，继续供 data adapter 在 trash / persist layout 时使用。
- `mergeLayoutDrafts()` 已迁入 hook，继续供 placement history undo / redo draft merge 使用。
- measured height -> layout draft reflow 已通过 `applyMeasuredBlockHeightDraft()` 进入 hook。
- resolved `blockLayouts` 暂时仍留在 `NoteCanvasRuntime.tsx`，原因是它需要 `visibleBlocks` / `contentWidth` / `surfaceMode`，而这些数据目前横跨 data adapter、surface policy 和 placement seed。强行迁出会制造新的依赖环。

仍需验收：

- block move / resize 后 draft 是否仍即时生效；
- block move / resize 后 reload 是否仍落盘；
- formula / definition measured height 变化是否仍推开后续 block；
- undo / redo placement history 是否仍能合并 draft；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Layout Interaction Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useLayoutInteractionController.ts`。
- `layoutMode` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `snapGuide` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `snapEnabled` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- Layout 按钮 toggle 逻辑已迁入 hook。
- Snap alignment toggle 逻辑已迁入 hook。
- toggle layout / snap 时清空 snap guide 的规则已集中到 hook。

仍需验收：

- Layout 按钮是否仍能进入/退出 layout mode；
- Snap alignment 开关是否仍能切换 On / Off；
- move / resize 时 snap guide 是否仍正常出现并清理；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Canvas Surface Pointer Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useCanvasSurfacePointerController.ts`。
- document shell 的空白点击取消 selection 已从 `NoteCanvasRuntime.tsx` 迁出。
- block list 的空白点击取消 selection 已从 `NoteCanvasRuntime.tsx` 迁出。
- PageFrame 空白双击创建 draft 的落点计算已迁入 hook。
- `createBlankDraftLayout()` 现在由 surface pointer controller 调用，不再由 runtime 主文件直接调用。
- 新 draft 落点仍使用当前 `surfacePolicy` / `snapEnabled` / `pageOffsetX` / `contentWidth` / `defaultDraftLayout`，保持行为不变。

仍需验收：

- 点空白处是否仍取消 block 选中；
- 点击 block / toolbar / input / panel 是否不会误清 selection；
- 双击 PageFrame 空白处是否仍创建 draft；
- snap on/off 下 draft 落点是否仍符合现有策略；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Block Selection Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useBlockSelectionController.ts`。
- block selection 的本地状态已从 `NoteCanvasRuntime.tsx` 迁出：
  - focus block；
  - active block；
  - selected block。
- clear selection / mark focused / mark selected 三个动作已迁入 hook。
- block focus 和 block select 仍会写入对应 interaction state。
- 进入 focus / select 前的 measurement suppression 仍由 runtime 注入 hook，避免本轮改变测量/重排行为。
- `NoteCanvasRuntime.tsx` 仍把 selection setter 传给 draft / slash / placement hooks，后续可继续把这些边界收口到更完整的 L8 controller。

仍需验收：

- 点击 block 后 toolbar / badge / active 样式是否仍正常；
- 文本 block focus 后是否仍进入编辑态；
- 空白区域点击是否仍取消选中；
- draft 创建后是否仍能 focus 到新 block；
- drag / resize 后是否仍保持 selected block；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Draft Block Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useDraftBlockController.ts`。
- draft block 的本地状态已从 `NoteCanvasRuntime.tsx` 迁出：
  - active state；
  - text state；
  - creating state；
  - focus nonce；
  - draft layout；
  - draft textarea ref；
  - draft text ref；
  - creating guard ref。
- draft focus / auto-height effect 已迁入 hook。
- `persistDraft()` 已迁入 hook，仍复用现有 `createBlock()` / `saveBlock()` API。
- `activateDraft()` 已迁入 hook，仍负责取消当前 active/selected block 并写入 `editingTextInteraction()`。
- empty draft discard 已迁入 hook，runtime 只在 blur 时决定调用它并清理 slash target。
- draft textarea height update 已通过 `resizeDraftFromTextarea()` 进入 hook。

仍需验收：

- server build；
- 双击空白创建 draft 后是否仍自动 focus；
- 输入 `/` 后 slash menu 是否仍正常；
- draft blur 后有内容是否仍保存成 block；
- draft blur 后无内容是否仍自然消失；
- `/formula` / `/definition` 从 draft 创建 structured block 是否仍正常；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L10 Surface Mode Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useSurfaceModeController.ts`。
- `surfaceMode` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `surfacePolicy` / `pageOffsetX` 派生已进入 surface mode controller。
- Page / Canvas mode toggle 的副作用已统一收口到 controller：
  - close overlay；
  - clear snap guide；
  - clear current block selection。
- `NoteCanvasRuntime.tsx` 不再直接调用 `createSurfaceModePolicy()` / `getNextSurfaceMode()`。

仍需验收：

- client build / server build；
- Page / Canvas toggle 是否仍保持原有视觉行为；
- Preview / Insert / Info / More overlay 是否在切换模式时正常关闭；
- snap guide 是否在切换模式时清空；
- selected block 是否在切换模式时取消选中。

## V2.BN.8.1 L9 Floating Overlay Controller Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useFloatingOverlayController.ts`。
- 顶部 chrome collapsed state 已从 `NoteCanvasRuntime.tsx` 迁出。
- Insert / Note info / More actions / Preview 的互斥打开状态已从 `NoteCanvasRuntime.tsx` 迁出。
- Preview debug overlay toggles 已从 `NoteCanvasRuntime.tsx` 迁出，并继续保持关闭 preview 后不丢开关状态。
- `NoteCanvasRuntime.tsx` 不再直接写入 `openingMenuInteraction('noteInfo' | 'moreActions' | 'insert')` 或 `previewingInteraction()`；这些 interaction state 由 floating overlay controller 管理。

仍需验收：

- Browser smoke 验证 Insert / Preview / Info / More 任意时刻仍只有一个打开。
- Browser smoke 验证关闭 panel 后 interaction state 能回到 idle。
- Browser smoke 验证关闭 Preview 后，block type / AI visibility / export status overlay 开关状态仍保留。
- Browser smoke 验证折叠 / 展开 top chrome 后页面工具仍可使用。
- 后续 L9 仍需决定是否把这些面板 JSX 继续迁入独立 `FloatingOverlayLayer` / `NoteChromeLayer`。

## V2.BN.8.1 L9 Slash Command Controller Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useSlashCommandController.ts`。
- Slash command 的 target state、命令列表、template availability 判断、draft/block change handler、Esc / Ctrl+Enter handler 和 command selection flow 已从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 不再直接拥有 slash trigger detection / command filtering / slash anchor calculation。
- `SlashMenuLayer.tsx` 继续负责菜单渲染；`overlayService.ts` 继续负责 anchor 计算。
- hook 边界显式接收 draft persistence、block save、template conversion、block text draft setter、focus setter 和 interaction state setter。

仍需验收：

- Browser smoke 验证 draft 中输入 `/` 时菜单仍出现在 caret 附近。
- Browser smoke 验证已有 block 中输入 `/definition` / `/formula` 仍能打开菜单并转换。
- Browser smoke 验证 Esc 能关闭 draft/block slash menu。
- Browser smoke 验证 Ctrl+Enter 在 draft/block 场景仍保持原行为。
- 后续 L9 仍需继续迁出 note info / more actions / insert panel / preview state 到统一 floating overlay controller 或 overlay portal。

## V2.BN.8.1 L8 Placement Interaction Session Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useBlockPlacementInteractions.ts`。
- block move / resize 的 pointer session lifecycle 已从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 不再直接拥有 `attachWindowPointerSession` 调用。
- drag / resize 仍通过 `interactionController.ts` 的 `calculateDraggedBlockLayouts` / `calculateResizedBlockLayouts` 执行核心布局计算。
- hook 边界显式接收 layout draft writer、history writer、persistence callback、measurement suppression refs 和 mode policy。

仍需验收：

- Browser smoke 验证拖动 block 的 snap / elastic avoidance 手感是否保持。
- Browser smoke 验证 resize block 后下方 block 是否仍能稳定 reflow。
- Browser smoke 验证 Ctrl+Z / Ctrl+Y 对 move / resize 的撤回重做是否仍然有效。
- 后续 L8 仍需继续迁出 blank click / selection / draft creation / mode transitions 等 interaction controller 行为。

## V2.BN.8.1 L3 Content Width Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useCanvasContentWidth.ts`。
- `NoteCanvasRuntime.tsx` 不再直接维护 content width state。
- `ResizeObserver`、`window.resize` 监听和 Page/Canvas mode 下的 available width 计算已迁入 hook。
- `canvasEngine/index.ts` 导出 `useCanvasContentWidth`，作为后续 viewport hook / viewport service 继续收口的入口之一。

仍需验收：

- Browser smoke 验证 sidebar 收起 / 展开后 Page mode 宽度是否仍然正确。
- Browser smoke 验证 Canvas mode 下 workspace 宽度是否仍然按 PageFrame offset 正常计算。
- 后续 L3 仍需把真实 viewport state、pan / zoom、world-screen transform 和 overlay anchor 统一起来；本次只迁出 content width observer。

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

- 新增 `hooks/useNoteCanvasDataAdapter.ts`；
- `NoteCanvasRuntime.tsx` 不再直接持有 note / blocks / template options / source anchors / block CRUD / title save 的 API state 和 API calls；
- `useNoteCanvasDataAdapter` 现在集中负责：
  - note / block loading；
  - runtime template options loading；
  - source anchor generation / loading；
  - title save；
  - create / save / convert / trash / reorder block；
  - block layout persistence；
  - source jump target loading。
- `NoteCanvasRuntime.tsx` 仍保留 route chrome、focus、draft、selection、placement draft、interaction state 和 canvas UI composition。

L2 仍需继续：

- data adapter 目前仍通过 callbacks 清理 runtime layout draft，后续可以用 provider/model boundary 继续收紧；
- `NoteCanvasRuntime.tsx` 仍然较胖，后续 L3-L11 需要继续迁出 viewport、measurement、interaction session 和 overlay state。

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
- 新增 `hooks/useBlockMeasurement.ts`；
- 迁出第一批 measurement seed：
  - textarea auto-height；
  - DOM content height measurement；
  - text block estimated height。
- 迁出 measured height / resized layout -> placement reflow application：
  - `applyMeasuredBlockHeightToLayouts`；
  - `applyMeasuredBlockLayoutToLayouts`。
- `BlockEditorLayer.tsx` 不再直接拥有 `ResizeObserver` / measured rect callback wiring。
- `NoteCanvasRuntime.tsx` 仍保留 measured height 的 state entrypoint，但不再直接拼装 measured height reflow。

仍需验收：

- Formula input expanded/collapsed 是否触发稳定 measurement；
- Definition fields active/editing 是否稳定推开下方 block；
- resize width 后 text reflow 是否仍然稳定；
- measurement registry 尚未完成，当前仍是 service + hook seed，runtime 仍持有 React state update 入口。

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
- 新增 `layers/BlockControlBarLayer.tsx`，把 block control bar 从 `BlockEditorLayer` 内联 JSX 中迁出。
- 新增 `layers/BlockSourceReferenceLayer.tsx`，把 source reference / source jump view entry 从 `BlockEditorLayer` 内联 JSX 中迁出。
- 新增 `layers/BlockStatusBadgeLayer.tsx`，把 block type / AI / export / boundary badges 从 `BlockEditorLayer` 内联 JSX 中迁出。
- 新增 `blocks/DefinitionBlockProjection.tsx`，把 Definition structured field editor / read projection 从 `BlockEditorLayer` 中迁出。
- 新增 `blocks/FormulaBlockProjection.tsx`，把 Formula preview / LaTeX input projection 从 `BlockEditorLayer` 中迁出。
- 新增 `blocks/TextBlockProjection.tsx`，把 paragraph / heading / code / quote textarea projection 从 `BlockEditorLayer` 中迁出。
- 新增 `layers/BlockResizeHandleLayer.tsx`，把 resize handle 从 `BlockEditorLayer` 中迁出。

仍需验收：

- `BlockEditorLayer` 内部仍包含 block shell 和 projection composition；
- 下一轮可以继续把 block shell / selected overlay anchor 边界拆出；
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
- 新增 `layers/BlockControlBarLayer.tsx`；
- block control bar 已从 block projection 主体中迁出，后续可继续接入 selected block anchor / overlay portal。
- 新增 `layers/BlockSourceReferenceLayer.tsx`；
- source reference / source jump view entry 已从 block projection 主体中迁出，后续可继续接入统一 source jump overlay。

仍需验收：

- overlay portal / z-index service 尚未建立；
- block control bar 仍使用当前 block 内部定位样式，尚未完全 viewport overlay 化；
- source jump 仍只是 view entry 抽层，尚未完全 viewport overlay 化；
- note info、more actions、insert panel 等浮层尚未迁出；
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
- `interactionController.ts` 新增第一批 drag/resize layout calculation helpers：
  - `calculateDraggedBlockLayouts`；
  - `calculateResizedBlockLayouts`。
- `interactionController.ts` 新增 `attachWindowPointerSession`，集中管理 window pointermove / pointerup session lifecycle。
- `NoteCanvasRuntime.tsx` 不再内联 drag move / resize move 的 layout math，也不再直接 add/remove window pointer listeners。
- `NoteCanvasRuntime.tsx` 仍保留 begin move / begin resize 的 session orchestration、finish callbacks 和 React state entrypoint。

仍需验收：

- 后续需要继续把 begin move / begin resize session orchestration 和 blank click 的 controller 行为迁出；
- 需要 browser smoke 验证 pointer session helper 没有改变 drag / resize 手感；
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

### L11 - State Persistence And Undo Boundary Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/usePlacementHistory.ts`；
- `NoteCanvasRuntime.tsx` 不再直接持有 placement undo / redo refs；
- `NoteCanvasRuntime.tsx` 不再直接注册 Ctrl+Z / Ctrl+Y keyboard listener；
- `usePlacementHistory` 现在集中负责：
  - move / resize 前后 layout snapshot 生成；
  - undo stack；
  - redo stack；
  - Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z；
  - 避开 input / textarea / select / contenteditable 内部输入时的快捷键冲突。
- `NoteCanvasRuntime.tsx` 仍提供：
  - `applyLayoutDrafts`；
  - `persistLayoutSnapshot`；
  - move / resize 完成时调用 `pushLayoutHistory`。

仍需验收：

- 需要 browser smoke 验证 move / resize 后 Ctrl+Z / Ctrl+Y 仍然稳定；
- create block / delete empty draft / convert block type 的 undo 仍未进入 L11；
- placement history 仍通过 runtime callback 持久化，后续可以进一步迁入 placement writer boundary。

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
