# R10 - AFFiNE Edgeless / Canvas 改造可行性

## 本阶段目标

R10 专门判断 AFFiNE / BlockSuite 的 EdgelessEditor 是否能承载 Coincides 的页面/画布需求。

R6 已经定义 Coincides 需要的不只是 infinite canvas，而是：

```text
Locked Single Page
Open Canvas
Multi-page Grid
Seamless Page Stack
Formal Page Area
Outside-page Workspace
Export Intent
Page Label Mapping
```

R9 又进一步判断：不要优先强改 PageEditor。BlockSuite PageEditor 是成熟的线性文档流，而 Coincides 的 freeform block-box、A4 page、outside workspace、multi-page 和 export intent 更适合在 canvas/page projection 层完成。

所以 R10 的问题是：

```text
BlockSuite Edgeless 能不能成为 Coincides 的页面/画布主 surface？
如果可以，哪些东西能借它实现，哪些东西仍必须由 Coincides 自己掌控？
```

## 证据来源

本阶段主要查看：

- `_external_research/blocksuite/docs/components/editors/edgeless-editor.md`
- `_external_research/blocksuite/docs/components/editors/edgeless-data-structure.md`
- `_external_research/blocksuite/docs/components/blocks/surface-block.md`
- `_external_research/blocksuite/docs/components/blocks/frame-block.md`
- `_external_research/blocksuite/packages/affine/blocks/note/src/view.ts`
- `_external_research/blocksuite/packages/affine/blocks/note/src/note-edgeless-block.ts`
- `_external_research/blocksuite/packages/affine/gfx/note/src/note-tool.ts`
- `_external_research/blocksuite/packages/affine/gfx/connector/src/connector-tool.ts`
- `_external_research/blocksuite/packages/affine/gfx/connector/src/connector-manager.ts`
- `_external_research/blocksuite/packages/affine/blocks/root/src/edgeless/edgeless-root-service.ts`
- `_external_research/blocksuite/packages/affine/blocks/root/src/edgeless/edgeless-root-block.ts`
- `_external_research/blocksuite/packages/affine/gfx/turbo-renderer/src/turbo-renderer.ts`

证据等级：

- A 级代码/官方文档证据：BlockSuite docs 和源码。
- B 级结构推断：从 surface/frame/note/connector/viewport 的实现推断 Coincides adapter 成本。
- D 级产品需求证据：R5/R6/R9 中定义的 page/canvas/export/freeform block-box 需求。

## 一句话结论

**Edgeless-as-page 是目前最值得继续验证的路线，但它不是 turnkey solution。**

它能给 Coincides 提供成熟的二维交互地基：无限画布、`xywh`、frame、note card、connector、viewport、selection、toolbar、canvas rendering。
但 Coincides 的 formal page、page label、export intent、source provenance、NoteBlock identity、ObjectRelation、Concept、Template、Domain 和 AI-readable graph 仍然必须由 Coincides semantic sidecar 掌控。

推荐路线：

```text
BlockSuite Edgeless = editing/projection engine
Coincides sidecar = semantic truth / source truth / export truth / AI-readable truth
```

## 1. Edgeless 的数据结构更接近 Coincides 的 page/canvas

BlockSuite EdgelessEditor 明确提供 infinite logical canvas，适合 whiteboard 和 graphic editing。它的 surface block 可以容纳大量 CanvasElement，包括 shape、brush、connector、text，也可以和 note block 交错渲染。

Edgeless data structure 里最关键的点是：

- surface block 是白板图形内容的容器；
- surface block 能存 CanvasElement，也能存只在 edgeless 中使用的 block；
- 其他可以在 page 和 edgeless 之间复用的 block 仍可存在于 surface 之外；
- whiteboard 层级不靠 block tree 邻接关系，而靠 `index`；
- 所有 indexable block 和 surface element 都有 `xywh`；
- frame 是 surface-only block，有自己的 `xywh`；
- group 可以保存 child ids。

这比 PageEditor 更接近 Coincides 的需求。Coincides 想要的 NoteBlock 不是只在一列文档流里上下排序，而是可以有页面坐标、宽高、层级、导出意图和 relation 连接。

## 2. Formal Page Area 可以用 frame/page object 承载，但不能只靠 frame

BlockSuite frame block 可以表示 canvas 上的一个区域。拖动 frame 时，处于它几何区域内的元素会一起移动；presentation mode 也会按 frame 聚焦。

