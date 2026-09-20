> **状态 (Status)**: done(builder 二轮施工交工作树；非 git/secrets 23 组件最终通过；server 两项 Python 环境红、HQ 双门与放行待收口；行内媒体仍属 F2 候裁)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 组件墙 · B5 图片编辑 v1(媒体主单缩水版,组件墙收官砖)
> **上游**: 09-12 规划场 §十三.5(图片编辑=Word/Notion 式裁剪旋转,全媒体块通用,V14 媒体主单射程)+§十三 取景框交互(照抄头像裁剪:非破坏,原图恒存,槽存框参数)+ 现物:取景框机制(卡面 card 框 v1+A3 page 框,geometry.ts 双框共用算法)+ image_object_extensions.fit(第一颗螺丝)。**设计裁量已完成,照拍施工⛔重开设计。**

# B5 · 图片编辑 v1

**性质**:纸上媒体图块获得非破坏编辑。组件墙收官砖(行内媒体候 F2 裁定,另单)。

## 一 · 非破坏编辑参数

1. 媒体图块新增编辑参数(存 `image_object_extensions` 族,⛔新表;字段申报):**裁剪**(crop x/y/w/h+zoom,复用取景框双框算法⛔第三套)+**旋转**(90° 步进 0/90/180/270)+重置;原资产恒存 canvas_assets,参数可逆;
2. 消费面同源:纸面渲染/打印/导出/Overview/缩略共用同一参数解算;
3. 撤销:参数编辑入现役撤销栈。

## 二 · 编辑交互

1. 选中媒体块→「编辑图片」入口(块控制条/右键菜单,申报落点)→浮层编辑器:取景框拖拽+缩放(照抄卡面封面交互)+旋转钮+重置;
2. Esc 取消 / 保存落参数;readonly 态零入口;
3. 装饰件/贴纸⛔本单(公民三族的装饰件族=设计室贴纸抽屉,另案)。

## 三 · 验收与禁区

