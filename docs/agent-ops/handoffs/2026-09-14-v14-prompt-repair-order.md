> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · prompt 修缮单(四路审计 prompt 项全量清偿)
> **上游**: claude-log §147 审计记录+`analysis/2026-09-14-mr-zero-anatomy-and-redesign.md`;审计带行号证据,以现物复核为准(行号可能因针一交付漂移)

# prompt 修缮单

**性质**:system-prompt.ts 按审计发现全量修缮。⛔改工具/注册表/机关;纯 prompt+定向测试。

## 一 · 修缮清单(逐项,议毕申报)

1. **`week_of` 遗物**(high):调度协议引用的参数不存在——改为 `from_date`/`to_date`(与 definitions 现物一致);
2. **extra_notes 用 number_input 装自由文本**(high):collect_preferences 无自由文本型——从表单删除 extra_notes,特殊约束在对话步收集(⛔擅加新题型);
3. **四读器零提及**(high):产品说明下新增「感知能力」小节——read_note(逐页,next_page_index 翻页)/read_board(免截图读板)/read_content_groups/read_annotations_relations 各一句"何时用",加截断旗纪律(truncated/has_more 要看);~150 token 预算;
4. **"MANDATORY no exceptions"自相矛盾**(high):改题为"生成批走提案优先",直写豁免动词列为规则⛔例外;全文清剿残余四处"submit for review/approve"话术→统一为"请学生在对话中确认或驳回+说明可见性限制"口径;
5. **产品说明按门分域**(medium):材料三型"可在项目页处理"改为按**提交门**分域——材料库门提交的在项目页;凡 chat 门提交(含 organized_note)现无界面(收件箱单落地后再改此句,申报现状措辞);
6. **changelog 口吻遗物**(medium):"now/replaced/v1.7.3"改现在时陈述,删对旧版 prompt 的比较句;
7. **通用错误自纠契约**(medium):宣称纪律下加三行——工具报错=读结构化错误→修参→本轮预算内重试一次;同一调用两败=停止并如实报告;仪式类 400/409=走确认流(漂移则重新复述)⛔当故障;
8. **NEVER 锁时刻 vs 日历模式矛盾**(medium):规则处就地限定作用域(Time Block 模式不锁分钟;Calendar Event 模式学生自选显式时刻,可调);
9. **organized_note 工作流条**(low):Key Rules 提案清单补一行(course_id+源选择,⛔自写 blocks);
10. **energyLevel 死参数**(low):删参数+orchestrator 对应查询(宪法 §2 紧张源);
11. **重复段合并**(medium,量力):卡生成/学习规划/文档问答各收敛为单一权威段+紧凑表,删散落复述——申报删减 token 数;⛔改变任何行为语义。

## 二 · 验收

三端 typecheck/build+全门绿;定向:①关键词断言(week_of 消失/from_date 在/四读器名在/错误契约在)②既有 prompt 测试全绿③静态体 token 估计前后对比;server 全量+client 全库(Python/MinerU 环境红按例申报);证据落 `docs/audits/2026-09-14-prompt-repair-builder/`;git/secrets HQ 收口。

## 三 · 禁区与申报

⛔工具/注册表/机关/新 API;⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符。Result:逐项修缮申报+token 前后对比+测试数字+未做项。冲突停线举证⛔自作主张。


## Result

> **From**: codex(builder)
> **日期**: 2026-09-14
> **结果**: 11 项修缮完成；Python/MinerU 环境红与 git/secrets 留 HQ，不冒充全门放行。

### 逐项修缮申报

