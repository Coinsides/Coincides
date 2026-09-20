> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；测试与实现收据，放行归 HQ

# B3 服务端往返与外观表兼容

## 家具样式存取

`server/src/__tests__/v14ParagraphFurniture.test.ts:138` 逐一验证两种段落样式：

- 引文：`display_overrides_json.paragraph_furniture_v1 = {variant:'quote',source:'《宋史·食货志》'}`。
- 提示框：同键 `{variant:'callout',label:'注'}`，随后改为「冷知识」。

每种都亲跑现役 `POST /notes/:id/blocks` → 关闭/重开 SQLite → `GET /notes/:id` 和 `GET /notes/:id/blocks` → `PUT /notes/:id/block-placements/:placementId` 改出处/标签 → 重开 → 删除仅家具键后整份 overrides 保存 → 再重开。原有其他 override 完整保留。每阶段核对 `note_blocks` 整行字节字段（含 content_json、plain_text、revision、metadata 与时间戳）完全不变、TextFlow 不变、block 仍为 paragraph、placement 的 id/note/block/parent/order/display_mode/created_at 不变。

考古确认 `GET /notes/:id` 本身仅返回笔记 metadata，正文与 placement 读面是 `GET /notes/:id/blocks`，测试如实分别读取。产品服务端家具存法不需新分支、新列或新真相表。

## 表头与绢本套装

`server/src/__tests__/v14ParagraphFurniture.test.ts:105` 亲跑 `PUT /notes/:id {skin:{preset:'silk',components:{headerRule:'hidden',headerRuleLength:'short',headerRuleStyle:'dashed'}}}`，重开后值保留；再用现役 `/skin-suites` 创建完整绢本套装、PATCH 为 visible/full/dotted、逐次重开，身份与其他 token 不变。

初次正向测试触发 migration 072 的四值 CHECK，500 而非 201，证据 `.codex-tmp/b3-furniture/paragraph-server-targeted-suite.log:85`。修复为独立 migration 080：`server/src/db/migrations/080_v14_silk_skin_material.ts:9`。历史 071/072 零修改。只替换既有 `skin_suites.material_preset` CHECK 的枚举，原表声明其他字节、七列、所有旧行/rowid、外键与显式索引/trigger 保留；没有表外键指向该表，临时替换表迁移后消失。

迁移回归在 `server/src/__tests__/v14ParagraphFurniture.test.ts:27`：预置四既有谱系与 null、非连续 rowid，迁移两遍后逐行/列/索引/外键相等，schema 唯一差异为添加 silk，之后插入 silk 成功；数据库仍只有原 users 与 skin_suites 两逻辑表。

最终定向运行 **4/4 通过、零跳过**，日志 `.codex-tmp/b3-furniture/paragraph-server-targeted-migration.log`。新文件仅登记进 `server/package.json` 的既有 `test:v2` 列表；没有改工具注册表、Agent 机关、TextFlow schema 或坐标契约。`check-test-wiring` 为 **101 文件/101 wired/0 exempted/0 unwired**，日志 `paragraph-server-wiring-final.log`。

## 服务端全量：已执行范围与环境限制

先读取真实 package 脚本：`npm.cmd run test:v2` 包含 82 个服务端测试文件，`server/src` 与 `server/scripts` 实际清点共 101 个。其余 19 个走既有 `scripts/run-server-test-suite.mjs` 补跑，没有排除文件；完整清单在 `.codex-tmp/b3-furniture/server-test-inventory.json`。

080 落地后的最终 `test:v2` 日志为 `.codex-tmp/b3-furniture/server-full-test-v2-final.log`：主批 **761 项，757 通过、4 失败、0 skipped/0 cancelled**。两个失败是 Node IPC 反序列化异常；既有 wrapper 自动分别单次重跑 `v2MaterialLibrary.test.ts`（**59/59**）与 `v2NoteBlockLifecycle.test.ts`（**25/25**），都恢复。最终总体仍为 **FAIL**，剩余两项是当前运行环境的 Python 启动问题：

- `v2SourceMineruWiring.test.ts:60` 顶层 `execFileSync('python.exe',...)` 为 **ENOENT**；当前进程 PATH 无 python.exe。
- `v2SourceRegionCells.test.ts` 的 MinerU 原生解析回归启动既有 `.venv` 时，uv Python `C:\Users\70208\AppData\Roaming\uv\python\cpython-3.12.11-windows-x86_64-none\python.exe` 无法创建进程。该文件存在，但直接启动得到 **Access denied**。未安装依赖、未复制解释器、未绕过权限、未更改这些测试。

