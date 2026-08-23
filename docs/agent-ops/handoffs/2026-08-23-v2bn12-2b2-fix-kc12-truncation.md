> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(机械级 —— 纯测试断言顺序,无设计裁量;依 operating-workflow 由调度方直接发单) | re: v2bn12-2b-2-fix | date: 2026-08-23

# V2.BN.12.2b-2-fix:K-c12 的断言顺序截断了点名的 revert 后果

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> ⛔ **只改一条测试的断言顺序 / 结构。产品码零改动,断言一条不删不放宽。**

## 上游

- b-2b-2 工单及其 `## Review`(**FAIL(方向成立) 0B/0H/1MED/0L**,唯一 finding = **MED-1**)。
- 复核 Q1/Q2/Q3/Q5/Q6/Q7/Q8 **全 PASS**;产品方向与全部其他位点成立。**本单不碰它们。**

---

## MED-1 是什么(复核亲验,调度方已独立复验)

工单 K-c12 要求的必红形状是:**把 accept 的 `appliedResources(value)` 换成 `proposedResources(entry, input)` ⇒ 须表现为「b-3 的 revert 一条都恢复不了」**。

**实际发生的**:K-c12 在该 mutation 下**确实红了,但红错了地方**。

断言顺序(调度方独立复验,相对 `test(` 起始行):

| 相对行 | 内容 |
|---|---|
| **+25** | `assert.deepEqual(receipt.metadata.resources, [...])` ← ⛔ **mutation 下第一处红,Node 在此停止** |
| +35 | (zero-pending 断言) |
| **+42** | `POST /api/tool-receipts/:id/revert` ← ⚠️ **根本没跑到** |
| +46…+57 | `revert_outcome` / `revert_details` / 最终 note 状态 ← ⚠️ **全部没到达** |

⇒ **常驻测试产出的红是「resources 形状不对」,不是「revert 空转」。**

复核用**仅诊断、不改语义**的一刀坐实(不删不放宽不新增断言,只把既有断言移到 revert 之后):此时才得到目标形状 —— `actual {restored: [], failed: []}` vs `expected {restored:[OLDER_NOTE_ID], failed:[]}`,OLDER note 仍是 `trashed`。诊断刀与产品刀均已独立恢复。

### ⭐ 为什么这值一条 MED,而不是「反正也红了」

**「killer 红了」≠「killer 证明了它该证明的东西」。**

精确地说,缺口**不是**「revert 空转永远抓不到」——若 resources 恰好正确而 revert 坏了,后面那几条断言会执行、也会红。

**真正的缺口是:K-c12 里那几条 revert 断言,从来没有被证明有牙。**

它们**只在绿的情形下跑过**。本单点名 mutation 的全部意义,就是逼它们红一次以证明它们承重;而断言顺序让那次证明**从未发生**。⇒ 它们现在可能是空的(例如断言了某个恒真的东西)、也可能是好的,**我们没有证据**。

**这正是本仓「阳性对照」纪律的镜像**:阳性对照防「探针瞎了但你以为它在看」;本条防「**探针从没被要求看过,你却当它已经看过了**」。⇒ 端到端那一段目前是**未验证**,不是**已验证**。

---

## S1:唯一改动 —— 让 K-c12 的取证不被提前截断

**要求**:调整 K-c12 的**执行/断言结构**,使点名 mutation(`appliedResources` → `proposedResources`)**必须先穿过真实的 `POST /api/tool-receipts/:id/revert`**,并在 **`revert_details` 或最终 notes 状态**上产生红。

**推荐结构(不强制,但须达到同等效果)**:

1. **先取证不断言** —— 把 `receipt.metadata.resources` 等快照读进局部变量;
2. **发真实 revert 请求**;
3. **再一次性断言**:resources 快照、zero-pending、`revert_outcome`、`revert_details`、最终 notes 状态。

⛔ **不得删除、放宽或合并任何既有断言** —— resources 断言与 zero-pending 断言**必须继续存在且继续承重**(见 X-2)。
⛔ **不得改产品码**。
⛔ **不得动 K-c1…K-c11 与其余任何测试**。

---

## K 系必红

| # | 施刀 | 必红 |
|---|---|---|
| **X-1** ⭐ | 把 accept 的 `appliedResources(value)` 换成 `proposedResources(entry, input)` | K-c12 须红,**且红点必须落在 `revert_details` / 最终 notes 状态上**(形如 `restored: []` vs `restored: [<id>]`,或该 note 仍为 `trashed`)。**⛔ 只红在 resources 形状上 = 未达标,须重做。** |
| **X-2** | 令 accept 写一条 `outcome:'pending'` 混进真实 resources(resources 形状被破但 revert 仍可跑) | **resources / zero-pending 断言须仍然红** —— 证明重排没把它们废掉 |
| **X-3** | 恢复全部后 | K-c12 `1/1` 绿 |

