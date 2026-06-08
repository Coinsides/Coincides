# R7 - AFFiNE 产品体验调研

## 本阶段目标

R7 只从产品体验角度看 AFFiNE，不提前做代码和许可结论。代码结构、license、fork / dependency / hybrid 的工程成本留给 R8-R11。

本报告使用 R3-R6 / S2 形成的 Coincides 约束作为评价标准：

- NoteBlock 是内容 truth。
- CanvasNode / block-box 是 projection / presentation。
- CanvasEdge 是视觉交互对象，ObjectRelation 才是语义边。
- 用户需要自然的 page editor，而不是表单式 block 创建。
- 用户需要 freeform block-box、page/canvas、正式页面/页面外草稿区、导出意图。
- source/proposal/template/domain/package/provenance 不能被编辑器模型吞掉。

## 证据来源

本阶段主要参考：

- AFFiNE README：`_external_research/AFFiNE/README.md`
- AFFiNE mode 切换测试：`_external_research/AFFiNE/tests/affine-local/e2e/change-page-mode.spec.ts`
- favorite / export 测试：`_external_research/AFFiNE/tests/affine-local/e2e/local-first-favorite-page.spec.ts`
- paragraph / toolbar 测试：`_external_research/AFFiNE/tests/affine-local/e2e/blocksuite/paragraph.spec.ts`、`_external_research/AFFiNE/tests/affine-local/e2e/blocksuite/toolbar.spec.ts`
- edgeless note / connector / shape / frame / embed 测试：`_external_research/AFFiNE/tests/affine-local/e2e/blocksuite/edgeless/*.spec.ts`
- Henry 提供的 AFFiNE page / edgeless 截图观察。

这些证据足够支持“产品体验层面的初步判断”，但不足以支持“能否改造”的最终判断。

## 一句话结论

AFFiNE 是非常值得学习和重点调研的方向，因为它已经把 Notion 式 page editor、Miro 式 edgeless canvas、workspace shell、favorite、export、toolbar、frame、connector、shape、sticky/note 等体验组织到一个成熟产品里。

但它不能被直接等同于 Coincides 的目标。AFFiNE 的核心体验是 block editor + edgeless canvas；Coincides 的核心目标是 source-grounded NoteBlock + projection + proposal-first + graph-readable semantic layer。AFFiNE 可以成为强编辑器候选或体验参考，但不能让 Coincides 的 source / template / relation / provenance 层被它吞掉。

## AFFiNE 已经做得很成熟的地方

### 1. App shell 和 workspace navigation

从截图和测试看，AFFiNE 有稳定的 workspace shell：

- 左侧 workspace / search / all docs / journals / settings / favorites / folders / tags / import / template。
- 页面可以 favorite，并能在 navigation panel 的 favorites 中直接出现。
- 页面 title 可以直接编辑。
- All docs 能承载文档列表。
- export 入口放在 page more actions 中。

对 Coincides 的启发：

Coincides 现在把太多工程面板堆在 Course Detail。未来产品打磨应优先建立干净的 app shell，把 daily note work、template studio、package studio、source inspection、developer tools 拆到合适入口。favorite 是刚需，尤其当 Project 下有很多 notes 时，用户需要从首页直接进入常用 note。

### 2. Page mode 是自然写作入口

AFFiNE page mode 接近用户熟悉的 Notion / block editor 心智：

- 新建 page 后可直接进入编辑。
- title 可双击/菜单编辑。
- paragraph 可用 markdown-like 输入转 heading、list 等。
- toolbar 支持 conversion、formatting、copy as markdown、duplicate 等操作。
- heading collapse 可折叠内容。

这正好对照 Coincides 当前缺口：Coincides 现在仍偏“选择模板 -> textarea -> 添加 block -> block card list”。这个方式工程上清楚，但不符合普通用户对笔记软件的期待。

R7 初步判断：

如果 Coincides 继续自研 editor，必须先达到 AFFiNE page mode 这种自然输入门槛。否则即使 source / proposal / template 层再强，用户也会觉得它不是一款真正能写笔记的软件。

### 3. Edgeless canvas 是成熟的空间操作层

AFFiNE edgeless mode 已经具有稳定工具体系：

- Alt+S / header button 可切换 page / edgeless，且测试覆盖快速切换稳定性。
- edgeless note 可以创建、选择、collapse、resize、style、link、display in page。
- connector 可以绘制，并有 label editor。
- shape 可以绘制并输入文字。
- frame 支持 z-index / grouping-like 行为。
- text / shape / connector 在 toolbar 中支持颜色等样式。
- embed card 在 edgeless note 中有 overflow 保护。

这说明 AFFiNE 不是一个“文档应用附带弱画布”，而是已经把画布交互做成可测试的一等能力。

对 Coincides 的启发：

