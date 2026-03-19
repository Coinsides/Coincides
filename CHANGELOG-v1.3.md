# Coincides v1.3 — CHANGELOG

## Step 1 — Time Block 数据模型 + CRUD + Goal 依赖
**commit**: `3ff5df3`

### 新增
- Migration `007_time_blocks.ts`：`time_blocks` + `time_block_overrides` 表
- Migration `008_goal_dependencies.ts`：`goal_dependencies` 表（DAG 兼容）
- `server/src/routes/timeBlocks.ts`：完整 CRUD API
  - GET/POST/PUT/DELETE `/api/time-blocks`（周模板管理）
  - GET `/api/time-blocks/day/:date`（单日解析：模板 + Override 合并）
  - GET `/api/time-blocks/week/:date`（整周解析）
  - POST/DELETE `/api/time-blocks/override`（单日覆盖）
  - 辅助函数：`getAvailableStudyMinutes`、`detectOverlaps`
- `server/src/routes/goals.ts` 新增：
  - POST/DELETE/GET `/api/goals/:id/dependencies`（依赖 CRUD）
  - DFS 环检测 `detectCycle`
  - GET `/api/goals/:id/dependency-chain`（递归依赖链）
- `shared/types/index.ts`：TimeBlock、TimeBlockOverride、GoalDependency、ResolvedTimeBlock 接口 + 请求类型
- `server/src/db/schema.sql` 新增 sections 17-19

---

## Step 2 — Time Block 前端 UI + Goal 依赖 UI
### 新增
- `client/src/stores/timeBlockStore.ts`：Zustand store（模板 CRUD、周数据获取、Override 管理）
- `client/src/stores/goalStore.ts`：新增 `dependencyMap`、`fetchDependencies`、`addDependency`、`removeDependency`
- **Calendar 周视图 Time Block 集成**：
  - Time Block 半透明背景色块渲染（Study=蓝、Sleep=灰、Custom=紫）
  - 重叠区域叠加混合色 + ℹ️ 图标
  - 鼠标拖拽框选创建 Time Block（30 分钟网格对齐）
  - 框选后弹出创建表单（标签 + 类型选择）
  - Task 浮在 Time Block 之上，视觉层次清晰
- **Goal 依赖 UI**：
  - Goal Manager 每个目标旁显示前置目标标签（`depBadge`）
  - 点击 Link2 图标弹出前置目标选择器（同课程筛选）
  - 可移除已有依赖（X 按钮）
  - 环检测错误友好提示
- **i18n**：中英双语新增 `timeBlocks` + `dependencies` 翻译键
- 缩短重排提示 i18n 文案就位（`shrinkWarning` / `reschedule` / `ignore`）

---

## Step 3 — Agent 排期引擎 + Time Block 感知
### 新增
- `server/src/agent/tools/definitions.ts`：新增 `get_time_blocks` 和 `get_goal_dependencies` 工具定义
  - `get_time_blocks`：按日期/周/纯模板三种模式返回 Time Block + 每日可用学习分钟数
  - `get_goal_dependencies`：按 goal_id/course_id 返回依赖关系，支持 `include_chain` 递归链
- `server/src/agent/tools/executor.ts`：两个新工具的执行逻辑
  - `get_time_blocks`：解析周模板 + Override 合并，计算 study 类型总分钟数
  - `get_goal_dependencies`：查询依赖关系 + 可选递归链遍历
- `server/src/agent/scheduling.ts`：排期引擎
  - `scheduleTasksAcrossDays()`：贪心排期算法（Goal 依赖拓扑序 × 优先级 × 日容量）
  - `getGoalTopologicalOrder()`：Kahn 算法拓扑排序（尊重前置依赖）
  - `getDailyCapacities()`：基于 Time Block 计算日期范围内每天的可用学习分钟数
- `server/src/agent/system-prompt.ts`：
  - 新增「排期协议 Scheduling Protocol」：排期前必须获取 Time Block + Goal 依赖，只分配到天，时间估算不暴露
  - 新增「重排协议 Rescheduling Protocol」：增量重排流程，3 个中性选项让用户选择，只动 pending Task

### 修改
- `server/src/agent/tools/definitions.ts`：`create_proposal` 描述更新，study_plan items 新增 `scheduled_date` 字段说明
- `server/src/routes/proposals.ts`：study_plan 和 goal_breakdown 的 Apply 逻辑支持 `scheduled_date`（优先于 `date`，向后兼容）

---

## Step 4 — L1 入驻流全链路
### 新增
- **Onboarding 组件升级**（4 步流程）：
  - Step 1：创建课程（保持不变）
  - Step 2：上传材料（保持不变）
  - Step 3：设置时间安排（新）— 引导用户前往日历周视图框选 Time Block，可跳过
  - Step 4：让 AI 帮你规划（新）— 打开 Agent Panel，带 L1 上下文
- **System Prompt L1 Protocol**：
  - `buildSystemPrompt` 新增 `isNewUser` 参数
  - 新用户首次对话时注入 L1 Protocol 指令段
  - 6 步参数收集流：学习目标 → 截止日期 → Time Block 确认 → 颗粒度 → 特殊要求 → 生成 Proposal
  - 每次只问一个问题，不堆积
- **Orchestrator**：检测 `l1_onboarding` contextHint，自动传递 `isNewUser` 标志
- **ProposalList 升级**：
  - 新增 `goal_breakdown` 类型徽章（蓝色）
  - 每个 item 显示 `scheduled_date`（强调日期分配，而非原始 date）
  - 显示 `serves_must` 标注（→ 前缀）
  - 新 CSS：`.itemDate`、`.itemServes`

### 修改
- `client/src/components/Onboarding/Onboarding.tsx`：重写为 4 步流程 + i18n + `openAgentWithContext`
- `server/src/agent/system-prompt.ts`：新增 L1 Protocol 条件注入段
- `server/src/agent/orchestrator.ts`：检测 L1 上下文并传递 `isNewUser`
- `client/src/locales/{en,zh}/translation.json`：新增 Step 3/4 文案（时间安排 + AI 规划）
