> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-precommit-docs-warn | date: 2026-08-27

# 收口批:pre-commit 软闸(提交前 `docs:check`,**只警告不阻断**)

## 定位与授权链(⭐ 逐字重读过,不照记忆)

**病因**(`claude-log/2026-08-23.md:203` / `:217`):**「破损精确基线、后继修复」同一形状第二次出现,两次都在调度方提交步** —— `d799d50` 漏 untracked 新文件、另一次漏 ` M` 生成件。⇒ 「提交前跑 `docs:check`」作为**清单项已经证明两次不够**。

**授权**(`claude-log/2026-08-26.md:45`,Henry 本人直接作答,已随 `0274acb` 执行):
> **②pre-commit 取「只警告」档(实现排到版本收口批,理由=按闸出生证家法,硬拦无入场事故)**

⇒ **只警告,不阻断。⛔ 任何情况下都不得让提交失败。**
📌 之所以是软闸而非硬闸,理由在源头写着:**按闸出生证家法,硬拦无入场事故** —— 现有事故是「漏提交生成件」,不是「提交了坏代码」;硬拦会外溢到 Henry 与 Codex 的日常提交,代价大于当前证据。

## 交付物

### 1. 新建 `.githooks/pre-commit`(**tracked**,不是 `.git/hooks/`)

- **行为**:跑 `npm run docs:check`;
  - 通过 ⇒ 静默(或极短一行)`exit 0`;
  - **不通过 ⇒ 打印醒目警告 + 修复命令提示(`node scripts/docs-index.mjs`),然后仍然 `exit 0`**。
- ⛔ **绝对不得 `exit 1`** —— 任何路径下都不得阻断提交。⚠️ 包括:`npm` 不存在、脚本抛错、超时 —— **一律吞掉并 `exit 0`**,最多打印一行「软闸自身失败,已跳过」。
- ⭐ **必须在警告文案里写明它看不见什么**(见 §「已知射程边界」),⛔ 不得让人以为「它绿=生成件一定同步了」。
- **可移植性**:本仓在 Windows + Git Bash 下工作 ⇒ 用 `#!/bin/sh`;⛔ 不要用 PowerShell 语法、⛔ 不要依赖 `bash` 专有特性。

### 2. ⛔ **不要激活它**(这一步不归你)

- ⛔ **不要运行 `git config core.hooksPath .githooks`**;
- ⛔ **不要写入 `.git/hooks/` 任何文件**;
- ⛔ **不要加 husky 或任何新依赖**;
- ⛔ **不要在 `package.json` 加 `prepare` 脚本自动装钩子**。

**理由**:`core.hooksPath` 改变的是**仓库使用者本人**(Henry / Codex)的 git 行为,**属于他的环境**。授权覆盖的是「上软闸」这件事,**激活动作留给他本人执行**。
⇒ **你要做的是:在回执里给出那一行激活命令的准确写法**,以及**如何撤销**(`git config --unset core.hooksPath`)。

### 3. 文档一行

在 `docs/agent-ops/current-state/` 里**已有的合适文件**中(⚠️ **自己找,⛔ 不要新建文件**;若判断无合适落点,**如实说明并把这一行写进回执**,由调度方安置)加一行:说明该软闸存在、如何启用、以及**它只警告不阻断**。

## ⚠️ 已知射程边界(⭐ 必须写进警告文案与回执,⛔ 不得省略)

- **`docs:check` 检查的是工作树,不是暂存快照** ⇒ 若你 `git add` 了旧版生成件、而工作树里已重新生成,软闸会**说绿**,提交的却是旧版。**软闸看不见 index 与工作树的差异。**
- 它**只覆盖 `docs:check` 那两项**(`docs-index` / `docs-inventory`),**不覆盖**「新文件忘了 `git add`」这类完整性问题 —— 而那**恰恰是 `d799d50` 那次事故的形状**。
📌 **记账而非假装闭合**:软闸的价值在于**它知道自己看不见什么**;⛔ 不得因本单把提交步描述为「已机械化」。

## 必红判据

