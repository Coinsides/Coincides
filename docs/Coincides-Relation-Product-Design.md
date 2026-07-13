> **状态 (Status)**: superseded-in-part（2026-07-13）
> **层 (Layer)**: 研究 / Research（曾为 Active Product Reference）
> **被取代 (Superseded by)**: `docs/agent-ops/analysis/relation-item-graph-concept-design.md`（v1.1,V2.BN.11 模型权威）+ `docs/releases/V2.BN.11-plan.md`
> **作废范围**: ①下方"2026-06-22 ContentGroup Endpoint Doctrine"（端点=ContentGroup/Petal → 已更替为**端点=Item/卡**）;②§1.3 端点候选口径;③§2.1 起基于 `object_relations / canvas_edges / relation_layers` 旧三表的全部 schema 设计（三表数据实证全死,migration 047 落表）。
> **保留价值**: 线/边/关系的产品哲学、RelationType 思想、交互与 GraphRAG sidecar 边界思考,作为研究遗产保留;引用时须以 V11 概念设计为准核对。

# Coincides Relation Product Design

## 2026-06-22 ContentGroup Endpoint Doctrine

Relation is no longer planned around block-first endpoints.

The current endpoint direction is:

```text
ContentGroup
  preferred coarse endpoint candidate

Petal
  preferred local/fine endpoint candidate under a parent ContentGroup

ContentRange
  evidence and trace anchor

GroupFolder
  relation-view scope / browsing boundary, not relation truth
```

A relation should be a recorded judgment or reasoning artifact between meaningful packages or local parts, not a permanent visible line on the ordinary writing surface. The normal note should remain readable; relation views can project the graph when the user asks for it.

The 8.6.30 copy-insert boundary matters for relation work: destructive text movement and true reorder must wait until range rebase can update labels, ContentGroup members, Petal fragments, and future endpoints safely.

**Created**: 2026-06-06
**Status**: Living Draft
**Scope**: Relation product model, interaction model, relation type design, relation group design, and future GraphRAG bridge
**Role**: 专门记录 Coincides 中「线 / 边 / 关系」应该如何被用户理解、编辑、显示、查询和迁移

---

## 0. 文档维护规则

这是一份 relation 领域的主文档。以后任何会改变 relation 数据架构、交互模型、GraphRAG 映射、relation type、relation group、connection point、CanvasConnector、CanvasEdge、ObjectRelation 或 RelationLayer 的设计，都必须同步更新这篇文档。

尤其要同步更新：

- schema / migration 的字段变化；
- relation API 行为变化；
- relation type / relation group seed 变化；
- visual connector 与 semantic relation 的绑定规则；
- GraphRAG / graph-native bridge 的映射规则；
- 当前实现与目标模型之间的差异；
- 例子，包括 `A derives_to B`、`A + B derives_to C`、用户目标关系、source evidence 关系等。

这篇文档里的例子不是随手记录。它们是后续产品、数据结构、UI、AI context 和 v3.x graph-native 迁移的参考样例。例子必须尽量贴合真实实现，不能长期停留在抽象想象。

### 0.1 当前参考来源

这篇文档目前吸收了以下来源：

- `docs/brainstorm/产品完善/product-improvement-issue-register.md`
  - PI-027: Canvas edge visual routing and styling
  - PI-029: Relation semantics need a layered model
  - PI-030: AI needs a queryable subgraph view
  - PI-031: Local knowledge graph views should be deterministic
  - PI-049: Microsoft GraphRAG adoption spike and graph/RAG sidecar boundary
- `docs/brainstorm/产品完善/PI-046 Research/R12-graph-model-before-graph-database.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-3-relationship-pack-and-objectrelation-boundary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`
- 当前实现：
  - `server/src/db/migrations/024_v2_canvas_relations.ts`
  - `server/src/db/schema.sql`
  - `server/src/services/learningCanvases.ts`
  - `server/src/routes/canvasEdges.ts`
  - `server/src/routes/relationLayers.ts`
  - `server/src/routes/objectRelations.ts`

---

## 1. 为什么需要单独文档

Relation 是 Coincides 的核心能力之一，但它不能只被当作画布上的一根线。

在 Coincides 里，relation 同时影响：

- 用户如何理解两个 NoteBlock 之间的关系；
- AI 如何读取一篇笔记或报告；
- 局部知识图谱如何生成；
- source evidence 如何被追踪；
- 后续 GraphRAG / graph-native 数据结构如何承接；
- 用户如何自定义学习、研究、推理、情报等不同场景下的关系类型。

