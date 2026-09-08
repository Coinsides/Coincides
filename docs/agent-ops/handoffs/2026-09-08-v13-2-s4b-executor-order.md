> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 单 4b=迁移执行器+回滚,server 脚本单;⛔ 用户库零接触,真实执行=扳机日 Henry 亲跑)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(扳机日的刀——本单只铸刀与演练,⛔ 挥刀)

# 13.2 · 单 4b · 迁移执行器(野地搬迁 + 坐标归一 + 回滚)

## 〇 · 上游(先读,顺序)

1. 段 plan 修订三(扳机门/不变量/歧义处置,本单法源):`plans/v13-2-wilderness-retirement-plan.md`;
2. 图三 §二(五步协议)§三(守恒式):`analysis/2026-09-07-wilderness-migration-mapping.md`;
3. 单 4a 现物(**必须复用**):`placementContractService`(v1/v2 双语义函数=不变量判定的两把尺)、`coordinateContract` 服务与 `database_meta`(056);
4. 单 3 现物(**必须复用**):`server/scripts/wildernessShadow/`(census/去处判定/守恒校验/report);
5. 单 1 现物:`recordEvent`(同事务书记官)。

## 一 · 口径(冻结)

1. **形态=独立 CLI**(`server/scripts/` 下,仿 shadow-run),⛔ 入启动迁移链;参数 `--db --user --out` 必填;**缺 `--execute` 时=影子预览**(等价单 3 dry-run,零写入);`--execute` 才动库。另交回滚 CLI(或 `--rollback` 子命令);
2. **执行五步(单一事务,全有或全无)**:
   a. **备份**:同库内复制三表为 `canvas_placements_backup_pre13_2` 等(已存在则拒绝执行,⛔ 覆盖旧备份);
   b. **坐标归一**(仅 page 侧 formal 行):逐行以 4a 双尺验——**旧语义 world rect(v1 函数)必须==归一候选在新语义下的 world rect(v2 函数)**;相等→写入全轴 local+`page_frame_local` 标签;不等或缺帧/证据不足→**例外清单,该行原样不动**(⛔ 静默归一,⛔ 猜);归一规则按修订三(y−O.y≥−ε 判 stack-absolute,ε 冻结为 0.5);
   c. **野地搬迁**:按已裁矩阵(inside 原地;workspace crossing/outside 块→准备区 tray+order_index 追尾;野地画物/mount→准备区对应区)——判定函数复用单 3,⛔ 重写;
   d. **记账**:全程 `recordEvent`(verb=`migrated`,channel=脚本名,objects=涉及行,summary=计数摘要;回滚用 `rolled_back`)——**史记第一批车辙**;
   e. **翻旗**:`database_meta` 置 `coordinate_contract=v2`(例外清单非空不阻塞翻旗——例外行在 v2 下仍被 4a 读法安全解释,仅记录待人裁);
3. **复测**:执行后自动重跑 census(复用单 3)出核对单——守恒全等 + 抽样不变量复验(≥20 行双尺重比)+ 例外清单落档;
4. **回滚**:从备份表整表恢复+旗标回 v1+`rolled_back` 记账;回滚后重跑 census 与执行前全等;
5. **演练义务(合成库,⛔ 用户库)**:全谱样本(复用单 3 synthetic+S4 形态)跑通:预览→执行→复测全等→回滚→复测还原→再执行;演练核对单入 `docs/audits/`(带"合成"字样);
6. **零变化面**:⛔ 产品行为/UI;⛔ 启动迁移链(056 之后⛔ 新增自动迁移做数据改写);⛔ 双模退役(单 5 财产);⛔ Agent 工具面。

## 二 · 验证(段纪律)

1. server typecheck/build;
2. 单测:归一双尺判定(相等/不等/缺帧各况)+备份拒覆盖+事务原子(中途抛错全回滚含事件)+翻旗与回滚+例外清单形状;
3. 一条功能冒烟:合成库全流程(§一.5 全链)终态断言。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+演练核对单路径+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 用户库零接触;不动 3001/5173。现物冲突⇒停线举证。
