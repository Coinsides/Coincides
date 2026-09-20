> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Builder receipt
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（本单施工与验证收据）

# C3 Episodes 人面施工回执

现物为 `client/src/pages/AgentMemories/AgentMemories.tsx` 独立 A4b 页：直连 `/settings/agent-memories`、25 条分页、编辑原文、删除行内二次确认。C3 保留该现物并增加 Episodes 页签，未碰 C1/C2 组件。

| 交付 | 代码定位 | 行为 |
|---|---|---|
| 共享 DTO | `shared/types/agentEpisodes.ts:1`、`:8`、`:17` | `EpisodeMessageRange`、`EpisodeAnchorManifest`、`AgentEpisodeRecord`；可选 `conversation_title` 允许原会话无标题 |
| A4b 页签 | `client/src/pages/AgentMemories/AgentMemories.tsx:104` | Memories / Episodes，键盘方向键、Home、End、命名 tabpanel；现物编辑或删除提交中锁切换 |
| 列表读取 | `client/src/pages/AgentMemories/AgentEpisodes.tsx:7` | 选中页签才 GET `/settings/agent-episodes`；取消旧读取、区分加载/失败/空集并可重试 |
| 查询与分页 | `client/src/pages/AgentMemories/AgentEpisodes.tsx:54`、`:66` | 对本人已加载全量 episode 的 summary、episode ID、会话 ID/标题、所有锚 ID 作大小写不敏感过滤；先分会话、会话内 seq 倒序，再按 25 条分页；跨页保留会话标题和 ID |
| 摘要及完整证据 | `client/src/pages/AgentMemories/AgentEpisodes.tsx:128`、`:141` | 摘要保留空白，显示时间范围、首末 message ID、created_at；五类锚 ID 全量渲染，长 ID 换行而不截断；无编辑控件 |
| 删除 | `client/src/pages/AgentMemories/AgentEpisodes.tsx:37`、`:154` | 现役行内 Delete → Confirm delete / Cancel 轻仪式；只 DELETE `/settings/agent-episodes/:id`，请求成功才移除行；失败保留行与确认态供重试 |

删除语义原文：

> Permanently delete this episode summary? Original conversation messages and referenced objects will be kept. The summary may be recreated during later conversation compression.

界面不提供 episode 编辑，也没有消息删除请求。后端按 user_id 隔离及原消息零删的证明归后端定向测试；此处仅申报人面观察与 API 行为。

## 验证

命令：`npm.cmd --prefix client run test:unit -- src/pages/AgentMemories/AgentMemories.test.tsx src/pages/AgentMemories/AgentEpisodes.test.tsx`。

**2 文件、17/17 PASS**：现役 Memories 9 条 + Episodes 新增 8 条。原始日志 `.codex-tmp/c3-episode/client-episodes-targeted.log`，退出码 0；仅现有 React Router future flag 提示。

| 新用例 | 断言 |
|---|---|
| 按需读取、分组与投影 | 切页签前不拉 episode；同会话聚合、seq 倒序、摘要空白、五类全部锚（含长 ID）、首末消息/时间范围、无 Edit |
| 查询全量 | 30 条中首屏以外的旧 episode 按锚 ID 可搜出，大小写无关，空结果可恢复 |
| 分页可达 | 52 条分两会话，三页 52 条全可达，每条所处会话可辨 |
| 删除轻仪式 | 文案明示原消息保留；Cancel 零请求；确认后只删所选 episode |
| 删除失败 | 行与确认态保留，可重试；请求期间切换 tab 禁用 |
| 末页删除 | 26 条最后一页唯一行删后回落有效页；确认中禁用搜索和分页 |
| 列表失败 | 错误不冒充空集，Retry 后恢复 |
| 键盘与空锚 | 方向键和 Home 切 tab 并管理焦点；无标题降级，空锚各类显示 None，无编辑 |

`client/node_modules/.bin/tsc.cmd -b client --pretty false` **PASS，退出码 0**（无诊断输出；原始日志 `.codex-tmp/c3-episode/client-episodes-typecheck.log`）。按 `vercel:react-best-practices` 做组件检查：派生查询/分页直接由 state 计算、异步读取有清理、直接类型导入、无新依赖、列表稳定 ID、锚完整显示，保留现役 CSS token。

未在此子任务运行浏览器视觉验收或全库回归；根 builder 负责汇总与全量验证。全部功能测试为内存合成 DTO/API mock，无模型调用、用户库或 git 写操作。