1. 定向:参数校验与往返+四档旋转渲染+裁剪几何(复用算法与卡面结果一致性断言)+撤销/重做+打印导出 Overview 同源+readonly 零入口;client 全库+server 全量;既有回归零破(A1-B3 八砖/卡面封面 card 框/A3 page 框/媒体块现役行为);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 补图片编辑条目;
3. 证据落 `docs/audits/2026-09-20-b5-image-builder/`(蒸馏件),原始日志留 `.codex-tmp/b5-image/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新块型⛔新真相表;⛔行内媒体(F2 候裁);⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程;**新 CSS 自定义属性名 `--sk-` 后段 ≤18 字符**——防密钥扫描器 sk- 长串假阳性,先例:B3 headrule 改名)。Result:参数字段申报+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

**2026-09-20 · Codex builder · STOPPED（工单冲突停线；未实现、未完成，header 不翻 done）。**

现物考古确认：§一.1 指定的 `image_object_extensions` 并非现役纸面媒体块的参数承载族。纸面图片是 `NoteBlock(block_type='media')`，资产身份存 `metadata.media`；`server/src/services/mediaBlocks.ts:16` 明文说明不使用 image extension，`server/src/__tests__/v13MediaBlocks.test.ts:90` 还明确断言媒体创建后该扩展表行数为 0（本轮只读、未跑）。

扩展表现役主键外键指向 `canvas_objects`（`server/src/db/migrations/041_v2_canvas_image_assets.ts:33`）。块投影 handler 写 content mount（`server/src/services/canvasObjects.ts:1343–1370`），image handler 才写图片扩展（`:1423–1430`）；image 禁止 content mount（`:1019–1023`），已有对象也禁止换 kind（`:2026–2027`）。直接附挂扩展还会触发块生命周期的不可丢弃检查（`server/src/services/noteBlockLifecycle.ts:886–891`）。因此不能把现役 `fit` 当作纸面媒体已有接点直接扩展；需要 HQ 明确媒体参数承载身份、桥接/生命周期规则及可修改范围。本轮未自行改存 metadata、改注册/保存边界或建立桥接。

取景框共用算法已读：`geometry.ts:15,24,37,57` 分别为 cover fit、位置约束、百分比裁剪、跨比例焦点保持。消费面已定位：纸面/Overview/缩略走 `MediaBlockProjection.tsx:8–39` 的 metadata 资产链；打印在 `NoteReadOnlyPageContent.tsx:70` 走占位，导出预览在 `ExportPreviewLayer.tsx:36–45` 走占位。只改 generic ImageCanvasObject 不会覆盖纸面媒体。

- **字段/入口申报**：新增字段 0，编辑入口 0；现役扩展呈现字段为 `fit,caption,alt_text,natural_width,natural_height,metadata`。crop/zoom/rotation 未落库。
- **测试数字**：定向/client 全库/server 全量均 0 次执行；package.json 静态枚举得非 git/secrets 的 **23 组件，0/23 执行**。因冲突停止，不声称任何测试或完整验证门通过；git/secrets 仍留 HQ。
- **说明书**：未改 `current-state/app-operating-manual.md`，因为图片编辑尚未交付，不能登记为现役能力。
- **未做项**：实现、迁移、UI、撤销/重做、各面同源及所有验收均未做；原资产未动；无 git 写操作、无 commit。
- **证据**：[B5 builder 停线报告](../../audits/2026-09-20-b5-image-builder/README.md)（逐件行号、字段、消费链、边界申报）；原始采样及门清单留 `.codex-tmp/b5-image/`。工作树交 HQ，等待工单对齐后重派。


## 补遗一(2026-09-20 · HQ 裁定:参数承载点勘误,消解 §一.1 冲突)

停线成立,合同缺陷在 HQ(引现物当承载点却未核其归属链——`image_object_extensions` 外键系于 canvas_objects,与纸面媒体块无接点;现役测试且断言媒体块零扩展行)。裁定即时生效:

1. **§一.1 的承载点勘误为**:编辑参数住 `NoteBlock.metadata.media` 族内新键 `edit_v1 = { crop: {x,y,w,h}|null, zoom: number|null, rotation: 0|90|180|270 }`(与资产身份同居;走现役块 metadata 保存门;缺省/null=零编辑,存量媒体块零迁移);⛔碰 image_object_extensions⛔任何桥接;
2. 取景框算法照旧复用 `geometry.ts`(纯客户端几何,与存储层无涉);
3. **同源消费收窄为「凡真渲染图像处皆消费参数」**:MediaBlockProjection(纸面/Overview/缩略)必须消费;打印与导出预览今日为占位面——占位照旧,⛔本单为其实装图像渲染(申报现状即可);
4. 其余条款原字不动(含 ⛔新表⛔行内媒体与全部射程禁区)。一轮停线 Result 保留为档;续派恢复施工,完工后另起「## Result(二轮)」。

## Result(二轮)

**2026-09-20 · Codex builder · 按补遗一完成施工，工作树交 HQ。此处 done 表示 builder 施工交付，不表示完整验证门通过或 HQ 放行。** 一轮 Result 与停线证据原样保留，本轮未再遇到需要重开裁定的合同冲突。

**参数申报**：唯一新增持久化键 `NoteBlock.metadata.media.edit_v1 = {crop:{x,y,w,h}|null,zoom:number|null,rotation:0|90|180|270}|null`。缺省/null 零编辑、存量零迁移；crop 为旋转后图像包围盒百分比，zoom 为 null 或 1–3，显式 crop 不再叠乘 zoom。保存仅走既有块 metadata PUT，保留 metadata/media 兄弟键、原资产身份与原图字节；未碰 `image_object_extensions` 或建立桥接。

**入口与行为**：选中媒体块的块控制条新增「编辑图片」，复用现役 cover 几何和已安装的 Cropper；支持拖移裁剪、缩放、四档旋转、重置、Esc/Cancel、Save 及失败重试。保持当前取景比例，旋转同时旋转窗口；readonly/占位/未选中无入口。编辑进入同一 Note 串行撤销栈；undo 恢复原缺省/null/参数，redo 恢复编辑。浮层隔离背后笔记快捷键，关闭后恢复。纸面/Overview/缩略共用 `MediaBlockProjection` 的参数与显式裁剪窗口；打印和导出预览仍为占位，未扩建图像渲染。

**逐件定位**（client 短路径相对 `client/src/pages/Notes/canvasEngine/`；完整含测试/CSS 清单见蒸馏件）：

| 文件与行号 | 交付 |
|---|---|
| `shared/types/mediaImageEdit.ts:12,24`；`shared/types/index.ts:11` | 独立参数类型、校验与导出；不改 TextFlow schema。 |
| `server/src/services/mediaBlocks.ts:8,32,48`；`server/src/__tests__/v13MediaBlocks.test.ts:98,126,323` | 现役资产断言内校验、metadata 往返与原资产不变验证。 |
| `mediaBlockService.ts:6`；`mediaImageEdit.ts:12,22,26` | metadata 读取、cover 算法复用、旋转/crop 共用几何。 |
| `blocks/MediaImageEditor.tsx:22,75,114,152,172`；对应 `.module.css:1` | 编辑浮层、焦点/键盘、草稿与精确保存。 |
| `blocks/MediaBlockProjection.tsx:40,48`；对应 `.module.css:1` | 所有真实图像消费编辑参数，显式 SVG clipPath；零编辑保持原投影。 |
| `hooks/useMediaImageHistory.ts:17,28,44` | 现役串行历史与可重试 undo/redo。 |
| `hooks/useNoteCanvasDataAdapter.ts:1799`；`hooks/useNoteCanvasRuntimeController.ts:509,653` | 现役 metadata 保存、保留兄弟键、路由生命周期与历史接线。 |
| `layers/NoteWritingSurfaceLayer.tsx:250,1848`；`layers/BlockControlBarLayer.tsx:107`；`layers/BlockEditorLayer.tsx:537,678` | 保存回调、块控制条入口、readonly/占位门控与成功关闭。 |
| `blocks/MediaImageConsumption.test.tsx:49,76` | 真实纸面/Overview/缩略同参及 beforeprint 占位回归。 |
| `docs/agent-ops/current-state/app-operating-manual.md:37,38` | §一已补图片编辑操作、参数/保存/撤销及消费边界；索引按现役生成器更新。 |

**测试收据**：

- 非 git/secrets 的 **23 组件最终结果均 PASS**，包括 client/server 构建、model/performance smoke 与 docs 检查；分次复核，初始失败保留。`git diff --check`、`check:changed-file-secrets` 未运行，留 HQ；**不得据此称完整 `verify:v2-bn8-runtime` 已绿**。
- client 最终全库 **219 文件 / 2248 测试通过**，实际命令 `npm --prefix client run test:unit -- --maxWorkers=4`，默认 timeout、零排除。前两次默认并发失败原样留档，不替换为通过结论。
- client 定向：保存/历史/入口 **144/144**；几何/投影/初版浮层 **28/28**；最终键盘/消费链 **12/12**。集合有重叠，不累加为独立测试总数；最终源码已由全库覆盖。
- server 定向 **13/13**。server 全量已完整执行，初轮 **779 tests / 774 pass / 5 fail / 0 skip**，现役 runner 自动恢复三个 IPC 文件失败后仍 **FAIL**：`v2SourceMineruWiring.test.ts:60` 的 `python.exe` 不在 PATH；`v2SourceRegionCells.test.ts:196,203` 硬编码 venv 指向不可访问的 Python 基址。未改测试/解释器配置、安装依赖或排除用例；详见 server 收据。
- 真实 Chrome 组件 smoke 验证旋转、缩放拖移、精确重开、Reset+Esc/Save 和裁剪留白，无 console error/warn；fixture 使用真实组件及 Cropper、替换资产 HTTP adapter、保存到 React state。该证据不冒充已登录应用/DB 的浏览器端到端验收；验证页与服务已关闭。

**未做与待收口**：HQ 两门、两项 server Python/MinerU 环境红的收口，以及主观体验验收/放行。打印/导出占位、行内媒体、自由改变裁剪比例未扩建。没有新表/迁移/块型/依赖/安全对抗用例；未改 Relation/Agent 机关、写门/注册表、TextFlow 真相 schema 或 page_frame_local 九条契约。未进行 git 写操作或 commit，未动操作指令/权限配置。

**证据**：[二轮逐件交付](../../audits/2026-09-20-b5-image-builder/round2.md)、[23 组件收据](../../audits/2026-09-20-b5-image-builder/gates-round2.md)、[server 收据](../../audits/2026-09-20-b5-image-builder/server-round2.md)。所有原始执行、失败历史、源码逐行采样/SHA-256 及浏览器观察留 `.codex-tmp/b5-image/`，一轮原始记录未覆盖。
