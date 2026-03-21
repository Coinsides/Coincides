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

---

## 设计宪法遵循

| 宪法条款 | 实施措施 |
|---|---|
| 不替用户做决定 | Task-Card 关联由用户或 Agent proposal 提出，用户审批后执行 |
| 不监控用户 | 不追踪关联卡片复习情况；不根据关联数量生成分析 |
| 不制造挫败感 | 未关联卡片的任务不标红/不警告；无统计式完成率 |
