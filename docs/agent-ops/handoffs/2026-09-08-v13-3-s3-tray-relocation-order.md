> **From**: fable
> **To**: codex
> **Status**: done(2026-09-12 状态头补翻:交付与 Result 早已在案,头未跟上;派发期原头:ready;两层制;13.3 单 3=准备区→板搬迁,client+server 中单;13.3 末单)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单

# 13.3 · 单 3 · 准备区→板搬迁(图三承诺兑现)

## 〇 · 上游(先读,顺序)

1. 单 0 报告 §四(准备区现物链/搬迁候选路径与五保真条件——本单法源):`analysis/2026-09-08-v13-3-s0-recon.md`;
2. 单 1 Result(board_visuals 承载契约/四 verb 事件面/裁定甲丁):`handoffs/2026-09-08-v13-3-s1-data-layer-order.md`;
3. 单 2 Result(板 UI 与 Tray 现物):`handoffs/2026-09-08-v13-3-s2-board-ui-order.md`。

## 一 · 口径(冻结,含 HQ 三裁)

**裁定 A(搬什么)**:搬迁=**迁出**(源 tray placement 退出,⛔ 复制留底);射程=画物类与 CG mount——
- shape/image/table/connector 的 tray 行→**board_visuals**(板自有画物,几何/rotation/扩展 JSON/connector 裸点与样式全量保全——历史保全几何用原值,13.2 归零几何的新 tray 行按板上默认网格摆位,两况在核对中分别申报);
- content_group mount 的 tray 行→**board_members**(content_group 引用,走既有 mount 语义,记 `mounted` 事件);
- **⛔ 块(note_block)上板**——块的出路仍是上纸/分蘖(既有),搬迁 UI 对块行不提供上板;

**裁定 B(事务与撤销)**:单一 server 事务(新路由,如 POST /api/boards/:boardId/relocate-tray,输入=源 placement ids;从 server 原行取证含全部 metadata,⛔ 凭 TrayEntry 快照);operation_batches 全列快照支持撤销(仿 trayNotes split 的事务组织,⛔ 复用其分蘖语义);源退出/目标写入/事件同生共死;

**裁定 C(事件面)**:仅 CG mount 上板记 `mounted`(board_members 引用);画物入 visuals **⛔ 入钢**(裁定丁一致);⛔ 新 verb。

client:TraySidebar 画物/mount 行增加选择与"上板"批量动作(目标板选择器,列库级板);完成后 refreshTrayState+若在板页则重读。⛔ 动纸行为/坐标契约/执行器/块行分蘖既有功能。

## 二 · 验证(段纪律)

server+client typecheck/build;单测:混合批(保全几何画物+零几何画物+CG mount)搬迁事务原子/撤销还原/字段无损(rotation/裸点/扩展 JSON)/事件仅 mounted;一条冒烟:fixture 全链(选中→上板→板上可见→撤销→回准备区)。

## 三 · 回执与边界

apply_patch 追加 ## Result(numstat+验证+两况几何申报+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 用户库;不动 3001/5173。现物冲突⇒停线举证。

## Result

> **From**: codex（builder）
> **日期**: 2026-09-08
> **交付状态**: 本单施工及段内定向验证完成；工作树交 HQ 复核、翻牌，未 commit。保留本单 header，不代替 HQ 放行或 Henry 走查。
> **交付分支 / HEAD**: `fable/v2-bn12-exoskeleton` / `e6f9c98`（交付时读取）。
> **统计**: 产品代码与测试 20 文件，**+1304 / -10**；其中 client 15 文件 +698/-10，server 5 文件 +606/-0。另仅向本工单追加本 Result。

### 1. 三项裁定落地

