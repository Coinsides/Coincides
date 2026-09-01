> **状态 (Status)**: draft（腿 1 冻结候调度方复核；resume 前不得据此实现）
> **层 (Layer)**: 分析 / Analysis（V12.9c c-3 引用模式 prompt 契约）
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 否（契约候选；冻结字节的 SHA-256 记在 c-3 工单腿 1 回执）

# c-3 引用模式 prompt 契约（腿 1 冻结草案）

## 0. 冻结边界

本文件冻结 c-3 腿 2 的模型输入、模型输出、逐字 prompt、调用形态与引用校验闸语义。腿 2 只有在调度方发出 resume 令后才能开始；开工时必须先复算本文件 SHA-256 并与腿 1 回执逐字相等。若不相等，停线，不调用模型。

固定调用形态：

- 工作假设模型：`qwen-vl-max`，不冒充终选；
- endpoint：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1/`；
- key：只从 `process.env.DASHSCOPE_API_KEY` 读取，不进入 prompt、日志或落盘物；
- 模态：**纯文本**；消息中不得出现 `image_url`、base64、页图或其他视觉内容；
- 每个 page range 恰好一次 chat completion；`temperature=0`；
- 请求发出前，以实际 `JSON.stringify(requestBody)` 的 Unicode code point 数计入出境字符台账；累计调用数上限 20，累计出境字符上限 30,000，任一请求会越界则在发送前拒绝。

`requestBody` 的承重字段固定为：

```json
{"model":"qwen-vl-max","temperature":0,"messages":[{"role":"system","content":"<SYSTEM_PROMPT>"},{"role":"user","content":"<USER_PROMPT>"}]}
```

`<SYSTEM_PROMPT>` 与 `<USER_PROMPT>` 由 §3 的逐字模板生成。不得在腿 2 追加临时提示词、页图、示例答案或第二套参数。

## 1. 模型输入 schema

传给模型的 `CANONICAL_INPUT_JSON` 必须由以下 schema 校验后，以 `JSON.stringify` 的无缩进形式生成；键按 schema 所列顺序构造。`fragment_id`、`anchor`、`text` 必须来自现役 imprint 的锚水合结果，不得从模型或 census 收据补造。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "coincides.citation-input.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "request_id", "page_range", "fragments"],
  "properties": {
    "schema_version": {"const": "citation-input.v1"},
    "request_id": {"type": "string", "minLength": 1, "maxLength": 120},
    "page_range": {
      "type": "object",
      "additionalProperties": false,
      "required": ["start", "end"],
      "properties": {
        "start": {"type": "integer", "minimum": 1},
        "end": {"type": "integer", "minimum": 1}
      }
    },
    "fragments": {
      "type": "array",
      "minItems": 1,
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["fragment_id", "anchor", "text"],
        "properties": {
          "fragment_id": {"type": "string", "minLength": 1},
          "anchor": {
            "type": "object",
            "additionalProperties": false,
            "required": ["family", "page"],
            "properties": {
              "family": {"const": "page"},
              "page": {"type": "integer", "minimum": 1},
              "block_index": {"type": "integer", "minimum": 0},
              "bbox": {
                "type": "array",
                "prefixItems": [
                  {"type": "number"}, {"type": "number"},
                  {"type": "number"}, {"type": "number"}
                ],
                "minItems": 4,
                "maxItems": 4
              }
            }
          },
          "text": {"type": "string", "minLength": 1}
        }
      }
    }
  }
}
```

附加机械不变量：`page_range.start <= page_range.end`；fragment ID 唯一；每个 `anchor.page` 落在 page range 内；数组按 `(anchor.page, fragment_id)` 升序；本轮只接受 `family=page`。

现役身份不发给模型，但由 host 保留并交给校验闸：`user_id`、`source_file_id`、`original_filename`、`imprint_id`、`transcriber_lockfile_hash`。腿 2 当前现役 lockfile SHA-256 必须等于 `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95`。

## 2. 模型输出 schema