这说明 frame 很适合作为 Coincides formal page area 的视觉容器：

```text
Frame / custom page object
  -> A4 page boundary
  -> page background
  -> page break guide
  -> export crop region
```

但必须注意：BlockSuite frame 的关联是基于几何覆盖区域，不是 model layer 的嵌套关系。也就是说，一个元素“在 frame 里”是空间判断，不是稳定的语义归属。

Coincides 不能只靠 frame 的几何关系判断正式页面归属。需要自己的 page placement metadata：

```text
canvas_page_id
internal_page_index
display_page_label
page_frame_adapter_id
formal_page_bounds
object_export_role
object_ai_visibility
object_page_membership
```

否则在导出、AI 问答、source jump-back、跨页移动、工程文件恢复时都会出问题。

## 3. Outside-page workspace 是 Edgeless 的自然能力

Edgeless 的 infinite canvas 天然支持页面外空间。Coincides 可以把 A4/formal page 做成 canvas 内的 frame/page object，而 page 之外自然就是 workspace：

```text
formal page frame 内部
  -> 默认 formal / exportable

formal page frame 外部
  -> 默认 scratch / private / not exported
```

这和 R6 的判断一致：页面外不是垃圾，也不是无意义内容。它可以是用户的草稿、便签、疑问、临时推导、局部知识图谱入口，甚至可以和正式页面内的 NoteBlock 建立 relation。

但 Edgeless 只提供空间；它不会自动理解：

- 页面外对象是否导出；
- 页面外对象是否给 AI 读取；
- 页面外对象是否是 private；
- 页面外对象是否只是 visual shape；
- 页面外对象是否是 semantic NoteBlock。

这些需要 Coincides sidecar 自己保存。

## 4. Multi-page Grid 与 Seamless Page Stack 都可实现，但需要 Coincides page metadata

Edgeless 支持任意 frame 和任意 `xywh` 布局，因此 multi-page grid 可以通过多个 page frame 排列实现：

```text
Page 1  Page 2  Page 3
Page 4  Page 5  Page 6
```

Seamless page stack 也可以通过竖向连续 page frame 实现：

```text
Page 1
----- dashed page break -----
Page 2
----- dashed page break -----
Page 3
```

但这不是 BlockSuite 默认给出的文档分页系统。Coincides 需要自己管理：

- page sequence；
- page frame bounds；
- margin；
- page break guide；
- internal page index；
- display page label；
- export page index；
- page layout mode；
- page gap / seamless mode；
- export crop rule。

因此 R10 的判断是：

```text
Edgeless 可以承载多页的视觉布局。
Coincides 必须拥有多页的语义和导出模型。
```

## 5. Edgeless note 能承载 NoteBlock 的投影，但不能替代 NoteBlock

源码显示，BlockSuite 在 edgeless scope 里注册 `affine-edgeless-note`，并且 EdgelessNoteBlockComponent 使用 `xywh`、scale、selection、resize constraint、handleResize 等 GFX 能力。NoteTool 在画布上创建 note 时写入 `xywh`，并设置 `displayMode: EdgelessOnly`。

这说明 Edgeless note 非常适合承载 Coincides NoteBlock 的画布投影：

```text
Coincides NoteBlock
  -> BlockSuite edgeless note / custom block view
  -> xywh placement
  -> canvas selection / move / resize
```

但它不能替代 Coincides NoteBlock。原因是 Coincides NoteBlock 还需要：

- source provenance；
- source anchor / source scope；
- template definition；
- content role；
- concept；
- domain；
- relation；
- proposal history；
- operation/recovery provenance；
- AI-readable metadata。

BlockSuite block id 可以作为 adapter id 或 projection id，但不能成为 Coincides canonical id。

## 6. Connector 适合作为 CanvasEdge，但不是 ObjectRelation

BlockSuite connector 有比较成熟的视觉边能力：

- ConnectorTool 可以从 source 拖出到 target；
- source / target 可以是 element id，也可以是 loose position；
- connector-manager 有 endpoint location 计算；
- endpoint location 包括 top / right / bottom / left 等方向；
- connector renderer 支持路径、stroke、dash、arrow、label；
- connector watcher 会在关联元素变化后更新 path。

这正好对应 Coincides v2.4.4 中已经区分过的两层：

```text
CanvasEdge = 视觉连接 / 交互对象
ObjectRelation = 语义关系 / 未来 graph edge candidate
```

因此推荐映射是：

