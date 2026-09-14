> **状态 (Status)**: active
> **层 (Layer)**: 施工证据 / Builder evidence
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否，供 HQ 复核

# 提案收件箱真实浏览器冒烟

真实 Chrome 已连接，无浏览器不可用欠项。新建隔离标签页访问 `http://127.0.0.1:5189/`，未操作原有用户应用标签页。

夹具仅在 `.codex-tmp/proposal-inbox/smoke/`：真实 AgentPanel、agentStore、Toast 与 CSS；后端为内存 SQLite、真实 agent/proposals 路由、真实 orchestrator/create_proposal 执行器。Express 使用测试用户的认证后夹具，OpenAI provider 在进程内替换为固定工具调用，不连接模型服务。provider 目录为 OS 临时空目录，Vite 使用空 envDir，无真实凭据、用户库或新依赖。

| 步骤 | 观察结果 |
|---|---|
| 初次打开 | 待处理为零，头部无提案入口；聊天输入可用 |
| 发送“请为函数极限创建一张复习卡提案。” | 真实消息路由发 SSE，真实 create_proposal 注册 batch_cards；头部出现“提案，1 条待处理” |
| 点击提案 | 列表显示“极限复习卡”、卡片类型、来源“聊天”、本地时间、摘要及一张卡的计数 |
| 1920×911 截图检查 | 面板内排版正常，无新增路由或外部页面 |
| 320×640 截图检查 | 标题可收缩，摘要换行，采纳/丢弃、关闭与输入均可见，无横向溢出 |
| 点击“采纳” | 真实 POST apply 返回；toast“提案已采纳”；计数变零，列表显示“暂无待处理提案” |
| 内存库核对 | proposal.status=applied；cards 有“函数极限”，正文为“函数在输入趋近某点时所趋近的值。” |
| 点头部提案关闭零态列表 | 入口消失，真实浏览器 AX 焦点恢复聊天输入框 |

冒烟后恢复浏览器 viewport、关闭本轮测试标签页并结束本轮临时服务器。截图在工具交互中直接检查，本文只保存归纳证据，不复制原始日志或构建产物。

界限：本次验证真实 UI/SSE/人门及数据库落地，不包含真实模型输出质量、真实账号登录与用户主库体验；后两者未触碰。organized_note 与 batch_cards 双夹具往返另由既有已接门 `v14ProposalUnification.test.ts` 的新增正常用例覆盖。
