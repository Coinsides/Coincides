> **状态 (Status)**: done(HQ 收口:波次 C 末单收官)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 13.3"笔迹⛔入纸"已由 Henry 显式翻案(claude-log §74,两次口径一致);板 freehand 现物=数据模型参照(boardFreehandDataSchema/整笔橡皮);纸板底层侦察在案(板绘画栈内联 BoardPage⛔直接复用,搬模型不搬存储)
> **单号**: 13.5 · C4 · 纸上手绘(波次 C 末单)

# 13.5 C4 · 纸上手绘

**使命**:纸获得一支笔一块橡皮——笔画作为页归属的画布对象,写进纸的持久层,可撤可打印。

## 零 · 裁定(⛔复议;实现细节裁量申报)

1. **数据模型**:canvas_objects 新 kind `freehand`(客户端 CanvasObjectReserve 占位已有);data={points 或 path,style} 与板 boardFreehandDataSchema 同形(⛔共享存储:纸笔画住 canvas_objects,⛔board_visuals);服务端 KIND_HANDLERS+validator 注册;
2. **锚定=页归属**:落笔所在页=归属页,placement=page_frame_local+frame_id(formal_page 面,v2 落籍);**一笔限一页,点坐标页内裁剪⛔跨页**(v1 保守——crossing 面已退役,⛔造 crossing 写入);若现物几何有更自然方案,停线举证⛔擅改;
3. **工具**:纸工具条加 Pen/Eraser;橡皮=**整笔删除**(板同款 isPointInStroke 语义可参);颜色/笔宽=板 style token 同款起步⛔新调色板;板侧 pen 代码内联 BoardPage,**搬语义⛔搬依赖**(纸侧独立实现或抽共享纯函数,裁量申报);
4. **undo**:画一笔/擦一笔=canvas object create/delete,**入现有 canvas command 栈**(⛔新栈);
5. **投影**:打印(NotePrintLayer)与统揽(NoteReadOnlyPageContent)补 freehand 最小渲染(SVG path 纯展示)——画在纸上打印时必须在;若投影架构阻力大→停线拆单⛔静默跳过;
6. **⛔射程**:铸卡/被引用/进组(板粉笔的戏纸上不演,纯墨水);压感/多笔刷/笔画选中变换(v1 一支笔);Layout/页操作与笔画的交互按现有 generic object 语义,异常申报。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟六条:①Pen 画一笔→canvas_objects freehand 落库(page_frame_local+frame_id 正确页),刷新保持(修前断言现状:纸无画笔工具);②页边落笔→点页内裁剪,归属唯一;③橡皮整笔删+持久;④画/擦 undo/redo 入现有栈;⑤打印与统揽投影显示笔画(几何与书写面一致);⑥退役闸回归(⛔workspace/crossing 写入)+B 系/C 系全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 裁量申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder。C4 已实现并验证，未 stage / commit / push；本回执不代替 HQ 放行。

### 实装与 numstat

纸工具条增加 Write / Pen / Eraser；笔画独立存于 `canvas_objects.metadata.freehand`，经现有 generic object API 保存、加载、删除。落笔页固定，整张纸（含页边距）内逐点裁剪；画/擦接现有历史队列。书写、统揽、打印共享纯 SVG 投影。无 schema migration、无新依赖、无板存储或板运行时改动。

以下为实现、测试和浏览器夹具的 numstat：**24 文件，+1431 / −6**。新文件尚未暂存，逐文件行数单列计入；不把预先存在的未跟踪文件算成本单。

