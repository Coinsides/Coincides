# 做法 4 撤回：根因与原件（builder 2026-11-07）

## 做法 4 做了什么

- `useTextFlowHistory.ts` 的 `persistUnitTransfer` 拿到 `transferTextUnit` 的回包后，在 `current()` 检查之前，把「单元、新块」交给调用方。
- 控制器收到后，让留字条目和它的 localStorage 存档跟到新块。
- 原件：本目录 `*.opt4`，共四个文件（history、控制器、控制器测试、守恒闸）。

## 为什么浏览器里不生效

`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts` 的 `transferTextUnit` 在回包到达后自己核一次 `current()`：适配器挂载、笔记、路由、请求代际、水合纪元。离开了就 `return null`。

所以 history 拿到的 `result` 是 null，回调根本不会被调用。

## 为什么单元测试和守恒闸没抓到

- 控制器测试和守恒闸的假适配器没有这道离开闸，回包总会带结果回来。所以单元级全绿，三处红对照也都成立。这是闸的保真缺口。
- 浏览器证据在 `../matrix-2-opt4/`：
  - 慢回包地址栏一臂，修复版 6/6 第②类，冻结版 6/6 第①类。
  - 自然时序地址栏一臂，修复版 7/10。

## 原件内容

- `useHeadingStructureController.test.tsx.opt4`：
  - 正测：回包在离开后到，存档跟到 new-1，重开只落一次，笔记里 3 块都含 `title` 单元。
  - 负测两条：回包失败、永不到。
  - 隔离测：A 的回包在 B 打开时到。
- `structureTypingConservation.test.tsx.opt4`：
  - `slowReply` 注入：服务端已提交，回包迟 800ms。
  - 「必须落」脚本：留住也判红。
- 控制器里的闭包修正：`retainWords` 改为调用时读 `entry.focus`。只有做法 4 会在留住之后改焦点，所以撤回后碰不到，一并撤了。

## 给后续单的线索

- 订单裁定列了两案：离开守卫扩到地址栏导航；或在适配器层按笔记编号放行已确认的回包。
- 整页卸载落在转移已发、回包未到之间时，`pagehide` 存下的仍是旧块。
  - 抽取时客户端先生成的 `clientCreateKey` 在请求发出前就已知。若服务端的块能带回它，重开时就能按身份认出新块。
