> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次二单 2(段主菜);现物证据=单 0 侦察 §二(`analysis/2026-09-09-v13-4-s0-recon.md`,AnnotationRange 活链+五缺口)
> **单号**: 13.4 单 2 · text_range 上板(锚投影)

# 13.4 单 2 · text_range 上板

**使命**:笔记框选一段→板上活引卡;原文编辑→板卡跟变;锚失效→**可见降级留快照**(⛔ 静默烂)。两里程碑:**M1 锚内核 → M2 用户闭环**;写门(validator 开 `text_range`)最后开。

## 零 · HQ 已裁(施工依据,⛔ 复议)

1. **锚所有权=新独立表**(名可取 `board_text_ranges`):board 侧自有锚——note_id/block_id/flow+unit 地址/offsets/**选中文字快照**(最后有效快照,失效⛔覆盖)/status(active|drifted|lost)/pre_edit_offsets;**⛔ FK 到 036 AnnotationRange**(annotation 全量替换协议会 CASCADE 杀锚,所有权协议不同);**复用其地址形状与 `rangeRebaseService` 重映射算法,⛔ 复用其表**;
2. **跟变=GET 时复放**(与 note/item 卡同契约,⛔ 实时推送);v1 **无冻结/重新对齐两态**(默认跟随必达,两态候后);
3. **多板同段=多行**(每次上板各自建锚行,互相独立;同段两板皆跟变由"同地址各自复放"天然成立);
4. **剪贴板契约**:笔记内选区 Ctrl+C 写入结构化 payload(自定义 MIME + text/plain 降级)——{note_id, block_id, flow/unit 地址, offsets, excerpt, at};板上 Ctrl+V=铸锚+mount(kind `text_range`,同事务);选区工具栏加"Copy as board reference"等价入口;
5. **双提交(TD-6)⛔ 宣告清偿**:正文保存与锚更新沿既有两步式(与 annotation 同 parity),Result 里诚实申报边界;
6. **零宽/无法安全重映射=判 drifted 保快照**(沿 rangeRebase `:182` 既有哲学);note/block 删除或 trash→lost(快照仍显);恢复后下次复放可回 active;
7. 事件面:mounted/unmounted 走既有通用记账,⛔ 新 verb。

## 一 · M1 锚内核

- 新迁移+base schema:board_text_ranges(见零.1;user_id 归属;board 删除随板清理——单 A 的 deleteBoard 事务补一刀);
- **编辑期重映射**:笔记编辑链在重映射 annotation 的同一控制器面(`useBlockTextFlowEditController` 族)同步重映射**本笔记的 board 锚**——client 打开笔记时拉取该笔记的 board 锚(新只读端点),普通输入按既有 unit 重映射算法平移 offsets,保存后持久化;无法安全重映射(交叠/结构手术 split/merge 波及承载 unit)→置 drifted+存 pre_edit_offsets,⛔ 静默;
- **服务端复放**:board GET 解析 text_range member 时按当前正文复放——unit 存在+offsets 在界+excerpt 切片比对→active(返回当前投影文本);漂移→drifted(返回快照);unit/block/note 不在→lost;
- M1 冒烟(server 层):建锚→改前文→复放跟变;整段删→drifted 留快照;block trash→lost,restore→复放回 active。

## 二 · M2 用户闭环

- 选区→payload(零.4);BoardPage 粘贴处理器→POST 铸锚+mount 同事务;member kind `text_range` 写门此时才开(server validator+client types);
- 卡面:当前投影文本+源笔记名+**锚健康徽章**(Live/Drifted/Lost);drifted/lost 显快照+"Source changed/lost"明示+**回源入口**(开源笔记,能定位到块更好,最低=开笔记);
- 刷新:沿板 GET 复放;重进板/重开即对齐;
- M2 冒烟(client 层):见 §四。

## 三 · 裁量与停线

- 停线举证不改判;现物行号漂移自行核对函数语义,实质冲突才停;
- ⛔ 动 036 表/annotation 替换协议/`castItem`;⛔ 改 selectionResolve 既有诊断契约(可新建 board 专用复放,复用其思路);
- 结构手术(split/merge)若能安全转移锚(承载 unit 拆分且范围完整落一侧)可做转移,做不到就 drifted——两者都合法,**唯一不合法的是静默**。

## 四 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards/Notes canvasEngine 相关测试面)不破;
- 冒烟六条:①笔记选段 Ctrl+C→板上 Ctrl+V 成引卡,重开仍在;②原文该段**前方**插入文字→重开板,引卡文本跟变且仍指原选段;③原选段整段删除→板卡 drifted,显最后快照+回源入口可开源笔记;④split 承载 unit→板卡明确态(转移成功 active 或 drifted),⛔ 静默错文;⑤同段粘贴到第二块板→改原文,两板卡皆跟变;⑥选区工具栏"Copy as board reference"与 Ctrl+C 等价。

## 五 · Result 格式

`## Result`:numstat + 六冒烟逐条 + M1/M2 分界申报 + TD-6 边界申报 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(总门末项凭据扫描留 HQ 例行补跑)。
