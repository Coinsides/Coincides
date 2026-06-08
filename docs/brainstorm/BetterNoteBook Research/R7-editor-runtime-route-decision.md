# R7 - AFFiNE / BlockSuite / 自研路线再评估

## 0. 报告定位

R7 在 R3-R6 之后重新评估技术路线。

这一次不再泛泛讨论“要不要用 AFFiNE”。R3-R6 已经把 Better Notebook 的要求收束得更具体：

```text
自然 page writing
freeform block-box
formal page / outside workspace / export intent
block visual language
command surface / inspector
NoteBlock truth 与 surface placement 分离
editor snapshot 只能是 cache / sidecar
```

因此 R7 的问题变成：

```text
哪条 editor / canvas 路线最可能支撑这些要求，
同时不伤害 Coincides 的 source-grounded、relation-aware、proposal-first、future graph-native 结构？
```

## 1. 本轮参考材料与证据

R7 参考：

- `S2-r3-r5-page-canvas-block-control-summary.md`
- `R6-better-notebook-data-contract.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R8-affine-blocksuite-code-license-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R9-affine-page-editor-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R10-affine-edgeless-canvas-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R11-coincides-affine-data-model-bridge.md`
- `docs/brainstorm/产品完善/PI-046 Research/R13-architecture-route-comparison.md`
- `docs/brainstorm/产品完善/PI-046 Research/R14-product-reset-affine-adoption-decision-report.md`

本轮还读取了本地外部研究代码：

- `_external_research/AFFiNE`
- `_external_research/blocksuite`

CodeGraph 证据显示 AFFiNE / BlockSuite 已有：

- edgeless surface；
- viewport；
- layer；
- selection；
- frames；
- connector；
- Gfx block model；
- `xywh`；
- rotate / lock；
- edgeless toolbar；
- zoom toolbar；
- connector label / path resize。

本地 license 证据：

- AFFiNE 仓库主体大部分在 MIT 下，部分 backend/native 目录另有说明；
- 独立 BlockSuite 仓库为 MPL-2.0。

R7 不是法律意见；如果未来要发布或深度混入代码，需要单独做 license gate。

## 2. 路线候选

R7 按 Outline 评估五条路线：

1. Coincides 自研 editor/canvas；
2. BlockSuite Edgeless-as-page + Coincides sidecar；
3. BlockSuite PageEditor + 自定义 overlay；
4. AFFiNE fork / partial copy；
5. 其他 editor runtime，如 Tiptap / Lexical / BlockNote / ProseMirror。

另外补充一个实际路线：

6. 当前 Coincides canvas seed 继续迭代。

## 3. 评估标准

R7 使用八个标准：

### 3.1 Natural Writing

是否能支持：

- 点击空白即写；
- slash command；
- inline text editing；
- selection toolbar；
- formula/code/image/table 插入；
- block hover handle。

### 3.2 Freeform BlockBox

是否能支持：

- block resize；
- text reflow；
- 左文右图；
- 右侧空白点击生成并排 block；
- collision-aware insertion；
- alignment guides / snap。

### 3.3 Page / Canvas / Export Boundary

是否能支持：

- formal page；
- outside workspace；
- multi-page / page stack；
- export intent；
- page label mapping；
- scratch/private note。

### 3.4 Coincides Data Sovereignty

是否能坚持：

- NoteBlock 是内容 truth；
- SurfaceObject 是 placement/projection；
- editor snapshot 只是 cache；
- source/relation/template 不被 editor runtime 接管。

### 3.5 Source / Relation / Template Compatibility

是否能显示并保留：

- source badge；
- relation badge；
- relation line/local graph；
- template role；
- domain/concept；
- inspector/debug ids。

### 3.6 Proposal-first Compatibility

是否能继续支持：

- layout proposal；
- composition proposal；
- template migration proposal；
- domain refinement proposal；
- package import preview；
- operation batch。

### 3.7 Engineering Cost

集成和维护成本是否可接受。

### 3.8 License / Distribution Risk

是否有明显 license 或分发风险。

## 4. 路线一：Coincides 自研 editor/canvas

### 优点

- 数据主权最清楚；
- 最贴合 R6 的目标契约；
- source / relation / template / proposal-first 可以从第一天按 Coincides 方式设计；
- 不被外部 editor runtime 的数据模型牵制；
- v3.x graph-native migration evidence 更干净。

### 缺点

工程量巨大。

要自研：

- rich text；
- caret；
- IME；
- selection；
- slash menu；
- floating toolbar；
- copy/paste；
- undo/redo；
- image/table/code/formula editing；
- block resize；
- collision-aware insertion；
- snap/alignment；
- page export；
- canvas pan/zoom；
- relation connector；
- performance virtualization。

这些不是一两个小版本能稳住的。

