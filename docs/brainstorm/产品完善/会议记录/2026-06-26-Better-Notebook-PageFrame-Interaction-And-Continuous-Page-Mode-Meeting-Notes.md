# 2026-06-26 Better Notebook PageFrame Interaction And Continuous Page Mode Meeting Notes

## 0. Context

本次讨论发生在 V2.BN.8.9 PageFrame Maturity 收口评估之后。

8.9 的工程结论是：PageFrame 作为特殊 CanvasObject 的服务边界、AI-readable layout、Export Preview、multi PageFrame seed 已经能收口。但从 Henry 的直接使用视角看，当前版本仍然有一个很现实的问题：

```text
用户很难真正测试 PageFrame。
```

这不是单纯的视觉问题，而是 PageFrame 作为一个可操作对象的基本交互还没有站稳。

## 1. Henry 的直接观察

### 1.1 PageFrame 作为 Object 应该能编辑位置

PageFrame 既然被定义成一种特殊 CanvasObject，那么它在 Canvas 上理应能被编辑位置。

当前问题：

- 用户无法自然移动 PageFrame。
- PageFrame 的对象感不足。
- 这会让用户很难判断 PageFrame 到底是画布上的对象，还是固定死的背景/边框。

初步判断：

```text
PageFrame 不能只作为服务层对象存在。
它必须成为用户能选择、移动、配置的可见对象。
```

### 1.2 用户无法自己新建 PageFrame

当前另一个直接阻塞点：

- 用户无法在正常使用中主动创建新的 PageFrame。
- 这导致 multi PageFrame 虽然在工程上存在，但在产品体验上仍然不够可测。

这也反过来暴露出一个更核心的问题：

```text
用户什么时候需要新的 PageFrame？
新建 PageFrame 时应该给用户哪些配置？
```

## 2. PageFrame 的两种默认操作模式

PageFrame 不能只理解为“一张 A4 纸”。它至少存在两种很自然的使用模式。

### 2.1 固定页面模式

第一种模式是固定页面模式。

心智：

```text
这就是一张 A4 纸。
写超了，就需要再新建一个新的 PageFrame。
```

特点：

- PageFrame 高度固定。
- 内容不能无限自然向下延展。
- 超出页面范围后，需要用户主动创建下一张 PageFrame，或者主动把内容移动/续写到另一张 PageFrame。
- 这种模式更适合用户在 Canvas 上主动创建的独立 PageFrame。

### 2.2 无缝衔接页面模式

第二种模式是无缝衔接页面模式。

心智：

```text
用户仍然是在 A4 页面系统里写作，
但页面之间像文档编辑器一样竖向无缝衔接。
```

特点：

- 用户可以自然向下书写。
- 内容超过第一张 A4 后，不需要用户立即感知或手动处理。
- 系统可以把内容理解为连续的 A4 页面序列。
- 对用户来说，体验更接近 Word / Notion 的连续文档，但底层仍然由 PageFrame 承载页面语义。

初步判断：

```text
如果用户新建笔记时选择 A4 纸，
默认模式应该更接近无缝衔接页面模式。
```

原因：

- 用户创建 A4 笔记时通常是想自然写作，而不是先做页面管理。
- 连续写作是默认心智。
- 固定页面模式更像高级/主动布局行为。

## 3. Canvas Mode 下的无缝 PageFrame 问题

无缝衔接页面模式进入 Canvas Mode 后，会产生一个特殊问题：

```text
如果用户写了很多内容，
Canvas Mode 是否要把所有连续 A4 页面全部展开？
```

Henry 的直觉：

```text
不能用户写多少就展开多少。
那会让 Canvas Mode 变得过长、过重，也不适合空间组织。
```

初步方向：

- 在 Canvas Mode 中，无缝衔接 PageFrame 应该保持一种折叠/概览形态。
- 默认只显示第一张 A4 纸的完整大小。
- 后续页面可以在底部以折叠、延展、分页预览、展开句柄等方式存在。
- 用户需要时可以展开继续编辑。
- 编辑时，文字仍然应该保持无缝向下排列，不应该被对象折叠状态破坏写作连续性。

这里的关键矛盾是：

```text
Page Mode 需要连续写作。
Canvas Mode 需要空间可控。
```

## 4. 初步产品判断

当前 8.9 的 PageFrame 工程成熟度和用户可测性之间存在差距。

工程侧已经完成：

- PageFrame contract。
- multi PageFrame seed。
- PageFrame-aware Export Preview。
- AI-readable layout。
- ruler / margin / snap wall。

体验侧仍然缺：

- 用户主动新建 PageFrame。
- 用户移动/编辑 PageFrame 位置。
- PageFrame 模式选择。
- 固定页面模式与无缝衔接页面模式的清晰心智。
- Canvas Mode 下连续页面的折叠/展开策略。

因此 8.9 可以作为工程收口，但后续 8.10/8.11 之前需要认真处理 PageFrame 可操作性。

## 5. Open Questions

### 5.1 无缝衔接页面模式的数据形态是什么？

可能有两种理解：

1. 一个连续 PageFrame，内部按 A4 高度切分为 page slices。
2. 一个 PageFrame collection，由系统自动生成/管理多个连续 PageFrame。

这个问题会影响：

- 导出。
- 页面编号。
- AI-readable layout。
- 用户在 Canvas Mode 中移动/折叠页面。
- ContentGroup projection 与 PageFrame 的关系。

### 5.2 PageFrame 移动应该如何处理？

