> **状态 (Status)**: done
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

## Result

2026-09-09 · Codex builder：施工完成，工作树交 HQ 复核与代账；本回执不代替 HQ 放行。

**Numstat**

施工、测试及生成物共 **37 文件，+2103/-109**：已跟踪 20 文件 +445/-109，新文件 17 个 +1658/-0。仅统计本单；开工已存在的 7 个无关未跟踪文件原样保留，不纳入。回执及派生索引另计于下行，避免与施工量混淆；未暂存任何文件。

本回执 +90/-1，`docs/agent-ops/INDEX.md` +1/-1；**含两项文档共 39 文件，+2194/-111**。

```text
新增  删除  路径
1     0     client/scripts/pageReadingSmoke/mockApi.ts
1     0     client/src/pages/Boards/BoardPage.smoke.test.tsx
70    7     client/src/pages/Boards/BoardPage.tsx
4     0     client/src/pages/Boards/Boards.module.css
7     0     client/src/pages/Boards/boardRepository.ts
8     1     client/src/pages/Boards/boardTypes.ts
8     1     client/src/pages/Boards/useBoard.ts
7     0     client/src/pages/Notes/NoteDetail.module.css
4     1     client/src/pages/Notes/canvasEngine/hooks/useBlockTextFlowEditController.ts
67    2     client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx
71    3     client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts
2     0     client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts
7     0     client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
12    1     client/src/pages/Notes/canvasEngine/layers/SelectionTypographyToolbarLayer.tsx
86    85    docs/generated/object-inventory.md
5     3     server/src/__tests__/v13BoardServices.test.ts
22    0     server/src/db/schema.sql
27    0     server/src/routes/boards.ts
34    3     server/src/services/boards.ts
2     2     server/src/validators/boards.ts
69    0     client/scripts/boardTextRangeSmoke/fixture.tsx (new)
3     0     client/scripts/boardTextRangeSmoke/index.html (new)
139   0     client/scripts/boardTextRangeSmoke/mockApi.ts (new)
36    0     client/scripts/boardTextRangeSmoke/start.mjs (new)
305   0     client/src/pages/Boards/boardTextRangeClipboard.test.tsx (new)
121   0     client/src/pages/Boards/boardTextRangeClipboard.ts (new)
108   0     client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.test.ts (new)
137   0     client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.ts (new)
29    0     client/src/pages/Notes/canvasEngine/boardTextRangeRepository.ts (new)
40    0     client/src/pages/Notes/canvasEngine/hooks/useBlockTextFlowEditController.test.tsx (new)
86    0     client/src/pages/Notes/canvasEngine/hooks/useBoardReferenceClipboard.ts (new)
133   0     scripts/run-text-range-validation.mjs (new)
237   0     server/src/__tests__/v13BoardTextRanges.test.ts (new)
32    0     server/src/db/migrations/059_v13_board_text_ranges.ts (new)
122   0     server/src/services/boardTextRanges.ts (new)
36    0     server/src/validators/boardTextRanges.ts (new)
25    0     shared/types/boardTextRange.ts (new)
```

**M1 / M2 分界**

- **M1 先行**：新增迁移 `059_v13_board_text_ranges.ts` 与 base schema，board 自有锚表独立于 AnnotationRange；以 user / board 归属，保留源 note / block / flow / unit、offsets、最后有效 excerpt、健康态与 pre_edit_offsets，删板与卸载清理所属锚。
- 打开笔记通过 `GET /api/boards/text-ranges/by-note/:noteId` 拉取本笔记全部板锚；在 `useBlockTextFlowEditController` 同一编辑面复用 `rangeRebaseService`，不依赖该笔记是否有 annotation。正文成功后逐 ID `PUT` 锚更新，不全量替换锚集合。普通编辑更新 offsets / excerpt；零宽和不安全结构变化置 drifted，保留快照与编辑前偏移。
- board GET 按当前正文复放；源 note / block 删除或 trash 显 lost，恢复后可重新 active；显式不安全编辑保持 drifted。M1 算法、编辑控制器、保存链与服务端复放定向通过后进入 M2。
- **M2 随后**：单段 Ctrl+C 与工具条 `Copy as board reference` 写相同地址 / offsets / excerpt / at 契约及普通文本。接住真实编辑器拖选后原生选区折叠的情况；工具条优先标准 ClipboardItem，兼容原生 copy 回退。板 Ctrl+V 读取同一自定义 MIME 的字符串或 Blob；若浏览器仅经 Clipboard API 暴露 web custom format，则在本次 paste 中按 exact MIME 读取并核对 excerpt。普通文本不推断、不重建引用，不使用私有剪贴板缓存。
- `POST /api/boards/:boardId/text-ranges` 在同事务内独立铸锚、mount、记 mounted；卸载沿既有 unmounted。卡面显示 Live / Drifted / Lost、源笔记名、当前投影或最后快照，降级有明示及可点击回源入口。
- **写门最后开**：M1 通过、M2 端点及客户端闭环接齐后，才将 server `mountBoardMemberSchema` 与 client `WritableMemberKind` 的 `text_range` 写门打开。无提交里程碑，以本次施工顺序和分层测试记录为据。

**六冒烟逐条**

