> **状态 (Status)**: draft
> **层 (Layer)**: 分析 / Analysis（血统冗余调研 · 待 Fable 抽检）
> **日期 (Updated)**: 2026-08-21
> **权威 (Authoritative)**: 否 —— **调研，不代拍**
> **委托**: Fable（Henry 提出：Codex 周额一天用掉 75%，要备胎）
> **分工**: 价格与实耗由 **Fable 亲查**（`claude-log/2026-08-21.md` 条目 2）；本文**不重查价格**，只引用。本文负责能力画像、接入兼容性、订阅/API 关系。

# builder 血统冗余调研

## 0. 取证纪律

- **外部事实全部为 2026-08-21 实时检索**，非训练知识（我的知识截止早于现价与 Spark 发布）。
- 每条**标来源**（文末统一列）；**能取到官方页的取官方**（订阅/API 关系一节即直取 Google 官方开发者文档）。
- **查不到当前值的标「未核」，不填记忆里的数。**
- **推测与事实分开标注。**

---

## 1. ⚠️ 头号发现：**「5.6 用完 → 切 Spark」这个顺序，文档记载是不成立的**

> **这条直接打在 2026-08-21 今晨定的配额顺序上。已于查到时立即预警，未等本文完稿。**

### 1.1 官方口径

OpenAI 对 Codex-Spark 的公开说明：研究预览期间 **Spark 有自己的 rate limit，用量不计入标准额度**（可能随需求调整）。

### 1.2 实际实现（三条独立证据，均已亲取原始页面）

| 证据 | 内容 | 状态 |
|---|---|---|
| **openai/codex #19868**（开于 2026-04-27） | 「Global weekly limit **0%** 剩余、**Spark weekly limit 100%** 剩余」，使用 Spark 仍报 `You've hit your usage limit.` | ⛔ **closed as not planned** —— 不是已修，是**不打算修** |
| **openai/codex #20122** | 同一症状：主额度耗尽时 Spark 被挡，且「计量器显示的剩余 Spark 额度实际用不了，是误导」 | closed as **duplicate of #19868** |
| **openai/codex #33216** + OpenAI 社区多帖（4–7 月，持续到 8 月） | Spark 周额表在**成功使用后仍显示 100%** —— 计量器本身不准。另有第三方源码复核称**未找到独立的 Spark 配额/计费实现** | 持续报告 |

### 1.3 结论与它的含义

**官方口径与实际实现不一致。** 实际行为是：**主额度耗尽时，Spark 一并被挡，无论 Spark 计量器显示多少。**

> ⇒ **「5.6 用完再切 Spark」的问题在于：你需要它的那一刻，正是它不工作的那一刻。**

### 1.4 ⚠️ 我的自我更正

昨晚我把 Spark 归类为「**额度备胎，不是故障备胎**」，只否了后者。

**那个归类是错的，我收回。** 按上述证据，它**连额度备胎都不算** —— 它与主力共用的不只是账号与 CLI，**还共用那道配额闸本身**。

我当时的推理形状是对的（「同门共用同一根绳子」），但**我只数到了账号和 CLI 两根绳子，没数到配额闸这根**。这是同一族错误的又一次：**用一个不完整的清单去回答「共用了什么」。**

### 1.5 边界声明与建议

⚠️ **证据是文档与社区报告（最新到 8 月），我没有实测本账号。** 行为**可能**已静默修复而 issue 未更新。故本条是「**文档记载不成立 + 建议实测确认**」，不是「已确证在本环境不工作」。

**建议（成本极低，且有时间窗）**：现在处于周额 **75%**，**建议在未到 100% 时主动验一次** ——

1. 查 `/status`，看主额度与 Spark 两个计量器**是否独立走数**（#33216 称 Spark 表可能压根不动）；
2. 方便时用 Spark 跑一个小单，确认当前是否真的独立计费。

