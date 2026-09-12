> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否；B1d builder 验证记录

# B1d 挂载请求与夹具普查

本次材质与表头比例变更不新增 HTTP 请求。`changed-request-check.cjs` 将本单 `baseline-source/` 的 13 份产品 / 测试 / CSS 文件与当前源码对照：6 份运行时 TS/TSX 的直接 HTTP 调用与含 HTTP 的 effect 均保持原样，新增请求 0、改变请求 effect 0。新增值导入只有纯函数 `buildPaperMaterialStyles` 与只读 React context 的 `usePaperSkin`，逐份看源码确认它们没有数据请求。全库执行数字由本单根目录 gate 报告给出，本页不把静态可达性当作运行覆盖。

`mock-census.cjs` 从仓库根运行，逐个读取整个 `client/` 的 JS/TS（含脚本、测试、配置；排除依赖与生成目录），以 TypeScript AST 盘点 mock，并在转译去除类型导入后追踪值导入。测试自身的完整 mock 会截断可达边；字面量动态导入保守计入。源码移植自 B1b，所有结果均在 B1d 现树重新生成，没有复制旧结果。

当前重跑 `mock-census.json`：534 源文件、142 test/spec、65 含 mock 文件、111 次 mock、46 API mock。14 处可达真实 named-export 消费者且出口齐备，32 处由替身隔离，缺口 0。相对 API mock、doMock、非字面量 mock、手工 `__mocks__` 均 0。7 份浏览器 `mockApi` 均提供 default/getToken/setToken/API_BASE。JSON 保留每个入口及可达路径，可逐项复核。

| 挂载入口 / 夹具类型 | 请求与覆盖边界 |
| --- | --- |
| `NoteCoverMetadata` | 既有 `repository.tags(noteId)` 与 `repository.metadata(noteId)`，挂载、刷新键、窗口 focus、板变更时刷新；本次未新增请求。 |
| `useNoteSkin` | 既有带 courseId 的 `GET /courses/:courseId/summary`；空项目不请求，挂载逻辑未因材质改变。 |
| `useBoardSkin` | 既有带 projectId 的 `GET /courses/:projectId/summary`；空项目不请求，本单不改板数据 hook。 |
| 全 client API mock | 上述 46 个 API mock 的路径、替身出口、真实消费者路径与隔离结论完整落在 JSON；未用整层 authStore mock 或未知 URL 通吞来消除缺口。 |
| 全 client browser mockApi | boardOpenNote / boardTextRange / boardTools / cFix1 / pageFrameHealing / pageReading / paperInk 共 7 份，出口齐全。 |
| 本单 E1 leaf 夹具 | 只挂载实际浮层与表头组件，精确承接 `GET /notes/e1-note/tags`、`GET /notes/e1-note/metadata`；任何其他 HTTP 请求均抛错。没有挂载 `useNoteSkin` / `useBoardSkin`，不声称数据库或持久化覆盖。 |

## 受影响静态门

| 门 | 关联源码与现役断言 |
| --- | --- |
| `npm run check:canvas-runtime-boundary` | 直接读取 `NoteDetail.module.css`，检查 PageFrame 背景变量、页面边界、排版变量、页槽及现役浮层结构。|
| `npm run check:groups-rail-shell` | 直接读取同一 CSS module，检查 Rail 现役 anatomy 选择器。|
| `npm run verify:v2-bn8-runtime` | 双常备条款的全库收口；其它未受材质改动的静态门依原串行门执行，结果以本单根目录日志为准。|

本次没有增加或更改安全类测试。E1 源码只改夹具标识、端口及独立 profile 路径，保留八类浮层的静息 / hover 审计与现役交互断言。
