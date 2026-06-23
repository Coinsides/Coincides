# V2.BN.8 Plan - Canvas Engine And TextFlow Foundation

## 2026-06-22 Continuation Lane

The active V2.BN.8 continuation is the ContentGroup Editor maturity lane.

Current order:

```text
8.6.27
  Groups Rail v2 as lightweight collection surface

8.6.28
  Single ContentGroup Editor Petal v1

8.6.29
  Draft Range / Label drop to Page / Canvas copied TextBlock

8.6.30
  Draft Range / Label copy-insert into TextFlow, with destructive move deferred

8.6.31
  ContentGroup OpenDesign visual parity and interaction cleanup
```

After this lane, documentation closure should re-check Product, PRD, Roadmap, ContentGroup/GroupFolder Contract, Petal Contract, TextFlow Contract, Notebook Object Inventory, Relation Product Design, and Open Issue.

> **For agentic workers:** V2.BN.8 是 Canvas Engine clean branch 和 TextFlow seed 的地基版本，不是完整无限画布产品版，也不是完整富文本/结构化编辑器产品版。执行本计划前，必须先阅读 V2.BN.6 / V2.BN.7 产物，尤其是 truth-layer contract、runtime autopsy、branch closure、Canvas Engine requirement 和 research gap。不要把本阶段扩展成 Structure Studio、Source Library、Relation Runtime、GraphRAG adapter 或完整 AFFiNE/BlockSuite integration。

## Summary

V2.BN.8 的目标是把 Better Notebook 从当前 `NoteDetail.tsx` 里的 page-like / canvas-like prototype，推进到真正的 canvas-native runtime 地基，并把文字内容从粗粒度 NoteBlock-only 推进到 TextBlock / TextUnit / InlineStructure 的第一版地基。2026-06-18 之后的新口径是：TextFlow 是内容根，AnnotationTruth 是标记层，ContentRange 是定位根，ContentGroup / Petal / ContentGroup identity/status 承担后续严肃内容包、内容包内部组成和解释状态方向。`TextUnitGroup` 只保留为已实现的历史 seed / ContentGroup 前身，后续应改造或移除。

核心判断：

```text
当前 branch = experiment / fallback / reference
V2.BN.8 = clean branch Canvas Engine And TextFlow Foundation
V2.BN.8.x = Canvas / TextFlow reliability and UX polish buffer
V2.BN.9 = Structure Studio And Editor Productization
```

V2.BN.8 不追求一次性做完完整无限画布。它只负责证明：

```text
NoteCanvas 可以成立
PageFrame 可以成立
PageFrame 外 workspace 可以成立
placement / selection / measurement / overlay / viewport 可以稳定协作
TextFlow 可以在代码层被识别、投影和安全 fallback
旧 runtime 的自然写作经验可以被迁移，而不是被丢掉
```

## Stage Position

```text
V2.BN.6
  Better Notebook Data Contract
  -> truth layer / contract / adapter boundary

V2.BN.7
  Runtime Autopsy, Branch Closure, And Canvas Engine Gate
  -> current branch 收口
  -> runtime 经验表
  -> Canvas Engine requirement / gap / route decision

V2.BN.8
  Canvas Engine And TextFlow Foundation
  -> clean branch
  -> NoteCanvas / PageFrame / workspace
  -> coordinate / viewport / placement / measurement / selection / overlay
  -> TextBlock / TextUnit / InlineStructure seed
  -> AnnotationTruth marker seed
  -> ContentRange / GroupFolder / ContentGroup / Petal / ContentGroup identity/status direction

V2.BN.8.x
  Canvas / TextFlow Reliability And UX Polish Buffer
  -> 反复打磨直到工程可靠和体验可靠
```

## Active References

V2.BN.8 开始前必须阅读：

- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/releases/V2.BN.6-plan.md`
- `docs/releases/V2.BN.6-engineering-spec.md`
- `docs/releases/V2.BN.6-review.md`
- `docs/releases/V2.BN.7-plan.md`
- `docs/releases/V2.BN.7-engineering-spec.md`
- `docs/releases/V2.BN.7-review.md`
- `docs/releases/V2.BN.7-experience-review.md`
- `docs/internal/V2.BN.6-Truth-Layer-Audit-And-Recommendations.md`
- `docs/internal/V2.BN.7-Existing-Research-Intake.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/internal/V2.BN.7-Branch-Closure-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Route-Decision-Draft.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/ContentGroup-GroupFolder-Contract.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`
- `docs/contracts/Link-Source-Relation-Boundary-Contract.md`
- `docs/contracts/Source-Provenance-Contract.md`
- `docs/contracts/Template-Category-Contract.md`
- `docs/contracts/TextFlow-Contract.md`
- `docs/brainstorm/BetterNoteBook Research/R7-editor-runtime-route-decision.md`
- `docs/brainstorm/BetterNoteBook Research/R9-performance-scale-and-rebuild-benchmark.md`
- `docs/brainstorm/产品完善/PI-046 Research/R10-affine-edgeless-canvas-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R11-coincides-affine-data-model-bridge.md`

## V2.BN.8 Local Document Set

V2.BN.8 使用专用局部文档区：

```text
docs/releases/V2.BN.8/
```

这是一个 debug / intensive 文档区，用于承载第八阶段和后续 `V2.BN.8.x` 小版本的密集工程思考。它不替代全局 workflow、PRODUCT、PRD、Architecture、Data Model 或 roadmap。

### 本地文档职责

| 文件 | 职责 |
| --- | --- |
| `README.md` | 说明 V2.BN.8 文档区的用途、文件分工和 promotion 候选。 |
| `Plan.md` | 本文件，定义 V2.BN.8 的阶段目标、优先级、验收和收口规则。 |
| `Workflow.md` | V2.BN.8 / V2.BN.8.x 的 debug workflow，规定小版本如何同步文档、验证和收口。 |
| `Canvas-Engine-Research/` | 记录 V2.BN.8 正式 canvas engine 补调研、工具比较、路线选择和 Summary。 |
| `Engineering-Spec.md` | 记录工程边界、模块拆分、测试/验证矩阵。 |
| `Canvas-Engine-Architecture-Spec.md` | 记录 NoteCanvas、PageFrame、workspace、viewport、layer、measurement、selection 等架构合同。 |
| `Canvas-Engine-Interaction-Contract.md` | 记录用户操作合同：创建、选择、拖动、resize、slash、toolbar、preview、page/workspace 行为。 |
| `Canvas-Engine-State-And-Data-Contract.md` | 记录 content truth、placement truth、runtime state、viewport state、undo boundary 和 clean reset。 |
| `Canvas-Engine-Spike-And-Benchmark-Plan.md` | 记录技术 spike、browser smoke、100/500/1000 block、formula-heavy 等 benchmark。 |
| `Canvas-Engine-Fallback-Strategy.md` | 记录自研 Canvas Engine 的失败阈值、退路和路线复盘条件。 |
| `Experience-Review.md` | 记录第八阶段体验审查，尤其是新 Canvas 是否接近或超过旧 runtime。 |
| `Review.md` | 记录工程质量、风险、验证结果和 Henry 待拍板问题。 |
| `CHANGELOG.md` | 记录 V2.BN.8 / V2.BN.8.x 文档、patch、polish 和收口变更。 |

### 同步原则

- `Workflow.md` 是执行 V2.BN.8.x 的局部规则。
- 修改 canvas 架构时，同步 Architecture Spec、Engineering Spec 和必要的全局 Architecture。
- 修改用户操作时，同步 Interaction Contract、Experience Review 和必要的 UX Inventory。
- 修改 state/data truth 时，同步 State/Data Contract、Engineering Spec 和必要的 DATA_MODEL。
- 代码实现前必须先完成 `Canvas-Engine-Research/Summary-Report.md`，并把路线选择同步到 Plan / Workflow / Specs / Roadmap。
- 小版本 patch/polish/bugfix 收口时，至少更新 Review、Experience Review、CHANGELOG。
- V2.BN.8 总收口时必须执行 document promotion / merge review。

### Route Lock - 2026-06-12

本轮正式调研已经锁定 V2.BN.8 第一版推荐路线：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
  DOM NoteBlock content layer
  SVG/DOM overlay layer
  CSS transform viewport
  explicit world/screen coordinate conversion
  measurement cache
  visible window
  PageFrame + Workspace unified coordinate model
  CanvasObject / RelationEndpoint placeholders
```

