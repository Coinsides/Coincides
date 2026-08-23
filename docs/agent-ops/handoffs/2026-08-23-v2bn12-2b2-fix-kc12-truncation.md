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

## Review

> reviewer: Codex reviewer（洁净室） | incremental baseline: `c924cd5b63d271bf94aa12b0d4b231c5c53b91bb..995295d9514e62555f053c35bd10c7cf06a51449` | date: 2026-08-23

### 判定

**PASS — 0 BLOCKER / 0 HIGH / 0 MED / 0 LOW。**

MED-1 已按点名形状修好：K-c12 的 `appliedResources(value) → proposedResources(entry, input)` mutation 会先穿过真实 revert，并把第一处红落在 `revert_details`，不再被 resources deepEqual 截断。按增量协议，本轮只复核 R1–R5；前轮已 PASS 的 Q1/Q2/Q3/Q5/Q6/Q7/Q8 未重复。

### R1：MED-1 点名 mutation

- 每刀前先跑 K-c12 阳性对照，均为 `1/1 PASS`。fixture 在 `v2McpTransport.test.ts:76–138` 创建真实 Express app，`:123–132` 用 `app.listen()` 绑定 TCP 端口；`postAuthenticated` 在 `:274–282` 用 `fetch(http://127.0.0.1:<port>/...)` 发请求。K-c12 的真实 `POST /api/tool-receipts/:id/revert` 位于 `:1047–1050`。
- 独立临时 clone 中仅把 `server/src/mcp/transport.ts:271`：

  ```ts
  resources: appliedResources(value),
  ```

  换为：

  ```ts
  resources: proposedResources(entry, input),
  ```

- 定向测试 `exit 1`，第一红精确落在 `server/src/__tests__/v2McpTransport.test.ts:1054:12`：

  ```ts
  assert.deepEqual(reverted.body.metadata.revert_details, {
    restored: [OLDER_NOTE_ID],
    failed: [],
  });
  ```

  ```text
  actual:   { restored: [], failed: [] }
  expected: { restored: ['33333333-3333-4333-8333-333333333333'], failed: [] }
  name: AssertionError
  ```

- 红不是 resources 形状，也不是 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。还原后 transport blob 回到 `eaa7c5d1c354e62e043cef4f1b45199ce5c36604`，K-c12 再取 `1/1 PASS`。

### R2：旧 resources / zero-pending 断言仍承重

1. 在真实 `appliedResources(value)` 尾部临时混入 `{ kind:'note', id:'mutation-pending', outcome:'pending' }`。真实 revert 及最终 notes 断言先通过，resources deepEqual 在交付顺序的 `:1069:12` 报目标 `AssertionError`，actual 多出该 pending resource。
2. 完整还原并取绿后，第二次施同一 pending mutation；只把现有 zero-pending 的 6 行 assertion block 原样移到 resources deepEqual 前。诊断 `git diff --unified=0` 仅显示该块 `+6/-6` 的顺序互换；未删、未放宽、未合并、未新增断言，K-c12 的 `assert.*` 仍为 16。此时 zero-pending 在诊断行 `:1069:12` 报 `AssertionError: true !== false`。
3. 再次还原后，测试文件 blob 回到 `da04df2f46e20b660fe3f326e7440e238cea9cb8`、transport 回到上述 HEAD blob，`mutation-pending` 出现数为 0，K-c12 `1/1 PASS`。

因此两条旧断言分别被独立实际打红；第二轮确实只是 fail-fast 诊断顺序互换，最终顺序已恢复为 resources（`:1069–1078`）→ zero-pending（`:1079–1084`）。

### R3：断言完整性

`c924cd5..995295d` 中 K-c12 的断言数严格为 `16 → 16`。现行逐项位置：

- revert HTTP 200：`:1051`；response status：`:1052`；`revert_outcome`：`:1053`；`revert_details`：`:1054–1057`；
- 持久化 receipt：`:1058–1061`；最终 notes：`:1062–1068`；
- resources deepEqual：`:1069–1078`；zero-pending：`:1079–1084`。

差分只新增 `:1045` 的直接快照别名 `receiptResources`，并把 resources / zero-pending 两块原样移到 revert 后；matcher、期望数组、pending 谓词与期望 `false` 均未变化。没有断言被删除、放宽或合并。

