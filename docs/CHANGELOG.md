# Coincides — Changelog

All notable changes to this project will be documented in this file.

---

## [Round 3 Step 3+4 Patch] — 2026-03-18

### 部署黑屏修复 + 全局 UI 放大

#### 部署黑屏根因
- Vite 构建输出使用绝对路径 `/assets/...`，但部署 CDN 不在根目录，导致 JS/CSS 文件无法加载
- 修复：vite.config.ts 添加 `base: './'`，所有资产路径变为相对路径

#### UI 全局等比放大（26 个 CSS 文件）
- **基础字号**：html 16→17px，body 14→15px
- **导航栏**：导航项 13→14px，padding 增加，侧边栏宽度 260→270px
- **登录页**：卡片宽度 380→420px，标题 22→26px，输入框/按钮全部放大
- **所有页面/组件**：font-size +1～2px，padding +2～4px，gap +1～2px
- 圆角变量均增加 1～2px
- 未更改任何颜色、边框、阴影、玻璃效果

#### Files
- 修改 27 个文件（26 个 CSS + vite.config.ts）

---

## [Round 3 Hotfix v2] — 2026-03-17

### Glassmorphism 黑屏彻底修复

#### 问题
- 用户本地仍然看到全黑屏幕，v1 hotfix 只微调了变量亮度不够
- 根因：`--bg-*` 变量为半透明 rgba，当 `backdrop-filter` 不生效时叠加在暗色渐变上结果变黑

#### 修复策略（仅 global.css）

1. **`--bg-*` 变量改回实色**：不再依赖 `backdrop-filter`
   - `--bg-surface: #1a1a3e`（旧值 `rgba(25,25,50,0.65)`）
   - `--bg-elevated: #222250`（旧值 `rgba(35,35,65,0.55)`）
   - `--bg-hover: #2a2a5a`、`--bg-active: #323268`

2. **背景渐变再提亮**：`#12122e` → `#1a1a50` → `#132244` → `#181845`

3. **玻璃表面更高不透明度**：
   - `--glass-surface: rgba(26,26,62, 0.78)`（旧 0.65）
   - `--glass-elevated: rgba(34,34,80, 0.72)`（旧 0.55）

4. **新增 `@supports not (backdrop-filter)` fallback**：当浏览器不支持 backdrop-filter 时自动回退到实色

5. **边框/光球进一步增强**：边框 12%/20%，光球 30%/22%

#### Files
- 修改 1 个文件: global.css
- 重新部署前端构建

---

## [Round 3 Step 3+4] — 2026-03-17

### Glassmorphism 全面覆盖：学习页面 + 弹窗 + 面板组件

#### Step 3: 学习 + 数据页面（6 个 CSS 文件）
- **Review**: 统计卡片玻璃化，进度条/按钮渐变化
- **CardFlip**: 卡片正反面玻璃表面 + blur + 浮动阴影
- **Statistics**: 概览卡片/课程卡片玻璃化，图表容器 glass-elevated
- **Calendar**: 日历网格玻璃化，日期单元格玻璃悬停，详情面板 blur
- **Courses**: 课程卡片玻璃 + hover 发光 + 微升，确认弹窗玻璃化
- **Goals**: 目标卡片玻璃 + 进度条渐变 + 状态标记 glass-elevated

#### Step 4: 弹窗 + 面板组件（15 个 CSS 文件）
- **6 个 Modal**（Card/CardView/Course/Deck/Goal/Task）：蒙版 blur + 对话框玻璃 + 输入框玻璃 + 渐变按钮
- **AgentPanel + MessageBubble + ProposalList**: 面板玻璃化，消息气泡 glass-elevated，提案卡片玻璃化
- **DocumentManager**: 玻璃模态框 + 拖拽上传区玻璃虚线
- **TagGroupManager**: 标签组卡片玻璃 + 标签芯片保留语义色
- **Toast**: 玻璃 + blur-lg + 保留状态色
- **ShortcutsPanel**: 玻璃面板 + 快捷键徽章 glass-elevated
- **Auth**: 浮动玻璃登录卡片 + blur-lg + 渐变提交按钮
- **Settings**: 设置卡片玻璃 + 输入框/开关玻璃模式

