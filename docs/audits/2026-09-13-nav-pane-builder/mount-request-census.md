> **状态 (Status)**: active
> **层 (Layer)**: 本单验证判据 / Verification evidence
> **日期 (Updated)**: 2026-09-13
> **范围**: 单5 导航窗格二轮；工单第三节挂载期请求例外登记

# 导航缩略挂载期读取与全夹具普查

本单新增导航入口复用 E4 的真实只读缩略。文本、公式、代码、纸面 ink 使用已经加载的输入；媒体和 Item 引用沿既有块投影读取所需资产与 ItemSummary。因此本单不能申报“所有内容类型零新增挂载请求”：**新增 endpoint 为 0；开启页面签时可增加下列两种既有 endpoint 的读取次数**。这属于工单第三节已允许、要求登记的例外。

## 请求契约

共同路径为 `NoteNavigationPages → NotePageThumbnail → NoteReadOnlyPageContent → BlockEditorLayer`；E4 为 `NoteOverviewLayer → NotePageThumbnail`，其余路径相同。

| 内容与既有读取路径 | 既有 HTTP 契约 | 导航增量与生命周期 | 验证 |
| --- | --- | --- | --- |
| media → `MediaBlockProjection` → `loadCanvasImageAssetBlobUrl` | `GET /canvas-assets/:assetId/blob`，`{ responseType: 'blob' }` | 每次可见 media 投影挂载读取 1 次；卸载释放 blob URL；离开懒渲染范围后返回会重新读取。无新 cache 或批量 API。 | 真实投影用合成 `asset-nav`：首挂 1 次，普通 rerender/点击仍 1 次，滚出再返回累计 2 次；两次 URL 均释放。 |
| item_ref → `ItemRefBlockProjection` → `loadItemSummaries` | `POST /items/summaries`，`{ item_ids: [itemId] }` | 每次可见 item_ref 投影挂载读取 1 次当前 ItemSummary；这是只读投影接口，HTTP POST 不代表新增写操作。离开懒渲染范围后返回重读。 | 合成 `item-nav`：首挂 1 次，普通 rerender/点击仍 1 次，懒渲染重挂累计 2 次。 |
| paragraph + paper ink | 无 | 输入文本与 SVG 路径直接绘制；无附加 HTTP 调用。 | 真实只读 fragment 与 ink path 同时存在，GET/POST 均为 0。 |

两种读取此前已经服务于 E4/普通编辑纸面。页面签打开时，编辑纸面保持挂载，所以可能同时存在纸面与缩略读取。默认关闭窗格不会挂载 `NoteNavigationPane`/页面签；持久化开合偏好为 true 时，恢复页面签会产生相同增量。结果签搜索本身无网络请求；标题签仅占位。

`NoteNavigationPages.requests.test.tsx` 没有 mock `NoteReadOnlyPageContent`、缩略组件、块投影或两种 reader；仅 mock HTTP transport 与浏览器 object URL。这样可验证真实 reader 最终使用的路径、参数、次数及卸载行为。

## 普查方法与覆盖边界

在 `client/src`、`client/test`、`client/scripts` 中普查当时全部 **167 个 test/spec 文件**；读取 import、动态 import、mock 边界与实际 JSX/render 路径。未扫描或接触 `.git`、`.env`、用户库或依赖目录。先从以下生产挂载链逆向核对测试入口，再逐项检查媒体/Item 引用与开窗格操作：

- `NoteDetail → NoteCanvasRuntime → NoteRuntimeDocumentLayer → NoteNavigationPane → NoteNavigationPages`。
- `BoardPage → BoardNoteModal → NoteCanvasRuntime`；`App → NoteDetail / BoardPage`。
- E4 的 `NoteOverviewLayer → NotePageThumbnail` 与已有 print/ink/对齐共享投影夹具。

仅引用 `NoteCanvasRuntimeModel` 类型或调用 `buildNoteCanvasRuntimeModel` 的模型测试，不等于挂载 runtime。`useNoteCanvasRuntimeController`、`useNoteRouteSaveBoundary`、`useNoteCanvasLayoutModel` 等 hook 单元夹具逐项检查为没有挂载导航；不需要新增这两种读取 mock。它们仍包含在 client 全库例行整跑中，**没有测试排除项**。

下表路径均相对于仓库根。media/item_ref 栏只统计会进入笔记只读缩略的块；Board 自己的 Item 卡片、chalk 或 ink 不是笔记缩略块。

## 导航及 runtime 夹具登记

