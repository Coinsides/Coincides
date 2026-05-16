# Coincides Delivery Plan

**Original scope**: v1.0 delivery record  
**Status updated**: 2026-05-16  
**Current role**: historical reference, not the active v2 execution plan

---

## Current Note

This document records the initial v1 delivery history: project foundation, card/deck system, agent proposal workflow, document processing, review, statistics, and polish rounds.

It is no longer the execution entry for new work.

For active v2 work, use:

- `docs/Coincides-Roadmap.md`
- `docs/releases/v2.0-plan.md`
- `docs/brainstorm/v2.x-brainstorm.md`
- `docs/v2-note-system-draft.md`

---

## Historical v1 Delivery Summary

v1 established the first usable Coincides product:

- React/Vite/Express/SQLite foundation,
- course, goal, task, calendar, and time-block flows,
- Card/Deck system with sections, tags, KaTeX, and FSRS review,
- document upload and parsing,
- agent tools and Proposal-based operation flow,
- semantic search, FTS, and RAG foundations,
- glassmorphism UI exploration and review-mode upgrades.

This work remains important because it produced the first validated learning-material workflow. In v2 planning, however, Card/Deck is treated as the ancestor of NoteBlock Library rather than the final architecture.

---

## v2 Execution Replacement

v2 work should be planned through version plans:

`docs/releases/v2.X-plan.md`

Each version plan must include Goal, Scope, Out of Scope, API / Contracts, Data Model, Agent Tool Contract, Migration, Test Matrix, and Acceptance Criteria.

The first active v2 plan is:

- `docs/releases/v2.0-plan.md` — NoteBlock Foundation

---

## What To Preserve From v1 Delivery

The following v1 ideas should be inherited where useful:

- Proposal -> Review -> Apply,
- KaTeX math rendering,
- FSRS review scheduling,
- source-linked document processing,
- hybrid retrieval experience,
- course-local organization,
- user-editable generated material,
- cautious migration and rollback thinking.

The v2 product should not preserve old architecture simply because it exists. Final learning quality is the priority.
