> **状态 (Status)**: draft
> **层 (Layer)**: 分析 / Analysis（重建草案 · 待 Fable 抽检放行后替换 `README.md`）
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 否
> **委托**: 重建四件之二（Fable 排序：BN 路线图 → **README** → Source-Reconstruction-Intake → Inventory-Contract）

# repo 根 README 重建草案

## 0. 为什么落在暂存路径而不是直接改 `README.md`

`README.md` 是仓库门面页。按「草案落盘后逐件抽检放行，不自行转正」，若直接写进门面页，它会在放行前的窗口期里**以门面身份示人**；给它加个 `状态: draft` 的状态头又不合适 —— 状态头是文档层内部约定，GitHub 首页挂这个很怪。

故：草案住这里，抽检放行后**整体替换** `README.md`（执行清单见文末）。

---

## 1. 旧 README 的死因（分诊表 冲突 C11）

| 项 | 旧 README 写的 | 实际 |
|---|---|---|
| 版本 | `v1.7.3` 徽章 | 主线是 `V2.BN.12` |
| 核心 agent | **Mr. Zero**（通篇主角） | 宪章 §10 明言「**V1 老 agent(Mr. Zero)启动时正式声明取代**」 |
| 产品形态 | 学期规划 / FSRS 卡片 / 日程 Time Blocks | 笔记 / 画布 / Item + Relation 知识真相层 |
| 路线 | 「Coming in v1.8: 云部署 PostgreSQL + PWA」 | 该计划已死；现行方向 = Tauri 式桌面壳 + 后端保持服务形态 |
| 文档指引 | 指向 `PRD.md` / `Coincides-Roadmap.md` | 两份现均已降级 / 归档 |

**逐段改不如重写一页** —— 除技术栈与启动命令外，几乎没有一段还成立。

## 2. ⚠️ 顺带查出的一处非文档问题（不在本单处置，请 Henry 定）

**README 徽章与 `package.json` 都声称 MIT，但仓库内没有 `LICENSE` 文件。**

- `README.md:10` → `![License](https://img.shields.io/badge/license-MIT-green)`
- `package.json:7` → `"license": "MIT"`
- `ls LICENSE*` → 不存在

对外公开声称某许可证却不附许可证全文，是权利状态不明。**我不自行补 LICENSE** —— 选许可证是所有者的法律决定，不是 agent 的文档整理动作。三条路请 Henry 挑：①补 MIT LICENSE 全文（与现声明一致）；②改成私有/保留所有权利，去掉徽章与 `package.json` 字段；③暂不定，则**至少把徽章摘掉**，避免声称一个未兑现的许可。

> 与此相关的先例：宪章 拍板记录 待拍-7 为了 OpenClaw 的许可问题专门设过前置闸并由 Henry 亲办 —— 对别人的许可这么较真，自己的不该悬着。

---

## 3. 草案正文（以下即拟替换 `README.md` 的全文）

---

# Coincides

**一个把学习材料变成可追溯知识的笔记系统。**

你把课本、讲义、扫描件、网页扔进来，在里面读、圈、写。你圈的每一处都留下**收据** —— 一条能走回原件的路径。笔记不是孤立的文本，是这些收据之上长出来的结构。

> **对照**：在浏览器里划的重点，死在那个原件里；在这里划的重点，活成一条收据。
> Obsidian 是文件系统上的笔记应用；Coincides 是数据库上的学习系统。

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

<!-- ⚠️ 待 Henry 裁定后填写，见本草案 §2 -->

---

## 4. 相对旧件的取舍说明（供抽检）

**删掉**：v1 功能清单（Calendar / Goal Manager / Knowledge Cards / Time Blocks / Statistics / Daily Brief）· Mr. Zero 全部段落 · 版本历史表（v1.0–v1.7.3）·「Coming in v1.8 云部署」· Contributing（单人项目，issues/PR 欢迎的表述与实情不符）· 三条 v1 设计铁律（「不替用户决定 / 不监控 / 不制造挫败」—— 那是**学习规划产品**的铁律，本产品的红线是「Agent 能做的人类必须能做 / 同门同钥 / 收据可撤销」）。

**保留并核实**：技术栈（逐项核过版本号）· Node 22 与 Node 25 的 Windows ESM 警告 · 本机运行无云端无遥测 · 目录结构（已重写为现结构）。

**改正**：启动命令 —— 旧件写 `node --import jiti/register server/src/index.ts`，实际现有 `npm run dev:server` / `npm run dev:client`（`package.json` 已提供）。

**刻意未写**：`test:unit`（client 单测 runner）—— 它是 Codex 工单 02-1 的**在飞未提交**产物，尚在复核中。未落地的东西不写进门面页。它转正后应补进「验证门」一节。

**语言**：改为中文正文。旧件是英文。理由：唯一用户与全部协作文档都是中文，英文门面页服务的是一个不存在的读者群；且宪章与 current-state 双语混排已是既成惯例。**若你认为门面页仍应英文（对外可见性考虑），我改回英文成本很低** —— 这是我自选的，非你指定。

---

## 5. 转正执行清单（放行后执行）

1. 以本草案 §3 全文替换 `README.md`。
2. 按 Henry 对 §2 的裁定填「许可」节（补 LICENSE / 改私有 / 摘徽章三选一）。
3. 本草案状态头改 `superseded`，`被取代` 指向 `README.md`。
4. 重跑 `node scripts/docs-index.mjs`。
