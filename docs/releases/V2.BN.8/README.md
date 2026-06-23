# V2.BN.8 Canvas Engine And TextFlow Foundation 文档区

## 2026-06-22 Current Handoff State

V2.BN.8 is currently in the ContentGroup Editor maturity lane.

Read the current state in this order:

1. `docs/brainstorm/产品完善/2026-06-20-Better-Notebook-ContentGroup-Reflection-Meeting-Notes.md`
2. `docs/contracts/ContentGroup-GroupFolder-Contract.md`
3. `docs/contracts/Petal-Contract.md`
4. `docs/contracts/TextFlow-Contract.md`
5. `docs/contracts/Notebook-Object-Inventory-Contract.md`
6. `Open-Issue-And-Brainstorm-Checklist.md`

Current model:

```text
TextFlow = content truth
Label = visible marker / reusable range package
ContentGroup = serious content package
Petal = local part inside a ContentGroup
GroupFolder = resource manager and Gallery scope
Relation = later logical layer
```

V2.BN.8.6.29 / 8.6.30 currently use copy-first drag/drop. True destructive move / reorder remains deferred until offset rebase is safe.

本文件夹是 `V2.BN.8 Canvas Engine And TextFlow Foundation` 的局部密集文档区。

它不替代全局 `PRODUCT.md`、`docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/DATA_MODEL.md`、`docs/Coincides-Better-Notebook-Roadmap.md` 或 `docs/workflow/Coincides-Workflow.md`。它的作用是把第八阶段这个“Canvas Engine + TextFlow 重建阶段”的计划、workflow、工程规格、交互契约、数据契约、验证策略和收口证据集中在一个地方，避免后续 `V2.BN.8.x` 小版本打磨时上下文丢失。

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
| `../../contracts/TextFlow-Contract.md` | TextBlock、TextUnit、TextUnitGroup、InlineStructure、writing_role、range anchor 与 TextFlow 内部编辑边界。 | 不替代 canvas placement / viewport / overlay contract，也不承载最终语义标签真相。 | V2.BN.8.3 起同步 PRODUCT / PRD / Relation Product / roadmap；V2.BN.8.5 起与 Annotation contract 双向同步。 |
| `../../contracts/Annotation-Contract.md` | AnnotationTruth、AnnotationRange、child annotation、visual style、ReadingInterpretation、AnnotationProposal、relation endpoint reserve。 | 不替代 TextFlow 编辑模型，也不预设全局 canonical role / slot schema。 | V2.BN.8.5 起作为正式 contract seed，并同步 Product / PRD / roadmap。 |
| `../../contracts/Notebook-Object-Inventory-Contract.md` | Better Notebook 对象总览：Project、Note、NoteCanvas、PageFrame、Block、TextFlow、AnnotationTruth、AnnotationSet、Relation 的根分工。 | 不替代具体 contract、schema 或 UI spec。 | V2.BN.8.5 起作为对象分层索引，后续 relation/source/canvas 文档同步引用。 |
| `Canvas-Engine-Spike-And-Benchmark-Plan.md` | 技术 spike、100/500/1000 block、formula-heavy、overlay、browser smoke。 | 不替代 release review。 | 每次 benchmark 结果回写 `Review.md` 和 `Experience-Review.md`。 |
| `Canvas-Engine-Fallback-Strategy.md` | 自研 Canvas Engine 失败或过重时的退路。 | 不直接决定放弃自研。 | 与 `Plan.md`、route decision draft、roadmap 同步。 |
| `Experience-Review.md` | V2.BN.8 的体验验收：是否不低于旧 runtime 手感。 | 不记录所有工程测试日志。 | 每个 V2.BN.8.x 小版本后更新。 |
| `Review.md` | 工程质量 review、风险、验证结果、Henry 待拍板事项。 | 不替代 acceptance。 | 每个小版本收口时更新。 |
| `CHANGELOG.md` | V2.BN.8 阶段变更记录。 | 不记录未完成设想。 | 每次 patch/polish/小版本收口时更新。 |
| `V2.BN.8.2-Canvas-Shell-And-Viewport-Transform-Plan.md` | V2.BN.8.2 小版本计划：Canvas Shell、Pan/Zoom/Viewport Transform、Overlay Anchor、Notebook Baseline Audit。 | 不包含 Relation / Graph DB / Agent / Structure Studio。 | 执行时同步 Interaction / State / Architecture contracts、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.2-Mature-Notebook-Baseline-Audit.md` | V2.BN.8.2 成熟笔记 baseline audit：写作、页面/画布、组织导航、状态提示、导入导出、模板复用等基础能力盘点。 | 不替代 Product / PRD，也不加入 Relation / Graph DB / Agent 范围。 | 小版本验收后，把遗留问题同步到 Open Issue / Register / Roadmap。 |
| `V2.BN.8.5-Selection-And-AnnotationTruth-Seed-Plan.md` | V2.BN.8.5 小版本计划：选区模型、AnnotationTruth、标注渲染、selection toolbar / 右键入口、annotation inspector、AnnotationProposal / ReadingInterpretation seed。 | 不做完整 AI、Relation runtime、SourceReference attach、Structure Studio 或固定 role / slot schema。 | 执行时同步 Annotation Contract、TextFlow Contract、Block Contract、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.6-Annotation-Editor-And-ReadingInterpretation-Seed-Plan.md` | V2.BN.8.6 小版本计划：多范围 annotation、重叠 label、annotation stack、block-level annotation、child annotation、AnnotationSet seed、ReadingInterpretation / proposal seed。 | 不做完整 AI agent、Relation runtime、media annotation、drawing tools、Structure Studio 或全局 canonical role。 | 执行时同步 Annotation Contract、TextFlow Contract、Object Inventory、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.6.1-Selection-Draft-Engine-Plan.md` | V2.BN.8.6.1 插入小版本计划：Coincides-owned SelectionDraft、临时选区高亮、Ctrl / Command 追加选区、selection toolbar 生命周期、parent annotation 内部 child label 入口。 | 不做完整跨 block 选择 UI、完整富文本编辑器、CanvasObject / media / drawing selection 或 Relation endpoint editor。 | 执行时同步 Annotation Contract、Object Inventory、Interaction / State Contract、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Plan.md` | V2.BN.8.6.3 插入小版本计划：Annotation range preview 与 TextFlow source 双向同步，range preview 编辑回写原文，原文编辑刷新 range cache。 | 不做 Annotation Stack 视觉重设计、label 可见性总开关、badge 位置重排、完整 selection engine polish 或跨 block range edit。 | 执行时同步 Annotation Contract、TextFlow Contract、Object Inventory、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Patch-Note.md` | V2.BN.8.6.3 补丁记录：source-backed range preview editing 已实现，`range_text_cache` 保持 cache，不再作为第二份文本真相。 | 仍不做跨 block / media / source region range edit。 | 已通过 model contract smoke 和 client build。 |
| `V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md` | V2.BN.8.6.4 插入小版本计划：label overlay 总开关、Annotation Stack 视觉层级收束、文字附近 label badge、多 label 局部聚合、SelectionDraft 工具条 polish。 | 不做完整 selection engine 重写、per-label visibility、full label style editor、CanvasObject annotation 或 Relation endpoint UI。 | 执行前必须使用 `impeccable` 做 product UI gate；`taste skill` 只作为 Henry 点名时的补充审美 critique。执行时同步 Annotation Contract、Object Inventory、Interaction Contract、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Patch-Note.md` | V2.BN.8.6.4 补丁记录：Preview label overlay 总开关、local label cluster、Annotation Stack 扁平化、toolbar 文案收束、第一版 label color token 色板已实现。 | 仍不做 per-label visibility / full style editor / complete selection engine rewrite。 | 已通过 `impeccable` product UI gate、model contract smoke 和 client build。 |
| `V2.BN.8.7-ContentGroup-System-Maturity-Plan.md` | V2.BN.8.7 小版本计划：ContentGroup System maturity，收束 Rail / Gallery / Single Editor，明确 Member/source 边界、GroupFolder/Gallery 资源管理器心智，以及 Reference / Duplicate / Fork / Materialize 语言。 | 不做 CanvasObject / media / drawing seed、cross-note CanvasObject reuse、完整数据库迁移、GraphRAG 或 relation runtime。 | 执行时同步 Roadmap、ContentGroup / GroupFolder contract、Object Inventory、Review、Experience Review、CHANGELOG。 |
| `V2.BN.8.7-ContentGroup-System-Maturity-Master-Plan.md` | V2.BN.8.7 总控执行计划：把 8.6 剩余项和 8.7 maturity 标准拆成 sub-plans，并定义每个 sub-plan 的 audit / implementation / verification / review 小循环。 | 不替代每个 sub-plan 的实际 patch note 和 implementation evidence。 | 作为 8.7 实施顺序和质量门槛的首要入口。 |
| `V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md` | 历史 8.7 CanvasObject seed 草案，现已顺延到 V2.BN.8.8+ 或后续 Canvas track。 | 不再作为 active V2.BN.8.7 入口。 | 恢复执行前应重编号或重发计划，并同步 Canvas State/Data、Interaction Contract、Annotation Contract、Object Inventory。 |

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

