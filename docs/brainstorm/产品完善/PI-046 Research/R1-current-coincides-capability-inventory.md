# R1 - Coincides 当前能力盘点

## 本阶段问题

R1 要回答的是：当前 Coincides v2.x 到底已经做出了什么，以及这些成果在后续路线判断中应该被如何对待。

这份报告不评价“理想中的 Coincides”，只评价当前代码、release/review 文档和测试中已经存在的能力。它的作用是给后续 R2-R14 建立基准：我们不是从空白开始，也不应该把当前粗糙的 UI 当成最终产品形态。

## 证据来源与证据等级

- 代码证据：`server/src/routes`、`server/src/services`、`server/src/db/migrations`、`client/src/pages/Courses`、`client/src/pages/Templates`。
- 测试证据：`server/src/__tests__/v2MaterialLibrary.test.ts`、`v2TemplateMigration.test.ts`、`v2PackagePortability.test.ts`、`v2DomainPackages.test.ts`、`v2DomainRefinement.test.ts`。
- 文档证据：`docs/releases/v2.3.x-*`、`docs/releases/v2.4.x-*`、`docs/releases/v2.5.x-*`。
- 代码索引证据：当前 Coincides CodeGraph 显示 `server/src` 124 个文件，`client/src` 73 个文件；v2.x migration 已从 `015_v2_note_foundation.ts` 连续推进到 `030_v2_domain_refinement_proposals.ts`。

证据等级按 R0 定义：

- A 级：当前代码 / migration / 测试直接证明。
- B 级：release/review 文档直接记录。
- C 级：从 UI 文件和交互结构推断。
- D 级：产品体验观察或历史讨论。
- E 级：仅作为后续待证假设。

## 总体结论

Coincides v2.x 已经不再是一个简单的 toy app。它已经有一套相当厚的 source、proposal、template、domain、package、canvas projection 和 migration governance 地基。

但它还不是成熟的笔记软件。当前用户侧体验仍然更像“把很多工程面板堆在 Course Detail 和 Template Studio 里”，而不是像 Notion / AFFiNE 那样自然输入、选择、排版、编辑和导出的一体化文档工作台。

因此 R1 的核心判断是：

- **应保留**：source provenance、proposal-first、operation/recovery、TemplateDefinition runtime、DomainBlockSet / PackageManifest、CanvasNode/ObjectRelation 的 truth/projection 分离。
- **应谨慎冻结**：继续在当前 Course Detail 面板里堆更多 product feature。
- **应重新调研**：page editor、manual note UX、freeform block-box、AFFiNE / BlockSuite bridge、SourceRegion-grade reconstruction、NoteBlock/Concept/GraphRAG。
- **不应误判**：当前 Canvas 能力是 projection/editor seed，不是成熟 canvas document editor；当前 RAG 是 document/chunk embedding，不是 note-aware graph retrieval。

## 1. Release / Review 状态

v2.3-v2.5 的 release 文档显示了一个稳定趋势：

- 工程质量多为 `PASS` 或 `PASS_WITH_FOLLOWUP`。
- 主观体验和重型 UX acceptance 多次 deferred。
- v2.3 Source Snapshot / Anchor / Scope / Board 解决 source trust 和 jump-back，但文档反复记录视觉验收延后。
- v2.4 Canvas 系列完成 canvas data contract、viewer/editor、block insertion、layout proposal、edges/relation seed，但 review 明确它仍是基础交互而不是成熟 AFFiNE-like canvas。
- v2.5 Template / Composition / Domain / Package / Migration 系列完成 runtime 和 governance 地基，但不是最终 Template Studio / Package Studio / developer-tool ecosystem。

R1 判断：

- release/review 系统本身是可保留工程资产。
- `PASS_WITH_FOLLOWUP` 的密度说明 v2.x 更像工程实验版本，而不是面向普通用户的 release train。
- 后续 roadmap 需要把“工程可靠”和“用户可用”拆成不同阶段，不应把测试通过等同于产品体验成立。

## 2. Source / Snapshot / Anchor / Scope / Board

### 当前能力

Source 相关能力是 v2.x 最有保留价值的一部分：