这里的 `Hybrid` 是调研后的工程结论，不是默认假设。V2.BN.8 已比较 DOM / SVG / HTML Canvas / WebGL / hybrid / existing engine；排除直接采用 tldraw、Excalidraw、React Flow、Konva、Fabric.js、PixiJS、BlockSuite 作为主 runtime。它们保留为参考或未来局部 adapter，不进入第一版 canonical runtime。

路线证据见：

- `Canvas-Engine-Research/R1-affine-blocksuite-edgeless-analysis.md`
- `Canvas-Engine-Research/R2-existing-engine-matrix.md`
- `Canvas-Engine-Research/R3-rendering-route-comparison.md`
- `Canvas-Engine-Research/R9-route-decision-report.md`
- `Canvas-Engine-Research/Summary-Report.md`

## Starting Decisions

### 1. Clean branch first

V2.BN.8 应默认新开 clean branch。

原因：

- 当前 `NoteDetail.tsx` runtime 是成功 prototype，但不是长期 engine；
- 当前 `better_notebook_layout` 是实验性 layout payload；
- 项目尚未公开投入使用，暂时没有真实用户数据迁移债；
- clean branch 可以避免为了早期实验数据写长期 converter。

### 2. Coincides Core 继续拥有 truth

Canvas Engine 只拥有 runtime / projection / interaction，不拥有 canonical truth。

不可让 Canvas Engine 反向定义：

- NoteBlock content truth；
- placement / layout truth；
- source provenance truth；
- ObjectRelation truth；
- TemplateDefinition / FieldValue truth；
- GraphRAG / OCR / VLM / AFFiNE / BlockSuite adapter truth。

### 3. 先做 engine，不急着做上层功能

V2.BN.8 不做 Structure Studio、Source Library、Relation Runtime。原因不是这些不重要，而是它们都依赖稳定 Canvas Engine 和 TextFlow seed。

### 4. 保留当前 branch 作为 fallback

如果 self-owned Canvas Engine 证明不可控，当前 branch 可以作为：

- finite large canvas fallback；
- old UX reference；
- anti-pattern library；
- last-known usable notebook surface。

## Priority Model

V2.BN.8 的优先级分为四层：

```text
R0: 开工准备和 clean branch gate
P0: Engine survival layer
P1: TextFlow, writing, and block interaction layer
P2: Reliability, scale, and overlay layer
P3: Frame/export/relation reserve layer
```

其中：

- R0 和 P0 是 V2.BN.8 的真正门槛；
- P1 是为了恢复 V2.BN.1-V2.BN.5 已经磨出的用户手感；
- P2 是为了进入 V2.BN.8.x 打磨；
- P3 只做预留，不展开完整上层功能。

## R0 - Startup / Clean Branch / Research Intake

### 目标

确保 V2.BN.8 是在正确地基上开工，而不是在旧 runtime 上继续堆补丁。

### 必须完成

- 创建或切换到 Canvas Engine clean branch；
- 记录 branch 名称和创建时间；
- 读取 active references；
- 读取 V2.BN.7 三张表：
  - Table A: Keep As Product Rule；
  - Table B: Keep As Warning；
  - Table C: Rebuild As Engine Feature；
- 确认当前 branch 作为 fallback/reference 保留；
- 确认不为 `better_notebook_layout` 写长期 converter；
- 确认第一阶段允许 clean layout reset；
- 确认 CodeGraph / local search 可用；
- 确认 dev server / test commands；
- 建立 V2.BN.8 engineering spec / review / experience review / changelog 初始文件。

### R0 输出

```text
docs/releases/V2.BN.8/Engineering-Spec.md
docs/releases/V2.BN.8/Review.md
docs/releases/V2.BN.8/Experience-Review.md
docs/releases/V2.BN.8/CHANGELOG.md
```

### R0 验收

- clean branch 已创建或明确记录为什么暂不创建；
- V2.BN.7 的 intake/autopsy/closure/gap/route 已被引用；
- 本阶段不再把旧 `NoteDetail.tsx` runtime 当长期地基；
- R0 文档明确当前 branch 是 fallback/reference。

