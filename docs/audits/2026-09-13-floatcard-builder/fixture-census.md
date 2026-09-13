> **状态 (Status)**: complete
> **层 (Layer)**: 审计 / Builder 夹具普查
> **记录日期**: 2026-09-13（运行环境日期 2026-09-12）

# GET /api/skin-suites 挂载请求夹具台账

本单按工单 §五扫描全部既有客户端测试，而非只沿单1的改动清单补登记。起始分母为 **154 个测试文件**：`client/src` 153 个、`client/test` 1 个；另扫描 `client/scripts` 的 44 个 TS/JS 源文件，识别出 7 个合成 HTTP 传输。新建的浮卡及套装测试由对应实现者登记，不混入既有夹具分母。完整逐文件分类与行号见下表及 `fixture-inventory.json`。

挂载边界由集成路确认并在实现中核对：`useNoteSkin`、`useBoardSkin`、`SkinControls`、`SkinEditor` 均消费共享 `useSkinSuites`，根浮卡也消费同一 store。axios 的 `/skin-suites` 对应应用的 `GET /api/skin-suites`；夹具响应是 `{ data: [] }`。只登记这个明确的 GET，不增加兜底成功响应、不替换真实外观 hook。

## 全量分母与分类

**full=154 / processed=154 / remaining=0**。其中 53 个测试直接替换 `services/api`，24 个文件含显式未知请求拒绝分支；4 个消费端复用 `boardToolsSmoke/mockApi.ts`。未发现直接替换原生 fetch 的测试。

| 分类 | 文件数 | 处理 |
|---|---:|---|
| A：实际挂载外观消费者，本普查修改 | 14 | 精确登记 GET `/skin-suites` |
| B：实际挂载看板，共享传输 | 4 | 通过 `boardToolsSmoke/mockApi.ts` 精确登记，不逐文件重复 |
| C：实际挂载外观壳，并行实现者负责 | 3 | `SkinControls`、`SkinEditor`、`NoteChromeLayer` 测试均已由对应实现者登记，行号见下表 |
| D：适配器 / 侧栏扩展预登记 | 6 | 当前不挂载外观 hook；保留单1做法，精确预登记新资产请求 |
| E：其他 API / endpoint 单测 | 26 | 核对实际测试对象，不挂载四个外观消费者，无新增请求 |
| F：共享传输契约测试 | 1 | 复用7个真实合成 adapter，既有未知请求拒绝断言保持 |
| G：纯模型、渲染、上下文或 repository/store 已替换的测试 | 100 | 无新增外观请求；类型导入不算运行时挂载 |

请求消费 / 扩展预登记子分母为 **27 = A14 + B4 + C3 + D6**。本普查直接修改 **20 个既有测试 + 7 个既有传输夹具 = 27 个文件**；C类三件不在本普查编辑范围，避免撞车。

## 相较单1新增发现

- `client/src/pages/Boards/boardTextRangeClipboard.test.tsx` 实际挂载 `BoardPage`，原 strict GET ledger 没有调色板登记。
- `client/src/pages/Notes/canvasEngine/hooks/useTrayRelocation.test.tsx` 在跨页面闭环中实际挂载 `BoardPage`，同样漏登调色板请求。
- 两处旧缺口此前会由外观 hook 的错误处理吸收；本单同时显式登记 `/palette-colors` 与 `/skin-suites`，其余未知 GET 继续抛错。
- `client/test/fixtures/canvasAssetFixture.test.ts` 属于 client 全库，故总分母比单1仅统计 `client/src` 的153多1。

## 不受新增请求影响的边界

`usePaletteColors` 单测只运行调色板 store；`ReferenceTag`/统一取色器只用调色板，无套装 hook。`CourseDetail.test.tsx` 只挂载 `ProjectIdentity`/`ProjectNotesSection`，不挂 `CourseModal`。`BoardNewNoteDialog` 接收解析后的样式；`BoardViewportBookmarks` 仅访问书签；`BoardRelocatedVisual`/`useBoard` 通过替换 repository 隔离。其他 E 类仅测试自身数据服务、独立设置分区、内容渲染、画笔持久化或投影层。`BoardNoteModal.test.tsx` 的 runtime/provider 均被明确替换，与真实 runtime 挂载测试区分。

## 验证

使用空目录 `COINCIDES_VALIDATION_ENV_DIR=.tmp/floatcard-fixture-empty-env`。未读取 `.env`、密钥或用户库；无 git 操作；未修改或运行安全测试。本批未增加任何合成密码/key。

