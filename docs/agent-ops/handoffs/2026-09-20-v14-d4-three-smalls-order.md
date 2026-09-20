> **状态 (Status)**: ready(HQ 按代理权翻牌;三件挂账小活合单,均为已裁方向的核查/接线)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 债务墙 · D4 小单三件(出生即入包核查/live 夹具核查/红旗上下文判别)
> **上游**: ①会议记录 09-16 §三点九(出生即入包核查「小单候派」:castItem 认领锚但未见写成员表,散装 item 存在则传递链断)+castItem 现物法「Only content_group Item pools are supported」;②评测场单 Result(live 模式夹具 segments 播种待核);③live 基线 #1(claude-log §159 发现②:模型引用既存记忆的「我已记住」被计红旗,误报占比 1/2——评分器批第一课题,现提前机械半)。**三件均为核查+最小修,⛔扩面。**

# D4 · 小单三件

## 一 · 出生即入包核查(castItem 传递链)

1. **核查**:castItem 铸出的 item 是否写入其所属 content_group 的成员表(members)——specimen 式取证:隔离库铸一枚,查成员行;
2. **若断**:最小修=castItem 同事务写成员行(申报字段与角色取值照现役成员表语义);**若通**:出具通路证据,零改动;
3. 回归:既有 castItem/ContentGroup 测试零破;修则补一条「出生即入包」断言。

## 二 · live 夹具 segments 播种核查(评测场)

1. **核查**:agent-eval `--live` 模式的夹具是否正确播种 segments(评测场单遗留待核项);dry-run 通路验证;
2. **若断**:最小修=夹具播种补齐(⛔碰 harness 架构⛔真实模型调用——dry-run 与 scripted 断言足证);**若通**:证据了案;
3. 台账:该遗留项在评测场单 Result 或 tech-debt 的挂账处标记核查结论。

## 三 · 红旗上下文判别(claim 词表机械半)

1. **病灶**(live 标本②):claimObservation 把「引用既存记忆的『我已记住』」计为新宣称——引用≠宣称,空头支票率被系统性高估;
2. **机械修**:观察器加上下文判别——本轮存在成功 search_memories/记忆命中且措辞为引用式(申报判别规则:窄词表+引用句式清单,⛔重型 NLP)→ 不计红旗;新宣称(无检索支撑的「已记住」)照计;
3. **观察哲学不变**:observe-only,⛔阻断⛔改写回复;
4. 回归:§143 场景(自然直令→save_memory)红旗行为零变;live 标本②转为回归夹具(引用式→零红旗);申报误报率预期变化;
5. 评测场 2 号场景(空头支票)断言照旧全绿。

## 四 · 验收与禁区

