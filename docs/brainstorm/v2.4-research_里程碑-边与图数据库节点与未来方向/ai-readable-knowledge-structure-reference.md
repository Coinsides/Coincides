# v2.4 AI-readable Knowledge Structure Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: AI-readable object/relation structure, GraphRAG implications, relation retrieval, hidden relation layers, proposal-first AI mutations, and source-grounded context design.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
AI should not read Coincides only as pages of text.
AI should read Coincides as source-grounded objects plus reviewed relations.
```

如果 AI 只能读：

- flattened note text；
- canvas screenshot；
- raw OCR；
- visual arrow geometry；
- long concatenated page content；

那么 Coincides 的 source/evidence/relation/canvas 结构就浪费了。

Coincides 应该让 AI 优先读取：

```text
NoteBlock
SourceAnchor / SourceScope
EvidenceSet
ObjectRelation
RelationLayer
Proposal history
CanvasNode projection summary
ViewPreset / package metadata later
```

最重要的规则：

```text
AI-readable does not mean AI-owned.
```

AI 可以读取结构、提出结构、解释结构，但不能静默把 suggested relation、visual layout、unreviewed inference 升级成 accepted truth。

---

## 2. Why Plain Text Is Not Enough

普通 RAG 把资料切成 text chunks，再用 embedding 检索。

这对 Coincides 不够。

原因：

- 一份笔记里的结构不只是文字顺序；
- formula / theorem / proof / example 之间的关系可能跨页；
- source evidence 比普通引用更重要；
- user layout 可能表达思路，但不等于真相；
- AI 需要知道哪些关系是 accepted，哪些只是 suggested；
- 同一份内容可能有多个 relation layer / view preset；
- rejected proposal 不应该被当成真相。

GraphRAG 的思路证明：

```text
知识图谱可以补足 naive semantic search，
尤其适合复杂、多跳、跨文档问题。
```

但 Coincides 不应直接照搬 GraphRAG 工具链。

我们要吸收的是：

```text
Use graph-like structure to guide retrieval and reasoning.
Keep source grounding and review state visible.
```

---

## 3. Reference Findings

### 3.1 Microsoft GraphRAG

Microsoft GraphRAG 的关键启发：

- 它把输入语料构造成 knowledge graph；
- query engine 在索引之上运行；
- local search 会结合 AI-extracted knowledge graph 和原始 text chunks；
- 它强调比朴素 text-snippet RAG 更结构化的 retrieval。

对 Coincides 的启发：

```text
AI context should combine:
  graph structure
  source chunks / snapshots
  summaries
  provenance
```

但是 Coincides 的 graph 不应该完全由 AI 抽取。

Coincides 有用户确认过的对象：

- NoteBlock；
- SourceAnchor；
- EvidenceSet；
- accepted ObjectRelation；
- reviewed Proposal。

这些比纯 AI-extracted graph 更可信。

### 3.2 LlamaIndex / LangChain GraphRAG Patterns

LlamaIndex 和 LangChain 的 GraphRAG 文档说明了常见 pattern：

- 从文本中抽取 triplets / graph；
- graph retriever 可以按关键词、embedding、graph traversal 等方式检索；
- query 可以组合 graph relationship 和 raw text；
- graph store 可以和 LLM / embedding 结合。

对 Coincides 的启发：

```text
Relation retrieval can be a first-class retrieval mode.
```

未来 AI 不应该只问：

```text
哪些 text chunks 和问题最相似？
```

还应该问：

```text
这个 NoteBlock 有哪些 prerequisite？
这个 theorem 连到哪些 proof/examples？
这个 source range 支撑哪些 accepted blocks？
这个 topic layer 里有哪些关系？
这条 relation 是 accepted、suggested 还是 stale？
```

### 3.3 Tana

Tana 的关键启发：

- supertag 能把普通节点变成 typed object；
- fields 可以表达结构；
- Tana 文档明确强调信息以 graph 方式存储，并在其上用 supertags/fields 建 schema；
- AI autofill 可以基于 supertag/fields 填 title、field、description。

对 Coincides 的启发：

```text
Template metadata and fields should help AI understand what a NoteBlock is.
```

AI 应该知道：

```text
system_type = latex
learning_role = formula
template_id = formula.math
fields = variables / statement / constraints
source_behavior = requires source anchor
relation_behavior = may derive_to / depends_on / example_of
```

这比让 AI 猜“这段文字看起来像公式”可靠得多。

### 3.4 Anytype

Anytype 的关键启发：

- objects 有 type；
- relations/properties 连接和组织 objects；
- object-type + template 可以形成结构化对象系统。

对 Coincides 的启发：

```text
AI should read object type + relation properties,
not only block body text.
```

例如：

```text
NoteBlock:
  learning_role = theorem
  template_id = theorem.basic

