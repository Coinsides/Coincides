> **From**: fable
> **To**: codex
> **Status**: ready(13.1 尾款;解锁条件"坐标归一落地"已于扳机日达成,真库已 v2)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(client,中单——复活停放的打印纸叠投影)

# 13.1 尾款 · 打印通道复活(v2 世界)

## 〇 · 上游(先读,顺序)

1. 停放卷宗:`handoffs/2026-09-07-v13-1-s3-print-channel-order.md`(两停线+补遗一,打印投影草稿现物:NotePrintLayer/pagePrintProjectionService/print fixture,`444af9d` 入库时的已证能力=world 正确输入下裁片重定位);
2. 13.1 段 plan 冻结裁定二第 4 条(3b 降级梯第二级=机械判据+走查人眼);
3. 4a 现物:v2 下 fragments/打印输入已经过 placementContractService 世界投影(4a Result"派生与打印输入"节)。

## 一 · 口径(冻结)

1. **复活验证**:v2 契约下,打印投影吃到的 world fragments 已由语义层保证正确——补齐当年停线未竟的验证:多帧样本(含次帧内容)打印分页归属正确、首字符不缺 72px(当年病灶的对照);
2. **3b 第二级机械判据交付**:单测断言逐帧物理宽高 ±0.5px(physicalScale 映射)/打印页数=帧数/gear 与 stepFactor 不泄漏进 print/纸族物理严格+网页族 fit A4 宽;
3. **打印预览检查页**:print fixture 补"应见/不应见"清单页(走查人眼用);Chrome print-media emulation 冒烟重跑(当年 6/6 FAIL 的那套收据,预期全绿);
4. **⛔ 面**:⛔ 动屏显 DOM/Preview 语义/4a 语义层/执行器;⛔ PDF 引擎⛔ 新依赖;真实笔记打印的人眼验收归走查③顺带(Henry 届时 Ctrl+P 解禁)。

## 二 · 验证(段纪律)

client typecheck/build;§一.2 机械判据单测;一条冒烟:print-media emulation 下多帧样本收据全绿(对照当年 FAIL 收据逐项)。

## 三 · 回执与边界

apply_patch 追加 ## Result(当年 FAIL→今日状态对照表+numstat+验证+未做);⛔ commit;⛔ 读 .env;⛔ 打印 key;⛔ 用户库;不动 3001/5173。现物冲突⇒停线举证。
