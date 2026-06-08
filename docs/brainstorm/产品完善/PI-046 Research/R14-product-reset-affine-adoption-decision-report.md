# R14 - 最终决策与 Roadmap 重写建议

## 本阶段目标

R14 是 PI-046 的最终决策报告。

它汇总 R0-R13 与 S1-S3，回答：

```text
Coincides 下一阶段到底应该怎么走？
当前 v2.x 要不要放弃？
AFFiNE / BlockSuite 要不要采用？
图数据库要不要现在上？
下一步 roadmap 应该如何重写？
```

## 总决策

R14 的总决策是：

```text
不放弃 Coincides v2.x 的语义地基。
冻结当前 Course Detail 堆叠式 UI 扩张。
不 full fork AFFiNE。
不优先强改 PageEditor。
不立刻 Neo4j / GraphDB migration。

下一阶段第一行动：
  BlockSuite Edgeless-as-page + Coincides semantic sidecar spike。

保留 fallback：
  Coincides-owned editor/canvas。
```

换句话说：
**v2.x 不是白做了，但 v2.x 当前 UI 不应该继续被当作产品主线扩张。**

## 1. 是否放弃当前 Coincides 主线？

答案：

```text
不完全放弃，但要拆开处理。
```

### 应该保留的部分

这些是 v2.x 最有价值的成果，应该作为下一阶段 semantic substrate：

- SourceSnapshot / SourceAnchor / SourceScope / SourceBoard；
- NoteBlock / NoteBlockPlacement / NoteBlockSource；
- CanvasNode / CanvasFrame / CanvasEdge；
- ObjectRelation / RelationLayer；
- TemplateDefinition；
- CompositionTemplate；
- DomainBlockSet / PackageManifest；
- TemplateMigrationProposal；
- DomainRefinementProposal；
- Package import/export；
- Proposal-first / OperationBatch / Recovery；
- SQLite + graph-shaped relation tables；
- graph-native migration evidence 记录习惯。

这些东西虽然用户看起来“不好用”，但它们是未来 source-grounded、AI-readable、graph-ready 笔记系统的地基。

### 应该冻结的部分

这些不应该继续扩张：

- 当前 Course Detail 上的堆叠式面板；
- source snapshot / selected scope / source board / canvas 都堆在同一列的 UI；
- 当前粗糙 Canvas surface；
- 表单式 Add Block 作为主要创建入口；
- 继续把新功能塞进已有页面而不重做 editor foundation；
- Calendar / Goal / Study planning 继续扩张。

这些可以暂时保留为工程入口，但不应成为下一阶段产品主线。

### 应该重写或重做的部分

- 主笔记编辑体验；
- 空白页输入体验；
- block selection / resize / drag / layout edit mode；
- page/canvas/export surface；
- sidebar / favorite / project navigation；
- Course -> Project 命名和组织结构；
- Agent 对话式创建笔记；
- source reconstruction -> NoteBlock generation pipeline。

## 2. 是否新开 repo？

答案：

```text
暂时不立即新开。
```

新 repo 是合理候选，但现在还缺一个关键证据：

```text
BlockSuite Edgeless-as-page + Coincides sidecar spike 是否可行？
```

如果 spike 成功，可以选择：

- 在现有 repo 内重构；
- 新开 repo，把 v2.x semantic substrate 迁移过去；
- 做一个更干净的 editor foundation package。

如果 spike 失败，再决定是否走 Coincides-owned editor/canvas 新 repo。

因此 R14 建议：

```text
先 spike，再决定是否重开。
不要用重开 repo 代替路线验证。
```

## 3. 是否 fork / copy / depend on AFFiNE or BlockSuite？

### AFFiNE full fork

不推荐。

原因：

- AFFiNE 是完整产品，不只是 editor；
- full fork 维护成本高；
- Coincides 的 source/proposal/template/domain/relation 会被迫适配 AFFiNE；
- v3.x graph-native 迁移会变复杂；
- 我们真正需要的是 editor/canvas runtime 和产品体验参考，不是整个 AFFiNE 产品。

### PageEditor direct modification

不推荐优先。

原因：

- PageEditor 是线性文档流；
- Coincides 想要的是 page-first freeform block-box；
- 强改会破坏 PageEditor 最成熟的写作体验；
- R9 已经把这个路线降级。

### BlockSuite Edgeless-as-page

推荐进入第一 spike。

原因：

- Edgeless 有 infinite canvas、surface、frame、note、connector、viewport、`xywh`；
- 更接近 Coincides 的 formal page + outside workspace；
- 可以通过 sidecar 保留 Coincides semantic truth；
- 不必整搬 AFFiNE；
- 与 PI-048 source reconstruction 兼容。

