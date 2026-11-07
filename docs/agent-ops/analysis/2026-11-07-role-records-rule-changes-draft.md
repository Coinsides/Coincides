> **状态 (Status)**: draft
> **层 (Layer)**: 分析 / Analysis（规矩修改稿）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否。Main_Designer 先审，再给 Henry 过目；Henry 点头后由 Main_Designer 动手。同侪不能代授权修改 CLAUDE.md、AGENTS.md、权限和钩子配置（CLAUDE.md §2.1）
> **依据**: `analysis/2026-11-07-role-records-design.md` 第七节；Henry 2026-11-07 拍板和初衷（经 Main_Designer 转达）

# 角色记录体系：规矩文件修改稿

**怎么读**：每一处都写了「原文」和「新文」。原文是从当前文件里逐字摘出来的，起草时已经用脚本逐条核对过，确认原文确实存在于目标文件（核对方法见文末）。动手时整段替换即可。标「可选」的，不改也不挡这套体系运转。

**贯穿全稿的约束**（Henry 的初衷）：Tester 和 builder 将来可能由 Codex 代理担任，所以新文都不假设执行者是 Claude Desktop 会话。只依赖仓库文件和私有 ops 目录；会话短讯只是指针。

---

## 一、CLAUDE.md（只有 Henry 本人能指示修改）

### 改动 1.1：§1 必读清单加看板和角色卡

**文件**：`CLAUDE.md`
**原文**：
````text
3. `docs/agent-ops/current-state/`
````
**新文**：
````text
3. `docs/agent-ops/current-state/` —— 先读 `board.md`（看板：岛上版本、在办的单、等 Henry 拍板），再读你所担任角色的角色卡 `docs/agent-ops/roles/<角色>.md`。
````

### 改动 1.2：§2 角色改成三角色

**文件**：`CLAUDE.md`
**原文**：
````text
## 2. 你的角色（Claude）

- 你是**领航 / 顾问**，不是主力施工：架构/决策搭档、**写规格（交 Codex 建）**、审查/把关、文档与 current-state 守门、研究广度、点状单文件实现、**用 `_external_tools/browser-harness` 模拟真实用户工作流并做 UX 评分**。
- **不抢** Codex 的长周期多文件重实现；介入其领域只通过 spec / review / verify。
- 守的红线：**Agent 能编辑的，人类必须 100% 都能编辑。**
````
**新文**：
````text
## 2. 你的角色

- 本仓库有三个工程角色：**Main_Designer**（主设计：设计、裁定、派单、收割提交、部署、对 Henry 汇报）、**Tester**（验收）、**builder**（工程实施）。职责、记录义务和开工读什么，见 `docs/agent-ops/roles/` 下各自的角色卡。三个角色共读同一张看板 `docs/agent-ops/current-state/board.md`。
- 先确认你担任哪个角色，再读那张卡。Tester 和 builder 也可能由 Codex 代理担任，所以给别的角色的指令一律落在文件里，会话短讯只是指针。
- 不属于这三个角色的会话（比如个人学习讨论），按用户当次的要求做事。做了影响工程的事，交给 Main_Designer 记入台账。
- 守的红线：**Agent 能编辑的，人类必须 100% 都能编辑。**
````

### 改动 1.3：§2.1 组织图

**文件**：`CLAUDE.md`
**原文**：
````text
Henry（休养，随时查岗，保留召回权）
  └─ Fable 会话 —— 拍板 / 设计 / 总调度
       ├─ Claude 工程并行会话 —— 复核汇总 + 并行工程
       ├─ Codex builder thread —— 施工
       └─ Codex reviewer thread —— 专职洁净室复核（角色卡：`docs/agent-ops/codex-reviewer-charter.md`）
````
**新文**：
````text
Henry（随时查岗，保留召回权）
  └─ Main_Designer（主设计会话，固定）—— 设计 / 裁定 / 派单 / 收割提交 / 部署
       ├─ Tester —— 验收（Claude 会话或 Codex 代理；角色卡 `docs/agent-ops/roles/tester.md`）
       └─ builder —— 工程实施（Claude 会话或 Codex 代理；角色卡 `docs/agent-ops/roles/builder.md`）