之前很多想法散落在聊天和 UX inventory 中，容易丢失。这个文档用于集中讨论 relation 的 product 形态。

---

## 1.1 Source Provenance 边界

Source provenance 是 evidence chain，`ObjectRelation` 是 semantic relation。两者可以互相提供上下文，但不能混成一个概念。

```text
SourceChain:
  说明一个 block/note/report 的内容从哪里来。
  可以包含 external SourceVersion、internal Note、internal Report、internal NoteBlock。
  默认回答的是“这段内容的依据链条是什么？”

ObjectRelation:
  说明两个或多个对象在语义、学习、推理、证据、用户目标中的关系。
  默认回答的是“这些对象之间是什么关系？”
```

`source_supports` 可以把 source evidence 映射成语义关系，但 source chain 本身不等于 relation。Internal source chain 断裂可能让相关 relation 进入 `stale`、`broken` 或 `recovered`，但 relation lifecycle 仍由 relation system 管理。

GraphRAG adapter 读取 source provenance 时，应把它当作 provenance input，不当作用户确认的 semantic relation。

---

## 1.2 Link / Navigation 边界

`Link` 是 navigation，不是 `ObjectRelation`。

```text
Link:
  跳到另一个 note、block、page、source view 或 local graph view。

ObjectRelation:
  表达 read_before、derives_to、example_of、supports、contradicts 等语义关系。
```

正文 link 可以和 ObjectRelation 共存，但不能自动创建 semantic relation。用户写“见 Green Theorem 证明笔记”并加一个 link，只说明可以跳转过去；如果它还代表前置阅读、推导关系或证据支持，需要单独创建或确认 ObjectRelation / SourceReference。

---

## 1.3 TextFlow / Addressable Content Endpoint 边界

早期 relation 设计默认把 `NoteBlock` 当作主要 endpoint。TextFlow 模型进入 V2.BN.8.3 后，这个假设需要升级。

长期方向：

```text
Relation endpoint = AddressableContentEndpoint
```

候选对象包括：

```text
Note
PageFrame
NoteBlock
TextUnit
InlineStructuredObject
AnchoredSpan
ContentRange
ContentGroup
Petal
ContentGroup identity/status
SourceArtifact / SourceSnapshotObject
CanvasObject / Region future
```

2026-06-18 之后的模型同步：

```text
TextFlow
  content root

ContentRange
  location root

AnnotationTruth
  visible durable label / marker, not the only semantic endpoint

ContentGroup
  serious package of member references; preferred future endpoint candidate

Petal
  local part inside a ContentGroup; may support fine-grained relation explanation, but normally belongs under its parent ContentGroup

Accepted ContentGroup identity
  accepted / reviewed state of a ContentGroup; not a separate object or table

2026-06-18 correction:
  The separate accepted-content object concept is retired in the active Better Notebook model.
  A reviewed object remains a ContentGroup; acceptance is represented by the ContentGroup's own identity/status.
  GroupFolder / ContentGroup Gallery should be treated as organization and derived browsing/query views over ContentGroups, not relation truth tables.

CompositeEndpoint
  relation-side grouped premise / conclusion when multiple objects act together
```

因此，后续 relation endpoint 的优先方向应从 `AnnotationTruth / AnnotationSet` 调整为 `ContentGroup / accepted ContentGroup identity / CompositeEndpoint`。`GroupFolder` 可以提供 relation view boundary / graph scope，但它本身不是 relation endpoint truth。`AnnotationTruth` 仍然可以作为轻量输入信号、用户标记、fallback endpoint 或 ContentGroup 的组成来源，但不应该继续承担全部 content-package truth。

`AnnotationSet` 在 V2.BN.8.6.6 中已经作为可运行 seed 存在，但由于产品尚未投产，后续不需要为它保留兼容 adapter。可用部分应迁移到 `ContentGroup`、`Petal`、`GroupFolder / ContentGroup Gallery` 或 relation-side `CompositeEndpoint`，而不是把它继续扩展为主线关系节点模型。

`TextUnitGroup` 也不应继续作为 relation 端点方向。它是 ContentGroup 概念的前身和启发物；若实现可复用，应重写为 ContentGroup workflow，否则应从主线 UX 删除。

