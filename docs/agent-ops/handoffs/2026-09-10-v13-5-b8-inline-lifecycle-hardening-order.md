> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-07(证据:textFlowService.ts:83-103,198-210 拆 flow 清空 inline;textUnitEditorService.ts:86-94,437-482 合并未重映射);Henry 过夜清债令⑦的安全子集(HQ 收口:⛔开插入命令⛔收编——F1 坐标契约候专场)
> **单号**: 13.5 · B8 · inline 生命周期加固(TF-07 安全子集)

# 13.5 B8 · inline 加固

**使命**:既有 inline 结构(inline_formula/inline_code 的 range 记录)在普通文本编辑与拆并手术中**存活**——⛔被清空⛔被错挂。**⛔解禁插入命令⛔formula/code 收编⛔F1 坐标裁定**(全候专场)。

## 零 · 裁定(⛔复议)

1. **拆分**:unit 拆分时,inline range 按 offset 归属落到对应新 unit,anchor_range 相应调整;骑跨拆分点的 inline→显式降级(沿既有 range 降级语义),⛔静默丢;
2. **合并**:inline 的 parent_text_unit_id 重映射到合并后 unit,offset 平移;冲突重命名同步;
3. **文本编辑**:inline anchor 前/后的插入删除→anchor 平移;触及 anchor 内部→降级⛔裁切出错误范围;
4. **undo/redo**:B4 的 flow 全量快照理应已覆盖 inline 字段——验证并补断言,缺则修;
5. ⛔改 inline 渲染/插入入口(命令保持禁用);⛔碰 formula/code 块型;⛔新 schema。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①带 inline 的 unit 拆分→inline 归属新 unit、anchor 正确(修前断言现状红:被清空);②合并→parent 重映射+offset 平移(修前红:错挂/丢失);③anchor 前/后/内的插入删除→平移或显式降级;④undo/redo 恢复 inline 逐字段;⑤B4-B7 全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder · 实现完成，待 HQ 复核；本回执不代替放行。

### 实现与 numstat

- 统一按编辑后保留的原文片段迁移 inline：unit 拆分、Enter 选区删除、粘贴 suffix、unit 合并、flow 拆并、B6/B6b 选区替换均接入。
- 完整 anchor 平移及 parent 重映射；骑跨/内部触及则保留对象、anchor_text、field_values、status 与 metadata，置 `anchor_range: null`，沿已有 range 语义留下 `metadata.pre_edit_offsets`，后续编辑不覆盖最早证据。
- 合 flow 为第二份的冲突 unit/inline ID 分配未占用 ID，同步 parent；预留两份全部 ID，避免生成 ID 再撞第二份。普通原生输入及批注范围编辑优先传入已有精确编辑范围，避免重复文本的 diff 歧义。
- B4 history 已深拷贝全 flow，无需修改历史引擎；B7 原子保存实现与端点未改。B6/B6b 旧测试中「被删 inline 保持原 range」预期按本单裁定改为显式降级，其余完整字段、保存、撤销重做断言保留。

`git diff --numstat`，新增文件用 `git diff --no-index --numstat -- NUL <file>` 补计；不含入场已有无关 untracked 文件：

| 文件（相对 repo 根） | + | − |
|---|---:|---:|
| client/src/pages/Notes/canvasEngine/inlineLifecycle.ts（新增） | 52 | 0 |
| client/src/pages/Notes/canvasEngine/inlineLifecycle.test.ts（新增） | 338 | 0 |
| client/src/pages/Notes/canvasEngine/textFlowService.ts | 18 | 0 |
| client/src/pages/Notes/canvasEngine/textUnitEditorService.ts | 45 | 13 |
| client/src/pages/Notes/canvasEngine/textFlowSelection.ts | 16 | 2 |
| client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx | 17 | 6 |
| client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx | 6 | 0 |
| client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx | 107 | 2 |
| client/src/pages/Notes/canvasEngine/textFlowSelection.test.ts | 8 | 1 |
| client/src/pages/Notes/canvasEngine/documentTextFlowSelection.test.ts | 7 | 0 |
| client/src/pages/Notes/canvasEngine/textFlowDocumentHistory.integration.test.tsx | 7 | 0 |
| 本工单（状态前推 + Result） | 61 | 1 |
| **合计（12 文件）** | **682** | **25** |

代码与测试小计 **+621 / −24（11 文件）**；未 stage、commit、push。

### 五冒烟

