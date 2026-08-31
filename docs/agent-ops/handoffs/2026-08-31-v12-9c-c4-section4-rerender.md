> **状态 (Status)**: done(2026-08-31 收工;调度方复核 PASS —— 六判据磁盘回读复算 + §6 证据本体端到端亲验)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「§4 破损并入 c-4 顺手修」裁定,由调度方转写。⛔ **不是 Henry。**

# c-4-a:从 canonical JSON 重渲 §4 两表(⭐ 极小单,机械)

## 0. ⛔⛔ 先读这四句

> **① 病在哪**:`docs/agent-ops/analysis/2026-08-31-v12-9c-c2-divergence-census-v3.md` 的 **§4 逐条门收据索引**编码破损 —— **401 行里 388 行受影响**:方向列的「**仅 X 有**」、角色箭头「**→**」、有序对算符「**×**」、以及表头名,**全部退化成 ASCII `?`**。
> **② 实体数据没丢**:§6 内嵌的 canonical JSON(gzip+Base64,已验 `byte_equal=true`)与 §3.5/§3.6 叙述**均完好**。⇒ **这是渲染层的伤,不是数据的伤。**
> **③ 为什么现在修**:档案目前在 git 里是 **untracked**,**c-4 收口时它才进版本历史** ⇒ ⭐ **破损列不该以永久面貌入史**。
> **④ ⛔⛔ 最关键的一条:重渲若走同一条写文件的路径,会【同样破损】。** ⇒ **本单的成败不在「重渲了」,在「重渲后【回读验证】通过」。**

## 1. 允许面(⛔ 只这些)

- `docs/agent-ops/analysis/2026-08-31-v12-9c-c2-divergence-census-v3.md`(⚠️ **仅 §4 两张表的内容**)
- 本工单的 `## Result` 段

⛔ **禁区(逐条零 diff)**:该档案的 **§0–§3、§5、§6、§7 一个字节不许动**(尤其 **§6 的 Base64 块**与 **§7 的脚本全文**);`server/**`、`client/**`、`scripts/**`、`package.json`、任何迁移、任何生产码或测试、`docs/agent-ops/INDEX.md`、其它任何 handoff 或 analysis 文件、**`D:/Coinsides/v12.9-selection/**`(证据本体,只读)**。

## 2. 判据(⭐ 全部机械可核)

### K-1 数据只能来自 canonical JSON

- 两表内容**必须从 canonical JSON 重新生成**。取数二选一,**在回执里写明用了哪个**:
  - (a) 仓外 `C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-v3-20260831/divergence-census-v3.json`(SHA-256 `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`);
  - (b) 从 §6 的 `CANONICAL_JSON_GZIP_BASE64_V3_START/END` 块解出(Base64 decode → gzip decompress,须得同一 SHA)。
- ⛔ **不许手改现有表格的字符**;⛔ **不许从 §3 叙述或 §4 现有破损文本反推**。

### ⭐⭐ K-2 行数对账(硬判据)

- **§4.1 恰 175 数据行**(对应 `$.gate_pass.existence_differences[0..174]`);
- **§4.2 恰 211 数据行**(对应 `$.gate_pass.taxonomy_differences[0..210]`)。
- ⛔ 多一行少一行都不算过。

### ⭐⭐⭐ K-3 回读验证(本单的真判据)

**重渲后必须回读该文件并逐项核对**,⛔ 不许只看「写入成功」:

| 检查 | 目标值(已由调度方从 JSON 算出) |
|---|---|
| §4.1 方向列「**仅 Docling 有**」出现次数 | **101** |
| §4.1 方向列「**仅 MinerU 有**」出现次数 | **74** |
| 两者之和 | **175** |
| §4.2 有序对轴文案含 **`×`**(U+00D7) | 出现,⛔ 不得是 `?` 或 `x` |
| 角色箭头 **`→`**(U+2192) | 在两表中出现,⛔ 不得是 `?` |
| §4 区段内**表头名**为可读中文 | ⛔ 不得是 `?` |