## V2.BN.8.2 Canvas Shell And Viewport Transform Entry

`V2.BN.8.2-Canvas-Shell-And-Viewport-Transform-Plan.md` 是第八阶段第二个小版本的执行计划。

它的目标是把当前 Canvas mode 从可工作的 runtime seed 推进为稳定的 canvas shell，并建立第一版 pan / zoom / viewport transform 与 overlay anchor 统一。它同时包含成熟笔记 baseline audit，但明确排除 Relation、Graph DB、GraphRAG、Agent、Structure Studio 和完整导入导出系统。

## V2.BN.8.3 TextFlow And Slash Command Foundation Entry

`V2.BN.8.3-Text-Block-And-Slash-Command-Foundation-Plan.md` 是第八阶段第三个小版本的执行计划。

它的目标是把当前 Canvas Engine 上已经可工作的 NoteBlock 体验推进到成熟笔记写作基础层：建立第一版 `TextBlock` / `TextUnit` / `InlineStructure` / `TextUnitGroup` range helper code seed，并把 slash menu 从单纯 block picker 升级为 context-aware writing command palette。该计划重点区分 create block、convert block、insert structure、inline action 四种 slash command 行为，并明确 V2.BN.8.3 要做代码地基，不只是文档定义。

`V2.BN.8.3-Block-Retreat-And-Definition-Retirement-Patch-Note.md` 记录 8.3 手测后确认的 block retreat patch：Definition 不再作为默认独立 block family。V2.BN.8.5 后的正式口径是：Definition 是 annotation label / ReadingInterpretation proposal，不是固定知识角色、TextUnitGroup 或 inline structure 主线。

