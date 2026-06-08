# R9 - AFFiNE Page Editor 改造可行性

## 本阶段目标

R9 专门判断 AFFiNE / BlockSuite 的普通 PageEditor 是否能承载 Coincides 的 freeform block-box page editor 需求。

R5 已经定义：Coincides 想要的不是单列 Notion 式 block editor，而是 page-first freeform block-box editor。用户应该能像文档一样输入，也能在 layout edit mode 下把 NoteBlock 当成可移动、可 resize、可并排的 block box。R6 进一步定义了 formal page area、outside-page workspace、多页、无缝页栈和 export intent。

R9 因此不问“PageEditor 能不能写字”，而问：

```text
BlockSuite PageEditor 能不能在不大改核心模型的情况下，
支持 Coincides 想要的二维页面排版、并排 block、resize、spatial click-to-type 和导出边界？
```

## 证据来源

本阶段主要查看：

- `_external_research/blocksuite/docs/components/blocks/root-block.md`
- `_external_research/blocksuite/docs/components/blocks/note-block.md`
- `_external_research/blocksuite/docs/components/editors/page-editor.md`
- `_external_research/blocksuite/docs/components/editors/edgeless-editor.md`
- `_external_research/blocksuite/docs/guide/component-types.md`
- `_external_research/blocksuite/docs/guide/selection.md`
- `_external_research/blocksuite/packages/affine/blocks/note/src/view.ts`
- `_external_research/blocksuite/packages/affine/blocks/note/src/store.ts`
- `_external_research/blocksuite/packages/affine/blocks/note/src/note-block.ts`
- `_external_research/blocksuite/packages/affine/blocks/note/src/note-edgeless-block.ts`
- `_external_research/blocksuite/packages/affine/gfx/note/src/note-tool.ts`
- `_external_research/blocksuite/packages/affine/blocks/note/src/adapters/markdown.ts`
- `_external_research/blocksuite/packages/affine/blocks/note/src/adapters/html.ts`
- `_external_research/blocksuite/packages/affine/fragments/outline/src/utils/query.ts`

证据等级：

- A 级代码/官方文档证据：BlockSuite docs 和源码。
- B 级结构推断：从 block tree、displayMode、GFX interaction 推断改造成本。
- D 级产品需求证据：R5/R6 中用户提出的 freeform block-box、page/canvas/export 需求。

## 一句话结论

**不建议把 BlockSuite PageEditor 直接改造成 Coincides 的 freeform block-box editor。**

PageEditor 的定位是 conventional flow content editing。它非常适合作为自然文字写作、slash menu、block selection、rich text、image/code/table 等普通文档编辑能力的参考或组成部分，但它的核心模型不是二维页面排版。

更有希望的方向是：

```text
Edgeless-as-page / formal page in edgeless
  + Coincides semantic sidecar
  + 必要时保留 PageEditor 作为线性文档视图或简单写作入口
```

也就是说，R9 不否定 BlockSuite-first / hybrid 路线；它只是把“直接改 PageEditor”降级为高风险路线，把 R10 的 Edgeless/formal-page 验证提升为关键决策点。

## 1. PageEditor 的天然模型是线性文档流

BlockSuite 文档明确把 PageEditor 描述为 conventional flow content editing，功能接近 ProseMirror / Slate 这类富文本编辑器。

它的 root block 文档说明：

- root block 是 document tree 根节点；
- PageEditor 和 EdgelessEditor 是 root block 的两种不同 view；
- root 的直接 children 通常是至少一个 note block 和可选 surface block；
- paragraph/list 等 rich text 内容通常放在 note block 中；
- graphical content 放在 surface block 中。

note block 文档进一步说明：

- 如果文档完全在 PageEditor 中编辑，所有 text content 通常放在一个 note block 里；
- 在 PageEditor 中，note 的显示顺序由 root block children 顺序决定；
- 在 EdgelessEditor 中，note 的位置由 `xywh` 决定，层级由 `index` 决定。

这对 Coincides 很关键。PageEditor 的自然单位是 block tree 中的顺序，而不是 page coordinate 中的 box。

## 2. PageEditor 有自然写作能力，但没有天然 block-box layout

