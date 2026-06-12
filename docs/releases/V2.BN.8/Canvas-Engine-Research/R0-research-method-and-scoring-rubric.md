# R0 - Research Method And Scoring Rubric

> **状态**：V2.BN.8 Canvas Engine Research 方法论
> **作用**：定义本轮 Canvas Engine 选型调研的评价维度、证据等级、打分方法和 implementation gate。
> **结论边界**：本文不选择最终路线，只定义如何公平比较 DOM、SVG、HTML Canvas、WebGL、hybrid、existing engine 和 self-owned minimal engine。

## 1. 本文问题

V2.BN.8 需要回答：

```text
Coincides Canvas Engine 第一版应该如何选型？
```

但在回答之前，必须先防止三个偏差：

1. 因为当前 prototype 是 DOM/React，就默认继续 DOM。
2. 因为 AFFiNE 成熟，就默认照搬 BlockSuite。
3. 因为 canvas/WebGL 听起来性能强，就忽略文本编辑、公式、结构化字段和 source/relation truth。

所以本轮调研必须用同一套 rubric 比较候选路线。

## 2. 前置依据

本 rubric 来自：

- `docs/internal/V2.BN.7-Existing-Research-Intake.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`
- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md`

## 3. 证据等级

每个判断都要标注证据等级。

| 等级 | 说明 | 可用于最终路线决策吗 |
| --- | --- | --- |
| A | 官方文档、官方源码、官方示例、可复现本地 spike。 | 可以。 |
| B | GitHub issue/discussion、maintainer 评论、成熟项目源码推断。 | 可以，但要标注推断。 |
| C | 第三方文章、社区经验、benchmark 文章。 | 只能辅助。 |
| D | 我们的推测或产品直觉。 | 不能单独作为路线依据。 |

如果某条路线只有 C/D 级证据，不能直接选为主路线。

## 4. 必须比较的路线

本轮至少比较：

```text
DOM-first
SVG-first
HTML Canvas-first
WebGL / Pixi-style
DOM + SVG + canvas hybrid
AFFiNE / BlockSuite reference or substrate
tldraw
Excalidraw
React Flow / XYFlow
Konva
Fabric.js
self-owned minimal canvas engine
```

Electron / Tauri 桌面封装和 graph database / graph sidecar 暂时不进入本轮主调研。

## 5. 评分维度

每个候选路线按 1-5 分评分。

```text
1 = 明显不适合
2 = 可用但风险高
3 = 可行但需要约束
4 = 适合
5 = 非常适合
```

### 5.1 内容编辑稳定性

考察：

- 富文本；
- textarea / contenteditable；
- 中文输入法；
- 复制粘贴；
- selection；
- keyboard navigation；
- formula raw input；
- code block editing。

说明：

Coincides 是笔记软件，不是纯白板。内容编辑稳定性权重最高。

### 5.2 pan / zoom 下输入稳定性

考察：

- transform scale 下 caret 是否漂移；
- slash menu 是否能贴近 caret；
- selected text toolbar 是否稳定；
- zoom 后点击命中是否稳定；
- viewport state 是否能独立于 content truth。

### 5.3 Placement truth 清晰度

考察：

- x / y / width / height；
- rotation future；
- z-index；
- frame membership；
- PageFrame inside/outside；
- workspace object；
- clean reset / future migration。

### 5.4 Measurement 可控性

考察：

- paragraph auto-height；
- formula preview + input 展开；
- definition field editor；
- code block；
- future media placeholder；
- resize width 后 reflow；
- measurement cache invalidation。

### 5.5 Overlay 可控性

考察：

- selected block toolbar；
- slash menu；
- preview/debug panel；
- context menu；
- inspector future；
- z-index policy；
- viewport edge collision；
- overlay 是否影响 block measurement。

### 5.6 Performance / virtualization

考察：

- 100 / 500 / 1000 blocks；
- formula-heavy；
- future media-heavy；
- relation endpoint-heavy；
- viewport virtualization；
- zoom-level degradation；
- thumbnail / proxy future。

### 5.7 PageFrame / workspace 适配

考察：

- 一个主 PageFrame 是否自然；
- PageFrame 外 workspace 是否自然；
- PageFrame 内外对象能否共用坐标系；
- Page mode 是否能聚焦正式区域；
- Canvas mode 是否能展开 workspace；
- future multi-frame 是否不被堵死。

### 5.8 Relation endpoint reserve

考察：

- endpoint / port；
- anchor；
- connector layer；
- path route；
- edge label future；
- relation render budget；
- CanvasEdge 与 ObjectRelation 边界。

### 5.9 CanvasObject future reserve

考察：

- shape；
- freehand stroke；
- arrow；
- rough diagram；
- image annotation；
- region selection；
- AI 对区域截图/对象上下文的 future payload。

### 5.10 与 Coincides truth model 的兼容

考察：

- 是否允许 NoteBlock content truth 留在 Coincides Core；
- 是否允许 placement truth 留在 Coincides Core；
- 是否不强迫采用外部 document model；
- 是否允许 SourceReference / ObjectRelation / TemplateDefinition 独立存在；
- 是否容易从 truth rebuild projection。

### 5.11 Engineering complexity

考察：

- 开发成本；
- 学习成本；
- debug 难度；
- 与现有 React/Vite/TypeScript 项目接入难度；
- V2.BN.8.x 打磨成本。

### 5.12 Dependency / license / upgrade risk

考察：

- 许可；
- bundle size；
- release 稳定性；
- breaking changes；
- 是否会形成深度锁定；
- fallback 成本。

## 6. 权重建议

第一版权重：

| 维度 | 权重 |
| --- | --- |
| 内容编辑稳定性 | 5 |
| pan / zoom 下输入稳定性 | 5 |
| Placement truth 清晰度 | 5 |
| Measurement 可控性 | 5 |
| Overlay 可控性 | 4 |
| Performance / virtualization | 4 |
| PageFrame / workspace 适配 | 4 |
| 与 Coincides truth model 兼容 | 5 |
| Relation endpoint reserve | 3 |
| CanvasObject future reserve | 2 |
| Engineering complexity | 4 |
| Dependency / license / upgrade risk | 3 |

权重解释：

- 内容和 truth 边界优先于酷炫图形能力。
- Relation 和 CanvasObject 必须预留，但不是第一版主功能。
- 工程复杂度必须考虑，因为 V2.BN.8.x 会长期打磨。

## 7. 路线评分表模板

每个候选路线使用下表。

| 维度 | 分数 | 证据等级 | 说明 |
| --- | --- | --- | --- |
| 内容编辑稳定性 | TBD | TBD | TBD |
| pan / zoom 下输入稳定性 | TBD | TBD | TBD |
| Placement truth 清晰度 | TBD | TBD | TBD |
| Measurement 可控性 | TBD | TBD | TBD |
| Overlay 可控性 | TBD | TBD | TBD |
| Performance / virtualization | TBD | TBD | TBD |
| PageFrame / workspace 适配 | TBD | TBD | TBD |
| Relation endpoint reserve | TBD | TBD | TBD |
| CanvasObject future reserve | TBD | TBD | TBD |
| 与 Coincides truth model 兼容 | TBD | TBD | TBD |
| Engineering complexity | TBD | TBD | TBD |
| Dependency / license / upgrade risk | TBD | TBD | TBD |

最终报告必须给出加权总分，但不能只按分数机械决策。

## 8. Implementation Gate

只有满足以下条件，才能进入代码实现：

- 已写完 `Summary-Report.md`；
- 已明确推荐路线；
- 已解释为什么不选其他路线；
- 已同步 V2.BN.8 Plan / Specs；
- 已列出 Henry 待拍板事项；
- 没有发现阻止第一版 engine 样本的硬风险。

如果调研发现某个问题必须先做技术 spike，应把实现目标降级为 spike，而不是硬写完整 engine。

## 9. 本轮不评价的内容

本轮不评价：

- Electron / Tauri 桌面封装路线；
- graph database / graph sidecar；
- GraphRAG adapter；
- OCR / VLM source reconstruction；
- AI repagination proposal；
- full Template Studio；
- full Relation Runtime；
- full drawing / whiteboard product。

这些内容可以在报告中作为 future pressure 提及，但不参与主路线打分。

## 10. R0 结论

本轮 Canvas Engine 选型不是“找一个最强画布库”，而是选择一条最能支撑 Coincides 长期 truth model 和 Better Notebook 写作体验的工程路线。

因此最终推荐必须同时满足：

```text
能写
能排
能测量
能缩放
能选择
能 overlay
能大量承载
能预留 relation / CanvasObject
不交出 Coincides truth
```
