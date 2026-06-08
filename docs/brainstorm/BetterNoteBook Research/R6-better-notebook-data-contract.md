# R6 - Better Notebook 数据契约

## 0. 报告定位

R6 承接 R3-R5 和 S2。

R3-R5 已经把 Better Notebook 的可见产品形态基本定出来：

```text
正式页面 + 页面外 workspace
自然 NoteBlock + 可自由调整的 BlockBox
内容优先 + metadata 按需出现
page/canvas/export 分层
slash / hover / selected toolbar / layout mode / right-click / inspector 分工
delete / hide / archive / remove / export intent 分清
```

R6 要回答的是：这些体验判断怎样落到数据契约中，才不会让 UI 做漂亮之后，底层数据变乱。

本报告仍是调研/规格，不是 migration plan，不新增代码。

## 1. 当前 schema 观察

当前 Coincides 已经有很多可复用 seed。

### 1.1 NoteBlock

`note_blocks` 已有：

- `id`
- `user_id`
- `course_id`
- `block_type`
- `title`
- `content_json`
- `plain_text`
- `status`
- `source_kind`
- `metadata`
- `operation_batch_id`
- `trashed_at`

这说明 NoteBlock 已经可以承担内容 truth。

### 1.2 NoteBlockPlacement

`note_block_placements` 已有：

- `note_id`
- `block_id`
- `parent_placement_id`
- `order_index`
- `display_mode`
- `display_overrides_json`
- `UNIQUE(note_id, block_id)`

这说明它现在更像线性 note placement，而不是完整二维 page layout。

### 1.3 Source reference

`note_block_sources` 已有：

- `block_id`
- `document_id`
- `document_chunk_id`
- `source_page_start`
- `source_page_end`
- `source_excerpt`
- `reference_type`
- `confidence`
- `metadata`

这说明 source provenance 已经有独立表，不必塞进 editor runtime。

### 1.4 LearningCanvas / CanvasNode

`learning_canvases` 已有：

- `canvas_kind`
- `preset`
- `page_size`
- `orientation`
- `width`
- `height`
- `background_style`
- `metadata`

`canvas_nodes` 已有：

- `canvas_id`
- `node_type`
- `target_id`
- `note_block_id`
- `source_scope_id`
- `source_anchor_id`
- `source_board_node_id`
- `evidence_set_id`
- `proposal_id`
- `x`
- `y`
- `width`
- `height`
- `z_index`
- `status`
- `metadata`

这说明 Coincides 已有二维投影层。

### 1.5 CanvasEdge / ObjectRelation / RelationLayer

`canvas_edges` 已有视觉边：

- source / target canvas node；
- port；
- loose target；
- object relation binding；
- relation layer；
- connection state；
- visual style；
- status。

`object_relations` 已有语义边：

- source type/id；
- target type/id；
- relation type；
- visibility；
- confidence；
- source canvas edge；
- relation layer；
- created_by。

`relation_layers` 已有显示/组织层。

这说明 v2.x 已经正确地区分了：

```text
visual connector != semantic relation
```

### 1.6 缺口

当前 schema 还没有明确的一等契约来表达：

- formal page；
- outside workspace；
- page stack / page grid / seamless page；
- block placement role；
- export intent；
- AI visibility；
- remove from page；
- hide visual line；
- page label mapping；
- header/footer/page number；
- layout edit mode 状态；
- editor runtime snapshot 是否只是 cache。

这些可以暂时写入 `metadata`，但不能长期没有统一契约。

## 2. R6 总原则

R6 建议坚持六条数据原则。

### 2.1 NoteBlock 是内容 truth

NoteBlock 保存用户或 AI 生成的内容：

- text；
- formula；
- image reference；
- code；
- table data；
- source quote；
- structured content_json；
- template metadata。

移动、resize、隐藏、排版、导出策略不应改写 NoteBlock 内容。

### 2.2 Placement / Projection 是呈现 truth

一个 block 在哪里显示、显示多宽、是否在正式页面内、是否导出、是否页面外 scratch，属于 placement/projection。

