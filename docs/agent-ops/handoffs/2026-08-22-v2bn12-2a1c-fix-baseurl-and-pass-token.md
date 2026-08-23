> from: claude(fable,上将军代发——Opus 调度会话 20:54 起离线;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;上游:1c Review FAIL(方向成立)0B/0H/2M) | re: v2bn12-2a-1c-fix | date: 2026-08-22

# 12.2a-1c-fix:机械门两处护栏缺口(baseURL 混合分支 fail-open · P7 裸 PASS 逃逸)

## 定位

修正链第 2 轮。1c 主单 `2026-08-22-v2bn12-2a1c-parity-gate-rewrite.md` 复核 **FAIL(方向成立)0B/0H/2M**:manifest-only、组合 route graph、symbol 内 method+URL 核验、0-public 中性输出、G-5 三 killer、package 接线(P1–P6)**全部成立,不许动**。本单只封两处:

| # | 缺口(复核原文为准) | 交付 |
|---|---|---|
| **MED-1** | `evaluateStaticStrings()`(`check-tool-face-parity.mjs:235-269`)对 conditional 只拼接「能求出的分支」,不携带「某分支不可求」状态;`:310-318` 只要最后恰有一个 unique path 就接受 ⇒ `isDeployed ? import.meta.env.VITE_API_BASE : '/api'` 这种**混合分支仍 PASS**(fail-open)。 | 静态求值返回 `{ values, complete }`:identifier / template / conditional / binary 任一可达子表达式未知即 `complete=false`;`resolveProjectApiBasePath` 在 `complete=false` 时**语义红**(报「base path not fully static」类信息,exit 1)。常驻测试补两条:①纯 env(整体未知)红;②**未知分支 + literal fallback 也红**。现有正控(两支全静态归一 `/api`)必须仍绿。 |
| **MED-2** | `check-tool-face-parity.test.mjs:221-228` 只 `doesNotMatch(/\[PASS\]/)`;在 `[INFO]` 后加裸文本 `PASS remains unproven` 仍 8/8 绿。工单 P7 是「不得含 PASS 字样」。 | 对 **empty manifest** 与 **含 1 条 `exposure:test` 的 0-public manifest** 两个 production CLI 收据的**完整 stdout+stderr** 断言 `/PASS/i` 不命中(或锁定唯一允许的 INFO 文案);**先用 1-public 正控证明同一 probe 能看见 `[PASS]`**(阳性对照写进测试本身)。 |

**必红判据(builder 前置自查;终判归 reviewer)**:①复刻 MED-1 的混合 ternary mutation → 新测试红在「base path not fully static」;②复刻 MED-2 的裸 `PASS` 插入 → 新测试红在 `/PASS/i` 命中;两者还原后全绿。**红必须来自「门存在但判错」,不是函数缺失/语法错**(12.1 线教训 1)。

## 硬闸
- ⛔ 不改 G-1/G-2 其余逻辑、不改 G-5 killer、不改 package 接线、不改 manifest 生成器/注册表/manifest JSON、不碰 `docs/`(INDEX 由调度方已重生成)。
- ⛔ 若封 MED-1 必须改动 route graph 或 client 核验的其他分支:停手,header 不动,回执 `needs: claude` + 理由。
- 回执叙述性主张逐条对照源码抄取(上轮 LOW 教训),不按命名推断。

## 边界(触及面申报)
允许:`scripts/check-tool-face-parity.mjs`(仅 `evaluateStaticStrings` / `resolveProjectApiBasePath` 及其直接调用处的 completeness 传递)· `scripts/check-tool-face-parity.test.mjs`。其余禁区。

## D 段(`adjudication §7`,含反面分则)
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」(裸 `PASS` 测试尤其:确认命中的是 CLI 输出不是你的 fixture 文案)。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts` EOL 假阳性 `.M`,不是越界;判真改用 `git diff --numstat`。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → `test:tool-face-parity` → `check:tool-face-parity`,逐门 exit 入表。回执 **UTF-8** 追加 `## Result`;含两段先红后绿输出(红在哪条断言)· 十门表 · `git diff --numstat` 对照边界 · 显式范围排除。**M-1** mutation 终判归 reviewer;**M-2** header 保持 `ready`;不 commit、不 push、不碰 main。

## Result

> builder: Codex(builder) | date: 2026-08-22 | result: implementation complete, awaiting reviewer | header: kept `ready`

### 实现