```text
+    -   path
16   0   client/src/pages/Notes/NoteDetail.module.css
1    0   client/src/pages/Notes/canvasEngine/canvasPersistenceNormalizer.ts
89   0   client/src/pages/Notes/canvasEngine/freehandService.ts (new)
10   2   client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts
93   0   client/src/pages/Notes/canvasEngine/hooks/usePaperInkCommands.ts (new)
191  0   client/src/pages/Notes/canvasEngine/hooks/usePaperInkCommands.test.tsx (new)
2    0   client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer.tsx
2    0   client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx
10   3   client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx
23   1   client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
11   0   client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx
146  0   client/src/pages/Notes/canvasEngine/layers/PaperInkLayer.tsx (new)
135  0   client/src/pages/Notes/canvasEngine/layers/PaperInkLayer.test.tsx (new)
71   0   client/src/pages/Notes/canvasEngine/layers/PaperInkSvg.tsx (new)
164  0   client/src/pages/Notes/canvasEngine/layers/PaperInkProjection.test.tsx (new)
13   0   client/src/pages/Notes/canvasEngine/types.ts
1    0   client/scripts/paperInkSmoke/ink.html (new)
45   0   client/scripts/paperInkSmoke/inkFixture.tsx (new)
48   0   client/scripts/paperInkSmoke/inkMockApi.ts (new)
110  0   client/scripts/paperInkSmoke/startInk.mjs (new)
69   0   server/src/services/canvasObjects.ts
25   0   server/src/validators/index.ts
13   0   server/src/validators/paperInk.ts (new)
143  0   server/src/__tests__/v13PaperInk.test.ts (new)
```

另由现有生成器更新 `docs/agent-ops/INDEX.md`（+6/−2，补齐既有 B10/C1–C4 状态索引）与 `docs/generated/object-inventory.md`（+3/−2，新增 kind）；本回执自身不计入上述行数。

### 六条冒烟

| # | 结果与证据 |
|---|---|
| ① 画笔、落籍、刷新 | **PASS**。先在未改产品实现的实际 `NoteWritingSurfaceLayer` 上断言 Pen/Eraser 按钮均不存在，随后整跑 client **113 文件 / 1222 测试全绿**；再施工。修后 Chrome 原生拖画经真实 production routes 写到合成 SQLite，回读 `kind=freehand`、`surface=formal_page`、`boundary_role=inside`、`frame_id=ink-frame-1`、`layout_policy.coordinate_space=page_frame_local`；刷新后 ID、d、transform 不变。server 新测试还实际关闭并重开临时 SQLite 文件验证持久。 |
| ② 页边、唯一归属 | **PASS**。真实浏览器从第一页右边内侧拖到页外，采样点夹到页宽；另一笔从第二页落笔，只归 `ink-frame-2`。合成库逐点断言全部在所属纸面内，每个笔画仅一条 placement。单测覆盖四边、release 采样、四角及距右边 0.005px 的单击、非 1:1 显示比例；pointer capture 将越界拖动留在起始页。 |
| ③ 整笔擦除、持久 | **PASS**。Chrome 用橡皮穿过笔画，整条路径消失、真实 DELETE 落库；刷新仍不存在。server 临时文件重开验证删除保持。单测检验空 bbox 区域不擦、快速跨线命中和去重，不对笔画切段。 |
| ④ 现有栈 undo/redo | **PASS**。真实浏览器分别验证画笔和橡皮 Ctrl+Z / Ctrl+Y，保存/删除回读仍为相同对象 ID。4 条新增 history 测试用真实 data adapter + `usePlacementHistory`，覆盖 create → 既有 layout → erase 的同栈顺序、重载后擦除、同 placement ID 恢复、失败不入栈与失败 replay 可重试。 |
| ⑤ 打印、统揽 | **PASS（生产投影）**。真实浏览器统揽显示两页各自笔画；夹具按钮触发生产 `beforeprint` 生命周期，打印 DOM 为 **2 页 / 2 笔**，逐项断言其 ID、d、transform 与书写面和统揽完全相同。4 条新增投影测试覆盖 page origin、裁剪、export-hidden、hidden/tray 排除、冻结打印快照及擦除后的下一轮打印。未实际送纸打印或导出 PDF。 |
| ⑥ 退役闸、B/C 与全库 | **PASS**。最终 `npm run test:unit` 无文件/name 过滤，**116 文件 / 1236 测试全绿**，包含 B4–B10、C1–C3、既有 retirement tests。server 下列 8 个完整功能测试文件 **38/38 全绿**：`v13PaperInk`、`v13CanvasRetirement`、`v13AtomicTextSave`、`v13AtomicTextSaveMigration`、`v13BoardServices`、`v13BoardRoutes`、`v13BoardTextRanges`、`v13GraphemeTextRanges`。HTTP 与 direct-service 退役写入均拒绝且无新行；浏览器所有实际写请求均走 canvas ink API、formal_page / inside / page_frame_local，board 行数为 0。 |

