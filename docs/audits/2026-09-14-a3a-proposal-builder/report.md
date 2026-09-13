> **状态 (Status)**: active（builder 停线证据，未完成验收）
> **日期**: 2026-09-14（工单日期；实跑 UTC 2026-09-13，精确时间见 validation.json）
> **From**: codex builder
> **权威 (Authoritative)**: 否；待 HQ 裁定与复核

# 14.1-A3a · 提案统一停线报告

本单**未完成，不可作为通过验收的交付**。已实施并通过功能回归的改动保留在工作树供审查；遇到 shared 运行时架构冲突后停止产品修改。工单保持 `ready`，不翻 `done`。测试世界的绿不能覆盖产物加载失败。

## 1. 停线依据

工单第一节要求“合并为 shared 单一闭集”“server 校验两路同吃此枚举”。现有 `scripts/check-server-shared-runtime-import.mjs` 却禁止 server 产品源码对 shared 的任何非 `import type` 静态引用。本次直接共用枚举的实现命中 **6 处**：definitions、executor、validator、三材料 service。

这不是只在规则上失败。三端 typecheck/build 全过后，以裸 Node 仅导入 `server/dist/validators/index.js`，得到 **`ERR_MODULE_NOT_FOUND`**：编译后的相对引用仍指向不存在的 `shared/types/index.js`；shared 编译输出实际位于 `shared/dist/types/index.js`。未启动应用或连接用户库。

权威现状 `docs/agent-ops/current-state/tech-debt.md` 的 **TD-21** 仍将 shared 真共享列为未清偿；既有 **A1′** 是 shared 与 server 本地副本以契约测试锁全等，不是单一运行时闭集。TD-23 所记动态 import 等门禁盲区也不能当合法修法。现有 manifest 管线是 server registry 的专用投影，没有可直接套用的 shared 枚举投影入口。

**需要 HQ 明确本单允许的运行时交付方式**：是否采用 A1′ 镜像例外，或授权定向构建投影/真包化。这里没有擅自复制第二份手工闭集、放宽门或修 TD-21 构建架构。`recordAgentAction`、`recordEvent` 本体均与开工快照字节一致。

另有独立总门红：`docs:check` 报 `docs/agent-ops/INDEX.md` 过期。本轮未修改此索引；未替 HQ 重生成无关文档。该命令的后续 inventory/glossary 子检查因 `&&` 未执行，不申报为通过。

## 2. 已实施内容（仍待解决上述阻塞）

- `shared/types/index.ts`：扩充既有 `ProposalType` 为 8 型，增加由 enum 成员组成的 `CHAT_PROPOSAL_TYPES` 六型子集。
- `server/src/validators/index.ts`：`proposalTypeSchema = z.nativeEnum(ProposalType)`；原三个材料输入 schema 未变。
- `server/src/services/proposals.ts`：统一 `createProposal(db, userId, {type, data, context})`；同步 immediate 事务内 INSERT pending proposal 与 `recordEvent`，不写 operation_batches/tool receipt。
- 三个专用材料创建保留原数据生成、专用校验与返回键集合，落库改调统一 service；map/organized 的材料 proposal_status 更新同在外层同步事务；organized 的异步生成在事务之前完成。三个既有 data 对象与全部 apply 实现经开工快照比较未变。
- executor 五个原规划型共用统一创建；`organized_note` 解析原人门输入 schema 后复用 `createOrganizedNoteProposal`。来源由既有 orchestrator context 传递，未改 orchestrator。
- definitions 列出六个 chat 型；`data.anyOf` 保留旧 `{title, description, items}` 分支，organized 分支直接投影既有 Zod schema，没有第二套生成实现。
- 新增 13 条普通功能回归，加入既有 `server/package.json` 的 `test:v2` 列表；未新增门、依赖或安全对抗用例。

### 两族盘点

| 来源 | 原有型 |
|---|---|
| chat 定义五型 | `batch_cards`, `study_plan`, `goal_breakdown`, `schedule_adjustment`, `time_block_setup` |
| 材料三型 | `material_map`, `organized_note`, `material_reconciliation` |

原 executor 实际没有 type 闭集校验，census §4.16 G1 已记此事实；“五型”来自现役 chat definitions，不把任意旧字符串误认作额外合法型。原 shared enum 仅三型，本次补齐其余五型。chat 仅增加 `organized_note`；另外两个材料型仍由专用人门创建。

### 事件与参数

统一 service 写 `verb=proposal_issued`、`objects=[{kind:'proposal', id}]`、`meta={proposal_type, conversation_id}`。chat 使用 `actor_kind=agent, channel=chat`；材料人门默认 `actor_kind=human, channel=ui`。**现有事件 schema 的 `channel` 承载 via 语义，未另造 `via` 字段**。chat 同时保存 proposals.conversation_id。pending 不执行提案、不写执行收据；人工 apply 仍走原路径。