它不应该写进 `plain_text` 或核心 `content_json`。

### 2.3 Editor snapshot 只能是 cache / sidecar

无论未来使用 AFFiNE、BlockSuite、Lexical、Tiptap、ProseMirror，editor snapshot 都不能成为 Coincides 的唯一 truth。

如果删除或损坏 editor snapshot，系统应能从 Coincides records 重建最小可读页面。

### 2.4 Source / Relation / Template 不属于 editor runtime

Editor 可以显示 badge，但真正数据应在 Coincides 表里：

- source -> `note_block_sources` / SourceAnchor / SourceRegion；
- relation -> `object_relations`；
- visual edge -> `canvas_edges`；
- template -> `template_definitions` + NoteBlock metadata；
- domain/concept -> future classification tables。

### 2.5 Delete / Remove / Hide / Archive / Exclude 必须可区分

这些不是 UI 文案差异，而是数据状态差异：

```text
Move to trash: content truth lifecycle
Remove from page: placement/projection lifecycle
Hide line/layer: visual visibility
Archive: object lifecycle
Exclude from export: output policy
```

### 2.6 Graph-native 迁移不能污染 v2.x truth

v2.x 可以收集 graph-native evidence，但不应为了未来 Neo4j 迁移，把当前 SQLite 结构强行图数据库化。

R6 的任务是让未来迁移有清晰映射：

- NoteBlock -> future graph node candidate；
- ObjectRelation -> future graph edge candidate；
- Placement / CanvasNode -> projection/view evidence；
- SourceRegion -> evidence/source node candidate；
- TemplateDefinition -> capability node candidate。

## 3. Freeform BlockBox 应存在哪里

R6 评估三个方案。

## 3.1 方案 A：继续放在 `note_block_placements.display_overrides_json`

### 优点

- 已有表；
- 与 note/block 绑定；
- 适合线性 note；
- migration 成本低；
- 可以快速存 `x/y/width/height/export_role`。

### 缺点

- 当前表以 `order_index` 为主，不是二维 layout；
- `UNIQUE(note_id, block_id)` 限制同一 block 在同一 note 多 placement；
- 不天然表达 formal page / outside workspace / page stack；
- `display_overrides_json` 容易变成杂物袋；
- 与 canvas projection 的关系不清楚。

### 判断

可以作为过渡，但不适合作为 Better Notebook 的长期清晰契约。

## 3.2 方案 B：全部放在 `canvas_nodes`

### 优点

- 已有 `x/y/width/height/z_index`；
- 已有 move/resize；
- 已有 node type / target id；
- 已有 hidden/restore；
- 与 canvas-first 历史一致。

### 缺点

- `canvas_nodes` 是 general projection，不只是 page editor placement；
- 它可以指向 SourceScope、SourceBoardNode、EvidenceSet、Proposal，不只 NoteBlock；
- `status = active/archived` 不足以表达 remove/hide/export/private；
- 如果 formal page 也完全依赖 canvas_nodes，page editor 和 canvas editor 语义会混在一起；
- 未来 BlockSuite/AFFiNE bridge 时会难以区分 editor object 和 Coincides projection object。

### 判断

`canvas_nodes` 可以继续作为 canvas projection seed，但不宜成为 Better Notebook formal page layout 的唯一合同。

## 3.3 方案 C：新增独立 document surface / surface object 层

这是 R6 推荐的目标契约。

概念上可以叫：

```text
document_surfaces
document_surface_objects
```

或：

```text
notebook_surfaces
notebook_surface_objects
```

名称可后续决定，核心不是名字，而是职责。

### `document_surfaces`

表示一个 note 的可编辑/可导出表面：

```text
id
user_id
course_id
note_id
surface_kind: formal_page_stack | canvas_workspace | local_graph | export_preview
page_mode: single_page | page_stack | page_grid | seamless_stack | infinite
page_size
orientation
width
height
background_style
default_export_policy
metadata
status
timestamps
```

### `document_surface_objects`

表示某个对象在某个 surface 上的呈现：