需要区分：

- 普通用户主动创建的独立 PageFrame。
- 新建 A4 笔记时生成的 primary continuous PageFrame。
- Canvas Mode 中的 secondary PageFrame。

可能需要不同默认行为：

- 普通 PageFrame 默认可移动。
- primary continuous PageFrame 可能默认锁定位置，但允许进入 Layout/Edit mode 后移动。
- 如果 PageFrame 是无缝连续文档的承载体，移动的是整个连续页面组，而不是单页。

### 5.3 新建 PageFrame 的入口在哪里？

候选入口：

- Canvas Mode 工具栏。
- Layout panel。
- 右键菜单。
- Slash command。
- 空白画布双击后的创建菜单。

需要避免：

- 新建 PageFrame 入口太隐蔽，导致用户以为 PageFrame 不能创建。
- PageFrame 创建和普通 block 创建混在一起，导致对象心智混乱。

### 5.4 PageFrame 创建时需要哪些配置？

最小可能配置：

- 页面类型：A4 / Letter / Screen / Custom。
- 操作模式：Fixed page / Continuous pages。
- 是否设为 primary PageFrame。
- 是否 exportable。

暂时不应过早加入太复杂的模板库、页眉页脚编辑、字体样式等。

## 6. Tentative Next Discussion

后续讨论可以围绕三个问题展开：

1. PageFrame 在 Canvas 上应该如何被选择、移动、锁定、配置？
2. Continuous PageFrame 到底是一个对象，还是一组自动管理的 PageFrame？
3. 原计划 V2.BN.8.10 做 ContentGroup projection 前，是否需要先补一个 PageFrame interaction patch？后续版本调整后，ContentGroup projection 已顺延到 V2.BN.8.11。

当前倾向：

```text
在进入复杂 ContentGroup projection 之前，
至少需要补齐 PageFrame 的用户创建和基础位置编辑能力。
否则 CanvasObject projection 会建立在一个用户无法自然操作 PageFrame 的画布上。
```

## 7. Continuous PageFrame 引出的第二层需求

Henry 进一步指出：这些问题很可能不是一个 patch 能解决的，而是会拆成独立小版本。

原因是 Continuous PageFrame 一旦成立，就会自然牵出一组页面对象操作：

- continuous page 的生成方式；
- continuous page 中的单页抽离；
- fixed page frame 合并成 continuous page frame；
- continuous page frame 被截走一页后，上下页面如何处理；
- 被切开的连续页面是否可以重新拼接；
- 单页是否可以被引用、放入 ContentGroup、复用到其他 note。

### 7.1 Continuous PageFrame 的两种分页方式

Continuous PageFrame 至少有两种可能体验。

第一种是系统分页：

```text
用户像 Notion / 普通文档一样从上到下写作，
几乎感觉不到分页。
系统在底层按页面高度计算 page slices。
```

第二种是预分页面：

```text
系统提前给出一张一张 A4 page。
用户写完当前页后，继续回车或输入时，系统生成下一页。
用户能明显看到页面底部和下一页开始。
```

这两个模式都合理，但它们的用户心智不同：

- 系统分页更偏自然写作。
- 预分页面更偏正式文档与页面管理。

### 7.2 从 Continuous PageFrame 中抽离单页

如果用户在 continuous page frame 里发现中间某一页需要单独拿出来，系统应该支持。

可能目的：

- 把这一页单独放到画布旁边。
- 单独引用这一页。
- 把这一页加入某个 ContentGroup。
- 复用到别的 note。

这个需求很自然，因为 PageFrame 本身就是页面级对象；当 continuous page frame 变长后，某一页可能会自然获得独立意义。

随之产生的问题：

```text
中间一页被抽走后，上面的内容怎么办？
下面的内容怎么办？
原 continuous page frame 是否留下一个洞？
还是上下自动重新拼接？
```

### 7.3 Fixed PageFrame 合并成 Continuous PageFrame

如果用户原本创建了两个 fixed PageFrame，但后来发现它们其实是连续关系，也应该能合并。

用户心智：

```text
这两页不是两个独立页面，
它们其实是承上启下的一段连续文档。
```

因此系统需要考虑：

- 两个 fixed PageFrame 是否可以 merge 成一个 continuous page frame。
- 合并后页面顺序如何决定。
- 合并后原 PageFrame 的 id / 引用 / export state 如何处理。
- 合并是否保持 TextFlow 连续。

### 7.4 Continuous PageFrame 切分后重新拼接

如果 continuous page frame 中间一页被截走，那么剩余上下部分也需要一种合理规则。

候选行为：

1. 自动重新拼接上下部分。
2. 保留断口，形成两个 continuous page frame。
3. 用户选择是否拼接。

这不是小问题，因为它影响：

- TextFlow reading order。
- Page number。
- Export。
- AI-readable layout。
- ContentGroup 引用。
- 被抽离页面与原 continuous page frame 的 lineage。

当前倾向需要继续讨论，但可以先确认一点：

```text
Continuous PageFrame 不是单纯的长方形。
它更像一个可分页、可切分、可合并、可抽离的页面容器。
```

## 8. Updated Product Judgment

PageFrame 后续工作很可能至少拆成多个小版本，而不是一个小补丁。

初步拆分方向：

1. PageFrame 基础可操作性：
   - 新建 PageFrame。
   - 选择 / 移动 / 锁定 / 配置 PageFrame。
   - fixed / continuous 模式入口。

