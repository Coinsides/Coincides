> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready(开工条件:12.2a-2 闭环后;**本单只交方案短笺,不施工**) | re: v2bn12-12.2a-3-plan | date: 2026-08-21

# V2.BN.12.2a-3(方案短笺阶段):MCP transport 骨架 + `resolve_selection`

## 为什么先交短笺

裁定方纪律卡 §1:大架构面工单开工前,builder 交一页方案短笺,裁定方答两问后才放行施工。本单是必修① 第一次触及运行时架构(MCP 端点挂进 Express),属大架构面。

## 短笺须回答(一页以内,落在本文件 ## Plan)

1. **接法**:`@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` 如何挂在既有 Express 之后(路由位置、auth 复用既有 JWT 中间件的方式、Origin/Host 校验落点);**无状态**——任何会话态都不得引入。
2. **能力协商**:如何在每次请求判定客户端是否宣告支持 `input_required`(MRTR);不支持时 `confirm` 立即降 `propose` 的落点(设计稿 §7 更正条)。
3. **`resolve_selection` 的实现边界**:入参=SelectionReceipt(设计稿 §2.1,继承 `CapturedSelectionRange`),出参=ObjectRef[](两层 kind,无并集);**零模型、零网络**,纯查表。
4. **裁定方两问的自答**(必答,短笺不答=退回):
   - 平行机关问:本方案是否在既有正门之外另造了承载同类职责的机关?(auth/validator/收据写入各用谁的既有路径?)
   - 基线保证问:本方案是否试图提供后端基线不提供的保证?(尤其:任何「原子」「一定」字样须指出基线依据)
5. 触及面申报:碰/不碰哪几层地板(ROADMAP §7.2)。

## 放行后的施工边界(预告,短笺通过后正式下达)

一单一交付物:transport 骨架+`ping`+`resolve_selection` 三件为一个可演示的最小闭环;不实装任何读/写业务工具(归 12.2b/c)。
