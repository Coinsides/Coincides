> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready(§232 裁定⑤预批件,F3 段二收口后自动放行)
> **单号**: VPS-F5 · Agent 源料发现低配单(A-02 低配版)
> **上游**: F3 段一侦察第四问+Tester round-01 A-02/C-02;完整向量/FTS 版=独立单候裁⛔混入

# VPS-F5 · Agent 源料发现低配单

## 一 · 修一:search_documents 增 Source 路

- 对 Source 来源的 material fragment 做 LIKE 检索 + 按 Source display_name 匹配;结果带 `projection_note_id`,让 Agent 自然接既有 `read_note` 工具读全文;
- 结果形状与 documents 路并列清晰(来源可辨),⛔伪装成 documents 行;
- 无材料/未物化时结果为空属正常,⛔报错。

## 二 · 修二:system-prompt 误导句修正

- `agent/system-prompt.ts:38` 一带:删除「Source Library 内容检索不到/经材料库上传」的死指引;改为如实描述现有能力(可按名称/内容检索已放置的 Source 材料,可用 read_note 读其投影笔记);
- 全文巡一遍 system-prompt 中与本次能力变化相矛盾的句子,一并对齐,逐处申报。

## 三 · 验收与测试面

- 服务端定向:executor/search 相关+新用例(Source 命中带 projection_note_id/documents 行为不变/空库不报错);正门运行器;
- 阳性对照一处(Source 路摘除→新用例独红);
- ⛔真实模型调用(工具层 mock);真机验收归 Tester round-02 的 R2-02。

## 四 · 纪律

照抄现役全套(⛔git 写/⛔.env 值/⛔用户库/⛔动锁文件/⛔安全对抗类用例/合成值规矩/措辞中性)。

## 五 · 回执协议

本文件尾部 `## Result` 五件套;证据 `docs/audits/2026-11-01-vps-f5-builder/`;完工短讯。

## 六 · 不在射程

向量/FTS 检索版(独立单候裁);Agent 工具新增;UI 改动;文案批其余。


## Result — 2026-11-01 · 临时工程对话1

**执行状态**:`done`,交工作树,未 commit。

### 写点

| 文件 | 改动 |
|---|---|
| **新** `server/src/services/agentSourceSearch.ts` | `searchSourcesForAgent`:只查已物化的 Source,按 display_name 与投影块正文做 LIKE。查询按空白和标点切词(≥2 字符,最多 8 个),按命中词数排序,名称命中加权。每个 Source 至多 3 条片段(≤500 字,带页码),至多 5 个 Source。`course_id` 走项目放置过滤;`file_type` 按原件扩展名过滤。纯读,无副作用 |
| `server/src/agent/tools/executor.ts` | `search_documents` 结果新增**独立的** `source_results` 字段(`source_record_id / title / projection_note_id / course_id / course_name / matched_on / snippets`),与 documents 的 `results` 并列,⛔混入 documents 行;两边都空时返回 `{results:[], source_results:[], message}`,不报错 |
| `server/src/agent/tools/definitions.ts` | `search_documents` 工具描述补一句 source_results 与 read_note 的接法 |
| `server/src/agent/system-prompt.ts` | 见下「逐处申报」 |
| `server/src/__tests__/v14ContextHint.test.ts` | 两条锁旧句的用例改为锁新句,并加 `doesNotMatch` 守卫,防旧死指引回流(申报) |
| `server/src/__tests__/v14AgentKnowledgeProjection.test.ts` | 提示词冻结用例按既有 C2 / C4a 先例登记「F5 amendment」:恢复旧第 38 行、减去新增句后,哈希仍是**改前基线** `44affa4b…`,证明本单只改了这两处(申报) |
| **新** `server/src/__tests__/vpsF5SourceDiscovery.test.ts` | 4 条,见下 |

**偏离工单措辞的一处(申报理由)**:工单写「对 Source 来源的 material fragment 做 LIKE」,我改为**直接检索投影块**(fragment 正是从这些块切出来的)。理由:
- F3 段二的 fragment 是打开项目页时才惰性生成的。用户若从首页直接问,而还没打开过项目页,fragment 不存在,Agent 就找不到;
- `search_documents` 是读工具,不应顺手触发 material 生成(写)。