#### Files
- 修改 21 个 CSS 文件，覆盖项目全部 26 个 CSS 模块中的剩余 21 个
- Glassmorphism 现已 100% 覆盖所有 UI 组件

---

## [Round 3 Step 1+2] — 2026-03-17

### Glassmorphism 设计系统 + 核心页面改造

#### Step 1: 设计基础（global.css）
- 新增 20+ Glassmorphism CSS 变量：半透明表面、模糊等级、玻璃边框、玻璃阴影、渐变色、环境光球
- `--bg-*` 变量从纯色改为半透明 rgba，`--border-*` 改为柔和白色透明度
- body 背景从纯色改为 135° 渐变（深蕴 + 深蓝 + 深青）
- 渐变按钮变量：`--gradient-primary`、`--gradient-success`、`--gradient-danger`
- Light theme 同步适配白色系玻璃变量

#### Step 2: 核心布局 + 高频页面（4 个 CSS 文件）
- **AppLayout**: 侧边栏玻璃效果 + backdrop-blur，主内容区透明背景，固定位置环境光球（::before/::after 伪元素，零 JSX 改动）
- **DailyBrief**: 所有卡片/容器玻璃化，保留任务优先级左侧色条，按钮渐变化
- **DeckDetail** (839行): Section 头玻璃化，Grid 卡片玻璃 + hover 发光边框 + 微升效果，List 视图玻璃容器，过滤器渐变高亮，确认弹窗玻璃化
- **Decks**: Deck 卡片玻璃效果 + hover 发光

#### 技术细节
- 所有 backdrop-filter 均配对 -webkit-backdrop-filter（Safari 兼容）
- 纯 CSS 改造，零 TSX 代码变更
- 模糊等级分层：sm(8px) 小元素 / md(16px) 标准表面 / lg(24px) 仅用于弹窗
- 语义色彩保留（模板徽章 DEF/THM/FML/GEN、优先级色、状态色）

#### Files
- 修改 5 个文件: global.css, AppLayout.module.css, DailyBrief.module.css, DeckDetail.module.css, Decks.module.css

---

## [Round 2 Step 5] — 2026-03-17

### 拖拽排序系统

#### Section 拖拽排序
- Section 之间可通过拖拽手柄（GripVertical）调整顺序
- 拖拽时显示半透明效果 + 插入位置指示线
- 后端批量更新 `order_index`（SQLite 事务保证原子性）

#### Section 内卡片拖拽排序
- 同一 Section 内的卡片可拖拽调整顺序
- Grid 和 List 两种视图均支持拖拽
- 卡片显示 GripVertical 拖拽手柄

#### 跨 Section 拖拽卡片
- 卡片可从一个 Section 拖拽到另一个 Section
- 拖拽到 Section 标题上 = 移动到该 Section 末尾
- 支持拖拽到「Unsectioned」区域（section_id 设为 null）
- 目标 Section 高亮显示（虚线边框 + 背景色变化）

#### 技术实现
- 使用 HTML5 原生 Drag and Drop API（零依赖）
- 乐观更新：拖拽完成后立即更新 UI，API 失败时 toast 提示并回滚
- 批量选择模式下自动禁用拖拽（避免操作冲突）
- Section 重命名编辑中禁用该 Section 拖拽

#### 新增 API
- `PUT /api/sections/reorder` — 批量更新 Section 顺序
- `PUT /api/cards/reorder` — 批量更新卡片 section_id + order_index

#### Files
- 修改 7 个文件: sections.ts (routes), cards.ts (routes), validators/index.ts, sectionStore.ts, cardStore.ts, DeckDetail.tsx (+244 lines), DeckDetail.module.css

---

## [Round 2 Step 4] — 2026-03-17

### Agent 文档工具

#### 新增 Function Tools
- **`search_documents`**: 按文件名/摘要/内容搜索已上传的文档，支持课程和文件类型过滤
- **`get_document_content`**: 获取文档全文或指定 chunk，支持分页读取长文档（50K 字符截断保护）

#### System Prompt 更新
- 文档列表现在显示 Document ID，Agent 可直接引用
- 新增「Document-Based Card Generation」引导流程：搜索文档 → 读取内容 → 识别概念 → 通过 Proposal 生成卡片
- Agent 现在能回答关于文档内容的问题（“我上传的笔记里有什么？”）

