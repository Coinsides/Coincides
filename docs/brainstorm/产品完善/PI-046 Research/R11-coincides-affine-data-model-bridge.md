# R11 - Coincides 数据模型接入 AFFiNE / BlockSuite 的方式

## 本阶段目标

R11 研究的是：如果 R10 推荐的 `BlockSuite Edgeless-as-page + Coincides semantic sidecar` 成立，那么 Coincides 的语义层到底应该怎样接入 BlockSuite。

这不是 UI 讨论，而是 identity / ownership / sync / recovery 讨论。

核心问题：

```text
BlockSuite 可以负责编辑和画布交互。
但 Coincides 的 NoteBlock、Source、Relation、Template、Domain、Proposal 能不能不被它吞掉？
```

## 证据来源

本阶段引用：

- R3：Coincides canonical ownership matrix。
- R8：不要整搬 AFFiNE，优先验证 BlockSuite-first / hybrid。
- R9：不要优先强改 PageEditor。
- R10：Edgeless-as-page 是当前第一候选路线，但必须有 Coincides sidecar。
- 当前 Coincides 代码中的服务和前端结构：
  - `server/src/services/sourceScopes.ts`
  - `server/src/services/sourceAnchors.ts`
  - `server/src/services/learningCanvases.ts`
  - `server/src/services/templateDefinitions.ts`
  - `server/src/services/domainPackages.ts`
  - `client/src/pages/Courses/LearningCanvasSurface.tsx`
- BlockSuite / AFFiNE Edgeless 证据：
  - surface / frame / note / connector / viewport / displayMode / `xywh` / `index`。

证据等级：

- A 级代码证据：Coincides 当前服务和 BlockSuite 源码。
- B 级结构推断：sidecar / adapter / dual-write 的可行性判断。
- D 级产品需求证据：R4-R10 已经确认的用户体验和架构需求。

## 一句话结论

**推荐采用 BlockSuite-first sidecar，而不是 full fork、深改 AFFiNE block model、纯双写或只做 import/export bridge。**

最小原则是：

```text
BlockSuite owns:
  editor document runtime
  surface interaction
  visual note/frame/connector projection
  selection / drag / resize / viewport / toolbar

Coincides owns:
  NoteBlock identity and content truth
  SourceAnchor / SourceScope / Evidence provenance
  CanvasNode / CanvasFrame / CanvasEdge semantic projection record
  ObjectRelation
  TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest
  Concept / role / retrieval metadata
  Proposal / OperationBatch / Recovery
  export intent / page labels / AI visibility
```

## 1. Coincides 当前对象层已经适合 sidecar，而不是整合进 editor runtime

当前 Coincides 已经有比较清楚的对象分层。

### 内容 truth

- `note_blocks`
- `note_block_placements`
- `note_block_sources`

NoteBlock 是知识内容对象，不是画布元素本身。它可以被投射到 canvas，也可以被 source / template / domain / relation / proposal 引用。

### Source truth

- `source_snapshots`
- `source_snapshot_pages`
- `source_anchors`
- `source_anchor_links`
- `source_scopes`

这些对象负责 source trust、source jump-back、page/page range、chunk/segment/source material link。它们不能被 BlockSuite 的 block tree 替代。

### Projection / canvas

- `learning_canvases`
- `canvas_nodes`
- `canvas_frames`
- `canvas_edges`
- `canvas_viewport_states`

当前 `canvas_nodes` 已经允许多种 node type：`note_block`、`source_scope`、`source_anchor`、`source_board_node`、`source_material`、`material_segment`、`evidence_set`、`proposal`。

这说明 Coincides 早就不是单一文档树，而是把很多底层对象投射到 canvas。

### Semantic relation

- `canvas_edges`
- `object_relations`
- `relation_layers`

v2.4.4 已经把视觉边和语义边分开。`CanvasEdge` 是 projection / interaction object；`ObjectRelation` 才是未来 graph edge candidate。

### Capability layer

- `template_definitions`
- `composition_templates`
- `domain_block_sets`
- `package_manifests`

这些是 agent 和用户选择内容结构的能力层，不能变成 BlockSuite 的简单 block type。

### Operation / provenance

- `proposals`
- `operation_batches`
- template migration records
- domain refinement records
- package import/export records

这些是操作历史和恢复证据，不是 editor runtime 能自然表达的东西。