- **迁出而非复制留底**：server 只接源 placement IDs，事务内读取同用户 active 源纸的 tray placement、object、全部 mounts、image/table/connector 扩展及必要 backing/endpoint 行。只删除选中的 `canvas_placements`；共享 object、其他 placement、mount、扩展、shape 文字 backing 与内容真相不删不改。保留无 placement 的旧 object 不会使画物在纸上重新出现。
- **画物承载**：shape/image/table/visual_connector 分别落 `board_visuals` 的 shape/image/table/connector。`data.tray_source` 保留全列原行；原 metadata/source_json/data_json/snap_state_json 等 JSON 列保持原始字符串，不经 client normalizer 重建。shape 文字 backing 原行作为画物快照保存，不铸成板成员；表格扩展、图片 caption/alt/fit、connector 裸点、绑定身份、标记与样式均留存。板显示补齐四类画物，可选择/删除，图片沿既有认证 blob API 读取。
- **CG mount**：仅无歧义的 `content_group_projection`、一个 content_group mount 走既有 `mountBoardMember` 引用语义。成员无 rotation 列，原 rotation 及全部源列保留在 `member.metadata.tray_source`，未改 schema。块不映射成 note/item/text_range；client 不给块上板选择，server 混入块时拒绝整批。缺失 backing/asset/必要扩展或端点实例歧义也拒绝整批，不静默丢字段。
- **单事务与撤销**：新增 service 要求 caller-owned transaction；路由经 `runRecordedAction` 包住目标写入、源退出、`operation_batches` 及事件，提交后才响应。批次 metadata 保存 source 与目标数据库全列快照，`course_id=NULL`，不随源 Project 级联消失。undo 精确插回原 placement 全列，删除本批目标；重复 undo 不重复写事件。
- **保留后续修改**：undo 在任何写前检查目标全行、后加 board_edges、源纸活状态、source object/mounts/extensions/backing 及未迁端点行。若有后续变化或原行缺失，409 拒绝撤销，保留现状和收据，不回写覆盖后来工作。
- **书记官边界**：迁入只有 CG 的 `mounted`；画物迁入/撤销均零事件。撤销 CG 沿用已有 `unmounted`，不删除原 mounted 历史；没有新 verb。actor/channel 仍由路由包装器绑定，业务服务不自报身份。
- **图片引用保全**：`canvasAssets.releaseAssetReference` 增计同用户板 image 的资产引用，避免迁后删除原 image/纸/Project 时误清仍在板上的图片。只补引用计数，不改纸坐标、文件执行器或 FK。

### 2. HTTP 与 client 行为

| 路由 | 输入 / 输出 |
|---|---|
| `POST /api/boards/:boardId/relocate-tray` | `{placement_ids:string[]}`；201 返回 `{board_id,batch_id,placement_ids,visual_ids,member_ids,applied:true,geometry:{preserved_placement_ids,default_grid_placement_ids}}` |
| `POST /api/boards/:boardId/relocate-tray/:batchId/undo` | `{}`；200 返回同形 `applied:false`；不存在批次404、源/目标变化409；重复已完成 undo 返回同形且不再记事件 |

Tray 增独立画物/CG 选择与库级目标板列表，块原上纸/分蘖选择保留。迁入/撤销成功都调用原 `refreshTrayState` 所接 refresh 回调，并通知当前板 hook 排队重读；失败与“已保存但回读失败”分别显示。只跨 HTTP 传 placement IDs 或 batch ID，没有 TrayEntry 几何/metadata 快照回传。

成功收据按 source note 保存在应用会话内的模块级索引，支持多批逐次撤销与真实路由往返；UI 明确提供 `Open board` / `Undo move to board`。标准纸历史仍保持既有 undo/redo，不伪造本单 redo。板读写重用已有队列，重读不覆盖后续保存；离开源纸的在途搬迁仍保留原纸收据，不刷新其他纸。

### 3. 两况几何申报

| 来源情况 | 落板规则 / 实跑样本 |
|---|---|
| 历史保全几何 | x/y/width/height/rotation/z_index 原值映射（width→w、height→h，scale=1、pinned=false）。server fixture shape `(-120,80,240,160,17)` 原样；client smoke shape `(120,48,96,60,27)` 的位置/尺寸/rotation 原样显示。CG fixture 原 rotation=21 保留在源快照。 |
| 13.2 归零新 tray | 仅当 x/y/width/height/rotation 全为0才走默认网格。起点 `(40,40)`，四列，步长320×240，尺寸280×180；以当前板 member+visual 数量为起序，只给零几何项推进格位。server image 原五项全0→`(40,40,280,180,0)`；client 对 image 同样采样 x/y/w/h=40/40/280/180。原零值仍在快照，未宣称恢复旧摆阵。 |

