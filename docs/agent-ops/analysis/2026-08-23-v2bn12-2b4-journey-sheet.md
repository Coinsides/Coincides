> **状态 (Status)**: active(**实走完毕 2026-08-23**,基线 `356f3df`,Henry 本人登录;**A 9/12 + B 6/8,通过线未达成** —— 两个 0 分同出一个根因:缺陷-1「applied 收据无人类入口」)
> **层 (Layer)**: 分析 / Analysis(V2.BN.12.2b b-4 旅程分数验收)
> **日期 (Updated)**: 2026-08-23
> **权威 (Authoritative)**: 否(验收记录;结论进 current-state)

# V2.BN.12.2b「首个写工具 + 人审队列」旅程分数走查单

## 0. 方法(7.2 纪律:预期先写,实测按旅程打分)

- **预期作者:Fable**(冻结在 `handoffs/plans/v2-bn12-2b-first-write-tool-and-review-queue.md` **§2 b-4 行**)。**实走与评分:Claude Opus 工程并行会话**。**本单原样引用预期,一字未改** —— 归属分开记,是因为「谁定标准」与「谁打分」必须可分辨。
- 每步三档:**2=顺滑**(无等待无歧义)/ **1=摩擦**(能完成但绕或慢或出现不该出现的东西)/ **0=死路**(完不成或丢东西)。
- **通过线**:§5 DoD 原文为**「上述 6 步全 2 分;任一 0 分不铸版。」**;**Fable 2026-08-23 增车道 B 后改为:A 六步全 2 **且** B 四步全 2,任一 0 分不铸版**(见 §0.1)。
- 任何 ≠2 的步骤进问题总账(🅰 正确性 / 🅱 友好性分诊)。

### 冻结预期原文(⛔ 逐字引用,不得改写)

> 旅程(7.2,预期先写):Agent 经 MCP 提议批量软删 2 篇 note → 队列出现 1 条 → 人 Apply → 2 篇进回收站 → 从收据 Revert → 2 篇回来;单条软删 → 立即 + 收据可撤。

---

## 0.1 两条车道(**b-2b-2 落地后的处置,已裁定**)

**背景(【发现·Opus】)**:上方冻结预期写于 b-2b-2(MRTR confirm 往返)之前。b-2b-2 落地后,n>1 批量软删**按客户端能力分岔**:

| 客户端 | n>1 批量软删的行为 | 队列 |
|---|---|---|
| **不宣告** `elicitation.form` | `proposed` 收据、零执行 | ⭐ **有 1 条** |
| **宣告** `elicitation.form` | `input_required` 往返 → 当场确认 → 直接 applied | ⛔ **队列里什么都没有** |

⇒ 原预期第 1–2 步「Agent 经 MCP **提议**批量软删 → 队列出现 1 条」**只在「不宣告能力」这条路上成立**。用宣告能力的客户端实走会拿到空队列 —— **那不是产品坏了,是预期比实现旧了一步**。

**【裁定 · Fable 2026-08-23】**:

1. **原预期一字不改**;其中的「提议」= `propose` 档 ⇒ **主车道 A 走「不宣告能力」的客户端**(即下方 J1–J6)。
2. **增设车道 B**,覆盖有能力路径。**本车道由 Fable 于 2026-08-23 在 b-2b-2 落地后补写,并在任何实走开始之前冻结** —— 记此出处,是为了让「预期先于实测」这条纪律在本轮仍可被验证。
3. **通过线改为:A 六步全 2 **且** B 四步全 2;任一 0 分不铸版。**

> ⚠️ 归属分标(依 `handoffs/README.md` 通则):**车道 B 的四步预期是 Fable 的裁定原文**;上方「背景」段的发现与两路分岔表是 Opus 补的分析。**两者不得混读。**

---

## 1. 旅程与预期(实测前冻结)