验证门：client `tsc -b`、server `tsc --noEmit`、client/server build 均 PASS。`verify:v2-bn8-runtime` 的 **20 个非凭据扫描子命令均完成并最终 PASS**，包括完整 client、registry/manifest/parity、runtime boundary、shell/source/legacy/freshness 检查、model contract、performance、docs 与 diff check；末项扫描依用户禁令未执行，**不声称原封不动的总命令全绿**。最终 Vite 验证指定空的 `COINCIDES_VALIDATION_ENV_DIR`，浏览器夹具显式 `configFile:false / envFile:false`。

中途记录：①一次默认 worker 整跑遇到 `ERR_IPC_CHANNEL_CLOSED`；②一次改用 4 workers 的完整套件遇到既有 `BoardPage.selection` 首屏框选时序失败（卡片先出现，viewport ref 随后 effect 初始化）。均未过滤、删改或跳过测试；最后默认配置整跑 **1236/1236 PASS**。③docs gate 初始报两个生成文件过期，已用原生成器更新并通过。前序 B/C 产品代码及测试未为这些失败而改写。

本地证据目录：`.codex-tmp/c4-paper-ink/`，包含 `baseline-client.log`、`client-full.log`、`client-final.log`、`client-final-rerun.log`、`server-regression.log`、`gate-*.log`、`gate-results.json`、`browser-after-draw.json`、`browser-after-two-pages.json`、`browser-verified.json`。`gate-results.json` 保留初次失败记录；最终 client 和 docs 复跑结果以上述日志与本回执为准。浏览器几何断言结果另在本轮 CUA 工具记录中。

### 裁量申报

- 数据 envelope 采用现有 `metadata.freehand`，对外保存 DTO 为 `{kind:'freehand',data,placement}`，normalizer 恢复 runtime data。纸侧 schema 独立定义并与板形状一致，未 import BoardPage/boards validator/storage。页完整尺寸裁剪，允许页边距内对应的负 content-local 坐标；服务端再次校验 bbox、points、v2 与唯一页。
- 笔样式沿板 `{color_token:'ink',width:2.5}` 与 `--text-primary` 语义，不加调色板。单击形成页内微小短线以显示圆点。橡皮用板相同的原生 `isPointInStroke` + `getScreenCTM`，透明 16px 命中路径、每 4px 插值扫过；每笔一次 delete/history entry。
- 复用 `usePlacementHistory` 的 `reversibleEdit` 和串行操作队列，先封住 TextFlow 边界；新增 hook 只是 create/delete 命令接线，未新建 undo 栈。Write 回到普通书写；Layout、只读、统揽期间禁用画/擦，切换模式取消未完成手势。
- 三面共享 `PaperInkSvg`，裁剪在所属页的 SVG viewport。无笔画选择/变换/铸卡/引用/进组入口，纸墨不挂 content mount；server 不接受 freehand backing/mount/extension 或非零 rotation。
- **页操作异常按既有 generic object 语义保留并申报**：删除页集合中的页会留下失效 frame 引用的 generic object（重载后不显示）；缩页保留墨水、投影裁掉页外部分，此后以旧 bbox 做 undo/redo 恢复可能被页内校验拒绝；移动页/改 inset 时现有 generic world placement 在重载前不重新投影。未改写前序页集合机制，后续若要赋予笔画专属页操作语义需另单。
- CodeGraph 目录存在，但本环境 CLI/MCP 均不可用；尝试后回退仓内定点 `git grep`。browser-harness 读取 Chrome 调试端口遭权限拒绝后，使用现有 CUA 浏览器连接完成夹具验证。

### 未做 / 停线

- 未 stage / commit / push；未读取 env/key 值、接触用户库、调用真实账号或外部模型；无凭据扫描或新增安全类测试。临时 server 测试只用自行创建的文件库，浏览器只用 `:memory:`。
- 未做压力/多笔刷、压感、选中变换、铸卡/被引用/进组、真实触控笔硬件与 Henry 主观验收；未送打印机或导出 PDF。
- **施工无新增停线项**。上述 generic 页操作异常明示保留；**完整总门末项 `check:changed-file-secrets` 停在 HQ**，原因是用户本单明确禁令，不请求扩大权限。