connector 显示点始终是 visual 局部坐标；原扩展不改。先分配全批目标布局，再求同批唯一 object 端点的目标 anchor，减 connector 目标原点，避免零几何绑定端点仍缩在0处。未迁 object 的备份坐标与裸点保留相对原 connector 的偏移。历史裸点 fixture `(-211,43)/(540,801)` 全量留存，局部显示点 `(-301,-97)/(450,661)`；零几何裸点 `(-200,20)/(400,900)` 仍以原偏移显示。dashed/dotted、stroke/width、箭头/圆点标记由板 renderer 读取；不强转 board_edges。

### 4. 验证实跑

server 仅合成 `:memory:` 数据库，使用生产 schema/迁移与真实 router，认证后的 fixture userId 注入；HTTP 服务只监听随机 loopback 端口并关闭，未调用应用启动入口。client 使用 jsdom，mock HTTP/图片读取边界；生产 Tray hook/sidebar、board repository/hook/renderer 参与冒烟。Vite/Vitest 均设置 `COINCIDES_VALIDATION_ENV_DIR` 指向本次创建的空目录（主线程 `.codex-tmp/v13-s3-empty-env`；Tray 子任务 `client/.codex-tmp/v13-s3-tray-empty-env`），避免自动读取 .env。

| 验证 | 最终结果 |
|---|---|
| server `node node_modules/typescript/bin/tsc --noEmit` | PASS（server 施工子任务实跑） |
| server `npm.cmd run build` | PASS（主线程）；manifest check、tsc、manifest复制完成，既有递归 JSON schema 提示保留 |
| client `node node_modules/typescript/bin/tsc --noEmit` | PASS（主线程与 Tray 子任务均实跑） |
| client `npm.cmd run build` | PASS（主线程，最后连线圆点显示修正后再次完成）；既有 taskStore 动静态混用 / 大 chunk 提示保留 |
| `server/src/__tests__/v13BoardTrayRelocation.test.ts` | **7/7 PASS**（server 施工子任务）：混合五项迁入与全列撤销；迁入/撤销事件失败注入全回滚；块混入整批拒绝；后改几何/新边保护；多 placement 端点歧义；源 Project 删除后图片与批次存活；零几何连线；源 table/backing 后改拒绝覆盖 |
| client 合并定向7文件 | **33/33 PASS**（主线程）：boardRepository 10、BoardRelocatedVisual 2、useBoard 5、BoardPage.smoke 5、useTrayRelocation 5、旧 useTrayController 3、trayService 3 |
| 最后小修定向复验 | connector 圆点/箭头显示断言补齐后 `BoardRelocatedVisual.test.tsx` **2/2 PASS**，随后 client build PASS；其余已通过项未重复扩大执行 |
| 只读独立复核 | 先发现零几何 connector 与 undo 依赖检查缺口，修正后复核无新增实质 finding；未替代测试或 HQ 放行 |
| 工作树检查 | `git diff --check` PASS；暂存区空；共享类型/schema/坐标契约/执行器未修改；开工已有个人与审计未跟踪文件保留 |

**本单冒烟链**：合成纸宿主挂生产 Tray → 选择 shape/image/table/connector/CG 五项、块不选 → 选跨 Project 的库级板 → 一次 POST 仅五个 placement IDs → 原准备区只余块 → `Open board` 真路由进入生产 BoardPage，核对历史 shape、零几何 image、table cell、connector 局部点/虚线及 CG → 双击 CG 回源纸宿主 → receipt 仍在，点击 Undo → 六个原准备区 checkbox 回来（其中块仍只供分蘖）→ 再进板无迁入画物/成员。额外检验当前板订阅通知重读与解除订阅、回读失败仍留撤销、失败列表不伪装空库、在途切纸不刷新错纸。该链是 **fixture/jsdom + 生产组件**，不是用户库/完整浏览器/Henry 走查。

合并时亦实跑单2原 BoardPage 5项冒烟：板zoom=1.2后原纸760内容宽、904×1278纸幅、块 `(0,40,760,88)`、字号16.7/行高24.5及三档采样仍相等，未改纸内几何/三档。

