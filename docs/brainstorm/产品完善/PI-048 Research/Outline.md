# PI-048 Source Reconstruction 调研 Outline

## 目的

这份 Outline 用来规划 `PI-048: Source Reconstruction Toolchain Research For OCR / VLM / Web / AFFiNE Bridge` 的系统调研。

本轮调研关注的不是最终笔记生成，而是更靠前的一层：当用户上传 PDF、扫描件、手写笔记、网页、图片、DOCX、PPTX、Markdown 或其他材料时，Coincides 应该如何先把 source 重建成可信的结构化区域，再交给后续 NoteBlock 生成、证据锚点、chunking、去重和排版流程。

Notion 手写扫描 PDF import 的实验结果是本轮调研的重要参考现象：它能够从纯图片 PDF 中重建普通文字、识别数学公式并转成 LaTeX-like 内容，同时把手画图裁剪为图片放回对应位置。这说明“AI 做出有用笔记”的一大部分工作发生在 note writing 之前：source 必须先被识别、分区、重建、标注来源和置信度。

本轮调研的目标是弄清楚：

- Coincides 第一版 source reconstruction 应该支持哪些 source 类型；
- 哪些 OCR / VLM / math recognition / layout extraction / web extraction 工具值得进入候选矩阵；
- `SourceRegion` 应该如何定义，才能支撑后续 NoteBlockCandidate、SourceAnchor、SourceScope、Evidence 和 GraphRAG；
- 这一层如何接入 PI-046 调研后确定的 editor / AFFiNE / BlockSuite / 自研路线。

## PI-046 前置依赖

PI-048 调研必须优先吸收 `PI-046 Research` 的阶段性或最终结论。PI-046 负责判断 Coincides 下一阶段到底是继续当前主线、自研 editor/canvas，还是改编 AFFiNE / BlockSuite；PI-048 则在这个判断基础上研究 source reconstruction 如何进入对应路线。

执行规则：

- 每份 PI-048 报告开头都必须有 `PI-046 前置结论引用` 小节。
- 如果 PI-046 已经完成相关报告，PI-048 必须先读取并引用对应结论。
- 如果 PI-046 最终选择 AFFiNE / BlockSuite 路线，PI-048 要重点研究 reconstruction output 如何桥接到 AFFiNE blocks，以及 Coincides `SourceRegion` / `SourceAnchor` / evidence provenance 是否需要保留为 sidecar。
- 如果 PI-046 最终选择 Coincides 自研路线，PI-048 要重点研究 `SourceRegion -> NoteBlockCandidate -> Proposal -> Canvas/NoteBlock` 的自有 pipeline。
- 如果 PI-046 尚未形成最终路线，PI-048 报告必须保留多路线判断，不提前押死 AFFiNE、自研或 hybrid 其中一种架构。

这份 Outline 是暂定版。随着 PI-046 报告推进，PI-048 的报告顺序、报告数量和重点可以回头修订。

## R15 Microsoft GraphRAG 前置边界

PI-046 的 R15 补充调研已经明确：Microsoft GraphRAG 值得作为后续 graph/RAG sidecar 候选，但它不替代 PI-048 的 source reconstruction。

执行规则：

- PI-048 不应把 Microsoft GraphRAG 当成 OCR、VLM、公式识别、代码解析、表格重建、网页抽取或 SourceRegion 的替代品。
- PI-048 仍然要先产出可信的 `SourceRegion` / `NoteBlockCandidate`。
- PI-048 的输出应预留 GraphRAG downstream：`SourceRegion / NoteBlockCandidate -> GraphRAG Adapter payload`。
- GraphRAG 可以在 source reconstruction 之后帮助发现 Concept、RelationCandidate、Community Report 和跨材料 query context。
- GraphRAG 产生的 relationship 只能作为候选或 index evidence；不能直接成为 Coincides confirmed `ObjectRelation`。
- 如果后续 R15 Level 1 spike 失败，PI-048 仍然继续，只是不把 GraphRAG 作为主 downstream。

## 调研总原则

