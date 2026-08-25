> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 四待拍已裁 §3.1 + §5 订正 `ff58f0b`;c-0 已交付 `399376a`) | re: v2bn12-2c-2 | date: 2026-08-24

# V2.BN.12.2c-2:`resolve_selection` —— 工具面第一个**只读解析工具**

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## 上游

- selection 设计 **v1** + 段计划 **§2 裁定 / §3.1 补记 / §5 触及面**(裁定以它们为准,**不重述**)。
- **c-0 核实报告** `analysis/2026-08-24-c0-resolve-selection-server-paths.md` —— 下方实况取自它,**已亲验**。
- 先例:`list_notes`(只读工具的 tier 与收据行为)· `trash_notes`(逐条 outcome 语汇)。

---

## 调度方已亲验的六条实况(**行号会漂,按符号定位**)

| # | 实况 |
|---|---|
| 1 | ⭐ **归属一步解决**:`note_blocks` 的 **`user_id` 就在同一行** ⇒ `SELECT ... WHERE id = ? AND user_id = ?` 同时解决存在性与归属(先例 `items.ts` 的 `ensureOwnedBlock`)。**unit 层零权限逻辑** —— unit 归属完全由所在 block 决定。 |
| 2 | ⛔ **`textUnitId` 没有 SQL 路**:全库**无** `text_flow`/`text_unit` 表;unit 住在 `note_blocks.content_json`(TEXT 列的 JSON)⇒ 验存在性 = **读出该行 + 解析 JSON + 遍历 units**。 |
| 3 | ⭐ **`textFlowId` 是纯派生**:`textFlowIdForBlock(blockId) => \`textflow-${blockId}\``,全仓 5 个产地同一函数。 |
| 4 | ⭐ **解析约定已存在**:`services/items.ts` 的 `textFlowProjection` 已会走 `body.text_flow.units[]`、滤 **`status !== 'deleted'`**、按 `order_index` 排序、取 `text`。**但它聚合整块、不接受 unit id。** |
| 5 | ⛔ **unit 级验证是全新能力**:`verifyAnchorTarget` 对 `content_range` 锚**只做 `ensureOwnedBlock`**,**从不检查 `text_unit_id` 是否真在 content_json 里**。⇒ **⛔ 本单不得出现「复用既有 unit 校验」之类措辞** —— 没有那个东西。 |
| 6 | **`annotation_ranges` 同构但无索引**:列名与三元组+offsets 对应,**但零索引** ⇒ 它是写入侧记录,**不是反查路**,⛔ 不得当查询路用。 |

---

## S0:并入的测试整理(**来自 c-1-fix HIGH-1 降级,Fable 2026-08-24 裁**)

**一处,只此一处**:`client/src/pages/Notes/canvasEngine/selectionReceiptProjection.test.ts` 的 **K-1'** 里,那条 `expect(...excerpt).not.toBe(PARTIAL_SELECTION_WHOLE_TEXT)` —— **删掉它**。

- **理由**:该 fixture 自证职责**已由 K-2' 单独承担**(K-2' 另有 `startOffset > 0`);留在 K-1' 里造成**职责耦合**,使 K-1' 的红点可能落在 fixture 断言而非投影断言上。
- ⛔ **只删这一条断言**。**不得**改 K-1' 的其余断言、不得改 fixture 常量、⛔ **不得碰 `selectionReceiptProjection.ts` 产品投影**(它是对的,`602d0a0` 已放行)。
- **验**:删后 `test:unit` 应为 **222 → 222**(删的是断言不是用例);⭐ **另须证明 K-1' 仍承重** —— 把投影改回整段 ⇒ **K-1' 须红,且红点落在投影等值断言上**(⛔ 不接受红在别处)。

📌 **本项不是本单主线**,与 S1–S3 无耦合;**若它与主线抢时间,先做主线**,把本项留在最后并在 Result 里说明。

## S1:解析约定**零语义提取**(§3.1 D;S1a 形状,反 TD-15)

把 `services/items.ts` `textFlowProjection` 内「**什么算一个有效 unit**」的解析/过滤约定提为**新共享 server 模块**;`textFlowProjection` 与 resolve service **同源 import**。

⛔ **零语义**:提取前后 `textFlowProjection` 的行为**逐字节等价**。
⛔ **是提取,不是复制**:提取后**全仓该约定只此一份**。
⛔ **`items.ts` 只允许这一个 hunk**(外提 + import 回接),**其余部位仍是禁区**(§5)。

## S2:注册表条目 + binding

