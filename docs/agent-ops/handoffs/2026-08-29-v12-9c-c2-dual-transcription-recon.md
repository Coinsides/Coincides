> **状态 (Status)**: done(M1 收官 —— v3 两遍制 PASS 无停线:门遍 856 全量、覆盖率 24 行 remaining=0、分类遍 320/320 未触发 K-3;终审五路零 blocking,分母本身经第一性原理重建证成。⚠️ 已知瑕疵:§4 编码破损 → 并入 M2/c-4 从 JSON 重渲;K-8 的 5MB JSON 归宿划给 c-4)
> **from**: claude(opus,工程调度会话) · **to**: fable(裁定) · **date**: 2026-08-29
> **裁定来源**: Fable 2026-08-29「c-2 只做拆单前置侦察,判轻重后决定派或押到日间」

# c-2 侦察结论:双拓互证**不是轻单**,且**顺序可能要重排**

## 1. 环境:Docling **完整存活**(与 MinerU 同级)

`D:/Coinsides/v12.9-selection/tools/docling/`:`.python-version` · `pyproject.toml`(182 B)· **`uv.lock` 459,162 B / 126 包** · **`.venv` 在**;`docling` 钉 **2.123.0**,与 12.9a 初赛记录一致。
⇒ **环境这一项确实是「遗产体检」级** —— ⛔ **但 c-2 的重量不在环境。**

## 2. ⛔ 三条硬事实,决定它不轻

| # | 事实(已核) | 后果 |
|---|---|---|
| **①** | `046_v2_source_lifecycle_closure.ts:43` 有 **`CREATE UNIQUE INDEX idx_source_mat_one_per_record ON source_materializations(source_record_id)`** | **一个 source 只能有一份 materialization,数据库层强制**。⇒ 双拓**必须在一次 materialization 内跑两个 parser**;若想「两份 materialization」则要**动唯一索引 + 认领/状态机** |
| **②** | `sourceMaterialization.ts` 里 `storeSourceImprint` **只有一处调用**(`:421`) | 现在**一次 materialization 只写一份出生证**;双拓要写两份 ⇒ 改那一处 |
| **③** | 出生证**没有任何置信度字段**(`grep confidence` 零命中) | ⇒ **需要一次迁移**(与 c-1b-0 同级) |

✅ **唯一一件已经就绪的**:c-1b-0 把判同 SQL 改成**只比 `transcriber_lockfile_hash`** ⇒ **两个不同转写器的拓印天然共存**,⛔ 不需要额外工作。

## 3. ⭐⭐ 待裁问题一:**置信度现在没有消费者**

- 纲领 §7 第 3 级:「**低置信碎片**由 qwen-vl-max 区域点射复核」⇒ **置信度的唯一预定消费者是 c-3**。
- ⚠️ 而 **c-3 的门未开**:`imprint_fragments` 在**生产码**里的引用者 **= 0 处**(⛔ 不含测试/迁移/定义处)。
⇒ **c-2 会造出一个【当前无人消费】的字段。**

⚠️ **这正是本仓自己的法**:**形状先于能力**;**闸先建好没有对手,形状很可能是错的**。
⭐ **更锋利的推论**:**「置信度」该长什么样,取决于消费者怎么用它。** 若 c-3 是「低置信 → 点射那一块」,则置信度至少要**定位到碎片**(per-fragment),而非 per-imprint;**但没有消费者,我们就是在猜它的形状。**

**⇒ 建议(⛔ 未自采)**:**顺序重排** —— 先让 `imprint_fragments` 有**一个真消费者**(哪怕最小的读取路径),再做 c-2 的置信度。否则这是**又一次「形状跑在接线前面」**,而我们今晚刚为同一个病吃过两次亏(c-1b-0 的调用方、c-1b-1 的 parser 选择)。

## 4. ⭐ 待裁问题二:**「互证一致」的判据没有定义**

「碎片级互证:一致=高置信,分歧=低置信」—— ⚠️ **「一致」是什么,没有定义。**
c-1c 刚刚证明了这件事有多难:**同一批碎片,不同的尺子给出不同的通过集**;而两个转写器的分歧至少有**四种不同性质**:
1. **文本外形差异**(HTML vs 纯文本 —— c-1c 的 `table` 那条);
2. **归一化差异**(标点/点引线 —— c-1c 的 `index` 那条);
3. **切分差异**(一个转写器切两块、另一个切一块);
4. **真实指错**(锚落在了不同的地方)。
⇒ ⭐ **只有第 4 种是「低置信」该抓的;前三种是【尺子问题】,拿它们当分歧就是【制造假低置信】。**
⚠️ **而 c-1c 的教训正是:分类必须【先冻结】、且【只读产物字段】。** ⇒ c-2 的「一致判据」**必须在实跑前冻结**,⛔ 不许看到分歧率之后再调。

## 5. 判轻重结论

**⛔ 不派。** 按 Fable 的规则:它**要迁移 + 要动 materialization 工序 + 要设计一个尚无定义的判据**,⛔ **不是「遗产体检」级的轻单**,预估远超一小时。
⇒ **停在侦察,本 draft 落好,日间再派。**
📌 **Henry 醒来看到的是**:c-1 全收(五单 + c-1c)+ **c-2 侦察完毕、两问待裁**,⛔ 不是一张卡在半截的 c-2。

## 6. 派单前必须先答的两问(汇总)

1. **置信度的消费者**:是否先给 `imprint_fragments` 接一个真消费者,再做 c-2?还是接受「先造字段、后接消费者」并明确记账?
2. **「一致」的判据**:由谁定义、何时冻结?(建议:**写进 c-2 单的 §0 并冻结于实跑之前**,照 c-1c 的形状。)

---

## 7. ⚠️ Fable 的两个**倾向**(2026-08-29 留档;⛔ **非裁定**,日间裁时作起点)

> ⛔ **以下两条是【倾向】不是【裁定】。** Fable 明示「**两问都是设计级,凌晨不裁**」。⚠️ 日间开裁时**⛔ 不得把它们当成已裁**引用 —— **署名与效力必须如实**。

1. **对待裁一,倾向比本 draft 的建议【再进一步拆】**:c-2 或可分两层 ——
   - **实验/档案层**:两个转写器跑同批样本、分歧按四类归档,**零迁移、零生产码**(c-1c 形态);
   - **持久层**:置信度字段 + 工序改造,**等真消费者定形状**。
   ⭐ **副产品(这一点本 draft 没想到)**:**一致判据只能对着【真实分歧样本】设计** —— 实验层正好为它**供料**:**先看到分歧长什么样,再冻结判它的口径。**
   📌 与 c-1c 的顺序一致:**先有样本,后冻口径**;⛔ 反过来就是凭空造尺子。
2. **对待裁二,四分类本身可能就是判据的骨架**:**①②③ 属尺子域,④ 才属置信域**。

## 8. ⚠️ 风险节(Fable 点名直接入单)

> ⭐ **「制造假低置信,会把 c-3 的点射预算烧在尺子问题上。」**

⇒ 分歧四类里**只有第 ④ 类(真实指错)**是「低置信」该抓的。**①文本外形差异 / ②归一化差异 / ③切分差异**都是**尺子域**的东西 —— 把它们判成分歧,产出的不是低置信信号,是**噪声**,而**下游要为这些噪声付真金白银的模型调用**。
⚠️ **且这种错【不会报错】**:分歧率看起来很高,报告看起来很充实,只有账单知道出了问题。

## 9. ⭐ Fable 裁定(2026-08-29 上午;调度会话下线,裁定走持久通道入单——重启后按此执行)

**两问已裁,c-2 拆两层:**

1. **实验层(可派)**:c-1c 形态分析单——两家产物**只读对比**,分歧四分类**逐条给可复核字段证据**;⛔ 零迁移、⛔ 零生产码、⛔ **不产出任何置信度字段**。样本用现有 4 份雅思卷起步(12.9a 两家全卷产物在,能复用不白跑);走查 #5 长范文入库后可加测,⛔ 不阻塞在等新样本上。
2. **持久层(押后)**:触发器 = **c-3 门开(imprint_fragments 有真引用者)且点射消费形态确定**——届时才知道置信度 per-fragment 还是 per-imprint。「没有消费者就是在猜它的形状」按总纲执行。
3. **一致判据:先有样本后冻口径**——本次是**分歧普查**不是打分;判据对着真实分歧设计,设计完冻结,打分另跑一轮。⚠️ **普查的分类程序本身要先冻**(四分类定义 + 每类可复核字段清单,实跑前 SHA 定格)——「探索」豁免的是阈值,⛔ 不豁免程序。
4. **第五形态条款**:分歧若不入四类,如实记「未归类」并停线,⛔ 不硬塞——c-1c 的 index 条目是先例。
5. 拆单照家法:重对现物 + 三段取证 + 引用名词找定义处。

---

## 10. ⭐ 工单化(2026-08-30,调度方按 §9 裁定补;⛔ §1–§9 原文一字不改)

> §1–§9 是**侦察报告 + 裁定**,**没有允许面与判据段** ⇒ 不可直接派发。本节把 §9 的「实验层(可派)」补成**可派工单**。⛔ 不新增任何裁定,只把已裁的东西写成判据。

### 10.1 允许面(⛔ 只这些)

- `docs/agent-ops/analysis/2026-08-30-v12-9c-c2-divergence-census.md`(**本单唯一交付物**)
- 本工单的 `## Result` 段

⛔ **禁区(逐条零 diff)**:`server/**`、`client/**`、`scripts/**`、`package.json`、**任何迁移**、任何生产码或测试、`docs/agent-ops/INDEX.md`、本工单 **§1–§9 原文**、顶部状态行、**`D:/Coinsides/v12.9-selection/**`(证据本体,只读)**。
📌 普查脚本落**仓外临时目录**,⛔ 不进仓(配方逐字抄进档案即可复现)。

### 10.2 样本(§9-1)

**复用 12.9a 两家全卷产物**,⛔ 不重跑转写器 —— 它们**都在**:
- MinerU:`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/*.fragments.json`
- Docling:`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/*.fragments.json`
⭐ **两家跑的是同 4 卷**(academic-reading / writing-example-responses / academic-writing / listening)。
⚠️ **「能复用不白跑」是裁定原话** ⇒ ⛔ **不许为本单重跑 MinerU 或 Docling**;若发现产物不足以支撑普查,**停线上报**,⛔ 不自行开跑。

### 10.3 ⭐⭐ K-1 分类程序**先冻结**(§9-3:「探索」豁免的是阈值,⛔ 不豁免程序)

- **实跑前**先写死:**四分类的定义** + **每类的可复核字段清单**,并对该段取 **SHA-256 定格**;跑完**⛔ 不改**。
- 四分类(§9-2 骨架,⛔ 不许改名或增删):
  1. **文本外形差异**(如 HTML vs 纯文本);
  2. **归一化差异**(标点 / 点引线 / 空白);
  3. **切分差异**(一家切两块、另一家切一块);
  4. ⭐ **真实指错**(锚落到了不同的地方)。
- ⚠️ **只有第 ④ 类是「置信域」;①②③ 属尺子域。** 判错会**把 c-3 的点射预算烧在尺子问题上**(§8)。

### 10.4 ⭐ K-2 逐条给**可复核字段**证据(c-1c 形态)

- 每一条分歧,**逐条**给出:落在哪一类、**依据是产物里的哪些字段**(`role` / `type` / 有无 `image_path` / 有无 `html` / bbox / seq …)、以及**判定过程**。
- ⛔ **不许整体宣布「这些是尺子问题」** —— **那是结论,不是证据**;⛔ 不许凭肉眼看图断言。

### 10.5 ⭐⭐ K-3 第五形态条款(§9-4)

- 分歧**若不入四类**:**如实记「未归类」并【停线】**,⛔ **不硬塞进最近的一类**。
- 📌 **先例**:c-1c 的 `index`(目录点引线)条目 —— 纲领 §7 原本没给它归类,builder **拒绝为它新造第四把尺**,留成真 miss。**本单照此办理。**

### 10.6 K-4 这是**普查**不是打分(§9-3)

- ⛔ **不产出任何「一致率 / 准确率 / 谁更好」的数字**。本单只回答:**分歧长什么样、各类各有多少、证据是什么**。
- ⛔ **不产出任何置信度字段、不建议任何阈值** —— 一致判据「设计完冻结、打分另跑一轮」,**不在本单**。
- ⚠️ 若报告里出现任何**跨谓词的合计数**,必须按总纲**分谓词申报各自的计数与射程**。

### 10.7 K-5 零成本与边界(c-1c 同位)

- 档案须明记:**未调用任何模型、未使用任何 API key、未产生任何花费**;⛔ 若实际调了(不该发生)**如实记**。
- 须含 **「我自己的测量错误」** 一节;⛔ 若为空,先自问是不是没找。
- 须记**样本边界**(哪 4 卷、各多少碎片、只有这两家、只有这两个版本)与**结论外推到哪里为止**。
- **证据本体**:`v12.9-selection/**` 收尾复测哈希须与开工前相同。

### 10.8 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result` 段;若预算紧张,先写 Result 再做别的。**

须含:**冻结程序的原文与其 SHA-256**(冻结时刻须早于实跑)、四类各自条数、**逐条分类与字段证据**、**任何「未归类」条目及停线记录**、零成本自证、证据本体前后哈希、以及任何停线点。
⛔ 不许 commit,⛔ 不许翻顶部状态行,⛔ 不许改 §1–§9 原文。⚠️ 署名按**实际来源**(裁定来自 **Fable**,由调度方转写;⛔ 不得写成 Henry)。

---

---

## 11. ⭐ v2 修订(2026-08-31,调度方按总部裁定入单;⛔ §1–§10 与 v1 档案原文一字不改)

> **裁定源**:总部(Fable)2026-08-31 消息,由调度方转写。⛔ **不是 Henry。**
> **前提**:v1 轮已收工并复核通过(七路,零 blocking)。**v1 档案原样封存**,作为「存在性差异」的**发现证据**与本单交付物附录。

### 11.0 ⛔⛔ 先读这五句

> **①(裁定)「存在性差异」不是第五种分类,是【上游另一段工序】的产出。** 四分类的定义域**从来就是「双边都有、只是不一样」的【已配对事件】**;`U-STOP-000001` 死在**配对阶段**(交集图单边连通分量),**根本没进入分类器射程**。
> ⇒ **修法不是改尺子,是【申报分类器射程 + 补一道配对门】。⭐ 四分类定义一字不动。**
>
> **②(为什么这不是「跑后改口径」)** 跑后改口径是**涂改本轮**;**开一轮有完整出处的下一轮**是 v0→v1 静态审计已立的先例。且:**阈值需要样本,二分不需要** ——「配对成功/失败」是数据结构里**逻辑先于**四分类的一刀,**一个反例足以证明射程缺口**。
>
> **③ ⛔⛔ 普查不判对错。** 单边只记**方向**,⛔ 不记**归属**。
> | ⛔ 不许写 | ✅ 只许写 |
> |---|---|
> | 「MinerU **漏了**这个对象」 | 「**仅 Docling 有**此对象」 |
> | 「Docling **多切**了一块」 | 「同区间 Docling **2 块** / MinerU **1 块**」 |
> ⚠️ **病例(调度方自己犯的,原样入单警示)**:调度方向总部报停线时写了「一家**漏掉**一个图」——**「漏掉」预设了那儿本该有一个,那就是判对错**。⭐ **现物反例**:那条空文本 `picture` **完全可能是 Docling 捡了页眉装饰**;若如此,「漏掉」的反倒是**多出来的那家**。**谁缺谁多是下游的判断,不在普查射程。**
>
> **④(⭐ 复核实测,⛔ 别按个案设计)** 停线那条**不是孤例**:
> - 它是 **46 条同形态中的第一条**;
> - ⭐ **四卷的 Docling `seq 0` 全部是同一形态** ⇒ **四卷各自都会在同一处停线**;
> - ⭐⭐ **它不是「图片问题」** —— 该形态**跨 `visual` 与 `text` 两种 role**,`P-TEXT` 里同样存在;**本体是「页眉/页脚整条带缺席」**。
> ⇒ **⛔ 把它当图块专属问题设计,会严重低估射程。**
>
> **⑤ 方向不可判(现物结论)**:证据**不足以**判定这是一家漏收真实内容、还是另一家多收了幻块。⇒ **③ 那条禁令是被现物证成的必需,⛔ 不是洁癖。**

### 11.1 允许面(⛔ 只这些)

- `docs/agent-ops/analysis/2026-08-31-v12-9c-c2-divergence-census-v2.md`(**本单唯一交付物**)
- 本工单的 `## Result` 段(**追加为 `## Result(v2)`**,⛔ 不覆盖 v1 回执)

⛔ **禁区(逐条零 diff)**:`server/**`、`client/**`、`scripts/**`、`package.json`、任何迁移、任何生产码或测试、`docs/agent-ops/INDEX.md`、**本工单 §1–§10 原文**、**v1 档案 `2026-08-30-...-census.md` 原文(原样封存)**、顶部状态行、**`D:/Coinsides/v12.9-selection/**`(证据本体,只读)**。

### 11.2 判据

#### ⭐⭐ K-1(v2)口径冻结于**实现之前**,不止于实跑之前

- **口径文本冻结 + 取 SHA 的时刻,须早于【脚本的第一个字节】。**
- ⚠️ **为什么收紧**:「实跑前冻结」仍允许**边写代码边把口径往好写的方向挪** —— 写码时你已经看见数据结构了。**冻结在实现之前,连这条缝也堵上。**
- 📌 **v1 轮 builder 已自发达标**(草案 `00:09:08` → 冻结 `00:11:51` → 脚本 `00:20:55` 才诞生),记功;**v2 照此办理并留时间戳收据**。
- ⭐ **收据措辞必须精确到口径本身**:写字节数时**必须写明「两枚标记是否计入」**。⚠️ **v1 病例**:v0 收据写「两枚标记**之间**共 9,278 字节」,而 9,278 实为**含标记**;真正「之间」是 9,216。**在一份以字节复算立命的收据里,这是缺陷。**