#### 功能串联
- Agent 现在支持完整的文档到卡片工作流：
  1. `search_documents` → 找到目标文档
  2. `get_document_content` → 读取文档内容
  3. `create_proposal` (batch_cards) → 生成卡片草稿
  4. 学生审核 → Apply

#### Files
- 修改 3 个文件: definitions.ts (+2 tool definitions), executor.ts (+100 lines), system-prompt.ts

---

## [Round 2 Step 3 Patch] — 2026-03-17

### 文档上传系统质量审计修复 (12项)

#### 🔴 严重修复
- **PDF Vision 分批处理**: 使用 pdf-lib 拆分 PDF，每 50 页一批发送 Claude API，max_tokens 提升至 16384，加 200 页上限检查
- **异步文件读取**: `readFileSync` → `readFile` (fs/promises)，消除大文件阻塞服务器
- **Chunk 页码追踪**: `page_start`/`page_end` 现在正确写入 document_chunks 表，基于 form-feed (\f) 页面分隔符
- **前端 Polling 重构**: `setInterval` → `setTimeout` 递归模式，避免 interval 反复销毁重建

#### 🟡 中等修复
- **文件名安全化**: 存储使用 `{timestamp}-{uuid}.{ext}`，原始文件名仅存数据库
- **用户目录隔离**: 文件存储改为 `uploads/{userId}/` 子目录结构
- **API 隐藏 file_path**: GET 列表和详情接口不再返回服务器内部路径
- **异步文件删除**: `unlinkSync` → `unlink` (fs/promises)
- **删除死代码**: 移除未使用的 `getMimeType` 函数
- **Multer 错误处理**: 新增中间件，文件过大/类型错误返回友好 400 错误

#### 🟢 小修复
- **上传进度条**: 使用 axios onUploadProgress 显示上传百分比
- **分块阈值对齐 Spec**: pageCount ≤ 50 不分块（之前只按 30K 字符判断）
- **失败重试**: 新增 POST /api/documents/:id/retry 端点 + 前端 Retry 按钮

#### 依赖新增
- pdf-lib (PDF 页面拆分)

#### Files
- 修改 6 个文件: documentParser.ts, documents.ts, upload.ts, DocumentManager.tsx, DocumentManager.module.css, documentStore.ts

---

## [Round 2 Step 3] — 2026-03-17

### 文档上传 + 解析系统

#### 后端
- 新建 `document_chunks` 表：长文档分块存储（chunk_index, content, heading）
- `documents` 表新增 `document_type`、`chunk_count`、`error_message` 字段
- Multer 文件上传中间件：50MB 限制，支持 PDF/DOCX/XLSX/图片/TXT/MD
- 多格式解析流水线（异步 fire-and-forget）：
  - **PDF 双通道**: pdf-parse 原生提取 → 失败则回退到 Claude Haiku 3.5 Vision API
  - **DOCX**: mammoth 提取纯文本
  - **XLSX**: SheetJS 读取工作簿，每个 sheet 转 CSV
  - **图片**: Claude Haiku 3.5 Vision API OCR
  - **TXT/MD**: 直接 UTF-8 读取
- 智能分块：短文档（≤30K 字符）存 `extracted_text`，长文档按段落边界分块（~5K 字符/块）
- AI 自动摘要 + 文档类型分类（textbook/notes/slides/problem_set/reference/other）
- REST API：upload、list、detail、chunks、status polling、delete
- 文件存储在 `server/uploads/` 目录（已加入 .gitignore）

#### 前端
- 新增 `DocumentManager` 组件：从课程页打开的文件管理弹窗
  - 拖拽上传区 / 点击浏览按钮
  - 文档列表：文件类型图标（彩色）、文件名、大小、页数
  - 状态徽章：Pending(黄) / Parsing(蓝+旋转) / Completed(绿) / Failed(红)
  - 解析中的文档每 3 秒自动轮询状态
  - 点击已完成文档展开显示摘要 + 分块数
  - 删除确认弹窗
- 课程卡片新增 "Files" 按钮（FileText 图标）
- 新增 `documentStore`：上传/列表/轮询/删除 状态管理

#### 依赖新增
- multer (文件上传), pdf-parse (PDF文本提取), mammoth (DOCX), xlsx (SheetJS)