```text
id
user_id
course_id
note_id
surface_id
object_type: note_block | canvas_shape | frame | page_decoration | source_region_preview | relation_preview
target_id
note_block_id
canvas_shape_id
source_region_id
relation_id
placement_role: formal | scratch | private_note | annotation | hidden
export_role: include | exclude | include_summary_only | project_only
ai_visibility: readable | readable_with_context | private_by_default | hidden
x
y
width
height
min_height
height_mode: auto | fixed
z_index
page_index
page_label
display_mode
render_hints
status: active | removed_from_surface | archived
metadata
timestamps
```

### 优点

- 把内容 truth 和页面呈现彻底分开；
- 可以承载 formal page / outside workspace / export intent；
- 可以映射到 CanvasNode，也可以映射到 BlockSuite/AFFiNE runtime；
- 可以支持同一 NoteBlock 在不同 view/surface 中不同位置；
- 可以从 Coincides records 重建页面；
- 可以明确区分 remove from page 和 trash content。

### 缺点

- 需要新增 schema；
- 需要迁移当前 canvas_nodes / note_block_placements；
- 需要更复杂的 adapter；
- 第一版工程成本更高。

### R6 判断

Better Notebook 目标契约应采用方案 C 或等价结构。

短期 spike 可以复用 `canvas_nodes`，但 roadmap 必须明确：`canvas_nodes` 是当前 seed，不等于最终 document surface contract。

## 4. `note_block_placements` 与 `canvas_nodes` 是否需要统一

R6 建议不要直接统一，而是分层。

```text
note_block_placements = legacy / linear note placement seed
canvas_nodes = canvas projection seed
document_surface_objects = future Better Notebook placement contract
```

如果后续决定不新增 `document_surface_objects`，也必须把等价字段清楚地纳入现有表，而不能继续让 `display_overrides_json` 和 `canvas_nodes.metadata` 各自随意增长。

## 5. Page editor layout 与 canvas layout 是否同一套 projection

R6 建议：

```text
同一套思想，不一定同一张表。
```

Page editor layout 更关心：

- formal page；
- page boundary；
- export；
- reading order；
- page label；
- text reflow；
- side note / scratch；
- PDF/HTML 输出。

Canvas layout 更关心：

- pan/zoom；
- infinite workspace；
- relation line；
- source board projection；
- local graph；
- spatial arrangement。

它们可以共享：

- x/y/width/height；
- z-index；
- target identity；
- style/render hints；
- status；
- object mapping。

但不能把语义混成一个：

```text
CanvasNode active != PageBlock include in export
CanvasEdge visible != ObjectRelation accepted
Page outside != deleted
```

## 6. 如果使用 BlockSuite / AFFiNE，snapshot 是什么

R6 建议：

```text
BlockSuite / AFFiNE snapshot = cache / sidecar / editor runtime state
Coincides records = canonical truth
```

需要一个 adapter mapping：

```text
editor_object_id
editor_surface_id
coincides_object_type
coincides_object_id
surface_object_id
sync_status
last_seen_snapshot_hash
metadata
```

作用：

- 让 editor runtime 负责富文本和交互；
- 让 Coincides 负责 source/template/relation/export/provenance；
- snapshot 丢失时可以重建；
- snapshot 与 Coincides records 冲突时可以检测 stale / orphan / duplicate。

## 7. Source / Relation / Template metadata 如何挂载

### 7.1 Template

模板属于 NoteBlock 内容契约。

建议：

```text
note_blocks.metadata.template_definition_id
note_blocks.metadata.template_key
note_blocks.metadata.template_version
note_blocks.metadata.system_type
note_blocks.metadata.learning_role
```

UI 只显示 badge/label，不显示 raw id。

### 7.2 Source

source provenance 不应塞进 editor block snapshot。

应继续使用：

- `note_block_sources`；
- SourceAnchor；
- SourceScope；
- future SourceRegion。

Surface object 可缓存：

```text
source_badge_count
primary_source_label
```

但完整 source truth 仍在 source 表和引用表。

### 7.3 Relation

语义 relation 在 `object_relations`。