## P0 - Engine Survival Layer

第一优先级：先让 Canvas Engine 活下来。

### 目标

建立最小可运行 canvas-native runtime，使一篇 note 拥有统一 NoteCanvas，一个正式 PageFrame，以及 PageFrame 外 workspace。

### 必须完成

#### 1. NoteCanvas Shell

需要实现：

- NoteCanvas runtime root；
- canvas coordinate system；
- viewport state；
- pan / zoom seed；
- world coordinate 和 screen coordinate 转换；
- viewport persistence seed；
- canvas background / grid seed。

最低验收：

- 可以打开 note；
- 可以看到 PageFrame；
- 可以移动视野；
- 可以缩放视图；
- viewport 改变不会破坏 block 数据。

#### 2. PageFrame

需要实现：

- 默认 PageFrame；
- PageFrame geometry；
- PageFrame 内部正式内容区域；
- PageFrame 外 workspace 区域；
- PageFrame export boundary seed；
- PageFrame visual boundary。

最低验收：

- PageFrame 是 canvas 上的对象/区域，而不是 DOM 页面假象；
- PageFrame 外的对象不会被硬夹回 PageFrame；
- PageFrame 内外边界可解释。

#### 3. Canvas Placement Model

需要实现最小 placement：

```text
placement_id
object_id
object_kind
canvas_id
frame_id optional
x
y
width
height
rotation future
z_index
boundary_role
visibility_state
connector_ports future
```

最低验收：

- block 可在 PageFrame 内放置；
- block 可在 workspace 放置；
- x/y/width/height 保存和读取稳定；
- content truth 与 placement truth 分离。

#### 4. Selection / Hit Testing

需要实现：

- click select；
- blank click clear selection；
- drag start detection；
- resize handle hit testing seed；
- page/frame hit testing；
- selected state 不污染 content truth。

最低验收：

- pan/zoom 后仍能选中正确对象；
- selected toolbar 不改变 block measurement；
- 空白处点击能清除选中。

#### 5. Measurement / AutoHeight Seed

需要实现：

- paragraph measurement；
- definition block field measurement；
- formula block preview/input measurement；
- resize width 后 reflow；
- measurement cache invalidation seed。

最低验收：

- 长文本不溢出；
- formula input 展开不压住下方 block；
- resize 不造成 overlap；
- block 高度不是靠局部猜测硬补。

### P0 不做

- 不做完整 relation path；
- 不做完整 multi-frame export；
- 不做 Structure Studio；
- 不做 source picker；
- 不做 GraphRAG。

### P0 验收

- 一个 note 能稳定打开为 NoteCanvas；
- 一个 PageFrame 能显示；
- PageFrame 内外对象能区分；
- block 能选中、移动、resize；
- text reflow 和 auto-height 不 overlap；
- viewport 能 pan/zoom；
- 旧 prototype 的核心写作数据可以用测试 seed 重建。

## P1 - TextFlow, Writing, And Block Interaction Layer

第二优先级：恢复旧 runtime 已经磨出的写作手感，并把写作真相层从 NoteBlock-only 推进到 TextFlow-aware。

### 目标

让 Canvas Engine 不是只有技术骨架，而是恢复 V2.BN.1-V2.BN.5 已经证明有价值的写作体验。同时建立第一版 `TextBlock -> TextUnit -> InlineStructure` 的代码种子，并在 V2.BN.8.5 起建立 `AnnotationTruth` 标记层。2026-06-18 之后，后续 AI、source、relation 和 Structure Studio 应转向读取 ContentRange / GroupFolder / ContentGroup / Petal / ContentGroup identity/status，而不是只能读取整个 NoteBlock 或把所有意义压到 annotation 上。已实现的 `TextUnitGroup` 只作为 ContentGroup 前身 / 历史 seed 保留，后续要么改造为 ContentGroup workflow，要么移出普通 UX。

### 必须完成

#### 1. Natural Writing Entry

需要实现：

- PageFrame 内双击空白创建 text block；
- 空 block 失焦且无内容时清除；
- Enter 软换行；
- Ctrl+Enter 新建 block；
- paste long text 不重复、不撑爆 layout；
- keyboard focus 与 selection 分离。

#### 2. Slash Command

需要实现：

- slash menu 出现在光标附近；
- default / math / userDefined 分组；
- text / definition / formula / code / source quote seed；
- 空 block 中 slash 创建；
- 非空 block 的 convert 只做保守转换，不做机械语义猜测。

#### 2.5 TextFlow Seed

需要实现：

- `TextBlockContentV1` 类型种子；
- `TextUnit` 类型种子；
- `InlineStructure` 类型种子；
- `TextUnitGroup` legacy range helper 类型种子 under review；
- fresh TextBlock -> one paragraph TextUnit 初始化路径；
- TextFlow projection / debug helper；
- malformed / unsupported TextFlow 的安全 fallback；
- 不做完整 TextUnit tree editor，不继续扩展 TextUnitGroup visual editor；后续优先设计 ContentGroup / Petal editor。

#### 3. Block Control Bar

需要实现：

- selected block control bar；
- control bar 进入 overlay layer；
- move/resize controls 不遮挡内容；
- type display contextual；
- AI/export/type badge 默认不常驻。

#### 4. Structured Field Editing

需要实现：

- definition 的 `concept_name` / `description`；
- formula 的 `latex_input`；
- formula preview；
- field value 是 content truth；
- field layout 暂时只做固定视觉样板，不进入完整 Structure Studio。

### P1 验收

- 用户能自然创建 text block；
- 新建普通文本可以从一开始进入 TextUnit 路径；
- TextFlow projection/debug helper 可以读取 TextUnit，并可读取 legacy TextUnitGroup seed 作为过渡；
- 用户能用 slash 创建 formula；definition 入口只保留为 future annotation command，不创建独立 DefinitionBlock；
- formula 能显示 preview；
- definition 能编辑字段；
- control bar 不打断阅读；
- selected / active / editing 状态可解释；
- 体验至少接近当前 prototype。

## P2 - Reliability, Scale, And Overlay Layer

第三优先级：让 Canvas Engine 开始可靠。

### 目标

