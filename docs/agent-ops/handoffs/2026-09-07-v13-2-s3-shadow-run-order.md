> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 单 3=census+影子跑双轨,server 脚本单;⛔ 触碰用户库)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(只读分析器+dry-run 工具,零产品行为变化)

# 13.2 · 单 3 · census + 影子跑(野地去处 × 坐标解释 双轨)

## 〇 · 上游(先读,顺序)

1. 图三 §一(去处矩阵)§二(五步协议)§三(核对单守恒式):`analysis/2026-09-07-wilderness-migration-mapping.md`;
2. 段 plan 修订一(双轨定义):`plans/v13-2-wilderness-retirement-plan.md`;
3. 单 0 报告 §四(完整 census SQL,已合成过闸):`analysis/2026-09-07-v13-2-s0-recon.md`;
4. 单 4 卷宗 §二(三解释)§四 A 表(消费面):`analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md`。

## 一 · 口径(冻结)

1. **census 脚本**:以单 0 §四 SQL 为底,做成 server 侧可执行只读脚本(参数化 user scope;连接只读;输出 JSON+markdown 核对单)。**⛔ 本单以任何方式连接/读取用户库**——真实执行留扳机日由 HQ/Henry 亲跑;本单全部演练走合成库;
2. **影子跑 dry-run**:逐 placement 判两件事,零写入——
   - **去处**(图三 §一 矩阵):inside 原地 / crossing 与 outside 判去处;**收编规则按已冻结的走查①前 fallback:crossing 一律托盘**(阈值 50% 逻辑保留为参数,⛔ 本单启用);野地画物/mount 按图三 一律托盘对应区;
   - **坐标解释**(单 4 三解释):world / local / 混合(x-local+y-world)三种解释各自归页,三者一致=定案,分歧=**歧义行**单列(⛔ 自动选边,留人裁);
3. **核对单输出**(图三 §三 守恒式+扩列):逐 note——各类计数、去处分配、坐标解释判定(定案/歧义)、守恒式全等校验;歧义清单附三解释各自的归页结果;markdown 入 `docs/audits/`(合成演练件带"合成"字样命名);
4. **演练义务**:合成库覆盖单 4/单 0 已建样本形态全谱(true-local/mixed/world/untagged/legacy-only/多帧/非零原点帧/oversize/画物/mount),影子跑全流程,守恒式全等,歧义行如实现形;
5. **零变化面**:⛔ 产品行为(纯脚本+可复用纯函数);⛔ 迁移执行器(单 4);⛔ UI;⛔ events 写入(census/影子是读,executor 才上钢)。

## 二 · 验证(段纪律)

1. server typecheck/build;
2. 单测:去处矩阵判定(含 fallback 规则)+三解释评分(一致/分歧各况)+守恒式校验器;
3. 一条功能冒烟:合成库全谱样本影子跑→核对单落盘→守恒全等+歧义行数与预期相符。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+样本谱覆盖清单+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 用户库零接触。现物冲突⇒停线举证。
