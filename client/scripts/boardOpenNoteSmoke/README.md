# V13.4 S6 browser smoke fixture

Run from the repository root:

```powershell
node client/scripts/boardOpenNoteSmoke/start.mjs
```

Open `http://127.0.0.1:5186/scripts/boardOpenNoteSmoke/index.html#/boards/open-smoke-board`.
This fixture uses the production BoardPage, runtime provider, runtime controller and document layers. Only API transport is replaced. `configFile: false` and `envFile: false` prevent Vite from loading application configuration or environment files. No backend or database is attached; unmapped API requests reject. State survives reload only under the fixture's own sessionStorage key. “Reset sample” restores its two synthetic notes, two note cards and one active text-range card.

The full-page destination mounts the real note runtime using the route's note ID, following the existing pageReadingSmoke assembly. This does not claim to validate the unrelated production NoteDetail shell.

## Six browser journeys

Use the actual UI for the gestures and text input. Observe the condition after each action; no fixed delay is needed. The original source body is `Preface. The selected passage stays alive. Closing words.`. Its reference covers `The selected passage stays alive.`. The source note card is `[data-testid="board-member-open-smoke-member-0"]`; the second is `...-1`; the reference is `...-range`.

1. Double-click the source note card. Verify the route remains `/boards/open-smoke-board`, there is one note modal, and its editable textarea `[data-block-id="open-smoke-block-a"][data-text-unit-id="tu-1"]` contains the source body. Inspect that the board remains visible around the large centered modal and that its content can scroll.
2. In the modal textarea, append ` Saved in the modal.`. Close with the X control. Verify the modal disappears; select the same card and click **Enter note**. Verify the route is `/notes/open-smoke-note-a` and the full-page runtime contains the appended text. Use **Fixture board** to return.
3. Double-click the source card, then focus a modal header button and press Delete, Backspace and the arrow keys. Also press Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z. Verify the three board members and their geometry remain unchanged in the diagnostic output, and that no board member DELETE/PATCH was issued. A key press in the note textarea may edit note content; the assertion concerns the board.
4. Click **Open full page**. Verify the route is `/notes/open-smoke-note-a`, the real source body is visible and the modal has unmounted. Return using **Fixture board**.
5. Reopen the source modal, append ` Escape saved this.` and press Escape. Verify the modal disappears, the source card preview now contains the appended body, and the diagnostic call trace shows the body PUT (and any dirty range PUT) committed before the board GET and `/notes/open-smoke-note-a/blocks` preview GET. The mock never rewrites note.description from a body save.
6. Reopen the source modal. Put the caret inside the referenced sentence, immediately after `selected`, and type ` revised`. Escape back to the board. Verify the reference card reads `The selected revised passage stays alive.`, remains active, and the diagnostic range excerpt/offsets agree. The trace must show body PUT commit → range PUT commit → board GET. The rebase algorithm is production code; the fixture only persists the provided range receipt and derives its readable reference.

## HQ close-protocol checks

The bottom-right **Synthetic transport controls and evidence** disclosure has deterministic transport controls. These only affect this fixture's Axios adapter. Its UI state is updated by fixture transport events; no product event, timer or GET polling is added. The controls now use a fixture-only `data-canvas-layer="floating-overlay"` root so Release/Reject remain interactable while the product modal retains a held write. No production click guard changed. These test controls are outside the product navigation inventory. **Populate navigation targets** and **Reset sample** refuse to reset state while the note modal is mounted.

- **Pending observation:** Configure a held body or range write; keep the diagnostic disclosure expanded. Request close after editing and observe Saving, the retained modal and no early board GET. Click **Release held write** and verify the write commits before the modal closes and the board rereads. Report only browser actions actually observed; unit tests separately cover the four close paths.
- **Load error:** On the board, click **Fail next note load**, then open either note. Verify the error stays inside the modal at the same board route; use its return/close control to return to the board. The failure switch only rejects the next exact `GET /notes/:id`, not the board or preview reads.
- **Failure:** Click **Fail next body write** (or **Fail next range write**), edit the corresponding source text and request close. Verify the modal remains, the existing save error is visible and **Close anyway** appears. That explicit exit should close it; failed body content is absent on full-page reopen. A range failure can leave the body saved and the old range drifted, which the diagnostic intentionally exposes.
- **Switch:** With one note open, double-click the visible part of the other note card. Verify it mounts only after the first closes successfully and the runtime count never exceeds one. With a preconfigured failure, verify the first stays open until **Close anyway** or a successful retry.
- **Transient UI:** Open a slash menu or runtime floating overlay before requesting close. Verify the first close request dismisses that UI, blurs the active editor and follows the same wait protocol. Inspect that body scrolling is restored on X, Escape, switch completion and full-page navigation; the page route's preexisting close behavior is outside this fixture's scope.

