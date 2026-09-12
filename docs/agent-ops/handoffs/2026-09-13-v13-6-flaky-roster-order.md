> **状态 (Status)**: ready(13.6 收官尾单;Henry 裁"集中总测取消"后保留的机器面基线清理,HQ 职权报备派发)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: 13.6 · 尾单 · flaky 名录五笔清基线
> **上游**: claude-log §126;flaky 名录(§120 前后累计);家法"二次重发现即机械化"(unboxing 已裁⛔再观察)

# 尾单 · flaky 名录五笔清基线

**性质**:修测试基建,⛔测试马拉松⛔新测试面。五笔逐笔处置=修夹具/提超时/定负载参数,让"绿=可信"不再被随机红腐蚀。

## 五笔处置

1. **BoardPage.unboxing 超时(置顶,负载型,多次发作)**:诊断超时根因(默认并发下负载);处置=提该套件超时上限或降其并发(文件级 maxConcurrency/poolOptions),⛔删用例⛔放宽断言;复验=默认并发全库连跑 3 轮零红;
2. **BoardPage.selection.test.tsx:108**(一次红复跑绿):同法诊断;若纯时序竞态,加确定性等待(⛔裸 sleep 加长);
3. **groupGalleryPurposeRetirement**(旧标题读回一次):诊断读回时序;确定性化;
4. **DashScope provider 端点测试**(全量串行时红,隔离 13/13 绿):诊断与前序测试的环境泄漏(env 变量/网络 mock 残留),隔离化夹具;
5. **T-1 登录形状红**("both dev gates enabled returns a normal-login-shaped JWT response",非确定性,两轮零 diff 判环境):**⛔挖登录逻辑⛔动产品代码**——只诊断测试夹具的非确定源(环境变量泄漏/端口竞争/时序);夹具层能修则修;若诊断指向产品行为→**停线举证报 HQ 转 Henry**,⛔自行深入;
6. 顺带:2 条环境红(MineruWiring/c-1b-2)做一次诊断申报(Python 环境前置缺什么,如实记录;⛔修产品⛔装环境),记档供后续裁。

## 禁区

⛔动产品代码;⛔删用例/放宽断言;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;T-1 红线条款(上 §5)严格执行。

## 验收

1. 五笔逐笔:根因申报+处置+复验(默认并发全库 3 轮连跑,flaky 五笔零随机红;14700F 姑息节奏可降并发跑第 4 轮对照);
2. client+server 全库绿(环境红 2 条维持申报);`check:test-wiring` 绿;
3. 证据落 `docs/audits/2026-09-13-flaky-builder/`;git/secrets HQ 收口补跑。

## 申报义务

Result 必含:五笔根因表+处置+3 轮连跑数字、环境红诊断申报、未做项。冲突停线举证⛔自作主张。
