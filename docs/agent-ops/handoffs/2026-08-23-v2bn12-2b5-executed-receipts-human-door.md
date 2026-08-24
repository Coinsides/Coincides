> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-23 裁「缺陷-1 分诊 🅰;补单 b-5 由 Opus 拟发」log #36) | re: v2bn12-2b-5 | date: 2026-08-23

# V2.BN.12.2b-5:已执行收据的**人类入口**(补上 Revert 那扇门)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## 上游 —— 本单为什么存在

**b-4 旅程实走(`analysis/2026-08-23-v2bn12-2b4-journey-sheet.md`)判 A 9/12 + B 6/8,通过线未达成。** 唯一根因:

> ⛔ **缺陷-1:applied 收据没有人类入口 ⇒ Revert 在产品内不可达。**(J5=0 · B3=0 · J6 扣 1,**同一个缺陷,不是三个**)

**三条互相独立的证据(实走亲验)**:
1. 队列页只列 `proposed`;Apply 后该条**从页面消失**;
2. `GET /api/tool-receipts?status=applied`(及 `reverted`/`dismissed`)**一律 400** `Only proposed tool face receipts can be listed`;
3. **全客户端搜 `revert` 零命中**(阳性对照:同目录 `apply|dismiss` **19 处** ⇒ 探针有效)。

⇒ **人拿不到 applied 收据的 id,就走不到 Revert。** 走查方是从只读 DB 副本取 id、直调 API 才走完那两步的。

**⚠️ 定性(Fable 裁,写在这里免得被误读)**:**分诊 🅰 正确性;是计划层缺口,锅在 plan(b-3 范围只写了 `proposed` 队列),不是 builder 漏做,也不是回归。** revert 的**人类面从来没有被任何一张工单点名过**。
**⇒ 十轮单元与复核全绿是正常的 —— 它们手里一直握着收据 id。**

---

## 调度方已亲验的四条实况(**行号会漂,按符号定位**)

| # | 实况 |
|---|---|
| 1 | ⭐ **服务层已经支持任意 status**:`listToolFaceReceipts` 的 SQL 是 `WHERE user_id = ? AND source_type = 'mcp' AND status = ?` —— **本用户过滤已在服务层,且 status 是参数**。挡住的**只有路由里那道白名单**。 |
| 2 | ⛔ **路由白名单位置**:`routes/toolReceipts.ts` 的 `router.get('/')` 里 `if (status !== 'proposed') throw new AppError(400, …)`。**本单只放开它,不下沉过滤、不改服务层 SQL。** |
| 3 | ⭐ **`queueItem` 投影目前不含 `status` / `applied_at` / `reverted_at`** —— 只有 `id/tool/tier/resources/intended_input_summary/created_at`。「已执行」视图**需要 status**(区分 applied / reverted / dismissed),故须扩这个投影。 |
| 4 | **客户端现状**:`toolReceiptsApi.ts` 只有 `listProposedToolReceipts`(status 写死 `'proposed'`)、`applyToolReceipt`、`dismissToolReceipt` —— **没有 revert**。页面文件:`client/src/pages/ToolReceipts/{ToolReceipts.tsx, toolReceiptsApi.ts, ToolReceipts.module.css}`。 |

---

## S1:服务端 —— 放开 status 白名单 + 扩投影

1. `router.get('/')` 的判断改为**白名单**:`proposed` / `applied` / `reverted` / `dismissed` 四者放行,**其余仍 400**(⛔ 不得改成「什么都收」)。
2. 放行的 status **原样传给 `listToolFaceReceipts`**(它已按 `user_id` 过滤)。⛔ **不得改服务层 SQL、不得把过滤下沉或上移。**
3. `queueItem` 扩三个字段:**`status`**、`applied_at`、`reverted_at`。⛔ **不得移除既有六个字段**(客户端队列页在用)。

⛔ **不改 `revertTrashNotesReceipt` 的任何语义**(三重守卫:非本人 403 / 非 `trash_notes` 409 / 非 `applied` 409)。本单只是给它接一个人类入口。

## S2:客户端 —— 最小「已执行」视图 + Revert 按钮