结论：

```text
Coincides 当前数据模型已经天然 sidecar 化。
把它们硬塞进 AFFiNE / BlockSuite block model，会破坏 v2.x 已经建立的 source/proposal/template/relation/provenance 地基。
```

## 2. BlockSuite 对象可以映射为 adapter/projection id

BlockSuite 可提供这些 editor runtime 对象：

```text
doc
root block
surface block
note block / edgeless note
frame block
connector element
shape / brush / text / image elements
viewport
selection
```

它们适合成为 Coincides 的 adapter/projection 层：

| BlockSuite 对象 | Coincides 对应 | 判断 |
| --- | --- | --- |
| doc | Note / Project / Canvas editor runtime document | adapter document，不是 Coincides truth |
| root block | editor root | adapter container |
| surface block | canvas runtime surface | 对应 `learning_canvases` 的 editor surface |
| edgeless note | NoteBlock projection | 对应 `canvas_nodes.target_type = note_block` |
| frame block | page/frame projection | 对应 `canvas_frames` 或未来 page frame |
| connector | visual edge | 对应 `canvas_edges` |
| connector bound relation | semantic edge binding | 只能通过 Coincides `object_relations` 表达 |
| displayMode | view visibility hint | 可参考，但不能替代 export intent |
| xywh/index | layout projection | 可同步到 `canvas_nodes` / `canvas_frames` |
| viewport | session/view state | 对应 `canvas_viewport_states` |

关键规则：

```text
BlockSuite id 可以进入 adapter mapping。
Coincides id 必须继续作为 canonical object id。
```

## 3. 最小 sidecar identity map

R11 建议后续工程至少设计一个 editor sidecar mapping 层。它可以是表，也可以先是 runtime adapter record，但必须能表达：

### Editor document mapping

```text
id
user_id
project_id / course_id
note_id
canvas_id
editor_runtime: blocksuite
editor_doc_id
editor_root_id
editor_surface_id
mode: edgeless_as_page / hybrid / page_only / canvas_only
sync_status: synced / pending / stale / conflict / orphaned
metadata
created_at
updated_at
```

### Editor object mapping

```text
id
user_id
project_id / course_id
canvas_id
coincides_object_type:
  note_block
  canvas_node
  canvas_frame
  canvas_edge
  source_scope
  source_anchor
  object_relation
  proposal

coincides_object_id
editor_object_type:
  doc
  root
  surface
  note
  frame
  connector
  shape
  text
  image

editor_object_id
editor_parent_id
adapter_version
last_known_hash
sync_status
metadata
created_at
updated_at
```

### Page membership / export mapping

不能只靠 frame 几何覆盖。还需要：

```text
canvas_page_id
page_frame_editor_id
canvas_node_id
object_export_role
object_export_visibility
object_ai_visibility
internal_page_index
display_page_label
page_membership_status
metadata
```

这层是 Coincides 的，不是 BlockSuite 的。

## 4. Source-grounded NoteBlock 不能被 BlockSuite block 吞掉

如果一个 Coincides NoteBlock 映射为 BlockSuite edgeless note，那么它在编辑器里看上去可能只是一个 note block。但系统层不能这样理解。

一个 source-grounded NoteBlock 至少需要保留：

```text
note_block.id
note_block.block_type / system_type / learning_role
note_block.metadata.template_definition_id
note_block.metadata.template_key
note_block.metadata.domain
note_block_sources
source_anchor_links
source_scope links
proposal provenance
canvas_node placement
editor_object_mapping
```

因此编辑器写回时必须遵守：

```text
编辑内容 -> 更新 Coincides NoteBlock content / metadata 的安全字段
移动缩放 -> 更新 Coincides CanvasNode / CanvasFrame
画线 -> 更新 Coincides CanvasEdge
绑定语义关系 -> 更新 Coincides ObjectRelation
```

不能让 BlockSuite note 的内部 model 成为唯一 source of truth。

## 5. ObjectRelation 必须独立于 connector

BlockSuite connector 很适合视觉连接，但它不能等于 semantic relation。

R11 建议保持三层：

```text
BlockSuite connector
  -> editor visual object

Coincides CanvasEdge
  -> persistent visual/projection object

Coincides ObjectRelation
  -> semantic relation / future graph edge candidate
```

同步规则：

