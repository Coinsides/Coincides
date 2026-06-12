# V2.BN.8 Experience Review

## V2.BN.8.1 L8 Layout Interaction Controller Experience Note

```text
L8 layout interaction controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变 Layout 按钮、Snap alignment 开关、snap guide 显示或 drag / resize 行为，只改变 layout interaction state 的归属。
- 如果后续出现 Layout 按钮状态不亮、Snap alignment 开关不更新、snap guide 残留、或拖拽/缩放时 guide 不出现，应优先检查 `hooks/useLayoutInteractionController.ts` 与 `hooks/useBlockPlacementInteractions.ts` 的 setter 边界。
- 本次没有改变 snap / elastic avoidance 算法；它只是先把这些开关和 guide state 从 runtime 主文件中剥离。

## V2.BN.8.1 L8 Canvas Surface Pointer Controller Experience Note

```text
L8 canvas surface pointer controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变空白点击取消选中、双击空白创建 draft、snap on/off 新 block 落点的体验，只改变这些 surface pointer handler 的归属。
- 如果后续出现点击普通 block 却被取消选中、点击面板/按钮误清 selection、双击空白不出 draft、或 snap on/off 下 draft 位置异常，应优先检查 `hooks/useCanvasSurfacePointerController.ts`。
- 这一步还没有实现 pan / zoom / viewport pointer capture；它只是先把 PageFrame 空白创建与 surface click clearing 从 runtime 主文件中剥离。

## V2.BN.8.1 L8 Block Selection Controller Experience Note

```text
L8 block selection controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变单击选中、进入文本编辑、空白处取消选中、drag / resize 后保持选中的体验，只改变 selection lifecycle 的归属。
- 如果后续出现 block 选中态丢失、toolbar 不出现、文本 focus 后不能编辑、空白点击不取消选中、或 move / resize 后 interaction debug state 错乱，应优先检查 `hooks/useBlockSelectionController.ts` 与它传给 draft / slash / placement hooks 的 setter 边界。
- 本次没有完成 L8 的全部 Interaction Controller：双击创建策略、snap policy、elastic avoidance、Ctrl+Z / Ctrl+Y 等仍属于后续替换层。

## V2.BN.8.1 L8 Draft Block Controller Experience Note

```text
L8 draft block controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变双击空白创建 draft、draft 自动聚焦、draft 文本高度扩张、Ctrl+Enter 保存、blur 保存或空草稿消失的体验，只改变 draft lifecycle 的归属。
- 如果后续出现双击空白不出光标、draft 不自动 focus、输入长文本时草稿高度不扩张、空草稿残留、blur 后没有保存、或 `/` 从 draft 创建 block 异常，应优先检查 `hooks/useDraftBlockController.ts` 与 `hooks/useSlashCommandController.ts` 的边界。
- 本次没有实现 create block / delete empty draft 的 undo；L11 目前仍只覆盖 placement move / resize 的撤回重做 seed。

## V2.BN.8.1 L10 Surface Mode Controller Experience Note

```text
L10 surface mode controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变 Page / Canvas 按钮、label、active 状态或模式切换后的视觉结果，只改变 mode state / policy / toggle side effects 的归属。
- 如果后续出现 Page / Canvas label 错误、模式切换后浮层残留、snap guide 残留、或已选中 block 没有取消选中，应优先检查 `hooks/useSurfaceModeController.ts`。
- 本次不实现 pan / zoom / viewport scroll 接管；Canvas mode 的双滚动条、workspace fill、PageFrame boundary 等体验问题仍属于后续 L3/L10 深化验收。

## V2.BN.8.1 L9 Floating Overlay Controller Experience Note

```text
L9 floating overlay controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变 Insert / Preview / Info / More 的视觉与入口，只改变顶部 chrome / floating overlay state orchestration 的归属。
- 如果后续出现多个浮层同时打开、Preview 关闭后 overlay toggle 丢失、折叠 top chrome 后状态残留、或 interaction debug state 不回 idle，应优先检查 `hooks/useFloatingOverlayController.ts`。
- 面板 JSX 仍在 `NoteCanvasRuntime.tsx` 中，本次只是先迁出状态控制；后续是否迁入 `FloatingOverlayLayer` / `NoteChromeLayer` 需要结合 L9 继续收口。

## V2.BN.8.1 L9 Slash Command Controller Experience Note

