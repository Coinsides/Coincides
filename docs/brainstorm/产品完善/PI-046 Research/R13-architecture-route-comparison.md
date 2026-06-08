# R13 - 架构路线对比

## 本阶段目标

R13 把 R0-R12 的结论收束成路线评分。

它不直接写最终 roadmap，而是回答：

```text
下一阶段我们到底应该继续当前 Coincides 主线？
新开 repo？
full fork AFFiNE？
BlockSuite-first sidecar？
还是完全自研 editor/canvas？
```

## 评分依据

来自 R0 的统一评分维度，并结合 R1-R12 的阶段结论：

- 人工笔记体验成熟度；
- 工程复杂度；
- 许可风险；
- source-grounded NoteBlock 适配度；
- graph model 适配度；
- AI note assembly 适配度；
- 外部 Agent/API 适配度；
- 长期维护成本；
- v2.x 已有地基保留程度；
- PI-048 source reconstruction 接入难度；
- v3.x graph-native / Neo4j 迁移友好度。

评分含义：

```text
5 = 非常适合 / 风险很低 / 收益很高
4 = 适合，但需要明确工程验证
3 = 可行，但有明显代价
2 = 不推荐作为主线，只适合参考或兜底
1 = 高风险，不应作为当前路线
```

## 路线 1：继续当前 Coincides 重构

### 定义

继续沿着当前 v2.x 代码库往前走，逐步修 UX、修 Canvas、修 Agent、修 RAG、修 source reconstruction。

### 优点

- v2.x 已有地基可以完整保留；
- SourceSnapshot / Anchor / Scope / Board 已有；
- CanvasNode / CanvasEdge / ObjectRelation 已有；
- TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest 已有；
- proposal-first / migration / recovery 习惯已经建立；
- SQLite + graph-shaped evidence 已经开始形成。

### 缺点

- 当前 UI/UX 已经明显工程化、堆叠化；
- Canvas 和 Note editor 都还不成熟；
- 如果继续在现有 Course Detail 上堆功能，会进一步恶化用户体验；
- 富文本、selection、drag/resize、connector、export、clipboard、undo/redo 都要自己慢慢造；
- 很容易继续变成“底层越来越强，用户越来越难用”。

### 评分

| 维度 | 分数 |
| --- | --- |
| 人工笔记体验成熟度 | 2 |
| 工程复杂度 | 3 |
| 许可风险 | 5 |
| Source-grounded NoteBlock 适配 | 5 |
| Graph model 适配 | 4 |
| AI note assembly 适配 | 4 |
| 外部 Agent/API 适配 | 4 |
| 长期维护成本 | 3 |
| v2.x 地基保留 | 5 |
| PI-048 接入 | 4 |
| v3.x graph-native 迁移 | 4 |

### 判断

```text
适合作为语义地基保留，不适合作为下一阶段 UX/editor 主线继续硬堆。
```

## 路线 2：新 repo 从零做

### 定义

冻结当前 Coincides，把 v2.x 作为经验仓库，新开一个更干净的 repo，从人工笔记软件开始重新做。

### 优点

- 架构可以重新变干净；
- 可以从第一天就按 editor foundation / sidecar / graph-shaped data 设计；
- 避免当前 UI/UX 债继续影响新产品；
- 可以选择更合适的框架、组件、包结构。

### 缺点

- v2.x 已有工程成果需要迁移或重写；
- 短期内大量重复劳动；
- 容易陷入“重开很爽，但又重新造了一遍地基”；
- 如果没有明确 spike 结果，新 repo 也可能选错 editor/canvas 路线。

### 评分

| 维度 | 分数 |
| --- | --- |
| 人工笔记体验成熟度 | 2 |
| 工程复杂度 | 2 |
| 许可风险 | 5 |
| Source-grounded NoteBlock 适配 | 4 |
| Graph model 适配 | 4 |
| AI note assembly 适配 | 3 |
| 外部 Agent/API 适配 | 3 |
| 长期维护成本 | 4 |
| v2.x 地基保留 | 2 |
| PI-048 接入 | 3 |
| v3.x graph-native 迁移 | 4 |

### 判断

```text
可以作为 R14 的候选后续路线，但不应在没有 editor/canvas spike 证据前立即重开。
```

新 repo 应该是验证后的结果，不应该是逃避当前复杂度的冲动决定。

## 路线 3：AFFiNE full fork / copy 改造

### 定义

复制或 fork AFFiNE 整个 repo，把 Coincides 的 source、template、relation、AI、GraphRAG 方向改进去。

### 优点

- 产品体验起点高；
- app shell、sidebar、favorites、page/edgeless、toolbar、workspace 等成熟；
- 富文本和画布工具都比 Coincides 当前实现成熟；
- 可以直接学习完整产品的交互逻辑。

### 缺点

