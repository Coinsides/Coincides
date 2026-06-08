# R3 - Coincides 核心对象模型

## 本阶段问题

R3 要回答的是：Coincides 里哪些对象必须由 Coincides 自己掌控，哪些对象只是投影、容器、证据、能力、操作记录或迁移经验。

R1 已经确认当前 v2.x 有大量地基；R2 已经把产品路线拆成四层：

```text
人能用的笔记软件
  -> AI 能读的结构化笔记库
  -> 内置 AI proposal-first 整理/生成笔记
  -> 外部 Agent/API 调度 Coincides
```

R3 的任务是把对象模型放进这四层里，避免后续调研 AFFiNE / BlockSuite 或 GraphDB 时混淆“用户看到的东西”和“系统真实保存的东西”。

## 证据来源与证据等级

- A 级代码证据：
  - `server/src/db/schema.sql`
  - `server/src/services/learningCanvases.ts`
  - `server/src/services/templateDefinitions.ts`
  - `server/src/services/sourceAnchors.ts`
  - `server/src/services/sourceScopes.ts`
  - `server/src/services/domainRefinementProposals.ts`
- A 级测试证据：
  - `server/src/__tests__/v2MaterialLibrary.test.ts`
  - `server/src/__tests__/v2TemplateMigration.test.ts`
  - `server/src/__tests__/v2PackagePortability.test.ts`
  - `server/src/__tests__/v2DomainPackages.test.ts`
  - `server/src/__tests__/v2DomainRefinement.test.ts`
- B 级文档证据：
  - v2.4 review 中反复强调 Canvas 是 projection。
  - v2.5 review 中反复记录 graph-native migration evidence。

## 总体结论

Coincides 当前对象模型应分成七层：

1. **Container / Navigation Layer**
   Project/Course、Note、Folder/Favorite 等导航容器。

2. **Content Truth Layer**
   NoteBlock 是最核心的内容对象。

3. **Source / Evidence Layer**
   SourceSnapshot、SourceAnchor、SourceScope、EvidenceSet 等是 source trust 和 provenance 对象。

4. **Projection / View Layer**
   Canvas、CanvasNode、CanvasFrame、CanvasEdge 多数属于视图或交互投影。

5. **Semantic Relation Layer**
   ObjectRelation 是系统可读的语义边候选。

6. **Capability / Runtime Layer**
   TemplateDefinition、CompositionTemplate、DomainBlockSet、PackageManifest 是能力对象，不是普通内容。

7. **Operation / Provenance Layer**
   Proposal、OperationBatch、MigrationRecord、ImportExportRecord 是操作历史和恢复证据，不是知识内容本身。

R3 最关键的判断是：

> NoteBlock 是内容 truth；CanvasNode 是它在画布上的投影；CanvasEdge 是画布交互对象；ObjectRelation 才是语义关系候选；Template/Domain/Package 是能力层；Proposal/Record 是操作层。

## 1. Project / Course / Note

### 当前状态

当前代码中仍使用 `courses` 作为顶层容器；`notes` 表记录 `course_id`、title、description、status、source_kind、page_format、metadata、operation_batch_id。

用户已经多次指出：`course` 这个名字太窄。未来它应更接近 `project`：

- 一个 project 可以是课程；
- 也可以是调研；
- 也可以是案件推理；
- 也可以是游戏资料；
- 也可以是情报整理。

### R3 判断

`Course` 当前是容器和权限/范围单位，不应被理解为学习领域本身。

未来产品层应改名或映射为 `Project`。但数据库迁移不一定要立刻重命名，可以先保留 `course_id` 作为 legacy/internal scope id。

### Graph-native 候选

- Project/Course 是 future graph node candidate。
- Note 是 future graph node candidate，但它主要是内容集合和视图入口。
- Folder/Favorite 是 navigation layer，不一定是知识图节点。

### Ownership

必须由 Coincides 自己掌控。即使采用 AFFiNE / BlockSuite，Project/Note 的 Coincides identity 也不能丢。

## 2. NoteBlock

### 当前状态

`note_blocks` 保存：

- `block_type`
- `title`
- `content_json`
- `plain_text`
- `source_kind`
- `metadata`
- `operation_batch_id`

