> **From**: fable
> **To**: codex
> **Status**: done(仅补遗一/二工程回执;⛔ 补遗三结构级冲突停线,未完工,详见末尾 Result;用户库零接触,真实执行=扳机日 Henry 亲跑)
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

## Result

### 2026-09-08 · builder 停线回执（施工未完成，工作树交 HQ）

已按 §〇 顺序读取段 plan 修订三、图三、4a 双尺/coordinateContract/056、单 3 wildernessShadow 及单 1 recordEvent，并核对 Agent 入口、方向宪章、现状与 active ADR。未修改产品代码；Status 保持 ready，不作为完成或放行凭据。

**停线点：§一.2b 的“例外原样不动”与 §一.2e 的“例外不阻塞翻旗且由 4a 安全解释”在现物上不能同时保证位置不变。** `placementContractService.ts:50` 的 v1 保留原 y，`:58` 的 v2 对有帧的 `page_frame_local` 无条件加 O.y，没有例外兼容分支；`:62` 的 screen 读法沿用此 y。现役 hydration 也不抵消它。

直接复用单 3 `synthetic.ts:83` 的 `local` 行：x=10、y=10、O=(110,220)，因 y−O.y=−210<−0.5，冻结规则保留 y=10；双尺 world y 分别为 10 / 230，故必须列入例外。若原样保留再翻 v2，world 与 hydration 后 screen 都位移 +220。另一原有 `cross-note` 行同理位移 +2020。`mixed`、`second` 两个正对照按规则归一后双尺严格全等。

完整现物位置、采样表、可复跑探针及边界见 **`docs/audits/2026-09-08-v13-2-s4b-合成-例外翻旗停线.md`**。这是合成停线核对单，**不是**五步事务或迁移→回滚→再执行全链演练。

需要 HQ 闭合“例外原样保留 / 仍翻 v2 / 位置不变”冲突并给出工单或现物修订；builder 不改写 4a，不私改 ε 或例外规则，不以另写读法绕过复用要求。

### 验证输出摘要

- Node/tsx 实跑原有合成样本，复用 4a `resolveWorldRect` / `resolveScreenRect` 和现役 hydration：**EXCEPTION_DRIFT_REPRODUCED，exit 0**；两个反例、两个归一成功对照均有断言。
- 复用单 3 `readShadowReport`：8 notes，24 条三表预计守恒全等；只读合成连接，序列化前后完全相等。守恒并不能消除坐标漂移，此处不宣称迁移后实测。
- CodeGraph CLI 与 rg 不可用，未发现可调用的 CodeGraph MCP；先尝试后用 PowerShell 定向读取，未重建索引。
- 因施工前停线，server typecheck/build、执行器单测、全链冒烟与 `npm run verify:v2-bn8-runtime` **未运行**；验证门没有通过或豁免。

### 未做与工作树交接

- 未实施独立执行/回滚 CLI、五步单事务、三表备份、坐标归一/野地搬迁、events、翻旗、≥20 行迁移后复验及全链合成演练。
- 未接触用户库、未读 `.env`、未打印密钥；未修改启动迁移链、产品行为/UI、双模退役或 Agent 工具面；未操作 3001/5173；未 commit/push/PR。
- 本轮只新增合成停线审计并追加本 Result；开工已有 `.claude/settings.local.json`、模拟用户现场测试单与 09-04 会议记录三项未跟踪内容保留。工作树交 HQ，候裁定后续工。
- 最终 numstat：本工单 **+28/-0**；新增未跟踪合成审计逐文件计行 **+96/-0**；本轮合计 **2 文件，+124/-0**，不含三项既有未跟踪内容。`git diff --check` 通过；Git 的 LF/CRLF 与全局 ignore 读取受限提示不影响本次差异核对。

## 补遗一(2026-09-08,发单方 Fable,针对停线回执;停线成立——修订三的 ε 启发式与不变量冲突,启发式败诉)