- AFFiNE 是完整大型产品，不只是 editor runtime；
- backend / sync / workspace / cloud / local-first / editor / canvas 耦合复杂；
- Coincides 的 source-grounded、proposal-first、template/domain/runtime 会被迫适配 AFFiNE；
- 上游更新和自己魔改会长期冲突；
- 语义主权容易被 AFFiNE 产品结构吞掉；
- v3.x graph-native 迁移会变成“大型 fork 内部再重构”。

### 评分

| 维度 | 分数 |
| --- | --- |
| 人工笔记体验成熟度 | 5 |
| 工程复杂度 | 1 |
| 许可风险 | 3 |
| Source-grounded NoteBlock 适配 | 2 |
| Graph model 适配 | 2 |
| AI note assembly 适配 | 3 |
| 外部 Agent/API 适配 | 2 |
| 长期维护成本 | 1 |
| v2.x 地基保留 | 2 |
| PI-048 接入 | 3 |
| v3.x graph-native 迁移 | 2 |

### 判断

```text
不推荐作为主线。
```

AFFiNE 适合深度调研和借鉴，但 full fork / copy 的长期维护风险太高。

## 路线 4：BlockSuite-first editor runtime + Coincides semantic sidecar

### 定义

不整搬 AFFiNE app，而是重点引入或改编 BlockSuite Edgeless / Page 能力。BlockSuite 负责 editor/canvas runtime，Coincides 保留 semantic sidecar。

核心形态：

```text
BlockSuite Edgeless-as-page
  + Coincides NoteBlock / Source / Relation / Template / Domain / Proposal sidecar
```

### 优点

- 借成熟 editor/canvas runtime；
- 不必整搬 AFFiNE 产品；
- Edgeless 能承载 formal page、outside workspace、multi-page、connector、frame；
- Coincides 保留 source/relation/template/domain/proposal truth；
- 对 v3.x graph-native 迁移更友好；
- 对 PI-048 source reconstruction 比较友好：SourceRegion / NoteBlockCandidate 可以进入 Coincides sidecar，再投射到 BlockSuite surface。

### 缺点

- sidecar identity map 必须设计好；
- adapter sync / conflict / orphan / duplicate 需要解决；
- export intent、page label、多页导出仍要 Coincides 自己做；
- 长文本写作是否足够自然需要 spike；
- 大文档性能必须 benchmark；
- 需要确认 package/license/build/runtime 接入成本。

### 评分

| 维度 | 分数 |
| --- | --- |
| 人工笔记体验成熟度 | 4 |
| 工程复杂度 | 3 |
| 许可风险 | 3 |
| Source-grounded NoteBlock 适配 | 4 |
| Graph model 适配 | 4 |
| AI note assembly 适配 | 4 |
| 外部 Agent/API 适配 | 4 |
| 长期维护成本 | 3 |
| v2.x 地基保留 | 4 |
| PI-048 接入 | 4 |
| v3.x graph-native 迁移 | 4 |

### 判断

```text
当前第一候选路线。
```

但它必须先通过 spike，而不是直接进入大改。

第一版 spike 应验证：

- Coincides NoteBlock 投射为 BlockSuite edgeless note；
- CanvasFrame 投射为 page frame；
- BlockSuite connector 映射为 CanvasEdge；
- CanvasEdge 可绑定 ObjectRelation；
- export intent / AI visibility 存在 Coincides sidecar；
- 删除 editor snapshot 后能从 Coincides records 重建；
- 50-100 页、多 block、多 connector 情况下交互不崩。

## 路线 5：Coincides-owned editor + AFFiNE/BlockSuite 仅作参考

### 定义

继续自研 editor/canvas，但不在现有 UI 上硬堆，而是重建一套 Coincides-owned editor foundation。AFFiNE / BlockSuite 只作为产品和代码参考。

### 优点

- 完全贴合 Coincides 数据结构；
- semantic truth、source、relation、template、domain、GraphRAG 从一开始就统一；
- v3.x graph-native 迁移最可控；
- 不被外部 editor runtime 绑架。

### 缺点

- 工程量巨大；
- 富文本、画布、selection、toolbar、connector、export、clipboard、undo/redo、性能都要自研；
- 短期用户体验很难追上成熟产品；
- 风险是再次做出“工程可用但用户体验粗糙”的系统。

### 评分

| 维度 | 分数 |
| --- | --- |
| 人工笔记体验成熟度 | 2 |
| 工程复杂度 | 1 |
| 许可风险 | 5 |
| Source-grounded NoteBlock 适配 | 5 |
| Graph model 适配 | 5 |
| AI note assembly 适配 | 4 |
| 外部 Agent/API 适配 | 4 |
| 长期维护成本 | 3 |
| v2.x 地基保留 | 5 |
| PI-048 接入 | 4 |
| v3.x graph-native 迁移 | 5 |

