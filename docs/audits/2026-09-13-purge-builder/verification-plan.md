> **状态 (Status)**: active（批一验证与后续方案；不是末批验收）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-12（America/Toronto；证据目录按工单）
> **权威 (Authoritative)**: 否（现物核查与亲跑日志）

# 13.6 清除工单验证记录与后续入口

依据：工单补遗一、STOP-1 与现物 package scripts。独立验证子任务没有修改产品代码、测试源码、静态门、agent 指令或权限配置。未启动应用服务或浏览器。收到 builder 的 STOP-2 通知后停止后续执行；本文不申报四批完成、全库完成或 done。

## 已亲跑

| 项目 | 结果 | 原始证据 |
|---|---|---|
| persistence 改前基线 | 1 文件，49 条：24 pass / 25 fail / 0 skip；exit 1 | [server-persistence-before.log](server-persistence-before.log) |
| 批一定向 | 6 文件，80/80 pass；安全标题排除 0；exit 0 | [batch1-targeted.log](batch1-targeted.log) |
| 批一 typecheck | client typecheck、shared declaration build、server typecheck 全部 exit 0 | [batch1-typecheck.log](batch1-typecheck.log) |
| 批一 boundary 门 | 168 checks pass；exit 0 | [batch1-boundary.log](batch1-boundary.log) |
| 批一 model 门 | 60 groups pass；exit 0 | [batch1-model.log](batch1-model.log) |

批一定向文件为 `NoteChromeLayer`（18）、`NoteRuntimeDocumentLayer`（15）、`pageFrameTypographyService`（18）、`useBlockPlacementInteractions`（21）、`meaningfulRenderableContent`（4）、`usePageReadingPresentation`（4）。执行的是现成 runner 的 `--client-tests` 分支；typecheck 使用 `--typecheck` 分支。

25 红基线由 `.codex-tmp/purge-server-verification.mjs` 执行显式文件 `src/__tests__/v2CanvasPersistenceCutover.test.ts`。helper 只复制 OS / 工具路径环境变量，设 `DB_PATH=:memory:`、本任务专用 asset/blob 目录，并预载已有 `.codex-tmp/v13-no-env.cjs` 阻断 dotenv 文件读取。测试使用 `initDb(':memory:')` 与生成的 fixture；原始 TAP 保留全部失败定位。以下 5 个图片资产活语义用例都在改前失败名单中：

1. Image CanvasObject saves as asset-backed media without becoming text content truth
2. Image asset lifecycle keeps shared duplicate blobs until the final reference is deleted
3. Course delete releases exclusive image assets before cascade removes extensions
4. Course delete keeps cross-course shared image assets until the final course reference is deleted
5. Course delete releases same-course shared image assets only after all course references are removed

没有执行 fixture 改后验证，25 红尚未申报转绿。该 helper 的已验证用途仅是上述已核查的 persistence 文件，不把它当作安全分类已完备的通用全库 runner。

## 现成验证入口的边界

- `scripts/run-text-range-validation.mjs --client-tests [filters...]`：OS 环境白名单、`envFile:false`、内存 DB；可执行受影响定向。无过滤参数的该分支可收集 client 库，但其标题排除仅是通用词匹配，不能替代用例语义核查。
- 同 runner 的 `--typecheck`：client `tsc -b --noEmit`、shared `tsc -b` 声明依赖、server `tsc --noEmit`。本次已经全绿；尚未跑末批三个工程的完整 build。
- 同 runner **无参入口不可原样运行**：审计清单缺 `check:test-wiring` 与 `check:tech-debt-table`，且包含 `git diff --check`。
- `scripts/run-isolated-coordinate-validation.mjs` **不可用于本单**：在运行指定命令以前便无条件调用 Git 获取 changed paths。
- 原 `verify:v2-bn8-runtime` 必须保留完整允许步骤和原顺序。后续可使用工单专用 wrapper 明确跳过 `git diff --check` 与 `check:changed-file-secrets` 两项，并把它们报告为 HQ pending；不能把原总门写成已全部 PASS。本次尚未执行这个 wrapper 或总门。
- `check:test-wiring`、`check:tech-debt-table`、docs index/inventory 的现物入口没有调用 Git；wiring 只遍历显式 `server/src` 与 `server/scripts`。独立验证子任务未跑这几项；主 builder 随后亲跑 wiring：**75/75 已挂、0 豁免、0 漏挂**，见 [batch1-test-wiring.log](batch1-test-wiring.log)。其余两项尚未运行。