2. Continuous PageFrame v1：
   - 决定系统分页还是预分页面作为第一版。
   - 让 A4 note 默认进入 continuous writing 心智。
   - Canvas Mode 下提供折叠/展开的连续页面表现。

3. PageFrame split / extract / merge：
   - 从 continuous 中抽离单页。
   - fixed pages 合并为 continuous。
   - continuous 被切开后重新拼接或保留断口。

4. Page-level reuse and ContentGroup relation：
   - 单页作为可引用对象。
   - 单页加入 ContentGroup。
   - 单页复用到别的 note。

这条线会影响 ContentGroup projection 的节奏。原计划中它位于 V2.BN.8.10；后续版本调整后，它已顺延到 V2.BN.8.11。当前更稳妥的判断是：

```text
ContentGroup projection 之前至少要明确 PageFrame 基础可操作性和 Continuous PageFrame 的第一版心智。
否则 ContentGroup projection 会踩在不稳定的页面对象系统上。
```

## 9. Context Menu Surface Inventory

Henry 补充：随着 PageFrame 成为可操作对象，右键菜单体系也必须被整理。

这不是马上要实现的功能清单，而是需要先看见的交互面。

### 9.1 需要右键菜单的对象/区域

当前至少有这些右键菜单 surface：

- Block context menu：
  - 针对单个 TextFlow-backed block。
  - 可能包含复制、删除、转换 block type、加入 ContentGroup、导出/AI 可见性、创建引用等。

- PageFrame context menu：
  - 针对某个 PageFrame / PageStack。
  - 可能包含移动/锁定、设为 primary、复制、删除、抽离 page、合并 page、展开/折叠、导出设置、页面配置等。

- Canvas blank-space context menu：
  - 针对空白画布。
  - 可能包含新建 PageFrame、新建 block、新建 shape、粘贴、缩放/视图、插入 object 等。

- Special CanvasObject context menu：
  - 针对图片、表格、图表、ContentGroup projection、connector、未来 media / math graph 等。
  - 每类 object 都可能有自己的专用动作。

- Multi-selection context menu：
  - 如果用户选择多个对象，右键菜单应该进入批量操作语义。
  - 例如 group / align / distribute / export / add to ContentGroup 等。

### 9.2 初步判断

右键菜单不能被每个组件各自随手实现。

它应该逐渐形成一个统一的 context menu registry / command surface：

```text
selection context
  -> target kind
  -> allowed commands
  -> disabled reason
  -> command handler
```

这样后续 Agent proposal、快捷键、toolbar、右键菜单可以共享同一套 command vocabulary，而不是各做各的。

## 10. Block 跨 PageSlice 的问题

Henry 继续提出一个关键问题：

```text
如果 PageFrame 默认是 continuous，
一个 Block 在第一页写不下，延伸到第二页时，它到底是什么状态？
```

这需要重新审视，因为以前做过类似能力，但现在 PageFrame 已经变成特殊对象，逻辑需要重新稳固。

### 10.1 不能轻易把一个 Block 拆成两个真 Block

如果一个 paragraph block 跨过页面边界，直觉上它可能显示成两段：

```text
page 1: block fragment A
page 2: block fragment B
```

但内容 truth 不应该因此变成两个 Block。

更稳的理解是：

```text
Content truth:
  one TextFlow block

Layout/render truth:
  multiple page fragments
```

也就是说，一个 Block 可以在渲染层被 page slice 切成多个 visual fragments，但它在 TextFlow 里仍然是一个 block。

### 10.2 PageSlice fragment 可能需要成为布局读模型

为了让导出、AI-readable layout、选中、引用都能理解跨页情况，可能需要一种派生结构：

```text
BlockPageFragment
  block_id
  page_slice_id
  fragment_index
  visible_range
  bbox
  continuation_from_previous_page
  continuation_to_next_page
```

这应该是 derived layout，不是新的内容 truth。

它可以回答：

- 这个 block 的哪一部分显示在 page 1？
- 哪一部分显示在 page 2？
- AI 读取页面时应该如何保持 reading order？
- 导出时跨页 block 是否需要 continuation marker？
- 用户点击第二页的 fragment 时，选中的仍然是不是原 block？

### 10.3 Block 跨页会影响哪些系统

这个问题会影响：

- TextFlow 编辑体验。
- PageFrame 自动分页。
- Page number / export。
- AI-readable layout。
- ContentGroup member/source range 引用。
- Page-level extraction。
- Selection / drag / resize。

尤其是 page-level extraction：

```text
如果抽离的 page slice 中有半个 block，
这个 block 是被复制 fragment？
还是要求先 split block？
还是抽离后保留 source link？
```

这需要单独设计，不能在实现时临场决定。

## 11. Additional Questions To Carry Forward

基于本轮讨论，后续还需要继续思考：

1. PageFrame / PageStack 是否需要 lock state？
   - 默认连续文档 PageStack 可能锁定位置。
   - 用户主动创建的 PageStack 可能默认可移动。

2. PageSlice 是否是可引用对象？
   - 如果可以引用，引用的是 page slice 还是 page slice snapshot？
   - 如果 page 内容重排，引用是否漂移？

3. Page extraction 是否允许半个 block？
   - 如果不允许，系统是否提示用户先 split block？
   - 如果允许，抽离页是否创建 block fragment copy？

4. Context menu 与 command system 是否要统一？
   - 右键菜单、toolbar、快捷键、Agent proposal 是否都应该调同一套 command registry？