解决旧 runtime 反复暴露的问题：overlay、popover、measurement、large document、debug preview。

### 必须完成

#### 1. Overlay / Portal Layer

需要实现：

- selected toolbar layer；
- slash menu layer；
- preview panel layer；
- context menu layer seed；
- z-index policy；
- viewport edge collision；
- transformed coordinate anchoring。

#### 2. Preview / Debug Overlay

需要实现：

- block type overlay；
- AI visibility overlay；
- export status overlay；
- overlay state persistence；
- folded preview sections；
- preview panel 不遮挡 selected toolbar。

#### 3. Performance Smoke

需要准备测试 seed：

```text
100 text blocks
500 text blocks
1000 text blocks
100 formula blocks
mixed definition / formula / code blocks
workspace outside PageFrame blocks
```

最低验收：

- 100 blocks 稳定；
- 500 blocks 可接受；
- 1000 blocks 能暴露瓶颈并记录；
- pan/zoom/selection/resize 有明确性能观察。

#### 4. Operation History Seed

需要实现或至少定义：

- move undo；
- resize undo；
- content edit undo boundary；
- delete/restore seed；
- operation history 和 persistence 的边界。

### P2 验收

- overlay 不再和 content layer 混乱；
- debug preview 可用；
- large document 有 smoke 结果；
- 1000 blocks 如果不达标，必须进入 V2.BN.8.x 风险清单；
- undo/redo 至少有 engine-level seed。

## P3 - Frame / Export / Relation Reserve Layer

第四优先级：只做预留，不做完整上层产品。

### 目标

给后续 Source、Relation、Template、Export 留路，避免 Canvas Engine 第一版把路堵死。

### 必须完成

#### 1. Frame Export Boundary Seed

需要定义：

- PageFrame 可导出；
- workspace 默认不导出；
- selected frame export future；
- frame metadata；
- frame thumbnail future。

第一版可以只做数据和 visual boundary，不必实现完整 PDF/export engine。

#### 2. Relation Connector Endpoint Reserve

需要定义或实现 seed：

- connector port / endpoint reserve；
- object anchor；
- relation layer visibility future；
- CanvasEdge 与 ObjectRelation 边界；
- relation render budget future。

不做完整 relation runtime。

#### 3. Media / Formula / Source Pressure Reserve

需要记录：

- image/video/audio future block 对 measurement 的压力；
- source badge / source anchor overlay 的压力；
- formula-heavy 渲染压力；
- future source reconstruction output 如何进入 placement。

### P3 验收

- Canvas placement 没有堵住 connector endpoint；
- PageFrame export boundary 可以解释；
- media/source/formula future pressure 已记录；
- relation runtime 后续能接入，不需要推翻 placement model。

## Work Plan Checklist

### R0: Startup And Clean Branch Gate

- [x] 创建或切换到 V2.BN.8 clean branch；
- [x] 记录 branch 名称：`codex/v2-bn-canvas-engine`；
- [x] 阅读 active references；
- [x] 确认当前 branch fallback/reference 状态；
- [x] 确认不为 `better_notebook_layout` 写长期 converter；
- [x] 确认允许 clean layout reset；
- [x] 创建 V2.BN.8 engineering/review/experience/changelog 文件；
- [x] 建立 Canvas Engine Research 文件夹和 R0-R9/Summary 调研文档；
- [x] 确认 dev/test/browser workflow。

### P0: Engine Survival

- [x] 建立 NoteCanvas shell seed；
- [x] 建立 coordinate transform；
- [x] 建立 viewport / pan / zoom seed；
- [x] 建立 PageFrame；
- [x] 建立 FrameOutsideWorkspace 概念边界；
- [x] 建立 placement model；
- [ ] 建立 selection / hit testing；
- [x] 建立 measurement / auto-height seed；
- [ ] 完成 P0 browser smoke。

### P1: TextFlow, Writing, And Block Interaction

- [ ] 实现 natural writing entry；
- [ ] 实现 empty block cleanup；
- [ ] 实现 TextFlow type seed；
- [ ] 实现 fresh TextBlock -> one paragraph TextUnit 初始化路径；
- [ ] 实现 TextFlow projection/debug helper；
- [ ] 将已实现的 TextUnitGroup seed 评估为 ContentGroup workflow 前身：可改造则改造，不可改造则移出普通 UX；
- [ ] 实现 slash command near caret；
- [ ] 实现 default / math / userDefined command groups；
- [ ] 实现 definition field editing；
- [ ] 实现 formula field editing and preview；
- [ ] 实现 block control bar overlay；
- [ ] 完成 P1 writing smoke。

### P2: Reliability And Scale

- [ ] 建立 overlay / portal layer；
- [ ] 建立 preview/debug overlay；
- [ ] 建立 z-index policy；
- [ ] 建立 100/500/1000 block smoke seeds；
- [ ] 跑 formula-heavy smoke；
- [ ] 记录 performance findings；
- [ ] 建立 operation history seed；
- [ ] 完成 P2 reliability review。

### P3: Reserve Layer

- [ ] 定义 frame export boundary seed；
- [ ] 定义 connector endpoint reserve；
- [ ] 定义 CanvasEdge / ObjectRelation runtime 边界；
- [ ] 记录 media/source/formula pressure；
- [ ] 完成 P3 reserve review。

### Release Closure

- [x] 更新 V2.BN.8 engineering spec；
- [x] 更新 V2.BN.8 review；
- [x] 更新 V2.BN.8 experience review；
- [x] 更新 V2.BN.8 changelog；
- [x] 更新 roadmap 中 V2.BN.8.x 需要追加的实际打磨项；
- [ ] 执行 document promotion / merge review；
- [ ] 判断哪些本地文档需要 promotion 到全局 contracts / architecture / product / roadmap / workflow；
- [ ] 判断哪些本地文档只作为 release evidence 保留；
- [x] `git diff --check`；
- [x] changed-file secret scan；
- [x] client build / server build / targeted tests；
- [ ] Browser smoke；
- [ ] Henry V2.BN.8 acceptance pending。

## Document Promotion / Merge Review

V2.BN.8 收口时必须执行 document promotion / merge review。

### 目标

把第八阶段中已经稳定下来的规则从局部文档区提升到全局文档，避免 Canvas Engine 的长期规则只埋在 release evidence 里。

