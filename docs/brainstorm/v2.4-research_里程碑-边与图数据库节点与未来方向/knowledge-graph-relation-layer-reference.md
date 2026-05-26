# v2.4 Knowledge Graph / Relation Layer Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Relation Layer, knowledge graph, graph-like views, AI-readable relations, and relation-driven view extraction for v2.4+.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
Coincides 不应该把 Relation 理解成 Canvas 上的线。
Relation 应该是一套独立的、可被人类显示和编辑、也可被 AI 读取的知识结构层。
```

Canvas 仍然重要，但它不是结构核心。Canvas 是人的空间工作台和展示层；Relation Layer / Knowledge Graph 才是机器可读、可抽取、可复用的结构层。

现有产品和工具给出的共同启发是：

- Obsidian Graph 证明了全局图和局部图有价值，但纯链接图容易变成“看起来漂亮但不够可操作”的网络。
- Obsidian Canvas / JSON Canvas 证明了画布可以开放为节点和边的文件格式，但这种格式偏视觉场景，不足以表达 source evidence、accepted relation、AI hidden reading path。
- Tana 的 Supertags 证明了“节点可以被类型化，并以不同视图重新出现”，这对 Coincides 的 topic-specific relation layer 很重要。
- Kumu 证明了专业 mapping 工具会明确区分 elements、connections、maps、views，而且 view 可以通过规则过滤或改变显示。这非常接近 Coincides 的 relation layer / view preset 需求。
- React Flow、Cytoscape.js、Sigma.js、G6 这类库说明“交互流程图”和“图分析/网络可视化”是两类不同技术底座，不能混用。
- Heptabase 证明了 whiteboard 版本和 card 内容版本可以分开保存，这和 Coincides “Canvas layout 不等于 NoteBlock truth” 的原则一致。

推荐方向：

```text
v2.4.4 最小实现：
  relation_layers
  object_relations
  canvas_edges relation_id nullable

v2.4.5:
  Relation Layer 切换 / 显示全部 / 隐藏全部 / focused relation mode

v2.5+:
  topic-specific view extraction
  AI hidden reading layer
  relation-driven review / report / study path generation
```

---

## 2. Why Relation Layer Matters

普通白板或画布工具里的边通常表示：

```text
这个图形和那个图形连起来了
```

Coincides 需要表达的是：

```text
这个 definition 支撑那个 theorem
这个 formula 推导到另一个 formula
这个 source page 支撑这个 note block
这个 concept 是这个 exercise 的前置知识
AI 建议用户按这个顺序阅读
某个主题视图只抽取三角函数相关对象和关系
```

这些不是一条普通视觉线能表达的。它们需要：

- relation type；
- layer；
- visibility；
- source；
- status；
- confidence；
- provenance；
- target object；
- review state。

因此，Relation Layer 不是 Canvas Edge 的样式增强，而是 Coincides 知识结构的基础设施。

---

## 3. Product / Tool Findings

### 3.1 Obsidian Graph

Obsidian 的 Graph View 显示 vault 中笔记之间的链接，Local Graph 则围绕当前笔记显示不同深度的邻近笔记。官方帮助里强调全局图和局部图的区别，以及 local graph 的 depth 控制。

对 Coincides 的启发：

- 全局图适合感知整体结构，但容易变复杂。
- 局部图适合围绕一个对象进行学习或分析。
- depth / filter 是必要功能。
- 仅靠普通链接不够，因为 Coincides 需要 relation type 和 evidence state。

Coincides 不应只做一个全局知识毛线球。更适合做：

```text
Focused Relation View
  从某个 NoteBlock / Concept / Source / Topic 出发
  按 layer 和 relation type 展开