chat organized_note 入参：

```json
{
  "type": "organized_note",
  "data": {
    "course_id": "项目 UUID",
    "document_ids": ["文档 UUID"],
    "note_title": "候选笔记标题"
  }
}
```

仅 `course_id` 必填；可选 `source_material_ids`, `segment_ids`, `document_ids`, `source_scope_ids`（UUID 数组）、`source_board_id`（UUID）、`note_title`（1–200 字符）。不提交生成后的 blocks，也不要求旧五型的 items。返回 id/type/status/course_id/blocks_count/message，供读取既有列表、详情与 apply API。

## 3. 验证结果与覆盖边界

所有运行明细、命令、82 个 server 测试文件清单见 `validation.json`。不跨重复运行累加测试数。

| 验证 | 实跑结果 |
|---|---|
| shared/server/client typecheck 与构建 | 6/6 阶段通过；不代表裸 Node 可加载 |
| 定向 A3a + 既有材料库 | 72/72 通过，0 skipped；13 新测试 + 59 既有测试 |
| client 全库 | 167/167 文件，1722/1722 测试通过 |
| server 全量 | 动态枚举 82 文件；752 条测试记录，750 pass / 2 fail / 0 skipped / 0 cancelled |
| runtime 总门非 git 部分 | 21 项全部发起；19 pass / 2 fail |
| 裸 Node 产物导入 | FAIL，`ERR_MODULE_NOT_FOUND`，见 §1 |
| git 与 changed-file secrets | 按工单留 HQ，零执行 |

13 条新测试覆盖：八型统一校验及六型 chat 定义；五型 data 原样 pending；普通非法 enum 两入口同抛 ZodError；三材料人门 API 预览形状及 human/ui 事件；human/agent 普通业务事务取消时提案与事件一起回滚；chat organized_note → pending/agent 事件 → GET 列表/详情 → 人工 POST apply → note/blocks/source references。pending 前后下游域表未变，只有 apply 后出现操作批次。

两项 server 红按工单留 HQ：

1. `v2SourceMineruWiring.test.ts`：模块初始化时 `spawnSync python.exe ENOENT`，整个文件被选中但内部测试无法加载，不能声称其内部用例已逐条实跑。
2. `v2SourceRegionCells.test.ts` 的 MinerU 表格区域测试：Python 解释器无法启动，MinerU code 101 / `parser_failure`。

没有按名称排除任何安全测试或环境失败测试。外层 runner 仅继承 OS/工具路径白名单；dotenv/Vite 环境显式指向空 TEMP 文件/目录，provider store、资产、上传在 TEMP，DB 为内存或既有测试自建临时库。新测试合成 email 为 19 字符，password_hash 为 9 字符；未造长凭据或鉴权 token。所有原始日志只在 OS TEMP，未入本目录。

## 4. 文件与 numstat

下表是本轮开工字节快照到停线现物的**行 LCS**（计数时仅归一 CRLF），不是 git numstat，不代表全工作树差分。指纹与算法口径见 `changes.json`；构建输出不计入交付源码。

| 文件 | + | − |
|---|---:|---:|
| shared/types/index.ts | 15 | 0 |
| server/package.json | 1 | 1 |
| server/src/agent/tools/definitions.ts | 19 | 13 |
| server/src/agent/tools/executor.ts | 23 | 7 |
| server/src/validators/index.ts | 3 | 0 |
| server/src/services/proposals.ts | 50 | 0 |
| server/src/services/materialMapProposals.ts | 13 | 23 |
| server/src/services/materialReconciliationProposals.ts | 4 | 16 |
| server/src/services/organizedNoteProposals.ts | 13 | 23 |
| server/src/__tests__/v14ProposalUnification.test.ts | 298 | 0 |
| **源码/测试合计** | **439** | **83** |

文档产物另列：本 `report.md`、`validation.json`、`changes.json`，以及原工单末尾的停线 `## Result`。无原始日志、构建产物或凭据入档。

## 5. 未做项与后续

- **未完成验收、未翻 done**；HQ 先裁 shared 运行时路径，修正后须重跑受影响验证，尤其裸 Node 产物加载。
- 未修既有文档索引、Python/MinerU 环境；git/secrets 仍归 HQ。
- 未增加 board_arrangement/note_patch、新 UI、过渡提案面、挂载期 API、判断域写入或现型 data 契约；未修改机关本体、依赖、权限与 agent 操作指令。
- 零 git 命令、零 `.git` 访问、零 commit；未读取 `.env` key 值或用户库。
- 真实 provider、真实用户数据、浏览器主观体验未测；本单新增链路证据为隔离 API 级，未把它描述为 UI 验收。