**红的性质**:目标 `AssertionError`,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;须**从真实 Express + TCP 触发**。
⛔ 施刀期间对产品码的临时改动**必须全部还原**;交付 diff 里 `server/src/mcp/`、`server/src/routes/`、`server/src/services/` **必须零改动**。

## 边界

**允许**:只改 `server/src/__tests__/v2McpTransport.test.ts` 中 **K-c12 这一条测试**。

**⛔ 不得**:改任何产品码 · 改 K-c12 之外的任何测试 · 删/放宽/合并任何既有断言 · 改 schema / registry / `statusForTier` · 碰 b-3 面。

**越界即停,标 `needs: claude`。**

## ⚠️ 基线缺口:不得代偿

TD-14(`scopes` 未强制)· TD-6(多资源 revert 非原子)· TD-12(EPERM:`test:v2` 首跑 5 个 image fixture 会 EPERM,用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,**⛔ 不得改测试或产品语义代偿**)· TD-16。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照;**确认命中不是来自你自己刚写进去的东西**。
**锁**:取锁失败即停,⛔ 不覆盖 `owner.json`、不删非你所写的锁。
📌 porcelain 对 `useNoteCanvasRuntimeController.ts`、`projections.ts` 有 stat/EOL 假阳性(blob 等于 HEAD);判真改用 blob 哈希或 `--numstat`(**`--stat` 看不见 untracked**);`grep -c` 数**行数**不是**出现数**。
📌 ⚠️ **提交完整性**(发单方刚栽过,已入 README):改了 handoff/文档就跑 `docs:index` 并**一起交**;生成件是 tracked 的 ` M`,不在 `??` 里;**门禁跑在工作树、提交的是暂存树,两者可以一绿一红**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → `test:mcp-transport` → `test:trash-notes-tool` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方**(本单 X-1…X-3 为**前置自查**,仍须逐条给输出)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:X-1 的红**必须贴出红点所在断言**(证明落在 revert 后果上而非 resources 形状上)· X-2 证明既有两条断言仍承重 · `server/src/` 全目录 `git diff --numstat` 为空的证明 · **K-c12 之外零改动的证明** · 门禁逐条收据 · 每条阴性断言的阳性对照。

## Result

> builder: Codex | baseline: `c924cd5b63d271bf94aa12b0d4b231c5c53b91bb` | branch: `fable/v2-bn12-exoskeleton` | date: 2026-08-23

### 实现

- 仅改 `server/src/__tests__/v2McpTransport.test.ts` 的 K-c12。
- accept 后先把 `receipt.metadata.resources` 取证为 `receiptResources`，不在此处断言；随后真实调用 `POST /api/tool-receipts/:id/revert`。
- revert 的 HTTP 状态、`revert_outcome`、`revert_details`、持久化 receipt 与最终 notes 状态全部先承重；原 `resources` deepEqual 与 zero-pending 两条断言原样移到其后。
- 未删除、放宽或合并任何既有断言；未新造平行机关。

最终关键顺序（当前行号）：快照 `1045` → 真实 revert `1047–1050` → `revert_details` `1054–1057` → 最终 notes `1062–1068` → resources `1069–1078` → zero-pending `1079–1084`。

### X-1 / X-2 / X-3 前置自查

所有阴性施刀均先跑干净产品码的 K-c12 阳性对照，命令为：

```powershell
node --import tsx --test --test-name-pattern="^K-c12 " src/__tests__/v2McpTransport.test.ts
```

阳性对照均为 `1/1 PASS`，且测试 fixture 通过真实 Express listener + TCP；阴性结果均为 `AssertionError`，无 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。

#### X-1：点名 mutation 的第一红已落在 revert 后果

临时把 `server/src/mcp/transport.ts` accept 写入从：

```ts
resources: appliedResources(value),
```

改为：

```ts
resources: proposedResources(entry, input),
```

定向测试 `exit 1`，第一红位于真实 revert 请求之后的这条断言（当前 `v2McpTransport.test.ts:1054`）：

```ts
assert.deepEqual(reverted.body.metadata.revert_details, {
  restored: [OLDER_NOTE_ID],
  failed: [],
});
```

红点输出：

```text
Expected values to be strictly deep-equal:
actual:   { restored: [], failed: [] }
expected: { restored: ['33333333-3333-4333-8333-333333333333'], failed: [] }
name: AssertionError
stack: v2McpTransport.test.ts:1054:12
```

因此本次常驻测试亲自产出的红形是“revert 一条都恢复不了”，不是 resources 形状提前截断。