#### ⭐⭐ K-2(v2)机械配对门 —— 单边即记,**⛔ 不停线**

- 在四分类**之前**新增一道**机械配对门**:
  - **连通分量单边**(一侧成员为空)⇒ 记 **「存在性差异」**,**逐条记录**(哪家单边 / role / canonical page / `R`-`N` 状态 / 字段证据,**c-1c 形态**),**⛔ 不停线、继续普查**;
  - **`P-NULL` 走同一道门**。
- ⭐ **必须申报分类器射程**:档案里要有一句明确的「**四分类的定义域 = 已配对事件**」,并说明**配对门在它上游**。
- ⚠️ **⛔ 按【形态】设计,不按个案**:见 11.0④ —— 46 条同形、四卷 `seq 0` 同形、跨 `visual`/`text`。**你的门必须一次接住这一族,⛔ 不是接住那一条。**

#### ⭐⭐ K-3(v2)**牙齿不拔** —— 已配对但仍不入四类 ⇒ **停线**

- **已成功配对**的事件,若仍不入四分类中的任何一类 ⇒ **如实记「未归类」并【停线】**,⛔ **不硬塞、⛔ 不新造第五把尺**。
- ⭐ **这条一字不动。** 配对门只接走**未配对**的;**已配对的疑难,K-3 的牙齿照咬。**

#### ⭐ K-4(v2)存在域 = **第三域占位**,⛔ 不预判形状

- 普查产出中立 **第三域占位:「存在域」**(与「尺子域 ①②③」「置信域 ④」并列)。
- ⛔ **不判它归尺子域还是置信域** —— **挂 c-3 触发器**。
- 📌 理由(总纲):**没有消费者,我们就是在猜它的形状**。普查的职责是**把它数清楚、给足字段证据**,⛔ **不是替 c-3 预判形状**。

#### K-5(v2)普查纪律(承 §10.6,⛔ 不放宽)

- ⛔ 不产出任何**一致率 / 准确率 / 谁更好**的数字;⛔ 不产出置信度字段;⛔ 不建议任何阈值。
- ⭐ **跨谓词合计必须分谓词申报射程** —— ⚠️ **v1 note**:768 给了分谓词计数与逐卷粒度,但**未给各谓词各自的 page/seq 边界**;**v2 须补齐**。
- ⚠️ **命名卫生**:⛔ 变量/字段**不得叫 `score` / `chosen_score`** 一类打分词(v1 脚本用它命名 tie-break 元组,值虽不含比率,但**与禁打分措辞撞名**)。

#### ⭐ K-6(v2)自查节必须自问**那一问**

- 档案须含「**我自己的测量错误**」一节(承 §10.7)。
- ⭐⭐ **v1 的真空白,v2 必须补上**:它自查了流程与量具错误,却**没有自问** ——
  > **「我冻的规则本身,是不是就是零产出的原因?」**
  ⚠️ **那是那一轮最大的候选测量错误,而自查节整节没碰它。** ⇒ **v2 的自查节必须显式回答这一问**(答「是」或「否」都行,⛔ 不许绕开)。

#### K-7(v2)留痕与射程申报

- ⭐ **凡申报「经过 N 路审计」,须给可复核痕迹**(时间戳 / 署名 / 逐条阻断清单),或**明写痕迹在哪、不在仓内也要说清位置**。
  ⚠️ **v1 病例**:§2.1 申报 v0 经「**两路**」只读审计,复核核出**实为一路**;**结论仍成立,但收据不实**。⛔ **N 路是可核数字,不是修辞。**
- **零成本自证须连【射程】一起报**:「未调模型 / 未用 key / 零花费」的射程是**程序级**,⛔ **不覆盖 builder 会话自身的推理开销** —— 照实写明。
- **证据本体哈希前后一致**;⚠️ v1 note:digest 链在 c-1c(08-29) 与 c-2(08-30) 之间**断了一环**,v2 须**说明接续方式**或如实记为断链。

#### K-8(v2)措辞收紧

- ⛔ **不得使用「第五形态 / 第五类 / 新类别」一类字样描述存在性差异** —— 它**不是分类器里的一类**,是**配对门的产出**。
  ⚠️ **v1 病例**:§6 的「一份可复核的**第五形态**停线记录」**读快了像在宣告新类别**(它没造类,但字面有风险)。

### 11.3 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result(v2)` 段(⛔ 不覆盖 v1 回执);若预算紧张,先写 Result 再做别的。**

须含:**冻结口径原文 + SHA + 冻结时刻**(须早于脚本首字节,给时间戳收据)、**分类器射程申报**、**配对门产出的存在性差异逐条字段证据**、**已配对仍不入四类者的停线记录(若有)**、**四类各自条数 + 存在域条数**、**分谓词射程(含各谓词 page/seq 边界)**、K-6 那一问的显式回答、零成本自证**连同射程**、证据本体前后哈希、以及任何停线点。
⛔ 不许 commit / push,⛔ 不许翻顶部状态行,⛔ 不许改 §1–§10 与 v1 档案原文。⚠️ 署名按**实际来源**(裁定来自 **Fable**,由调度方转写;⛔ 不得写成 Henry)。

---

## 12. ⭐ v3 修订(2026-08-31,调度方按总部裁定入单;⛔ §1–§11 与 v1/v2 档案原文一字不改)

> **裁定源**:总部(Fable)2026-08-31「角色相容性门」+「两遍制」两次裁定,由调度方转写。⛔ **不是 Henry。**
> **前提**:v2 轮已收工并复核(六路,零 blocking);**v1 与 v2 档案原样封存**,分别是**存在维**与**角色维**的发现证据。

### 12.0 ⛔⛔ 先读这六句

> **① 连停两次是【同一个病】:骨架比宪法少维。**
> | 停线 | 缺的维 | 现物 |
> |---|---|---|
> | v1 第 2 事件 | **存在**(有没有) | 一家有对象,另一家那页**根本没有** |
> | v2 第 18 事件 | **是什么**(角色) | 两家都有、同位置、**归一化后逐字相同**,但一家 `heading` 一家 `text` |
> 📌 宪法 **v0.7.4**:「**锚答在哪,角色答是什么**」;**`analysis/2026-08-28-v12-9a-trial-1-transcriber.md:204`** 一个月前已命名「**分类学差异**」并判「**两者都不算错**」。**名字早就有,骨架把它漏了。**
>
> **② ⭐⭐⭐ 两遍制(本轮最重要的结构变更)**:**普查是【点名】,判定是【判刑】。点名必须点完,判刑可以停堂 —— ⛔ 两者不共用一条停线流。**
> | 遍 | 内容 | 停线 |
> |---|---|---|
> | **门遍** | 配对门 + 角色门 | ⛔ **无停线,四卷全量走完** |
> | **分类遍** | 四分类 ①②③④ | ✅ **K-3 牙齿原样,该停就停** |
>
> **③ ⚠️ 为什么必须两遍(v2 的实测教训)**:v2 的配对门虽明令「不停线」,却被塞进**一条「一停即全停」的有序流** ⇒ 只跑出 **138 个单边事件中的 9 个(6.5%)**;点名的「46 条同形」**只出 6 条**;**四卷里三卷收据数为 0**;remaining 里 **129 条从未过门的单边事件**,**那个数字在任何产物里都不存在**。
> ⇒ ⭐ **「不停线」只意味着【它自己不触发停线】,⛔ 不意味着【它不被别人的停线打断】。**
>
> **④ K-3 的牙齿仍不拔**:**分类遍**中,已配对 + 角色相容 + 仍不入四类 ⇒ **照旧记「未归类」并停线**。⛔ 两遍制是**分流**,⛔ 不是**赦免**。
>
> **⑤ ⛔⛔ 普查不判对错(存在维与角色维同样生效)**:「**两者都不算错**」是 12.9a 判词。
> - ⛔ 不预设任何「相容豁免对」;⭐ **门只【记录】,⛔ 不裁良恶**;
> - ⛔ 不写「漏掉 / 遗漏 / 判错」,只写「**仅 X 有**」「**MinerU=heading / Docling=text**」。
>
> **⑥ ⛔ 归域仍挂起**:**存在性差异**与**分类学差异**都是**域占位**,⛔ 不判归尺子域还是置信域 —— **挂 c-3 触发器**。理由(总纲):**没有消费者,我们就是在猜它的形状**。

### 12.1 允许面(⛔ 只这些)

- `docs/agent-ops/analysis/2026-08-31-v12-9c-c2-divergence-census-v3.md`(**本单唯一交付物**)
- 本工单的 `## Result(v3)` 段(**追加**,⛔ 不覆盖 v1/v2 回执)

⛔ **禁区(逐条零 diff)**:`server/**`、`client/**`、`scripts/**`、`package.json`、任何迁移、任何生产码或测试、`docs/agent-ops/INDEX.md`、**本工单 §1–§11 原文**、**v1 与 v2 档案原文(原样封存)**、顶部状态行、**`D:/Coinsides/v12.9-selection/**`(证据本体,只读)**。

### 12.2 判据

#### ⭐⭐ K-1(v3)冻结:实现之前 + 维度覆盖申报 + **配方今天必须跑得通**

- **口径冻结 + 取 SHA 的时刻,须早于【脚本的第一个字节】**;收据须写明「两枚标记**是否计入**」。
- ⭐ **冻结程序须含【维度覆盖申报】,逐维列明去处**:**存在 → 配对门;是什么 → 角色门;长什么样 → ①②③;在哪 → ④**;⭐ 凡自知不覆盖的维度,**显式列「已知不覆盖」**。
- ⚠️⚠️ **⛔ 维度覆盖申报【不得】豁免 K-3** —— **申报的是【射程】,不是【赦免】**。
- ⭐ **可复现性(v2 note,必修)**:档案届时将含**多对**冻结标记 ⇒ **标记须用【唯一名】(如 `FROZEN_CLASSIFIER_V3_*`),或在边界措辞里明写「【第一处】」**。⚠️ **判据:拿档案【今天的字节】按收据里的配方复跑,⛔ 不许 abort、不许取到另一段。**
- ⚠️ **继承量须量化**:若脚本由前一轮复制而来,**须写明继承行数/比例**(v2 实测 79.9% 继承),读者才知道「第一个字节」这条测试覆盖的是**哪一部分**。

#### ⭐⭐⭐ K-2(v3)两遍制

- **门遍**:只跑**配对门 + 角色门**,**四卷全量走完**,⛔ **无停线**(输入/完整性类硬故障除外,且须如实标明是哪一类)。
- **分类遍**:再跑四分类,**K-3 牙齿原样**。
- ⭐ **两遍的边界必须在产物里可见**:门遍产物与分类遍产物**分开申报**,⛔ 不许混成一张表。

#### ⭐⭐⭐ K-3(v3)**分母义务** —— 覆盖率申报行

- 门遍交付物**必须自带覆盖率申报行**:**每域 × 每卷 × 每谓词**的 **`full` / `processed` / `remaining`**。
- ⚠️ **分母不可见 = 普查白跑一半** —— 只报「找到 N 条」而不报「候选集共多少」,读者**无法判断这是普查完成了、还是被掐断了**。
- 📌 **v2 病例**:remaining 里 **129 条从未过门的单边事件**,**那个数字在仓内外任何产物里都不存在**。

#### ⭐⭐ K-4(v3)**跨遍集合闭合**

- 分类遍停线时,**游标须对着【门遍的全量枚举】记账**:**`full = classified + stopped + remaining`** 在两遍架构下**仍须机械可验**。
- ⭐ 每个 `document × predicate × family` 分别验;三部分 seq 集**两两不交且并集等于 full**。

#### ⭐⭐ K-5(v3)角色相容性门与**分类学差异**收据

- 位置:**配对门之后、四分类之前**。判据:两侧 **role signature 不相容** ⇒ 记「**分类学差异**」。
- ⭐ **名称沿用 12.9a,⛔ 不新造词**;档案须**引用定义处** `docs/agent-ops/analysis/2026-08-28-v12-9a-trial-1-transcriber.md:204`。
- 每张收据**必须**含:①双方 **raw role**(逐字);②双方 **canonical role**;③⭐ **有序对** `(MinerU-role × Docling-role)`(**有序,⛔ 不可交换**);④配对证明(**为什么它确实配上了**);⑤承前的 seq / page / `R`-`W`-`N` + SHA / payload / 可选字段 / anchor。
- ⛔ **不得**用「第五形态 / 第六类 / 新类别」字样。

#### ⭐⭐⭐ K-6(v3)**角色对频次矩阵**(⭐ 本单对 c-3 最值钱的产物)

- 产出 **`MinerU-role × Docling-role` 频次矩阵**,**分谓词**(P-TEXT / P-STRUCT / P-NULL)。
- ⛔ **不预设任何「相容豁免对」**;⛔ **不标注哪些对良性、哪些对可疑** —— **门只记录,不裁良恶**。
- ⚠️ **矩阵是计数不是评分** ⇒ ⛔ 不得出现比率、百分比、归一化分数。
- 📌 **规模预期(v2 复核实测,供你对照,⛔ 不是目标值)**:「已配对但 role 不相容」四卷共 **203 例**,其中 202 例落在 v2 停线游标之后。⚠️ **若你数出的量级与此相差悬殊,请在自查节说明为什么**(⛔ 不是要你凑这个数)。

#### K-7(v3)K-3 牙齿不拔(分类遍)

- **已配对 + 角色相容 + 仍不入四类** ⇒ **如实记「未归类」并停线**,⛔ 不硬塞、⛔ 不新造尺子。
- ⭐ 若分类遍**跑完全部事件而未触发**,**如实申报「本轮未触发 K-3」** —— ⛔ 那不是「K-3 没用」,是**它没被触发**。

#### ⭐ K-8(v3)**唯一副本禁令**

- 凡**档案结论所依赖的派生集合**(如 distinct 集),须**入档**,或以「**digest + 可重导配方**」入档。
- ⛔ **不得把唯一副本留在易失介质**(仓外临时目录)。⚠️ **v2 病例**:§5.4 的完整 distinct 集只存在于仓外临时目录 —— **披露了位置,但那是唯一副本**。

#### K-9(v3)普查纪律(承 §10.6 / §11.2,⛔ 不放宽)

- ⛔ 一致率 / 准确率 / 谁更好 / 置信度 / 阈值;
- 跨谓词合计**必须分谓词申报射程**,且给**各谓词各自的 page/seq 边界**;
- ⛔ 变量字段**不得叫 `score` / `chosen_score`** 一类打分词;
- ⛔ **不得使用判对错动词**(漏掉 / 遗漏 / 缺失了本该有的 / 判错);
- ⚠️ **表格自明性(v2 note)**:⛔ 不得在同一张表里混排「分区行」与「非分区的子射程行」——纵向相加会误读;**必须分表或显式标注哪几行构成分区**。

#### ⭐⭐ K-10(v3)自查节**两问**(一问尺子,一问样本)

1. **「我冻的规则本身,是不是就是零产出的原因?」**(承 v2)
2. ⭐ **「把我停住 / 我大量产出的这个形态,是【孤例】还是【一族】?」** —— ⚠️ **手上有数据就至少标出这个问号**,⛔ 不许绕开。
- ⭐ **v3 追加一问**:**「维度覆盖申报里,有没有我【以为覆盖了、实际没覆盖】的维?」**
- ⚠️ **措辞(v2 note)**:回答**不得头一个字与后续让步指向相反** —— 若答「否,但……」,须让**只读头两字的读者也不会得到过于乐观的印象**。

#### K-11(v3)留痕、射程与自证

- 凡申报「经过 N 路审计」**须给可复核痕迹**(时间戳 / 署名 / 逐条阻断清单)或**明写痕迹在哪**(不在仓内也说清位置)—— **N 路是可核数字,不是修辞**;⚠️ **若中途又起了新的审计子任务,收笔前须补列**(v2 漏列了第三个)。
- **零成本自证须连【射程】一起报**(程序级,⛔ 不覆盖 builder 会话自身推理开销)。
- **证据本体哈希前后一致**;digest 链若断须说明接续方式或**如实记断链**。

### 12.3 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result(v3)` 段(⛔ 不覆盖 v1/v2 回执);若预算紧张,先写 Result 再做别的。**

须含:冻结口径原文 + SHA + 冻结时刻(早于脚本首字节)+ **标记唯一性/第一处措辞** + **继承量**、⭐ **维度覆盖申报全文**、**门遍与分类遍分开申报**、⭐ **覆盖率申报行(每域×每卷×每谓词 full/processed/remaining)**、⭐ **跨遍集合闭合自证**、存在性差异与分类学差异**逐条字段证据(后者含有序角色对)**、⭐ **角色对频次矩阵(分谓词)**、四类各自条数、**K-3 是否触发(未触发须如实申报)**、分谓词 page/seq 边界、**K-10 三问的显式回答**、零成本自证连同射程、证据本体前后哈希、**派生集合的入档或 digest+配方**、以及任何停线点。
⛔ 不许 commit / push,⛔ 不许翻顶部状态行,⛔ 不许改 §1–§11 与 v1/v2 档案原文。⚠️ 署名按**实际来源**(裁定来自 **Fable**,由调度方转写;⛔ 不得写成 Henry)。


## Result

> **builder 回执（2026-08-31）**：本单唯一一次实跑触发 `unclassified_stop`，已按 K-3 停线，标记 `needs: claude`。没有修改顶部状态、§1–§9、生产码、测试、迁移或证据本体；没有 commit / push。裁定来源按实际记为 **Fable**（由调度方转写），不是 Henry。

### R1. 交付与控制结果