- **K-1(警告确实会出现)**:人为让 `docs:check` 失败(⚠️ **最干净的做法:新建一个临时 md 文件使 INDEX 过期**,⛔ 不要改任何既有文档内容)⇒ 直接执行钩子脚本 ⇒ **必须打印警告**。清理临时文件后 ⇒ 不再警告。
- ⭐ **K-2(灵魂刀:证明它真的不阻断)**:在 K-1 的失败状态下,**执行钩子脚本并检查其退出码 ⇒ 必须为 `0`**。
  ⚠️ **⛔ 不要用真实 `git commit` 来验这一条** —— 本单禁止 commit。**直接跑脚本取 exit code 即可**,并在回执贴出实际退出码。
- **K-3(自身失败也不阻断)**:模拟软闸自身出错(例如临时把它调用的命令改成一个不存在的命令,⚠️ 改完先证脚本语法可解析:`sh -n .githooks/pre-commit`)⇒ **退出码仍须为 `0`**;恢复后复验。
- 既有 `docs:check` / `test:unit` / `test:v2` / `verify:v2-bn8-runtime` 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`.githooks/pre-commit`(新建)· `docs/agent-ops/current-state/` 下**一个既有文件** +1 行(见 §3)· `docs/agent-ops/current-state/deferred-tests.md`(+1 行台账)。

**禁区**:`.git/**`(⛔ 包括 `.git/hooks/` 与 `.git/config`)· 任何 `package.json`(⛔ 不加依赖、不加 `prepare`)· `scripts/**` 既有脚本 · `server/**` 与 `client/**` 全部产品码 · `.gitignore` · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— 判真用 `git hash-object --filters --path` 对 HEAD blob 比对。
- ⚠️ **mutation 必须先证明它自己可解析/可运行**(K-3 明确要求 `sh -n`)。语法坏掉造成的失败只证明脚本被改坏,**不证明判据有鉴别力**。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ **不 commit、不 push、不碰 main** —— ⚠️ **本单尤其重要**:你在做的正是提交步的钩子,**⛔ 不要用真实提交去测试它**。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因。

## 验证与回执

门禁:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2` → `verify:v2-bn8-runtime`。逐门 exit 入表。
(⚠️ 本单不动产品码,门禁主要用于证明**没有意外外溢**。)

回执 **UTF-8** 追加 `## Result`:K-1/K-2/K-3 各一段(**K-2 必须贴实际退出码**)· **激活命令与撤销命令的准确写法** · **§「已知射程边界」两条是否已写进警告文案**(贴文案原文)· §3 那一行的落点(或「无合适落点」的说明)· `git diff --numstat` 对照边界 · 显式范围排除(含**未碰 `.git/**`、未加依赖、未真实提交**)。

⏱ 预估 20–30 分钟。

## Result

### 实现

- 新建 `.githooks/pre-commit`：`#!/bin/sh`、纯 POSIX `sh` 语法；委托既有 `npm run docs:check`，不另造文档检查器。现有正门不足之处仅是提交前没有机械触发，因此本钩子只负责调用正门并报告结果。
- 钩子以 `timeout -k 5s 60s` 约束执行时间；`npm` 缺失、`timeout` 缺失、命令无法执行、超时、`docs:check` 非零及信号退出路径最终均由 fail-open 路径收束为 `exit 0`。正常通过时静默。
- 当前仓库 `core.autocrlf=true` 且无 `.gitattributes`；脚本各执行行在注释标记前结束，并以 CRLF 流实测 `sh -n` / 执行均为 `0`，未扩大触及面去新增属性文件。
- 平行机关申报：没有复制 `docs-index` / `docs-inventory` 逻辑；唯一判断仍来自 `npm run docs:check`。

### K-1 — 警告出现与清理

- 用临时文件 `docs/agent-ops/current-state/precommit-soft-gate-k1-probe.md` 使 INDEX 过期；`npm run docs:check` 实测 exit `1`，报告 `docs/agent-ops/INDEX.md` 与 `docs/agent-ops/current-state/INDEX.md` 过期。
- 直接执行 `sh .githooks/pre-commit`，醒目警告、修复提示和两条射程边界均出现。
- 删除临时文件后，`docs:check` 恢复 exit `0`，再次直接执行钩子静默、exit `0`；临时文件已清理，未运行生成器去改 INDEX。

