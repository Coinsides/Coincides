# v2.4 Relation Layer Research Extra Ideas

**Created**: 2026-05-22
**Status**: Extra ideas from v2.4 Knowledge Graph / Relation Layer research
**Source Reports**:

- `docs/brainstorm/v2.4-research/knowledge-graph-relation-layer-reference.md`
- `docs/brainstorm/v2.4-research/knowledge-graph-relation-layer-reference-2.md`
- `docs/brainstorm/v2.4-research/canvas-engine-reference.md`

---

## 1. Core Extra Idea

The first two Relation Layer research reports clarified a major long-term direction:

```text
v2.x should be treated as a graph-ready MVP phase.
v3.x may become the graph-native architecture transition.
```

This does not mean v2.x should immediately rewrite the product around a graph database. It means v2.x should deliberately collect the object, relation, projection, provenance, and migration evidence needed for a safer v3.x graph-native rebuild.

The key concern:

```text
If graph-native migration is postponed until the product is mature,
but v2.x does not collect migration evidence,
then v3.x will require archaeology through scattered tables, reviews, and chat history.
```

The desired outcome:

```text
When v3.x begins, Coincides should already have a structured migration intelligence register.
```

---

## 2. Strategic Decision

Current strategic direction:

```text
Do not switch the v2.x primary database to a graph database immediately.
Do design v2.x objects and relations as graph-ready.
Do consider a rebuildable graph index / graph mirror before or during v3.x planning.
Do make v3.x graph-native migration a long-term continuity item.
```

Reasoning:

- v2.x object model is still evolving.
- SQLite remains useful for rapid local-first MVP development.
- Many current objects are still relational/document-like, not purely graph-native.
- A graph database rewrite now would likely slow v2.4 and v2.5 too much.
- But relation layers, topic-specific views, AI reading paths, package export, and future knowledge workspace features strongly suggest that graph-native architecture may become correct in v3.x.

---

## 3. Documents To Add Or Update Later

When promoted from brainstorm into the formal workflow, update these files:

```text
docs/Coincides-Roadmap.md
docs/continuity/Coincides-Continuity.md
docs/continuity/2.x/v2.x-continuity.md
docs/workflow/Coincides-Workflow.md
```

Add new dedicated register:

```text
docs/continuity/2.x/v2.x-graph-native-migration-notes.md
```

Recommended responsibilities:

### Roadmap

Add a long-term architecture section:

```text
v2.x:
  graph-ready MVP phase

v3.x:
  graph-native architecture transition candidate
```

Roadmap should not lock a specific graph database yet. It should state that v3.x should evaluate graph-native architecture once the v2.x object/relation model stabilizes.

### General Continuity

Add a project-level item, for example:

```text
GC-006: v2.x should preserve graph-native migration evidence for v3.x
```

Purpose:

- record the long-term architecture principle;
- survive across major versions;
- link to v2.x execution item;
- prevent future context loss.

### v2.x Continuity

Add a major-version execution item, for example:

```text
V2X-018: v2.x versions must update graph-native migration notes when relevant
```

Purpose:

- make the v2.x execution requirement visible;
- ensure every relevant v2.x version contributes to migration evidence;
- link to the dedicated register.

### Workflow

Add a lightweight closeout rule:

```text
During v2.x version closeout, Codex must inspect whether the version produced graph-native migration evidence.
If yes, update docs/continuity/2.x/v2.x-graph-native-migration-notes.md.
If no, briefly note no material graph-native migration change in the active review or checklist.
```

---

## 4. Dedicated Migration Intelligence Register

Recommended file:

```text
docs/continuity/2.x/v2.x-graph-native-migration-notes.md
```

Purpose:

This file should collect per-version learnings that will help a future v3.x graph-native transition.

It is not:

- a development log;
- a changelog;
- a replacement for version review files;
- a graph database implementation plan.

It is:

```text
a migration intelligence register.
```

It should answer:

- What future graph nodes emerged?
- What future edges or relations emerged?
- Which objects are truth vs projection?
- Which data needs provenance, status, visibility, confidence, or source evidence?
- Which AI-readable structures emerged?
- Which package/export implications emerged?
- Which future migration risks appeared?
- Which 3.x design questions should be preserved?

---

## 5. Recommended Per-version Entry Format

Each relevant v2.x version should add an entry:

