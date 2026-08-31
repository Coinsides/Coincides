> **状态 (Status)**: ready(M3/12.9d 第二单;造数 + 规模实测,⛔ 零 API 调用)
> **from**: claude(opus,工程调度会话 coincides-8b) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「d-1 直接开,不补骨架」+ 调度方按姑息模式(本机 CPU 退化嫌疑)拆为 d-1a/d-1b 小步落盘。⛔ **不是 Henry。**
> **上游**: `analysis/2026-08-31-v12-9d-d0-provider-smoke.md`(⭐ 先读,含现役接线图)· `analysis/2026-08-31-v12-9d-k0-recon.md`

# d-1a:走真链灌四卷,把「规模」从假设变成实测(⛔ 零 API 调用)

## 0. ⛔⛔ 先读这六句

1. **本单零 API 调用、零花费。** ⛔ 不碰 DashScope、不碰任何嵌入接口 —— 那是 d-1b。
2. **⛔ 不建 `imprint_fragment_vec`、不写任何向量。** 本单只造碎片。
3. **⛔⛔ `D:/Coinsides/v12.9-selection/**` 是证据本体,全程只读,一个字节不许写**(含不许在其中建临时文件、不许改 mtime)。要用就**复制出来**再用。
4. **⛔ 不许直接 `INSERT` 造数据。** 碎片必须**经真链产生**:`intakeSourceTempFile` → `scheduleSourceMaterialization` → `storeSourceImprint`。手写 INSERT 造出来的数不是实测,是布景。
5. **⛔ 不设 `COINCIDES_PDF_PARSER`。** 本单要的是**当前生产默认路径**(`native-pdf@2.4.5`)的诚实数字,不是 MinerU 的。
6. **⛔ 不新建生产用户。** 用库里已有的账号,并在回执申报你用的是哪个、怎么拿到的(⛔ 不许打印任何凭证)。

## 1. 语料(四卷,只读)

```text
D:/Coinsides/v12.9-selection/samples/ielts-academic-reading-sample-tasks-2023.pdf
D:/Coinsides/v12.9-selection/samples/ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf
D:/Coinsides/v12.9-selection/samples/ielts-academic-writing-sample-tasks-2023.pdf
D:/Coinsides/v12.9-selection/samples/ielts-listening-sample-tasks-2023.pdf
```

## 2. 允许面(⛔ 只这些)

- **新建**:`scripts/seed-imprint-corpus.mjs`(灌数脚本;可重跑,须幂等或明确申报不幂等)
- **新建**:`docs/agent-ops/analysis/2026-08-31-v12-9d-d1a-corpus-scale.md`(规模实测报告)
- **追加**:本单 `## Result`

⛔ **禁区(零 diff 自证)**:`server/src/**` · `client/src/**` · `package.json` · `server/package.json` · `.env` · `.env.experiment` · `docs/agent-ops/current-state/**` · `docs/agent-ops/handoffs/plans/**` · `D:/Coinsides/v12.9-selection/**`

> ⚠️ 若你认为**必须**改 `server/src` 才能灌数(例如缺一个可编程入口),**停线上报,⛔ 不要自行改**。发单方要知道这件事。

## 3. 判据(⭐ 全部机械可核)

### K-1 证据本体只读自证

灌数**前后**各算一次四份 PDF 的 sha256,回执贴两组值并申明相等。⛔ 不许在证据树里建任何文件。

### K-2 ⭐⭐ 必须走真链,且要能自证走过

回执须给出**每卷的链路留痕**:`source_files.id` → `source_materializations` 的 `parser_key` / `parser_version` → `source_imprints.id` / `status` / `anchor_fidelity` / `transcriber_lockfile_hash` → `imprint_fragments` 行数。
⭐ **自证判据**:`source_imprints.fragment_count` 必须**逐件等于**该 imprint 在 `imprint_fragments` 里的实际行数。不等即停线。

### K-3 ⭐⭐⭐ 规模实测(本单的产出本体)+ 分母义务

报告须给出,**每一项都分卷 + 合计**:

- 总碎片数;
- 按 `role` 分布(`para` / `heading` / 其他,逐一列出,⛔ 不许合并成"其他 N 个");
- 按 `anchor_fidelity` 分布;
- 碎片文本长度分布:**min / median / max / 总字符数**(⭐ 总字符数是 d-1b 估算嵌入成本的输入,必须给);
- **未产出碎片的输入及其原因**(若有):哪一卷、哪一步、什么 code。⛔ 分母里不许有静默缺失。

⛔ **这些数字必须来自查库,不许来自脚本内存里的计数器** —— 回执须贴出你用的 SQL。

### K-4 转写器身份如实申报

回执须申明:`COINCIDES_PDF_PARSER` **未设置**(贴出你怎么确认的),实际 `parser_key` / `parser_version`,以及 `transcriber_lockfile_hash` 四卷是否相同。

### K-5 ⛔ 与 K-3 对照:声明本单**没有**测什么

至少须列:MinerU 路径下的碎片规模(未测)、region 级 fidelity(未触发)、d-1b 的嵌入成本(未算,只给字符数输入)。⚠️ **未测就写未测,⛔ 不许用默认路径的数字冒充"这就是规模"。**

### K-6 门禁与禁区

收工前:`npm --prefix server run test:v2`(基线 **351/351**,本单**不应**改变它——若变了,申报为什么)· `npm exec --prefix server -- tsc --noEmit -p server` · 禁区逐一 `git diff --quiet` 贴 exit code。
⚠️ `server/src/routes/projections.ts` 有**开工前即存在**的 EOL 状态噪音(` M` 但零内容 diff),⛔ 不许触碰。

## 4. 回执(`## Result`)

K-1 两组哈希 · K-2 四卷链路留痕 + fragment_count 自证 · K-3 全部数字**连同 SQL** · K-4 身份申报 · K-5 未测清单 · K-6 三项结果 · 用的账号(⛔ 不打印凭证)· 任何停线点。
