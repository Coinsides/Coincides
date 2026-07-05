> **状态 (Status)**: active
> **层 (Layer)**: 决策 / Decisions
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: PI-046 作为"实现路线依据"的地位(`docs/brainstorm/产品完善/PI-046 Research/Coincides-product-reset-and-editor-foundation-decision.md`)。PI-046 仍是有效的**历史研究依据**,非"错误"。
> **被取代 (Superseded by)**: —

# ADR-0001: 自研最小混合 Canvas 引擎路线 (Self-owned Minimal Hybrid Canvas Engine)

## 背景 (Context)

**PI-046 调研(2026-06-07)** 是 Better Notebook 第 6 个小版本之前最重要的一次架构调研。它当时的最重要结论是:

- 保留 v2.x 语义底座;冻结 Course Detail 堆叠式 UI 扩张;
- **第一步去做 BlockSuite "Edgeless-as-page" + Coincides 语义 sidecar 的 spike**;
- 自研 editor/canvas 仅作为 **fallback**;
- 不 full-fork AFFiNE,不立刻上 Neo4j(图数据先于图数据库)。

但 PI-046 是在一个**信息不足的时间点**做的:

- 当时**还没有 ContentGroup 的设计**;
- 当时**还不知道 canvas 引擎到底该怎么做**,后续何去何从不清楚;
- 当时产品的"四大支柱 + 三大真相"模型尚未成型。

此后产品思路发生了关键演进(block-first → annotation-first → 回到 TextFlow-first,并长出 ContentGroup)。**2026-06-25 的 Canvas 调研与设计集**(`docs/brainstorm/产品完善/canvasresearch/Research_3_Canvas_design/`,尤其 17、19、20 号与 Phase-3 总结)在新认知下重新评估了引擎路线。

新认知的核心是三条已锁定的"真相",它们会与任何外部引擎的内置真相冲突:

- `TextFlow = 内容真相`
- `ContentGroup = 知识结构真相`
- `Canvas = 空间/布局真相`

直接接入外部引擎(BlockSuite / Excalidraw / tldraw / React Flow)短期可能快,长期会反复遇到"它的 truth 与我们的 truth 冲突"。

## 决定 (Decision)

**Canvas Engine(第三支柱)采用"自研最小混合 NoteCanvas 引擎"(Self-owned Minimal Hybrid NoteCanvas Engine),并明确不直接接入 BlockSuite / AFFiNE / Excalidraw / tldraw / React Flow 作为运行时。**

- 架构:自有数据模型 + 自有 runtime kernel;DOM 承载 TextFlow;SVG/overlay 承载连接线与 handle;CSS transform 负责 pan/zoom。
- 外部项目(AFFiNE/BlockSuite/tldraw 等)**降级为"结构参考 / 交互参考"**,不再是运行时真相,也不再是"第一步要做的 spike"。
- 本决定取代 PI-046 作为**当前实现路线依据**的地位:其中"以 BlockSuite Edgeless 为主路线、自研为 fallback"的结论不再作为路线依据。**PI-046 的其余结论(保留 v2.x 语义底座、图数据先于图数据库、不 full-fork AFFiNE)仍然成立**,本 ADR 只取代其引擎路线部分。
- 口径说明:**PI-046 不是"错了"**。它是在信息不足的时间点(尚无 ContentGroup 设计、尚不清楚 canvas 怎么做)给出的历史研究依据;随着认知到位,路线自然演进。PI-046 作为历史研究依据继续有效,只是不再作为当前路线依据。

本决定**已在代码中体现**:canvas 运行时模型版本号为 `V2.BN.8-self-owned-minimal-hybrid-0`,即自研路线已进入实现阶段(V2.BN.8.8 Canvas Engine Foundation 起)。

## 后果 (Consequences)

**正面:**
- 引擎真相与 Coincides 的三大真相一致,长期不再受外部引擎数据模型牵制。
- 路线收口:消除"PI-046(BlockSuite)vs 06-25(自研)"两个北极星的分歧。今后两个 Agent 一律以本 ADR 为准。
- PI-046 及相关旧调研保留原文,标记为 `superseded`,可作历史追溯,但不再作为干活依据。

**负面 / 债务:**
- 自研引擎需自己承担排版、虚拟化、性能等本可"白嫖"成熟引擎的工作;性能必须从一开始就作为设计目标(见路线图 Phase F)。
- 自研 `CanvasObject / CanvasPlacement / PageFrame` 模型需要迁移现有种子类型;当前未投产,可清理测试数据,但一旦出现真实用户数据需重新评估。

**留下的未知数 / 待验证(重要):**
- **最深的技术风险:TextFlow 能否在被 pan/zoom 变换过的 canvas 中稳定编辑。** 这是"DOM 承载文字 + CSS transform 承载视口"混合方案的命根子(见 06-25 doc 20 §9 列为会让 8.8 停工的条件之一)。建议在全面铺开 8.8 前先做最小 spike 验证。
- Canvas AI Tree 能否从 runtime 稳定取得 bbox;模式切换(Page/Canvas)是否破坏阅读体验。

## 相关文档

- 被取代:`docs/brainstorm/产品完善/PI-046 Research/Coincides-product-reset-and-editor-foundation-decision.md`(BlockSuite 主路线部分)
- 决定依据:`docs/brainstorm/产品完善/canvasresearch/Research_3_Canvas_design/` 的 17 / 19 / 20 号文档与 Phase-3 总结
- 路线图:`docs/Coincides-Better-Notebook-Roadmap.md`(2026-06-25 Canvas Engine Roadmap Correction)
