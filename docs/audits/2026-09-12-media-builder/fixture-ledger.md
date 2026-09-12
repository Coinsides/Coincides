> **状态 (Status)**: completed（工单 §六夹具台账普查；工程结论，非主观放行）
> **日期 (Updated)**: 2026-09-12
> **执行**: codex builder / fixture audit
> **工单**: `docs/agent-ops/handoffs/2026-09-12-v13-6-media-block-paste-order.md`

# 媒体块挂载请求夹具台账

新增挂载读口径为现役 repository 的 `GET /canvas-assets/:id/blob`，Axios 配置 `responseType: 'blob'`。本次不新增上传路径，也不放宽未知请求的报错规则。

## 普查范围与方法

扫描 `client/src`、`client/test`、`client/scripts` 的全部 `.ts/.tsx/.js/.mjs`，无目录抽样；CodeGraph 在主线程已尝试但本机不可调用，使用文件枚举、文本命中和逐项调用路径复核。扫描时点共 **544 个源码文件、151 个测试文件、25 个 Board 测试文件、170 个测试/夹具条目**。新增测试落定后可由主线程重新生成库存；完整逐文件路径、请求登记命中行、渲染器命中行及资产字段命中行见 [fixture-inventory.json](fixture-inventory.json)。库存列出全部测试，下面为需要人工判定的请求/渲染交集。

检索覆盖 `canvas-assets`、`loadCanvasImageAssetBlobUrl`、`readCanvasAssetFixture`、`Unexpected`、`Unmapped`、`unknownRequests`、`No HTTP`，并与 `NoteDetail`、`NoteCanvasRuntime`、`NoteWritingSurfaceLayer`、`BlockEditorLayer`、`MediaBlockProjection`、`NoteReadOnlyPageContent`、`NotePrintLayer`、`NoteOverviewLayer` 的挂载路径交叉检查。仅类型/纯模型引用不判作挂载请求。

## 显式新增登记

统一登记位于 `client/test/fixtures/canvasAssetFixture.ts`：唯一合成资产 UUID `13060000-0000-4000-8000-000000000001` → 1×1 PNG `Blob`；`readCanvasAssetFixture` 对其他 URL 返回 `undefined`，由夹具原有报错处理。无任意 ID 通配、无真实 HTTP、无数据库。返回 Blob 的分支位于 JSON clone 之前，避免 Blob 被序列化为空对象。Axios 夹具保留原始请求记账、完成/提交标记。

| 夹具 | 本次处理与依据 |
|---|---|
| `client/src/pages/Boards/BoardPage.unboxing.test.tsx` | 运输层 GET 显式接入固定资产登记；新增持久化媒体块在真实 Board→modal→full-page 挂载回读，断言实际 Blob、两次 blob GET、关闭 modal 的 objectURL 回收，以及 `unknownRequests=[]`。旧四例保持。清理先卸载 React 后复原 URL，确保 effect 回收可执行。 |
| `client/scripts/boardToolsSmoke/mockApi.ts` | 显式登记固定资产，供 BoardTools、BoardLayers 浏览器夹具和 layers/selection/snapping/tools 组件测试共用；既有未知 GET 仍抛错。当前默认种子是 Item/ink/sticky，无媒体 NoteBlock，但共用 Board renderer 可遇到图片。 |
| `client/scripts/boardOpenNoteSmoke/mockApi.ts` | 完整 Note runtime 可挂载媒体；新增已登记 Blob 分支，并记录 `started`/`committed`，保留未知请求 `rejected`。 |
| `client/scripts/boardTextRangeSmoke/mockApi.ts` | 完整 Note runtime 可挂载媒体；新增登记并保留 call/publish，Blob 不走 JSON clone。 |
| `client/scripts/cFix1Smoke/mockApi.ts` | 完整 Note runtime + 隔离 API 夹具；媒体登记在现有 fetch 转发之前结束于内存，仍拒绝未登记请求。未启动其服务器。 |
| `client/scripts/pageFrameHealingSmoke/mockApi.ts` | 完整写作面；新增媒体登记并保留 `receipt.completed=true`。 |
| `client/scripts/pageReadingSmoke/mockApi.ts` | 同一 transport 服务 reading、print、overview、tray 四入口；新增固定媒体登记覆盖写作和 overview 的媒体渲染；print 媒体占位分支本身零 blob GET。未启动 tray 服务器。 |
| `client/scripts/paperInkSmoke/inkMockApi.ts` | 完整 Note runtime + 隔离 API 夹具；媒体登记止于内存、原有转发/未知请求规则不改。未启动其服务器。 |
| `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx` | 明确 mock repository 的图片 reader 为未登记图片失败，保留其他 actual 导出；完整文档面中的媒体挂载不出夹具，也不制造需清理的假 URL。 |
| `client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx` | 同上；原有 API 一律拒绝规则保持，图片 reader 单独隔离。 |

