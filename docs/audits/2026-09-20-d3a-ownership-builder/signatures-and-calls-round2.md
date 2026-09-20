> **状态 (Status)**: active
> **层 (Layer)**: D3a builder 二轮施工证据
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 实测与静态取证；非 HQ 验收

# D3a 二轮签名与调用点对照

依据 active [签名裁定稿](../../agent-ops/analysis/2026-09-13-ownership-signature-ruling-draft.md) §裁定稿及 [工单补遗一](../../agent-ops/handoffs/2026-09-20-v14-d3a-ownership-convergence-order.md)。一轮普查原件保持；本件复用其16份/14文件/55调用基线。

普查：一轮1376→二轮1381个自有JS/TS文件。射程为git只读文件清单与六源根物理枚举并集，排除依赖/生成物/临时/外部研究工具副本；CodeGraph CLI/MCP与rg不可用，使用已装TypeScript AST。增量闸独立扫六源根1266文件；两种扫描射程不同，现物定义集合一致。

实现：16份/14文件→**7 get + 1 find（8份/7文件）**，另保留改名后的1份hydrated读取（合计9份/8文件）。去重7份：5 course→1、4 note→1；13份原实现被提取/改签名/改名/扩为完整行，3份原已合格实现原样保留。全部资源读取均在service层。

## 16 份实现逐项对照