复现命令（各自目录；client 先设置上述空 env 目录变量）：

```text
server: node --import tsx --test src/__tests__/v13BoardTrayRelocation.test.ts
server: node node_modules/typescript/bin/tsc --noEmit
server: npm.cmd run build
client: node node_modules/vitest/vitest.mjs run src/pages/Boards/BoardRelocatedVisual.test.tsx src/pages/Boards/boardRepository.test.ts src/pages/Boards/useBoard.test.tsx src/pages/Boards/BoardPage.smoke.test.tsx src/pages/Notes/canvasEngine/hooks/useTrayRelocation.test.tsx src/pages/Notes/canvasEngine/hooks/useTrayController.test.tsx src/pages/Notes/canvasEngine/trayService.test.ts
client: node node_modules/typescript/bin/tsc --noEmit
client: npm.cmd run build
```

### 5. 未做与边界

- 未接浏览器硬刷新后的历史批次枚举/撤销面；现应用会话索引可跨路由，硬刷新后 server `operation_batches` 仍保留，但 UI 不列旧批次。未实现 redo、批次总面板、跨批端点重绑定、其他画物编辑器、材料编译或新事件面。
- 源纸/原内容已删除、变更，或板上目标已编辑/连新边时，撤销明确拒绝；不靠恢复旧内容覆盖后作。多 CG mounts 或不能唯一解析的 connector 实例属于明确拒绝状态，不选首个伪装成功。
- 未触用户库、未跑用户数据迁移、未读 .env、未输出凭证/key、未操作3001/5173；未暂存、commit、push、PR。未改纸行为/坐标v2语义/执行器/块分蘖语义；没有新增依赖或迁移。
- **未运行整套 `npm run verify:v2-bn8-runtime`**：按本单§二与 active 段 plan 的定向/禁马拉松/禁安全类测试纪律执行。整套命令包含广泛测试与 changed-file-secrets 扫描，未将该门记作 PASS 或已豁免；段收口与 Henry 走查仍交 HQ。
- 未修改 current-state、路线图、历史单结果或操作/权限文件。CodeGraph 先尝试但 CLI/MCP 不可用，rg亦不在PATH，检索限定所需源码/指定文档后回退 PowerShell。

### 6. Numstat

已跟踪文件使用普通 `git diff --numstat -- client server`；新文件未暂存，按全文新增行计。**20文件 +1304/-10**，不含本工单仅追加的 Result。

| 文件（相对仓根） | + | - |
|---|---:|---:|
| client/src/pages/Boards/BoardPage.tsx | 4 | 0 |
| client/src/pages/Boards/Boards.module.css | 10 | 0 |
| client/src/pages/Boards/boardRepository.test.ts | 14 | 0 |
| client/src/pages/Boards/boardRepository.ts | 32 | 0 |
| client/src/pages/Boards/boardTypes.ts | 13 | 0 |
| client/src/pages/Boards/useBoard.ts | 4 | 0 |
| client/src/pages/Boards/BoardRelocatedVisual.tsx | 138 | 0 |
| client/src/pages/Boards/BoardRelocatedVisual.test.tsx | 87 | 0 |
| client/src/pages/Boards/boardEvents.ts | 11 | 0 |
| client/src/pages/Notes/NoteDetail.module.css | 2 | 1 |
| client/src/pages/Notes/canvasEngine/hooks/useTrayController.ts | 54 | 6 |
| client/src/pages/Notes/canvasEngine/layers/NoteTraySidebar.tsx | 40 | 2 |
| client/src/pages/Notes/canvasEngine/trayService.ts | 6 | 1 |
| client/src/pages/Notes/canvasEngine/trayRelocationHistory.ts | 32 | 0 |
| client/src/pages/Notes/canvasEngine/hooks/useTrayRelocation.test.tsx | 251 | 0 |
| server/src/routes/boards.ts | 34 | 0 |
| server/src/services/canvasAssets.ts | 11 | 0 |
| server/src/validators/boards.ts | 4 | 0 |
| server/src/services/boardTrayRelocation.ts | 269 | 0 |
| server/src/__tests__/v13BoardTrayRelocation.test.ts | 288 | 0 |