### 必须检查

| 本地文档 | 可能 promotion 到哪里 | 判断标准 |
| --- | --- | --- |
| `Canvas-Engine-Architecture-Spec.md` | `docs/ARCHITECTURE.md` 或 `docs/contracts/` | NoteCanvas / PageFrame / viewport / layer / measurement / selection 已经稳定。 |
| `Canvas-Engine-Interaction-Contract.md` | UX Inventory 或 `docs/contracts/` | 创建、选择、resize、slash、toolbar、preview、page/workspace 行为已稳定。 |
| `Canvas-Engine-State-And-Data-Contract.md` | `docs/DATA_MODEL.md` 或 `docs/contracts/` | placement truth、viewport state、selection state、undo boundary 已稳定。 |
| `Canvas-Engine-Spike-And-Benchmark-Plan.md` | 全局测试/benchmark 规则或 roadmap | benchmark matrix 已经证明可复用。 |
| `Canvas-Engine-Fallback-Strategy.md` | roadmap / architecture / ADR | fallback trigger 已经影响路线决策。 |
| `Workflow.md` | `docs/workflow/Coincides-Workflow.md` 或 phase plan template | V2.BN.8.x workflow 被证明可复用到后续大阶段。 |

### 默认只保留为 release evidence

以下文件默认留在本文件夹：

- `Plan.md`
- `Engineering-Spec.md`
- `Review.md`
- `Experience-Review.md`
- `CHANGELOG.md`

它们记录第八阶段如何被执行，不一定是长期全局规范。

### 收口动作

```text
列出所有本地文档
  -> 标注 promote / merge / keep / supersede
  -> 更新全局文档
  -> 更新 README
  -> 更新 CHANGELOG
  -> 更新 Review / Experience Review
  -> 交给 Henry acceptance
```

## Test Plan

### Engineering Tests

建议至少准备：

```text
placement save/load test
coordinate transform test
viewport persistence test
measurement/reflow test
empty block cleanup test
slash command anchor test
selection/hit testing test
overlay z-index smoke
```

### Browser Smoke

需要人工或 browser tool 验证：

- 打开 note；
- PageFrame 显示；
- pan / zoom；
- 创建 text block；
- resize 后文字重排；
- 创建 formula block；
- 创建 definition block；
- 打开 preview overlay；
- 切换 page/workspace visibility；
- workspace block 不污染 PageFrame；
- 大量 block seed 不崩溃。

### Experience Review

必须回答：

```text
新 Canvas Engine 的写作手感是否至少接近旧 runtime？
block control 是否更少遮挡？
preview/debug overlay 是否更清楚？
PageFrame 外 workspace 是否自然？
用户是否能理解 PageFrame 和 canvas workspace 的区别？
```

## Out Of Scope

V2.BN.8 不做：

- Structure Studio Productization；
- Source Library；
- Relation Runtime；
- GraphRAG adapter；
- OCR / VLM source reconstruction；
- AI note assembly；
- complete media pipeline；
- complete export engine；
- complete multi-frame universe；
- note-set universe；
- AI repagination proposal；
- AFFiNE / BlockSuite full integration；
- destructive canvas preset switching。

## Acceptance Criteria

- `docs/releases/V2.BN.8/Plan.md` 存在，中文可读。
- `docs/releases/V2.BN.8/` 专用文档区存在。
- `Workflow.md` 明确 V2.BN.8 / V2.BN.8.x 的 debug workflow。
- Plan 明确 V2.BN.8 是 Canvas Engine And TextFlow Foundation，不是完整 infinite canvas 产品，也不是完整 Structure Studio 产品。
- Plan 明确 R0 clean branch gate。
- Plan 引用 V2.BN.6 / V2.BN.7 产物作为前置输入。
- Plan 按 R0 / P0 / P1 / P2 / P3 拆分优先级。
- Plan 明确第一优先级包括 NoteCanvas、PageFrame、workspace、placement、selection、measurement、viewport、overlay。
- Plan 明确 V2.BN.8.x 是可靠性和体验打磨空间。
- Plan 明确当前 branch 是 fallback/reference。
- Plan 明确不做 Structure Studio / Source Library / Relation Runtime / GraphRAG adapter。
- Plan 明确 V2.BN.8 收口时必须执行 document promotion / merge review。
- Plan 给出工程测试、browser smoke 和 experience review 方向。

## Assumptions

- 当前产品尚未公开投入使用，因此可以 clean reset 实验性 layout data。
- 当前 branch 保留为 fallback/reference，不删除。
- V2.BN.8 默认 self-owned Canvas Engine，但 AFFiNE / BlockSuite 继续作为参考和 fallback。
- 如果 V2.BN.8 无法达到工程可靠和体验可靠，应进入 V2.BN.8.x 继续打磨，而不是急着进入 V2.BN.9。

## V2.BN.8.1 Runtime Replacement Addendum

`V2.BN.8.1-Runtime-Replacement-Plan.md` 是本阶段第一个小版本的执行蓝图。它把原本分散在 `NoteDetail.tsx` 中的旧 runtime 职责拆成 12 层，并要求在 `V2.BN.8.1` 内完成 Canvas Engine 对这些职责的逐层接管。后续 `V2.BN.8.x` 小版本主要负责打磨、补丁、性能验证和体验优化。

该小版本允许在本地开发环境中清空测试账号和测试数据，但必须先停止 server、备份 `server/coincides.db*`，再执行 reset。

## V2.BN.8.x Subversion Layout Addendum

V2.BN.8.3 之后，TextFlow / editor / canvas work 不再塞回单个 patch。第八阶段本地小版本暂按以下职责分流：

