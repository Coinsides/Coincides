# V2.BN.8 Experience Review

## V2.BN.8.1 Runtime Block Editing Controller Experience Note

```text
Structured field draft update and measured height reflow now share a small block editing controller boundary.
```

体验判断：
- 这一步不应该改变用户可见行为；Definition 字段编辑、Formula 展开、文本重排和 measured height 推开下方 block 的体验应该保持原样。
- 工程价值是把“字段草稿更新”和“测量高度回流”收进一个 block editing controller，减少 runtime root 对底层 hook 的直接感知。
- Browser Harness 暂时不跑；等全部替换工作结束后再统一补真实浏览器验证。

仍需人工观察：
- Henry 后续复测 Definition / Formula 字段编辑、Formula input 展开、structured block active reflow 没有退化。
- 如果后续出现字段保存错位、Definition / Formula 展开穿模、或 resize 后下方 block 推开异常，优先检查 `hooks/useRuntimeBlockEditingController.ts` 的参数边界。

## V2.BN.8.1 Runtime Frame Model Controller Experience Note

```text
PageFrame, Canvas runtime model, relation endpoint reserve, and export preview composition now have a small frame model controller boundary.
```

体验判断：

- 这一步不应该改变用户可见行为；PageFrame 高度、Canvas mode 中的 formal frame、export preview 统计和 relation endpoint reserve seed 都应保持原样。
- 工程价值是把 L4 PageFrame / workspace model 的入口从 root controller 中标出来，后续如果要继续做 frame 高度、ruler、workspace 或 pan/zoom，就知道从这个边界进入。
- Browser Harness 暂时不跑；等全部替换工作结束后再统一补真实浏览器验证。

仍需人工观察：

- Henry 后续复测 Canvas mode 下 PageFrame 边界、Page mode 下高度延展、Preview 统计、以及 relation endpoint reserve 没有可见退化。
- 如果后续出现 PageFrame 高度过高、Canvas mode 丢 formal frame、export preview 数字不对，优先检查 `hooks/useRuntimeFrameModelController.ts` 与 `hooks/useNoteCanvasLayoutModel.ts`。

## V2.BN.8.1 Runtime Layout Model Controller Experience Note

```text
Viewport width, visible blocks, resolved layouts, and layout persistence are now grouped under a runtime layout model controller.
```

体验判断：

- 这一步不应该改变用户可见行为；Page mode / Canvas mode 的 block 位置、宽度、默认 draft 落点和保存行为都应保持原样。
- 工程价值是把“可用宽度如何变成可见 block 和 layout model”从 root controller 中收紧到 L3-L5 边界。
- Browser Harness 暂时不跑；等全部替换工作结束后再统一补真实浏览器验证。

仍需人工观察：

- Henry 后续复测 Page / Canvas 切换、resize、move、long paragraph reflow、workspace block visibility 时，应重点确认没有因为 controller 抽离造成位置漂移。
- 如果后续出现 PageFrame 宽度异常、Canvas mode 下 block 被硬夹回 page、或 layout 保存后 reload 位置不一致，应优先检查 `hooks/useRuntimeLayoutModelController.ts` 与 `hooks/useNoteCanvasLayoutModel.ts`。

## V2.BN.8.1 Runtime Block History Controller Experience Note

```text
Block trash history now has a small controller boundary instead of living in the runtime root controller.
```

体验判断：

- 这一步不应该改变用户可见行为；toolbar 删除 block 后仍应进入 `trashedBlock` history seed。
- 工程价值是让 create/trash/undo 这条路更清楚：`useRuntimeBlockHistoryController()` 拿到 block lifecycle callback，并把它接到 `usePlacementHistory()`。
- Browser Harness 暂时不跑；等全部替换工作结束后再统一补真实浏览器验证。

仍需人工观察：

- Henry 后续复测 toolbar 删除后，Ctrl+Z 是否恢复被删 block，Ctrl+Y 是否再次删除。
- 如果后续出现删除后不能撤回、撤回后 block 内容丢失、或输入框内部快捷键被抢，应优先检查 `hooks/useRuntimeBlockHistoryController.ts` 与 `hooks/usePlacementHistory.ts`。