我们此前手写的 canvas seed 只能证明 projection model 能跑，无法自然支撑成熟画布体验。若要自己补齐 pan、zoom、selection、resize、frame、connector、toolbar、style、z-index、hover/caret/focus 这些能力，工程量会非常高。AFFiNE / BlockSuite 的最大价值就在这里：它能显著减少成熟交互层的发明成本。

### 4. Page block 与 edgeless note 的双向关系很有参考价值

AFFiNE 测试里有几个重要行为：

- 第一个 note block 被称作 page block。
- page block 在 edgeless 中有 header toolbar。
- page block 可 collapse / expand。
- edgeless note 有 view in page / display in page 入口。
- note 内部仍然能编辑 title 和 paragraph，caret 可以在 title 与内容之间移动。

这对 Coincides 很重要。它说明 AFFiNE 已经把“文档内容”和“画布呈现”之间做了某种桥接，而不是把它们完全割裂。

但这不等于 Coincides 可以直接采用。Coincides 需要的是：

```text
NoteBlock truth -> one or more placements / block-box / CanvasNode projections
```

AFFiNE 更像：

```text
BlockSuite document block <-> edgeless note / page block view
```

两者很接近，但 canonical ownership 不一定一致。这个问题必须交给 R8-R11 深入验证。

## AFFiNE 对 Coincides 的最大价值

### 价值一：成熟编辑体验参考

AFFiNE 最值得借鉴的是用户看得见的体验节奏：

- 左侧 navigation 保持安静。
- 文档标题在顶部清晰呈现。
- 常用操作折叠在 header / toolbar / hover menu 中。
- page mode 适合普通写作。
- edgeless mode 适合空间整理。
- 画布工具集中在 bottom / floating toolbar，而不是散落在页面长气泡里。

Coincides 现在最明显的问题不是“功能不够”，而是功能的展示方式过于工程化。Source Snapshot、Source Scope、Source Board、Canvas Document、Template Studio、Package Studio 等都已经存在，但它们还不是一个清楚的用户工作流。

### 价值二：画布工具箱参考

AFFiNE 已经把下面这些工具做成基础设施：

- select / move / pan / zoom。
- frame。
- shape。
- text。
- connector。
- note。
- color / style toolbar。
- collapse / resize / z-index。
- link / reference。

这些都是 Coincides 若自研会非常消耗时间的能力。

### 价值三：page/edgeless 双模式提醒我们不要把 canvas 想得太窄

Coincides 原先坚持 canvas-first 是对的，因为我们需要布局、投影、source board、relation、scratch area。但 AFFiNE 提醒我们：普通用户仍然需要一个非常自然的 page writing mental model。

这不一定意味着 Coincides 必须完全复制 AFFiNE 的双模式。更合理的方向可能是：

```text
同一份 Note 有正式页面区域，也有页面外 workspace。
普通写作时像 page。
需要空间整理时像 canvas。
导出时按 export intent，而不是按全部画布内容。
```

也就是说，我们可以吸收 AFFiNE 的体验成果，但仍保留 Coincides 自己的 formal page / outside workspace / export intent 模型。

## AFFiNE 目前无法直接回答的问题

### 1. Page mode 是否支持 Coincides 的 freeform block-box

从现有测试看，AFFiNE page mode 非常成熟，但更像传统 block editor：block 沿文档流排列，可以变换类型、折叠、格式化、复制为 Markdown。

它是否支持 Coincides 想要的：

- 在 page 内把段落 block resize 成半宽；
- 在右侧空白处双击生成并排 block；
- 像文本框一样自由拖动 NoteBlock；
- 普通编辑模式和 layout edit mode 分离；
- block-box resize 只改变 wrapping/layout，不改变 NoteBlock truth；

这些都没有在 R7 证据中被确认。

这不是否定 AFFiNE，而是说明 R9 必须专门验证 page editor adaptation。

### 2. Edgeless note 是否能成为 Coincides 的正式页面，而不只是画布对象

AFFiNE edgeless note 的 resize、collapse、style 很强，但 Coincides 需要更多：

- A4 / Letter / custom finite page。
- 多页 grid。
- seamless page stack。
- page label mapping。
- 页面内正式内容与页面外草稿/备注区。
- PDF / HTML / PNG / project package 的不同导出规则。

AFFiNE edgeless 可能能承载其中一部分，但 R7 不能确认。R10 必须进一步研究 edgeless canvas 能否承担 Coincides 的 page/canvas/export boundary。

### 3. Source provenance 没有自然出现

AFFiNE 的体验关注 block、page、canvas、workspace。Coincides 的核心则是：

- source snapshot。
- source anchor。
- source scope。
- evidence set。
- proposal。
- source-backed NoteBlock。

