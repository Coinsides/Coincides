# Coincides Architecture

**Updated**: 2026-05-16  
**Status**: v1 implemented architecture plus v2 target architecture

---

## 1. Current Implemented Architecture

Coincides currently runs as a local-first web application stack:

- **Frontend**: React, TypeScript, Vite, Zustand, CSS modules.
- **Backend**: Node.js, Express, TypeScript runtime.
- **Database**: SQLite with migrations and local persistence.
- **Math rendering**: KaTeX.
- **Review**: FSRS.
- **Document processing**: uploaded files are parsed, chunked, indexed, and made available to agent tools.
- **Search/RAG**: full-text and embedding-based retrieval.
- **AI workflow**: agent proposes structured operations; user reviews before applying.

This architecture is real and should be respected during migration work, but it is not the final v2 knowledge architecture.

---

## 2. v2 Target Architecture

The v2 architecture should move from Card/Deck as the central knowledge unit to NoteBlock Library as the central substrate.

```text
Source Material
  -> SourceFragment
  -> FragmentClassifier
  -> BlockRouter
  -> NoteBlock Library
  -> Organized Note / Review Projection / Concept Focus / Formula Sheet
```

Key layers:

- **Source Library**: stores uploaded scans, PDFs, slides, textbooks, old notes, and parsed material metadata.
- **SourceFragment**: preserves raw extraction units: page/order, bounding box, raw text, image crop, OCR confidence, source link.
- **FragmentClassifier**: classifies fragments into candidate roles such as title, paragraph, formula, example, theorem, diagram, answer, or exercise.
- **BlockRouter**: routes classified fragments into canonical NoteBlock shapes or asks for user/AI clarification when confidence is low.
- **NoteBlock Library**: stores reusable learning fragments.
- **Projection System**: creates user-facing views from NoteBlocks.

---

## 3. Projection Architecture

A projection is a view over NoteBlocks, not a separate source of truth.

Examples:

- Organized Notes,
- Review Card Sets,
- Exercise Sets,
- Formula Sheets,
- Theorem-Proof Lists,
- Concept Focus Notes,
- Scoped Knowledge Maps.

A future review-card experience may feel like a card system to the user, but its underlying material should come from NoteBlock Library.

---

## 4. Model Roles

The architecture should support model roles without requiring every role in v2.0.

- `thinking_model`: reasoning, proposal generation, extraction decisions, routing decisions, and hard synthesis.
- `embedding_model`: semantic indexing and retrieval.
- `vision_or_ocr_model`: optional role for scanned notes, diagrams, and image-heavy PDFs.
- `rerank_model`: future optional role for textbook-scale, full-course, or multi-source retrieval where task-aware ordering matters.
- `fast_model`: optional role for low-latency classification or UI assistance; can be replaced by the thinking model when speed is not critical.

Provider choice should remain separate from role design. OpenAI, Anthropic, Qwen, DeepSeek, Voyage, or future local models are provider implementations, not the product architecture itself.

---

## 5. API And Contract Rule

Every v2 version plan must define affected contracts before implementation:

- backend API routes,
- frontend service contracts,
- database migration contracts,
- agent tool input/output contracts,
- proposal payload shape,
- operation batch behavior,
- validation and rollback expectations.

APIs should be designed for stability, efficiency, and output quality. Do not add an API only because it is convenient for one UI screen if it weakens the long-term model.

---

## 6. Local-First Direction

The active architecture remains local-first and self-hostable. Desktop packaging, cloud sync, hosted accounts, and PostgreSQL may be revisited later, but they are not prerequisites for v2.0.

The architecture should not assume that user material leaves the local environment unless the user explicitly configures an AI provider or hosted service.

---

## 7. Secret Handling

Architecture docs must never include real API keys. Use placeholders such as `<provider-api-key>` in examples, or describe the configuration path without showing a value.
