# 2026-06-25 01. Excalidraw 产品与源码层级总览

status: phase-1 research
date: 2026-06-25 America/Toronto
scope: Excalidraw 本地源码结构、产品能力分层、对 Coincides Canvas 的第一轮启发

> 本文是 Coincides Canvas 第一阶段调研的第 1 份文档。目标不是决定是否接入 Excalidraw，而是先看清一个成熟画布工具的产品层级、源码边界和可学习区域。

## 1. 调研对象

本地研究仓库：

```text
D:\Coinsides\v2.x\_research\excalidraw
```

当前观察到的根结构包括：

- `excalidraw-app/`
- `packages/`
- `examples/`
- `dev-docs/`
- `firebase-project/`
- `scripts/`
- 根 `package.json`

根 `package.json` 显示这是一个 monorepo：

```json
"workspaces": [
  "excalidraw-app",
  "packages/*",
  "examples/*"
]
```

这说明 Excalidraw 的源码不是一个单层 React app，而是分成：

- 产品应用；
- 可发布 React 组件；
- 元素模型与几何逻辑；
- 数学工具；
- 通用工具；
- 示例项目；
- 开发文档。

## 2. 顶层产品层级

从源码结构看，Excalidraw 可以分成 5 层。

### 2.1 产品应用层

路径：

```text
excalidraw-app/
```

职责：

- 承载官网式完整应用；
- 管理 app 入口；
- 管理本地数据、分享、协作、语言、主题；
- 使用 `@excalidraw/excalidraw` 这个 React component。

代表文件：

- `excalidraw-app/index.tsx`
- `excalidraw-app/App.tsx`
- `excalidraw-app/data/`
- `excalidraw-app/collab/`
- `excalidraw-app/components/`

对 Coincides 的意义：

```text
这层不应该照搬。
Coincides 已经有自己的产品应用、路由、账号、笔记、项目、ContentGroup 和 TextFlow。
```

它更像是“Excalidraw 自己的网站应用”，不是我们要学习的核心。

### 2.2 可嵌入编辑器层

路径：

```text
packages/excalidraw/
```

包名：

```text
@excalidraw/excalidraw
```

`package.json` 描述它是：

```text
Excalidraw as a React component
```

职责：

- 暴露可嵌入的 Excalidraw React 组件；
- 管理主 App 类组件；
- 管理 AppState；
- 管理 actions；
- 管理 renderer；
- 管理 scene；
- 管理 history；
- 管理 clipboard / export / restore / image / library；
- 管理 text WYSIWYG；
- 管理 UI components。

代表文件和目录：

- `packages/excalidraw/index.tsx`
- `packages/excalidraw/components/App.tsx`
- `packages/excalidraw/appState.ts`
- `packages/excalidraw/types.ts`
- `packages/excalidraw/actions/`
- `packages/excalidraw/renderer/`
- `packages/excalidraw/scene/`
- `packages/excalidraw/data/`
- `packages/excalidraw/history.ts`
- `packages/excalidraw/wysiwyg/`

对 Coincides 的意义：

```text
这层值得研究，但不应该直接成为 Coincides Canvas 的业务真相。
```

我们可以学习：

- AppState 如何拆分；
- pointer interaction 如何组织；
- action / history 如何组织；
- renderer 如何拆成 static / interactive；
- export 如何复用 scene；
- app state 哪些进入持久化、哪些只是运行态。

但必须警惕：

- 它有完整的 text tool；
- 它有自己的 scene store；
- 它有自己的 frame / group / element 语义；
- 它的 App 类组件非常庞大，不适合直接嫁接到 Coincides。

### 2.3 元素模型与几何内核层

路径：

```text
packages/element/
```

包名：

```text
@excalidraw/element
```

`package.json` 描述它是：

```text
Excalidraw elements-related logic
```

职责：

- 定义 ExcalidrawElement 类型；
- 创建新元素；
- 修改元素；
- 管理 Scene；
- 管理 selection；
- 管理 resize / rotate / transform；
- 管理 bounds / collision / distance；
- 管理 arrow binding；
- 管理 line / arrow editor；
- 管理 frame / group；
- 管理 text element / bound text；
- 管理 store delta；
- 管理 fractional index；
- 管理 renderElement。

代表文件：