`client/test/fixtures/canvasAssetFixture.test.ts` 对上述 **7 套脚本 transport 逐个实际调用**：登记 URL 必须返回非空 image/png Blob，未登记 asset 必须保留原有报错。这是请求协议夹具回归，不调用服务或安全测试。

## Board 族全部 25 文件的判定

以下路径前缀均为 `client/src/pages/Boards/`；同格文件具有同一判定依据。

| 测试文件 | 判定 |
|---|---|
| `BoardPage.unboxing.test.tsx` | 完整真实 runtime；如上新增固定 asset 登记和真实 media 跨宿主回读。 |
| `BoardPage.layers.test.tsx`、`BoardPage.selection.test.tsx`、`BoardPage.snapping.test.tsx`、`BoardPage.tools.test.tsx` | 使用已补的 `boardToolsSmoke/mockApi.ts` 共用登记。 |
| `BoardPage.bookmarks.test.tsx` | 虽借用 BoardTools 的种子函数，自有 GET 台账仅服务 bookmark/board；既有用例未进入 Note runtime，也无 image visual。保留严格未知请求规则，无新增请求。 |
| `BoardPage.chalk.test.tsx`、`BoardPage.item.test.tsx`、`boardTextRangeClipboard.test.tsx` | 仅 Board chalk/Item/引用卡；跳转目标为探针或不挂载正文；没有媒体 NoteBlock/图片 visual。保留自有 GET 台账。 |
| `BoardPage.modal.test.tsx`、`BoardPage.staging.test.tsx` | `BoardNoteModal` 已被显式替换为宿主探针，媒体 renderer 不可达。 |
| `BoardNoteModal.test.tsx` | runtime/provider 均为宿主生命周期探针，媒体 renderer 不可达。 |
| `BoardNoteModal.rangeSession.test.tsx` | 真实 adapter/range/save，但编辑渲染已替换为 `EditorProbe`，不挂载 BlockEditorLayer。 |
| `BoardPage.smoke.test.tsx` | Note 路由为 `PaperProbe`：读 adapter/布局/阅读几何后只输出 JSON，没有正文 projection；当前唯一 paragraph 种子，无媒体渲染。 |
| `BoardRelocatedVisual.test.tsx` | 既有图片消费者；已显式 mock `loadCanvasImageAssetBlobUrl`，含显示/卸载回收例，保持。 |
| `BoardDeleteDialog.test.tsx`、`BoardList.test.tsx`、`BoardNewNoteDialog.test.tsx`、`BoardViewportBookmarks.test.tsx` | 对话框、清单、建笔记表单或书签，不挂载 Note 正文。 |
| `boardRepository.test.ts`、`useBoard.test.tsx`、`useBoard.history.test.tsx`、`useBoardSkin.test.tsx` | repository/hook 级内存夹具，不挂载媒体 renderer。 |
| `boardSkinStyles.test.ts`、`boardSnapping.test.ts` | 纯样式/几何运算，零请求。 |

## 其他登记制测试与渲染夹具

以下 Notes 路径前缀为 `client/src/pages/Notes/canvasEngine/`。

