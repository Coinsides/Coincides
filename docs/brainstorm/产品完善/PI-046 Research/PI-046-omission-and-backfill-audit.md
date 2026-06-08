# PI-046 Omission And Backfill Audit

## 审计目标

本文件用于检查 PI-046 Research 是否完成了既定范围：

- R0-R14 是否齐全；
- 阶段总结是否齐全；
- 最终决策文档是否齐全；
- Outline 是否同步完成状态；
- 是否存在需要立即回补的遗漏；
- 哪些事项应进入后续 roadmap / continuity / register，而不是继续塞进本轮调研。

## 文件完整性

已存在：

- `Outline.md`
- `R0-research-method-and-decision-criteria.md`
- `R1-current-coincides-capability-inventory.md`
- `R2-product-reset-and-four-phase-strategy.md`
- `S1-r0-r2-method-inventory-product-reset-summary.md`
- `R3-coincides-core-object-model.md`
- `R4-manual-notebook-minimum-usable-experience.md`
- `R5-page-editor-freeform-block-box-requirements.md`
- `R6-page-canvas-modes-and-export-boundaries.md`
- `S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`
- `R7-affine-product-experience-review.md`
- `R8-affine-blocksuite-code-license-review.md`
- `R9-affine-page-editor-adaptation-feasibility.md`
- `R10-affine-edgeless-canvas-adaptation-feasibility.md`
- `R11-coincides-affine-data-model-bridge.md`
- `S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `R12-graph-model-before-graph-database.md`
- `R13-architecture-route-comparison.md`
- `R14-product-reset-affine-adoption-decision-report.md`
- `Coincides-product-reset-and-editor-foundation-decision.md`
- `PI-046-omission-and-backfill-audit.md`

结论：

```text
R0-R14、S1-S3、最终决策文档、审计文档已齐全。
```

## Outline 同步状态

已同步：

- R9 local checklist；
- R10 local checklist；
- R11 local checklist；
- R12 local checklist；
- R13 local checklist；
- R14 local checklist；
- R9-R14 completed report；
- R10-R14 downstream dependency；
- R10-R14 backfill notes；
- S3 阶段总结记录；
- 最终决策文档要求。

需要注意：

```text
Outline 是研究状态机，不是最终 roadmap。
后续还需要把 R14 决策迁移到 roadmap / continuity / product improvement register。
```

## 已完成的关键决策回补

### 从 R9 回补

- PageEditor direct modification 不应作为第一路线。
- Freeform block-box 更适合 canvas/page projection。
- Edgeless-as-page 进入 R10 优先验证。

### 从 R10 回补

- Edgeless 可以承载 formal page / outside workspace / multi-page 的空间层。
- Coincides 必须自己管理 export intent、page label、AI visibility。
- Connector 只能映射 CanvasEdge，不能直接成为 ObjectRelation。

### 从 R11 回补

- Sidecar 是采用 BlockSuite 的必要条件。
- BlockSuite id 只能是 adapter/projection id。
- Coincides semantic truth 必须保留。

### 从 R12 回补

- Graph model 先于 GraphDB。
- Concept layer 是跨笔记/跨 project/course 检索的关键补丁。
- Hybrid RAG 应组合 embedding、concept、role/template、relation traversal、source provenance。

### 从 R13/R14 回补

- 第一候选路线：BlockSuite Edgeless-as-page + Coincides semantic sidecar spike。
- 当前 v2.x semantic substrate 保留。
- 当前 Course Detail 堆叠 UI 扩张冻结。
- AFFiNE full fork、PageEditor direct modification、过早 Neo4j 均降级。

## 未在本轮完成、但应后续处理的事项

这些不是 PI-046 的遗漏，而是后续工作：

1. 更新 `docs/Coincides-Roadmap.md`。
2. 更新 `docs/continuity/2.x/v2.x-continuity.md`。
3. 更新 product improvement issue register，补入 PI-046 最终决策。
4. 为 BlockSuite Edgeless-as-page + Coincides sidecar spike 写独立 plan。
5. 决定 spike 在当前 repo 还是实验 repo 中执行。
6. 为 PI-048 source reconstruction 调研增加 PI-046 前置引用。
7. 对 BlockSuite Windows/Vite/build/license/runtime 做工程 gate。
8. 为 sidecar mapping 设计最小 schema。
9. 设计 spike benchmark 材料。
10. 后续评估是否需要新 repo。

## 本轮未触碰事项

本轮没有：

- 修改产品代码；
- 修改 migration；
- 修改 package；
- 安装新依赖；
- 启动 dev server；
- 做浏览器 smoke；
- 调用真实 API key；
- 改 PI-048 Outline；
- 改 roadmap / continuity / register。

这是符合本轮目标的：PI-046 是 research / decision 阶段。

## 风险提示

### 上下文风险

PI-046 调研跨度较长，后续执行 plan 前必须重新读取：

- `Coincides-product-reset-and-editor-foundation-decision.md`
- `R14-product-reset-affine-adoption-decision-report.md`
- `S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `R11-coincides-affine-data-model-bridge.md`
- `R12-graph-model-before-graph-database.md`

### 决策误用风险

不要把 R14 简化成“改用 AFFiNE”。

正确表述是：

```text
先验证 BlockSuite Edgeless-as-page + Coincides semantic sidecar。
```

### 工程冲动风险

不要在 spike 前继续大规模改当前 Course UI。

### GraphDB 冲动风险

不要把 R12 解读成“现在就上 Neo4j”。

正确表述是：

```text
v2.x 继续收集 graph-shaped evidence。
v3.x 前再做 graph-native migration planning。
```

## 审计结论

PI-046 Research 的既定文档范围已经完成。

下一步应进入：

```text
roadmap / continuity / register 同步
  -> BlockSuite Edgeless-as-page + Coincides sidecar spike plan
  -> PI-048 source reconstruction research
```

本轮没有发现必须立即回补到 R0-R14 正文的遗漏。