后续 client build 应通过 Vite JS API 的 `envFile:false`，并先跑 `tsc -b`；server build 在清洁环境中运行现有 manifest check、`tsc` 与 manifest copy；shared 先构建依赖。构建产物应留在通常 dist / scratch 位置，不能写入本审计目录。

## server test:v2 尚待裁定与执行的范围

现物 manifest 为 **57 文件**。本单同时禁止安全类测试，不能无差别执行 `npm run test:v2` 并宣称符合禁区。已识别以下 3 个文件需要整文件排除并如实申报：

| 文件 | 分类依据 |
|---|---|
| `src/__tests__/providerCredentials.test.ts` | 凭据存储、连接与认证行为 |
| `src/agent/providers/index.test.ts` | adapter 表面用例也实际验证凭据优先级和 Authorization header；不能仅靠标题排除 |
| `src/__tests__/v2DevQuickLogin.test.ts` | 登录 / 认证 suite，并启动应用 server |

剩余 **54 是待核范围，不是已证明全可执行的清单**。还发现需要逐条排除或核明的跨用户 / 路径泄漏 / traversal / 凭据错误净化断言，例如 `v2SourceFileIntake` 的 user-scoped / path-leak 用例、`v2ItemRelationFloor` 的 cross-user dangling Relation、`v2SourceContainerIntake` 的 traversal、`v2ImprintRetrieval` 的 foreign hit ownership filtering、`v2ImprintEmbedding` 的 credential error sanitization。普通内容 ownership、fault injection、skin token 用例不能因字面词汇相似而误删或误分类。

全库隔离应增加本任务专用 `COINCIDES_APP_DATA_DIR`，防止功能模块落入用户凭据存储默认路径。`v2TestV2ManifestHook` 的 T-1 要求传入本机 Node 旁的 `npm_execpath`；其子进程仅执行 manifest copy hook。测试中各 `initDb` 使用内存或 mkdtemp 下的 fixture 路径，不能转用现存用户 DB。原工单允许申报的 2 条环境红本次没有重跑，也没有确认它们的现时状态。

## 隔离真浏览器后续方案（仅准备）

已读取 browser 技能，确认本机 `browser-harness.exe` 可用；没有调用它或打开浏览器。现存 `.codex-tmp/b10-browser/server.mjs` 只启动合成组件 Vite fixture，没有真实 backend，不能充当本单要求的完整隔离库冒烟。

建议续工时创建全新的本单 scratch 子目录，使用该目录下新建 DB、uploads、canvas-assets、source-blobs、app-data。server 使用 OS 环境白名单、dotenv 阻断预载和显式 `DB_PATH`，直接启动 `server/src/index.ts`；Vite 通过 JS API 设 `envFile:false`、独占端口及代理至这个隔离 server。两端均不得占用用户当前服务端口；后台进程使用隐藏窗口。合成用户 / Project / Note 仅存在新 DB，浏览器独立新 tab 只连本单端口，fixture 登录只用于进入功能流程。

应验证真实页面上的纸页读写及刷新回读、墙拖与刷新、皮肤切换、媒体粘贴及资产持久化、Overview 往返全链，并留截图与后端 fixture 回读证据；操作前先截图定位，操作后截图确认。测试数据、cookie / token 不应输出到证据正文。停止时只结束本次创建的进程；不得接触用户既有服务或数据库。

以上全部是未执行方案。当前仅有批一绿色与改前 25 红证据，末批全量、门改红演示、三端完整 build、隔离真浏览器与 Git/secrets 收口均未完成。
