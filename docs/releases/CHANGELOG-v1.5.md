# Coincides v1.5 — CHANGELOG

> Time Block 重构：图层嵌套 + 编辑模式 + 任务关联
> 开始日期：2026-03-20

---

## Step 1: feat(layout): 全局内容区拓宽（TB-R12）

### 变更
- `client/src/components/Layout/AppLayout.module.css` — `.content` 样式调整：
  - `max-width: 1000px` → `max-width: 1400px`
  - `padding: 36px 44px` → `padding: 28px 24px`

### 效果
- 日历周视图每列明显变宽，Time Block 编辑面板有更多空间
- 各页面在 1920px / 1280px / 1024px 宽度下均正常

### 变更文件
- `client/src/components/Layout/AppLayout.module.css`

---

## Step 2: feat(calendar): Time Block 创建交互重构（TB-R11）

### 变更
- `Calendar.tsx` — 框选行为重构：
  - 框选完成后（mouseup）不再自动弹出内嵌表单
  - 框选区域保持高亮（持久化 `dragSelection` 状态），等待用户右键
  - 右键弹出上下文菜单：「Add Time Block」+「Cancel」
  - 点击「Add Time Block」→ 弹出全屏 overlay 编辑面板（居中弹窗）
- 编辑面板（新增 `showTBCreateModal` 状态）：
  - Label 输入框（autoFocus，Enter 提交，Escape 关闭）
  - Type 选择器（Study / Sleep / Custom）
  - 起始/结束时间选择器（`<input type="time">`）— 预填框选时间，可手动修正
  - 颜色选择器（可选）
  - Save / Cancel 按钮
- `Calendar.module.css` — 移除旧的 `.tbFormPopup` / `.tbFormPopupFlip` 内嵌表单样式，移除 `.tbFormTime` / `.tbFormActions`

### 效果
- 面板不受列宽限制，所有元素完整可见
- 用户可在面板中修正框选的起止时间
- ESC / 点击外部关闭面板

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx`
- `client/src/pages/Calendar/Calendar.module.css`

---

## Step 3: feat(calendar): 编辑模式切换（TB-R5）

### 变更
- `Calendar.tsx` — 新增状态 `editMode: boolean`（默认 false）
  - 周视图顶部新增编辑模式切换按钮（Pencil 图标），import `Pencil` from lucide-react
  - `editMode = false`：禁用框选拖拽
  - `editMode = true`：启用框选拖拽 + 右键创建流程，列边框变为虚线，光标变 crosshair
  - 切换时清除已有 selection
- `Calendar.module.css` — 新增样式：
  - `.editModeBtn` / `.editModeBtnActive` 按钮样式
  - `.weekColumnEditMode` 编辑模式列视觉（虚线边框 + accent 颜色）

### 效果
- 默认不可框选，必须先点击编辑模式按钮
- 编辑模式有明确视觉反馈
- 退出编辑模式后清除选区

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx`
- `client/src/pages/Calendar/Calendar.module.css`

---

## Step 4: feat(calendar): 网格线偏好 + 删除重叠警告（TB-R6 + TB-R7）

### 变更
- `Calendar.tsx` — 网格线偏好：
  - 新增 `gridPreference` 状态，读写 `localStorage('tb-grid-preference')`
  - 值为 `'always'` 或 `'edit-only'`（默认）
  - 网格线显示条件：`editMode === true || gridPreference === 'always'`
  - 周视图顶部新增 Grid3x3 图标按钮切换偏好
- `Calendar.tsx` — 移除 overlap 检测：
  - 删除 `blendColors()` 函数
  - 删除 `getOverlapSegments()` 函数
  - 删除 overlap 渲染 JSX（`tbOverlap` + `Info` icon）
  - 移除 `dayOverlaps` / `overlapSegments` 变量
  - 移除 `Info` from lucide-react imports
- `Calendar.module.css` — 移除 `.tbOverlap` / `.tbOverlapIcon` 样式

### 效果
- 默认仅编辑模式显示网格线
- 偏好切换为 always 后非编辑模式也显示
- Time Block 重叠不再显示警告（嵌套叠加为正常行为）

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx`
- `client/src/pages/Calendar/Calendar.module.css`

---

## Step 5: feat(calendar): Study Block 单层约束（TB-R10）

### 变更
- **后端** `server/src/routes/timeBlocks.ts`：
  - `POST /api/time-blocks` — 创建前检查：若 type=study，查询同 `day_of_week` 是否已有 study Block，有则返回 400
  - `PUT /api/time-blocks/:id` — 编辑时检查：若新 type=study 且原 type 非 study，查询同 `day_of_week` 是否已有其他 study Block（排除自身），有则返回 400
- **前端** `Calendar.tsx`：
  - 创建面板（`showTBCreateModal`）：选择 type=study 时，若当天 weekData 中已有 Study Block，禁用 Save 按钮 + 显示红色提示文字
  - 编辑面板（`tbEditBlock`）：同上逻辑，检查是否将非 study Block 改为 study 时冲突

### 效果
- 每天最多 1 个 Study Block
- Meal / Rest / Custom 不受限制
- 已有旧数据（如有多个 Study）不会崩溃，正常渲染

### 变更文件
- `server/src/routes/timeBlocks.ts`
- `client/src/pages/Calendar/Calendar.tsx`

---

## Step 6: feat(calendar): 图层嵌套渲染（TB-R2）

### 变更
- `Calendar.tsx` — 新增 `computeNestingLevels()` 算法：
  - 按时长降序排列 Block，最长的为 depth 0
  - 完全被包含在已处理 Block 内的 → depth = parentDepth + 1
- Block 渲染应用嵌套层级：
  - `left: indent = level × 8px`（每层内缩 8px）
  - `backgroundColor` 透明度随层级增加（0.20 → 0.30 → 0.40）
  - `borderLeft` 透明度随层级增加
  - `zIndex = level`

### 效果
- 短 Block 在长 Block 上方嵌套显示，视觉有层次感
- 最多支持 5 层嵌套（实际 1-3 层为主）

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx`

