# Segment 2 browser walkthrough

Environment: local dev client plus a scratch server and scratch account (`f4-scratch`), Chrome-based app browser, viewport 1024x768. Samples: IELTS reading (46 pages), IELTS listening (33 pages), a text file, a hand-built PDF with non-embedded Chinese. Island and user databases were not touched.

The pane was hidden during the run. `image.decode()` and `requestAnimationFrame` wait for a rendered frame there, so readings were taken after a screenshot woke the page. This was seen only in the hidden pane.

| Check | Observed |
|---|---|
| Toggle on a PDF Source | Toolbar shows Text / Pages; 46 "Original page" jump actions |
| Page count and order | 46 shells, numbered 1 to 46 |
| Aspect ratio | Image 1240x1753; shell ratio matches the register |
| Lazy window | 2 images at the top of 46 pages; 3 images (11, 12, 13) after a jump to page 12 |
| Text to Pages and back | Main scroll 3000 before, 3000 after |
| Jump "Source p.12" | Page 12 top is 1px from the viewport top |
| Tab memory | Page 7 in pages mode, away to another tab and back: pages mode, page 7 top at 0 |
| Per-note view state | The other tab stays in text mode |
| Agent focus, pages active | `note_page` index 19 scrolls to page 20, highlights it, consumes the command |
| Agent focus, another note | Ignored |
| Agent focus, `note_block` | Returns to text and highlights the block |
| Older Source (`status=none`) | Pages view shows the generate entry; no jump action on the chips |
| Generate | Progress 0/33, 11/33, 29/33, then complete with 33 ready pages |
| Page that cannot be drawn | Page says it could not be generated; header shows the count and a retry |
| Text-file Source | No toggle, no jump action |
| Chinese copy | Toggle, entry, progress and failure text all in Chinese |
| In-app tab navigation | No save-failure toast |

Not exercised in this browser run: restart during generation (segment 1 covers it end to end), a real textbook, a note outside the Source chain (covered by a unit test that asserts no request and no view).

The jump button was moved into its own component after this walkthrough. The automated tests cover that version; the walkthrough was not repeated.
