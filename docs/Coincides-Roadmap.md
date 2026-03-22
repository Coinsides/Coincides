# Coincides 开发路线图

> 最后更新：2026-03-22
> 状态：v1.0 🎉 发布 | v1.1~v1.7.3 ✅ 完成 | v1.8 (云端部署 + PWA) 📋 待实施 | v2.0+ 📋 远期规划

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

## v1.8（云端部署 + PWA 离线支持）📋

> 状态：待实施
> 详细规划：[v1.8-plan.md](releases/v1.8-plan.md)
> 里程碑：从“本地工具”转型为“在线服务”，为 v2.0 社区功能铺路
> 方向变更：原计划 Electron 桌面打包，因架构不匹配放弃（详见 Plan 中「为什么放弃 Electron」）

主题：从本地单机工具转型为在线服务，支持多用户注册和离线使用。

- Step 1：清理 Electron 残留 + 仓库整理
- Step 2：SQLite → PostgreSQL 迁移（最大工作量）
- Step 3：多用户支持强化（user_id 隔离 + 文件云存储）
- Step 4：部署上线（Railway + Supabase + Cloudflare）
- Step 5：PWA 离线支持（Service Worker + IndexedDB 缓存）
- Step 6：本地数据迁移工具（可选）

---

## v2.0+（社区平台 + 知识图谱进阶）📋

> 状态：远期规划，待 v1.8 云端部署完成后启动

这是从“在线工具”到“社区平台”的分水岭。

### v2.0 核心
- **社区模板市场**：用户设计卡片模板（类似魔兽争霸地图编辑器）+ 社区投票 + 奖励机制
- **课堂协作**：以课程为单位的学生群体共创卡片集
- **开放模板引擎**：用户自定义卡片模板（字段结构 + 渲染方式）

### v2.x 进阶
- **Goal DAG 可视化**：目标依赖图自动布局 + 跨课程依赖 + Agent 全局排期
- **卡片关系层**：card_relations（prerequisite / sequence / comparison）+ 知识 DAG
- **知识画布**：白板 UI，卡片自由拼装 + 连接件 + DAG 可视化
- **开放模板引擎**：用户自定义卡片模板（字段结构 + 渲染方式）
- **复习模式引擎**：填空 / 选择 / 混合复习 + 错题本

---

## Backlog（待排期——归入 v2.x 规划）

- 复习体验升级：复习模式引擎（填空/选择/混合）+ 错题本系统
- 成就系统：里程碑型成就（无 streak）+ 解锁通知
- Statistics 深度洞察：记忆保持率曲线 + 学习节奏 + 课程深度 + 数据导出
- 通知系统 + 自动化测试 + 安全加固

> 以上均待 v1.8 云端版稳定后，在 v2.x 中规划实施。

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
| 部署 | 本地开发 → v1.8 迁移至云端（Railway + Cloudflare + Supabase） |

---

## 关键约定

1. **Proposal 机制**：所有 AI 生成的变更必须经过 Proposal → Review → Apply
2. **Minimum Working Flow**：任务分为 Must / Recommended / Optional，Agent 帮助学生维持最低日常学习
3. **Agent 不做详细解题**：Agent 定位是学习伙伴，不是解题工具
4. **CHANGELOG**：每次 Push 同步更新 `docs/releases/CHANGELOG-vX.X.md`
5. **ADR**：每次架构变更创建 `docs/decisions/NNNN-标题.md`
6. **文件入口统一**：文件统一在 Course 文件池上传，Agent 通过 function tool 读取
7. **设计宪法**：三条不可违反——不替用户做决定、不监控用户、不制造挫败感
