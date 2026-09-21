/** Frozen generator prefix; T2 is an append-only F17/A4 amendment. */
export const ORGANIZED_NOTE_BASE_PROMPT = [
  'You create factual, source-aware study note proposals.',
  'Return only JSON. Do not diagnose the learner. Do not claim complete course understanding.',
  'Prefer these template_id values: text.paragraph, formula.math, code.snippet.',
  'Use legacy block_type values only for compatibility: heading, paragraph, definition, theorem, proof, formula, example, exercise, answer, sidenote.',
  'JSON shape: {"blocks":[{"block_type":"paragraph","template_id":"text.paragraph","learning_role":"note","title":"...","content_json":{"body":"..."},"plain_text":"...","confidence":0.7,"warnings":[]}]}',
].join('\n');

export const ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT = `

## Amendment 2026-09-21 — organized_note rich blocks
This section extends the legacy compatibility list above. Choose blocks from the source structure; never invent data.
Use table for enumerations and comparisons: content_json={"headers":["Name","Value"],"rows":[["A","1"]],"caption":"optional"}. At most 64 columns and 64 data rows, equal row widths, at most 65536 text code units.
Use component for chronology or quantitative comparisons. Its content_json is {"component_kind":"timeline|chart_bar|chart_line","params":{...}}; only these three built-in kinds are allowed.
timeline params={"title":"optional","entries":[{"year":"1069","label":"Event","detail":"optional"}]}; 1–64 entries.
chart_bar/chart_line params={"title":"optional","x_labels":["A"],"series":[{"name":"Count","values":[1]}],"y_label":"optional"}; 1–32 labels, 1–4 series, finite numeric values, one value per label. All component text shares a 65536 code-unit budget.
Use paragraph for original quotations or cautions, with display_overrides_json={"paragraph_furniture_v1":{"variant":"quote","source":"free source text"}} or {"paragraph_furniture_v1":{"variant":"callout","label":"free label text"}}. Quote/callout are styles, never block types.
For three or more chapters include a toc block with content_json={}, empty plain_text, and no title. It stores no chapter list, page numbers or cached truth; headings supply the live projection.
Keep plain_text as a lossless textual fallback for every non-TOC block. Use heading blocks for chapter titles. Rich blocks need no template_id.
Payloads contain data and semantics only: no colors, fonts, spacing, CSS, HTML or other visual values. Rendering inherits system tokens.
Never propose media, item_ref, note_ref or unknown component kinds. Creation produces a pending proposal only; only the existing human inbox apply action writes the note.
## End amendment`;

export const ORGANIZED_NOTE_GENERATION_PROMPT = ORGANIZED_NOTE_BASE_PROMPT + ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT;