这不表示每一行、每一句、每个 span 都自动成为图节点。只有被用户、模板、AI proposal、source reference、relation 行为或 export/AI-context 行为明确提升的内容，才获得稳定 addressable identity。

V2.BN.8.3 只负责确立这个边界和最小 TextFlow seed，不实现 relation endpoint runtime。Relation runtime、relation lifecycle、relation inspector、relation layer、local graph 和 graph sidecar 仍由后续 relation phases 管理。

这样做的意义是：未来 relation 可以连接真正的信息颗粒，例如一个 ContentGroup 中的 definition body、一个 Petal 中的 theorem condition、一个 inline formula、一个 source-backed claim，而不是只能粗暴连接整个 NoteBlock。

---

## 2. 核心区分

Coincides 的 relation 系统至少要拆成三层：

```text
CanvasConnector
  画布上的视觉连接。
  可以是线、箭头、曲线、虚线或其他视觉样式。
  它不天然代表语义关系成立。

ObjectRelation
  系统可读的语义关系。
  AI、搜索、局部知识图谱、GraphRAG bridge 都应该主要读取它。
  它必须通过用户确认、AI proposal apply、或明确的 bind 操作创建。

RelationType
  对 ObjectRelation 的定义。
  它说明这条关系是什么意思、有没有方向、属于哪个关系组、适合连接哪些对象。
```

原则：

- 用户画一根线，不等于自动创建语义关系。
- 视觉线可以只是一种排版或阅读提示。
- 语义关系可以存在但默认不可见。
- 一条视觉线可以承载多条语义关系，但 UI 上必须避免把页面画乱。
- 真正有长期价值的是 `ObjectRelation`，不是线本身。

---

## 2.1 当前实现快照

当前 v2.x 已经有一版可用但很早期的 relation seed。它来自 v2.4.4。

### relation_layers

当前有 `relation_layers` 表。

关键字段：

```text
id
user_id
course_id
canvas_id
title
layer_kind
visibility
status
order_index
metadata
created_at / updated_at
```

当前默认层：

```text
visual
learning_logic
source_evidence
ai_suggested
ai_hidden
```

当前定位：

- 它主要是 relation / edge 的显示与用途组织层；
- 还不是完整 RelationGroup / RelationPack；
- 也不定义 relation type 的语义。

### canvas_edges

当前有 `canvas_edges` 表。

关键字段：

```text
id
user_id
course_id
canvas_id
source_node_id
source_port: top | right | bottom | left
target_node_id nullable
target_port nullable
loose_target_x / loose_target_y nullable
object_relation_id nullable
relation_layer_id nullable
relation_kind nullable
label nullable
connection_state
style_key
status
metadata
created_at / updated_at
```

当前 connection states：

```text
incomplete
visual_only
relation_suggested
relation_backed
stale_binding
broken_relation
```

当前行为：

- 如果有 target node，创建后默认是 `visual_only`；
- 如果没有 target node，但有 loose target 坐标，创建后是 `incomplete`；
- `incomplete` edge 不能 bind semantic relation；
- bind 成功后，edge 进入 `relation_backed`；
- unbind 后，edge 回到 `visual_only` 或 `incomplete`；
- archive / restore 只改变 edge status。

当前限制：

- 只有四个固定 port：`top | right | bottom | left`；
- 没有独立 `ConnectionPoint` 表或自由连接点；
- 没有 bend points、routing、fan-out、connector style editor；
- 一个 edge 当前最多直接绑定一个 `object_relation_id`；
- 还没有正式支持“一条视觉线承载多条语义关系”的 bundle 模型。

### object_relations

当前有 `object_relations` 表。

关键字段：

```text
id
user_id
course_id
source_type
source_id
target_type
target_id
relation_type
status
visibility
confidence
source_canvas_edge_id
relation_layer_id
created_by
label
metadata
created_at / updated_at
```

当前 relation types 是固定枚举：

```text
uses_definition
uses_formula
example_of
answers
supports
contradicts
read_before
derives_to
source_supports
```

当前定位：

- `ObjectRelation` 是 pairwise source-target 语义边；
- 它可以从完整 `CanvasEdge` bind 出来；
- 它是未来 graph edge candidate；
- 它不是 GraphRAG relationship；
- 它目前还不支持 group relation / hyperedge 作为一等结构。

当前限制：

- 没有独立 `RelationType` runtime；
- 没有用户自定义 relation type；
- 没有 relation type package / group / migration；
- 没有 `condition_kind`、`composition_kind`、`directionality` 等一等字段；
- 方向性目前主要隐含在 `source -> target`；
- bidirectional / undirected / group relation 需要通过 metadata 或未来 schema 表达。