- `toolReceiptsApi.ts`:把 `listProposedToolReceipts` 泛化为**接受 status 参数**的列表函数(⛔ 保留既有调用点可编译),并**新增 `revertToolReceipt(id)`** 调 `POST /tool-receipts/:id/revert`。
- `ToolReceipts.tsx`:在既有队列之外加一个**最小「已执行」视图**(标签页/分段控件皆可,取现有设计语汇):
  - **`applied`**:显示工具名 / 摘要 / 影响资源数 / 时间,并带 **Revert 按钮**;
  - **`reverted`** / **`dismissed`**:**只读留痕**(⛔ 无操作按钮)。
- **Revert 成功后**:该条应从「已执行」转入 `reverted` 留痕;页面计数随之更新。

⛔ **不做**:批量 revert · 分页 · 搜索/筛选器 · 页边标记点 · 任何 12.4 流面的东西。**最小即可 —— 本单的验收是「人能走到」,不是「好用」。**

---

## K 系 killer

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐⭐ **本单的存在理由** | **「id 从哪来」端到端**:从**登录后的 UI** 一路点到 revert 成功 —— 打开队列 → 切到「已执行」→ 看见那条 applied → 点 Revert → **note 真的回来**。**全程不碰 DB、不手工拼 id。** | 把「已执行」视图去掉(或不显示 applied)⇒ **红**。⭐ **这一条就是 b-4 走查暴露的那个缺口的守卫,必须端到端从 UI 触发。** |
| **K-2** | **非本用户不可列**:B 用户的 applied 收据**不出现在** A 用户的列表里 | 去掉 `user_id` 过滤(或让路由绕过服务层)⇒ 红。**阳性对照:A 自己的那条要能列出来**(证明探针不是恒空) |
| **K-3** | **非本用户不可撤**:A 对 B 的收据点 revert ⇒ **403,且 B 的 note 不变** | 放宽 ownership ⇒ 红(须在 **note 表状态**上验,不只看返回码) |
| **K-4** | **revert 后转视图**:applied → `reverted`,该条离开「已执行」进入留痕,**不再有 Revert 按钮** | 令 revert 后仍留在 applied 视图 ⇒ 红 |
| **K-5** | **页面计数与 API 一致**:四种 status 各自的页面计数 == `GET ?status=<s>` 的响应体条数 | 令页面用本地缓存不重取 ⇒ 红 |
| **K-6** | **白名单是白名单**:未知 status(如 `?status=bogus`)**仍 400** | 改成「什么都收」⇒ 红 |
| **K-7** | **既有队列面未退化**:`proposed` 视图仍是 Apply / Dismiss / 跳到现场三按钮,行为不变 | 删任一按钮或改其语义 ⇒ 红 |

**红的性质**:目标 `AssertionError` 或真实 HTTP 后果,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;服务端 killer 须**从真实 Express 触发**。

📌 **K-1 是本单唯一不可替代的一条** —— 它验的正是「十轮单元全绿却漏掉的东西」:**测试手里一直有 id,而真人没有。** ⛔ 不得用「构造一个 id 然后调 API」来代替它。

---

## 边界

**允许**:改 `server/src/routes/toolReceipts.ts`(白名单 + `queueItem` 投影)· 改 `client/src/pages/ToolReceipts/` 三个文件 · 相应测试。

**⛔ 不得**:改 `server/src/services/toolFaceReceipts.ts` 与 `toolFaceReceiptRevert.ts` 的语义 · 改 schema / migration / registry / `output_schema` · 碰 `server/src/mcp/`(b-2b-2 面)· 碰 12.1 线 / v1 其余线 · 做批量 revert / 分页 / 筛选器。

**越界即停,标 `needs: claude`。**

## ⚠️ 基线缺口:不得代偿

