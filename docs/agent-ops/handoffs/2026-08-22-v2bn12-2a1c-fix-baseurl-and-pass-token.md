> from: claude(fable,上将军代发——Opus 调度会话 20:54 起离线;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: done(复核 PASS 0B/0H/0M/0L @ 1c-fix Review,2026-08-22 Opus 翻牌;Fable 本人翻牌;上游:1c Review FAIL(方向成立)0B/0H/2M) | re: v2bn12-2a-1c-fix | date: 2026-08-22

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

## Review

> reviewer: Codex reviewer（洁净室复核 thread） | date: 2026-08-22 | candidate: `14cf4e6000532f43942f77029391f83f95f6f63a` | pre-fix: `bbaca7a`
>
> candidate SHA-256：`scripts/check-tool-face-parity.mjs` = `57B81D45B45BBBDA6CC2B109127374B9BEBDDC2C3E72C83E62184CC95572AC9E`；`scripts/check-tool-face-parity.test.mjs` = `BA94643CB0050A2AEC123294AE69FD04F85306AC439FE1546511F5554AF9208E`。

### 判定

**PASS —— BLOCKER 0 / HIGH 0 / MED 0 / LOW 0。**

MED-1 与 MED-2 均已按原问题定义封住：混合 dynamic/static baseURL 与纯 env 均由 production parity 门语义 FAIL；破坏 completeness 合取会由新增常驻测试直接杀死；0-public 输出的裸 `PASS` 会由同一 production CLI probe 的完整 stdout+stderr、`/PASS/i` 阴性断言杀死，且该 probe 在阴性断言前先看见真实 1-public `[PASS]`。P1–P7、manifest-only、无平行目录与 package 接线的增量指纹除本单点名位点外未变。放行权仍归 Fable。

### 5-7 增量协议声明

本轮是修正链中间轮，采用 reviewer charter 5-7。基线为主单 `2026-08-22-v2bn12-2a1c-parity-gate-rewrite.md##Review` 已自验的 P1–P7、manifest-only 与无平行目录结论；差分基线为 `bbaca7a`，候选为 `14cf4e6`。本轮只全面复验 MED-1 / MED-2、`bbaca7a..14cf4e6` 差分面与十门；P1–P7 用 AST/文件/路径集指纹比对。P5a 与 P6 的生产函数、常驻测试及 package 指纹均未变化，因此没有重复旧 mutation；完整 `test:tool-face-parity` 仍亲跑 10/10。

### H1–H4 reviewer mutation 收据

所有 mutation 均在 `D:\Coinsides\v2.x\Coincides\tmp\codex-review-2a1c-fix-20260822-2215` 的独立本地 Git clone 中执行：`git clone --no-hardlinks --no-checkout` 后 detached 到 `14cf4e6`。标准 `git worktree add` 因沙箱拒绝写共享 `.git/worktrees` 而在创建前失败；独立 clone 是与主单复核相同的隔离替代。三处 node_modules 仅以 junction 复用依赖，mutation 从未进入共享施工树。

| 位点 | reviewer 单刀与阳性对照 | 实际结果 | 判定 / 还原 |
|---|---|---|---|
| **H1a（MED-1 production）** | 先让未改 production `check:tool-face-parity` 对真实 `list_notes` 输出 `[PASS]`、exit 0；再把 client `API_BASE` 改为 `isDeployed ? import.meta.env.VITE_API_BASE : '/api'` | production check exit **1**；`[FAIL]` 后精确报 `client/src/services/api.ts base path not fully static`；没有 `ReferenceError` / `SyntaxError` / module crash | 混合分支已 fail closed，红在点名语义。client 文件随后还原 |
| **H1b（常驻护栏）** | 只把 conditional completeness 从 `whenTrue.complete && whenFalse.complete` 改坏为 `||`；两个新测试各自先跑全静态双分支正控 | `node --check` exit 0；`test:tool-face-parity` exit **1**、9/10；唯一红为 `G-2 rejects a mixed dynamic and literal API base as not fully static`，断言 `expected base path not fully static rejection` | completeness 不是装饰字段；常驻测试命中已证实漏径。还原后 10/10 |
| **H2（纯 env 回归）** | 只把 client `API_BASE` 改为整体 `import.meta.env.VITE_API_BASE` | production check exit **1**；同样语义报 `base path not fully static`，不是 crash | 旧回归基线仍红；还原 |
| **H3（MED-2）** | 在 production 0-public `[INFO]` 文案后加入裸行 `PASS remains unproven`；G-3 同一测试先以真实 manifest 命中 production `[PASS]` | `node --check` exit 0；专项测试 exit **1**、9/10；唯一红为 G-3 的 `doesNotMatch(/PASS/i)`，实际 CLI 输出明确含该裸行 | 裸 PASS 逃逸已封。`[PASS]` 阳性由 production `formatParityResult` 写入；裸行由 reviewer 写进 production formatter，不在 fixture/test 文案中。还原后 10/10 |
| **H4（完整两流）** | 先只把 G-3 三处观测改成 stdout-only；再保持该刀、把 exit-0 的 0-public INFO 等价迁到 stderr；最后恢复原 stdout+stderr 断言而暂留 INFO→stderr | 当前 production INFO 本来走 stdout，故 stdout-only 单刀 **10/10 存活**；INFO 迁 stderr 后 stdout-only **9/10 红**在“未看见中性 INFO”；恢复完整两流后，同一 INFO→stderr production **10/10 绿** | 现状 stdout-only 存活是流位置造成的观测等价，不是漏测；配对 probe 证明 stdout+stderr 合并在流迁移时真实承重。production/test 均已还原 |

最终候选在隔离树再次得到 `node --check` 0、`test:tool-face-parity` 10/10、`check:tool-face-parity` `[PASS] 1 public`。三份触及文件的 clean-filter 工作树 blob 与 HEAD 分别精确相等：

- `client/src/services/api.ts`：`c16748616a15d4967b4c92698b5e1577e68fcc37`；
- `scripts/check-tool-face-parity.mjs`：`da3d188e26f895b99e04898a2aa037509c9a196a`；
- `scripts/check-tool-face-parity.test.mjs`：`ae4597667edcb282413ca7191dca61448a6806e7`。

隔离树 `git diff --numstat` 为空后已删除；它可由 `14cf4e6` 完整重建，三个共享 node_modules target 均确认仍存在。共享树 mutation 前后真实 `git diff --numstat` 均为空。

### H5：P1–P7 指纹

SHA-256 均取对应 AST 节点原文；“未变”表示 `bbaca7a == 14cf4e6`。

| 位点 | 承重指纹 | 结果 |
|---|---|---|
| **P1** | `buildServerRouteGraph` `43c6e860d929fb5a02a5cce7d1b2a342f3f3b23c589c6d04594fdb3944e3ab8c`；`validatePublicEntry` `107c5f1eb92513c70d9ee9718e7bdb83876fc1d80191acde952b690385f8aac1`；G-1 test `86d4cff931d023c5951ad4e0dd8a216bdd0a765294fefbd2e36315d9b2465fe7` | 未变 |
| **P2–P4** | `validateClientCallConstruction` `74b19fc146c23b30b97898e5d2720fbc2781d16bfbe220a5e736890d336afe3b`；`requestPatternMatchesRoute` `b4a15138e137fcadac6d97110e736638708c4e0e97662fe824f06f4cf9cbed8a`；既有 G-2 test `97dc6790a33a5e0bc2b10bf360fd883b5b8e228fb8a0d02235772b5bc9fe4b0f`；wrong-method test `d2c747e674664bfe973f9237565206140e5899ecd5768e1afa606a287699d850` | method/symbol/exact path 逻辑未变；仅 MED-1 直接依赖按点名变化 |
| **MED-1 直接面** | `evaluateStaticStrings` `fdd78406fbd731b4946c3cc216e78331f9663de31029ee6608ac3fe88413aca9 → 8f3e7baf268be22d578b86e420a2a769020d10282b01474539be7c8f3620c897`；`resolveProjectApiBasePath` `d99e17a896a68c1459857e23e7bbf4ad0b8b1a3a679830d99dade6af70adc09b → f1301e54eb92f280852f107c66d78ee030f47af915897c69f1f5dadb2a8c2746` | 预期变化；H1/H2 已对抗亲测 |
| **P5** | `selectPublicEntries` `586dd5e6b49f4c32225753b7f7182587f52567ca5783aa42f7c4ffacf57f49ca`；`validatePublicProjection` `6b861cb1bebcd357e6543086dd7e65adb07e671418166cc6d9ee041845c03c27`；killer 1/2/3 = `550e069ea4fc0734cbd0c384f471cd41e322b15854a1f10079c8a3b71a6e39c3` / `09cde2d09d87af5eae5326fc375e04198b7bf1be557e4eacad67488057c78a6d` / `56d0b989594cdcc8d7193e15463417a961d2501d87bd90c537037ec449d6eade` | 全部未变；不重跑 P5a mutation |
| **P6** | `package.json` blob `a6f3e2689373b9f752ba8e0d34acb320610fa1b1`；`runProductionCli` `5fff284e84aaf8ea0eb72eaeb5d6849471c378c72e9d2c450250ae8a9105302c`；P6 test `b275ac59e7ec9f690ab516f19d2d1e87ad0c392c141e5982beadc3c97a09f785` | 全部未变；不重跑 P6 mutation |
| **P7 production** | `evaluateToolFaceParity` `34c54c88d3cca4ae213229ff7cecca91d13af3150eac8ece285b8c13aec6b220`；`formatParityResult` `6f0f44f99e3ead2cb9999a7f35547ccad67b418da1094f3f2e9ca0713b524c4f`；`main` `1c289aff71a095ae607f479144fdd3f31772462bf4de4e5dab57ccbbbfb1292d` | 未变 |
| **P7 test** | 旧 G-3 `5c6cf015c40e353d37ba6e8180afe5c9fb50d7f7305e34050a507e3ec7a76cd1` → 新 G-3 `1eb2b04cf50522f5294ec0c0fe5a51d603a1e7eb1fae1c859c671fc042813c65` | 预期变化；H3/H4 已对抗亲测 |

新增 pure-env 与 mixed-ternary tests 的 AST SHA-256 分别为 `3f2149742e994deac72e3330aedc4b7d72a74318610f1463b932fba68d634e95`、`b62e8ff1521829cec4dc774263f3f8d547725e6baba4721e9c7c8a3a1552edf0`。

manifest-only / 无平行目录按同一增量基线比指纹：executable scope 两端均 456 文件、路径集 SHA-256 `df9d3e3111ed1c8f02851047888bc32f19d54ec73ae47ed21927aefec415d774`；tool-face 实现路径两端均 7 条、SHA-256 `5c4c727c300be7d527be6cdc83b342d2a02ce6b9d79fe97087deca00d8377658`；gate 的 `new Function / TOOL_REGISTRY / toolRegistry` 两端均 `0 / 0 / 0`；旧 `shared/types/toolRegistry` executable 引用两端均 0。差分没有新增实现路径，故不重做首轮缺席证明。

### 十门亲跑（canonical 共享 worktree，docs-first 严格串行）

| # | 门 | exit | reviewer wall time | 关键收据 |
|---:|---|---:|---:|---|
| 1 | `npm.cmd run docs:check` | 0 | 0.393s | object inventory 最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | 0 | 33.974s | 19 files / 209 unit；3 registry；6 manifest；159 runtime boundary；60 model groups；双 build、performance、docs、diff、secret scan 全绿 |
| 3 | client `npm.cmd exec -- tsc --noEmit` | 0 | 5.653s | 无诊断 |
| 4 | server `npm.cmd exec -- tsc --noEmit` | 0 | 4.017s | 无诊断 |
| 5 | `npm.cmd run test:unit` | 0 | 7.278s | 19 files / 209 tests |
| 6 | `npm.cmd run test:tool-face-registry` | 0 | 0.676s | 3/3 |
| 7 | `npm.cmd run test:tool-face-manifest` | 0 | 3.413s | 6/6 |
| 8 | `npm.cmd run check:tool-face-manifest` | 0 | 0.628s | 1 entry / 1 public，fresh |
| 9 | `npm.cmd run test:tool-face-parity` | 0 | 4.833s | 10/10；G-5 三 killer 仍绿 |
| 10 | `npm.cmd run check:tool-face-parity` | 0 | 0.497s | `[PASS] 1 public entries checked`；human reachability NOT VERIFIED |

### 接门前置与主链状态

- 本轮 canonical 暖缓存 `test:tool-face-parity + check:tool-face-parity` 合计 **5.330s**。接入 `verify:v2-bn8-runtime` 后，按本机本轮 33.974s 口径约为 39.3s；这只是本机估计，不写成 CI 保证。
- production gate 自身不 spawn。专项测试只有一个 `spawnSync` helper，但共有 **11** 个 `runProductionCli` 调用点；每次以 `process.execPath + npm_execpath run check:tool-face-parity` 同步启动 production npm 入口，npm 再启动 gate Node。再加独立 check，本组两门共求值 production gate 12 次。
- `npm_execpath` 是测试模块顶层硬依赖。通过标准 `npm run verify...` 接门时 npm 会提供，Windows argv/cwd 传递没有 shell 字符串拼接；直接裸跑 `node --test scripts/check-tool-face-parity.test.mjs`、清空该环境或换不兼容 package manager，会在测试前基础设施失败。
- 语义偶发红风险低：无网络、端口、live server 或时钟依赖；临时目录由 `mkdtempSync` 唯一化且 `finally` 清理。运营风险非零：11 次串行嵌套 npm、每次 60s timeout，在严重拥塞 CI 上可能超时。因此结论是“适合按 npm script 串行接入，约增 5.33s；不能承诺零 infrastructure flake”。
- 结构读取确认：`docs:check` 仍只有 docs-index + docs-inventory；`verify:v2-bn8-runtime` 仍含 registry/manifest 门但不含 parity。两条主链 **当前仍未接 parity**，符合本单边界；本 reviewer 不接门。

### 触及面

`git diff --numstat bbaca7a..14cf4e6`：

```text
2    1   docs/agent-ops/INDEX.md
6    0   docs/agent-ops/claude-log/2026-08-22.md
123  0   docs/agent-ops/handoffs/2026-08-22-v2bn12-2a1c-fix-baseurl-and-pass-token.md
38   16  scripts/check-tool-face-parity.mjs
100  7   scripts/check-tool-face-parity.test.mjs
```

`b713c0c` 是调度方工单/INDEX/log 提交；`14cf4e6` 是两份允许代码文件与 `## Result`。没有第三份代码、package、registry、generator/schema、manifest JSON、route/call-site 或平行目录变化，触及面与修正单边界一致。

共享树 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 仍显示 porcelain `.M`，但 HEAD/worktree blob 同为 `3efe5f820e2077850611b54d4d09482845e89545`，`git diff --numstat` / `git diff --check` 均为空；按 D 段判为既知 EOL 假阳性，不计越界。

### 5-2 跨条合取与下一状态扫描

1. **completeness × unique path**：`resolveProjectApiBasePath` 在 path normalization / unique-path 前先拒绝 `complete=false`。H1a 证明 literal fallback 不再洗掉 unknown 分支；H1b 又证明常驻测试真的依赖该合取。
2. **MED-1 × P2–P4**：本单只改变 baseURL 静态求值依赖；method、symbol boundary、exact URL path 的 AST 指纹未变。真实正控与十门绿证明 fail-closed 没误杀当前双静态 `/api`。
3. **阳性 × 阴性 × 输出流**：G-3 同一 production probe 先见 PASS 再查两种 0-public；H3 杀裸 token，H4 证明两流合并能承受 INFO 从 stdout 迁到 stderr。三者合取后不再靠当前流位置或方括号偶然成立。
4. **test helper × package × production main**：`runProductionCli`、P6 test、package blob 未变；专项测试继续从真实 npm entry 进入同一 main/evaluator，不存在“函数单测绿、生产入口断线”的新缝。
5. **manifest 忠实投影 × 后续 12.2b**：本单没有把 `exposure` / `__` 过滤推回 generator，也没有新增目录；未来 `tools/list` 仍须按 `3.1 补注` 独立过滤。parity 必要条件与 S7 human journey 继续互不替代。
6. **当前态 → 接入 verify**：功能条件已满足；状态转移后的新增风险只在嵌套 npm 耗时与 `npm_execpath` 环境契约。接线单应保持 npm script 入口和串行次序，并把约 5.33s 税计入门预算。

### 5-1 收据完备、D 段阳性对照与显式范围排除

- **承重且已自验**：必读链；`bbaca7a..14cf4e6` diff；候选文件 SHA/blob；H1–H4；H5；manifest/path-set 指纹；十门与双 tsc；package/main-chain 结构；parity 合计耗时、spawn 与 `npm_execpath`；隔离树还原/删除；共享树真实 numstat。
- **D 段阳性对照与归因**：
  - H1/H2 production 阴性前，同一真实 npm gate 先对 HEAD `list_notes` 输出 `[PASS]`；混合/纯 env 字符串是 reviewer 写入隔离 client 文件，FAIL 文案由候选 production gate 生成。
  - H1b 两个新增常驻用例都先调用全静态双分支正控，再执行动态负控；红在 mixed test 的点名断言，不是 parser/模块 crash。
  - H3 的 G-3 在同一测试内先对真实 1-public manifest 命中 `/PASS/i`，再进入 empty/0-public 阴性；裸 `PASS remains unproven` 是 reviewer 写进 production formatter 的 mutant，test fixture 没写该串。
  - H4 的 INFO→stderr 是 reviewer 写入 production main 的流迁移 mutant；stdout-only 红、原完整两流绿，故信号承载的是实际 CLI 输出。
- **显式范围排除（不是 PASS）**：不证明 human reachability / S7 browser journey；不审 MCP transport、`tools/list`、JWT/scope、operation batch、confirm→propose 或 runtime tool execution；不启动 live server/browser，因为它们不回答本修正单的静态门谓词。registry/generator/schema/manifest 的设计不重审，只保留首轮基线指纹并亲跑其既有三门。
- **边界遵守**：未改产品代码或常驻测试，未 commit/push、未碰 main、未改 header；唯一共享 tracked 写入是本 `## Review`。
