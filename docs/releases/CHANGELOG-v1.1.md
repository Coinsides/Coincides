# CHANGELOG — v1.1

> 格式：每个 Step 完成后追加一条记录。

---

## Step 1：DB Migration 机制 + 配置验证

**日期**：2026-03-18

### 新增

- `server/src/db/migrate.ts` — Migration Runner
  - 自动扫描 `migrations/` 目录，按文件名排序执行
  - `db_migrations` 表追踪已执行的 migration（id, description, applied_at）
  - 每个 migration 包裹在事务中，失败即回滚
  - 启动时由 `initDb()` 自动调用，已执行的 migration 不会重复运行

- `server/src/db/migrations/001_baseline.ts` — 基线 Migration
  - 将 v1.0 init.ts 中 8 条 ad-hoc `ALTER TABLE` 语句迁入正式 migration
  - 使用 `safeAlter()` 包装，新旧数据库均可安全执行
  - 建立干净的基线：v1.1+ 所有 schema 变更走 migration 机制

- `server/src/db/validateConfig.ts` — 启动配置验证器
  - 检查 `ANTHROPIC_API_KEY`、`VOYAGE_API_KEY`（均为 optional）
  - 缺失 optional key → 打印 warning 继续启动
  - 缺失 required key → 打印错误 + 退出（当前无 required key）
  - 在 `index.ts` 中最先执行，早于数据库初始化

### 修改

- `server/src/db/init.ts`
  - `initDb()` 从同步改为 `async`（因 migration runner 使用 dynamic import）
  - 移除 8 条 ad-hoc `ALTER TABLE` 语句（已迁入 001_baseline）
  - 末尾调用 `await runMigrations(db)`
  - 虚拟表 / 触发器 / FTS5 保留原位（使用 IF NOT EXISTS，天然幂等）

- `server/src/index.ts`
  - 新增 `validateConfig()` 调用（数据库初始化前执行）
  - `initDb()` → `await initDb()`（配合 async 改造）

### 技术决策

- Migration 文件使用 TypeScript + ESM dynamic import，与项目技术栈一致
- 选择文件系统 migration（非 SQL-only）以支持复杂 migration 逻辑（如数据回填）
- `001_baseline` 不改变实际 schema，仅标记基线，确保升级路径安全

---

## Step 2：Task 数据模型升级（M-1）

**日期**：2026-03-18

### 新增

- `server/src/db/migrations/002_task_upgrade.ts` — Task 字段升级 Migration
  - 新增 4 列：`start_time`、`end_time`、`description`、`checklist`
  - 全部 nullable，不影响已有数据
  - `checklist` 以 JSON 字符串存储：`[{text, done}]`

- `shared/types/index.ts` — 新增 `ChecklistItem` 接口

### 修改

- `shared/types/index.ts` — `Task`、`CreateTaskRequest`、`UpdateTaskRequest` 新增字段
- `server/src/validators/index.ts` — `createTaskSchema`、`updateTaskSchema` 新增字段验证
- `server/src/routes/tasks.ts`
  - POST / PUT 支持 `start_time`、`end_time`、`description`、`checklist`
  - 新增 `parseTask()` 辅助函数：读取时将 checklist JSON 字符串解析为对象
  - GET / POST / PUT 所有返回值经过 `parseTask()` 处理
- `client/src/components/TaskModal/TaskModal.tsx`
  - 新增时间范围输入（`datetime-local` × 2）
  - 新增描述文本框
  - 新增 checklist 动态列表（添加/删除/勾选）
- `client/src/components/TaskModal/TaskModal.module.css` — 新增时间范围、描述、checklist 样式

### 技术决策

- `priority` 列已在 schema.sql 中存在，Migration 不重复添加
- checklist 使用 JSON 字符串而非关系表，简化 CRUD，适合小规模子项

---

## Step 3：Goal 嵌套支持（M-2 + G-1）

**日期**：2026-03-18

### 新增

- `server/src/db/migrations/003_goal_nesting.ts` — Goal 嵌套 Migration
  - goals 表新增 `parent_id TEXT REFERENCES goals(id) ON DELETE CASCADE`

- `server/src/routes/goals.ts` — 两个新端点
  - `GET /api/goals/:id/children` — 获取子目标列表
  - `POST /api/goals/:id/tasks` — 向已有 Goal 添加任务（**修复 G-1**）

### 修改

- `shared/types/index.ts` — `Goal`、`CreateGoalRequest`、`UpdateGoalRequest` 新增 `parent_id`
- `server/src/validators/index.ts` — create/update goal schema 新增 `parent_id` 验证
- `server/src/routes/goals.ts`
  - GET 支持 `?parent_id=null`（顶级）/ `?parent_id=xxx`（子级）过滤
  - POST 支持 `parent_id`，自动继承父目标的 `course_id`
  - PUT 支持修改 `parent_id`
