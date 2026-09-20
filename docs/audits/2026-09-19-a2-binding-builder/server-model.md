> **状态 (Status)**: active
> **层 (Layer)**: audit / builder evidence
> **日期 (Updated)**: 2026-09-19
> **权威 (Authoritative)**: 否；A2 工单与设计档为施工依据

# A2 笔记级装订设置：建模与 server 证据

数据库 migration 顺延 `078_v14_board_visuals` → `079_v14_note_binding`。新字段仅为 `notes.binding_settings_json TEXT DEFAULT NULL`，可空；不新建页表、不写页帧、不改 TextFlow。迁移对旧笔记不执行逐行 UPDATE；旧笔记、新笔记均保留 SQL NULL，由 client 的共享工厂在读时得到单默认段。迁移幂等测试以 UPDATE 触发器计数验证零回填。

| 层次 / 字段 | 数据形与范围 | 默认值 |
|---|---|---|
| DB `notes.binding_settings_json` | TEXT / NULL | NULL |
| 装订子资源 API `binding_settings` | `NoteBindingSettings` / null | null（隐式默认） |
| `version` | 字面量 1 | 1 |
| `enabled` | boolean，装订整体开关 | true（施工档） |
| `dropFolioOnCover` | boolean，封面档静默预留 | true；不创建封面页 |
| `sections` | 1–1000 个装订段 | 一段 |
| 段 `id` | 1–100 字符、非空、段内唯一 | `default` |
| 段 `startPage` | 1–999999 整数，1 基机械页序 | 1；首段恒 1，后段严格递增 |
| 段 `headerFooterEnabled` | boolean | true |
| 段 `pageNumber.enabled` | boolean | true |
| 段 `pageNumber.startAt` | 1–999999 整数 | 1 |
| 段 `pageNumber.format` | `arabic` / `roman-lower` / `roman-upper` | `arabic` |
| 段 `pageNumber.prefix` / `suffix` | 各 0–200 字符，数字占位 N 无删除字段 | 空串 / 空串 |
| 段 `pageNumber.slot` | 六槽键之一 | `footer-center` |
| 段 `slots` | 六个必有键：眉/脚 × 左/中/右 | 六槽均生成独立对象 |
| 槽 `text` | 0–2000 字符手填文案 | 空串 |
| 槽 `offsetX` / `offsetY` | 有限数，−1000…1000 | 0 / 0 |
| 槽 `style` | 可选属性覆写对象 | `{}`，继承皮 |
| 样式 `fontFamily` | 可选 `skin` / `serif` / `sans` / `mono` | 未设 |
| 样式 `fontSize` | 可选有限数 1…200 | 未设 |
| 样式 `fontWeight` | 可选整数 100…900 | 未设 |
| 样式 `colorToken` | 可选 `ink` / `ink-muted` / `accent` | 未设 |
| 样式 `italic` | 可选 boolean | 未设 |

段界形状仅存 `startPage`：当前段区间为 `[startPage, 下一段.startPage)`；末段延伸至重分页后的尾页。存储不含页数、段尾缓存或显示页码缓存。

人用接口 `GET /api/notes/:id/binding-settings` 返回 `{ binding_settings: 配置 | null }`；PUT 同路径接收同形 body，返回 `{ ...Note, binding_settings }`。通用 Note GET / list / PUT 保持原有响应形状，不泄漏原始 JSON 列；client 在载入时合并独立装订读响应。显式 null 恢复隐式默认。既有笔记标题 / metadata 保存不写装订列，因此不会回退装订设置。接口仿既有 `noteMetadata` 人用子资源，未修改 Agent 注册表、写门、能力清单或既有 create/update Note tool schema。

| 实施点 | 文件定位 |
|---|---|
| 六槽 / 字段 / 默认工厂 | `shared/types/noteBinding.ts:2`, `:10`, `:36`, `:46`, `:54`, `:67` |
| 唯一 SQL 字段与 migration | `server/src/db/migrations/079_v14_note_binding.ts:4`, `server/src/db/schema.sql:411` |
| 正常编辑参数校验与段界约束 | `server/src/validators/noteBinding.ts:22`, `:40`, `:61` |
| 解析 / 独立读 / 保存 | `server/src/services/noteBinding.ts:6`, `:15`, `:23` |
| 独立人用子资源 | `server/src/routes/noteBinding.ts:10` |
| 通用 Note 维持旧响应形状 | `server/src/services/noteHydration.ts:10` |
| 六项定向测试 | `server/src/__tests__/v14NoteBinding.test.ts` |

验证：六项新增功能测试通过；连同既有 Note foundation、原子文本迁移、纸皮、卡面封面回归，共 21 / 21 通过，0 跳过。`check:server-shared-runtime-import` 为 0 违规（278 产品文件、22 个 type-only shared 导入）；`check:test-wiring` 为 96 / 96 文件接线、0 排除。原始日志分别为 `.codex-tmp/a2-binding/server-targeted.log`、`server-runtime-import.log`、`server-test-wiring.log`。

正式 shared build 在 `shared/dist` 写出时遇 EPERM，server 正式类型检查因缺新声明文件随后报 TS6305；未改权限或门。另以任务临时 `tsconfig.server-check.json`，直接覆盖同一 server / shared 源码且 `noEmit`，类型检查通过，日志 `server-source-typecheck.log`。它是补充证据，不宣称替代正式 build。