- 先判断 source 类型，再决定工具链；不要一上来就问“怎么 chunk 这个文件”。
- 先 source type detection，再 extraction plan，再 tool/model route，再 `SourceRegion`，再 `NoteBlockCandidate`。
- 专项工具优先于“最强 VLM 硬扫全部”。强推理模型可以做裁决、补全、纠错和综合，但不应替代公式识别、表格解析、页面分区、OCR、网页正文抽取等专项能力。
- Source reconstruction 不等于 final note generation。它可以忠实重建 source，最终笔记仍要决定保留、浓缩、合并、折叠、引用、重排和展示。
- 每份报告都要明确回答：解决了什么问题、暴露了什么风险、是否能接入 Coincides、对 roadmap 有什么影响。
- 所有候选工具都要评估：输出结构、证据可追踪性、Windows/local/Docker 可行性、CPU/GPU 要求、许可、模型权重限制、工程复杂度和长期维护成本。

## 最终需要回答的问题

1. Coincides 第一版 source reconstruction 应该优先支持哪些 source 类型？
2. 纯文本 PDF、扫描 PDF、混合 PDF、手写 STEM 笔记、网页、图片、DOCX/PPTX/XLSX/Markdown 是否应该走不同 pipeline？
3. `SourceRegion` 的最小可用 schema 是什么？
4. Source region 如何记录 page label、bbox、reading order、region kind、crop asset、LaTeX、table、confidence 和 tool provenance？
5. 哪些开源工具适合做 document reconstruction、OCR、layout、table、formula、handwriting、web extraction？
6. Notion-like handwritten STEM import 的质量应该如何评估？
7. 如何处理页眉、页脚、页码、广告、导航、装饰元素和重复区域？
8. Source reconstruction 之后的 chunking 应该如何做，尤其是长段落、跨页段落、图文相邻区域和公式块？
9. `SourceRegion` 如何进入 role segmentation、dedupe、template selection 和 note assembly proposal？
10. 如果后续改编 AFFiNE / BlockSuite，source evidence 应该由 editor 内部承载，还是由 Coincides sidecar 承载？
11. 第一版工程 spike 应该从哪个工具链开始？
12. 哪些能力属于 v2.x 可以先做的基础，哪些应该留到 editor 方向确定后再做？
13. `SourceRegion` / `NoteBlockCandidate` 如何生成可供 Microsoft GraphRAG 消费的 typed text + metadata payload？
14. 哪些 source reconstruction 输出可以进入 GraphRAG，哪些必须留在 Coincides source truth / evidence sidecar 中？

## 调研阶段

### R0: 调研方法与评分标准

目标：

- 定义本轮调研的报告格式、评分维度和最终决策标准。
- 给每个工具、pipeline 和 bridge 方案建立统一比较方式。

需要回答：

- 每份报告必须引用哪些 PI-046 前置结论？
- 每个工具或方案应该如何打分？
- 哪些维度必须比较：准确率、region schema、公式、表格、手写、裁图、source anchor、Windows/local/Docker、许可、成本、工程复杂度、AFFiNE bridge 适配度？

建议输出：

- `R0-research-method-and-scoring-rubric.md`

### R1: Notion 手写 PDF Import 现象拆解

目标：

- 从产品结果反推 Notion-like import 可能做了哪些工作。
- 区分可观察事实和推测 pipeline。

需要覆盖：

- 纯图片 PDF 如何被识别为可处理材料；
- 普通手写文字如何转成 typed text；
- 数学公式如何变成 LaTeX-like 内容；
- 手画图如何被裁剪、保留并插入对应位置；
- 哪些部分可能来自 OCR，哪些部分可能来自 VLM，哪些部分可能来自 layout / region detection。

建议输出：

- `R1-notion-handwritten-pdf-import-analysis.md`

### R2: Source Type Taxonomy And Detection Contract

目标：

- 定义 Coincides source reconstruction 之前必须先判断的 source 类型。

需要覆盖：

- pure text PDF；
- scanned / image-only PDF；
- mixed PDF；
- handwritten STEM note；
- typed lecture note；
- research paper；
- problem set / worksheet；
- DOCX / PPTX / XLSX；
- Markdown / plain text；
- webpage URL；
- saved webpage snapshot；
- image-only source。

需要回答：

- source classifier 应该输出哪些字段？
- 如何判断材料应该走 OCR、PDF text extraction、VLM、web extraction、table extraction 或 mixed pipeline？
- 如果分类不确定，如何记录 warning 和 fallback route？

建议输出：

- `R2-source-type-taxonomy-and-detection-contract.md`

### R3: Canonical SourceRegion Schema

目标：