## V2.BN.8.1 Runtime History Direct Draft Bridge Experience Note

```text
Draft block creation now connects to runtime history without a temporary root ref bridge.
```

体验判断：

- 这一步不应该改变用户可见行为；创建 draft block 后，仍应进入 created block history seed。
- 价值主要在工程侧：runtime root 少一条临时 ref glue，后续检查 create / trash / undo 的路径更直。

仍需人工观察：

- Browser Harness 统一补跑时，验证 Ctrl+Z 能撤回刚创建的 block，Ctrl+Y 能恢复。
- Henry 手动确认前，不能把 create/trash undo-redo 体验标为最终 passed。

## V2.BN.8.1 Canvas Engine Performance Seed Experience Note

```text
Canvas Engine now has a repeatable non-browser performance seed for pure layout/runtime model paths.
```

体验判断：

- 这个 seed 不会打开页面，也不证明真实滚动、overlay、输入或浏览器渲染不卡。
- 它证明的是：在 50 / 200 blocks、长段落、公式密集、page + workspace 混合这些基础规模下，placement / reflow / snap / relation endpoint reserve / runtime model 纯逻辑路径可以稳定跑通。
- 对体验工作的意义是：后续如果视觉上出现卡顿，我们可以更快区分是 DOM 渲染、React 组合、CSS/overlay 层级，还是底层 layout model 本身退化。

仍需人工观察：

- Browser Harness 统一补跑时，需要额外验证真实 50 / 200 blocks 的滚动、选中、拖动、resize 和 overlay 跟随。
- Henry 手动确认之前，不能把这个 seed 当作 V2.BN.8.1 体验通过。

## V2.BN.8.1 Shared Overlay Placement Helper Experience Note

```text
Slash menu, block control bar, and Formula help now share the same first-version viewport placement helper.
```

体验判断：

- 这一步不是给用户增加新按钮，而是减少三个浮层“各算各的位置”的不稳定来源。
- Slash menu、selected block control bar、Formula help tooltip 都应该遵守相同的 viewport padding 和基础翻转规则。
- 对用户来说，预期体验是：靠近屏幕边缘时，浮层不要跑出视野，也不要因为 block 的局部 DOM 层级被裁切。
- 这一步仍不是完整 overlay collision engine；多个浮层同时打开时的互斥、遮挡和优先级还要继续用后续 L9/L12 验收确认。

仍需人工观察：

- 页面底部输入 `/` 时，slash menu 是否向上翻转或保持可见；
- 右侧边缘选中 block 时，control bar 是否保持可点；
- Formula help tooltip 在 viewport 底部是否完整可读；
- Preview / More / Info 与 selected toolbar 同时出现时是否仍由正确层级覆盖。

## V2.BN.8.1 Formula Help Overlay Portal Experience Note

```text
Formula help now behaves like a viewport overlay instead of a block-local hover child.
```

体验判断：

- FormulaBlock 的 `?` 帮助说明不再长在 block 内部，而是进入 viewport-level floating overlay。
- 用户 hover / focus 问号时，说明气泡应靠近问号按钮显示；靠近屏幕底部时可以向上翻转。
- 说明气泡不再挤压 block、不再影响 measured height，也不应该被窄 block、下方 block 或 PageFrame 裁切。
- 这仍只是说明入口，不改变 FormulaBlock 的输入方式、保存方式或渲染方式。

仍需人工观察：

- 在页面底部的 FormulaBlock 中 hover `?`，tooltip 是否仍完整可读；
- 在很窄的 FormulaBlock 中 hover `?`，tooltip 是否不遮住用户正在输入的位置；
- 在 Canvas mode / Page mode 下 tooltip 是否都跟随按钮位置；
- tooltip 是否高于 selected block toolbar、preview panel 之下的层级是否可接受。

## V2.BN.8.1 Slash Menu And Block Control Overlay Portal Experience Note

