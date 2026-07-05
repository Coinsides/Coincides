# 2026-06-25 Coincides Canvas 第一阶段调研总结

status: phase-1 summary
date: 2026-06-25 America/Toronto
scope: 第一阶段调研产出总结、稳定判断、第二阶段融合设计输入材料

> 本文是 Coincides Canvas 第一阶段细致调研的收口文档。它的任务不是直接写 8.8 plan，而是把第一阶段所有文档产出整理成第二阶段可使用的材料包。

## 1. 第一阶段目标回顾

本轮调研的背景是：

```text
Coincides 已经完成 ContentGroup System 的一轮成熟化推进，
接下来要重新回到第三大支柱：Coincides Canvas。
```

但 Canvas 不能直接开写。

原因是它牵涉太多基础问题：

- Canvas 在 Coincides 里到底意味着什么；
- 它是白板、页面系统、空间组织层，还是 AI-readable layout；
- PageFrame 是不是 CanvasObject；
- TextFlow block 如何进入 Canvas；
- shape 内部文字是否仍然属于 TextFlow；
- 普通箭头和 Relation 如何区分；
- 是否接入成熟画布引擎；
- 如果自研，又该学成熟工具的哪些东西。

因此第一阶段的目标被限定为：

```text
查清材料，不急着下最终设计结论。
```

更具体地说：

```text
它都有什么？
我们需要什么？
哪些东西能学？
哪些东西不能搬？
```

第二阶段才回答：

```text
Coincides Canvas 到底应该怎么做？
```

## 2. 第一阶段文档产出清单

本阶段实际产出了 7 份文档。

```text
docs/brainstorm/产品完善/canvasresearch/
```

### 2.1 调研路线文档

```text
2026-06-25-Coincides-Canvas-Research-Outline.md
```

作用：

- 建立本轮调研的两阶段结构；
- 明确第一阶段只做调查与需求清点；
- 明确第二阶段才做融合设计与路线判断；
- 记录 Coincides Canvas 的前置判断；
- 拆出 01-09 的研究文档路线。

这份文档是整个调研的索引和边界。

### 2.2 Excalidraw 产品与源码层级总览

```text
2026-06-25-01-Excalidraw-Product-And-Source-Layer-Overview.md
```

作用：

- 盘点 Excalidraw 的 monorepo 结构；
- 区分 app 层、React component 层、element 层、renderer 层、scene 层、data 层；
- 判断哪些目录对 Coincides 有参考价值；
- 明确 Excalidraw 的产品应用层不应该照搬。

这份文档解决的问题是：

```text
一个成熟画布工具大致分成哪些层？
```

### 2.3 Excalidraw 交互内核调研

```text
2026-06-25-02-Excalidraw-Interaction-Kernel-Research.md
```

作用：

- 调研 pointer lifecycle；
- 调研 pan / zoom / drag / resize / rotate；
- 调研 selection / hit testing；
- 调研 snapping / history capture；
- 记录成熟画布工具如何把用户操作收束成统一交互控制器。

这份文档解决的问题是：

```text
Canvas 交互不应该散落在每个 object 自己身上，
而应该有统一的 pointer session / interaction controller。
```

### 2.4 Excalidraw Scene / Element / Store 数据结构调研

```text
2026-06-25-03-Excalidraw-Scene-Element-Store-Research.md
```

作用：

- 调研 Element 最小字段；
- 调研 Scene runtime cache；
- 调研 AppState；
- 调研 Store / Delta；
- 调研 History；
- 区分可保存真相、运行时缓存、交互状态、历史增量；
- 建立 Excalidraw 与 Coincides 的数据层翻译表。

这份文档解决的问题是：

```text
成熟画布工具不会只靠一张 objects 表解决所有问题。
对象真相、运行时场景、交互状态、历史增量必须分层。
```

### 2.5 Excalidraw Arrow / Line / Binding 视觉连线机制调研

```text
2026-06-25-04-Excalidraw-Arrow-Line-Binding-Research.md
```

作用：

- 调研 arrow / line 的数据结构；
- 调研 endpoint binding；
- 调研 fixedPoint；
- 调研 object move 后 arrow 如何跟随；
- 调研 linear editor；
- 调研 elbow arrow 的复杂度；
- 明确普通 Canvas arrow 和 Coincides Relation 的边界。

这份文档解决的问题是：

```text
Excalidraw binding 解决的是“线怎么粘住对象”，
Coincides RelationProposal 解决的是“知识关系是否成立”。
```

### 2.6 Coincides 当前有限画布胚胎与需求盘点

