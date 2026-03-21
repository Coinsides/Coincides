# Coincides 开发路线图

> 最后更新：2026-03-21
> 状态：v1.0 🎉 发布 | v1.1~v1.5.3 ✅ 完成 | v1.6 ✅ 完成 | v1.7 📋 规划完成 | v1.8~v1.9 📋 待规划

---

## 已完成

### Phase 0-4（核心功能）✅
- 用户系统、课程管理、目标管理、任务系统（Must/Recommended/Optional）
- 卡片系统 + FSRS 间隔重复 + KaTeX 数学渲染
- Agent 系统（SSE 流式、18+ function tools、Proposal 机制）
- 学习模板、统计面板、日历视图、Daily Brief
- 纯 SVG 图表、Glassmorphism 风格探索

### Polish Round 1 ✅
- Review 界面优化（左滑答案、右滑翻转、键盘快捷键）
- 卡片模板渲染（Definition/Theorem/Formula/General）
- Section 系统（创建、折叠、批量操作）
- 智能 Daily Brief（Minimum Working Flow 整合）
- 快捷键面板

### Polish Round 1 Patch ✅
- Section 删除（确认弹窗 + 级联删除卡片）
- Section 重命名（行内编辑）
- Section 内搜索过滤
- 批量选择 → Review 选中卡片

---

## Round 2（功能扩展）✅

- Step 1：卡片修复（尺寸 + KaTeX 预览渲染）
- Step 2：Tag Group 系统（课程级标签组）
- Step 3：文档上传 + 解析（PDF/DOCX/XLSX/IMG/TXT）
- Step 4：Agent 文档工具（search_documents + get_document_content）
- Step 5：拖拽排序（Section + 卡片跨 Section 拖拽）

---

## Round 3（UI/体验打磨）✅

- Step 1+2：Glassmorphism 设计基础 + 核心页面
- Step 3+4：全面 Glassmorphism 覆盖（26/26 CSS 模块）
- Step 5：Review Groups + Agent 图片上传

---

## Round 4：记忆系统（向量搜索 + RAG）✅

- Step 1：sqlite-vec 向量存储 + Voyage AI Embedding
- Step 2：语义搜索 + Agent RAG
- Step 3：FTS5 全文搜索 + 三路混合搜索

🎉 **Round 4 完成 = Coincides v1.0 正式版本发布**

---

## v1.1（UX 痛点修复 + 技术债偿还 + 数据模型升级）✅

> 详细规划：[v1.1-plan.md](releases/v1.1-plan.md)
> 变更日志：[CHANGELOG-v1.1.md](releases/CHANGELOG-v1.1.md)

- DB Migration 机制 + 配置验证
- Task 数据模型升级 + Goal 嵌套支持
- 日历 CRUD 补全 + 跨 Deck 复习选择器
- 空 catch 块清理 + DeckDetail 组件拆分

---

## v1.2（AI 交互重构 + Goal Manager + 新用户引导 + i18n）✅

> 详细规划：[v1.2-plan.md](releases/v1.2-plan.md)
> 变更日志：[CHANGELOG-v1.2.md](releases/CHANGELOG-v1.2.md)

- System Prompt 重写（MWF 脚手架 + 设计宪法）
- Agent 工具升级 + Goal Manager 完整树形 UI + 拖拽
- 日历 Course 着色 + 新用户引导流程 + i18n

---

## v1.3（工作流引擎 + Time Block + L1 入驻流 + 设计宪法审计）✅

> 详细规划：[v1.3-plan.md](releases/v1.3-plan.md)
> 变更日志：[CHANGELOG-v1.3.md](releases/CHANGELOG-v1.3.md)

- Time Block 数据模型 + CRUD + 前端 UI + 拖拽框选
- Agent 排期引擎 + Time Block 感知 + 增量重排
- L1 入驻流全链路 + 设计宪法全面审计
- DailyBrief 升级（time_blocks + serves_must）

