> **From**: fable
> **To**: codex
> **Status**: done(13.2 单 1 builder 完工;工作树交 HQ 待复核,不代表放行)
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

## Result

2026-09-07 · Codex builder · 本单工程交付完成，未 commit，工作树交 HQ 复核。本回执通过 `apply_patch` 以 UTF-8 写入；不代 HQ 放行或验收后续单。

### 实现与现物对表

- 已按 §〇 顺读图二 §六 → 单 0 第 3/5 题 → `handoffs/plans/v13-2-wilderness-retirement-plan.md`（含修订一），并核对仓库入口、现状与 active ADR。遵守段 plan 单 builder 纪律，未并行派施工单。`.codegraph/` 存在，但当前没有可调用的 CodeGraph MCP、shell 的 `codegraph` 也不可用；尝试后改用受限源码读取，未重新索引。
- 迁移目录现场最高编号仍为 053；新增 `054_v13_events_ledger.ts`。`events` 九列齐备，`seq` 为 INTEGER PRIMARY KEY AUTOINCREMENT；`ts` 为 SQLite 生成的 UTC ISO 毫秒 TEXT；其余字段为 NOT NULL TEXT，objects 必须是 JSON 数组，meta 必须是 JSON（默认 `{}`）。两个索引分别为 `(user_id, ts)`、`(verb)`。十三个 verb 同时受 SQL CHECK、TS 联合类型与运行时校验约束，新增词需新迁移。
- **双轨细节**：`init.ts:36–42` 会按分号拆 base schema，不能直接在其中放含内部分号的触发器。按单 0 §三的“fresh 初始化完成后与 legacy 升级完成后等价”口径，表/索引在 schema.sql 与 054 同步，两个触发器统一由 054 安装；base schema 单独执行尚不具备 append-only 触发器。未修改初始化器或迁移 runner。真实 `initDb(':memory:')` 的 schema→全量迁移路径已实跑通过，未出现须停线的基建/列型冲突。
- `events_no_update` / `events_no_delete` 分别为 BEFORE UPDATE / BEFORE DELETE，均执行 `RAISE(ABORT, 'events_append_only')`。user_id 与 objects 中的身份作为历史引用留存，不加 FK，避免 CASCADE / SET NULL 改删历史或被触发器反向阻塞；未改任何既有表的定义与生命周期策略。
- `db/recordEvent.ts` 接受调用方已开事务的连接，事务外报 `events_transaction_required`；自身不取全局 DB、不开事务、不提交、不吞异常。返回的 seq 在调用方提交前只是暂定值。objects 严格校验 `{kind,id}` 非空白字符串对，summary 原样保存，meta 按 JSON 校验与序列化。
- actor_kind/channel 为受控脚本参数，注释明确 v0 channel=脚本名；将来路由包装必须由中间件按认证态与实际入口填写，禁止业务码/请求自报身份。此助手不承担认证，也未接入任何现有路由、业务或 Agent 工具面。
- **既有机关对照**：operation_batches / toolFaceReceipts 是可变的操作与执行收据，不能充当本单 append-only 史记；因此仅增加独立账本与插入助手，继续复用既有 SQLite 连接、调用方事务和迁移 runner，没有第二套事务/连接/恢复机关。

### 实跑验证

环境：Node `v22.22.1` / better-sqlite3 `11.10.0` / SQLite `3.49.2`；数据库验证全部使用 `:memory:` 合成库。

| 命令（除 diff 外 cwd=server） | 结果 |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0，无诊断 |
| `npm.cmd run build` | exit 0；现有 manifest check → tsc → manifest copy 全部完成；manifest 为 14 条 public，输出过 recursive-reference/default-to-any 提示，未阻断检查 |
| `node --import tsx --test src/__tests__/v13EventsLedger.test.ts` | exit 0；tests=7 / pass=7 / fail=0 / skipped=0，约 649 ms（非零测试实跑） |
| `git diff --check` | exit 0，无 whitespace 错误；Git 提示 LF/CRLF 转换及用户级 ignore 文件不可读 |

首次 `npm run build` 被 PowerShell 的 npm.ps1 执行策略拒绝，未进入 build；随后用同一 npm 的 `npm.cmd` 入口成功运行，没有修改执行策略。

七项测试覆盖：①实际 fresh 启动全部 54 个迁移，与合成 pre-054 库实际执行 001–053 后经 runner 仅补 054 的终态一致（table/index/trigger SQL、列型、无 FK、索引列序）；runner 重跑=0，直接重跑 054 保持既有事件；升级保留既有 schema 与哨兵行；②seq/ts 自动生成、summary 原文、objects 顺序、meta 往返与默认值；③UPDATE/DELETE 的错误 code=`SQLITE_CONSTRAINT_TRIGGER` 且 message=`events_append_only`，异常传播后动作也回滚；④事务外拒写、手动 BEGIN IMMEDIATE 内写后仍在原事务、ROLLBACK 后零事件；⑤十三 verb 全接受，五个非枚举输入在 helper 与 SQL 层均拒绝；⑥十四种错误 objects 形状均拒绝，动作和事件都不落地；⑦合成 UPDATE 与事件提交/回滚冒烟。

```text
S1_EVENTS_SMOKE_PASS commit_action=1 commit_event=1
rollback_action_absent=1 rollback_event_absent=1 db=:memory:
```

冒烟先将合成行从 before 更新到 committed 并留下 1 条事件，再尝试第二次更新和写入事件后主动抛错；最终状态与事件完整行均等于第一次提交后的快照，第二次更新和第二条事件同时不存在。

### Numstat 与交付范围

已跟踪文件用 `git diff --numstat`；三个新增源码文件用 `git diff --no-index --numstat -- NUL <path>` 统计，未为计数执行 git add。

| 新增 | 删除 | 文件 |
|---:|---:|---|
| 41 | 0 | `server/src/db/migrations/054_v13_events_ledger.ts` |
| 25 | 0 | `server/src/db/schema.sql` |
| 83 | 0 | `server/src/db/recordEvent.ts` |
| 220 | 0 | `server/src/__tests__/v13EventsLedger.test.ts` |
| 58 | 1 | 本施工单（状态头更新与 Result 追加） |

代码合计 **+369 / -0**，含回执合计 **+427 / -1**。新测试以表中命令独立可跑；未改 package.json 或接线任何主验证门，接线归 HQ 复核后处理。

### 未做与交接

- 未接既有路由/业务、client、Agent 工具面；未实现单 2–5、真实迁移/回滚执行器或向启动迁移塞业务事件；没有打开/查询/改动用户库。
- 未读 `.env`，未输出任何 key；未改依赖、权限/agent 指令配置；未 git add / commit / push / PR / merge。
- 按本单 §二及段 plan 的定向验证纪律，本轮未跑全仓 `npm run verify:v2-bn8-runtime`、server 全套 test:v2、client 构建或浏览器/主观验收；**不申报全仓 runtime gate PASS，也不代为豁免其版本放行门**。本单只交以上实际执行的验证证据。
- 开工已有 `server/src/routes/projections.ts` 工作树状态，以及 `.claude/settings.local.json`、现场走查表和会议记录等未跟踪材料，均非本单产物，未纳入修改或 numstat。build 生成 server/dist 产物；源交付物为上表四件及本回执，留在当前 `fable/v2-bn12-exoskeleton` 工作树供 HQ 收取。
