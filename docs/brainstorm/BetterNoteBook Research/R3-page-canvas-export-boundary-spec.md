# R3 - Page / Canvas / Export 边界规格

**Created**: 2026-06-05
**Status**: Complete
**Scope**: Better Notebook Research R3
**Evidence Level**: Existing Coincides research, current Coincides code evidence, Browser Harness observation, design inference

## 目的

R3 要回答的是：Better Notebook 里的“页面”和“画布”到底是什么关系，以及哪些内容在导出、分享、AI 读取、工程文件恢复时应该出现。

R2 已经把第一阶段核心交互定为：

```text
Natural Page Editing + Freeform NoteBlock Box
```

但只要 NoteBlock 可以自由摆放，就会立刻出现边界问题：

```text
页面内和页面外有什么区别？
页面外便签是否是笔记的一部分？
它是否导出？
它是否能被 AI 读？
跨页内容怎么处理？
页眉页脚和页码是不是 NoteBlock？
```

R3 的任务不是设计完整导出引擎，而是锁定这些边界的最小产品规则，避免后续 Better Notebook 继续把“视觉位置”“导出范围”“AI 可读范围”混在一起。

## 本报告必须回答的问题

- 页面内内容默认导出、页面外内容默认不导出，这条规则是否成立？
- 页面外内容是否仍可关联页面内 NoteBlock？
- 页面外内容能否被 AI 读取？
- locked page、open canvas、multi-page grid、seamless page stack 分别解决什么问题？
- 多页模式下，block 是否允许跨页？
- block 跨页时导出如何切分？
- 页眉、页脚、页码是 NoteBlock、CanvasDecoration，还是 PageTemplate？
- 用户页码、内部页码、source 页码、导出页码不一致时如何处理？
- 当前 Coincides canvas seed 能保留什么，缺什么？
- 新 roadmap 第一阶段应该先做哪些边界，哪些边界推后？

## 本阶段必须读取的旧 reference

R3 继承 R0 的 reference 选择规则，实际使用了：

- `docs/brainstorm/BetterNoteBook Research/R2-better-notebook-core-interaction-spec.md`
- `docs/brainstorm/BetterNoteBook Research/S1-r0-r2-better-notebook-position-and-core-ux-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R6-page-canvas-modes-and-export-boundaries.md`
- `docs/brainstorm/产品完善/PI-046 Research/S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`

R3 也读取了当前实现证据：

- `client/src/pages/Courses/LearningCanvasSurface.tsx`
- `server/src/services/learningCanvases.ts`
- `server/src/services/canvasLayoutProposals.ts`
- `server/src/db/schema.sql`

## PI-046 Consistency / Conflict Check

R3 不推翻 PI-046。R3 把 PI-046 R6 的判断迁移到 Better Notebook 新路线，并进一步收束成第一阶段可落地的产品规则。

继承的 PI-046 结论：

- Coincides 至少需要 locked single page、open canvas、multi-page grid、seamless page stack。
- 页面内默认是正式内容。
- 页面外默认是 scratch / private / annotation workspace。
- 导出不能只根据视觉位置判断，必须有 export intent。
- 页面外对象仍可和页面内对象建立 relation。
- 页面外对象可以被 AI 读取，但 AI 必须知道它不是默认正式正文。
- internal page index、source page label、export page index、display page label 必须分开。

R3 的新增收束是：

```text
Better Notebook 第一阶段不必实现所有 view mode，
但必须从一开始把 formal page、outside workspace、export intent、AI visibility 写进设计。
```

否则我们会再次得到一个可以摆东西的 canvas，却仍然无法稳定导出、分享、解释和恢复。

## Browser Harness Observation Log

### 观察对象

- 当前本地 Coincides：`http://localhost:5173/#/courses/9581258b-79da-41b5-a309-87cbf723a8b7`
- 当前页面：`Real Material Smoke Course`
- 当前状态：Henry 已手动登录测试账号，Browser Harness 可读取认证后的真实页面。

### 可观察页面状态

Browser Harness 读取到的当前页面关键信息：

