# S2 - R3-R5 Page / Canvas / Block / Control 阶段总结

## 0. 总结定位

S2 总结 R3-R5：

- R3：Page / Canvas / Export Boundary
- R4：Block Visual Language / Content Types
- R5：Controls / Toolbar / Context Menu / Shortcuts

这三份报告共同回答一个核心问题：

```text
Coincides 的 Better Notebook 到底应该怎样被用户“看见”和“操作”？
```

S1 已经确认：Coincides 不应该继续只是工程功能集合，而要变成一个自然可写、可读、可排版的笔记/报告表面。S2 则进一步确认：这个表面必须同时支持正式页面、页面外草稿区、可自由排版的 NoteBlock、可隐藏的 metadata、以及分层控制入口。

## 1. 阶段总判断

R3-R5 的总判断是：

```text
Better Notebook 不是普通线性 page editor，
也不是无限 canvas 白板。

它应该是一个 page-first、canvas-backed、source-aware、relation-capable 的文档表面。
```

换句话说，用户第一感觉应该是：

```text
我在写一份文档 / 笔记 / 报告。
```

而不是：

```text
我在操作 canvas node / source board node / proposal object / debug id。
```

但系统底层仍然需要保留：

- NoteBlock truth；
- placement / projection；
- source provenance；
- relation；
- template/domain；
- export intent；
- AI visibility；
- operation history。

这就是 Coincides 与普通笔记软件的差异：用户看到的是自然文档，系统保留的是可追踪、可重建、可被 AI 读取的结构。

## 2. R3 的核心收束：Page / Canvas / Export Boundary

R3 确认了三个层次：

```text
formal page = 正式输出区域
outside workspace = 页面外草稿/备注/推导区域
export intent = 每个对象是否参与导出的明确策略
```

### 2.1 页面内外不能只靠视觉判断

位置可以作为默认规则：

```text
formal page 内 -> 默认导出
page 外 -> 默认不导出
```

但最终必须有对象级 metadata：

```text
export_role
ai_visibility
placement_role
```

否则用户把一个 block 从页内拖到页外后，系统很难判断它是临时草稿、私人备注，还是正式内容的一部分。

### 2.2 页面外内容仍然可以有意义

页面外不是垃圾区。它可以是：

- 用户推导；
- 学习疑问；
- 私人备注；
- AI 给用户的提示；
- 与正式内容有关但不想导出的 side note。

这些对象可以和正式页内对象建立 relation，也可以被 AI 在适当上下文中读取。

### 2.3 导出必须是产品一等能力

Better Notebook 将来要支持：

- PDF；
- HTML；
- PNG；
- project package；
- AI context export。

所以 export boundary 不是后期小功能，而是页面模型的基础。

## 3. R4 的核心收束：Block Visual Language

R4 确认：当前 Coincides 的 block / canvas node 视觉仍偏工程卡片。

Better Notebook 中，block 应该回到内容本身。

### 3.1 block type 不应常驻正文

建议显示层级：

```text
Reading: hidden or very subtle
Hover: tiny badge
Selected: type / role
Inspector: full template / system type / learning role
Debug: ids and raw metadata
```

### 3.2 metadata 不应该污染阅读

以下信息不应常驻正文：

- source board node；
- source scope id；
- canvas_node_id；
- target_id；
- template_definition_id；
- proposal id；
- operation batch；
- raw relation state。

它们应该进入：

- badge；
- selected toolbar；
- inspector；
- debug mode。

### 3.3 内容类型需要成熟视觉语言

R4 确认当前模板 seed 有基础，但视觉呈现还不够成熟。

至少需要：

- paragraph；
- heading；
- definition；
- theorem；
- proof；
- formula；
- example；
- exercise；
- source quote；
- callout；
- code；
- image / figure；
- table；
- sticky / scratch note。

这些不一定都是全新 truth type。很多可以是 template + render hint + placement/export/AI behavior 的组合。

### 3.4 Custom style editor 要推迟

样式编辑能力很重要，但第一阶段不能被它拖走。先做：

```text
默认 block 视觉语言
-> selected/hover/inspector 状态
-> render hints / style presets
-> Visual Style Studio / style packs
```

## 4. R5 的核心收束：Control Layer

R5 确认：Coincides 不缺功能，缺的是控制层秩序。

Better Notebook 的控制面应分层：

```text
App shell / sidebar
Page topbar
Caret / slash command
Text selection toolbar
Block hover affordance
Selected block floating toolbar
Layout edit mode
Context menu
Right inspector
Debug / Agent command context
```