---

## v1.3.1（补丁：bug 修复 + 兼容性 + Agent 稳定性）✅

> 变更日志：[CHANGELOG-v1.3.1.md](releases/CHANGELOG-v1.3.1.md)

- 3 个 UI bug 修复 + schema.sql 与 migration 同步
- tsx → jiti 替换（Windows 兼容）+ Agent 稳定性增强

---

## v1.3.2（补丁：Agent 工具修复）✅

> 变更日志：[CHANGELOG-v1.3.2.md](releases/CHANGELOG-v1.3.2.md)

---

## v1.4（Time Block L1 补全 + 卡片数据模型升级）✅

> 详细规划：[v1.4-plan.md](releases/v1.4-plan.md)
> 变更日志：[CHANGELOG-v1.4.md](releases/CHANGELOG-v1.4.md)

- 卡片 Example 字段 + 详情视图放大
- Time Block 24h 刻度线 + 时间标签 + 右键编辑/删除

---

## v1.5（Time Block 重构：图层嵌套 + 编辑模式 + 任务关联）✅

> 详细规划：[v1.5-plan.md](releases/v1.5-plan.md)
> 变更日志：[CHANGELOG-v1.5.md](releases/CHANGELOG-v1.5.md)

主题：重新定义 Time Block 的视觉呈现和交互模型。

- 全局布局拓宽 + 创建交互重构（框选→编辑面板）
- 编辑模式切换 + 网格线偏好 + 去重叠警告
- Study Block 单层约束 + 图层嵌套渲染
- 浮空预览 + 动态时间范围
- 任务显式关联 Block + Agent 可用时间计算重写

---

## v1.5.1（Time Block UX 优化）✅

> 详细规划：[v1.5.1-plan.md](releases/v1.5.1-plan.md)
> 变更日志：[CHANGELOG-v1.5.1.md](releases/CHANGELOG-v1.5.1.md)

- 修右键创建 TB Bug + Day Detail 居中浮层
- 类型即名字（去掉 label）+ 开放类型系统 combobox
- 优先级 Badge（2M·1R·3O 格式）

---

## v1.5.2（Task-Block 关联完善）✅

> 变更日志：[CHANGELOG-v1.5.2.md](releases/CHANGELOG-v1.5.2.md)

- Task-Block 关联 UI 修复
- Hover 面板不显示修复（React 事件回收问题）
- 已关联 TB 的任务隐藏于 allDay 区域

---

## v1.5.3（Agent 智能规划升级）✅

> 详细规划：[v1.5.3-plan.md](releases/v1.5.3-plan.md)
> 变更日志：[CHANGELOG-v1.5.3.md](releases/CHANGELOG-v1.5.3.md)

- 问卷收集工具 `collect_preferences` + PreferenceForm 前端组件
- Agent TB 工具扩展：create/update/delete_time_blocks + MAX_TOOL_ROUNDS=8
- System Prompt 升级：计划前问卷协议 + 双模式排期协议 + 文档感知协议
- Proposal 时间编辑 UI（TimePickerInline + Calendar Event 模式）
- 周视图时间轴对齐 bug 修复

---

## v1.6（知识图谱整合 Phase 1：Course 中心化 + UI 结构重组）✅

> 详细规划：[v1.6-v1.7-plan.md](releases/v1.6-v1.7-plan.md)
> 变更日志：[CHANGELOG-v1.6.md](releases/CHANGELOG-v1.6.md)

主题：Course 从列表页升级为知识中心，合并冗余导航，强制 Section 归属。

- **Course 详情页**：新增 `/courses/:courseId` 路由，展示 Goals（含任务计数+进度条）、Card Decks（含卡片数+待复习数+Review 按钮）、Documents
- **侧边栏精简**：移除 `/review` 导航项，Review 功能改为 Deck 卡片上的按钮入口
- **Section 强制化**：DB 迁移处理历史 NULL section_id；API + Agent 工具 + 前端三层校验
- **Agent 协议升级**：Section-First Card Creation Protocol（先建章节→再建卡片）

