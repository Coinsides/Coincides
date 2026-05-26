# Summary 1: 产品方向与核心定位

**Created**: 2026-05-23
**Status**: Draft for Henry review
**Scope**: Coincides product identity, source/evidence/proposal/relation/view meaning, AI workbench direction, v2.x MVP boundary, and v3.x graph-native direction.

---

## 1. Summary Purpose

这份 summary 用来回答一个最高层问题：

```text
Coincides 到底是什么？
```

它不是普通学习助手，不是 Notion clone，不是 AFFiNE clone，也不是普通白板或 AI chat over files。

本 summary 会直接影响：

- v2.4.x Canvas / Relation 版本边界；
- v2.5.x Template / Package / Editor 边界；
- v2.6+ 更大知识操作扩展方向；
- v3.x graph-native architecture 规划；
- 后续 roadmap revision 和版本 plan 的产品语言。

---

## 2. Required Reading Completed

本 summary 写作前已重新阅读以下 required reading 全文：

```text
relation-layer-extra-ideas.md
knowledge-graph-relation-layer-reference.md
knowledge-graph-relation-layer-reference-2.md
ai-readable-knowledge-structure-reference.md
project-package-portable-workspace-reference.md
multi-view-projection-reference.md
```

并重新对齐已完成 summary：

```text
summary-3-object-model.md
summary-4-engine-adoption.md
summary-2-core-differences.md
docs/Coincides-Roadmap.md
```

---

## 3. Core Thesis

Coincides 从学习系统出发，但它正在成长为：

```text
a source-grounded information workspace
with observable AI operations,
reviewed semantic relations,
multiple projections,
and portable project packages.
```

中文表达：

```text
一个以来源为根基的信息加工中台。
```

更完整一点：

```text
Coincides 是一个把 source、evidence、NoteBlock、relation、view、proposal
组织成可检查、可编辑、可迁移、可被 AI 精准操作的信息工作台。
```

它的起点是学习，因为学习材料天然需要：

- 来源可信；
- 重复材料合并；
- 概念、公式、证明、例题之间有关系；
- 用户需要整理而不只是聊天；
- AI 需要在明确范围内工作。

但这些能力一旦做稳，就不只服务学习。

它也自然支持：

- research dossier；
- source-backed briefing；
- investigation board；
- evidence board；
- game information guide；
- AI result board；
- personal knowledge operation；
- future information-processing hub。

---

## 4. Why It Upgraded Beyond Learning Assistant

早期 Coincides 可以被理解成：

```text
upload learning material
  -> parse/search
  -> ask AI
  -> generate notes
```

但 v2.1 到 v2.4 research 之后，这个理解已经太窄。

真正的系统正在变成：

```text
source material
  -> source snapshot / anchor / scope
  -> evidence / reconciliation
  -> NoteBlock / template
  -> ObjectRelation / RelationLayer
  -> ViewPreset / Canvas / Graph / Report
  -> Proposal / Review / Apply
  -> package / export / AI continuation
```

这条链路说明：

```text
Coincides 不只是生成学习内容。
Coincides 管理信息如何被整理、验证、连接、投影、修改、分享和继续加工。
```

因此它更接近：

```text
information processing workspace
```

而不是：

```text
AI tutor
```

AI tutor 可以作为自然生长出来的功能，但它不是最底层产品身份。

---

## 5. Core Product Objects And Their Meaning

Summary 1 需要把几个核心词的产品意义固定下来。

### 5.1 Source

`Source` 是系统可信度的起点。

它不是普通附件，也不是只给 RAG 用的 chunk。

它承担：

- 原始材料入口；
- source snapshot；
- jump-back；
- package trust；
- AI grounding；
- later source inspection / annotation / media snapshot。

如果没有 Source，Coincides 只是普通笔记或 AI chat。

### 5.2 Evidence

`Evidence` 是系统对来源的审阅结果。

它不是 source 本身，而是：

```text
哪些 source ranges / fragments / segments
被接受为某个内容、关系或判断的证据。
```

它承担：

- material reconciliation；
- accepted evidence set；
- conflict / exclusion / recovery；
- source-backed confidence；
- future graph provenance。

Evidence 让 Coincides 不只是“引用材料”，而是能管理“哪些材料被认为支持什么”。

### 5.3 Proposal

`Proposal` 是 AI 和系统改变结构的入口。

它承担：

- AI note proposal；
- material map proposal；
- reconciliation proposal；
- relation proposal；
- canvas layout proposal；
- template migration proposal；
- future report / package / graph migration proposal。

Proposal 的意义是：

```text
AI may suggest structure.
Coincides must preserve review.
```

这让 AI 能强力参与工作，但不能静默占有事实。

### 5.4 Relation

`Relation` 是意义层。

它不是 Canvas 上的一根线。

它表达：

- definition supports theorem；
- formula derives to formula；
- source supports block；
- concept is prerequisite of exercise；
- AI suggests read-before path；
- Green theorem topic layer contains these objects。

Relation 让系统从“文件和笔记集合”升级成“可导航的知识结构”。