```md
## v2.X.Y

### Source Files

- `docs/releases/v2.X.Y-plan.md`
- `docs/releases/v2.X.Y-engineering-spec.md`
- `docs/releases/v2.X.Y-review.md`
- `docs/releases/v2.X.Y-experience-review.md`
- related migrations / services / docs

### Future Node Candidates

- ...

### Future Edge / Relation Candidates

- ...

### Projection vs Truth Boundary

- ...

### Provenance / Status / Visibility Notes

- ...

### AI-readable Structure Notes

- ...

### Package / Export Implications

- ...

### Migration Risks

- ...

### 3.x Design Questions

- ...

### Resolution / Later Decision

- Pending / promoted / resolved / superseded.
```

This format can be shortened when a version has little graph relevance.

---

## 6. Startup Questions For Each Version

At the start of a v2.x version, Codex should ask:

```text
1. Does this version introduce a new durable object that may become a graph node?
2. Does this version introduce a new relationship that may become a graph edge?
3. Does this version create projection data that must stay separate from truth data?
4. Does this version affect source evidence, proposal state, relation state, or AI-readable structure?
5. Does this version affect future .coincides package/export needs?
6. Does the active version plan require a custom migration question set beyond the standard template?
```

The answer should shape the version's engineering spec and test matrix.

---

## 7. Closeout Questions For Each Version

At the end of a v2.x version, Codex should answer:

```text
1. What new future node candidates did this version add?
2. What new future edge/relation candidates did this version add?
3. Did any relationship remain scattered in local tables instead of a unified relation layer?
4. Did the version clarify any projection-vs-truth boundary?
5. Did the version add any provenance, status, visibility, confidence, or review-state requirements?
6. Did the version create AI-readable structure or AI traversal needs?
7. Did the version add package/export implications?
8. Did the version introduce migration risks for v3.x?
9. Which decisions should be promoted to roadmap, continuity, ADR, or future plans?
10. Which questions should remain open for v3.x graph-native planning?
```

If the version has no material graph-native impact, record that briefly.

---

## 8. Version-specific Question Sets

The standard questions should not be used mechanically.

At the start of each version, Codex should inspect the active version plan and decide whether to add version-specific questions.

Examples:

### Canvas Version

Additional questions:

- Is this object a domain object, projection object, or renderer cache?
- Can external canvas engine data be rebuilt from Coincides data?
- Does this canvas edge represent a visual connector or semantic relation?
- Does layout state need to migrate to graph-native architecture?

### Relation Version

Additional questions:

- Which relation types became stable?
- Which relation layers are persistent vs generated?
- Which relations are visible, hidden, AI-only, or suggested?
- Should this relation become ObjectRelation or remain local metadata?

### Template Version

Additional questions:

- Is a template a graph node, schema node, package object, or renderer rule?
- Can templates define relation patterns?
- Do templates affect package/export/import?

### Source Version

Additional questions:

- Is SourceAnchor a node, edge, or evidence property in graph-native architecture?
- How should source provenance migrate?
- Can source snapshots be packed and reconstructed?

### Proposal Version

Additional questions:

- Is Proposal a graph mutation transaction?
- Which proposed objects become nodes or edges after apply?
- How should rejected/superseded proposals be represented?

---

## 9. Early v2.x Backfill Candidates

When the dedicated register is created, consider backfilling these already-created v2.x concepts:

```text
v2.0:
  NoteBlock
  Note
  NoteBlockSource
  ProjectionSnapshot

v2.1:
  SourceMaterial
  SourceFragment
  MaterialSegment
  MaterialMapProposal
  OrganizedNoteProposal

v2.2:
  MaterialReconciliationProposal
  EvidenceSet
  EvidenceItem
  ExcludedMaterialScope
  ConflictReviewItem
  RecoveryEvent
  role-aware reconciliation hints

v2.3:
  SourceSnapshot
  SourceSnapshotPage
  SourceAnchor
  SourceScope
  SourceBoard
  SourceBoardNode
  Source Annotation / Media Snapshot future contracts

v2.4:
  LearningCanvas
  CanvasNode
  CanvasEdge
  CanvasFrame
  CanvasViewportState
  RelationLayer
  ObjectRelation
  ViewPreset
```

Backfill does not need to be perfect, but it should give v3.x a map of how v2.x concepts evolved.

---

## 10. Relationship To Graph Database Decision

This extra idea does not decide:

