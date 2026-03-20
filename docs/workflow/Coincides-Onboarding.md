# Coincides — 工程师入职指南

> 本文档供 Perplexity Computer 在新 Task 中恢复项目上下文使用。
> 最后更新：2026-03-19
> 状态：v1.4 已完成（Time Block L1 补全 + 卡片数据模型升级）

---

## 一、项目概述

**Coincides** 是一个面向学生的智能学习管理应用，核心理念是"Minimum Working Flow"——通过每日最低学习量保持学习连续性，而非填鸭式学习。

**产品主人**：henryfeng349@gmail.com（非CS专业，无开发经验，我是项目的全栈工程师，他是产品经理）

**GitHub 仓库**：https://github.com/Coinsides/Coincides（公开仓库）
- Git 配置：email=henryfeng349@gmail.com, name=Coincides
- API 凭证预设：`["github"]` 用于 gh/git CLI
- 必须先运行 `git config --global --add safe.directory /home/user/workspace/Coincides`

---

## 二、技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite 5, CSS Modules, Zustand 状态管理 |
| 后端 | Node.js 22.x + Express 4 + TypeScript (jiti 运行) |
| 数据库 | SQLite (better-sqlite3), WAL 模式, 外键启用 |
| AI 对话 | Anthropic Claude API (claude-haiku-4-5-20251001 / claude-sonnet-4-20250514) |
| AI Embedding | Voyage AI voyage-4 (1024 维, $0.06/M tokens) |
| 向量搜索 | sqlite-vec v0.1.7 |
| 全文搜索 | SQLite FTS5 |
| 间隔重复 | ts-fsrs |
| 数学渲染 | KaTeX |
| 路由 | HashRouter (react-router-dom v6) |
| 认证 | JWT (内存 token) |
| 部署 | 用户本地 Windows 11 |

---

## 三、项目结构