V2.BN.8.3 已于 2026-06-15 通过 Henry manual pass 收口。后续 TextUnit editor、gutter、writing role、paste parser、split / merge 等工作进入 V2.BN.8.4+。

## V2.BN.8.4 TextUnit Editor Seed Entry

`V2.BN.8.4-TextUnit-Editor-Seed-Plan.md` 是第八阶段第四个小版本的执行计划。

它的目标是把 V2.BN.8.3 的 TextFlow code seed 推进成第一版可用的 TextUnit editor：Enter / Backspace / Tab、TextUnit gutter、heading/list/quote/todo/toggle writing role、paste-to-TextFlow parser first pass、split / merge seed。它同时处理一个关键历史债务：`Heading` 不再作为 active independent block family，而是下沉为 TextUnit writing role。

`Code` 在 8.4 不做一刀切退场。第一版边界是：inline code 进入后续 inline structure；TextBlock 内的代码行可以是 `TextUnit.writing_role = code_line`；多行、可复制、带语言和行 gutter 的代码区域继续保留 independent CodeBlock。

## V2.BN.8.5 Selection And AnnotationTruth Seed Entry

`V2.BN.8.5-Selection-And-AnnotationTruth-Seed-Plan.md` 是第八阶段第五个小版本的执行计划。

它的目标是把 V2.BN.8.4 形成的 TextUnit editor 接到第一版语义标注地基上：用户可以选中文本范围，通过 selection toolbar 或右键入口创建 `AnnotationTruth`，并在正文中看到低噪声高亮 / underline / badge。8.5 同时建立 annotation inspector seed、AnnotationProposal / ReadingInterpretation seed，并把 `/definition` 从 block creation 入口转向 annotation workflow。

