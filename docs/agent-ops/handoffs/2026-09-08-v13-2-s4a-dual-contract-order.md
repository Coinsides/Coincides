> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 单 4a=坐标契约双模改造,client 大单;⛔ 动数据)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(允许多轮内部推进,公共接线一人顺序整合)

# 13.2 · 单 4a · 坐标契约双模改造(client 消费链)

## 〇 · 上游(先读,顺序)

1. 段 plan 修订三(扳机门/不变量/4a-4b 拆分,本单法源):`plans/v13-2-wilderness-retirement-plan.md`;
2. S4 卷宗 §一/§四 A 表(消费点全名单+爆炸半径,本单改动面地图):`analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md`;
3. 冻结裁定二(A 向:存储正典=frame-local 全轴):13.1 段 plan 尾部;
4. 真库 census 收据(144 歧义行的现实分布):`docs/audits/2026-09-08-v13-2-真库-shadow-run.md`。

## 一 · 口径(冻结)

1. **旗标**:库内 meta 存 `coordinate_contract: 'v1' | 'v2'`,默认 v1——先侦察 server 现有 kv/settings 存储,可复用则复用,否则新迁移建极小 meta 表;server 经现有(或极小新增)只读端点暴露;client 在画布数据加载时取一次,⛔ 运行中热切换;
2. **单一语义收口**:新建纯函数层(如 `placementContractService`):`resolveWorldRect(layout, frame, contract)` 等——**v1 分支=现行为逐字保真,v2 分支=全轴 frame-local→world 投影**;S4 §四 A 表所列消费点(buildRuntimeBlockPlacement/fragments 派生/flow/reflow 碰撞/affiliation 随帧移动/屏显定位/打印投影输入)全部改经该层;⛔ 散落 `if(contract)` 遍地——分支只活在语义层内;
3. **v1 逐位不变**:旗标 v1 下,全部既有测试零修改通过(测试基建适配除外,逐条申报);新增对照测试:同一合成数据,改造前后 v1 屏显几何逐位相等;
4. **v2 语义**:存储=frame-local 全轴;碰撞/reflow 在 v2 下**按 frame 分组**(S4 已警告:各帧真 local y 都近 0,全局碰撞会互推);**不变量测试**:合成两帧笔记,(v1 契约+原混合数据) 与 (v2 契约+手工归一数据) 的全部块 DOM 几何逐位相等——这就是扳机日验收判据的测试形态;
5. **打印投影搭车**:NotePrintLayer/pagePrintProjectionService 的 fragments 输入在 v2 下走新语义层(它是 v2 的第一受益者);⛔ 本单验收打印功能本身(仍停放);
6. **零变化面**:⛔ 任何数据迁移/归一(4b 财产);⛔ v1 行为变化;⛔ canvas 模式;⛔ server 业务路由(旗标端点除外);⛔ UI。

## 二 · 验证(段纪律)

1. client+server typecheck/build;
2. 双模对照测试(§一.3/§一.4)+ 既有定向测试 v1 全绿;
3. 一条功能冒烟:合成两帧笔记在 v1/v2 双契约下 DOM 几何逐位相等(浏览器或 jsdom 实跑,申报采样值)。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 查询用户数据。现物冲突(如 A 表消费点已漂移/kv 存储形状不容)⇒ 停线举证,⛔ 自行改判。
