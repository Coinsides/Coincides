> **状态 (Status)**: frozen
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-09-10
> **权威 (Authoritative)**: 是，仅限本文列明的 V13.5 B9 现物子集
> **取代 (Supersedes)**: 本文件 2026-06-23 draft
> **被取代 (Superseded by)**: —

# TextFlow Contract

This freezes the implemented TextFlow subset at V13.5 B9: stored units and inline records, editing coordinates, B4 history, B5/B6/B6b navigation and selection, B7 per-block atomic text saving, and B8 inline preservation. The scope comes from the [B9 order](../agent-ops/handoffs/2026-09-10-v13-5-b9-grapheme-and-contract-order.md). It is a snapshot of the implementation, not a declaration that the entire TextFlow pillar is complete.

TextFlow owns writable text and local content coordinates. Canvas owns placement; annotation and board-range excerpts are readings of text, not a second text source. Item, ContentGroup, Source and Relation ownership remains with their existing systems. A writing role or inline kind does not create an Item or a Relation endpoint.

This subset does not specify rich selected-range styling, new inline insertion/rendering, formula/code block conversion, new semantic categories, cross-session history or migrations. The old draft's future TextUnitGroup/Petal/Structure Studio proposals and candidate relation endpoints are not current TextFlow contract terms.

## 1. Stored content and projection

`NoteBlock.content_json.text_flow` holds `TextBlockContentV1`:

| Field | Present representation |
|---|---|
| `textflow_version` | Literal `TextBlockContentV1`. |
| `units` | Ordered writing units, each with its own local ID and text. |
| `inline_structures` | Local inline records anchored to units. |
| `metadata` | `Record<string, unknown>`; this contract adds no metadata vocabulary. |

The reader requires the supported version and both arrays; missing/malformed top-level data produces warnings and no valid flow. It normalizes individual records and sorts units by `order_index`. `projectTextFlowContent` excludes records whose status is `deleted`, and joins the remaining unit text with `\n`. `draft` and `deprecated` are not filtered out by that projection. An absent/invalid flow uses the supplied plain-text fallback, trimmed at the end, without manufacturing stored inline records.

The flow ID used by external ranges is derived as `textflow-${blockId}`; it is not another field inside `TextBlockContentV1`. Unit and inline IDs are local to the flow. Addresses therefore retain the owning block/flow identity as well as the unit ID. No B9 coordinate or identity migration occurs.

## 2. TextUnit and writing roles

| Field | Present meaning |
|---|---|
| `id` | Unit identity; preserved by ordinary text edits. Split creates another ID; merge retains the earlier unit's ID. |
| `text` | JavaScript string containing the unit's writable text. |
| `writing_role` | One of `paragraph`, `heading`, `quote`, `bullet_item`, `numbered_item`, `todo_item`, `toggle_item`, `code_line`. |
| `indent_level` | Numeric writing indentation. The reader floors negative values at zero; editor indent/outdent and parsed units are bounded to 0–6. |
| `order_index` | Numeric order. Structural operations rewrite surviving units to consecutive indexes. |
| `metadata` | Existing per-unit fields; `checked === true` controls todo state and `collapsed === true` controls toggle state. |
| `status` | `active`, `draft`, `deprecated` or `deleted`. These are stored values, not a new state machine. |

The reader supplies missing unit IDs as `tu-${index + 1}`, missing text as `''`, unknown roles as `paragraph`, and unknown statuses as `active`. Non-record unit entries are omitted. It does not turn `heading` into level-specific roles; `heading_1`, `heading_2`, `heading_3` and `divider` are absent from the runtime role union.

Visual soft wrap does not create a unit. Enter splits a unit; with a selection, it removes the complete selected interval before splitting. The earlier piece retains its identity. The next todo starts unchecked; the next toggle starts expanded, and Enter at a toggle's end creates a paragraph. Merge concatenates text into the previous unit and retains that unit's role and metadata. Role and indent edits change writing presentation, not knowledge classification.

Structured paste parses lines into units, normalizes CRLF/CR to `\n`, replaces the entire selected interval, and preserves any original prefix/suffix under the existing parser rules. This is distinct from document-selection replacement, whose behavior is defined in §5. The contract does not add Markdown syntax or parser semantics.

## 3. Inline records and lifecycle

The actual runtime type is `InlineStructuredObject`:

| Field | Present meaning |
|---|---|
| `id` | Inline record identity within the flow. |
| `semantic_kind` | `inline_formula`, `inline_code`, `inline_definition`, `inline_source_marker`, `inline_link`, `inline_concept_mention`, `inline_claim` or `custom`. These are the existing union values; their presence does not promise an active command or renderer. |
| `parent_text_unit_id` | Local parent unit identity. |
| `anchor_text` | String evidence or `null`; it is not an independent writable text source. |
| `anchor_range` | Unit-local `{ start, end }` in UTF-16 offsets, or `null` when coordinates are unavailable. |
| `field_values` | Existing payload record, preserved through supported edits. |
| `metadata` | Existing metadata record, including degradation evidence when needed. |
| `status` | The same four stored status values as units. |

The reader supplies missing IDs as `iso-${index + 1}`, maps unknown kinds to `custom`, and omits records without a nonempty parent ID. It normalizes missing record-valued fields to `{}` and empty `anchor_text` to `null`. Reading alone does not prove that a parent resolves or that an anchor is in bounds.

B8 remaps records using the unchanged source-text segments retained by an edit:

- An anchor wholly contained in a retained segment keeps its complete range, shifted to that segment's new offset and parent. Insertion exactly before/after a nonempty anchor preserves the anchor's original text.
- Unit split assigns intact anchors to the corresponding unit. Unit merge maps the later unit's anchors to the earlier unit and adds the earlier text length. Flow split partitions by parent; pre-existing unresolved parents remain in the first flow. Flow merge renames conflicting IDs from the second flow and remaps their parent references while avoiding IDs reserved by either input.
- An edit inside an anchor, a range crossing a split/deleted interval, or invalid coordinates cannot be mapped as a complete retained segment. The record stays present with `anchor_range: null` and a surviving fallback parent. `anchor_text`, `field_values`, `status` and other metadata remain present.
- On first degradation, `metadata.pre_edit_offsets` records `{ text_unit_id, start_offset, end_offset, range_text_cache }`. Existing evidence is preserved on later edits; the excerpt uses `anchor_text` when available, otherwise source text. Already-null ranges stay null and follow the fallback parent.

These rules also apply to selected-range replacement, Enter and paste retention. They do not silently clip a damaged inline into a different valid-looking range. B4's full-flow snapshots preserve inline records for undo/redo; restoration does not reconstruct them from rendered text.

The `inline_formula` and `inline_code` commands remain `disabled: true` in `commandSurfaceService.ts`. B8/B9 preserve existing records and do not activate those commands or define formula/code rendering and adoption semantics.

## 4. Coordinates and grapheme boundaries

**Stored coordinates remain UTF-16 code-unit offsets.** Unit-local `start`/`end`, selection offsets, annotation/board ranges and existing anchor records keep their coordinate system. End offsets are exclusive. Grapheme handling changes boundary resolution, not storage units, normalization of source text or persisted historical offsets.

**Interaction and text slicing use whole grapheme clusters.** A nonempty excerpt whose supplied start or end falls inside a surrogate pair, combining sequence or ZWJ sequence expands outward to include the full cluster: start goes to the preceding boundary and end to the following boundary. An empty selection remains empty, with its caret snapped to the nearest boundary; an equal-distance tie goes forward. `sliceGraphemes` retains native slice index clamping/negative-index behavior, and a reversed slice remains empty. Copy/excerpt projection does not rewrite the saved range that supplied those offsets.

Caret and selection endpoints produced by managed TextFlow navigation and hit-testing land on grapheme boundaries. A plain horizontal arrow or Shift extension crosses a complete cluster in one step; clicking or moving vertically resolves the measured offset to a cluster boundary. Thus storage still counts two UTF-16 units for a supplementary emoji while one interaction step crosses that emoji. Standalone ASCII and CJK characters retain their existing offsets and bytes.

The implementation requires the runtime's `Intl.Segmenter` with `granularity: 'grapheme'`; it has no code-point fallback and adds no third-party segmentation library. The server keeps the same helper locally because its runtime cannot import shared source. This rule does not reinterpret inline payloads or decide the deferred formula/code coordinate contract.

For existing selection/board receipts, source checks accept either the expanded excerpt or the original UTF-16 slice as a match. This avoids declaring unchanged legacy snapshots drifted solely because of grapheme expansion. Board replay can return the complete cluster for display without rewriting stored snapshot bytes or coordinates. Newly created clipboard ranges can align their UTF-16 bounds with the full excerpt; this is not migration of existing records.

## 5. Unit and document selection (B5/B6/B6b)

`FlowSelection` stores `{ anchor, focus }`, each `{ unitId, offset }`. Direction is retained in those endpoints; consumers derive the ordered range from flow order. The complete flow is used for selected content, including descendants hidden by a collapsed toggle. A folded view does not delete text from the selection's source.

