# CHANGELOG v2.3.4 - Source Annotation / Media Snapshot Planning Patch

**Status**: Planning patch complete / Henry v2.3.x batch acceptance pending

## Added

- Added v2.3.4 plan, engineering spec, quality review, experience review, and changelog.
- Defined future Source Annotation concepts:
  - `SourceAnnotation`
  - `AnnotationTarget`
  - `AnnotationLayer`
  - `AnnotationKind`
- Defined future Media Snapshot concepts:
  - `MediaSnapshot`
  - `MediaSnapshotFrame`
  - `MediaAnchor`
  - `MediaTranscriptSegment`
- Recorded PDF/Web/Media external tool candidates without adopting dependencies.

## Changed

- Updated v2.x continuity so Source Annotation / Media Snapshot remains a future contract, not a late v2.3.x feature expansion.
- Clarified that v2.3.x subjective acceptance remains batched after Source Board / Canvas maturity.

## Verification

- `git diff --check`: pass.
- Changed-file secret scan: no literal secrets found.

## Notes

- No product code changed.
- No migration was added.
- No external tool was installed.
- No real API provider test was run.
- v2.4 remains the start of Learning Canvas / Board Projection Track.
