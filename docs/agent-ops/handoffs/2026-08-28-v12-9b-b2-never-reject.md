> **状态 (Status)**: ready(⚠️ **第二次派工** —— 第一次因工单与 b-1 落地合同不兼容而停线,已按规格 **v0.3**(`7b3d3f6`)重写)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: Fable 三裁 + 规格 v0.3(复核方已核树上原文)

# b-2:入库永不拒收 + 两条兜底

## 0. ⛔⛔ 先读这三句

> **①(Fable)⛔「永不拒收」不等于「删掉那些 `throw`」;是改判不是拆闸 —— 拒收改为「降级收下 + 如实申报」。原拒收理由必须保留为申报字段:降级的证据链,就是那些原拒收理由。**
>
> **②(规格 v0.3 总原则)申报住在被申报物身上。** 描述**文件本身**的申报(后缀/签名/编码)**住 source 记录层**;⛔ **不住拓印件出生证** —— **为从未出生之物造出生证,就是伪造身份。**
>
> **③(规格 v0.3)归族以魔数为准,后缀是自称 —— 字节是事实,名字是主张。**

⇒ **若你发现自己正在删一个 `throw` 而没有在别处补上一条申报,停下。那是拆闸不是改判。**

## 1. 现物(⚠️ 第一次派工的 builder 已核出三处,⛔ 不要重新调查)

**四道闸,全在 `server/src/services/sourceFileIntake.ts`**:

| 闸 | 位置 | 现行为 |
|---|---|---|
| 后缀白名单 | `definitionForFilename` `:277`(⚠️ **实名如此**,⛔ 不叫 `resolveFormat`)| 未知后缀 ⇒ `throw 400 unsupported_file_type` |
| ⭐ **MIME/后缀不符** | `:359` | ⇒ `throw 400 mime_extension_mismatch`(⚠️ **第一次派工的单漏了这道**) |
| 签名比对 | `assertSignature` `:295` | 魔数与后缀不符 ⇒ `throw 400 invalid_file_signature` |
| 文本编码 | 同函数 | 含 **NUL** / 非 UTF-8 ⇒ `throw 400 invalid_text_encoding` |

⭐⭐ **还有一条读回路径,必须一并处置**:
`getSourceRecordDetail`(`:475`)→ `definitionForStoredRow`(`:460`)→ `definitionForFilename`
⇒ ⚠️ **未知后缀即使入库成功,列表/详情仍会抛。**
📌 **只改入口不改读回 = 件进得去、读不出来,而入口测试会全绿** —— **半修比不修更糟。**

**现成判定器可复用,⛔ 不要从零写**:`TextDecoder('utf-8',{fatal:true})` + NUL 检测(文本判定)· `hasZipSignature`/PDF/PNG/JPEG/WEBP 魔数(`:286`+)· 流式 `hashFile`(`:326`)。

## 2. 允许面

- **新建迁移**:`server/src/db/migrations/050_v2_source_intake_declarations.ts` —— 给 **`source_files`** 加 `intake_declarations_json TEXT NOT NULL DEFAULT '[]'`
  📌 **为什么落 `source_files`**:v0.3 说「住 source 记录层」;而这些申报描述的是**这个文件**(它的后缀/魔数/编码),不是整条 source 记录 ⇒ **落到文件那一层才叫「住在被申报物身上」**。
- `server/src/services/sourceFileIntake.ts`
- **新建**:`server/src/__tests__/v2SourceNeverReject.test.ts`
- **`server/package.json`** —— **仅**把新测试**追加**进 `test:v2` 清单(严格尾部追加)

⛔ **禁区**:`server/src/services/sourceImprints.ts`(b-1 的合同,⛔ 一个字不改)· 迁移器 · `server/src/mcp/**` · 工具注册表 · `toolFaceReceipts` · `operation_batches` · `documentParser.ts` · 旧链 · **zip 解包(归 b-2b)**。
⚠️ **状态行与 `docs/agent-ops/INDEX.md` 由调度方在复核后处理,⛔ 你不要碰。**

## 3. 改判后的归类(⛔ 不许新增第四类)

⭐ **归族一律以魔数为准**(后缀只是自称):

