# R8 - Source / Relation / Concept 在 Better Notebook 中的用户体验

## 0. 报告定位

R8 研究 Better Notebook 中三类“语义能力”应该怎样进入成熟笔记体验：

```text
Source = 为什么可信，能不能回到来源
Relation = 这个内容和别的内容怎样相连
Concept = 这个内容属于哪些可检索、可筛选、可演化的主题维度
```

R8 不是在设计新的 Source Reconstruction pipeline，也不是在实现 GraphRAG。它的任务更靠近产品体验：

```text
这些能力怎样被用户自然发现、使用、隐藏、检查、导出和交给 AI 读取？
```

如果 R8 处理不好，Coincides 会重新变成工程面板：每个 block 都挂着 source id、relation id、template id、domain id，用户一眼看过去像在看后台数据库。Better Notebook 必须把这些能力变成用户可以理解的 affordance，而不是把 truth 直接摊在页面上。

## 1. 本轮参考材料

R8 继承以下结论：

- `R6-better-notebook-data-contract.md`：`NoteBlock` 是内容 truth，`SurfaceObject` 是 placement/projection，`SourceReference / SourceRegion` 是证据，`ObjectRelation` 是语义边，editor snapshot 只能是 cache / sidecar。
- `R7-editor-runtime-route-decision.md`：不建议 full AFFiNE fork；数据主权自研，交互运行时先评估 BlockSuite；所有 source/relation/template/concept truth 必须保留在 Coincides sidecar / runtime 层。
- `S2-r3-r5-page-canvas-block-control-summary.md`：metadata 不应常驻，应该通过 hover、selected toolbar、right-click、inspector、debug mode 分层出现。
- `product-improvement-issue-register.md`：
  - PI-015：NoteBlock 不一定需要 source reference；
  - PI-020：用户需要手动把已有 block link 到 source；
  - PI-028/PI-029/PI-030/PI-031：relation 不能只等于视觉线，AI 需要可查询 subgraph；
  - PI-049：Microsoft GraphRAG 可做 sidecar / proposal assistant，不是 Coincides truth；
  - open questions 112-121：Concept 层是跨笔记检索、GraphRAG 和主题过滤的重要后续层。
- 当前 schema / service 证据：
  - `note_block_sources` 已能表达 block 到 document/chunk/page/excerpt 的 source reference；
  - `source_anchors` / `source_scopes` 已能表达更稳定的 source jump target；
  - `canvas_edges` 是视觉边；
  - `object_relations` 是语义关系；
  - `relation_layers` 已有 visual、learning logic、source evidence、AI suggested、AI hidden 这类层概念；
  - `domain_object_classifications` 是 domain 分类证据，但不是完整 Concept 系统。

## 2. Browser Harness Observation Log

### 观察对象

当前 Coincides 本地测试账号中的 `Real Material Smoke Course`，页面 URL：

```text
http://localhost:5173/#/courses/9581258b-79da-41b5-a309-87cbf723a8b7
```

### 操作步骤

1. Henry 手动登录测试账号。
2. Browser Harness 读取当前页面文本。
3. 观察 Canvas Document 区域、selected object scope、hidden nodes、relation layers 和 source-backed nodes。

### 观察结果

页面中已经能看到：

- `Canvas Document` 主区域；
- `source board node`；
- `note block`；
- `Open` / `Hide`；
- `Selected Object Scope`；
- `COMMAND CONTEXT`；
- `Relation Layers`：
  - Visual；
  - Learning logic；
  - Source evidence；
  - AI suggested；
  - AI hidden；
- `Hidden nodes` 和 restore 行为；
- `Bind relation` / `Unbind relation` 行为入口。

### 与目标体验的差距

当前能力已经有 seed，但它们仍然以工程调试信息的形式出现：

- 用户能看到大量对象类型和内部 scope；
- source board node 和 note block 的视觉差距不够自然；
- source / relation / selected scope 仍像开发者面板；
- relation layer 是真实能力，但还不是用户心智里的“关系视图”；
- `Hide` 一类操作容易被误解为删除或移除。

这进一步确认 R8 的核心判断：source / relation / concept 不是更多面板，而是需要被安放进 badge、inspector、local graph、picker 和 export/AI visibility 策略里。

## 3. R8 总原则

### 3.1 正文优先，证据按需出现

Better Notebook 的阅读状态应该先显示内容：

```text
text / formula / image / code / table / quote / note
```

而不是默认显示：

```text
block type / source id / relation id / scope id / template id / debug id
```

source、relation、concept 必须存在，但默认只以轻量方式出现。