- `packages/element/src/types.ts`
- `packages/element/src/newElement.ts`
- `packages/element/src/mutateElement.ts`
- `packages/element/src/Scene.ts`
- `packages/element/src/store.ts`
- `packages/element/src/delta.ts`
- `packages/element/src/bounds.ts`
- `packages/element/src/collision.ts`
- `packages/element/src/selection.ts`
- `packages/element/src/resizeElements.ts`
- `packages/element/src/transform.ts`
- `packages/element/src/binding.ts`
- `packages/element/src/linearElementEditor.ts`
- `packages/element/src/elbowArrow.ts`
- `packages/element/src/frame.ts`
- `packages/element/src/groups.ts`

对 Coincides 的意义：

```text
这是最值得学习的层。
```

如果 Coincides 自研 Canvas Engine，那么我们真正需要参考的是：

- 一个 object 应该有哪些基本几何字段；
- hit testing 如何实现；
- selection 如何抽象；
- resize / rotate 如何与数据更新关联；
- scene 如何缓存 non-deleted elements；
- visible elements 如何根据 viewport 计算；
- history / store delta 如何分 durable 和 ephemeral；
- arrow binding 如何只作为视觉绑定，而不直接污染知识关系。

### 2.4 数学与通用工具层

路径：

```text
packages/math/
packages/common/
packages/utils/
packages/fractional-indexing/
```

职责：

- `math`：点、线段、矩形、椭圆、曲线、向量、角度；
- `common`：常量、颜色、随机数、事件、通用工具；
- `utils`：shape / export 等工具；
- `fractional-indexing`：元素排序索引。

对 Coincides 的意义：

```text
这些层提供的是“画布基础设施思路”，不是业务模型。
```

其中最值得注意的是：

- geometry 类型要足够纯；
- rendering 和 data update 不应该过度耦合；
- z-order / sort / fractional index 需要提前设计；
- 通用数学函数应和 React UI 分离。

### 2.5 示例与文档层

路径：

```text
examples/
dev-docs/
```

职责：

- 展示如何嵌入 Excalidraw；
- 提供开发文档；
- 解释 frames / json schema 等部分内部概念。

对 Coincides 的意义：

```text
examples 可以用来理解对外 API，但不是自研引擎的主要参考。
dev-docs 可以作为术语和 schema 辅助材料。
```

## 3. 产品能力分层

从文件结构和源码入口看，Excalidraw 的产品能力大致分为：

### 3.1 基础白板对象

包括：

- rectangle；
- diamond；
- ellipse；
- arrow；
- line；
- freedraw；
- text；
- image；
- frame；
- embeddable；
- iframe；
- magicframe；
- selection。

这些都在 `ExcalidrawElement` 类型 union 里。

对 Coincides 的启发：

```text
CanvasObject 需要先定义 object family，
但第一版不能被 object family 数量拖走。
```

Coincides 8.8 的第一优先级仍应是：

- CanvasWorld；
- CanvasViewport；
- PageFrame；
- BlockPlacement；
- 基础 object reserve。

### 3.2 编辑器运行态

Excalidraw 的 `AppState` 很大，但可以看出几个类别：

- 当前工具：`activeTool`
- 新建中的元素：`newElement`
- 选中状态：`selectedElementIds`
- 线条编辑状态：`selectedLinearElement`
- 文本编辑状态：`editingTextElement`
- 画布视角：`scrollX`, `scrollY`, `zoom`
- 交互状态：`isResizing`, `isRotating`, `selectionElement`
- 绑定提示：`suggestedBinding`
- frame 提示：`frameToHighlight`
- UI 状态：menus, dialogs, sidebar
- 导出状态：export options
- 协作状态：collaborators

对 Coincides 的启发：

```text
Canvas 的业务真相和交互运行态必须分开。
```

Coincides 可以学习 AppState 的分类方式，但不能把所有运行态混进数据库实体。

### 3.3 Scene 与元素集合

Excalidraw 的 `Scene` 负责：

- 保存所有 elements；
- 保存 non-deleted elements；
- 保存 elements map；
- 保存 frame list；
- 保存 selected elements cache；
- 提供 `replaceAllElements`；
- 提供 `insertElementsAtIndex`；
- 提供 `mutateElement`；
- 触发 scene update。

对 Coincides 的启发：

```text
Coincides 需要一个 CanvasRuntimeScene，
但它应该由自己的数据库实体投影出来，而不是成为最终 truth。
```

### 3.4 Renderer

Excalidraw renderer 分为：