#### Files
- 新增 6 个文件: documents.ts (route), documentParser.ts (service), upload.ts (middleware), DocumentManager.tsx, DocumentManager.module.css, documentStore.ts, pdf-parse.d.ts, mammoth.d.ts
- 修改 8 个文件: schema.sql, init.ts, index.ts, validators, shared types, Courses 页面, .gitignore, package.json

---

## [Round 2 Step 2] — 2026-03-17

### Tag Group 系统（课程级别标签分组）

#### 后端
- 新建 `tag_groups` 表：课程级别的标签分组（course_id + user_id + name，同课程内名称唯一）
- `tags` 表新增 `tag_group_id` 字段，关联到 tag_groups（CASCADE 删除）
- 新增 `/api/tag-groups` CRUD 路由：GET 带嵌套 tags、POST、PUT、DELETE
- 修改 `/api/tags`：支持 `?course_id` 查询参数过滤课程标签，POST 支持 `tag_group_id`
- 移除 `is_system` 编辑/删除限制，旧系统标签现可编辑和删除
- 新增 Zod validators：`createTagGroupSchema`, `updateTagGroupSchema`

#### 前端
- 新增 `TagGroupManager` 组件：从课程页打开的标签管理弹窗
  - 可展开/折叠的标签组，行内编辑名称、删除
  - 标签显示为彩色圆点 + 名称，支持编辑/删除
  - 预设颜色选择器（14种颜色）
  - 添加标签组 / 添加标签内联操作
- 课程卡片新增 "Tags" 按钮，打开 TagGroupManager
- `CardModal` 智能切换：如果课程有 tag groups → 按组显示课程标签；否则回退显示所有用户标签
- `tagStore` 扩展：新增 tagGroups 状态、fetchTagGroups、CRUD 方法

#### 示例用法
- 数学课 → 创建标签组 "Core" → 添加 Definition / Theorem / Formula 标签
- 英语课 → 创建标签组 "Types" → 添加 Vocabulary / Grammar / Reading 标签

#### Files
- 新增 3 个文件: tagGroups.ts, TagGroupManager.tsx, TagGroupManager.module.css
- 修改 11 个文件: schema.sql, init.ts, tags.ts, validators, index.ts, shared types, tagStore, CardModal, Courses 页面

---

## [Round 2 Step 1] — 2026-03-17

### 卡片尺寸修复 + KaTeX 预览渲染

#### Card Grid 尺寸调整
- Grid 列宽从 `minmax(280px, 1fr)` 改为 `minmax(200px, 1fr)`，卡片更窄、可显示更多列
- 卡片最小高度从 130px → 200px，更高的纵向比例，显示更多内容
- 预览文本行数从 3 行增至 4 行

#### 卡片内容预览 KaTeX 渲染
- Grid 视图：卡片内容预览现在通过 `KaTeXRenderer` 渲染，数学公式（`$...$` / `$$...$$`）不再显示原始 LaTeX
- List 视图：标题下方新增内容预览行，同样通过 KaTeX 渲染
- 按模板类型提取预览字段：Definition → definition, Theorem → statement, Formula → formula, General → body
- 预览文本带长度截断（Grid 120字符，List 80字符），确保不溢出
- KaTeX 渲染尺寸在预览区域内适当缩小（grid 0.9em, list 0.85em）
- Display 模式公式左对齐、缩小 margin

#### Files
- 修改 2 个文件: DeckDetail.tsx, DeckDetail.module.css

---

## [Polish Round 1 Patch] — 2026-03-17

### Section 管理增强 + Review 联动

#### Section 删除（二次确认 + 级联删除）
- Section 删除现在会弹出自定义确认对话框，显示将被删除的卡片数量
- 后端级联删除: 删除 section 时同时删除该 section 下所有卡片，并更新 deck card_count
- 使用 SQLite transaction 保证数据一致性

#### Section 重命名（内联编辑）
- Section header 新增编辑按钮（笔图标），hover 时显示
- 点击后 section 名称变为可编辑输入框
- Enter 保存，Escape 取消，blur 保存

#### Section 内搜索/筛选
- Section header 新增搜索按钮，hover 时显示
- 点击后展开搜索输入框，支持按卡片标题模糊筛选（客户端过滤）
- Unsectioned 区域同样支持搜索