5. Continuous PageFrame 的折叠状态是否影响 AI-readable layout？
   - UI 上折叠不应该让 AI 看不见内容。
   - 但 AI 也需要知道某些内容当前处于 folded visual state。

## 12. PageFrame / Object Style Customization

Henry 补充：PageFrame 既然是画布上的独立区块，也是 CanvasObject，那么它也必须允许用户更改样式。

当前状态判断：

- 标尺 / margin guide / snap wall：已经做了基础版。
- 行间距：已经做了 document typography baseline，但没有做成用户可配置的 TextFlow typography controls。
- 页间距：没有做成用户可配置能力。
- PageFrame 样式自定义：目前只有 template/background/style token 的工程 seed，不是成熟用户配置面板。

### 12.1 PageFrame 样式不是装饰小问题

如果用户不喜欢当前 PageFrame 的样式，系统应该允许修改。

可能需求：

- 白纸。
- 黑色/深色纸。
- 横线纸。
- 方格纸。
- 稿纸。
- 带花纹背景。
- 固定格式模板。
- 特殊学习/会议/数学笔记模板。
- 自定义页眉页脚、边框、背景、水印、留白区。

这不是当前马上要做的复杂功能，但必须被记录为 PageFrame 的长期能力。

### 12.2 PageFrame 可以承载用户自定义模板

有些页面不是单纯空白纸，而是带固定结构的模板。

例如：

```text
左侧/右侧留给 side note。
主区域留给正文。
底部留给 summary。
某个框留给公式推导。
某个区域留给 diagram / graph。
```

这些区域可能未来会涉及 object collision / snap / content zone。

也就是说，PageFrame style 不只是视觉皮肤，也可能发展成：

```text
PageFrameTemplate
  visual style
  writing zones
  side-note zones
  snap zones
  export zones
```

### 12.3 Block 样式也会改变它的产品角色

同样，一个普通 paragraph block 如果更换样式，它的产品心智也会改变。

例如：

- paragraph block + 黄色背景 + 阴影 = sticky note。
- paragraph block + 横线背景 = notebook note。
- paragraph block + 白纸样式 = small paper。
- paragraph block + 稿纸样式 = manuscript block。
- paragraph block + 边框/标题区 = structured note card。

这说明：

```text
Block type 和 Object style 不能混为一谈。
```

一个 block 的 content truth 仍然是 paragraph/textflow，但它在 Canvas 上的呈现可以有不同 style preset。

### 12.4 Object style 应成为通用能力

PageFrame、paragraph block、formula block、特殊 object 都需要 style 系统。

初步方向：

```text
CanvasObject
  object kind
  content mount
  placement
  visual style
  style preset
  template / zone metadata when needed
```

这样后续用户才能自己创建样式，而不是每次都靠开发者硬编码新类型。

## 13. PageFrame Capability Status Snapshot

截至本次讨论，可以先把 PageFrame 能力状态粗略记为：

已做：

- PageFrame 可见 contract。
- multi PageFrame runtime seed。
- PageFrame-aware Export Preview。
- AI-readable layout seed。
- ruler / margin guide / snap wall 基础版。
- A4 logical ratio。
- document typography baseline。
- header/footer/page-number slot seed。
- template/background/style token seed。

未做或未成熟：

- 用户主动新建 PageFrame。
- 用户移动/编辑 PageFrame 位置。
- PageFrame / PageStack 统一连续页面模型。
- PageSlice / split / extract / merge / rejoin。
- PageFrame context menu。
- Canvas blank-space context menu。
- 统一 command registry。
- 用户可配置 line spacing / paragraph spacing / font style。
- 用户可配置 page gap。
- PageFrame template editor。
- PageFrame writing zones / side-note zones。
- Block style preset / sticky note / notebook / manuscript 等样式系统。

## 14. Context Menu 需要先做需求盘点

Henry 进一步确认：右键菜单不是当前最急着实现的东西。

原因：

```text
右键菜单不难，但很杂。
每一种区域、对象、选择状态都会需要不同动作。
```

因此它不应该先被当成一个小 patch 去做，而应该先做需求统计和用户日常流程模拟。

需要模拟的场景包括：

- 用户在 Block 上右键。
- 用户在 PageFrame / PageStack 上右键。
- 用户在空白 Canvas 上右键。
- 用户在特殊 CanvasObject 上右键。
- 用户多选对象后右键。
- 用户在 ContentGroup projection / PageSlice / PageFragment 上右键。

右键菜单后续需要回答：

```text
用户在这个位置最自然想做什么？
这个动作改的是 content truth，还是 layout truth？
这个动作是否可逆？
这个动作是否应该成为 toolbar / shortcut / Agent proposal 的共享 command？
```

当前结论：

```text
右键菜单应该先进入需求盘点和流程模拟，
不急于直接实现。
```

## 15. Cross-page Block 的视觉连续标识

Henry 明确：如果一个 paragraph block 跨过 PageSlice，它不应该让用户难以判断上下页是否属于同一个 block。

问题场景：

```text
用户在一个 paragraph block 里持续编辑。
这个 block 第一页放不下，延伸到第二页。
第二页上显示的内容，究竟是新建 block，还是上一页 block 的延续？
```

如果没有视觉提示，用户会困惑。

因此跨页 block 需要一点轻量视觉标识：

- 上一页 fragment 可以显示 continuation-to-next 标识。
- 下一页 fragment 可以显示 continuation-from-previous 标识。
- 标识只服务于用户识别，不改变内容 truth。
- 用户应该一眼看出：这是同一个 block 在不同 PageSlice 上的视觉片段。

