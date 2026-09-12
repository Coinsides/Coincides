> **状态 (Status)**: done(四批全清;HQ 收口:无过滤 client 全库 1576/1576 零 skip、server test:v2 476/477+DashScope 单红隔离复验 13/13 绿判 flaky 入总测名录、2 条环境红既档;git diff --check+secrets 扫描 HQ 补跑双绿)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: 13.6 · 单1 · Canvas 死代码清除大单
> **上游**: `analysis/2026-09-13-v13-6-adjudication.md` 议程 A(Henry 拍:全删,零复活)+`analysis/2026-09-13-deadcode-recheck.md`(**下刀图纸:33 项逐项现物行号+耦合+建议,⛔按 13.2 旧清册行号**)

# 单1 · Canvas 死代码清除大单

canvas 时代 UI 死代码(CANVAS_MODE_RETIRED 门后全域)按裁决全删。**图纸=recheck 档 33 项**,每项的现物行号、静态门依赖、测试依赖、反向耦合已逐项核清——照图施工,分四批交付(每批完成跑受影响定向,末批全量)。

## 批一 · 纯死直删(10 项:图纸 2/5/9/10/11/19/20/24/27/28)

零活引用零门依赖,按图纸逐项删;各项"⛔碰"标注严格遵守(如 :93,:100 的 canvas_world 读判据是活的历史读判据)。

## 批二 · 拆分(9 项:图纸 3/6/7/8/12/14/15/21/26)

死活混居只抽死枝——每项图纸已标"须保留"清单(viewportTransform+setViewportSize/坐标工具活臂/modePolicy 主体/装配层等),⛔整删混居文件;拆后 typecheck 即时验。

## 批三 · 删+连改静态门(7 项:图纸 4/13/16/17/18/22/23)

canvasRuntimeBoundaryCheck 5 组 assertContainsAll 唯一供货方在死枝——删枝同批改门断言(**闸保牙:每处门改动做红演示**:先删枝跑门证红→改门断言→绿,证据留档);B1e 的 `:not(.pageCanvas)` 活选择器随 pageCanvas 删除同步简化(语义等价);B1d 挂在 `.writingSurfaceCanvas` 下的两条皮肤后代规则随死类同删;`canvasZoomControl/Button/Reset` 三类已被 Page 收编=**活件⛔删**(仅 `canvasZoomSlider` 纯死),门断言相应跟随现役。

## 批四 · 删+补/改替身测试(3 项:图纸 1/25/30)+桥拆除

1. 图纸 1(useSurfaceModeController toggle 链):删 toggle/resolveInitial 本体+同批改写 4 个退役锁测试文件(改为断"无 toggle 导出"或删用例);surfaceMode/surfacePolicy/pageOffsetX 三返回值**留**;
2. **25 条陈旧红正解**:`v2CanvasPersistenceCutover.test.ts` 等 4 个 fixture 工厂 `surface:'canvas_workspace'`→`formal_page`,25 条转绿,5 个图片资产生命周期用例活语义完整保住(⛔删用例);
3. +56px 错位面随删灭失;
4. **TD-7/TD-9 退役桥拆除**(代码自注"until 13.6"):桥逻辑+其 mock 契约测试同拆;`v13CanvasRetirement.test.ts`(单2 刚接门)同批改写为"桥已拆"的新断言(⛔删文件——它是 TD-7 还款收据,改写后继续在岗)。

## 禁区

⛔碰媒体先遣保留令符号以外的 image 面自作主张(图纸 image 项按项处置);⛔动 TextFlow/源投影/皮系统活面;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;疑难与图纸不符→停线举证。

## 验收

1. 四批后:typecheck+build 三端绿;**server test:v2 全 57 文件绿**(25 条陈旧红清零;2 条环境红维持申报);client 全库绿;
2. 全部受影响静态门绿(含改写后的 boundaryCheck,红演示证据在档);`check:test-wiring` 绿(改测试不掉门);
3. 冒烟(隔离库+真浏览器):纸页读写/墙拖/皮切/媒体粘贴/Overview 全链无回归;
4. 证据落 `docs/audits/2026-09-13-purge-builder/`(⛔构建产物);git/secrets 扫描 HQ 收口补跑。

