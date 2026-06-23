# Canvas Engine Interaction Contract

## 负责什么

本文负责 V2.BN.8 Canvas Engine 的用户交互合同：

- 点击、双击、空白点击；
- block 创建；
- block 选择；
- block 拖动；
- block resize；
- pan / zoom；
- slash command；
- block control bar；
- preview/debug overlay；
- page/workspace visibility；
- keyboard 行为。

## 不负责什么

- 不定义底层 schema；
- 不替代 UX Inventory；
- 不写完整视觉设计；
- 不定义 Source Library / Relation Runtime / Template Studio 的完整交互。

## 必读参考

- `docs/releases/V2.BN.8/Canvas-Engine-Research/R6-selection-drag-resize-overlay-runtime.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R5-pageframe-workspace-model.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`

## 基础原则

- 默认阅读状态不显示工程噪声；
- 用户点击对象时才暴露必要 control；
- preview/debug overlay 用来显示 type、AI visibility、export status；
- source/relation/template 状态不能污染正文；
- toolbar / popover 不应改变 block measurement；
- page mode 与 canvas/workspace 行为必须可解释。
- 所有 floating UI 必须 anchored 到 world/screen 坐标转换结果，不允许使用页面流位置凑合。

## Runtime State

第一版至少区分：

```text
idle
hoveringBlock
selectedBlock
multiSelected future
editingText
draggingBlock
resizingBlock
panningCanvas
openingMenu
previewing
connectingRelationFuture
```

同一时刻只能有一个主交互状态。`editingText` 时不能触发 canvas pan；`draggingBlock` 时不能触发 text selection；`previewing` 面板应高于 selected toolbar。

## V2.BN.8.6.1 SelectionDraft Interaction Contract

V2.BN.8.6.1 起，选区交互必须由 Coincides 自己接管。浏览器原生 selection 只能作为捕获输入，不能作为用户已经选中了什么的最终事实。

第一版成熟规则：

- 普通拖选文本：替换当前 `SelectionDraft`；
- Ctrl / Command + 拖选：向当前 `SelectionDraft` 追加一个 range；
- 用户先普通拖选 A，再按 Ctrl / Command 拖选 B：A 必须升级为 draft 的第一段，B 追加为第二段；
- draft range 必须有 Coincides 自己渲染的临时高亮，不能只依赖浏览器蓝色 selection；
- toolbar 出现时必须轻量、临时、可逃离；
- 点击 toolbar close、按 Esc、点击页面/画布空白处，必须清掉 draft；
- 点击 toolbar 本身不能误触发 block drag、block selection、canvas pan 或 TextUnit gutter 行为；
- annotation / same-range label / child label 都从 `SelectionDraft` 提交，不直接读 browser selection；
- child label 的交互入口是：选中已有 parent annotation，然后在 parent annotation 内部再次选择子范围，toolbar 才显示 child label action；
- 如果 selection 不在 parent annotation 内，toolbar 不显示 child label action。

V2.BN.8.6.1 不要求完整跨 block selection UI，但数据和交互代码不能把未来跨 block 选区堵死。

## 第一版交互

### 创建

- PageFrame 内双击空白创建 text block；
- workspace 内双击空白创建 workspace text block；
- 空 block 失焦且无内容时清除；
- slash command 是主要 block type 入口；
- manual insert 可以存在，但不应比 slash 更重要。

### 编辑

- Enter 是 block 内换行；
- Ctrl+Enter 新建 block；
- paste long text 不重复、不撑爆 layout；
- definition / formula 使用 structured field editor；
- formula 默认显示 preview，input 按需展开。
- 独立 FormulaBlock 的 `latex_input` 是公式 body。用户可以粘贴 `$...$`、`$$...$$`、`\(...\)`、`\[...\]`，但保存层应归一成 body，不把外层 delimiter 当作 field truth。
- 独立 FormulaBlock 需要轻量帮助入口解释输入约定；当前 `?` tooltip 已进入 `FloatingOverlayLayer` free placement，不参与 block measurement 或 block-local clipping。
- 正文 TextBlock / Definition 描述中的 inline formula 不自动拆成 FormulaBlock；后续通过选区右键或 floating toolbar 的 `Convert to formula` 显式转换，并必须支持撤回。
- `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` 在输入框、textarea、contenteditable 内归文本编辑器自己处理；只有焦点不在可编辑 DOM 内时，才解释为 runtime history 的 undo / redo 意图。

### 选择与布局

- 单击 block 选中；
- 空白处点击清除选择；
- layout mode 可强化移动/resize；
- resize 后文字自动重排；
- snap 可开启/关闭；
- elastic avoidance 如果保留，必须有清楚触发条件。

### Overlay