```
Coincides/
├── package.json          # 根 monorepo，npm run setup 安装所有依赖
├── .env                  # ANTHROPIC_API_KEY + VOYAGE_API_KEY
├── client/
│   ├── src/
│   │   ├── App.tsx                    # HashRouter 路由定义
│   │   ├── main.tsx                   # 入口
│   │   ├── services/api.ts            # axios 封装 + JWT 拦截器
│   │   ├── stores/                    # Zustand stores (16个)
│   │   │   ├── authStore.ts
│   │   │   ├── courseStore.ts
│   │   │   ├── taskStore.ts
│   │   │   ├── goalStore.ts
│   │   │   ├── deckStore.ts
│   │   │   ├── cardStore.ts
│   │   │   ├── tagStore.ts
│   │   │   ├── sectionStore.ts
│   │   │   ├── documentStore.ts
│   │   │   ├── reviewStore.ts
│   │   │   ├── agentStore.ts          # SSE 流式通信
│   │   │   ├── proposalStore.ts
│   │   │   ├── dailyBriefStore.ts
│   │   │   ├── recurringTaskStore.ts
│   │   │   ├── statisticsStore.ts
│   │   │   └── uiStore.ts
│   │   ├── pages/                     # 8 个页面
│   │   │   ├── Auth/ (Login, Register)
│   │   │   ├── DailyBrief/
│   │   │   ├── Courses/
│   │   │   ├── Decks/ (Decks, DeckDetail)
│   │   │   ├── Goals/
│   │   │   ├── Calendar/
│   │   │   ├── Review/
│   │   │   ├── Statistics/
│   │   │   └── Settings/
│   │   └── components/                # 可复用组件
│   │       ├── AgentPanel/            # AI 对话面板 (Ctrl+J)
│   │       ├── CardFlip/              # 3D 翻转卡片
│   │       ├── CardModal/             # 卡片创建/编辑
│   │       ├── DocumentManager/       # 文档上传管理
│   │       ├── TagGroupManager/       # 标签组管理
│   │       ├── KaTeX/                 # LaTeX 渲染器
│   │       └── ...
│   └── vite.config.ts                # base: './' (CDN 部署兼容)
├── server/
│   ├── src/
│   │   ├── index.ts                   # Express 入口, 端口 3001
│   │   ├── db/
│   │   │   ├── schema.sql             # 17 张表 + 索引
│   │   │   └── init.ts                # DB 初始化 + FTS5 虚拟表 + sqlite-vec 向量表
│   │   ├── routes/                    # 15 个路由模块
│   │   │   ├── auth.ts, courses.ts, tasks.ts, goals.ts
│   │   │   ├── decks.ts, cards.ts, sections.ts
│   │   │   ├── tags.ts, tagGroups.ts
│   │   │   ├── documents.ts, embedding.ts
│   │   │   ├── agent.ts, proposals.ts
│   │   │   ├── review.ts, dailyBrief.ts, dailyStatus.ts
│   │   │   ├── statistics.ts, studyTemplates.ts
│   │   │   ├── settings.ts, recurringTasks.ts
│   │   ├── agent/
│   │   │   ├── orchestrator.ts        # Agent 主循环 (SSE 流式, max 5 轮)
│   │   │   ├── system-prompt.ts       # System prompt 构建器
│   │   │   ├── providers/             # Anthropic + OpenAI 适配
│   │   │   ├── tools/
│   │   │   │   ├── definitions.ts     # 18+ function tools 定义
│   │   │   │   └── executor.ts        # 工具执行器 (含三路混合搜索)
│   │   │   └── memory/manager.ts      # Agent 短期+长期记忆
│   │   ├── embedding/
│   │   │   ├── index.ts               # Embedding 管线入口
│   │   │   ├── voyage.ts              # Voyage AI 客户端
│   │   │   ├── vectorStore.ts         # sqlite-vec 封装 + 三路搜索
│   │   │   └── types.ts
│   │   ├── services/
│   │   │   └── documentParser.ts      # 多格式文档解析 (PDF双通道/DOCX/XLSX/图片/TXT)
│   │   └── middleware/ (auth, errorHandler, upload)
├── shared/
│   └── types/index.ts                 # 前后端共享类型定义
└── docs/
    ├── README.md                      # 文档目录索引
    ├── PRD.md                         # 产品需求文档
    ├── DATA_MODEL.md                  # 数据模型
    ├── ARCHITECTURE.md                # 技术架构
    ├── DELIVERY_PLAN.md               # 交付清单
    ├── Coincides-Roadmap.md           # 开发路线图
    ├── workflow/
    │   ├── Coincides-Workflow.md      # 开发工作流
    │   └── Coincides-Onboarding.md    # 本文件：入职指南
    ├── releases/                       # 版本迭代文档
    │   ├── v1.X-plan.md              # 版本计划书
    │   ├── CHANGELOG-v1.X.md         # 版本变更日志（开发者向）
    │   └── RELEASE-NOTES-v1.X.md     # 版本发布说明（用户向）
    └── changelog/
        ├── CHANGELOG.md               # 变更日志索引
        └── CHANGELOG-v1.0.md          # v1.0 完整建设日志
```

---

## 四、数据库结构（20 张表 + 20 虚拟表）

### 核心业务表（17 张）
| 表名 | 用途 |
|---|---|
| users | 用户账号，settings 字段存 JSON（AI配置、主题、embedding配置等）|
| courses | 课程，weight 三档（1=不重要, 2=一般, 3=重要）|
| goals | 学习目标，关联 course，exam_mode 触发考试模式 |
| tasks | 每日任务，priority: must/recommended/optional |
| recurring_task_groups | 循环任务组 |
| card_decks | 卡组，关联 course |
| card_sections | Deck 内分组 |
| cards | 知识卡片，4种模板 (definition/theorem/formula/general)，FSRS 字段 |
| tag_groups | 课程级标签组 |
| tags | 标签，关联 tag_group |
| card_tags | 卡片-标签多对多 |
| documents | 上传文档，parse_status 追踪解析状态 |
| document_chunks | 长文档分块存储 |
| agent_conversations | Agent 对话 |
| agent_messages | Agent 消息历史 |
| agent_memories | Agent 长期记忆 |
| daily_statuses | 每日精力状态 |
| proposals | Agent 提案（pending → applied/discarded）|
| study_mode_templates | 7种学习模式模板 |
| study_activity_log | 学习活动日志 |