```text
Use Neo4j
Use Kuzu
Use Apache AGE
Use SQLite only
```

Instead, it decides:

```text
v2.x must preserve enough structure that v3.x can choose graph-native architecture rationally.
```

Current working hypothesis:

```text
v2.x:
  SQLite source of truth
  graph-ready schema
  possible rebuildable graph index later

v3.x:
  evaluate graph-native architecture based on accumulated migration notes
```

---

## 11. Why This Matters

Without this system, v3.x migration could require guessing:

- which v2.x tables are future nodes;
- which links are future edges;
- which canvas objects are projections;
- which source/evidence links are provenance;
- which AI proposals changed truth;
- which views are just layout;
- which objects must survive package/export.

With this system, v3.x can start from a structured migration map rather than a pile of historical implementation details.

---

## 12. Recommended Next Step

Before promoting this into workflow:

1. Henry reviews this extra idea.
2. If accepted, add:
   - roadmap long-term architecture note;
   - `GC-006`;
   - `V2X-018`;
   - `docs/continuity/2.x/v2.x-graph-native-migration-notes.md`;
   - workflow closeout rule.
3. Backfill v2.0-v2.4 concepts at a lightweight level.

---

## 13. Canvas Workspace / Presentation Layer Boundary

The Canvas Engine research clarified another long-term direction:

```text
v2.x should build a usable Canvas foundation.
v3.x may mature Canvas into a full Workspace / Presentation Layer.
```

This does not mean v2.x should avoid Canvas, workspace, or presentation features.

It means v2.x should implement the minimum durable foundation:

- create and open a canvas;
- place NoteBlocks, SourceScopes, SourceBoard items, and future Relation objects on it;
- pan, zoom, select, move, resize, and save layout;
- support page-like presets such as A4 and larger board presets;
- keep canvas layout separate from knowledge truth;
- allow source-grounded objects to jump back to their source;
- prepare export / package requirements without making export perfect yet;
- prove that external canvas engine state can be rebuilt from Coincides data.

v2.x can therefore include early workspace and presentation surfaces, but they should stay foundation-level:

```text
workspace = usable spatial working area
presentation = basic readable / shareable layout preset
not yet = full mature authoring, package, report, animation, or public presentation system
```

The reason mature Workspace / Presentation Layer is better treated as v3.x is not only the graph database question.

The deeper reason is dependency order:

```text
Mature workspace depends on stable object model.
Mature presentation depends on stable view/preset model.
Mature AI layout depends on stable relation model.
Mature package/export depends on stable source/provenance model.
Graph-native migration may change how these objects and relations are stored.
```

If v2.x overbuilds final workspace/presentation behavior before these models stabilize, v3.x may need to rewrite too much UI and package logic.

Recommended boundary:

```text
v2.x:
  Canvas foundation
  basic workspace interaction
  basic page-like / board-like presets
  relation-ready layout data
  source-grounded jump-back
  rebuildable projection

v3.x:
  graph-native workspace
  mature relation-layer visualization
  topic-specific extracted views
  presentation / report authoring
  stronger package import/export
  style/template package ecosystem
```

Important note:

```text
Canvas is still a core 2.x feature.
Mature Canvas-as-workspace is a 3.x expansion candidate.
```

This should prevent the mistaken interpretation that v2.x is only research or that Canvas should wait until v3.x.

---

## 14. What v2.x Must Answer Before v3.x

v2.x should be treated as the stage that answers the core product-architecture questions before v3.x hardens the system.

This is broader than Canvas and broader than graph database migration.

By the end of v2.x, Coincides should have enough evidence to answer:

- What are the durable knowledge objects?
- What are the durable source objects?
- What are the durable proposal / review objects?
- What are the durable canvas / projection objects?
- What are the durable relation objects?
- Which objects are truth, and which objects are projections?
- Which relationships are visual only?
- Which relationships are semantic / AI-readable?
- Which relationships are source-backed?
- Which relationships are user-authored, AI-suggested, accepted, hidden, or stale?
- How should NoteBlock, SourceAnchor, EvidenceSet, SourceBoard, CanvasNode, CanvasEdge, RelationLayer, and ObjectRelation fit together?
- What must AI be able to read from database structure instead of guessing from visual layout?
- What must remain proposal-first and review-gated?
- What must be portable in a future `.coincides` project package?
- What must be exportable as PDF / HTML / PNG / presentation?
- What can be rebuilt from source data?
- What cannot be safely rebuilt and must be preserved?
- Which external engine data can be treated as cache?
- Which external engine data must never become the only source of truth?
- Which parts of the UI are MVP surfaces, and which are future mature workspace surfaces?
- Which parts of the system become graph-native candidates for v3.x?

