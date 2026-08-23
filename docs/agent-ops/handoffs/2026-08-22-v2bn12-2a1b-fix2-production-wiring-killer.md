> from: claude(fable,上将军直发——Opus 调度会话离线;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: done(复核 PASS @ rfix2 Review,Fable 放行 log 08-22 #9;复核 PASS 0B/0H/0M/1L,2026-08-22 Opus 翻牌;Fable 本人翻牌;设计裁定:log 08-22 #7) | re: v2bn12-2a-1b-fix2 | date: 2026-08-22

# 12.2a-1b-fix2:生产接线 killer —— 生产 CLI 必须调用同一投影函数

## 定位

修正链第 3 轮(S1a 主单 FAIL 2H → fix 封住 H-2 与 H-1 逻辑层 → fix 复核 FAIL 1H)。**本单只封一个洞**:`2026-08-22-v2bn12-2a1b-fix-projection-and-freshness-killers.md` `## Review` 的 **HIGH-1**(F3):把 `renderManifest` 里对 `buildToolFaceManifest(entries)` 的调用删掉、内联一份同字段 mapper,`test:tool-face-manifest` 仍 5/5 绿、`check:tool-face-manifest` 仍绿。即:纯函数被 F1 保护了,**生产 CLI 是否仍调用它没有任何测试看着**(12.1 线教训:测逻辑≠测接线;复核 5-2 合取:复制体里加过滤,F1 不红、freshness 把残缺 manifest 当 fresh)。

其余全部**不许动**:F1/F2 已红绿;F4 seam 不构成平行机关;F5 未钉死 Windows;七门全绿;M1/M3/M5/M6/M7 指纹未变。

## 交付物(只这两项)

1. **可注入的单一编排入口**:`renderManifest(entries, projector = buildToolFaceManifest)`(或等价形状:生产默认值就是 `buildToolFaceManifest`,`runCli` 不传 projector)。**投影逻辑一字不改**,只加参数与默认值。
2. **生产接线 killer 测试**(加进 `scripts/generate-tool-face-manifest.test.ts`,进入既有 `test:tool-face-manifest`):用 spy projector 调用**生产编排**(`renderManifest`,不是直接调纯函数),断言 ①spy 被调用恰一次且收到同一 `entries`;②输出字节 = `JSON.stringify(spy 返回值)+'\n'`(即编排没有自己另算一份)。**必红判据(builder 前置自查,复核方终判)**:复刻 F3(删调用、内联 mapper、忽略 projector 参数)→ 该测试必须红在「projector 未被调用」断言;还原后 5/5+1 绿。
   - 可选加固(不强制):结构契约——生产源码里九字段 mapper 只出现一次。若做,须同样给先红后绿。

## 硬闸

- ⛔ 不改投影逻辑、不改 freshness 比较、不改 seam、不改 registry、不改 generated manifest、不接主链(`verify:v2-bn8-runtime` / `docs:check` 不许出现 tool-face/manifest/parity)。
- ⛔ 若发现必须改上述任一处才能写出 killer:**停手**,header 不动,回执写 `needs: claude` + 需要什么接缝、为什么。
- 回执按实码抄取 fixture 的 exposure(上轮 LOW-1:Result 把 `internal_probe=public`、`__reserved_probe=internal` 写错),不按条目名推断。

## 边界(触及面申报)

允许:`scripts/generate-tool-face-manifest.ts`(仅编排签名/默认参数)· `scripts/generate-tool-face-manifest.test.ts`。其余一律禁区。INDEX 已由调度方重生成并提交,**不要再动 docs/**。

## D 段(`adjudication §7`,含反面分则)

阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts` 有 EOL 假阳性 `.M`(blob 两端 `3efe5f8…`),不是越界,判真改用 `git diff --numstat`。

## 验证与回执

门禁(docs-first):`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:tool-face-registry` → server `test:tool-face-manifest` → `check:tool-face-manifest`,逐门 exit code 入表。
回执 **UTF-8** 追加 `## Result` 于本文件末;含:F3 复刻的先红后绿两段输出(红在哪条断言)· 七门表 · `git diff --numstat` 对照本节边界 · 显式范围排除。**M-1**:mutation 终判归 reviewer,自查只作前置;**M-2**:header 保持 `ready`,不翻牌;不 commit、不 push、不碰 main。

## Result

> builder: Codex builder | date: 2026-08-22 | branch: `fable/v2-bn12-exoskeleton` | header 保持 `ready`，未翻牌

### 1. 实现

- `renderManifest(entries, projector = buildToolFaceManifest)` 现为可注入的单一生产编排入口；`runCli` 仍调用 `renderManifest(TOOL_REGISTRY)`，不传 projector，故生产默认值就是原 `buildToolFaceManifest`。
- 新增 `renderManifest delegates production projection to the injected projector`：手写 spy 先断言恰调用一次，再用 `strictEqual` 断言收到同一个 `projectionFixture` 引用，最后断言输出精确等于 `JSON.stringify(spyProjection, null, 2) + '\n'`。既有真实 npm spawn freshness 测试原样保留。
- 这不是平行 projector / 状态载体 / 守卫层 / 事务边界：只给既有生产编排函数增加测试接缝与默认参数；投影逻辑仍只有 `buildToolFaceManifest` 一份，生产默认仍走原正门。既有正门此前无法让测试观察“是否仍被调用”，这是增加接缝的唯一原因。

fixture exposure 按实码抄取如下，不按名字推断：

| fixture | exposure |
|---|---|
| `public_probe` | `public` |
| `internal_probe` | `public` |
| `test_probe` | `test` |
| `__reserved_probe` | `internal` |

### 2. F3 前置 mutation 自查（终判归 reviewer）

复刻方式：保留 `buildToolFaceManifest` 与全部测试不动；只让 `renderManifest` 忽略 projector 参数，内联同 duplicate-name guard、同九字段、同顺序 mapper。

**先红：**

```text
server npm.cmd run test:tool-face-manifest
exit 1
not ok - renderManifest delegates production projection to the injected projector
error: renderManifest must call the production projector exactly once
actual: 0
expected: 1
tests 6 / pass 5 / fail 1
```

红点是“生产编排未调用 projector”，不是输出字节不同，也不是函数 / import 不存在。同一 mutation 下，纯函数投影测试与真实 npm spawn 的 fresh / missing / stale 三个子测试仍绿，证明等价内联本身仍能生成自洽字节。

**还原后绿：**逆补丁恢复后，generator 工作树 blob 回到 mutation 前的 `d5ad8dd660d8fb7b76754e497ed7af0538e4c79c`。

```text
server npm.cmd run test:tool-face-manifest
exit 0
tests 6 / pass 6 / fail 0

root npm.cmd run check:tool-face-manifest
exit 0
tool-face manifest 未过期：1 条条目，其中 1 条 public。
```

### 3. 七门（docs-first）

| 顺序 | cwd / 命令 | exit | 收据 |
|---|---|---:|---|
| 1 | root `npm.cmd run docs:check` | 0 | INDEX / object inventory 最新 |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | 0 | 19 files / 209 unit；159 runtime-boundary；60 model-contract；双端 build、performance、docs、diff / secret scan 全过 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | 0 | 无输出 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | 0 | 无输出 |
| 4 | root `npm.cmd run test:unit` | 0 | 19 files / 209 tests |
| 5 | server `npm.cmd run test:tool-face-registry` | 0 | 3/3 |
| 6 | server `npm.cmd run test:tool-face-manifest` | 0 | 6/6（含新增 production-wiring killer 与既有真实 npm spawn） |
| 7 | root `npm.cmd run check:tool-face-manifest` | 0 | 1 条条目 / 1 条 public / 未过期 |

### 4. 触及面与显式排除

实现完成、写本回执前的 `git diff --numstat -- <两份允许文件>`：

| 路径 | numstat | 边界核对 |
|---|---:|---|
| `scripts/generate-tool-face-manifest.ts` | +5 / -2 | 仅导出既有编排函数、增加 projector 默认参数并调用它 |
| `scripts/generate-tool-face-manifest.test.ts` | +45 / -1 | 仅 import / 类型格式化与新增一条 spy killer；既有真实 npm spawn 测试未改 |

本 `## Result` 是工单要求的唯一 docs 写入，使用 UTF-8 追加，首行 header 未改。`git diff --check` exit 0；cached diff 空。

显式未触及：F1 的投影字段集合、顺序、duplicate guard 与纯函数测试；F2 freshness 比较；F4 双键 seam；registry；generated manifest；root / client / server package scripts；`docs:check` 与 `verify:v2-bn8-runtime` 主链接线；server/client 产品代码；schema / migration / DB；main。porcelain 所示 `client/.../useNoteCanvasRuntimeController.ts` 为已知 EOL/stat 假阳性：HEAD、index、clean-filtered worktree blob 均为 `3efe5f820e2077850611b54d4d09482845e89545`，该路径 `git diff --numstat` 为空。

未 commit、未 push。


## 附注(Opus 补,2026-08-22 收口时)

### A. 「同一形状第三次」对照表(自 `5524788` 补回)

> 本单曾有两份并发草稿:Opus `5524788`(16:38:45)与 Fable `172c60a`(16:38:55,覆盖并成为磁盘版本)。**内容同向,builder 读的是 Fable 版。** 下表只在 Opus 版中,**因其为模式级观察而非本单要求,故补为附注**,原文见 `git show 5524788`。

## ⭐ 这是同一形状的第三次,请当作模式而非孤例

| # | 出处 | 被保护的 | 未被保护的 |
|---|---|---|---|
| 1 | 12.1.3 复核 X3 | hook 内部逻辑(6/6 绿) | **root 的生产调用者可删,204/204 仍全绿** |
| 2 | 12.2a-1b 复核 M4 | freshness comparator 逻辑 | **生产比较分支可绕过,三门仍全绿** |
| 3 | **本轮 F3** | 投影纯函数逻辑(5/5 绿) | **生产 CLI 对它的调用可换成内联复制,5/5 仍全绿** |

> **三次的共同句式**:「**我们测了那段代码是对的,但没测那段代码还在被用。**」
> **写护栏时请默认问一句:如果有人保留这个函数、却不再调用它,哪条断言会红?**

---


### B. LOW-1 的残余:名实不符**未修**

回执已**按实码抄取** exposure(`internal_probe=public` / `__reserved_probe=internal`),满足「不按名字推断」这条纪律。

**但 fixture 本身的名实不符仍在**:一个叫 `internal_probe` 的条目其 exposure 是 `public`。**这是下一个读者的陷阱** —— 上一轮正是有人(调度方 Opus)按名字推断而写出了不实叙述。

**处置**:killer 强度不依赖名称(基数断言),故**不阻塞收口**;记为**清理项**,在 12.2a-1c 触及该文件时顺带对齐。**本单不改**,避免在收口前动测试文件。

## Review

> reviewer: Codex reviewer（洁净室复核 thread） | date: 2026-08-22 | target: `c4816dd6dbe8d47e51c87bff7f49c28371d1d4e3` | 修正前基线: `434c5332f6b62697f6d3ae271a216821b2a2dc13` | mutation: detached `c4816dd` linked worktree | 未改 header / 产品代码 / 常驻测试，未 commit / push / 碰 main

### 判定

**PASS —— BLOCKER 0 / HIGH 0 / MED 0 / LOW 1。**

上轮 **HIGH-1 / F3 已封住**。现行生产链是 `runCli → renderManifest(TOOL_REGISTRY) → buildToolFaceManifest(entries)`（`generate-tool-face-manifest.ts:65-69/:91-94`）；G1 删除调用并内联 mapper 后，专项门精确红在 `test.ts:167` 的 projector 调用次数 `0 !== 1`；G2 调用 projector 后丢弃返回值、另算输出，精确红在 `test.ts:177` 的输出字节断言。两刀都不是 import / 函数缺失红，且还原后 6/6。

唯一 LOW 是 G3 揭示的**可选结构加固未落**：把生产默认值改成第二份同签名 mapper，6/6 与 production check 都仍绿。当前源码本身仍严格满足必交付形状（默认值就是 `buildToolFaceManifest`、只有一份九字段 mapper）；工单把“mapper 仅出现一次”的结构 killer 明列为可选、不强制，故本轮接受此残余，不据此否定 PASS。若以后要封，应用 AST / 源码结构契约同时锁住默认 initializer 与单 mapper，不能把生产字节自洽再当证明。

本报告是复核结论，不代 Fable 行使放行权。

### 增量协议声明与基线（5-7）

本轮采用**中间轮增量协议**：结论基线为上一轮 `## Review` 的 F1–F5 与 M1 / M3 / M5 / M6 / M7；本轮全扫上轮 HIGH-1、`434c533..c4816dd` 差分面、G1–G3、spawn 接门前置、耗时与七门。F1 / F2 / F4 / F5 及 M 系用聚焦指纹比对；不重复上一轮 F1 / F2 mutation、F4 seam 组合探针或 M 系原 mutation。该范围收缩是显式声明，不是遗漏。

上轮 Result 的 exposure 抄错已由本轮 Result 按实码纠正；附注 B 所记 fixture 名实不符是既有清理项、未被本差分改变，不重复计入本轮 LOW。

### 忠实投影不变量（设计 §3.1）

`manifest` 是 registry 的**全量忠实投影**，不是 public 暴露清单；生成器不得按 `exposure` / `__` 过滤。当前差分只增加 `renderManifest` 的 projector 注入接缝与 spy killer，未改变 `buildToolFaceManifest` 的九字段、顺序、duplicate guard 或不过滤语义。

承重链现在分三段：F1 证明 projector 忠实；G1 证明编排必须调用注入 projector；G2 证明输出字节必须直接来自 projector 返回值。F2 再证明 missing / stale 不能被 freshness 分支吞掉。

### G1–G4 对抗探针

G1–G3 的 mutation 三要素均满足：位点由调度方点名；由本 reviewer 在 detached `c4816dd` linked worktree 亲测；瞄准上轮已证实的生产接线漏径及其直接变体。每刀前有 6/6 阳性，刀后逆补丁还原并核 blob / diff。

| # | mutation / 指纹 | reviewer 结果 | 裁定 |
|---|---|---|---|
| G1（上轮 F3 复验） | 保留函数、import、测试与 projector 参数；只让 `renderManifest` 忽略 projector，内联同 duplicate guard / 九字段 mapper | server `test:tool-face-manifest` **exit 1，pass 5 / fail 1**；`test.ts:167` 调用次数断言红，actual `0` / expected `1`，message 为 `renderManifest must call the production projector exactly once`；纯投影与 production fresh/missing/stale 均仍绿 | **满足必红**。红在 projector 未调用，不是 import / API 不存在。还原后 exit 0，6/6。 |
| G2 | 先 `projector(entries)`，随后丢弃其返回值，以内联 mapper 另算输出 | server 专项门 **exit 1，pass 5 / fail 1**；调用次数与同一 entries 引用断言均已通过，唯一红点为 `test.ts:177`：actual 是四条 fixture 的内联投影字节，expected 是 `spy_projection` 字节 | **满足必红**。输出字节断言承重，不允许“调用作装饰”。还原后 exit 0，6/6。 |
| G3 | 新增同签名 `copyToolFaceManifest` 第二份 mapper，并把默认 initializer 从 `buildToolFaceManifest` 改为复制函数；显式注入路径不变 | server 专项门 **exit 0，6/6**；root production `check:tool-face-manifest` **exit 0** | **假绿，记 LOW-1 并接受**。当前源码正确；未锁的是可选的默认函数身份 / 单 mapper 结构。若第二份 mapper 真被引入，F1+G1+G2+F2 的合取仍可被协调式重写绕回，故此残余必须明示。 |
| G4 | 比对 F1 projector / 忠实测试、F2 comparator / 三态测试、F4 seam、F5 spawn 的聚焦 SHA-256 指纹 | 两端依次同为 `fd09736b8c921dcc` / `f8667685fc4821ba`、`c4317b6ff0c521f8` / `abce0dc75f83d976`、`960b65c577c58580`、`71a6b75ad28bdc15` | F1 / F2 / F4 / F5 均未被本修正波及；无需重复原 mutation。 |

### 接门前置验证 1：spawn 稳定性

| 启动方式 | `npm_execpath` | 结果 |
|---|---|---|
| 正式：server `npm.cmd run test:tool-face-manifest` | 外层 PowerShell无该变量；npm lifecycle 注入 `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` | **exit 0，6/6**；真实 child 走 `process.execPath + npmExecpath + npm run docs:tool-face-manifest`。 |
| 非正式：server 直起 `node --import tsx --test ../scripts/generate-tool-face-manifest.test.ts` | 显式清除后 **missing** | **exit 1，pass 2 / fail 4**；两个纯函数测试先绿，fresh/missing/stale 均在 `test.ts:185` 主动断言 `npm_execpath is required...` 处红。字符串由常驻测试 guard 写入，不是 child / import 假红。 |
| 链内等价模拟：root `npm.cmd exec -c "cd server && node --import tsx --test ../scripts/generate-tool-face-manifest.test.ts"` | 进入 outer npm 前 missing；npm lifecycle 内存在并传给测试 | **exit 0，6/6**。当前 verify 尚未接门，故这是 npm 链环境模拟，不冒充“现有 verify 已执行专项门”。 |

**接门结论**：按正式 `npm run verify:v2-bn8-runtime` 接入时，`npm_execpath` 由 npm lifecycle 确定性提供并由后代继承，不会偶发红；绕过 npm 直接 `node --test` 会确定性、主动红。这是启动契约差异，不是 flaky。若未来改由非 npm task runner 启动，须显式传 npm CLI 或改 spawn 设计。

### 接门前置验证 2：耗时增量

同一精确 `c4816dd` worktree 顺序计时：

| 门 | exit | elapsed |
|---|---:|---:|
| server `test:tool-face-registry` | 0 | 0.458 s |
| server `test:tool-face-manifest` | 0 | 3.159 s |
| root `check:tool-face-manifest` | 0 | 0.659 s |
| **三项合计** | — | **4.276 s** |
| root `verify:v2-bn8-runtime`（现链） | 0 | **37.437 s** |

按当前串行形状接入的实测增量是 **+4.276 s**（约为现 verify 墙钟的 **11.4%**；同次量级预计总墙钟约 41.713 s）。该增量可接受，且不是“零成本”门。

### 七门亲跑（docs-first）

全部在 detached、精确 `HEAD=c4816dd6dbe8d47e51c87bff7f49c28371d1d4e3` 的 LF linked worktree 亲跑，不采信 builder 七门表。

| 顺序 | 命令 | reviewer 结果 |
|---|---|---|
| 1 | root `npm.cmd run docs:check` | **exit 0**；INDEX / object inventory 最新（0.368 s） |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | **exit 0**；19 files / 209 unit、159 runtime-boundary、60 model-contract、双端 build、performance、docs、diff / secret scan 全过（37.437 s） |
| 3a | client `npm.cmd exec -- tsc --noEmit` | **exit 0**；无输出（9.641 s） |
| 3b | server `npm.cmd exec -- tsc --noEmit` | **exit 0**；无输出（4.858 s） |
| 4 | root `npm.cmd run test:unit` | **exit 0**；19 files / 209 tests（7.428 s） |
| 5 | server `npm.cmd run test:tool-face-registry` | **exit 0**；3/3（0.458 s） |
| 6 | server `npm.cmd run test:tool-face-manifest` | **exit 0**；6/6（3.159 s） |
| 7 | root `npm.cmd run check:tool-face-manifest` | **exit 0**；1 条 / 1 public / 未过期（0.659 s） |

### 触及面（`git diff --numstat 434c533..c4816dd`）

range 共 6 commits，`434c533` 是目标祖先；`git diff --check` exit 0，合计 7 files / +330 / -4。

| 路径 | numstat | 归因 / 边界 |
|---|---:|---|
| `scripts/generate-tool-face-manifest.ts` | +5 / -2 | builder 允许面；仅导出编排入口、projector 默认参数与调用 |
| `scripts/generate-tool-face-manifest.test.ts` | +45 / -1 | builder 允许面；新增 spy killer 与 import/type 格式调整 |
| 本 fix2 handoff | +140 / -0 | 调度工单 + builder Result / 附注收据 |
| 上轮 fix handoff | +123 / -0 | 调度方提交上轮 Review |
| `docs/agent-ops/INDEX.md` | +2 / -1 | 调度方两版工单索引 |
| `docs/agent-ops/claude-log/2026-08-22.md` | +11 / -0 | 调度归因 / 双发事故收据 |
| `docs/agent-ops/handoffs/README.md` | +4 / -0 | 调度治理：builder lock 规则 |

严格字面不止“回执 / INDEX / log”：还包含 handoff README 与上轮 Review 文件；commit message 链 `5524788 / 172c60a / 3f37318 / f7c11ca / bbb376c` 明确承载这些调度治理改动，目标实现 commit `c4816dd` 才改两份允许脚本与本单 Result。归因没有使用本仓恒定作者字段。故**实现触及面只有两份允许文件，无 builder 越界**。

共享树当前 `HEAD=3a347be` 比目标只多调度 log；两份脚本 blob 与 `c4816dd` 相同。预告的 controller `.M` 仍是 EOL 假阳性：HEAD / index / clean-filtered worktree 都是 `3efe5f820e2077850611b54d4d09482845e89545`，path-filtered `git diff --numstat` 为空；raw blob `d9e969...` 只承载行尾，不计越界。

### 未上主链

同一 root scripts 探针先命中独立 `docs:tool-face-manifest`、`check:tool-face-manifest`、`check:tool-face-parity`（全 scripts 对 `tool-face|manifest|parity` 共 12 token），证明探针看得见目标；收窄到 `docs:check` 与 `verify:v2-bn8-runtime` 后均为 0。`docs:check` 委托的 `docs-index.mjs` / `docs-inventory.mjs` 对三词计数均 0，且无 `child_process / spawn / execFile / execSync`，没有在下一层暗接门。

因此截至目标提交，verify 与 docs:check **仍不含 registry / manifest / parity 专项门**，符合本工单“复核 PASS 后再由调度方接线”的边界。

### 5-2 跨条耦合扫描

| 基线结论 | 增量证据 | 结论 |
|---|---|---|
| F1 忠实投影 | projector 与忠实测试聚焦指纹两端相同；G1/G2 新增而 F1 本体未改 | 不受波及 |
| F2 fresh/missing/stale | comparator 与三态测试聚焦指纹两端相同 | 不受波及 |
| F4 双键 test seam | `resolveOutputPath` 指纹 `960b65c...` 相同 | 不受波及；未来主链仍不得同时污染 `NODE_ENV=test` 与专用 output-path env |
| F5 真实 npm spawn | `runManifestCli` 指纹 `71a6b75...` 相同；本轮三启动方式补了运行证据 | 正式 npm 稳定；direct node 确定性主动红 |
| M1 真 Zod / 正常 converter | registry blob `143ad8be...` 相同；`buildToolFaceManifest` / serialize 路径未改 | 不受波及 |
| M3 旧 shared registry / parity | `shared/types/toolRegistry.ts` 两端 absent；旧 parity blob `19a2bda0...` 相同；`server/src` range diff 为空 | 不受波及 |
| M5 URL 语义门归 1c | `App.tsx=09c83db0...`、`CourseDetail.tsx=cc3af13a...`、generated manifest=`f1fc5014...` 相同 | 不受波及；本单不冒充入口可达性 |
| M6 `.strict()` | registry test blob `a868de36...` 相同 | 不受波及 |
| M7 converter devDependency | server lock `6ab4b234...`、server package `6353e5cb...` 相同 | 不受波及 |

**合取结论**：在当前唯一默认 projector 的源码形状下，F1 + G1 + G2 + F2 已封住“生产复制 / 过滤投影后，再由 freshness 对复制体自洽假绿”的旧复合漏径。G3 同时证明：若未来有人协调式引入第二 mapper 并把默认值切过去，现有动态门仍可假绿；这正是本轮 LOW-1 的边界，而不是把 HIGH-1 洗白。

### D 段：阴性断言的阳性对照

| 阴性断言 | 同一探针先看见的阳性 | 阴性结果；信号是谁写入 |
|---|---|---|
| G1 不是 import / 函数缺失红 | mutation 前与还原后同门 6/6；mutation 中纯投影与 production 三态仍绿 | 仅 `test.ts:167` 的 call-count `0 !== 1` 红；message 来自 `test.ts:170` |
| G2 projector 不是“没调用” | G2 中 call-count 与 same-reference 两断言通过 | `test.ts:177` 输出 equality 红；expected 由 spy 写入，actual 由内联 mapper 写入 |
| direct node 不是假绿 | 正式 npm 同一测试 6/6，outer npm 模拟也 6/6 | 缺变量时 line 185 主动红；字符串由测试 guard 写入 |
| 主链阴性探针看得见目标 | 全 scripts 先命中三条独立专项 script / 12 token | docs / verify 精确值与两委托脚本均无接线 |
| controller `.M` 不是范围差分 | range probe 先看见两份实现文件与五份调度 docs | controller path numstat 空，三枚 clean blob 相同；`.M` 来自行尾 |
| G3 不是 no-op | mutant 源码探针真实命中第二 mapper 与默认 initializer 改写 | 仍 6/6 + production check 0；该绿由显式注入测试绕开默认值、production 对复制字节自洽共同造成 |

### 5-1 收据完备、还原卫生与显式范围排除

- **隔离 / 还原**：根仓 `.git` 对 reviewer 只读，直接 `git worktree add` 被权限闸拒绝且未创建目录；随后以临时 seed clone 创建真实 detached linked worktree。G1/G2/G3 均逆补丁还原。最终精确 worktree 的 generator / test raw blob 分别为 `d5ad8dd660d8fb7b76754e497ed7af0538e4c79c` / `988f35a863238dde58f2c020baf83e27bde402e5`，等于 HEAD；status、worktree diff、cached diff、untracked 全空，`git diff --check` exit 0；还原后专项门 6/6、production check exit 0。linked worktree 已移除。
- **环境假红排除**：首个 checkout 继承 `core.autocrlf=true`，使 canonical JSON raw blob `53fe4c...` 与 HEAD `f1fc5014...` 不同、clean-filtered blob仍相同，production check 因 CRLF 字节假红；该收据没有计入 G3。重建 `core.autocrlf=false` 的 exact-byte worktree 后，baseline、mutant、还原三次 production check 均按相应预期重跑。
- **临时元数据例外**：linked worktree 已删除；sandbox 拒绝递归删除 seed Git 元数据，故一份无 checkout、已改名且被 `.gitignore` 排除的 seed metadata 暂留 `.codex-tmp/review-fix2-seed/seed-metadata`，不含产品源码、不影响 Git 树。唯一**tracked**共享树写入仍是 UTF-8 追加本 `## Review`。
- **他方证据承重 / 装饰**：builder Result 的 6/6、mutation 与七门数字只作定位；G1–G3、七门、差分、主链与还原卫生均由 reviewer 自验。
- **显式范围排除**：未启动 live server / DB、未跑浏览器 journey——本单只交付生成器编排与机械测试，live 收据回答不了 G1–G3；未持有 Linux runner；未重复 5-7 基线内的旧 mutation；未检查 12.2b MCP handler、12.2a-1c parity 接线或部署打包。上述均不属于本增量单射程。
- **共享树边界**：未改产品代码、常驻测试或 header；未 commit / push / 碰 main。Review 落盘后的共享 porcelain 只应保留本 handoff 与既知 controller EOL `.M`，判真以 numstat / blob 为准。