```text
Slash menu and the selected block control bar now behave like viewport tools instead of block content.
```

体验判断：

- 在较靠下的 block 中输入 `/` 时，slash menu 应该跟随当前输入行附近，而不是漂到页面上方或被 writing surface 局部容器裁切。
- 选中 block 后，移动 / AI / export / save / trash 工具条应该浮在 viewport overlay 层，而不是占用或撑开 block 本体。
- 这一步的目标是减少两个紧贴 block 时工具条被上方 block 遮挡、或与正文内容混层的问题。
- 工具条仍然跟随 active block 的屏幕位置；页面滚动、窗口 resize、block move / resize 后会重新计算 anchor。
- 这一步不改变按钮含义，也不改变 block content truth / layout truth。

仍需人工观察：

- 在页面下方 block 输入 `/for` 时，slash menu 是否贴近 caret；
- 选中靠右、靠下、靠近其它 block 的 block 时，control bar 是否仍可点；
- 点击 Move 后拖动是否仍然保持原来的手感；
- 打开 Preview / Info / More actions 时，control bar 是否被更高层面板正确覆盖；
- 窄屏或 sidebar 收起后，control bar 是否仍落在可见区域内。

## V2.BN.8.1 Insert And Source Overlay Portal Experience Note

```text
Insert and Source jump now behave more like viewport tools than document content.
```

体验判断：

- `+ Insert` 仍然是右侧的 viewport floating action，但现在它不再挂在 document shell 里面，后续 PageFrame / workspace 替换时不应该被正文布局带走。
- Advanced Insert panel 使用 free overlay placement，位置仍由它自己的 fixed 样式控制；这保留了当前手感，也避免它进入右上角 preview/info stack。
- Source jump panel 进入右上角 overlay stack 后，应更像临时查看 source snapshot 的工具面板，而不是页面内容的一部分。
- 这一步不应改变 block 写作、Page/Canvas 切换、source jump 内容、Advanced Insert 表单内容。

仍需人工观察：

- 打开 Advanced Insert 时，按钮和面板是否仍在预期位置；
- 打开 Source jump 时，面板是否在 viewport overlay 中显示，且不会撑开 page/canvas；
- Preview / More / Info / Source jump 同时触发时，是否存在互相遮挡或需要互斥关闭的体验问题；
- 窄屏下 Insert panel 是否仍可读、可关闭。

## V2.BN.8.1 Floating Overlay Portal Experience Note

```text
Preview, info, and more-actions panels now live above the note runtime instead of inside the chrome layout.
```

体验判断：

- 打开 Preview 后，面板应该更像一个真正的工具浮层，而不是和当前选中的 block toolbar 混在同一个局部层级里。
- Note info / More actions / Preview 的位置会统一到 viewport 右上侧；这比跟随 `noteChrome` 内部 absolute 定位更接近后续 inspector / overlay service 的方向。
- 用户点击面板外的页面内容时，portal 外壳不会吞掉整页点击；只有面板本体可交互。
- 这一步不应该改变 Page/Canvas mode、block 内容、placement truth、preview overlay toggle 状态或导出统计。

仍需人工观察：

- 打开 Preview 时，面板是否覆盖在 selected block toolbar 之上；
- 打开 More actions 后，Snap alignment 是否仍能切换；
- 打开 Note info 后，面板是否仍展示当前 note 信息；
- 窄屏下右上浮层是否保持可读，不溢出视口。

## V2.BN.8.1 L12 Runtime Ownership Experience Note

```text
NoteDetail is no longer the user-facing runtime body; the note page now enters Canvas Engine first.
```

体验判断：

- 从当前代码结构看，用户打开 note 时已经进入 `NoteCanvasRuntimeProvider` / `NoteCanvasRuntime`，而不是旧 `NoteDetail.tsx` 大页面主体。
- 这对用户应该是不可见的工程变化：如果体验正确，用户看到的是同一个 note 页面，而不是一次明显换壳。
- 后续体验风险集中在 Canvas Engine 内部：
  - block measurement / reflow 是否稳定；
  - Page / Canvas mode 切换是否稳定；
  - slash menu / preview / toolbar 这些 overlay 是否仍在正确位置；
  - undo / redo 是否仍符合用户直觉；
  - PageFrame outer boundary 与 content area 是否看起来像真实页面。