| # | 修缮结果 |
|---|---|
| 1 | get_time_blocks 的 week_of 已清除，学习规划及重排使用 from_date/to_date，与现物 definitions 一致。 |
| 2 | extra_notes 从 collect_preferences 表单移除；学习目标、截止日及特殊自由文本约束在 Step 1 对话中收集。题型未扩展；日期参数保留 date_config.min_date/max_date 全路径。 |
| 3 | 产品说明新增「感知能力」，四读器逐一说明用途；read_note 按 next_page_index 翻页，检查 truncated/has_more。明确其他读器无翻页参数，剩余截断必须披露；next_page_index=null 不被误当成完整读取。新节估计 142–146 token，符合约 150 预算。 |
| 4 | Key Rules 改为「生成批走提案优先」，生成工作按类型列紧凑表；单个明确请求任务和原有容器/调度直写动词另列正式规则。清除 MANDATORY no exceptions 及散落 review/approve 旧指引；统一对话确认/驳回与可见性、应用限制。 |
| 5 | 按 Henry 本轮明确现状指示，材料库门提交的 material_map/organized_note/material_reconciliation 可在项目页处理；chat 门提交（含 organized_note）在 Agent 面板「提案」收件箱处理。保留 chat 确认不等于已应用、apply 必须人门，以及不可用型和 material_reconciliation 仅标记复核的限制。 |
| 6 | 清除 v1.7.3、now enhanced、replaced、now uses 等旧版比较与 changelog 口吻，改现在时事实陈述。 |
| 7 | 宣称纪律新增三行：读结构化错误→修参→本轮预算内重试一次；同一调用两次失败停止并如实报告；仪式 400/409 走确认，清单/对象漂移重新复述等待确认。只修提示词契约，未改错误执行机关。 |
| 8 | 宪法第三条、NEVER 列表和排期规则三处就地限定 Time Block 不锁分钟；Calendar Event 由学生显式选择，时间可建议、可调整。 |
| 9 | organized_note 行明确 course_id+源选择：document_ids/source_material_ids/segment_ids/source_scope_ids/source_board_id，可选 note_title；不得自写 blocks。 |
| 10 | 删除 buildSystemPrompt.energyLevel、orchestrator 的 EnergyRow、daily_statuses 查询与传参。与开工快照逐字节对照证明 orchestrator 仅有上述删除，无循环/工具/机关改动。 |
| 11 | 卡生成、学习规划、文档问答分别收敛到一个权威章节+紧凑表；删除散落 playbook、MWF/排期/双模式重复段。保留模板字段、deck/section/来源 metadata、先决依赖、目标层级、偏好等待、TB 缺口与拒绝 fallback、100 页上限、片段不足继续读正文、任务卡关联和 L1 流程。 |

源码范围：server/src/agent/system-prompt.ts、server/src/agent/orchestrator.ts；测试范围：既有 server/src/__tests__/v14ContextHint.test.ts。其余为本单审计证据与 Result 状态的生成索引同步；未修改工具、注册表、产品机关、API 或说明书。

### Token 前后对比

口径：以空姓名/日期/列表、默认语言、L1 关闭渲染提示词，作为静态体的可复算代理；汉字每字 1–2 token，其余 Unicode 字符每 4 字符约 1 token。无 tokenizer 新依赖、无真实 provider 调用；数值是估计，不是模型实测账单。

| 范围 | 修前 | 修后 | 净变化（同一估算法配对） |
|---|---:|---:|---:|
| 静态体代理 token | 6556–7382 | 4939–5874 | 减少 1617（下估）/1508（上估），约 24.66%/20.43% |
| 工作流区域 token | 5292–5490 | 3379–3545 | 减少 1913/1945 |
| 全体字符 | 23745 | 16949 | 减少 6796 |
| 感知能力新节 | — | 142–146 token | 在约 150 预算内 |
| 产品说明 | — | 921–1576 token | 既有 2000 上限通过 |

工作流区域含 Key Rules 至卡生成及旧散落文档问答段；其净变化包含本单其他授权修缮，不冒充单独隔离第 11 项所得的因果 token 节省。明细与重算脚本：[token-estimates.json](../../audits/2026-09-14-prompt-repair-builder/token-estimates.json)、[measure-prompt.mjs](../../audits/2026-09-14-prompt-repair-builder/measure-prompt.mjs)。

### 测试数字与证据