- 注册表 `server/src/toolFace/registry.ts` **+1 条** `resolve_selection`:真 zod `.strict()`;`truth: 'content'`;**只读 tier 同 `list_notes` 先例**;`exposure: 'public'`。
  ⭐ **入参 schema 必须逐字对齐 c-1-fix 后的 `SelectionReceiptV1`**:字段名为 **`excerpt`(不是 `text`)**;⛔ **不得「顺手规范化」命名** —— 该类型是**外层 snake_case(`note_id`/`text_ranges`/`at`)+ 内层 camelCase(`blockId`/`textFlowId`/`startOffset`)** 的混合式(接缝的自然产物,内层继承自客户端既有类型)。**改一处大小写就会让客户端与服务端静默不一致。**
  ⭐ **zod 加 refine**(Fable ⑤③):`excerpt.length === endOffset - startOffset`,**破则 400**(与 H-3「整体 4xx 只给 zod 不过」一致)。
- `server/src/mcp/bindings.ts` **+1**。
- manifest 重生成(生成件与源同提交)。

⛔ **只读**:**不写收据**(收据轴只记写操作,同 `list_notes`);⛔ 不改 `statusForTier`、不改收据轴。

## S3:解析 service(新文件)

**逐 range 三态**,按裁定:

| 态 | 判据 |
|---|---|
| **`found`** | block 存在且属本人 · `textFlowId` 与 `textFlowIdForBlock(blockId)` **一致** · unit 存在于 `content_json.text_flow.units[]` 且 **`status !== 'deleted'`** · ⭐ **`excerpt === currentUnitText.slice(startOffset, endOffset)`**(逐字符,见下「比对式」) |
| **`text_drifted`** | ⭐ **只留给「位置还在、文本变了」** —— 前三项全过,仅 **`excerpt !== currentUnitText.slice(startOffset, endOffset)`** |
| **`missing`** | 其余一切:block 不存在 / **block 非本人** / unit 不存在 / **unit `status === 'deleted'`**(裁定 A)/ `textFlowId` 与派生值**不一致**(裁定 C) |

### ⛔ 三条硬闸

- **H-1(裁定 B)**:⛔ **任何时候不得把 `missing` 细分出 `forbidden` / `not_owned` / `denied` 之类可区分的值** —— 那会**泄露他人对象的存在性**。foreign 与 nonexistent **必须逐字节相同**。
- **H-2(裁定 C)**:`textFlowId` **保留但不许带着不用**。resolve **必须 import 同一个 `textFlowIdForBlock`** 做一致性校验,⛔ **不得本地重派生**(哪怕字符串拼法一模一样)。
- **H-3**:整体 4xx **只用于入参本身坏**(zod 不过);⛔ **不得因某条 ref 解析失败而整单 4xx**。

### ⭐ 比对式(c-1-fix 后定形,Fable 2026-08-24 ⑤)

```
excerpt === currentUnitText.slice(startOffset, endOffset)
```

- **左边 `excerpt` 是收据里的切片**(c-1-fix 已把它从「整段 unit 文本」改为切片,并更名 `text` → `excerpt`);
- **右边是当前文本按同样 offsets 取的切片** —— ⛔ **不是整段 unit 文本**。

📌 **机械的严格字符串相等** —— ⛔ 不做 trim / 归一化 / 模糊匹配 / 相似度 / 大小写折叠。**零模型、零 OCR。**

### ⚠️ offsets 被前文编辑推移 ⇒ **如实报 `text_drifted`,这是有意语义不是缺陷**

若用户在选区**之前**插入或删除了文字,offsets 指向的窗口会整体错位,切出来的是**别的字**。
⇒ 比对不等 ⇒ **报 `text_drifted`,正确**。

⛔ **不得**为此做「滑动窗口找回原文」「模糊重定位」「按 excerpt 全文搜索」之类补偿 —— 那是**锚时代**的能力(设计 v1 §4 / 段计划 §4「不做」)。**本单只如实报告位置与内容是否仍然对得上,不负责把它找回来。**
📌 **这一句请 builder 在 `## Result` 里复述一遍**,以证明它没有把「报告漂移」误解成「修复漂移」。

---

