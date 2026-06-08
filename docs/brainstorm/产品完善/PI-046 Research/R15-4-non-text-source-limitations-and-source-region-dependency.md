# R15-4 - 非文本材料限制与 SourceRegion 依赖

## 本篇问题

本篇回答：

> Microsoft GraphRAG 能否直接处理图片、手写 PDF、数学公式、代码、表格、网页？如果不能，Coincides 的 SourceRegion / reconstruction pipeline 应该承担什么？

结论先行：**Microsoft GraphRAG 不应被视为非文本 source reconstruction 工具。** 它默认处理的是 text / CSV / JSON 进入的文本语料。复杂材料必须先由 PI-048 的 toolchain 转换为可靠的 `SourceRegion` / `NoteBlockCandidate`，再进入 GraphRAG。

## 官方输入能力的限制

官方 Inputs 文档列出的默认格式是：

- plain text；
- CSV；
- JSON。

它们都会被加载成：

```text
documents DataFrame:
  id
  text
  title
  creation_date
  metadata
```

这意味着 GraphRAG 的核心输入是 `text` 字段。它可以通过 custom InputReader 支持其他文件类型，但 custom reader 的职责仍然是把外部材料读成 GraphRAG 能处理的文本/metadata。

所以 GraphRAG 的“可扩展输入”不等于“内置 OCR / VLM / layout reconstruction”。

官方资料：

