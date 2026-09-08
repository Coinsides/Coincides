> **From**: fable
> **To**: codex
> **Status**: done(builder 按补遗一工程完工,工作树候 HQ 复核;⛔ 用户库零接触,真实执行=扳机日 Henry 亲跑)
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
