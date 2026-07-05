# 09. Accessibility Tree / UI Parsing / Canvas AI Tree 调研

status: stage-2 research
date: 2026-06-25 America/Toronto
scope: AI-readable layout, screenshot parsing, accessibility-inspired canvas snapshot

## 1. 为什么要研究 Accessibility Tree

Coincides Canvas 的目标不是普通白板，而是：

```text
whiteboard + page system + spatial organization layer + AI-readable layout
```

AI-readable layout 的关键不是让 AI 看截图猜，而是让系统能主动提供结构化上下文。Accessibility Tree 提供了一个很好的启发：它把页面从视觉像素翻译成 role、name、state、hierarchy 等机器可读结构。

Coincides 不会直接使用浏览器 Accessibility Tree 作为业务真相，但可以借它反推自己的 `Canvas AI Tree`。

## 2. 外部参考的核心启发

### 2.1 Playwright ARIA snapshot

Playwright 的 ARIA snapshot 会把页面 accessibility tree 表达成 YAML，用于验证页面结构是否稳定。这说明对 AI / 自动化来说，“结构快照”比单纯截图更稳定。

对 Coincides 的启发：

- AI 读取 canvas 时应该拿到结构化 snapshot；
- snapshot 可以用于测试，也可以用于 Agent context；
- snapshot 不应该是持久化主表，而应该从当前 canvas state 派生；
- snapshot 需要能表达 role、name、hierarchy、state。

### 2.2 React Flow accessibility

React Flow 里的 node / edge 可以带 `ariaLabel`、`ariaRole`、focusable；节点获得焦点时可以自动 pan 到可见区域。它说明 node-edge 工具也需要考虑键盘、焦点和可访问性。

对 Coincides 的启发：

- CanvasObject 不只是鼠标命中的图形，也应该能被 focus；
- AI snapshot 需要包含可操作状态；
- 对象的 `aria_label` / `ai_label` / `role` 可以从显示名、内容摘要、对象家族派生；
- `focus order` 对 Agent 和键盘操作都有价值。

### 2.3 OmniParser / UI parsing

OmniParser 代表另一条路线：从截图中解析出结构化 UI 元素，帮助视觉模型把动作定位到屏幕区域。

对 Coincides 的启发：

- screenshot-to-structure 可以作为兜底或校验；
- 它适合识别外部 UI 或无法结构化的 Raw Ink / image；
- 但在 Coincides 自己的画布里，持久数据和 runtime layout 比 screenshot 更可靠；
- OCR / 视觉解析不能替代 TextFlow、ContentGroup、CanvasObject 的数据真相。

## 3. Canvas AI Tree 的设计方向

`Canvas AI Tree` 是 Coincides 给 AI 读取的派生结构。它不是数据库实体，也不是 DOM tree。

它的作用是回答：

```text
当前这篇 note 的画布上有什么？
它们在哪里？
它们属于哪个 PageFrame / workspace？
它们包含什么内容？
它们之间有什么视觉、组织或知识上的关系？
哪些可以操作，哪些只读？
```

## 4. Canvas AI Tree node 最小字段候选

```ts
interface CanvasAITreeNodeDraftV0 {
  id: string;
  kind: 'page_frame' | 'block_projection' | 'canvas_object' | 'content_group_projection' | 'visual_edge' | 'ink' | 'asset' | 'structured_object';
  role: string;
  name: string | null;
  parent_id: string | null;
  children_ids: string[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    coordinate_space: 'canvas_world' | 'page_frame' | 'viewport';
  };
  z_index: number;
  visibility: {
    visible: boolean;
    clipped: boolean;
    occluded: boolean;
    collapsed: boolean;
    ai_visible: boolean;
    export_visible: boolean;
  };
  content: {
    content_kind: 'none' | 'textflow' | 'structured_data' | 'asset' | 'snapshot';
    plain_text: string | null;
    summary: string | null;
    content_ref: string | null;
  };
  source: {
    source_ref: string | null;
    provenance_summary: string | null;
  };
  interaction: {
    selectable: boolean;
    movable: boolean;
    resizable: boolean;
    editable: boolean;
    connectable: boolean;
    focusable: boolean;
  };
  state: Record<string, unknown>;
}
```

这只是草案。阶段三需要决定哪些字段进入正式合同。

## 5. 持久化字段与派生字段

Canvas AI Tree 最容易踩的坑，是把所有东西都持久化。正确方向应该是分层：

| 字段类型 | 例子 | 来源 | 是否持久化 |
| --- | --- | --- | --- |
| 身份字段 | object id、family、content_ref | CanvasObject / Block / PageFrame | 是 |
| 几何字段 | x、y、width、height、rotation、zIndex | CanvasPlacement / PageFrame / runtime measurement | 部分持久化 |
| 内容字段 | plain text、summary、TextFlow addressable objects | TextFlow / ContentGroup / structured object | 内容真相持久化，summary 可派生 |
| 状态字段 | selected、dragging、hovered、editing | runtime UI state | 否 |
| 可见性派生 | clipped、occluded、viewport visible | layout engine / snapshot generator | 否 |
| 读取顺序 | page order、visual order、z order | PageFrame + layout algorithm | 否，除非用户明确排序 |
| Agent affordance | can_move、can_edit、can_materialize | policy + object type | 可派生 |