> **在 75% 验，比在 100% 验便宜得多** —— 后者已经没有退路了。

---

## 2. Spark 能力画像

### 2.1 事实（官方 + 报道）

| 项 | 内容 |
|---|---|
| **定位** | **延迟优先的服务档位**（latency-first serving tier），作为 GPU 服务的补充 —— 不是「更强」，是「更快」 |
| **硬件** | 跑在 **Cerebras Wafer Scale Engine 3** 上，为低延迟推理定制的加速器 |
| **上下文** | **128K**（发布时） |
| **模态** | **纯文本**（text-only） |
| **状态** | **研究预览**（research preview） |
| **API** | **无 API，仅 Pro 套餐经 Codex 可用**（引 Fable 条目 2：「买不到」） |

### 2.2 与 5.6 Sol 的落差，以及它对工单形状的硬约束

引 Fable 条目 2 的实耗数据：**builder 大单 100–144 万 tokens**（03 主单 108 万 / 05.1 144 万），reviewer 30–64 万，小单 17 万。

| | Sol（5.6） | Spark |
|---|---|---|
| 上下文 | **1M** | **128K** |
| 取向 | 能力优先 | **延迟优先** |
| 模态 | — | **纯文本** |

> ⭐ **128K 不是「小一点」，是一条硬边界。** 单场累计百万 token 的大单，其单次上下文占用远小于累计值，但 **03/05 两条链的复核轮反复需要「通读全链 + 逐条重放旧 witness」** —— 那是上下文密集型工作，不是 token 密集型。
>
> **⇒ 与 Fable 的假设一致，但理由要更精确**：Spark 不适合大单，**不是因为它「弱」，是因为它的上下文装不下需要一次看全的东西**。

### 2.3 岗位映射（我的判断，标明确定度）

| 工单类型 | 是否适合 Spark | 确定度 |
|---|---|---|
| **机械级修正轮**（次序 / 身份 / 分派 / 措辞 —— 见 05 链二级复盘的分级） | ✅ 适合。改动面窄、上下文需求低、延迟优势直接兑现 | **中高**（有分级依据，无实测） |
| **小单**（17 万量级） | ✅ 适合 | 中高 |
| **大单 / 设计级** | ❌ 不适合（128K 装不下全链） | **高** |
| **复核岗** | ❌ **强烈不建议** | **高** —— 见下 |

> ⚠️ **复核岗不能用 Spark，理由比「能力不够」更硬**：复核的核心动作是**通读全链 + 原样重放旧 witness + 跨条耦合扫描**（03 链五轮 / 05 链九轮都是这么收敛的）。**这是上下文密集型工作的定义。** 128K 会强迫它分段读，而**分段读正是「逐条核对形制的固有盲区」的放大器** —— 我在 03 链二级复盘里补的那条漏合取，正是逐条切开导致的。
>
> 且复核最贵的失败模式是**假绿**：跑不动会被发现，看漏不会。

### 2.4 建议的实测方法（低成本，有黄金答案）

**拿一张已闭环的机械级修正单让 Spark 重跑，与当时 5.6 的实际产出比对。** 03.3 / 05.7 都是现成候选 —— 有完整工单、有 reviewer 判定、有最终实现，**黄金答案已在 repo 里**，比设计新基准便宜得多。

---

## 3. Grok / Gemini 接 Codex CLI 自定义 provider

> 范围：**只评复核岗**（builder 岗已锁 OpenAI 家 —— Henry 的「代码风格一致性」硬约束）。

### 3.1 接入不是「填个 base_url」

| 事实 | 含义 |
|---|---|
| Codex CLI **硬编码假设**：`OPENAI_API_KEY` 另一端说的是 **OpenAI 的 Responses API** | 不是通用 OpenAI-compatible chat completions |
| 直接指向 `api.anthropic.com` / `generativelanguage.googleapis.com` → **401 或畸形的 function-call 块** | **直连不通** |
| 通行解法是在前面架一个 **AI 网关**（翻译请求体与 tool-call JSON，再流回 Codex 能渲染的响应） | **多一个自建/第三方组件** |

