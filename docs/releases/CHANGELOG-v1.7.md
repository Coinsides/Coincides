# CHANGELOG — v1.7 Task-Card 联动

> **发布日期**：2026-03-21
> **前置版本**：v1.6（Course 中心化 + UI 结构重组）

---

## 新增功能

### Task-Card 多对多关联
- 新增 `task_cards` 关联表（迁移 011），支持任务级和 Checklist 条目级关联
- 新增 REST API：
  - `GET /api/tasks/:taskId/cards` — 获取任务关联的所有卡片
  - `POST /api/tasks/:taskId/cards` — 创建 Task-Card 关联
  - `DELETE /api/tasks/:taskId/cards/:linkId` — 删除关联
  - `GET /api/cards/:cardId/tasks` — 反向查询：Card 关联的所有 Task
- 新增 Agent 工具 `link_task_cards` — 批量建立 Task-Card 关联
- 新增 `TaskCardLink` 共享类型定义

### TaskViewModal 查看模式
- 任务点击入口从直接编辑改为只读查看模式
- TaskViewModal 展示完整任务信息：标题、日期、时间、优先级、课程、目标、描述、Checklist
- Checklist 可在查看模式中直接勾选完成（无需切换到编辑模式）
- 点击「编辑」按钮切换到 TaskModal 编辑模式
- Calendar 页面所有任务点击均改为 `task-view`
- 任务创建（Ctrl+T / Goals 页新建）仍保持 `task-create` 直接编辑

### CardBubble 卡片气泡组件
- 新增可复用 CardBubble 组件，支持两种模式：
  - 完整气泡（显示卡片标题 + 模板类型 + Deck 名称）
  - 紧凑标签（内联显示在 Checklist 条目旁）
- TaskViewModal 集成 CardBubble：
  - Checklist 条目右侧显示条目级关联卡片标签
  - 底部「关联卡片」区块展示任务级关联卡片气泡
- 点击气泡打开 card-view modal

### Agent Task-Card Linkage 协议
- System Prompt 新增「Task-Card Linkage」协议段落
- Agent 在创建学习计划时可自动建立 Task-Card 关联
- 遵循 proposal 审批流程，不跳过用户确认

---

## 文件变更总览

### 新增文件
| 文件 | 说明 |
|------|------|
| `server/src/db/migrations/011_task_cards.ts` | task_cards 关联表迁移 |
| `client/src/components/TaskViewModal/TaskViewModal.tsx` | 任务只读查看模态框 |
| `client/src/components/TaskViewModal/TaskViewModal.module.css` | 查看模式样式 |
| `client/src/components/CardBubble/CardBubble.tsx` | 卡片气泡组件 |
| `client/src/components/CardBubble/CardBubble.module.css` | 气泡样式 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `server/src/routes/tasks.ts` | 新增 3 个 task-cards 端点 |
| `server/src/routes/cards.ts` | 新增 card-tasks 反向查询端点 |
| `server/src/agent/tools/definitions.ts` | 新增 `link_task_cards` 工具定义 |
| `server/src/agent/tools/executor.ts` | 新增 `link_task_cards` 执行逻辑 |
| `server/src/agent/system-prompt.ts` | 新增 Task-Card Linkage 协议 |
| `client/src/App.tsx` | ModalLayer 新增 `task-view` case + import |
| `client/src/pages/Calendar/Calendar.tsx` | 6 处 `task-edit` → `task-view` |
| `shared/types/index.ts` | 新增 `TaskCardLink` interface |
| `docs/DATA_MODEL.md` | 新增 2.24 TaskCard 表描述 |
| `server/src/routes/agent.ts` | SSE 超时 120s→300s 对齐 orchestrator |
| `server/src/agent/orchestrator.ts` | 并行工具执行 + Deck/Section 预加载注入 |
| `server/src/agent/system-prompt.ts` | Tool Efficiency Playbook 重写 + Available Decks 上下文 |

---

## Checklist 格式兼容 + max_tokens 修复

### max_tokens 4096→16384
- `anthropic.ts` 中 Claude API 的 `max_tokens` 从 4096 提升到 16384
- 4096 导致 batch_cards proposal 的大 JSON 被截断，Agent 反复重试但永远无法完成

### Checklist 格式防御性处理
- `proposals.ts` 新增 `normalizeChecklist()` 函数
- 兼容 Agent 可能发送的多种格式：纯字符串数组、`{text}` 数组、`{text, done}` 数组
- study_plan 和 goal_breakdown apply 时统一转换为 `[{text: string, done: boolean}]`
- `definitions.ts` 中 `create_proposal` 的 items 描述明确了 checklist 格式要求

---

## Proposal 机制强制化（Bug Fix）

### 问题
- Agent 绕过 Proposal 直接调用 `create_card` / `create_task` 创建卡片和任务
- Agent 擅自创建新 Deck，即使已有匹配的 Deck
- 违反设计宪法第一条：“不替用户做决定”

### 修复措施

#### 1. 工具定义层（最强拦截）
- 从 `definitions.ts` 删除 `create_card` 和 `create_task` 工具定义
- Claude 无法看到这两个工具，从根本上无法调用
- Proposal apply 路由不受影响（直接操作 SQL）