TD-14(`scopes` 未强制,**回执不得声称已强制**)· TD-6(**多资源 revert 非原子** —— 本单不解决,不得声称已解决)· TD-12(EPERM:`test:v2` 首跑 5 个 image fixture 会 EPERM,用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,**⛔ 不得改测试或产品语义代偿**)· TD-16。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照;**确认命中不是来自你自己刚写进去的东西**。
⭐ **凡阴性结论(「没有」「零条」「不出现」),至少要有第二个独立来源同意** —— 走查方本轮栽过:只读了 `.db` 没带 `-wal`,得到一个「看起来完全正常的空集」,差点判成产品缺陷;是**API 说有、DB 说没有**两边打架才抓住的。**空集同时是「真的没有」和「我没看见」的合法输出。**
**锁**:取锁失败即停,⛔ 不覆盖 `owner.json`、不删非你所写的锁。
📌 porcelain 对 `useNoteCanvasRuntimeController.ts`、`projections.ts` 有 stat/EOL 假阳性(blob 等于 HEAD);判真改用 blob 哈希或 `--numstat`(**`--stat` 看不见 untracked**);`grep -c` 数**行数**不是**出现数**。
📌 **提交完整性**:改了 handoff/文档就跑 `docs:index` 并**一起交**;生成件是 tracked 的 ` M`,不在 `??` 里;**门禁跑在工作树、提交的是暂存树,两者可以一绿一红**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → `test:v2` → `test:trash-notes-tool` → `test:mcp-transport` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:K-1…K-7 **各自**先红后绿两段输出(**K-1 须证明全程从 UI 触发、未手工拼 id**)· `queueItem` 既有六字段未被移除的证明 · 服务层 SQL 与两个 service 文件的 `git diff --numstat` 为空的证明 · 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result

> builder: Codex | completed: 2026-08-23 | baseline: `8731a06` | working HEAD: `3cd9eb0`

### 结论

已补齐缺失的人类门：登录用户现在可在 `Tool Receipts` 的 `Executed` 视图看见本人 `applied` 收据并点击 **Revert**；成功后页面重新从四个 status API 取数，该条变成只读 `reverted` 留痕。`reverted` / `dismissed` 没有操作按钮，原 `proposed` 的 Apply / Dismiss / Jump to scene 三按钮保留。

服务端只改了路由白名单与 `queueItem` 投影：放行且仅放行 `proposed | applied | reverted | dismissed`，其余仍 400；已窄化的 status 原样传入既有服务。没有改服务层 SQL 或 revert 语义。

### 实现面

- `server/src/routes/toolReceipts.ts`
  - 新增四值 type guard；未知 status 抛 `AppError(400, 'Unsupported tool face receipt status')`。
  - `listToolFaceReceipts({ userId: req.userId!, status })` 继续由既有服务按本人过滤。
  - `queueItem` 在原六字段后只追加 `status / applied_at / reverted_at`。
- `client/src/pages/ToolReceipts/toolReceiptsApi.ts`
  - 新增四态 `ToolReceiptStatus`、泛化 `listToolReceipts(status)`、新增 `revertToolReceipt(id)`。
  - 保留 `listProposedToolReceipts()` 薄 wrapper，既有调用面仍可编译。
- `client/src/pages/ToolReceipts/ToolReceipts.tsx` / `.module.css`
  - 新增 Proposed / Executed 两页签与 applied / reverted / dismissed 三态计数、状态/时间留痕。
  - `applied` 才渲染 Revert；`reverted` / `dismissed` 渲染 `Read only`。
  - Apply / Dismiss / Revert 成功后均 `await refresh()`，四态由四次 GET 重取，不做本地搬行。
- 测试
  - 新增真实 Express 四态列表、本人/外用户隔离、九字段投影、未知 status 400 断言。
  - 新增客户端两组测试，覆盖 K-4/K-5/K-7 与 applied-only Revert。

### K-1～K-7：先红后绿

#### K-1（唯一不可替代的真人门）

**RED（基线真人页）**：登录后的原页面只显示 `0 proposed / Queue clear`，没有 Executed 入口或 Revert；独立的 CodeGraph 源码探针同时显示客户端 proposed-only、无 revert caller，路由对 applied/reverted/dismissed 返回 400。正控是同页 `Tool Receipts`、Refresh、Apply/Dismiss 既有入口均可见，故不是页面/探针失效。

