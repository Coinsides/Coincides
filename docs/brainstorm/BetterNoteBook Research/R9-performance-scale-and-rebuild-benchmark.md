# R9 - Performance / Scale / Rebuild Benchmark

## 0. 报告定位

R9 研究 Better Notebook 是否能从 1 页 demo 走向真实笔记规模。

真实规模不是“十几个 block”。如果 Coincides 真的能服务学习、报告、调研和 source-grounded note assembly，常见情况会是：

```text
10-50 页笔记
每页 5-20 个 block
大量公式 / 图片 / source quote
部分页面外 scratch
source badges
relation records
local graph
export preview
AI context preview
project package reopen
```

因此，R9 的问题不是“后面再优化”，而是：

```text
哪些性能约束必须在产品设计阶段就写进去？
```

## 1. 本轮参考材料

R9 继承：

- `S3-r6-r8-data-source-relation-concept-summary.md`；
- `R6-better-notebook-data-contract.md`；
- `R7-editor-runtime-route-decision.md`；
- `R8-source-relation-concept-user-experience.md`；
- `product-improvement-issue-register.md`：
  - PI-028：large canvas rendering and loading performance；
  - PI-029/PI-030/PI-031：relation semantics、AI subgraph、deterministic graph views；
  - PI-034/PI-035：page-aware querying and page labels；
  - PI-036：block fusion and repeated decoration handling；
  - PI-049：GraphRAG sidecar boundary。

R9 的核心前提是 R6 的数据合同：

```text
NoteBlock = 内容 truth
SurfaceObject / BlockBox = 呈现和排版
EditorSnapshot = cache / sidecar
SourceReference = 证据
ObjectRelation = 语义关系
CanvasEdge = 视觉连接
```

如果这些层不分开，性能优化会变成不断修补单个大 JSON 或单个 canvas DOM 的噩梦。

## 2. Benchmark 分层

R9 建议将 Better Notebook 的规模目标分为五档。

| 档位 | 场景 | 目标 |
| --- | --- | --- |
| S | 1 页，5-20 blocks | 基础交互必须顺滑 |
| M | 10 页，50-200 blocks | 日常笔记必须顺滑 |
| L | 50 页，250-1000 blocks | 真实课程/报告必须可用 |
| XL | 100 页，500-2000 blocks | 大型材料必须可打开、可导航 |
| XXL | 200 页候选压力测试 | 不一定全功能顺滑，但不能崩溃或丢数据 |

每档都应测试：

- text blocks；
- formula blocks；
- image blocks；
- source quote blocks；
- source badges；
- hidden/outside workspace blocks；
- same-page relations；
- cross-page relations；
- local graph view；
- export preview；
- reopen / rebuild。

## 3. 性能设计总原则

### 3.1 不渲染用户看不见的 truth

Coincides 可以拥有很多 truth，但不应该把所有 truth 都渲染在当前屏幕上。

这包括：

- 页面外 scratch；
- 不在 viewport 附近的页面；
- 跨页 relation line；
- source preview；
- full source excerpt；
- debug ids；
- AI hidden relations；
- Concept candidate list；
- GraphRAG sidecar reports。

### 3.2 视图是分层加载的

推荐加载顺序：

```text
document shell
  -> visible page frames
  -> visible SurfaceObjects
  -> visible NoteBlock summaries
  -> visible block rich content
  -> selected block details
  -> source/relation/concept inspector data
  -> local graph / source preview / export preview on demand
```

### 3.3 性能和视觉清晰度是一件事

R8 已经说明跨页 relation 不应该默认画线。这不只是审美选择，也是性能选择。

同样，source preview 不应该默认展开；Concept 不应该满屏 tag；debug id 不应该常驻。

## 4. Viewport virtualization

R9 判断：Better Notebook 必须有 viewport virtualization 或等价机制。

最低要求：

- 只渲染当前 viewport 和附近 buffer pages；
- 远离 viewport 的 page 只保留 placeholder / page frame；
- block detail 在进入 viewport 后再加载；
- image / source crop 延迟加载；
- formula 渲染结果可缓存；
- offscreen relation 不画线；
- local graph 单独视图，不依赖主文档全量渲染。

### 4.1 Page stack virtualization