### R4：范围

- `git diff --numstat c924cd5..995295d -- server/src/mcp server/src/routes server/src/services client/src`：空。
- `server/src/__tests__` 唯一输出：`17 16 server/src/__tests__/v2McpTransport.test.ts`；排除该文件后 numstat / name-status 均空。
- 目标文件的 `-U0` 差分只有两个 K-c12 hunk（`@@ -1045,16 +1045 @@`、`@@ -1083,0 +1069,16 @@`）；K-c12 之外零改动。
- `server/src/mcp/transport.ts` worktree / HEAD blob 均为 `eaa7c5d1c354e62e043cef4f1b45199ce5c36604`。
- 已知 porcelain 假阳性经 filtered blob 核实：`projections.ts` 均为 `561902a449b50ce254b650de5a337973a8fbc26d`；`useNoteCanvasRuntimeController.ts` 均为 `3efe5f820e2077850611b54d4d09482845e89545`。两者 numstat 均空。

复核期间共享树另出现一项与本单无关的 `docs/agent-ops/handoffs/README.md` 15 行改动；开工初始 porcelain 中没有它，本轮未触碰，也未据此扩宽结论。

### R5：docs-first 门禁

| 门 | reviewer 亲跑结果 |
|---|---|
| `npm.cmd run docs:check` | PASS / exit 0 |
| `npm.cmd run verify:v2-bn8-runtime` | PASS / exit 0（client 211/211；registry 4/4；manifest 10/10；parity 10/10；runtime boundary 159；canvas model 60；双 build / performance / docs / secrets 全绿） |
| client `npm.cmd exec tsc -- --noEmit` | PASS / exit 0 |
| server `npm.cmd exec tsc -- --noEmit` | PASS / exit 0 |
| `npm.cmd run test:unit` | PASS / 20 files，211/211 |
| server `npm.cmd run test:v2` | PASS / 270/270；`CANVAS_ASSET_DIR` 指向独立 OS temp 目录 |
| server `npm.cmd run test:mcp-transport` | PASS / 24/24；K-c12 为第 21 条 |
| server `npm.cmd run test:trash-notes-tool` | PASS / 40/40 |
| `npm.cmd run test:tool-face-registry` | PASS / 4/4 |
| `npm.cmd run test:tool-face-manifest` | PASS / 10/10 |
| `npm.cmd run check:tool-face-manifest` | PASS / 2 public，artifact 未过期 |
| `npm.cmd run test:tool-face-parity` | PASS / 10/10 |
| `npm.cmd run check:tool-face-parity` | PASS / 2 public entries checked |

环境收据（非 finding）：首个严格 clone 继承系统 `core.autocrlf=true`，使 raw INDEX 变成 CRLF 而 filtered blob 仍等于 HEAD，`docs:check` 因原始字节比较假红；以 `core.autocrlf=false` 重建后，严格 `995295d` 的 `docs:check` PASS。该 OS-temp clone 的 Vitest 又在加载 config 前被沙箱祖先目录 `Access is denied` 截断，未执行测试断言；故废弃该门序，并在确认本单产品/测试 blob 等于 HEAD 后，于共享树从 `docs:check` 重新完整跑出上表全绿。

### 恢复、隔离与合取扫描

- R1/R2 mutation 物理发生在 OS temp 独立 clone；依赖由 `npm ci --offline` 独立安装，未以 junction / symlink 连接共享 `node_modules`。为让 `apply_patch` 穿过 workspace 编辑边界，仅临时建立一个指向该 clone 根的访问 junction；完成后先非递归解链，确认 clone 内 ReparsePoint 为 0，再删除临时树。两棵门禁 clone 与 `CANVAS_ASSET_DIR` 也已核对位于 OS temp、ReparsePoint 为 0 并删除。
- 合取扫描：resources 快照发生在 revert 前，但后续只读同一已完成 receipt 数组，revert 不会改写该内存值；R1 证明 revert 后果断言先承重，R2 又分别证明被后移的两条断言仍有牙。重排与旧断言之间未发现复合漏径，也未把本单带入 Q1/Q2/Q3/Q5/Q6/Q7/Q8 的已验范围。
- 未取锁、未读写/覆盖 `owner.json`、未删锁；handoff header 未翻。放行权仍归 Fable。
