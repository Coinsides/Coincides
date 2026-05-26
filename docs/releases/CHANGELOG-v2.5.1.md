# CHANGELOG v2.5.1

## Summary

v2.5.1 adds the first guided Template Studio seed over runtime `TemplateDefinition`.

## Added

- Template Studio page at `#/templates`.
- TemplateDefinition create/copy/update/lifecycle/usage APIs.
- Guided editor controls for template fields, render intent, source/relation/proposal presets, and `summary_for_agent`.
- Reading/editing/debug/proposal preview panels.
- Compatibility usage panel for runtime/legacy NoteBlock references.

## Changed

- Note editor Add Block and Canvas Add Block now prefer runtime templates from `/api/templates`.
- Static v2.1.1 template registry remains a fallback when runtime templates are unavailable.
- Template Studio keeps system templates read-only and requires copy-to-draft for user editing.

## Not Included

- TemplateMigrationProposal.
- CompositionTemplate.
- DomainBlockSet.
- Package Studio.
- Rich editor adapter.

## Verification

- `server npm.cmd run test:v2` passed.
- `server npm.cmd run build` passed.
- `client npm.cmd run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.