### 判断

自研是最终控制力最强的路线，但不适合作为“马上把 Better Notebook 做成熟”的唯一主线。

更合理的做法是：

```text
保持 Coincides data contract 自研；
editor runtime 先做 spike；
如果外部 runtime 失败，再切自研 fallback。
```

## 5. 路线二：BlockSuite Edgeless-as-page + Coincides sidecar

### 含义

使用 BlockSuite / AFFiNE edgeless 的二维能力，作为 Better Notebook 的主要交互表面。

Coincides 通过 sidecar/mapping 保存：

- NoteBlock identity；
- SurfaceObject；
- source refs；
- ObjectRelation；
- export intent；
- AI visibility；
- operation batch；
- editor snapshot hash。

### 证据

本地 CodeGraph 证据显示：

- `EdgelessRootService` 暴露 surface、viewport、layer、selection、frames、connectors；
- `GfxBlockElementModel` 具有 `xywh`、index、lock、rotate 等二维属性；
- connector model 具有 source/target/path/label/resize；
- edgeless toolbar 和 zoom toolbar 已经存在。

这说明 edgeless 路线在画布交互上非常成熟。

### 优点

- 最接近 Coincides 的 canvas-first 历史；
- 已有 pan/zoom/selection/xywh/connector/frame/toolbar；
- 能显著降低画布交互自研成本；
- 适合承载 outside workspace、relation preview、local graph；
- 可以用 sidecar 保持 Coincides truth。

### 缺点

- edgeless 天然是 canvas，用户可能感觉不是普通文档；
- formal page / export boundary 需要 Coincides 自己叠加；
- page stack / A4 / seamless page 不一定原生满足；
- 若直接让 BlockSuite block 成为 truth，会违反 R6；
- MPL-2.0 或 AFFiNE monorepo license/工程边界需要 gate；
- sidecar 同步复杂，容易出现 orphan/stale/duplicate。

### 判断

这是最值得做 first spike 的路线之一，但只能作为 runtime + sidecar，不能作为主权数据层。

适合验证：

```text
能不能把 edgeless 当成 formal page + outside workspace 的编辑表面？
能不能把 BlockSuite object 映射到 Coincides SurfaceObject？
能不能删除 snapshot 后从 Coincides records 重建？
```

## 6. 路线三：BlockSuite PageEditor + 自定义 overlay

### 含义

使用 BlockSuite page editor 负责自然写作，用 Coincides overlay 或 sidecar 实现 freeform block-box、source/relation/export 控件。

### 优点

- Natural writing 最强；
- slash、block flow、toolbar 等成熟；
- 更接近 Notion/AFFiNE 的页面写作心智；
- 比 edgeless 更适合普通用户第一体验。

### 缺点

- R3-R5 要求的 freeform block-box 可能不是原生 page flow；
- 左文右图、右侧空白点击生成并排 block、二维 resize 可能需要大改；
- 自定义 overlay 可能和 editor selection/caret 冲突；
- page editor 的线性模型可能会抵抗 Coincides 的 page/canvas 混合需求；
- source/relation/export metadata 仍需要 sidecar。

### 判断

这是第二值得做 spike 的路线。

如果 BlockSuite PageEditor 能被改造成：

```text
普通写作状态 = page flow
layout mode = freeform block-box
```

它会非常理想。

但 R7 不能假定它能做到。需要专门 spike。

## 7. 路线四：AFFiNE fork / partial copy

### 含义

直接基于 AFFiNE 仓库改造，或者复制部分代码到 Coincides。

### 优点

- 产品体验成熟；
- app shell、sidebar、favorite、page/edgeless、toolbar、export、frame、connector 等都有参考实现；
- MIT 部分对自用研究友好；
- 可以最大程度借鉴成熟产品。

### 缺点

- AFFiNE 是完整产品，不只是 editor engine；
- monorepo 很重；
- 其数据模型、同步、workspace、账户、cloud/local 架构会和 Coincides 冲突；
- 会把 Coincides 拉进“改造别人大型应用”的工程泥潭；
- source-grounded/proposal-first/template/domain/object relation 不是 AFFiNE 的天然主线；
- 很容易让 BlockSuite/AFFiNE snapshot 接管 truth。

### 判断

不建议把 full AFFiNE fork 作为主线。

建议：

```text
AFFiNE = 产品体验标杆 + 代码参考 + 交互参考
BlockSuite = 可 spike 的 editor/canvas runtime
Coincides = 主权数据结构和产品目标
```

Partial copy 也要谨慎。只复制小型独立思想或 pattern 可以；复制大块产品层代码会让后续维护困难。

## 8. 路线五：Tiptap / Lexical / BlockNote / ProseMirror 等

### 优点