- 创建 connector：可以创建 CanvasEdge。
- connector 没有 target：CanvasEdge 为 incomplete。
- connector 连接两个 node：CanvasEdge 为 visual_only。
- 用户/AI 明确选择 relation type：创建或绑定 ObjectRelation。
- 删除/隐藏 connector：默认只影响 CanvasEdge 或 projection，不直接删除 ObjectRelation。
- ObjectRelation 失效：CanvasEdge 可变为 stale_binding 或 broken_relation。

这能避免“画了一条线就污染知识图谱”。

## 6. Template / Domain / Concept 是能力层，不是 editor block type

BlockSuite 可以有 block spec、flavour、view extension，但 Coincides 不应该把 TemplateDefinition、DomainBlockSet 或未来 Concept 直接退化成 editor block type。

合理关系是：

```text
TemplateDefinition
  -> 决定 NoteBlock 应如何结构化、渲染、被 agent 使用
  -> 可影响 BlockSuite note 的 view / render hints
  -> 不由 BlockSuite 拥有

DomainBlockSet
  -> 决定一组模板/组合模板适合什么领域
  -> 帮助 agent 选择 template / composition / role
  -> 不由 BlockSuite 拥有

Concept
  -> 帮助检索、分类、GraphRAG 和跨笔记联系
  -> 可作为 NoteBlock metadata / edge / tag sidecar
  -> 不由 BlockSuite 拥有
```

也就是说，BlockSuite 负责显示“这是一个公式块、定义块、例题块”的外观和编辑组件；Coincides 负责决定它为什么是这个类型、从哪里来、属于哪个领域、如何被 AI 读取。

## 7. Proposal / OperationBatch 不应进入 editor runtime

Proposal-first 是 Coincides 的核心工程习惯。它保护了用户数据，也保护了后续恢复能力。

如果引入 BlockSuite，也不能让 editor runtime 直接绕过 proposal：

- AI 生成内容：仍创建 proposal。
- AI 生成布局：仍创建 layout proposal 或编辑器 adapter proposal。
- template/domain/source/relation 迁移：仍进入 proposal / record / operation batch。
- 用户在 canvas 手动移动对象：可以直接更新 projection layout，但必须保持 operation/recovery 可追踪。

BlockSuite 自己的 undo/redo 可以作为局部编辑器体验，但 Coincides 仍需要自己的 operation provenance。

## 8. 候选接入方案比较

### A. 改 AFFiNE / BlockSuite block model

判断：

```text
不推荐作为第一路线。
```

优点：

- 理论上可以让 Coincides 对象深度融入 editor。
- UI 层可能更统一。

风险：

- 容易被 BlockSuite 内部模型锁死；
- source/proposal/template/domain/relation 语义会被 editor runtime 牵着走；
- 后续跟随上游更新困难；
- 很难把 Coincides v2.x 已有数据迁移进去；
- 一旦未来图数据库重构，迁移成本更高。

### B. BlockSuite-first sidecar

判断：

```text
当前最推荐。
```

优点：

- 借 BlockSuite 的成熟编辑和画布能力；
- 保留 Coincides 语义主权；
- 便于未来替换 editor runtime；
- 便于 v3.x graph-native 重构；
- 能把 v2.x source/template/domain/relation/proposal 成果保留下来。

风险：

- adapter mapping 和 sync status 需要认真设计；
- 冲突恢复比纯自研更复杂；
- 需要处理 BlockSuite object deletion / duplication / clipboard / import 的映射。

### C. 双写

判断：

```text
只允许有限双写 projection，不允许双写 semantic truth。
```

可接受：

- `xywh` 同步到 BlockSuite note/frame 和 Coincides CanvasNode/CanvasFrame；
- connector 同步到 BlockSuite connector 和 Coincides CanvasEdge；
- viewport 同步到 BlockSuite viewport 和 Coincides viewport state。

不可接受：

- NoteBlock content truth 同时由 BlockSuite 和 Coincides 各自拥有；
- ObjectRelation 同时由 connector 和 Coincides relation table 各自拥有；
- Template/Domain/Concept 同时被 editor block model 和 Coincides runtime 拥有。

双写只适合 projection/cache，不适合 truth。

### D. Import/export bridge

判断：

```text
适合作为迁移、恢复和 fallback，不适合作为日常编辑主线。
```

优点：

