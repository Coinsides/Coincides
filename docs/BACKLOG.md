# Coincides Backlog

**Status updated**: 2026-05-16  
**Current role**: v1.x backlog archive and v2 idea parking lot

---

## Current Note

This file previously collected many v1.x feature requests and deferred items. Those records are useful as historical context, but this file is no longer the primary execution tracker for v2.0.

For v2 work, use:

- `docs/releases/v2.0-plan.md` for current implementation,
- `docs/Coincides-Roadmap.md` for version direction,
- `docs/brainstorm/v2.x-brainstorm.md` for open-ended ideas.

---

## v1 Backlog Status

Most old backlog items should be re-evaluated before implementation because v2 changes the foundation from Card/Deck to NoteBlock Library.

Examples:

- old review-card upgrades should become Review Projection work,
- old card data-model upgrades should become NoteBlock model decisions,
- old Electron/packaging work should wait until the v2 foundation is useful,
- old cloud/PWA assumptions should not drive current architecture,
- old statistics ideas should be reframed as Learning Material Analytics or projection metadata.

Do not automatically carry a v1 backlog item into v2 just because it was pending.

---

## v2 Parking Lot

Potential v2+ backlog themes:

- NoteBlock Library foundation,
- Source Library and SourceFragment tracking,
- AI Note Proposal and BlockRouter,
- Organized Notes projection,
- Review Card Sets as NoteBlock projections,
- Exercise Sets, Formula Sheets, and Theorem-Proof Lists,
- Concept and ConceptMention system,
- Concept Focus Notes,
- Material Scale Router,
- Learning Inbox,
- large-material and textbook indexing,
- optional rerank model for large-scale retrieval,
- Package Studio Lite after v2.2,
- Style Pack, Block Vocabulary, Layout Recipe, and Routing Rule schemas,
- Windows/local-first hardening when the v2 model stabilizes,
- desktop packaging and hosted services as later optional tracks.

---

## Promotion Rule

An item graduates from this backlog into implementation only when it is copied into a `docs/releases/v2.X-plan.md` file with:

- clear goal,
- scope and out-of-scope boundaries,
- API/contract impact,
- data model impact,
- migration impact,
- test matrix,
- acceptance criteria.

Until then, it is an idea, not a commitment.