```

### 3.2 Obsidian Canvas / JSON Canvas

Obsidian Canvas 能把 notes、media、web pages 放进无限画布，并支持连接卡片。JSON Canvas 规格定义了 nodes 和 edges：节点有位置和尺寸，边有 from/to node、side、endpoint、label、color 等字段。

对 Coincides 的启发：

- 开放 canvas 文件格式很值得学习。
- Node / Edge 的最小结构非常清晰。
- `file node` 和 `link node` 证明画布节点可以引用外部对象。
- 但 JSON Canvas 的 edge 主要是视觉连接，不足以表达 source-grounded relation lifecycle。

Coincides 可以借鉴 JSON Canvas 的简单性，但不能把 `.coincides` 工程包简化成 JSON Canvas。JSON Canvas 更像导出/互操作格式，而不是 Coincides 的源数据格式。

### 3.3 Tana Supertags

Tana 的 Supertags 把 node 变成 typed object，并通过 fields 和 templates 组织对象。Tana 文档也强调同一个 supertag 的节点可以形成集合，并以表格等视图呈现。

对 Coincides 的启发：

- “节点可以被类型化”很关键。
- Relation Layer 可以像 typed collection 一样被查询和呈现。
- Topic-specific view 可以不是手写笔记，而是对已有对象的查询和投影。
- Tana 的 “content is the tag” 思路提醒我们：relation layer 可以不只是 UI filter，而是 object classification / projection rule。

Coincides 可以吸收这个思想：

```text
relation_layer = 一组关系对象的集合 + 显示规则 + 查询规则 + AI 使用规则
```

### 3.4 Kumu

Kumu 明确区分 elements、connections、loops、maps、views。它的 map 可以记住哪些 elements/connections/loops 被包含，也能记住位置和默认 view。它的 view 是一组规则，可以改变元素和连接的视觉呈现，甚至临时隐藏某些 connection。

对 Coincides 的启发非常大：

- `Map` 接近 Coincides 的 Canvas / extracted view。
- `View` 接近 Coincides 的 relation layer filter / visual preset。
- elements / connections 的分离说明 relation 不应依附于画布线条。
- view rules 可以根据字段过滤关系，这适合 topic-specific layer。

Coincides 可以学习 Kumu 的分层：

```text
ObjectRelation
  关系数据

RelationLayer
  关系集合与用途

ViewPreset
  如何显示这些对象和关系

Canvas
  其中一种空间化呈现
```

### 3.5 Heptabase

Heptabase 的 whiteboard 和 cards 有分离的版本历史：恢复 whiteboard version 主要恢复 layout、sections、text、mindmaps、card positions/colors；card 内容需要使用 card 自己的 version history。

对 Coincides 的启发：

- layout version 和 content version 应该分开。
- Canvas 不应该持有 NoteBlock 真相。
- Relation Layer 也不应该因为 Canvas layout 恢复就随意回滚，除非明确是 relation view snapshot。

Coincides 应该把：

```text
NoteBlock content
Source evidence
ObjectRelation
Canvas layout
View preset
```

分成不同状态和恢复边界。

### 3.6 TheBrain

TheBrain 的核心是 Thought 可以互相链接，并附带 notes、files、web pages。它强调“任何 Thought 可以链接到任何其他 Thought”，这代表一种强连接式个人知识库思路。

对 Coincides 的启发：

- 自由连接非常适合个人知识系统。
- 但 Coincides 需要比“任意连接”多一层类型、来源、审核状态。
- Thought-like graph 对用户友好，但 AI-readable relation 需要更强 schema。

### 3.7 React Flow

React Flow 是交互 flowgraph 库，核心模型就是 nodes connected by edges。它支持自定义 node，也支持从 handle 拖出连接线创建 edge。

对 Coincides 的启发：

- 适合做 connector / handle / node edge editing 的参考。
- 适合 workflow、diagram、relation editing UI。
- 但它偏“流程图编辑”，不是完整 knowledge graph 分析引擎。

React Flow 更可能服务 v2.4.4 的 connector editing，而不是全局 relation analytics。

### 3.8 Cytoscape.js

Cytoscape.js 支持 directed、undirected、mixed、loop、multigraph、compound graph 等多种图模型。它的 core / collection 架构支持过滤、遍历、布局和图操作。

对 Coincides 的启发：

- 如果未来需要真正 graph analysis，Cytoscape.js 这类库比 canvas engine 更合适。
- 它适合 relation layer 的可视化、过滤和分析。
- 但它不适合作为普通笔记 Canvas editor 的主引擎。

### 3.9 Sigma.js / G6

Sigma.js 侧重高性能网络图浏览，官方强调浏览器内 network graph rendering。G6 是图可视化引擎。

对 Coincides 的启发：

- 如果未来关系很多，Graph View 可能需要专门 graph renderer。
- Canvas editor 和 graph viewer 可以分开。
- 不要指望同一个库同时做好自由白板、知识图谱分析、A4 笔记排版。

---

## 4. Coincides Should Separate Four Things

调研后最重要的结论是，Coincides 必须区分四层：

```text
1. Domain Object Layer
   NoteBlock / SourceAnchor / EvidenceSet / Proposal / MaterialSegment

