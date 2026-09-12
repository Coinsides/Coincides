> **状态 (Status)**: blocked（实施前口径冲突，待裁定）
> **日期**: 2026-09-11
> **From**: codex builder
> **工单**: `docs/agent-ops/handoffs/2026-09-11-v13-5-b1a-skin-engine-order.md`

# B1a 实施前停线申报

按工单 §三「冲突停线⛔自作主张」暂停实施。本报告只记录源码与裁定的差异，不是工程交付或验收通过。未修改产品代码、测试、配置或 Git 元数据，未运行测试或生成三预设截图。

## 1. 静墨的现役零变基准与附件色值不一致

工单第 12 行要求「静墨预设值=现役色收敛」「默认皮下视觉零变」；第 13 行又要求三预设「值逐字取 spec §二」。附件静墨列与现役默认色不同。

| 现役面 / 语义 | 现役源码值 | spec §二静墨值 | 证据 |
|---|---|---|---|
| 默认纸面 | `#101114` | paper `#17181C` | `client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:17` 默认纸背景；`:183` 注入 `--page-frame-background`；`NoteDetail.module.css:1129` / `:1137` 消费 |
| 标题 / 正文主字 | `#f5f5f5` | ink `#E7E8EB` | `client/src/styles/global.css:111`；`NotePaperHeader.module.css:8` 消费 `--text-primary` |
| Description 弱字 | `#b7b8bd` | ink-muted `#8B909A` | `client/src/styles/global.css:112`；`NotePaperHeader.module.css:33` 消费 `--text-secondary` |
| 激活 / 选中强调 | `#2563eb` | accent `#7FA3D7` | `client/src/styles/global.css:117`；`PageFrameWallLayer.module.css:27` 消费 `--accent-primary` |

纸面不是仅由全局背景推测：`NoteWritingSurfaceLayer.tsx:785` 起读取 page frame background 并调用变量转换；`:3504` / `:3537` / `:3553` 注入纸/表头。带表头时纸层可以透明，但下面覆盖全纸高度的 header band 仍消费同一纸背景。上述路径由主代理与只读子代理分别核实。

因此直接使用附件静墨九值会改变现役默认视觉；保留现役值则不符合工单要求三预设逐字取表的文字。用户本轮特别强调静墨现役收敛、暖纸/工作台逐字取表，但同时要求严格执行整单与附件；本报告不擅自把其中一条宣布作废。需要统一静墨值与默认回归基准的裁定。

## 2. 暖纸衬线标题的验收与 B1a 范围不一致

工单第 25 行冒烟要求「切暖纸→纸变米白衬线题墨绿点缀」。附件 §四第 50 行把标题字归入部件层；工单第 5 / 20 行将部件层开关划给 B1b，用户本轮进一步明确「⛔部件层」。现役标题继承字体（`NotePaperHeader.module.css:22`），九个颜色 token 无法切换衬线字体。

需要明确 B1a 是否只验颜色，并将暖纸衬线标题留给 B1b。未添加字体切换、部件开关或任何 Typography 改动。

## 现场与证据边界

- 分支：`fable/v2-bn12-exoskeleton`；开工未见已跟踪源文件改动。已有未跟踪审计/研究文档及 `.claude/settings.local.json` 原样保留。
- `.codegraph/` 存在；优先尝试 `codegraph explore`，CLI 不在 PATH，可调用工具目录未发现 CodeGraph；`rg` 也不在 PATH，改用 PowerShell 有界文件枚举与 `Select-String` / UTF-8 读取。
- 本次为源码取证，未启动业务后端、未访问真库、未做浏览器像素测量。不把源码色值差异冒充实跑截图。
- 产品实现、三级合并、持久化、挂载请求夹具普查、受影响静态门、E1 DOM 审计和三预设截图均尚未执行；测试数字为 **0 次执行**。
- 只新增本停线报告并在工单追加 `## Blocker`；工单保留 ready，未追加完成态 `## Result`，未 commit。