最重要的规则仍然是：

```text
Not every arrow is a relation.
Not every relation needs to be visible as an arrow.
```

### 5.5 View

`View` 是同一批对象的不同观看和操作方式。

它不是复制内容。

它承担：

- page-like reading；
- canvas workspace；
- graph view；
- source inspection；
- presentation/report；
- AI operation view；
- package preview；
- live vs snapshot。

稳定规则：

```text
Objects are truth.
Relations are meaning.
Views are ways of seeing and operating.
Exports are outputs.
Packages are portable workspaces.
```

---

## 6. AI Role

AI 在 Coincides 里不是单纯聊天助手。

更准确的角色是：

```text
source-grounded work executor
```

或者：

```text
proposal-first information operator
```

AI 可以：

- 读取 source-grounded objects；
- 沿着 accepted relations / relation layers 导航；
- 根据 selected object scope 工作；
- 生成 proposal；
- 帮助 layout；
- 建议 relation；
- 解释 proof chain；
- 生成 source-backed briefing；
- 对用户选中的对象局部重写、重排、提取或总结。

AI 不应该：

- 只读一大坨纯文本；
- 只看 canvas screenshot；
- 把视觉距离当真相；
- 静默创建 accepted relation；
- 静默覆盖 source/evidence；
- 把 rejected proposal 当成事实；
- 在范围不明确时全局乱改。

关键原则：

```text
AI-readable does not mean AI-owned.
```

更深一层：

```text
Coincides gives AI a navigation system, not just a memory.
```

这就是 Coincides 和普通 AI chat / RAG 的分水岭。

---

## 7. Observable AI Workbench

本轮 extra ideas 把产品定位又往前推了一步。

Coincides 不只是让 AI 做事。

它应该逐渐成为：

```text
observable AI workbench
```

也就是：

```text
AI 在 source-grounded object scope 上工作，
并留下可观察、可审查、可反馈、可改进的结构化轨迹。
```

未来 AI 工作应记录：

- selected objects；
- read source ranges；
- followed relation layers；
- operation intent；
- operation strength；
- preserve / allow / forbid constraints；
- generated proposal；
- warnings；
- accepted / rejected result；
- user feedback。

这会让 AI 工作变成：

```text
black-box model intelligence
  + white-box workflow governance
```

我们不一定能完全检查模型内部想法。

但我们可以检查和控制：

- 它读了什么；
- 它改了什么；
- 它为什么这么改；
- 它引用了哪些 source；
- 它沿着哪些 relations；
- 它是否越界；
- 它的 proposal 被接受还是拒绝。

这也让未来 quality monitoring agent / self-maintenance agent 成为可能。

---

## 8. Product Identity Stack

Coincides 当前可以被分成几层身份。

### 8.1 Immediate Product

```text
source-grounded learning workspace
```

服务学习材料整理、笔记生成、来源追溯、知识结构化。

### 8.2 v2.x Product Direction

```text
source-grounded information workspace
```

从学习扩展到更宽的信息整理、source board、canvas projection、relation layer、briefing/report seed。

### 8.3 v3.x Candidate Identity

```text
graph-native information processing hub
```

以 Neo4j 或其他 graph-native 架构为严肃候选，支持更强的 relation traversal、AI reading path、topic subgraph、multi-agent information workflow。

### 8.4 Long-term Product Imagination

```text
portable, observable, AI-operable knowledge workspace
```

它既能导出 PDF/HTML/PNG，也能导出 `.coincides` 工程包，让别人继续编辑、检查 source、运行 AI proposal、恢复 relation layers。

---

## 9. v2.x MVP Boundary

v2.x 不需要完成最终形态。

v2.x 的责任是回答核心问题，并建立可用基础。

v2.x 应该完成：

- NoteBlock foundation；
- template-aware NoteBlock seed；
- Course Material Library；
- SourceFragment / MaterialSegment；
- Material Map / Organized Note Proposal；
- reconciliation / EvidenceSet / conflict / recovery；
- Source Snapshot / Anchor / Scope / Source Board；
- Canvas foundation；
- CanvasNode projection；
- ViewPreset / CanvasPreset 概念地基；
- CanvasEdge / ObjectRelation / RelationLayer seed；
- selected object operation seed；
- package/export 设计约束；
- graph-native migration evidence collection。

v2.x 不需要完成：

- final graph-native database migration；
- full mature workspace；
- full presentation/report authoring；
- full package studio ecosystem；
- full domain package marketplace；
- full AI tutor product；
- full quality monitoring agent；
- 2.5D/3D knowledge space；
- cross-course knowledge graph。

一句话：

```text
v2.x does not need to finish the final product shape.
v2.x must finish enough experiments to make v3.x architecture decisions rational.
```

---

## 10. v3.x Boundary

v3.x 的意义不是“继续加功能”。

它更可能是：

```text
architecture hardening phase
```

尤其是：

```text
graph-native architecture transition candidate
```

v3.x 应该在 v2.x 已经收集足够证据后回答：

