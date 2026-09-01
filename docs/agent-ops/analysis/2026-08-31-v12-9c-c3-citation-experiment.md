> **状态 (Status)**: active（腿 1 K-0 与实验骨架；腿 2 未获授权、未实跑）
> **层 (Layer)**: 分析 / Analysis（V12.9c c-3 引用模式实验）
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 否（实验记录；裁定以工单与冻结契约为准）

# V12.9c c-3：识别器引用模式实验

## 0. 腿界与零消费声明

本轮只完成腿 1：K-0 侦察、实验方案与 prompt 契约冻结草案。**没有实现代码，没有调用任何外部 API，没有读取 key，没有产生费用。** 腿 2 必须等待调度方复核契约并发出 resume 令。

## 1. R-1：④类基数与本单判权威来源

④类依 c-2 冻结定义为“真实指错”：只覆盖已配对、角色相容，且有冻结 pointer identity 证明但 `same_place=false` 的事件；它不包含 175 张存在性差异、150 个 pairing unresolved 或 211 张分类学差异。

在获准的 `D:/Coinsides/v12.9-selection/tools/_out/**` 内未发现 standalone `divergence-census-v3.json`。本单因此以指定上游 `2026-08-31-v12-9c-c2-divergence-census-v3.md` §6.1 内嵌的 canonical JSON 为判数源：解码后 5,096,178 bytes，SHA-256 `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`。机器路径 `$.classification_pass.counts_by_classification_and_predicate["真实指错"].cross_predicate_total` 为 **2**；另过滤 `$.classification_pass.divergences[*].classification == "真实指错"` 也恰得 **2**，两路闭合。

两件均为 `academic-reading / P-TEXT`：

| divergence | event | MinerU seq / canonical page | Docling seq / canonical page |
|---|---|---|---|
| `D-000029` | `EV-000143` | `119,120` / `19` | `145` / `19` |
| `D-000059` | `EV-000268` | `243,244` / `34,35` | `269` / `34` |

故点射对象基数为 **2 events**，不是 fragment 数，也不是页数。

## 2. R-2：存在域收据的机器可读形态

同一内嵌 canonical JSON 的固定路径为 `$.gate_pass.existence_differences[0..174]`，恰 **175** 张。单张收据含：`existence_id/event_id/document/predicate/source/direction/sort_key/opposite_side_member_count`，双方 raw/canonical role 与 seq，双方完整 evidence、`overlap_graph`、`pairing_proof`；evidence 内含 `path/seq/R-W-N/SHA/payload/optional_fields/raw_anchor/canonical_anchor` 等字段。

读取配方冻结在契约 §5：从 c-2 文档唯一 Base64 标记间取 gzip，解码后同时验证原始字节数、SHA、UTF-8 与末尾 LF，再读上述 JSONPath。仓外 `_out` 中没有 v3 standalone JSON，因此不得把临时路径冒充持久权威源。

现役四卷是 `native-pdf@2.4.5` 的 page fragment，而收据比较的是 MinerU / Docling bbox fragment；收据没有现役 fragment ID。腿 1 把映射冻结为“同原文件 basename + 同 canonical page”的保守页级投影。它只派生 `uncorroborated` 与 receipt IDs，**只标不拒**；不声称两种粒度对象身份相同，不建持久字段。

## 3. R-3：识别器调用形态与模态判定

12.9a trial-2 现物申报：模型为 `qwen-vl-max`，DashScope 国际站；视觉 2b 的输入是页图加同页转写碎片清单，输出引用 `source_seq`。16 次 2b 调用全部 JSON 一次过，出处 6/9 命中，另有 2 条不存在 ID；文本档只给碎片清单，8 页全部格式服从，13/13 引用回验通过，其中 3 页只有单碎片，不能冒充强证据。trial-2 的国际站事实与本工单共同钉定 endpoint `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/`。

本单判定为 **纯文本**：

- 目标不是从像素重建 bbox，而是从既有 `id/anchor/text` 做引用式表述；页图不增加引用 ID 的机械真实性；
- c-3 的错误价值来自“未知 ID 可查、锚可复放”，不是视觉坐标；
- trial-2 页图现物最小文件也有 104,030 bytes，哪怕只按 base64 理论下界约 `ceil(104030/3)*4 = 138,708` 字符，单图已超过本单 30,000 出境字符总闸；
- 当前 native-pdf 每页恰一条 page fragment，计划文本合计仅 11,376 字符；纯文本保留硬闸余量。

