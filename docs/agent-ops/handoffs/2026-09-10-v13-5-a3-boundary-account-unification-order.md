> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 修七调查申报(两本边界账现物勘定,工单 2026-09-10-v13-4-w4-fix7-order.md Result);F13 教训(toast 同文案掩盖异病,修一至修六三轮扑空根源)
> **单号**: 13.5 · A3 · v2 边界账统一(帧账)+ 保存报错明码

# 13.5 A3 · 边界账统一 + toast 明码

## 一 · 边界账统一(修七申报的独立限定单)

**现物(修七已勘,沿用⛔重查)**:`isCanvasWorkspaceBlock`(placementService.ts:321)以 `contentWidth` 当边界;`classifyBlockSurfaceAuthority`(:140)优先既有 `surface_authority.pageBoundary`,无 authority 的 local 行才走 contentWidth(:168);`toStoredLayout` 按当前 resolved frame 内容宽建边界。差异随渲染提示/过期 authority 显现。

**裁定**:

1. v2 契约下,读取侧分类统一走**帧账**——`isCanvasWorkspaceBlock`/`modePolicyService` 消费点传入 contract + frame context,沿既有 `selectPlacementFrame` 解析归属帧,以帧内容宽建边界;contentWidth 只作渲染宽度提示⛔当边界;
2. **缺帧处理**:解析不到帧=维持现行为(按现 contentWidth 路径),⛔猜归属⛔任意首帧;
3. **过期 `surface_authority.pageBoundary`**:v2 下以现行帧账重算为准(与 F13 同法理:现行几何压过陈旧记录),⛔信旧 authority 快照;
4. 施工面=修七申报的最小面(placementService.ts + modePolicyService.ts,hook 已有上下文);v1/退役写闸/F1/持久化/迁移⛔扩面;旧 `useSurfaceModeController` 退役路径⛔重开。

## 二 · 保存报错明码

- "Failed to save block layout" toast 追加明码后缀:契约错=`(page frame unresolved)`、退役面=`(retired surface)`、其余=错误 message 截断;console.error 保持完整栈;
- 只改 toast 文案组装,⛔改错误类型体系⛔新弹窗形态。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟四条:①窄 contentWidth(如 646)+ 帧 904/inset72 + 存量 formal_page 块:修前 `isCanvasWorkspaceBlock` 误判 workspace(断言现状红)→修后按帧账判 inside,page 模式可见性与 surfaceMode 选择随之正确;②过期 authority 快照(pageBoundary 与现行帧不符)→修后以现行帧账重算;③缺帧块行为与修前逐字节一致;④两类保存失败的 toast 明码正确显示(合成触发)。
- F13/修五/修六全回归。

## 四 · Result 格式

`## Result`:numstat + 四冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
