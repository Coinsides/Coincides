# Coincides — 一人团队工作流手册

> PM：henryfeng349@gmail.com
> 全栈工程师：Perplexity Computer
> 最后更新：2026-03-20（新增 BACKLOG.md 到工作流）

---

## 工具链

| 工具 | 角色 | 说明 |
|---|---|---|
| **GitHub** (Coinsides/Coincides) | 唯一事实源 | 所有代码 + `docs/` 目录下的全部项目文档 |
| **Perplexity Computer** | 开发环境 + 工程师 | 代码编写、测试、文档更新、Push |
| **Google Drive** (Coinsides/) | PM 的个人备份 | PM 自行管理的副本、调研报告、问题收集 |
| **用户本地** (Windows 11) | 测试环境 | 本地 clone、.env 文件、实际使用测试 |

**核心原则**：如果 GitHub 和 Google Drive 内容不一致，永远以 GitHub 为准。

---

## `docs/` 目录结构与管理规则

```
docs/
├── README.md                         ← 目录索引
│
├── PRD.md                            ← 产品需求文档
├── DATA_MODEL.md                     ← 数据库 Schema 设计
├── ARCHITECTURE.md                   ← 技术架构与依赖说明
├── DELIVERY_PLAN.md                  ← 阶段交付清单
├── Coincides-Roadmap.md              ← 开发路线图
├── BACKLOG.md                        ← 功能积压清单（待办/已完成事项池）
│
├── workflow/
│   ├── Coincides-Workflow.md         ← 本文件：开发工作流
│   └── Coincides-Onboarding.md       ← 工程师入职指南 / 上下文恢复手册
│
├── releases/                         ← 版本迭代文档目录（v1.1+ 迭代模式新增）
│   ├── v1.1-plan.md                 ← 版本计划书
│   ├── v1.2-plan.md
│   ├── ...
│   ├── CHANGELOG-v1.1.md            ← 版本变更日志（开发者向）
│   ├── CHANGELOG-v1.2.md
│   ├── ...
│   ├── RELEASE-NOTES-v1.1.md        ← 版本发布说明（用户向）
│   ├── RELEASE-NOTES-v1.2.md
│   └── ...
│
└── changelog/
    ├── CHANGELOG.md                  ← 变更日志索引（指向各版本日志）
    ├── CHANGELOG-v1.0.md             ← v1.0 完整建设日志
    ├── CHANGELOG-v1.1.md
    └── ...
```

### 各文件 / 目录的管理规则

