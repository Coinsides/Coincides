# V2.BN.8 Canvas Engine Research And Implementation Goal Prompt

> **用途**：本文保存 V2.BN.8 Canvas Engine Research + Canvas Engine Foundation Implementation 的目标模式提示词。
> 因为本目标较长，后续目标模式可以直接引用本文，而不是把完整目标重新粘贴到对话框。
> 本文是执行目标，不是最终设计结论；真正的路线选择必须在调研完成后写入 research summary、Plan、Spec 和相关 contract。

## Goal Prompt

请执行 V2.BN.8 Canvas Engine Research + Canvas Engine Foundation Implementation 目标。

## 总目标

本轮目标不只是写 outline，而是完成 V2.BN.8 Canvas Engine 的正式调研、路线选择、版本设计补充，并在新 branch 中开始实现第一版 Canvas Engine 样本。

核心原则：

- 不默认 Hybrid DOM + overlay 是最优解。
- 必须比较 DOM / SVG / HTML Canvas / WebGL / hybrid / existing engine 等路线。
- 最终推荐必须说明为什么选、为什么不选。
- Coincides Core 继续拥有 truth；Canvas Engine 只负责 spatial / placement / viewport / interaction truth，不接管内容 truth。
- 当前 branch 是 experiment / fallback / reference。
- 新 branch 是 Canvas Engine clean implementation branch。
- 不做多 frame 产品化。
- 不做 presentation mode。
- 不做完整 drawing tool。
- 第一版样本只做：
  - 一篇 Note；
  - 一个 NoteCanvas；
  - 最多一个主 PageFrame；
  - PageFrame 外 workspace；
  - NoteBlock placement；
  - selection / drag / resize / viewport；
  - 预留 CanvasObject / relation endpoint / region selection。

## Branch

从当前分支切出新 branch：

```text
codex/v2-bn-canvas-engine
```

要求：

- 切 branch 前先检查 git status；
- 不 reset；
- 不 revert 用户已有改动；
- 不删除未确认文件；
- 如果 branch 已存在，先汇报并切换到该 branch；
- 如果当前有未提交变更，保留这些变更并继续；
- 当前 branch 作为 fallback/reference，不破坏。

## Research 文件夹

在 V2.BN.8 局部文档区新建：

```text
docs/releases/V2.BN.8/Canvas-Engine-Research/
```

这个文件夹用于存放本轮 Canvas Engine 研究文档。

V2.BN.8 结束时，需要把这些研究文档迁移或复制到：

```text
docs/brainstorm/产品完善/Canvas Engine Research/
```

并在 `docs/releases/V2.BN.8/Plan.md` 中加入这条收口规则。

## 第一阶段：读取现有依据

开工前必须读取并吸收：

- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Workflow.md`
- `docs/releases/V2.BN.8/README.md`
- `docs/releases/V2.BN.8/Engineering-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Interaction-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Spike-And-Benchmark-Plan.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Fallback-Strategy.md`
- `docs/internal/V2.BN.7-Existing-Research-Intake.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/internal/V2.BN.7-Branch-Closure-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Route-Decision-Draft.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/workflow/Coincides-Workflow.md`

## 第二阶段：创建 Research Outline

在：

```text
docs/releases/V2.BN.8/Canvas-Engine-Research/Outline.md
```

写一份中文调研大纲。

Outline 必须回答：

- V2.BN.8 Canvas Engine 到底要解决什么问题；
- 为什么当前 NoteDetail 模拟 canvas runtime 走到边界；
- Canvas Engine 的第一版样本边界是什么；
- 哪些问题来自 V2.BN.7 research intake / gap report；
- 哪些问题来自 V2.BN.8 Plan / Workflow / Specs；
- 哪些问题必须通过联网调研；
- 哪些问题必须通过源码阅读；
- 哪些问题必须通过本地 spike / benchmark；
- 哪些问题需要 Henry 拍板；
- 研究完成后如何反哺 Plan / Engineering Spec / Contracts / Roadmap。

## 第三阶段：正式调研

允许联网调研。

允许 clone 外部源码，但要克制：

- 优先官方文档、官方 repo、源码结构、issue/discussion 中的 architecture/performance 信息；
- 不做无边界扩散；
- Electron 和图数据库 / graph sidecar 暂时不做；
- 主要根据 V2.BN.7 和 V2.BN.8 文档中列出的 research gap 来选择对象。

调研对象至少覆盖：

- AFFiNE / BlockSuite；
- tldraw；
- Excalidraw；
- React Flow / XYFlow；
- Konva；
- Fabric.js；
- SVG / DOM hybrid；
- pure HTML Canvas；
- WebGL / Pixi-style route；
- 自研 minimal canvas engine；
- existing engine integration vs self-owned engine。

每个对象都要回答：

- 它解决什么问题；
- 它的数据模型是什么；
- 它如何处理无限画布；
- 它如何处理 block / shape / frame；
- 它如何处理 selection / drag / resize / overlay；
- 它如何处理大量对象性能；
- 它是否适合富文本 / formula / code / structured block；
- 它是否适合 PageFrame + workspace；
- 它是否容易接入 Coincides truth model；
- 它的风险是什么；
- 它为什么适合或不适合 V2.BN.8。

调研文档全部中文。

建议至少创建：

- `R0-research-method-and-scoring-rubric.md`
- `R1-affine-blocksuite-edgeless-analysis.md`
- `R2-existing-canvas-engines-comparison.md`
- `R3-rendering-architecture-dom-svg-canvas-webgl.md`
- `R4-performance-virtualization-and-zoom-degradation.md`
- `R5-pageframe-workspace-and-frame-model.md`
- `R6-selection-drag-resize-overlay-state-machine.md`
- `R7-canvasobject-and-future-drawing-reserve.md`
- `R8-relation-endpoint-and-layer-reserve.md`
- `R9-route-decision-and-engine-recommendation.md`
- `Summary-Report.md`

## 第四阶段：调研结论与路线选择

写：

```text
docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md
```

报告必须明确：

- 推荐路线；
- 不推荐路线；
- 为什么不默认 hybrid；
- 如果最终推荐 hybrid，需要说明为什么它仍然是最合理选择；
- 第一版 engine 样本怎么做；
- 哪些能力需要推迟；
- 哪些 contract 需要补；
- 哪些 roadmap 需要改；
- 哪些东西需要 Henry 拍板。

## 第五阶段：更新 V2.BN.8 文档

根据调研结论，更新：

- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Workflow.md`
- `docs/releases/V2.BN.8/README.md`
- `docs/releases/V2.BN.8/Engineering-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Interaction-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Spike-And-Benchmark-Plan.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Fallback-Strategy.md`
- 必要时更新 `docs/Coincides-Better-Notebook-Roadmap.md`

