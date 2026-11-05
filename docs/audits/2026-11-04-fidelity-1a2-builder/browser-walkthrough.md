# Fidelity 1a-2: browser walkthrough

Environment: local dev client plus a scratch server and scratch account, app browser at 1024x768. The server ran with model access off. **`soffice` is not installed on this machine**, so `COINCIDES_DOCX_PDF_COMMAND_JSON` pointed at a stand-in script that writes a fixed three-page PDF and ignores the docx's layout. What this proves is the path around the converter, not LibreOffice's output: formula and image fidelity were not seen.

Observed on this run:

| Item | Check | Observed |
|---|---|---|
| D1 | Older docx (no images yet), converter configured | Register `supported: true, status: none`; note opens in Text; Text/Pages toggle present |
| D1 | Pages, then "Generate original page images" | 3 page slots, status `complete`, image natural width 1240; derived PDF at `<user>/derived/<file id>.pdf`; `.derived-runs` empty |
| D1 | Markdown Source on the same server | `supported: false`, no toggle |
| D1 | Text projection | Still readable beside the pages; conversion notice still shows in both views |
| D2 | Docx, tab closed and reopened | Opens on Pages |
| D2 | PDF, new tab, no memory | Opens on Pages, image natural width 1240 |
| D2 | PDF: Pages, then Text, then a chip jump to page 3, Text, Pages | Jump lands; returning to Pages keeps the same scroll position (2015) |
| D3 | Reading, mouse elsewhere | Chip `opacity: 0`, `position: absolute`, `pointer-events: none`, no visible chip; markdown blocks 57, 36, 36 px tall |
| D3 | Real mouse hover on a block | Chip shows at the block's lower right; leaves when the mouse leaves |
| D3 | Focus moved to the chip group | Chip shows (seen in a screenshot) |
| D3 | Hover on a 1149 px block taller than the window | Chip with "Original page" stays on screen, clear of the Groups button |
| D3 | Click "Original page" on page 3's chip | Pages view at page 3 |

Not exercised in the browser: a real conversion; kill and resume, converter failure, timeout and deletion (server tests only); pressing Tab through chips with a real keyboard (focus was moved by script; `tabIndex` is covered by a component test); the paginated strip (no projection on this run used it: `data-page-flow-sources` count was 0, so it has a component test only); Chinese copy (no new copy added).

One limit found: the sticky anchor sits inside the scaled paper, and at this window size the chip stuck at mid-window rather than just above the toolbar. It stays inside its block in every case, so the worst outcome is the chip at the block's own lower corner, possibly off screen on a very tall block.

Earlier in this run the chip was clipped by the floating Groups button at this window width, so it now keeps 44 px from the block's right edge.