PageEditor 已有或接近 Coincides 需要的这些能力：

- text / list / code / image / attachment / embed / database block；
- native text selection；
- block-level selection；
- cross-block dragging；
- slash menu 和 widget/toolbar；
- undo/redo、collaboration、document streaming；
- 同一个 doc object 可在 PageEditor 和 EdgelessEditor 之间 runtime attach。

这些对“人工记笔记软件”非常有价值。

但 R5 的核心需求是：

- 一个 paragraph block 可以被缩窄成半页宽；
- 缩窄后文字在 box 内提前换行；
- 右侧空白处双击可创建并排 block；
- block 可以在页面内自由移动；
- layout edit mode 下每个 block 显示 resize handle；
- formal page 内默认导出，page 外默认 scratch/private；
- 多页/无缝页栈需要稳定 page boundary。

这些不是 PageEditor 文档流能力自然给出的。它们需要 page-aware coordinate layout、collision detection、export intent、page boundary、block-box wrapping 等额外系统。

## 3. Edgeless note 已有 Coincides 需要的一部分空间能力

与 PageEditor 相比，EdgelessEditor 更接近 Coincides 的 freeform surface。

EdgelessEditor 文档明确支持：

- infinite logical canvas；
- shapes、brushes、connectors、text；
- frames；
- presentation mode；
- group elements；
- link cards；
- toolbars/widgets；
- 与 PageEditor 共享同一个 doc object。

源码里也能看到：

- `NoteViewExtension` 在 edgeless scope 中注册 `affine-edgeless-note`，在 doc scope 中注册 `affine-note`。
- `NoteStoreExtension` 根据 `mode: doc | edgeless` 注册不同 adapter。
- `NoteBlockComponent` 只是普通文档流容器，核心样式是 `display: flow-root`。
- `EdgelessNoteBlockComponent` 继承 note block view 后接入 GFX 交互，使用 `xywh`、`edgeless.scale`、collapse、selection、resizeConstraint、handleResize、handleSelection。
- `NoteTool` 在画布上创建 note 时写入 `xywh`，并默认 `displayMode: NoteDisplayMode.EdgelessOnly`。

这说明 resize、xywh、canvas selection、drag/resize handle 本来就是 edgeless/gfx 体系里的能力。

## 4. displayMode 对 export / formal-scratch 边界有启发

BlockSuite note adapters 里有一个对 Coincides 很有启发的机制：`displayMode`。

markdown/html adapter 会根据当前模式跳过某些 note：

- Doc/Page 导出时跳过 `EdgelessOnly` note；
- Edgeless 导出时跳过 `DocOnly` note。

Outline 查询也会按 `NoteDisplayMode.DocAndEdgeless`、`DocOnly`、`EdgelessOnly` 过滤 note。

这与 R6 的判断很接近：

```text
inside formal page 不等于所有内容
outside-page scratch 不等于无意义
能被用户看到、能被 AI 读、能被导出，是三件不同的事
```

但 `displayMode` 还不等同于 Coincides 需要的完整 export intent。Coincides 还需要：

- `export_role`
- `export_visibility`
- `ai_visibility`
- page label / page index mapping
- formal page / scratch area boundary
- source provenance / relation provenance

所以 BlockSuite 的 displayMode 可以作为参考或 adapter 输入，但不能直接替代 Coincides placement metadata。

## 5. 直接改造 PageEditor 的成本判断

### 要改什么

若坚持把 PageEditor 直接改造成 freeform block-box，需要至少改动：

1. block rendering：从单列 flow 改成 page-aware box layout。
2. selection：现有 selection 主要是 note group 中的 text/block selection；需要新增 spatial selection / box selection。
3. insertion：从 block tree 插入改成 collision-aware spatial insertion。
4. resize：把 GFX resize interaction 迁移到 doc mode。
5. wrapping：block width 改变后要控制 text wrapping，并与 doc flow 不冲突。
6. drag/reorder：文档流 reorder 与二维移动必须同时存在。
7. export：需要按 page boundary 和 export intent 渲染。
8. mode boundary：普通写作状态与 layout edit mode 要切换，不然用户会一直处在“拼图”模式。

### 风险