````

### 改动 1.4：§2.1 复核那一条

**文件**：`CLAUDE.md`
**原文**：
````text
- reviewer 的报告汇报 Claude 与 Fable；Claude 做二级复盘（评复核质量），Fable 抽检放行。
````
**新文**：
````text
- Tester 的判语写在报告最前面，并登记进 `docs/agent-ops/records/tester/verdicts.md`；裁定、收割和部署归 Main_Designer。原 Codex reviewer 角色卡（`codex-reviewer-charter.md`）里的复核纪律（5-1 到 5-10）由 Tester 承接。
````
> 第 39 行「调度归属以 operating-workflow.md 为准……」是 Henry 2026-08-21 亲批的「只放指针」写法，本稿不动它；它指向的 operating-workflow 见第五节的修改。

### 改动 1.5：§5 台账路径改成月文件

**文件**：`CLAUDE.md`
**原文**：
````text
- **每完成一段实质工作后**，在 `docs/agent-ops/claude-log/<今日 YYYY-MM-DD>.md` 追加一条（含「判断点（供 Henry 复核）」字段）。这是 Henry 监督 Claude 工作的**唯一轨迹** —— 不写 = Henry 看不见。格式见 `docs/agent-ops/claude-log/README.md`。
````
**新文**：
````text
- **Main_Designer 每完成一段实质工作后**，在 `docs/agent-ops/claude-log/<YYYY-MM>.md`（按月一个文件）末尾追加一条，§ 编号跨文件连续，含「判断点（供 Henry 复核）」字段。这是 Henry 监督工程的轨迹 —— 不写 = Henry 看不见。格式见 `docs/agent-ops/claude-log/README.md`。Tester 和 builder 按各自的角色卡记录，不写这本台账。
````

### 改动 1.6（可选）：§4 交接收件箱

**文件**：`CLAUDE.md`
**原文**：
````text
- 检查 `docs/agent-ops/handoffs/`，处理 `to: claude` 的交接（通常是 Codex 的结果回执 —— 审 diff、给结论）。
- 写规格时产出 `from: claude` / `to: codex` / `status: draft` 的交接，交 Henry 翻牌成 `ready`。
````
**新文**：
````text
- 要处理什么，看看板上「持有者」是你所担任角色的行；那一行指向订单文件和现行裁定。
- 订单的格式和状态规则见 `docs/agent-ops/handoffs/README.md`；派单由 Main_Designer 负责。
````

---

## 二、AGENTS.md（Codex 的入口；只有 Henry 本人能指示修改）

### 改动 2.1：§1 加角色卡入口（Main_Designer 要求的那一行）

**文件**：`AGENTS.md`
**原文**：
````text
4. `docs/agent-ops/decisions/` 中 `状态 = active` 的 ADR。
````
**新文**：
````text
4. `docs/agent-ops/decisions/` 中 `状态 = active` 的 ADR。
5. 如果你被派作 **builder**（工程实施）或 **Tester**（验收）：先读角色卡 `docs/agent-ops/roles/builder.md` 或 `docs/agent-ops/roles/tester.md`，再读看板 `docs/agent-ops/current-state/board.md`。你收不到会话间短讯，所需的一切都在这些文件和订单文件里。
````

### 改动 2.2（可选，建议一起改）：§2 两条 Codex thread 的描述

**文件**：`AGENTS.md`
**原文**：
````text
本仓库现有 **两条 Codex thread**，开工前先确认自己是哪条：

- **builder thread** —— 你是**建造者**：长周期、多文件的重实现（canvas 引擎等）。按 `to: codex` 且 `status: ready` 的 handoff 施工。
- **reviewer thread** —— 你是**专职复核**：洁净室复核、亲跑验证、产出 `## Review` 分级与判定。**放行权不在你手上**（留 Fable）。角色卡：`docs/agent-ops/codex-reviewer-charter.md`。
````
**新文**：
````text
本仓库有三个工程角色：Main_Designer（固定由主设计 Claude 会话担任）、**Tester**、**builder**。你可能被派作后两者之一，开工前先确认是哪个：

