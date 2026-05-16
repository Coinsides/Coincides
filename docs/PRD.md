# Coincides PRD

**Updated**: 2026-05-16  
**Current direction**: Personal Learning Material OS / 学习管家

---

## 1. Product Definition

Coincides helps learners organize learning material into clear, traceable, reusable structures.

It is not primarily an AI teacher, a homework solver, or a generic chat tutor. General large-model products can already explain code, solve math questions, and provide step-by-step tutoring. Coincides focuses on the layer that is easy to overlook but critical for real learning: turning scattered material into a usable learning structure.

The product should help users understand:

- what material they have,
- how it is structured,
- what concepts appear where,
- what can be turned into notes, review sets, exercise sets, formula sheets, or focused concept reviews,
- and what source each generated block came from.

---

## 2. Core Problem

Modern learners face too much material: lecture notes, scans, slides, textbooks, old notebooks, problem sets, and web resources. The hard part is often not one isolated explanation. The hard part is building a clear map before learning begins.

Coincides should reduce that organization burden so the user can spend more energy on understanding, memory, practice, and application.

---

## 3. Target Users

Primary users:

- students with handwritten or digital notes,
- self-learners working through large textbooks or distributed resources,
- learners who want better review material from their own notes,
- users who need subject-specific note organization, especially math-heavy and STEM-heavy material.

The first strong use case remains math learning, but the architecture should leave room for other subjects through block vocabularies, style packs, layout recipes, routing rules, and review projections.

---

## 4. Current v1 Capabilities

The current product already includes:

- courses, goals, tasks, and time-block planning,
- card/deck review with FSRS,
- KaTeX math rendering,
- document upload and parsing,
- document search and RAG,
- Proposal-based agent operations,
- source-linked learning material generation.

These features prove important ideas, but v1 Card/Deck is not the final knowledge substrate. It is an ancestor of the future NoteBlock model.

---

## 5. v2 Product Direction

The v2 foundation is the **NoteBlock Library**.

All reusable learning material fragments should move toward this substrate: titles, paragraphs, definitions, theorems, proofs, formulas, examples, exercises, answers, diagram crops, sidenotes, and source-linked fragments.

User-facing features become projections over that library:

- Organized Notes,
- Review Card Sets,
- Exercise Sets,
- Formula Sheets,
- Theorem-Proof Lists,
- Concept Focus Notes,
- Scoped Knowledge Maps.

A future card/review system can still exist, but its information source should be NoteBlock Library, not a separate permanent Card universe.

---

## 6. AI Behavior Principles

AI should help organize, not silently decide.

The default workflow is:

`Proposal -> Review -> Apply`

AI-generated notes and review projections should preserve source references, confidence, raw fragments, and user-editable structure. The system should be honest about uncertainty and avoid hiding low-confidence extraction behind polished output.

Preferred language is factual:

- "I found these materials."
- "I organized these structures."
- "This concept appears in these places."

Avoid default diagnostic language such as "you are weak here" or "you must learn this first".

---

## 7. Large Material Direction

Coincides should eventually handle much more than a weekly note upload.

For large materials such as full-semester notes or textbooks, the system should not push everything into one thinking-model context. Instead it should use:

- Learning Inbox,
- Source Library,
- parse/chunk/embed/index flow,
- Material Scale Router,
- scoped generation by chapter, concept, goal, or exam range,
- optional future reranking for task-aware relevance ordering.

The product should help the user narrow a learning scope before generating final notes or review material.

---

## 8. Non-Goals

Coincides should not:

- replace human learning,
- pretend to know the user's weakness without evidence,
- generate massive textbook summaries in one shot,
- execute arbitrary community code as a template system,
- make cloud deployment or desktop packaging a prerequisite for v2.0,
- preserve v1 Card/Deck architecture if it blocks the better NoteBlock product.

---

## 9. Success Criteria

Coincides succeeds when a learner can give it real material and receive a faithful, clear, editable structure that helps them begin studying faster.

The best output is not merely prettier notes. It is a better learning starting point: scoped, ordered, source-grounded, reviewable, and psychologically easier to continue.
