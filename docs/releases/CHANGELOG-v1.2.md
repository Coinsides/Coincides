# CHANGELOG — v1.2

> **主题**：AI 交互重构 + Goal Manager 完整 UI + 新用户引导 + i18n
> **格式**：每个 Step 完成后追加一条记录。

---

## Step 1：System Prompt 重写（AI-1 + AI-2）

**日期**：2026-03-18
**Commit**：`581e978`

### 新增

- System Prompt 全面重写为 MWF 脚手架流程
  - 移除「Study Plan Creation Protocol」（7 步学习模式菜单）
  - AI 角色重新定义为「脚手架搭建者」，不再是「学习科学顾问」
  - 设计宪法三条原则硬编码为 HARD RULES
  - MWF 三级分层逻辑：Must > Recommended > Optional
  - Goal Breakdown Protocol 引导 Agent 正确拆解目标

### 修改

- `server/src/agent/system-prompt.ts` — 全面重写

### 技术决策

- 设计宪法作为 prompt 中不可覆盖的 HARD RULES，而非普通指令
- 保留 Proposal 机制、Document-Based Card Generation 等有效部分

---

## Step 2：Agent 工具升级（AI-3 + AI-4 + AI-5）

**日期**：2026-03-18
**Commit**：`581e978`（与 Step 1 合并提交）

### 新增

- `list_goals` 工具升级：新增 `include_hierarchy` 参数，返回完整树形结构
- `create_sub_goal` 工具：在指定 Goal 下创建子目标，自动继承 course_id
- `create_proposal` 升级：新增 `goal_breakdown` 类型（大目标 → 子目标 → Task）
- `create_task` 升级：支持 `description`、`start_time`、`end_time`、`checklist`、`serves_must`
- Migration `004_task_serves_must.ts`：tasks 表新增 `serves_must` 列

### 修改

- `server/src/agent/tools/definitions.ts` — 工具定义升级
- `server/src/agent/tools/executor.ts` — 工具执行逻辑（层级树构建、子目标创建）
- `server/src/agent/proposals.ts` — goal_breakdown apply 逻辑（_temp_id→real ID 映射）

---

## Step 3：Goal Manager 完整树形 UI + 拖拽（GM-1 + GM-2 + GM-3）

**日期**：2026-03-19
**Commit**：`ddb6e57`

### 新增

- Goals 页面完整树形展示（支持 3+ 层嵌套）
  - 树状连接线可视化（垂直线 + 水平线）
  - 每层缩进 28px
  - 展开/折叠控制（ChevronRight 旋转动画）
- `@dnd-kit` 拖拽排序
  - 同层级 Goal 拖拽调整顺序
  - 拖拽手柄（GripVertical）hover 时显示
  - DragOverlay 浮层反馈
- Goal 状态循环：active → completed → paused（点击状态图标切换）
- 每个 Goal 显示进度条（基于所有子孙 Task 完成百分比）
- `PUT /api/goals/reorder` — 批量更新 sort_order 和 parent_id
- `GET /api/goals/:id/progress` — 递归统计 Goal 及子 Goal 的 Task 完成进度
- Migration `005_goal_sort_order.ts`：goals 表新增 `sort_order` 列

### 修改

- `client/src/pages/Goals/Goals.tsx` — 全面重写为树形 + 拖拽 UI
- `client/src/pages/Goals/Goals.module.css` — 全面重写样式
- `client/src/stores/goalStore.ts` — 新增 reorderGoals、fetchProgress、fetchAllProgress、级联删除
- `server/src/routes/goals.ts` — 新增 2 个 API，GET 排序改为 sort_order
- `server/src/db/schema.sql` — goals 表新增 sort_order 列 + parent_id 索引
- `shared/types/index.ts` — Goal 接口新增 sort_order 字段

### 依赖变更