### 3.2 用户写的 block 可以没有 source

用户原创内容、思考、草稿、证明、备注、综合总结都可以是 source-free。

但是 UI 必须区分：

- `source_grounded`：有明确来源；
- `user_authored`：用户原创；
- `user_synthesis`：用户综合多个来源；
- `ai_synthesis`：AI 综合多个来源；
- `scratch_work`：草稿和旁注；
- `unverified`：未验证或弱来源。

这不是为了限制用户，而是为了让导出、AI 读取、检索和未来 graph-native 迁移知道每个 block 的可信度和上下文。

### 3.3 视觉线不是 relation 的唯一形态

relation 的 truth 是 `ObjectRelation`，视觉线只是表达方式之一。

在正式页面里，尤其是长文档和跨页关系里，默认画所有线会让用户无法阅读。关系应该有多种显示方式：

- 同页近距离关系：可以显示线；
- 选中 block 的直接邻域：可以临时显示线；
- 跨页关系：默认显示 badge / jump / inspector，不画长线；
- 密集关系：进入 local graph / relation view；
- AI hidden / machine relation：默认不显示，只在 inspector/debug/agent context 出现；
- 用户显式 pin 的关系：可以在正式页面显示。

### 3.4 Concept 第一阶段不应变成满屏 tag

Concept 很重要，但第一阶段不要让页面变成标签墙。

更好的路线是：

```text
正文少量 topic chips / source badges
selected block inspector 显示 concepts
搜索/过滤/AI context 使用 concepts
完整 Concept Studio / ConceptRefinementProposal 后置
```

Concept 层应该优先服务于检索、过滤、局部图谱和 AI context，而不是在第一版 Better Notebook 中抢正文视觉空间。

## 4. Source UX 合同

### 4.1 Source attachment 的入口

用户选中一个 block 后，应该有三种自然入口：

1. selected toolbar 的 `Source` 或引用图标；
2. 右键菜单中的 `Attach source` / `Cite source`；
3. Inspector 的 `Sources` tab。

不建议把 source attach 做成主页面常驻大面板。它是 block-level 操作，应靠近被操作对象。

### 4.2 Source picker

Source picker 应该允许用户选择：

- 一个 source material；
- 多个 source materials；
- page；
- page range；
- SourceScope；
- SourceAnchor；
- SourceBoard node；
- material segment；
- future `SourceRegion`。

第一版可以先支持现有对象：

```text
source material
page / page range
source scope
source anchor
source board node
```

`SourceRegion` 应等 PI-048 研究后再进入正式工程，不应在 R8 阶段提前锁死 schema。

### 4.3 单 source / 多 source

用户写的一段总结可能来自多个来源。Source picker 必须支持一次 attach 多个来源，而不是只能选一个。

多 source 显示建议：

```text
[3 sources]
```

点击后打开 inspector：

- primary source；
- supporting sources；
- source type；
- page/page range；
- excerpt；
- confidence；
- jump target；
- source role：support / inspiration / quote / contradiction / background。

### 4.4 Source badge 显示策略

正常阅读时：

- 没 source 的普通用户 block 不显示警告；
- source-backed block 显示非常轻量的 source badge；
- AI-generated 但没有 source 的 block 可以显示弱提示；
- source quote block 可以更明确显示来源。

选中时：

- block 边框外显示 source count；
- toolbar 出现 source 按钮；
- inspector 显示完整来源。

Debug mode：

- 显示 source id / anchor id / scope id / page label。

### 4.5 Source 与 export / AI visibility

source 不等于导出。

导出 PDF 时：

- 正文可以显示短 citation；
- source inspector 里的详细证据默认不导出；
- 用户可选择导出 bibliography / source appendix；
- 页面外 scratch block 的 source 关系可以保存在工程文件里，但默认不进正式 PDF。

AI 读取时：

- source-free 用户内容仍可读；
- source-grounded 内容带 source refs；
- unverified / ai_synthesis 必须带 warning；
- source quote 必须保持 faithful，不应被随意改写。

## 5. Relation UX 合同

### 5.1 视觉边与语义边

当前 v2.4.4 已建立：

```text
CanvasEdge = 视觉连接 / 交互对象
ObjectRelation = 系统可读的语义关系
RelationLayer = 关系显示、筛选和用途组织层
```

Better Notebook 必须继续保持这一区分。

用户画一条线，不等于系统已经确认一个语义关系。用户选择 relation type 并绑定后，才形成 `ObjectRelation`。

### 5.2 Relation 的低层模型

