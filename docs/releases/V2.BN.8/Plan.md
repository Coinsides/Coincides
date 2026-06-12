# V2.BN.8 Plan - Canvas Engine Foundation

> **For agentic workers:** V2.BN.8 是 Canvas Engine clean branch 的地基版本，不是完整无限画布产品版。执行本计划前，必须先阅读 V2.BN.6 / V2.BN.7 产物，尤其是 truth-layer contract、runtime autopsy、branch closure、Canvas Engine requirement 和 research gap。不要把本阶段扩展成 Template Studio、Source Library、Relation Runtime、GraphRAG adapter 或完整 AFFiNE/BlockSuite integration。

## Summary

V2.BN.8 的目标是把 Better Notebook 从当前 `NoteDetail.tsx` 里的 page-like / canvas-like prototype，推进到真正的 canvas-native runtime 地基。

核心判断：

```text
当前 branch = experiment / fallback / reference
V2.BN.8 = clean branch Canvas Engine Foundation
V2.BN.8.x = Canvas Engine reliability and UX polish buffer
V2.BN.9 = Template Studio Productization
```

V2.BN.8 不追求一次性做完完整无限画布。它只负责证明：

```text
NoteCanvas 可以成立
PageFrame 可以成立
PageFrame 外 workspace 可以成立
placement / selection / measurement / overlay / viewport 可以稳定协作
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
  Canvas Engine Foundation
  -> clean branch
  -> NoteCanvas / PageFrame / workspace
  -> coordinate / viewport / placement / measurement / selection / overlay

V2.BN.8.x
  Canvas Engine Reliability And UX Polish Buffer
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
- `docs/contracts/Editor-State-Rebuild-Contract.md`
- `docs/contracts/Link-Source-Relation-Boundary-Contract.md`
- `docs/contracts/Source-Provenance-Contract.md`
- `docs/contracts/Template-Category-Contract.md`
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

V2.BN.8 不做 Template Studio、Source Library、Relation Runtime。原因不是这些不重要，而是它们都依赖稳定 Canvas Engine。

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
P1: Writing and block interaction layer
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
- 不做 Template Studio；
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

## P1 - Writing And Block Interaction Layer

第二优先级：恢复旧 runtime 已经磨出的写作手感。

### 目标

让 Canvas Engine 不是只有技术骨架，而是恢复 V2.BN.1-V2.BN.5 已经证明有价值的写作体验。

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
- field layout 暂时只做固定视觉样板，不进入完整 Template Studio。

### P1 验收

- 用户能自然创建 text block；
- 用户能用 slash 创建 formula / definition；
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

### P1: Writing And Block Interaction

- [ ] 实现 natural writing entry；
- [ ] 实现 empty block cleanup；
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

- Template Studio Productization；
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
- Plan 明确 V2.BN.8 是 Canvas Engine Foundation，不是完整 infinite canvas 产品。
- Plan 明确 R0 clean branch gate。
- Plan 引用 V2.BN.6 / V2.BN.7 产物作为前置输入。
- Plan 按 R0 / P0 / P1 / P2 / P3 拆分优先级。
- Plan 明确第一优先级包括 NoteCanvas、PageFrame、workspace、placement、selection、measurement、viewport、overlay。
- Plan 明确 V2.BN.8.x 是可靠性和体验打磨空间。
- Plan 明确当前 branch 是 fallback/reference。
- Plan 明确不做 Template Studio / Source Library / Relation Runtime / GraphRAG adapter。
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