**GREEN（真实浏览器、真实 server、真实 UI）**：因原 :3001 是非 watch 且 Windows 对其 PID 返回 `Access is denied`，没有强杀；临时隔离启动当前工作树 server `:3002` 与 Vite `:5174`，通过可见登录表单正常登录。前置只用 REST 动态找 `testset` 的两篇 active user note，再由 MCP 生成 proposed；脚本输出为：

```text
{"proposalCreated":true,"selectedNoteCount":2,"receiptIdReadOrUsedAfterSetup":false}
```

前置没有查 DB、没有打印/保存/复用 MCP 响应中的 receipt id。之后的人类链全部在产品 UI 中完成：

```text
Tool Receipts → Proposed 1 → Apply
→ testset / Trash 显示 2 篇：
  V2.BN.12 editing root-cause repro 2026-08-19
  Untitled note
→ 侧栏 Tool Receipts → Executed 4
→ Applied 1 / Reverted 3 / Dismissed 0
→ 唯一 Revert 按钮 → 点击
→ Applied 0 / Reverted 4 / Dismissed 0 + “Receipt reverted”
→ 侧栏 testset / Notes 2，再次看见上述两篇原题 note
```

Revert 全程由行按钮携带内部 id；没有 DB、没有手工拼 id、没有直调 revert API。验证后已停止临时 `:3002/:5174`，删掉临时配置/造数脚本，浏览器页签恢复 `http://localhost:5173/#/tool-receipts`；`netstat` 只剩原 `:3001` PID 31268 与 `:5173` PID 32424。

#### K-2（非本用户不可列）

**RED mutation**：仅在路由临时保留 A 的列表并额外拼入 B 用户列表，真实 Express 测试得到 `AssertionError [deepStrictEqual]`：expected 仅本人 applied 一条，actual 多出外用户 applied 一条。红是业务后果，不是语法/模块错误。

**GREEN**：恢复 `listToolFaceReceipts({ userId: req.userId!, status })` 后定向测试 `1/1 pass`。阴性结论有两个独立读取面同意：真实 HTTP 列表与直接调用既有 `listToolFaceReceipts(A, applied)` 都包含 A 本人、排除 B；正控 `readToolFaceReceipt(B)` 明确证明 B 的 applied 收据真实存在，不是恒空。

#### K-3（非本用户不可撤）

**RED mutation**：路由临时把 revert 的 userId 固定成收据 owner，外用户真实 HTTP 请求由预期 403 变成 200：`AssertionError: 200 !== 403`。

**GREEN**：恢复 `req.userId!` 后定向测试 `1/1 pass`；真实 HTTP 为 403，同时 DB note 状态仍 `trashed`、receipt 仍 `applied`。返回码与持久状态是两个同意源，正控为同 fixture 本人 revert 成功并恢复 note。

#### K-4（revert 后转只读留痕）

**RED mutation**：临时跳过 revert 后的 `refresh()`，客户端测试红：`expected spy to be called 8 times, but got 4 times`，applied 行仍留在旧快照。

**GREEN**：恢复后客户端定向 `2/2 pass`；mock API 将 applied 移入 reverted，页面为 `Applied 0 / Reverted 2`，原摘要仍在且 Revert 消失。真人 K-1 独立得到 `Applied 0 / Reverted 4` 和只读行。

#### K-5（页面计数来自四态 API）

**RED mutation**：临时把 dismissed 槽错误读取成 proposed，页面变成 `Executed 4`，测试找不到期望的 `Executed 3`，以真实计数错位红。

**GREEN**：恢复四次 `listToolReceipts('proposed'|'applied'|'reverted'|'dismissed')` 后客户端定向 `2/2 pass`；首次四次、revert 后再四次，共 8 次 API 取数，三态计数与 mock API 数组一致。

#### K-6（严格白名单）

**RED mutation**：临时让 guard 接受 `bogus`，真实 Express 测试红：`AssertionError: 200 !== 400`。

**GREEN**：恢复四值 guard 后定向 `1/1 pass`，`?status=bogus` 为 400；独立静态源是 guard 源码仅列四个字面量，正控为四个合法 status 均真实 HTTP 200。

