> **状态 (Status)**: done(d-3 段收口;12.9d 全段关账)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: fable(裁定) / henry(复核) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31 续办令「d-3 收口铸段,文档+门禁,调度自办⛔不派 builder」。⛔ **不是 Henry。**
> **上游**: `plans/v12-9d-retrieval-foundation-skeleton.md`(骨架+§五 K-0 三改裁)· d-0~d-2 四张工单与 12.9c 收口件体例(`2026-08-29-v12-9c-c1-segment-closeout.md`)

# d-3 段收口:12.9d 检索地基 —— 碎片有了第一个生产读者

## 1. 交付清单(d-0 → d-2 历程与现物索引)

| 单 | 做了什么 | 批 |
|---|---|---|
| **K-0 侦察** | 骨架三前提被现物推翻(sqlite-vec 已在产/云嵌入改裁/规模全零)⇒ §五 三改裁 | `f343dd9` · `c765785` |
| **d-0** 接线图+供应商冒烟 | DashScope `text-embedding-v4` 实测 **1024 维**;**401 定因=区域端点**(北京 401 / 国际站 200),⛔ 不是 key;endpoint 常量入法;成本做成硬判据 | `87bbf36`(立)· `e1a4a8b`(收) |
| **d-1a** 走真链灌四卷 | 零 API 调用;`intakeSourceTempFile→scheduleSourceMaterialization→storeSourceImprint` 真链产 4 accepted imprint、**110 碎片 / 114,066 字符**;复核全数独立查库复算 PASS;⚠️ 撞出设计级发现:**碎片粒度是页不是块**(同四卷 MinerU **808** vs 本代 **110** = **7.35×**;`para` 110 / `heading` 0) | `877204b`(立)· `2ad0034`(收) |
| **(插曲)TD-39 凭证事件** | d-1b 首派因搜索逸出仓库范围作废停线;builder 按 §0.6 零调用零文件自行作废;Henry 吊销旧 key 后销账,d-1b 携修订 A/B 重派 | `e05f735`(停线)· `3edc992`(销账+重派) |
| **d-1b** 新代向量表+嵌入工序 | 迁移 **052**:`imprint_fragment_vectors`(身份收据,UNIQUE(fragment_id, model_id))+ `imprint_fragment_vec`(vec0 FLOAT[1024] cosine,**model_id NOT NULL PARTITION KEY**);独立 DashScope provider(intl 常量,key 走 `process.env`,错误消毒);嵌入工序(预算预检/不覆写/KNN 内 model 过滤);**110/110 全嵌**(11 调用 / 114,066 字符 / 0 跳过 0 重试);隔离测试=更近异 model 向量不返回 | `6c2abf7`(立)· `e8ea3c4`(收)· `5363720`/`db9b2bf`(翻 done) |
| **d-2** 最小检索 API+经锚水合 | `POST /api/imprint-retrieval/query`:query→嵌入→KNN(model 过滤+超采样)→归属过滤(user_id+accepted)→**水合唯一路径 = `getImprintFragmentsByAnchor`(exact 复放)**;出处链四组字段(fragment/imprint/source_file/retrieval)逐字段入响应;复放失败必炸;走查 3 条真 query 命中 9 条、锚逐条复放归源 | `12005f7`(收)· `cf52723`(翻 done) |

**测试**:`test:v2` **351 → 362**(d-1b +7 / d-2 +4),全绿;`tsc --noEmit` 零诊断;两单各自 13~17 处禁区零 diff;旧代检索机关(documents/document_chunks/doc_chunk_vec/Voyage 全家)全段零触碰,新代零 join 旧代表。

## 2. ⭐ 段目标达成度对账(骨架 §一 三件交付物,逐件如实)

| 骨架要求 | 达成 | 如实注记 |
|---|---|---|
| §一.1 嵌入工序(批量回填 + 增量钩子) | **半** | ✅ 批量回填在(110/110,幂等);⛔ **增量钩子未做** ⇒ 新碎片默认检索不可见,**已立 TD-40**(骨架本就裁「显式跑批起步」,记债防起步形态变永远)。模型=**工作假设** DashScope text-embedding-v4,⛔ 不冒充终选(延 V14) |
| §一.2 向量存储 | **全** | 新代 `imprint_fragment_vec` 共用 sqlite-vec 机关,`model_id` 分区承重(同维不同空间混表在 schema 层被挡);FTS 半边未做=骨架既定不进最小面(挂需求触发器,非新债) |
| §一.3 最小检索 API + 经 `getImprintFragmentsByAnchor` 水合 | **全** | ⭐⭐⭐ **段使命达成:碎片第一个生产读者已在 —— c-3 触发器开门**(总部已记大账)。出处链完整、锚可复放(exact 复放+同锚集数+复放失败必炸)、消费面=API+走查脚本,⛔ 无 UI(按界) |

**法度逐条**(骨架 §二):嵌入=转写器同族(model_id/维度/归一化入行,换模型新行⛔不覆写)✅ · 分母义务(覆盖率分卷+合计,跳过 0 且逐类枚举)✅ · 条款触发申报(三单 K-6 各自如实)✅ · 锚可复放判据 ✅ · 门禁照旧 ✅。⚠️ 骨架 §二「BGE-M3 本地推理」一条已被 §五 改裁作废,按改裁执行,非漏项。