模型输出必须是一个裸 JSON object；不得有 Markdown 围栏或前后文字。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "coincides.citation-output.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "request_id", "claims", "abstentions"],
  "properties": {
    "schema_version": {"const": "citation-output.v1"},
    "request_id": {"type": "string", "minLength": 1, "maxLength": 120},
    "claims": {
      "type": "array",
      "maxItems": 12,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["claim_id", "statement", "citations"],
        "properties": {
          "claim_id": {"type": "string", "pattern": "^c[1-9][0-9]*$"},
          "statement": {"type": "string", "minLength": 1, "maxLength": 500},
          "citations": {
            "type": "array",
            "minItems": 1,
            "maxItems": 8,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["fragment_id"],
              "properties": {"fragment_id": {"type": "string", "minLength": 1}}
            }
          }
        }
      }
    },
    "abstentions": {
      "type": "array",
      "maxItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["reason"],
        "properties": {"reason": {"const": "insufficient_support"}}
      }
    }
  }
}
```

附加机械不变量：`request_id` 必须逐字回显输入；`claim_id` 必须按 `c1,c2,...` 连续；同一 claim 的 `fragment_id` 不得重复；`claims` 非空时 `abstentions=[]`，`claims=[]` 时必须恰有一个 `insufficient_support`。输出不设 quote、bbox、anchor 或正文转写字段，模型无权重造这些事实。

## 3. 逐字 prompt

下面两枚围栏内文本就是 prompt 字节源；代码围栏本身及 START/END 注释不进入请求。换行固定 LF，模板末尾均无额外换行。

<!-- C3_SYSTEM_PROMPT_START -->
```text
You are a document recognizer operating in citation mode.
Use only the fragment objects supplied in INPUT_JSON.
Return exactly one JSON object with no Markdown or surrounding text.
Describe the supported page content as concise factual claims in your own words.
Do not copy or retranscribe source passages.
Every claim must cite one or more fragment_id values from INPUT_JSON.
Never invent a fragment_id, anchor, quotation, or fact.
If the fragments do not support any claim, return an empty claims array and one abstention.
Use exactly this shape:
{"schema_version":"citation-output.v1","request_id":"<copy input request_id>","claims":[{"claim_id":"c1","statement":"...","citations":[{"fragment_id":"..."}]}],"abstentions":[]}
claim_id values must be c1, c2, and so on in order.
The only allowed abstention is {"reason":"insufficient_support"}.
```
<!-- C3_SYSTEM_PROMPT_END -->

<!-- C3_USER_PROMPT_START -->
```text
INPUT_JSON
{{CANONICAL_INPUT_JSON}}
```
<!-- C3_USER_PROMPT_END -->

## 4. 引用校验闸与判废枚举

解析与校验按以下顺序执行。**判废粒度为 claim**；只有 `output_schema_invalid`、`request_id_mismatch` 这类无法可靠切分 claim 的错误才判整次 response 作废。任何判废都必须进入台账，不得静默删除后冒充完整成功。

| code | 粒度 | 触发条件 | 处置 |
|---|---|---|---|
| `output_schema_invalid` | response | 非裸 JSON、解析失败、schema 或附加不变量失败 | 整次 response 判废 |
| `request_id_mismatch` | response | 输出 request_id 与输入不逐字相等 | 整次 response 判废 |
| `citation_fragment_unknown` | claim | 引用 ID 不在本次候选 fragment 集，或数据库读不到该 ID | 该 claim 判废 |
| `citation_imprint_mismatch` | claim | 被引 fragment 不属于本次 host 固定的 imprint | 该 claim 判废 |
| `citation_lockfile_mismatch` | claim | 被引 fragment 所属 imprint 的 lockfile hash 不是腿 2 开工时现役 hash | 该 claim 判废；跨转写器引用不得放行 |
| `citation_anchor_replay_failed` | claim | exact 锚调用失败，或返回集中找不到被引 fragment ID | 该 claim 判废 |

锚复放只能调用既有生产门：

```ts
getImprintFragmentsByAnchor(
  db,
  userId,
  imprintId,
  { match: 'exact', anchor },
)
```

不得重写锚等价、直接按 text 查询或绕门读取正文。一个 claim 有任一 citation 判废，则整条 claim 判废；其他 claim 可继续过闸，最终状态据此记 `accepted`、`partial` 或 `rejected`。

## 5. 存在域单证注解

c-2 的机器可读源是 `2026-08-31-v12-9c-c2-divergence-census-v3.md` 内嵌 canonical JSON，原始 JSON SHA-256 为 `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`；读取路径固定为 `$.gate_pass.existence_differences[0..174]`。腿 2 读取前必须按该文 §6.1 配方解码并复核字节数 5,096,178、SHA、UTF-8 无 BOM 与末尾单 LF；失败则在首次调用前停线。

175 张收据没有现役 native-pdf fragment ID，因此本轮 page-fidelity 的“落在收据集合”冻结为保守页级投影：

1. 以收据单边 evidence 的 `path` basename 对齐 host 的 `original_filename`；
2. 读取该 evidence 的 `canonical_anchor.page`；
3. 若被引现役 fragment 的 `anchor.family=page` 且 `anchor.page` 相等，则给该 citation 写 `uncorroborated=true` 与排序后的 `existence_receipt_ids`；否则写 `uncorroborated=false` 与空数组；
4. 此注解是 page 级地板上的保守标记，不宣称现役整页 fragment 与单边 bbox 碎片身份相同；
5. `uncorroborated` **只标不拒**，必须随有效 citation 结果透传。不得把它加入判废 code，也不得为本段新增持久字段。

模型输出不含 `uncorroborated`；该字段只由闸按收据机械派生。分类学差异集合不得读取或消费。

## 6. 明确不带

本契约不宣布识别器或嵌入模型终选，不做 UI，不建置信度持久层，不消费分类学差异，不重写锚水合，不修 TD-40，不含页图，也不产生新 fragment。