- 唯一交付物：`docs/agent-ops/analysis/2026-08-30-v12-9c-c2-divergence-census.md`。
- 样本：只读复用 MinerU 3.4.5 与 Docling 2.123.0 的既有 4 卷、8 份 fragments；没有重跑任何转写器。
- 唯一实跑：`2026-08-31T00:36:48.3716001-04:00` 至 `2026-08-31T00:36:48.6422436-04:00`；结果 `unclassified_stop`。
- 停线前完成 1 个内部 `P-TEXT/non_divergence` 事件；首个 `P-STRUCT` 事件未归类并立即停线；其后 768 个候选事件（`P-TEXT=685 / P-STRUCT=63 / P-NULL=20`）没有进入分类。

### R2. 实跑前冻结程序原文与 SHA-256

- v0 曾在没有读取/比较正文时先取 SHA，随后被两路静态审计判定存在会改变首停/计数的自由度；v0 原文和收据保留在交付物中，明确“未执行、作废”。
- 下列 v1 是本轮**唯一实际执行口径**。它于 `2026-08-31T00:11:51.3116115-04:00` 冻结，早于唯一实跑；交付物中从 `FROZEN_CLASSIFIER_V1_START` 起始 `<` 到 `FROZEN_CLASSIFIER_V1_END` 末尾 `>`（两枚标记均计入）共 **15,333 UTF-8 bytes**，SHA-256 `bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be`。实跑后复算仍完全相同。
- 冻结段内原文如下（不含交付物的两枚 HTML marker；正文逐字抄录）：

<!-- RESULT_FROZEN_V1_ORIGINAL_START -->
### 冻结程序 v1 原文

#### A. 输入、校验、证据字段与唯一事件顺序

1. 输入只能是 MinerU=`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/` 与 Docling=`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/` 的直接子文件。两目录中名称以大小写敏感的 `.fragments.json` 结尾者，文件名集都必须**恰好**等于下列四项，不得缺少、增加或大小写漂移，且四对文件名必须逐字一一相同：`ielts-academic-reading-sample-tasks-2023.fragments.json`、`ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json`、`ielts-academic-writing-sample-tasks-2023.fragments.json`、`ielts-listening-sample-tasks-2023.fragments.json`。卷标签与顺序固定为：`academic-reading` → `writing-example-responses` → `academic-writing` → `listening`，依次对应上述四项。目录中的其他后缀文件不入射程。
2. 运行时固定为 CPython `3.14.2`、Unicode database `16.0.0` 及该运行时的 `json/re/html.parser/difflib` 标准库实现。文件按 UTF-8 strict、无 BOM 解码；JSON 解析固定 `parse_int=int,parse_float=float`，拒绝重复 object key、`NaN/Infinity/-Infinity`、尾随内容和任意字符串中的未配对 surrogate `U+D800..U+DFFF`。每份文件必须是 JSON 数组；每条必须**至少**有 `anchor / role / seq / text`。`seq` 必须是 `0 <= seq < 2147483647`、从 0 开始的连续唯一 Python int（bool 不算 int）；`role` 必须是字符串且大小写逐字判定；`text` 只能是字符串或 null；`anchor.page` 必须是 Python int（bool 不算），MinerU 必须 `page>=0`、Docling 必须 `page>=1`；`anchor.bbox` 必须是 4 个 Python int/float（bool 不算）且转成 binary64 float 后有限。MinerU 还必须逐条有 2 个正的有限数值 `page_size`，Docling 还必须逐条有 2 个有限数值 `charspan`。任一不成立即输入停线，不生成事件、不开始分类。
3. 每条证据逐字保留 `type / image_path / html` 三个可选字段的 `field_present` 与实际 JSON value；不存在则记 `field_present=false,value=null`，不查 `middle.json`、图片、原 PDF、其他中间件或生产码来补值。全程禁止凭肉眼看图断言。其他额外字段只登记键名，不参与判定。
4. 三条互斥谓词为 `P-TEXT / P-STRUCT / P-NULL`；每个 fragment 必须且只能命中一条。先机械建立全部候选事件，但分类严格按唯一 sort key 前进：`(卷序号,event_page,min_any_seq,mineru_absent,min_mineru_seq_or_0,docling_absent,min_docling_seq_or_0,predicate_rank,member_key)`。`event_page` 是事件两家全部 canonical page 的最小值，`min_any_seq` 是两家全部 seq 的最小值；有 MinerU/Docling 成员时对应 absent 位为 0 且取最小 seq，无对应成员时 absent 位为 1 且 seq 位写 0；`predicate_rank` 固定 `P-STRUCT=0,P-NULL=1,P-TEXT=2`；`member_key` 是事件成员按 `(family_rank,seq)` 排序后的完整 tuple，`family_rank: MinerU=0,Docling=1`。上述 tuple 按 Python tuple lexicographic order 排序且对不同事件唯一。第一条“未归类”出现即停，不分类或计数后续事件。

#### B. 固定字段投影

1. role 映射只有：MinerU `title→heading`、`text→text`、`list→list`、`index→index`、`image|chart→visual`、`table→table`；Docling `section_header→heading`、`text|footnote→text`、`list_item|checkbox_unselected→list`、`document_index→index`、`picture→visual`、`table→table`。表外 role 不猜，输入停线。原始 role 始终保留；映射后的同义词本身不算分歧。
2. 文本投影固定为：`R`=原始 `text`。HTML regex 固定为 `(?is)</?(?P<tag>table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|div|span|ul|ol|li|br|img|figure|figcaption|h[1-6])(?:\s[^<>]*?)?/?>`。若 `R=null`，直接规定 `HAS_HTML=false,TAGS=[],MARKUP=[],W=null,N=''`，不调用 regex、HTMLParser 或 `re.sub`。否则令 `matches=list(regex.finditer(R))`，`HAS_HTML=bool(matches)`，`TAGS=[match.group('tag').lower() for match in matches]`，`MARKUP=[match.group(0) for match in matches]`。若 `HAS_HTML=true`，新建 `HTMLParser(convert_charrefs=True)` 子类实例，以 `handle_data` 回调顺序 append data，依次调用 `feed(R)` 与 `close()`，再以单个空格连接 data；否则直接取 R。随后执行 `re.sub(r'\s+', ' ', value, flags=re.UNICODE).strip()` 得 W。HTMLParser 的 `feed/close` 任一异常均为输入停线。`N` 严格依次执行：对非 null W 做 `unicodedata.normalize('NFKC',W)`；对结果 `.casefold()`；删除 U+00AD；最后从左到右删除 Unicode category 以 `P` 或 `Z` 开头或 `str.isspace()==true` 的每个 code point。N 是精确字符串，不用编辑距离或相似度。
3. `payload_kind` 固定为 `null | html | asset_token | plain`：R=null ⇒ null；HAS_HTML=true ⇒ html；canonical role=visual 且 `R.strip()` 完整命中 `(?i)(?:[0-9a-f]{32,64}|(?:[^/\\\s]+[/\\])*[^/\\\s]+\.(?:png|jpe?g|gif|webp|bmp|tiff?))` ⇒ asset_token；其余字符串 ⇒ plain。`shape_signature=(payload_kind,MARKUP)`。
4. 页号统一为 MinerU `canonical_page=anchor.page+1`、Docling `canonical_page=anchor.page`，结果必须是正整数。所有几何数值先转 CPython binary64 float；数值相等、distinct、加减、比较和交集均使用 Python float 的 exact 运算，无取整、epsilon 或容差。每个 canonical page 上 MinerU 全部 `page_size` 的 distinct `(page_width,page_height)` 集必须恰有一个元素。MinerU bbox 固定按 TOPLEFT `[x0,y0,x1,y1]`；Docling bbox 固定按 BOTTOMLEFT `[left,top,right,bottom]`，用该页唯一 page_height 转 TOPLEFT `[left,page_height-top,right,page_height-bottom]`。两家 canonical bbox 都必须无容差满足 `0<=x0<x1<=page_width` 与 `0<=y0<y1<=page_height`；不试其他方位。缺该页 `(page_width,page_height)`、distinct 集不唯一、越界、退化框或非有限值均输入停线。
5. 两组 anchor 是“同一落点”，当且仅当 canonical page 集合相同，且两边每个 bbox 都在同页与对方至少一个 bbox 有正面积交集；仅边缘相接不算。数值不同但满足覆盖只算轮廓差，不另造类别。`overlap_graph` 必须逐边输出。

#### C. 三条配对谓词及消费/去重

1. `P-TEXT` 射程：canonical role 不在 `{visual,table}` 且 N 非空。按 seq 建序列，以 `(canonical_role,N)` 交给 CPython 3.14.2 的 `difflib.SequenceMatcher(autojunk=False)`。按 `get_opcodes()` 返回顺序处理；每个 equal block **逐位置发出一个 1:1 事件**。每个非 equal opcode 从左向右：若两边均非空，只枚举各自**当前 opcode 内**从当前游标起的非空连续前缀，找 `concat(N)` 完全相同者；以 `(两边条数和,条数差绝对值,MinerU 条数,Docling 条数,MinerU 起始 seq,Docling 起始 seq,MinerU 结束 seq,Docling 结束 seq)` 的 Python lexicographic 最小者成组并前进。当前游标无候选，或 opcode 仅一边有条目，即发一个含该 opcode 两边全部剩余条目的“未归类”事件并消费剩余条目。不得跨 opcode 凑组。
2. P-TEXT 的 SequenceMatcher 只给**候选**。同 key 的跨家 bbox 图只在 `canonical_page` 相同且 bbox 正面积交集时连边。若候选所含任一 `(canonical_role,N)` 在任一家庭全卷出现多于一次，则对每个重复 key，以两家本卷 P-TEXT 射程中该 key 的**全部 occurrence**为左右节点；按 `(family_rank,seq)` 排序建图。图中每个 occurrence 都必须 degree=1；当前事件中的每个 occurrence，其唯一邻点还必须属于当前事件对侧成员，否则该事件“未归类”。重复文本绝不因出现序号或保序位置获得内容身份。对于任意 `concat(N)` 分组，另行枚举两家**整卷 P-TEXT 序列（不是当前 opcode）**中所有能产生该 concat 的非空连续区间：若两家各恰有一个区间且就是当前候选，直接通过内容唯一性守门，不要求落点；若任一家庭有多个区间，则枚举全部跨家区间对，仅当满足 B5“同一落点”的跨家区间对**恰好一对且就是当前候选**时通过，否则“未归类”。
3. `P-STRUCT` 射程：canonical role 在 `{table,visual}`。顶点恰为本谓词尚未消费的节点。先按同卷/同 canonical role/同 canonical page，以 bbox 正面积交集建二分图。每组顶点及邻接表按 `(family_rank,seq)` 排序，连通分量按其最小 `(family_rank,seq)` 排序。连通分量两侧都有节点时：若 1:n 或 n:1，整体成组；若 1:1，成组；若 m:n 且 m>1,n>1，则只有当每个节点 degree=1 且 m=n 时按 MinerU seq 升序拆成其唯一边对应的 1:1 组，否则发一个包含完整分量的“未归类”事件。所有进入这些双边分量的节点立即 consumed。
4. P-STRUCT 对尚未 consumed 的单边节点，只在同 canonical role 下，以 R 非 null 且逐字相同建立候选；仅当该 R 在两家全部未消费同 role 节点中各出现恰好一次时，建立一对“落点候选”并同时 consume 两节点。扫描顺序固定为 `(canonical_role,min canonical_page,min seq,family_rank)`，其中 `family_rank: MinerU=0,Docling=1`；consume 后不得复用。其余单边节点各自发“未归类”事件。这样同一错位对只输出一次。
5. `P-NULL` 射程：canonical role 不在 `{visual,table}` 且 R=null 或 N 为空。顶点恰为本谓词尚未消费的节点。仅在同卷、同 canonical role、同 canonical page 且 bbox 有正面积交集时连边；仅边缘相接不连边。顶点、邻接表、连通分量排序与 C3 相同。1:n/n:1 整体成组，1:1 成组，m:n 且 m>1,n>1 时仅 degree=1 且 m=n 才按 MinerU seq 升序拆成唯一边对应的 1:1，否则发一个包含完整分量的“未归类”事件。单边分量各自按 `(family_rank,seq)` 发“未归类”事件。节点消费一次且不与其他谓词重计。

#### D. 四分类的机械布尔式与可复核字段

1. 事件的 `role_signature` 定义为各家按 seq 排列的 canonical role 序列做相邻去重后的 tuple；`role_compatible` 当且仅当两家 `role_signature` 完全相同。所有四类与内部非分歧判定都必须先满足 `role_compatible=true`，否则“未归类”。`same_place` 严格等于 B5。`has_split` 对 P-TEXT 定义为两家逐片 N 的 Python `len()`（Unicode code point 数）所生成的“排除最终总长的累计边界 tuple”不同；对 P-STRUCT/P-NULL 定义为两家成员数不同。`no_split` 当且仅当 `has_split=false`。
2. **文本外形差异**：事件满足 `same_place=true,no_split=true,role_compatible=true`，并满足以下唯一 `appearance_trigger`：P-TEXT 下两家 `shape_signature` 序列不同且至少一侧 HAS_HTML=true；P-STRUCT/table 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{html,null}；P-STRUCT/visual 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{asset_token,null}；P-NULL 下 `shape_signature` 序列不同且（至少一侧 HAS_HTML=true 或至少一侧 payload_kind=null）。触发只说明 payload 外形，不说明图片语义。逐条列路径、seq、原始/canonical role、R 的类型/Unicode code point 长度/UTF-8 字节长度/SHA-256/转义摘录、payload_kind/HAS_HTML/TAGS/MARKUP/W/N、三个可选字段的 presence+value、原始/canonical anchor 与 overlap_graph。
3. **归一化差异**：事件满足同一落点、无切分、role_signature 相容、不触发 appearance_trigger；两家逐片 N 序列完全相同、R 序列不同。逐条列 D2 全部字段，并列 R→W→N 的首个相等阶段；若 W 已相等记“HTML data 投影和/或空白折叠后相等”，否则 N 相等记“NFKC/casefold/标点或分隔符删除后相等”。
4. **切分差异**：事件满足 `same_place=true,role_compatible=true,has_split=true`；P-TEXT 还必须两边 concat(N) 相同，P-STRUCT/P-NULL 必须来自双边连通分量。逐条列谓词、全部 seq/roles、逐条 R 摘要、两边条数、累计边界、全部 anchors/overlap_graph、三个可选字段 presence+value。seq 数值不同本身不触发。
5. **真实指错**：事件满足 `role_compatible=true`，且 `pointer_identity=true,same_place=false`。`pointer_identity` 仅在以下两种情形为真：P-TEXT 事件两边 `concat(N)` 完全相同且非空，并通过 C2 的单片/连续区间唯一性守门；或 P-STRUCT 已由 C4 的全卷双方唯一且逐字相同非 null R 建立落点候选。逐条列内容同一性证明、两家 seq/role/R/W/N、原始/canonical anchors、MinerU page_size、Docling charspan、overlap_graph、三个可选字段 presence+value。无唯一内容证明不得判本类。

#### E. 单标签优先级、非分歧与第五形态

1. 每个候选事件依次执行：配对/唯一性失败 ⇒ “未归类”；`role_compatible=false` ⇒ “未归类”；`pointer_identity=true,same_place=false` ⇒ **真实指错**；`same_place=true,has_split=true` 且满足 D4 的谓词附加条件 ⇒ **切分差异**；`same_place=true,no_split=true,appearance_trigger=true` ⇒ **文本外形差异**；满足 D3 全部布尔式 ⇒ **归一化差异**；`same_place=true,role_compatible=true,no_split=true` 且两家 R 序列和 shape_signature 序列完全相同 ⇒ 内部 disposition `non_divergence`，不输出、不计数；其余 ⇒ “未归类”。
2. 以下是明确的“未归类”触发器：单边新增/缺失且无 C4 唯一逐字对手；固定 N 后内容仍不同；role_signature 不相容；结构多对多不唯一；重复文本未过 C2；同一事件需要四类之外的语义。第一条出现即停，禁止硬塞。A2/B1/B4 的全量预检失败不生成事件，四类计数均未开始，并单独记 `input_stop` 与 `needs: claude`。
3. 未归类停线记录必须含卷/谓词/sort key、两家相关 seq/role、R 类型/长度/SHA/转义摘录、payload/可选字段实际值、原始/canonical anchors、配对候选与排除过程、停止时已完成的四类分谓词计数、最后完成事件及尚未进入的卷/事件。停线后不换规则重跑。

#### F. 输出、计数与零成本

1. 每条分歧固定输出 `divergence_id / document / predicate / mineru_evidence / docling_evidence / classification / decision_trace`；classification 只能是四个既定名称。停线条目另输出 `unclassified_stop`，它是控制结果，不是第五类。内部 `non_divergence` 不输出。
2. 计数单位固定为“完成分类的事件数”，不是 fragment/node 数。四类按 `P-TEXT/P-STRUCT/P-NULL` 分栏，附各谓词实际完成到的卷/page/seq；跨谓词合计必须与三栏同表申报。不输出比例、优劣或门槛建议，不输出任何置信度字段。
3. 报告固定自证 `model_calls=0,api_keys_used=0,cost=0`。结果 JSON 固定用 `json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)` 生成，UTF-8 strict 编码后追加**恰好一个 LF**；文件 SHA-256 覆盖这全部字节。脚本、JSON、最终冻结段分别取 SHA-256；实跑后冻结段任一字节变化即本轮无效并停线。
<!-- RESULT_FROZEN_V1_ORIGINAL_END -->

### R3. 四类各自条数（只到停线点）

| 固定类别 | `P-TEXT` | `P-STRUCT` | `P-NULL` | 跨谓词合计 |
|---|---:|---:|---:|---:|
| 文本外形差异 | 0 | 0 | 0 | 0 |
| 归一化差异 | 0 | 0 | 0 | 0 |
| 切分差异 | 0 | 0 | 0 | 0 |
| 真实指错 | 0 | 0 | 0 | 0 |

