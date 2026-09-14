> **状态 (Status)**: active
> **层 (Layer)**: Builder 验证证据
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；非 HQ 放行

# 发现、限制与未做项

## Server 全量环境失败

| 文件 | 本轮观测 | 处置 |
| --- | --- | --- |
| `server/src/__tests__/v2SourceMineruWiring.test.ts:60` | `python.exe ENOENT`；顶层解释器探测使测试文件启动失败，内部测试未展开，Node 将此文件记为 1 个失败 test | 未排除或改写测试，未调整 Python/依赖；留 HQ 环境复跑 |
| `server/src/__tests__/v2SourceRegionCells.test.ts:203` | MinerU 进程无法创建，退出码 101；一项实测失败 | 未修改测试、解析器或解释器配置；留 HQ 环境复跑 |

两项与上一张循环健壮批 Result 的环境红项同形；本轮仍完整执行 server 文件清单，失败未吞掉。原始堆栈仅存 raw 日志，不复制到此目录。不将环境失败记成记忆实现通过，也不把全量写成全绿。

## 本单实现与证据范围

1. 共享 service 替代 executor 原三路检索和 manager 旧 LIKE 路径；不是复制第二套检索器。嵌入 helper 同时供自动抽取与显式保存使用，仍落既有 `agent_memories` / `agent_memory_vec`。
2. 去重为**同用户精确正文，或 FTS 前 10 候选中的规范化等值**。规范化仅大小写、空白、句末标点。FTS 不可用、无法召回或候选过窗时近似重复可漏；未实现语义距离合并。既有重复行不合并、不删除，不修改已有行的分类与正文。无异步间隙约束限当前单进程，不宣称跨进程写唯一性。
3. 新英文抽取入口有异步嵌入覆盖；**九条英文正则及分类器原样保留**。中文可经检索召回已有记忆，但不会被这些英文正则自动提取。未回填历史嵌入，未改编辑/删除、衰减、整合或生命周期流程；没有新增后台重试、队列或压缩。
4. `summarizeOldMessages` 在限定代码搜索范围 `server/src`、`server/scripts`、`client/src`、`scripts` 中原来只有定义，没有调用，按裁定删除。`assistantResponse` 和调用方无用累加变量同步删除。
5. 第 7 项现物来自 HQ 指定上批；`getConversationHistory`/`saveMessage` 与开工副本逐段相同，包含默认 50 条窗口与 sanitizer。原有固定 Date 三项配对测试实跑通过。**未找到 51+ 条默认窗口专项测试**，本单不补窗口机制、不将该边界写成冲突或本单修复。
6. 环境检索新 `await` 使用既有请求 budget；挂起 embedding 的 abort/deadline 定向测试通过。停止等待不会取消底层嵌入；未扩改 providers/routes/runtime-budget。

## 未执行事项

- 用户指定 HQ 收口：`.git` 访问与 git 命令、commit/push/PR/merge、`git diff --check`、`check:changed-file-secrets`。完整 `verify:v2-bn8-runtime` 聚合命令含这两个尾门，故只执行其全部授权前缀组件，不宣称完整门通过。
- 真实凭据、用户数据库、真实模型 API 和主观浏览器验收。新增测试键为短合成值，既有全库测试夹具原状执行；没有为本单改造其他凭据测试。
- 历史嵌入回填、英文抽取器中文改造、记忆生命周期/衰减/整合、50 条窗口和旧史压缩，均按工单禁区或后续设计场保留。

## 工具与核验

- `.codegraph/` 存在，已先尝试 CodeGraph；会话无相应 MCP 工具、CLI 不可用，`rg` 同样不可用，改用限定目录 Node/PowerShell 读取。未索引仓库、未修改 agent 指令。
- 原始证据 `.codex-tmp/2026-09-14-memory-quickwins-builder/`，包括开工副本、类型检查、scope-check、各阶段 stdout/stderr 与原始 summary。此目录只放 README/findings、蒸馏计数与复跑脚本。
- 独立只读实现审查未发现必须修正或停线的问题；实际验收数字以主线程跑批日志为准，未把审查意见当作测试通过。
