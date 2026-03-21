# CHANGELOG — v1.6

> **主题**：知识图谱整合（Phase 1）— Course 中心化 + UI 结构重组
> **日期**：2026-03-21

---

## 新增

### Course 详情页
- 新增 `/courses/:courseId` 路由和 `CourseDetail` 页面
- 详情页展示三个区块：Goals（含任务计数 + 进度条）、Card Decks（含卡片数 + 待复习数 + Review 按钮）、Documents（含解析状态）
- 新增 `GET /api/courses/:id/summary` 后端 API —— 一次请求聚合返回 course + goals + decks + documents 统计数据
- Course 列表页卡片点击改为跳转详情页（原有 Files/Tags/Edit/Delete 按钮保留，阻止冒泡）
- 侧边栏 Courses 区域课程项点击也跳转到对应 Course 详情页

### Deck 复习入口
- Decks 列表页每个 Deck 卡片底部新增「Review」按钮
- Course 详情页 Deck 卡片也有「Review」按钮
- 点击后跳转 `/review?deckId=xxx`，自动选中该 Deck 开始复习

## 变更

### 侧边栏精简
- 移除侧边栏 `/review` 导航项（Review 功能通过 Deck 卡片的复习按钮进入）
- `/review` 路由保留可直接访问，仅从导航栏隐藏

### Card Section 强制化
- **DB 迁移 010**：为所有 `section_id = NULL` 的卡片自动创建 "Unsorted" Section 并赋值
- **API 校验**：`POST /api/cards` 拒绝无 `section_id` 的请求，返回 400
- **Agent 工具**：`create_card` 工具 `section_id` 改为 required 参数，未提供时返回错误提示
- **Agent 协议**：System Prompt 新增「Section-First Card Creation Protocol」—— 批量创建卡片前必须先分析文档章节结构、创建 Section、再创建卡片
- **前端 CardModal**：Section 选择器改为必选项，不允许留空，提交时校验

---

## 文件变更清单

### 新增文件
| 文件 | 描述 |
|------|------|
| `client/src/pages/Courses/CourseDetail.tsx` | Course 详情页组件 |
| `client/src/pages/Courses/CourseDetail.module.css` | 详情页样式 |
| `server/src/db/migrations/010_enforce_card_sections.ts` | Section 强制化迁移 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `client/src/App.tsx` | 新增 CourseDetailPage import + `/courses/:courseId` 路由 |
| `client/src/pages/Courses/Courses.tsx` | 卡片点击跳转详情页 + 按钮 stopPropagation |
| `client/src/components/Layout/AppLayout.tsx` | navItems 移除 `/review`；课程项跳转详情页 |
| `client/src/pages/Decks/Decks.tsx` | 新增 Review 按钮 |
| `client/src/pages/Decks/Decks.module.css` | Review 按钮样式 |
| `client/src/components/CardModal/CardModal.tsx` | Section 必选校验 |
| `server/src/routes/courses.ts` | 新增 `GET /api/courses/:id/summary` |
| `server/src/routes/cards.ts` | POST 校验 section_id 非空 |
| `server/src/agent/tools/definitions.ts` | `create_card` section_id 改 required |
| `server/src/agent/tools/executor.ts` | `create_card` 强制校验 section_id |
| `server/src/agent/system-prompt.ts` | Section-First Card Creation Protocol |
