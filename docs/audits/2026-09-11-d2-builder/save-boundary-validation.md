# D2 save boundary validation

Synthetic client fixtures only. No real database was accessed.

Implementation: `App.tsx` now uses `createHashRouter` with the existing hash routes and an `AppRoot` that retains the global overlays. `NoteDetail.tsx` supplies its current runtime handle to `NoteRouteSaveBoundary`. Page-to-page departure waits for dismiss → focus-restoration microtask → synchronous blur → `flushPendingSaves`; success proceeds, failure resets the blocker and reports the existing save-failure toast. A second destination shares the pending flush. Modal close retains the existing host-owned boundary.

Verification command, run from `client/`:

```text
npm.cmd run test:unit -- src/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary.test.tsx src/components/Layout/AppLayout.test.tsx
Test Files  2 passed (2)
Tests       14 passed (14)
```

The new boundary suite has 8 cases: pending navigator departure; note-to-note generation retention; failure and retry; history back; replacement of a pending destination; synchronous refresh initiation without unconditional confirmation; StrictMode and forced unmount; isolated legacy MemoryRouter fixture compatibility. The existing AppLayout suite has 6 cases. React Router emitted its existing v7 future-flag notices; no test failures occurred.

Declared limits: physical browser refresh/close cannot await asynchronous writes or retain the page after a save failure. `beforeunload` synchronously dismisses/blurs and starts the existing save barrier, without an unconditional native confirmation. Forced unmount outside router navigation performs a best-effort drain through the retained runtime handle. These are best-effort paths; normal in-app push/replace/history departure is blocked until the save outcome is known. Production always supplies a data router; isolated MemoryRouter fixtures do not install the router blocker.

Typecheck was also attempted during parallel construction. It reported only two other workstream errors at that moment: the adapter test referenced a missing `fetchNote`, and the chrome test still supplied the removed `chromeCollapsed` prop. The final combined typecheck/build result belongs to the parent builder's completed-tree validation.

## D2 document and chrome integration follow-up

Added four integration cases to `NoteRuntimeDocumentLayer.test.tsx`: one paper header over multiple pages with live left/right insets and explicitly absent print/overview projection headers; title/description edits that change only the outer paper origin with a 208px cap and preserve stored layouts/runtime inputs/article positions; a v2 `page_frame_local` negative-y block kept below the header; and actual pointer-controller conversion against `blockListRef` while header gestures stay outside body draft creation. Geometry assertions use production DOM style inputs in jsdom, with explicit DOM-rectangle mocks for pointer conversion; they are not browser screenshots or physical layout measurements.

Added two chrome cases covering the direct pills versus hidden More entries, the migrated entries' original handlers, and the upward body portal's existing modal recognition attribute.

```text
npm.cmd run test:unit -- src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx
Test Files  2 passed (2)
Tests       25 passed (25)
```

Client `node node_modules/typescript/bin/tsc --noEmit` passed during this follow-up after the parallel workstream errors above were repaired. Parent builder owns the final full-tree gate/build receipt.

## Final save audit and pending-input repair

The final read-through found that editing could continue during a slow departure save. The boundary now temporarily holds note and floating-portal input, preserves dismiss → microtask → blur ordering, and then makes the page runtime inert until the drain completes. Success, failure, and forced unmount release the barrier. A ninth regression case verifies cancellation of the browser's `beforeinput` default edit for the page and portal during saving, editable recovery after failure, and normal input on the next route.

```text
npm.cmd run test:unit -- src/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary.test.tsx src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx
Test Files  2 passed (2)
Tests       22 passed (22)

node node_modules/typescript/bin/tsc --noEmit
exit 0
```

The final boundary suite contains 9 cases. Same-path query/hash changes do not invoke the blocker and do not currently replace the note runtime. Forced unmount outside normal router departure only attempts a drain; teardown may already have invalidated the TextFlow scope, so this path cannot promise persistence of an unregistered draft or reproduce a pre-unmount blur. Physical browser refresh/close retains the best-effort limitation stated above.
