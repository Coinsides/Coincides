# C4a builder：考古停线回执

2026-09-20 · from: codex(builder) · **STOPPED / 未施工、未验收**

工单：[2026-09-20-v14-c4a-shell-mechanical-order.md](../../agent-ops/handoffs/2026-09-20-v14-c4a-shell-mechanical-order.md)。按用户及工单的「冲突停线举证」要求停止；本件只记录现物和阻断，不是设计变更或放行。

## 1. 阻断：七项插入与斜杠零变不能同时满足

工单 §一.1 要求表格、时间线、柱图、折线图、媒体图、引文块样式、提示框样式全部入菜单，文案与斜杠同词，并且「斜杠命令零变」；§四.1 要求「插入菜单全项与斜杠等价」。现役斜杠没有这七项的等价命令。

证据链：

1. `client/src/pages/Notes/noteSlashCommands.ts:37` 是完整静态注册表，共 **15** 项：Text / Heading / Heading 2 / Heading 3 / Body text / Bullet List / Numbered List / Todo List / Toggle List / Source Quote / Definition / Formula / Inline Formula / Code / Divider。
2. 同文件 `:195` 的 `filterSlashCommands` 只过滤静态表；`canvasEngine/hooks/useSlashCommandController.ts:210` 只为过滤结果补禁用原因，不动态添加命令。
3. 已枚举 `client/src` 全部 **649 个 .ts/.tsx 文件**，对 `NOTE_SLASH_COMMANDS`、`filterSlashCommands`、`slashCommands =` 做引用普查；搜索范围、全部命中、静态表全文、相关源码片段与 SHA-256 留在原始证据，不以单个关键词零命中代替完整表核对。

| 工单要求项 | 现役入口 | 等价斜杠命令 |
|---|---|---|
| 表格 | `NoteWritingSurfaceLayer.tsx:1954` → TableBlockEditor | 无 |
| 时间线 | 同文件 `:1957` → ComponentBlockEditor | 无 |
| 柱图 | 同文件 `:1958` → ComponentBlockEditor | 无 |
| 折线图 | 同文件 `:1959` → ComponentBlockEditor | 无 |
| 媒体图 | TextBlockProjection `:1481` / PaginatedTextBlockProjection `:568` 的粘贴图片入口 → mediaBlockPasteService `:67` | 无 |
| 引文块样式 | ParagraphFurnitureEditor `:11`、`:40`，BlockEditorLayer `:539` 挂载 | 无；Source Quote 不等价 |
| 提示框样式 | 同一段落样式编辑器 `:44` | 无 |

上表除首条完整路径外，组件与服务相对 `client/src/pages/Notes/canvasEngine/`，投影和样式编辑器在 `blocks/`，Layer 在 `layers/`。

**Source Quote 的区别是数据语义，不是译名。** `noteSlashCommands.ts:116` 注册的是 `convert_block / writing_role / writingRole:'quote'`，经 `useSlashCommandController.ts:468` 修改 TextFlow writing role 并保存正文。B3 的 `paragraphFurniture.ts:7`、`:20`、`:30` 使用 placement `display_overrides_json.paragraph_furniture_v1`，只写 `{variant:'quote',source}` 或 `{variant:'callout',label}`，保留正文。拿前者替代后者会违反「各钮现役行为零变」。

因此差集是 **7/7**。新增或改写斜杠违反「零变」；保持原斜杠无法满足「全项等价」。Builder 不自行放宽验收，也不把 Source Quote 冒充 B3 样式。继续前需工单补遗明确：是否允许补齐这七项斜杠，或修改「全项等价」要求。本轮不代选。

## 2. 停线前已完成的现物考古

### 底部工具条全钮

`NoteCanvasRuntime.tsx:45` 把 NoteChromeLayer 作为 `noteTools` 传入 NoteWritingSurfaceLayer；后者 `:1951` 仅在 page surface 渲染底栏。

| 现役按钮 | 文件与行号 | 行为 / 条件 |
|---|---|---|
| Preview | NoteChromeLayer `:413` | 切导出预览，保留 tooltip 与 pressed |
| Layout | NoteChromeLayer `:422` | click 切态；hover/focus 延时开面板；只读禁用 |
| 外观 | NoteChromeLayer `:436` | 切外观浮卡；pointerdown 防失焦 |
| 装订 | NoteChromeLayer `:450` | 有保存 handler 才显示；只读禁用 |
| More note actions | NoteChromeLayer `:453` | 切 More 面板 |
| 重试装订 | NoteChromeLayer `:409` | 仅 bindingError 时显示 |
| Table / Timeline / Bar chart / Line chart | NoteWritingSurfaceLayer `:1954` | 4 钮，各开现役编辑器；有 handler 且非只读；Overview/Layout 禁用 |
| Selection / Pen / Eraser | NoteWritingSurfaceLayer `:1963` | 3 个 icon 钮；受 paperInkEnabled 控制；重复点选回 Selection |
| View options | NoteWritingSurfaceLayer `:1971` | Fit width / Fit page / 100% physical；可用时折叠页缝；Overview 禁用 |
| 问 Agent | NoteWritingSurfaceLayer `:1983` | 仅 note Agent 路由且选块；mousedown 防失焦 |
| Navigation pane | NoteWritingSurfaceLayer `:1985` | 切导航窗格；有 handler；Overview 禁用 |
| Overview | NoteWritingSurfaceLayer `:1989` | 有 handler；保留 pressed |
| 阅读 − / + | NoteWritingSurfaceLayer `:1993`、`:1996` | 2 钮；Overview 或步进到 0.5 / 2 边界禁用 |