---

## Step 7: feat(calendar): 浮空预览 + 动态时间范围（TB-R3 + TB-R4）

### 变更
- `Calendar.tsx` — 动态时间范围：
  - 新增 `timeStrToPercentDynamic()`、`snapToGridDynamic()`、`pctToHHMMDynamic()` 辅助函数
  - `useMemo` 计算 `rangeStartH` / `rangeEndH`：扫描当周所有 Block，最早 start − 1h ~ 最晚 end + 1h，fallback 8:00–22:00
  - `toPct` callback 封装动态范围转换
  - 时间刻度栏、网格线、Block 渲染、拖拽预览、持久选区、Timed Tasks 全部基于动态范围
- `Calendar.module.css` — 浮空标注线：
  - 新增 `.tbAnnotationLine`（虚线）+ `.tbAnnotationLabel`（末端时间数字）
  - Block 上下边缘各一条标注线

### 效果
- 只有 8:00–18:00 有 Block 时，视图范围约 7:00–19:00
- 完全没有 Block 时显示 8:00–22:00
- Block 边缘有标注线延伸到列右侧

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx`
- `client/src/pages/Calendar/Calendar.module.css`

---

## Step 8: feat(task-block): 任务显式关联 Time Block（TB-R8）

### 变更
- **数据库** — Migration `009_task_time_block.ts`：
  - `tasks` 表新增 `time_block_id TEXT REFERENCES time_blocks(id) ON DELETE SET NULL`
  - 新增索引 `idx_tasks_time_block`
- **shared/types** — `Task` 接口新增 `time_block_id?: string | null`
- **validators** — `createTaskSchema` / `updateTaskSchema` 新增 `time_block_id` 字段
- **后端** `tasks.ts` — `POST`、`POST /batch`、`PUT` 均支持 `time_block_id`
- **后端** `timeBlocks.ts` — 新增 `GET /api/time-blocks/:id/tasks` 端点
- **前端** `Calendar.tsx` — Block 内显示关联任务数量 badge
- **CSS** — 新增 `.tbTaskBadge` 样式

### 效果
- 创建任务时可选择关联 Time Block
- Block 上显示关联任务数量 badge
- 删除 Block 后关联任务的 time_block_id 自动置空

### 变更文件
- `server/src/db/migrations/009_task_time_block.ts` （新增）
- `server/src/db/schema.sql`
- `shared/types/index.ts`
- `server/src/validators/index.ts`
- `server/src/routes/tasks.ts`
- `server/src/routes/timeBlocks.ts`
- `client/src/pages/Calendar/Calendar.tsx`
- `client/src/pages/Calendar/Calendar.module.css`

---

## Step 9: feat(agent): 可用时间计算重写（TB-R9）

### 变更
- `scheduling.ts` — `getDailyCapacities()` 重写：
  - 取当天所有 Block（包含非学习类型）
  - Study Block 总时长 − 嵌套在 Study Block 内的非学习 Block overlap = 净可用学习时间
  - 新增 `hhmmToMin()` 辅助函数
- `definitions.ts` — Agent 工具描述更新：
  - `create_task` 新增 `time_block_id` 参数
  - `get_time_blocks` 描述补充“可用时间 = Study Block − 嵌套非学习 Block”
- `system-prompt.ts` — 排期规则补充嵌套扣减说明 + `time_block_id` 使用说明
- `executor.ts` — `create_task` handler 支持 `time_block_id` 参数

### 效果
- Study Block 8:00–18:00 内嵌 Eat 12:00–13:00 → 可用 540min，不是 600min
- 没有 Study Block 时 fallback 120min
- Agent 创建任务时可指定 time_block_id

### 变更文件
- `server/src/agent/scheduling.ts`
- `server/src/agent/tools/definitions.ts`
- `server/src/agent/tools/executor.ts`
- `server/src/agent/system-prompt.ts`

---

## Step 10: docs: 文档更新 + 版本收尾

### 变更
- `BACKLOG.md` — TB-R2~R9 状态改为 done
- `Coincides-Roadmap.md` — v1.5 状态改为 ✅ 完成
- `DATA_MODEL.md` — 补充 `tasks.time_block_id` 字段
- `CHANGELOG-v1.5.md` — 记录 Steps 6-10 所有变更

### 变更文件
- `docs/BACKLOG.md`
- `docs/Coincides-Roadmap.md`
- `docs/DATA_MODEL.md`
- `docs/releases/CHANGELOG-v1.5.md`