- **定向 prompt**：既有 v14ContextHint.test.ts 全部 **21/21 通过**（原 13 项保留并按本单更新旧句/旧整篇字节锁，新增 8 项普通静态契约）；六组 Identity+动态 Context SHA256 基线、L1 分支和原有路由/provider stub/SSE/持久化测试保留。首轮 20/21 的失败是截断文案已校正而正则仍锁旧句，同步断言后两次定向均 21/21，最终逐文件全量亦通过。
- **server 完整覆盖**：server/src + server/scripts 实际发现并执行 **84/84 文件**，逐文件独立运行既有测试入口，清单相等、无重复、无排除；**82 文件通过，787 个 TAP 结果中 785 通过、2 失败，0 skipped/cancelled/todo**。根 scripts/generate-tool-face-manifest.test.ts 另在运行门执行 **10/10 通过**。加载失败文件的未枚举子测不计入伪造分母。
- **两项环境红**：v2SourceMineruWiring.test.ts 加载时 spawnSync python.exe ENOENT；v2SourceRegionCells.test.ts 的既有真实 MinerU 用例 parser_failure / exit 101，虚拟环境引用的 Python 无法启动。原样保留证据、未安装/修理 Python/MinerU，按本单留 HQ。
- **聚合运行异常单列**：前两次相同 84 文件聚合运行分别 762/765、775/778（均 3 红），其中材料库文件因 Node 22 测试 IPC 报 “Unable to deserialize cloned data due to invalid or unsupported version” 导致不同数量结果未送达。材料库单独复跑 **59/59**；最终全 84 文件逐文件复验中也 **59/59**。原聚合失败记录完整保留，不改判为绿、不把丢失结果相加。仅调整本单证据运行方式，仓库测试机关未改。
- **client 全库**：**171 文件、1746/1746 通过**；零排除。
- **三端检查**：shared/server/client 的 typecheck+build 共 **6/6 通过**。最终文字收尾另跑 server build，结果见 closeout 证据。
- **运行验证门**：verify:v2-bn8-runtime 中非 git/secrets 的 **21/21 子项通过**（另补 shared build）。包括 wiring、tech-debt、client 全库、registry 5/5、manifest 10/10、parity 10/10、各边界门、model 60 groups、performance 5 场景、server/client build、docs:check。各测试范围有交叉，不相加作独立用例数。总命令因尾部包含 git 与 secrets 未直接执行；这两项按 §二由 HQ 收口。
- **范围证明**：[scope-evidence.json](../../audits/2026-09-14-prompt-repair-builder/scope-evidence.json) 验证 orchestrator 对开工快照只有第 10 项的精确删除；提示词日期/四读器/截断必需词与旧词消失均通过。
- **证据入口**：[validation-summary.json](../../audits/2026-09-14-prompt-repair-builder/validation-summary.json) 汇总全部最终数字、执行清单与各模式 summary/log 指针；[run-validation.mjs](../../audits/2026-09-14-prompt-repair-builder/run-validation.mjs) 是本单一次性隔离运行脚本，无包脚本/机关改动。

### 未做项与边界申报

- Python/MinerU 环境修复和补跑、git/secrets 检查、真实模型遵从性/场景评估及主观放行留 HQ；本单不新增任何安全对抗类用例，既有回归零排除。
- 范围外遗留：server/src/agent/tools/executor.ts:285 的 organized_note 成功回执仍写从 project materials review/apply；本单依指示在 prompt 写入 Agent 收件箱现状，未越界修改工具话术，留 HQ 后续处理。
- 说明书条目申报：**无新增产品事实/界面，现有说明书已反映收件箱；本单仅纠正提示词与说明书一致性，未改说明书。**
- 零 git 命令、未碰 .git、未 commit、未读 .env 密钥值、未碰用户库、未新增依赖或凭据形合成值。测试以 OS 环境变量白名单、内存默认库、新建系统临时空 dotenv/Vite/appdata/assets/uploads 隔离；既有回归自带合成凭据原样保留。
- CodeGraph：索引目录存在，但无 callable MCP、CLI CommandNotFound；rg 亦不在 PATH，按定向 PowerShell/Node 源码读取回退，未建索引。

### 收尾复核

最终提示词的 server build 已通过；status 翻 done 后，由既有 docs-index 脚本仅再生 docs/agent-ops/INDEX.md（其余 8 份索引无变化），随后 docs:check 通过。closeout 三步均 exit 0，结果已纳入 validation-summary.json。builder 交付完成，HQ 留项如上。
