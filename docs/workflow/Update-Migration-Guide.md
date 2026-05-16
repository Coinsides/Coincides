# Coincides Migration Guide

**Updated**: 2026-05-16  
**Applies to**: v2.x local-first and self-hostable development

This guide defines how Coincides should handle data migration as it moves from the v1 Card/Deck-centered system toward the v2 NoteBlock Library.

---

## 1. Direction Change

The old migration assumption was roughly:

`v1.x local app -> v1.9 Electron/local package -> v2.0+ cloud service`

That is no longer the active direction.

The current direction is:

`local-first / self-hostable first -> desktop packaging later optional -> hosted services later optional`

Desktop packaging, cloud sync, hosted accounts, PostgreSQL, and PWA support may return later, but they are not prerequisites for v2.0 NoteBlock Foundation.

---

## 2. Migration Principles

- Preserve user data before improving schema elegance.
- Migrations must be incremental and trackable.
- Prefer additive migrations until a deliberate cleanup version is planned.
- Back up real user data before any risky migration.
- Do not delete old data structures until the new system is proven and reversible.
- Every migration must be testable on both an empty database and an existing database.
- AI-generated structure changes must be traceable to source material and proposal records.

---

## 3. v2 Data Migration Context

v1 Card/Deck data is an early experiment in structured learning fragments. It should be treated as a migration source, not as a permanent architectural constraint.

Potential future mapping:

- v1 `cards` may become or generate `NoteBlock` records.
- v1 card types such as definition, theorem, formula, and example may become block kinds.
- v1 `decks` may become review projections, note collections, or course-local groups.
- v1 sections and tags may become ordering metadata, source grouping, projection metadata, or concept hints.
- FSRS state should be preserved when a review projection continues to represent the same learning unit.

The target is not to protect the old Card table forever. The target is to preserve the user's learning material while allowing the product model to improve.

---

## 4. Schema And Migration Split

- Schema files describe the intended current shape.
- Migration files describe how existing user databases arrive there safely.
- Version plans must state both conceptual data model changes and actual migration steps.
- Migration code should not hide product decisions. If a Card becomes a NoteBlock or Projection, that mapping belongs in the version plan and data model docs.

---

## 5. Safe Migration Process

For each migration-bearing version:

1. Write the data model section in the version plan.
2. Define old-shape input and new-shape output.
3. Add backup/rollback notes for real user data.
4. Implement migration as a small numbered step.
5. Test on an empty database.
6. Test on an existing v1-style database.
7. Verify idempotency or explicit migration tracking.
8. Document what changed and what remains legacy.

---

## 6. v2 Migration Checklist

Before applying a v2 migration to real data, confirm:

- The branch is not `main` unless explicitly approved.
- A backup exists.
- The migration does not require a real API key.
- The migration preserves source links and user-created content.
- Existing cards/decks remain readable or are mapped into a new readable projection.
- Failure mode is understandable and recoverable.
- The changelog, data model, architecture, and version plan agree.

---

## 7. Secret Rule

Migration docs and scripts must never contain real provider keys. Use placeholders such as `<provider-api-key>` in examples. Any committed real key should be treated as leaked and rotated immediately.