| 文件 | 什么时候更新 | 谁更新 | 放什么 |
|---|---|---|---|
| **PRD.md** | 新增功能模块时 | PM 提需求，工程师写 | 用户故事、功能描述、约束条件 |
| **DATA_MODEL.md** | 表结构变更时 | 工程师 | 所有表的 DDL、字段说明、索引、关系 |
| **ARCHITECTURE.md** | 架构 / 依赖变化时 | 工程师 | 技术栈、模块划分、数据流、第三方依赖 |
| **DELIVERY_PLAN.md** | Step 完成时 | 工程师 | 各 Round/Step 的交付内容与完成标记 |
| **Coincides-Roadmap.md** | Round 完成或新 Round 开始时 | 工程师 | 版本规划、里程碑、当前进度 |
| **BACKLOG.md** | 版本规划（阶段 0）或 Step 完成时 | 工程师 | 待办功能池——候选事项、已完成标记、来源追溯 |
| **workflow/** | 工作流程变更时 | 工程师（PM 审批）| Workflow 和 Onboarding 两个过程文档 |
| **releases/v1.X-plan.md** | 每个版本的阶段 0（规划） | 工程师撰写，PM 审批 | 版本计划书（v1.1+ 迭代模式新增） |
| **releases/CHANGELOG-v1.X.md** | 阶段 1 起持续更新 | 工程师 | 版本变更日志——开发者视角的技术细节 |
| **releases/RELEASE-NOTES-v1.X.md** | 阶段 3（发布） | 工程师撰写，PM 审批 | 版本发布说明——用户视角的功能更新摘要 |
| **changelog/** | 每次 Push 时 | 工程师 | 按版本独立的变更日志文件 |

### changelog 规则

- 每个大版本维护独立日志文件：`CHANGELOG-v{版本号}.md`
- 日志内容按时间倒序（最新在最上面）
- `CHANGELOG.md` 是索引文件，链接到各版本日志
- 新版本开始时，创建新的日志文件（如 `CHANGELOG-v2.0.md`）
- 单条日志必须包含：标题、日期、变更内容、影响文件列表

### Release Notes 规则

- **Release Notes ≠ CHANGELOG**：
  - CHANGELOG = 开发者向的技术变更记录（改了什么代码、影响了哪些文件）
  - Release Notes = 用户向的版本发布说明（新增了什么功能、修复了什么问题）
- 命名格式：`RELEASE-NOTES-v{版本号}.md`，存放于 `docs/releases/`
- 每个版本发布时（阶段 3）必须创建对应的 Release Notes
- Release Notes 内容应面向非技术用户，用简洁易懂的语言描述
- Release Notes 模板：

```markdown
# Coincides vX.Y 发布说明

> 发布日期：YYYY-MM-DD

## 版本概述
一句话总结这个版本给用户带来了什么。

## ✨ 新增功能
- ...

## 🛠 改进
- ...

## 🐛 修复
- ...

## ℹ️ 更新方式
1. git pull
2. npm run setup
3. 重启服务
```

### 不在 GitHub 中的内容（PM 在 Google Drive 管理）

| Drive 路径 | 内容 | 说明 |
|---|---|---|
| `Report/` | 调研报告 PDF | 给 PM 看的参考资料，与代码无关 |
| `问题收集/` | Bug / 问题清单 | PM 自己收集整理，作为需求输入来源 |

---

## 工作流总览

Coincides 有两套工作流：

| 模式 | 适用场景 | 核心循环 |
|---|---|---|
| **建造模式** | v1.0 期间的快速开发（已完成） | 需求 → 评估 → 开发 → 测试 → 提交 → 本地更新 |
| **迭代模式** | v1.1+ 版本更新（当前） | 规划 → 开发 → 验收 → 发布 → 复盘 |

以下「流程一”到「流程九」是建造模式的基础流程，迭代模式复用其中的开发、测试、提交环节，但在外层套了版本级别的规划、验收和复盘。详见「版本迭代工作流」一节。

---

## 流程一：需求提出与评估

### 触发条件
你（PM）提出新功能、bug 修复、或改进想法。

### 步骤

1. **你描述需求**
   - 可以是语音、文字、截图、任何形式
   - 不需要写正式文档，用你习惯的方式说就行

2. **我（工程师）做需求评估**
   - 技术可行性分析
   - 工作量估算（小/中/大）
   - 影响范围（哪些模块需要改）
   - 是否需要新依赖或 API
   - 是否涉及数据库变更（需特别注意）

3. **对齐确认**
   - 我把评估结果和实施方案告诉你
   - 你确认方向对了，说"开始"
   - **重要**：如果涉及数据库 schema 变更、新增外部依赖、或架构层面改动，我会额外标注 ⚠️ 提醒你

### 文档更新
- 如果是大功能或新 Round：更新 **docs/Coincides-Roadmap.md**

---

## 流程二：开发

### 步骤

1. **Clone / 同步仓库**
   ```bash
   gh repo clone Coinsides/Coincides
   # 或 git pull（如果已有）
   ```

2. **读取上下文**
   - 读 `docs/changelog/` 下最新版本的日志确认当前状态
   - 读 `docs/Coincides-Roadmap.md` 确认进度
   - 读 `docs/BACKLOG.md` 了解当前待办事项池和已完成事项
   - 如果是新 Task：读 `docs/workflow/Coincides-Onboarding.md` 恢复上下文

3. **编码实施**
   - 按评估方案执行
   - 每个独立功能点完成后做一次 **自测验证**

4. **实时沟通**
   - 开发过程中遇到需要你做决定的地方，我会暂停问你
   - 例如："这里有两种实现方式，A 简单但有局限，B 复杂但更灵活，你选哪个？"

### 开发过程中的约束
- 所有 AI 生成的用户数据变更走 **Proposal → Review → Apply**
- **不使用本地 AI 模型**，全部走云端 API
- **不使用 OpenAI**（v1.0 约束）
- UI 元素不能缩小（用户视力需求）
- Agent 模块开发前确认 API Key 可用

---

## 流程三：测试与验证

### 步骤

1. **我在沙盒测试**
   - 启动后端 + 前端
   - 验证新功能正常工作
   - 检查是否破坏已有功能

2. **报告测试结果**
   - 告诉你：做了什么、改了哪些文件、测试了哪些场景
   - 如果有 UI 变化，截图给你看

3. **你在本地测试**（可选，大功能建议做）
   - git pull + npm run setup
   - 运行前后端，自己试用
   - 发现问题截图或描述告诉我

---

## 流程四：提交与文档同步

### 每个 Step 完成后的标准流程

```
代码完成 → 更新 changelog → 更新受影响的文档 → git commit → git push
```

1. **更新 `docs/changelog/CHANGELOG-v{当前版本}.md`**
   - 写清楚改了什么、为什么改、影响哪些文件
   - 格式遵循已有的日志风格

2. **更新受影响的其他文档**（按需）
   - 数据库变更 → 更新 `DATA_MODEL.md`
   - 架构变更 → 更新 `ARCHITECTURE.md`
   - 里程碑变化 → 更新 `DELIVERY_PLAN.md`
   - Step / Round 完成 → 更新 `Coincides-Roadmap.md`

3. **Git Commit + Push**
   - Commit message 格式见下表
   - Push 到 main 分支

4. **通知 PM 更新本地**
   - 📋 告诉你需要 `git pull`
   - 如果有新依赖，提醒 `npm run setup`

### Commit Message 规范

| 类型 | 格式 | 示例 |
|---|---|---|
| 新功能 | `Round X Step Y: 功能描述` | `Round 4 Step 1: sqlite-vec + Voyage AI embedding` |
| Bug 修复 | `Fix: 问题描述` | `Fix: documentParser reads API key from Settings` |
| 紧急修复 | `Hotfix: 问题描述` | `Hotfix: update Haiku model ID` |
| 文档更新 | `docs: 描述` | `docs: restructure docs/ directory` |
| 审计/批量修复 | `Round X Step Y Patch: 描述` | `Round 2 Step 3 Patch: 12 audit fixes` |

### ⚠️ 文档同步的强制规则

每个 Step 完成时，工程师必须检查以下清单：

```
□ CHANGELOG 已更新（当前版本的日志文件）
□ 如果有数据库变更 → DATA_MODEL.md 已更新
□ 如果有架构变更 → ARCHITECTURE.md 已更新
□ 如果有新 Step 完成 → DELIVERY_PLAN.md 已更新
□ 如果 Round 完成 → Roadmap 已更新
□ 如果有 BACKLOG 事项完成 → BACKLOG.md 已更新
□ 所有变更已 push 到 GitHub
```

如果遗漏了任何一条，在下一次 Push 前补上。不允许累积超过一个 Step 的文档债务。

---

## 流程五：版本发布

### 触发条件
一个 Round 的所有 Step 完成，构成一个可交付的版本。

### 步骤

1. **最终测试**：确认所有功能正常
2. **更新版本号**：在 CHANGELOG 标记版本号
3. **撰写 Release Notes**：创建 `RELEASE-NOTES-v1.X.md`，面向用户描述本版本更新
4. **更新 Roadmap**：标记 Round 完成
5. **全量文档审计**：检查所有 docs/ 文件是否与代码一致
6. **Push 到 GitHub**
7. **更新入职指南**：把新版本的变更写进 `Coincides-Onboarding.md`
8. **通知 PM 更新本地**：
   ```
   git pull
   npm run setup
   ```

---

## 流程六：Bug 报告与修复

### 你报告 Bug 的方式
- 截图 + 描述"我做了什么，看到了什么"
- 贴错误信息（浏览器控制台、终端输出等）
- 不需要定位原因，交给我

### 我修复的流程
1. 分析原因
2. 修复代码
3. 测试验证
4. 告诉你改了什么
5. Push + 更新 CHANGELOG
6. 你 `git pull` 验证

### Bug 严重度分类
| 级别 | 定义 | 响应 |
|---|---|---|
| **P0 紧急** | 功能完全不能用、数据丢失 | 立即修复，当次 Push |
| **P1 严重** | 核心功能异常但有 workaround | 当次 Task 内修复 |
| **P2 一般** | 非核心功能或 UI 小问题 | 记录，下次 Round 处理 |

---

## 流程七：新 Task 恢复流程

### 当你开一个新的 Perplexity Computer Task 时

**你只需说一句：**
> "继续 Coincides 项目"

**我会执行：**
1. 搜索记忆恢复你的身份和偏好
2. Clone 仓库
3. 读 `docs/workflow/Coincides-Onboarding.md` 恢复完整上下文
4. 读 `docs/changelog/` 和 `docs/Coincides-Roadmap.md` 确认最新状态
5. 读 `docs/BACKLOG.md` 了解待办事项池
6. 告诉你"我已恢复上下文，当前在 vX.X，最后的 commit 是 XXX，准备好了"

**预计恢复时间**：1-2 分钟

---

## 流程八：重大变更的额外流程

以下情况需要特别处理：

### 数据库 Schema 变更
1. 我评估变更影响
2. 更新 schema.sql
3. 更新 DATA_MODEL.md
4. 提醒你：本地更新后旧数据库可能需要删除重建（或提供 migration 脚本）

### 新增外部依赖
1. 我说明为什么需要、替代方案有哪些
2. 你确认后我加入
3. 提醒你：本地需要 `npm run setup` 重新安装

### 架构决策变更
1. 讨论方案
2. 更新 ARCHITECTURE.md
3. 如有必要，更新 PRD.md 和 DELIVERY_PLAN.md

---

## 流程九：日常沟通规范

### 我会做的
- 开发前说清楚要做什么、改哪里、预计影响
- 开发后列清楚改了什么文件、新增了什么
- 遇到需要你决策的事暂停等你回复
- 每次 Push 更新 CHANGELOG
- 主动提醒你需要本地操作的事（git pull、npm install 等）

### 建议你做的
- 有想法随时说，不需要等想清楚
- 发现问题截图或贴错误信息
- 测试新功能后给反馈（好/不好/要改哪里）
- 不确定的事直接问

### 沟通中的标记约定
| 标记 | 含义 |
|---|---|
| ⚠️ | 需要你注意或决策的事项 |
| ✅ | 已完成 |
| 🔧 | 正在修复中 |
| 📋 | 需要你本地操作（git pull 等）|

---

## 检查清单（每次开发周期）

```
□ 需求对齐 — 确认你要什么
□ 技术评估 — 我说清楚怎么做
□ 你说"开始" — 正式开工
□ 编码实施 — 写代码 + 自测
□ 更新 CHANGELOG — 记录变更
□ 更新受影响文档 — 按同步强制规则检查
□ Git Push — 代码上线
□ 通知你 — 📋 本地操作指引
□ 你本地验证 — 确认没问题
```

---

---

## 版本迭代工作流（v1.1+ 适用）

> v1.0 建造期已结束。从 v1.1 起，每个版本走以下五个阶段。

### 迭代总览

```
阶段 0  规划    →  定目标、列清单、评估工作量、PM 审批
阶段 1  开发    →  按 Step 执行，复用建造模式的开发/测试/提交流程
阶段 2  验收    →  回归测试 + PM 本地验收 + Patch 修复
阶段 3  发布    →  打 Git Tag + Release Notes + 更新全部文档
阶段 4  复盘    →  记录做了什么、遇到什么问题、下版注意什么
```

### 阶段 0：版本规划

**触发条件**：上一个版本复盘完成，或首次进入迭代模式。

**步骤**：
1. 工程师读取 `docs/BACKLOG.md` 和 `docs/Coincides-Roadmap.md`，了解待办事项池
2. PM 和工程师讨论本版本的目标和范围（从 BACKLOG 中选取事项）
3. 工程师评估每个事项的工作量，分 Step
4. 工程师撰写版本计划书：`docs/releases/v1.X-plan.md`
5. PM 审批计划书后，正式进入开发

**版本计划书模板**：

```markdown
# Coincides vX.Y 版本计划

## 版本目标
一句话说清楚这个版本为什么存在。

## 范围（做什么）
- [ ] Step 1: ...
- [ ] Step 2: ...

## 不做什么（明确排除）
- ...

## 工作量评估
预计 X 次对话。

## 依赖与风险
- ...

## 验收标准
怎样算「这个版本完成了」。
```

**核心原则**：
- 版本范围一旦审批，原则上不加新需求。新想法记入下个版本的待办。
- 如果开发过程中发现范围必须调整，工程师标注 ⚠️ 提醒 PM，双方确认后更新计划书。

### 阶段 1：开发

复用建造模式的开发流程（流程二、三、四），逐 Step 执行：
- 每个 Step 走「需求对齐 → 编码 → 自测 → CHANGELOG → Push」
- 每个 Step 完成后更新版本计划书中的复选框（`- [ ]` → `- [x]`）
- 开发过程中的约束、Commit 格式、文档同步规则与建造模式完全一致。

**Commit Message 变化**：迭代模式下 commit 以版本号开头：

| 类型 | 格式 | 示例 |
|---|---|---|
| 新功能 | `v1.X Step Y: 描述` | `v1.1 Step 2: Goal 追加任务 + 优先级标注` |
| Bug 修复 | `v1.X Fix: 描述` | `v1.1 Fix: 日历事件删除未级联清理` |
| 验收修复 | `v1.X Patch: 描述` | `v1.1 Patch: 回归测试修复 3 个问题` |

### 阶段 2：版本验收

**触发条件**：版本计划书中所有 Step 均已完成。

**步骤**：
1. 工程师做回归测试——不只测新功能，还要确认旧功能没坏
2. PM 在本地 `git pull` + 实际使用测试
3. 发现的问题记录为本版本的 Patch，修复后再测
4. PM 确认「这个版本可以发布」

### 阶段 3：版本发布

**工程师执行以下清单**：

```
□ 全部 Step + Patch 已提交
□ CHANGELOG-v1.X.md 已完成（包含所有 Step 和 Patch 的记录）
□ RELEASE-NOTES-v1.X.md 已创建（用户向发布说明）
□ CHANGELOG.md 索引已更新
□ Coincides-Roadmap.md 已更新（标记版本完成）
□ BACKLOG.md 已更新（本版本完成的事项标记 ✅）
□ 受影响的核心文档已更新（DATA_MODEL / ARCHITECTURE / PRD / DELIVERY_PLAN）
□ Coincides-Onboarding.md 已更新（状态、新增表/组件/工具等）
□ Git Tag 已打（git tag v1.X.0 && git push --tags）
□ PM 已通知 git pull
```

### 阶段 4：版本复盘

在 `CHANGELOG-v1.X.md` 末尾添加复盘段落：

```markdown
## 复盘

### 本版本做了什么
- ...

### 遇到的问题
- ...

### 下个版本要注意的
- ...

### 遗留事项（转入下个版本待办）
- ...
```

复盘完成后，进入下个版本的阶段 0。

### 版本迭代相关的文件管理

| 文件 | 什么时候创建/更新 | 谁更新 |
|---|---|---|
| `docs/releases/v1.X-plan.md` | 阶段 0（规划） | 工程师撰写，PM 审批 |
| `docs/releases/CHANGELOG-v1.X.md` | 阶段 1 起持续更新，阶段 4 写复盘 | 工程师 |
| `docs/releases/RELEASE-NOTES-v1.X.md` | 阶段 3（发布） | 工程师撰写，PM 审批 |
| `docs/changelog/CHANGELOG.md` | 阶段 3（发布） | 工程师 |
| `docs/Coincides-Roadmap.md` | 阶段 0 + 阶段 3 | 工程师 |
| `docs/BACKLOG.md` | 阶段 0（规划选取事项）+ 阶段 1（完成标记）| 工程师 |

---

## 版本控制核心规则

1. **GitHub `docs/` 是唯一事实源**——所有文档以 repo 版本为准
2. **Google Drive 是 PM 的个人空间**——PM 自行决定是否同步、如何同步
3. **不要直接在 Google Drive 上编辑项目文档**——告诉工程师要改什么，由工程师改 repo 里的版本
4. **如果 Drive 和 repo 不一致，以 repo 为准**
5. **文档债务不过 Step**——每个 Step 完成时必须同步所有受影响的文档
6. **版本范围不蚂食**——审批后的版本计划不随意加需求，新想法记入下个版本