---

## v1.7（知识图谱整合 Phase 2：Task-Card 联动）📋

> 详细规划：[v1.6-v1.7-plan.md](releases/v1.6-v1.7-plan.md)
> 状态：规划完成，待实施

主题：打通 Task ↔ Card 双向关联，建立完整知识图谱链路。

- **Task-Card 关联数据模型**：新增 `task_cards` M:N 关联表，支持任务级 + checklist 条目级两种粒度
- **TaskViewModal（查看模式）**：点击任务先进入只读查看，再点编辑进入编辑模式
- **CardBubble 组件**：查看模式下展示关联卡片气泡
- **Agent 关联协议**：Agent 创建学习计划时自动建立 Task ↔ Card 关联

---

## v1.8（Goal DAG + 复习模板系统）📋

> 状态：待规划
> 需求条目：GD-5~8, CD-6（5 条）

- 多依赖选择 UI + DAG 可视化图
- Agent DAG 排期 + 动态优先级
- 各类型独立复习模板系统

---

## v1.9（Electron + 基础设施 + Time Block L3）📋

> 状态：待规划
> 需求条目：TB-L2a/b, INF-1~4（6 条）

- Time Block 模板系统 + 格子点选创建
- Electron 打包 + 分发
- 通知系统 + 自动化测试 + 安全加固

---

## Backlog（待排期）

以下需求已确认但未分配版本：

- 复习体验升级：复习模式引擎（填空/选择/混合）+ 撕胶带交互 + 错题本系统（RV-1~6, CD-4/5, WB-1~5）
- 成就系统：里程碑型成就（无 streak）+ 解锁通知（AC-1~6）
- Statistics 深度洞察：记忆保持率曲线 + 学习节奏 + 课程深度 + 数据导出（ST-1~4）
- AI 推导过程按钮（CD-4）

---

## 架构决策记录（ADR）

| ADR 编号 | 标题 | 状态 |
|---|---|---|
| 0001 | PDF 双通道处理策略 | 已采纳 |
| 0002 | Vision fallback 使用 Haiku 4.5 而非 Sonnet | 已采纳 |
| 0003 | 文档分块存储结构 | 已采纳 |
| 0004 | 不设 Agent 独立上传入口 | 已采纳 |
| 0005 | 不使用本地 AI 模型 | 已采纳 |
| 0006 | Phase 1 不实现向量搜索 | 已采纳 |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite 5, CSS Modules, Zustand |
| 后端 | Node.js 22.x + Express 4 + TypeScript (jiti) |
| 数据库 | SQLite (better-sqlite3), WAL 模式 |
| AI | Anthropic Claude API (Haiku 4.5 / Sonnet 4.5) |
| 卡片算法 | ts-fsrs (间隔重复) |
| 数学渲染 | KaTeX |
| 向量搜索 | sqlite-vec v0.1.7 + Voyage AI voyage-4 (1024 维) |
| 部署 | 本地 Windows 11 |

---

## 关键约定

1. **Proposal 机制**：所有 AI 生成的变更必须经过 Proposal → Review → Apply
2. **Minimum Working Flow**：任务分为 Must / Recommended / Optional，Agent 帮助学生维持最低日常学习
3. **Agent 不做详细解题**：Agent 定位是学习伙伴，不是解题工具
4. **CHANGELOG**：每次 Push 同步更新 `docs/releases/CHANGELOG-vX.X.md`
5. **ADR**：每次架构变更创建 `docs/decisions/NNNN-标题.md`
6. **文件入口统一**：文件统一在 Course 文件池上传，Agent 通过 function tool 读取
7. **设计宪法**：三条不可违反——不替用户做决定、不监控用户、不制造挫败感
