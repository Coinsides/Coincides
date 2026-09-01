> **状态 (Status)**: ready(顶班调度按总部 2026-08-31 c-3 续办令翻牌;裁定出处:`plans/v12-9c-c3-citation-mode-skeleton.md`(骨架+归域三裁)+ 总部当日拆单五注;不代表 Henry 逐张批过本单)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「c-3 识别器引用模式,拆单派工」。⛔ **不是 Henry。**
> **上游**: 骨架(⭐ 必读)· `analysis/2026-08-31-v12-9c-c2-divergence-census-v3.md`(census 口径)· `analysis/2026-08-28-v12-9a-trial-2-recognizer.md`(识别器 12.9a 试跑)· d-2 单(水合链现物)

# c-3:识别器引用模式(引用契约 + 校验闸 + 四卷抽页实验)

## 0. ⛔⛔ 先读这八句

1. **分腿施工**:腿 1 = K-0 侦察 + **prompt 契约冻结草案**(⛔ 零实现零调用),做完停线交调度方复核契约;腿 2 = 实现+实验(经 resume 令启动)。**口径冻结早于实现**(法度),契约文件冻结后腿 2 一字不改,改 = 停线。
2. **识别器从转写者转引用者**:输入=页范围**既有碎片清单**(id/锚/文本),输出=引用式表述(每条断言附 fragment 引用)。⛔ 不重新转写正文,⛔ 不产新碎片。
3. **引用校验闸与引用者同单**(b-3 遗训),机械三验:①被引 fragment 属**现役 lockfile**(dev 库现役 = native-pdf@2.4.5,hash `891f3c04…`;⛔ 跨转写器引用判废);②**锚可复放**——⭐ 复用 d-2 门 `getImprintFragmentsByAnchor`(exact),⛔ 不重写锚复放;③**存在域单证标注**:被引碎片若落在 c-2 存在性差异收据集合(单边碎片),标 `uncorroborated`,**只标不拒**,随结果透传。违约=该条引用判废入台账,⛔ 静默放行。
4. **⚠️ 会真花钱(腿 2)**。硬闸随单冻结:**调用数 ≤20、出境字符 ≤30,000**(prompt 全文含碎片文本计入出境);代码内预检(超限前拒发)。识别器=`qwen-vl-max`(工作假设申报,⛔ 不冒充终选),endpoint=`https://dashscope-intl.aliyuncs.com/compatible-mode/v1/` 常量,key 只经 `process.env.DASHSCOPE_API_KEY`(`server/.env` 注入,长度只申报不出值)。
5. **归域三裁照办**(骨架 §一):存在域→零点射,只做单证标注;分类学→零预算零消费;**④类=点射唯一去处**——腿 1 从 v3 census 权威产物读出④类基数(⚠️ 调度方射程内未寻获 `divergence-census-v3.json` 现物——仓内全树+`v12.9-selection/tools` 两层+`.codex-tmp` 顶层零命中;你的 K-0 判定权威来源:JSON 在哪/若仅 md 为权威则从 md 读数并申报口径)。⛔ 本段不建置信度持久字段。
6. **c-2 封存档案与证据本体只读**;`D:/Coinsides/v12.9-selection/**` 只读(census 输入在此,读可,⛔ 写禁);`~/.codex/sessions` 不碰。
7. **TD-40 判定义务(腿 1)**:增量嵌入钩子与本段管线是否「自然同路」——是则申报同路点候调度方裁,否则原地留债;⛔ 不为捎带扩允许面。
8. **收口申报义务(腿 2)**:「点射消费形态」(置信度 per-fragment 还是 per-imprint、谁读它)——c-2 持久层解锁钥匙,写进实验报告专节。

## 1. 允许面(全单并集;腿 1 只许动前两项+Result)