#### 批量选取 → Review 选中卡片
- 当处于选择模式且有选中卡片时，Review 按钮变为 "Review Selected (N)"
- 点击后仅复习选中的卡片，不受 FSRS 到期时间限制
- reviewStore 新增 `setCustomCards` 方法，支持预加载自定义卡片列表
- Review 页面检测到预加载卡片时跳过 fetchDueCards

#### UI 细节
- Section header 操作按钮（编辑/搜索/删除）仅在 hover 时显示，不干扰视觉
- 删除确认对话框使用自定义 Modal（非 window.confirm），与整体设计风格一致
- Section 内搜索输入框样式与全局搜索保持统一

---

## [Polish Round 1] — 2026-03-17

### Bug 修复 + 核心体验改进

#### P0: Agent 卡死 Bug 修复
- **Anthropic provider**: 补充 fallback `done` 事件 — 当 SSE 流正常结束但没有 `message_stop` 时，确保发出 `done` 信号
- **Orchestrator**: 每轮 Agent 对话增加 30 秒超时机制，防止 API 挂起导致无限等待
- **Agent route**: 增加 120 秒请求级超时，超时后自动发送 error + done 事件并关闭连接
- **前端 agentStore**: error 事件现在在聊天中显示错误消息气泡（之前只 console.error，用户看不到任何反馈）
- **前端 agentStore**: 网络异常时同样显示错误消息气泡

#### Course Weight 三档化 + Description 字段
- Weight 从 1-10 灰度条改为三档选择：重要(3) / 一般(2) / 不重要(1)
- CourseModal 新增 Description 文本域
- 课程卡片展示 description 和新的 weight badge
- DB migration: courses 表新增 `description` 列
- validators 更新: weight 限制为 1-3

#### Calendar 周视图 + 年份选择
- 新增 Month / Week 视图切换按钮
- 新增年份选择下拉（当前年份 ±5 年范围）
- Week 视图: 7 列（Mon-Sun），每列显示当日任务列表，支持完成/新建操作
- 默认选中今天，月视图和周视图共享筛选逻辑

#### Deck 卡片预览改进
- Grid 视图卡片尺寸放大
- 卡片标题下方新增内容摘要（2-3 行），按模板类型提取：
  - Definition → definition 字段前 80 字符
  - Theorem → statement 字段前 80 字符
  - Formula → formula 字段
  - General → body 字段前 80 字符
- List 视图同步增加内容预览列

#### Deck 内分组（Section）功能
- 新增 `card_sections` 表: id, deck_id, user_id, name, order_index
- Cards 表新增 `section_id` + `order_index` 字段
- 新增 sections CRUD API: GET/POST/PUT/DELETE /api/sections
- DeckDetail 页面按 Section 分组展示卡片，每组可折叠
- 未分组卡片显示在 "Unsorted" 区域
- 新建卡片时可选择 Section
- CardModal 增加 Section 选择器

#### 批量选取 + 批量删除/移动
- DeckDetail header 新增 Select 模式按钮
- 选中模式下卡片显示 checkbox
- 底部浮动操作栏: 显示已选数量 + Delete + Move to 按钮
- Move to 弹出目标 Deck 选择器
- 后端新增: POST /api/cards/batch-delete, POST /api/cards/batch-move

#### UI 整体字体/间距调大
- 基础字体从 14px → 15px
- 行高 1.4 → 1.55
- 全局 padding/margin 增加 10-15%
- 卡片、按钮、输入框间距统一调大

#### Files
- 新增文件: server/src/routes/sections.ts
- 修改 22 个文件, +1,106 / -229 行

---

## [Phase 4] — 2026-03-17

### Statistics, Minimum Working Flow & Smart Planning

#### Backend
- **Minimum Working Flow Engine**: Daily Brief API now returns `minimum_working_flow` object with must task count, cards due, estimated study time, and exam mode status. Replaces motivational messages with actionable minimum daily targets.
- **Study Mode Templates**: New `study_mode_templates` table with 7 built-in learning strategies:
  - Spaced Repetition, Interleaving, Active Recall, Feynman Technique, Pomodoro, Spiral Learning, Mastery-Based
  - Each template includes description, learning science rationale, and configurable parameters
  - GET /api/study-templates endpoint for Agent and UI access