R8 继承 register 中已经记录的五层 relation 判断：

1. 是否有关联；
2. 是无条件关联，还是有条件关联；
3. 是简单 pair 关系，还是组合/group 关系；
4. 是单向、双向，还是无方向/关联型；
5. 再加上上层语义。

这套模型不应该直接暴露给普通用户，但它应该进入 inspector / advanced relation editor / future graph-native planning。

普通用户看到的应该是：

```text
requires
explains
derives to
example of
supports
contradicts
related
my question
```

高级 inspector 才显示 directionality、condition、group relation、confidence、created_by、relation layer。

### 5.3 什么时候显示线

R8 建议默认规则：

| 情况 | 默认显示方式 |
| --- | --- |
| 同页、距离近、用户创建、非密集 | 可以显示线 |
| 同页但多条重叠关系 | bundled line + count badge |
| 跨页关系 | 不画长线，显示 related elsewhere badge |
| 选中 block | 临时显示 direct neighborhood |
| relation mode | 显示当前 layer / filter 下的关系 |
| local graph view | 显示完整关系图 |
| AI hidden layer | 默认不显示，只进 inspector/debug/AI context |
| export PDF | 默认不导出关系线，除非用户显式选择 |

### 5.4 Local graph view

长距离和密集关系不应强行画在正式页面上。

更好的体验是用户选中一个 block 后，可以打开：

```text
Show related
Show prerequisites
Show examples
Show source evidence
Open local graph
```

这类视图可以 deterministic 地从 `ObjectRelation` 查询出来，不需要 AI 每次重新生成。

AI 的角色是：

- 解释这张图；
- 建议缺失关系；
- 把自然语言问题转成 relation filter；
- 生成学习路径；
- 给出 proposal。

AI 不应该负责每次凭空画图。

### 5.5 Relation layer 体验

现有 relation layers 是合理 seed，但 UI 需要翻译成用户心智：

```text
Visual
Learning logic
Source evidence
AI suggested
AI hidden
```

建议第一版显示成一个简洁 filter：

- All relations；
- Learning；
- Evidence；
- My visible lines；
- AI suggestions；
- Hidden from page。

不要一开始做完整 layer editor。完整 layer 管理应该等 relation 使用成熟后再做。

### 5.6 多个语义关系共用一个视觉边

同一对对象之间可能同时存在：

- read before；
- derives to；
- conceptually related；
- example of；
- source supports。

不要画多条重叠线。

推荐：

```text
多条 ObjectRelations 独立存储；
一个 CanvasEdge 可显示 bundled summary；
inspector 展开全部关系。
```

这比让一个 relation record  carrying 多个 labels 更适合未来 graph-native 迁移，也更容易做筛选和统计。

## 6. Concept UX 合同

### 6.1 Concept 解决的问题

Concept 不是 template，也不是 domain。

它更像：

```text
一个跨 note、跨 project、跨 source 的可演化主题维度。
```

它解决的是：

- 用户想找所有 Green theorem 相关内容；
- 用户想从多个课程里找同一个数学概念；
- 用户想在政治、社会学、统计学多维度下查同一个事件；
- AI 想先用 concept 缩小检索范围，再看 relation / template / source。

### 6.2 Concept 与现有 domain/template 的区别

当前 Coincides 已有：

- `TemplateDefinition`；
- `DomainBlockSet`；
- `domain_object_classifications`；
- `concept.basic` template。

这些不是完整 Concept 系统。

区别：

```text
TemplateDefinition = 内容结构和行为能力
DomainBlockSet = 一组模板/组合/行为适用的领域包
domain_object_classification = 对对象当前领域归属的记录
Concept = 主题、实体、方法、事件、兴趣、地理、材料类型等检索维度
```

Concept 可以和 domain 有关系，但不应该被 domain 完全替代。

### 6.3 Concept 第一版 UI

R8 不建议第一版 Better Notebook 做完整 Concept Studio。

第一版可做：

- selected block inspector 中显示 topics / concepts；
- block 上可选轻量 chip，例如 `Green theorem`、`vector field`；
- search/filter 可按 concept 候选过滤；
- AI context payload 可包含 concept candidates；
- debug inspector 显示 concept id / confidence / source。

第一版不建议：

- 在正文每个 block 默认显示一堆 tag；
- 让用户必须先维护 concept 才能写笔记；
- 一开始做 concept merge/split/backfill 全套系统；
- 把 concept 和 domain/template 混成一个字段。

### 6.4 Concept 新增和演化

Concept 会不断演化。