### 当前实现结论

当前结构已经做对了最重要的一件事：

```text
CanvasEdge / visual connector
  !=
ObjectRelation / semantic relation
```

但是当前结构还只是 seed。后续需要从“能画线、能 bind 一条 pairwise relation”，升级为：

```text
ConnectionPoint
RelationType runtime
RelationGroup / RelationPack
multi-relation visual bundle
group / composite relation
relation proposal
GraphRAG adapter
```

---

## 2.2 Relation Lifecycle

Relation 需要有生命周期，否则未来会出现关系断裂、source 改动、block 删除、GraphRAG index 过期、用户误删、迁移恢复时无法判断状态的问题。

推荐生命周期：

```text
Visual connector
  用户画出来的视觉连接。
  可能只是草稿线，也可能未来 bind 成语义关系。

Incomplete connector
  只有 source endpoint 或 loose target。
  不允许创建 confirmed ObjectRelation。

Relation candidate
  AI、GraphRAG、source reconstruction、用户操作或规则推断出来的候选关系。
  还不是 truth。

Confirmed ObjectRelation
  用户确认、proposal apply 或明确 bind 后的语义关系。
  这是 Coincides relation truth。

Relation bundle
  同一组 source/target 之间的多个 confirmed relations 的显示聚合。
  可视上可以是一条线，语义上可以是多条 ObjectRelation。

Hidden semantic relation
  不在普通阅读表面显示，但 Relation Mode、AI context、local graph 可以读取。

Stale relation
  关系引用的 block、source、template、concept、layer 或 adapter mapping 已变化，需要重新检查。

Broken relation
  source/target 已丢失或无法解析。
  不应该静默删除，应进入 recovery / warning。

Recovered relation
  通过 migration record、GraphRAG shadow graph、package import record 或人工确认恢复。

Deprecated relation
  关系类型或关系本身不再推荐使用，但仍需保留历史可读性。
```

第一版产品不需要实现全部状态，但必须承认这个生命周期。

### 2.2.1 生命周期的最低产品规则

最低规则：

- 用户画线只创建 visual connector；
- incomplete connector 不能成为 confirmed ObjectRelation；
- confirmed ObjectRelation 必须有可解析 source 和 target；
- confirmed ObjectRelation 断裂时，不静默删除；
- GraphRAG 发现的 relationship 只能进入 candidate；
- candidate 需要 review / proposal / bind 才能进入 confirmed；
- hidden relation 仍然是 relation truth，只是默认不显示；
- visual connector 删除，不一定删除 ObjectRelation；
- ObjectRelation unbind 后，视觉 connector 可以继续存在；
- relation type 被废弃时，旧 relation 仍然可读。

### 2.2.2 Relation Completion

一篇 note 的 relation 完成度可以分层判断：

```text
Human-complete
  Coincides 内部关系已经足够用户查看、编辑、解释和导出工程文件。

AI-readable complete
  后续 GraphRAG sidecar / graph adapter 已经把相关 NoteBlock、Concept、ObjectRelation 编译成 AI 可读索引。

Relation-ready
  Human-complete + AI-readable complete + 没有 stale / broken / unmapped relation。
```

当前 Better Notebook 阶段只需要优先追求 `Human-complete`。`AI-readable complete` 和 `Relation-ready` 应该在 AI / GraphRAG 阶段再正式实现。

---

## 3. 用户创建关系的基本流程

推荐第一版操作流：

```text
1. 用户选中一个 NoteBlock。
2. 浮动工具栏出现 Connect 按钮。
3. 用户点击 Connect。
4. 系统显示该 block 的 ConnectionPoint。
5. 用户从一个 ConnectionPoint 拉出 CanvasConnector。
6. 用户把 connector endpoint 拖到另一个 block 的 ConnectionPoint。
7. 系统创建一条 attached visual connector。
8. Relation Inspector 出现轻量选择：
   - 只保留视觉连接
   - Bind as relation
   - 选择 relation group
   - 选择 relation type
   - 选择方向
9. 用户确认后，系统创建或绑定 ObjectRelation。
```

第一版不应该让用户在刚画线时面对巨大表单。连接完成后，只显示最必要的关系选择。

---

## 4. Relation Inspector 第一版