稳定判断：

```text
跨页 block 的内容 truth 仍然是一个 block。
跨页 block 的渲染可以是多个 visual fragments。
visual fragments 需要有连续性标识。
```

## 16. 抽离 PageSlice 时遇到跨页 Block

Henry 对之前问题做出判断：

```text
抽离某一页时，如果遇到跨页 block，系统应该先提示用户。
```

推荐交互：

1. 用户尝试抽离某个 PageSlice。
2. 系统发现该页包含跨页 block fragment。
3. 系统提示：

```text
这一页包含跨页 Block。
抽离后，该 Block 将被拆分成独立 Block。
是否继续？
```

4. 如果用户取消，则不抽离。
5. 如果用户确认，则默认把跨页 block split 成两个或多个 block。

这个判断很重要，因为它确认：

```text
平时跨页不拆 content truth。
用户执行 page extraction 时，可以在明确确认后拆分 content truth。
```

也就是说，split 不是自动副作用，而是用户确认后的结构化操作。

## 17. PageSlice 引用与快照原则

Henry 明确：PageSlice 应该可以被引用，因为它也是一种 object。

判断：

```text
PageSlice / page 当然可以成为 ContentGroup item 或引用对象。
```

引用原则延续 ContentGroup 的既有思路：

```text
默认引用 page snapshot，而不是活页。
```

如果用户引用的是整个 PageSlice，那么引用范围就是整页。

不需要额外把“页面里的内容范围”复杂化：

- 用户引用整页，就创建整页快照。
- 如果用户想引用页面中的某个范围，可以另走内容 range / block / selection 引用路径。
- 如果用户想在整页引用上继续组织 Petal，可以在 ContentGroup member 层处理。

稳定判断：

```text
PageSlice 可以被引用。
默认引用整页快照。
不默认引用活页。
```

## 18. Lock 是独立能力，不默认锁定

Henry 明确：PageFrame / PageStack 不应该默认锁定。

主 PageStack 也不应该默认锁定位置。

锁定应该是一个独立功能，由用户自己触发。

锁定后的心智：

```text
这个 object 仍然显示在画布上，
但它的内容不可编辑，
也不会因为误点进入编辑模式。
它更像临时进入了背景/保护图层。
```

示例：

- 用户锁定一个 PageFrame 后，点击页面文字不会进入编辑。
- 用户锁定一个 block 后，不会误改它的内容。
- 解除锁定后，才恢复编辑和内容修改能力。

锁定功能的价值：

- 帮助用户在复杂画布布局时避免误操作。
- 让某些 object 暂时成为布局背景。
- 支持用户把某个页面、图、模板、背景对象固定住。

稳定判断：

```text
不默认锁定任何 PageFrame / PageStack。
Lock 是用户主动使用的独立 CanvasObject 能力。
```

## 19. Folded State 只影响用户视图，不影响 AI

Henry 明确：Continuous PageFrame 折叠是为了整理画布，不是为了让内容消失。

稳定判断：

```text
折叠状态只对用户当前视觉显示生效。
AI-readable layout / export / data model 仍然应该知道完整内容存在。
```

原因：

- 一个 PageStack 可能有 100 页。
- 如果 Canvas Mode 永远完整展开，会把画布拉得极长，影响空间组织。
- 折叠是为了让用户管理画布，而不是改变内容存在状态。

因此 AI 应该知道：

- 内容仍然存在。
- 内容属于某个 folded PageStack。
- 当前 UI 视觉上处于 folded state。

但 AI 不应该因为折叠就读不到内容。

## 20. 查看长 PageStack 的两种思路

如果用户真的想查看一个 100 页 PageStack，不能只依赖在 Canvas Mode 里完整展开。

Henry 提出两种思路。

### 20.1 PageFrame preview window

第一种是打开一个 PageFrame 预览窗口。

可能能力：

- 独立预览当前 PageStack。
- 通过页码跳转。
- 通过滚动条浏览。
- 类似 PPT 左侧缩略图栏，显示每一页的缩小预览。
- 支持 outline / chapter navigation。
- 如果 PageStack 有章节结构，用户可以点击 outline 直接跳到对应页面。

这种方式适合：

- 用户仍然停留在 Canvas Mode。
- 只想临时查看一个很长的 PageStack。
- 不想让整个画布被 100 页内容撑开。

### 20.2 Jump to Page Mode

第二种是跳回 Page Mode。

即使这个 PageStack 不是默认 primary PageFrame，也可以让用户进入它自己的 Page Mode。

心智：

```text
用户想长时间阅读/编辑这个 PageStack，
就进入它的 Page Mode。
```

这种方式适合：

- 大量阅读。
- 大量编辑。
- 长文档级别的导航。
- 对某个 PageStack 进行专注处理。

稳定判断：

```text
Canvas Mode 负责空间组织。
Page Mode 负责长文档阅读和编辑。
长 PageStack 需要 preview window 或 jump-to-page-mode，而不是强迫 Canvas 完整展开。
```

## 21. Updated Stable Principles

本轮讨论后，暂时稳定下来的原则：

1. PageFrame / PageStack 不分 fixed / continuous 两种底层实体。
   - 底层应该是可分页 PageStack。
   - 单页只是 PageStack 的一种状态。

2. PageSlice 可以成为引用对象。
   - 默认引用整页快照。
   - 不默认引用活页。