#### K-7（proposed 面未退化）

**RED mutation**：临时删除 Dismiss 按钮，客户端测试红：`Unable to find role="button" and name "Dismiss"`。

**GREEN**：恢复后客户端定向 `2/2 pass`；两个 proposed 行均有 Jump to scene / Apply / Dismiss，测试分别点击 Apply 与 Dismiss 并断言原 receipt 参数。真人页也看见三按钮正控。

上述 mutation 均用 `apply_patch` 立即归复原状并在同一目标测试上重跑绿；builder 预检不替代 reviewer 的独立 M-1。

### 投影与服务层未改证明

`queueItem` 的最终九字段为：

```text
id, tool, tier, resources, intended_input_summary, created_at,
status, applied_at, reverted_at
```

原六字段全部保留。真实 Express 测试对四个 status 的首条响应执行精确 `Object.keys(...).sort()` 九键断言，并逐态 200/status/created_at；因此不是只靠源码目测。

既有服务 SQL 仍在 `server/src/services/toolFaceReceipts.ts:135`：

```sql
WHERE user_id = ? AND source_type = 'mcp' AND status = ?
```

两个禁止修改文件的 `git diff --numstat` 为 0 行；working / HEAD / `8731a06` 三方 blob hash 完全相等：

```text
toolFaceReceipts.ts      b535ec153bfd18299ad1782bc72d0e33adf054fb
toolFaceReceiptRevert.ts 74e4d2e94c28ffb075a6cb10b56dcc3288c8947b
```

### 门禁收据（最终工作树）

| 命令 | 结果 |
|---|---|
| `npm run docs:check`（docs-first） | exit 0；object inventory 最新 |
| `npm run verify:v2-bn8-runtime` | exit 0；重复跑并保留尾部退出码；含 build/runtime/docs/diff/secret 门 |
| client `tsc --noEmit` | exit 0 |
| server `tsc --noEmit` | exit 0 |
| `npm run test:unit` | 21 files / 213 tests pass |
| server `test:v2` | 270/270 pass；`CANVAS_ASSET_DIR` 为 OS temp 的唯一 TD-12 绕行 |
| server `test:trash-notes-tool` | 41/41 pass |
| server `test:mcp-transport` | 24/24 pass |
| `test:tool-face-registry` | 4/4 pass |
| `test:tool-face-manifest` | 10/10 pass |
| `check:tool-face-manifest` | 2 条 public，fresh |
| `test:tool-face-parity` | 10/10 pass |
| `check:tool-face-parity` | PASS，2 public entries |
| `git diff --check` | exit 0（仅既有 LF/CRLF warning） |
| `check:changed-file-secrets` | pass |

React Router v7 future-flag warning 与既有 natural-writing rollback 诊断仍出现，但测试均绿；没有用产品/测试语义修改来压 warning。

### 触及面与范围排除

申报实现文件：

```text
server/src/routes/toolReceipts.ts
server/src/__tests__/v2TrashNotesTool.test.ts
client/src/pages/ToolReceipts/toolReceiptsApi.ts
client/src/pages/ToolReceipts/ToolReceipts.tsx
client/src/pages/ToolReceipts/ToolReceipts.module.css
client/src/pages/ToolReceipts/ToolReceipts.test.tsx (new)
本 handoff Result（`docs:index` 已跑，报告 0 个 INDEX 写入）
```

未改 schema / migration / registry / output_schema / `server/src/mcp/` / 两个 service 文件；未做批量 revert、分页、搜索或筛选器。TD-14 scopes **仍未强制**；TD-6 多资源 revert **仍非原子**；TD-12 只用环境变量指向 OS temp；TD-16 未处理。没有声称这些基线缺口已解决。

开工前已有且未归属本单的工作树项保持原样：`docs/agent-ops/adjudication-discipline.md`、`.claude/settings.local.json`；`useNoteCanvasRuntimeController.ts` 与 `projections.ts` 的 porcelain 项为已知 EOL/stat 假阳性（`--numstat` 空 / blob 等于 HEAD）。`docs/agent-ops/INDEX.md` 开工前已有改动；本单运行官方 `docs:index` 后报告 0 变化，未覆盖他人内容。

