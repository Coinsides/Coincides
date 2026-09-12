> **状态 (Status)**: completed（隔离工程冒烟，非主观放行）
> **日期 (Updated)**: 2026-09-12
> **工单**: `docs/agent-ops/handoffs/2026-09-12-v13-6-media-block-paste-order.md`

# 13.6 真浏览器媒体冒烟

环境为本单创建的 `.tmp/media-builder/smoke.sqlite`、同目录 `canvas-assets` / `source-blobs`、空 provider 与 env 目录；API `127.0.0.1:3116`、Vite `127.0.0.1:5286`。仅使用合成用户、项目、笔记与 1000×180 PNG；隔离新库的 coordinate_contract 设为 v2。未连接用户数据库或用户开发服务。启动与隔离过程脚本留在 `.tmp/media-builder/`，构建产物不纳入证据目录。

为严格遵守「上传走 API 直传、禁止浏览器 UI 上传」，PNG 先由 Node multipart 请求现役 `POST /api/canvas-assets/images` 上传。隔离 Vite 插件仅对 `mediaBlockPasteService.ts` 的上传 import 返回这个已上传 asset；其余生产模块不替换。随后通过系统剪贴板写入同一 PNG，在真实文本 textarea 按 Ctrl+V。真实执行的链为 paste 分流 → Image natural 尺寸 → 普通 createBlock → placement → reorder → 真实 blob GET → MediaBlockProjection。本记录不宣称在浏览器跑过未替换的上传函数；该函数的真实 API 协议由前述直传完成，生产调用时序另由单测验证。

| 操作 | 观察结果 | 证据 |
|---|---|---|
| 文本块内纯图粘贴 | 原文字不变，新增 media NoteBlock；初始 local x=0/y=42，manual width=760，高136.8经现役像素归整为137；natural=1000×180；img `object-fit: contain` 保持原图比例 | [截图](smoke-pasted.jpg)、[几何](smoke-pasted-geometry.json) |
| 用 Move block 拖动 | y 从42变186，宽760/高137保持 | [截图](smoke-dragged.jpg)、[几何](smoke-drag-geometry.json) |
| Layout 模式收右墙 | manual 宽被 clamp 到约619.788，x/y/height保持；图像 contain，无拉伸 | [截图](smoke-wall-clamp.jpg)、[几何](smoke-wall-clamp.json) |
| Ctrl+Z | 墙与媒体宽恢复760，y=186/height=137 | [撤销几何](smoke-wall-undo.json) |
| Export Preview | 显示带 alt 的760×137边框占位，矩形在可滚动预览区保留，无崩溃 | [截图](smoke-export-placeholder.jpg) |
| 真实 window.print | 隔离按钮调用浏览器原生打印；生产 beforeprint 挂载 print root，媒体 fragment=760×137、alt=`clipboard.png`，内有占位框 | [真实 beforeprint DOM](smoke-real-beforeprint.json) |
| Move to trash | UI移除媒体；block.status=trashed，最后引用释放后 asset 行为 null，blob HTTP从200变404，文件由存在变不存在 | [删除前](smoke-deletion-before.json)、[删除后](smoke-deletion-after.json)、[截图](smoke-deleted.jpg) |

打印证据边界：原生对话框阻塞 CDP Input/Runtime；当前工具不能取得该原生界面的截图。隔离按钮在真实 beforeprint 回调中用 beacon 保存当时 DOM，确认生产打印树与占位尺寸；不是人为 dispatchEvent 模拟。关闭本单标签页退出原生对话框，再打开本单笔记完成删除。完整图片打印仍属后续媒体主单。

最终关闭本单浏览器标签页并停止记录的隔离 Node PID 42028/24432；复查它们均已消失。误命名的三日志目录在逐文件哈希比对后清除，日志已归入本目录。见 [清理收据](smoke-cleanup.txt)。最后两处代码修正仅涉及失败回滚登记、缺帧提示与排序失败回滚；修后客户端全量、client build、canvas runtime boundary 与 model contract 重新通过，成功冒烟链无改动。