`DocumentFlowSelection` extends both endpoints to `{ blockId, unitId, offset }`. Its order is the actual `visibleBlocks` rendering order, not geometry, IDs or an independent sort. The selected span must remain in one uninterrupted run of mounted, editable, supported TextFlow blocks. Item references, projections, media, read-only or unavailable editors are barriers to extension. Ordinary caret traversal can skip unsupported blocks; selection traversal stops at them.

| Operation | Present behavior |
|---|---|
| Copy | Selected unit text joins with `\n`; selected blocks join with `\n\n`. |
| Delete within a flow | Preserve the earlier unit's identity/role/metadata, join its unselected prefix and the last unit's unselected suffix, and remove the intervening selected units. |
| Delete across blocks | Apply deletion independently to each block; retain separate blocks. |
| Type/paste over a document selection | Delete in each block; insert the replacement string only at the earlier endpoint. This path uses the same flow replacement operation, not a newly defined rich paste parser. |
| Cut | Copy, then the corresponding deletion. |
| Undo/redo | One document operation occupies one existing runtime-history entry containing each affected block's flow and touched range snapshots. |

The Note owns the document selection; mounted editors contribute their live flow and focus operations. Normal clicks/focus changes outside selection traversal clear it. Note changes isolate it, invalid endpoints clear it, and composition guards prevent structural replacement during IME composition. Block merging remains a separate operation.

## 6. Session history and save ordering (B4)

One pending input group feeds the existing Note runtime `reversibleEdit` undo/redo stacks; there is no second TextFlow undo stack. The existing 80-entry cap remains. This is bounded session history, not persisted cross-session history.

Each text transaction contains Note ID, generation, block ID, input metadata, complete before/after flow, before/after selection, and snapshots of touched annotation and board ranges. Annotation snapshots are keyed by annotation ID plus range ID; board snapshots by range ID. Replaying restores those snapshots directly and preserves unrelated later ranges. It does not restore an entire Note's annotations or infer old coordinates by reverse rebasing.

Inputs merge only within the same Note/generation/block/unit, with matching input category, continuous selection and an unchanged connection between the previous after-flow and the next before-flow. Selection movement, unit/block change, paste/drop, Enter/merge, role/indent, slash structure changes, layout operations, blur, leaving the Note and undo/redo boundaries seal the group. Structural operations stand alone. Template conversion snapshots include the existing five block fields (`block_type`, `title`, `content_json`, `plain_text`, `metadata`).

Composition start seals earlier input. During composition the group cannot seal or split structurally; composition end seals the complete input. Ctrl/Cmd+Z/Y in managed TextFlow editors is routed to application history so native undo does not run alongside it; unrelated form inputs keep their native behavior.

Typing finalization, blur saving and history replay use the same ordered queue. A rejected, thrown or stale-generation save leaves the entry and recovery path available. Retrying does not create another entry; replay moves an entry between stacks only after confirmed success in the current scope. Note/generation checks reject old responses, and the existing blur/flush navigation boundary refuses to leave while unresolved saves remain.

## 7. Atomic text-save boundary and revision (B7)

The managed text-saving door is `PUT /api/note-blocks/:id/text-save`:

```text
request
  note_id
  base_revision
  block: { block_type?, title?, content_json?, plain_text?, metadata? }
  annotations: { range_updates: [{ annotation_id, range }] }
  text_ranges: [existing board text-range patches]

response
  block
  annotations
  text_ranges
  revision
```

`content_json` carries the full flow. Empty range-change arrays are valid. The server checks the block/Note context and revision, conditionally updates the block, patches annotation ranges and board ranges, and updates the Note timestamp within one SQLite transaction. A late failure rolls back all those changes. Annotation patches update existing target range identities; they do not replace the Note's complete annotation collection or resurrect independently deleted ranges. Independently deleted board ranges remain absent.

`note_blocks.text_save_revision` is a nonnegative integer, initialized to 0 by migration 063. A successful body update increments it and the composite response returns the resulting revision. A mismatched `base_revision` returns HTTP 409 with `stale_revision` and `details.current_revision`; it does not overwrite newer text. The legacy standalone block-body writer also increments the revision so its writes invalidate old composite bases. Separate annotation and board-range writers remain separate consumers.

The client treats success as confirmed only with a block, matching advanced `revision`/`text_save_revision`, and both range collections. It advances the acknowledged revision after success; failed attempts retain their original base and recovery snapshots. Earlier failed text intents must be saved before later dependent text intents. A committed request whose response is lost remains unconfirmed to the client; this contract does not claim idempotent retry or infer composite success from a body-only read.

For a document edit, blocks save serially through this per-block door. If a block fails, the single history entry remains available and retry resumes incomplete blocks. **There is no cross-block server transaction.** Generic canvas objects, placements, board-owned writes and tool operations across resources are outside this atomicity claim.

