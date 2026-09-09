# Board layers smoke fixture

From `client`, run `node scripts/boardLayersSmoke/start.mjs` and open the printed loopback URL.
The fixture renders production BoardPage/useBoard/repository with synthetic memory transport.
Vite environment loading is disabled, and no application backend or database is attached.

- Empty sample: add two layers, rename one by double-clicking its name, select an active layer, draw pen and chalk.
- Overlap sample: open Layers and drag Ideas/Evidence order. The overlapping cards exchange foreground. Reopen saved board to reread the saved order.
- Cross-layer sample: hide Ideas; A and its edge disappear, while the staging row remains. Marquee cannot select A. Show Ideas to restore A and the edge. Delete Ideas and confirm the object count; objects return to Base with the same geometry.
- Selection sample: marquee the three objects, use Move to layer, and press Ctrl+Z once to restore all original layer assignments.
- Legacy sample: every object has `layer_id: null`. Compare edges, ink, chalk and cards with the existing tools fixture and smoke assertions.
- Reopen saved board preserves this fixture's in-memory data while remounting the page and clearing session history.
- Synthetic saved state shows layers, geometry, writes and events. This fixture checks browser behavior; isolated server tests separately check database persistence.

The six automated workflows are in `src/pages/Boards/BoardPage.layers.test.tsx`.