用户完成连接后，或选中一条 connector / relation 后，打开 `Relation Inspector`。

第一版最小字段：

```text
Relation group
  Learning Logic / Math Reasoning / Source Evidence / Research / Reasoning / Custom

Relation type
  derives_to / proves / uses_formula / example_of / supports / etc.

Direction
  A -> B / B -> A / bidirectional / undirected

Visibility
  visible line / hidden semantic relation / visual-only connector
```

更高级的字段放入 Advanced：

- condition kind；
- group / composite relation；
- confidence；
- source evidence；
- relation layer；
- GraphRAG mapping；
- summary for agent；
- relation type schema detail。

---

## 5. ConnectionPoint

`ConnectionPoint` 是 block placement 的交互控制点，不是 NoteBlock 内容本身。

推荐规则：

- 默认不永久显示；
- 在 selected block、layout mode、relation mode、connect 操作中显示；
- 默认位于 block 边框或外轮廓上，而不是文本内部；
- 用户可以拖动 connection point 改变位置；
- 位置应以 block placement 的相对坐标保存；
- block resize 后，connection point 应保持相对合理的位置；
- 一个 connection point 可以挂多条 connector；
- 多条 connector 挂同一点时，需要 fan-out / offset，避免视觉重叠；
- 用户应能创建多个 connection point，满足上、下、左、右等多方向连接需求。

待研究问题：

- 是否允许 connection point 位于 block 内部非文本区域；
- 如果点被内容遮挡，是否自动移到外轮廓；
- connection point 是否需要用户自定义样式；
- relation-backed connector 和 visual-only connector 的 endpoint 是否应有不同视觉提示；
- 多条线从同一个点出发时，fan-out 规则应该如何设计。

---

## 6. Relation Mode 与 Layout Mode

### Layout Mode

Layout mode 的重点是 block 排版：

- 移动 block；
- resize block；
- 对齐；
- 多选；
- 调整 placement；
- 顺手调整 connector。

Layout mode 可以编辑 relation / connector，但它不是关系审查的主入口。

### Relation Mode

Relation mode 是 relation-focused view。

它的重点是显示和编辑关系：

- 显示 visible connector；
- 显示 hidden semantic relation；
- 显示 visual-only connector；
- 显示 relation-backed connector；
- 显示 incomplete / unbound connector；
- 按 relation layer / relation group / selected block 过滤；
- 批量 bind / unbind / hide / review relation；
- 打开 selected relation inspector；
- 支持局部知识图谱视图。

Relation mode 不应该无脑显示全笔记所有跨页关系，否则会变成线团。

推荐默认显示策略：

- 当前页面内的 visible connector；
- selected block 直接相关的 hidden relation hint；
- 当前 relation group / layer 过滤后的关系；
- 用户主动展开的局部关系网络。

### Local Relation Graph / Supernode Folding

Local Relation Graph 是 relation 的第一类消费视图：用户围绕一个 selected NoteBlock 查看与它直接或间接相关的知识结构。

它不是全局知识图谱，也不是默认正文显示模式。

推荐产品目标：

```text
selected NoteBlock
  -> local relation graph
  -> filter relation group / type / direction / page range / GroupFolder path / graph scope
  -> inspect connected blocks
  -> jump back to original page placement
```

这个功能的意义是让 relation 不只是“后台数据”，而是变成用户能看见、筛选、探索和学习的结构。

第一版推荐入口：

- selected block toolbar: `Graph` / `Relations`；
- right-click menu: `View local graph`；
- relation inspector: `Open local graph`。

未来可以探索更强的空间入口：

- 拖动 selected block 到屏幕右下角的 Graph Peek hot zone；
- 该操作只打开局部图谱，不改变原 block 位置；
- hot zone 不能遮挡用户正常向右下方拖动和排版的空间。

Local graph 默认必须保守，避免视觉爆炸：

- 只围绕 selected block；
- 默认 1-hop；
- 默认当前页或相邻页；
- 默认当前 relation layer / group；
- 默认限制最大节点数和最大边数；
- 默认不展开跨整篇 note 的所有关系。

用户可以主动扩大范围：

- page range；
- relation group；
- relation type；
- direction: upstream / downstream / bidirectional / all；
- graph scope: 1-hop / 2-hop / custom / current GroupFolder boundary；
- formal only / include scratch；
- visible only / include hidden semantic relations。

图谱里的节点不应该显示完整正文。

推荐显示：