共 **19 个按钮位置（含条件按钮）**，另有 Source locked 文字、百分比 output，不计为按钮。More 和问 Agent 都是现役，后续重排不能遗漏。

NoteChrome 下属面板还承载页叠管理（`:297`、`:475`）、Favorites / Delete note / Deleted blocks / Typography（`:559`）、恢复块（`:723`）、导出选项（`:744`）、删除确认（`:787`）。未改其 handler。样式入口为 `NoteDetail.module.css:971`、`:1122`、`:1143`，菜单键盘行为可参考 `layers/ViewOptionsMenu.tsx:73`。

### B3 去盒先例

已读 [B3 工单](../../agent-ops/handoffs/2026-09-20-v14-b3-furniture-skin-order.md) 的完成状态、§一与§三：一层容器皮；条目用行；分组靠间距和发丝线；hover 极淡底；危险项靠颜色；纯 CSS/结构微调、零行为变。本次没有进行视觉改动或重开设计。

### contextHint、分类与收据

| 链路 | 现物 |
|---|---|
| 正向 contextHint | `shared/types/agentContextHint.ts:29` → `client/src/stores/uiStore.ts:45` → `agentStore.ts:168` → `server/src/validators/agentContextHint.ts:30` → `routes/agent.ts:158` → `agent/orchestrator.ts:131` |
| 注册与 provider 投影 | `server/src/toolFace/registry.ts:815` 的 AGENT_ACTION_TOOLS；`:1119` 总表；`server/src/agent/tools/definitions.ts:11` 投影 |
| 三封闭集 | `server/src/agent/tools/effectClassification.ts:5` 把全部 action 归 door_write；`:6` 的 channel_write 只有 save_memory/create_proposal；`:17` 三类为 door_write/channel_write/read；`:27` 检查漏项、陈旧、交叠、重复 |
| 执行与落史 | `server/src/agent/tools/executor.ts:33` → `orchestrator.ts:293` → `:343` 调用/结果事务落史 → `:354` 发工具结束事件 → `routes/agent.ts:175` SSE |
| 收据条 | `orchestrator.ts:161` 读已提交的轮次证据 → `turnReceipt.ts:37` 投影，`:54` 分流 read，`:56` 两写类入收据 → `routes/agent.ts:179` → `client/src/stores/agentStore.ts:239` |
| 历史收据 | `server/src/routes/agent.ts:45`、`server/src/agent/turnReceipt.ts:79` 读时派生 |

分类结论只作为下次施工的考古建议，**未注册**：不能把 UI 两动词同时加入 AGENT_ACTION_TOOLS 与 channel 集，那会被自动归 door_write 并产生交叠。可独立注册 UI 组，仅含本单两动词，按新工单明确许可归 channel_write，既有动作集、三类别及完整性闸保留。旧 [09-14 工单](../../agent-ops/handoffs/2026-09-14-v14-claim-receipt-order.md) `:62` 以可观察的持久效果描述 channel；会话 UI 呈现应申报为本单的窄范围扩展，不能声称旧定义天然已涵盖。分类方面未发现必须停线的不可解冲突。

反向 UI command 协议尚不存在。[宪法细则](../../agent-ops/design/agent-constitution-bylaws.md) `:59` 允许幂等只读导航（聚焦/滚动/高亮），不允许预填或预武装确认流；本次未扩通道。

## 3. 实际改动、验证和未做项

- 产品源码改动 **0**；只新增本回执、原始证据采集件，并在工单末尾追加停线 Result。保留工单 ready 原头，不标 done。
- 原始执行转录：`.codex-tmp/c4a-shell/exec.log`（由执行环境记录，未覆盖）；独立可复核原始证据：`.codex-tmp/c4a-shell/stop-evidence.log`；复现采集脚本：同目录 `capture-stop-evidence.mjs`。脚本只读源码并输出该日志，不是测试。
- 工具限制：根 `.codegraph/` 存在，先尝试 `codegraph explore`，CLI 不在 PATH；未发现可调用 CodeGraph MCP。`rg` 亦不在 PATH，回落 PowerShell 与 Node 有界枚举；首次读文档编码不正确，随后已按 UTF-8 重读。
- 功能测试执行 **0**；非 git/secrets runtime 门组件执行 **0/23**。client 全库、server 全量、agent 族、十二砖、v13WildernessExecute 均未执行；没有宣称通过。工单指定的 wilderness 文件预算 ≥600s 仍是后续义务，未缩减或排除。git 检查与 secrets 仍留 HQ。
- 分区前后截图、七项菜单、窄屏折叠、标签生命周期与视口、blur 保存、Agent 徽章、通知槽、两动词与频控/焦点守则、scripted 场景、知识指纹 `--update`、说明书更新均 **未实施**，原因统一为本节阻断。标签尚未建，不存在任何标签持久化表或存储。
- 未改 Home、悬浮窗、任务队列、托盘、Staging/Recent/Favorites；未动域写门、Relation、TextFlow schema、坐标契约、依赖或用户库；未调用真实模型；未造合成凭据或新 token。
- 只执行只读 git 状态/差异查询；**无 git 写、无 commit**。工作树留 HQ，状态为停线，非完工交付。
