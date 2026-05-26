# v2.4 Project Package / Portable Knowledge Workspace Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Future `.coincides` project package, portable source-grounded workspace, package levels, assets/original files, engine snapshots as sidecars, import/export constraints, and v2.4/v2.5 design implications.

---

## 1. Executive Summary

Coincides 最终需要一种可分享、可打开、可编辑、可重建的工程文件。

不是只导出 PDF / PNG / HTML。

而是类似：

```text
my-course-note.coincides
```

它应该像 XMind 工程文件一样：

- 发给另一台电脑；
- 用 Coincides 打开；
- 保留可编辑结构；
- 保留 canvas / view；
- 保留 source references；
- 保留 evidence；
- 保留 relation layers；
- 保留 proposal/review metadata；
- 可选保留原始文件和 assets。

核心结论：

```text
.coincides should be a Coincides-native package,
not a raw tldraw snapshot,
not a raw Excalidraw scene,
not an AFFiNE document,
not only JSON Canvas.
```

推荐形态：

```text
ZIP package
  manifest
  typed JSON parts
  assets/
  original-files/
  optional engine snapshots/
  checksums / package metadata
```

最重要的规则：

```text
Package truth belongs to Coincides objects.
External engine data is optional sidecar/cache.
```

---

## 2. Why Package Matters

Export solves reading.

Package solves continuation.

Difference:

```text
PDF / PNG / HTML:
  good for viewing and sharing final output.

.coincides:
  good for reopening, editing, auditing, regenerating, reusing, and verifying source.
```

Coincides 笔记不只是文本和画布。

它包含：

- source snapshots；
- source anchors；
- source scopes；
- evidence sets；
- NoteBlocks；
- relation layers；
- CanvasNodes；
- proposals；
- templates；
- assets；
- possible original files。

如果只导出普通文档，很多关键能力会丢失：

- 不能跳回 source；
- 不能验证 evidence；
- 不能重新生成局部 proposal；
- 不能继续编辑 relation layer；
- 不能恢复 canvas object selection；
- AI 不能读取完整结构；
- 不能在另一台电脑上继续作为知识工程使用。

所以 `.coincides` 是未来信息加工中台的重要组成部分。

---

## 3. Reference Findings

### 3.1 XMind

XMind 的核心启发是：

```text
project file can be a compressed package.
```

常见 `.xmind` 文件结构包括：

- content data；
- style data；
- metadata；
- thumbnails；
- attachments；
- manifest。

这说明一个复杂可编辑文档不一定要是单一 JSON。

它可以是：

```text
zip container
  structured content files
  styles
  metadata
  thumbnails
  attachments
```

对 Coincides 的启发：

```text
.coincides should package content, style, source, assets, and metadata separately.
```

### 3.2 DOCX / Open Packaging Conventions

`.docx` 和 Open Packaging Conventions 的启发更重要。

OPC 把 package 理解成：

- ZIP archive；
- parts；
- relationships；
- content types；
- metadata。

一个 package 不是简单文件夹，而是一个有关系图的容器。

对 Coincides 的启发：

```text
.coincides package should separate parts and relationships.
```

可能对应：

```text
parts:
  notes.json
  blocks.json
  sources.json
  evidence.json
  relations.json
  canvases.json
  templates.json

relationships:
  block -> source anchor
  relation -> evidence
  canvas node -> domain object
  proposal -> generated object
```

这和 Coincides 的 ObjectRelation / SourceAnchor / EvidenceSet 天然契合。

### 3.3 Obsidian Vault + JSON Canvas

Obsidian 的启发：

- notes 是 Markdown files；
- attachments 存在 vault 里；
- `.canvas` 使用 JSON Canvas；
- vault 是普通文件夹，利于迁移、备份、Git、同步。

JSON Canvas 的启发：

- open format；
- nodes / edges；
- positions / sizes；
- colors / labels；
- file nodes。

对 Coincides 的启发：

```text
Open readable package formats help long-term trust.
```

但 JSON Canvas 不够：

- 没有 source/evidence/proposal lifecycle；
- 没有 relation status；
- 没有 accepted/suggested/rejected；
- 没有 source-grounded package levels；
- 没有 AI operation trace。

结论：

```text
JSON Canvas can inspire canvas projection export.
It cannot be the Coincides project package.
```

### 3.4 tldraw Snapshot

tldraw 的启发：

