> **状态 (Status)**: draft(Fable 设计稿;Opus 拆单前先读)
> **层 (Layer)**: 计划 / Plan(12.2b)
> **日期 (Updated)**: 2026-08-23
> **权威 (Authoritative)**: 否(拆单依据;裁定以 design v0.5 §12 与本文「裁定」段为准)

# V2.BN.12.2b:第一个写工具 + 候选审阅队列 + HTTP 层 K-5

## 0. 一句话

12.2a 立了门(注册表 → manifest → 门 → 收据轴 → `/api/mcp`),**只有一个只读工具**。12.2b 让 Agent **通过同一道门写一次真相**,而且是按 Henry 的阈值规则:单条=立即落地留收据可撤;批量=一次确认;确认不了=出候选进队列等人审。**人审入口是本版的核心交付,不是附件**——没有它,`propose` 档写出的收据无处可去(design §12 D-g)。

## 1. 继承的裁定(不重述,只指针)

- design v0.5 §2.2(收据轴、revert 分层、D-4)、§5.3(**阈值规则,Henry 2026-08-21 亲拍**:单条删除=immediate;批量写/批量删(>1)、跨 Project、打包=confirm;不支持 confirm 降 propose)、§6(候选的家=队列,方案 C;旧 proposals 管线不激活;**新审阅入口须与旧 `ProposalList.tsx` 退场同单**)、§7(MRTR 只在客户端明确宣告能力时发;否则降级,不挂死)、§12(D-e 降级谓词;D-g 人审入口前置;D-f scopes 未强制 TD-14;K-5 HTTP 层归本版)。
- 12.2a-2 收据 writer:`writeToolFaceReceipt` / `markToolFaceReceiptApplied` / `revertToolFaceReceipt`(`server/src/services/toolFaceReceipts.ts`);12.2a-3 seam:`dispatchToolCall` / `resolveEffectiveTier` / `supportsFormElicitation`(`server/src/mcp/{transport,policy}.ts`)。
- 红线:Agent 能编辑的,人类必须 100% 都能编辑——**写工具的执行体必须就是人类正门的执行体**(12.2a-3 S1a 的形状:提取共用,不复制)。

## 2. 范围(单交付物 ×4,串行)

| 步 | 交付物 | 归属 |
|---|---|---|
| **b-1 选门 + 执行器提取** | 由 Opus 用 CodeGraph 核实:现有**写**路由中,哪一条有可复用执行器或可零语义提取(候选:note 软删/trash、note 恢复、block 创建;**优先软删**——它天然同时覆盖「单条 immediate」与「批量 confirm」两档,且可撤)。提取为 service(`routes` 薄壳 + MCP binding 共用),三 killer 同 S1a(两门同源 / 既有 HTTP 正控不变 / 响应字节等价)。**有 route ≠ 有 executor——先核后点名。** | Opus 核实 → Fable 点名 |
| **b-2 工具注册** | 注册表加 1 条写工具(真 zod 复用 validators;`tier` 按 §5.3:入参 n==1 → immediate,n>1 → confirm——**tier 随入参算,不是静态字段**:注册表的 `tier` 记「最高档」confirm,`resolveEffectiveTier` 先按入参降到 immediate 再按能力降 propose;manifest 仍忠实投影);parity 门正控;`tools/call` 端到端:n==1 立即执行 + `applied` 收据;n>1 且客户端宣告 form elicitation → `input_required` → 重试携 `inputResponses` → 执行 + 收据;n>1 且不宣告 → `proposed` 收据、**不执行**。 | builder 5.6 |
| **b-3 候选审阅队列(人审入口)** | **服务端**:`GET /api/tool-receipts?status=proposed`(仅本用户)、`POST /api/tool-receipts/:id/apply`(用收据里的 intended payload 调**同一执行器**,成功 → `markToolFaceReceiptApplied`;失败 → 收据不动、返回原因)、`POST /api/tool-receipts/:id/dismiss`(status 新值 `dismissed`——**词汇扩展,schema 零改动**,与 `proposed` 同法)。**客户端**:最小队列页(列表:工具名 / 摘要 / 影响资源数 / 「跳到现场」/ Apply / Dismiss),入口挂在导航「辅助」分区(Home 未立前临时);**同单退役 `ProposalList.tsx` 面**(§6 Review-1)。页边极淡标记点**不做**(随 12.4 流面)。 | builder 5.6 |
| **b-4 HTTP 层 K-5 + 旅程** | 用 b-2 的 confirm 工具做真实 `/api/mcp` killer:①宣告能力 → `input_required` 往返 → 执行;②不宣告 → `proposed` + 零执行;③`supportsFormElicitation` 恒 true 的 mutation → ① 路径下仍绿但 ② 路径红。旅程(7.2,预期先写):Agent 经 MCP 提议批量软删 2 篇 note → 队列出现 1 条 → 人 Apply → 2 篇进回收站 → 从收据 Revert → 2 篇回来;单条软删 → 立即 + 收据可撤。 | builder 5.6 + Opus 实走 |

