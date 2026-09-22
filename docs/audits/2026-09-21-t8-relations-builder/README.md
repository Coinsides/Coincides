> **状态 (Status)**: builder-evidence
> **日期**: 2026-09-21
> **权威**: 否；本单施工与复验收据，放行留 HQ

# T8 封面墨色与视觉关系断言

本批显式修复 note_ref 题名/述名、只读投影及分页列表/折叠 marker 的纸外颜色继承，补齐纸内墨色声明并提高低对比小字。三型关系扫描进入 client 既有全库测试：对比度、正文/装订槽相交、正文左右越墙。

最终验证：client **238 文件 / 2463 测试全绿**，production build 通过；非 git/secrets 门 **25/25 通过**。server **111 文件零排除**、每文件 600000ms 预算，**109 文件通过，2 个 Python/MinerU 环境阻断待 HQ 机复验**；未宣称 server 全绿。完整失败轮、修复与复验收据见下表。

| 证据 | 内容 |
|---|---|
| [ink-audit.md](ink-audit.md) | 14 个生产墨色文件逐处行号、两项真正继承缺陷、声明加固、纸面排查射程与豁免 |
| [contrast-audit.md](contrast-audit.md) / [contrast-results.json](contrast-results.json) | 五皮肤、封面正常/Overview 同源、595 次可读文本测量、23 常驻测试、样式适配限制 |
| [geometry-audit.md](geometry-audit.md) | 真相交路径、A4/Letter 新纸上边距最小修、48 个缩放组合、外置题名带 12 个组合、旧墙/偏移负控 |
| [geometry-before.json](geometry-before.json) / [geometry-after.json](geometry-after.json) / [geometry-external-header.json](geometry-external-header.json) | 几何逐场景数据 |
| [verification.md](verification.md) / [verification-results.json](verification-results.json) | client 全库、server 111 文件零排除、25 个非 git/secrets 组件、失败/重试/环境归因 |

修前 A4/Letter 新纸默认 top=0，装订页眉槽位于 18..48px，首块与其相交 26px。只改新建普通 A4/Letter 缺省 top=72；修后首块距槽底 24px（canonical），48 组合零相交/零横溢。既有墙位置、Source 原件几何、用户自定义偏移不回写；保存 top=0 仍会被扫描器检出。本单未改变坐标契约、分页算法、TextFlow 真相、schema、工具、prompt 或依赖。

原始日志与一次性 runner 全部保留 `.codex-tmp/t8-relations/`。没有 git 写操作、用户库访问或真实远程模型调用；工单指定 git/secrets 两组件留 HQ。Python/MinerU 的本地启动环境阻断按工单如实申报并交 HQ 机复验，不作为中断施工的理由。浏览器字形净距、图片局部像素、主观视觉验收未冒充已完成。
