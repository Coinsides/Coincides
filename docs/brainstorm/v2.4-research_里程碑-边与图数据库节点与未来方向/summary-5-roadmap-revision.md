# Summary 5: Roadmap Revision 与版本切分

**Created**: 2026-05-23
**Status**: Draft for Henry review
**Scope**: v2.4.x, v2.5.x, v2.6+, and v3.x roadmap revision recommendations after Summary 1/2/3/4.

---

## 1. Summary Purpose

这份 summary 是本轮 v2.4 research 的阶段性收束。

它不再重新证明：

- Coincides 为什么不是 AFFiNE clone；
- Canvas 为什么只是 projection；
- ObjectRelation 为什么不等于 CanvasEdge；
- tldraw 为什么只能作为 adapter；
- v3.x 为什么可能走 graph-native。

这些已经在 Summary 1/2/3/4 中完成。

本 summary 的任务是把这些结论压缩成：

```text
roadmap revision recommendations
```

也就是回答：

- v2.4.x 应该怎么拆；
- v2.5.x 应该接什么；
- v2.6+ 应该保留什么远期方向；
- v3.x 之前必须准备什么；
- 哪些内容进 roadmap；
- 哪些内容进 continuity；
- 哪些内容继续留在 brainstorm。

---

## 2. Required Reading Completed

本 summary 写作前已重新阅读以下文件全文：

```text
summary-1-product-direction.md
summary-2-core-differences.md
summary-3-object-model.md
summary-4-engine-adoption.md
relation-layer-extra-ideas.md
v2.4-canvas-engine-and-relation-layer-notes.md
```

---

## 3. Core Recommendation

Roadmap 应该保持一个清晰主线：

```text
v2.4:
  Canvas-first projection foundation
  + selected object scope
  + relation-ready canvas

v2.5:
  Template / package / view / editor infrastructure
  + portable workspace foundation

v2.6+:
  larger source-grounded knowledge operations
  + report / briefing / investigation / AI workbench extensions

v3.x:
  graph-native architecture decision
  + Neo4j candidate evaluation
  + graph migration from v2.x evidence
```

关键不是版本越多越好。

关键是每个小版本只回答一类问题：

```text
v2.4 answers:
  How do source-grounded objects live on a canvas without losing truth?

v2.5 answers:
  How do templates, packages, views, and editor adapters become reusable infrastructure?

v2.6+ answers:
  How do these primitives become broader information operations?

v3.x answers:
  Should the stabilized system become graph-native?
```

---

## 4. Recommended v2.4.x Split

v2.4.x 应该继续围绕：

```text
Canvas-first Learning Document + Relation-ready Projection Track
```

但它不应该试图一次完成成熟工作台。

推荐拆分如下。

### v2.4.0: Canvas-first Document Model + Canvas Data Contract

Purpose:

```text
Lock the model before heavy interaction work.
```

应完成：

- single-surface canvas-first document model；
- finite / infinite canvas settings；
- A4 / Letter / 16:9 / custom canvas presets；
- content / layout / session / projection separation；
- LearningCanvas / CanvasNode / CanvasPreset / CanvasPageSpec concept；
- source-grounded object projection rule；
- ViewPreset / CanvasPreset / ExportPreset vocabulary seed；
- External Tool Gate requirements for canvas engines；
- explicit rule: Canvas is projection, not truth。

不应完成：

- full tldraw integration；
- connector editor；
- ObjectRelation；
- template insertion；
- AI layout proposal；
- full visual redesign。

### v2.4.1: Canvas Engine Gate + Basic Canvas Viewer / Editor

Purpose:

```text
Prove usable canvas interaction without losing data sovereignty.
```

推荐路径：

```text
Primary:
  tldraw adapter spike if External Tool Gate passes.

Fallback:
  lightweight self-built React/CSS canvas viewer/editor.
```

应完成：

- formal Canvas Engine Gate；
- render CanvasNodes from Coincides-owned data；
- pan / zoom / select / move / resize where reasonable；
- save CanvasNode layout to Coincides tables；
- open/jump target object；
- selected object IDs from canvas selection；
- rebuild canvas without engine snapshot；
- keep tldraw / external engine snapshot optional cache / sidecar；
- record license / attribution / data sovereignty findings。