### 3.2 ⚠️ 自定义 provider 是**全覆盖**，不是扩展点

检索到的一条明确警告：经 OpenRouter 等走自定义 provider，会**把正常的 Codex/OpenAI 模型目录从流程里移除** ——「**看起来像扩展点，行为上是完全覆盖**」。

> ⇒ **这直接影响「builder 用 5.6 / 复核用 Grok」的同装并存**。不是换个参数就能分岗，需要配置隔离（不同 config profile / 不同 CODEX_HOME 或等价手段）。**具体形制未核**，见 §6。

### 3.3 工具调用可靠性

检索到的说法：**非 OpenAI 模型必须支持 tool use**，因为 Codex 的文件操作、终端命令、代码编辑全靠 function calling；而**「可靠的工具调用」被限定在少数模型上**（检索来源点名 Claude Sonnet / GPT-4o / GPT-5.4 / Gemini 2.5 Pro 一类）。

> ⚠️ **该清单明显滞后于当前模型代次**（未含 Grok 4.6 / Gemini 3 Pro），故 **只能作为「这是个真实门槛」的证据，不能作为「哪家可靠」的结论**。标 **未核**。
>
> **这条是本次评估的真正门槛，不是价格。** 「能连上」与「agentic 循环能稳定跑」是两件事：工具调用格式、并行 tool call、长会话下的指令遵循，任一处不稳，复核岗就废 —— **而复核岗最贵的失败模式是假绿，比跑不动更糟**。

---

## 4. 两家订阅是否含 API 额度 —— **都不含**

### 4.1 Gemini（**官方文档原文，已亲取**）

> **"Google AI plan benefits for developer usage apply only within the Google AI Studio web interface. Direct use of the Gemini API (such as using API keys or external applications) is billed and managed separately."**
>
> **"Google AI plans for AI Studio are separate from Gemini API usage tiers."**

⇒ **Google AI Pro / Ultra 订阅不含 API 额度。** 订阅覆盖的是 AI Studio 网页界面；**直接 API 调用另行按量计费**。

### 4.2 Grok / SuperGrok

SuperGrok **不含 API 额度**。xAI API 需**另开开发者账号**（`console.x.ai`），**按 token 单独计费**。SuperGrok、X 上的 Grok、xAI API 是**三个独立的接入与计费面**。

> 来源级别：**二手汇总**（多个定价指南口径一致），非 xAI 官方页原文。标注为**二手一致**，建议采纳前由 Henry 在 console.x.ai 亲核。

### 4.3 ⭐ 一个反直觉的结论

直觉是「套餐内更省心」。但对**备胎**这个用途，结论正好相反：

```text
套餐内（Spark）    会用完；且与主力共用同一道配额闸（§1）
                  ⇒ 失效时刻与主力重合 —— 这是备胎最不该有的性质

API 按量（Grok/Gemini）  不会用完，只会花钱
                  ⇒ 主力挂掉时它一定还在
```

> **备胎的价值不在便宜，在于「与主力不共享失效模式」。** 按量计费**恰恰是优点** —— 它把「额度耗尽」这个风险换成了「花钱」这个可控成本。
>
> 引 Fable 条目 2 的预算建议（$300–500 预留，约 1.5–2 单位溢出走 Grok/Gemini 坐复核岗）—— **本节为该建议提供了一条独立理由**：不只是「便宜够用」，是**它在结构上才是备胎**。

---

## 5. 分层建议（**不代拍**）

