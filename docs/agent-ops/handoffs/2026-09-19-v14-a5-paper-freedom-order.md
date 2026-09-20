> **状态 (Status)**: done(builder 一轮交付+HQ 收口全绿,2026-09-20:client 204 文件 2066/2066 亲跑定案;git diff --check+secrets(59 文件)双门绿;server 余 2 红=Python/MinerU 环境基线;纸面线五砖至此封顶)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-19
> **单号**: V14 纸面线 · A5 纸型自由化束(收官砖)
> **上游**: 09-12 规划场 §四(纸型自由化全束,Henry 拍裁向)+ `current-state/page-frame-and-layout-contract.md` §二.3(纸型/尺寸调节交互归宿=「笔记外观」浮卡+Layout 态;建纸时选型已裁撤销)+ B1c 纸型预设现物(a4_portrait/letter_portrait/screen_note/custom)+ 皮浮卡现物(09-13 skin-float-card 单)+ A1 异形页参数已法定(逐帧覆写,commit 63292986)。**设计裁量已完成,照拍施工⛔重开设计。**

# A5 · 纸型自由化束

**性质**:纸的尺寸从「建纸时一锤定音」解放为「随时可调、每页可异」。纸面线收官砖。

## 一 · 撤建纸选型

1. 建笔记流程移除纸型选择(B1c 交互失误已认账):新纸一律默认 A4 纵向;建纸对话零纸型 UI;
2. 既有 page_format 存量数据零迁移(读侧兼容照旧)。

## 二 · 纸型调节新家:「笔记外观」浮卡 + Layout 态

1. 浮卡加「纸型」区:预设族切换 + 尺寸读数;**看着纸选**(纸即预览,⛔另做预览);
2. **预设族扩全**:A5/A4/A3 纵横 + Letter/Legal(现物 A4/Letter 之外补齐);Web 长页保留现役(单帧生长活标本,⛔纸型族化⛔降级——09-12 §十四.6 裁定);
3. **单位=厘米/毫米,⛔像素**:UI 显示与输入均物理单位(现物 getPageFramePhysicalMapping 先考古复用换算);存储仍像素零变;
4. 换纸型=全笔记级动作:全帧换族,A1 引擎自动重排(跨页块按新版心重排),入撤销栈;
5. Layout 态内可拖调页尺寸(数值框+物理单位),同墙编辑纪律(平时零命中)。

## 三 · 每页异形

1. 单页「异形」操作(Layout 态/页菜单):该页尺寸逐帧覆写(A1 已法定的参数,本单补 UI);新建页回笔记默认;
2. 异形页与装订段/页码/封面共处零破(A2/A3 回归);
3. 「恢复默认」单页动作=清除覆写。

## 四 · 验收与禁区