- `source_snapshots` / `source_snapshot_pages` 提供 text-first、page-like source view。
- `source_anchors` / `source_anchor_links` 把 NoteBlock source 和 EvidenceItem 连接回 source snapshot page。
- `source_scopes` 支持 `page`、`page_range`、`anchor`、`source_material`、`material_segment`。
- `source_boards` 和 `source_board_nodes` 支持课程级 source ranges / anchors / materials / evidence / notes / proposals 的持久化组织。
- generation 和 seed 行为普遍强调 idempotent、warnings 而不是 crash。

代码证据：

- `server/src/services/sourceAnchors.ts` 从 `note_block_sources` 和 `evidence_items` 生成 anchor，并在缺失 snapshot 时返回 warning。
- `server/src/services/sourceScopes.ts` 创建 scope 时不改写 source snapshot、anchor、material 或 note。
- `server/src/services/sourceBoards.ts` 创建和 seed board node，保留 reversible archive。
- `server/src/__tests__/v2MaterialLibrary.test.ts` 覆盖 source snapshot、anchor、scope、board 的 migration、generation、scoping 和 idempotency。

### 当前限制

Source layer 目前仍是 page/text/chunk 层，不是 SourceRegion 层：

- 没有 bbox。
- 没有 crop image。
- 没有公式区域、图表区域、手写区域的 canonical region schema。
- 没有 page label mapping，例如内部 page index 和用户看到的罗马数字页码 / 正文页码之间的关系。
- Source Snapshot UI 仍堆在 Course Detail 内部，体验上不是成熟 source inspection workspace。

R1 判断：

- **可保留地基**：SourceAnchor、SourceScope、SourceBoard 的 identity 和 provenance 设计。
- **需要升级**：PI-048 的 SourceRegion 应作为 SourceSnapshot 之前或之上的 reconstruction input layer。
- **不应继续重押当前 UI**：Source Snapshot / Scope / Board 当前面板是工程入口，不是最终 source UX。

## 3. Note / NoteBlock

### 当前能力

v2.0-v2.1 已经把 NoteBlock 作为内容对象建立起来：

- `note_blocks` 存 `block_type`、`content_json`、`plain_text`、metadata、operation batch。
- `note_block_placements` 把 block 放进 note。
- `note_block_sources` 支持 source reference。
- 旧 v2.1.1 静态 taxonomy 有 `text`、`latex`、`code`、`source_quote`、`task`、`media`、`table` 这些 system type，以及 `definition`、`theorem`、`proof`、`formula`、`example`、`exercise` 等 learning role。
- v2.5.0 后，新 block 可以写入 runtime template metadata。

代码证据：

- `server/src/lib/noteBlockTemplates.ts` 保留 v2.1.1 静态模板作为兼容地基。
- `server/src/services/learningCanvases.ts` 的 `createCanvasNoteBlock` 会创建真实 NoteBlock、placement，再创建 CanvasNode 投影。
- `server/src/services/templateDefinitions.ts` 的 resolver 支持 runtime template 和 legacy fallback。

### 当前限制

NoteBlock 还没有达到“用户自然写笔记”的程度：

- 空白 note 的输入体验仍不是成熟 page editor。
- NoteBlock 视觉上仍偏工程卡片，不像自然文档 block。
- block box resize、并排排版、collision-aware insertion、slash command、rich text toolbar、inline media 等体验尚未系统成立。
- 用户手写/人工新增 block 与 source 连接的流程还没有成熟。
- NoteBlock 没有 concept dimension。
- NoteBlock 没有独立 embedding index。
- NoteBlock 与 relation / domain / role 的使用还没有形成稳定检索体系。

R1 判断：

- **可保留地基**：NoteBlock 作为语义内容对象。
- **需要重建体验**：NoteBlock 对用户不应表现为数据库卡片，而应表现为文档中的自然 block。
- **后续关键问题**：如果 AFFiNE / BlockSuite 被采用，必须判断它的 block 能否承载 Coincides NoteBlock identity、metadata、source provenance 和 proposal history。

## 4. Canvas / CanvasNode / CanvasFrame / CanvasEdge

### 当前能力

v2.4 已经建立了 canvas projection 层：