```text
Canvas Document
Canvas is the primary document surface.
Source panels remain reference tools; the canvas should not live inside the growing material rail.
A4 portrait
5 nodes
1 hidden
Plan layout
Use composition
Focus canvas
Add block
Connect
Hidden nodes keep their content and can be restored without creating duplicates.
Relation Layers
Selected Object Scope
Course Material
Source snapshots
Selected source scopes
Source Board
```

这说明当前 Coincides 已经具备一个重要基础：Canvas Document 已经不是右侧材料栏里的小气泡，而是课程工作区里的主文档表面之一。它已经有 A4 portrait、node、hidden node、relation layer、selected object scope、add block、connect、layout proposal、composition seed。

但 R3 也由此确认当前缺口：

- 当前页面显示 A4 portrait，但没有 formal page / outside workspace 的明确边界语义。
- 当前节点可 hide / restore，但 hide 不等于 export visibility，也不等于 private note。
- 当前 Relation Layers 已存在，但没有表达“跨页 relation 默认不显示、局部图谱按需显示”的 page 规则。
- 当前 canvas 会根据节点扩展实际显示面积，但没有 page sequence / page break / multi-page export model。
- 当前 Source panels 仍和 Course / Canvas 同屏存在，说明正式 notebook surface 和 source/reference panel 还需要进一步分层。

### 限制说明

- 本轮没有点击、创建、移动或删除任何数据。
- 本轮只把当前 authenticated UI 状态作为 R3 的非破坏性观察证据。
- 具体导出行为没有在浏览器里测试，因为当前产品尚未具备完整 Better Notebook export engine。

## 当前实现对照

### 已有能力

当前 `learning_canvases` 已经有 Better Notebook 可复用的 page seed：

```text
canvas_kind
preset
page_size
orientation
width
height
background_style
```

默认 page seed 已经接近：

```text
finite / page / a4 / portrait / 794 x 1123 / plain
```

当前 `canvas_nodes` 已经有 placement seed：

```text
x
y
width
height
z_index
```

当前 `canvas_viewport_states` 已经有 session viewport seed：

```text
viewport_x
viewport_y
zoom
```

当前 `LearningCanvasSurface` 已经能：

- pan / zoom；
- node move；
- node resize；
- 根据节点范围扩展可视 canvas；
- 插入 block；
- connect edge；
- hide / restore node；
- 显示 relation layer；
- 显示 selected object scope。

这些都是 Better Notebook 的可复用底座。

### 关键缺口

当前实现还缺少：

```text
formal_page_area
outside_workspace_policy
page_sequence
page_breaks
multi_page_layout
seamless_page_stack
margin
export_profile
export_role
export_visibility
ai_visibility
display_page_label
source_page_label mapping
page_decorations
header_footer_rules
cross_page_relation_display_policy
```

因此当前 canvas 是 v2.4/v2.5 的交互种子，不是完整 Better Notebook page/canvas/export model。

## 核心模型

R3 建议把 Better Notebook 的空间分成三条互相独立的边界。

### 1. Layout Boundary

Layout boundary 回答：

```text
这个对象视觉上在哪里？
它在第几页？
它是在页面内，还是页面外？
它的 x/y/width/height 是多少？
```

它主要属于 projection / presentation。

### 2. Export Boundary

Export boundary 回答：

```text
这个对象是否出现在 PDF / HTML / PNG / project package 里？
如果导出，它以正文、注释、附录、source reference、还是 debug 信息出现？
```

它不应该只由视觉位置决定。

### 3. AI Context Boundary

AI context boundary 回答：

```text
AI 是否能读取这个对象？
读取时应把它当正式正文、个人草稿、私密备注、annotation、还是隐藏对象？
```

它也不应该和导出绑定。

最重要规则：

```text
看得见，不代表要导出。
不导出，不代表 AI 不能读。
AI 能读，不代表它是正式正文。
页面外，不代表它没有意义。
```

## Formal Page 与 Outside Workspace

### Formal Page Area

Formal Page Area 是正式页面区域。

默认语义：

```text
export_role = formal
export_visibility = export
ai_visibility = readable
```

适合承载：

