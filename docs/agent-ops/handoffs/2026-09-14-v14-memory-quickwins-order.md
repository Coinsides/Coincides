> **状态 (Status)**: done(七项处理与验收回填完成；两项 server 环境失败及 git/secrets 留 HQ)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 记忆速赢批
> **上游**: claude-log §147 记忆路审计;**⛔碰生命周期/整合**(睡眠学试点押设计场)

# 记忆速赢批

1. **环境注入换好检索器**:retrieveMemories 的朴素 LIKE(对中文近盲)改走 search_memories 已有的三路合并(语义>FTS5>LIKE,executor 现物)——抽成共享 service 双端调用⛔复制;限 5 保持;
2. **嵌入覆盖补齐**:extractMemories 落库路径也生成嵌入(save_memory 已有的 fire-and-forget 模式);异步失败入日志⛔静默丢;
3. **save_memory 去重**:插入前精确/近似查重(FTS 或嵌入距离,申报口径),命中=返回既有 id⛔重复行;
4. **last_accessed 批量化**:逐行 UPDATE 循环改单条 IN 批;
5. **getDocumentSummaries 排序**:补 ORDER BY created_at DESC(现状=无序 LIMIT 10,新上传的反而看不见);
6. **死码清理**:summarizeOldMessages 未接线=删或接(裁:**删**,史压缩归睡眠学批);extractMemories 无用参数删;英文正则抽取器=**保留但申报现状**(改造归设计场,⛔本单重写);
7. **史序韧性**:getConversationHistory 排序补 rowid 次键,防同毫秒对拆散。

验收:定向(中文检索命中夹具/去重/批量 UPDATE/排序/次键)+agent 族回归+server 全量+client 全库;证据落 `docs/audits/2026-09-14-memory-quickwins-builder/`;git/secrets HQ 收口。禁区:⛔生命周期/衰减/整合;⛔50 条窗口改动;其余照常;合成凭据 ≤20。Result:共享 service 落点+逐项行号+测试数字。冲突停线举证。

## Result

**Codex builder · 2026-09-14**：七项已逐条处理，施工及验收执行完成。第 7 项按 HQ 注记只核验现物和既有定向覆盖，没有重做或报冲突。以下为工程回执，非 HQ 放行；server 全量两项环境失败仍保留。

### 共享 service 与逐项落点

共享落点为 **`server/src/agent/memory/service.ts`**：从 executor 搬出原三路检索，由 manager 环境注入与工具执行器双端调用；仍使用原 `VectorStore` / provider / 数据表，无第二套检索器、存储或生命周期机关。后台嵌入也复用同一 helper。行号按当前源码重新定位。

| 项 | 当前文件 / 行号 | 实现与核验 |
| --- | --- | --- |
| 1 环境检索 | `service.ts:15`；`manager.ts:111`；`tools/executor.ts:475`；`orchestrator.ts:71,74`（均在 `server/src/agent/` 下，service/manager 属 `memory/`） | 三路语义 > FTS5 > LIKE，按 ID 合并后截取；环境默认 **5**，工具 **10**。用户过滤沿既有 SQL/VectorStore，category 对最终三路一致过滤。orchestrator 等待检索再构造 prompt；复用现有 request budget，挂起 embedding 的 deadline/abort 也定向验证。未改预算常量/providers/routes。 |
| 2 嵌入覆盖 | `memory/manager.ts:146`；`memory/service.ts:76,111` | 自动抽取新行与显式保存共用 fire-and-forget helper；写入与工具回复不等待 embedding。成功存向量；异步 reject、空向量或写向量失败均记录 warning；无 provider 保留无向量记忆。未回填历史存量。 |
| 3 保存去重 | `memory/service.ts:92,96,99,104`；`tools/executor.ts:480` | 同用户精确正文先查；再在 FTS **前 10 候选**中比较规范化正文。命中返回既有 ID，不再插行、不重生嵌入、不覆盖既有正文/分类/来源。查重到插入无 await；并发工具夹具验证同进程复用一个 ID。具体口径见下。 |
| 4 批量访问时间 | `memory/service.ts:66,69` | 仅最终返回项，以一条 `UPDATE ... WHERE user_id = ? AND id IN (...)` 更新；两入口分别验证限额与更新参数，空集 0 UPDATE，未返回项不 touch。 |
| 5 摘要排序 | `memory/manager.ts:166,174` | `ORDER BY created_at DESC LIMIT 10`；user/course/non-null 条件保留，14 条不同上传时间的夹具检验最新 10 条与 course 过滤。 |
| 6 死码与抽取器 | `memory/manager.ts:115,117`；`orchestrator.ts:336` | 删除无调用的 `summarizeOldMessages`，删除未用 `assistantResponse` 及调用方仅为它累加的 `fullResponse`。九条英文正则、分类器、来源关联保留；中文自动提取仍不支持，已以测试申报，未重写抽取器。 |
| 7 既有史序 | `memory/manager.ts:18,21,24`；`orchestrator.ts:121` | 现物已有 `created_at DESC, rowid DESC` 后 reverse；默认 **50** 及 sanitizer 与开工副本相同。归属按 HQ 注记为 c7150f13（本单未访问 git 核提交）。既有定向 `v14AgentRouteLifecycle.test.ts:184` 两个固定 Date 断线用例及 `v14LoopRobustness.test.ts:238` 固定 Date 配对用例复跑 **3/3**。未新增该修复。 |