## K 系 killer(**均为「对本单点名 killer 的单刀验红」= P1;⛔ 单刀、只对点名机关、不自由巡猎、不多轮**)

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐ **端到端正控** | 真实 `/api/mcp` 调 `resolve_selection`,一条有效 ref ⇒ `found` + 身份齐 | 令 service 恒返回 `missing` ⇒ 红 |
| **K-2** ⭐⭐ **裁定 B 的守卫** | **令实现把非本人 ref 返回一个可区分的第四类值**(如 `forbidden`)⇒ **须红** | **禁令不配刀就是口号。** 断言须落在「foreign 与 nonexistent 的返回值逐字节相同」上 |
| **K-3** ⭐⭐ **裁定 C 的守卫**(防「字段在、但没人用它」) | **把 `textFlowIdForBlock` 的 import 换成本地重派生的同名函数**(字符串拼法一致)⇒ **须红** | ⭐ 这是**静默字面量的反向守卫**;断言须锁**符号来源**(同源 import),⛔ 不得只断行为 |
| **K-4** | **deleted unit ⇒ `missing`**(裁定 A) | 令它返回 `text_drifted` ⇒ 红 |
| **K-5** | **`text_drifted` 只在「位置在、文本变」** | 令 block 不存在时也返回 `text_drifted` ⇒ 红 |
| **K-6** | **一条坏 ref 不炸整单**(H-3) | 令某条 ref 解析失败时 throw ⇒ 红(须证明**其余 ref 仍返回各自的态**) |
| **K-7** ⭐ **零语义提取**(§3.1 D / 同 b-1) | ①**既有投影字节等价**:提取前后 `textFlowProjection` 输出逐字节相同;②**提取非复制**:全仓该解析约定**只此一份** | ①令提取改变过滤语义(如放开 `deleted`)⇒ 红;②令 resolve 自带一份副本 ⇒ **须红** |
| **K-8** | **只读**:调用后 `operation_batches` 行数**不变** | 令它写一笔收据 ⇒ 红 |
| **K-9** | **ownership 最小正控**(P0–P3 档下的唯一一条) | B 用户携 A 的 ref ⇒ **逐条 `missing`**,且 **A 的 note/block 逐字段不变**;⭐ **阳性对照:A 自己那条要能 `found`**(证明探针不是恒 missing) |

**红的性质**:目标 `AssertionError` 或真实 HTTP 后果,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;HTTP 刀须**从真实 Express 触发**;每刀独立恢复后再取绿。

---

## 边界

**允许**:⭐ **`client/src/pages/Notes/canvasEngine/selectionReceiptProjection.test.ts` 仅 S0 点名的那一条断言**(⛔ 该目录其余一切仍是禁区,**尤其同目录的 `selectionReceiptProjection.ts` 产品投影**)· `server/src/toolFace/registry.ts`(+1 条)· `server/src/mcp/bindings.ts`(+1)· **新** resolve service · **新**共享解析模块 · **`server/src/services/items.ts` 仅 §3.1 D 点名的一个 hunk**(外提 + import 回接,零语义)· manifest 重生成 · 相应测试。

**⛔ 不得**:碰 `items.ts` 的**其余部位**(尤其那处把 `pool_scope_kind` 写成 SQL 字面量的 INSERT —— **修理属设计级工程,整体推迟**)· 改 schema/migration · 改收据轴或 `statusForTier` · 碰 transport 骨架的 Host/Origin/auth 段 · 碰 selection 既有消费者 · 碰 c-1 的客户端投影 · 做锚池/晋升/几何/跨 note 选区 · 碰 `docs/agent-ops/`(**唯一例外:向本工单追加 `## Result`**)。

**越界即停,标 `needs: claude`。**

---

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **ownership 输入矩阵**(多用户×多 ref 组合、越权 note_id 信封、跨 course ref) | 「越权面的组合漏径」—— 现只留 K-9 一条最小正控 | P2 不扩 |
| **ownership 守卫的 mutation**(移除 `user_id` 条件 / 放宽归属判断) | 「归属守卫是否承重」 | P3 停做(**另见 TD-19:该类内容会撞上游过滤器**) |
| **多轮 refute / 自由巡猎** | 「点名 killer 之外的未知漏径」 | P3 停做 |