### 4.1 常驻控件要少

常驻 topbar 只应该放：

- note/project breadcrumb；
- title；
- view mode；
- undo / redo；
- search；
- export / share；
- inspector toggle；
- more。

不应该常驻：

- source board debug；
- selected ids；
- operation batch；
- all proposal actions；
- all template/package controls。

### 4.2 Slash 是创建和转换入口

用户点击空白处即可写，输入 `/` 后切换 block 类型：

- text；
- formula；
- image；
- code；
- table；
- source quote；
- composition；
- sticky note。

这比“先点 Add block，再填表单”更接近成熟笔记软件体验。

### 4.3 Selected toolbar 是 block 级高频操作入口

选中 block 后可以出现：

- convert；
- format；
- source；
- relation；
- comment；
- layout；
- duplicate；
- more。

这里不显示 debug ids。

### 4.4 Layout mode 专门处理排版

layout mode 显示：

- block boundaries；
- resize handles；
- drag handles；
- snap；
- alignment guides；
- z-index；
- export boundary hints。

普通阅读/写作状态下，这些应尽量隐藏。

### 4.5 Inspector 承担结构化细节

Inspector 应有：

- Overview；
- Content；
- Source；
- Relations；
- Layout；
- Export；
- AI；
- History；
- Debug。

Debug 默认不展开。

## 5. 三份报告合并后的产品规格

S2 建议把 R3-R5 合并成以下规格。

### 5.1 文档表面

```text
一个 Note 有正式页面区域，也有页面外 workspace。
正式页面用于阅读、导出和分享。
页面外 workspace 用于备注、推导、临时整理和私人思考。
```

### 5.2 内容对象

```text
NoteBlock = 内容 truth
BlockBox / Placement / CanvasNode = 位置和呈现
CanvasShape = 纯视觉对象
CanvasEdge = 视觉连接
ObjectRelation = 语义关系
```

### 5.3 视觉状态

```text
Reading state: 内容优先，边框和 metadata 弱化
Writing state: 光标、slash、文字工具栏
Selected state: floating toolbar + light border
Layout state: resize / drag / snap / guides
Inspector state: source / relation / export / AI / debug
```

### 5.4 输出策略

```text
export intent 是对象属性，不只是位置推断。
page 内默认导出，page 外默认不导出。
用户显式设置优先于默认位置。
```

### 5.5 控件策略

```text
常驻按钮少；
对象操作靠近对象；
低频操作进右键；
复杂结构进 inspector；
危险操作走确认 / trash / proposal / operation batch。
```

## 6. 当前 Coincides 的可复用部分

R3-R5 不要求推倒所有 v2.x 成果。

可以复用为 seed 的能力：

- Canvas Document 主工作区；
- canvas node move / resize；
- selected node / selected edge；
- hidden node restore；
- relation layer；
- canvas edge / ObjectRelation seed；
- Canvas Add Block；
- TemplateDefinition runtime；
- CompositionTemplate；
- source scope / source board；
- proposal-first；
- operation batch；
- selected object scope。

但它们必须被重新安放到成熟 UI 中。

## 7. 当前 Coincides 需要明显调整的部分

### 7.1 Course Detail 不应继续承载所有气泡

R3-R5 都指向同一个问题：当前 Course Detail 像一个工程施工页，所有能力都堆在一起。

Better Notebook 应把主工作区变成 note/document surface。

Source、Board、Proposal、Template、Package、Debug 都应变成侧栏、inspector、studio 或 review layer，而不是全部压在一个长页面里。

### 7.2 Canvas node 不应像后台卡片

Open / Hide / source board node / page / resize handle / ports 不应全部常驻。

应该变成：

- reading：内容；
- hover：handle / badges；
- selected：toolbar；
- layout：resize/ports/guides；
- inspector：细节。

### 7.3 Hide / Archive / Delete 文案必须重做

当前 `Hide node` 容易被理解成删除。Better Notebook 必须区分：

```text
Move to trash
Remove from page
Hide line/layer
Archive edge/scope/object
Exclude from export
```

## 8. Roadmap 影响

S2 建议新版 roadmap 在 Better Notebook 初期加入以下连续阶段。

```text
Phase A1 - Product Shell And Navigation
Phase A2 - Natural Page Writing
Phase A3 - Formal Page / Outside Workspace / Export Boundary
Phase A4 - Block Visual Language
Phase A5 - Command Surface / Inspector / Control Layer
Phase A6 - Better Notebook Data Contract
```