- 正文段落；
- definition；
- theorem / proof；
- formula；
- example；
- image；
- source quote；
- report section；
- 可以交给老师、同学、同事或未来自己的正式内容。

它的产品心智是：

```text
这里写出来的东西，默认会成为这份笔记或报告的一部分。
```

### Outside Workspace

Outside Workspace 是页面外的工作区。

默认语义：

```text
export_role = scratch
export_visibility = do_not_export
ai_visibility = readable_with_context
```

适合承载：

- 便签；
- 临时想法；
- “我没学懂”；
- 自己推导的 proof scratch；
- 临时图片；
- source 片段 staging；
- 局部知识图谱；
- AI 给出的临时建议；
- 不希望默认分享给别人的个人备注。

它的产品心智是：

```text
这里是我围绕正式笔记进行思考的空间。
它不是垃圾，也不是默认正文。
```

### 默认规则是否成立

R3 判断：

```text
页面内内容默认导出，页面外内容默认不导出。
```

这条规则成立，但只能作为默认值，不能作为唯一真相。

用户必须能覆盖：

- 页面外便签也可被导出为 margin note 或 appendix；
- 页面内 debug block 也可不导出；
- 页面外 source staging 也可让 AI 读取；
- private note 可以默认不被 AI 读取；
- selected export 可以导出任意 frame / area。

## Page / Canvas View Modes

Better Notebook 至少需要四种 view mode，但不必在第一阶段全部实现。

### Locked Single Page

定义：

```text
一个固定尺寸页面，例如 A4 / Letter / Custom。
页面边界清晰。
用户默认在页面内写正式内容。
```

价值：

- 最接近 Word / PDF / paper note 心智；
- 最适合作为 Better Notebook 第一阶段；
- 最容易验证导出；
- 最容易让用户觉得“我正在编辑一份文档”。

第一阶段建议：

```text
必须做。
```

### Open Canvas

定义：

```text
Formal Page 周围有可移动、可缩放、可放置对象的开放空间。
```

价值：

- 允许便签、草稿、临时推导；
- 允许页面外对象 relation 到页面内对象；
- 保留 Coincides 的 canvas-first 空间能力。

第一阶段建议：

```text
可以做最小版：页面外能放对象，但默认不导出。
```

### Multi-page Grid

定义：

```text
Page 1  Page 2  Page 3
Page 4  Page 5  Page 6
```

价值：

- 总览长文档；
- 快速调整章节；
- 适合多页布局检查；
- 类似 Word 多页缩略视图或设计工具 artboard overview。

第一阶段建议：

```text
推后。
先在数据 contract 中预留 page sequence。
```

### Seamless Page Stack

定义：

```text
Page 1
----- page break guide -----
Page 2
----- page break guide -----
Page 3
```

价值：

- 适合 iPad 手写和长笔记；
- 跨页书写更自然；
- page break guide 提醒 PDF 导出切割位置。

第一阶段建议：

```text
推后。
但 page break / page sequence 的 schema 思路必须提前记录。
```

## 多页与跨页 block

R3 判断：第一阶段不应该做真正的跨页 NoteBlock。

原因：

- 跨页 block 会立刻引入复杂的 text layout engine；
- 导出时需要拆分内容；
- 编辑时 caret、selection、resize、reflow 都变复杂；
- 对第一阶段“自然可写”目标风险太大。

第一阶段建议：

```text
Block 默认 page-local。
Block 可以被移动到某一页内。
Block 超出页面底部时给出 overflow warning 或自动建议分裂。
```

后续可以引入：

```text
continued_block_group
block_segment
page_span
```

但不应在第一阶段硬做。

### 长段落处理

长段落不应在视觉上被裁掉。第一阶段最低规则：

```text
width 改变 -> text reflow
height 不够 -> auto grow 或 overflow warning
```

如果 block auto grow 超出 page bottom：

- 可以暂时允许它视觉溢出并标红 page overflow；
- 或者提醒用户拆分；
- 不要静默切成多页；
- 不要让文字被吞掉。

## 页眉、页脚、页码

R3 判断：

```text
页眉、页脚、页码不应该是每页复制出来的普通 NoteBlock。
```

原因：

