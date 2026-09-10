> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-06(TD-6 老债,证据行号在案);修二原子仪式端点=先例;Henry 过夜清债令⑥
> **单号**: 13.5 · B7 · 文本保存的服务端原子性(TD-6 清偿)

# 13.5 B7 · 原子文本保存

**使命**:正文+批注+板文字引用的保存获得**服务端事务边界**——"正文存了、批注没存上"的半成品态灭绝。B4 的客户端失败语义(留栈/重试)在其上直接受益:整体失败=干净失败。

## 零 · HQ 已裁(⛔复议;细节侦察申报后裁量)

1. **现物侦察先行**:annotation/正文/板范围三条分离保存链的服务端入口与事务现状,申报后动工;
2. **原子复合端点**:新 server 端点一次接收 {block 内容更新(五字段/flow)+ annotation truths 变更集 + board text-range 变更集},**单 DB 事务全有或全无**(修二 ceremony-note 端点同型);空变更集合法(只存正文也走它);
3. **OCC 条件写**:复合请求带 base revision(现物有合适字段则复用,无则加列走 migration 按账+保全测试,申报);不匹配→**409 明码**(stale revision,报当前 revision);⛔静默覆盖;
4. **客户端切换**:文本编辑保存链(B4 的保存正门)切到复合端点;分离旧端点保留(其他消费者不动);B4 失败语义回归验证(整体失败=整体留栈,部分成功分支应消失);
5. ⛔改退役闸/只读投影闸(照过);⛔改 B4 历史语义;⛔动板面(boards)自己的保存;⛔宣称覆盖本单以外的写路径(generic object/placement 不在射程,候后续)。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;server 定向(noteBlocks/annotations/boardTextRanges/lifecycle)+client 全库整跑⛔过滤;
- 冒烟五条:①复合保存中途注入失败(批注校验拒)→**整体回滚**,库中正文/批注/板范围逐字段保持原值(修前断言现状红:分离链可留半成品);②OCC:旧 revision 第二写→409 明码,库=第一次结果;③成功路径:三资源单事务落库,响应带新 revision,客户端状态同步;④B4 失败语义回归:复合失败→entry 留栈→重试成功→undo 正常;⑤既有分离端点消费者回归+server 定向+client 全库。

## 二 · Result 格式

`## Result`:现物申报 + numstat + 五冒烟逐条 + migration 申报(若有)+ 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触(内存库合成);⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

> **From**: codex(builder) · **日期**: 2026-09-10 · **施工**: done，待 HQ 复核/放行。无 stage / commit / push。
> **开工 HEAD**: `1788645e24560da71b3719d0c937ad729d33b112`，分支 `fable/v2-bn12-exoskeleton`。
> **判定边界**: 本单实现、类型检查、构建与新增冒烟完成；不宣称全门禁全绿（旧 Canvas 25 项基线失败、既有文档 INDEX 过期，详见下文）。

### 现物申报与落地

动工前已在会话先行申报，随后先跑修前红，再改实现。仓根有 CodeGraph 索引，但环境无 CLI/MCP；`rg` 也不可用，使用限定源码/权威文档路径的 PowerShell 检索。

- 原正文入口：`PUT /api/note-blocks/:id`，直接 UPDATE，未与其他资源共用事务；原批注入口：`PUT /api/annotation-truths/by-note/:noteId`，全 note replacement，自有事务；原板范围入口：`PUT /api/boards/text-ranges/by-note/:noteId`，另一笔 caller-owned transaction。三者可形成半提交。
- `boardCeremonyNote.ts` 的外层事务是同型先例。`notes/note_blocks` 无合适 revision，`updated_at` 精度/写入纪律不足以承担 OCC，故按 §零③新增 063。
- 新入口 `PUT /api/note-blocks/:id/text-save` 接收 `{note_id, base_revision, block, annotations:{range_updates}, text_ranges}`。block 接收五字段 `block_type/title/content_json/plain_text/metadata`，flow 在 content_json；批注和板范围空变更集合法。单 DB 事务内检查 revision、条件 UPDATE、更新批注 range、更新板文字范围、更新时间，并返回 `{block, annotations, text_ranges, revision}`。不匹配返回 HTTP 409 / `stale_revision` / `details.current_revision`。
- 批注变更集为 `[{annotation_id, range}]`：只更新已有、属于目标 block 的 range 身份；不重建独立删除的 range，不全量覆盖同 note 其他 range、标签和父子关系。板范围沿用既有补丁服务；已独立删除的范围保持删除，客户端把返回集合中的缺席视为删除确认。
- 原正文 PUT 抽取为共用 `noteBlockContent` 服务，保留原验证/模板合并/生命周期语义，并递增 revision；原批注/板范围端点保留。只读投影及 Canvas 退役闸实现、板面自己的保存代码未修改。
- 客户端 B4 typing/structural、模板转换、B6 文档各 block 保存门均切复合请求，删除正文后第二次批注/板范围写入及半成功分支。失败保留三资源恢复快照与首发 revision；同 generation 重新加载不会为失败 entry 换 base。成功后 undo/redo 使用确认水位，raw 保存成功也推进该水位。
- 后续 B 正文包含失败 A 的编辑时，先按 A 冻结快照与原 revision 清偿 A；A 仍失败则 B 不发布。保留 A/B 历史 entry 和撤销顺序，不读取更晚 C 草稿来拼 B 请求。B6 跨 block 仍保留逐 block 保存进度，不宣称整份文档跨 block 原子性。