| 原位置 / 签名 | 现位置 / 签名 | 处置 |
|---|---|---|
| `server/src/routes/noteBlocks.ts:14`<br>`getOwnedBlock(blockId: string, userId: string): { id: string; course_id: string; block_type: string; content_json: string; plain_text: string \| null; metadata: string; source_kind: string }` | `server/src/services/noteBlockOwnership.ts:22`<br>`getOwnedBlock(db: Database.Database, userId: string, blockId: string): OwnedNoteBlockRow` | 提至资源叶子；SELECT *；标准位序 |
| `server/src/routes/notes.ts:62`<br>`getOwnedCourse(courseId: string, userId: string): { id: string }` | `server/src/services/courseOwnership.ts:19`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): OwnedCourseRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/routes/notes.ts:70`<br>`getOwnedNote(noteId: string, userId: string): { id: string; course_id: string; note_class: string; status: string; page_format: string }` | `server/src/services/noteOwnership.ts:22`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNoteRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/routes/projections.ts:34`<br>`getOwnedCourse(courseId: string, userId: string): void` | `server/src/services/courseOwnership.ts:19`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): OwnedCourseRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/annotationTruths.ts:238`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote` | `server/src/services/noteOwnership.ts:22`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNoteRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/canvasAssets.ts:62`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote` | `server/src/services/noteOwnership.ts:22`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNoteRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/canvasObjects.ts:272`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote` | `server/src/services/noteOwnership.ts:22`<br>`getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNoteRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/courseMaterials.ts:263`<br>`getOwnedSourceMaterial(db: Database.Database, userId: string, sourceMaterialId: string): (inferred)` | `server/src/services/courseMaterials.ts:268`<br>`findOwnedSourceMaterial(db: Database.Database, userId: string, sourceMaterialId: string): SourceMaterialRow \| undefined` | 改 find；原 undefined 保持，无现役404消费者，因此不建空置get版 |
| `server/src/services/items.ts:236`<br>`getOwnedItemRow(db: Database.Database, userId: string, itemId: string): ItemRow` | `server/src/services/items.ts:236`<br>`getOwnedItemRow(db: Database.Database, userId: string, itemId: string): ItemRow` | 已合格，原样保留 |
| `server/src/services/items.ts:548`<br>`getOwnedContentGroup(db: Database.Database, userId: string, groupId: string): (inferred)` | `server/src/services/items.ts:580`<br>`getOwnedContentGroup(db: Database.Database, userId: string, groupId: string): OwnedContentGroupRow` | SELECT *；保留 status != deleted 和原404 |
| `server/src/services/materialMapProposals.ts:53`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): void` | `server/src/services/courseOwnership.ts:19`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): OwnedCourseRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/materialReconciliationProposals.ts:231`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): void` | `server/src/services/courseOwnership.ts:19`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): OwnedCourseRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/organizedNoteProposals.ts:82`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): { id: string; name: string }` | `server/src/services/courseOwnership.ts:19`<br>`getOwnedCourse(db: Database.Database, userId: string, courseId: string): OwnedCourseRow` | 合并至资源叶子；SELECT *；原404消息保持 |
| `server/src/services/paletteColors.ts:8`<br>`getOwnedPaletteColor(db: Database.Database, userId: string, colorId: string): PaletteColor` | `server/src/services/paletteColors.ts:8`<br>`getOwnedPaletteColor(db: Database.Database, userId: string, colorId: string): PaletteColor` | 已合格，原样保留 |
| `server/src/services/purposes.ts:72`<br>`getOwnedPurposeRow(db: Database.Database, userId: string, purposeId: string): PurposeRow` | `server/src/services/purposes.ts:72`<br>`getOwnedPurposeRow(db: Database.Database, userId: string, purposeId: string): PurposeRow` | 已合格，原样保留 |
| `server/src/services/skinSuites.ts:25`<br>`getOwnedSkinSuite(db: Database.Database, userId: string, suiteId: string): SkinSuite` | `server/src/services/skinSuites.ts:25`<br>`loadOwnedSkinSuiteHydrated(db: Database.Database, userId: string, suiteId: string): SkinSuite` | 改 loadOwnedSkinSuiteHydrated；hydrate/404/业务码保持 |

## 全部 55 处调用

55→55（49生产+6既有测试，18文件）；**23处表达式改动**（20生产+3测试），32处表达式原样。共享course/note消费23处，其中11处改参、12处仅换定义来源。find共4处；hydrated共7处（4生产+3测试）。新增契约测试动态执行发现的函数，不新增命名直调调用点。

| # | 原位置及调用 | 现位置及调用 | 表达式变化 |
|---|---|---|---|
| 1 | `server/src/__tests__/v14PaletteColors.test.ts:85`<br>`getOwnedPaletteColor(db, userId, own.id)` | `server/src/__tests__/v14PaletteColors.test.ts:85`<br>`getOwnedPaletteColor(db, userId, own.id)` | 原样（定义来源可能合并） |
| 2 | `server/src/__tests__/v14PaletteColors.test.ts:159`<br>`getOwnedPaletteColor(f.db, userId, color.id)` | `server/src/__tests__/v14PaletteColors.test.ts:159`<br>`getOwnedPaletteColor(f.db, userId, color.id)` | 原样（定义来源可能合并） |
| 3 | `server/src/__tests__/v14PaletteColors.test.ts:182`<br>`getOwnedPaletteColor(db, userId, color.id)` | `server/src/__tests__/v14PaletteColors.test.ts:182`<br>`getOwnedPaletteColor(db, userId, color.id)` | 原样（定义来源可能合并） |
| 4 | `server/src/__tests__/v14SkinSuites.test.ts:101`<br>`getOwnedSkinSuite(db, userId, colorId)` | `server/src/__tests__/v14SkinSuites.test.ts:101`<br>`loadOwnedSkinSuiteHydrated(db, userId, colorId)` | 机械更新 |
| 5 | `server/src/__tests__/v14SkinSuites.test.ts:178`<br>`getOwnedSkinSuite(db, userId, suite.id)` | `server/src/__tests__/v14SkinSuites.test.ts:178`<br>`loadOwnedSkinSuiteHydrated(db, userId, suite.id)` | 机械更新 |
| 6 | `server/src/__tests__/v14SkinSuites.test.ts:250`<br>`getOwnedSkinSuite(db, userId, suite.id)` | `server/src/__tests__/v14SkinSuites.test.ts:250`<br>`loadOwnedSkinSuiteHydrated(db, userId, suite.id)` | 机械更新 |
| 7 | `server/src/routes/noteBlocks.ts:64`<br>`getOwnedBlock(blockId, req.userId!)` | `server/src/routes/noteBlocks.ts:56`<br>`getOwnedBlock(getDb(), req.userId!, blockId)` | 机械更新 |
| 8 | `server/src/routes/notes.ts:111`<br>`getOwnedCourse(data.course_id, req.userId!)` | `server/src/routes/notes.ts:88`<br>`getOwnedCourse(db, req.userId!, data.course_id)` | 机械更新 |
| 9 | `server/src/routes/notes.ts:159`<br>`getOwnedNote(noteId, req.userId!)` | `server/src/routes/notes.ts:136`<br>`getOwnedNote(getDb(), req.userId!, noteId)` | 机械更新 |
| 10 | `server/src/routes/notes.ts:260`<br>`getOwnedNote(noteId, req.userId!)` | `server/src/routes/notes.ts:237`<br>`getOwnedNote(getDb(), req.userId!, noteId)` | 机械更新 |
| 11 | `server/src/routes/notes.ts:384`<br>`getOwnedNote(noteId, req.userId!)` | `server/src/routes/notes.ts:361`<br>`getOwnedNote(getDb(), req.userId!, noteId)` | 机械更新 |
| 12 | `server/src/routes/notes.ts:428`<br>`getOwnedNote(noteId, req.userId!)` | `server/src/routes/notes.ts:405`<br>`getOwnedNote(getDb(), req.userId!, noteId)` | 机械更新 |
| 13 | `server/src/routes/notes.ts:456`<br>`getOwnedNote(noteId, req.userId!)` | `server/src/routes/notes.ts:433`<br>`getOwnedNote(getDb(), req.userId!, noteId)` | 机械更新 |
| 14 | `server/src/routes/paletteColors.ts:30`<br>`getOwnedPaletteColor(db, req.userId!, id)` | `server/src/routes/paletteColors.ts:30`<br>`getOwnedPaletteColor(db, req.userId!, id)` | 原样（定义来源可能合并） |
| 15 | `server/src/routes/projections.ts:91`<br>`getOwnedCourse(courseId, req.userId!)` | `server/src/routes/projections.ts:85`<br>`getOwnedCourse(getDb(), req.userId!, courseId)` | 机械更新 |
| 16 | `server/src/routes/projections.ts:110`<br>`getOwnedCourse(data.course_id, req.userId!)` | `server/src/routes/projections.ts:104`<br>`getOwnedCourse(getDb(), req.userId!, data.course_id)` | 机械更新 |
| 17 | `server/src/services/annotationTruths.ts:327`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/annotationTruths.ts:316`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 18 | `server/src/services/annotationTruths.ts:377`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/annotationTruths.ts:366`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 19 | `server/src/services/canvasAssets.ts:118`<br>`getOwnedNote(db, userId, input.noteId)` | `server/src/services/canvasAssets.ts:106`<br>`getOwnedNote(db, userId, input.noteId)` | 原样（定义来源可能合并） |
| 20 | `server/src/services/canvasObjects.ts:1663`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/canvasObjects.ts:1651`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 21 | `server/src/services/canvasObjects.ts:1800`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/canvasObjects.ts:1788`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 22 | `server/src/services/canvasObjects.ts:2014`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/canvasObjects.ts:2002`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 23 | `server/src/services/canvasObjects.ts:2056`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/canvasObjects.ts:2044`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 24 | `server/src/services/canvasObjects.ts:2139`<br>`getOwnedNote(db, userId, noteId)` | `server/src/services/canvasObjects.ts:2127`<br>`getOwnedNote(db, userId, noteId)` | 原样（定义来源可能合并） |
| 25 | `server/src/services/courseMaterials.ts:269`<br>`getOwnedSourceMaterial(db, userId, sourceMaterialId)` | `server/src/services/courseMaterials.ts:274`<br>`findOwnedSourceMaterial(db, userId, sourceMaterialId)` | 机械更新 |
| 26 | `server/src/services/courseMaterials.ts:345`<br>`getOwnedSourceMaterial(db, userId, sourceMaterialId)` | `server/src/services/courseMaterials.ts:350`<br>`findOwnedSourceMaterial(db, userId, sourceMaterialId)` | 机械更新 |
| 27 | `server/src/services/courseMaterials.ts:406`<br>`getOwnedSourceMaterial(db, userId, sourceMaterialId)` | `server/src/services/courseMaterials.ts:411`<br>`findOwnedSourceMaterial(db, userId, sourceMaterialId)` | 机械更新 |
| 28 | `server/src/services/items.ts:248`<br>`getOwnedItemRow(db, userId, itemId)` | `server/src/services/items.ts:248`<br>`getOwnedItemRow(db, userId, itemId)` | 原样（定义来源可能合并） |
| 29 | `server/src/services/items.ts:410`<br>`getOwnedItemRow(db, userId, itemId)` | `server/src/services/items.ts:410`<br>`getOwnedItemRow(db, userId, itemId)` | 原样（定义来源可能合并） |
| 30 | `server/src/services/items.ts:468`<br>`getOwnedItemRow(db, userId, itemId)` | `server/src/services/items.ts:468`<br>`getOwnedItemRow(db, userId, itemId)` | 原样（定义来源可能合并） |
| 31 | `server/src/services/items.ts:509`<br>`getOwnedItemRow(db, userId, successorId)` | `server/src/services/items.ts:509`<br>`getOwnedItemRow(db, userId, successorId)` | 原样（定义来源可能合并） |
| 32 | `server/src/services/items.ts:521`<br>`getOwnedItemRow(db, userId, cursor.retired_into_item_id)` | `server/src/services/items.ts:521`<br>`getOwnedItemRow(db, userId, cursor.retired_into_item_id)` | 原样（定义来源可能合并） |
| 33 | `server/src/services/items.ts:533`<br>`getOwnedItemRow(db, userId, itemId)` | `server/src/services/items.ts:533`<br>`getOwnedItemRow(db, userId, itemId)` | 原样（定义来源可能合并） |
| 34 | `server/src/services/items.ts:629`<br>`getOwnedContentGroup(db, userId, input.pool_scope_id)` | `server/src/services/items.ts:661`<br>`getOwnedContentGroup(db, userId, input.pool_scope_id)` | 原样（定义来源可能合并） |
| 35 | `server/src/services/items.ts:683`<br>`getOwnedContentGroup(db, userId, poolScopeId)` | `server/src/services/items.ts:715`<br>`getOwnedContentGroup(db, userId, poolScopeId)` | 原样（定义来源可能合并） |
| 36 | `server/src/services/items.ts:737`<br>`getOwnedContentGroup(db, userId, first.pool_scope_id)` | `server/src/services/items.ts:769`<br>`getOwnedContentGroup(db, userId, first.pool_scope_id)` | 原样（定义来源可能合并） |
| 37 | `server/src/services/materialMapProposals.ts:102`<br>`getOwnedCourse(db, userId, input.course_id)` | `server/src/services/materialMapProposals.ts:98`<br>`getOwnedCourse(db, userId, input.course_id)` | 原样（定义来源可能合并） |
| 38 | `server/src/services/materialMapProposals.ts:193`<br>`getOwnedSourceMaterial(db, userId, id)` | `server/src/services/materialMapProposals.ts:189`<br>`findOwnedSourceMaterial(db, userId, id)` | 机械更新 |
| 39 | `server/src/services/materialReconciliationProposals.ts:575`<br>`getOwnedCourse(db, userId, input.course_id)` | `server/src/services/materialReconciliationProposals.ts:571`<br>`getOwnedCourse(db, userId, input.course_id)` | 原样（定义来源可能合并） |
| 40 | `server/src/services/notes.ts:61`<br>`getOwnedNote(noteId, userId)` | `server/src/services/notes.ts:62`<br>`getOwnedNote(getDb(), userId, noteId)` | 机械更新 |
| 41 | `server/src/services/notes.ts:128`<br>`getOwnedCourse(courseId, userId)` | `server/src/services/notes.ts:129`<br>`getOwnedCourse(getDb(), userId, courseId)` | 机械更新 |
| 42 | `server/src/services/notes.ts:149`<br>`getOwnedNote(noteId, userId)` | `server/src/services/notes.ts:150`<br>`getOwnedNote(getDb(), userId, noteId)` | 机械更新 |
| 43 | `server/src/services/organizedNoteProposals.ts:347`<br>`getOwnedCourse(db, userId, input.course_id)` | `server/src/services/organizedNoteProposals.ts:341`<br>`getOwnedCourse(db, userId, input.course_id)` | 原样（定义来源可能合并） |
| 44 | `server/src/services/organizedNoteProposals.ts:416`<br>`getOwnedCourse(db, userId, data.course_id)` | `server/src/services/organizedNoteProposals.ts:410`<br>`getOwnedCourse(db, userId, data.course_id)` | 原样（定义来源可能合并） |
| 45 | `server/src/services/paletteColors.ts:36`<br>`getOwnedPaletteColor(db, userId, id)` | `server/src/services/paletteColors.ts:36`<br>`getOwnedPaletteColor(db, userId, id)` | 原样（定义来源可能合并） |
| 46 | `server/src/services/paletteColors.ts:42`<br>`getOwnedPaletteColor(db, userId, colorId)` | `server/src/services/paletteColors.ts:42`<br>`getOwnedPaletteColor(db, userId, colorId)` | 原样（定义来源可能合并） |
| 47 | `server/src/services/paletteColors.ts:46`<br>`getOwnedPaletteColor(db, userId, colorId)` | `server/src/services/paletteColors.ts:46`<br>`getOwnedPaletteColor(db, userId, colorId)` | 原样（定义来源可能合并） |
| 48 | `server/src/services/paletteColors.ts:65`<br>`getOwnedPaletteColor(db, userId, colorId)` | `server/src/services/paletteColors.ts:65`<br>`getOwnedPaletteColor(db, userId, colorId)` | 原样（定义来源可能合并） |
| 49 | `server/src/services/purposes.ts:80`<br>`getOwnedPurposeRow(db, userId, purposeId)` | `server/src/services/purposes.ts:80`<br>`getOwnedPurposeRow(db, userId, purposeId)` | 原样（定义来源可能合并） |
| 50 | `server/src/services/purposes.ts:186`<br>`getOwnedPurposeRow(db, userId, purposeId)` | `server/src/services/purposes.ts:186`<br>`getOwnedPurposeRow(db, userId, purposeId)` | 原样（定义来源可能合并） |
| 51 | `server/src/services/purposes.ts:194`<br>`getOwnedPurposeRow(db, userId, purposeId)` | `server/src/services/purposes.ts:194`<br>`getOwnedPurposeRow(db, userId, purposeId)` | 原样（定义来源可能合并） |
| 52 | `server/src/services/skinSuites.ts:39`<br>`getOwnedSkinSuite(db, userId, id)` | `server/src/services/skinSuites.ts:39`<br>`loadOwnedSkinSuiteHydrated(db, userId, id)` | 机械更新 |
| 53 | `server/src/services/skinSuites.ts:44`<br>`getOwnedSkinSuite(db, userId, suiteId)` | `server/src/services/skinSuites.ts:44`<br>`loadOwnedSkinSuiteHydrated(db, userId, suiteId)` | 机械更新 |
| 54 | `server/src/services/skinSuites.ts:48`<br>`getOwnedSkinSuite(db, userId, current.id)` | `server/src/services/skinSuites.ts:48`<br>`loadOwnedSkinSuiteHydrated(db, userId, current.id)` | 机械更新 |
| 55 | `server/src/services/skinSuites.ts:66`<br>`getOwnedSkinSuite(db, userId, suiteId)` | `server/src/services/skinSuites.ts:66`<br>`loadOwnedSkinSuiteHydrated(db, userId, suiteId)` | 机械更新 |

## 行为保持及契约闸

- sourceMaterial四处消费维持null/no-op/Boolean过滤；proposals route全文未变，事务内用原db。没有把可选读取改为异常。
- skinSuite服务及既有测试仅逐字改名，hydrate、错误业务码、update/delete immediate事务均未改。
- ContentGroup原WHERE及404原样；3消费者中2处丢弃返回，1处只读course_id/note_id。
- 共享course/note消费仅用原有标量字段；完整行增加的字段没有进入响应序列化。原显式连接12处复用原db，原隐式连接11处显式传同一singleton。
- 既有get 404消息均保留；palette的PALETTE_COLOR_NOT_FOUND业务码保留。notes中ownedNoteOrMissing既有catch 404→null保持。
- 静态与运行时契约闸覆盖7 get +1 find，含private helper；新增实现动态发现，无定义白名单。合成内存SQLite验证完整行（额外列也保留）、普通缺失404/undefined，不扩安全对抗矩阵。

原始普查、映射、逐函数源码和两份独立只读复核均在 `.codex-tmp/d3a-ownership/`。
