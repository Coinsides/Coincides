> **状态 (Status)**: draft(⚠️ **依赖 b-1 与 b-2 落地后才可派**;候锁序 b-1 → b-2 → b-2b)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: Fable(采购裁定 **`yauzl@3.4.0` + `decodeStrings: false` 档**;证据 `analysis/2026-08-28-v12-9b-b2b-zip-probe.md`)

# b-2b:容器策略(zip / 文件夹)—— 逐条目降级 + 如实申报

## 0. ⛔⛔ 先读这两句

> **①「坏 zip 不炸整批」的完整形态,是把「永不拒收」施加到容器内部:每个条目独立受审 —— 好条目照收,坏条目降级 + 申报,而申报的证据 = 原始条目名原样在案。**
>
> **②(Fable)自己解码不是代价,是把闸拿回自己手里 —— 闸在别人库里,刀没地方落;闸在我们手里,五刀齐全。**

## 1. 采购裁定与理由(⛔ 不要重新比选)

**采 `yauzl@3.4.0`,用 `decodeStrings: false` 档。** 探针实测(`analysis/2026-08-28-v12-9b-b2b-zip-probe.md`):

| | jszip | **yauzl(采)** |
|---|---|---|
| 上跳条目 「上跳条目名」(两点 + 斜杠 + escaped.txt) | ⚠️ **静默改成** 根目录条目 + 去掉上跳的文件名 —— **原始名没了** | 默认整档拒收;⭐ **`decodeStrings:false` 原样交出** |
| 流式 | ⚠️ `loadAsync` 整包进内存 | ⭐ `lazyEntries` + `openReadStream` 逐条目流 |

⭐ **jszip 被教义一票否决**:**「不炸,但投毒无痕」比响亮的崩溃更差** —— 它**静默改写了我们必须申报的罪证**。
⚠️ **⛔ 不要因为 jszip「已经在树上」就改选它** —— 它是**幻影依赖**(TD-35,三处未声明、靠 `mammoth` 传递),**它的成本也不是零**。
⚠️ **版本必须是 `3.4.0` 或更高**:`3.2.0` 有 moderate off-by-one,`3.4.0` 已清零。

## 2. 允许面

- **`server/package.json`** —— ①**新增 `yauzl@^3.4.0` 到 `dependencies`**(真采购,不是 devDep);②把新测试文件**追加**进 `test:v2` 清单(⛔ 严格尾部追加,其余 script 与既有参数逐字不动)
- **新建**:`server/src/services/sourceContainerIntake.ts`(容器解包 + 逐条目归族)
- `server/src/services/sourceFileIntake.ts`(**仅**接线容器分支;⛔ 不改 b-2 定下的三条归类)
- **新建**:`server/src/__tests__/v2SourceContainerIntake.test.ts`

⛔ **禁区**:`server/src/mcp/**` · 工具注册表 · `services/toolFaceReceipts.ts` · `operation_batches` · `services/documentParser.ts` · 旧链表与其服务 · **`jszip` 相关的任何改动**(TD-35 的清账**与本单无联动**,Fable 明裁)。

## 3. 归我们的两件事(`decodeStrings: false` 的直接后果)

1. **条目名解码**:**UTF-8 优先**;失败则按 zip 传统编码回退。⭐ **回退本身必须进 `warnings` 申报**(⛔ 静默回退 = 又一次「把证据消化掉」)。
2. **路径规范化检查**:解出的路径**必须钉死在目标目录内**。上跳条目 ⇒ **降级 + 申报**,⛔ **不得落盘到目标目录之外**。

**`warnings` 元素形状沿用 b-1** `{code, anchor_hint, detail?}`;本单新增 `code`(闭集,⛔ 不许自行扩):
`container_entry_path_escape` · `container_entry_name_decode_fallback` · `container_entry_unreadable`

## 4. ⭐ 必红判据(先补断言,再实现 —— 顺序不可换;⛔ 红不出来就停下上报)

| # | 断言 | 说明 |
|---|---|---|
| ⭐ **K-1 好坏混装不炸整批** | 一个 zip 内含**好条目 + 上跳条目**:**好条目照常入库并产碎片**,**坏条目被降级**,**整批不失败** | ⭐ **这是本单的正面证明**;⛔ 整档 throw ⇒ 红 |
| ⭐ **K-2 罪证原样在案** | 上跳条目的 `warnings` 里 **`anchor_hint` 必须含原始条目名 「上跳条目名」(两点 + 斜杠 + escaped.txt) 原样** | ⚠️ **若拿到的是被改写过的名字 ⇒ 红** —— 这条正是否掉 jszip 的那一条 |
| **K-3 落盘钉在目录内** | 解包后目标目录**之外**不得出现任何新文件(解包前后对父目录做快照比对) | ⛔ **不许只断言「路径字符串看起来安全」** —— 要断言**文件系统上真的没跑出去** |
| **K-4 解码回退要申报** | 条目名为**非 UTF-8 字节**的 fixture ⇒ 入库成功且 `warnings` 含 `container_entry_name_decode_fallback` | ⛔ 静默回退 ⇒ 红 |
| **K-5 流式(结构锁)** | 实现路径使用 `lazyEntries` + `openReadStream`,**且不存在把整个 zip 读进内存的调用**(如对容器文件的 `readFileSync`) | ⚠️ **限度写进测试文件顶部**:这是**结构锁**,锁的是**机制**;⛔ **它不测真实内存峰值**(那需要大件与测量基线,本单不做) |

⚠️ **变异必须语法有效、语义定向**:⛔ 不许用正则整块替换制造语法错误。

## 5. 收工前必跑

```
npm --prefix server run test:v2
npm --prefix client run test:unit
npm run check:tool-face-parity
npm run build
```
全绿才算完;⚠️ `tool-face-manifest.json` 必须零 diff;⚠️ **`npm --prefix server audit` 不得因本单新增依赖而出现新的 moderate 及以上条目**(如出现,如实写进 `## Result`,⛔ 不自行降级或忽略)。

## Result

**(builder 填)**
