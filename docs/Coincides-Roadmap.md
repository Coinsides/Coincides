# Coincides Roadmap

**Updated**: 2026-05-16  
**Current mainline**: v2.0 NoteBlock Foundation on `feat/v2.0-noteblock`

---

## Current Direction

Coincides is moving toward a **Personal Learning Material OS / 学习管家**.

The product is not trying to become a general AI teacher. Its core value is to help learners organize scattered learning material into source-grounded, editable, reviewable structures.

---

## Branch And Version Status

- `main`: stable historical/mainline branch.
- `feat/v2.0-noteblock`: active v2 development branch.
- v1.8 Cloud/PWA: postponed and kept as historical architecture exploration.
- v1.9 Local-first Stable Core: deferred as a standalone milestone. Useful safety ideas may be folded into v2 work, but v1.9 is not a prerequisite for v2.0.
- v2.0: current mainline.

---

## Completed Foundation

v1.0 through v1.7.x established:

- courses, goals, tasks, calendar, and time blocks,
- Card/Deck system with sections and tags,
- KaTeX math rendering,
- FSRS review,
- document upload, parsing, search, and RAG,
- agent tools and Proposal -> Review -> Apply workflow,
- source-linked AI generation experiments.

This work is valuable, but v1 Card/Deck is now treated as an ancestor of the NoteBlock model, not the final architecture.

---

## v2.0 — NoteBlock Foundation

**Execution plan**: `docs/releases/v2.0-plan.md`

Goal: establish the minimum durable foundation for NoteBlock Library without trying to finish all AI note-generation features at once.

Major themes:

- define NoteBlock conceptual and storage model,
- preserve source traceability expectations,
- introduce projection vocabulary,
- define migration relationship from Card/Deck to NoteBlock/Review Projection,
- define API and agent-tool contracts before implementation,
- keep existing v1 flows usable while the v2 substrate is introduced.

---

## v2.1 — AI Note Proposal

Goal: turn parsed/OCR material into reviewed note proposals.

Expected themes:

- SourceFragment extraction pipeline,
- FragmentClassifier,
- BlockRouter,
- Note Proposal payloads,
- user review/apply flow,
- confidence and source bounding/crop preservation,
- first organized-note generation for real study material.

---

## v2.2 — Package Schemas And Official Math Pack

Goal: abstract reusable schemas before building a community editor.

Expected themes:

- Style Pack / Theme Pack schema,
- Block Vocabulary schema,
- Layout Recipe schema,
- Review Projection Rule schema,
- official Math Pack,
- validator and preview contracts.

---

## v2.3 — Package Studio Lite

Goal: build the first auxiliary tool for creating and previewing learning packages.

Expected themes:

- sample note preview,
- Style Pack editor,
- validator,
- import/export,
- developer-first workflow before community release.

Package Studio is not a prerequisite for v2.0. First build the learning capabilities, then build the editing tool for packages.

---

## v2.4+ — Larger Learning Material OS

Possible directions:

- Block Vocabulary Editor,
- Layout Recipe Editor,
- Review Projection Editor,
- Routing Rules Editor,
- community package sharing,
- Concept / ConceptMention expansion,
- Concept Focus Notes,
- Scoped Knowledge Maps,
- Learning Inbox,
- Source Library for large materials,
- Material Scale Router,
- textbook-scale indexing,
- optional rerank model for task-aware retrieval,
- desktop packaging and hosted services after the v2 foundation proves useful.

---

## Product Guardrails

- Preserve source traceability.
- Keep AI changes proposal-first.
- Do not judge the learner by default.
- Prefer factual organization language.
- Do not protect old Card/Deck architecture if it blocks the better product.
- Do not make packaging, cloud, or community tooling a precondition for the NoteBlock foundation.
