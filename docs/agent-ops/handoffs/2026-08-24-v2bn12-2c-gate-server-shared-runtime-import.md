> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: **ready-on-condition**(⭐ Fable 2026-08-24 **已审毕并翻牌,生效条件由她写定**:**c-2 复核 PASS 之时自动 ready、即可派**,调度方照条件执行不再请示。⚠️ **此刻不可派** —— `ready` 在协议里意味「此刻可派」,故此处不写 `ready`) | re: v2bn12-2c-gate | date: 2026-08-24

# V2.BN.12.2c-gate:`check:server-shared-runtime-import` —— 架构不变式的机械化

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> 📌 **派单时点**:c-2 复核 PASS 后开,**与 c-3 并行**(本闸无旅程含义,不占收口关键路径)。

## 为什么有这道闸

**server 产品码运行时 import `shared`,会在测试世界绿、在 dev 与产物世界炸** —— 这个失败形态**穿过我们现有全部门禁**(现物已验,见 **TD-21** 三世界矩阵)。

**⭐ 立闸的理由(Fable 裁定原话)**:**靠人守的规矩,和我们刚否掉的那种,是同一类东西。**
2026-08-24 这个错**只被人追平了一次**(c-2 的 H-2 停在旧裁定上,改了上游没追下游);**下次没人追,它就穿过去了。**

📌 **档位归属**:本闸**不是安全矩阵**,⛔ **不违 P0–P3 降档** —— 它是**架构不变式的机械化**,与 parity 门、manifest 新鲜度门同族(**P0 家族**)。
⭐ 它还把 `server/src/mcp/manifest.ts` 顶注那条**成文设计决定**从**文档**升格成**门禁** —— **文档会被忘,门不会。**

## S1:检查脚本

**新建** `scripts/check-server-shared-runtime-import.mjs`。

**判据**:`server/src/**` 内**不得出现非 `import type` 形式的 shared import**(`@shared/*` 与相对路径两种写法都要覆盖)。

- ⛔ **排除 `server/src/__tests__/`**。
  ⭐ **理由必须写进脚本注释**:契约测试**必须**静态 import shared —— **那是 A1′ 跨端全等的锁点本身**;而测试世界(tsx)已验可用。**⇒ 本闸拦的是「产品码跨界」,不是「测试跨界」,两者必须分开。**
- ⭐ **从严判定**:凡 shared import 的 import 子句**不是纯 `type` 形式**,**一律拒** —— 含 `import { type A, b } from '@shared/...'` 这类**混合子句**。
  ⭐ **理由必须写进单与注释**:**现状零条混合**,从严的成本是**将来可能一次误报**,放过的成本是**运行时炸**。**不对称明显 ⇒ 宁误报,不放过。**

**现状基线**(调度方已亲验,`server/src` 下 shared import 共 2 条):`mcp/manifest.ts:8` 是 `import type` ⇒ 放行;另一条在 `__tests__/` ⇒ 排除。**⇒ 立闸当下应为 0 条命中。**

## S2:接门

接进 `verify:v2-bn8-runtime`,并加 `check:server-shared-runtime-import` 顶层 script。⛔ 不改其它门的次序或内容。

## K 系 killer

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐⭐ **闸不是装饰品(阳性对照)** | 造一个**违规样本** —— 在 scratch/临时文件里放一条运行时 shared import ⇒ **闸须红,并指出该文件** | ⛔ **没有这一刀,就无法区分「零命中=真干净」与「零命中=闸瞎了」**(空集同时是两者的合法输出) |
| **K-2** ⭐ **`import type` 不误伤** | `mcp/manifest.ts` 现有的 `import type` ⇒ **闸须绿** | 阴性对照 |
| **K-3** ⭐ **混合子句被拒** | 造 `import { type A, b } from '@shared/...'` ⇒ **闸须红** | 从严判定的承重刀 |
| **K-4** ⭐ **`__tests__` 确被排除** | 在 `server/src/__tests__/` 下放一条运行时 shared import ⇒ **闸须绿** | 防闸拦掉 A1′ 的锁点 |
| **K-5** | 两种写法都覆盖 | `@shared/*` 与相对路径 `../../../shared/...` **各造一个违规样本**,⇒ **两个都须红** |

**红的性质**:闸脚本以**非零退出码 + 指出违规文件**为红;⛔ 违规样本**用完必须撤净**,并按下方**双面自证**。

## 边界

**允许**:**新** `scripts/check-server-shared-runtime-import.mjs` · 根 `package.json` 加 script 并接 `verify:v2-bn8-runtime` · 相应测试 · killer 用的临时违规样本(**用完撤净**)。
**⛔ 不得**:改任何产品码 · 改 tsconfig / 构建脚本 · 改其它门 · 碰 `docs/agent-ops/`(唯一例外:向本工单追加 `## Result`)。
**越界即停,标 `needs: claude`。**

## 🔴 探针/样本撤净:**必须双面自证**

**⚠️ 编译报错但仍 emit** ⇒ 失败的构建照样写产物(2026-08-24 c-1b 第 1 版实证:源码撤净了,`server/dist/mcp/manifest.js` 里探针还在)。
⇒ **双面**:①源码 blob 等于 HEAD;②**产物面** —— 违规样本符号在 `server/dist/**` 无命中(或重建产物后复验)。**⛔ 只报源码面 = 未撤净。**

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **client 侧的对称闸**(client 运行时 import server) | 「反方向的跨界」 | 本单不做 —— **client 走打包器,没有同类失败形态**;⛔ 不得顺手加 |
| 多轮 refute / 自由巡猎 | 「点名 killer 之外的未知漏径」 | P3 停做 |

⭐ **另请申报(不必测)**:本闸只看**静态 import**。**动态 `import()` 与 `require()` 能绕过它吗?** 只要观感,不要你去验 —— 若能绕,那是闸的已知射程边界,该记账。

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14)· TD-6 · TD-19/20 · TD-16 · **TD-21**(构建体系本段不修,⛔ 不得声称已修)· TD-12。

## D. 探针 / 锁 / 环境

⭐ 凡阴性结论至少要有第二个独立来源同意 —— **本闸的输出恰是阴性结论(「零违规」),故 K-1 阳性对照是硬要求,不是可选**。
📌 **`npx` 会被 PowerShell execution policy 挡在 `npx.ps1` 层 ⇒ 用 `npx.cmd`。**
⚠️ **已知 EOL 假阳性三个**:`useNoteCanvasRuntimeController.ts` / `server/src/routes/projections.ts` / `SelectionToolbarLayer.tsx` ⇒ 判真用 blob 哈希或 `--numstat`,⛔ 不用 porcelain。
📌 提交完整性:改了文档跑 `docs:index` 一起交;生成件是 tracked 的 ` M` 不在 `??` 里;**门禁跑在工作树、提交的是暂存树,可以一绿一红**。
📌 dev 服务在 `:3001`/`:5173`(调度方所有,⛔ 不要杀)。
📌 **PID 8292 的 codex.exe 是 Henry 的桌面应用 —— ⛔ 不得杀、不得干扰。**
锁由发单方(opus)持有 —— ⛔ 不取锁、不写 owner.json、不删锁。
⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。

## 验证与回执

门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime`(**含新闸**)→ 双 `tsc --noEmit` → `test:unit` → `test:v2` → 五道 tool-face 门。
**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
