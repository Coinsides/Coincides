# CHANGELOG v2.5.2

## Added

- Added CompositionTemplate runtime storage.
- Added system composition seeds:
  - `formula_sheet.basic`
  - `theorem_proof_example.basic`
  - `source_quote_interpretation.basic`
  - `evidence_comparison.basic`
  - `briefing_section.basic`
  - `side_note_cluster.basic`
- Added composition compatibility report.
- Added `composition_template` proposal creation and apply behavior.
- Added CompositionInstance and slot history records.
- Added Canvas Document UI entry for creating and reviewing composition proposals.

## Changed

- Proposal apply now supports `composition_template`.
- Canvas proposal preview can display composition layout previews.
- Agent operating manual now includes CompositionTemplate rules.

## Safety

- Composition apply creates new records only.
- Existing NoteBlocks, sources, templates, and relations are not silently rewritten.
- Relation blueprints remain suggestions and do not create confirmed ObjectRelations.