核心原则：

```text
业务真相持久化。
AI-readable snapshot 派生。
视觉识别兜底。
```

## 6. OCR / screenshot 的位置

Henry 提到过一个直觉：用 OCR 理解 object 排列意义。这个直觉有价值，但需要降级为辅助层。

更稳的策略：

1. 先读结构化数据：CanvasObject、PageFrame、BlockPlacement、TextFlow、ContentGroup。
2. 再读派生布局：bounds、overlap、visibility、reading order。
3. 最后才用 OCR / screenshot parsing 处理无法结构化的内容：Raw Ink、图片里的文字、外部截图、手绘草图。

原因：

- OCR 只能解决文字，不擅长判断意图；
- Raw Ink 里的圈注、箭头、装饰、草图都需要视觉理解和语义判断；
- 对于我们自己生成的对象，数据层永远比截图可靠；
- screenshot parsing 可以发现渲染异常或作为 Agent grounding，但不应成为主数据源。

## 7. PageFrame 对 Canvas AI Tree 的特殊意义

PageFrame 不是普通矩形。它决定：

- Page Mode 入口；
- export boundary；
- 页面阅读顺序；
- page-local coordinate space；
- margin / ruler / snap reference；
- 页眉、页脚、页码、模板等特殊组件；
- 用户打开 note 后优先看到的主 frame。

因此 Canvas AI Tree 中的 PageFrame node 应该是一级结构节点，而不是普通 canvas object 的叶子。

PageFrame node 至少要表达：

```text
id
role: primary / secondary / template / scratch
bounds
content_bounds
page_size
margin
is_primary
exportable
contained object ids
reading order
```

## 8. Block 与 CanvasObject 的 AI-readable 区别

`paragraph block` / formula block / code block 是内容对象。它们出现在 canvas 上时，需要一个空间投影。

在 AI Tree 里应区分：

| 类型 | AI 看到什么 |
| --- | --- |
| paragraph block projection | block id、TextFlow plain text、TextUnit、bounds、所在 PageFrame |
| styled block projection | 同上，额外有背景 / border / callout 等视觉样式 |
| block-backed shape | shape id、shape bounds、mounted block ref、shape style、block content |
| pure shape | shape id、bounds、style、无内容或仅有 visual label |
| ContentGroup projection | group id、display name、summary、members / petals 摘要、bounds |
| visual edge | source / target visual endpoint、style、是否 proposal、是否 semantic |

这能避免把一个填了文字的矩形误认为“文字系统二号”。

## 9. Agent 操作边界

Canvas AI Tree 负责读，不负责写。写入应走命令或 proposal。

推荐边界：

```text
Canvas AI Tree Snapshot
  -> Agent reads
  -> CanvasProposal
  -> user review / auto-allowed policy
  -> CanvasCommand
  -> runtime applies
  -> persistence writes truth
  -> snapshot regenerates
```

Agent 可以提出：

- 新建 PageFrame；
- 在 PageFrame 内生成 paragraph blocks；
- 在 workspace 放置 structured diagram object；
- 把选中对象聚类成 ContentGroup proposal；
- 调整布局；
- 生成 visual edge；
- 生成 RelationProposal，但只能在 ContentGroup Mode / Relation workflow 中确认。

Agent 不应该直接：

- 改写 TextFlow truth；
- 删除用户对象；
- 把 visual edge 变成 confirmed Relation；
- 把截图 OCR 结果覆盖 source truth；
- 跳过用户确认执行大规模物化。

## 10. 对 Raw Ink / 手写的保守结论

Raw Ink 是最难 AI-readable 的对象族之一。

第一版应该只保留：

- stroke id；
- path data；
- bounds；
- style；
- optional grouping；
- optional text recognition result；
- optional AI interpretation proposal；
- visibility / export / ai visibility。

不应该第一版就承诺：

- 手写公式识别；
- 草图结构识别；
- 圈注 / 箭头 / 装饰的自动语义判断；
- Raw Ink 自动转 Relation。

Raw Ink 可以进入 Canvas AI Tree，但它的 content 可能只是：

```text
content_kind: snapshot
summary: "uninterpreted ink stroke group"
```

等后续 OCR / vision / handwriting 版本再增强。

## 11. 阶段三需要继续决策

- Canvas AI Tree 是否作为正式 contract 文档进入 `docs/contracts`？
- 第一版 snapshot 是否只覆盖 PageFrame、block projection、basic canvas object？
- 是否需要单独的 `CanvasAISnapshotService`？
- `occluded` 和 `reading_order` 的算法是否需要第一版实现？
- Agent 是否第一版只读，不写？
- screenshot parsing 是否仅作为未来研究，不进入 8.8？

## 12. 参考来源

- Playwright ARIA snapshots: https://playwright.dev/docs/aria-snapshots
- React Flow accessibility: https://reactflow.dev/learn/advanced-use/accessibility
- React Flow Node type: https://reactflow.dev/api-reference/types/node
- Microsoft OmniParser: https://www.microsoft.com/en-us/research/articles/omniparser-for-pure-vision-based-gui-agent/
