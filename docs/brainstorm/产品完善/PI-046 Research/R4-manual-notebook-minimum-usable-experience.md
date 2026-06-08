# R4 - 人工笔记软件最小可用体验

## 本阶段问题

R4 要回答的是：如果完全不依赖 AI，Coincides 作为笔记软件至少要怎样才算“人能舒服地用”。

R2 已经把“人能用的笔记软件”放在第一阶段；R3 已经确认 NoteBlock 是内容 truth，而 block 在页面或画布上的样子只是 presentation / placement。R4 因此不讨论 AI 如何生成笔记，而只讨论用户如何自己写、改、排版、引用和导出一篇笔记。

## 证据来源与证据等级

- A 级代码证据：
  - `client/src/pages/Notes/NoteDetail.tsx`
  - `client/src/pages/Courses/LearningCanvasSurface.tsx`
  - `server/src/routes/notes.ts`
  - `server/src/routes/noteBlocks.ts`
  - `client/src/services/templateOptions.ts`
- A 级 schema 证据：
  - `note_blocks`
  - `note_block_placements`
  - `note_block_sources`
  - `canvas_nodes`
- B/D 级产品观察：
  - 当前 NoteDetail 是表单/卡片式编辑，不是自然文档编辑。
  - 当前 Canvas 能创建 NoteBlock，但还不是正式 page editor。

## 总体结论

Coincides 当前已经具备人工笔记的工程 seed：

- 能创建 note。
- 能创建 NoteBlock。
- 能选择 runtime template。
- 能编辑 block 文本。
- 能保存、上下移动、trash。
- 能预览 KaTeX。
- 能显示 source reference 和 View source。
- 能在 Canvas 上 Add block。

但它还没有达到最小可用笔记软件体验。当前体验更像：

```text
选择模板 -> 在 textarea 输入 -> 点 Add block -> 卡片列表里编辑每个 block
```

而用户期待的是：

```text
打开空白笔记 -> 点击/双击空白处 -> 光标出现 -> 直接写 -> slash/toolbar 改类型 -> 自然排版
```

R4 的核心判断是：

> 最小可用人工笔记体验必须从“表单添加 block”升级为“页面即编辑入口”。NoteBlock 仍是内容 truth，但用户不应该明显感觉自己在操作数据库对象。

## 1. 当前人工编辑能力盘点

### NoteDetail 当前能力

`NoteDetail.tsx` 当前支持：

- 加载 note title 和 blocks。
- 修改 note title。
- 使用 runtime template options 或 static fallback。
- 通过模板下拉框选择 block 类型。
- 在 textarea 输入新 block 内容。
- POST `/notes/:id/blocks` 创建 block。
- 每个 block 有 toolbar：
  - Move up。
  - Move down。
  - Save。
  - Move to trash。
- 每个 block 用 textarea 编辑。
- 每个 block 有 KaTeXRenderer preview。
- 如果 block 有 source reference，可以 View source。

### Server 当前能力

`POST /api/notes/:id/blocks` 当前支持：

- 创建 NoteBlock。
- 创建 NoteBlockPlacement。
- 合并 runtime template metadata。
- 可写 source_references。
- 创建 operation batch。

`PUT /api/note-blocks/:id` 当前支持：

- 更新 block_type、title、content_json、plain_text、metadata、status。
- 合并 runtime template metadata。
- trash block。

### Canvas 当前能力

`LearningCanvasSurface.tsx` 当前支持：

- Add block。
- Connect。
- Plan layout。
- move / resize node。
- viewport pan / zoom。
- 通过 runtime template options 创建 canvas note block。

### R4 判断

这些能力说明后端地基能支撑人工笔记，但 UI 仍停留在工程表单阶段。

## 2. 空白笔记打开后用户期待看到什么

用户打开一篇空白笔记时，不应该先看到复杂的 source board、template studio、proposal panel 或工程卡片。

最小体验应该是：

1. 中央是一张清晰的页面或画布。
2. 标题可以直接编辑。
3. 页面正文区域为空，但有一个自然的输入提示。
4. 用户点击或双击空白处后，光标出现在合理位置。
5. 用户开始输入后，系统创建一个 text NoteBlock。
6. 用户输入 `/` 后可以选择 block type。
7. 用户不需要先理解 NoteBlock、CanvasNode、TemplateDefinition。

### 空白状态文案

空白状态可以很轻：

```text
Click to start writing
```

或中文：

```text
点击开始写笔记
```

但这只是占位，真正体验应由光标和 block 创建来完成，而不是靠说明文字。

