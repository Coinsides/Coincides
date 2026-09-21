# T4 逐处普查表

日期：2026-09-21；性质：builder 审计证据，非设计裁定。行号与 SHA 对应本次输入；每个字面色/每个完整字体栈记一处（同一行可多处）。`font` 简写、TS family 映射、变量 fallback 均已查。inherit/currentColor/transparent/none、纯动态用户值与只含 var 的字族不算硬编码字族。

来源快照与消费者分层记录，不把定义本身当成违约；🅱 是候裁登记，不代 HQ 豁免。🅰 0 项，修复清单为空。

| 指标 | 值 |
| --- | --- |
| candidateFiles | 310 |
| enumeratedEngineFiles | 467 |
| excludedTests | 158 |
| inScopeHits | 195 |
| colors | 179 |
| fonts | 16 |
| classes | {"A":0,"B":191,"C":4} |
| tiers | {"projection":8,"supply":28,"source":159} |
| excludedHits | 5 |
| hitFiles | 11 |
| zeroHitFiles | 299 |
| coverage | {"full":310,"processed":310,"remaining":0} |
| modifiedElements | 0 |
| evidenceScope | canvasEngine 非测试 TS/TSX/CSS + NoteDetail 传递纸面选择器；来源与消费分层计数；不包含全球 UI、Boards、shared 工厂的额外计数。 |

