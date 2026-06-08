# Coincides Product Reset And Editor Foundation Decision

## 文档定位

这份文档是 PI-046 调研的最终汇总。

它不替代 R0-R14 的详细报告，而是把它们收束成下一阶段 roadmap / plan / implementation 的决策依据。

覆盖报告：

- R0 - Research Method And Decision Criteria
- R1 - Current Coincides Capability Inventory
- R2 - Product Reset And Four Phase Strategy
- S1 - R0-R2 Summary
- R3 - Coincides Core Object Model
- R4 - Manual Notebook Minimum Usable Experience
- R5 - Page Editor Freeform Block-Box Requirements
- R6 - Page Canvas Modes And Export Boundaries
- S2 - R3-R6 Summary
- R7 - AFFiNE Product Experience Review
- R8 - AFFiNE / BlockSuite Code License Review
- R9 - AFFiNE PageEditor Adaptation Feasibility
- R10 - AFFiNE Edgeless Canvas Adaptation Feasibility
- R11 - Coincides AFFiNE Data Model Bridge
- S3 - R7-R11 Summary
- R12 - Graph Model Before Graph Database
- R13 - Architecture Route Comparison
- R14 - Product Reset AFFiNE Adoption Decision

## 最终结论

Coincides 不应该继续按“下一个小功能”推进。

下一阶段应该从功能施工切换为：

```text
Editor foundation reset
  -> manual notebook product
  -> source reconstruction
  -> AI note assembly
  -> hybrid RAG / graph-native planning
```

最重要的决策：

```text
保留 v2.x semantic substrate。
冻结当前 Course Detail 堆叠式 UI 扩张。
不 full fork AFFiNE。
不优先强改 PageEditor。
不立刻 Neo4j。
第一 spike 做 BlockSuite Edgeless-as-page + Coincides semantic sidecar。
保留 Coincides-owned editor/canvas fallback。
```

## 1. v2.x 不是失败，而是 semantic substrate

v2.x 的用户体验很粗糙，但它建立了非常有价值的底层结构：

- SourceSnapshot / SourceAnchor / SourceScope / SourceBoard；
- NoteBlock / NoteBlockPlacement / NoteBlockSource；
- CanvasNode / CanvasFrame / CanvasEdge；
- ObjectRelation / RelationLayer；
- TemplateDefinition / CompositionTemplate；
- DomainBlockSet / PackageManifest；
- template migration / domain refinement / package import-export；
- proposal-first / operation batch / recovery；
- SQLite + graph-shaped evidence。

这些是下一阶段必须保留的地基。

但当前 UI 形态不应该继续扩张。Course Detail 上继续堆面板，会让产品越来越不像用户能舒服使用的笔记软件。

## 2. 产品目标需要重新排序

下一阶段的正确顺序是：

### 第一层：人能舒服写的笔记软件

先让人类自己能写、改、排版、导出。

最低要求：

- 空白文档可自然输入；
- slash command / quick insert；
- NoteBlock 可选择、移动、resize；
- block 可并排；
- page/canvas mode 清晰；
- formal page 与 outside workspace 清晰；
- export intent 清晰；
- sidebar / project / favorite / search / import 合理；
- 不依赖 AI 也好用。

### 第二层：AI-readable structured note substrate

让 AI 能可靠读取：

- NoteBlock；
- source provenance；
- ObjectRelation；
- Concept；
- Template；
- Domain；
- page/export/AI visibility；
- operation/proposal provenance。

### 第三层：AI 帮用户整理笔记

在前两层稳定后，AI 才能做：

- source reconstruction；
- role segmentation；
- dedupe；
- template selection；
- NoteBlockCandidate；
- note assembly proposal；
- canvas layout proposal。

### 第四层：外部 Agent / API 调度

外部 agent 应先通过 Coincides API / proposal 调度 Coincides，而不是直接乱改底层对象。

## 3. 为什么不 full fork AFFiNE

AFFiNE 的产品体验非常值得借鉴，但 full fork 不适合作为主线。

原因：

- AFFiNE 是完整产品，不只是 editor runtime；
- 维护成本极高；
- Coincides 的 source/proposal/template/domain/relation 会被迫适配 AFFiNE；
- v3.x graph-native 迁移会更复杂；
- 我们真正需要的是成熟 editor/canvas 能力，而不是整套 AFFiNE 产品。

## 4. 为什么不强改 PageEditor

BlockSuite PageEditor 是成熟的线性文档流。

它适合：

- 自然写作；
- block selection；
- rich text；
- slash menu；
- 普通文档编辑。

但 Coincides 要的是：

- freeform block-box；
- A4 formal page；
- outside workspace；
- page/canvas/export intent；
- block resize / parallel block；
- source/relation/provenance；
- AI-readable graph-shaped sidecar。

强改 PageEditor 会破坏它最成熟的部分。

## 5. 第一 spike：BlockSuite Edgeless-as-page + Coincides sidecar