## 申报义务

Result 必含:交付清单+numstat(预期净删除为主)、四批逐批完成态、门改红演示清单、25 条转绿证据、退役锁测试改写清单、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

### 2026-09-12 builder · STOP-1 · needs: HQ

**按“疑难与图纸不符→停线举证”停于首刀前；状态保留 ready，未达 done。** 工单、现物复查图纸、裁决档已完整读取。停线报告：[STOP-1](../../audits/2026-09-13-purge-builder/STOP-1.md)；亲跑原始输出：[基线日志](../../audits/2026-09-13-purge-builder/stop-1-targeted-baseline.log)。日期取本机 America/Toronto，证据目录沿用本单指定日期。

**图纸漏项**：一·20 被列纯死直删，但 `pageFrameTypographyService.test.ts:117–130` 明确断言 Canvas 原 typography 对象不变，直接删旁路会违反 125–127 行身份断言；一·10 要求确认无 Canvas 用例，现物 `useCanvasSurfacePointerController.test.tsx:11–12,39` 实有两条 Canvas 场景及模式相关宽度断言，另与一·6 workspace 宽度分支耦合。未据此判 Canvas 复活，未擅自改测试期待；请 HQ 补足这两项测试处置及批次归属后续工。

| 申报项 | 本次结果 |
|---|---|
| 交付清单 / numstat | 本轮逐文件文本行计数：STOP-1 报告 **+42/-0**、基线日志 **+15/-0**、当前工单 Result **+23/-0**（43→66 行），合计 **+80/-0**；生产代码与测试源码 **+0/-0**。未运行 Git numstat，未读取或修改 `.git`；此为本轮写入量，不申报仓库整体 diff |
| 批一：纯死直删 10 项 | 未启动，首刀前发现图纸测试耦合漏项 |
| 批二：拆分 9 项 | 未启动 |
| 批三：删除与静态门 7 项 | 未启动 |
| 批四：替身测试 3 项与 TD-7/TD-9 桥 | 未启动 |
| 门改红演示清单 | 空；尚无删枝或门改，不伪称红绿验证 |
| 25 条陈旧红转绿 | 未执行 server baseline、未改 fixture、未取得转绿证据；5 条图片资产生命周期用例未删 |
| 退役锁测试改写清单 | 空；4 个 toggle 相关文件、pageCenteringContract、v13CanvasRetirement 均未改 |
| 测试数字 | 仅定向基线：**2 文件、22/22 PASS**（typography 18 + pointer 4），exit 0；安全标题排除 0 |
| 未做项 | 四批代码施工、三端 typecheck/build、server 57 文件、client 全库、各静态门与 check:test-wiring、隔离库真浏览器冒烟、+56px 删除验证、桥拆除均未做；Git/secrets 扫描仍由 HQ 补跑 |

定向测试走现成 runner 的 `--client-tests` 分支，环境白名单、`envFile:false`、内存 DB 设置已核查。没有运行安全类测试、读取 `.env` key 值、接触用户库、启动应用服务、执行 Git 或 commit。现成总门及另一个隔离 runner 含 Git 子步骤，未原样执行；精确位点见 STOP-1 附记。

---

## 补遗一(HQ 裁定,2026-09-13 二轮)

STOP-1 举证成立收货,图纸两漏项补裁:

1. **图纸一·20**(typography canvas 旁路):`pageFrameTypographyService.test.ts:117-130` 的 Canvas 身份断言=**死语义断言**,随删枝同批退役(删该 canvas 用例/断言);Page 活语义(物理字号/首帧选择/显式 override/双缩放坐标)断言**逐字保留**;仍归批一;
2. **图纸一·10**(pointer 短路臂):`useCanvasSurfacePointerController.test.tsx` 两条 Canvas 场景=死场景用例,随短路臂退役;因宽度断言与一·6 workspace 分支耦合,**一·10 改归批二与一·6 同刀**,宽度断言改写为 Page 单模语义;
3. **通例(授权,防逐处停线)**:施工中再遇"测试断言死语义"——**明确断言 canvas 死行为**的用例/断言随枝退役,活语义断言零动;两可/拿不准仍停线举证。退役的用例逐条入 Result 清单;
4. 其余四批与验收判据零变。续工。

