# Board tools smoke fixture

From `client`, run `node scripts/boardToolsSmoke/start.mjs`, then open the printed loopback URL.
The fixture runs production BoardPage, useBoard and boardRepository with an in-memory transport.
Vite environment loading is disabled. No application backend or database is used.

- Empty sample: draw three strokes, erase two in one gesture, undo/redo.
- Group sample: marquee all three objects, drag; the pinned card stays. Undo once. Shift-click toggles selection.
- Mixed sample: select A, its horizontal edge and the drawing with Shift. Delete confirmation counts one card, both connected edges (including the unselected diagonal edge), and one drawing. Undo restores only the drawing.
- Reopen saved board remounts the page against the same memory data and clears history.
- Synthetic saved state exposes fixture geometry, IDs, writes and simulated events for inspection. The existing server route suite separately verifies real cascade and `unmounted` behavior with its isolated database.

The six automated workflows live in `src/pages/Boards/BoardPage.tools.test.tsx` and share this transport.