1. **归一规则改判:⛔ 启发式定来源,不变量方程定数值**——逐行以 4a 双尺为唯一裁判,求解"新存储值在 v2 读法下的 world 与 screen 均逐位等于旧存储值在 v1 读法下"的坐标;解存在且有限→写入(修订三的 y−O.y≥−ε 规则**废除**,降级为核对单上的诊断注记);
2. **负 local 值合法**:解出的 frame-local 坐标允许为负(=位于内容原点之上/左——那正是用户此刻看到的位置的诚实编码);⛔ clamp⛔ 取整改动;4a 读法为纯加法,天然支持;
3. **无解行→准备区**:缺帧/非有限/方程无解的行,⛔ 原样留在 formal 面——一律搬准备区(tray,order_index 追尾,原值全量存入例外清单供回看)。由此**翻旗前 formal 面零例外**,§一.2e 的"安全解释"从假设变为构造保证;
4. **演练样本追加义务**:必须含停线举证的 `local`(y=10,O=(110,220))与 `cross-note` 两行——断言其处置后(归一或入准备区)v2 屏显与 v1 屏显逐位相等或已离开 formal 面;
5. 段 plan 修订三之归一条款以本补遗为准(补遗链,⛔ 回改原字节);其余口径不变。按本补遗续作至完工 Result。

## Result

### 2026-09-08 · builder 按补遗一完工回执（工作树交 HQ，非迁移放行）

完整重读本工单、原停线回执、补遗一及上游后续工。原停线证据与补遗保留；本次完成独立 CLI、五步单事务、回滚及合成全谱演练，未再发现需停线的结构级缺口。

**交付现物**：`server/scripts/v13WildernessExecute.ts`（`--db --user --out` 必填；默认 S3 只读预览；显式 `--execute` / `--rollback`）；`server/scripts/wildernessExecutor/`（方程求解、执行器、合成样本/演练入口与使用说明）；`server/scripts/v13WildernessExecute.test.ts`；server package 新增执行/单测/typecheck 命令。未接入启动链。

- 五步共用一个 `BEGIN IMMEDIATE`：三表全量只读备份（既存拒覆盖）→ formal 非结构行归一 → 复用 S3 去处矩阵搬迁 → `recordEvent(migrated)` → `coordinate_contract=v2`。同事务内用 S3 同 SQL 复测身份守恒，归一成功行全部重新比较 4a 双尺，formal 例外归零后才翻旗；CLI 提交后另开只读连接再次 census。
- 归一数值直接解方程，以未改动的 4a `resolveWorldRect` / `resolveScreenRect` 裁判；还复用现役 hydration 对照，防止加标签后改变显示表面。负 local 不 clamp、不取整；缺帧/非有限/无精确解/证据不足一律 tray，原值完整保留在例外 JSON。Infinity 与 64 位整数采用保真编码，不被 JSON 静默转成 null 或 JS 舍入。
- **停线原两行实测结果**：page 实际 offset=0（现役 `getPrimaryPageOffsetX('page')`），`local` 的 O.x=110、`cross-note` 的 O.x=1010 使 world/screen 横轴无同时解，均迁 tray 并断言离开 formal。未把旧停线探针用于隔离纵轴的 offset=O.x 冒充真实屏显上下文。另有 O=(0,220) 的负 local 成功对照，含 `(-5,-219.75)`。
- 准备区按 note 的既有 `order_index` 追尾；画物/mount 通过关联 placement 承载去处，object/mount 全量行不改。`--user` 限域与全库旗标的边界有前置拒绝：若其他用户存在非结构、非 tray placement，零写拒绝，不扩范围暗迁。
- 回滚先核对提交后三表及扩展/legacy 表指纹，随后从备份原位恢复每列，SQLite 内部取值、不 DELETE/REPLACE object，避免级联损坏帧/图片/结构化/连接线扩展。旗回 v1、同 SQL census 与执行前全等、同事务 `rolled_back`。成功后将旧备份按回滚事件 seq 归档保留，只读触发器不丢；释放固定名以便再执行，新旧代均不覆盖。数据漂移或任一步失败则全事务回滚。