---

## Result · 补遗一续工（2026-09-12 builder）

**批一完成并验证绿；按“两可停线”停于批二一·6，状态保持 ready，未翻 done。** 停线证据与最小待裁方案：[STOP-2](../../audits/2026-09-13-purge-builder/STOP-2.md)。`textFlowBlockNavigation.test.tsx` 的活空间序导航测试使用 Canvas 夹具；仅临时剪可见性分流便从 **34/34** 变为 **33/34**，失败在活导航断言。源码已按字节恢复并复跑 **34/34**；未改 TextFlow 代码或该测试。

| 申报项 | 本轮结果 |
|---|---|
| 交付清单 / numstat | 批一 14 个源码/测试文件，原文基线→现文逐行 LCS **+13/-217，净删除 204 行**；[逐文件 numstat](../../audits/2026-09-13-purge-builder/batch1-numstat.md)。不含证据、scratch 或构建产物，不是 Git 整仓 diff |
| 批一：补遗后 9 项 | **完成并验证**：2 pill JSX、5 documentShellCanvas、9 宽度、11 drag bounds、19 可见性 Canvas 后半、20 typography Canvas 旁路、24 rail/panel 死选择器、27 blockListCanvas/scratch label、28 body lock CSS；28 配对的 runtime effect 同删。一·19 活 Page 前半保留，详见服务收据 |
| 批二：补遗后 10 项 | **未正式落刀，STOP-2**。一·10 与一·6 保持同刀；临时可见性 mutation 已恢复，不能计为施工完成 |
| 批三：7 项 | 未启动；未改任何静态门。批三一·4 的 body lock effect 已因28配对先删，pageCanvas class/选择器部分仍待施工 |
| 批四：3 项与桥 | 未启动；toggle、resolveInitial、TD-7/TD-9 桥均尚未拆，+56px 所属 Canvas guides/frame 面仍待删除 |
| 门改红演示清单 | **空，未改门**。STOP-2 另有可见性单变量删枝→活导航红→字节恢复绿的因果证据，不冒充门改验收 |
| 25 条陈旧红转绿 | 已补亲跑改前基线：**49 条，24 PASS / 25 FAIL / 0 SKIP，exit 1**；[TAP 日志](../../audits/2026-09-13-purge-builder/server-persistence-before.log)。未改 fixture、未取得 after；5 个图片资产生命周期用例全保留 |
| 退役锁测试改写 | 批四指定4个 toggle锁文件、pageCenteringContract、v13CanvasRetirement 均未改。批一另按补遗通例退役2个完整死用例和4组混合Canvas断言，逐条见下表 |
| 测试数字 | [批一定向](../../audits/2026-09-13-purge-builder/batch1-targeted.log)：**6文件80/80 PASS**；[类型验证](../../audits/2026-09-13-purge-builder/batch1-typecheck.log)：client tsc、shared声明构建、server tsc全绿；[boundary](../../audits/2026-09-13-purge-builder/batch1-boundary.log)：**168/168**；[model](../../audits/2026-09-13-purge-builder/batch1-model.log)：**60/60组**；[test-wiring](../../audits/2026-09-13-purge-builder/batch1-test-wiring.log)：**75/75已挂、0豁免、0漏挂** |
| 未做项 | 后三批、client全库、server test:v2全57文件、最终三端build、总runtime门全部非Git子步骤、门改红绿演示、隔离真浏览器纸页读写/墙拖/皮切/媒体粘贴/Overview。Git/secrets扫描仍由HQ收口补跑 |

### 本轮逐条退役的死语义测试

以下均在 `client/src/pages/Notes/canvasEngine/`；[详细服务收据](../../audits/2026-09-13-purge-builder/batch1-services.md)。

