# V2.BN.8 Canvas Engine Foundation 文档区

本文件夹是 `V2.BN.8 Canvas Engine Foundation` 的局部密集文档区。

它不替代全局 `PRODUCT.md`、`docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/DATA_MODEL.md`、`docs/Coincides-Better-Notebook-Roadmap.md` 或 `docs/workflow/Coincides-Workflow.md`。它的作用是把第八阶段这个“Canvas Engine 重建阶段”的计划、workflow、工程规格、交互契约、数据契约、验证策略和收口证据集中在一个地方，避免后续 `V2.BN.8.x` 小版本打磨时上下文丢失。

## 目录职责

| 文件 | 负责什么 | 不负责什么 | 同步关系 |
| --- | --- | --- | --- |
| `Plan.md` | V2.BN.8 总计划、优先级、范围、验收、收口规则。 | 不写具体代码设计细节。 | scope 变化时同步 `Engineering-Spec.md`、`Workflow.md`、roadmap。 |
| `Workflow.md` | V2.BN.8 / V2.BN.8.x 的 debug / intensive workflow。 | 不替代全局 workflow。 | 若 workflow 规则被证明稳定，收口时回写全局 workflow 或 phase template。 |
| `Canvas-Engine-Research/` | 正式 canvas engine 补调研、工具矩阵、路线选择、Summary。 | 不写实现 patch log。 | 路线结论同步 Plan / Workflow / Specs / Roadmap；收口时复制到 `docs/brainstorm/产品完善/Canvas Engine Research/`。 |
| `Engineering-Spec.md` | 工程实现边界、模块拆分、测试/验证矩阵。 | 不替代 architecture contract。 | 受 `Plan.md`、architecture/state/interaction contract 约束。 |
| `Canvas-Engine-Architecture-Spec.md` | NoteCanvas、PageFrame、workspace、viewport、layer、measurement、selection 等架构。 | 不记录日常 patch log。 | 稳定后可能 promotion 到 `docs/ARCHITECTURE.md` 或 `docs/contracts/`。 |
| `Canvas-Engine-Interaction-Contract.md` | 用户操作合同：点击、双击、拖拽、resize、slash、toolbar、preview、page/workspace 行为。 | 不写底层数据 schema。 | 与 UX Inventory、Experience Review、Engineering Spec 双向同步。 |
| `Canvas-Engine-State-And-Data-Contract.md` | content truth、placement truth、runtime state、viewport state、selection state、undo seed。 | 不实现 migration。 | 稳定后可能 promotion 到 `docs/DATA_MODEL.md` 或 `docs/contracts/`。 |
| `Canvas-Engine-Spike-And-Benchmark-Plan.md` | 技术 spike、100/500/1000 block、formula-heavy、overlay、browser smoke。 | 不替代 release review。 | 每次 benchmark 结果回写 `Review.md` 和 `Experience-Review.md`。 |
| `Canvas-Engine-Fallback-Strategy.md` | 自研 Canvas Engine 失败或过重时的退路。 | 不直接决定放弃自研。 | 与 `Plan.md`、route decision draft、roadmap 同步。 |
| `Experience-Review.md` | V2.BN.8 的体验验收：是否不低于旧 runtime 手感。 | 不记录所有工程测试日志。 | 每个 V2.BN.8.x 小版本后更新。 |
| `Review.md` | 工程质量 review、风险、验证结果、Henry 待拍板事项。 | 不替代 acceptance。 | 每个小版本收口时更新。 |
| `CHANGELOG.md` | V2.BN.8 阶段变更记录。 | 不记录未完成设想。 | 每次 patch/polish/小版本收口时更新。 |

## 可能 Promotion 到全局的文档

V2.BN.8 收口时必须做 `document promotion / merge review`。

可能升格为全局 contract / architecture / product 文档的内容：

- `Canvas-Engine-Architecture-Spec.md` 中稳定的 NoteCanvas / PageFrame / viewport / layer architecture；
- `Canvas-Engine-Interaction-Contract.md` 中稳定的 canvas writing / selection / resize / toolbar / preview 操作规则；
- `Canvas-Engine-State-And-Data-Contract.md` 中稳定的 placement truth、runtime state、viewport state、undo boundary；
- `Canvas-Engine-Spike-And-Benchmark-Plan.md` 中稳定的 benchmark matrix；
- `Canvas-Engine-Fallback-Strategy.md` 中稳定的 fallback trigger；
- `Experience-Review.md` 中稳定的体验验收规则。
- `Canvas-Engine-Research/Summary-Report.md` 中稳定的路线决策和排除理由。

可能同步到：

```text
docs/contracts/
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
PRODUCT.md
docs/PRD.md
docs/Coincides-Better-Notebook-Roadmap.md
docs/workflow/Coincides-Workflow.md
docs/internal/Better-Notebook-Phase-Plan-Template.md
```

## Release Evidence

以下文件默认作为 V2.BN.8 release evidence 保留，不一定 promotion：

- `Plan.md`
- `Engineering-Spec.md`
- `Review.md`
- `Experience-Review.md`
- `CHANGELOG.md`

它们记录第八阶段如何推进、验证、收口，不一定代表长期全局规范。
## V2.BN.8.1 Runtime Replacement Entry

`V2.BN.8.1-Runtime-Replacement-Plan.md` 是第八阶段第一个小版本的逐层接管蓝图。

它的目标是把当前仍集中在 `NoteDetail.tsx` 里的旧 runtime 职责迁入 Canvas Engine，使 `NoteDetail.tsx` 退化为 route/data shell。后续 `V2.BN.8.x` 小版本应优先围绕该文档完成后的 engine 进行打磨，而不是继续在旧 `NoteDetail.tsx` runtime 上堆补丁。
