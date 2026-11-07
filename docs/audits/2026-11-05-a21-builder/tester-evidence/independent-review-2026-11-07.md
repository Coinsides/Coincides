> **状态 (Status)**: active
> **层 (Layer)**: 核验证据（独立复核原文）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否（原始复核记录；判语与裁定见上级目录 review-tester.md）

# 编辑器组独立复核：原始记录（英文）

四个查找方向（buffer、handoff、commit、leads）各出 finding，每条由两个独立反驳视角（复现、可达）投票，最后一个完整性批评者给出场景。全程只读副本，测试文件跑完即删。22 条判过，21 条站住（confirmed 或 plausible），1 条被驳回。文中路径指 Tester 的 scratch 副本，行号对应快照 HEAD f7dd74ac 加 15 个未提交文件。


# AREA buffer

## coverage
I read structureTypingBuffer.ts, structureTypingFocus.ts and all of the after-tree useHeadingStructureController.ts, and diffed them against the before tree. I also read the useNoteCanvasRuntimeController and BlockEditorLayer changes, the applyEdit/boundary/flush/extract/move/session code in useTextFlowHistory, headingInputService, the per-block unit id scheme, useNoteRouteSaveBoundary, and the slash-controller draft-text effect.

Seven findings. Six were reproduced with vitest in the scratch copy against the real hooks, using the existing useHeadingStructureController.test harness: leave after Enter, second-structure stall, restore into the wrong block, kept words wiped, reorder after failure, box anchored over another block. One (no restore after returning from an empty note) is reasoned only.

The review folder src/__review__/find-buffer/ has been deleted (the empty __review__ parent folder remains), and node_modules is untouched. No browser was used, so how often these happen in the real app is inferred.

Answers to the brief:
- placeOnLiveText: can reorder and drop deletions on failure (finding 5).
- previousBuffer close: drops kept words (finding 4) and is the hand-over in findings 1 and 2.
- Enter-in-window early return: findings 1 and 2.
- Stored words applied twice: only via a narrow path. A box kept earlier hands over to a second structure, and a reload or unguarded leave follows after that structure's first edit; the old stored copy is never forgotten, so it is re-applied on reopen and the words appear twice. Not tested.
- Reused unit id: finding 3 (data) and finding 6 (display).
- editorFor fallback: pre-existing raw-offset focus on split units. The fallback to the block's last editor can treat a block as ready before the target unit's editor mounts. Not reproduced.
- Composition callbacks: close() clears them, but retain() keeps queued ones, and a late compositionend runs placeTyped on whatever buffer is current. This needs an unguarded note change mid-composition. Lead only.
- Timers after unmount: guarded by buffer.current checks.
- Account switch: if logout clears the user before the window ends, retainWords stores under 'anonymous', so the owner never gets the words back and they stay visible on the login screen until the next sign-in. Lead only.

## open_question
The 1-of-28 loss (no Enter in the window) is not explained; I could not reproduce it.

Two code paths in this change end the same way: an empty heading, the words gone, and no notice or stored copy.

(a) The words are handed to a second structure, whose box treats them as already present (useHeadingStructureController.ts:353-357 and :150-151). If that structure dies before its first edit, the box closes as unchanged. Without Enter this path is taken only if placement sees the heading still sharing a block with 'warmup'. That happens when it falls back to the starting block after a run step returned false after the role edit; for example extractUnit returns false when boundary() is false (useTextFlowHistory.ts:727). That would also show the 'Heading changes could not be completed' toast.

(b) Another commitStructure starts while the first box is still waiting to place. Placement can wait up to 3 s for the editor and polls while canApplyEdit is false. :148-149 closes the box and its words silently. The only automatic source of a structure is the new draft-text useLayoutEffect in useSlashCommandController. It fires on every draftOwnerReconciliation change, and in-app entry has a different draft lifecycle (your bk2 note).

To tell them apart in one more sample: record whether the toast appeared and whether a [data-structure-typing-notice] or the localStorage key coincides:unplaced-words:<user>:<note> existed afterwards (if either did, the words were kept, not lost). Also count commitStructure calls: two calls point to (a) or (b).


## [buffer-0] confirmed | Leaving a note right after Enter in the window drops the body words
sev=major pre=yes repro=True standing=2

**user_scenario**: On a slow window, type '# Title' Enter 'Body' quickly so Enter and 'Body' land in the words box. Then click another note, a tab, or close the board modal while the heading is still committing. The leave waits, then proceeds, and 'Body' is never written. No notice and no stored copy.

**mechanism**: placeTyped sees '\n' after a heading and hands the words to a second structure (useHeadingStructureController.ts:353-357). That call closes the first box and opens a new one whose initialText already contains the words (:148-151), then calls settled() (:356). whenTypingSettled (:422-425), awaited first in flushPendingSaves (useNoteCanvasRuntimeController.ts:848), resolves at this hand-over, before the second structure has applied anything. textHistory.flush finds nothing queued and the route proceeds (useNoteRouteSaveBoundary.tsx:66). On noteId change, leaveBuffer (:108-115) sees the new box as unchanged (text === initialText), closes it without retaining, and the second structure stops at !current().

