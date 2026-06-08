# R5 - Page Editor Freeform Block-Box 需求细化

## 本阶段问题

R5 要回答的是：Coincides 是否需要一种介于普通文档编辑器和无限画布之间的 page editor，以及这种 editor 中的 block-box 应该怎样定义。

R3 已经确认：NoteBlock 是内容 truth，CanvasNode 是 projection。R4 已经确认：用户期待的是页面即编辑入口，而不是表单式添加 block。R5 因此专门细化“用户在页面里自由调整 NoteBlock 位置和大小”的需求。

## 证据来源与证据等级

- A 级代码证据：
  - `note_block_placements` 当前已有 `display_mode`、`display_overrides_json`。
  - `canvas_nodes` 当前已有 `x/y/width/height/z_index`。
  - `LearningCanvasSurface` 当前支持 CanvasNode move/resize。
  - `NoteDetail` 当前只支持线性 block list + up/down reorder。
- D 级产品需求证据：
  - 用户希望 page editor 中的 block 能像文本框一样 resize。
  - 用户希望缩窄段落后文字提前换行。
  - 用户希望在右侧空白处双击后创建与左侧 block 并排的新 block。

## 总体结论

Coincides 需要的不是传统 Notion 式单列 block editor，也不是纯无限画布。

它需要的是：

> Page-first freeform block-box editor：页面仍像文档，但每个 NoteBlock 在 layout edit mode 下可以表现为可移动、可 resize、可并排的 block box。

这个模型的核心不是“把画布当 truth”，而是：

```text
NoteBlock = 内容 truth
BlockBox = NoteBlock 在某个 page/document view 里的 layout/presentation
```

R5 的关键判断是：

- block-box 应该是 placement/presentation。
- block-box 的位置和大小不应改写 NoteBlock 内容。
- 文本换行由 block-box width 影响，但 AI 读取内容时仍读 NoteBlock truth。
- 页面内 block-box 默认导出。
- 页面外 block-box 默认 scratch/private，不导出，除非用户改 export intent。

## 1. 为什么传统单列 block editor 不够

Notion 式单列 block editor 的优点是简单、稳定、容易输入。

但 Coincides 的目标包含：

- 左文右图。
- 左 formula 右 explanation。
- definition 旁边放 sticky note。
- proof 中间插图。
- source quote 与 interpretation 并排。
- 页面外 scratch work。
- AI layout proposal。
- 未来 iPad 手写和草稿区。

这些需求都要求 block 能在页面中拥有二维 layout。

如果只能上下排列，Coincides 会失去自己区别于 Notion/Logseq 的关键体验。

## 2. 普通编辑状态与 Layout Edit Mode

R5 建议区分两种状态。

### 普通编辑状态

用户主要写内容。

特点：

- 光标优先。
- 文本输入优先。
- block 边框弱化或隐藏。
- 常用 slash command / inline toolbar。
- 不强调拖拽和 resize。

### Layout Edit Mode

用户主要调排版。

特点：

- 每个 block 显示边框。
- block 显示 resize handle。
- block 显示 drag handle。
- 可以多选。
- 可以对齐。
- 可以设置宽度、高度、z-index。
- 可以设置 export intent。
- 可以显示 source/relation badges。

### 切换原则

普通用户不应被迫一直看到 block box。

推荐：

- 默认是普通编辑状态。
- 选中 block 边缘或按布局按钮后进入 layout edit mode。
- 拖动/resize 时自动进入 layout edit mode。
- 退出后回到自然文档状态。

## 3. 双击空白处创建 block 的插入规则

用户双击页面空白处时，系统应该创建 text insertion point。

但这个 insertion point 不应该机械地永远在页面最左侧。它应考虑鼠标位置和附近对象。

### 页面内空白处

规则建议：

