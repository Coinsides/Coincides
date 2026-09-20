> **状态 (Status)**: active（停线时点的普查证据；不是完工验收）
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否（builder 现场证据，供 HQ 复核）

# D3a 签名与调用点普查

停线前产品源码未改。实现数 **16 → 16**，文件数 **14 → 14**，收敛完成 **0 份**；调用点 **55 → 55**，其中生产 **49**、既有测试 **6**，实际修改调用点 **0**。历史台账写 14 份/13 文件；本轮独立普查与主扫描一致为 16/14，未以旧数字充当现数。

扫描射程：git 只读枚举的 tracked + nonignored untracked 自有 JS/TS 源，另独立物理枚举 server/src、server/scripts、client/src、client/scripts、shared、scripts；共 **1376 文件**。不计 node_modules、dist、临时副本与外部研究/工具副本，不跟随 symlink。独立审计另看见 _external_research/AFFiNE 中两个 getOwned* 方法，归外部研究副本，不冒充产品实现。TypeScript AST 同时检查函数、方法、函数值定义、直接调用及导入别名；原始文件清单、定义原文、引用分类均留 raw JSON。

CodeGraph 已优先尝试，但 CLI 不在 PATH，当前工具表没有 CodeGraph MCP；rg 同样不可调用，使用 Node + 已安装 TypeScript AST。没有新依赖、没有索引或 git 写操作。

## 逐份签名对照

下表原签名保持原样，返回类型写 inferred 的具体 return/SQL 见 raw 原文。裁定目标是 (db, userId, xId)、完整 owned 行、查无抛 404；由于 README 中的冲突，未落任何新签名或共享住所。

