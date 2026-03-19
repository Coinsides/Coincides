# Coincides 开发路线图

> 最后更新：2026-03-19
> 状态：v1.0 🎉 发布 | v1.1 ✅ 完成 | v1.2 ✅ 完成 | v1.3 ✅ 完成 | v1.3.1 ✅ 补丁 | v1.4 📋 规划完成

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

## Round 2（当前）

### Step 1：卡片修复 ✅
- [x] 卡片尺寸调整：grid 卡片从"太宽"改为更高更窄的比例
- [x] 卡片内容预览渲染：接入 KaTeXRenderer，渲染数学公式和 Markdown（目前显示原始文本）
- 完成：1 次对话

### Step 2：Tag Group 系统 ✅
- [x] 新建 `tag_groups` 表（课程级别的标签组）
- [x] 每个课程可有自己的 tag group，tag group 下创建自定义 tag（名称 + 颜色）
- [x] UI：Course 设置 → 管理 tag groups → 添加/编辑/删除 tags → 颜色选择器
- [x] 卡片创建/编辑时，根据所属课程显示对应 tag group 的 tags
- [x] 替换现有全局 system tags 系统
- 示例：数学课 → Definition / Theorem / Formula；英语课 → Vocabulary / Grammar / Reading
- 完成：1 次对话

### Step 3：文档上传 + 解析 ✅
- [x] 新建 `document_chunks` 表（长文档分块存储）
- [x] documents 表增加 `document_type`, `chunk_count`, `error_message` 字段
- [x] 后端文件上传（multer）+ 异步解析流水线：
  - PDF → pdf-parse（数字版）→ 失败则 Haiku 3.5 Vision API（扫描版）
  - DOCX → mammoth
  - XLSX → SheetJS
  - 图片 → Haiku 3.5 Vision API
  - txt/md → 直接存储
- [x] 分块逻辑：短文档（≤30K字符）存 `extracted_text`，长文档按段落边界分块
- [x] AI 自动分类文档类型 + 生成摘要
- [x] 前端：Course 页面 Files 按钮 → DocumentManager 弹窗（拖拽上传、状态轮询、摘要展示）
- 完成：1 次对话

### Step 4：Agent 文档工具 ✅
- [x] 新增 Agent function tool：`search_documents`（SQL LIKE 搜索文件名 + 摘要 + 内容）
- [x] 新增 Agent function tool：`get_document_content`（获取完整文本或按 chunk 获取，支持分页）
- [x] System prompt 引导 Agent 从文档生成卡片（通过 Proposal 机制）
- 完成：1 次对话

### Step 5：拖拽排序 ✅
- [x] Section 之间拖拽排序（调整 order_index）
- [x] Section 内卡片拖拽排序
- [x] 跨 Section 拖拽卡片（卡片移动到另一个 Section）
- [x] 使用 HTML5 drag-and-drop 原生 API（不引入额外库）
- 完成：1 次对话

**Round 2 总计：6-8 次对话**

---

## Round 3（UI/体验打磨）

### Step 1+2：Glassmorphism 设计基础 + 核心页面 ✅
- [x] 新增 20+ glass CSS 变量（表面、模糊、边框、阴影、渐变、光球）
- [x] body 背景渐变 + 半透明表面变量体系
- [x] AppLayout 侧边栏玻璃化 + 环境光球
- [x] DailyBrief、DeckDetail、Decks 核心页面玻璃化
- 完成：1 次对话

### Step 3+4：全面 Glassmorphism 覆盖 ✅
- [x] Review、CardFlip、Statistics、Calendar、Courses、Goals 玻璃化
- [x] 所有 Modal（6个）、AgentPanel、DocumentManager 等玻璃化
- [x] Toast、ShortcutsPanel、Auth、Settings 玻璃化
- [x] 26/26 CSS 模块全部完成 Glassmorphism 改造
- 完成：1 次对话（与 Step 1+2 同次）

### Step 5：Review Groups + Agent 图片上传 ✅
- [x] Review 页面新增模式选择器：All Due Cards / By Deck / By Section / By Tag
- [x] 2×2 卡片式 UI，每个模式带独立图标
- [x] 后端 Review API 支持 deck_id / section_id / tag_id 筛选
- [x] Agent 对话中可直接上传图片（ImagePlus 按钮 + base64 编码）
- [x] Anthropic Vision API + OpenAI 图片支持
- [x] 用于拍照上传手写笔记、截图等场景
- 完成：2026-03-18

