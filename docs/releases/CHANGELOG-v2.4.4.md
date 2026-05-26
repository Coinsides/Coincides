# CHANGELOG v2.4.4 - Canvas Edges + ObjectRelation Seed

**Date**: 2026-05-23
**Status**: Engineering complete / browser smoke follow-up

---

## Added

- Added `CanvasEdge` support for incomplete, visual-only, and relation-backed canvas connectors.
- Added `ObjectRelation` as the first semantic edge candidate for graph-native planning.
- Added default `RelationLayer` seed values: visual, learning logic, source evidence, AI suggested, and AI hidden.
- Added Canvas Connect mode with four node ports, SVG edge rendering, edge selection, and an edge inspector.
- Added API routes for canvas edges, relation layers, and object relations.

## Changed

- Canvas detail responses now include edges, relation layers, and object relations.
- Existing canvas edges are migrated into the v2.4.4 edge model without changing NoteBlocks, sources, evidence, or proposals.
- Startup schema compatibility now lets existing pre-v2.4.4 local databases reach migration 024 before edge relation/layer indexes are created.
- v2.x continuity now records the graph-native lesson: visual edges are not automatically semantic graph truth.

## Verification

- `server npm.cmd run test:v2`: passed, 62/62 tests after adding the startup compatibility regression.
- `server npm.cmd run build`: passed.
- `client npm.cmd run build`: passed.
- `git diff --check`: passed.
- Local `initDb()` startup path: passed against the real local database and applied migration 024.
- Browser UI presence confirmed on the local Course Detail page.
- Full browser edge smoke is pending one local backend restart because the running server was still missing the new v2.4.4 edge route.

## Follow-ups

- Restart local dev services and run the full browser smoke for draw incomplete edge, draw visual edge, bind relation, reload persistence, and layer hide/show.
- Later versions should decide whether richer edge styling and layer management belong in v2.4.x or the broader customization/template engine.