ObjectRelation:
  relation_type = proves
  source_type = user_accepted
```

这种结构能让 AI 更可靠地生成：

- study path；
- proof chain；
- review notes；
- missing example suggestions；
- source-backed report。

### 3.5 Logseq / Obsidian

Logseq 和 Obsidian 的核心启发是：

```text
links and block references create navigable structure.
```

Logseq block references 说明小粒度 block 可以被引用和复用。

Obsidian graph/backlink 说明链接结构可以形成 graph view。

但它们也暴露限制：

- link 不等于 typed relation；
- backlink 不一定有语义；
- visual graph 常常只是“哪些东西连过”；
- unreviewed links 容易噪声化；
- source evidence 通常不是核心结构。

对 Coincides 的启发：

```text
Coincides should not stop at backlink graph.
It needs typed, sourced, status-aware ObjectRelations.
```

---

## 4. AI-readable Layers

Coincides 应该分层给 AI 读取。

### 4.1 Content Layer

```text
NoteBlock
  title / plain_text / content_json
  system_type
  learning_role
  template_id
  taxonomy_version
```

用途：

- basic summarization；
- block-level explanation；
- template-aware rewriting；
- source-backed note proposal。

### 4.2 Source Layer

```text
SourceSnapshot
SourceSnapshotPage
SourceAnchor
SourceScope
SourceMaterial
MaterialSegment
```

用途：

- grounding；
- citation；
- jump-back；
- source range comparison；
- evidence-backed retrieval。

### 4.3 Evidence Layer

```text
EvidenceSet
EvidenceItem
MaterialReconciliationDecision
ConflictReviewItem
ExcludedMaterialScope
```

用途：

- distinguish accepted evidence from raw material；
- avoid excluded source；
- warn on conflicts；
- understand conservative merge history。

### 4.4 Relation Layer

```text
ObjectRelation
RelationLayer
CanvasEdge relation_id
```

用途：

- graph traversal；
- topic-specific extraction；
- proof chain；
- prerequisite chain；
- source-backed relation；
- hidden AI reading path。

### 4.5 Projection Layer

```text
LearningCanvas
CanvasNode
CanvasEdge
ViewPreset
```

用途：

- understand user spatial organization；
- generate layout proposals；
- summarize visible view；
- create presentation/report view。

Important:

```text
Projection layer should influence AI,
but should not override accepted semantic relations.
```

### 4.6 Proposal Layer

```text
Proposal
Proposal status
Proposal warnings
Proposal apply metadata
Rejected / superseded proposal history
```

用途：

- know what AI/user already tried；
- avoid repeating rejected suggestions；
- explain why an object exists；
- preserve audit trail。

---

## 5. Context Priority

AI context should prefer more trusted structure first.

Recommended priority:

```text
1. accepted ObjectRelations
2. source-backed relations
3. accepted NoteBlocks with template metadata
4. EvidenceSets and SourceAnchors
5. active SourceScopes / SourceBoards
6. visible CanvasNode / ViewPreset summaries
7. suggested relations, if explicitly allowed
8. rejected/superseded proposals only as cautionary context
9. raw text chunks as fallback
```

This prevents the system from treating:

- visual proximity as truth；
- dangling arrows as relations；
- rejected proposals as accepted knowledge；
- AI-inferred hidden paths as user-approved structure。

---

## 6. Relation Status And AI Policy

ObjectRelation should have explicit status.

Recommended statuses:

```text
suggested
accepted
rejected
hidden
visible
stale
superseded
archived
```

Recommended visibility:

```text
visible
hidden
ai_only
advanced_only
source_only
```

AI usage policy:

| Status / Visibility | AI May Use? | Notes |
| --- | --- | --- |
| accepted + visible | Yes | Normal graph context |
| accepted + hidden | Yes, with hidden flag | Useful for AI reading order |
| accepted + ai_only | Yes, but never show by default | Advanced/debug surface needed |
| suggested | Only when proposal mode allows | Must be labeled as suggestion |
| rejected | No as truth | May use as cautionary history |
| stale | Low trust | Ask for review or warning |
| archived/superseded | No as active truth | Audit only |

---

## 7. Hidden AI Reading Layers

Hidden AI reading layers are valuable.

Example:

```text
Page 1 concept
  -> Page 3 theorem
  -> Page 5 proof step