- `staticScene.ts`：主元素、网格、背景、静态内容；
- `interactiveScene.ts`：选中框、transform handles、binding highlight、cursor / collaborators 等；
- `Renderer.ts`：从 Scene 和 AppState 计算可渲染元素；
- `staticSvgScene.ts`：SVG export；
- `scene/export.ts`：canvas / svg / json export。

对 Coincides 的启发：

```text
Coincides Canvas 也应该分清内容层和交互层。
```

可能对应：

- `CanvasObjectLayer`
- `BlockProjectionLayer`
- `PageFrameLayer`
- `InteractionOverlayLayer`
- `SelectionLayer`
- `GuideLayer`
- `ExportLayer`

### 3.5 Action / History / Store

Excalidraw 有三套相关概念：

- `actions/`：用户命令；
- `history.ts`：undo / redo；
- `Store` / `StoreDelta`：捕捉 durable / ephemeral changes。

关键启发：

```text
不是所有变化都应该成为历史记录。
```

Excalidraw 明确区分：

- `IMMEDIATELY`：立即进入 undo；
- `NEVER`：不进入 undo；
- `EVENTUALLY`：暂不捕捉，之后可能合并。

这对 Coincides 很重要，因为未来 AI Canvas Performance / Action Playback 也需要区分：

- 用户确认的动作；
- 拖拽中的临时状态；
- AI proposal；
- 已接受的 command；
- 不应该进入历史的 UI hover / preview。

## 4. 对 Coincides 的初步翻译表

| Excalidraw 概念 | Coincides 候选对应 | 判断 |
| --- | --- | --- |
| ExcalidrawElement | CanvasObject / CanvasPlacement | 字段可参考，语义不可照搬 |
| Scene | CanvasRuntimeScene | 可作为运行态缓存，不是数据库 truth |
| AppState | CanvasInteractionState | 多数不应持久化 |
| scrollX / scrollY / zoom | CanvasViewport | 可学习视角模型 |
| frame | PageFrame | 只能参考，PageFrame 更特殊 |
| groupIds | VisualGroup | 不等于 ContentGroup |
| text element | TextFlowBlock projection | 应替换，不保留第二套文本 |
| arrow binding | Canvas visual binding | 可参考，不等于 Relation |
| StoreDelta | CanvasCommand / CanvasDelta | 值得学习 |
| History | UndoRedoStack / CommandHistory | 值得学习 |
| staticScene | Content render layer | 可参考分层 |
| interactiveScene | Interaction overlay layer | 可参考分层 |
| files/assets | Asset / MediaObject | 未来参考，非 8.8 第一刀 |

## 5. 哪些区域值得继续细读

阶段一后续重点：

```text
packages/excalidraw/components/App.tsx
```

原因：

- pointer down / move / up 总入口；
- selection / drag / resize / create object 的交互主线；
- AppState 如何被更新；
- History 如何被触发；
- Scene 如何被替换。

```text
packages/element/src/types.ts
```

原因：

- object 数据字段；
- element union；
- binding 字段；
- text / frame / image / line 的结构边界。

```text
packages/element/src/Scene.ts
```

原因：

- scene cache；
- non-deleted elements；
- elementsMap；
- selected cache；
- replace / insert / mutate。

```text
packages/element/src/store.ts
packages/element/src/delta.ts
packages/excalidraw/history.ts
```

原因：

- durable / ephemeral change；
- delta；
- undo / redo；
- future AI Action Playback 可参考。

```text
packages/element/src/collision.ts
packages/element/src/selection.ts
packages/element/src/resizeElements.ts
packages/element/src/transform.ts
```

原因：

- hit testing；
- selection；
- resize；
- rotate；
- geometry update。

```text
packages/element/src/binding.ts
packages/element/src/linearElementEditor.ts
packages/element/src/elbowArrow.ts
```

原因：

- 视觉连线；
- arrow endpoint；
- binding；
- line editor；
- elbow routing。

## 6. 初步结论

Excalidraw 的价值不在于“我们可以直接拿来用”，而在于它把一个成熟白板工具拆成了几类问题：

- object data；
- scene cache；
- app interaction state；
- renderer；
- hit testing；
- transform；
- binding；
- action；
- history；
- storage / restore；
- export。

Coincides Canvas 的阶段二应该把这些问题逐一翻译成自己的设计，而不是照搬它的元素体系。

最稳定的判断是：

```text
Excalidraw 的元素层和交互层值得学。
Excalidraw 的业务语义不应进入 Coincides。
Coincides Canvas 必须继续以 TextFlow / PageFrame / ContentGroup 为自己的真相。
```