- 新增 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`

---

## Step 4：日历 Course 着色 + Goal 标签（GM-4）

**日期**：2026-03-19
**Commit**：`eef611e`

### 新增

- 月视图：Task 圆点按 Course 颜色着色（替代原 priority 着色）
- 周视图：Task 块按 Course 颜色着色（border + 背景色半透明）
- 日详情面板：Task 左侧 3px 边框使用 Course 颜色
- 日详情面板：每个 Task title 旁显示 Goal 名称标签（Target 图标 + 紫色标签）
- 周视图：Task 下方显示 Goal 名称小标签
- Course 颜色图例栏（日历标题下方，仅显示当前视图中有 Task 的 Course）

### 修改

- `client/src/pages/Calendar/Calendar.tsx` — 着色逻辑全面改为 Course 颜色 + Goal 标签
- `client/src/pages/Calendar/Calendar.module.css` — 新增 courseLegend、goalBadge、goalLabel 样式

### 技术决策

- 无需 migration：courses 表已有 `color` 列
- Goal 名称通过前端 goalStore 查找，无需后端 JOIN（与 Course 查找方式一致）

---

## Step 5：新用户引导流程（OB-1 + OB-2 + OB-3）

**日期**：2026-03-19
**Commit**：`124acc0`

### 新增

- Migration `006_onboarding.ts`：users 表新增 `onboarding_completed` 列
  - 现有用户自动标记为已完成（不会看到引导流程）
- 3 步引导流程组件 `Onboarding.tsx`
  - Step 1：欢迎页 + 引导创建 Course
  - Step 2：引导上传学习材料
  - Step 3：引导打开 AI 助手（Ctrl+J）
  - 每步可跳过，不惩罚
  - 步骤指示器圆点（active 拉长动画）
- `PUT /api/settings/onboarding-complete` — 标记引导完成
- authStore 新增 `completeOnboarding()` 方法

### 修改

- `server/src/routes/auth.ts` — register/login/me 返回 onboarding_completed
- `server/src/routes/settings.ts` — 新增 onboarding-complete 端点
- `server/src/db/schema.sql` — users 表新增 onboarding_completed 列
- `shared/types/index.ts` — User 接口新增 onboarding_completed 字段
- `client/src/stores/authStore.ts` — 新增 completeOnboarding
- `client/src/components/Layout/AppLayout.tsx` — 新用户时显示 Onboarding overlay

---

## Step 6：i18n 国际化框架（I18N-1 + I18N-2 + I18N-3）

**日期**：2026-03-19
**Commit**：`53ea035`

### 新增

- `i18next` + `react-i18next` 国际化框架
- 翻译文件结构：
  ```
  client/src/locales/
  ├── en/translation.json
  └── zh/translation.json
  ```
- 翻译键覆盖：nav、sidebar、goals、calendar、onboarding、settings、auth、common
- Settings 语言切换器（English / 中文）
- `client/src/i18n.ts` — i18n 初始化配置
- UserSettings 新增 `language` 字段（'en' | 'zh'）

### 修改

- `client/src/main.tsx` — 导入 i18n 初始化
- `client/src/components/Layout/AppLayout.tsx`
  - 侧边栏导航使用 `t()` 翻译
  - 从用户设置同步语言到 i18n
- `client/src/pages/Settings/Settings.tsx` — 新增语言选择器
- `server/src/agent/system-prompt.ts` — 根据语言设置调整 AI 回复语言
- `server/src/agent/orchestrator.ts` — 传递 language 设置到 buildSystemPrompt
- `server/src/validators/index.ts` — settings 验证新增 language 字段
- `shared/types/index.ts` — UserSettings 新增 language

### 技术决策

- 选择 `react-i18next`：React 生态最成熟的 i18n 方案
- 翻译文件直接 import（非 HTTP 加载），首屏零延迟
- 先做框架 + 核心页面，非核心页面的文案替换可在后续补全

---

## Step 7：Agent 报错排查（A-1）

**日期**：2026-03-19
**Commit**：`9dd7293`

### 修改

- `server/src/routes/agent.ts`
  - SSE stream 错误后始终发送 `done` 事件（防止前端 UI 卡死）
  - 请求结束前发送兜底 `done` 事件（防止静默断流）
  - 改善用户友好错误信息
  - 新增 `console.error` 日志
- `server/src/agent/orchestrator.ts`
  - 工具执行失败时错误信息包含工具名称（方便排查）
  - 新增 `console.error` 日志

### 待定

- 完整 A-1 bug 修复依赖 Henry 提供复现步骤和截图

---

## 版本总结

### 新增功能

| 功能 | 说明 |
|---|---|
| MWF 脚手架 System Prompt | AI 不再暴露学习科学菜单，改为内部综合策略 |
| 设计宪法硬编码 | 三条不可违反原则写入 prompt HARD RULES |
| Agent 目标拆解 | 大目标 → 子目标 → Task 的完整拆解流程 |
| Goal 树形 UI | 多层嵌套展示 + 连接线 + 展开折叠 |
| Goal 拖拽排序 | @dnd-kit 拖拽调整顺序 |
| Goal 进度追踪 | 基于 Task 完成状态自动计算 |
| Goal 状态管理 | active / completed / paused 三态循环 |
| Calendar Course 着色 | Task 按 Course 颜色区分 |
| Calendar Goal 标签 | 事件旁显示所属 Goal 名称 |
| Course 颜色图例 | 日历页顶部显示 |
| 新用户引导 | 3 步引导（创建课程 → 上传材料 → AI 助手） |
| i18n 框架 | 中英双语切换，Settings 语言选择器 |
| Agent 语言适配 | AI 回复语言跟随用户设置 |

### 数据库变更

| Migration | 说明 |
|---|---|
| 004_task_serves_must | tasks 表新增 serves_must 列 |
| 005_goal_sort_order | goals 表新增 sort_order 列 |
| 006_onboarding | users 表新增 onboarding_completed 列 |

### 依赖变更

| 包 | 版本 | 说明 |
|---|---|---|
| @dnd-kit/core | ^6.x | 拖拽核心库 |
| @dnd-kit/sortable | ^8.x | 排序插件 |
| @dnd-kit/utilities | ^3.x | CSS 工具函数 |
| i18next | ^24.x | 国际化核心 |
| react-i18next | ^15.x | React i18n 绑定 |

### Git Log

```
9dd7293 feat: v1.2 Step 7 — Agent error boundary hardening (A-1)
53ea035 feat: v1.2 Step 6 — i18n framework with zh/en support
124acc0 feat: v1.2 Step 5 — New user onboarding flow
eef611e feat: v1.2 Step 4 — Calendar course coloring + goal labels
ddb6e57 feat: v1.2 Step 3 — Goal Manager tree UI + drag-and-drop
581e978 feat: v1.2 Steps 1-2 — System Prompt rewrite + Agent tool upgrade
```