### 验证输出摘要（均亲跑）

- server typecheck：隔离入口执行 `node node_modules/typescript/bin/tsc --noEmit`，**exit 0**；执行器独立 `npm.cmd run typecheck:v13-wilderness-executor`，**exit 0**。
- `npm.cmd run test:v13-wilderness-executor`：最终 **15 tests / 15 pass / 0 fail**。含相等/不等/缺帧、非有限与例外原值、负 local、精确浮点比较、三个备份名拒覆盖、五个执行阶段和三个回滚阶段故障注入（DDL/事件/旗标一起回滚）、扩展表与大整数恢复、跨用户拒绝、hydration 表面变化、磁盘合成 CLI 全流程。
- 独立子进程 CLI 演练：`node --import tsx scripts/wildernessExecutor/rehearsal.ts docs/audits/2026-09-08-v13-2-s4b-合成全谱演练`，**PASS，exit 0**。预览→执行→复测→回滚→复测→再执行；**24 项逐 note 三表守恒、26 行双尺复验、24 条例外迁 tray、formal 例外 0**；预览文件字节不变、回滚 census/三表 SHA-256 全等、再执行终态全等，事件顺序 `migrated → rolled_back → migrated`。
- 合成核对单：**`docs/audits/2026-09-08-v13-2-s4b-合成全谱演练.md`**；同名 `.json` 保存完整例外原值、归一样本与三表指纹。复用 S3 全谱并追加 24 行严格可解对照与真实扩展表依赖。原 S3 外用户 formal/workspace 行用于前置拒绝测试；可执行 fixture 仅将该外用户行预置 tray，此造样差异在核对单明确申报；local/cross-note 原行完整保留。
- 完整必经门：`node scripts/run-isolated-coordinate-validation.mjs`（现有入口，实际运行 `npm run verify:v2-bn8-runtime`），**exit 0，46s**。客户端 **50 files / 459 tests pass**，registry **5/5**、manifest **10/10**、parity **10/10**，client/server build、模型/性能冒烟、全部静态门、docs 检查、diff 与变更扫描均通过。空 env 目录、内存 DB 与隔离资产目录沿用现有验证入口，未跳门或豁免。
- 只读协助复查所指出的整数恢复与 hydration 两个边界已修复并纳入上述实跑；最终只读复查未发现新具体漏洞。builder 仍只有本线程施工。

### 限制、未做与工作树交接

- 本次只铸刀和合成演练：未接触用户库，未读取 `.env`，未打印密钥，未操作 3001/5173；未改产品/UI、4a 双尺、启动迁移链、双模退役或 Agent 工具面；未 commit/push/PR/merge，未作 Henry 主观验收或真实迁移放行。
- 回滚适用于提交后数据未继续改写的状态；漂移则拒绝，避免抹掉后来写入。报告 I/O 或提交后并发 census 失败可能发生在已提交之后，CLI 与 README 明确提示检查旗/事件/备份后再操作。旧备份保留期和清理仍不在本单。
- 开工已有 `.claude/settings.local.json`、09-07 模拟用户测试单、09-04 会议记录三项未跟踪内容原样保留。当前 `Status=done` 仅指 builder 工程完成，工作树交 HQ 复核。
- 最终 numstat：**12 文件，+9218/-1**。本工单 **+31/-1**（仅状态头替换，其余追加）；`server/package.json` **+3/-0**；8 个新增脚本/测试/配置/说明文件合计 **+837/-0**；新增合成审计 Markdown **+37/-0**、完整证据 JSON **+8310/-0**。未跟踪新增文件按完整文件行数计，不计三项既有未跟踪内容。`git diff --check` 通过。

## 补遗二(2026-09-08,发单方 Fable;真库首跑拒绝的现物回应——拒绝正确,射程需扩)