要求：

- 加入 Canvas Engine Research 文件夹；
- 加入 V2.BN.8 结束后 research 文档迁移到 Brainstorm 的规则；
- 根据调研结论细化 V2.BN.8.x 小版本划分；
- 明确第一版 engine 样本的验收边界；
- 明确哪些 contract 需要新增或升级。

## 第六阶段：开始代码实现

调研和文档补充完成后，开始在新 branch 中实现第一版 Canvas Engine 样本。

要求：

- 先定位当前 NoteDetail / simulated canvas runtime / placement / block render 相关代码；
- 把当前实现当作 reference/fallback；
- 不直接大规模删除，先建立新 Canvas Engine 结构；
- 新 engine 稳定后，再逐步替换旧模拟层；
- 如果确实需要删除旧模拟代码，先确认引用范围，避免破坏 route / note loading / block persistence；
- 第一版效果尽量靠近当前产品雏形；
- 不追求多 frame；
- 不做完整 drawing tool；
- 不做 presentation mode；
- 不做 Source Library / Relation Runtime / GraphRAG / Template Studio。

第一版 engine 样本至少支持：

- NoteCanvas root；
- 一个主 PageFrame；
- PageFrame 外 workspace；
- NoteBlock placement；
- 创建 text block；
- 渲染已有 block；
- selection；
- drag；
- resize；
- basic viewport / pan / zoom seed；
- PageFrame 内外 block 不混乱；
- placement truth 与 content truth 分离；
- 预留 CanvasObject / relation endpoint / region selection 的数据和架构位置。

## 第七阶段：验证

验收方式由执行者制定，但至少包括：

文档验证：

- Research folder 存在；
- Outline 存在；
- R0-R9 或等价调研文档存在；
- Summary Report 存在；
- Plan / Workflow / README / Specs 已同步；
- Roadmap 如有必要已同步；
- 所有文档中文可读；
- 不把 hybrid 当默认结论。

工程验证：

- 能启动 client/server；
- 能打开一篇 note；
- 能看到 NoteCanvas；
- 能看到一个主 PageFrame；
- 能创建 / 渲染 / 选择 / 拖动 / resize block；
- PageFrame 外 workspace 不污染 PageFrame；
- 没有明显 overlap / toolbar / overlay 失控；
- browser smoke 至少跑一次；
- 如果引入 benchmark seed，记录结果。

命令验证：

- `git diff --check`
- changed-file secret scan
- TypeScript / lint / build / test 按当前项目可用命令执行；如果不能执行，要说明原因。

## 输出要求

完成后汇报：

- branch 是否创建成功；
- research 文件夹和调研文档清单；
- 最终推荐的 Canvas Engine 路线；
- 为什么选它；
- 为什么不选其他路线；
- V2.BN.8 Plan / Specs / Roadmap 改了什么；
- 第一版 Canvas Engine 样本实现了什么；
- 哪些地方仍需 Henry 拍板；
- 验证结果；
- 未完成或风险项。

## 执行保护

执行时应拆成两个大段：

1. 先研究与文档；
2. 后动代码。

如果研究结论显示当前设想不适合立刻写 engine，应先停在路线报告和版本设计补充，不要硬写一套明显会返工的代码。