### 目标

验证 BlockSuite Edgeless 是否能作为 Coincides 的 page/canvas surface。

必须验证：

```text
Coincides NoteBlock -> BlockSuite edgeless note
Coincides CanvasFrame -> BlockSuite frame/page object
BlockSuite connector -> Coincides CanvasEdge
Coincides CanvasEdge -> ObjectRelation binding
Coincides export intent / AI visibility / page label -> sidecar metadata
BlockSuite snapshot missing -> rebuild from Coincides records
```

### 成功条件

Spike 成功至少要满足：

- 能创建一个 formal page frame；
- 能在 page 内放 NoteBlock；
- 能在 page 外放 scratch note；
- 能保存和重建 layout；
- 能画 visual connector；
- 能把 connector 绑定成 ObjectRelation；
- 能区分 export / non-export content；
- 能支持基本多页；
- 性能在 50-100 页实验中不明显崩坏；
- sidecar mapping 不混乱。

### 失败条件

如果出现以下情况，应降级或转向 Coincides-owned editor/canvas：

- sidecar orphan / duplicate / conflict 无法稳定恢复；
- page/export boundary 无法稳定控制；
- 大文档性能无法接受；
- BlockSuite runtime 过度限制 Coincides source/relation/provenance；
- 接入成本接近 full fork；
- license/build/runtime 风险不可接受。

## 6. PI-048 的位置

PI-048 是 source reconstruction 调研，不是 editor route 替代品。

它必须在 PI-046 路线基础上工作：

```text
Source type detection
  -> OCR / VLM / layout / formula / table / web extraction
  -> SourceRegion
  -> NoteBlockCandidate
  -> Coincides sidecar
  -> editor/canvas projection
```

如果 BlockSuite spike 成功，PI-048 要研究如何把 SourceRegion / NoteBlockCandidate 投射到 BlockSuite note/frame/image/table/math blocks。

如果 BlockSuite spike 失败，PI-048 要转向 Coincides-owned editor/canvas pipeline。

## 7. 图数据库的位置

R12 已经确认：

```text
Graph-shaped data first.
GraphDB later.
```

现在不应该直接 Neo4j。

v2.x / 下一阶段继续做：

- ObjectRelation；
- Concept layer；
- SourceAnchor / SourceScope；
- Template / Domain / Package membership；
- graph-native migration evidence；
- hybrid RAG 设计。

v3.x 前再做 Neo4j 内部系统调研和迁移设计。

## 8. Roadmap 重写建议

建议把后续路线重写为：

### Phase A - Editor Foundation Spike

- BlockSuite Edgeless-as-page + Coincides sidecar；
- formal page；
- outside workspace；
- multi-page；
- CanvasEdge/ObjectRelation；
- persistence/rebuild；
- benchmark。

### Phase B - Manual Notebook Minimum Product

- 空白文档自然输入；
- block insert / slash command；
- block selection / move / resize；
- layout edit mode；
- page/canvas/export；
- sidebar / favorite / project navigation；
- basic export。

### Phase C - Source Reconstruction Foundation

- PI-048；
- source type detection；
- OCR/VLM/layout/math/web extraction；
- SourceRegion；
- SourceRegion benchmark；
- NoteBlockCandidate。

### Phase D - AI Note Assembly

- role segmentation；
- template selection engine；
- source-level dedupe；
- knowledge-level dedupe；
- concept assignment；
- proposal-first note assembly；
- canvas layout proposal。

### Phase E - Retrieval / Graph-shaped Data

- embedding；
- concept；
- role/template filters；
- relation traversal；
- source provenance；
- local graph view；
- hybrid RAG。

### Phase F - v3.x Graph-native Planning

- Neo4j / graph DB feasibility；
- SQL + GraphDB hybrid；
- graph-native schema；
- migration/recovery plan。

## 9. 下一步可执行清单

建议下一步做：

1. 把 PI-046 结论写入 product improvement register / roadmap / continuity。
2. 对 BlockSuite Edgeless-as-page spike 写单独 plan。
3. 定义 sidecar 最小 schema。
4. 设计 spike 的验收材料：
   - 1 页；
   - 10 页；
   - 50 页；
   - 100 页；
   - 多 connector；
   - outside scratch；
   - export boundary。
5. 确认是否在当前 repo 做 spike，还是新建实验 repo。
6. 在 PI-048 正式调研前，确保它引用 PI-046 的路线判断。

## 最终建议

Coincides 的路线不是推倒重来，也不是继续硬堆。

最稳的下一步是：

```text
把 v2.x 当作 semantic substrate。
把当前 UI 当作工程原型。
用 BlockSuite Edgeless-as-page 做 editor foundation spike。
用 Coincides sidecar 保住 source/relation/template/domain/proposal truth。
再决定是否新开 repo、正式采用 BlockSuite，或回到自研。
```

这条路线最大限度保留过去的工作，也最大限度减少继续做成“不伦不类产品”的风险。