- **Agent Intelligence Upgrade**:
  - 4 new tools: `get_study_templates`, `get_statistics_overview`, `suggest_next_topics`, `generate_weekly_review`
  - Enhanced system prompt with "Minimum Working Flow Philosophy" and "Study Plan Creation Protocol"
  - Agent now follows 5-step flow when creating study plans: present templates → ask learning mode → ask capacity → ask prerequisite needs → generate Proposal
  - Prerequisite/foundation knowledge support via `is_prerequisite` task flag
  - Next-topic suggestion using course context + model reasoning
- **Statistics API** (4 endpoints):
  - `GET /overview`: Current/longest streak, today/week/month task + card stats
  - `GET /heatmap?months=6`: Daily activity counts with 0-4 intensity levels
  - `GET /trends?period=weekly&weeks=12`: Completion rate trends over time
  - `GET /courses`: Per-course breakdown with completion rates and goal counts
- **Study Activity Logging**: Automatic logging when tasks are completed or cards are reviewed (`study_activity_log` table)
- **Exam Mode Logic**: Active exam goals suppress Optional tasks, boost Must tasks with `exam_boost` flag
- **Multi-Course Conflict Arbitration**: Daily Brief sorting by exam status → deadline proximity → course weight → order index
- New DB tables: study_mode_templates, study_activity_log
- Tasks table extended: `is_prerequisite` column

#### Frontend
- **Daily Brief Refactored**:
  - New MWF (Minimum Working Flow) card at top: shows must tasks, cards due, estimated minutes
  - Exam mode warning banner when active exam goals detected
  - Lightning bolt (⚡) indicator on exam-boosted tasks
  - Removed generic greeting text
- **Statistics Dashboard** (new page at /statistics):
  - Overview cards: current streak, today/week/month stats
  - Activity heatmap: GitHub-style SVG grid (26 weeks, 5 color levels)
  - Trend chart: pure SVG area chart showing 12-week completion rate
  - Per-course breakdown: progress bars, completion rates, card counts
  - All charts built as pure SVG — no external charting libraries
- **Exam Mode UI**: Prominent "⚡ EXAM MODE" pill on goal cards when active
- **Keyboard Shortcuts**:
  - `Ctrl+T` / `Cmd+T`: Create new task
  - `Ctrl+K` / `Cmd+K`: Create new card
  - `?`: Show shortcuts reference panel
  - Shortcuts panel: modal overlay listing all available shortcuts
- Navigation: Statistics page added to sidebar (BarChart3 icon)
- Zustand store: statisticsStore for dashboard data

#### Files
- Backend: 2 new files + 11 modified (2,439 lines total)
- Frontend: 5 new files + 7 modified (1,350 lines total)
- Grand total: ~3,800 lines across 25 files

---

## [Phase 3] — 2026-03-17

### AI Agent Module — Mr. Zero

#### Backend
- **AI Provider Abstraction**: Multi-provider support (Anthropic primary, OpenAI compatible)
  - `AnthropicProvider`: native SDK with streaming, tool_use blocks, proper message mapping
  - `OpenAIProvider`: OpenAI-compatible API with function calling support
  - `getProviderFromSettings()`: reads user config, falls back to .env ANTHROPIC_API_KEY
- **Agent Orchestrator**: async generator pattern with streaming
  - System prompt builder with user context (courses, energy, memories, doc summaries)
  - Multi-round tool call loop (max 5 rounds per message)
  - SSE chunk types: text, tool_call_start, tool_call_delta, tool_call_end, done, error
  - Accumulates tool calls across rounds, saves full conversation history
- **Function Calling**: 14 tool definitions
  - Query tools: list_courses, get_tasks, list_goals, list_decks, list_cards, get_review_due, get_daily_brief
  - Action tools: create_task, complete_task, create_goal, create_card
  - Proposal tool: create_proposal (batch_cards, study_plan, schedule_adjustment)
  - Memory tools: search_memories, save_memory
  - Tool executor with full SQLite integration and user-scoped data access
