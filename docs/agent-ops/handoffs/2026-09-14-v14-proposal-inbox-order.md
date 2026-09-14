> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 · 心智线针二 · 提案收件箱(临时面,Staging 前身)
> **上游**: `analysis/2026-09-14-mr-zero-anatomy-and-redesign.md` §三.2(Henry 09-14"整改当前版本"令;**明示翻案**:HQ 旧裁"⛔过渡提案面"依新令作废)+提案黑洞标本(§143)

# 针二 · 提案收件箱

**性质**:chat 提案落库即失踪(1.0 的提案专页已拆、Staging 未建)——本单立**最小收件箱**堵洞。定位=Staging 谈判桌的前身,Staging 到位整体吸收;⛔按常驻面过度建设。纯 client 面吃既有人门路由,**零新动词零 API 零射程扩**。

## 一 · 形态(最小而诚实)

1. **入口**:AgentPanel 头部「提案」区(pending 计数徽标,零 pending 时收敛不占位);点开=面板内收件箱列表(⛔新路由页);
2. **每条卡**:类型徽标+摘要(从 data 提炼,逐型申报提炼字段)+来源(chat/材料,读 conversation_id 有无)+时间;
3. **动作**:逐条 apply / discard(走既有 `POST /proposals/:id/apply|discard`);**apply 覆盖普查先行**:凡该型 apply 在服务端可用→给按钮;不可用→显示"此类提案暂不支持一键采纳"(诚实降级⛔假按钮⛔报错);
4. 操作后刷新列表+toast;CourseDetail 既有材料提案流零变;
5. system prompt 的「提案真话」段(说明书接线单产物)同步修订:提案可在 Agent 面板的收件箱查看处理(⛔再说"无面")——若接线单已收口则本单顺改并申报。

## 二 · 验收

1. 三端 typecheck/build+全门绿;定向:①收件箱渲染/计数/零态②apply 可用型走通(至少 organized_note+batch_cards 真夹具往返)③不可用型诚实降级④discard⑤CourseDetail 回归零变;client 全库+server 全量(Python/MinerU 环境红按例申报);
2. 冒烟(隔离库,浏览器不可用则申报留 HQ):chat 发提案→面板徽标亮→收件箱见卡→apply→对象落地→列表清;
3. 证据落 `docs/audits/2026-09-14-proposal-inbox-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 三 · 禁区与申报

⛔新动词/新 API;⛔改机关;⛔动 Staging 设计射程(收件箱⛔长成谈判桌);⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据不在射程)。Result 必含:交付清单+numstat、apply 覆盖普查表(八型逐型:可用/不可用+依据行号)、摘要提炼字段表、测试数字、未做项。冲突停线举证⛔自作主张。
