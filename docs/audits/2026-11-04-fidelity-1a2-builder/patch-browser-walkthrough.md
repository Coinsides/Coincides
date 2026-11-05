# Fidelity 1a-2 patch round: browser walkthrough (v2 database)

Environment: local dev client plus a scratch server on a brand-new database and a scratch account, app browser. `database_meta.coordinate_contract` read `v2`, and the text blocks took the paginated branch (`data-page-flow-sources` 60 of 60 on a 60-paragraph docx, 3 of 3 on the PDF). Model access off. **`soffice` is not installed here**: the converter was a stand-in writing a fixed three-page PDF ("Walk page one/two/three") after a set delay, so real conversion output and formula fidelity remain unseen.

Real mouse clicks and wheel were used where marked. Navigation between notes was by setting the URL hash, and some state was read by script.

| Patch | Check | Input | Observed |
|---|---|---|---|
| P1 | Chips back to HEAD behaviour | - | Docx in Text: a visible "Source" chip under every block, opacity 1, 38 px strip |
| P2 / T-D2-1 | Projection straight to a projection with no tab, then wheel to page 2, click another tab, come back | Hash, real wheel, real tab click, script tab click | Opened on Pages; returned on Pages, viewport scrollTop 1020 against 1024 before, screenshot shows "Walk page two" |
| P2 / T-D2-N1 | Docx converting, reader at scrollTop 800 in Text, go to a markdown projection, wait past the conversion, come back | Hash; scrollTop set by script | Samples at 150 to 2500 ms: scrollTop 800 throughout; Text from 350 ms onward. No jump to Pages |
| P3 | Formula docx on Pages, then Text | Real click on the toggle | No notice on Pages; notice on Text with the expected copy |
| D2 | Fresh PDF and docx tabs with no memory | Hash | Open on Pages with images at natural width 1240 |
| Chip jump | PDF in Text, click "Original page" on page 3's chip | Real click | Pages view, viewport scrollTop 2016, screenshot shows "Walk page three" |

Two early attempts at the T-D2-N1 path are void and not counted: in both the page had not scrolled (`top: 0` before leaving), one because the note had not finished loading and the scratch account's onboarding dialog was also still open.

Not exercised here: P4 and P5 (server tests and positive controls only), a real conversion, and the T-D2-N1 path returning through a document tab click instead of a hash. No comparison run of T-D2-N1 on the unpatched code was made in this browser.

Seen on the way, not changed: setting the hash straight from note to note still shows "Changes could not be saved" (already recorded in the stopbleed walkthrough).