视觉 relation 在 `canvas_edges` 或 future relation visual object。

Surface object 不应直接保存所有 relation，只需要支持：

```text
relation_badge_count
visible_relation_hint
```

完整关系进入 inspector / local graph。

### 7.4 Concept / Domain

Concept 还未在当前 Better Notebook 阶段落地，但 R6 建议预留：

```text
content classification belongs to object classification layer,
not to editor surface.
```

Surface 只显示标签或 badge。

## 8. 页面外 scratch block 是什么

R6 建议分三类。

### 8.1 有内容意义的 scratch

例如：

- 用户自己的推导；
- 学习疑问；
- 私人备注；
- AI 留下的解释；
- 对某个 theorem 的“我没懂”。

这应该仍然是 NoteBlock，只是 placement_role 是 `scratch` 或 `private_note`。

### 8.2 纯视觉对象

例如：

- 装饰贴纸；
- 手绘箭头；
- 临时图形；
- 背景图形。

这不应该是 NoteBlock，而应该是 CanvasShape / SurfaceShape。

### 8.3 页面装饰

例如：

- 页码；
- 页眉；
- 页脚；
- repeating header；
- page boundary；
- template background。

这不应该是普通 NoteBlock。它应该属于 PageDecoration / PageTemplate / surface metadata。

## 9. Header / Footer / Page Number

R3/R4 已经暴露一个重要问题：页眉页脚和页码如果都变成 NoteBlock，会造成大量无意义 block。

R6 建议：

```text
PageDecoration is not NoteBlock.
```

未来可有：

```text
page_templates
page_decorations
```

最小字段：

```text
surface_id
decoration_kind: header | footer | page_number | watermark | margin_note_area
position
repeat_rule
content_template
style
export_policy
metadata
```

这样 AI 问“某个知识点在哪一页”时，系统用 surface object 的 `page_index/page_label` 回答，而不是靠 OCR 页码 block。

## 10. Page Label Mapping

用户可见页码不一定等于物理页序。

例如：

```text
physical page 1: cover, no label
physical page 2-7: roman numeral i-vi
physical page 8: label 1
```

Better Notebook 至少需要：

```text
page_index
page_label
page_label_scheme
source_page_label
```

这些应该属于 surface/page metadata，而不是每个 NoteBlock 自己猜。

## 11. Export Intent 数据契约

R6 建议 export intent 至少有：

```text
export_role: include | exclude | include_summary_only | project_only
export_context: pdf | html | png | project_package | ai_context
export_reason
explicit_export_override: true | false
```

第一版可以简化为：

```text
export_role: include | exclude
placement_role: formal | scratch | private_note
```

但不要只靠位置。

## 12. AI Visibility 数据契约

AI 可读性和导出不是一回事。

例如：

- 页面外私人疑问：不导出，但 AI 可以读来回答问题；
- 私人日记：不导出，也默认不让 AI 读；
- source quote：导出且 AI 可读；
- debug id：不导出，但 agent/debug 可读。

建议：

```text
ai_visibility:
  readable
  readable_with_context
  private_by_default
  hidden
```

还可加：

```text
ai_context_role:
  formal_content
  scratch_reasoning
  user_question
  private_note
  source_evidence
  layout_hint
```

第一版可以先在 surface object metadata 中表达。

## 13. Remove / Hide / Archive / Trash 数据契约

R6 建议：

### 13.1 NoteBlock status

```text
active
trashed
archived
```

或继续使用现有 `status` + `trashed_at`。

### 13.2 Surface object status

```text
active
removed_from_surface
hidden_on_surface
archived
```

`removed_from_surface` 表示当前页面不显示，但内容 truth 仍存在。

### 13.3 Visual relation status

```text
visible
hidden
archived
stale
broken
```

当前 `canvas_edges.connection_state` 已经是很好的 seed。

### 13.4 Export status

不要复用 `status`，应独立用 `export_role`。

## 14. Undo / Redo / Operation History

Better Notebook 需要两层历史。

### 14.1 Editor session undo stack

用于快速撤销：