⇒ 调度方按此在 `current-state/deferred-tests.md` 追指针行。**若你实际又略过了本表之外的东西,必须在 Result 里点名。**

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14,**回执不得声称已强制**)· TD-6 · **TD-19/20**(ownership 类 mutation 本档停做,**不得声称已验**)· TD-16 · TD-12(EPERM:`test:v2` 首跑 5 个 image fixture 会 EPERM,用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,⛔ **不得改测试或产品语义代偿**)。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照(**K-2/K-9 是重灾区** —— 「都返回 missing」与「探针恒 missing」输出相同);**确认命中不是来自你自己刚写进去的东西**。
⭐ **凡阴性结论(「没有」「零条」「不出现」)至少要有第二个独立来源同意** —— 空集同时是「真的没有」和「我没看见」的合法输出。
⛔ ⭐ **本单任何断言不得以 `items.ts` 中「入参被使用」为前提** —— 该文件有一处 INSERT 把列写成 SQL 字面量、入参被完整校验后忽略;**以「参数传了就生效」为前提的断言会建在流沙上**。
**锁**:`.codex-tmp/builder.lock.d` 由发单方(opus)持有 —— **不取锁、不写 `owner.json`、不删锁**。
📌 dev 服务在 `:3001`/`:5173` 跑着(调度方所有,**⛔ 不要杀**);需真实 UI/server 请另起隔离端口并自清(**若中途被终止,遗留物形状是 junction + config;清理按 TD-13「先枚举 ReparsePoint、解出目标、非递归解链」**)。
📌 porcelain 对 `useNoteCanvasRuntimeController.ts`、`projections.ts` 有 stat/EOL 假阳性(blob 等于 HEAD);判真改用 blob 哈希或 `--numstat`;`grep -c` 数**行数**不是**出现数**。
📌 **提交完整性**(单内指令):改了 handoff/文档就跑 `docs:index` 并**一起交**;生成件是 tracked 的 ` M`,不在 `??` 里;**门禁跑在工作树、提交的是暂存树,两者可以一绿一红**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → `test:mcp-transport` → `test:trash-notes-tool` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:K-1…K-9 **各自**先红后绿两段输出(**K-2 须证明 foreign 与 nonexistent 返回值逐字节相同**;**K-3 须证明断言锁的是符号来源而非行为**;**K-7 须给字节等价与「全仓只此一份」两项证据**)· `items.ts` 的 diff **仅一个 hunk 且零语义**的证明 · 只读(`operation_batches` 零增)的证明 · 门禁逐条收据 · 触及面 diff vs 申报 · **每条阴性断言的阳性对照** · **若略过了「本单按新档略过」表之外的东西,点名申报**。

## Result

### 状态

`needs: claude` —— 开工核验即触发「越界即停」。未实施 S0–S3，未改产品码、测试、manifest、锁或运行中的服务；K-1–K-9 与门禁因此未执行。header 按工单纪律保持不动。

### 阻塞 A：K-8 /「只读不写收据」与基线 transport 逐字冲突

- 基线 `a6cc98d` 的 `server/src/mcp/transport.ts` 中，`dispatchToolCall` 对执行态调用在 binding 返回后无条件调用 `receiptWriter({ tier: 'immediate', ... })`；registry / manifest / binding 均无逐工具免收据 seam。
- 同基线 `server/src/__tests__/v2McpTransport.test.ts` 的 K-0 真实 Express 正控明确断言 `list_notes` 调用后存在 `operation_batches` applied receipt。故 `list_notes` 在当前基线上不是「零收据」先例。
- 因而，在不改 transport / 收据轴的允许面内，真实 `/api/mcp` 的 `resolve_selection` 不可能同时满足 K-1 与 K-8（调用完成且 `operation_batches` 行数不变）。可行的产品级解都需要扩大合同：增加显式 receipt policy 并让 transport 遵守，或在 transport 按工具名特判；二者均越出本单边界。binding/service 做「写后删除」既仍发生写入，也违反只读语义，未采用。

### 阻塞 B：H-2 / K-3 的同源符号不在 server 可导入边界内

- CodeGraph 与独立文件扫描一致：`textFlowIdForBlock` 的唯一实现位于 `client/src/pages/Notes/canvasEngine/textFlowService.ts`；`server/src` 与 `shared` 当前没有同源导出。
- `server/tsconfig.json` 把 `rootDir` 限于 `server/src`，只 project-reference `../shared`。server 直接 import 客户端源码不是可交付的双-tsc / 生产产物路径。
- 在新 server 模块重写同样的字符串函数正是 H-2 禁止的本地重派生；真正同源需要把 helper 下沉到 `shared`，并改客户端 `textFlowService.ts` 为 import/re-export，但该客户端产品文件不在本单允许面内。

### 需要裁定

请调度方同时补裁：①为只读工具开放哪一种明确的 transport-level 免收据机制与相应允许面；②允许把 `textFlowIdForBlock` 下沉到 `shared` 并回接客户端，或另给一个已经同源、server 可导入的权威符号路径。两项未裁前继续施工必然越界。

### 交付状态

- `npm.cmd run docs:index`：PASS，0 个 INDEX 变化。
- `npm.cmd run docs:check`：PASS。
- handoff UTF-8 fatal decode：PASS，且无 replacement bytes。
- 本会话对 `.git` 为只读；精确 `git add -- <本工单>` 被 `.git/index.lock: Permission denied` 拒绝，故未能暂存或提交。工作树中的本单真实 diff 为本 `## Result` 追加；三个已知 EOL 假阳性的工作树 blob 均与 `HEAD` 相同，`.claude/settings.local.json` 未触碰。