1. 定向:三件各自证据+回归;agent 族回归+client 全库+server 全量(**全量补集含 v13WildernessExecute,文件预算 ≥600s**);
2. 台账义务:三件挂账处(会议记录待办/评测场单/量表课题)各标结论——⛔自标已清,写实况;
3. 证据落 `docs/audits/2026-09-20-d4-smalls-builder/`,原始日志留 `.codex-tmp/d4-smalls/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作;只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔扩面(三件之外零动)⛔新表新列(castItem 成员行=现役表写入非新列)⛔新工具⛔prompt 改动;⛔Relation/判断域⛔笔记写权;⛔TextFlow 真相 schema;⛔坐标契约;⛔新依赖;⛔真实模型调用;⛔用户库;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符。Result:三件结论各一节(通/断+证据/修法)+逐件行号+测试数字+台账申报+未做项。冲突停线举证。

## 补遗一(HQ 裁定:引用支撑的证据边界 = 本会话收据,不限本轮)

> 2026-09-20 · HQ 按代理权裁定,回应下方 Result 的冲突停线。停线成立:§三.2「本轮命中」门槛与 §三.4 原标本验收在标本实际字段上不可并立,缺陷在 HQ 判据写窄,不在标本。

1. **§三.2 判据修订**:引用式措辞的「已记住」类宣称,其支撑受理两路——(a) **本轮**成功 search_memories/记忆命中;或 (b) **本会话既往轮存在成功 `save_memory` 写收据,且其写入内容与本轮引文文本对上**(子串级匹配;归一化规则由 builder 申报,允许去引号/去首尾空白/标点宽容,⛔语义相似度⛔重型 NLP)。两路任一成立 → 不计红旗;两路皆无 → 照计(空头支票语义不变:**判「既存」看本会话有无收据,不看本轮**)。
2. **⛔跨会话扩权**:证据射程限本会话 transcript 内的工具收据;⛔观察器事后查库补证(builder 停线时自禁的这条,追认为正式禁区——查库会把「碰巧库里有」洗成「有收据」)。
3. **§三.4 照旧**:原标本 `05-memory-journey.json` 在修订判据下应通过 (b) 路转零红旗,**零派生零篡改**,原文件直接当回归夹具;SHA-256 以停线取证为准。
4. **反向回归新增**:补一条「前轮存过 Y、本轮空口宣称已记 X(内容对不上)→ 照计红旗」的断言,证 (b) 路不放走真空头支票。
5. §143 场景与评测场 2 号场景断言照旧全绿(本轮真实写收据场景两路判据下行为零变)。
6. 其余照原单:①的最小修收下,进全量回归;②补跑 06 scripted 对照与完整场景回归;§四验收全量门(含 ≥600s 预算)、台账义务、Result 追加照旧。

## Result

> **2026-09-20 · Codex builder · 冲突停线，整单未完成、未验收。** 保留 `ready`，不翻 `done`，不标债务已清。已完成局部代码留工作树交 HQ；零 git 写操作、零 commit。

### 停线理由：§三.2 与 §三.4 在原 live 标本上不能同时满足

§三.2 要求「**本轮存在成功 search_memories/记忆命中**」且为引用式才不计红旗；§三.4 要求 live 标本②转为「引用式→零红旗」。原始标本 `.eval-runs/2026-09-14T10-54-13-381Z-167e5264/05-memory-journey.json` 的 `turns[2]` 实际为：

- 用户「明天复习怎么安排」，本轮只有 user / assistant 两行，`tool_calls` / `tool_results` 均 `null`，工具事件 0。
- 回复带「✅ 我已记住你的偏好：『我习惯清晨背诵，晚上做题。』」（原引号为 `「」`）；收据 `read_calls=[]`、`write_calls=[]`，写成功/失败均 0，红旗 1。
- 偏好确已由**前两轮** `save_memory` 保存，但本轮快照及 API 读回均 `last_accessed=null`。
- 自动检索也核过：`orchestrator.ts:83` → `memory/manager.ts:115` → `memory/service.ts:81–87`；现役命中会在返回前更新 `last_accessed`。live harness 不提供 Voyage，场景中文 query 无 FTS/LIKE 候选，未找到本轮自动命中证据。不能只因已有偏好行，就把前轮保存或历史引用当成本轮检索命中。

保持这些事实并执行 §三.2，原标本不能保证零红旗；给它补一个未发生的检索结果只会变成派生夹具。主 builder 与独立只读核查得到同一结论，依本单「冲突停线举证」停止新增实现/测试，未擅自扩展判别规则。

完整冲突证据：[claim-conflict.md](../../audits/2026-09-20-d4-smalls-builder/claim-conflict.md)。原文件 SHA-256 `4b357901534adf8115a4c854df5c11eabf94e59509cf4657afe3ab8bef9f2a2b`；字段抽取及脚本/stdout 均在 `.codex-tmp/d4-smalls/claim-*`。需 HQ 明确是否允许前轮成功保存/对话历史支持引用，或保留本轮门槛并调整原标本验收；本回执不替 HQ 裁定。

### ① castItem：修前断，局部最小修与定向回归已完成

- 隔离 `initDb(':memory:')` 标本：修前 Item/Snapshot 已生成、Anchor 已认领，但所属 `content_group_members` **0 行**；修后恰 **1 行**，ContentGroup hydration 同样可见。
- `server/src/services/items.ts:795`：沿用 `castItem` 既有事务写成员，`kind='item'`、`item_id=新 Item`、`target_id=NULL`、`source_sync_status='fresh'`、`metadata={}`、原包尾序，归属字段来自原 ContentGroup。现役表没有独立 role 列，没有另造角色词表或 schema。
- `server/src/__tests__/v2Items.test.ts:284`：融合 cast 只追加一条成员、保留旧成员；`:329`：扩既有故障回滚断言，成员与 Item/Snapshot/Anchor 一同回滚。
- `v2Items + v2ContentGroups` 定向 **20/20，0 fail/skip/retry，exit 0**，文件预算 **600000ms**。原始日志 `cast-specimen-before.log`、`cast-specimen-after.log`、`cast-targeted.log`。
- 蒸馏：[cast-item.md](../../audits/2026-09-20-d4-smalls-builder/cast-item.md)。仅两份代码/测试文件修改；局部绿不等于整单放行。

### ② live segments：已跑标本通，零生产/夹具改动，完整回归未完成

- `server/scripts/agent-eval/harness.ts:65` 共用 setup；`scenarios/03-proposal-journey.ts:22`、`06-loop-resilience.ts:41` 已无条件 `listCourseMaterials → ensureSegmentsForMaterial`。
- `npm.cmd run eval:agent -- --live --dry-run` **exit 0 / 13 场景计划**。dry-run 不执行 setup，不冒充播种证据。
- 用 scripted 隔离 harness、零 provider turn 分别执行 **03 live setup / 03 scripted setup / 06 live setup**，三份各 **3/3，合计 9/9**；各有四种 segments 与四条 fragment 链接。没有进入 live provider 路径，没有读取机器凭据或调用模型。
- 原始标本/日志 `.codex-tmp/d4-smalls/eval-*`；蒸馏：[eval-segments.md](../../audits/2026-09-20-d4-smalls-builder/eval-segments.md)。停线时尚未跑 06 scripted 对照和完整场景回归，不能宣称整项验收完成。

### ③ claimObservation：冲突停线，零实现变更

`server/src/agent/claimObservation.ts` 未改，observe-only 哲学与现有红旗行为均未改变。原 live 标本已取证，未造成本轮命中；未新增引用判别词表/句式、未声称误报率下降。§143 与评测场 02 回归未执行。

### 验证、台账与未做项

- 已执行数字仅为① **20/20**、② **9/9 setup 核查 + 13 场景 dry-run**，不合并成全量通过数字。
- 已只读核清总门为 **非 git/secrets 25 组件**；本轮未开始整体执行，不申报 25/25。`git diff --check` 与 secrets 组件仍留 HQ。
- server 全量清点为 **109 文件 = test:v2 主集 82 + 补集 27**，补集包含 `scripts/v13WildernessExecute.test.ts`；全量、agent 族及 client 全库因停线未运行。没有排除某文件冒充全量；后续仍须 ≥600s 文件预算。
- 三处原挂账均未清偿/未改判：09-16 会议 §三点九；评测场原工单 Result / live 基线发现三；live 基线发现二及 §159 量表课题。停线后只追加本 Result 和审计证据，原台账尚未追加完成结论，留 HQ 处理。
- 禁区遵守：无真实模型调用、无用户库接触、无凭据值读取/修改、无 prompt/工具面/schema/依赖/Relation/笔记写权/坐标契约改动；未新增安全对抗用例。只读 git 用于工作树核查，未执行任何 git 写操作或 commit。
- 所有子任务均已停止，无在跑测试。工作树保留上述①两文件最小改动，以及本 Result、三份审计证据；原始日志留 `.codex-tmp/d4-smalls/`。
