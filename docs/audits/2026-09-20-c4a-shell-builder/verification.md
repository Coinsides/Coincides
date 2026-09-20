# C4a 二轮验证记录

2026-09-20 · Codex builder 验证子任务 · **已完成本轮验证；非 git/secrets runtime 22/23 PASS，标准 server 构建及两处 Python 环境阻塞保留，不申报整门全绿。**

## 执行范围与隔离

- 仅运行既有功能回归与本单新增功能测试；没有新增安全对抗测试。
- 工单明文留给 HQ 的两段为 `git diff --check` 与 `check:changed-file-secrets`。其余 runtime 门为 **23 组件**，按根 package.json 的原顺序逐段执行；不是声称原始 25 段整门全绿。
- 本次包装器为 `.codex-tmp/c4a-shell/verify-run.mjs`：只继承 OS 必需环境，设置空 dotenv、`DB_PATH=:memory:`、本轮独占 credentials/uploads/assets 目录；新合成键仅 `syn-c4a`（7 字符）。不继承任何真实模型键或数据库路径。首轮 credentials 目录错误地放在仓库内，被现役存储边界拒绝；已改为 OS `mkdtemp` 独占目录，见各组 `isolation.json`。
- server 沿用 `scripts/run-server-test-suite.mjs`。全部测试文件显式传入 `--test-timeout=600000`，并发 4；runner 另为 canvas/source 资产分配 `mkdtemp` 目录。既有落盘测试自行创建临时 synthetic DB，`v13WildernessExecute` 使用合成 buffer 与自己创建的临时库，未读用户库。
- 未运行任何 git 写操作。检查脚本中的 git 用法只读；构建只写现役 dist/.codex-tmp 产物。指纹/manifest 的正式更新由施工子任务负责，验证仅 check；既有生成器测试的写入针对其自己的测试 fixture。
- 全库既有 provider/agent 测试在 provider/fetch 边界使用 mock，脚本场景使用默认 `scripted` 模式。未使用 `--live`、应用后端、迁移 CLI 或模型调用。浏览器截图使用独立合成 fixture 的 Vite 服务（5194），已停止。

## 精确命令拓扑

复现入口（仓库根）：

```text
node .codex-tmp/c4a-shell/verify-run.mjs wilderness initial
node .codex-tmp/c4a-shell/verify-run.mjs runtime initial
node .codex-tmp/c4a-shell/verify-run.mjs server initial
node .codex-tmp/c4a-shell/verify-run.mjs eval initial
node .codex-tmp/c4a-shell/verify-run.mjs agenttype initial
node .codex-tmp/c4a-shell/verify-run.mjs server-targeted envfix server/src/__tests__/v2MaterialLibrary.test.ts
node .codex-tmp/c4a-shell/verify-run.mjs server-targeted contextfix server/src/__tests__/v14ContextHint.test.ts server/src/__tests__/v14UiCommands.test.ts
node .codex-tmp/c4a-shell/verify-run.mjs runtime-targeted final check:test-wiring check:agent-knowledge test:unit build:client docs:check
node .codex-tmp/c4a-shell/verify-run.mjs eval final
node .codex-tmp/c4a-shell/verify-run.mjs agenttype final
node .codex-tmp/c4a-shell/verify-run.mjs server-targeted harness-final server/scripts/agent-eval/harness.test.ts
```

每组目录保留 `commands.json`、逐命令原始 `.log`、`results.json`。server/wilderness 还保留传入的精确 `files.json`；server 全量按 `server/src` + `server/scripts` 的全部 `.test.ts` 文件动态枚举，禁止只把 curated `test:v2` 当成全库。wilderness 先独立执行；其余文件待代码与 manifest 完成后执行，最终按文件并集交账，不遗漏该长文件。