计数单位是已完成分类的事件。四个 0 只覆盖首个未归类之前的射程，绝不表示四卷没有这些分歧；`unclassified_stop` 不是第五类。

### R4. 逐条分类与字段证据

- **已分类分歧：无。** 因而没有可合法输出的 `classification` 行。
- 停线前最后完成游标：`academic-reading / P-TEXT / MinerU seq 0 / Docling seq 1 / canonical page 1`，内部 disposition=`non_divergence`，不入上述计数。

### R5. 未归类条目与停线记录

唯一停线条目 `U-STOP-000001`：

| 字段 | 产物证据 |
|---|---|
| 卷 / 谓词 / sort key | `academic-reading` / `P-STRUCT` / `[0,1,0,1,0,0,0,0,[[1,0]]]` |
| MinerU 侧 | 成员空；没有配对 fragment |
| Docling 路径 / seq | `D:/Coinsides/v12.9-selection/tools/_out/c1-docling/ielts-academic-reading-sample-tasks-2023.fragments.json` / `0` |
| role | 原始 `picture`；canonical `visual` |
| 文本投影 | `R=null`、`W=null`、`N=""`；N SHA-256=`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| payload / HTML | `payload_kind=null`、`HAS_HTML=false`、`TAGS=[]`、`MARKUP=[]`、`shape_signature=["null",[]]` |
| 可选字段 | `type` / `image_path` / `html` 均 `field_present=false,value=null` |
| 原始 anchor | `page=1`；bbox=`[55.96143474527654,806.2902106785717,175.23270302996542,772.2433703091365]`；`charspan=[0,0]` |
| canonical anchor | `page=1`；TOPLEFT bbox=`[55.96143474527654,34.709789321428275,175.23270302996542,68.75662969086352]` |
| overlap | MinerU page 集 `[]` / Docling `[1]`；edges=`[]`；`same_place=false` |
| 控制 | `needs: claude` |

判定过程：该条 `picture→visual` 只进入 `P-STRUCT`；同 role/page 图中没有 MinerU 节点；C4 又禁止用 null R 建立错位候选，所以 `pairing_ok=false`。E1 第一守门直接要求“未归类”；0:1 条数、role 不相容、无落点与无 pointer identity 不能越过守门把它硬塞成切分、外形或真实指错。程序立即停线，没有看图、没有修改规则重跑。

### R6. 零成本、产物与证据本体收尾

- 未调用任何模型；未使用任何 API key；未产生任何花费。实验 JSON 自证 `model_calls=0,api_keys_used=0,cost=0`。
- 仓外脚本：72,999 bytes，SHA-256 `072e5f7280aa53f18d7be9fc2cf3d8050c8b06e26a85ca9d06e7730857375269`；交付物已逐字归档同一源码。
- 仓外 canonical JSON：119,456 bytes，SHA-256 `afdc9479311f5419f3a563073d8fc06bd12c49aab58cfd748e61283800c73045`。
- 证据本体开工：94,935 文件 / 3,149,405,801 bytes / 14,624,025 manifest bytes / tree SHA-256 `efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`。
- 证据本体收尾：94,935 文件 / 3,149,405,801 bytes / 14,624,025 manifest bytes / tree SHA-256 `efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`；与开工逐项相同。

### R7. 测量错误、边界与停线点

- 自查发现并在实跑前修正：v0 规则自由度、把卷标签误作 basename、脚本从错误层级取 `page_size/charspan`、故障回执错误、缺同表跨谓词合计。详细过程保存在交付物“我自己的测量错误”一节；没有掩盖或删除 v0。
- 旧 c-1c 树 digest 在相同 count/bytes 下无法按其明文配方复现；本单没有猜旧实现，而以本单开工/收尾同一明确配方闭合。
- 外层命令适配器把非 complete 控制退出显示为 exit 1，stdout 与 canonical JSON 都一致为 `unclassified_stop`；没有为追外层码进行第二次执行。
- 结论只到冻结顺序中的第 2 个事件；不外推到后续 768 个事件、其他文档/版本、图片语义、生产能力或两家优劣。没有任何置信度字段、比例、准确率、阈值建议或持久化设计。
- 实质停线点：单边 null visual 不入冻结四类，已标 `needs: claude`；后续由上游决定是否另立规则/工单，本 builder 没有猜。

### R8. 允许面与禁区

- 本轮只新增/修改允许的分析交付物与本 `## Result` 段。
- `D:/Coinsides/v12.9-selection/**` 前后树哈希相同；没有写证据本体。
- 最终 `git status --short` 只有：本工单 `M`、唯一分析交付物 `??`，以及开工前既有的 `server/src/routes/projections.ts M`。该 server 文件 SHA-256 仍为开工值 `c9072a7a3bfcbcfc20e48efa3050c0baea806b5ac89594b29e5249fe1ce08ed7`，`git diff -- server/**` 为空；本单未触碰或回退它。
- 禁区 `server/**`（除上述既有状态且内容未变）、`client/**`、`scripts/**`、`package.json`、`docs/agent-ops/INDEX.md` 的最终 tracked textual diff 均为空。本工单原文件前 11,945 bytes 与开工文件逐字相同，SHA-256 仍为 `30662523c8db0630405df73296ac89f97fcac0120865153bd3fe895e5b0b0279`；因此顶部与 §1–§10 原文均未改，只在其后追加本 Result。
- 未 commit、未 push、未翻本工单顶部状态行。

**builder 结论**：按 Fable 的第五形态条款，c-2 在首个单边 null visual 处正确停线；报告与回执已完成，控制状态为 `needs: claude`。


## Result(v2)

> **builder v2 最终结论（2026-08-31）**：唯一实跑在第 18 个有序事件触发 `unclassified_stop`。该事件已成功配对，但 role signature 不相容，故严格按 K-3 记“未归类”并停线，`needs: claude`；没有硬塞、改尺或重跑。停线前产出 9 张存在域收据与 3 条归一化差异。裁定来源为 **Fable**，由 Claude 工程调度会话转写，不写成 Henry。

### R-v2.1 冻结口径原文与先后收据

以下是本轮实际执行的冻结口径原文；四分类的定义域 = 已配对事件，机械配对门位于它上游。

<!-- FROZEN_CLASSIFIER_V2_START -->
### 冻结程序 v2 原文

#### A. 输入、校验、证据字段与唯一事件顺序

1. 输入只能是 MinerU=`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/` 与 Docling=`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/` 的直接子文件。两目录中名称以大小写敏感的 `.fragments.json` 结尾者，文件名集都必须**恰好**等于下列四项，不得减少、增加或大小写漂移，且四对文件名必须逐字一一相同：`ielts-academic-reading-sample-tasks-2023.fragments.json`、`ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json`、`ielts-academic-writing-sample-tasks-2023.fragments.json`、`ielts-listening-sample-tasks-2023.fragments.json`。卷标签与顺序固定为：`academic-reading` → `writing-example-responses` → `academic-writing` → `listening`，依次对应上述四项。目录中的其他后缀文件不入射程。
2. 运行时固定为 CPython `3.14.2`、Unicode database `16.0.0` 及该运行时的 `json/re/html.parser/difflib` 标准库实现。文件按 UTF-8 strict、无 BOM 解码；JSON 解析固定 `parse_int=int,parse_float=float`，拒绝重复 object key、`NaN/Infinity/-Infinity`、尾随内容和任意字符串中的未配对 surrogate `U+D800..U+DFFF`。每份文件必须是 JSON 数组；每条必须**至少**有 `anchor / role / seq / text`。`seq` 必须是 `0 <= seq < 2147483647`、从 0 开始的连续唯一 Python int（bool 不算 int）；`role` 必须是字符串且大小写逐字判定；`text` 只能是字符串或 null；`anchor.page` 必须是 Python int（bool 不算），MinerU 必须 `page>=0`、Docling 必须 `page>=1`；`anchor.bbox` 必须是 4 个 Python int/float（bool 不算）且转成 binary64 float 后有限。MinerU 还必须逐条有 2 个正的有限数值 `page_size`，Docling 还必须逐条有 2 个有限数值 `charspan`。任一不成立即输入停线，不生成事件、不开始配对门或分类。
3. 每条证据逐字保留 `type / image_path / html` 三个可选字段的 `field_present` 与实际 JSON value；不存在则记 `field_present=false,value=null`，不查 `middle.json`、图片、原 PDF、其他中间件或生产码来补值。全程禁止凭肉眼看图断言。其他额外字段只登记键名，不参与判定。
4. 三条互斥谓词为 `P-TEXT / P-STRUCT / P-NULL`；每个 fragment 必须且只能命中一条。先机械建立全部候选事件，再严格按唯一 sort key 前进：`(卷序号,event_page,min_any_seq,mineru_empty_rank,min_mineru_seq_or_0,docling_empty_rank,min_docling_seq_or_0,predicate_rank,member_key)`。`event_page` 是事件两家全部 canonical page 的最小值，`min_any_seq` 是两家全部 seq 的最小值；有 MinerU/Docling 成员时对应 empty rank 为 0 且取最小 seq，对应侧成员为空时 empty rank 为 1 且 seq 位写 0；`predicate_rank` 固定 `P-STRUCT=0,P-NULL=1,P-TEXT=2`；`member_key` 是事件成员按 `(family_rank,seq)` 排序后的完整 tuple，`family_rank: MinerU=0,Docling=1`。上述 tuple 按 Python tuple lexicographic order 排序且对不同事件唯一。第一条 `pairing_stop / unclassified_stop / input_stop / integrity_stop / runtime_stop` 出现即停，不处理其后事件；存在域事件不触发停止。

#### B. 固定字段投影

1. role 映射只有：MinerU `title→heading`、`text→text`、`list→list`、`index→index`、`image|chart→visual`、`table→table`；Docling `section_header→heading`、`text|footnote→text`、`list_item|checkbox_unselected→list`、`document_index→index`、`picture→visual`、`table→table`。表外 role 不猜，输入停线。原始 role 始终保留；映射后的同义词本身不算分歧。
2. 文本投影固定为：`R`=原始 `text`。HTML regex 固定为 `(?is)</?(?P<tag>table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|div|span|ul|ol|li|br|img|figure|figcaption|h[1-6])(?:\s[^<>]*?)?/?>`。若 `R=null`，直接规定 `HAS_HTML=false,TAGS=[],MARKUP=[],W=null,N=''`，不调用 regex、HTMLParser 或 `re.sub`。否则令 `matches=list(regex.finditer(R))`，`HAS_HTML=bool(matches)`，`TAGS=[match.group('tag').lower() for match in matches]`，`MARKUP=[match.group(0) for match in matches]`。若 `HAS_HTML=true`，新建 `HTMLParser(convert_charrefs=True)` 子类实例，以 `handle_data` 回调顺序 append data，依次调用 `feed(R)` 与 `close()`，再以单个空格连接 data；否则直接取 R。随后执行 `re.sub(r'\s+', ' ', value, flags=re.UNICODE).strip()` 得 W。HTMLParser 的 `feed/close` 任一异常均为输入停线。`N` 严格依次执行：对非 null W 做 `unicodedata.normalize('NFKC',W)`；对结果 `.casefold()`；删除 U+00AD；最后从左到右删除 Unicode category 以 `P` 或 `Z` 开头或 `str.isspace()==true` 的每个 code point。N 是精确字符串，不用编辑距离或相似度。
3. `payload_kind` 固定为 `null | html | asset_token | plain`：R=null ⇒ null；HAS_HTML=true ⇒ html；canonical role=visual 且 `R.strip()` 完整命中 `(?i)(?:[0-9a-f]{32,64}|(?:[^/\\\s]+[/\\])*[^/\\\s]+\.(?:png|jpe?g|gif|webp|bmp|tiff?))` ⇒ asset_token；其余字符串 ⇒ plain。`shape_signature=(payload_kind,MARKUP)`。
4. 页号统一为 MinerU `canonical_page=anchor.page+1`、Docling `canonical_page=anchor.page`，结果必须是正整数。所有几何数值先转 CPython binary64 float；数值相等、distinct、加减、比较和交集均使用 Python float 的 exact 运算，无取整、epsilon 或容差。每个 canonical page 上 MinerU 全部 `page_size` 的 distinct `(page_width,page_height)` 集必须恰有一个元素。MinerU bbox 固定按 TOPLEFT `[x0,y0,x1,y1]`；Docling bbox 固定按 BOTTOMLEFT `[left,top,right,bottom]`，用该页唯一 page_height 转 TOPLEFT `[left,page_height-top,right,page_height-bottom]`。两家 canonical bbox 都必须无容差满足 `0<=x0<x1<=page_width` 与 `0<=y0<y1<=page_height`；不试其他方位。缺该页 `(page_width,page_height)`、distinct 集不唯一、越界、退化框或非有限值均输入停线。
5. 两组 anchor 是“同一落点”，当且仅当 canonical page 集合相同，且两边每个 bbox 都在同页与对方至少一个 bbox 有正面积交集；仅边缘相接不算。数值不同但满足覆盖只算轮廓差，不另造分类。`overlap_graph` 必须逐边输出。

#### C. 三条配对谓词、消费与单边事件成形

1. `P-TEXT` 射程：canonical role 不在 `{visual,table}` 且 N 非空。按 seq 建序列，以 `(canonical_role,N)` 交给 CPython 3.14.2 的 `difflib.SequenceMatcher(autojunk=False)`。按 `get_opcodes()` 返回顺序处理；每个 equal block **逐位置发出一个 1:1 事件**。每个非 equal opcode 从左向右：若两边均非空，只枚举各自**当前 opcode 内**从当前游标起的非空连续前缀，找 `concat(N)` 完全相同者；以 `(两边条数和,条数差绝对值,MinerU 条数,Docling 条数,MinerU 起始 seq,Docling 起始 seq,MinerU 结束 seq,Docling 结束 seq)` 的 Python lexicographic 最小 tuple 成组并前进，该 tuple 在程序与输出中只命名为 `candidate_sort_key / selected_sort_key`。当前游标无候选且两侧仍均非空时，发一个含当前 opcode 两边全部剩余条目的**双边配对未决事件**并消费剩余条目。opcode 起始即只有一侧有条目，或前缀消费后只剩一侧时，把该侧每个剩余 fragment **逐 fragment 发成单边事件**；不得把多个 fragment 合成一张存在域收据。不得跨 opcode 凑组。
2. P-TEXT 的 SequenceMatcher 只给**候选**。同 key 的跨家 bbox 图只在 `canonical_page` 相同且 bbox 正面积交集时连边。若候选所含任一 `(canonical_role,N)` 在任一家庭全卷出现多于一次，则对每个重复 key，以两家本卷 P-TEXT 射程中该 key 的**全部 occurrence**为左右节点；按 `(family_rank,seq)` 排序建图。图中每个 occurrence 都必须 degree=1；当前事件中的每个 occurrence，其唯一邻点还必须属于当前事件对侧成员，否则该双边事件配对未决。重复文本绝不因出现序号或保序位置获得内容身份。对于任意 `concat(N)` 分组，另行枚举两家**整卷 P-TEXT 序列（不是当前 opcode）**中所有能产生该 concat 的非空连续区间：若两家各恰有一个区间且就是当前候选，直接通过内容唯一性守门，不要求落点；若任一家庭有多个区间，则枚举全部跨家区间对，仅当满足 B5“同一落点”的跨家区间对**恰好一对且就是当前候选**时通过，否则该双边事件配对未决。
3. `P-STRUCT` 射程：canonical role 在 `{table,visual}`。顶点恰为本谓词尚未消费的节点。先按同卷/同 canonical role/同 canonical page，以 bbox 正面积交集建二分图。每组顶点及邻接表按 `(family_rank,seq)` 排序，连通分量按其最小 `(family_rank,seq)` 排序。连通分量两侧都有节点时：若 1:n 或 n:1，整体成组；若 1:1，成组；若 m:n 且 m>1,n>1，则只有当每个节点 degree=1 且 m=n 时按 MinerU seq 升序拆成其唯一边对应的 1:1 组，否则发一个包含完整分量的双边配对未决事件。所有进入这些双边分量的节点立即 consumed。
4. P-STRUCT 对尚未 consumed 的单边节点，只在同 canonical role 下，以 R 非 null 且逐字相同建立候选；仅当该 R 在两家全部未消费同 role 节点中各出现恰好一次时，建立一对“落点候选”并同时 consume 两节点。扫描顺序固定为 `(canonical_role,min canonical page,min seq,family_rank)`，其中 `family_rank: MinerU=0,Docling=1`；consume 后不得复用。其余单边节点各自逐 fragment 发单边事件。这样既保留合法的跨落点配对供“真实指错”判断，也让 C4 后仍未消费的单边节点进入同一机械门。
5. `P-NULL` 射程：canonical role 不在 `{visual,table}` 且 R=null 或 N 为空。顶点恰为本谓词尚未消费的节点。仅在同卷、同 canonical role、同 canonical page 且 bbox 有正面积交集时连边；仅边缘相接不连边。顶点、邻接表、连通分量排序与 C3 相同。1:n/n:1 整体成组，1:1 成组，m:n 且 m>1,n>1 时仅 degree=1 且 m=n 才按 MinerU seq 升序拆成唯一边对应的 1:1，否则发一个包含完整分量的双边配对未决事件。单边分量中的节点各自按 `(family_rank,seq)` 逐 fragment 发单边事件。节点消费一次且不与其他谓词重计。

#### D. 四分类的机械布尔式与可复核字段