| 岗位 | 主力 | 备胎 | 理由 |
|---|---|---|---|
| **builder** | **5.6 Sol** | **Spark**（机械级 / 小单） | Henry 硬约束：代码风格一致性，混血统写同一代码库得不偿失。⚠️ **但 §1 的配额闸问题使 Spark 的备胎资格存疑，须实测** |
| **复核** | **5.6 Sol** | **Grok 4.6 / Gemini 3 Pro（按量 API + 网关）** | 异血统在复核岗是**独立性**不是分叉（复核不产出代码，产出判断）；且按量计费不与主力共享失效模式（§4.3） |

**排序建议（复核岗备胎）**：**两家并列，未分先后** —— 决定性变量是 §3.3 的工具调用可靠性，而那条我**未核到当前代次的可靠数据**。**在实测前排序等于猜。**

> **⚠️ 一处必须显式记录的缺口**：`builder` 岗的**故障类风险（账号锁、CLI 版本死锁、区域不可达）目前无覆盖** —— Spark 同门共用全部这些绳子，而第三方线已按 Henry 裁定只用于复核岗。
> **这不是反对该裁定**（代码风格一致性是真约束），而是**该记成「已知不覆盖」而不是留白**。2026-08-19 那次 builder 首启失败（账号档位与 CLI 版本耦合成死锁）就是这类风险的实例。

---

## 6. 未核清单（诚实声明）

1. **Spark 配额闸在本账号的当前实际行为** —— 证据为文档与社区报告，**未实测**。建议按 §1.5 在 75% 时验。
2. **Grok 4.6 / Gemini 3 Pro 当前代次的 Codex 工具调用可靠性** —— 检索到的可靠模型清单明显滞后，**不足以支撑排序**。
3. **同一 Codex 装机内 builder / 复核分用不同 provider 的具体配置形制** —— 只核到「自定义 provider 是全覆盖」，**未核到隔离方案**。
4. **SuperGrok 不含 API 额度** —— 二手来源一致，**非官方页原文**。
5. **网关选型**（自建 vs 第三方如 CLIProxyAPI / opencodex 一类）—— 本次未评估；⚠️ 注意它们会经手 API key 与全部代码上下文，**属供应链信任面**，采纳前须单独评估。

---

## 附：来源（均为 2026-08-21 检索）

- [Introducing GPT-5.3-Codex-Spark | OpenAI](https://openai.com/index/introducing-gpt-5-3-codex-spark/)
- [openai/codex #19868 — Spark blocked when global weekly limit reached（closed as not planned）](https://github.com/openai/codex/issues/19868)
- [openai/codex #20122 — Spark blocked by general quota despite separate meter（closed as duplicate）](https://github.com/openai/codex/issues/20122)
- [openai/codex #33216 — Spark weekly limit stays at 100% after usage](https://github.com/openai/codex/issues/33216)
- [OpenAI Developer Community — Codex app blocks Spark despite remaining Spark usage](https://community.openai.com/t/bug-codex-app-blocks-gpt-5-3-codex-spark-even-though-spark-weekly-usage-remains/1377045)
- [OpenAI unveils GPT-5.3-Codex-Spark — TechInformed](https://techinformed.com/openai-unveils-gpt-5-3-codex-spark-a-real-time-coding-model/)
- [Google AI plans | Gemini API | Google AI for Developers（官方，§4.1 引用原文）](https://ai.google.dev/gemini-api/docs/google-ai-plans)
- [Using OpenAI Codex CLI with Multiple Model Providers（网关必要性与 Responses API 硬编码）](https://www.getmaxim.ai/articles/using-openai-codex-cli-with-multiple-model-providers-using-bifrost/)
- [Codex CLI Multi-Provider Setup via config.toml（自定义 provider 是全覆盖）](https://ofox.ai/blog/codex-cli-custom-model-providers-byo-setup/)
- [Grok Pricing 2026（SuperGrok 与 xAI API 分离计费，二手）](https://felloai.com/grok-pricing/)

**价格与实耗数据**：引 `claude-log/2026-08-21.md` 条目 2（Fable 亲查），本文未重查。