V2.BN.8.5 明确不做完整 AI、Relation runtime、SourceReference attach、Structure Studio、全局 canonical role 或 role slot schema。

## V2.BN.8.x Follow-Up Layout

第八阶段后续小版本按以下方向承接 8.3 中暂时做不了的 TextFlow / editor / canvas work：

- `V2.BN.8.4` TextUnit Editor Seed：TextUnit gutter、Enter / Backspace / Tab、heading/list/quote/todo/toggle writing role、paste parser first pass、split / merge seed、Heading active block retreat、CodeBlock conservative boundary。
- `V2.BN.8.5` Selection And AnnotationTruth Seed：选区模型、第一版 `AnnotationTruth`、文本高亮/标注渲染、右键/selection toolbar 标注入口、annotation inspector seed、Annotation contract seed；inline formula/code/link 退为特殊渲染与稳定锚点能力。
- `V2.BN.8.6` Annotation Editor And ReadingInterpretation Seed：多范围 annotation、子标注、annotation 编辑/删除/可见性、AI-readable annotation projection、`ReadingInterpretation` / annotation proposal seed；TextUnitGroup 退为 annotation range helper / stable range package。
- `V2.BN.8.6.1` Selection Draft Engine：把浏览器原生 selection 降级为输入信号，建立 Coincides-owned `SelectionDraft` truth、临时高亮、追加选区、toolbar 逃逸规则，并把 child label 入口改为 parent annotation 内部二次选区触发。
- `V2.BN.8.6.3` Source-Backed Annotation Range Editing：让 Annotation Stack 的 range preview 与原始 TextFlow source 双向同步。编辑 preview 回写原文；编辑原文刷新 annotation range cache。
- `V2.BN.8.6.4` Annotation Display And Inspector Polish：Preview-level label overlay 总开关、Annotation Stack 层级收束、文字附近 label badge、多 label 局部聚合、SelectionDraft toolbar polish。
- `V2.BN.8.6.7` ContentGroup Rebuild And Legacy Retreat：ContentGroup / Petal 进入第一版运行路径，AnnotationSet / TextUnitGroup 从长期产品真相中降级。
- `V2.BN.8.6.8` Legacy Data Cleanup And Test Reset：逐块退场 AnnotationSet、TextUnitGroup、旧结构化 block、DefinitionBlockProjection、Advanced Insert，并在备份后清空测试账号数据。
- `V2.BN.8.6.9` ContentGroup Hardening And Integrity Gate：让 ContentGroup / Petal 成员引用、preview cache、orphan/stale 检测和持久化边界先稳定下来。
- `V2.BN.8.6.10` ContentGroup Identity Seed：把旧 interpretation 口径改成 `ContentGroup.identity`，并把 accepted identity 定义为 ContentGroup 自己的 accepted / reviewed 状态，不再定义第二套对象。
- `V2.BN.8.6.11` GroupFolder And ContentGroup Gallery Direction Draft：保留历史 plan 文件名，但方向已经从 accepted-only index 转为 GroupFolder / Gallery；Folder 管组织、路径、视图边界和局部 relation graph scope。
- `V2.BN.8.7` ContentGroup System Maturity：Rail / Gallery / Single Editor 职责收束，Member/source 边界、GroupFolder/Gallery resource-manager 心智、Reference / Duplicate / Fork / Materialize 语言稳定。
- `V2.BN.8.8+` CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed：顺延此前 8.7 CanvasObject seed，最小画笔、shape、image insert、CanvasObject layer、region selection reserve，并让图片区域、CanvasObject、media region 能成为 annotation range。
- `V2.BN.8.9+` Canvas Reliability / Scale / Export Reserve Closure：大 note、formula-heavy、workspace outside frame、visible render window、export boundary 和 endpoint reserve。
## V2.BN.8.6 Annotation Editor And ReadingInterpretation Seed Entry

`V2.BN.8.6-Annotation-Editor-And-ReadingInterpretation-Seed-Plan.md` 是第八阶段第六个小版本的执行计划。