**欠账汇总(照各单 K-6,⛔ 收段不清洗)**:
1. **FTS 半边**:未做(既定,挂需求触发器);
2. **粒度 = page 级地板**:全段检索质量钉在地板上 —— 硬声明已三处入档(d-1b 覆盖率报告 / d-2 走查报告 / 本件):**「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」**粒度升级永远是它自己的显式单;
3. **嵌入模型终选**:延 V14(需真实检索采纳 ≥50 组标注集);
4. **UI**:无(按界,归后续段);
5. **HTTP 端到端**:未测(走查走 in-process;已入 `deferred-tests.md` 2026-08-31 行);
6. **增量嵌入钩子**:未做(**新立 TD-40**,落点候选 c-3);
7. **TD-38(xlsx/csv 不产碎片)**:12.9c 移交的欠账,**12.9d 未接、原样再移交**(本段语料全 PDF,未触及表格族;落点仍待定,⛔ 不算进任何「T0 已对齐」表述);
8. **识别器引用模式与引用校验闸**:c-3 的肉,门已开、肉未动(c-3 拆单归总部骨架)。

## 3. 崩机两次的段内影响(⛔ 只记现物可证的)

| 事件 | 影响 | 净损 |
|---|---|---|
| **崩/重启链 ①**(今晨;claude-log 08-31 条目 1–2:「灭 1」+ 重启恢复) | 调度会话 8b 一度不在列、总部会话地址漂移(23→8a→b5);巡检重挂 | 检查点开销,零工程损失 |
| **崩溃 ②**(≈15:07–15:08 机器崩溃;15:21 应用重启) | ①杀死 d-1b 二派 builder(最后交货 15:05:31,代码半程成遗产、运行时半程未起);②**清零 `~/.codex/config.toml`**(5974B 全 NUL,已改名 `.corrupted-by-crash-0831.bak` 留证;Henry 的 codex 自定义配置——含旧默认 danger-full-access+ultra 取证——待其本人重建);③调度会话 8b 未随重启回归 ⇒ 巡检「灭三」触发顶班 | 约一次派工的后半程 + 数小时检修;**零代码损失**(遗产 6 处完好过门禁)、**零凭证损失**、**零判据妥协** |

**崩后新知(均已入配方/台账)**:壳≠核(桌面 app-server 误认孤儿 builder;判活=「codex.exe+命令行含 exec」)· 无 config.toml 时 `-s` 失效 ⇒ `--approve-for-me` 通路 · 崩后预检加 config.toml 字节级查 NUL · 回执禁 stdin 传中文(cp936 毁字),一律 apply_patch/脚本落盘 · 派前 docs-index 先绿 + docs:check「前绿后申报」口径。

**⭐ 段内三次停线,零次在 builder**:d-2 两段停线(INDEX 缺口+门禁互斥;cwd 处方错在 d-1b 续跑)均判**调度方合同/命令缺陷**,builder 每次都零越界摊开事实标 `needs: dispatcher` —— 与 12.9c 收口件 §3「三次停线,三次都是发单方的错」同形。**分层在起作用,且成本仍由下游注意力支付**;两条机械化修订已入配方。

## 4. tech-debt 巡检(段末快照)

| TD | 终态 |
|---|---|
| **TD-37** DASHSCOPE 双定义 | ✅ 已清(08-30 裁定,08-31 现物复核) |
| **TD-39** 凭证事件 | ✅ 已清(Henry 吊销+清副本;会话记录明令保留;射程申报在案) |
| **TD-38** xlsx/csv 不产碎片 | **未清 · 12.9d 原样再移交**(本段未触表格族,落点仍待第一个 sheet 锚生产者) |
| **TD-40** 嵌入无增量路径(**本件新立**) | **未清**(落点候选 c-3;触发器=第一次对新入库件发检索并期待命中) |
| TD-34 两代收敛 / TD-30 / TD-32 / TD-33 / TD-35 | 状态不变,12.9d 零触及(新代检索面即 TD-34 存活侧,与裁定一致) |

## 5. 收段基线实跑(d-3 当场,⛔ 非引用历史绿)

| 门 | exit |
|---|---|
| `npm exec --prefix server -- tsc --noEmit -p server` | **0**(零诊断) |
| `npm --prefix server run test:v2` | **0**(tests **362** / pass **362** / fail 0 / skipped 0) |
| `npm run docs:check` | **0**(本件与两笔台账追加经 `docs:index`+`docs:inventory` 重生成后) |
| `npm run check:tech-debt-table` | **0**(TD-40 行合规;历史豁免三条未新增) |

## 6. 本段没做什么(段级 K-6)

检索 UI · 识别器引用模式与引用校验闸(c-3)· FTS · 粒度升级 · 嵌入终选(V14)· 增量嵌入(TD-40)· xlsx/csv 表格族(TD-38)· 跨库语境(V14)· HTTP wire 级端到端(deferred-tests)。

**12.9d 关段。检索地基 = 嵌入工序(批量)+ 新代向量存储 + 最小检索 API + 经锚水合,全链在 page 级地板上跑通并三处声明地板;c-3 门开,肉归下段。**