- **Proposal System**: Proposal → Review → Apply mechanism
  - Three types: batch_cards (create multiple flashcards), study_plan (create tasks), schedule_adjustment (modify existing tasks)
  - CRUD endpoints: list pending, get details, apply (transaction), discard, update (edit before applying)
  - Apply runs in SQLite transaction: inserts cards/tasks or updates existing tasks
- **Agent Memory**: short-term + long-term memory management
  - Sliding window conversation history (last 20 messages per conversation)
  - Long-term memory extraction: keyword-based relevance scoring
  - Document summary indexing for context
  - Conversation summarization for token optimization
- **Agent Chat API**: SSE streaming endpoint
  - Conversations CRUD (create, list, get messages, delete)
  - `POST /conversations/:id/messages` → SSE stream with named events
  - Zod validation for send message + create conversation schemas
- New DB tables: agent_conversations, agent_messages, agent_memories, proposals
- Dependencies: @anthropic-ai/sdk, dotenv

#### Frontend
- **Agent Floating Panel** (Ctrl+J / Cmd+J toggle):
  - 420px slide-in panel from right with semi-transparent backdrop
  - Conversation selector dropdown with new/delete actions
  - Chat tab: message bubbles (user right-aligned, assistant left-aligned)
  - SSE streaming display: partial text with blinking cursor, tool activity pill with pulse animation
  - Simple markdown rendering: bold, italic, code blocks, lists
  - Input textarea: Enter to send, Shift+Enter for newline, disabled during streaming
- **Proposal UI** (Proposals tab with badge count):
  - Expandable proposal cards with type badges (batch_cards/study_plan/schedule_adjustment)
  - Item list with individual remove button
  - Apply (green) and Discard (red outline) action buttons
  - Toast notifications on apply/discard
- **Settings AI Provider Config**:
  - Provider selector: Anthropic / OpenAI Compatible
  - API key input with show/hide toggle
  - Model selection with sensible defaults (claude-sonnet-4-20250514 / gpt-4o)
  - Save button with green "Connected" indicator when key is saved
- **Context-Aware Invocation**:
  - Sparkle button on Deck Detail page → opens agent with deck context
  - Sparkle button on Calendar page → opens agent with date context
  - Context hints passed through to backend for augmented messages
- Zustand stores: agentStore (conversations + SSE streaming), proposalStore
- uiStore extended: agentPanelOpen, toggleAgentPanel, openAgentWithContext

#### Files
- 8 new files (1,416 lines): agentStore, proposalStore, AgentPanel, MessageBubble, ProposalList + CSS modules
- 10 modified files: uiStore, api.ts, Settings, AppLayout, App.tsx, DeckDetail, Calendar + CSS
- Total: 18 files, ~3,460 lines

---

## [Phase 2] — 2026-03-17

### Knowledge Card System — Decks, Cards, FSRS, Review

#### Backend
- Card Deck CRUD: create, list (with course filter), update, delete (cascade)
- Card CRUD: create with structured JSON content, list with multi-filter support (tag, template, importance, search), update, delete with deck count sync
- Tag CRUD: system tags protected (403 on edit/delete), custom tags with unique constraint per user, color support
- FSRS spaced repetition engine (ts-fsrs): full integration with scheduling algorithm
  - Due cards query: finds cards with `fsrs_next_review <= date` or new cards (`fsrs_reps == 0`)
  - Rating endpoint: accepts 1-4 (Again/Hard/Good/Easy), recalculates stability, difficulty, next review date
  - Reconstructs FSRS card state from DB for existing cards
- Review session API: GET due cards (with deck/course/tag info), GET due count, POST rate
- Daily Brief updated: `cards_due_count` now queries real data instead of hardcoded 0
- Zod validators for all new endpoints (deck, card, tag, rating schemas)
- ts-fsrs dependency installed

#### Frontend
- **Decks page**: deck grid with course color badges, card counts, course filter dropdown, create/edit/delete
- **Deck Detail page**: full card browser with:
  - Grid view (card fronts in responsive grid) + List view (compact table)
  - Filter bar: template type pills, tag multi-select, importance filter, search input
  - Pagination (20 per page)
  - "Start Review" button when due cards exist
- **Card Modal**: template-aware creation/editing form
  - 4 template types: Definition, Theorem, Formula, General
  - Dynamic fields per template (e.g. formula + variable table for Formula type)
  - Live KaTeX preview for formula field
  - Importance 1-5 star selector
  - Tag multi-select checkboxes
  - LaTeX hint placeholders on all textareas