- **新建** `docs/agent-ops/analysis/2026-08-31-c3-citation-prompt-contract.md`(引用模式契约:输入 schema/输出 schema/判废条件/prompt 逐字;冻结时算 SHA-256 入回执)
- **新建** `docs/agent-ops/analysis/2026-08-31-v12-9c-c3-citation-experiment.md`(K-0 侦察发现(腿 1 先落骨)+ 实验台账(腿 2 补全))
- **新建** `server/src/services/imprintCitations.ts`(引用校验闸:三验纯读函数,⛔ 零写库)
- **新建** `server/src/__tests__/v2ImprintCitations.test.ts`(闸测试:三验各红绿 + 判废不静默;fake 数据零 API)
- **新建** `scripts/cite-imprint-pages.mjs`(实验跑批:抽页→调识别器→过闸→台账;预算预检)
- **修改** `server/package.json`(仅 test:v2 挂新测试;⛔ 不改依赖)
- **追加**:本单 `## Result(腿 N)`

⛔ **禁区 = 其余一切**,点名:`server/src/services/sourceImprints.ts` · `imprintEmbedding.ts` · `imprintRetrieval.ts` · `dashscope.ts`(嵌入 provider,引用者另写调用器⛔不改它)· `server/src/db/**` · 旧代机关 · `client/**` · 根 `package.json`(闸盲区人工核过)· `.env*` · `docs/agent-ops/current-state/**`。

## 2. 腿 1 定义(K-0 + 契约冻结;⛔ 零 API 调用)

R-1 ④类基数与权威来源(§0.5)· R-2 存在域收据集合的机器可读形态与读取路径(单证标注数据源;175 张的现物位置)· R-3 识别器调用形态现物(12.9a trial-2 的模型/endpoint/多模态入参;本单输入是**碎片文本清单**——判定:文本模态即可还是需页图?⭐ 倾向纯文本,页图会把出境字符炸穿,如实论证)· R-4 抽页方案与预算算术(四卷各抽哪些页、候选碎片数与字符量、调用数×出境字符 ≤ 硬闸的实际方案)· R-5 d-2 水合链复用点(函数签名与调用式)· R-6 TD-40 同路判定 · R-7 **契约草案冻结**(输入/输出 JSON schema、判废条件枚举、prompt 逐字、SHA-256)。
腿 1 回执:R-1~R-7 + porcelain 全文(仅契约文件+报告骨+本单 M+噪音行)。**停线候调度方契约复核。**

## 3. 腿 2 定义(resume 令启动)

按冻结契约实现三件(闸/测试/跑批)→ 四卷抽页实跑 → 台账(**分卷**:候选/实跑/跳过+原因/有效引用率/判废清单逐条/单证率)→ 报告补全(含 K-5 式硬声明**逐字**:「本轮引用质量只代表 page 级地板碎片上的引用质量,⛔ 不代表本产品的引用质量。」+ 点射消费形态专节 + 未做清单)→ 门禁。

## 4. 判据(K)

- **K-1 冻结先于实现**:腿 2 开工时契约文件 SHA 与腿 1 冻结值逐字相等(回执贴两次哈希);实现与契约字面一致。
- **K-2 三验真牙**:测试各造违约样本断言判废(跨 lockfile 引用/锚复放失败/存在域单证);判废走台账⛔静默;单证=标注不拒。⛔ 测试零真实调用(fake 识别器)。
- **K-3 预算**:实跑台账三方咬合(脚本计数/回执申报/≤20 调用 ≤30,000 出境字符);预检代码在,超限前拒发。
- **K-4 分母义务**:每卷候选/实跑/跳过逐条,零静默缺失;数字来自脚本产物与查库,SQL/来源入报告。
- **K-5 门禁**:tsc · test:v2(基线 **328/328**,会增,报增量与新总数)· `npm run docs:check`(生成件口径照旧)· 禁区逐项 `git diff --quiet` 贴 exit。
- **K-6 声明本单没做**:置信度持久层(候点射消费形态开单)· 嵌入终选 · UI · TD-38 · 识别器终选。

## 5. 通用纪律(沿 M4 各单,一字不减)