锁 `.codex-tmp/builder.lock.d` 非本会话所有；未取锁、未写 `owner.json`、未删锁。没有 commit / push / PR。header 按 M-2 保持 `ready`，未翻；等待 reviewer 独立 M-1 与调度方判定。

## Review

> reviewer: Codex（洁净室） | reviewed: 2026-08-23 | target: `e06b6a1` | prior baseline: `8731a06` | target parent: `3cd9eb0`

### 判定

**FAIL，不建议放行；产品方向成立。** 本单的人类门在当前产品中确实走通，但目标提交含 **1 BLOCKER（边界/授权）+ 1 HIGH（真实白名单缺陷）+ 2 MED（永久护栏缺口）**；LOW 为 0。放行权仍留 Fable。

### Findings

#### BLOCKER-1 · 边界违规 / 授权链：目标提交夹带权威 Ops Protocol 修改

`e06b6a1` 相对其直接父提交的事实不是阴性推断：

```text
git diff --numstat 3cd9eb0 e06b6a1 -- docs/agent-ops/adjudication-discipline.md
6       1       docs/agent-ops/adjudication-discipline.md
```

该 diff 把「二源分则」及理由写进 `docs/agent-ops/adjudication-discipline.md:67-72`。这份文件头明确为 `active / Ops Protocol / Authoritative`；而本工单边界只允许 route、`client/src/pages/ToolReceipts/` 与相应测试（本文件 `## 边界`），没有允许改裁定协议。`AGENTS.md:45` 又明确规定任何 agent 操作指令修改须 Henry 本人直接指示、同侪不可转授。独立正面归因证据也与 Henry 直示不符：新增条文自署「Fable 裁定入卡，Opus 补」，`claude-log/2026-08-23.md:249` 同样记作「采，Opus 写」；同一日志 `:244` 还明确承认这类配置同侪不能代授权。

`## Result` 把该文件申报为“开工前已有且保持原样”，不能改变目标 commit 实际包含该变更的事实；无论工作树字节最初由谁写入，复核对象 `e06b6a1` 已把它提交进来。建议从 b-5 目标提交移出；若确需制度化，须取得 Henry 对这项全局协议修改的直接指示并另行落单。

#### HIGH-1 · 技术缺陷：数组形 `status` 静默降级为 `proposed`，白名单不是闭集

真实 Express + OS-temp DB 的独立 HTTP 矩阵：

| 输入 | 实际 |
|---|---:|
| `proposed` / `applied` / `reverted` / `dismissed` | 各 200 |
| `status=` / `bogus` / `APPLIED` / `Applied` | 各 400 |
| `status=applied&status=reverted` | **200** |
| `status[]=applied` | **200** |

重复参数探针同时放入本人 proposed 与 applied 正控；返回体只含 proposed id，证明不是“错误码写错”，而是请求被真实按 proposed 执行。根因在 `server/src/routes/toolReceipts.ts:108`：任何非 string 都回退为默认 `'proposed'`。现有永久测试只覆盖 `bogus`。

施刀把 `isListableReceiptStatus` 恒置 `true` 后，真实 Express 用例在 `v2TrashNotesTool.test.ts:505` 以目标 `AssertionError: 200 !== 400` 红；恢复后 1/1 绿。建议只让 `undefined` 使用默认 proposed；凡参数已提供但不是单个 string，一律 400，并永久加入空串、大小写、重复参数与 `status[]` 矩阵。

#### MED-1 · 测试护栏：R3 产品当前安全，但永久 K-3 没有验到指定的 B 行逐字段不变

洁净室精确探针当前为绿：造 A/B 两用户、B course、B applied receipt 与 B note；A 的四态 API 列表和直接服务查询都不含 B receipt，且两路都看见 A 自己的 applied 正控。A revert B 得 403；B note 的 `SELECT *` 14 字段 JSON 在前后逐字段/逐字节相同，B 自己的 `GET /api/notes/:id` 响应体也前后相同，receipt 仍为 applied。这里“未出现/未改变”分别有 API ↔ service、DB 全行 ↔ B 自身 API 两个来源同意。

