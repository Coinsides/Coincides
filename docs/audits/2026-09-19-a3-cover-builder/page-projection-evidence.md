> **状态 (Status)**: active（builder 分工证据；放行留 HQ）
> **日期 (Updated)**: 2026-09-19
> **范围**: A3 客户端分页、页码、Overview、打印、导出预览与加载内检索投影

# A3 页投影证据

## 建模与复用

- 封面身份只读 `binding_settings.coverPage.frameId`。未给 `PageFrameModel` 增添持久化字段，未修改 TextFlow schema、坐标契约或原有 A2 六槽服务。
- `types.ts:380` 的 `PageFrameExtension` 只增加派生 `isCover`、`mechanicalPageNumber`、`coverImage`、`coverExportIncluded`；原始图片和取景参数仍读 shared `NoteBindingCover`。
- `engineModel.ts:158`、`:342` 将封面前置并投影机械页号 0，内容页继续 1 起。真实封面调用既有 `dropFolioOnCover` 钩子，投影时启用静默；A2 钩子自身的旧版布尔行为与测试保持原样。
- `documentPageFlowService.ts:92`、`:135`、`:141`、`:153` 排除封面帧及全部封面住户。内容流前进时跳过封面，仅用原有 append helper 追加内容页；输入 collection 与存储坐标不改写。`hooks/useNotePageFlow.ts:13` 接入绑定身份。

## 消费链

- `layers/NoteRuntimeDocumentLayer.tsx:58`、`:127` 提供已有题述名 draft/save 回调的 `NoteTruthBindingProvider`；Overview 和打印 portal 复用只读 BlockEditor 投影，不复制正文到块。
- `layers/NoteReadOnlyPageContent.tsx:46` 复用另一分工实现的 `NoteCoverUnderlay`，使用全纸 width/height、左上 0/0，随后渲染原来的文字和页槽。
- `layers/NotePageThumbnail.tsx:31` 让 Overview 与导航缩略图共用封面图和机械页码；封面按钮为 “Read cover page”，内容第一张为 “Read page 1”。
- `layers/NotePrintLayer.tsx:23` 从扩展投影读导出开关。默认包含封面，关闭后不输出封面 section、图片与块；Overview 仍可浏览封面。
- `exportPreviewService.ts:210`、`:248`、`:271` 将同一导出开关应用于页、页栈、包含块计数，并用当前 note truth 给 `note_ref` 行提供展示文案。`hooks/useRuntimeFrameModelController.ts:66` 与 `hooks/useNoteCanvasLayoutModel.ts:346` 传递真相与绑定设置。
- `noteNavigationSearch.ts:41`、`:77` 让题述名投影使用实时题述名，普通封面文本仍走原来的 loaded text 路径；有封面时不重复搜索退役标题带。封面结果定位机械页号 0。

## 功能验证

本分工新增 6 个正常功能用例：`documentPageFlowService.test.ts` 的封面隔离用例 1 个，`layers/A3CoverProjection.test.tsx` 的机械顺序/静默、导出开关、检索/改名、Overview/打印复用、关闭导出后 Overview 仍在共 5 个。没有新增安全对抗用例。

- 9 个定向与受影响文件：111 个测试通过，见 `.codex-tmp/a3-cover/page-projection-final-tests.log`。
- `canvasRuntimeBoundaryCheck.mjs`：175 checks 通过，见 `.codex-tmp/a3-cover/page-projection-boundary.log`。
- 此前 8 文件 88 测与 RuntimeDocument 23 测也各自通过；首次测试的 jsdom `URL.revokeObjectURL` 缺失已在新测试中补 mock。一次 Node 根证书初始化原生崩溃后使用 `--maxWorkers=1` 重跑通过，保留原始日志。
- React 检查清单已复核：投影组件复用、只读打印无写回调、portal 保留 context、图片资源由共享 underlay 回收；无新增依赖。
- 这份证据不宣称完整验证门已绿；全库、server 与非 git/secrets 组件以主 builder 汇总为准。

## 浏览器仪器准备与限制

创建独立本地栈，client `http://127.0.0.1:5103`、server `http://127.0.0.1:4103`；SQLite、资产、来源文件与空 dotenv 路径均限定 `.codex-tmp/a3-cover/`。启动脚本只用于验证，服务窗口隐藏，进程信息写 `ui-processes.json`。未读取真实 `.env`，测试账号密码和 JWT secret 合成输入均不超过 20 字符。

初轮新 DB 缺少 `database_meta.coordinate_contract`，沿现役缺省为 v1；已在 UI 完成封面/题述名创建、题述名保存和 manual 拖摆，并用 API 观察实际 title/description 更新、两个 reference 的 `plain_text=null`、content 仅 `field`、placement manual/frame_id。原始 `ui-evidence-edits.json` 保留。该轮 Overview 错页显示属于 v1 仪器前提不合格，**不列为 A3 v2 浏览器验收通过**。

按既有 `v13CoordinateContract.test.ts` 写法，仅给隔离 DB 添加 v2 元数据，并新建独立笔记 `ea69296a-a67a-4350-b42f-beefba99bfe0`；旧 v1 fixture 另存 `ui-fixture-v1-preparation.json`，原数据未删。

browser-harness 首次连接因无法读取 Chrome `DevToolsActivePort` 失败，改用 CUA 已存在 Chrome 连接。CUA 后续连续返回 `Debugger unattached`；按公开文档尝试同浏览器新标签页后超时并重置，重新发现能列举旧标签页但仍不能附着。未改 Chrome 权限、未另起浏览器、未绕过 CUA 改用其他交互技术。截图已通过 CUA 图片输出给共享会话；公开 API 未提供保存路径，未调用未文档化文件 API。

本分工结束时 v2 浏览器验证因连接中断未完成；后续 root 恢复连接后的实际结果以文末补验及 browser-evidence.md 为准。真实打印与原图上传仍未作实机通过声明。

## Root 接手续验补记

上述 CUA 阻断属于早期仪器记录，现已恢复。Root 重新连接 Chrome 并在独立 v2 笔记亲跑了新增封面、题名与述名编辑、重复添加聚焦、Overview、导出开关、manual 拖动、检索定位 Page 0，以及移除封面；详细轨迹与数据快照见 [browser-evidence.md](browser-evidence.md)。本补记引用 root 的实机结果，保留前述 v1 准备轮与 CUA 失败记录，不将它们算作 v2 通过证据。

最终只读审查发现的「退档后重建误聚焦首页旧件」已修复：去重限定当前封面非 tray 居民，未落位创建保留页籍提示；加入 6 项 controller 功能回归和 1 项 server 生命周期回归。Root 实机确认新封面两件与首页旧述名共存、再次添加不产生重复，见 `ui-evidence-v2-recreated.json`。

图片上传受到自动审批拒绝，打印对话框不可观测；此处不声明图片上传或真实打印对话框 UI 通过。打印与封面衬底的组件测试结果仍仅代表前文申报的测试层级。
