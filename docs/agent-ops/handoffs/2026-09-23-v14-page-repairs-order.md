> **from**: claude(HQ Fable 会话)
> **to**: codex(builder)
> **status**: done(Henry 2026-09-23 口拍直授两修;builder 实现与功能回归完成;完整门保留两个既有 INDEX 过期非绿项;原派发时点=答卡拆除单收口之后,姑息模式⛔并行 builder)
> **单号**: V14 · 纸页两修单(页眉侵占+默认字号降档)
> **上游**: Henry 09-23 直令(原话:「从第二页开始,它会直接顶到每一页的页眉上面」「默认字号太大个儿了」)/ T9 采值报告 `docs/audits/2026-09-22-t9-extractor-builder/README.md`(参照值)/ 排印断言现役(27 条常驻标尺)

# 纸页两修单

## 一 · 修 A:续页正文侵占页眉带

- **现象(Henry 实机)**:第 2 页起,正文直接顶到每页页眉上;
- **疑点(以现物诊断为准,⛔按猜施工)**:续页内容区起点未预留 header 带高——header rect 在 `client/src/pages/Notes/canvasEngine/pageFrameSlotService.ts`(`rects.header` 一族),对照正文内容区 origin 的分页计算;首页疑似正常,查首/续页差异;
- **验收**:四态零重叠——首页/续页/封面页/`headerFooterEnabled=false` 档;打印导出跟随(屏打同源纪律)。

## 二 · 修 B:默认字号降档

- **现物**:`client/src/pages/Notes/canvasEngine/pageFrameTypographyService.ts:40` 硬编码 `10.75pt`(A4 同尺度 16.23px@900);
- **直令值**:默认降到 **10pt**(≈15.1px@900)——Henry 要的是肉眼可见的降幅;T9 样张 15.65px≈10.37pt 仅作参照,本单不采样张值;
- **查档**:排印断言提及「双纸型×三阅读档」——若存在阅读档机制,默认值走档位表达⛔再留裸数,并在回执申报档表全貌(默认档改小后,Henry 仍可上调);若无档机制,改裸数即可,⛔本单发明新档;
- **⛔顺手动**:行高比 1.65 保持(行高 2.0=简报 9a 候批,⛔抢拍);标题层级/封面题名/衬线栈同理(9b-9d 候批)。

## 三 · 断言与分页

27 条常驻标尺断言随新默认更新(同尺度公式重算,带容量论证,⛔弱化);分页变化=预期(9a 讨论先例:测试数据无妨);既有排印断言逐处申报改点。

## 四 · 测试面(功能/回归,单内冒烟)

定向:pagination/typography/slot/断言族+受影响 client 文件族;既有回归零破;修 A 补首/续页页眉零重叠断言(阳性对照:故意去掉预留须红)。

## 五 · 纪律(照抄现役)

⛔一切 git 写操作;⛔读 .env key 值;⛔真实模型调用;⛔用户库接触;合成凭据表单值 ≤20 字符;措辞中性。证据落 `docs/audits/2026-09-23-page-repairs-builder/`,回执(status done+写点+测试数字+未做清单)追加本单尾部。

## 六 · 不在射程

简报第 9 件其余采值(9a 行高/9b 标题/9c 封面/9d 衬线,候 Henry 批);页眉文案与样式设计;阅读档 UI 新增。

## Result

2026-09-23 · Codex builder 回执。两修实现完成；此 `done` 为施工交接，不代表完整验证门全绿或主观验收放行。[证据总表及逐处断言申报](../../audits/2026-09-23-page-repairs-builder/README.md)。

### 写点与现物结论

- **修 A**：新建纸页已有 top72；问题在历史 top0/24/40 被保留并由续页继承，而正文分页一律从内容区 y0 开始。`pageFrameSlotService.ts` 新增由现役启用页眉槽推导的预留；`documentPageFlowService.ts` 首/续页起点、可用高度、溢出统一扣减，默认 top72 不重复留白。分节偏移、页眉页码、开关、封面均按现役 binding 处理。插页改变机械页号时按最终页序重算，覆盖反序与交错多页叠。
- `hooks/useNotePageFlow.ts`、`hooks/useNoteCanvasRuntimeController.ts`、`paperSizeEditService.ts` 接通完整/折叠分页、纸型编辑的同一 binding；屏幕/Overview/打印消费同源计划，无 CSS 单边挪动、无历史墙迁移。
- **修 B**：`pageFrameTypographyService.ts` 现有裸数 10.75→10pt；行高比仍为1.65。查明“三阅读档”仅控制视口缩放，没有字号预设档，故未造新档、未把物理字号错误塞入阅读缩放档。已有用户字号覆盖继续优先。

### 现役完整档表（未改）

| 档 | 基础缩放 | 默认/回退 |
| --- | --- | --- |
| `fit_width` | 可用宽 / 纸页宽 | 默认档，step=1 |
| `fit_page` | min(可用宽/纸页宽, 可用高/纸页高) | 高宽比>3回退fit_width |
| `physical` | 打印 physicalScale | 标准904宽：A4=0.8779875967，Letter=0.9026548673 |

三档均为 `displayScale=baseScale×stepFactor`；step范围0.5–2，步长0.1，默认1。既有 Typography 输入10–28布局px、步长1可继续上调，不是pt档位。

### 标尺、容量与测试数字

- **27条常驻标尺全部保留并通过**：24条矩阵正文改为独立10pt物理公式和精确纸型期望，量化误差≤0.05px；缩放不变量及行高比边界保留。表格0.85、家具槽12px不改。
- A4：字号15.2px、行高25.1px、同尺度15.13274336px@900；Letter：14.8px、24.4px、14.73451327px@900。1.65仅经原有0.1px量化。
- 标准904宽、文字740宽、top72/bottom96/chrome16的ASCII容量：A4由94×40=3760到101×43=4343；Letter由97×37=3589到104×40=4160。新增 `capacity+1` 精确切片永久断言；公式、独立数值与13个受影响测试文件改点全部列入证据，未放宽容量约束。
- 新增页眉/容量23条、屏打4条、binding hook1条；受影响13文件 **216条通过**。最终完整client **239文件、2492/2492通过，0失败、0跳过**，其中包含27条标尺。
- 阳性对照真实临时去掉生产预留：**11失败/16通过**；恢复后 **27通过**。两次各有42条被定向过滤，完整client已运行；恢复前后源码SHA-256一致。
- 必跑 `npm run verify:v2-bn8-runtime` 已执行：test-wiring111/111，agent29，registry5、manifest10、parity10、owned-helper12，runtime175 checks/model60 groups，client/server构建和其余前置检查均通过。**完整命令exit=1：docs:check报两个既有INDEX过期，未记作全绿。** 文件为 `docs/agent-ops/INDEX.md`、`docs/agent-ops/current-state/INDEX.md`；两者及来源manual与HEAD一致，哈希证据已落盘，未越界修索引。被截断的inventory/glossary单独检查通过，最终diff/secrets结果见证据 `final-checks.json`。

### 未做清单

未动行高比、标题层级、封面题名、衬线栈、页眉设计和档位UI；未接触用户库、读取.env key值或调用真实模型；未新增凭据表单值；未执行任何git写操作、发布或主观验收。测试使用空env与内存DB。屏打断言覆盖实际组件CSS几何输入及beforeprint生命周期，不宣称真实浏览器字形/PDF或纸质验收。未修改agent操作指令/权限文件，未并行builder，未豁免既有INDEX失败。