- document state and session state can be snapshotted；
- persistence can store snapshots；
- schema migration matters；
- session/camera state can be separated from document state。

对 Coincides 的启发：

```text
Engine snapshot may preserve visual fidelity.
But it should be optional sidecar.
```

如果 package 包含 tldraw snapshot：

```text
engine-snapshots/tldraw/canvas-id.json
```

它可以帮助快速恢复画布视觉状态。

但如果没有它，Coincides 应该仍能从：

```text
canvases.json
canvas-nodes.json
canvas-edges.json
relations.json
blocks.json
sources.json
```

重建核心内容。

### 3.5 Excalidraw Scene

Excalidraw 的启发：

- `.excalidraw` 是 JSON scene；
- elements / appState / files 的结构容易理解；
- 很适合作为 visual scene / export sidecar。

对 Coincides 的启发：

```text
Scene JSON is useful, but scene is not knowledge truth.
```

如果未来支持 Excalidraw-like sketch sidecar，也应该放在：

```text
engine-snapshots/excalidraw/
```

或作为某个 CanvasVisual 的 asset。

### 3.6 Figma / FigJam

Figma / FigJam 的启发偏产品层：

- 文件可以导出本地副本；
- 但格式较封闭；
- 常规分享/嵌入依赖云端 file key / iframe；
- PNG/PDF/JPG 是常见导出。

对 Coincides 的警示：

```text
Do not make Coincides package depend on a closed/cloud-only engine format.
```

Coincides 的 package 应该 local-first、可检查、可迁移。

---

## 4. Package Goals

`.coincides` package should support:

### 4.1 Reopen And Edit

另一台电脑上打开后：

- 能看到 notes；
- 能打开 canvas；
- 能移动 CanvasNodes；
- 能查看 source snapshots；
- 能检查 EvidenceSets；
- 能看 relation layers；
- 能继续 proposal/review/apply。

### 4.2 Source Trust

Package should preserve enough source evidence to answer:

```text
Where did this block come from?
Which source range supports this relation?
Can I jump back to source?
Was this evidence accepted or conflicted?
```

### 4.3 AI Continuation

Package should let AI continue working:

- read NoteBlocks；
- read selected scopes；
- read relation layers；
- read evidence；
- avoid rejected proposals；
- generate new proposals；
- preserve operation trace。

### 4.4 Engine Independence

Package should remain useful even if:

- tldraw is removed；
- Excalidraw is not installed；
- engine snapshot is missing；
- canvas SDK changes；
- graph-native v3.x migration changes storage。

### 4.5 Privacy And Size Control

Package should support levels:

- no original files；
- source snapshots only；
- full original files；
- assets included or external；
- sensitive metadata stripped。

---

## 5. Recommended Package Levels

### 5.1 Light Package

Purpose:

```text
Share editable notes/canvas without full source material.
```

Includes:

- manifest；
- notes；
- NoteBlocks；
- CanvasNodes / CanvasEdges；
- RelationLayers / ObjectRelations；
- templates used；
- minimal source reference stubs；
- optional thumbnails。

Excludes:

- original files；
- full source snapshots；
- sensitive evidence details。

Use cases:

- quick sharing；
- peer review；
- lightweight transport；
- public demo。

Limitation:

```text
Source trust is partial.
Jump-back may be unavailable or degraded.
```

### 5.2 Trusted Package

Purpose:

```text
Share notes/canvas with source snapshots and evidence.
```

Includes:

- everything in Light Package；
- source snapshots；
- source anchors；
- source scopes；
- evidence sets；
- conflict/exclusion metadata；
- relation source evidence；
- source text excerpts / page-like units。

Excludes by default:

- original uploaded files unless selected。

Use cases:

- serious study sharing；
- source-backed review；
- AI continuation on another machine；
- collaboration without raw original PDFs。

### 5.3 Full Package

Purpose:

```text
Full portable workspace.
```

Includes:

- everything in Trusted Package；
- original files；
- assets；
- images/media；
- engine snapshots；
- thumbnails；
- package audit metadata。

Use cases:

- backup；
- migration；
- archival；
- handoff to another environment；
- long-term reproducibility。

Risk:

```text
Size and privacy.
```

---

## 6. Proposed Package Structure

Recommended initial structure:

```text
my-note.coincides
  manifest.json
  package.json
  checksums.json

  data/
    courses.json
    notes.json
    note-blocks.json
    note-block-placements.json
    sources.json
    source-snapshots.json
    source-anchors.json
    source-scopes.json
    evidence-sets.json
    evidence-items.json
    proposals.json
    relation-layers.json
    object-relations.json
    canvases.json
    canvas-nodes.json
    canvas-edges.json
    view-presets.json
    templates.json

  assets/
    images/
    media/
    thumbnails/

  original-files/
    documents/

  engine-snapshots/
    tldraw/
    excalidraw/
    json-canvas/

  exports/
    pdf/
    html/
    png/

  metadata/
    package-log.json
    privacy.json
    migration-notes.json
```

Not every package level includes every folder.

---

## 7. Manifest

`manifest.json` should include:

```json
{
  "format": "coincides-package",
  "format_version": "0.1",
  "created_at": "2026-05-22T00:00:00Z",
  "created_by": "Coincides",
  "package_level": "trusted",
  "course_id": "course-id",
  "title": "Package title",
  "included_parts": [
    "notes",
    "blocks",
    "sources",
    "evidence",
    "relations",
    "canvases"
  ],
  "engine_snapshots": [
    {
      "engine": "tldraw",
      "version": "optional",
      "path": "engine-snapshots/tldraw/canvas-id.json",
      "role": "cache"
    }
  ],
  "privacy": {
    "includes_original_files": false,
    "includes_source_snapshots": true,
    "includes_api_metadata": false
  }
}
```

Important:

```text
manifest must identify what is authoritative and what is cache.
```

---

## 8. Relationship Model Inside Package

Package should preserve relationships explicitly.

Examples:

```text
CanvasNode -> NoteBlock
CanvasEdge -> ObjectRelation
ObjectRelation -> EvidenceSet
NoteBlock -> SourceAnchor
SourceScope -> SourceSnapshotPage
Proposal -> generated NoteBlock / ObjectRelation / CanvasNode
Template -> NoteBlock metadata
ViewPreset -> Canvas / RelationLayer filters
```

This can be stored through:

- explicit `target_type / target_id` fields；
- `object-relations.json`；
- package-level relationship index；
- checksums for referenced assets。

Possible relationship index:

```json
{
  "relationships": [
    {
      "from": { "type": "canvas_node", "id": "node-1" },
      "to": { "type": "note_block", "id": "block-1" },
      "relationship": "projects"
    }
  ]
}
```

This may be redundant with data files at first, but useful for import validation.

---

## 9. Import Rules

Import must handle conflicts safely.

Questions:

- Does target workspace already have this course?
- Do object IDs collide?
- Are sources duplicated?
- Are templates missing?
- Are relation types unknown?
- Are engine snapshots unsupported?
- Are original files missing?
- Are checksums invalid?

Recommended import modes:

```text
Preview import
  show package contents, size, privacy, warnings.

Import as new course
  safest default.

Merge into existing course
  advanced, requires review.

Extract selected objects
  future feature.
```

Import should not silently overwrite existing objects.

---

## 10. Export Rules

Export should ask:

- package level；
- include original files；
- include source snapshots；
- include engine snapshots；
- include proposal history；
- include rejected/superseded proposals；
- include hidden AI layers；
- include private metadata；
- include API/provider metadata；
- include thumbnails/exports。

Recommended default:

```text
Trusted Package
  includes source snapshots and evidence
  excludes original files unless user chooses
  excludes secrets and API metadata
```

---

## 11. Engine Snapshot Rule

External engine snapshots can help preserve fidelity.

But they must be explicitly marked:

```text
role = cache / sidecar / export / debug
```

Rules:

- engine snapshot is never the only truth；
- if engine snapshot is missing, rebuild from Coincides data；
- if engine version is unsupported, ignore or degrade gracefully；
- engine-specific metadata must not be required for source/evidence/relation reconstruction。

This keeps tldraw / Excalidraw / JSON Canvas useful without making them owners.

---

## 12. Source And Privacy

Source packaging is sensitive.

Package should support:

- source excerpt only；
- page-like source snapshot；
- original file；
- redacted source；
- source metadata only；
- external source link；
- checksum without content。

Privacy metadata should say:

```text
This package includes original source files.
This package includes source snapshots but not original files.
This package includes hidden AI relation layers.
This package includes proposal history.
```

User should understand what they are sending.

---

## 13. AI And Agent Implications

Package should preserve enough structure for AI continuation.

Future AI should be able to:

- inspect package manifest；
- list included object types；
- find selected NoteBlocks；
- read relation layers；
- follow source anchors；
- detect missing sources；
- continue proposal-first operations；
- avoid rejected proposal patterns；
- verify source grounding。

This supports:

- AI tutor behavior；
- AI report generation；
- AI migration assistant；
- quality monitoring agent；
- package auditor agent；
- import validation agent。

---

## 14. v2.4 / v2.5 / v3.x Impact

### v2.4

Must avoid designs that make package impossible:

- CanvasNode must reference domain objects；
- CanvasEdge must not be only engine geometry；
- ObjectRelation must have stable target references；
- external engine snapshots must stay optional；
- source/evidence IDs must remain exportable。

### v2.5

Package Manifest / Package Studio should likely begin here.

v2.5 should define:

- package manifest；
- package levels；
- template/style pack packaging；
- source inclusion choices；
- basic export/import preview。

### v3.x

Graph-native migration should be package-aware.

v3.x should be able to:

- import v2.x packages；
- migrate NoteBlock/ObjectRelation to graph-native model；
- preserve source/evidence/proposal history；
- preserve view/canvas projections；
- validate package relationships。

---

## 15. Open Questions

- Should `.coincides` package be ZIP with JSON parts, or a folder bundle first?
- Should package IDs preserve original object IDs or remap on import?
- Should hidden AI relation layers be included by default?
- Should rejected proposals be included in Trusted Package?
- Should original files be copied or referenced by checksum?
- Should source snapshots be enough for trust when original files are absent?
- Should package support encryption/password protection?
- Should package import support partial import?
- Should package include engine snapshots by default?
- Should package include generated PDF/HTML/PNG exports as convenience outputs?

---

## 16. Final Position

The future `.coincides` package should be:

```text
a portable, source-grounded, relation-aware knowledge workspace package
```

not:

```text
a canvas file
a PDF export
a raw engine snapshot
a generic markdown vault
```

Stable rule:

```text
Coincides package owns knowledge truth.
External formats may help with display, export, or interoperability.
```

This makes package design a long-term constraint for v2.4 Canvas, v2.5 Template/Package Studio, and v3.x graph-native migration.

---

## 17. Core Takeaway

The core conclusion:

```text
.coincides is not an export file.
.coincides is a portable workspace package.
```

It should not be:

```text
raw tldraw snapshot
raw Excalidraw scene
AFFiNE document
generic JSON Canvas
PDF / PNG / HTML export
```

It should be:

```text
a portable, source-grounded, relation-aware knowledge workspace package
```

Recommended package levels:

```text
Light Package:
  notes + blocks + canvas + relations,
  with degraded source trust.

Trusted Package:
  source snapshots + anchors + evidence,
  suitable for serious sharing and AI continuation.

Full Package:
  original files + assets + engine snapshots,
  suitable for backup, migration, and archival.
```

The most important rule:

```text
Coincides package owns knowledge truth.
External formats may help with display, export, or interoperability.
```

This means engine-specific snapshots can be included, but only as:

- cache;
- sidecar;
- fidelity helper;
- export/interoperability layer.

They must never become the only way to reconstruct:

- NoteBlocks;
- SourceAnchors;
- EvidenceSets;
- ObjectRelations;
- RelationLayers;
- CanvasNodes;
- proposal history;
- template metadata.

In short:

```text
Export lets others see the result.
Package lets others continue the work.
```

---

## 18. Sources

- XMind file format overview: https://file-extensions.com/docs/xmind
- XMind package structure reference: https://deepwiki.com/zhuifengshen/xmind/1.2-xmind-file-format
- Open Packaging Conventions overview: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/opc/open-packaging-conventions-overview
- JSON Canvas specification: https://jsoncanvas.org/spec/1.0
- JSON Canvas project: https://jsoncanvas.org/
- Obsidian accepted file formats: https://help.obsidian.md/file-formats
- Obsidian attachments: https://help.obsidian.md/attachments
- Obsidian data storage: https://help.obsidian.md/data-storage
- tldraw persistence: https://tldraw.dev/sdk-features/persistence
- tldraw store: https://tldraw.dev/sdk-features/store
- Excalidraw developer docs: https://docs.excalidraw.com/
- Excalidraw package docs: https://www.npmjs.com/package/@excalidraw/excalidraw
- Figma embed docs: https://developers.figma.com/docs/embeds/embed-figma-file/
- Figma export settings docs: https://developers.figma.com/docs/plugins/api/ExportSettings/