These questions should continue to grow as the v2.4 research continues.

Later, when promoted into the formal continuity system, the most durable version of this list should live in:

```text
docs/continuity/2.x/v2.x-continuity.md
```

or a dedicated v2.x graph / architecture migration register if the list becomes too large.

The important principle:

```text
v2.x does not need to finish the final product shape.
v2.x must finish enough experiments to make v3.x architecture decisions rational.
```

---

## 15. AI-readable Structure As Human-AI Interaction Layer

The AI-readable knowledge structure research clarified another major idea:

```text
AI-readable structure is not only about giving AI more context.
It is about giving AI the ability to choose what to read and what to operate on.
```

This should be treated as a human-AI interaction principle.

Users usually express fuzzy requests:

```text
Make this clearer.
Rebuild this section.
Move these ideas somewhere else.
Explain this formula.
Only touch these selected blocks.
Generate another version.
```

Coincides can make those fuzzy requests precise by translating them into:

- selected NoteBlocks;
- selected CanvasNodes;
- selected SourceScopes;
- selected RelationLayers;
- accepted ObjectRelations;
- source/evidence context;
- operation intent;
- proposal/review/apply constraints.

This is stronger than relying on model context or background memory.

Model context may forget or mix states. Coincides structure can preserve:

- source truth;
- accepted vs suggested vs rejected state;
- visual-only vs semantic relation;
- user-authored vs AI-generated objects;
- selected object scope;
- rewrite / relayout / explain / extract intent;
- objects that can be changed vs objects that must remain fixed.

The key advantage:

```text
Coincides gives AI a navigation system, not just a memory.
```

This idea also creates a future interaction pattern:

```text
select objects
  -> ask AI
  -> generate proposal
  -> review / apply
```

Examples:

- Ctrl-select several NoteBlocks and ask AI to rewrite only those blocks.
- Box-select a group of CanvasNodes and ask AI to arrange them into one A4 page.
- Select a frame and ask AI to regenerate that section as a formula sheet.
- Select a relation layer and ask AI to explain the proof chain.
- Select source scopes and ask AI to produce a source-backed briefing.

This should influence later v2.4/v2.5 planning:

- Canvas selection should return stable object IDs, not just screen coordinates.
- AI commands should accept explicit selected object scopes.
- AI mutations over selected objects should remain proposal-first.
- Repeated regeneration should reuse the same selected objects and source constraints to avoid drift.
- AI tutor behavior can grow naturally from this layer, but it does not need to become the immediate product focus.

Possible future continuity promotion:

```text
V2X-019: AI commands should operate on selectable object scopes rather than vague page text whenever possible.
```

This may also become a v3.x graph-native interaction principle.

---

## 16. Observable AI Workbench / AI Work Governance

The discussion after the AI-readable structure research clarified a broader long-term idea:

```text
The hard problem is not only letting AI do things.
The hard problem is controlling how AI does things, how strongly it does them, and how other agents can observe and improve the process.
```

Many tools already make it convenient for AI to act.

Coincides should aim for something deeper:

```text
observable, reviewable, adjustable AI work over source-grounded objects.
```

### Action Strength / Operation Granularity

User requests often hide an unstated "strength" or "力度":

```text
Rewrite this.
Make this clearer.
Reorganize this.
Generate another version.
Move these ideas.
Explain this proof.
```

Each request may mean very different operation levels:

- light grammar cleanup;
- wording clarification;
- structure-preserving rewrite;
- conceptual reorganization;
- add examples;
- add source-backed explanation;
- compress into one page;
- turn into formula sheet;
- turn into presentation/report;
- full regeneration.

Today these levels are hard to quantify.

But Coincides can make them more controllable by structuring the operation:

```text
scope:
  selected objects / source scopes / relation layers

operation:
  rewrite / relayout / explain / extract / compare / regenerate

strength:
  light / medium / strong / full rebuild

preserve:
  source text / formulas / order / relation layer / user-authored blocks

allow:
  add examples / create relations / move layout / split blocks

forbid:
  delete source / rewrite accepted quote / alter locked relation

review:
  direct layout edit / proposal-first semantic mutation
```