真库现物:除主用户外,存在测试账号 `34810721-…`(codex.v2113 七月遗留)的 1 条 `paragraph_block_projection` formal 行+1 条 page_frame 结构行;跨用户前置拒绝按设计触发(正确)。裁定:

1. **执行器支持多用户同事务**:`--user` 可重复传入(或逗号分隔);所有列出用户在**同一事务**内走完整五步(各自备份归一搬迁),旗标一次翻;前置拒绝语义改为"存在**未列入本次射程**的其他用户非结构非 tray 行→零写拒绝"(即:列全即放行,列不全照旧拒);
2. 预览/回滚同步支持多用户;核对单按用户分节;
3. 演练样本追加:双用户库(主户全谱+副户单行 formal)——断言单用户调用拒绝、双用户调用全链通过+回滚还原;
4. 其余口径(含补遗一)全部不变。按本补遗续作至完工 Result 追补。

## Result

### 2026-09-08 · builder 按补遗二完工回执（工作树交 HQ，非真实迁移放行）

完整重读原工单、两份补遗及上游后续作；补遗一的双尺方程、负 local 合法、无解迁 tray 与 formal 零例外规则保留。本次完成多用户射程扩展，未发现需按条款停线的结构级缺口。历史 Result 与补遗原文未回改。

- **执行/预览/回滚同一参数口径**：`--user` 可重复或逗号分隔，去首尾空白、去重、排序，空项拒绝。未列出的用户仍有非结构非 tray 行时执行零写拒绝；列全后共同进入一个 `BEGIN IMMEDIATE`。原有三张全表只读备份由全部用户共用，只有一套备份与一次翻旗，各用户分别归一、搬迁、census、守恒及 `recordEvent(migrated)`，没有循环提交的单用户事务。
- **回滚精确配对**：journal v2 持久化完整用户集合与逐用户 beforeCensus；回滚须同一集合（顺序可换，少列/多列均零写拒绝），整表恢复后各户 census 与执行前全等，各记 `rolled_back`，最后一条回滚事件 seq 用于共享备份归档。兼容补遗一的 journal v1 单用户回滚。
- **核对单按用户分节**：执行/回滚 JSON 改为 `v13.2-s4b-multi-user`，预览为 `v13.2-s4b-multi-user-preview`，均含 `scopeUserIds/users`；每户独立事件、守恒、变更/例外和 census 指纹。预览及提交后只读复测的全部用户共处一个读事务，继续复用 S3 原函数与 SQL。README 与原单用户演练同步适配。

### 验证输出摘要（本线程亲跑）

- `node scripts/run-isolated-coordinate-validation.mjs --cwd server -- npm run typecheck:v13-wilderness-executor`：**exit 0，1s**；server `tsc --noEmit` 经同隔离入口运行：**exit 0，4s**。
- `node scripts/run-isolated-coordinate-validation.mjs --cwd server -- npm run test:v13-wilderness-executor`：**19 tests / 19 pass / 0 fail，exit 0，72s**。保留原 15 项覆盖，新增参数集合、双用户全链/事件归属、第二户归一/搬迁/记账失败的全事务撤销（含回滚事件）、旧 journal v1 兼容；遗漏/多列回滚与遗漏执行均断言库序列化字节不变。
- 双用户独立 CLI：`node --import tsx scripts/wildernessExecutor/multiUserRehearsal.ts docs/audits/2026-09-08-v13-2-s4b-合成双用户演练`（server 目录），**PASS，exit 0**。stdout：`users=2; conserved=[3,24]; checked=[1,26]; exceptions=[0,24]; incompleteScopeZeroWrite=true; rollbackExact=true; repeatExact=true`。
- 双用户样本为主户 S3 全谱 + 24 条严格可解对照，副户 **1 条 paragraph formal 正文 + 1 条 page_frame 结构行**，副户未预置 tray。实跑：单用户执行拒绝 → 双用户预览 → 执行 → 复测 → 单用户回滚拒绝 → 双用户回滚 → 复测还原 → 再执行。主户 local/cross-note 仍迁 tray；副户按自己的同名 f1 帧精确归一 y=10、留在 formal。两户 formal 例外均 0；完整回滚三表指纹和各户 census 全等，再执行终态全等；事件各为 migrated → rolled_back → migrated。
- 原单用户独立 CLI 演练回归：`node --import tsx scripts/wildernessExecutor/rehearsal.ts docs/audits/2026-09-08-v13-2-s4b-合成单用户补遗二回归`，**PASS，exit 0**；`conserved=24; checked=26; exceptions=24; rollbackExact=true; repeatExact=true`。
- 完整必经门：`node scripts/run-isolated-coordinate-validation.mjs`（实际运行 `npm run verify:v2-bn8-runtime`），**exit 0，45s**。client **50 files / 459 tests pass**；registry **5/5**、manifest **10/10**、parity **10/10**；client/server build、模型/性能冒烟、静态门、docs、diff 与变更扫描均通过。沿用空 env 目录、内存 DB 与隔离资产目录；未跳过或豁免验证门。
- 并行协助仅定向只读复查，未派第二 builder；发现的预览标题层级问题已修复并回读确认，最终未发现新的具体功能漏洞。协助结论不冒充亲跑验证。

