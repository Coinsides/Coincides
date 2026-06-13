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

### 选择与布局

- 单击 block 选中；
- 空白处点击清除选择；
- layout mode 可强化移动/resize；
- resize 后文字自动重排；
- snap 可开启/关闭；
- elastic avoidance 如果保留，必须有清楚触发条件。

### Overlay

- slash menu 出现在 caret 附近；
- block control bar 靠近对象但不遮挡正文；
- preview panel 覆盖时不和 selected toolbar 混乱；
- debug overlay 可显隐 block type / AI / export status。
- control bar 不参与 block measurement；
- formula input 展开属于 block content measurement，不属于 floating overlay；
- selected / editing block 在 viewport virtualize 时必须强制渲染。

### Pan / Zoom

- viewport 改变不改变 placement truth；
- zoom 改变时 overlay 尺寸可选择 screen-fixed，但 anchor 必须跟随对象；
- PageFrame 和 workspace 使用同一 world coordinate；
- PageFrame 外对象不应在切换视图时被硬夹回 PageFrame。
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

## 同步规则

- 交互规则改变时，同步 `Experience-Review.md`。
- 交互改变依赖 architecture 时，同步 `Canvas-Engine-Architecture-Spec.md`。
- 交互改变 state/data 时，同步 `Canvas-Engine-State-And-Data-Contract.md`。
- 用户体验达不到旧 runtime 时，记录到 `Review.md` 和 `Canvas-Engine-Fallback-Strategy.md`。