正式页面模式可以按 page frame 作为 virtualization boundary。

```text
page 1 visible
page 2 near-visible
page 3+ placeholder
```

对于 seamless page stack，仍然可以按内部 page boundary 做加载，而不是因为视觉无缝就一次渲染全部。

### 4.2 Open canvas virtualization

open canvas 不能用普通 page index 作为唯一边界，应使用空间索引：

```text
viewport rect
  -> query objects intersecting rect + margin
  -> render those objects
  -> relation query constrained by selected mode
```

这要求 `SurfaceObject` 或等价 projection 层能被空间查询。

## 5. Block layout cache

### 5.1 持久 layout 和派生 layout 分开

持久 layout：

```text
x
y
width
height
page_index
z_index
placement_role
export_role
ai_visibility
```

派生 layout：

```text
text measured height
line breaks
formula rendered bbox
image natural size
collision guides
snap candidates
overflow state
page break warnings
```

派生 layout 可以缓存，但不能成为 truth。

### 5.2 Text reflow 缓存

用户 resize text block 后，文字必须重排。重排可能贵，尤其是公式、inline math、mixed rich text。

建议：

- 宽度变化时重算；
- 内容变化时重算；
- font/style/template 变化时重算；
- 只在当前 block 或同页附近 block 重算；
- 批量布局时走 background layout pass；
- 保存最近一次 measured height / overflow warning 作为 cache。

### 5.3 Layout proposal 不应重写内容

布局 proposal 只更新 surface objects / frames / projection metadata。

它不应修改 NoteBlock 内容、source、relation、template truth。

这延续 v2.4.3 的边界。

## 6. Relation / edge 按需加载

### 6.1 默认不加载所有边

在 80 页笔记里，如果 page 1 的 block 与 page 80 的 block 有关系，主文档不应默认画一条跨 80 页的线。

R9 推荐：

- 当前 viewport 内 relation 可加载；
- selected block 的 direct neighborhood 可加载；
- active relation layer 可加载；
- cross-page relation 默认显示 badge / jump list；
- dense relation 进入 local graph；
- AI hidden relation 只进入 AI context / inspector。

### 6.2 Relation cache

可以缓存：

```text
relation_count_by_object
relation_count_by_layer
has_cross_page_relations
nearest_related_pages
selected_neighborhood_summary
```

但不能缓存为不可恢复 truth。

### 6.3 Local graph 单独渲染

Local graph 不应依赖主文档 canvas 全量对象。

它应查询：

```text
seed object
relation filters
depth
layer
direction
concept/topic filter
source filter
```

然后生成独立 graph view。

这也是以后 AI-readable subgraph 的基础。

## 7. Source inspector lazy load

Source 信息可能很重：

- source material metadata；
- source snapshot page；
- OCR text；
- formula crop；
- image crop；
- page preview；
- source excerpt；
- SourceRegion；
- source confidence；
- source warnings。

R9 建议：

```text
source badge 只加载 count / primary label；
hover 只加载短 tooltip；
inspector 打开后加载 source list；
点击某个 source 后再加载 excerpt / preview / crop；
large source preview 使用分页或缩略图。
```

这也避免普通写作时被 source 系统拖慢。

## 8. Export 不应等同于屏幕截图

Better Notebook 的 PDF/export 不能简单依赖“把当前 DOM 截图”。

原因：

- viewport virtualization 下，很多页面不在 DOM；
- page label 可能和 internal page index 不同；
- source appendix 可能不在页面里；
- outside workspace 默认不导出；
- relation lines 可能只在 relation mode 显示；
- hidden/private/AI-only 内容不能误导出。

R9 建议 export pipeline：

```text
export plan
  -> resolve included SurfaceObjects
  -> resolve page labels
  -> resolve source citations / appendix
  -> render page by page or section by section
  -> collect warnings
  -> produce preview
  -> export PDF / image / package
```

### 8.1 分页导出

多页导出应按 page / chapter / frame batch，不应一次生成全部。

导出时需要：

- progress；
- cancel；
- retry；
- export warning；
- missing source warning；
- overflow/page break warning；
- relation visibility warning。

## 9. Editor snapshot rebuild

R7 已经要求 editor snapshot 只能是 cache / sidecar。