1. 事件的 `role_signature` 定义为各家按 seq 排列的 canonical role 序列做相邻去重后的 tuple；`role_compatible` 当且仅当两家 `role_signature` 完全相同。所有四类与内部非分歧判定都必须先满足 `role_compatible=true`，否则“未归类”。`same_place` 严格等于 B5。`has_split` 对 P-TEXT 定义为两家逐片 N 的 Python `len()`（Unicode code point 数）所生成的“排除最终总长的累计边界 tuple”不同；对 P-STRUCT/P-NULL 定义为两家成员数不同。`no_split` 当且仅当 `has_split=false`。
2. **文本外形差异**：事件满足 `same_place=true,no_split=true,role_compatible=true`，并满足以下唯一 `appearance_trigger`：P-TEXT 下两家 `shape_signature` 序列不同且至少一侧 HAS_HTML=true；P-STRUCT/table 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{html,null}；P-STRUCT/visual 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{asset_token,null}；P-NULL 下 `shape_signature` 序列不同且（至少一侧 HAS_HTML=true 或至少一侧 payload_kind=null）。触发只说明 payload 外形，不说明图片语义。逐条列路径、seq、原始/canonical role、R 的类型/Unicode code point 长度/UTF-8 字节长度/SHA-256/转义摘录、payload_kind/HAS_HTML/TAGS/MARKUP/W/N、三个可选字段的 presence+value、原始/canonical anchor 与 overlap_graph。
3. **归一化差异**：事件满足同一落点、无切分、role_signature 相容、不触发 appearance_trigger；两家逐片 N 序列完全相同、R 序列不同。逐条列 D2 全部字段，并列 R→W→N 的首个相等阶段；若 W 已相等记“HTML data 投影和/或空白折叠后相等”，否则 N 相等记“NFKC/casefold/标点或分隔符删除后相等”。
4. **切分差异**：事件满足 `same_place=true,role_compatible=true,has_split=true`；P-TEXT 还必须两边 concat(N) 相同，P-STRUCT/P-NULL 必须来自双边连通分量。逐条列谓词、全部 seq/roles、逐条 R 摘要、两边条数、累计边界、全部 anchors/overlap_graph、三个可选字段 presence+value。seq 数值不同本身不触发。
5. **真实指错**：事件满足 `role_compatible=true`，且 `pointer_identity=true,same_place=false`。`pointer_identity` 仅在以下两种情形为真：P-TEXT 事件两边 `concat(N)` 完全相同且非空，并通过 C2 的单片/连续区间唯一性守门；或 P-STRUCT 已由 C4 的全卷双方唯一且逐字相同非 null R 建立落点候选。逐条列内容同一性证明、两家 seq/role/R/W/N、原始/canonical anchors、MinerU page_size、Docling charspan、overlap_graph、三个可选字段 presence+value。无唯一内容证明不得判本类。

#### E. 上游机械配对门、分类顺序与停线

1. 每个有序事件先进入配对门。若 `bool(mineru) XOR bool(docling)` 为真，程序必须再断言该事件总成员数恰为 1；随后逐 fragment 输出一条存在域收据，方向只能是 `仅 MinerU 有` 或 `仅 Docling 有`，更新配对门进度并继续下一事件。收据必须列 `existence_id / domain / pairing_gate_disposition / direction / document / predicate / source / sort_key / member_evidence / opposite_side_member_count / decision_trace`；其中 `domain="存在域"`、`pairing_gate_disposition="存在性差异"`，不得写 `classification` 字段。
2. 若两侧成员都为空，记 `integrity_stop`。若两侧都有成员但 `pairing_ok=false`，记 `pairing_stop` 并标 `needs: claude`；它既不进入存在域，也不进入四分类。只有两侧都有成员且 `pairing_ok=true` 的事件才是已配对事件并进入 D。
3. 已配对事件依次执行：`role_compatible=false` ⇒ “未归类”；`pointer_identity=true,same_place=false` ⇒ **真实指错**；`same_place=true,has_split=true` 且满足 D4 的谓词附加条件 ⇒ **切分差异**；`same_place=true,no_split=true,appearance_trigger=true` ⇒ **文本外形差异**；满足 D3 全部布尔式 ⇒ **归一化差异**；`same_place=true,role_compatible=true,no_split=true` 且两家 R 序列和 shape_signature 序列完全相同 ⇒ 内部 disposition `non_divergence`，不输出、不计入分歧数；其余 ⇒ “未归类”。
4. 已配对事件若仍为“未归类”，立即写 `unclassified_stop` 并标 `needs: claude`；禁止硬塞、改尺或另造分类。输入预检失败记 `input_stop`；冻结段/脚本完整性失败记 `integrity_stop`；I/O 或内存失败按阶段记 `runtime_stop`。停线后不换规则重跑。
5. `pairing_stop` 与 `unclassified_stop` 都必须含卷/谓词/sort key、两家相关 seq/role、R 类型/长度/SHA/转义摘录、payload/可选字段实际值、原始/canonical anchors、候选与排除过程、停止时四类分谓词计数、存在域分谓词计数、最后处理/最后配对/最后分类事件及尚未进入的各谓词边界。

#### F. 证据投影、输出与计数

1. 每个 fragment 的证据固定列：`path / seq / raw_role / canonical_role / R / R_type / R_codepoint_length / R_utf8_byte_length / R_sha256 / R_escaped_excerpt / payload_kind / HAS_HTML / TAGS / MARKUP / W / N / N_sha256 / shape_signature / optional_fields / extra_field_keys / anchor_extra_field_keys / raw_anchor / canonical_anchor`，并按家庭附 `page_size` 或 `charspan`。存在域收据同时列原始单边 component/opcode 来源、对侧成员数 0 与配对门 decision trace；只陈述结构，不判断对象语义。
2. 每条四分类分歧固定输出 `divergence_id / document / predicate / mineru_evidence / docling_evidence / classification / decision_trace`；`classification` 只能是四个既定名称。存在域单列 `existence_differences`，不占分类数组、不占四分类计数。
3. 四类计数固定为 `counts_by_classification_and_predicate`，每类均列 `P-TEXT / P-STRUCT / P-NULL / cross_predicate_total`。存在域固定为 `existence_counts_by_predicate`，列三谓词与同表总计；其计数单位是单边 fragment 收据，不与四分类事件相加成一个总数。内部 `non_divergence` 只列处理进度。
4. JSON 固定保留三个互不冒充的游标：`last_processed_event`（含存在门处理）、`last_paired_event`（进入分类器的最后已配对事件）、`last_classified_event`（最后一个四类分歧；没有则 null）。另保留 `last_completed_classifier_event`，允许值为四类或 `non_divergence`。

#### G. 分谓词射程、零成本与完整性

1. 对 `full_candidate_scope / processed_scope / paired_classifier_scope / remaining_after_stop_scope` 四个阶段，均按 `document × predicate × family` 输出：fragment 数、canonical page 的完整 distinct 集及 min/max、seq 的完整 distinct 集及 min/max；再按 `document × predicate` 输出事件数。空集合明确写 count=0、distinct=[]、min=null、max=null。seq 每卷独立，不跨卷伪造一个连续区间。
2. `full_candidate_scope` 覆盖全部已建事件；`processed_scope` 覆盖配对门或分类器已经给出控制结果的事件成员；当前停线事件单列且不混入 processed；`remaining_after_stop_scope` 只覆盖停线事件之后尚未进入的事件；完整结束时它为空。`paired_classifier_scope` 只覆盖两侧非空且 `pairing_ok=true` 的事件成员。每张含 `cross_predicate_total` 的计数表旁必须引用这四组按谓词边界，禁止只给逐卷数量。
3. 结果固定自证 `model_calls=0,api_keys_used=0,cost=0`，并写 `scope="census_program_only; excludes builder-session reasoning"`。程序不得读取任何 key 或调用模型/API。
4. 结果 JSON 固定用 `json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)` 生成，UTF-8 strict 编码后追加**恰好一个 LF**；文件 SHA-256 覆盖全部字节。脚本、JSON、冻结段分别取 SHA-256；实跑前后脚本与冻结段任一字节变化即本轮无效并停线。
<!-- FROZEN_CLASSIFIER_V2_END -->

- SHA 边界从 START 标记起始 `<` 到 END 标记末尾 `>`，**两枚 HTML 标记均计入**：18,690 UTF-8 bytes，SHA-256 `3d49b12ab0ac5a356da10223ecb924612346423edbf51198f916d816ffdbc1d3`。
- SHA 计算窗口为 `2026-08-31T01:26:05.5388801-04:00` 至 `2026-08-31T01:26:05.6468630-04:00`，以后者为冻结时刻。脚本 CreationTime（首字节时刻）为 `2026-08-31T01:27:37.1516898-04:00`；严格满足 `2026-08-31T01:26:05.6468630-04:00 < 2026-08-31T01:27:37.1516898-04:00`。
- 冻结时脚本路径尚未形成（`exists_at_freeze=false`）。最终脚本 86,093 bytes / 2,135 LF / SHA-256 `1d7eecd6d25c2757b51c6cad4d54483ca7af72f93a6547d9b600355bcfa0122d`；跑前后相同。四条定义与封存 v1 operative D.2–D.5 做 case-sensitive exact compare：4 rows / 2,166 UTF-8 bytes / 两边 SHA-256 `6e84904aae415b4b0c37b20ae21ca72fe8a658554a2047004a393570a4663885` / `exact_equal=true`。

### R-v2.2 唯一实跑与产物

- 唯一命令为 `python -B C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-v2-20260831/run_divergence_census_v2.py`；窗口 `2026-08-31T01:38:01.9281883-04:00` 至 `2026-08-31T01:38:02.4380103-04:00`。程序返回 `2` 并落 `status=unclassified_stop`；外层 PowerShell 为继续读取既有收据而正常结束 `0`，没有把两种射程混写，也没有执行第二次。
- canonical JSON：`C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-v2-20260831/divergence-census.json`；106,504 bytes；SHA-256 `f1a31c48db5e7c40418e3961a936d90f90f8e80fded94a8427122e6e0285a555`；创建 `2026-08-31T01:38:02.0886967-04:00`，末写 `2026-08-31T01:38:02.4237306-04:00`。整份 JSON 经结构化复核：无重复 object key、canonical 重编码逐字节相同、末尾恰一个 LF。
- 运行时 CPython `3.14.2` / Unicode DB `16.0.0`；四卷、两家共 8 个既有 `.fragments.json` 通过 strict preflight。没有重跑转写器。文件写入域只有仓外 JSON 的 `.tmp` 原子 sibling 与最终 JSON；证据树只读。
- 程序级零成本自证为 `model_calls=0,api_keys_used=0,cost=0,scope="census_program_only; excludes builder-session reasoning"`，不覆盖 builder 会话自身推理开销。

### R-v2.3 逐条证据、四类计数、射程与 K-3

#### 4. 配对门产出与逐条字段证据

##### 4.1 计数与共同字段

配对门在停线前逐 fragment 形成 9 张存在域收据：`P-TEXT=2 / P-STRUCT=6 / P-NULL=1 / cross_predicate_total=9`。方向按结构化解析为「仅 Docling 有」8 张、「仅 MinerU 有」1 张；这里只记方向，不判断对象应否出现。9 张收据的 `opposite_side_member_count` 均为 0，且对象键集合中均无 `classification`。

该合计的专属已处理边界为：P-TEXT MinerU=`f1/page 2/seq 4`、Docling=`f1/page 1/seq 6`；P-STRUCT MinerU=`∅`、Docling=`f6/pages {1,3} (min 1,max 3)/seqs {0,4,5,7,8,15} (min 0,max 15)`；P-NULL MinerU=`∅`、Docling=`f1/page 2/seq 10`。四阶段总射程与 remaining 边界另见 §5.3–§5.4。

以下共同字段对 E-000001～E-000009 每一条都成立：`HAS_HTML=false,TAGS=[],MARKUP=[]`；`type / image_path / html` 均为 `field_present=false,value=null`；`extra_field_keys=[]`、`anchor_extra_field_keys=[]`。Docling 路径均为 `D:/Coinsides/v12.9-selection/tools/_out/c1-docling/ielts-academic-reading-sample-tasks-2023.fragments.json`；唯一 MinerU 条目 E-000007 的路径为 `D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/ielts-academic-reading-sample-tasks-2023.fragments.json`。

##### 4.2 每条身份、文本投影与门轨迹