- `fixture-targeted.log`：25 文件 / 274 测试。首轮23文件通过；6例失败来自新 `useNoteSkin` 的 `null.selection` 分支，不是请求漏登。集成路已修复。
- `fixture-recheck.log`：`useNoteSkin.test.ts` 7/7通过；当时真实 note runtime 的 `BoardPage.unboxing` 遇到正在施工的浮卡 runtime import 路径，根实现者已修复。
- `fixture-unboxing-recheck.log`：`BoardPage.unboxing.test.tsx` 5/5通过。合并首轮已通过文件与失败文件的整文件复跑，**25 文件 / 274 个既有测试全部通过**，无子例过滤。
- 七个共享 adapter 的既有媒体 Blob 与未知请求失败契约均在首轮通过。
- client 全库、三端构建及总运行门由根统一执行，本台账不替代它们。

全部本普查编辑文件的原始字节保存在 `.tmp/floatcard-fixture-baseline` 镜像目录；编辑清单为该目录 `edited-paths.json`。本普查本身为 **27 文件，+27/-24 行**，只含明确请求分支；`fixture-change-summary.json` 记录每文件变化。集成路随后在 `useNoteSkin.test.ts` 增加行为测试，其额外行数不算作本普查变化。行号是本次普查的快照，后续同文件测试增补可能使其移动。

## 逐文件证据

下表 `API` 指本文件 `services/api` 替换行，`GET` 指新增套装请求登记行，`guard` 指未知请求拒绝或相关 strict guard；无行号不等于放宽网络，可能是共享传输或无该类挂载。