| 文件 / 原用例 | 处置 |
|---|---|
| `hooks/usePageReadingPresentation.test.tsx` / `leaves canvas viewport, transform and all block geometry unchanged when page gear state changes` | 整用例退役；4个Page用例原断言不变 |
| `meaningfulRenderableContent.test.ts` / `counts placed Canvas image, table, and mounted shape text outside visible NoteBlocks` | 整用例退役 |
| 同文件 / `keeps the Page entry visible for a live-shaped inside table that only Canvas renders` | 仅退役最后Canvas true断言；Page内容/empty prompt断言逐字留 |
| 同文件 / `counts visible block content on both Page and Canvas surfaces` | 仅退役Canvas输入的true断言；Page断言留，用例名改为Page |
| `pageFrameTypographyService.test.ts` / `preserves active user overrides even when they reuse the legacy default profile ID` | 参数循环去Canvas值，Page A4/Letter override断言逐字留 |
| 同文件 / `uses the first frame only as the page default and leaves canvas hydration unchanged` | 仅退役Canvas身份断言；Page首帧及hydrated数值断言留，用例名移除Canvas部分 |

**待裁方案**：仅把 `textFlowBlockNavigation.test.tsx:74` 的测试宿主改为Page，并把139–140行两块的布局改为formal_page；145/148行活导航/复制断言及130–135行历史坐标用例逐字保留。候选尚未实施；原单“TextFlow活面禁区”与补遗“仅明确死语义用例随枝退役”的边界不能由builder扩张。

**操作偏差**：本轮开工误调用两次只读 `git status --short`，随后停止Git调用。未执行Git写操作或commit，未读`.env` key值、未接触用户库、未运行安全类测试。没有将Git/secrets扫描申报为完成。验证入口和最终测试射程待办另记[verification-plan](../../audits/2026-09-13-purge-builder/verification-plan.md)。

---

## 补遗二(HQ 裁定,2026-09-13 三轮)

STOP-2 举证成立。裁定:**准**——该活 TextFlow 导航测试的夹具迁移为 Page 夹具(与批四 25 条陈旧红同款正解:fixture 语境换 formal_page/Page,活断言逐字保留);断言中如有依赖 canvas 特有布局值处,换 Page 等价值并逐处申报。⛔删用例⛔放宽导航语义。此裁定并入通例:**夹具的 canvas 语境=死语境,可迁;断言的活语义=不可动**。续工批二至批四。

(申报的两次只读 git status 误调用:收货,已停即可,⛔再犯。)

---

## Result · 补遗二续工（2026-09-12 builder）

**STOP-2 已按批准方案解除，四批代码施工完成。25 条陈旧 fixture 红全部转绿，TD-7/TD-9 桥拆除，隔离真浏览器全链通过。本轮零 Git 调用、零 `.git` 访问。** 现保留 `ready`：原单“⛔安全类测试”沿用前轮不执行口径，尚无授权扩大测试射程，因而不能把已过滤的结果写成“无过滤 server 全57文件/client全库通过”。该验收范围问题已向用户提出；没有把未执行项当成通过。两条 Python 环境红按原单维持申报；Git/secrets 仍由 HQ 收口补跑。

### 交付与逐批完成态

| 批次 | 完成态与交付 | 证据 |
|---|---|---|
| 批一 | 前轮已完成；本轮全量覆盖其现文，没有重做计量 | [批一收据](../../audits/2026-09-13-purge-builder/batch1-services.md) |
| 批二 | **完成**：Page 单模 policy/visibility/placement/natural/viewport；pointer 两条死 Canvas 场景同刀退役；五 viewport 回调及装配传递拆除，保留 viewportTransform/setViewportSize、Page 焦点滚动与历史坐标工具；NWSL 死活拆分 | [控制器收据](../../audits/2026-09-13-purge-builder/batch2-controllers.md)、[写入面收据](../../audits/2026-09-13-purge-builder/batch3-surface-and-gates.md) |
| 批三 | **完成**：删 Canvas Frame/Stack/+56px/zoom 与五个画物 UI 模块、reserve 全族；shape/image/table 生成器 fallback 为 Page；删死 CSS 头并保留 Page 收编类；boundary 门同改且逐处证红 | [写入面/门收据](../../audits/2026-09-13-purge-builder/batch3-surface-and-gates.md)、[reserve/model收据](../../audits/2026-09-13-purge-builder/batch3-reserve.md) |
| 批四 | **完成**：toggle/resolveInitial 与 TD-7 hydration、TD-9 mock 桥拆；4 个退役锁文件改写，v13CanvasRetirement 保留并增“桥已拆”锁；49 条 persistence 用例全留、25 条转绿 | [桥收据](../../audits/2026-09-13-purge-builder/batch4-controllers.md)、[server fixture收据](../../audits/2026-09-13-purge-builder/batch4-server.md) |

