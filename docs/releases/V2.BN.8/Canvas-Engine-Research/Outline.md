# V2.BN.8 Canvas Engine Research Outline

> **状态**：V2.BN.8 正式调研目录
> **位置**：`docs/releases/V2.BN.8/Canvas-Engine-Research/`
> **目标**：为 V2.BN.8 Canvas Engine Foundation 选择工程路线，并把调研结论反哺 V2.BN.8 Plan、Spec、Contract、Roadmap 和后续代码实现。
> **重要原则**：Hybrid DOM + overlay 只是候选路线，不是默认结论。本调研必须比较 DOM、SVG、HTML Canvas、WebGL、hybrid、existing engine 和 self-owned minimal engine。

## 1. 调研背景

V2.BN.1 到 V2.BN.7 已经证明：

```text
NoteBlock + placement 的产品方向成立。
PageFrame + FrameOutsideWorkspace 的概念成立。
当前 NoteDetail.tsx runtime 已经足够作为 prototype / fallback / reference。
当前 runtime 不适合作为长期 Canvas Engine 地基。
```

V2.BN.8 的目标不是做完整无限画布产品，而是建立一个可靠的 Canvas Engine 地基：

```text
一篇 Note
一个 NoteCanvas
最多一个主 PageFrame
PageFrame 外 workspace
NoteBlock placement
selection / drag / resize / viewport
预留 CanvasObject / relation endpoint / region selection
```

本调研要回答：Coincides 应该如何实现这个地基。

## 2. 本轮调研必须遵守的边界

### 2.1 Coincides Core 继续拥有 truth

Canvas Engine 不拥有：

- NoteBlock content truth；
- FieldValue truth；
- SourceReference truth；
- ObjectRelation truth；
- TemplateDefinition truth；
- GraphRAG / OCR / VLM / external editor adapter truth。

Canvas Engine 只负责：

- spatial / placement；
- viewport；
- selection；
- hit-testing；
- measurement；
- overlay anchor；
- interaction runtime；
- future CanvasObject / relation endpoint reserve。

### 2.2 不默认任何路线

本调研禁止提前默认：

- hybrid 一定最好；
- self-owned 一定最好；
- BlockSuite 一定太重；
- DOM 一定不够；
- Canvas 一定性能最好；
- WebGL 一定过度工程。

每条路线必须按同一 rubric 评估。

### 2.3 V2.BN.8 不做的事情

本轮不把以下内容作为第一版 engine 样本目标：

- 多 frame 产品化；
- presentation mode；
- 完整 drawing tool；
- Source Library；
- Relation Runtime；
- GraphRAG adapter；
- Template Studio 产品化；
- OCR / VLM source reconstruction；
- Electron / Tauri 桌面封装选型；
- graph database / graph sidecar 选型。

## 3. 前置依据

调研前必须吸收这些结论：