**repro**: Real hook, real useTextFlowHistory and usePlacementHistory, with the useHeadingStructureController.test harness. Call splitHeading, type '\nBody' into the box, call whenTypingSettled().then(() => flush().then(unmount)). At settle: isBusy()=true and the box holds 'Body' (the second structure's). After unmount the blocks read 'Intro / Sec / End', there is no notice and readUnplacedWords('note') is null. Control without Enter: 'SecBody' is written.

**user_impact**: Silent loss of the first words of the body under a heading. This is the exact leave path the change set out to cover. Before the change, leaving mid-window also lost words, so the fix is incomplete for Enter in the window.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:353-357', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:148-151', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:422-425', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:108-115', 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts:848']

**vote0** refuted=False repro=True reach=True nw=no sev=major
I could not refute this finding. It reproduces with the real hooks: useHeadingStructureController, useTextFlowHistory and usePlacementHistory, plus the shipped harness's persistence fakes. I changed one thing in that harness: noteId became a prop, so a note-to-note route change can be modelled as a rerender rather than only as an unmount. In the app, notes/:noteId keeps NoteDetailPage mounted (App.tsx:111, NoteDetail.tsx:19-21), so a switch changes noteId and the runtime stays mounted.

How I modelled the leave: I followed the route boundary order (useNoteRouteSaveBoundary.tsx:66, :94). First await heading.whenTypingSettled(), then editing.flush(), then switch noteId or unmount.

Results:
- The split from the shipped splitHeading harness with "\nBody" typed in the box. At the point it settles, isBusy()=true, the box holds "Body", and the blocks are still Intro/Sec/End. After a note switch the blocks stay ["Intro","Sec","End"]. Nothing arrives, there is no notice, readUnplacedWords('note') is null and the box is gone. This held with 0, 20 and 60 ms between flush and navigation.
- Unmount (tab or modal close): lost at 0 and 20 ms. At 60 ms the words were saved once, unsplit, as "Sec\nBody". This is the timing race already ruled on.
- The user's exact scenario: "# " on an empty heading, then "Title\nBody" in the box, then a note switch. The note ends with an empty heading_1 block. Both "Title" and "Body" are lost silently.
- Control without Enter: "SecBody" is written under both a switch and an unmount.

Mechanism, after tree:
1. placeTyped splits on '\n' and hands the words to a second structure (useHeadingStructureController.ts:353-356).
2. commitStructure closes the old box and opens a new one whose initialText already holds the words (:148-151), so changed() is false.
3. placeTyped then calls settled() (:356). whenTypingSettled (:422-425), which flushPendingSaves awaits first (useNoteCanvasRuntimeController.ts:848), resolves at that point. The second structure is still waiting for a frame and has queued no write, so flush, whenDraftIdle and whenIdle have nothing to wait for. The route proceeds.
4. On the noteId change, the cleanup leaveBuffer (:108-115, :116-119) closes the unchanged box without keeping it, and resets activeRun, so the run stops at the next current() check (:183).

Reachability: the tester confirmed that in-app leaves (a tab or a link) wait for the window, and that Enter inside the window splits correctly. The combination needs Enter typed in the window and a leave that starts before the hand-off. The hand-off comes after the first structure ends, plus up to 3 s of editor polling (EDITOR_WAIT_MS). The window is about 0.4–1.2 s normally and longer on a slow network. That is narrow, but people can do it. I only reasoned about the real browser; the reproduction is in hooks.

Before the change: the pre tree drops window keys whenever the note is left (replay only runs while noteId === session), and flushPendingSaves did not wait. The tester saw the same loss before the change ("修前同场景丢字、标题空"). So this is not new and not worse. But the change set out to fix exactly this leave path, and the receipt claims "应用内点链接切走 | 离开等窗口结束,落库", which fails once Enter is typed in the window. The cause is the early settled() at :356 together with the unchanged-box close at :112-113.

It does not explain the tester's 1-of-28 loss: that case had no Enter. I deleted the test folder src/__review__/verify-buffer-0-repro/ afterwards.

**vote1** refuted=False repro=True reach=True nw=no sev=minor
The finder read the mechanism correctly, and I reproduced the loss on the real note-to-note path. The loss is not new: the before tree loses the same words. It stands because it is a gap in a path the change claims to have fixed.

Mechanism, checked against the after tree:
- When window 1 ends, placeTyped splits at the '\n' and gets a structure request from headingStructureRequestForEdit, because the heading block now holds two live units (useHeadingStructureController.ts:353).
- commitStructure runs synchronously up to its first await. It closes box 1 and opens box 2, whose initialText is the focus unit's text, "Body" (:148-151). So box 2 counts as unchanged.
- placeTyped then closes box 1 and calls settled() (:356). That resolves whenTypingSettled (:422-425), which flushPendingSaves awaits first (useNoteCanvasRuntimeController.ts:848).
- The rest of flushPendingSaves has nothing in flight and resolves within microtasks. The blocker then proceeds (useNoteRouteSaveBoundary.tsx:66, which is the same in both trees).
- Structure 2 is still waiting on rendered() at :182, so it has not applied anything yet.
- In-app note-to-note navigation keeps NoteDetailPage mounted and only changes noteId. The effect at :116-119 then sets activeRun to null and calls leaveBuffer. leaveBuffer sees box 2 as unchanged and closes it without retaining (:112-113). Structure 2 exits at :183.

Reproduction: a temporary test drove the real useHeadingStructureController, useTextFlowHistory and usePlacementHistory with a noteId prop that changes. It modelled the leave in the boundary's order: whenTypingSettled, then textHistory.flush, then the noteId change.
- The heading starts empty, as after '# ' on a fresh line, and the box gets 'Title\nBody'.
- At settle: isBusy=true, box="Body", nothing saved yet.
- Final blocks: ["Intro", "[H]", "End"], an empty heading. No notice is shown and readUnplacedWords('note') is null.
- Control without Enter: "[H]Title" is saved. With Enter but no leave: ["Intro", "[H]Title", "Body", "End"].
- The loss is larger than the finder says: the heading text is lost along with "Body", because both exist only in structure 2's request.
- I deleted the test file afterwards.

Reachability: real but narrow. The person must press Enter inside window 1 and click another note, a tab, or in-app Back before window 1 closes. The click cannot come before the Enter, because once the leave starts, holdPageInput blocks keydown.
- The tester measured windows closing 0.4–1.2 s after the last key at about 110 ms round trip, and occasionally 2.5–3.6 s.
- So the click has to land roughly 0.2–1 s after Enter, with more room on a slow network.
- If the click comes after window 1 has handed over, it is safe: whenTypingSettled then waits for box 2 to finish.
- A hash or address-bar switch is also safe here: the noteId changes while box 1 is still changed, so the words are kept with a notice.
- None of the tester's runs combined Enter in the window with an in-app leave, so this is not in the 6 items already ruled on.

Novelty: the same words were lost before the change. In the before tree, flushPendingSaves does not wait for the heading at all, and on a noteId change the abandoned run calls typing.finish(), which throws away everything typed in the window, with or without Enter. The tester's evidence agrees: the before tree failed 0/20 in-window leave and click probes. After the change the first structure at least completes cleanly, so the result is identical or slightly better, not worse.

Why it is not refuted: the handoff required words in the buffer to land or be kept when the person switches notes. The builder's receipt claims that leaving through an in-app link waits for the window and saves the words. Enter typed in the window is a deterministic exception to that claim. Severity is minor rather than major: it is not a regression and the timing is narrow, but the loss is silent and covers the heading title plus the first body words.

## [buffer-1] confirmed | Second structure (Enter in window) failing before its first edit erases the body words with no notice
sev=minor pre=no repro=True standing=2

**user_scenario**: Type '# Title' Enter 'Body' inside the window. The heading commits, but the follow-up structure that gives 'Body' its own block stalls before its first write (a hanging write until the 10 s watchdog), or its first applyEdit is refused. The toast says heading changes could not be completed, 'Body' is gone, nothing stays on screen and nothing is stored.

**mechanism**: Same hand-over as the first finding. The second box's initialText is the body text (:150-151). Any exit before runBatch's first applyEdit calls exitQueue then placeTyped on that box, which takes the !typing.changed() branch (:325-327) and closes it, then forgets the stored copy in finish (:318). When the first structure fails the same way, its words are kept or retained. The second structure has no such guard.

**repro**: Real hook harness with whenWritesIdle resolving on the first call and never on the second, watchdogMs 1500. splitHeading, type '\nBody'. The first structure returns true, the second opens a box showing 'Body', and the watchdog fires. Final blocks 'Intro / Sec / End', no notice, storage null. Contrast: the first structure stalled the same way keeps 'kept'.

**user_impact**: Body text typed after a heading disappears silently on a slow or failing network. Before the change, Enter in the window was replayed directly with no second structure, so the words survived.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:150-151', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:325-327', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:353-357']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I could not refute this finding. It reproduces with the real hooks, and the before tree keeps the words.

**How I tested it.** I built a harness in the scratch copy from the existing useHeadingStructureController.test.tsx `renderStructure`. Everything is the real hook: useTextFlowHistory, usePlacementHistory, the controller and the typing buffer. Only the persistence boundary is faked. I ran splitHeading on `[Intro, '# Sec']`, typed '\nBody' into the box, and injected the fault only at `whenWritesIdle`. The builder's own watchdog test fakes failure at this same point.

**Results, after tree:**
- **R0 (control, no fault):** 'Body' lands in its own block (new-2).
- **R1 (second whenWritesIdle hangs, watchdogMs 1500):** the first structure returns true. A second box opens showing 'Body', then the watchdog fires and `onFailure` is called once. Final blocks are `Intro / heading Sec / End`. The box is gone, there is no notice and nothing is stored. 'Body' is lost.
- **R2 (second whenWritesIdle rejects):** this models any tracked write in the registry failing during the window, because `whenIdle` rejects on a recorded failure. The result is the same as R1, through the catch path at :252-257.
- **R3 (person keeps typing ' more' into the second box during the stall):** this is worse than the finding says. 'Body' is lost and ' more' lands in the heading, giving `heading_1 = 'Sec more'`. After the watchdog, `fallbackFocus` names the body unit, which never existed. `placeTyped` falls back to the last live unit (the heading), and `placeOnLiveText('Sec', 'Body', 'Body more')` adds only ' more'.
- **C1 (first structure stalls the same way):** the words are kept as `# Sec / Body`.

**Before tree:** I loaded the pre controller copy through the same harness. R1, R2 and R3 all keep the words: `new-1: heading Sec | paragraph Body` (and 'Body more' in R3), with no failure. Before the change, the typed keys went straight into `applyEdit` and nothing waited on `whenWritesIdle` a second time. So this loss is new.

**Mechanism (after tree, useHeadingStructureController.ts):**
- At :353-357, `placeTyped` starts a second `commitStructure` for the body text.
- At :148-151, that call closes the first box and opens a new one whose `initialText` is the body text. So `changed()` is false unless the person types more.
- Any exit before the first `applyEdit` sends the box to the `!typing.changed()` branch at :325-327. That branch closes the box, and `finish` at :318 forgets the stored copy. Those exits are the watchdog (:169-176), the catch (:252-257), and `edited` false (:190).
- `runStructureBatch` → `flush` (useTextFlowHistory.ts:939-943) is another exit before the edit: it throws on any failed typing save or a non-idle history.

**Reachability:**
- Pressing Enter inside the window at human speed is common. The tester's `twoHeadings` and H/N runs hit the second-structure path.
- The fault has to land in a narrow window: a tracked write must fail, or hang past 10 s, between the first structure's idle check and the second structure's first edit. The api client (services/api.ts:8) sets no timeout, so a stalled request can hang that long.
- I did not find a specific background write that the first heading split always leaves in flight. That makes the trigger a slow or failing network landing in a short window. It is plausible but rare, which is why I keep severity at minor.

The tester's unexplained 1-of-28 loss had no Enter, so this finding does not explain it.

I deleted the scratch folder src/__review__/verify-buffer-1-repro/; node_modules was not touched.

**vote1** refuted=False repro=True reach=True nw=yes sev=minor
Not refuted. The finder read the mechanism correctly, and the loss is larger than they said.

Mechanism, after tree, client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:
- Enter in the window lands in the box as a newline. placeTyped splits on it (:342-351), and headingStructureRequestForEdit (:353) returns a request because the heading block now holds more than one unit.
- onHeadingStructure starts a second commitStructure. It closes the first box (:149, :356) and opens a new box whose initialText is the focus unit's text, which is the body text (:150-151).
- The heading words typed in the window live only in that second request's nextTextFlow.
- If commitStructure exits before its first applyEdit (:186-189), the catch or the watchdog calls exitQueue. placeTyped then sees an unchanged box and takes the branch at :325-327. finish closes the box and forgets the stored copy (:317-319).
- Result: the heading words and the body words are both gone. Nothing stays on screen and nothing is stored. The toast's "Undo" only undoes the heading.

Reachability on a real backend at about 110 ms round trip:
- Enter inside the window happens at human speed. The tester's twoHeadings arm (100 ms per key) reached a second structure through Enter in the window 3/3.
- The failure needs no hang. whenWritesIdle is the adapter's write registry (inFlightWriteRegistry.ts:9-17, :80-83). It rejects while any tracked write has failed and that key has not since succeeded.
- Path 1: reorderBlocks tracks its PUT (useNoteCanvasDataAdapter.ts:2924), catches the error and returns false. The first structure then fails at restore (:234), but canApplyEdit stays true. The first box's placeTyped therefore launches the second structure, whose whenWritesIdle (:182) rejects at once.
- Path 2 (likely, not checked in a browser): page flow turns back on when busy drops and starts placement writes (useNotePageFlow.ts:53-75). A transient failure of one of those writes, in flight when the second structure starts, has the same effect.
- Path 3: a write that stalls for 10 s or more (the finder's watchdog path).
- So the trigger is one failed request in roughly the 1-2 s around the heading split, plus Enter typed in the window. That is rare but reachable on a failing network.

Reproduced with the real hooks: the shipped harness copied (real useTextFlowHistory, usePlacementHistory and buffer), with whenWritesIdle wired to a real createInFlightWriteRegistry. Steps were splitHeading, then type "X\nBody".
- After the change, reorder PUT fails once: final blocks Intro / End / Sec[h]. "SecX" and "Body" are both gone; no box, no notice, nothing stored; two failure toasts.
- After the change, heading split succeeds and a placement write started right after it fails: Intro / Sec[h] / End, words gone.
- After the change, watchdog path (the finder's repro): words gone.
- Control, after the change, same reorder failure with no Enter: "SecX" is kept.

New or worse: yes.
- The before tree's useHeadingStructureController.ts ran against the after tree's history hook; that hook's diff is a pure refactor, so the run is faithful. With the same reorder failure and Enter, it keeps "SecX" and "Body" on screen (heading block [SecX, Body], unsplit).
- The before tree had no second structure. replayTyped (pre :242-288) did one applyEdit.
- The builder's receipt says failure cases keep the words visible; this path breaks that.

Correction to the finding: it understates the loss. Everything typed in the window is lost, including the heading text typed before Enter, not only the body.

It does not explain the tester's 1/28 sample: no Enter was typed there.

Severity stays minor only because the trigger needs a network failure in a narrow window; the loss itself is silent and total for those words. Scratch test files were deleted.

## [buffer-2] confirmed | Reopened stored words go into another block's unit that shares the per-block id
sev=minor pre=worse repro=True standing=2

**user_scenario**: A heading's unit has already been extracted to its new block when the window fails and is held (e.g. a later move or reorder save fails), or the person leaves by a route the leave guard does not catch. They reload or come back. The stored words are appended to the end of an unrelated paragraph earlier in the note, and the heading stays empty.

**mechanism**: Unit ids are per block ('tu-1', 'tu-2'..., textUnitEditorService.ts:55-63, textFlowService.ts:118), so many blocks share them. The stored focus.blockId is the block the structure started in (:150) and is never updated to lastFocus, while retainWords stores it (:96). On reopen, placeTyped falls back to the first block in note order whose flow has that unit id (:285-287). placeOnLiveText then appends because live !== initial (:67). The cross-block search existed before in replayTyped. The restore-on-open path and its stale stored block are new.

**repro**: Real hook harness. Call rememberUnplacedWords('note', {blockId:'ending', unitId:'title', initialText:'', text:'head'}). Open a note whose first block is an unrelated paragraph [p 'Para one', title 'Para two'] and whose 'ending' block no longer has unit 'title'. Result: the first block becomes 'Para one|Para twohead' and the storage is cleared.

**user_impact**: The words land in the wrong paragraph, glued to its last word. The heading the person was typing stays empty. Nothing tells them.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:150', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:285-287', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:378-392', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:59-68']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I could not refute it. I reproduced it with the real hooks: useHeadingStructureController, useTextFlowHistory and usePlacementHistory, with the same fake persistence boundary the builder's own test uses.

Steps in the test:
1. The note has block 'prior' = [tu-1 'Para one', tu-2 'Para two'] and block 'source' = [tu-1 'warmup', tu-2 '# '].
2. onHeadingStructure turns tu-2 into heading_1 with caret 0. 'head' is typed into the window's words box.
3. The extraction saves (the server now has a new block new-1 = [tu-2 heading '']). The reorder after it is still pending.
4. The note is unmounted, the same as leaving by Back or a hash switch.
5. The note is reopened from the saved blocks.

Result: the stored words were {blockId:'source', unitId:'tu-2', initialText:'', text:'head'}. On reopen the note became [['Para one','Para twohead'],['warmup'],[heading '']]. saveBlock was called with prior = 'Para one\nPara twohead', and the stored words were cleared. The person sees no notice.

Control: the same steps with an earlier block that has no tu-2 put 'head' into the heading correctly. So the cause is that unit ids are numbered per block.

Mechanism, in the after tree:
- Unit ids are per block ('tu-N', textUnitEditorService.ts:55-63) and are kept by extractTextUnit and moveTextUnitBetweenFlows.
- The words box's focus.blockId is set once to the block the structure started in (useHeadingStructureController.ts:150). retainWords stores that block id (:96) and never changes it to lastFocus.
- On reopen (:378-392), placeTyped does not find the unit in that block and takes the first block in note order with the same unit id (:285-287).
- placeOnLiveText then appends the words, because the unit's text is no longer the initial text (:59-68).

How a person reaches it:
- Leave by Back, or by a hash switch between notes, after the heading's split has saved but before the window ends. The tester confirmed these exits leave the words in the box and stored. Then come back to the note.
- Or a later move save fails, which holds the note and stores the words, and the person then reloads.
- In both cases an earlier block must hold two or more paragraphs, which is common in real notes. The tester's notes were new, with the heading block first, so this never showed up there.

Before the change: leaving mid-window dropped the keys (typing.finish() when noteId !== session), and there was no stored-words reopen path. So the words were lost, but no unrelated paragraph was changed. The cross-block search in the live failure path already existed in replayTyped. The new part is the reopen path that writes the words, with the stale block id, into another paragraph and saves it. Silently changing an unrelated paragraph is new, so I mark it new or worse.

I kept severity minor because the trigger is narrow: the window is about 1 s, the exit has to be an unguarded one, and an earlier block must share the unit id.

The test is kept at <tester-scratch>/verify-editor/refute-reopen/reopen-wrong-block.test.tsx. I deleted the verify-buffer-2-repro folder in the scratch copy.

**vote1** refuted=False repro=True reach=True nw=yes sev=minor
Not refuted. I reproduced it with the real hooks (useTextFlowHistory, usePlacementHistory and useHeadingStructureController), faking only persistence. Unit ids repeat across blocks in the real app (textUnitEditorService.ts:55-63, textFlowService.ts:118), so any earlier block with 2 or more lines has a tu-2. The fixture was: an earlier block "para" [tu-1 'Para one', tu-2 'Para two'], then block "work" holding 'warmup' and '# ' as tu-1 and tu-2, plus 'head' typed during the structure window.

(A) In-session, slow network, no reload. The extraction save stalled past the watchdog (HEADING_STRUCTURE_WATCHDOG_MS, 10 s in production) and then succeeded. On the watchdog, placeTyped(fallbackFocus {work, tu-2}) is refused because documentPending is set, so the words are kept and retried every 800 ms (:296-304). Once the save lands, work no longer has tu-2. The note-wide search at :285-287 takes the first block in note order that has tu-2, which is "para". placeOnLiveText (:67) appends because live text is not the initial text. Final state: para 'Para one|Para twohead', the work block keeps only 'warmup', and new-1's heading is empty.

(B) Failed save, then reload. The heading line had body after it. The first extraction saved, the second create failed and the note was held. retainWords stored {blockId: work, unitId: tu-2} (:96, focus taken from :150). After a reload, the restore effect (:378-392) placed 'head' into para ('Para twohead'), the heading stayed empty, and the stored words were cleared.

Novelty, from the before tree. The cross-block search already existed in replayTyped (pre :245-246), but before the change it was one attempt only, refused while documentPending or documentFailures was set, with no retry and no storage (pre :271-279, finally :229). In both A and B the before tree simply lost 'head' and left para untouched. After the change, 'head' is silently glued onto an unrelated earlier paragraph, possibly off-screen, and the heading stays empty. The new retain, retry and restore paths are what make this reachable. The change set out to keep words through failures and put them back where they were typed, and here it does not.

Corrections to the finder. A reorder-only failure does not hold the note, so placement runs at once and lands in the same wrong block; that path is pre-existing and the same before and after. Never updating focus.blockId to lastFocus is not the root cause, because lastFocus is still null on both reproduced paths. The cause is searching the whole note by a unit id that is only unique within a block. In-app leaving while the note is held is blocked by the route guard (flush throws), so reload, or the watchdog followed by a late success, are the real routes.

Reachability limits. A normal network with about 110 ms round trip does not trigger it. It needs a single save stalled for more than 10 s that then succeeds, or a failed later document save followed by Retry or a reload. It also needs an earlier block with at least as many lines as the heading's unit index, which is common.

This is unrelated to the tester's unexplained 1-of-28 loss: that note had no earlier multi-line block, and that run never reached the role edit.

Severity is minor: it happens only on failure paths, and the words are misplaced rather than destroyed. Test file written at <review-copy>/rv2/client/src/__review__/verify-buffer-2-reach/reach.test.tsx, both tests passed, and the folder has been deleted.

## [buffer-3] confirmed | Starting a new heading while kept words are on screen wipes them from screen and storage
sev=minor pre=no repro=True standing=2

**user_scenario**: A words box is kept on screen ('These words are not in the note yet'), and the rest of the note is editable, for example because the box's unit or block no longer exists. The person keeps writing and types '# ' somewhere else. The kept box disappears at once, and when that new window ends the stored copy is erased as well.

**mechanism**: commitStructure calls previousBuffer?.typing.close() with no retain or carry-over (:148-149). Its retry timer then stops, because buffer.current !== entry (:293). The new box's finish calls forgetUnplacedWords(session) (:318) on the same per-note key, so the old words' only copy goes too.

**repro**: Real hook harness. Store kept words for a missing unit, then open the note: the notice appears with 'my kept sentence'. Start splitHeading on another unit: the notice is gone right away, and after the window readUnplacedWords('note') is null.

**user_impact**: Words the UI explicitly promised to keep are lost. Reachable only while a box is kept and the note is still editable (a missing block or unit, or the short gap after a held note is released), so it is uncommon.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:148-149', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:293', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:318']

**vote0** refuted=False repro=True reach=True nw=no sev=minor
Reproduced. I wrote a test that drives the real hooks (the useTextFlowHistory, usePlacementHistory and useHeadingStructureController harness copied from the existing test file) and ran it in my scratch copy. That folder is now deleted.

Control: words stored for a block that does not exist ('my kept sentence') come back on screen with the notice when the note opens. After 1.8 s they are still on screen and still stored. The test passed.

T1, the finder's case: with that notice on screen, start a heading split on another unit. Right after the call, the notice is gone and the only box showing holds the new heading text 'Sec'. The stored copy still exists at that moment. Once the window ends there is no box and no stored copy, and the note reads 'Intro | Sec | End'. 'my kept sentence' is gone. The test failed as the finding predicts.

T2, a second path the finder did not name: a structure fails because block creation throws. The words typed in the window ('Sec!words') stay on screen and stored, and the note is held. Undo releases the hold. Before the 800 ms retry fires, "# " is typed on the other block, and it succeeds. The kept box closes at once, and the stored copy is erased when the window ends. The note goes back to 'Intro/# Sec | End'. The words are in no box, not in storage and not in the note. The test failed.

Mechanism, confirmed (after tree, useHeadingStructureController.ts):
- When the words cannot be placed, they are kept without clearing buffer.current (lines 286-290).
- commitStructure closes the previous buffer with no keep or carry-over (lines 148-149).
- The old retry timer then does nothing, because buffer.current is no longer that entry (line 293).
- The new window's finish calls forgetUnplacedWords on the same per-note key (line 318).
Any path into commitStructure does this: "# " in the editor, a slash-menu heading, or a pasted heading through onDocumentEdit.

Reachability is narrow:
- While a failed save holds the note, the editors are read-only (useTextFlowHistory.ts:955 feeds contentReadOnly at useNoteCanvasRuntimeController.ts:653), so no heading can start during the hold itself.
- A hung transfer after the watchdog also keeps the note read-only, through documentPending.
- That leaves two real paths. One is the gap of up to 800 ms (PLACE_RETRY_MS, line 46) after Undo releases a failed save, or after any short moment when edits are refused. The other is kept words whose block no longer exists, for example removed on another device before the note is reopened. In that case the box stays indefinitely while the note is editable.
- When words are kept because the person left the note (leaveBuffer), buffer.current is cleared, so a heading in another note does not touch them. That path is safe.

New or worse: no, for what the person ends up with. In the before tree these same words were already dropped: the old replay after a failed save had no retry, and words typed in a window that was abandoned by leaving the note were not kept. structureTypingBuffer.ts does not exist there. Still, this is something the change set out to fix and did not. Its own test says closing the notice is the only thing that discards left-behind words, and the notice tells the person the words are kept. Here the loss is silent and comes later, after the person was told the words were safe.

Severity is minor: words are lost, but only in narrow windows.

**vote1** refuted=False repro=True reach=True nw=no sev=minor
The mechanism is read correctly, and it is easier to reach than the finder says. But this is a gap in the change's new protection, not a regression. The person loses the same words before the change, always and earlier.

Mechanism (after tree, useHeadingStructureController.ts):
- A new commitStructure starts only when the note is not read-only and no run is busy (:140). It never checks whether the history is held.
- It calls previousBuffer?.typing.close() (:148-149). close() removes the notice and the textarea and does not run the retain onClose. buffer.current is replaced (:150).
- The old retry stops because it checks buffer.current === entry (:293).
- When the new window ends, its finish forgets the same per-note key (:318). If the person typed into the new box, retainWords overwrites that key instead (:96, :302).

How a person reaches it: a kept box in a note that is still open comes from a failed split, for example a 500 or a dropped network during create or unit transfer, or the watchdog followed by a late failure. That failure leaves the note held (canApplyEdit false) and leaves an unsplit block of body plus heading. Any edit in a block that holds a heading plus another unit is sent to onHeadingStructure (TextBlockProjection.tsx:847-853, PaginatedTextBlockProjection.tsx:136-138, via headingStructureRequestForEdit, headingInputService.ts:30). So one key typed in the visible body line of that same block is enough. So is Enter after the heading, or any heading started elsewhere.

Repro: real hooks, using the harness from useHeadingStructureController.test.tsx, in rv1 under src/__review__/verify-buffer-3-reach/ (now deleted).
- Start from [Intro, # Sec]. Create throws, and '!' is typed in the window. The notice shows 'Sec!', storage holds 'Sec!', canApplyEdit() is false, and the live block is [Intro, heading Sec] with no split.
- headingStructureRequestForEdit(live, Intro→IntroX) returns a request. Sending it to onHeadingStructure removes the notice at once. The second run fails too (failure toast count 2), and storage is then null.
- After Undo, as the toast says, the note is 'Intro|# Sec' and '!' never arrives. Without the extra key, the builder's own test shows Undo puts '!' into the note.

The finder's own triggers are weaker:
- A block or unit missing while the note is still editable is rare.
- The gap after a held note is released is at most 800 ms (PLACE_RETRY_MS, :46), after which the retry places the words.

Novelty: in the before tree, words typed during a failed window are dropped silently at the failure. replayTyped's applyEdit is refused while the note is held, and there is no retry and no storage (pre useHeadingStructureController.ts:242-279, comment at :271-273). The before tree also has no restore path when the block or unit is missing (:255 returns). So the same person always loses those words before the change. After the change, they lose them only if they edit the note before Undo, a refresh, or leaving. The finding's "pre_existing: no" is true of the code path, not of the loss.

It still counts as something the change set out to do and did not finish. The notice promises "Copy them before closing", and the receipt claims "字留在缓冲…撤销后落进正文" (words stay in the box and go into the note after Undo). Both are broken by an ordinary next keystroke. A real backend at 110 ms does not cause this by itself; it needs a server or network failure first.

The open 1/28 loss does not fit this mechanism as shown. The tester saw no notice, and the first run was still busy, and line :140 refuses a second run while busy before it reaches :148. This mechanism could only explain that sample if something started a second structure after release (:261) and before placeTyped finished; while placeTyped polls for the editor (:307-311), up to 3 s, that is open. Nothing in the evidence shows that happening.

## [buffer-4] confirmed | After a stalled or failed heading, words typed at the caret are moved to the end of the line
sev=minor pre=no repro=True standing=2

**user_scenario**: Put the caret at the start of an existing paragraph 'Intro', type '# ' and then 'Big '. The heading fails before its role edit: a watchdog stall, or an earlier failed text save that makes flush throw. Typing then continues at the end of the line. The note reads '#IntroBig ' instead of 'Big Intro'. A replace or delete done in the box is also dropped while the new text is appended.

**mechanism**: After a failure the live unit is the literal '#Intro' but initialText is 'Intro'. placeOnLiveText (:59-68) diffs the box only against initialText and appends the inserted middle to the end of live. The caret is set to nextText.length (:337), so later keys also go to the end. Before the change, replayTyped inserted at the request caret, giving 'Big #Intro'.

**repro**: Real hook harness. Live flow [title '#Intro']. Request: heading 'Intro', focus caret 0, whenWritesIdle never resolves, watchdogMs 300. The box opens with 'Intro' and caret 0. Type 'Big ' and the box shows 'Big Intro'. After the watchdog, the source unit text is '#IntroBig '.

**user_impact**: Words are reordered and glued to the old text, so the meaning changes. This happens only on the failure path and only when the caret was not at the end of the unit.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:59-68', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:337']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I could not refute this. It reproduces with the real hooks, and the result differs from the before tree.

Test setup: I ran the real useHeadingStructureController, useTextFlowHistory, usePlacementHistory and useDocumentTextFlowSelection, copying the harness from the after tree's own test file. Only persistence was faked. The live flow was [para '#Intro'], which is the state after the person types '#' at the start of 'Intro'. I built the request with the real applyHeadingInputAtLine(live, 'para', '# Intro', 2), which gives heading 'Intro' with the focus caret at 0. whenWritesIdle never resolves and watchdogMs is 300.

After tree: the box opens showing 'Intro' with the caret at 0. Typing 'Big ' makes the box show 'Big Intro'. After the watchdog fires, the flow, the text half and the saved text are all '#IntroBig ' (paragraph). As a control, a stalled '# ' on an empty line followed by 'head' gives '#head', which matches the tester's 12 s held-save result. So the harness behaves like the real browser on the path the tester already measured.

Before tree: I loaded the before tree's useHeadingStructureController into the same harness. useTextFlowHistory only gained additive members in this change. Keys go through the old beforeinput capture. Same scenario, result 'Big #Intro'. The words keep their order and only the '#' is stray.

Mechanism: in the after tree, placeOnLiveText (useHeadingStructureController.ts:59-68) diffs the box only against initialText 'Intro'. It then appends the inserted middle to the live text '#Intro'. Line 337 then puts the caret at nextText.length, so later keys also land at the end of the line. In the before tree, replayTyped inserted at the request caret (before tree :256 and :261).

Reachability: a person needs a slow network. A text save held past 10 s makes the watchdog fire first, and the tester already drove that path in a real browser. The person also has to keep typing right after '# ' typed at the start or middle of an existing paragraph, for example '# 1. '.

Limits: the failed-flush variant is reasoned, not tested; it goes through the same placement code. The finder's sub-claim that a replace or delete done in the box is dropped is a declared design ('deletions are not replayed'), and the before tree did not capture deletions either, so I am not treating that part as new.

Impact: no words are lost, but the typed words are reordered and glued to the old text, only on the failure path. Severity minor.

**vote1** refuted=False repro=True reach=True nw=yes sev=minor
Not refuted, but it is narrower than the write-up says.

The mechanism is read correctly. I tested it with the real hooks: the after-tree hook, and a copy of the before-tree hook that uses the same real history hooks. The setup was a source unit holding '#Intro', the request applyHeadingInputAtLine(flow,'title','# Intro',2) (focus caret 0, box opens with 'Intro'), the user typing 'Big ', and a 300 ms watchdog.

Results:
- whenWritesIdle never settles. Before: 'Big #Intro', editor caret set to 4. After: '#IntroBig ', caret set to 10 (placeOnLiveText useHeadingStructureController.ts:59-68, caret :337). So the change is new. The before tree's replayTyped put the words at the request caret, so this was not the same before.
- The stall is in flush instead: the '#' keystroke is still an unsealed typing edit, so runStructureBatch's flush is what waits on its save. Both trees end as '[heading_1]Intro' with 'Big ' gone. After the save lands, the abandoned run's role edit still applies and overwrites the placed words. The result is identical before and after, so the finding is not new on this path. This also matches the tester's ea-pre run, which went 'head#' and then ended as an empty heading.

Can a person reach it? Yes, but only on a stalled network. The words must land in the box while the structure is still waiting in whenWritesIdle. saveBlock is tracked by the write registry (useNoteCanvasDataAdapter.ts:1889, writeRegistry.hold). So an earlier save has to be in flight. Clicking to the start of a paragraph seals the earlier typing and sends that save. If it then stalls for 10 s or more while the person types '# ' and keeps typing into the box, the watchdog places the words at the end of the paragraph. They are glued to the old text, and further keys also go to the end. In the before tree they stayed where they were typed.

The finding's other trigger, a fast failure, is marginal. An earlier failed write makes whenIdle reject, and the window then closes within about 2–3 frames. A key at human speed (about 90 ms apart) rarely lands in that time.

Two claims do not hold as new:
- Deletions made in the box being dropped is not new. The before tree only captured insertText and Enter during the window.
- The trade-off runs the other way in the common case. With the caret at the end, such as '# head' on a new line, the before tree gave 'head#' and the after tree gives '#head', which is correct. Only a caret before existing text, meaning '# ' typed at the start of a non-empty paragraph, got worse.

Severity is minor. It happens only on a failure path, with the failure notice ('Heading changes could not be completed') shown. The words are kept, but they are moved to the end of the paragraph.

The harness was under src/__review__/verify-buffer-4-reach/ and has been deleted.

## [buffer-5] confirmed | Words box opens over the same-id unit of an earlier block, possibly off screen
sev=minor pre=no repro=True standing=2

**user_scenario**: In a note with several text blocks, type '# ' at the start of a unit in any block after the first, for example a new paragraph block whose only unit is 'tu-1'. The box, and its retained notice on failure, cover an earlier paragraph that has the same unit id. If that paragraph is scrolled away, the keys typed in the window are invisible. On failure the notice is pinned to the top edge and the kept words are off screen.

**mechanism**: findEditor in structureTypingBuffer.ts:34-37 matches on data-text-unit-id only and ignores block id. Unit ids repeat across blocks, and every visible block renders editable textareas (NoteWritingSurfaceLayer visibleBlocks to BlockEditorLayer). Both the opening position (:105) and the 50 ms follower (:100) use it. Placement itself (editorFor) is block-aware, so the data ends up right.

**repro**: Real hook harness with block 'ending' also having unit 'title'. Create mocked editors: ending/title at top -600 (earlier in the DOM) and source/title at top 300 (focused). splitHeading gives box top '-600px' at open and still after 120 ms. With a create failure, the retained box stays at -600px and the notice at 0px.

**user_impact**: Echo is invisible or misplaced and covers another paragraph's text with an opaque box. That breaks the order's 'echo visible within a frame' requirement and can make the kept-words notice unusable. No words are lost.

**files_lines**: ['client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts:34-37', 'client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts:100', 'client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts:105']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I reproduced this in a test that drives the real hooks (useTextFlowHistory, usePlacementHistory, useHeadingStructureController and the real openStructureTypingBuffer), using the harness from useHeadingStructureController.test.tsx. Only persistence and the editor rectangles were faked.

Setup: block 'source' is [tu-1 'Earlier paragraph'], with its editor at top -600 and first in the DOM. Block 'ending' is [tu-1 ''], with its editor at top 300 and focused. Calling onHeadingStructure for '# Sec' on 'ending' opens the buffer at top '-600px'. It is still at -600px after 120 ms because the 50 ms follower keeps choosing the wrong editor. The keys typed in the window still land in the right place: ending = [tu-1 heading_1 'SecX'], source is unchanged, and focus goes back to the correct editor (editorFor is block-aware).

Control: the same run with distinct ids (source has tu-9) opens the buffer at 300px. So the unit id alone causes the misplacement.

Failure path: source is [tu-1, tu-2], ending is [tu-1 'Intro', tu-2 '# Sec'], and block creation fails. The retained box stays at -600px holding 'Sec!', and the notice is clamped to top 0px.

Cause: findEditor at post/client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts:34-37 matches only data-text-unit-id and takes the first match in document order. It is used at :100 (follower) and :105 (open).

It is reachable in the real app because unit ids repeat across blocks:
- createTextBlockContentV1 gives every new block the unit 'tu-1' (textFlowService.ts:119).
- parseLine numbers units tu-1 onward per block (textUnitEditorService.ts:329).
- The server's sourceProjectionMaterializer.ts:271 also uses 'tu-1'.
- Every visible block renders data-runtime-textflow-editor textareas with width > 0, and chapter collapse is the only thing that hides blocks.
- A role change on a single-unit block still goes through commitStructure (headingInputService.ts:30-32).

So typing '# ' at the start of the first line of any block after the first shows the echo over the earlier block's first line, or off screen if that block is scrolled away.

This is new: structureTypingBuffer.ts does not exist in the before tree. It also misses the order's requirement that typed keys show 'at the focused unit' (handoff line 88/90).

Impact is visual, not data. While the window is open (one save round trip on a single-unit block, longer for a split), the typed keys either cover another paragraph with an opaque box or are invisible. On failure, the kept words can sit off screen while the notice says to copy them. The words are still stored and placed later, unless the person presses Close because they cannot see them. No words are lost on the success path, so this is minor.

The test folder src/__review__/verify-buffer-5-repro/ has been deleted.

**vote1** refuted=False repro=True reach=True nw=yes sev=minor
I could not refute this finding. Words still land in the right place, so it falls below the "words lost" bar.

Mechanism (read correctly):
- findEditor (structureTypingBuffer.ts:34-37) returns the first textarea in DOM order whose data-text-unit-id matches and whose width is above 0. It never checks block id.
- Both the opening position (:105) and the 50 ms follower (:100) use it.
- Unit ids are per block, not per note:
  - createTextBlockContentV1 always mints 'tu-1' (textFlowService.ts:119), and draft blocks use it (useDraftBlockController.ts:61).
  - createNextUnitId and reassignParsedUnitIds number only within one flow (textUnitEditorService.ts:55-63, 371-385).
- Every visible block's unit textarea carries data-runtime-textflow-editor="true", because onTextEditBoundary is passed to all of them (TextBlockProjection.tsx:1884, PaginatedTextBlockProjection.tsx:517, BlockEditorLayer.tsx:663, NoteWritingSurfaceLayer.tsx:1962).
- Typing "# " in a later block whose unit id also exists in an earlier block therefore puts the box over the earlier block.
- Placement is still correct: editorFor (useHeadingStructureController.ts:51-55) and placeTyped resolve by block, so the data ends up right.

Reachability:
- Any note has a first block with tu-1. Typing "# " at the first unit of any later block (for example a draft-created block) is enough.
- Ids also collide through ordinary Enter splits: after "warmup⏎# head⏎body", adding lines to the first block mints tu-2 and tu-3, which match the heading and body blocks.
- The window lasts about 0.4-1.2 s on the real backend and longer when saves are slow. Neither the tester's matrix nor the builder's matrix had a multi-block note with repeated ids, which explains why no one saw it.

Reproduced with the real module and mocked layout. Two editors were set up: block-A/tu-1 at top -600 and block-B/tu-1 at 300, with B focused. openStructureTypingBuffer gave top -600px at open and still -600px after 120 ms. After retain the notice was at 0px and the box still had focus while held. The control case with unique ids opened at 300px. The test file was deleted afterwards.

Novelty: structureTypingBuffer.ts does not exist in the before tree, so the misplaced box is new behavior. It is not worse in data terms. Before, keys typed in the window could be lost (A-24), and on failure the words were lost. After, the keys are kept and placed correctly; only the echo is misplaced.

What breaks: the order's explicit A-24 requirement that keys typed in the window show at once in the focus unit (handoff lines 88/90). Instead the echo appears over another paragraph and hides it with an opaque box, or sits off screen when that paragraph is scrolled away.

On failure:
- The retained box stays at the wrong position (fixed, follower stopped) while the notice says "Copy them before closing" over words the person cannot see.
- The words are still stored and placed on return, so nothing is lost unless they press Close. Before the change they were lost anyway.
- Reasoned only, not tested: if the wrong paragraph is on screen, a later click on it after a failure lands in the editable retained box. Words typed there would go into the heading unit, not that paragraph. This needs a failure as well as a visible duplicate, so it is unlikely.

Severity is minor: transient, visual, and it misses an explicit order requirement, with no data loss on any normal path.

## [buffer-6] plausible | Kept words are not written back when returning from an empty note
sev=nit pre=no repro=False standing=1

**user_scenario**: A failure leaves words kept on note A. The person opens a new, empty note B in the app and goes straight back to A. The words stay in the box with the notice and are not written in, until a full reload.

**mechanism**: The runtime is not keyed by note, so the hook instance persists. The restore effect returns before setting restoredNote when blocks.length is 0 (:380), so restoredNote stays A. Back on A, restoredNote.current === noteId skips the restore. The retry timer stopped when leaveBuffer cleared buffer.current.

**repro**: Reasoned from code only.

**user_impact**: The automatic write-on-return does not happen. The words remain visible and stored.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:378-383']

**vote0** refuted=True repro=False reach=False nw=no sev=none
Refuted by reproduction. The finding needs blocks.length to be 0 in the first render where noteId is already B. The real data adapter never does that. useNoteCanvasDataAdapter.ts has no setBlocks([]) on a note change. Blocks are replaced only after B's fetch lands (setBlocks(hydratedBlocks) at :722), and sortedBlocks (:629) only sorts them. So when the route goes from A to B, the first render has noteId=B with A's old, non-empty blocks. The restore effect at useHeadingStructureController.ts:378-381 then sets restoredNote.current = 'B' and finds no words for B. Coming back to A, 'B' !== 'A'. The first render has B's empty blocks, so the effect returns early. Once A's fetch lands, the effect runs again, sets restoredNote = A, reads the words and places them. NoteDetail (route notes/:noteId, no key) keeps one runtime instance, as the finder said. The board modal is keyed by openNoteId, so it remounts per note and starts with a fresh ref.

Test (scratch copy, since deleted): drove the real useTextFlowHistory, usePlacementHistory and useHeadingStructureController in one renderHook instance whose noteId prop changes. Blocks per note came from a store that changes only when a fetch is simulated, as the adapter does. Steps: start a heading split on A, type 'kept' into the window, rerender to empty note B (notice appears, words stored 'Seckept'), B's fetch lands with zero blocks, rerender to A, A's fetch lands. Result: the notice and the window close, A's source block holds ['Intro','Seckept'], and the stored words are cleared. The same test with blocks forced to [] in the very render that switches to B (the finder's assumption) does leave the notice up and the words unplaced. So the mechanism is right only under a condition the app does not produce. Every way of leaving A for B leaves A's blocks in that first render, so restoredNote always moves off A. Nothing is lost either way: the words stay on screen and stored.

**vote1** refuted=False repro=True reach=True nw=no sev=nit
Mechanism: read correctly. I reproduced it with a hook-level test. The test rendered the real useHeadingStructureController with a stub textHistory and changed the noteId prop. The runtime is not keyed by note: NoteDetail.tsx renders NoteCanvasRuntime under the single route "notes/:noteId", so the hook survives a switch between notes. The restore effect at useHeadingStructureController.ts:380 returns before it sets restoredNote whenever blocks.length is 0. A new note really does have zero blocks: server/src/routes/notes.ts POST / inserts only the note row.
- A -> empty B -> A, with words stored for A: applyEdit was called 0 times and the words stayed in localStorage.
- Control, A -> B with one block -> A: applyEdit was called once and the stored words were cleared.
The test folder has been deleted.

Reachability: real, but narrower than the finding says. Kept words only exist when leaving A after a failure. An in-app departure (link click, router Back/Forward, navigate) passes through useNoteRouteSaveBoundary. That boundary calls flushPendingSaves -> textHistory.flush (useTextFlowHistory.ts:939-943), which throws while a failed save holds the note. The blocker then resets, so the person cannot leave through the app until they Retry or Undo. Once they do, the 800 ms retry (useHeadingStructureController.ts:293,301-303) writes the words into A. So the person can only reach this in two ways:
- Edit the address bar to an empty note, which the router does not block (the builder's receipt says so too).
- Click Retry or Undo, then follow a link to an empty note within about 0.8 s.
After that, B must stay empty, and they must come straight back to A with no reload and no visit to a non-empty note in between.

Novelty and impact: not new or worse for the person. In the before tree, the same failure drops the words outright. There, replayTyped (pre useHeadingStructureController.ts:271-279) gives up on a refused applyEdit with no retry, and nothing is stored. In the after tree, the words stay on screen with the "not in the note yet" notice and in localStorage for that account. A reload writes them in, and so does a detour through any note that has blocks. Nothing is lost, duplicated or misplaced, and the editor stays usable. It is a gap in the new auto-write-on-return convenience. Its end state is the same as the builder's already-ruled TD item "leave by address bar and never return: not written, kept on screen and in localStorage". It does not meet the bar for words lost or a wrong structure. It is not "identical before" (before was worse), so I am not marking it refuted, but it is a nit at most.

## leads
[]

# AREA handoff

## coverage
Read in the after and before trees: useDraftBlockController (memo, untrimmed flow, `await Promise.resolve()`, flushSync handoff, handleDurableFocusReceipt, resetDraft), headingInputService.headingRequestForDraftText, the new draft '# ' layout effect in useSlashCommandController, and the BlockEditorLayer auto-focus guard. Also the focus guards in TextBlockProjection and PaginatedTextBlockProjection, the whole of useHeadingStructureController with structureTypingBuffer and structureTypingFocus, and the relevant parts of useTextFlowHistory (applyEdit, extractUnit, flush) and the adapter's finalizeDraftBlock.

Checked and found no problem:
- Memo returning stale unit ids: harmless, because createNextUnitId is deterministic (line i is always tu-i).
- Keys landing inside flushSync: not possible; only microtasks run between the save loop and the handoff.
- Paste: the durable editor also turns pasted '# ' lines into headings, so the draft path is not a new divergence. The draft path converts only the first such line; before the change it converted none.
- Caret moved off the '# ' line: the request keeps the reader's unit and offset, and the buffer opens there.
- First-line '# Title': converted only if the handoff happens after a second line exists. Otherwise it stays literal, as declared by the builder.
- Trailing space or Enter: the flow and the text half agree.
- Cover pages: canUseHeading still refuses.
- The paged-note rAF reads a slice-local selectionStart (PaginatedTextBlockProjection.tsx:516-517). This only matters for a unit spanning a page break, and BlockEditorLayer already misplaced that caret before the change.

Two hook-level tests driving the real hook confirmed findings 1 and 2. Finding 1 was also run against the before-tree hook (red after, green before). The scratch folder src/__review__/find-handoff was deleted afterwards; the empty parent src/__review__ was left in place. No browser, git writes or full suite.

## open_question
Not explained. The tester's 1-in-28 loss did not reproduce, and I found no step that loses 'head' with exactly the tester's steps. What the code does say:

1. The DOM at +2.5 s (unit '#', box started empty) means the window was opened by the durable editor's own '# '. The new draft-conversion effect would have opened it with the heading text instead. So the run was stuck in its pre-phase: `await rendered(); await whenWritesIdle(); await rendered()` at useHeadingStructureController.ts:182, then flush() in runStructureBatch. Some write was outstanding for more than 2.5 s.

2. A write this change can put there is the late-focus replay save from finding 1. If, after in-app arrival, the durable editor took focus late and the Enter landed in the draft, that save is in flight when '# ' is typed. The structure waits for it. When it returns, the replay's flushSync republishes block A's server echo and a new reconciliation while the window is open. That fits the long pre-phase, but I found no path from it to losing 'head'.

3. Two places drop words silently, with no notice and nothing stored, which matches 'never arrived':
   - commitStructure closes any previous buffer without placing or keeping its words (useHeadingStructureController.ts:148-149). Any structure that starts after release() but before placeTyped finishes drops 'head'. That gap includes the afterFrame frame, polling for an editor (up to 3 s, :299-303), and composition waits. Candidates for starting one: the new draft-conversion rAF (useSlashCommandController.ts:189-199) when a reconciliation changes mid-window with a '# ' line in the replayed draft text, the slash pending-draft-heading effect, and document edits.
   - placeTyped closes the buffer whether or not applyEdit applied (:359-371, `void history.applyEdit`).

4. Ruled out by reading:
   - The watchdog path: it keeps the words and shows a toast.
   - A noteId change: it keeps the words with a notice.
   - The click alone: keepFromBody takes focus back from the body, and clearBlockSelection only clears state.

For a rerun, worth capturing: whether a 'These words are not in the note yet' notice or a 'Heading changes could not be completed' toast appeared; the network order during the window, especially any extra save of block A or a draft-create replay; and document.activeElement over time.


## [handoff-0] refuted | Late-focus replay handoff resets the block to the server echo, wiping letters typed in the durable editor meanwhile
sev=minor pre=no repro=True standing=0

**user_scenario**: First block of a new note. The block is created, but the durable editor does not take focus in the render that hands the text over. For example, the new BlockEditorLayer guard returns because the caret's unit has not rendered yet, or the editor is read-only for a moment. One key lands in the draft textarea. The durable editor then takes focus and the late key is replayed with a save. On a slow network, the person keeps typing in the durable editor before that save returns.

**mechanism**: handleDurableFocusReceipt (useDraftBlockController.ts:456-473) adopts the late keys and calls persistDraft() again. The new run reaches the handoff again. The new flushSync block at :620-626 now always publishes persistedFlow, which is getTextFlowContent(saveResponse) (:596-598), into setBlockTextFlowDrafts and setBlockTextDrafts. In the replay run that echo predates edits the durable editor has since applied, so the authority is reset to the older text. Before the change the handoff only set the reconciliation and focus; the save published with preserveDrafts:true and never overwrote.

**repro**: Hook-level test with the real useDraftBlockController against an in-memory authority map. Steps: activateDraft; setDraftText('ab'); persistDraft('ab') resolves (handoff, no focus receipt yet); setDraftText('abc') in the draft; handleDurableFocusReceipt(block-1) starts the replay save, held; authority set to 'abcd' to simulate a durable-editor key; release the save with echo 'abc'. Result after: authority ['abc'] / text 'abc'. The same test against the before tree's hook (copied with imports rewritten) keeps ['abcd'] / 'abcd'. Whether a real browser reaches the late-focus path after this change is not shown: the tester's matrix never logged it.

**user_impact**: Letters typed in the first moments in the new block disappear from screen and from the authority. The next edit saves without them. This only happens if the late-focus path occurs.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:456-473', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:596-598', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:620-630', 'client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:409-416']

**vote0** refuted=True repro=False reach=False nw=no sev=nit
I wrote a hook-level test that runs the real after-tree useDraftBlockController and a copy of the before-tree hook (imports rewritten) against an in-memory authority. The mocked saveBlock behaves like useNoteCanvasDataAdapter.saveBlock: a save without preserveDrafts publishes the text it sent (useNoteCanvasDataAdapter.ts:2186-2190). The test folder has been deleted.

Results: final authority text and the saves made, each as [text, preserveDrafts].
- S1, the finder's harness. The late draft key is a bare setDraftText, then handleDurableFocusReceipt. After tree: 'abc'. Before tree: 'abcd'. Both save [abc, true]. So the mechanism exists, but only under this harness.
- S2, the realistic sequence. A draft key goes through setDraftText plus persistDraft, as useRuntimeNaturalWritingController.ts:443-446 does. Then the draft textarea's onBlur calls onPersist (DraftBlockEditorLayer.tsx:83-89), and only then does the durable onFocus arrive. Both trees end at 'abc', with saves [abc, false]. The durable key 'd' is lost in both trees, so that loss is pre-existing. The cause is the save the late key starts for itself: it runs with preserveDrafts:false, and the adapter publishes its echo. The replay joins that run (useDraftBlockController.ts:496), so it never starts its own preserveDrafts:true run.

Why S1 is unrealistic: every key in the draft starts or joins a persist run. Moving focus from the draft to the durable editor fires the draft blur before the durable focus, and the blur starts a preserveDrafts:false run if none is running. A new replay run with preserveDrafts:true, which is the after-only overwrite at useDraftBlockController.ts:620-626, therefore needs three things together:
1. The late key's save fails.
2. Focus leaves the draft to some place other than the durable editor.
3. The durable block is focused later, and the person types while a slow replay save succeeds.

- S3 forces exactly that sequence. After tree: 'abc'. Before tree: 'abcd'. But it assumes a precondition that is not reachable: the draft keeps focus for a human-length time after the handoff.

The finder's named causes do not produce that precondition:
- The new guard (BlockEditorLayer.tsx:414) cannot fire. The caret's unit comes from persistedFlow (useDraftBlockController.ts:596-604). The same flushSync publishes that flow, and useNotePageFlow builds the fragments synchronously with useMemo from the authority. So the unit's textarea exists in that render.
- "Read-only for a moment" also unmounts the draft textarea: DraftWritingEntryLayer renders it only when !contentReadOnly, and gets the same flag. No key can land in the draft then.
- A block that is not yet in `blocks` at the flushSync render mounts on the next default render within milliseconds, while the draft still has focus. That is S2's shape, which behaves the same in both trees.
- The tester's focus-gap arm L showed 0/32 after the change and never logged keys reaching the draft after the handoff.

Latent hazard, hence a nit rather than no finding: the handoff publishes the save echo unconditionally, even on a replay run. If a future change makes late focus real, this becomes a real loss. One example is the A-25 fix, which defers the handoff until compositionend. That fix should publish the echo only on the non-replay run, or only when the authority still equals the text that was sent.

**vote1** refuted=True repro=False reach=False nw=no sev=none
The finding misreads the mechanism. Its repro calls setDraftText for the late key without calling persistDraft, and the real UI never does that.

1. In both trees, every meaningful keystroke in the draft textarea goes through handleDraftChange (useRuntimeNaturalWritingController.ts:445, unchanged). That function calls persistDraft(value) synchronously. So the late key starts its own run immediately. The block already exists and placement is persisted, so that run reaches saveBlock synchronously with preserveDrafts = replayingHandoffRef.current = false (useDraftBlockController.ts:570).

2. When the durable editor then takes focus, handleDurableFocusReceipt calls persistDraftRef.current(). That call returns the run already in flight (useDraftBlockController.ts:501) and does not start a preserveDrafts:true replay.

3. When that save returns, useNoteCanvasDataAdapter.saveBlock (unchanged) publishes the text and flow it sent into the authority (useNoteCanvasDataAdapter.ts:2186-2190). In the BEFORE tree too, this wipes any letters typed in the durable editor while the save was out. The new flushSync at useDraftBlockController.ts:620-626 then republishes the same echo, so the outcome is identical.

Reproduced at hook level. I drove the real post hook and a copy of the pre hook the way the UI does (setDraftText plus persistDraft on the late key), with a saveBlock mock that publishes like the adapter when preserveDrafts is false. Both end with authority 'abc'. The replay save carried preserveDrafts:false in both trees, and only one save was issued.

The two trees differ only if the late key's own save has already FAILED before the durable editor takes focus. Then the focus receipt starts a fresh preserveDrafts:true replay, and the after tree ends 'abc' while the before tree ends 'abcd'. I do not think this is reachable:
- BlockEditorLayer is not memoized, and autoFocusSelection is a new object on every surface render (NoteWritingSurfaceLayer.tsx:2002). So the focus effect (BlockEditorLayer.tsx:398-422) runs again on the render committed right after the late key. That render comes before any network reply.
- The guard at BlockEditorLayer.tsx:414 can only defer focus until the caret's unit renders. That unit is published in the same flushSync as the reconciliation.
- When contentReadOnly is true the draft textarea is unmounted (DraftWritingEntryLayer). When structureTypingHoldsFocus is true, keys go to the words box, not the draft.
- So the path needs focus deferred for a whole failed round trip while keys still land in the draft, then a failure that clears before the next save succeeds. No UI path at about 110 ms RTT produces that sequence.

In the realistic late-focus path, the loss of letters typed during the save's flight is pre-existing and unchanged. It is not caused by this change.

## [handoff-1] plausible | Stale draft receipt now blocks every later auto-focus of the first block once its caret unit has left it
sev=minor pre=no repro=False standing=1

**user_scenario**: New note. The create returns after the Enter, so the handoff caret is on line 2 (receipt {A, tu-2}). Line 2 then becomes '# head' and is extracted to block B, which is the tester's own warmup / # head scenario. Later something asks block A for focus while focus is outside it, for example a slash template conversion that remounts A's editor and calls setFocusBlockId(A) (useSlashCommandController.ts:654, or :607).

**mechanism**: draftOwnerReconciliation is kept after the handoff (clearLocalDraft preserveReconciliation, useDraftBlockController.ts:471/476). It is passed to block A as autoFocusReceipt for the rest of the draft session (NoteWritingSurfaceLayer.tsx:1999-2007). The new guard at BlockEditorLayer.tsx:414 returns whenever the receipt's unit is missing and the block has unit textareas. Before the change it fell back to textareaRef.current. focusBlockId stays A and nothing gets focus.

**repro**: Reasoned from code only; no harness renders BlockEditorLayer with autoFocusReceipt. I did not confirm whether the slash menu keeps editor focus by itself.

**user_impact**: After such an action in the note's first block the caret does not come back. Keys go to the page body until the person clicks. No stored text changes.

**files_lines**: ['client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:409-416', 'client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:1999-2007', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:283', 'client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:654']

**vote0** refuted=True repro=False reach=False nw=no sev=none
The mechanism is real, but the named triggers cannot reach it. I tested this with a real harness.

What is true:
- `draftOwnerReconciliation` stays alive after the handoff. That was already so before the change: `useDraftBlockController.ts:471/476` passes `preserveReconciliation`.
- Heading extraction keeps segment 0 in block A and moves the heading unit to a new block (`useHeadingStructureController.ts:205-213`), so a receipt of {A, tu-2} goes stale.
- The new guard at `BlockEditorLayer.tsx:414` then declines to focus. My control test confirmed this: stale receipt, focus on an outside button, `setFocusBlockId(A)`, and focus stays on the button. Without a receipt the same request lands in tu-1.

Why the named triggers do not leave the caret out of A:
1. Slash menu items call `preventDefault` on mousedown (`SlashMenuLayer.tsx:45-47`), so focus stays in A's textarea. When `setFocusBlockId(A)` arrives, the effect returns early at the "focus already inside the block" check, before the guard.
2. The template path at `useSlashCommandController.ts:653` goes through `useTextFlowHistory.applyTemplateToBlock`. Its `persistTemplate` always calls `restoreSelection(blockId, after.selection)` in its `finally` block (`useTextFlowHistory.ts:297`). The layout effect at lines 114-123 then focuses the after-flow's first unit, whatever the autoFocus guard does.
3. The writing-role path (lines 587-607) keeps the unit id. Rows are keyed by `unit.id` (`TextBlockProjection.tsx:1671`), so the textarea is not remounted and keeps focus.
4. The other callers of `setFocusBlockId` cannot target a user-typed first block holding a live receipt:
   - Heading `onFocusBlock` places focus itself through `placeTyped`.
   - Cover and binding target `note_ref` blocks.
   - The link-block fallback runs on navigation from another note, and a note change resets the reconciliation.
   - The source-open fallback needs a block that has a source reference.

Reproduction: a temporary test in `src/__review__/verify-handoff-1-repro` of the scratch copy. It rendered the real `BlockEditorLayer` with the real `useTextFlowHistory`, `usePlacementHistory` and `useBlockDraftAuthority`. Block A held only tu-1, with a stale receipt {A, tu-2}, a fresh `autoFocusSelection` object on every render, `onFocused` clearing `focusBlockId` the way `markBlockFocused` does, and `contentReadOnly = textHistory.replaying`. Only the adapter's server half was stubbed. Results:
- Template conversion with focus starting in A: focus stays in tu-1.
- Writing-role edit through `applyEdit` followed by `setFocusBlockId(A)`: focus stays in tu-1.
- Template conversion with focus already moved outside before the request: focus returns to tu-1 through the history's selection request, even though the guard blocked autoFocus.

All 5 tests passed, so the user-facing claim ("caret does not come back after a slash action in the first block") did not reproduce. No stored text is affected in any case. The test folder has been deleted.

**vote1** refuted=False repro=True reach=True nw=yes sev=minor
Not refuted. The mechanism is real and new, but it is reached by a slightly different route than the finder described.

Mechanism, confirmed by reading both trees:
- The draft receipt is kept after the handoff. clearLocalDraft(..., {preserveReconciliation:true}) runs at useDraftBlockController.ts:471/476. The receipt is cleared only when a new draft session starts (:429) or on discard/reset. So the most recently draft-created block keeps receiving it as autoFocusReceipt (NoteWritingSurfaceLayer.tsx:1999-2007, a file this change does not touch).
- After the change, BlockEditorLayer.tsx:414 returns without focusing anything when the receipt's unit is missing and the block has data-text-unit-id textareas.
- The before tree fell back to textareaRef.current, which is the first unit.
- Component-level reproduction on the after tree: I rendered BlockEditorLayer with autoFocus=true, a flow containing only tu-1, and a receipt naming a unit that is gone. document.activeElement stayed BODY across rerenders. The control case (no receipt) focused tu-1. I deleted the test afterward.

Correction to the finder's route. The heading extraction is not needed, and the exact sequence given does not reach the guard. After "warmup / # head" is extracted, A holds only tu-1. A "/" typed in tu-1 keeps that textarea mounted, so the guard's early return for "active element inside the block" applies.

Actual reachable path:
1. In a new note, the create/save loop ends after the first Enter, so the handoff caret is on line 2 (the receipt names a unit minted for that line, not 'tu-1').
2. Later, in that same block, on any line other than the first, the person opens the slash menu and picks "Text". It is the first command in NOTE_SLASH_COMMANDS. It is also what "/" + Enter selects, and the first match for "/p", "/text" and "/body". The mouse also works: SlashMenuLayer prevents default on mousedown, so focus stays put until the conversion.
3. The template path (useSlashCommandController.ts:640-654 → useTextFlowHistory.applyTemplateToBlock → buildBlockTemplatePayload → contentForTemplate → attachFreshTextFlow) replaces the flow with a single fresh unit 'tu-1'.
4. The textarea the person was typing in unmounts, so focus falls to body.
5. After the save (about 110 ms), setFocusBlockId(A) runs. The receipt's unit is gone and tu-1 is rendered, so the guard returns and nothing is focused. focusBlockId stays A.
6. In the before tree, the same steps focused tu-1, at the old handoff offset clamped to the text.

Other paths I checked, which do not reach the guard:
- Code and formula conversions: their projections have no data-text-unit-id, so the fallback still applies.
- Writing-role slash commands (:607): the unit keeps its id and its textarea, so focus stays.
- Heading structure onFocusBlock: placeTyped's finish() focuses the editor explicitly.

Impact: after this rare command, the caret does not come back. Keys typed before the person clicks are dropped, and they can see nothing appearing. No stored text changes and nothing is misplaced. Rated minor because it is new, but the reach is narrow.

## [handoff-2] plausible | Why 'warmup\n# abcd' is saved as one unit with a newline: in-app leave finalizes the draft without its flow
sev=minor pre=yes repro=True standing=1

**user_scenario**: Arrive at a new note in-app (from another note), type 'warmup', Enter, '# abcd' while the first block is still a draft, then leave in-app (Back to an in-app history entry, or a link). This is the tester's bk2 back-1 result, the same before and after.

**mechanism**: resetDraft runs only when note.id changes on the mounted editor (useDraftBlockController.ts:377-382), so only in-app navigation reaches it. A full page load or refresh unmounts without it. That explains the in-app versus direct-load difference. resetDraft builds the recovery receipt from draftTextFlowRef, which is null for typed drafts (:317, :339-341), so contentJson is undefined. finalizeDraftBlock then uses contentForTemplate(template, body) (useNoteCanvasDataAdapter.ts:1674-1675), which uses attachFreshTextFlow, which uses createTextBlockContentV1(body) (textFlowService.ts:234-242). The result is one unit holding 'warmup\n# abcd', with no '# ' conversion. With the same client key, saveLatest PUTs that content even if the create already landed split. The draft must not yet have been handed off (durableHistoryRecordedRef false). Persist runs that return before the handoff are at :536, :545 (placement not persisted) and :555. I did not determine which one held it in bk2.

**repro**: Hook test with the real useDraftBlockController: activateDraft; setDraftText('warmup'); persistDraft (create held); setDraftText('warmup\n# abcd'); rerender with another note id; resolve the create. Result: finalizeDraftBlock receives contentJson undefined and text 'warmup\n# abcd'. contentForTemplate on that body gives units ['warmup\n# abcd']. resetDraft and the adapter are byte-identical in the before tree.

**user_impact**: The wrong structure is saved: two lines become one paragraph unit with a line break inside, and the heading is never made. The builder's own draftFastEnter test comment says such a unit risks its hidden part being overwritten on the next save.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:316-348', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:377-382', 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1674-1675', 'client/src/pages/Notes/canvasEngine/textFlowService.ts:234-242']

**vote0** refuted=False repro=True reach=True nw=no sev=minor
I could not refute it. The test reproduced the finding with the real useDraftBlockController, the real contentForTemplate and the real finalizeDraftRecoveryReceipt. The test file was at <review-copy>/rv2/client/src/__review__/verify-handoff-2-repro/inappLeaveFinalize.test.tsx and I deleted the folder afterwards.

The test typed each key the way handleDraftChange does in useRuntimeNaturalWritingController.ts:439-446 (setDraftText, then persistDraft(value)). It typed 'warmup\n# abcd', then rerendered with another note id. That rerender is the in-app note switch, which reaches the layout effect at useDraftBlockController.ts:377-382. NoteDetail does not key the editor by note id, so the editor stays mounted.

- **Case A, create still in flight:** the create POST carried only 'w'. The receipt had text 'warmup\n# abcd' and no contentJson, because draftTextFlowRef is null for a typed draft (:317, :339-341). I fed it through the same expression the adapter uses (useNoteCanvasDataAdapter.ts:1674-1675). The saveLatest PUT had one unit: [paragraph, 'warmup\n# abcd'].
- **Case B, create landed and the latest save held:** the save already in flight correctly sent split units ['warmup', '# abcd']. After the switch, finalize's saveLatest under the same client key PUT the single unit 'warmup\n# abcd' again. That last write throws away the correct split.
- **Receipt layout:** canonicalizeDraftRecoveryReceiptForSurface (useRuntimeNaturalWritingController.ts:79-104) only changes the layout, so the test's simplified canvas_workspace/outside layout does not change the content result.

The harness is realistic. A person reaches this by typing a line, Enter and '# text', then leaving in-app (Back to an in-app entry, or a link) before the create or latest-save round-trip finishes and hands off. This matches the tester's bk2 back-1 result: one unit with a newline, before and after. No words are lost. The structure is wrong: the heading is never made, and two lines are stored as one unit with a line break inside.

It is pre-existing. resetDraft and the note-change effect are unchanged by the patch; the useDraftBlockController.ts diff touches only draftFlowForText, the handoff and flushSync. useNoteCanvasDataAdapter.ts, blockContentService.ts, draftBlockPersistence.ts and textFlowService.ts are byte-identical between the pre and post trees.

This change did not set out to fix it. The builder's receipt covers in-app leave only for the structure window after handoff, and the restored conversion of a draft '# ' to a heading runs only at handoff, which this path never reaches. So it is real but not new or worse. It is minor as a defect and should not count against this change.

**vote1** refuted=True repro=False reach=True nw=no sev=none
Refuted on novelty: the behavior is identical before the change. A real person can reach it, and the finder reads the mechanism correctly.

Reachability: real. The tester saw it in a real browser on the real backend, in both trees (notes.md:67, "bk2 back-1（修前修后都有）"). The path is: arrive at a new note in-app, type "warmup", Enter, "# abcd", then leave in-app while the first block is still a draft that has not been handed off.

Mechanism: I checked it statically and agree with it. The layout effect that runs when note.id changes calls resetDraft (after tree useDraftBlockController.ts:377-382). resetDraft reads draftTextFlowRef, which stays null for a typed draft. syncDraftTextFlow (:214-223) only updates a flow that already exists. persistDraft keeps its flow in a local variable and assigns the ref only when options.textFlow is passed (:499). So the receipt's contentJson is undefined (:339-341). finalizeDraftBlock then falls back to contentForTemplate(template, body) (useNoteCanvasDataAdapter.ts:1675), which saves one unit holding "warmup\n# abcd". No words are lost; the structure is wrong.

Novelty, from reading both trees:
- resetDraft is byte-identical. I diffed pre :293-363 against post :312-382 and they match.
- These files are unchanged between the trees: useNoteCanvasDataAdapter.ts, textFlowService.ts and draftBlockPersistence.ts (which holds finalizeDraftRecoveryReceipt). A diff -rq of client/src shows none of them.
- The only edits to useDraftBlockController are inside the persist loop and the handoff: the draftFlowForText memo, the added await Promise.resolve() and the flushSync. None of them touches the reset or finalize path. The extra microtask does not make the window before the handoff any longer in a way a person would notice.
- The new flushPendingSaves line (useNoteCanvasRuntimeController.ts:848) only adds whenTypingSettled in front of the whenDraftIdle that was already there.

Not something the change set out to fix:
- The new conversion of a draft "# " into a heading (useSlashCommandController.ts:178-200 with headingRequestForDraftText) runs only after the handoff, because it is keyed on draftOwnerReconciliation.
- The receipt's leave-path rows ("应用内点链接切走 / 浏览器后退") are about the heading structure window, not about a draft abandoned before its handoff.
- The receipt makes no claim about this path.

I did not run a test myself. The finder's hook reproduction covers the after tree, and because the code path is byte-identical, the before tree must give the same result. It is a pre-existing structure defect: two lines saved as one unit, and the heading never made. If it is not already tracked, file it separately; it is not a regression of this change.

## leads
[]

# AREA commit

## coverage
Read the full diff and the after and before versions of useHeadingStructureController.ts (rendered/commitWaiters/mounted, watchdog, runStructureBatch and failure paths, publishTextHalves, placeTyped, restore effect, whenTypingSettled), useTextFlowHistory.ts (scope, runBatch, persist*/extractUnit/moveUnit, canApplyEdit/isEditHeld, boundary/flush), usePlacementHistory (queue, whenHistoryIdle, pushHistoryEntry), structureTypingBuffer/Focus, the projections' heading/blur paths, the draft handoff, the slash-controller draft-heading effect and clearBlockSelection. Also read the tester's z/z2 rows and network traces. Tests, all in the scratch copy driving the real hooks and run one file at a time (folder deleted afterwards): Enter-in-window followed by a stall of the second structure (loses words after the change, keeps them with the before hook); watchdog after the role edit with the second structure colliding with the abandoned batch (loses words; a race); watchdog during create, unit-transfer and reorder (words kept and placed after release: no finding); undo/redo of window typing, plain and with Enter (one undo step, redo and repeat correct: no finding); commit waiter against an injected sync commit (A-21 write-back returns). Not covered: real browser or input-method timing, toast/notice rendering, the account and refresh paths (already ruled).

## open_question
Not fully explained. What the sample shows: the run was unusually slow (DOM still '#' 2.86 s after the last key; server not split 5.3 s after '# '). The one-block server state [warmup, empty heading] at +4.9 s does not prove the role edit had run, because the editor's blur already saves exactly that at window start (finding 3). The only path I could reproduce that ends with 'head' never arriving, an empty heading and no notice is finding 1(b). The 10 s watchdog (counted from the '# ') fires while the role edit's text-save is still outstanding. The placement goes into the still-unsplit block and starts a second structure. That structure is refused because the abandoned run still holds the history batch (or it stalls into its own watchdog). The second buffer counts as unchanged and is closed. Expected traces of this path: a second 'Heading changes could not be completed' toast, and a role-edit text-save returning more than 10 s after the '# '. This path leaves one block, so the later split into [warmup][empty heading] is not explained by it. That split needs another structure afterwards; any later edit in a block holding a heading plus another unit requests one. Ruled out by test: a watchdog during create, unit-transfer or reorder keeps the words and places them after release; only a failed transfer answer would leave them on screen with the notice. I found no click-specific path. A click can only release a commit waiter early (finding 2), and at 2.9 s the run was not in such a wait.


## [commit-0] confirmed | Words typed in the window are lost when they are handed to a second structure that stops before its first edit
sev=major pre=no repro=True standing=2

**user_scenario**: (a) Type '# Sec' and keep typing while the heading commits: 'Two', Enter, 'Body words'. The first structure finishes, but on a slow or hung network the second structure (the one that moves 'Body words' into its own block) waits more than 10 s in whenWritesIdle or flush. Its watchdog fires and everything typed in the window disappears: 'Two' and 'Body words'. The person sees only the generic failure toast. There is no 'not in the note yet' notice and nothing is kept in localStorage. (b) Type '# head' while the commit is slow enough that the 10 s watchdog fires after the role edit but before the split (the role edit's text-save is still outstanding). The placement lands in the still-unsplit heading block and requests a second structure. That structure reaches runStructureBatch while the abandoned run still holds the history batch, so it is refused. 'head' is gone, two failure toasts appear, and the note keeps an unsplit heading block.

**mechanism**: placeTyped (hooks/useHeadingStructureController.ts:353-357) sends text that needs a structure to onHeadingStructure. commitStructure then closes the waiting buffer without retaining it (:148-149) and opens a new one (:150-151) whose initialText already contains the typed words (the opening unit text comes from the new nextTextFlow). From then on the words exist only in the second request. If the second structure exits before its first applyEdit, its exit calls placeTyped with the new buffer, which counts as unchanged, so :325-327 finish() closes it. Exits that cause this: its watchdog (:169-176); scope.runBatch refusing while the abandoned run's batch is still open (hooks/useTextFlowHistory.ts:585, reached through :946); or flush throwing. A second commitStructure from any other source has the same effect (:148-149) while a buffer waits for an editor (up to 3 s) or is retained.

**repro**: Tested in a scratch copy with the real useHeadingStructureController, useTextFlowHistory and usePlacementHistory, faking only persistence (the builder's harness). (a) Note [Intro, '# Sec'], heading request, buffer typed 'Two', '\n', 'Body words'. whenWritesIdle resolves on the first call and hangs on the second, watchdogMs 1500. Right after the second structure starts, the screen shows heading 'Sec' and buffer 'Body words' ('Two' is already invisible). After its watchdog, server, drafts and buffer contain neither 'Two' nor 'Body words', and no notice is shown. The same test against the before-tree hook keeps 'SecTwo' and 'Body words'. (b) watchdogMs 600, the role-edit save held, buffer typed 'kept'. After the first watchdog the buffer becomes 'Seckept' (second structure). The save is released after that structure enters runStructureBatch; log: start, start, result:false (second), result:false (first). End state: server source [Intro, heading 'Sec'] in one block, 'kept' nowhere, two failures. Releasing the save before the second structure reaches runStructureBatch makes it succeed, so (b) is a timing race.

**user_impact**: Every word typed during the heading window (the heading's tail and any body text after Enter) vanishes with no trace. In (b) the note also keeps an unsplit heading block. Under the same stall the first structure keeps the words as literal text; only the hand-off to a second structure drops them.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:148-151', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:325-327', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:353-357', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:169-176', 'client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.ts:585', 'client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.ts:946']

**vote0** refuted=False repro=True reach=True nw=yes sev=major
I could not refute this. All three variants lose words when I drive the real hooks: useHeadingStructureController, useTextFlowHistory and usePlacementHistory, with only persistence faked (the builder's own harness from useHeadingStructureController.test.tsx). The test files are deleted.

Setup: note [Intro, '# Sec']. The heading request is the builder's own splitHeading. Typed in the box: 'Two', '\n', 'Body words'.

(a) whenWritesIdle resolves on its first call and hangs on its second; watchdogMs is 1500.
- After the first structure: server [Intro][heading 'Sec'][End], box 'SecTwo\nBody words'.
- Once the second structure starts, the box shows only 'Body words'.
- After its watchdog: server, flow drafts and text drafts all show [Intro][heading 'Sec'][End]. The box is closed, there is no 'not in the note yet' notice, and nothing is in localStorage. 'Two' and 'Body words' are gone.

(a-cont) Same, but the person keeps typing ' more' into the second box. The end state is heading 'Sec more': the earlier words are lost and the new ones land in the heading. Cause: placeOnLiveText (useHeadingStructureController.ts:59-68) sees a live text that differs from the box's initial text, so it keeps only the newly typed tail.

(a-leave) The note unmounts (in-app note switch) while the second structure waits before its first edit. leaveBuffer (:108-115) sees an unchanged box and closes it. Both phrases are lost, with no notice and nothing stored. Under the first structure, the same leave keeps the words on screen and in storage.

(b) watchdogMs 600, the role-edit save held, 'kept' typed. After the first watchdog the second box reads 'Seckept'. I released the save 250 ms after the second structure passed whenWritesIdle. End state: server [[Intro, heading 'Sec'], [End]], an unsplit heading block, 'kept' nowhere, two failure calls. This one is a timing race: the abandoned run still holds the history batch (useTextFlowHistory.ts:585 via :946). In the real app whenWritesIdle also waits for the held save, so the exact interleaving may differ.

Mechanism, confirmed:
- placeTyped (:353-357) hands the box's text to a second structure.
- commitStructure closes the waiting box without retaining it (:148-149) and opens a new box (:150-151) whose initial text already includes the typed words.
- From then on the words exist only in the second request. Any exit before its first applyEdit (watchdog :169-176, the catch, a refused batch, an unmount) calls placeTyped on an 'unchanged' box, and finish() at :325-327 discards it.

Before tree: I ran the old hook (pre/.../useHeadingStructureController.ts, imports pointed at the copy) through the same scenario. The second whenWritesIdle is never called and there are no failures. Both the stall case and the unmount case end with flow and text drafts holding heading 'SecTwo' plus body 'Body words' in block new-1. That is an unsplit block, but no word is lost. So this loss is new.

How likely it is in the app: in useNoteCanvasRuntimeController.ts, whenWritesIdle is the write registry's whenIdle (inFlightWriteRegistry.ts), which waits for every tracked write. So any tracked write still running for more than 10 s when the second structure starts triggers (a). The tester's 12 s text-save hold is the same kind of fault. Under that fault the first structure keeps the words; only the hand-off drops them.

The user path is ordinary: type '# ' then 'Sec', Enter, 'Body' at normal speed. Body after a heading always goes through this second structure. What makes it rare is the stalled or failing network, not the typing, so I keep the severity at major.

I only reasoned about, and did not reproduce, which real writes would still be running when the second structure starts. I also did not tie this to the tester's single unexplained loss, which had no Enter and so should not reach the second-structure path.

**vote1** refuted=False repro=True reach=True nw=yes sev=major
I could not refute this. The mechanism is read correctly, the change introduced it, and it is reachable with one failed request, much more easily than the finder's 10 s hang.

Mechanism (after tree, hooks/useHeadingStructureController.ts):
- When placeTyped sends the typed words into a structure (:353-356), commitStructure closes the old buffer without keeping it (:148-149). It opens a new buffer whose starting text already contains the words (:150-151).
- placeTyped then returns at :356, and the words now exist only in the second structure's request.
- Every exit before that structure's first edit (catch :252-257, watchdog :169-176) calls placeTyped with the new buffer. That buffer counts as unchanged, so :325-327 closes it.
- The retain path at :301 and :330 only runs when typing.changed() is true, so it never fires here.
- :356 also calls settled(), which releases whenTypingSettled while the words are still in flight.
- The before tree has no second structure: replayTyped (pre :242-288) writes the words directly into the block.

Easier trigger than the finder's: one fast 500 on the save of the heading's role edit.
- Steps: type '# Sec' on a line under other text in the same block (the usual case, as in the tester's 'warmup⏎# head'), then keep typing in the window.
- The role edit applies, its save fails, and flush throws because scope.failures is not empty (useTextFlowHistory.ts:938-943). The first structure exits through catch.
- placeTyped then succeeds: canApplyEdit (useTextFlowHistory.ts:637) ignores scope.failures, and the runtime onSaveFailure only shows a toast (useNoteCanvasRuntimeController.ts:391).
- The block still holds two units, so headingStructureRequestForEdit returns a structure (headingInputService.ts:30) and the words are handed off.
- In the real adapter the failed block-save is recorded in the write registry (useNoteCanvasDataAdapter.ts:2256-2260), so the second structure's whenWritesIdle rejects (inFlightWriteRegistry.ts:9-16). It exits at once through catch and the words are dropped.

Reproduced in the scratch copy with the real useHeadingStructureController, useTextFlowHistory and usePlacementHistory. Only persistence was faked, using the builder's harness. I also ran the before-tree hook against the same harness. The test folder is deleted.
- F1, after tree: note [Intro, '# Sec'], the first save returns 'rejected', 'kept' typed in the window. The second structure starts with buffer 'Seckept'. The harness has no whenWritesIdle, so it stalled until its watchdog (set to 2 s). Then the buffer closed: 'kept' is nowhere (live flow, drafts, server, localStorage), no notice, two failure calls, and the block is left as an unsplit [Intro, H:Sec].
- F1, before tree: the live flow keeps [Intro, H:Seckept].
- F2 (finder's scenario a, with a rejection instead of a hang): the first structure succeeds and the second whenWritesIdle rejects. After tree: 'Two' and 'Body' are gone within about 500 ms, with no notice. Before tree: [H:SecTwo, Body] kept.

Novelty and scope:
- Typing Enter and body text inside the window is routine; the tester's twoHeadings and win-enter probes do it.
- The tester's 500 and offline probes failed the unit-transfer step. That holds the note, so the words were kept on screen; the role-edit save failure path was not measured.
- None of the six items already ruled on covers this.
- What the person loses: everything typed in the window (the heading's tail and any body text), shown only as a generic failure toast, while the note keeps an unsplit heading. The change set out to keep these words through every exit (comment at :162-164).

Not verified:
- Scenario (b) depends on timing in the real app: whenWritesIdle also waits on the held block-save, so the outcome is a race between two frames. It loses words for certain only if the save later fails, or hangs past both watchdogs.
- The sub-claim that a second commitStructure from another source clobbers a waiting or retained buffer (:148-149) is correct as read, but I did not find or test a real trigger. It may explain the tester's 1-in-28 loss; that is unconfirmed.

## [commit-1] confirmed | The commit waiter can be released by an unrelated sync-priority commit, so the A-21 write-back can still happen
sev=minor pre=yes repro=True standing=2

**user_scenario**: A heading lands in the middle of a paragraph block, so the split needs two extractions. While the first unit-transfer answer is coming in, a click or another React-handled discrete event that updates state is processed after the frame and before React's default-priority render. The next extraction then reads the old flow, sends the moved unit back to the source block, and the structure fails: the heading text ends up duplicated and the blocks are out of order.

**mechanism**: rendered() (hooks/useHeadingStructureController.ts:156-161) pushes its waiter and requests a commit at default priority. useLayoutEffect(releaseCommitWaiters) (:128) releases waiters on any commit of the host component, including a sync-lane commit (a discrete event or flushSync). In React 18.3.1 a sync render does not include pending default-lane updates: getNextLanes only joins input-continuous updates with default ones. The waiter therefore resolves while latest.current still holds the pre-transfer flow. The builder's own comment in useDraftBlockController (flushSync does not reach the save's priority) describes the same lane split.

**repro**: Harness variant in which blocks and drafts are React state (as in the app). Flow [aaa, bbb->heading, ccc]; requestAnimationFrame fires immediately (the A-21 timing). Control: transfers [[aaa,ccc],[aaa]], result correct. Same run with flushSync(state bump) in the frame callback: transfers [[aaa,ccc],[aaa,bbb]], run fails, final blocks [[aaa,bbb],[End],[bbb],[ccc]]. The real trigger (an input event in that sub-frame gap) is reasoned, not observed in a browser.

**user_impact**: Rare. The heading text appears twice and the block order is wrong after a failed split. This is the A-21 symptom the change set out to remove; the before tree was worse (a frame alone was enough).

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:128', 'client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:156-161']

**vote0** refuted=False repro=True reach=True nw=no sev=minor
I could not refute this. A test that drives the real hooks reproduced it: useTextFlowHistory, usePlacementHistory and useHeadingStructureController, mounted with render() in one host component. Blocks, flow drafts and text drafts were React state in that host, as in the app. useNoteCanvasDataAdapter.ts:3078-3080 sets them with setBlocks, setBlockTextFlowDrafts and setBlockTextDrafts after an awaited fetch, so they run at default priority, and NoteCanvasRuntime holds them together with the controller. Persistence was faked the same way as in the builder's own test. requestAnimationFrame fired immediately, the same A-21 timing the builder's test uses at useHeadingStructureController.test.tsx:355.

- Control: flow [aaa, bbb->heading_1, ccc] with no click. Transfers were [[aaa,ccc],[aaa]] and the final blocks were [aaa][bbb][ccc][End], which is correct.
- Same run, plus one real DOM click dispatched right after the frame callback that follows the first transfer, with no act wrapper. The button's React onClick changes an unrelated host state. Transfers became [[aaa,ccc],[aaa,bbb]] and the final blocks were [aaa,bbb][bbb][ccc][End]. The heading text is duplicated back into the source block. The run returned true and onFailure was never called, so this is worse than the finder said: no failure toast, just silent duplication.

Mechanism: rendered() at :156-161 pushes the waiter and calls requestCommit at default priority. The no-deps useLayoutEffect(releaseCommitWaiters) at :128 also runs on the sync-lane commit caused by the click. In React 18.3.1 that commit leaves out the pending default-lane updates, so latest.current still holds the flow from before the transfer. extractUnit (useTextFlowHistory.ts:733) reads that flow. baseFor at useTextFlowHistory.ts:165-169 takes the synchronous committedBases revision, so the server's revision check would not catch the write-back either.

The builder's test harness misses this because there blocks live in a mutable object that every render re-reads, so even an early sync render sees fresh data.

How someone gets here: a click inside the editor during the structure window that changes NoteCanvasRuntime state (for example interactionState from clicking another block, or a toolbar toggle). It must land between the frame callback and React's default render, which is a gap of a few milliseconds, and the heading must be in the middle of a paragraph, so it needs two transfers. Typing does not trigger it, because the words box sits on document.body outside the React root and its keys reach no React handler. A click that changes state only in a child component does not either, because the host does not re-render. So it is rare.

Pre-existing, from reading the before tree: rendered() was just afterFrame(resolve), so a frame alone was enough to cause the write-back. The change narrowed the A-21 hole but did not close it. Severity stays minor because of the narrow timing; the loss is duplicated heading text plus wrong structure, and the person is not told.

The scratch test folder src/__review__/verify-commit-1-repro/ was deleted afterwards.

**vote1** refuted=False repro=True reach=True nw=no sev=minor
Not refuted, but it is a small leftover of A-21, not a new defect.

Mechanism is read correctly. I checked the installed react-dom 18.3.1. getNextLanes adds DefaultLane only to InputContinuousLane work, never to SyncLane, and this build has no unified sync lane. To test it, I wrote a pure-React copy of the waiter: requestCommit plus useLayoutEffect(release), as at useHeadingStructureController.ts:124-128 and :156-161. I used a real dispatched click instead of the finder's flushSync. Sequence: a DefaultLane setState from outside any event, as the transfer answer does in useNoteCanvasDataAdapter.ts:3080-3082; then the waiter is pushed and requestCommit runs; then a click whose handler changes the host's state. The waiter resolved with the old value ('pre-transfer'), and the DOM showed the new value only afterwards. Control with no click: the waiter saw the new value. A click whose handler set a state to the value it already had did not release the waiter early, because React bails out and skips layout effects. So the trigger must really change state in NoteCanvasRuntime, which hosts the controller, data adapter and selection hooks, or in an ancestor that passes it new props. The full controller was not driven by me. The finder's harness covers that part (it used flushSync). I deleted my test folder afterwards.

Reachability: reachable, but only through a narrow timing race. All of these must hold:
(a) The split needs two or more unit transfers that read each other's result. This happens when a person turns any line except the last of a multi-line paragraph block into a heading: two extractions, or an extraction then moveUnit at :201-219. Where the heading is the last line, as in warmup + '# head', there is one extraction. The next read after it goes through restore()'s own rendered() at :225, so that case is safe. This also means the finding does not explain the tester's 1/28 loss: that was a single extraction, and the unit was still a literal '#'.
(b) The animation frame fires before React's default-priority task for that transfer. This is the A-21 ordering, and it is common in the tester's environment.
(c) In the few milliseconds between that frame callback and React's default task, a discrete event changes NoteCanvasRuntime state: a click, Escape while a selection draft is open, or a shortcut that changes store state the runtime reads.

Typing cannot trigger it. The words box is appended to document.body (structureTypingBuffer.ts:109), outside the React root #root. The global keydown listeners (AppLayout.tsx:97-117, NoteWritingSurfaceLayer.tsx:837-847) ignore plain keys. The zustand selectors in the runtime hooks are stable (mainly addToast). So the person has to click during the structure window, and the click has to land inside that small gap. That is plausible behaviour but improbable timing, which fits the tester's 0/20 result for clicks inside the window.

Novelty: the before tree has rendered() = afterFrame only (pre useHeadingStructureController.ts:118), with the same multi-transfer loop (:166, :178). There, condition (b) alone caused the write-back. The after tree needs (b) plus (c), so exposure is strictly smaller. This is not new or worse; the change narrowed A-21 but did not close it.

Impact if hit: the heading line ends up duplicated in the source block, blocks are out of order, and the split may fail with no rollback. Kept at minor because it is so rare.

Possible exact fix (reasoned, not tested): store the requested count with each waiter and release only when the rendered count reaches it. A SyncLane render skips the DefaultLane requestCommit update, so the count cannot advance unless the transfer's default batch was included.

## [commit-2] plausible | Each heading window now starts with an extra save of the unsplit heading, made by the editor's blur and outside the structure's ordering
sev=minor pre=no repro=False standing=1

**user_scenario**: Type '# ' (nothing after it) on a line below text while writes are slow, so the structure hits its 10 s watchdog before the role edit. The screen goes back to a literal '#'. The server, however, already has the line as an empty heading in the same block as 'warmup'. If the person leaves without typing in that line again, reopening the note shows an unsplit heading that was never on screen.

**mechanism**: PaginatedTextBlockProjection.tsx:157 (and TextBlockProjection.tsx:851/887) sets latestFlow to request.nextTextFlow and calls onHeadingStructure. commitStructure opens the buffer and focuses it synchronously (structureTypingBuffer.ts:111), so the editor's onBlur runs inside the same handler (PaginatedTextBlockProjection.tsx:523-527; TextBlockProjection.tsx:981). That handler calls onSave(true, undefined, latestFlow.current), which queues a raw save of [warmup, heading ''] through textHistory.saveBlock. This save does not depend on whether the run reaches its role edit. In the before tree the editor kept focus during the window, so there was no such save.

**repro**: Reasoned from code, plus the tester's z2 network traces: after '# ', the after tree issues 3 text-saves before the split's POST /blocks (14/14), the before tree 2 (14/14). The watchdog-with-nothing-typed outcome was not run.

**user_impact**: A structure the screen never showed (heading together with body in one block) can be stored, and the screen and server disagree until the line is edited again. This also explains why the open-question sample's server already had 'warmup' plus an empty heading in one block at +4.9 s while the DOM still showed '#'.

**files_lines**: ['client/src/pages/Notes/canvasEngine/blocks/PaginatedTextBlockProjection.tsx:157', 'client/src/pages/Notes/canvasEngine/blocks/PaginatedTextBlockProjection.tsx:523-527', 'client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:851', 'client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:981', 'client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts:111']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I reproduced this in a test. It renders the real PaginatedTextBlockProjection and wires it to the real useTextFlowHistory, usePlacementHistory and useHeadingStructureController hooks. onSave and onHeadingStructure are passed the way NoteWritingSurfaceLayer passes them. Only the persistence boundary is fake: it can hold writes, and whenWritesIdle waits for held writes, like the real writeRegistry idle. The test file is gone from rv4 as instructed. A copy is at <tester-scratch>/r04a-blurSave.repro.test.tsx.

What the test showed:

1. Normal path. A block holds [warmup, ''], the second line has focus, then '#' and then '# ' are typed. The server receives, in order: the history save of [warmup, '#']; a raw save of [warmup, heading_1 ''] with no base revision; the role-edit history save of the same flow; then create and transfer. That is 3 text saves before the create, which matches the tester's z2 traces (3 after the change, 2 before). The first onSave call carries the heading flow. It comes from the editor's onBlur (PaginatedTextBlockProjection.tsx:523-527), which fires when openStructureTypingBuffer focuses the buffer (structureTypingBuffer.ts:111). At that moment latestFlow.current is still request.nextTextFlow, set at PaginatedTextBlockProjection.tsx:157. The blur happens inside the change handler, before the setBusy re-render resets latestFlow.

2. Watchdog scenario. Writes are held from the moment '# ' is typed, the watchdog is shortened to 400 ms, and nothing is typed in the window. The watchdog fires, the toast is called, the buffer closes and the editor shows ["warmup","#"]. When the held write is released, the server holds [paragraph:warmup, heading_1:''] in the same block. Then the person clicks outside. The editor's onBlur calls onSave with the on-screen flow [warmup, '#'], but useTextFlowHistory.ts:924 skips it as a duplicate. That check compares against lastSave, which is the '#' typing transaction; the raw blur save at :932 never updates lastSave. So the server keeps the unsplit empty heading that was never on screen, and reopening the note shows it. The final assertion persisted == screen failed: expected [warmup, '#'], got [warmup, heading_1 ''].

Why this is new: the before tree's commitStructure captures keys with window listeners and never moves focus, so this blur save does not exist there (the tester's trace shows 2 saves). Later blurs in the before tree save the on-screen flow, because setBusy re-renders the page and BlockEditorLayer builds a new fragments array on every render (it is not memoized). That re-runs the layout effect, which resets latestFlow to the rendered literal '#'. I reasoned this part from code; I could not run the before tree.

Limits:
- Only the persistence layer is faked.
- The watchdog is shortened from 10 s; in the app this needs a text save slower than 10 s, which counts as a slow network.
- No words are lost. The harm is a stored unsplit empty heading in the same block as 'warmup'. It heals if the person types in that line again; I did not test whether the toast's Undo also heals it.
- I could not tie this mechanism to the open-question loss of 'head'. The role edit itself writes the same intermediate [warmup, heading ''] state, so the +4.9 s server state does not single out this cause.

**vote1** refuted=True repro=False reach=False nw=no sev=nit
Refuted. The extra save is real and new, but the end state the finder describes cannot be reached at normal timing, and when it can be reached the before tree saves the same structure.

1. The extra save is real (mechanism confirmed). PaginatedTextBlockProjection.tsx:157 sets latestFlow to the heading flow. commitStructure then opens the buffer before its first await (useHeadingStructureController.ts:151, structureTypingBuffer.ts:111). The editor's onBlur at PaginatedTextBlockProjection.tsx:523-527 runs inside that same step and calls onSave with [warmup, heading '']. The tester's z2 traces agree: after '# ', the after tree sends 3 text-saves before the split and the before tree sends 2. I counted every row in runs/z2-post and runs/z2-pre.

2. "Outside the structure's ordering" is a misread. The blur save goes through textHistory.saveBlock (useTextFlowHistory.ts:885-937), which uses the same history queue as everything else. It is queued before the role edit. The structure then waits for whenWritesIdle and flush before the role edit. inFlightWriteRegistry.whenIdle only resolves when no write is pending, and the raw saveBlock is registered there. So at normal round trips the blur save sends the same content the role edit sends a moment later, and the split follows. z2-post was 14/14 correct with that third save.

3. Not reachable at about 110 ms. The bad state needs a write stuck for 10 s or more, so the watchdog fires before the role edit. At normal round trips the window closes in 0.4 to 1.2 s (notes.md). A failing save does not store the heading either: the failed-transaction branch saves from the drafts, which hold [warmup,'#'], and flush or whenIdle reject.

4. Identical before the change when it is reached. The tester's runs/ea-pre held text-save for 12 s so the watchdog fired first (6/6 rows). The before tree ended with blocks [["warmup","[heading_1]"]]: the same unsplit empty heading in the same block. The cause is in the before tree's own code. Typing persists only when the edit session is sealed, and textFlowEditSession has no timer. So in the before tree the '#' save starts at flush(), whenWritesIdle passes, and the run stalls inside runStructureBatch. After the watchdog, runBatch still runs the role edit. Its run check comes only after applyEdit (pre useHeadingStructureController.ts:146-150). So the before tree applies and saves [warmup, heading ''] late. Typing nothing after '# ' does not change this: typed keys are blocked in the before tree, so they never move where the run stalls.

In the after tree, the blur seals the edit session first, so the run stalls at whenWritesIdle and stops at line 183 with no late role edit. The blur save then lands with [warmup, heading '']. Reopening the note shows the same stored structure in both trees.

5. What actually differs. Only the screen between the watchdog and a reload: the after tree shows a literal '#', the before tree shows an empty line. Both show the same failure toast. No words are lost, duplicated or moved, and the stored structure is what the before tree already stored under the same trigger.

How I checked: by reading both trees, plus the tester's real-browser rows in runs/z2-* and runs/ea-* under <tester-scratch>/verify-editor/. I wrote no test. Nobody ran the exact case of nothing typed with a held save; the before tree's result there comes from ea-pre plus the code path above. No __review__/verify-commit-2-reach folder was created.

Side note, not this finding: the blur save does explain why the open-question sample's server already had [warmup, heading ''] in one block at +4.9 s while the screen still showed '#'. It does not explain how 'head' was lost.

## leads
[]

# AREA leads

## coverage
Ran in <review-copy>/rv4/client, one file at a time, files deleted afterwards. The node_modules junction was untouched.
(1) draftLeads.test.tsx: the real useDraftBlockController from the after tree and a copy of the before-tree controller with absolute imports, under renderHook. Create and save publishes are modelled on useNoteCanvasDataAdapter.ts:1614-1619 and 2185-2190, and the authority store applies updates in call order. Cases: trailing space, leaving the note mid-create (lead 17), replay wipe (lead 7), gap-key save wipe (lead 8), stale-draft overwrite after a failed save (lead 9).
(2) headingLeads.test.tsx: the existing renderStructure harness copied in, with the real useHeadingStructureController, useTextFlowHistory, usePlacementHistory and the buffer. Cases: undo caret (lead 21), keys typed for line 1 during the window (lead 18 H3b), pure checks for leads 22/23.
(3) gapLead.test.tsx: the real controller under real React 18 scheduling (createRoot, no act, window.event undefined), with a stand-in for BlockEditorLayer's focus effect, testing the create-only handoff (lead 6) against the save-loop path as control.
Read only: the patch; post and pre sources for the controller, slash controller, heading controller, buffer, BlockEditorLayer, headingInputService, the adapter's create/save/finalize/restore paths, useTextFlowHistory.applyEdit, slashCommandReducer rollback, the surface pointer handlers, the slash menu, and NoteWritingSurfaceLayer's receipt props. I also confirmed the adapter and server noteBlockLifecycle are byte-identical pre to post.
Not run: the real BlockEditorLayer or the paged projection with page slices (lead 10 is reasoned), the real adapter with a faked API (the controller harness copies the adapter's publish rules), any browser, the server, or a real IME.

## open_question
None of the 28 leads explains the tester's 1/28 loss: in-app arrival, `warmup`⏎, a 2.5 s pause, then `# head`, with a stall before the role edit, a click outside, and `head` never arriving. The draft-side leads (6-9) need a key at the draft handoff, which here completed 2.5 s before. The heading leads are fixed or ruled. One path I could not rule out by reading: if the stall before the role edit plus a slow extract pushed the run past HEADING_STRUCTURE_WATCHDOG_MS (10 s), the watchdog at useHeadingStructureController.ts:169-176 releases busy and calls placeTyped(fallbackFocus = block-1/tu-2) while extractUnit is still in flight. Whether the words then go to a unit that is mid-move, or are only retained on screen, depends on canApplyEdit during runStructureBatch, which I did not run. Did the failing run show the 'Heading changes could not be completed' toast or a retained words box after the click?


## [leads-0] plausible | After a failed first save, going back into the block writes the old draft text over words already saved there
sev=major pre=yes repro=True standing=1

**user_scenario**: New note. Type `abc` and pause. When the block arrives, a key `d` lands in the draft (lead 6's gap) and its save fails on a bad link. Keep writing in the block (`Y`), click away so the block's own save lands (server `Yabcd`), then click back into the block.

**mechanism**: The failed run returns at useDraftBlockController.ts:576. It leaves pendingReconciliationRef, draftTextRef and draftActive as they were. On every later focus of that block, handleDurableFocusReceipt (useDraftBlockController.ts:456-468) sees a saved revision different from the draft revision. It copies the stale draft text (`abcd`) into the authority and saves it. Nothing compares this with what the block now holds. The pre tree has the same code (it adopts `draftTextRef.current.trimEnd()`).

**repro**: Controller-level vitest that drove the real useDraftBlockController on both trees, with the adapter's create/save publish modelled from useNoteCanvasDataAdapter.ts:1614-1619 and 2185-2190. Steps: create, gap key `d`, save fails, durable text `Yabcd` saved, focus the block again. Post and pre both end with the replay sending `abcd`, so the server and the screen show `abcd`. Test file deleted after the run.

**user_impact**: Everything typed in the block between the failure and the click back disappears from the screen and from the server, after it had been saved. It is rare because it needs one failed save at the handoff.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:456-468', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:576']

**vote0** refuted=False repro=True reach=True nw=no sev=none
I reproduced the mechanism, and it behaves the same before and after the change, so it does not count as a finding for this review.

Test: I wrote one vitest file in the scratch copy that drives the real useDraftBlockController with renderHook. The after tree's hook was imported as is. The before tree's file was copied with only its import paths rewritten. The adapter was modelled from useNoteCanvasDataAdapter.ts: create publishes into the authority (1614-1619), save publishes unless preserveDrafts (2185-2190), and a failed save returns status 'rejected'.

Steps:
1. Activate the draft, type `abc`, call persistDraft. The create succeeds and the handoff starts.
2. Set the link to bad. Type `d` into the draft and call persistDraft('abcd'), as handleDraftChange does. The save is rejected.
3. Call handleDurableFocusReceipt(reconciliation.to). The replay save is rejected again.
4. Set the link to good. Put `Yabcd` into the authority and on the server, standing in for the block's own save path.
5. Call handleDurableFocusReceipt(textFocusReceiptForBlock(block)) to model clicking back into the block.

Result, identical on both trees: saves `FAIL:abcd, FAIL:abcd, ok:abcd`; final server `abcd`; final authority `abcd`. The `Y` is gone from both. After step 3, draftActive=true and draftText='abcd' while pendingReconciliationRef is still set.

Cause: persistDraft returns at useDraftBlockController.ts:576 on a rejected save and clears none of this state. Every later focus on the block goes through useNoteCanvasRuntimeController.ts:553-554 into handleDurableFocusReceipt (useDraftBlockController.ts:456-468). That handler sees the saved revision differ from the draft revision and adopts the stale draft text over the authority without comparing it to what the block now holds.

Before vs after: the before tree has the same code (it adopts draftTextRef.current.trimEnd() at line 445). The only difference is how the flow is built, so the result is the same. The precondition (a key reaching the draft after the handoff starts but before the durable editor has focus) is no wider after the change. The change wraps the handoff in flushSync. The create's setBlocks publish still runs at default priority in both trees, so the durable editor appears on the next default render either way.

Scope: this was not in the change's scope. A-18 covered handoff timing under normal saves. The failure-path requirements in the A-21/A-24 ruling cover the structure-commit buffer, not a failed draft-handoff save.

Reachable: yes, but rare. It needs a key to land in a window of a few milliseconds at the handoff, that one save to fail, the network to recover before the block's next save, and then a refocus. While stuck, the draft textarea (draftActive) stays rendered over the block showing `abcd`.

Intrinsic impact: words that were already saved get overwritten, which would be major if it were in scope. Because it is pre-existing and not made worse, I set severity to none for this review. It belongs in tech-debt: after a rejected replay, clear or re-base the pending reconciliation instead of replaying stale draft text on a later focus.

The test files under src/__review__/verify-leads-0-repro/ have been deleted, and node_modules was not touched.

**vote1** refuted=True repro=False reach=True nw=no sev=none
Refuted on novelty. The finder read the mechanism correctly, but the code that causes it is the same in both trees. I checked by reading the code and did not run my own test. The finder's two-tree vitest already shows the same 'abcd' result before and after.

The mechanism is unchanged:
- After a failed save, the save loop returns early at post useDraftBlockController.ts:576 (pre :556). Nothing there was changed.
- So pendingReconciliationRef stays set (it is cleared only in clearLocalDraft, post :284). draftActiveRef stays true, and draftTextRef keeps the old text.
- handleDurableFocusReceipt (post :456-477, pre :437-456) is called on every focus of the writing surface, through handleWritingSurfaceFocusBlock in useNoteCanvasRuntimeController.ts:552-555. That wiring is the same in both trees.
- It compares durableSavedRevisionRef with draftRevisionRef, copies the draft text into the block's text, and replays persistDraft. Nothing checks whether the block was saved with newer text in the meantime.
- The only change in this patch is how the flow is built: draftFlowForText of the untrimmed text, where pre used draftTextFlowFromText of the trimmed text. That does not change the outcome.

The precondition is a key landing in the draft after the last save but before the durable editor's focus receipt. This was easier to hit before the change. Pre sets focus in an async continuation with no flushSync, so the draft keeps focus for at least one render. The comment at pre :442 was written for exactly that case. The tester's L arm (focus gap) shows 5/32 failures before and 0/32 after. Post narrows the gap with flushSync (post :620-630). The only extra post path I can see is the early return in BlockEditorLayer.tsx:414 when the target unit has not rendered yet, and that is the separate lead 6.

After the failure, the leftover draft textarea stays mounted on top of the block with the old text: DraftWritingEntryLayer.tsx:74 renders it while draftActive is true. That file, DraftBlockEditorLayer.tsx and the CSS are byte-identical in both trees. So clicking back into the block overwrites the newer text the same way before and after, whether the click lands on the durable editor or on the draft.

Reachability: possible, but it needs a lost save at exactly the replay moment right after a successful create. That is rare in both trees.

Recommendation: this does not count against this change. It is a real pre-existing loss path, the same kind of gap as the declared open item 5 (a failure partway through the structure commit does not roll back). It is worth a tech-debt entry: the replay should compare against the block's last saved text, or the failure path should clear or finish the pending handoff. Files: post useDraftBlockController.ts:456-477 and :576, pre useDraftBlockController.ts:437-456 and :556.

## [leads-1] plausible | A replay save coming back wipes words typed in the block while it was out (new)
sev=major pre=no repro=True standing=1

**user_scenario**: Same start as above: a gap key's save fails. The person clicks away and back into the block, which starts a replay save with preserveDrafts. They type `K` before it returns.

**mechanism**: The new flushSync at useDraftBlockController.ts:620-626 publishes the save response's flow and text into the authority at the end of every run. It does not check replayingHandoffRef, which at :570 only stops the adapter's own publish. The block's newer text is overwritten with the replayed draft text. The pre tree publishes nothing at that point.

**repro**: Same controller-level harness. Steps: create, gap key `d`, its save fails, focus the block (replay save goes out with preserve=true), publish `abcdK` as the block's own edit, resolve the replay. Post: authority `abcd`. Pre: `abcdK`.

**user_impact**: Letters typed in the block during one save round trip vanish from the screen. The following save writes the shortened text. It needs a failed save first, so it is rare.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:620-626', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:570']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I could not refute it. The loss reproduces in the after tree and not in the before tree.

How I tested: a test that runs the real useDraftBlockController under real React scheduling. I used createRoot with no act(). I also made window.event read as undefined, because jsdom leaves a stale focusin there and that makes React treat async work as discrete input. Around the controller I used:
- a plain draft textarea whose onChange calls setDraftText and persistDraft, the same as handleDraftChange;
- a minimal block editor that takes focus in a layout effect, like BlockEditorLayer.tsx:397-422, and sends the focus receipt;
- a fake adapter. Its create publishes at default priority after the request, like useNoteCanvasDataAdapter.ts:1612-1617. Its save publishes unless preserveDrafts, like :2186.

The block's own typing goes straight into the authority with no save, which is how applyEdit behaves.

Results, after tree vs before tree:
1. The precondition holds in both trees. Type one key, then pause longer than the create round trip. The flushSync at useDraftBlockController.ts:620-627 renders without the new block, because the create's setBlocks is still at default priority. Focus stays in the draft, so the next key lands there (the "gap key").
2. Finder's scenario: the gap key's save fails, focus leaves the block and comes back (a replay save goes out with preserveDrafts=true), then K is typed before it returns. After tree: authority and DOM show "abcd", so K is gone. Before tree: "abcdK".
3. Same start with no failure: K is typed while the gap key's own save is out (preserveDrafts=false). K is lost in both trees, through the adapter publish at :2186. That path is pre-existing, so only the failed-save route is new.

Why it is new: the flushSync publish at :620-627 runs at the end of every run. It does not check replayingHandoffRef, which at :570 only stops the adapter's own publish. The before tree publishes nothing at that point.

Reachability (reasoned, not tested in a browser): every step can happen at human speed with a failing network.
- The gap key needs a key inside the few-millisecond handoff task, after a create during which no key was typed.
- That key's save must fail.
- The block must take focus again while it is still active, for example after switching windows or clicking outside the page and back. It stays on top at z-index 34 (markBlockFocused, then .blockActive). If the click lands on empty page and clears the selection, the transparent draft overlay is probably on top and catches the click instead, and nothing is lost.
- The next key must come within one save round trip.

This takes several rare conditions together, and only one round trip of letters is lost (they vanish from the screen). That is why I rate it minor rather than major.

My copy of the test is saved at <tester-scratch>/review-replay-overwrite/replayOverwrite.test.tsx. I deleted the review folder from the scratch tree.

**vote1** refuted=True repro=False reach=False nw=no sev=none
Refuted because no real path in the after tree reaches it. The finder read the mechanism correctly, and it is new code. It only matters if a "gap key" can exist, and the after tree closes that gap.

What is right: the flushSync at post useDraftBlockController.ts:620-626 republishes the save response's flow. It does not check replayingHandoffRef. The pre tree publishes nothing on a replay run, because the adapter skips its own publish when preserveDrafts is set (useNoteCanvasDataAdapter.ts:2186). If a replay were running and the person typed during it, post would overwrite the newer text and pre would not. I confirmed this with a forced gap: the authority ends as "abcd" instead of "abcdK".

Why it cannot be reached: a replay starts only when handleDurableFocusReceipt (:456-475) sees durableSavedRevision != draftRevision. That needs a key to land in the draft textarea after the save loop ends and before the durable editor's focus receipt arrives. In the after tree:
- After the loop there is only `await Promise.resolve()` (:584), then the flushSync. Inside it, setFocusBlockId mounts or updates the block.
- BlockEditorLayer's layout effect (BlockEditorLayer.tsx:397-422) calls textarea.focus(). Its onFocus goes synchronously through Paginated/TextBlockProjection onFocus, then handleWritingSurfaceFocusBlock, then handleDurableFocusReceipt. The revisions are equal at that point, so clearLocalDraft runs and the draft textarea unmounts.
- No key, which arrives as a macrotask, can land in between.

I tested this with a harness shaped like the real tree: a durable textarea focused from a layout effect, onFocus calling handleDurableFocusReceipt, and the durable block already rendered before the save resolves. Results:
- The receipt fires inside the persist run (runSettled=false, draftActive=true).
- After the run the draft textarea is gone and focus is in the durable block.
- No preserveDrafts save is ever issued.
- A following "K" stays.

The finder's controller-level harness gets its gap by calling handleDurableFocusReceipt by hand after editing the draft. The real tree does not produce that order.

I checked each early exit in the focus effect that could hold focus back:
- Words box focused (structureTypingHoldsFocus): keys go to the words box, not the draft.
- Receipt unit not rendered: useNotePageFlow computes the plan synchronously in a useMemo from the flow the flushSync just published, so the unit renders in the same pass.
- activeElement already inside the block: the draft layer renders above the block, so clicks land in the draft, and keys would go to the block anyway.
- Read-only: there is no typing.

IME commit on blur (the A-25 family) also does not create a gap key. The draft's onChange already stored the composition text, and setDraftText bumps the revision only when the value changes (:227).

The finder's chain also needs, on top of that missing gap, a failed replay save, a click away and back, and a key within one round trip. The tester's real-backend matrix after the change found no losses on human-speed continuous typing (K, L, D, R and G arms).

What I did not cover: an IME that commits a different string on blur than the composition it showed (for example, it commits the candidate) could bump the revision and start a replay. I did not test that. It belongs to A-25, where the handoff interrupts composition, and the queued A-25 fix (no handoff during composition) removes it.

Novelty: the code path is new, but no person can reach it, so nothing a person meets is new or worse.

I deleted the test folder src/__review__/verify-leads-1-reach/ after the run.

## [leads-2] confirmed | A key in the instant the first create returns still lands in the draft, and block typing during that key's save is wiped
sev=major pre=yes repro=True standing=2

**user_scenario**: New note. One input event reaches the draft (one letter, a paste, or an IME commit), then a pause until the block is created. The person resumes typing right as it arrives and keeps typing within one save round trip.

**mechanism**: createDraftBlock publishes the new block with a default-priority setBlocks (useNoteCanvasDataAdapter.ts:1614). The handoff's flushSync (useDraftBlockController.ts:620-630) commits the reconciliation and text drafts but not the block, so the durable editor mounts one scheduler task later. The comment at :618-619 says this window is closed. A key in that window goes to the draft and starts a save with preserveDrafts=false (:570). When that save returns, the adapter publishes (2186-2190) and the controller publishes again (:623-626). Both overwrite what was typed in the block meanwhile. The change set out to close this window, and it stays open on the create-only path.

**repro**: (a) Real useDraftBlockController under real React 18 (createRoot, no act, window.event undefined). The host's createBlock calls setBlocks like the adapter, and a stand-in block uses BlockEditorLayer's focus effect. When persistDraft resolves: reconciliation set, block not mounted, focus still in the draft, and a key then starts a save. One task later focus is in the block. Control: on the save-loop path, focus is in the block at once. (b) Controller harness L8: block typing `abcdYZ` during that save ends as `abcd` on both trees. The real BlockEditorLayer was not mounted for (a).

**user_impact**: The key itself can be misplaced. Letters typed in the block during the following round trip are lost. Rare: it needs a pause and then a resume that hits a few-ms window.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:582-584', 'client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:618-630', 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1614']

**vote0** refuted=False repro=True reach=True nw=no sev=minor
I reproduced it and could not refute it.

Harness: in my copy I ran the real useDraftBlockController from the after tree. I also ran the before tree's controller, copied in with only its import paths rewritten. Both ran under real React 18.3.1 (createRoot, no act, scheduler on setImmediate). A host component stood in for the adapter. Its createBlock awaits a gate, then calls setBlocks, setBlockTextDrafts and setBlockTextFlowDrafts at default priority, like useNoteCanvasDataAdapter.ts:1612-1618. Its saveBlock publishes drafts only when preserveDrafts is false, like :2185-2190. The draft onChange calls setDraftText and then persistDraft(value), like useRuntimeNaturalWritingController.ts:444-445. A stand-in block editor uses a useLayoutEffect focus on autoFocus, like BlockEditorLayer.tsx:397-422. Its onFocus calls handleDurableFocusReceipt.

One harness artifact had to be fixed. jsdom leaves window.event set to the last 'input' event. With that, React gives the create's continuation sync priority, and the block mounts at once on both trees, so the bug hides. In Chrome that continuation runs under the XHR 'loadend' event, or no event at all, so React gives it default priority. After window.event was forced to undefined, the results were:
- After tree, create-only path, right after persistDraft resolves: reconciliation set, block not mounted, focus still in the draft. One task later, focus is in the block.
- After tree, a key in that window lands in the draft and starts saveBlock('ab') with preserveDrafts=false (the flag read at useDraftBlockController.ts:570). Block typing continues to 'abYZ'. When that save returns, the block shows 'ab': both publishes (adapter :2186-2190 and controller flushSync :620-630) overwrite YZ. The before tree gives exactly the same result.
- Control, save-loop path: in the after tree, focus is in the block right after the handoff; in the before tree it was still in the draft. So the flushSync closes the window only when the create's setBlocks already committed during the save round trip. On the create-only path the block is not in `blocks` at flushSync time, and the comment at :582-584 and :618-619 does not hold. That makes this something the change set out to fix and did not.

In the real app the letters vanish from the screen at once. The block's pending typing session still holds after='abYZ'. If the person keeps typing, the next key builds on 'ab', and the later save leaves the server without YZ. If they stop and blur, the session seal may still save 'abYZ' while the screen shows 'ab'. That part is reasoned, not tested.

Pre-existing: same outcome on both trees. By reasoning, the window may even be a little wider in the after tree. Keys pressed during the new flushSync render inside the XHR task are dispatched before React's scheduler task, and they still go to the draft. I could not measure this in jsdom.

Reachable but rare: one input event, then a pause longer than the POST plus the placement PUT, then resuming within a window of a few milliseconds, then typing on within one save round trip. The loss is a few letters.

The real BlockEditorLayer and adapter were not mounted; I used stand-ins built to the cited lines. The test folder has been deleted.

**vote1** refuted=False repro=True reach=True nw=no sev=minor
The finder reads the mechanism correctly. The result is the same as before the change, so the finding only stands as "the change set out to fix this and did not".

What I checked:
- React is 18.3.1 (client/node_modules/react-dom). In getNextLanes, a SyncLane render does not pick up DefaultLane work, so flushSync cannot reach the default-priority setBlocks in adapter createBlock (useNoteCanvasDataAdapter.ts:1614).
- On the create-only path, the flushSync at useDraftBlockController.ts:620-630 commits the reconciliation, the text drafts and focusBlockId, but not the block itself.
- The draft textarea stays mounted and editable until clearLocalDraft (DraftWritingEntryLayer and DraftBlockEditorLayer do not depend on phase).
- A key in that window goes through handleDraftChange to persistDraft (useRuntimeNaturalWritingController.ts:445). That starts a save with preserveDrafts=false (:570), and the adapter's publish at :2186 overwrites the block's drafts when the save returns.

Reproduction: one vitest file, since deleted. It drove the real controller under createRoot with no act. The host's createBlock calls a default-lane setBlocks, and a stand-in block focuses itself in a layout effect.
- After tree, create-only path: when persistDraft resolves, the reconciliation is committed, the block is not mounted and focus is still in the draft. A key then issues saveBlock("ab", preserveDrafts:false). One task later the block mounts and takes focus.
- After tree, save-loop control: the block has focus as soon as persistDraft resolves. This is the part the change did fix.
- Before tree, same harness (pre controller copied in): the create-only path behaves the same (block not mounted, focus in draft, same preserveDrafts:false save, focus moves one task later). The only difference is that the reconciliation is not committed yet. The save-loop path also left focus out of the block, which is what the change fixed.
So the outcome on the create-only path is the same in both trees. The finder's L8 result (block typing wiped on both trees) agrees. I did not check the end-to-end server loss through the real block editor and history session myself.

Why it is not refuted: the change claims to close this window. The A-18 receipt names cause #2 ("交接不是原子的", the handoff is not atomic) and fix #2 ("同一个任务内…渲染并聚焦(flushSync),按键插不进去", render and focus in the same task so no key can get in). The comments at useDraftBlockController.ts:583 and :618-619 say the same. On the create-only path the durable editor is not rendered in that task. This is the same class as the builder's own cause #3 (a default-priority publish that flushSync cannot reach), here in createBlock's setBlocks.

Reachability: real but narrow. It needs one input event (a typed letter or a paste) and then nothing more until the create and placement requests return, about 2 round trips (roughly 250-400 ms at 110 ms). The next key must then land before React's next task mounts the block.

By reasoning only, not measured: the window may be somewhat wider after the change. That task now includes a full synchronous canvas render, and Chrome usually dispatches a queued key before React's posted scheduler task. Before the change, that task had no render.

What the person loses: the window key itself is kept (adopted by handleDurableFocusReceipt at :458-468). One or two letters typed in the block during the next save round trip are overwritten.

Severity minor: identical outcome, rare timing.

Side note, outside this finding: the new draft-heading effect (useSlashCommandController.ts:178-201) runs when the flushSync commit lands, before the block reaches host.blocks. On the create-only path it returns early and never retries, so a `# ` in a create-only draft is not converted. The before tree never converted it either.

## [leads-3] confirmed | Undoing a heading made from draft text puts the caret two characters short; the next letter lands mid-word and the line becomes a heading again
sev=minor pre=no repro=True standing=2

**user_scenario**: In a new note, type `Intro`, Enter, `# Title` before the first save returns. It becomes a heading at handoff. Press Ctrl+Z to keep it literal, then type `s`.

**mechanism**: headingRequestForDraftText (headingInputService.ts:73-74) sends a focus caret measured after the `# ` is stripped. onHeadingStructure (useHeadingStructureController.ts:397) takes min(previous unit length, focus caret) as the undo caret. The previous unit still holds `# Title`, so undo restores it with the caret at 5 instead of 7. The formula is old, but the draft-path request that triggers it is new. The durable path is off by one in the same way, which is pre-existing.

**repro**: Vitest with the existing renderStructure harness: real useHeadingStructureController, useTextFlowHistory and usePlacementHistory. Run the request from headingRequestForDraftText(['Intro','# Title'], caret t2@7), then undo. The restored editor holds `# Title` with the caret at 5. Typing `s` gives `# Titsle`, and applyHeadingInputAtLine turns it into heading `Titsle`.

**user_impact**: The next letters typed after Undo go into the middle of the title, and the line turns back into a heading the person had just undone.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts:397', 'client/src/pages/Notes/canvasEngine/headingInputService.ts:73-74']

**vote0** refuted=False repro=True reach=True nw=yes sev=minor
I reproduced this in a Vitest test that drives the real hooks. I copied the renderStructure harness from useHeadingStructureController.test.tsx, so useHeadingStructureController, useTextFlowHistory and usePlacementHistory are real and only persistence is faked. The request came from the real headingRequestForDraftText on flow [t1 'Intro', t2 '# Title'] with the caret at {t2, 7}. useDraftBlockController.ts:600-609 maps the draft caret into the unit through draftCaretInFlow, so 7 is what the app sends. A stand-in textarea (data-runtime-textflow-editor, data-block-id=source, data-text-unit-id=t2) stood in for the projection's unit editor.

Results:
- request.focus = {t2, 5}.
- run() gives [Intro] [heading_1 'Title'] [End].
- undo() gives [Intro, '# Title' paragraph], and the real selection-restore effect in useTextFlowHistory.ts:114-123 focuses the textarea with selectionStart = selectionEnd = 5, not 7.
- Typing 's' at that caret gives '# Titsle'. applyHeadingInputAtLine (the check TextBlockProjection.tsx:948 runs on every input) turns it into heading 'Titsle'.

Mechanism: headingInputService.ts:74 sends the caret after the '# ' is stripped (7 - 2 = 5). previousTextFlow still holds the 7-character literal. useHeadingStructureController.ts:397 takes beforeCaret = min(7, 5) = 5 and stores it as the undo selection.

The history's restore is authoritative in the real editor. PaginatedTextBlockProjection.tsx:216-218 says the history owner restores its caret after the child's layout effect, and the projection's unit textareas carry the attributes findUnitTextarea matches. Ctrl+Z goes to the note history (historyService.ts:62).

Why it is new: headingRequestForDraftText and the layout effect that calls it (useSlashCommandController.ts:178-201) are not in the before tree. Before, draft '# ' text was never converted at handoff, so there was no conversion to undo. The min() formula is old (pre useHeadingStructureController.ts:293). It gives an off-by-one caret in the old path where one more key is typed on a literal '# ' line. The new draft path is off by two and reachable from ordinary fast typing in a new note.

Caveat: re-converting into a heading on the next keystroke is pre-existing for any literal '# ' line (tester notes, literal-recover). Only the letter landing mid-word is new.

Impact: no words are lost. One letter typed after Undo goes two characters before the end of the title, and the caret is visible. Minor.

**vote1** refuted=False repro=True reach=True nw=yes sev=minor
Not refuted. The finder read the mechanism correctly and it reproduces, but most of the defect is old. The change adds one new way to reach it.

Reproduction: one vitest file in my scratch copy. It used the real useHeadingStructureController, useTextFlowHistory and usePlacementHistory through the existing renderStructure harness, and spied on setSelectionRange. I deleted the file afterwards.
- A, the new path: the request from headingRequestForDraftText(['Intro','# Title'], title@7) has focus caret 5. Undo restores 'Intro' and '# Title' in one block, and the only selection restore is (source, title, 5). The caret should be at 7. Typing 's' there gives '# Titsle', and applyHeadingInputAtLine turns that into heading 'Titsle'. Confirmed.
- B, durable path where typing on a literal '# ' line converts it (code identical in the before tree): type 's' at the end of literal '# Title'. The heading becomes 'Titles'. Undo restores '# Title' with the caret at 6 instead of 7. The next key gives heading 'Titlse'.
- C, durable path, the usual way to make a heading (also identical before): type '# ' after 'Intro'. Undo restores '#' with the caret at 0 instead of 1. The next letter lands before the '#'.

Novelty:
- The formula is identical in both trees: post useHeadingStructureController.ts:397, pre :293. It takes min(previous unit length, focus.caret), where focus.caret is measured after the marker is stripped and the previous unit still holds the marker. So the old code already put the caret one character short after every Undo of a typed '# ' heading.
- The old code already re-made the heading on the next key in that line. The tester's notes record this for the before tree.
- So the same visible result existed before: Undo, the next letter lands short, the line becomes a heading again. The finder concedes the durable path is pre-existing.
- What is new: headingRequestForDraftText (headingInputService.ts:67-78, called from useSlashCommandController.ts:179-201) does not exist in the before tree or anywhere in git history. Before, a '# ' typed in the draft stayed literal at handoff, so there was nothing to undo there. This new trigger is short by the marker length (2 for '# '), against 1 on the durable path.

Reachability: plausible but depends on timing. The draft keeps saving while its text changes (useDraftBlockController.ts:563-580) and hands off only after a save finishes with no new key. With about 110 ms round trips, someone typing steadily can get the whole 'Intro⏎# Title' into the draft. The builder's own test uses exactly this case (headingInputService.draftText.test.ts). A handoff partway through ('# Ti') still converts. The Undo caret is then short by 2 again ('# Ti' at 2, so the next key gives heading 'xTi'). It takes a second Ctrl+Z, because the rest of the title typed during the structure commit is a separate undo step.

Impact: no words lost. One letter typed after Undo lands two characters early, inside the word, and the line becomes a heading again. The person can see it on screen. I rate it minor because letters end up in the wrong order in the saved text. The new part is small; the old formula causes most of it.

Fix: correct the formula at useHeadingStructureController.ts:397 once, by carrying the caret position from before the conversion in the request instead of deriving it from focus.caret. That fixes the new draft path and the old durable cases (B, C) together. Fixing only headingRequestForDraftText leaves the durable cases as they are.

## [leads-4] plausible | Leaving a new note during its first create saves all its lines as one unit, and its `# ` line is not a heading
sev=minor pre=yes repro=True standing=1

**user_scenario**: New note: type `warmup`, Enter, `# abcd`, then leave the note before the block takes over (Back, a note link, a tab).

**mechanism**: resetDraft reads draftTextFlowRef (useDraftBlockController.ts:317), which is null on the typed path, so the recovery receipt has no contentJson (:339-341). The finalizer falls back to contentForTemplate (useNoteCanvasDataAdapter.ts:1675), which makes one unit holding a line break. draftFlowForText exists now but is not used here.

**repro**: Controller harness: rerender with another note while the create is out. The receipt's contentJson is undefined on both trees, and the finalizer content is one unit `warmup\n# abcd`; draftTextFlowFromText gives two. This matches the tester's real-browser bk2 back-1 row (one unit with a line break, `# ` not converted, before and after).

**user_impact**: The words are kept, but the paragraphs are merged into one unit and the heading is not made.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts:316-341', 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1674-1675']

**vote0** refuted=False repro=True reach=True nw=no sev=none
The mechanism is real, but this change did not cause it and did not try to fix it, so it does not count as a finding for this review.

Reproduction: I wrote a test in my copy (src/__review__/verify-leads-4-repro/, deleted afterwards). It ran the real useDraftBlockController from both trees in one file. The pre module was imported by path; both node_modules junctions point to the same D:\...\client\node_modules, so both trees used the same React.

Steps in the test:
- activateDraft, then setDraftText and persistDraft for each value: 'w', 'warmup', 'warmup\n', ... 'warmup\n# abcd'. This is what handleDraftChange does. The first call starts a deferred create.
- Rerender with another note while the create is still out. This is the in-app leave, which runs resetDraft.
- Resolve the create.

Results, identical on both trees:
- finalizeDraftBlock gets a receipt with contentJson undefined and text 'warmup\n# abcd'.
- contentForTemplate on that receipt gives a single paragraph unit holding 'warmup\n# abcd'.
- draftTextFlowFromText on the same text gives two units.

Why both trees agree:
- On the typed path, draftTextFlowRef is set only from options.textFlow (useDraftBlockController.ts:499), so it stays null.
- resetDraft (post :312-372) is byte-identical to pre :293-353, including the contentJson guard at post :339-341.
- useNoteCanvasDataAdapter.ts, where the finalizer falls back to contentForTemplate at :1675, is unchanged (diff -q reports it the same).
- The new draftFlowForText (:205) is only used in persistDraft and the handoff, not in resetDraft.

Scope check:
- The new layout effect in useSlashCommandController.ts:178-201 turns a draft-typed `# ` into a heading only after takeover (draftOwnerReconciliation). Leaving before takeover never reaches it.
- The receipt's scope is A-18 residual, A-21 and A-24. It makes no claim about the leave-mid-create path.

The tester's real-browser bk2 back-1 row shows the same shape before and after the change. No words are lost; the lines are merged into one unit and the heading is not made, as they were before the change.

**vote1** refuted=True repro=False reach=True nw=no sev=none
I refute this on novelty. The finding is reachable: the tester's real-browser bk2 back-1 row saves `warmup` and `# abcd` as one unit with a line break, and the `# ` line is not made a heading. But the change did not cause it or make it worse, and the change did not set out to fix it.

What I checked:
- `resetDraft` (`useDraftBlockController.ts:312-375` in the after tree) is byte-identical to the before tree. I ran a diff on the extracted function.
- In both trees, `draftTextFlowRef` is only set from `options.textFlow`, at after-tree line 499 (before-tree line 480). On the typed path the flow stays a local variable inside `run()`, so the ref is null in both trees. The receipt therefore has no `contentJson` in both trees.
- `useNoteCanvasDataAdapter.ts` is identical in both trees, including the `contentForTemplate` fallback at line 1675.
- `draftBlockPersistence.ts` is identical in both trees. Neither file is in the patch's 15 files.
- The change adds `draftFlowForText`, an `await Promise.resolve()` and a `flushSync` handoff. None of them reaches the leave path, and none of them makes the create window noticeably longer.
- Tester notes.md, third session: "bk2 back-1（修前修后都有）". The same one-unit, literal `# ` result appears before and after.
- Scope: the builder's receipt covers the A-18 residual (the `trimEnd` mismatch between text and flow at handoff), A-21 (waiting for a React commit) and A-24 (focus during the structure window). It claims nothing about finalizing a draft abandoned during its first create. The A-24 navigation hold applies only to the structure window.

I did not reproduce it myself. I relied on the code being identical and on the tester's before/after real-browser row. The finder's suggestion is still worth a separate pre-existing ticket: build the receipt's `contentJson` from `draftFlowForText(draftTextRef.current)` when the ref is null. That would split the units and allow the heading conversion. It is not a defect of this change.

## [leads-5] plausible | After pasting one paragraph longer than a page into a new note, the next key lands at the end of page one
sev=minor pre=yes repro=False standing=1

**user_scenario**: New A4 note: paste a single paragraph that spills onto page two, wait for the handoff, then type.

**mechanism**: The focus effect takes the first textarea of the receipt's unit (BlockEditorLayer.tsx:409-411), which is the page-one slice. It clamps the unit offset to that slice's length (:418-419) instead of picking the slice that holds the caret. This change touched these lines, but the selection logic is unchanged from pre.

**repro**: Reasoned only. The earlier review ran it with the line estimator and got X at offset 4959 of 8104.

**user_impact**: Words typed after the paste appear in the middle of the pasted paragraph.

**files_lines**: ['client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:409-420']

**vote0** refuted=False repro=True reach=True nw=no sev=none
The behaviour is real, but this change did not cause it and does not make it worse, so it does not count as a finding for this review.

How I tested it: I wrote a component test in the scratch copy (src/__review__/verify-leads-5-repro/, now deleted). It builds one paragraph of 4479 characters. It runs that paragraph through the real page-flow code (resolveDocumentPageFlowPlan and pageFlowFragmentProjections) on a 794x1123 A4 frame, which gives two pages split at 0-3658 and 3658-4479. Then it renders the real BlockEditorLayer, which uses the real PaginatedTextBlockProjection. The props match the handoff: autoFocus=true, a receipt for that one unit, autoFocusSelection {4479,4479}, and focus held by an outside textarea standing in for the draft.

What happened after the change: the focus went to the page-one textarea with the caret at 3658. A typed 'X' went through the real onChange path and onTextFlowChange put it at offset 3658 of 4480, not at 4479. The words land at the page break, in the middle of the pasted paragraph.

What happened before the change: I copied the before-tree BlockEditorLayer.tsx into the same folder, changed only its import paths, and ran the identical test. The result was the same: caret 3658, X at 3658 of 4480. The before and after code at BlockEditorLayer.tsx:406-420 picks the target the same way, the first textarea whose data-text-unit-id matches. It also clamps the same way, autoFocusSelection limited to that textarea's value.length. The diff only adds the "unit not rendered yet" early return (:414) and the structureTypingHoldsFocus() guard (:416). Neither applies in this scenario.

The change did not set out to fix this. The receipt covers A-18 residuals, A-21 and A-24. Among the Tester's leads it says it handled only the paginated tail-space handoff and the focus-steal items, not the choice of slice for a caret beyond page one.

Could a person hit this in the app? Yes, by reasoning; I did not run a browser. Pasting plain text into the draft has no special handler in DraftWritingEntryLayer.tsx:575. At the handoff, useDraftBlockController.ts:600-631 sets selectionStart to the full unit offset. With focus outside the block, BlockEditorLayer's effect is the one that places the caret. If the page layout changes after that, the projection's own re-focus at PaginatedTextBlockProjection.tsx:220 uses the offset it captured, so the caret stays at the page break. It ends up at the end of page one or the start of page two, still mid-paragraph.

The fix would be to pick the slice the way pageSliceForCaret does. That belongs in tech-debt. The defect itself is minor: the caret is visible where the words go and no words are lost. For this change, though, it is pre-existing and unchanged, so I rated it none.

**vote1** refuted=True repro=True reach=True nw=no sev=none
Refuted on novelty: the before tree behaves the same way. The mechanism is described correctly, and a person can reach it.

Mechanism, after tree. The BlockEditorLayer focus effect at post BlockEditorLayer.tsx:409-411 takes the first textarea whose data-text-unit-id matches the receipt. That is the page-one slice, because PaginatedTextBlockProjection renders one textarea per page slice, page one first. The effect then clamps autoFocusSelection to that slice's value length at :418-419. It never uses data-text-start or pageSliceForCaret.

Before tree, pre BlockEditorLayer.tsx:408-416. It uses the same `textareas.find(...)` and the same clamp. Its only fallback is `textareaRef.current`, and PaginatedTextBlockProjection assigns that ref to the slice at index 0 (PaginatedTextBlockProjection.tsx:513), which is also the page-one slice. So the before tree lands in the same place whether or not the receipt unit matches.

What the change actually alters:
- It adds an early return when the receipt unit has not rendered yet.
- It adds a structureTypingHoldsFocus() guard, which is false in this flow.
- It wraps the draft handoff in flushSync and publishes persistedFlow (useDraftBlockController). This changes when the durable editor renders. It does not change which slice gets focus or at what offset.
- Pagination is computed synchronously in both trees (useNotePageFlow useMemo), so the durable block is already paginated on its first render in both.

Reproduction: real component tests in the scratch copy, now deleted. Both render BlockEditorLayer with the after tree's real PaginatedTextBlockProjection: one 200-character unit split into two flow fragments (0-100 on page one, 100-200 on page two), autoFocus true, a receipt for that unit, and autoFocusSelection {200,200}.
- After tree BlockEditorLayer: focus goes to the slice with textStart 0, local offset 100, logical offset 100 of 200.
- Before tree BlockEditorLayer (copied with only its import paths rewritten): exactly the same, logical offset 100 of 200.

Not driven end to end through the draft paste and handoff; that part is reasoned from code.

Reachability: a person can paste one paragraph longer than an A4 page into a new note's draft and wait for the handoff, so the path is real. It exists before this change, though, and the change does not make it worse. As a pre-existing defect it would be minor: the next keys land at the page-one seam, in the middle of the pasted paragraph.

## [leads-6] plausible | Drafted `# ` lines still come out literal on some ordinary paths: a paste with no key after it, the first line, a hidden tab
sev=minor pre=yes repro=False standing=1

**user_scenario**: (a) Paste `abc` + newline + `# T` into an empty new note and wait. (b) Type `# Title` as the only line before the create returns. (c) Type `Intro`, Enter, `# Title` and switch browser tabs before the save returns, then close the tab.

**mechanism**: (a) The effect at useSlashCommandController.ts:183-188 looks the block up in `blocks`. On the create-only path the flushSync render does not have it yet (default-lane setBlocks, shown in the gap test). It returns, and with deps [draftOwnerReconciliation] (:201) it never runs again. (b) headingInputService.ts:70 refuses a single line (declared by the builder). (c) It uses a bare requestAnimationFrame (:189) without the timer fallback that afterFrame has (useHeadingStructureController.ts:37-42).

**repro**: (b) was confirmed with the pure function. (a) and (c) are reasoned from code plus the lane behaviour seen in the gap test.

**user_impact**: The same text gives a heading or a literal `# ` line depending on timing or how it was entered. No words are lost.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:183-201', 'client/src/pages/Notes/canvasEngine/headingInputService.ts:70']

**vote0** refuted=False repro=True reach=True nw=no sev=minor
Path (a) reproduces with the real hooks. Paths (b) and (c) are confirmed from the code. None of the three paths is worse than before the change.

Harness: src/__review__/verify-leads-6-repro/draftHeadingPaste.test.tsx in the scratch copy, deleted afterwards. It drives the real useRuntimeNaturalWritingController, which contains the real useDraftBlockController and useSlashCommandController, with the real useBlockDraftAuthority and React state for `blocks`. The createBlock mock copies createDraftBlock (useNoteCanvasDataAdapter.ts:1612-1618): it waits for a network delay, then calls setBlocks, setBlockTextDrafts and setBlockTextFlowDrafts from an async continuation, then resolves. The async part runs outside act, on React's real scheduler.

Results:
- Control: keys typed one at a time ("abc", Enter, "# T") while the create is out. The create is followed by a save, and onHeadingStructure is called once with [paragraph:abc, heading_1:T].
- (a): "abc\n# T" arrives in one input event, as a paste does, and nothing follows. The server keeps [paragraph:abc, paragraph:# T]. onHeadingStructure is called 0 times, even though `blocks` holds the block afterwards.
- Mechanism check: the same paste, but the create publishes `blocks` with flushSync before it resolves. onHeadingStructure is called once.

So the cause is the one the finder named. The create publishes `blocks` at default priority. Only microtasks run before the handoff's flushSync (useDraftBlockController.ts:620-630), so that render does not have the block yet. The effect at useSlashCommandController.ts:183-188 finds no block and returns. Its only dependency is [draftOwnerReconciliation] (:201), and that object stays the same until the next draft starts, so the effect never runs again.

(b): headingInputService.ts:70 returns null when there are fewer than 2 live units. The builder's receipt already declares this ("新笔记第一行 `# title` 仍是字面").

(c) is reasoned only. :189 uses a bare requestAnimationFrame, while afterFrame in useHeadingStructureController.ts:37-42 also has a 100 ms timer fallback. In a hidden tab the conversion waits until the tab is visible again. If the tab is closed first, the line is saved literal and the words are saved.

Before the change, the before tree had no conversion for drafted lines at all (headingRequestForDraftText is new), so all three paths gave a literal `# ` line before too. Nothing is lost, duplicated or reordered. The only cost is a literal paragraph `# T` instead of a heading, and typing one more key at the end of that line converts it. This counts only as part of the change's goal of converting drafted `# ` lines that it did not reach, through a real path: pasting multi-line markdown into an empty new note.

**vote1** refuted=True repro=True reach=True nw=no sev=nit
Refuted on novelty. The mechanism is read correctly, but the outcome on all three paths is the same as before the change: a literal `# ` line, with no words lost.

Before tree: there is no code that turns a drafted `# ` line into a heading. headingRequestForDraftText does not exist (pre headingInputService.ts ends at line 64). The useSlashCommandController layout effect at post :178-201 is new in the diff. In the pre tree only the durable editor's own input path converts headings (PaginatedTextBlockProjection.tsx:270, TextBlockProjection.tsx:947), and only when a key or paste lands in that editor. The A-18 "temporary literal" behaviour was this absence of code. So before the change, (a) a paste with no key after it, (b) a single `# Title` line, and (c) a hidden tab that is then closed all saved a literal `# ` line, exactly as the after tree does on those paths. The finder's own pre_existing=yes agrees.

Mechanism check for (a), reproduced with a hook-level test that drives the real useDraftBlockController and useSlashCommandController. It used real useState for blocks and drafts, and a createBlock that publishes setBlocks after an await, like createDraftBlock at useNoteCanvasDataAdapter.ts:1610-1617. On the create-only path (paste `abc\n# T`, no further key), the reconciliation reached tu-2 but onHeadingStructure was called 0 times. Cause: the flushSync at useDraftBlockController.ts:620-630 renders SyncLane only, so the default-lane setBlocks is not in `blocks`. read() at :183 finds no block and returns before the rAF, and deps [draftOwnerReconciliation] (:201) never re-run it. In the control, a key landed during the create so the save loop ran first, and the request fired once. Reachable: pasting into an empty new note and pausing about 0.25 s is ordinary.

(b) The builder declared it in the receipt ('新笔记第一行 `# title` 仍是字面', `live.length < 2`, headingInputService.ts:70), and it is identical before.

(c) Reasoned only, not tested. A bare rAF (:189) does not fire in a background tab. If the tab is closed, nothing converts, the same as before. If the person comes back, it converts then, which is better than before. The draft text is already saved before the handoff (the save loop finishes first), so no words are at risk.

What is left is a gap in a new convenience path (conversion only fires on the save-loop path). It is not a regression, not loss, and not a wrong structure beyond the literal text the person entered. Typing one key at the end of the line still converts it (tester's literal-recover). At most a nit for the builder's follow-up list: the effect could look the block up again when `blocks` changes, or use afterFrame's timer fallback.

My temporary test folder src/__review__/verify-leads-6-reach/ in the rv3 copy has been deleted.

## [leads-7] plausible | After undo then redo of a new paged block whose text ends in a space or blank line, the next key lands before that space
sev=nit pre=yes repro=False standing=1

**user_scenario**: New A4 note: type `hello ` so the space is in the first save, Ctrl+Z, Ctrl+Y, click to the end, type X.

**mechanism**: The handoff no longer trims (useDraftBlockController.ts:624). But restoreBlockById and restoreBlock still publish textFromContent().trimEnd() beside the untrimmed flow (useNoteCanvasDataAdapter.ts:2677, 2722). The paged plan then ends before the space, as lead 0 described.

**repro**: Read only. The earlier refutation ran this on the older snapshot and got `helloX `. The adapter is byte-identical pre to post.

**user_impact**: A space is moved to the end of the text.

**files_lines**: ['client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:2677', 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:2722']

**vote0** refuted=False repro=True reach=True nw=no sev=nit
I reproduced the mechanism with real hooks and components. The test ran in my copy at src/__review__/verify-leads-7-repro/ and I deleted the folder afterwards. It does not meet the new-or-worse bar.

Chain tested, after tree:
(1) The real useDraftBlockController. A human types "hello " while the first create is out. The save stores body "hello" and flow ["hello "]. The flow is untrimmed because of draftFlowForText(initialValue) at useDraftBlockController.ts:520 and draftFlowForText(draftTextRef.current) at :568.
(2) The real useNoteCanvasDataAdapter.restoreBlock, which is the redo of a createdBlock (historyService.ts:107). It sets the text draft to "hello" (trimEnd at useNoteCanvasDataAdapter.ts:2722; 2677 is the same) and deletes the flow draft, so the editor falls back to the stored flow "hello ".
(3) The real useNotePageFlow / noteBlocksToPageFlow. It realigns units to the trimmed text (notePageFlowService.ts:22-26), so the plan ends at offset 5.
(4) The real PaginatedTextBlockProjection. It shows "hello". A click at the end plus "X" gives ["helloX "] (replaceSliceText keeps the tail, paginationEditingService.ts:78).
Blank-line variant: "hello\n" saves flow ["hello",""]. After redo only "hello" is rendered, the empty line has no textarea, and X gives ["helloX",""].

Why this is not new or worse:
- The adapter, notePageFlowService, paginationEditingService, useNotePageFlow, historyService and usePlacementHistory are byte-identical before and after. The PaginatedTextBlockProjection and BlockEditorLayer diffs only touch focus.
- The same mismatch is reachable before the change through a durable block ending in a space that is deleted and then restored by undo. My test drove that route on the same code and also got ["helloX "].
- In the before tree, the draft save trims both halves (pre useDraftBlockController.ts:501 and :549 use draftTextFlowFromText of the trimmed text). So these exact user steps saved "hello" with no space or blank line at all. After undo, redo and X the result was "helloX", and my pre-shape control confirmed it.
- What the person sees is the same before and after: X right after "hello". After the change a trailing space, or an empty line, now sits after the X instead of being dropped. No word is lost, and nothing is reordered beyond a trailing space.
- The builder's stated fix covered the draft handoff, not the restore path. So this is not "set out to fix and did not".

Real but cosmetic, and pre-existing in effect. It is not a finding for this change.

**vote1** refuted=True repro=True reach=True nw=no sev=nit
The mechanism is real, but the same bug was already in the before tree, and the new-block case is not worse than before.

What I checked:

1. **The mechanism is read correctly.**
   - restoreBlockById and restoreBlock publish `textFromContent(restored).trimEnd()` and delete the flow draft (useNoteCanvasDataAdapter.ts:2675-2683 and 2720-2728). This file is identical before and after.
   - noteBlocksToPageFlow then sees text that differs from the flow and builds the measurement units from the trimmed text (notePageFlowService.ts:21-31, identical in both trees). So the plan's unit ends at 5 while the flow unit still holds "hello ".
   - PaginatedTextBlockProjection writes edits through `replaceSliceText`, which is `text.slice(0, start) + value + text.slice(displayEnd)` (paginationEditingService.ts:77-78). The result is "helloX ".

2. **Reproduced at service level only.** I ran a vitest in my scratch copy using the real functions: draftTextFlowFromText, textFromContent, noteBlocksToPageFlow, replaceSliceText and contentForEditedTextFlowBlock. The plan ended at offset 5 against a flow unit of "hello ", and the edit gave "helloX ". With a trailing blank line ("hello\n"), the restored plan has 1 unit against 2 in the flow, so the empty line is not shown. I did not drive the hooks end to end or use a browser. The test folder is deleted.

3. **Not new.** A stored flow with a trailing space or blank line was already reachable in the before tree.
   - Typing in an existing block saves the flow untrimmed: saveBlock (adapter around line 1959-1972) and contentForEditedTextFlowBlock (blockContentService.ts:236-250) store body "hello " unchanged. Both files are identical in both trees.
   - Trashing such a block and pressing Ctrl+Z goes through historyService, restoreBlockForHistory and restoreBlock, which is the same trimming restore. So on an A4 note, the next key lands before the space in the before tree as well.

4. **The new-block case is not worse.** In the before tree, draft create and the save loop built the flow from trimmed text (`draftTextFlowFromText(requestedText)` and `(latestText)`, pre useDraftBlockController.ts:501 and 549). A "hello " typed in the draft therefore lost its space at the handoff (the tester's R spaceThenType arm failed 8/8 before the change and 0/8 after). In the before tree, the user's steps end with "helloX" and the space is gone. In the after tree, the space survives the handoff (useDraftBlockController.ts:520, 568, 620-624). After undo and redo it is moved to the end ("helloX "). No letters are lost, duplicated or reordered, and the space is moved rather than lost.

5. **Not what the change set out to fix.** The builder's receipt fixes the trailing space at the draft handoff, and that fix holds. The trimming restore in the adapter is a separate, unchanged bug.

6. **Reachable** with plausible timing: the paged layout is the default for new notes, and at roughly 90 ms per key with a 110 ms round trip the save loop catches the trailing space. Trash then Ctrl+Z reaches the same bug in either tree.

At most this is a nit about pre-existing debt in restoreBlock and restoreBlockById: they publish trimmed text beside an untrimmed flow. It is not a finding against this change.

## [leads-8] plausible | An empty draft block cannot be discarded when an unrelated block has an annotation on unit tu-1 (server)
sev=nit pre=yes repro=False standing=1

**user_scenario**: With an annotation on any block's first paragraph, start a new block, type a letter, delete it, and click away.

**mechanism**: collectReferenceBlockers matches annotation ranges by user and text_unit_id only (server/src/services/noteBlockLifecycle.ts:706). The file is identical pre to post.

**repro**: Not run. The earlier review ran it on the server: 409 with blockers ['annotation'].

**user_impact**: An empty block stays in the note, with a cleanup toast.

**files_lines**: ['server/src/services/noteBlockLifecycle.ts:706']

**vote0** refuted=False repro=True reach=True nw=no sev=nit
The finding reproduces, but it comes from before this change and is not a finding against it.

How I tested it: I wrote a vitest file in my copy (src/__review__/verify-leads-8-repro/, deleted afterwards). It used the real after-tree server services (initDb(':memory:'), createClientNoteBlock, replaceNoteAnnotationTruths, discardClientNoteBlockCreate). It built the block content with the client's real draftTextFlowFromText, the same flow the draft controller sends on its first create (useDraftBlockController.ts:59, persistDraft create around :517-526). That function always names the first unit 'tu-1' (textFlowService.ts:118).

Results:
- Control, no annotation: the draft discards (discarded:true).
- Annotation on another block in the same note, unit tu-1: 409 'Client-created block has durable references', blockers ['annotation'], and the draft block stays.
- Annotation on a block in a different note, unit tu-1: the same 409. The mechanism is wider than the finding says, because the query at server/src/services/noteBlockLifecycle.ts:706-711 filters only by user_id and text_unit_id. Unit ids are local to each block, so this matches any of the user's annotations on any first paragraph in any note.
- Annotation on unit tu-2: the draft discards.

Reachable from the app: useDraftBlockController.ts:592 (a letter typed, then deleted before the save loop runs), :307 (discardDraft on click-away) and :356 (resetDraft) all call discardDraftBlock. On a 409, useNoteCanvasDataAdapter.ts:1774-1779 shows the toast 'Empty draft cleanup could not be confirmed' and keeps the block in the list.

From reading only: in the :592 race path the server block still holds the initial text (for example 'x'), because the save loop breaks on empty text. The deleted letter may therefore stay visible and stored, rather than an empty block. This is small either way.

Not new or worse:
- noteBlockLifecycle.ts is byte-identical between the before and after trees (cmp).
- draftTextFlowFromText, textFlowService.ts and useNoteCanvasDataAdapter.ts are unchanged.
- The patch's only edit on the discard path is an `await Promise.resolve()` before the emptiness check. It does not change reachability or the result.
- The builder's receipt claims nothing about discard or annotations.
- Existing server tests (v2NoteBlockLifecycle.test.ts:529, :814) use unique unit ids such as 'tu-receipt', so they never exercise the shared 'tu-1' collision.

So refuted=false as a factual claim, but it does not qualify against this change. It belongs in tech-debt (scope the unit or flow match to block_id = ? OR block_id IS NULL).

**vote1** refuted=True repro=False reach=True nw=no sev=none
The mechanism is read correctly, but it was there before this change, so it does not count against it. I only reasoned from the code and ran no test.

How it works: textAddressIds (post server/src/services/noteBlockLifecycle.ts:629-658) collects the unit ids of the draft block. collectReferenceBlockers then checks annotation_ranges using only user_id and text_unit_id (lines 704-709). Every new block's first unit is minted as 'tu-1' (post client/src/pages/Notes/canvasEngine/textFlowService.ts:119). So any annotation the user has on any block's first unit matches, even one in another note, and the discard is refused with 'annotation'. A person can reach this with an ordinary annotation and an emptied draft, so reachable=true.

Why it is not new:
- diff -rq of pre/server/src against post/server/src shows no difference, and noteBlockLifecycle.ts is byte-identical.
- textFlowService.ts is identical before and after, so 'tu-1' was minted the same way before.
- The patch touches only client/src/pages/Notes/canvasEngine and never changes textFlowService or the server.
- In useDraftBlockController.ts the discard call sites are unchanged: post 298/307/356/586-592 match pre 279/288/337/564-570.
- The change adds draftFlowForText, which caches one flow per text. It still starts from draftTextFlowFromText, so the first unit is still 'tu-1'. The added `await Promise.resolve()` before the meaningful-content check does not change whether the discard request is sent or what it carries.

No words are lost. The worst outcome is an empty block left in the note with a cleanup toast, the same as before. It is worth a separate server ticket (scope the text_unit_id match by block_id), but it is not a regression or an open item of this change. I added no test files, and src/__review__ in the scratch copy is empty.

## leads
[
 {
  "index": 0,
  "status": "fixed",
  "evidence": "The handoff publishes untrimmed text from the same flow: useDraftBlockController.ts:464-466 (replay) and :623-625 (flushSync). The create and loop use draftFlowForText(untrimmed) (:520, :568). In the harness, post shows `hello ` in both halves at handoff; pre shows `hello`. The restore paths still trim (useNoteCanvasDataAdapter.ts:2677, 2722; pre-existing; separate nit finding)."
 },
 {
  "index": 1,
  "status": "fixed",
  "evidence": "The text half now equals the flow (`First\\n`, units ['First','']) and is published in the same flushSync as the reconciliation (useDraftBlockController.ts:620-630), so tu-2 exists when BlockEditorLayer.tsx:414 looks for it. The builder's draftFastEnter test covers it; tester R trailingEnter 0/8 and V 0/3 after the change."
 },
 {
  "index": 2,
  "status": "fixed",
  "evidence": "Escape's rollback rejected the slash because text and flow disagreed after the trim. The published text is now plainTextOfFlow(flow) (useDraftBlockController.ts:624), so the join check at slashCommandReducer.ts:262 compares equal strings. Read only."
 },
 {
  "index": 3,
  "status": "live",
  "evidence": "server/src/services/noteBlockLifecycle.ts is identical pre and post; the :706 query is unchanged. Pre-existing, outside this change. Emitted as a nit."
 },
 {
  "index": 4,
  "status": "fixed",
  "evidence": "Same cause as lead 0 (trim at the old :619/:460), now removed (:464-466, :623-625). Remaining side path: undo/redo restore still trims (adapter 2677/2722, pre-existing), emitted as a nit."
 },
 {
  "index": 5,
  "status": "fixed",
  "evidence": "Same as lead 1. The empty unit is in the flushSync publish, so the receipt's textarea renders and the early return at BlockEditorLayer.tsx:414 does not trigger. Tester real-browser trailingEnter 0/8."
 },
 {
  "index": 6,
  "status": "live",
  "evidence": "setBlocks for the created block is still default lane (useNoteCanvasDataAdapter.ts:1614), and the flushSync at useDraftBlockController.ts:620-630 does not include it. My real-React test: at handoff the reconciliation is set, the block is not mounted, focus is in the draft, and a key there starts a save. Pre has the same gap. Emitted (combined with 8)."
 },
 {
  "index": 7,
  "status": "live",
  "evidence": "The unconditional publish at useDraftBlockController.ts:620-626 ignores replayingHandoffRef. Harness: post wipes `K` (`abcd`), pre keeps `abcdK`. Regression, emitted."
 },
 {
  "index": 8,
  "status": "live",
  "evidence": "preserveDrafts is read at :570 before the durable focus, so the adapter publish (2186-2190) and then :623-626 overwrite block typing. Harness: `abcdYZ` becomes `abcd` on post and pre. Pre-existing; the second overwrite is new but the outcome is the same. Emitted with 6."
 },
 {
  "index": 9,
  "status": "live",
  "evidence": "useDraftBlockController.ts:456-468 still adopts the stale draftTextRef whenever pendingReconciliationRef survives a failed run (:576). Harness: server ends `abcd` after `Yabcd` was saved, on both trees. Emitted."
 },
 {
  "index": 10,
  "status": "live",
  "evidence": "BlockEditorLayer.tsx:409-411 still picks the first textarea of the receipt unit, and :418-419 clamps to that slice. Same selection logic as pre. Reasoned only; emitted."
 },
 {
  "index": 11,
  "status": "live",
  "evidence": "Still no composition check before the handoff moves focus (useDraftBlockController.ts:620-630). Already ruled as A-25; not re-reported."
 },
 {
  "index": 12,
  "status": "fixed",
  "evidence": "headingRequestForDraftText keeps the request focus on the caret's unit when it is not the heading line (headingInputService.ts:73-76). The frame reads the live caret (useSlashCommandController.ts:193-197). The buffer opens over that unit (useHeadingStructureController.ts:150-151). Test: `Intro`|`# Title` with the caret on line 1, typing ` more` in the window gives source `Intro more` and heading `Title`."
 },
 {
  "index": 13,
  "status": "live",
  "evidence": "The early return at BlockEditorLayer.tsx:414 persists while draftOwnerReconciliation names a unit that is gone (kept by clearLocalDraft preserveReconciliation, useDraftBlockController.ts:476). I found no realistic path to lost keys: markBlockFocused clears focusBlockId, the slash menu keeps editor focus (SlashMenuLayer.tsx:45-47 preventDefault), and structure placement focuses directly. No finding."
 },
 {
  "index": 14,
  "status": "fixed",
  "evidence": "The double record needed the stuck draft from lead 5, which forced a second run. With the handoff completing in one run, onDraftPersisted fires once (useDraftBlockController.ts:631-634). In a gap-key second run the flag is already true. Read only."
 },
 {
  "index": 15,
  "status": "live",
  "evidence": "useSlashCommandController.ts:183-188 looks the block up in `blocks`. On the create-only flush it is absent (default-lane setBlocks, shown in the gap test), and with deps [draftOwnerReconciliation] (:201) it never re-runs, so a pasted `# ` last line stays literal. Folded into the literal-lines finding."
 },
 {
  "index": 16,
  "status": "live",
  "evidence": "headingInputService.ts:70 `live.length < 2` still refuses a first-line `# Title` drafted during the create, so the result depends on timing. Declared by the builder; pre never converted. Folded into the literal-lines finding."
 },
 {
  "index": 17,
  "status": "live",
  "evidence": "resetDraft still reads the null draftTextFlowRef (useDraftBlockController.ts:317, 339-341), and the finalizer falls back to one unit (adapter :1675). Harness on both trees gives units ['warmup\\n# abcd']; matches tester bk2 back-1. Emitted."
 },
 {
  "index": 18,
  "status": "changed",
  "evidence": "The main claim (caret thrown to the end of the heading, keys for line 1 landing in the heading) is fixed: headingInputService.ts:75-76 plus the buffer over the caret unit; my test gives `Intro more`. The C5 variant likely remains by reading: the frame passes only selectionStart (useSlashCommandController.ts:196), and the buffer opens with a collapsed caret (structureTypingBuffer.ts:112-113), so a selection across the handoff is not replaced. Narrow; not emitted."
 },
 {
  "index": 19,
  "status": "fixed",
  "evidence": "captureTypingDuringStructure is replaced by a focused buffer textarea that holds keys until a writable editor exists (structureTypingBuffer.ts:77-126; useHeadingStructureController.ts:150-151, 276-372). Tester real-browser N 0/18 and A-24 arms 0 after the change."
 },
 {
  "index": 20,
  "status": "changed",
  "evidence": "Focus pull from another field is fixed: finish() keeps it when activeElement moved away (useHeadingStructureController.ts:315-320; builder test 'does not pull focus back'). A click into another block still types into the heading, because keepFocus pulls note editors back (structureTypingBuffer.ts:117). Ruled TD-47; not re-reported."
 },
 {
  "index": 21,
  "status": "live",
  "evidence": "useHeadingStructureController.ts:397 together with the draft request's stripped caret (headingInputService.ts:73-74). Reproduced: caret 5 after undo, `s` gives `# Titsle`, which re-converts to heading `Titsle`. Emitted."
 },
 {
  "index": 22,
  "status": "live",
  "evidence": "headingInputService.ts:70 unchanged; the pure call returns null for a single `# Title` line. Declared by the builder, pre-existing. Folded into the literal-lines finding."
 },
 {
  "index": 23,
  "status": "fixed",
  "evidence": "headingRequestForDraftText now finds the first prefixed unit anywhere (headingInputService.ts:71). ['Intro','# Title',''] gives a request (heading `Title`, caret kept on the empty line)."
 },
 {
  "index": 24,
  "status": "live",
  "evidence": "Same pre-check as lead 15 (useSlashCommandController.ts:183-188, deps :201). A paste with no key during the create stays literal; typed text converts. Folded into the literal-lines finding."
 },
 {
  "index": 25,
  "status": "changed",
  "evidence": "The literal-after-body rule is withdrawn (headingInputService.ts:71 converts any drafted `# ` line), and the two-transfer exposure (A-21) is closed by waiting for a real commit per step (useHeadingStructureController.ts:156-161). A literal line now remains only for a second `# ` in the window, which is ruled."
 },
 {
  "index": 26,
  "status": "live",
  "evidence": "The frame is still a bare requestAnimationFrame (useSlashCommandController.ts:189) with no timer fallback, unlike afterFrame (useHeadingStructureController.ts:37-42). The structure only differs if the tab is closed while hidden. Folded into the literal-lines finding."
 },
 {
  "index": 27,
  "status": "unclear",
  "evidence": "Still no composition guard in the frame (useSlashCommandController.ts:189-198). The commit now opens the buffer and moves focus (useHeadingStructureController.ts:150-151), so the old outcome (toast, literal) probably becomes the A-25 shape (composition cut by focus loss). One-frame window; not run."
 }
]

# CRITIC
{
 "scenarios": [
  {
   "steps": "Open question. Run post and pre builds side by side on A4 notes with the real backend. Copy the in-app enterHash arm of arrive_body.mjs. From the '#' key on, pause every non-GET /api request at the Request stage and continue each after 700 ms. Keep the original timing: DOM read at +2.5 s, click (1380,300), wait 2.4 s, server read. Arm U: start the next sample at once (newNote, then Page.navigate to the floor note), as the Z harness does. Arm W: wait until no textarea[data-structure-typing-buffer] remains (at most 30 s), then navigate. Run 6 samples per arm per build. Read each note again 15 s after navigation and list the coincides:unplaced-words:* keys in the profile.",
   "expected": "Arm U, both builds: 'head' is missing. The note is either [warmup][empty heading] or [warmup + heading][empty block], depending on which request was in flight at unload. No stored key. Arm W, both builds: [warmup][heading 'head']. If arm W on post ever loses 'head', the unload explanation is wrong, and commit 1(b) or commit 2 becomes the lead.",
   "settles": "The 1-of-28 loss: ruled item (2), a page unload inside a slow window caused by the Z harness, versus a new mechanism. Also shows the harness gap: the Z arm navigates before slow windows end."
  },
  {
   "steps": "Post vs pre, direct arrival: 'warmup', Enter, wait 2.5 s. (a) Type '# head' with every non-GET delayed 300 ms. Run 10 samples. Count the PUT text-save requests between the '#' key and POST /notes/:id/blocks, and time how long after '# ' tu-2's editor shows 'head'. (b) Type '# ' with nothing after it. Hold every non-GET request for 12 s so the watchdog fires first, then release. Wait 5 s, read the screen and the server, then reload.",
   "expected": "(a) Post sends 3 text-saves before the create; pre sends 2. The z2-post and z2-pre network logs already show this. The post window is about one round trip longer. (b) Per the finding, post shows a literal '#' on screen, while the server, and the page after reload, have an empty heading in the same block as warmup, which was never on screen. Pre stays literal '#' everywhere.",
   "settles": "Commit finding 3: the editor's blur saves the unsplit heading outside the structure's ordering. Also measures how much longer the window gets, which matters for the loss in scenario 1."
  },
  {
   "steps": "(a) Direct note: 'warmup', Enter, wait 2.5 s, '# head'. From the '#' key on, delay every non-GET request by 1.6, 2.0 or 2.4 s (5 samples each), so the 10 s watchdog lands at different steps. A MutationObserver counts inserted textarea[data-structure-typing-buffer] elements and logs every [role=alert] text and [data-structure-typing-notice]. Keep the page open 40 s, then read the server and localStorage. (b) Existing paragraph 'Intro': click at its start and type '# Big ', so 'Big ' lands in the box. Hold all non-GET requests for 12 s, release, and read.",
   "expected": "(a) If any run shows 2 boxes, 2 'Heading changes could not be completed' toasts, no notice, no stored key, the server at [warmup + empty heading] in one block, and no 'head', commit 1(b) happens in the real app. Otherwise the words land in the heading, or are kept with a notice. (b) Post saves '#IntroBig ' (buffer finding 5); pre saves 'Big #Intro'.",
   "settles": "Whether the commit 1(b) watchdog race is reachable in the real app, and buffer finding 5 (words moved to the end of the line after a stalled heading) in a real browser."
  },
  {
   "steps": "Direct note with one paragraph. Pause the first unit-transfer at the Response stage for 1.5 s. Type '# Title', Enter, 'Body' at 60 ms per key, so Enter and 'Body' land in the box. 100 ms after the last key, leave: click another note in the in-app navigation, or a tab, or close the board modal. Release the transfer. After 10 s, come back to the note, read the server and check for an unplaced-words key. Run the same on pre.",
   "expected": "Per the finding, the leave goes ahead after the first structure finishes. The server has heading 'Title' but no 'Body', with no notice and no stored key. Pre keeps 'Body'.",
   "settles": "Buffer finding 1 (major) in the real app, including whether the route guard waits for the second structure."
  },
  {
   "steps": "Direct note. Type '# Sec', then keep typing 'Two', Enter, 'Body words' at 80 ms per key while the first unit-transfer is paused for 800 ms. Once the first structure's reorder response has arrived, pause every later non-GET request for 12 s. The second structure, which moves 'Body words', then stalls before its first edit until its own watchdog fires. Release, then record toasts, notice, localStorage, and the server 5 s later.",
   "expected": "Per the findings: one failure toast, and 'Two' and 'Body words' are gone from the screen, the server and localStorage. Pre keeps them in the note.",
   "settles": "Commit finding 1(a) and buffer finding 2 (major): a second structure that stops before its first edit loses the words."
  },
  {
   "steps": "One block with units 'one', 'two', 'three', 'four'. Click at the start of 'two' and type '# '. This extracts 'two' and then 'three', and 'four' has to move after 'three'. Pause the first unit-transfer response at the Response stage. Continue it and, in the same CDP batch, dispatch mousePressed and mouseReleased on empty canvas at (1380,300), at offsets of 0, 4, 8 and 16 ms. Run 5 samples per offset. Read block order and the server 10 s later.",
   "expected": "If the finding holds, some samples show a unit duplicated in the source block or blocks out of order, with a failure toast. If every sample is clean, the finding is theoretical at human speed.",
   "settles": "Commit finding 2: a sync-lane commit from a discrete event releases the commit waiter early, bringing back the A-21 write-back."
  },
  {
   "steps": "Note with P1 = 'Intro', Enter, 'More' (units tu-1, tu-2) and P2 = 'Alpha', 'Beta', 'Gamma', 'Delta' (also tu-1..tu-4). Click at the start of 'Beta', type '# ' then 'kept'. Let the first two unit-transfers through and answer the third (the move of 'Delta') with 500, so the words are held with the notice. Record the bounding rects of the box and the notice next to those of P2's 'Beta' editor and P1's 'More' editor. Arm a: click the end of P1's 'Intro', type '# x', then check whether the kept box disappears and whether the localStorage key is gone once that window ends. Arm b: reload instead, and read where 'kept' ended up.",
   "expected": "Per the findings: the box and notice sit over P1's 'More' (buffer 6). In arm a the kept box is removed and the stored key deleted, so 'kept' is lost (buffer 4). In arm b, 'kept' is appended to P1's 'More' and the heading stays 'Beta' (buffer 3).",
   "settles": "Buffer findings 3, 4 and 6 in a real browser."
  },
  {
   "steps": "New note, direct. Pause the draft's POST /notes/:id/blocks at the Request stage and type 'abc' at 60 ms. Continue the create and, in the same CDP batch, press 'd' 0, 8, 16 or 32 ms after the response event, then type 'XYZ' at 60 ms straight away. Run 5 samples per offset. Arm b: same steps, but answer the first PUT text-save after the create with 500. Then type 'Y' in the block, click outside, click back into the block, and type 'K' within 200 ms. Read the DOM and the server 5 s later.",
   "expected": "Per the leads findings: arm a sometimes loses part of 'XYZ' when the echo of the save for 'd' is published (gap-key finding). Arm b ends with 'abcd' written over the newer 'Y...' text (stale-draft finding), or with 'K' wiped by the replay echo (replay-wipe finding). Clean results at every offset would downgrade these findings.",
   "settles": "The three draft-handoff majors: the gap key (confirmed only in vitest), the stale draft overwrite after a failed save, and the replay save wiping new typing."
  }
 ],
 "open_question": "Best explanation, ranked by likelihood.\n\n1. Most likely: no new mechanism. This is ruled item (2), a page unload inside the window, set off by the harness while the heading commit was running unusually slowly.\n   - When the harness navigates away: in arrive_body.mjs, the next sample starts right after the +4.9 s server read (lines 21-22). It calls newNote and then open(floor) (line 13), which does a full Page.navigate (arrive_probe.mjs:60). So the tab left the note about 5.3–5.8 s after the last key.\n   - The run was still going at that point:\n     - At +2.5 s the tu-2 editor still read '#'. The STATE reader does not trim, and after the role edit the editor shows '' (z2 direct-2 shows 'warmup||head' 1 s after typing).\n     - The +4.9 s read in runs/z-post/rows.jsonl line 21 was still a single block, [[\"warmup\",\"[heading_1]\"]].\n   - Slow samples like this occur on the island: z2 direct-2 kept its box at least 3.6 s after the last key, with requests 0.4–0.85 s apart; z2 inapp-8 took 2–4 s per request.\n   - The later split [warmup][empty heading] read by find_note.mjs fits a unit-transfer that was sent before the unload and completed on the server.\n   - Why 'head' vanished without a trace: it lived only in the box. It is written only by placeTyped after the run ends (useHeadingStructureController.ts:250, :336-371). beforeunload only starts an async flush (useNoteRouteSaveBoundary.tsx:119-128). rememberUnplacedWords (structureTypingBuffer.ts:60) is reached only from retainWords (useHeadingStructureController.ts:93-99). So there was no notice and no stored copy.\n   - Why it did not reproduce: z2 keeps the page about 15 s after the last key (its trace waits plus the 'later' read), and the hold probes wait for release, so slow windows finished before any navigation. The click and the in-app arrival are incidental.\n   - What this change makes worse: every window now starts with an extra text-save. When the box takes focus, the editor's blur saves the unsplit heading (PaginatedTextBlockProjection.tsx:523-527 to useTextFlowHistory.ts:885). Post z2 logs show 3 PUT text-save before POST blocks, pre shows 2. That is one more round trip ahead of every structure (pre-phase at useHeadingStructureController.ts:182 plus runStructureBatch's flush), so a leave or reload inside the window is somewhat more likely than before.\n   - Gap: nothing stores the box's words synchronously on pagehide or beforeunload.\n\n2. Unlikely for this sample: commit finding 1(b), the watchdog race at useHeadingStructureController.ts:169-176, :353-357 and :148-151, with the refusal at useTextFlowHistory.ts:585 via :946. It needs at least 10 s after '# ', but the page was gone at about 6 s. It would also leave one block, not two.\n\n3. Unlikely: commit finding 2, where the click's sync commit releases a commit waiter early (useHeadingStructureController.ts:128, :156-161). It needs millisecond alignment with a response, and explanation 1 accounts for everything without it.\n\nScenario 1 settles 1 against 2 and 3."
}