### Coincides-owned editor/canvas

保留 fallback。

原因：

- 最符合 Coincides 长期语义结构；
- 但短期工程量太高；
- 只有当 BlockSuite spike 失败时，才应该成为主线。

## 4. 下一阶段第一 spike

R14 推荐下一阶段第一个工程验证不是大版本功能，而是一个小型 spike：

```text
BlockSuite Edgeless-as-page + Coincides semantic sidecar spike
```

### Spike 目标

验证：

1. 一个 Coincides NoteBlock 能投射成 BlockSuite edgeless note。
2. 一个 Coincides CanvasFrame / page frame 能投射成 BlockSuite frame。
3. 一个 BlockSuite connector 能映射成 Coincides CanvasEdge。
4. CanvasEdge 能 bind 成 Coincides ObjectRelation。
5. Coincides export intent / AI visibility / page label 不依赖 BlockSuite displayMode。
6. 删除或忽略 BlockSuite runtime snapshot 后，可以从 Coincides records 重建 surface。
7. 50-100 页、多 block、多 connector 交互不明显崩坏。

### Spike 不做

- 不重写所有 UI；
- 不做完整 Notion/AFFiNE clone；
- 不做 PI-048 OCR/VLM pipeline；
- 不做 Neo4j；
- 不做 marketplace；
- 不做 full package export/import；
- 不做外部 Agent 操作协议。

## 5. Roadmap 重写建议

当前 roadmap 应该从“继续堆版本功能”改成“产品地基重置”。

建议下一阶段顺序：

### Phase A: Editor Foundation Spike

目标：

- 验证 BlockSuite Edgeless-as-page + Coincides sidecar；
- 验证 formal page、outside workspace、multi-page、seamless page stack；
- 验证 basic NoteBlock projection；
- 验证 CanvasEdge -> ObjectRelation；
- 验证 persistence/rebuild。

输出：

- spike report；
- adoption decision；
- 是否新开 repo 的决定。

### Phase B: Manual Notebook Minimum Product

目标：

- 空白笔记自然输入；
- slash command；
- block type/template selection；
- block resize / drag / layout edit mode；
- page/canvas modes；
- sidebar/favorite/project navigation；
- PDF/HTML basic export boundary。

这阶段不依赖 AI。
它要先让人类自己写笔记舒服。

### Phase C: Source Reconstruction Foundation

对应 PI-048。

目标：

- source type detection；
- OCR/VLM/layout/math/table/web extraction toolchain；
- SourceRegion schema；
- SourceRegion -> NoteBlockCandidate；
- source provenance / crop / bbox / page label；
- typed PDF / scanned handwriting PDF / web article / mixed source benchmark。

这阶段解决“材料怎么变成可用候选块”。

### Phase D: AI Note Assembly

目标：

- Content role segmentation；
- source-level dedupe；
- knowledge-level dedupe；
- template selection engine；
- concept assignment；
- NoteBlockCandidate -> proposal；
- proposal -> page/canvas layout；
- example/proof/formula/source quote 折叠和组织；
- AI 生成的 NoteBlock 默认带 source grounding。

这阶段才是真正的“AI 帮我整理笔记”。

### Phase E: Retrieval / Graph-shaped Data / Agent Access

目标：

- NoteBlock embedding；
- Concept layer；
- ObjectRelation traversal；
- source provenance filtering；
- Hybrid RAG；
- local graph view；
- external agent 只通过 Coincides API / proposal 操作，不直接乱改底层对象。

### Phase F: v3.x Graph-native Planning

目标：

- 汇总 v2.x graph-native migration evidence；
- 决定 Neo4j / graph database 是否成为主数据库；
- 设计 NoteBlock / Concept / ObjectRelation / Source / Template / Domain / Proposal provenance 的 graph-native schema；
- 设计 SQLite + GraphDB hybrid 或 GraphDB primary 的迁移路径。

## 6. PI-048 与 PI-046 的关系

PI-048 不能脱离 PI-046。

PI-046 决定 editor / data architecture route。
PI-048 决定 source reconstruction toolchain。

所以 PI-048 的输出应进入：

```text
SourceRegion
  -> NoteBlockCandidate
  -> Coincides sidecar
  -> BlockSuite / Coincides canvas projection
```

而不是直接进入：

```text
OCR output -> AFFiNE block tree
```

如果 PI-046 spike 最终选择 BlockSuite：

