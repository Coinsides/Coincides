# 06. CanvasObject 调研方法与评分标准

status: stage-2 research
date: 2026-06-25 America/Toronto
scope: CanvasObject definition, AI-readable layout, agent operation boundary

## 1. 这轮调研要回答什么

第二阶段不直接写 8.8 实现方案。它只回答一个中间问题：

```text
Coincides 里的 CanvasObject 究竟应该是什么？
```

这个问题不能只从白板工具出发，也不能只从现在工程里的 `CanvasObjectReserve` 出发。Coincides 的特殊性在于：

- `TextFlow` 是内容真相；
- `ContentGroup` 是知识结构真相；
- `Canvas` 是空间 / 布局真相；
- `CanvasObject` 必须能参与 AI-readable layout，但不能篡夺 TextFlow 或 ContentGroup 的职责。

所以这轮调研的目标不是“找一个现成引擎接进来”，而是用成熟产品、开源源码、Accessibility Tree / UI parsing 和当前 Coincides 模型，反推我们自己的对象边界。

## 2. 证据分层

本阶段使用四类证据，每类证据的权重不同。

| 证据层 | 代表材料 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| 成熟产品行为 | Miro、Whimsical、XMind | 用户心智、AI 产物如何落回画布、selection context 怎样进入 prompt | 不能证明底层数据模型适合 Coincides |
| 开源源码 | Excalidraw、xyflow / React Flow、Mermaid、Markmap | object / node / edge / scene / render / interaction 的工程表达 | 不能直接成为 Coincides 业务真相 |
| 可访问性与 UI parsing | Playwright ARIA snapshot、React Flow accessibility、OmniParser | AI-readable tree 的字段候选、层级表达、role / state / bounds 思路 | 不能替代我们自己的持久化模型 |
| 当前 Coincides 工程 | `runtimeDataTypes.ts`、`types.ts`、TextFlow / Block / PageFrame 代码 | 已有边界、已有债务、可以顺势生长的接口 | 不能代表最终模型，尤其 CanvasObject 仍是 reserve |

判断原则：

```text
产品行为提供方向。
源码结构提供工程启发。
Accessibility / UI parsing 提供 AI-readable 视角。
Coincides 自己的 TextFlow / ContentGroup / PageFrame 决定最终边界。
```

## 3. 核心术语的临时定义

这些定义只是第二阶段调研用语，不是最终合同。

| 术语 | 临时定义 |
| --- | --- |
| editable output | AI 生成后，用户能继续编辑内部节点、文本、结构或文档内容，而不是只得到一张不可编辑图片 |
| AI-readable object | 系统能把对象的身份、位置、范围、可见性、层级、内容摘要和交互状态提供给 AI |
| AI-readable layout | AI 不只读文本，还能知道对象在哪里、占多大、和谁邻近、是否遮挡、处于哪个 PageFrame / workspace |
| Agent materialization | Agent 把一个 proposal 变成实际对象、文档、diagram、ContentGroup projection 或 PageFrame 内容的过程 |
| Canvas AI Tree | 给 AI 读取的派生结构树，类似 Accessibility Tree，但服务于 Coincides 的知识和布局理解 |
| block-backed CanvasObject | 空间对象挂载一个 `paragraph block` / formula block / table block 等内容对象 |
| pure visual CanvasObject | 只承担视觉和空间作用，不直接拥有可读内容真相 |
| structured object family | diagram、math graph、chart、3D viewer 等内部有专门结构的对象族 |

## 4. 调研问题清单

每个候选产品或代码库都用同一组问题检查。

### 4.1 对成熟产品的问题

- 它是否允许选中 canvas 上的对象作为 AI 上下文？
- 生成结果是 diagram、document、sticky notes、table、prototype，还是图片？
- 生成结果是否可以编辑内部结构？
- 生成结果是直接落在画布上，还是先在 side panel / focus mode 中生成？
- 用户能否继续修改 AI 产物并把它重新放回画布？
- 它是否保留来源、上下文、同步关系或 provenance？
- 它对用户心智的暗示是什么？

### 4.2 对开源库的问题

- 最小 object / node / element 字段是什么？
- 它如何保存位置、尺寸、zIndex、旋转、可见性、选中状态？
- text 是对象内部字段、单独对象、DOM 子节点，还是外部引用？
- edge / arrow 如何连接到对象？是否有 handle / binding？
- selection / focus / keyboard / accessibility 如何表达？
- undo / redo 是 snapshot、delta、command log，还是外部 store？
- serialization 能否和业务真相分离？
- 哪些设计能学，哪些设计会污染 Coincides？

### 4.3 对 AI-readable layout 的问题