### K-2 — 失败不阻断

- K-1 失败状态下直接执行脚本的实际退出码：**`0`**。未使用真实 `git commit`。

### K-3 — 软闸自身失败不阻断

- 临时把被调用命令改为不存在的 `coincides_docs_check_command_does_not_exist`；改后先跑 `sh -n .githooks/pre-commit`，实际 exit `0`，再直接执行脚本，实际 exit `0`，并打印「软闸自身失败，已跳过」。
- 恢复正式命令后，`sh -n` exit `0`、直接执行 exit `0`。另以一秒真实超时探针复验 timeout 分支：改后先 `sh -n` exit `0`，执行 exit `0`；随后已恢复 `timeout -k 5s 60s npm run docs:check`。
- 补充环境分支实测：隐藏 `npm` 时 exit `0`；隐藏 `timeout` 时 exit `0`。

### 验证

| 门 | 结果 |
|---|---:|
| `npm run docs:check` | exit `0` |
| client `tsc --noEmit` | exit `0` |
| server `tsc --noEmit` | exit `0` |
| `npm run test:unit` | exit `0`（23 files / 224 tests） |
| server `npm run test:v2` | exit `0`（280 / 280） |
| `npm run verify:v2-bn8-runtime` | exit `0` |
| `git diff --check`（tracked 本单文档） | exit `0`；新钩子另由 `sh -n` 覆盖 |

### 激活与撤销（本单未执行）

- 激活：`git config core.hooksPath .githooks`
- 撤销：`git config --unset core.hooksPath`

### 已知射程边界

两条均已逐字写入钩子的失败警告文案：

> 射程边界 1：docs:check 检查工作树，不检查暂存快照。若旧版生成件已 git add、工作树随后重新生成，软闸可能说绿，但提交的仍是旧版；它看不见 index 与工作树的差异。
>
> 射程边界 2：软闸只覆盖 docs:check 的两项（docs-index / docs-inventory），不覆盖“新文件忘了 git add”；这正是 d799d50 事故的形状。

因此本单不把提交完整性描述为「已机械化」；软闸绿不证明暂存快照或漏 add 新文件正确。

### §3 文档落点与降档台账

- 落点：`docs/agent-ops/current-state/README.md` 的 `## 5. Maintenance`，新增一行：「可选的提交前文档软闸位于 `.githooks/pre-commit`；仓库使用者可运行 `git config core.hooksPath .githooks` 显式启用；该钩子只作警告，任何路径（包括钩子自身失败）均不阻断提交。」
- `docs/agent-ops/current-state/deferred-tests.md` 新增一行，记录 K-1/K-2/K-3 仅为施工期直跑、完整失败矩阵与两条边界文案没有常驻守卫。

### `git diff --numstat` 对照边界

下表为写回本回执前的交付物实测；新文件用 `git diff --no-index --numstat` 计数，本回执自身不纳入自指计数：

| 文件 | 增 | 删 |
|---|---:|---:|
| `.githooks/pre-commit` | 41 | 0 |
| `docs/agent-ops/current-state/README.md` | 1 | 0 |
| `docs/agent-ops/current-state/deferred-tests.md` | 1 | 0 |

### 范围排除与现场保全

- 未触碰 `.git/**`，未运行 `git config core.hooksPath`，未写 `.git/hooks/`，未激活钩子。
- 未改任何 `package.json` / lockfile，未加依赖、husky 或 `prepare`；未改 `scripts/**`、`.gitignore`、`.claude/**`、client/server 产品码或其他 handoff/analysis 文档。
- 未取、未覆盖、未删除 `.codex-tmp/builder.lock.d`；未杀任何 Codex 进程。
- 未执行真实 `git commit`，未 push，未碰 main。
- 现场三个 EOL 假阳性路径均以 `git hash-object --filters --path` 对 HEAD blob 复核为逐位相同；树上既有 `tech-debt.md`、`server/src/routes/projections.ts` 与 `.claude/settings.local.json` 改动未纳入本单、未改写。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/0/0**(附一条候选改进,不阻塞)

