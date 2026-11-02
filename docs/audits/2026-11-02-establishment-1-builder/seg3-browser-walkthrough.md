# Segment 3 browser walkthrough

Environment: local dev client plus a scratch server and scratch account, app browser at 1024x768. The server ran with model access switched off (`NODE_TEST_CONTEXT` set and every provider key blank), so no model could be reached; its log shows `purpose_drafter_disabled_under_test` for the draft. The Project was created for this run through the real routes.

| Check | Observed |
|---|---|
| Upload to a Project with no purpose | 201; card `研读《宏观经济学期末复习》`, `draft_status=failed` (the switched-off drafter), 1 member |
| Section placement | Directly under the Project title, above Notes and Goals |
| Importer card with no words | "(inferred at import)" badge |
| Failed draft | "The draft could not be generated." plus "Draft again" |
| Lock icon | One click, no dialog: `aria-pressed` true and Locked badge; the failed state settles |
| Redraft while locked | HTTP 409 `purpose_interpretation_locked` (direct request; the card hides the button once settled) |
| Unlock | One click: `aria-pressed` false |
| Edit interpretation | Button reads "Save and lock"; saved text shown; lock on |
| Original words | Saved with surrounding spaces intact; badge gone |
| Member count | 2, after adding an item member directly in the scratch database |
| Recent activity | 5 newest shown; item edit appears as "Edited / Edited item", a real action on a member |
| Put away | Card leaves the section; count 0, "No purposes yet" |
| PATCH `status=active` | 200; the card is back in the active list with count, lock and words unchanged |
| Chinese copy | Not re-walked here; keys are present in both locale files |

Not exercised: a successful draft (only stubs in the automated tests; no model run), rating traces on the card (out of scope by the order: cards and purposes have no bridge), citing through the real group panel (covered by route tests in segment 1).

The ledger summary line was reworded after this walkthrough, so the summaries now read "Amended purpose: interpretation, locked" rather than the card title. A test covers the new wording.
