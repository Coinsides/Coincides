> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(第二修正单,增量复核 FAIL(方向成立)0B/1H/0M/1L) | re: v2bn12-2a-1b-fix2 | date: 2026-08-22

# V2.BN.12.2a-1b-fix2:生产接线 killer(第三次同族漏层)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位

前一修正单的两条 killer **已被增量复核确认有效**:
- **F1**:纯函数加 exposure 过滤 ⇒ 基数 `2 !== 4` 直接红 ⇒ **投影逻辑层已封住**
- **F2**:比较分支改恒假 ⇒ missing 与 stale 由同一生产 npm 入口直接红 ⇒ **原 HIGH-2 已封住**

**FAIL 只来自一处:生产接线层仍开洞。**

### ⛔ F3 实测的漏径

保留 `buildToolFaceManifest` 与全部测试**一字不动**,只把 `renderManifest` 里的 `buildToolFaceManifest(entries)` 换成**同字段、同顺序、同 duplicate-name guard 的内联 `entries.map(...)`**:

- `test:tool-face-manifest` → **exit 0,5/5**
- `check:tool-face-manifest` → **exit 0**
- **没有任何断言红**

⇒ **常驻测试保护了纯函数的逻辑,却没有保护「生产 CLI 必须调用它」。修正单明令禁止的平行机关可以在不亮红灯的情况下回来。**

---

## ⭐ 这是同一形状的第三次,请当作模式而非孤例

| # | 出处 | 被保护的 | 未被保护的 |
|---|---|---|---|
| 1 | 12.1.3 复核 X3 | hook 内部逻辑(6/6 绿) | **root 的生产调用者可删,204/204 仍全绿** |
| 2 | 12.2a-1b 复核 M4 | freshness comparator 逻辑 | **生产比较分支可绕过,三门仍全绿** |
| 3 | **本轮 F3** | 投影纯函数逻辑(5/5 绿) | **生产 CLI 对它的调用可换成内联复制,5/5 仍全绿** |

> **三次的共同句式**:「**我们测了那段代码是对的,但没测那段代码还在被用。**」
> **写护栏时请默认问一句:如果有人保留这个函数、却不再调用它,哪条断言会红?**

---

## 交付物:一条生产接线 killer

### 要求

必须新增**专门锁住生产编排**的常驻断言,证明 `runCli → renderManifest → buildToolFaceManifest` 这条链**仍然成立**。

复核给了两条可选路径(**由你选,并在回执申报选择理由**):

| 方案 | 做法 | 注意 |
|---|---|---|
| **A 结构契约** | 用 TypeScript AST / 结构检查锁住调用链,并**拒绝 `buildToolFaceManifest` 之外出现第二份九字段 mapper** | 需定义「九字段 mapper」的可判定特征,避免误伤无关代码 |
| **B 可注入 projector + spy** | 把 CLI 编排做成**可注入 projector 的单一入口**,用 spy 断言生产编排确实调用它;**同时保留真实 npm spawn 测试** | ⛔ **spy 不得取代真实 spawn** —— 否则又回到「只测逻辑」 |

### ⛔ 明确不够的做法(复核已点名)

> **只把生产临时产物与 helper 输出做 `deepEqual` 不够** —— **语义相同的复制仍会绿。**

### ⛔ 必红判据

**重跑 F3**(保留纯函数与全部测试,只把 `renderManifest` 里的调用换成等价内联 mapper):
**必须红,且红在「生产未调用同一 projector」这条断言上** —— 不是红在字节不等、不是红在函数不存在。

---

## LOW-1:fixture 描述与源码不符(**上游/调度方的错,非你的错**)

`scripts/generate-tool-face-manifest.test.ts` 的**实际** exposure 是:

| 条目 | 实际 exposure | 前一轮回执与调度方 log 误称 |
|---|---|---|
| `public_probe` (`:36/:46`) | `public` | public ✅ |
| **`internal_probe`** (`:50/:60`) | **`public`** | internal ❌ |
| `test_probe` (`:64/:74`) | `test` | test ✅ |
| **`__reserved_probe`** (`:78/:88`) | **`internal`** | public ❌ |

