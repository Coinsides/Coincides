# Coincides v2.1.1 Changelog

## Learning Block Template Engine Seed - Accepted

### Changed

- Added a template-aware NoteBlock taxonomy seed with `system_type`, `learning_role`, `template_id`, and `taxonomy_version`.
- Added registry helpers for seeded templates such as Paragraph, Heading, Concept, Definition, Formula, Exercise, Source Quote, Callout, and Code Snippet.
- Manual NoteBlock creation now writes compatible template metadata while keeping the legacy `block_type`.
- NoteBlock update preserves existing metadata keys and safely infers template metadata when needed.
- Organized note proposals now create, preview, and apply template-aware candidate blocks.
- Proposal preview now shows friendly template labels.

### Scope notes

- No full template editor.
- No canvas.
- No BlockSuite/AFFiNE dependency.
- No multi-provider AI adapter.
- No database migration; v2.1.1 is metadata-only.

### Verification

- `server npm run test:v2`: PASS.
- `server npm run build`: PASS.
- `client npm run build`: PASS.
- `git diff --check`: PASS.
- Secret scan over changed files: PASS.

### Release decision

- 2026-05-21: Accepted by Henry. Move into post-v2.1.1 product/reference research.