## 3. 点击、双击、slash、toolbar、右键、hover 的分工

R4 建议分工如下。

### 点击

点击已有内容：

- 选中光标所在文本。
- 进入文本编辑状态。
- 如果点击 block 边缘或 handle，则选中 block。

点击空白处：

- 在最近合理位置创建 text insertion point。

### 双击

双击空白处：

- 创建新的 text block。
- 位置遵循 page/editor 的插入规则。
- 如果是在页面内，默认属于正式导出内容。
- 如果是在页面外 scratch 区，默认属于草稿/备注内容。

双击已有 block：

- 进入该 block 的文本编辑状态。

### Slash command

Slash command 用于创建或转换 block：

- `/text`
- `/heading`
- `/definition`
- `/formula`
- `/proof`
- `/example`
- `/image`
- `/code`
- `/table`
- `/quote`
- `/callout`
- `/source`

### Toolbar

Toolbar 用于常见文字和 block 操作：

- bold / italic / underline。
- text size。
- alignment。
- formula mode。
- source attach。
- duplicate。
- convert block type。
- create relation。

Toolbar 应随选中对象上下文变化，不应一直塞满页面。

### 右键菜单

右键菜单用于不常用但重要的对象操作：

- copy / duplicate。
- delete / move to trash。
- attach source。
- detach source。
- open source。
- show properties。
- convert template。
- create relation。
- add to favorite。
- export selected。

### Hover

Hover 用于轻量信息，不应替代操作：

- block type。
- source count。
- relation count。
- modified time。
- warning / missing source。
- AI-generated / user-created marker。

## 4. 手动创建 block 的最低体验

### Text / Paragraph

最小要求：

- 用户点击即可输入。
- Enter 创建新段落或同类 block。
- Shift+Enter 换行。
- 粘贴长文本能合理分段。

### Heading

最小要求：

- `/heading` 或 toolbar 转换。
- heading 进入 note outline。

### Formula

最小要求：

- 支持 LaTeX 输入。
- 支持 inline 和 block display。
- 预览要稳定。
- 错误公式应显示 warning，而不是吞掉内容。

当前已有 KaTeX preview seed，但还不是完整公式编辑体验。

### Image / Diagram

最小要求：

- 可上传图片。
- 可调整大小。
- 可和 text block 并排。
- 可添加 caption。
- 可连接 source。

当前 v2.x 没有成熟的 image block authoring。

### Code

最小要求：

- 代码 block 有 language。
- 等宽字体。
- 可复制。
- 可折叠。

当前 template 有 `code.snippet` seed，但编辑器还不成熟。

### Table

最小要求：

- 可插入简单表格。
- 可增删行列。
- 可从 source reconstruction 或粘贴生成。

当前 v2.x 还没有成熟 table editor。

### Source Quote

最小要求：

- 用户可从 source snapshot/scope/anchor 插入 quote。
- quote 保留 source provenance。
- quote 可 jump back。

当前 source reference / View source 已有 seed，但手动 attach source 的体验不完整。

### Callout / Sticky Note

最小要求：

- 可作为正式内容。
- 也可作为页面外草稿/备注。
- 样式和导出行为可区分。

## 5. Block 选择、移动、删除、复制、resize、样式

### 当前能力

当前 NoteDetail 支持：

- 上下移动。
- trash。
- save。

当前 Canvas 支持：

- move。
- resize。
- archive/restore node。

### 最低可用体验

人工笔记软件需要：

- click 选中 block。
- drag handle 移动 block。
- keyboard delete / backspace 删除。
- duplicate。
- copy/paste。
- multi-select。
- resize block。
- block style。
- collapse / expand。
- undo/redo。

### R4 判断

最小可用体验不要求一开始做完整 Photoshop 式编辑器，但必须做到：

- block 能自然被选中。
- block 能自然被移动。
- block 能自然被删除和恢复。
- block 能在页面内以用户心智方式调整宽度。

否则 freeform block-box 和 canvas-first document 都无法成立。

## 6. 手动 block 与 source 的连接

用户手动写的 block 不一定有 source。

但用户应该能主动把 block 连接到 source：

- 单个 source。
- 多个 source。
- 某个 document。
- 某个 page。
- 某个 page range。
- 某个 SourceScope。
- 某个 SourceAnchor。
- 未来某个 SourceRegion / paragraph / formula / image crop。

### 当前能力

后端 `POST /notes/:id/blocks` 已支持 `source_references`，并会校验 document/chunk ownership。