因此腿 2 即使用名称含 VL 的工作假设模型，也只发送 text messages；任何 `image_url` / base64 / 页图进入请求均属契约违约。

## 4. R-4：抽页方案与预算算术

四卷分母全部保留。点射只瞄准 2 个④类 event；其余三卷各一页是完成“四卷各抽页”的功能性校准，并复用 trial-2 已登记页，不因存在域或分类学差异选页。存在域只供过闸后的单证注解验证。

| call | 卷 / 页范围 | 选择理由 | 候选 fragment | 碎片字符 | 完整 request body 字符 |
|---:|---|---|---:|---:|---:|
| 1 | academic-reading p19 | `D-000029` 点射 | 1 | 2,921 | 4,437 |
| 2 | academic-reading p34–35 | `D-000059` 点射跨页范围 | 2 | 5,764 | 7,326 |
| 3 | writing-example-responses p4 | trial-2 功能性校准；页级投影含 `E-000052` | 1 | 2,113 | 3,456 |
| 4 | academic-writing p4 | trial-2 功能性校准；页级投影含 `E-000060` | 1 | 335 | 1,633 |
| 5 | listening p8 | trial-2 功能性校准；页级投影含 `E-000104..E-000108` | 1 | 243 | 1,544 |
| **合计** | **四卷 / 6 页** | **2 点射 + 3 校准** | **6** | **11,376** | **18,396** |

上述数字来自 `server/coincides.db` 的只读打开，对 d-1a 已钉四个 exact imprint 查询 `length(imprint_fragments.text)`；没有启动 server、没有 HTTP/API 调用、没有写库。具体 fragment ID 与锚由腿 2 脚本再次从现役库读取并经 exact 锚门复放，不能把本报告当数据库替身。

冻结 prompt 的 system 内容为 845 个 Unicode code points。按契约规定的最小化 input JSON、固定 request body 和上述现役 fragment 原文逐次 `JSON.stringify` 后，计划为 **5 次调用 / 18,396 出境字符**，满足 `5 <= 20`、`18,396 <= 30,000`；余量为 **15 次 / 11,604 字符**。硬闸不变：腿 2 必须对实际 request body 在发送前逐次预检，计划之外的重试也计入累计值，越界前拒发。

## 5. R-5：d-2 水合链复用点

现役签名：

```ts
getImprintFragmentsByAnchor(
  db: Database.Database,
  userId: string,
  imprintId: string,
  query: SourceImprintAnchorQuery,
)
```

exact 调用式：

```ts
const replayed = getImprintFragmentsByAnchor(
  db,
  userId,
  imprintId,
  { match: 'exact', anchor },
);
const cited = replayed.find((fragment) => fragment.id === fragmentId);
```

d-2 的生产现物 `hydrateImprintRetrievalMatch` 已用完全相同的调用式，并在命中 fragment 不在复放集合时抛 `hydration_failed`。c-3 只 import / call，不改 `sourceImprints.ts`，不重写锚等价。

## 6. R-6：TD-40 同路判定

**判定：不自然同路，原地留债。** TD-40 的落点是写入链尾：`storeSourceImprint` 新增碎片后缺少增量 embedding 提醒/钩子。c-3 本段是既有 fragment 的只读 page-range 组装、模型调用与引用校验；实验选页也不经 KNN，引用闸本身不依赖 `imprint_fragment_vec`。把 TD-40 捎入必须触碰本单禁区 `sourceImprints.ts` / `imprintEmbedding.ts` 或另造写后机制，既不是同一路径，也会扩大允许面。因此本单不修、不改状态，触发器仍留给首个“新入库件立即要求可检索”的旅程。

## 7. R-7：冻结契约

契约路径：`docs/agent-ops/analysis/2026-08-31-c3-citation-prompt-contract.md`。

它已冻结：输入/输出 JSON schema、纯文本调用形态、完整逐字 prompt、现役 lockfile 条件、d-2 exact 锚复放、判废枚举、存在域 page 级单证投影与预算计数法。冻结文件为 10,354 bytes，SHA-256 `8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa`。契约自身不写自指哈希；本值只写实验报告与工单回执。

## 8. 腿 2·续实验台账（已执行）

### 8.1 K-1 双冻结件复核

开工第一步逐字节复算通过，且实跑脚本在首次 API 调用前再次执行同一复核：

| 冻结件 | bytes | 调度方冻结 SHA-256 | 开工/脚本复算 | 结论 |
|---|---:|---|---|---|
| 主契约 | 10,354 | `8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa` | 同值 | PASS；字节未改 |
| 补遗 1 | 1,743 | `2ab5f08231a37acf0279f6b051af04e32455cbc6cf3667b50d108c40d6237b4f` | 同值 | PASS |