**后果**:前一轮回执称「`__` 条目为 public,使 exposure 误过滤与 `__` 误过滤互不遮蔽」——**该性质不存在**。exposure 过滤实际删掉的是 `test_probe + __reserved_probe`。

> ⚠️ **调度方(Opus)在 claude-log 与 commit message 里把这个不实描述当作优点复述了,已在本单更正。** handoff 与 log 都是追加式历史、不回改原文,**以本单与增量复核的更正为准**。

### 本单要求

1. **把 fixture 的名实对齐**:`internal_probe` 的 exposure 现为 `public`,**名实不符,是下一个读者的陷阱**。请改为名实一致(或改名),**并保持 killer 强度不变**(基数断言仍须在加过滤时红)。
2. **回执一律按实码抄取 exposure,不按条目名推断。**

---

## 边界(触及面申报)

**允许**:`scripts/generate-tool-face-manifest.ts`(**仅**为方案 A/B 所需的最小改动)· `scripts/generate-tool-face-manifest.test.ts`(扩充 + LOW-1 名实对齐)· **新增**结构契约测试文件(若选方案 A)· `package.json`/`server/package.json` 测试脚本条目(如需)。

**⛔ 不得**:改投影的**字段集合或顺序**(复核已两轮确认忠实)· 改 `server/src/toolFace/registry.ts` 的 schema 权威形状 · 在生成阶段引入**任何** exposure/`__` 过滤(**违反设计不变量**)· 用 spy 取代真实 npm spawn 测试 · 重写 `scripts/check-tool-face-parity.mjs`(归 12.2a-1c)· **接线进 `verify:v2-bn8-runtime`**(复核 PASS 后由调度方接)· 碰 12.1 线 / v1 线 / legacy `toolDefinitions` / schema / migration / DB。

**越界即停,标 `needs: claude`。**

---

## 复核已确认无需处理的(**不要顺手改**)

| 项 | 结论 |
|---|---|
| F1 投影 killer | **已有效**,红在 cardinality,非 API 缺失 |
| F2 freshness killer | **已有效**,missing/stale 双红且 fresh 阳性先绿 |
| F4 output-path seam | **双键(`NODE_ENV=test` + 环境变量)才生效,缺任一键生产路径不变;不构成平行机关** ⇒ **不要改** |
| 投影字段集合/顺序 | 两轮确认忠实 ⇒ **不要动** |

> 📌 **F4 的操作注记(带进未来)**:**主链不得同时污染这两个专用环境变量**,否则会静默改变 CLI 输出目标。

---

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

- 正面:任何阴性断言前先让同一探针看见一个已知阳性实例。
- 反面:**先确认探针的命中不是来自你自己刚写进去的东西**。
- ⭐ **本单新增一条(由 LOW-1 提炼)**:**回执里的叙述性主张必须逐条对照源码抄取,不得由命名、注释或直觉推断。**「`internal_probe` 所以它是 internal」正是这次出错的形状。
- 📌 本环境:`.git/index` 只读 ⇒ porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性 `.M`,**不是改动**;判文件是否真改用 blob 哈希或 `git diff --numstat`。管道会遮蔽退出码(`cmd | tail; echo $?` 取到的是 `tail` 的)。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest`。

> 📌 **提交前若新增 handoff/文档,须先跑 `docs:index`** —— 上一轮正因调度方漏跑而使 builder 首门被阻。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。

**回执须含**:方案 A/B 的选择与理由 · **F3 重跑的先红后绿两段输出**(红须在「生产未调用同一 projector」的断言上)· 证明 spy(若用)**未取代**真实 spawn · LOW-1 名实对齐后的 fixture **逐条实码摘录** · killer 强度未降的证明(加过滤仍红)· 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。