⚠️ **任一项不达标 ⇒ 未修好,须重做**;⛔ **不许把不达标写成「已修复」。**

### ⭐ K-4 成因规避(⛔ 不是叮嘱,是动作)

- ⚠️ 本机上 PowerShell 的 `Set-Content` / `Out-File` **默认编码会丢 UTF-8**(⭐ 这是本仓已知坑)。
- ⇒ **写文件时必须显式 UTF-8**(如 `-Encoding utf8`),**或改用能保证 UTF-8 的写法**(Python `open(..., encoding='utf-8')` / Node `fs.writeFileSync(f, s, 'utf8')`)。
- ⭐ **无论用什么写法,K-3 的回读验证都必须做** —— **写法只降低概率,回读才是证据。**

### K-5 禁区零 diff 自证

- 收尾须证明 **§0–§3、§5、§6、§7 逐字节未变**:建议对 §4 之外的部分分段取 SHA-256 前后比对,并在回执给出。
- ⭐ **§6 的 Base64 块与 §7 的脚本块尤其要证**(它们是 K-8 非易失归档的本体)。

## 3. 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result` 段;若预算紧张,先写 Result 再做别的。**

须含:取数来源(a 或 b)与其 SHA、两表行数(175 / 211)、**K-3 六项回读实测值**、写文件所用的编码方式、K-5 的禁区分段 SHA 前后比对、以及任何停线点。
⛔ 不许 commit / push,⛔ 不许翻本工单顶部状态行,⛔ 不许改档案 §4 以外任何字节。⚠️ 署名按**实际来源**(裁定来自 **Fable**,由调度方转写;⛔ 不得写成 Henry)。

## Result

> **结果**: **PASS，已修复。** §4 两表已从 canonical JSON 整表重渲；磁盘回读、逐行 JSON 全等、Unicode 字符计数与 §4 外 raw-byte SHA-256 均通过。
> **执行者**: Codex builder · **裁定来源**: Fable，由调度方转写（不是 Henry）
> **commit / push**: 均未执行；本工单顶部状态行保持原样。

### 取数来源与写入方式

- 采用来源 **(a)**：`C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-v3-20260831/divergence-census-v3.json`。
- 原始字节 SHA-256 实测：`2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`（与工单目标逐位相同）。
- 未从 §3 叙述或旧 §4 破损文本反推数据；按 `$.gate_pass.existence_differences` 与 `$.gate_pass.taxonomy_differences` 原序生成全部数据行。
- 目标档案使用 Node `fs.writeFileSync(target, output, 'utf8')` 显式写 UTF-8；回读为无 BOM、UTF-8 encode/decode 字节 round-trip 相等，原 LF 行尾保持不变。
- 实际替换仅为两张 Markdown 表（表头、分隔行、数据行）；§4 标题、说明文字及两张子节标题均保留原字节。

### K-2 / K-3 磁盘回读实测

| 检查项 | 实测 | 判定 |
|---|---:|---|
| §4.1 数据行 | 175 | PASS |
| §4.2 数据行 | 211 | PASS |
| §4.1 方向列「仅 Docling 有」 | 101 | PASS |
| §4.1 方向列「仅 MinerU 有」 | 74 | PASS |
| 两方向之和 | 175 | PASS |
| §4.2 `×`（U+00D7） | 212 次；轴表头精确为 `有序对轴 MinerU-role × Docling-role`；`?` 轴 0、ASCII `x` 轴 0 | PASS |
| `→`（U+2192） | §4.1 = 352 次；§4.2 = 424 次；两表均出现 | PASS |
| 表头 | 两表共 16 个表头均含可读中文；表头 ASCII `?` = 0 | PASS |

- §4 全区段附加回读：ASCII `?` = `0`，U+FFFD replacement character = `0`。
- 逐行对 canonical JSON 重建后比对：§4.1 `175/175`、§4.2 `211/211` 全等，`mismatch_count=0`。
- 独立只读核验同样得到：386 条数据行全等、方向 `101/74`、`→=776`、`×=212`、ASCII `?=0`、U+FFFD `=0`。