- [Inputs](https://microsoft.github.io/graphrag/index/inputs/)
- [Architecture - Providers & Factories](https://microsoft.github.io/graphrag/index/architecture/)

## 手写 PDF

手写扫描 PDF 的核心问题包括：

- 页面是图片，不是文本；
- 手写文字需要 OCR 或 VLM；
- 数学公式需要 math recognition；
- 图像/手绘图需要 crop、caption、diagram understanding；
- 页面 reading order 需要 layout analysis；
- 同一页中可能混有文字、公式、图、箭头、旁注。

GraphRAG 默认无法直接承担这些任务。

正确路线：

```text
handwritten PDF
  -> page image
  -> OCR / VLM / math recognition / layout model
  -> SourceRegion
  -> NoteBlockCandidate
  -> GraphRAG Adapter
```

GraphRAG 可以在后面帮助识别：

- 哪些概念反复出现；
- 哪些公式和定理相关；
- 哪些图和主题可能属于同一 community；
- 哪些 NoteBlockCandidate 应该被归类到同一报告段落。

但它不能负责第一层重建。

## 数学公式

公式有两层：

1. 视觉层：手写/扫描/图片里的公式区域。
2. 语义层：LaTeX、变量、条件、公式说明、使用场景。

GraphRAG 只能消费第二层。它不应该直接从图片里识别 LaTeX。

PI-048 应先输出：

```text
SourceRegion:
  kind: formula
  text: optional natural language nearby text
  latex: recognized formula
  bbox
  page_label
  confidence
  tool_provenance
```

然后 GraphRAG adapter 再构造：

```text
block_role: formula
latex: ...
variables: ...
conditions: ...
source_region_id: ...
```

如果 LaTeX confidence 低，GraphRAG 不应把它当作 confirmed formula truth，只能当成 uncertain source evidence。

## 代码

代码也不应该直接交给 GraphRAG 做结构解析。

代码材料需要先保留：

- language；
- raw code；
- symbol names；
- functions/classes；
- imports/dependencies；
- call relations；
- comments/docstrings；
- file path；
- line range；
- test references。

GraphRAG 可以消费 code summary 和 symbol relationship summary，但不应该替代 code parser / LSP / tree-sitter / CodeGraph 类工具。

推荐路线：

```text
code file
  -> code parser / symbol graph
  -> SourceRegion or CodeBlockCandidate
  -> GraphRAG typed text payload
```

示意输入：

```text
block_role: code
language: TypeScript
symbols: createProposal, applyProposal
imports: db, proposalService
summary: creates and applies proposal records
raw_code_excerpt: ...
```

GraphRAG 可帮助跨文件主题总结，但 code truth 应来自 code-aware 工具。

## 表格

表格的困难：

- 表头可能多层；
- 单元格跨行跨列；
- PDF 表格读取顺序容易错；
- OCR 后表格结构容易丢失；
- 表格内容可能比普通 paragraph 更依赖 layout。

GraphRAG 如果直接读 flatten 后的表格文本，可能抽取错误 relationship。

PI-048 应先输出：

```text
SourceRegion:
  kind: table
  table_schema
  rows
  columns
  caption
  bbox
  confidence
```

GraphRAG adapter 再提供：

```text
table_summary
important_rows
entities_mentioned
source_region_id
```

## 图片 / 图表 / 手绘图

GraphRAG 默认不处理图像内容。图片进入 GraphRAG 前需要：

- crop；
- caption；
- OCR；
- diagram element recognition；
- nearby text linking；
- source provenance。

对于手绘数学图，应该保留：

```text
image_crop_id
page_label
bbox
caption
recognized_labels
related_formula_ids
confidence
```

GraphRAG 可处理 caption 和 recognized labels，但原图仍必须由 Coincides 保存。

## 网页

网页不是单纯 text。它包含：

- main article；
- nav；
- comments；
- ads；
- images；
- captions；
- embedded media；
- code snippets；
- author/date/source metadata；
- URL；
- archived snapshot。

GraphRAG 不能决定哪些网页内容是正文、广告、页脚或导航。PI-048 应先做：

```text
web snapshot
  -> readability/extraction
  -> sanitized text
  -> source regions
  -> image/caption capture
  -> provenance snapshot
```

然后 GraphRAG 只消费重建后的正文和结构。

## SourceRegion 是必要中间层

R15-4 的核心判断：

```text
raw source
  不应直接进入 GraphRAG

raw source
  -> SourceRegion
  -> NoteBlockCandidate
  -> GraphRAG Adapter
```

SourceRegion 应至少支持：

```text
source_id
page_index
page_label
bbox
region_kind
reading_order
text
latex
table_json
code_language
code_text
image_crop_id
caption
confidence
tool_provenance
warnings
```

GraphRAG 只处理这些结构的 textual projection。

## Data cleaning 的边界

GraphRAG 会做 TextUnit 切分、entity/relationship merging、description summarization、community detection。它不是 source cleaning。

Coincides 的 source cleaning 应发生在 GraphRAG 之前：

```text
page header/footer removal
page label mapping
region classification
paragraph fusion
formula recognition
code block preservation
table reconstruction
figure crop
source-level dedupe
```

GraphRAG 可以做：

```text
entity merge
relationship merge
community summarization
topic clustering
query context building
```

不要把这两类 cleaning 混在一起。

## 对 Notion-style handwritten import 的判断

用户观察到 Notion 能把手写 PDF 变成：

- 普通文字；
- LaTeX 公式；
- 截取手绘图；
- 合理排版。

R15-4 判断：这种能力本质上是 source reconstruction / document import，不是 GraphRAG 主能力。

它可能涉及：

- OCR；
- handwriting recognition；
- formula recognition；
- layout detection；
- image crop；
- VLM reasoning；
- block assembly；
- editor-specific block creation。

Microsoft GraphRAG 可以在这些步骤之后帮助理解和检索，但不能替代这些步骤。

## 对 PI-048 的要求

PI-048 必须优先研究：

- Docling / Marker / MinerU / PaddleOCR-VL / Surya 等文档重建工具；
- math OCR / LaTeX recognition；
- code extraction；
- table extraction；
- web article extraction；
- SourceRegion schema；
- SourceRegion 到 NoteBlockCandidate 的 pipeline；
- SourceRegion 到 GraphRAG Adapter 的 payload。

GraphRAG 只应成为 PI-048 的后续消费者。

## 反哺检查

需要反哺：

- PI-048 Outline 必须补强：Microsoft GraphRAG 只能作为 SourceRegion 后的 downstream graph/RAG 候选，不是 source reconstruction toolchain。
- R15-1 的“不能直接承担 PI-048”判断被 R15-4 强化，不需要回改正文，但 summary 必须引用。
- R15-2 的 adapter 规则需要在 summary 中补充：图片/公式/代码 block 的 adapter payload 必须来自专门 reconstruction，而不是 GraphRAG。

暂不需要反哺：

- R15-3 不需要回改。它讨论的是关系主权，不依赖非文本处理细节。
- R4/R5 不需要回改。非文本材料属于 import/reconstruction，不属于 manual editor minimum experience。
