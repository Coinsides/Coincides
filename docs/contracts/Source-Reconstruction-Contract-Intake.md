> **状态 (Status)**: archived
> **层 (Layer)**: 历史 / History（已冻结的 V2.BN.6 契约输入）
> **日期 (Updated)**: 2026-08-20（冻结）
> **权威 (Authoritative)**: 否
> **被取代 (Superseded by)**: [`Source-Ladder-Contract.md`](Source-Ladder-Contract.md)

> # ⛔ 整体冻结公告（2026-08-20）
>
> **本文件已整体冻结，不作为任何工作的依据。现行契约 = [`Source-Ladder-Contract.md`](Source-Ladder-Contract.md)。**
>
> ## 为什么是冻结而不是更正
>
> 本文件的**前提被整个换掉了**。它把「解析」放在「锚」的**上游**（type detection → SourceRegion → NoteBlockCandidate → proposal），而方向宪章 §3 的三层梯子明言 **层1 区域锚不需解析**——「划个红圈就能问 AI」。这不是措辞差异，是**管线拓扑反转**。
>
> 更根本的：本文件 §2 的 `SourceRegion` **一张表同时装几何（page/bbox）与语义（kind/text/latex/confidence）**——那正是「锚必须等解析」这条依赖的物化根源。新契约把它拆成层1 锚（几何，格式原生）与层2 组件流（语义）。
>
> 其余失效点：`NoteBlockCandidate` 端点已改为 **Item**（V2.BN.11 教义更替）；统一 `bbox` 坐标模型已改为**格式原生多坐标系**（PDF=页+bbox / DOCX=元素路径+偏移 / XLSX=单元格地址 / PPTX=slide+EMU，07-20 拍定）；§4 中 AFFiNE/BlockSuite 一行随 ADR-0001 自研引擎失效。
>
> ## 本文件仍有的价值
>
> **逐节判定见新契约 §8**（存活 5 / 拆分 1 / 被取代 2 / 部分 1）。其中 **§5 Condensed Raw Source 处理原则已按裁定原文搬入新契约 §6.1** ——「不默认 aggressive summarization」「不把人类已整理过的信息当未加工 textbook」与宪章 §11 学习闭环直接同源，不留在冻结件里等着被遗忘。
>
> §6 的 PI-048 待答问题多数已由 `agent-ops/analysis/external-candidate-registry.md`（抽取矩阵）回答；剩「手写 STEM 如何评估」「公式/表格保真」仍开放，归 Agent 版层2 VLM。

# Source Reconstruction Contract Intake（已冻结）

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
