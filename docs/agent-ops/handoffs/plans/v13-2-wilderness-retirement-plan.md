> **状态 (Status)**: active(13.2 段 plan;开工闸=13.1 单 3 收货;迁移执行段另候走查①「允许溢出」批与 Henry 扳机)
> **层 (Layer)**: 计划
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 是(13.2 拆单与验收依据);设计上游=图三(`analysis/2026-09-07-wilderness-migration-mapping.md`)+ 图二 §六/§八(史记 v0 前置)
> **组织**: 两层制;单 builder 姑息模式(⛔ 并行派单);codex 交工作树,HQ 验实质代账

# V13.2 · 野地退役 + 迁移 —— 段 plan

**段使命**:canvas_workspace 语义退役;托盘落地;存量零丢失迁移(影子跑→Henry 扳机→执行→复测哈希);**史记 v0 随段出生,迁移是钢上第一批车辙**。
**段纪律**:每单 typecheck/build+一条冒烟;段收口定向核查;⛔ 马拉松;⛔ 安全类测试;⛔ 删列删值(退役=新写禁令);真实数据迁移唯一人控点=Henry 扳机。

## 单 0 · K-0 侦察(只读)

按图三 §五 五问:①035 cutover 后双真相读写链现状(readStoredLayout/NOTE_LAYOUT_KEY 是否仍在读路径);②Henry 库存量普查 census SQL 草案(⛔ 实跑用户库,SQL 交 HQ 由 Henry 侧执行或扳机日跑);③`surface`/`boundary_role`/`canvas_workspace` 字面量登记面全仓 grep 归类;④托盘 UI 与 13.1 视口的拼接点选项;⑤迁移编号续位+备份表命名。产出侦察报告,HQ 冻结后续口径。

## 单 1 · 史记 v0(server,图二 §六 骨相)

- `events` 表(seq/ts/user_id/actor_kind/channel/verb/objects/summary/meta)+ **BEFORE UPDATE/DELETE 触发器 RAISE ABORT**;verb v0 枚举按图二(含 `migrated`/`rolled_back`);
- 书记官最小中间件:server 侧一个 `recordEvent(tx, …)` 助手,**与动作同事务**;本段消费者=迁移脚本与回滚脚本;⛔ Agent 工具面接线(V14);
- 单测:触发器拒改删(UPDATE/DELETE 报错)+ 同事务回滚时事件不落地。

## 单 2 · 托盘 + 分蘖 v1(client+server)

- `surface` 枚举收 `'tray'`(tray 行几何列无语义,认 order_index);`canvas_workspace` 新写⛔(类型收窄+validator);
- 托盘最小 UI(按 K-0 ④ 的拼接点裁定);分蘖动作 v1(选中块→抽成新笔记);
- 冒烟:块入托盘/出托盘(上纸)/分蘖各一条。

## 单 3 · 影子跑 + 核对单

- 按图三 §一 去处矩阵实现 dry-run(零写入),产逐 note 核对单(图三 §三 守恒式格式)入 `docs/audits/`;
- 收编阈值 50% 为工作值,**按 census 实测校准后冻结**(走查①「允许溢出」批可能改判收编规则——若届时未批,收编行全部降级托盘,⛔ 等待阻塞);
- 冒烟:合成样本库跑影子,守恒式全等。

## 单 4 · 迁移执行器 + 回滚(候 Henry 扳机)

- 三表备份(`_backup_pre13_2`)→ 执行(逐行按核对单,**全程 recordEvent `migrated`**)→ 复测(同 SQL 重跑核对单全等)→ 回滚脚本待命(恢复+`rolled_back` 上钢);
- **⛔ 本单自动触发真实迁移**:交付的是可执行器+演练证据(合成库全流程),真实库执行=Henry 扳机日,HQ 在场;
- 冒烟:合成库 迁移→复测全等→回滚→再复测还原。

## 单 5 · 双模退役收尾

- `NoteCanvasMode` canvas 入口摘除(page 单模);crossing 新写⛔;野地 UI 死代码清册(⛔ 本段删除,清册交 13.6);
- **⭐ 走查②(Henry)**:老笔记搬家后随机抽看(plan 总纲既定)。

## 段收口

定向核查(events/托盘/迁移面)+ 核对单档案归位 + 开 13.3 段 plan(板 MVP,图二为据)。