**numstat（非 Git）**：本轮开工、批一之后的 973 个源码/测试/script 文件文本快照→最终现文，**44 个变更文件（39 修改、5 删除、0 新增），+456/-5259，净删除 4803 行**。逐行 LCS、前后 SHA-256 与全部文件对账见 [continuation-numstat](../../audits/2026-09-13-purge-builder/continuation-numstat.md) / [JSON](../../audits/2026-09-13-purge-builder/continuation-numstat.json)。不含文档、证据、scratch、构建输出；不能与前轮 +13/-217 直接相加冒充最终 Git 净 diff。

### 活断言保留与退役清单

| 测试面 | 处置与保留证明 |
|---|---|
| STOP-2 `textFlowBlockNavigation.test.tsx` | 宿主 Page + 两块 formal_page，**原130条expect逐字保留，34/34绿**；历史同排坐标用例未删 |
| `textFlowNavigation.surface.test.tsx` | 两个活导航用例迁 Page media/item_ref 壳；仅退役3条 Canvas selected DOM断言，15条原expect逐字保留；焦点顺序/Shift阻挡/无写入保持；active清除谓词改用Page壳，确保断言实际执行 |
| `surfaceAuthorityContract` / `affiliationVisibility` | 历史固定宽夹具显式补 `width_mode:'manual'`，原宽度/分类/坐标expect不变；不把历史坐标读一律迁Page |
| pointer | 仅退役补遗一准删的 canvas×0.5 与 canvas×1.5；Page 两场景保留，混合宽度期待收敛为其原Page值640 |
| 4个toggle锁文件 | `canvasRetirementPolicy.test.tsx`、`useSurfaceModeController.test.tsx`、`useRuntimeSurfaceStateController.pageReading.test.tsx`、`useNoteCanvasRuntimeController.test.tsx`；分别3/2/3/3条在岗。旧8条hydration/toggle锁与G-X3三场景桥测试逐条登记于[桥收据](../../audits/2026-09-13-purge-builder/batch4-controllers.md)，活Page可见性/阅读/物理字号/墙门断言保留 |
| `v13CanvasRetirement.test.ts` | 原文件、原2用例、原17条assert逐字保留，新增TD-7/TD-9桥已拆与Page三返回值锁，**3/3绿**；未删还款收据 |
| Page centering/alignment/DocumentLayer | 退役Canvas host offset、+56px面与两条Canvas默认字号期待及死回调no-write断言；Page对齐/字体/Overview/墨水/只读继续覆盖。逐条用例名与原行见[根层逐字账](../../audits/2026-09-13-purge-builder/root-layer-test-preservation.md) |
| model | 14条死Canvas headroom/world扩展/policy/transition断言逐条退役；**1094条活assert原文保留，60/60组绿**；历史scene/AI/Inspector模型夹具显式建立历史行，坐标断言保留；[逐条账](../../audits/2026-09-13-purge-builder/batch3-reserve.md) |
| TextFlow identity静态测试 | 只从客户端调用点清单摘已删ShapeObjectLayer，原4用例/活身份断言不变，**4/4绿** |

25 条转绿：`v2CanvasPersistenceCutover.test.ts` **改前49条=24 PASS/25 FAIL → 改后49 PASS/0 FAIL**；[before](../../audits/2026-09-13-purge-builder/server-persistence-before.log)、[after](../../audits/2026-09-13-purge-builder/server-persistence-after.log)、[25条逐用例表](../../audits/2026-09-13-purge-builder/batch4-server.md)。4工厂及16处独立payload迁formal_page，2处boundary迁inside；仅2条surface回读expect换Page等价值（原1525/1593），其余活语义不放宽。历史crossing/workspace读以直接DB历史fixture保7条原断言，并加拒写锁。**5个资产生命周期用例和历史identity migration用例完整字节相等**，对账见[JSON](../../audits/2026-09-13-purge-builder/server-fixture-comparison.json)。

