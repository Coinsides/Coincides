> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-11
> **权威 (Authoritative)**: 否；本单 builder 验证记录

# B1b 挂载请求与替身普查

`useBoardSkin` 新增一个有条件的挂载读取：`GET /courses/:projectId/summary`。无项目板不发请求；跨项目迟到响应不进入现页；失败提供重试。`CourseModal → authStore` 仅读取全局外观，不新增 HTTP 请求。

`mock-census.cjs` 从仓库根运行，对整个 client 的 JS/TS（含脚本、测试、配置）作 TypeScript AST 普查，转译后追踪值导入，尊重测试本地完整替身，保守计入字面量动态导入。它不推测未执行分支必然运行；全库执行结论以 runtime-gate.log 为准。独立只读 agent 用同方法在内存重新普查，数字一致。

最终分类见 `mock-census.json`：530 源文件、140 test/spec、65 含 mock 文件、111 次 mock、46 API mock。14 处可达真实 named-export 消费者且出口齐备，32 处被替身隔离；缺口 0。相对 API mock、doMock、非字面量 mock、手工 `__mocks__` 各 0。7 份浏览器 mockApi 都提供 default/getToken/setToken/API_BASE。

| 范围 | 逐入口结果与处理 |
| --- | --- |
| `BoardPage.{bookmarks,chalk,item,layers,modal,selection,smoke,snapping,staging,tools,unboxing}.test.tsx`、`boardTextRangeClipboard.test.tsx` | 12 个真实 BoardPage 测试入口的板 project_id 均 null/省略；未添加虚假 summary 响应。smoke 的 project-a 属于内容组，不是板。 |
| `useTrayRelocation.test.tsx` | 第 13 个既有真实 BoardPage 入口；明确补上 other-project、source-project 的 summary 响应，未知 URL 仍抛错。 |
| `BoardPage.modal.test.tsx`、`BoardPage.staging.test.tsx` | 新 authStore 模块边需要 named exports；改用 typed importOriginal，保留原默认 API 与 modal 隔离逻辑。 |
| 新 `useBoardSkin.test.tsx` | 精确断言 summary 路径、无项目不请求、迟到响应过滤、失败重试、原板写队列及保存失败。 |
| `CourseModal.test.tsx` | 没有 API 替身；authStore 使用完整真实模块，create/update 仍由原 courseStore 替身承接。 |
| `client/scripts/boardToolsSmoke`、`boardLayersSmoke`、`boardOpenNoteSmoke`、`boardTextRangeSmoke` | 板均无项目；无需新 board summary。后两者原纸 runtime 已有相应项目读取处理。 |
| B4v 浏览器夹具 | 板无项目，无新增读取；B1a/B1b CourseModal 浏览器入口使用真实 API。 |
| 原纸面 browser fixtures | cFix1/pageFrameHealing/pageReading/paperInk、D2、B1a、unboxing 原纸面 summary 承接保留；B1b E1 为 leaf 审计，不挂载数据 hook。 |
| 本单真实 SQLite 浏览器夹具 | `serve.mjs` 挂真实 courses/settings/boards/notes 路由；未知 API 显式 404。`browser-report.json` 保留全部请求及状态，检查无 HTTP 4xx/5xx、无浏览器错误。 |

普查未通过跳过测试、mock 整个 authStore 或吞掉未知请求来闭合。