它的目标是把 V2.BN.8.5 的 AnnotationTruth seed 补成第一版可用的 annotation editor：支持同一段文字多个 label、重叠 annotation、stack badge / overlay、整块 block 标注、跨 TextUnit / 多范围标注、Inspector 堆叠视图，以及面向未来 AI / Relation 的 `ReadingInterpretation` / `AnnotationProposal` projection seed。

V2.BN.8.6 明确不做完整 AI agent、Relation runtime、SourceReference attach、media annotation、drawing tools、Structure Studio、全局 canonical role taxonomy 或固定 role slot schema。它只把用户可确认的 annotation 真相、AI 可提出但不可自动改写 truth 的 proposal 层、以及后续 composite endpoint 所需的数据边界先立稳。

## V2.BN.8.6.1 Selection Draft Engine Entry

`V2.BN.8.6.1-Selection-Draft-Engine-Plan.md` 是插入在 V2.BN.8.6 与 V2.BN.8.7 之间的地基修补小版本。

它的目标是把文字选区从浏览器原生 selection/focus 副作用中抽离出来，建立 Coincides 自己拥有的 `SelectionDraft`：普通拖选会替换当前 draft，Ctrl / Command 拖选会追加范围，临时高亮必须与 draft truth 一致，toolbar 必须是轻量、临时、可逃离的操作入口。

V2.BN.8.6.1 同时接收 8.6 未完全做稳的 child label 入口：child label 不再主要从 Annotation Inspector 的普通输入框创建，而是在用户选中已有 parent annotation 后，再在 parent annotation 内部二次选择子范围时出现。它不做完整跨 block 选择 UI、完整富文本编辑器、CanvasObject / media selection 或 Relation endpoint editor。

后续 CanvasObject / media annotation 工作仍必须建立在 SelectionDraft 稳定之后，否则图片区域、画笔区域和未来 relation endpoint 仍会反复踩浏览器 selection 的不确定性。

## V2.BN.8.6.3 Source-Backed Annotation Range Editing Entry

`V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Plan.md` 是插入在 V2.BN.8.6.2 与 V2.BN.8.7 之间的数据一致性小版本。

它的目标是把 Annotation Stack 中的 range preview 从只读缓存推进到 source-backed editor：用户编辑 preview 时必须回写原始 TextUnit / TextFlow；用户直接编辑原文时，annotation range 的 offset 和 `range_text_cache` 必须同步刷新。Label input 只改 annotation 名字，不改原文，也不改 range preview。

V2.BN.8.6.3 明确不做 label visibility 总开关、Annotation Stack 视觉重设计、label badge 局部聚合、完整自定义 selection engine 或跨 block range edit。这些体验尾巴进入 V2.BN.8.6.4 或更后的 annotation polish。

## V2.BN.8.6.4 Annotation Display And Inspector Polish Entry

`V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md` 是插入在 V2.BN.8.6.3 与 V2.BN.8.7 之间的 annotation 体验收口小版本。

它接收 8.6.3 明确排除的显示层尾巴：Preview 里增加 label overlay 总开关，正文 label badge 从 block 右上角移动到被标注文字附近，多 label 在局部聚合显示，Annotation Stack 视觉层级收束，SelectionDraft toolbar 清除 `Draft` 这类内部措辞并补齐逃逸行为。

因为 8.6.4 涉及视觉设计，执行前必须使用 `impeccable` 做 product UI gate：先确认 Coincides 的安静研究笔记方向、现有 token / component vocabulary、Annotation Stack 信息层级和 selection toolbar 行为，再动 CSS / UI code。`taste skill` 可以在 Henry 点名时作为补充审美 critique，但默认不能替代 `impeccable` 的产品 UI 审查。

V2.BN.8.6.4 明确不做完整自定义 selection engine 重写、per-label visibility filter、完整 label style editor、CanvasObject / image / drawing annotation 或 Relation endpoint UI。它只负责让现有 annotation truth 的显示和管理不再打扰自然写作；第一版受控 label color token 色板属于本阶段允许的轻量显示能力。

## V2.BN.8.7 ContentGroup System Maturity Entry

`V2.BN.8.7-ContentGroup-System-Maturity-Plan.md` 是第八阶段第七个小版本的执行计划。