### 虚拟表
- `doc_chunk_vec` — 文档 chunk 向量（sqlite-vec, 1024维）
- `agent_memory_vec` — Agent 记忆向量（sqlite-vec, 1024维）
- `document_chunks_fts` — FTS5 全文索引（content-sync 模式，触发器自动同步）
- `agent_memories_fts` — FTS5 全文索引（content-sync 模式，触发器自动同步）

---

## 五、关键设计决策

### 1. Proposal → Review → Apply 机制
所有 AI 生成的变更**必须**经过用户审核。Agent 通过 `create_proposal` 工具生成提案（batch_cards / study_plan / schedule_adjustment），用户在 Proposals 面板审核后才能 Apply。这是核心交互模式，不可绕过。

### 2. Minimum Working Flow 哲学
每日任务分为 Must / Recommended / Optional 三档。Daily Brief 页面顶部显示 MWF 卡片（最低日常量），Agent 作为学习伙伴帮助维持学习连续性，**不做详细解题**。

### 3. PDF 双通道解析
- 通道一：pdf-parse 原生文本提取（数字版 PDF）
- 通道二：Claude Haiku 4.5 Vision API（扫描版/图片版 PDF，每50页一批）

### 4. 三路混合搜索
优先级：语义向量 (Voyage AI + sqlite-vec KNN) > FTS5 全文 > LIKE 关键词
三路结果自动去重合并，无 embedding provider 时优雅降级为纯 LIKE。

### 5. API Key 读取策略
`用户 Settings > .env 环境变量 > 报错`
documentParser 和 embedding 模块都遵循此优先级。用户在 Settings 页面填入 API Key 后立即生效。

### 6. 云端 AI Only
**不使用任何本地 AI 模型**（用户设备有限），所有 AI 处理走云端 API。

### 7. OpenAI 排除（v1.0）
用户无法绑定 OpenAI 支付卡，v1.0 使用 Voyage AI 做 embedding，Anthropic 做对话/OCR。

---

## 六、启动方式

### 开发环境（Cloud Sandbox）
```bash
cd /home/user/workspace/Coincides
node --import jiti/register server/src/index.ts
# 后端运行在 3001 端口
# 前端需另起：cd client && npm run dev (5173 端口)
```

### 用户本地环境（Windows 11）
```
路径：D:\Coinsides\v1.x\Coincides\
步骤：
1. git pull
2. npm run setup（安装/更新所有依赖）
3. 创建 .env 文件填入 API Keys
4. 两个 PowerShell：
   - 后端：node --import jiti/register server/src/index.ts
   - 前端：cd client && npm run dev
5. 浏览器打开 http://localhost:5173
```

**注意事项**：
- 服务器**必须**从项目根目录启动（不是 /server），否则 dotenv 找不到 .env
- `npm run setup` = `npm run install:all` = 安装根 + server + client 三层依赖
- sqlite-vec 和 better-sqlite3 是 native module，`git pull` 后如果 Node 版本变化需要 `npm rebuild` 或重新 `npm run setup`
- Node.js 要求 22.x LTS，Node 25 在 Windows 下有 ESM 兼容性问题

---

## 七、Agent 系统详情

### Function Tools（18+）
**查询工具**：list_courses, get_tasks, list_goals, list_decks, list_cards, get_review_due, get_daily_brief, get_study_templates, get_statistics_overview, search_documents, get_document_content, search_memories
**操作工具**：create_task, complete_task, create_goal, create_card, save_memory
**提案工具**：create_proposal (batch_cards / study_plan / schedule_adjustment)
**高级工具**：suggest_next_topics, generate_weekly_review

### SSE 流式通信
`POST /api/conversations/:id/messages` → Server-Sent Events
Chunk 类型：text, tool_call_start, tool_call_delta, tool_call_end, done, error

### Agent 记忆
- 短期：最近 50 条对话消息滑动窗口（v1.3.1 从 20 调整为 50）
- 长期：agent_memories 表，关键词相关性评分
- 向量检索：agent_memory_vec + FTS5 混合

---

## 八、UI/UX 关键信息

### Glassmorphism 设计
全部 26 个 CSS 模块已完成 Glassmorphism 改造。深色主题为主，body 背景是 135° 渐变（深蕴紫+深蓝+深青）。所有表面使用半透明 + backdrop-blur。

