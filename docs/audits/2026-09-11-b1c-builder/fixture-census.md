> **状态 (Status)**: active
> **层 (Layer)**: B1c builder 请求与夹具普查证据
> **日期**: 2026-09-11
> **权威 (Authoritative)**: 否；施工前独立普查与最终验证回填，不是 HQ 放行

# B1c 挂载请求与夹具普查

本单的接线方案是复用既有 note GET 回包的 `page_format`，在两个既有建纸请求 payload 内携带选型；不增加 endpoint，也不新增挂载期请求。既有 note 缺字段 / `flow` 的夹具继续代表存量纸，不应为其补造新挂载 GET。最终产品 diff 与冒烟请求日志仍需确认这一前提。

## 方法、射程与施工前数字

CodeGraph 索引目录存在，但当前 PATH 无 `codegraph`，已查用户 npm / 仓库 `.bin` 亦未发现 CLI；本会话无可调用 CodeGraph MCP。`rg` 同样不在 PATH，随后按限定目录用 PowerShell / Node 读取。未访问或修改 `.git`。

将 B1b `mock-census.cjs` 的读图部分在内存编译执行，截掉最终 `fs.writeFileSync` 和历史输出行，仅打印新普查数字。没有重写 B1b 的脚本或证据。它使用 TypeScript AST 盘点 mock，再将 TypeScript 转译为 JavaScript 以移除 type-only 导入，追踪实际值导入图；尊重测试局部完整 mock，并保守计入字面量动态 import。静态可达不等于运行时实际挂载。

在 B1c 产品改动完成前，亲跑得到：

| 项目 | 数字 |
| --- | ---: |
| client 全目录 JS/TS 源（排除 node_modules/dist/.vite/coverage） | 530 |
| test/spec 文件 | 140 |
| 含 mock 文件 | 65 |
| mock 调用 | 111 |
| API module mocks | 46 |
| 可达真实 named API consumer，出口齐备 | 14 |
| 被完整替身隔离，无真实 named consumer | 32 |
| 缺少实际消费 named export | 0 |
| browser mockApi（四出口均齐） | 7 |

此外对 TS/TSX/MJS/CJS 作跨目录夹具消费交叉查找，排除 baseline、依赖、构建 assets、dist、coverage 等输出：`client/src` 482、`client/scripts` 43、`docs/audits` 60、根 `scripts` 19、`server/scripts` 18，共 622 文件。client 全目录 AST 的 530 还含配置及其它脚本后缀，故不应与这个 622 的子目录口径混算。B1c 后续新增文件不在上述施工前数字中。

可重复的只读 AST 命令（仓库根，PowerShell；不写旧证据）：

```powershell
@'
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve('docs/audits/2026-09-11-b1b-builder/mock-census.cjs');
let source = fs.readFileSync(filename, 'utf8');
source = source.slice(0, source.indexOf('fs.writeFileSync(path.join(__dirname'));
source += '\nconsole.log(JSON.stringify({sourceFileCount:report.sourceFileCount,testFileCount:report.testFileCount,mockedFileCount:report.mockedFileCount,mockCallCount:report.mockCallCount,apiMockCount:report.apiMockCount,classificationCounts:report.classificationCounts,browserHelpers:report.browserHelpers,missingRows:report.rows.filter(row=>row.missingConsumedExports.length)},null,2));';
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(source, filename);
'@ | node
```

## 具体消费面

| 范围 | 普查结论 / 本单注意事项 |
| --- | --- |
| `client/src/pages/Boards/BoardNewNoteDialog.test.tsx` | 真建纸 dialog；原有 `/courses` GET 保留。4 处 exact 建纸 payload 断言须承接 `page_format`；验证默认 A4、三选项及重试保留选型。 |
| `client/src/pages/Boards/BoardPage.unboxing.test.tsx` | 真 BoardPage → BoardNoteModal → NoteDetail；`POST /boards/board/ceremony-note` 替身应 echo `input.page_format`，否则新选型在假服务器回读时丢失。现有 unknownRequests 严格账本应保留。 |
| `client/src/pages/Courses/CourseDetail.test.tsx` | 只挂 `ProjectIdentity` / `ProjectNotesSection`，不挂 CourseDetailPage 的建纸函数和 summary GET；不能单独证明新建请求或选型持久化。 |
| `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx` | 包含 ProjectNotesSection 子组件的测试；检查小选择器传参改变是否影响调用面，无需补造页面级 GET。 |
| `docs/audits/2026-09-11-{b1a,d2}-builder/browser-fixture.tsx` | 使用 ProjectNotesSection 的历史可执行夹具；不是真 CourseDetailPage，原 onCreateNote 回调可继续忽略附加参数。原证据不改写。 |
| `BoardNoteModal.test.tsx` / `BoardNoteModal.rangeSession.test.tsx` | 前者替换 runtime；后者以 adapter probe 验证数据会话。无需凭静态 import 推断有完整 runtime 挂载。 |
| `useNoteCanvasRuntimeController.test.tsx` / `useNoteCanvasDataAdapter.test.tsx` / `.skin.test.tsx` | controller 桥接 / adapter 真实数据回读；现有 note payload 是 page_format 的落点。新增字段兼容旧字段缺席，不新加请求。 |
| `BoardPage.smoke.test.tsx` / `autoWidthFrameSave.test.tsx` / `pageFrameWallsPersistence.test.tsx` | adapter/layout/墙保存组合测试；Web 长页会影响布局与保存，须定向运行。 |
| pageFrame / pageStack / layout / natural-writing / print 测试族 | 几何、墙、连续长页和打印分页的主要回归面；无新 GET 不能代替这些行为验证。 |