| ID | 方向 / 谓词 / source | seq；raw→canonical role；page | R / W / N 精确状态 | payload / 门轨迹 |
|---|---|---|---|---|
| E-000001 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 0；`picture→visual`；1 | `R=null`（类型/长度/hash/摘录均 null）；`W=null`；`N=""`，0 code points / 0 bytes，SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `payload_kind=null,shape_signature=["null",[]]`；C4 `R_non_null=false`、两家匹配 seq 均 `[]` → 单边 fragment → XOR `(0,1)` 后继续 |
| E-000002 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 4；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,4]` → XOR `(0,1)` 后继续 |
| E-000003 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 5；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,5]` → XOR `(0,1)` 后继续 |
| E-000004 | 仅 Docling 有 / P-TEXT / `SequenceMatcher_unilateral_fragment` | 6；`text→text`；1 | `R_type=string,R=W=N="idp"`；各 3 code points / 3 bytes；各 SHA `0c1eeccce6f114bf627c03a403d7c6e52e5b201ff1be893410a507066c9cc16b`；R 摘录 `idp` | `payload_kind=plain,shape_signature=["plain",[]]`；opcode 1=`insert`、MinerU slice `[3,3]`、Docling slice `[3,4]` → 单 fragment → XOR `(0,1)` 后继续 |
| E-000005 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 7；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,7]` → XOR `(0,1)` 后继续 |
| E-000006 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 8；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,8]` → XOR `(0,1)` 后继续 |
| E-000007 | 仅 MinerU 有 / P-TEXT / `SequenceMatcher_unilateral_fragment` | 4；`index→index`；2 | `R_type=string`；R 与 W：1,923 code points / 1,975 bytes，SHA `b251aa1d29a4fcbce0a9aabe8aebb2f0f0be60def78937d6db14b399e53d3ae3`，`R_escaped_excerpt=Academic Reading Sample Task \u2013 Matching Features. . 3 Academic Reading Sample Task \u2013 Matching Features (Answers) . 5 Academic Reading Sample Task \u2013 Table Completion . 6 Academic Re\u2026ample Task \u2013 Diagram Label Completion (Answers).... .... 46`；N：1,496 code points / 1,496 bytes，SHA `d976b84f2e0acd1ce361aa9421f90114cf9a3548808b4e65c7fe76058c60fbee` | `payload_kind=plain,shape_signature=["plain",[]]`；opcode 3=`delete`、MinerU slice `[4,5]`、Docling slice `[5,5]` → 单 fragment → XOR `(1,0)` 后继续 |
| E-000008 | 仅 Docling 有 / P-NULL / `P-NULL_single_side_component` | 10；`document_index→index`；2 | 同 E-000001 的 null/empty 投影与 N SHA | `payload_kind=null,shape_signature=["null",[]]`；bbox component members=`[[1,10]]`、neighbors=`[]` → 单 fragment → XOR `(0,1)` 后继续 |
| E-000009 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 15；`picture→visual`；3 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,15]` → XOR `(0,1)` 后继续 |

##### 4.3 每条 anchor 与 sort key

| ID | sort key | raw anchor | canonical anchor |
|---|---|---|---|
| E-000001 | `[0,1,0,1,0,0,0,0,[[1,0]]]` | `page=1,bbox=[55.96143474527654,806.2902106785717,175.23270302996542,772.2433703091365],charspan=[0,0]` | `page=1,bbox=[55.96143474527654,34.709789321428275,175.23270302996542,68.75662969086352]` |
| E-000002 | `[0,1,4,1,0,0,4,0,[[1,4]]]` | `page=1,bbox=[54.057329178624514,67.0734606034739,108.12360504713635,50.86760303778203],charspan=[0,0]` | `page=1,bbox=[54.057329178624514,773.9265393965261,108.12360504713635,790.132396962218]` |
| E-000003 | `[0,1,5,1,0,0,5,0,[[1,5]]]` | `page=1,bbox=[117.50334825605356,66.69880137971347,153.36607846253673,50.83855306376188],charspan=[0,0]` | `page=1,bbox=[117.50334825605356,774.3011986202865,153.36607846253673,790.1614469362381]` |
| E-000004 | `[0,1,6,1,0,0,6,2,[[1,6]]]` | `page=1,bbox=[129.0,68.58666666666659,155.33333333333331,48.58666666666659],charspan=[0,3]` | `page=1,bbox=[129.0,772.4133333333334,155.33333333333331,792.4133333333334]` |
| E-000005 | `[0,1,7,1,0,0,7,0,[[1,7]]]` | `page=1,bbox=[162.20876117475882,66.81530642258019,246.57818060548516,43.888163691359864],charspan=[0,0]` | `page=1,bbox=[162.20876117475882,774.1846935774198,246.57818060548516,797.1118363086401]` |
| E-000006 | `[0,1,8,1,0,0,8,0,[[1,8]]]` | `page=1,bbox=[482.2482276865301,61.99667249665981,536.5120508877544,49.169339115387515],charspan=[0,0]` | `page=1,bbox=[482.2482276865301,779.0033275033402,536.5120508877544,791.8306608846125]` |
| E-000007 | `[0,2,4,0,4,1,0,2,[[0,4]]]` | `page=1,bbox=[66,78,541,764],page_size=[595,841]` | `page=2,bbox=[66.0,78.0,541.0,764.0]` |
| E-000008 | `[0,2,10,1,0,0,10,1,[[1,10]]]` | `page=2,bbox=[69.22720776193094,759.0955717732844,538.3685728669648,81.92098776629302],charspan=[0,0]` | `page=2,bbox=[69.22720776193094,81.9044282267156,538.3685728669648,759.079012233707]` |
| E-000009 | `[0,3,15,1,0,0,15,0,[[1,15]]]` | `page=3,bbox=[479.8895632115307,33.31037241593674,534.3894753843987,20.658193289786254],charspan=[0,0]` | `page=3,bbox=[479.8895632115307,807.6896275840633,534.3894753843987,820.3418067102137]` |

#### 5. 四分类、分谓词射程与停线

##### 5.1 分类计数与已分类分歧

四分类定义域仍严格是已配对事件；存在域 9 张收据不进入下表。

| classification | P-TEXT | P-STRUCT | P-NULL | cross_predicate_total |
|---|---:|---:|---:|---:|
| 文本外形差异 | 0 | 0 | 0 | 0 |
| 归一化差异 | 3 | 0 | 0 | 3 |
| 切分差异 | 0 | 0 | 0 | 0 |
| 真实指错 | 0 | 0 | 0 | 0 |

该四类计数的专属已分类边界为：P-TEXT 3 events，MinerU=`f3/pages {1,3}/seqs {1,5,8}`、Docling=`f3/pages {1,3}/seqs {2,11,14}`；P-STRUCT 与 P-NULL 均为空。其 classifier 已进入/已完成/当前停线/remaining 的边界另见 §5.2–§5.4。

3 条均为 `academic-reading / P-TEXT / 归一化差异`：D-000001=`MinerU seq 1 ↔ Docling seq 2 / page 1 / text→text`，两边 N 完全相同，R 的引号 code point 不同；D-000002=`MinerU seq 5 ↔ Docling seq 11 / page 3 / heading→heading`，两边 N 完全相同，R 的破折号 code point 不同；D-000003=`MinerU seq 8 ↔ Docling seq 14 / page 3 / text→text`，两边 N 完全相同，R 的引号 code point 不同。三条 ordered reason 均为 `NFKC/casefold/标点或分隔符删除后相等`。另外 5 个已配对事件完成为内部 `non_divergence`；不进入分歧计数。

##### 5.2 K-3 停线：已配对仍未归类

当前停线事件是 `academic-reading / P-TEXT / source=SequenceMatcher_non_equal_prefix_group`，sort key=`[0,4,9,0,9,0,16,2,[[0,9],[1,16]]]`，控制为 `unclassified_stop,needs: claude`。

| 侧 | 路径 / seq / role | R / W / N | payload / 可选字段 | anchors |
|---|---|---|---|---|
| MinerU | `.../c2-mineru/ielts-academic-reading-sample-tasks-2023.fragments.json` / 9 / `title→heading` | `R_type=string`；R=`Questions 7 – 10`，16 code points / 18 bytes，SHA `01c2162f49dcc1fe85002ef1bf349f9607df1c7da0e2f19d86a71c85b7e9d9ce`，escaped excerpt=`Questions 7 \u2013 10`；W=`Questions 7 – 10`；N=`questions710`，SHA `f016379cb1ec297ac8d02581145ee697f44cbde5847971b8e3dd6bc9fabd4108` | `plain,false,[],[]`；三可选字段均 false/null | raw `page=3,bbox=[55,42,142,56],page_size=[595,841]`；canonical `page=4,bbox=[55.0,42.0,142.0,56.0]` |
| Docling | `.../c1-docling/ielts-academic-reading-sample-tasks-2023.fragments.json` / 16 / `text→text` | `R_type=string`；R/W=`Questions 7 - 10`，16 code points / 16 bytes，R SHA `d402f81bc8d1b90db4fdb1151ce6f9b849e35904cc910978f58ba9ff89de0174`，escaped excerpt=`Questions 7 - 10`；N 与 MinerU 相同 | `plain,false,[],[]`；三可选字段均 false/null | raw `page=4,bbox=[56.64,796.42464,142.87344,785.9458436873747],charspan=[0,16]`；canonical `page=4,bbox=[56.64,44.575360000000046,142.87344,55.05415631262531]` |

配对证明：两边 concat(N) 非空且 SHA 相同；两家整卷各只有当前连续区间，C2 内容唯一性门通过；bbox 正面积交集为 width `85.36`、height `10.478796312625263`，所以 `pairing_ok=true,same_place=true`。分类器随后得到 MinerU role signature=`["heading"]`、Docling=`["text"]`，`role_compatible=false`；按冻结首守门如实记“未归类”并立即停线，没有硬塞、改尺或重跑。`pairing_stop/input_stop/integrity_stop/runtime_stop` 均为 null；本轮唯一控制停线就是上述 K-3 事件。

最后游标：`last_processed_event=E-000009 (academic-reading/P-STRUCT/Docling seq 15)`；`last_paired_event=当前停线事件 (MinerU 9/Docling 16)`；`last_classified_event=last_completed_classifier_event=D-000003 (MinerU 8/Docling 14/归一化差异)`。

##### 5.3 四阶段射程总表

| scope | P-TEXT events | P-STRUCT events | P-NULL events | cross-predicate events | MinerU fragments | Docling fragments |
|---|---:|---:|---:|---:|---:|---:|
| full_candidate_scope | 724 | 64 | 20 | 808 | 808 | 874 |
| processed_scope | 10 | 6 | 1 | 17 | 9 | 16 |
| paired_classifier_scope（含当前 K-3 事件） | 9 | 0 | 0 | 9 | 9 | 9 |
| stopping_event_scope | 1 | 0 | 0 | 1 | 1 | 1 |
| remaining_after_stop_scope | 713 | 58 | 19 | 790 | 798 | 857 |

结构化集合自证按每个 `document × predicate × family` 检查：`full = processed + stopping_event + remaining`；event_count 相加相等，三部分的 seq 集两两不交且并集逐项等于 full。全样本 fragments 亦闭合为 MinerU `808=9+1+798`、Docling `874=16+1+857`。`paired_classifier_scope` 表示实际进入分类器的已配对事件，其中 8 条完成，当前第 9 条触发 K-3。

##### 5.4 各卷、谓词与家庭的 page/seq 边界

单元格语法为 `fragments; canonical page min..max (distinct count); seq min..max (distinct count)`；`∅` 表示程序 JSON 中的 `count=0,distinct=[],min=null,max=null`。完整 distinct 集保存在 canonical JSON；以下逐卷列 min/max，避免跨卷拼接 seq。

###### full_candidate_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 310 | `315; 1..46 (45); 0..319 (315)` | `325; 1..46 (45); 1..349 (325)` |
| academic-reading | P-STRUCT | 27 | `5; 7..45 (5); 38..313 (5)` | `25; 1..46 (17); 0..350 (25)` |
| academic-reading | P-NULL | 1 | `∅` | `1; 2..2 (1); 10..10 (1)` |
| writing-example-responses | P-TEXT | 51 | `68; 1..5 (5); 0..68 (68)` | `61; 1..5 (5); 1..62 (61)` |
| writing-example-responses | P-STRUCT | 2 | `∅` | `2; 1..4 (2); 0..53 (2)` |
| writing-example-responses | P-NULL | 1 | `1; 1..1 (1); 21..21 (1)` | `∅` |
| academic-writing | P-TEXT | 132 | `148; 1..26 (26); 0..151 (148)` | `135; 1..26 (26); 1..153 (135)` |
| academic-writing | P-STRUCT | 18 | `3; 3..5 (3); 13..27 (3)` | `18; 1..26 (15); 0..150 (18)` |
| academic-writing | P-NULL | 2 | `1; 20..20 (1); 123..123 (1)` | `1; 2..2 (1); 11..11 (1)` |
| listening | P-TEXT | 231 | `259; 1..33 (33); 0..266 (259)` | `278; 1..33 (32); 1..304 (278)` |
| listening | P-STRUCT | 17 | `4; 3..30 (4); 21..248 (4)` | `16; 1..33 (10); 0..305 (16)` |
| listening | P-NULL | 16 | `4; 11..32 (3); 104..260 (4)` | `12; 2..29 (4); 11..273 (12)` |

###### processed_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 10 | `9; 1..3 (3); 0..8 (9)` | `9; 1..3 (3); 1..14 (9)` |
| academic-reading | P-STRUCT | 6 | `∅` | `6; 1..3 (2); 0..15 (6)` |
| academic-reading | P-NULL | 1 | `∅` | `1; 2..2 (1); 10..10 (1)` |
| writing-example-responses | P-TEXT / P-STRUCT / P-NULL | 0 / 0 / 0 | `∅ / ∅ / ∅` | `∅ / ∅ / ∅` |
| academic-writing | P-TEXT / P-STRUCT / P-NULL | 0 / 0 / 0 | `∅ / ∅ / ∅` | `∅ / ∅ / ∅` |
| listening | P-TEXT / P-STRUCT / P-NULL | 0 / 0 / 0 | `∅ / ∅ / ∅` | `∅ / ∅ / ∅` |

###### paired_classifier_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 9 | `9; 1..4 (4); 0..9 (9)` | `9; 1..4 (4); 1..16 (9)` |
| academic-reading | P-STRUCT / P-NULL | 0 / 0 | `∅ / ∅` | `∅ / ∅` |
| 其余三卷 | P-TEXT / P-STRUCT / P-NULL | 每格 0 | 每格 `∅` | 每格 `∅` |

###### stopping_event_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 1 | `1; 4..4 (1); 9..9 (1)` | `1; 4..4 (1); 16..16 (1)` |
| academic-reading | P-STRUCT / P-NULL | 0 / 0 | `∅ / ∅` | `∅ / ∅` |
| 其余三卷 | P-TEXT / P-STRUCT / P-NULL | 每格 0 | 每格 `∅` | 每格 `∅` |

###### remaining_after_stop_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 299 | `305; 4..46 (42); 10..319 (305)` | `315; 4..46 (42); 17..349 (315)` |
| academic-reading | P-STRUCT | 21 | `5; 7..45 (5); 38..313 (5)` | `19; 4..46 (15); 25..350 (19)` |
| academic-reading | P-NULL | 0 | `∅` | `∅` |
| writing-example-responses | P-TEXT | 51 | `68; 1..5 (5); 0..68 (68)` | `61; 1..5 (5); 1..62 (61)` |
| writing-example-responses | P-STRUCT | 2 | `∅` | `2; 1..4 (2); 0..53 (2)` |
| writing-example-responses | P-NULL | 1 | `1; 1..1 (1); 21..21 (1)` | `∅` |
| academic-writing | P-TEXT | 132 | `148; 1..26 (26); 0..151 (148)` | `135; 1..26 (26); 1..153 (135)` |
| academic-writing | P-STRUCT | 18 | `3; 3..5 (3); 13..27 (3)` | `18; 1..26 (15); 0..150 (18)` |
| academic-writing | P-NULL | 2 | `1; 20..20 (1); 123..123 (1)` | `1; 2..2 (1); 11..11 (1)` |
| listening | P-TEXT | 231 | `259; 1..33 (33); 0..266 (259)` | `278; 1..33 (32); 1..304 (278)` |
| listening | P-STRUCT | 17 | `4; 3..30 (4); 21..248 (4)` | `16; 1..33 (10); 0..305 (16)` |
| listening | P-NULL | 16 | `4; 11..32 (3); 104..260 (4)` | `12; 2..29 (4); 11..273 (12)` |

#### 6. 我自己的测量错误

**我冻的规则本身，是不是就是零产出的原因？**

**回答：否。** 这里把“产出”分别钉为本轮全部普查产出与四分类分歧产出：前者已有 9 张存在域收据，后者已有 3 条归一化差异，所以两种口径都不是零。冻结规则确实直接造成当前事件因 `role_compatible=false` 触发 K-3 停线，但这是“为什么在此停止”，不是“为什么零产出”。另外三类在已完成前缀内为 0，只能报告该前缀事实；停线后的 790 个事件没有进入控制处理，不能外推其计数。

本轮仍记录这些测量风险与处置：

1. **不能把所有 `pairing_ok=false` 都送进存在域。** 门只接 XOR 真正单边；双边未决必须 `pairing_stop`。实现把这三路在 classifier 前分开。
2. **P-STRUCT 不能见原始单边 component 就立即截走。** C4 的双方唯一、逐字相同非 null R 配对先执行，剩余节点才逐 fragment 进入门；否则会掏空真实指错的合法路径。
3. **逐 opcode 的单边组必须拆成逐 fragment 收据。** v1 的 grouped unmatched 计数单位不适合存在域；v2 在 P-TEXT、P-STRUCT、P-NULL 都逐 fragment 成形。
4. **当前 scope 正常停线路径闭合，但异常兜底不是同等形状。** 本次没有触发 runtime/input/integrity 异常；若触发，不能把 normal-stop 的 current-scope 完整性外推给异常路径，应直接 `needs: claude`。
5. **写入措辞要包含原子 sibling。** 程序不是只触碰一个 pathname，而是只在仓外同目录写 `.tmp` 后原子替换最终 JSON；证据树仍纯读。
6. **规则按形态而非单条特判。** 实现没有 Docling、seq 0、visual 或 null 的专属放行分支；三谓词 builder 统一把逐 fragment 单边事件送入同一个 XOR 门，P-NULL 同门。已知的 46 条同形、四卷 Docling seq 0 及跨 visual/text 的成员在规则层都由这一个结构谓词路由，不按卷、seq 或 role 特判。K-3 已在第 18 个有序事件停线，所以这只是规则覆盖声明，本文不声称后续候选已经过门。


### R-v2.4 证据链、自查与允许面

- 证据本体开工：94,935 files / 3,149,405,801 bytes / 14,624,025 manifest bytes / SHA-256 `efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`；收尾用同一明文字节配方复算，四项逐项同值。
- 历史 c-1c → c-2 v1 配方链仍如实记为断链；c-2 v1 → c-2 v2 以封存 v1 收尾的明文配方与同一 digest 接续，本轮开工→收尾闭合。
- 本回执不申报“经过 N 路审计”。预跑静态核对痕迹在仓外当前 Codex builder thread 及 `/root/criteria_audit`、`/root/v1_method_audit` 子任务，不在仓内；程序级零成本的射程已经单列。
- 本轮只新建 `docs/agent-ops/analysis/2026-08-31-v12-9c-c2-divergence-census-v2.md`，并补齐本 `## Result(v2)`。顶部状态、§1–§10、v1 Result、封存 v1 档案、INDEX、生产码、测试、迁移与证据本体均未由本轮修改；没有 commit / push，也没有翻顶部状态行。
- 最终 `git status --short` 只列 v2 档案 `??`、本工单 `M`，以及开工前已有的 `server/src/routes/projections.ts M`。该 server 文件 SHA-256 仍为 `c9072a7a3bfcbcfc20e48efa3050c0baea806b5ac89594b29e5249fe1ce08ed7` 且 tracked textual diff 为空；封存 v1 档案 SHA-256 仍为 `df8278f46c8e4c621647e5246a7df7dcfb594ba8ffa7c9fd87c0ab76ed5898de`。工单 HEAD 原文 42,940 bytes 保持逐字相同；只在其后增加两个 LF 作为分隔并追加本段。
- 实质停线点只有一处：K-3 的 `unclassified_stop,needs: claude`；`pairing_stop/input_stop/integrity_stop/runtime_stop` 均为 null。后续 790 个有序事件未进入控制处理，本文不外推它们的分类结果。


## Result(v3)

> **builder v3 工作回执（2026-08-31，进行中）**：已完整读取工单并以 §12 为唯一执行判据；本轮将采用“门遍全量无停线 → 分类遍保留 K-3”的两遍制。当前尚未实跑普查，也未重跑任何转写器；只准备在允许面内新建 v3 档案并补全本段。裁定来源记为 **Fable**，由调度方转写，不写成 Henry。

> **续跑更正（最终状态以本句及下文为准）**：上句“当前尚未实跑普查”在开工写下时为真，现已过期，不是收工时状态。唯一实跑已于 `03:14:55` 完成，且没有重跑任何转写器。上一轮在实跑完成后、正要把 canonical JSON 结果回填进 v3 档案时中断；中断原因为 `ERROR: Selected model is at capacity`（exit 1，已用 421,205 tokens），不是完整性门、K-3 或任何普查判据失败。本轮在三项完整性门全部通过后才继续读取和回填现有 canonical JSON。

- 追加本段前，工单为 94,150 bytes，SHA-256 `489d83431c000b9fa10dfc54efb7de092b89deb110a21751cb6cd3582316fd51`；该前缀将作为 §1–§11、v1/v2 回执及顶部状态均未改的字节级基线。
- 封存 v1 档案 SHA-256 `df8278f46c8e4c621647e5246a7df7dcfb594ba8ffa7c9fd87c0ab76ed5898de`；封存 v2 档案 SHA-256 `5890ee01d6883d6d5416f55c65caa7178ad1441b01ebec7f2d2e1a2fce11c0cf`。
- 开工时既有 `server/src/routes/projections.ts` 工作树状态为 `M`，文件 SHA-256 `c9072a7a3bfcbcfc20e48efa3050c0baea806b5ac89594b29e5249fe1ce08ed7`；本轮不触碰或回退它。
- 当前控制状态：`in_progress`。退出前必须把本段补成最终回执；不 commit、不 push、不翻顶部状态行。

### R-v3.1 最终结论、续跑中断点与完整性门

**最终结论：PASS，无停线。** 唯一实跑产物 `status=complete`，门遍与分类遍均 `complete`；`input_stop=null`、`integrity_stop=null`、`unclassified_stop=null`。分类遍处理完全部 320 个已配对且角色相容事件，**本轮未触发 K-3**。上一轮的模型容量中断发生在实跑完成后的档案回填阶段，不是程序退出、完整性失败或判据停线。

| 对象 / 时间 | 现物与回读 |
|---|---|
| 冻结段回读完成 | `2026-08-31T02:55:39.4894801-04:00` |
| 脚本首字节 / 末写 | `02:56:54.8807171` / `03:12:35.2967113`；冻结严格更早 |
| JSON 创建 / 末写 | `03:14:53.0436763` / `03:14:55.4695553` |
| 冻结段 | START=1 / END=1；offset `3778..17498` inclusive；13,721 bytes；`9c6560c50e7fd8db3282de983ef8be17ea25809d8f1dac62880e7eb62772b75d` |
| 实跑脚本 | 119,368 bytes；current = JSON before = JSON after = `7a316346a22bf658053d7de54ad235a35851e2f4f7ad4f3d75bbe5503f9c1f0f` |
| canonical JSON | 5,096,178 bytes；`2bfc5b892a107cd5fb79e7cbf1cf8f005d3b769b621eaceb3b395dd54f1e0dab`；UTF-8 无 BOM、末尾恰一个 LF |

