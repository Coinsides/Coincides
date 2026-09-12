> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State(契约)
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 是(page_frame_local 坐标契约与 Layout 态定位的收敛权威;此前散在 handoff/recon 的记载以本档为准)
> **上游**: 13.5 专场裁定③(claude-log 09-09 §84 前后)+13.5 plan 补遗二(墙案三裁定+工程件)+D1 工单两补遗(`handoffs/2026-09-11-v13-5-d1-walls-order.md`)+s4 坐标侦察(`analysis/2026-09-07-v13-1-s4-coordinate-contract-recon.md`)+09-12 规划场 §三/§七(墙编辑并入 Layout,Henry 拍)

# page_frame_local 坐标契约 + Layout 态定位

铸版说明:本契约的权威此前散在 D1 工单、s4 侦察、13.5 plan 补遗二等处(13.5 plan 补遗二明载"随此题补铸版")。本档收敛为唯一权威;历史散点仍在原档留存,不改写。

## 一 · page_frame_local 坐标契约(D1 后现役)

1. **原点=内容区原点**:`page_frame_local` 的 (0,0) 是该帧**内容区**(墙内)左上角,⛔ 纸面左上角。墙(边距)不属于坐标系内部。
2. **墙=逐帧持久化的 contentInset**:存 `page_frame_extensions.content_inset_json`;A4 preset 缺省=内容区 760 + 左右各 72(页宽 904)。纸型预设(B1c:A4/Letter/Web 长页)给缺省值,建后可调(D1 拖墙线+数值框)。
3. **墙动=原点动,零坐标改写**:调墙时全体块**存储坐标不变**,视觉整体跟墙走(贴左墙者贴新墙)。⛔ 任何"墙动改写块坐标"的实现(13.5 前的"坐标地雷+rebase 案"已撤案)。
4. **width_mode 即绑定态**:`auto`=每渲染按内容区现宽重算(≈铺满,墙拓宽自动长到墙);`manual`=用户定宽,保存储宽。`stored.x` 对两态都仍是真相。
5. **auto 块的一切分类/消费走派生盒**:`deriveFrameLocalAutoWidth`(`client/src/pages/Notes/canvasEngine/placementContractService.ts`)是唯一合法宽度来源;⛔ 消费 auto 块的陈旧存储宽(D1 停线一的 F13 同族病根;分类链 `toStoredLayout`/`isCanvasWorkspaceBlock` 已改派生盒)。`DEFAULT_PAGE_CONTENT_WIDTH`(760)已由封顶常量改为逐帧派生。
6. **clamp 规则(唯一的坐标写例外)**:墙**内收**时,侵越右墙的 `manual` 块在**同一事务**内 clamp,只写违例块,入撤销栈(`usePlacementHistory`);`auto` 块零写(宽度现算自适应)。
7. **横移语义**:auto 块横拖压墙变窄(F13 行为被墙模型追认为语义正确);"脱绑保宽"为候真实反馈的备选补丁,未实装。
8. **越界例外面**:墨水(ink)按现契约可越入边距区(纸边写画);媒体块不入铺满、同受墙 clamp;把手住边距车道(B10 常显把手,把手超框=正解)。
9. **机械闸**:`client/scripts/canvasRuntimeBoundaryCheck.mjs` 断言本契约面(E1 后断言随现役选择器);动本契约面(CSS/DOM/分类链)的单,收口必跑受影响秒级静态门。

## 二 · Layout 态定位(专场裁定③,2026-09-11 Henry 拍)

1. **降格为"排版工具态"**:显式进出的整理工位,⛔ 杀 ⛔ 扩;**终审推迟至 V14 自动分页落地后**(分页+断块+折缝可能吸收其大部分职能)。
2. **墙编辑并入 Layout 态**(09-12 规划场,Henry 拍):显示归皮(`--sk-wall-idle`,B1d 已落),**编辑归工具**——平时墙零 pointer 命中(误触绝除),入 Layout 态才可拖墙;⛔ 新增独立"墙编辑"钮(B1e 实装)。
3. 纸型/尺寸调节的交互归宿=「笔记外观」浮卡+Layout 态(看着纸选,09-12 拍,排 V14 纸型自由化束);建纸时选型已裁撤销。

## 三 · 历史包袱登记(读旧档时的防雷)

- Canvas mode / Layout mode 割裂(EX-S5-02,Henry 自评"很垃圾但地基期暂留")=裁定③的问题背景;CANVAS_MODE_RETIRED 面已产品不可达,其死代码随 13.6 清册"删或复活"二选一。
- s4 侦察(frozen)中的 A/B 候选与污染判定是**侦察记录**,不是现役契约;现役以本档 §一为准。