### 演练归档

- **`docs/audits/2026-09-08-v13-2-s4b-合成双用户演练.md`** 与同名 `.json`：按用户分节；完整变更原值/例外、双尺证据、守恒、census/三表指纹与事件序列。
- **`docs/audits/2026-09-08-v13-2-s4b-合成单用户补遗二回归.md`** 与同名 `.json`：原全谱单用户回归证据。两条演练入口均自产临时合成库；本轮生成的中间报告与临时库已按确切路径清理，最终审计保留。

### numstat、未做与工作树交接

- 最终 numstat：**12 文件，+15661/-83**。逐项：`v13WildernessExecute.test.ts` +115/-7；CLI +46/-21；executor +78/-45；README +10/-5；原 rehearsal +6/-4；synthetic +21/-0；新增 multiUserRehearsal +128/-0；双用户审计 MD/JSON +60/+6817；单用户回归审计 MD/JSON +37/+8310；本工单 +33/-1（状态头替换，其余追加）。未跟踪新增文件按完整文件行数计；`git diff --check` 通过。
- **未接触用户库、未读 .env、未打印任何 key、未操作 3001/5173**；未修改产品/UI、4a 双尺、S3 去处矩阵、启动迁移链、双模退役或 Agent 工具面。未 commit/push/PR/merge，未作 Henry 主观验收或真实迁移放行。
- 沿用此前限制：回滚拒绝提交后数据/扩展漂移；报告 I/O 或提交后并发复测可能在已提交后失败，仍须按 README 核对旗标/事件/备份；备份保留期与清理不在本单。
- 开工已有 7 项未跟踪内容（本地 Claude 设置、09-07 模拟用户测试单、09-09 扳机日预览/执行四份审计、09-04 会议记录）保留，不计入本次 numstat。CodeGraph CLI 与 rg 不可用且无可调用 CodeGraph MCP，已先尝试后使用定向 PowerShell 读取，未建索引。`Status=done` 仅指本单 builder 工程完工，工作树交 HQ 复核。

## 补遗三(2026-09-08,发单方 Fable;真库执行 PASS 但语义灾难——checked:0/exceptions:125,全部正文被判无解迁准备区;已由 Henry 回滚还原(events seq3-4)。法条错在补遗一,第三次修法)