不应完成：

- fork tldraw；
- adopt BlockSuite/AFFiNE；
- replace NoteBlock editor；
- build full connector/relation layer；
- make tldraw store project truth。

### v2.4.2: Template-aware Block Insertion On Canvas

Purpose:

```text
Let users create source-grounded NoteBlocks directly from the canvas surface.
```

应完成：

- create new NoteBlock from canvas；
- choose friendly template labels；
- use v2.1.1 taxonomy:
  - system_type；
  - learning_role；
  - template_id；
  - taxonomy_version；
- create CanvasNode projection for the new block；
- preserve NoteBlock truth outside canvas engine。

不应完成：

- full template editor；
- arbitrary low-level system type creation；
- rich editor replacement；
- full composition template system。

### v2.4.3: Agent Canvas Layout Proposal UX

Purpose:

```text
Make AI layout work proposal-first.
```

应完成：

- AI proposes CanvasNodes / positions / frames / initial layout；
- proposal preview shows affected objects；
- proposal includes warnings / confidence / apply behavior；
- selected SourceBoard / SourceScopes / NoteBlocks can become layout input；
- apply changes layout records only；
- no silent NoteBlock rewrite；
- no silent source/evidence/relation mutation。

重要定位：

```text
AI layout proposal is a proposal over a view,
not direct authorship of truth.
```

### v2.4.4: Canvas Edges + ObjectRelation Seed

Purpose:

```text
Introduce the first real boundary between visual connectors and semantic relations.
```

应完成：

- CanvasEdge seed；
- ObjectRelation seed；
- RelationLayer seed；
- visual-only / incomplete / relation-suggested / relation-backed / stale states；
- optional CanvasEdge -> ObjectRelation binding；
- first relation types:
  - supports；
  - contradicts；
  - read_before；
  - derives_to；
  - uses_formula；
  - example_of；
  - answers；
  - source_supports；
- status / visibility / confidence / provenance；
- AI relation proposal review entry；
- no automatic upgrade from arrow to accepted relation。

工具策略：

- tldraw arrows/bindings may help visible connectors；
- React Flow may be evaluated for relation editor / extracted graph view；
- Cytoscape.js / AntV G6 stay graph-view candidates。

### v2.4.5: Command & Interaction System Seed

Purpose:

```text
Turn canvas selection and relation layers into operation surfaces.
```

应完成：

- Command concept；
- ToolMode；
- InputBinding；
- Context；
- selected object scope；
- relation layer show/hide/switching；
- first AI command context:
  - selected objects；
  - active canvas；
  - active relation layers；
  - operation intent；
  - proposal-first requirement；
- keyboard shortcuts as one input binding, not the whole system。

可选：

- early "explain why connected" command；
- early topic-specific relation view command；
- show AI reading layer in advanced mode。

### v2.4.6: Composition / Section Template Seed If Urgent

Purpose:

```text
Only if canvas work reveals immediate need for reusable sections.
```

可能内容：

- formula sheet section；
- side-note section；
- evidence table；
- report / briefing section；
- proof chain section。

建议：

```text
Do not force v2.4.6 unless v2.4.2-v2.4.5 prove it is urgent.
Otherwise move this into v2.5.
```

---

## 5. Recommended v2.5.x Split

v2.5 不应该只是“模板编辑器”。

它应该成为：

```text
Template + Package + View + Editor Infrastructure Track
```

推荐拆分如下。

### v2.5.0: Template Definition Runtime

应完成：

- TemplateDefinition runtime；
- field schema；
- render hints；
- source_behavior；
- relation_behavior；
- proposal_behavior；
- summary_for_agent；
- compatibility with existing NoteBlocks。

### v2.5.1: User-facing Template Editor Seed

应完成：

- friendly no-code / low-code template editing；
- edit labels, fields, render hints, default content；
- preserve system type boundary；
- proposal-first template migration when existing blocks are affected。

### v2.5.2: Composition Template Editor Seed

应完成：

- reusable section/composition templates；
- formula sheet；
- proof chain；
- evidence table；
- briefing section；
- side-note cluster；
- report segment。

