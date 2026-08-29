> **状态 (Status)**: ready(⚠️ **2026-08-29 按规格 v0.4 完全重写** —— 原稿写于 b-2 落地之前,载体与闭集均已过期)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-29
> **裁定来源**: 规格 **v0.4**「容器条目申报四裁」(复核方已核树上原文)· 采购裁定 `yauzl@≥3.4.0` + `decodeStrings: false`

# b-2b:容器策略(zip / 文件夹)—— 逐条目降级 + 如实申报

## 0. ⛔⛔ 先读这三句

> **①「坏 zip 不炸整批」的完整形态,是把「永不拒收」施加到容器内部:每个条目独立受审 —— 好条目照收,坏条目降级 + 申报。**
>
> **②(v0.4)申报按条目结局分两家**:**成为了件的** ⇒ 申报住**子件自己**的 `intake_declarations`(与顶层文件同闭集同形状,⛔ 无特殊化);**没能成为件的** ⇒ 无件可挂,申报住**容器件自己**的 `intake_declarations`。
>
> **③(Fable)自己解码不是代价,是把闸拿回自己手里 —— 闸在别人库里,刀没地方落;闸在我们手里,刀才有地方落。**

## 1. ⚠️ 与原稿的三处差异(⛔ 别照旧稿施工)

| 原稿(已作废) | **v0.4 现行** |
|---|---|
| 申报走 `warnings` 族,元素 `{code, anchor_hint, detail?}` | ⭐ **走 `source_files.intake_declarations_json`**(b-2 已落地的载体);`anchor_hint` 早在 v0.2 已降为 `detail` |
| 三个 `container_entry_*` code | ⭐ ⛔ **全部作废。闭集 v1→v2 只加一码 `container_expansion_incomplete`** |
| —— | ⭐ **新增硬前提**:子件必须带出处二元组(见 §3) |

## 2. 采购(⛔ 不要重新比选)

**`yauzl@^3.4.0`** + **`decodeStrings: false`** 档。理由(探针实证 `analysis/2026-08-28-v12-9b-b2b-zip-probe.md`):
- **jszip 被教义一票否**:它把上跳条目名**静默改写** ⇒ **应用层拿不到「该条目试图上跳」这条事实,无法申报**。**「不炸,但投毒无痕」比响亮的崩溃更差。**
- ⚠️ **⛔ 不要因为 jszip「已经在树上」就改选** —— **它是幻影依赖**(TD-35,三处未声明、靠 `mammoth` 传递)。
- ⚠️ **版本必须 ≥ 3.4.0**(3.2.0 有 moderate off-by-one)。

## 3. ⭐ 闭集与账目(v0.4 的核心)

**intake 闭集 v2 = v1 五码 + `container_expansion_incomplete`**(⛔ **只加这一码**)。
- 覆盖全谱:**部分条目未成件** / **整包不可开**(= 全部未成件);
- ⛔ **空包 ≠ incomplete**(空是完整的空,**零申报**);
- ⛔ **不设 `container_entry_*` 按因分码** —— **闭集是文件性质词表**,按失败原因增殖会让它随每种容器格式膨胀。⭐ **原因粒度是 `detail` 不是 `code`。**

### ⛔ 不建失败条目台账

**失败条目集 = 容器蓝图(zip central directory,就住在已存 blob 里)− 成功子件集。**
⇒ ⭐ **内容可从已存原件推导之物,建表存它 = 形状先于能力**(与「只存不拓」同构:**不为可推导物造第二存储**)。
**code 的作用是【免开包触发器】**:**无此码**的容器,「子件 = 全部内容」可信;**有此码**的,对账须开包。

### ⭐ 硬前提(集合差可算的代价)

**子件必须带出处二元组 `(container_file_id, entry_path)`;重名条目以 `entry_index` 区分,⛔ 不得合并。**
⚠️ **否则「蓝图 − 子件」的集合差不可算,上一条的机械可查性整个塌掉。**

## 4. 归我们的两件事(`decodeStrings: false` 的直接后果)

1. **条目名解码**:**UTF-8 优先**;失败则按 zip 传统编码回退。⭐ **回退本身必须申报**(住**子件自己**的 declarations;⛔ 静默回退 = 又一次「把证据消化掉」)。
2. **路径规范化检查**:解出的路径**必须钉死在目标目录内**。上跳条目 ⇒ **不成件 + 容器申报 `container_expansion_incomplete`**,⛔ **不得落盘到目标目录之外**。