1. **等式改判:唯一裁尺=屏显**——归一目标为"新存储值在 v2 读法下的 `resolveScreenRect` 逐位等于旧存储值在 v1 读法下的 `resolveScreenRect`";**⛔ 再约束 world 相等**(v1 的 world x 从未加 O.x,那是本次要治的病,不是要保的不变量;v2 world 由 v2 定义自洽——4a 的 DOM 对位测试即为先例:world 可变、屏显不变);
2. **预期解与真库预期申报**:解析解 x'=x、y'=y−O.y(负 local 合法,补遗一该条保留);真库预期 checked≈126、exceptions≈0、迁准备区仅野地 21 件——执行器末行输出补充人类可读对照(normalized/tray/exceptions 三数);
3. **保险丝(机械化本次教训)**:同事务内,若 formal 候选行的归一成功占比 <50%,事务**中止**报 `FAILED: normalization_rate_anomaly`(法条级异常候 HQ),⛔ 把大面积无解当例外搬家——今天这类灾难从此在物理上不可提交;
4. **演练红线**:合成谱必须新增**生产同构阳性样本**(帧 (80,80)、inset (72,96)/(54,112)、Source 物化形态 x=152 等非零 O.x 形态)断言全部可解+屏显逐位相等;另加保险丝阳性对照(人造大面积无解,断言中止零写);⛔ 全毒谱掩盖法条无解类错误;
5. 真库 events seq1-4 与已归档备份为历史,⛔ 清除;再执行走新 generation(补遗二代际机制);其余口径(含补遗一 2/3 条、补遗二)不变。按本补遗续作至完工 Result 追补。

## Result

### 2026-09-08 · builder 按补遗三停线回执（未完工，不是再次迁移放行）

完整重读工单、三份补遗、入口/方向/现状/active ADR、段 plan 与迁移图后续作；按 §三“现物冲突⇒停线举证”和用户本轮停线指令，发现新的结构级缺口即停止实施。原工单与全部历史 Result、补遗原文保留；顶部 done 仅指补遗一/二，**不能据此认定补遗三已完成**。

**停线点：原始存储值的 resolveScreenRect 相等不保证实际 hydration 后屏显相等；生产同构 Source 阳性无法同时满足新等式与屏显/表面保持。** 源码实际 Source 正文为帧 (80,80)、794×1123、inset (72,96)、行 (152,176,650,72)、canvas_world 标签。依补遗三候选为 (152,0)、page_frame_local：原始 4a screen 前后均为 (152,176,650,72)，但现役 hydration 把旧 x 转为 0；新 local x=152、width=650 则跨出内容区 [0,650]。因此 hydration 后屏显 **(0,176)→(152,176)**，表面 **formal_page→canvas_workspace**。纯屏显裁尺会计此行成功，保险丝看到 100% 成功率也不会拦截；保留 hydration 检查则 Source 仍为例外，无法满足“生产同构阳性全部可解”。不再涉及 world 相等约束。

反向对照：Source 新 x=0 能保持 hydration 后屏显与 formal 归属，却违反补遗三 x′=x 和旧/新存储值直接比较的 screen 等式。builder 未自行改成该解，未修改 4a、删除 hydration 检查或改变 Source 样本标签/宽度凑绿。需 HQ 闭合**裁尺的输入阶段（原始存储 / 实际 hydration 后布局）以及 Source 消费链的归一规则**；若需修改 4a，另给施工范围。

**现物证据**：`docs/audits/2026-09-08-v13-2-s4b-合成-补遗三Source屏显停线.md` 与同名 `.json`；可复跑探针 `server/scripts/wildernessExecutor/addendum3SourceProbe.ts`。两条非零 O.x 普通阳性（帧 80/80，inset 72/96 与 54/112）均 raw/hydrated screen 全等、负 local 合法；Source 保持生产 canvas_world 标签及 650 宽，精确复现冲突。定向只读协助核实 persistence→applyCanvasLayoutsToBlocks→hydration→BlockEditorLayer 的真实源码链，Source 没有几何旁路；**没有声称浏览器实测**。

### 验证输出摘要（本线程亲跑）