This is not immediate v2.4 implementation work, but it should influence future AI command design.

### Observability For Humans And Agents

AI work should leave structured traces:

- what objects were selected;
- what source ranges were read;
- what relation layers were followed;
- what evidence was used;
- what was ignored;
- what operation was requested;
- what strength was used;
- what proposal was generated;
- what changed;
- what warnings appeared;
- what the user accepted;
- what the user rejected;
- what feedback the user gave.

This makes AI work observable not only to humans, but also to other agents.

### Quality Monitoring Agent

Future quality agents could inspect these traces and ask:

- Why did the user reject this proposal?
- Did the AI choose the wrong scope?
- Did it follow irrelevant relations?
- Was the operation too strong?
- Was the template inappropriate?
- Was source evidence missing?
- Was the output visually poor?
- Did the same failure repeat across versions?
- Should a new template, relation type, or UI control be added?

This creates a possible improvement loop:

```text
AI performs work
  -> structured traces are recorded
  -> user feedback is captured
  -> quality agent summarizes failure patterns
  -> product/architecture suggestions are generated
  -> coding agent or human implements changes
  -> next version is reviewed
```

This mirrors the current external workflow:

```text
plan checklist
quality review
experience review
continuity
Henry feedback
```

but moves a similar idea into the product's own AI work system.

### Black-box Intelligence, White-box Workflow

The model's internal intelligence will remain partly black-box.

Coincides can still make the surrounding workflow controllable:

- control what AI can read;
- control what AI can mutate;
- require source grounding;
- require proposal-first for semantic changes;
- preserve selected object scope;
- track relation layers used;
- record warnings and confidence;
- keep accepted/rejected history;
- make failure patterns inspectable.

The key principle:

```text
We may not fully inspect the model's thoughts.
We can inspect and govern its inputs, outputs, scopes, actions, evidence, and review trail.
```

### Long-term Direction

This suggests a long-term product identity:

```text
Coincides as an observable AI workbench.
```

or:

```text
a source-grounded information processing system
with controllable AI operations and agent-observable workflows.
```

Potential future features:

- AI operation strength controls;
- AI action trace panel;
- proposal diff / object diff;
- feedback reason capture;
- quality monitoring agent;
- self-maintenance agent;
- relation-noise detector;
- template-fit evaluator;
- source-grounding auditor;
- repeated-regeneration stability checks.

Possible future continuity promotion:

```text
V2X-020: AI operations should become observable, reviewable, and strength-controllable over source-grounded object scopes.
```

This idea likely belongs beyond v2.4, but v2.4 and v2.5 should avoid designs that make it impossible.

---

## 17. Neo4j As 3.x Graph-native Main Candidate

The graph database discussion clarified a stronger long-term direction:

```text
Neo4j is a realistic 3.x graph-native main candidate.
```

The reason is not that Coincides needs a graph database immediately.

The reason is that Henry's long-term vision for Coincides is moving beyond a small local note app:

```text
Coincides may become an important information-processing hub
inside a broader AI ecosystem.
```

In that context, Neo4j's strengths matter:

- mature ecosystem;
- Cypher query language;
- graph tooling;
- graph algorithms;
- visualization/community examples;
- service-oriented deployment path;
- better fit for future multi-agent / information hub scenarios.

This shifts the long-term working hypothesis:

```text
v2.x:
  SQLite remains source of truth.
  Build graph-ready semantics.
  Collect migration evidence.

late v2.x or pre-3.x:
  run Neo4j graph mirror / graph index spike.

v3.x:
  evaluate Neo4j-backed graph-native architecture as the main path.
```

Kuzu or embedded graph options can remain local-first alternatives, but Neo4j should now be treated as a serious primary candidate, not merely a distant option.

### Why Not Migrate Immediately

The key blocker is not installation.

Neo4j can run locally as a local service, and can later run as a service database.

The real blocker is model clarity:

```text
We have not yet fully decided what becomes a graph node,
what becomes a graph edge,
what remains relational/business data,
what remains projection/cache,
and how source/evidence/proposal history maps into graph form.
```

Current SQLite development is not wasted.

It is functioning as:

```text
a graph-ready semantic prototype.
```

In v2.x, SQLite lets Coincides discover:

- durable object candidates;
- durable relation candidates;
- source/provenance structure;
- proposal/review lifecycle;
- projection-vs-truth boundaries;
- AI-readable layer requirements;
- package/export constraints.