```text
2026-06-25-05-Coincides-Canvas-Seed-And-Needs-Inventory.md
```

作用：

- 盘点当前 `client/src/pages/Notes/canvasEngine/`；
- 记录 page mode / canvas mode；
- 记录 finite world；
- 记录 viewport / pan / zoom；
- 记录 primary PageFrame；
- 记录 TextFlow block placement；
- 记录 scratch workspace；
- 记录 export / AI visibility；
- 记录 relation endpoint reserve；
- 记录 model contract check；
- 列出当前胚胎距离正式 Canvas Engine 的差距。

这份文档解决的问题是：

```text
Coincides 不是从零开始做 Canvas。
当前已经有一个可扶正的有限画布胚胎。
```

### 2.7 第一阶段调研总结

```text
2026-06-25-Phase-1-Coincides-Canvas-Research-Summary.md
```

作用：

- 总结第一阶段文档；
- 提炼稳定判断；
- 整理第二阶段输入；
- 明确第二阶段要回答的问题；
- 避免后续从零重读材料。

也就是当前这份文档。

## 3. 第一阶段稳定判断

下面这些判断已经比较稳定，可以作为第二阶段设计输入。

### 3.1 Coincides Canvas 应以自研为主线

本阶段没有得出“接入 Excalidraw”或“接入 tldraw”的结论。

更稳定的判断是：

```text
Coincides Canvas 应以自研为主线，
成熟画布工具用于研究和借鉴。
```

理由：

- Coincides 已经有 TextFlow 作为内容真相；
- ContentGroup / Petal / Member 也已经形成自己的知识结构；
- PageFrame 不是普通白板 frame；
- AI-readable Canvas 需要和 TextFlow / ContentGroup / Relation 深度耦合；
- 外部工具的 text shape / store / page / relation model 都不能直接成为 Coincides 的真相。

成熟工具可以学习：

- 交互控制；
- hit testing；
- selection；
- viewport；
- element geometry；
- scene runtime；
- delta / history；
- arrow binding；
- renderer 分层。

但不能照搬：

- text shape truth；
- store as DB；
- ordinary arrow as relation；
- frame as PageFrame；
- app shell。

### 3.2 有限画布是根基

当前已经稳定：

```text
Coincides Canvas 的根基不是数学意义上的无限画布，
而是可扩展的有限画布。
```

原因：

- 用户不需要真正无限；
- 用户需要足够大、可继续扩展、体验上近似无限；
- 有限 world 更容易持久化；
- 有限 world 更容易做 AI snapshot；
- 有限 world 更容易做 export；
- 有限 world 更容易做性能边界；
- 当前工程已经有 `DEFAULT_CANVAS_WORLD`。

未来可以扩展成 region / chunk，但不必一开始追求真正无限。

### 3.3 TextFlow 是内容真相

这个判断继续保持：

```text
TextFlow 是内容真相。
CanvasObject 是空间投影和交互载体。
```

因此：

- shape 里如果要填文字，应该挂载 TextFlow / Block；
- 不应该引入第二套 text shape truth；
- table / image / formula / code 需要继续思考 block-like object 的边界；
- Canvas 负责空间、位置、尺寸、变换、可见性、导出和 AI snapshot；
- 内容本身仍然由 TextFlow 管。

### 3.4 PageFrame 是第一个必须精细化的特殊 CanvasObject

PageFrame 不能当普通 frame 草率处理。

它承担：

- 正式写作区域；
- PageMode 入口；
- 主 PageFrame；
- 多 PageFrame；
- 导出区域；
- 页边距；
- 标尺；
- 页眉页脚；
- 页码；
- 背景；
- 模板；
- TextFlow 排版边界；
- AI/export visibility 的基础边界。

所以第二阶段必须单独写 PageFrame 设计稿。

### 3.5 Canvas Mode 和 ContentGroup Mode 应该分工

当前判断：

```text
Canvas Mode 中的 arrow 是视觉对象。
ContentGroup Mode 中的 arrow 才可能是 Relation / RelationProposal 的投影。
```

普通 Canvas arrow 表示：

- 流程；
- 草图；
- 指示；
- 视觉强调；
- 临时线索。

它不自动产生知识 Relation。

ContentGroup Mode 负责：

- ContentGroup node；
- Petal node；
- Relation edge；
- RelationProposal edge；
- AI suggested relation；
- 用户确认 relation。

这能避免把普通白板箭头误解释成知识图谱边。

### 3.6 OCR / 视觉理解只能是补充，不是基础真相

前面讨论过 OCR 和截图理解。

第一阶段稳定判断是：

