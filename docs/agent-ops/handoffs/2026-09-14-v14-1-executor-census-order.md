> **状态 (Status)**: draft(候单5 收口后派发)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.1-A0 · executor 双轨清偿侦察(动词→人门映射普查)
> **上游**: `handoffs/plans/v14-agent-era-plan-draft.md` §14.1(active,Henry 拍转正)+`current-state/agent-constitution.md`(四条+机械闸)+`design/agent-constitution-bylaws.md`(实施法,active)

# 14.1-A0 · executor 动词普查(纯侦察,⛔改产品代码)

**性质**:14.1 同门同钥重铸的 K-0 侦察。`server/src/agent/tools/executor.ts`(933 行单 switch,31 个 case)今日直写 SQL=双轨病灶;重铸前先做**逐动词映射普查**,产出一份裁定用报告,HQ 批准映射后才开重铸单。**本单零产品代码改动**。

## 一 · 普查射程与分类法

对 executor 每个 case(31 个)逐条产出:

1. **动词名+行号区间+读/写性质**(写=任何 INSERT/UPDATE/DELETE);
2. **对应人门**:该动词效果等价的人类 route+service 函数(文件:行号);无对应人门=显式标 **GAP**;
3. **双轨偏差**:executor 的 SQL 与人门业务逻辑的差异清单(校验缺失/字段默认不同/史记不入/收据不出/级联不同)——逐条列,⛔笼统"大致相同";
4. **归类**(四族):
   - **A 族·人门可薄适配**:人门 service 存在且签名可直用或加 actor 参数即可;
   - **B 族·人门存在但需改造**:service 与 route 耦合(逻辑写在 route 闭包里,需先抽 service);列出需抽取的函数;
   - **C 族·Agent 自域**:agent 自己的领地(agent_memories/collect_preferences 等),无人门对应也不该有——按细则只需 actor/收据合规,列现状差距;
   - **D 族·纯读/纯计算**:read-only 或纯计算(suggest/weekly_review/statistics)——列它读的表与人门查询逻辑可否共用;
5. **宪法细则对照**:该动词现状是否触碰四禁令射程(判断域/不可逆删除/用户文字/翻窗)——凡触碰的,列细则要求的门(提案化/复述确认/收据)与现状差距。

## 二 · 交付物

`docs/agent-ops/analysis/2026-09-14-v14-1-executor-census.md`:每动词一行的总表(动词/性质/族/人门落点/偏差数/宪法触点)+ 逐动词明细节 + **GAP 与 B 族抽取工作量估计**(重铸拆单的依据)+ 史记/收据现状一节(executor 写路径今日是否入 events ledger/tool receipts,逐写动词言明)。

## 三 · 禁区

⛔改任何产品代码(纯读+写报告);⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;⛔跑全量测试(侦察单不动码,零测试义务)。

## 四 · 申报义务

Result 必含:普查覆盖数(31/31)、四族计数、GAP 清单、报告路径。存疑归类=报告里标「候 HQ 裁」⛔自判;报告完成即翻 done(本单无测试/构建义务)。