- `learning_canvases` 支持 finite / infinite、page size、orientation、width/height、background。
- `canvas_nodes` 支持 NoteBlock、SourceScope、SourceAnchor、SourceBoardNode、SourceMaterial、MaterialSegment、EvidenceSet、Proposal 等对象投影。
- `canvas_frames` 支持 layout proposal 生成分组 frame。
- `canvas_viewport_states` 保存视口状态。
- `canvas_edges` 支持 source/target node、port、loose target、style、connection state。
- `LearningCanvasSurface.tsx` 支持 pan、zoom、move、resize、connect、add block、plan layout。

代码证据：

- `client/src/pages/Courses/LearningCanvasSurface.tsx` 定义 `CanvasNodeSummary`、`CanvasEdgeSummary`、`RelationLayerSummary`，并暴露 Add block / Connect / Plan layout 入口。
- `server/src/services/learningCanvases.ts` 的 `createCanvasNoteBlock` 证明 canvas-created content 仍落回 NoteBlock truth。
- `server/src/services/canvasLayoutProposals.ts` 的 `createCanvasLayoutProposal` 只生成 layout proposal，不改写内容 truth。

### 当前限制

Canvas 仍是工程 seed，不是成熟 canvas-first document：

- 它仍嵌在 Course Detail 的 panel 里，而不是主工作台。
- 节点视觉样式粗糙，无法自然呈现长文档。
- 没有成熟 page mode / open canvas / multi-page grid / seamless stack。
- 没有正式导出边界。
- 没有高性能大文档虚拟化。
- 没有成熟 block insert collision logic。
- 当前 edge 视觉线在跨页、多页、大量节点时会变乱。

R1 判断：

- **可保留地基**：CanvasNode = projection，NoteBlock/source/evidence/proposal = truth。
- **应继续研究**：Page editor 是否应该由 AFFiNE / BlockSuite 承担。
- **应冻结冲动**：在当前 canvas surface 上继续堆视觉工具会迅速变成低效自研画布工程。

## 5. CanvasEdge / ObjectRelation / RelationLayer

### 当前能力

v2.4.4 已经把视觉边和语义边分开：

- `CanvasEdge` 是画布交互对象。
- `ObjectRelation` 是系统可读语义关系。
- `RelationLayer` 是关系显示与用途组织层。
- incomplete edge 不能 bind semantic relation。
- bind relation 后才创建或更新 `object_relations`，并把 edge 标成 `relation_backed`。

代码证据：

- `server/src/services/learningCanvases.ts` 的 `bindCanvasEdgeRelation` 会拒绝 incomplete edge，解析 source/target CanvasNode 背后的真实对象，再写入 `object_relations`。
- `server/src/__tests__/v2MaterialLibrary.test.ts` 覆盖 relation migration、edge column upgrade、object relation 和 relation layer 表。

### 当前限制

当前 relation 仍是 seed：

- relation type 还是固定小集合。
- 没有 concept layer。
- 没有 group relation / condition relation / multi-source relation 的完整模型。
- 没有局部知识图谱视图。
- relation visualization 仍停留在线条和 layer visibility，不足以支撑大文档知识网络。

R1 判断：

- **可保留地基**：CanvasEdge 与 ObjectRelation 分离是正确方向。
- **需要升级**：后续应把 relation 作为可检索、可筛选、可局部展开的数据，而不是默认画满所有线。
- **Graph-native evidence**：ObjectRelation 是未来 graph edge candidate；CanvasEdge 多数只是 projection，不应直接迁移为知识边。

## 6. TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest

### 当前能力

v2.5 的 runtime 地基很强：

- `template_definitions` 让 v2.1.1 静态模板变成可持久化 runtime contract。
- `composition_templates` 让多个 template blocks 组成可复用 section。
- `domain_block_sets` 和 `package_manifests` 把模板和 composition 组织成领域包。
- `package_exports` / `package_import_previews` / `package_import_records` 提供 `.coincides` JSON bundle 的导出导入地基。
- `template_migration_*` 和 `domain_refinement_*` 提供 proposal-first 的结构迁移治理。

代码证据：