仍需人工观察：

- Henry 重新打开 note 后，原有写作、创建 block、移动、resize、preview、Page/Canvas 切换是否没有明显退化。
- Browser Harness 在 Chrome remote debugging 授权后需要补跑；当前不能把 browser smoke 记为 passed。
- 性能 seed 仍需用 50 blocks、200 blocks、长段落、formula-heavy note、page + workspace mixed note 复测。

## V2.BN.8.1 PageFrame Content Inset Experience Note

```text
PageFrame now has an outer paper boundary distinct from the writing content area.
```

体验判断：

- Canvas mode 里，正式 PageFrame 不应该再把正文起点当作页面外边界。
- block 仍然应该出现在用户熟悉的位置；变化应该主要体现为 PageFrame 外框向左右扩出书写留白。
- 这一步不是完整标尺功能，只是给后续 ruler / page margin / content width 调节打地基。
- 如果用户看到 block 明显横向漂移，应该视为回归；如果只是页面外框更像一张纸，这是预期变化。

仍需人工观察：

- Canvas mode 下主 PageFrame 的外边界是否比 block 内容区更宽。
- Page mode 下原本写作体验是否没有明显退化。
- 切换 Page/Canvas mode 后，workspace block 是否仍不被硬夹回 PageFrame。

## V2.BN.8.1 Runtime History Boundary Experience Note

```text
Created-block and toolbar-delete undo now use real soft-delete/restore, not visual-only frontend tricks.
```

体验判断：

- 用户在空白处创建并保存一个新 block 后，应该能用常见的 `Ctrl+Z` 撤回这个创建动作。
- 这次撤回不是把 block 临时藏起来，而是走 note block 的软删除状态；因此刷新/后续恢复路径更接近真实产品行为。
- `Ctrl+Y` 或 `Ctrl+Shift+Z` 应该能把刚撤回的 created block 恢复回来。
- 用户通过 block toolbar 删除一个 block 后，离开输入框按 `Ctrl+Z` 应该能把它恢复回来；再按 `Ctrl+Y` 应该能再次把它移入 trash。
- 当前快捷键仍会避开 textarea / input 内部焦点，避免用户正在写字时把文本编辑的 undo 抢走。
- 这仍然只是第一版 runtime history：move / resize / created block / toolbar-deleted block 已进入同一条历史栈，convert block、inline formula、source/relation 操作还不能算完成。

仍需人工观察：

- 新建 block 后点击页面空白处，让焦点离开输入框，再按 `Ctrl+Z`，block 是否消失。
- 随后按 `Ctrl+Y` 或 `Ctrl+Shift+Z`，block 是否恢复到原位置。
- 用 toolbar 删除一个已有 block 后，`Ctrl+Z` / `Ctrl+Y` 是否能稳定恢复和再次删除。
- move / resize 后的撤回重做是否仍然稳定。
- 在 textarea 内按 `Ctrl+Z` 是否仍优先撤回文本输入，而不是撤回 block 创建。

## V2.BN.8.1 Runtime Placement Record Experience Note

```text
This patch is mostly invisible; it makes Canvas placement facts inspectable and future-ready.
```

Experience judgment:

- Users should not see a visual regression from this patch.
- The value is that Canvas Engine now knows more than a block rectangle: it knows which object is placed, whether it belongs to the formal PageFrame or workspace, what its boundary role is, and where future relation endpoints may attach.
- This prepares later Page/Canvas mode rules, relation connector UI, z-order control, and workspace filtering without making those features user-visible yet.
- If any visual change appears, it should be treated as a regression because this patch is a runtime contract step.

## V2.BN.8.1 Formula Input Sanitizer And Help Experience Note

```text
FormulaBlock now treats LaTeX input as formula body; pending Henry paste/hover retest
```