`note_block_placements` 把 block 放进 note，并保存：

- `parent_placement_id`
- `order_index`
- `display_mode`
- `display_overrides_json`

`note_block_sources` 连接 NoteBlock 和 document/chunk/page/excerpt。

### R3 判断

NoteBlock 是 Coincides 最核心的内容 truth。

但 NoteBlock 不应该等同于用户看到的卡片或 box。用户看到的是 NoteBlock 的一种 presentation：

- 在 page editor 中，它可能像一段普通文字。
- 在 layout edit mode 中，它可能像可 resize 的文本框。
- 在 canvas 中，它可能是一个 node。
- 在 local knowledge graph 中，它可能是一个节点。
- 在 AI retrieval 中，它可能是一个 semantic unit。

### Graph-native 候选

NoteBlock 是最重要的 future graph node candidate。

未来可能存在：

```text
(:NoteBlock)-[:USES_TEMPLATE]->(:TemplateDefinition)
(:NoteBlock)-[:IN_NOTE]->(:Note)
(:NoteBlock)-[:GROUNDED_IN]->(:SourceAnchor or SourceScope)
(:NoteBlock)-[:CLASSIFIED_AS]->(:Concept or DomainBlockSet)
(:NoteBlock)-[:RELATES_TO]->(:NoteBlock)
```

### Ownership

必须由 Coincides 自己掌控。

如果采用 AFFiNE / BlockSuite，它们最多承载 editor block 或 visual block runtime；Coincides 仍需要保存 NoteBlock identity、source provenance、template/domain metadata、operation history。

## 3. SourceSnapshot / SourceAnchor / SourceScope / EvidenceSet

### 当前状态

Source layer 当前有：

- `source_snapshots`
- `source_snapshot_pages`
- `source_anchors`
- `source_anchor_links`
- `source_scopes`
- `source_boards`
- `source_board_nodes`
- `source_fragments`
- `material_segments`
- `evidence_sets`
- `evidence_items`

其中：

- SourceAnchor 是稳定 jump-back 指针。
- SourceScope 是用户选择的 source range。
- EvidenceSet / EvidenceItem 是 reconciliation 和 evidence grouping。
- SourceBoard 是 source ranges 的组织工作台。

### R3 判断

Source 对象不是普通内容 block，也不是单纯 metadata。它们是 source trust / provenance 层。

SourceAnchor / SourceScope 的主要职责是：

- 证明某个 NoteBlock 或 proposal 与 source 的关系；
- 支持 jump-back；
- 支持 source-grounded generation；
- 支持未来 source reconstruction 和 evidence trust。

EvidenceSet 是证据集合，不是知识内容本身。它可以进入 graph，但更像 provenance/evidence node。

### Graph-native 候选

- SourceMaterial / Document 是 source node candidate。
- SourceAnchor / SourceScope 可以是 source reference node 或 edge-like provenance object。
- EvidenceSet 可以是 evidence/provenance node。
- EvidenceItem 更像 provenance item，未必需要成为独立 graph node。

未来可表达为：

```text
(:NoteBlock)-[:GROUNDED_IN]->(:SourceScope)
(:SourceScope)-[:POINTS_TO]->(:SourceSnapshotPage)
(:EvidenceSet)-[:CONTAINS]->(:EvidenceItem)
(:EvidenceItem)-[:POINTS_TO]->(:SourceFragment)
```

### Ownership

必须由 Coincides 自己掌控。AFFiNE / BlockSuite 不应成为 source truth store。

## 4. Canvas / CanvasNode / CanvasFrame / CanvasEdge

### 当前状态

`learning_canvases` 保存 canvas document projection：

- finite / infinite
- page size
- width / height
- background style

`canvas_nodes` 保存：

- `node_type`
- `target_id`
- 可选 `note_block_id`、`source_scope_id`、`source_anchor_id`、`source_board_node_id`、`source_material_id`、`material_segment_id`、`evidence_set_id`、`proposal_id`
- `x/y/width/height/z_index`

`CanvasNodeType` 当前支持：

```text
note_block
source_scope
source_anchor
source_board_node
source_material
material_segment
evidence_set
proposal
```