### UI 尺寸
用户抱怨过 UI 太小（"老太太不戴老花镜看不清"），已做过全局 8-12% 放大：
- html 16→17px, body 14→15px
- 所有组件的 padding/gap/font-size 均增大
- **不要再缩小任何 UI 元素**

### Glassmorphism 黑屏 Fix
`--bg-*` 变量已改回实色（不依赖 backdrop-filter），并加了 `@supports not (backdrop-filter)` fallback。

---

## 九、API Key 信息

**Voyage AI Key**：`pa-NVFTnEvsfihH2u5ajPx1P-ffyknUcJqX4jYPxqQzFDw`
**Anthropic Key**：存于 .env 文件中，用户也在 Settings 中填写了

---

## 十、Git 历史（35+ commits）

```
8fe1d73 fix: increase agent timeout to 120s + sanitize conversation history
20837ca fix: persist tool_results in conversation history
672add3 fix: replace tsx with jiti for Windows compatibility
6c72402 fix: workaround tsx Windows ESM loader bug
4ba65f2 fix: sync schema.sql with migrations — fix new-db crash
92d0712 fix: 3 bugs — calendar edit/delete, cardflip mirror, formula preview
46aef86 docs: v1.4 plan
... (v1.3 Step 1-7 commits)
... (v1.2 Step 1-7 commits)
... (v1.1 Step 1-7 commits)
a8832bf docs: full audit update — all 4 core docs updated to v1.0
072cd3b docs: restructure docs/ directory — GitHub as single source of truth
dfd13f1 Fix: update Haiku model ID to claude-haiku-4-5-20251001
daedd4d Update CHANGELOG: v1.0 hotfix entry
cf1de95 Fix: documentParser reads Anthropic API key from user Settings
14f8650 Round 4 Step 3: FTS5 full-text search + three-way hybrid search
33f52ce Round 4 Step 2: Semantic search + Agent RAG
270f865 docs: update Roadmap with Round 4 Step 1 completion
70c1dc8 Round 4 Step 1: sqlite-vec + Voyage AI embedding pipeline
11ae451 Round 3 Step 5: Review Groups + Agent Image Upload
a62405a Round 3 Patch: Fix deployment black screen + Scale up entire UI
5668317 Round 3 Hotfix v2: Thorough glassmorphism black screen fix
741428d Round 3 Hotfix: Fix glassmorphism black screen
7b18cf0 Round 3 Step 3+4: Glassmorphism complete — all 26 CSS modules
a6f4022 Round 3 Step 1+2: Glassmorphism design system + core pages
11f6749 Round 2 Step 5: Drag-and-drop sorting
b5ccd50 Round 2 Step 4: Agent document tools
62f6e5d Round 2 Step 3 Patch: 12 audit fixes
3c8b97e Round 2 Step 3: Document upload + multi-format parsing
898bdcf Round 2 Step 2: Tag Group system
6f8a9b6 Round 2 Step 1: Card grid + KaTeX preview
da9822f Polish Round 1 Patch: Section features
b3d59cd Polish Round 1: Agent fix + Course weight + Calendar + Sections
d91d1ad Phase 4: Statistics + MWF + Smart Planning
6d3283e Phase 3: Mr. Zero AI Agent
2fad75a Phase 2: Knowledge Card System
30c4d82 Phase 1: Foundation
ed03c67 Phase 0: Documentation
e18735c Initial commit
```

---

## 十一、项目统计

- **代码行数**：~21,400 行（.ts + .tsx + .css）
- **文件数**：117 个源文件
- **数据库**：20 张表 + 4 个虚拟表（FTS5 + sqlite-vec）
- **开发时间**：约 22 小时
- **Git 提交**：29 个
- **等价工作量**：2-3 个月正常开发

---

## 十二、用户偏好与工作约定

### 沟通
- **语言**：中文（普通话），语音输入偶有识别错误
- **详略**：概览不用太详细，但实现讨论要有深度技术思考
- **别忘日志**：每次 Push 必须更新 CHANGELOG