- server 目录 `node --import tsx scripts/wildernessExecutor/addendum3SourceProbe.ts`：**exit 0，SOURCE_HYDRATION_CONFLICT_REPRODUCED**；rawScreenEqual=3、hydratedScreenEqual=2、sourceRequiredPositiveFailed=true、rawScreenNormalizationRate=1。exit 0 仅代表冲突断言成立，非迁移 PASS。探针纯合成，不开 DB、不读 env、不发网络请求。
- `node scripts/run-isolated-coordinate-validation.mjs --cwd server -- npm run typecheck:v13-wilderness-executor`：**exit 0，1s**（含新增探针）。
- 完整必经门 `node scripts/run-isolated-coordinate-validation.mjs`（实际 `npm run verify:v2-bn8-runtime`）：**exit 0，44s**；client **50 files / 459 tests pass**，registry **5/5**、manifest **10/10**、parity **10/10**，client/server build、模型/性能冒烟、静态门、docs/diff/变更扫描通过。使用现有空 env、内存 DB 与隔离资产入口。此门通过不消除上述已实证的专项缺口。
- **补遗三的执行器单测、保险丝中止零写阳性及迁移→回滚→再执行全链未交付/未验证**。没有把既有补遗二测试或此次基础门冒充补遗三完工证据。

### 工作树、预期申报与未做

- 临时求解/保险丝/CLI 改动已通过 apply_patch 撤回；`coordinates.ts`、`executor.ts`、`v13WildernessExecute.ts` 对开工基线零 diff。当前执行器仍为补遗二版本，**本轮没有交付可用于再次真库执行的新版本**。
- **真库预期申报：checked≈126、exceptions≈0、迁准备区仅野地约 21 件**（发单方目标；未读库、未实测，结构缺口解决前不能保证）。
- 未接触用户库，未清除或修改真库 events seq1–4、任何归档备份；未读 `.env`、未打印任何 key、未操作 3001/5173；未修改产品/UI、启动迁移链、4a、S3 去处矩阵、双模退役或 Agent 工具面；未 commit/push/PR/merge。开工已有全部未跟踪设置/审计/会议记录保留。
- 最终 numstat：**4 文件，+352/-1**。本工单 **+27/-1**（状态头 1 行，其余追加），新增纯合成探针 **+63/-0**、停线审计 **+54/-0**、JSON **+208/-0**；新增文件按完整行数计，不含既有未跟踪内容。`git diff --check` 通过。工作树只交停线证据与本回执，候 HQ 修订后续作。

## 补遗四(2026-09-08,发单方 Fable;补遗三裁尺量错输入阶段——原始值屏显≠hydration 后屏显,Source 反例成立)

1. **裁尺终版:唯一不变量=现役完整管线 hydration 后的屏显与表面归属**——逐行以真实 hydration 链(applyCanvasLayoutsToBlocks→4a screen 读法,或 builder 已在探针中复用的等价现役函数)重放旧、新存储值,要求**屏显 rect 逐位相等且 formal/surface 归属分类不变**;⛔ 再以原始存储值直比作终审;
2. **解析解降级为候选,按标签分派**:`canvas_world` 标签行→x'=x−O.x, y'=y−O.y(Source 反例的正确解 x'=0 即由此出);`page_frame_local`/无标签行→x'=x, y'=y−O.y;**每行候选必须过第 1 条裁尺复验才算归一成功**,复验不过→例外迁准备区——由此"法条对某形态失手"整类错误被逐行重放兜底,不再依赖法条完备;
3. **保险丝判据同步**换到 hydration 后裁尺(formal 候选归一成功率<50% 事务中止,不变);
4. **演练红线更新**:Source 生产同构阳性(canvas_world、x=152、宽 650、帧 (80,80)/inset(72,96))必须断言归一为 x'=0、formal 归属保持、hydration 后屏显逐位相等;两条非零 O.x 普通阳性照旧;保险丝阳性对照照旧;
5. 其余口径(三份补遗未被本补遗覆盖的部分)不变。按本补遗续作至完工 Result 追补。