## 3. 裁定(本文新增,拍死)

1. **tier 随入参**:`confirm` 是注册表里的上限档;effective tier = f(入参数量, 跨 Project?, 打包?) 再 ∧ 客户端能力。规则函数住 `policy.ts`(已有 `resolveEffectiveTier` 的正门),**不在各工具 handler 里各写一份**(平行机关问)。
2. **apply 走同一执行器**:`apply` 不是「把收据标成 applied」,是**此刻执行** intended payload(与 immediate 路径同一 binding),成功才标;这保证人审后的结果与 Agent 直接执行等价(同门同钥)。intended payload 住收据 `metadata`(12.2a-2 已有 `input_digest`;本版加 `intended_input` 原样 JSON——**收据基底扩展,需 Opus 核 metadata 形状后在 b-2 单申报**)。
3. **dismiss 不删收据**:留痕;队列默认只列 `proposed`。
4. **revert 分层照 §2.2**:单资源 revert=complete;多资源按实际结果 `complete|partial`,不承诺原子(TD-6)。
5. **旧 proposals 面退场**:b-3 同单删 `ProposalList.tsx` 及其路由/导航项;旧表/服务标 deprecation candidate 不物理清(随 v1 清场专项)。
6. **不做**:`resolve_selection` 与选区收据(→ 12.2c,先答 selection 设计 §7 三问);页边标记点(→ 12.4);scopes 强制(TD-14);多穿戴者并发;任何批量跨 Project 工具(阈值规则里它=confirm,但本版只做一个工具)。

## 4. 触及面预估

`server/src/services/<chosen>.ts`(提取)· 对应 `routes/*.ts` 薄壳 hunk · `server/src/toolFace/registry.ts`(+1 条)· `docs/generated/tool-face-manifest.json`(重生成)· `server/src/mcp/{policy,bindings}.ts` · `server/src/services/toolFaceReceipts.ts`(`dismissed` 词汇 + `intended_input`)· 新 `server/src/routes/toolReceipts.ts` · `client/src/pages/ToolReceipts/**`(新)· 删 `client/src/**/ProposalList.tsx` 及导航项 · 常驻测试。**不碰**:schema/migration(词汇扩展不改 DDL)、03/05 保护面、注册表以外的 manifest 逻辑、transport 骨架的 Host/Origin/auth 段。

## 5. 验收(DoD)

- 四单各自复核 PASS(位点由调度方点名,同形不抽样;每单含真实 HTTP 端到端正控——**过 killer ≠ 有能力**)。
- 旅程分数(预期先写,Opus 实走):上述 6 步全 2 分;任一 0 分不铸版。
- 12.2 铸版条件之一;12.2c(selection)与 12.2d(候选呈现完善)在其后。

## 6. 给 Opus 的拆单注记

- b-1 的核实结论(哪条门、有无执行器、提取面)先回我点名,再发 b-1 施工单——**不要让 builder 自己选门**。
- Spark 只适合 b-3 的纯机械子项(如删 `ProposalList.tsx` 与导航项),其余 5.6。
- 每单写死:零语义提取 / 不在 transport 造机关 / 写 Result 不需确认 / 验不了就停的机械判定 / `.run()` 实参侧禁区。

## 7. 2026-08-23 补记(b-1 后)

- **产品事实**:client 对 `/api/notes/:id` 零调用——用户今天在 UI 里无法把 note 移入回收站或恢复;服务端无恢复路由。按红线,**b-2 拆为 b-2a 人类门(client 移入回收站/恢复 + `POST /api/notes/:id/restore`)→ b-2b Agent 工具 `trash_notes`**。
- **b-1 5-2 提示采纳**:执行器改为返回 `{ changes }`(b-2b 内做,DELETE/restore 薄壳忽略返回;b-1 golden/killer 复跑);binding 逐 id 调用按 `changes` 归类 affected/missing。
- **tier 随入参的机关位置**:注册表条目加可选 `threshold: { batch_field: 'note_ids' }`(shared 类型 + 生成器忠实投影 + manifest),`policy.resolveEffectiveTier(entry, envelope, input)` 据此把 `confirm` 在 n==1 时降为 `immediate`——不在各工具 handler 里各写一份、不在 policy 里写工具名表。
- **confirm 往返**:由 builder 对照 SDK `.d.mts`(`input_required` / `inputResponses` / `requestState` / `ElicitRequestFormParams`)核实形状后实现;拒绝(用户在表单选否)= 不执行、不写收据。
- **TD-18**:PUT status 分支与执行器不同源,记债;人类恢复改走新 restore 路由(b-2a),PUT 不动。
