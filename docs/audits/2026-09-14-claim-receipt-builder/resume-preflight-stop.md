> **状态 (Status)**: active（复工前置冲突证据；未完成，非验收通过）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；分类权威为工单 HQ 裁定，现物以所引源码为准

# 复工普查：三封闭集仍漏四个注册读器

施工单：`docs/agent-ops/handoffs/2026-09-14-v14-claim-receipt-order.md`。本轮按用户要求续接 builder；已读 HQ 复工令，没有重开上次 `save_memory` / `create_proposal` 的分类争议。新冲突是复工令列出的三个封闭集无法满足同令要求的完整性闸。

## 现物与裁定的差集

| 事实 | 数量 | 证据位置 |
|---|---:|---|
| `door_write` 从 `AGENT_ACTION_TOOLS` import 投影 | 10 | 工单 `:61`；`server/src/toolFace/registry.ts:814` |
| `channel_write` = `save_memory`、`create_proposal` | 2 | 工单 `:62` |
| HQ 明列的 read 封闭集 | 18 | 工单 `:63` |
| 三集并集（无交叠） | 30 | runtime 覆盖探针 |
| 实际 `toolDefinitions`（无重名） | 34 | `server/src/agent/tools/definitions.ts:10`、`:16`、`:41`；runtime 覆盖探针 |
| 暴露但未分类 | 4 | `server/src/toolFace/registry.ts:895`；探针差集 |
| 已分类但未暴露 | 0 | 探针反向差集 |

漏项全文：`read_note`、`read_board`、`read_content_groups`、`read_annotations_relations`。

`definitions.ts:10` 明确同时投影 `AGENT_ACTION_TOOLS` 和 `AGENT_READ_TOOLS`，`:41` 将投影结果加入实际暴露数组。`executor.ts:39` 查询注册读表，`:44`、`:45`、`:46`、`:47` 分别执行这四个读器；不是只有类型名或历史残留。HQ 新 read 列表仅列出 18 个 legacy 读工具，没有把这四项包含进去。

因此，照封闭集施工后，完整性闸会对现有工具直接红；若悄悄把 `AGENT_READ_TOOLS` 并入 read，便扩大了用户明确指定的封闭集。按“遇新的真冲突停线举证”暂停，不落功能补丁、不修改注册表、不删暴露项、不放宽闸。

## 已执行的覆盖证据

临时探针实际 import `toolDefinitions` 与 `AGENT_ACTION_TOOLS`；read 的 18 个名称从工单 HQ 声明行提取，避免手抄遗漏。遍历暴露现物、输出双向差集及交叠，再断言所有暴露工具均被覆盖。探针仅加载定义、schema 和已有 manifest；没有 import executor、数据库初始化、dotenv 或 provider，没有调用模型或用户库。

复跑命令（工作目录 `server/`）：

```powershell
node --import tsx --test ../.codex-tmp/claim-receipt-builder/resume-preflight/effect-coverage.test.mjs
```

- 有效覆盖运行：**1 test，0 pass，1 fail，0 skipped，exit 1**；失败为 `ERR_ASSERTION`，actual 精确为上述四个漏项，expected 为 `[]`。
- 首次启动曾因临时脚本相对路径多退一级报 `ERR_MODULE_NOT_FOUND`，未到覆盖断言；已修正并保留原始日志，不拿这次启动失败充当分类证据。共启动 2 次，有效覆盖运行 1 次。
- 已有独立只读交叉核对，结论一致。18 项 read 的执行链及逐项簿记申报见 [read-effects-audit.md](read-effects-audit.md)。
- CodeGraph 优先调用失败（本环境无命令/MCP），随后改用源码读取；没有进行索引或改配置。

原始证据只留 `.codex-tmp/claim-receipt-builder/resume-preflight/`：`effect-coverage.test.mjs`、首次启动 `effect-coverage.log`、有效断言 `effect-coverage-final.log`、带行号源码 `source-excerpts.log`。有效日志包含裁定、注册表、定义、执行器和已有 manifest 的 SHA-256；文档这里只给蒸馏结论。

## 待 HQ 明确与未做项

需要 HQ 明确四个注册读器在效果分类中的归属。建议修订为 read = `AGENT_READ_TOOLS` import 投影 + 本次明列 18 项，并把 read 核对义务覆盖到这四项；这是待裁建议，未当作授权执行。

- 本轮产品代码修改为零，`effectClassification.ts` 未创建；临时覆盖探针不是常驻完整性闸。
- 摘要字段、最终词表、服务端投影、历史投影、`turn_receipt` SSE、client 收据条与 `claim_without_receipt` 事件均未实施；没有完成版 Result。
- 定向功能测试、agent 族、server 全量、client 全库和 runtime 验证门均未运行，未声称通过或豁免。
- 说明书未更新（功能未交付）；system prompt 未改，字节差 0。
- 未碰 `.git`、未运行 git、未 commit；未改注册表/写门/仪式机关，未读取 `.env` key、机器凭据或用户库，未新增依赖/表/列/写动词，未使用合成凭据。
- 原 `ready` 状态保留；只追加本次停线记录。git/secrets 收口仍留 HQ。
