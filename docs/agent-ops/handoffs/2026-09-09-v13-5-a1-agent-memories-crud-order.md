> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.5 段 plan 草案波次 A(Henry 09-09 放行非门控先行);红线清偿案(停车场 C 区在案,Henry 已裁 13.5)
> **单号**: 13.5 · A1 · agent_memories 人类 CRUD(红线清偿)

# 13.5 A1 · agent_memories 人类 CRUD

**使命**:清偿现役红线违章——**"Agent 能编辑的,人类必须 100% 都能编辑"**:agent_memories 表 Agent 可写,而人类至今零查/零改/零删入口。补齐人面,⛔ 动 Agent 面。

## 一 · 射程

1. **侦察现物先行**:agent 记忆的表结构/manager(`server/src/agent/memory/manager.ts` 起)/现有路由;申报现状再动工;
2. **Server**:人类 CRUD 路由(列表/单条编辑/删除;创建不做——人类造"Agent 的记忆"语义存疑,留候裁),走既有 auth 中间件与校验风格;删除=真删(记忆非用户内容资产,⛔软删体系新建);
3. **Client**:Settings 页新增 "Agent memories" 区——列表(内容+时间戳+来源会话若有)、行内编辑保存、删除带确认、空态文案;形制沿 Settings 现有款式,⛔新设计语言;
4. **⛔ 禁区**:Agent 写路径/读路径零改动(Agent 面照旧);⛔ 新 event verb;⛔ 记忆内容的语义加工(原文显示);⛔ Agent 面 UI。

## 二 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Settings+agent 面既有测试)不破;
- 冒烟五条:①合成记忆若干→Settings 列表正确显示(内容/时间戳);②行内编辑→保存→重开页面持久;③删除带确认→行消失→**Agent 读侧不再返回该条**(读路径本身零改动,只验数据面);④Agent 写路径回归不破(既有 agent 测试整跑);⑤空态(零记忆)显示正常。

## 三 · Result 格式

`## Result`:现物侦察申报 + numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触(全走内存/合成);⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