- `server/src/services/templateDefinitions.ts` 的 `seedSystemTemplateDefinitions` 从旧 registry seed user-scoped system templates。
- `server/src/services/domainPackages.ts` 管理 package/domain seed、preview 和 compatibility。
- `server/src/services/packagePortability.ts` 管理 export/import preview、conflict 和 records。
- `server/src/services/templateMigrationProposals.ts` 与 `domainRefinementProposals.ts` 管理 migration proposal、records 和 recovery evidence。
- `client/src/pages/Templates/TemplateStudio.tsx` 是当前 Template Studio / Package Studio Lite / Domain Refinement 的主要 UI。

### 当前限制

这套能力目前更像“开发者/系统治理界面”，还不是普通用户会自然使用的编辑器：

- 没有独立成熟的 Studio / plugin-like template editor。
- 没有视觉样式编辑器。
- 没有 role definition editor。
- 没有 template selection engine。
- 没有 AI-facing skill/manual 的完整可执行规范。
- Domain/Package 分类很有价值，但尚未接入真实 note generation pipeline。

R1 判断：

- **可保留地基**：TemplateDefinition、CompositionTemplate、DomainBlockSet、PackageManifest。
- **应迁移经验**：preview-first、conflict-first、recovery-first 的治理方式。
- **需要后续产品化**：开发者工具需要从 Template Studio 的工程面板升级成清晰的 Studio / package / style / role / behavior toolchain。

## 7. Proposal / OperationBatch / Recovery

### 当前能力

Coincides 当前最成熟的工程思想之一是 proposal-first：

- material map、organized note、material reconciliation、canvas layout、composition template、template migration、domain refinement 都走 proposal / apply / discard。
- 高风险修改通过 dry-run、diff、impact report、warning、blocker 和 recovery record 处理。
- apply 多数创建 `operation_batches`。
- discard 只改变 proposal 状态。

代码证据：

- `server/src/routes/proposals.ts` 统一处理多类 proposal route。
- `server/src/services/canvasLayoutProposals.ts` 明确 layout proposal 的 `apply_behavior` 是 `layout_records_only`。
- template/domain/package 测试反复验证 preview 不 mutate、apply 有 records、blocked apply 无 partial writes。

R1 判断：

- **可保留地基**：proposal-first 是 Coincides 和普通笔记软件不同的核心工程能力。
- **后续要求**：外部 Agent/API 不应绕过 proposal 直接修改核心对象。
- **Graph-native evidence**：Proposal / OperationBatch 多数是 operation/provenance node candidate，而不是知识 truth 本身。

## 8. Document Parsing / Embedding / RAG

### 当前能力

当前 document pipeline 已经有基本可用能力：

- PDF native parse 使用 `pdf-parse`。
- 如果 PDF native text 不足，会 fallback 到 Anthropic vision OCR。
- DOCX 使用 `mammoth`。
- XLSX 使用 `xlsx` 转 CSV-like text。
- 图片文件使用 Anthropic vision 提取文本和图示描述。
- TXT/MD 原生读取。
- `chunkText` 对长文档做 page-aware 或 paragraph-based chunking。
- `generateSummary` 用 AI 生成 summary 和 document type。
- `generateChunkEmbeddings` 使用 embedding provider，把 document chunks 或 unchunked full text 写入 sqlite-vec。
- `VectorStore` 支持 document chunk 和 agent memory 的 embedding search。

代码证据：

- `server/src/services/documentParser.ts` 的 `parseDocument` 覆盖 PDF/DOCX/XLSX/image/TXT/MD。
- `chunkText` 对 50 页以内 PDF 不 chunk；长文档按 page break 或 paragraph chunk。
- `generateChunkEmbeddings` 没有 chunk 时用 document id 作为 virtual chunk id。
- `server/src/embedding/vectorStore.ts` 用 `doc_chunk_vec` 和 `agent_memory_vec` 做 KNN。

### 当前限制

当前 RAG 不能支撑用户设想中的 serious note generation：

- 没有 source type detection contract。
- 没有 SourceRegion。
- 没有 layout extraction、formula recognition、table recognition、handwriting region、image crop。
- 没有 content role segmentation。
- 没有 source-level dedupe / knowledge-level dedupe 的分层 pipeline。
- 没有 NoteBlock embedding。
- 没有 Concept layer。
- 没有 GraphRAG。
- 没有 role-aware template selection engine。
- 没有针对 textbook / lecture note / paper / problem set / web article / handwritten STEM 的不同 route。