3. 跨页 Block 不自动拆分。
   - 内容 truth 仍然是一个 block。
   - 渲染层显示多个 fragments。
   - 需要视觉连续标识。

4. Page extraction 遇到跨页 block 时询问用户。
   - 用户确认后，才 split block。

5. Lock 是独立 CanvasObject 能力。
   - 不默认锁定任何东西。
   - 锁定后对象显示但不可编辑。

6. Folded state 只影响用户视图。
   - AI / export / data model 仍然能看到完整内容。

7. 长 PageStack 的查看需要额外入口。
   - preview window。
   - jump to Page Mode。

8. 右键菜单需要先做需求盘点和流程模拟。
   - 不急于实现。
   - 后续应汇入统一 command surface。

## 22. Long PageStack 与多窗口工作台

Henry 进一步提出一个很关键的场景：

```text
某个 PageStack / PageFrame 有 200 页。
用户在 Canvas 某处新建了一个独立 block，补充了一段内容。
后来用户想把这个 block merge 到 200 页文档的中间。
```

如果只把它理解成 Web 页面里的单窗口交互，会很别扭：

- 不可能在 Canvas Mode 里直接展开 200 页 PageStack。
- 展开后画布会变得巨大、沉重、不可管理。
- 用户也很难在同一个无限画布视野里精确找到第 137 页某个位置。

这说明：

```text
长 PageStack 的编辑问题，不应该靠 Canvas Mode 完整展开解决。
它更像桌面工作台 / native app / multi-window 交互问题。
```

### 22.1 PageStack 专用窗口

一种自然解法是打开一个 PageStack 专用窗口。

心智：

```text
Canvas Mode 负责空间组织。
PageStack window 负责长文档阅读、导航、编辑。
```

PageStack window 可以包含：

- 200 页完整内容的阅读/编辑视图。
- 页码跳转。
- 滚动条。
- 缩略图栏。
- outline / chapter navigation。
- 当前页定位。
- 搜索。
- 插入目标高亮。

用户可以在这个窗口里精确定位要插入的地方。

### 22.2 跨窗口拖拽 / 插入

如果 Coincides 后续走 native / desktop-shell 方向，那么可以支持：

```text
Canvas window 中拖起一个 block
-> 拖到 PageStack window 的目标位置
-> 将该 block merge / insert 到长文档中
```

这会让长文档编辑非常自然。

它也说明：

```text
CanvasObject 的可拖拽能力不应该只考虑同一个 DOM surface。
未来可能需要跨窗口、跨 surface、甚至跨 document 的 drag payload。
```

### 22.3 Web app 与 desktop app 的边界

当前仍然可以用 Web 技术实现很多事情，例如：

- 浏览器内弹窗 / modal preview。
- 新 tab / pop-out window。
- Electron / Tauri 里的多窗口。
- 同一 app 内的 split view。

但产品心智已经越来越不像普通网页应用。

更准确的目标可能是：

```text
Coincides 是一个知识工作台。
Web 技术可以是实现方式。
但交互模型不应该被普通网页心智限制。
```

### 22.4 对后续设计的影响

这个场景会影响：

- PageStack preview window。
- Page Mode 是否可以针对任意 PageStack 打开，而不只针对 primary。
- Cross-window drag payload。
- Block merge / insert semantics。
- Command registry。
- Undo / redo across surfaces。
- Content truth 与 layout truth 的同步。
- Native app / desktop shell 的长期路线。

稳定判断：

```text
长 PageStack 的编辑入口应该独立于 Canvas 完整展开。
Canvas Mode 不负责承载 200 页完整展开。
需要 PageStack 专用查看/编辑 surface。
未来可以发展成多窗口 / desktop-shell 交互。
```
## 23. 8.9 后续小版本候选切分

本轮讨论后，8.9 的判断发生了一个重要修正：

```text
8.9 不能只算工程收口。
如果 PageFrame 作为 Canvas 上的第一类对象还不能被用户自然使用，
那么后续 ContentGroup projection 会投到一个不够稳定的页面/画布地基上。
```

因此，8.9 后续可以继续补小版本。补的目标不是继续扩大 PageFrame 的野心，而是把 PageFrame 从“服务层成熟”推进到“用户可用成熟”。

### 23.1 适合继续放进 8.9 的问题

这些问题会直接影响后续 Object projection / ContentGroup projection，因此适合在 8.9 后续解决。

1. PageFrame 基础可操作性
   - 用户可以主动新建 PageFrame / PageStack。
   - 用户可以选择、移动、配置 PageFrame。
   - PageFrame 不是固定背景，而是 Canvas 上可操作的特殊对象。
   - primary PageFrame 可以被用户切换。
   - 删除、复制、设为 primary 等操作要有稳定入口。

2. PageFrame / PageStack 统一模型
   - 底层不再把 fixed page frame 和 continuous page frame 做成两种实体。
   - 单页只是 PageStack 的一种状态。
   - Continuous writing 是 A4 note 的默认心智。
   - Canvas Mode 中长 PageStack 不应该完整展开，而应该有折叠 / 摘要 / 预览入口。
   - Page Mode 应该可以针对任意 PageStack 打开，而不只针对 primary。

3. 跨页 Block 与 PageSlice 边界
   - 一个 TextFlow block 跨页时，content truth 仍然是一个 block。
   - 渲染层可以派生出多个 PageSlice fragments。
   - 需要轻量 continuation marker，提示上下页 fragment 属于同一个 block。
   - 抽离 PageSlice 时，如果遇到跨页 block，需要提示用户；用户确认后才 split block。
   - PageSlice 可以成为引用对象，默认引用整页 snapshot，而不是 live page。