补遗 1 的自证测试构造四对现物名，逐对只剥 `.fragments.json` / `.pdf` 后逐字同 stem；另以中性功能样本的错误后缀断言 `identity_mapping_stop`。脚本又对 175 张存在域收据及四卷 host 全量执行同一映射，均在首次发送前通过。

### 8.2 实跑形态与只读来源

实际命令从 `server` 目录执行：

```text
node --env-file=.env --import tsx ../scripts/cite-imprint-pages.mjs
```

脚本以 `readonly=true` 打开 `server/coincides.db`，并设置 `PRAGMA query_only=ON`；按固定 imprint ID 调 `getSourceImprint` 取现役候选，再对每个候选调用 `getImprintFragmentsByAnchor(db,userId,imprintId,{match:'exact',anchor})` 并按 ID 回找。闸校验同样调用该生产 exact 锚门。数据库写入为 0。

census canonical JSON 从 c-2 v3 文档唯一 Base64 围栏恢复，实跑前复核为 5,096,178 bytes、SHA-256 `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`、UTF-8 无 BOM、末尾单 LF；只消费 `$.gate_pass.existence_differences` 的 175 张收据，未消费分类学差异。

工作假设识别器为 `qwen-vl-max`，国际站 chat-completions endpoint；输入恰为冻结契约的纯文本 request body，没有 `image_url`、base64 或页图。key 仅回执 `present=true,length=116`，值未进入 prompt、日志或落盘物。

### 8.3 分卷分母与结果

“有效引用率”的分母是模型返回的 citation references；“单证率”的分母是过闸有效 citation。零 citation 的卷写 `— (0/0)`，不以 0% 冒充分母。

| 卷 | 候选 page range | 实跑 | 跳过及原因 | claims | citation references | 有效引用率 | 判废 claims / citations | 单证引用率 |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| academic-reading | 2 | 2 | 0；无跳过 | 15 | 15 | 15/15 = 100% | 0 / 0 | 0/15 = 0% |
| writing-example-responses | 1 | 1 | 0；无跳过 | 6 | 6 | 6/6 = 100% | 0 / 0 | 6/6 = 100% |
| academic-writing | 1 | 1 | 0；无跳过；模型合规 abstain | 0 | 0 | — (0/0) | 0 / 0 | — (0/0) |
| listening | 1 | 1 | 0；无跳过；模型合规 abstain | 0 | 0 | — (0/0) | 0 / 0 | — (0/0) |
| **合计** | **5** | **5** | **0** | **21** | **21** | **21/21 = 100%** | **0 / 0** | **6/21 = 28.57%** |

writing-example-responses p4 的 6 条有效 citation 均被 host 闸标为 `uncorroborated=true`，且 `existence_receipt_ids=["E-000052"]`；状态仍为 `accepted`。academic-writing p4 与 listening p8 虽分别投影到 `E-000060`、`E-000104..E-000108`，但模型没有产生 citation，故没有凭空生成单证引用。

### 8.4 两个④类 event 点射结果（单列）

| ④类 event | request | 页范围 / fragments | claims / citations | 过闸 | 单证 |
|---|---|---|---:|---|---|
| `D-000029 / EV-000143` | `c3-academic-reading-p19` | p19 / 1 | 7 / 7 | 7/7 有效；response `accepted` | 0/7 |
| `D-000059 / EV-000268` | `c3-academic-reading-p34-p35` | p34–35 / 2 | 8 / 8 | 8/8 有效；response `accepted` | 0/8 |

这里的“点射”只表示按 c-2 的两个真实指错 event 选定 page range 后观察 page-fragment 引用闸结果；不把 claim 数或 fragment 数改称 event 基数，也不声称识别器修复了上游 pointer divergence。

### 8.5 判废清单（逐 request，零静默）

| request | response 状态 | claim/citation 判废项 | reason code | 是否进入台账 |
|---|---|---|---|---|
| `c3-academic-reading-p19` | accepted | 无 | 无 | `rejection_ledger=[]` |
| `c3-academic-reading-p34-p35` | accepted | 无 | 无 | `rejection_ledger=[]` |
| `c3-writing-responses-p4` | accepted | 无 | 无 | `rejection_ledger=[]` |
| `c3-academic-writing-p4` | accepted（`insufficient_support`） | 无 | 无 | `rejection_ledger=[]` |
| `c3-listening-p8` | accepted（`insufficient_support`） | 无 | 无 | `rejection_ledger=[]` |

