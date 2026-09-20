> **状态 (Status)**: active（停线证据；未施工完成、未验收）
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（Codex builder 举证；裁定归 HQ）

# D3a ownership：STOPPED_CONFLICT

**结论：按工单“冲突停线举证”执行。产品代码改动 0，收敛 0 份，测试执行 0；不是 PASS。** 已完成裁定考古、现数普查和冲突证据整理，未执行共享 helper 提取、签名变更、调用方适配或 ESM 拆边。

## 依据与冲突

权威原文是 [2026-09-13-ownership-signature-ruling-draft.md](../../agent-ops/analysis/2026-09-13-ownership-signature-ruling-draft.md)：文件名虽含 draft，状态头为 **active（Henry 2026-09-13 整表拍照准）**。第 11–13 行要求收 db、返完整 owned 行、参数位序 (db, userId, xId)，并明确“查无=抛 404 明码”。第 18–19 行另要求资源 service 住所与枚举 getOwned* 导出的签名契约测试。TD-15/16 原条位于 [tech-debt.md](../../agent-ops/current-state/tech-debt.md) 第 26–27 行。

工单 §一.3 与 §三.4 要求错误语义、404 语义和事务边界原样，禁止行为变更；而现物并非全部“查无抛 404”：

| 现物位置 | 当前行为 | 按统一抛 404 直接改动的结果 |
|---|---|---|
| `server/src/services/courseMaterials.ts:263–265` | `getOwnedSourceMaterial` 返回 `SourceMaterialRow \| undefined`，未抛错 | 改变该导出 helper 的缺失语义 |
| 同文件 `:269–270`、`:406–407` | `listSourceFragments`、`listMaterialSegments` 查无返回 null | 将从返回值变为异常 |
| 同文件 `:345–346` | `ensureSegmentsForMaterial` 查无直接 return，不作处理 | 将从 no-op 变为异常 |
| `server/src/services/materialMapProposals.ts:192–193` | `Boolean(getOwnedSourceMaterial(...))` 过滤掉无匹配行的 ID，继续执行 | 将由过滤继续变为抛错中断 |
| `server/src/routes/proposals.ts:149–152` | 上述 `applyMaterialMapProposal` 在 `db.transaction` 内调用 | 缺失 ID 原本可过滤后继续，直接抛错会改变事务结果 |

其中两条 material route 会自行把 null 映射为 404（`server/src/routes/courseMaterials.ts:26–27`、`:33–34`），但这不能消除 service 的 null/no-op/filter 三种现役行为。**本单没有授予 builder 重开设计或自裁例外的权限，因此不自行引入可选读取 helper、异常适配或豁免来绕开冲突。** 需 HQ 明确统一“查无抛 404”与这些既有行为的适用边界后再派续单。

另有返回形状差异供 HQ 一并看见（不是首要停线依据）：`server/src/services/skinSuites.ts:25–28` 返回 hydrate 后的 `SkinSuite`，`:17–22` 会将 `tokens_json/components_json/material_preset` 转为 `tokens/components/materialPreset`。既有 `v14SkinSuites.test.ts:101/:178/:250` 直接断言该形状。尚未裁定其与“完整 owned 行”的兼容口径，未修改实现或测试。

以上为静态源码证据；**未设计、运行新增安全或对抗用例，也未运行行为探针**。原文带行号摘录见 [authority-and-conflict-source.txt](../../../.codex-tmp/d3a-ownership/authority-and-conflict-source.txt)，独立复核见 [ownership-audit.txt](../../../.codex-tmp/d3a-ownership/ownership-audit.txt)。

## 全仓现数与未改范围

- 自有 JS/TS 源扫描 **1376 文件**，TypeScript AST 识别 **16 份实现 / 14 文件 / 9 个名称**，主扫描与独立物理枚举一致。
- 调用 **55 处 / 18 文件**：生产 **49**、既有测试 **6**。停线前后 **16→16 份、14→14 文件、55→55 调用**；实际收敛 **0 份**、改动调用 **0 处**。
- 台账 14 份/13 文件是旧快照，不作为当前分母。新增可见资源包含 paletteColors 与 skinSuites；本轮不推断历史文件数差异的成因。
- 全部原签名、逐件行号、全调用点及扫描排除射程见 [signatures-and-calls.md](signatures-and-calls.md)。原始日志位于 [.codex-tmp/d3a-ownership](../../../.codex-tmp/d3a-ownership/)。

## TD-16 与验证申报

环检测采用目标 import 边的静态逐行复核：`services/notes.ts:3` 仍从 `../routes/notes.js` 导入两个 ownership helper；`routes/notes.ts:26–34` 仍反向导入 `../services/notes.js`。**这条两模块 ESM 环仍在，未拆边；没有声称全图无环。** 当前 service 有三个消费点 `:61/:128/:149`，全部保留。

验证仅盘点、未执行：runtime 门 **25 顶层组件**，按工单应跑 **非 git/secrets 23 组件**；git diff --check 与 secrets 两组件留 HQ。server 现有 **108 个测试文件**，其中 test:v2 主集 **82**、补集 **26**，补集含 `scripts/v13WildernessExecute.test.ts`；文件预算需 **≥600s**。client 静态盘点 **227 测试文件**，不冒充执行结果。agent 族现有清单已记入 [verification-inventory.txt](../../../.codex-tmp/d3a-ownership/verification-inventory.txt)。

**本轮实际执行测试 0；23 组件、client 全库、server 主集与补集、agent 族、跨界闸全部未跑。** 停线发生于考古阶段，未产生可供验证的新实现。现役 runner 的超时透传等调查事实留 raw，不修改 runner，不借机扩范围。

TD-15/16 **未更新、未自标已清**，保持原状；没有共享 helper 落点、没有签名契约闸接线。工单已追加 `## Result`，原 ready 头保留，不伪报 done。

git 仅用于只读 status/文件枚举/diff 范围核对；**一切 git 写操作、commit、push、PR 均未执行**。工作树原有 untracked 项保留；没有改 agent 指令/权限文件，没有新依赖，没有访问用户库或凭据，没有真实模型调用。


## 二轮续派（2026-09-20）

补遗一已消解一轮合同冲突；产品施工现已完成，服务端全量仍受两项Python/MinerU环境失败阻塞。最新实况见 [二轮交付](README-round2.md)，一轮收据与原件保留。