但仓内 `K-5b real HTTP revert rejects a foreign receipt independently` 是反方向（B token 请求 A receipt），并且只断言 `noteStatus(...) === 'trashed'`，没有造 B note、没有比较 notes 全行。当前实现没泄漏，但所要求的回归护栏未固化。建议永久加入工单指定方向 A→B、四态列表阳性/阴性对照，以及 notes 全字段 before/after。

#### MED-2 · 测试护栏：Dismiss 重取与 Jump 语义都可退化而 2/2 客户端测试仍绿

当前产品本身为绿：真实浏览器中 Apply、Dismiss、Revert 后各观察到四次新的 status GET；`receiptsByStatus` 唯一写入点在 `refresh()`，没有本地搬行。另造 fresh proposed 后，从 UI 点击 `Jump to scene`，浏览器从队列页到达预期 `/notes/ccfb4713-…`。

但两把独立刀均存活：

```text
await refresh() -> if (action !== 'dismiss') await refresh()  => 2/2 pass
Jump onClick -> () => undefined                               => 2/2 pass
```

现有 K-7 只查三按钮存在/可用，不点击 Jump、不断言 pathname；Dismiss 只断 API mock 收到 id，不断言再次取数或行消失。建议分别断言 Dismiss 后四态 list 调用数/页面状态，以及在 router location 上断言 Jump 的目标 note。作为对照，Revert 跳过 refresh 的刀已在 `ToolReceipts.test.tsx:119` 以目标 `AssertionError: expected spy 8 times, got 4` 红，恢复后 2/2 绿。

### R1–R8 独立复核

| 位点 | 结论与关键证据 |
|---|---|
| **R1** | **PASS。** 隔离 `:3015` real server + real built client、Chrome CDP `:9230`。前置只用 REST 创建两篇 note，再发 MCP proposal；MCP `Response` 只检查 HTTP 成功，**完全没有调用 `.json()` / `.text()`，没有 DB 查询，也没有读取、保存或复用 receipt id**。之后只作可见 UI 点击：登录 → Tool Receipts → Proposed 1 → Apply → Project/Trash 2 → Executed/Applied 1 → Revert → Applied 0 / Reverted 1 / Read only / 无 Revert → Project/Notes 2，两个标题都回来。第二来源是驱动脚本静态审计与浏览器动作/页面轨迹：驱动中没有 receipt 变量或 DB 接口，操作均由页面按钮触发；产品内部当然会用自身行 id 发请求，但 reviewer 没读或供应它。移除 Executed 合并中的 `...receiptsByStatus.applied` 后，用 fresh proposal 重走：UI 仍报 Applied 1，但没有 applied 行/没有 Revert，notes 留在 Trash 2；这是目标产品后果，不是语法/模块错误。恢复 blob 后同链再绿。`receiptIdReadOrUsedAfterSetup: false`。 |
| **R2** | **FAIL → HIGH-1。** 字符串白名单与恒真刀有牙，但数组输入真实 200 并回退 proposed。 |
| **R3** | **产品 PASS，永久护栏 MED-1。** 跨用户四态不可列、403、B note 全行不变均由双来源确认；route 仍只调用 `listToolFaceReceipts`。 |
| **R4** | **PASS。** `queueItem` 九键包含原六键 `id/tool/tier/resources/intended_input_summary/created_at`。六字段逐个独立删除：`id` 在 id 列表断言红，其余五个在 exact-key 断言红；六刀均为 `ERR_ASSERTION / AssertionError`，每刀恢复后最终 1/1 绿。新增三键未破 proposed 页。 |
| **R5** | **产品 PASS，永久护栏部分 MED-2。** applied→reverted 后离开可操作区、成为 Read only 且无 Revert；Apply/Dismiss/Revert 三次真实动作后均观察到四态重取。令 Revert 后不 refresh，目标调用数断言红；没有本地 setter 搬行。 |
| **R6** | **产品 PASS，Jump 永久护栏 MED-2。** proposed 页真实保留 Jump / Dismiss / Apply；Apply、Dismiss 与 Jump 均实走。`listProposedToolReceipts()` 仍是 `listToolReceipts('proposed')` 的薄 wrapper；双 tsc 绿。 |
| **R7** | **PASS。** `8731a06..e06b6a1` 及 `e06b6a1..工作树` 对 `server/src/services/`、`db/`、`mcp/`、`toolFace/` 的 numstat 均为空；第二来源 tree OID 前后相同：services `09f26ac…`、db `9d89bb0…`、mcp `b251313d…`、toolFace `63e60c31…`。`toolFaceReceipts.ts` blob 三方同为 `b535ec1…`，SQL 仍是 `user_id + source_type='mcp' + status`；route/CodeGraph 与调用搜索都只见既有 service 路径、无另开列表旁路。`toolFaceReceiptRevert.ts` blob 三方同为 `74e4d2e…`，owner 403 / wrong-tool 409 / non-applied 409 三守卫及其先后顺序未变。 |
| **R8** | **PASS。** 见下表。PowerShell policy 拦截 `npm.ps1` 后改用同义 `npm.cmd`；该次环境失败未计产品红。 |

