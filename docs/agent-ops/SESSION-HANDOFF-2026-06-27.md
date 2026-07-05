> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(会话交接,临时)
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是(本次会话增量);长期真相以 `current-state/` 为准

# 会话交接 — 2026-06-27(Cowork → Claude Code)

**给接手的 Claude Code / Codex:** 先读 [`AGENT_CONTEXT.md`](AGENT_CONTEXT.md),它是常驻入口。本文件只补"上一段 Cowork 会话做了什么、还有什么没做",看完即可进入状态。看完这份后可删。

## 一、本次会话做了什么:文档债务收口

问题背景:项目边研究边开发,思路经历过 `block-first → annotation-first → TextFlow-first → 长出 ContentGroup` 的范式演进,导致大量旧研究/旧 plan/旧契约还在"冒充当前真相"。本次给文档装了一套"生命周期 + 权威边界"的体系。核心口号:**新规矩管未来,一块牌子封过去。**

落地物(全部在 `docs/`,**尚未 commit**):
- `agent-ops/DOCUMENTATION-SYSTEM.md` —— 文档体系宪法:五层结构(宪法/决策/现状/研究/契约+历史)、状态头格式、ADR 规矩、双 Agent 协作规矩。
- `agent-ops/AGENT_CONTEXT.md` —— Agent 开工入口(必读)。
- `agent-ops/current-state/README.md` —— 现状层:四大支柱状态、技术栈、watch list。
- `agent-ops/decisions/ADR-0001-...md` —— 第一条决策(见下)。
- `agent-ops/decisions/README.md` + 各层 `INDEX.md` —— 自动索引。
- `brainstorm/_ARCHIVE-NOTE.md`、`releases/_ARCHIVE-NOTE.md` —— "历史/研究层,非权威"牌子。
- `scripts/docs-index.mjs` —— 扫描各文档状态头 → 生成 `INDEX.md`(零依赖,`node scripts/docs-index.mjs`,带 `--check`)。
- `docs/contracts/` 13 份契约已贴状态头:**active 3**(ContentGroup-GroupFolder、Petal、Notebook-Object-Inventory)、**superseded 1**(Canvas-Page-Surface,被 ADR-0001/06-25 设计集取代)、**draft 3**(TextFlow、Annotation、Command-Surface)、**deferred 6**(Block、Editor-State-Rebuild、Link-Source-Relation、Source-Provenance、Source-Reconstruction-Intake、Template-Category)。

## 二、已确立/修正的产品事实

- 主线分支 = `codex/v2-bn-canvas-engine`(Better Notebook 线),版本体系 `V2.BN.x`。
- 旧 `v2.0–v2.5.6` = 已关闭的工程地基路线图,部分哲学(block-first)已过时。
- 四大支柱(严格依赖顺序,前者未稳不动后者):**1 TextFlow → 2 ContentGroup → 3 Canvas Engine → 4 Agent+Graph DB**。
- 硬约束:**Agent 能编辑的,人类必须 100% 都能编辑**(AI 协作而非接管,落到数据模型层)。
- **待确认**:当前前沿很可能已是 **V2.BN.8.10.2(Typography 控制)**,但 `current-state/` 里还写 8.8,需要按真实情况更新。

## 三、关键决策

- **ADR-0001**:Canvas 采用**自研最小混合引擎**,取代 PI-046 的 BlockSuite 路线(仅作为"实现路线依据"被取代;PI-046 作为历史研究依据仍有效)。引擎版本号 `V2.BN.8-self-owned-minimal-hybrid-0`。

## 四、分工共识(Claude × Codex)

- **Claude 可担 6 角色**:架构/决策搭档、审查/把关、给 Codex 写规格、文档负责人、研究/调查、点状外科手术式实现。
- **Codex**:canvas 引擎等长周期、多文件重实现。
- 风险:同改一文件会撞车 → 需按"领域所有权 + worktree"隔离。

## 五、测试方案(已讨论清楚)

- Codex 红绿灯(`smoke:canvas-engine-model-contract` / `check:canvas-runtime-boundary` / `build:client` 等)管"逻辑对不对"。
- **人类视角 UX 测试**:由**本机 agent(Claude Code / Codex)用 `_external_tools/browser-harness` 驱动真实 Chrome** → 截图/page_info → **Claude 做"按重要性评估操作成本"的体验评分**(主要功能必须便捷;次要功能藏菜单 OK;过重则建议移到右键/工具栏/navigator)。沿用 `PASS / PASS_WITH_FOLLOWUP / FAIL`。
- 注意:**Cowork 沙箱测不了 live app**(够不到 localhost、45s/进程不留存/无 root/下载受限),所以测试主场在 Claude Code/你的机器。

## 六、连接/harness 方向(尚未搭建)

- 轻量为主:根目录 `AGENTS.md`(Codex 读)+ `CLAUDE.md`(Claude Code 读),都指向 `agent-ops/AGENT_CONTEXT.md`;`agent-ops/handoffs/` 交接区 + commit 约定;**git worktree** 防撞车。
- 重型 swarm 框架(ruflo/metaswarm/ccswarm 等)对两 Agent 场景过度设计,只偷思路不整包用。

## 七、待办 / 未决

1. 更新 `current-state/` 的当前前沿(8.8 → 8.10.2?,待 Henry 确认)。
2. **commit 本次文档改动**(Henry 想等工作区清爽后再提;注意工作树已有 ~293 个未提交改动,疑似行尾/格式批量变更,与本次文档无关)。
3. 写 **workflow 文档**(双 Agent 流程 + 新建/冻结契约的规范)—— 约定放最后做。
4. 搭 **AGENTS.md / CLAUDE.md 指针 + `handoffs/`** 这套最小 harness。