- rich text 强；
- 自然写作强；
- 社区成熟；
- 比 BlockSuite 更小；
- license 通常更容易处理；
- 可以只作为 text editor 嵌入。

### 缺点

- 不天然提供 edgeless canvas；
- freeform block-box 要自己做；
- relation connector 要自己做；
- page/canvas/export boundary 要自己做；
- source/relation/template badge 和 inspector 仍要自己做；
- 左文右图和二维 layout 可能要大量自定义。

### 判断

适合作为 fallback 的文本编辑内核，不适合作为完整 Better Notebook 表面。

更现实的用法：

```text
自研 surface + Lexical/Tiptap as rich-text block editor
```

但这仍然要自研 layout/canvas。

## 9. 路线六：当前 Coincides canvas seed 继续迭代

### 优点

- 已经存在；
- 数据主权清楚；
- move/resize/connect/edge/selected scope 已可跑；
- 与 v2.x 代码连续。

### 缺点

- rich text 不成熟；
- page writing 不自然；
- 当前节点视觉偏工程卡片；
- toolbar/context/inspector 仍是 seed；
- 自研成本继续累计；
- 要补齐成熟编辑器体验非常慢。

### 判断

当前 seed 可作为 fallback 和数据验证基线，不建议作为唯一产品化主线。

它的价值是：

- 验证 Coincides data contract；
- 验证 R6 的 surface object 设计；
- 在外部 runtime spike 失败时提供 fallback；
- 继续跑 source/relation/proposal-first 测试。

## 10. 评分矩阵

分数是本轮定性评分，满分 5。

| 路线 | Natural Writing | Freeform BlockBox | Page/Export Boundary | Data Sovereignty | Source/Relation Fit | Cost | License Risk | 总体 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coincides 自研 | 2 | 5 | 5 | 5 | 5 | 1 | 5 | 控制力最高，成本最高 |
| BlockSuite Edgeless + sidecar | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 最值得 canvas spike |
| BlockSuite PageEditor + overlay | 5 | 2-3 | 3 | 3 | 3 | 3 | 3 | 最值得 page spike |
| AFFiNE full fork/copy | 5 | 4 | 3 | 2 | 2 | 2 | 3-4 | 参考价值高，不宜主线 |
| Lexical/Tiptap/ProseMirror + 自研 surface | 5 | 2 | 3 | 4 | 4 | 2-3 | 4 | 文本内核候选，不是完整答案 |
| 当前 Coincides seed 继续迭代 | 1-2 | 3 | 3 | 5 | 5 | 2 | 5 | fallback/验证基线 |

## 11. R7 推荐路线

R7 推荐：

```text
不要 full fork AFFiNE。
不要现在承诺完全自研成熟 editor。
先做 BlockSuite-focused spike，同时保留 Coincides self-owned fallback。
```

更具体：

### 11.1 第一优先 spike：BlockSuite PageEditor + Overlay

验证：

- 空白页自然输入；
- slash；
- block selection；
- toolbar；
- 是否可实现 block-box resize；
- 是否能在右侧空白生成并排 block；
- 是否能保留 Coincides object identity；
- snapshot 是否可降级为 cache。

如果这条能通，它最接近用户心智。

### 11.2 第二优先 spike：BlockSuite Edgeless-as-page

验证：

- formal A4 page area；
- outside workspace；
- x/y/width/height；
- frame；
- connector；
- page boundary；
- export intent overlay；
- Coincides SurfaceObject mapping；
- snapshot rebuild。

如果 PageEditor 不能支持 freeform block-box，edgeless 可能更适合。

### 11.3 第三优先 fallback：Self-owned minimal surface + rich text block editor

如果 BlockSuite 两条都不满足 R6：

- Coincides 自研 surface；
- 每个 text/formula/code block 内部可嵌 Lexical/Tiptap；
- layout/canvas/source/relation/export 自己控制。

这是成本更高但风险更可控的 fallback。

## 12. 为什么不建议 full AFFiNE fork

用户之前提出“能不能直接 copy 一个 AFFiNE repo 改”。R7 的答案是：

```text
可以研究，可以借鉴，可以局部 spike；
但不建议把 full AFFiNE fork 作为 Better Notebook 主线。
```

原因：

1. AFFiNE 是完整产品，不是单纯 editor；
2. Coincides 的 source/proposal/template/domain/object relation 结构会和 AFFiNE 产品结构发生深层冲突；
3. full fork 会把我们从“做 Better Notebook”变成“维护一套大型 fork”；
4. R6 已经确认 editor snapshot 不能成为 truth，而 full fork 很容易让它成为 truth；
5. 对自用研究可以很自由，但未来如果要发布，license/贡献/安全更新都会变复杂。

## 13. 技术路线的红线

无论选哪条路线，都不能突破以下红线：

