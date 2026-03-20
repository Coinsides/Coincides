# Changelog — v1.5.2

> Task-Block 关联完善：TB 选择器 + Hover 任务面板 + 未归类任务视觉区分
> 日期：2026-03-20

---

## Step 1：创建/编辑 Task 时增加 TB 选择器

**目标**：用户在 Task Modal 中可选择性地将任务关联到当天的某个 Time Block。

**变更**：

### shared/types/index.ts
- `CreateTaskRequest` 新增 `time_block_id?: string`（上一轮已完成）
- `UpdateTaskRequest` 新增 `time_block_id?: string | null`（上一轮已完成）

### client/src/components/TaskModal/TaskModal.tsx
- 引入 `useTimeBlockStore` 获取 `weekData`
- 新增 `timeBlockId` state，初始值为空字符串
- 编辑模式下从 `existingTask.time_block_id` 回填
- 新建模式下支持从 `modal.data.time_block_id` 预填
- 新增 `dateBlocks` memo：根据 `date` 从 `weekData` 提取当天 TB 列表
- 创建/更新调用中传入 `time_block_id`
- UI：在 Goal 选择器后、操作按钮前添加 TB 下拉选择器（`<select>`），仅当 `dateBlocks.length > 0` 时显示
- 选项格式：`类型名 (HH:MM–HH:MM)`，默认 "Not assigned"

---

## Step 2：TB Hover 延展任务面板

**目标**：鼠标悬停 Time Block 背景区域 300ms 后弹出任务面板，按优先级分组展示关联任务，可滚动、可点击编辑。

**交互设计**：
- 进入延迟 300ms（`hoverEnterTimer`）——避免快速经过误触
- 退出延迟 200ms（`hoverExitTimer`）——鼠标可移入面板而不关闭
- 面板 `onMouseEnter` 取消退出计时器，`onMouseLeave` 重新启动
- 点击任务项打开 `task-edit` 模态框并关闭面板

**变更**：

### client/src/pages/Calendar/Calendar.tsx
- 新增 state：`hoverBlock`（包含 block + dateStr）、`hoverPos`（面板定位 x/y）
- 新增 refs：`hoverEnterTimer`、`hoverExitTimer`
- 新增 handlers：`handleTBMouseEnter`、`handleTBMouseLeave`、`handlePanelMouseEnter`、`handlePanelMouseLeave`、`clearHoverTimers`
- 新增 `hoverBlockTasks` memo：从 `tasksByDate` 过滤出关联到当前 hover block 的任务，按 must/recommended/optional 分组
- `.tbBackground` div 添加 `onMouseEnter`、`onMouseLeave` 事件
- 渲染 hover 面板：固定定位于 TB 区域右侧，宽 300px，最大高度 400px
- 面板结构：header（类型名 + 时间段）→ body（按优先级分组的任务列表）
- 无任务时显示 "No tasks assigned"
- 点击任务项 → `openModal('task-edit', { task })` + 关闭面板

### client/src/pages/Calendar/Calendar.module.css
- 新增 `.tbHoverPanel`：`position:fixed; z-index:250; width:300px; max-height:400px; overflow 内容可滚动`
- 新增 `.tbHoverHeader`：左边框颜色继承 TB 颜色
- 新增 `.tbHoverBody`：`overflow-y:auto` 实现滚动
- 新增 `.tbHoverGroup` / `.tbHoverGroupLabel`：优先级分组标题
- 新增 `.tbHoverTask` / `.tbHoverTaskDot` / `.tbHoverTaskTitle`：任务项样式，hover 高亮
- 新增 `.tbHoverEmpty`：无任务占位
- 新增 `@keyframes fadeIn` 入场动画

---

## Step 3：未归类任务视觉区分

**目标**：当某天存在 Time Block 但某些任务未关联到任何 TB 时，这些任务在视觉上应有所区别，提醒用户可以归类。

**变更**：

### client/src/pages/Calendar/Calendar.tsx
- `allDayTasks` 渲染处新增 `isUnassigned` 判断：`!t.time_block_id && resolvedBlocks.length > 0`
- 满足条件时附加 `.weekTaskUnassigned` class

### client/src/pages/Calendar/Calendar.module.css
- 新增 `.weekTaskUnassigned`：`border-left-style: dashed; opacity: 0.65`
- 虚线左边框 + 低透明度 = 视觉暗示"尚未归类"

---

## 影响文件一览

| 文件 | 变更类型 |
|------|----------|
| `shared/types/index.ts` | 已有 `time_block_id` 字段 |
| `client/src/components/TaskModal/TaskModal.tsx` | TB 选择器 UI + 逻辑 |
| `client/src/pages/Calendar/Calendar.tsx` | hover 面板 + 未归类样式 |
| `client/src/pages/Calendar/Calendar.module.css` | hover 面板样式 + 未归类样式 |
| `server/src/routes/tasks.ts` | 已有 `time_block_id` 支持 |

## 追加修复：已关联 TB 的任务不再直接显示在日历列

**问题**：已关联到 Time Block 的任务仍然出现在 allDay 区域，与 hover 面板重复展示。

**修复**：
- `Calendar.tsx` — `allDayTasks` 过滤条件增加 `&& !t.time_block_id`
- 已关联 TB 的任务仅通过 hover 面板查看，不再占用 allDay 区域空间
- 未关联 TB 的任务继续显示（带虚线边框视觉提示）

---

## 设计宪法合规

- **不替用户做决定**：TB 选择器默认 "Not assigned"，不自动分配
- **不监控用户**：面板只在用户主动 hover 时展示，不追踪行为
- **不制造挫败感**：未归类是温和的视觉暗示（虚线+低透明度），非错误提示