最大风险不是“能不能写代码做到”，而是：

```text
一旦 PageEditor 同时承担线性文档流和二维排版，
它会失去自己最稳定、最成熟的部分。
```

PageEditor 的价值在于自然输入、稳定 selection、block tree、rich text、widget。强行把它变成自由排版 page editor，等于把 R8 中“借成熟工具降低成本”的收益吃掉一大半。

### R9 判断

```text
直接改造 PageEditor：可做，但不推荐作为第一路线。
工程风险：高。
维护风险：高。
破坏成熟写作体验风险：高。
```

## 6. PageEditor + overlay layout 的可行性

另一条路线是保留 PageEditor 线性文档流，在其上增加 Coincides 自己的 layout overlay / sidecar。

它的思路是：

```text
BlockSuite PageEditor 负责文本编辑
Coincides overlay 负责 block-box 边框、resize、placement、export intent
```

优点：

- 不深改 PageEditor block model。
- 可以保留自然写作体验。
- Coincides 能掌握 placement metadata。

风险：

- 光标、选区、block selection、overlay selection 容易互相打架。
- resize 后如何影响文本换行，需要真实 DOM/layout 深度介入。
- 并排 block 仍然不是真正的 PageEditor flow，而是 overlay 布局。
- 导出时要把 PageEditor content 与 overlay placement 重新拼装。

R9 判断：

```text
PageEditor + overlay layout：理论可行，但脆弱。
适合做小范围 experiment，不适合作为默认押注。
```

## 7. Edgeless-as-page / formal page 是更值得验证的方向

Edgeless-as-page 的思路是：

```text
用 EdgelessEditor 承载二维布局
把 A4/page/formal area 做成 canvas 内的 page frame / page object
NoteBlock 以 edgeless note / custom block 的方式投射到 page 内
page 外自然成为 scratch workspace
export intent 由 Coincides sidecar 控制
```

这个方向更贴近 R5/R6：

- block 本来就有 `xywh`；
- resize/selection/drag 是 edgeless 体系原生能力；
- outside-page workspace 自然存在；
- frames/page objects 可以承载 formal page；
- connectors/visual lines 可以映射到 CanvasEdge；
- Coincides 可以在 sidecar 中保存 NoteBlock、Source、ObjectRelation、Template、Domain、Concept。

风险是：

- Edgeless 是无限画布，不是天然 PDF page editor；
- formal page、multi-page grid、seamless page stack、page break guide 都需要 Coincides 自己定义；
- 导出 PDF/HTML 需要自己建立稳定渲染策略；
- 普通长文本写作体验可能不如 PageEditor，需要验证 edgeless note 内编辑是否足够自然；
- 大文档性能需要后续专门测试。

R9 判断：

```text
Edgeless-as-page：目前最值得进入 R10 深挖。
它不是零成本，但比强改 PageEditor 更符合 Coincides 的 freeform block-box 和 canvas-first 需求。
```

## 8. Coincides sidecar 是不可省略的

无论最终使用 PageEditor、EdgelessEditor，还是两者混合，Coincides 都不能把 semantic truth 交给 BlockSuite。

原因：

- Coincides 的 NoteBlock 需要 source provenance。
- SourceAnchor / SourceScope / EvidenceSet 需要稳定 jump-back。
- TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest 是 capability layer。
- ObjectRelation 是未来 graph edge candidate。
- Proposal / OperationBatch / MigrationRecord 是 operation/provenance。
- GraphRAG、Concept、role segmentation 等未来能力都要求 AI 能读取 Coincides 语义层。

因此 adoption route 必须是：

```text
BlockSuite block/editor runtime = editing and projection layer
Coincides sidecar = canonical semantic layer
```

BlockSuite block id 可以成为 adapter id 或 view id，但不能替代 Coincides NoteBlock id。

## 9. 四条方向可行性判断

### A. PageEditor 直接改造

评分：

- 用户自然写作：4/5
- freeform block-box：2/5
- 改造成本：1/5
- source/semantic sidecar 适配：3/5
- 长期维护：2/5

判断：

```text
不推荐作为第一路线。
除非 R10 证明 Edgeless-as-page 完全不可行，否则不要强改 PageEditor。
```

