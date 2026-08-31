> **状态 (Status)**: ready(顶班调度按总部 2026-08-31 M4 余量令翻牌;裁定出处:Henry 已裁「英文为准,中文进翻译档」+ 总部当日续办令;不代表 Henry 逐张批过本单)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「i18n 统一小单」。⛔ **不是 Henry**(Henry 裁的是「英文为准,中文进翻译档」方向)。
> **上游**: 调度方侦察(本单 §2 普查底账)· `client/src/i18n.ts`(react-i18next,en/zh locale 已在)

# 施工单丙:client UI 中文文案统一为英文(中文进翻译档)

## 0. ⛔⛔ 先读这六句

1. **射程 = UI 文案面**:TS/TSX 里的中文**字面量**。⛔ 注释/文档里的中文不动;⛔ 不做全量 t() 化改造(那是另一个工程)。
2. **落地口径(调度方裁,报总部备案)**:①中文字面量 → **英文字面量**;文件已 `useTranslation` 且现成键可用才走 `t()`,⛔ 不为本单新造 t() 接线;②每条中文**原文**进翻译档 `docs/agent-ops/analysis/2026-08-31-v12-10-i18n-chinese-copy-archive.md`(表:文件 · 中文原文 · 英文替换 · 备注),一条不落;③⛔ **不往 `locales/zh/translation.json` 塞没有 t() 消费者的孤键**(形状≠能力家法)。
3. **契约闸同步**:`client/scripts/groupGalleryShellContractCheck.mjs` 硬断言 4 处中文 token(`固定去处`/`全部组`/`最近`/`按项目`)——文案改英文的同一步把闸的断言 token 改成新英文;⛔ 不许为过闸保留中文、也不许删断言。`GroupGallery.test.tsx` 的 12 处同理随文案对齐。
4. **⛔ 不碰**:server 侧一切 · 画布野地/crossing **语义**(BlockEditorLayer 的 2 处只许换文案字符串,逻辑一字不动)· `client/src/i18n.ts` 本体 · 12.9d/M4.1 交付面。
5. **零 API 调用零花费。**
6. 撞到「不是 UI 文案」的中文字面量(如作为数据键/枚举值参与逻辑比较的):⛔ 不改,列入回执白名单表(文件:行 + 为什么不能改),交调度方。

## 1. 允许面(⛔ 只这些)

- **手术** `client/src/components/AgentPanel/PreferenceForm.tsx`
- **手术** `client/src/components/MonthCalendar/MonthCalendar.tsx`
- **手术** `client/src/pages/Calendar/Calendar.tsx`
- **手术** `client/src/components/TemplateEditor/TemplateWeekView.tsx`
- **手术** `client/src/components/TemplateEditor/TemplateEditorModal.tsx`
- **手术** `client/src/components/TaskViewModal/TaskViewModal.tsx`
- **手术** `client/src/pages/Goals/Goals.tsx`
- **手术** `client/src/pages/GroupGallery/GroupGallery.test.tsx`
- **手术** `client/src/pages/Settings/Settings.tsx`
- **手术** `client/src/components/Layout/AppLayout.tsx`
- **手术** `client/src/pages/GroupGallery/groupGalleryNavigationModel.ts`
- **手术** `client/src/pages/GroupGallery/groupGalleryShellModel.ts`
- **手术** `client/src/pages/GroupGallery/GroupGallery.tsx`
- **手术** `client/src/pages/Courses/CourseDetail.tsx`
- **手术** `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx`
- **手术** `client/scripts/groupGalleryShellContractCheck.mjs`(仅断言 token 随文案换英文)
- **新建** `docs/agent-ops/analysis/2026-08-31-v12-10-i18n-chinese-copy-archive.md`(翻译档)
- **追加**:本单 `## Result`

⛔ **禁区 = 其余一切**(含 `client/src/locales/**` · `client/src/i18n.ts` · `server/**` · 其余 canvas engine 文件)。

## 2. 普查底账(调度方 2026-08-31 `rg '\p{Han}'` 实测:15 个 src 文件 94 处 + 契约闸 4 处)

PreferenceForm 10 · MonthCalendar 6 · Calendar 10 · TemplateWeekView 4 · TemplateEditorModal 23 · TaskViewModal 3 · Goals 4 · GroupGallery.test 12 · Settings 1 · AppLayout 1 · groupGalleryNavigationModel 3 · groupGalleryShellModel 3 · GroupGallery 5 · CourseDetail 7 · BlockEditorLayer 2。⚠️ 底账是行计数不是条数;你以现物为准,发现底账外新增文件照 §0.2 同法处理并申报。

## 3. 判据(K)

- **K-1 零中文**:收工 `rg -n "\p{Han}" client/src --glob "*.ts" --glob "*.tsx"` 与 `rg -n "\p{Han}" client/scripts` **输出全文入回执**——应为空,或恰等于白名单表(§0.6)所列行。locale JSON 属禁区,回执须以 `git diff --quiet -- client/src/locales` 贴 exit 0 证其零 diff。
- **K-2 翻译档全量**:归档条数 = 实际替换条数,分文件小计与合计;⛔ 无静默缺失。
- **K-3 逻辑零变**:回执申明每处只动字符串字面量;`git diff` 中不得出现任何非字符串行的逻辑改动(标识符/条件/结构)——契约闸与测试文件的断言 token 替换除外。
- **K-4 门禁**:`npm --prefix client run build` · `npm run test:unit` · `npm run check:group-gallery-shell` · `npm run check:groups-rail-shell` · `npm run check:single-editor-shell` · `npm run check:source-experience` · `npm run docs:check`(生成件过期申报即可,重生成归调度方)· `npm --prefix server run test:v2`(应 **328/328** 不动——你没碰 server)。
- **K-5 声明本单没做**:全量 t() 化 · zh locale 扩充 · 语言切换 UI · 4a/OD。

## 4. 通用纪律(沿 M4.1 各单 §5/§4,一字不减)

搜索纪律 · key 值零出境 · ⛔ 不 commit 不 push · ⛔ 不翻状态头 · ⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md` · ⛔ 不杀任何进程(含 PID 8292)· 回执与翻译档中文经 apply_patch 落盘⛔不走 stdin · 锁非你所有 · 字面矛盾摊开标 `needs: dispatcher` 停线交回。

## 5. 回执(`## Result`)

K-1 两条 rg 输出全文 + 白名单表 · K-2 分文件对账 · K-3 申明 · K-4 各 exit · K-5 · 停线点。
