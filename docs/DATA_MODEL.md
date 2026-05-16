# Coincides Data Model

**Updated**: 2026-05-16  
**Status**: current v1 model summary plus v2 conceptual target model

This document distinguishes implemented tables from v2 conceptual entities. A conceptual v2 entity is not automatically an existing table.

---

## 1. Current Implemented Model Summary

The current application is built around:

- users / local profile assumptions,
- courses,
- goals and tasks,
- time blocks,
- decks,
- cards,
- card sections,
- tags and tag groups,
- documents and document chunks,
- embeddings / vector search metadata,
- proposals and agent operation records,
- FSRS review state.

This model remains the migration source for v2 work.

---

## 2. v1 Card/Deck Interpretation

v1 Card/Deck should be understood as an early experiment in structured learning units.

It validated several important ideas:

- learning material can be typed,
- formulas need reliable rendering,
- source-linked AI generation is useful,
- review collections are valuable,
- users need proposal review before AI changes become real.

But v1 Card/Deck is not the final v2 substrate. The v2 target is NoteBlock Library, with review cards as projections.

---

## 3. v2 Conceptual Model

### Note

A user-facing organized note. It may represent a lecture, chapter, topic, textbook section, concept focus, or generated study sheet.

Important fields may include:

- course/workspace scope,
- title,
- page/canvas settings,
- ordered block references,
- source material references,
- style/layout metadata,
- proposal/apply history.

### NoteBlock

The canonical reusable learning fragment.

Possible block kinds:

- title,
- paragraph,
- definition,
- theorem,
- proof,
- formula,
- example,
- exercise,
- answer,
- diagram crop,
- image,
- sidenote,
- separator,
- checklist or step.

A NoteBlock should be independently selectable, editable, reusable, and eligible for review projection when appropriate.

### SourceMaterial

A source uploaded or registered by the user:

- handwritten scan,
- PDF,
- slide deck,
- textbook chapter,
- old notes,
- problem set,
- image,
- text document.

### SourceFragment

A source-preserving extraction unit. It should capture:

- source material id,
- page or logical location,
- source order,
- raw text,
- image crop reference,
- bounding box when available,
- OCR/parser confidence,
- extraction method,
- link back to the original source.

### Concept

A course-local concept entity such as `gradient`, `Riemann sum`, or `chain rule`.

Concepts should not be global universal truths by default. The same term can mean different things across courses or subjects.

### ConceptMention

A record that a concept appears in a NoteBlock, SourceFragment, formula, example, exercise, diagram, or projection.

ConceptMention enables focus notes and concept-scoped review sets without forcing all material into one global knowledge graph.

### Projection

A user-facing view generated from NoteBlocks.

Projection types may include:

- organized note,
- review card set,
- exercise set,
- formula sheet,
- theorem-proof list,
- concept focus note,
- scoped knowledge map,
- exam review set.

### OperationBatch

A traceable group of changes, especially AI-proposed or migration-created changes.

OperationBatch should help with review, rollback, recent changes, and source accountability.

---

## 4. Migration Direction

Future migrations may map old Card/Deck records into NoteBlocks and Review Projections.

Possible mapping:

- `cards.front/back` or typed fields -> NoteBlock content,
- card type -> NoteBlock kind or review projection template,
- deck -> projection group or note collection,
- section -> ordering/grouping metadata,
- tags -> concept hints or projection metadata,
- FSRS state -> review projection scheduling metadata.

The migration goal is to preserve the user's material and review history while allowing the product to move beyond the old Card table.

---

## 5. Settings And Keys

Provider credentials are configuration, not data model documentation.

Examples should use neutral placeholders only:

```json
{
  "thinkingModelKey": "<configured-locally>",
  "embeddingModelKey": "<configured-locally>"
}
```

Never commit real provider keys to docs, source code, database fixtures, or migration examples.
