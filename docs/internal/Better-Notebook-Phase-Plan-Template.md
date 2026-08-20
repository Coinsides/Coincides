> **状态 (Status)**: active
> **层 (Layer)**: 内部 / Internal（V2.BN.x plan 模板）
> **日期 (Updated)**: 2026-06-06
> **权威 (Authoritative)**: 是（作为 plan 模板）

> **📌 待并入 (2026-08-19)**：本模板尚未纳入 2026-07-15 会议卷 §十 的两条新纪律 —— 每个 12.x plan 需加 **触及面申报**（声明碰/不碰哪几层地板）与 **旅程分数验收**。更新待批次二。

# Better Notebook Phase Plan Template

**Updated**: 2026-06-06
**Applies to**: future `V2.BN.x` and `V2.BN.x.y` plans

---

## Purpose

Every Better Notebook version plan must start from product intent and current implementation reality.

Do not start a `V2.BN.x` plan from only code convenience or old v2.x foundation assumptions.

---

## Required Plan Shape

Use this structure for each future Better Notebook version:

```md
# V2.BN.x Plan - <Version Title>

## Summary

One paragraph describing the user-facing improvement and why it belongs in the Better Notebook track.

## Active References

- PRODUCT.md
- docs/Coincides-Better-Notebook-Roadmap.md
- docs/Coincides-Relation-Product-Design.md, if relation is touched
- docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md
- docs/internal/Better-Notebook-Implementation-Reality-Check.md

## User Workflow

Describe the exact user flow before implementation:

- entry point;
- main action;
- expected visual state;
- expected data change;
- undo/recovery expectation;
- browser smoke path.

## Data / State Impact

State whether the version touches:

- NoteBlock content truth;
- BlockBox / CanvasNode / placement layout truth;
- Page / Canvas state;
- Source attachment or provenance;
- CanvasConnector / CanvasEdge;
- ObjectRelation / RelationType / RelationGroup;
- TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest;
- Concept-lite;
- export behavior;
- AI visibility;
- adapter/index state.

Then answer the data repair question:

- Is the existing schema enough for the user workflow?
- Does this version need a migration, backfill, compatibility mapper, rebuild rule, or recovery record?
- What existing data must keep working after the change?
- What is deleted, what is undoable, what is archived, and what is only hidden?
- Which state is canonical truth, and which state is editor cache / projection / adapter index?

Important rule: if the workflow cannot be made reliable without a data contract change, include that data fix in this version. Do not defer required data repair only because the track is named Better Notebook. `V2.BN.6` is for consolidation and audit, not for postponing data holes that block earlier UX.

## Key Changes

Group implementation requirements by behavior or subsystem. Avoid file-by-file lists unless necessary.

## Out Of Scope

Explicitly list what this version must not do.

## Acceptance Criteria

Use observable criteria:

- user can do X;
- state Y persists;
- object Z is not silently mutated;
- old workflow still works.

## Test Plan

List automated checks, docs checks, and browser smoke.

## Graph-Native / Adapter Evidence

If this version touches relation, source, concept, template, package, GraphRAG, import/export, or external adapters, record what future migration or adapter evidence it produces.

## Assumptions

Record defaults chosen without needing Henry to decide again.
```

---

## Required Planning Rules

- Treat `PRODUCT.md` as product identity.
- Treat `docs/Coincides-Better-Notebook-Roadmap.md` as phase order.
- Treat `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md` as interaction contract.
- Treat `docs/Coincides-Relation-Product-Design.md` as relation authority.
- Treat `docs/internal/Better-Notebook-Implementation-Reality-Check.md` as current implementation reality.
- Do not assume target UX already exists.
- Do not move AI note assembly ahead of mature human writing/layout.
- Do not let an adapter become Coincides truth by accident.

---

## Runtime Restart Gate

If a version changes server routes, migrations, or frontend runtime behavior, include a browser smoke step that explicitly waits for Henry to restart frontend/backend before testing.

Docs-only versions do not need restart-gated browser smoke.