- `docs/internal/V2.BN.7-Existing-Research-Intake.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/internal/V2.BN.7-Branch-Closure-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Route-Decision-Draft.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`
- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Workflow.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Interaction-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Spike-And-Benchmark-Plan.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Fallback-Strategy.md`

## 4. 核心研究问题

### Q1: Canvas Engine 的底层路线应该是什么？

候选路线：

- DOM-first；
- SVG-first；
- HTML Canvas-first；
- WebGL / Pixi-style；
- DOM + SVG + canvas hybrid；
- 基于 existing engine；
- self-owned minimal canvas engine。

必须回答：

- 哪条路线最适合富文本、LaTeX、code、structured block？
- 哪条路线最适合 PageFrame + workspace？
- 哪条路线最容易保护 Coincides truth layer？
- 哪条路线最容易支撑 relation endpoint / future CanvasObject？
- 哪条路线性能风险最大？
- 哪条路线开发风险最大？

### Q2: pan / zoom 下文本编辑如何稳定？

必须验证：

- textarea / contenteditable 在 transform scale 下 caret 是否稳定；
- 中文输入法是否稳定；
- 复制粘贴长文本是否稳定；
- slash menu anchor 如何定位；
- selected text toolbar 如何定位；
- focus / selected / editing state 如何分层；
- undo/redo 边界如何设定。

### Q3: measurement / auto-height 应该由谁负责？

必须回答：

- paragraph 高度如何测量；
- formula preview + LaTeX input 展开如何测量；
- definition fields 如何测量；
- code block 如何测量；
- resize width 后如何 reflow；
- measurement cache 何时 invalidated；
- measurement 是否进入 engine service；
- block 高度变化如何推动下方布局或避免 overlap。

### Q4: overlay / portal / popover 应该怎样分层？

必须回答：

- block control bar 属于哪个 layer；
- preview panel 属于哪个 layer；
- slash menu 如何 anchor；
- context menu / inspector future 如何接入；
- z-index policy 如何定义；
- overlay 是否影响 block measurement；
- overlay 如何处理 viewport edge collision；
- pan/zoom 下 overlay 坐标如何从 world coordinate 转 screen coordinate。

### Q5: 大量 block 的性能边界在哪里？

必须设计 benchmark：

- 100 text blocks；
- 500 text blocks；
- 1000 text blocks；
- 100 formula blocks；
- mixed definition / formula / code；
- workspace outside PageFrame blocks；
- relation endpoint reserve seed。

必须回答：

- 首屏加载是否可接受；
- pan/zoom 是否可接受；
- selection 是否可接受；
- drag / resize 是否可接受；
- overlay toggle 是否可接受；
- 哪些对象可以 virtualization；
- zoomed-out 时是否需要 LOD / thumbnail / proxy。

### Q6: PageFrame / workspace / future frame model 怎么定义？

必须回答：

- PageFrame 是 object、area 还是 runtime boundary；
- workspace object 是否属于同一 NoteCanvas；
- PageFrame 外对象默认是否 hidden in page mode；
- workspace object 是否默认 excluded from export；
- future multi-frame 如何不推翻第一版；
- frame export boundary 如何 seed；
- frame thumbnail / selected frame export 是否后置。

### Q7: relation endpoint reserve 如何不堵死未来？

V2.BN.8 不做完整 Relation Runtime，但必须预留：

- connector endpoint；
- port / anchor；
- relation layer；
- route/path layer；
- edge label future；
- relation render budget future；
- CanvasEdge 与 ObjectRelation 的边界。

必须回答：

- endpoint 是否属于 placement truth；
- port 是固定、边缘推导、还是用户可移动；
- connector path 是否应 SVG；
- zoom/pan 下 path 如何跟随；
- relation-heavy 场景如何按需渲染。

### Q8: CanvasObject / future drawing reserve 应该如何预留？

V2.BN.8 不做完整 drawing tool，但必须考虑：

- shape；
- freehand stroke；
- arrow；
- rough diagram；
- image annotation；
- region selection；
- AI 对选区截图/对象上下文的 future payload。

必须回答：

- CanvasObject 是否与 NoteBlock 平级；
- CanvasObject 是否拥有自己的 content truth；
- CanvasObject placement 是否复用 placement model；
- CanvasRegionContext future 如何抽象；
- 这些预留是否会干扰第一版实现。

### Q9: existing engine 是否值得接入？

必须比较：

- AFFiNE / BlockSuite；
- tldraw；
- Excalidraw；
- React Flow / XYFlow；
- Konva；
- Fabric.js；
- Pixi/WebGL-style engine；
- minimal self-owned engine。

每个对象必须回答：

- 是否适合富文本；
- 是否适合 structured NoteBlock；
- 是否适合 PageFrame；
- 是否适合 workspace；
- 是否适合 relation endpoint；
- 是否容易接入 Coincides Core；
- 是否会反向定义 truth；
- 是否有 license / bundle / complexity 风险；
- 是否适合作为 reference、dependency、fallback 或不采用。

## 5. 调研产物结构

本文件夹至少包含：

```text
Outline.md
R0-research-method-and-scoring-rubric.md
R1-affine-blocksuite-edgeless-analysis.md
R2-existing-canvas-engines-comparison.md
R3-rendering-architecture-dom-svg-canvas-webgl.md
R4-performance-virtualization-and-zoom-degradation.md
R5-pageframe-workspace-and-frame-model.md
R6-selection-drag-resize-overlay-state-machine.md
R7-canvasobject-and-future-drawing-reserve.md
R8-relation-endpoint-and-layer-reserve.md
R9-route-decision-and-engine-recommendation.md
Summary-Report.md
```

允许根据调研发现增加补充文档，但不能让调研无限扩散。

## 6. 每篇报告的固定格式

每篇 R-series 报告都应包含：

```text
本文问题
前置依据
调研对象 / 证据来源
核心发现
对 Coincides 的意义
推荐
风险
需要 Henry 拍板的问题
需要同步到哪些文档
```

涉及外部资料时，必须记录来源 URL 或本地 clone 路径。

## 7. 评分维度

R0 必须定义评分 rubric，至少包括：

- 内容编辑稳定性；
- pan/zoom 下输入稳定性；
- placement truth 清晰度；
- measurement 可控性；
- overlay 可控性；
- performance / virtualization；
- PageFrame/workspace 适配；
- relation endpoint reserve；
- CanvasObject future reserve；
- 与 Coincides truth model 的兼容；
- engineering complexity；
- dependency / license / upgrade risk；
- fallback 成本。

## 8. 调研后的反哺规则

调研完成后必须同步：

- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Workflow.md`
- `docs/releases/V2.BN.8/README.md`
- `docs/releases/V2.BN.8/Engineering-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Architecture-Spec.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Interaction-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Spike-And-Benchmark-Plan.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Fallback-Strategy.md`
- 必要时同步 `docs/Coincides-Better-Notebook-Roadmap.md`

必须在 `Plan.md` 记录：

```text
V2.BN.8 结束时，Canvas-Engine-Research/ 需要迁移或复制到
docs/brainstorm/产品完善/Canvas Engine Research/
```

## 9. 调研完成后的 implementation gate

只有当以下条件满足后，才能进入代码实现：

- `Summary-Report.md` 明确推荐路线；
- 推荐路线解释了为什么选、为什么不选其他路线；
- 不把 hybrid 当默认结论；
- V2.BN.8 Plan / Specs 已同步；
- 第一版 engine 样本边界已明确；
- 需要 Henry 拍板的问题已列出；
- 没有发现“当前设想不适合立刻写 engine”的硬阻塞。

如果调研结论显示当前设想不适合立刻写 engine，应停在路线报告和版本设计补充，不硬写会返工的代码。

## 10. 预期结论类型

本调研最终允许出现以下几种结论：

```text
推荐 self-owned minimal engine + DOM/SVG/canvas 分层；
推荐 existing engine adapter；
推荐先做 PageFrame-first fallback；
推荐推迟 implementation，先做更小 spike；
推荐重新评估 BlockSuite Edgeless；
推荐某路线作为 reference only。
```

无论结论是什么，都必须服务 V2.BN.8 的真实目标：

```text
稳定坐标
稳定测量
稳定选择
稳定 overlay
稳定 truth boundary
稳定 fallback
```