第一轮 `test:v2` 运行日志另保留 `server-full-test-v2.log`：主批 816 项（813/3），一个 IPC 文件自动 59/59 恢复，同样剩上述 Python 两红。这轮发生在新增表头/套装测试与080之前，不充当最终代码通过证明。

19 文件补集首轮在 `server/scripts/agent-eval/harness.test.ts` 的 14 项均报告 PASS 后持续无后续输出；确认持有的 exec session **6408** 后以 Ctrl+C 终止，仅终止本次自建运行。完整19文件以 Node `--test-timeout=120000` 再跑，日志 `server-full-supplemental-final.log`；首轮与终止说明分别留 `server-full-supplemental.log`、`server-supplemental-timeout-note.log`。最终输出明确：先前停在按文件顺序输出的位置，实际超时文件是 **`server/scripts/v13WildernessExecute.test.ts`**，不是 Agent harness；后者14项均通过。没有修改这些既有测试或坐标/Agent实现。

补集最终 **167 项，164 通过、2 失败、1 cancelled、0 skipped**，耗时120秒，零IPC重跑。cancelled 为 Wilderness 文件超时；两失败均为 `v2McpArtifact.test.ts` 内 build：本次新测试使用 `Object.hasOwn` 超出 server ES2020 lib，以及 server项目引用读取了旧 `shared/dist/types/skin.d.ts`（时间戳09-12，仍为四预设）。已修本次测试为 `Object.prototype.hasOwnProperty.call`，并运行既有 TypeScript `tsc -b shared` 刷新生成声明，零构建配置变更。

修正后的 `node --import tsx --test src/__tests__/v14ParagraphFurniture.test.ts src/__tests__/v2McpArtifact.test.ts` 为 **6/6 PASS、0 failed/cancelled/skipped**：四条B3回归与两条McpArtifact均通过，后两条分别完成一次完整 server build。日志 `.codex-tmp/b3-furniture/server-build-targeted-recheck.log`。本任务引入的编译错误已经消除；Wilderness 随后在完整独立预算下27/27通过（见下文），目前未恢复的全量限制仅为 **Python两红**，不将定向重跑伪称全量已绿。

本记录不宣称完整 runtime 门或 server 全量已绿。git/secrets 两组件仍留 HQ；未运行 git 写操作。

## Wilderness 超时只读定位补充

按 HQ 要求只读检查，未修改既有坐标代码、测试或 SQL。`v13WildernessExecute.test.ts` 是内存 SQLite 合成数据与本地临时文件回归，没有外部服务或真实数据库等待路径。静态共21处 test 声明，其中两个 stage 循环展开后共27条；文件内有19处 execute 和9处 rollback 调用点，另有循环与CLI路径复用。每次 execute/rollback 都在前后调用同步 `CENSUS_SQL`（`wildernessExecutor/executor.ts:47`、`:150`、`:235`、`:251`、`:276`）。

唯一一次受55秒上限保护的诊断，只调用现役 fixture 与未改SQL，在只读 SQLite 连接上逐阶段计时：fixture **11ms**（299008 bytes），90 placements/88 objects/42 mounts，SQLite **3.49.2**；20,425字符 census SQL 的 prepare **49ms**，同步 get **1601ms**，输出332697字符。全诊断 **1824ms 正常退出0**，没有超时或环境修复。原始日志 `.codex-tmp/b3-furniture/wilderness-readonly-probe.log`；脚本仅在同临时目录，未新增产品测试。

定位结论：**未发现外部服务等待或 fixture 生成阻塞；可直接观察到重复完整SQLite普查成本较高，结合多轮执行/回滚，是120秒整文件超时的合理解释。** 该诊断阶段的结论是基于单次查询计时与静态调用链的推断，完整独立复核随后完成如下。

## Wilderness 完整独立复核

HQ 追加授权单次10分钟预算，保持现役测试文件、fixture、SQL 与实现零修改，cwd 为 `server`，执行 `node --import tsx --test --test-timeout=600000 scripts/v13WildernessExecute.test.ts`。每轮工具等待不超过50秒，使用同一运行，没有新增测试或排除用例。

最终 **27/27 PASS、0 failed、0 cancelled、0 skipped**，进程退出 **0**，总耗时 **459059.0759ms**（约7分39秒）。原始日志 `.codex-tmp/b3-furniture/wilderness-isolated-final.log`。其中原文件CLI全链路用例耗时63224ms，两用户全范围迁移/恢复用例47425ms，第二用户失败回滚用例56239ms，旧journal回滚用例24849ms，支持先前累积执行成本的判断。此前120秒取消是测试预算不足，现已由完整27条通过消除；不再列为未通过项。服务端剩余未通过项仍是前述两处 Python 环境启动失败。
