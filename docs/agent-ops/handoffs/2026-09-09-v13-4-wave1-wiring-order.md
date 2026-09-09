> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次一(`plans/v13-4-projection-itemization-plan.md`);现物证据=单 0 侦察(`analysis/2026-09-09-v13-4-s0-recon.md`)+对谈档 §一
> **单号**: 13.4 单 A · 接线批+生命周期批

# 13.4 单 A · 接线批 + 生命周期批

**使命**:把"服务端已备、UI 缺席"的板契约接上,并补齐板/笔记的生命周期动词。五件套,纯接线为主,⛔ 引入新数据概念。

## 一 · 交付面(五件)

### A1 · 板改名 UI
- BoardPage 内板名内联编辑(双击标题或编辑钮),接既有 `PATCH /boards/:boardId`(`server/src/routes/boards.ts:80`);空名拒绝(沿开板 80 字上限);
- BoardList 卡片改名不做(最小面=板内改名)。

### A2 · 落板物一等公民化
- freehand 与搬迁 shape/image/table/connector(board_visuals)选中后可**拖移**;shape/image/table 可**缩放**(resize 手柄),freehand/connector 缩放不做;
- 接既有 `PATCH /boards/:boardId/visuals/:visualId`(`server/src/routes/boards.ts:202`,client `boardRepository` 需补 updateVisual 调用方);复用 member 拖拽手势管线(`BoardPage.tsx` begin/move/end 族);
- 落库时机与 member 一致(end 时 PATCH);失败走 useBoard 既有错误面。

### A3 · 连线 label + 方向
- select 工具下双击边→内联输入 label,PATCH edges(`routes/boards.ts:178`;`boardRepository.updateEdge` 已有实现无调用方);清空=删 label;
- 方向箭头:选中边的 selectionBar 加"无/单向/双向"三态切换,存 edge style 字段,渲染补 marker;
- label 渲染已在(`BoardPage.tsx` L385 附近),对齐即可。

### A4 · 删板
- server 新增 `DELETE /boards/:boardId`:事务内删 members/edges/visuals+板行;**魂(purpose)留存不删**(魂是身份,板是场地;一魂一板唯一索引随删解除占用,同魂可再开新板);
- 走 runRecordedAction 记事件 verb `board_deleted`(新 verb 开闸,HQ 已裁;objects 记 board id+title 快照);
- UI:BoardList 卡片菜单+板内菜单"Delete board",**确认框必须明示射程**:"将删除本板及其 N 件画物、M 条连线与全部摆位;笔记与知识内容不受影响"——搬迁来的画物真身随板删除,数字要真算;
- ⛔ 回收站/软删(候需求)。

### A5 · 笔记 delete 落真
- 现物:笔记 More 浮层 delete/archive/duplicate 均 aria-disabled 占位(`NoteChromeLayer.tsx:623-627`);
- 本单只做 **delete**:优先软删语义(deleted/archived 标记+列表过滤+可恢复入口);先侦察 server 现物(notes 路由有无删除/归档面),按现物选最小实现;若仅硬删可行,**停线举证**候 HQ 裁;
- duplicate/archive/import/export 本单⛔(占位保留);
- 删除确认框明示:"笔记入回收/归档,可恢复"(按实装语义写真话);若笔记有板挂载(board_members 引用),删除后板上卡按既有 missing/unavailable 降级显示,⛔ 静默消失——验证一条。

## 二 · 裁量与停线

- 停线举证不改判:现物与本单假设冲突(行号漂移/字段缺失/A4 级联有未列品类)→ 停线申报,⛔ 自行改设计;
- A2 的 pinned 语义不适用 visuals(无 pinned 字段)——不造新字段;
- 书记官面:除 A4 的 `board_deleted` 外⛔ 新 verb(改名/挪画物/边 label 均不入钢,client 操作不入 events 的图二裁定不变)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;
- 冒烟五条:①改板名重开仍在;②挪一笔画+缩放一图形,重开位置保持;③加 label+切单向箭头,重开保持;④删一板(含≥1 画物),确认框数字正确,同魂可再开新板,events 见 board_deleted;⑤删一篇有板挂载的笔记,恢复后板卡回活,删除期板卡可见降级;
- 既有测试面回归:`useBoard.test.tsx`/`BoardPage.smoke.test.tsx` 不破。

## 四 · Result 格式(工单尾追加)

`## Result`:numstat + 五冒烟逐条结果 + 未做清单 + 停线事项(如有);**⛔ commit**(工作树交 HQ 代账);⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试。