- block type icon；
- 短标题或第一行摘要；
- relation count badge；
- source badge；
- formal / scratch 状态；
- warning badge，例如 stale / broken / hidden。

完整内容通过 hover、inspector、double-click 或 jump back 查看。

当局部图谱中某一区域节点过密时，可以把它折叠成 cluster / supernode。

重要原则：

```text
Supernode folding 是 view compression。
它不合并 NoteBlock。
它不合并 ObjectRelation。
它不改变 Coincides truth。
```

第一版可以用规则折叠：

- 同一 page range；
- 同一 relation group；
- 同一 template / block type；
- 同一 source scope；
- 节点数量超过阈值；
- relation 密度超过阈值。

后续可研究：

- graph coarsening；
- community detection，例如 Louvain / Leiden；
- graph summarization；
- dense subgraph detection；
- supernode / superedge summary。

这些算法只能帮助局部图谱视图更清晰，不能替代用户确认的 ObjectRelation。

推荐版本顺序：

```text
Relation Inspector / Relation Mode Seed
  -> Local Relation Graph / Graph Peek
  -> Supernode Folding / Dense Graph Compression
```

第一版先建立 relation 的查看和编辑心智；下一版再做局部图谱和压缩，否则 relation 阶段会过重。

---

## 7. RelationType

RelationType 是用户、系统和 AI 对一类关系的共同契约。

最小结构可以是：

```text
RelationType
  key
  label
  group_key
  directionality
  allowed_from
  allowed_to
  inverse_label
  description_for_human
  summary_for_agent
  graph_rag_mapping
  visual_style_default
  status
```

示例：

```text
key: derives_to
label: 推导出
group_key: math.reasoning
directionality: directed
allowed_from: formula / theorem / proof_step
allowed_to: formula / theorem / result
inverse_label: 由...推导而来
summary_for_agent: A can be used to derive B.
```

底层只需要存一条有方向的关系：

```text
A derives_to B
```

UI 可以自动反向显示：

```text
B 由 A 推导而来
```

### 7.1 底层关系维度

不能直接从 `read_before`、`derives_to`、`example_of` 这些上层语义开始定义关系。更稳的方式是先定义底层关系维度，再把领域词汇放上去。

当前最佳候选模型：

```text
relation_existence
  unrelated / related

condition_kind
  unconditional / conditional

composition_kind
  simple_pair / group_relation / all_of / any_of / sequence / threshold

directionality
  directed / bidirectional / undirected

semantic_family / domain_relation_type
  read_before / derives_to / example_of / supports / contradicts / etc.

visibility
  visible / hidden / layer_only / selected_only

confidence / provenance
  user_created / ai_suggested / source_derived / inferred / verified
```

换成人话：

```text
这些对象有没有关系？
这个关系需不需要条件？
这个关系是不是多个对象共同成立？
这个关系有没有方向？
这个关系在学习、研究、推理或 source 语境里叫什么？
这个关系应该怎么显示？
这个关系来自哪里，可信到什么程度？
```

这个底层模型解决一个关键问题：领域关系类型会无限增长，但底层关系机制不能无限混乱。

例如：

```text
A derives_to B
```

底层可以理解为：

```text
relation_existence: related
condition_kind: unconditional
composition_kind: simple_pair
directionality: directed
semantic_family: derivation
domain_relation_type: derives_to
```

再例如：

```text
A + B derives_to C
```

这不是简单的 A -> C，也不是简单的 B -> C。它应该表达为：

```text
relation_existence: related
condition_kind: conditional
composition_kind: all_of / group_relation
directionality: directed
semantic_family: derivation
domain_relation_type: derives_to
inputs: A, B
output: C
```

如果当前实现暂时只能存 pairwise `ObjectRelation`，这个结构可以先作为 metadata / proposal / relation group 记录。后续如果升级 graph-native，可以考虑 `RelationGroup`、`PrerequisiteSet`、`RelationSet` 或 hyperedge-like node。

### 7.2 底层关系形态候选

当前至少需要考虑这些底层关系形态：

```text
Pairwise directed
  A -> B
  例如：Formula A derives_to Formula B。

Pairwise bidirectional
  A <-> B
  例如：两个定义互相解释、两个表示等价。

Pairwise undirected / associative
  A -- B
  例如：A 和 B 有关联，但没有方向，也不是前置关系。

Group directed / hyperedge-like
  A + B -> C
  例如：A 和 B 共同推出 C，缺一不可。

Group undirected / cluster
  A, B, C belong together
  例如：用户把 A/B/C 作为同一阶段目标、同一复习包、同一研究线索。

Sequence
  A -> B -> C
  例如：学习顺序、证明步骤、时间线。

Threshold / any-of
  any 2 of A/B/C support D
  例如：多个证据中任意两个足以支持一个判断。
```