体验判断：

- FormulaBlock 应该让用户直接输入“公式本体”，而不是逼用户判断要不要自己包 `$` 或 `$$`。
- 本补丁后，用户粘贴带 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 的完整公式时，系统会自动去掉外层包裹并保留 body。
- `?` help seed 是当前阶段的轻量说明入口，避免用户不知道 FormulaBlock 的输入约定。
- 正文里的小公式不是本轮目标；它需要后续通过选区右键 / floating toolbar 的 `Convert to formula` 进入 inline math 或公式片段。

仍需人工观察：

- 带 delimiter 的简单公式粘贴后，输入区是否变成纯 body；
- Green theorem 这类多行公式粘贴后，预览是否符合用户预期；
- help tooltip 在窄 block、靠近页面右侧、靠近 viewport 底部时是否仍可读；
- 迁入 FloatingOverlayLayer 后，help tooltip 是否仍需要更完整的 collision / flip / clamp service。

## V2.BN.8.1 Canvas Shell And PageFrame Boundary Experience Note

```text
Canvas mode now reads as a workspace, not a page card; pending Henry visual retest
```

体验判断：

- Canvas mode 应该像工作区，而不是“页面外面又套了一层气泡卡片”。
- 本补丁后，Canvas mode 的 top bar 是唯一固定上层，下面的区域交给 canvas workspace。
- 正式 PageFrame 仍然存在：用户能看见一个可导出 formal page 被放在更大的 workspace 中。
- Workspace 的滚动现在归 writing surface 自己处理，避免外层页面 scroll 和内部 canvas scroll 同时出现。
- `+ Insert` 保持为 viewport 浮层入口，不会被 canvas 内容滚动带走。

仍需人工观察：

- 视觉上是否已经接近“无限画布里的正式页面”；
- PageFrame 左侧 96px workspace 留白是否合适，还是需要继续缩小/放大；
- 右侧 `+ Insert` 是否遮挡内容，未来是否迁入 bottom/side toolbar；
- Page mode 是否也应该同步采用更紧凑 top bar。

## V2.BN.8.1 Slash Menu Caret Anchor Experience Note

```text
Slash menu anchor now targets caret; pending Henry visual retest
```

体验判断：

- Slash menu 应该跟随“用户正在输入的位置”，而不是跟随整个 textarea 的顶部或底部。
- 对长 paragraph、靠下的新 block、多行 code/formula 输入来说，菜单漂到页面上方会严重破坏用户对当前操作对象的判断。
- 本补丁把 anchor 计算推进到 caret 级别：用户在某一行输入 `/`，菜单应贴近这一行附近。

仍需人工观察：

- 在较靠下的新 draft block 输入 `/for`，菜单是否出现在当前输入框附近；
- 在长 paragraph 的中下部输入 `/`，菜单是否跟随当前行；
- 在页面滚动后输入 `/`，菜单是否仍正确；
- 在接近 viewport 底部时，菜单是否合理翻到上方，而不是漂到页面顶部。

## V2.BN.8.1 Definition Field Truth And Active Reflow Experience Note

```text
Definition fields and active structured reflow patched; pending Henry retest
```

体验判断：

- DefinitionBlock 的 `concept_name` 和 `description` 必须像两个独立输入框，而不是一个 text fallback 的两种读法。
- 本补丁后，用户按 Tab 从 Concept name 进入 Description 时，Description 应该保持空白，直到用户主动输入。
- DefinitionBlock 进入 active editing 后会参与 measured-height reflow；在 Page mode 下，它应该像普通长文本一样把下方 block 推开。

仍需人工观察：

- 快速输入 concept name 后立刻 Tab，是否仍会出现旧字段闪回；
- active Definition 下方紧贴 Formula / Code / Paragraph 时是否都能避让；
- 保存并刷新后，field values 是否仍按用户填写的两个字段显示。

## V2.BN.8.1 L2/L12 Runtime Controller Composition Experience Note

```text
runtime controller wiring moved out of render shell; not browser-smoked
```