例如早期资料只有 `copper`，后来用户发现需要 `politics`、`mining policy`、`Chile copper policy` 这样的新维度。系统不能要求所有旧 block 立刻被完美重分类。

更合理的路线：

```text
ConceptSuggestion
ConceptDimensionProposal
ConceptRefinementProposal
ConceptBackfillPreview
ConceptClassificationRecord
```

这不是 Better Notebook 第一阶段要做完的事，但 R8 建议 roadmap 至少预留 Concept-lite slot，避免未来重构 source/relation/retrieval UI。

### 6.5 Concept 对检索的作用

Concept 应该被理解为 embedding 和 relation 之间的一层结构过滤。

可能检索流程：

```text
用户问题
  -> embedding 找语义相近内容
  -> concept / alias / dimension 缩小或扩展范围
  -> template / role 过滤 definition / theorem / example / exercise
  -> relation traversal 找 prerequisites / examples / support
  -> source refs 收集证据
  -> AI 生成回答或 proposal
```

Concept 不是取代 embedding，也不是取代 ObjectRelation。它让检索更可控。

## 7. 三者在 UI 中的显示分层

### 7.1 Normal reading

显示：

- 正文内容；
- 少量 source badge；
- 少量 relation count / related badge；
- 仅当用户开启时显示 concept chip。

隐藏：

- source id；
- relation id；
- template id；
- internal scope；
- graph debug details。

### 7.2 Hover

显示：

- subtle block frame；
- source badge tooltip；
- relation count tooltip；
- maybe concept summary。

### 7.3 Selected

显示：

- block frame；
- toolbar；
- source attach；
- relation quick actions；
- concept/topic quick view；
- open inspector。

### 7.4 Inspector

分 tabs：

```text
Content
Sources
Relations
Concepts
Template
Layout
Export
AI visibility
History / Debug
```

Inspector 是 R8 最重要的 UI 容器。它能把强大的语义能力藏起来，但不丢掉。

### 7.5 Relation / Graph mode

显示：

- selected relation layer；
- local graph；
- relation filters；
- long-distance relation list；
- relation explanation。

它不是默认阅读模式。

### 7.6 Export preview

显示：

- 哪些 source citation 会进入 PDF；
- 哪些 relation line 会进入导出；
- 哪些 scratch / outside workspace 内容被排除；
- 哪些 source appendix 会附加。

### 7.7 AI context preview

显示：

- AI 会读取哪些 blocks；
- AI 会看到哪些 sources；
- AI 会看到哪些 relations；
- AI 会看到哪些 concepts；
- 哪些 scratch/private 内容不会读取。

这对未来人机协作非常重要。

## 8. 数据契约影响

R8 不建议马上新增完整 Concept 表，但建议新 roadmap 在数据合同中预留以下概念。

### 8.1 SourceAttachment / SourceReference

等价或扩展现有 `note_block_sources`。

应支持：

```text
target_type
target_id
source_ref_type
source_material_id
source_snapshot_id
source_snapshot_page_id
source_anchor_id
source_scope_id
source_region_id
page_start
page_end
excerpt
source_role
confidence
created_by
metadata
```

短期可继续使用 `note_block_sources` + `source_anchors` + `source_scopes` 组合，不急于重写。

### 8.2 ObjectRelation

现有 `object_relations` 可继续作为 seed，但未来需要补：

```text
condition_kind
composition_kind
directionality
semantic_family
domain_relation_type
relation_group_id
visibility
provenance
verified_state
```

这些可以先放 metadata，等 relation 使用成熟后再决定是否升表。

### 8.3 ConceptLink

未来需要类似：

```text
concept_id
target_type
target_id
link_role
dimension
confidence
created_by
status
source_proposal_id
history
```

但 R8 建议它不要抢 Better Notebook 第一阶段主线。

第一阶段可以先用 metadata / domain classification / tag-like candidate 过渡，重点是 UI 预留 `Concepts` tab 和检索策略，不急于完整工程化。

## 9. PI-046 Consistency / Conflict Check

R8 与 PI-046 没有冲突，反而强化 PI-046 的决定：

- 不采用 full AFFiNE fork；
- 不让 BlockSuite/AFFiNE snapshot 接管 source/relation/concept truth；
- 保持 Coincides sidecar / runtime 作为语义主权层；
- Better Notebook 先做好人类写作与阅读，再让 AI/GraphRAG 读取结构化成果。

R8 对 PI-046 的补充是：

```text
如果采用 BlockSuite 或其他 editor runtime，
source / relation / concept 必须作为 Coincides-owned overlay / sidecar / inspector 能力接入，
而不是塞进 editor block JSON 里成为不可控私有结构。
```

