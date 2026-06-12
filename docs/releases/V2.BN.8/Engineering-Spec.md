# V2.BN.8 Engineering Spec - Canvas Engine Foundation

## 负责什么

本文负责把 `Plan.md` 中的 Canvas Engine Foundation 落成工程边界：

- 哪些模块需要新建或重写；
- 哪些旧 runtime 经验要继承；
- 哪些旧实现不继承；
- 哪些测试、browser smoke、benchmark 必须跑；
- 哪些内容需要同步到 architecture / interaction / state contract。

## 不负责什么

- 不替代 `Canvas-Engine-Architecture-Spec.md`；
- 不替代 `Canvas-Engine-State-And-Data-Contract.md`；
- 不记录所有临时 bug；
- 不写完整 Template Studio / Source / Relation / GraphRAG 设计；
- 不启动 Canvas Engine 代码实现，除非 V2.BN.8 正式进入 implementation。

## 必读参考

- `docs/releases/V2.BN.8/Plan.md`
- `docs/releases/V2.BN.8/Workflow.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R9-route-decision-report.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`

## 工程原则

```text
clean branch first
contracts before runtime
truth layer stays in Coincides Core
runtime owns projection and interaction only
measurement and overlay must be engine services
old NoteDetail prototype is reference, not base class
self-owned minimal hybrid route is locked for first implementation
```

## 预期工程单元

第一版 Canvas Engine 应至少拆出这些责任：

| 单元 | 责任 | 同步文档 |
| --- | --- | --- |
| NoteCanvas runtime root | canvas root、coordinate、viewport。 | Architecture Spec |
| CanvasViewport | screen/world transform、pan、zoom、visible rect。 | Architecture / State Contract |
| CanvasWorld | world container、layer ordering、coordinate space。 | Architecture Spec |
| PageFrame model | formal page frame、workspace boundary。 | Architecture / State Contract |
| BlockLayer | DOM NoteBlock projection、editing surface。 | Architecture / Interaction |
| SvgOverlayLayer | selection outline、future connector、endpoint marker。 | Architecture / Interaction |
| FloatingOverlayLayer | toolbar、slash menu、preview、popover。 | Architecture / Interaction |
| Placement service | x/y/width/height、frame membership、z index。 | State/Data Contract |
| Measurement service | text/formula/field editor height。 | Architecture / Benchmark |
| Selection service | hit testing、active/selected/editing state。 | Interaction / State Contract |
| Visibility service | visible window、selected/editing forced render。 | Benchmark / State Contract |
| Benchmark fixtures | 50/200/1000 blocks、formula-heavy、workspace outside frame。 | Benchmark Plan |

## 当前代码落点

第一版 engine seed 已经落在：

```text
client/src/pages/Notes/canvasEngine/
  types.ts
  geometry.ts
  engineModel.ts
  index.ts
```

当前 `NoteDetail.tsx` 只做轻量桥接：

- 继续保留旧 runtime 的可用写作体验；
- 构造 `noteCanvasRuntime`；
- 将 block layout 投影成 `BlockPlacementModel`；
- 将 formal page / workspace 统一放进同一套世界坐标；
- 给 DOM 根节点加 engine version / route / visible block / page frame data attributes；
- 通过 CSS variables 读取 PageFrame width 和 canvas world width。

这不是最终 Canvas Engine，只是防止 V2.BN.8 后续工程继续把坐标、viewport、PageFrame、workspace 全写回 `NoteDetail.tsx`。

## 不继承的旧实现

- 不把 `NoteDetail.tsx` 作为长期 Canvas Engine 主干；
- 不把 `better_notebook_layout` 作为长期 schema；
- 不继续使用局部估算函数承担完整 measurement；
- 不把 toolbar / popover 放入 block flow；
- 不让 DOM page flow 模拟 infinite canvas；
- 不把 weak heuristic structured conversion 带入正式 runtime。

## V2.BN.8 工程验收

最低验收：

- NoteCanvas 可打开；
- PageFrame 可显示；
- workspace object 不污染 PageFrame；
- placement 可保存/读取；
- selection/hit-testing 在 pan/zoom 后稳定；
- resize/reflow 不 overlap；
- overlay 不和 content layer 混乱；
- browser smoke 可执行；
- benchmark seed 已创建或明确记录暂未创建原因。

## 同步规则

如果本 spec 改变模块边界，必须同步 `Canvas-Engine-Architecture-Spec.md`。

如果本 spec 改变用户操作，必须同步 `Canvas-Engine-Interaction-Contract.md` 和 `Experience-Review.md`。

如果本 spec 改变 state/data truth，必须同步 `Canvas-Engine-State-And-Data-Contract.md`，必要时同步 `docs/DATA_MODEL.md`。

如果本 spec 改变测试/benchmark，必须同步 `Canvas-Engine-Spike-And-Benchmark-Plan.md` 和 `Review.md`。