```text
BlockSuite connector
  -> Coincides CanvasEdge adapter/projection

Coincides ObjectRelation
  -> 独立 semantic sidecar
  -> 可由 CanvasEdge bind / unbind
```

不能把每一条 BlockSuite connector 都直接当作 ObjectRelation。用户可能只是画了一条视觉线，也可能画了一条 incomplete connector，还可能画的是暂时的草稿关系。只有当 Coincides relation inspector 或 proposal 明确绑定后，才应该创建或更新 ObjectRelation。

## 7. displayMode 对 export 有参考价值，但不够

R9 已经观察到 BlockSuite note adapter 会根据 `displayMode` 跳过某些 note。比如 Doc/Page 导出时跳过 EdgelessOnly note，Edgeless 导出时跳过 DocOnly note。

这对 Coincides 很有启发，因为它说明 BlockSuite 已经有“同一对象在不同模式下是否显示”的机制。

但 Coincides 需要更细的规则：

```text
export_role:
  formal
  scratch
  private_note
  annotation
  hidden

export_visibility:
  export
  do_not_export
  export_if_selected

ai_visibility:
  readable
  readable_with_context
  private_by_default
  hidden
```

所以 `displayMode` 可以被 adapter 使用，但不能替代 Coincides export intent。

## 8. 大文档和性能风险仍需要 benchmark

Edgeless 的 surface block 使用 HTML5 canvas 渲染大量 CanvasElement，并能和 note blocks 交错。源码里还有 ViewportTurboRenderer，它会把 block content 渲染为 canvas bitmap，在交互期间回退到 DOM 渲染，并监听 viewport、zoom、selection 和 block updates。

这说明 BlockSuite 对大画布性能有认真设计，明显比我们当前自研轻量 canvas 更成熟。

但 Coincides 的目标场景比普通白板更重：

- 70-200 页甚至更长的笔记；
- 每页很多 NoteBlock；
- 大量公式、图片、source quote；
- 大量 relation / connector；
- page grid 和 seamless page stack；
- 用户打开旧工程文件后要求布局稳定；
- AI 需要读取 formal/scratch/private/export metadata；
- PDF 导出不能和编辑视图偏差太大。

所以 R10 不能直接把性能判为通过。需要在后续 spike 中做 benchmark：

```text
10 页 / 50 页 / 100 页
每页 20 / 50 / 100 个 block
connector 100 / 500 / 2000 条
含公式、图片、source quote、sticky note
pan / zoom / select / drag / resize / export preview
```

结论是：BlockSuite 给了一个更有希望的性能地基，但 Coincides 仍必须实测自己的使用场景。

## 9. 三条路线可行性判断

### A. Edgeless-as-page

判断：

```text
当前最推荐继续验证。
```

优点：

- 最接近 Coincides freeform block-box；
- `xywh`、index、selection、resize、connector 都是原生方向；
- outside workspace 自然存在；
- formal page 可以作为 frame/page object；
- multi-page grid 和 seamless stack 可以由多个 page frame 实现；
- visual edge 可映射为 CanvasEdge；
- 与 PageEditor 共享 doc object，保留未来线性视图可能性。

风险：

- formal page / export / page label 不是现成能力；
- frame 是几何关联，不是稳定语义嵌套；
- 长文本自然写作可能不如 PageEditor；
- 大文档性能和导出需要实测；
- semantic sidecar 成本不可省。

评分：

- manual freeform note UX：4/5
- formal page/export foundation：3/5
- source/semantic sidecar fit：4/5
- engineering cost：3/5
- large document uncertainty：3/5

### B. Edgeless + PageEditor hybrid

判断：

```text
可作为中长期形态，但不应作为第一版重构的复杂默认。
```

优点：

- PageEditor 负责自然长文；
- Edgeless 负责二维布局、草稿、关系图；
- 与 AFFiNE 当前产品体验更接近；
- 适合需要线性传播视图和空间视图共存的场景。

风险：

- Coincides 此前已倾向 canvas-first；双模式可能让产品方向再次变复杂；
- 同一 NoteBlock 在 PageEditor 和 Edgeless 中的 identity、selection、source、relation、export intent 更难同步；
- 如果只是为了长文输入，可能用局部 editor 嵌入 Edgeless note 更简单。

R10 判断：

```text
保留为方案，但第一优先级仍是 Edgeless-as-page + sidecar。
```

### C. Coincides-owned canvas fallback

判断：

```text
必须保留作为 fallback，但不应优先从零造完整画布引擎。
```

