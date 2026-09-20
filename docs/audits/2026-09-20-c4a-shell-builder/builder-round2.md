# C4a 二轮 builder 交付证据

2026-09-20 · Codex builder · 按工单「补遗一」恢复施工。**施工已完成；非 git/secrets 验证门 22/23 通过，原标准服务端构建及四条 server 环境失败记录尚未解除，不能视为全绿或 HQ 放行。** 工作树交 HQ，无 git 写操作、无 commit。

一轮停线与考古保持原样：[builder.md](builder.md)。二轮详件：[工具条](toolbar.md)、[UI 动词](ui-verbs.md)、[全量验证](verification.md)。原始日志全部保存在 `.codex-tmp/c4a-shell/`；初次失败、修正与复跑分开留档。

## 交付范围与逐件入口

以下路径相对仓库根；行号为二轮交付时源码行号。

| 义务 | 源码入口与结果 |
|---|---|
| 四群与旧钮 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:2037`；纸、笔、插入、看四群。19 个现役按钮含条件项全部留入口，四项原平铺插入收编 |
| 窄屏与键盘 | `client/src/pages/Notes/canvasEngine/layers/NoteToolbarGroup.tsx:4`、`client/src/pages/Notes/NoteDetail.module.css:1168`；≤1100px 折叠看，≤760px 再折叠纸；笔、插入常驻，Tab/Enter/Escape 可用 |
| 七项双入口 | `client/src/pages/Notes/noteSlashCommands.ts:36`、`client/src/pages/Notes/canvasEngine/NoteInsertCommandsContext.tsx:12`、`client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:476`；共同词表与同一执行 host，菜单/斜杠打开原编辑器并使用原保存路径 |
| 标签存法 | `client/src/stores/documentTabsStore.ts:7`；仅 Zustand 内存，每个身份保存标题、所属 Project、纸滚动位/阅读档位/步进或板视口，无持久化中间件 |
| 标签行为 | `client/src/components/Layout/DocumentTabs.tsx:8`；去重开页、点击切换、×/中键/Delete 关闭、拖拽/Alt+箭头排序、箭头切换；活动标签仅在离页屏障完成后移除 |
| 壳接入 | `client/src/components/Layout/AppLayout.tsx:43`、`:245`；文档区顶部标签与 UI bridge，主滚动容器保留；退出应用壳清空内存会话，刷新以当前 URL 重建 |
| 纸视口 | `client/src/pages/Notes/canvasEngine/hooks/useNoteDocumentShell.ts:8`、`usePageReadingViewportController.ts:19`；主纸页登记身份，恢复滚动、阅读档位与步进；离页沿既有 `useNoteRouteSaveBoundary.tsx` 的 blur/flush 屏障 |
| 板视口与保存 | `client/src/pages/Boards/BoardPage.tsx:247`、`:306`、`:1107`；本会话相机恢复，人操作保留原保存路径；新 `DocumentLeaveBoundary.tsx:4` 等待板中笔记模态关闭保存、viewport 提交与既有 board.flush，失败留页 |
| 徽章与通知落点 | `client/src/components/Layout/DocumentTabs.tsx:36`、`client/src/stores/agentStore.ts:213`；现役 tool_start/tool_end 的 call_id 活动投影，允许并行目标分别亮灭；天青徽章与空通知插槽，无新活动表 |
| SSE 接收与会话 | `client/src/stores/agentStore.ts:135`、`:219`、`client/src/stores/agentUiStore.ts:13`；接收即时 ui_command；每个 call_id 独立清灯，done/error/网络终止清灯；退出壳递增会话 epoch，使旧流不能重填 UI 状态；历史消息不重放命令 |
| 人持有输入优先 | `client/src/components/Layout/AgentUiBridge.tsx:6`、`client/src/stores/agentUiStore.ts:22`；编辑框、contenteditable、对话框、IME 组合或指针操作时延后，仅保留最新一条；blur/compositionend/pointerup 后 150ms 重评，不调用编辑器 focus |
| 聚焦呈现 | `useNoteDocumentShell.ts:52`、`NoteWritingSurfaceLayer.tsx:544`、`BoardPage.tsx:256`；块/页复用现役投影、展开目标章节、退出 Overview 后滚动并短亮约 2.2s；板成员改会话相机和独立短亮，不调用板 viewport 保存门 |
| 两动词与分类 | `server/src/toolFace/uiActions.ts:24`、`server/src/agent/tools/effectClassification.ts:7`；独立 AGENT_UI_TOOLS 投影到 channel_write，原 door/read 集不变，完整性闸零漏；详见 UI 动词审计 |
| 场景与说明书 | `server/scripts/agent-eval/scenarios/13-ui-shell-journey.ts`；说明书 `docs/agent-ops/current-state/app-operating-manual.md:22`、`:24`、`:130`，已升 v2 并完成指纹义务 |

表中未写完整路径的 hooks/layers 文件均相对 `client/src/pages/Notes/canvasEngine/`；BoardPage 相对 `client/src/pages/Boards/`。

## 标签语义与零真相写申报

标签身份为 `note:<id>` / `board:<id>`，打开同一对象只更新标题，不重复新建。关闭最后一张纸回所属 Project，最后一块板回 Boards；有相邻标签时切到相邻文档。关闭只清在场内存，不请求删除。纸沿原 blur 即存、离页等待机制；板保留原显式 Save 与自动视口提交语义，等待已提交写入完成，不增加未保存标记或独立草稿真相。板中纸模态也先通过原 requestClose 保存屏障。

`ui_focus_object` 不改变正文、placement、选择集、板成员或板持久视口。人后续主动平移/缩放仍走现役保存路径。纸聚焦对折叠章节与 Overview 的处理属于原呈现状态。文档标签与 Agent 活动不使用 localStorage/sessionStorage、持久化表或 API；刷新不复原整组标签，不重放旧命令。通知消费者、跨窗口同步和 Tauri 撕窗未做。

## 补遗约束的落实

既有 **15 项斜杠对象文本完全相同**（统一换行后 SHA-256 均为 `be61a50a6962c93acf1c766e681e525d3efb7bded627e393900eb3fdee06ffce`），`NoteChromeLayer.tsx` 整文件与施工前字节一致。新七项为「表格 / 时间线 / 柱图 / 折线图 / 媒体图 / 引文框 / 提示框」。Source Quote 仍是原 writingRole 转换；引文框、提示框只进入 B3 placement 外观编辑。保全脚本与结果为 `toolbar-preservation.mjs` / `.json`。

UI 动词属向人发出的呈现动作，因此归 channel_write，不增加第四类、不加入 AGENT_ACTION_TOOLS。注册总数 35→37、provider definitions 41→43、channel_write 2→4；door_write/read 集合不变，公开 MCP 仍 14 项。每个用户轮次最多实际下发 8 条，同动词同目标 1000ms 防抖。成功表示 issued，不声称已显示；工具调用/结果成对落史后才下发 UI 事件，既有收据照记。

指纹显式 `--update` 后普通 check 通过：`85acce270a2224893e4c011ce4e46e1625f01d5ceba81f7f393cca7aa2a78b15`，说明书戳 **v2 / 2026-09-20**。说明书已更新四群、七项双入口、旧表格/时间线/图表的菜单路径、标签存法及两 UI 动词 §五；相关两份 INDEX 经现役生成器更新。

## 截图

同一合成 props、真实 Surface + Chrome 组件，before 使用施工前源码副本，after 使用当前源码；没有访问用户库。此证据用于分区与窄屏呈现，不冒充真实用户端到端验收。

| 前后/场景 | 证据 |
|---|---|
| 1920px 分区前 | [before](screenshots/toolbar-before-wide.png) |
| 1920px 分区后 | [after](screenshots/toolbar-after-wide.png) |
| 七项插入 | [insert](screenshots/toolbar-after-insert-menu.png) |
| 430px 分区与折叠 | [narrow](screenshots/toolbar-after-narrow.png) |
| 窄屏插入 / 纸状态菜单 | [insert](screenshots/toolbar-after-narrow-insert-menu.png) / [paper](screenshots/toolbar-after-narrow-paper-menu.png) |

临时浏览器 tab 与 Vite 5194 服务均已关闭。浏览器工具栏 Escape 收起与归焦已实测。

## 验证结果（重叠套件不相加）

| 项目 | 实际结果 |
|---|---|
| 原 runtime 非 git/secrets 组件 | **22/23 PASS**，只剩原标准 server build 环境阻塞；git 检查与 secrets 两组件按工单留 HQ |
| client 全库最终复跑 | **227/227 files，2318/2318 tests PASS**；原标准 client build PASS |
| 最后新增板保存等待用例 | 两文件 **8/8 PASS**（DocumentTabs 5 + BoardPage.documentShell 3），位于全库复跑之后；不虚构为 2319 全库同次通过。最终 client TypeScript noEmit 也 exit 0 |
| 工具条/斜杠/B3等定向 | **8 files / 180 tests PASS** |
| 标签、纸离页屏障、板模态定向 | **4 files / 25 tests PASS**；后来板文件新增的第3例见上行 |
| 原 board bookmark/selection 回归 | **11/11 PASS**；初轮共享会话态泄漏通过测试 teardown 仿真 AppLayout 卸载修复，未改原断言 |
| 客户端真实分片 SSE | **5/5 PASS**，覆盖 call_id 并行亮灭、命令、收据、done/网络失败及历史不重放 |
| UI/contextHint/claimReceipt/knowledge 定向 | **76/76 PASS** |
| 全部 13 scripted 场景 | **122/122 PASS**，含新增第13场景 **8/8**；harness **14/14** 与 agent-eval typecheck PASS |
| server 全量文件并集 | **108/108 文件已调度**（wilderness 1 + 补集107）；去重 TAP 记录 **1079 PASS / 4 环境 FAIL，合计1083**，不是一次全绿运行；MineruWiring 的1条是模块加载失败记录，内部用例未执行 |
| v13WildernessExecute | **27/27 PASS**、96s，文件预算 **600000ms**；全补集同预算，零文件排除 |
| 标准 shared/server 构建 | **未通过**：shared/dist 新输出 EPERM，server 随后 TS6305；原命令结果未改写 |
| 替代严格源码编译 | 授权临时目录 shared/server noEmit 与实际 emit PASS，436 JS + 436 declarations；这是补充证据，不替代原标准 build |

全量数字与十二砖（A1–A5、B1/B2/B3/B5、C1–C3）逐件覆盖见 [verification.md](verification.md)。第13场景断言表见 [ui-verbs.md](ui-verbs.md)：四种合法目标、6次调用、4条 UI command、5成功1失败收据、调用/结果先落史、即时/历史对账、全体非聊天表逐行不变、零域收据。

主要原始入口：

- `verify-runtime-targeted-final/`、`verify-runtime-initial/`：23组件首轮及失败义务复跑。
- `verify-runtime-targeted-documentation-final/`：二轮回执与说明书最后路径修订后，知识指纹与 docs:check 再验均 exit 0。
- `verify-server-initial/`、`verify-server-targeted-envfix/`、`verify-server-targeted-contextfix/`、`verify-wilderness-initial/`：全文件清单、600000ms 命令、TAP与隔离记录。
- `verify-client-targeted-board-save-final/01-client-targeted.log`、`client-final-typecheck.log`：最后的保存屏障增量与类型检查。
- `document-shell-targeted-3.log`、`document-shell-regression-isolation.log`、`toolbar-targeted-final.log`：壳与工具条定向。
- `ui-verbs-final-integration-3.log`、`ui-verbs-eval-13-result.json`、`ui-verbs-client-sse-final.log`：动词、收据、全表快照与客户端流。

## 尚未解除的验证与未做项

四条 server 环境失败记录：`v2McpArtifact` 2例卡原标准 build 的 TS6305；`v2SourceMineruWiring` 找不到 `python.exe`；`v2SourceRegionCells` 的既有固定 venv 指向不能启动的 uv CPython。直接解释器 `--version` 也被拒绝访问。没有改权限、换解释器伪造成功、改用例跳过或缩小补集。HQ 需在可写 shared 构建输出、可用原 Python 链的环境补跑，原门未全绿前不标放行。

没有 git 写、commit/push/PR/merge；没有碰用户库/真实模型、新依赖/真相表/TextFlow schema/坐标契约、Relation/判断域、笔记 Agent 写权、既有动词语义、Home/悬浮窗/队列/托盘/C4b、agent 操作指令或权限配置。未增加设计安全对抗类用例。通知徽标只留插槽，主观验收和 git/secrets 两组件留 HQ。本轮未发现新的工单语义冲突；尚存问题按实际环境失败申报。