- **builder** —— 工程实施。角色卡 `docs/agent-ops/roles/builder.md`。要做的单看看板上持有者是 builder 的行。
- **Tester** —— 验收。角色卡 `docs/agent-ops/roles/tester.md`。**裁定和部署不在你手上**（归 Main_Designer）。
````

### 改动 2.3（可选）：§4 交接收件箱

**文件**：`AGENTS.md`
**原文**：
````text
- 开工时检查 `docs/agent-ops/handoffs/`，处理 header 里 `to: codex` 且 `status: ready` 的交接。
- 做完后，把结果写回（同文件追加 `## Result`，并把 `status` 改为 `done`；或另写一份 `from: codex` 的回执）。
````
**新文**：
````text
- 开工时读看板，处理持有者是你所担任角色的行；那一行指向订单文件。
- 做完后，按角色卡写回：builder 在订单尾部追加 `## <项> Result(builder YYYY-MM-DD)`，Tester 写报告并登记判语台账；然后把看板该行（单卡启用后改单卡状态块）交给下一方。⛔ 不改订单状态头，那是 Main_Designer 的事。
````

---

## 三、DOCUMENTATION-SYSTEM.md（宪法层，变更需 Henry 确认）

### 改动 3.1：层的枚举加「协议」「记录」

**文件**：`docs/agent-ops/DOCUMENTATION-SYSTEM.md`
**原文**：
````text
> **层 (Layer)**: 宪法 | 决策 | 现状 | 研究 | 契约 | 历史
````
**新文**：
````text
> **层 (Layer)**: 宪法 | 决策 | 现状 | 研究 | 契约 | 历史 | 协议 | 记录
````
> 「协议」：工作流、角色卡、裁定纪律等运行规矩。operating-workflow、codex-reviewer-charter、adjudication-discipline 三份已经在用这个值。「记录」：`docs/agent-ops/records/**` 下的角色记录。

### 改动 3.2：流水件表的 handoffs 一行（冲突①：单卡覆盖写，阶段可回退）

**文件**：`docs/agent-ops/DOCUMENTATION-SYSTEM.md`
**原文**：
````text
| `docs/agent-ops/handoffs/` | 交接单 | 否(是收据) | 追加式;`status` 只向前翻(draft → ready → done),不回改历史内容 |
````
**新文**：
````text
| `docs/agent-ops/handoffs/` | 交接单(订单) | 否(是收据;规格与现行裁定是施工依据) | 规格和尾部(Result、判语、裁定)追加式,不回改历史内容;**例外**:文件顶部的「单卡」块覆盖写,只记「现在」,历史在尾部;单卡里的阶段可以回退(如返修);状态头 `状态` 只用 active / archived |
````

### 改动 3.3：流水件表的 claude-log 一行（冲突②：旧文件补状态头）

**文件**：`docs/agent-ops/DOCUMENTATION-SYSTEM.md`
**原文**：
````text
| `docs/agent-ops/claude-log/` | 行动日志 | 否(是收据) | **只追加,永不回改** —— 它是 Henry 监督 agent 工作的唯一轨迹 |
````
**新文**：
````text
| `docs/agent-ops/claude-log/` | 行动日志(Main_Designer 台账) | 否(是收据) | **只追加,永不回改**;按月一个文件,§ 编号跨文件连续;**例外**:冻结旧文件时可以补一次状态头 —— 它是 Henry 监督工程的轨迹 |
| `docs/agent-ops/records/` | 角色记录(Tester 等) | 否(是收据) | 状态卡覆盖写,台账行不删、只改状态列;每个文件都带状态头 |
| `docs/audits/` | 证据(builder、Tester 的原始输出与报告) | 否(是证据) | 原样保存,不改写;新单按 `<日期>-<单号>/builder/`、`<日期>-<单号>/tester/` 分开放;不进 INDEX |
````