| # | 非 git/secrets runtime 组件 |
|---|---|
| 1 | check:test-wiring |
| 2 | test:agent-knowledge（含既有 pretest hook） |
| 3 | check:agent-knowledge |
| 4 | check:tech-debt-table |
| 5 | test:unit（client 全库） |
| 6 | test:tool-face-registry |
| 7 | test:tool-face-manifest |
| 8 | check:tool-face-manifest |
| 9 | test:tool-face-parity |
| 10 | check:tool-face-parity |
| 11 | check:server-shared-runtime-import |
| 12 | check:canvas-runtime-boundary |
| 13 | check:group-gallery-shell |
| 14 | check:groups-rail-shell |
| 15 | check:single-editor-shell |
| 16 | check:source-experience |
| 17 | check:v2-bn11-legacy-shutdown |
| 18 | check:v2-bn11-relation-freshness |
| 19 | smoke:canvas-engine-model-contract |
| 20 | build:client |
| 21 | build |
| 22 | smoke:canvas-engine-performance |
| 23 | docs:check |

## 实际结果

初始实盘为 **107 个 server `.test.ts` 文件**；新增 `v14UiCommands.test.ts` 后为 **108**。已调度全集：独立 wilderness 1 文件 + 其余 107 文件；无文件排除。下述全部保留原始失败，不以复跑覆盖日志。

| 运行 | 实际结果 | 原始日志（相对 `.codex-tmp/c4a-shell/`） |
|---|---|---|
| wilderness，600000 ms 文件预算 | **27/27 PASS**，0 skipped/cancelled/flaky，96.0 s | `verify-wilderness-initial/01-wilderness.log` |
| server 其余 107 文件首轮 | **1039 PASS / 16 FAIL，1055 tests**，0 skipped/cancelled/flaky，63.1 s | `verify-server-initial/01-server.log` |
| MaterialLibrary 隔离目录修正复跑 | **59/59 PASS**，11.3 s | `verify-server-targeted-envfix/01-server-targeted.log` |
| ContextHint + 最终 UI 动词复跑 | **41/41 PASS**，3.2 s | `verify-server-targeted-contextfix/01-server-targeted.log` |
| 23 个非 git/secrets runtime 组件首轮 | **17 PASS / 6 FAIL**，失败列于下方 | `verify-runtime-initial/results.json` 与逐组件日志 |
| client 全库（runtime 第 5 件） | **224 PASS / 2 FAIL 文件；2309 PASS / 4 FAIL，2313 tests**，36.2 s | `verify-runtime-initial/05-test-unit.log` |
| 现役 12 个 scripted 场景 | **114/114 PASS**，8.3 s；空头支票 1、失败工具 1 均为既有刻意触发场景 | `verify-eval-initial/01-agent-scripted-scenarios.log` |
| agent-eval typecheck | **PASS**，2.8 s | `verify-agenttype-initial/01-typecheck-agent-eval.log` |
| 最终 runtime 失败项复跑（5 项） | **5/5 PASS**；最终账为 **22/23 PASS**，仅第 21 项标准 server build 仍失败 | `verify-runtime-targeted-final/results.json` |
| 最终 client 全库 | **227/227 文件、2318/2318 tests PASS**，36.6 s | `verify-runtime-targeted-final/03-test-unit.log` |
| 最终 client 标准 build | **PASS**，14.8 s；现役 chunk 大小提示保留 | `verify-runtime-targeted-final/04-build-client.log` |
| 最终测试接线 / 知识指纹 / 文档索引 | **108/108 文件接线，0 exempt/unwired；指纹无漂移；docs:check PASS** | 同目录 `01-check-test-wiring.log`、`02-check-agent-knowledge.log`、`05-docs-check.log` |
| 最终 13 个 scripted 场景 | **122/122 PASS**；独立 `13-ui-shell-journey` **8/8** | `verify-eval-final/01-agent-scripted-scenarios.log` |
| 最终 agent-eval typecheck / harness | **PASS / 14/14 PASS** | `verify-agenttype-final/01-typecheck-agent-eval.log`、`verify-server-targeted-harness-final/01-server-targeted.log` |
| 全库后仅新增的保存屏障用例及标签回归 | **2 文件、8/8 PASS**，含 BoardPage.documentShell 第 3 例；产品码未变 | `verify-client-targeted-board-save-final/01-client-targeted.log` |

