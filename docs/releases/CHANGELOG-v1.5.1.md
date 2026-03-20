# Changelog — v1.5.1

> Time Block UX 优化：Bug 修复 + 类型系统重构 + 视觉优化
> 日期：2026-03-20

---

## Step 1：Bug 修复 + Day Detail 居中浮层（TB-P1 + TB-P5）

### Bug 修复：框选后右键创建 TB 不生效

**根因**：`onMouseDown` 在右键（button=2）时也会清空 `dragSelection`，导致 `contextmenu` 事件到达时选区已丢失。

**修复**：
- `Calendar.tsx` Line 753 — `onMouseDown` 增加 `e.button === 2` 判断，右键不清空选区

### Day Detail 居中浮层

**变更**：
- `Calendar.module.css` — `.detailPanel` 从右侧侧边栏（`top:0; right:0; bottom:0; width:400px`）改为居中浮层（`top:50%; left:50%; transform:translate(-50%,-50%); width:600px; max-height:80vh`）
- 新增 `border-radius: 16px`、`overflow: hidden`
- 新增 `@keyframes fadeScaleIn` 动画（从 scale(0.96)+opacity:0 到 scale(1)+opacity:1）
- 移除 `border-left`、`slideInRight` 动画

---

## Step 2：类型即名字（TB-P2）

**设计理念**："time block 按类型分，类型就是它的名字"——去掉独立 label 字段。

**变更**：
- `Calendar.tsx` — TB 显示从 `block.label` 改为 `block.type`（首字母大写）
- 创建/编辑表单中移除 Label 输入框
- `handleTBCreateSubmit` — label 自动等于 type（兼容 DB NOT NULL 约束）
- `handleTBEditSave` — label 自动等于 type
- `openTBEdit` — 初始化时 `setTBEditLabel(block.type)` 而非 `block.label`
- Save 按钮 disabled 判断从 `!tbCreateLabel.trim()` 改为 `!tbCreateType.trim()`
- 删除确认对话框从 `tbDeleteConfirm.label` 改为 `tbDeleteConfirm.type`

---

## Step 3：开放类型系统（TB-P3）

**变更**：
- `shared/types/index.ts` — `TimeBlock`、`ResolvedTimeBlock`、`CreateTimeBlockRequest`、`UpdateTimeBlockRequest` 的 `type` 字段从 `TimeBlockType` enum 改为 `string`
- `Calendar.tsx` — 新增 `TB_PRESET_TYPES` 常量（study/sleep/exercise/entertainment/rest/meal，各带默认颜色）
- `TB_COLORS` 从硬编码改为从 `TB_PRESET_TYPES` 动态生成
- `getTBColor` fallback 从 `TB_COLORS.custom` 改为 `'#8b5cf6'`
- `tbEditType`、`tbCreateType` 状态从 `'study' | 'sleep' | 'custom'` 改为 `string`
- 新增 `tbTypeOptions` useMemo — 合并预设列表 + 从 weekData 中提取的用户自定义类型
- 新增 `tbCustomTypeInput` 状态 — 自定义类型输入框
- 创建/编辑表单的 `<select>` 替换为 Type Grid 组件：
  - 预设类型按钮列表（色块 + 名称，点击选中高亮）
  - 当前选中的非预设类型自动显示为高亮按钮
  - 底部自定义输入行（input + Plus 按钮）
- 移除 `TimeBlockType` import（不再需要）

**新增 CSS**：
- `.tbTypeGrid` — flex wrap 容器
- `.tbTypeOption` / `.tbTypeSelected` — 类型按钮及选中状态
- `.tbTypeDot` — 颜色圆点
- `.tbCustomTypeRow` — 自定义输入行
- `.tbCustomTypeAdd` — 添加按钮

---

## Step 4：优先级 Badge（TB-P4）

**变更**：
- `Calendar.tsx` — `blockTaskCounts`（Map<string, number>）替换为 `blockPriorityCounts`（Map<string, { must, recommended, optional }>）
- Badge 渲染从 "N task(s)" 改为分类显示：`2M · 1R · 3O`
  - M = must（红色）、R = recommended（蓝色）、O = optional（灰色）
  - 只显示 count > 0 的类别
  - 无任务的 Block 不显示 badge
- 使用 `PRIORITY_COLORS` CSS 变量保持颜色一致性

**新增/替换 CSS**：
- `.tbTaskBadge` 替换为 `.tbPriorityBadge`（inline-flex 容器）
- 新增 `.tbBadgeItem`（加粗颜色数字）、`.tbBadgeSep`（分隔符 ·）