```text
AI-readable Canvas 应以结构化 snapshot 为主，
视觉/OCR 作为补充。
```

也就是说 AI 应该优先读取：

- object id；
- kind；
- geometry；
- PageFrame；
- placement；
- TextFlow content；
- ContentGroup projection；
- export/AI visibility；
- relation proposal；
- source link。

截图/OCR 可以帮助理解局部视觉气质，但不能成为唯一真相。

## 4. 当前工程已经具备的基础

当前 `canvasEngine` 已经具备：

- `NoteCanvasMode`；
- `CanvasSurface`；
- `CanvasViewport`；
- `CanvasWorldModel`；
- `PageFrameModel`；
- `BlockPlacementModel`；
- `CanvasObjectReserve`；
- `RelationEndpointReserve`；
- `NoteCanvasRuntimeModel`；
- finite world；
- viewport pan / zoom；
- page / canvas mode；
- primary PageFrame；
- block placement；
- formal page / canvas workspace；
- scratch / export hidden / AI hidden；
- model contract check。

这说明 8.8 的入口应当是：

```text
扶正当前引擎胚胎。
```

而不是：

```text
彻底推倒当前实现，另起炉灶。
```

当然，扶正不等于不重构。

更准确的说法是：

```text
保留当前已经验证过的产品判断，
重构它的实体边界、runtime 分层和交互控制。
```

## 5. 当前最大差距

### 5.1 缺正式 CanvasObject

当前只有 `CanvasObjectReserve`。

正式引擎需要：

```text
CanvasObject
CanvasPlacement
CanvasObjectKind
CanvasObjectPayload
CanvasObjectRuntime
```

而且要支持：

- note block projection；
- shape；
- image；
- table；
- arrow；
- freehand；
- PageFrame；
- ContentGroup projection；
- maybe Petal projection。

### 5.2 缺多 PageFrame

当前是 primary PageFrame seed。

正式设计需要：

- 多 PageFrame；
- primary PageFrame；
- PageMode 默认入口；
- 删除规则；
- 仅剩一个 PageFrame 时自动成为 primary；
- 自由画布 note 不强制 primary；
- PageFrame 模板和尺寸；
- page sequence。

### 5.3 缺 CanvasSceneRuntime

当前 runtime model 已经有，但还不是完整 scene runtime。

后续需要：

- object index；
- visible object；
- selection cache；
- hit test map；
- PageFrame children；
- binding index；
- snap guide；
- region/chunk index；
- layer ordering；
- object adapter。

### 5.4 缺统一交互内核

当前交互集中在 UI 层，已经能用，但会继续变复杂。

正式引擎需要：

- CanvasController；
- CanvasPointerSession；
- CanvasSelectionController；
- CanvasTransformController；
- CanvasViewportController；
- CanvasKeyboardController；
- CanvasCommandDispatcher。

### 5.5 缺 CanvasCommand / CanvasDelta / History

成熟画布工具说明：

```text
拖动过程中的每一帧变化不应该都是一次独立 undo。
```

Coincides 需要 command 级记录：

- move object；
- resize object；
- create object；
- delete object；
- set primary PageFrame；
- change PageFrame template；
- materialize projection；
- accept relation proposal。

### 5.6 缺普通 visual arrow 与 semantic relation 的双层系统

当前有 relation endpoint reserve。

后续要拆成：

```text
Canvas visual connector
Knowledge Relation / RelationProposal projection
```

这样才能避免认知混乱。

## 6. 给第二阶段的输入材料

第二阶段需要把第一阶段材料融合成设计稿。

推荐按照下面顺序推进。

### 6.1 Coincides Canvas 最小自研引擎设计稿 v0

必须回答：

- CanvasDocument 是什么；
- CanvasWorld 如何持久化；
- CanvasViewport 属于 note 还是 user；
- CanvasObject 与 CanvasPlacement 是否分离；
- CanvasSceneRuntime 如何构建；
- CanvasCommand 如何记录；
- PageFrame 是否作为特殊 object；
- TextFlow block 如何投影；
- 第一版 object kind 有哪些；
- 哪些内容明确后置。

### 6.2 PageFrame 精细化设计稿 v0

必须回答：

- PageFrame 是否独立实体；
- primary PageFrame 如何保存；
- 多 PageFrame 如何排序和定位；
- PageMode 如何选择 PageFrame；
- ruler / margin / snap guide 如何表达；
- header/footer/page number 是 widget 还是 PageFrame 子结构；
- PageFrame template 如何保存；
- PageFrame 与 export 的关系；
- PageFrame 与 TextFlow 排版的关系。