| Class | Existing test path | Evidence |
|---|---|---|
| G | `client/src/components/ColorPicker/UnifiedColorPicker.test.tsx` | subject:4 |
| G | `client/src/components/ColorPicker/paletteUtils.test.ts` | subject:3 |
| A | `client/src/components/CourseModal/CourseModal.test.tsx` | API:7; GET:11; guard:12; subject:4 |
| G | `client/src/components/Layout/AppLayout.test.tsx` | subject:5 |
| E | `client/src/components/ReferenceTag/ReferenceTag.test.tsx` | API:6; subject:3 |
| C | `client/src/components/Skin/SkinControls.test.tsx` | API:5; GET:8; guard:9; subject:3 |
| C | `client/src/components/Skin/SkinEditor.test.tsx` | API:6; GET:9; guard:10; subject:4 |
| G | `client/src/deadCodeRetirement.test.ts` |  |
| E | `client/src/hooks/usePaletteColors.test.ts` | API:9; subject:4 |
| E | `client/src/pages/AgentMemories/AgentMemories.test.tsx` | API:8; subject:5 |
| G | `client/src/pages/Boards/BoardDeleteDialog.test.tsx` | subject:3 |
| G | `client/src/pages/Boards/BoardList.test.tsx` | subject:4 |
| E | `client/src/pages/Boards/BoardNewNoteDialog.test.tsx` | API:6; subject:3 |
| D | `client/src/pages/Boards/BoardNoteModal.rangeSession.test.tsx` | API:18; GET:115; guard:129; subject:8 |
| G | `client/src/pages/Boards/BoardNoteModal.test.tsx` | subject:4 |
| A | `client/src/pages/Boards/BoardPage.bookmarks.test.tsx` | API:11; GET:59; guard:62; subject:5 |
| A | `client/src/pages/Boards/BoardPage.chalk.test.tsx` | API:10; GET:84; guard:88; subject:4 |
| A | `client/src/pages/Boards/BoardPage.item.test.tsx` | API:10; GET:102; guard:110; subject:4 |
| B | `client/src/pages/Boards/BoardPage.layers.test.tsx` | API:9; shared boardToolsSmoke; subject:4 |
| A | `client/src/pages/Boards/BoardPage.modal.test.tsx` | API:10; GET:72; guard:81; subject:4 |
| B | `client/src/pages/Boards/BoardPage.selection.test.tsx` | API:9; shared boardToolsSmoke; subject:4 |
| A | `client/src/pages/Boards/BoardPage.smoke.test.tsx` | API:23; GET:191; guard:125; subject:5 |
| B | `client/src/pages/Boards/BoardPage.snapping.test.tsx` | API:9; shared boardToolsSmoke; subject:4 |
| A | `client/src/pages/Boards/BoardPage.staging.test.tsx` | API:10; GET:58; guard:68; subject:5 |
| B | `client/src/pages/Boards/BoardPage.tools.test.tsx` | API:8; shared boardToolsSmoke; subject:4 |
| A | `client/src/pages/Boards/BoardPage.unboxing.test.tsx` | API:13; GET:121; guard:29; subject:4 |
| E | `client/src/pages/Boards/BoardRelocatedVisual.test.tsx` | API:9; subject:3 |
| E | `client/src/pages/Boards/BoardViewportBookmarks.test.tsx` | API:9; subject:4 |
| E | `client/src/pages/Boards/boardRepository.test.ts` | API:9; guard:181; subject:2 |
| G | `client/src/pages/Boards/boardSkinStyles.test.ts` | subject:2 |
| G | `client/src/pages/Boards/boardSnapping.test.ts` | subject:2 |
| A | `client/src/pages/Boards/boardTextRangeClipboard.test.tsx` | API:17; GET:106; guard:110; subject:5 |
| G | `client/src/pages/Boards/useBoard.history.test.tsx` | subject:4 |
| E | `client/src/pages/Boards/useBoard.test.tsx` | API:12; subject:4 |
| A | `client/src/pages/Boards/useBoardSkin.test.tsx` | API:8; GET:9; subject:3 |
| E | `client/src/pages/Courses/CourseDetail.test.tsx` | API:11; subject:4 |
| G | `client/src/pages/Courses/Courses.test.tsx` | subject:4 |
| E | `client/src/pages/DailyBrief/DailyBrief.test.tsx` | API:10; subject:5 |
| G | `client/src/pages/GroupGallery/GroupGallery.test.tsx` | subject:6 |
| E | `client/src/pages/GroupGallery/groupGalleryItemSummary.test.tsx` | API:12; guard:35; subject:4 |
| E | `client/src/pages/GroupGallery/groupGalleryPurposeRetirement.test.tsx` | API:13; guard:31; subject:6 |
| G | `client/src/pages/Notes/canvasEngine/annotationStampLayout.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/annotationStampPlacement.test.ts` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/blockAffiliationOutlineService.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.test.tsx` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.input.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.unitHandle.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.test.ts` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/boundaryAccount.test.tsx` | subject:3 |
| E | `client/src/pages/Notes/canvasEngine/canvasObjectRepository.test.ts` | API:12 |
| E | `client/src/pages/Notes/canvasEngine/canvasRetirementPolicy.test.tsx` | API:11; subject:4 |
| G | `client/src/pages/Notes/canvasEngine/coordinateContractIntegration.test.tsx` | subject:4 |
| E | `client/src/pages/Notes/canvasEngine/coordinateContractSession.test.ts` | API:11; guard:34; subject:2 |
| G | `client/src/pages/Notes/canvasEngine/documentTextFlowSelection.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/draftBlockLifecycleReducer.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/draftBlockPersistence.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/freehandService.test.tsx` | subject:3 |
| E | `client/src/pages/Notes/canvasEngine/genericPlacementContract.test.ts` | API:9; subject:2 |
| G | `client/src/pages/Notes/canvasEngine/graphemeExcerpts.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/graphemes.test.ts` |  |
| E | `client/src/pages/Notes/canvasEngine/hooks/autoWidthFrameSave.test.tsx` | API:17; subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/notePagePresets.test.tsx` | subject:3 |
| D | `client/src/pages/Notes/canvasEngine/hooks/pageFrameWallsPersistence.test.tsx` | API:13; GET:106; guard:116; subject:7 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useBlockPlacementInteractions.test.tsx` | subject:8 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useBlockSelectionController.test.tsx` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useBlockTextFlowEditController.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useBoardStagingSelection.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useLayoutInteractionController.test.tsx` | subject:3 |
| D | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.skin.test.tsx` | API:12; GET:52; guard:61; subject:7 |
| D | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx` | API:45; GET:48; guard:382; subject:15 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.affiliationVisibility.test.tsx` | subject:3 |
| A | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx` | API:12; GET:15; guard:16; subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary.test.tsx` | subject:7 |
| A | `client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts` | API:9; GET:10; subject:3 |
| G | `client/src/pages/Notes/canvasEngine/hooks/usePageFrameWalls.test.tsx` | subject:6 |
| G | `client/src/pages/Notes/canvasEngine/hooks/usePageReadingPresentation.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/usePageReadingViewportController.test.tsx` | subject:3 |
| D | `client/src/pages/Notes/canvasEngine/hooks/usePaperInkCommands.test.tsx` | API:13; GET:63; guard:70; subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/usePlacementHistory.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useRuntimeLayoutModelController.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useRuntimeNaturalWritingController.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.pageReading.test.tsx` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useSlashBlockRollbackController.test.tsx` | subject:11 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx` | subject:8 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.document.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.extraction.test.tsx` | subject:6 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.move.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.rangeRecovery.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx` | subject:5 |
| E | `client/src/pages/Notes/canvasEngine/hooks/useTrayController.test.tsx` | API:12; subject:3 |
| A | `client/src/pages/Notes/canvasEngine/hooks/useTrayRelocation.test.tsx` | API:20; GET:99; guard:108; subject:6 |
| G | `client/src/pages/Notes/canvasEngine/inFlightWriteRegistry.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/inlineLifecycle.test.ts` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/layers/BlockEditRecoveryQueue.test.tsx` | subject:6 |
| G | `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.test.tsx` | subject:22 |
| G | `client/src/pages/Notes/canvasEngine/layers/DraftBlockEditorLayer.test.tsx` | subject:14 |
| G | `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx` | subject:3 |
| C | `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx` | API:35; GET:38; subject:14 |
| G | `client/src/pages/Notes/canvasEngine/layers/NoteCoverMetadata.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer.test.tsx` | subject:7 |
| G | `client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.test.tsx` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx` | subject:7 |
| G | `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx` | subject:16 |
| D | `client/src/pages/Notes/canvasEngine/layers/NoteTrayInteraction.integration.test.tsx` | API:20; GET:63; guard:65; subject:6 |
| G | `client/src/pages/Notes/canvasEngine/layers/NoteTraySidebar.test.tsx` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/layers/PageFrameWallLayer.test.tsx` | subject:3 |
| E | `client/src/pages/Notes/canvasEngine/layers/PaperInkLayer.test.tsx` | API:12; subject:4 |
| G | `client/src/pages/Notes/canvasEngine/layers/PaperInkProjection.test.tsx` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/layers/ViewOptionsMenu.test.tsx` | subject:3 |
| E | `client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx` | API:29; subject:2 |
| E | `client/src/pages/Notes/canvasEngine/layers/textFlowNavigation.surface.test.tsx` | API:17; subject:4 |
| G | `client/src/pages/Notes/canvasEngine/meaningfulRenderableContent.test.ts` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/mediaBlockLayout.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/mediaBlockPasteService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/pageCenteringContract.test.ts` | subject:10 |
| G | `client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/pageFrameWallService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/pageReadingDomService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/pageReadingViewportService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/pageStackContentFlowService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/pageTextCoordinates.test.tsx` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/paperSkinStyles.test.ts` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/placementAutoWidth.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/placementContractService.test.ts` | subject:35 |
| E | `client/src/pages/Notes/canvasEngine/purposeRetirement.test.ts` | API:7; subject:2 |
| G | `client/src/pages/Notes/canvasEngine/recoveryReplayAnnotations.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/routeRequestGeneration.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/selectionReceiptProjection.test.ts` | subject:5 |
| G | `client/src/pages/Notes/canvasEngine/slashCommandReducer.test.ts` | subject:20 |
| G | `client/src/pages/Notes/canvasEngine/surfaceAuthorityContract.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/textFlowBlockNavigation.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/textFlowDocumentHistory.integration.test.tsx` | subject:4 |
| G | `client/src/pages/Notes/canvasEngine/textFlowEditSession.test.ts` | subject:3 |
| G | `client/src/pages/Notes/canvasEngine/textFlowSelection.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/textFocusReceipt.test.ts` | subject:9 |
| G | `client/src/pages/Notes/canvasEngine/textUnitGutterDeOccupation.test.ts` |  |
| G | `client/src/pages/Notes/canvasEngine/textUnitMoveService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/trayService.test.ts` | subject:2 |
| G | `client/src/pages/Notes/canvasEngine/writingSurfaceClassName.test.ts` |  |
| E | `client/src/pages/Settings/AgentMemoriesSection.test.tsx` | API:8; subject:4 |
| E | `client/src/pages/Settings/ProvidersSection.test.tsx` | API:6; subject:3 |
| A | `client/src/pages/Settings/Settings.test.tsx` | API:10; GET:34; guard:44; subject:4 |
| E | `client/src/pages/Sources/SourceReprojectionDialog.test.tsx` | API:16; subject:4 |
| G | `client/src/pages/ToolReceipts/ToolReceipts.test.tsx` | subject:4 |
| E | `client/src/services/itemSummaryReader.test.ts` | API:6; subject:3 |
| G | `client/src/styles/skinComponentStyles.test.ts` | subject:2 |
| G | `client/src/styles/skinPresets.test.ts` | subject:2 |
| F | `client/test/fixtures/canvasAssetFixture.test.ts` | subject:2 |

## Shared HTTP fixture evidence

| Adapter | Suite GET line | Unknown-request guard lines |
|---|---:|---|
| `client/scripts/boardOpenNoteSmoke/mockApi.ts` | 203 | 305 |
| `client/scripts/boardTextRangeSmoke/mockApi.ts` | 88 | 144 |
| `client/scripts/boardToolsSmoke/mockApi.ts` | 87 | 95, 107, 121, 157 |
| `client/scripts/cFix1Smoke/mockApi.ts` | 44 | 48 |
| `client/scripts/pageFrameHealingSmoke/mockApi.ts` | 100 | 112, 129 |
| `client/scripts/pageReadingSmoke/mockApi.ts` | 122 | 120, 134 |
| `client/scripts/paperInkSmoke/inkMockApi.ts` | 43 | 49 |