R1 判断：

- **可保留地基**：documents、document_chunks、embedding provider、VectorStore。
- **需要重建 pipeline**：PI-048 应先做 source reconstruction，再进入 NoteBlockCandidate / proposal。
- **风险**：继续依靠“最强 VLM 硬扫全文”会掩盖 layout、formula、crop、role segmentation 的结构缺失。

## 9. Frontend / 用户体验成熟度

当前 frontend 有三个重要入口：

- `CourseDetail.tsx`：课程材料、source snapshot、scope、board、canvas、proposal 入口集中在一个页面。
- `LearningCanvasSurface.tsx`：Canvas viewer/editor seed。
- `TemplateStudio.tsx`：Template / Domain / Package / Migration 的工程面板。

R1 判断：

- 当前 UI 能证明功能“有入口”，但不能证明体验成熟。
- Course Detail 面板承载了太多对象，已不适合作为最终 product shell。
- Template Studio 是治理地基，不是最后的用户友好 Studio。
- Canvas 需要成为主工作台，而不是长页面里的一个面板。
- 后续应系统调研 Notion/AFFiNE 的按钮、右键菜单、hover 信息、toolbar、sidebar、favorite、folder/project、page/canvas 切换等产品结构。

## 10. 自动测试与工程纪律

v2.x 测试面覆盖较广：

- `v2MaterialLibrary.test.ts` 覆盖 source snapshot/anchor/scope/board、canvas、relation、template runtime 等主线。
- `v2TemplateMigration.test.ts` 覆盖 template migration proposal。
- `v2PackagePortability.test.ts` 覆盖 package export/import preview/apply。
- `v2DomainPackages.test.ts` 覆盖 package/domain seed/preview/compatibility。
- `v2DomainRefinement.test.ts` 覆盖 domain refinement mapping/classification/migration。

R1 判断：

- **可保留地基**：v2 test strategy。
- **后续要求**：如果引入 AFFiNE / BlockSuite，必须保持 Coincides semantic layer 的测试，不应让 editor dependency 冲掉 proposal/recovery/source tests。

## 能力分类表

| 分类 | 当前对象 / 能力 | R1 判断 |
| --- | --- | --- |
| 可保留地基 | SourceAnchor / SourceScope / SourceBoard | 保留为 source provenance 和 source selection 的核心地基 |
| 可保留地基 | NoteBlock identity / metadata / placement | 保留为 Coincides 内容对象，但重做用户表现 |
| 可保留地基 | CanvasNode projection | 保留 truth/projection 分离 |
| 可保留地基 | CanvasEdge / ObjectRelation 分离 | 保留为未来 graph edge 的经验 |
| 可保留地基 | TemplateDefinition runtime | 保留为 template selection 和 developer tooling 地基 |
| 可保留地基 | CompositionTemplate / DomainBlockSet / PackageManifest | 保留为 capability/package 层地基 |
| 可保留地基 | Proposal / OperationBatch / Recovery | 保留为安全修改和 Agent 调度边界 |
| 可保留地基 | documents / chunks / VectorStore | 保留为 RAG 初始地基 |
| 实验性施工痕迹 | Course Detail 超长复合页面 | 后续应重构为更自然的 product shell |
| 实验性施工痕迹 | LearningCanvasSurface 当前视觉 | 证明交互方向，不等于成熟 editor |
| 实验性施工痕迹 | Source Snapshot / Scope / Board UI | 保留数据层，重做信息架构 |
| 实验性施工痕迹 | Template Studio 当前面板 | 保留能力，重做 developer/user studio |
| 实验性施工痕迹 | documentParser 当前 chunking | 可用但不足以支撑 PI-048 serious reconstruction |
| 应冻结能力 | 继续扩展 Calendar / Goal / study planning | 在产品主线重置前不应继续加重 |
| 应冻结能力 | 当前 Course Detail 内继续堆 source/canvas/template UI | 会进一步恶化体验 |
| 应冻结能力 | 未调研前继续自研 rich editor/canvas paint tools | 风险高，可能重复 AFFiNE/BlockSuite 成熟工作 |
| 应迁移经验 | migration numbering / additive schema | 后续重构仍应保持 |
| 应迁移经验 | v2 test discipline | 重构或 fork 后继续保留 |
| 应迁移经验 | graph-native evidence review | 作为 v3.x/graph 路线材料 |