### 改动 3.4：登记仓库外的私有 ops 目录（隐私例外）

**文件**：`docs/agent-ops/DOCUMENTATION-SYSTEM.md`
**原文**：
````text
### ⭐ analysis 层的权威例外条款(2026-08-19 立)
````
**新文**：
````text
### 仓库外的私有 ops 目录(2026-11-07 登记的隐私例外)

本仓库是公开的。凭据、服务器地址、本机路径、进程号和端口、测试账号的数据地图,一律放在仓库外的私有 ops 目录:服务器手册、各角色私有状态卡、共享重活锁、测试工具都在那里。仓库里只用占位写法 `<ops>`、`<home>` 指过去,⛔ 写真实路径。服务器状态的单一事实源是那里的服务器手册,这是对「仓库文件是权威通道」的**有意例外**;看板只放版本号和指针。

### ⭐ analysis 层的权威例外条款(2026-08-19 立)
````

### 改动 3.5：状态头义务覆盖 agent-ops 下的全部新文件（冲突③：INDEX 递归收录）

**文件**：`docs/agent-ops/DOCUMENTATION-SYSTEM.md`
**原文**：
````text
**每一份"活着的"文档**(宪法 / 决策 / 现状 / live 契约)顶部必须有状态头。历史与研究层的文档不强制补,但新增时建议带上。
````
**新文**：
````text
**每一份"活着的"文档**(宪法 / 决策 / 现状 / live 契约)顶部必须有状态头。历史与研究层的文档不强制补,但新增时建议带上。**`docs/agent-ops/` 下新建的每个文件都必须带状态头**(包括 records/、roles/、订单):docs-index 会递归收录这个目录,没有状态头就会在 INDEX 里显示「(缺状态头)」。
````

### 改动 3.6（可选）：§五 标题

**文件**：`docs/agent-ops/DOCUMENTATION-SYSTEM.md`
**原文**：
````text
## 五、双 Agent 协作规矩 (Claude + Codex)
````
**新文**：
````text
## 五、多角色协作规矩 (Main_Designer / Tester / builder;执行者可以是 Claude 或 Codex)
````

---

## 四、handoffs/README.md（交接协议）

### 改动 4.1：开头加角色名映射（判例原文不动）

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
# handoffs —— Henry × Claude × Codex 三方交接区
````
**新文**：
````text
# handoffs —— 订单区(Main_Designer × Tester × builder)

> **2026-11-07 起的角色名映射**:下文判例沿用旧称,读时按此对应 —— 总部 / Fable / Project review 会话 / 调度方(Opus) → **Main_Designer**;Codex builder / 施工方 → **builder**;Codex reviewer / 复核方 → **Tester**。角色卡见 `docs/agent-ops/roles/`。判例原文不改。
````

### 改动 4.2：「一切问题走总部」改成不依赖短讯

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
**任何问题、请示、翻牌、卡点 —— 一律 `SendMessage` 找总部(Project review 会话)。**
````
**新文**：
````text
**任何问题、请示、翻牌、卡点 —— 一律找 Main_Designer。** 写在订单尾部 `## 提问(<角色> YYYY-MM-DD)`,并把看板该行的持有者改成 Main_Designer;收得到会话短讯的,再补一行指针。Codex 代理收不到短讯,所以文件这一步不能省。
````

### 改动 4.3：文件格式（状态头）

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
一份交接 = 一个 md。文件名：`YYYY-MM-DD-<slug>.md`。顶部一行 header：

```
> from: <claude|codex|henry> | to: <claude|codex|henry> | status: <draft|ready|done|closed> | re: <slug> | date: <YYYY-MM-DD>
```
````
**新文**：
````text
一份订单 = 一个 md,只放一项(旧的多项单按项在单卡里分行)。文件名:`YYYY-MM-DD-<单号>-order.md`;**单号** = 文件名去掉日期和 `-order.md`,审计目录、判语台账、看板都用它。顶部状态头:

```
> **状态 (Status)**: active | archived
> **层 (Layer)**: 交接 / Handoff(订单)
> **日期 (Updated)**: YYYY-MM-DD
> **权威 (Authoritative)**: 规格与单卡里的现行裁定是施工依据
> **from**: Main_Designer | **to**: builder;核验 Tester
```

状态头之后、规格之前是 `## 单卡(现行,覆盖写)`,格式见 `analysis/2026-11-07-role-records-design.md` 3.2。尾部每个新追加的 `##` 标题都以 `(<角色> YYYY-MM-DD)` 结尾,日期写写作日。
````

### 改动 4.4：状态流转（统一「ready 由谁翻」）

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
- `draft` —— 作者写好；若是「要建的活」，需 Henry 审过才能往下。
- `ready` —— **Henry 已批准**；目标 agent 可以执行。（这是唯一的人工闸：Henry 把 `draft` 翻成 `ready`。）
- `done` —— 目标 agent 做完，在同文件追加 `## Result`，或另写一份回执交接。
- `closed` —— 已确认收口，可留档。
````
**新文**：
````text
- **阶段写在单卡里**,只用:`排队 | 施工 | 待验 | 返修 | 待裁 | 待收割 | 待部署 | 已上岛 | 已核 | 关闭`。状态头的 `状态` 只用 active / archived(关闭时改 archived)。
- **派单(排队 → 施工)由 Main_Designer 决定并执行**,依 Henry 2026-08-19 的代理授权和工作流,不需要 Henry 逐张批。⛔ builder 和 Tester 没有派单权。
- **Henry 保留的四类事**(体感走查、迁移触发、推翻他的裁定、权限文件改动):订单涉及其中任何一类,必须 Henry 本人点头,并在单卡状态块写明出处。
- **谁交出,谁改阶段**:builder 交货改成「待验 · Tester」;Tester 下判语改成「待裁 · Main_Designer」;其余阶段由 Main_Designer 改。
````
> 这一改动同时取代本文件里「翻牌来源标注(2026-08-21)」和「收窄:调度方【没有】自有翻牌权(2026-08-30)」两节的规定（两节原文作为判例保留）。**派单权的表述涉及授权，请 Henry 逐字确认。**

### 改动 4.5：流程

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
1. Claude 写 spec → `from: claude / to: codex / status: draft`。
2. Henry 读、改、把 `status` 翻成 `ready`。
3. Codex 开工时（由根 `AGENTS.md` 指引）扫到 `ready` 的活，执行，写回 `status: done` + `## Result`。
4. Claude 读回执，审 diff，给结论。
````
**新文**：
````text
1. Main_Designer 写订单(规格 + 单卡),阶段「排队」,在看板排期;派单时改成「施工 · builder」。
2. builder 在副本里施工,交付时在订单尾部追加 `## <项> Result(builder 日期)`,证据放 `docs/audits/<日期>-<单号>/builder/`,阶段改成「待验 · Tester」。
3. Tester 冻结快照、复核,报告放 `docs/audits/<日期>-<单号>/tester/review.md`,判语写在最前面并登记 `records/tester/verdicts.md`,阶段改成「待裁 · Main_Designer」。
4. Main_Designer 裁定:返修(回到第 2 步)或放行;放行后收割、提交、部署,并在看板更新岛上版本。
5. Tester 部署后去岛上复走,在 `verdicts.md` 那一行填「部署核对」;Main_Designer 把阶段改成「关闭」。
````

### 改动 4.6：约定

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
- **不删原文**：交接是 append-only；状态只在 header 里改。
- 一份交接只干一件事（一个 `re:`）。
````
**新文**：
````text
- **不删原文**:规格和尾部是 append-only;只有状态头和顶部单卡可以覆盖写。
- 一份订单只放一项(新单起);旧的多项单按项在单卡里分行。
````

### 改动 4.7：翻牌来源标注那一节