```text
V2.BN.8.3
  TextFlow Seed And Slash Command Foundation
  Block retreat / Definition entry-point retirement
  Status: closed on 2026-06-15 after Henry manual pass

V2.BN.8.4
  TextUnit Editor Seed
  Plan: docs/releases/V2.BN.8/V2.BN.8.4-TextUnit-Editor-Seed-Plan.md
  TextUnit gutter
  Enter / Backspace / Tab
  heading / quote / bullet / numbered / todo / toggle writing roles
  paste-to-TextFlow parser first pass
  split / merge seed
  heading active block retreat
  code / source quote conservative boundary

V2.BN.8.5
  Selection And AnnotationTruth Seed
  Plan: docs/releases/V2.BN.8/V2.BN.8.5-Selection-And-AnnotationTruth-Seed-Plan.md
  selection model
  first AnnotationTruth truth
  text highlight / annotation render
  right-click / selection toolbar annotation entry
  annotation inspector seed
  Annotation contract draft
  inline formula / inline code / inline link as special render anchors

V2.BN.8.6
  Annotation Editor And ReadingInterpretation Seed
  Plan: docs/releases/V2.BN.8/V2.BN.8.6-Annotation-Editor-And-ReadingInterpretation-Seed-Plan.md
  multi-range annotation
  child annotation
  annotation edit / delete / visibility
  AI-readable annotation projection
  ReadingInterpretation / annotation proposal seed
  TextUnitGroup as annotation range helper / stable range package
  relation endpoint reserve

V2.BN.8.6.1
  Selection Draft Engine
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.1-Selection-Draft-Engine-Plan.md
  Coincides-owned SelectionDraft truth
  browser selection as input signal only
  temporary draft highlight
  Ctrl / Command additive selection ranges
  normal selection -> additive draft upgrade
  lightweight escapable selection toolbar
  parent annotation internal reselection -> child label entry

V2.BN.8.6.2
  Annotation Hierarchy And Range Source Contract
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.2-Annotation-Hierarchy-And-Range-Source-Contract-Plan.md
  parent_annotation_id as child label hierarchy truth
  root-only Annotation Stack cards
  child labels rendered inside parent context
  parent hide/delete prevents child ghosts
  range source editing reserve and conservative rebase helper

V2.BN.8.6.3
  Source-Backed Annotation Range Editing
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Plan.md
  range preview edit writes back to TextFlow source
  TextUnit source edit refreshes annotation range cache
  parent/child annotation hierarchy preserved through range rebase
  label input remains separate from range source editing

V2.BN.8.6.4
  Annotation Display And Inspector Polish
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md
  Preview-level label overlay show/hide toggle
  Annotation Stack visual hierarchy cleanup
  text-near label badge and local multi-label cluster
  SelectionDraft toolbar wording and escape polish

V2.BN.8.6.6
  TextUnitGroup And AnnotationSet Editor Foundation
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Plan.md
  TextUnitGroup as writing-layer row group helper
  AnnotationSet as transitional editable label organization seed
  reading projection for grouped labels
  ContentGroup / GroupFolder / ContentGroup Gallery / CompositeEndpoint migration question
  CompositeEndpoint reserve without relation runtime

V2.BN.8.6.7
  ContentGroup Rebuild And Legacy Retreat
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.7-ContentGroup-Rebuild-And-Legacy-Retreat-Plan.md
  ContentGroup / Petal runtime and inspector seed
  AnnotationSet / TextUnitGroup demoted in product truth
  accepted ContentGroup identity remains a ContentGroup status, not direct user input or a separate object

V2.BN.8.6.8
  Legacy Data Cleanup And Test Reset
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.8-Legacy-Data-Cleanup-And-Test-Reset-Plan.md
  retire AnnotationSet and TextUnitGroup prototype paths
  remove old structured block templates and DefinitionBlockProjection
  hide or remove Advanced Insert
  back up then reset all prototype account data

V2.BN.8.6.9
  ContentGroup Hardening And Integrity Gate
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.9-ContentGroup-Hardening-And-Integrity-Gate-Plan.md
  make ContentGroup and Petal member references traceable
  refresh preview cache from source instead of treating previews as truth
  classify member integrity as valid/stale/orphaned/unsupported
  keep accepted-identity UI and GroupFolder / Gallery out of this version

V2.BN.8.6.10
  ContentGroup Identity Seed
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.10-ContentGroup-Identity-Seed-Plan.md
  replace interpretation wording with ContentGroup identity
  treat accepted identity as ContentGroup's own accepted/reviewed status
  keep separate accepted-content objects out of user-facing object management
  downgrade accepted identity back to draft when members or Petals change

V2.BN.8.6.11
  GroupFolder And ContentGroup Gallery Direction Draft
  Plan: docs/releases/V2.BN.8/V2.BN.8.6.11-ContentGroupIndex-Seed-Plan.md
  establish GroupFolder as the organization/path layer for ContentGroups
  derive ContentGroup depth from GroupFolder path instead of a primary group field
  define right rail / Gallery / detail editor surfaces
  keep list/index behavior as derived Gallery/query views, not a truth table

V2.BN.8.7
  ContentGroup System Maturity
  Plan: docs/releases/V2.BN.8/V2.BN.8.7-ContentGroup-System-Maturity-Plan.md
  Rail / Gallery / Single Editor role cleanup
  Member != Source boundary hardening
  GroupFolder / Gallery resource-manager maturity
  Reference / Duplicate / Fork / Materialize language

V2.BN.8.8+
  CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed
  Plan: docs/releases/V2.BN.8/V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md
  Deferred from the original 8.7 slot; file name is historical until the plan is reissued.
  minimal pen / shape / image insert
  CanvasObject layer reserve
  region selection reserve
  image region / CanvasObject / media region as annotation range

V2.BN.8.9+
  Canvas Reliability / Scale / Export Reserve Closure
  50 / 200 / 1000 block smoke
  formula-heavy smoke
  visible render window / virtualization reserve
  PageFrame export boundary
  CanvasObject / relation endpoint reserve
```

## V2.BN.8.6.1 Selection Draft Engine Entry

`V2.BN.8.6.1-Selection-Draft-Engine-Plan.md` 是插入在 V2.BN.8.6 与 V2.BN.8.7 之间的执行计划。

它把浏览器原生 selection 降级为 pointer / offset 输入信号，不再让浏览器 selection 成为 annotation 或 child label 的 truth。Coincides 自己维护 `SelectionDraft`，并让临时高亮、toolbar、annotation commit、same-range label、child label 都读取同一个 draft。

V2.BN.8.6.1 的成熟边界是：普通选区替换 draft，Ctrl / Command 追加 draft，多范围 draft 可见，误选可通过空白点击、Esc 或 toolbar close 清除；child label 入口必须来自已有 parent annotation 内部的二次选区，而不是泛化的 Inspector 输入框。