### 开发约束
- 用户无开发经验，所有技术决策由我（Computer）做
- 用户是产品经理角色，我是全栈工程师角色
- 用户使用 Windows 11，最终交付物必须本地可部署
- Agent 开发前需要临时 API Key（用户在 Settings 里填入）
- 不使用任何本地 AI 模型
- v1.0 排除 OpenAI（无法绑定支付卡）

### 核心机制
- AI 变更必须走 Proposal → Review → Apply
- 文件统一在 Course 文件池上传，Agent 通过 tool 读取
- Tag Group 系统：每个课程有独立标签组

---

## 十三、已知问题 & 未来方向

### 当前状态
v1.3.1 已发布（补丁版本），v1.4 规划完成待开发。
当前处于 **迭代模式**，已规划 v1.1–v1.5/2.0 版本路线。

### 版本路线（已确认）
| 版本 | 主题 | 核心内容 |
|---|---|---|
| v1.1 | UX 痛点修复 + 技术债 | 6 个 UX 痛点 + 空 catch 块 / DeckDetail 拆分 / DB migration / 配置验证 |
| v1.2 | AI 交互 + i18n + 引导 | System-prompt 重写 + 多语言 + 新用户引导 + Agent 改进 |
| v1.3 | 工作流引擎 + Time Block | 工作流引擎 + Time Block 系统 + 设计宪法审计 |
| v1.3.1 | 补丁版本 | 3 个 UI bug 修复 + schema.sql 同步 + tsx→jiti 兼容性 + Agent 稳定性 |
| v1.4 | 复习体验 + 激励 | 填空/选择题 + 错题本 + 成就系统 + Statistics 深度洞察 |
| v1.5/2.0 | Electron + 分发 | Electron 打包 + 通知系统 + 自动化测试 + 安全加固 |

详细版本规划文档存放于 `docs/releases/v1.X-plan.md`。

### 开发模式变更
项目已从 **建造模式**（Round/Phase/Step）切换为 **迭代模式**（版本/Step）。
完整迭代工作流定义在 `docs/workflow/Coincides-Workflow.md` 的「版本迭代工作流」章节。

### 版本发布文档
每个版本发布时会产出两个文档：
- **CHANGELOG-v1.X.md**：开发者向的技术变更日志（详细代码变更、影响文件列表）
- **RELEASE-NOTES-v1.X.md**：用户向的发布说明（新功能、改进、修复，简洁易懂）

详细规则见 `Coincides-Workflow.md` 中的「Release Notes 规则」章节。

### 注意区分
用户还有一个完全独立的项目叫 **Mimo（记忆系统白皮书）**，与 Coincides 无关。如果用户提到 Mimo、MU、六链、图式链、分形架构等概念，那是另一个项目的内容，不要混到 Coincides 里。

---

## 十四、工作流手册

完整的工作流程定义在 **`docs/workflow/Coincides-Workflow.md`** 中，涵盖：
- 需求提出与评估流程
- 开发流程与约束
- 测试与验证流程
- 提交与文档同步规范（CHANGELOG + 受影响文档 + Git commit 格式）
- 版本发布流程
- Bug 报告与修复流程
- 新 Task 恢复流程
- 重大变更（DB schema / 新依赖 / 架构）的额外流程
- 日常沟通规范与标记约定
- `docs/` 目录结构与各文件管理规则
- **版本迭代工作流**：5 阶段迭代循环（规划→开发→验收→发布→复盘）

新 Task 开始时务必读取此文件。

---

## 十五、新 Task 快速恢复流程

当用户说"继续 Coincides 项目"时：

1. 搜索记忆确认用户身份
2. Clone repo：`gh repo clone Coinsides/Coincides`
3. 读取 `docs/workflow/Coincides-Onboarding.md`（本文档）恢复完整上下文
4. 读取 `docs/workflow/Coincides-Workflow.md` 了解工作流规则
5. 查看最新 commit：`git log --oneline -5`
6. 读取 `docs/changelog/` 下最新版本日志了解最新变更
7. 读取 `docs/Coincides-Roadmap.md` 了解当前进度
8. 准备好接受用户的下一个任务

**所有文档都在 GitHub repo 中**，不需要访问 Google Drive。本文档已包含所有关键上下文，包括技术栈、数据库结构、设计决策、用户偏好等。只需 clone + 读日志/Roadmap 确认最新状态即可。