```

The user may not want these arrows visible during normal reading, but AI may need them for:

- summarization；
- study path；
- proof chain；
- spaced review generation；
- source-backed briefing；
- detecting gaps。

Rules:

- AI-generated hidden relations start as suggested；
- accepted hidden relations can guide future AI；
- advanced users can inspect/edit them；
- hidden does not mean unaccountable；
- hidden relation layers should be exportable in full `.coincides` packages。

---

## 8. Retrieval Modes

Coincides should eventually support multiple retrieval modes.

### 8.1 Source Retrieval

Question:

```text
Which source ranges are relevant?
```

Uses:

- SourceAnchor；
- SourceScope；
- SourceSnapshotPage；
- MaterialSegment；
- embeddings。

### 8.2 Object Retrieval

Question:

```text
Which NoteBlocks / EvidenceSets / Topics are relevant?
```

Uses:

- NoteBlock metadata；
- learning_role；
- template_id；
- plain_text；
- source-backed status。

### 8.3 Relation Retrieval

Question:

```text
Which accepted relations connect these objects?
```

Uses:

- ObjectRelation；
- RelationLayer；
- relation_type；
- status；
- visibility。

### 8.4 View Retrieval

Question:

```text
Which view/canvas shows the user's intended organization?
```

Uses:

- CanvasNode；
- ViewPreset；
- visible relation layers；
- viewport / frame / group summaries。

### 8.5 Proposal Retrieval

Question:

```text
What has already been proposed, accepted, rejected, or deferred?
```

Uses:

- Proposal history；
- review warnings；
- apply metadata；
- rejected/superseded records。

---

## 9. Proposal-first AI Mutations

AI may propose:

- new NoteBlocks；
- new SourceScopes；
- new EvidenceSets；
- new ObjectRelations；
- new RelationLayers；
- new Canvas layouts；
- new ViewPresets；
- new template mappings。

AI should not silently create accepted truth.

Recommended flow:

```text
AI reads accepted structure
  -> creates proposal
  -> proposal includes source evidence / confidence / warnings
  -> user or system review
  -> apply creates accepted object or relation
  -> proposal history remains traceable
```

This extends the existing v2.1/v2.2 proposal-first rule into v2.4 relation/canvas work.

---

## 10. Data Model Implications

### 10.1 ObjectRelation

ObjectRelation should be AI-readable by design:

```text
object_relations:
  relation_type
  relation_layer_id
  from_target_type
  from_target_id
  to_target_type
  to_target_id
  status
  visibility
  confidence
  source_type
  evidence_set_id
  source_anchor_id nullable
  proposal_id
  created_by
  metadata
```

### 10.2 RelationLayer

RelationLayer should describe purpose:

```text
relation_layers:
  layer_kind:
    user_visible
    ai_reading_order
    source_evidence
    formula_derivation
    topic_specific
    suggested
    template_pattern
```

### 10.3 AI Context Snapshot

Future optimization:

```text
ai_context_snapshots:
  target_type
  target_id
  context_kind
  generated_summary
  relation_digest
  source_digest
  stale_after
  metadata
```

This is not v2.4.1 work. It may become useful when contexts get large.

---

## 11. v2.4 / v2.5 / v3.x Impact

### v2.4.4

Must design ObjectRelation so AI can read it later.

Minimum:

- relation_type；
- status；
- visibility；
- confidence；
- source/proposal linkage；
- target_type / target_id endpoints；
- RelationLayer seed。

### v2.4.5

Command / interaction system should include:

- show AI reading layer；
- hide suggested relations；
- generate relation proposal；
- explain why these blocks are connected；
- extract topic view；
- inspect relation evidence。

### v2.5

Template engine should include:

- `summary_for_agent`；
- relation pattern hints；
- source behavior；
- proposal behavior；
- field descriptions；
- domain tags。

### v3.x

Graph-native migration should preserve:

- accepted relations；
- hidden AI relation layers；
- source-backed relation evidence；
- rejected/superseded relation proposal history；
- object type / template metadata；
- projection summaries。

---

## 12. Open Questions

- Should rejected proposal history be available to AI by default or only in debug/review mode?
- Should hidden AI reading layers be user-visible in a separate advanced panel?
- Should `ai_only` relations be allowed, or should every accepted relation be human-inspectable?
- How should relation confidence decay when source blocks change?
- Should visual proximity on canvas influence retrieval ranking?
- Should relation layers be indexed separately for retrieval?
- Should source evidence be attached to ObjectRelation directly, or through EvidenceSet only?
- Should AI relation generation use deterministic heuristics first, then model suggestions?
- Should relation digest summaries be regenerated after every relation change?

---

## 13. Final Position

Coincides should make AI read:

```text
objects + relations + evidence + proposals + projections
```

not just:

```text
text chunks + screenshots
```

The stable principle:

```text
AI-readable structure is a product advantage.
AI-owned structure is a product risk.
```

Therefore:

```text
v2.x:
  build reviewed, source-grounded, relation-ready structures.

v3.x:
  use those structures to decide graph-native architecture and stronger AI workflows.