直查投影块不依赖惰性派生,也覆盖只在 Library、未放进项目的 Source。

### system-prompt 逐处申报

1. **第 38 行**(重写):删掉「互不相通 / 你今天检索不到 Source Library / 建议用户经材料库上传」这条死指引,改为如实描述:一次检索两种来源;documents 用 get_document_content 读;已抽取的 Source 在 source_results 里,用 read_note 读 projection_note_id 全文;关键词匹配,非语义;都找不到时如实说明,不要建议换入口上传。
2. **Document Questions 段**(第 188 行一带,增补一句):source_results 的含义与 read_note 的接法。
3. **巡检后保留的句子**:
   - 第 46 行「经材料库门提交的 material_map / organized_note / material_reconciliation 可在项目页处理」:仍成立,F3 后 Source 也会喂进项目材料,与本次能力不矛盾;
   - 第 78、130、137、145、191–193 行「Available Documents / 读文档 / 文档页数」:讲的是 documents 路径,本次能力不改变它们。
4. **预算**:产品手册有 ≤2000 的 token 估算上限(`v14ContextHint`)。首版措辞超到 2081,我**收紧措辞**,未放宽上限。

### 测试(实跑实报)

- **新文件 4/4**(工具层,经真实 `executeTool`;无任何 provider 钥匙,documents 路的语义检索自然跳过,⛔模型调用):
  1. 自然语言问句按正文命中,带 `projection_note_id`,且该 id 可直接交给 `read_note` 读到全文;
  2. 按名称命中;documents 结果列表照旧且不带 Source 字段;
  3. 课程过滤排除其他项目的 Source;未抽取完成的 Source 不返回;
  4. 空库返回两个空列表与提示,不报错。
- **阳性对照**:Source 路摘除(`sourceResults` 恒为空)→ 用例 1–3 红,4 绿(空库语义本就不依赖 Source 路)。证据 `docs/audits/2026-11-01-vps-f5-builder/positive-control-source-path-removed.tap`;已还原。
- **回归**:Agent 相关 13 文件(ContextHint / ReadTools / LoopRobustness / AgentRouteLifecycle / Claim×2 / TurnIdentity / ProposalUnification / KnowledgeProjection / WriteDoor / F3 桥 / providers)**217/217**,证据 `f5-server-targeted.tap`。
- **类型检查**:87 条 = 基线。`definitions.ts(12,37)` 那条既有错误在 F3 基线日志里就有,不是本单新增。证据 `server-tsc.log`。

### 已知局限(给 Tester round-02 的 R2-02 参考)

- 关键词检索,不懂同义词与改写。中文问句若不含空格,会整句作为一个词去匹配,命中率偏低;用名称或原文里的词问更容易命中。向量 / FTS 版仍是另立单。
- 只返回已抽取完成的 Source。

### 环境申报

两次 Python 内联脚本因转义问题失败(断言先行,未写入任何文件),改用 Edit。未读 `.env`;无 git 写操作;无真实模型调用;无用户库接触。

## Main_Designer 收口 — 2026-11-01

- **偏离核准**:直查投影块优于工单原措辞(读工具零写副作用/不依赖惰性生成/覆盖未放置 Source),记为设计改良非偏差;
- **实质验收**:HQ 复跑新文件+ContextHint+KnowledgeProjection+ReadTools **48/48**;system-prompt diff 逐句核阅(死指引已重写为如实描述,source_results→read_note 接法清楚);阳性对照与 217/217 邻接照单全收;
- **两处锁定用例改动核准**:ContextHint 换锁新句+防回流守卫;冻结哈希走 C2/C4a 补遗先例,减法验证基线不变——出处链完整;
- **token 预算处置记正分**:收紧措辞而非放宽上限;
- F5 闭合,随收口部署;R2-02 执行注意事项(关键词检索局限)已转 Tester。