```text
PI-048 重点研究 reconstruction output 如何桥接到 BlockSuite note/frame/image/table/math blocks，
但 source provenance 仍保留在 Coincides sidecar。
```

如果 PI-046 spike 最终选择自研：

```text
PI-048 重点研究 SourceRegion -> NoteBlockCandidate -> Coincides-owned editor/canvas pipeline。
```

## 7. v3.x / Neo4j 决策

R14 不建议现在进入 Neo4j。

原因：

- editor foundation 尚未定；
- Concept layer 尚未实现；
- ObjectRelation 底层维度尚未工程化；
- source reconstruction 尚未形成 SourceRegion；
- AI note assembly 尚未真正跑通；
- 现在迁移会把不稳定的数据模型固化。

但 R14 明确要求：

```text
继续把 v2.x 开发结果记录成 graph-native migration evidence。
```

v3.x 前必须做一次详细内部调研：

- 哪些对象成为 graph node；
- 哪些关系成为 graph edge；
- 哪些 projection 留在 SQL/cache；
- 哪些 operation/provenance 进入 graph；
- 哪些仍留 SQL；
- Neo4j 是否主数据库；
- 是否保留 SQLite + GraphDB hybrid。

## 8. 应保留、冻结、重写、推后的清单

### 保留

- Source layer；
- NoteBlock identity；
- Proposal-first；
- Template / Composition / Domain / Package runtime；
- ObjectRelation / RelationLayer；
- Package import/export evidence；
- Migration/refinement recovery records；
- v2.x continuity / review / engineering spec 纪律；
- PI-046 / PI-048 research artifacts。

### 冻结

- 当前 Course Detail 堆叠 UI；
- 当前 Canvas 面板继续加功能；
- Calendar / Goal / study planner 扩张；
- release note 面向用户发布；
- full feature polish before editor foundation。

### 重写

- 主编辑器；
- 画布与页面系统；
- project navigation；
- NoteBlock visual presentation；
- block insertion / slash command / selection / resize / drag；
- export boundary UI；
- Agent 对话式 note creation workflow。

### 推后

- Neo4j migration；
- full marketplace；
- full package studio；
- external agent direct edit protocol；
- self-growing knowledge-base workflow；
- full AI tutor；
- full source reconstruction implementation，直到 PI-048 完成。

## 9. Open Questions

后续必须继续回答：

1. BlockSuite Edgeless 是否能在 Windows/Vite/本地 app 中稳定接入？
2. Edgeless note 的长文本编辑体验是否足够自然？
3. Page frame / export boundary 能否稳定实现？
4. 100 页、多 block、多 connector 性能如何？
5. Sidecar mapping 的 orphan / duplicate / conflict 如何恢复？
6. 是否需要新 repo？
7. 是否把当前 v2.x 作为 semantic backend，把新 editor 作为 frontend package？
8. PI-048 的 source reconstruction benchmark 何时开始？
9. Project / Course 命名何时改？
10. Concept layer 是在 manual notebook phase 后做，还是 AI note assembly phase 前做？

## 10. R14 对最终汇总文档的要求

最终汇总文档 `Coincides-product-reset-and-editor-foundation-decision.md` 必须吸收 R14 的这些结论：

- v2.x 语义地基保留；
- 当前 UI 扩张冻结；
- 第一 spike 是 BlockSuite Edgeless-as-page + Coincides sidecar；
- full fork AFFiNE 不推荐；
- PageEditor direct modification 不推荐；
- GraphDB / Neo4j 推后到 graph model 成熟后；
- PI-048 是 source reconstruction，不是 editor route 替代品；
- 下一阶段 roadmap 应以 editor foundation / manual notebook / source reconstruction / AI assembly / GraphRAG 的顺序重写。

## R14 结论

Coincides 当前最重要的转折不是“继续做下一个小版本”，而是从功能施工切换到产品地基重置。

最终建议：

```text
1. 保留 v2.x semantic substrate。
2. 冻结当前 Course Detail 堆叠式 UI 扩张。
3. 做 BlockSuite Edgeless-as-page + Coincides sidecar spike。
4. 根据 spike 决定是否新开 repo。
5. 后续先做人能舒服写的笔记软件。
6. 再做 source reconstruction。
7. 再做 AI note assembly。
8. 再做 hybrid RAG / GraphRAG / external agent access。
9. v3.x 再认真设计 Neo4j / graph-native migration。
```

这条路线承认 v2.x 的价值，也承认当前产品体验的问题。它不是推翻，而是把之前的工程成果收束成下一阶段真正可用产品的地基。