### v2.5.3: Domain Block Set + Package Manifest

应完成：

- DomainBlockSet；
- domain-specific template bundles；
- package manifest seed；
- package metadata；
- template/style/domain pack identity。

### v2.5.4: Template Proposal + Migration Proposal

应完成：

- TemplateProposal；
- CompositionTemplateProposal；
- TemplateMigrationProposal；
- preview/diff；
- warnings；
- apply history；
- no silent migration of old NoteBlocks。

### v2.5.5: Package Studio Lite

应完成：

- `.coincides` package concept seed；
- Light / Trusted / Full package levels；
- export/import preview；
- source inclusion choices；
- package validation warnings；
- engine snapshot as optional sidecar/cache；
- no full marketplace yet。

### v2.5.6: Rich NoteBlock Editor Adapter Spike If Needed

Only if current editor becomes bottleneck.

Candidate tools:

- Tiptap；
- Lexical；
- BlockNote；
- BlockSuite as reference。

Rules:

- adapter spike, not migration；
- preserve NoteBlock identity；
- preserve template metadata；
- preserve source markers；
- preserve selected object scope；
- preserve proposal-first semantic changes。

---

## 6. Recommended v2.6+ Direction

v2.6+ should remain long-range until v2.4/v2.5 are stable.

But roadmap should keep these directions visible because they explain why current architecture must stay broad:

- research dossier；
- source-backed briefing；
- investigation board；
- evidence board；
- AI result board；
- game information guide；
- media/video/audio snapshot；
- presentation/report mode；
- desktop/local-first packaging；
- observable AI workbench surfaces；
- AI operation trace；
- operation strength controls；
- quality monitoring agent；
- source-grounding auditor；
- relation-noise detector；
- broader personal knowledge operations。

Important:

```text
These should grow from source-grounded learning primitives.
They should not replace the learning/source/evidence/relation core.
```

---

## 7. Recommended v3.x Direction

v3.x should remain coarse for now.

Recommended label:

```text
Graph-native Architecture Candidate
```

Current primary candidate:

```text
Neo4j-backed graph-native architecture
```

But v3.x should not be planned as:

```text
rewrite everything into Neo4j
```

It should be:

```text
decide graph-native architecture after v2.x proves the object/relation model.
```

Before v3.x, Coincides must collect:

- durable node candidates；
- durable edge candidates；
- provenance/status/visibility/confidence requirements；
- projection-vs-truth boundaries；
- source/evidence/proposal history requirements；
- AI-readable traversal needs；
- hidden relation layer semantics；
- selected object scope behavior；
- package/import/export requirements；
- external engine cache/sidecar rules。

Recommended pre-3.x transition:

```text
1. Continue SQLite graph-ready design.
2. Create graph-native migration notes register.
3. Add rebuildable graph export/projection.
4. Spike local Neo4j mirror for selected objects/relations.
5. Test Cypher queries for:
   - prerequisite traversal;
   - source-backed relation lookup;
   - topic subgraph extraction;
   - proof chain traversal;
   - AI reading path retrieval.
6. Decide v3.x graph-native architecture.
```

---

## 8. What Should Enter Roadmap

These should be formal roadmap-level items:

- Product direction:
  - source-grounded information workspace；
  - observable AI workbench as long-term identity；
  - graph-ready / future graph-native knowledge operating system。
- v2.4.x patch split from v2.4.0 to v2.4.6。
- Canvas is projection, not truth。
- tldraw adapter spike as v2.4.1 primary candidate, with fallback。
- CanvasEdge / ObjectRelation / RelationLayer separation。
- ViewPreset / CanvasPreset / ExportPreset vocabulary。
- selected object scope as future AI operation entry。
- v2.5 Template + Package + View + Editor infrastructure。
- `.coincides` package direction and Light / Trusted / Full package levels。
- v2.6+ broader knowledge operation directions。
- v3.x graph-native / Neo4j candidate direction。

---

## 9. What Should Enter Continuity

These should be continuity-level because they are cross-version obligations:

- v2.x must preserve graph-native migration evidence for v3.x。
- Create or plan:
  - `docs/continuity/2.x/v2.x-graph-native-migration-notes.md`。
