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
