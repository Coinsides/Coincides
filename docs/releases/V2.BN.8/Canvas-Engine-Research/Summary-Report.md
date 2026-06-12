# Canvas Engine Research 总结报告

## 一句话结论

V2.BN.8 应走自研最小 NoteCanvas Engine 路线：用 Coincides 自有数据模型保存 truth，用 DOM 保留自然文本编辑，用 SVG/DOM 做 overlay 和 relation endpoint 预留，用 CSS transform 建立 viewport/world 坐标系，把 Canvas/WebGL 暂时留给未来 drawing、thumbnail、LOD 和大规模渲染优化。

## 推荐路线

```text
Self-owned Minimal Hybrid NoteCanvas Engine
```

它包含：

- 自有 NoteCanvas runtime；
- DOM NoteBlock content layer；
- SVG/DOM overlay layer；
- CSS transform viewport；
- explicit world/screen coordinate conversion；
- measurement cache；
- visible window；
- PageFrame + Workspace unified coordinate model；
- CanvasObject / RelationEndpoint placeholders。

## 为什么这个路线最适合 Coincides

### 1. 我们的产品不是普通白板

Coincides 是 refined information-processing notebook/report surface。它的核心不是 shape，而是：

- NoteBlock；
- structured fields；
- source provenance；
- semantic relation；
- export/AI visibility；
- PageFrame/workspace；
- future GraphRAG adapter。

外部白板 engine 很强，但往往会把一切都变成 shape/node/scene element。这样会让 Coincides 的 truth 退化成 adapter payload。

### 2. 文本编辑必须稳

HTML Standard 明确不建议用 canvas 实现文本编辑控件，因为这会迫使开发者重做 caret、键盘移动、复制粘贴、IME、undo/redo、accessibility 等基础能力。

这直接排除了“纯 Canvas 作为主编辑层”的路线。Coincides 必须首先像一个安静可靠的笔记软件，而不是一个把文字画成像素的图形程序。

### 3. 当前分支值得作为参考，但不适合作为最终 runtime

当前分支已经通过 V2.BN.1-V2.BN.5 打磨出大量产品经验：

- page-like writing；
- block type；
- structured block；
- formula block；
- preview overlay；
- block control bar；
- type/AI/export overlay；
- snap/elastic avoidance；
- block resize/reflow；
- PageFrame/workspace 的早期产品直觉。

但是它仍然是 NoteDetail 中模拟 canvas，而不是一个真正的 engine。V2.BN.8 要做的不是继续 patch，而是把这些经验沉淀成 runtime。

## 排除路线概览

| 路线 | 是否推荐 | 原因 |
| --- | --- | --- |
| 继续 patch 当前 DOM 页面 | 否 | 没有统一坐标/viewport/overlay runtime |
| 纯 DOM engine | 部分 | 可作为内容层，但不能缺少 canvas runtime contract |
| 纯 SVG | 否 | 不适合富文本和复杂编辑 |
| 纯 HTML Canvas | 否 | 文本编辑和 accessibility 成本过高 |
| WebGL/Pixi first | 否 | 第一版解决错问题，适合远期 LOD |
| tldraw | 否 | shape-first，主 runtime 会带来二等 truth |
| BlockSuite | 否 | editor framework 太重，适合作参考 |
| React Flow | 否 | diagram-first，适合 endpoint/edge 参考 |
| Excalidraw/Konva/Fabric | 否 | drawing/object-first，适合未来画布对象层 |

## V2.BN.8 应该如何开工

### Phase 0: Route Lock

本轮 research 完成后，同步：

- Plan；
- Workflow；
- Architecture Spec；
- State/Data Contract；
- Interaction Contract；
- Spike/Benchmark Plan；
- Roadmap。

### Phase 1: Engine Shell

建立：

- `NoteCanvasRuntimeProvider`；
- `CanvasViewport`；
- `CanvasWorld`；
- `PageFrameLayer`；
- `BlockLayer`；
- `SvgOverlayLayer`；
- `FloatingOverlayLayer`。

### Phase 2: Block Placement

把 block 的位置和内容分开：

```text
NoteBlock = content truth
BlockPlacement = layout truth
```

placement 至少包含：

```text
x, y, width, height, rotation, zIndex, surfaceScope
```

### Phase 3: Editing / Measurement

实现：

- content reflow；
- measured height；
- resize -> measure -> placement update；
- formula input expansion；
- slash menu anchor；
- selected block forced render。

### Phase 4: Overlay / Interaction

实现：

- selection outline；
- resize handle；
- block control bar；
- preview panel；
- type/AI/export label overlay；
- snap guide；
- relation endpoint placeholder。

### Phase 5: Benchmark / Fallback

建立：

- 50 / 200 / 1000 block smoke；
- pan/zoom smoke；
- resize/reflow smoke；
- PageFrame/workspace smoke；
- browser visual check；
- fallback branch reference。

## 文档迁移规则

本目录是 V2.BN.8 局部研究目录。V2.BN.8 收口时，应把本目录的最终版复制或迁移到：

```text
docs/brainstorm/产品完善/Canvas Engine Research/
```

同时保留 V2.BN.8 内的版本快照，作为当时决策证据。

## 当前建议

现在可以进入第一版 engine sample，但要遵守：

1. 不把外部 engine 引入为主 runtime。
2. 不继续在 NoteDetail 里堆 patch。
3. 先搭 engine shell，再迁移当前 block 体验。
4. PageFrame/workspace 使用同一世界坐标。
5. 所有 CanvasObject / endpoint / multi-frame / drawing / presentation 先预留，不产品化。

## Henry 需要拍板

1. 是否确认第一版主路线为自研最小 NoteCanvas Engine？
2. V2.BN.8.1 是否可以以 engine shell 稳定为第一优先级，允许视觉细节随后补？
3. PageFrame 外 workspace block 是否在第一版就允许创建和保存？
4. 是否把 tldraw / BlockSuite 明确写为“参考，不接入”的 V2.BN.8 决策？
