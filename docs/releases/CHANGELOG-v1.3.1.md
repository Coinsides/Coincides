# Coincides v1.3.1 — CHANGELOG

> 补丁版本：bug 修复 + 兼容性修复 + Agent 稳定性
> 发布日期：2026-03-19

---

## Bug 修复 — 3 个 UI 问题
**commit**: `92d0712`

### 修复
- **日历事件删改不可发现**：侧边栏 Day Detail 面板的任务项仅通过右键菜单支持编辑/删除，用户无法发现。新增可见的 ✏️ 编辑 / 🗑️ 删除图标按钮，hover 时显示
- **卡片翻面镜像**：`.cardFace` 上的 `backdrop-filter`（glassmorphism 模糊效果）破坏了 `backface-visibility: hidden`，导致背面内容在正面以镜像形式透出。移除 `.cardFace` 的 `backdrop-filter`，3D 翻转恢复正常
- **公式卡片预览不渲染**：`getContentPreview()` 返回的 formula 文本缺少 `$...$` 定界符，KaTeXRenderer 将其当作纯文本输出。为 formula 类型内容包裹 `$...$`

### 变更文件
- `client/src/pages/Calendar/Calendar.tsx` — 新增 Edit/Delete 按钮
- `client/src/pages/Calendar/Calendar.module.css` — `.taskActions`、`.taskActionBtn`、`.taskActionBtnDanger` 样式
- `client/src/components/CardFlip/CardFlip.module.css` — 移除 `.cardFace` 的 `backdrop-filter`
- `client/src/pages/Decks/components/types.ts` — formula 预览包裹 `$...$`

---

## schema.sql 与 migration 同步修复
**commit**: `4ba65f2`

### 修复
- **新库启动崩溃（`no such column: parent_id`）**：`schema.sql` 的 `goals` 表定义缺少 `parent_id` 列，但末尾有 `CREATE INDEX ... ON goals(parent_id)`。对于全新数据库，表建完后 index 找不到列直接崩溃
- 将所有 migration 添加的列同步到 `schema.sql` 基础表定义中：
  - `goals` 表：新增 `parent_id`
  - `tasks` 表：新增 `description`、`start_time`、`end_time`、`is_prerequisite`、`serves_must`、`checklist`
  - `tags` 表：新增 `tag_group_id`
  - `documents` 表：新增 `document_type`、`chunk_count`、`error_message`

### 变更文件
- `server/src/db/schema.sql` — 同步所有 migration 新增列到基础 CREATE TABLE

---

## tsx → jiti 兼容性修复
**commit**: `672add3`（最终方案）, `6c72402`（中间尝试）

### 修复
- **Windows Node.js 下 `ERR_UNSUPPORTED_ESM_URL_SCHEME` 错误**：tsx 在 Windows 路径下使用 ESM loader 时抛出 `file:///D:...` 相关错误，Node v22/v25 均复现
- 尝试 `node --import tsx`（6c72402）未解决，最终替换为 **jiti** 作为 TypeScript 运行时
- 服务器启动命令从 `npx tsx server/src/index.ts` 改为 `node --import jiti/register server/src/index.ts`

### 变更文件
- `server/package.json` — dev script 改为 `node --import jiti/register src/index.ts`，新增 `jiti` devDependency
- 移除 `tsx` 依赖

---

## Agent 稳定性修复（2 项）

### tool_result 持久化
**commit**: `20837ca`

- **Anthropic API 报错 `tool_use ids found without tool_result blocks`**：orchestrator 在多轮工具调用时未将中间轮次的 tool_result 存入 DB，下次请求时 Anthropic 找不到对应的 tool_result
- 修复：orchestrator 每轮工具调用后立即保存 tool_result 消息到 agent_messages 表

### 变更文件
- `server/src/agent/orchestrator.ts` — 新增 tool_result 持久化逻辑 + `lastRoundHadTools` 状态追踪

### Agent 超时 + 历史清洗
**commit**: `8fe1d73`

- **Agent 30 秒超时**：复杂工具调用（如批量卡片创建）超过 30 秒后被强制中断。超时时间从 30s 调整为 120s
- **孤立 tool_use/tool_result**：对话历史中出现不配对的 tool_use 或 tool_result，导致 Anthropic API 拒绝请求。新增 `sanitizeHistory()` 函数，在发送前清理孤立的工具消息
- 短期记忆窗口从 20 条调整为 50 条

### 变更文件
- `server/src/agent/orchestrator.ts` — 超时 30s→120s
- `server/src/agent/memory/manager.ts` — `sanitizeHistory()` 函数 + 窗口 20→50