Read `[data-testid="open-note-smoke-diagnostic"]` for the complete synthetic request history (`sequence` + `started`/`committed`/`rejected`), durable text, range receipts, card geometry, board GET count and board writes. Browser observations are the evidence; merely starting this fixture is not a PASS.

## Prior stop-line reproduction (2026-09-09, before HQ addendum two)

Configure **Hold next body write**, open the source note, append text, and click **Groups** so blur starts the held PUT. Click **Open Group Gallery**. The production callback navigates directly to `/group-gallery`; this fixture's fallback route returns to the board. The modal has already unmounted while the diagnostic still says `heldWrite: "body"`, and the persisted block still has its previous text. The outside controls are reachable again; **Reject held write** settles this synthetic probe. This is evidence of an unguarded runtime navigation path, not a passing close protocol. See the new Result after HQ addendum one in the handoff for scope and other uncovered subsystems.

## Journey 7: navigation isolation after HQ addendum two

The prior reproduction above is historical evidence. The following procedure verifies the repaired production paths; it does not itself declare a PASS.

1. **Reset sample** on the board, expand the transport disclosure, then click **Populate navigation targets**. This optional scenario adds `Synthetic navigation group`, a synthetic Tray paragraph and a synthetic Tray shape to the source note. It seeds an explicitly synthetic completed relocation receipt so the production Tray shows **Open board**, and returns an empty board list so **Create a board** can be exposed. The original two note bodies, three board cards, geometry and active range remain unchanged. Reset removes the optional scenario.
2. Open the source note, open **Tray**, select the checkbox beside `Synthetic tray block for navigation targets.`, and click **Create note from selection**. The synthetic split response follows the real Tray controller and makes **Open new note** appear. Select the checkbox labelled **Select shape for board** to expose **Create a board**. All three Tray navigation entries should now be visible, disabled and titled `Open full page to use this`. The seeded relocation is fixture setup, not evidence of a real board relocation.

   Before the split, the Tray count must be **2** (paragraph and shape). The fixture supplies the paragraph's persisted object/placement/mount records as well as its note block; generated engine projections alone are not the Tray's input. A count of 1 means this fixture setup is incomplete and is not evidence about navigation isolation.
3. Click **Hold next body write**, append ` Pending navigation isolation probe.` to the original source paragraph, then click **Groups** to blur it. Confirm diagnostic `heldWrite` is `body`, the source body in diagnostic storage lacks the new probe, and the source PUT has a started entry without a committed/rejected entry.
4. Inspect and attempt the runtime navigation entries while that PUT is held: **Open Group Gallery**; expand the **Note groups** folder selector for **Open full Gallery**; expand **Synthetic navigation group** for **Open editor**; inspect all three Tray entries from step 2; open **More note actions** and inspect **Delete note**. Each disabled entry must carry the title above, the route must stay at the board, and the note modal must remain mounted. **Item tools** opens a local workbench and remains usable with its writes registered; it does not navigate. Local panel Close controls are allowed to close panels without closing the note. Keep the held diagnostic visible after these attempts.
5. Click **Open full page** (or request an ordinary X/Escape close in a separate run). Confirm Saving, retained modal, unchanged route and no board/preview reload while the request is held. Click **Release held write** in the fixture controls. Verify body/range writes commit before the requested transition occurs; for Open full page the destination must be `/notes/open-smoke-note-a` with the probe present. A rejection should instead retain the modal and expose the existing explicit **Close anyway** error path.

Repeat journeys 3 and 5 from a reset sample for the required keyboard and Escape preview regression. This fixture exercises a real UI with synthetic transport; it does not validate production AppLayout routing, browser tab closure, a real backend or user databases.