## 8. Implementation consistency map

This subset was checked against the following source owners. The links identify implementations rather than promoting historical orders or older draft contracts into current authority.

| Contract area | Source checked |
|---|---|
| Actual fields, roles and status unions | [runtimeDataTypes.ts](../../client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts) |
| Reading, normalization and projection | [textFlowService.ts](../../client/src/pages/Notes/canvasEngine/textFlowService.ts) |
| Derived flow identity | [textFlowIdentity.ts](../../server/src/services/textFlowIdentity.ts) |
| Enter, paste, unit/flow split and merge | [textUnitEditorService.ts](../../client/src/pages/Notes/canvasEngine/textUnitEditorService.ts) |
| Inline retention and degradation evidence | [inlineLifecycle.ts](../../client/src/pages/Notes/canvasEngine/inlineLifecycle.ts) |
| Grapheme boundaries and slice indices | [shared/graphemes.ts](../../shared/graphemes.ts), [server graphemes.ts](../../server/src/services/graphemes.ts) |
| Managed caret, Shift extension and measured hit-testing | [TextBlockProjection.tsx](../../client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx), [textareaNavigation.ts](../../client/src/pages/Notes/canvasEngine/textareaNavigation.ts) |
| Legacy excerpt comparison without migration | [selectionResolve.ts](../../server/src/services/selectionResolve.ts), [boardTextRanges.ts](../../server/src/services/boardTextRanges.ts) |
| Disabled inline commands | [commandSurfaceService.ts](../../client/src/pages/Notes/canvasEngine/commandSurfaceService.ts) |
| Selection order and replacement | [textFlowSelection.ts](../../client/src/pages/Notes/canvasEngine/textFlowSelection.ts), [documentTextFlowSelection.ts](../../client/src/pages/Notes/canvasEngine/documentTextFlowSelection.ts) |
| Navigation and Note selection ownership | [textFlowBlockNavigation.ts](../../client/src/pages/Notes/canvasEngine/textFlowBlockNavigation.ts), [useDocumentTextFlowSelection.ts](../../client/src/pages/Notes/canvasEngine/hooks/useDocumentTextFlowSelection.ts) |
| Input grouping, snapshots and replay/save queue | [textFlowEditSession.ts](../../client/src/pages/Notes/canvasEngine/textFlowEditSession.ts), [useTextFlowHistory.ts](../../client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.ts), [usePlacementHistory.ts](../../client/src/pages/Notes/canvasEngine/hooks/usePlacementHistory.ts) |
| Composite payload, transaction and revision | [atomicTextSaveRepository.ts](../../client/src/pages/Notes/canvasEngine/atomicTextSaveRepository.ts), [atomicTextSave.ts](../../server/src/services/atomicTextSave.ts), [noteBlockContent.ts](../../server/src/services/noteBlockContent.ts) |

The [B9 Result](../agent-ops/handoffs/2026-09-10-v13-5-b9-grapheme-and-contract-order.md#result) records the complete slice-site inventory, tests, document checks and delivery limits. This contract freezes the listed behavior only; future expansion requires an explicit change to scope and implementation.

## Amendment — 2026-09-10 · V13.5 C-fix2 / F17 explicit range history restoration

Authority: [C-fix2 order](../agent-ops/handoffs/2026-09-10-v13-5-c-fix2-order.md). This appended amendment reconciles B4 snapshot replay with the ordinary board-range drift-evidence rule; the frozen sections above are unchanged.

Each touched board-range patch in a history restore through `PUT /api/note-blocks/:id/text-save` carries `history_restore: true`. Undo and redo both use this explicit channel. Only a patch carrying that literal intent may restore its snapshot's status, start/end offsets and `pre_edit_offsets` exactly, including clearing the evidence with `null` on undo and restoring it on redo. The server applies this within the existing body/annotation/range/revision transaction, with the existing scope and revision checks. Independently deleted ranges stay absent.

Ordinary saves omit the intent. An existing drifted range remains drifted and retains its existing pre-edit evidence under the ordinary save rule. A standalone board-range update does not acquire a history-restore channel. Intent belongs to the save request and recovery snapshot, not to the persisted range model; this amendment adds no database migration and changes no drift detection, rebasing, read-time derivation, coordinates or three-state visual behavior.

Only the touched ranges frozen in the history entry receive restore intent. Initial edits and initial template conversions remain ordinary saves. A failed restore retains its entry, explicit failure/retry state, original revision base and same-direction restore intent; retry reuses the frozen ranges rather than adding unrelated later ranges. Confirmed undo/redo alone moves the entry between stacks. The B7 per-block transaction boundary and its cross-block and lost-response limitations remain in force.