### K-5 禁区 raw-byte SHA-256（写前 / 写后）

切片边界均取对应行首首个 `## 4. ` / `## 5. ` / `## 6. ` / `## 7. `；哈希对象为原始文件字节。

| 禁区分段 | 写前 SHA-256 | 写后 SHA-256 | 判定 |
|---|---|---|---|
| §0–§3（文件起点至 §4 前） | `e8c4d77556ae66c2ebc95e2f97cf815be0c05b828a6cc956b928f5141a45afc3` | `e8c4d77556ae66c2ebc95e2f97cf815be0c05b828a6cc956b928f5141a45afc3` | byte-equal |
| §5 | `4bd78e7f099347e4b03d00342661b3e60a817187851345a5d2986a6366fc5128` | `4bd78e7f099347e4b03d00342661b3e60a817187851345a5d2986a6366fc5128` | byte-equal |
| §6 | `7a0d5c4cf176133e2d9cf9206c7a3e89db7acd5c0ea4643e9d39ad83c1cfd68f` | `7a0d5c4cf176133e2d9cf9206c7a3e89db7acd5c0ea4643e9d39ad83c1cfd68f` | byte-equal |
| §7 | `c66b87dfef1c0ac3a519287a8d3e477345ca384e939ab3c428a0757800c5809e` | `c66b87dfef1c0ac3a519287a8d3e477345ca384e939ab3c428a0757800c5809e` | byte-equal |

§6 另作现物解档：Base64 `7,731` 行 → gzip `440,641` bytes / SHA-256 `cb10834b9ea484641feaaf63bb1e0f1f4f148b10bba65803f3db3357bd353163` → JSON `5,096,178` bytes / SHA-256 `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`，与来源 (a) `byte_equal=true`。

### 停线点与范围说明

- 数据、渲染和机械判据无停线点。
- **needs: claude**：工单 §0 记载目标档案“目前在 git 里是 untracked”，但本次开工现物 `git ls-files --stage` 已返回该文件（blob `d3df8104b6974aa75443d61a3217e2dd6f3be3d2`），且写前该路径无 working-tree diff。未猜测其间时序或归档动作；该不一致不影响本单明确允许的 §4 重渲，但请调度方核对叙述时点。
- 开工时工作树另有既存 `server/src/routes/projections.ts` 修改；本单未触碰该文件，也未触碰其余禁区路径。
## 复核批注(调度方 coincides-8b,2026-08-31)

**判定:PASS。** 复核方**未采信回执自述**,六项判据全部在磁盘上独立回读复算:

| 判据 | 复核方实测 | 结论 |
|---|---|---|
| §4.1 行数 | 175 | ✅ 与 §3.1 分区 `856 = 175 + 150 + 211 + 320` 的 175 项一致 |
| §4.2 行数 | 211 | ✅ 同上 |
| 「仅 Docling 有」/「仅 MinerU 有」 | 101 / 74,和 = 175 | ✅ 与 §3.6 合计行一致 |
| ASCII `?` 残留 | **0 行**(修前 388 行) | ✅ 破损已尽 |
| `×` / `→` 渲染 | 分别出现于 212 / 388 行 | ✅ 全角符号正常 |
| 空侧渲染 | `原始[—]→规范[—]` | ✅ 用破折号,⛔ 未用 `?` 冒充 |

**§6 证据本体端到端亲验(⛔ 不是复核回执,是复核方自己跑的)**:7,731 行 Base64 → 440,641 字节 gzip → 5,096,178 字节原文,SHA-256 = `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`,与 §6 申报值逐字符相等;还原后的 JSON 内计数为 175 / 211 / 24,与正文三表互证。⇒ **重渲未动证据本体**。

**⭐ 本单的方法价值**:回执自报「用了源 (a) canonical JSON、`fs.writeFileSync` 写、并做了磁盘回读」——这三句**恰好是 K-1/K-4/K-3 各自要的那一句**,但复核仍全部重算。理由沿用家法:**成功回显不是落地证明,回读内容才是**;回执说自己回读过,与复核自己回读,是两件事。