这些形态不应该全部直接表现成画布线。它们可以通过：

- relation inspector；
- local graph view；
- relation layer；
- relation group node；
- badge；
- folded relation bundle；
- AI-readable graph context；
- GraphRAG adapter payload；

来表达。

### 7.3 用户目标关系不一定是内容关系

用户可能会创建这样的关系：

```text
我要把 Block A、Block B、Block C 全都学懂。
```

这不一定意味着 A、B、C 的内容之间有推导、证明或 source evidence 关系。它可能只是用户目标、阶段任务、复习计划或个人意义上的关联。

这类关系有两种可能表达：

```text
Option A: Goal / Intent Block
  创建一个特殊 NoteBlock 或 GoalBlock：
    "本阶段目标：学懂 A/B/C"
  然后建立：
    GoalBlock includes A
    GoalBlock includes B
    GoalBlock includes C

Option B: RelationSet / GroupRelation
  创建一个 group relation：
    group_kind: user_goal
    members: A, B, C
    label: 本阶段目标
```

不推荐简单创建：

```text
A related_to B
B related_to C
A related_to C
```

因为这会伪造内容关系，让 AI 以为这些知识点本身互相关联。

暂定判断：

- 如果是内容上的联系，用 `ObjectRelation`；
- 如果是用户目标、复习包、临时任务、个人意义，用 `GoalBlock`、`RelationSet` 或 `GroupRelation`；
- 这类结构应该对 AI 可读，但默认不一定参与正式 PDF 导出；
- 这类结构可能属于 `Custom` / `Learning Logic` / `User Intent` relation group。

### 7.4 GraphRAG 对组合关系的边界

Microsoft GraphRAG 默认更适合 pairwise entity relationships。

对于：

```text
A + B -> C
```

不能指望 GraphRAG 原生、稳定、完整地理解它是一个 all-of group relation。

未来 bridge 可以考虑两种映射：

```text
Reified relation node:
  RelationSet R
    has_input A
    has_input B
    derives_to C

Typed text payload:
  "A and B together derive C. A alone or B alone is insufficient."
```

也就是说，GraphRAG 可以读取我们的 group relation 表达，但不能反过来决定 Coincides 的底层关系模型。

---

## 8. 初始 Relation Groups

Relation group 是为了让不同场景拥有不同的关系词表。

第一批候选组：

```text
Learning Logic
  学习顺序、前置知识、例题、练习、复习重点。

Math Reasoning
  推导、证明、等价、特殊情况、推广、条件依赖。

Source Evidence
  支持、反驳、引用、证据来源、source quote。

Research / Intel
  事件、因果、时间线、主体、地点、证据链。

Reasoning / Case
  线索、嫌疑、矛盾、动机、证词、假设。

Custom
  用户自定义关系。
```

同一篇 note 可以混用多个 relation group。

例如一篇数学笔记里，可以同时有：

- `Math Reasoning: derives_to`
- `Learning Logic: requires_before`
- `Custom: 我不明白`
- `Source Evidence: source_supports`

---

## 9. 数学学习关系候选

第一批数学 / 学习场景可以考虑：

```text
derives_to
  A 推导出 B。

proves
  A 证明 B。

uses_definition
  A 使用某个定义。

uses_formula
  A 使用某个公式。

example_of
  A 是 B 的例子。

exercise_for
  A 是 B 的练习。

requires_before
  学 B 前需要先学 A。

equivalent_to
  A 与 B 等价。

special_case_of
  A 是 B 的特殊情况。

generalizes
  A 推广为 B。

contrasts_with
  A 与 B 对比。

common_mistake_for
  A 是学习 B 时常见误区。
```

这些关系不应该一开始全部暴露给普通用户。普通用户可以先看到常用关系，更多关系放到 search / more 中。

---

## 10. 一条视觉线可以承载多条语义关系

同两个 block 之间可能存在多个关系。

例如：

```text
Formula A -> Formula B:
  derives_to
  requires_before

Example C -> Formula B:
  example_of
  uses_formula
```

不建议在画布上画多条完全重叠的线。

推荐规则：