### 门改红演示与最终验证

原boundary门未改先删枝证红；原门短路以外的失败另用保持原谓词的诊断包装逐组收集。红项覆盖五个画物消费族与文件存在、Frame/Stack、Canvas菜单/zoom、CSS、policy、reserve、viewport及同组新孤儿presentation handlers。最终改成Page正向锁与死枝不复活锁，**174/174绿；40/40变更/新增检查单输入mutation红，再回174/174绿**。逐处门名、token与失败消息：[mutation清单](../../audits/2026-09-13-purge-builder/batch3-boundary-mutations.json)；各阶段原始红日志链接见[门收据](../../audits/2026-09-13-purge-builder/batch3-surface-and-gates.md)。未用脚本配置跳过boundary或删除整个门。

| 验证 | 最终亲跑结果 |
|---|---|
| client 允许执行范围 | **150 文件、1572/1572 PASS**；1个安全文件（3条）未运行，不申报无过滤全库绿 |
| server test:v2 允许执行范围 | manifest 57文件中的**54文件**进入执行；**428条=426 PASS/2环境FAIL**；3个安全文件及混合文件中18条安全语义测试未运行；Node过滤项不会全部呈为TAP skip，不能用0 skip隐去排除项 |
| 两条环境红 | `v2SourceMineruWiring`：python.exe ENOENT；`v2SourceRegionCells`：uv/MinerU Python启动code101。按原单申报，未删测试或放宽断言 |
| 三端类型与构建 | client/shared/server 全部exit0 |
| 静态与模型门 | boundary **174**、model **60组**、test-wiring **75/75已挂，0漏挂**；tech-debt、manifest、parity、server/shared导入、gallery/rail/single-editor/source/legacy/relation、性能门全绿；registry允许4条通过、另1条安全语义未执行 |
| runtime原入口与文档门 | 按原23段顺序在隔离wrapper执行全部允许子步骤；含Git的整串npm命令未原样调用。首次docs:check索引过期红，Result落盘后仅刷新agent-ops/INDEX.md，最终**index freshness、object inventory、glossary K-1～K-3全部PASS，docs:check exit0**；[最终文档日志](../../audits/2026-09-13-purge-builder/final-docs.log)、[验证汇总](../../audits/2026-09-13-purge-builder/final-verification-results.md) |
| 真浏览器 | Chrome + 新合成库：纸页编辑刷新、暖纸皮肤持久化、左墙72→107.0530612244898持久化、180×90图片粘贴刷新、Overview进出均通过；附加Board拖动550/100→768/252刷新通过；[冒烟与截图](../../audits/2026-09-13-purge-builder/browser-smoke.md)、[DB回读](../../audits/2026-09-13-purge-builder/browser-readback.json) |

正式日志：[runtime](../../audits/2026-09-13-purge-builder/final-runtime.log)、[typecheck](../../audits/2026-09-13-purge-builder/final-typecheck.log)、[server最终复跑](../../audits/2026-09-13-purge-builder/final-server-rerun.log)。过滤文件/标题与命令、隔离机制见[执行范围](../../audits/2026-09-13-purge-builder/final-verification-scope.md)。

### 边界、未做项与交接

独立复核确认原3437/3442提取函数、PageFrameWall/PaperInk/Draft JSX逐字保留，BlockEditor61个props全在（60逐字相同，仅context-menu摘死清理调用）；五图层无活引用，CSS只删死头，详见[复核收据](../../audits/2026-09-13-purge-builder/batch3-independent-check.md)。媒体历史服务、世界坐标读判据、TextFlow/Source/皮系统活面未扩刀。源码快照对照17个明确安全相关文件与4个安全测试块均未变。

**未做项**：安全禁区所列测试的无过滤执行与据此满足server57/client全库验收；Git/secrets扫描（HQ）；主观验收/放行（HQ）。没有新增生产修复待办，没有push/PR/merge/commit，没有读取.env key值或触及用户库；未修改agent操作指令/权限配置。安全测试执行口径未明确前保留ready，不以工程施工完成替代整单验收done。