2. Relation Layer
   ObjectRelation / RelationLayer / relation status / relation provenance

3. Projection Layer
   CanvasNode / CanvasEdge / ViewPreset / layout / visibility

4. Rendering Layer
   canvas engine / graph renderer / page renderer / export renderer
```

很多现有工具会把其中两层甚至三层混在一起。Coincides 不能混，因为 source-grounded evidence 和 proposal-first 是核心。

---

## 5. Proposed Concept Model

### 5.1 ObjectRelation

`ObjectRelation` 表示系统可读的真实或候选关系。

概念字段：

```text
id
course_id
relation_layer_id nullable
from_target_type
from_target_id
to_target_type
to_target_id
relation_type
direction
status
visibility
confidence
source_type
source_proposal_id nullable
source_evidence_set_id nullable
metadata
created_at
updated_at
```

候选 `relation_type`：

```text
derives_to
supports
explains
is_example_of
is_definition_of
uses_formula
contradicts
depends_on
read_before
same_concept_as
source_supports
belongs_to_topic
custom
```

候选 `status`：

```text
suggested
accepted
rejected
deferred
stale
superseded
```

候选 `visibility`：

```text
visible
hidden
advanced
ai_only
archived
```

### 5.2 RelationLayer

`RelationLayer` 表示一组关系的用途、显示策略和 AI 使用策略。

概念字段：

```text
id
course_id
canvas_id nullable
note_id nullable
title
layer_kind
status
visibility
owner_type
query_definition
display_rules
ai_usage_policy
metadata
created_at
updated_at
```

候选 `layer_kind`：

```text
user_visible_main
ai_reading_order
source_evidence
formula_derivation
topic_specific
proof_chain
review_path
suggested_relations
custom
```

### 5.3 CanvasEdge

`CanvasEdge` 是 relation 或 visual connector 的画布投影。

概念字段：

```text
id
canvas_id
from_node_id
from_port
to_node_id
to_port
edge_kind
relation_id nullable
relation_status
visual_style
points
label
metadata
```

关键规则：

```text
relation_id = null
  visual-only edge

relation_id != null
  relation-backed edge
```

### 5.4 Relation-driven View

未来可以把某个 relation layer 抽取成一个新 view：

```text
Green theorem layer
  -> extracted graph view
  -> extracted A4 reading view
  -> extracted study path
```

这不是复制原始 NoteBlocks，而是对已有对象和关系的投影。

---

## 6. Relation Layer Types We Should Support Eventually

### 6.1 User-visible Main Layer

用户默认看到的主干关系。

用途：

- block 之间的主要连接；
- proof / formula / concept 的大关系；
- 不显示过多细节。

### 6.2 AI Reading-order Layer

给 AI 使用的隐藏或半隐藏关系层。

用途：

- 标记 AI 应该按什么顺序理解对象；
- 跨页连接相关知识；
- 修正用户排版混乱导致的阅读路径不清。

规则：

- AI 只能 suggested；
- 用户可以接受或修改；
- 默认不在普通阅读视图显示。

### 6.3 Source Evidence Layer

显示 source -> evidence -> block 的支撑关系。

用途：

- 检查可信度；
- 生成 source-backed summary；
- 判断哪些结论缺 evidence。

### 6.4 Formula Derivation Layer

显示公式、推导步骤、证明链条。

用途：

- 数学 / 工程 / 物理学习；
- 生成 step-by-step explanation；
- 检查推导断点。

### 6.5 Topic-specific Layer

围绕某个主题抽取关系。

例子：

```text
trigonometric functions
Green theorem
matrix diagonalization
Fourier transform
```

用途：

- 从长笔记中抽取专题视图；
- 生成复习路线；
- 生成专题报告。

### 6.6 Suggested Relation Layer

AI 或系统建议但未接受的关系层。

用途：

- relation proposal review；
- 用户批量接受、拒绝、隐藏、转可见。

---

## 7. Query / Extraction Scenarios

### 7.1 Topic Extraction

用户问题：

```text
显示这份 50 页数学笔记里所有和三角函数有关的知识点。
```

系统行为：

```text
1. 查询 topic-specific relation layer；
2. 找到相关 ObjectRelations；
3. 收集 from/to target objects；
4. 生成 extracted view；
5. 保留 source references；
6. 可选择生成 A4 reading view 或 graph view。
```

### 7.2 AI Reading Path

用户笔记排版混乱，但 AI 识别出：

```text
Page 1 definition
  -> Page 3 formula
  -> Page 7 proof step