- 所有主浮层最终都应进入 `FloatingOverlayLayer` 或同级 viewport overlay stack，而不是挂在 block / chrome / page DOM 流里。
- `FloatingOverlayLayer` 第一版已经承载 Note info、More actions、Export preview；这些面板应高于 selected block toolbar。
- `+ Insert` / Advanced Insert 属于 viewport floating action，已经迁入 `FloatingOverlayLayer` free placement；它不参与 PageFrame / block measurement。
- Source jump panel 属于 viewport overlay stack，已经迁入 `FloatingOverlayLayer`；它展示 source snapshot，不应撑开 document shell。
- overlay portal shell 不吞掉页面点击，只有实际面板可交互。
- slash menu 属于 viewport overlay，第一版通过 `FloatingOverlayLayer` free placement 和 caret viewport anchor 出现在当前输入附近；
- block control bar 属于 viewport overlay，第一版通过 `FloatingOverlayLayer` free placement 和 selected block viewport anchor 靠近对象但不参与正文排版；
- slash menu、block control bar、Formula help tooltip 第一版共用 shared viewport placement helper；该 helper 只负责 viewport padding、基础 clamp 和简单翻转，不替代未来 world/screen anchor service；
- overlay anchor 必须逐步收敛到 normalized anchor record：DOM rect 可以作为当前 fallback，但 PageFrame / block / canvas object / relation endpoint 应能通过 world rect + viewport 转成 viewport rect 后再进入 floating placement；
- normalized anchor record 必须记录 anchor source，例如 `caret`、`block`、`fixed_viewport`、`formula_help`、`source_picker`、`relation_endpoint`，避免未来 Source picker / Relation endpoint 接入时重新发明一套定位语义；
- preview panel 覆盖时不和 selected toolbar 混乱；
- debug overlay 可显隐 block type / AI / export status。
- control bar 不参与 block measurement；
- formula input 展开属于 block content measurement，不属于 floating overlay；
- formula help tooltip 属于临时说明 overlay，已迁入 viewport overlay seed，不应参与 block measurement。
- selected / editing block 在 viewport virtualize 时必须强制渲染。

### Pan / Zoom

- viewport 改变不改变 placement truth；
- zoom 改变时 overlay 尺寸可选择 screen-fixed，但 anchor 必须跟随对象；
- PageFrame 和 workspace 使用同一 world coordinate；
- PageFrame 外对象不应在切换视图时被硬夹回 PageFrame。
- Page / Canvas 模式切换必须清掉 transient UI state：关闭浮层、清除 snap guide、清除 block selection；这些是 mode transition policy，不是随机 UI side effect。
- V2.BN.8.1 当前先使用 workspace scroll 作为 pan/zoom seed 的替代；Canvas mode 下禁止外层页面滚动，只允许 writing surface / workspace 自己滚动。
- `+ Insert` 属于 viewport floating action，不属于 canvas content；它不随 world 内容滚动，也不参与 PageFrame / block measurement。

## Page / Workspace

- PageFrame 内是正式内容；
- PageFrame 外是 workspace / scratch；
- workspace block 不应在切回 page mode 时污染正式 PageFrame；
- workspace 默认不导出；
- future canvas-first note 可以以 workspace 为主，但 V2.BN.8 只做 seed。
- Canvas mode 不是删除 PageFrame，而是把 PageFrame 放入更大的 workspace；必须保留 PageFrame boundary、background 和默认书写留白感。
- Canvas mode 的外层 document shell 不应呈现为 card/bubble；正式 page 的边界只由 PageFrame 自己表达。
- Canvas mode 初始视野应能完整看到主 PageFrame；左侧 workspace 留白是轻量 scratch reserve，不应把正式页面推到视野外。
- PageFrame outer boundary 和 content area 是两个概念。第一版 block 仍贴着 content area 书写；Canvas mode 的 PageFrame 边界应显示 content inset 留白，不能把 block 贴到页面外框上。
- Ruler / page margin control 后续只调整 PageFrame content inset，不直接改写 NoteBlock content truth。

## 同步规则

- 交互规则改变时，同步 `Experience-Review.md`。
- 交互改变依赖 architecture 时，同步 `Canvas-Engine-Architecture-Spec.md`。
- 交互改变 state/data 时，同步 `Canvas-Engine-State-And-Data-Contract.md`。
- 用户体验达不到旧 runtime 时，记录到 `Review.md` 和 `Canvas-Engine-Fallback-Strategy.md`。
# V2.BN.8.6.4 Annotation Display Interaction Contract

V2.BN.8.6.4 adds a display boundary for annotation labels:

- Preview owns label overlay visibility. This is display state, not AnnotationTruth state.
- Turning label overlay off hides highlights, text-unit label badges, block fallback badges, and annotation overlay artifacts.
- Turning label overlay off must not delete, hide, rename, or mutate AnnotationTruth.
- Annotation Stack owns label inspection and management.
- Selection toolbar owns temporary selection / annotation draft actions.
- Text-backed label badges should anchor near the relevant TextUnit / local text context.
- Block-level annotation badges are fallback only for `target_kind === "block"`.
- Multi-label local clusters should open Annotation Stack with all labels in that cluster.
- Metadata in Annotation Stack should stay collapsed by default so range previews and child labels remain the main working surface.
