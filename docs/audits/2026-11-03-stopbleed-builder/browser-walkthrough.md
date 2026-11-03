# Stopbleed four: browser walkthrough

Environment: local dev client plus a scratch server and scratch account, app browser at 1024x768. The server ran with model access switched off (`NODE_TEST_CONTEXT` set, every provider key blank). The walkthrough zip was uploaded through `POST /api/sources/upload` by a script on the same scratch server, not through the page's upload control. Its docx was generated with OMML formulas; no real-world docx was used.

| Item | Check | Observed |
|---|---|---|
| 3 zip | Upload `walk.zip` (docx + txt), no restart, no materialize call | Both entries `materialized`; `walk.zip` stays `received`, shown as "Original only" |
| 1 warnings | Detail API | `formula-entry.docx` `has_parser_messages=true`; `plain-entry.txt` and `walk.zip` false |
| 1 warnings | Source Library rows | Badge "Incomplete conversion" on the docx row only |
| 1 warnings | Source detail dialog | Notice present in Extraction |
| 1 warnings | Projection note | Banner at the top of the formula note, above body text "PV = ="; absent on the plain projection |
| 2 split | Project with 2 projections, 0 handwritten | "Notes 0", "No notes yet.", "Source projections (2)", New Note still present |
| 2 split | Toggle on | Two cards with SOURCE badge; `aria-pressed` true and a filled style; off again hides them |
| 2 split | Open a projection card | Goes to the read-only note |
| 2 split | Project with 2 handwritten notes, 0 projections | Both listed; no toggle |
| 4 sidebar | Cleared record | No Recent section; no Favorites section |
| 4 sidebar | Open A, then B, then A | Recent, newest first, after each step: [A], then [B, A], then [A, B] |
| 4 sidebar | Reload | Order retained |
| Copy | Chinese, switched through the i18n instance in the page | Toggle "源件投影 (2)", badge "源件投影", banner and row badge as ruled, "最近" present, "收藏" absent |

Not exercised in the browser: rebuilding an older projection (server test only), the Source panel's 3-second poll flipping live, storage blocked (component test only), scroll behaviour of the banner on a long note.

Seen on the way, not changed:
- The trash button on a projection card returns 409 and shows "Failed to move note to trash".
- Setting the URL hash straight from one note to another shows "Changes could not be saved. Please retry before leaving the note." with no failed save request. It reproduced with two handwritten notes, so no projection or banner is needed. Clicking the document tab between the same notes, and leaving through the sidebar, showed nothing. It was not compared against the previous commit.