scripted 场景全部 worker 原日志与完整 JSON/scoreboard 复制保存在对应 `verify-eval-initial/`、`verify-eval-final/` 下的 `worker-logs/`、`artifacts/`。该分数是机械断言分数，不是实际模型成功率。最终知识指纹为 `85acce270a2224893e4c011ce4e46e1625f01d5ceba81f7f393cca7aa2a78b15`（说明书 v2，2026-09-20）。

server 初轮 16 FAIL 的处置：10 例 MaterialLibrary 为本次 credentials fixture 路径错误，修正后同文件 59/59；2 例 ContextHint 为本单同步义务（新增 prompt 超既有预算、`tool_start.target_activity` 精确断言），由 owner 压缩仅本单新增 prompt 并补精确字段断言，未放宽预算，复跑同文件 + UI 41/41。剩余 4 项环境问题：2 例 `v2McpArtifact` 卡标准 build 的 `TS6305`（新 shared 声明未能写入既有 dist）；`v2SourceMineruWiring` 在模块加载时 `python.exe ENOENT`；`v2SourceRegionCells` 的既有固定 MinerU venv 无法启动其 uv CPython。直接调用该 CPython `--version` 也返回访问被拒绝；没有改测试跳过、伪造解释器或改权限。这些不得报告 PASS。

runtime 首轮 6 FAIL：新 UI 测试未接 package script、知识指纹待 `--update`、上述 client 4 条断言、新 `agentUiStream` 测试的 `Array.at` 超出现役 TypeScript lib、标准 server build 的 shared 输出问题、说明书更新引出的两份 INDEX 过期。owner 分别补接 `test:v14-c4a-shell`（600000 ms）、更新指纹、修测试会话隔离、改为现役 lib 支持的下标访问、重生成索引；除标准 server build 外均已按原命令复跑通过，没有降低 TypeScript 配置或现役门槛。

client 初轮 4 FAIL 位置：`BoardPage.bookmarks.test.tsx:138`（wheel 中止后相机变化）与 `BoardPage.selection.test.tsx:242/:258/:281`（应 4 selected，实际 1 selected）。根因是旧 route fixture 仅 unmount BoardPage，未触发 AppLayout 的会话复位；主线程在 test/setup.ts 的 cleanup 后复位两个新会话 stores，旧断言不变，最终全库 227/2318 全绿。随后仅新增保存屏障测试，第一次 mock 返回 board 而非 API 的 `{board:…}`，修正 fixture 后两文件 8/8；没有再次运行 2319 条全库，不能将该数字写作一次全库通过数。

server 文件并集为 **108**。去重汇总为 **1083 条 TAP 记录：1079 PASS / 4 环境 FAIL**（初轮 1055 + wilderness 27 + 最终 UI 新增 hidden Base/named layer 1；复跑替换已知 12 条失败状态，不重复累加 59/41/14）。这不是同次全绿执行；其中 `v2SourceMineruWiring` 是模块加载失败记录，文件内部用例未能执行，因此不能称 1083 个用例均已执行。既有 agent 族与十二砖测试没有上述剩余失败。

标准 server 构建边界：原 `build` 的 TS6305 保持 FAIL。owner 的 shared 替代输出构建及 server 严格替代输出构建均 exit 0，记录为 `ui-verbs-shared-alternate-build.log.result.json`、`ui-verbs-server-alternate-build-final.log.result.json`，输出在本轮 `shared-build/`、`server-build/`。server 临时 config 继承原配置，只改 rootDir/outDir、清空 project references 并包含原 server/shared 源，实际 emit；其证明编译源可过，**不替代标准产物布局、MCP artifact 或原门通过**。原 shared/dist 写入 EPERM，未改权限、未加 ts-ignore 或跳过测试。

## 十二砖、收据与 agent 族覆盖

以下是已执行全库中的对应功能族，非新增测试清单，也不是用部分定向集替代全量。client 精确名称另存 `verify-client-regression-inventory.log`；server 精确全集见两组 `files.json`。