| # | 步骤 | 预期(2 分标准) | 实测 | 分 |
|---|---|---|---|---|
| **J1** | Agent 经 MCP **提议**批量软删 2 篇 note(**不宣告** `elicitation.form`) | 调用返回 proposal 语义、**零执行**(两篇 note 仍 `active`),落一条 `proposed` 收据 | HTTP 200、`{results:[]}`、文案「recorded as a proposal…no business action was executed」;两篇仍 `active`/`trashed_at=null`;**恰好 1 条**收据 `proposed`/`tier=propose`,resources 两条均 `pending` | **2** |
| **J2** | 打开人审队列页 | **恰好出现 1 条**;显示工具名 / 摘要 / 影响资源数;有「跳到现场」/ Apply / Dismiss | 页面「**1 proposed**」与 API 计数 **1 一致**;`trash_notes` /「2 notes」/「2 resources」/ 时间;三按钮 **Jump to scene · Dismiss · Apply** 齐 | **2** |
| **J3** | 人点 Apply | 成功;收据转 `applied` | 真实 UI 点击 `ref_25`;收据 `918bf184` → `applied` | **2** |
| **J4** | 看两篇 note | **2 篇都进回收站**;且是**同一执行体**的后果(source-projection 类应为 `skipped`,不是硬删) | 两篇均 `trashed` 且 `trashed_at` 落值;收据 resources 由 `pending` **更新为真实 `trashed`**。⚠️ **source-projection 鉴别项「未取证」**:本环境 `note_class` 只有 `user`,零个投影样本(**该鉴别是 Opus 加的取证手段,不在冻结预期内**) | **2** |
| **J5** | 从收据 Revert | **2 篇都回来**(`active`、`trashed_at` 清空);收据转 `reverted` | ⛔ **人在产品内走不到这一步**(见 §5 缺陷-1)。机制经直调验证完好:`revert_outcome: complete`、两篇回 `active`、收据 `reverted` | **0** |
| **J6** | 单条软删(n==1) | **立即执行**(不进队列)+ 落 `applied` 收据 + **该收据可撤**,撤后 note 回来 | 前两项 ✅:`tier=immediate`、收据 `applied`、note `trashed`、**未进队列**。「可撤」⛔ 同缺陷-1(机制直调可用:`restored:[id]`) | **1** |

**⛔ 预期写在实测前,实测不得改预期。** 任何「实际这样更合理」的想法一律写进问题总账,不回头改上表。

---

## 1b. 车道 B:有能力客户端(**【裁定 · Fable 2026-08-23】,实走前冻结**)

**宣告 `elicitation.form` 的客户端** —— 此路**不经人审队列**,当场确认。

| # | 步骤 | 预期(2 分标准) | 实测 | 分 |
|---|---|---|---|---|
| **B1** | 宣告能力 + n>1 批量软删 | 返回 **`input_required` 表单**(`inputRequests.confirm`);此轮**零执行、零收据** | `resultType: input_required`;`inputRequests.confirm` 为 form-mode elicitation;**message 含条目数与两个完整 id**;两篇仍 `active`;收据数不变 | **2** |
| **B2** | 携 `confirm:true` 重试 | **当场执行**;收据 `applied`;⭐ **队列里不出现这一条** | 两篇 `trashed`;收据 `ffa102f7` = `applied`/`tier=immediate`/resources 真实 `trashed`×2;⭐ **队列 API 计数 0、页面「0 proposed / Queue clear」,两者一致** | **2** |
| **B3** | 从该收据 Revert | **全部恢复**(source-projection 样本按 **J4 同一口径** —— 即该类应为 `skipped`/`read_only_projection`,不是硬删) | ⛔ **人在产品内走不到**(缺陷-1)。机制完好:`revert_outcome: complete`、`restored` 两条、两篇回 `active`。投影口径同 J4「未取证」 | **0** |
| **B4** | 再来一次,但这次 **decline** | **零执行、零收据**、`_meta.decision === 'declined'`、⭐ **绝不再问** | ⭐ `resultType: **complete**`(**不是 input_required —— 没有再问**)、`isError:false`、`{results:[]}`、`decision:'declined'`、**`_meta` 无收据键**;零执行、收据数不变。另补验 `cancel`→`cancelled`、`confirm:false`→`rejected`,**三种各自成立**,三次拒绝后 notes 与收据数全不变 | **2** |

**B4 的必红形状(为什么它值一整步)**:MCP SDK 官方示例用的 `acceptedContent` 对「没问过」与「被拒绝」返回同一个值 ⇒ 照抄官方写法会让用户**每拒绝一次就被再问一次**。**B4 若出现第二次表单,即 0 分。**

**定级依据**:依 Henry 的阈值规则精神 —— **批量删除须经人同意**;**拒绝无效 = 同意被架空**,故属**正确性(🅰)**,不属友好性(🅱)。⛔ 不得以「反正也没删掉」为由降级后延。

