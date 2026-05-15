# Coincides 开发路线图

> 最后更新：2026-05-12
> 状态：v1.0 🎉 发布 | v1.1~v1.7.3 ✅ 完成 | v1.8 Cloud/PWA 计划已暂停/历史保留 | v1.9 Local-first Stable Core 📋 规划中 | v2.x Note + Composable Learning System 📋 初步规划

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

## v1.7（知识图谱整合 Phase 2：Task-Card 联动）✅

> 详细规划：[v1.7-plan.md](releases/v1.7-plan.md)
> 变更日志：[CHANGELOG-v1.7.md](releases/CHANGELOG-v1.7.md)

主题：打通 Task ↔ Card 双向关联，建立完整知识图谱链路。

- **v1.7.0**：Task-Card 关联数据模型 + TaskViewModal + CardBubble + Agent 关联协议
- **v1.7.1**：Agent 效率深度优化（并行工具执行 + 分场景 Playbook + Context 预注入）
- **v1.7.2**：学习计划流程完善（MonthCalendar 日期选择 + Time Block 缺口检测 + 两步 Proposal）
- **v1.7.3**：Time Block 模板化（date-based 实例 + 多套模板 + 周视图编辑器 + Proposal 周视图编辑）
- **Bug Fixes**：Proposal 机制强制化、max_tokens 修复、Checklist 格式兼容、目标级联删除任务、FK 修复、消息重复修复、Goals 任务详情增强、Move to 功能

---

## v1.8 Cloud/PWA Plan（Postponed / Superseded）📋

> 状态：历史保留，不再作为当前 v1.x → v2.x 的主线前置
> 详细规划：[v1.8-plan.md](releases/v1.8-plan.md)
> 方向变更：旧方案假设 Coincides 要优先变成在线服务；当前主线已改为 local-first、open-source、self-hostable。

原 v1.8 计划包含 SQLite → PostgreSQL、云端部署、多用户在线服务、PWA 离线支持等内容。该方案保留为历史架构记录，但不再阻塞 v2.0，也不再作为社区能力的必要前置条件。

云端托管、PostgreSQL、PWA、账号体系仍可在未来作为 optional hosted services 重新评估，但当前不进入主路径。

---

## v1.9（Local-first Stable Core）📋

> 状态：规划中
> 里程碑：把 Coincides 稳定为本地优先、开源、自托管的学习材料与学习路径整理器。

v1.9 的目标不是新增大量可见功能，而是为 v2.x 的 Note、Recovery、社区包和外部 Agent 集成打地基。

- **Local Profile / Local Workspace**：默认产品语言从云账号心智转向本地工作区；内部可继续保留 `user_id`，但 UI 不应暗示 Coincides 默认提供云账号。
- **Local-first setup**：改善首次启动、本地数据目录、环境诊断、API key 配置、升级安全、备份和恢复路径。
- **Minimal Recovery Layer**：为核心对象加入 soft delete、Recent Changes、OperationBatch、AI Proposal apply log 的最小实现。
- **Core flow hardening**：稳定 course / deck / card / document / proposal 主流程，确保后续 AI 批量生成和外部导入出现错误时可以纠正。
- **Design Constitution alignment**：继续遵守不替用户做决定、不监控用户、不制造挫败感；Coincides 是学习材料和学习路径整理器，不假装成人类导师。

---

## v2.0+（Note + Composable Learning System）📋

> 状态：初步规划，详见 [v2-note-system-draft.md](v2-note-system-draft.md)
> 范围说明：以下是分阶段方向，不代表 v2.0 一次性交付所有能力。

### v2.0：Note Foundation
- 建立 `Note` / `NoteBlock` / `NoteTemplate` 基础模型。
- 提供手动 Note 创建与编辑。
- 支持基础 block：Definition、Theorem、Example、Proof、Formula、Image、Sidenote 等。
- 提供 Study View / Edit View / Export View；Markdown 继续作为导出格式，不作为核心存储格式。

### v2.1：AI Note Proposal
- 从上传文档、OCR、解析结果生成 Note Proposal。
- 保留 source order、source link、AI confidence 和 block boundary。
- 用户确认后再 apply，避免 AI 直接改动正式结构。
- 图像先以原始区域截图 + caption 的方式保留，不急于 AI 重画。

### v2.2：Template + Style Registry
- 建立 schema-first 的模板和样式 registry。
- 第一阶段开放 NoteBlockTemplate、CardTemplate、NoteTheme、BlockStyle。
- 社区包先只支持模板和样式，不执行任意 JS。
- 支持 package preview、duplicate、local customization、compatibility metadata。

### v2.3：Learning Material Analytics
- 让用户“玩自己的笔记和知识”：对上传材料、NoteBlocks、Cards 生成轻量统计。
- 支持 concept bubble chart、chapter heatmap、concept frequency、block type distribution、source density map、review readiness views。
- 统计表达保持事实性，例如“出现频率高”，避免替用户下判断或制造挫败感。

### v2.4：External Agent Capability Layer
- 让 Coincides 作为未来 AI 管家系统下的 Learning Module 被调用。
- 通过 capability API 暴露 `import_source`、`create_note_proposal`、`generate_knowledge_points`、`create_card_proposal`、`get_job_status`、`get_result_link` 等能力。
- 默认使用 Learning Inbox + Proposal，避免外部 Agent 误创建正式 course、deck、note 或 card。
- 结构性创建、合并、删除、批量移动必须经过用户确认或明确 scoped permission。

### v2.5：Scoped Knowledge Map
- 不主动生成全局大型知识图谱。
- 由用户选择 courses、decks、blocks、concepts 和关系类型，再生成局部知识联系图。
- 优先 2.5D / pencil sketch 风格，降低大型 3D 图谱的视觉噪音和注意力消耗。
- 可作为 Learning Material Analytics 的进阶视图。

### Later
- 社区网站：发布文档、下载主版本、展示/分享模板样式包，论坛或讨论区保持可选。
- 完整 CommunityPackage 生态：布局规则、学习路径规则、渲染预设、导入导出适配器。
- 沙盒插件能力：只有在安全模型成熟后才允许社区逻辑执行。
- Optional hosted services：云同步、PWA、托管社区服务、PostgreSQL 等可作为未来分支重新评估。

---

## Backlog（待排期——归入 v2.x 规划）

- 复习体验升级：复习模式引擎（填空/选择/混合）+ 错题本系统
- 成就系统：里程碑型成就（无 streak）+ 解锁通知
- Statistics 深度洞察：记忆保持率曲线 + 学习节奏 + 课程深度 + 数据导出
- 通知系统 + 自动化测试 + 安全加固

> 以上不再依赖 v1.8 云端版。后续排期以 local-first 稳定核心、Note 系统、Recovery Layer 和可组合社区包为主线。

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
| 部署 | Local-first / self-hostable；Railway + Cloudflare + Supabase 仅作为未来 optional hosted services |

---

## 关键约定

1. **Proposal 机制**：所有 AI 生成的变更必须经过 Proposal → Review → Apply
2. **Minimum Working Flow**：任务分为 Must / Recommended / Optional，Agent 帮助学生维持最低日常学习
3. **Agent 不做详细解题**：Agent 定位是学习伙伴，不是解题工具
4. **CHANGELOG**：每次 Push 同步更新 `docs/releases/CHANGELOG-vX.X.md`
5. **ADR**：每次架构变更创建 `docs/decisions/NNNN-标题.md`
6. **文件入口统一**：文件统一在 Course 文件池上传，Agent 通过 function tool 读取
7. **设计宪法**：三条不可违反——不替用户做决定、不监控用户、不制造挫败感