1. **拆分：PASS，修前红已实跑。** 改实现前整跑 client，新增四条拆并断言全部失败：flow 拆分实际 `[]`（清空）；unit 拆分 suffix 仍挂旧 parent/offset。修后两种 inline 的前/后边界正确归属；骑跨清 range 留证据；Enter 删除选区、多行 paste 保留 prefix/suffix。原输入不变。
2. **合并：PASS，修前红已实跑。** 修前两 flow 合并后的 second inline 实际 parent `tu-1`，应为 `tu-2`；unit 合并实际 parent/offset 未变，应前移至存活 parent 并加前文长度。修后四条原红全绿，另覆盖 second 自带 `tu-2`/`iso-2` 的冲突避让、split/rejoin 逐字段恢复及 null/deprecated/deleted 记录保留。
3. **普通编辑：PASS。** formula/code 双类型前/后/边界插入删除保持原 anchor 文本及正确 offset；内部、跨边界、整段替换显式降级，不裁切。跨 unit 删除保留 prefix/suffix，删除中间 unit 的 inline 归存活 unit 并留证据；空操作不误降级。原生 `beforeinput` 重复 `aaaa` 首插的真实编辑器测试验证 anchor 平移；有已知范围的批注替换同样传精确 edit。
4. **undo/redo：PASS。** 真实 `TextBlockProjection → useTextFlowHistory → usePlacementHistory` integration，formula/code 分别验证移位→降级→undo×2→redo×2，完整 flow/inline 逐字段严格相等；六次保存 payload 与各阶段快照一致。重复文本测试另验 caret 与保存重放；原 fixture 不变。未改 B4 引擎。
5. **B4–B7 回归 + 全库：PASS。** 最终 `npm.cmd --prefix client run test:unit` 无过滤整跑：**104 files / 1037 tests，全部通过，无 skipped**；含 B4 历史、B5 导航、B6/B6b 选区及 adapter 原子保存既有套件。B7 服务端 `node --import tsx --test src/__tests__/v13AtomicTextSave.test.ts src/__tests__/v13AtomicTextSaveMigration.test.ts` 两文件整跑 **12/12**，全部 synthetic `:memory:`，验证原子事务/OCC/旧门消费及 migration 063 保留历史数据；未连接用户库。

修前 client：**103 passed files + 1 failed file；978 passed tests + 4 failed tests**。生命周期新增文件最终 **56 tests**，历史新增 **3 tests**。client 测试及构建均设置 `COINCIDES_VALIDATION_ENV_DIR` 为新建空目录 `.codex-tmp/b8-empty-env`，没有读取 `.env`。

### 其他验证

- `npm.cmd --prefix client run build`（`tsc -b && vite build`）及 `npm.cmd --prefix server run build`（manifest check + `tsc` + artifact copy）均 exit 0。构建保留既有大 bundle / recursive-schema 提示，无编译错误。
- 获准 runtime 组成项通过：registry **5/5**、manifest **10/10**、parity **10/10**；tool-face parity、server shared import（216 文件、0 违规）、canvas runtime boundary（159 checks）、三 shell、source experience、V11 legacy/freshness；canvas model **60 groups**、performance **5 scenarios**。没有过滤或跳过测试。
- `git diff --check` 通过。`docs:check` **exit 1**：`docs/agent-ops/INDEX.md` 过期（追加本 Result 前已出现，未改该索引）。它短路的 inventory/glossary 随后分别以原检查完整执行，均通过。
- 本轮日志：`.codex-tmp/b8-before-tests.log`、`b8-after-tests.log`、`b8-final-tests.log`、`b8-client-build.log`、`b8-server-build.log`、`b8-b7-atomic-tests.log`、`b8-checks-*.log`、`b8-docs-inventory.log`、`b8-glossary.log`。

### 未做

- 未解禁或修改 inline 插入/渲染入口；未碰 formula/code 块型、收编、F1 坐标裁定或任何持久 schema。`commandSurfaceService.ts` 中两条 inline command 仍 `disabled: true`。
- 未修已经发生 `plain_text`/flow 不一致时的遗留 `alignExistingFlowWithLines` 投影对齐；本单普通编辑成对输出一致 text/flow。没有实机浏览器体验签收，冒烟证据为 synthetic model、jsdom 实际编辑/历史事件及内存服务端套件。
- 未 stage/commit/push，未改权限/agent 指令配置，入场无关 untracked 文件未动；未读 `.env`/key 值、未访问用户库，未设计或执行安全专项/凭据扫描。

### 停线 / HQ 待接

- 本单代码无未解决阻断，五项冒烟及 typecheck/build 完成；不扩大到被禁止的专场。
- **不宣称总门禁通过。** `verify:v2-bn8-runtime` 原命令末项为本单明禁的 `check:changed-file-secrets`，因此未整跑原命令，也未过滤改写它来冒称全绿；只记录上面分别执行的原组成项。凭据扫描及完整门禁留 HQ。
- **文档门禁仍红：`docs/agent-ops/INDEX.md` 过期。** 连同本工单状态前推交 HQ 统一刷新及复核；未擅改共享索引/现状层，未替 HQ 放行。