### B. PageEditor + overlay layout

评分：

- 用户自然写作：4/5
- freeform block-box：3/5
- 改造成本：2/5
- source/semantic sidecar 适配：3/5
- 长期维护：2/5

判断：

```text
可作为 spike，但容易在 selection / caret / resize / export 上变脆。
```

### C. Edgeless-as-page

评分：

- 用户自然写作：3/5
- freeform block-box：4/5
- 改造成本：3/5
- source/semantic sidecar 适配：4/5
- 长期维护：3/5

判断：

```text
R9 当前最推荐继续验证的路线。
R10 必须重点研究 formal page、outside workspace、多页、导出和性能。
```

### D. Coincides sidecar / hybrid

评分：

- 用户自然写作：取决于 PageEditor/Edgeless 组合
- freeform block-box：取决于 R10
- source/semantic ownership：5/5
- 工程复杂度：3/5
- 长期可迁移性：4/5

判断：

```text
不是独立 editor 路线，而是所有 adoption route 的必要约束。
```

## 10. R9 解决的问题

R9 解决了：

1. PageEditor 的天然定位是线性文档流，不是二维 block-box layout。
2. PageEditor 很适合自然写作，但不适合直接承载 Coincides 的 freeform page。
3. Edgeless note 已有 `xywh`、selection、resize、collapse、displayMode 等更接近 Coincides 的能力。
4. `displayMode` 对 export / formal-scratch 边界有启发，但不足以替代 Coincides export intent。
5. BlockSuite-first/hybrid 仍然值得继续，但应优先验证 Edgeless-as-page，而不是强改 PageEditor。

## 11. 暴露的风险

1. **PageEditor 深改风险**
   会破坏它最成熟的文档流和 selection 体验。

2. **Edgeless 写作体验风险**
   Edgeless 有空间能力，但普通长文写作是否足够自然，需要 R10 验证。

3. **导出风险**
   Edgeless-as-page 必须自己建立 formal page / page break / export intent，否则无法成为可靠文档工具。

4. **sidecar 同步风险**
   BlockSuite block id、Coincides NoteBlock id、SourceAnchor、ObjectRelation、Template metadata 之间需要稳定映射。

5. **性能风险**
   大量 pages、blocks、relations、outside notes 在 edgeless surface 上的性能仍未知。

## 12. 对后续阶段的影响

- R10 必须把 Edgeless-as-page / formal page in canvas 作为优先验证路线。
- R10 必须验证 frames、surface、xywh、connectors、viewport、export、large document 性能。
- R11 必须设计 Coincides semantic sidecar，尤其是 NoteBlock id、BlockSuite block id、source provenance、ObjectRelation 的映射。
- R12 必须把 AI-readable layout 与 PageEditor 线性 flow 解耦；AI 读取应以 Coincides NoteBlock / relation / concept / source 为主，BlockSuite layout 为辅助 context。
- R13 必须给 PageEditor direct modification 较低评分，除非 R10/R11 出现反证。
- R14 必须把“不要强改 PageEditor，优先验证 Edgeless-as-page + sidecar”写进最终路线建议。

## 13. 反补前序报告

R9 不需要修改 R0-R8 正文。

但 R9 强化了 R5/R6 的判断：

- freeform block-box 不应强塞进传统文档流；
- formal page / outside workspace / export intent 更适合由 canvas/page projection 层承担；
- PageEditor 可以作为自然写作参考或局部组件，但不能成为 Coincides 全部文档体验的默认答案。

R9 也强化了 R8 的判断：

```text
BlockSuite-first / hybrid 仍然值得验证，
但第一重点应从 PageEditor 转向 Edgeless-as-page。
```

## R9 结论

BlockSuite PageEditor 是成熟的文档流编辑器，但 Coincides 的目标不是只做文档流。Coincides 需要的是文档感 + 二维 block-box + page/canvas/export + source/relation/provenance 的混合系统。

因此 R9 的路线建议是：

```text
不要 full fork AFFiNE。
不要优先强改 PageEditor。
继续验证 BlockSuite-first / hybrid。
R10 优先研究 Edgeless-as-page。
R11 必须设计 Coincides semantic sidecar。
```
