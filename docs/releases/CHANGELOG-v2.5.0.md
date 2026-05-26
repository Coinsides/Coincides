# CHANGELOG v2.5.0

## Summary

v2.5.0 adds the first persistent Template Definition Runtime for NoteBlocks.

## Added

- `template_definitions` table.
- runtime template seed from v2.1.1 static registry.
- `/api/templates` route group.
- compatibility report for existing NoteBlocks.
- runtime template metadata for new manual, proposal, and canvas-created NoteBlocks.
- AI-readable operating manual scaffold.

## Changed

- organized note proposal fallback and apply now write v2.5 runtime metadata.
- canvas block insertion now resolves runtime templates before creating NoteBlocks.
- NoteBlock create/update paths now use runtime-compatible metadata merging.

## Not Included

- user-facing template editor;
- CompositionTemplate runtime;
- DomainBlockSet / PackageManifest runtime;
- rich editor adapter;
- graph database migration.

## Verification

- `server npm.cmd run test:v2`: passed.
- `server npm.cmd run build`: passed.
- `client npm.cmd run build`: passed.
- `git diff --check`: passed.
- changed-file secret scan: passed.
