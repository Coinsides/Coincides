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

## 修订一(HQ 2026-09-07):坐标契约归一并入本段

依 13.1 单 4 卷宗(`analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md`)与 13.1 冻结裁定二:

- **单 0 射程收窄**(读写链全图/判污 SQL 草案/漂移实证已由单 4 交付,⛔ 重做):剩 ③字面量登记面 ④托盘拼接点 ⑤编号续位与备份表命名,加 **census SQL 完整化**(S4 草案 → 图三 §三 全 census:全对象分母/legacy-only 与 dual-truth/世界·局部·混合三解释/存储 boundary vs 几何重算差异/主帧重叠比与 oversize);
- **单 3(影子跑)升双轨**:野地去处判定 + 坐标解释判定(每行三解释评分,歧义行单列候人裁);
- **单 4(执行)同一扳机日双修**:野地迁移 + 坐标归一(A 向:全轴 frame-local 落库)+ 消费链切换(爆炸半径按 S4 §四 A 表逐文件核销,含 fragments/flow/reflow/affiliation/屏显);
- 13.1 打印草稿在本段坐标归一后复活收尾(K-比例终验收随之)。

## 修订二(HQ 2026-09-07 夜班尾):单 4 前置设计题(下一工作块先裁)

单 3 已交付 census+影子跑(合成全谱过闸)。单 4 开单前必须先裁**扳机门机制**:坐标归一若做成常规启动迁移会在 Henry 下次开应用时自动执行,绕过扳机——违「真实迁移唯一人控点」。候选:①执行器=显式脚本(仿 shadow run,⛔ 入启动迁移链)+库内 meta 旗标(coordinate_contract=v2),消费链按旗标切换;②迁移链但带显式解锁哨兵。双模消费链的复杂度与旗标生命周期需权衡,⛔ 疲劳时定,留下一块脑力充足时出图。

## 修订三(HQ 2026-09-08):单 4 扳机门与不变量裁定,拆 4a/4b

1. **扳机门=显式脚本+库内旗标**(修订二两候选裁甲案):执行器仿 shadow-run 独立 CLI,⛔ 入启动迁移链;库内 meta 旗标 `coordinate_contract: v1|v2`(默认 v1),执行器归一完成后置 v2;client 按旗标选语义——**启动应用永不自动动数据,扳机永远在 Henry 手里**;
2. **屏显不变量的机械形态**:执行器逐行验证"旧语义屏显位置==新语义屏显位置",不等即入例外清单候人裁(⛔ 静默归一);census 144 歧义行按现役运行时读法解释(x=local,y=stack-absolute,y−O.y<−ε 者判已 local 保留);
3. **拆单**:**4a=client 消费链双模改造**(单一语义收口 helper+v1 逐位不变+v2 全轴 local+collision 按帧分组+双模对照测试)先行;**4b=执行器**(备份/归一/野地→准备区/events 记账/复测/回滚)随后;真实执行=扳机日 Henry 亲跑;
4. 走查①两裁已生效并简化本段:禁溢出(既录)、收编不启用(全库仅 2 骑缝行,矩阵=inside 原地/其余准备区)。
