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