1. 找到鼠标所在 page。
2. 找到鼠标所在 y 位置附近的可用行带。
3. 如果该行左侧没有阻挡，创建从页面正文左边界开始的 text block。
4. 如果左侧存在图片、sticky note、figure、block-box，则从最近阻挡物右侧开始。
5. 新 block 的宽度延伸到页面右边界或下一个阻挡物前。
6. 新 block 默认 `export_role = formal`。

### 页面外空白处

规则建议：

1. 创建 scratch block 或 regular NoteBlock with scratch placement。
2. 默认不导出。
3. 可以与页面内 block 建立 ObjectRelation。
4. AI 可读取，但需要知道它是 scratch/private。

## 4. 右侧空白处双击创建并排 block

用户提出的关键体验是：

> 一个段落 block 被缩窄到页面左半边后，右边仍是空白。用户把鼠标移到右边空白区域双击，应能创建一个与左侧 block 并排的新 block。

R5 判断这是 Coincides page editor 的核心能力之一。

### 规则建议

当用户双击位置与已有 block 的垂直范围重叠时：

1. 找到同一 y band 中已有 block。
2. 判断鼠标所在区域是否是可用空白。
3. 如果右侧空白足够，创建新 block。
4. 新 block 的 y 与左侧 block 对齐。
5. 新 block 的 height 可以使用默认值，也可以随内容增长。
6. 新 block 的 width 使用从鼠标所在 x 到右边界之间的可用空间。
7. 如果存在多个候选阻挡物，以最近的可用矩形为准。

这个行为类似“页面排版软件”的插入体验，而不是传统文档的线性输入。

## 5. Block Resize 与文本换行

当用户缩窄 text block：

- 内容不变。
- `plain_text` 不变。
- `content_json` 不变。
- layout width 改变。
- 渲染时文本在 box 内提前换行。
- 导出 PDF/HTML 时应按该 width 渲染。
- AI 读取时默认读取原始 NoteBlock 文本，而不是按视觉换行读取。

### 高度

高度有两种模式：

1. auto height
   内容决定高度，适合普通文字。

2. fixed height
   用户手动设定高度，溢出时显示 scroll/collapse/overflow warning。

R5 建议第一版优先 auto height，避免文本被剪切。

### Text flow shape

如果未来支持不规则形状、绕图排版、段落缩进，则需要更复杂的 text flow shape。

R5 第一版只要求矩形 box：

```text
x, y, width, min_height, auto_height, z_index
```

## 6. 数据应该放在哪里

当前有两个候选：

### 方案 A：放在 `note_block_placements.display_overrides_json`

优点：

- 与 note 内 placement 绑定。
- 保持 NoteBlock truth 和 layout 分离。
- 适合 page editor。

缺点：

- 当前字段较泛，不够清晰。
- 多 page/canvas view 可能需要多个 placement layout。

### 方案 B：放在 `canvas_nodes`

优点：

- 已有 x/y/width/height。
- 已支持 move/resize。
- 与 canvas-first 方向一致。

缺点：

- CanvasNode 是 projection。
- 如果所有 page editor layout 都强依赖 CanvasNode，会让 page editor 和 canvas editor 混在一起。
- 普通 note 的线性 placement 和 canvas node 可能重复。

### 方案 C：新增 PageLayoutPlacement / DocumentLayoutObject

优点：

- 明确 page editor layout 是一层独立 presentation。
- 可同时支持 formal page、scratch area、multi-page。
- 可映射到 CanvasNode 或 AFFiNE/BlockSuite runtime。

缺点：

- 新增 schema 和迁移成本。
- 需要更清晰的 editor route 决策。

### R5 初步建议

不要立即定表。

在 PI-046 结束前，R5 只锁需求：

```text
BlockBox layout 必须独立于 NoteBlock 内容 truth。
BlockBox layout 必须能表达 page-aware x/y/width/height/export intent。
BlockBox layout 必须能被 editor engine 重建。
```

具体使用 `note_block_placements`、`canvas_nodes` 还是新表，应等 R7-R11 完成 AFFiNE / BlockSuite 调研后决定。