- typing；
- local formatting；
- drag；
- resize；
- transient layout。

这可以在 editor runtime 内存或 sidecar snapshot 中。

### 14.2 Durable operation batch

用于可恢复、可审计操作：

- create NoteBlock；
- move to trash；
- source attach/detach；
- relation bind/unbind；
- export intent change；
- template migration；
- domain refinement；
- package import。

当前 operation batch 已经是基础，应继续保留。

## 15. Editor Runtime Bridge 契约

如果后续使用外部 editor runtime，应遵守：

```text
Editor owns transient editing mechanics.
Coincides owns semantic identity and durable truth.
```

### 15.1 Editor 可拥有

- caret；
- selection；
- inline text editing；
- composition input；
- local undo stack；
- internal render tree；
- clipboard details；
- decorations；
- performance cache。

### 15.2 Coincides 必须拥有

- NoteBlock id；
- NoteBlock content canonical form；
- TemplateDefinition identity；
- SourceReference；
- SourceAnchor / SourceRegion；
- ObjectRelation；
- export intent；
- AI visibility；
- operation batch；
- package/export provenance。

## 16. 推荐的目标数据模型

R6 推荐未来 Better Notebook 至少有以下层。

```text
Note
  -> NoteBlock
  -> NoteBlockSource
  -> ObjectRelation
  -> TemplateDefinition

DocumentSurface
  -> DocumentSurfaceObject
  -> PageDecoration
  -> EditorSnapshotCache

Canvas / LocalGraph / ExportPreview
  -> derived or specialized surfaces
```

更直观地看：

```text
NoteBlock: what it is
SurfaceObject: where/how it appears
SourceReference: why it is trustworthy
ObjectRelation: how it relates
TemplateDefinition: what role/behavior it follows
ExportIntent: where it goes
AIVisibility: who can read it
EditorSnapshot: how current editor renders it fast
```

## 17. 最小第一版合同

为了避免一步过大，R6 建议第一版 Better Notebook 至少落实这些字段或等价 metadata。

### 17.1 Surface

```text
surface_kind
page_mode
page_size
orientation
width
height
default_export_policy
```

### 17.2 Surface object / placement

```text
object_type
target_id
placement_role
export_role
ai_visibility
x
y
width
height
height_mode
z_index
page_index
page_label
status
render_hints
```

### 17.3 NoteBlock

```text
template_definition_id
template_key
template_version
system_type
learning_role
source_kind
content_json
plain_text
status
```

### 17.4 Relation

```text
CanvasEdge = visual
ObjectRelation = semantic
RelationLayer = view/filter/purpose
```

## 18. 对当前 v2.x 的迁移思路

未来实施时可以按以下方向迁移。

### 18.1 旧 notes

`notes` + `note_block_placements` 可以生成一个默认 `formal_page_stack` surface。

`order_index` 转成 y-order。

### 18.2 旧 canvas

`learning_canvases` 可以生成 `canvas_workspace` surface。

`canvas_nodes` 可以转成 `document_surface_objects`，保留原 canvas id 作为 provenance。

### 18.3 Canvas-created NoteBlocks

已经有 backing note 的 canvas block 可以映射到 note + surface object。

### 18.4 SourceBoard nodes

SourceBoardNode projection 仍可作为 surface object，但不等于 NoteBlock truth。

## 19. Graph-Native Migration Evidence

R6 给 v3.x 的证据：

- `NoteBlock` 适合作为 graph node；
- `ObjectRelation` 适合作为 graph edge；
- `TemplateDefinition` 是 capability node candidate；
- `SourceRegion` / SourceAnchor 是 evidence/source node candidate；
- `DocumentSurfaceObject` 是 projection/view object，不应默认迁移为 knowledge node；
- `CanvasEdge` 是 visual/interaction object，不应默认迁移为 semantic edge；
- `export_role` / `ai_visibility` 更像 view/context policy，不是知识 truth；
- `PageDecoration` 不是知识节点；
- Editor snapshot 不是 graph truth。

## 20. Roadmap Impact

R6 建议新 roadmap 加入：