**去重口径申报**：同 user、跨 category 查正文；精确比较不设候选窗口。近似比较只在现有 FTS 前 10 候选内，将大小写转小写、空白折叠并 trim，去句末 `. ! ? 。 ！ ？` 后再 trim，字符串全等才视为重复。不是 embedding 距离或同义改写归并；否定词/不同事实不因 FTS 相似被合并。FTS 不可用、未召回、候选超过 10 时近似重复可漏；既有重复行不清理。未新增跨进程唯一约束，单进程无 await 间隙不宣称为跨进程原子查重。

### 测试数字与证据

- **本单新增定向 17/17**：真实内存 SQLite/FTS/sqlite-vec，中文语义独有命中且实际 prompt 可见、三路合并顺序与 ID 去重、双入口 5/10 限额与一条批量 UPDATE、空结果、provider 缺省/失败回退、保存精确/近似/并发去重、异步嵌入成功/失败日志、摘要排序、英文抽取现状；另外检索挂起的 abort/deadline 覆盖已包含在 17 项中。**第 7 项既有定向 3/3**，合计本轮定向执行 **20/20**。
- **Agent 族回归：12 文件 / 229 tests / 229 pass / 0 fail**。本次显式包含 `providerCredentials.test.ts` 以及新增 memory quickwins 文件，和上批 10 文件口径不同，不直接用相减宣称新增数量。
- **Server 全量：87/87 文件执行，877 tests / 875 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo**。失败为 `v2SourceMineruWiring.test.ts:60` 的 `python.exe ENOENT`（顶层启动失败计为 1 test，内部用例未展开）及 `v2SourceRegionCells.test.ts:203` 的 MinerU 进程创建失败 code 101。与上批环境红项同形，未排除测试或修解释器。
- **Client 全库：171/171 文件 / 1746/1746 tests 通过**。
- **Runtime：21/21 授权前缀组件通过**，含双端构建、模型契约、性能与 docs 检查；接线 **87/87，0 豁免、0 未接线**。未调用含 git/secrets 尾门的 `verify:v2-bn8-runtime` 聚合命令，完整门不宣称通过。
- 各集合包含交集，**不相加为独立测试总数**。新增测试已挂 `server/package.json:34` 的 `test:v2`。
- 蒸馏件：[README](../../audits/2026-09-14-memory-quickwins-builder/README.md)、[findings](../../audits/2026-09-14-memory-quickwins-builder/findings.md)、[summary.json](../../audits/2026-09-14-memory-quickwins-builder/summary.json)、[rerun.mjs](../../audits/2026-09-14-memory-quickwins-builder/rerun.mjs)。**原始 stdout/stderr、计数、开工副本与范围对照仅在 `.codex-tmp/2026-09-14-memory-quickwins-builder/`**，docs/audits 未存原始跑批日志。

### 未做项 / 禁区 / 交接

1. **未访问或操作 `.git`，未运行 git、commit/push/PR/merge；git/secrets 收口与最终放行留 HQ**。新造凭据形字符串最长 10 字符，既有回归测试夹具原状执行；未读写真实凭据或用户数据库，真实模型 API 调用 0 次。
2. **记忆生命周期/衰减/整合与 50 条窗口均未动**；未重写正则、未做历史嵌入回填/旧史压缩、未新增队列或重试。未找到 51+ 条默认窗口专项测试，该覆盖边界如实保留，非本单冲突。
3. 两项 Python/MinerU 环境失败留 HQ 复跑；完整 runtime 尾门、真实模型质量评估和主观浏览器验收未做。环境检索 budget 只停止等待，不宣称取消底层 embedding 或恢复进程退出后的作业。
4. 无新应用操作面，**应用操作说明书条目无涉**；current-state steward 留 HQ。入口文档、宪章、相关现状与 active ADR 已读；CodeGraph 先尝试但 MCP/CLI 不可用，rg 不可用后改用限定目录读取。未修改 agent 操作指令/权限配置。

**范围对照**：开工副本比较确认 `getConversationHistory` 与 `saveMessage`、英文 patterns、分类器、runtime-budget 原样；executor 除 memory 两分支和共享 import 外原样；orchestrator 只增加检索等待及预算复用、删除已无用途的参数/累加器。独立只读审查未发现必须修正或停线的问题，未以审查代替实跑。

**收尾回读**：Result/status 回填后，既有文档生成器只更新 `docs/agent-ops/INDEX.md` 一份派生索引；随后 `docs:check` 通过。raw `closeout-summary.json` 记录两步退出码均为 0。未修改验证门或增加豁免。
