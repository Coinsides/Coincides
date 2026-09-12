> **Status**: active (B1a builder implementation evidence)
> **Date**: 2026-09-11
> **Authority**: no; the B1a order and supplement govern implementation.

# B1a paper color census

The default preset preserves incumbent per-face values. Quiet ink, warm paper and workbench use the exact specified nine colors. Typography, fonts and geometry remain separate. The only non-color adjustment is the existing Info popup's nested input/button frames, removed after the required E1 audit caught them.

## Incumbent inventory

| Face | Existing source/value | Skin role |
|---|---|---|
| Desk | global bg-primary #0f0f10, transparent reading surface | desk |
| Paper/header band | template default #101114, screen template #111722 | paper; default keeps each template's stored fill |
| Body/title | text-primary #f5f5f5 | ink |
| Description/secondary labels | text-secondary #b7b8bd | ink-muted |
| Muted labels/page numbers/handles | #777a82; rail #7f8c9a/#536170 | fixed ink-muted derivations |
| Active/selected/link/ink selection | #2563eb, hover #3b82f6 | accent |
| Default yellow annotation | #facc15, highlight rgba(250,204,21,.22) | annotation; named skins use 20% highlight |
| Hairlines | #2c2d31, subtle #232427, paper outline #2a2f38 | hairline with fixed incumbent aliases |
| Delete/error | #ef4444; rail #fb7185 | danger |
| Hover wall | color-mix(#777a82 44%, transparent), active #2563eb | wall; default preserves exact 44%, not rounded 8-bit alpha |
| Floating chrome/recovery/toolbars | #0f0f10/#1d1d1f/#252528, warning #f59e0b | paper/ink/annotation/hairline/danger |
| Groups/Item rail | #090d12/#0d1319/#111820/#070b10/#080c11, text #edf7ff | paper/ink/ink-muted/accent |
| Overview shell | undefined bg-secondary, rendered transparent | desk/paper/ink/hairline |
| Print | formerly forced white sheet/dark text/code background | resolved paper/ink, as expressly required |

PAPER_DERIVED_COLORS in paperSkinStyles.ts records the fixed per-face baselines and their driving role. paperSkinDefaults.css centralizes incumbent fallbacks for shared consumers outside a paper runtime. These are private implementation aliases, not additional configurable/persisted tokens, and do not override app or board theme variables.

buildPaperSkinStyles is scoped to paper runtime, floating portal and print roots. Nine --sk-* variables drive the existing --text-*/--bg-*/--border-* chains and private color aliases. A changed token updates its corresponding faces; untouched roles retain the exact baseline. Hover is 6% ink; overlay is a fixed 96/4 paper/ink blend; themed recovery/template notices use an opaque 12% annotation-on-paper background so ink remains readable on the external desk; shadow geometry is unchanged while opacity follows desk luminance. Workbench uses the specified 24px #1B2028 grid and #2A313C paper outline, then derives colors after relevant token overrides.

Legacy --bg-secondary/--bg-tertiary/--border-color/--border-muted are undefined at default. They remain undefined to avoid turning transparent declarations into solid surfaces. The pageFrameTemplateToCssVars contract and stored template payloads remain untouched: paint consumers prioritize skin aliases only when the corresponding token differs from default.

## Consumer coverage

| Consumer | Coverage |
|---|---|
| NoteDetail.module.css | All 72 incumbent raw hex/rgb occurrences moved to fixed aliases; header band/paper/blocks/handles/recovery/toolbars/menus/annotation stamps/rail/code/table chrome; desk painting added |
| NotePaperHeader.module.css | Existing primary/secondary/focus variables resolve from ink/ink-muted/accent; no font edits |
| NoteCoverMetadata.module.css | Tags and native popover inherit paper variables; input/button resting border/radius/background removed, section hairlines retained |
| PageFrameWallLayer.module.css | Hover wall consumes wall, active wall consumes accent |
| BlockEditRecoveryQueue.module.css | Existing warning/paper/ink/accent consumers inherit scoped aliases |
| ViewOptionsMenu.module.css | Existing shell/text/hover variables inherit scoped aliases |
| ItemRefBlockProjection.module.css | Existing text/hairline variables inherit scoped aliases |
| TextFlowSelectionLayer.module.css | File unchanged; existing accent consumer inherits paper scope, TextFlow mechanics untouched |
| annotationColorService.ts | Default yellow consumes annotation aliases; other five user-selected color tokens retain authored semantic colors; variable fallbacks preserve ReferenceTag consumers before paper CSS is loaded |
| contentGroupRailShellModel.ts | Automatic topic colors use fixed aliases; default preserves all original colors, named skins use semantic roles |
| PaperInkLayer/PaperInkSvg/freehandService.ts | Ink prioritizes --sk-ink, retaining old board-ink/text-primary fallback outside paper; selection already consumes accent; geometry unchanged |
| NoteOverviewLayer.css | Shell consumes desk; preview prioritizes paper alias; existing read-only content projection reused |
| NotePrintLayer.css/NoteReadOnlyPageContent.tsx | Forced white/dark and code white backgrounds removed; print follows resolved paper/ink with exact print-color-adjust |

All 10 incumbent paper CSS consumer files now contain zero raw hex/rgb expressions; the added private default table is the sole stylesheet color inventory. App sidebar/home, Boards, TextFlow implementation, fonts, .git and permission files were not edited.

## Portal and SVG audit

- The only active paper React portals are FloatingOverlayLayer and NotePrintLayer; root builder wires the same PaperSkinContext styles to both.
- NoteCoverMetadata and ReferenceTag use native popovers: moving to the top layer does not sever DOM CSS inheritance.
- TextBlockProjection/overlayService/textareaNavigation body-appended mirrors are hidden measurement nodes, not visible surfaces; untouched.
- Visible paper SVG ink/selection consume ink/accent. none/transparent preserve geometry and hit testing.
- VisualConnectorLayer mounts only for surfaceMode=canvas. Existing connector stored strokes and creation defaults remain model data outside paper scope. Existing sticky fill/stroke variables receive annotation derivations when consumed inside a paper root.

## Evidence and verification

Pre-edit source snapshots live at baseline/<repo-relative-path>; SHA-256 and byte counts are in baseline/paper-files.json. Root captured baseline-paper.* and baseline-e1/ before release to edit.

- paperSkinStyles.test.ts: 4/4 (incumbent shades, missing transparent aliases, themed faces, single token override/clear, specified workbench colors and subsequent derivation).
- freehandService.test.tsx: 3/3; PaperInkLayer.test.tsx: 12/12; PaperInkProjection.test.tsx: 4/4. Together with the above: 23/23.
- PostCSS successfully parses the migrated main CSS, private defaults and print sheet.
- Required E1 audit reproduced old Info nested frames in e1-recheck/pre-fix-report.json, then independent rerun after repair reported 55/55, zero nested borders and zero runtime/console errors. Final four-skin rerun and pixel comparison are recorded separately by the root builder.

Independent final default regression (default-regression.mjs/html/entry) uses the original D2 fixture, current production runtime, isolated Chrome port 9343, disabled network cache, and explicit assertions that data-note-skin-preset=default and inline/computed --sk-paper=#101114. Against original baseline-paper.png: 1,584,000 pixels compared, 0 changed, max channel delta 0, identical SHA-256 50c64c0298dac821ac3335747191134cc9f0df5a22ae65064b2df2ed2ecb611d. Both assertions passed; no runtime/console errors. Repeated after the desk-notice contrast fix, with the same result. See default-regression.json/png.