```text
L9 slash command controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变 slash command 的视觉和交互，只改变 slash state / controller 的归属。
- 如果后续出现 slash menu 不出现、位置跳到页面顶部、Esc 不能关闭、Ctrl+Enter 保存异常、或 block 转换后焦点丢失，应优先检查 `hooks/useSlashCommandController.ts`。
- `SlashMenuLayer.tsx` 和 `overlayService.ts` 仍分别负责菜单渲染与 anchor 计算；本次没有完成完整 overlay portal，也没有迁出 note info / more actions / insert panel / preview 的状态。

## V2.BN.8.1 L8 Placement Interaction Session Experience Note

```text
L8 placement interaction session hook: implemented, not browser-smoked
```

体验风险：

- 本次迁出理论上不改变 drag / resize 手感，只改变 pointer session lifecycle 的归属。
- 如果后续出现拖动不落盘、松手后仍处于拖动状态、resize 后 snap guide 不消失、move / resize 撤回重做异常，应优先检查 `hooks/useBlockPlacementInteractions.ts`。
- 这一步还没有把 selection、blank double-click draft creation、surface pointer handling 迁入 controller；它只迁出 block move / resize session 编排。

## V2.BN.8.1 L3 Content Width Hook Experience Note

```text
L3 content width observer hook: implemented, not browser-smoked
```

体验风险：

- 本次迁出理论上不改变视觉行为，只改变 content width 监听归属。
- 如果后续出现 Page mode block 宽度异常、Canvas mode workspace 宽度异常、sidebar 收起后页面没有自动填充、slash menu / draft layout 宽度偏移，应优先检查 `hooks/useCanvasContentWidth.ts`。
- 这一步尚未证明真实 viewport/pan/zoom 行为；它只是把未来 viewport 接管前的一段 DOM observer 从主 runtime 中剥离。

## 负责什么

本文负责 V2.BN.8 / V2.BN.8.x 的体验验收。

核心问题：

```text
新 Canvas Engine 的体验是否至少接近 V2.BN.1-V2.BN.5 已经磨出的稳定效果？
如果没有，差在哪里？
如果超过了，超过在哪里？
```

## 不负责什么

- 不替代工程 review；
- 不记录完整 benchmark 数据；
- 不定义底层 architecture；
- 不做 Henry acceptance 代签。

## 体验基准

必须对比旧 runtime 的这些成功经验：

- natural writing；
- block resize / text reflow；
- slash command；
- block control bar；
- preview/debug overlay；
- structured field editing；
- PageFrame / workspace boundary；
- type/AI/export badge on demand。

本轮调研后的体验路线：

```text
第一版先恢复旧 runtime 已经证明有效的自然写作手感；
再用 NoteCanvas runtime 解决旧实现反复出现的坐标、overlay、measurement、workspace 边界问题；
不为了无限画布感牺牲普通写作体验。
```

## Review 表

| 场景 | 当前体验 | 与旧 runtime 对比 | 风险 | 下一步 |
| --- | --- | --- | --- | --- |
| NoteCanvas 打开 | Pending | Pending | Pending | V2.BN.8 implementation 后填写 |
| PageFrame 写作 | Existing runtime preserved | 与旧 runtime 一致 | 新 engine seed 尚未接管 interaction | V2.BN.8.1 继续拆 engine shell |
| workspace 创建 block | Existing runtime preserved | 与旧 runtime 一致 | 仍是旧 NoteDetail 模拟 workspace | V2.BN.8.1 迁移到 engine runtime |
| resize/reflow | Existing runtime preserved | 与旧 runtime 一致 | 旧 runtime 的 measurement 仍在 NoteDetail 内 | 后续抽到 measurement service |
| slash menu | Existing runtime preserved | 与旧 runtime 一致 | caret anchor 仍未进入 engine overlay contract | 后续 overlay portal 化 |
| formula/definition | Existing runtime preserved | 与旧 runtime 一致 | structured field 的展开仍靠现有 measurement | 后续统一 content measurement |
| preview/debug overlay | Existing runtime preserved | 与旧 runtime 一致 | overlay 还没有和 engine z-index service 合并 | 后续统一 overlay layer |
| pan/zoom | Pending | New capability | Pending | V2.BN.8 implementation 后填写 |

## 本次体验结论

本次第一版 engine seed 是“地基接入”，不是视觉重写。用户能看到的写作体验基本保持现状，变化主要在内部：页面开始拥有明确的 NoteCanvas runtime model、PageFrame model、block placement 世界坐标和可见窗口计算入口。

这符合 V2.BN.8 的保守策略：先不要牺牲已经磨出来的普通写作体验，再逐步把坐标、overlay、measurement、workspace 边界从 `NoteDetail` 中拆出去。

## V2.BN.8.1 Experience Baseline

```text
L0 baseline: completed
L1 clean local smoke data: completed
active smoke note: V2.BN.8.1 Smoke Note
```

体验基线更新：

- 当前 smoke Note 是干净 note，不继承旧 `better_notebook_layout` payload；
- 下一轮体验测试应从空 note 创建 text / definition / formula / code blocks；
- 如果新 runtime 的表现低于 V2.BN.5 旧 runtime，需要记录为 regression，而不是把旧数据问题当作原因；
- Henry 手动确认之前，V2.BN.8.1 体验验收不能标记 passed。

## V2.BN.8.1 L3-L5 Experience Risk Note

```text
L3/L4 service extraction: implemented, not browser-smoked
L2 data adapter seed extraction: implemented, not browser-smoked
L5 placement service extraction: implemented, not browser-smoked
L7 measurement seed extraction: implemented, not browser-smoked
L6 block projection layer: implemented, not browser-smoked
L9 slash menu / preview / block control bar / source reference overlay seed: implemented, not browser-smoked
L8 interaction controller seed: implemented, not browser-smoked
L10 mode policy seed: implemented, not browser-smoked
L11 placement history seed: implemented, not browser-smoked
```

体验风险：

- PageFrame height 现在不再被 Canvas workspace 高度撑开，理论上应减少 Canvas mode 巨大空白；
- workspace block 不应继续影响 formal PageFrame height，但还需要浏览器里创建 workspace block 验证；
- placement 读写、snap、reflow 已迁入 service，理论上行为应保持不变；
- note/block/template/source-anchor API 胶水已进入 `hooks/useNoteCanvasDataAdapter.ts`，理论上不改变写作体验；
- 如果后续出现 note 加载、标题保存、manual insert、block 保存/转换/删除、source jump 异常，应优先检查 `hooks/useNoteCanvasDataAdapter.ts`。
- textarea resize、DOM measured height、text estimated height 已进入 measurement service / hook seed；
- measured height / resize width 后的 placement reflow application 已进入 `measurementService.ts`；
- 如果后续出现 block 位置、snap、reload 后布局变化，应优先检查 `placementService.ts`。
- 如果后续出现 Definition / Formula 展开穿模、resize 后下方 block 推开异常，应优先检查 `measurementService.ts`、`hooks/useBlockMeasurement.ts` 和后续 measurement registry。
- 如果后续出现 Definition / Formula 内容保存、plain text、preview 文本不一致，应优先检查 `blockContentService.ts`、`blocks/DefinitionBlockProjection.tsx` 和 `blocks/FormulaBlockProjection.tsx`。
- 如果后续出现 paragraph / heading / code / quote textarea 输入异常，应优先检查 `blocks/TextBlockProjection.tsx`。
- 如果后续出现 resize handle 异常，应优先检查 `layers/BlockResizeHandleLayer.tsx`。
- 如果后续出现 block shell 视觉/操作异常，应优先检查 `layers/BlockEditorLayer.tsx`。
- 如果后续只出现 block type、AI visibility、export status、Page boundary badges 异常，应优先检查 `layers/BlockStatusBadgeLayer.tsx`。
- 如果后续只出现 block control bar 的移动、导出、AI 可见性、保存、删除按钮异常，应优先检查 `layers/BlockControlBarLayer.tsx`。
- 如果后续只出现 source reference badge 或 View source jump button 异常，应优先检查 `layers/BlockSourceReferenceLayer.tsx`。
- 如果后续出现 slash menu 样式或点击回调异常，应优先检查 `layers/SlashMenuLayer.tsx`。
- 如果后续出现 slash menu 定位异常，应优先检查 `overlayService.ts`。
- 如果后续出现 export preview 面板、overlay toggle、preview group list 异常，应优先检查 `layers/ExportPreviewLayer.tsx` 和 `exportPreviewService.ts`。
- 如果后续出现“选中 / 编辑 / 拖动 / 缩放状态看起来错乱”，应优先检查 `interactionController.ts` 和 canvas root 上的 `data-canvas-interaction-*` debug attributes。
- 如果后续出现 block drag/resize 时 snap、弹性避让或宽度计算异常，应优先检查 `interactionController.ts` 的 drag/resize layout calculation helpers。
- 如果后续出现 drag / resize 松手不落盘、pointerup 后仍在拖动、或窗口外松手状态残留，应优先检查 `interactionController.ts` 的 `attachWindowPointerSession` 以及 `NoteCanvasRuntime.tsx` 里的 finish callbacks。
- 如果后续出现 Page / Canvas 切换、workspace block 可见性、双击空白落点或弹性避让规则不符合预期，应优先检查 `modePolicyService.ts`。
- 如果后续出现 Ctrl+Z / Ctrl+Y 对 move / resize 的撤回重做异常，应优先检查 `hooks/usePlacementHistory.ts` 和传入它的 layout draft / persistence callbacks。
- 本轮有一个有意的体验变化：Page mode 且 snap alignment 开启时，双击空白创建 draft 会进入自然写作流；snap 关闭或 Canvas mode 下才使用双击位置。

## 同步规则

- 每次视觉/交互 patch 后更新本文。
- Browser smoke 后更新本文。
- 如果体验低于旧 runtime，必须同步 `Review.md` 和 `Canvas-Engine-Fallback-Strategy.md`。
- 如果体验规则稳定，收口时考虑 promotion 到 UX Inventory 或 interaction contract。