R9 将 rebuild 分成三级。

### 9.1 Level 1: Minimal readable rebuild

如果 editor snapshot 丢失，系统必须能从 Coincides records 重建：

- note title；
- page frames；
- NoteBlocks；
- basic text/formula/image/code rendering；
- x/y/width/height；
- source badges；
- relation counts；
- export intent。

这一级可以丢失一些 editor-specific selection/history/caret state，但不能丢内容和来源。

### 9.2 Level 2: Product-quality rebuild

重建后尽量保留：

- block style；
- line breaks；
- formula display mode；
- image crop display；
- relation visual pins；
- local graph filters；
- page label rules；
- outside workspace layout。

### 9.3 Level 3: Exact editor snapshot restore

只有当 snapshot 仍然存在并且版本兼容时，才追求完全恢复 editor runtime 状态。

不要把 Level 3 当成数据安全底线。

## 10. Reopen / package restore strategy

打开 `.coincides` 工程文件或本地项目时，不应一次加载全部对象。

推荐：

```text
load manifest
load document surface list
load active note metadata
load visible pages
load visible blocks
background validate source refs
background validate relation refs
lazy load source previews
lazy load local graph indexes
```

如果发现 orphan/stale：

- block 存在但 projection 丢失：放进 recovery tray；
- projection 存在但 target 丢失：显示 broken placeholder；
- source ref 丢失：source badge warning；
- relation target 丢失：broken relation；
- snapshot version 不兼容：rebuild from canonical records。

## 11. Undo / redo / operation history

R9 不建议把每一个字符输入都写成 durable operation batch。

分层建议：

### 11.1 Local editor history

用于：

- text typing；
- inline formatting；
- selection；
- caret；
- small edits。

它可以属于 editor runtime 或 local transient history。

### 11.2 Durable layout/history checkpoint

用于：

- block move；
- block resize；
- block create/delete；
- source attach；
- relation bind；
- export intent change；
- template conversion；
- proposal apply。

这些应进入 Coincides operation/history。

### 11.3 Proposal-first operations

用于：

- AI-generated note assembly；
- bulk layout；
- template migration；
- domain refinement；
- source reconstruction；
- GraphRAG relation suggestions；
- concept backfill。

这些不能通过普通 undo/redo 简单处理，必须有 preview/apply/recovery。

## 12. Page-aware query index

PI-034/PI-035 提醒了一个关键问题：用户和 AI 会问“哪个页面”。

R9 建议 roadmap 预留 page-aware projection index：

```text
NoteBlock -> SurfaceObject -> internal_page_index
SurfaceObject -> display_page_label
SourceReference -> SourceSnapshotPage
PageDecoration -> page label / page number
```

这样系统才能回答：

```text
Green theorem 第一次出现在哪一页？
这个 source quote 出现在可见页码几？
这个公式在导出 PDF 的哪一页？
```

不要让 AI 从屏幕截图里猜页面。

## 13. Source reconstruction scale warning

PI-048 未来会研究 SourceRegion / OCR / VLM / formula / image crop。

R9 的警告是：

```text
SourceRegion 不应自动全部变成 NoteBlock。
```

一个 200 页 PDF 可能产生数千个 regions。如果全部直接进入 editable blocks，会造成：

- 渲染慢；
- 编辑难；
- source badge 过多；
- relation 过多；
- export 重；
- recovery 复杂。

正确路线：

```text
SourceRegion
  -> NoteBlockCandidate
  -> preview/proposal
  -> selected blocks
  -> page/canvas layout
```

并配合 block fusion、repeated decoration detection、section batching。

## 14. Minimum Benchmark Plan

R9 建议新 roadmap 加一个 benchmark harness，不一定马上自动化完整，但至少要有固定材料和检查项。

### 14.1 Fixtures

- 1 页手写/公式 note；
- 10 页 typed lecture note；
- 50 页 mixed formula/image note；
- 100 页 synthetic note；
- 200 页 synthetic stress note；
- relation-heavy note；
- source-heavy note；
- image-heavy note；
- outside workspace-heavy note。

### 14.2 Metrics

建议记录：

```text
initial open time
visible page render time
block selection latency
drag/resize latency
source inspector open time
relation mode open time
local graph query/render time
export preview time
package reopen time
memory usage
broken/orphan recovery count
```