搜索纪律(cd 仓库根/相对路径/⛔ 裸盘符入搜索命令——census 输入目录属仓外只读例外,读取命令允许其绝对路径,⛔ 但搜索/遍历不得越出该目录)· key 值零出境 · ⛔ 不 commit 不 push · ⛔ 不翻状态头 · ⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md` · ⛔ 不杀任何进程(含 PID 8292)· 回执与报告经 apply_patch 落盘⛔不走 stdin · 锁非你所有 · 字面矛盾摊开标 `needs: dispatcher` 停线交回 · ⛔ 安全类/对抗类测试零设计零执行(判废样本=功能性数据样本,中性措辞)。

## 6. 回执

腿 1:R-1~R-7 · 契约 SHA · porcelain。腿 2:K-1~K-6 逐项 · 台账 · 硬声明位置 · 点射消费形态专节指针 · 门禁 exit · 停线点。

## Result(腿 1)

**结论：腿 1 完成，无 `needs: dispatcher`；已按分腿纪律停线，等待调度方复核契约并发 resume 令。** 本腿只做 K-0 与冻结草案：实现代码 0、外部 API 调用 0、出境字符 0、费用 0、key 读取 0、进程操作 0。

两份交付物：

- 契约：`docs/agent-ops/analysis/2026-08-31-c3-citation-prompt-contract.md`；
- 报告骨：`docs/agent-ops/analysis/2026-08-31-v12-9c-c3-citation-experiment.md`。

### R-1 · ④类基数与判数源

获准的 `D:/Coinsides/v12.9-selection/tools/_out/**` 内没有 standalone `divergence-census-v3.json`。本单以指定 c-2 v3 文档 §6.1 内嵌 canonical JSON 为机器判数源：恢复后 5,096,178 bytes，SHA-256 `2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`。

`$.classification_pass.counts_by_classification_and_predicate["真实指错"].cross_predicate_total = 2`；过滤 `$.classification_pass.divergences[*].classification == "真实指错"` 也恰为 2。两件为 `D-000029 / EV-000143`（academic-reading，p19）与 `D-000059 / EV-000268`（academic-reading，MinerU p34–35、Docling p34）。基数单位是 **event**，不把 175 张存在性差异、150 个 pairing unresolved 或 211 张分类学差异混入。

### R-2 · 存在域收据机器形态

机器路径固定为 `$.gate_pass.existence_differences[0..174]`，恰 175 张；单张含 `existence_id/event_id/document/predicate/source/direction/sort_key/opposite_side_member_count`、双方 role/seq、完整 evidence、overlap graph 与 pairing proof。读取前按 c-2 §6.1 复核解码字节数、SHA、UTF-8 与末尾 LF。

收据没有现役 native-pdf fragment ID，故本轮 page-fidelity 映射冻结为“单边 evidence 的 path basename = 现役 original_filename，且 canonical page = 现役 page anchor”。命中后给有效 citation 透传 `uncorroborated=true + existence_receipt_ids`；**只标不拒**。这是保守页级投影，不声称 bbox 碎片与整页 fragment 身份相等，也不建持久字段。

### R-3 · 调用形态与模态

工作假设模型 `qwen-vl-max`，endpoint 固定 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/`，不冒充终选。12.9a 视觉 2b 现物是“页图 + 转写碎片清单 → source_seq”；文本档是“碎片清单 → source_seq”。本单选择**纯文本**：目标是引用既有 `id/anchor/text`，不是重建 bbox；trial-2 最小页图 104,030 bytes，base64 理论下界 138,708 字符，单图已击穿全单 30,000 字符闸。契约明确禁止 `image_url`、base64 与页图。

### R-4 · 抽页与预算算术

计划 5 calls / 4 volumes / 6 page fragments：

| request | 页范围 | fragments | 文本字符 | 完整 request body 字符 |
|---|---|---:|---:|---:|
| academic-reading 点射 1 | p19 | 1 | 2,921 | 4,437 |
| academic-reading 点射 2 | p34–35 | 2 | 5,764 | 7,326 |
| writing responses 校准 | p4 | 1 | 2,113 | 3,456 |
| academic writing 校准 | p4 | 1 | 335 | 1,633 |
| listening 校准 | p8 | 1 | 243 | 1,544 |
| **合计** | **6 页** | **6** | **11,376** | **18,396** |

两个 reading request 只瞄 2 个④类 event；其余三卷复用 trial-2 已登记页以履行四卷分母，不因存在域或分类学差异选页。完整 body 以冻结 prompt、现役只读 DB 文本与 `JSON.stringify(requestBody)` 的 Unicode code point 数精算：`5 <= 20`、`18,396 <= 30,000`，余量 15 calls / 11,604 chars。腿 2 仍须发送前按实际 body 累计预检，重试也计数，越界前拒发。

### R-5 · d-2 水合链复用点

现役签名为 `getImprintFragmentsByAnchor(db: Database.Database, userId: string, imprintId: string, query: SourceImprintAnchorQuery)`；固定调用式：

```ts
getImprintFragmentsByAnchor(db, userId, imprintId, { match: 'exact', anchor })
```

随后必须在返回集合内按 cited fragment ID 回找；找不到即 `citation_anchor_replay_failed` 判废。d-2 的 `hydrateImprintRetrievalMatch` 已走同一调用式。c-3 只 import/call，不改 `sourceImprints.ts`，不重写锚等价。

### R-6 · TD-40 同路判定

**不自然同路，原地留债。** TD-40 属 `storeSourceImprint` 写入链尾的增量 embedding 钩子；c-3 是既有 fragment 的只读 page-range 组装、引用与校验，实验也不经 KNN。捎带会触碰 `sourceImprints.ts` / `imprintEmbedding.ts` 禁区并扩大允许面。本单不修、不改债状态。

### R-7 · 契约冻结草案

契约已冻结输入/输出 JSON schema、纯文本 request body、逐字 system/user prompt、现役 lockfile hash 条件、六项判废 code、d-2 exact 锚复放、存在域单证投影与预算计数法。

- bytes：10,354；
- SHA-256：`8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa`。

腿 2 开工第一步须复算同值；不等即停线。实验报告 §8 已留分卷台账、判废清单、预算、点射消费形态、K-5 硬声明与未做清单骨架，均未冒充实跑结果。

### porcelain 全文

```text
 M docs/agent-ops/handoffs/2026-08-31-v12-9c-c3-citation-mode.md
 M server/src/routes/projections.ts
?? docs/agent-ops/analysis/2026-08-31-c3-citation-prompt-contract.md
?? docs/agent-ops/analysis/2026-08-31-v12-9c-c3-citation-experiment.md
```

未 commit、未 push、未翻状态头；未碰锁、`.claude/**`、agent 指令、current-state、key、会话记录、证据本体写面或任何进程（含 PID 8292）。开工前既有 `server/src/routes/projections.ts` 状态噪音完整保留，未触碰。

## Result(腿 2)

**needs: dispatcher —— 新钉子导致腿 2 在实现前停线；本段未完成。**

### K-1 冻结复核

开工第一步复算通过：契约仍为 **10,354 bytes**，SHA-256 仍为 `8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa`，与腿 1 冻结值及调度令逐字相等。契约文件零 diff。

### 阻断事实：存在域文件身份映射未被机械冻结

冻结契约 §5 要求“以收据单边 evidence 的 `path` basename 对齐 host 的 `original_filename`”，但两侧现物后缀不同：

| census evidence basename | host `original_filename` |
|---|---|
| `ielts-academic-reading-sample-tasks-2023.fragments.json` | `ielts-academic-reading-sample-tasks-2023.pdf` |
| `ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json` | `ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf` |
| `ielts-academic-writing-sample-tasks-2023.fragments.json` | `ielts-academic-writing-sample-tasks-2023.pdf` |
| `ielts-listening-sample-tasks-2023.fragments.json` | `ielts-listening-sample-tasks-2023.pdf` |

只读复证得到两组各 4 个 distinct 名称，逐字交集为 `[]`。因此：

- 若按 basename 逐字相等实现，175 张收据对现役四卷全部零命中，腿 1 R-4 钉定的 `E-000052`、`E-000060`、`E-000104..E-000108` 单证验证会静默消失；
- 若 builder 自行剥 `.fragments.json` 与 `.pdf` 后缀再比 stem，则是在生效契约之外新增未冻结的身份算法；
- 契约已由调度令声明“一字不改”，本单纪律又要求新钉子/字面矛盾停线，故不能自行选边。

### 需要的最小调度裁定

请用不改契约字节的明确 addendum 指定文件身份映射。最小候选是：census basename 必须以字面后缀 `.fragments.json` 结尾、host filename 必须以 `.pdf` 结尾，分别只剥这两个完整后缀后，剩余 stem 必须逐字相等；任何后缀或 stem 不满足即发送前停线，不猜测、不模糊匹配。

### 本次停线范围

- `imprintCitations.ts`：未创建；
- `v2ImprintCitations.test.ts`：未创建；
- `cite-imprint-pages.mjs`：未创建；
- `server/package.json`：未修改；
- 外部 API 调用 0、出境字符 0、费用 0、key 读取 0；
- 未运行实现门禁或实验，未生成任何结果数字；
- 未 commit、未 push、未改契约、未改状态头、未碰锁/进程/current-state/census 输入/key/会话记录。

### porcelain 全文

```text
 M docs/agent-ops/handoffs/2026-08-31-v12-9c-c3-citation-mode.md
 M server/src/routes/projections.ts
```

## Result(腿 2·续)

**结论：腿 2·续完成，无新增 `needs: dispatcher`，按令停线交回。** 先前 `## Result(腿 2)` 的停线事实与文字原样保留；调度方补遗 1 已机械冻结该阻断点，本续段只按补遗恢复施工，没有改主契约字节。

### K-1 · 双冻结件先于实现

开工第一步与跑批首次发送前各复算一次：

- 主契约：10,354 bytes，SHA-256 `8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa`；与冻结值逐字相等，`git diff --quiet` exit 0；
- 补遗 1：1,743 bytes，SHA-256 `2ab5f08231a37acf0279f6b051af04e32455cbc6cf3667b50d108c40d6237b4f`；与冻结值逐字相等，`git diff --quiet` exit 0。

补遗自证测试覆盖四对现物名同 stem，以及一个错误后缀的中性功能样本触发 `identity_mapping_stop`。实跑前又对 175 张收据和四卷 host 全量跑同一映射；没有其他大小写、空白或 Unicode 归一化。

### K-2 · 三验真牙与零写库

新增 `server/src/services/imprintCitations.ts`：请求准备只读 page-range 水合；响应闸依次执行候选/ownership-imprint、现役 lockfile hash、生产 `getImprintFragmentsByAnchor(...,{match:'exact',anchor})` 回放与 ID 回找；存在域只给有效 citation 透传 `uncorroborated + existence_receipt_ids`，不判废、不写库。

新增测试 9 条，fake recognizer 的真实调用计数为 0。全绿路径外，六个冻结码均有中性功能判废样本并断言台账：`output_schema_invalid`、`request_id_mismatch`、`citation_fragment_unknown`、`citation_imprint_mismatch`、`citation_lockfile_mismatch`、`citation_anchor_replay_failed`；另断言单证标注不拒绝、未知 citation 的 partial 结果不静默删除。

### K-3 · 预算与实跑

按指定命令从 `server` 目录运行：

```text
node --env-file=.env --import tsx ../scripts/cite-imprint-pages.mjs
```

首次发送前完整预检为 5 calls / 6 fragments / 18,396 出境字符；逐 request 字符为 4,437、7,326、3,456、1,633、1,544。实际为 **5 calls / 18,396 chars / 0 retries**，与计划及报告三方相等，满足 `<=20 / <=30,000`；余量 15 calls / 11,604 chars。provider usage 合计 prompt 4,250、completion 1,864、total 6,114 tokens。key 只申报 `present=true,length=116`，值未进入 prompt、日志、回执或落盘物；本次为真实 provider 调用，provider 未返回可据以申报的货币费用数值。

### K-4 · 四卷分母、结果与判废台账

| 卷 | 候选 / 实跑 / 跳过 | claims | 有效引用 | 判废 | 单证引用 |
|---|---|---:|---:|---:|---:|
| academic-reading | 2 / 2 / 0 | 15 | 15/15 | 0 | 0/15 |
| writing-example-responses | 1 / 1 / 0 | 6 | 6/6 | 0 | 6/6（`E-000052`） |
| academic-writing | 1 / 1 / 0 | 0（合规 abstain） | 0/0 | 0 | 0/0 |
| listening | 1 / 1 / 0 | 0（合规 abstain） | 0/0 | 0 | 0/0 |
| **合计** | **5 / 5 / 0** | **21** | **21/21** | **0** | **6/21** |

五个 response 均为 `accepted`，各自 `rejection_ledger=[]`；零判废已逐 request 写入报告 §8.5，没有用汇总值掩盖条目。

两个④类 event 单列：`D-000029 / EV-000143`（p19）得到 7 claims / 7 citations，7/7 过闸；`D-000059 / EV-000268`（p34–35）得到 8 claims / 8 citations，8/8 过闸。两者单证均 0，且没有把 claim、citation、fragment 或 page 数改称 event 基数。完整分卷、budget 与 provider usage 台账见实验报告 §8.3–§8.6。

### K-5 · 消费形态、硬声明与门禁

点射消费形态见实验报告 §8.7：没有模型 confidence，实际结果是 **per-citation / cited-fragment** 的引用与单证注解，不是 per-imprint；当前读取者只有跑批台账和报告，本单没有接 API/UI/持久层。

硬声明位于实验报告 §8.8，并逐字为：

「本轮引用质量只代表 page 级地板碎片上的引用质量,⛔ 不代表本产品的引用质量。」

最终门禁：

- `npx tsc --noEmit`（server）：exit 0；
- `npm run test:v2`（server）：exit 0，**337/337**；工单基线 328/328，本单增量 **+9**；
- `npm run docs:check`（根）：exit 0；生成件最新，glossary K-1..K-3 PASS。

禁区逐项 `git diff --quiet HEAD -- <path>`：主契约、补遗 1、`sourceImprints.ts`、`imprintEmbedding.ts`、`imprintRetrieval.ts`、`embedding/dashscope.ts`、`server/src/db/**`、`client/**`、根 `package.json`、`.env*`、`docs/agent-ops/current-state/**`、`.claude/**`、`AGENTS.md`、`CLAUDE.md` 均 exit 0。既有 `server/src/routes/projections.ts` EOL 状态噪音内容 diff 亦 exit 0，未触碰。

### K-6 · 本单没有做与停线点

没有置信度持久层、嵌入终选、识别器终选、UI、API 路由、TD-38、TD-40、页图、多模态输入、新 fragment、迁移或数据库写入；没有消费分类学差异；安全类/对抗类测试零设计零执行。未 commit、未 push、未翻状态头、未碰锁、进程（含 PID 8292）、census 仓外输入、current-state、会话记录或 key 值。

本续段无新增停线点；先前身份映射停线仅由调度方补遗 1 解除，历史段保留。

### porcelain 全文

```text
 M docs/agent-ops/analysis/2026-08-31-v12-9c-c3-citation-experiment.md
 M docs/agent-ops/handoffs/2026-08-31-v12-9c-c3-citation-mode.md
 M server/package.json
 M server/src/routes/projections.ts
?? scripts/cite-imprint-pages.mjs
?? server/src/__tests__/v2ImprintCitations.test.ts
?? server/src/services/imprintCitations.ts
```
