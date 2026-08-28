> **状态 (Status)**: draft(⚠️ **依赖 b-1 落地后才可派** —— 两兜底要写 b-1 造的 `imprint_fragments`)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: Fable(b-2 瘦身为「改判 + 两兜底」;zip 容器策略已拆出为 b-2b)

# b-2:入库永不拒收 + 两条兜底

## 0. ⛔⛔ 先读这一句,读完再往下(Fable 钉,一字不改)

> **⛔ 「永不拒收」不等于「删掉那三道 `throw`」;是改判不是拆闸 —— 拒收改为「降级收下 + 如实申报」。**

**三道闸各有正当理由**(**坏件不得冒充好件**、二进制不得被当文本解)。
⭐ **那些原拒收理由,在新判决里必须保留为【申报字段】** —— 收下,但在 `warnings` 里写明「签名与后缀不符」「非 UTF-8」「含 NUL 字节」。
> **⭐ 降级的证据链,就是这些原拒收理由。**(Fable 原话)

⇒ **若你发现自己正在删一个 `throw` 而没有在别处补上一条申报,停下 —— 那是拆闸不是改判。**

## 1. 现物(b-0/b-2 预读已核,⛔ 不要重新调查)

三道闸全在 `server/src/services/sourceFileIntake.ts`:

| 闸 | 位置 | 现行为 |
|---|---|---|
| 后缀白名单 | `resolveFormat` `:279-283` | 未知后缀 ⇒ `throw 400 unsupported_file_type` |
| 签名比对 | `assertSignature` `:295-325` | 魔数与后缀/MIME 不符 ⇒ `throw 400 invalid_file_signature` |
| 文本编码 | 同函数 `:305-318` | 含 **NUL** 或**非 UTF-8** ⇒ `throw 400 invalid_text_encoding` |

**白名单现状:10 族 / 12 后缀** —— `.pdf .docx .txt .md .markdown .png .jpg .jpeg .webp .pptx .xlsx .csv`。

⭐ **两条兜底有现成判定器可复用,⛔ 不要从零写**:
- **文本判定**:`new TextDecoder('utf-8', { fatal: true })` + NUL 字节检测(`:305-318`)—— **现成的「是不是文本」判定器**;
- **二进制判定**:魔数嗅探(`hasZipSignature:286` / PDF / PNG / JPEG / WEBP)+ 流式 `hashFile:326`。

📌 **本单的主要动作是「把判真伪的判定器改用为判归类」** —— 工作量比它听起来小。

## 2. 允许面

- `server/src/services/sourceFileIntake.ts`
- **新建**:`server/src/__tests__/v2SourceNeverReject.test.ts`
- **`server/package.json`** —— **仅**把该测试文件**追加**进 `test:v2` 清单(⛔ 不改其它 script、⛔ 不改既有参数逐字内容与顺序)

⛔ **禁区**:`server/src/mcp/**` · 工具注册表 · `services/toolFaceReceipts.ts` · `operation_batches` · `services/documentParser.ts` · 旧链表与其服务 · **zip 解包(归 b-2b,本单⛔ 不做)**。

## 3. 改判后的三条归类(⛔ 不许新增第四类)

| 输入 | 新行为 |
|---|---|
| **已知后缀 + 签名相符** | ⭐ **与现在完全一致**(见 K-5 回归锁) |
| **可判文本**(未知后缀,但 UTF-8 可解且无 NUL) | **文本兜底**:收下 ⇒ 产**纯文本碎片,行锚**(`flow` 族,`path: "line[N]"`)|
| **其余一切**(未知后缀且非文本 / 签名不符 / 含 NUL / 非 UTF-8) | **二进制兜底**:**只存不拓** —— 存原件 + `content_hash` + 按名可发现,**⛔ 不产碎片**,并在 `warnings` 里如实申报原因 |

**`warnings` 元素形状沿用 b-1 的** `{code, anchor_hint, detail?}`;本单新增 `code` 值(闭集,⛔ 不许自行扩):
`unknown_extension` · `signature_mismatch` · `non_utf8` · `nul_bytes` · `binary_stored_only`

## 4. ⭐ 必红判据(先补断言,再改码 —— 顺序不可换;⛔ 红不出来就停下上报)

| # | 断言 | 现码为何必红 |
|---|---|---|
| **K-1** | `.xyz` 未知后缀的**二进制**件 ⇒ **入库成功**、`content_hash` 非空、**⛔ 零碎片**、`warnings` 含 `unknown_extension` 与 `binary_stored_only` | 现码 `throw 400 unsupported_file_type` |
| **K-2** | `.xyz` 未知后缀的 **UTF-8 文本**件 ⇒ 入库成功且**产生纯文本碎片**,锚为 `flow` 族 `line[N]`,行数与原件一致 | 同上 |
| **K-3** | 后缀 `.png` 但内容是 PDF ⇒ **收下**,`warnings` 含 `signature_mismatch`,**且走二进制兜底不产碎片** | 现码 `throw 400 invalid_file_signature` |
| **K-4** | `.txt` 但含 NUL 字节 ⇒ **收下**,`warnings` 含 `nul_bytes`,走二进制兜底 | 现码 `throw 400 invalid_text_encoding` |
| ⭐ **K-5 回归锁** | **12 种已知后缀的既有行为逐一不变**:对每种造一个合法件,**入库结果(含 `mime_type`/`storage_state`/`content_hash`/是否产碎片)与改动前逐字节相同** | ⭐ **本单最重要的锁** —— 改判最容易的事故是**把已知路径弄坏**。<br>⚠️ **expected 必须是改动前捕获的死值,⛔ 不得由改动后的代码动态生成** |

⚠️ **变异必须语法有效、语义定向**:⛔ 不许用正则整块替换制造语法错误。

## 5. ⚠️ 留痕载体(Fable 裁,与 b-1 §4.1 同)

降级申报走**碎片流自己的 `warnings` 族(随件走)**。
⛔ **不得复用 `toolFaceReceipts.ts`、⛔ 不得写 `operation_batches`** —— ①那条链的消费者在 MCP 禁区内;②⭐ **降级入库不是 Agent 写操作**,塞进工具面收据会**污染那条轴的语义**;**收据轴的纯洁性靠的就是「每条收据只记它那类事」。**

## 6. 收工前必跑

```
npm --prefix server run test:v2
npm --prefix client run test:unit
npm run check:tool-face-parity
npm run build
```
全绿才算完;⛔ 不许跳过、⛔ 不许 `--no-verify`;⚠️ `tool-face-manifest.json` 必须零 diff。

## Result

**(builder 填)**
