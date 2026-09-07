> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 单 1=史记 v0,server 施工单,中单)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(server;账本先于历史——本单是 13.2 一切写动作的前置)

# 13.2 · 单 1 · 史记 v0(events 表 + 书记官助手)

## 〇 · 上游(先读,顺序)

1. 图二 §六(表设计正文):`analysis/2026-09-07-board-data-model-design.md`;
2. 单 0 侦察报告第 3/5 题(编号续位 054 候选、触发器语法实证、挂点候选):`analysis/2026-09-07-v13-2-s0-recon.md`;
3. 段 plan 单 1:`plans/v13-2-wilderness-retirement-plan.md`。

## 一 · 口径(冻结)

1. **迁移新单**(编号开工时按现物复核,单 0 报 054 候选):建 `events` 表,列按图二 §六——`seq INTEGER PRIMARY KEY AUTOINCREMENT, ts, user_id, actor_kind, channel, verb, objects TEXT(JSON数组), summary TEXT, meta TEXT(JSON)`;索引:`(user_id, ts)` 与 `(verb)`;按仓库双轨纪律(单 0 第 3 题所记)同步 schema.sql;
2. **append-only 触发器**:BEFORE UPDATE 与 BEFORE DELETE ON events → `RAISE(ABORT,'events_append_only')`(语法单 0 已实证);
3. **verb v0 枚举**(server 侧 TS 联合类型+运行时校验,⛔ 自由字符串):`migrated | rolled_back | note_created | board_created | mounted | unmounted | purpose_created | purpose_amended | purpose_sealed | proposal_issued | proposal_approved | proposal_rejected | published`;增补走迁移;
4. **书记官助手**:`recordEvent(db, entry)` 纯函数模块(server/src/services/ 或 db/ 同层,按单 0 挂点候选就近)——**与调用方同一事务**(接受已开事务的 db 句柄,自己⛔ 开新事务);`actor_kind`/`channel` 是参数(v0 消费者=迁移/回滚脚本,channel=脚本名;将来路由中间件包装时由中间件填,⛔ 由业务码自报身份的注释写明);objects 数组 `{kind,id}` 形状校验;
5. **零变化面**:⛔ 接任何现有路由/业务(消费者是本段后续单);⛔ Agent 工具面;⛔ client;⛔ 动既有表。

## 二 · 验证(段纪律)

1. server typecheck/build(现有脚本,申报输出摘要);
2. 单测(node:test+tsx 既有基建):①UPDATE/DELETE 被触发器拒绝(报错含 events_append_only);②同事务回滚时事件不落地(动作与记录同生共死);③verb 枚举校验拒绝未知值;④objects 形状校验;
3. 一条功能冒烟:合成事务内"改一行数据+recordEvent"提交后两者同在,回滚后两者同无。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 动 client 与既有业务。现物冲突(如迁移基建形状与图二列型不容)⇒ 停线举证。