**Round 3 总计：3 次对话（Step 1+2、Step 3+4+Hotfix、Step 5）**

---

## Round 4：记忆系统（向量搜索 + RAG）✅

> 状态：Step 1 ✅ 完成 | Step 2 ✅ 完成 | Step 3 ✅ 完成
>
> 🎉 **Round 4 完成 = Coincides v1.0 正式版本发布**

### Step 1：sqlite-vec 向量存储 + Voyage AI Embedding 管线 ✅
- [x] 集成 sqlite-vec v0.1.7（npm 安装，与 better-sqlite3 无缝集成）
- [x] 新建 `doc_chunk_vec` + `agent_memory_vec` 虚拟表（1024 维向量）
- [x] 接入 Voyage AI `voyage-4` 模型（1024 维，$0.06/M tokens）
- [x] 文档上传自动触发 embedding 生成（未分块 / 分块两种路径）
- [x] Agent create_memory 自动生成记忆向量
- [x] API：`GET /api/embedding/status` + `POST /api/embedding/backfill`
- [x] Settings UI：Embedding provider / API Key / Model 配置
- [x] 环境变量后备 + 用户 Settings 优先的双层配置策略
- 完成：2026-03-18

### Step 2：语义搜索 + Agent RAG ✅
- [x] `search_documents` 升级为语义 + 关键词混合搜索
- [x] query → Voyage AI embedding → sqlite-vec KNN → Top-10 chunks
- [x] 返回 `relevant_chunks` 内容片段（RAG 上下文注入）
- [x] `search_memories` 升级为语义搜索，含 similarity_score
- [x] 优雅降级：无 provider / API 失败时自动回退 LIKE
- [x] System Prompt 新增 RAG 使用指导
- 完成：2026-03-18

### Step 3：FTS5 全文搜索 + 三路混合搜索 ✅
- [x] SQLite FTS5 虚拟表（document_chunks_fts + agent_memories_fts）+ 触发器自动同步
- [x] 三路混合搜索引擎：语义向量 > FTS5 全文 > LIKE 关键词
- [x] 三路结果自动去重合并 + 优先级排序
- [x] 未分块文档搜索修复（documents.extracted_text 回退搜索）
- 完成：2026-03-18

### 技术决策记录
| 决策 | 选择 | 理由 |
|---|---|---|
| 向量数据库 | sqlite-vec | 与 better-sqlite3 无缝集成，零外部依赖，npm install 即用 |
| Embedding 模型 | Voyage AI voyage-4（已集成） | 1024 维，$0.06/M tokens，Anthropic 官方合作伙伴 |
| 搜索策略 | Phase 1: SQL LIKE ✅ → Phase 2: 语义搜索 ✅ → Phase 3: 三路混合搜索 ✅ | 分阶段降低复杂度，全部完成 |

---

## v1.1（UX 痛点修复 + 技术债偿还 + 数据模型升级）✅

> 状态：全部完成（Step 1-7），A-1 Agent 报错延后至 v1.2
> 详细规划：[v1.1-plan.md](releases/v1.1-plan.md)
> 变更日志：[CHANGELOG-v1.1.md](releases/CHANGELOG-v1.1.md)
> 发布说明：[RELEASE-NOTES-v1.1.md](releases/RELEASE-NOTES-v1.1.md)

- Step 1：DB Migration 机制 + 配置验证（T-3 + T-4）✅
- Step 2：Task 数据模型升级（M-1）✅
- Step 3：Goal 嵌套支持（M-2 + G-1）✅
- Step 4：日历 CRUD 补全（C-1 + C-2 + G-2）✅
- Step 5：跨 Deck 复习选择器（R-1）✅
- Step 6：空 catch 块清理（T-1）41 个文件）✅
- Step 7：DeckDetail 组件拆分（T-2，907→270 行）✅

---

## v1.2（AI 交互重构 + Goal Manager + 新用户引导 + i18n）✅

> 状态：全部完成（Step 1-7），已打 Tag v1.2.0
> 详细规划：[v1.2-plan.md](releases/v1.2-plan.md)
> 变更日志：[CHANGELOG-v1.2.md](releases/CHANGELOG-v1.2.md)
> 发布说明：[RELEASE-NOTES-v1.2.md](releases/RELEASE-NOTES-v1.2.md)

- Step 1：System Prompt 重写（MWF 脚手架 + 设计宪法）
- Step 2：Agent 工具升级（目标拆解 + 优先级标注）
- Step 3：Goal Manager 完整树形 UI + 拖拽
- Step 4：日历 Course 着色 + Goal 标签
- Step 5：新用户引导流程
- Step 6：i18n 国际化框架（中/英）
- Step 7：Agent 报错排查（A-1 遗留项）