```

系统行为：

```text
1. AI 提出 ai_reading_order relation proposal；
2. 用户接受或修改；
3. 以后 AI 整理笔记时读取 accepted relation；
4. 普通用户视图默认不显示这条隐藏关系。
```

### 7.3 Source-backed Confidence View

用户想检查：

```text
哪些 NoteBlocks 有 source 支撑？
哪些没有？
```

系统行为：

```text
1. 使用 source_evidence layer；
2. 高亮有 source support 的 blocks；
3. 标记 missing evidence；
4. 允许跳回 source snapshot。
```

---

## 8. Graph Database Question

现在不建议引入 graph database。

原因：

- 当前关系规模还不确定；
- SQLite + relational tables 足够表达第一版 graph；
- v2.x 需要保持本地开发简单；
- graph database 会增加部署、迁移、测试复杂度。

但应避免把 schema 设计死。

建议：

```text
v2.4.4:
  relational ObjectRelation tables

v2.5+:
  if relation queries become complex, evaluate graph index / embedded graph engine / external graph DB
```

---

## 9. Design Implications For Coincides

### v2.4.1

需要在 spec 里预留：

- relation layer 概念；
- canvas edge relation_id nullable；
- visual-only vs relation-backed；
- AI suggested relation 不直接 apply；
- canvas engine 不拥有 relation truth。

不建议在 v2.4.1 实现完整 relation layer。

### v2.4.4

建议实现第一版：

- `relation_layers`
- `object_relations`
- relation-backed `canvas_edges`
- suggested / accepted / hidden / visible 状态；
- source evidence relation；
- basic UI layer toggle。

### v2.4.5

建议实现：

- Relation Layer panel；
- show all / hide all；
- show layer；
- filter by relation type；
- basic command shortcuts；
- AI relation proposal review entry。

### v2.5+

建议实现：

- topic-specific extracted views；
- AI reading-order hidden layer；
- relation-driven study path；
- relation-driven report view；
- package export of relation layers。

---

## 10. Recommended Minimum Schema Direction

第一版可以是：

```text
relation_layers
object_relations
canvas_edges.relation_id nullable
```

先不做：

- graph database；
- micro field-level relation；
- full ontology；
- automatic topic extraction；
- advanced graph layout；
- cross-course knowledge graph。

这样既能保留方向，又不会压爆 v2.4.4。

---

## 11. Research Gaps For Report 2

这篇报告主要是结构和产品机制。下一篇如果继续深入，应重点研究：

- GraphRAG / AI-readable graph 如何进入 retrieval；
- typed relation ontology 怎么设计；
- topic-specific subgraph extraction 算法；
- relation proposal 的 review/apply UX；
- 是否有开源工具专门适合 relation layer / subgraph extraction；
- 知识图谱 package 如何和 `.coincides` 工程包结合。

---

## 12. Sources

- Obsidian Graph View: https://obsidian.md/help/Plugins/Graph%2Bview
- Obsidian Canvas: https://obsidian.md/help/plugins/canvas
- JSON Canvas Spec: https://jsoncanvas.org/spec/1.0/
- Tana Supertags: https://outliner.tana.inc/learn/features/supertags
- Kumu architecture: https://docs.kumu.io/overview/kumus-architecture
- Kumu share/embed maps: https://docs.kumu.io/guides/share-and-embed
- Heptabase version history: https://support.heptabase.com/en/articles/10448124-how-to-restore-cards-and-whiteboards-from-version-history
- TheBrain getting started: https://help.thebrain.com/androidtablet/gettingstarted.html
- React Flow concepts: https://reactflow.dev/docs/concepts/introduction
- Cytoscape.js documentation: https://js.cytoscape.org/index.html
- Sigma.js: https://www.sigmajs.org/
- AntV G6 introduction: https://g6.antv.antgroup.com/en/manual/introduction/