- 200 页文档不应产生 200 个页码 NoteBlock；
- 页眉页脚是 page decoration / page template 规则；
- 它们可以显示在 canvas 上，但不应污染内容 truth；
- 它们需要和 export page index、display page label 联动。

建议模型：

```text
PageTemplate / PageDecoration / CanvasDecoration
```

第一阶段可以只预留概念，不实现完整编辑器。

最低规则：

- 页码显示属于 page decoration；
- 页眉页脚属于 page decoration；
- 用户编辑页眉页脚应进入 page setup / document setup，而不是 normal NoteBlock editing；
- AI 查询时可以知道某个 block 的 display page label，但不把页码本身当知识内容。

## Page Label Mapping

R3 必须锁定这一点：内部页码和用户页码不能混用。

建议最小概念：

```text
internal_page_index: 系统内部从 1 开始的物理页序
display_page_label: 用户看到的页码，例如 cover, i, ii, 1, 2
source_page_label: source 原始文档页码
export_page_index: 导出文件中的页序
```

例子：

```text
PDF internal page 1 = cover
PDF internal page 2-7 = i, ii, iii...
PDF internal page 8 = source page label 1
Better Notebook export page 1 = 用户选择导出的第一张正式页面
```

这对 AI 问答很重要。用户问：

```text
第一个三角函数知识点出现在哪一页？
```

系统不应只回答 internal page index，而应返回用户可理解的 display page label，并能必要时附带 source page label。

## Relation Lines 的显示边界

R3 不重新定义 ObjectRelation，但必须说明它和 page/canvas 的显示关系。

第一阶段建议：

- 同页、近距离 relation 可以显示为视觉线；
- 跨页 relation 默认不显示长线；
- 页面外 scratch 到页面内 block 的 relation 可以存在，但默认不在 PDF 中显示；
- 跨页 relation 更适合通过 selected block inspector、local graph view、relation summary、badge 或筛选模式展示；
- Relation visibility 是 view concern，不是 ObjectRelation truth。

核心规则：

```text
ObjectRelation 可以跨页。
CanvasEdge 可以同页可视化。
跨页关系默认不要画成长线。
```

这能避免 80 页文档被大量线条毁掉阅读体验。

## 导出边界

### PDF

PDF 是最严格的 formal export。

默认导出：

- formal page area；
- `export_visibility = export` 的对象；
- page decoration；
- 用户选择包含的 source reference / citation。

默认不导出：

- outside scratch；
- private note；
- hidden objects；
- debug inspector；
- source panels；
- relation layer 长线；
- command context。

### HTML

HTML 可以比 PDF 更丰富。

可选导出：

- 正式内容；
- collapsible source references；
- side notes；
- relation summary；
- appendix；
- selected scratch blocks。

HTML 更适合分享“可研究”的版本，而不是只读 PDF。

### PNG / Image

PNG 更像截图或 selected area export。

规则：

- 如果用户选中 page，导出该 page。
- 如果用户选中 frame / region，导出该区域。
- 如果用户选择 include scratch，则可以导出页面外对象。
- 默认不要把整个 infinite canvas 导成不可读大图。

### Project Package

Project package 是最完整的可恢复格式。

应该包含：

- formal content；
- scratch content；
- source provenance；
- source snapshot / reference；
- relation；
- template/domain/package identity；
- canvas placement；
- export intent；
- AI visibility；
- recovery/proposal history。

这和普通 PDF 不同。Project package 是可编辑、可恢复、可继续研究的工程文件。

## 最小数据契约草案

R3 不要求立刻建表，但建议新 roadmap 至少保留这些概念。

### Page

```text
id
note_id / canvas_id
internal_page_index
display_page_label
page_size
orientation
width
height
margin
background_style
page_template_id
metadata
```

### Placement / CanvasNode 扩展

```text
page_id
inside_page: true / false
x
y
width
height
z_index
export_role
export_visibility
ai_visibility
overflow_state
metadata
```

### PageDecoration

```text
id
page_template_id / page_id
decoration_kind: header / footer / page_number / guide / margin_rule
content_template
position_rule
display_rule
export_rule
metadata
```

### ExportProfile

