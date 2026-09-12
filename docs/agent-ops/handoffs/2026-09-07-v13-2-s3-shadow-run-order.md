> **From**: fable
> **To**: codex
> **Status**: done(2026-09-12 状态头补翻:交付与 Result 早已在案,头未跟上;派发期原头:ready;两层制;13.2 单 3=census+影子跑双轨,server 脚本单;⛔ 触碰用户库)
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

## Result

**2026-09-07 · Codex builder：单 3 施工完成，工作树交 HQ 复核；未 commit，未改本单原 Status，未代行放行。**

### 交付与判据

- 入口：`server/scripts/v13WildernessShadowRun.ts`；npm 别名 `census:v13-wilderness`、`test:v13-wilderness`、`typecheck:v13-wilderness` 均在 server。
- `wildernessShadow/census.sql` 从单 0 §四提升；保留完整分母、legacy 与三解释，扩 raw placement 身份关联；阈值参数只诊断，不启用收编。全部执行使用 `--synthetic`，内存合成数据序列化后以 `readonly:true` 重开，再设 query_only、检查 statement.readonly，单一读事务完成。
- 双轨纯函数：inside 原地；workspace crossing 全部 fallback 托盘，outside/画物/mount 按冻结矩阵；三解释的完整归页集合一致才定案，分歧和证据不足单列歧义，不选择坐标来源或最佳页。混合 surface、无 placement、缺对象/inactive 均原样保全并标去处待核；不是自动裁决。
- 三表分别验证原始分母、行身份集合、重复身份、原地+收编+托盘、单位与去处；保留空 note 与 frame 结构行。预计 after 不冒称实迁 after；legacy 独立封存。
- JSON：[合成影子跑](../../audits/2026-09-07-v13-2-s3-合成-shadow-run.json)；markdown：[合成核对单](../../audits/2026-09-07-v13-2-s3-合成-shadow-run.md)；复跑用法：`server/scripts/wildernessShadow/README.md`。
- 输出独占新建（wx），打开数据源前拒绝既有目标，仅允许 audits 直接子级并核对真实目录。静态复核曾发现普通写出可能覆盖已有输入/输出，交付前已修复并复核闭合；功能冒烟使用唯一合成文件名。未做安全类演练。

### 验证实跑

| 验证 | 实际结果 |
|---|---|
| `node server/node_modules/typescript/bin/tsc --project server/tsconfig.json --noEmit` | exit 0 |
| `npm.cmd --prefix server run build` | exit 0；manifest 14 条 public 未过期 → tsc → manifest 字节复制完成。manifest 生成器有 recursive-reference fallback 警告，无构建错误 |
| `npm.cmd --prefix server run typecheck:v13-wilderness` | exit 0；专用 noEmit config 覆盖新增 scripts，补足 server 主 tsconfig 只含 src 的范围 |
| `npm.cmd --prefix server run test:v13-wilderness` | 9 tests / 9 pass / 0 fail / 0 skipped；含去处矩阵与 fallback、阈值诊断、三解释一致/分歧/证据不足、多 placement、身份守恒负例、全谱只读合成库、报告与 CLI 落盘冒烟 |
| `npm.cmd --prefix server run census:v13-wilderness -- --synthetic --user s0-user --out docs/audits/2026-09-07-v13-2-s3-合成-shadow-run` | exit 0；SHADOW_RUN_PASS，8 notes，conservation=true，placement 歧义 33，legacy 歧义 5，去处待核 10 |
| 成品回读与零变化 | JSON/markdown 已回读；readonly/query_only/statement.readonly 均 true，total_changes 0→0；单测合成库 serialize SHA-256 前后相同；client/src、server/src、shared 的 git diff 为空 |
| 工作树检查 | `git diff --check` exit 0；本单新增文件逐行检查无尾随空白 |