| 原定义与行号 | 停线时原签名 | 收敛后 |
|---|---|---|
| [server/src/routes/noteBlocks.ts:14](../../../server/src/routes/noteBlocks.ts#L14) | `getOwnedBlock(blockId: string, userId: string) → { id: string; course_id: string; block_type: string; content_json: string; plain_text: string \| null; metadata: string; source_kind: string }` | 未改；未执行收敛 |
| [server/src/routes/notes.ts:62](../../../server/src/routes/notes.ts#L62) | `getOwnedCourse(courseId: string, userId: string) → { id: string }` | 未改；未执行收敛 |
| [server/src/routes/notes.ts:70](../../../server/src/routes/notes.ts#L70) | `getOwnedNote(noteId: string, userId: string) → { id: string; course_id: string; note_class: string; status: string; page_format: string }` | 未改；未执行收敛 |
| [server/src/routes/projections.ts:34](../../../server/src/routes/projections.ts#L34) | `getOwnedCourse(courseId: string, userId: string) → void` | 未改；未执行收敛 |
| [server/src/services/annotationTruths.ts:238](../../../server/src/services/annotationTruths.ts#L238) | `getOwnedNote(db: Database.Database, userId: string, noteId: string) → OwnedNote` | 未改；未执行收敛 |
| [server/src/services/canvasAssets.ts:62](../../../server/src/services/canvasAssets.ts#L62) | `getOwnedNote(db: Database.Database, userId: string, noteId: string) → OwnedNote` | 未改；未执行收敛 |
| [server/src/services/canvasObjects.ts:272](../../../server/src/services/canvasObjects.ts#L272) | `getOwnedNote(db: Database.Database, userId: string, noteId: string) → OwnedNote` | 未改；未执行收敛 |
| [server/src/services/courseMaterials.ts:263](../../../server/src/services/courseMaterials.ts#L263) | `getOwnedSourceMaterial(db: Database.Database, userId: string, sourceMaterialId: string) → (inferred)` | 未改；未执行收敛 |
| [server/src/services/items.ts:236](../../../server/src/services/items.ts#L236) | `getOwnedItemRow(db: Database.Database, userId: string, itemId: string) → ItemRow` | 未改；未执行收敛 |
| [server/src/services/items.ts:548](../../../server/src/services/items.ts#L548) | `getOwnedContentGroup(db: Database.Database, userId: string, groupId: string) → (inferred)` | 未改；未执行收敛 |
| [server/src/services/materialMapProposals.ts:53](../../../server/src/services/materialMapProposals.ts#L53) | `getOwnedCourse(db: Database.Database, userId: string, courseId: string) → void` | 未改；未执行收敛 |
| [server/src/services/materialReconciliationProposals.ts:231](../../../server/src/services/materialReconciliationProposals.ts#L231) | `getOwnedCourse(db: Database.Database, userId: string, courseId: string) → void` | 未改；未执行收敛 |
| [server/src/services/organizedNoteProposals.ts:82](../../../server/src/services/organizedNoteProposals.ts#L82) | `getOwnedCourse(db: Database.Database, userId: string, courseId: string) → { id: string; name: string }` | 未改；未执行收敛 |
| [server/src/services/paletteColors.ts:8](../../../server/src/services/paletteColors.ts#L8) | `getOwnedPaletteColor(db: Database.Database, userId: string, colorId: string) → PaletteColor` | 未改；未执行收敛 |
| [server/src/services/purposes.ts:72](../../../server/src/services/purposes.ts#L72) | `getOwnedPurposeRow(db: Database.Database, userId: string, purposeId: string) → PurposeRow` | 未改；未执行收敛 |
| [server/src/services/skinSuites.ts:25](../../../server/src/services/skinSuites.ts#L25) | `getOwnedSkinSuite(db: Database.Database, userId: string, suiteId: string) → SkinSuite` | 未改；未执行收敛 |

## 全部调用点（按位置列出）

表内含 6 个既有测试调用；均未修改，均未运行。调用计数不把定义、import 和字符串计入分母；55 个调用位于 18 文件。

| 调用点 | 表达式 | 类别 |
|---|---|---|
| [server/src/__tests__/v14PaletteColors.test.ts:85](../../../server/src/__tests__/v14PaletteColors.test.ts#L85) | `getOwnedPaletteColor(db, userId, own.id)` | 既有测试 |
| [server/src/__tests__/v14PaletteColors.test.ts:159](../../../server/src/__tests__/v14PaletteColors.test.ts#L159) | `getOwnedPaletteColor(f.db, userId, color.id)` | 既有测试 |
| [server/src/__tests__/v14PaletteColors.test.ts:182](../../../server/src/__tests__/v14PaletteColors.test.ts#L182) | `getOwnedPaletteColor(db, userId, color.id)` | 既有测试 |
| [server/src/__tests__/v14SkinSuites.test.ts:101](../../../server/src/__tests__/v14SkinSuites.test.ts#L101) | `getOwnedSkinSuite(db, userId, colorId)` | 既有测试 |
| [server/src/__tests__/v14SkinSuites.test.ts:178](../../../server/src/__tests__/v14SkinSuites.test.ts#L178) | `getOwnedSkinSuite(db, userId, suite.id)` | 既有测试 |
| [server/src/__tests__/v14SkinSuites.test.ts:250](../../../server/src/__tests__/v14SkinSuites.test.ts#L250) | `getOwnedSkinSuite(db, userId, suite.id)` | 既有测试 |
| [server/src/routes/noteBlocks.ts:64](../../../server/src/routes/noteBlocks.ts#L64) | `getOwnedBlock(blockId, req.userId!)` | 生产 |
| [server/src/routes/notes.ts:111](../../../server/src/routes/notes.ts#L111) | `getOwnedCourse(data.course_id, req.userId!)` | 生产 |
| [server/src/routes/notes.ts:159](../../../server/src/routes/notes.ts#L159) | `getOwnedNote(noteId, req.userId!)` | 生产 |
| [server/src/routes/notes.ts:260](../../../server/src/routes/notes.ts#L260) | `getOwnedNote(noteId, req.userId!)` | 生产 |
| [server/src/routes/notes.ts:384](../../../server/src/routes/notes.ts#L384) | `getOwnedNote(noteId, req.userId!)` | 生产 |
| [server/src/routes/notes.ts:428](../../../server/src/routes/notes.ts#L428) | `getOwnedNote(noteId, req.userId!)` | 生产 |
| [server/src/routes/notes.ts:456](../../../server/src/routes/notes.ts#L456) | `getOwnedNote(noteId, req.userId!)` | 生产 |
| [server/src/routes/paletteColors.ts:30](../../../server/src/routes/paletteColors.ts#L30) | `getOwnedPaletteColor(db, req.userId!, id)` | 生产 |
| [server/src/routes/projections.ts:91](../../../server/src/routes/projections.ts#L91) | `getOwnedCourse(courseId, req.userId!)` | 生产 |
| [server/src/routes/projections.ts:110](../../../server/src/routes/projections.ts#L110) | `getOwnedCourse(data.course_id, req.userId!)` | 生产 |
| [server/src/services/annotationTruths.ts:327](../../../server/src/services/annotationTruths.ts#L327) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/annotationTruths.ts:377](../../../server/src/services/annotationTruths.ts#L377) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/canvasAssets.ts:118](../../../server/src/services/canvasAssets.ts#L118) | `getOwnedNote(db, userId, input.noteId)` | 生产 |
| [server/src/services/canvasObjects.ts:1663](../../../server/src/services/canvasObjects.ts#L1663) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/canvasObjects.ts:1800](../../../server/src/services/canvasObjects.ts#L1800) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/canvasObjects.ts:2014](../../../server/src/services/canvasObjects.ts#L2014) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/canvasObjects.ts:2056](../../../server/src/services/canvasObjects.ts#L2056) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/canvasObjects.ts:2139](../../../server/src/services/canvasObjects.ts#L2139) | `getOwnedNote(db, userId, noteId)` | 生产 |
| [server/src/services/courseMaterials.ts:269](../../../server/src/services/courseMaterials.ts#L269) | `getOwnedSourceMaterial(db, userId, sourceMaterialId)` | 生产 |
| [server/src/services/courseMaterials.ts:345](../../../server/src/services/courseMaterials.ts#L345) | `getOwnedSourceMaterial(db, userId, sourceMaterialId)` | 生产 |
| [server/src/services/courseMaterials.ts:406](../../../server/src/services/courseMaterials.ts#L406) | `getOwnedSourceMaterial(db, userId, sourceMaterialId)` | 生产 |
| [server/src/services/items.ts:248](../../../server/src/services/items.ts#L248) | `getOwnedItemRow(db, userId, itemId)` | 生产 |
| [server/src/services/items.ts:410](../../../server/src/services/items.ts#L410) | `getOwnedItemRow(db, userId, itemId)` | 生产 |
| [server/src/services/items.ts:468](../../../server/src/services/items.ts#L468) | `getOwnedItemRow(db, userId, itemId)` | 生产 |
| [server/src/services/items.ts:509](../../../server/src/services/items.ts#L509) | `getOwnedItemRow(db, userId, successorId)` | 生产 |
| [server/src/services/items.ts:521](../../../server/src/services/items.ts#L521) | `getOwnedItemRow(db, userId, cursor.retired_into_item_id)` | 生产 |
| [server/src/services/items.ts:533](../../../server/src/services/items.ts#L533) | `getOwnedItemRow(db, userId, itemId)` | 生产 |
| [server/src/services/items.ts:629](../../../server/src/services/items.ts#L629) | `getOwnedContentGroup(db, userId, input.pool_scope_id)` | 生产 |
| [server/src/services/items.ts:683](../../../server/src/services/items.ts#L683) | `getOwnedContentGroup(db, userId, poolScopeId)` | 生产 |
| [server/src/services/items.ts:737](../../../server/src/services/items.ts#L737) | `getOwnedContentGroup(db, userId, first.pool_scope_id)` | 生产 |
| [server/src/services/materialMapProposals.ts:102](../../../server/src/services/materialMapProposals.ts#L102) | `getOwnedCourse(db, userId, input.course_id)` | 生产 |
| [server/src/services/materialMapProposals.ts:193](../../../server/src/services/materialMapProposals.ts#L193) | `getOwnedSourceMaterial(db, userId, id)` | 生产 |
| [server/src/services/materialReconciliationProposals.ts:575](../../../server/src/services/materialReconciliationProposals.ts#L575) | `getOwnedCourse(db, userId, input.course_id)` | 生产 |
| [server/src/services/notes.ts:61](../../../server/src/services/notes.ts#L61) | `getOwnedNote(noteId, userId)` | 生产 |
| [server/src/services/notes.ts:128](../../../server/src/services/notes.ts#L128) | `getOwnedCourse(courseId, userId)` | 生产 |
| [server/src/services/notes.ts:149](../../../server/src/services/notes.ts#L149) | `getOwnedNote(noteId, userId)` | 生产 |
| [server/src/services/organizedNoteProposals.ts:347](../../../server/src/services/organizedNoteProposals.ts#L347) | `getOwnedCourse(db, userId, input.course_id)` | 生产 |
| [server/src/services/organizedNoteProposals.ts:416](../../../server/src/services/organizedNoteProposals.ts#L416) | `getOwnedCourse(db, userId, data.course_id)` | 生产 |
| [server/src/services/paletteColors.ts:36](../../../server/src/services/paletteColors.ts#L36) | `getOwnedPaletteColor(db, userId, id)` | 生产 |
| [server/src/services/paletteColors.ts:42](../../../server/src/services/paletteColors.ts#L42) | `getOwnedPaletteColor(db, userId, colorId)` | 生产 |
| [server/src/services/paletteColors.ts:46](../../../server/src/services/paletteColors.ts#L46) | `getOwnedPaletteColor(db, userId, colorId)` | 生产 |
| [server/src/services/paletteColors.ts:65](../../../server/src/services/paletteColors.ts#L65) | `getOwnedPaletteColor(db, userId, colorId)` | 生产 |
| [server/src/services/purposes.ts:80](../../../server/src/services/purposes.ts#L80) | `getOwnedPurposeRow(db, userId, purposeId)` | 生产 |
| [server/src/services/purposes.ts:186](../../../server/src/services/purposes.ts#L186) | `getOwnedPurposeRow(db, userId, purposeId)` | 生产 |
| [server/src/services/purposes.ts:194](../../../server/src/services/purposes.ts#L194) | `getOwnedPurposeRow(db, userId, purposeId)` | 生产 |
| [server/src/services/skinSuites.ts:39](../../../server/src/services/skinSuites.ts#L39) | `getOwnedSkinSuite(db, userId, id)` | 生产 |
| [server/src/services/skinSuites.ts:44](../../../server/src/services/skinSuites.ts#L44) | `getOwnedSkinSuite(db, userId, suiteId)` | 生产 |
| [server/src/services/skinSuites.ts:48](../../../server/src/services/skinSuites.ts#L48) | `getOwnedSkinSuite(db, userId, current.id)` | 生产 |
| [server/src/services/skinSuites.ts:66](../../../server/src/services/skinSuites.ts#L66) | `getOwnedSkinSuite(db, userId, suiteId)` | 生产 |

原始材料：[census-before.json](../../../.codex-tmp/d3a-ownership/census-before.json)、[census-before.txt](../../../.codex-tmp/d3a-ownership/census-before.txt)、[独立审计](../../../.codex-tmp/d3a-ownership/ownership-audit.txt)。
