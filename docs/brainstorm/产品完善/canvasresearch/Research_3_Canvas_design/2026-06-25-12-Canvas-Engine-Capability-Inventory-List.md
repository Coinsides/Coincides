# 2026-06-25 - Canvas Engine Capability Inventory List

> 阶段三目标：把前两轮调研收束成能力清单。这里不是愿望清单，而是决定后续自研 Canvas Engine 需要具备哪些能力、哪些能力只学习成熟工具、哪些能力必须由 Coincides 自己重建、哪些能力应该延后。

## 0. 核心判断

Coincides Canvas 不只是白板，也不只是页面系统。它应该同时承担四个角色：

1. 白板：允许自由摆放、连接、草稿化组织。
2. 页面系统：承载 PageFrame、正式写作、导出边界、页眉页脚、页码、模板。
3. 空间组织层：让知识通过位置、距离、并列、聚类、包围、指向来表达意义。
4. AI-readable layout：让 AI 可以读取对象的位置、尺寸、遮挡、层级、所属页面、阅读顺序和上下文关系。

因此，Canvas Engine 的重点不是“有多少种花哨 Object”，而是先建立一套能长期容纳 Object、PageFrame、TextFlow、ContentGroup、Relation 和 Agent 的底座。

## 1. 能力分层

### 1.1 Engine Foundation

| 能力 | Coincides 需要什么 | 8.8 优先级 | 说明 |
| --- | --- | --- | --- |
| 有限可扩展世界 | 必须有 | P0 | 用户不需要数学意义上的无限画布，需要的是当前空间不够时能自然扩展。 |
| 坐标系统 | 必须有 | P0 | world / viewport / screen 坐标必须稳定转换。 |
| viewport pan / zoom | 必须有 | P0 | Canvas Mode 的基础。 |
| Page Mode / Canvas Mode | 必须有 | P0 | Page Mode 默认聚焦主 PageFrame；Canvas Mode 展开空间。 |
| Layer system | 必须有 | P0 | background / page frame / block / object / connector / overlay / debug 分层。 |
| Scene runtime | 必须有 | P0 | 当前 seed 还偏模型和 UI，后续要有统一 runtime 管理对象索引、命中测试、可见窗口。 |
| Measurement service | 必须有 | P0 | AI-readable layout 和 hit testing 都需要尺寸测量。 |
| Render window | 应该有 | P1 | 大画布性能基础，8.8 可以先做接口和简单裁剪。 |
| Chunk / tile expansion | 延后 | P2 | 有限画布成熟后再做更像无限画布的区块扩展。 |

### 1.2 Interaction Kernel

| 能力 | Coincides 需要什么 | 8.8 优先级 | 说明 |
| --- | --- | --- | --- |
| select / multi-select | 必须有 | P0 | 所有 Object 操作的基础。 |
| drag / resize | 必须有 | P0 | PageFrame、Block projection、Shape 都依赖。 |
| rotate | 可以延后 | P2 | 数据字段可以预留，第一版可限制为 0。 |
| z-index | 必须有 | P0 | AI-readable layout 需要判断遮挡和前后关系。 |
| snap | 应该有 | P1 | PageFrame margin / ruler / object 对齐都依赖。 |
| keyboard operations | 应该有 | P1 | 删除、复制、移动、撤销。 |
| context menu | 应该有 | P1 | 升格为 block-backed、建立投影、打开源对象等操作入口。 |
| clipboard | 延后 | P2 | 先做内部 duplicate / fork，再做系统级复制粘贴。 |
| undo / redo | 必须有接口 | P1 | 8.8 至少要有 CanvasCommand / CanvasDelta 种子，不必一次做完整历史。 |
| grouping | 延后 | P2 | 需要先稳定 CanvasObject 和 Placement。 |

### 1.3 Object Family

| Object Family | 8.8 状态 | 后续状态 | 判断 |
| --- | --- | --- | --- |
| PageFrame | 必须做 v1 | 继续精细化 | 第一特殊 CanvasObject，决定用户第一体验。 |
| Paragraph block projection | 必须做 | 持续增强 | TextFlow 是内容真相，Canvas 只是空间投影。 |
| Pure shape | 应该做最小版 | 可扩展 | 矩形、圆角矩形、圆形、线条等先用于白板表达。 |
| Block-backed shape | 应该做最小版 | 可扩展 | 图形填文字，本质是 shape 挂载 paragraph block。 |
| Visual arrow / connector | 应该做最小版 | 与 Relation 分流 | 普通 Canvas 箭头默认无 Relation 语义。 |
| Image object | 可以做最小版 | 成为 image block / asset | 先支持摆放和读取 alt / caption 字段。 |
| Table object | 可以做壳 | 后续成熟 | 表格需要结构化内容，不宜只当图片。 |
| ContentGroup projection | 预留 | 8.10+ | 需要 CanvasObject 成熟后再做 reuse 投影。 |
| Petal projection | 预留 | Relation / Graph 后 | Petal 是 ContentGroup 内部结构，不先作为独立画布基础物。 |
| Diagram / flowchart | 延后 | 独立小版本 | 需要节点、边、布局、编辑器，不适合塞进 8.8。 |
| Mind map | 延后 | 独立小版本 | 可参考 XMind / Markmap，但要接 TextFlow 和 ContentGroup。 |
| Math graph / chart | 延后 | 作为 structured block family | 比 diagram 更规则，但仍需要数据源和编辑模型。 |
| Raw ink / handwriting | 延后 | 专门版本 | 不是 OCR 一个问题，还涉及圈注、连接、草图、视觉理解。 |
| 3D viewer | 延后 | 只做展示型 object | 适合作为 asset viewer，不进入 8.8。 |