#### X-2：resources 与 zero-pending 两条断言分别仍有牙

临时令 accept 在真实 `appliedResources(value)` 尾部混入：

```ts
{ kind: 'note', id: 'mutation-pending', outcome: 'pending' }
```

revert 后果断言与最终 notes 状态先全部通过，然后：

1. 最终交付顺序下，resources deepEqual 在当前 `:1069` 报 `AssertionError`；actual 比 expected 多出上述 `mutation-pending` resource。
2. Node fail-fast 无法在同一次运行继续到下一条断言；故做了第二次仅诊断的顺序互换（不删、不宽、不合并断言）。干净产品码先 `1/1 PASS`，同一 pending mutation 随后在 zero-pending 断言报 `AssertionError: true !== false`（诊断栈 `:1069:12`）。

第二次诊断后已恢复最终顺序为 resources → zero-pending。两条断言分别被实际打红，且均位于真实 revert 与最终 note 后果之后。

#### X-3：全部恢复后

- 产品 mutation 与诊断顺序全部恢复。
- K-c12 定向结果：`1/1 PASS`（最终一次 `duration_ms: 681.8746`）。

### 产品零改动与范围证明

- `git diff --numstat -- server/src` 唯一实质输出：`17 16 server/src/__tests__/v2McpTransport.test.ts`。
- `git diff --numstat -- server/src/mcp server/src/routes server/src/services`：空。
- 排除目标文件后的 `server/src/__tests__` numstat：空；因此 K-c12 之外零测试改动。
- X-1 / X-2 施刀文件 `server/src/mcp/transport.ts` 的施刀前、全部还原后 SHA-256 均为 `91403A4C023BCE3C1E5F969634AB1DD7CB52F9E5163BE9832D5A9A66586048DF`，其 git diff 为空。
- 工单字面要求“`server/src/` 全目录 numstat 为空”与“唯一允许修改的测试位于 `server/src/__tests__`”不能同时成立；以上按事实给出：整个 `server/src/` 仅目标测试一项，三个点名产品目录为空。
- 基线已有 `server/src/routes/projections.ts` porcelain/EOL 假阳性；复核时 worktree blob 与 `HEAD` blob 均为 `561902a449b50ce254b650de5a337973a8fbc26d`，numstat 为空，本单未触碰。
- 未取锁、未读写 `owner.json`、未删锁；handoff header 未翻。

### 门禁收据（docs-first）

| 门 | 结果 |
|---|---|
| `npm.cmd run docs:check` | PASS / exit 0 |
| `npm.cmd run verify:v2-bn8-runtime` | PASS / exit 0（含 client 211/211、build、runtime/manifest/parity/docs/secrets 全链） |
| client `npm.cmd exec tsc -- --noEmit` | PASS / exit 0 |
| server `npm.cmd exec tsc -- --noEmit` | PASS / exit 0 |
| `npm.cmd run test:unit` | PASS / 20 files，211/211 |
| server `npm.cmd run test:v2` | PASS / 270/270；`CANVAS_ASSET_DIR` 指向唯一 OS temp 目录，未做语义代偿 |
| server `npm.cmd run test:mcp-transport` | PASS / 24/24（K-c12 为第 21 条 PASS） |
| server `npm.cmd run test:trash-notes-tool` | PASS / 40/40 |
| `npm.cmd run test:tool-face-registry` | PASS / 4/4 |
| `npm.cmd run test:tool-face-manifest` | PASS / 10/10 |
| `npm.cmd run check:tool-face-manifest` | PASS / 2 条 public，artifact 未过期 |
| `npm.cmd run test:tool-face-parity` | PASS / 10/10 |
| `npm.cmd run check:tool-face-parity` | PASS / 2 public entries checked |
| 写回执后的 `npm.cmd run docs:index` | PASS / exit 0；9 份 INDEX 均无变化，写入 0 份 |
| 写回执后的最终 `npm.cmd run docs:check` | PASS / exit 0；object inventory 最新 |

### 共享树说明

开工时已有并保留的他人脏项包括 `useNoteCanvasRuntimeController.ts`、`docs/agent-ops/INDEX.md`、b-2b-2 mrtr、`projections.ts`、journey sheet 与 `.claude/settings.local.json`；施工期间另出现 `adjudication-discipline.md` 的他人改动。本单未改这些文件，也未据此申报更宽结论。M-1 mutation 仍归复核方独立复验。

### 最终机械审计

- K-c12 的 `assert.*` 数量：基线 `16`，交付 `16`。
- `mutation-pending` 在交付测试文件中出现数：`0`。
- handoff 严格 UTF-8 解码：`UTF8_VALID=true`；首行 header 仍为 `status: ready(...)`。
- 全树 `git diff --check`：PASS / exit 0。