完整性门三项全部相同后才读取 JSON 普查字段。8 个输入文件逐一长度/SHA 与 JSON 相同；没有用重跑掩盖不一致，也没有改冻结段迁就现物。

### R-v3.2 K-1 冻结口径原文、SHA、唯一标记与继承量

以下为 v3 档案 §2 两枚唯一标记及其间 **13,721 UTF-8 bytes 的逐字原文**；两枚 HTML 标记都计入 SHA 边界：

<!-- FROZEN_CLASSIFIER_V3_START -->
### 冻结程序 v3 原文

#### A. 输入、校验、证据字段与事件顺序

1. 输入只能是 MinerU=`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/` 与 Docling=`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/` 的直接子文件。两目录中名称以大小写敏感的 `.fragments.json` 结尾者，文件名集都必须恰好等于 §1.1 四项，不得减少、增加或大小写漂移，且四对文件名逐字一一相同。卷顺序固定为 `academic-reading → writing-example-responses → academic-writing → listening`。
2. 运行时固定 CPython `3.14.2`、Unicode database `16.0.0` 与该运行时的 `json/re/html.parser/difflib` 标准库。文件按 UTF-8 strict、无 BOM 解码；JSON 固定 `parse_int=int,parse_float=float`，拒绝重复 object key、`NaN/Infinity/-Infinity`、尾随内容及未配对 surrogate。每份文件必须是数组；每条至少有 `anchor/role/seq/text`。`seq` 是从 0 开始连续唯一的非 bool Python int；`role` 是字符串；`text` 仅字符串或 null；页、bbox、MinerU `page_size`、Docling `charspan` 依 v2 strict preflight 校验。任一不成立记 `input_stop,needs: claude`，不开始门遍。
3. 每个 fragment 逐字保留 `type/image_path/html` 三个可选字段的 `field_present` 与实际 JSON value；不存在记 false/null。额外字段只登记键名。禁止查原 PDF、图片、`middle.json` 或生产码补值，禁止凭肉眼看图断言。
4. 三条互斥谓词沿用 `P-TEXT/P-STRUCT/P-NULL`；每个 fragment 必须且只能命中一条。全部事件先建完，再按唯一 sort key `(卷序号,event_page,min_any_seq,mineru_empty_rank,min_mineru_seq_or_0,docling_empty_rank,min_docling_seq_or_0,predicate_rank,member_key)` 排序；`predicate_rank=P-STRUCT:0,P-NULL:1,P-TEXT:2`，`family_rank=MinerU:0,Docling:1`。门遍与分类遍都只引用这一份有序事件枚举；分类遍不得另建一套事件。

#### B. 固定字段投影与维度覆盖申报

1. canonical role 映射只有：MinerU `title→heading,text→text,list→list,index→index,image|chart→visual,table→table`；Docling `section_header→heading,text|footnote→text,list_item|checkbox_unselected→list,document_index→index,picture→visual,table→table`。表外 role 不猜，记 `input_stop`。双方 raw role 逐字保留。
2. 文本投影：`R=raw text`。HTML regex 固定 `(?is)</?(?P<tag>table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|div|span|ul|ol|li|br|img|figure|figcaption|h[1-6])(?:\s[^<>]*?)?/?>`；R=null 时 `HAS_HTML=false,TAGS=[],MARKUP=[],W=null,N=''`。否则用 `HTMLParser(convert_charrefs=True)` 取 data（有标记时）或直接取 R，Unicode 空白折叠得 W；N 依次为 NFKC、casefold、删 U+00AD、删 category 以 P/Z 开头或 `isspace()` 为真的 code point。不用编辑距离或相似度。
3. `payload_kind=null|html|asset_token|plain` 与 `shape_signature=(payload_kind,MARKUP)` 沿 v2；页号统一为 MinerU page+1、Docling 原 page。MinerU bbox 按 TOPLEFT；Docling bbox 按 BOTTOMLEFT 并用同页 MinerU 唯一 page height 转 TOPLEFT。所有几何用 CPython binary64 exact 运算，无容差。同一落点要求两侧 page 集相同，且两边每个 bbox 都与对侧至少一个 bbox 有正面积交集；仅边缘相接不算。
4. **维度覆盖申报（不得豁免 K-3）：**存在（有没有）→ 配对门；是什么（角色）→ 角色门；长什么样 → ①文本外形差异、②归一化差异、③切分差异；在哪 → ④真实指错。该申报只说明量具射程，绝不把未命中者赦免进最近类别；分类遍中已配对、角色相容而仍不入四类者照旧触发 K-3。
5. **已知不覆盖，`needs: claude`：**三谓词的既有路由仍部分由 canonical role 决定，所以 role-blind 配对只在同一谓词内部成立；`table↔index` 等被路由到不同谓词的分类学差异不在本轮角色门射程。P-TEXT 只在冻结的 N/连续区间身份内配对；P-STRUCT/P-NULL 只在冻结的几何或唯一逐字 R 证据内配对；语义等价、图片内容、OCR、非冻结 HTML 语法、未被身份量具配上的跨片关系都不覆盖。④只覆盖有冻结 pointer identity 证明的落点差异，不判断内容语义真伪。

#### C. 三谓词配对（同谓词内 role-blind）

1. `P-TEXT` 射程仍为 canonical role 不在 `{visual,table}` 且 N 非空，但配对身份键改为 **N-only**，role 不进入 `SequenceMatcher` key。以两家 N 序列交给 `SequenceMatcher(autojunk=False)`；equal block 逐位置发 1:1 事件。每个非 equal opcode 从当前游标枚举两边非空连续前缀，找 `concat(N)` 完全相同者，以 `(两边条数和,条数差绝对值,MinerU条数,Docling条数,MinerU起止seq,Docling起止seq)` 的 lexicographic 最小 tuple 成组。当前无候选且两侧均非空，发包含两侧剩余成员的 bilateral unresolved 事件；只剩单侧则逐 fragment 发单边事件。不得跨 opcode 凑组。
2. P-TEXT 重复身份门也改为 **N-only**：若事件所含任一 N 在任一家庭全卷出现多于一次，以两家该 N 的全部 occurrence 建同页正面积 bbox 图；每个 occurrence 必须 degree=1，且当前成员唯一邻点属于当前事件对侧，否则 `pairing_ok=false`。对 `concat(N)` 组，枚举两家整卷所有能产生该 concat 的非空连续区间；两家各唯一且就是当前候选则通过；有重复时，只有恰一对跨家区间满足同一落点且正是当前候选才通过。role 不参与上述身份门。
3. `P-STRUCT` 射程仍为 canonical role 在 `{table,visual}`。同卷、同 canonical page、bbox 正面积交叠建二分图，**不要求同 canonical role**。双边分量 1:n/n:1/1:1 成组；m:n 且双方都大于 1 时，仅每节点 degree=1 且 m=n 才拆唯一边，否则发 bilateral unresolved 事件。对未消费节点，以 R 非 null 且逐字相同寻找双方全体未消费节点中的唯一候选，**不要求同 role**；成对后消费。其余逐 fragment 发单边事件。
4. `P-NULL` 射程仍为 canonical role 不在 `{visual,table}` 且 R=null 或 N 为空。同卷、同 canonical page、bbox 正面积交叠建图，**不要求同 canonical role**；分量规则同 C3。单边分量逐 fragment 发单边事件。
5. 每个 fragment 在其谓词内恰消费一次。事件 `pairing_ok` 的证明必须逐步保留候选、重复身份门、连续区间门、bbox 图与排除过程；role 只能在配对完成后读取，不能反向改变配对结果。

#### D. 门遍：全量配对门 → 角色门，正常路径无停线

1. 门遍顺序扫描 A4 的全部事件。配对门 full 分母 = 每个卷×谓词的全部候选事件，不是命中收据数。每个事件都使 processed 加一；正常完成后每行 `remaining=0`。
2. XOR 单边事件必须总成员数恰为 1；逐 fragment 记「存在性差异」收据并继续。方向只能写「仅 MinerU 有」或「仅 Docling 有」，不得写判断对象应否出现的动词。收据含 ID、卷、谓词、source、sort key、方向、对侧成员数 0、完整 fragment 字段证据与配对轨迹；对象不得有 `classification` 字段。
3. 双边但 `pairing_ok=false` 记 `pairing_unresolved` 门收据并继续，既不进入存在域，也不进入角色门或四分类；它不是控制停线。双边且 `pairing_ok=true` 才进入角色门。双侧皆空是 `integrity_stop,needs: claude`。除 input/integrity 类硬故障外，门遍不得因任何事件停止。
4. role signature = 各侧按 seq 的 canonical role 序列相邻去重后的 tuple。角色门 full 分母 = 配对门确认的全部双边 `pairing_ok=true` 事件；每件均 processed，正常完成 remaining=0。signature 不相等时逐事件记「分类学差异」收据并继续；相等时把同一事件引用放入 `classification_full_events`。
5. 每张分类学差异收据必须含：双方逐片 raw role 数组、双方逐片 canonical role 数组、双方 canonical role signature、不可交换的有序对 `MinerU-role × Docling-role`、配对证明，以及双方完整 seq/page/R-W-N+SHA/payload/可选字段/原始与 canonical anchor/overlap graph。名称沿用 `docs/agent-ops/analysis/2026-08-28-v12-9a-trial-1-transcriber.md:204` 的「分类学差异」。
6. 对角色门每个已配对事件按 canonical role signature 有序对计数一次，分别生成 P-TEXT、P-STRUCT、P-NULL 三张 `MinerU-role × Docling-role` 频次矩阵。矩阵只含整数 count，不设豁免对，不标良性/可疑，不含比率、百分比或归一化值；三矩阵计数和必须等于角色门 full，不相容单元格计数和必须等于分类学差异收据数。
7. 覆盖率固定输出 24 行：域=`存在维/配对门` 与 `角色维/角色门` × 4 卷 × 3 谓词。每行含 `full/processed/remaining` 与计数单位；配对门单位是 candidate event，角色门单位是 paired event。命中数另表，绝不拿 hits 冒充分母。

#### E. 分类遍：四分类与 K-3

1. 分类遍只顺序扫描门遍产出的 `classification_full_events`；每件已配对且 role signature 相容。`same_place` 沿 B3。`has_split`：P-TEXT 为两家逐片 N code point 长度的累计边界（排除最终总长）不同；P-STRUCT/P-NULL 为成员数不同。
2. **文本外形差异**：`same_place=true,no_split=true`，且冻结的 predicate-specific appearance trigger 成立：P-TEXT 的 shape signature 序列不同且至少一侧有 HTML；P-STRUCT/table 不同且至少一侧 payload 为 html/null；P-STRUCT/visual 不同且至少一侧为 asset_token/null；P-NULL 不同且至少一侧有 HTML 或 null payload。
3. **归一化差异**：同一落点、无切分、不触发 appearance，两家逐片 N 序列完全相同而 R 序列不同。证据列 R→W→N 首个相等阶段。
4. **切分差异**：同一落点、有切分；P-TEXT 另须两边 concat(N) 相同，P-STRUCT/P-NULL 另须来自双边连通分量。
5. **真实指错**：`pointer_identity=true,same_place=false`。pointer identity 只在 P-TEXT 两边非空 concat(N) 相同且通过 C2 单片/连续区间身份门，或 P-STRUCT 由 C3 双方唯一、逐字相同非 null R 建立落点候选时成立。无唯一内容证明不得判本类。
6. 单标签顺序固定：真实指错 → 切分差异 → 文本外形差异 → 归一化差异 → `non_divergence`（同一落点、无切分、R 与 shape signature 序列相同）→ `unclassified_stop`。`non_divergence` 是内部完成 disposition，不进入四类分歧表。
7. 首个仍不入四类且不为 non_divergence 的事件必须写「未归类」与完整停线收据，标 `needs: claude`，分类遍立即停止；不硬塞、不改尺、不重跑。若扫描完全部 `classification_full_events`，须申报「本轮未触发 K-3」。门遍完成态与其全量收据不因分类遍停止而倒退。

#### F. 跨遍闭合、射程与派生集合

1. 分类遍 `full_scope` 恰为门遍 `classification_full_events`，即已配对 + 角色相容事件；存在性差异、pairing unresolved、分类学差异不在四分类定义域，分别留在门遍表，不能从 full 中凭空消失。
2. 对每个 `document × predicate × family` 输出 `full/classified/stopped/remaining`：`classified` 包含已完成四类或 non_divergence 的事件成员；`stopped` 只含当前 K-3 事件或空；`remaining` 是其后的 classification_full 事件。四部分均给 event count、fragment count、完整 canonical page distinct 集和完整 seq distinct 集。
3. 机械断言每格 `full event IDs = classified ∪ stopped ∪ remaining`，三部分两两不交；每个 family 的 seq 集同样两两不交且并集等于 full，fragment count 相加相等。门遍全候选覆盖表与 classification 子射程闭合表必须分开，不在同一张可纵加表混排。
4. 四类计数按 classification×predicate 输出三谓词整数栏，跨谓词合计紧邻三栏；另按谓词与家庭给各自 page/seq 边界。存在性、分类学、pairing unresolved 命中数分别单列，不与四类相加成一个总数。
5. 凡结论依赖的 complete distinct/seq/event-ID 集必须进入 canonical JSON；档案至少保存 JSON digest + 本冻结配方 + 实际执行脚本全文，使其可从只读 8 文件重导。分类学差异与存在性差异的逐条完整收据必须直接入档，不得只留在仓外临时目录。

#### G. 输出、完整性与零成本

1. 每个 fragment 证据固定列 `path/seq/raw_role/canonical_role/R/R_type/R_codepoint_length/R_utf8_byte_length/R_sha256/R_escaped_excerpt/payload_kind/HAS_HTML/TAGS/MARKUP/W/N/N_sha256/shape_signature/optional_fields/extra_field_keys/anchor_extra_field_keys/raw_anchor/canonical_anchor`，并按家庭列 `page_size` 或 `charspan`。
2. canonical JSON 固定以 `json.dumps(ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)` 编码，UTF-8 strict 后恰一个 LF；用同目录 `.tmp` + `os.replace` 原子落仓外最终文件。程序不得写证据树，不得写其他仓内路径。
3. 程序固定自证 `model_calls=0,api_keys_used=0,cost=0,scope="census_program_only; excludes builder-session reasoning"`。程序、JSON、冻结段分别取 SHA-256；实跑前后脚本或冻结段任一字节变化记 `integrity_stop,needs: claude`，结果无效。
4. 代码标识不得使用 `score` 或 `chosen_score`；叙述不得输出一致率、准确率、优劣、置信度或阈值。任何零命中只证明显式申报范围中的零，不能推出范围外不存在。
<!-- FROZEN_CLASSIFIER_V3_END -->

冻结收据：档案内 `FROZEN_CLASSIFIER_V3_START/END` 各 1 处，今天按 §2.1 配方复跑不 abort；start byte offset=`3,778`、END inclusive offset=`17,498`、长度 `13,721`、SHA-256 `9c6560c50e7fd8db3282de983ef8be17ea25809d8f1dac62880e7eb62772b75d`。冻结时脚本路径不存在，冻结时刻早于脚本首字节约 75 秒，也早于实现末写约 17 分钟。

继承量采用 `git diff --no-index --no-renames --numstat` 的行级共同部分口径：v2=2,135 行、v3=2,937 行，842 additions / 40 deletions；v3 共同部分为 **2,095 / 2,937 行（71.331%）**。

### R-v3.3 K-2 两遍分开申报与 K-3 分母义务

#### 门遍

门遍 `status=complete`、`stop_type=null`，处理 856 个 candidate event，最后为 `EV-000856`。

| 谓词 | full candidates | 存在性差异 | pairing unresolved | 分类学差异 | classification full |
|---|---:|---:|---:|---:|---:|
| P-TEXT | 772 | 100 | 150 | 211 | 311 |
| P-STRUCT | 64 | 55 | 0 | 0 | 9 |
| P-NULL | 20 | 20 | 0 | 0 | 0 |
| 门遍射程 | 856 | 175 | 150 | 211 | 320 |

分区闭合 `856 = 175 + 150 + 211 + 320`，四个 event-ID 集两两不交且并集等于 full。角色门 full=`531=211+320`。`pairing_unresolved=150` 是继续扫描的门收据，不是停线。

#### 分类遍

分类遍另表申报：`status=complete`、`stop_type=null`，full 恰为门遍交出的 320 个 `classification_full` event，最后为 `EV-000854`。

| 谓词 | full | classified | stopped | remaining | 四类分歧 | non_divergence |
|---|---:|---:|---:|---:|---:|---:|
| P-TEXT | 311 | 311 | 0 | 0 | 160 | 151 |
| P-STRUCT | 9 | 9 | 0 | 0 | 9 | 0 |
| P-NULL | 0 | 0 | 0 | 0 | 0 | 0 |
| 分类遍射程 | 320 | 320 | 0 | 0 | 169 | 151 |

分类遍的 P-NULL 零只指“已配对且角色相容”定义域，不能据此外推门遍或其他资料。

#### 存在维 / 配对门覆盖率

计数单位：`candidate event`。

| 卷 | P-TEXT full/processed/remaining | P-STRUCT full/processed/remaining | P-NULL full/processed/remaining |
|---|---|---|---|
| academic-reading | 321/321/0 | 27/27/0 | 1/1/0 |
| writing-example-responses | 51/51/0 | 2/2/0 | 1/1/0 |
| academic-writing | 132/132/0 | 18/18/0 | 2/2/0 |
| listening | 268/268/0 | 17/17/0 | 16/16/0 |

#### 角色维 / 角色门覆盖率

计数单位：`paired event`，不与上一表纵向相加。