server 主回归 `npm run test:v2` 覆盖 77 文件且零排除：首次报告 749 项、744 通过、5 失败、0 跳过。既有 wrapper 对三个 Node IPC 反序列化故障各重试一次，49 / 49、59 / 59、25 / 25 恢复；最终退出码仍为 1。余下失败为现有 Python 环境：`v2SourceMineruWiring` 找不到 `python.exe`（ENOENT），`v2SourceRegionCells` 引用旧 MinerU venv 的 Python 启动失败（code 101）。未修改源测试或外部环境；原始完整日志 `server-full.log`。

补跑主回归未覆盖的 19 个 server inventory 文件（`server-remaining-files.txt`），0 排除。初跑 193 项、183 通过、10 失败：5 项是本次曾把装订字段加入通用 Note 响应所致的严格形状回归，已采用上述独立 GET / PUT 修正；2 项 MCP artifact 测试调用正式 build，受 shared 声明文件缺失限制；3 项来自既有 BoardWave1 父/子测试：板删除回执新增 `0 stickies` 后旧断言未同步，后续重建未执行导致下一子项连锁失败。只读 `git show HEAD` 与 `git diff --name-only` 证实 `server/src/routes/boards.ts:188` 和 `server/src/__tests__/v13BoardWave1.test.ts:155` 两方在 HEAD 已有该不一致，且均无工作树修改；未改板域或放宽原测试。初跑日志 `server-remaining.log` 完整保留。

兼容修复后重跑 A2、MCP transport、Note lifecycle、Note list service 四文件，共 75 / 75 通过、0 失败、0 跳过、0 重试，退出码 0；五项 Note 形状回归全部恢复。原始日志 `server-contract-regression.log`。同时对最终 server/shared 源码再做临时 noEmit 检查，退出码 0。未宣称 server 全量已绿。

## 全量与复验的精确计数

| 执行阶段 | 文件范围 | TAP tests / pass / fail | 说明 |
|---|---:|---:|---|
| 正式 `test:v2` 主套件首次执行 | 77 | 749 / 744 / 5 | 其中 3 个是文件级 Node IPC 失败 |
| wrapper 对上述 3 文件各一次复验 | 3（重复范围） | 49 / 49 / 0；59 / 59 / 0；25 / 25 / 0 | 3 / 3 恢复；主套件最终退出仍为 1 |
| inventory 未覆盖文件补跑 | 19 | 193 / 183 / 10 | 包含 1 个父 test 的汇总失败，不能视为额外叶子 |
| A2 与 Note / MCP 合同修复复验 | 4（重复范围） | 75 / 75 / 0 | 修复补跑中的 5 个 Note 输出形状失败 |

77 + 19 = 96 个 inventory 文件均有执行尝试，零排除。上述重试 / 复验与原测试范围重叠，不能把各阶段 tests 或 pass 数直接相加当成唯一用例总数。

最终剩余 **4 个测试文件、6 个未通过执行节点**：4 个已运行叶子测试 + 1 个模块加载失败 + 1 个父测试初始化失败。原始 TAP 仍有 7 条未恢复的红行，其中 BoardWave1 父 test 的 `subtestsFailed` 是两个子项的汇总，去重后为 6 个节点。

| 未通过执行节点（精确名称） | 源码定位 | 分类与原因 | 原始证据 |
|---|---|---|---|
| `src/__tests__/v2SourceMineruWiring.test.ts` | 文件第 60 行 | 模块加载失败：`spawnSync python.exe ENOENT`。其 5 个顶层 test 尚未注册；不能按 5 项已执行失败统计 | `server-full.log:41276`, `:41301` |
| `V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable` | `v2SourceRegionCells.test.ts:183`；调用失败在 `:203` | 父 test 初始化失败：既有 MinerU Python 无法启动（code 101）；6 个子 test 未到达 | `server-full.log:42105` |
| `K-6 build copies byte-identical manifest and compiled loader starts without docs from arbitrary cwd` | `v2McpArtifact.test.ts:56` | 叶子构建测试：正式 build 缺少 shared 新声明文件，TS6305 | `server-remaining.log:1145` |
| `K-7 build artifact retains internal, test, and public __ entries byte-for-byte` | `v2McpArtifact.test.ts:114` | 叶子构建测试：同上 | `server-remaining.log:1261` |
| `A4 delete counts owned rows, retains soul/content and records receipt before reopening same soul` | `v13BoardWave1.test.ts:129`；断言 `:155` | 叶子断言：HEAD 回执包含 `0 stickies`，HEAD 旧断言缺该字段 | `server-remaining.log:789` |
| `A5 trashed note stays mounted as unavailable and restores to available` | `v13BoardWave1.test.ts:163`；失败 `:165` | 叶子连锁失败：A4 断言打断后续重建，读取 undefined.id | `server-remaining.log:816` |

不另计 `v13BoardWave1.test.ts:47` 的 `13.4 wave 1 synthetic HTTP lifecycle smoke` 父 test（`server-remaining.log:834`）；它只报告上述两个子项失败。各阶段日志的 `skipped = 0` 不表示模块加载失败后的未注册测试、或父初始化失败后的子测试已执行。
