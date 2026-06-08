# S3 - R7-R11 AFFiNE / BlockSuite 采用路线阶段总结

## 覆盖范围

本总结覆盖：

- R7 - AFFiNE 产品体验调研
- R8 - AFFiNE / BlockSuite 代码和许可调研
- R9 - AFFiNE Page Editor 改造可行性
- R10 - AFFiNE Edgeless / Canvas 改造可行性
- R11 - Coincides 数据模型接入 AFFiNE / BlockSuite 的方式

这一阶段回答的问题是：

```text
Coincides 是否应该改编 AFFiNE / BlockSuite？
如果应该，改哪里？
如果不应该，至少能学到什么？
```

## 阶段总判断

**AFFiNE 值得认真借鉴，BlockSuite 值得进入小型 spike，但 Coincides 不应整搬 AFFiNE，也不应把语义主权交给 BlockSuite。**

目前最合理的路线是：

```text
BlockSuite Edgeless-as-page
  + Coincides semantic sidecar
  + Coincides source / relation / template / domain / proposal truth
```

不是：

```text
full fork AFFiNE
强改 PageEditor
把 Coincides NoteBlock 直接塞进 BlockSuite block model
从零重造完整 canvas/editor engine
```

## 1. 从产品体验看，AFFiNE 解决了 Coincides 当前最弱的一块

R7 的核心收获是：AFFiNE 的 app shell、page mode、edgeless mode、toolbar、sidebar、favorite、canvas tools 都比 Coincides 当前工程 UI 成熟得多。

它提醒我们：

- 用户需要能自然打开一篇文档；
- 空白页应该能自然输入；
- canvas 工具要靠近用户操作位置，而不是埋在 Course Detail 的长面板里；
- sidebar/favorite/search/import/template 这些入口不是装饰，而是日常工作流；
- page 与 canvas 的切换或融合需要符合用户心智；
- source/scope/board/canvas 这些工程面板不能继续堆在一个长页面里。

但 AFFiNE 的体验不是直接答案。Coincides 还有 source-grounded note、proposal-first、template/domain/runtime、ObjectRelation、GraphRAG 等独有方向。

## 2. 从代码和许可看，不建议整搬 AFFiNE

R8 的核心收获是：AFFiNE 是完整产品，不只是 editor package。它包含 app shell、后端、同步、workspace、账号、云、本地存储、editor、canvas 等复杂系统。

整搬 AFFiNE 的风险：

- 工程体量过大；
- 后续跟上游更新困难；
- Coincides source/proposal/template/domain/relation 地基会被迫适配 AFFiNE 的产品结构；
- 很容易从“做笔记系统”变成“维护一个被魔改的大型开源产品”。

更现实的是：

```text
研究 AFFiNE 产品体验；
研究 BlockSuite editor/canvas runtime；
优先试 BlockSuite-first / hybrid；
保留 Coincides-owned fallback。
```

## 3. PageEditor 不适合承载 Coincides freeform block-box

R9 的核心收获是：BlockSuite PageEditor 是成熟的 conventional flow editor。它适合自然写字、block selection、rich text、slash menu、普通文档流。

但 Coincides 想要的是：

- block 可 resize；
- block 可并排；
- 双击空白处可以按空间位置创建 block；
- A4 formal page 内外有不同意义；
- page/canvas/export/AI visibility 分离；
- 多页和无缝页栈；
- source/relation/provenance 仍然可追踪。

把 PageEditor 强改成 freeform block-box 会破坏它最成熟的文档流能力。

R9 因此把路线从：

```text
强改 PageEditor
```

转向：

```text
Edgeless-as-page / formal page in canvas
```

## 4. Edgeless-as-page 是当前最有希望的画布路线

R10 的核心收获是：BlockSuite EdgelessEditor 的 surface、frame、note、connector、viewport、`xywh`、`index`、selection、resize 等能力，确实更接近 Coincides 想要的 canvas-first document surface。