## R1 解决的问题

R1 解决了三个关键问题：

1. Coincides 不是从零开始；它已有很强的 semantic/source/proposal/runtime 地基。
2. Coincides 也不是成熟笔记软件；当前最短板是用户可用的 page editor / canvas document / source reconstruction / note assembly。
3. 后续调研 AFFiNE / BlockSuite 时，问题不应该是“它能不能替代 Coincides”，而是“它能不能承载更成熟的人类编辑体验，同时让 Coincides 保留 source/proposal/template/domain/relation truth”。

## 暴露的风险

1. **产品壳过重风险**
   Course Detail 和 Template Studio 已经承载太多工程面板。如果继续堆功能，会越来越不像笔记软件。

2. **自研 editor 成本风险**
   如果继续自研 page editor、rich text、block resize、multi-page canvas、toolbar、style editor，工程成本可能远超 v2.x 当前收益。

3. **解析 pipeline 风险**
   当前 parser 有 OCR fallback，但没有 SourceRegion、bbox、crop、role segmentation。它能“得到文本”，但不能稳定“重建材料结构”。

4. **RAG 粒度风险**
   当前 RAG 以 document/chunk 为单位。用户想要的是 NoteBlock / Concept / Relation / SourceRegion 多维检索。

5. **graph 过早落库风险**
   当前 ObjectRelation 是 edge candidate，但 concept、role、relation condition、group relation 尚未成熟。现在直接切 Neo4j 仍会太早。

## 对后续 R2-R14 的依赖关系

- R2 必须引用 R1，重新定义产品目标时要承认当前地基与 UX 缺口并存。
- R3 必须引用 R1 的对象清单，判断哪些对象是 canonical truth。
- R4-R6 必须引用 R1 的 UX 缺口，定义人工笔记、freeform block-box、page/canvas/export。
- R7-R8 必须引用 R1，把 AFFiNE / BlockSuite 与 Coincides 当前能力做差异对比。
- R9-R11 必须引用 R1，判断 adoption route 对 source/proposal/template/domain/relation 的影响。
- R12 必须引用 R1 的 RAG/embedding/graph 缺口，设计 AI-readable structure 和 graph-shaped retrieval。
- R13 必须引用 R1 的能力分类表，进行路线评分。
- R14 必须引用 R1 作为最终 roadmap rewrite 的现状基线。

## 反补前序报告

R1 不需要反补 R0。R0 的报告结构、证据等级和评分标准仍然适用。

但 R1 留下一个未来反补条件：

- 如果 R7-R11 发现 AFFiNE / BlockSuite 能直接承载或不能承载某些 Coincides canonical object，R1 应追加 addendum，更新“可保留地基”和“应冻结能力”的分类。

## Roadmap 影响

R1 对 roadmap 的影响是：

1. v2.x 后续不应继续以“更多底层功能”为唯一目标。
2. 下一阶段必须把“成熟人工笔记体验”前置。
3. Source / Proposal / Template / Domain / Package / Relation 这些地基应保留，但需要重新接入更自然的 editor shell。
4. AFFiNE / BlockSuite 调研必须以 Coincides 当前对象模型为对照，而不是只看它们外观像不像。
5. PI-048 Source Reconstruction 调研必须建立在 R1 的 parser/RAG 现状上：当前 parser 是起点，不是终点。

## R1 结论

Coincides 当前最有价值的不是它的 UI，而是它已经形成的一套“source-grounded, proposal-first, template/domain-aware, projection-separated”的工程思想和数据地基。

下一步调研的核心不是简单选择“自研还是 fork AFFiNE”，而是判断：

- 哪个 editor/canvas route 能让用户自然写笔记；
- Coincides 的 source/proposal/template/domain/relation truth 如何接到这个 route 上；
- 哪些 v2.x 工程成果要迁移、保留、冻结或放弃。