7 份现役 browser API 账本：`client/scripts/{boardOpenNoteSmoke,boardTextRangeSmoke,boardToolsSmoke,cFix1Smoke,pageFrameHealingSmoke,pageReadingSmoke}/mockApi.ts`，以及 `client/scripts/paperInkSmoke/inkMockApi.ts`。均有 `default/getToken/setToken/API_BASE` 四出口。`boardLayersSmoke` 复用板工具账本；pageReading 的主页 / overview / print / tray 四入口共用账本。真实纸 runtime 入口是 boardOpenNote、boardTextRange、cFix1、pageFrameHealing、pageReading 四入口、paperInk；boardTools/boardLayers 不因本单凭空增加纸 GET。

还审查了审计目录中的 B1a/B1b/D2 完整纸夹具、B4v 板夹具、E1/E2/E3/E4/F19 和 D1 可执行投影夹具。leaf 组件 / 手工 props、静态 CSS 审计与完整数据 hook 分开记录；历史报告、截图、baseline 与编译产物不作为当前夹具修补对象。

## 验证命令与边界

全 client 脚本为 `npm run test:unit` → `vitest run`。施工前 AST 扫描 140 文件只发现 `ProvidersSection.test.tsx` 的 suite `Settings provider credential controls` 命中旧脚本的标题排除器；继续阅读其实际行为后，确认四条都是 synthetic mock API 的正常 UI 回归：保存/替换、清除后状态回退、连接结果提示、失败重试。它们不读取真凭据、不发实际 provider 网络请求，也没有对抗性安全测试。不能仅凭 `credential` 关键词将其排除，更不能把标题命中视为全库要求冲突。

因此本单应直接执行完整 client 单测，不沿用旧 `run-text-range-validation.mjs --client-tests` 的标题排除方式。该旧脚本对完整标题使用 `/security|credentials?|authentication|authorization|SSRF|XSS|cross[- ]user/`，会误伤上述正常 UI suite。脚本源码未修改。

历史执行实证：B1b `runtime-gate.log` 为裸 `vitest run`，140 文件 / 1497 测试全通过；B1a-fix1 `runtime-4-workers.txt` 为裸 `vitest run`，138 文件 / 1485 测试全通过，`validation-results.json` 留有命令及 worker 配置。B1a 的 `client-final-tests.log` 虽名为 final，实际只是 14 文件 / 183 测试的定向收据，不应当作全库。

```powershell
# working directory: client
npm run test:unit -- --maxWorkers=4 --minWorkers=1
# working directory: repository root
node scripts/run-text-range-validation.mjs --typecheck
```

根 `verify:v2-bn8-runtime` 还包含安全扫描；本单按工单的受影响门范围拆开执行，不能因上述全库历史使用了聚合入口便重复其安全扫描。建议受影响门：

```powershell
npm run check:canvas-runtime-boundary
npm run check:single-editor-shell
npm run check:groups-rail-shell
npm run check:group-gallery-shell
npm run check:server-shared-runtime-import
npm run smoke:canvas-engine-model-contract
npm run smoke:canvas-engine-performance
npm run build:client
npm run build
npm run docs:check
```

若碰相应契约，再运行其余既有 source-experience / legacy-shutdown / relation-freshness 秒级门。server 定向覆盖 notes create/读回、board ceremony 的 page_format 持久化及禁止建后改型，不应调用含授权/凭据测试的整个安全套件。本普查没有运行任何安全类测试，也未运行 client 验证替代主 builder 的最终全库。

## 真浏览器 + 隔离库设施

本目录新建 `serve.mjs`、`index.html`、`main.tsx`，复用 B1b 的真实人类路由 + Vite 模式，原证据目录不覆盖。启动：

```powershell
# working directory: server
node --import tsx ../docs/audits/2026-09-11-b1c-builder/serve.mjs
```

地址 `http://127.0.0.1:5197`。每次启动创建独立 `.codex-tmp/b1c-browser/run-*/fixture.sqlite`，asset/blob 目录同样隔离；不开 app bootstrap，不接应用存量数据库。前端挂真实 `CourseDetailPage` / `BoardPage` / `NoteDetailPage`。路由的 owner 注入限 synthetic fixture，非鉴权测试。

`/__fixture/bootstrap` 给 project/board/legacy note/member ID；`/__fixture/state` 给 notes 的原始行与真实 canvas persistence、legacyBaseline 和全部 API 请求台账；`POST /__fixture/reopen` 关闭并重开同一个隔离库。未知 API 显式 404。