- 定义第一版跨 PDF、图片、网页和文档的 `SourceRegion` schema。

需要覆盖：

- source id / snapshot id；
- page index / visible page label；
- web URL / DOM path / snapshot position；
- bbox / region geometry；
- region kind；
- reading order；
- extracted text；
- extracted LaTeX；
- table HTML / JSON；
- image crop / asset reference；
- confidence；
- tool/model provenance；
- warnings / uncertain fields。

需要回答：

- `SourceRegion` 是数据库 truth、candidate、还是 proposal 输入？
- header/footer/page number/ad/navigation 应该作为 SourceRegion、PageDecoration，还是两者都需要？
- region 如何和 SourceAnchor / SourceScope / NoteBlockCandidate 对齐？

建议输出：

- `R3-canonical-source-region-schema.md`

### R4: General Document Reconstruction Tool Matrix

目标：

- 调研通用文档重建工具，判断它们适合作为主工具、baseline、fallback 还是 sidecar。

候选：

- Docling；
- MinerU；
- PaddleOCR / PaddleOCR-VL；
- Marker；
- Unstructured；
- MarkItDown。

需要回答：

- 支持哪些输入类型；
- 输出 Markdown、JSON、HTML、regions、bbox、assets 的能力；
- 对公式、表格、图片、阅读顺序、页眉页脚的支持；
- Windows/local/Docker 可行性；
- CPU/GPU 要求；
- 许可和模型权重风险；
- 是否适合 Henry 本地材料测试。

建议输出：

- `R4-document-reconstruction-tool-matrix.md`

### R5: Specialized OCR / Layout / Table / Formula Tools

目标：

- 调研专项工具，判断哪些能力应该由专门模块完成。

候选：

- Surya；
- PaddleOCR / PP-Structure；
- pdfplumber；
- Camelot；
- GROBID；
- Pix2Text；
- RapidLaTeXOCR / LaTeX-OCR family。

需要回答：

- 哪些工具适合 OCR；
- 哪些工具适合 layout detection / reading order；
- 哪些工具适合 table extraction；
- 哪些工具适合 formula recognition；
- 哪些工具适合 scientific paper structure；
- 专项工具与通用 document reconstruction 工具如何组合。

建议输出：

- `R5-specialized-ocr-layout-table-formula-tools.md`

### R6: Handwritten STEM Reconstruction Evaluation

目标：

- 专门评估手写数学 / STEM 笔记重建能力。

候选：

- olmOCR；
- PaddleOCR-VL；
- Nanonets docext / OCR models；
- Pix2Text；
- specialist VLM workflows；
- commercial-quality references where useful。

需要覆盖：

- 手写文字识别；
- 数学公式识别；
- LaTeX 质量；
- 图像裁剪；
- 图文对应关系；
- 阅读顺序；
- 多页一致性；
- 置信度与人工复核入口。

建议输出：

- `R6-handwritten-stem-reconstruction-evaluation.md`

### R7: Web Snapshot And Article Extraction

目标：

- 调研网页正文抽取、网页快照、图像保存和 evidence preservation。

候选：

- Mozilla Readability；
- Trafilatura；
- Defuddle；
- SingleFile or similar snapshot tools。

需要回答：

- 如何去除广告、导航、推荐栏、脚注噪声；
- 如何保留网页正文、标题、作者、日期、图片、链接；
- 如何记录 DOM/source position；
- 如何把网页图片和截图保存成可追踪 source assets；
- URL 失效后如何通过 snapshot 恢复证据。

建议输出：

- `R7-web-snapshot-and-article-extraction.md`

### R8: Reconstruction-Aware Chunking Strategy

目标：

- 定义 source reconstruction 之后再 chunk 的策略。

需要覆盖：

- region-level chunking；
- long paragraph merge；
- cross-page paragraph merge；
- repeated header/footer/page-number filtering；
- formula + explanation pairing；
- image/table/caption grouping；
- examples/exercises clustering；
- source-level dedupe 与 knowledge-level dedupe 的衔接。

需要回答：

- chunk 的输入应该是 raw text、SourceRegion，还是二者混合？
- 哪些区域不应该进入知识生成，但仍应保留为 source evidence？
- 不同 source 类型的 chunking 策略是否应该不同？

建议输出：

- `R8-reconstruction-aware-chunking-strategy.md`