实跑判废总数为 0，不等于测试没有真牙。fake recognizer 测试分别命中并断言六个冻结码：`output_schema_invalid`、`request_id_mismatch`、`citation_fragment_unknown`、`citation_imprint_mismatch`、`citation_lockfile_mismatch`、`citation_anchor_replay_failed`；每个红样本都检查台账，另有全绿路径与“单证只标不拒”路径。测试没有真实 API 调用，功能样本均为中性措辞。

### 8.6 预算与 provider usage 台账

脚本先准备全部 5 个实际 `JSON.stringify(requestBody)`，逐一核对冻结计划字符数并核对全量预算，之后才读取 key、进入发送循环；循环内每次发送前再次计算 next cumulative。重试 0，故没有隐藏分母。

| request | 发送前累计 calls | 本次 body 字符 | 发送后累计字符 | 放行 | provider tokens（prompt/completion/total） |
|---|---:|---:|---:|---|---:|
| `c3-academic-reading-p19` | 0 | 4,437 | 4,437 | 是 | 1,064 / 605 / 1,669 |
| `c3-academic-reading-p34-p35` | 1 | 7,326 | 11,763 | 是 | 1,681 / 660 / 2,341 |
| `c3-writing-responses-p4` | 2 | 3,456 | 15,219 | 是 | 756 / 530 / 1,286 |
| `c3-academic-writing-p4` | 3 | 1,633 | 16,852 | 是 | 382 / 35 / 417 |
| `c3-listening-p8` | 4 | 1,544 | 18,396 | 是 | 367 / 34 / 401 |
| **合计** | — | **18,396** | **18,396** | **5/5** | **4,250 / 1,864 / 6,114** |

最终消费：**5 calls / 18,396 出境字符 / 0 retries**，满足 `5 <= 20` 与 `18,396 <= 30,000`；余量 15 calls / 11,604 字符。脚本计数、实跑回执与本报告三方相等。

### 8.7 点射消费形态（per-fragment / 谁读）

本轮模型没有输出“置信度”，因此不存在可诚实申报为 per-imprint 或 per-fragment 的 confidence，也没有为它开持久字段。实际可消费的点射结果是 **per-citation、由 cited fragment 定位**：每个有效 citation 携带 `fragment_id`，host 再以该 fragment 的 page anchor 派生 `uncorroborated + existence_receipt_ids`。它不是 per-imprint 汇总；同一 imprint 的不同页可以有不同单证结果。

当前读取者只有 `scripts/cite-imprint-pages.mjs` 的实验台账与本报告。生产 service 返回该 per-fragment citation 形态，但本单没有接 API、UI 或数据库消费者。若后续要持久化或展示，消费者应读取 citation 级字段，不能把一个页的 `uncorroborated` 外推到整个 imprint。

### 8.8 K-5 硬声明

「本轮引用质量只代表 page 级地板碎片上的引用质量,⛔ 不代表本产品的引用质量。」

### 8.9 本单没有做

- 没有置信度持久层，也没有虚构模型 confidence；
- 没有嵌入终选、识别器终选、UI、API 路由或新 fragment；
- 没有修 TD-38；TD-40 仍按 §6 的“不自然同路”判定原地留债；
- 没有页图、多模态输入、分类学差异消费或 census 输入写入；
- 没有数据库写入、迁移或现役水合链改写；
- 安全类/对抗类测试零设计零执行；判废测试均为中性功能数据样本。

### 8.10 门禁

| 门禁 | 结果 |
|---|---|
| `npx tsc --noEmit`（`server`） | exit 0 |
| `npm run test:v2`（`server`） | exit 0；337/337，较工单基线 328/328 增 9 |
| `npm run docs:check`（仓库根） | exit 0；生成件最新，glossary K-1..K-3 PASS |

禁区 `git diff --quiet HEAD -- <path>`：主契约、补遗 1、`sourceImprints.ts`、`imprintEmbedding.ts`、`imprintRetrieval.ts`、`embedding/dashscope.ts`、`server/src/db/**`、`client/**`、根 `package.json`、`.env*`、`docs/agent-ops/current-state/**`、`.claude/**`、`AGENTS.md`、`CLAUDE.md` 均 exit 0；既有 `server/src/routes/projections.ts` EOL 状态噪音也为内容 diff exit 0。最终复跑与 porcelain 见工单 `## Result(腿 2·续)`。