4. PageStack 导航与长文档入口
   - Canvas Mode 不承担 100/200 页完整展开。
   - 长 PageStack 需要 preview window 或 jump-to-Page-Mode。
   - preview window 可以后续支持页码、缩略图、outline / chapter navigation。
   - 第一版可以先做最小入口，不必做完整多窗口。

### 23.2 暂时不适合塞进 8.9 的问题

这些问题重要，但如果塞进 8.9，会把 PageFrame maturity 拖成另一个长期大版本。

1. 完整 PageFrame 模板编辑器
   - 带花背景、稿纸、side-note zones、writing zones、export zones 等应该保留设计余地。
   - 但 8.9 后续不宜先做成熟模板库。

2. 完整右键菜单系统
   - 右键菜单很重要，而且新建 PageFrame / PageStack 需要一个自然入口。
   - 但 8.9 不应该一次性铺完整右键菜单系统。
   - 当前应先做 Context Menu / Command Surface seed：空白 Canvas 上能新建 PageFrame，PageFrame 上能触发最基础对象操作。
   - 更完整的 Block、special object、multi-selection、ContentGroup projection 右键菜单可以后续扩展。

3. 完整 TextFlow 字体 / 字号 / 行距编辑器
   - 8.9.3.1 已经有 document typography baseline，但这还不是成熟的 typography 系统。
   - PageFrame 的分页、导出、阅读比例、AI-readable layout 都会依赖字体 / 字号 / 行距 / 段距。
   - 因此 TextFlow Typography Maturity 不应只是 8.9 的尾巴，而应单开 V2.BN.8.10。

4. Native / desktop-shell / multi-window
   - 长 PageStack 确实指向未来桌面工作台心智。
   - 但当前不应因为这个立刻改技术路线。
   - 8.9 只需要把数据模型和交互边界设计成未来可承接多窗口即可。

5. 完整 PageSlice 复用到 ContentGroup / GraphRAG
   - PageSlice 可以成为引用对象的原则已经确定。
   - 真正进入 ContentGroup projection、Relation View、GraphRAG 的部分，应该放到 V2.BN.8.11+ / V2.BN.8.13+。

### 23.3 建议新增的 8.9 后续版本

推荐把 8.9.8 之后继续拆成四个小版本：

```text
V2.BN.8.9.9
  PageFrame Command Surface And Creation
  目标：建立最小 Command Surface / Context Menu seed；
       空白 Canvas 可以新建 PageFrame / PageStack；
       toolbar 也应提供新建入口；
       PageFrame 有最基础对象操作入口。

V2.BN.8.9.10
  PageFrame Operable Object
  目标：让 PageFrame 真的能被用户选择、移动、配置、复制、删除、设为 primary。

V2.BN.8.9.11
  Continuous PageStack v1
  目标：把 fixed / continuous 的分歧收束成统一 PageStack 模型；
       A4 note 默认走连续写作心智；
       Canvas Mode 对长 PageStack 使用折叠 / 预览入口。

V2.BN.8.9.12
  PageSlice And Cross-page Block Integrity
  目标：稳定跨页 block 的渲染 fragment、continuation marker、
       PageSlice 抽离提示、split block 确认、PageSlice snapshot 引用边界。
```

这四个版本完成后，8.9 才更像真正的 PageFrame Maturity：

```text
8.9.1 - 8.9.8 解决 PageFrame 的工程成熟。
8.9.9 - 8.9.12 解决 PageFrame 的用户可用成熟。
```

### 23.4 V2.BN.8.10 TextFlow Typography Maturity

Henry 进一步确认：TextFlow 的字体、字号、行距、段距与 PageFrame 有千丝万缕的联系。

```text
PageFrame 决定纸是什么。
TextFlow typography 决定字如何落在纸上。
```

如果没有成熟的 typography 系统，PageFrame 的分页、导出、阅读比例和 AI-readable layout 都会一直被拖住。

因此，版本顺序调整为：

```text
V2.BN.8.10
  TextFlow Typography Maturity
  目标：建立用户可配置的 font family / font size / line height / paragraph spacing；
       建立 document typography profile；
       让 PageFrame pagination / export / AI-readable layout 都读取同一份 typography truth。

V2.BN.8.11
  Object projection and reuse
  原 8.10 顺延。

V2.BN.8.12
  Structured object family
  原 8.11 顺延。

V2.BN.8.13+
  ContentGroup Mode / Relation View
  原 8.12+ 顺延。
```

这个调整的意义是：

```text
8.9 把 PageFrame 做到用户可用。
8.10 把 TextFlow 的文档排版尺度做稳。
8.11 再开始 ContentGroup / Object projection。
```

这样后续 projection 不会建立在一个字体字号、行距、分页尺度都不稳定的页面系统上。

## 24. 补充：MinerU 作为外部文档解析参考

讨论 PageFrame Reading View 时，Henry 提到 GitHub 上的 MinerU 项目，并提出一个问题：

```text
如果 MinerU 能识别版面结构、去掉页眉页脚，并提取正文、表格、公式和图片信息，
它是否会对 Coincides 的外部文档导入和 AI-readable layout 很有用？
```

初步调研结论：

```text
有用，但它的定位不是替代 Coincides 内部 PageFrame / Canvas Reading View。
它更适合成为外部文档进入 Coincides 之前的 SourceArtifact parsing / import pipeline 候选。
```