## 5. 允许面

- **`server/package.json`** —— ①新增 **`yauzl@^3.4.0` 到 `dependencies`**(真采购);②把新测试**追加**进 `test:v2` 清单(严格尾部追加)
- **新建**:`server/src/services/sourceContainerIntake.ts`
- `server/src/services/sourceFileIntake.ts`(**仅**接线容器分支 + 子件出处二元组;⛔ 不改 b-2 定下的三条归类)
- **新建迁移**:`server/src/db/migrations/051_v2_source_container_provenance.ts`(子件出处二元组落库;**⚠️ 序号按现物取,现树最高为 050**)
- **新建**:`server/src/__tests__/v2SourceContainerIntake.test.ts`

⛔ **禁区**:`server/src/services/sourceImprints.ts` · 迁移器 · `server/src/mcp/**` · 工具注册表 · `toolFaceReceipts` · `operation_batches` · `documentParser.ts` · 旧链 · **`jszip` 相关任何改动**(TD-35 与本单无联动)。
⚠️ **禁区(续)**:handoff 的**状态行**与 `docs/agent-ops/INDEX.md` —— 由调度方复核后处理,⛔ 不许触碰。

## 6. ⭐ 必红判据(先补断言,再实现;⛔ 红不出来就停下上报)

⚠️ **按「产生点逐点列举」**:`container_expansion_incomplete` 有**三个产生情形**,**每个各一刀**;每刀须给**能单独触发它的输入**。

| # | 断言 | 说明 |
|---|---|---|
| ⭐ **K-1 好坏混装不炸整批** | 一包含**好条目 + 上跳条目**:好条目**照常成件**,坏条目**不成件**,**整批不失败**,容器带 `container_expansion_incomplete` | ⛔ 整档 throw ⇒ 红 |
| ⭐⭐ **K-2 对账等式** | **N 条目、1 坏**的 fixture ⇒ **子件恰 N−1** ∧ **容器带码** ∧ **「蓝图 − 子件」集合差恰为那 1 条** | ⭐ **这条把 code 从「声称」变成「可验」** —— ⛔ 只断言「有码」不算 |
| **K-3 落盘钉在目录内** | 解包后目标目录**之外**不得出现任何新文件(**解包前后对父目录做快照比对**) | ⛔ **不许只断言路径字符串看起来安全** —— 要断言**文件系统上真的没跑出去**(结果锁,非实现锁) |
| **K-4 解码回退要申报** | 条目名为**非 UTF-8 字节** ⇒ 该条目**成件**,且**子件自己**的 declarations 含回退申报 | ⛔ 静默回退 ⇒ 红 |
| ⭐ **K-5 三情形逐点覆盖** | `container_expansion_incomplete` 的**三个产生情形各一 fixture**:①**部分条目未成件**(上跳/坏 CRC)②**整包不可开** ③⛔ **空包必须【不】带该码** | ⭐ **③ 是阴性对照** —— **空是完整的空**;⛔ 少了它,一个「见容器就加码」的实现照样全绿 |
| **K-6 出处二元组** | 子件带 `(container_file_id, entry_path)`;**同名两条目**(不同 `entry_index`)⇒ **产生两个子件,⛔ 不合并** | ⭐ 集合差可算的地基;⛔ 合并即红 |
| **K-7 流式(结构锁)** | 使用 `lazyEntries` + `openReadStream`,**且不存在把整个 zip 读进内存的调用** | ⚠️ **限度写进测试顶部**:结构锁**锁机制**,⛔ **不测真实内存峰值** |

⚠️ **变异必须语法有效、语义定向**;⛔ 不许用正则整块替换制造语法错误。
⚠️ ⛔ **不许旁路 b-2 已定的归类与申报路径**。

## 7. 收工前必跑

```
npm --prefix server run test:v2
npm --prefix client run test:unit
npm run check:tool-face-parity
npm run build
```
全绿才算完;⚠️ `docs/generated/tool-face-manifest.json` 必须零 diff;
⚠️ **`npm --prefix server audit` 不得因本单新增依赖出现新的 moderate 及以上条目**(如出现,如实写进 `## Result`,⛔ 不自行降级或忽略)。

## Result

**(builder 填)**