## 7. Collision-aware Insertion

Coincides 需要 collision-aware insertion，但第一版可以保守。

### 必须支持

- 找到点击位置附近的空白矩形。
- 避开已存在 block-box。
- 避开 image / sticky note / figure。
- 插入后不覆盖已有内容。
- 如果无法插入，提示用户或创建到下一行。

### 可以暂缓

- 复杂自动重排。
- 多列自动 flow。
- 智能避让曲线。
- 自动绕图。
- 复杂约束布局。

第一版只需要“不要明显盖住已有东西”。

## 8. Snap / Grid / Alignment Guides

为了让用户排版不痛苦，R5 建议后续支持：

- page margin guides。
- baseline / row guide。
- snap to left/right/page center。
- snap to nearby block。
- equal width/height hints。
- alignment lines。

这些不一定是第一版必做，但应在架构上保留空间。

## 9. 与 AFFiNE / BlockSuite 调研的关系

R5 强烈依赖 R7-R11：

- AFFiNE 是否已有类似 page + edgeless 双模式。
- BlockSuite 是否支持 block resize。
- BlockSuite block 是否能嵌入 Coincides metadata。
- AFFiNE page mode 是否允许自由并排 block。
- Edgeless canvas 是否能承载 formal page area。
- 是否能在不 fork 全部 app 的情况下接入 editor runtime。

如果 AFFiNE / BlockSuite 已经能提供 70% 以上 page/canvas 编辑能力，自研 page editor 的必要性会显著下降。

如果它们不能承载 Coincides 的 block-box 需求，则 Coincides 需要自研或 hybrid。

## 10. R5 解决的问题

R5 解决了：

1. Coincides 需要二维 page layout，不只是线性 block list。
2. block-box 是 presentation/placement，不是新的内容 truth。
3. resize 改的是 layout，不是 NoteBlock 内容。
4. 页面右侧空白双击创建并排 block 是合理核心需求。
5. 当前不能急着定 schema，应等 AFFiNE / BlockSuite 调研结果。

## 11. 暴露的风险

1. **自研成本高**
   自然 page editor + collision-aware insertion + resize + export 是大工程。

2. **数据重复风险**
   如果 `note_block_placements` 和 `canvas_nodes` 同时保存 layout，可能造成同步问题。

3. **用户心智风险**
   用户不关心 NoteBlock / CanvasNode 区别，但系统必须分清。

4. **导出风险**
   block-box 布局必须能稳定导出，否则用户会失去信任。

## 12. 对后续阶段的影响

- R6 必须定义 page/canvas mode 和导出边界，决定 block-box 在 formal page 和 scratch area 中的行为。
- R7 必须观察 AFFiNE 的 page/edgeless 是否支持或接近 block-box。
- R8 必须检查 BlockSuite 的 block schema、layout、selection、drag/resize 能力。
- R9-R11 必须把 block-box 作为 adoption route 评分核心项。
- R12 必须定义 AI 如何读取 block-box layout：内容优先，layout 作为辅助 context。
- R13/R14 必须根据 block-box 实现成本决定自研、fork、hybrid 或 defer。

## 13. 反补前序报告

R5 不需要修改 R0-R4。

但 R5 强化了 R4 的判断：自然笔记体验不只是“点击输入”，还包括 block 可在页面二维布局中自然存在。R13/R14 汇总时应把 freeform block-box 写成 Layer A 的核心需求之一。

## R5 结论

Coincides 的 page editor 应支持：

```text
普通编辑状态：像文档一样写
Layout edit mode：像排版工具一样调 block-box
NoteBlock：内容 truth
BlockBox：placement/presentation
Canvas：view/projection
```

R5 不建议现在立刻自研完整 editor，也不建议现在锁死 schema。最稳妥的下一步是用 R7-R11 调研 AFFiNE / BlockSuite 是否能承载这种 freeform block-box 体验。