### 1.4 AI-readable Layout

| 能力 | 8.8 优先级 | 说明 |
| --- | --- | --- |
| Canvas AI Tree | P0 | 派生快照，不是数据库真相。 |
| object bbox | P0 | AI 至少要知道对象占地，不只是一个坐标点。 |
| z-order / visibility | P0 | 需要判断遮挡、隐藏、是否在可读区域。 |
| page affiliation | P0 | 对象属于 PageFrame 内、外、跨边界，语义不同。 |
| reading order hint | P1 | PageFrame 内可以近似阅读顺序；自由画布要靠空间顺序和人工提示。 |
| selection context | P1 | Agent 读取用户当前选中的对象。 |
| semantic tags | P2 | 后续可由用户或 AI 给 object 添加用途标签。 |
| visual OCR snapshot | P2 | 用于补足手写、图片、外部渲染对象，不作为第一真相。 |

### 1.5 Agent / Proposal

| 能力 | 8.8 优先级 | 说明 |
| --- | --- | --- |
| read snapshot | P0 | Agent 可读 Canvas AI Tree。 |
| generate proposal | P1 | AI 不直接改真相，先生成 CanvasProposal。 |
| apply proposal | P1 | 用户确认后转成 CanvasCommand。 |
| create object command | P2 | 8.8 可先预留，不急着做完整 Agent。 |
| move / align command | P2 | Agent 布局建议后续再做。 |
| summarize / cluster | P2 | 依赖 ContentGroup / PageFrame / selected context。 |
| relation proposal | Later | Relation 版本再做。 |

## 2. Adopt / Adapt / Rebuild / Defer 矩阵

| 来源能力 | 采取策略 | Coincides 做法 |
| --- | --- | --- |
| Excalidraw 的元素模型、命中测试、选择交互 | Adapt | 学习它怎样处理 element、bounds、selection、binding，但不采用它的 store 作为真相。 |
| tldraw 的 reactive store、shape registry、tool state machine | Adapt | 学习 registry 和工具状态机思想；不采用受限协议作为核心运行时。 |
| React Flow 的节点/边思路 | Adapt / Defer | 用于后续 ContentGroup Mode / Relation View，不作为普通 Canvas 的默认箭头语义。 |
| Markmap 的 Markdown 到 mind map 显化 | Adapt / Defer | 学习从结构化文本生成视觉结构；先不做 mind map object。 |
| XMind 的成熟思维导图交互 | Observe / Defer | 作为产品交互参考，不进入第一版引擎。 |
| Miro 的 AI canvas context | Observe / Rebuild | 学它“选中画布对象作为 AI 上下文”的交互，不复制它的黑盒实现。 |
| BlockSuite 的 page/block/whiteboard 融合 | Observe / Rebuild | 方向相似，但富文本和 block truth 与 Coincides 冲突，不接 runtime。 |
| Word / Pages 的页面、标尺、页眉页脚、导出 | Adapt | PageFrame 需要吸收这些页面系统能力。 |
| 浏览器 Accessibility Tree | Adapt | Canvas AI Tree 可以学习它的结构化可读思想，但不照搬 DOM a11y。 |

## 3. 必须自研的能力

以下能力不应该交给外部画布库作为最终真相：

1. CanvasObject 与 TextFlow 的挂载关系。
2. PageFrame 的正式页面语义、主 PageFrame 规则和导出边界。
3. Canvas AI Tree。
4. ContentGroup / Petal / Relation 的投影边界。
5. Agent Proposal / Command 的安全改写边界。
6. Visual arrow 与 Relation edge 的区分。
7. Page Mode / Canvas Mode / ContentGroup Mode 的模式分工。

原因很简单：这些能力不是通用白板能力，而是 Coincides 的产品心智和 AI-readable 知识底座。

## 4. 8.8 最小能力线

V2.BN.8.8 不应该追求“完整 Canvas 产品”，而应该完成以下底座：

1. 正式 CanvasObject / CanvasPlacement / ContentMount 合同。
2. PageFrame v1：主 PageFrame、Page Mode、基础导出区域、content inset。
3. Paragraph block 在 Canvas 上的稳定投影。
4. Pure shape 与 block-backed shape 的最小路径。
5. Visual arrow / connector 的非语义版本。
6. CanvasCommand / CanvasDelta / History seed。
7. Canvas AI Tree read-only snapshot。
8. 基础 selection / drag / resize / z-index / snap。

## 5. 8.8 明确不做

1. 不做完整无限画布。
2. 不做完整图形编辑软件。
3. 不做完整 diagram / mind map / chart / math graph。
4. 不做 Raw Ink 的 AI 理解。
5. 不做 Agent 直接写入数据库。
6. 不把普通箭头自动解释成 Relation。
7. 不把外部 canvas store 作为数据库真相。
8. 不把 ContentGroup projection 做成主线功能。

## 6. Inventory 自检

单独的 capability inventory 不够，它只能回答“有什么能力”。阶段三还需要继续补齐：

1. Entity Responsibility Inventory：谁是真相，谁是投影，谁是快照。
2. Interaction Workflow Inventory：用户动作如何变成命令和数据。
3. AI / Agent Operation Inventory：AI 能读什么、提议什么、不能直接改什么。
4. Version Cut Matrix：哪些能力进入 8.8，哪些拆到后续版本。
5. Minimal Engine Design：这些能力如何落成引擎结构。
6. PageFrame Design：第一特殊 Object 怎么精细化。
7. Projection Fusion Design：TextFlow、ContentGroup、CanvasObject 如何接起来。

结论：能力清单是阶段三的入口，不是最终答案。