Only after these become clearer should Neo4j become the core graph layer.

### Questions To Answer Before Neo4j Migration

Before any serious Neo4j migration, Coincides must answer:

- Is `NoteBlock` a graph node, or should `KnowledgeObject` become the graph node?
- Is `SourceAnchor` a node, edge property, or provenance object?
- Is `EvidenceSet` a node, relation bundle, or both?
- Is `CanvasNode` a node in the knowledge graph, or only a projection object?
- Is `CanvasEdge` stored in Neo4j, or only `ObjectRelation`?
- Are `RelationLayer`s graph nodes, labels, relationship properties, or subgraph metadata?
- How should accepted/suggested/rejected/stale relation states map to Neo4j?
- How should hidden AI reading layers map to graph queries?
- Should proposal history live in Neo4j or remain in SQL with graph references?
- Which tables remain SQL even after graph-native migration?
- How should `.coincides` packages export/import Neo4j-backed graph data?
- How should local Neo4j service setup be managed for desktop/local-first use?

These questions should guide v2.x graph-native migration notes.

### Recommended Transition Strategy

Do not jump directly from SQLite to Neo4j as the sole database.

Recommended path:

```text
Step 1:
  Continue SQLite graph-ready object/relation design.

Step 2:
  Add a rebuildable graph projection/export from SQLite objects.

Step 3:
  Mirror selected objects and relations into local Neo4j.

Step 4:
  Run Cypher queries:
    prerequisite traversal
    source-backed relation lookup
    topic subgraph extraction
    proof chain traversal
    AI reading path retrieval

Step 5:
  Compare Neo4j developer experience and query power against SQLite relation tables.

Step 6:
  Decide v3.x graph-native architecture.
```

This keeps the direction ambitious without making v2.x brittle.

### Future Continuity Candidate

Possible future continuity item:

```text
V2X-021: Treat Neo4j as the main 3.x graph-native candidate while using v2.x to answer node/edge/provenance/projection migration questions.
```

Possible future roadmap language:

```text
v2.x:
  graph-ready SQLite phase and graph migration evidence collection.

v3.x:
  Neo4j-backed graph-native architecture candidate,
  with Kuzu/local embedded graph alternatives still evaluated.
```

The important principle:

```text
Research is not just choosing tools.
Research is discovering which questions must be answered before a tool choice becomes safe.
```

---

## 18. CanvasEdge / ObjectRelation Recovery And Package Integrity

The Summary 3 discussion clarified an important package and graph migration guardrail:

```text
CanvasEdge can degrade.
ObjectRelation must not silently disappear.
Binding can break.
Import must report.
```

This matters because users may draw incomplete arrows or visual connectors before a semantic relationship is fully known.

The system should treat these as separate objects:

```text
CanvasEdge:
  visual connector and interaction state.

ObjectRelation:
  semantic / AI-readable relation and future graph edge candidate.

CanvasEdge.relation_id:
  optional binding from visual connector to semantic relation.
```

Incomplete user thinking should remain valid on the canvas:

```text
from_node_id = A
to_node_id = null
relation_id = null
connection_state = incomplete
```

But it should not become an accepted graph edge until it has stable endpoints, relation type, and review state.

For `.coincides` packages, this means package import/export must preserve four layers:

```text
objects:
  NoteBlocks / Sources / EvidenceSets / ...

relations:
  ObjectRelations

canvas:
  CanvasNodes / CanvasEdges

bindings:
  CanvasEdge -> ObjectRelation
```

If package recovery fails partially, the system should not collapse everything into plain canvas lines.

Recommended recovery states:

```text
stale_binding:
  CanvasEdge originally pointed to an ObjectRelation,
  but the relation or endpoint could not be restored.

broken_relation:
  ObjectRelation exists,
  but from/to target is missing or invalid.
```

Future package import should generate a validation report:

- how many objects restored;
- how many relations restored;
- how many CanvasEdges degraded to visual-only;
- how many ObjectRelations became broken/stale;
- which sources/evidence records are missing;
- what can be repaired by user or AI proposal.

This should influence:

- v2.4 CanvasEdge / ObjectRelation design;
- v2.5 package/export design;
- v3.x graph-native migration design;
- future import repair tooling.

The deeper principle:

```text
Visual continuity and semantic continuity are related,
but they must recover independently.
```