体验风险：

- 本次迁移理论上不改变用户可见行为，只改变 Canvas Engine runtime 的 controller wiring 归属。
- 如果后续出现整个 note 页面空白、loading 不退出、顶部工具栏缺失、writing surface 消失、Insert / Preview / Layout / Page 按钮失效、或 block interaction 全面失灵，应优先检查 `hooks/useNoteCanvasRuntimeController.ts` 和 `hooks/useNoteCanvasLayerProps.ts`。
- 这一步让 `NoteCanvasRuntime.tsx` 变成真正的薄 render shell；但 `useNoteCanvasRuntimeController.ts` 现在集中承载 controller graph，后续还需要按 L3-L11 的服务边界继续拆小和做浏览器 smoke。
- 体验 smoke 重点不是视觉是否变化，而是确认重构后所有既有入口仍可工作：打开 note、创建 block、slash menu、structured block、move / resize、preview overlay、Page / Canvas 切换。

## V2.BN.8.1 L7/L12 Runtime Refs And Load Reset Controller Experience Note

```text
runtime refs and note-load reset moved out of root; not browser-smoked
```

体验风险：

- 本次迁移理论上不改变用户可见行为，只改变 block list ref、moving block ref、measured reflow suppression ref 和 note-load reset callback 的归属。
- 如果后续出现选中 block 时高度测量误推开、拖拽中的 block 被 measured reflow 影响、切换 note 后旧 selection 残留、或 note reload 后旧 layout draft 残留，应优先检查 `hooks/useRuntimeLayoutRefsController.ts` 和 `hooks/useNoteLoadResetController.ts`。
- 这一步是 L7 measurement / reflow service 与 L12 decommission 的小切口：root 不再直接持有 measurement suppression hack，但仍负责把这些 refs 传给 placement / reflow / width / surface hooks。

## V2.BN.8.1 L6/L9 Runtime Document Layer Composition Experience Note

```text
document shell composition moved out of root; not browser-smoked
```

体验风险：

- 本次迁移理论上不改变用户可见行为，只改变 document shell、template warning、floating panel 与 writing surface 的组合归属。
- 如果后续出现 Page / Canvas mode 外壳样式异常、Insert panel 不显示、source jump panel 无法关闭、writing surface 消失、或空白点击取消选中失效，应优先检查 `layers/NoteRuntimeDocumentLayer.tsx` 和 `NoteCanvasRuntime.tsx` 传入的 props 边界。
- 这一步让 `NoteCanvasRuntime.tsx` 不再直接拥有 document shell DOM，但 root 仍然负责 controller wiring 和 props composition；下一步仍需要继续压缩 props composition 或把更完整的 runtime shell contract 下沉。

## V2.BN.8.1 L6/L7/L11 Runtime Decision Controller Experience Note

```text
field derivation / layout persistence / measured reflow decision moved out of root; not browser-smoked
```

体验风险：

- 本次迁移理论上不改变用户可见行为，只改变 field draft、layout persistence、measured reflow 这些 decision callback 的归属。
- 如果后续出现 Definition 字段互相覆盖、Formula 输入不更新预览文本、move / resize 不落盘、Ctrl+Z / Ctrl+Y 不能保持布局、或 Formula input 展开后不推开下方 block，应优先检查新增的三个 hook。
- `NoteCanvasRuntime.tsx` 仍然负责把这些 handler 传给 writing surface 和 placement interaction controller；完整 L12 decommission 仍需要继续压缩 root 的 controller composition。

## V2.BN.8.1 L3-L5 Layout Model Hook Experience Note