AFFiNE 可能能存 metadata 或 custom block data，但从产品体验层看，source provenance 不是它的主线。Coincides 不能把 source provenance 当成普通附属 metadata 草草塞进去，否则 source trust 会丢。

R11 必须验证：AFFiNE / BlockSuite 是否允许 Coincides 为每个 block 保留稳定 source/proposal/template/domain identity。

### 4. Relation 的视觉线和语义边必须继续分层

AFFiNE connector 的体验成熟，但它首先是 edgeless visual object。Coincides 的边分层是：

```text
CanvasEdge = 视觉/交互边
ObjectRelation = 系统可读语义边
RelationLayer = 显示/筛选/用途组织层
```

因此 AFFiNE connector 可以参考或复用为 CanvasEdge 的交互体验，但不能自动等同 ObjectRelation。

R10/R11 必须验证 connector 是否能绑定到 Coincides semantic relation，而不是只停留在视觉对象。

### 5. Proposal-first 工作流不是 AFFiNE 的天然产品模型

Coincides 的关键安全机制是 proposal-first：

- layout proposal。
- composition proposal。
- template migration proposal。
- domain refinement proposal。
- package import preview。

AFFiNE 的产品体验更像直接编辑和直接应用。Coincides 可以借鉴它的编辑体验，但不能因此放弃 proposal-first 的不可逆操作治理。

## 对 Coincides 的体验路线建议

### 建议 1：承认 AFFiNE 是成熟体验标杆，但不要先把它定为答案

R7 的结论是“强烈值得研究”，不是“直接 adoption”。AFFiNE 解决了 Coincides 当前最痛的用户体验和画布成熟度问题，但它也可能引入 canonical ownership 和 source provenance 的冲突。

### 建议 2：把 Coincides UI 的下一阶段重点从功能堆叠转向工作流入口

未来重构时，Course Detail 不应该继续作为所有功能气泡的容器。更合理的是：

- Project / Note navigation 在 app shell。
- Note editor 是主工作区。
- Source inspection 是可折叠侧栏或 inspector。
- Canvas/page 是文档表面，不是右侧气泡。
- Template / Package / Developer tools 在 Studio。
- Proposal preview 是审阅层，不是混在材料列表里。

### 建议 3：把 AFFiNE page mode 和 edgeless mode 分别映射到 Coincides 问题

R7 后续应拆成三条验证线：

```text
R8: 它的代码/许可/工程复杂度是否允许改造？
R9: page editor 能否改造成 freeform block-box？
R10: edgeless canvas 能否承载 formal page / outside workspace / export intent？
R11: Coincides source/template/relation/proposal/graph 语义层如何接入？
```

不要把这些问题混在一起，否则会得到模糊结论。

### 建议 4：保留“项目文件 / export intent / source package”这条 Coincides 特有路线

AFFiNE 有 export markdown/html/png 的体验，但 Coincides 还需要：

- project package。
- source snapshot / scope / provenance recovery。
- note block / relation / template / domain semantic export。
- 页面外 scratch 是否导出。
- AI 可读结构是否导出。

这块是 Coincides 与普通笔记软件的关键差异，不能因为采用成熟 editor 而删掉。

## R7 对 R8-R14 的后续依赖

- R8 必须验证 AFFiNE / BlockSuite license、monorepo 复杂度、BlockSuite 是否可独立使用。
- R9 必须验证 page editor 是否能支持 freeform block-box，而不是只支持线性 block flow。
- R10 必须验证 edgeless 是否能承载 Coincides formal page、outside workspace、多页、导出意图。
- R11 必须设计 Coincides semantic sidecar / adapter / dual-write / ownership mapping。
- R12 必须把 AFFiNE block / Coincides NoteBlock / ObjectRelation / Concept / Embedding 的 AI-readable 结构联系起来。
- R13 必须把 AFFiNE 的成熟体验加分与 semantic/provenance 风险扣分同时纳入评分。
- R14 必须基于 R7-R13 决定继续当前主线、fork/copy AFFiNE、BlockSuite-first、hybrid，还是自研。

## R7 结论

AFFiNE 对 Coincides 的最大意义不是“它好看”，而是它证明了成熟笔记软件需要一整套细腻的编辑交互：自然输入、block 转换、toolbar、favorite、export、page/edgeless 切换、frame、connector、shape、note、resize、collapse、selection、z-index。

Coincides 如果完全自研，就必须为这些交互付出巨大工程成本。AFFiNE / BlockSuite 是强候选，但是否能成为底座，取决于 R8-R11 能否回答一个核心问题：

```text
我们能否借用 AFFiNE 的成熟编辑/画布体验，同时保留 Coincides 的 source-grounded NoteBlock、proposal-first 治理、template/domain runtime、ObjectRelation 和未来 GraphRAG 结构？
```

R7 的阶段判断是：值得深入，但不能盲目改编。
