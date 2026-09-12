> **状态 (Status)**: ready(13.6 裁决半场执行单1;单2 已收口,回归网已补全——57 文件 test:v2+漏挂机关在岗)
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