```text
L3-L5 layout model hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变用户可见行为，只改变 layout/model composition 的归属。
- 如果后续出现 Page mode workspace block 泄漏、Canvas mode workspace block 消失、PageFrame 高度异常、Preview 统计错误、或 slash/draft 默认落点异常，应优先检查 `hooks/useNoteCanvasLayoutModel.ts`。
- `NoteCanvasRuntime.tsx` 现在更接近 runtime composition root；placement persistence callback、field draft text derivation、measured height reflow decision 已继续迁入 hooks，后续重点转向 controller / layer wiring 瘦身。
- 浏览器 smoke 需要重点看 Page / Canvas 切换、Preview 面板统计、双击空白创建 draft、长文本粘贴后 PageFrame 高度、以及 workspace block 不污染 Page mode。

## V2.BN.8.1 Current Runtime Experience Snapshot

```text
NoteDetail shell achieved; Canvas Engine runtime root still needs browser smoke
```

体验判断：

- 从代码结构看，用户进入 note 页面时已经通过 `NoteCanvasRuntimeProvider` 进入 Canvas Engine runtime root；`NoteDetail.tsx` 不再是体验主体。
- 当前风险不再是“旧 NoteDetail 页面继续承载核心体验”，而是“新的 `NoteCanvasRuntime.tsx` composition root 仍聚合了较多 controller / layer wiring”。
- 后续体验验收不能只看页面是否能打开；必须逐项验证自然写作、block 选中、field editing、formula 展开、slash menu、resize/reflow、Page/Canvas 切换、preview overlay 与 source jump。

## V2.BN.8.1 L6/L9 Writing Surface Layer Experience Note

```text
L6/L9 writing surface layer: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变 block 编辑、draft 输入、slash menu、snap guide、PageFrame boundary 或 empty prompt 的视觉和行为，只改变 writing surface DOM projection 的归属。
- 如果后续出现 block 点选后不进入编辑、Definition / Formula 字段草稿不同步、长文本测量后不推开下方 block、slash menu anchor 错位、draft blur 不保存、或 empty prompt 错误出现，应优先检查 `layers/NoteWritingSurfaceLayer.tsx` 与 `NoteCanvasRuntime.tsx` 传入的回调边界。
- `NoteWritingSurfaceLayer` 仍然通过 props 接收 layout / measurement / placement / slash / draft 决策；它不是新的 truth owner，只是 Canvas Engine 的 DOM projection surface。
- 这一步让 `NoteCanvasRuntime.tsx` 更接近 runtime composition root，但 `blockLayouts` resolution、field draft text derivation、measured-height reflow decision 和 placement persistence 仍在 runtime root 中，后续仍需要继续分层。

## V2.BN.8.1 L9 Note Chrome And Floating Panel Layer Experience Note

