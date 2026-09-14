> **状态 (Status)**: active（施工前置冲突证据；非验收通过）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；现状以所引源码为准

# 宣称-收据对账器：分类来源不完整，停线

施工单：`docs/agent-ops/handoffs/2026-09-14-v14-claim-receipt-order.md`。依据工单“冲突停线举证”及 HQ 注记②，停止功能实施，不把范围外工具猜成读或写，不增补手写分类，不修改注册表。

## 冲突与逐处证据

指定的 `AGENT_ACTION_TOOLS` 与 `AGENT_READ_TOOLS` 并不覆盖全部现役 chat 工具，尤其不含本单发端案例 `save_memory`。

| 现状事实 | 源码位置 |
|---|---|
| action 数组只有 10 项，无 `save_memory`、`create_proposal` | `server/src/toolFace/registry.ts:814` |
| read 数组只有 4 项：`read_note`、`read_board`、`read_content_groups`、`read_annotations_relations` | `server/src/toolFace/registry.ts:895` |
| 注册表注释明确 legacy v1 toolDefinitions 未被导入或适配 | `server/src/toolFace/registry.ts:914` |
| chat 定义先投影上述两表，同时保留直接定义的旧工具 | `server/src/agent/tools/definitions.ts:10`、`:16` |
| `save_memory` 仍向模型暴露，执行器调用 `saveMemory` 并返回成功 | `server/src/agent/tools/definitions.ts:187`；`server/src/agent/tools/executor.ts:480` |
| `saveMemory` 对新内容实际 INSERT `agent_memories` | `server/src/agent/memory/service.ts:108` |
| 同样未入双表的 `create_proposal` 也有现役创建路径 | `server/src/agent/tools/definitions.ts:112`；`server/src/agent/tools/executor.ts:272` |

静态 AST 检查得到：action 10 项、read 4 项、另有 20 项直接定义的 chat 工具不在两表内。这里没有把这 20 项另行分类；该数字只描述覆盖缺口。

确定性反例：一轮只调用 `save_memory`，调用成功后文本为“已保存偏好”。仅以指定两表分类，`write_calls=[]`、`write_ok_count=0`；于是界面会显示“本轮无写动作”，窄词表命中时还会记录红旗。这个结果是源码推导，未运行真实模型或用户库；它说明会漏记本单核心写动作，并非语言误报问题。

## 所需上游裁定

请 HQ 提供覆盖这些现役工具的权威分类来源或相应修订工单。当前不得通过手写补表、按名字猜分类、修改注册表，或把“未被分类”呈现为“本轮无写动作”来绕过缺口。builder 不自行扩大授权。

## 检查与交付边界

- 静态 AST 检查 1 次，退出码 0；另有独立只读交叉核对。
- 未实施服务端投影、SSE 事件或台账事件；client 四文件中间补丁已逐块反向撤销，并核对无本单代码残留。净功能修改为零。
- 定向测试、agent 回归、server 全量、client 全库、runtime 验证门均未跑；本件不是测试通过报告。
- 摘要字段、最终词表均未落地；system prompt 字节差 0；说明书条目未更新（功能未交付）。
- 未使用 git 命令，未读写 `.git`，未 commit；未读取 `.env` key 值、机器凭据或用户库，未新增依赖、表、列、写动词。
- 验证路径预查：聚合 `verify:v2-bn8-runtime` 末尾含 `git diff --check` 与 `check:changed-file-secrets`；这两项按用户指示留 HQ。恢复施工后，其余子门应完整拆跑，并使用既有隔离 envDir，避免加载用户环境。

原始静态脚本、完整覆盖结果与源码摘录仅留 `.codex-tmp/claim-receipt-builder/preflight/`：`registry-coverage.cjs`、`registry-coverage.log`、`source-excerpts.log`。本目录只存本蒸馏件。