```

---

## 14. Human-AI Interaction Meaning

The deeper meaning of AI-readable structure is not just:

```text
AI can read more context.
```

The deeper meaning is:

```text
AI can choose what to read,
what to ignore,
which relation path to follow,
and which object scope to operate on.
```

This turns vague human requests into structured internal reading and action paths.

Example:

```text
User:
  Make this part clearer.

Coincides can translate the request into:
  selected objects
  relevant NoteBlocks
  related SourceAnchors
  accepted ObjectRelations
  active RelationLayers
  nearby CanvasNodes
  proposal constraints
```

This is stronger than simply storing everything in model context or background memory.

Plain context and memory can drift, forget, pollute, or mix accepted and rejected material.

Coincides structure can tell AI:

- what is source truth;
- what is accepted;
- what is suggested;
- what is rejected;
- what is visual-only;
- what is semantic relation;
- what is source-backed;
- what is user-authored;
- what is AI-generated;
- what is currently selected;
- what can be regenerated;
- what should not be directly mutated.

The product advantage is:

```text
Coincides does not win by giving AI a longer memory.
Coincides wins by giving AI a better navigation system.
```

This also supports natural learning-assistant behavior later.

Even if Coincides is not primarily an AI tutor, users will ask questions while reading, reviewing, and reorganizing material. If the system has source-grounded objects and reviewed relations, AI can answer using the user's own material without pretending that unreviewed inference is truth.

---

## 15. Selectable Object Interaction

A major interaction pattern emerges from this structure:

```text
select objects
  -> ask AI
  -> generate proposal
  -> review / apply
```

This is closer to selecting files in a file manager than chatting with a vague assistant.

Users may:

- Ctrl-select several NoteBlocks;
- box-select a region of CanvasNodes;
- select a SourceScope range;
- select a frame / section;
- select a RelationLayer;
- select several relation-backed edges;
- select a generated proposal subset.

Then they can ask AI:

```text
Rewrite only these blocks.
Move these into the right side of the canvas.
Turn these into a formula sheet.
Explain only the selected proof steps.
Generate another version of this selected section.
Make this selected group fit on one A4 page.
Rebuild the relations only inside this frame.
Do not touch anything outside the selected objects.
```

This matters because AI is no longer guessing the scope from natural language alone.

It receives an explicit object set:

```text
selected_object_ids
selected_object_types
active_canvas_id
active_relation_layers
source/evidence context
operation intent
review/apply rules
```

This enables:

- local rewrite;
- local relayout;
- local explanation;
- local extraction;
- local export;
- partial regeneration;
- repeated regeneration without drifting away from the same source objects.

If a user asks for 100 different versions of the same selected section, the system can keep every version grounded in:

```text
the same selected objects
the same source evidence
the same relation constraints
the same operation boundary
```

That is much more reliable than hoping the model remembers the original scope.

Important guardrail:

```text
Selectable object interaction should still be proposal-first for semantic changes.
```

Moving a visual CanvasNode may be a direct layout edit.

But rewriting content, creating relations, changing accepted structure, or generating a new version should go through proposal/review/apply unless Henry explicitly narrows the operation into an allowed direct action.

This pattern is a foundation for:

- AI tutor behavior;
- AI layout assistant;
- AI report/briefing generation;
- AI relation review;
- AI partial regeneration;
- AI template application;
- future graph-native workspace commands.

In short:

```text
NoteBlock is an addressable object.
CanvasNode is a selectable projection.
ObjectRelation is a readable relation.
AI action can operate on a precise selected object set.
```

---

## 16. Sources

- Microsoft GraphRAG project: https://www.microsoft.com/en-us/research/project/graphrag/
- Microsoft GraphRAG documentation: https://microsoft.github.io/graphrag/
- Microsoft GraphRAG query overview: https://microsoft.github.io/graphrag/query/overview/
- LlamaIndex Knowledge Graph RAG Query Engine: https://docs.llamaindex.ai/en/stable/examples/query_engine/knowledge_graph_rag_query_engine/
- LlamaIndex Knowledge Graph Index reference: https://docs.llamaindex.ai/en/v0.10.17/api_reference/indices/kg.html
- LangChain Graph RAG provider docs: https://docs.langchain.com/oss/python/integrations/providers/graph_rag/
- LangChain knowledge graph RAG article: https://www.langchain.com/blog/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs
- Tana Supertags: https://outliner.tana.inc/learn/features/supertags
- Tana Supertags docs: https://outliner.tana.inc/docs/supertags
- Anytype relations/properties: https://doc.anytype.io/anytype-docs/getting-started/types/relations
- Logseq block references: https://discuss.logseq.com/t/the-basics-of-logseq-block-references/8458
- Logseq docs: https://docs.logseq.com/
- Obsidian Canvas: https://obsidian.md/help/plugins/canvas
- RDF Concepts: https://w3c.github.io/rdf-concepts/spec/