- **MED-1** — `scripts/check-tool-face-parity.mjs` 的 `evaluateStaticStrings()` 现逐类返回 `{ values, complete }`：literal 为完整；identifier 缺声明/循环为不完整；conditional 两支、template 各 span、`+` binary 两侧均以 `&&` 传播完整性；parenthesized 透传；其他不可求形状为不完整。`resolveProjectApiBasePath()` 在路径归一与 single-unique-path 判断前先检查 `evaluation.complete`，不完整时抛出 `client/src/services/api.ts base path not fully static`。原 `has no single static API path base` 唯一路径判断保留。
- **MED-1 常驻收据** — 两个独立 fixture 各先用同一个 `validateClientCallConstruction()` 探针验证“两支全静态且归一为 `/api`”为绿，再分别验证整体 `import.meta.env.VITE_API_BASE` 与 `isDeployed ? import.meta.env.VITE_API_BASE : '/api'` 均命中 `base path not fully static`。
- **MED-2** — `scripts/check-tool-face-parity.test.mjs` 的 G-3 使用同一个 `passPattern = /PASS/i`：先在真实 1-public manifest 的 production npm CLI 完整 `stdout + stderr` 命中阳性，再对 empty manifest 与含一条 `exposure:test` 的 0-public manifest 的完整 `stdout + stderr` 分别执行 `doesNotMatch`。两份阴性收据同时锁住 exit 0 与 `0 条 public 条目受检，未证明任何 parity`。
- 未新增生产平行机关；临时 client repo 仅为测试 fixture，且每次在 `finally` 删除。

### 先红后绿

#### MED-1 — mixed dynamic/static conditional

红场单刀：在既有 mixed ternary fixture 上把 conditional 完整性合取临时改为 `whenTrue.complete || whenFalse.complete`，复刻“只要一支可求便放行”的 fail-open；没有改函数存在性或语法。

```text
node --check scripts/check-tool-face-parity.mjs  -> exit 0
npm.cmd run test:tool-face-parity               -> exit 1; 9/10
not ok 4 - G-2 rejects a mixed dynamic and literal API base as not fully static
error: 'expected base path not fully static rejection'
```

还原为 `whenTrue.complete && whenFalse.complete` 后：

```text
npm.cmd run test:tool-face-parity -> exit 0
1..10
# pass 10
# fail 0
```

#### MED-2 — bare PASS token

红场单刀：只在 production 0-public `[INFO]` 文案后临时加入裸行 `PASS remains unproven`；同一 `/PASS/i` 探针此前已在真实 1-public CLI 输出中命中阳性。

```text
node --check scripts/check-tool-face-parity.mjs  -> exit 0
npm.cmd run test:tool-face-parity               -> exit 1; 9/10
not ok 5 - G-3 empty and non-empty 0-public manifests are neutral and never print PASS
The input was expected to not match the regular expression /PASS/i.
actual CLI output included: PASS remains unproven
```

删除裸行、恢复原 `[INFO]` 后：

```text
npm.cmd run test:tool-face-parity -> exit 0
1..10
# pass 10
# fail 0
```

两刀最终均已还原；收尾探针确认源码不含 `PASS remains unproven`，也不含 `whenTrue.complete || whenFalse.complete`。

### 十门 docs-first 收据

严格串行，未并行、未跳门：

| # | 门 | exit | 关键收据 |
|---:|---|---:|---|
| 1 | `npm.cmd run docs:check` | 0 | object inventory 最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | 0 | 19 files / 209 tests；159 runtime boundary；60 model groups；双 build、performance、docs、diff、secret scan 全绿 |
| 3 | client: `npm.cmd exec -- tsc --noEmit` | 0 | 无诊断 |
| 4 | server: `npm.cmd exec -- tsc --noEmit` | 0 | 无诊断 |
| 5 | `npm.cmd run test:unit` | 0 | 19 files / 209 tests |
| 6 | `npm.cmd run test:tool-face-registry` | 0 | 3/3 |
| 7 | `npm.cmd run test:tool-face-manifest` | 0 | 6/6 |
| 8 | `npm.cmd run check:tool-face-manifest` | 0 | 1 entry / 1 public，fresh |
| 9 | `npm.cmd run test:tool-face-parity` | 0 | 10/10；G-5 三个 killer 仍绿 |
| 10 | `npm.cmd run check:tool-face-parity` | 0 | `[PASS] ... 1 public entries checked; human reachability NOT VERIFIED; journey pending` |

### 边界与范围排除

回执写入前的 `git diff --numstat`：

```text
38  16  scripts/check-tool-face-parity.mjs
100 7   scripts/check-tool-face-parity.test.mjs
```

候选 SHA-256：

```text
57B81D45B45BBBDA6CC2B109127374B9BEBDDC2C3E72C83E62184CC95572AC9E  scripts/check-tool-face-parity.mjs
BA94643CB0050A2AEC123294AE69FD04F85306AC439FE1546511F5554AF9208E  scripts/check-tool-face-parity.test.mjs
```

- `git diff --name-only` 在回执前只列上述两份代码文件；共享树 `client/.../useNoteCanvasRuntimeController.ts` 仍只呈 porcelain `.M`，`git diff --numstat` 为 0，按工单 D 段不计入触及面。
- 未改 G-1 route graph；未改 G-2 的 symbol/method/URL 其他分支及直接调用处；未改 G-5 三个 killer；未改 package 接线、registry、manifest 生成器/schema/JSON；未改 main。
- `docs/` 唯一写入是本工单要求的 UTF-8 `## Result` 回执；未改 INDEX 或其他文档。
- 显式不主张 human reachability / S7 旅程、MCP transport、`tools/list`、JWT/scope、runtime tool execution。M-1/M-2 mutation 终判归 reviewer。
- 未 commit、未 push；当前分支保持 `fable/v2-bn12-exoskeleton`。