它可以帮助我们实现：

- infinite / outside-page workspace；
- A4 page frame；
- multi-page grid；
- seamless page stack；
- page outside sticky note / scratch work；
- visual connector；
- frame presentation；
- note card move/resize；
- canvas-level pan/zoom/selection。

但它不自动解决：

- formal page membership；
- export intent；
- page label；
- source provenance；
- NoteBlock identity；
- ObjectRelation；
- template/domain/concept；
- AI-readable structure；
- proposal/recovery history。

所以 R10 的结论不是“用 Edgeless 就行”，而是：

```text
Edgeless 可以做 surface。
Coincides 必须做 semantic sidecar。
```

## 5. Sidecar 是采用 BlockSuite 的生死线

R11 的核心收获是：如果没有 sidecar，BlockSuite 只会变成另一个把 Coincides 语义吞掉的 editor runtime。

Coincides 必须保留：

- NoteBlock canonical identity；
- source anchor / source scope；
- CanvasNode / CanvasFrame / CanvasEdge projection records；
- ObjectRelation semantic edge；
- TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest；
- Proposal / OperationBatch / Recovery；
- export intent / AI visibility / page label；
- future Concept / GraphRAG metadata。

BlockSuite 对象只能作为 adapter/projection：

```text
BlockSuite doc/root/surface/note/frame/connector
  -> editor runtime ids

Coincides NoteBlock/CanvasNode/CanvasEdge/ObjectRelation
  -> canonical ids
```

## 6. 当前推荐路线

### 第一候选：BlockSuite Edgeless-as-page + Coincides sidecar

适合作为下一步 spike：

```text
Coincides NoteBlock -> BlockSuite edgeless note
Coincides CanvasFrame -> BlockSuite frame/page object
BlockSuite connector -> Coincides CanvasEdge
CanvasEdge bind -> Coincides ObjectRelation
Coincides export intent -> 独立 sidecar metadata
删除 BlockSuite snapshot -> 可从 Coincides records 重建
```

### 第二候选：Coincides-owned canvas fallback

保留用于：

- license 风险；
- BlockSuite 性能失败；
- sidecar 同步过于复杂；
- export 或 page model 失控；
- future graph-native 迁移需要更纯粹的自有 surface。

### 不推荐优先路线

- full fork AFFiNE；
- 深改 PageEditor；
- 只做 import/export bridge；
- 纯双写 semantic truth；
- 从零立即自研完整富文本 + canvas + connector + export 引擎。

## 7. 对 R12-R14 的要求

R12 不应从“是否上图数据库”开始，而应先定义：

```text
Coincides sidecar 中哪些对象天然是 graph-shaped data？
哪些 relation 是 semantic edge？
哪些 canvas object 只是 projection？
哪些 editor runtime id 不应该进入 graph truth？
```

R13 路线评分必须把以下路线分开：

- 当前 Coincides 继续重构；
- 新 repo 从零做；
- AFFiNE full fork；
- BlockSuite Edgeless-as-page + Coincides sidecar；
- Coincides-owned editor/canvas + AFFiNE/BlockSuite only as reference。

R14 最终建议必须回答：

```text
是否做 BlockSuite spike？
是否冻结当前 Coincides UI 主线？
哪些 v2.x 地基保留为 sidecar truth？
哪些能力只保留为经验？
下一阶段 roadmap 是否重写为 editor foundation first？
```

## 阶段结论

R7-R11 不是让我们“放弃 Coincides 去用 AFFiNE”，也不是让我们“继续硬造一切”。

它给出的成熟路线是：

```text
借成熟 editor/canvas runtime。
保留 Coincides semantic truth。
先做小型 Edgeless-as-page sidecar spike。
用 spike 结果决定是否正式切换工程主线。
```

这条路线既能尊重用户体验，也不牺牲 Coincides 最重要的 source-grounded、proposal-first、AI-readable、graph-ready 地基。