- 什么是 graph node；
- 什么是 graph edge；
- SourceAnchor 是 node、edge property，还是 provenance object；
- EvidenceSet 是 node、relation bundle，还是两者都是；
- CanvasNode 是否只属于 projection；
- CanvasEdge 和 ObjectRelation 如何映射；
- RelationLayer 是 node、label、subgraph metadata，还是 view object；
- Proposal history 留在 graph、SQL，还是 hybrid；
- `.coincides` package 如何表达 graph-native 数据；
- Neo4j local service / desktop local-first 如何处理。

当前方向：

```text
Neo4j is a serious 3.x graph-native main candidate.
```

但 v2.x 不能为了这个提前失速。

更稳的路径：

```text
v2.x:
  SQLite source of truth
  graph-ready objects and relations
  migration intelligence register

late v2.x / pre-3.x:
  rebuildable graph export / Neo4j mirror spike

v3.x:
  decide graph-native architecture
```

---

## 11. Confirmed

- Coincides 从学习系统出发，但产品方向已经升级为 source-grounded information workspace。
- Learning remains the first durable surface, but the architecture should support broader information work.
- Source 是可信度起点。
- Evidence 是来源审阅结果。
- Proposal 是 AI / system structural change 的 review gate。
- Relation 是意义层，不等于 CanvasEdge。
- View 是同一批对象的观看和操作方式，不是复制内容。
- Package 是可继续工作的工程包，不是普通导出。
- AI 在 Coincides 中是 proposal-first information operator，不是单纯聊天助手。
- AI-readable structure 是产品优势；AI-owned structure 是产品风险。
- v2.x 应继续 SQLite-first but graph-ready。
- v3.x 应把 Neo4j-backed graph-native architecture 作为严肃候选，而不是 v2.4 依赖。

---

## 12. Open Questions

- Summary 1 的产品定位是否应该正式改写 roadmap 的 Product Direction 段落？
- `source-grounded information workspace` 是否要成为英文主定位，还是保留 `Personal Learning Material OS / 学习管家` 作为用户侧表述？
- 什么时候把 `observable AI workbench` 提升为正式 roadmap / continuity 语言？
- `.coincides` package 应该在 v2.5 开始做 Lite，还是等 v2.6+？
- ViewPreset 是否应该在 v2.4.0 spec 中定义，还是只作为 roadmap 概念保留到 v2.4.3 / v2.5？
- v2.x graph-native migration notes 是否应该马上建立 dedicated register？
- AI operation strength / trace / quality-monitoring 是否属于 v2.5+，还是更适合作为 v3.x 之后的工作流产品化？
- 如果未来 AI tutor 自然生长，它应该如何不吞掉 source/evidence/relation workspace 的主方向？

---

## 13. Roadmap Impact

### 13.1 v2.4.x

v2.4.x 应继续围绕：

```text
Canvas-first Learning Document + Relation-ready Projection Track
```

但 Summary 1 进一步强调：

- Canvas 是信息工作台的主要人类操作表面；
- RelationLayer 是 AI 和知识结构的意义层；
- ViewPreset 是多种观看/操作方式的长期基座；
- selected object scope 是未来 AI 操作的关键入口；
- Canvas foundation 不能阻塞未来 `.coincides` package 和 graph-native migration。

### 13.2 v2.5.x

v2.5.x 不只是模板编辑。

它应该承接：

- TemplateDefinition；
- CompositionTemplate；
- DomainBlockSet；
- Package Studio Lite；
- agent-facing template summaries；
- source/relation/proposal behavior；
- package/export/import foundations。

如果 v2.5 不处理 package / template / view 的一部分，v2.4 的 canvas 可能会变成漂亮但不够可迁移的表面。

### 13.3 v2.6+

v2.6+ 可以承接更大知识操作：

- research dossier；
- briefing/report projection；
- investigation board；
- AI result board；
- media snapshot；
- presentation mode；
- desktop/local-first packaging；
- broader personal knowledge operations。

这些不应冲击 v2.4/v2.5，但它们解释了为什么当前架构不能太窄。

### 13.4 v3.x

v3.x 应保持粗粒度方向：

```text
graph-native architecture candidate
```

重点不是现在细分所有版本，而是确保 v2.x 留下足够证据：

- durable node candidates；
- durable edge candidates；
- provenance model；
- projection vs truth；
- AI-readable traversal；
- package/import/export；
- relation status / visibility / confidence；
- proposal history。

---

## 14. Final Position

Coincides 的产品身份不是：

```text
AI tutor
Notion clone
AFFiNE clone
tldraw wrapper
PDF note generator
generic whiteboard
generic graph app
```

它更准确是：

```text
source-grounded information workspace
```

并正在朝向：

```text
observable AI workbench
```

和：

```text
graph-ready / future graph-native knowledge operating system
```

发展。

最短版本：

```text
Coincides turns sources into inspectable objects,
objects into reviewed relations,
relations into multiple views,
views into AI-operable workspaces,
and workspaces into portable packages.
```

这是 Summary 1 对当前产品方向的压缩结论。