| 夹具路径 | 实际挂载与边界 | nav open | media / item_ref 进入导航 | mock 或台账变更 |
| --- | --- | --- | --- | --- |
| `client/src/pages/Notes/canvasEngine/layers/NoteNavigationPages.requests.test.tsx` | 真实页面签、缩略、readonly、块投影、reader | 直接挂载 | 是 / 是；另有 text+ink | 新增严格 HTTP mock 与精确次数断言；只登记两种既有 endpoint。 |
| `client/src/pages/Notes/canvasEngine/layers/NoteNavigationPages.test.tsx` | 真实导航布局；readonly 以文字生命周期探针替代 | 直接挂载 | 否 / 否 | 无额外请求 mock；负责同源结构、懒渲染、跟随、焦点与点击。 |
| `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx` | 真实 runtime document/编辑器/导航；浮卡隔离 | 新增功能用例明确打开，其余默认关闭 | 否 / 否，真实代码块 | 既有 asset repository mock 保留；无需新增读取 mock。新增前后 localStorage 清理，开闭持久化只在各用例内部延续。 |
| `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.appearance.test.tsx` | runtime 外观入口真实；`NoteRuntimeDocumentLayer` 被 mock | 无真实导航 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardNoteModal.rangeSession.test.tsx` | 真 modal；runtime 替换为 adapter/range 探针 | 无真实导航 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardNoteModal.test.tsx` | 真 modal；runtime/provider 已 mock | 无真实导航 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.unboxing.test.tsx` | 真 board、modal 与 full-page `NoteDetail`/runtime | 默认关闭；不操作导航按钮 | 既有纸面有 media / item_ref；导航未挂载 | 既有严格 ledger 已登记 media blob 与 `/items/summaries`，本单不需修改既有次数。已有媒体用例跨 modal/full-page 明确累计 2 次。 |
| `client/src/pages/Boards/BoardPage.bookmarks.test.tsx` | 真 BoardPage；只测试相机/书签 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.chalk.test.tsx` | 真 BoardPage；chalk 与 board Item 投影 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.item.test.tsx` | 真 BoardPage；note 目的路由为 `NoteDestination` 探针 | 无真实导航 | 无 / 无 | 无需变更；board Item 读取保留既有 mock。 |
| `client/src/pages/Boards/BoardPage.layers.test.tsx` | 真 BoardPage；board 图层工作流 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.modal.test.tsx` | 真 BoardPage；`BoardNoteModal` 已 mock，note 目的路由为探针 | 无真实导航 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.selection.test.tsx` | 真 BoardPage；board 选择工作流 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.smoke.test.tsx` | 真 BoardPage；纸面目的路由为 `PaperProbe`（adapter/布局探针） | 不打开 | 无 / 无 | 无需变更；原纸面探针不挂导航。 |
| `client/src/pages/Boards/BoardPage.snapping.test.tsx` | 真 BoardPage；board 拖动对齐 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.staging.test.tsx` | 真 BoardPage；`BoardNoteModal` 已 mock | 无真实导航 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/BoardPage.tools.test.tsx` | 真 BoardPage；board 工具工作流 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Boards/boardTextRangeClipboard.test.tsx` | 真 BoardPage；note 路由为 `SourceEditor` 探针 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/Notes/canvasEngine/hooks/useTrayRelocation.test.tsx` | 真 BoardPage；note 路由为 `TrayPaper` 探针 | 不打开 | 无 / 无 | 无需变更。 |
| `client/src/pages/DesignStudio/DesignStudio.test.tsx` | 动态导入 App；NoteDetail 与 BoardPage 均 mock | 无真实导航 | 无 / 无 | 无需变更。 |

## 共享渲染与邻接读取夹具复核

| 夹具路径 | 同源范围与内容 | nav open | mock 或台账变更 |
| --- | --- | --- | --- |
| `client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer.test.tsx` | E4；readonly 文字生命周期探针；无媒体/引用 | 不适用 | 保留原 mock；CSS 测试读入抽出的共享缩略样式。 |
| `client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx` | 真 writing/Overview/print 对齐；无 media/item_ref 缩略 | 不适用 | 既有资产拒绝 mock 保留，不增加读取。 |
| `client/src/pages/Notes/canvasEngine/layers/PaperInkProjection.test.tsx` | 真 writing/Overview/print ink；无块资产/引用 | 不适用 | 无需请求 mock；纯 SVG 输入。 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx` | 真 print fragments；media 使用已有 print placeholder | 不适用 | 既有资产 mock 与零媒体请求断言保留；导航不改变 print 生命周期。 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx` | 既有 export media placeholder | 不适用 | 既有零资产请求断言保留。 |
| `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.test.tsx` | 底层真实块投影回归 | 不适用 | 原资产 repository mock 保留，本单未改。 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.test.tsx` | 资产读取/URL 生命周期的原功能回归 | 不适用 | 原 reader mock 保留，本单未改。 |
| `client/test/fixtures/canvasAssetFixture.test.ts` | 既有资产 HTTP 夹具契约 | 不适用 | 原夹具保留；没有放宽 default handler。 |

## 本判据的验证结果

新增真实导航读取定向文件：**1 文件、2 用例，通过**。它验证精确请求契约与纯 text/ink 的零增量，不使用真实网络或用户库。client 全库零排除整跑及其总数字由本次 builder 总验证报告统一记录；本文件不把定向通过冒充全库通过。
