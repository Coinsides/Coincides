> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.3 单 3=准备区→板搬迁,client+server 中单;13.3 末单)
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