#### 2. Executor 层守卫（双保险）
- `create_card` 和 `create_task` 的 executor case 改为返回 BLOCKED 错误
- 即使未来工具定义被误加回，executor 仍然拦截

#### 3. System Prompt 硬化
- Proposal 规则从“建议”升级为“强制”，删除“single quick tasks can create directly”漏洞
- 明确列出允许直接调用的工具白名单
- 新增 Deck 创建规则：已有匹配 Deck 时禁止新建
- Anti-Patterns 新增：禁止重复输出相同消息不调用工具

---

## Agent 效率深度优化

### SSE 超时对齐（commit `7b600ec`）
- `server/src/routes/agent.ts` 中 `REQUEST_TIMEOUT_MS` 从 120s → 300s，与 orchestrator 一致
- 新增基础 Tool Efficiency 协议（4 条规则）

### 深度优化三部曲

#### 1. Orchestrator 并行工具执行
- `orchestrator.ts`：`for` 循环改为 `Promise.all`
- Claude 同轮返回多个 tool_use 时并行执行，不再顺序等待
- 安全性：better-sqlite3 同步写入无并发冲突，异步操作（embedding API）受益于并行

#### 2. System Prompt Playbook 重写
- Tool Efficiency 从 4 条泛规则 → 完整的分场景 Playbook
- 卡片生成：目标 3–4 轮（原 7+ 轮）
- 学习计划：目标 3–5 轮
- 目标拆解：目标 2–3 轮
- 文档查找：目标 1 轮
- 新增 Anti-Patterns 清单（明确禁止的低效行为）
- 更新「基于文档生成卡片」和「Deck 选择 / Section 组织」等协议段，与新效率标准一致

#### 3. System Context 预注入
- `orchestrator.ts`：对话开始前预加载用户所有 Deck + Section 信息
- `system-prompt.ts`：新增「Available Decks」上下文区块，展示 deck ID、名称、卡片数、课程链接、section 列表
- 大幅减少 Agent 调用 `list_decks` / `list_sections` 的需要

---

## v1.7.2 — 学习计划流程完善

> 详见 [v1.7.2-plan.md](v1.7.2-plan.md)

### 新增功能
- 月历日期选择组件（MonthCalendar）：拖选连续范围 + 单击选择离散日期
- `collect_preferences` 新增 `date_picker` 类型问题
- Time Block 缺口检测 + 两步 Proposal 流程（先补全 Time Block → 再生成学习计划）
- `create_proposal` 新增 `time_block_setup` 类型
- 任务 `time_block_id` 防御性自动填充

### 修复
- 学习计划中任务未挂载到 Time Block 的问题
- 偏好收集表单缺少日期选择字段的问题
- **删除目标级联删除任务**：删除目标时现在会自动删除该目标及其所有子目标下的任务（原先行为是 tasks.goal_id 置 NULL，任务保留但失去归属）

### 新增文件
| 文件 | 说明 |
|------|------|
| `client/src/components/MonthCalendar/MonthCalendar.tsx` | 月历日期选择组件：拖选 + 单击 |
| `client/src/components/MonthCalendar/MonthCalendar.module.css` | 月历样式 |
| `client/src/components/MonthCalendar/index.ts` | 导出入口 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `server/src/agent/tools/definitions.ts` | `collect_preferences` 新增 `date_picker` 类型 + `date_config` 属性；`create_proposal` 新增 `time_block_setup` 类型 + `time_block_id` 字段说明 |
| `server/src/agent/system-prompt.ts` | 偏好表单新增 study_dates 字段；Step 4 新增 Time Block 缺口检测流程；Anti-Patterns 新增 2 条；排期协议强化 time_block_id |
| `server/src/routes/proposals.ts` | `study_plan` apply 新增防御性 time_block_id 填充；新增 `time_block_setup` apply 逻辑 |
| `client/src/stores/agentStore.ts` | `PreferenceQuestion.type` 新增 `date_picker`；新增 `date_config` 字段 |
| `client/src/components/AgentPanel/PreferenceForm.tsx` | 集成 MonthCalendar；新增 date_picker 渲染 + 提交摘要 |
| `client/src/components/AgentPanel/PreferenceForm.module.css` | 新增 datePickerWrap 样式 |
| `server/src/routes/goals.ts` | 删除目标时递归收集子目标 ID，事务内批量删除关联任务 |
| `client/src/stores/goalStore.ts` | deleteGoal 后同步清理 taskStore 中已删除目标的任务 |
| `client/src/pages/Goals/Goals.tsx` | 删除目标 toast 改为中文提示“目标及其下属任务已删除” |

---

## 设计宪法遵循

| 宪法条款 | 实施措施 |
|---|---|
| 不替用户做决定 | Task-Card 关联由用户或 Agent proposal 提出，用户审批后执行；Time Block 补全通过 Proposal 审批 |
| 不监控用户 | 不追踪关联卡片复习情况；不根据关联数量生成分析；不根据 Time Block 推断学习习惯 |
| 不制造挫败感 | 未关联卡片的任务不标红/不警告；Time Block 缺口提示语气中性 |