1. 定向:建纸零选型+默认 A4+预设族全员(A5/A3/Legal 新增)换型重排+物理单位换算往返(cm/mm↔px)+单页异形与恢复+撤销栈覆盖+Web 长页零变;client 全库+server 全量;既有回归零破(A1 分页/A2 装订/A3 封面/打印 Overview/墙九条/screen_note 现役行为);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 更新建纸与纸型调节条目;
3. 证据落 `docs/audits/2026-09-19-a5-paper-freedom-builder/`(蒸馏件),原始日志留 `.codex-tmp/a5-paper/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条(墙动原点动零改写等——纸型/异形只动帧几何参数,契约面零字);⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:预设族申报(名/几何/物理映射)+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

**From: Codex builder · 2026-09-20。施工完成，工作树交 HQ；本段不作放行。**

建纸零纸型选择、固定 A4 纵向；外观浮卡增加八预设与 cm/mm；整本换型经 A1 重排后原子保存并进入共享撤销栈。Layout 数值/页角拖调生成单页覆写，恢复默认清覆写，新建页继承笔记默认。Web 长页仍走独立单帧生长路径，无纸型族入口。

### 预设申报

| 预设 | 内部几何 px（宽×高） | 实际等比映射 mm（宽×高） |
|---|---|---|
| A5 纵向 | 637.104762×904 | 148×210 |
| A5 横向 | 904×637.104762 | 210×148 |
| A4 纵向 | 904×1278 | 210×296.880531 |
| A4 横向 | 1278.514286×904 | 297×210 |
| A3 纵向 | 1278.514286×1808 | 297×420 |
| A3 横向 | 1808×1278.514286 | 420×297 |
| Letter 纵向 | 904×1170 | 215.9×279.428097 |
| Legal 纵向 | 904×1488.941176 | 215.9×355.6 |

表内小数仅展示舍入，存储不取整。复用 `getPageFramePhysicalMapping`：A 系列 scale=0.8779875966831581，Letter/Legal=0.9026548672566371；mm=内部长度×scale×25.4/96。A4/Letter 现役整数几何保持，故高度与名义纸张尺寸有原有取整差异。Web 起始1120×720、原边距和非打印属性保留，`custom` 保持兼容；既有 `page_format` 零迁移。

### 逐件与证据

- 建纸：[CourseDetail.tsx:213](../../../client/src/pages/Courses/CourseDetail.tsx#L213)、[BoardNewNoteDialog.tsx:63](../../../client/src/pages/Boards/BoardNewNoteDialog.tsx#L63)；旧选择组件及 CSS 删除。
- 浮卡与 Layout：[NoteCanvasRuntime.tsx:51](../../../client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx#L51)、[PaperSizeControls.tsx:98](../../../client/src/components/Skin/PaperSizeControls.tsx#L98)、[usePaperSize.ts:42](../../../client/src/pages/Notes/canvasEngine/hooks/usePaperSize.ts#L42)；纸即预览，非 Layout 零拖调命中。
- 几何/继承：[paperSizeService.ts:84](../../../client/src/pages/Notes/canvasEngine/paperSizeService.ts#L84)、[pageFrameCollectionService.ts:192](../../../client/src/pages/Notes/canvasEngine/pageFrameCollectionService.ts#L192)、[pageStackCollectionService.ts:250](../../../client/src/pages/Notes/canvasEngine/pageStackCollectionService.ts#L250)。
- 重排/历史/存储：[paperSizeEditService.ts:18](../../../client/src/pages/Notes/canvasEngine/paperSizeEditService.ts#L18)、[useNoteCanvasDataAdapter.ts:1237](../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#L1237)、[canvasObjects.ts:1854](../../../server/src/services/canvasObjects.ts#L1854)。拖动起点独立于预览；换籍保持 auto 原始坐标宽高；事务解析目标纸型排字度量并尊重用户覆盖。续页重放保留后建页与装订/封面拓扑。
- 说明书义务已完成：[app-operating-manual.md §一:23](../current-state/app-operating-manual.md#L23) 至26行。
- 完整逐件行号、考古复用与验证索引：[builder 审计目录](../../audits/2026-09-19-a5-paper-freedom-builder/README.md)。原始日志：`.codex-tmp/a5-paper/`。

### 验证与未做项

- client 全库最终 **204 文件、2066/2066**，4 workers，无排除；最终定向28/28包含拖动反馈、存储布局及目标纸型排字回归。此前高并发 Board 书签/冒烟超时与编译诊断均留原始日志，不冒充首轮全绿。
- `verify:v2-bn8-runtime` 按 §四.4 拆跑 **非 git/secrets 的23组件**，逐组件最终证据见 [verification.md](../../audits/2026-09-19-a5-paper-freedom-builder/verification.md)。**不宣称完整验证门已绿**。
- server **98测试文件全部执行、零排除**：主套件首轮778项（774pass/4fail），两项IPC失败经既有runner隔离重试恢复，最终剩两项Python/MinerU环境失败；其他11组203/203，Agent harness14/14。各组有重复文件，不累加为去重总数。Wilderness完整27/27通过（约5m46s）。详见 [server-verification.md](../../audits/2026-09-19-a5-paper-freedom-builder/server-verification.md)。
- 隔离浏览器验证 A5/A3换型、cm/mm输入、恢复/撤销、刷新持久化、真实页角拖动及undo/redo、Web入口排除，见 [browser-verification.md](../../audits/2026-09-19-a5-paper-freedom-builder/browser-verification.md)。
- 未做 git写操作/commit/push/PR；git检查与secrets扫描留HQ；Python/MinerU两项环境复跑与主观验收/放行留HQ。无新增依赖、迁移、TextFlow真相schema或坐标契约正文改动；未碰Relation/写门/注册表/Agent机关，未新增安全对抗用例。
