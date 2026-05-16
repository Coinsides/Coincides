# Coincides Codex Onboarding

**Updated**: 2026-05-16  
**Active workstream**: v2.0 NoteBlock Foundation  
**Active branch**: `feat/v2.0-noteblock`

This is the quick recovery guide for a new Codex task on Coincides.

---

## 1. Product Identity

Coincides is a **Personal Learning Material OS / 学习管家**.

Its job is not to replace human learning and not to become a general AI tutor. The core value is to help learners turn scattered, high-density learning material into clear structures, reusable learning fragments, review projections, and traceable study paths.

The product should reduce the cost of organizing learning before the real learning begins.

---

## 2. Current Status

- v1.0 through v1.7.x established the first working product: courses, tasks, goals, cards/decks, document parsing, RAG, FSRS review, and Proposal-based AI operations.
- v1.8 Cloud/PWA is historical and postponed. It is not the current mainline.
- v1.9 Local-first Stable Core is deferred as a standalone milestone. Useful safety ideas may be folded into v2 migration and foundation work.
- v2.0 is the current direction: build the NoteBlock Foundation and prepare the migration path from early Card/Deck ideas into the future NoteBlock Library.

---

## 3. Source Of Truth Docs

Start with these files before a substantial task:

- `docs/Coincides-Roadmap.md`
- `docs/brainstorm/v2.x-brainstorm.md`
- `docs/v2-note-system-draft.md`
- `docs/releases/v2.0-plan.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/workflow/Coincides-Workflow.md`
- `docs/workflow/Update-Migration-Guide.md`

Old v1 release notes are historical records. Do not rewrite them unless explicitly asked.

---

## 4. Technical Snapshot

Current implemented stack:

- Frontend: React + TypeScript + Vite + Zustand.
- Backend: Node.js + Express + TypeScript runtime.
- Database: SQLite with migrations.
- Math rendering: KaTeX.
- Review: FSRS.
- Search/RAG: FTS and embedding-based document retrieval.
- AI operations: Proposal-first agent workflow.

Model-role direction:

- `thinking_model`: structured reasoning, proposal generation, planning, and difficult extraction.
- `embedding_model`: semantic indexing and retrieval.
- `vision_or_ocr_model`: optional role for image/PDF/OCR-heavy material.
- `rerank_model`: future optional role for textbook-scale or multi-source retrieval, not a default v2.0 dependency.
- `fast_model`: optional convenience role; it may be replaced by the thinking model when speed is not critical.

API keys are never documented as concrete values. Use app Settings, `.env`, or a temporary test key supplied by Henry for one-time testing.

---

## 5. v2 Concepts

The v2 system should be understood as layered:

1. **Source Material / Source Library**: uploaded notes, scans, slides, textbooks, problem sets, and old documents.
2. **SourceFragment**: source-preserving units with raw text, image crop, bounding box, page/order, confidence, and source link.
3. **NoteBlock Library**: canonical reusable learning fragments such as title, paragraph, definition, theorem, proof, formula, example, exercise, answer, diagram crop, and sidenote.
4. **Projection System**: views generated from NoteBlocks, including organized notes, review card sets, exercise sets, formula sheets, theorem-proof lists, concept focus notes, and scoped knowledge maps.
5. **Concept / ConceptMention**: course-local concept entities and mention records that support focus notes and review sets around ideas such as gradient.
6. **Material Scale Router**: decides whether input should be handled directly, chapter-by-chapter, or through Source Library indexing first.
7. **Learning Inbox**: staging area for materials before the user chooses what to organize.
8. **Package Studio**: later auxiliary editor for style packs, block vocabularies, layout recipes, routing rules, validators, and previews.

---

## 6. Design Guardrails

- Respect the learner's source material and preserve traceability.
- Do not silently rewrite the user's knowledge structure.
- Use `Proposal -> Review -> Apply` for AI-generated structural changes.
- Keep language factual and non-judgmental.
- Prefer editable, inspectable blocks over opaque AI output.
- Treat v1 Card/Deck as an ancestor of NoteBlock ideas, not as a model that must be preserved unchanged.

---

## 7. New Task Checklist

Before starting:

- Confirm the branch is correct for the task.
- Read the active version plan if the task changes behavior or architecture.
- Identify affected APIs, data model, migrations, agent tools, and docs.
- Check for user-owned local changes if working in a local clone.
- Define the verification path before editing.

Before finishing:

- Verify the relevant behavior or docs.
- Check for accidental secrets.
- Confirm docs match the implemented change.
- Tell Henry what was changed, what was verified, and what still needs human acceptance.