MinerU 的关键能力：

- 支持 PDF、图片、DOCX、PPTX、XLSX 等输入。
- 输出 Markdown、JSON、按阅读顺序排序的结构化内容，以及多模态 Markdown。
- 能去除页眉、页脚、脚注、页码等干扰元素，帮助保持语义连续。
- 能处理单栏、多栏和复杂版式，并输出更接近人类阅读顺序的文本。
- 能提取图片、图片描述、表格、表格标题、脚注。
- 能识别公式并转换为 LaTeX，识别表格并转换为 HTML。
- 提供 layout / span 等可视化调试文件，可以检查版面识别框、阅读顺序和 OCR / 公式识别质量。

对 Coincides 的意义：

```text
MinerU 证明了一件事：
复杂页面不应该直接交给 AI 看原始坐标或原始截图。
更稳的路径是先把页面编译成结构化 reading order / content blocks / layout blocks，
再交给 AI 或 RAG 使用。
```

这与本次讨论形成的 PageFrame Reading View 思路高度一致：

```text
外部文档：
  PDF / image / Office file
    -> MinerU-like parser
    -> Markdown / JSON / layout blocks
    -> SourceArtifact / TextFlow / ContentGroup seed

Coincides 内部画布：
  CanvasPlacement / PageFrame / Block
    -> PageFrame Reading View
    -> AI-readable snapshot
```

因此，MinerU 后续可以作为三类参考：

1. `SourceArtifact` 导入管线候选：用于把外部 PDF / Office / 图片资料转成 Coincides 可消费的结构化材料。
2. `PageFrame Reading View` 设计参考：学习它如何表达 layout block、reading order、正文/表格/公式/图片等内容类型。
3. 调试工具参考：layout 可视化文件提醒我们，Coincides 未来也需要能展示 AI-readable layout / reading order 的调试视图。

暂不立刻接入的原因：

- 当前 8.9 的重点仍是 PageFrame / PageStack / layout affiliation。
- MinerU 是外部解析器，不解决内部 CanvasObject 与 TextFlow 的布局归属问题。
- 接入前需要单独评估本地部署方式、依赖体积、许可证附加条款、API / CLI / Docker 工作流，以及输出 JSON 如何映射到 `SourceArtifact`、`TextFlow`、`PageFrameReadingView`。

参考链接：

- GitHub: https://github.com/opendatalab/MinerU
- Output files: https://opendatalab.github.io/MinerU/reference/output_files/
- Paper: https://arxiv.org/abs/2409.18839

## 25. 补充：Layout Affiliation 不应只属于 PageFrame

继续讨论 PageFrame Reading View 与 Block / PageFrame 关系时，形成了一个更通用的判断：

```text
Layout Affiliation 不应该只是 PageFrame 的专属补丁。
PageFrame 是第一个、最重要、最特殊的 Layout Container，
但未来很多 CanvasObject 都可能需要成为 Layout Container。
```

原因是：PageFrame 虽然承担正式页面、导出边界和文档排版上下文，但它不是唯一能承载 TextFlow 的对象。未来如果一个矩形、sticky note、表格单元格、ContentGroup projection 小窗，或者 diagram node 里可以填充文字，它们也需要局部的排版规则。

因此，模型应从：

```text
Block belongs to PageFrame
```

升级为：

```text
TextFlow = 内容真相
CanvasObject = 几何 / 外观 / 交互对象
LayoutContainer = 可承载内容和排版上下文的容器
ContentMount = TextFlow / Block 挂载到某个 LayoutContainer 的关系
LayoutAffiliation = object / mount 当前挂靠在哪个 layout context
ReadingView = 面向 AI / export / preview 的可读投影
```

PageFrame 在这套模型里是特殊的 `LayoutContainer`：

- 它是 document-scale layout container。
- 它有 page size、content inset、ruler、header/footer/page number、export policy。
- 它会影响里面 TextFlow block 的可写区域、阅读顺序、导出范围和 PageFrame Reading View。

其他对象也可以成为局部 `LayoutContainer`：

- 矩形填字后，可以成为 shape-backed layout container。
- sticky note 可以成为 local note layout container。
- 表格单元格可以成为 cell layout container。
- ContentGroup projection 小窗可以成为 content package layout container。

这样，矩形里填文字时，不需要另起一套文本系统：

```text
纯矩形：
  普通 CanvasObject。

矩形里填了文字：
  仍然是 CanvasObject，
  但升级为 block-backed CanvasObject / LayoutContainer。

里面的文字：
  仍然是 TextFlow / paragraph block / content mount，
  只是挂靠在这个局部 LayoutContainer 里。
```

这也意味着局部对象未来可以拥有自己的：

- content inset / padding；
- 对齐规则；
- 局部 ruler / margin；
- font family / font size / line height；
- paragraph spacing / indent；
- AI-readable local reading view。

当前对 8.9 的直接影响：

```text
8.9 先以 PageFrame 作为第一个 LayoutContainer 实例，
解决 PageFrame 内 block 的布局亲缘、移动联动和 AI-readable PageFrame Reading View。
不要把模型写死成 PageFrame-only owner 字段。
```

后续对 8.10+ / Object projection 的影响：

```text
TextFlow Typography Maturity 不只服务 PageFrame，
也会成为所有 LayoutContainer 的 typography truth。

ContentGroup projection / shape text / sticky note / structured object
都可以复用同一套 LayoutContainer + ContentMount + ReadingView 模型。
```
