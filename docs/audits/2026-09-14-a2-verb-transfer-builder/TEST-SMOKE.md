> **状态 (Status)**: active
> **性质**: 14.1-A2 二轮 builder 定向功能回归与隔离 API 冒烟证据
> **工单日期**: 2026-09-14
> **From**: codex builder / functional_tests

# 定向回归与隔离 API 冒烟

执行入口：`server/src/__tests__/v14AgentVerbTransfer.test.ts`。已加入 `server/package.json` 的 `test:v2` 清单，未移除或排除已有测试。

在 `server/` 执行：

```text
node --import tsx --test src/__tests__/v14AgentVerbTransfer.test.ts
tests 50 / pass 50 / fail 0 / skipped 0 / cancelled 0 / todo 0
node node_modules/typescript/bin/tsc --noEmit
exit 0
```

原始运行输出留在 OS 临时目录 `C:\Users\70208\AppData\Local\Temp\coincides-a2-targeted.log`；本目录不收构建产物或原始日志。全库、静态门与构建结果由主 builder 另行汇总。

| 功能断言组 | 测试数 | 结果 |
|---|---:|---|
| 8 动词注册、唯一 provider 投影、immediate/internal、revert 覆盖及 Zod 人门字段同一对象 | 2 | PASS |
| 每动词人门 HTTP 与 chat 行语义一致、普通输入校验、无效输入不写 | 8 | PASS |
| 每动词 events / operation_batches 写失败时业务、events、收据整体回滚 | 16 | PASS |
| 8 动词真实 HTTP 会话 SSE、provider stub、查收据、HTTP revert、数据库复原 | 8 | PASS |
| complete_task 缺 user_utterance_anchor 为 400，零写入 | 1 | PASS |
| link_task_cards 后续缺卡 404 / 重复 409，肇事 card_id 明细，先前本批写入整体回滚 | 2 | PASS |
| 两链接收据记录全部实际 ID，撤销保留此前人门链接 | 1 | PASS |
| 五个 create_* 被普通编辑 / 后续引用后撤销 409，相关行与收据保持原状 | 10 | PASS |
| section 显式 order_index 保留、后续默认 MAX+1 | 1 | PASS |
| create_card 无工具定义/注册项，executor unknown-tool、零业务写入 | 1 | PASS |

每项 API 冒烟均通过实际 `POST /api/agent/conversations/:id/messages` SSE 路由驱动，随后 `GET` 会话消息取工具结果、`GET /api/tool-receipts?status=applied` 核对队列资源、读取同 ID 收据核对 provenance，最后 `POST /api/tool-receipts/:id/revert` 与 `GET` reverted 队列确认。每项额外注入一次撤销收据写失败，验证业务修改、events 与 applied 收据一起保持原状，再撤销成功。

| 动词 | 冒烟实际资源 ID 数 | 创建事件 actor/channel | 收据及最终状态 |
|---|---:|---|---|
| create_sub_goal | 1 | agent/chat | agent_chat；applied → reverted；域表快照完全复原 |
| create_task | 1 | agent/chat | 同上 |
| create_deck | 1 | agent/chat | 同上 |
| create_section | 1 | agent/chat | 同上 |
| create_time_blocks | 2 | agent/chat | 同上；同一收据包含两条实际新 ID |
| update_time_block | 1 | agent/chat | 同上；原 label/type/time/color/updated_at 复原 |
| link_task_cards | 1 | agent/chat | 同上；另有成功两链接与保留人门旧链接定向断言 |
| complete_task | 1 | human/chat | 同上；meta 带原文锚与 conversation_id，收据执行体仍 agent |

资源 ID 逐项与工具返回值及实际数据库行核对，未以预先生成 ID 或调用计数替代。complete_task 复原同时核对原 status/completed_at/updated_at、活动日志和 recurring completed_tasks；撤销事件统一为 human/ui/rolled_back。

隔离：每例显式 `initDb(':memory:')`；Express 仅监听 `127.0.0.1` 随机端口，通过测试中间件提供合成 userId。provider 的 `chat` 原型被 stub，临时凭据目录仅含 `a2-synthetic`（12 字符），不读取或替换环境 key、不加载 `.env`、不访问用户库或真实 provider。临时文件按精确文件名删除，临时目录仅作非递归删除。新增内容均为工单指定功能契约回归，无安全对抗类新设计。
