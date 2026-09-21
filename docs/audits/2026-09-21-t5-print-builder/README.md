> **状态 (Status)**: stopped / incomplete（权限冲突停线；未验收）
> **日期**: 2026-09-21
> **工单**: `docs/agent-ops/handoffs/2026-09-21-v14-t5-print-rich-blocks-order.md`
> **角色**: Codex builder

# T5 builder 停线回执

**本单未完成，不可按 PASS 或 ready-to-review 交付。** 必跑 server 全量中的本地真 OCR 所需 Python 无法在本会话启动，直接只读探针报 `Access is denied`；pinned venv 的原始测试错误为退出码 101。遵守工单「冲突停线举证」，确认后停止代码实现和新测试，只整理证据。不申请越权、不换解释器、不修改外部环境或禁区。

完整 server 数字、命令、失败射程和日志行号见 [server-verification.md](server-verification.md)。

## 当前现物（均未完成 client 验证）

| 文件与行号（仓根相对路径） | 停线前的改动 |
| --- | --- |
| `client/src/pages/Notes/canvasEngine/hooks/useMediaImageAsset.ts:11`、`:42` | 新增同资产共享读取与引用生命周期；同步 snapshot 供已经准备好的打印消费，失败降级、迟到 URL 释放。未验证 StrictMode/消费者交接边界。 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.tsx:14` | 原纸面投影改用同一共享读取；既有 edit_v1 的 `mediaImageGeometry`、SVG crop/rotation/zoom 与加载失败样式继续复用。 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx:28`、`:172` | 平时隐藏挂载将输出媒体的同一投影，覆盖未显示页；排除 tray/不导出封面。beforeprint/afterprint 仍挂载/移除真实 portal，冻结本次输入。 |
| `client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx:70` | 删除打印强制媒体占位参数；表格、组件、toc 的既有 print 变体保留。 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.tsx:46` | 媒体预览改为既有投影，外壳仍使用 row layout/placement 的宽高。 |
| `client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx:272` | 旧占位断言更新为预备完成后 beforeprint 同步真图、原矩形、单次资产读取；未执行。 |
| `client/src/pages/Notes/canvasEngine/blocks/MediaImageConsumption.test.tsx:72`、`:76` | 旧跨消费端计数改为共享读取，并增加打印 crop/rotation 断言；未执行。 |
| `client/src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx:13` | 旧预览占位断言改为真实图、存储矩形与跨分组共享读取；未执行。 |
| `client/src/pages/Notes/canvasEngine/layers/RichBlocksPrint.test.tsx:125`、`:228`、`:249` | 新增 6 个用例草稿：三种封面组合下的纸面/print portal/预览、真实 flow plan 跨页、媒体三种形态、表格、timeline/bar/line、未知组件、print-only 预加载、缺元数据/409；未执行。 |

新增测试有一处已知待校准点：`RichBlocksPrint.test.tsx:212` 依赖预览分组重复数量，恢复后应改为单个 component 内的内容断言，并执行验证；本回执不把草稿当作测试证据。

## 逐族结论及分页边界

- **媒体**：接入实现草稿已在工作区，消费纸面同一组件、metadata 与 edit_v1。尚未执行 client 测试或浏览器验证，不声明已通过。原生 beforeprint 无法等待 IO；隐藏真实投影用于提前加载，但未加载完成即打印的行为、图像 decode 和实际打印快照仍待验证。
- **表格**：开工现物已在打印/预览消费 `TableBlockProjection`，T3 的 `width: fit-content`、`margin: 0 auto` 与 0.85 字号比例已存在，本单未重写投影或样式；新增集成断言尚未执行。
- **组件**：开工现物已在打印/预览消费 `ComponentBlockProjection`，三内建 kind 真渲染、未知 kind 占位降级已存在。本单未另建渲染。现役 timeline 保持 detail 初始折叠；chart 的 print 变体按容器宽度缩放，纸面为固定宽度且允许横向滚动，存在既有内容高度差异，本单未改 flow plan 来补偿。
- **分页**：未修改 `documentPageFlowService`、`notePageFlowService`、`pagePrintProjectionService`、切片算法、坐标契约或 904/1278/760；保留现役几何。由于停线，不能把「未改算法」表述为「已验证分页零变」。

## 验证账

| 项目 | 状态 |
| --- | --- |
| server 全量 | **已跑且失败**：111 文件、零排除、600000 ms/文件、1118 tests、1115 pass、3 fail、0 skipped、0 flaky retries；100311.6327 ms。 |
| server 失败项 | `v2SourceMineruWiring`：PATH 找不到 `python.exe`；`v2SourceRegionCells`：真 OCR 的 pinned Python 启动失败 101；`v2TestV2ManifestHook`：direct-node 调用缺 npm 生命周期变量 `npm_execpath`。后两类环境问题均未豁免或补跑。 |
| client 定向/全库 | **未执行**。 |
| `verify:v2-bn8-runtime` | **非 git/secrets 25 组件未执行**。完整 27 组件中的 git 检查与 secrets 两组件按工单留 HQ。server 既有测试内部调用过 server build，不等同 25 组件验证门通过。 |
| 真实浏览器/打印/PDF 视觉验证 | **未执行**。 |

## 出生公约自查及未做项

- 本单未新增 CSS、色板、字面 hex、字体、`--sk-` token 或合成凭据；样式沿用既有投影及 token。没有引入打印灰度/黑白策略。
- 未新增依赖、表/列、schema、产品工具、prompt、Relation/判定域代码；未触碰用户库，未启用真实远程模型调用，未新增安全对抗用例。
- 未做任何 git 写操作。只读 `git status/diff` 用于开工基线和停线变更举证；未运行留 HQ 的 `git diff --check` 或 secrets 扫描。
- 未修改 agent 权限/指令文件。工单保持 ready，追加 Result 明示 stopped/incomplete。
- 操作说明书/current-state 本次未更新；实现尚未验收，恢复完成后再由守门同步已验证能力。
- 需要恢复的工作：在满足现役 pinned Python 执行条件的授权环境重跑完整 server；修正测试运行的 npm/PATH 环境；校准并跑 client 定向/全库；验证共享资源生命周期与真实浏览器打印时机；执行非 git/secrets 25 组件；最后更新 Result。

## 原始日志与停线快照

全部位于 `.codex-tmp/t5-print/`：

- `server-full.stdout.log` / `server-full.stderr.log`：原始全量输出。
- `server-tests-files.txt`、`server-run-metadata.json`、`server-run-result.json`：111 文件清单与命令/时间/预算/结果。
- `python-launch-probe.log`：只读启动探针中的原始权限错误；`python-launch-probe-result.json` 是会话观察收据，不冒充原始日志。
- `stopped-working-tree.patch`：停线时已跟踪源文件的只读 diff。
- `useMediaImageAsset.stopped.ts`、`RichBlocksPrint.stopped.test.tsx`：两个新增源文件的停线副本。
- `stopped-source-sha256.json`：本单 9 个源文件停线内容哈希。
- `impeccable-context.log`：界面技能的本地项目上下文读取；项目内技能脚本路径不存在后，使用已安装技能绝对路径读取。未执行技能更新。

开工使用 CodeGraph 优先路由，但 MCP 无此工具、CLI `codegraph` 不存在；`rg` 也不在 PATH，随后用限定仓内路径的 PowerShell 读取。以上是会话操作记录，不是测试通过证据。
