> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready | re: v2bn12-precommit-docs-warn | date: 2026-08-27

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
