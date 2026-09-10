> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: Henry 09-10 走查反馈(A线通过;B线三provider迁移成功;C线两缺口);V14.5 Agent-first Home=完全体⛔本单,本单只补最小门
> **单号**: 13.5 · A4 · Home 的 Agent 对话入口 + Agent memories 独立页

# 13.5 A4 · Agent 入口 + 记忆独立页

## 一 · A4a:Home 的 Agent 对话入口

**背景**:AgentPanel 现物存在(client/src/components/AgentPanel,App.tsx 挂载,useUIStore.setAgentPanelOpen 开关)但**无明确 UI 入口**——V2 时代至今的疏漏,Henry 点名补在 homepage。

- Home(DailyBrief)页加一个显眼入口(按钮/卡片,形制沿 Home 现有款式)→ 点击打开既有 AgentPanel;
- **⛔ 改 AgentPanel 本体**;⛔ V14.5 家族(任务队列栏/通知徽标/焦点规则/悬浮窗重设计)——只做门,不做厅;
- 入口文案/图标 builder 裁量申报。

## 二 · A4b:Agent memories 从 Settings 区升独立页

**背景(Henry 原话)**:记忆会越来越多,Settings 内嵌列表装不下;应是"能展开的独立页面"。

- Settings 的 Agent memories 区改为**摘要形态**:计数 + 最近数条预览 + "View all" 入口;
- 新增**独立路由页**(HashRouter 下如 `#/agent-memories`)承载全量列表:分页或增量加载(builder 裁量申报),行内编辑/删除/确认/空态全部沿 A1 现物;
- 大量记忆下可用性:合成 200+ 条验证滚动/加载不卡;
- ⛔ 新语义功能(搜索/按 category 过滤=候裁项,便宜顺手则做、申报即可,⛔为此扩架构);⛔ 动 Agent 读写路径(A1 铁律沿用)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①Home 显示 Agent 入口,点击打开 AgentPanel(与既有开启机制等效,合成会话可发一条消息);②Settings 摘要形态正确(计数/预览/View all);③独立页全量列表+分页/增量,编辑/删除/确认回归(A1 冒烟等价沿用);④200+ 合成记忆下独立页可用;⑤两处空态正常。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触(全走内存合成);⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