| 既有砖 | 已执行的代表性测试族（其余同族仍由全库覆盖） |
|---|---|
| A1 分页 | document/page stack flow、paginationEditing、PaginatedTextBlockProjection、PaginationProjection、跨片编辑/history |
| A2 装订 | useNoteBinding、BindingProjection、NoteBindingPanel；v14NoteBinding |
| A3 封面 | noteCoverPageCollection、A3CoverProjection、NoteCoverMetadata/Controls/Underlay；v14CoverPage、v14CardCover |
| A4 章派生 | chapterProjection、headingInput/Role、useChapterPresentation、useHeadingStructureController、NoteNavigationHeadings |
| A5 纸型 | paperSizeEdit/Replay/Service、usePaperSize、PaperSizeControls；v14PaperFreedom |
| B1 表格 | tableBlockIntegration/Service、TableBlockEditor/Projection、useTableBlockHistory；v14TableBlocks |
| B2 时间线/图表 | componentBlockIntegration/Service、ComponentBlockEditor/Projection、useComponentBlockHistory；v14ComponentBlocks |
| B3 家具/皮 | paragraphFurniture、paperSkinStyles、skinPresets/ComponentStyles、NotePaperHeader；v14ParagraphFurniture/SkinSuites/PaletteColors |
| B5 图像编辑 | mediaImageEdit、MediaImageEditor/Consumption、useMediaImageHistory；v13MediaBlocks |
| C1 板沙箱 | BoardPage 工具/选择/层/视口/暂存族；v14BoardSandbox、v14BoardLayoutInspector、v14BoardVisualGeometry |
| C2 意图路由/注意力/note_patch/答卡 | IntentPlanCard、NotePatchReview、useNoteAgentHumanEditor；v14IntentRouter、v14AttentionContext、v14NotePatch |
| C3 情节记忆 | AgentEpisodes；v14EpisodeStorage、v14EpisodeContext |

收据/contextHint：client 的 AgentPanel.turnReceipt/contextHint、useNoteAmbientAgentContextHint、BoardPage.contextHint；server 的 v14ClaimReceipt、v14ClaimObservation、v14ContextHint 均执行，后者按原预算与精确新字段复跑通过。agent 族另含读工具、注册/manifest/parity、知识投影、路由生命周期、verb transfer、write door、turn identity、loop robustness、记忆等全库文件；新两动词最终 server 6 例、真实 ReadableStream client 5 例与独立 13 号 scripted 8 断言通过。

## 工具条浏览器证据

同一合成 props 渲染真实 `NoteWritingSurfaceLayer` + `NoteChromeLayer`；before 读施工前备份源码与 CSS，临时文件只重定向 import；after 读产品源。API 是本地 mock，未启动应用后端或数据库。此夹具证明工具条结构/视觉/可达性，不替代整页 route 与持久化验证。

| 证据 | 文件 |
|---|---|
| 分区前，1920 px viewport | [before](screenshots/toolbar-before-wide.png) |
| 分区后，同 viewport | [after](screenshots/toolbar-after-wide.png) |
| 七项插入，全部 enabled | [insert menu](screenshots/toolbar-after-insert-menu.png) |
| 430 px 窄屏：笔、插入常显，纸、看折叠 | [narrow](screenshots/toolbar-after-narrow.png) |
| 窄屏七项插入菜单 | [narrow insert](screenshots/toolbar-after-narrow-insert-menu.png) |
| 窄屏纸状态展开 | [narrow paper](screenshots/toolbar-after-narrow-paper-menu.png) |

实测 Escape 收起插入菜单并归还焦点给「插入」；纸状态群 Escape 也收起。浏览器使用 CUA Chrome extension；browser-harness 因读取 `DevToolsActivePort` 被权限拒绝，未导航用户既有 tab。响应式 viewport 最后恢复默认，临时 tab 已关闭，5194 Vite fixture 已中断退出。夹具和 Vite 日志留 `verify-browser/`，生成器为 `verify-browser-prepare.mjs`。

验证包装器首次启动有一处缺失右花括号导致语法错误，未启动测试；已修正。该事件属于测试运行器准备错误，不计为产品测试失败或通过。