| 测试/夹具族 | 判定与依据 |
|---|---|
| `blocks/MediaBlockProjection.test.tsx`、`layers/BlockEditorLayer.test.tsx` | 媒体施工子任务已显式 mock 图片 repository；分别覆盖媒体展示/失败/回收及分发、拖动/无文本测量。 |
| `layers/NotePrintLayer.test.tsx` | 媒体施工子任务显式 mock reader，并断言打印占位不调用 reader。 |
| `layers/NoteOverviewLayer.test.tsx` | 已 mock 整个 `NoteReadOnlyPageContent` 为文字及生命周期探针，真实媒体 reader 不可达；不再叠加无效 mock。 |
| `layers/textFlowNavigation.surface.test.tsx` | 既有 `canvasAssetRepository` mock 明确提供图片 reader，维持。 |
| `hooks/useTrayRelocation.test.tsx` | 既有搬家图片通过 BoardRelocatedVisual 显示，GET `/canvas-assets/synthetic-image/blob` 已按固定 ID 注册 Blob，并提供 URL 创建/回收 mock；保持。当前 NoteBlock 为 paragraph。 |
| `layers/NoteTrayInteraction.integration.test.tsx`、`layers/NoteTraySidebar.test.tsx` | tray 条目/拖拽探针，未挂载纸上媒体 renderer；前者严格 GET 台账只承接 tray/placement。 |
| `layers/PaperInkLayer.test.tsx`、`layers/PaperInkProjection.test.tsx` | 专测 ink SVG；后者共用 print/overview 但 `visibleBlocks: []`，无媒体渲染请求。 |
| `canvasObjectRepository.test.ts`、`coordinateContractSession.test.ts`、`genericPlacementContract.test.ts`、`purposeRetirement.test.ts`、`canvasRetirementPolicy.test.tsx` | repository/契约函数，未挂载媒体 reader；已有 strict transport 保持。 |
| `hooks/autoWidthFrameSave.test.tsx`、`hooks/pageFrameWallsPersistence.test.tsx`、`hooks/usePageFrameWalls.test.tsx`、`hooks/useNoteCanvasDataAdapter.test.tsx`、`hooks/useNoteCanvasDataAdapter.skin.test.tsx`、`hooks/usePaperInkCommands.test.tsx` | adapter、保存、墙、ink 命令级夹具，不挂载正文 projection；媒体新增 hook/schema/估高测试自身也只测数据链，不产生挂载 GET。 |
| `coordinateContractIntegration.test.tsx` 及其他 layout/runtime/history/textflow hook、model 测试 | JSX 探针或纯模型计算，媒体组件不可达；全路径见库存，没有新 blob consumer。 |
| `GroupGallery/groupGalleryItemSummary.test.tsx`、`GroupGallery/groupGalleryPurposeRetirement.test.tsx`、`components/ReferenceTag/ReferenceTag.test.tsx`、`services/itemSummaryReader.test.ts` | 消费摘要/引用/目录请求，未挂载 NoteBlock 媒体。原有台账保持。 |
| `AgentMemories/AgentMemories.test.tsx`、`DailyBrief/DailyBrief.test.tsx`、`Settings/Settings.test.tsx`、`Settings/AgentMemoriesSection.test.tsx`、`Settings/ProvidersSection.test.tsx` | 独立页面的 mocked CRUD；没有 Note runtime/media renderer。ProvidersSection 是纯合成表单功能测试，未读取真实 key。 |
| 其余组件、页面、模型测试 | 已纳入逐文件库存。其进口/挂载路径不含完整 Note 正文与媒体 reader，故无新增 GET 登记义务。 |

## 验证

显式空环境目录 `COINCIDES_VALIDATION_ENV_DIR=<workspace>/.tmp/media-builder/empty-env` 下执行：

```text
npm.cmd --prefix client run test:unit -- --run 
  src/pages/Boards/BoardPage.unboxing.test.tsx
  test/fixtures/canvasAssetFixture.test.ts
  src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx
  src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx

Test Files 4 passed (4)
Tests      52 passed (52)
Duration   4.16s
```

其中 unboxing 5、transport 协议 7、文档层 15、对齐层 25。随后将文档/对齐 reader mock 收敛为明确失败（避免制造假 objectURL），以同一空环境目录复跑这两文件 **40/40 PASS，2.94s**。测试无真实浏览器上传、无服务器启动、无用户库、无 `.git` 操作。client 全库由主线程统一执行并写入 Result/总验证证据，本台账不以定向结果替代全库门。

## runtime 总门执行边界

`package.json` 的 `verify:v2-bn8-runtime` 末尾含 `git diff --check` 和 `check:changed-file-secrets`。本单 Henry 明令禁碰 `.git`、禁安全类测试，故不能直接执行包含这两项的复合脚本；应逐个执行其他已审查的允许子门，并在 Result 明确记禁区项未执行，不能声称复合命令完整 PASS。

另发现 `server/src/toolFace/registry.test.ts` 的 `resolve_selection registers the public read tool with the mixed receipt vocabulary` 一例含「missing must not echo an existence-distinguishing identity」信息泄露断言，须按本单禁区跳过该例；本机 Node 支持 `--test-skip-pattern='^resolve_selection registers'`。其他 registry/schema 例可运行。manifest 测试是 Zod→JSON schema 与临时 artifact 新鲜度功能测试，parity 测试是静态路由/调用声明一致性，未发现安全类测试或真实鉴权请求。

`docs:check` 的 docs-index/docs-inventory 均带 `--check`，过期只报错不写；glossary 默认只读（不传 self-test）。client `test:unit` 本身为 `vitest run`，配置为 jsdom + cleanup；源码扫描无 `.git`、dotenv、sqlite、child_process 调用。Vite 已提供 `COINCIDES_VALIDATION_ENV_DIR`，使用空目录避免其默认环境文件加载。