- **Card Flip component**: 3D CSS transform flip animation
  - Front: title, template badge, importance stars, course color
  - Back: structured content rendered per template type via KaTeXRenderer
- **KaTeX Renderer**: detects `$...$` (inline) and `$$...$$` (display) LaTeX, renders via katex.renderToString(), graceful error fallback
- **Card Template Content**: renders Definition/Theorem/Formula/General layouts with appropriate headers and formatting
- **Card View Modal**: flip card + metadata (created, last reviewed, next review, reps)
- **Review Session page**: full-screen focused review mode
  - Progress bar (Card X of Y)
  - Large flip card in center
  - 4 rating buttons (Again=red, Hard=orange, Good=green, Easy=blue) visible after flip
  - Session summary after completion (total, rating distribution, next review dates)
- **Daily Brief updated**: shows real due card count with "Start Review" navigation button
- **Navigation**: added Decks + Review items in sidebar
- Zustand stores: deck, card, tag, review
- KaTeX dependency installed with full font bundle

---

## [Phase 1] — 2026-03-17

### Foundation Build — Core Structure + Task Management

#### Backend (Express + TypeScript + SQLite)
- Full database schema: 15 tables with indexes, foreign keys, WAL mode
- User authentication: register, login, JWT token, `/auth/me` endpoint
- Course CRUD: create, list, update, delete with user-scoped data isolation
- Task system: create, list (by date/course), update status, batch create, delete
  - Priority system: Must / Recommended / Optional
- Recurring Task Groups: create group with auto-distributed tasks, progress tracking
- Goal Manager: CRUD, exam-mode toggle, linked to courses
- Daily Brief API: aggregates today's tasks by priority, cards-due count, recurring alerts
- Daily Status: set energy level (Energized / Normal / Tired)
- Settings API: update user preferences, AI provider config, theme
- Request validation with Zod schemas for all endpoints
- Global error handler middleware
- System tags seeded on user registration (Definition, Theorem, Formula, Important, Exam-relevant)

#### Frontend (React 18 + Vite + Zustand)
- Dark theme design system with CSS custom properties
- Authentication: Login + Register pages with form validation
- App layout: collapsible sidebar navigation with route links
- Daily Brief page: greeting, energy selector, Must/Recommended/Optional task sections (collapsible), recurring alerts, task completion toggle
- Calendar page: month view with day cells showing task dots, day view with task list, course filter
- Goals page: goal cards with progress bars, exam mode badge, create/edit/delete
- Courses page: course cards with color indicators, weight display, create/edit/delete
- Settings page: profile info, theme toggle, agent name customization
- Modal system: TaskModal, CourseModal, GoalModal with form validation
- Toast notification system (success/error)
- Zustand stores: auth, courses, tasks, goals, recurring tasks, daily brief, UI state
- API service: axios with JWT interceptor, 401 auto-redirect
- Vite proxy for `/api` → backend

#### Infrastructure
- Monorepo structure: `/server`, `/client`, `/shared`, `/docs`
- Shared TypeScript types and enums across frontend/backend
- `.gitignore` configured

#### Bug Fixes
- Fixed goal creation: `exam_mode` was hardcoded to 0, now properly reads from request body

---

## [Phase 0] — 2026-03-17

### Project Initialization
- Created GitHub repository: [Coinsides/Coincides](https://github.com/Coinsides/Coincides)
- Created project documentation:
  - `PRD.md` — Full product requirements document covering all 8 feature modules
  - `DATA_MODEL.md` — 15 database tables with field definitions, indexes, and JSON schemas
  - `ARCHITECTURE.md` — Technical stack selection, system diagram, project structure, API design
  - `DELIVERY_PLAN.md` — 4-phase delivery plan with acceptance criteria per feature
  - `CHANGELOG.md` — This file
- Documents synced to Google Drive (Coincides project folder)
- Key decisions recorded:
  - Multi-provider AI support (OpenAI, Anthropic, user-configurable)
  - Target: public release (full user system, data isolation)
  - Local-first with SQLite, deployable on Windows 11
  - Visual formula editor (student has no LaTeX experience)
  - Phased delivery with polish rounds before v1.0
