> **状态 (Status)**: completed-builder-evidence
> **日期**: 2026-09-21
> **范围**: T8 常驻对比度扫描、封面回归、同源核对；非主观验收

# 对比度关系扫描收据

`client/src/test/visualRelationsContrast.ts` 扫描挂载 DOM 中有直接文本的元素、文本输入与 SVG text/tspan；不按块型手列 selector。读取生产计算样式，解析实际祖先衬底、透明色叠加、皮肤变量、sRGB color-mix；大字阈值 3，正文阈值 4.5，比较前不四舍五入。大字按 24px 或粗体 18⅔px 分档；算法与分档依据 [W3C SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。

jsdom 不会解算 CSS 自定义变量、color-mix 和原生布局，因此采用明确的样式适配器，不伪造浏览器 bbox。`visualRelationsStyles.ts` 读实际 global/paper defaults、Notes CSS modules、KaTeX/ReferenceTag 样式及 Overview CSS，按组件实际 class map 挂载。`:global` 保持字面 selector。适配器不是另写一套生产颜色。`readCss` 顺继承链找真实声明；无法解析的 token/色值/字体直接计失败，不能变 NaN 后静默过。

常驻入口为 `visualRelationsContrast.test.tsx`，由既有 `vitest run`/`npm run test:unit` 自动发现，无新依赖或独立遗漏入口。几何两型在同目录的 `visualRelationsGeometry.ts`/`.test.tsx`，共用 `visualRelationsFixture.ts`。

## 夹具与结果

全部工厂皮肤从 `SKIN_PRESET_IDS` 枚举：default、quiet-ink、warm-paper、workbench、silk。块型夹具与几何共用：8 个 `listNoteBlockTemplates()`、生产插入命令投影的 TOC、没有枚举 registry 的单个具名 Item 引用补充，以及 cover preset recipe 产生的 title/description note_ref；模板默认嵌套空字符串自动填值，避免时间线年份/表格空单元格成为假覆盖。Item/图片 transport 仅使用内存 mock，无用户库。

| 场景 | 覆盖 | 结果 |
|---|---|---|
| 首个回归夹具：封面题名 | 原壳近白墨色 + 五皮肤；正常 textarea 和生产 NotePageThumbnail 的只读投影 | 五皮肤墨色均等于本皮肤 `ink`，正常/Overview 同色；每皮肤题名/述名各两次对比度扫描 |
| 全模板阅读面 | 实际 NoteReadOnlyPageContent、六槽、两种 note_ref、TOC、Item、公式、表格、SVG 图表、媒体错误文字 | 每皮肤 50 个可读样本，零失败 |
| 正常编辑面 | BlockEditorLayer 的现役模板与可编辑公式/代码/正文；六槽三种 colorToken override | 每皮肤 55 个样本，零失败 |
| 分页写作角色 | 自动投影 `WRITING_ROLE_BY_COMMAND` 的 7 类角色，含列表序号/折叠按钮 | 每皮肤 10 个样本，零失败 |
| 测量器回归 | :global KaTeX 映射、旧近白字、透明字、隐藏 twin、渐变跨墨色、组 opacity/不支持 RGB | 检出错误或明确拒测，不将未测计通过 |

最终 **1 文件 / 23 测试通过**。20 个皮肤场景共有 **595 次可读文本对比度测量**（每皮肤 4 + 50 + 55 + 10）。机器数据在 `contrast-results.json`；原始过程日志（包括夹具调试失败）保留 `.codex-tmp/t8-relations/contrast-*.log`，最终为 `contrast-final.log`。

| 皮肤 | 封面题名最低比值（正常/Overview 相同） | 阅读面最低比值 |
|---|---:|---:|
| default | 17.317049 | 6.535803 |
| quiet-ink | 14.478197 | 8.050734 |
| warm-paper | 13.190812 | 5.745810 |
| workbench | 12.959531 | 6.902806 |
| silk | 12.726461 | 4.981391 |

warm-paper 使用生产纸纹的三个不透明渐变 stop，取最差情况，故与只拿基础 paper token 算出的 13.537189 不同。两者测量口径有别，不覆盖或更正独立 token 侦察数。

## 射程与明确边界

- 这是五个工厂默认皮肤 + 生产纸色/衬底的常驻关系测试；不宣称保证任意用户配色、任意内容组合或所有交互状态。新的模板/槽位/皮肤加入权威集合时自动进入当前夹具。
- 图片内文字、任意封面 underlay 图片像素、视频原生控件、staging/tray 未采纳物、纸外浮面不在此夹具。尤其底图是兄弟 underlay、不是 CSS 祖先背景，不能把本报告读成任意封面照片上文字均可读。
- 原生 placeholder 伪元素、hover/focus 全状态、批注自选色、完整章节目录数据、所有 paragraph furniture 变体未由本批关系夹具穷举；生产声明审计见 `ink-audit.md`。没有拿声明排查替代这些未做的组合测试。
- 可见 KaTeX HTML 字形照常扫描，平行的 accessibility MathML 树不重复计数；图表图形/图标不算文字，SVG text/tspan 算文字。
- display:none、hidden、闭合 details 内容等不可见节点被申报豁免；透明重复编辑层只有找到**可见、同文、有色**的同级绘制层才可豁免，裸透明文字会失败。输入 checkbox 的 `value=on` 不是真实可读文本。
- 当前仅接受现役那类不透明、各通道单调的 sRGB 渐变；跨过墨色亮度的渐变按最差比值 1。其他渐变色相路径、半透明渐变、位图 CSS 背景、非 1 的 group opacity 明确报未测失败，需浏览器复合测量，不假装支持。RGBA 文字/实体衬底以及 sRGB color-mix 正常解析。
- 无截图 diff、无像素或字体抗锯齿验收；Overview 比对其未缩放的源 CSS 字号和同源墨色，不宣称缩略图每个字都达到正文阅读尺寸。

最终只读复核补上命名渐变色标：只允许首个方向/定位参数被略过，`yellow` 等合法色标必须参与计算，未知色名报错。常驻负控 `#767676` 小字对 white/yellow/white 渐变实际最低约 4.230，必须失败，不能只取白底的 4.542 放行。末次定向 **23/23** 及 `tsc -b` 通过，日志 `contrast-final-review.log`、`contrast-final-tsc-build.log`；595 次五皮肤测量结果保持。