- 能避免深度绑定；
- 工程风险较低；
- 适合做实验或导入已有 AFFiNE 文档。

缺点：

- 日常编辑体验割裂；
- 不能实时维护 source/relation/provenance；
- 对 AI-readable substrate 帮助有限。

### E. Coincides-owned fallback

判断：

```text
必须保留 fallback，但不作为第一优先路线。
```

如果 BlockSuite sidecar 在以下方面失败，就回到自研：

- 无法稳定映射 NoteBlock / CanvasNode / CanvasEdge；
- 无法控制 export intent；
- 大文档性能不可接受；
- adapter conflict 过于复杂；
- license 或维护风险不可接受。

## 9. R11 解决的问题

R11 解决了：

1. Coincides 的语义层不应该嵌进 BlockSuite block model。
2. BlockSuite id 只能是 adapter/projection id。
3. NoteBlock、Source、Template、Domain、Relation、Proposal 的 canonical ownership 必须留在 Coincides。
4. CanvasEdge 可以映射 connector，但 ObjectRelation 必须独立。
5. sidecar mapping 是后续采用 BlockSuite 的必要前置，而不是可选优化。
6. 双写只能用于 projection/cache，不能用于 semantic truth。

## 10. 暴露的风险

1. **Adapter orphan 风险**
   用户删除或复制 BlockSuite 对象时，Coincides mapping 可能变成 orphan / duplicate / stale。

2. **Sync conflict 风险**
   内容、布局、connector、frame 同时变化时，需要区分 content conflict、layout conflict、relation conflict。

3. **Export mismatch 风险**
   如果 Coincides export intent 和 BlockSuite displayMode 不一致，导出结果可能不可信。

4. **AI readability 风险**
   AI 不能直接读 editor tree 就以为理解了笔记；必须读 Coincides NoteBlock / Source / Relation / Concept / Template sidecar。

5. **Migration risk**
   v3.x graph-native 重构时，必须迁移 Coincides semantic records，而不是迁移 BlockSuite runtime snapshot 当作 truth。

## 11. 对后续阶段的影响

- R12 必须以 Coincides sidecar 为基础定义 graph-shaped data，而不是从 BlockSuite editor tree 推导知识图谱。
- R12 必须判断 NoteBlock、ObjectRelation、Concept、SourceAnchor、TemplateDefinition、DomainBlockSet 哪些是 graph node / edge candidate。
- R13 比较路线时，BlockSuite-first sidecar 应作为独立路线评分，不应和 full fork 混在一起。
- R13 必须把 adapter/sync/recovery 成本列为 BlockSuite-first sidecar 的主要风险。
- R14 必须把“先做 sidecar spike，再决定是否大规模采用 BlockSuite”写进最终路线。

## 12. 反补前序报告

R11 不需要修改 R0-R10 正文。

但 R11 强化了 R3：

- CanvasNode / CanvasFrame / CanvasEdge 是 projection；
- ObjectRelation 是 semantic edge candidate；
- TemplateDefinition / DomainBlockSet 是 capability node candidate；
- Proposal / OperationBatch 是 operation/provenance；
- 这些不能因为引入 BlockSuite 而改变。

R11 也强化了 R10：

```text
Edgeless-as-page 只有在 sidecar 成立时才成立。
如果 sidecar 设计失败，BlockSuite 的画布能力无法单独解决 Coincides 的产品问题。
```

## R11 结论

Coincides 可以借 BlockSuite 的 Edgeless 作为成熟的画布/编辑 runtime，但必须通过 sidecar 保留自己的语义主权。

推荐下一步路线：

```text
1. 不 full fork AFFiNE。
2. 不深改 PageEditor。
3. 不把 Coincides semantic truth 写进 BlockSuite block model。
4. 设计 BlockSuite Edgeless adapter + Coincides sidecar。
5. 先做小型 spike：
   - 一个 Coincides NoteBlock 投射为 edgeless note；
   - 一个 Coincides CanvasFrame 投射为 page frame；
   - 一个 BlockSuite connector 映射为 CanvasEdge；
   - 一个 CanvasEdge bind 成 ObjectRelation；
   - 保存、关闭、重新打开后 mapping 不丢失；
   - 删除 adapter snapshot 后能从 Coincides records 重建。
```

只有这条链路跑通后，BlockSuite-first / hybrid 才值得进入真正工程路线。
