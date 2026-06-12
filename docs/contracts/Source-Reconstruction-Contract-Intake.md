# Source Reconstruction Contract Intake

**状态**：V2.BN.6 合同输入
**用途**：从 PI-048 提取会影响 Better Notebook 数据契约的最低要求。本文不是 OCR/VLM 调研报告，也不是工具选型结论。

## 1. 边界

Source reconstruction 解决的是：

```text
原始材料
-> 类型判断
-> 区域重建
-> 可审查候选
```

它不等于最终 note generation，也不等于用户确认后的 NoteBlock truth。

## 2. 最小对象

### SourceTypeDetection

用于判断输入材料是什么：

- text PDF；
- scanned PDF；
- mixed PDF；
- handwritten STEM note；
- DOCX / PPTX / XLSX；
- web article / snapshot；
- image；
- code / markdown / JSON / JSONL。

### SourceRegion

SourceRegion 是后续 chunking、NoteBlockCandidate、source anchor 和 evidence trust 的输入层。

最小字段：

```text
source_document_id
source_version_id
page_label
page_index
bbox
kind
reading_order
text
latex
table
crop_asset_id
confidence
tool_provenance
warnings
```

`kind` 至少包括：

```text
paragraph
heading
formula
diagram
image
table
code
margin_note
unknown
```

### NoteBlockCandidate

NoteBlockCandidate 是候选，不是确认后的 NoteBlock。

它可以携带：

```text
candidate_type
source_regions
suggested_template_variant
field_values_guess
layout_hint
confidence
warnings
```

## 3. Chunking 顺序

第一版顺序必须是：

```text
source type detection
-> tool/model route
-> SourceRegion
-> reconstruction-aware chunking
-> NoteBlockCandidate
-> proposal
-> user confirmed NoteBlock
```

禁止跳过 `SourceRegion` 直接把 OCR/VLM 输出写成 NoteBlock truth。

## 4. Adapter 边界

```text
OCR / VLM / formula recognition
  -> SourceRegion / NoteBlockCandidate / proposal

MarkItDown / Docling / MinerU / web extractor
  -> source reconstruction candidate

AFFiNE / BlockSuite bridge
  -> editor projection / import-export candidate

GraphRAG
  -> index / query result / relation candidate / community summary
```

这些 adapter 都不能直接覆盖 canonical NoteBlock、SourceReference、ObjectRelation 或 TemplateDefinition truth。

## 5. Condensed Raw Source

Condensed raw source 是 raw source 的子类。它可能是：

- 手写笔记；
- 已整理 lecture note；
- AI briefing；
- 用户 draft report；
- 导出的 Notion / Word / PDF note。

处理原则：

- 优先 preserve layout、顺序、图文相邻关系和手写/图像证据；
- 不默认 aggressive summarization；
- 不默认删除重复内容；
- 不把人类已经整理过的信息当成未加工 textbook；
- reconstruction 后仍要保留 source provenance。

## 6. 后续影响

V2.BN.6 只锁 contract。

PI-048 后续正式调研需要回答：

- 哪些工具最适合生成 SourceRegion；
- handwritten STEM import 如何评估；
- formula/table/diagram/crop 如何保真；
- SourceRegion 如何桥接到 NoteBlockCandidate；
- 如果未来采用 AFFiNE / BlockSuite，reconstruction output 如何进入 Coincides sidecar truth。