---

## v1.3（工作流引擎 + Time Block + L1 入驻流 + 设计宪法审计）✅

> 状态：全部完成（Step 1-7）
> 详细规划：[v1.3-plan.md](releases/v1.3-plan.md)
> 变更日志：[CHANGELOG-v1.3.md](releases/CHANGELOG-v1.3.md)
> 发布说明：[RELEASE-NOTES-v1.3.md](releases/RELEASE-NOTES-v1.3.md)

- Step 1：Time Block 数据模型 + CRUD API ✅
- Step 2：Time Block 前端 UI（日历周视图 + 拖拽框选）+ Goal 依赖 UI ✅
- Step 3：Agent 排期引擎 + Time Block 感知 + 增量重排 ✅
- Step 4：L1 入驻流全链路（4 步 Onboarding + L1 Protocol）✅
- Step 5：设计宪法全面审计（3 个 P0 修复）✅
- Step 6：DailyBrief 升级（time_blocks + serves_must）✅
- Step 7：边界修复 + 集成测试 + 文档更新 ✅

---

## v1.3.1（补丁版本：bug 修复 + 兼容性 + Agent 稳定性）✅

> 状态：已发布
> 变更日志：[CHANGELOG-v1.3.1.md](releases/CHANGELOG-v1.3.1.md)
> 发布说明：[RELEASE-NOTES-v1.3.1.md](releases/RELEASE-NOTES-v1.3.1.md)

- 3 个 UI bug 修复：日历事件编辑/删除可见性、卡片翻转镜像、公式预览渲染 ✅
- schema.sql 与 migration 同步，修复新库启动崩溃 ✅
- tsx → jiti 替换，修复 Windows 兼容性问题 ✅
- Agent tool_result 持久化 + 超时 120s + 历史清洗 ✅
- Release Notes 工作流正式加入发布流程 ✅

---

## v1.4（复习体验升级 + 错题本 + 成就系统 + Statistics 深度洞察）📋

> 状态：规划完成，待开发
> 详细规划：[v1.4-plan.md](releases/v1.4-plan.md)

- Step 1：错题本数据模型 + API + 复习评分集成
- Step 2：复习模式引擎（填空题 + 选择题 + 混合模式）
- Step 3：错题本前端 UI + 复习入口整合
- Step 4：成就系统（14 个里程碑型成就 + Toast 通知）
- Step 5：Statistics 深度洞察（复习洞察 + 学习节奏 + 课程深度 + 导出）
- Step 6：Goal 多依赖 DAG UI + 动态优先级排期
- Step 7：设计宪法审计 + 集成测试 + 文档更新

---

## 架构决策记录（ADR）

已决定在 `docs/decisions/` 目录维护 ADR 文档，每个重要技术决策写一份简短记录。

| ADR 编号 | 标题 | 状态 |
|---|---|---|
| 0001 | PDF 双通道处理策略 | 已采纳 |
| 0002 | Vision fallback 使用 Haiku 4.5 而非 Sonnet | 已采纳 |
| 0003 | 文档分块存储结构 | 已采纳 |
| 0004 | 不设 Agent 独立上传入口 | 已采纳 |
| 0005 | 不使用本地 AI 模型 | 已采纳 |
| 0006 | Phase 1 不实现向量搜索 | 已采纳 |

---

## 已产出的策略文档

| 文档 | 内容 | 日期 |
|---|---|---|
| 文档处理策略报告 | 主流产品对比、五大格式处理方案、推荐架构 | 2026-03-17 |
| 策略跟进报告（Report 1） | pdf-parse 可靠性、Vision API 成本、800页处理、Markdown 结构、ADR | 2026-03-17 |
| 记忆系统调研（Report 2） | RAG 原理、5 家产品对比、sqlite-vec 推荐、分阶段实施方案 | 2026-03-17 |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React + TypeScript + Vite, CSS Modules |
| 后端 | Node.js 22.x + Express + TypeScript (jiti) |
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
4. **CHANGELOG**：每次 Push 同步更新 `docs/CHANGELOG.md` 并导出到 Google Drive
5. **ADR**：每次架构变更创建 `docs/decisions/NNNN-标题.md`
6. **文件入口统一**：文件统一在 Course 文件池上传，Agent 通过 function tool 读取，不设 Agent 独立上传按钮