## 10. Roadmap Draft Impact

R8 建议新 roadmap 在 R7 的 `Phase B0 - Editor Runtime Spike Gate` 后增加：

```text
Phase A7 - Source / Relation / Concept Interaction Layer
```

或者将它拆成两个阶段：

```text
Phase A7a - Source Attachment And Provenance UX
Phase A7b - Relation Inspector And Local Graph UX
Phase A7c - Concept-Lite Search And Inspector UX
```

推荐不要把 Concept 全量系统塞进第一轮 Better Notebook。更稳的顺序是：

1. Source attachment UX；
2. Relation inspector/local graph UX；
3. Concept-lite search/filter/inspector；
4. Concept proposal/backfill/refinement；
5. Concept-aware GraphRAG payload。

### 10.1 必须进入新 roadmap 的 reference

- `R6-better-notebook-data-contract.md`
- `R7-editor-runtime-route-decision.md`
- 本 R8 报告
- PI-046 R15 系列 GraphRAG 报告
- PI-048 Outline，尤其是 SourceRegion / Source Reconstruction 相关内容
- product improvement register PI-015、PI-020、PI-029、PI-030、PI-031、PI-049、open questions 112-121

### 10.2 最小验收建议

Source UX：

- selected block 可 attach source；
- 支持 multiple sources；
- 支持 source page/range/scope/anchor/source board node；
- block 显示轻量 source badge；
- inspector 显示 source list 和 jump target；
- source-free user block 被视为正常。

Relation UX：

- selected block 可查看 relations；
- same-page visible line 可选；
- cross-page relation 默认隐藏为 badge / list；
- local graph view 可 deterministic 查询；
- visual edge 和 ObjectRelation 保持分离；
- relation layer 可过滤。

Concept UX：

- inspector 有 Concepts tab；
- concept chip 默认轻量或隐藏；
- search/filter 能使用 concept-like metadata；
- full Concept model 后置。

## 11. R8 回答 Outline 问题

### 用户如何把自己写的 block 关联到多个来源？

选中 block 后，通过 toolbar、右键或 inspector 打开 source picker。Source picker 支持多选 source material、page/range、SourceScope、SourceAnchor、SourceBoard node。创建 source reference 后，block 显示 source count badge，inspector 提供 jump target。

### source attach 是右键、inspector，还是 source picker？

三者都需要。入口是 toolbar / right-click / inspector；真正选择来源的是统一 source picker。

### relation 什么时候显示成线，什么时候只在 inspector/local graph 出现？

同页、短距离、用户可理解的关系可以显示成线。跨页、远距离、密集、多重、AI hidden 或 machine-generated relation 默认进入 badge、inspector 或 local graph。Relation mode 可以临时显示某个 layer。

### 跨页 relation 是否默认隐藏？

是。跨页线默认隐藏，用 `related elsewhere`、relation count、jump list 或 local graph 表示。用户可手动 pin 特定跨页关系。

### concept 是否在 Better Notebook 第一阶段出现，还是推后？

Concept-lite 可以出现：inspector、search/filter、少量 chips、AI context。完整 Concept model、ConceptRefinementProposal、backfill 和 dimension management 应推后。

### SourceRegion 是否要等 PI-048 后再进入正式工程？

是。第一版 source attach 复用 source material、page/range、SourceScope、SourceAnchor、SourceBoard node。`SourceRegion` 是未来高精度 source reconstruction 的输入层，应等 PI-048 形成 schema 与工具链判断后再落表。

## 12. R8 结论

Better Notebook 中 source、relation、concept 的正确位置不是正文里的工程标签，而是：

```text
badge
tooltip
selected toolbar
right-click
inspector
local graph
search/filter
export preview
AI context preview
```

Source 先进入第一轮，因为它直接影响可信度和 jump-back。

Relation 第二进入，因为它已经有 v2.4.4 seed，但必须从“画线玩具”升级成可查询、可隐藏、可绑定、可过滤的语义连接。

Concept 第三进入，因为它对跨笔记检索和 GraphRAG 极其重要，但不应在第一版 Better Notebook 中变成满屏标签或复杂分类维护。

R8 的核心建议是：

```text
先让用户自然写作；
再让用户自然附加来源；
再让关系按需显形；
最后让 concept 成为检索和 AI context 的结构维度。
```

这样 Coincides 才能保留自己的 source-grounded / relation-aware 优势，同时不把成熟笔记体验重新拖回工程原型。