### 1. 收工判定(两条并用)

进程 `32504` **消失** ∧ 交付物出现(`.githooks/pre-commit` 新建 41 行 · `current-state/README.md` +1 · `deferred-tests.md` +1)。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| ⛔ **未激活** | `git config --get core.hooksPath` | **空** ⇒ 未激活;`.git/**` 未被写入 —— **「授权上闸 ≠ 授权替他扳闸」这条边界被守住** |
| ⭐ **K-2 灵魂刀(复核方亲施)** | 新建临时 md 使 `docs:check` **exit 1**,直接 `sh .githooks/pre-commit` | **警告四行全出**(含两条射程边界逐字),**`HOOK EXIT=0`** ⇒ **不阻断被实证** |
| **绿路径** | 清理探针 + 重生成 INDEX 后再跑 | `docs:check` exit 0;钩子**静默**且 `exit 0` |
| **警告文案含射程边界** | 读钩子源码 | 两条**逐字在文案里**(工作树≠暂存快照 / 不覆盖忘 `git add`,并点名 `d799d50` 的事故形状) |
| **探针自清** | `ls` | 临时 md 已删,`docs:check` 复绿 |

### 3. ⭐ 实现里两处值得记的设计

1. **fail-open 是结构性的,不是分支覆盖出来的**:开头即 `trap 'allow_commit' 0 1 2 3 15`,`allow_commit` 先 `trap - 0 1 2 3 15` 再 `exit 0`。⇒ **即便脚本在任何未预料的位置崩掉或收到信号,退出码仍是 0**。
   ⚠️ 对比「逐个分支都写 `exit 0`」:那种写法**只在想到的路径上不阻断**;这种写法**在没想到的路径上也不阻断** —— 而软闸的第一属性就是「永不误伤提交」。
2. ⭐ **CRLF 自防护**:每条可执行行都以 `; #` 结束。本仓 `core.autocrlf=true` 且**无 `.gitattributes`** ⇒ 检出时行尾可能变 CRLF,而 `\r` 会落进注释里、不进入命令。builder 主动申报了这个理由,并**实测以 CRLF 流跑 `sh -n` 与执行均为 0**。

### 4. 一条候选改进(⚠️ 不阻塞,不在本单)

`; #` 的写法**有效但可读性差**。**常规解法是加 `.gitattributes`**(`.githooks/* text eol=lf`)。
⇒ builder **明确申报了「未扩大触及面去新增属性文件」** —— **判为合理**(工单禁区含 `.gitignore` 一类仓库级配置,新增 `.gitattributes` 会影响全仓行结尾策略,属独立改动面)。
📌 记为**候选**:若将来仓库要加 `.gitattributes`,可顺带把这个钩子改回常规写法。

### 5. 边界与门禁

- **零越界**:未碰 `.git/**`、未改任何 `package.json`/lockfile、未加依赖/husky/`prepare`、未改 `scripts/**`、`.gitignore`、`.claude/**`、产品码;**未执行真实 `git commit`**(工单对本单尤其强调的一条)。
- builder 自跑门禁全绿(`test:unit` 23/224 · server `test:v2` **280/280** · `verify:v2-bn8-runtime` exit 0)。
  📌 `test:v2` 279 → **280** 与 TD-17 那单新增的 T-1 相符,数字可追溯。

### 6. 结论 + 待 Henry 的一步

**PASS 0/0/0/0**。软闸**已交付但未启用** —— 这是设计使然。

**⇒ 需要仓库主人本人执行的一行(⛔ 未由任何 agent 代跑)**:
```
git config core.hooksPath .githooks
```
**撤销**:
```
git config --unset core.hooksPath
```

📌 **⛔ 不得因本单把提交步描述为「已机械化」** —— 软闸有两条明写的盲区(见 §2 表格与钩子文案),**它的价值恰在于它自报测不到什么**。