### 判断

```text
非常适合作为 fallback 和长期自有路线。
不适合作为立刻从零做完整 editor/canvas 的第一选择。
```

## 总评分对比

| 路线 | 推荐度 | 核心判断 |
| --- | --- | --- |
| 继续当前 Coincides 重构 | 中 | 保留语义地基，但不要继续堆当前 UI |
| 新 repo 从零做 | 中 | 可作为后续选择，但需要先有 spike 证据 |
| AFFiNE full fork / copy | 低 | 产品成熟但维护和语义冲突太高 |
| BlockSuite-first sidecar | 高 | 当前第一候选，需要小型 spike 验证 |
| Coincides-owned editor fallback | 中高 | 长期可控，但短期工程量过大 |

## PI-048 source reconstruction 影响

PI-048 研究 OCR / VLM / layout / math recognition / SourceRegion。

不同路线下的接法：

### 当前 Coincides

```text
SourceRegion -> NoteBlockCandidate -> Proposal -> CanvasNode
```

直接，但 UI 承载能力弱。

### AFFiNE full fork

```text
SourceRegion -> AFFiNE block?
```

不稳定，因为 source provenance 和 NoteBlockCandidate 可能被 AFFiNE block model 吞掉。

### BlockSuite-first sidecar

```text
SourceRegion -> Coincides NoteBlockCandidate
  -> Coincides NoteBlock / SourceAnchor / Concept / Template
  -> BlockSuite edgeless note projection
```

最合理。PI-048 输出先进入 Coincides sidecar，再投射到 editor surface。

### Coincides-owned editor

也合理，但要自研完整承载界面。

## v3.x graph-native 影响

最有利于 v3.x 的路线不是 full fork，也不是马上 Neo4j，而是：

```text
v2.x:
  SQLite + graph-shaped relation tables + sidecar evidence

v3.x:
  根据 evidence 迁移到 graph-native / Neo4j
```

BlockSuite-first sidecar 与 Coincides-owned fallback 都能支持这个方向。

AFFiNE full fork 对 v3.x 迁移不友好，因为 graph truth 会被大型产品 fork 的数据结构牵制。

## R13 推荐

R13 推荐下一步采用：

```text
Primary experiment:
  BlockSuite Edgeless-as-page + Coincides semantic sidecar spike

Keep:
  Current Coincides v2.x source/template/domain/relation/proposal data model as semantic substrate

Fallback:
  Coincides-owned editor/canvas

Do not prioritize:
  AFFiNE full fork
  PageEditor direct modification
  full GraphDB migration before graph model is stable
```

## R13 解决的问题

R13 解决了：

1. 路线 4 与路线 3 必须分开，BlockSuite-first sidecar 不是 AFFiNE full fork。
2. 当前 Coincides 的语义地基值得保留，但当前 UI 主线不应继续硬堆。
3. 新 repo 可以考虑，但应该等 spike 证据，而不是现在冲动重开。
4. Coincides-owned editor 是重要 fallback，但不是短期最低成本路线。
5. PI-048 source reconstruction 最适合接入 Coincides sidecar，而不是直接接入 editor tree。

## R13 暴露的风险

1. **Spike 失败风险**
   如果 BlockSuite sidecar 映射、导出或性能失败，路线 4 需要降级。

2. **当前主线惯性风险**
   如果继续在现有 Course Detail 上加功能，产品体验会继续恶化。

3. **重开 repo 风险**
   如果没有明确继承 v2.x 地基，新 repo 会浪费已有 source/template/domain/relation/proposal 成果。

4. **过早 graph migration 风险**
   GraphDB 不是当前 editor/product reset 的前置条件。

## 对 R14 的要求

R14 必须把 roadmap rewrite 收束为：

- 冻结当前 Course Detail 堆叠式 UI 扩张；
- 保留 v2.x semantic substrate；
- 做 BlockSuite Edgeless-as-page sidecar spike；
- 同时保留 Coincides-owned editor fallback；
- 把 PI-048 source reconstruction 作为后续输入层调研；
- 把 GraphDB / Neo4j 放到 graph model 成熟后的 v3.x 方向；
- 明确哪些能力保留、冻结、重写、迁移、放弃。

## R13 结论

R13 的路线建议是：

```text
不要继续无节制扩张当前 Coincides UI。
不要立即 full fork AFFiNE。
不要现在从零重开完整产品。
不要过早 GraphDB 迁移。

先保留 Coincides v2.x semantic substrate。
做 BlockSuite Edgeless-as-page + Coincides sidecar spike。
用 spike 结果决定：
  1. 正式采用 BlockSuite-first；
  2. 新 repo 重建；
  3. 回到 Coincides-owned editor/canvas。
```

这给 R14 的最终决策提供了清晰方向：下一阶段不是继续堆功能，而是进入 editor foundation 验证。