census SHA-256：`5820ee136e697bc65f58cdd92702cc8fb99980407a3381aa014ffe7468841acf`。守恒是 **8 notes × 3 表 = 24 条全等**，P/O/M 分别 **58/56/39**；15 条 frame placement、8 条 legacy（5 个有效 layout）、144 条三解释几何记录。placement **定案 9 / 歧义 33（解释分歧 24、证据不足 9）/ 不适用 16**。数量与样本身份均有断言；不是只看命令 exit。

### 样本谱与未触发条款

| 覆盖维 | 合成现物 |
|---|---|
| 坐标来源 | true-local / mixed / world；untagged-local/mixed/world；035 痕迹；标签不作为解释选边依据 |
| 帧与原点 | 首帧/次帧、多帧、非零 frame.x/frame.y/inset.top、跨 note 同 frame ID、零原点一致命中/无相交/跨页三对照 |
| 几何与分歧 | overlap 0/.25/.5/.75/1；宽/高/双轴 oversize；stored inside vs rect crossing；同 stack 跨页、多 stack 同分保留全页 |
| 全对象与关联 | shape/image/table/visual_connector/未来 kind；全野地多 placement、mixed surface object/mount、unplaced、inactive、错 note 关联 |
| legacy | legacy-only 1、legacy-ambiguous 2、dual-any 2 / dual-active 1；坏 JSON、非 object、无 layout；1 条无法归 scope 的全局无主 note 行仅回传数量 |
| 未知证据 | 坏/负/零内容 inset、重复 frame placement、缺 extension/绑定/主帧、旋转 frame/object、无帧、零宽、非数值/非有限坐标、坏 metadata；不以 unknown 冒充 outside 或定案 |

沿用 S0 全部样本形态，新增零原点与缺标签等 S3 对照；没有重做 S4 产品 hydration/save 往返或非空库 035 回填。尚未触发：真实库路径分支、真实备份/迁移/复测/回滚/events、收编启用（无开关）、CLI 输出失败/链接分支的动态演练；未测旋转几何求交与大库性能。

### numstat（本单范围）

新增未跟踪文件按逐行 additions/0 计；不含开工前已有三件未跟踪资料。

```text
3       0   server/package.json
92      0   server/scripts/v13WildernessShadowRun.ts
224     0   server/scripts/v13WildernessShadowRun.test.ts
245     0   server/scripts/wildernessShadow/model.ts
89      0   server/scripts/wildernessShadow/report.ts
31      0   server/scripts/wildernessShadow/census.ts
268     0   server/scripts/wildernessShadow/census.sql
154     0   server/scripts/wildernessShadow/synthetic.ts
11      0   server/scripts/wildernessShadow/tsconfig.json
39      0   server/scripts/wildernessShadow/README.md
29533   0   docs/audits/2026-09-07-v13-2-s3-合成-shadow-run.json
281     0   docs/audits/2026-09-07-v13-2-s3-合成-shadow-run.md
68  0   docs/agent-ops/handoffs/2026-09-07-v13-2-s3-shadow-run-order.md
```

合计 **31038 additions / 0 deletions，13 件文件**；其中 29,814 行为生成的 JSON/markdown 核对单。

### 边界与交 HQ

用户库**零连接、零读取**；未读 .env、未打印任何 key；未启动产品服务、未写产品行为/UI/坐标消费链、未建迁移执行器或备份表、未写 events；无依赖安装、commit/push/PR/merge、权限/agent 指令配置改动。开工已有 `.claude/settings.local.json`、模拟走查单及会议记录未动。

按本施工单 §二及段 plan 的“⛔ 马拉松 / ⛔ 安全类测试”执行限域验证，**未跑完整 `verify:v2-bn8-runtime`，不宣称该门通过**；真实库、主观验收和迁移扳机仍留 HQ/Henry。没有需要扩大范围或推翻冻结口径的现物冲突。CodeGraph 优先尝试后 CLI/MCP 均不可用，rg 不可用，回退仓内限域读取；段 plan 的实际路径为 `handoffs/plans/v13-2-wilderness-retirement-plan.md`。