V2.BN.8.6.1 不做完整跨 block 选择 UI、完整富文本 editor、CanvasObject / media selection、Relation endpoint editor 或 AI 子标注。它只把 selection / annotation 的底座补稳，让后续 CanvasObject / media annotation 不再依赖浏览器 selection 副作用。

## V2.BN.8.6.2 Annotation Hierarchy And Range Source Contract Entry

`V2.BN.8.6.2-Annotation-Hierarchy-And-Range-Source-Contract-Plan.md` 是插入在 V2.BN.8.6.1 与 V2.BN.8.7 之间的数据契约修补小版本。

它把 child label 从“看起来缩进的 UI 行”提升为明确的 annotation hierarchy：`AnnotationTruth.parent_annotation_id` 是子标签归属真相，Annotation Stack 只把 root annotation 渲染成顶层卡片，child label 必须在 parent card 内部显示和管理。旧的 parent-side `child_annotation_ids` 只作为兼容/cache 读取，不再是唯一真相。

V2.BN.8.6.2 同时补上 range source editing 的地基：range preview 不是 detached copy；未来编辑 range 文本必须回写原始 TextFlow source，并通过保守 rebase 规则移动、失效或提示受影响 annotation range。实际 range preview 文本直接编辑默认留到 V2.BN.8.6.3。

## V2.BN.8.6.3 Source-Backed Annotation Range Editing Entry

`V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Plan.md` 是插入在 V2.BN.8.6.2 与 V2.BN.8.7 之间的数据一致性小版本。

它把 8.6.2 中只写成 contract 的 range source editing 做成第一版可运行闭环：Annotation Stack 的 range preview 可以编辑，但编辑必须回写原始 TextFlow source；用户直接编辑 TextUnit 原文时，相关 annotation range 的 offset 与 `range_text_cache` 也必须同步刷新。`range_text_cache` 只能是 cache，不再允许成为 detached copy。

V2.BN.8.6.3 的范围很窄：不做 Annotation Stack 视觉重设计，不做 label display/hide 总开关，不做 label badge 局部聚合，也不做跨 block range edit。剩余 annotation 视觉和 selection polish 默认进入 V2.BN.8.6.4。

Implementation status: completed as `V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Patch-Note.md`. The first same-TextUnit source-backed loop is implemented and covered by model contract smoke.

## V2.BN.8.6.4 Annotation Display And Inspector Polish Entry

`V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md` 是插入在 V2.BN.8.6.3 与 V2.BN.8.7 之间的 annotation 显示和管理体验小版本。

它不改变 AnnotationTruth / AnnotationRange 的核心数据真相，而是在现有语义地基上补齐用户每天会感受到的显示层：Preview 里增加 label overlay 总开关，正文 label badge 从 block 右上角移动到文字附近，同一局部多个 label 聚合成一个 badge，Annotation Stack 扁平化成更清楚的管理面板，SelectionDraft toolbar 去掉内部 `Draft` 语言并补齐 Esc、关闭、空白点击的逃逸行为。

V2.BN.8.6.4 的边界同样要压住：不做完整 custom selection engine，不做 per-label visibility filter，不做完整 label style editor，不做 CanvasObject / media annotation，也不做 Relation endpoint UI。第一版受控 label color token 色板可以作为显示 polish 的一部分。它的验收标准是 annotation display 不再干扰自然写作，并且 Henry manual visual pass 能接受。

V2.BN.8.6.4 是视觉/交互 polish 小版本，因此执行前必须使用 `impeccable` 做 product UI gate。实现者需要先确认 Coincides 的产品 UI register、现有 token / component vocabulary、Annotation Stack 信息层级、badge 位置和 selection toolbar 逃逸行为，再开始改 CSS 或组件。`taste skill` 可以在 Henry 点名时作为补充审美 critique，但默认不替代 `impeccable`。

Implementation status: completed as `V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Patch-Note.md`. The first label overlay toggle, local label cluster, Annotation Stack flattening, and toolbar wording pass are implemented and covered by model contract smoke.

## V2.BN.8.6.6 TextUnitGroup And AnnotationSet Editor Foundation Entry

`V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Plan.md` is the inserted foundation version after command surfaces and before CanvasObject work.

Its original goal was to make TextUnitGroup and AnnotationSet usable without confusing their layers:

```text
TextUnitGroup
  writing-layer row group helper
  no semantic truth

AnnotationSet
  group of AnnotationTruth records
  AI-readable organization seed
  future CompositeEndpoint reserve
```

This version does not implement relation runtime, CanvasObject, media annotations, A9 Annotation Studio, cross-note sets, or visible set badges in the main text surface. It only gives the current note a stable way to group rows and group labels before later ContentGroup maturity and CanvasObject work.

2026-06-18 model sync:

```text
TextFlow = content root
ContentRange = location root
AnnotationTruth = durable label / marker
ContentGroup = serious content package
GroupFolder = organization/path and relation-view boundary for ContentGroups
Petal = local part inside ContentGroup
ContentGroup identity/status = draft / accepted / rejected / archived review state on the ContentGroup itself
ContentGroup Gallery / derived group views = folder-scoped browsing and dynamic list views over ContentGroups
AnnotationSet = V2.BN.8.6.6 transitional seed, not the long-term primary content package
TextUnitGroup = legacy seed / ContentGroup predecessor, not a long-term product object
```

Future work should migrate useful TextUnitGroup / AnnotationSet behavior into ContentGroup / Petal / GroupFolder / ContentGroup Gallery, or remove the old surfaces from normal UX. Compatibility adapters are not required because there is no production user dataset.

Implementation status: completed as `V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Patch-Note.md`. The model contract smoke and client build passed; Henry manual visual test remains the closing gate.

## V2.BN.8.6.7 ContentGroup Rebuild And Legacy Retreat Entry

`V2.BN.8.6.7-ContentGroup-Rebuild-And-Legacy-Retreat-Plan.md` is inserted after V2.BN.8.6.6 and before the V2.BN.8.7 ContentGroup System maturity pass.

It exists because the model documents have moved past the 8.6.6 implementation:

```text
TextUnitGroup
  legacy seed / ContentGroup predecessor

AnnotationSet
  removable seed / not a compatibility obligation

ChildLabel
  superseded by Petal

AnnotationTruth
  label / marker layer

ContentGroup
  serious content package with traceable members

Petal
  local part inside ContentGroup, also with traceable members
```

The version is organized into four work blocks:

- New Build: implement ContentGroup / ContentGroupMember / Petal foundations.
- Refactor / Reuse: migrate useful AnnotationSet / TextUnitGroup mechanics into ContentGroup where they help.
- Delete / Retreat: hide, remove, or stop expanding TextUnitGroup, AnnotationSet, and ChildLabel as product destinations.
- Downgrade / Reposition: keep AnnotationTruth, InlineStructure, TextUnit, and Block useful but narrower.

This version does not implement relation runtime, GroupFolder / Gallery product UI, Structure Studio, source reconstruction, or CanvasObject work. It stops at a minimal ContentGroup / Petal runtime and inspector seed ready for Henry manual test.

## V2.BN.8.6.8 Legacy Data Cleanup And Test Reset Entry

`V2.BN.8.6.8-Legacy-Data-Cleanup-And-Test-Reset-Plan.md` is inserted after V2.BN.8.6.7 and before the V2.BN.8.7 ContentGroup System maturity pass.

It exists because V2.BN.8.6.7 introduced the current ContentGroup / Petal direction, while several older prototype paths still remain in code:

```text
AnnotationSet
  remove from active runtime

TextUnitGroup
  retire last because it touches TextFlow editing

DefinitionBlockProjection and old structured block templates
  remove from active creation / render paths

Advanced Insert
  hide first, then remove

prototype account data
  back up, then reset because all current accounts are test accounts
```

This version is intentionally more conservative than a one-shot delete. It requires rollback checkpoints before each destructive phase, handles one legacy block at a time, backs up SQLite/uploads before clearing data, and finishes with full automated plus manual verification. Its acceptance gate is not only that the app builds, but that a fresh account can create a project, note, paragraph text, formula/code blocks, annotation labels, ContentGroups, and Petals without any retired model path reappearing.

## V2.BN.8.6.9 ContentGroup Hardening And Integrity Gate Entry

`V2.BN.8.6.9-ContentGroup-Hardening-And-Integrity-Gate-Plan.md` is inserted after V2.BN.8.6.8 and before ContentGroup identity work.

It exists because after cleanup, ContentGroup must become reliable before it can carry identity or index behavior. This version hardens the content package layer:

```text
ContentGroup member reference
  must stay traceable to source content

Petal member reference
  must stay traceable inside the group

preview_text
  cache only, never second truth

integrity state
  valid / stale / orphaned / unsupported
```

V2.BN.8.6.9 deliberately does not implement accepted-identity UI, GroupFolder / Gallery, relation runtime, AI proposal workflow, cross-project groups, source reconstruction, CanvasObject members, or a full visual redesign. Its job is to make ContentGroup safe enough that later semantic layers can trust it.

## V2.BN.8.6.10 ContentGroup Identity Seed Entry

`V2.BN.8.6.10-ContentGroup-Identity-Seed-Plan.md` is inserted after ContentGroup hardening and before GroupFolder / Gallery work.

It replaces the older `interpretation` wording with a simpler identity state machine:

```text
ContentGroup
  user-facing content package

ContentGroup.identity.status = draft
  former interpretation / possible understanding

ContentGroup.identity.status = accepted
  accepted / reviewed state on the ContentGroup itself
```

The important product rule is that there is no separate object users must manage after acceptance. A ContentGroup remains a ContentGroup when its identity is accepted. If members or Petals change after acceptance, identity must fall back to draft because the accepted meaning may no longer match the package.

## V2.BN.8.6.11 GroupFolder And ContentGroup Gallery Direction Draft Entry

`V2.BN.8.6.11-ContentGroupIndex-Seed-Plan.md` is inserted after ContentGroup identity and before CanvasObject work. Despite the historical filename, the product concept is now `GroupFolder / ContentGroup Gallery`.

This file is currently a direction draft. It replaces the narrow accepted-only ContentGroupIndex framing with an organization layer: GroupFolder gives ContentGroup a path, Gallery scope, AI reading context, and relation-view boundary.

The current draft rule is:

```text
GroupFolder = organization/path/relation-view boundary
ContentGroup = serious content package
ContentGroup identity/status = review state on the group
ContentGroup Gallery / derived views = browsing/query surface over folders and groups
```

Important changes:

- ContentGroup should not own primary `depth`; derived depth comes from its GroupFolder path.
- Project and Note can own lifecycle-bound system root GroupFolders.
- User-created and AI-created folders can collect ContentGroups across notes/projects without moving source truth.
- Relation views can be opened from a GroupFolder boundary without creating fake relation facts.
- List/index behavior remains a derived Gallery/query view, not a new truth table.

## V2.BN.8.7 ContentGroup System Maturity Entry

`V2.BN.8.7-ContentGroup-System-Maturity-Plan.md` 是第八阶段第七个小版本的执行计划。

它的目标是把当前 ContentGroup / Member / Petal / GroupFolder / Gallery / Rail / Single Editor 收束成 `ContentGroup System 1.0`：稳定、可理解、可复用，并且能被未来 Canvas projection 引用。

V2.BN.8.7 明确不做 CanvasObject / media / drawing seed、cross-note CanvasObject reuse、完整数据库迁移、GraphRAG、relation runtime 或完整 source reconstruction。它只负责让 ContentGroup 能回答自己是谁、在哪里被组织、members 是什么、来自哪里、是否与 source 同步，以及 Reference / Duplicate / Fork / Materialize 分别意味着什么。

## V2.BN.8.8+ CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed Deferred Entry

`V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md` 保留为后续 CanvasObject seed 的历史草案，但不再是 active V2.BN.8.7 入口。

该工作顺延到 V2.BN.8.8+ 或后续 Canvas track。恢复执行前，应重新发行或重编号该计划，并确认 ContentGroup System maturity 已经给 Canvas projection 提供稳定对象边界。

This split is a working layout, not a hard cap. If TextFlow or Canvas reliability needs more polish, V2.BN.8 may add more subversions before entering V2.BN.9 Structure Studio And Editor Productization.
