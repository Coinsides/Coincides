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