浏览器证据使用 `client/scripts/boardTextRangeSmoke/`：真实 Notes runtime、BoardPage、编辑 / 保存 / 剪贴板代码，HTTP transport 全部替换为合成数据，存储为独立 sessionStorage；`/api` 无真实后端。服务端证据另用内存 SQLite 与真实 service / router，未连接用户库。下列 PASS 指上述证据范围，不冒充真实业务库端到端验收。

1. **PASS — 选段 Ctrl+C → 板 Ctrl+V，重开仍在。** 真实鼠标拖选 `The selected passage stays alive.`，Ctrl+C 后 Board A 粘贴生成 Live 卡；完整刷新后同卡、同 excerpt 仍在。另有生产 copy hook → BoardPage → repository 的自动化回归。
2. **PASS — 原选段前方插字。** 在全文开头插入 `Inserted before. ` 并保存、重进板，offsets 从 `9..42` 平移至 `26..59`，仍显示原选段且为 Live；合成调用记录先正文 PUT、后包含两行锚的 PUT。服务端用真实 client rebase 输出再次验证 GET 复放。
3. **PASS — 整段删除。** 删除原选段并保存后，板显示 Drifted、原 excerpt 与 `Source changed · Last valid snapshot`；offsets 为 null，pre_edit_offsets 保留 `26..59`。亲点 `Open source note` 返回已删除该段的源笔记。
4. **PASS — split 承载 unit。** 在原引用中部按 Enter，把正文拆为 `Preface. The selected p` / `assage stays alive. Closing words.` 两个 unit；重进 Board A 明确 Drifted，保留原完整 excerpt 与 `9..42` 的编辑前偏移，没有静默换成半段文字。本单采用允许的保守降级路径。
5. **PASS — 同段两板独立跟变。** Board A / B 各有独立 range ID，各一行；前方插字后两板均 Live 且偏移同步。最终再将引用内 `selected` 改为 `updated`，两板重进均显示 `The updated passage stays alive.`，保持 Live。
6. **PASS — 工具条等价入口。** 先复制普通笔记标题覆盖旧剪贴板，再真实拖选原段，只点工具条复制，Board B Ctrl+V 成 Live 卡。实际粘贴携带普通 excerpt 与 `web application/x-coincides-board-text-range+json` Blob，读取后沿同一 parser / POST / mount 链成卡。自动化另逐字段核对 Ctrl+C 与工具条 payload / text/plain 一致，覆盖折叠原生选区、原生命令失败、Blob 和 ClipboardItem 读取路径。

**验证结果**

- 服务端：`node scripts/run-text-range-validation.mjs --server-boards`，7 文件、TAP **31/31 PASS**；包括 059/base/旧库迁移一致性、前方插字、内部编辑、删除 / split 降级、trash / restore、删板清锚和事务事件回执。仅内存 fixture。
- 客户端：Notes 定向 **49 文件 / 452 PASS**；M1 编辑会话 / 控制器 / adapter 专项 **49 PASS**；Boards repository **11 PASS**；最终剪贴板用户闭环 **12/12 PASS**。以上集合有重叠，不相加作为总数。
- 原 `verify:v2-bn8-runtime` 的 **20 个允许阶段，经 `node scripts/run-text-range-validation.mjs` 及 docs / diff 收尾验证全部 PASS**：unit、tool-face registry / manifest / parity、server/shared import、canvas / gallery / rail / editor 边界、source experience、legacy shutdown、relation freshness、model contract、client build、server build、performance、docs、diff。首次 runner 在过期 inventory 的 docs 检查停止，官方脚本重生成后补跑文档与 diff 检查通过；性能冒烟 5 场景通过。
- 最终复制兼容增量另补 client / shared / server typecheck、client build 和上述 M2 定向；未重复声称整套 20 阶段在最后增量后又跑一遍。构建 / Vitest 明确 `envFile:false`，验证子进程仅继承工具位置等白名单变量。
- **原总门末项 `check:changed-file-secrets` 明确 SKIP，留 HQ。** 未执行安全类测试，不宣称原封不动的完整总门全绿。对象清单由官方生成脚本更新至 90 张表。

**TD-6 边界申报**

正文提交与板锚提交仍为两步，**TD-6 未清偿**，没有跨资源原子事务或新增 OCC。第二步失败会显示 `board_range_sync_failed`，不误报完整保存成功；同一编辑会话保留失败锚快照供重试。离开 / 重建编辑会话后，不保证保留内存重试快照；并发旧保存或正文已落库而锚未落库，下一次 GET 可能显示 drifted 并保留服务端最后一次有效快照。既有两步式边界未被本单掩盖。

**未做与停线事项**

- 未 commit / push / PR / merge；未读 `.env`，未向外发送 key；未连接、迁移、写入或清理用户数据库；未跑安全类测试与末项凭据扫描。HQ 接工作树代账，凭据扫描及真实业务环境主观验收留 HQ。
- 未实现实时推送、冻结、重新对齐或结构拆并的智能转移；回源最低实现为打开源笔记，未承诺块内精确定位。未修改 036、annotation 替换协议、`castItem`、selectionResolve 诊断契约或 agent 权限配置。
- 无需要重裁 §零的实质冲突，无剩余施工停线项。补充原生 CDP 驱动曾被系统拒绝读取 `DevToolsActivePort`，未绕过；浏览器六条以现有 Chrome 自动化连接完成，未声明独立驱动 / 其它浏览器也已验收。ClipboardItem 的 `web` 格式读写参考 [Chrome 官方说明](https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api/)，工具代理所呈现的 Blob 形态另有本次实测及回归覆盖。