```text
id
note_id / project_id
format: pdf / html / png / package
include_formal
include_scratch
include_private
include_source_refs
include_relation_summary
page_range
selected_region
metadata
```

### PageLabelMap

```text
id
source_id / note_id / export_id
internal_page_index
display_page_label
source_page_label
export_page_index
metadata
```

## 第一阶段工程边界建议

R3 建议 Better Notebook 第一阶段只实现最小可用 page/canvas/export boundary。

### 第一阶段必须做

- A4 / Letter / Custom 的 formal page seed；
- formal page 内对象默认导出；
- page 外对象默认 scratch，不导出；
- placement 里预留 export role / visibility；
- placement 里预留 AI visibility；
- selected block inspector 能显示该对象是 formal 还是 scratch；
- page 内外对象都能建立 relation；
- hide / restore 和 export visibility 分开；
- block overflow 不吞字，至少 warning；
- current page label / display label 概念进入设计。

### 第一阶段可以不做

- 完整 PDF export engine；
- HTML export；
- project package export；
- multi-page grid；
- seamless page stack；
- 真正跨页 text flow；
- page header/footer editor；
- margin/ruler editor；
- relation local graph view；
- complex selected-area image export。

### 为什么要先做最小边界

如果第一阶段只做自然输入和 resize，而不做 formal/scratch/export metadata，后面会遇到：

- 页面外便签是否导出的判断混乱；
- AI 不知道页面外对象是草稿还是正文；
- project package 无法恢复用户意图；
- relation 线条在长文档中污染阅读；
- PDF export 只能靠视觉位置猜测。

因此边界字段不一定第一天完整 UI 化，但必须进入 roadmap。

## Roadmap Draft Impact

R3 建议新版 Better Notebook roadmap 在 Phase A 后增加一个明确子阶段：

```text
Phase A2 - Page Boundary and Export Intent Seed
```

它可以和自然编辑并行，也可以紧跟在自然编辑之后。

候选拆分：

```text
Phase A1 - Natural Page Editing + Freeform NoteBlock Box
Phase A2 - Formal Page / Scratch Workspace / Export Intent Seed
Phase A3 - Basic Page-aware Export Preview
Phase B  - Multi-page Notebook Surface
Phase C  - Source / Relation / Concept UX Integration
```

R3 对 R4/R5 的直接要求：

- R4 定义 block 视觉语言时，必须区分 formal block、scratch note、private note、source quote、relation badge。
- R5 定义 toolbar / right-click / shortcut 时，必须包含 export visibility、move to formal page、move to scratch area、mark private、include in export 等入口。

R3 对 R6/R8/R9 的直接要求：

- R6 数据契约必须决定 page / placement / export intent 放在哪里。
- R8 source / relation / concept UX 必须遵守 page/canvas/export boundary。
- R9 性能研究必须考虑长文档、多页、跨页 relation、outside scratch 和 export preview 的加载策略。

## Backfeed Notes

R3 不反补 R0-R2，但会强化 R2 的落地边界。

R2 说：

```text
Resize / movement 只改 layout / projection。
```

R3 补充：

```text
layout / projection 也必须包含 export role、export visibility、AI visibility。
```

否则 layout 虽然不改语义 truth，但仍然不足以表达用户的分享、导出和 AI 协作意图。

## R3 结论

Better Notebook 不能只是一个能拖动 NoteBlock 的画布。它必须从第一阶段就区分：

```text
formal page
outside scratch workspace
export intent
AI visibility
page label mapping
```

当前 Coincides 已经有 A4 canvas、nodes、viewport、hide/restore、relation layers、selected object scope，这些是宝贵底座。但它仍缺少真正的 page/export boundary。

R3 的最终建议是：

```text
先做单页 formal page + 最小 outside scratch。
先记录 export intent / AI visibility。
先避免真正跨页 block。
先把页眉页脚页码当 page decoration，而不是 NoteBlock。
先隐藏跨页 relation 长线，用 inspector / local graph / summary 替代。
```

这能让 Better Notebook 保持成熟文档心智，同时保留 Coincides 独有的 canvas、source、relation、template 和 future AI-readable substrate。