```text
Phase A6 - Better Notebook Data Contract
```

并把它放在大规模 UI 实作前。

### Phase A6 最小验收

- NoteBlock 内容 truth 和 surface placement 分开；
- placement 能表达 formal/scratch/private；
- placement 能表达 export intent；
- placement 能表达 AI visibility；
- canvas_nodes 不再被误认为唯一 page layout truth；
- external editor snapshot 被定义为 cache/sidecar；
- Hide/Remove/Archive/Trash 状态分层；
- source/relation/template 不污染 editor runtime；
- 页面可在 editor snapshot 缺失时重建。

## 21. R6 解决的问题

R6 回答了 Outline 提出的问题：

### Freeform block-box 应存在哪里？

目标契约应放在独立 surface object / placement 层。短期可以用 canvas_nodes 或 display_overrides_json 过渡，但不应作为长期混杂容器。

### `note_block_placements` 与 `canvas_nodes` 是否需要统一或分层？

应分层。它们是旧线性 placement 和 canvas projection seed，不应简单合并。

### page editor layout 与 canvas layout 是否同一套 projection？

可共享 layout 概念，不应完全混成同一语义。Page editor 更关心 formal/export/reading order，canvas 更关心 spatial projection。

### 如果使用 BlockSuite，snapshot 是 cache、sidecar，还是 source of truth？

必须是 cache/sidecar，不是 source of truth。

### 断开 external editor runtime 后，能否重建页面？

必须能重建最小可读页面。重建质量可以低于原始编辑器状态，但内容、source、relation、export intent 不能丢。

### source / relation / template metadata 如何挂在 NoteBlock 上而不污染编辑器？

通过 Coincides 独立表和 metadata。Editor 只显示 badge/inspector，不拥有 source/relation/template truth。

### 页面外 scratch block 是否是 NoteBlock、CanvasShape，还是 ScratchBlock？

有内容意义的是 NoteBlock + scratch/private placement。纯视觉对象是 CanvasShape/SurfaceShape。页眉页脚页码是 PageDecoration/PageTemplate。

## 22. 暴露风险

### 22.1 新表过多风险

如果立刻新增 document surface 全套表，工程量会上升。应先把合同写清楚，再决定 first spike 是否用 metadata 过渡。

### 22.2 继续复用 canvas_nodes 的风险

短期简单，但长期会让 page editor / canvas editor / source board projection / local graph projection 混在一起。

### 22.3 Editor snapshot 接管 truth 风险

如果未来接入 AFFiNE/BlockSuite 时偷懒，让 snapshot 成为事实来源，Coincides 最核心的 source-grounded / relation-aware / proposal-first 能力会被侵蚀。

### 22.4 Export intent 后补风险

如果一开始不保存 export intent，后续 PDF/project package/AI context 会反复返工。

## 23. 对 R7 的要求

R7 重新评估技术路线时，必须检查每条路线能否支持 R6 的合同：

- 能否把 editor snapshot 降级为 cache；
- 能否保存 Coincides object identity；
- 能否支持 surface object；
- 能否支持 formal/scratch/export/AI visibility；
- 能否在 snapshot 缺失时重建；
- 能否不把 visual connector 当 semantic relation；
- 能否不污染 NoteBlock source/template/relation truth。

如果某个 editor runtime 做不到这些，就算交互成熟，也不能作为主权数据层。

## 24. R6 结论

Better Notebook 的目标数据契约应该是：

```text
NoteBlock = 内容 truth
SurfaceObject / BlockBox = 呈现和排版
DocumentSurface = page/canvas/export/workspace 上下文
SourceReference / SourceRegion = 来源证据
CanvasEdge = 视觉关系
ObjectRelation = 语义关系
TemplateDefinition = 内容能力契约
EditorSnapshot = cache / sidecar
OperationBatch = 审阅与恢复
```

R6 不建议马上写完整 migration，但强烈建议在新版 roadmap 中把这一层作为正式工程阶段。否则 R3-R5 的所有 UX 判断都会只能写进零散 metadata，最终重新变成一团难以维护的工程泥潭。