### 6.3 Object / TextFlow / ContentGroup Projection 融合设计稿

必须回答：

- shape 内文字如何挂载 TextFlow；
- image/table 是 block 还是 object；
- PageFrame 外 block 是否仍属于 TextFlow；
- ContentGroup projection 如何进入 Canvas；
- Petal 是否可单独 projection；
- materialize / reference / duplicate / fork 如何在 Canvas 中呈现；
- AI snapshot 如何读取 projection。

### 6.4 Arrow / RelationProposal 分工设计稿

可以单独写，也可以并入融合设计稿。

必须回答：

- 普通 arrow 第一版做到什么程度；
- 是否支持 endpoint binding；
- arrow 删除/解绑规则；
- ContentGroup Mode 是否作为第三视图；
- RelationProposal 的生命周期；
- AI review relation 的入口；
- confirmed Relation 如何投影成箭头。

### 6.5 8.8 候选 Plan

设计稿稳定后，再写 8.8 plan。

不要直接从第一阶段跳到工程实现。

## 7. 第二阶段需要 Henry 决策的问题

这些问题可以在第二阶段逐个讨论。

### 7.1 8.8 第一轮目标切多小？

候选：

```text
只扶正 CanvasObject / CanvasPlacement / PageFrame 基础实体
```

或者：

```text
同时做 PageFrame 精细化和第一批普通 object
```

后者诱惑大，但风险也高。

### 7.2 PageFrame 是否在 8.8 一开始就独立实体？

考虑因素：

- 它会成为主入口；
- 它会影响 PageMode；
- 它会影响 export；
- 它会影响后续多页；
- 它比普通 object 特殊很多。

### 7.3 Table / Image 是否进入 8.8 第一轮？

它们很有价值，但会打开 asset / file / block-like object / export 的复杂度。

可以考虑：

```text
8.8 先建 object 协议和 PageFrame；
8.8.x 再加入 image / table。
```

### 7.4 ContentGroup projection 是否进入 8.8？

ContentGroup System 已经成熟化，projection 很诱人。

但它依赖：

- CanvasObject；
- projection entity；
- PageFrame / canvas placement；
- reuse semantics；
- ContentGroup Mode。

可以先预留 contract，再做轻量原型。

### 7.5 是否继续研究 tldraw / BlockSuite？

本阶段主要研究 Excalidraw。

第二阶段如果需要对照，可以轻量研究：

- tldraw 的 store / shape / binding；
- BlockSuite 的 block/page/canvas 思路。

但不建议扩大成无边界调研。

## 8. 明确后置内容

下面内容不应该进入 8.8 第一轮核心。

- GraphRAG；
- 完整 Relation runtime；
- 手写识别；
- OCR pipeline；
- 数学图像工具；
- 3D model viewer；
- 视频工作台；
- 动画编辑器；
- 自动 layout / graph layout；
- 复杂 elbow router；
- 多人实时协作；
- 真无限 chunk engine；
- 完整工程包导入导出。

这些不是不重要，而是会让 Canvas 第一版过载。

## 9. 建议的第二阶段文档顺序

建议第二阶段按照这个顺序写：

1. `2026-06-25-06-Coincides-Canvas-Minimal-Self-Owned-Engine-Design-v0.md`
2. `2026-06-25-07-PageFrame-Refinement-Design-v0.md`
3. `2026-06-25-08-CanvasObject-TextFlow-ContentGroup-Projection-Design-v0.md`
4. `2026-06-25-09-Canvas-Route-And-V2.BN.8.8-Candidate-Plan.md`

如果 relation 讨论变多，可以在 08 和 09 之间加：

```text
2026-06-25-08b-Canvas-Arrow-And-RelationProposal-Boundary-Design-v0.md
```

## 10. 最终阶段一判断

第一阶段调研后，最核心的判断可以压缩成一句话：

```text
Coincides Canvas 应该自研，
但不要闭门造车；
它应该学习成熟画布工具的交互、scene、delta、binding 和 renderer 分层，
同时坚持 TextFlow、ContentGroup、PageFrame、RelationProposal 这些 Coincides 自己的业务真相。
```

当前最佳路线是：

```text
从现有有限画布胚胎出发，
先扶正 CanvasDocument / PageFrame / CanvasObject / CanvasPlacement / CanvasRuntime / CanvasCommand，
再逐步加入普通 object、ContentGroup projection 和 RelationProposal view。
```

这份总结到这里收口。

第二阶段应该开始回答：

```text
我们到底怎么做 Coincides Canvas v0？
```

