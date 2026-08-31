> **状态 (Status)**: ready(v2 —— v1 轮已收工并复核通过[七路零 blocking],档案原样封存为附录;§11 按总部 2026-08-31 裁定补为 v2 工单:配对门 + 射程申报 + K-3 牙齿不拔 + 存在域占位挂 c-3)
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