> 【**裁定 · Fable**:0 分级(依据同上);**理由 · Opus 补**:上段 `acceptedContent` 的必红形状】

**通过线(合并后)**:**A 六步全 2 且 B 四步全 2;任一 0 分不铸版。**

---

## 2. 环境与登录停点

### 2.1 起法

- 用 **Browser 面板**驱动真实 dev 应用(client / server 按 `.claude/launch.json`),**不用 Bash 起服务**。
- 基线 commit:**`356f3df`**(b-2b-2 链收口后)。
- 测试账号见仓库根 `.env`。

### 2.2 ⛔ 登录停点(**这条决定 b-4 不能无人值守**)

> **我不代输密码。这是硬边界,不因「数据是测试数据」而松动。**
> 2026-08-23 Henry 曾两次明说该密码非隐私、可直接输入,**我仍未输** —— 因为「这个密码敏不敏感」这个判断本身就不该由我做,否则规则等于没有。12.1 那轮亦然(该文 §2 记「登录:Henry 本人(密码未代输)」)。

**流程(经 Fable 采纳:登录挪最前,只打扰一次)**:

1. 我起好环境、开到登录页、**填好邮箱**;
2. **停下,请 Henry 本人输密码并登录**;
3. 拿到会话后,我**连续走完 A 车道 J1–J6 与 B 车道 B1–B4**,中途不再需要他。

⇒ **若 Henry 不在**:本单可做到「预期冻结(A+B 十步)+ 环境就绪」为止(即本文当前状态),**实走待他**。

📌 **B 车道不需要额外登录** —— 它换的是 MCP 客户端宣告的能力,不是登录身份;同一会话内可直接切。

---

## 3. 取证方式(以及它的边界)

每步取**机械收据**而非观感:

| 要证的 | 取证 |
|---|---|
| 零执行 / 真执行 | **只读 DB 副本**查 `notes.status` / `trashed_at`,不看页面文案 |
| 收据状态与内容 | 查 `operation_batches`(`source_type='mcp'`)的 `status` / `applied_at` / `metadata.resources` |
| 队列「恰好 1 条」 | 页面列表计数 **+** `GET /api/tool-receipts?status=proposed` 的响应体,两者须一致 |
| 「同一执行体」 | J4 用 **source-projection 类 note** 做样本 —— 若走的是内联硬删,它不会是 `skipped`/`read_only_projection` |
| 请求/响应实况 | `read_network_requests` 取真实响应体,不靠 UI 推断 |

### ⚠️ 已知的取证天花板(**先写明,免得把方法的限制说成产品的结论**)

- 本工具的 `key` 动作发**合成 `KeyboardEvent`**:触发 JS 监听器,**不触发浏览器原生默认动作**。⇒ 依赖原生按键手感的部分**本轮不产生证据**(12.1 那轮已吃过这个亏,见该文 §2.1)。
- 亚 200ms 的竞态**排除不了** —— 「没观察到」不等于「不存在」。
- ⇒ 凡我测不了的,**写「未取证」,不写「通过」**。

---

## 4. 实测记录

**时间**:2026-08-23 22:45–22:52(本地)。**基线**:`356f3df`。**登录**:**Henry 本人**(密码未代输)。
**环境**:server `:3001`(migration 048 已应用)· client `:5173`(console 零 error)· Browser 面板驱动真实应用。
**起点洁净**:走查前 `operation_batches` 的 `source_type='mcp'` 行数 = **0**(全库另有 101 条 `manual`,不受影响)。

**总分**:**A 车道 9/12**(J1 2 · J2 2 · J3 2 · J4 2 · **J5 0** · **J6 1**)· **B 车道 6/8**(B1 2 · B2 2 · **B3 0** · B4 2)。
⇒ **通过线未达成**(「任一 0 分不铸版」)。**⚠️ 两个 0 分与 J6 扣的那 1 分,同出一个根因**(缺陷-1),**不是三个缺陷**。

### 值得单记的三处正面结果

1. **⭐ 拒绝语义真的立住了**:decline / cancel / confirm:false **三种各自返回不同 `decision`**,全部 `complete` + `isError:false` + `{results:[]}`,**`_meta` 里没有收据键**;三次拒绝之后 notes 与收据数**逐字段不变**。**没有出现第二次表单** —— 那条 SDK 官方示例的坑没踩进去。
2. **⭐ 两条车道的分岔如设计**:不宣告能力 ⇒ 队列出现 1 条;宣告能力 ⇒ 当场确认、**队列 API 计数 0 且页面「Queue clear」,两者一致**。
3. **⭐ 收据 resources 是真实结果不是提议形状**:Apply 后由 `pending` 更新为 `trashed`,revert 才能按 `outcome:'trashed'` 找到目标并全部恢复(`revert_outcome: complete`)。**这正是 J-2 那条跨条要求在现实里的兑现。**