| ID | 文件:行:列 | 类/层 | 值 | 所在元素/供值 | 判定理由 |
| --- | --- | --- | --- | --- | --- |
| T4-001 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:14:52 | B/supply | #facc15 | annotation-yellow.accent | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-002 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:15:60 | B/supply | rgba(250, 204, 21, 0.22) | annotation-yellow.background | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-003 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:16:60 | B/supply | rgba(113, 63, 18, 0.72) | annotation-yellow.badgeBackground | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-004 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:17:48 | B/supply | #fef9c3 | annotation-yellow.text | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-005 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:22:50 | B/supply | #60a5fa | annotation-blue.accent | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-006 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:23:58 | B/supply | rgba(37, 99, 235, 0.24) | annotation-blue.background | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-007 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:24:58 | B/supply | rgba(30, 58, 138, 0.74) | annotation-blue.badgeBackground | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-008 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:25:46 | B/supply | #dbeafe | annotation-blue.text | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-009 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:30:50 | B/supply | #2dd4bf | annotation-teal.accent | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-010 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:31:58 | B/supply | rgba(20, 184, 166, 0.24) | annotation-teal.background | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-011 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:32:58 | B/supply | rgba(17, 94, 89, 0.74) | annotation-teal.badgeBackground | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-012 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:33:46 | B/supply | #ccfbf1 | annotation-teal.text | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-013 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:38:52 | B/supply | #a78bfa | annotation-violet.accent | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-014 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:39:60 | B/supply | rgba(124, 58, 237, 0.23) | annotation-violet.background | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-015 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:40:60 | B/supply | rgba(76, 29, 149, 0.74) | annotation-violet.badgeBackground | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-016 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:41:48 | B/supply | #ede9fe | annotation-violet.text | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-017 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:46:50 | B/supply | #fb7185 | annotation-rose.accent | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-018 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:47:58 | B/supply | rgba(225, 29, 72, 0.22) | annotation-rose.background | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-019 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:48:58 | B/supply | rgba(136, 19, 55, 0.74) | annotation-rose.badgeBackground | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-020 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:49:46 | B/supply | #ffe4e6 | annotation-rose.text | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-021 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:54:51 | B/supply | #94a3b8 | annotation-slate.accent | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-022 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:55:59 | B/supply | rgba(100, 116, 139, 0.24) | annotation-slate.background | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-023 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:56:59 | B/supply | rgba(51, 65, 85, 0.78) | annotation-slate.badgeBackground | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-024 | client/src/pages/Notes/canvasEngine/annotationColorService.ts:57:47 | B/supply | #e2e8f0 | annotation-slate.text | 已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。 |
| T4-026 | client/src/pages/Notes/canvasEngine/blocks/ParagraphFurniture.module.css:9:19 | C/projection | Aptos, Calibri, "Segoe UI", Arial, sans-serif | .source / 引文出处 | 引文出处固定字族与 paragraphFurniture.ts:11–13,45–47 测量绑定；无固定出处字族角色，document 会随用户设置变，label 在 workbench 为 mono；本单不造 token/改几何。 |
| T4-027 | client/src/pages/Notes/canvasEngine/freehandService.ts:60:64 | B/supply | #374151 | color: 'var(--sk-ink, var(--board-ink, var(--text-primary, #374151)))', | 纸笔已优先取 --sk-ink；仅末级兼容 fallback，不是覆盖皮肤的颜色。 |
| T4-028 | client/src/pages/Notes/canvasEngine/layers/PageFrameSlotsLayer.tsx:13:15 | B/projection | Georgia, serif | serif: 'Georgia, serif', sans: 'Arial, sans-serif', mono: 'monospace' }; | slot.style.fontFamily 的显式用户覆盖；skin 默认已走 --sk-label-font。改成角色会抹除显式 serif/sans/mono 选择，候裁不动。 |
| T4-029 | client/src/pages/Notes/canvasEngine/layers/PageFrameSlotsLayer.tsx:13:39 | B/projection | Arial, sans-serif | serif: 'Georgia, serif', sans: 'Arial, sans-serif', mono: 'monospace' }; | slot.style.fontFamily 的显式用户覆盖；skin 默认已走 --sk-label-font。改成角色会抹除显式 serif/sans/mono 选择，候裁不动。 |
| T4-030 | client/src/pages/Notes/canvasEngine/layers/PageFrameSlotsLayer.tsx:13:66 | B/projection | monospace | serif: 'Georgia, serif', sans: 'Arial, sans-serif', mono: 'monospace' }; | slot.style.fontFamily 的显式用户覆盖；skin 默认已走 --sk-label-font。改成角色会抹除显式 serif/sans/mono 选择，候裁不动。 |
| T4-031 | client/src/pages/Notes/canvasEngine/objectStyleService.ts:132:45 | B/supply | #2f2817 | fill: 'var(--canvas-sticky-note-fill, #2f2817)', | 便签已优先取 --canvas-sticky-note-*；保留独立模型/旧面兼容 fallback，现纸面由 paperSkinStyles 定义。 |
| T4-032 | client/src/pages/Notes/canvasEngine/objectStyleService.ts:133:49 | B/supply | #d8a429 | stroke: 'var(--canvas-sticky-note-stroke, #d8a429)', | 便签已优先取 --canvas-sticky-note-*；保留独立模型/旧面兼容 fallback，现纸面由 paperSkinStyles 定义。 |
| T4-033 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:20:10 | B/source | #101114 | DEFAULT_PAPER_BACKGROUND.fill | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-034 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:21:17 | B/source | #2a2f38 | DEFAULT_PAPER_BACKGROUND.borderColor | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-035 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:22:24 | B/source | rgba(0, 0, 0, 0.24) | DEFAULT_PAPER_BACKGROUND.shadow | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-036 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:28:10 | B/source | #111722 | SCREEN_NOTE_BACKGROUND.fill | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-037 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:29:17 | B/source | #243248 | SCREEN_NOTE_BACKGROUND.borderColor | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-038 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:30:24 | B/source | rgba(0, 0, 0, 0.20) | SCREEN_NOTE_BACKGROUND.shadow | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-039 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:36:10 | B/source | #101114 | CUSTOM_BACKGROUND.fill | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-040 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:37:17 | B/source | #2a2f38 | CUSTOM_BACKGROUND.borderColor | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-041 | client/src/pages/Notes/canvasEngine/pageFrameTemplateService.ts:38:24 | B/source | rgba(0, 0, 0, 0.22) | CUSTOM_BACKGROUND.shadow | 页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。 |
| T4-042 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:5:31 | B/source | #55bd8a | :root / --paper-source-lock-border | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-043 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:6:28 | B/source | #65cf99 | :root / --paper-source-lock-ink | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-044 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:7:23 | B/source | #f8edc4 | :root / --paper-sticky-ink | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-045 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:8:28 | B/source | #fff | :root / --paper-image-label-ink | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-046 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:9:28 | B/source | #2dd4bf | :root / --paper-annotation-teal | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-047 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:10:33 | B/source | #0f766e | :root / --paper-annotation-teal-dark | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-048 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:11:18 | B/source | #000 | :root / --paper-black | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-049 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:13:19 | B/source | #ef4444 | :root / --paper-danger | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-050 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:14:27 | B/source | rgba(245, 158, 11, 0.42) | :root / --paper-warning-border | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-051 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:15:31 | B/source | rgba(245, 158, 11, 0.08) | :root / --paper-warning-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-052 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:16:24 | B/source | rgba(253, 230, 138, 0.95) | :root / --paper-warning-ink | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-053 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:17:20 | B/source | #f59e0b | :root / --paper-warning | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-054 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:18:24 | B/source | #a8c7ff | :root / --paper-code-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-055 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:19:20 | B/source | #090d12 | :root / --paper-rail-bg | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-056 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:20:25 | B/source | #0d1319 | :root / --paper-rail-bg-soft | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-057 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:21:27 | B/source | #111820 | :root / --paper-rail-bg-raised | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-058 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:22:24 | B/source | #27313c | :root / --paper-rail-border | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-059 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:23:29 | B/source | #1b252f | :root / --paper-rail-border-soft | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-060 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:24:22 | B/source | #edf7ff | :root / --paper-rail-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-061 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:25:23 | B/source | #7f8c9a | :root / --paper-rail-muted | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-062 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:26:21 | B/source | #536170 | :root / --paper-rail-dim | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-063 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:27:22 | B/source | #22d3ee | :root / --paper-rail-cyan | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-064 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:28:23 | B/source | #080c11 | :root / --paper-rail-strip | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-065 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:29:23 | B/source | #0b1117 | :root / --paper-rail-popup | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-066 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:30:23 | B/source | #070b10 | :root / --paper-rail-input | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-067 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:31:25 | B/source | #facc15 | :root / --paper-rail-warning | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-068 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:32:25 | B/source | #34d399 | :root / --paper-rail-success | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-069 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:33:23 | B/source | #fb7185 | :root / --paper-rail-error | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-070 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:34:30 | B/source | #d6b65e | :root / --paper-rail-stale-border | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-071 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:35:27 | B/source | #c9b676 | :root / --paper-rail-stale-ink | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-072 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:36:30 | B/source | #a78bfa | :root / --paper-rail-topic-violet | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-073 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:37:27 | B/source | #38bdf8 | :root / --paper-rail-topic-sky | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-074 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:38:37 | B/source | #facc15 | :root / --paper-annotation-yellow-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-075 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:39:41 | B/source | rgba(250, 204, 21, 0.22) | :root / --paper-annotation-yellow-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-076 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:40:36 | B/source | rgba(113, 63, 18, 0.72) | :root / --paper-annotation-yellow-badge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-077 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:41:35 | B/source | #fef9c3 | :root / --paper-annotation-yellow-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-078 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:43:27 | B/source | rgba(0, 0, 0, 0.58) | :root / --paper-image-label-bg | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-079 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:44:27 | B/source | rgba(255, 255, 255, 0.12) | :root / --paper-highlight-edge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-080 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:45:36 | B/source | #777a82 | :root / --paper-wall | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-081 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:46:22 | B/source | rgba(0, 0, 0, 0.14) | :root / --paper-shadow-14 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-082 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:47:22 | B/source | rgba(0, 0, 0, 0.16) | :root / --paper-shadow-16 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-083 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:48:22 | B/source | rgba(0, 0, 0, 0.17) | :root / --paper-shadow-17 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-084 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:49:22 | B/source | rgba(0, 0, 0, 0.18) | :root / --paper-shadow-18 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-085 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:50:22 | B/source | rgba(0, 0, 0, 0.2) | :root / --paper-shadow-20 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-086 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:51:22 | B/source | rgba(0, 0, 0, 0.22) | :root / --paper-shadow-22 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-087 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:52:22 | B/source | rgba(0, 0, 0, 0.24) | :root / --paper-shadow-24 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-088 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:53:22 | B/source | rgba(0, 0, 0, 0.28) | :root / --paper-shadow-28 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-089 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:54:22 | B/source | rgba(0, 0, 0, 0.32) | :root / --paper-shadow-32 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-090 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:55:22 | B/source | rgba(0, 0, 0, 0.34) | :root / --paper-shadow-34 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-091 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:56:22 | B/source | rgba(0, 0, 0, 0.35) | :root / --paper-shadow-35 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-092 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:57:22 | B/source | rgba(0, 0, 0, 0.38) | :root / --paper-shadow-38 | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-093 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:58:35 | B/source | #60a5fa | :root / --paper-annotation-blue-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-094 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:59:39 | B/source | rgba(37, 99, 235, 0.24) | :root / --paper-annotation-blue-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-095 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:60:34 | B/source | rgba(30, 58, 138, 0.74) | :root / --paper-annotation-blue-badge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-096 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:61:33 | B/source | #dbeafe | :root / --paper-annotation-blue-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-097 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:62:35 | B/source | #2dd4bf | :root / --paper-annotation-teal-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-098 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:63:39 | B/source | rgba(20, 184, 166, 0.24) | :root / --paper-annotation-teal-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-099 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:64:34 | B/source | rgba(17, 94, 89, 0.74) | :root / --paper-annotation-teal-badge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-100 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:65:33 | B/source | #ccfbf1 | :root / --paper-annotation-teal-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-101 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:66:37 | B/source | #a78bfa | :root / --paper-annotation-violet-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-102 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:67:41 | B/source | rgba(124, 58, 237, 0.23) | :root / --paper-annotation-violet-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-103 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:68:36 | B/source | rgba(76, 29, 149, 0.74) | :root / --paper-annotation-violet-badge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-104 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:69:35 | B/source | #ede9fe | :root / --paper-annotation-violet-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-105 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:70:35 | B/source | #fb7185 | :root / --paper-annotation-rose-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-106 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:71:39 | B/source | rgba(225, 29, 72, 0.22) | :root / --paper-annotation-rose-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-107 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:72:34 | B/source | rgba(136, 19, 55, 0.74) | :root / --paper-annotation-rose-badge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-108 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:73:33 | B/source | #ffe4e6 | :root / --paper-annotation-rose-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-109 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:74:36 | B/source | #94a3b8 | :root / --paper-annotation-slate-accent | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-110 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:75:40 | B/source | rgba(100, 116, 139, 0.24) | :root / --paper-annotation-slate-background | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-111 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:76:35 | B/source | rgba(51, 65, 85, 0.78) | :root / --paper-annotation-slate-badge | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-112 | client/src/pages/Notes/canvasEngine/paperSkinDefaults.css:77:34 | B/source | #e2e8f0 | :root / --paper-annotation-slate-text | 固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。 |
| T4-113 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:10:55 | B/source | #55bd8a | PAPER_DERIVED_COLORS.source-lock-border | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-114 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:11:52 | B/source | #65cf99 | PAPER_DERIVED_COLORS.source-lock-ink | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-115 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:12:44 | B/source | #f8edc4 | PAPER_DERIVED_COLORS.sticky-ink | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-116 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:13:49 | B/source | #fff | PAPER_DERIVED_COLORS.image-label-ink | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-117 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:14:56 | B/source | #2dd4bf | PAPER_DERIVED_COLORS.annotation-teal | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-118 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:15:61 | B/source | #0f766e | PAPER_DERIVED_COLORS.annotation-teal-dark | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-119 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:16:41 | B/source | #000 | PAPER_DERIVED_COLORS.black | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-120 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:18:43 | B/source | #ef4444 | PAPER_DERIVED_COLORS.danger | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-121 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:19:55 | B/source | rgba(245, 158, 11, 0.42) | PAPER_DERIVED_COLORS.warning-border | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-122 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:20:59 | B/source | rgba(245, 158, 11, 0.08) | PAPER_DERIVED_COLORS.warning-background | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-123 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:21:52 | B/source | rgba(253, 230, 138, 0.95) | PAPER_DERIVED_COLORS.warning-ink | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-124 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:22:48 | B/source | #f59e0b | PAPER_DERIVED_COLORS.warning | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-125 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:23:48 | B/source | #a8c7ff | PAPER_DERIVED_COLORS.code-accent | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-126 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:24:43 | B/source | #090d12 | PAPER_DERIVED_COLORS.rail-bg | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-127 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:25:48 | B/source | #0d1319 | PAPER_DERIVED_COLORS.rail-bg-soft | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-128 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:26:50 | B/source | #111820 | PAPER_DERIVED_COLORS.rail-bg-raised | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-129 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:27:50 | B/source | #27313c | PAPER_DERIVED_COLORS.rail-border | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-130 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:28:55 | B/source | #1b252f | PAPER_DERIVED_COLORS.rail-border-soft | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-131 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:29:43 | B/source | #edf7ff | PAPER_DERIVED_COLORS.rail-text | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-132 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:30:50 | B/source | #7f8c9a | PAPER_DERIVED_COLORS.rail-muted | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-133 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:31:48 | B/source | #536170 | PAPER_DERIVED_COLORS.rail-dim | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-134 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:32:46 | B/source | #22d3ee | PAPER_DERIVED_COLORS.rail-cyan | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-135 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:33:46 | B/source | #080c11 | PAPER_DERIVED_COLORS.rail-strip | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-136 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:34:46 | B/source | #0b1117 | PAPER_DERIVED_COLORS.rail-popup | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-137 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:35:46 | B/source | #070b10 | PAPER_DERIVED_COLORS.rail-input | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-138 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:36:53 | B/source | #facc15 | PAPER_DERIVED_COLORS.rail-warning | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-139 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:37:49 | B/source | #34d399 | PAPER_DERIVED_COLORS.rail-success | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-140 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:38:47 | B/source | #fb7185 | PAPER_DERIVED_COLORS.rail-error | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-141 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:39:58 | B/source | #d6b65e | PAPER_DERIVED_COLORS.rail-stale-border | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-142 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:40:55 | B/source | #c9b676 | PAPER_DERIVED_COLORS.rail-stale-ink | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-143 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:41:54 | B/source | #a78bfa | PAPER_DERIVED_COLORS.rail-topic-violet | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-144 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:42:51 | B/source | #38bdf8 | PAPER_DERIVED_COLORS.rail-topic-sky | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-145 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:43:65 | B/source | #facc15 | PAPER_DERIVED_COLORS.annotation-yellow-accent | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-146 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:44:69 | B/source | rgba(250, 204, 21, 0.22) | PAPER_DERIVED_COLORS.annotation-yellow-background | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-147 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:45:64 | B/source | rgba(113, 63, 18, 0.72) | PAPER_DERIVED_COLORS.annotation-yellow-badge | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-148 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:46:63 | B/source | #fef9c3 | PAPER_DERIVED_COLORS.annotation-yellow-text | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-149 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:66:41 | B/source | #777a82 | --text-muted | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-150 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:67:37 | B/source | #0a0a0f | --text-inverse | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-151 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:69:37 | B/source | #0f0f10 | --bg-primary | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-152 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:70:37 | B/source | #0b0b0c | --bg-deepest | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-153 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:71:37 | B/source | #151516 | --bg-surface | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-154 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:72:38 | B/source | #1d1d1f | --bg-elevated | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-155 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:73:111 | B/source | #252528 | --bg-hover | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-156 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:74:36 | B/source | #2f3034 | --bg-active | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-157 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:76:43 | B/source | #232427 | --border-subtle | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-158 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:79:48 | B/source | #3b82f6 | --accent-primary-hover | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-159 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:80:45 | B/source | rgba(37, 99, 235, 0.16) | --accent-primary-bg | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-160 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:81:51 | B/source | rgba(37, 99, 235, 0.24) | --accent-primary-bg-hover | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-161 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:82:39 | B/source | #f59e0b | --warning | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-162 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:85:76 | B/source | rgba(245, 158, 11, 0.12) | --warning-bg | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-163 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:88:36 | B/source | rgba(239, 68, 68, 0.12) | --error-bg | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-164 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:89:55 | B/source | #777a82 | --paper-wall | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-165 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:90:55 | B/source | #2f2817 | --canvas-sticky-note-fill | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-166 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:91:57 | B/source | #d8a429 | --canvas-sticky-note-stroke | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-167 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:93:76 | B/source | rgba(0, 0, 0, 0.58) | --paper-image-label-bg | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-168 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:94:45 | B/source | rgba(255, 255, 255, 0.12) | --paper-highlight-edge | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-169 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:96:10 | B/source | #1B2028 | --paper-workbench-grid | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-170 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:115:10 | B/source | #2A313C | --paper-template-border | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-171 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:121:62 | B/source | rgba(0, 0, 0, ${Number((opacity * shadowFactor).toFixed(4))}) | buildPaperSkinStyles / --paper-shadow-${Math.round(opacity * 100)} | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-172 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:150:48 | B/source | #2B2520 | --paper-material-desk | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-173 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:150:60 | B/source | #211D19 | --paper-material-desk | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-174 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:150:73 | B/source | #1D1A17 | --paper-material-desk | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-175 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:153:28 | B/source | #F9F5ED | --paper-material-fill | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-176 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:153:40 | B/source | #F7F3EA | --paper-material-fill | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-177 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:153:53 | B/source | #F5F0E5 | --paper-material-fill | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-178 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:155:47 | B/source | rgba(8,6,4,.55) | --paper-material-shadow | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-179 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:155:75 | B/source | rgba(8,6,4,.35) | --paper-material-shadow | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-180 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:155:106 | B/source | rgba(255,255,255,.55) | --paper-material-shadow | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-181 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:156:62 | B/source | rgba(8,6,4,.10) | --paper-material-binding | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-182 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:156:79 | B/source | rgba(8,6,4,0) | --paper-material-binding | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-183 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:158:54 | B/source | rgba(194,109,90,.45) | --paper-wall-idle-left | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-184 | client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:159:65 | B/source | #000 | --paper-wall-idle-mask | 工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。 |
| T4-185 | client/src/pages/Notes/canvasEngine/typographyMeasurementService.ts:111:10 | C/supply | ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace | typographyTextMetrics / code_line.fontFamily | 代码正文/行号及分页 DOM 测量需保持同一等宽栈；现有 title/label 并非代码角色，--font-mono 仅消费无定义，缺专用角色。 |
| T4-186 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:21:16 | B/source | Aptos, Calibri, "Segoe UI", Arial, sans-serif | DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-187 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:37:13 | B/source | Arial, sans-serif | DOCUMENT_FONT_FAMILY_OPTIONS.arial | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-188 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:42:13 | B/source | Georgia, serif | DOCUMENT_FONT_FAMILY_OPTIONS.georgia | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-189 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:47:13 | B/source | "Times New Roman", Times, serif | DOCUMENT_FONT_FAMILY_OPTIONS.times-new-roman | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-190 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:52:13 | B/source | Cambria, Georgia, serif | DOCUMENT_FONT_FAMILY_OPTIONS.cambria | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-191 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:57:13 | B/source | Consolas, "Courier New", monospace | DOCUMENT_FONT_FAMILY_OPTIONS.consolas | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-192 | client/src/pages/Notes/canvasEngine/typographyProfileService.ts:62:13 | B/source | Inter, "Segoe UI", Arial, sans-serif | DOCUMENT_FONT_FAMILY_OPTIONS.inter | 默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。 |
| T4-194 | client/src/pages/Notes/NoteDetail.module.css:1540:44 | B/projection | Aptos, Calibri, "Segoe UI", Arial, sans-serif | .pageTextArea | 现有 --document-font-family 角色的默认回退，与默认 profile 同栈；保留用户 Typography 覆盖。 |
| T4-195 | client/src/pages/Notes/NoteDetail.module.css:3648:44 | B/projection | Aptos, Calibri, "Segoe UI", Arial, sans-serif | .definitionDescription | 现有 --document-font-family 角色的默认回退，与默认 profile 同栈；保留用户 Typography 覆盖。 |
| T4-196 | client/src/pages/Notes/NoteDetail.module.css:3790:16 | C/projection | ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace | .codeLineGutter | 代码正文/行号及分页 DOM 测量需保持同一等宽栈；现有 title/label 并非代码角色，--font-mono 仅消费无定义，缺专用角色。 |
| T4-197 | client/src/pages/Notes/NoteDetail.module.css:3802:16 | C/projection | ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace | .codeTextArea | 代码正文/行号及分页 DOM 测量需保持同一等宽栈；现有 title/label 并非代码角色，--font-mono 仅消费无定义，缺专用角色。 |
