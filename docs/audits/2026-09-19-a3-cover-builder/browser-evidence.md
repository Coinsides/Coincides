> **状态 (Status)**: active（builder 观察证据，放行留 HQ）
> **日期 (Updated)**: 2026-09-19
> **范围**: 隔离 v2 纸面实机与只读数据核对

# A3 v2 实机证据

root 新建 CUA 标签后恢复连接，使用 `:5103` / `:4103` 的隔离 v2 笔记 `ea69296a-a67a-4350-b42f-beefba99bfe0`。早期 v1 仪器不计入本结果。逐步观察记录在 [browser-v2-observations.md](../../../.codex-tmp/a3-cover/browser-v2-observations.md)，只读 API 观察脚本为 `read-ui-evidence.mjs`；没有通过 API 替代被拒绝的图片上传。

| 实机动作 | 实际结果 |
| --- | --- |
| 添加封面 | 1→2 页；旧标题带退出；Overview 依次为 Read cover page / Read page 1 |
| 添加题名/述名并编辑 | notes 真相更新；块仅存 `{field}`、`plain_text:null` |
| 重复添加题名 | 聚焦既有件；总块数仍为 2 |
| 默认导出→关闭并保存 | Preview 从 2 Included / 0 Excluded 变为 0 Included / 2 Excluded；关闭后页列表只有内容页 |
| Layout 拖摆 | 题名 y 从 80 变为 273.7142857142858；仍属封面 |
| 搜索「真封面」 | 1 result，命中 `Page 0 A3 真封面验收` |
| 移除封面 | 块移交 primary-page-frame，两块 x/y/width/height 逐值不变，题述名保留，旧标题带恢复 |
| 普通标题改名 | 已移交的题名件立即跟随同一 draft/save 真相 |
| 将题名件移到回收站 | 仅投影消失，notes.title 保留，述名与其投影保留 |
| 重建封面后再添加题述名 | 新封面有两个新投影，首页旧述名保留；再次添加述名仍仅三块（封面 2 + 首页 1） |

原始数据快照：`ui-evidence-v2-bound.json`、`ui-evidence-v2-dragged.json`、`ui-evidence-v2-removed.json`、`ui-evidence-v2-projection-removed.json`、`ui-evidence-v2-recreated.json`；迁籍逐值比对为 `ui-removal-comparison.json`，均位于 `.codex-tmp/a3-cover/`。结束后已关闭本次标签并停止隔离 client/server，数据和日志保留，`ui-processes.json` 标记 stopped。

图片上传在浏览器自动审批处被拒绝，返回原因是用户未授权该上传；没有绕过。因此未声明原图上传/page 裁剪的实机验收通过，对应往返、同原图双框及满幅衬底由功能测试证明。Ctrl+P 未在当前 CUA 标签面产生可观察的原生打印预览；未生成真实 PDF，打印通过项仅指组件测试。截图已在会话中输出，未调用未文档化的文件保存接口。