- Each relevant v2.x version should answer graph-native startup/closeout questions。
- AI commands should operate on selectable object scopes where possible。
- AI operations should become observable, reviewable, and strength-controllable over source-grounded object scopes。
- Henry subjective UX acceptance for v2.3.x / early v2.4.x source/canvas surfaces can remain deferred until Canvas / Source Board maturity。
- Package recovery principle:
  - CanvasEdge can degrade；
  - ObjectRelation must not silently disappear；
  - Binding can break；
  - Import must report。

---

## 10. What Should Stay In Brainstorm

These ideas are valuable but should not yet become active roadmap commitments:

- 2.5D / 3D knowledge spaces；
- 3D model-based learning workspace；
- large-wall / projector / gesture interaction；
- full AI quality monitoring agent implementation；
- self-maintenance agent；
- full community package marketplace；
- executable plugin ecosystem；
- public hosted community service；
- complete graph-native schema design before v2.x object evidence is collected；
- final visual design system comparable to AFFiNE before canvas data model stabilizes。

They should remain available as inspiration, but not load active v2.4/v2.5 plans.

---

## 11. Henry Acceptance Deferral Recommendation

Continue deferring heavy subjective UX acceptance until Canvas / Source Board maturity.

Reason:

```text
Before Canvas is real,
Source Snapshot / Source Scope / Source Board / Note editor UX
will be rejudged anyway.
```

Do not block engineering progress on deep visual polish for:

- v2.3.x Source Snapshot；
- SourceAnchor jump-back；
- SourceScope；
- SourceBoard seed；
- early v2.4.0 / v2.4.1 canvas foundation；
- basic proposal review panels。

Still do light validation for:

- feature can be reached；
- data is not lost；
- source trust language is understandable；
- no obviously broken flow；
- proposal-first safety is intact。

Heavy Henry subjective acceptance should resume after:

```text
Canvas foundation + Source Board + basic relation/view behavior
```

are mature enough to judge as a product surface.

---

## 12. Confirmed

- v2.4 should remain Canvas-first, but Canvas must remain projection.
- v2.4.1 should run Canvas Engine Gate before production-like external tool adoption.
- tldraw is the strongest v2.4.1 adapter candidate, not project truth.
- v2.4.4 should be the first real CanvasEdge / ObjectRelation / RelationLayer boundary.
- v2.4.5 should seed command / selected object operations / relation layer switching.
- v2.5 should expand into Template + Package + View + Editor infrastructure.
- v2.6+ should keep broader information operations visible but not urgent.
- v3.x should remain graph-native candidate direction, with Neo4j as serious main candidate.
- v2.x must collect graph-native migration evidence instead of forcing immediate graph DB migration.
- Heavy UX acceptance can remain deferred until Canvas/Source Board maturity.

---

## 13. Open Questions

- Should `v2.4.6` stay as optional composition template patch, or move fully into v2.5?
- Should `ViewPreset` become a real table in v2.4.0 / v2.4.3, or remain conceptual until v2.5?
- Should `SelectedObjectScope` be persisted, or only sent as operation payload in early v2.4?
- Should tldraw snapshot be stored at all in v2.4.1, or only regenerated from Coincides data?
- Should React Flow be introduced in v2.4.4, or wait until relation graph views are more mature?
- Should `.coincides` package Lite begin in v2.5.5, or should only PackageManifest be introduced first?
- Should graph-native migration notes become workflow-mandatory immediately, or after v2.4.1?
- How strongly should observable AI workbench language enter public-facing product positioning?

---

## 14. Final Roadmap Shape

The cleaned-up roadmap shape should look like this:

```text
v2.4.x:
  Canvas-first projection foundation
  relation-ready object model
  selected object operations

v2.5.x:
  template / package / view / editor infrastructure
  portable workspace foundation

v2.6+:
  larger source-grounded knowledge operations
  report / briefing / investigation / AI workbench expansion

v3.x:
  graph-native architecture decision
  Neo4j candidate evaluation
```

The single most important architecture rule:

```text
Coincides owns the knowledge system.
Mature tools help render and operate it.
Adapters protect the boundary.
Packages preserve recoverability.
Graph-native migration waits until v2.x has enough evidence.
```

