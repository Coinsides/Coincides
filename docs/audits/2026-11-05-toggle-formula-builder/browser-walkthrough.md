# Toggle and formula order: browser walkthrough

Environment: local dev client plus a scratch server on a brand-new database and a scratch account, app browser. `coordinate_contract` read `v2`. Model access off. **This run used the real LibreOffice**, `C:\Program Files\LibreOffice\program\soffice.exe`, through `COINCIDES_DOCX_PDF_COMMAND_JSON` with `--headless --norestore -env:UserInstallation={profile_url} --convert-to pdf --outdir {outdir} {input}`. The documents were synthetic: Chinese text, inline and display OMML, nested fractions, a root, a sum. Henry's own file was not used, and the island was not touched.

## V1: reproducing "cannot get back to the original pages"

Real mouse unless noted. Before the fix.

| Path | Width | Result |
|---|---|---|
| Pages, Text, Pages | 1024 | Works; the Pages button is in the bottom toolbar |
| Text, click into a block (textarea focused), Pages | 1024 | Works |
| Text, wheel to scrollTop 1000, Pages | 1600 | Works; returns to the pages |
| Text, reload | 1600 | Comes back on Pages (tab memory is not persisted) |
| **Pages, Text** | **700** | **The Pages button is gone.** Both toolbar buttons report width 0 at (0, 0); the paper group is folded behind a small button labelled only "纸" |
| Same, PDF | 700 | Same: both buttons width 0 in the text view |
| Round 16 client `0a921892`, scratch copy against the same server | 700 | Same: buttons width 0 in the text view until "纸" is expanded |

So the answer to the order's question: **the button is not there**, on windows at or under 760 CSS pixels. It is not disabled, not unresponsive, and nothing bounces back. PDF and docx behave the same, from any path, because the rule is only the window width.

Source: the fold rule arrived with the toolbar in `987609c9` (2026-09-20), and the toggle moved into that group in `ad108ef2` (2026-11-02). Round 16 already had it. D2 and P2 did not introduce it. D2 made it easy to reach: people now start on Pages, whose header shows the toggle, and lose it on the way to Text. On a wider window the toggle also jumps from the top right to the bottom toolbar between the two views.

A second path, found by Tester(1) on the island build (`b7ebfb5b`), real Chrome: turn Layout on in a handwritten note, go to a projection without reloading, switch to Text. Pages and Layout are both disabled and do not respond. Layout state survives the note change because the runtime is not remounted, the Pages button was disabled during Layout (`ad108ef2`), and a read-only note disables the Layout button that could end it. It affects docx and PDF, at any width. This builder had not found this path.

**Limit: which path Henry was on is not known.** Both fit his report, and nothing here proves either. Tester(1) has asked Main_Designer to check with him. The narrow-window path and the Layout path are both fixed below.

## After the fix

| Check | Width | Result |
|---|---|---|
| Text view | 700 | Text/Pages at the top right; both hit-test as the topmost element |
| Click Pages in it (real mouse) | 700 | Pages view; memory stays pages |
| Text view scrolled to 1500 and to 2500 by wheel | 1280 | Toggle stays at y 45, top right, both buttons hit |
| Pages view | 700 | The header toggle, as before |
| Layout on in a handwritten note (real click), go to a projection by hash | 1024 | Layout false on arrival; opens on Pages |
| Then Text, then Pages (real clicks) | 1024 | Both enabled; returns to Pages |
| Back to the handwritten note | 1024 | Layout is off; the button is enabled |

## F1: formulas in the text view

| Check | Result |
|---|---|
| New docx through real conversion, 8 to 10 s for 3 pages | Text blocks below; original pages show the rendered formulas |
| Inline | `永续年金的现值 PV = $\frac{C}{i}$ = 面值的折现结果。` |
| Display | `$PV=\sum_{t=1}^{T}{\frac{{C}_{t}}{{(1+i)}^{t}}}$` |
| Nested, root, Chinese around | `嵌套分式:$\frac{1}{\frac{1}{1+x}}$ 与根号 $\sqrt{{σ}^{2}}$ 同行。` |
| Conversion notice on a formula-only docx | None |
| Older docx, rematerialize with confirm | New note id; text now holds the formulas; 3 page images kept |

The text view shows the LaTeX source as text, not rendered formulas, as the order specified.

A docx with `w:pStyle="Heading1"` and no `styles.xml` still showed the notice, for "Paragraph style with ID Heading1 was referenced but not defined". That warning means no lost content; see the Result.

## Environment note

The first real conversion on this machine exited 0 with no PDF and no output, because the scratch folder's path was too deep for LibreOffice's profile directory on Windows. Moving the data to a short path fixed it; the same command worked at the shallower path and failed at the deeper one, with the folder name `.derived-runs` working at the short path. This run's data and copies have been removed.

Not exercised: Henry's file, the island, Linux, the Chinese copy of the toggle (no copy changed), real Tab key.