| 输入 | 新行为 |
|---|---|
| **魔数属已知族,且后缀/MIME 相符** | ⭐ **与现在完全一致**(见 K-5 回归锁) |
| **魔数属已知族,但后缀/MIME 不符** | **按魔数归族收下**,申报 `signature_mismatch` |
| **可判文本**(UTF-8 可解、无 NUL,后缀未知) | **文本兜底**:收下 ⇒ 产**纯文本碎片,行锚**;若后缀未知另申报 `unknown_extension` |
| **其余一切**(非文本二进制 / 含 NUL / 非 UTF-8) | ⭐ **二进制兜底:只存不拓** —— 存原件 + `content_hash` + 按名可发现;⛔ **不产碎片、⛔ 不产拓印件、⛔ 无出生证**,申报 `binary_unparsed`(+ `nul_bytes` / `non_utf8_text` / `unknown_extension` 视因) |

**intake 申报族闭集 v1(规格 v0.3,⛔ 不许自行扩)**:
`unknown_extension` · `signature_mismatch` · `non_utf8_text` · `nul_bytes` · `binary_unparsed`

⛔⛔ **三套闭集各守各层,永不互串**:**intake 族(文件层)** / **残缺族(出生证 warnings)** / **validation 族(出生证 rejection)**。

## 4. ⭐ 必红判据(先补断言,再改码;⛔ 红不出来就停下上报)