历史对照纸：`page_format='flow'`；A4 904×1278，x=84/y=0，墙 left=88/right=56/top=24/bottom=110；已有一段文字。它由旧缺省行为建出，不传新选型；启动后保存 `browser-seed.json` 和内存 baseline。主 builder 应对照打开 / 切型建新纸 / 打印 / reopen 后的旧行、帧、墙，不能只对照 UI 标签。

真实 Project 页既有挂载请求包含 summary、notes、course-materials、reconciliation/safety、source-snapshots、source-scopes、source-boards、sources；设施挂相应真实路由。`reconciliation/safety` 为现有产品取数，不是安全测试。冒烟必须保留请求状态与浏览器错误并检查无未知请求，另验证三型创建、Web 单帧增长、打印分页、墙调整、刷新和数据库重开。

设施准备后交由主 builder 执行浏览器自动化；最终证据及其边界见下节和本目录 README。

## B1c 收口复核追加（最终宽度补丁与验证回填）

本单没有新增挂载期 endpoint。纸型只进入既有建纸 payload，读取沿既有 note 回包；未为全夹具添加虚假 GET。现有 named API export 出口不因选型增加要求。

已核对产品与测试现物：

| 文件 | 已完成的夹具承接 |
| --- | --- |
| `BoardNewNoteDialog.test.tsx` | 建纸请求的 exact payload 带 `page_format:'a4_portrait'`；Letter/Web 参数化用例检查所选 preset、对应 collection。 |
| `BoardPage.unboxing.test.tsx` | 假 ceremony server 回包保留 `page_format: input.page_format ?? 'flow'`；完整开纸链路断言新建 A4 的字段身份。旧缺省 fallback 仍保留。 |
| `CourseDetail.test.tsx` | 三型选择器验证默认 A4 与创建时传出 preset；仅切换选择 / 打开旧纸不触发新建。它仍是 ProjectNotesSection 子组件测试，不声称直接测到 HTTP payload；真实 `CourseDetailPage.handleCreateNote` 将该 preset 写为 `POST /notes` 的 `page_format`，并由真实浏览器补验。 |
| `BoardPage.modal.test.tsx` | 两个 combobox 出现后，原项目选择定位改为 `getByRole('combobox', { name: 'Project' })`，不再依赖“唯一 combobox”。 |

`runtime-gate-closure.log` 已记录修补前完整 client **141 文件 / 1516 测试通过**，前序 `runtime-gate-final.log` 为 141 / 1515，首次 `runtime-gate.log` 留有两个失败并保留作诊断轨迹。这些不能代替随后新增 Web 首次挂载宽度修补的最终全库结果。

浏览器发现 Web 初次写入的帧宽虽为 1120，正文仍落旧 760 内容宽；该缺口已完成窄切修补。最终新建 Web `c7e9a0c9-82ae-4808-8043-982c3bb2430c` 从首次草稿即使用 992 内容宽，并重新取得长文、续写、打印投影、同库重开证据。`14`–`20` 截图及最终 native-print JSON/HTML 对应该新纸；`01`–`13` 是此前创建 / 迭代记录，不作为宽度补丁后的最终证据。

最终验证日志 `runtime-gate-final-width.log`：主 builder 报告命令 `npm run verify:v2-bn8-runtime` 退出 0；client **142 文件 / 1517 测试全部通过**，canvas boundary **168**，model contract **60**；两端 build（包含 TypeScript 编译）通过。server 定向 `server-directed-tests.log` 为 **6/6**，无失败、跳过或取消。早期 gate 日志仅保留诊断历史，不混入最终数字。

`verify-browser-state.mjs` 已通过；`browser-summary.json` 留有 6 张纸、364 请求、历史 note+canvas 与 baseline exact equality=true、同一数据库重开后 note/canvas exact equality=true、文本 exact equality=true。请求中保留 1 次旧 run board 404 和 3 次早期超限草稿 400；没有将这四次失败抹去或声称整段日志零错误。

空库坐标契约已按现役 `paperInkSmoke/startInk.mjs` 的 fixture 做法在 seed 前显式插入 `database_meta.coordinate_contract='v2'`，并断言 notes 表为空。当前证据库为 `.codex-tmp/b1c-browser/run-XMLvw2/fixture.sqlite`。这是新库配置，不改已存在的笔记或应用库。历史 `flow` A4 特殊墙种子未改变。

最终打印记录已覆盖为上述新 Web：真实 `window.print` 引发 `beforeprint`，同一 1120×5859 派生帧投影为四页，偏移 0/1584/3168/4752，正文片段宽 992。它不是原生打印预览窗口截图；`afterprint` 尚未确认。既有文字高度估算会保留正文之后的空间，续块按既有位置打印，因此中间可能留白；本单没有改旧排版或打印刻度。证据边界与失败尝试见本目录 `README.md`，最终放行仍由主 builder 的结果与后续复核决定。
