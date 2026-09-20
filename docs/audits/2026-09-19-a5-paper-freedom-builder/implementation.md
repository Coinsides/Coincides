> **状态 (Status)**: active
> **日期 (Updated)**: 2026-09-20
> **层 (Layer)**: 审计 / Builder 实现证据
> **范围**: 2026-09-19 A5 纸型自由化工单；实现定位与几何账本，不代替最终验证回执或 HQ 放行。

# A5 实现证据

## 现物考古与复用

- **B1c**：扩展既有 [pageFrameTemplateService.ts:92](../../../client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts#L92) 预设表，保留 A4、Letter、Web 原几何；建纸仍使用 [notePagePresetService.ts:13](../../../client/src/pages/Notes/canvasEngine/notePagePresetService.ts#L13) 的 A4 默认种子，既有 `page_format` 读取不迁移。
- **物理换算**：复用 [getPageFramePhysicalMapping:71](../../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts#L71)，补横向名义宽度和单页覆写前的参考宽度。单位换算集中于 [paperSizeService.ts:42](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L42)：`mm = 内部长度 × physicalScale × 25.4 / 96`，cm 再除以 10；输入取逆运算，存储继续使用内部像素几何。
- **09-13 皮浮卡**：沿用非模态浮卡壳、窄幅、内部滚动和原有焦点纪律；[SkinFloatCard.tsx:194](../../../client/src/components/Skin/SkinFloatCard.tsx#L194) 只增加纸型内容槽，纸面仍为预览，没有另造预览区。
- **A1**：复用 [resolveDocumentPageFlowPlan:116](../../../client/src/pages/Notes/canvasEngine/documentPageFlowService.ts#L116) 的逐帧宽高、版心、续页和首片换籍；[paperSizeEditService.ts:71](../../../client/src/pages/Notes/canvasEngine/paperSizeEditService.ts#L71) 把几何、既有 manual clamp、A1 页籍更新装入同一快照。TextFlow 正文/真相 schema 不改；auto 的存储 x/y/width 不随换型重写。布局输入经 [resolvePaperSizeEditLayouts:18](../../../client/src/pages/Notes/canvasEngine/paperSizeEditService.ts#L18) 按真实 draft → stored placement → 无持久落点时的 rendered fallback 取值，runtime 接线见 [useNoteCanvasRuntimeController.ts:346](../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts#L346)，防止派生 width/y 随首片换籍落库。
- **交互归宿**：执行 [page-frame-and-layout-contract §二.3:27](../../agent-ops/current-state/page-frame-and-layout-contract.md#L27)；该契约正文及九条坐标规则未改。

## 八预设几何与物理账本

来源为运行现役工厂与换算函数得到的 [preset-geometries.log](../../../.codex-tmp/a5-paper/preset-geometries.log)。下表数值展示到小数点后六位，不表示存储取整；代码保留浮点精度。

| 预设 | templateId | 内部宽 × 高（px） | 换算宽 × 高（mm） |
|---|---|---|---|
| A5 纵向 | `a5_portrait` | 637.104762 × 904 | 148 × 210 |
| A5 横向 | `a5_landscape` | 904 × 637.104762 | 210 × 148 |
| A4 纵向 | `a4_portrait` | 904 × 1278 | 210 × 296.880531 |
| A4 横向 | `a4_landscape` | 1278.514286 × 904 | 297 × 210 |
| A3 纵向 | `a3_portrait` | 1278.514286 × 1808 | 297 × 420 |
| A3 横向 | `a3_landscape` | 1808 × 1278.514286 | 420 × 297 |
| Letter 纵向 | `letter_portrait` | 904 × 1170 | 215.9 × 279.428097 |
| Legal 纵向 | `legal_portrait` | 904 × 1488.941176 | 215.9 × 355.6 |

A 系列 `physicalScale = 0.8779875966831581`；Letter/Legal 为 `0.9026548672566371`。A4 纵向与 Letter 保留现役整数高度，因此等比换算读数与名义纸张高度有原有取整差异；未为凑名义值重写旧几何。物理尺寸表与新增预设生成见 [pageFramePrintScaleService.ts:26](../../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts#L26)。`screen_note` 保留 1120 × 720 起始几何、原边距、`exportable:false`，不在八项纸型族中；`custom` 继续兼容读侧。

## 逐件施工定位

| 工单项 | 交付与源位置 |
|---|---|
| 建纸零选型、默认 A4 | [CourseDetail.tsx:213](../../../client/src/pages/Courses/CourseDetail.tsx#L213) 直接传默认预设；[BoardNewNoteDialog.tsx:63](../../../client/src/pages/Boards/BoardNewNoteDialog.tsx#L63) 的 ceremony-note 请求与种子均用默认 A4。原 `NotePagePresetSelect.tsx`/CSS 退役删除。 |
| 浮卡整本纸型、物理读数 | [NoteCanvasRuntime.tsx:51](../../../client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx#L51) 按 noteId 挂载；[NotePaperControls.tsx:6](../../../client/src/pages/Notes/canvasEngine/layers/NotePaperControls.tsx#L6) 绑定整本默认与选中页；[PaperSizeControls.tsx:98](../../../client/src/components/Skin/PaperSizeControls.tsx#L98) 提供八预设和 cm/mm。 |
| 单页数值调节/恢复 | [PaperSizeControls.tsx:67](../../../client/src/components/Skin/PaperSizeControls.tsx#L67) 在 blur/Enter 提交物理尺寸；[同文件:120](../../../client/src/components/Skin/PaperSizeControls.tsx#L120) 仅 Layout 渲染输入与恢复。换单位不保存。 |
| Layout 拖调、平时零命中 | [NoteWritingSurfaceLayer.tsx:1645](../../../client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx#L1645) 仅 Layout、可写、非 Overview、v2 纸页挂载 [PagePaperSizeHandle.tsx:6](../../../client/src/pages/Notes/canvasEngine/layers/PagePaperSizeHandle.tsx#L6)。[usePaperSize.ts:89](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.ts#L89) 按 zoom 换算拖距，只发布临时几何；[pointerup:124](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.ts#L126) 将起点集合传给 commit 的 `gestureBefore`，即使 runtime ref 已回灌预览，撤销基线仍为拖前几何。释放提交一次，Escape/pointercancel/失焦/退出 Layout/换笔记清预览。零位移不保存。 |
| 整本/单页几何 | [paperSizeService.ts:84](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L84) 整本换族并清覆写；[同文件:96](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L96) 单页覆写与稳定物理参考；[同文件:110](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L110) 恢复默认。保留页/叠身份和当前边距，按新页高重排叠；封面保底边、首内容页原点保持。 |
| 默认/覆写持久化 | [types.ts:160](../../../client/src/pages/Notes/canvasEngine/types.ts#L160) 的帧覆写标记/参考宽，及 [types.ts:203](../../../client/src/pages/Notes/canvasEngine/types.ts#L203) 的集合 `paperDefault`。客户端集合读取与序列化见 [pageFrameCollectionService.ts:329](../../../client/src/pages/Notes/canvasEngine/pageFrameCollectionService.ts#L329)、[同文件:349](../../../client/src/pages/Notes/canvasEngine/pageFrameCollectionService.ts#L349)。 |
| 服务端往返、清覆写 | [canvasObjects.ts:1576](../../../server/src/services/canvasObjects.ts#L1576) 读取帧 metadata；[同文件:1599](../../../server/src/services/canvasObjects.ts#L1599) 读取集合默认；[同文件:1854](../../../server/src/services/canvasObjects.ts#L1854) 保存集合 metadata；[同文件:1913](../../../server/src/services/canvasObjects.ts#L1913) 先清旧覆写字段再写当前值。使用既有集合/帧 metadata 和几何字段，无数据库迁移。 |
| 新建页回笔记默认 | [pageFrameCollectionService.ts:192](../../../client/src/pages/Notes/canvasEngine/pageFrameCollectionService.ts#L192) 插页、[pageStackCollectionService.ts:250](../../../client/src/pages/Notes/canvasEngine/pageStackCollectionService.ts#L250) 手动/A1 续页、[noteCoverPageCollection.ts:10](../../../client/src/pages/Notes/canvasEngine/noteCoverPageCollection.ts#L10) 新封面均继承笔记默认，保留现役墙；显式复制页仍复制该页几何。 |
| 同事务与共享撤销栈 | [usePaperSize.ts:42](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.ts#L42) 复用 TextFlow 边界和 `usePlacementHistory` 队列，成功保存后添加一条 reversibleEdit；失败无成功历史。适配器 [useNoteCanvasDataAdapter.ts:1237](../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#L1237) 通过既有页帧集合保存通道提交几何、manual clamp、auto 首片页籍，按笔记/加载代次避免旧响应覆盖当前页。 |
| 撤销不吞后建页/装订身份 | [paperSizeEditService.ts:30](../../../client/src/pages/Notes/canvasEngine/paperSizeEditService.ts#L30) 重放时按当前拓扑合并，仅撤回本次生成且未被占用的续页；保留后建页、当前页叠身份与有内容/墨水占用页。 |
| 阅读/排字/打印共用物理标尺 | [usePageReadingPresentation.ts:32](../../../client/src/pages/Notes/canvasEngine/hooks/usePageReadingPresentation.ts#L32)、[pageFrameTypographyService.ts:32](../../../client/src/pages/Notes/canvasEngine/pageFrameTypographyService.ts#L32)、[pagePrintProjectionService.ts:6](../../../client/src/pages/Notes/canvasEngine/pagePrintProjectionService.ts#L6) 接受横向与覆写参考宽度；异形页打印使用实际帧几何。 |
| Web 长页独立 | [paperSizeService.ts:10](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L10) 排除 Web/custom；[同文件:14](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L14) 识别 Web 后整本/单页动作原样返回。浮卡仅显示生长说明，不提供转换；A1 既有 Web 排除和打印长页切片逻辑继续使用。 |
| 说明书 | [app-operating-manual.md §一:23](../../agent-ops/current-state/app-operating-manual.md#L23) 至第 26 行补建纸、整本纸型、Layout 异形/恢复、新页继承、存储与 Web 边界。 |

定向证据入口为 `PaperSizeControls.test.tsx`、`paperSizeService.test.ts`、`paperSizeEditService.test.ts`、`hooks/usePaperSize.test.tsx` 和 `hooks/pageFrameWallsPersistence.test.tsx`；原始执行记录均留 `.codex-tmp/a5-paper/`。本页不申报最终全库测试数字或完整验证门结论。

收官 P1 回归新增三项可定位证据：[usePaperSize.test.tsx:116](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.test.tsx#L116) 让 runtime ref 真实回灌拖调预览，断言释放只保存一次且 undo/redo 精确恢复拖前/拖后集合；[paperSizeEditService.test.ts:36](../../../client/src/pages/Notes/canvasEngine/paperSizeEditService.test.ts#L36) 先走实际 auto 派生布局，再断言换籍写入仍保留原 x/y/width/height；[同文件:56](../../../client/src/pages/Notes/canvasEngine/paperSizeEditService.test.ts#L56) 断言真实 draft 优先、无存储落点才用 rendered fallback。测试补齐生产接线条件，没有放宽原坐标断言。

## 范围与留给 HQ 的项

目标纸型排字度量也在保存事务内更新：[usePaperSize.ts:61](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.ts#L61) 使用变更后的集合；[useNoteCanvasRuntimeController.ts:246](../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts#L246) 沿用现役 `resolveEffectiveDocumentTypographyProfile`，保留 metadata/hydrated 用户覆盖。[usePaperSize.test.tsx:88](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.test.tsx#L88) 的两条回归检查默认 A4→Letter 不产生旧度量导致的多余续页，显式自定义度量保持原有分页，undo/redo 对称。

本页仅记录既有裁定下的实现与回归证据，不新增契约内容。本实现不增加依赖、迁移、TextFlow 真相字段、Relation/Agent 动词或安全对抗用例；坐标契约正文不变，单位限制适用于纸型 UI，存储仍为像素。未进行 git 写操作、commit/push/PR；工作树交 HQ。按工单 §四.4，验证门的 git 检查与 secrets 扫描留 HQ，最终验证回执须按实际执行的非 git/secrets 组件申报，不以本实现页宣称完整门通过。最终全量结果与主观验收由总回执/HQ 另行记录。