前端目前没有成熟的“给已有 block 批量 attach source”的体验。

### 最低体验

右键或 block toolbar 应提供：

```text
Attach source
Open source
Detach source
Attach selected source scopes
```

如果用户选中了多个 source scopes，应能批量 attach。

R4 判断：

> Source 不是 AI block 的专属能力。人工 block 也必须可以 source-grounded，但不能强制 source-grounded。

## 7. 正式页面内容、页面外草稿区和导出边界

用户可能在页面外写：

- 自己的推导。
- 不想导出的备注。
- 对某个 theorem 的疑问。
- 临时 sticky note。
- 与页面内容有 relation 的 scratch work。

这些对象可能仍是 NoteBlock，也可能未来是 CanvasShape / ScratchBlock。关键不是名字，而是必须保存导出策略：

```text
export_role: formal | scratch | private_note | annotation | hidden
```

或类似字段。

### 最低体验

- 页面内默认导出。
- 页面外默认不导出。
- 用户可手动切换某个 block 是否导出。
- 页面外 block 可以连接页面内 block。
- AI 可以读取页面外 block，但需要知道它是 scratch/private。

### R4 判断

导出边界不应只靠视觉位置判断。位置是默认规则，但对象本身需要 metadata 保存 export intent。

## 8. 当前 v2.x 哪些能作为 seed

### 可作为 seed

- NoteBlock 后端创建/update/trash/reorder。
- runtime template options。
- KaTeX preview。
- source reference / View source。
- Canvas Add block。
- Canvas move/resize。
- operation batch。

### 应重做或大改

- NoteDetail 的表单式 add block。
- 每个 block 大 textarea + preview 的卡片式 UI。
- Move up/down 作为主要 reorder。
- Course Detail 里嵌入 Canvas Document。
- Source/Board/Canvas/Proposal 混在一个长页面。

### 应暂缓

- 复杂 block style editor。
- 完整 handwritten annotation。
- 全局 AI tutor。
- 外部 Agent direct edit。

## 9. R4 解决的问题

R4 确认：

1. 人工笔记体验必须先成立。
2. 当前 NoteDetail 是工程 seed，不是最终编辑器。
3. NoteBlock 可以继续是内容 truth，但用户体验应隐藏对象复杂性。
4. 手动 block 不必强制 source，但必须能连接 source。
5. 页面外 scratch work 是必要能力，且需要导出策略。

## 10. 暴露的风险

1. **编辑器复杂度风险**
   自研自然 page editor + block-box + canvas + rich text 成本很高。

2. **对象表现混乱风险**
   如果用户看到的 block、canvas node、source scope、sticky note 都长得像同一种卡片，会失去心智清晰度。

3. **导出边界风险**
   只用位置判断页面内/外导出会有歧义，必须有 explicit export intent。

4. **source attach UX 风险**
   如果只有 AI-generated block 能有 source，人工笔记会失去 source-grounded 优势。

## 11. 对后续阶段的影响

- R5 必须细化 freeform block-box：如何 resize、并排、collision-aware insertion。
- R6 必须细化 page/canvas/export：formal page、scratch area、multi-page、seamless page stack。
- R7 必须观察 AFFiNE 是否提供类似自然 page editing + edgeless canvas。
- R8 必须检查 BlockSuite 是否能承载 NoteBlock identity、source attach 和 block-box 需求。
- R9-R11 必须把 manual notebook UX 纳入 adoption route 评分。
- R12 必须考虑人工 block 的 source、concept、relation、private/scratch metadata 如何被 AI 读取。
- R13/R14 必须把 manual UX 作为路线选择的首要条件，而不是把 AI 生成能力放在第一。

## 12. 反补前序报告

R4 不需要改写 R0-R3。

但 R4 强化了 R2 的判断：Coincides 第一阶段必须是人工笔记软件。R13/R14 汇总时应把“页面即编辑入口，而不是表单添加 block”写进 roadmap。

## R4 结论

Coincides 的最小可用人工笔记体验应该是：

```text
打开空白笔记
  -> 点击/双击页面开始输入
  -> slash/toolbar 选择 block 类型
  -> block 自然显示为文档内容
  -> 需要时进入 layout/edit mode 调整 block box
  -> 可连接 source
  -> 可区分正式内容和草稿区
  -> 可导出和继续编辑
```

当前 v2.x 已经具备部分底层能力，但缺少自然 editor。后续 AFFiNE / BlockSuite 调研必须首先回答：它们能否帮助 Coincides 更快得到这种人工笔记体验。