### 14.3 Acceptance Bands

不是所有档位都要求一样。

- S/M：必须流畅；
- L：可用，局部加载明显但不打断；
- XL：能打开、能导航、能编辑局部；
- XXL：压力测试，允许降级视图，但不能崩溃或丢数据。

## 15. PI-046 Consistency / Conflict Check

R9 与 PI-046 一致。

PI-046 认为 GraphRAG、Source Reconstruction、AFFiNE / BlockSuite 都不应抢走 Better Notebook 第一阶段的核心。

R9 补充：

```text
如果没有 performance / rebuild / benchmark 约束，
无论选 BlockSuite 还是自研，都会在真实笔记规模下重新崩掉。
```

R9 也强化 R7：editor runtime spike 不能只看功能能不能跑，还必须看：

- 100 页下能否虚拟化；
- snapshot 删除后能否重建；
- sidecar stale/orphan 如何检测；
- relation/source lazy load 是否能接入。

## 16. Roadmap Draft Impact

R9 建议新 roadmap 增加：

```text
Phase F - Performance / Rebuild / Package Safety
```

并在更早阶段设置验收门：

```text
Phase A6 data contract 必须支持 rebuild；
Phase B0 editor runtime spike 必须测试 virtualization 和 snapshot rebuild；
Phase A7 source/relation/concept UX 必须默认 lazy / filtered；
Phase F 再做系统 benchmark 和 package reopen/recovery。
```

### 16.1 Phase F 最小验收

- viewport/page virtualization；
- relation lazy loading；
- source inspector lazy loading；
- page-aware projection index；
- editor snapshot loss rebuild；
- package reopen recovery tray；
- export plan / preview / batch rendering；
- basic performance fixtures；
- S/M/L/XL/XXL benchmark matrix。

### 16.2 不建议推迟的设计约束

即使 Phase F 后做，以下约束必须从早期开始遵守：

- cross-page relation 默认不画线；
- source preview 默认 lazy；
- Concept 默认不满屏显示；
- editor snapshot 不能是 truth；
- export intent 是对象属性；
- page label 和 internal page index 分开；
- block fusion / repeated decoration 是 Source Reconstruction 的前置问题。

## 17. R9 回答 Outline 问题

### 是否需要 viewport virtualization？

需要。Better Notebook 面向真实长笔记，viewport/page virtualization 是基础能力，不是后期优化。

### block layout 如何缓存？

持久 layout 存 canonical placement；文本测量、formula bbox、line breaks、collision guides、overflow warnings 是派生 cache。

### relation/edge 如何按需加载？

只加载当前 viewport、selected neighborhood、active layer、relation mode 或 local graph 需要的关系。跨页关系默认 badge/list，不画长线。

### source inspector 如何 lazy load？

badge 只显示 count/primary label；打开 inspector 后加载 source list；点击具体 source 后再加载 excerpt、preview、crop。

### 多页导出如何避免卡死？

使用 export plan，按 page/chapter/frame 分批 render，提供 progress/cancel/retry/warnings，不依赖当前 DOM 截图。

### editor snapshot 丢失后如何从 Coincides records 重建？

从 NoteBlock、SurfaceObject、SourceReference、ObjectRelation、ExportIntent、PageSpec 生成 minimal readable rebuild。editor snapshot 只用于 exact restore，不是底线。

### undo / redo / operation history 的成本如何控制？

字符输入走 local editor history；block move/resize/source attach/relation bind 等写 durable history；AI/bulk/migration/source reconstruction 走 proposal-first 和 operation batch。

## 18. R9 结论

Better Notebook 的规模能力必须从产品设计阶段进入 roadmap。

最重要的判断是：

```text
不要试图一次渲染全部 truth；
不要把 editor snapshot 当 truth；
不要让 source/relation/concept 默认全显；
不要让 SourceRegion 自动变成 NoteBlock；
不要把 export 设计成当前屏幕截图。
```

R9 建议下一轮 roadmap 把性能和重建能力从“后期优化”提升为正式阶段。否则 Better Notebook 在 1 页 demo 里会好看，在真实学习/报告材料里会变慢、变乱、不可恢复。
