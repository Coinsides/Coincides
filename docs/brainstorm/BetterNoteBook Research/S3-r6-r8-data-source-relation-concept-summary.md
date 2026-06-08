# S3 - R6-R8 Data / Source / Relation / Concept Summary

## 1. Summary Scope

S3 总结 R6-R8：

- R6：Better Notebook 数据契约；
- R7：AFFiNE / BlockSuite / 自研路线再评估；
- R8：Source / Relation / Concept 在成熟笔记体验中的呈现方式。

这三份报告共同回答一个问题：

```text
Better Notebook 怎样既像一个成熟笔记软件，又不丢掉 Coincides 的 source-grounded、relation-aware、proposal-first 数据主权？
```

## 2. 核心阶段结论

R6-R8 把 Better Notebook 从“漂亮 UI”问题推进到了“产品表面 + 主权数据 + 语义能力”问题。

核心结论是：

```text
NoteBlock 是内容 truth；
SurfaceObject / BlockBox 是呈现和排版；
EditorSnapshot 只能是 cache / sidecar；
SourceReference / SourceRegion 是证据层；
CanvasEdge 是视觉连接；
ObjectRelation 是语义关系；
RelationLayer 是显示、筛选和用途组织层；
Concept 是未来跨笔记检索和 GraphRAG 的主题维度；
外部 editor runtime 不得接管 Coincides truth。
```

也就是说，Better Notebook 不能只做一个好看的 canvas，也不能把 AFFiNE / BlockSuite 的内部数据当成 Coincides 的真实数据。它必须有自己的稳定对象模型，然后把成熟 editor/canvas 交互接进来。

## 3. R6 决策：先定义数据合同

R6 最重要的判断是：

```text
内容、位置、来源、关系、导出、AI 可见性必须分层。
```

这意味着新版 roadmap 不能先大规模写 UI。否则很容易把 page layout、canvas layout、source board projection、scratch work、relation edge、export state 都塞进 `canvas_nodes` 或 editor JSON，后面越做越乱。

R6 建议的新阶段：

```text
Phase A6 - Better Notebook Data Contract
```

它必须明确：

- formal page 和 outside workspace；
- `placement_role`；
- `export_role`；
- `ai_visibility`；
- block-box x/y/width/height；
- source / relation / template metadata 不归 editor runtime 所有；
- editor snapshot 缺失时仍能重建可读页面。

## 4. R7 决策：不要 full fork AFFiNE，先做 BlockSuite-focused spike

R7 的判断不是“不要借鉴 AFFiNE”，而是：

```text
AFFiNE 是产品体验标杆和代码参考；
BlockSuite 是值得 spike 的 editor/canvas runtime；
Coincides 必须保留主权数据结构；
full AFFiNE fork 不作为主线。
```

推荐路线：

1. `BlockSuite PageEditor + Overlay` spike：验证自然写作、slash、toolbar、block-box resize、右侧空白生成并排 block、Coincides sidecar。
2. `BlockSuite Edgeless-as-page` spike：验证 A4 formal page、outside workspace、connector、xywh、export intent。
3. `Self-owned minimal surface fallback`：如果外部 runtime 不适配，保留自研最小表面。

R7 建议新 roadmap 加：

```text
Phase B0 - Editor Runtime Spike Gate
```

这个 gate 应在全面 UI 重构前完成。

## 5. R8 决策：Source 先进入 UX，Relation 按需显形，Concept 轻量预留

R8 重新安放 source、relation、concept：

```text
Source = 为什么可信，能不能回到来源
Relation = 内容之间怎样相连
Concept = 内容属于哪些可检索、可筛选、可演化主题维度
```

它们都不应该变成正文里的工程标签。

正确位置是：

```text
badge
tooltip
selected toolbar
right-click
inspector
local graph
search/filter
export preview
AI context preview
```

推荐顺序：

1. Source attachment UX：先支持用户手动把已有 block 连接到一个或多个 source。
2. Relation inspector / local graph UX：保留视觉线，但不要默认画满跨页关系。
3. Concept-lite UX：先进入 inspector/search/filter/AI context，完整 Concept 系统后置。

## 6. Roadmap 直接影响

S3 建议新版 Better Notebook roadmap 在 S2 的 A1-A5 后补齐：

```text
Phase A6 - Better Notebook Data Contract
Phase B0 - Editor Runtime Spike Gate
Phase A7a - Source Attachment And Provenance UX
Phase A7b - Relation Inspector And Local Graph UX
Phase A7c - Concept-Lite Search And Inspector UX
```

推荐顺序是：

1. 先做数据合同；
2. 再做 editor runtime spike；
3. 再做 source attach；
4. 再做 relation inspector/local graph；
5. 最后做 concept-lite；
6. 完整 Concept proposal/refinement/backfill 放到后续阶段。

原因很简单：如果没有数据合同，editor spike 无法验收；如果没有 editor 路线，source/relation/concept 的 UI 插入点无法稳定；如果 source/relation/concept 一起强上，用户会重新面对工程原型。

## 7. 必须进入新 roadmap 的参考文件

新版 roadmap 的 startup reading 应至少索引：

- `docs/brainstorm/BetterNoteBook Research/R6-better-notebook-data-contract.md`
- `docs/brainstorm/BetterNoteBook Research/R7-editor-runtime-route-decision.md`
- `docs/brainstorm/BetterNoteBook Research/R8-source-relation-concept-user-experience.md`
- `docs/brainstorm/BetterNoteBook Research/S3-r6-r8-data-source-relation-concept-summary.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`
- `docs/brainstorm/产品完善/PI-046 Research/R14-product-reset-affine-adoption-decision-report.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`
- `docs/brainstorm/产品完善/PI-048 Research/Outline.md`

## 8. 反补前序阶段

S3 反补 S1/S2：

- S1 的“成熟笔记体验”不能只理解成 click-to-type 和 slash；
- S2 的“page/canvas/block/control”必须绑定 data contract，否则 UI 会变成漂亮但脆弱的皮；
- R3-R5 中的 export intent、AI visibility、scratch role 必须被 R6 正式承接；
- R7/R8 证明 source/relation/concept 不能晚到最后才补，否则 editor runtime 选型会反复返工。

## 9. 风险

### 9.1 外部 runtime 接管 truth

如果 BlockSuite/AFFiNE snapshot 变成真实数据，Coincides 的核心差异会被吞掉。

### 9.2 Concept 过早产品化

Concept 很重要，但如果第一版 UI 就要求用户维护多维概念体系，体验会变重。

### 9.3 Relation 过度可视化

所有关系都画成线会在长笔记中直接变成视觉噪音。relation 必须支持按需显形。

### 9.4 Source attach 做成工程面板

source attachment 是核心功能，但入口应该靠近 block，通过 toolbar/right-click/inspector/source picker 完成，而不是再开一个长面板。

## 10. S3 结论

R6-R8 把 Better Notebook 的中层架构定下来了：

```text
成熟笔记体验不是放弃 Coincides v2.x 的工程成果；
而是把这些成果重新安放到人类可用的页面表面上。
```

下一步 R9 必须回答性能、规模和重建问题。因为一旦 Better Notebook 真能生成几十页、上百页笔记，source badge、relation、concept、outside workspace 和 editor snapshot 都会带来规模压力。

在 R9 之前，不建议直接承诺任何完整 UI 重构。
