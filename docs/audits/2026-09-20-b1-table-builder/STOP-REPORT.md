> **状态 (Status)**: stopped — 工单冲突，未实施
> **层 (Layer)**: 审计 / builder 停线证据
> **日期**: 2026-09-20
> **工单**: `docs/agent-ops/handoffs/2026-09-20-v14-b1-table-block-order.md`
> **署名**: Codex builder；主线独立核对服务端考古结论

# B1 表格块 v1：read_note 结构化输出与注册表禁区冲突

## 1. 停线判据与证据

工单 §一.3（第 15 行）要求「Agent 读面看到结构化表」，§四.4（第 35 行）同时禁止触碰「注册表/Agent 机关」，并要求「冲突停线举证」。本轮考古在产品代码修改前发现下列实际调用链：

| 现物 | 行号 | 事实 |
|---|---|---|
| `server/src/services/agentReadSurfaces.ts` | 78–112 | `projectNoteBlock` 投影块身份、text、TextFlow text_units，以及 image 的 media / item_ref；没有 table 或通用 content_json 输出槽。 |
| `server/src/toolFace/registry.ts` | 833–845 | `readNoteOutputSchema` 的 blocks[] 只允许 id、placement_id、kind、role、text、text_units、media、item_ref；第 842 行对单块调用 `.strict()`。media 子对象第 840 行也为严格资产身份结构。 |
| `server/src/toolFace/registry.ts` | 895–899 | 现役 `read_note` 注册项的 `output_schema` 绑定上述 schema。 |
| `server/src/agent/tools/executor.ts` | 39–49 | 读取注册项，第 44 行调用 `readNoteForAgent`，第 49 行执行 `readTool.output_schema.parse(result)` 后才 JSON.stringify 返回。 |

因此，只在读取服务增加 `{ table: { caption?, headers, rows } }` 会被现役输出校验拒绝；这是实际执行边界，不是未使用的类型声明。保留 caption、headers、rows 的结构化读面需要扩展注册表输出 schema，落入本工单禁区。把表序列化后藏进 `text` 不等于要求的结构化表；借用既有 `text_units` 的 TextFlow 语义也不是本单允许的表格投影。

**处置：停止产品实施，追加工单 Result，不自行豁免注册表禁区。** 待工单消解该冲突后才能继续。最小需裁定范围是 `read_note` 既有输出 schema 的 table 扩展及相应契约产物；本轮没有实施该扩展，也没有新增动词或改接执行器。

证据性质为静态源码核对；没有执行动态探针或新增测试。

## 2. 停线前考古所得（不代表完成全链审计）

| 环节 | 文件与行号 | 已核对现状 |
|---|---|---|
| image 块型 | `server/src/validators/index.ts:51–65` | 应用现役 image 对应 block_type `media`；枚举没有 `table`。 |
| image payload | `server/src/validators/index.ts:752–757` | 图身份住 metadata.media：asset_id、naturalWidth、naturalHeight、alt?。 |
| create 验证 | `server/src/validators/index.ts:759–782`；`server/src/routes/notes.ts:262–289` | create schema 后分 client-create 与普通创建；media 有专属 metadata 校验。 |
| 资产验证 | `server/src/services/mediaBlocks.ts:16–35` | 校验 image 资产存在并属于当前用户。 |
| update 验证 | `server/src/services/noteBlockContent.ts:31–62` | update schema 后与存量类型/内容/metadata 合成再做专属检查；不能仅给 create 加表格约束。 |
| hydration | `server/src/services/noteHydration.ts:21–28`；`server/src/services/noteBlockContent.ts:18–19` | content_json 按泛型 JSON 还原，现有形状可保留嵌套数组；尚未实现表格校验与投影。 |
| image 高度 | `client/src/pages/Notes/canvasEngine/measurementService.ts:94–104` | media 优先使用存储高度，否则按自然图像比例估高。 |
| A1 分类入口 | `client/src/pages/Notes/canvasEngine/notePageFlowService.ts:13–44` | 第 22 行显式将 media 分类为不可切片媒体；table 尚无对应分支。 |
| A1 整块规则 | `client/src/pages/Notes/canvasEngine/documentPageFlowService.ts:213–240` | 非文字块放不下且当前页已有内容则整块下移；保留整体高度；超高报告 indivisible_block_exceeds_page 和高度差。 |
| 纸内检索入口 | `client/src/pages/Notes/canvasEngine/noteNavigationSearch.ts:41–57`、`:68–75` | loadedBlockText 供现役纸内检索；当前排除 media/item_ref，其他类型读取草稿或 textFromContent。未来 table 需在此链提供 caption+headers+rows 的纯文本投影，尚未接线。 |

分页/渲染考古到冲突停止；未完成 Overview、打印、导出、撤销与全量创建入口的完整接线审计。未改 TextFlow 真相 schema、page_frame_local 九条契约、Relation、写门、注册表、Agent 机关或依赖。

## 3. 交付与验证申报

- 产品代码新增/修改：**0**；新增测试：**0**；执行测试：**0**。没有产品功能或回归通过结论。
- 根 `verify:v2-bn8-runtime` 为 25 个顶层组件；排除 git 检查、secrets 扫描后为 **非 git/secrets 的 23 组件**。因停线，本轮 **0/23 执行**；没有宣称完整门已绿，两保留组件仍留 HQ。
- client 全库 / server 全量：均未运行。`server` 的 `test:v2` 是显式文件清单，后续不得单凭它宣称 server 全量；现役专门测试入口还需纳入覆盖核对。
- payload：只确认工单指定 `{ caption?: string, headers: string[], rows: string[][] }`；行列及总字符预算未实施、未验证，不将建议上限冒充落地约束。
- 说明书：`current-state/app-operating-manual.md` 未修改；功能未交付，不写入可用声明。
- 未做：表格创建/编辑、增删行列、表头开关、CSV/TSV、撤销、token 渲染、分页接线、宽表打印裁切、Overview/导出、检索命中、9×3「熙宁新法表」夹具及验收。
- git 写操作 / commit：**0**。只读 git 用于确认工作树；开工已存在的未跟踪文件未触碰。工单原状态头保留，不标记 done。

## 4. 原始证据索引

原始日志保留在 `.codex-tmp/b1-table/`：

- `conflict-source-lines.log`：工单要求、读取投影、严格输出 schema、执行器带行号摘录。
- `archaeology-server-lines.log`：现役 image 模型、验证与 hydration、read_note 注册绑定摘录。
- `archaeology-client-lines.log`：media 高度、A1 整块分页、纸内检索摘录。
- `gate-components.log`：根 runtime gate 的 25 个组件原序列。
- `tool-availability.log`：本次环境中 CodeGraph / rg 命令可用性记录；`.codegraph/` 存在，已先尝试 CodeGraph，命令不在 PATH，工具目录亦未发现 CodeGraph，随后使用 PowerShell 只读检索。

蒸馏结论及必要摘录已在本档内保留；原始日志不是本结论的唯一副本。
