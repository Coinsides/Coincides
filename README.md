# Coincides

**一个把日常材料精加工成可追溯知识的系统。**

你把课本、讲义、扫描件、报告、网页扔进来，在里面读、圈、写。你圈的每一处都留下**收据** —— 一条能走回原件的路径。笔记不是孤立的文本，是这些收据之上长出来的结构。

> **对照**：在浏览器里划的重点，死在那个原件里；在这里划的重点，活成一条收据。
> Obsidian 是文件系统上的笔记应用；Coincides 是数据库上的信息精加工系统。

---

## 状态

**重度开发中，尚未适合他人使用。**

- 当前版本线：`V2.BN.12`（代号「外骨骼与地板」）
- 真实用户数：1（作者本人）。产品先服务于严肃自用，再谈通用性。
- 无云端、无遥测，全部数据在本机 SQLite。

---

## 它是怎么想的

四条贯穿整个代码库的设计约束：

### 1. 真相分离

内容、位置、标记、出处、语义关系是**五种独立的真相**，各自有权威存储，互不覆写。
移动一个对象只改布局，不动它的文字；删掉一个容器不删掉里面的知识。

### 2. 出处是收据，不是附件

一段内容"凭什么这么说"必须可追问。源文件不可变，锚点记录到页码与坐标，判断留快照。
链接（导航）、出处（证据）、关系（语义）三者永不混为一谈。

### 3. 人先能用，agent 才接得上

> Agent 能做的，人类必须 100% 能做。同门同钥，没有后门。

每种能力都拆成**基座**（人类可手工创建和使用的真相模型）与**操作者**（替你生长它的 AI）。基座先建，操作者后接 —— 不可靠的地基上做不出可靠的 agent。

### 4. 一个知识空间

Project 是**镜片**不是**所有者**。同一份理解可以被多个项目看见而不必复制；一个来源不属于任何单一项目。

---

## 现在能做什么

| 能力 | 状态 |
|---|---|
| 自然书写（TextFlow：段落 / 标题 / 列表 / 引用 / 待办 / 折叠 / 代码行，行内公式与代码） | 可用 |
| 无限画布 + 页面取景框，自由摆放、对象家族（形状 / 便签 / 连接线 / 表格） | 可用 |
| 材料入库：PDF / DOCX / TXT / Markdown / 图片，去重、原件不可变、跨项目复用 | 可用 |
| 圈选铸卡：把材料里的一段铸成 **Item**（独立知识卡，带回溯锚点） | 可用 |
| ContentGroup：把 Item 捆成知识包 | 可用 |
| Purpose：给知识包与 Item 一个情境角色与作用域 | 可用 |
| Relation：Item 之间的语义关系，带判断快照与**机械新鲜度**（端点改了会自己变灰） | 可用 |
| 双语界面（English / 中文） | 可用 |

**刻意休眠**：向量检索管线（Voyage AI + sqlite-vec）已接好但断开 —— 它属于 agent 时代，地基稳之前不通电。

**尚未建**：MCP 工具面、流式装配面、导出投影（单文件 HTML / 工程包）、知识图谱运行时。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 · TypeScript · Vite 5 · Zustand |
| 后端 | Node.js 22 · Express 4 · TypeScript |
| 数据库 | SQLite（better-sqlite3，WAL） |
| 检索 | SQLite FTS5 ·（休眠）Voyage AI + sqlite-vec |
| 数学 | KaTeX |
| i18n | i18next |

---

## 本地运行

### 前置

- **Node.js 22.x LTS** —— Node 25 在 Windows 上有已知 ESM 兼容问题
- npm 9+

### 装 & 跑

```bash
git clone https://github.com/Coinsides/Coincides.git
cd Coincides
npm run setup
```

后端（终端 1）：

```bash
npm run dev:server
```

前端（终端 2）：

```bash
npm run dev:client
```

打开 http://localhost:5173 → 注册账号 → 新建 Project → 传材料 → 新建 Note 开始写。

### 环境变量

在项目根建 `.env`：

```env
# 可选 —— 启用语义检索（当前管线休眠，不填不影响使用）
VOYAGE_API_KEY=pa-xxxxx
```

### 验证门

改完代码跑这个（构建 + 契约测试 + 性能 + 密钥扫描）：

```bash
npm run verify:v2-bn8-runtime
```

---

## 目录

```
Coincides/
├── client/src/pages/Notes/canvasEngine/   # 自研画布引擎（对象 / 布局 / 投影 / 交互）
├── client/src/pages/Notes/               # 笔记、ContentGroup、Purpose、Source 界面
├── server/src/routes/                    # REST API
├── server/src/db/                        # schema 与 migrations
├── shared/types/                         # 前后端共享类型
└── docs/                                 # 项目文档（见下）
```

---

## 文档

**从这里进**：

| 文件 | 作用 |
|---|---|
| [`docs/agent-ops/AGENT_CONTEXT.md`](docs/agent-ops/AGENT_CONTEXT.md) | Agent 开工第一站：必读清单、禁止事项、版本线、**已知脱节文件表** |
| [`docs/agent-ops/current-state/`](docs/agent-ops/current-state/) | 权威现状 —— 此刻真相以此为准 |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | 现行路线图 |
| [`PRODUCT.md`](PRODUCT.md) | 产品定位与设计原则 |
| [`docs/agent-ops/DOCUMENTATION-SYSTEM.md`](docs/agent-ops/DOCUMENTATION-SYSTEM.md) | 文档体系规矩 |

**规矩**：看任何文档先看顶部状态头。`superseded` / `draft` / `archived` 的不作为依据。`docs/brainstorm/**`（研究）与 `docs/releases/**`（历史）是时间点快照，不是当前真相。

---

## 开发方式

本项目由一名开发者与多个 AI agent 协作构建（Claude 负责架构 / 规格 / 复核，Codex 负责施工，另有专职复核 thread）。协作协议、角色分工与决策记录都在 [`docs/agent-ops/`](docs/agent-ops/) 里公开可查 —— 包括 AI 做过的每一次判断和它的理由。

---

## 许可

[MIT](LICENSE)。为一个人设计,无条件公开给全世界。