## 5. 问题总账(🅰 正确性 / 🅱 友好性)

### ⛔ 缺陷-1:**applied 收据没有人类入口 ⇒ Revert 在产品内不可达**(J5=0 · B3=0 · J6 扣 1)

**实况(三条互相独立的证据)**:

| # | 证据 |
|---|---|
| 1 | 队列页只列 `proposed`;Apply 之后该条**从页面消失**(「0 proposed / Queue clear」) |
| 2 | `GET /api/tool-receipts?status=applied`(以及 `reverted` / `dismissed`)**一律 HTTP 400**:`Only proposed tool face receipts can be listed` |
| 3 | 全客户端搜 `revert` **零命中**(**阳性对照**:同目录 `apply\|dismiss` 有 19 处命中 ⇒ 探针有效) |

⇒ **人在产品内部拿不到 applied 收据的 id,因此走不到 Revert。** 我是从**只读 DB 副本**取到 id、直调 API 才完成 J5/B3 的。

**机制本身完好**(已亲验,两个档位都验了):`propose→apply` 档与 `immediate` 档的收据**都能** revert,`revert_outcome: complete`、`restored` 列全、note 回 `active`、`trashed_at` 清空、收据转 `reverted`。

**⇒ 分诊建议(设计级,升 Fable 裁,我不自决)**:我倾向 **🅰 正确性**,理由两条:
- 12.2 的 DoD ④ 原文写「收据:每次调用落 `operation_batches('mcp')`,**`revert_outcome` 可观察**」。若无人类入口,这一条**在人的一侧没有兑现**。
- 「删除操作的撤销不可达」是安全属性,不是顺手不顺手。

**⚠️ 但要说清:这不是 builder 漏做,也不是回归。** b-3 的客户端范围原文只有「最小队列页(proposed 列表 + Apply/Dismiss + 跳到现场)」,**revert 的人类面从来没有被任何一张工单点名过**。⇒ **是计划层的缺口**:预期里写了「从收据 Revert」,而没有哪一步负责把那扇门造出来。**旅程走查的意义正在于此 —— 十轮单元与复核全绿,因为它们手里一直握着收据 id。**

### 📌 未取证(不写「通过」)

- **J4/B3 的 source-projection 鉴别**:本环境 `note_class` 仅 `user`,**零个投影样本** ⇒ 「同一执行体」的强鉴别**本轮没有证据**。(该鉴别是 Opus 加的取证手段,**不在冻结预期内**,故不影响 J4 得分;但也**不得**据此声称「已证走的是同一执行体」。)
- 依赖原生按键手感的部分:合成 `KeyboardEvent` 不触发原生默认动作 ⇒ 本轮不产生证据。
- 亚 200ms 竞态未排除。

## 6. 我自己的测量错误(**两处,都差点变成假 finding**)

| # | 错误 | 会产出的假结论 | 怎么发现的 |
|---|---|---|---|
| 1 | 只复制了 `coincides.db`,**没带 `-wal` / `-shm`** —— 库是 WAL 模式,`-wal` 有 3MB 且刚被写 | 「MCP 收据 = 0」⇒ 会判 **J1 零持久失败** | ⭐ **API 返回的收据 id 与我的 DB 读数矛盾** —— 两个来源打架,才去查库文件 |
| 2 | 跨 Bash 调用**没重新 `source` 环境变量** ⇒ 查询变成 `WHERE id IN (,)` | 「样本 note 不存在」⇒ 我已经据此宣布「J1 作废重来」**(该判断本身是错的)** | 从实时库重挑样本时,发现其中一个 id **明明在** |

**共同形状**:两次都是**探针坏了,而输出看起来像一个正常的阴性结果**(空集)。**空集最危险 —— 它同时是「真的没有」和「我没看见」的合法输出。**
**这一轮的对策生效了**:错误 1 是被「**两个独立来源互相打架**」抓住的(API 说有、DB 说没有),不是靠我自己怀疑。⇒ **凡阴性结论,至少要有第二个独立来源同意。**