```text
L9 note chrome / floating panel layer: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变顶部工具栏、note info、more actions、preview、insert panel 或 source jump panel 的视觉与交互，只改变这些 shell / floating panel JSX 的归属。
- 如果后续出现标题保存失效、Page/Canvas 切换按钮状态不更新、Preview 面板无法打开、overlay toggles 丢失、Insert 添加 block 后不能 focus、或 Source jump 面板无法关闭，应优先检查 `layers/NoteChromeLayer.tsx` 的 props 边界。
- 这一步当时尚未完成完整 overlay portal；后续 runtime document layer checkpoint 已将 `documentShell` 组合迁出 root。
- `NoteCanvasRuntime.tsx` 现在更接近 runtime composition root，但仍然持有 controller wiring、props composition、block layout inputs 和 runtime model inputs。

## V2.BN.8.1 L5/L7 Layout Draft Controller Experience Note

```text
L5/L7 layout draft controller hook: implemented, not browser-smoked
```

体验风险：

- 本次迁移理论上不改变 block move / resize、measured height reflow、formula 展开推开后续 block、definition active 后扩张、或 placement undo / redo 的体验，只改变 layout draft state 和写入动作的归属。
- 如果后续出现 move / resize 视觉即时反馈丢失、block 重新加载后位置不保存、测量后无法推开下方 block、或 undo / redo 不能恢复布局，应优先检查 `hooks/useLayoutDraftController.ts` 与 `hooks/useBlockPlacementInteractions.ts` / `hooks/usePlacementHistory.ts` 的边界。
- resolved `blockLayouts` 仍在 `NoteCanvasRuntime.tsx` 中；后续若要继续迁出，应先处理 data adapter -> visible block -> placement service 的依赖顺序。

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
- Page / Canvas 切换时关闭浮层、清除 snap guide、清除 block selection 的规则现在由 `modePolicyService.ts` 的 transition policy 输出。
- 如果后续出现 Page / Canvas label 错误、模式切换后浮层残留、snap guide 残留、或已选中 block 没有取消选中，应优先检查 `modePolicyService.ts` 和 `hooks/useSurfaceModeController.ts`。
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
- 如果后续只出现 Code block 视觉、badge、行号 gutter 或代码输入异常，应优先检查 `blocks/CodeBlockProjection.tsx` 和 `layers/BlockEditorLayer.tsx` 的 code 分流。
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
- 如果只是 Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 的触发条件不对，优先检查 `historyService.ts` 的 keyboard intent rules。
- 本轮有一个有意的体验变化：Page mode 且 snap alignment 开启时，双击空白创建 draft 会进入自然写作流；snap 关闭或 Canvas mode 下才使用双击位置。
- 本轮有一个有意的视觉变化：Code block 不再完全继承普通 TextBlock 的视觉语言，改为 `CODE` badge、独立代码背景、monospace 输入区域和轻量行号 gutter。行级复制 / gutter 多行选择仍是后续 polish。

## V2.BN.8.1 CodeBlock Projection Smoke

```text
status: partial smoke passed
browser: in-app browser
```

体验观察：

- reload 后 note 仍正常进入 Canvas Engine runtime；
- code block 可以显示独立 projection；
- 选中 code block 后显示 `CODE` badge；
- Preview 面板仍能打开；
- 本轮未观察到 console error。

保留风险：

- 本轮只验证 CodeBlock projection 和 preview sanity；
- 还没有完整验证 formula expand、definition edit、move / resize / undo、Page / Canvas mode；
- Henry 手动确认前不能把 V2.BN.8.1 体验验收标记为 passed。

## V2.BN.8.1 Formula Preview Display Body Patch

```text
status: partial technical validation passed
```

体验意图：

- FormulaBlock 里的 `latex_input` 应该更像“公式本体”，而不是要求用户自己判断要不要包 `$`；
- 裸 LaTeX body 默认按 display formula 渲染；
- 已输入 `$...$` / `$$...$$` 的用户习惯仍尽量兼容；
- 多行或 `\begin...` 环境自动走 display math，避免 Green theorem 这类公式直接显示原文。

保留风险：

- 这次只做技术规则和 KaTeX display validation；
- 浏览器内编辑、保存、reload 后的 FormulaBlock 体验还需要单独 smoke；
- hover help tooltip 已进入 viewport overlay seed；更完整的公式输入说明和正文 inline formula conversion 仍未做。

## V2.BN.8.1 World Overlay Anchor Seed Experience Note

```text
status: technical seed only
browser: deferred by Henry until the replacement pass is complete
```

体验意图：

- 后续 canvas pan / zoom 后，floating UI 应该仍然贴近它所服务的 block / field / caret / canvas object；
- 当前 patch 先提供 normalized anchor record 和 world rect 到 viewport rect 的转换，不改变用户可见行为；
- 这让后续 overlay 调整可以从“这个浮层锚在哪里”出发，而不是继续在每个组件里各自硬算 DOM 位置。
- 当前 slash menu、block control bar、Formula help tooltip 已经通过 normalized anchor record 进入 placement helper。

保留风险：

- 当前 anchor record 的来源仍主要是 DOM rect fallback；
- 还没有完整迁移到真正的 world/caret anchor records；
- 完整 pan / zoom、virtualization、relation endpoint overlay 仍需要后续实现与 Browser smoke。

## 同步规则

- 每次视觉/交互 patch 后更新本文。
- Browser smoke 后更新本文。
- 如果体验低于旧 runtime，必须同步 `Review.md` 和 `Canvas-Engine-Fallback-Strategy.md`。
- 如果体验规则稳定，收口时考虑 promotion 到 UX Inventory 或 interaction contract。
