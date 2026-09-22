> **状态 (Status)**: completed-builder-evidence
> **日期**: 2026-09-21
> **射程**: T8 相交 / 横向溢出 / 页眉机械复核；非主观验收

# 几何关系扫描收据

新增常驻扫描器 `client/src/test/visualRelationsGeometry.ts`。扫描输入为通用 page/content/blocks/slots 集合，不含块种类分支；DOM 收集遍历生产 `[data-note-readonly-fragment]`、`[data-note-block-shell]` 与 `[data-page-frame-slot]` 标记。相交判断两轴正面积，边缘接触不算相交；横溢检查左右两墙，读取内层 block shell 原宽与偏移，不能因外层投影裁切而假绿。

夹具 `visualRelationsFixture.ts` 从现役 `listNoteBlockTemplates()` 自动投影全部 8 模板，递归填默认空文本，保留真实分页和高度估计：paragraph/formula/code/image/table/timeline/bar/line。TOC 从 `NOTE_INSERT_COMMANDS` 投影；`item_ref` 没有现役枚举 registry，单独具名补充现役拖放门的身份数据（无用户库，Item 读取由合成内存 mock 接管）。封面 `note_ref` 由生产 `coverPresetPlacements('concise')` 返回的题名/述名条目生成。六槽完全从 `NOTE_BINDING_SLOT_NAMES` / 生产 slot projection 枚举。

## 实测缺陷和最小修

修前新 A4/Letter 默认 top inset=0。生产分页首块 bbox top=0 / height=44；装订 header slot top=18 / height=30。二者相交 26px，首块相对槽底净距 **−48px**。A4/Letter × 有无封面 × `fit_width/fit_page/physical` × step `0.5/1/1.5/2` 的 48 场景均复现。原始首轮夹具含 8 模板及封面，见 `geometry-before.json`。

按工单第三节的 top inset 最小修授权，`pageFramePrintScaleService.ts` 仅将新 A4/Letter 打印预设的 top 改为 **72px**，并令其 `contentHeight` 扣除该上边距。`normalizePageFramePrintBaseline` 保留已存显式 top（包括 0）不变；未改分页算法、坐标契约、schema 或存量库。`shared/types/pageGeometry.ts` 同时被 Source publication 使用，保持未改。其他纸型不属于本单两纸型矩阵，默认值保持原状。

修后扩充至每场景 **10 个正文投影**（8 模板 + TOC + item_ref），有封面另加 2 个 note_ref。48 场景均无槽相交、无横溢；两张正文纸各六槽均被扫描，封面按生产 binding 设置静默六槽。每页首块对页眉槽的 canonical 净距均为 **24px**。

| 纸型 | gear | step=1 显示 scale | 显示净距 px |
|---|---|---:|---:|
| A4 | fit_width | 1 | 24 |
| A4 | fit_page | 0.625978 | 15.023474 |
| A4 | physical | 0.877988 | 21.071702 |
| Letter | fit_width | 1 | 24 |
| Letter | fit_page | 0.683761 | 16.410256 |
| Letter | physical | 0.902655 | 21.663717 |

其余 step 的显示净距按该表乘 0.5 / 1.5 / 2，原始逐场景数据见 `geometry-after.json`。

负控常驻：已存 top=0、用户 top=24、用户 slot offset 把页眉推入正文均仍报告相交；手动块越左右墙（含外层已裁切）仍报告两侧溢出。没有用豁免使这些违规布局沉默通过。

## 外置题名带与装订槽分别复核

`pageFrameAlignment.test.tsx` 另加两个常驻测试，真实挂载 `NoteWritingSurfaceLayer`，A4/Letter × 有无封面 × step 0.5/1/2，共 12 组合。无封面时外置 `NotePaperHeader` 的生产 fallback 分配带高 197px，body 已提交位置位于该带后；当前夹具的可用宽 680px，显示 scale 为 0.376106 / 0.752212 / 1.504425，按已提交 top + paddingTop + 首块 top 算出的“分配带底至首块”净距为 **54.159292 / 108.318584 / 216.637168px**。有封面时外置题名带按生产逻辑消失。见 `geometry-external-header.json`。

这与装订六槽是不同对象，也**不等于** HQ 浏览器所测字形/实际元素净距 57px。jsdom 无原生布局：这里测生产计算样式/inline pixel box 与生产缩放推导，不调用零值 `getBoundingClientRect()`，不 mock 为理想 bbox，不声称测了字体 intrinsic height、字形、图片像素或真实浏览器截图。外置题名带采用组件自身规定的 jsdom fallback 高度，其真实字体/metadata 高度仍属浏览器复验射程。

## 验证

- `visualRelationsGeometry.test.tsx` 7/7：48 个矩阵场景 + 具名负控/扫描器校验。
- 以上文件连同 `pageFramePrintScaleService.test.ts` / `pageFrameSlotService.test.ts`：3 文件 **30/30**。
- `pageFrameAlignment.test.tsx` 全文件 **42/42**（含新增 2 测试、12 外置题名带场景）。
- `smoke:canvas-engine-model-contract` **60 groups PASS**。旧检查中两个 world-Y 期待遗漏 contentInset.top，两个“应处于内容区”的 export 夹具使用纸面 top=24/40；已改为内容原点推导，保留其原来要验证的定位/归属含义。
- 原始输出：`.codex-tmp/t8-relations/geometry-before.log`、`geometry-after.log`、`geometry-external-header.log`、`geometry-model-contract.log`；对应 JSON 同目录留原件。

全库联动收尾：新默认 top=72 暴露五份既有测试的 12 个旧基线假设。`BoardNewNoteDialog`、`BoardPage.unboxing`、`notePagePresets` 的 9 个失败重复硬写 top=0，现改为从生产纸型预设读取 inset，保留纸宽高、创建/重开/严格 HTTP ledger 等原断言。`usePageReadingPresentation` 两失败源于 Harness 未像生产 `useNoteCanvasRuntimeController` 那样传 `note.page_format`，因而走旧 fallback content-height；补当前夹具对应的 `notePagePreset:'a4_portrait'`，由生产 `measurePresetPageContentHeight` 得到 height−top，原先物理纸高和 Fit page scale 断言均保持，未接受错误的多出 72px 纸高。`usePaperSize` 的 3800 字符旧样本已无法在新 1002px 内容高中区分两种字体容量，改为 3500 字符，并以独立文本高度测量先断言 Letter 能装一页、A4 字体不能，再验证实际换纸重排/自定义保留及 undo/redo。五文件最终 **40/40 PASS**，日志 `geometry-default-regressions.log`；此轮只修测试输入/期待，未改生产分页或坐标算法。

## 射程与豁免

扫描涵盖当前模板正文、TOC、item_ref、两种 note_ref 字段和全部装订槽；覆盖真实生产分页计划的 continuation 页面。`tray/staging` 未采纳物不在纸面集合；纸外 workspace、工具把手、annotation/ink（现契约允许越墙）、cover underlay 图片不属于正文 bbox 扫描。自由拖墙、槽偏移、过高不可拆块、自定义纸型等任意用户布局不是“已全部安全”的承诺。已保存 top=0 页面仍可复现已登记相交，负控证明扫描器能检出；本单未迁移用户数据。