### numstat

全单 **26 文件，+1141 / −231**（含本回执）。源码/测试 **25 文件，+1057 / −230**。tracked 使用 `git diff --numstat`；新增文件按完整文件 +N/−0 计入，未用 staging 获取统计。开工已有的配置、审计与会议记录 untracked 文件未改动。

| + | − | 文件 |
|---:|---:|---|
| 8 | 10 | `client/src/pages/Boards/BoardNoteModal.rangeSession.test.tsx` |
| 36 | 0 | `client/src/pages/Notes/canvasEngine/atomicTextSaveRepository.ts` |
| 16 | 1 | `client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.ts` |
| 8 | 0 | `client/src/pages/Notes/canvasEngine/draftBlockPersistence.ts` |
| 248 | 11 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx` |
| 46 | 73 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts` |
| 4 | 2 | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.document.test.tsx` |
| 78 | 5 | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.rangeRecovery.test.tsx` |
| 42 | 18 | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.ts` |
| 1 | 0 | `client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts` |
| 5 | 0 | `server/src/__tests__/helpers/v13BoardsFixture.ts` |
| 242 | 0 | `server/src/__tests__/v13AtomicTextSave.test.ts` |
| 118 | 0 | `server/src/__tests__/v13AtomicTextSaveMigration.test.ts` |
| 7 | 2 | `server/src/__tests__/v2BlockRestoreDoor.test.ts` |
| 1 | 1 | `server/src/__tests__/v2CanvasPersistenceCutover.test.ts` |
| 1 | 1 | `server/src/__tests__/v2NoteBlockLifecycle.test.ts` |
| 1 | 1 | `server/src/__tests__/v2NoteFoundation.test.ts` |
| 1 | 1 | `server/src/__tests__/v2NotesLifecycle.test.ts` |
| 13 | 0 | `server/src/db/migrations/063_v13_atomic_text_save_revision.ts` |
| 2 | 1 | `server/src/db/schema.sql` |
| 14 | 103 | `server/src/routes/noteBlocks.ts` |
| 38 | 0 | `server/src/services/annotationTruths.ts` |
| 53 | 0 | `server/src/services/atomicTextSave.ts` |
| 73 | 0 | `server/src/services/noteBlockContent.ts` |
| 1 | 0 | `server/src/services/notes.ts` |
| 84 | 1 | `docs/agent-ops/handoffs/2026-09-10-v13-5-b7-atomic-text-save-order.md` |

### 五条冒烟

| 条目 | 结果与证据 |
|---|---|
| ① 修前红 → 修后回滚 | 修前仅新增测试、未改生产代码：真实旧正文 PUT 成功后批注重复 ID 拒绝，`deepEqual(snapshot,before)` **0 过 / 1 失败**，正文留新值而批注/板范围仍旧；日志 `.codex-tmp-b7-red.log`（当时仅 62 migrations）。修后对复合请求注入第二条批注 range 校验拒绝（已写正文和第一 range）以及板范围 UPDATE trigger 失败，notes、note_blocks、annotation_truths、annotation_ranges、board_text_ranges 全行逐字段与修前相等，包括 revision。旧分离行为改为常驻反例断言保留。 |
| ② OCC | 第一次复合保存成功；携旧 base 的第二次返回 409 明码及当前 revision，五表完全等于第一次结果。客户端另验 409 即使正文读回匹配仍留完整恢复与旧 base，以及同 generation blocks revision 上升后历史重试仍用首发 base。 |
| ③ 成功三资源 | 五字段实际更新（paragraph→heading、title、content_json/flow、plain_text、metadata），批注和板范围 offsets 同步，DB 与响应 revision 一致；空引用变更集仍走复合门。客户端专验只有一个真实复合请求、成功水位同步和已删板范围缺席确认。 |
| ④ B4 失败语义 | 真实 adapter + history 合成测试：复合拒绝→同 entry 留栈→完整重试成功→undo 使用新 revision 正常还原，无第二次批注/板范围请求。另验 A 失败后 B 保存的每次成功提交中正文切片与两组批注/板引用一致，undo B→undo A 顺序保留；模板/多 block 既有回归保留。 |
| ⑤ 分离消费者及前序回归 | 新 server 用例继续调用原三个 PUT 并断言落库；旧正文写使复合旧 revision 失效。server 九个指定整文件未过滤执行；client 全库 **978/978 tests、232/232 suites、0 skipped**，含 B4/B5/B6/B6b。server 的 25 项既有 Canvas 失败与隔离 HEAD 逐题吻合，未改退役闸消红。 |

### migration 申报

`063_v13_atomic_text_save_revision` 仅给 note_blocks 添加 `text_save_revision INTEGER NOT NULL DEFAULT 0 CHECK (text_save_revision >= 0)`，schema 同步；无删表、重建、旧字段回填或用户数据迁移执行。既有 `runMigrations` 自动发现、事务执行并记 `db_migrations`，未改 runner/启动机制。

保全 **2/2 PASS**：pre-063 合成历史库升级与 fresh 的列/索引/FK 收敛；历史正文、批注、范围、板/成员/事件和 placements 全字段保留；旧 block 只多 revision=0；重复 up 不重置已写 revision=7；真实 migration 账只新增 063 一次，第二次 runner 返回 0，历史账不变，FK 检查为空。所有数据库均 `:memory:`。五个旧定向 fixture 也切内存；K-2 单验新增 revision 后，仍逐字节比较全部旧响应字段。

### 验证记录

- 新 server 原子保存 **10/10** + migration **2/2 PASS**，`node --import tsx --test src/__tests__/v13AtomicTextSave.test.ts src/__tests__/v13AtomicTextSaveMigration.test.ts`，日志 `.codex-tmp-b7-atomic.log`。
- server 既有定向九整文件（均 `.test.ts`）：`v2NoteFoundation / v2NoteBlockLifecycle / v2NotesLifecycle / v2CanvasPersistenceCutover / v2BlockRestoreDoor / v13BoardTextRanges / v13BoardCeremonyNote / v13ItemRefBlocks / v13AtomicTextSaveMigration`；主套件 **109 项，最终合并 84 过 / 25 既有失败 / 0 skipped**。初轮 83/26 中 K-2 的新字段响应差异已补明确断言，修后该整文件 **4/4**。迁移 2 条已包含在 109 内，不重复相加。
- Canvas 基线：隔离 HEAD 产品源码，仅测试 fixture 改 `:memory:` 后整文件 **49 项，24 过 / 25 失败**；25 个失败题目与当前逐一相同。当前套件内 **8 条 AnnotationTruth 回归全过**。日志 `.codex-tmp/b7-server-validation/server-targeted.log`、`block-restore-final.log`、`head-canvas-baseline.log`；HEAD 副本保留于 `.codex-tmp/b7-baseline/`（依赖 junction）。
- client：`npm.cmd --prefix client run test:unit -- --reporter=json --outputFile=../.codex-tmp/b7-client-tests.json`，**978/978 PASS**；全库无过滤。日志 `.codex-tmp/b7-client-tests.log` 与 JSON。Vite/Vitest 通过既有 `COINCIDES_VALIDATION_ENV_DIR` 指向空目录 `.codex-tmp/b7-empty-env`。
- client build（`tsc -b && vite build`）、server build（含 `tsc`、manifest freshness/copy）均 exit 0；日志 `.codex-tmp/b7-client-build.log`、`.codex-tmp-b7-server-build.log`。构建既有 chunk/recursive schema 警告不影响退出码。
- runtime 获准子门：registry **5/5**、manifest **10/10**、parity tests **10/10**；manifest freshness、tool-face parity、server shared runtime import、canvas runtime boundary、三 shell、source experience、legacy shutdown、relation freshness、model contract **60 groups**、performance seed 均通过。
- `docs:check` 在本单写 Result 之前即报 `docs/agent-ops/INDEX.md` 过期；未改生成索引。单独执行 inventory 与 glossary check 均通过。最终标准 `git diff --check` 通过，index 无 staged diff。

### 未做与停线

未 stage/commit/push；未读取 .env 或 key 值，未扫描凭据；未接触用户库/用户资产，未启动应用对用户库执行 063。未新增安全类测试、未运行安全专项套件，既有获准套件均整跑而非过滤。`verify:v2-bn8-runtime` 尾部含明禁凭据扫描，故未整条运行；上列获准组成项已独立执行，不冒称整门通过。未做真实用户浏览器体感验收、外部部署或 HQ 二级复核。

停在 **builder 交付复核线**：25 项 Canvas 基线红与既有 INDEX 过期保留申报，不修改退役闸或其他不属本单的承重件。TD-6 仅申报本单文本保存入口的服务端原子性/OCC落实；generic object、placement、板面自身保存、独立旧引用 writer、工具面跨资源撤销均不在本次覆盖/销账射程，完整台账由 HQ 收口。请求已提交但响应丢失仍为结果未知，客户端保守留恢复与旧 revision，不以正文读回冒充复合成功。