### Mutation 收据与恢复卫生

| 刀 | 红/绿 |
|---|---|
| Executed 不合并 applied | 真实 UI 无 Revert、Trash 仍 2；恢复后 UI Revert 与 Notes 2 |
| status guard 恒真 | `AssertionError: 200 !== 400`；恢复后定向 1/1 |
| 原六字段逐个删除 | 六刀分别命中 id / exact-key `AssertionError`；每刀独立恢复，最终 1/1 |
| Revert 不 refresh | `AssertionError: expected spy 8 times, got 4`；恢复后 2/2 |
| Dismiss 不 refresh | **漏绿 2/2**，记 MED-2；恢复后 2/2 |
| Jump 变 no-op | **漏绿 2/2**，记 MED-2；恢复后 2/2 |

所有产品刀都在 OS-temp clone `coincides-review-b5-6159db2926194bf3906698fc3a51c8a0` 内执行，client/server 各自 `npm ci --offline`，没有 junction/symlink（reparse point 计数 0）。最终 route / component / API 工作 blob 分别等于 HEAD：`1eac239…` / `e1f0a12…` / `94385dd…`。隔离 server、Chrome 与端口已停；clone、临时 DB/WAL、浏览器 profiles、image fixture 与截图均已永久删除。共享 `:3001/:5173` 未停止或复用；锁未取、`owner.json` 未写、锁未删。

### R8 门禁收据（reviewer 亲跑，docs-first）

| 命令 | 结果 |
|---|---|
| `npm.cmd run docs:check` | docs-first 与 Review 落盘后复跑均 exit 0；`docs:index` 写入 0 个 INDEX |
| `npm.cmd run verify:v2-bn8-runtime` | exit 0；含 213 unit、build/runtime/docs/diff/secret 门 |
| client / server `npx.cmd tsc --noEmit` | 各 exit 0 |
| `npm.cmd run test:unit` | 21 files / 213 tests |
| server `npm.cmd run test:v2` | 270/270；`CANVAS_ASSET_DIR` 仅指向已删 OS temp |
| server `npm.cmd run test:trash-notes-tool` | 41/41 |
| server `npm.cmd run test:mcp-transport` | 24/24 |
| `test:tool-face-registry` | 4/4 |
| `test:tool-face-manifest` | 10/10 |
| `check:tool-face-manifest` | fresh；2 public |
| `test:tool-face-parity` | 10/10 |
| `check:tool-face-parity` | PASS；2 public |

### 跨条耦合扫描

数组 status 缺陷不会绕过服务层 `user_id`，所以未把 R2 误报成 R3 越权；它仍是独立的白名单/路由语义 HIGH。当前 UI 门、SQL 隔离与 revert 三守卫合取后能完成本单目标；TD-14 scopes 未强制、TD-6 多资源 revert 非原子、TD-12 环境绕行与 TD-16 均保持基线状态，未声称解决。即使先补 HIGH 与两组 MED，BLOCKER-1 的提交边界/直接授权问题仍单独阻止放行。