优点：

- 完全贴合 Coincides 数据结构；
- 没有外部 editor runtime 绑定；
- export intent / page label / source provenance 可以从一开始按 Coincides 方式设计。

风险：

- 画布交互、selection、resize、connector、toolbar、性能优化、undo/redo、clipboard、rich text 都要自己做；
- 成本极高；
- 很容易再次回到“工程能跑，但用户体验惨不忍睹”的状态。

R10 判断：

```text
作为 fallback 和架构对照保留。
只有当 BlockSuite Edgeless 无法承载 Coincides 的关键语义映射或性能不达标时，才回到自研主线。
```

## 10. R10 解决的问题

R10 解决了：

1. Edgeless 的 surface/frame/note/connector/viewport 结构确实更接近 Coincides 的 page/canvas 需求。
2. Formal page 可以作为 frame/page object 存在，但必须由 Coincides 维护稳定 page metadata。
3. Outside-page workspace 是 Edgeless 的自然能力，但 export/AI/private 规则必须由 Coincides sidecar 控制。
4. Multi-page grid 和 seamless page stack 可行，但不是现成分页系统，需要 Coincides 自己实现 page sequence 和 export crop。
5. Connector 可以映射为 CanvasEdge，但 ObjectRelation 必须保持独立。
6. BlockSuite 的性能地基值得借用，但 Coincides 大文档场景必须 benchmark。

## 11. 暴露的风险

1. **Page membership 风险**
   Frame 的几何覆盖不等于稳定页面归属。Coincides 需要自己的 page placement record。

2. **Export truth 风险**
   Edgeless 是画布，不是 PDF page engine。导出边界、页码、页面标签、页眉页脚、页面外内容是否导出都要自定义。

3. **Semantic ownership 风险**
   如果把 BlockSuite block id 当成 NoteBlock truth，未来 source、relation、concept、template、domain、GraphRAG 都会不稳定。

4. **Relation 混淆风险**
   Connector 是视觉对象，不等于语义边。必须继续区分 CanvasEdge 和 ObjectRelation。

5. **大文档性能风险**
   BlockSuite 有性能优化，但 Coincides 的 70-200 页、富内容、多 relation 场景仍未验证。

## 12. 对后续阶段的影响

- R11 必须设计 sidecar identity map：BlockSuite doc/root/surface/note/frame/connector 与 Coincides Note、NoteBlock、CanvasNode、CanvasFrame、CanvasEdge、ObjectRelation 的稳定映射。
- R11 不能只靠 frame geometry 判断页面归属，必须加入 Coincides page membership metadata。
- R12 必须把 AI 可读性、export intent、formal/scratch/private、source provenance 与 editor runtime 解耦。
- R13 必须给 Edgeless-as-page 高优先级评分，但同时扣除 export、sidecar、large-document benchmark 风险。
- R14 必须把“先做 Edgeless-as-page spike，而不是强改 PageEditor 或从零自研完整画布”写成下一步路线建议。

## 13. 反补前序报告

R10 不需要修改 R0-R9 正文。

但 R10 强化了 R6：

- R6 的 formal page / outside workspace / multi-page / seamless stack 不是空想，Edgeless 提供了可承载这些能力的空间引擎。
- R6 的 export intent、page label、formal/scratch/private 仍必须由 Coincides 自己定义。

R10 也强化了 R9：

- PageEditor 不适合作为 freeform block-box 主 surface；
- Edgeless-as-page 是更合理的验证方向；
- BlockSuite-first / hybrid 的实际含义应收窄为“BlockSuite Edgeless-as-page + Coincides semantic sidecar”，而不是整体复制 AFFiNE 或强改 PageEditor。

## R10 结论

BlockSuite Edgeless 值得作为 Coincides 下一阶段的第一候选画布引擎。

但它只能解决“画布交互和空间投影”的一大部分问题，不能解决 Coincides 的核心语义问题。Coincides 仍必须自己掌控：

- NoteBlock canonical identity；
- source provenance；
- source anchor / scope；
- template / composition / domain；
- ObjectRelation；
- concept；
- export intent；
- page label；
- AI-readable graph；
- proposal / operation provenance。

最终建议：

```text
不要优先强改 PageEditor。
不要一上来从零自研完整 canvas engine。
优先做 BlockSuite Edgeless-as-page spike。
同时设计 Coincides semantic sidecar。
用 benchmark 验证大文档、多页、多 relation、导出和恢复稳定性。
```
