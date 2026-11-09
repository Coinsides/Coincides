# A-25 决定 4 · `previousTextFlow` 调用方普查(builder 2026-11-08,只读)

> 问:谁把 `previousTextFlow` 交给 history(`applyEdit` / 结构路径 → `applyDocumentEdit`),读的是同步的流还是渲染期的流,渲染期读的失败后有没有重试。
> 底:A-20 r3 工作副本(= r2 包 + r3 改动;以下各文件 r3 未动)。目录 `client/src/pages/Notes/canvasEngine/`。
> 「渲染期」= 读 React 状态或每次渲染才更新的 ref(`latest.current.blockTextFlowDrafts`、`host.blockTextFlowDrafts`、组件 props)。在上一次编辑之后、下一次渲染之前调用,读到的就是旧流。「同步」= 与编辑同一调用里更新的 ref。

## 事实

| # | 调用方 | 流从哪读 | 时机 | 失败或旧底之后 |
|---|---|---|---|---|
| 1 | 编辑器打字 `blocks/TextBlockProjection.tsx:847` → `:872` → `layers/NoteWritingSurfaceLayer.tsx:1107-1109` `applyEdit` | `latestFlowRef.current`,在 `:869` 与编辑同一调用里更新 | **同步** | 不涉及 |
| 2 | 编辑器的标题结构 `TextBlockProjection.tsx:849`(打字触发)/ `:1109` / `:1347`(Enter)/ `:1513`(粘贴) | `:849` 读 `latestFlowRef`(同步);`:1109`、`:1347`、`:1513` 读 `editableFlow` | `:849` 同步;其余渲染期 | 结构失败时 `onFailure` 弹提示,不重试(`hooks/useHeadingStructureController.ts:438`、`:447`) |
| 3 | 分页投影的标题结构 `blocks/PaginatedTextBlockProjection.tsx:385` / `:432` / `:603` | `current` 与 `latestFlow.current`(ref) | 推断同步(未核 ref 何时写) | 同 2 |
| 4 | 留字落地 `hooks/useHeadingStructureController.ts:566` `applyEdit` | `history.readLiveFlow`(`hooks/useTextFlowHistory.ts` `readLiveFlow` 读 `latest.current.blockTextFlowDrafts`) | **渲染期** | `void` 调用,不看结果。合并找不到位置才 `keep` + 重试(`:545`);旧底不会被发现,**无重试** |
| 5 | Agent 补丁采纳 `hooks/useNoteAgentHumanEditor.ts:41-52` | `readLiveFlow` | **渲染期**,但先核 `base_revision` 与 `old_text`(`:43-44`) | 核对不过返回 false 给调用方,无自动重试 |
| 6 | 斜杠回滚 `hooks/useSlashBlockRollbackController.ts:138-140` | `currentTextFlow`(回滚快照) | 渲染期 | 无重试 |
| 7 | 斜杠交接后补标题 `hooks/useSlashCommandController.ts:216-224` | `host.blockTextFlowDrafts` | **渲染期** | 弹「Could not finish the heading layout.」,无重试 |
| 8 | 斜杠改写作角色 `useSlashCommandController.ts:557-589` | 闭包里的 `blockTextFlowDrafts` | **渲染期** | 无重试 |
| 9 | 标题后回车 `layers/BlockEditorLayer.tsx:363-375` | `textFlow` prop | 渲染期 | 同 2 |
| 10 | 批量改角色 `layers/NoteWritingSurfaceLayer.tsx:1172-1182` | `currentTextFlow` | 渲染期 | 无重试 |
| 11 | 插入行内链接 `NoteWritingSurfaceLayer.tsx:1607-1619` | `linkSaveState.current.blockTextFlowDrafts`(每次渲染写的 ref) | **渲染期**(其间有 `await`) | 返回 false,无重试 |
| 12 | 跨块选区替换 `documentTextFlowSelection.ts:133` → `applyDocumentEdit` | `entry.flow`,由调用方从草稿取 | 渲染期 | 失败进 `documentFailures`,失焦或 Retry 重试(`useTextFlowHistory.ts` `saveBlock` 文档分支) |
| — | 适配器回执重放 `hooks/useNoteCanvasDataAdapter.ts:2364` / `:2370` | 只用于重算批注与板引用范围,不交给 history | — | 不在本问范围 |

- 同步读的只有 1、2 的 `:849`,可能还有 3。
- 其余都是渲染期读。除 12 外,都没有「底不对就再来一次」的路;12 也只在保存失败后重试,不会因为旧底重试。
- 实际可达性(推断):4 由 `setTimeout` 队列触发,5、11 中间有 `await`,6–10 由一次点击或菜单触发,通常都隔了至少一次渲染。CHAIN 的 jsdom 形状要求「上一键的编辑」与这次调用落在同一次渲染之前。浏览器探针在人的节奏下打不中(Tester CHAIN 6 行修前全绿)。

## 按决定 4 的规则

- 「渲染期调用方都能重试」**不成立**:4、5、6、7、8、10、11 无重试。
- 所以按裁定:CHAIN 留作**已知红 + TD**,不进必修「不符即拒」。
- 若以后要做「不符即拒」:要先给 4(留字落地)加「拒了就 `keep` + `retryTimer`」,给 7、8、11 至少返回失败让人能重来。否则「拒」会把今天的静默覆盖换成静默丢弃。