- `client/src/stores/goalStore.ts` — 新增 `addTaskToGoal` 方法
- `client/src/components/GoalModal/GoalModal.tsx` — 支持创建子目标（接收 `parent_id`）
- `client/src/pages/Goals/Goals.tsx`
  - `buildHierarchy()` 构建层级结构
  - 子目标缩进展示（20px + 左边框）
  - 每个 Goal 卡片新增「+ Task」和「+ Sub-goal」按钮
  - 子目标数量指示器

### UX 痛点修复

- **G-1 修复**：用户现在可以随时向已有 Goal 添加新任务

---

## Step 4：日历 CRUD 补全（C-1 + C-2 + G-2）

**日期**：2026-03-18

### 修改

- `client/src/pages/Calendar/Calendar.tsx`
  - **周视图时间块**：有 `start_time`/`end_time` 的 Task 按时间位置渲染为色块
  - **右键菜单**：桌面端右键弹出「编辑/删除」菜单（**修复 C-1、C-2**）
  - **点击编辑**：日详情面板中点击任务标题打开编辑弹窗
  - **任务元信息**：显示时间范围、描述预览、checklist 完成进度
  - 无时间范围的旧任务仍作为全天事件正常显示

- `client/src/pages/DailyBrief/DailyBrief.tsx`
  - **优先级分层展示**（**修复 G-2**）：Must Do / Recommended / Optional 三个独立区块
  - 每个区块有彩色左边框标识
  - 任务卡片显示时间范围、描述摘要、checklist 进度

- CSS 更新：`Calendar.module.css`、`DailyBrief.module.css` 新增对应样式

### UX 痛点修复

- **C-1 修复**：右键菜单支持删除日历事件
- **C-2 修复**：右键菜单支持编辑日历事件，点击标题也可编辑
- **G-2 修复**：DailyBrief 按 Must / Recommended / Optional 三级优先级分层展示

---

## Step 5：跨 Deck 复习会话（R-1）

**日期**：2026-03-18

### 新增

- `server/src/routes/review.ts` — 两个新端点
  - `GET /api/review/browse` — 返回 deck→section→card 树状结构，包含 FSRS 状态
  - `POST /api/review/custom` — 接收任意 `card_ids` 数组，启动自定义复习会话

- `client/src/stores/reviewStore.ts`
  - 新增 `BrowseTree`、`BrowseSection`、`BrowseCard` 接口
  - 新增 `browseTree` 状态、`fetchBrowseTree()`、`startCustomSession()`

- `client/src/pages/Review/Review.tsx`
  - 新增「Custom Selection」复习模式（第 5 个模式按钮）
  - 可折叠的 Deck→Section→Card 树状选择器
  - Deck/Section 级别全选复选框（带 indeterminate 状态）
  - 每张卡片旁显示 due 状态指示灯（绿色 = 到期/新卡）
  - Start 按钮动态显示已选卡片数：`Start Review (N cards)`

- `client/src/pages/Review/Review.module.css` — browse tree 样式

### 技术决策

- browse API 返回完整树而非分层请求，减少网络往返
- 自定义复习绕过 FSRS due 过滤，让用户完全自主选择

---

## Step 6：空 catch 块清理（T-1）

**日期**：2026-03-18

### 修改

- **41 个文件**，消除所有空 `} catch {}` 块：
  - 组件（TSX）：`console.error(context, err)` + `addToast('error', msg)`
  - Store（TS）：仅 `console.error(context, err)`
  - 服务端：`console.error(context, err)`
  - KaTeX 渲染器：`console.warn` 降级提示
  - Login/Register 页面补充 `useUIStore` 导入

### 保留的合理空 catch

- `JSON.parse()` 回退（`/* keep as string */`）
- SSE 流解析（`/* ignore */`）
- Migration `safeAlter()`（`/* column already exists */`）

### 影响

- 所有静默失败改为可观测错误
- 用户侧 toast 提供明确的失败反馈

---

## Step 7：DeckDetail 组件拆分（T-2）

**日期**：2026-03-18

### 修改

- `client/src/pages/Decks/DeckDetail.tsx`：907 行 → 270 行
  - 仅保留状态管理、handler、组合子组件

### 新增（子组件）

- `components/DeckHeader.tsx`（107 行）— 页头：返回、deck 名、视图切换、操作按钮
- `components/FilterBar.tsx`（78 行）— 搜索框、模板类型 pills、标签/重要度筛选
- `components/CardGrid.tsx`（193 行）— Grid / List 视图卡片渲染
- `components/SectionList.tsx`（280 行）— Section 头部、拖拽、搜索、展开/折叠
- `components/BatchBar.tsx`（23 行）— 批量操作栏
- `components/ConfirmDialog.tsx`（27 行）— 通用删除确认弹窗
- `components/useDeckDragDrop.ts`（153 行）— 拖拽逻辑自定义 Hook
- `components/types.ts`（33 行）— 共享常量 + `getContentPreview` 工具函数

### 技术决策

- CSS Modules 保持单文件（`DeckDetail.module.css`），子组件通过父路径导入
- 拖拽逻辑提取为 Hook 而非组件，避免 prop drilling 过深
- 所有文件 ≤ 300 行，最大文件 SectionList.tsx = 280 行