`canvas_edges` 保存视觉连接：

- source/target node
- port
- loose target
- object_relation_id
- relation_layer_id
- connection_state

### R3 判断

Canvas 是 document/view surface。CanvasNode 是 projection object，不是内容 truth。

CanvasFrame 是 layout grouping 或 section background，也属于 projection layer。

CanvasEdge 默认是 visual/interaction object。它可以成为 ObjectRelation 的触发入口，但自己不等于 semantic relation。

### Graph-native 候选

- Canvas 可以是 view/preset/projection node。
- CanvasNode 通常不应迁移成知识节点；它是某个 target object 的 placement/projection。
- CanvasFrame 可以是 view grouping node 或 projection object。
- CanvasEdge 只有在绑定 ObjectRelation 后，才与 graph edge 有关系；否则只是 visual annotation。

### Ownership

Canvas projection 可以由 editor engine 帮助管理，但 Coincides 必须保留 canonical mapping：

```text
canvas_node_id -> target_type + target_id
```

如果采用 AFFiNE / BlockSuite，它们的 shape/block id 不能成为 Coincides truth id。

## 5. ObjectRelation / RelationLayer

### 当前状态

`object_relations` 保存：

- source_type / source_id
- target_type / target_id
- relation_type
- status
- visibility
- confidence
- source_canvas_edge_id
- relation_layer_id
- created_by

`relation_layers` 保存 canvas/course 下的 layer kind、visibility 和顺序。

`bindCanvasEdgeRelation` 当前通过 CanvasEdge 找到 source/target CanvasNode，再解析成真实 endpoint：

```text
node.node_type + node.target_id
```

只有完整 CanvasEdge 才能 bind semantic relation。

### R3 判断

ObjectRelation 是 semantic relation truth candidate。它是未来 graph edge 的最直接候选。

RelationLayer 不是知识边本身，而是关系的显示、用途、筛选、组织层。

当前 relation model 仍比较浅：

- relation_type 是固定小集合；
- 尚未表达 condition_kind；
- 尚未表达 group/all_of/any_of/sequence/threshold；
- 尚未表达 domain-specific relation type hierarchy；
- 尚未表达 relation confidence/provenance 的复杂结构；
- 尚未建立局部知识图谱视图。

### Graph-native 候选

ObjectRelation 是 future graph edge candidate。

RelationLayer 可以是 graph view / relation set / retrieval lens，不一定是知识节点。

未来需要把 relation 拆成：

```text
relation_existence
condition_kind
composition_kind
directionality
semantic_family / domain_relation_type
provenance
visibility / layer
```

### Ownership

必须由 Coincides 自己掌控。Editor 只能创建视觉边或触发 relation proposal，不能单独定义 semantic truth。

## 6. TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest

### 当前状态

`template_definitions` 保存：

- template_key / version
- origin / scope
- system_type / learning_role
- field_schema / default_content / render_hints
- source_behavior / relation_behavior / proposal_behavior
- summary_for_agent
- status / is_system

`composition_templates` 保存 section-level runtime contract。

`domain_block_sets` 保存领域包：

- domain_key / version
- domain_kind
- aliases / facets
- source/relation/proposal behavior
- summary_for_agent

`package_manifests` 保存 bundle/package contract：

- package_key / version
- compatibility / contents / trust / license
- import/export policy
- graph_migration_hints

### R3 判断

这些对象不是普通笔记内容，而是 capability/runtime objects。

它们决定：

- 什么样的 NoteBlock 可以被创建；
- 组合模板怎样生成 section；
- 某个 domain 下应优先使用哪些 template/composition；
- package 如何导入导出和恢复；
- AI 应如何选择或避免模板。

### Graph-native 候选

- TemplateDefinition 是 future graph node candidate。
- CompositionTemplate 是 future graph node candidate。
- DomainBlockSet 是 future graph node candidate。
- PackageManifest 是 future graph node candidate 或 portability boundary node。

未来可表达为：