- AI 读取时是否需要完整 DOM？
- 是否需要 screenshot-to-structure 作为辅助？
- bounds 是持久化字段、渲染测量字段，还是 snapshot 派生字段？
- hierarchy 是来自 PageFrame / group / layer，还是来自视觉聚类？
- reading order 如何产生？由 TextFlow、PageFrame、zIndex、空间排序共同决定，还是单独生成？
- hidden / collapsed / occluded / clipped 等状态是否进入 AI snapshot？
- Agent 能否直接修改对象，还是只能提交 proposal / command？

## 5. 候选范围

### 5.1 成熟产品主样本

本阶段只把三个产品作为重点样本：

| 产品 | 选择原因 |
| --- | --- |
| Miro | selection context、Doc、diagram、sticky note clustering、board content prompt 都和 Coincides 高度相关 |
| Whimsical | AI flowchart / mind map 的“可编辑产物”表达很清楚 |
| XMind | mind map 作为结构化思维对象成熟，且 AI 将网页、PDF、图片等转为 editable mind map 的路径值得观察 |

其他产品如 FigJam、Mural、Lucidchart、Eraser、DiagramGPT 暂不进入主样本，只作为后续补充。

### 5.2 开源源码主样本

| 代码库 | 当前用途 | 本阶段定位 |
| --- | --- | --- |
| Excalidraw | 完整白板 / scene / element / binding / export | 学习白板对象和交互内核 |
| xyflow / React Flow | node-edge 编辑器 | 学习可编辑节点、边、handle、accessibility |
| Mermaid | diagram-as-code | 学习结构文本到 diagram 渲染的分层 |
| Markmap | Markdown 到 mind map | 学习文本结构到空间树的转换 |

四个库当前本地都在 `D:\Coinsides\v2.x\_research`，第一轮只做源码学习，不把任何库接入主工程。

## 6. 评分维度

每个产品或代码库按 1-5 分粗评，分数只用于排序，不是绝对结论。

| 维度 | 1 分 | 3 分 | 5 分 |
| --- | --- | --- | --- |
| Editable output | 主要是图片 | 可编辑部分文本或节点 | 产物内部结构完整可编辑 |
| AI-readable value | 只能启发 UI | 可启发 snapshot 字段 | 可直接反推 Canvas AI Tree |
| TextFlow compatibility | 内建文本系统强冲突 | 可隔离文本系统 | 可让 Coincides TextFlow 成为内容根 |
| PageFrame compatibility | 与页面系统无关 | 可模拟 frame | 能启发 PageFrame / document object |
| Source / provenance | 无来源概念 | 有上下文但弱来源 | 能清楚支持选中上下文、引用、同步或回链 |
| Engineering learnability | 代码复杂且难拆 | 可读部分模块 | 模型清楚，局部可借鉴 |
| License / adoption safety | 商用或集成风险高 | 只适合研究 | 可安全研究，必要时可局部借鉴 |
| Coincides fit | 会带来第二套真相 | 只能参考行为 | 能反补我们的对象合同 |

## 7. 本阶段明确拒绝的方向

- 不把 AI 生成的流程图主要落成不可编辑图片。
- 不把外部库的 text shape 当成 Coincides 的文字系统。
- 不把外部库的 scene / store 当成 Coincides 的业务数据库。
- 不把普通 canvas arrow 自动解释为 Relation。
- 不让 Agent 在没有 proposal / command 边界的情况下直接改业务真相。
- 不把所有对象都强行塞进 Block。
- 不把纯图形、Raw Ink、PageFrame、ContentGroup projection 一律当成 paragraph block。

## 8. 验收标准

第二阶段完成时，至少要能回答：

- `Block != CanvasObject` 是否成立；
- `block-backed CanvasObject` 的边界是什么；
- `pure visual CanvasObject` 的边界是什么；
- `structured object family` 应如何进入 Canvas；
- Agent 应通过什么边界操控画布；
- Canvas AI Tree 最小字段是什么；
- 哪些对象字段必须持久化，哪些应在 snapshot 生成时派生；
- 哪些问题必须留给第三阶段融合设计。

## 9. 参考来源

- Miro Create with AI: https://help.miro.com/hc/en-us/articles/20164358139794-Create-with-AI
- Miro Docs: https://help.miro.com/hc/en-us/articles/20164660410898-Docs-in-Miro
- Whimsical AI mind maps: https://whimsical.com/ai/ai-mind-maps
- XMind AI: https://xmind.com/ai
- React Flow Node type: https://reactflow.dev/api-reference/types/node
- React Flow accessibility: https://reactflow.dev/learn/advanced-use/accessibility
- Playwright ARIA snapshots: https://playwright.dev/docs/aria-snapshots
- Microsoft OmniParser article: https://www.microsoft.com/en-us/research/articles/omniparser-for-pure-vision-based-gui-agent/