| # | 断言 | 说明 |
|---|---|---|
| **K-1** | 未知后缀的**二进制**件 ⇒ 入库成功、`content_hash` 非空、**⛔ 零碎片且⛔ 无拓印件**、`intake_declarations` 含 `unknown_extension` + `binary_unparsed` | 现码 `throw` ⇒ 必红 |
| **K-2** | 未知后缀的 **UTF-8 文本**件 ⇒ 入库成功且**产纯文本碎片**(`flow` 族行锚),申报含 `unknown_extension` | 同上 |
| **K-3** | 后缀 `.png` 但**魔数是 PDF** ⇒ ⭐ **按魔数归为 PDF 族收下**,申报 `signature_mismatch` | 现码 `throw invalid_file_signature` / `mime_extension_mismatch` |
| **K-4** | `.txt` 但含 NUL ⇒ 收下,申报 `nul_bytes` + `binary_unparsed`,走二进制兜底 | 现码 `throw invalid_text_encoding` |
| ⭐⭐ **K-5 读回路径** | 上述**每一种降级件**,`GET` 列表与详情(`getSourceRecordDetail`)**都必须能读回**,且**申报随件返回** | ⭐ **这条防的是「件进得去读不出来」** —— ⛔ 只测入口不测读回的单会全绿而半残 |
| ⭐ **K-6 回归锁** | **12 种已知后缀 + 相符魔数的既有行为逐一不变**:入库结果(`mime_type`/`storage_state`/`content_hash`/是否产碎片/**`intake_declarations` 为空**)与改动前**逐字节相同** | ⭐ **本单最重要的锁**。<br>⚠️ **expected 必须是改动前捕获的死值**,⛔ 不得由改动后代码动态生成。<br>⚠️ **它天然先绿(回归锁本就如此)** ⇒ **证明它会红的诚实做法**:冻结死值后**临时施加一条语义定向的已知后缀行为漂移**看它变红,再还原;**⛔ 不许靠写错 expected 造红**(第一次派工的 builder 已提出此法,采纳) |
| ⭐⭐ **K-8 申报完整性(2026-08-28 立;⚠️ 第四次派工后按现物订正)** | `signature_mismatch` 的**六处产生点**,**每一处配一个能【单独】触发它的输入**:<br>`435` = `.txt` + `image/png` + **非 UTF-8/NUL**<br>`442` = `.png` + **PDF magic**(已有)<br>`455` = `.txt` + `text/plain` + **ZIP magic**<br>`479` = ⚠️ **未知后缀** + `text/html` + UTF-8(⛔ **不能用 `.txt`** —— 那会同时命中 `435`)<br>`486` = `.png` + `image/png` + **非 UTF-8**<br>⛔ **`450` = 等价变异,如实记档,不造红** | ⚠️⚠️ **两处订正,都是我的错**:<br>**① 产生点是【六处】不是五处** —— 我上次那条 `grep ... \| head -6` 里**第一行是闭集定义**,`head` 把 `486` 截掉了。⭐ **我立「逐点列举」的规则,第一次实战就用 `head` 截断了列举。**<br>**② 我给的两个可达情形不能隔离**:`450` 的条件与 `435` 相同 ⇒ Set 里已有该 code ⇒ **注掉无可观察差异,是等价变异**;`.txt + text/html` **同时命中 `435` 与 `479`** ⇒ 隔离不了 `479`。<br>⭐ **等价变异如实记档,⛔ 不硬造红** —— builder 明确拒绝了「统计 `Set.add` 次数」「读源码文字」两种造红法,理由是**「那只会锁住重复实现,不能证明申报结果」**,**采纳**。<br>⛔ **也不为了让变异可杀而重构生产码** —— 那是让测试驱动结构的坏形式;若确要去重,**单独立单单独裁**。 |
| ⭐ **K-7 三族不互串** | `intake_declarations` 中**不得出现**残缺族或 validation 族的 code;反之亦然 | ⭐ **「永不互串」若无刀守着,就只是一句话** |

⚠️ **变异必须语法有效、语义定向**;⛔ 不许用正则整块替换制造语法错误。
⚠️ ⛔ **不许旁路 b-1 的 service 合同**(如先调 `storeSourceImprint` 再直接 `UPDATE`)—— 第一次派工的 builder 明确拒绝了这条捷径,**沿用**。

## 5. 收工前必跑

```
npm --prefix server run test:v2
npm --prefix client run test:unit
npm run check:tool-face-parity
npm run build
```
全绿才算完;⚠️ `docs/generated/tool-face-manifest.json` 必须零 diff。

## Result(第二次派工)

**(builder 填)**

---

## 调度方处置(claude,2026-08-28 · 第二次派工 builder 随崩溃阵亡)

**回执栏空 ⇒ 按 Fable 裁定,树上半成品【全部按未验证对待】。** 调度方先做了一轮**接手体检**(只读 + 可还原的变异,⛔ 未改交付物):

| 体检项 | 结果 |
|---|---|
| 编译 | `npx tsc --noEmit` **exit 0** |
| 测试跑得起来吗(⚠️「绿」有两种含义) | `# tests 8 / pass 8 / fail 0` —— **计数非零,确实跑了** |
| 覆盖面 | ⭐ **K-1 ~ K-7 全部在册**(另多一条 K-2b:去重与中断 ready 流的拓印恢复) |
| `server/package.json` | **只有 `test:v2` 变**,`startsWith(old)` 为真,追加内容恰为该测试文件 |
| 禁区 | `sourceImprints.ts` / 迁移器 / MCP / manifest **零触碰** |
| 迁移 | `050_v2_source_intake_declarations.ts`,落 `source_files`(与工单 §2 一致) |

### ⭐ 关键:**复核方亲刀验过两把最要紧的刀确实会红**

⚠️ **8 条全绿证明不了任何一把刀真的会红**(两义性 #3/#4)。故亲施两次语法有效、语义定向的变异:

| 变异 | 结果 |
|---|---|
| **K-7**:把残缺族的 `decode_failed` 混进 intake 闭集 | ⭐ **7/1 红** |
| **K-6**:让已知后缀也产生一条申报(行为漂移) | ⭐ **4/4 红** |
| 还原后 | **8/8 绿**,文件 **SHA-256 与变异前一致** |

⇒ ⭐ **遗产在机制层可信 —— 它不是「写出来就绿」的测试。**
📌 **⚠️ 但这是【复核方】的新鲜证据,⛔ 不是死者的日志** —— 按裁定,**第三次派工仍须自行取全部红点**;上面两条只是告诉你:**这条路走得通,不必怀疑地基。**

### ⇒ 第三次派工的范围(窄)

**⛔ 不清场重来,续建**:①逐项检视遗产,可改可留;②**全部 K-1~K-7(+K-2b)在最终树上自行重取红点**(⛔ 不许引用死者日志);③跑 §5 全部收工门;④写 `## Result(第三次派工)`。

## Result(第三次派工)

### 结论

本次按“续建”处置：逐项审过第二次派工留下的半成品，保留可证实部分，只修工单直接要求或能收窄本实现风险的点。以下 RED/GREEN 和收工门均由第三次派工 builder 在最终测试树上重新取得；没有引用前任 builder 的日志或结论。工单允许面已完成，但本节不替调度方修改 handoff 状态。

### 遗产逐项取舍

| 遗产 | 取舍 | 第三次派工的判断与改动 |
|---|---|---|
| `server/src/services/sourceFileIntake.ts` | **主体保留，定点修两处** | 保留 strict 旧入口、intake 五码闭集、独特魔数优先、UTF-8/NUL 判定、binary stored-only 兜底、申报与 Source identity 同事务、列表/详情读回及重传补拓印。修正“未知后缀 + PDF/PNG/JPEG/WEBP 独特魔数”只报 `unknown_extension` 的偏差：现在同时报工单表明定的 `signature_mismatch`，仍按魔数归族。另把 `sourceImprints.js` 的动态 import 移到幂等查询之前，消除“查无后在 import 上让出”这一处单进程竞态窗口；仍只经 `storeSourceImprint`，未旁路 b-1。最终 SHA-256 `7bfa45b372a1ca5e096732c6e0bd7b3e30be616ec1785ed5c5f73c447ee61c10`。 |
| `server/src/__tests__/v2SourceNeverReject.test.ts` | **八项全留并加固** | 保留 K-1～K-7 及 K-2b；K-2 改为显式断言恰有一个拓印；K-3 增补未知后缀 + PDF magic 的双申报样本；K-7 改为直接锁生产 intake 五码精确闭集，并把全部 production warning/rejection codes 注入错误层验证读回过滤，反向也逐一拒绝五个 intake code。最终 SHA-256 `3076d83546da743c157769f40c6d9c9701b41cb50af2933b40ef515999b0d91f`。 |
| `server/src/db/migrations/050_v2_source_intake_declarations.ts` | **原样保留** | 第三次接手后未改：列落在 `source_files`，`NOT NULL DEFAULT '[]'`，带 JSON array CHECK 和已有列幂等判断；迁移器按文件名自动发现，无需登记。接手/最终 SHA-256 均为 `523942af03d8f8f9fd66deb1c01189d7609f7f60b16f40f34f03503c6e26fa1c`。 |
| `server/package.json` 尾部追加 | **原样保留** | 仅把新测试严格追加在原 `test:v2` 尾项之后，无 script/dependency 旁改。接手/最终 SHA-256 均为 `6d6c14e164d3a2d1a7d9d4a11e274955320847cd733d4aa33b6ad5527860f793`。 |

工作树另显示 `server/src/routes/projections.ts` 为 stat 脏标记，但 HEAD/index/worktree blob 相同、`git diff` 为空，且不在本单 Source intake 调用链；本次未碰它。

### ⭐ 第三次派工亲取 RED（每刀单独施加、单独运行、随即还原）

统一用最终测试文件的定向 `node --import tsx --test --test-name-pattern ... src/__tests__/v2SourceNeverReject.test.ts` 取证。每把都是语法有效、指向工单语义的生产代码变异；没有改错 expected 造红。

| Killer | 临时语义变异 | 亲取红点 |
|---|---|---|
| K-1 | 未知后缀重新抛 `unsupported_file_type` | `assert.doesNotReject` 捕获拒收；`tests 1 / pass 0 / fail 1`，exit 1。 |
| K-2 | 未知 UTF-8 文本不再传出 `fallbackText` | 明确的拓印数量断言 `expected 1 / actual 0`；`1/0/1`，exit 1。 |
| K-2b | 中断件去重恢复后仍保持 `storage_state='staging'` | 后续 b-1 校验抛 `Source file is not ready for imprint validation`；`1/0/1`，exit 1。 |
| K-3 | 已知后缀优先于检测到的独特魔数 | `.png` + PDF magic 得到 `png` 而非 `pdf`；`1/0/1`，exit 1。 |
| K-4 | 禁用 NUL 检测 | 含 NUL 的 `.txt` 得到 `txt` 而非 `binary`；`1/0/1`，exit 1。 |
| K-5 | 读 DTO 强制返回空 `intake_declarations` | 真实 HTTP 列表/详情申报断言失败；`1/0/1`，exit 1。 |
| K-6 | 让已知后缀也进入 `unknown_extension` 分支 | 12 项冻结死值投影出现实质 diff；`1/0/1`，exit 1。 |
| K-7 | 把残缺族 `decode_failed` 加入生产 intake 闭集 | 精确闭集断言得到第六项 `decode_failed`；`1/0/1`，exit 1。 |

全部变异均已反向还原。还原后 `sourceFileIntake.ts` SHA-256 回到上列 `7bfa45…61c10`；随后目标文件实跑 `tests 8 / pass 8 / fail 0`，exit 0。

### GREEN 与 §5 收工门

| 命令 | 本次结果 |
|---|---|
| `node --import tsx --test src/__tests__/v2SourceNeverReject.test.ts` | `8/8` 通过 |
| `npx tsc --noEmit`（server） | exit 0 |
| `npm --prefix server run test:v2` | `306/306` 通过，exit 0 |
| `npm --prefix client run test:unit` | `26` files、`230/230` tests 通过，exit 0 |
| `npm run check:tool-face-parity` | `[PASS]`，14 个 public entries，exit 0；按命令原义不宣称 human reachability |
| `npm run build` | manifest freshness check、`tsc`、dist copy 均完成，exit 0；freshness 阶段仍会打印既有 recursive-reference warnings，但最终明确报“未过期” |

`docs/generated/tool-face-manifest.json` 收工前后 SHA-256 均为 `7700e4e69740aa1f3dd3d76b9b6f0eaaedb6623d7aa35dfe6535b0ab8ee2dc3d`，`git diff --quiet -- docs/generated/tool-face-manifest.json` exit 0。`git diff --check` exit 0。

### 如实保留的边界

- K-2b 证明的是“同件重传/去重路径能把中断件恢复 ready 并且顺序补拓印一次”，**不等于**完整的 startup-sweep 恢复证明。当前 unknown UTF-8 件在 ready flip 后、fallback imprint 写入前仍有进程崩溃窗；startup sweep 只 flip ready，不主动补拓印，故理论上仍可留下 ready + declarations、但零 imprint/fragments 的件。彻修需要改同步 sweep/启动接线并触及 b-1 依赖边界，超出本窄单；本次不伪称已覆盖。
- 动态 import 前移只消除了已定位的一处单进程 await 窗口；迁移 049 没有相应跨进程唯一约束。因此这里不宣称并发请求在多进程下绝对只写一次，K-2b 的“once”证据是顺序重试语义。
- generic ZIP magic 无法在禁止解包的前提下区分 DOCX/PPTX/XLSX；已知 OOXML 后缀维持 K-6 既有族，未知/冲突 ZIP 按 binary 兜底。zip 解包继续留给 b-2b。

禁区核对：`server/src/services/sourceImprints.ts`、`docs/agent-ops/INDEX.md` 均零 diff；未碰迁移器、MCP、工具注册表、toolFaceReceipts、operation_batches、documentParser 或旧链。handoff 状态行也未改。

---

## 调度方复核(claude,2026-08-28 · 第三次派工)

### ✅ 交付面与禁区:亲手核过,干净

`package.json` **只有 `test:v2` 变**且严格尾部追加 · 禁区(`sourceImprints.ts` / 迁移器 / MCP / manifest)**零触碰** · `projections.ts` **去 EOL 后内容逐字相同**(⚠️ ` M` 是假脏,两义性 #1)· 基线 **8/8**。

### ⭐ builder 记功两处

1. **它在遗产里找出并修了一个真缺陷**:「未知后缀 + 独特魔数」原来只报 `unknown_extension`,现在**按工单同时报 `signature_mismatch`**,仍按魔数归族。**⛔ 它没有因为「遗产是别人写的」就照单全收。**
2. **它顺手收窄了一处单进程竞态**(把 `sourceImprints` 的动态 import 移到幂等查询之前),**且仍只经 `storeSourceImprint`,未旁路 b-1 合同**。

### ⚠️ 复核方细一档变异:**四条可达分支无覆盖** ⇒ 补 K-8

**逐行单独注掉五处 `signature_mismatch`**:

| 行 | 分支 | 注掉后 |
|---|---|---|
| 435 | claimed 后缀存在但 **MIME 不符** | ⚠️ **8/8 全绿** |
| **442** | 检测到的魔数与 claimed 不符 | ⭐ **5/3 红**(唯一被覆盖的一处) |
| 450 | zip 魔数 + claimed 为 zip 但 MIME 不符 | ⚠️ **8/8 全绿** |
| 455 | zip 魔数但 claimed **非** zip | ⚠️ **8/8 全绿** |
| 479 | **文本兜底**且 MIME 不符 | ⚠️ **8/8 全绿** |

⚠️ **「注掉没红」有两种含义:没测到 / 分支根本到不了。** 已**逐条读码确认四处均可达**(`.txt` 配 `image/png` · `.docx` 配错 MIME · `.txt` 里装着 zip · `.txt` 配 `text/html`)⇒ **是没测到。**

⭐ **为什么值得再派一轮**:**申报缺失 = 静默降级**。一处申报被回归悄悄丢掉,**那个件会看起来干干净净** —— 而**「降级的证据链就是那些原拒收理由」正是本单存在的理由**。
📌 **⛔ 不是 builder 没做到工单要求**:K-1~K-7 它全做到了,**是我的工单粒度不够(与 b-1 的 K-1d 同形)。**

**⇒ 第四次派工只做一件事**:补 K-8 的四条 fixture(先红后绿),⛔ 其余一律不动。

## Result(第四次派工)

**(builder 填)**
