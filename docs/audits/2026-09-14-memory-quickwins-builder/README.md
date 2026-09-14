> **状态 (Status)**: active
> **层 (Layer)**: Builder 验证证据
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；施工回执见工单 Result，放行留 HQ

# 记忆速赢批验证

工单：[2026-09-14-v14-memory-quickwins-order.md](../../agent-ops/handoffs/2026-09-14-v14-memory-quickwins-order.md)。本目录只收蒸馏件，原始跑批与开工副本位于 `.codex-tmp/2026-09-14-memory-quickwins-builder/`。代码按当前现物定位，未使用上批审计旧行号。

## 实现与边界

- `server/src/agent/memory/service.ts` 是环境注入与 `search_memories` 的唯一三路检索实现：语义 > FTS5 > LIKE，按记忆 ID 合并，最终分别限 5 / 10。沿用 `VectorStore` 与现有 embedding provider，不新造索引、存储或生命周期机关。`category` 对最终三路结果一致过滤，用户过滤沿用数据库与 VectorStore。
- 两入口只对最终返回的 ID 执行一条带 `user_id` 的 `UPDATE ... IN (...)`；空结果不更新。空查询走 LIKE 最近记忆，不调用 embedding provider。
- `extractMemories` 与 `save_memory` 共用异步嵌入 helper，成功落向量，失败记录 warning。无 provider 时保留无向量记忆；不补历史存量、不新增重试队列。两种写入都不等待嵌入完成。
- `save_memory` 先查同用户正文精确重复，再用 FTS **前 10 个候选**做规范化等值比较：转小写、折叠空白、去首尾空白及句末 `. ! ? 。 ！ ？`。命中返回原 ID，保留原正文、分类、来源与时间，不重复行或嵌入。不按类别分桶，不合并同义改写、不同事实或否定词；FTS 查不到、候选窗之外可漏。查重到插入没有 `await`，同进程并发工具请求不能在中间交错；不宣称跨进程事务级唯一性。
- `getDocumentSummaries` 按 `created_at DESC` 取最近 10 条，保留 user/course/non-null 过滤。
- 删除未接线 `summarizeOldMessages`、未用 `assistantResponse` 参数及仅为它累加的 `fullResponse`。现有九条英文正则和分类器原样保留；中文自动抽取仍不支持，与中文检索能力不同。
- **第 7 项只核验**：HQ 指明的既有 `created_at DESC, rowid DESC` 排序、反转、sanitizer 及默认 50 条窗口未改。固定 Date 的既有三条测试复跑，不重做实现。
- 环境检索变异步后，orchestrator 复用现有 `createStreamBudget` 等待检索；挂起嵌入受同一个 request deadline / abort 约束，不改变预算常量、providers 或 routes。只停止等待，不宣称取消 embedding 底层工作。

## 复跑

| 检查 | 实跑结果 |
| --- | --- |
| 新增记忆定向 | 17/17，通过 |
| 第 7 项既有同毫秒配对定向 | 3/3，通过；不重做源码 |
| Agent 族 | 12 文件，229/229，通过 |
| server 全量 | 87 文件，877 tests / 875 pass / 2 fail；0 cancelled/skipped/todo，两项环境失败见 findings |
| client 全库 | 171 文件，1746/1746，通过 |
| Runtime 授权前缀 | 21/21，通过，含双端构建；完整聚合门未执行 |
| 接线检查 | 87/87，0 豁免，0 未接线 |

这些集合有交集，不相加为独立测试总数。Agent 族本次显式包含 `providerCredentials.test.ts`，比上一批 10 文件口径多该文件及本单新文件。

从仓库根执行：

```powershell
node docs/audits/2026-09-14-memory-quickwins-builder/rerun.mjs --stage directed
node docs/audits/2026-09-14-memory-quickwins-builder/rerun.mjs --stage agent,server,runtime --keep-going
```

`--stage all --list` 只列计划；server 全量动态枚举 `server/src` 与 `server/scripts` 下所有 `.test.ts`，保留失败并继续其他检查。runtime 内含 client 全库，不重复执行。每次生成独立 raw 子目录，不覆盖首跑日志。

runner 清空 provider 环境凭据，使用新建空 app-data / dotenv / Vite env 目录；新增测试使用 `:memory:` 数据库、真实 FTS/sqlite-vec 和 mock provider。新造凭据形字符串 `syn-memory` / `synthetic` 均不超过 20 字符，未修改既有回归套件的历史夹具。真实模型 API 调用 0 次。

**验证门口径**：按当前 `verify:v2-bn8-runtime` 原文执行 git 之前的全部 21 个组件；含 git/secrets 的聚合命令未运行，完整门不宣称通过。`git diff --check` 与 `check:changed-file-secrets`、git 收口均留 HQ。

最终计数见 [summary.json](summary.json)，失败和未做项见 [findings.md](findings.md)。本单无新应用操作面，操作说明书条目无涉；current-state steward 与最终放行留 HQ。