```text
NoteBlock remains content truth.
SurfaceObject remains placement/projection truth.
Editor snapshot is cache/sidecar.
Source provenance stays in Coincides source tables.
ObjectRelation is semantic edge.
Canvas/BlockSuite connector is visual/interaction object unless explicitly bound.
Proposal-first governance remains for risky mutations.
OperationBatch remains durable recovery evidence.
```

## 14. R7 对新版 roadmap 的建议

R7 建议在正式 Better Notebook roadmap 里加入一个 spike 阶段：

```text
Phase B0 - Editor Runtime Spike Gate
```

它应在大规模 UI 开发前完成。

### Phase B0 目标

- 验证 BlockSuite PageEditor 是否能支持 R2/R4/R5 的自然写作和控制层；
- 验证 BlockSuite Edgeless 是否能支持 R3/R6 的 page/canvas/export/surface object；
- 验证 adapter 能否把 BlockSuite object 映射到 Coincides NoteBlock/SurfaceObject；
- 验证 snapshot 删除后能否从 Coincides records 重建；
- 给出采用 BlockSuite、采用自研 fallback、或混合路线的明确决策。

### Phase B0 不做

- 不迁移全部 Coincides UI；
- 不导入真实用户数据；
- 不做完整 Source Reconstruction；
- 不做 AI note assembly；
- 不改 v3.x graph database；
- 不把 BlockSuite snapshot 当 truth。

## 15. Spike 验收清单

### 15.1 PageEditor Spike

必须证明：

- 空白页点击出现光标；
- `/` 菜单创建 block；
- paragraph block 可以转为 formula / image / code；
- selected block 有 toolbar；
- block metadata 可隐藏；
- Coincides id 可 sidecar 绑定；
- 尝试实现或模拟 block-box resize；
- 尝试右侧空白创建并排 block；
- 删除 snapshot 后可从 Coincides NoteBlock + SurfaceObject 重建基本内容。

### 15.2 Edgeless Spike

必须证明：

- A4 formal page area；
- outside workspace；
- NoteBlock object 可 xywh；
- text block resize 后 text reflow；
- connector 可作为 CanvasEdge；
- relation binding 不自动创建 ObjectRelation；
- export intent overlay；
- page-in / page-out 默认策略；
- snapshot rebuild。

### 15.3 Self-owned Fallback Spike

如果需要 fallback，必须证明：

- 一个最小 page surface；
- text block caret；
- block-box resize；
- image block；
- source badge；
- relation badge；
- inspector；
- export intent；
- data contract 与 R6 对齐。

## 16. 对 R8 的要求

R8 将研究 Source / Relation / Concept UX。R7 要求 R8 不再把这些能力当“工程面板”。

R8 应回答：

- source badge 在 BlockSuite/自研 surface 中如何显示；
- source inspector 如何打开；
- relation 什么时候是线，什么时候是 inspector/local graph；
- Concept tag 是否在第一版出现；
- AI visibility 如何不污染正文；
- source/relation/concept 如何通过 sidecar 注入 editor UI。

## 17. R7 解决的问题

R7 回答了 Outline 的问题：

### 哪条路线最能支持 freeform block-box？

Edgeless 和自研最强；PageEditor 需要 spike 验证；普通 rich text editor 最弱。

### 哪条路线最能支持自然文本输入？

PageEditor 和 Lexical/Tiptap/ProseMirror 最强；edgeless 次之；当前 Coincides seed 最弱。

### 哪条路线最能支持 page/canvas/export boundary？

自研最可控；edgeless 可通过 overlay 实现；PageEditor 需要较多改造；full AFFiNE fork 不天然支持 Coincides export intent。

### 哪条路线最不伤害 Coincides truth？

自研最安全；所有外部 editor 都必须通过 sidecar/cache 约束。

### 哪条路线维护成本可接受？

BlockSuite-focused spike 成本低于 full AFFiNE fork，也低于完全自研成熟 editor。

### 哪条路线最适合先做 spike？

BlockSuite PageEditor + Overlay 和 BlockSuite Edgeless-as-page 都值得先做。优先 PageEditor，因为用户心智更自然；并行或紧随 Edgeless，因为它更接近 freeform layout。

## 18. R7 结论

R7 的最终建议是：

```text
数据主权自研；
交互运行时先评估 BlockSuite；
AFFiNE 作为产品和代码参考；
full fork 不作为主线；
自研 surface + rich text 内核作为 fallback；
当前 Coincides canvas seed 继续作为验证基线。
```

这条路线最符合当前阶段：既不把步子迈到“全自研成熟编辑器”的高风险区，也不把 Coincides 的 source/relation/template/proposal-first 核心交给外部产品模型。它让我们先用 spike 回答关键问题，再决定真正工程路线。