它的目标是把当前 ContentGroup / Member / Petal / GroupFolder / Gallery / Rail / Single Editor 收束成 `ContentGroup System 1.0`：稳定、可理解、可复用，并且能被未来 Canvas projection 引用。

V2.BN.8.7 明确不做 CanvasObject / media / drawing seed、cross-note CanvasObject reuse、完整数据库迁移、GraphRAG、relation runtime 或完整 source reconstruction。它只负责让 ContentGroup 能回答自己是谁、在哪里被组织、members 是什么、来自哪里、是否与 source 同步，以及 Reference / Duplicate / Fork / Materialize 分别意味着什么。

## V2.BN.8.8+ CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed Deferred Entry

`V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md` 保留为后续 CanvasObject seed 的历史草案，但不再是 active V2.BN.8.7 入口。

该工作顺延到 V2.BN.8.8+ 或后续 Canvas track。恢复执行前，应重新发行或重编号该计划，并确认 ContentGroup System maturity 已经给 Canvas projection 提供稳定对象边界。
## V2.BN.8.6.7 / V2.BN.8.6.8 ContentGroup And Cleanup Entries

`V2.BN.8.6.7-ContentGroup-Rebuild-And-Legacy-Retreat-Plan.md` records the ContentGroup / Petal rebuild that made `ContentGroup` the serious content package and demoted `AnnotationSet` / `TextUnitGroup` from long-term product truth.

`V2.BN.8.6.8-Legacy-Data-Cleanup-And-Test-Reset-Plan.md` records the cleanup version inserted before the V2.BN.8.7 ContentGroup System maturity pass. It retires AnnotationSet, TextUnitGroup prototype paths, old structured block templates, DefinitionBlockProjection, and Advanced Insert, then backs up and clears all local prototype account data before a full verification pass.

## V2.BN.8.6.9 / V2.BN.8.6.10 / V2.BN.8.6.11 ContentGroup Identity And GroupFolder Entries

`V2.BN.8.6.9-ContentGroup-Hardening-And-Integrity-Gate-Plan.md` records the stability pass after cleanup: ContentGroup member references, Petal member references, source-backed preview refresh, and integrity states must become trustworthy before semantic identity is added.

`V2.BN.8.6.10-ContentGroup-Identity-Seed-Plan.md` records the identity pass: ContentGroup remains the only user-facing object, `identity.status = draft` replaces the old interpretation idea, and `identity.status = accepted` is the ContentGroup's own accepted / reviewed state.

`V2.BN.8.6.11-ContentGroupIndex-Seed-Plan.md` keeps the historical filename, but the active product concept is now `GroupFolder / ContentGroup Gallery`. It records why accepted-only indexing is too narrow, moves organization/depth/scope into GroupFolder, and treats list/index behavior as derived Gallery/query views rather than a truth table.

## V2.BN.8.6.5 Command Surface Contract Entry

`docs/contracts/Command-Surface-Contract.md` defines the command-surface boundary for right-click menus, TextUnit handle menus, future mini toolbars, and future keyboard-command entry points.

For V2.BN.8.6.5, the active command surfaces are text selection, annotation range preview, annotation highlight, and TextUnit handle. Canvas blank menus, CanvasObject menus, comments / Label Comment, relation endpoint menus, and the Word-like mini toolbar remain deferred or reserved.

`V2.BN.8.6.5-Context-Menu-Foundation-Plan.md` and `V2.BN.8.6.5-Context-Menu-Foundation-Patch-Note.md` are the local implementation evidence for this command-surface seed.

## V2.BN.8.6.6 TextUnitGroup And AnnotationSet Editor Foundation Entry

`V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Plan.md` records the inserted foundation version after V2.BN.8.6.5 command surfaces and before later ContentGroup maturity / CanvasObject work.

Its purpose is to make two previously reserved objects usable:

- `TextUnitGroup` as a writing-layer row group helper;
- `AnnotationSet` as a label organization layer and future CompositeEndpoint reserve.

`V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Patch-Note.md` is the implementation evidence. The patch keeps TextUnitGroup out of semantic truth and lets AnnotationSet own multi-label organization, reading projection, and future relation grouping intent.