**文件**：`docs/agent-ops/handoffs/README.md`
**原文**：
````text
`ready` 的翻牌方有两种,**工单文首必须注明是哪一种**:①**Henry 本人**批准;②**调度方(Opus)按 Henry 亲授的下沉工作流**翻牌(注明设计裁定出处,如「Fable 裁定 §x」),并明写「不代表 Henry 逐张批过」。理由:两张牌的授权强度不同,将来回看必须分得出来(Henry 保留全量推翻权,逐张可翻)。
````
**新文**：
````text
`ready` 的翻牌方有两种,**工单文首必须注明是哪一种**:①**Henry 本人**批准;②**调度方(Opus)按 Henry 亲授的下沉工作流**翻牌(注明设计裁定出处,如「Fable 裁定 §x」),并明写「不代表 Henry 逐张批过」。理由:两张牌的授权强度不同,将来回看必须分得出来(Henry 保留全量推翻权,逐张可翻)。
> **2026-11-07 起**:派单权的现行规定见上文「状态流转」;本节作为判例保留。新单的出处写在单卡状态块:「Main_Designer 派单」或「Henry 本人点头(出处)」。
````

---

## 五、operating-workflow.md（工作流）

### 改动 5.1：§1 三层表的作者列

**文件**：`docs/agent-ops/operating-workflow.md`
**原文**：
````text
| **Order** | `handoffs/<date>-<version>-<step>.md` | Opus(从 plan 拆)| 施工单;修正轮追加同文件 |
| **Receipt** | 同工单文件 `## Result/## Review/## Review-2`;`claude-log/` | builder / reviewer / Opus / Fable | 现行不变 |
````
**新文**：
````text
| **Order** | `handoffs/<date>-<单号>-order.md` | Main_Designer | 施工单:规格 + 顶部单卡(覆盖写);裁定和 Result 追加在尾部 |
| **Receipt** | 订单尾部 Result;`docs/audits/<日期>-<单号>/{builder,tester}/`;`records/tester/verdicts.md`;`claude-log/` | builder / Tester / Main_Designer | 见各角色卡 |
````

### 改动 5.2：§2 指挥链改成三角色

**文件**：`docs/agent-ops/operating-workflow.md`
**原文**：
````text
## 2. 指挥链(Henry → Fable → Opus → Codex)

- **Fable**:设计稿与 plan、拍板(设计介入)、抽样抽检、终检与铸版、大版本复盘。**不写产品代码,不逐单调度。**
- **Opus(Fable 负责)**:从 plan 拆单、启动与监视 codex builder/reviewer、按步骤汇总复核、维护 tech-debt 与生成件;**只在三种情况升级 Fable**:设计级 finding(裁定卡 §2)、止损触发(§3)、plan 步骤收口。每日一份摘要。
- **Codex builder**:按 plan 步骤自驱多工单(V11 模式),按步骤 checkpoint;**Codex reviewer**:按步骤攒批、增量协议(角色卡 5-7)。
- **Claude 会话不下场施工**(Henry 08-21)。
````
**新文**：
````text
## 2. 指挥链(Henry → Main_Designer → Tester / builder;2026-11-07 起)

- **Main_Designer**(固定由主设计会话担任):设计、裁定、派单、收割提交、部署、对 Henry 汇报;维护看板、台账、tech-debt 与生成件。**不做验收,不写产品代码。** 角色卡 `roles/main-designer.md`。
- **Tester**(Claude 会话或 Codex 代理):对抗式复核、冻结快照、下判语、部署后复走、回归。角色卡 `roles/tester.md`;复核纪律承接原 reviewer 角色卡 5-1 到 5-10。
- **builder**(Claude 会话或 Codex 代理):在副本里施工,交 Result 和证据。角色卡 `roles/builder.md`。
- 三者共读看板 `current-state/board.md`;一切指令和交接落在文件里,会话短讯只是指针。
````

### 改动 5.3：§5 即时生效