- 视觉上可以显示一条 connector；
- inspector 里显示多个 relation chips；
- 用户可以展开查看每条语义关系；
- 不同 relation group / layer 可以控制显示与隐藏。

---

## 11. 自定义 RelationType

用户应能创建自定义关系，但要通过向导降低混乱风险。

推荐创建向导：

```text
1. 这个关系叫什么？
   例如：推导出、支持、我不明白、待验证。

2. 它属于哪个关系组？
   例如：Math Reasoning / Learning Logic / Custom。

3. 它有没有方向？
   A -> B / B -> A / 双向 / 无方向。

4. 它通常连接什么对象？
   Formula -> Formula，Example -> Theorem，NoteBlock -> SourceScope。

5. 给 AI 的一句解释是什么？
   例如：A can be used to derive B.
```

高级设置：

- allowed block types；
- inverse label；
- relation layer；
- default visual style；
- GraphRAG mapping；
- source behavior；
- confidence behavior；
- export behavior；
- AI suggestion policy。

护栏：

- 不建议用户无限创建关系类型；
- 系统应提示是否已有相似 relation type；
- relation type 可以 deprecated，不建议硬删除；
- 已被 ObjectRelation 使用的 RelationType 不应直接破坏性修改；
- 修改 active RelationType 未来应走 proposal-first。

---

## 12. GraphRAG / Microsoft GraphRAG Bridge

Microsoft GraphRAG 可以帮助发现候选关系，但不应定义 Coincides 的主权关系系统。

推荐边界：

```text
Coincides ObjectRelation:
  用户和系统认可的精细语义关系。

GraphRAG relationship:
  外部图检索或候选关系生成材料。
```

推荐流程：

```text
GraphRAG detects candidate relationship
  -> Coincides Relation Proposal
  -> user / AI review
  -> ObjectRelation
```

不推荐：

```text
GraphRAG relationship
  -> directly becomes ObjectRelation without review
```

GraphRAG 映射需要解决的问题：

- Coincides 的 `derives_to` 如何映射到 GraphRAG 的泛化 edge；
- 学习关系、数学关系、source evidence 关系是否需要不同 projection；
- 用户自定义 RelationType 如何导出给 GraphRAG；
- GraphRAG 发现的关系如何保留 provenance；
- GraphRAG relation 和用户确认 relation 冲突时如何处理；
- 一条 Coincides relation 是否可能导出为多个 GraphRAG edge。

---

## 13. Open Questions

当前还需要继续讨论：

- RelationType 是否需要独立 Studio，还是先放进 Template / Developer Studio；
- 关系组是否属于 PackageManifest / DomainBlockSet 的一部分；
- RelationType 是否支持 package import / export；
- RelationType 的修改是否需要像 TemplateMigrationProposal 一样走 proposal-first；
- connection point 的样式是否应该用户可自定义；
- visual-only connector 是否参与导出；
- hidden ObjectRelation 是否参与 PDF 导出；
- page 外 scratch block 的 relation 是否默认不导出，但允许 AI 读取；
- relation mode 的默认筛选规则；
- Local Relation Graph 第一版的默认 page range / GroupFolder path / graph scope / max node threshold；
- Graph Peek hot zone 是否进入第一版，还是先用 toolbar / right-click 入口；
- Supernode folding 第一版是否只用规则折叠，还是引入 Louvain / Leiden 调研 spike；
- GraphRAG bridge 应该在 Better Notebook 成熟后做，还是作为 relation proposal 的早期调研。

---

## 14. 当前暂定结论

目前最稳的方向：

```text
视觉连接和语义关系分离。
用户画线只创建 CanvasConnector。
用户确认或 proposal apply 后才创建 ObjectRelation。
RelationType 定义关系含义。
RelationGroup 管理不同场景的关系词表。
RelationMode 用于显示和批量审查关系。
Local Relation Graph 用于围绕 selected block 消费关系。
Supernode Folding 是局部图谱的 view compression，不改变真实 NoteBlock / ObjectRelation。
LayoutMode 也可编辑 connector，但不承担关系审查主职责。
GraphRAG 是候选关系和检索增强工具，不是 Coincides 关系系统的源头。
```

这个文档后续应该继续细化到：

- 第一版 UI；
- 第一版数据结构；
- RelationType seed；
- RelationType editor；
- Relation proposal；
- GraphRAG bridge；
- export / import；
- v3.x graph-native migration evidence。