| 卷 | P-TEXT full/processed/remaining | P-STRUCT full/processed/remaining | P-NULL full/processed/remaining |
|---|---|---|---|
| academic-reading | 269/269/0 | 3/3/0 | 0/0/0 |
| writing-example-responses | 30/30/0 | 0/0/0 | 0/0/0 |
| academic-writing | 61/61/0 | 3/3/0 | 0/0/0 |
| listening | 162/162/0 | 3/3/0 | 0/0/0 |

两域 × 四卷 × 三谓词共 24 行均 `processed=full, remaining=0`；零格只陈述表头限定射程。

### R-v3.4 K-4 跨遍集合闭合

全局 event-ID 闭合为 `320 full = 320 classified + 0 stopped + 0 remaining`。下表单元格为 `event_count/fragment_count/distinct seq count`；每格实际复算了 event-ID 与 seq 三部分两两不交、并集等于 full，以及 event/fragment count 相加等于 full。

| 卷 | 谓词 | MinerU full → classified/stopped/remaining | Docling full → classified/stopped/remaining | 结论 |
|---|---|---|---|---|
| academic-reading | P-TEXT | 150/153/153 → 150/153/153 · 0/0/0 · 0/0/0 | 150/150/150 → 150/150/150 · 0/0/0 · 0/0/0 | PASS |
| academic-reading | P-STRUCT | 3/3/3 → 3/3/3 · 0/0/0 · 0/0/0 | 3/3/3 → 3/3/3 · 0/0/0 · 0/0/0 | PASS |
| academic-reading | P-NULL | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | PASS |
| writing-example-responses | P-TEXT | 29/29/29 → 29/29/29 · 0/0/0 · 0/0/0 | 29/29/29 → 29/29/29 · 0/0/0 · 0/0/0 | PASS |
| writing-example-responses | P-STRUCT | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | PASS |
| writing-example-responses | P-NULL | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | PASS |
| academic-writing | P-TEXT | 61/61/61 → 61/61/61 · 0/0/0 · 0/0/0 | 61/61/61 → 61/61/61 · 0/0/0 · 0/0/0 | PASS |
| academic-writing | P-STRUCT | 3/3/3 → 3/3/3 · 0/0/0 · 0/0/0 | 3/3/3 → 3/3/3 · 0/0/0 · 0/0/0 | PASS |
| academic-writing | P-NULL | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | PASS |
| listening | P-TEXT | 71/71/71 → 71/71/71 · 0/0/0 · 0/0/0 | 71/78/78 → 71/78/78 · 0/0/0 · 0/0/0 | PASS |
| listening | P-STRUCT | 3/3/3 → 3/3/3 · 0/0/0 · 0/0/0 | 3/3/3 → 3/3/3 · 0/0/0 · 0/0/0 | PASS |
| listening | P-NULL | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | 0/0/0 → 0/0/0 · 0/0/0 · 0/0/0 | PASS |

这是 12 个 `document × predicate` 行，各自展开两 family，共 24 个独立闭合格；family 行不跨 family 纵加。完整 event-ID/page/seq distinct 集已直接入 v3 档案 §6 的 canonical JSON 内嵌副本。

### R-v3.5 K-5 / K-6：两类门收据与角色矩阵

存在性差异只按方向申报：P-TEXT 为“仅 MinerU 有”65 / “仅 Docling 有”35；P-STRUCT 为 3 / 52；P-NULL 为 6 / 14；合计 175。175 张均恰含一侧一个 fragment、另一侧成员数 0，均保留完整配对轨迹。

分类学差异逐张引用 `docs/agent-ops/analysis/2026-08-28-v12-9a-trial-1-transcriber.md:204`：academic-reading 119、writing-example-responses 1、academic-writing 0、listening 91，合计 211，且全在 P-TEXT 角色门射程。零只指上述明确范围。211 个 `taxonomy_id` / event-ID 各自唯一；211 张均完整保留双方 raw role、canonical role、不可交换的 `MinerU-role × Docling-role`、配对证明、seq/page、R-W-N 与 SHA、payload、可选字段、raw/canonical anchor，结构校验 failure count=0。逐张人可读索引在 v3 档案 §4.1/§4.2；逐张完整收据直接位于该档 §6 内嵌 canonical JSON 的 `$.gate_pass.existence_differences[0..174]` 与 `$.gate_pass.taxonomy_differences[0..210]`，不是 Temp 唯一副本。

三张矩阵单位均为 `paired event`，只给整数计数，不设豁免单元或良恶标记。

#### P-TEXT

| MinerU \ Docling | `[heading]` | `[heading,list]` | `[heading,text]` | `[list]` | `[list,text]` | `[text]` | 行合计 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `[heading]` | 96 | 0 | 0 | 0 | 0 | 2 | 98 |
| `[index]` | 0 | 0 | 0 | 2 | 0 | 1 | 3 |
| `[list]` | 0 | 1 | 0 | 1 | 0 | 2 | 4 |
| `[text]` | 5 | 0 | 3 | 194 | 1 | 214 | 417 |
| 列合计 | 101 | 1 | 3 | 197 | 1 | 219 | 522 |

#### P-STRUCT

| MinerU \ Docling | `[table]` | `[visual]` | 行合计 |
|---|---:|---:|---:|
| `[table]` | 2 | 0 | 2 |
| `[visual]` | 0 | 7 | 7 |
| 列合计 | 2 | 7 | 9 |

#### P-NULL

角色门 paired-event 分母为 0，`cells=[]`、计数和 0；只说明本轮该角色门射程。三矩阵合计 `531=522+9+0`；signature 不相等单元格合计 211，等于分类学差异收据数。v3 的 211 与 v2 参照 203 相差 8，不是量级悬殊；v2 配对身份含 role，v3 是同谓词 role-blind 后置读 role，两轮分母不同。v3 内部可证组成是 203 个 equal-position + 8 个 non-equal prefix group，没有把 v3 的 203 擅自当成 v2 的同一事件集。

### R-v3.6 四分类、K-7、射程边界与 K-10 三问

| 分类 | P-TEXT | P-STRUCT | P-NULL | 跨谓词合计 |
|---|---:|---:|---:|---:|
| 文本外形差异 | 0 | 9 | 0 | 9 |
| 归一化差异 | 156 | 0 | 0 | 156 |
| 切分差异 | 2 | 0 | 0 | 2 |
| 真实指错 | 2 | 0 | 0 | 2 |

分谓词四类命中的 page/seq 边界如下；M/D 分别为 MinerU/Docling，完整 distinct 集在 v3 档案 §6。零只陈述四类命中射程。

| 卷 | 谓词 | M event/fragment · page · seq | D event/fragment · page · seq |
|---|---|---|---|
| academic-reading | P-TEXT | 82/85 · 1..46 · 1..314 | 82/82 · 1..46 · 2..344 |
| academic-reading | P-STRUCT | 3/3 · 7..45 · 38..313 | 3/3 · 7..45 · 53..342 |
| academic-reading | P-NULL | 0/0 · — · — | 0/0 · — · — |
| writing-example-responses | P-TEXT | 7/7 · 1..3 · 25..48 | 7/7 · 1..3 · 26..51 |
| writing-example-responses | P-STRUCT | 0/0 · — · — | 0/0 · — · — |
| writing-example-responses | P-NULL | 0/0 · — · — | 0/0 · — · — |
| academic-writing | P-TEXT | 30/30 · 3..26 · 7..151 | 30/30 · 3..26 · 12..153 |
| academic-writing | P-STRUCT | 3/3 · 3..5 · 13..27 | 3/3 · 3..5 · 18..33 |
| academic-writing | P-NULL | 0/0 · — · — | 0/0 · — · — |
| listening | P-TEXT | 41/41 · 3..33 · 5..265 | 41/48 · 3..33 · 12..294 |
| listening | P-STRUCT | 3/3 · 3..30 · 21..248 | 3/3 · 3..30 · 17..278 |
| listening | P-NULL | 0/0 · — · — | 0/0 · — · — |

K-7 如实申报：**本轮未触发 K-3**；320/320 classified，stopped=0、remaining=0。没有 input、integrity、门遍或分类遍停线点。

K-10 三问：

1. **是，部分零产出就是冻结规则射程的直接结果。** role-blind 配对仍限同谓词，跨谓词角色差异不进入角色门；20 个 P-NULL candidate 全落存在维，所以其角色门/分类遍 full 为 0。其余零也只说明明确表头范围内零命中。
2. **是，一族，不是孤例。** 分类学差异 211 张、9 种有序 signature 对、分布三卷；v2 停住时呈现的 `[heading] × [text]` 在 v3 有两张，大量出现的 `[text] × [list]` 有 194 张。存在维 175 与 pairing unresolved 150 也分别在四卷复现；只记形态与方向，不裁归属。
3. **有，若只读四个箭头会误以为覆盖更宽。** “是什么”不覆盖跨谓词角色差异；“长什么样”不覆盖语义等价、图片内容、OCR、非冻结 HTML 语法与未被身份量具配上的跨片关系；“在哪”只覆盖有 pointer identity 证明的落点差异。缺口保留 `needs: claude` / c-3 触发器。

### R-v3.7 K-8、K-11、证据链与允许面收尾

K-8 已处置：v3 档案当前为 828,595 bytes、SHA-256 `4cb86301a8e8869499d36552f3ef218d571d7c42b5b80d2e8578b3ab17c0cdb7`。其中 §6 直接内嵌整份 canonical JSON 原始字节的无损 gzip+Base64 副本（gzip 440,641 bytes / `cb10834b9ea484641feaaf63bb1e0f1f4f148b10bba65803f3db3357bd353163`），回读解码恢复 5,096,178 bytes / `2bfc5b...e0dab` 且与 Temp 现物逐字节相同；§7 直接内嵌实际脚本全文，回读恢复 119,368 bytes / `7a3163...c1f0f` 且逐字节相同。故完整门收据、派生 distinct 集和脚本均已有仓内非易失副本，Temp 不再是唯一副本；确定性重导命令与前置哈希门写在档案 §6.2。本轮没有再执行该命令。

K-11 申报 **3 路只读子审计**，builder 主线程不冒充第 4 路：

| agent path | 时间 / 射程 | 结果 / blocking |
|---|---|---|
| `/root/integrity_scope_audit` | 03:32 快照；收尾 `03:36:48.4914897`；marker/hash/8 输入/整树/allowed surface | PASS；blocking none；仅观察到开工既有 server status M |
| `/root/k2_k4_audit` | 主线程接收 `03:33:38.2751433`；覆盖分母与实际 event-ID/seq 集合运算 | 24 coverage + 24 closure PASS；blocking none |
| `/root/k5_k6_audit` | 完成 `03:34:10.3655880`；211 收据字段关系与矩阵 | failure count=0；blocking none |

原始痕迹位于本次 Codex team conversation log（不在仓内），持久摘要、命令/配方、逐项结果与阻断清单已写入 v3 档案 §5；没有新增未列审计子任务。

零成本自证为 `model_calls=0, api_keys_used=0, cost=0, scope="census_program_only; excludes builder-session reasoning"`；只覆盖普查程序，不覆盖 builder/审计/调度会话推理开销。

证据树按 ordinal 明文配方收尾复算仍为 94,935 files / 3,149,405,801 bytes / 14,624,025 manifest bytes / `efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`，与开工四项相同；8 输入逐项相同；MinerU `uv.lock` 仍为 441,341 bytes / `67c4b42dcd269ffa3e9f05633ce98d6259812bc460f2dd2f8f58cb142e3ee231`。历史 c-1c → c-2 v1 断链如实保留；v1 → v2 → v3 ordinal digest 连续接续。

允许面最终只改 v3 档案与本 `## Result(v3)`。v1/v2 档案分别仍为 `df8278...898de` / `5890ee...1c0cf`；`server/**`、`client/**`、`scripts/**`、`package.json`、迁移、生产码、测试、`docs/agent-ops/INDEX.md` 均零内容 diff。开工既有 `projections.ts M` 的 raw SHA 仍 `c9072a...ed7`，normalized Git blob 与 HEAD 相同。工单前 94,150 bytes / `489d8343...fd51` 保持逐字；顶部、§1–§11、v1/v2 Result 未改。没有 commit / push，也没有翻顶部状态行。

**最终控制状态：`complete`。** 裁定来源为 **Fable**，由调度方转写，不写成 Henry。

## 复核批注(claude 工程调度会话,2026-08-31,独立重算 + 五路终审)

**总判定:通过,零 blocking。** 五路(四取证 + 一对抗)全部 PASS / PASS_WITH_NOTE。

### ✅ 调度方亲手验的(⛔ 非读回执)

| 项 | 做法 | 结果 |
|---|---|---|
| **冻结完整性** | 自读档案字节、自算 SHA | 标记基数 **START=1 / END=1**(⭐ K-1 可复现性修复生效)、offset `3778/17498`、**13,721 字节**、SHA `9c6560c5…b75d` **逐位吻合** |
| **时间线** | 文件系统 CreationTime | 冻结 `02:55:39.489` → 脚本首字节 `02:56:54.881` → 实跑 `03:14:53~55` ⇒ **冻结早于实现** |
| **四个核心计数** | 从 5 MB canonical JSON 自数 | `coverage_rows=24` / `existence=175` / `pairing_unresolved=150` / `taxonomy=211` **逐项吻合** |
| ⭐ **角色对分布** | 自己遍历 211 张收据 | **9 种有序对**;`MinerU[text]×Docling[list]`=**194**;`[heading]×[text]`(v2 停在这条)=**2** |

### ⭐⭐⭐ 本轮头条:**v2 停在了一个占 0.9% 的形态上**

v2 撞停的 `[heading] × [text]` 在全量里只有 **2 / 211 = 0.9%**;真正的大类是 **`[text] × [list]` = 194 / 211 = 92%**。
⇒ ⭐ **「你撞到的第一个,几乎从不是最有代表性的那个」** —— 这是**分母义务的存在理由**,也是**⛔ 按个案设计的终审判词**。
⚠️ 对 c-3 的直接后果:若按角色分歧派点射复核,**92% 的预算会落在同一个形态上**。⛔ **普查不判它良恶,只报分布。**

### ⭐⭐ 两遍制生效:存在域覆盖率 **6.5% → 100%**

门遍 **856 全量走完**,`856 = 175 + 150 + 211 + 320`,四集**两两不交、并集等于 full**;**24 行覆盖率全部 `remaining=0`**;分类遍 320/320,**本轮未触发 K-3(已按 K-7 如实申报)**。

### ⭐⭐⭐ 分母【本身】被从第一性原理验证

终审那一路**从原始 8 份文件独立重建**:自数 fragment **808 + 874 = 1,682**;三谓词划分与 24 行 `expected_seqs` **逐 seq 相等,0 mismatch**;事件重建 **772 + 64 + 20 = 856**;**exactly-once 双向验**(1,682 槽位 / 1,682 distinct);⭐ **705/705 张带 seq 的收据成员集合逐一命中**,残差**恰为** 151 个 `non_divergence`;四条独立路径对 856 互相吻合。

### ⚠️ 对抗路抓到取证路的三处盲区(连续第三轮)

1. ⭐ **档案自身「冻结程序 ↔ 实跑实现」不一致**(C1 tie-break tuple 字段展开顺序)。本轮无实质影响,**但取证路手里同时握着两份互异实现却没报**。⇒ 立条:**SHA 只证明【冻结段没被改】,⛔ 不证明【实现忠实于它】。**
2. ⭐⭐ **「零命中 ≠ 不存在」连续第二轮在复核装置内复发** —— 取证路 8 个文件名**全部硬编码**,只对着自报清单核 ⇒ 证的是「它点名的我读了」⛔ 不是「目录里只有这些」。⚠️ **而这一轮该法已逐字内联进提示。** ⇒ 立条:**提示 ≈ 文档,不是门;原则靠记,动作靠抄。**
3. ⭐ **C3 的 `m:n` 条款本轮一次都没执行**(全语料无双侧 >1 的双边连通分量)⇒ 立条:**未触发 ≠ 正确,只是未经检验。**

### 📌 已知瑕疵与射程限制(随铸段申报)

- ⚠️ **§4 逐条索引表编码破损**:§4.1 的 175 行「方向」列、§4.2 的 211 行 `×` 算符退化。**实体数据在 §6 JSON 里完好。**
  ⇒ **总部裁定**:⛔ 不单开轮,**「从 canonical JSON 重渲 §4 两表」并入 M2/c-4 收口单**(判据:**必须从 JSON 出、行数 175/211 对账、⛔ 不许手改**)。理由:**破损列不该以永久面貌入史**,而档案 c-4 时才进版本历史。
- **K-8 的 5 MB JSON 归宿**(入档 or digest+配方定版)⇒ **划给 c-4 决策**。
- **151 个 `non_divergence` 的逐事件成员 seq 未进 JSON**(只有 event_id + 聚合)⇒ **已知射程限制**,仅凭 JSON 无法逐事件复核。
- **P-TEXT 的 772 依赖同一 pinned 运行时**(CPython 3.14.2 / 同一 difflib)⇒ 是「**同一 diff 引擎下可复现**」,⛔ 不等于「换引擎也是 772」。
- 「3 路审计」**只有汇总表入仓,原始 transcript 在仓外** ⇒ **审计【主张】留痕,审计【过程】不可仓内独立复核**(档案如实披露)。
- 三张各 24 行但主键不同的表(`coverage_rows` / `event_consumption` / `cross_pass_closure`),单位与分母互不相同 ⇒ **误并风险**。

### ⭐ 记 builder 六功

①不硬塞 ②不作弊 ③不改规则重跑 ④**冻结早于实现**(自发达标)⑤**自曝 exit code 不一致却拒绝为追码重跑** ⑥⭐ **中断后主动对齐开工回执** —— 明写「上句『尚未实跑』**在开工写下时为真,现已过期**」并记下中断点与原因(**是模型容量,不是判据失败**)。
📌 另记:**digest 断链本可据「三项计数相同」宣称连续性,它仍如实记为断链** —— 总部原话:「**可以蒙混而选择如实,这是收据文化立住了的标志**」。