其中 R3-R5 主要支持 A3-A5，也为 R6 的 A6 做准备。

### 8.1 Phase A3 最小验收

- 有正式 page boundary；
- 有页面外 workspace；
- page 内外对象有默认 export intent；
- export intent 可手动修改；
- page 外对象可 relation 到 page 内对象；
- AI 读取时知道对象是 formal、scratch、private 或 annotation。

### 8.2 Phase A4 最小验收

- paragraph 默认像自然文本，不像卡片；
- block type 不常驻；
- hover/selected/inspector/debug 分层显示 metadata；
- formula/image/code/table/source quote/sticky 有基本视觉语言；
- selected block 显示边框和 toolbar；
- layout mode 显示 resize handles 和 guides。

### 8.3 Phase A5 最小验收

- slash command 可创建/转换 block；
- selected block floating toolbar；
- right-click menu；
- inspector；
- layout mode toggle；
- hide/archive/delete/remove/export 文案分清；
- debug ids 隐藏到 debug inspector。

## 9. 对 R6 的直接要求

R6 必须把 S2 的产品判断转成数据契约。

必须回答：

- BlockBox / Placement / CanvasNode 如何分层？
- export intent 存在哪里？
- page 内外 placement role 存在哪里？
- AI visibility 存在哪里？
- Hide / Remove / Archive / Trash 是否有不同状态？
- source/relation/template metadata 如何挂在 NoteBlock 上？
- debug ids 如何保留但不污染 editor？
- editor snapshot 丢失后如何重建页面？

如果 R6 没有把这些区分清楚，后续 UI 做得越漂亮，数据风险越大。

## 10. 对 R7/R8 的直接要求

如果继续评估 AFFiNE / BlockSuite，必须带着 S2 的规格去评估，而不是只看它们是否好看。

必须验证：

- 是否能支持 formal page / outside workspace / export intent；
- 是否能支持 block-box resize；
- 是否能隐藏 metadata；
- 是否能提供 selected toolbar / hover handle / context menu / inspector；
- 是否能承载 source/relation/template badges；
- 是否能保留 Coincides truth，而不是让 editor snapshot 接管 truth；
- 是否能把 visual connector 和 ObjectRelation 分开。

## 11. 风险

### 11.1 过早开发复杂编辑器

R3-R5 的结论很诱人，但它们也意味着工程量很大。不能在没有 R6 数据契约和 R7/R8 路线判断前，就直接大规模写 editor。

### 11.2 继续堆 UI 会浪费已有成果

如果继续在 Course Detail 里加按钮，v2.x 的强大数据结构会变成用户看不懂的噪音。

### 11.3 隐藏 metadata 后找不到功能

R4/R5 提倡隐藏 metadata，但必须用 hover、selected toolbar、inspector、badge 保证能力可发现。否则会从“按钮太多”变成“功能找不到”。

### 11.4 export intent 如果后补会很痛

如果先做 page/canvas，再后补 export intent，很可能需要大量迁移。export intent 应在第一版 Better Notebook layout 数据中就存在。

## 12. S2 对前面阶段的反补

S2 强化 S1 的判断：

```text
我们不是要继续堆 AI 能力，
也不是直接做 GraphRAG 或 Source Reconstruction，
而是先把人类手动写作、阅读、排版、导出体验做稳。
```

S2 也说明：

- S1 的“自然写作”必须和 R3 的 formal/scratch/export 结合；
- S1 的“成熟 baseline”必须落到 R4/R5 的视觉状态与控件分层；
- 后续 roadmap 不能只写“做 editor”，必须拆成 page boundary、block visual、command surface、data contract。

## 13. S2 结论

R3-R5 已经把 Better Notebook 的可见产品形态基本定出来：

```text
正式页面 + 页面外 workspace
自然 NoteBlock + 可自由调整的 BlockBox
内容优先 + metadata 按需出现
page/canvas/export 分层
slash / hover / selected toolbar / layout mode / right-click / inspector 分工
delete / hide / archive / remove / export intent 分清
```

下一步 R6 必须回答：这些产品判断怎样变成稳定数据契约。

在 R6 之前，不建议直接开写大规模 UI。R3-R5 已经证明了要做什么，R6 要证明这些东西怎样不把数据结构搞乱。R6 之后，R7/R8 才能判断 AFFiNE / BlockSuite / 自研路线哪一个最现实。