**文件**：`docs/agent-ops/operating-workflow.md`
**原文**：
````text
12.2 起按本流程:Fable 出 plan → Opus 拆单与调度 → Fable 抽检/拍板/铸版。
````
**新文**：
````text
2026-11-07 起按 §2 的三角色链执行。注意:§3 的版本纪律(注解标签、铸版)自 `v2.bn.12.1.1` 之后没有执行过,要不要恢复由 Henry 定;§3.5 的 token 经济学排序沿用旧角色名,只作历史参考。
````

---

## 六、pre-commit 钩子：开成真拦（只描述，不改配置；由 Main_Designer 在 Henry 点头后动手）

**现状**：`.githooks/pre-commit` 只警告、不阻断。它用 `trap 'allow_commit' 0` 把任何退出都改写成 exit 0，`docs:check` 失败也照样放行提交。而且这个仓库的 clone 没有设置 `core.hooksPath`，钩子根本没启用。

**改法**（两步）：

### 改动 6.1：钩子在 docs:check 失败时拦下提交

**文件**：`.githooks/pre-commit`
**原文**：
````text
  *) docs_check_failed "$check_status" ;; #
````
**新文**：
````text
  *) docs_check_failed "$check_status"; trap - 0 1 2 3 15; exit 1 ;; #
````

### 改动 6.2：失败提示的措辞跟着改

**文件**：`.githooks/pre-commit`
**原文**：
````text
  printf '⚠️ Coincides 文档软闸警告：npm run docs:check 未通过（exit %s）；本钩子只警告、不阻断，本次提交仍会继续。\n' "$1" >&2; #
````
**新文**：
````text
  printf '⛔ Coincides 文档闸：npm run docs:check 未通过（exit %s），本次提交已被拦下。修好后再提交；⛔ 未经 Henry 逐次同意不得用 --no-verify 绕过。\n' "$1" >&2; #
````

- **新增的两行都保留行尾的 ` #`**：这是原文件防 CRLF 改写的写法。
- **超时（124/137）和跑不起来（125-127）仍然只警告、放行**（推荐）。理由：环境坏了不该把所有提交都冻住；`docs:check` 很轻，正常 60 秒内跑得完。如果 Henry 要连这两种情况也拦，就把那两行也改成 `trap - 0 1 2 3 15; exit 1`。
- **启用**（Main_Designer 在自己提交用的那个 clone 里执行一次，是本地配置，不进仓库）：`git config core.hooksPath .githooks`，然后用 `git config --get core.hooksPath` 确认。
- **阳性对照**：启用后故意让 INDEX 过期（新建一个带状态头的文件但不重新生成 INDEX），尝试提交，确认被拦下；然后还原。
- **已知射程**（原钩子已有提示，照旧）：它检查的是工作树，不是暂存区；也抓不到「新文件忘了 git add」。
- 只有 Main_Designer 提交，所以这个钩子只影响 Main_Designer。

---

## 七、本稿没有给精确文本、只提方向的（可选，另行处理）

- `AGENT_CONTEXT.md`：§3 版本线停在 V2.BN.12；§6 的目录归属没有收录 `docs/audits/`、`records/`、`roles/`。
- `codex-reviewer-charter.md`：状态改成 superseded，被取代者填 `roles/tester.md`；或者保留为 Tester 复核纪律的附录。
- `adjudication-discipline.md`：标题里的「Fable 自律卡」改成 Main_Designer；§6 依赖的「二级复盘岗」在三角色下由谁担任，需要定。
- `claude-log/README.md`：「一天一个文件」「最新在最上」改成「按月一个文件、追加在底部、§ 连续编号」。要等改动 1.5 落地之后再改。
- `current-state/deferred-tests.md`：它自己的触发条件①「第一次真实部署」已经在 11-01 触发过了，要不要开补测单，候定。

---

## 核对方法

起草时用一段只读脚本做的核对：逐条取出上文每个「**文件**」和紧跟的「**原文**」代码块，确认原文是目标文件当前内容的子串，并且只出现一次。动手前请重新跑一次，因为文件可能在此期间被别人改过。没有命中的条目不要硬改，回来对现物。
