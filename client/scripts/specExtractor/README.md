# Spec extractor

Offline, read-only specimen ruler for T9. It writes JSON and Markdown candidates;
it never writes profile, token, CSS, database or specimen values. No added dependency.

From `client/`:

```sh
npm run spec:extract -- ../docs/agent-ops/design/specimens/2026-09-19-song-handbook.html --out-dir ../docs/audits/2026-09-22-t9-extractor-builder
npm run test:unit -- scripts/specExtractor/specExtractor.test.mjs
```

On PowerShell installations that block `npm.ps1`, use `npm.cmd`. Omitting
`--out-dir` writes to repository `.codex-tmp/spec-extractor/`. Use
`--paper-selector '.paper'` for a different paper class. No numeric width fallback
is supplied: an unresolved paper declaration produces an error.

`extractSpec(html, options)` also works in memory. `loadProductGrid()` reads current
trusted product source and uses existing TypeScript to evaluate selected pure
declarations without starting the product. Every source file is fingerprinted.
An unsupported product CSS shape fails explicitly instead of keeping stale values.

The default scenario is desktop screen, viewport 1280px, light, no reduced motion.
The API accepts `environment` for those four scenario fields. HTML scripts,
event handlers and remote styles/fonts are not executed or fetched. Consequently,
script-generated page numbers, diagrams and TOC content are not measured.

The reader uses jsdom HTML/CSSOM/selector/declaration parsing, then a bounded
specificity/importance/inheritance/custom-property pass for declaration metrics.
It is **not** a browser layout implementation. Unsupported selectors and media
rules are listed; unknown font lengths remain null. `line-height: normal` stays
unknown, while `letter-spacing: normal` is the declared zero tracking baseline.
Spacing reports declaration scalar clusters; var()/relative/calc() spacing stays
unresolved without an element context. Color declaration references use root
baseline variables, separately from explicit element property usage counts.

Paper width comes from the first declared width/max-width at the chosen paper or
its ancestors. This is a nominal CSS basis, not a measured border box. Fonts and
absolute spacing normalize by `900 / declaredPaperWidth`; product length grid
points normalize by `900 / productPaperWidth`. Ratios, weights and em do not scale.

Role selectors are published in `ROLE_SELECTORS` and every report. Semantic tags
are supplemented by explicit handbook classes; this is a deterministic mapping,
not inferred semantic understanding. Role roots and text-bearing descendants are
counted separately; callout comparisons select body text rather than an empty
container. All variants remain in JSON. Table captions and figure captions are
separate. A4 factory defaults are the product reference, not a live user's note.

Every measured record has `raw`, `normalized`, `nearest`, `distance`, `unit`,
frequency and evidence. Missing data or grids produce null. Numeric distance is
absolute difference; font stacks use one minus set overlap/union; colors use
RGBA Euclidean distance, not perceptual color difference. Snap only nominates
existing grid points for HQ/Henry review. It does not approve importing raw values.

The single small synthetic Vitest test is automatically discovered by the client
suite. The archived handbook is used only by the explicit first-voyage command.