### R9: SourceRegion To NoteBlockCandidate Pipeline

目标：

- 定义从 source reconstruction 进入 note assembly 的第一版 pipeline。

需要覆盖：

- SourceRegion 到 NoteBlockCandidate；
- content-role segmentation；
- role-aware dedupe；
- template selection；
- source citation / anchor；
- confidence / warning；
- note assembly proposal；
- canvas/page layout proposal。

需要回答：

- `NoteBlockCandidate` 是否应该是正式表、proposal JSON，还是临时 pipeline object？
- SourceRegion 的 confidence 如何影响 NoteBlockCandidate？
- reconstruction 质量不足时，proposal 应该如何要求人工复核？

建议输出：

- `R9-source-region-to-noteblock-candidate-pipeline.md`

### R10: AFFiNE / BlockSuite Source Reconstruction Bridge

目标：

- 在 PI-046 结论基础上判断 source reconstruction output 如何接入 AFFiNE / BlockSuite 或自研 editor。

需要回答：

- reconstructed source regions 能不能直接成为 AFFiNE blocks？
- 如果直接进入 AFFiNE blocks，Coincides 如何保留 SourceRegion / SourceAnchor / evidence provenance？
- 如果先进入 Coincides NoteBlockCandidate，AFFiNE 只是显示/编辑层，bridge 如何设计？
- 公式、表格、图片裁剪和手写 diagram 如何在 editor 中保持可编辑或可追踪？
- source trust 是否应作为 Coincides sidecar，而不是 editor truth？

建议输出：

- `R10-affine-blocksuite-source-reconstruction-bridge.md`

### R11: Runtime Architecture And Tool Integration

目标：

- 研究 source reconstruction 工具链在工程上如何运行。

需要比较：

- library；
- CLI；
- sidecar worker；
- local service；
- Docker worker；
- GPU worker；
- provider-backed VLM route；
- hybrid deterministic + model route。

需要回答：

- 第一版本地 Windows 开发环境如何跑；
- 哪些工具可以先做 smoke；
- 哪些工具需要 Docker/GPU/外部 provider；
- 如何避免把 OCR/VLM 工具耦合进主 server；
- 如何记录 tool provenance 与失败恢复。

建议输出：

- `R11-runtime-architecture-and-tool-integration.md`

### R12: Benchmark Material Set And Evaluation Plan

目标：

- 设计 Henry 本地材料和公开样本的评估方式。

材料类型：

- handwritten math PDF；
- typed lecture note PDF；
- mixed formula / diagram PDF；
- textbook-like chapter；
- research paper；
- problem set；
- web article；
- saved webpage snapshot；
- DOCX / PPTX / XLSX where available；
- image-only source。

需要回答：

- 每类材料 expected output 是什么；
- 如何评分文字、公式、图像裁剪、阅读顺序、source anchor；
- 如何比较 Notion-like import 质量；
- 哪些样本适合第一版工程 spike。

建议输出：

- `R12-benchmark-material-set-and-evaluation-plan.md`

### R13: Roadmap Impact And First Spike Recommendation

目标：

- 汇总 R0-R12，给出 PI-048 的工程路线建议。

需要回答：

- 第一版 source reconstruction spike 应该选哪条工具链；
- 哪些 schema 需要优先落地；
- 哪些能力必须等 PI-046 editor route 定下来；
- 哪些能力属于 v2.x 可先做，哪些应该进入后续重构；
- 如果选择 AFFiNE / BlockSuite，source reconstruction bridge 的最小可行方案是什么；
- 如果选择自研，SourceRegion / NoteBlockCandidate pipeline 的最小可行方案是什么。

建议输出：

- `R13-roadmap-impact-and-first-spike-recommendation.md`

## 最终汇总文档

完成 R0-R13 后，额外写一份总决策文档：

- `Source-reconstruction-toolchain-and-note-input-decision.md`

这份文档应作为后续 roadmap / plan / implementation 的核心依据，并明确它依赖了哪些 PI-046 结论。

## 执行备注

- PI-048 Research 的执行顺序排在 PI-046 Research 之后。
- 如果 PI-046 尚未完成，PI-048 可以先做工具信息收集，但所有 bridge / architecture 判断必须标记为 provisional。
- 本 Outline 只规划调研，不安装工具，不运行 OCR/VLM 实验，不写工程实现。