```text
(:NoteBlock)-[:USES_TEMPLATE]->(:TemplateDefinition)
(:CompositionTemplate)-[:USES_TEMPLATE]->(:TemplateDefinition)
(:DomainBlockSet)-[:INCLUDES_TEMPLATE]->(:TemplateDefinition)
(:DomainBlockSet)-[:INCLUDES_COMPOSITION]->(:CompositionTemplate)
(:PackageManifest)-[:CONTAINS]->(:DomainBlockSet)
```

### Ownership

必须由 Coincides 自己掌控。它们是 Coincides developer-tool / AI-readable substrate 的核心。

## 7. Proposal / OperationBatch / MigrationRecord / ImportExportRecord

### 当前状态

`proposals` 保存 proposal type/status/data/resolved_at。

`operation_batches` 保存：

- user/course
- source_type/source_id
- label
- status
- applied/reverted time

template/domain/package 还有对应 records：

- `template_migration_mappings`
- `template_migration_records`
- `template_migration_record_items`
- `package_exports`
- `package_import_previews`
- `package_import_records`
- `package_import_record_items`
- `domain_refinement_mappings`
- `domain_refinement_records`
- `domain_refinement_record_items`
- `domain_object_classifications`

### R3 判断

Proposal 和 records 是 operation/provenance layer。

它们不是普通知识内容，但非常重要，因为它们记录：

- AI 或用户想做什么；
- 为什么做；
- 影响范围；
- apply 了什么；
- 哪些对象被 mutation；
- 如何恢复；
- 哪些 warning/blocker 被发现。

### Graph-native 候选

- Proposal 可以是 operation history node。
- OperationBatch 可以是 operation batch node。
- MigrationRecord / ImportExportRecord 多数是 provenance node。
- RecordItem 通常是 recovery evidence，不一定进入核心知识图。
- DomainObjectClassification 比普通 record 更接近 graph edge，因为它表达对象和 domain 的当前分类关系。

### Ownership

必须由 Coincides 自己掌控，特别是外部 Agent 不能绕过它们。

## 8. Canonical Ownership Matrix

| 对象 | 当前层级 | 是否 Coincides 必须掌控 | Graph-native 候选 | AFFiNE / BlockSuite 可承担什么 |
| --- | --- | --- | --- | --- |
| Project/Course | Container / scope | 是 | Node candidate | 可显示导航，不应拥有 canonical identity |
| Note | Container / document | 是 | Node candidate | 可承载编辑 shell，但 identity 要映射回 Coincides |
| NoteBlock | Content truth | 是 | 强 node candidate | 可承载 editor block UI，但不能替代 Coincides NoteBlock truth |
| NoteBlockPlacement | Layout/order within note | 是 | Edge/property candidate | 可作为 editor placement 映射来源 |
| NoteBlockSource | Source provenance | 是 | Edge/provenance candidate | 不应由 editor engine 单独掌控 |
| Document/SourceMaterial | Source truth | 是 | Source node candidate | 可显示，不应成为 editor-only data |
| SourceSnapshot | Source inspection view | 是 | Source view/provenance node | 可显示，不应替代 SourceRegion |
| SourceAnchor | Stable source pointer | 是 | Provenance node or edge-like object | 不应丢 |
| SourceScope | User-selected source range | 是 | Provenance node or selected range node | 不应丢 |
| EvidenceSet | Evidence grouping | 是 | Evidence node candidate | 可显示，不应替代 |
| Canvas | Projection/view | 是，但可 adapter 化 | View node candidate | 可由 editor/canvas engine 承载 surface |
| CanvasNode | Projection placement | 是 | Usually view object | 可映射到 engine shape/block |
| CanvasFrame | Projection grouping | 是 | View grouping object | 可映射到 frame/shape |
| CanvasEdge | Visual interaction edge | 是，但不是 knowledge truth | Usually projection object | 可映射到 visual connector |
| ObjectRelation | Semantic relation truth | 是 | 强 edge candidate | editor 只能触发/显示，不能私有化 |
| RelationLayer | Relation lens/display layer | 是 | View/lens candidate | 可作为显示层 |
| TemplateDefinition | Capability/runtime | 是 | Capability node candidate | editor 可用它渲染/创建 block |
| CompositionTemplate | Capability/runtime | 是 | Capability node candidate | editor 可用它插入 section |
| DomainBlockSet | Capability/classification | 是 | Domain node candidate | editor 可显示/筛选 |
| PackageManifest | Portability/capability | 是 | Package node candidate | editor 可显示包信息 |
| Proposal | Operation/provenance | 是 | Operation node candidate | editor 可显示 preview |
| OperationBatch | Operation/provenance | 是 | Operation node candidate | editor 不应绕过 |
| MigrationRecord | Recovery/provenance | 是 | Provenance node candidate | editor 不应绕过 |
| ImportExportRecord | Portability/provenance | 是 | Provenance node candidate | editor 不应绕过 |

