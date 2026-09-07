> **状态 (Status)**: active(13.0 施工图三 · 迁移映射表;13.2 拆单依据)
> **层 (Layer)**: 分析 / 设计
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 是(野地退役的去处矩阵与回滚协议);工程细节以拆单 K-0 侦察为准
> **上游**: 方向档(纸与板)· 图二(板数据模型/史记 v0)· v13 总 plan 13.2 段 · 035 迁移现物(canvas_placements/canvas_objects/content_mounts)

# 13.0 图三 · 野地退役迁移映射表

## 〇 · 定位与现物地基

野地=`canvas_placements.surface='canvas_workspace'` 的行(035 cutover 已把画布真相收进列级,`boundary_role` 三分:inside/outside/crossing)。迁移对象三类:野地上的**块**(placements)、野地上的**画物**(canvas_objects)、野地上的 **mount**(content_mounts)。⛔ 本图不迁 `note_block_placements.display_overrides_json` 里的 legacy layout JSON(历史地层,原地封存)。

## 一 · 去处矩阵(机械规则,影子跑逐行判)

| 存量类 | 判定 | 去处 |
|---|---|---|
| crossing 块(骑缝) | 与主帧内容区重叠 ≥50% | **收编进该帧**(位置 clamp 进 content box;受「允许溢出」改判影响,候走查① Henry 批) |
| crossing 块 | 重叠 <50% | **托盘** |
| outside 块(纯野地) | 一律 | **托盘** |
| 野地画物(canvas_objects) | 一律 | **托盘·画物区**(保全态;13.3 板落地后提供"托盘→板"搬迁动作,⛔ 13.2 不建板) |
| 野地 mount | 一律 | **托盘·mount 区**(同上) |
| inside 块 | 不动 | 原地(不在本次迁移射程) |

- **附录页⛔ 不做自动去处**:它是走查②时人的改判选项(把托盘里成段内容一键铺到附录页),机械规则只认"收编/托盘"两个出口——判定越少,核对单越硬;
- **托盘的数据形态**:`surface` 枚举新增 `'tray'`(本版唯一新增值);托盘是列表不是画布——几何列对 tray 行无语义,只认 `order_index`;`canvas_workspace` 值**停写**(⛔ 删值⛔ 删列,历史地层原地封存——字面量登记面教训:退役=新写禁令,不是删除)。

## 二 · 迁移协议(五步,可回滚)

1. **备份**:`canvas_placements` / `canvas_objects` / `content_mounts` 三表快照副本表(带 `_backup_pre13_2` 后缀,只读);
2. **影子跑**:dry-run 按 §一逐行判,产**核对单**(见 §三),零写入;
3. **Henry 扣扳机**(真实数据迁移的唯一人控点,plan 总纲既定);
4. **迁移执行**:逐行改写去处;**全程经书记官记 `migrated` 事件**(channel=迁移脚本名,objects=涉及行,summary=核对单摘要)——**events 表建表是 13.2 的前置工序**(账本先于历史,图二 §八.3);
5. **复测+回滚待命**:复测核对单(§三守恒式);不符即回滚(从备份表恢复+记 `rolled_back` 事件)。

## 三 · 核对单格式(零丢失的机械定义)

按 note 逐行:`note_id | inside 块数 | crossing 块数(收编 n / 托盘 m) | outside 块数 | 画物数 | mount 数 | 迁移前总数 | 迁移后总数(帧内+托盘) | 守恒 ✓/✗`。

**守恒式:迁移前每一行存量 = 迁移后(原地+收编+托盘)之和,逐 note 全等;⛔ 任何"约等""忽略少量"。**核对单本身入档(audits/),复测用同一 SQL 重跑全等。

## 四 · 退役语义(随迁移同版生效)

- `NoteCanvasMode` 双模(`'page' | 'canvas'`)退役:笔记只剩纸叠视口(13.1 已锁);canvas 模式入口摘除;
- `surface='canvas_workspace'` / `boundary_role='crossing'` 新写⛔(类型收窄在 client,列值兼容在库);
- 分蘖动作 v1(选中块→抽成新笔记)与托盘同版落地——托盘不是垃圾场,是**未上纸块的中转家**,出口有三:上纸/分蘖成新纸/留置。

## 五 · K-0 侦察清单(13.2 拆单必做)

1. **双真相现状**:035 cutover 后 client `readStoredLayout`/`NOTE_LAYOUT_KEY` 是否仍是读路径一部分(placementService.ts 现役在读 `canvas_layout`)——迁移必须只动"现役真相",K-0 先画清读写链;
2. **存量普查实测**:Henry 库跑 §三 census SQL,拿真实分布(crossing 实际几行?野地画物几件?)——影子跑规则的阈值(50%)按实测校准;
3. `surface`/`boundary_role` 的**字面量登记面全仓 grep**(0831 教训:validators/index.ts、canvasSurfaceAuthority、导出策略 `exclude_workspace` 族等);
4. 托盘 UI 的最小形态与 13.1 视口的拼接点(托盘住视口侧栏还是独立面板——UI 细节归 13.2 段 plan,不在本图);
5. 迁移编号续位;备份表命名与清理触发器(收官后保留期,归停车场仓外快照条款一并问 Henry)。
