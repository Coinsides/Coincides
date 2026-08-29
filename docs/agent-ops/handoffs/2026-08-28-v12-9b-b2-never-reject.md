> **状态 (Status)**: ready(**b-1 已落地 `18cdb8b`** —— `source_imprints` / `imprint_fragments` 与 `services/sourceImprints.ts` 均在树上)
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

**STOPPED at the pre-red contract gate · needs: claude/Fable 补裁。**

未进入实现，也未建立半成品红测。本单与 b-1 已落现物有两处硬合同冲突，另有一处 K-5 红绿语义必须按定向变异解释；warning 合同不补裁就无法进入诚实绿灯，故按「红不出来 / 合同不成立就停」停线。

1. **b-2 的 warning 合同与 b-1 最终合同不兼容，且修正文件不在允许面。** 本单 §3 要求 `{code, anchor_hint, detail?}` 与五个新 code；现物 `services/sourceImprints.ts` 的闭集仍只有 `unreadable_segment | empty_segment | decode_failed`，warning 形状是 `{code, anchor, detail?}`，`storeSourceImprint` 会先经 `assertInputContract` 拒绝新 code / 缺失 anchor。b-1 最终裁定已明确把旧 `anchor_hint` 降为 `detail`，结构化 `anchor` 才是现行。二进制兜底又没有可诚实伪造的原件锚；若伪造 flow-char anchor，service 会尝试按 fatal UTF-8 读取二进制原件并 422。`sourceImprints.ts` 不在 §2 允许面，故不能扩合同；先调 `storeSourceImprint` 再直接 `UPDATE warnings_json` 虽可字面过测，却会旁路 b-1 service 合同，未采用。
2. **K-5 的自然基线必然先绿；其「红」只能解释为语义定向变异。** K-5 明文要求 12 后缀行为等于「改动前捕获的死值」且逐一不变，因此先捕获死值后，未经变异的改动前基线应为 GREEN。若「五刀先红后绿」的意思是 K-5 也要证明会红，唯一不破坏死值的诚实做法是：先冻结 12 组死值，再临时施加一条语法有效、语义定向的已知后缀行为漂移，使 K-5 红，随后还原并保持绿；不能靠写错 expected 造红。复工时将按此前者执行；若要求 K-5 在无变异的原码上自然红，则与回归锁定义冲突，需补裁。
3. **现物还有工单未列的独立 MIME 闸。** `inspectSourceTempFile` 对 MIME/后缀不匹配另抛 `mime_extension_mismatch`；本单只列三道闸，新 warning 闭集也无该理由的 code。若标题「永不拒收」覆盖它，就必须补 warning code / 改判；若不覆盖，需明写它继续拒收，不能由 builder 自裁。另工单所称 `resolveFormat` 的现物名实际是 `definitionForFilename`；未知后缀即使通过 intake，返回结果时 `getSourceRecordDetail -> definitionForStoredRow -> definitionForFilename` 仍会再次拒绝，复工时必须在同一允许文件内保护这条读回路径，不能只改首道检查。

**改动 / 验证实录：**除本 `## Result` 回执外，`server/src/services/sourceFileIntake.ts`、`server/package.json` 与新测试文件均零改动；`v2SourceNeverReject.test.ts` 不存在。既有工作树项 `server/src/routes/projections.ts` 未触碰（现物核实为行尾 / index 状态假脏，语义 diff 为零）。handoff 状态行与 `docs/agent-ops/INDEX.md` 未动。因在 pre-red 合同门停线，§6 四条收工命令未跑，不能申报绿灯；`docs/generated/tool-face-manifest.json` 对 HEAD 零 diff。

---

## 调度方处置(claude,2026-08-28 · 第一次派工停线)

### ⭐ 三条申报全部复核为真,记功

| # | 申报 | 复核 |
|---|---|---|
| 1 | b-2 的 warning 合同与 b-1 落地的**不兼容** | ✅ b-1 落地的是 `{code, **anchor**, detail?}` + **3 个 code 的闭集**(`sourceImprints.ts:21`),且 `assertInputContract` **在代码里强制**;而本单写的是 `anchor_hint` + **5 个自造 code** |
| 2 | 现物**还有第四道闸** | ✅ `sourceFileIntake.ts:359` `mime_extension_mismatch`;且本单称的 `resolveFormat` **实名是 `definitionForFilename`**(`:277`) |
| 3 | ⭐ **读回路径会二次拒绝** | ✅ `getSourceRecordDetail`(`:475`)→ `definitionForStoredRow`(`:460`)→ `definitionForFilename` ⇒ **未知后缀即使入库成功,列表/详情仍会抛** |

⭐ **第 3 条最值钱**:**只改入口不改读回 ⇒ 件进得去、读不出来** —— 而**入口测试会全绿**。**这正是「半修比不修更糟」的形状**,它在写第一行代码之前就指出来了。
⭐ **它还拒绝了一条能字面过测的捷径**:先调 `storeSourceImprint` 再直接 `UPDATE warnings_json` —— **那会旁路 b-1 的 service 合同**。它写明「未采用」。

### ⚠️ 归属:**工单缺陷,而且形状是新的(第 7 次)**

**本单是在 b-1 落地【之前】起草的,b-1 落地后我没有回头把它对现物。**
⇒ ⭐ **新家法(已立进 `handoffs/README.md`)**:**候锁期间其依赖发生落地的单,派发前必须重新过一遍现物** —— **⛔ 过闸 ≠ 对现物**;第七查查的是「点名之物是否在允许面」,**查不出「单里的合同是否还与树上一致」。**

### ⇒ 我能改的已改(见 §1/§3/§4),但**有一条设计级问题必须先裁**

⭐ **二进制兜底的 warning 该挂什么锚?**
b-1 的合同要求 warning 携带**封闭五族之一的结构化锚**,而**二进制件没有任何诚实可给的锚**(伪造 flow-char 锚会让 service 按 fatal UTF-8 去读二进制原件而 422 —— builder 已实测)。

**三条路,⛔ 我不选**:
| 路 | 说明 |
|---|---|
| **(A)** 给锚族加一个 `whole_file` 形态 | 改的是**规格的封闭锚族** |
| **(B)** 二进制兜底类的 code 允许 `anchor` 为空 | 在 b-1 的合同上开一个例外 |
| ⭐ **(C)** **二进制兜底「只存不拓」⇒ 根本不产生拓印件 ⇒ 没有出生证,也就没有 warnings** | 那么**申报该挂在 source 记录层而非拓印件层** ⇒ **本单 §5「留痕走 warnings 族」的前提就不成立**,需要另一个载体 |

📌 **我倾向 (C)** —— 它与「只存不拓」的字面最自洽:**没有拓印,哪来的拓印件出生证**。
⚠️ **但它推翻的是你自己 §5 的裁定**(留痕走 warnings 族),**所以必须你裁。**

**另需你裁**:①`mime_extension_mismatch` 是否也在「永不拒收」的射程内?②**扩 warning 闭集**是规格级动作(b-1 的闭集源自 spec v0.2 且在代码里强制)—— 扩不扩、扩哪些?

## Result(第二次派工)

**(待裁定后填)**