## 9. R3 解决的问题

R3 解决了几个关键混淆：

1. **CanvasNode 不是 NoteBlock。**
   CanvasNode 是 NoteBlock 或其他对象的 projection。

2. **CanvasEdge 不是 ObjectRelation。**
   CanvasEdge 是视觉连接；ObjectRelation 才是系统可读语义关系。

3. **SourceScope / SourceAnchor 不是普通 metadata。**
   它们是 source trust 和 jump-back 的核心对象。

4. **TemplateDefinition / DomainBlockSet 不是内容。**
   它们是能力层和 AI 选择层。

5. **Proposal / OperationBatch 不是知识本体。**
   它们是操作、安全、恢复和 provenance。

6. **AFFiNE / BlockSuite 如果被采用，不能成为所有 truth store。**
   它们最多承担编辑器/画布/展示层，除非后续调研证明可以安全映射 Coincides 全部 canonical identity。

## 10. 暴露的风险

1. **对象层混淆风险**
   如果把 CanvasNode 当成 NoteBlock，把 CanvasEdge 当成 Relation，会导致 graph migration 出错。

2. **editor ownership 风险**
   如果 AFFiNE / BlockSuite 的 block id 直接替代 NoteBlock id，source/proposal/template/domain history 会断。

3. **graph 过早建模风险**
   当前 NoteBlock 和 ObjectRelation 很适合成为 graph node/edge candidate，但 Concept、Relation taxonomy、SourceRegion 仍未成熟。

4. **容器命名风险**
   `Course` 作为内部 scope 可继续存在，但产品心智应向 `Project` 迁移，否则会限制情报、研究、游戏、案件等非课程场景。

## 11. 对后续阶段的影响

- R4 必须基于“NoteBlock 是内容 truth，presentation 可变化”来设计人工输入体验。
- R5 必须基于“block-box 是 placement/presentation，不是新的内容 truth”来设计 freeform block-box。
- R6 必须基于“Canvas 是 projection/view”来设计 page/canvas/export。
- R7-R8 必须检查 AFFiNE / BlockSuite 是否能保留 Coincides canonical identity mapping。
- R9-R11 必须比较不同 adoption route 对 ownership matrix 的影响。
- R12 必须基于 NoteBlock/ObjectRelation/SourceScope/Template/Domain 的 ownership 设计 AI-readable retrieval。
- R13 必须把 ownership preservation 加入路线评分。
- R14 必须把 ownership matrix 写进 roadmap rewrite 的架构约束。

## 12. 反补前序报告

R3 不需要改写 R0 或 R2。

R3 对 R1 的补充是：R1 的能力分类应在 R13/R14 汇总时加入 ownership matrix，特别强调：

- CanvasNode 不是 truth。
- CanvasEdge 不是 semantic edge。
- ObjectRelation 是 graph edge candidate。
- Template/Domain/Package 是 capability nodes。
- Proposal/OperationBatch 是 operation/provenance nodes。

暂不直接修改 R1 正文，避免在阶段中途反复重写；后续由 R13/R14 统一汇总。

## R3 结论

Coincides 的核心对象模型应坚持：

```text
Content truth: NoteBlock
Source truth/provenance: Source / Anchor / Scope / Evidence
Projection: Canvas / CanvasNode / CanvasFrame / CanvasEdge
Semantic edge: ObjectRelation
Capability runtime: Template / Composition / Domain / Package
Operation provenance: Proposal / OperationBatch / Records
```

这个对象模型是后续是否采用 AFFiNE / BlockSuite、是否进入 GraphDB、是否开放外部 Agent API 的共同前提。
