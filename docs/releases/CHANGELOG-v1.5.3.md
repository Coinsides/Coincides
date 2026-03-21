# CHANGELOG — v1.5.3

> **主题**：Agent 智能规划升级——问卷收集 + 双模式排期 + 文档感知 + TB 工具
> **日期**：2026-03-20

---

## 新增功能

### 1. 计划前偏好问卷（collect_preferences）

- **新增 Agent 工具** `collect_preferences`——Agent 在制定学习计划前，主动向用户发送结构化问卷
- 支持四种题型：`single_choice`（单选）、`multi_choice`（多选）、`number_input`（数字）、`document_select`（文档选择）
- 问卷渲染在对话流中（非 Proposal 内），保持「Agent 了解我 → 帮我做计划 → 我审批」的心智连贯
- 提交后自动转为只读摘要视图
- 用户回复以 `[PREFERENCE_RESPONSE]` 前缀结构化 JSON 发送给 Agent
- **前端新组件**：`PreferenceForm.tsx`（281 行）+ `PreferenceForm.module.css`（318 行）

### 2. Agent Time Block 管理工具

- **新增 3 个 Agent 工具**：
  - `create_time_blocks`——批量创建 Time Block（支持 study/rest/meal/exercise/custom 类型）
  - `update_time_block`——更新单个 TB（label/start_time/end_time/type）
  - `delete_time_block`——删除单个 TB
- Agent 现在可以根据用户描述的时间安排直接创建 TB 结构

### 3. 双模式排期（Time Block + Calendar Event）

- **Time Block 模式（默认）**：Agent 创建 TB，任务挂在 TB 下，不设 start_time/end_time
- **Calendar Event 模式**：任务有明确的 start_time/end_time，显示在周视图上
- 模式选择通过问卷或全局设置确定
- **System Prompt** 新增「双模式排期协议」，Agent 根据用户选择自动切换行为

### 4. Proposal 时间编辑 UI

- **Calendar Event 模式**下，`study_plan` 类型的 Proposal 每个任务项显示 Start / End 时间编辑器
- 点击时间 badge 展开内联 HH:MM 编辑器，支持键盘输入 + 自动跳转
- 编辑后自动保存到 Proposal 数据
- **Time Block 模式**下，只读显示关联的 TB 名称
- **前端新组件**：`TimePickerInline.tsx` + `TimePickerInline.module.css`

### 5. 文档感知协议

- System Prompt 新增文档读取规则：
  - 总页数 ≤50：全文读取
  - 总页数 >50：semantic search + 前 5 chunk
  - 绝对上限 100 页
- 问卷中文档选择上限 3 个，总页数 ≤100

---

## 改进

### Orchestrator

- `MAX_TOOL_ROUNDS` 从 5 提升至 8，支持文档读取 + 问卷收集 + 计划生成的多轮次需求
- 新增 `preference_form` stream chunk 类型检测与 SSE 转发

### System Prompt

- 新增「Pre-Planning Preference Collection（计划前偏好收集）」协议
- 新增「Dual Scheduling Mode（双模式排期）」协议
- 更新 MWF Study Plan Creation Flow 引用新协议
- 更新 L1 Protocol：新用户首次制定计划也走问卷流程

---

## 文件变更清单

### 新增文件（4 个）
| 文件 | 说明 |
|------|------|
| `client/src/components/AgentPanel/PreferenceForm.tsx` | 偏好问卷组件（281 行） |
| `client/src/components/AgentPanel/PreferenceForm.module.css` | 问卷样式（318 行） |
| `client/src/components/AgentPanel/TimePickerInline.tsx` | 内联时间选择器组件（134 行） |
| `client/src/components/AgentPanel/TimePickerInline.module.css` | 时间选择器样式（110 行） |

### 修改文件（11 个）
| 文件 | 说明 |
|------|------|
| `server/src/agent/tools/definitions.ts` | 新增 4 个工具定义：collect_preferences、create/update/delete_time_blocks |
| `server/src/agent/tools/executor.ts` | 新增 4 个工具 handler |
| `server/src/agent/orchestrator.ts` | MAX_TOOL_ROUNDS 5→8；preference_form chunk 检测与转发 |
| `server/src/agent/providers/types.ts` | StreamChunk 新增 preference_form 类型 + data 字段 |
| `server/src/agent/system-prompt.ts` | 新增问卷协议、双模式排期协议、文档读取规则 |
| `server/src/routes/agent.ts` | SSE 转发 preference_form 事件 |
| `client/src/stores/agentStore.ts` | 新增 PreferenceQuestion/PreferenceFormMessage 类型；问卷 state 管理；SSE handler |
| `client/src/components/AgentPanel/AgentPanel.tsx` | 渲染 PreferenceForm 组件 |
| `client/src/components/AgentPanel/ProposalList.tsx` | Calendar Event 时间编辑 + TB badge 显示 |
| `client/src/components/AgentPanel/ProposalList.module.css` | 时间编辑器 + TB badge 样式 |

---

## 设计宪法遵守

| 宪法条款 | v1.5.3 实现 |
|----------|-------------|
| 不替用户做决定 | 问卷收集偏好后才生成计划；文档选择、排期模式均由用户决定；Calendar Event 模式时间由用户手动设置 |
| 不监控用户 | 不追踪用户在问卷上的操作；不根据历史自动推断偏好 |
| 不制造挫败感 | 问卷所有项可选/可跳过；时间编辑无强制验证 |
